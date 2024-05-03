import {expect, use} from '@esm-bundle/chai';
import {chaiAlmost} from './chai/almost.js';

import {
    init,
    reset,
    projectURL,
    versionLess,
    WL,
    describeScene,
    describeMainScene,
} from './setup.js';
import {
    Component,
    Type,
    Collider,
    Alignment,
    Justification,
    VerticalAlignment,
    InputType,
    LightType,
    TextEffect,
    LightComponent,
    ViewComponent,
    CollisionComponent,
    InputComponent,
    TextComponent,
    MeshComponent,
    AnimationComponent,
    Material,
    Mesh,
    Skin,
    AnimationState,
    ComponentConstructor,
    WonderlandEngine,
    Object3D,
    Property,
    InMemoryLoadOptions,
    Scene,
    Font,
} from '..';
import {property} from '../dist/decorators.js';

/* Because we don't use the `index.js` file from each project, we must manually
 * register the components to test. */
import {
    TestComponentActivatingOther,
    TestComponentDeactivatingOther,
    TestComponentGettingActivated,
    TestComponentGettingDeactivated,
    TestComponentInactiveOnStart,
    TestComponentActivatedWithParam,
    TestComponentDestroyingOther,
    TestComponentGettingDestroyed,
    TestComponentBase,
} from './projects/components/js/test-component.js';
import {loadProjectBins} from './utils.js';

use(chaiAlmost());
before(init);

/* Use in-memory .bin as much as possible to speed up the tests. */
let bins: InMemoryLoadOptions[] = [];
try {
    bins = await loadProjectBins(
        'MorphTargets.bin',
        'Tiny.bin',
        'TestJsComponentsMain.bin',
        'LanguageSwitching.bin'
    );
} catch (e) {
    console.error('Failed to load required test scenes');
    throw e;
}
const morphTargetsBin = bins[0];
const tinyBin = bins[1];
const mainJsComponentsBin = bins[2];
const languageSwitchingBin = bins[3];

/* We only reset after the MeshComponents scope such that the 'Phong Opaque'
 * pipeline from the loading screen is available to create materials from */
describe('MeshComponent', function () {
    before(function () {
        return WL.loadMainSceneFromBuffer(morphTargetsBin);
    });

    it('getters / setters', function () {
        const obj = WL.scene.addObject();
        const comp = obj.addComponent('mesh')!;

        expect(comp.material).to.equal(null);
        expect(comp.mesh).to.equal(null);
        expect(comp.skin).to.equal(null);
        expect(comp.morphTargets).to.equal(null);
        expect(comp.morphTargetWeights).to.be.empty;
        expect(() => comp.getMorphTargetWeight(0)).to.throw(
            Error,
            'Index 0 is out of bounds for 0 targets'
        );
        expect(() => comp.setMorphTargetWeight(0, 1.0)).to.throw(
            Error,
            'Index 0 is out of bounds for 0 targets'
        );
        expect(() => comp.setMorphTargetWeights([1.0])).to.throw(
            Error,
            'Expected 0 weights but got 1'
        );

        comp.material = new Material(WL, 1);
        comp.mesh = new Mesh(WL, 2);
        comp.skin = new Skin(WL.scene, 3);
        comp.morphTargets = WL.morphTargets.wrap(1)!;

        expect(comp.material._index).to.equal(1);
        expect(comp.mesh._index).to.equal(2);
        expect(comp.skin._index).to.equal(3);
        expect(comp.morphTargets._index).to.equal(1);
        /* Initial weights are zero-initialized. Using almost() because it
         * supports comparison of array to typed buffer. */
        expect(comp.morphTargetWeights).to.deep.almost([0.0]);

        const weightsArray = [0.0];
        const weightsBuffer = Float32Array.from([0.0]);
        for (const weights of [weightsArray, weightsBuffer]) {
            weights[0] = 3.0;
            comp.setMorphTargetWeights(weights);
            expect(() => comp.setMorphTargetWeights([1.0, 2.0])).to.throw(
                Error,
                'Expected 1 weights but got 2'
            );
            expect(comp.morphTargetWeights).to.deep.almost(weights);
            weights[0] = 4.0;
            comp.morphTargetWeights = weights;
            expect(comp.morphTargetWeights).to.deep.almost(weights);
            comp.setMorphTargetWeight(0, 5.0);
            expect(() => comp.setMorphTargetWeight(2, 3.0)).to.throw(
                Error,
                'Index 2 is out of bounds for 1 targets'
            );
            expect(comp.getMorphTargetWeight(0)).to.equal(5.0);
            expect(() => comp.getMorphTargetWeight(200)).to.throw(
                Error,
                'Index 200 is out of bounds for 1 targets'
            );
            /* This returns the out parameter */
            expect(comp.getMorphTargetWeights(weights)).to.equal(weights);
            expect(weights).to.deep.almost([5.0]);
            expect(comp.getMorphTargetWeights()).to.deep.almost(weights);
            expect(comp.morphTargetWeights).to.deep.almost(weights);
        }

        comp.material = null;
        comp.mesh = null;
        comp.skin = null;
        comp.morphTargets = null;

        expect(comp.material).to.equal(null);
        expect(comp.mesh).to.equal(null);
        expect(comp.skin).to.equal(null);
        expect(comp.morphTargets).to.equal(null);
        expect(comp.morphTargetWeights).to.be.empty;
    });

    it('throws if skin from another scene is used', function () {
        const other = WL._createEmpty();
        const skin = new Skin(other, 1);

        const obj = WL.scene.addObject();
        expect(() => obj.addComponent('mesh', {skin})).to.throw(
            `Attempt to use ${skin} from ${skin.scene} in ${WL.scene}`
        );
        const comp = obj.addComponent('mesh');
        expect(() => (comp.skin = skin)).to.throw(
            `Attempt to use ${skin} from ${skin.scene} in ${WL.scene}`
        );
    });

    function assertClone(cloner: (comp: MeshComponent) => MeshComponent) {
        const obj = WL.scene.addObject();
        const comp = obj.addComponent('mesh')!;
        comp.material = new Material(WL, 1);
        comp.mesh = new Mesh(WL, 2);
        comp.morphTargets = WL.morphTargets.wrap(1)!;

        const clone = cloner(comp);
        expect(clone).to.be.instanceof(MeshComponent);
        expect(clone._manager).to.equal(comp._manager);
        expect(clone._id).to.not.equal(comp._id);
        expect(clone.material!.equals(comp.material)).to.be.true;
        expect(clone.mesh!.equals(comp.mesh)).to.be.true;
        expect(clone.morphTargets!.equals(comp.morphTargets)).to.be.true;

        /* Avoid errors at rendering time due to invalid resource indices */
        comp.morphTargets = null;
        clone.morphTargets = null;
    }

    it('clone via object.clone()', function () {
        assertClone((comp) => comp.object.clone().getComponent('mesh')!);
    });

    it('clone via addComponent()', function () {
        assertClone((comp) => comp.object.addComponent('mesh', comp)!);
    });

    it('clone skin via addComponent()', function () {
        const obj = WL.scene.addObject();
        const comp = obj.addComponent('mesh')!;
        comp.skin = new Skin(WL.scene, 3);

        const clone = obj.addComponent('mesh', comp)!;
        expect(clone.skin!.equals(comp.skin)).to.be.true;
    });

    it('clone skin via object.clone()', async function () {
        /* This test ensures that skins are properly duplicated and re-targeted.
         * When cloning an object containing a skin in its hierarchy, all meshes insides
         * the hierarchy must point to the newly copied skin. */
        reset();
        await WL.scene.load(projectURL('Advanced.bin'));

        const skinnedObject = WL.scene.findByName('Skinned')[0];
        expect(skinnedObject).to.not.be.undefined;
        const mesh = skinnedObject.findByName('object_0')[0].getComponent('mesh')!;
        expect(mesh).to.not.be.null;
        expect(mesh.skin?._index).to.not.be.NaN;

        const clone = skinnedObject.clone();
        const meshObjectClone = clone.findByName('object_0')[0];
        expect(meshObjectClone).to.not.be.undefined;
        const meshClone = meshObjectClone.getComponent('mesh')!;
        expect(meshClone).to.not.be.null;
        expect(meshClone.skin?._index).to.not.be.NaN;
        expect(meshClone.skin!._index).to.equal(mesh.skin!._index + 1);
    });
});

