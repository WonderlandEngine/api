import { expect } from '@esm-bundle/chai';

import { init } from './init.js';

describe('Components', function() {
    beforeEach(init);

    it('register', function() {
        /* Registers a simple component and ensure its methods are called */
        WL.registerComponent('dummy', {}, {
            init() {
                this.initCalled = 1;
                this.startCalled = 0;
            },
            start() { ++this.startCalled; }
        });
        const obj = WL.scene.addObject();
        const comp = obj.addComponent('dummy');
        expect(comp.initCalled).to.equal(1);
        expect(comp.startCalled).to.equal(1);
    });

});
