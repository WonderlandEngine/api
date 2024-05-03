import {expect, use} from '@esm-bundle/chai';
import {chaiAlmost} from './chai/almost.js';

import {
    Collider,
    Object3D,
    MeshComponent,
    Texture,
    Mesh,
    Animation,
    Scene,
    InMemoryLoadOptions,
    LightComponent,
    CollisionComponent,
    ViewComponent,
    AnimationComponent,
    Skin,
    Material,
    Prefab,
} from '..';

import {init, reset, projectURL, WL, describeScene} from './setup.js';
import {expectFail} from './chai/promise.js';
import {fetchWithProgress, getBaseUrl} from '../src/utils/fetch.js';
import {dummyImage, loadProjectBins} from './utils.js';

/* Because we don't use the `index.js` file from each project, we must manually
 * register the components to test. */
import {
    TestComponentActivatedWithParam,
    TestComponentBase,
} from './projects/components/js/test-component.js';
import {TestComponentRetarget} from './projects/advanced/js/test-component-retarget.js';
import {PhongMaterial} from './types.js';

use(chaiAlmost());
before(() => init({loader: true}));

/* Use in-memory .bin as much as possible to speed up the tests. */
let bins: InMemoryLoadOptions[] = [];
try {
    bins = await loadProjectBins('Advanced.bin', 'Tiny.bin', 'TestStreaming.bin');
} catch (e) {
    console.error('Failed to load required test scenes');
    throw e;
}
const advancedBin = bins[0];
const tinyBin = bins[1];
const streamingBin = bins[2];

describe('Scene', function () {
    beforeEach(reset);

    it('js components have access to engine.scene as current scene', async function () {
        class TestComponent extends TestComponentRetarget {
            static TypeName = TestComponentRetarget.TypeName;

            initScene: number | null = null;
            startScene: number | null = null;

            init() {
                this.initScene = this.engine.scene._index;
            }
            start() {
                this.startScene = this.engine.scene._index;
            }
        }

        WL.registerComponent(TestComponent);

        const scene = await WL.loadMainSceneFromBuffer(advancedBin);

        const dummy = scene.findByNameRecursive('Dummy')[0];
        expect(dummy).to.not.be.undefined;
        const comp = dummy.getComponent(TestComponent)!;
        expect(comp).to.not.be.null;

        /* When using `loadMainScene`, there is no access anymore to the previous scene on the engine */
        expect(comp.initScene).to.equal(scene._index);
        expect(comp.startScene).to.equal(scene._index);
    });

    it('.destroy()', function () {
        const previous = WL.scene;
        const scene = WL._createEmpty();

        WL.switchTo(scene);
        expect(() => scene.destroy()).to.throw(
            "Attempt to destroy Scene('', 1), but destroying the active scene is not supported"
        );

        WL.switchTo(previous);
        scene.destroy();
        expect(scene.isDestroyed);
    });

    it('.destroy() with prototype destruction', function () {
        WL.erasePrototypeOnDestroy = true;

        const scene = WL._createEmpty();
        const obj = scene.addObject();
        scene.destroy();

        expect(scene.isDestroyed).to.be.true;
        expect(obj.isDestroyed).to.be.true;
        expect(() => scene.addObject()).to.throw(
            `Cannot read 'addObject' of destroyed prefab/scene`
        );
    });
});

