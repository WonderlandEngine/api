import {WonderlandEngine} from './engine.js';
import {
    Animation,
    Object as $Object,
    Component,
    ComponentConstructor,
    ComponentProto,
    CustomParameter,
    Material,
    Mesh,
    Skin,
    Texture,
} from './wonderland.js';

/**
 * Material definition interface.
 *
 * @hidden
 */
export interface MaterialDefinition {
    index: number;
    type: {
        type: number;
        componentCount: number;
        metaType: number;
    };
}

/**
 * Low-level wrapper to interact with the WebAssembly code.
 *
 * @hidden
 */
export class WASM {
    /**
     * Emscripten worker field.
     *
     * @note This api is meant to be used internally.
     */
    worker: string = '';

    /**
     * Emscripten wasm field.
     *
     * @note This api is meant to be used internally.
     */
    wasm: ArrayBuffer = null!;

    /**
     * Convert a WASM memory view to a JavaScript string.
     *
     * @param ptr Pointer start
     * @param ptrEnd Pointer end
     * @returns JavaScript string
     */
    UTF8ViewToString: (ptr: number, ptrEnd: number) => string;

    /** Triggers when the instance is ready to be used. */
    onReady?: () => void;

    /** If `true`, logs will not spam the console on error. */
    _deactivate_component_on_error: boolean = false;

    /** Temporary memory pointer. */
    _tempMem: number = null!;
    /** Temporary memory size. */
    _tempMemSize: number = 0;
    /** Temporary float memory view. */
    _tempMemFloat: Float32Array = null!;
    /** Temporary int memory view. */
    _tempMemInt: Int32Array = null!;
    /** Temporary uint8 memory view. */
    _tempMemUint8: Uint8Array = null!;
    /** Temporary uint32 memory view. */
    _tempMemUint32: Uint32Array = null!;
    /** Temporary uint16 memory view. */
    _tempMemUint16: Uint16Array = null!;

    /** List of callbacks triggered when the scene is loaded. */
    readonly _sceneLoadedCallback: any[] = [];

    /**
     * Material definition cache. Each pipeline has its own
     * associated material definition.
     */
    _materialDefinitions: Map<string | symbol, MaterialDefinition>[] = [];

    /** Image cache. */
    _images: (HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | null)[] = [];

    /** Component instances. */
    _components: Component[] = [];

    /** Component Type info. */
    _componentTypes: ComponentConstructor[] = [];

    /** Index per component type name. */
    _componentTypeIndices: Record<string, number> = {};

    /** Wonderland engine instance. */
    private _engine: WonderlandEngine = null!;

    /**
     * `true` if this runtime is using physx.
     *
     * @note This api is meant to be used internally.
     */
    private _withPhysX: boolean = false;

    /**
     * Decoder for UTF8 `ArrayBuffer` to JavaScript string.
     */
    private readonly _utf8Decoder = new TextDecoder('utf8');

    /**
     * Create a new instance of the WebAssembly <> API bridge.
     *
     * @param threads `true` if the runtime used has threads support
     */
    constructor(threads: boolean) {
        if (threads) {
            this.UTF8ViewToString = (s: number, e: number) => {
                if (!s) return '';
                return this._utf8Decoder.decode(HEAPU8.slice(s, e));
            };
            return;
        }
        this.UTF8ViewToString = (s: number, e: number) => {
            if (!s) return '';
            return this._utf8Decoder.decode(HEAPU8.subarray(s, e));
        };
    }

    /**
     * Reset the cache of the library
     *
     * @note Should only be called when tearing down the runtime.
     */
    reset() {
        this._materialDefinitions = [];
        this._images = [];
        this._components = [];
        this._componentTypes = [];
        this._componentTypeIndices = {};
    }

    /**
     * Register a legacy component in this emscripten instance.
     *
     * @note This api is meant to be used internally.
     *
     * @param typeName The name of the component
     * @param params An object containing the parameters (properties)
     * @param object The object's prototype
     * @returns The registration index
     */
    _registerComponentLegacy(
        typeName: string,
        params: {[key: string]: CustomParameter},
        object: ComponentProto
    ) {
        const ctor = class CustomComponent extends Component {};
        ctor.TypeName = typeName;
        ctor.Properties = params;
        Object.assign(ctor.prototype, object);
        return this._registerComponent(ctor);
    }

