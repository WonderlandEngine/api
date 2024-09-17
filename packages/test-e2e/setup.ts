import {
    InMemoryLoadOptions,
    loadRuntime,
    LoadRuntimeOptions,
    LogLevel,
    Scene,
    Version,
    WonderlandEngine,
} from '@wonderlandengine/api';

export type DescribeSceneContext = {active: boolean; scene: Scene};
export type DescribeSceneTestCallback = (ctx: DescribeSceneContext) => void;

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
        logs: [LogLevel.Error],
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
    WL.erasePrototypeOnDestroy = false;
    (WL._useChunkLoading as boolean) = true;
    WL.log.levels.disableAll().enable(LogLevel.Error);
    return WL._reset();
}

/**
 * Create a URL pointing inside the test projects folder.
 *
 * @param filename The name of the file to point to
 * @returns A string pointing inside `test/resources/projects`
 */
export function projectURL(filename: string) {
    return `resources/projects/${filename}`;
}

/**
 * Create a URL pointing inside the test resources folder.
 *
 * @param filename The name of the file to point to
 * @returns A string pointing inside `test/resources`
 */
export function resourceURL(filename: string) {
    return `resources/${filename}`;
}

/*
 * Check whether the `target` version is anterior to `base`.
 *
 * @param target The version to check.
 * @param base The base version to compare against.
 * @returns `true` if `target` is less than `base`, `false` otherwise.
 */
export function versionLess(target: Version, base: Version) {
    for (const component of ['major', 'minor', 'patch'] as (keyof Version)[]) {
        if (target[component] == base[component]) continue;
        if (target[component] < base[component]) return true;
        if (target[component] > base[component]) return false;
    }
    return target.rc !== 0 && (base.rc == 0 || target.rc < base.rc);
}

/**
 * Create two describe blocks, for active and inactive scene tests.
 *
 * @note The scene will be reset between each test.
 *
 * @param cb The test callback to register.
 */
export function describeScene(name: string, cb: DescribeSceneTestCallback) {
    describe('Active Scene', function () {
        describe(name, function () {
            const ctx: {active: boolean; scene: Scene} = {active: true, scene: null!};
            beforeEach(() => {
                reset();
                ctx.active = true;
                ctx.scene = WL.scene;
            });
            cb(ctx);
        });
    });
    describe('Inactive Scene', function () {
        describe(name, function () {
            const ctx: {active: boolean; scene: Scene} = {active: false, scene: null!};
            beforeEach(() => {
                reset();
                ctx.active = false;
                ctx.scene = WL._createEmpty();
            });
            cb(ctx);
        });
    });
}

/**
 * Create two describe blocks, for active and inactive scene tests.
 *
 * @note The bin is loaded as a new scene group, and the loading is performed
 * only once before tests start. Scene isn't discarded between two tests.
 *
 * @param name The name of the inner describe.
 * @param bin The options to load the group from memory.
 * @param cb The test callback to register.
 */
export function describeMainScene(
    name: string,
    bin: InMemoryLoadOptions,
    cb: DescribeSceneTestCallback
) {
    describe('Active Scene', function () {
        describe(name, function () {
            const ctx: {active: boolean; scene: Scene} = {active: true, scene: null!};
            before(async function () {
                reset();
                ctx.scene = await WL.loadMainSceneFromBuffer(bin);
                return WL.switchTo(ctx.scene);
            });
            cb(ctx);
        });
    });
    describe('Inactive Scene', function () {
        describe(name, function () {
            const ctx: {active: boolean; scene: Scene} = {active: false, scene: null!};
            before(async function () {
                reset();
                ctx.scene = await WL.loadMainSceneFromBuffer(bin);
                const dummyScene = WL._createEmpty();
                return WL.switchTo(dummyScene);
            });
            cb(ctx);
        });
    });
}
