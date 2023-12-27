import {expect} from '@esm-bundle/chai';

import {init, WL} from './setup.js';

import {
    checkRuntimeCompatibility,
    APIVersion,
    loadRuntime,
    Component,
    Version,
    LogLevel,
} from '..';
import * as promise from './chai/promise.js';

const TestCanvas = '_WL_test_canvas_';
const OriginalAPIVersion = {...APIVersion};

/* major, minor, patch, and rc version of the runtime. */
let runtimeVersion: Version = {major: -1, minor: -1, patch: -1, rc: -1};

/**
 * Sets the global API version.
 *
 * @note This override the API version export. It must be properly
 * reset to avoid any issue with other callers. Each test file being
 * isolated (loaded separately from scratch), the issue wouldn't
 * be able to spread outside this file.
 *
 * @param major Major component
 * @param minor Minor component
 * @param patch Patch component
 * @param rc RC component
 */
function setAPIVersion(major: number, minor: number, patch: number, rc: number) {
    APIVersion.major = major;
    APIVersion.minor = minor;
    APIVersion.patch = patch;
    APIVersion.rc = rc;
}

before(async function () {
    await init();
    runtimeVersion = WL.runtimeVersion;
});

beforeEach(function () {
    /* Before each test, append a debug canvas. */
    const canvas = document.createElement('canvas');
    canvas.id = TestCanvas;
    document.body.append(canvas);
});

afterEach(function () {
    /* Delete debug canvas after each test to claim GPU memory. */
    document.getElementById(TestCanvas)?.remove();
    setAPIVersion(
        OriginalAPIVersion.major,
        OriginalAPIVersion.minor,
        OriginalAPIVersion.patch,
        OriginalAPIVersion.rc
    );
});

describe('Engine', function () {
    it('ar / vr supported', async function () {
        const [arSupported, vrSupported] = await Promise.all([
            navigator?.xr?.isSessionSupported('immersive-ar') ?? Promise.resolve(false),
            navigator?.xr?.isSessionSupported('immersive-vr') ?? Promise.resolve(false),
        ]);
        expect(WL.arSupported).to.equal(arSupported);
        expect(WL.vrSupported).to.equal(vrSupported);
    });

    it('multiple instances', async function () {
        this.timeout(20000);

        class TestComponent extends Component {
            static TypeName = 'test-component';
        }

        const engine = await loadRuntime('deploy/WonderlandRuntime', {
            simd: false,
            threads: false,
            canvas: TestCanvas,
            logs: [LogLevel.Error],
        });
        expect(engine.scene).to.not.equal(WL.scene);

        expect(WL.isRegistered(TestComponent)).to.be.false;
        expect(engine.isRegistered(TestComponent)).to.be.false;
        engine.registerComponent(TestComponent);
        expect(WL.isRegistered(TestComponent)).to.be.false;
        expect(engine.isRegistered(TestComponent)).to.be.true;
    });

    describe('Runtime <> API compatibility', function () {
        /* Helper function to load a runtime. */

        this.timeout(10000);

        function load() {
            return loadRuntime('deploy/WonderlandRuntime', {
                simd: false,
                threads: false,
                canvas: TestCanvas,
                logs: [LogLevel.Error],
            });
        }

        it('checkRuntimeCompatibility()', function () {
            const {major, minor, patch, rc} = runtimeVersion;
            for (const bump of [-1, 1]) {
                setAPIVersion(major + bump, minor, patch, rc);
                expect(checkRuntimeCompatibility.bind(null, runtimeVersion)).to.throw();
                setAPIVersion(major, minor + bump, patch, rc);
                expect(checkRuntimeCompatibility.bind(null, runtimeVersion)).to.throw();
                setAPIVersion(major, minor, patch + bump, rc);
                expect(checkRuntimeCompatibility.bind(null, runtimeVersion)).to.not.throw();
            }
        });

        it('loadRuntime() with older API', async function () {
            /* Non-matching major version. */
            const {major, minor, patch, rc} = runtimeVersion;
            setAPIVersion(major + 1, minor + 1, patch, rc);
            await promise.expectFail(load());
        });

        it('loadRuntime() with newer API', async function () {
            /* Non-matching major version. */
            const {major, minor, patch, rc} = runtimeVersion;
            setAPIVersion(major - 1, minor - 1, patch, rc);
            await promise.expectFail(load());
        });
    });
});
