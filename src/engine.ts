import {
    Component,
    ComponentConstructor,
    CollisionComponent,
    AnimationComponent,
    LightComponent,
    MeshComponent,
    PhysXComponent,
    InputComponent,
    ViewComponent,
    TextComponent,
    Object as Object3D,
    Physics,
    I18N,
    XR,
    Texture,
    DestroyedObjectInstance,
    DestroyedComponentInstance,
    DestroyedTextureInstance,
} from './wonderland.js';

import {Emitter, RetainEmitter} from './utils/event.js';
import {isString} from './utils/object.js';
import {Scene} from './scene.js';
import {Version} from './version.js';
import {WASM} from './wasm.js';
import {TextureManager} from './texture-manager.js';
import {Logger} from './utils/logger.js';
import {LogTag} from './index.js';

function checkXRSupport() {
    if (!navigator.xr) {
        const isLocalhost =
            location.hostname === 'localhost' || location.hostname === '127.0.0.1';
        const missingHTTPS = location.protocol !== 'https:' && !isLocalhost;
        return Promise.reject(
            missingHTTPS
                ? 'WebXR is only supported with HTTPS or on localhost!'
                : 'WebXR unsupported in this browser.'
        );
    }
    return Promise.resolve();
}

/**
 * Main Wonderland Engine instance.
 *
 * Controls the canvas, rendering, and JS <-> WASM communication.
 */
export class WonderlandEngine {
    /**
     * {@link Emitter} for WebXR session end events.
     *
     * Usage from within a component:
     *
     * ```js
     * this.engine.onXRSessionEnd.add(() => console.log("XR session ended."));
     * ```
     */
    readonly onXRSessionEnd = new Emitter();

    /**
     * {@link RetainEmitter} for WebXR session start events.
     *
     * Usage from within a component:
     *
     * ```js
     * this.engine.onXRSessionStart.add((session, mode) => console.log(session, mode));
     * ```
     *
     * By default, this emitter is retained and will automatically call any callback added
     * while a session is already started:
     *
     * ```js
     * // XR session is already active.
     * this.engine.onXRSessionStart.add((session, mode) => {
     *     console.log(session, mode); // Triggered immediately.
     * });
     * ```
     */
    readonly onXRSessionStart: Emitter<[XRSession, XRSessionMode]> = new RetainEmitter<
        [XRSession, XRSessionMode]
    >();

    /**
     * {@link Emitter} for canvas / main framebuffer resize events.
     *
     * Usage from within a component:
     *
     * ```js
     * this.engine.onResize.add(() => {
     *     const canvas = this.engine.canvas;
     *     console.log(`New Size: ${canvas.width}, ${canvas.height}`);
     * });
     * ```
     *
     * @note The size of the canvas is in physical pixels, and is set via {@link WonderlandEngine.resize}.
     */
    readonly onResize: Emitter = new Emitter();

    /** Whether AR is supported by the browser. */
    readonly arSupported: boolean = false;

    /** Whether VR is supported by the browser. */
    readonly vrSupported: boolean = false;

    /**
     * {@link RetainEmitter} signalling the end of the loading screen.
     *
     * Listeners get notified when the first call to {@link Scene#load()} is
     * invoked. At this point the new scene has not become active, and none of
     * its resources or components are initialized.
     *
     * Compared to {@link onSceneLoaded}, this does not wait for all components
     * to be fully initialized and activated. Any handler added inside
     * {@link Component#init()}, {@link Component#start()} or
     * {@link Component#onActivate()} will be called immediately.
     *
     * Usage:
     *
     * ```js
     * this.engine.onLoadingScreenEnd.add(() => console.log("Wait is over!"));
     * ```
     */
    readonly onLoadingScreenEnd = new RetainEmitter();

    /**
     * {@link Emitter} for scene loaded events.
     *
     * Listeners get notified when a call to {@link Scene#load()} finishes. At
     * this point all resources are loaded and all components had their
     * {@link Component#init()} as well as (if active)
     * {@link Component#start()} and {@link Component#onActivate()} methods
     * called.
     *
     * Usage from within a component:
     *
     * ```js
     * this.engine.onSceneLoaded.add(() => console.log("Scene switched!"));
     * ```
     */
    readonly onSceneLoaded = new Emitter();

    /**
     * Current main scene.
     */
    readonly scene: Scene = null!;

    /**
     * Access to internationalization.
     */
    readonly i18n: I18N = new I18N(this);

