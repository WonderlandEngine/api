import { expect } from '@esm-bundle/chai';

import { init } from './init.js';

describe('Mesh', function() {
    beforeEach(init);

    it('getBoundingSphere', function() {
    	const mesh = new WL.Mesh({vertexCount: 3, indexData: [0, 1, 2]});
    	const position = mesh.attribute(WL.MeshAttribute.Position);
        position.set(0, [1, 2, 3]);
        position.set(1, [0, 1, 6]);
        position.set(2, [1, 0, 1]);
        mesh.update();
    	const result = mesh.getBoundingSphere();
    	expect(result[0]).to.be.closeTo(0.581, 0.01);
    	expect(result[1]).to.be.closeTo(0.781, 0.01);
    	expect(result[2]).to.be.closeTo(3.457, 0.01);
    	expect(result[3]).to.be.closeTo(2.617, 0.01);
    });
    
});