describe('Native Component Properties', function () {
    it('AnimationComponent', function () {
        expect(AnimationComponent.Properties).to.have.keys([
            'animation',
            'playCount',
            'speed',
        ]);
    });
    it('CollisionComponent', function () {
        expect(CollisionComponent.Properties).to.have.keys([
            'extents',
            'collider',
            'group',
        ]);
    });
    it('InputComponent', function () {
        expect(InputComponent.Properties).to.have.keys(['inputType']);
    });
    it('LightComponent', function () {
        expect(LightComponent.Properties).to.have.keys([
            'lightType',
            'color',
            'intensity',
            'outerAngle',
            'innerAngle',
            'shadows',
            'shadowRange',
            'shadowBias',
            'shadowNormalBias',
            'shadowTexelSize',
            'cascadeCount',
        ]);
    });
    it('MeshComponent', function () {
        expect(MeshComponent.Properties).to.have.keys([
            'material',
            'mesh',
            'morphTargets',
            'morphTargetWeights',
            'skin',
        ]);
    });
    it('ViewComponent', function () {
        expect(ViewComponent.Properties).to.have.keys(['near', 'far', 'fov']);
    });
    it('TextComponent', function () {
        expect(TextComponent.Properties).to.have.keys([
            'text',
            'material',
            'alignment',
            'verticalAlignment',
            'justification',
            'characterSpacing',
            'lineSpacing',
            'effect',
        ]);
    });
});

