import {expect, use} from '@esm-bundle/chai';
import {chaiAlmost} from './chai/almost.js';

import {MeshComponent, InMemoryLoadOptions, Scene} from '..';
import {init, projectURL, reset, WL} from './setup.js';
import {loadProjectBins} from './utils.js';

use(chaiAlmost(0.001));

before(init);
beforeEach(reset);

/* Use in-memory .bin as much as possible to speed up the tests. */
let bins: InMemoryLoadOptions[] = [];
try {
    bins = await loadProjectBins('MorphTargets.bin');
} catch (e) {
    console.error('Failed to load required test scenes');
    throw e;
}
const morphTargetsBin = bins[0];

describe('MorphTargets', function () {
    it('get / set targets', async function () {
        const scene = await WL.loadMainSceneFromBuffer(morphTargetsBin);

        const primitivesObject = scene.findByName('MorphPrimitives')[0];
        expect(primitivesObject).to.not.be.undefined;
        let meshes = primitivesObject.getComponents('mesh');
        expect(meshes.length).to.equal(2);
        expect(meshes[0].morphTargets).to.not.be.null;
        expect(meshes[0].morphTargets).to.not.equal(meshes[1].morphTargets);
        for (const mesh of meshes) {
            const targets = mesh.morphTargets!;
            expect(targets).to.not.be.null;
            expect(targets.count).to.equal(1);
            expect(targets.getTargetName(0)).to.equal('target_0');
            expect(() => targets.getTargetName(5000)).to.throw(
                Error,
                'Index 5000 is out of bounds for 1 targets'
            );
            expect(targets.getTargetIndex('target_0')).to.equal(0);
            expect(() => targets.getTargetIndex('target_1')).to.throw(
                Error,
                "Missing target 'target_1'"
            );
        }

        const stressTestObject = scene.findByName('MorphStressTest')[0];
        expect(stressTestObject).to.not.be.undefined;
        meshes = stressTestObject.getComponents('mesh');
        expect(meshes.length).to.equal(2);
        expect(meshes[0].morphTargets).to.not.be.null;
        expect(meshes[0].morphTargets).to.not.equal(meshes[1].morphTargets);
        for (const mesh of meshes) {
            const targets = mesh.morphTargets!;
            expect(targets).to.not.be.null;
            expect(targets.count).to.equal(8);
            expect(() => targets.getTargetIndex('unknown')).to.throw(
                Error,
                "Missing target 'unknown'"
            );
            for (let t = 0; t < targets.count; ++t) {
                const targetName = 'Key ' + (t + 1);
                expect(targets.getTargetName(t)).to.equal(targetName);
                expect(targets.getTargetIndex(targetName)).to.equal(t);
            }
        }
    });
});
