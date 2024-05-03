import {WonderlandEngine} from './engine.js';
import {LogTag} from './index.js';
import {Emitter} from './utils/event.js';
import {fetchWithProgress, getBaseUrl} from './utils/fetch.js';
import {clamp} from './utils/misc.js';
import {isString} from './utils/object.js';
import {Component, ViewComponent, Object3D, RayHit} from './wonderland.js';
import {NumberArray} from './types.js';
import {Material} from './resources/material-manager.js';
import {InMemoryLoadOptions, Prefab, SceneLoadOptions} from './prefab.js';
import {GLTFExtensionsInstance, PrefabGLTF} from './scene-gltf.js';

export interface InstantiateResult {
    root: Object3D;
}

export interface InstantiateGltfResult extends InstantiateResult {
    extensions: GLTFExtensionsInstance | null;
}

/** Options for scene activation. */
export interface ActivateOptions {
    /** If `true`, dispatches a ready event in the document. */
    dispatchReadyEvent?: boolean;
    /** @hidden */
    legacyLoaded?: boolean;
}

/**
 * Legacy gltf extension type.
 *
 * @deprecated Use the new {@link WonderlandEngine.loadGLTF} API.
 */
export interface GLTFExtensionsLegacy {
    /** glTF root extensions object. JSON data indexed by extension name. */
    root: Record<string, Record<string, any>>;
    /**
     * Mesh extension objects. Key is {@link Object3D.objectId}, value is JSON
     * data indexed by extension name.
     */
    mesh: Record<number, Record<string, Record<string, any>>>;
    /**
     * Node extension objects. Key is {@link Object3D.objectId}, value is JSON
     * data indexed by extension name.
     */
    node: Record<number, Record<string, Record<string, any>>>;
    /** Remapping from glTF node index to {@link Object3D.objectId}. */
    idMapping: number[];
}

/** Options for {@link Scene.append}. */
export interface SceneAppendParameters {
    /** Whether to load glTF extension data */
    loadGltfExtensions: boolean;
    baseURL: string | undefined;
}

/**
 * Result obtained when appending a scene with {@link Scene.append} with gltf extensions.
 */
export type SceneAppendResultWithExtensions = {
    root: Object3D | null;
    extensions: GLTFExtensionsLegacy;
};

/**
 * Result obtained when appending a scene with {@link Scene.append}.
 */
export type SceneAppendResult = (Object3D | null) | SceneAppendResultWithExtensions;

/**
 * Constants
 */

/** Magic number for .bin */
const MAGIC_BIN = 'WLEV';

/**
 * Wonderland Engine (.bin) scene.
 *
 * Wonderland Engine packages two types of scene:
 * - Activatable scene: Contains objects, components, views, resources, and rendering data
 * - Streamable scene: Contains objects, components, and resources
 *
 * #### Activation
 *
 * Some scenes are **activatable**, they can thus be attached to the renderer
 * to be updated and rendered on the canvas.
 *
 * For more information, have a look at the {@link WonderlandEngine.switchTo} method.
 *
 * #### Instantiation
 *
 * Besides activation, a scene can instantiate the content of another scene.
 *
 * For more information, have a look at the {@link Scene#instantiate} method.
 *
 * @category scene
 */
export class Scene extends Prefab {
    /** Called before rendering the scene */
    readonly onPreRender = new Emitter();
    /** Called after the scene has been rendered */
    readonly onPostRender = new Emitter();

    /** Ray hit pointer in WASM heap. @hidden */
    private _rayHit: number;
    /** Ray hit. @hidden */
    private _hit: RayHit;

    constructor(engine: WonderlandEngine, index: number) {
        super(engine, index);
        /** `this.engine?` is used for testing. */
        this._rayHit = this.engine?.wasm._malloc(4 * (3 * 4 + 3 * 4 + 4 + 2) + 4);
        this._hit = new RayHit(this, this._rayHit);
    }