describeScene('Components', function (ctx) {
    describe('Shared', function () {
        it('type', function () {
            const obj = ctx.scene.addObject();
            const comp = obj.addComponent('light')!;
            expect(comp.type).to.equal('light');

            class TestComponent extends Component {
                static TypeName = 'test';
            }
            WL.registerComponent(TestComponent);

            /* Add component with class as first parameter */
            const compClass = obj.addComponent(TestComponent)!;
            expect(compClass).to.be.an.instanceOf(TestComponent);
            expect(compClass.type).to.equal(TestComponent.TypeName);
        });

        it('object', function () {
            const obj = ctx.scene.addObject();
            const light = obj.addComponent('light')!;
            expect(light.object).to.equal(obj);
        });

        it('deprecated .equals()', function () {
            const scene = ctx.scene;
            const obj = scene.addObject();
            const light1 = obj.addComponent('light')!;
            const light2 = obj.addComponent('light')!;
            const light3 = new LightComponent(scene, light1._manager, light1._id);

            expect(light1.equals(null)).to.be.false;
            expect(light1.equals(undefined)).to.be.false;
            expect(light1.equals(light1)).to.be.true;
            expect(light1.equals(light2)).to.be.false;
            expect(light2.equals(light1)).to.be.false;
            expect(light1.equals(light3)).to.be.true;
            expect(light3.equals(light1)).to.be.true;

            /* Manager and ID both have to be the same */
            const mesh1 = obj.addComponent('mesh')!;
            const mesh2 = new MeshComponent(scene, mesh1._manager, light1._id);
            expect(light1.equals(mesh2)).to.be.false;
        });

        it('active', function () {
            const obj = ctx.scene.addObject();
            const light = obj.addComponent('light')!;
            expect(light.active).to.equal(true && ctx.active);
            light.active = false;
            expect(light.active).to.be.false;
            light.active = true;
            expect(light.active).to.equal(true && ctx.active);
        });

        it('.markedActive', function () {
            const obj = ctx.scene.addObject();
            const comp = obj.addComponent('input')!;
            expect(comp.markedActive).to.be.true;
            comp.active = false;
            expect(comp.markedActive).to.be.false;
            comp.active = true;
            expect(comp.markedActive).to.be.true;
        });

        it('destroy', function () {
            const obj = ctx.scene.addObject();
            obj.addComponent('mesh');
            const light = obj.addComponent('light')!;
            const light2 = obj.addComponent('light')!;
            expect(light._id).to.exist;
            expect(light._manager).to.exist;
            expect(obj.getComponents('light').length).to.equal(2);

            light.destroy();
            expect(obj.getComponents('light').length).to.equal(1);
            expect(obj.getComponents('light')[0].equals(light2)).to.be.true;
            expect(light.isDestroyed).to.be.true;
        });

        it('destroy / re-create updates the object reference (#1354)', function () {
            /* Case 1: Destroy component */
            const objA = ctx.scene.addObject();
            const objB = ctx.scene.addObject();
            {
                const comp = objA.addComponent('mesh')!;
                expect(comp._object?.equals(objA));
                comp.destroy();
            }
            {
                const comp = objB.addComponent('mesh')!;
                expect(comp._object?.equals(objB));
            }

            /* Case 2: Destroy object */
            objB.destroy();
            const comp = objA.addComponent('mesh')!;
            expect(comp._object?.equals(objA));
        });
    });

    describe('CollisionComponent', function () {
        it('(get/set)Extents', function () {
            const obj = ctx.scene.addObject();
            const comp = obj.addComponent('collision')!;
            comp.extents = [1, 0, 0];

            expect(comp.getExtents()).to.deep.almost([1, 0, 0]);
            expect(comp.extents).to.deep.almost([1, 0, 0]);

            comp.collider = Collider.AxisAlignedBox;
            comp.extents = [3, 2, 1];
            expect(comp.getExtents()).to.deep.almost([3, 2, 1]);
            expect(comp.extents).to.deep.almost([3, 2, 1]);
        });

        it('getters / setters', function () {
            const objA = ctx.scene.addObject();
            objA.transformLocal = [0, 0, -10];
            const compA = objA.addComponent('collision')!;
            compA.extents = [1, 0, 0];
            compA.collider = Collider.Sphere;
            compA.group = 1;

            expect(compA.collider).to.equal(Collider.Sphere);
            expect(compA.extents[0]).to.equal(1);
            expect(compA.group).to.equal(1);

            compA.radius = 2;
            expect(compA.radius).to.equal(2);

            compA.collider = Collider.AxisAlignedBox;
            compA.radius = 2;
            const aproxlen = 2.3094;
            expect(compA.extents).to.deep.almost([aproxlen, aproxlen, aproxlen]);

            compA.collider = Collider.Box;
            compA.extents = [2.0, 2.0, 2.0];
            expect(compA.radius).to.almost(1.732);

            compA.radius = 2;
            expect(compA.radius).to.almost(2, 0.00001);
        });

        it('overlaps query', function () {
            const scene = ctx.scene;
            const oA = WL.scene.addObject();
            const oB = WL.scene.addObject();

            oA.transformLocal = [0, 0, -10];
            oB.transformLocal = [1, 1, -10];

            const cA = oA.addComponent('collision')!;
            cA.extents = [1, 0, 0];
            cA.collider = Collider.Sphere;
            cA.group = 1;

            const cB = oB.addComponent('collision')!;
            cB.extents = [1, 0, 0];
            cB.collider = Collider.Sphere;
            cB.group = 1;
            const overlaps = cA.queryOverlaps();

            expect(overlaps.length).to.equal(1);
            expect(overlaps[0]).to.eql(cB);
        });

        it('getters / setters', function () {
            const o = ctx.scene.addObject();
            const c = o.addComponent('collision')!;
            c.collider = Collider.AxisAlignedBox;
            c.extents[0] = 2.0;
            c.group = 2;

            expect(c.collider).to.equal(Collider.AxisAlignedBox);
            expect(c.extents[0]).to.equal(2.0);
            expect(c.getExtents()[0]).to.equal(2.0);
            expect(c.group).to.equal(2);
        });

        function assertClone(cloner: (comp: CollisionComponent) => CollisionComponent) {
            const obj = ctx.scene.addObject();
            const comp = obj.addComponent('collision')!;
            comp.extents = [1, 3, 9];
            comp.collider = Collider.Sphere;
            comp.group = 1;

            const clone = cloner(comp);
            expect(clone).to.be.instanceof(CollisionComponent);
            expect(clone._manager).to.equal(comp._manager);
            expect(clone._id).to.not.equal(comp._id);
            expect(clone.extents).to.deep.equal(comp.extents);
            expect(clone.collider).to.equal(comp.collider);
            expect(clone.group).to.equal(comp.group);
        }

        it('clone via addComponent()', function () {
            assertClone((comp) => comp.object.addComponent('collision', comp)!);
        });

        it('.destroy() with prototype destruction', function () {
            WL.erasePrototypeOnDestroy = true;
            const comp = ctx.scene.addObject().addComponent('collision')!;
            comp.destroy();
            expect(() => comp.active).to.throw(
                `Cannot read 'active' of destroyed component`
            );
        });

        it('clone via object.clone()', function () {
            assertClone((comp) => comp.object.clone().getComponent('collision')!);
        });
    });

    describe('TextComponent', function () {
        it('getters / setters', function () {
            const obj = ctx.scene.addObject();
            const comp = obj.addComponent('text')!;

            comp.text = 'Initial Text';
            comp.alignment = Alignment.Left;
            comp.verticalAlignment = VerticalAlignment.Top;
            comp.characterSpacing = 0.25;
            comp.lineSpacing = 2.0;
            comp.effect = TextEffect.Outline;

            expect(comp.text).to.equal('Initial Text');
            expect(comp.alignment).to.equal(Alignment.Left);
            expect(comp.verticalAlignment).to.equal(VerticalAlignment.Top);
            expect(comp.justification).to.equal(VerticalAlignment.Top);
            expect(comp.characterSpacing).to.equal(0.25);
            expect(comp.lineSpacing).to.equal(2.0);
            expect(comp.effect).to.equal(TextEffect.Outline);

            comp.text = 'Modified Text';
            comp.alignment = Alignment.Center;
            comp.verticalAlignment = VerticalAlignment.Bottom;
            /* Overriding through justification on purpose once to check it works */
            comp.justification = VerticalAlignment.Middle;
            comp.characterSpacing = 0.5;
            comp.lineSpacing = 1.5;
            comp.effect = TextEffect.None;

            expect(comp.text).to.equal('Modified Text');
            expect(comp.alignment).to.equal(Alignment.Center);
            expect(comp.verticalAlignment).to.equal(VerticalAlignment.Middle);
            expect(comp.characterSpacing).to.equal(0.5);
            expect(comp.lineSpacing).to.equal(1.5);
            expect(comp.effect).to.equal(TextEffect.None);

            /** @todo(2.0.0): Remove justification */
            expect(comp.justification).to.equal(VerticalAlignment.Middle);
            expect(comp.justification).to.equal(Justification.Middle);

            /* Test tempMem size */
            const largeText = 'w'.repeat(10 * 1024);
            comp.text = largeText;
            expect(comp.text.length).to.equal(largeText.length);

            /* Test setting anything other then string */
            comp.text = 123;
            expect(comp.text).to.equal('123');
            comp.text = obj;
            expect(comp.text).to.equal(obj.toString());
        });

        function assertClone(cloner: (comp: TextComponent) => TextComponent) {
            const obj = ctx.scene.addObject();
            const comp = obj.addComponent('text')!;
            comp.text = 'Initial Text';
            comp.material = null;
            // TODO: test non-null material
            comp.alignment = Alignment.Left;
            comp.verticalAlignment = VerticalAlignment.Top;
            comp.characterSpacing = 0.25;
            comp.lineSpacing = 2.0;
            comp.effect = TextEffect.Outline;

            const clone = cloner(comp);
            expect(clone).to.be.instanceof(TextComponent);
            expect(clone._manager).to.equal(comp._manager);
            expect(clone._id).to.not.equal(comp._id);
            expect(clone.text).to.equal(comp.text);
            expect(clone.material).to.equal(null);
            expect(clone.alignment).to.equal(comp.alignment);
            expect(clone.verticalAlignment).to.equal(comp.verticalAlignment);
            expect(clone.justification).to.equal(comp.verticalAlignment);
            expect(clone.characterSpacing).to.equal(comp.characterSpacing);
            expect(clone.lineSpacing).to.equal(comp.lineSpacing);
            expect(clone.effect).to.equal(comp.effect);
        }

        it('clone via addComponent()', function () {
            assertClone((comp) => comp.object.addComponent('text', comp)!);
        });

        it('.destroy() with prototype destruction', function () {
            WL.erasePrototypeOnDestroy = true;
            const comp = ctx.scene.addObject().addComponent('text')!;
            comp.destroy();
            expect(() => comp.active).to.throw(
                `Cannot read 'active' of destroyed component`
            );
        });

        it('clone via object.clone()', function () {
            assertClone((comp) => comp.object.clone().getComponent('text')!);
        });
    });

    describe('ViewComponent', function () {
        it('getters / setters', function () {
            const obj = ctx.scene.addObject();
            const comp = obj.addComponent('view')!;

            comp.near = 0.1;
            comp.far = 100.0;
            comp.fov = 45.0;

            expect(comp.near).to.almost(0.1);
            expect(comp.far).to.almost(100.0);
            expect(comp.fov).to.almost(45.0);
            /* We can't check properly the projection matrix yet since it's
             * updated during the draw phase. */
            expect(comp.projectionMatrix[0]).to.almost(2.4142);
            expect(comp.projectionMatrix[10]).to.almost(-1.0, 0.05);
            expect(comp.projectionMatrix[11]).to.almost(-1.0, 0.05);
            expect(comp.projectionMatrix[14]).to.almost(-0.2, 0.05);

            comp.near = 0.2;
            comp.far = 50.0;
            comp.fov = 90.0;

            expect(comp.near).to.almost(0.2);
            expect(comp.far).to.almost(50.0);
            expect(comp.fov).to.almost(90.0);
            /* We can't check properly the projection matrix yet since it's
             * updated during the draw phase. */
            expect(comp.projectionMatrix[0]).to.almost(1);
            expect(comp.projectionMatrix[10]).to.almost(-1.0, 0.05);
            expect(comp.projectionMatrix[11]).to.almost(-1.0, 0.05);
            expect(comp.projectionMatrix[14]).to.almost(-0.4, 0.05);
        });

        it('cloning', function () {
            const obj = ctx.scene.addObject();
            const comp = obj.addComponent('view')!;
            comp.near = 0.2;
            comp.far = 50.0;
            comp.fov = 90.0;

            const clone = obj.addComponent('view', comp)!;
            expect(clone).to.be.instanceof(ViewComponent);
            expect(clone._manager).to.equal(comp._manager);
            expect(clone._id).to.not.equal(comp._id);
            expect(clone.near).to.equal(comp.near);
            expect(clone.far).to.equal(comp.far);
            expect(clone.fov).to.equal(comp.fov);
        });

        it('.destroy() with prototype destruction', function () {
            WL.erasePrototypeOnDestroy = true;
            const comp = ctx.scene.addObject().addComponent('view')!;
            comp.destroy();
            expect(() => comp.active).to.throw(
                `Cannot read 'active' of destroyed component`
            );
        });
    });

    describe('InputComponent', function () {
        it('Input Type', function () {
            const obj = ctx.scene.addObject();
            const comp = obj.addComponent('input')!;

            expect(comp.inputType).to.equal(InputType.Head);
            expect(comp.xrInputSource).to.equal(null);
            expect(comp.handedness).to.equal(null);

            comp.inputType = InputType.ControllerLeft;
            expect(comp.inputType).to.equal(InputType.ControllerLeft);
            expect(comp.handedness).to.equal('left');
        });

        function assertClone(cloner: (comp: InputComponent) => InputComponent) {
            const obj = ctx.scene.addObject();
            const comp = obj.addComponent('input')!;
            comp.inputType = InputType.ControllerRight;

            const clone = cloner(comp);
            expect(clone).to.be.instanceof(InputComponent);
            expect(clone._manager).to.equal(comp._manager);
            expect(clone._id).to.not.equal(comp._id);
            expect(clone.inputType).to.equal(comp.inputType);
        }

        it('clone via addComponent()', function () {
            assertClone((comp) => comp.object.addComponent('input', comp)!);
        });

        it('clone via object.clone()', function () {
            assertClone((comp) => comp.object.clone().getComponent('input')!);
        });

        it('.destroy() with prototype destruction', function () {
            WL.erasePrototypeOnDestroy = true;
            const comp = ctx.scene.addObject().addComponent('input')!;
            comp.destroy();
            expect(() => comp.active).to.throw(
                `Cannot read 'active' of destroyed component`
            );
        });
    });

    describe('LightComponent', function () {
        it('getters / setters', function () {
            const obj = ctx.scene.addObject();
            const comp = obj.addComponent('light')!;

            expect(comp.lightType).to.equal(LightType.Point);
            expect(comp.color).to.eql(new Float32Array([0, 0, 0]));
            expect(comp.intensity).to.equal(0.0);
            expect(comp.outerAngle).to.equal(0.0);
            expect(comp.innerAngle).to.equal(0.0);
            expect(comp.shadows).to.equal(false);
            expect(comp.shadowRange).to.equal(0.0);
            expect(comp.shadowBias).to.equal(0.0);
            expect(comp.shadowNormalBias).to.equal(0.0);
            expect(comp.shadowTexelSize).to.equal(0.0);
            expect(comp.cascadeCount).to.equal(0);

            comp.lightType = LightType.Sun;
            comp.color = [1.0, 0.5, 0.25];
            comp.intensity = 2.0;
            comp.outerAngle = 60.5;
            comp.innerAngle = 45.0;
            comp.shadows = true;
            comp.shadowRange = 8.25;
            comp.shadowBias = 3.0;
            comp.shadowNormalBias = 32.0;
            comp.shadowTexelSize = 1.5;
            comp.cascadeCount = 5;

            expect(comp.lightType).to.equal(LightType.Sun);
            expect(comp.color).to.eql(new Float32Array([1.0, 0.5, 0.25]));
            expect(comp.intensity).to.equal(2.0);
            expect(comp.outerAngle).to.equal(60.5);
            expect(comp.innerAngle).to.equal(45.0);
            expect(comp.shadows).to.equal(true);
            expect(comp.shadowRange).to.equal(8.25);
            expect(comp.shadowBias).to.equal(3.0);
            expect(comp.shadowNormalBias).to.equal(32.0);
            expect(comp.shadowTexelSize).to.equal(1.5);
            expect(comp.cascadeCount).to.equal(5);
        });

        it('(set|get)Color', function () {
            const obj = ctx.scene.addObject();
            const comp = obj.addComponent('light')!;

            const out = new Float32Array(3);

            comp.setColor([5.0, 6.0, 7.0]);
            comp.getColor(out);
            expect(out).to.eql(new Float32Array([5.0, 6.0, 7.0]));
            expect(comp.getColor()).to.eql(out);
        });

        function assertClone(cloner: (comp: LightComponent) => LightComponent) {
            const obj = ctx.scene.addObject();
            const comp = obj.addComponent('light')!;
            comp.lightType = LightType.Sun;
            comp.color = new Float32Array([1.0, 0.5, 0.25]);
            comp.intensity = 2.0;
            comp.outerAngle = 60.5;
            comp.innerAngle = 45.0;
            comp.shadows = true;
            comp.shadowRange = 8.25;
            comp.shadowBias = 3.0;
            comp.shadowNormalBias = 32.0;
            comp.shadowTexelSize = 1.5;
            comp.cascadeCount = 5;

            const clone = cloner(comp);
            expect(clone).to.be.instanceof(LightComponent);
            expect(clone._manager).to.equal(comp._manager);
            expect(clone._id).to.not.equal(comp._id);
            expect(clone.lightType).to.equal(comp.lightType);
            expect(clone.color).to.deep.equal(comp.color);
            expect(clone.outerAngle).to.equal(comp.outerAngle);
            expect(clone.innerAngle).to.equal(comp.innerAngle);
            expect(clone.shadows).to.equal(comp.shadows);
            expect(clone.shadowRange).to.equal(comp.shadowRange);
            expect(clone.shadowBias).to.equal(comp.shadowBias);
            expect(clone.shadowNormalBias).to.equal(comp.shadowNormalBias);
            expect(clone.shadowTexelSize).to.equal(comp.shadowTexelSize);
            expect(clone.shadowTexelSize).to.equal(comp.shadowTexelSize);
            expect(clone.cascadeCount).to.equal(comp.cascadeCount);
        }

        it('clone via addComponent()', function () {
            assertClone((comp) => comp.object.addComponent('light', comp)!);
        });

        it('.destroy() with prototype destruction', function () {
            WL.erasePrototypeOnDestroy = true;
            const comp = ctx.scene.addObject().addComponent('light')!;
            comp.destroy();
            expect(() => comp.active).to.throw(
                `Cannot read 'active' of destroyed component`
            );
        });

        it('clone via object.clone()', function () {
            assertClone((comp) => comp.object.clone().getComponent('light')!);
        });
    });

    describe('AnimationComponent', function () {
        it('getters / setters', function () {
            const scene = ctx.scene;
            const objA = scene.addObject();
            const objB = scene.addObject();
            const comp = objA.addComponent('animation')!;
            const comp2 = objB.addComponent('animation')!;

            expect(comp.object.objectId).to.equal(objA.objectId);
            expect(comp2.object.objectId).to.equal(objB.objectId);

            expect(comp.animation).to.equal(null);
            expect(comp.playCount).to.equal(0);
            expect(comp.speed).to.equal(1.0);
            expect(comp.state).to.equal(AnimationState.Stopped);

            // TODO Test setting animation, needs a valid resource index
            comp.animation = null;
            comp.playCount = 12;
            comp.speed = 2.0;

            expect(comp.animation).to.equal(null);
            expect(comp.playCount).to.equal(12);
            expect(comp.speed).to.equal(2.0);
        });

        function assertClone(cloner: (comp: AnimationComponent) => AnimationComponent) {
            const obj = ctx.scene.addObject();
            const comp = obj.addComponent('animation')!;
            // TODO: animation
            comp.playCount = 4;
            comp.speed = 2.25;

            const clone = cloner(comp);
            expect(clone).to.be.instanceof(AnimationComponent);
            expect(clone._manager).to.equal(comp._manager);
            expect(clone._id).to.not.equal(comp._id);
            expect(clone.playCount).to.equal(comp.playCount);
            expect(clone.speed).to.equal(comp.speed);
        }

        it('clone via addComponent()', function () {
            assertClone((comp) => comp.object.addComponent('animation', comp)!);
        });

        it('.destroy() with prototype destruction', function () {
            WL.erasePrototypeOnDestroy = true;
            const comp = ctx.scene.addObject().addComponent('animation')!;
            comp.destroy();
            expect(() => comp.active).to.throw(
                `Cannot read 'active' of destroyed component`
            );
        });

        it('clone via object.clone()', function () {
            assertClone((comp) => comp.object.clone().getComponent('animation')!);
        });
    });

    describe('Js', function () {
        it('getters / setters', function () {
            class TestComponent extends Component {
                static TypeName = 'custom';
                myCustomProp = Number.NEGATIVE_INFINITY;
            }
            WL.registerComponent(TestComponent);

            const scene = ctx.scene;
            const objA = scene.addObject();
            const objB = scene.addObject();
            const compA = objA.addComponent(TestComponent)!;
            const compB = objB.addComponent(TestComponent)!;

            compA.myCustomProp = 42;
            compB.myCustomProp = 123;

            expect(compA.equals(compB)).to.be.false;
            expect(compA.equals(objA.getComponent('custom'))).to.be.true;
        });

        it('equals', function () {
            const scene = ctx.scene;
            const obj = scene.addObject();

            class TestComponent extends Component {
                static TypeName = 'test';
                someValue = Number.NEGATIVE_INFINITY;
            }
            WL.registerComponent(TestComponent);
            WL.registerComponent(TestComponent);

            const custom1 = obj.addComponent('test')! as TestComponent;
            const custom2 = obj.addComponent('test')! as TestComponent;
            const custom3 = new Component(scene, custom1._manager, custom1._localId);

            expect(custom1.equals(null)).to.be.false;
            expect(custom1.equals(undefined)).to.be.false;
            expect(custom1.equals(custom1)).to.be.true;
            expect(custom1.equals(custom2)).to.be.false;
            expect(custom2.equals(custom1)).to.be.false;
            expect(custom1.equals(custom3)).to.be.true;
            expect(custom3.equals(custom1)).to.be.true;

            /* Only manager and ID are checked, nothing else */
            custom1.someValue = 1.0;
            (custom3 as TestComponent).someValue = 3.0;
            expect(custom3.equals(custom1)).to.be.true;

            const customClass1 = obj.addComponent(TestComponent)!;
            const customClass2 = obj.addComponent(TestComponent)!;
            const customClass3 = new TestComponent(
                scene,
                customClass1._manager,
                customClass1._id
            );

            expect(customClass1.equals(null)).to.be.false;
            expect(customClass1.equals(undefined)).to.be.false;
            expect(customClass1.equals(customClass1)).to.be.true;
            expect(customClass1.equals(customClass2)).to.be.false;
            expect(customClass2.equals(customClass1)).to.be.false;
            expect(customClass1.equals(customClass3)).to.be.true;
            expect(customClass3.equals(customClass1)).to.be.true;

            customClass1.someValue = 1.0;
            customClass3.someValue = 3.0;
            expect(customClass3.equals(customClass1)).to.be.true;

            /* Custom components share a manager. Their IDs shouldn't overlap. */
            expect(custom1.equals(customClass1)).to.be.false;

            /* Explicitly setting the ID makes them equal */
            const weirdClass = new TestComponent(scene, customClass1._manager, custom1._id);
            expect(weirdClass.equals(custom1)).to.be.true;
        });

        it('cloning', function () {
            class CustomComponent extends Component {
                static TypeName = 'custom';
                static Properties = {
                    aFloat: {type: Type.Float},
                    anObject: {type: Type.Object},
                    aColor: {type: Type.Color},
                    aVector: {type: Type.Vector2, default: [1.0, 2.0]},
                };
            }
            interface CustomComponent {
                aFloat: number;
                anObject: Object3D;
                myCustomProp: number;
                aColor: Float32Array;
                aVector: Float32Array;
            }

            WL.registerComponent(CustomComponent);

            const scene = ctx.scene;
            const obj1 = scene.addObject();
            const obj2 = scene.addObject();

            const classComp = obj1.addComponent(CustomComponent)!;
            const comp = obj2.addComponent('custom') as CustomComponent;

            for (let instance of [comp, classComp]) {
                instance.active = false;
                instance.aFloat = 2.0;
                instance.anObject = obj1;
                instance.aColor = new Float32Array([0.1, 0.2, 0.3, 0.4]);
                /* Leaving aVector at the default value */
                instance.myCustomProp = 42;
            }

            const classClone = obj2.addComponent(CustomComponent, classComp)!;
            const clone = obj2.addComponent('custom', comp) as CustomComponent;

            for (const [instance, clonedInstance] of [
                [comp, clone],
                [classComp, classClone],
            ]) {
                expect(clonedInstance.constructor).to.equal(instance.constructor);
                expect(clonedInstance.equals(instance)).to.be.false;
                expect(clonedInstance.type).to.equal(instance.type);
                expect(clonedInstance._manager).to.equal(instance._manager);
                expect(clonedInstance.engine).to.equal(instance.engine);
                expect(clonedInstance._id).to.not.equal(instance._id);
                expect(clonedInstance.object.equals(obj2)).to.be.true;
                expect(clonedInstance.active).to.equal(instance.active);

                const properties = (CustomComponent as ComponentConstructor).Properties;
                for (const name in properties) {
                    expect(clonedInstance).to.have.own.property(name);
                }

                expect(clonedInstance.aFloat).to.equal(instance.aFloat);
                expect(clonedInstance.anObject).to.equal(instance.anObject);
                expect(clonedInstance.aColor).to.not.equal(instance.aColor);
                expect(clonedInstance.aColor).to.deep.equal(instance.aColor);
                expect(clonedInstance.aVector).to.not.equal(instance.aVector);
                expect(clonedInstance.aVector).to.deep.equal(instance.aVector);

                /* Only properties listed in Properties are cloned */
                expect(clonedInstance.myCustomProp).to.be.undefined;
            }
        });

        it('cloning different type', function () {
            class CustomComponent1 extends Component {
                static TypeName = 'custom1';
                static Properties = {
                    aProperty: {type: Type.Float},
                    aSecondProperty: {type: Type.Float, default: 5.0},
                };
            }
            interface CustomComponent1 {
                aProperty: number;
                aSecondProperty: number;
            }
            class CustomComponent2 extends Component {
                static TypeName = 'custom2';
                static Properties = {
                    aProperty: {type: Type.Float},
                    aThirdProperty: {type: Type.Float, default: 8.0},
                };
            }
            interface CustomComponent2 {
                aProperty: number;
                aThirdProperty: number;
            }
            WL.registerComponent(CustomComponent1);
            WL.registerComponent(CustomComponent2);

            const obj = ctx.scene.addObject();

            const comp = obj.addComponent('custom1') as CustomComponent1;
            comp.aProperty = 2.0;
            const compClass = obj.addComponent(CustomComponent1)!;
            compClass.aProperty = 3.0;

            for (const instance of [comp, compClass]) {
                const clone = obj.addComponent('custom2', instance) as CustomComponent2;
                expect(clone.constructor).to.not.equal(instance.constructor);
                expect(clone.equals(instance)).to.be.false;
                expect(clone.aProperty).to.equal(instance.aProperty);
                /* Only properties listed in the created component's Properties
                 * are cloned */
                expect(clone.aThirdProperty).to.equal(8.0);
                expect((clone as any).aSecondProperty).to.be.undefined;

                const cloneClass = obj.addComponent(CustomComponent2, instance)!;
                expect(cloneClass.constructor).to.not.equal(instance.constructor);
                expect(cloneClass.equals(instance)).to.be.false;
                expect(cloneClass.aProperty).to.equal(instance.aProperty);
                expect(cloneClass.aThirdProperty).to.equal(8.0);
                expect((cloneClass as any).aSecondProperty).to.be.undefined;
            }
        });

        it('cloning active state', function () {
            class CustomComponent extends Component {
                static TypeName = 'custom';
                static Properties = {
                    aProperty: {type: Type.Float},
                };
                aProperty: number = null!;
            }
            WL.registerComponent(CustomComponent);

            const obj = ctx.scene.addObject();
            const comp = obj.addComponent(CustomComponent)!;
            comp.active = false;

            const cloneDefault = obj.addComponent(CustomComponent, {
                aProperty: 2.0,
            })!;
            expect(cloneDefault.markedActive).to.equal(true);
            expect(cloneDefault.active).to.equal(ctx.active);
            expect(cloneDefault.aProperty).to.equal(2.0);

            const cloneExplicit = obj.addComponent(CustomComponent, {
                aProperty: 2.0,
                active: false,
            })!;
            expect(cloneExplicit.active).to.equal(false);
            expect(cloneDefault.aProperty).to.equal(2.0);
        });

        it('.destroy() with prototype destruction', function () {
            WL.erasePrototypeOnDestroy = true;

            let destroyed = false;

            class TestComponent extends Component {
                static TypeName = 'test';
                onDestroy(): void {
                    /* Allows to check that `onDestroy` is called first */
                    destroyed = true;
                }
            }
            WL.registerComponent(TestComponent);

            const obj = ctx.scene.addObject();
            const a = obj.addComponent(TestComponent)!;
            const b = obj.addComponent(TestComponent)!;

            expect(destroyed).to.be.false;
            a.destroy();
            expect(destroyed).to.be.true;

            expect(() => a.equals(a)).to.throw(
                `Cannot read 'equals' of destroyed component`
            );
            expect(() => a.active).to.throw(`Cannot read 'active' of destroyed component`);
            expect(() => (a.active = false)).to.throw(
                `Cannot write 'active' of destroyed component`
            );

            /* Ensure destroying `a` didn't destroy `b` as well */
            expect(b.isDestroyed).to.be.false;
            expect(b.markedActive).to.be.true;
            expect(b.active).to.equal(ctx.active);
        });

        it('cloning via object.clone()', function () {
            class CustomComponent extends Component {
                static TypeName = 'custom';

                @property.float()
                aFloat: number = 0.0;

                @property.object()
                anObject: Object3D | null = null;

                @property.vector3()
                aVector!: Float32Array;
            }
            WL.registerComponent(CustomComponent);

            const scene = ctx.scene;
            const target = scene.addObject();
            const obj = scene.addObject();
            const comp = obj.addComponent(CustomComponent)!;
            comp.aFloat = 42;
            comp.anObject = target;
            comp.aVector = new Float32Array([1.0, 2.0, 3.0]);

            const clone = obj.clone().getComponent(CustomComponent)!;
            expect(clone).to.not.be.null;
            expect(clone.aFloat).to.almost(42);
            expect(clone.anObject).to.equal(target);
            expect(clone.aVector).to.not.equal(comp.aVector);
            expect(clone.aVector).to.deep.equal(comp.aVector);
        });
    });
});

