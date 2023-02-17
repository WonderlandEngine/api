import {simd, threads} from 'wasm-feature-detect';
import {WonderlandEngine} from './engine.js';
import {WASM} from './wasm.js';

import * as API from './wonderland.js';

export * from './wonderland.js';
export * from './engine.js';
export * from './wasm.js';

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
    const {simdSupported, threadsSupported} = await detectFeatures();
    const {
        simd = simdSupported,
        threads = threadsSupported,
        physx = false,
        loader = false,
    } = options;

    const filename = `${runtime}${loader ? '-loader' : ''}${physx ? '-physx' : ''}${
        simd ? '-simd' : ''
    }${threads ? '-threads' : ''}`;
    const r = await fetch(filename + '.wasm');
    if (!r.ok) {
        return Promise.reject('Failed to fetch runtime .wasm file');
    }

    const wasm = new WASM(threads);
    wasm.worker = `${filename}.worker.js`;
    wasm.wasm = await r.arrayBuffer();

    await new Promise<void>((res: () => void, rej: (reason: string) => void) => {
        wasm.onReady = res;
        window.Module = wasm;
        const s = document.createElement('script');
        s.type = 'text/javascript';
        s.src = `${filename}.js`;
        s.onerror = function () {
            rej('Failed to fetch runtime .js file');
        };
        document.body.append(s);
    });

    const engine = new WonderlandEngine(wasm);
    engine.start();
    /* Backward compatibility. @todo Remove at 1.0.0 */
    Object.assign(engine, API);
    /* @ts-ignore */
    window.WL = engine;
    return engine;
}
