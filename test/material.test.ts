import {expect, use} from '@esm-bundle/chai';
import {chaiAlmost} from './chai/almost.js';

import {init, WL} from './setup.js';
import {Material, NumberArray, MaterialConstructor, Texture} from '..';

use(chaiAlmost());
before(init);
/* We intentionally don't reset such that the 'Phong Opaque' pipeline
 * from the loading screen is available to create materials from. */

interface PhongMaterial extends Material {
    ambientColor: Float32Array | number[];
    diffuseColor: Float32Array | number[];
    specularColor: Float32Array | number[];
    shininess: number;
    alphaMaskThreshold: number;
    alphaMaskTexture: Texture;

    getAmbientColor(out?: NumberArray): NumberArray;
    setAmbientColor(value: NumberArray): void;
    getDiffuseColor(out?: NumberArray): NumberArray;
    setDiffuseColor(value: NumberArray): void;
    getSpecularColor(out?: NumberArray): NumberArray;
    setSpecularColor(value: NumberArray): void;

    getShininess(): number;
    setShininess(value: number): number;

    getAlphaMaskThreshold(): number;
    setAlphaMaskThreshold(value: number): void;
    getAlphaMaskTexture(): Texture;
    setAlphaMaskTexture(value: Texture): void;
}

interface MeshVisualizerMaterial extends Material {
    getColor(out?: NumberArray): NumberArray;
    setColor(value: NumberArray): void;
    getWireframeColor(out?: NumberArray): NumberArray;
    setWireframeColor(value: NumberArray): void;
}

describe('Material', function () {
    it('deprecated constructor', function () {
        expect(() => new Material(WL, undefined as any)).to.throw(
            Error,
            "Missing parameter 'pipeline'"
        );
        expect(() => new Material(WL, {pipeline: 'Northstream'})).to.throw(
            Error,
            `Pipeline \'Northstream\' doesn\'t exist in the scene`
        );

        const mat = new Material(WL, {pipeline: 'Phong Opaque'}) as PhongMaterial;
        expect((mat as Record<string, any>).color).to.be.undefined;
        expect(mat.diffuseColor).to.deep.almost(new Float32Array([0, 0, 0, 1]));
        expect(mat.pipeline).to.equal('Phong Opaque');
    });

    it('deprecated accessors', function () {
        const mat = new Material(WL, {pipeline: 'Phong Opaque'}) as PhongMaterial;

        expect(mat.diffuseColor).to.deep.equal(new Float32Array([0, 0, 0, 1]));
        mat.diffuseColor = [1.0, 0.0, 0.0, 1.0];
        expect(mat.diffuseColor).to.deep.equal(new Float32Array([1.0, 0.0, 0.0, 1.0]));

        mat.shininess = 10;
        expect(mat.shininess).to.eql(10);

        mat.alphaMaskThreshold = 0.5;
        expect(mat.alphaMaskThreshold).to.eql(0.5);
        expect(mat.alphaMaskTexture).to.be.null;
    });

    it('colors out parameter', function () {
        const PhongMaterial = WL.materials.getTemplate(
            'Phong Opaque'
        ) as MaterialConstructor<PhongMaterial>;

        const mat = new PhongMaterial();

        expect(mat.getAmbientColor()).to.deep.almost([0, 0, 0, 1]);
        mat.setAmbientColor([0.1, 0.2, 0.3, 0.4]);
        {
            const out = [-1, -1, -1, -1];
            expect(mat.getAmbientColor(out)).to.equal(out);
            expect(out).to.deep.almost([0.1, 0.2, 0.3, 0.4], 0.01);
        }

        expect(mat.getDiffuseColor()).to.deep.almost([0, 0, 0, 1]);
        mat.setDiffuseColor([0.9, 0.8, 0.7, 1.0]);
        {
            const out = [-1, -1, -1, -1];
            expect(mat.getDiffuseColor(out)).to.equal(out);
            expect(out).to.deep.almost([0.9, 0.8, 0.7, 1.0], 0.01);
        }
    });

    it('deprecated equals()', function () {
        const mat1 = new Material(WL, {pipeline: 'Phong Opaque'});
        const mat2 = new Material(WL, {pipeline: 'Phong Opaque'});
        const mat3 = new Material(WL, mat1._index);
        expect(mat1.equals(null)).to.be.false;
        expect(mat1.equals(undefined)).to.be.false;
        expect(mat1.equals(mat1)).to.be.true;
        expect(mat1.equals(mat2)).to.be.false;
        expect(mat2.equals(mat1)).to.be.false;
        expect(mat1.equals(mat3)).to.be.true;
        expect(mat3.equals(mat1)).to.be.true;
    });
});