describeMainScene('Components > TextComponent', languageSwitchingBin, function (ctx) {
    let text!: TextComponent;
    before(async function () {
        const textObject = ctx.scene.findByName('Text')[0];
        expect(textObject).to.not.be.undefined;
        text = textObject.getComponent(TextComponent)!;
        expect(text).to.not.be.null;
        expect(text.alignment).to.equal(Alignment.Center);
        expect(text.verticalAlignment).to.equal(VerticalAlignment.Middle);
    });

    it('getBoundingBox()', function () {
        const boxTypedArray = new Float32Array(4);
        let result: Float32Array | number[];
        result = text.getBoundingBox(boxTypedArray);
        expect(result).to.equal(boxTypedArray);
        const boxArray = new Array<number>(4);
        result = text.getBoundingBox(boxArray);
        expect(result).to.equal(boxArray);
        result = text.getBoundingBox();
        expect(result).to.be.instanceOf(Float32Array);
        expect(result).to.deep.almost(boxTypedArray);
        expect(result).to.deep.almost(boxArray);
        expect(result).to.deep.almost([-0.4527, -0.0579, 0.4474, 0.0474]);
        const oldText = text.text;
        text.text = oldText + 'more';
        /* Height (and hence bottom and top value) stays the same */
        expect(text.getBoundingBox()).to.deep.almost([-0.5822, -0.0579, 0.5867, 0.0474]);
        text.text = oldText;
    });

    it('getBoundingBoxForText()', function () {
        const boxTypedArray = new Float32Array(4);
        let result: Float32Array | number[];
        result = text.getBoundingBoxForText('something', boxTypedArray);
        expect(result).to.equal(boxTypedArray);
        const boxArray = new Array<number>(4);
        result = text.getBoundingBoxForText('something', boxArray);
        expect(result).to.equal(boxArray);
        result = text.getBoundingBoxForText('something');
        expect(result).to.be.instanceOf(Float32Array);
        expect(result).to.deep.almost(boxTypedArray);
        expect(result).to.deep.almost(boxArray);
        expect(text.getBoundingBoxForText(text.text)).to.deep.almost([
            -0.4527, -0.0579, 0.4474, 0.0474,
        ]);
        /* Width (and hence left and right value) stays the same */
        expect(text.getBoundingBoxForText(text.text + '\nmore')).to.deep.almost([
            -0.4527, -0.1179, 0.4474, 0.1074,
        ]);
        expect(text.getBoundingBoxForText('')).to.deep.almost([0.0, 0.0, 0.0, 0.0]);
    });

    /* This is here to avoid the increased test time due to spinning up the
     * the runtime in a separate test file, just for 3 simple getters. If we
     * need more font tests, this should be moved to font.test.ts */
    it('font', function () {
        interface TextMaterial extends Material {
            getFont(): Font | null;
        }

        const font = (text.material as TextMaterial).getFont()!;
        expect(font).to.not.be.null;

        expect(font.emHeight).to.almost(0.1);
        expect(font.capHeight).to.be.above(0.0).and.below(font.emHeight);
        expect(font.xHeight).to.be.above(0.0).and.below(font.capHeight);
    });
});

