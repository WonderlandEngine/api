import { expect } from '@esm-bundle/chai';

import { init } from './init.js';

describe('Texture', function() {
    beforeEach(init);

    const testImage = new Image(20, 30);
    it('width', function() {
    	const tex = new WL.Texture(testImage);
    	expect(tex.width).to.equal(20);
    });

    it('height', function() {
    	const tex = new WL.Texture(testImage);
    	expect(tex.height).to.equal(30);
    });
    
});

