import { expect, use } from '@esm-bundle/chai';
import { chaiAlmost } from './chai/almost.js';

import { init } from './setup.js';
import { Material, MaterialParamType, Texture } from '../wonderland.js';

use(chaiAlmost());

before(init);
/* We intentionally don't reset such that the 'Phong Opaque' pipeline
 * from the loading screen is available to create materials from */

describe('Material Definition', function() {

    it('Phong Opaque', function() {
        const mat = new Material(WL, {pipeline: 'Phong Opaque'});
        const definition = WL.wasm._materialDefinitions[mat._definition];

        const ambientColor = definition.get('ambientColor');
        expect(ambientColor.type.type).to.equal(MaterialParamType.Float);
        expect(ambientColor.type.componentCount).to.equal(4);

        const diffuseColor = definition.get('diffuseColor');
        expect(diffuseColor.type.type).to.equal(MaterialParamType.Float);
        expect(diffuseColor.type.componentCount).to.equal(4);

        const specularColor = definition.get('specularColor');
        expect(specularColor.type.type).to.equal(MaterialParamType.Float);
        expect(specularColor.type.componentCount).to.equal(4);

        const ambientFactor = definition.get('ambientFactor');
        expect(ambientFactor.type.type).to.equal(MaterialParamType.Float);
        expect(ambientFactor.type.componentCount).to.equal(1);

        const shininess = definition.get('shininess');
        expect(shininess.type.type).to.equal(MaterialParamType.UnsignedInt);
        expect(shininess.type.componentCount).to.equal(1);

        const alphaTexture = definition.get('alphaMaskTexture');
        expect(alphaTexture.type.type).to.equal(MaterialParamType.Sampler);
        expect(alphaTexture.type.componentCount).to.equal(1);

        const alphaTextureThreshold = definition.get('alphaMaskThreshold');
        expect(alphaTextureThreshold.type.type).to.equal(MaterialParamType.Float);
        expect(alphaTextureThreshold.type.componentCount).to.equal(1);
    });

});

describe('Material', function() {

    it('constructor', function() {
        expect(() => new Material(WL)).to.throw(Error, "Missing parameter 'pipeline'");
        expect(() => new Material(WL, {pipeline: 'Northstream'}))
            .to.throw(Error, "No such pipeline 'Northstream'");

        const mat = new Material(WL, {pipeline: 'Phong Opaque'});
        expect(mat.color).to.be.undefined;
        expect(mat.diffuseColor).to.deep.equal(new Float32Array([0, 0, 0, 0]));
    });

    it('parameters', function() {
        const mat = new Material(WL, {pipeline: 'Phong Opaque'});

        expect(mat.diffuseColor).to.deep.equal(new Float32Array([0, 0, 0, 0]));
        mat.diffuseColor = [1.0, 0.0, 0.0, 1.0];
        expect(mat.diffuseColor).to.deep.equal(new Float32Array([1.0, 0.0, 0.0, 1.0]));

        mat.shininess = 10;
        expect(mat.shininess).to.eql(10);

        mat.alphaTextureThreshold = 0.5;
        expect(mat.alphaTextureThreshold).to.eql(0.5);
        expect(mat.alphaMaskTexture).to.be.an.instanceOf(Texture);
    });

});
