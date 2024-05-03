import {expect} from '@esm-bundle/chai';

import {Texture} from '..';
import {init, reset, WL} from './setup.js';
import {dummyImage} from './utils';

before(init);
beforeEach(reset);

describe('Texture Legacy', function () {
    it('create', async function () {
        const testImage = await dummyImage(20, 30);
        const tex = new Texture(WL, testImage);
        expect(tex.width).to.equal(20);
        expect(tex.height).to.equal(30);
    });

    it('load from url', async function () {
        const texture = await WL.textures.load('test/resources/2x2.png');
        expect(texture.width).to.equal(2);
        expect(texture.height).to.equal(2);
    });

    it('.destroy()', async function () {
        const textureA = new Texture(WL, await dummyImage(1, 2));
        const textureB = new Texture(WL, await dummyImage(3, 4));

        expect([textureA.width, textureA.height]).to.eql([1, 2]);
        expect([textureB.width, textureB.height]).to.eql([3, 4]);

        textureB.destroy();
        expect(textureB._index).to.equal(-1);
        expect([textureA.width, textureA.height]).to.eql([1, 2]);

        textureA.destroy();
        expect(textureA._index).to.equal(-1);

        const textureC = new Texture(WL, await dummyImage(5, 6));
        expect([textureC.width, textureC.height]).to.eql([5, 6]);
        textureC.destroy();
        expect(textureC._index).to.equal(-1);
    });
});

describe('Texture', function () {
    it('create from Image', async function () {
        const testImage = await dummyImage(20, 30);

        const tex = WL.textures.create(testImage);
        expect(tex.width).to.equal(20);
        expect(tex.height).to.equal(30);
    });

    it('.equals()', async function () {
        const testImage = await dummyImage(20, 30);
        const tex1 = WL.textures.create(testImage);
        const tex2 = WL.textures.create(testImage);
        const tex3 = new Texture(WL, tex1._index);
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

        const manager = WL.textures;

        const tex1 = manager.create(images[0]);
        const tex2 = manager.create(images[1]);
        expect(tex1.index).to.equal(1);
        expect(tex2.index).to.equal(2);

        tex1.destroy();
        expect(tex1.index).to.equal(-1);
        expect(tex2.index).to.equal(2);
        expect(manager.get(tex2._index)?.width).to.equal(6);
        expect(manager.get(tex2._index)?.height).to.equal(8);

        const tex3 = manager.create(images[2]);
        expect(tex3.index).to.equal(1);
        expect(manager.get(tex3._index)?.width).to.equal(10);
        expect(manager.get(tex3._index)?.height).to.equal(12);
    });

    it('.destroy() with prototype destruction', async function () {
        WL.erasePrototypeOnDestroy = true;

        const image = await dummyImage(2, 2);
        const a = WL.textures.create(image);
        const b = WL.textures.create(image);

        a.destroy();
        expect(() => a.equals(b)).to.throw(
            `Cannot read 'equals' of destroyed 'Texture' resource from ${WL}`
        );
        expect(() => a.valid).to.throw(
            `Cannot read 'valid' of destroyed 'Texture' resource from ${WL}`
        );

        /* Ensure destroying `a` didn't destroy `b` as well */
        expect(b._id).to.be.greaterThan(0);
    });
});