    /** @overload */
    instantiate(scene: PrefabGLTF): InstantiateGltfResult;
    /** @overload */
    instantiate(scene: Prefab): InstantiateResult;
    /**
     * Instantiate `scene` into this instance.
     *
     * Any scene can be instantiated into one another. It's thus possible
     * to instantiate a {@link PrefabGLTF} into this instance, or another
     * {@link Scene} instance.
     *
     * #### Usage
     *
     * ```js
     * const prefabScene = await engine.loadScene('Prefab.bin');
     * // Instantiate `prefabScene` into `scene`
     * engine.scene.instantiate(prefabScene);
     * ```
     *
     * #### Shared Resources
     *
     * Instantiating **does not** duplicate resources. Each instance will
     * reference the same assets stored in the {@link Scene}, e.g.,
     *
     * ```js
     * // `zombie` has one mesh and one material
     * const zombie = await engine.loadScene('Zombie.bin');
     *
     * for (let i = 0; i < 100; ++i) {
     *     engine.scene.instantiate(zombie);
     * }
     *
     * console.log(engine.meshes.count) // Prints '1'
     * console.log(engine.materials.count) // Prints '1'
     * ```
     *
     * @param scene The scene to instantiate.
     * @returns An object containing the instantiated root {@link Object3D}.
     *     When a glTF is instantiated, the result can contain extra metadata.
     *     For more information, have a look at the {@link InstantiateResult} type.
     *
     * @since 1.2.0
     */
    instantiate(prefab: Prefab): InstantiateResult;
    instantiate(prefab: Prefab): InstantiateResult {
        const wasm = this.engine.wasm;
        const id = wasm._wl_scene_instantiate(prefab._index, this._index);

        const result: InstantiateResult = {root: this.wrap(id)};
        if (prefab instanceof PrefabGLTF) {
            const obj = this.wrap(id);
            prefab._processInstantiaton(this, obj, result as InstantiateGltfResult);
        }
        return result;
    }

    /** @todo: Add `instantiateBatch` to instantiate multiple chunks in a row. */

    /**
     * @todo Provide an API to delete all resources linked to a scene.
     *
     * Example:
     *
     * ```ts
     * const scene = await engine.loadScene('Scene.bin');
     * ...
     * scene.destroy({removeResources: true});
     * ```
     */

    /**
     * Destroy this scene and remove it from the engine.
     *
     * @note Destroying a scene **doesn't** remove the materials, meshes,
     * and textures it references in the engine. Those should be cleaned up either by loading
     * another main scene via {@link WonderlandEngine.loadMainScene}, or manually using {@link Mesh.destroy}.
     *
     * @throws If the scene is currently active.
     * */
    destroy() {
        if (this.isActive) {
            throw new Error(
                `Attempt to destroy ${this}, but destroying the active scene is not supported`
            );
        }

        /* Store before calling `super.destroy()` since the call
         * might destroy entirely the prototype. */
        const wasm = this.engine.wasm;
        const rayPtr = this._rayHit;

        super.destroy();

        wasm._free(rayPtr);
    }

    /**
     * Currently active view components.
     */
    get activeViews(): ViewComponent[] {
        const wasm = this.engine.wasm;
        const count = wasm._wl_scene_get_active_views(this._index, wasm._tempMem, 16);
        const views: ViewComponent[] = [];
        for (let i = 0; i < count; ++i) {
            const id = wasm._tempMemInt[i];
            views.push(this._components.wrapView(id));
        }

        return views;
    }

    /**
     * Cast a ray through the scene and find intersecting collision components.
     *
     * The resulting ray hit will contain **up to 4** closest ray hits,
     * sorted by increasing distance.
     *
     * Example:
     *
     * ```js
     * const hit = engine.scene.rayCast(
     *     [0, 0, 0],
     *     [0, 0, 1],
     *     1 << 0 | 1 << 4, // Only check against components in groups 0 and 4
     *     25
     * );
     * if (hit.hitCount > 0) {
     *     const locations = hit.getLocations();
     *     console.log(`Object hit at: ${locations[0][0]}, ${locations[0][1]}, ${locations[0][2]}`);
     * }
     * ```
     *
     * @param o Ray origin.
     * @param d Ray direction.
     * @param groupMask Bitmask of collision groups to filter by: only objects
     *        that are part of given groups are considered for the raycast.
     * @param maxDistance Maximum **inclusive** hit distance. Defaults to `100`.
     *
     * @returns The {@link RayHit} instance, cached by this class.
     *
     * @note The returned {@link RayHit} object is owned by the {@link Scene}
     *       instance and will be reused with the next {@link Scene#rayCast} call.
     */
    rayCast(
        o: Readonly<NumberArray>,
        d: Readonly<NumberArray>,
        groupMask: number,
        maxDistance = 100.0
    ): RayHit {
        this.engine.wasm._wl_scene_ray_cast(
            this._index,
            o[0],
            o[1],
            o[2],
            d[0],
            d[1],
            d[2],
            groupMask,
            this._rayHit,
            maxDistance
        );
        return this._hit;
    }

