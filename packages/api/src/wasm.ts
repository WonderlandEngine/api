import {LogTag, Prefab} from './index.js';
import {WonderlandEngine} from './engine.js';
import {ComponentProperty, Type, defaultPropertyCloner} from './property.js';
import {RetainEmitter} from './utils/event.js';
import {CBOR} from './utils/cbor.js';
import {Logger} from './utils/logger.js';
import {
    inheritProperties,
    Component,
    ComponentConstructor,
    ComponentProto,
    BrokenComponent,
    XR,
    AnimationComponent,
} from './wonderland.js';
import {ImageLike} from './types.js';
import {Scene} from './scene.js';

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
    [Type.Color, Float32Array.from([0.0, 0.0, 0.0, 1.0])],
    [Type.Vector2, Float32Array.from([0.0, 0.0])],
    [Type.Vector3, Float32Array.from([0.0, 0.0, 0.0])],
    [Type.Vector4, Float32Array.from([0.0, 0.0, 0.0, 0.0])],
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
        } else if (
            (p.type === Type.Color ||
                p.type === Type.Vector2 ||
                p.type === Type.Vector3 ||
                p.type === Type.Vector4) &&
            Array.isArray(p.default)
        ) {
            /* Defaults provided by user code are currently always a standard
             * array, but become a typed array on the property */
            p.default = Float32Array.from(p.default);
        } else if (p.default === undefined) {
            const cloner = p.cloner ?? defaultPropertyCloner;
            p.default = cloner.clone(p.type, _componentDefaults.get(p.type));
        }
        ctor.prototype[name] = p.default;
    }
}

/**
 * Determines a fixed order for property attributes used for deserialization.
 *
 * @param ctor The component class
 */