    /**
     * Register a class component in this emscripten instance.
     *
     * @note This api is meant to be used internally.
     *
     * @param ctor The class to register.
     * @returns The registration index
     */
    _registerComponent(ctor: ComponentConstructor) {
        /** @todo: This is commented on purpose.
         *
         * It should be added back when we support a pure-npm setup with **no** prebundling
         * of the API for the user.
         *
         * The condition below fails because the user ends up with two distincts WLE api.
         */
        /* if(!(ctor.prototype instanceof WL.Component))
              throw new Error('component must extend WL.Component.'); */

        if (!ctor.TypeName) throw new Error('no name provided for component.');

        const typeIndex =
            ctor.TypeName in this._componentTypeIndices
                ? this._componentTypeIndices[ctor.TypeName]
                : this._componentTypes.length;
        this._componentTypes[typeIndex] = ctor;
        this._componentTypeIndices[ctor.TypeName] = typeIndex;

        console.log('WL: registered component', ctor.TypeName, 'with index', typeIndex);

        return typeIndex;
    }

    /**
     * Allocate the requested amount of temporary memory
     * in this WASM instance.
     *
     * @param size The number of bytes to allocate
     */
    allocateTempMemory(size: number) {
        console.log('Allocating temp mem:', size);
        this._tempMemSize = size;
        if (this._tempMem) _free(this._tempMem);
        this._tempMem = _malloc(this._tempMemSize);
        this.updateTempMemory();
    }

    /**
     * @todo: Delete this and only keep `allocateTempMemory`
     *
     * @param size Number of bytes to allocate
     */
    requireTempMem(size: number) {
        if (this._tempMemSize >= size) return;
        /* Grow in 1kb increments */
        this.allocateTempMemory(Math.ceil(size / 1024) * 1024);
    }

    /**
     * Update the temporary memory views. This must be called whenever the
     * temporary memory address changes.
     *
     * @note This api is meant to be used internally.
     */
    updateTempMemory() {
        this._tempMemFloat = new Float32Array(
            HEAP8.buffer,
            this._tempMem,
            this._tempMemSize >> 2
        );
        this._tempMemInt = new Int32Array(
            HEAP8.buffer,
            this._tempMem,
            this._tempMemSize >> 2
        );
        this._tempMemUint32 = new Uint32Array(
            HEAP8.buffer,
            this._tempMem,
            this._tempMemSize >> 2
        );
        this._tempMemUint16 = new Uint16Array(
            HEAP8.buffer,
            this._tempMem,
            this._tempMemSize >> 1
        );
        this._tempMemUint8 = new Uint8Array(HEAP8.buffer, this._tempMem, this._tempMemSize);
    }

    /**
     * Returns a uint8 buffer view on temporary WASM memory.
     *
     * **Note**: this method might allocate if the requested memory is bigger
     * than the current temporary memory allocated.
     *
     * @param count The number of **elements** required
     * @returns A {@link TypedArray} over the WASM memory
     */
    getTempBufferU8(count: number): Uint8Array {
        this.requireTempMem(count);
        return this._tempMemUint8;
    }

    /**
     * Returns a uint16 buffer view on temporary WASM memory.
     *
     * **Note**: this method might allocate if the requested memory is bigger
     * than the current temporary memory allocated.
     *
     * @param count The number of **elements** required
     * @returns A {@link TypedArray} over the WASM memory
     */
    getTempBufferU16(count: number): Uint16Array {
        this.requireTempMem(count * 2);
        return this._tempMemUint16;
    }

    /**
     * Returns a uint32 buffer view on temporary WASM memory.
     *
     * **Note**: this method might allocate if the requested memory is bigger
     * than the current temporary memory allocated.
     *
     * @param count The number of **elements** required.
     * @returns A {@link TypedArray} over the WASM memory.
     */
    getTempBufferU32(count: number): Uint32Array {
        this.requireTempMem(count * 4);
        return this._tempMemUint32;
    }

    /**
     * Returns a int32 buffer view on temporary WASM memory.
     *
     * **Note**: this method might allocate if the requested memory is bigger
     * than the current temporary memory allocated.
     *
     * @param count The number of **elements** required.
     * @returns A {@link TypedArray} over the WASM memory.
     */
    getTempBufferI32(count: number): Int32Array {
        this.requireTempMem(count * 4);
        return this._tempMemInt;
    }