describeScene('Scene Graph', function (ctx) {
    it('addObject()', function () {
        const obj = ctx.scene.addObject();
        expect(obj).to.be.an.instanceof(Object);

        const child = ctx.scene.addObject(obj);
        expect(child).to.be.an.instanceof(Object);
        expect(obj.children).to.have.members([child]);
        expect(child.parent).to.equal(obj);
    });

    it('addObject() with an object belonging to different scene', function () {
        const otherScene = WL._createEmpty();
        const parent = otherScene.addObject();
        parent.name = 'parent';
        expect(() => ctx.scene.addObject(parent)).to.throw(
            `Attempt to use ${parent} from ${parent.scene} in ${ctx.scene}`
        );
    });

    it('children', function () {
        const obj1 = ctx.scene.addObject();
        const obj2 = ctx.scene.addObject();
        ctx.scene.addObject(obj1);
        ctx.scene.addObject(obj2);
        expect(ctx.scene.children).to.have.members([obj1, obj2]);
    });

    it('.findByName()', function () {
        const obj1 = ctx.scene.addObject();
        obj1.name = 'a';
        const obj2 = ctx.scene.addObject();
        obj2.name = 'b';
        const child1 = ctx.scene.addObject(obj1);
        child1.name = 'a';

        const root = ctx.scene.wrap(0);

        /* Scene.findX() forwards to Object3D.findX() */
        expect(ctx.scene.findByName('a', false)).to.eql(root.findByName('a', false));
        expect(ctx.scene.findByName('a', true)).to.eql(root.findByName('a', true));
        expect(ctx.scene.findByNameDirect('a')).to.eql(root.findByNameDirect('a'));
        expect(ctx.scene.findByNameRecursive('a')).to.eql(root.findByNameRecursive('a'));
    });

    it('activeViews', function () {
        const obj = ctx.scene.addObject();
        obj.addComponent('view');

        const views = ctx.scene.activeViews;
        expect(views.length).to.equal(1);
        expect(views[0]._localId).to.equal(0);
    });

    it('rayCast()', function () {
        const objA = ctx.scene.addObject();
        objA.translateObject([0, 0, 10]);
        const col = objA.addComponent('collision', {
            collider: Collider.Sphere,
            extents: [1, 1, 1],
            group: 1,
        });

        const objB = ctx.scene.addObject();
        objB.translateObject([0, 0, 12]);
        const colB = objB.addComponent('collision', {
            collider: Collider.Sphere,
            extents: [1, 1, 1],
            group: 1,
        });

        const rayHit = ctx.scene.rayCast([0, 0, 0], [0, 0, 1], 1, 10.0);
        expect(rayHit.hitCount).to.equal(1);
        expect(rayHit.objects[0]).to.equal(objA);
        expect(rayHit.objects[1]).to.be.null;
        expect(rayHit.objects[2]).to.be.null;
        expect(rayHit.objects[3]).to.be.null;
    });

    it('addObjects()', function () {
        const objs = ctx.scene.addObjects(10, null, 10);
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
        ctx.scene.reserveObjects(99, {'view': 100, 'collision': 101, 'my-component': 102});
    });

    it('get / set skyMaterial', async function () {
        /* Load the base scene with a sky material/ */
        const scene = await WL.loadMainSceneFromBuffer(advancedBin);

        const material = scene.skyMaterial!;
        expect(material).to.not.be.null;
        expect(material.pipeline).to.equal('Sky');

        scene.skyMaterial = WL.materials.wrap(1);
        expect(scene.skyMaterial!.equals(material)).to.be.false;

        scene.skyMaterial = null;
        expect(scene.skyMaterial).to.be.null;
    });

    it('js components deactivated / activated during scene switch', function () {
        class TestComponent extends TestComponentBase {
            static TypeName = 'lifecycle-component';
        }
        WL.registerComponent(TestComponent);

        const sceneA = WL.scene;
        const sceneB = WL._createEmpty();

        /* Add object and component in `sceneA` */
        const objA = WL.scene.addObject();
        const componentA = objA.addComponent(TestComponent);
        const componentAInactive = objA.addComponent(TestComponent, {active: false});
        expect(componentA.order).to.eql(['init', 'started', 'activated']);
        expect(componentAInactive.order).to.eql(['init']);

        /* Components from `sceneA` must be deactivated */
        WL.switchTo(sceneB);
        expect(componentA.order).to.eql(['init', 'started', 'activated', 'deactivated']);
        expect(componentAInactive.order).to.eql(['init']);

        const objB = WL.scene.addObject();
        const componentB = objB.addComponent(TestComponent);
        const componentBInactive = objB.addComponent(TestComponent, {active: false});
        expect(componentB.order).to.eql(['init', 'started', 'activated']);
        expect(componentBInactive.order).to.eql(['init']);

        /* Switching back to `sceneA` must deactivate `sceneB` and reactivate `sceneA` */
        WL.switchTo(sceneA);
        expect(componentA.order).to.eql([
            'init',
            'started',
            'activated',
            'deactivated',
            'activated',
        ]);
        expect(componentAInactive.order).to.eql(['init']);
        expect(componentB.order).to.eql(['init', 'started', 'activated', 'deactivated']);
        expect(componentBInactive.order).to.eql(['init']);
    });
});