describe('Phong', function () {
    it('definition', function () {
        const PhongMaterial = WL.materials.getTemplate<PhongMaterial>('Phong Opaque');
        for (const param of [
            'ambientColor',
            'diffuseColor',
            'shininess',
            'alphaMaskThreshold',
            'alphaMaskTexture',
        ]) {
            expect(PhongMaterial.Parameters.has(param), `missing parameter '${param}'`).to
                .be.true;
        }

        expect(PhongMaterial.prototype.getAmbientColor).to.be.instanceOf(Function);
        expect(PhongMaterial.prototype.getDiffuseColor).to.be.instanceOf(Function);
        expect(PhongMaterial.prototype.setDiffuseColor).to.be.instanceOf(Function);
        expect(PhongMaterial.prototype.getAlphaMaskThreshold).to.be.instanceOf(Function);
        expect(PhongMaterial.prototype.setAlphaMaskThreshold).to.be.instanceOf(Function);
        expect(PhongMaterial.prototype.getAlphaMaskTexture).to.be.instanceOf(Function);
        expect(PhongMaterial.prototype.setAlphaMaskTexture).to.be.instanceOf(Function);
    });

    it('properties', function () {
        const PhongMaterial = WL.materials.getTemplate(
            'Phong Opaque'
        ) as MaterialConstructor<PhongMaterial>;

        const mat = new PhongMaterial();

        expect(mat.getAmbientColor()).to.deep.almost([0, 0, 0, 1]);
        mat.setAmbientColor([0.1, 0.2, 0.3, 0.4]);
        expect(mat.getAmbientColor()).to.deep.almost([0.1, 0.2, 0.3, 0.4], 0.01);

        expect(mat.getDiffuseColor()).to.deep.almost([0, 0, 0, 1]);
        mat.setDiffuseColor([0.9, 0.8, 0.7, 1.0]);
        expect(mat.getDiffuseColor()).to.deep.almost([0.9, 0.8, 0.7, 1.0], 0.01);

        expect(mat.getSpecularColor()).to.deep.almost([0, 0, 0, 1]);
        mat.setSpecularColor([0.5, 0.4, 0.7, 0.5]);
        expect(mat.getSpecularColor()).to.deep.almost([0.5, 0.4, 0.7, 0.5], 0.01);

        expect(mat.getShininess()).to.almost(0);
        mat.setShininess(5);
        expect(mat.getShininess()).to.almost(5);

        expect(mat.getAlphaMaskThreshold()).to.almost(0.0);
        mat.setAlphaMaskThreshold(0.75);
        expect(mat.getAlphaMaskThreshold()).to.almost(0.75);
    });
});

describe('MeshVisualizer', function () {
    it('definition', function () {
        const materials = WL.materials;

        const MeshVisualizerMaterial =
            materials.getTemplate<MeshVisualizerMaterial>('MeshVisualizer');
        for (const param of [
            'color',
            'wireframeColor',
            'alphaMaskThreshold',
            'alphaMaskTexture',
        ]) {
            expect(
                MeshVisualizerMaterial.Parameters.has(param),
                `missing parameter '${param}'`
            ).to.be.true;
        }

        expect(MeshVisualizerMaterial.prototype.getColor).to.be.instanceOf(Function);
        expect(MeshVisualizerMaterial.prototype.setColor).to.be.instanceOf(Function);
        expect(MeshVisualizerMaterial.prototype.getWireframeColor).to.be.instanceOf(
            Function
        );
        expect(MeshVisualizerMaterial.prototype.setWireframeColor).to.be.instanceOf(
            Function
        );
    });
});