describe('Components > JS', function () {
    beforeEach(reset);

    it('register', function () {
        /* Registers a simple component and ensure its methods are called */
        WL.registerComponent(
            class extends Component {
                static TypeName = 'dummy';
                initCalled = 0;
                startCalled = 0;
                init() {
                    this.initCalled = 1;
                    this.startCalled = 0;
                }
                start() {
                    ++this.startCalled;
                }
            }
        );
        const obj = WL.scene.addObject();
        const comp = obj.addComponent('dummy')! as Component & {
            initCalled: number;
            startCalled: number;
        };
        expect(comp.initCalled).to.equal(1);
        expect(comp.startCalled).to.equal(1);
    });

    it('double register', function () {
        /* Registers a simple component and ensure its methods are called */
        class Dummy extends Component {
            static TypeName = 'dummy';
            initCalled = 0;
            startCalled = 0;
            init() {
                this.initCalled = 1;
                this.startCalled = 0;
            }
            start() {
                ++this.startCalled;
            }
        }
        WL.registerComponent(Dummy);
        WL.registerComponent(Dummy);
        const obj = WL.scene.addObject();
        const comp = obj.addComponent('dummy')! as Dummy;
        expect(comp.initCalled).to.equal(1);
        expect(comp.startCalled).to.equal(1);
    });

    it('register class component', function () {
        class MyDummyComponent extends Component {
            static TypeName = 'my-dummy-class-component';
            initCalled = 0;
            startCalled = 0;
            init() {
                ++this.initCalled;
            }
            start() {
                ++this.startCalled;
            }
        }

        WL.registerComponent(MyDummyComponent);
        const obj = WL.scene.addObject();
        const obj2 = WL.scene.addObject();
        const comp = obj.addComponent(MyDummyComponent.TypeName)! as MyDummyComponent;
        expect(comp.initCalled).to.equal(1);
        expect(comp.startCalled).to.equal(1);
        const comp2 = obj2.addComponent(MyDummyComponent.TypeName)! as MyDummyComponent;
        expect(comp2.initCalled).to.equal(1);
        expect(comp2.startCalled).to.equal(1);
    });

    it('component `this` is accessible', function () {
        class MyDummyThisComponent extends Component {
            static TypeName = 'dummy-this-class';
            str = '';
            init() {
                this.str = 'Hello From Class!';
            }
            getStr() {
                return this.str;
            }
        }
        WL.registerComponent(MyDummyThisComponent);
        const obj = WL.scene.addObject();
        const comp = obj.addComponent('dummy-this-class')! as MyDummyThisComponent;
        expect(comp.getStr()).to.equal('Hello From Class!');
    });

    it('destroy object destroys native component', function () {
        const version = WL.runtimeVersion;
        if (versionLess(version, {major: 1, minor: 1, patch: 1, rc: 0})) {
            /* Pre 1.1.0, the runtime didn't propagate native component destruction. */
            return;
        }

        const parent = WL.scene.addObject();
        const light = parent.addComponent('light')!;
        const child = WL.scene.addObject(parent);
        const mesh = child.addComponent('mesh')!;

        let lightDestroy = 0;
        let meshDestroy = 0;
        light.onDestroy = () => ++lightDestroy;
        mesh.onDestroy = () => ++meshDestroy;

        parent.destroy();
        expect(lightDestroy).to.equal(1);
        expect(meshDestroy).to.equal(1);
    });

    it('getComponent with string', function () {
        const obj = WL.scene.addObject();

        /* Test native component. */

        const light = obj.addComponent('light')!;
        (light as any)._extra = 42;
        expect(light.equals(obj.getComponent('light'))).to.be.true;
        expect((obj.getComponent('light') as any)._extra).to.equal(42);

        /* Test custom component. */

        class MyFirstDummyComponent extends Component {
            static TypeName = 'my-first-dummy-class-component';
            static Properties = {
                propA: {type: Type.String, default: 'i'},
            };
        }
        interface MyFirstDummyComponent {
            propA: string;
            _extra?: string;
        }

        WL.registerComponent(MyFirstDummyComponent);

        const expected = obj.addComponent(MyFirstDummyComponent)!;
        expected._extra = 'extraProp';
        const result = obj.getComponent(MyFirstDummyComponent)!;
        expect(result.equals(result)).to.be.true;
        expect(result.type).to.equal(MyFirstDummyComponent.TypeName);
        expect(result.propA).to.equal('i');
        expect(result._extra).to.equal('extraProp');

        expect(obj.getComponent('not-registered')).to.be.null;
    });

    it('getComponent', function () {
        const obj = WL.scene.addObject();

        /* Test native components */

        const native = [
            CollisionComponent,
            TextComponent,
            ViewComponent,
            InputComponent,
            LightComponent,
            AnimationComponent,
            MeshComponent,
        ];
        for (let i = 0; i < native.length; ++i) {
            const ctor = native[i] as ComponentConstructor;
            const expected = obj.addComponent(ctor)!;
            const expectedProp = `${ctor.name}-${i}`;
            (expected as any)._extra = expectedProp;
            const result = obj.getComponent(ctor)!;
            expect(result.equals(result)).to.be.true;
            expect(result.type).to.equal(ctor.TypeName);
            expect((result as any)._extra).to.equal(expectedProp);
        }

        /* Test custom components */

        class MyFirstDummyComponent extends Component {
            static TypeName = 'my-first-dummy-class-component';
            static Properties = {};
            _extra = '';
        }
        class MySecondDummyComponent extends Component {
            static TypeName = 'my-second-dummy-class-component';
            _extra = '';
        }
        WL.registerComponent(MyFirstDummyComponent);
        WL.registerComponent(MySecondDummyComponent);

        for (const ctor of [MyFirstDummyComponent, MySecondDummyComponent]) {
            const expected = obj.addComponent(ctor)!;
            expected._extra = 'extraProp';
            const result = obj.getComponent(ctor)!;
            expect(result.equals(result)).to.be.true;
            expect(result.type).to.equal(ctor.TypeName);
            expect(result._extra).to.equal('extraProp');
        }

        class NotRegistered extends Component {
            static TypeName = 'not-registered';
        }
        expect(obj.getComponent(NotRegistered)).to.be.null;
    });

    it('getComponents', function () {
        const obj = WL.scene.addObject();

        class TestComponent extends Component {
            static TypeName = 'test';
            name = Number.NEGATIVE_INFINITY;
        }
        class OtherTestComponent extends Component {
            static TypeName = 'other-test';
            name = Number.NEGATIVE_INFINITY;
        }
        WL.registerComponent(TestComponent);
        WL.registerComponent(OtherTestComponent);

        expect(obj.getComponents(TestComponent)).to.have.lengthOf(0);

        const compA = obj.addComponent(TestComponent)!;
        compA.name = 1;
        const compB = obj.addComponent(TestComponent)!;
        compB.name = 2;
        const compC = obj.addComponent('light')!;
        (compC as any).name = 3;
        const compD = obj.addComponent(OtherTestComponent)!;
        (compD as any).name = 4;

        expect(
            obj
                .getComponents(TestComponent)
                .sort((a, b) => a.name - b.name)
                .map((v) => v.name)
        ).to.eql([1, 2]);

        /* Calling with no argument should return all components. */
        const components = obj.getComponents() as (Component & {name: number})[];
        expect(components.sort((a, b) => a.name - b.name).map((v) => v.name)).to.eql([
            1, 2, 3, 4,
        ]);
    });

    /* https://github.com/WonderlandEngine/api/issues/9 */
    it('addComponent() with reset() that throws', function () {
        class DummyComponent extends Component {
            static TypeName = 'my-first-dummy-class-component';
            static Properties = {
                str: Property.string('Hello'),
            };
            str: string = 'error';

            reset(): this {
                super.reset();
                throw new Error('You lose!');
            }
        }
        WL.registerComponent(DummyComponent);
        const obj = WL.scene.addObject();
        const comp = obj.addComponent(DummyComponent)!;
        expect(comp.str).to.equal('Hello');
    });

    it('object cloned with active and inactive components', function () {
        const parent = WL.scene.addObject();
        parent.addComponent('collision', {active: false});
        parent.addComponent('mesh');
        const child = WL.scene.addObject(parent);
        child.addComponent('text', {active: false});
        child.addComponent('light');

        const cloned = parent.clone();
        expect(cloned.getComponent('collision')?.active).to.be.false;
        expect(cloned.getComponent('mesh')?.active).to.be.true;
        expect(cloned.children[0].getComponent('text')?.active).to.be.false;
        expect(cloned.children[0].getComponent('light')?.active).to.be.true;
    });

    it('clone after deleting component', function () {
        class Test extends Component {
            static TypeName = 'test-component';
        }
        WL.registerComponent(Test);
        /* Deleting a component and then cloning used to create an issue
         * with the JavaScriptManager not cleaning up the types views. */
        const obj = WL.scene.addObject();
        obj.addComponent(Test);

        const destroyed = obj.addComponent(Test);
        const id = destroyed._localId;

        /* Destroys second component. The clone will get the same id */
        destroyed.destroy();
        const clone = obj.clone();
        expect(clone.getComponent(Test)!._localId).to.equal(id);
        expect(clone.getComponents(Test)[0]._localId).to.equal(id);
    });

    describe('lifecycle scene activation / deactivation', function () {
        class TestComponent extends TestComponentBase {
            static TypeName = 'test-component';
            initScene: number | null = null;
            startScene: number | null = null;
            activateScene: number | null = null;
            deactivateScene: number | null = null;
            init() {
                super.init();
                this.initScene = this.engine.scene._index;
            }
            start() {
                super.start();
                this.startScene = this.engine.scene._index;
            }
            onActivate() {
                super.onActivate();
                this.activateScene = this.engine.scene._index;
            }
            onDeactivate() {
                super.onDeactivate();
                this.deactivateScene = this.engine.scene._index;
            }
        }

        let scene: Scene = null!;
        beforeEach(() => {
            WL.registerComponent(TestComponent);
            scene = WL._createEmpty();
        });

        it('scene activated/deactivated should trigger onActivate()/onDeactivate()', function () {
            const obj = scene.addObject();
            const comp = obj.addComponent(TestComponent);
            expect(comp.order).to.eql(['init']);

            WL.switchTo(scene);
            expect(comp.order).to.eql(['init', 'started', 'activated']);

            /* Previous scene should be deactivated upon switch */
            const nextScene = WL._createEmpty();
            const nextObj = nextScene.addObject();
            const nextComp = nextObj.addComponent(TestComponent);

            WL.switchTo(nextScene);
            expect(comp.order).to.eql(['init', 'started', 'activated', 'deactivated']);
            expect(nextComp.order).to.eql(['init', 'started', 'activated']);

            WL.switchTo(scene);
            expect(comp.order).to.eql([
                'init',
                'started',
                'activated',
                'deactivated',
                'activated',
            ]);
        });

        it('access to engine.scene as current scene', async function () {
            const comp = scene.addObject().addComponent(TestComponent);
            WL.switchTo(scene);
            expect(comp.startScene).to.equal(scene._index);
            expect(comp.activateScene).to.equal(scene._index);

            const nextScene = WL._createEmpty();
            const nextComp = nextScene.addObject().addComponent(TestComponent);
            expect(nextComp.startScene).to.be.null;
            expect(nextComp.activateScene).to.be.null;
            expect(nextComp.deactivateScene).to.be.null;
            WL.switchTo(nextScene);

            /* Previous scene should be referenced on engine during `onDeactivate` */
            expect(comp.deactivateScene).to.equal(scene._index);
            expect(nextComp.startScene).to.equal(nextScene._index);
            expect(nextComp.activateScene).to.equal(nextScene._index);
            expect(nextComp.deactivateScene).to.be.null;
        });

        it('destroy inactive scene should trigger onDestroy()', function () {
            WL.switchTo(scene);
            const obj = scene.addObject();
            const comp = obj.addComponent(TestComponent);
            expect(comp.order).to.eql(['init', 'started', 'activated']);

            const nextScene = WL._createEmpty();
            WL.switchTo(nextScene);

            scene.destroy();
            expect(comp.order).to.eql([
                'init',
                'started',
                'activated',
                'deactivated',
                'destroyed',
            ]);
        });
    });

    describe('lifecycle programmatic api (add, remove, active)', function () {
        class TestLifecycle extends Component {
            static TypeName = 'test-lifecycle';
            static Properties = {};
            initialized = 0;
            started = 0;
            updated = 0;
            activated = 0;
            deactivated = 0;
            destroyed = 0;

            destroyedState: {objectId: number} = {objectId: -1};

            init() {
                ++this.initialized;
            }
            start() {
                ++this.started;
            }
            update() {
                ++this.updated;
            }
            onActivate() {
                ++this.activated;
            }
            onDeactivate() {
                ++this.deactivated;
            }
            onDestroy() {
                this.destroyedState.objectId = this.object._localId;
                ++this.destroyed;
            }
        }

        beforeEach(() => WL.registerComponent(TestLifecycle));

        it('onRegister', function () {
            class DependencyA extends Component {
                static TypeName = 'dependency-a';
            }
            class DependencyB extends Component {
                static TypeName = 'dependency-b';
            }
            let onRegisterCCalled = 0;
            let onRegisterMyComponentCalled = 0;
            class DependencyC extends Component {
                static TypeName = 'dependency-c';
                static onRegister(engine: WonderlandEngine) {
                    engine.registerComponent(DependencyB);
                    ++onRegisterCCalled;
                }
            }
            class MyComponent extends Component {
                static TypeName = 'my-component';
                static onRegister(engine: WonderlandEngine) {
                    engine.registerComponent(DependencyA);
                    engine.registerComponent(DependencyC);
                    ++onRegisterMyComponentCalled;
                }
            }

            expect(WL.isRegistered(DependencyA)).to.be.false;
            expect(WL.isRegistered(DependencyB)).to.be.false;
            expect(WL.isRegistered(DependencyC)).to.be.false;
            WL.registerComponent(MyComponent);
            expect(WL.isRegistered(DependencyA)).to.be.true;
            expect(WL.isRegistered(DependencyB)).to.be.true;
            expect(WL.isRegistered(DependencyC)).to.be.true;
            expect(onRegisterCCalled).to.equal(1);
            expect(onRegisterMyComponentCalled).to.equal(1);
        });

        it('init()', function () {
            const obj = WL.scene.addObject();
            const c = obj.addComponent(TestLifecycle, {active: false})!;
            expect(c.initialized).to.equal(1);
            expect([c.started, c.updated, c.activated, c.deactivated, c.destroyed]).to.eql([
                0, 0, 0, 0, 0,
            ]);
        });

        it('start()', function () {
            const obj = WL.scene.addObject();
            const immediate = obj.addComponent(TestLifecycle)!;
            expect(immediate.started).to.equal(1);
            expect([immediate.updated, immediate.deactivated, immediate.destroyed]).to.eql([
                0, 0, 0,
            ]);
            const delayed = obj.addComponent(TestLifecycle, {active: false})!;
            expect(delayed.started).to.equal(0);
            delayed.active = true;
            expect(delayed.started).to.equal(1);
            expect(delayed.activated).to.equal(1);
            expect([delayed.updated, delayed.deactivated, delayed.destroyed]).to.eql([
                0, 0, 0,
            ]);
        });

        it('update()', function () {
            const obj = WL.scene.addObject();
            const c = obj.addComponent(TestLifecycle, {active: false})!;
            WL.nextFrame();
            expect([c.started, c.activated, c.updated, c.deactivated, c.destroyed]).to.eql([
                0, 0, 0, 0, 0,
            ]);
            c.active = true;
            WL.nextFrame();
            expect([c.started, c.activated, c.updated, c.deactivated, c.destroyed]).to.eql([
                1, 1, 1, 0, 0,
            ]);
        });

        it('onActivate()', function () {
            const obj = WL.scene.addObject();
            const c = obj.addComponent(TestLifecycle, {active: false})!;
            expect([c.started, c.updated, c.deactivated, c.destroyed]).to.eql([0, 0, 0, 0]);
            c.active = true;
            expect(c.activated).to.equal(1);
            expect(c.started).to.equal(1);
            expect([c.updated, c.deactivated, c.destroyed]).to.eql([0, 0, 0]);
            /* Setting active while already active shouldn't trigger the callback */
            c.active = true;
            expect(c.activated).to.equal(1);
            expect(c.started).to.equal(1);
            expect([c.updated, c.deactivated, c.destroyed]).to.eql([0, 0, 0]);
        });

        it('onDeactivate()', function () {
            const obj = WL.scene.addObject();
            const c = obj.addComponent(TestLifecycle, {active: false})!;
            expect([c.started, c.activated, c.deactivated, c.destroyed]).to.eql([
                0, 0, 0, 0,
            ]);
            c.active = true;
            expect(c.activated).to.equal(1);
            expect([c.deactivated, c.updated, c.destroyed]).to.eql([0, 0, 0]);
            c.active = false;
            expect(c.deactivated).to.equal(1);
            expect([c.updated, c.destroyed]).to.eql([0, 0]);
            /* Deactivating a component already inactive shouldn't trigger the callback */
            c.active = false;
            expect(c.deactivated).to.equal(1);
            expect([c.updated, c.destroyed]).to.eql([0, 0]);
        });

        it('onDestroy()', function () {
            const obj = WL.scene.addObject();
            const id = obj._localId;

            const c = obj.addComponent(TestLifecycle, {active: false})!;
            expect([c.started, c.updated, c.activated, c.deactivated, c.destroyed]).to.eql([
                0, 0, 0, 0, 0,
            ]);
            obj.destroy();
            expect(c.destroyed).to.equal(1);
            expect(c.destroyedState.objectId).to.equal(id);

            expect([c.started, c.updated, c.activated, c.deactivated]).to.eql([0, 0, 0, 0]);
            /* Destroying a component twice shouldn't trigger the callback */
            obj.destroy();
            expect(c.destroyed).to.equal(1);
            expect([c.started, c.updated, c.activated, c.deactivated]).to.eql([0, 0, 0, 0]);
        });
    });
});

