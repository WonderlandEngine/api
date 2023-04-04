import {
    Component,
    ComponentProto,
    ComponentConstructor,
    CollisionComponent,
    AnimationComponent,
    LightComponent,
    MeshComponent,
    PhysXComponent,
    InputComponent,
    ViewComponent,
    TextComponent,
    Texture,
    Object as Object3D,
    Scene,
    Physics,
    I18N,
} from './wonderland.js';

import {Type, ComponentProperty} from './property.js';
import {isString} from './utils/object.js';
import {Emitter} from './utils/event.js';
import {WASM} from './wasm.js';

/* @todo: the `textures` literal should have a better shape/api. */
export type TextureCache = {
    [key: string]: Texture | ((filename: string, crossOrigin?: string) => Promise<Texture>);

    /**
     * Load an image from URL as {@link Texture}.
     *
     * @param filename URL to load from.
     * @param crossOrigin Cross origin flag for the image object.
     * @returns Loaded texture.
     */
    load: (filename: string, crossOrigin?: string) => Promise<Texture>;
};

/**
 * Main Wonderland Engine instance.
 *
 * Controls the canvas, rendering, and JS <-> WASM communication.
 */
export class WonderlandEngine {
    /**
     * {@link Emitter} for WebXR session start events.
     *
     * Usage from a within a component:
     * ```js
     * this.engine.onXRSessionStart.add((session, mode) => console.log(session, mode));
     * ```
     */
    readonly onXRSessionStart = new Emitter<[XRSession, XRSessionMode]>();

    /**
     * {@link Emitter} for WebXR session end events.
     *
     * Usage from a within a component:
     * ```js
     * this.engine.onXRSessionEnd.add(() => console.log("XR session ended."));
     * ```
     */
    readonly onXRSessionEnd = new Emitter();

    /** Whether AR is supported by the browser. */
    readonly arSupported: boolean = false;

    /** Whether VR is supported by the browser. */
    readonly vrSupported: boolean = false;

    /**
     * {@link Emitter} for scene loaded events.
     *
     * Listeners get notified when a call to {@link Scene#load()} finishes,
     * which also happens after the main scene has replaced the loading screen.
     *
     * Usage from a within a component:
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
     * Canvas element that Wonderland Engine renders to.
     */
    canvas: HTMLCanvasElement | null = null;

    /**
     * Access to the textures managed by Wonderland Engine.
     */
    textures: TextureCache;

    /**
     * Access to internationalization.
     */
    i18n: I18N;

    /**
     * If `true`, the component classes found in the `Dependencies` are automatically
     * registered upon component registration.
     *
     * For more information, please have a look at how to setup the {@link Component.Dependencies}
     * static attribute.
     */
    autoRegisterDependencies = true;

    /* Component class instances per type to avoid GC */
    private _componentCache: Record<string, Component[]> = {};

    /* Object class instances per type to avoid GC */
    private readonly _objectCache: Object3D[] = [];

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

        this.textures = {
            /* Backward compatibility. @todo: Remove at 1.0.0. */
            load: (filename: string, crossOrigin?: string) => {
                let image = new Image();
                if (crossOrigin !== undefined) {
                    image.crossOrigin = crossOrigin;
                }
                image.src = filename;
                return new Promise((resolve, reject) => {
                    image.onload = () => {
                        let texture = new Texture(this, image);
                        if (!texture.valid) {
                            reject(
                                'Failed to add image ' +
                                    image.src +
                                    ' to texture atlas. Probably incompatible format.'
                            );
                        }
                        resolve(texture);
                    };
                    image.onerror = function () {
                        reject('Failed to load image. Not found or no read access');
                    };
                });
            },
        };

        this.i18n = new I18N(this);

        this._componentCache = {};
        this._objectCache.length = 0;
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
    registerComponent(...classes: ComponentConstructor[]): void;
    /**
     * Register a custom JavaScript component type.
     *
     * ```js
     * registerComponent('my-new-type', {
     *    myParam: {type: Type.Float, default: 42.0},
     * }, {
     *    init: function() {},
     *    start: function() {},
     *    update: function(dt) {},
     *    onActivate: function() {},
     *    onDeactivate: function() {},
     *    onDestroy: function() {},
     * });
     * ```
     *
     * @param name Name of the component.
     * @param params Dict of param names to {@link ComponentProperty}.
     * @param object Object containing functions for the component type.
     * @deprecated Use {@link WonderlandEngine.registerComponent:CLASSES} instead.
     */
    registerComponent(
        name: string,
        params: {[key: string]: ComponentProperty},
        object: ComponentProto
    ): void;
    /** @overload */
    registerComponent(...args: unknown[]): void {
        if (isString(args[0])) {
            /* Registration is using `name`, `params`, and `object`. */
            this.wasm._registerComponentLegacy(
                args[0],
                args[1] as {[key: string]: ComponentProperty},
                args[2] as ComponentProto
            );
            return;
        }
        for (const arg of args as ComponentConstructor[]) {
            this.wasm._registerComponent(arg, this.autoRegisterDependencies);
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
     * Request a XR session.
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
        optionalFeatures?: string[]
    ): Promise<XRSession> {
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
        return this.#wasm.webxr_request_session_func(
            mode,
            features,
            optionalFeatures ?? []
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

    /** Current WebXR session or `null` if no session active. */
    get xrSession(): XRSession | null {
        return this.#wasm.webxr_session;
    }

    /** Current WebXR frame or `null` if no session active. */
    get xrFrame(): XRFrame | null {
        return this.#wasm.webxr_frame;
    }

    /** Current WebXR frame or `null` if no session active. */
    get xrBaseLayer(): XRProjectionLayer | null {
        return this.#wasm.webxr_baseLayer;
    }

    /** Current WebXR WebGLFramebuffr or `null` if no session active. */
    get xrFramebuffer(): WebGLFramebuffer | null {
        if (!Array.isArray(this.wasm.webxr_fbo)) {
            return this.wasm.GL.framebuffers[this.wasm.webxr_fbo as number];
        }
        /* For now, we only use a single framebuffer. */
        return this.wasm.GL.framebuffers[this.wasm.webxr_fbo[0]];
    }

    /** Physics manager, only available when physx is enabled in the runtime. */
    get physics() {
        return this.#physics;
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
        /* For internal testing, we provide compatibility with DOM-less execution */
        this.canvas =
            typeof document === 'undefined'
                ? null
                : (document.getElementById('canvas') as HTMLCanvasElement);

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
}
