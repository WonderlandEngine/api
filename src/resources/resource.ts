import {WonderlandEngine} from '../engine.js';
import {Prefab} from '../prefab.js';
import {Scene} from '../scene.js';
import {FirstConstructorParam} from '../types.js';

/** Interface for a resource class */
type ResourceConstructor<T extends SceneResource | Resource> = {
    new (host: FirstConstructorParam<T>, index: number): T;
};

/**
 * Create a proxy throwing destroyed errors upon access.
 *
 * @param type The type to display upon error
 * @returns The proxy instance
 */
function createDestroyedProxy<T extends SceneResource | Resource>(
    host: FirstConstructorParam<T>,
    type: ResourceConstructor<T>
) {
    return new Proxy(
        {},
        {
            get(_, param: string) {
                if (param === 'isDestroyed') return true;
                throw new Error(
                    `Cannot read '${param}' of destroyed '${type.name}' resource from ${host}`
                );
            },
            set(_, param: string) {
                throw new Error(
                    `Cannot write '${param}' of destroyed '${type.name}' resource from ${host}`
                );
            },
        }
    );
}

/**
 * Base class for engine resources, such as:
 * - {@link Texture}
 * - {@link Mesh}
 * - {@link Material}
 *
 * @since 1.2.0
 */
export abstract class Resource {
    /** Relative index in the host. @hidden */
    readonly _index: number = -1;
    /** For compatibility with SceneResource. @hidden */
    readonly _id: number = -1;
    /** @hidden */
    private readonly _engine: WonderlandEngine;

    constructor(engine: WonderlandEngine, index: number) {
        this._engine = engine;
        this._index = index;
        this._id = index;
    }

    /** Hosting engine instance. */
    get engine() {
        return this._engine;
    }

    /** Index of this resource in the {@link Scene}'s manager. */
    get index() {
        return this._index;
    }

    /**
     * Checks equality by comparing ids and **not** the JavaScript reference.
     *
     * @deprecated Use JavaScript reference comparison instead:
     *
     * ```js
     * const meshA = engine.meshes.create({vertexCount: 1});
     * const meshB = engine.meshes.create({vertexCount: 1});
     * const meshC = meshB;
     * console.log(meshA === meshB); // false
     * console.log(meshA === meshA); // true
     * console.log(meshB === meshC); // true
     * ```
     */
    equals(other: this | undefined | null): boolean {
        if (!other) return false;
        return this._index === other._index;
    }

    /**
     * `true` if the object is destroyed, `false` otherwise.
     *
     * If {@link WonderlandEngine.erasePrototypeOnDestroy} is `true`,
     * reading a class attribute / method will throw.
     */
    get isDestroyed() {
        return this._index <= 0;
    }
}

/**
 * Base class for scene resources, such as:
 *  * - {@link Texture}
 * - {@link Mesh}
 * - {@link Material}
 * - {@link Skin}
 * - {@link Animation}
 *
 * @since 1.2.0
 */
export abstract class SceneResource {
    static _pack(scene: number, index: number) {
        return (scene << 22) | index;
    }

    /** Relative index in the host. @hidden */
    readonly _index: number = -1;
    /** For compatibility with SceneResource. @hidden */
    readonly _id: number = -1;
    /** @hidden */
    protected readonly _scene: Prefab;

    constructor(scene: Prefab, index: number) {
        this._scene = scene;
        this._index = index;
        this._id = SceneResource._pack(scene._index, index);
    }

    /**
     * Checks equality by comparing ids and **not** the JavaScript reference.
     *
     * @deprecated Use JavaScript reference comparison instead:
     *
     * ```js
     * const meshA = engine.meshes.create({vertexCount: 1});
     * const meshB = engine.meshes.create({vertexCount: 1});
     * const meshC = meshB;
     * console.log(meshA === meshB); // false
     * console.log(meshA === meshA); // true
     * console.log(meshB === meshC); // true
     * ```
     */
    equals(other: this | undefined | null): boolean {
        if (!other) return false;
        return this._id === other._id;
    }

    /** Hosting instance. */
    get scene() {
        return this._scene;
    }

    /** Hosting engine instance. */
    get engine() {
        return this._scene.engine;
    }

    /** Index of this resource in the {@link Scene}'s manager. */
    get index() {
        return this._index;
    }

    /**
     * `true` if the object is destroyed, `false` otherwise.
     *
     * If {@link WonderlandEngine.erasePrototypeOnDestroy} is `true`,
     * reading a class attribute / method will throw.
     */
    get isDestroyed() {
        return this._id <= 0;
    }
}

/**
 * Manager for resources.
 *
 * Resources are accessed via the engine they belong to.
 *
 * @see {@link WonderlandEngine.textures}, {@link WonderlandEngine.meshes},
 * and {@link WonderlandEngine.materials}.
 *
 * @since 1.2.0
 */
export class ResourceManager<T extends SceneResource | Resource> {
    /** @hidden */
    protected readonly _host: FirstConstructorParam<T>;
    /** Cache. @hidden */
    protected readonly _cache: (T | null)[] = [];

    /** Resource class. @hidden */
    private readonly _template: ResourceConstructor<T>;

    /** Destructor proxy, used if {@link WonderlandEngine.erasePrototypeOnDestroy} is `true`. @hidden */
    private _destructor: {} | null = null;

    private readonly _engine: WonderlandEngine;

    /**
     * Create a new manager
     *
     * @param host The host containing the managed resources.
     * @param Class The class to instantiate when wrapping an index.
     *
     * @hidden
     */
    constructor(host: FirstConstructorParam<T>, Class: ResourceConstructor<T>) {
        this._host = host;
        this._template = Class;
        this._engine = (host as Prefab).engine ?? host;
    }

    /**
     * Wrap the index into a resource instance.
     *
     * @note The index is relative to the host, i.e., doesn't pack the host index (if any).
     *
     * @param index The resource index.
     * @returns
     */
    wrap(index: number) {
        if (index <= 0) return null;
        const texture =
            this._cache[index] ??
            (this._cache[index] = new this._template(this._host, index));
        return texture;
    }

    /**
     * Retrieve the resource at the given index.
     *
     * @note The index is relative to the host, i.e., doesn't pack the host index.
     */
    get(index: number): T | null {
        return this._cache[index] ?? null;
    }

    /** Number of textures allocated in the manager. */
    get allocatedCount() {
        return this._cache.length;
    }

    /**
     * Number of textures in the manager.
     *
     * @note For performance reasons, avoid calling this method when possible.
     */
    get count() {
        let count = 0;
        for (const res of this._cache) {
            if (res && res.index >= 0) ++count;
        }
        return count;
    }

    /** Hosting engine instance. */
    get engine() {
        return this._engine;
    }

    /**
     * Destroy the instance.
     *
     * @note This method takes care of the prototype destruction.
     *
     * @hidden
     */
    _destroy(instance: T) {
        const index = instance.index;
        (instance._index as number) = -1;
        (instance._id as number) = -1;
        this._cache[index] = null;

        if (!this.engine.erasePrototypeOnDestroy) return;

        if (!this._destructor)
            this._destructor = createDestroyedProxy(this._host, this._template);
        Object.setPrototypeOf(instance, this._destructor);
    }

    /**
     * Mark all instances as destroyed.
     *
     * @hidden
     */
    _clear() {
        if (!this.engine.erasePrototypeOnDestroy) return;
        for (let i = 0; i < this._cache.length; ++i) {
            const instance = this._cache[i];
            if (instance) this._destroy(instance);
        }
        this._cache.length = 0;
    }
}