    /**
     * Returns a float32 buffer view on temporary WASM memory.
     *
     * **Note**: this method might allocate if the requested memory is bigger
     * than the current temporary memory allocated.
     *
     * @param count The number of **elements** required.
     * @returns A {@link TypedArray} over the WASM memory.
     */
    getTempBufferF32(count: number): Float32Array {
        this.requireTempMem(count * 4);
        return this._tempMemFloat;
    }

    /**
     * Notify that a scene has just been loaded.
     *
     * @note This api is meant to be used internally.
     */
    _notifySceneLoaded() {
        for (const f of this._engine.onSceneLoaded) {
            try {
                f();
            } catch (e) {
                console.error('Exception during onSceneLoaded callback');
                console.error(e);
            }
        }
    }

    /**
     * Returns `true` if the runtime supports physx or not.
     */
    get withPhysX(): boolean {
        return this._withPhysX;
    }

    /**
     * Set the engine instance holding this bridge.
     *
     * @note This api is meant to be used internally.
     *
     * @param engine The engine instance.
     */
    protected _setEngine(engine: WonderlandEngine): void {
        this._engine = engine;
    }

    /* WebAssembly to JS call bridge. */

    protected _wljs_allocate(numComponents: number) {
        this._components = new Array(numComponents);
    }
    protected _wljs_init(withPhysX: boolean) {
        this._withPhysX = withPhysX;

        /* Target memory for JS API functions that return arrays */
        this.allocateTempMemory(1024);

        this.onReady?.();
    }
    protected _wljs_reallocate(numComponents: number) {
        if (numComponents > this._components.length) {
            this._components.length = numComponents;
        }
    }
    protected _wljs_scene_add_material_definition(definitionId: number) {
        const definition = new Map();
        /* Cache material definition for faster read/write */
        const nbParams = _wl_material_definition_get_count(definitionId);
        for (let i = 0; i < nbParams; ++i) {
            const name = UTF8ToString(
                _wl_material_definition_get_param_name(definitionId, i)
            );
            const t = _wl_material_definition_get_param_type(definitionId, i);
            definition.set(name, {
                index: i,
                type: {
                    type: t & 0xff,
                    componentCount: (t >> 8) & 0xff,
                    metaType: (t >> 16) & 0xff,
                },
            });
        }
        this._materialDefinitions[definitionId] = definition;
    }
    protected _wljs_set_component_param_bool(c: number, p: number, pe: number, v: number) {
        const param = this.UTF8ViewToString(p, pe);
        (this._components[c] as Record<string, any>)[param] = v !== 0;
    }
    protected _wljs_set_component_param_int(c: number, p: number, pe: number, v: number) {
        const param = this.UTF8ViewToString(p, pe);
        (this._components[c] as Record<string, any>)[param] = v;
    }
    protected _wljs_set_component_param_float(c: number, p: number, pe: number, v: number) {
        const param = this.UTF8ViewToString(p, pe);
        (this._components[c] as Record<string, any>)[param] = v;
    }
    protected _wljs_set_component_param_string(
        c: number,
        p: number,
        pe: number,
        v: number,
        ve: number
    ) {
        const param = this.UTF8ViewToString(p, pe);
        const value = this.UTF8ViewToString(v, ve);
        (this._components[c] as Record<string, any>)[param] = value;
    }
    protected _wljs_set_component_param_object(
        c: number,
        p: number,
        pe: number,
        v: number
    ) {
        const param = this.UTF8ViewToString(p, pe);
        (this._components[c] as Record<string, any>)[param] =
            v > 0 ? this._engine.wrapObject(v) : null;
    }
    protected _wljs_set_component_param_mesh(c: number, p: number, pe: number, v: number) {
        const param = this.UTF8ViewToString(p, pe);
        (this._components[c] as Record<string, any>)[param] =
            v > 0 ? new Mesh(v, this._engine) : null;
    }
    protected _wljs_set_component_param_texture(
        c: number,
        p: number,
        pe: number,
        v: number
    ) {
        const param = this.UTF8ViewToString(p, pe);
        (this._components[c] as Record<string, any>)[param] =
            v > 0 ? new Texture(v, this._engine) : null;
    }
    protected _wljs_set_component_param_material(
        c: number,
        p: number,
        pe: number,
        v: number
    ) {
        const param = this.UTF8ViewToString(p, pe);
        (this._components[c] as Record<string, any>)[param] = new Material(this._engine, v);
    }
    protected _wljs_set_component_param_animation(
        c: number,
        p: number,
        pe: number,
        v: number
    ) {
        const param = this.UTF8ViewToString(p, pe);
        (this._components[c] as Record<string, any>)[param] =
            v > 0 ? new Animation(v) : null;
    }
    protected _wljs_set_component_param_skin(c: number, p: number, pe: number, v: number) {
        const param = this.UTF8ViewToString(p, pe);
        (this._components[c] as Record<string, any>)[param] = v > 0 ? new Skin(v) : null;
    }
    protected _wljs_get_component_type_index(typenamePtr: number) {
        return this._componentTypeIndices[UTF8ToString(typenamePtr)];
    }
    protected _wljs_component_create(
        jsManagerIndex: number,
        index: number,
        id: number,
        type: number,
        object: number
    ) {
        const ctor = this._componentTypes[type];
        const component = new ctor();
        /* Sets the manager and identifier from the outside, to simplify the user's constructor. */

        /* @ts-ignore */
        component._engine = this._engine;
        (component._manager as number) = jsManagerIndex;
        (component._id as number) = id;
        (component._object as $Object) = this._engine.wrapObject(object);
        /* @todo: remove ._type and use the constructor directly.
         * We can't do it safely yet because of uglifyjs. */
        component._type = ctor.TypeName;
        this._components[index] = component;
        return component;
    }
    protected _wljs_component_init(component: number) {
        const c = this._components[component];
        if (c.init) {
            try {
                c.init();
            } catch (e) {
                console.error(
                    `Exception during ${c.type} init() on object ${c.object.name}`
                );
                console.error(e);
            }
        }

        if (c.start) {
            /* Arm onActivate() with the initial start() call */
            const oldActivate = c.onActivate;
            c.onActivate = function () {
                /* As "component" is the component index, which may change
                 * through calls to init() and start(), we call it on the
                 * calling object, which will be the component, instead of
                 * wljs_component_start() etc */
                try {
                    if (this.start) this.start();
                } catch (e) {
                    console.error(
                        `Exception during ${this.type} start() on object ${this.object.name}`
                    );
                    console.error(e);
                }
                this.onActivate = oldActivate;
                if (this.onActivate) {
                    try {
                        this.onActivate();
                    } catch (e) {
                        console.error(
                            `Exception during ${this.type} onActivate() on object ${this.object.name}`
                        );
                        console.error(e);
                    }
                }
            };
        }
    }
    protected _wljs_component_update(component: number, dt: number) {
        const c = this._components[component];
        if (!c) {
            console.warn('WL: component was undefined:', component);
            this._components[component] = new Component(this._engine);
            return;
        }
        if (!c.update) return;
        try {
            c.update(dt);
        } catch (e) {
            console.error(`Exception during ${c.type} update() on object ${c.object.name}`);
            console.error(e);
            if (this._deactivate_component_on_error) c.active = false;
        }
    }
    protected _wljs_component_onActivate(component: number) {
        const c = this._components[component];
        if (!c || !c.onActivate) return;
        try {
            c.onActivate();
        } catch (e) {
            console.error(
                `Exception during ${c.type} onActivate() on object ${c.object.name}`
            );
            console.error(e);
        }
    }
    protected _wljs_component_onDeactivate(component: number) {
        const c = this._components[component];
        if (!c.onDeactivate) return;
        try {
            c.onDeactivate();
        } catch (e) {
            console.error(
                `Exception during ${c.type} onDeactivate() on object ${c.object.name}`
            );
            console.error(e);
        }
    }
    protected _wljs_component_onDestroy(component: number) {
        const c = this._components[component];
        if (!c.onDestroy) return;
        try {
            c.onDestroy();
        } catch (e) {
            console.error(
                `Exception during ${c.type} onDestroy() on object ${c.object.name}`
            );
            console.error(e);
        }
    }
    protected _wljs_swap(a: number, b: number) {
        const componentA = this._components[a];
        this._components[a] = this._components[b];
        this._components[b] = componentA;
    }
}
