import { expect } from '@esm-bundle/chai';

import { init } from './init.js';

describe('Object', function() {
    beforeEach(init);

    it('get and set name', function() {
        const obj = WL.scene.addObject();
        obj.name = 'Object1';
        expect(obj.name).to.equal('Object1');

        /* Test with a second object to ensure no clash occurs. */
        const obj2 = WL.scene.addObject();
        obj2.name = 'Object2';
        expect(obj.name).to.equal('Object1');
        expect(obj2.name).to.equal('Object2');
    });

});
