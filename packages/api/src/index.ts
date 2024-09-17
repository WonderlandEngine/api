import {simd, threads} from 'wasm-feature-detect';
import {WonderlandEngine} from './engine.js';
import {LogLevel} from './utils/logger.js';
import {WASM} from './wasm.js';

import {APIVersion, Version} from './version.js';
import {getBaseUrl} from './utils/fetch.js';

export * from './utils/index.js';
export * from './decorators.js';
export * from './wonderland.js';
export * from './engine.js';
export * from './property.js';
export * from './prefab.js';
export * from './scene.js';
export * from './scene-gltf.js';
export * from './resources/resource.js';
export * from './resources/material-manager.js';
export * from './resources/mesh-manager.js';
export * from './resources/texture-manager.js';
export * from './types.js';
export * from './version.js';
export * from './wasm.js';

/** Relative default path for the loading screen. */
const LOADING_SCREEN_PATH = 'WonderlandRuntime-LoadingScreen.bin';

function loadScript(scriptURL: string): Promise<void> {
    return new Promise((res: () => void, rej) => {
        const s = document.createElement('script');
        const node = document.body.appendChild(s);
        s.onload = () => {
            document.body.removeChild(node);
            res();
        };
        s.onerror = (e) => {
            document.body.removeChild(node);
            rej(e);
        };
        s.src = scriptURL;
    });
}

/**
 * Finds whether simd & threading are supported or not.
 *
 * @returns An object containing boolean for simd and thread.
 */
async function detectFeatures(): Promise<{
    simdSupported: boolean;
    threadsSupported: boolean;
}> {
    let [simdSupported, threadsSupported] = await Promise.all([simd(), threads()]);
    if (simdSupported) {
        console.log('WASM SIMD is supported');
    } else {
        console.warn('WASM SIMD is not supported');
    }
    if (threadsSupported) {
        if (self.crossOriginIsolated) {
            console.log('WASM Threads is supported');
        } else {
            console.warn(
                'WASM Threads is supported, but the page is not crossOriginIsolated, therefore thread support is disabled.'
            );
        }
    } else {
        console.warn('WASM Threads is not supported');
    }

    threadsSupported = threadsSupported && self.crossOriginIsolated;
    return {
        simdSupported,
        threadsSupported,
    };
}

/**
 * Options for {@link LoadRuntimeOptions.xrOfferSession}
 *
 * @since 1.1.5
 */
export interface XROfferSessionOptions {
    /**
     * Mode to offer XR session with. If set to `'auto'`, offers a session
     * with the first supported mode in the following order:
     * - VR
     * - AR
     * - inline
     */
    mode: XRSessionMode | 'auto';
    /** Required features for the offered XR session */
    features: string[];
    /** Optional features for the offered XR session */
    optionalFeatures: string[];
}

/**
 * Options to forward to {@link loadRuntime}
 */
export interface LoadRuntimeOptions {
    /**
     * If `true`, forces the runtime to load the SIMD-compatible version.
     * If `undefined`, performs browser feature detection to check whether SIMD is supported or not.
     */
    simd: boolean;
    /**
     * If `true`, forces the runtime to load the threads-compatible version.
     * If `undefined`, performs browser feature detection to check whether threads are supported or not.
     */
    threads: boolean;
    /**
     * If `true`, forces the runtime to load the webgpu-compatible version.
     */
    webgpu: boolean;
    /**
     * If `true`, forces the runtime to load a physx-compatible version.
     *
     * **Note**: If your scene uses physx, you **must** enable this option.
     */
    physx: boolean;
    /**
     * If `true`, forces the runtime to load a loader-compatible version.
     *
     * This option allows to load gltf data at runtime.
     */
    loader: boolean;
    /**
     * Path to the loading screen. If `undefined`, defaults to 'WonderlandRuntime-LoadingScreen.bin'.
     * Beware that these are special .bin files signed by Wonderland. Customizing
     * requires an enterprise license, please reach out for more information.
     */
    loadingScreen: string;

    /**
     * Default framebuffer scale factor. This can later be changed using
     * {@link WonderlandEngine.xrFramebufferScaleFactor}
     */
    xrFramebufferScaleFactor: number;

