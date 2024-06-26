import {ComponentManagers} from './component.js';
import {WonderlandEngine} from './engine.js';
import {ResourceManager, SceneResource} from './resources/resource.js';
import {ProgressCallback} from './types.js';
import {fetchWithProgress, getBaseUrl, getFilename} from './utils/fetch.js';
import {isString} from './utils/object.js';
import {
    Animation,
    Component,
    DestroyedObjectInstance,
    Object3D,
    Skin,
} from './wonderland.js';

/** Scene loading options. */
export interface SceneLoadOptions {
    /** An in-memory buffer, containing the bytes of a `.bin` file. */
    buffer: ArrayBuffer;

    /** Path from which resources are resolved (images, languages, etc...). */
    baseURL: string;

    /** If `true`, dispatches a ready event in the document. */
    dispatchReadyEvent?: boolean;
}

/** Loading options for in-memory data. */
export interface InMemoryLoadOptions {
    /** An in-memory buffer, containing the bytes of a `.bin` file. */
    buffer: ArrayBuffer;
    /** Path from which resources are resolved (images, languages, etc...). */
    baseURL: string;
    /** Name of the file. This is the same that will be retrieved via {@link Scene#filename} */
    filename?: string;
}

/** Options used during loading */
export type LoadOptions<T = void> = string | (T & {url: string});

/**
 * Base class for prefabs, scenes, and glTF.
 *
 * For more information have a look at the derived types:
 * - {@link Scene} for Wonderland Engine activatable scenes (.bin)
 * - {@link PrefabGLTF} for glTF scenes
 *
 * #### Resources
 *
 * While **meshes**, **textures**, and **materials** are shared
 * on the {@link WonderlandEngine} instance, a scene comes with:
 * - Animations: Managed using {@link Prefab.animations}
 * - Skins: Managed using {@link Prefab.skins}
 *
 * Those resources are bound to the object hierarchy and are thus required to be
 * per-scene.
 *
 * #### Destruction
 *
 * For now, destroying a scene doesn't automatically remove the resources it
 * references in the engine. For more information, have a look at the
 * {@link Scene.destroy} method.
 *
 * #### Isolation
 *
 * It's forbidden to mix objects and components from different scenes, e.g.,
 *
 * ```js
 * const objA = sceneA.addObject();
 * const objB = sceneB.addObject();
 * objA.parent = objB; // Throws
 * ```
 *
 * @category scene
 *
 * @since 1.2.0
 */
export class Prefab {
    /**
     * Load an `ArrayBuffer` using fetch.
     *
     * @param opts The url or options.
     * @param progress Progress callback
     * @returns An {@link InMemoryLoadOptions} object.
     *
     * @hidden
     */
    static async loadBuffer(
        opts: LoadOptions,
        progress: ProgressCallback
    ): Promise<InMemoryLoadOptions> {
        const url = isString(opts) ? opts : opts.url;
        const buffer = await fetchWithProgress(url, progress);
        const baseURL = getBaseUrl(url);
        const filename = getFilename(url);
        return {buffer, baseURL, filename};
    }

    /**
     * Validate the in memory options.
     *
     * @param options Options to validate.
     * @returns Validated options object.
     *
     * @hidden
     */
    static validateBufferOptions(options: InMemoryLoadOptions): {
        buffer: ArrayBuffer;
        baseURL: string;
        url: string;
    } {
        const {buffer, baseURL, filename = 'scene.bin'} = options;
        if (!buffer) {
            throw new Error("missing 'buffer' in options");
        }
        if (!isString(baseURL)) {
            throw new Error("missing 'baseURL' in options");
        }
        const url = baseURL ? `${baseURL}/${filename}` : filename;
        return {buffer, baseURL, url};
    }

    /** Index in the scene manager. @hidden */
    readonly _index;
    /** @hidden */
    protected _engine: WonderlandEngine;

    /**
     * Component manager caching to avoid GC.
     *
     * @hidden
     */
    readonly _components: ComponentManagers;
    /**
     * JavaScript components for this scene.
     *
     * This array is moved into the WASM instance upon activation.
     *
     * @hidden
     */
    readonly _jsComponents: Component[] = [];

    /** @hidden */
    private readonly _animations;
    /** @hidden */
    private readonly _skins;

    /**
     * Object class instances to avoid GC.
     *
     * @hidden
     */
    private readonly _objectCache: (Object3D | null)[] = [];

    /**
     * @note This api is meant to be used internally.
     *
     * @hidden
     */
    constructor(engine: WonderlandEngine, index: number) {
        this._engine = engine;
        this._index = index;

        this._components = new ComponentManagers(this);
        this._animations = new ResourceManager(this as Prefab, Animation);
        this._skins = new ResourceManager(this as Prefab, Skin);
    }

    /**
     * Add an object to the scene.
     *
     * @param parent Parent object or `null`.
     * @returns A newly created object.
     */
    addObject(parent: Object3D | null = null): Object3D {
        this.assertOrigin(parent);
        const parentId = parent ? parent._id : 0;
        const objectId = this.engine.wasm._wl_scene_add_object(this._index, parentId);
        return this.wrap(objectId);
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
     * @experimental This API might change in upcoming versions.
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
        const parentId = parent ? parent._id : 0;
        this.engine.wasm.requireTempMem(count * 2);
        const actualCount = this.engine.wasm._wl_scene_add_objects(
            this._index,
            parentId,
            count,
            componentCountHint || 0,
            this.engine.wasm._tempMem,
            this.engine.wasm._tempMemSize >> 1
        );
        const ids = this.engine.wasm._tempMemUint16.subarray(0, actualCount);
        const wrapper = this.wrap.bind(this);
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
        const wasm = this.engine.wasm;
        componentCountPerType = componentCountPerType || {};

        const names = Object.keys(componentCountPerType);

        const countsPerTypeIndex = wasm._tempMemInt;
        for (let i = 0; i < this._components.managersCount; ++i) {
            countsPerTypeIndex[i] = 0;
        }
        for (const name of names) {
            const count = componentCountPerType[name];
            const nativeIndex = this._components.getNativeManager(name);
            countsPerTypeIndex[nativeIndex !== null ? nativeIndex : this._components.js] +=
                count;
        }
        wasm._wl_scene_reserve_objects(this._index, objectCount, wasm._tempMem);
    }

