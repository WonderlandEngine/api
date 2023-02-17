import { expect } from '@esm-bundle/chai';

import { Texture } from '../wonderland.js';
import { init, reset } from './setup.js';

before(init);
beforeEach(reset);

describe('Texture', function() {

    it('create from Image', function() {
        const testImage = new Image(20, 30);
        const tex = new WL.Texture(testImage);
        expect(tex.width).to.equal(20);
        expect(tex.height).to.equal(30);
    });

    it('load from url', async function() {
        const texture = await WL.textures.load('test/resources/2x2.png');
        expect(texture.width).to.equal(2);
        expect(texture.height).to.equal(2);
        expect(WL.textures[0]._id).to.equal(texture._id);
    })

});
