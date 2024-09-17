import {LogTag} from './index.js';
import {Prefab} from './prefab.js';
import {
    AnimationComponent,
    BrokenComponent,
    CollisionComponent,
    Component,
    ComponentConstructor,
    DestroyedComponentInstance,
    InputComponent,
    LightComponent,
    MeshComponent,
    PhysXComponent,
    TextComponent,
    ViewComponent,
} from './wonderland.js';

/**
 * Manage all component managers in a scene.
 *
 * @hidden
 */
export class ComponentManagers {
    /** Animation manager index. */
    readonly animation: number = -1;
    /** Collision manager index. */
    readonly collision: number = -1;
    /** JavaScript manager index. */
    readonly js: number = -1;
    /** Physx manager index. */
    readonly physx: number = -1;
    /** View manager index. */
    readonly view: number = -1;

    /**
     * Component class instances per type to avoid GC.
     *
     * @note Maps the manager index to the list of components.
     *
     * @todo: Refactor ResourceManager and re-use for components.
     */
    private readonly _cache: (Component | null)[][] = [];
    /** Manager index to component class. */
    private readonly _constructors: ComponentConstructor[];
    /* Manager name to the manager index. */
    private readonly _nativeManagers: Map<string, number> = new Map();

    /** Host instance. */
    private readonly _scene: Prefab;

    constructor(scene: Prefab) {
        this._scene = scene;
        const wasm = this._scene.engine.wasm;

        const native = [
            AnimationComponent,
            CollisionComponent,
            InputComponent,
            LightComponent,
            MeshComponent,
            PhysXComponent,
            TextComponent,
            ViewComponent,
        ];
        this._cache = new Array(native.length);
        this._constructors = new Array(native.length);

        for (const Class of native) {
            const ptr = wasm.tempUTF8(Class.TypeName);
            const manager = wasm._wl_scene_get_component_manager_index(scene._index, ptr);
            this._constructors;
            this._constructors[manager] = Class;
            this._cache[manager] = [] as Component[];
            this._nativeManagers.set(Class.TypeName, manager);
        }

        this.animation = this._nativeManagers.get(AnimationComponent.TypeName)!;
        this.collision = this._nativeManagers.get(CollisionComponent.TypeName)!;
        this.physx = this._nativeManagers.get(PhysXComponent.TypeName)!;
        this.view = this._nativeManagers.get(ViewComponent.TypeName)!;

        const ptr = wasm.tempUTF8('js');
        this.js = wasm._wl_scene_get_component_manager_index(scene._index, ptr);
        this._cache[this.js] = [] as Component[];
    }

    createJs(index: number, id: number, type: number, object: number) {
        const wasm = this._scene.engine.wasm;
        const ctor = wasm._componentTypes[type];
        if (!ctor) {
            throw new Error(`Type index ${type} isn't registered`);
        }

        const log = this._scene.engine.log;

        let component = null;
        try {
            component = new ctor(this._scene, this.js, id);
        } catch (e) {
            log.error(
                LogTag.Component,
                `Exception during instantiation of component ${ctor.TypeName}`
            );
            log.error(LogTag.Component, e);
            component = new BrokenComponent(this._scene);
        }
        component._object = this._scene.wrap(object);

        try {
            component.resetProperties();
        } catch (e) {
            log.error(
                LogTag.Component,
                `Exception during ${component.type} resetProperties() on object ${component.object.name}`
            );
            log.error(LogTag.Component, e);
        }

        this._scene._jsComponents[index] = component;

        /* Add to cache. This is required because destruction is
         * ID-based and not index-based. */
        this._cache[this.js][id] = component;

        return component;
    }

    /**
     * Retrieve a cached component.
     *
     * @param manager The manager index.
     * @param id The component id.
     * @returns The component if cached, `null` otherwise.
     */
    get(manager: number, id: number) {
        return this._cache[manager][id] ?? null;
    }

    /**
     * Wrap the animation.
     *
     * @param id Id to wrap.
     * @returns The previous instance if it was cached, or a new one.
     */
    wrapAnimation(id: number): AnimationComponent {
        return this.wrapNative(this.animation, id) as AnimationComponent;
    }

    /**
     * Wrap the collision.
     *
     * @param id Id to wrap.
     * @returns The previous instance if it was cached, or a new one.
     */
    wrapCollision(id: number): CollisionComponent {
        return this.wrapNative(this.collision, id) as CollisionComponent;
    }

    /**
     * Wrap the view.
     *
     * @param id Id to wrap.
     * @returns The previous instance if it was cached, or a new one.
     */
    wrapView(id: number): ViewComponent {
        return this.wrapNative(this.view, id) as ViewComponent;
    }

    /**
     * Wrap the physx.
     *
     * @param id Id to wrap.
     * @returns The previous instance if it was cached, or a new one.
     */
    wrapPhysx(id: number): PhysXComponent {
        return this.wrapNative(this.physx, id) as PhysXComponent;
    }

    /**
     * Retrieves a component instance if it exists, or create and cache
     * a new one.
     *
     * @note This api is meant to be used internally. Please have a look at
     * {@link Object3D.addComponent} instead.
     *
     * @param componentType Component manager index
     * @param componentId Component id in the manager
     *
     * @returns JavaScript instance wrapping the native component
     */
    wrapNative(manager: number, id: number) {
        if (id < 0) return null;

        const cache = this._cache[manager];
        if (cache[id]) return cache[id];

        const scene = this._scene;
        const Class = this._constructors[manager];
        const component = new Class(scene, manager, id);
        cache[id] = component;
        return component;
    }

    /**
     * Wrap a native or js component.
     *
     * @throws For JavaScript components that weren't previously cached,
     * since that would be a bug in the runtime / api.
     *
     * @param manager The manager index.
     * @param id The id to wrap.
     * @returns The previous instance if it was cached, or a new one.
     */
    wrapAny(manager: number, id: number) {
        if (id < 0) return null;

        if (manager === this.js) {
            const found = this._cache[this.js][id];
            if (!found) {
                throw new Error('JS components must always be cached');
            }
            return found.constructor !== BrokenComponent ? found : null;
        }

        return this.wrapNative(manager, id);
    }

    getNativeManager(name: string): number | null {
        const manager = this._nativeManagers.get(name);
        return manager !== undefined ? manager : null;
    }

    /**
     * Perform cleanup upon component destruction.
     *
     * @param instance The instance to destroy.
     *
     * @hidden
     */
    destroy(instance: Component) {
        const localId = instance._localId;
        const manager = instance._manager;
        (instance._id as number) = -1;
        (instance._localId as number) = -1;
        (instance._manager as number) = -1;

        const erasePrototypeOnDestroy = this._scene.engine.erasePrototypeOnDestroy;
        /* Destroy the prototype of this instance to avoid using a dangling component */
        if (erasePrototypeOnDestroy && instance) {
            Object.setPrototypeOf(instance, DestroyedComponentInstance);
        }

        /* Remove from the cache to avoid side-effects when
         * re-creating a component with the same id. */
        this._cache[manager][localId] = null;
    }

    /** Number of managers, including the JavaScript manager. */
    get managersCount() {
        /* +1 to account for the JavaScript manager */
        return this._nativeManagers.size + 1;
    }
}
