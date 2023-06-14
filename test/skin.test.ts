import {expect} from '@esm-bundle/chai';

import {Skin} from '..';
import {init, reset, WL} from './setup.js';

before(init);
beforeEach(reset);

describe('Skin', function () {
    it('equals', function () {
        const skin1 = new Skin(WL, 1);
        const skin2 = new Skin(WL, 2);
        const skin3 = new Skin(WL, 1);
        expect(skin1.equals(null)).to.be.false;
        expect(skin1.equals(undefined)).to.be.false;
        expect(skin1.equals(skin1)).to.be.true;
        expect(skin1.equals(skin2)).to.be.false;
        expect(skin2.equals(skin1)).to.be.false;
        expect(skin1.equals(skin3)).to.be.true;
        expect(skin3.equals(skin1)).to.be.true;
    });
});