    /**
     * Set the background clear color.
     *
     * @param color new clear color (RGBA).
     * @since 0.8.5
     */
    set clearColor(color: number[]) {
        this.engine.wasm._wl_scene_set_clearColor(color[0], color[1], color[2], color[3]);
    }

    /**
     * Set whether to clear the color framebuffer before drawing.
     *
     * This function is useful if an external framework (e.g. an AR tracking
     * framework) is responsible for drawing a camera frame before Wonderland
     * Engine draws the scene on top of it.
     *
     * @param b Whether to enable color clear.
     * @since 0.9.4
     */
    set colorClearEnabled(b: boolean) {
        this.engine.wasm._wl_scene_enableColorClear(b);
    }

    /**
     * Load a scene file (.bin).
     *
     * Will replace the currently active scene with the one loaded
     * from given file. It is assumed that JavaScript components required by
     * the new scene were registered in advance.
     *
     * Once the scene is loaded successfully and initialized,
     * {@link WonderlandEngine.onSceneLoaded} is notified.
     *
     * #### ArrayBuffer
     *
     * The `load()` method accepts an in-memory buffer:
     *
     * ```js
     * scene.load({
     *     buffer: new ArrayBuffer(...),
     *     baseURL: 'https://my-website/assets'
     * })
     * ```
     *
     * @note The `baseURL` is mandatory. It's used to fetch images and languages.
     *
     * Use {@link Scene.setLoadingProgress} to update the loading progress bar
     * when using an ArrayBuffer.
     *
     * @deprecated Use the new {@link Scene} and {@link Scene} API.
     *
     * @param options Path to the file to load, or an option object.
     *     For more information about the options, see the {@link SceneLoadOptions} documentation.
     * @returns Promise that resolves when the scene was loaded.
     */
    async load(options: string | SceneLoadOptions): Promise<Scene> {
        /** @todo(2.0.0): Remove this method. */
        let dispatchReadyEvent = false;
        let opts: InMemoryLoadOptions;
        if (isString(options)) {
            opts = await Scene.loadBuffer(options, (bytes: number, size: number) => {
                this.engine.log.info(LogTag.Scene, `Scene downloading: ${bytes} / ${size}`);
                this.setLoadingProgress(bytes / size);
            });
        } else {
            opts = options;
            dispatchReadyEvent = options.dispatchReadyEvent ?? false;
        }

        const scene = await this.engine.loadMainSceneFromBuffer({
            ...opts,
            dispatchReadyEvent,
        });
        this.engine.onSceneLoaded.notify();
        return scene;
    }

