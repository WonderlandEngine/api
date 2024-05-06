import {
    Component,
    ComponentConstructor,
    PhysXComponent,
    Object as Object3D,
    Physics,
    I18N,
    XR,
    MorphTargets,
    Texture,
    Font,
    DestroyedPrefabInstance,
} from './wonderland.js';

import {Emitter, RetainEmitter} from './utils/event.js';
import {isString} from './utils/object.js';
import {Version} from './version.js';
import {WASM} from './wasm.js';
import {Logger} from './utils/logger.js';
import {MaterialManager} from './resources/material-manager.js';
import {MeshManager} from './resources/mesh-manager.js';
import {ResourceManager} from './resources/resource.js';
import {TextureManager} from './resources/texture-manager.js';
import {LogTag} from './index.js';
import {Constructor, ImageLike, ProgressCallback} from './types.js';
import {Prefab, InMemoryLoadOptions, LoadOptions} from './prefab.js';
import {Scene, ActivateOptions} from './scene.js';
import {PrefabGLTF, GLTFOptions} from './scene-gltf.js';
import {onImageReady} from './utils/fetch.js';

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
     *
     * @deprecated Use {@link onSceneActivated} instead.
     */
    readonly onSceneLoaded = new Emitter();

    /**
     * {@link Emitter} for scene activated events.
     *
     * This listener is notified with the old scene as first parameter, and
     * the new scene as second.
     *
     * This listener is notified after all resources are loaded and all components had their
     * {@link Component#init()} as well as (if active)
     * {@link Component#start()} and {@link Component#onActivate()} methods
     * called.
     *
     * Usage from within a component:
     *
     * ```js
     * this.engine.onSceneActivated.add((oldScene, newScene) => {
     *     console.log(`Scene switch from ${oldScene.filename} to ${newScene.filename}`);
     * });
     * ```
     */
    readonly onSceneActivated = new Emitter<[Scene, Scene]>();

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
     * If `true`, the materials will be wrapped in a proxy to support pre-1.2.0
     * material access, i.e.,
     *
     * ```js
     * const material = new Material(engine, 'Phong Opaque');
     * material.diffuseColor = [1.0, 0.0, 0.0, 1.0];
     * ```
     *
     * If `false`, property accessors will not be available and material
     * properties should be accessed via methods, i.e.,
     *
     * ```js
     * const PhongOpaque = engine.materials.getTemplate('Phong Opaque');
     * const material = new PhongOpaque();
     * material.setDiffuseColor([1.0, 0.0, 0.0, 1.0]);
     * ...
     * const diffuse = material.getDiffuseColor();
     * ```
     *
     * When disabled, reading/writing to materials is slightly more efficient on the CPU.
     */
    legacyMaterialSupport = true;

    /**
     * Scene cache in scene manager.
     *
     * @hidden
     */
    _scenes: (Prefab | null)[] = [];

    /**
     * Currently active scene.
     *
     * @hidden
     */
    _scene: Scene = null!;

    /** @hidden */
    private _textures: TextureManager = null!;
    /** @hidden */
    private _materials: MaterialManager = null!;
    /** @hidden */
    private _meshes: MeshManager = null!;
    /** @hidden */
    private _morphTargets: ResourceManager<MorphTargets> = null!;
    /** @hidden */
    private _fonts: ResourceManager<Font> = null!;

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
     * Switch the current active scene.
     *
     * Once active, the scene will be updated and rendered on the canvas.
     *
     * The currently active scene is accessed via {@link WonderlandEngine.scene}:
     *
     * ```js
     * import {Component} from '@wonderlandengine/api';
     *
     * class MyComponent extends Component{
     *     start() {
     *         console.log(this.scene === this.engine.scene); // Prints `true`
     *     }
     * }
     * ```
     *
     * @note This method will throw if the scene isn't activatable.
     *
     * #### Component Lifecycle
     *
     * Marking a scene as active will:
     * * Call {@link Component#onDeactivate} for all active components of the previous scene
     * * Call {@link Component#onActivate} for all active components of the new scene
     *
     * #### Usage
     *
     * ```js
     * const scene = await engine.loadScene('Scene.bin');
     * engine.switchTo(scene);
     * ```
     *
     * @returns A promise that resolves once the scene is ready.
     *
     * @since 1.2.0
     */
    async switchTo(scene: Scene, opts: ActivateOptions = {}) {
        this.wasm._wl_deactivate_activeScene();

        /* Switch reference on engine **just** before activating, to allow
         * component to use `this.engine.scene` in `onActivate()`/`start()`. */
        const previous = this.scene;
        this._scene = scene;

        this.wasm._wl_scene_activate(scene._index);

        if (!this.onLoadingScreenEnd.isDataRetained) {
            this.onLoadingScreenEnd.notify();
        }

        /* For now, we always automatically download dependencies for
         * the user, i.e., separate textures.bin and languages.bin.
         *
         * In the future, we can eventually expose this in the chunk API
         * to give more control to the user if needed.
         *
         * We do not make the user wait until the textures download is complete. */
        scene._downloadDependencies();

        /* Update the current active scene in the physx manager */
        if (this.physics) (this.physics._hit._scene as Scene) = scene;

        await this.i18n.setLanguage(this.i18n.languageCode(0));

        const {dispatchReadyEvent = false} = opts;

        this.onSceneActivated.notify(previous, scene);

        if (dispatchReadyEvent) scene.dispatchReadyEvent();
    }

    /**
     * Load the scene from a URL, as the main scene of a new {@link Scene}.
     *
     * #### Usage
     *
     * ```js
     * // The method returns the main scene
     * const scene = await engine.loadMainScene();
     * ```
     *
     * #### Destruction
     *
     * Loading a new main scene entirely resets the state of the engine, and destroys:
     * - All loaded scenes, prefabs, and gltf files
     * - Meshes
     * - Textures
     * - Materials
     *
     * @note This method can only load Wonderland Engine `.bin` files.
     *
     * @param url The URL pointing to the scene to load.
     * @param progress Optional progress callback.
     * @returns The main scene of the new {@link Scene}.
     */
    async loadMainScene(
        opts: LoadOptions & ActivateOptions,
        progress: ProgressCallback = () => {}
    ) {
        const options = await Scene.loadBuffer(opts, progress);
        return this.loadMainSceneFromBuffer(options);
    }

    /**
     * Similar to {@link WonderlandEngine.loadMainScene}, but loading is done from an ArrayBuffer.
     *
     * @param options An object containing the buffer and extra metadata.
     * @returns The main scene of the new {@link Scene}.
     */
    async loadMainSceneFromBuffer(options: InMemoryLoadOptions & ActivateOptions) {
        const {buffer, url} = Prefab.validateBufferOptions(options);

        const wasm = this.#wasm;

        /*
         * - Deactivate currently active scene
         * - Destroy all scenes
         * - Mark all resources as destroyed
         * - Activation of main scene to prevent the runtime to be in limbo
         */

        wasm._wl_deactivate_activeScene();

        /* Only destroy all scene once the current active one is disabled */
        for (let i = this._scenes.length - 1; i >= 0; --i) {
            const scene = this._scenes[i];
            if (scene) scene.destroy();
        }

        /* Mark all resources as destroyed */
        this._textures._clear();
        this._materials._clear();
        this._meshes._clear();
        this._morphTargets._clear();

        const ptr = wasm.copyBufferToHeap(buffer);
        let index = -1;
        try {
            index = wasm._wl_load_main_scene(ptr, buffer.byteLength, wasm.tempUTF8(url));
        } finally {
            /* Catch calls to abort(), e.g. via asserts */
            wasm._free(ptr);
        }

        if (index === -1) throw new Error('Failed to load main scene');

        const mainScene = this._reload(index);

        /**
         * @todo(2.0.0)
         *
         * Backward compatibility: We need to set this instance reference on the
         * engine **before** component creation occurs, since users have been accessing
         * the scene with `this.engine.scene` in `init()`.
         */
        let previous = this.scene;
        this._scene = mainScene;

        mainScene._initialize();
        this._scene = previous;

        await this.switchTo(mainScene, options);

        return mainScene;
    }

    /**
     * Load a {@link Prefab} from a URL.
     *
     * #### Usage
     *
     * ```js
     * const prefab = await engine.loadPrefab('Prefab.bin');
     * ```
     *
     * @note This method can only load Wonderland Engine `.bin` files.
     * @note This method is a wrapper around {@link WonderlandEngine.loadPrefabFromBuffer}.
     *
     * @param url The URL pointing to the prefab to load.
     * @param progress Optional progress callback.
     * @returns The loaded {@link Prefab}.
     */
    async loadPrefab(opts: LoadOptions, progress: ProgressCallback = () => {}) {
        const options = await Scene.loadBuffer(opts, progress);
        return this.loadPrefabFromBuffer(options);
    }

    /**
     * Similar to {@link WonderlandEngine.loadPrefab}, but loading is done from an ArrayBuffer.
     *
     * @param options An object containing the buffer and extra metadata.
     * @returns A new loaded {@link Prefab}.
     */
    loadPrefabFromBuffer(options: InMemoryLoadOptions) {
        const scene = this._loadSceneFromBuffer(Prefab, options);
        if (this.wasm._wl_scene_activatable(scene._index)) {
            this.wasm._wl_scene_destroy(scene._index);
            throw new Error(
                'File is not a prefab. To load a scene, use loadScene() instead'
            );
        }
        scene._initialize();
        return scene;
    }

    /**
     * Load a scene from a URL.
     *
     * At the opposite of {@link WonderlandEngine.loadMainScene}, the scene loaded
     * will be added to the list of existing scenes, and its resources will be made
     * available for other scenes/prefabs/gltf to use.
     *
     * #### Resources Sharing
     *
     * Upon loading, the scene resources are added in the engine, and references
     * to those resources are updated.
     *
     * It's impossible for a scene loaded with this method to import pipelines.
     * Thus, the loaded scene will reference existing pipelines in the main scene,
     * based on their names.
     *
     * #### Usage
     *
     * ```js
     * const scene = await engine.loadScene('Scene.bin');
     * ```
     *
     * @note This method can only load Wonderland Engine `.bin` files.
     * @note This method is a wrapper around {@link WonderlandEngine#loadSceneFromBuffer}.
     *
     * @param url The URL pointing to the scene to load.
     * @param progress Optional progress callback.
     * @returns A new loaded {@link Scene}.
     */
    async loadScene(opts: LoadOptions, progress: ProgressCallback = () => {}) {
        const options = await Scene.loadBuffer(opts, progress);
        return this.loadSceneFromBuffer(options);
    }

    /**
     * Create a glTF scene from a URL.
     *
     * @note This method is a wrapper around {@link WonderlandEngine.loadGLTFFromBuffer}.
     *
     * @param options The URL as a string, or an object of the form {@link GLTFOptions}.
     * @param progress Optional progress callback.
     * @returns A new loaded {@link PrefabGLTF}.
     */
    async loadGLTF(opts: LoadOptions<GLTFOptions>, progress: ProgressCallback = () => {}) {
        const memOptions = await Scene.loadBuffer(opts as LoadOptions, progress);
        const options = isString(opts) ? memOptions : {...opts, ...memOptions};
        return this.loadGLTFFromBuffer(options);
    }

    /**
     * Similar to {@link WonderlandEngine.loadScene}, but loading is done from an ArrayBuffer.
     *
     * @throws If the scene is streamable.
     *
     * @param options An object containing the buffer and extra metadata.
     * @returns A new loaded {@link Scene}.
     */
    loadSceneFromBuffer(options: InMemoryLoadOptions) {
        const scene = this._loadSceneFromBuffer(Scene, options);
        if (!this.wasm._wl_scene_activatable(scene._index)) {
            this.wasm._wl_scene_destroy(scene._index);
            throw new Error(
                'File is not a scene. To load a prefab, use loadPrefab() instead'
            );
        }
        scene._initialize();
        return scene;
    }

    /**
     * Similar to {@link WonderlandEngine.loadGLTF}, but loading is done from an ArrayBuffer.
     *
     * @param options An object containing the buffer and extra glTF metadata.
     * @returns A new loaded {@link PrefabGLTF}.
     */
    loadGLTFFromBuffer(options: InMemoryLoadOptions & GLTFOptions) {
        Scene.validateBufferOptions(options);
        const {buffer, extensions = false} = options;

        const wasm = this.wasm;
        const ptr = wasm.copyBufferToHeap(buffer);

        try {
            const index = wasm._wl_glTF_scene_create(extensions, ptr, buffer.byteLength);
            const scene = new PrefabGLTF(this, index);
            this._scenes[scene._index] = scene;
            return scene;
        } finally {
            /* Catch calls to abort(), e.g. via asserts */
            wasm._free(ptr);
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
     * @deprecated Use {@link Scene#wrap} instead.
     *
     * @returns The object
     */
    wrapObject(objectId: number): Object3D {
        return this.scene.wrap(objectId);
    }

    toString() {
        return 'engine';
    }

    /* Public Getters & Setter */

    /** Currently active scene. */
    get scene(): Scene {
        return this._scene;
    }

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

    /** Texture resources */
    get textures() {
        return this._textures;
    }

    /** Material resources */
    get materials() {
        return this._materials;
    }

    /** Mesh resources */
    get meshes() {
        return this._meshes;
    }

    /** Morph target set resources */
    get morphTargets() {
        return this._morphTargets;
    }

    /** Font resources */
    get fonts() {
        return this._fonts;
    }

    /** Get all uncompressed images. */
    get images(): ImageLike[] {
        const wasm = this.wasm;
        const max = wasm._tempMemSize >> 1;
        const count = wasm._wl_get_images(wasm._tempMem, max);
        const result = new Array(count);
        for (let i = 0; i < count; ++i) {
            const index = wasm._tempMemUint16[i];
            result[i] = wasm._images[index];
        }
        return result;
    }

    /**
     * Promise that resolve once all uncompressed images are loaded.
     *
     * This is equivalent to calling {@link WonderlandEngine.images}, and wrapping each
     * `load` listener into a promise.
     */
    get imagesPromise(): Promise<ImageLike[]> {
        const promises = this.images.map((i) => onImageReady(i));
        return Promise.all(promises);
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
                        const physxA = this.scene._components.wrapPhysx(a)!;
                        const physxB = this.scene._components.wrapPhysx(b)!;
                        const callback = physics._callbacks[physxA._id][index];
                        callback(type, physxB as PhysXComponent);
                    },
                    'viiii'
                )
            );
            this.#physics = physics;
        }

        this.resize(this.canvas.clientWidth, this.canvas.clientHeight);
        this._scene = this._reload(0);
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
    _reset() {
        this.wasm.reset();
        this._scenes.length = 0;
        this._scene = this._reload(0);
        this.switchTo(this._scene);
    }

    /**
     * Add an empty scene.
     *
     * @returns The newly created scene
     *
     * @hidden
     */
    _createEmpty(): Scene {
        const wasm = this.wasm;
        const index = wasm._wl_scene_create_empty();
        const scene = new Scene(this, index);
        this._scenes[index] = scene;
        return scene;
    }

    /** @hidden */
    _destroyScene(instance: Prefab) {
        const wasm = this.wasm;
        wasm._wl_scene_destroy(instance._index);

        const index = instance._index;
        (instance._index as number) = -1;
        if (this.erasePrototypeOnDestroy) {
            Object.setPrototypeOf(instance, DestroyedPrefabInstance);
        }

        this._scenes[index] = null;
    }

    /**
     * Reload the state of the engine with a new main scene.
     *
     * @param index Scene index.
     *
     * @hidden
     */
    private _reload(index: number) {
        const scene = new Scene(this, index);
        this._scenes[index] = scene;

        this._textures = new TextureManager(this);
        this._materials = new MaterialManager(this);
        this._meshes = new MeshManager(this);
        this._morphTargets = new ResourceManager(this, MorphTargets);
        this._fonts = new ResourceManager(this, Font);

        return scene;
    }

    /**
     * Helper to load prefab and activatable scene.
     *
     * @param options Loading options.
     * @returns The the loaded prefab.
     *
     * @hidden
     */
    private _loadSceneFromBuffer<T extends Prefab>(
        PrefabClass: Constructor<T>,
        options: InMemoryLoadOptions
    ) {
        const {buffer, url} = Scene.validateBufferOptions(options);

        const wasm = this.wasm;
        const ptr = wasm.copyBufferToHeap(buffer);

        let index = -1;

        try {
            index = wasm._wl_scene_create(ptr, buffer.byteLength, wasm.tempUTF8(url));
        } finally {
            /* Catch calls to abort(), e.g. via asserts */
            wasm._free(ptr);
        }

        if (!index) throw new Error('Failed to parse scene');

        /** The scene was successfully loaded on the wasm side, we need to
         * add it to the scene cache, since the wasm might read it. */
        const scene = new PrefabClass(this, index);
        this._scenes[index] = scene;
        return scene;
    }
}
