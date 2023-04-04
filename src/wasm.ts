import {WonderlandEngine} from './engine.js';
import {ComponentProperty, Type} from './property.js';
import {
    Animation,
    Object3D,
    Component,
    ComponentConstructor,
    ComponentProto,
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

type XRRequestSessionFunc = (
    mode: XRSessionMode,
    requiredFeatures: string[],
    optionalFeatures: string[]
) => Promise<XRSession>;

/**
 * Default component parameter value per type.
 */
const _componentDefaults = new Map<Type, any>([
    [Type.Bool, false],
    [Type.Int, 0],
    [Type.Float, 0.0],
    [Type.String, ''],
    [Type.Enum, undefined],
    [Type.Object, null],
    [Type.Mesh, null],
    [Type.Texture, null],
    [Type.Material, null],
    [Type.Animation, null],
    [Type.Skin, null],
    [Type.Color, [0.0, 0.0, 0.0, 1.0]],
]);

/**
 * Setup the defaults value of the properties on a given
 * component class.
 *
 * @param ctor The component class
 */
function _setupDefaults(ctor: ComponentConstructor) {
    for (const name in ctor.Properties) {
        const p = ctor.Properties[name];
        /* Convert enum default string to an index. We need to check if it's
         * already been converted so we don't try to look up the index. */
        if (p.type === Type.Enum && typeof p.default !== 'number') {
            /* Matches the editor behavior for packaged components. Default
             * value is a string, but is converted to an index. If there is no
             * default string, it becomes index 0. */
            if (p.values?.length) {
                p.default = Math.max(p.values.indexOf(p.default), 0);
            } else {
                p.default = undefined;
            }
        } else {
            p.default = p.default ?? _componentDefaults.get(p.type);
        }
        ctor.prototype[name] = p.default;
    }
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
    readonly worker: string = '';

    /**
     * Emscripten wasm field.
     *
     * @note This api is meant to be used internally.
     */
    readonly wasm: ArrayBuffer = null!;

    /** Current WebXR  */

    /**
     * Emscripten WebXR session.
     *
     * @note This api is meant to be used internally.
     */
    readonly webxr_session: XRSession | null = null;

    /**
     * Emscripten WebXR request session callback.
     *
     * @note This api is meant to be used internally.
     */
    readonly webxr_request_session_func: XRRequestSessionFunc = null!;

    /**
     * Emscripten WebXR frame.
     *
     * @note This api is meant to be used internally.
     */
    readonly webxr_frame: XRFrame | null = null;

    /**
     * Emscripten WebXR GL projection layer.
     *
     * @note This api is meant to be used internally.
     */
    readonly webxr_baseLayer: XRProjectionLayer | null = null;

    /**
     * Emscripten WebXR framebuffer(s).
     *
     * @note This api is meant to be used internally.
     */
    readonly webxr_fbo: number | number[] = -1;

    /**
     * Convert a WASM memory view to a JavaScript string.
     *
     * @param ptr Pointer start
     * @param ptrEnd Pointer end
     * @returns JavaScript string
     */
    UTF8ViewToString: (ptr: number, ptrEnd: number) => string;

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

    /** Loading screen .bin file data */
    _loadingScreen: ArrayBuffer | null = null;

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

    /** Decoder for UTF8 `ArrayBuffer` to JavaScript string. */
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
                return this._utf8Decoder.decode(this.HEAPU8.slice(s, e));
            };
            return;
        }
        this.UTF8ViewToString = (s: number, e: number) => {
            if (!s) return '';
            return this._utf8Decoder.decode(this.HEAPU8.subarray(s, e));
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
     * Checks whether the given component is registered or not.
     *
     * @param ctor  A string representing the component typename (e.g., `'cursor-component'`).
     * @returns `true` if the component is registered, `false` otherwise.
     */
    isRegistered(type: string) {
        return type in this._componentTypeIndices;
    }

    /**
     * Register a legacy component in this Emscripten instance.
     *
     * @note This api is meant to be used internally.
     *
     * @param typeName The name of the component.
     * @param params An object containing the parameters (properties).
     * @param object The object's prototype.
     * @returns The registration index
     */
    _registerComponentLegacy(
        typeName: string,
        params: {[key: string]: ComponentProperty},
        object: ComponentProto
    ) {
        const ctor = class CustomComponent extends Component {};
        ctor.TypeName = typeName;
        ctor.Properties = params;
        Object.assign(ctor.prototype, object);
        return this._registerComponent(ctor);
    }

    /**
     * Register a class component in this Emscripten instance.
     *
     * @note This api is meant to be used internally.
     *
     * @param ctor The class to register.
     * @param recursive If `true`, automatically registers dependencies.
     * @returns The registration index.
     */
    _registerComponent(ctor: ComponentConstructor, recursive = false) {
        if (!ctor.TypeName) throw new Error('no name provided for component.');

        const dependencies = ctor.Dependencies;
        if (recursive && dependencies) {
            for (const dependency of dependencies) {
                /* For dependencies, we skip potential over-registration. */
                if (!this.isRegistered(dependency.TypeName)) {
                    this._registerComponent(dependency, recursive);
                }
            }
        }

        _setupDefaults(ctor);

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
        if (this._tempMem) this._free(this._tempMem);
        this._tempMem = this._malloc(this._tempMemSize);
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
            this.HEAP8.buffer,
            this._tempMem,
            this._tempMemSize >> 2
        );
        this._tempMemInt = new Int32Array(
            this.HEAP8.buffer,
            this._tempMem,
            this._tempMemSize >> 2
        );
        this._tempMemUint32 = new Uint32Array(
            this.HEAP8.buffer,
            this._tempMem,
            this._tempMemSize >> 2
        );
        this._tempMemUint16 = new Uint16Array(
            this.HEAP8.buffer,
            this._tempMem,
            this._tempMemSize >> 1
        );
        this._tempMemUint8 = new Uint8Array(
            this.HEAP8.buffer,
            this._tempMem,
            this._tempMemSize
        );
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
     * Return the index of the component type.
     *
     * @param type The type
     * @return The component type index
     */
    _typeIndexFor(type: string): number {
        const lengthBytes = this.lengthBytesUTF8(type) + 1;
        const mem = this._malloc(lengthBytes);
        this.stringToUTF8(type, mem, lengthBytes);
        const componentType = this._engine.wasm._wl_get_component_manager_index(mem);
        this._free(mem);

        return componentType;
    }

    /**
     * Return the name of component type stored at the given index.
     *
     * @param typeIndex The type index
     * @return The name as a string
     */
    _typeNameFor(typeIndex: number) {
        return this.UTF8ToString(this._wl_component_manager_name(typeIndex));
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

    protected _wljs_xr_session_start(mode: XRSessionMode) {
        this._engine.onXRSessionStart.notify(this.webxr_session!, mode);
    }
    protected _wljs_xr_disable() {
        /* @todo This could directly be fully handled in JS. */
        (this._engine.arSupported as boolean) = false;
        (this._engine.vrSupported as boolean) = false;
    }
    protected _wljs_allocate(numComponents: number) {
        this._components = new Array(numComponents);
    }
    protected _wljs_init(withPhysX: boolean) {
        this._withPhysX = withPhysX;

        /* Target memory for JS API functions that return arrays */
        this.allocateTempMemory(1024);
    }
    protected _wljs_reallocate(numComponents: number) {
        if (numComponents > this._components.length) {
            this._components.length = numComponents;
        }
    }
    protected _wljs_scene_add_material_definition(definitionId: number) {
        const definition = new Map();
        /* Cache material definition for faster read/write */
        const nbParams = this._wl_material_definition_get_count(definitionId);
        for (let i = 0; i < nbParams; ++i) {
            const name = this.UTF8ToString(
                this._wl_material_definition_get_param_name(definitionId, i)
            );
            const t = this._wl_material_definition_get_param_type(definitionId, i);
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
    protected _wljs_set_component_param_color(c: number, p: number, pe: number, v: number) {
        const param = this.UTF8ViewToString(p, pe);
        (this._components[c] as Record<string, any>)[param] = new Float32Array(
            [0, 8, 16, 24].map((s) => ((v >>> s) & 0xff) / 255.0)
        );
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
            v > 0 ? new Mesh(this._engine, v) : null;
    }
    protected _wljs_set_component_param_texture(
        c: number,
        p: number,
        pe: number,
        v: number
    ) {
        const param = this.UTF8ViewToString(p, pe);
        (this._components[c] as Record<string, any>)[param] =
            v > 0 ? new Texture(this._engine, v) : null;
    }
    protected _wljs_set_component_param_material(
        c: number,
        p: number,
        pe: number,
        v: number
    ) {
        const param = this.UTF8ViewToString(p, pe);
        (this._components[c] as Record<string, any>)[param] =
            v > 0 ? new Material(this._engine, v) : null;
    }
    protected _wljs_set_component_param_animation(
        c: number,
        p: number,
        pe: number,
        v: number
    ) {
        const param = this.UTF8ViewToString(p, pe);
        (this._components[c] as Record<string, any>)[param] =
            v > 0 ? new Animation(this._engine, v) : null;
    }
    protected _wljs_set_component_param_skin(c: number, p: number, pe: number, v: number) {
        const param = this.UTF8ViewToString(p, pe);
        (this._components[c] as Record<string, any>)[param] =
            v > 0 ? new Skin(this._engine, v) : null;
    }
    protected _wljs_get_component_type_index(namePtr: number, nameEndPtr: number) {
        return this._componentTypeIndices[this.UTF8ViewToString(namePtr, nameEndPtr)];
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
        (component._object as Object3D) = this._engine.wrapObject(object);
        this._components[index] = component;
        return component;
    }
    _wljs_component_init(component: number) {
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

    /* JS to WebAssembly bridge. */

    HEAP8: Int8Array = null!;
    HEAPU8: Uint8Array = null!;
    HEAPU16: Uint16Array = null!;
    HEAPU32: Uint32Array = null!;
    HEAP32: Int32Array = null!;
    HEAPF32: Float32Array = null!;

    GL: {
        framebuffers: WebGLFramebuffer[];
    } = null!;

    assert: (condition: boolean, msg?: string) => void = null!;
    _free: (ptr: number) => void = null!;
    _malloc: (size: number) => number = null!;
    lengthBytesUTF8: (str: string) => number = null!;
    stringToUTF8: (str: string, outPtr: number, len: number) => void = null!;
    UTF8ToString: (ptr: number) => string = null!;
    addFunction: (func: Function, sig: string) => number = null!;

    _wl_set_error_callback: (cbPtr: number) => void = null!;
    _wl_application_start: () => void = null!;
    _wl_scene_get_active_views: (ptr: number, count: number) => number = null!;
    _wl_scene_ray_cast: (
        x: number,
        y: number,
        z: number,
        dx: number,
        dy: number,
        dz: number,
        group: number,
        outPtr: number
    ) => void = null!;
    _wl_scene_add_object: (parentId: number) => number = null!;
    _wl_scene_add_objects: (
        parentId: number,
        count: number,
        componentCountHint: number,
        ptr: number,
        size: number
    ) => number = null!;
    _wl_scene_reserve_objects: (objectCount: number, _tempMem: number) => void = null!;
    _wl_scene_set_clearColor: (r: number, g: number, b: number, a: number) => void = null!;
    _wl_scene_enableColorClear: (b: boolean) => void = null!;
    _wl_load_scene: (ptr: number) => void = null!;
    _wl_append_scene: (ptr: number, loadGltfExtensions: boolean, callback: number) => void =
        null!;
    _wl_scene_reset: () => void = null!;
    _wl_component_get_object: (manager: number, id: number) => number = null!;
    _wl_component_setActive: (manager: number, id: number, active: boolean) => void = null!;
    _wl_component_isActive: (manager: number, id: number) => number = null!;
    _wl_component_remove: (manager: number, id: number) => void = null!;
    _wl_collision_component_get_collider: (id: number) => number = null!;
    _wl_collision_component_set_collider: (id: number, collider: number) => void = null!;
    _wl_collision_component_get_extents: (id: number) => number = null!;
    _wl_collision_component_get_group: (id: number) => number = null!;
    _wl_collision_component_set_group: (id: number, group: number) => void = null!;
    _wl_collision_component_query_overlaps: (
        id: number,
        outPtr: number,
        outCount: number
    ) => number = null!;
    _wl_text_component_get_horizontal_alignment: (id: number) => number = null!;
    _wl_text_component_set_horizontal_alignment: (id: number, alignment: number) => void =
        null!;
    _wl_text_component_get_vertical_alignment: (id: number) => number = null!;
    _wl_text_component_set_vertical_alignment: (id: number, justification: number) => void =
        null!;
    _wl_text_component_get_character_spacing: (id: number) => number = null!;
    _wl_text_component_set_character_spacing: (id: number, spacing: number) => void = null!;
    _wl_text_component_get_line_spacing: (id: number) => number = null!;
    _wl_text_component_set_line_spacing: (id: number, spacing: number) => void = null!;
    _wl_text_component_get_effect: (id: number) => number = null!;
    _wl_text_component_set_effect: (id: number, spacing: number) => void = null!;
    _wl_text_component_get_text: (id: number) => number = null!;
    _wl_text_component_set_text: (id: number, ptr: number) => void = null!;
    _wl_text_component_set_material: (id: number, materialId: number) => void = null!;
    _wl_text_component_get_material: (id: number) => number = null!;
    _wl_view_component_get_projection_matrix: (id: number) => number = null!;
    _wl_view_component_get_near: (id: number) => number = null!;
    _wl_view_component_set_near: (id: number, near: number) => void = null!;
    _wl_view_component_get_far: (id: number) => number = null!;
    _wl_view_component_set_far: (id: number, far: number) => void = null!;
    _wl_view_component_get_fov: (id: number) => number = null!;
    _wl_view_component_set_fov: (id: number, fov: number) => void = null!;
    _wl_input_component_get_type: (id: number) => number = null!;
    _wl_input_component_set_type: (id: number, type: number) => void = null!;
    _wl_light_component_get_color: (id: number) => number = null!;
    _wl_light_component_get_type: (id: number) => number = null!;
    _wl_light_component_set_type: (id: number, type: number) => void = null!;
    _wl_animation_component_get_animation: (id: number) => number = null!;
    _wl_animation_component_set_animation: (id: number, animId: number) => void = null!;
    _wl_animation_component_get_playCount: (id: number) => number = null!;
    _wl_animation_component_set_playCount: (id: number, count: number) => void = null!;
    _wl_animation_component_get_speed: (id: number) => number = null!;
    _wl_animation_component_set_speed: (id: number, speed: number) => void = null!;
    _wl_animation_component_play: (id: number) => void = null!;
    _wl_animation_component_stop: (id: number) => void = null!;
    _wl_animation_component_pause: (id: number) => void = null!;
    _wl_animation_component_state: (id: number) => number = null!;
    _wl_mesh_component_get_material: (id: number) => number = null!;
    _wl_mesh_component_set_material: (id: number, materialId: number) => void = null!;
    _wl_mesh_component_get_mesh: (id: number) => number = null!;
    _wl_mesh_component_set_mesh: (id: number, meshId: number) => void = null!;
    _wl_mesh_component_get_skin: (id: number) => number = null!;
    _wl_mesh_component_set_skin: (id: number, skinId: number) => void = null!;
    _wl_physx_component_get_static: (id: number) => number = null!;
    _wl_physx_component_set_static: (id: number, flag: boolean) => void = null!;
    _wl_physx_component_get_kinematic: (id: number) => number = null!;
    _wl_physx_component_set_kinematic: (id: number, kinematic: boolean) => void = null!;
    _wl_physx_component_get_gravity: (id: number) => number = null!;
    _wl_physx_component_set_gravity: (id: number, gravity: boolean) => void = null!;
    _wl_physx_component_get_simulate: (id: number) => number = null!;
    _wl_physx_component_set_simulate: (id: number, simulation: boolean) => void = null!;
    _wl_physx_component_get_allowSimulation: (id: number) => number = null!;
    _wl_physx_component_set_allowSimulation: (
        id: number,
        allowSimulation: boolean
    ) => void = null!;
    _wl_physx_component_get_allowQuery: (id: number) => number = null!;
    _wl_physx_component_set_allowQuery: (id: number, allowQuery: boolean) => void = null!;
    _wl_physx_component_get_trigger: (id: number) => number = null!;
    _wl_physx_component_set_trigger: (id: number, trigger: boolean) => void = null!;
    _wl_physx_component_get_shape: (id: number) => number = null!;
    _wl_physx_component_set_shape: (id: number, shape: number) => void = null!;
    _wl_physx_component_get_shape_data: (id: number) => number = null!;
    _wl_physx_component_set_shape_data: (id: number, shapeIndex: number) => void = null!;
    _wl_physx_component_get_extents: (id: number) => number = null!;
    _wl_physx_component_get_staticFriction: (id: number) => number = null!;
    _wl_physx_component_set_staticFriction: (id: number, value: number) => void = null!;
    _wl_physx_component_get_dynamicFriction: (id: number) => number = null!;
    _wl_physx_component_set_dynamicFriction: (id: number, value: number) => void = null!;
    _wl_physx_component_get_bounciness: (id: number) => number = null!;
    _wl_physx_component_set_bounciness: (id: number, value: number) => void = null!;
    _wl_physx_component_get_linearDamping: (id: number) => number = null!;
    _wl_physx_component_set_linearDamping: (id: number, value: number) => void = null!;
    _wl_physx_component_get_angularDamping: (id: number) => number = null!;
    _wl_physx_component_set_angularDamping: (id: number, value: number) => void = null!;
    _wl_physx_component_get_linearVelocity: (id: number, ptr: number) => number = null!;
    _wl_physx_component_set_linearVelocity: (
        id: number,
        x: number,
        y: number,
        z: number
    ) => void = null!;
    _wl_physx_component_get_angularVelocity: (id: number, ptr: number) => number = null!;
    _wl_physx_component_set_angularVelocity: (
        id: number,
        x: number,
        y: number,
        z: number
    ) => void = null!;
    _wl_physx_component_get_groupsMask: (id: number) => number = null!;
    _wl_physx_component_set_groupsMask: (id: number, flags: number) => void = null!;
    _wl_physx_component_get_blocksMask: (id: number) => number = null!;
    _wl_physx_component_set_blocksMask: (id: number, flags: number) => void = null!;
    _wl_physx_component_get_linearLockAxis: (id: number) => number = null!;
    _wl_physx_component_set_linearLockAxis: (id: number, lock: number) => void = null!;
    _wl_physx_component_get_angularLockAxis: (id: number) => number = null!;
    _wl_physx_component_set_angularLockAxis: (id: number, lock: number) => void = null!;
    _wl_physx_component_get_mass: (id: number) => number = null!;
    _wl_physx_component_set_mass: (id: number, value: number) => void = null!;
    _wl_physx_component_set_massSpaceInertiaTensor: (
        id: number,
        x: number,
        y: number,
        z: number
    ) => void = null!;
    _wl_physx_component_addForce: (
        id: number,
        x: number,
        y: number,
        z: number,
        mode: number,
        localForce: boolean
    ) => void = null!;
    _wl_physx_component_addForceAt: (
        id: number,
        x: number,
        y: number,
        z: number,
        mode: number,
        localForce: boolean,
        posX: number,
        posY: number,
        posZ: number,
        local: boolean
    ) => void = null!;
    _wl_physx_component_addTorque: (
        id: number,
        x: number,
        y: number,
        z: number,
        mode: number
    ) => void = null!;
    _wl_physx_component_addCallback: (id: number, otherId: number) => number = null!;
    _wl_physx_component_removeCallback: (id: number, callbackId: number) => number = null!;
    _wl_physx_update: (delta: number) => void = null!;
    _wl_physx_update_global_pose: (object: number, component: number) => void = null!;
    _wl_physx_ray_cast: (
        x: number,
        y: number,
        z: number,
        dx: number,
        dy: number,
        dz: number,
        group: number,
        maxDistance: number,
        outPtr: number
    ) => void = null!;
    _wl_physx_set_collision_callback: (callback: number) => void = null!;
    _wl_mesh_create: (
        indicesPtr: number,
        indicesSize: number,
        indexType: number,
        vertexCount: number,
        skinned: boolean
    ) => number = null!;
    _wl_mesh_get_vertexData: (id: number, outPtr: number) => number = null!;
    _wl_mesh_get_vertexCount: (id: number) => number = null!;
    _wl_mesh_get_indexData: (id: number, outPtr: number, count: number) => number = null!;
    _wl_mesh_update: (id: number) => void = null!;
    _wl_mesh_get_boundingSphere: (id: number, outPtr: number) => void = null!;
    _wl_mesh_get_attribute: (id: number, attribute: number, outPtr: number) => void = null!;
    _wl_mesh_destroy: (id: number) => void = null!;
    _wl_mesh_get_attribute_values: (
        attribute: number,
        srcFormatSize: number,
        srcPtr: number,
        srcStride: number,
        dstFormatSize: number,
        destPtr: number,
        dstSize: number
    ) => void = null!;
    _wl_mesh_set_attribute_values: (
        attribute: number,
        srcFormatSize: number,
        srcPtr: number,
        srcSize: number,
        dstFormatSize: number,
        destPtr: number,
        destStride: number
    ) => void = null!;
    _wl_material_create: (ptr: number) => number = null!;
    _wl_material_get_definition: (id: number) => number = null!;
    _wl_material_definition_get_count: (id: number) => number = null!;
    _wl_material_definition_get_param_name: (id: number, index: number) => number = null!;
    _wl_material_definition_get_param_type: (id: number, index: number) => number = null!;
    /** @deprecated */
    _wl_material_get_shader: (id: number) => number = null!;
    _wl_material_get_pipeline: (id: number) => number = null!;
    _wl_material_clone: (id: number) => number = null!;
    _wl_material_get_param_index: (id: number, namePtr: number) => number = null!;
    _wl_material_get_param_type: (id: number, paramId: number) => number = null!;
    _wl_material_get_param_value: (id: number, paramId: number, outPtr: number) => number =
        null!;
    _wl_material_set_param_value_uint: (
        id: number,
        paramId: number,
        valueId: number
    ) => void = null!;
    _wl_material_set_param_value_float: (
        id: number,
        paramId: number,
        ptr: number,
        count: number
    ) => void = null!;
    _wl_renderer_addImage: (id: number) => number = null!;
    _wl_texture_width: (id: number) => number = null!;
    _wl_texture_height: (id: number) => number = null!;
    _wl_renderer_updateImage: (
        id: number,
        imageIndex: number,
        xOffset?: number,
        yOffset?: number
    ) => void = null!;
    _wl_texture_destroy: (id: number) => void = null!;
    _wl_animation_get_duration: (id: number) => number = null!;
    _wl_animation_get_trackCount: (id: number) => number = null!;
    _wl_animation_retargetToSkin: (id: number, targetId: number) => number = null!;
    _wl_animation_retarget: (id: number, ptr: number) => number = null!;
    _wl_object_name: (id: number) => number = null!;
    _wl_object_set_name: (id: number, ptr: number) => void = null!;
    _wl_object_parent: (id: number) => number = null!;
    _wl_object_get_children_count: (id: number) => number = null!;
    _wl_object_get_children: (id: number, outPtr: number, count: number) => number = null!;
    _wl_object_set_parent: (id: number, parentId: number) => void = null!;
    _wl_object_reset_scaling: (id: number) => void = null!;
    _wl_object_reset_translation_rotation: (id: number) => void = null!;
    _wl_object_reset_rotation: (id: number) => void = null!;
    _wl_object_reset_translation: (id: number) => void = null!;
    _wl_object_translate: (id: number, x: number, y: number, z: number) => void = null!;
    _wl_object_translate_obj: (id: number, x: number, y: number, z: number) => void = null!;
    _wl_object_translate_world: (id: number, x: number, y: number, z: number) => void =
        null!;
    _wl_object_rotate_axis_angle: (
        id: number,
        x: number,
        y: number,
        z: number,
        deg: number
    ) => void = null!;
    _wl_object_rotate_axis_angle_rad: (
        id: number,
        x: number,
        y: number,
        z: number,
        rad: number
    ) => void = null!;
    _wl_object_rotate_axis_angle_obj: (
        id: number,
        x: number,
        y: number,
        z: number,
        deg: number
    ) => void = null!;
    _wl_object_rotate_axis_angle_rad_obj: (
        id: number,
        x: number,
        y: number,
        z: number,
        rad: number
    ) => void = null!;
    _wl_object_rotate_quat: (
        id: number,
        x: number,
        y: number,
        z: number,
        w: number
    ) => void = null!;
    _wl_object_rotate_quat_obj: (
        id: number,
        x: number,
        y: number,
        z: number,
        w: number
    ) => void = null!;
    _wl_object_scale: (id: number, x: number, y: number, z: number) => void = null!;
    _wl_object_trans_local: (id: number) => number = null!;
    _wl_object_get_translation_local: (id: number, outPtr: number) => void = null!;
    _wl_object_set_translation_local: (
        id: number,
        x: number,
        y: number,
        z: number
    ) => void = null!;
    _wl_object_get_translation_world: (id: number, outPtr: number) => void = null!;
    _wl_object_set_translation_world: (
        id: number,
        x: number,
        y: number,
        z: number
    ) => void = null!;
    _wl_object_trans_world: (id: number) => number = null!;
    _wl_object_trans_world_to_local: (id: number) => number = null!;
    _wl_object_scaling_local: (id: number) => number = null!;
    _wl_object_scaling_world: (id: number) => number = null!;
    _wl_object_scaling_world_to_local: (id: number) => number = null!;
    _wl_object_set_rotation_local: (
        id: number,
        x: number,
        y: number,
        z: number,
        w: number
    ) => void = null!;
    _wl_object_set_rotation_world: (
        id: number,
        x: number,
        y: number,
        z: number,
        w: number
    ) => void = null!;
    _wl_object_transformVectorWorld: (id: number, ptr: number) => number = null!;
    _wl_object_transformVectorLocal: (id: number, ptr: number) => number = null!;
    _wl_object_transformPointWorld: (id: number, ptr: number) => number = null!;
    _wl_object_transformPointLocal: (id: number, ptr: number) => number = null!;
    _wl_object_transformVectorInverseWorld: (id: number, ptr: number) => number = null!;
    _wl_object_transformVectorInverseLocal: (id: number, ptr: number) => number = null!;
    _wl_object_transformPointInverseWorld: (id: number, ptr: number) => number = null!;
    _wl_object_transformPointInverseLocal: (id: number, ptr: number) => number = null!;
    _wl_object_toWorldSpaceTransform: (id: number, ptr: number) => number = null!;
    _wl_object_toObjectSpaceTransform: (id: number, ptr: number) => number = null!;
    _wl_object_lookAt: (
        id: number,
        x: number,
        y: number,
        z: number,
        upX: number,
        upY: number,
        upZ: number
    ) => void = null!;
    _wl_scene_remove_object: (id: number) => void = null!;
    _wl_object_set_dirty: (id: number) => void = null!;
    _wl_get_component_manager_index: (ptr: number) => number = null!;
    _wl_get_js_component_index: (id: number, outPtr: number, count: number) => number =
        null!;
    _wl_get_js_component_index_for_id: (id: number) => number = null!;
    _wl_get_component_id: (id: number, managerId: number, index: number) => number = null!;
    _wl_object_get_components: (id: number, outPtr: number, count: number) => number =
        null!;
    _wl_object_get_component_types: (id: number, outPtr: number, count: number) => void =
        null!;
    _wl_object_add_js_component: (id: number, typeId: number) => number = null!;
    _wl_object_add_component: (id: number, typeId: number) => number = null!;
    _wl_object_is_changed: (id: number) => number = null!;
    _wl_component_manager_name: (id: number) => number = null!;
    _wl_skin_get_joint_count: (id: number) => number = null!;
    _wl_skin_joint_ids: (id: number) => number = null!;
    _wl_skin_inverse_bind_transforms: (id: number) => number = null!;
    _wl_skin_inverse_bind_scalings: (id: number) => number = null!;
    _wl_math_cubicHermite: (
        a: number,
        b: number,
        c: number,
        d: number,
        f: number,
        e: number,
        isQuat: boolean
    ) => void = null!;
    _wl_i18n_setLanguage: (ptr: number) => void = null!;
    _wl_i18n_currentLanguage: () => number = null!;
    _wl_i18n_translate: (ptr: number) => number = null!;
    _wl_i18n_languageCount: () => number = null!;
    _wl_i18n_languageIndex: (ptr: number) => number = null!;
    _wl_i18n_languageCode: (index: number) => number = null!;
    _wl_i18n_languageName: (index: number) => number = null!;
}
