import { loadRuntime } from '../index.js';

/**
 * Creates a new engine:
 *     - Load emscripten code + wasm
 *     - Wait until the engine is ready to be use
 *
 * For now, engines are stored globally in the page, you **must**
 * thus call this function before and test, in order to clean any
 * previous engine instance running and create a new one.
 */
export async function init({ physx = false } = {}) {
    /*
     * Clear previous data.
     *
     * TODO: This will not be required when the api is migrated to
     * true es6 isolated modules. */

    /* Needed to avoid race condition with previous engine that
     * would already be running a requestAnimationFrame.
     *
     * @todo Remove this code when engine is built as a module. */
    if(window._wl_application_stop) { window._wl_application_stop(); }

    document.body.innerHTML = '';
    window.Module = {};

    const canvas = document.createElement('canvas');
    canvas.id = 'canvas';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    document.body.append(canvas);

    const engine = await loadRuntime('deploy/WonderlandRuntime', {simd: false, threads: false, loader: true, physx});
    window.WL = engine;
    /* Needed to avoid race condition with previous engine that
     * would already be running a requestAnimationFrame.
     *
     * @todo Remove this code when engine is built as a module. */
    engine.start();
}

/**
 * Resets the runtime, i.e.,
 *     - Removes all loaded textures
 *     - Clears the scene
 *     - Clears component cache
 *
 * Should be called before running a test to prevent side effects.
 */
 export function reset() {
    if(!WL) return;
    WL._reset();
}
