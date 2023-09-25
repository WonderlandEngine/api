import {loadRuntime, LoadRuntimeOptions, WonderlandEngine} from '..';

export let WL: WonderlandEngine = null!;

/**
 * Creates a new engine:
 *     - Load emscripten code + wasm
 *     - Wait until the engine is ready to be use
 *
 * For now, engines are stored globally in the page, you **must**
 * thus call this function before and test, in order to clean any
 * previous engine instance running and create a new one.
 */
export async function init(options: Partial<LoadRuntimeOptions> = {}) {
    const canvas = document.createElement('canvas');
    canvas.id = 'canvas';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    document.body.append(canvas);

    const {simd = false, threads = false, loader = false, physx = false} = options;

    const engine = await loadRuntime('deploy/WonderlandRuntime', {
        simd,
        threads,
        loader,
        physx,
        loadingScreen: 'deploy/WonderlandRuntime-LoadingScreen.bin',
        canvas: 'canvas',
    });
    engine.autoResizeCanvas = false;
    engine.resize(canvas.clientWidth, canvas.clientHeight);

    WL = engine;
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
    if (!WL) return;
    WL._reset();
}

/**
 * Create a URL pointing inside the test projects folder.
 *
 * @param filename The name of the file to point to
 * @returns A string pointing inside `test/resources/projects`
 */
export function projectURL(filename: string) {
    return `test/resources/projects/${filename}`;
}

/**
 * Create a URL pointing inside the test resources folder.
 *
 * @param filename The name of the file to point to
 * @returns A string pointing inside `test/resources/projects`
 */
export function resourceURL(filename: string) {
    return `test/resources/${filename}`;
}
