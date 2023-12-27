import {expect} from '@esm-bundle/chai';

import {Texture} from '..';
import {init, reset, WL} from './setup.js';
import {dummyImage} from './utils';

before(init);
beforeEach(reset);

describe('Texture', function () {
    it('create from Image', async function () {
        const testImage = await dummyImage(20, 30);
        const tex = new Texture(WL, testImage);
        expect(tex.width).to.equal(20);
        expect(tex.height).to.equal(30);
    });

    it('load from url', async function () {
        const texture = await WL.textures.load('test/resources/2x2.png');
        expect(texture.width).to.equal(2);
        expect(texture.height).to.equal(2);
        expect(WL.textures.get(0)).to.equal(null);
        expect(WL.textures.get(1)?.id).to.equal(texture.id);
    });

    it('.equals()', async function () {
        const testImage = await dummyImage(20, 30);
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

    it('.destroy()', async function () {
        const images = await Promise.all([
            dummyImage(2, 4),
            dummyImage(6, 8),
            dummyImage(10, 12),
        ]);
        const tex1 = new Texture(WL, images[0]);
        const tex2 = new Texture(WL, images[1]);
        expect(tex1.id).to.equal(1);
        expect(tex2.id).to.equal(2);

        tex1.destroy();
        expect(tex1.id).to.equal(-1);
        expect(tex2.id).to.equal(2);
        expect(WL.textures.get(tex2.id)?.width).to.equal(6);
        expect(WL.textures.get(tex2.id)?.height).to.equal(8);

        const tex3 = new Texture(WL, images[2]);
        expect(tex3.id).to.equal(1);
        expect(WL.textures.get(tex3.id)?.width).to.equal(10);
        expect(WL.textures.get(tex3.id)?.height).to.equal(12);
    });

    it('.destroy() with prototype destruction', async function () {
        WL.erasePrototypeOnDestroy = true;

        const image = await dummyImage(2, 2);
        const a = new Texture(WL, image);
        const b = new Texture(WL, image);

        a.destroy();
        expect(() => a.equals(b)).to.throw(`Canno't read 'equals' of destroyed texture`);
        expect(() => a.valid).to.throw(`Canno't read 'valid' of destroyed texture`);

        /* Ensure destroying `a` didn't destroy `b` as well */
        expect(b.id).to.exist;
    });
});