    /**
     * Root object's children.
     *
     * See {@link Object3D.getChildren} for more information.
     *
     * @param out Destination array, expected to have at least `this.childrenCount` elements.
     * @returns The `out` parameter.
     */
    getChildren(out: Object3D[] = new Array(this.childrenCount)): Object3D[] {
        const root = this.wrap(0);
        return root.getChildren(out);
    }

    /**
     * Top-level objects of this scene.
     *
     * See {@link Object3D.children} for more information.
     *
     * @since 1.2.0
     */
    get children(): Object3D[] {
        const root = this.wrap(0);
        return root.children;
    }

    /** The number of children of the root object. */
    get childrenCount(): number {
        return this.engine.wasm._wl_object_get_children_count(0);
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
        const root = this.wrap(0);
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
        const root = this.wrap(0);
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
        const root = this.wrap(0);
        return root.findByNameRecursive(name);
    }

    /**
     * Wrap an object ID using {@link Object}.
     *
     * @note This method performs caching and will return the same
     * instance on subsequent calls.
     *
     * @param objectId ID of the object to create.
     *
     * @returns The object
     */
    wrap(objectId: number): Object3D {
        const cache = this._objectCache;
        const o = cache[objectId] || (cache[objectId] = new Object3D(this, objectId));
        return o;
    }

    /**
     * Destroy the scene.
     *
     * For now, destroying a scene doesn't remove the resources it references. Thus,
     * you will need to reload a main scene to free the memory.
     *
     * For more information about destruction, have a look at the {@link Scene.destroy} method.
     */
    destroy() {
        this.engine._destroyScene(this);
    }

    /* Public Getters & Setters */

    /**
     * `true` if the scene is active, `false` otherwise.
     *
     * Always false for {@link Prefab} and {@link PrefabGLTF}.
     */
    get isActive() {
        return !!this.engine.wasm._wl_scene_active(this._index);
    }

    /**
     * Relative directory of the scene that was loaded.
     *
     * This is used for loading any files relative to the scene.
     */
    get baseURL(): string {
        const wasm = this.engine.wasm;
        const ptr = wasm._wl_scene_get_baseURL(this._index);
        if (!ptr) return '';

        return wasm.UTF8ToString(ptr);
    }

    /**
     * Filename used when loading the file.
     *
     * If the scenes was loaded from memory and no filename was provided,
     * this accessor will return an empty string.
     */
    get filename(): string {
        const wasm = this.engine.wasm;
        const ptr = wasm._wl_scene_get_filename(this._index);
        if (!ptr) return '';
        return wasm.UTF8ToString(ptr);
    }

    /** Animation resources */
    get animations() {
        return this._animations;
    }

    /** Skin resources */
    get skins() {
        return this._skins;
    }

    /** Hosting engine instance. */
    get engine(): WonderlandEngine {
        return this._engine;
    }

    /**
     * `true` if the object is destroyed, `false` otherwise.
     *
     * If {@link WonderlandEngine.erasePrototypeOnDestroy} is `true`,
     * reading a class attribute / method will throw.
     */
    get isDestroyed(): boolean {
        return this._index < 0;
    }

    /** @overload */
    toString() {
        if (this.isDestroyed) {
            return 'Scene(destroyed)';
        }
        return `Scene('${this.filename}', ${this._index})`;
    }

    /**
     * Checks that the input's scene is the same as this instance.
     *
     * It is forbidden to mix objects and components from different scenes, e.g.,
     *
     * ```js
     * const objA = sceneA.addObject();
     * const objB = sceneA.addObject();
     * objA.parent = objB; // Throws
     * ```
     *
     * @param other Object / component to check.
     *
     * @throws If other's scene isn't the same reference as this.
     */
    assertOrigin(other: Object3D | Component | SceneResource | undefined | null) {
        if (other && (other.scene as Prefab) !== this) {
            throw new Error(`Attempt to use ${other} from ${other.scene} in ${this}`);
        }
    }

    /**
     * Download dependencies and initialize the scene.
     *
     * @hidden
     */
    _initialize() {
        this.engine.wasm._wl_scene_initialize(this._index);
    }

    /**
     * Perform cleanup upon object destruction.
     *
     * @param localId The id to destroy.
     *
     * @hidden
     */
    _destroyObject(localId: number) {
        const instance = this._objectCache[localId];
        if (!instance) return;

        (instance._id as number) = -1;
        (instance._localId as number) = -1;

        /* Destroy the prototype of this instance to avoid using a dangling object */
        if (this.engine.erasePrototypeOnDestroy && instance) {
            Object.setPrototypeOf(instance, DestroyedObjectInstance);
        }

        /* Remove from the cache to avoid side-effects when
         * re-creating an object with the same id. */
        this._objectCache[localId] = null;
    }
}