describeScene('Scene > .instantiate()', function (ctx) {
    it('instantiation with native components', function () {
        const scene = ctx.scene;
        expect(scene.children).to.have.lengthOf(0);

        const toInstantiate = WL._createEmpty();
        {
            const parent = toInstantiate.addObject();
            parent.name = 'parent';
            parent.addComponent(MeshComponent);

            const child = toInstantiate.addObject(parent);
            expect(toInstantiate.children).to.have.lengthOf(1);

            child.name = 'child';
            child.addComponent(LightComponent);
            child.addComponent(CollisionComponent);
            child.addComponent(ViewComponent);
            child.addComponent(AnimationComponent);
        }

        expect(scene.children).to.have.lengthOf(0);

        const result = scene.instantiate(toInstantiate)!;
        expect(scene.children).to.have.lengthOf(1);

        const {root} = result;
        expect(root.objectId).to.equal(1);
        const parent = root.children[0];
        expect(parent.name).to.equal('parent');
        expect(parent.getComponent(MeshComponent)).be.an.instanceOf(MeshComponent);

        const child = parent.children[0];
        expect(child.name).to.equal('child');
        expect(child.getComponent(LightComponent)).to.be.an.instanceOf(LightComponent);
        expect(child.getComponent(CollisionComponent)).to.be.an.instanceOf(
            CollisionComponent
        );
        expect(child.getComponent(ViewComponent)).to.be.an.instanceOf(ViewComponent);
        expect(child.getComponent(AnimationComponent)).to.be.an.instanceOf(
            AnimationComponent
        );
    });

    it('multiple instantiation native components', function () {
        const scene = ctx.scene;
        expect(scene.children).to.have.lengthOf(0);

        const srcScene = WL._createEmpty();
        {
            const obj = srcScene.addObject();
            obj.name = 'source';
            obj.addComponent(MeshComponent);
            obj.addComponent(ViewComponent, {active: false});
            obj.addComponent(AnimationComponent, {active: false});
            expect(srcScene.children).to.have.lengthOf(1);
        }

        const dstScene = WL._createEmpty();
        {
            const obj = dstScene.addObject();
            obj.name = 'destination';
            obj.addComponent(CollisionComponent);
            obj.addComponent(LightComponent, {active: false});
            expect(dstScene.children).to.have.lengthOf(1);
        }

        dstScene.instantiate(srcScene);
        expect(scene.children).to.have.lengthOf(0);
        expect(dstScene.children).to.have.lengthOf(2);

        /*
         * root (from dstScene)
         *     -> destination
         *     -> root (from srcScene)
         *         -> source
         */
        const {root} = scene.instantiate(dstScene)!;
        expect(root._localId).to.equal(1);

        const [destination, subroot] = root.children;
        expect(destination).to.not.be.undefined;
        expect(destination.name).to.equal('destination');
        expect(destination.getComponent(CollisionComponent)).to.be.an.instanceOf(
            CollisionComponent
        );
        expect(destination.getComponent(LightComponent)).to.be.an.instanceOf(
            LightComponent
        );

        expect(subroot).to.not.be.undefined;
        const source = subroot.children[0];
        expect(source.name).to.equal('source');
        expect(source.getComponent(MeshComponent)).to.be.an.instanceOf(MeshComponent);
        expect(source.getComponent(ViewComponent)).to.be.an.instanceOf(ViewComponent);
        expect(source.getComponent(AnimationComponent)).to.be.an.instanceOf(
            AnimationComponent
        );
    });

    it('instantiation with js components', async function () {
        WL.registerComponent(TestComponentRetarget);

        const scene = ctx.scene;
        const mesh = WL.meshes.create({vertexCount: 1});
        const texture = WL.textures.create(await dummyImage(1, 2));

        const toInstantiate = await WL._createEmpty();
        {
            const obj = toInstantiate.addObject();
            const child = toInstantiate.addObject(obj);
            child.name = 'child';

            /* Material definitions, skins, and animations can't be created.
             * using the API yet. Use null resource for those. */
            const component = obj.addComponent(TestComponentRetarget);
            component.materialProp = WL.materials.wrap(0)!;
            component.skinProp = toInstantiate.skins.wrap(0)!;
            component.animationProp = toInstantiate.animations.wrap(0)!;
            component.meshProp = mesh;
            component.textureProp = texture;
            component.objectProp = child;
        }
        expect(scene.children).to.have.lengthOf(0);

        for (let i = 0; i < 2; ++i) {
            const {root} = scene.instantiate(toInstantiate);
            expect(root.children).to.have.lengthOf(1);

            const parent = root.children[0];
            expect(parent).to.not.be.undefined;

            const child = parent.findByNameRecursive('child')[0];
            expect(child).to.not.be.undefined;
            expect(child).to.not.equal(toInstantiate.findByNameRecursive('child')[0]);

            /* Properties reference */
            const comp = parent.getComponent(TestComponentRetarget)!;
            expect(comp).to.not.be.undefined;
            expect(comp.objectProp).to.equal(child);
            expect(comp.meshProp).to.equal(mesh);
            expect(comp.textureProp).to.equal(texture);
        }
    });
});

