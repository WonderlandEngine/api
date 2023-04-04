import { expect, use } from '@esm-bundle/chai';
import { chaiAlmost } from './chai/almost.js';

import {Object, Collider, Component} from '..';
import { init, reset } from './setup.js';

use(chaiAlmost());

before(init);
beforeEach(reset);

describe('Scene', function() {

    it('onSceneLoaded, missing scene', async function() {
        let loaded = false;
        await new Promise((res) => {
            WL.onSceneLoaded.push(() => { loaded = true; res(); } );
            WL.scene.load('missing-scene.bin');
            setTimeout(res, 500);
        });
        expect(loaded).to.be.false;
    });

    it('onSceneLoaded', async function() {
        let onDestroyCalled = false;
        class DestroyCheck extends Component {
            static TypeName = 'destroy-check';
            onDestroy() {
                onDestroyCalled = true;
            }
        }
        WL.registerComponent(DestroyCheck);

        const o = WL.scene.addObject();
        o.addComponent(DestroyCheck);

        await new Promise((res, rej) => {
            WL.onSceneLoaded.push(() => res());
            WL.scene.load('test/resources/projects/TestSkinnedMesh.bin');
            setTimeout(rej, 500);
        });
        /* onSceneLoaded callbacks should only be notified once the scene is
         * fully loaded */
        expect(WL.scene.activeViews).to.not.be.empty;
        expect(onDestroyCalled).to.be.true;
    });

    it('addObject()', function() {
        const obj = WL.scene.addObject();
        expect(obj).to.be.an.instanceof(Object);

        const child = WL.scene.addObject(obj);
        expect(child).to.be.an.instanceof(Object);
        expect(obj.children).to.have.members([child]);
        expect(child.parent).to.equal(obj);
    });

    it('activeViews', function () {
        const obj = WL.scene.addObject();
        obj.addComponent('view');

        const views = WL.scene.activeViews;
        expect(views.length).to.equal(1);
        expect(views[0]._id).to.equal(0);
    });

    it('rayCast()', function () {
        const objA = WL.scene.addObject();
        objA.translateObject([0, 0, 10]);
        const col = objA.addComponent('collision', {
            collider: Collider.Sphere,
            extents: [1, 1, 1],
            group: 1,
        });

        const rayHit = WL.scene.rayCast([0, 0, 0], [0, 0, 1], 1);
        expect(rayHit.hitCount).to.equal(1);
        expect(rayHit.objects[0]).to.equal(objA);
    });

    it('addObjects()', function () {
        const objs = WL.scene.addObjects(10, null, 10);
        for(const obj of objs) {
            expect(obj).to.be.an.instanceOf(Object, `Object '${obj.objectId}' must be an instance of WL.Object`);
            expect(obj.objectId).to.be.greaterThan(0, 'Object must have a valid non-zero id');
            expect(obj.objectId).to.be.below(20, `Object '${obj.objectId}' is too high`);
        }
    });

    it('reserveObjects()', function () {
        WL.scene.reserveObjects(99, {"view": 100, "collision": 101});
    });

    describe('Appending glTF', function() {

        it('append', async function() {
            const root = await WL.scene.append("test/resources/Box.glb");

            expect(root).to.be.an.instanceof(Object);
            expect(root.children).to.have.a.lengthOf(1);
            const child = root.children[0];
            expect(child.children).to.have.a.lengthOf(1);
            const grandChild = child.children[0];

            const meshComponents = grandChild.getComponents("mesh");
            expect(meshComponents).to.have.a.lengthOf(1);
            const mesh = meshComponents[0].mesh;
            expect(mesh.vertexCount).to.equal(24);
        });

        it('append (loadGltfExtensions)', async function() {
            const { root, extensions } = await WL.scene.append("test/resources/BoxWithExtensions.glb", { loadGltfExtensions: true });

            expect(root).to.be.an.instanceof(Object);

            expect(extensions).to.have.all.keys("root", "node", "mesh", "idMapping");
            expect(extensions.root).to.eql({"TEST_root_extension": {}});

            const child = root.children[0];
            const grandChild = child.children[0];
            expect(extensions.node).to.have.all.keys(grandChild.objectId);
            expect(extensions.node[grandChild.objectId]).to.eql({"TEST_node_extension":{}});
            expect(extensions.mesh).to.have.all.keys(grandChild.objectId);
            expect(extensions.mesh[grandChild.objectId]).to.eql({"TEST_mesh_extension":{}});
        });

    });

});
