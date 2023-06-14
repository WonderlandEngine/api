import {expect, use} from '@esm-bundle/chai';
import {chaiAlmost} from './chai/almost.js';

import {
    Object,
    Collider,
    Component,
    Object3D,
    MeshComponent,
    SceneAppendResultWithExtensions,
} from '..';

import {init, reset, WL} from './setup.js';
import {expectFail, expectSuccess} from './chai/promise.js';

use(chaiAlmost());

before(init);
beforeEach(reset);

describe('Scene', function () {
    it('load(), missing file', async function () {
        let loaded = false;
        WL.onSceneLoaded.add(() => {
            loaded = true;
        });
        await expectFail(WL.scene.load('missing-scene.bin'), 5000);
    });

    it('load()', async function () {
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

        let loaded = false;
        WL.onSceneLoaded.add(() => {
            /* onSceneLoaded callbacks should only be notified once the scene is
             * fully loaded */
            expect(WL.scene.activeViews).to.not.be.empty;
            loaded = true;
        });

        await expectSuccess(WL.scene.load('test/resources/projects/TestSkinnedMesh.bin'));
        expect(loaded).to.be.true;
        expect(onDestroyCalled).to.be.true;
    });

    it('addObject()', function () {
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
        expect(rayHit.objects[1]).to.be.null;
        expect(rayHit.objects[2]).to.be.null;
        expect(rayHit.objects[3]).to.be.null;
    });

    it('addObjects()', function () {
        const objs = WL.scene.addObjects(10, null, 10);
        for (const obj of objs) {
            expect(obj).to.be.an.instanceOf(
                Object,
                `Object '${obj.objectId}' must be an instance of WL.Object`
            );
            expect(obj.objectId).to.be.greaterThan(
                0,
                'Object must have a valid non-zero id'
            );
            expect(obj.objectId).to.be.below(20, `Object '${obj.objectId}' is too high`);
        }
    });

    it('reserveObjects()', function () {
        WL.scene.reserveObjects(99, {'view': 100, 'collision': 101});
    });

    describe('append()', function () {
        it('missing file', async function () {
            return expectFail(WL.scene.append('missing-scene.bin'));
        });

        it('.bin', async function () {
            /* Make sure we have all the pipelines used in the streamed .bin */
            await WL.scene.load('test/resources/projects/TestSkinnedMesh.bin');

            async function appendTest(urlOrBuffer: string | ArrayBuffer) {
                let finished = false;
                let promise = WL.scene.append(urlOrBuffer).finally(() => (finished = true));

                while (!finished) {
                    /* This makes sure we yield to the event loop so the
                     * Promise returned by append() can actually resolve. The
                     * runtime spends 4ms max on main thread jobs. */
                    await new Promise((res) => setTimeout(res, 4));
                    WL.wasm._wl_nextUpdate(0.004);
                }

                const root = (await promise) as Object3D;

                expect(root).to.be.an.instanceof(Object3D);
                expect(root.children).to.have.a.lengthOf(1);
                const child = root.children[0];
                expect(child.children).to.be.empty;
                const meshComponents = child.getComponents('mesh') as MeshComponent[];
                expect(meshComponents).to.have.a.lengthOf(1);

                const mesh = meshComponents[0].mesh;
                expect(mesh).to.not.be.null;
                expect(mesh!.vertexCount).to.equal(10);
            }

            const binFile = 'test/resources/projects/TestStreaming.bin';
            return expectSuccess(
                Promise.all([
                    appendTest(binFile),
                    fetch(binFile).then(async (data) =>
                        appendTest(await data.arrayBuffer())
                    ),
                ])
            );
        });

        it('.glb', async function () {
            const root = (await WL.scene.append('test/resources/Box.glb')) as Object3D;

            expect(root).to.be.an.instanceof(Object3D);
            expect(root.children).to.have.a.lengthOf(1);
            const child = root.children[0];
            expect(child.children).to.have.a.lengthOf(1);
            const grandChild = child.children[0];

            const meshComponents = grandChild.getComponents('mesh') as MeshComponent[];
            expect(meshComponents).to.have.a.lengthOf(1);
            const mesh = meshComponents[0].mesh;
            expect(mesh).to.not.be.null;
            expect(mesh!.vertexCount).to.equal(24);
        });

        it('.glb, loadGltfExtensions', async function () {
            const {root, extensions} = (await WL.scene.append(
                'test/resources/BoxWithExtensions.glb',
                {
                    loadGltfExtensions: true,
                }
            )) as SceneAppendResultWithExtensions;

            expect(root).to.be.an.instanceof(Object3D);

            expect(extensions).to.have.all.keys('root', 'node', 'mesh', 'idMapping');
            expect(extensions.root).to.eql({'TEST_root_extension': {}});

            const child = root!.children[0];
            const grandChild = child.children[0];
            expect(extensions.node).to.have.all.keys(grandChild.objectId);
            expect(extensions.node[grandChild.objectId]).to.eql({
                'TEST_node_extension': {},
            });
            expect(extensions.mesh).to.have.all.keys(grandChild.objectId);
            expect(extensions.mesh[grandChild.objectId]).to.eql({
                'TEST_mesh_extension': {},
            });
        });
    });
});