describe('Scene > .instance() resources retargeting', function () {
    /** @todo: When resources are exposed in the API, it will be possible to
     * to properly check that the correct retargeting occurred. For now, we use hardcoded
     * sizes for some resources, such as meshes. */

    const instanceCount = 2; /* Number of instantiation to perform */
    const originalSkinCount = 1;
    const originalAnimCount = 1;

    let mainScene: Scene = null!;
    let mainObject: Object3D = null!;
    let mainDummy: Object3D = null!;

    let scene: Scene = null!;
    let sceneDummy: Object3D = null!;
    const instances: Object3D[] = [];

    /* Runs first to pre-load and append the scene, so that all the following
     * tests can access the scene data without re-loading it. */
    before(async function () {
        reset();
        WL.registerComponent(TestComponentRetarget);

        mainScene = await WL.loadMainSceneFromBuffer(advancedBin);
        scene = await WL.loadSceneFromBuffer(advancedBin);
    });

    /* This test must run first */
    it('instantiate multiple', function () {
        mainObject = mainScene.findByNameRecursive('object_0')[0];
        expect(mainObject, 'invalid scene graph, the test must be updated').to.not.be
            .undefined;

        mainDummy = mainScene.findByName('Dummy')[0];
        expect(mainDummy, 'invalid scene graph, the test must be updated').to.not.be
            .undefined;

        sceneDummy = scene.findByName('Dummy')[0];
        expect(sceneDummy, 'invalid scene graph, the test must be updated').to.not.be
            .undefined;

        for (let i = 0; i < instanceCount; ++i) {
            instances.push(mainScene.instantiate(scene).root);
        }
    });

    for (let i = 0; i < instanceCount; ++i) {
        it(`AnimationComponent ${i}`, function () {
            const original = mainObject.getComponent('animation')!;
            expect(original).to.not.be.null;
            const originalAnim = original.animation!;
            expect(originalAnim).to.not.be.null;

            const appendedObject = instances[i].findByNameRecursive('object_0')[0];
            expect(appendedObject).to.not.be.undefined;

            const component = appendedObject.getComponent('animation')!;
            expect(component).to.not.be.null;

            const anim = component.animation!;
            expect(anim).to.not.be.null;
            expect(anim.equals(originalAnim)).to.be.false;
            expect(anim._index).to.be.equal(originalAnimCount + 1);
        });

        it(`Js Properties ${i}`, function () {
            const dummy = instances[i].findByName('Dummy')[0];
            expect(dummy, 'invalid scene graph, the test must be updated').to.not.be
                .undefined;
            const comp = dummy.getComponents(TestComponentRetarget)[0];
            expect(comp).to.not.be.undefined;

            /* Meshes, materials, and textures should not change with an instantiation.
             * However, the same scene is loaded twice, so the resources are duplicated. */
            {
                const original = sceneDummy.getComponents(TestComponentRetarget)[0];
                expect(comp.meshProp.equals(original.meshProp)).to.be.true;
                expect(comp.textureProp.equals(original.textureProp)).to.be.true;
                expect(comp.materialProp.equals(original.materialProp)).to.be.true;
            }
            const original = mainDummy.getComponents(TestComponentRetarget)[0];
            expect(comp.meshProp.equals(original.meshProp)).to.be.false;
            expect(comp.textureProp.equals(original.textureProp)).to.be.false;
            expect(comp.materialProp.equals(original.materialProp)).to.be.false;

            /* Ensure the appended scene has different references for each property */
            const animOffset = originalAnimCount * (i + 1);
            expect(comp.animationProp.equals(original.animationProp)).to.be.false;
            expect(comp.animationProp._index).to.equal(
                original.animationProp._index + animOffset
            );

            const skinOffset = originalSkinCount * (i + 1);
            expect(comp.skinProp.equals(original.skinProp)).to.be.false;

            expect(comp.objectProp).to.not.equal(original.objectProp, 'object retargeting');
            expect(comp.objectProp.name).to.equal('View');

            /* `null` properties should remain `null` */
            expect(comp.animationPropUnset).to.be.null;
            expect(comp.materialPropUnset).to.be.null;
            expect(comp.meshPropUnset).to.be.null;
            expect(comp.texturePropUnset).to.be.null;
            expect(comp.objectPropUnset).to.be.null;
            expect(comp.skinPropUnset).to.be.null;

            /* non-reference number properties should remain as is */
            expect(comp.intProp).to.equal(3);
            expect(comp.floatProp).to.equal(4.5);
            expect(comp.enumProp).to.equal(1);
        });
    }
});