    /**
     * Append a scene file.
     *
     * Loads and parses the file and its images and appends the result
     * to the currently active scene.
     *
     * Supported formats are streamable Wonderland scene files (.bin) and glTF
     * 3D scenes (.gltf, .glb).
     *
     * ```js
     * WL.scene.append(filename).then(root => {
     *     // root contains the loaded scene
     * });
     * ```
     *
     * In case the `loadGltfExtensions` option is set to true, the response
     * will be an object containing both the root of the loaded scene and
     * any glTF extensions found on nodes, meshes and the root of the file.
     *
     * ```js
     * WL.scene.append(filename, { loadGltfExtensions: true }).then(({root, extensions}) => {
     *     // root contains the loaded scene
     *     // extensions.root contains any extensions at the root of glTF document
     *     const rootExtensions = extensions.root;
     *     // extensions.mesh and extensions.node contain extensions indexed by Object id
     *     const childObject = root.children[0];
     *     const meshExtensions = root.meshExtensions[childObject.objectId];
     *     const nodeExtensions = root.nodeExtensions[childObject.objectId];
     *     // extensions.idMapping contains a mapping from glTF node index to Object id
     * });
     * ```
     *
     * If the file to be loaded is located in a subfolder, it might be useful
     * to define the `baseURL` option. This will ensure any bin files
     * referenced by the loaded bin file are loaded at the correct path.
     *
     * ```js
     * WL.scene.append(filename, { baseURL: 'scenes' }).then(({root, extensions}) => {
     *     // do stuff
     * });
     * ```
     *
     * @deprecated Use the new {@link Prefab} and {@link Scene} API.
     *
     * @param file The .bin, .gltf or .glb file to append. Should be a URL or
     *   an `ArrayBuffer` with the file content.
     * @param options Additional options for loading.
     * @returns Promise that resolves when the scene was appended.
     */
    async append(
        file: string | ArrayBuffer,
        options: Partial<SceneAppendParameters> = {}
    ): Promise<SceneAppendResult> {
        /** @todo(2.0.0): Remove this method. */

        const {baseURL = isString(file) ? getBaseUrl(file) : this.baseURL} = options;

        const buffer = isString(file) ? await fetchWithProgress(file) : file;
        const data = new Uint8Array(buffer);
        const isBinFile =
            data.byteLength > MAGIC_BIN.length &&
            data
                .subarray(0, MAGIC_BIN.length)
                .every((value, i) => value === MAGIC_BIN.charCodeAt(i));

        const scene = isBinFile
            ? this.engine.loadPrefabFromBuffer({buffer, baseURL})
            : this.engine.loadGLTFFromBuffer({
                  buffer,
                  baseURL,
                  extensions: options.loadGltfExtensions,
              });

        const result = this.instantiate(scene)!;
        if (scene instanceof PrefabGLTF) {
            if (!scene.extensions) return result.root;
            return {
                root: result.root,
                extensions: {
                    ...(result as InstantiateGltfResult).extensions,
                    root: scene.extensions.root,
                },
            } as SceneAppendResultWithExtensions;
        }
        return result.root;
    }

    /**
     * Update the loading screen progress bar.
     *
     * @param value Current loading percentage, in the range [0; 1].
     */
    setLoadingProgress(percentage: number) {
        const wasm = this.engine.wasm;
        wasm._wl_set_loading_screen_progress(clamp(percentage, 0, 1));
    }

    /**
     * Dispatch an event 'wle-scene-ready' in the document.
     *
     * @note This is used for automatic testing.
     */
    dispatchReadyEvent() {
        document.dispatchEvent(
            new CustomEvent('wle-scene-ready', {
                detail: {filename: this.filename},
            })
        );
    }

    /**
     * Set the current material to render the sky.
     *
     * @note The sky needs to be enabled in the editor when creating the scene.
     * For more information, please refer to the background [tutorial](https://wonderlandengine.com/tutorials/background-effect/).
     */
    set skyMaterial(material: Material | null) {
        this.engine.wasm._wl_scene_set_sky_material(this._index, material?._id ?? 0);
    }

    /** Current sky material, or `null` if no sky is set. */
    get skyMaterial(): Material | null {
        const index = this.engine.wasm._wl_scene_get_sky_material(this._index);
        return this.engine.materials.wrap(index);
    }

    /**
     * Reset the scene.
     *
     * This method deletes all used and allocated objects, and components.
     *
     * @deprecated Load a new scene and activate it instead.
     */
    reset() {
        /** @todo(2.0.0): Remove this method. */
    }

    /**
     * Download and apply queued dependency files (.bin).
     *
     * @hidden
     */
    async _downloadDependency(url: string) {
        const wasm = this.engine.wasm;

        const buffer = await fetchWithProgress(url);
        const ptr = wasm.copyBufferToHeap(buffer);
        try {
            wasm._wl_scene_load_queued_bin(this._index, ptr, buffer.byteLength);
        } finally {
            /* Catch calls to abort(), e.g. via asserts */
            wasm._free(ptr);
        }
    }

    /**
     * Download and apply queued dependency files (.bin).
     *
     * @hidden
     */
    async _downloadDependencies() {
        const wasm = this.engine.wasm;

        const count = wasm._wl_scene_queued_bin_count(this._index);
        if (!count) return Promise.resolve();

        const urls = new Array(count).fill(0).map((_, i: number) => {
            const ptr = wasm._wl_scene_queued_bin_path(this._index, i);
            const url = wasm.UTF8ToString(ptr);
            return url;
        });

        wasm._wl_scene_clear_queued_bin_list(this._index);

        return Promise.all(urls.map((url: string) => this._downloadDependency(url)));
    }
}
