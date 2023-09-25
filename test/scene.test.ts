import {expect, use} from '@esm-bundle/chai';
import {chaiAlmost} from './chai/almost.js';

import {
    Collider,
    Component,
    Object3D,
    Material,
    MeshComponent,
    SceneAppendResultWithExtensions,
    Texture,
    AnimationComponent,
} from '..';

import {init, reset, projectURL, resourceURL, WL} from './setup.js';
import {expectFail, expectSuccess} from './chai/promise.js';
import {fetchWithProgress, getBaseUrl} from '../src/utils/fetch.js';

/* Component registered in the `TestJsComponents` project. We need to register it
 * Before loading the scene. */
import {TestDummyComponent} from './projects/components/js/test-component.js';
import {dummyImage, imagePromise} from './utils.js';

interface PhongMaterial extends Material {
    shininess: number;
    diffuseTexture: Texture;
}

use(chaiAlmost());
beforeEach(reset);
before(() => init({loader: true}));

describe('Scene', function () {
    it('load(), missing file', function () {
        return expectFail(WL.scene.load('missing-scene.bin'), 5000);
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

        await expectSuccess(WL.scene.load(projectURL('TestSkinnedMesh.bin')));
        expect(loaded).to.be.true;
        expect(onDestroyCalled).to.be.true;
    });

    it('load() with buffer', async function () {
        const filename = projectURL('TestSkinnedMesh.bin');
        const baseURL = getBaseUrl(filename);
        const buffer = await fetchWithProgress(filename);

        const promise = WL.onSceneLoaded.promise();
        WL.scene.load({buffer, baseURL});

        await expectSuccess(promise);
    });

    it('load() with js component not registered', async function () {
        const name = 'Test';

        /* Contains a single object with a js component.
         * The component is on purpose left unregistered. */
        await WL.scene.load(projectURL('TestJsComponentsMain.bin'));

        const root = WL.wrapObject(0);
        expect(root.children).to.have.lengthOf(2);
        const children = root.findByName(name);
        expect(children[0]).to.be.an.instanceOf(
            Object3D,
            'TestJsComponentsMain.bin invalid scene graph'
        );

        /* Ensures we don't return the wrong component. */
        expect(children[0].getComponent(TestDummyComponent.TypeName)).to.be.null;
        expect(children[0].getComponents()).to.have.lengthOf(0);
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

        const objB = WL.scene.addObject();
        objB.translateObject([0, 0, 12]);
        const colB = objB.addComponent('collision', {
            collider: Collider.Sphere,
            extents: [1, 1, 1],
            group: 1,
        });

        const rayHit = WL.scene.rayCast([0, 0, 0], [0, 0, 1], 1, 10.0);
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

    it('getBaseUrl()', function () {
        const baseURL = getBaseUrl('hello/wonder/land/scene.bin');
        expect(baseURL).to.equal('hello/wonder/land');
    });

    it('get / set skyMaterial', async function () {
        /* Load the base scene with a sky material/ */
        await WL.scene.load(projectURL('TestSkinnedMesh.bin'));

        const material = WL.scene.skyMaterial!;
        expect(material).to.not.be.null;
        expect(material.pipeline).to.equal('Sky');

        WL.scene.skyMaterial = new Material(WL, 1);
        expect(WL.scene.skyMaterial.equals(material)).to.be.false;

        WL.scene.skyMaterial = null;
        expect(WL.scene.skyMaterial).to.be.null;
    });

    describe('append()', async function () {
        it('missing file', async function () {
            return expectFail(WL.scene.append('missing-scene.bin'));
        });

        it('.bin', async function () {
            /* Make sure we have all the pipelines used in the streamed .bin */
            await WL.scene.load(projectURL('TestSkinnedMesh.bin'));

            /* Push dummy image to ensure appending images works */
            new Texture(WL, await dummyImage(42, 43));

            async function appendTest(urlOrBuffer: string | ArrayBuffer) {
                const root = (await WL.scene.append(urlOrBuffer)) as Object3D;

                expect(root).to.be.an.instanceof(Object3D);

                const child = root.findByName('Mesh')[0];
                expect(child !== undefined, 'TestStreaming.bin invalid scene graph');
                expect(child.children).to.be.empty;
                const meshComponents = child.getComponents('mesh') as MeshComponent[];
                expect(meshComponents).to.have.a.lengthOf(1);

                const comp = meshComponents[0]!;

                /* Ensures the mesh is a cube with 24 vertices. */
                const mesh = comp.mesh!;
                expect(mesh).to.not.be.null;
                expect(mesh!.vertexCount).to.equal(24);

                /* Ensures the material has proper type and values. */
                expect(comp.material).to.not.be.null;
                expect(comp.material!.pipeline).to.equal('Phong Opaque');

                /* Ensure images are properly retargeted. */
                const dummyImg = WL.wasm._images[0];
                expect(dummyImg).to.not.be.undefined;
                expect([dummyImg?.width, dummyImg?.height]).to.eql([42, 43]);
                expect(WL.wasm._images[1]).to.not.be.undefined;
                const img = await imagePromise(WL.wasm._images[1] as HTMLImageElement);
                expect([img?.width, img?.height]).to.eql([2, 2]);

                /* Ensure that compressed images are retargeted. */
                const withTexture = root.findByName('MeshCompressedTexture')[0];
                expect(withTexture !== undefined, 'TestStreaming.bin invalid scene graph');
                {
                    const material = withTexture.getComponent('mesh')
                        ?.material as PhongMaterial;
                    expect(material).to.not.be.undefined;
                    /* Index 0 reserved, one dummy, one uncompressed texture, and this one. */
                    const id = material.diffuseTexture.id;
                    expect(id === 3 || id === 6);
                }
            }

            const binFile = projectURL('TestStreaming.bin');
            return Promise.all([
                appendTest(binFile),
                fetch(binFile)
                    .then(async (data) => data.arrayBuffer())
                    .then(appendTest),
            ]);
        });

        it('resourceOffset', async function () {
            const binFile = 'test/resources/projects/TestSkinnedMesh.bin';
            await WL.scene.load(binFile);
            await WL.scene.append(binFile);

            const root = WL.wrapObject(0);
            expect(root.children).to.have.a.lengthOf(4);

            const otherRoot = root.children[3];
            expect(otherRoot.children).to.have.lengthOf(3);

            const skinnedMeshObject = root
                .findByName('Skinned')[0]
                .findByName('object_0')[0];
            expect(skinnedMeshObject).to.not.be.undefined;
            const meshComponent = skinnedMeshObject.getComponent('mesh') as MeshComponent;
            expect(meshComponent).to.not.be.null;

            const otherSkinnedMeshObject = otherRoot
                .findByName('Skinned')[0]
                .findByName('object_0')[0];
            expect(otherSkinnedMeshObject).to.not.be.undefined;
            const otherMeshComponent = otherSkinnedMeshObject.getComponent('mesh')!;
            expect(otherMeshComponent).to.not.be.null;

            expect(otherMeshComponent.mesh).to.not.be.null;
            expect(otherMeshComponent.mesh).to.not.be.equal(meshComponent.mesh);

            /* There are 6 primitives + one mesh from the scene = an offset of 7 */
            const meshOffset = 7;
            expect(otherMeshComponent.mesh!._index).to.be.equal(
                meshComponent.mesh!._index + meshOffset
            );

            /* Disabled for now because append() currently does not work for skins or animations
             * And it seems materials have some weird behaviour as well */
            return;

            const material = meshComponent.material;
            expect(material).to.not.be.null;
            const otherMaterial = otherMeshComponent.material;
            expect(otherMaterial).to.not.be.null;
            expect(material).to.not.be.equal(otherMaterial);
            /* 1 default material + one material from the scene = an offset of 2 */
            const materialOffset = 2;
            expect(otherMaterial?._index).to.be.equal(
                Number(material?._index) + materialOffset
            );

            const rootBone = root.children[1];
            expect(rootBone.children).to.have.lengthOf(1);
            const animationComponent = rootBone.children[0].getComponent(
                'animation'
            ) as AnimationComponent;
            expect(animationComponent).to.not.be.null;
            const animation = animationComponent.animation;
            expect(animation).to.not.be.null;

            const otherRootBone = otherRoot.children[1];
            const otherAnimationComponent = otherRootBone.children[0].getComponent(
                'animation'
            ) as AnimationComponent;
            expect(otherAnimationComponent).to.not.be.null;
            const otherAnimation = otherAnimationComponent.animation;
            expect(otherAnimation).to.not.be.null;

            expect(animation).to.not.be.equal(otherAnimation);

            expect(otherAnimation?._index).to.be.equal(Number(animation?._index) + 1);
        });

        it('.glb', async function () {
            /* Make sure we have all the pipelines used in the streamed .bin */
            await WL.scene.load(projectURL('TestSkinnedMesh.bin'));
            const root = (await WL.scene.append(resourceURL('Box.glb'))) as Object3D;

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

        it('.glb with textures', async function () {
            /* Make sure we have all the pipelines used in the streamed .bin */
            await WL.scene.load(projectURL('TestSkinnedMesh.bin'));

            /* Appends two dummy textures to ensure images indices are correct. */
            const dummyImages = await Promise.all([dummyImage(42, 42), dummyImage(43, 43)]);
            new Texture(WL, dummyImages[0]);
            new Texture(WL, dummyImages[1]);

            const root = (await WL.scene.append(
                resourceURL('TwoPlanesWithTextures.glb')
            )) as Object3D;
            expect(root).to.be.an.instanceof(Object3D);
            expect(root.children).to.have.a.lengthOf(2);

            /* Ensure images are properly retargeted. */
            expect(WL.wasm._images[0]).to.equal(dummyImages[0]);
            expect(WL.wasm._images[1]).to.equal(dummyImages[1]);

            /* The .glb contains two textures: 2x2 and 4x4 */
            const imgs = (
                await Promise.all([
                    imagePromise(WL.wasm._images[2] as HTMLImageElement),
                    imagePromise(WL.wasm._images[3] as HTMLImageElement),
                ])
            ).sort((a, b) => a.width - b.width);
            expect([imgs[0]?.width, imgs[0]?.height]).to.eql([2, 2]);
            expect([imgs[1]?.width, imgs[1]?.height]).to.eql([4, 4]);

            /* @todo: Test the dimensions of the images. It's unfortunately
             * not possible right now, because the images created on the runtime
             * side do not have the `Texture._imageIndex` index. */
            const objA = root.findByName('PlaneA')[0];
            expect(objA).to.not.be.undefined;
            const objB = root.findByName('PlaneB')[0];
            expect(objB).to.not.be.undefined;

            const compA = objA.getComponent('mesh');
            expect(compA).to.not.be.undefined;
            const materialA = compA?.material as PhongMaterial;
            expect(materialA).to.not.be.undefined;
            expect(materialA.pipeline).to.equal('Phong Opaque Textured');
            expect(materialA.shininess).to.be.lessThanOrEqual(20);

            const compB = objB.getComponent('mesh');
            expect(compB).to.not.be.undefined;
            const materialB = compB?.material as PhongMaterial;
            expect(materialB).to.not.be.undefined;
            expect(materialB.pipeline).to.equal('Phong Opaque Textured');
            expect(materialB.shininess).to.be.greaterThanOrEqual(140);
        });

        it('.glb, loadGltfExtensions', async function () {
            /* Make sure we have all the pipelines used in the streamed .bin */
            await WL.scene.load(projectURL('TestSkinnedMesh.bin'));

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

    describe('append() validate managers', function () {
        /* The TestJsComponents project has two .wlp:
         *     - TestJsComponentsMain: Main scene with two objects, one using `TestComponent`
         *     - TestJsComponentsAppend: Streamable with one object using `TestComponent` */
        it('js manager', async function () {
            const name = 'Test';

            /* `TestDummyComponent` doesn't inherit from `Component`. This allows the
             * test project skip npm install.
             * Thus, we need to create a new component and assign it the `TestDummyComponent` prototype. */
            class TestComponent extends Component {
                static TypeName = TestDummyComponent.TypeName;
                static Properties = TestDummyComponent.Properties;
                hi!: string;
            }
            TestComponent.prototype.init = TestDummyComponent.prototype.init;
            TestComponent.prototype.start = TestDummyComponent.prototype.start;
            WL.registerComponent(TestComponent);

            /* Contains a single object with a js component */
            await WL.scene.load(projectURL('TestJsComponentsMain.bin'));

            const root = WL.wrapObject(0);
            expect(root.children).to.have.lengthOf(2);

            {
                const objects = root.findByName(name);
                expect(objects).to.have.length(
                    1,
                    'TestJsComponentsMain.bin invalid scene graph'
                );
                const comp = objects[0].getComponent(TestComponent);
                expect(comp).to.not.be.null;
                expect(comp!.hi).to.equal('Hello 42');
            }

            const appendRoot = (await WL.scene.append(
                projectURL('TestJsComponentsAppend.bin')
            )) as Object3D;
            expect(root.children).to.have.lengthOf(3);
            expect(appendRoot.children).to.have.lengthOf(1);
            expect(appendRoot).to.be.an.instanceOf(Object3D);
            {
                const objects = appendRoot.findByName(name);
                expect(objects).to.have.length(
                    1,
                    'TestJsComponentsAppend.bin invalid scene graph'
                );
                const comp = objects[0].getComponent(TestComponent);
                expect(comp).to.not.be.null;
                expect(comp!.hi).to.equal('Hello 43');
            }

            /* Add dummy component to ensure appending with offset works as expected. */
            class TestExtraComponent extends Component {
                static TypeName = 'test-extra-dummy-offset';
            }
            WL.registerComponent(TestExtraComponent);
            WL.scene.addObject(root).addComponent(TestExtraComponent);
            expect(root.children).to.have.lengthOf(4);

            const appendRoot2 = (await WL.scene.append(
                projectURL('TestJsComponentsAppend.bin')
            )) as Object3D;
            expect(root.children).to.have.lengthOf(5);
            expect(appendRoot2.children).to.have.lengthOf(1);
            expect(appendRoot2).to.be.an.instanceOf(Object3D);
            {
                const objects = appendRoot2.findByName(name);
                expect(objects).to.have.length(
                    1,
                    'TestJsComponentsAppend.bin invalid scene graph'
                );
                const comp = objects[0].getComponent(TestComponent);
                expect(comp).to.not.be.null;
                expect(comp!.hi).to.equal('Hello 43');
                expect(comp).to.not.equal(appendRoot.children[0]);
            }
        });
    });
});