describe('Scene Loading', function () {
    it('load with js component not registered', async function () {
        const name = 'Test';

        /* Contains a single object with a js component.
         * The component is on purpose left unregistered. */
        const scene = await WL.loadMainScene(projectURL('TestJsComponentsMain.bin'));

        expect(scene.children).to.have.lengthOf(2);
        const children = scene.findByName(name);
        expect(children[0]).to.be.an.instanceOf(
            Object3D,
            'TestJsComponentsMain.bin invalid scene graph'
        );

        /* Ensures we don't return the wrong component. */
        expect(children[0].getComponent(TestComponentActivatedWithParam.TypeName)).to.be
            .null;
        expect(children[0].getComponents()).to.have.lengthOf(0);
    });

    describe('prefab/scene/gltf', function () {
        before(async function () {
            reset();
            await WL.loadMainSceneFromBuffer(advancedBin);
        });

        it('loadPrefabFromBuffer() should return a Prefab instance, not a Scene', async function () {
            const prefab = await WL.loadPrefabFromBuffer(streamingBin);
            expect(prefab).to.be.an.instanceOf(Prefab);
            expect(prefab).to.not.be.an.instanceOf(Scene);
        });

        it('throw when using loadPrefabFromBuffer() with non-streamable .bin', function () {
            expect(function () {
                WL.loadPrefabFromBuffer(advancedBin);
            }).to.throw('File is not a prefab. To load a scene, use loadScene() instead');
        });

        it('throw when using loadSceneFromBuffer() with streamable .bin', function () {
            expect(function () {
                WL.loadSceneFromBuffer(streamingBin);
            }).to.throw('File is not a scene. To load a prefab, use loadPrefab() instead');
        });
    });

    it('Js properties', async function () {
        reset();
        WL.registerComponent(TestComponentRetarget);

        const scene = await WL.loadMainSceneFromBuffer(advancedBin);

        const dummy = scene.findByName('Dummy')[0];
        expect(dummy).to.not.be.undefined;
        const comp = dummy.getComponents(TestComponentRetarget)[0];
        expect(comp).to.not.be.undefined;

        expect(comp.animationProp).to.be.instanceOf(Animation);
        expect(comp.materialProp).to.be.instanceOf(Material);
        expect(comp.meshProp).to.be.instanceOf(Mesh);
        expect(comp.skinProp).to.be.instanceOf(Skin);
        expect(comp.textureProp).to.be.instanceOf(Texture);
        expect(comp.objectProp).to.be.instanceOf(Object3D);

        expect(comp.animationPropUnset).to.be.null;
        expect(comp.materialPropUnset).to.be.null;
        expect(comp.meshPropUnset).to.be.null;
        expect(comp.skinPropUnset).to.be.null;
        expect(comp.texturePropUnset).to.be.null;
        expect(comp.objectPropUnset).to.be.null;

        /* Values set in the .wlp and serialized through CBOR */
        expect(comp.boolProp).to.equal(true);
        expect(comp.intProp).to.equal(3);
        expect(comp.floatProp).to.equal(4.5);
        expect(comp.enumProp).to.equal(1);
        expect(comp.colorProp).to.be.instanceOf(Float32Array);
        /* Colors are serialized with 8 bits per channel */
        expect(comp.colorProp).to.deep.almost([0.05, 0.5, 0.75, 0.8], 1.0 / 255.0);
        expect(comp.vector2Prop).to.be.instanceOf(Float32Array);
        expect(comp.vector2Prop).to.deep.almost([0.25, 12.5]);
        expect(comp.vector3Prop).to.be.instanceOf(Float32Array);
        expect(comp.vector3Prop).to.deep.almost([0.35, 13.5, 3.75]);
        expect(comp.vector4Prop).to.be.instanceOf(Float32Array);
        expect(comp.vector4Prop).to.deep.almost([0.45, 14.5, 4.75, 2.0]);

        /* Default values set on the component but not set in the .wlp,
         * serialized as undefined in CBOR and retrieved from the component */
        expect(comp.boolPropUnset).to.equal(true);
        expect(comp.intPropUnset).to.equal(7);
        expect(comp.floatPropUnset).to.equal(1.2);
        expect(comp.enumPropUnset).to.equal(2);
        expect(comp.colorPropUnset).to.not.equal(
            TestComponentRetarget.Properties.colorPropUnset.default
        );
        expect(comp.colorPropUnset).to.be.instanceOf(Float32Array);
        expect(comp.colorPropUnset).to.deep.almost([0.1, 0.2, 0.3, 0.4], 1.0 / 255.0);
        expect(comp.vector2PropUnset).to.not.equal(
            TestComponentRetarget.Properties.vector2PropUnset.default
        );
        expect(comp.vector2PropUnset).to.be.instanceOf(Float32Array);
        expect(comp.vector2PropUnset).to.deep.almost([1.0, 2.0]);
        expect(comp.vector3PropUnset).to.not.equal(
            TestComponentRetarget.Properties.vector3PropUnset.default
        );
        expect(comp.vector3PropUnset).to.be.instanceOf(Float32Array);
        expect(comp.vector3PropUnset).to.deep.almost([3.0, 4.0, 5.0]);
        expect(comp.vector4PropUnset).to.not.equal(
            TestComponentRetarget.Properties.vector4PropUnset.default
        );
        expect(comp.vector4PropUnset).to.be.instanceOf(Float32Array);
        expect(comp.vector4PropUnset).to.deep.almost([6.0, 7.0, 8.0, 9.0]);
    });

    describe('Resources retargeting', async function () {
        let mainScene: Scene = null!;
        let scene: Scene = null!;

        /** @todo: When resources are exposed in the API, it will be possible to
         * to properly check that the correct retargeting occurred. For now, we use hardcoded
         * sizes for some resources, such as meshes. */
        const originalMeshCount = 7; /* 6 primitives + one mesh from the scene = an offset of 7 */
        const originalTextureCount = 1; /* One 2x2 image */
        const materialOffset = 4; /* 1 default material, textured, material, and sky */

        /* Runs first to pre-load and append the scene, so that all the following
         * tests can access the scene data without re-loading it. */
        before(async function () {
            reset();
            WL.registerComponent(TestComponentRetarget);

            mainScene = await WL.loadMainSceneFromBuffer(advancedBin);
            scene = await WL.loadSceneFromBuffer(advancedBin);
        });

        it('MeshComponent properties', function () {
            const object = mainScene.findByName('Skinned')[0]?.findByName('object_0')[0];
            expect(object, 'invalid scene graph, the test must be updated').to.not.be
                .undefined;
            const original = object.getComponent('mesh')!;
            expect(original, 'missing mesh component in skinned hierarchy').to.not.be.null;

            const newObject = scene.findByName('Skinned')[0]?.findByName('object_0')[0];
            expect(newObject, 'invalid scene graph, the test must be updated').to.not.be
                .undefined;
            const component = newObject.getComponent('mesh')!;
            expect(component.mesh).to.not.be.null;
            expect(component.mesh).to.not.be.equal(original.mesh);

            expect(component.mesh!._index).to.be.equal(
                original.mesh!._index + originalMeshCount
            );

            const originalMat = original.material!;
            const mat = component.material!;
            expect(mat).to.not.be.equal(originalMat);
            expect(mat._index).to.be.equal(originalMat._index + materialOffset);
        });

        it('AnimationComponent', function () {
            const object = mainScene.findByNameRecursive('object_0')[0];
            expect(object, 'invalid scene graph, the test must be updated').to.not.be
                .undefined;
            const original = object.getComponent('animation')!;
            expect(original).to.not.be.null;
            const originalAnim = original.animation!;
            expect(originalAnim).to.not.be.null;

            const newObject = scene.findByNameRecursive('object_0')[0];
            expect(newObject).to.not.be.undefined;
            const component = newObject.getComponent('animation')!;
            expect(component).to.not.be.null;
            const anim = component.animation!;
            expect(anim).to.not.be.null;

            /* Animations are per-scene, and shouldn't be retargeted upon loading */
            expect(anim._id).to.not.be.equal(originalAnim._id);
            expect(anim._index).to.be.equal(originalAnim._index);

            /* Blend factor property */
            const animBlending = mainScene.findByNameRecursive('AnimationBlending')[0];
            const appendedAnimBlending = scene.findByNameRecursive('AnimationBlending')[0];
            expect(animBlending).to.not.be.undefined;
            expect(appendedAnimBlending).to.not.be.undefined;
            const animComp1 = animBlending.getComponent('animation')!;
            const animComp2 = appendedAnimBlending.getComponent('animation')!;
            expect(animComp1).to.not.be.null;
            expect(animComp2).to.not.be.null;
        });

        it('Js properties', function () {
            /* This test checks that references are properly retargeted
             * upon `append()`. */
            const originalDummy = mainScene.findByName('Dummy')[0];
            const original = originalDummy.getComponents(TestComponentRetarget)[0];

            const dummy = scene.findByName('Dummy')[0];
            expect(dummy, 'invalid scene graph, the test must be updated').to.not.be
                .undefined;
            const comp = dummy.getComponents(TestComponentRetarget)[0];
            expect(comp).to.not.be.undefined;

            /* Objects, animations, and skins are per-scene and shouldn't be retargeted on load */
            expect(comp.objectProp).to.not.equal(original.objectProp, 'object retargeting');
            expect(comp.objectProp.name).to.equal('View');
            expect(comp.animationProp).to.not.equal(
                original.animationProp,
                'animation retargeting'
            );
            expect(comp.animationProp._index).to.equal(original.animationProp._index);
            expect(comp.skinProp).to.not.equal(original.skinProp, 'skin retargeting');
            expect(comp.skinProp._index).to.equal(original.skinProp._index);

            /* Ensure the appended scene has different references for each property */
            expect(comp.materialProp).to.not.equal(
                original.materialProp,
                'material retargeting'
            );
            expect(comp.meshProp).to.not.equal(original.meshProp, 'mesh retargeting');
            expect(comp.meshProp._index).to.equal(
                original.meshProp._index + originalMeshCount
            );
            expect(comp.textureProp).to.not.equal(
                original.textureProp,
                'texture retargeting'
            );
            expect(comp.textureProp._index).to.equal(
                original.textureProp._index + originalTextureCount
            );

            /* `null` properties should remain `null` */
            expect(comp.animationPropUnset).to.be.null;
            expect(comp.materialPropUnset).to.be.null;
            expect(comp.meshPropUnset).to.be.null;
            expect(comp.texturePropUnset).to.be.null;
            expect(comp.objectPropUnset).to.be.null;
            expect(comp.skinPropUnset).to.be.null;

            /* non-reference number properties should remain as is */
            expect(comp.intProp).to.equal(3);
            expect(comp.floatProp).to.equal(4.5);
            expect(comp.enumProp).to.equal(1);
        });
    });
});