    /**
     * Whether to advertise AR/VR session support to the browser.
     *
     * Adds an interactive UI element to the browser interface to start an XR
     * session. Browser support is optional, so it's advised to still allow
     * requesting a session with a UI element on the website itself.
     *
     * If `undefined`, no XR session is automatically offered to the browser.
     *
     * @since 1.1.5
     */
    xrOfferSession: XROfferSessionOptions;

    /**
     * Canvas id or element. If this is `undefined`, looks for a canvas with id 'canvas'.
     */
    canvas: string;

    /**
     * Logging level(s) to enable.
     *
     * By default, all levels are enabled.
     */
    logs: LogLevel[];
}

/* Global boolean to check if AR/VR is supported. */
const xrSupported: {ar: boolean; vr: boolean} = {
    ar: null!,
    vr: null!,
};

/**
 * Check whether XR is supported and store the result in the global space.
 */
function checkXRSupport(): Promise<{ar: boolean; vr: boolean}> {
    if (typeof navigator === 'undefined' || !navigator.xr) {
        xrSupported.vr = false;
        xrSupported.ar = false;
        return Promise.resolve(xrSupported);
    }
    const vrPromise =
        xrSupported.vr !== null
            ? Promise.resolve()
            : navigator.xr
                  .isSessionSupported('immersive-vr')
                  .then((supported) => (xrSupported.vr = supported))
                  /* This can happen if the application is embedded in an iframe without
                   * xr-spatial-tracking permission. navigator.xr will be available, but
                   * any access of it will throw. */
                  .catch(() => (xrSupported.vr = false));
    const arPromise =
        xrSupported.ar !== null
            ? Promise.resolve()
            : navigator.xr
                  .isSessionSupported('immersive-ar')
                  .then((supported) => (xrSupported.ar = supported))
                  /* This can happen if the application is embedded in an iframe without
                   * xr-spatial-tracking permission. navigator.xr will be available, but
                   * any access of it will throw. */
                  .catch(() => (xrSupported.ar = false));

    return Promise.all([vrPromise, arPromise]).then(() => xrSupported);
}

/**
 * Ensures that this API is compatible with the given
 * runtime version.
 *
 * We only enforce compatibility for major and minor components, i.e.,
 * the runtime and the API must both be of the form `x.y.*`.
 *
 * @throws If the major or the minor components are different.
 *
 * @param version The target version
 */
export function checkRuntimeCompatibility(version: Version) {
    const {major, minor} = version;

    let majorDiff = major - APIVersion.major;
    let minorDiff = minor - APIVersion.minor;
    /* Same version, so perfectly compatible. */
    if (!majorDiff && !minorDiff) return;

    const error =
        'checkRuntimeCompatibility(): Version compatibility mismatch:\n' +
        '\t→ API and runtime compatibility is enforced on a patch level (versions x.y.*)\n';

    const isRuntimeOlder = majorDiff < 0 || (!majorDiff && minorDiff < 0);
    if (isRuntimeOlder) {
        /* Runtime is out of date. */
        throw new Error(
            `${error}\t→ Please use a Wonderland Engine editor version >= ${APIVersion.major}.${APIVersion.minor}.*`
        );
    }
    /* API is out of date. */
    throw new Error(
        `${error}\t→ Please use a new API version >= ${version.major}.${version.minor}.*`
    );
}

/**
 * Load the runtime using the WASM and JS files.
 *
 * @param runtime The runtime base string, e.g,: `WonderlandRuntime-loader-physx`.
 * @param options Options to modify the loading behaviour.
 *
 * @returns A promise that resolves when the engine is ready to be used.
 */
