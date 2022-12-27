import {simd, threads} from 'wasm-feature-detect';

export * from './wonderland.js';

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
): Promise<void> {
    const {simdSupported, threadsSupported} = await detectFeatures();
    const {simd = simdSupported, threads = threadsSupported} = options;

    const filename = `${runtime}${simd ? '-simd' : ''}${threads ? '-threads' : ''}`;
    const r = await fetch(filename + '.wasm');
    const wasm = await r.arrayBuffer();
    return new Promise((res: () => void) => {
        window.Module = {
            worker: `${filename}.worker.js`,
            wasm,
        };
        window.Module.ready = function () {
            window._wl_application_start();
            res();
        };
        const s = document.createElement('script');
        s.type = 'text/javascript';
        s.src = `${filename}.js`;
        document.body.append(s);
    });
}
