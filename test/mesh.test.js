import {expect, use} from '@esm-bundle/chai';
import {chaiAlmost} from './chai/almost.js';

import {Mesh, MeshAttribute} from '..';
import {init, reset} from './setup.js';

use(chaiAlmost());

/**
 * This must be a direct mapping to `MeshDataFlag.h`.
 *
 * The API isn't public and is used solely for testing purposes.
 */
const MeshLayoutFlags = {
    Position: 1 << 0,
    /** Use Texture Coordinates */
    TextureCoordinates: 1 << 1,
    /** Use Normals */
    Normals: 1 << 2,
    /** Use Tangents */
    Tangents: 1 << 3,
    /** Use Object IDs */
    ObjectIds: 1 << 4,
    /** Use Skin attributes */
    Skin: 1 << 5,
    /** Use secondary Skin attributes */
    SkinSecondary: 1 << 6,
    /** Use Vertex Colors */
    Colors: 1 << 7,
    /** Use Secondary Texture Coordinates */
    TextureCoordinates1: 1 << 8,
    /** Use Slug text attributes */
    Slug: 1 << 9,
};

before(init);
beforeEach(reset);

describe('Mesh', function () {
    it('getBoundingSphere', function () {
        const mesh = new Mesh(WL, {vertexCount: 3, indexData: [0, 1, 2]});
        const position = mesh.attribute(MeshAttribute.Position);
        position.set(0, [1, 2, 3]);
        position.set(1, [0, 1, 6]);
        position.set(2, [1, 0, 1]);
        mesh.update();
        const result = mesh.getBoundingSphere();
        expect(result).to.be.deep.almost([0.581, 0.781, 3.457, 2.617], 0.001);
    });

    describe('MeshAttribute', function () {
        it('import only scene attributes', async function () {
            /* Scene layout without tangents */
            WL.wasm._wl_renderer_set_mesh_layout(
                MeshLayoutFlags.Position |
                    MeshLayoutFlags.Normals |
                    MeshLayoutFlags.TextureCoordinates
            );

            /* Cube has positions, normals, and tangents */
            const root = await WL.scene.append('test/resources/Cube.glb');
            const child = root.children[0];
            const mesh = child.getComponent('mesh').mesh;

            /* Tangents must not be in the resulting mesh */
            const tangentAttr = mesh.attribute(MeshAttribute.Tangent);
            expect(tangentAttr).to.equal(null);
        });

        it('import tangents', async function () {
            /* Scene layout with tangents */
            WL.wasm._wl_renderer_set_mesh_layout(
                MeshLayoutFlags.Position |
                    MeshLayoutFlags.Normals |
                    MeshLayoutFlags.TextureCoordinates |
                    MeshLayoutFlags.Tangents
            );

            /* Cube has positions, normals, and tangents */
            const root = await WL.scene.append('test/resources/Cube.glb');
            const child = root.children[0];
            const mesh = child.getComponent('mesh').mesh;

            const tangentAttr = mesh.attribute(MeshAttribute.Tangent);
            expect(tangentAttr).to.not.equal(null);

            /* Tangents must be quantized */
            expect(tangentAttr._formatSize).to.equal(8);

            /* UVs are absent */
            const uvsAttr = mesh.attribute(MeshAttribute.TextureCoordinate);
            expect(uvsAttr).to.equal(null);

            const expectedTangents = [
                0, 1, 0, 1, -1, 0, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0,
                1, 0, 1, -1, 0, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1,
                0, 1, 0, 1, 0, 1, -1, 0, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0,
                1, 0, 1, 0, 1, -1, 0, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 1,
            ];

            const tangents = tangentAttr.createArray(36);
            expect(tangentAttr.get(0, tangents)).to.almost.eql(
                new Float32Array(expectedTangents)
            );
        });

        it('import generate tangents', async function () {
            /* Scene layout with tangents */
            WL.wasm._wl_renderer_set_mesh_layout(
                MeshLayoutFlags.Position |
                    MeshLayoutFlags.Normals |
                    MeshLayoutFlags.TextureCoordinates |
                    MeshLayoutFlags.Tangents
            );

            /* UVcube has positions, normals, UVs, but no tangents, so they should be generated */
            const root = await WL.scene.append('test/resources/UVcube.glb');
            const child = root.children[0];
            const mesh = child.getComponent('mesh').mesh;

            const tangentAttr = mesh.attribute(MeshAttribute.Tangent);

            /* Tangents must be quantized */
            expect(tangentAttr._formatSize).to.equal(8);

            const expectedTangents = [
                1, 0, 0, -1, 1, 0, 0, -1, 0, 0, 1, -1, -1, 0, 0, -1, 1, 0, 0, -1, 0, 0, 1,
                -1, -1, 0, 0, -1, 1, 0, 0, -1, 0, 0, 1, -1, -1, 0, 0, -1, -1, 0, 0, -1, 0,
                0, 1, -1, 0, 0, -1, -1, 1, 0, 0, -1, 1, 0, 0, -1, 0, 0, -1, -1, -1, 0, 0,
                -1, 1, 0, 0, -1, 0, 0, -1, -1, -1, 0, 0, -1, 1, 0, 0, -1, 0, 0, -1, -1, -1,
                0, 0, -1, -1, 0, 0, -1,
            ];

            const tangents = tangentAttr.createArray(24);
            /* Accessing tangents on models with generated tangents would crash after Mesh
             * Processing optimizations (54903b9d, post 0.9.5) */
            expect(tangentAttr.get(0, tangents)).to.almost.eql(
                new Float32Array(expectedTangents)
            );
        });

        it('import joints', async function () {
            /* Loading models with joints would crash after JointIds migration (0cb69af2, post 0.9.5) */
            const root = await WL.scene.append('test/resources/SimpleSkin.glb');
            const child = root.children[0];
            const mesh = child.getComponent('mesh').mesh;

            const jointAttr = mesh.attribute(MeshAttribute.JointId);
            expect(jointAttr).to.not.equal(null);

            const expectedJoints = [
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 1, 0, 0,
                0, 1, 0, 0,
                0, 1, 0, 0,
                0, 1, 0, 0,
                0, 1, 0, 0,
                0, 1, 0, 0,
                0, 1, 0, 0,
                0, 1, 0, 0,
            ];

            const joints = jointAttr.createArray(mesh.vertexCount);
            expect(jointAttr.get(0, joints)).to.almost.eql(
                new Float32Array(expectedJoints)
            );
        });

        it('set / get position', function () {
            const expected = [1, 2, 3, 4, 5, 6, 7, 8, 9];

            const mesh = new Mesh(WL, {vertexCount: 3, indexData: [0, 1, 2]});
            const positionAttr = mesh.attribute(MeshAttribute.Position);
            const out = positionAttr.set(0, expected).createArray(3);
            expect(out).instanceOf(Float32Array);
            expect(positionAttr.get(0, out)).to.almost.eql(expected);
        });

        it('set / get joint id', function () {
            const expected = [
                2, 4, 8, 16, 0, 0, 0, 0, 256, 512, 1024, 2048, 0, 0, 0, 0, 4096, 8192,
                16384, 32768, 0, 0, 0, 0,
            ];

            const mesh = new Mesh(
                WL,
                {vertexCount: 3, indexData: [0, 1, 2], skinned: true}
            );
            const jointAttr = mesh.attribute(MeshAttribute.JointId);
            const out = jointAttr.set(0, expected).createArray(3);
            expect(out).instanceOf(Uint16Array);
            expect(jointAttr.get(0, out)).to.eql(new Uint16Array(expected));
        });

        it('set / get normals', function () {
            const expected = [1, 1, 1, 0, 1, 0, 0, 0, 1];

            WL.wasm._wl_renderer_set_mesh_layout(MeshLayoutFlags.Position|MeshLayoutFlags.Normals);
            const mesh = new Mesh(WL, {vertexCount: 3, indexData: [0, 1, 2]});
            const normalsAttr = mesh.attribute(MeshAttribute.Normal);
            const out = normalsAttr.set(0, expected).createArray(3);
            expect(out).instanceOf(Float32Array);
            expect(normalsAttr.get(0, out)).to.almost.eql(new Float32Array(expected));
        });

        it('set / get colors', function () {
            const expected = [0.1, 0.2, 0.3, 1.0, 0.5, 0.6, 0.7, 1.0];

            WL.wasm._wl_renderer_set_mesh_layout(MeshLayoutFlags.Position|MeshLayoutFlags.Colors);
            const mesh = new Mesh(WL, {vertexCount: 2, indexData: [0, 1, 2]});
            const colorsAttr = mesh.attribute(MeshAttribute.Color);

            const out = colorsAttr.set(0, expected).createArray(2);
            expect(out).instanceOf(Float32Array);
            expect(colorsAttr.get(0, out)).to.almost.eql(new Float32Array(expected));
        });

        it('set / get with non-zero index', function () {
            const mesh = new Mesh(WL, {vertexCount: 3, indexData: [0, 1, 2]});
            const attr = mesh.attribute(MeshAttribute.Position);
            attr.set(2, [7, 8, 9]);
            expect(attr.get(2)).to.almost.eql([7, 8, 9]);
            attr.set(1, [4, 5, 6]);
            expect(attr.get(1)).to.almost.eql([4, 5, 6]);
            attr.set(0, [1, 2, 3]);
            const out = new Array(9);
            expect(attr.get(0, out)).to.almost.eql([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        });

        it('set / get multiple attributes', function() {
            WL.wasm._wl_renderer_set_mesh_layout(MeshLayoutFlags.Position|MeshLayoutFlags.Colors);
            const vertexCount = 3;
            const mesh = new Mesh(WL, {vertexCount, indexData: [0, 1, 2], skinned: true});
            const positionAttr = mesh.attribute(MeshAttribute.Position);
            const jointAttr = mesh.attribute(MeshAttribute.JointId);
            const colorsAttr = mesh.attribute(MeshAttribute.Color);

            const expectedPositions = [
                0.1, 0.2, 0.3 /* Vertex 0 */, 100.4, 100.5, 100.6 /* Vertex 1 */, 1000.7,
                1000.8, 1000.9 /* Vertex 2 */,
            ];
            const expectedJoints = [
                2, 4, 8, 16, 0, 0, 0, 0 /* Vertex 0 */, 256, 512, 1024, 2048, 0, 0, 0,
                0 /* Vertex 1 */, 4096, 8192, 16384, 32768, 0, 0, 0, 0 /* Vertex 2 */,
            ];
            const expectedColors = [
                0.1, 0.2, 0.3, 0.25 /* Vertex 0 */, 0.4, 0.5, 0.6, 0.5 /* Vertex 1 */, 0.7,
                0.8, 0.9, 0.75 /* Vertex 2 */,
            ];

            const positions = positionAttr
                .set(0, expectedPositions)
                .createArray(vertexCount);
            const joints = jointAttr.set(0, expectedJoints).createArray(vertexCount);
            const colors = colorsAttr.set(0, expectedColors).createArray(vertexCount);

            expect(positionAttr.get(0, positions)).to.almost.eql(
                new Float32Array(expectedPositions)
            );
            expect(jointAttr.get(0, joints)).to.eql(new Uint16Array(expectedJoints));
            expect(colorsAttr.get(0, colors)).to.almost.eql(
                new Float32Array(expectedColors)
            );
        });
    });

    it('equals', function() {
        const mesh1 = new Mesh(WL, {vertexCount: 3, indexData: [0, 1, 2]});
        const mesh2 = new Mesh(WL, {vertexCount: 3, indexData: [0, 1, 2]});
        const mesh3 = new Mesh(WL, mesh1._index);
        expect(mesh1.equals(null)).to.be.false;
        expect(mesh1.equals(undefined)).to.be.false;
        expect(mesh1.equals(mesh1)).to.be.true;
        expect(mesh1.equals(mesh2)).to.be.false;
        expect(mesh2.equals(mesh1)).to.be.false;
        expect(mesh1.equals(mesh3)).to.be.true;
        expect(mesh3.equals(mesh1)).to.be.true;
    });
});
