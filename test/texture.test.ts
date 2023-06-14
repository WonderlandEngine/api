import {expect} from '@esm-bundle/chai';

import {Texture} from '..';
import {init, reset, WL} from './setup.js';

before(init);
beforeEach(reset);

describe('Texture', function () {
    it('create from Image', function () {
        const testImage = new Image(20, 30);
        const tex = new Texture(WL, testImage);
        expect(tex.width).to.equal(20);
        expect(tex.height).to.equal(30);
    });

    it('load from url', async function () {
        const texture = await WL.textures.load('test/resources/2x2.png');
        expect(texture.width).to.equal(2);
        expect(texture.height).to.equal(2);
        expect(WL.textures.get(0)?.id).to.equal(texture.id);
    });

    it('.equals()', function () {
        const testImage = new Image(20, 30);
        const tex1 = new Texture(WL, testImage);
        const tex2 = new Texture(WL, testImage);
        const tex3 = new Texture(WL, tex1['_id']);
        expect(tex1.equals(null)).to.be.false;
        expect(tex1.equals(undefined)).to.be.false;
        expect(tex1.equals(tex1)).to.be.true;
        expect(tex1.equals(tex2)).to.be.false;
        expect(tex2.equals(tex1)).to.be.false;
        expect(tex1.equals(tex3)).to.be.true;
        expect(tex3.equals(tex1)).to.be.true;
    });

    it('.destroy()', function () {
        const tex1 = new Texture(WL, new Image(2, 4));
        const tex2 = new Texture(WL, new Image(6, 8));
        expect(tex1.id).to.equal(0);
        expect(tex2.id).to.equal(1);

        tex1.destroy();
        expect(tex1.id).to.equal(-1);
        expect(tex2.id).to.equal(1);
        expect(WL.textures.get(tex2.id)?.width).to.equal(6);
        expect(WL.textures.get(tex2.id)?.height).to.equal(8);

        const tex3 = new Texture(WL, new Image(10, 12));
        expect(tex3.id).to.equal(0);
        expect(WL.textures.get(tex3.id)?.width).to.equal(10);
        expect(WL.textures.get(tex3.id)?.height).to.equal(12);
    });
});
