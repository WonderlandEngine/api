import {expect} from '@esm-bundle/chai';

import {Scene, Skin} from '..';

describe('Skin', function () {
    it('deprecated equals', function () {
        const host = {_index: 0} as unknown as Scene;
        const skin1 = new Skin(host, 1);
        const skin2 = new Skin(host, 2);
        const skin3 = new Skin(host, 1);
        expect(skin1.equals(null)).to.be.false;
        expect(skin1.equals(undefined)).to.be.false;
        expect(skin1.equals(skin1)).to.be.true;
        expect(skin1.equals(skin2)).to.be.false;
        expect(skin2.equals(skin1)).to.be.false;
        expect(skin1.equals(skin3)).to.be.true;
        expect(skin3.equals(skin1)).to.be.true;
    });
});
