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
    ComponentProperty,
    Mesh,
    Skin,
    Animation,
} from '..';

import {init, reset, projectURL, resourceURL, WL} from './setup.js';
import {expectFail, expectSuccess} from './chai/promise.js';
import {fetchWithProgress, getBaseUrl} from '../src/utils/fetch.js';
import {dummyImage, imagePromise, objectSort} from './utils.js';

/* Because we don't use the `index.js` file from each project, we must manually
 * register the components to test. */
import {TestDummyComponent} from './projects/components/js/test-component.js';
import {TestComponentRetarget} from './projects/advanced/js/test-component-retarget.js';

interface PhongMaterial extends Material {
    shininess: number;
    diffuseTexture: Texture;
}

use(chaiAlmost());
before(() => init({loader: true}));

describe('Scene', function () {
    beforeEach(reset);

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

        let loadingScreenEnded = false;
        let loaded = false;

        WL.onLoadingScreenEnd.add(() => {
            /* onLoadingScreenEnd callbacks should be notified before the scene
             * is fully loaded */
            expect(WL.scene.activeViews).to.be.empty;
            expect(loaded).to.be.false;
            loadingScreenEnded = true;
        });

        WL.onSceneLoaded.add(() => {
            /* onSceneLoaded callbacks should only be notified once the scene is
             * fully loaded */
            expect(WL.scene.activeViews).to.not.be.empty;
            loaded = true;
        });

        await expectSuccess(WL.scene.load(projectURL('Advanced.bin')));
        expect(loadingScreenEnded).to.be.true;
        expect(loaded).to.be.true;
        expect(onDestroyCalled).to.be.true;
    });

    it('load() with buffer', async function () {
        const filename = projectURL('Advanced.bin');
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

        expect(WL.scene.children).to.have.lengthOf(2);
        const children = WL.scene.findByName(name);
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

    it('children', function () {
        const obj1 = WL.scene.addObject();
        const obj2 = WL.scene.addObject();
        WL.scene.addObject(obj1);
        WL.scene.addObject(obj2);
        expect(WL.scene.children).to.have.members([obj1, obj2]);
    });

    it('.findByName()', function () {
        const obj1 = WL.scene.addObject();
        obj1.name = 'a';
        const obj2 = WL.scene.addObject();
        obj2.name = 'b';
        const child1 = WL.scene.addObject(obj1);
        child1.name = 'a';

        const root = WL.wrapObject(0);

        /* Scene.findX() forwards to Object3D.findX() */
        expect(WL.scene.findByName('a', false)).to.eql(root.findByName('a', false));
        expect(WL.scene.findByName('a', true)).to.eql(root.findByName('a', true));
        expect(WL.scene.findByNameDirect('a')).to.eql(root.findByNameDirect('a'));
        expect(WL.scene.findByNameRecursive('a')).to.eql(root.findByNameRecursive('a'));
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
        await WL.scene.load(projectURL('Advanced.bin'));

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
            await WL.scene.load(projectURL('Advanced.bin'));

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
                const dummyImg = WL.wasm._images[1];
                expect(dummyImg).to.not.be.undefined;
                expect([dummyImg?.width, dummyImg?.height]).to.eql([42, 43]);
                expect(WL.wasm._images[2]).to.not.be.undefined;
                const img = await imagePromise(WL.wasm._images[2] as HTMLImageElement);
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

        it('.glb', async function () {
            /* Make sure we have all the pipelines used in the streamed .bin */
            await WL.scene.load(projectURL('Advanced.bin'));
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
            await WL.scene.load(projectURL('Advanced.bin'));

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
            expect(WL.wasm._images[1]).to.equal(dummyImages[0]);
            expect(WL.wasm._images[2]).to.equal(dummyImages[1]);

            /* The .glb contains two textures: 2x2 and 4x4 */
            const imgs = (
                await Promise.all([
                    imagePromise(WL.wasm._images[3] as HTMLImageElement),
                    imagePromise(WL.wasm._images[4] as HTMLImageElement),
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
            await WL.scene.load(projectURL('Advanced.bin'));

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

            expect(WL.scene.children).to.have.lengthOf(2);

            {
                const objects = WL.scene.findByName(name);
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
            expect(WL.scene.children).to.have.lengthOf(3);
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
            WL.scene.addObject().addComponent(TestExtraComponent);
            expect(WL.scene.children).to.have.lengthOf(4);

            const appendRoot2 = (await WL.scene.append(
                projectURL('TestJsComponentsAppend.bin')
            )) as Object3D;
            expect(WL.scene.children).to.have.lengthOf(5);
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

describe('Scene.append() > Resource retargeting', async function () {
    /* Registers the component that is used in the test */
    class TestComponent extends Component {
        static TypeName = TestComponentRetarget.TypeName;
        static Properties = TestComponentRetarget.Properties as unknown as Record<
            string,
            ComponentProperty
        >;
        animationProp!: Animation;
        materialProp!: Material;
        meshProp!: Mesh;
        skinProp!: Skin;
        textureProp!: Texture;
        objectProp!: Object3D;
        animationPropUnset!: Animation | null;
        materialPropUnset!: Material | null;
        meshPropUnset!: Mesh | null;
        skinPropUnset!: Skin | null;
        texturePropUnset!: Texture | null;
        objectPropUnset!: Object3D | null;
    }

    let appendedRoot: Object3D = null!;

    /** @todo: When resources are exposed in the API, it will be possible to
     * to properly check that the correct retargeting occurred. For now, we use hardcoded
     * sizes for some resources, such as meshes. */
    const originalMeshCount = 7; /* 6 primitives + one mesh from the scene = an offset of 7 */
    const originalSkinCount = 1;
    const originalTextureCount = 1; /* One 2x2 image */
    const materialOffset = 2; /* 1 default material + one material from the scene */
    const originalAnimCount = 1;

    /* Runs first to pre-load and append the scene, so that all the following
     * tests can access the scene data without re-loading it. */
    before(async function () {
        reset();
        WL.registerComponent(TestComponent);

        const url = projectURL('Advanced.bin');
        await WL.scene.load(url);

        appendedRoot = (await WL.scene.append(url)) as Object3D;
    });

    it('MeshComponent properties', function () {
        const object = WL.scene.findByName('Skinned')[0]?.findByName('object_0')[0];
        expect(object, 'invalid scene graph, the test must be updated').to.not.be.undefined;
        const original = object.getComponent('mesh')!;
        expect(original, 'missing mesh component in skinned hierarchy').to.not.be.null;

        const appendedObject = appendedRoot
            .findByName('Skinned')[0]
            ?.findByName('object_0')[0];
        expect(appendedObject, 'invalid scene graph, the test must be updated').to.not.be
            .undefined;
        const component = appendedObject.getComponent('mesh')!;
        expect(component.mesh).to.not.be.null;
        expect(component.mesh).to.not.be.equal(original.mesh);

        expect(component.mesh!._index).to.be.equal(
            original.mesh!._index + originalMeshCount
        );

        /* Disabled for now because append() currently does not work for materials */
        return;

        const originalMat = original.material!;
        const mat = component.material!;
        expect(mat).to.not.be.equal(originalMat);
        expect(mat._index).to.be.equal(originalMat._index + materialOffset);
    });

    it('AnimationComponent', function () {
        const object = WL.scene.findByNameRecursive('object_1')[0]?.children[0];
        expect(object, 'invalid scene graph, the test must be updated').to.not.be.undefined;
        const original = object.getComponent('animation')!;
        expect(original).to.not.be.null;
        const originalAnim = original.animation!;
        expect(originalAnim).to.not.be.null;

        /* Disabled for now because append() currently does not work for skins or animations */
        return;

        const appendedObject = appendedRoot.findByNameRecursive('object_1')[0]?.children[0];
        expect(appendedObject).to.not.be.undefined;
        const component = appendedObject.getComponent('animation')!;
        expect(component).to.not.be.null;
        const anim = component.animation!;
        expect(anim).to.not.be.null;

        expect(anim).to.not.be.equal(originalAnim);
        expect(anim._index).to.be.equal(originalAnim._index + originalAnimCount);
    });

    it('Js properties', function () {
        /* This test checks that references are properly retargeted
         * upon `append()`. */
        const rootDummy = WL.scene.findByName('Dummy')[0];
        const original = rootDummy.getComponents(TestComponent)[0];

        const dummy = appendedRoot.findByName('Dummy')[0];
        expect(dummy, 'invalid scene graph, the test must be updated').to.not.be.undefined;
        const comp = dummy.getComponents(TestComponent.TypeName)[0] as TestComponent;
        expect(comp).to.not.be.undefined;

        /* Ensure the appended scene has different references for each property */
        expect(comp.animationProp).to.not.equal(
            original.animationProp,
            'animation retargeting'
        );
        expect(comp.animationProp._index).to.equal(
            original.animationProp._index + originalAnimCount
        );

        expect(comp.materialProp).to.not.equal(
            original.materialProp,
            'material retargeting'
        );

        expect(comp.meshProp).to.not.equal(original.meshProp, 'mesh retargeting');
        expect(comp.meshProp._index).to.equal(original.meshProp._index + originalMeshCount);

        expect(comp.skinProp).to.not.equal(original.skinProp, 'skin retargeting');
        expect(comp.skinProp._index).to.equal(original.skinProp._index + originalSkinCount);

        expect(comp.textureProp).to.not.equal(original.textureProp, 'texture retargeting');
        expect(comp.textureProp.id).to.equal(
            original.textureProp.id + originalTextureCount
        );

        expect(comp.objectProp).to.not.equal(original.objectProp, 'object retargeting');
        expect(comp.objectProp.name).to.equal('View');

        /* `null` properties should remain `null` */
        expect(comp.animationPropUnset).to.be.null;
        expect(comp.materialPropUnset).to.be.null;
        expect(comp.meshPropUnset).to.be.null;
        expect(comp.texturePropUnset).to.be.null;
        expect(comp.objectPropUnset).to.be.null;
        expect(comp.skinPropUnset).to.be.null;
    });
});
