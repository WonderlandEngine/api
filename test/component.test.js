import { expect, use } from '@esm-bundle/chai';
import { chaiAlmost } from './chai/almost.js';

import { init, reset } from './setup.js';
import { Component, Type, Collider, Alignment, Justification, InputType, LightType, TextEffect,
    LightComponent, ViewComponent, CollisionComponent, InputComponent,
    TextComponent, MeshComponent, AnimationComponent, Material, Mesh, Skin } from '../wonderland.js';

use(chaiAlmost());

before(init);
/* We only reset after the MeshComponents scope such that the 'Phong Opaque'
 * pipeline from the loading screen is available to create materials from */

describe('MeshComponent', function() {

    it('setters / getters', function () {
        const obj = WL.scene.addObject();
        const comp = obj.addComponent('mesh');

        expect(comp.material).to.equal(null);
        expect(comp.mesh).to.equal(null);
        expect(comp.skin).to.equal(null);

        comp.material = new Material(WL, 1);
        comp.mesh = new Mesh(2);
        comp.skin = new Skin(3);

        expect(comp.material._index).to.equal(1);
        expect(comp.mesh._index).to.equal(2);
        expect(comp.skin._index).to.equal(3);

        comp.material = null;
        comp.mesh = null;
        comp.skin = null;

        expect(comp.material).to.equal(null);
        expect(comp.mesh).to.equal(null);
        expect(comp.skin).to.equal(null);
    });

});

