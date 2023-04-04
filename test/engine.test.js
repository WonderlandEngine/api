import { expect } from '@esm-bundle/chai';

import { init } from './setup.js';

import { loadRuntime, Component } from '..';

before(init);

describe('Engine', function() {

    it('ar / vr supported', async function() {
        /* WebXR callback has already been triggered. */
        expect(typeof WL.arSupported).to.equal('boolean');
        /* WebXR callback has already been triggered. */
        expect(typeof WL.vrSupported).to.equal('boolean');
    });

    it('multiple instances', async function() {
        class TestComponent extends Component {
            static TypeName = 'test-component'
        };

        const engine = await loadRuntime('deploy/WonderlandRuntime', {simd: false, threads: false});
        expect(engine.scene).to.not.equal(WL.scene);

        expect(WL.isRegistered(TestComponent)).to.be.false;
        expect(engine.isRegistered(TestComponent)).to.be.false;
        engine.registerComponent(TestComponent);
        expect(WL.isRegistered(TestComponent)).to.be.false;
        expect(engine.isRegistered(TestComponent)).to.be.true;
    });

});
