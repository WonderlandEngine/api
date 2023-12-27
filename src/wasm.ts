import {LogTag} from './index.js';
import {WonderlandEngine} from './engine.js';
import {ComponentProperty, Type} from './property.js';
import {RetainEmitter} from './utils/event.js';
import {Logger} from './utils/logger.js';
import {
    inheritProperties,
    Animation,
    Component,
    ComponentConstructor,
    ComponentProto,
    ImageLike,
    Material,
    Mesh,
    BrokenComponent,
    Skin,
    XR,
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

type XRRequestSessionFunction = (
    mode: XRSessionMode,
    features: string[],
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
        if (p.type === Type.Enum) {
            /* Enum default can be a string or an index. Convert to and/or
             * sanity-check the index. */
            if (p.values?.length) {
                /* Don't try to look up the default if the user specified a
                 * number or we already converted to one. */
                if (typeof p.default !== 'number') {
                    /* If undefined, missing element or wrong type this returns
                     * -1 which becomes 0 below. This matches editor behavior. */
                    p.default = p.values.indexOf(p.default);
                }
                if (p.default < 0 || p.default >= p.values.length) {
                    p.default = 0;
                }
            } else {
                /* There's no index value that makes sense */
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

    /**
     * Emscripten canvas.
     *
     * @note This api is meant to be used internally.
     */
    readonly canvas: HTMLCanvasElement = null!;

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
    readonly webxr_requestSession: XRRequestSessionFunction = null!;

    /**
     * Emscripten WebXR offer session callback.
     *
     * @note This api is meant to be used internally.
     */
    readonly webxr_offerSession: XRRequestSessionFunction = null!;

    /**
     * Emscripten WebXR frame.
     *
     * @note This api is meant to be used internally.
     */
    readonly webxr_frame: XRFrame | null = null;

    /**
     * Emscripten current WebXR reference space.
     *
     * @note This api is meant to be used internally.
     */
    webxr_refSpace: XRReferenceSpace | null = null;

    /**
     * Emscripten WebXR reference spaces.
     *
     * @note This api is meant to be used internally.
     */
    readonly webxr_refSpaces: Record<
        XRReferenceSpaceType,
        XRReferenceSpace | undefined
    > | null = null;

    /**
     * Emscripten WebXR current reference space type.
     *
     * @note This api is meant to be used internally.
     */
    webxr_refSpaceType: XRReferenceSpaceType | null = null;

    /**
     * Emscripten WebXR GL projection layer.
     *
     * @note This api is meant to be used internally.
     */
    readonly webxr_baseLayer: XRProjectionLayer | null = null;

    /**
     * Emscripten WebXR framebuffer scale factor.
     *
     * @note This api is meant to be used internally.
     */
    webxr_framebufferScaleFactor: number = 1.0;

    /**
     * Emscripten WebXR framebuffer(s).
     *
     * @note This api is meant to be used internally.
     */
    /* webxr_fbo will not get overwritten if we are rendering to the
     * default framebuffer, e.g., when using WebXR emulator. */
    readonly webxr_fbo: number | number[] = 0;

    /**
     * Convert a WASM memory view to a JavaScript string.
     *
     * @param ptr Pointer start
     * @param ptrEnd Pointer end
     * @returns JavaScript string
     */
    UTF8ViewToString: (ptr: number, ptrEnd: number) => string;

    /** Logger instance. */
    readonly _log: Logger = new Logger();

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
    _images: (ImageLike | null)[] = [];

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

    /** JavaScript manager index. */
    _jsManagerIndexCached: number | null = null;

    /**
     * Registration index of {@link BrokenComponent}.
     *
     * This is used to return dummy instances when a component
     * isn't registered.
     *
     * @hidden
     */
    private readonly _brokenComponentIndex = 0;

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

        (this._brokenComponentIndex as number) = this._registerComponent(BrokenComponent);
    }

    /**
     * Reset the cache of the library.
     *
     * @note Should only be called when tearing down the runtime.
     */
    reset() {
        /* Cancel in-flight images */
        for (const img of this._images) {
            if (!img || !(img as HTMLImageElement).src) continue;
            (img as HTMLImageElement).src = '';
            img.onload = null;
            img.onerror = null;
        }
        this._images = [];
        this.allocateTempMemory(1024);
        this._materialDefinitions = [];
        this._components = [];
        this._componentTypes = [];
        this._componentTypeIndices = {};
        this._jsManagerIndexCached = null;
        (this._brokenComponentIndex as number) = this._registerComponent(BrokenComponent);
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
        params: Record<string, ComponentProperty>,
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
     * @returns The registration index.
     */
    _registerComponent(ctor: ComponentConstructor) {
        if (!ctor.TypeName) throw new Error('no name provided for component.');
        if (!ctor.prototype._triggerInit) {
            throw new Error(
                `registerComponent(): Component ${ctor.TypeName} must extend Component`
            );
        }

        inheritProperties(ctor);
        _setupDefaults(ctor);

        const typeIndex =
            ctor.TypeName in this._componentTypeIndices
                ? this._componentTypeIndices[ctor.TypeName]
                : this._componentTypes.length;
        this._componentTypes[typeIndex] = ctor;
        this._componentTypeIndices[ctor.TypeName] = typeIndex;

        if (ctor === BrokenComponent) return typeIndex;

        this._log.info(
            LogTag.Engine,
            'Registered component',
            ctor.TypeName,
            `(class ${ctor.name})`,
            'with index',
            typeIndex
        );

        if (ctor.onRegister) ctor.onRegister(this._engine);

        return typeIndex;
    }

    /**
     * Allocate the requested amount of temporary memory
     * in this WASM instance.
     *
     * @param size The number of bytes to allocate
     */
    allocateTempMemory(size: number) {
        this._log.info(LogTag.Engine, 'Allocating temp mem:', size);
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
     * Copy the string into temporary WASM memory and retrieve the pointer.
     *
     * @note This method will compute the strlen and append a `\0`.
     *
     * @note The result should be used **directly** otherwise it might get
     * overridden by any next call modifying the temporary memory.
     *
     * @param str The string to write to temporary memory
     * @param byteOffset The starting byte offset in the temporary memory at which
     *     the string should be written. This is useful when using multiple temporaries.
     * @return The temporary pointer onto the WASM memory
     */
    tempUTF8(str: string, byteOffset = 0): number {
        const strLen = this.lengthBytesUTF8(str) + 1;
        this.requireTempMem(strLen + byteOffset);
        const ptr = this._tempMem + byteOffset;
        this.stringToUTF8(str, ptr, strLen);
        return ptr;
    }

    /**
     * Return the index of the component type.
     *
     * @note This method uses malloc and copies the string
     * to avoid overwriting caller's temporary data.
     *
     * @param type The type
     * @return The component type index
     */
    _typeIndexFor(type: string): number {
        const lengthBytes = this.lengthBytesUTF8(type) + 1;
        const mem = this._malloc(lengthBytes);
        this.stringToUTF8(type, mem, lengthBytes);
        const componentType = this._wl_get_component_manager_index(mem);
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

    /** JavaScript manager index. */
    get _jsManagerIndex(): number {
        if (this._jsManagerIndexCached === null) {
            this._jsManagerIndexCached = this._typeIndexFor('js');
        }
        return this._jsManagerIndexCached;
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
        if (this._engine.xr === null) {
            (this._engine.xr as XR | null) = new XR(this, mode);
            this._engine.onXRSessionStart.notify(this.webxr_session!, mode);
        }
    }
    protected _wljs_xr_session_end() {
        const startEmitter = this._engine.onXRSessionStart;
        if (startEmitter instanceof RetainEmitter) startEmitter.reset();
        this._engine.onXRSessionEnd.notify();
        (this._engine.xr as null) = null;
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
        const definition: Map<string, MaterialDefinition> = new Map();
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
            v > 0 ? this._engine.textures.wrap(v) : null;
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
        const typename = this.UTF8ViewToString(namePtr, nameEndPtr);
        const index = this._componentTypeIndices[typename];
        if (index === undefined) {
            return this._brokenComponentIndex;
        }
        return index;
    }
    protected _wljs_component_create(
        jsManagerIndex: number,
        index: number,
        id: number,
        type: number,
        object: number
    ) {
        const ctor = this._componentTypes[type];
        if (!ctor) {
            throw new Error(`Type index ${type} isn't registered`);
        }

        let component = null;
        try {
            component = new ctor();
        } catch (e) {
            this._log.error(
                LogTag.Component,
                `Exception during instantiation of component ${ctor.TypeName}`
            );
            this._log.error(LogTag.Component, e);
            component = new BrokenComponent(this._engine);
        }
        /* Sets the manager and identifier from the outside, to simplify the user's constructor. */
        /* @ts-ignore */
        component._engine = this._engine;
        (component._manager as number) = jsManagerIndex;
        (component._id as number) = id;
        component._object = this._engine.wrapObject(object);

        try {
            component.resetProperties();
        } catch (e) {
            this._log.error(
                LogTag.Component,
                `Exception during ${component.type} resetProperties() on object ${component.object.name}`
            );
            this._log.error(LogTag.Component, e);
        }

        this._components[index] = component;
        return component;
    }
    _wljs_component_init(component: number) {
        const c = this._components[component];
        c._triggerInit();
    }
    protected _wljs_component_update(component: number, dt: number) {
        const c = this._components[component];
        c._triggerUpdate(dt);
    }
    protected _wljs_component_onActivate(component: number) {
        const c = this._components[component];
        if (c) c._triggerOnActivate();
    }
    protected _wljs_component_onDeactivate(component: number) {
        const c = this._components[component];
        c._triggerOnDeactivate();
    }
    protected _wljs_component_onDestroy(component: number) {
        const c = this._components[component];
        c._triggerOnDestroy();
    }
    protected _wljs_swap(a: number, b: number) {
        const componentA = this._components[a];
        this._components[a] = this._components[b];
        this._components[b] = componentA;
    }
    protected _wljs_copy(src: number, dst: number) {
        const destComp = this._components[dst];
        try {
            destComp.copy(this._components[src]);
        } catch (e) {
            this._log.error(
                LogTag.Component,
                `Exception during ${destComp.type} copy() on object ${destComp.object.name}`
            );
            this._log.error(LogTag.Component, e);
        }
    }
}

/* Extends the WASM class with the WebAssembly typings */

export interface WASM {
    HEAP8: Int8Array;
    HEAPU8: Uint8Array;
    HEAPU16: Uint16Array;
    HEAP16: Int16Array;
    HEAPU32: Uint32Array;
    HEAP32: Int32Array;
    HEAPF32: Float32Array;
    HEAPF64: Float64Array;

    GL: {
        framebuffers: WebGLFramebuffer[];
    };

    assert: (condition: boolean, msg?: string) => void;
    _free: (ptr: number) => void;
    _malloc: (size: number) => number;
    lengthBytesUTF8: (str: string) => number;
    stringToUTF8: (str: string, outPtr: number, len: number) => void;
    UTF8ToString: (ptr: number) => string;
    addFunction: (func: Function, sig: string) => number;
    removeFunction: (ptr: number) => void;

    _wl_set_error_callback: (cbPtr: number) => void;
    _wl_application_version: (out: number) => number;
    _wl_application_start: () => void;
    _wl_application_resize: (width: number, height: number) => void;

    _wl_nextUpdate: (delta: number) => void;
    _wl_nextFrame: (delta: number) => void;

    _wl_renderer_set_mesh_layout: (layout: number) => void;

    _wl_scene_get_active_views: (ptr: number, count: number) => number;
    _wl_scene_ray_cast: (
        x: number,
        y: number,
        z: number,
        dx: number,
        dy: number,
        dz: number,
        group: number,
        maxDistance: number,
        outPtr: number
    ) => void;
    _wl_scene_add_object: (parentId: number) => number;
    _wl_scene_add_objects: (
        parentId: number,
        count: number,
        componentCountHint: number,
        ptr: number,
        size: number
    ) => number;
    _wl_scene_reserve_objects: (objectCount: number, _tempMem: number) => void;
    _wl_scene_set_sky_material: (id: number) => void;
    _wl_scene_get_sky_material: () => number;
    _wl_scene_set_clearColor: (r: number, g: number, b: number, a: number) => void;
    _wl_scene_enableColorClear: (b: boolean) => void;
    _wl_set_loading_screen_progress: (ratio: number) => void;
    _wl_load_scene_bin: (binData: number, binSize: number, scenePath: number) => void;
    _wl_append_scene_bin: (binData: number, binSize: number, callback: number) => void;
    _wl_append_scene_gltf: (
        gltfData: number,
        gltfSize: number,
        loadExtensions: boolean,
        callback: number
    ) => void;
    _wl_scene_queued_bin_count: () => number;
    _wl_scene_queued_bin_path: (index: number) => number;
    _wl_scene_clear_queued_bin_list: () => void;
    _wl_scene_reset: () => void;
    _wl_component_get_object: (manager: number, id: number) => number;
    _wl_component_setActive: (manager: number, id: number, active: boolean) => void;
    _wl_component_isActive: (manager: number, id: number) => number;
    _wl_component_remove: (manager: number, id: number) => void;
    _wl_collision_component_get_collider: (id: number) => number;
    _wl_collision_component_set_collider: (id: number, collider: number) => void;
    _wl_collision_component_get_extents: (id: number) => number;
    _wl_collision_component_get_group: (id: number) => number;
    _wl_collision_component_set_group: (id: number, group: number) => void;
    _wl_collision_component_query_overlaps: (
        id: number,
        outPtr: number,
        outCount: number
    ) => number;
    _wl_text_component_get_horizontal_alignment: (id: number) => number;
    _wl_text_component_set_horizontal_alignment: (id: number, alignment: number) => void;
    _wl_text_component_get_vertical_alignment: (id: number) => number;
    _wl_text_component_set_vertical_alignment: (id: number, justification: number) => void;
    _wl_text_component_get_character_spacing: (id: number) => number;
    _wl_text_component_set_character_spacing: (id: number, spacing: number) => void;
    _wl_text_component_get_line_spacing: (id: number) => number;
    _wl_text_component_set_line_spacing: (id: number, spacing: number) => void;
    _wl_text_component_get_effect: (id: number) => number;
    _wl_text_component_set_effect: (id: number, spacing: number) => void;
    _wl_text_component_get_text: (id: number) => number;
    _wl_text_component_set_text: (id: number, ptr: number) => void;
    _wl_text_component_set_material: (id: number, materialId: number) => void;
    _wl_text_component_get_material: (id: number) => number;
    _wl_view_component_get_projection_matrix: (id: number) => number;
    _wl_view_component_get_near: (id: number) => number;
    _wl_view_component_set_near: (id: number, near: number) => void;
    _wl_view_component_get_far: (id: number) => number;
    _wl_view_component_set_far: (id: number, far: number) => void;
    _wl_view_component_get_fov: (id: number) => number;
    _wl_view_component_set_fov: (id: number, fov: number) => void;
    _wl_input_component_get_type: (id: number) => number;
    _wl_input_component_set_type: (id: number, type: number) => void;
    _wl_light_component_get_color: (id: number) => number;
    _wl_light_component_get_type: (id: number) => number;
    _wl_light_component_set_type: (id: number, type: number) => void;
    _wl_light_component_get_intensity: (id: number) => number;
    _wl_light_component_set_intensity: (id: number, intensity: number) => void;
    _wl_light_component_get_outerAngle: (id: number) => number;
    _wl_light_component_set_outerAngle: (id: number, angle: number) => void;
    _wl_light_component_get_innerAngle: (id: number) => number;
    _wl_light_component_set_innerAngle: (id: number, angle: number) => void;
    _wl_light_component_get_shadows: (id: number) => number;
    _wl_light_component_set_shadows: (id: number, shadows: boolean) => void;
    _wl_light_component_get_shadowRange: (id: number) => number;
    _wl_light_component_set_shadowRange: (id: number, range: number) => void;
    _wl_light_component_get_shadowBias: (id: number) => number;
    _wl_light_component_set_shadowBias: (id: number, bias: number) => void;
    _wl_light_component_get_shadowNormalBias: (id: number) => number;
    _wl_light_component_set_shadowNormalBias: (id: number, bias: number) => void;
    _wl_light_component_get_shadowTexelSize: (id: number) => number;
    _wl_light_component_set_shadowTexelSize: (id: number, size: number) => void;
    _wl_light_component_get_cascadeCount: (id: number) => number;
    _wl_light_component_set_cascadeCount: (id: number, count: number) => void;
    _wl_animation_component_get_animation: (id: number) => number;
    _wl_animation_component_set_animation: (id: number, animId: number) => void;
    _wl_animation_component_get_playCount: (id: number) => number;
    _wl_animation_component_set_playCount: (id: number, count: number) => void;
    _wl_animation_component_get_speed: (id: number) => number;
    _wl_animation_component_set_speed: (id: number, speed: number) => void;
    _wl_animation_component_play: (id: number) => void;
    _wl_animation_component_stop: (id: number) => void;
    _wl_animation_component_pause: (id: number) => void;
    _wl_animation_component_state: (id: number) => number;
    _wl_mesh_component_get_material: (id: number) => number;
    _wl_mesh_component_set_material: (id: number, materialId: number) => void;
    _wl_mesh_component_get_mesh: (id: number) => number;
    _wl_mesh_component_set_mesh: (id: number, meshId: number) => void;
    _wl_mesh_component_get_skin: (id: number) => number;
    _wl_mesh_component_set_skin: (id: number, skinId: number) => void;
    _wl_physx_component_get_static: (id: number) => number;
    _wl_physx_component_set_static: (id: number, flag: boolean) => void;
    _wl_physx_component_get_kinematic: (id: number) => number;
    _wl_physx_component_set_kinematic: (id: number, kinematic: boolean) => void;
    _wl_physx_component_get_gravity: (id: number) => number;
    _wl_physx_component_set_gravity: (id: number, gravity: boolean) => void;
    _wl_physx_component_get_simulate: (id: number) => number;
    _wl_physx_component_set_simulate: (id: number, simulation: boolean) => void;
    _wl_physx_component_get_allowSimulation: (id: number) => number;
    _wl_physx_component_set_allowSimulation: (id: number, allowSimulation: boolean) => void;
    _wl_physx_component_get_allowQuery: (id: number) => number;
    _wl_physx_component_set_allowQuery: (id: number, allowQuery: boolean) => void;
    _wl_physx_component_get_trigger: (id: number) => number;
    _wl_physx_component_set_trigger: (id: number, trigger: boolean) => void;
    _wl_physx_component_get_shape: (id: number) => number;
    _wl_physx_component_set_shape: (id: number, shape: number) => void;
    _wl_physx_component_get_shape_data: (id: number) => number;
    _wl_physx_component_set_shape_data: (id: number, shapeIndex: number) => void;
    _wl_physx_component_get_extents: (id: number) => number;
    _wl_physx_component_get_staticFriction: (id: number) => number;
    _wl_physx_component_set_staticFriction: (id: number, value: number) => void;
    _wl_physx_component_get_dynamicFriction: (id: number) => number;
    _wl_physx_component_set_dynamicFriction: (id: number, value: number) => void;
    _wl_physx_component_get_bounciness: (id: number) => number;
    _wl_physx_component_set_bounciness: (id: number, value: number) => void;
    _wl_physx_component_get_linearDamping: (id: number) => number;
    _wl_physx_component_set_linearDamping: (id: number, value: number) => void;
    _wl_physx_component_get_angularDamping: (id: number) => number;
    _wl_physx_component_set_angularDamping: (id: number, value: number) => void;
    _wl_physx_component_get_linearVelocity: (id: number, ptr: number) => number;
    _wl_physx_component_set_linearVelocity: (
        id: number,
        x: number,
        y: number,
        z: number
    ) => void;
    _wl_physx_component_get_angularVelocity: (id: number, ptr: number) => number;
    _wl_physx_component_set_angularVelocity: (
        id: number,
        x: number,
        y: number,
        z: number
    ) => void;
    _wl_physx_component_get_groupsMask: (id: number) => number;
    _wl_physx_component_set_groupsMask: (id: number, flags: number) => void;
    _wl_physx_component_get_blocksMask: (id: number) => number;
    _wl_physx_component_set_blocksMask: (id: number, flags: number) => void;
    _wl_physx_component_get_linearLockAxis: (id: number) => number;
    _wl_physx_component_set_linearLockAxis: (id: number, lock: number) => void;
    _wl_physx_component_get_angularLockAxis: (id: number) => number;
    _wl_physx_component_set_angularLockAxis: (id: number, lock: number) => void;
    _wl_physx_component_get_mass: (id: number) => number;
    _wl_physx_component_set_mass: (id: number, value: number) => void;
    _wl_physx_component_get_offsetTranslation: (id: number, out: number) => void;
    _wl_physx_component_get_offsetTransform: (id: number) => number;
    _wl_physx_component_set_offsetTranslation: (
        id: number,
        x: number,
        y: number,
        z: number
    ) => void;
    _wl_physx_component_set_offsetRotation: (
        id: number,
        x: number,
        y: number,
        z: number,
        w: number
    ) => void;
    _wl_physx_component_set_sleepOnActivate: (id: number, flag: boolean) => void;
    _wl_physx_component_get_sleepOnActivate: (id: number) => number;
    _wl_physx_component_set_massSpaceInertiaTensor: (
        id: number,
        x: number,
        y: number,
        z: number
    ) => void;
    _wl_physx_component_addForce: (
        id: number,
        x: number,
        y: number,
        z: number,
        mode: number,
        localForce: boolean
    ) => void;
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
    ) => void;
    _wl_physx_component_addTorque: (
        id: number,
        x: number,
        y: number,
        z: number,
        mode: number
    ) => void;
    _wl_physx_component_addCallback: (id: number, otherId: number) => number;
    _wl_physx_component_removeCallback: (id: number, callbackId: number) => number;
    _wl_physx_update_global_pose: (object: number, component: number) => void;
    _wl_physx_ray_cast: (
        x: number,
        y: number,
        z: number,
        dx: number,
        dy: number,
        dz: number,
        group: number,
        outPtr: number,
        maxDistance: number
    ) => void;
    _wl_physx_set_collision_callback: (callback: number) => void;
    _wl_mesh_create: (
        indicesPtr: number,
        indicesSize: number,
        indexType: number,
        vertexCount: number,
        skinningType: number
    ) => number;
    _wl_mesh_get_vertexData: (id: number, outPtr: number) => number;
    _wl_mesh_get_vertexCount: (id: number) => number;
    _wl_mesh_get_indexData: (id: number, outPtr: number, count: number) => number;
    _wl_mesh_update: (id: number) => void;
    _wl_mesh_get_boundingSphere: (id: number, outPtr: number) => void;
    _wl_mesh_get_attribute: (id: number, attribute: number, outPtr: number) => void;
    _wl_mesh_destroy: (id: number) => void;
    _wl_mesh_get_attribute_values: (
        attribute: number,
        srcFormatSize: number,
        srcPtr: number,
        srcStride: number,
        dstFormatSize: number,
        destPtr: number,
        dstSize: number
    ) => void;
    _wl_mesh_set_attribute_values: (
        attribute: number,
        srcFormatSize: number,
        srcPtr: number,
        srcSize: number,
        dstFormatSize: number,
        destPtr: number,
        destStride: number
    ) => void;
    _wl_material_create: (ptr: number) => number;
    _wl_material_get_definition: (id: number) => number;
    _wl_material_definition_get_count: (id: number) => number;
    _wl_material_definition_get_param_name: (id: number, index: number) => number;
    _wl_material_definition_get_param_type: (id: number, index: number) => number;
    _wl_material_get_pipeline: (id: number) => number;
    _wl_material_clone: (id: number) => number;
    _wl_material_get_param_index: (id: number, namePtr: number) => number;
    _wl_material_get_param_type: (id: number, paramId: number) => number;
    _wl_material_get_param_value: (id: number, paramId: number, outPtr: number) => number;
    _wl_material_set_param_value_uint: (
        id: number,
        paramId: number,
        valueId: number
    ) => void;
    _wl_material_set_param_value_float: (
        id: number,
        paramId: number,
        ptr: number,
        count: number
    ) => void;
    _wl_renderer_addImage: (id: number) => number;
    _wl_texture_width: (id: number) => number;
    _wl_texture_height: (id: number) => number;
    _wl_renderer_updateImage: (
        id: number,
        imageIndex: number,
        xOffset?: number,
        yOffset?: number
    ) => void;
    _wl_texture_destroy: (id: number) => void;
    _wl_animation_get_duration: (id: number) => number;
    _wl_animation_get_trackCount: (id: number) => number;
    _wl_animation_retargetToSkin: (id: number, targetId: number) => number;
    _wl_animation_retarget: (id: number, ptr: number) => number;
    _wl_object_name: (id: number) => number;
    _wl_object_set_name: (id: number, ptr: number) => void;
    _wl_object_parent: (id: number) => number;
    _wl_object_get_children_count: (id: number) => number;
    _wl_object_get_children: (id: number, outPtr: number, count: number) => number;
    _wl_object_set_parent: (id: number, parentId: number) => void;
    _wl_object_clone: (id: number, parentId: number) => number;
    _wl_object_reset_scaling: (id: number) => void;
    _wl_object_reset_translation_rotation: (id: number) => void;
    _wl_object_reset_rotation: (id: number) => void;
    _wl_object_reset_translation: (id: number) => void;
    _wl_object_translate: (id: number, x: number, y: number, z: number) => void;
    _wl_object_translate_obj: (id: number, x: number, y: number, z: number) => void;
    _wl_object_translate_world: (id: number, x: number, y: number, z: number) => void;
    _wl_object_rotate_axis_angle: (
        id: number,
        x: number,
        y: number,
        z: number,
        deg: number
    ) => void;
    _wl_object_rotate_axis_angle_rad: (
        id: number,
        x: number,
        y: number,
        z: number,
        rad: number
    ) => void;
    _wl_object_rotate_axis_angle_obj: (
        id: number,
        x: number,
        y: number,
        z: number,
        deg: number
    ) => void;
    _wl_object_rotate_axis_angle_rad_obj: (
        id: number,
        x: number,
        y: number,
        z: number,
        rad: number
    ) => void;
    _wl_object_rotate_quat: (
        id: number,
        x: number,
        y: number,
        z: number,
        w: number
    ) => void;
    _wl_object_rotate_quat_obj: (
        id: number,
        x: number,
        y: number,
        z: number,
        w: number
    ) => void;
    _wl_object_scale: (id: number, x: number, y: number, z: number) => void;
    _wl_object_trans_local: (id: number) => number;
    _wl_object_get_translation_local: (id: number, outPtr: number) => void;
    _wl_object_set_translation_local: (id: number, x: number, y: number, z: number) => void;
    _wl_object_get_translation_world: (id: number, outPtr: number) => void;
    _wl_object_set_translation_world: (id: number, x: number, y: number, z: number) => void;
    _wl_object_trans_world: (id: number) => number;
    _wl_object_trans_world_to_local: (id: number) => number;
    _wl_object_scaling_local: (id: number) => number;
    _wl_object_scaling_world: (id: number) => number;
    _wl_object_set_scaling_local: (id: number, x: number, y: number, z: number) => void;
    _wl_object_set_scaling_world: (id: number, x: number, y: number, z: number) => void;
    _wl_object_scaling_world_to_local: (id: number) => number;
    _wl_object_set_rotation_local: (
        id: number,
        x: number,
        y: number,
        z: number,
        w: number
    ) => void;
    _wl_object_set_rotation_world: (
        id: number,
        x: number,
        y: number,
        z: number,
        w: number
    ) => void;
    _wl_object_transformVectorWorld: (id: number, ptr: number) => number;
    _wl_object_transformVectorLocal: (id: number, ptr: number) => number;
    _wl_object_transformPointWorld: (id: number, ptr: number) => number;
    _wl_object_transformPointLocal: (id: number, ptr: number) => number;
    _wl_object_transformVectorInverseWorld: (id: number, ptr: number) => number;
    _wl_object_transformVectorInverseLocal: (id: number, ptr: number) => number;
    _wl_object_transformPointInverseWorld: (id: number, ptr: number) => number;
    _wl_object_transformPointInverseLocal: (id: number, ptr: number) => number;
    _wl_object_toWorldSpaceTransform: (id: number, ptr: number) => number;
    _wl_object_toObjectSpaceTransform: (id: number, ptr: number) => number;
    _wl_object_lookAt: (
        id: number,
        x: number,
        y: number,
        z: number,
        upX: number,
        upY: number,
        upZ: number
    ) => void;
    _wl_scene_remove_object: (id: number) => void;
    _wl_object_set_dirty: (id: number) => void;
    _wl_get_component_manager_index: (ptr: number) => number;
    _wl_get_js_component_index: (id: number, outPtr: number, count: number) => number;
    _wl_get_js_component_index_for_id: (id: number) => number;
    _wl_get_component_id: (id: number, managerId: number, index: number) => number;
    _wl_object_get_components: (id: number, outPtr: number, count: number) => number;
    _wl_object_get_component_types: (id: number, outPtr: number, count: number) => void;
    _wl_object_add_js_component: (id: number, typeId: number) => number;
    _wl_object_add_component: (id: number, typeId: number) => number;
    _wl_object_is_changed: (id: number) => number;
    _wl_object_findByName: (
        obj: number,
        name: number,
        indexPtr: number,
        childPtr: number,
        outPtr: number,
        count: number
    ) => number;
    _wl_object_findByNameRecursive: (
        obj: number,
        name: number,
        indexPtr: number,
        outPtr: number,
        count: number
    ) => number;
    _wl_component_manager_name: (id: number) => number;
    _wl_skin_get_joint_count: (id: number) => number;
    _wl_skin_joint_ids: (id: number) => number;
    _wl_skin_inverse_bind_transforms: (id: number) => number;
    _wl_skin_inverse_bind_scalings: (id: number) => number;
    _wl_math_cubicHermite: (
        a: number,
        b: number,
        c: number,
        d: number,
        f: number,
        e: number,
        isQuat: boolean
    ) => void;
    _wl_i18n_setLanguage: (ptr: number) => void;
    _wl_i18n_currentLanguage: () => number;
    _wl_i18n_currentLanguageIndex: () => number;
    _wl_i18n_translate: (ptr: number) => number;
    _wl_i18n_languageCount: () => number;
    _wl_i18n_languageIndex: (ptr: number) => number;
    _wl_i18n_languageCode: (index: number) => number;
    _wl_i18n_languageName: (index: number) => number;
}

/*
 * Api <> Runtime compatibility.
 *
 * Some features exposed in the API are only available from a specific
 * runtime version.
 *
 * Every added feature must throw by default. If the runtime loaded
 * has the specific feature, the method will be overwritten by Emscripten
 * upon loading.
 */

function throwInvalidRuntime(version: string) {
    return function () {
        throw new Error(
            `Feature added in version ${version}.` +
                `\n\t→ Please use a Wonderland Engine editor version >= ${version}`
        );
    };
}
const requireRuntime1_1_1 = throwInvalidRuntime('1.1.1');
const requireRuntime1_1_5 = throwInvalidRuntime('1.1.5');

/** @todo: Remove at 1.2.0 */
WASM.prototype._wl_physx_component_get_offsetTranslation = requireRuntime1_1_1;
WASM.prototype._wl_physx_component_set_offsetTranslation = requireRuntime1_1_1;
WASM.prototype._wl_physx_component_get_offsetTransform = requireRuntime1_1_1;
WASM.prototype._wl_physx_component_set_offsetRotation = requireRuntime1_1_1;
WASM.prototype._wl_object_clone = requireRuntime1_1_1;
WASM.prototype._wl_physx_component_set_sleepOnActivate = requireRuntime1_1_5;
WASM.prototype._wl_physx_component_get_sleepOnActivate = requireRuntime1_1_5;
(WASM.prototype.webxr_offerSession as Function) = requireRuntime1_1_5;