    /**
     * WebXR related state, `null` if no XR session is active.
     */
    readonly xr: XR | null = null;

    /**
     * If `true`, {@link Texture}, {@link Object3D}, and {@link Component}
     * instances have their prototype erased upon destruction.
     *
     * #### Object
     *
     * ```js
     * engine.erasePrototypeOnDestroy = true;
     *
     * const obj = engine.scene.addObject();
     * obj.name = 'iamalive';
     * console.log(obj.name); // Prints 'iamalive'
     *
     * obj.destroy();
     * console.log(obj.name); // Throws an error
     * ```
     *
     * #### Component
     *
     * Components will also be affected:
     *
     * ```js
     * class MyComponent extends Component {
     *     static TypeName = 'my-component';
     *     static Properties = {
     *         alive: Property.bool(true)
     *     };
     *
     *     start() {
     *         this.destroy();
     *         console.log(this.alive) // Throws an error
     *     }
     * }
     * ```
     *
     * A component is also destroyed if its ancestor gets destroyed:
     *
     * ```js
     * class MyComponent extends Component {
     *     ...
     *     start() {
     *         this.object.parent.destroy();
     *         console.log(this.alive) // Throws an error
     *     }
     * }
     * ```
     *
     * @note Native components will not be erased if destroyed via object destruction:
     *
     * ```js
     * const mesh = obj.addComponent('mesh');
     * obj.destroy();
     * console.log(mesh.active) // Doesn't throw even if the mesh is destroyed
     * ```
     *
     * @since 1.1.1
     */
    erasePrototypeOnDestroy = false;

    /**
     * Component class instances per type to avoid GC.
     *
     * @note Maps the manager index to the list of components.
     *
     * @hidden
     */
    _componentCache: Record<string, (Component | null)[]> = {};

    /** Object class instances to avoid GC. @hidden */
    _objectCache: (Object3D | null)[] = [];

    /**
     * WebAssembly bridge.
     *
     * @hidden
     */
    #wasm: WASM;

    /**
     * Physics manager, only available when physx is enabled in the runtime.
     *
     * @hidden
     */
    #physics: Physics | null = null;

    /** Texture manager. @hidden */
    #textures: TextureManager = new TextureManager(this);

    /**
     * Resize observer to track for canvas size changes.
     *
     * @hidden
     */
    #resizeObserver: ResizeObserver | null = null;

    /**
     * Initial reference space type set by webxr_init. See {@link _init} for
     * more information.
     *
     * @hidden
     */
    #initialReferenceSpaceType: XRReferenceSpaceType | null = null;

    /**
     * Create a new engine instance.
     *
     * @param wasm Wasm bridge instance
     * @param loadingScreen Loading screen .bin file data
     *
     * @hidden
     */
    constructor(wasm: WASM, loadingScreen: ArrayBuffer | null) {
        this.#wasm = wasm;
        this.#wasm['_setEngine'](this); /* String lookup to bypass private. */
        this.#wasm._loadingScreen = loadingScreen;
        this._componentCache = {};
        this._objectCache.length = 0;

        this.canvas.addEventListener(
            'webglcontextlost',
            (e) => this.log.error(LogTag.Engine, 'Context lost:', e),
            false
        );
    }

    /**
     * Start the engine if it's not already running.
     *
     * When using the {@link loadRuntime} function, this method is called
     * automatically.
     */
    start(): void {
        this.wasm._wl_application_start();
    }

    /**
     * Register a custom JavaScript component type.
     *
     * You can register a component directly using a class inheriting from {@link Component}:
     *
     * ```js
     * import { Component, Type } from '@wonderlandengine/api';
     *
     * export class MyComponent extends Component {
     *     static TypeName = 'my-component';
     *     static Properties = {
     *         myParam: {type: Type.Float, default: 42.0},
     *     };
     *     init() {}
     *     start() {}
     *     update(dt) {}
     *     onActivate() {}
     *     onDeactivate() {}
     *     onDestroy() {}
     * });
     *
     * // Here, we assume we have an engine already instantiated.
     * // In general, the registration occurs in the `index.js` file in your
     * // final application.
     * engine.registerComponent(MyComponent);
     * ```
     *
     * {@label CLASSES}
     * @param classes Custom component(s) extending {@link Component}.
     *
     * @since 1.0.0
     */
    registerComponent(...classes: ComponentConstructor[]) {
        for (const arg of classes) {
            this.wasm._registerComponent(arg);
        }
    }