describe('Components', function() {

    beforeEach(reset);

    it('register', function() {
        /* Registers a simple component and ensure its methods are called */
        WL.registerComponent('dummy', {}, {
            init() {
                this.initCalled = 1;
                this.startCalled = 0;
            },
            start() { ++this.startCalled; }
        });
        const obj = WL.scene.addObject();
        const comp = obj.addComponent('dummy');
        expect(comp.initCalled).to.equal(1);
        expect(comp.startCalled).to.equal(1);
    });

    it('double register', function() {
        /* Registers a simple component and ensure its methods are called */
        const compDef = {
            init() {
                this.initCalled = 1;
                this.startCalled = 0;
            },
            start() { ++this.startCalled; }
        };
        WL.registerComponent('dummy', {}, compDef);
        WL.registerComponent('dummy', {}, compDef);
        const obj = WL.scene.addObject();
        const comp = obj.addComponent('dummy');
        expect(comp.initCalled).to.equal(1);
        expect(comp.startCalled).to.equal(1);
    });

    it('register class component', function() {
        class MyDummyComponent extends Component {
            static TypeName = 'my-dummy-class-component';
            constructor() {
                super();
                this.initCalled = 0;
                this.startCalled = 0;
            }
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
        const comp = obj.addComponent(MyDummyComponent.TypeName);
        expect(comp.initCalled).to.equal(1);
        expect(comp.startCalled).to.equal(1);
        const comp2 = obj2.addComponent(MyDummyComponent.TypeName);
        expect(comp2.initCalled).to.equal(1);
        expect(comp2.startCalled).to.equal(1);
    });

    it('component `this` is accessible', function() {
        WL.registerComponent(class MyDummyThisComponent extends Component {
            static TypeName = 'dummy-this-class';
            init() { this.str = 'Hello From Class!'; }
            getStr() { return this.str; }
        });
        WL.registerComponent('dummy-this', {}, {
            init() { this.str = 'Hello From Literal!'; },
            getStr() { return this.str; }
        });
        const obj = WL.scene.addObject();
        const comp = obj.addComponent('dummy-this-class');
        const noClassComp = obj.addComponent('dummy-this');
        expect(comp.getStr()).to.equal('Hello From Class!');
        expect(noClassComp.getStr()).to.equal('Hello From Literal!');
    });

    it('type', function() {
        const obj = WL.scene.addObject();
        const comp = obj.addComponent('light');
        expect(comp.type).to.equal('light');

        class TestComponent extends Component {
            static TypeName = 'test';
        }
        WL.registerComponent(TestComponent);

        /* Add component with class as first parameter */
        const compClass = obj.addComponent(TestComponent);
        expect(compClass).to.be.an.instanceOf(TestComponent);
        expect(compClass.type).to.equal(TestComponent.TypeName);
    });

    it('object', function() {
        const obj = WL.scene.addObject();
        const light = obj.addComponent('light');
        expect(light.object).to.equal(obj);
    });

    it('equality', function() {
        const obj = WL.scene.addObject();
        const lightA = obj.addComponent('light');
        const lightB = obj.addComponent('light');

        const copyOfLightA = lightA;

        expect(lightA.equals(lightA)).to.be.true;
        expect(lightA.equals(copyOfLightA)).to.be.true;
        expect(lightA.equals(lightB)).to.be.false;

    });

    it('active', function() {
        const obj = WL.scene.addObject();
        const light = obj.addComponent('light');
        expect(light.active).to.be.true;
        light.active = false;
        expect(light.active).to.be.false;
    });

    it('destroy', function() {
        const obj = WL.scene.addObject();
        const light = obj.addComponent('light');
        expect(light._id).to.exist;
        expect(light._manager).to.exist;
        light.destroy();
        expect(light._id).to.not.exist;
        expect(light._manager).to.not.exist;
    });

    it('getComponent with string', function() {
        const obj = WL.scene.addObject();

        /* Test native component. */

        const light = obj.addComponent('light');
        light._extra = 42;
        expect(light.equals(obj.getComponent('light'))).to.be.true;
        expect(obj.getComponent('light')._extra).to.equal(42);

        /* Test custom component. */

        class MyFirstDummyComponent extends Component {
            static TypeName = 'my-first-dummy-class-component';
            static Properties = {
                propA: { type: Type.String, default: 'i'}
            };
        }
        WL.registerComponent(MyFirstDummyComponent);

        const expected = obj.addComponent(MyFirstDummyComponent);
        expected._extra = 'extraProp';
        const result = obj.getComponent('my-first-dummy-class-component');
        expect(result.equals(result)).to.be.true;
        expect(result.type).to.equal(MyFirstDummyComponent.TypeName);
        expect(result.propA).to.equal('i');
        expect(result._extra).to.equal('extraProp');
    });

    it('getComponent', function() {
        const obj = WL.scene.addObject();

        /* Test native components */

        const native = [CollisionComponent, TextComponent, ViewComponent, InputComponent, LightComponent, AnimationComponent, MeshComponent];
        for(let i = 0; i < native.length; ++i) {
            const ctor = native[i];
            const expected = obj.addComponent(ctor);
            const expectedProp = `${ctor.name}-${i}`;
            expected._extra = expectedProp;
            const result = obj.getComponent(ctor);
            expect(result.equals(result)).to.be.true;
            expect(result.type).to.equal(ctor.TypeName);
            expect(result._extra).to.equal(expectedProp);
        }

        /* Test custom components */

        class MyFirstDummyComponent extends Component {
            static TypeName = 'my-first-dummy-class-component';
            static Properties = {};
        }
        class MySecondDummyComponent extends Component {
            static TypeName = 'my-second-dummy-class-component';
        }
        WL.registerComponent(MyFirstDummyComponent);
        WL.registerComponent(MySecondDummyComponent);

        for(const ctor of [MyFirstDummyComponent, MySecondDummyComponent]) {
            const expected = obj.addComponent(ctor);
            expected._extra = 'extraProp';
            const result = obj.getComponent(ctor);
            expect(result.equals(result)).to.be.true;
            expect(result.type).to.equal(ctor.TypeName);
            expect(result._extra).to.equal('extraProp');
        }
    });

    it('getComponents', function() {
        const obj = WL.scene.addObject();

        class TestComponent extends Component {
            static TypeName = 'test';
        }
        WL.registerComponent(TestComponent);

        expect(obj.getComponents(TestComponent)).to.have.lengthOf(0);
        const compA = obj.addComponent(TestComponent);
        compA.name = 1;
        const compB = obj.addComponent(TestComponent);
        compB.name = 2;
        expect(obj.getComponents(TestComponent)
            .sort((a, b) => a - b)
            .map(v => v.name)).to.eql([1, 2]);
        expect(obj.getComponents(TestComponent)).to.have.lengthOf(2);

        /* Calling with no argument should return all components. */
        const compC = obj.addComponent('light');
        compC.name = 3;
        expect(obj.getComponents()
            .sort((a, b) => a - b)
            .map(v => v.name)).to.eql([1, 2, 3]);
    });

    describe('add Components', function() {

        it('type', function () {
            /* Registers a simple component and ensure its methods are called */
            WL.registerComponent('custom', {}, {
                init: function() {
                    this.initCalled = true;
                    this.paramDefined = this.customParam !== undefined;
                }
            });
            const obj = WL.scene.addObject();
            const light = obj.addComponent('light');
            expect(light._id).to.equal(0);
            expect(light).to.be.an.instanceof(LightComponent);

            const view = obj.addComponent('view');
            expect(view._id).to.equal(0);
            expect(view).to.be.an.instanceof(ViewComponent);

            const text = obj.addComponent('text');
            expect(text._id).to.equal(0);
            expect(text).to.be.an.instanceof(TextComponent);

            const mesh = obj.addComponent('mesh');
            expect(mesh._id).to.equal(0);
            expect(mesh).to.be.an.instanceof(MeshComponent);

            const input = obj.addComponent('input');
            expect(input._id).to.equal(0);
            expect(input).to.be.an.instanceof(InputComponent);

            const collision = obj.addComponent('collision');
            expect(collision._id).to.equal(0);
            expect(collision).to.be.an.instanceof(CollisionComponent);

            const custom = obj.addComponent('custom', {customParam: 42});
            expect(custom).to.exist;
            expect(custom).to.be.an.instanceof(Component);
            expect(custom.initCalled).to.be.true;
            expect(custom.paramDefined).to.be.true;
            try {
                obj.addComponent('this-type-does-not-exist');
            } catch(e) {
                expect(e).to.be.instanceof(TypeError);
            }
        });

        it('cloning', function() {
            const obj = WL.scene.addObject();
            const light = obj.addComponent('light');
            const clone = obj.addComponent('light', light);
            expect(clone._id).to.equal(1);
            expect(clone).to.be.instanceof(LightComponent);
        });
    });

    describe('CollisionComponent', function() {

        it('getters', function () {
            const objA = WL.scene.addObject();
            objA.transformLocal = [0, 0, -10];
            const compA = objA.addComponent('collision', 0);
            compA.extents = [1, 0, 0];
            compA.collider = Collider.Sphere;
            compA.group = 1;

            expect(compA.collider).to.equal(Collider.Sphere);
            expect(compA.extents[0]).to.equal(1);
            expect(compA.group).to.equal(1);
        });

        it('overlaps query', function () {
            const oA = WL.scene.addObject();
            const oB = WL.scene.addObject();

            oA.transformLocal = [0, 0, -10];
            oB.transformLocal = [1, 1, -10];

            const cA = oA.addComponent('collision');
            cA.extents = [1, 0, 0];
            cA.collider = Collider.Sphere;
            cA.group = 1;

            const cB = oB.addComponent('collision');
            cB.extents = [1, 0, 0];
            cB.collider = Collider.Sphere;
            cB.group = 1;
            const overlaps = cA.queryOverlaps();

            expect(overlaps.length).to.equal(1);
            expect(overlaps[0]).to.eql(cB);
        });

        it('setters', function () {
            const o = WL.scene.addObject();
            const c = o.addComponent('collision');
            c.collider = Collider.AxisAlignedBox;
            c.extents[0] = 2.0;
            c.group = 2;

            expect(c.collider).to.equal(Collider.AxisAlignedBox);
            expect(c.extents[0]).to.equal(2.0);
            expect(c.group).to.equal(2);
        });

    });

    describe('TextComponent', function() {

        it('getters / setters', function () {
            const obj = WL.scene.addObject();
            const comp = obj.addComponent('text');

            comp.text = "Initial Text";
            comp.alignment = Alignment.Left;
            comp.justification = Justification.Top;
            comp.characterSpacing = 0.25;
            comp.lineSpacing = 2.0;
            comp.effect = TextEffect.Outline;

            expect(comp.text).to.equal("Initial Text");
            expect(comp.alignment).to.equal(Alignment.Left);
            expect(comp.justification).to.equal(Justification.Top);
            expect(comp.characterSpacing).to.equal(0.25);
            expect(comp.lineSpacing).to.equal(2.0);
            expect(comp.effect).to.equal(TextEffect.Outline);

            comp.text = "Modified Text";
            comp.alignment = Alignment.Center;
            comp.justification = Justification.Middle;
            comp.characterSpacing = 0.5;
            comp.lineSpacing = 1.5;
            comp.effect = TextEffect.None;

            expect(comp.text).to.equal("Modified Text");
            expect(comp.alignment).to.equal(Alignment.Center);
            expect(comp.justification).to.equal(Justification.Middle);
            expect(comp.characterSpacing).to.equal(0.5);
            expect(comp.lineSpacing).to.equal(1.5);
            expect(comp.effect).to.equal(TextEffect.None);

        });
    });

    describe('ViewComponent', function() {

        it('getters / setters', function () {
            const obj = WL.scene.addObject();
            const comp = obj.addComponent('view');

            comp.near = 0.1;
            comp.far = 100.0;
            comp.fov = 45.0;

            expect(comp.near).to.almost.equal(0.1);
            expect(comp.far).to.almost.equal(100.0);
            expect(comp.fov).to.almost.equal(45.0);

            comp.near = 0.2;
            comp.far = 50.0;
            comp.fov = 90.0;

            expect(comp.near).to.almost.equal(0.2);
            expect(comp.far).to.almost.equal(50.0);
            expect(comp.fov).to.almost.equal(90.0);
        });
    });

    describe('InputComponent', function() {

        it('Input Type', function () {
            const obj = WL.scene.addObject();
            const comp = obj.addComponent('input');

            expect(comp.inputType).to.equal(InputType.Head);
            expect(comp.xrInputSource).to.equal(null);
            expect(comp.handedness).to.equal(null);

            comp.inputType = InputType.ControllerLeft;
            expect(comp.inputType).to.equal(InputType.ControllerLeft);
            expect(comp.handedness).to.equal('left')

        });
    });

    describe('LightComponent', function() {

        it('setters / getters', function () {
            const obj = WL.scene.addObject();
            const comp = obj.addComponent('light');

            expect(comp.lightType).to.equal(LightType.Point);
            expect(comp.color).to.eql(new Float32Array([0, 0, 0, 0 ]));

            comp.lightType = LightType.Sun;
            expect(comp.lightType).to.equal(LightType.Sun);
        });

    });

    describe('AnimationComponent', function() {

        it('setters / getters', function () {
            const objA = WL.scene.addObject();
            const objB = WL.scene.addObject();
            const comp = objA.addComponent('animation');
            const comp2 = objB.addComponent('animation');

            expect(comp.object.objectId).to.equal(objA.objectId);
            expect(comp2.object.objectId).to.equal(objB.objectId);

            // TODO: Test play/pause/stop
            // TODO: Test animation setter&getter
            // TODO: Test state getter
        });

    });

    describe('JSComponent', function() {

        it('setters / getters', function () {
            WL.registerComponent('custom', {}, {});

            const objA = WL.scene.addObject();
            const objB = WL.scene.addObject();
            const compA = objA.addComponent('custom');
            const compB = objB.addComponent('custom');

            compA.myCustomProp = 42;
            compB.myCustomProp = 123;

            expect(compA.equals(compB)).to.be.false;
            expect(compA.equals(objA.getComponent('custom'))).to.be.true;
        });

    });

});
