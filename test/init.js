import { loadRuntime } from '../index.js';

import * as WL from '../wonderland.js';

/**
 * Creates a new engine:
 *     - Load emscripten code + wasm
 *     - Wait until the engine is ready to be use
 *
 * For now, engines are stored globally in the page, you **must**
 * thus call this function before and test, in order to clean any
 * previous engine instance running and create a new one.
 */
export async function init() {
    window.WL = WL;

    /*
     * Clear previous data.
     *
     * TODO: This will not be required when the api is migrated to
     * true es6 isolated modules. */

    /* Needed to avoid race condition with previous engine that
     * would already be running a requestAnimationFrame.
     *
     * TODO: remove this code when engine is built as a module. */
    if(window._wl_application_stop) { window._wl_application_stop(); }

    document.body.innerHTML = '';
    window.Module = {};

    const canvas = document.createElement('canvas');
    canvas.id = 'canvas';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    document.body.append(canvas);

    await loadRuntime('deploy/WonderlandRuntime', {simd: false, threads: false});

    /* Needed to avoid race condition with previous engine that
     * would already be running a requestAnimationFrame.
     *
     * TODO: remove this code when engine is built as a module. */
    window._wl_application_start();
}
