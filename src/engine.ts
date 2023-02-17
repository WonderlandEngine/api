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
    CustomParameter,
    Texture,
    Object as Object3D,
    Scene,
    Type,
    Physics,
} from './wonderland.js';

import {isString} from './utils/object.js';
import {WASM} from './wasm.js';

/**
 * Callback triggered when the session starts.
 *
 * Used in {@link WonderlandEngine.onXRSessionStart}.
 *
 * @param session The session that started
 */
export type XrSessionStartCallback = (session: XRSession) => void;

/**
 * Callback triggered for supported / unsupported session.
 *
 * Used in {@link WonderlandEngine.onXRSupported}.
 *
 * @param type Type of session which is supported/not supported. Either `'vr'` or `'ar'`.
 * @param supported Whether given session type is supported.
 */
export type XrSupportCallback = (type: string, supported: boolean) => void;

/**
 * Callback triggered when the scene is loaded.
 *
 * Used in {@link WonderlandEngine.onSceneLoaded}.
 */
export type SceneLoadedCallback = () => void;

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
 * Default component parameter value per type.
 */
const _componentDefaults = new Array(11);
_componentDefaults[Type.Bool] = false;
_componentDefaults[Type.Int] = 0;
_componentDefaults[Type.Float] = 0.0;
_componentDefaults[Type.String] = '';
_componentDefaults[Type.Enum] = 0;
_componentDefaults[Type.Object] = null;
_componentDefaults[Type.Mesh] = null;
_componentDefaults[Type.Texture] = null;
_componentDefaults[Type.Material] = null;
_componentDefaults[Type.Animation] = null;
_componentDefaults[Type.Skin] = null;

/**
 * Setup the defaults value of the properties on a given
 * component class.
 *
 * @param ctor The component class
 */
function _setupDefaults(ctor: ComponentConstructor) {
    for (const name in ctor.Properties) {
        const p = ctor.Properties[name];
        p.default = p.default || _componentDefaults[p.type];
        ctor.prototype[name] = p.default;
    }
}

/**
 * Main Wonderland Engine instance.
 *
 * Controls the canvas, rendering, and JS <-> WASM communication.
 */
export class WonderlandEngine {
    /**
     * List of functions to call if a WebXR session is started.
     */
    readonly onXRSessionStart: XrSessionStartCallback[] = [
        (s) => ((this.xrSession as XRSession) = s),
    ];

    /**
     * List of functions to call if a WebXR session ends.
     */
    readonly onXRSessionEnd: (() => void)[] = [() => ((this.xrSession as null) = null)];

    /**
     * Whether AR is supported by the browser.
     *
     * `undefined` until support could be determined.
     */
    readonly arSupported: boolean | undefined = undefined;

    /**
     * Whether VR is supported by the browser.
     *
     * `undefined` until support could be determined.
     */
    readonly vrSupported: boolean | undefined = undefined;

    /**
     * List of functions to call once VR/AR support has been determined.
     *
     * Will be called once for AR and once for VR independent of support for each.
     * This allows you to notify the user of both cases: support and missing support of XR.
     * See the `supported` parameter of the callback, which indicates support.
     */
    readonly onXRSupported: XrSupportCallback[] = [
        (type, supported) => {
            if (type == 'ar') {
                (this.arSupported as boolean) = supported;
            }
            if (type == 'vr') {
                (this.vrSupported as boolean) = supported;
            }
        },
    ];

    /**
     * Current WebXR session or `null` if no session active.
     */
    readonly xrSession: XRSession | null = null;

    /**
     * List of functions to call once the main scene has been loaded.
     */
    readonly onSceneLoaded: SceneLoadedCallback[] = [];

    /**
     * Current main scene.
     */
    readonly scene: Scene;

    /**
     * Physics manager, only available when physx is enabled in the runtime.
     */
    readonly physics: Physics | null;

    /**
     * Canvas element that Wonderland Engine renders to.
     */
    canvas: HTMLCanvasElement | null;

    /**
     * Access to the textures managed by Wonderland Engine.
     */
    textures: TextureCache;

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
     * Create a new engine instance.
     *
     * @param wasm Wasm bridge instance
     *
     * @hidden
     */
    constructor(wasm: WASM) {
        this.#wasm = wasm;
        this.#wasm['_setEngine'](this); /* String lookup to bypass private. */

        this.scene = new Scene(this);
        /* For internal testing, we provide compatibility with DOM-less execution */
        this.canvas =
            typeof document === 'undefined'
                ? null
                : (document.getElementById('canvas') as HTMLCanvasElement);

        this.textures = {
            /* Backward compatibility. @todo: Remove at 1.0.0. */
            load: (filename: string, crossOrigin?: string) => {
                let image = new Image();
                if (crossOrigin !== undefined) {
                    image.crossOrigin = crossOrigin;
                }
                image.src = filename;
                return new Promise((resolve, reject) => {
                    image.onload = function () {
                        let texture = new Texture(image);
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

        this._componentCache = {};
        this._objectCache.length = 0;

        /* Setup the error handler. This is used to to manage native errors. */
        _wl_set_error_callback(
            addFunction(function (messagePtr: number) {
                throw new Error(UTF8ToString(messagePtr));
            }, 'vi')
        );

        this.physics = null;
        if (wasm.withPhysX) {
            /* Setup the physics callback. */
            const physics = new Physics(this);
            _wl_physx_set_collision_callback(
                addFunction((a: number, index: number, type: number, b: number) => {
                    const callback = physics._callbacks[a][index];
                    const component = new PhysXComponent(
                        this,
                        Object3D._typeIndexFor('physx'),
                        b
                    );
                    callback(type, component);
                }, 'viiii')
            );
            this.physics = physics;
        }
    }

    /**
     * Start the engine if it's not already running.
     *
     * When using the {@link loadRuntime} function, this method is called
     * automatically.
     */
    start(): void {
        window._wl_application_start();
    }

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
     * @param params Dict of param names to {@link CustomParameter}.
     * @param object Object containing functions for the component type.
     * @deprecated Use {@link WonderlandEngine.registerComponent:CLASSES} instead.
     */
    registerComponent(
        name: string,
        params: {[key: string]: CustomParameter},
        object: ComponentProto
    ): void;
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
    /** @overload */
    registerComponent(...args: unknown[]): void {
        if (isString(args[0])) {
            /* Registration is using `name`, `params`, and `object`. */
            const typeIndex = this.wasm._registerComponentLegacy(
                args[0] as string,
                args[1] as {[key: string]: CustomParameter},
                args[2] as ComponentProto
            );
            const ctor = this.wasm._componentTypes[typeIndex] as ComponentConstructor;
            _setupDefaults(ctor);
            return;
        }
        for (const arg of args) {
            const typeIndex = this.wasm._registerComponent(arg as ComponentConstructor);
            const ctor = this.wasm._componentTypes[typeIndex] as ComponentConstructor;
            _setupDefaults(ctor);
        }
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
        o.objectId = objectId;
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

    /* Internal-Only Methods */

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
