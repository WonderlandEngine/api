import {expect} from '@esm-bundle/chai';

import {Animation} from '..';
import {init, reset, WL} from './setup.js';

before(init);
beforeEach(reset);

describe('Animation', function () {
    it('equals', function () {
        const anim1 = new Animation(WL, 1);
        const anim2 = new Animation(WL, 2);
        const anim3 = new Animation(WL, 1);
        expect(anim1.equals(null)).to.be.false;
        expect(anim1.equals(undefined)).to.be.false;
        expect(anim1.equals(anim1)).to.be.true;
        expect(anim1.equals(anim2)).to.be.false;
        expect(anim2.equals(anim1)).to.be.false;
        expect(anim1.equals(anim3)).to.be.true;
        expect(anim3.equals(anim1)).to.be.true;
    });
});
