import {WonderlandEngine} from './engine.js';
import {LogTag} from './index.js';
import {Emitter} from './utils/event.js';
import {fetchWithProgress, getBaseUrl} from './utils/fetch.js';
import {clamp, timeout} from './utils/misc.js';
import {isString} from './utils/object.js';
import {Material, NumberArray, Object3D, RayHit, ViewComponent} from './wonderland.js';

/** Extension data obtained from glTF files. */
export interface GLTFExtensions {
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
    extensions: GLTFExtensions;
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

/** Scene loading options. */
export interface SceneLoadOptions {
    /** An in-memory buffer, containing the bytes of a `.bin` file. */
    buffer: ArrayBuffer;

    /** Path from which resources are resolved (images, languages, etc...). */
    baseURL: string;
}

/**
 * Provides global scene functionality like raycasting.
 */
export class Scene {
    /** Called before rendering the scene */
    readonly onPreRender = new Emitter();
    /** Called after the scene has been rendered */
    readonly onPostRender = new Emitter();

    /** Wonderland Engine instance. @hidden */
    protected _engine: WonderlandEngine;

    /** Ray hit pointer in WASM heap. @hidden */
    private _rayHit: number;
    /** Ray hit. @hidden */
    private _hit: RayHit;
    /**
     * Relative directory of the scene that was loaded with {@link Scene.load}
     * Used for loading any files relative to the main scene.
     *
     * We need this for the tests that load bin files since we aren't loading
     * from the deploy folder directly. (test/resources/projects/*.bin)
     *
     * @hidden
     */
    private _baseURL: string;

    constructor(engine: WonderlandEngine) {
        this._engine = engine;
        this._rayHit = engine.wasm._malloc(4 * (3 * 4 + 3 * 4 + 4 + 2) + 4);
        this._hit = new RayHit(this._engine, this._rayHit);
        this._baseURL = '';
    }

    /**
     * Currently active view components.
     */
    get activeViews(): ViewComponent[] {
        const wasm = this._engine.wasm;
        const count = wasm._wl_scene_get_active_views(this._engine.wasm._tempMem, 16);

        const views: ViewComponent[] = [];
        const viewTypeIndex = wasm._typeIndexFor('view');
        for (let i = 0; i < count; ++i) {
            views.push(
                new ViewComponent(
                    this._engine,
                    viewTypeIndex,
                    this._engine.wasm._tempMemInt[i]
                )
            );
        }

        return views;
    }

    /**
     * Relative directory of the scene that was loaded with {@link Scene.load}
     * Used for loading any files relative to the main scene.
     *
     * @hidden
     */
    get baseURL(): string {
        return this._baseURL;
    }

    /**
     * Cast a ray through the scene and find intersecting objects.
     *
     * The resulting ray hit will contain up to **4** closest ray hits,
     * sorted by increasing distance.
     *
     * @param o Ray origin.
     * @param d Ray direction.
     * @param group Collision group to filter by: only objects that are
     *        part of given group are considered for raycast.
     * @param maxDistance Maximum **inclusive** hit distance. Defaults to `100`.
     *
     * @returns The scene cached {@link RayHit} instance.
     * @note The returned object is owned by the Scene instance
     *   will be reused with the next {@link Scene#rayCast} call.
     */
    rayCast(
        o: Readonly<NumberArray>,
        d: Readonly<NumberArray>,
        group: number,
        maxDistance = 100.0
    ): RayHit {
        this._engine.wasm._wl_scene_ray_cast(
            o[0],
            o[1],
            o[2],
            d[0],
            d[1],
            d[2],
            group,
            this._rayHit,
            maxDistance
        );
        return this._hit;
    }

    /**
     * Add an object to the scene.
     *
     * @param parent Parent object or `null`.
     * @returns A newly created object.
     */
    addObject(parent: Object3D | null = null): Object3D {
        const parentId = parent ? parent.objectId : 0;
        const objectId = this._engine.wasm._wl_scene_add_object(parentId);
        return this._engine.wrapObject(objectId);
    }