export async function loadRuntime(
    runtime: string,
    options: Partial<LoadRuntimeOptions> = {}
): Promise<WonderlandEngine> {
    const xrPromise = checkXRSupport();

    const baseURL = getBaseUrl(runtime);

    const {simdSupported, threadsSupported} = await detectFeatures();
    const {
        simd = simdSupported,
        threads = threadsSupported,
        webgpu = false,
        physx = false,
        loader = false,
        xrFramebufferScaleFactor = 1.0,
        xrOfferSession = null,
        loadingScreen = baseURL ? `${baseURL}/${LOADING_SCREEN_PATH}` : LOADING_SCREEN_PATH,
        canvas = 'canvas',
        logs = [LogLevel.Info, LogLevel.Warn, LogLevel.Error],
    } = options;

    const variant = [];
    if (webgpu) variant.push('webgpu');
    if (loader) variant.push('loader');
    if (physx) variant.push('physx');
    if (simd) variant.push('simd');
    if (threads) variant.push('threads');

    const variantStr = variant.join('-');

    let filename = runtime;
    if (variantStr) filename = `${filename}-${variantStr}`;

    const download = function (
        filename: string,
        errorMessage: string
    ): Promise<ArrayBuffer> {
        return fetch(filename)
            .then((r) => {
                if (!r.ok) return Promise.reject(errorMessage);
                return r.arrayBuffer();
            })
            .catch((_) => Promise.reject(errorMessage));
    };

    const [wasmData, loadingScreenData] = await Promise.all([
        download(`${filename}.wasm`, `Failed to fetch runtime .wasm file: ${filename}`),
        download(loadingScreen, 'Failed to fetch loading screen file'),
    ]);

    const canvasElement = document.getElementById(canvas) as HTMLCanvasElement;
    if (!canvasElement) {
        throw new Error(`loadRuntime(): Failed to find canvas with id '${canvas}'`);
    }
    if (!(canvasElement instanceof HTMLCanvasElement)) {
        throw new Error(`loadRuntime(): HTML element '${canvas}' must be a canvas`);
    }

    const wasm = new WASM(threads);
    (wasm.worker as string) = `${filename}.worker.js`;
    (wasm.wasm as ArrayBuffer) = wasmData;
    (wasm.canvas as HTMLCanvasElement) = canvasElement;
    wasm._log.levels.enable(...logs);

    if (webgpu) {
        const adapter = await (navigator as any).gpu.requestAdapter();
        const desc = {
            requiredFeatures: ['texture-compression-bc'],
        };
        const device = await adapter.requestDevice(desc);
        (wasm.preinitializedWebGPUDevice as any) = device;
    }

    const engine = new WonderlandEngine(wasm, loadingScreenData);

    if (!window._WL) {
        window._WL = {runtimes: {}};
    }
    const runtimes = window._WL.runtimes;

    /* Global identifier of this runtime in `window`. */
    const runtimeGlobalId = variantStr ? variantStr : 'default';
    /* Only load the runtime if not previously loaded in the page */
    if (!runtimes[runtimeGlobalId]) {
        await loadScript(`${filename}.js`);
        runtimes[runtimeGlobalId] = window.instantiateWonderlandRuntime!;
        window.instantiateWonderlandRuntime = undefined;
    }
    await runtimes[runtimeGlobalId](wasm);
    engine._init();

    /* Throws if the runtime isn't compatible with the API. */
    checkRuntimeCompatibility(engine.runtimeVersion);

    const xr = await xrPromise;
    (engine.arSupported as boolean) = xr.ar;
    (engine.vrSupported as boolean) = xr.vr;
    engine.xrFramebufferScaleFactor = xrFramebufferScaleFactor;

    engine.autoResizeCanvas = true;
    engine.start();

    if (xrOfferSession !== null) {
        let mode = xrOfferSession.mode;
        if (mode == 'auto') {
            if (engine.vrSupported) {
                mode = 'immersive-vr';
            } else if (engine.arSupported) {
                mode = 'immersive-ar';
            } else {
                mode = 'inline';
            }
        }

        const offerSession = function () {
            engine
                .offerXRSession(
                    mode as XRSessionMode,
                    xrOfferSession.features,
                    xrOfferSession.optionalFeatures
                )
                .then(
                    /* When the session ends, offer to start a new one again */
                    (s) => s.addEventListener('end', offerSession)
                )
                /* The browser may not suppoer offer session, or a previous request
                 * was replaced by a new one. Not crucial, but inform the user. */
                .catch(console.warn);
        };

        offerSession();
    }

    return engine;
}
