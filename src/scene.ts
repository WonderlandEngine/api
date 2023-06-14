import {WonderlandEngine} from './engine.js';
import {Emitter} from './utils/event.js';
import {fetchWithProgress} from './utils/fetch.js';
import {isString} from './utils/object.js';
import {NumberArray, Object3D, RayHit, ViewComponent} from './wonderland.js';

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

    constructor(engine: WonderlandEngine) {
        this._engine = engine;
        this._rayHit = engine.wasm._malloc(4 * (3 * 4 + 3 * 4 + 4 + 2) + 4);
        this._hit = new RayHit(this._engine, this._rayHit);
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
     * Cast a ray through the scene and find intersecting objects.
     *
     * The resulting ray hit will contain up to **4** closest ray hits,
     * sorted by increasing distance.
     *
     * @param o Ray origin.
     * @param d Ray direction.
     * @param group Collision group to filter by: only objects that are
     *        part of given group are considered for raycast.
     *
     * @returns The scene cached {@link RayHit} instance.
     * @note The returned object is owned by the Scene instance
     *   will be reused with the next {@link Scene#rayCast} call.
     */
    rayCast(o: Readonly<NumberArray>, d: Readonly<NumberArray>, group: number): RayHit {
        this._engine.wasm._wl_scene_ray_cast(
            o[0],
            o[1],
            o[2],
            d[0],
            d[1],
            d[2],
            group,
            this._rayHit
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
        const jsManagerIndex = wasm._typeIndexFor('js');
        let countsPerTypeIndex = wasm._tempMemInt.subarray();
        countsPerTypeIndex.fill(0);
        for (const e of Object.entries(componentCountPerType)) {
            const typeIndex = wasm._typeIndexFor(e[0]);
            countsPerTypeIndex[typeIndex < 0 ? jsManagerIndex : typeIndex] += e[1];
        }
        wasm._wl_scene_reserve_objects(objectCount, wasm._tempMem);
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
     * @param filename Path to the .bin file.
     * @returns Promise that resolves when the scene was loaded.
     */
    async load(filename: string): Promise<void> {
        const wasm = this._engine.wasm;

        const buffer = await fetchWithProgress(filename, (bytes, size) => {
            console.log(`Scene downloading: ${bytes} / ${size}`);
            wasm._wl_set_loading_screen_progress(bytes / size);
        });

        const size = buffer.byteLength;
        console.log(`Scene download of ${size} bytes successful.`);

        const ptr = wasm._malloc(size);
        new Uint8Array(wasm.HEAPU8.buffer, ptr, size).set(new Uint8Array(buffer));

        try {
            wasm._wl_load_scene_bin(ptr, size, wasm.tempUTF8(filename));
        } finally {
            /* Catch calls to abort(), e.g. via asserts */
            wasm._free(ptr);
        }

        const binQueue = wasm._queuedBinFiles;
        if (binQueue.length > 0) {
            wasm._queuedBinFiles = [];
            await Promise.all(binQueue.map((path) => this.append(path)));
        }

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
     * @param file The .bin, .gltf or .glb file to append. Should be a URL or
     *   an `ArrayBuffer` with the file content.
     * @param options Additional options for loading.
     * @returns Promise that resolves when the scene was appended.
     */
    async append(
        file: string | ArrayBuffer,
        options?: Partial<SceneAppendParameters>
    ): Promise<SceneAppendResult> {
        const buffer = isString(file) ? await fetchWithProgress(file) : file;

        const wasm = this._engine.wasm;

        let callback!: number;
        const promise = new Promise<SceneAppendResult>((resolve, reject) => {
            callback = wasm.addFunction(
                (objectId: number, extensionData: number, extensionDataSize: number) => {
                    if (objectId < 0) {
                        reject();
                        return;
                    }
                    const root = objectId ? this._engine.wrapObject(objectId) : null;
                    if (extensionData && extensionDataSize) {
                        const marshalled = new Uint32Array(
                            wasm.HEAPU32.buffer,
                            extensionData,
                            extensionDataSize / 4
                        );
                        const extensions = this._unmarshallGltfExtensions(marshalled);
                        resolve({root, extensions});
                    } else {
                        resolve(root);
                    }
                },
                'viii'
            );
        }).finally(() => wasm.removeFunction(callback));

        const size = buffer.byteLength;
        const ptr = wasm._malloc(size);
        const data = new Uint8Array(wasm.HEAPU8.buffer, ptr, size);
        data.set(new Uint8Array(buffer));

        const MAGIC = 'WLEV';
        const isBinFile =
            data.byteLength > MAGIC.length &&
            data
                .subarray(0, MAGIC.length)
                .every((value, i) => value === MAGIC.charCodeAt(i));

        try {
            if (isBinFile) {
                wasm._wl_append_scene_bin(ptr, size, callback);
            } else {
                const loadExtensions = options?.loadGltfExtensions ?? false;
                wasm._wl_append_scene_gltf(ptr, size, loadExtensions, callback);
            }
        } catch (e) {
            wasm.removeFunction(callback);
            throw e;
        } finally {
            wasm._free(ptr);
        }

        const result = await promise;

        const binQueue = wasm._queuedBinFiles;
        if (isBinFile && binQueue.length > 0) {
            wasm._queuedBinFiles = [];
            await Promise.all(binQueue.map((path) => this.append(path, options)));
        }

        return result;
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
    }
}