    /**
     * Batch-add objects to the scene.
     *
     * Will provide better performance for adding multiple objects (e.g. > 16)
     * than calling {@link Scene#addObject} repeatedly in a loop.
     *
     * By providing upfront information of how many objects will be required,
     * the engine is able to batch-allocate the required memory rather than
     * convervatively grow the memory in small steps.
     *
     * **Experimental:** This API might change in upcoming versions.
     *
     * @param count Number of objects to add.
     * @param parent Parent object or `null`, default `null`.
     * @param componentCountHint Hint for how many components in total will
     *      be added to the created objects afterwards, default `0`.
     * @returns Newly created objects
     */
    addObjects(
        count: number,
        parent: Object3D | null = null,
        componentCountHint: number = 0
    ): Object3D[] {
        const parentId = parent ? parent.objectId : 0;
        this._engine.wasm.requireTempMem(count * 2);
        const actualCount = this._engine.wasm._wl_scene_add_objects(
            parentId,
            count,
            componentCountHint || 0,
            this._engine.wasm._tempMem,
            this._engine.wasm._tempMemSize >> 1
        );
        const ids = this._engine.wasm._tempMemUint16.subarray(0, actualCount);
        const wrapper = this._engine.wrapObject.bind(this._engine);
        const objects = Array.from(ids, wrapper);
        return objects;
    }

    /**
     * Pre-allocate memory for a given amount of objects and components.
     *
     * Will provide better performance for adding objects later with {@link Scene#addObject}
     * and {@link Scene#addObjects}.
     *
     * By providing upfront information of how many objects will be required,
     * the engine is able to batch-allocate the required memory rather than
     * conservatively grow the memory in small steps.
     *
     * **Experimental:** This API might change in upcoming versions.
     *
     * @param objectCount Number of objects to add.
     * @param componentCountPerType Amount of components to
     *      allocate for {@link Object3D.addComponent}, e.g. `{mesh: 100, collision: 200, "my-comp": 100}`.
     * @since 0.8.10
     */
    reserveObjects(objectCount: number, componentCountPerType: Record<string, number>) {
        const wasm = this._engine.wasm;
        componentCountPerType = componentCountPerType || {};
        const jsManagerIndex = wasm._jsManagerIndex;
        let countsPerTypeIndex = wasm._tempMemInt.subarray();
        countsPerTypeIndex.fill(0);
        for (const e of Object.entries(componentCountPerType)) {
            const typeIndex = wasm._typeIndexFor(e[0]);
            countsPerTypeIndex[typeIndex < 0 ? jsManagerIndex : typeIndex] += e[1];
        }
        wasm._wl_scene_reserve_objects(objectCount, wasm._tempMem);
    }

    /**
     * Top-level objects of this scene.
     *
     * See {@link Object3D.children} for more information.
     *
     * @since 1.2.0
     */
    get children(): Object3D[] {
        const root = this._engine.wrapObject(0);
        return root.children;
    }

    /**
     * Search for objects matching the name.
     *
     * See {@link Object3D.findByName} for more information.
     *
     * @param name The name to search for.
     * @param recursive If `true`, the method will look at all the objects of
     *     this scene. If `false`, this method will only perform the search in
     *     root objects.
     * @returns An array of {@link Object3D} matching the name.
     *
     * @since 1.2.0
     */
    findByName(name: string, recursive = false): Object3D[] {
        const root = this._engine.wrapObject(0);
        return root.findByName(name, recursive);
    }

    /**
     * Search for all **top-level** objects matching the name.
     *
     * See {@link Object3D.findByNameDirect} for more information.
     *
     * @param name The name to search for.
     * @returns An array of {@link Object3D} matching the name.
     *
     * @since 1.2.0
     */
    findByNameDirect(name: string): Object3D[] {
        const root = this._engine.wrapObject(0);
        return root.findByNameDirect(name);
    }

    /**
     * Search for **all objects** matching the name.
     *
     * See {@link Object3D.findByNameRecursive} for more information.
     *
     * @param name The name to search for.
     * @returns An array of {@link Object3D} matching the name.
     *
     * @since 1.2.0
     */
    findByNameRecursive(name: string): Object3D[] {
        const root = this._engine.wrapObject(0);
        return root.findByNameRecursive(name);
    }