function _setPropertyOrder(ctor: ComponentConstructor) {
    ctor._propertyOrder = ctor.hasOwnProperty('Properties')
        ? Object.keys(ctor.Properties).sort()
        : [];
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

    /**
     * WebGPU device.
     *
     * @note This api is meant to be used internally.
     */
    readonly preinitializedWebGPUDevice: any = null;

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

    /** Image cache. */
    _images: (ImageLike | null)[] = [null];

    /** Component instances. */
    private _components: Component[] = null!;

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
        } else {
            this.UTF8ViewToString = (s: number, e: number) => {
                if (!s) return '';
                return this._utf8Decoder.decode(this.HEAPU8.subarray(s, e));
            };
        }

        (this._brokenComponentIndex as number) = this._registerComponent(BrokenComponent);
    }

    /**
     * Reset the cache of the library.
     *
     * @note Should only be called when tearing down the runtime.
     */
    reset() {
        /* Called first to perform cleanup. */
        this._wl_reset();

        this._components = null!;
        this._images.length = 1;
        this.allocateTempMemory(1024);

        this._componentTypes = [];
        this._componentTypeIndices = {};
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
        _setPropertyOrder(ctor);

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
     * Copy the buffer into the WASM heap.
     *
     * @note The returned pointer must be freed.
     *
     * @param buffer The buffer to copy into the heap.
     * @returns An allocated pointer, that must be free after use.
     */
    copyBufferToHeap(buffer: ArrayBuffer): number {
        const size = buffer.byteLength;
        const ptr = this._malloc(size);
        this.HEAPU8.set(new Uint8Array(buffer), ptr);
        return ptr;
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
    protected _wljs_init(withPhysX: boolean) {
        this._withPhysX = withPhysX;

        /* Target memory for JS API functions that return arrays */
        this.allocateTempMemory(1024);
    }
    protected _wljs_scene_switch(index: number) {
        const scene = this._engine._scenes[index] as Scene | null;
        /* Scene can be null during testing with `engine.reset()` */
        this._components = scene?._jsComponents ?? null!;
    }
    protected _wljs_destroy_image(index: number) {
        const img = this._images[index];
        if (!img) return;

        this._images[index] = null;

        if ((img as HTMLImageElement).src !== undefined) {
            (img as HTMLImageElement).src = '';
        }
        if ((img as HTMLImageElement).onload !== undefined) {
            img.onload = null;
        }
        if ((img as HTMLImageElement).onerror !== undefined) {
            img.onerror = null;
        }
    }
    protected _wljs_objects_markDestroyed(
        sceneIndex: number,
        idsPtr: number,
        count: number
    ) {
        const scene = this._engine._scenes[sceneIndex] as Scene;
        const start = idsPtr >>> 1;
        for (let i = 0; i < count; ++i) {
            const id = this.HEAPU16[start + i];
            scene._destroyObject(id);
        }
    }
    protected _wljs_scene_initialize(
        sceneIndex: number,
        idsPtr: number,
        idsEnd: number,
        paramDataPtr: number,
        paramDataEndPtr: number,
        offsetsPtr: number,
        offsetsEndPtr: number
    ) {
        const cbor = this.HEAPU8.subarray(paramDataPtr, paramDataEndPtr);
        const offsets = this.HEAPU32.subarray(offsetsPtr >>> 2, offsetsEndPtr >>> 2);
        const ids = this.HEAPU16.subarray(idsPtr >>> 1, idsEnd >>> 1);

        const engine = this._engine;
        const scene = engine._scenes[sceneIndex] as Scene;
        const components = scene._jsComponents;

        let decoded;
        try {
            decoded = CBOR.decode(cbor);
        } catch (e) {
            this._log.error(LogTag.Engine, 'Exception during component parameter decoding');
            this._log.error(LogTag.Component, e);
            return;
        }

        if (!Array.isArray(decoded)) {
            this._log.error(LogTag.Engine, 'Parameter data must be an array');
            return;
        }
        if (decoded.length !== ids.length) {
            this._log.error(
                LogTag.Engine,
                `Parameter data has size ${decoded.length} but expected ${ids.length}`
            );
            return;
        }

        for (let i = 0; i < decoded.length; ++i) {
            const id = Component._pack(sceneIndex, ids[i]);
            const index = this._wl_get_js_component_index_for_id(id);
            const component = components[index];
            const ctor = component.constructor as ComponentConstructor;
            if (ctor == BrokenComponent) continue;

            const paramNames = ctor._propertyOrder;
            const paramValues = decoded[i];
            if (!Array.isArray(paramValues)) {
                this._log.error(LogTag.Engine, 'Component parameter data must be an array');
                continue;
            }
            if (paramValues.length !== paramNames.length) {
                this._log.error(
                    LogTag.Engine,
                    `Component parameter data has size ${paramValues.length} but expected ${paramNames.length}`
                );
                continue;
            }

            for (let j = 0; j < paramValues.length; ++j) {
                const name = paramNames[j];
                const property = ctor.Properties[name];
                const type = property.type;
                let value = paramValues[j];

                /* Default values are sent as undefined to avoid wasting space */
                if (value === undefined) {
                    const cloner = property.cloner ?? defaultPropertyCloner;
                    value = cloner.clone(type, property.default);
                    (component as Record<string, any>)[name] = value;
                    continue;
                }

                /* This skips unset resource parameters as those are sent
                 * directly with type null. Offsets for Int and Float types
                 * should always be 0. */
                /** @todo CBOR tag to mark resources? Wastes a byte though. */
                if (typeof value === 'number') {
                    value += offsets[type];
                }

                switch (type) {
                    case Type.Bool:
                    case Type.Int:
                    case Type.Float:
                    case Type.String:
                    case Type.Enum:
                    case Type.Vector2:
                    case Type.Vector3:
                    case Type.Vector4:
                        /* Nothing to do */
                        break;
                    case Type.Object:
                        value = value
                            ? scene.wrap(this._wl_object_id(scene._index, value))
                            : null;
                        break;
                    case Type.Mesh:
                        value = engine.meshes.wrap(value);
                        break;
                    case Type.Texture:
                        value = engine.textures.wrap(value);
                        break;
                    case Type.Material:
                        value = engine.materials.wrap(value);
                        break;
                    case Type.Animation:
                        value = scene.animations.wrap(value);
                        break;
                    case Type.Skin:
                        value = scene.skins.wrap(value);
                        break;
                    case Type.Color:
                        /* Colors are sent as Uint8Array. Normalize positive
                         * integer values to 0-1. Don't assume any bit size
                         * here, could become Uint16Array as well. */
                        const max = (1 << (value.BYTES_PER_ELEMENT * 8)) - 1;
                        value = Float32Array.from(value, (f: number, _) => f / max);
                        break;
                }

                (component as Record<string, any>)[name] = value;
            }
        }
    }

    protected _wljs_set_component_param_translation(
        scene: number,
        component: number,
        param: number,
        valuePtr: number,
        valueEndPtr: number
    ) {
        const components = (this._engine._scenes[scene] as Scene)._jsComponents;
        const comp = components[component];

        const value = this.UTF8ViewToString(valuePtr, valueEndPtr);
        const ctor = comp.constructor as ComponentConstructor;
        const paramName = ctor._propertyOrder[param];
        (comp as Record<string, any>)[paramName] = value;
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
        sceneIndex: number,
        index: number,
        id: number,
        type: number,
        object: number
    ) {
        const scene = this._engine._scenes[sceneIndex] as Scene;
        scene._components.createJs(index, id, type, object);
    }
    protected _wljs_component_init(scene: number, component: number) {
        const components = (this._engine._scenes[scene] as Scene)._jsComponents;
        const c = components[component];
        c._triggerInit();
    }
    protected _wljs_component_update(component: number, dt: number) {
        const c = this._components[component];
        c._triggerUpdate(dt);
    }
    protected _wljs_component_onActivate(component: number) {
        const c = this._components[component];
        c._triggerOnActivate();
    }
    protected _wljs_component_onDeactivate(component: number) {
        const c = this._components[component];
        c._triggerOnDeactivate();
    }
    protected _wljs_component_markDestroyed(
        sceneIndex: number,
        manager: number,
        componentId: number
    ) {
        const scene = this._engine._scenes[sceneIndex] as Prefab;
        scene._destroyComponent(manager, componentId);
    }
    protected _wljs_swap(scene: number, a: number, b: number) {
        const components = (this._engine._scenes[scene] as Scene)._jsComponents;
        const componentA = components[a];
        components[a] = components[b];
        components[b] = componentA;
    }
    protected _wljs_copy(
        srcSceneIndex: number,
        srcIndex: number,
        dstSceneIndex: number,
        dstIndex: number,
        offsetsPtr: number
    ) {
        const srcScene = this._engine._scenes[srcSceneIndex] as Scene;
        const dstScene = this._engine._scenes[dstSceneIndex] as Scene;
        const destComp = dstScene._jsComponents[dstIndex];
        const srcComp = srcScene._jsComponents[srcIndex];
        try {
            destComp._copy(srcComp, offsetsPtr);
        } catch (e) {
            this._log.error(
                LogTag.Component,
                `Exception during ${destComp.type} copy() on object ${destComp.object.name}`
            );
            this._log.error(LogTag.Component, e);
        }
    }
    /**
     * Forward an animation event to a corresponding
     * {@link AnimationComponent}
     *
     * @note This api is meant to be used internally. Please have a look at
     * {@link AnimationComponent.onEvent} instead.
     *
     * @param componentId Component id in the manager
     * @param namePtr Pointer to UTF8 event name
     * @param nameEndPtr Pointer to end of UTF8 event name
     */
    protected _wljs_trigger_animationEvent(
        componentId: number,
        namePtr: number,
        nameEndPtr: number
    ) {
        const scene = this._engine.scene;
        const comp = scene._components.wrapAnimation(componentId);
        const nameStr = this.UTF8ViewToString(namePtr, nameEndPtr);
        comp.onEvent.notify(nameStr);
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
    _wl_application_version: (out: number) => void;
    _wl_application_start: () => void;
    _wl_application_resize: (width: number, height: number) => void;

    _wl_nextUpdate: (delta: number) => void;
    _wl_nextFrame: (delta: number) => void;
    _wl_reset: () => void;
    _wl_deactivate_activeScene: () => void;

    _wl_renderer_set_mesh_layout: (layout: number) => void;
    _wl_renderer_streaming_idle: () => number;

    _wl_load_main_scene: (ptr: number, size: number, url: number) => number;
    _wl_get_images: (out: number, max: number) => number;
    _wl_get_material_definition_count: () => number;
    _wl_get_material_definition_index: (ptr: number) => number;

    _wl_scene_get_active: (root: number) => number;
    _wl_scene_create: (ptr: number, size: number, url: number) => number;
    _wl_scene_create_chunked_start: (url: number) => number;
    _wl_scene_create_chunked_buffer_size: (index: number) => number;
    _wl_scene_create_chunked_next: (
        index: number,
        ptr: number,
        size: number,
        readSizePtr: number,
        requiredSizePtr: number
    ) => boolean;
    _wl_scene_create_chunked_abort: (index: number) => void;
    _wl_scene_create_chunked_end_prefab: (index: number) => number;
    _wl_scene_create_chunked_end_main: (index: number) => void;
    _wl_scene_create_chunked_end_queued: (
        index: number,
        dependentSceneIndex: number
    ) => void;
    _wl_scene_create_empty: () => number;
    _wl_scene_initialize: (index: number) => number;
    _wl_scene_destroy: (index: number) => void;
    _wl_scene_instantiate: (src: number, dst: number) => number;
    _wl_scene_activate: (index: number) => void;
    _wl_scene_queued_bin_count: (index: number) => number;
    _wl_scene_queued_bin_path: (sceneIndex: number, index: number) => number;
    _wl_scene_clear_queued_bin_list: (sceneIndex: number) => void;
    _wl_scene_load_queued_bin: (index: number, ptr: number, size: number) => boolean;
    _wl_scene_activatable: (index: number) => boolean;
    _wl_scene_active: (index: number) => boolean;
    _wl_scene_get_baseURL: (index: number) => number;
    _wl_scene_get_filename: (index: number) => number;
    _wl_scene_get_component_manager_index: (scene: number, ptr: number) => number;

    _wl_glTF_scene_create: (extensions: boolean, ptr: number, ptrEnd: number) => number;
    _wl_glTF_scene_get_extensions: (index: number) => number;
    _wl_glTF_scene_extensions_gltfIndex_to_id: (
        gltfScene: number,
        destScene: number,
        objectIndex: number,
        gltfIndex: number
    ) => number;

    _wl_scene_get_active_views: (scene: number, ptr: number, count: number) => number;
    _wl_scene_ray_cast: (
        scene: number,
        x: number,
        y: number,
        z: number,
        dx: number,
        dy: number,
        dz: number,
        groupMask: number,
        maxDistance: number,
        outPtr: number
    ) => void;
    _wl_scene_add_object: (scene: number, parentId: number) => number;
    _wl_scene_add_objects: (
        scene: number,
        parentId: number,
        count: number,
        componentCountHint: number,
        ptr: number,
        size: number
    ) => number;
    _wl_scene_reserve_objects: (
        scene: number,
        objectCount: number,
        _tempMem: number
    ) => void;
    _wl_scene_set_sky_material: (index: number, id: number) => void;
    _wl_scene_get_sky_material: (index: number) => number;
    _wl_scene_environment_set_intensity: (index: number, intensity: number) => void;
    _wl_scene_environment_get_intensity: (index: number) => number;
    _wl_scene_environment_set_tint: (
        index: number,
        r: number,
        g: number,
        b: number
    ) => void;
    _wl_scene_environment_get_tint: (index: number, ptr: number) => void;
    _wl_scene_environment_set_coefficients: (
        index: number,
        ptr: number,
        count: number
    ) => void;
    _wl_scene_environment_get_coefficients: (index: number, ptr: number) => void;
    _wl_scene_set_clearColor: (r: number, g: number, b: number, a: number) => void;
    _wl_scene_enableColorClear: (b: boolean) => void;
    _wl_set_loading_screen_progress: (ratio: number) => void;
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
    _wl_text_component_set_vertical_alignment: (
        id: number,
        verticalAlignment: number
    ) => void;
    _wl_text_component_get_character_spacing: (id: number) => number;
    _wl_text_component_set_character_spacing: (id: number, spacing: number) => void;
    _wl_text_component_get_line_spacing: (id: number) => number;
    _wl_text_component_set_line_spacing: (id: number, spacing: number) => void;
    _wl_text_component_get_effect: (id: number) => number;
    _wl_text_component_set_effect: (id: number, effect: number) => void;
    _wl_text_component_get_wrapMode: (id: number) => number;
    _wl_text_component_set_wrapMode: (id: number, mode: number) => void;
    _wl_text_component_get_wrapWidth: (id: number) => number;
    _wl_text_component_set_wrapWidth: (id: number, width: number) => void;
    _wl_text_component_get_text: (id: number) => number;
    _wl_text_component_set_text: (id: number, ptr: number) => void;
    _wl_text_component_set_material: (id: number, materialId: number) => void;
    _wl_text_component_get_material: (id: number) => number;
    _wl_text_component_get_boundingBox: (
        id: number,
        textPtr: number,
        resultPtr: number
    ) => number;
    _wl_view_component_get_projectionType: (id: number) => number;
    _wl_view_component_set_projectionType: (id: number, type: number) => void;
    _wl_view_component_get_projection_matrix: (id: number) => number;
    _wl_view_component_get_near: (id: number) => number;
    _wl_view_component_set_near: (id: number, near: number) => void;
    _wl_view_component_get_far: (id: number) => number;
    _wl_view_component_set_far: (id: number, far: number) => void;
    _wl_view_component_get_fov: (id: number) => number;
    _wl_view_component_set_fov: (id: number, fov: number) => void;
    _wl_view_component_get_extent: (id: number) => number;
    _wl_view_component_set_extent: (id: number, fov: number) => void;
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
    _wl_animation_component_getGraphParamValue: (
        id: number,
        paramIndex: number,
        outPtr: number
    ) => number;
    _wl_animation_component_setGraphParamValue: (
        id: number,
        paramIndex: number,
        valuePtr: number
    ) => void;
    _wl_animation_component_get_rootMotionMode: (id: number) => number;
    _wl_animation_component_set_rootMotionMode: (id: number, value: number) => void;
    _wl_animation_component_get_rootMotion_translation: (
        id: number,
        outPtr: number
    ) => number;
    _wl_animation_component_get_rootMotion_rotation: (id: number, outPtr: number) => number;
    _wl_animation_component_getGraphParamIndex: (id: number, paramName: number) => number;
    _wl_animation_component_get_iteration: (id: number) => number;
    _wl_animation_component_get_position: (id: number) => number;
    _wl_animation_component_get_duration: (id: number) => number;
    _wl_mesh_component_get_material: (id: number) => number;
    _wl_mesh_component_set_material: (id: number, materialId: number) => void;
    _wl_mesh_component_get_mesh: (id: number) => number;
    _wl_mesh_component_set_mesh: (id: number, meshId: number) => void;
    _wl_mesh_component_get_skin: (id: number) => number;
    _wl_mesh_component_set_skin: (id: number, skinId: number) => void;
    _wl_mesh_component_get_morph_targets: (id: number) => number;
    _wl_mesh_component_set_morph_targets: (id: number, morphTargetSetId: number) => void;
    _wl_mesh_component_get_morph_target_weight: (id: number, index: number) => number;
    _wl_mesh_component_get_morph_target_weights: (id: number, ptr: number) => number;
    _wl_mesh_component_set_morph_target_weight: (
        id: number,
        index: number,
        weight: number
    ) => void;
    _wl_mesh_component_set_morph_target_weights: (
        id: number,
        ptr: number,
        count: number
    ) => void;
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
        scene: number,
        x: number,
        y: number,
        z: number,
        dx: number,
        dy: number,
        dz: number,
        groupMask: number,
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
    _wl_mesh_get_vertexCount: (index: number) => number;
    _wl_mesh_get_indexData: (index: number, outPtr: number, count: number) => number;
    _wl_mesh_update: (index: number) => void;
    _wl_mesh_get_boundingSphere: (index: number, outPtr: number) => void;
    _wl_mesh_get_attribute: (index: number, attribute: number, outPtr: number) => void;
    _wl_mesh_destroy: (index: number) => void;
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
    _wl_font_get_emHeight: (index: number) => number;
    _wl_font_get_capHeight: (index: number) => number;
    _wl_font_get_xHeight: (index: number) => number;
    _wl_font_get_outlineSize: (index: number) => number;
    _wl_material_create: (definitionIndex: number) => number;
    _wl_material_get_definition: (index: number) => number;
    _wl_material_definition_get_param_count: (index: number) => number;
    _wl_material_definition_get_param_name: (index: number, paramIndex: number) => number;
    _wl_material_definition_get_param_type: (index: number, paramIndex: number) => number;
    _wl_material_get_pipeline: (index: number) => number;
    _wl_material_clone: (index: number) => number;
    _wl_material_get_param_index: (index: number, namePtr: number) => number;
    _wl_material_get_param_type: (index: number, paramIndex: number) => number;
    _wl_material_get_param_value: (
        index: number,
        paramIndex: number,
        outPtr: number
    ) => number;
    _wl_material_set_param_value_uint: (
        index: number,
        paramId: number,
        valueId: number
    ) => void;
    _wl_material_set_param_value_float: (
        index: number,
        paramId: number,
        ptr: number,
        count: number
    ) => void;
    _wl_image_create: (jsImage: number, width: number, height: number) => number;
    _wl_texture_create: (image: number) => number;
    _wl_image_size: (index: number, out: number) => number;
    _wl_image_get_jsImage_index: (index: number) => number;
    _wl_texture_get_image_index: (index: number) => number;
    _wl_renderer_updateImage: (
        imageIndex: number,
        xOffset?: number,
        yOffset?: number
    ) => number;
    _wl_texture_destroy: (id: number) => void;
    _wl_animation_get_duration: (id: number) => number;
    _wl_animation_get_trackCount: (id: number) => number;
    _wl_animation_retargetToSkin: (id: number, targetId: number) => number;
    _wl_animation_retarget: (id: number, ptr: number) => number;
    _wl_object_id: (scene: number, index: number) => number;
    _wl_object_index: (id: number) => number;
    _wl_object_name: (id: number) => number;
    _wl_object_set_name: (id: number, ptr: number) => void;
    _wl_object_remove: (id: number) => void;
    _wl_object_markedDestroyed: (id: number) => boolean;
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
    _wl_object_set_dirty: (id: number) => void;
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
    _wl_component_manager_name: (scene: number, id: number) => number;
    _wl_skin_get_joint_count: (id: number) => number;
    _wl_skin_joint_ids: (id: number) => number;
    _wl_skin_inverse_bind_transforms: (id: number) => number;
    _wl_skin_inverse_bind_scalings: (id: number) => number;
    _wl_morph_targets_get_target_count: (id: number) => number;
    _wl_morph_targets_get_target_name: (id: number, target: number) => number;
    _wl_morph_targets_get_target_index: (id: number, namePtr: number) => number;
    _wl_morph_target_weights_get_weight: (id: number, target: number) => number;
    _wl_morph_target_weights_set_weight: (
        id: number,
        target: number,
        weight: number
    ) => void;
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
    _wl_i18n_languageFile: (index: number) => number;
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

/**
 * Throwing function used for features added in a patch version.
 *
 * #### Usage
 *
 * ```ts
 * const requireRuntime1_1_1 = throwInvalidRuntime('1.1.1');
 * WASM.prototype._wl_new_function = requireRuntime1_1_1;
 * ```
 *
 * @param version The version in which the feature was added.
 * @returns A function that will throw when called.
 */
function throwInvalidRuntime(version: string) {
    return function () {
        throw new Error(
            `Feature added in version ${version}.` +
                `\n\t→ Please use a Wonderland Engine editor version >= ${version}`
        );
    };
}

/** @todo Remove at 1.3.0 */
const requireRuntime1_2_1 = throwInvalidRuntime('1.2.1');
WASM.prototype._wl_text_component_get_wrapMode = requireRuntime1_2_1;
WASM.prototype._wl_text_component_set_wrapMode = requireRuntime1_2_1;
WASM.prototype._wl_text_component_get_wrapWidth = requireRuntime1_2_1;
WASM.prototype._wl_text_component_set_wrapWidth = requireRuntime1_2_1;
WASM.prototype._wl_font_get_outlineSize = requireRuntime1_2_1;
WASM.prototype._wl_scene_create_chunked_start = requireRuntime1_2_1;
WASM.prototype._wl_scene_create_chunked_buffer_size = requireRuntime1_2_1;
WASM.prototype._wl_scene_create_chunked_next = requireRuntime1_2_1;
WASM.prototype._wl_scene_create_chunked_abort = requireRuntime1_2_1;
WASM.prototype._wl_scene_create_chunked_end_prefab = requireRuntime1_2_1;
WASM.prototype._wl_scene_create_chunked_end_main = requireRuntime1_2_1;
WASM.prototype._wl_scene_create_chunked_end_queued = requireRuntime1_2_1;
const requireRuntime1_2_2 = throwInvalidRuntime('1.2.2');
WASM.prototype._wl_view_component_get_projectionType = requireRuntime1_2_2;
WASM.prototype._wl_view_component_set_projectionType = requireRuntime1_2_2;
WASM.prototype._wl_view_component_get_extent = requireRuntime1_2_2;
WASM.prototype._wl_view_component_set_extent = requireRuntime1_2_2;
WASM.prototype._wl_animation_component_get_rootMotionMode = requireRuntime1_2_2;
WASM.prototype._wl_animation_component_set_rootMotionMode = requireRuntime1_2_2;
WASM.prototype._wl_animation_component_get_rootMotion_translation = requireRuntime1_2_2;
WASM.prototype._wl_animation_component_get_rootMotion_rotation = requireRuntime1_2_2;
const requireRuntime1_2_3 = throwInvalidRuntime('1.2.3');
WASM.prototype._wl_scene_environment_set_intensity = requireRuntime1_2_3;
WASM.prototype._wl_scene_environment_get_intensity = requireRuntime1_2_3;
WASM.prototype._wl_scene_environment_set_tint = requireRuntime1_2_3;
WASM.prototype._wl_scene_environment_get_tint = requireRuntime1_2_3;
WASM.prototype._wl_scene_environment_set_coefficients = requireRuntime1_2_3;
WASM.prototype._wl_scene_environment_get_coefficients = requireRuntime1_2_3;
WASM.prototype._wl_animation_component_get_iteration = requireRuntime1_2_3;
WASM.prototype._wl_animation_component_get_position = requireRuntime1_2_3;
WASM.prototype._wl_animation_component_get_duration = requireRuntime1_2_3;
WASM.prototype._wl_renderer_streaming_idle = requireRuntime1_2_3;