describe('Components > JS > Loading / Instantiation lifecycle', function () {
    let mainScene: Scene = null!;

    /* This test uses TestJsComponentsMain.bin.
     *
     * The file contains an object with the following components:
     *     - TestComponentInactiveOnStart: Inactive component
     *     - TestComponentActivatingOther: Active component that activates another one
     *     - TestComponentGettingActivated: Inactive component getting activated
     *     - TestComponentDeactivatingOther: Active component that deactivates another one
     *     - TestComponentGettingDeactivated: Active component getting deactivated
     *     - TestComponentActivatedWithParam: Active component with a property `param`
     */

    before(async function () {
        reset();
        WL.registerComponent(
            TestComponentActivatedWithParam,
            TestComponentActivatingOther,
            TestComponentGettingActivated,
            TestComponentDeactivatingOther,
            TestComponentGettingDeactivated,
            TestComponentInactiveOnStart,
            TestComponentDestroyingOther,
            TestComponentGettingDestroyed
        );
        mainScene = await WL.loadMainSceneFromBuffer(tinyBin);
    });

    /** Tests js components for the 'Test' object in an inactive scene. */
    function inactiveTest(object: Object3D) {
        /* Test that all components exist */
        for (const def of [
            TestComponentActivatedWithParam,
            TestComponentActivatingOther,
            TestComponentGettingActivated,
            TestComponentDeactivatingOther,
            TestComponentGettingDeactivated,
            TestComponentInactiveOnStart,
            TestComponentDestroyingOther,
        ]) {
            const comp = object.getComponent(def)!;
            expect(comp).to.be.an.instanceOf(
                def,
                `Component(${def.TypeName}) missing on test object`
            );
            expect(comp.order).to.eql(['init'], `${comp} lifecycle should only be 'init'`);
        }
    }

    /** Tests js components for the 'Test' object in an active scene. */
    function activeTest(object: Object3D) {
        /* Test that all components exist */
        for (const def of [
            TestComponentActivatedWithParam,
            TestComponentActivatingOther,
            TestComponentGettingActivated,
            TestComponentDeactivatingOther,
            TestComponentGettingDeactivated,
            TestComponentInactiveOnStart,
            TestComponentDestroyingOther,
        ]) {
            const comp = object.getComponent(def)!;
            expect(comp).to.be.an.instanceOf(
                def,
                `${def.TypeName}' is missing on test object`
            );
            expect(comp.order[0]).to.equal('init');
        }
        expect(object.getComponent(TestComponentGettingDestroyed)).to.be.null;
        const destroyed = object.getComponent(TestComponentDestroyingOther)!.target;
        expect(destroyed.order).to.have.members(['init', 'destroyed']);

        /* The `start()` order is undefined, thus, the component could have been activated and deactivated,
         * or entirely skipped. We need to check for one or the other. */
        if (destroyed.deactivated) {
            expect(destroyed.order).to.eql([
                'init',
                'started',
                'activated',
                'deactivated',
                'destroyed',
            ]);
        } else {
            expect(destroyed.order).to.eql(['init', 'destroyed']);
        }

        /* Ensure `start` called one time for components active during loading.
         * Components getting deactivated must have `start()` called. */
        for (const def of [
            TestComponentActivatedWithParam,
            TestComponentActivatingOther,
            TestComponentGettingActivated,
            TestComponentDeactivatingOther,
            TestComponentDestroyingOther,
        ]) {
            const comp = object.getComponent(def)!;
            expect(comp.order).to.eql(
                ['init', 'started', 'activated'],
                `${comp} lifecycle error`
            );
            expect(comp.active).to.be.true;
        }
        const inactiveOnStart = object.getComponent(TestComponentInactiveOnStart)!;
        expect(inactiveOnStart.order).to.eql(['init']);
        expect(inactiveOnStart.active).to.be.false;

        /* The `start()` order is undefined, thus, the component could have been activated and deactivated,
         * or entirely skipped. We need to check for one or the other. */
        const deactivated = object.getComponent(TestComponentGettingDeactivated)!;
        expect(deactivated.active).to.be.false;
        if (deactivated.deactivated) {
            expect(deactivated.order).to.eql(['init', 'activated', 'deactivated']);
        } else {
            expect(deactivated.order).to.eql(['init']);
        }
    }

    it('inactive scene', async function () {
        const scene = await WL.loadSceneFromBuffer(mainJsComponentsBin);
        expect(scene._jsComponents).to.have.lengthOf(8);
        const objects = scene.findByNameRecursive('Test');
        expect(objects).to.have.length(1, 'invalid scene graph');
        inactiveTest(objects[0]);
    });

    it('active scene', async function () {
        const scene = await WL.loadSceneFromBuffer(mainJsComponentsBin);
        expect(scene._jsComponents).to.have.lengthOf(8);
        await WL.switchTo(scene);
        const objects = scene.findByName('Test');
        expect(objects).to.have.length(1, 'invalid scene graph');
        activeTest(objects[0]);
    });

    it('instantiate in active scene', async function () {
        const toInstantiate = await WL.loadSceneFromBuffer(mainJsComponentsBin);
        {
            const object = toInstantiate.findByNameRecursive('Test')[0];
            expect(object, 'invalid scene graph').to.not.be.undefined;
            inactiveTest(object);
        }
        expect(toInstantiate._jsComponents).to.have.lengthOf(8);

        await WL.switchTo(mainScene);

        const {root: instanceRoot} = mainScene.instantiate(toInstantiate);

        const objects = instanceRoot.findByNameRecursive('Test');
        expect(objects).to.have.length(1, 'invalid scene graph');
        const object = objects[0];

        activeTest(object);
    });

    it('instantiate in inactive scene and activate it', async function () {
        const inactiveScene = WL._createEmpty();
        expect(inactiveScene._jsComponents).to.have.lengthOf(0);

        const toInstantiate = await WL.loadSceneFromBuffer(mainJsComponentsBin);
        {
            const object = toInstantiate.findByNameRecursive('Test')[0];
            expect(object, 'invalid scene graph').to.not.be.undefined;
            inactiveTest(object);
        }
        expect(toInstantiate._jsComponents).to.have.lengthOf(8);

        const {root: instanceRoot} = inactiveScene.instantiate(toInstantiate);
        expect(inactiveScene._jsComponents).to.have.lengthOf(8);

        const objects = instanceRoot.findByNameRecursive('Test');
        expect(objects).to.have.length(1, 'invalid scene graph');
        const object = objects[0];
        inactiveTest(object);

        WL.switchTo(inactiveScene);
        activeTest(object);
    });
});