describe('Scene Loading Legacy', function () {
    it('load(), missing file', function () {
        return expectFail(WL.scene.load('missing-scene.bin'), 5000);
    });

    it('load()', async function () {
        const events: ('loaded' | 'activated')[] = [];
        function onSceneLoaded() {
            events.push('loaded');
        }
        function onSceneActivated() {
            events.push('activated');
        }
        WL.onSceneLoaded.add(onSceneLoaded);
        WL.onSceneActivated.add(onSceneActivated);

        let sceneReadyEvent = false;
        document.body.addEventListener('wle-scene-ready', () => (sceneReadyEvent = true));

        await WL.scene.load(advancedBin);

        /* Remove the listeners to avoid breaking other tests */
        WL.onSceneLoaded.remove(onSceneLoaded);
        WL.onSceneActivated.remove(onSceneActivated);

        expect(WL.scene.activeViews).to.not.be.empty;
        expect(events).to.eql(['activated', 'loaded']);
        expect(WL.scene.filename).to.eql('Advanced.bin');
        /* Shouldn't be triggered since the `dispatchReadyEvent` flag isn't specified */
        expect(sceneReadyEvent).to.be.false;
    });

    it('load() with buffer', async function () {
        const filename = projectURL('Advanced.bin');
        const baseURL = getBaseUrl(filename);
        const buffer = await fetchWithProgress(filename);

        let sceneReadyEvent = false;
        document.addEventListener('wle-scene-ready', () => (sceneReadyEvent = true));

        const promise = WL.onSceneLoaded.promise();
        await WL.scene.load({buffer, baseURL, dispatchReadyEvent: true});
        await promise;
        expect(WL.scene.filename).to.equal('scene.bin');
        expect(sceneReadyEvent).to.be.true;
    });

    it('load() js components have access to engine.scene as current scene', async function () {
        class TestComponent extends TestComponentRetarget {
            static TypeName = TestComponentRetarget.TypeName;

            initScene: number | null = null;
            startScene: number | null = null;
            destroyScene: number | null = null;

            init() {
                this.initScene = this.engine.scene._index;
            }
            start() {
                this.startScene = this.engine.scene._index;
            }
            onDestroy() {
                this.destroyScene = this.engine.scene._index;
            }
        }

        WL.registerComponent(TestComponent);
        await WL.scene.load(advancedBin);

        const dummy = WL.scene.findByNameRecursive('Dummy')[0];
        expect(dummy).to.not.be.undefined;
        const comp = dummy.getComponent(TestComponent)!;
        expect(comp).to.not.be.null;
        expect(comp.initScene).to.equal(
            WL.scene._index,
            'engine.scene was not the new scene during init()'
        );
        expect(comp.startScene).to.equal(
            WL.scene._index,
            'engine.scene was not the new scene during start()'
        );
    });

    describe('append()', function () {
        it('missing file', function () {
            return expectFail(WL.scene.append('missing-scene.bin'));
        });

        it('.bin', async function () {
            /* Make sure we have all the pipelines used in the streamed .bin */
            await WL.scene.load(advancedBin);

            /* Push dummy image to ensure appending images works */
            new Texture(WL, await dummyImage(42, 43));

            /* Ensure images are properly retargeted. */
            const images = await WL.imagesPromise;
            const originalImageCount = images.length;
            expect([images[0].width, images[0].height]).to.eql([2, 2]);
            expect([images[1].width, images[1].height]).to.eql([42, 43]);

            async function appendTest(urlOrBuffer: string | ArrayBuffer, count: number) {
                const root = (await WL.scene.append(urlOrBuffer)) as Object3D;

                expect(root).to.be.an.instanceof(Object3D);

                const images = await WL.imagesPromise;
                const last = images[images.length - 1];
                expect(images.length).to.equal(originalImageCount + count);
                expect([last.width, last.height]).to.eql([2, 2]);

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

            /* Append the filename */
            await appendTest(binFile, 1);

            /* Append a second time, but pre-downloaded .bin */
            const buffer = await fetch(binFile).then((d) => d.arrayBuffer());
            await appendTest(buffer, 2);
        });
    });
});