    /**
     * Checks whether the given component is registered or not.
     *
     * @param typeOrClass A string representing the component typename (e.g., `'cursor-component'`),
     *     or a component class (e.g., `CursorComponent`).
     * @returns `true` if the component is registered, `false` otherwise.
     */
    isRegistered(typeOrClass: string | ComponentConstructor) {
        return this.#wasm.isRegistered(
            isString(typeOrClass) ? typeOrClass : typeOrClass.TypeName
        );
    }

    /**
     * Resize the canvas and the rendering context.
     *
     * @note The `width` and `height` parameters will be scaled by the
     * `devicePixelRatio` value. By default, the pixel ratio used is
     * [window.devicePixelRatio](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio).
     *
     * @param width The width, in CSS pixels.
     * @param height The height, in CSS pixels.
     * @param devicePixelRatio The pixel ratio factor.
     */
    resize(width: number, height: number, devicePixelRatio = window.devicePixelRatio) {
        width = width * devicePixelRatio;
        height = height * devicePixelRatio;
        this.canvas.width = width;
        this.canvas.height = height;
        this.wasm._wl_application_resize(width, height);
        this.onResize.notify();
    }

    /**
     * Run the next frame.
     *
     * @param fixedDelta The elapsed time between this frame and the previous one.
     *
     * @note The engine automatically schedules next frames. You should only
     * use this method for testing.
     */
    nextFrame(fixedDelta: number = 0) {
        this.#wasm._wl_nextFrame(fixedDelta);
    }

    /**
     * Request an XR session.
     *
     * @note Please use this call instead of directly calling `navigator.xr.requestSession()`.
     * Wonderland Engine requires to be aware that a session is started, and this
     * is done through this call.
     *
     * @param mode The XR mode.
     * @param features An array of required features, e.g., `['local-floor', 'hit-test']`.
     * @param optionalFeatures An array of optional features, e.g., `['bounded-floor', 'depth-sensing']`.
     * @returns A promise resolving with the `XRSession`, a string error message otherwise.
     */
    requestXRSession(
        mode: XRSessionMode,
        features: string[],
        optionalFeatures: string[] = []
    ): Promise<XRSession> {
        return checkXRSupport().then(() =>
            this.#wasm.webxr_requestSession(mode, features, optionalFeatures)
        );
    }

    /**
     * Offer an XR session.
     *
     * Adds an interactive UI element to the browser interface to start an XR
     * session. Browser support is optional, so it's advised to still allow
     * requesting a session with a UI element on the website itself.
     *
     * @note Please use this call instead of directly calling `navigator.xr.offerSession()`.
     * Wonderland Engine requires to be aware that a session is started, and this
     * is done through this call.
     *
     * @param mode The XR mode.
     * @param features An array of required features, e.g., `['local-floor', 'hit-test']`.
     * @param optionalFeatures An array of optional features, e.g., `['bounded-floor', 'depth-sensing']`.
     * @returns A promise resolving with the `XRSession`, a string error message otherwise.
     *
     * @since 1.1.5
     */
    offerXRSession(
        mode: XRSessionMode,
        features: string[],
        optionalFeatures: string[] = []
    ): Promise<XRSession> {
        return checkXRSupport().then(() =>
            this.#wasm.webxr_offerSession(mode, features, optionalFeatures)
        );
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
    wrapObject(objectId: number): Object3D {
        const cache = this._objectCache;
        const o = cache[objectId] || (cache[objectId] = new Object3D(this, objectId));
        (o['_objectId'] as number) = objectId;
        return o;
    }

    /* Public Getters & Setter */

    /**
     * WebAssembly bridge.
     *
     * @note Use with care. This object is used to communicate
     * with the WebAssembly code throughout the api.
     *
     * @hidden
     */
    get wasm(): WASM {
        return this.#wasm;
    }

    /** Canvas element that Wonderland Engine renders to. */
    get canvas(): HTMLCanvasElement {
        return this.#wasm.canvas;
    }

    /**
     * Current WebXR session or `null` if no session active.
     *
     * @deprecated Use {@link XR.session} on the {@link xr}
     * object instead.
     */
    get xrSession(): XRSession | null {
        return this.xr?.session ?? null;
    }

    /**
     * Current WebXR frame or `null` if no session active.
     *
     * @deprecated Use {@link XR.frame} on the {@link xr}
     * object instead.
     */
    get xrFrame(): XRFrame | null {
        return this.xr?.frame ?? null;
    }

    /**
     * Current WebXR base layer or `null` if no session active.
     *
     * @deprecated Use {@link XR.baseLayer} on the {@link xr}
     * object instead.
     */
    get xrBaseLayer(): XRProjectionLayer | null {
        return this.xr?.baseLayer ?? null;
    }

    /**
     * Current WebXR framebuffer or `null` if no session active.
     *
     * @deprecated Use {@link XR.framebuffers} on the
     * {@link xr} object instead.
     */
    get xrFramebuffer(): WebGLFramebuffer | null {
        return this.xr?.framebuffers[0] ?? null;
    }

    /** Framebuffer scale factor. */
    get xrFramebufferScaleFactor() {
        return this.#wasm.webxr_framebufferScaleFactor;
    }

    set xrFramebufferScaleFactor(value: number) {
        (this.#wasm.webxr_framebufferScaleFactor as number) = value;
    }

    /** Physics manager, only available when physx is enabled in the runtime. */
    get physics() {
        return this.#physics;
    }

    /**
     * Texture managger.
     *
     * Use this to load or programmatically create new textures at runtime.
     */
    get textures() {
        return this.#textures;
    }

    /*
     * Enable or disable the mechanism to automatically resize the canvas.
     *
     * Internally, the engine uses a [ResizeObserver](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver).
     * Changing the canvas css will thus automatically be tracked by the engine.
     */
    set autoResizeCanvas(flag: boolean) {
        const state = !!this.#resizeObserver;
        if (state === flag) return;

        if (!flag) {
            this.#resizeObserver?.unobserve(this.canvas);
            this.#resizeObserver = null;
            return;
        }
        this.#resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.target === this.canvas) {
                    this.resize(entry.contentRect.width, entry.contentRect.height);
                }
            }
        });
        this.#resizeObserver.observe(this.canvas);
    }

    /** `true` if the canvas is automatically resized by the engine. */
    get autoResizeCanvas() {
        return this.#resizeObserver !== null;
    }

    /** Retrieves the runtime version. */
    get runtimeVersion(): Version {
        const wasm = this.#wasm;
        const v = wasm._wl_application_version(wasm._tempMem);
        return {
            major: wasm._tempMemUint16[0],
            minor: wasm._tempMemUint16[1],
            patch: wasm._tempMemUint16[2],
            rc: wasm._tempMemUint16[3],
        };
    }

    /** Engine {@link Logger}. Use it to turn on / off logging. */
    get log(): Logger {
        return this.#wasm._log;
    }

    /* Internal-Only Methods */

    /**
     * Initialize the engine.
     *
     * @note Should be called after the WebAssembly is fully loaded.
     *
     * @hidden
     */
    _init() {
        (this.scene as Scene) = new Scene(this);

        /* Force the reference space to 'local'/'viewer' for the loading screen
         * to make sure the head input is at the origin. Doing it this way to
         * avoid adding JS components to the loading screen. */
        const onXRStart = () => {
            this.#initialReferenceSpaceType = this.xr!.currentReferenceSpaceType;
            const newSpace =
                this.xr!.referenceSpaceForType('local') ??
                this.xr!.referenceSpaceForType('viewer');
            this.xr!.currentReferenceSpace = newSpace;
        };

        /* Not once() because the user can enter and exit XR several times
         * during a long loading screen */
        this.onXRSessionStart.add(onXRStart);

        /* This is called before all init()/start()/onActivate() so we avoid
         * overwriting a user-set reference space */
        this.onLoadingScreenEnd.once(() => {
            this.onXRSessionStart.remove(onXRStart);

            if (!this.xr || !this.#initialReferenceSpaceType) return;

            this.xr.currentReferenceSpace =
                this.xr.referenceSpaceForType(this.#initialReferenceSpaceType) ??
                this.xr.referenceSpaceForType('viewer');
            this.#initialReferenceSpaceType = null;
        });

        /* Setup the error handler. This is used to to manage native errors. */
        this.#wasm._wl_set_error_callback(
            this.#wasm.addFunction((messagePtr: number) => {
                throw new Error(this.#wasm.UTF8ToString(messagePtr));
            }, 'vi')
        );

        this.#physics = null;
        if (this.#wasm.withPhysX) {
            /* Setup the physics callback. */
            const physics = new Physics(this);
            this.#wasm._wl_physx_set_collision_callback(
                this.#wasm.addFunction(
                    (a: number, index: number, type: number, b: number) => {
                        const callback = physics._callbacks[a][index];
                        const component = new PhysXComponent(
                            this,
                            this.wasm._typeIndexFor('physx'),
                            b
                        );
                        callback(type, component);
                    },
                    'viiii'
                )
            );
            this.#physics = physics;
        }

        this.resize(this.canvas.clientWidth, this.canvas.clientHeight);
    }

    /**
     * Reset the runtime state, including:
     *     - Component cache
     *     - Images
     *     - Callbacks
     *
     * @note This api is meant to be used internally.
     *
     * @hidden
     */
    _reset(): void {
        this._componentCache = {};
        this._objectCache.length = 0;
        this.#textures._reset();
        this.scene.reset();
        this.wasm.reset();
    }

    /**
     * Retrieves a component instance if it exists, or create and cache
     * a new one.
     *
     * @note This api is meant to be used internally. Please have a look at
     * {@link Object3D.addComponent} instead.
     *
     * @param type component type name
     * @param componentType Component manager index
     * @param componentId Component id in the manager
     *
     * @returns JavaScript instance wrapping the native component
     *
     * @hidden
     */
    _wrapComponent(type: string, componentType: number, componentId: number) {
        if (componentId < 0) return null;

        /* @todo: extremely slow in JS to do that... Better to use a Map or allocate the array. */
        const c =
            this._componentCache[componentType] ||
            (this._componentCache[componentType] = []);
        if (c[componentId]) {
            return c[componentId];
        }

        let component: Component;
        if (type == 'collision') {
            component = new CollisionComponent(this, componentType, componentId);
        } else if (type == 'text') {
            component = new TextComponent(this, componentType, componentId);
        } else if (type == 'view') {
            component = new ViewComponent(this, componentType, componentId);
        } else if (type == 'mesh') {
            component = new MeshComponent(this, componentType, componentId);
        } else if (type == 'input') {
            component = new InputComponent(this, componentType, componentId);
        } else if (type == 'light') {
            component = new LightComponent(this, componentType, componentId);
        } else if (type == 'animation') {
            component = new AnimationComponent(this, componentType, componentId);
        } else if (type == 'physx') {
            component = new PhysXComponent(this, componentType, componentId);
        } else {
            const typeIndex = this.wasm._componentTypeIndices[type];
            const constructor = this.wasm._componentTypes[typeIndex];
            component = new constructor(this);
        }
        /* Sets the manager and identifier from the outside, to
         * simplify the user's constructor. */
        /* @ts-ignore */
        component._engine = this;
        (component._manager as number) = componentType;
        (component._id as number) = componentId;
        c[componentId] = component;
        return component;
    }

    /**
     * Perform cleanup upon object destruction.
     *
     * @param instance The instance to destroy.
     *
     * @hidden
     */
    _destroyObject(instance: Object3D) {
        const id = instance.objectId;
        (instance._objectId as number) = -1;

        /* Destroy the prototype of this instance to avoid using a dangling object */
        if (this.erasePrototypeOnDestroy && instance) {
            Object.setPrototypeOf(instance, DestroyedObjectInstance);
        }

        /* Remove from the cache to avoid side-effects when
         * re-creating an object with the same id. */
        this._objectCache[id] = null;
    }

    /**
     * Perform cleanup upon component destruction.
     *
     * @param instance The instance to destroy.
     *
     * @hidden
     */
    _destroyComponent(instance: Component) {
        const id = instance._id;
        const manager = instance._manager;
        (instance._id as number) = -1;
        (instance._manager as number) = -1;

        /* Destroy the prototype of this instance to avoid using a dangling component */
        if (this.erasePrototypeOnDestroy && instance) {
            Object.setPrototypeOf(instance, DestroyedComponentInstance);
        }

        /* Remove from the cache to avoid side-effects when
         * re-creating a component with the same id. */
        const cache = this._componentCache[manager];
        if (cache) cache[id] = null;
    }

    /**
     * Perform cleanup upon texture destruction.
     *
     * @param texture The instance to destroy.
     *
     * @hidden
     */
    _destroyTexture(texture: Texture) {
        this.textures._destroy(texture);
        if (this.erasePrototypeOnDestroy) {
            Object.setPrototypeOf(texture, DestroyedTextureInstance);
        }
    }
}