    /**
     * Set the background clear color.
     *
     * @param color new clear color (RGBA).
     * @since 0.8.5
     */
    set clearColor(color: number[]) {
        this._engine.wasm._wl_scene_set_clearColor(color[0], color[1], color[2], color[3]);
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
        this._engine.wasm._wl_scene_enableColorClear(b);
    }

    /** Hosting engine instance. */
    get engine() {
        return this._engine;
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
     * @param opts Path to the file to load, or an option object.
     *     For more information about the options, see the {@link SceneLoadOptions} documentation.
     * @returns Promise that resolves when the scene was loaded.
     */
    async load(options: string | SceneLoadOptions): Promise<void> {
        let buffer: ArrayBuffer | null = null;
        let baseURL: string | null = null;
        let filename: string = null!;
        if (isString(options)) {
            filename = options;
            buffer = await fetchWithProgress(filename, (bytes, size) => {
                this.engine.log.info(LogTag.Scene, `Scene downloading: ${bytes} / ${size}`);
                this.setLoadingProgress(bytes / size);
            });
            baseURL = getBaseUrl(filename);
            this.engine.log.info(
                LogTag.Scene,
                `Scene download of ${buffer.byteLength} bytes successful.`
            );
        } else {
            ({buffer, baseURL} = options);
            filename = baseURL ? `${baseURL}/scene.bin` : 'scene.bin';
        }

        if (!buffer) {
            throw new Error('Failed to load scene, buffer not provided');
        }
        if (!isString(baseURL)) {
            throw new Error('Failed to load scene, baseURL not provided');
        }

        if (!this._engine.onLoadingScreenEnd.isDataRetained) {
            this._engine.onLoadingScreenEnd.notify();
        }

        this._baseURL = baseURL;

        const wasm = this._engine.wasm;

        const size = buffer.byteLength;
        const ptr = wasm._malloc(size);
        new Uint8Array(wasm.HEAPU8.buffer, ptr, size).set(new Uint8Array(buffer));

        try {
            /** @todo: Remove third parameter at 1.2.0 */
            wasm._wl_load_scene_bin(ptr, size, wasm.tempUTF8(filename));
        } finally {
            /* Catch calls to abort(), e.g. via asserts */
            wasm._free(ptr);
        }

        const i18n = this._engine.i18n;
        const langPromise = i18n.setLanguage(i18n.languageCode(0));

        await Promise.all([langPromise, this._flushAppend(this._baseURL)]);

        this._engine.onSceneLoaded.notify();
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
     * @param file The .bin, .gltf or .glb file to append. Should be a URL or
     *   an `ArrayBuffer` with the file content.
     * @param options Additional options for loading.
     * @returns Promise that resolves when the scene was appended.
     */
    async append(
        file: string | ArrayBuffer,
        options: Partial<SceneAppendParameters> = {}
    ): Promise<SceneAppendResult> {
        const {
            loadGltfExtensions = false,
            baseURL = isString(file) ? getBaseUrl(file) : this._baseURL,
        } = options;

        const wasm = this._engine.wasm;
        const buffer = isString(file) ? await fetchWithProgress(file) : file;

        let error: Error | null = null;
        let result: SceneAppendResult | undefined = undefined;

        let callback = wasm.addFunction(
            (objectId: number, extensionData: number, extensionDataSize: number) => {
                if (objectId < 0) {
                    error = new Error(
                        `Scene.append(): Internal runtime error, found root id = ${objectId}`
                    );
                    return;
                }
                const root = objectId ? this._engine.wrapObject(objectId) : null;
                result = root;

                if (!extensionData || !extensionDataSize) return;

                const marshalled = new Uint32Array(
                    wasm.HEAPU32.buffer,
                    extensionData,
                    extensionDataSize / 4
                );
                const extensions = this._unmarshallGltfExtensions(marshalled);
                result = {root, extensions};
            },
            'viii'
        );

        const size = buffer.byteLength;
        const ptr = wasm._malloc(size);
        const data = new Uint8Array(wasm.HEAPU8.buffer, ptr, size);
        data.set(new Uint8Array(buffer));

        const isBinFile =
            data.byteLength > MAGIC_BIN.length &&
            data
                .subarray(0, MAGIC_BIN.length)
                .every((value, i) => value === MAGIC_BIN.charCodeAt(i));

        try {
            if (isBinFile) {
                wasm._wl_append_scene_bin(ptr, size, callback);
            } else {
                wasm._wl_append_scene_gltf(ptr, size, loadGltfExtensions, callback);
            }
        } catch (e) {
            wasm.removeFunction(callback);
            throw e;
        } finally {
            wasm._free(ptr);
        }

        /* Debounce this call to allow the animation loop to be scheduled.
         * Without this, the promise might hang forever. */
        while (result === undefined && !error) await timeout(4);

        wasm.removeFunction(callback);

        if (error) throw error;

        if (isBinFile) await this._flushAppend(baseURL);

        return result!;
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
     * Set the current material to render the sky.
     *
     * @note The sky needs to be enabled in the editor when creating the scene.
     * For more information, please refer to the background [tutorial](https://wonderlandengine.com/tutorials/background-effect/).
     */
    set skyMaterial(material: Material | null) {
        this._engine.wasm._wl_scene_set_sky_material(material?._index ?? 0);
    }

    /** Current sky material, or `null` if no sky is set. */
    get skyMaterial(): Material | null {
        const id = this._engine.wasm._wl_scene_get_sky_material();
        return id > 0 ? new Material(this._engine, id) : null;
    }

    /**
     * Load all currently queued bin files.
     *
     * Used by {@link Scene.append} and {@link Scene.load}
     * to load all delay-load bins.
     *
     * Used by {@link I18N.language} to trigger loading the
     * associated language bin, after it was queued.
     *
     * @param baseURL Url that is added to each path.
     * @param options Additional options for loading.
     *
     * @hidden
     */
    _flushAppend(baseURL: string) {
        const wasm = this._engine.wasm;
        const count = wasm._wl_scene_queued_bin_count();
        if (!count) return Promise.resolve();

        const urls = new Array(count).fill(0).map((_, i: number) => {
            const ptr = wasm._wl_scene_queued_bin_path(i);
            return wasm.UTF8ToString(ptr);
        });

        wasm._wl_scene_clear_queued_bin_list();

        const promises = urls.map((path: string) =>
            this.append(baseURL.length ? `${baseURL}/${path}` : path)
        );

        return Promise.all(promises).then((data) => {
            const i18n = this._engine.i18n;
            this._engine.i18n.onLanguageChanged.notify(
                i18n.previousIndex,
                i18n.currentIndex
            );
            return data;
        });
    }

    /**
     * Unmarshalls the GltfExtensions from an Uint32Array.
     *
     * @param data Array containing the gltf extension data.
     * @returns The extensions stored in an object literal.
     *
     * @hidden
     */
    _unmarshallGltfExtensions(data: Uint32Array): GLTFExtensions {
        /* @todo: This method should be moved in the internal Emscripten library. */
        const extensions: GLTFExtensions = {
            root: {},
            mesh: {},
            node: {},
            idMapping: [],
        };

        let index = 0;
        const readString = () => {
            const strPtr = data[index++];
            const strLen = data[index++];
            return this._engine.wasm.UTF8ViewToString(strPtr, strPtr + strLen);
        };

        const idMappingSize = data[index++];
        const idMapping: number[] = new Array(idMappingSize);
        for (let i = 0; i < idMappingSize; ++i) {
            idMapping[i] = data[index++];
        }
        extensions.idMapping = idMapping;

        const meshExtensionsSize = data[index++];
        for (let i = 0; i < meshExtensionsSize; ++i) {
            const objectId = data[index++];
            extensions.mesh[idMapping[objectId]] = JSON.parse(readString());
        }
        const nodeExtensionsSize = data[index++];
        for (let i = 0; i < nodeExtensionsSize; ++i) {
            const objectId = data[index++];
            extensions.node[idMapping[objectId]] = JSON.parse(readString());
        }
        const rootExtensionsStr = readString();
        if (rootExtensionsStr) {
            extensions.root = JSON.parse(rootExtensionsStr);
        }

        return extensions;
    }

    /**
     * Reset the scene.
     *
     * This method deletes all used and allocated objects, and components.
     */
    reset() {
        this._engine.wasm._wl_scene_reset();
        this._baseURL = '';
    }
}
