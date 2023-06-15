import {expect, use} from '@esm-bundle/chai';
import {chaiAlmost} from './chai/almost.js';

import {init, reset, WL} from './setup.js';
import {
    Component,
    Type,
    Collider,
    Alignment,
    Justification,
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
} from '..';

use(chaiAlmost());

before(init);
/* We only reset after the MeshComponents scope such that the 'Phong Opaque'
 * pipeline from the loading screen is available to create materials from */

describe('MeshComponent', function () {
    it('properties', function () {
        expect(MeshComponent.Properties).to.have.keys(['material', 'mesh', 'skin']);
    });

    it('getters / setters', function () {
        const obj = WL.scene.addObject();
        const comp = obj.addComponent('mesh')!;

        expect(comp.material).to.equal(null);
        expect(comp.mesh).to.equal(null);
        expect(comp.skin).to.equal(null);

        comp.material = new Material(WL, 1);
        comp.mesh = new Mesh(WL, 2);
        comp.skin = new Skin(WL, 3);

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

    it('cloning', function () {
        const obj = WL.scene.addObject();
        const comp = obj.addComponent('mesh')!;
        comp.material = new Material(WL, 1);
        comp.mesh = new Mesh(WL, 2);
        comp.skin = new Skin(WL, 3);

        const clone = obj.addComponent('mesh', comp)!;
        expect(clone).to.be.instanceof(MeshComponent);
        expect(clone._manager).to.equal(comp._manager);
        expect(clone._id).to.not.equal(comp._id);
        expect(clone.material!.equals(comp.material)).to.be.true;
        expect(clone.mesh!.equals(comp.mesh)).to.be.true;
        expect(clone.skin!.equals(comp.skin)).to.be.true;
    });
});

describe('Components', function () {
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

    it('type', function () {
        const obj = WL.scene.addObject();
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
        const obj = WL.scene.addObject();
        const light = obj.addComponent('light')!;
        expect(light.object).to.equal(obj);
    });

    it('equals', function () {
        const obj = WL.scene.addObject();
        const light1 = obj.addComponent('light')!;
        const light2 = obj.addComponent('light')!;
        const light3 = new LightComponent(WL, light1._manager, light1._id);

        expect(light1.equals(null)).to.be.false;
        expect(light1.equals(undefined)).to.be.false;
        expect(light1.equals(light1)).to.be.true;
        expect(light1.equals(light2)).to.be.false;
        expect(light2.equals(light1)).to.be.false;
        expect(light1.equals(light3)).to.be.true;
        expect(light3.equals(light1)).to.be.true;

        /* Manager and ID both have to be the same */
        const mesh1 = obj.addComponent('mesh')!;
        const mesh2 = new MeshComponent(WL, mesh1._manager, light1._id);
        expect(light1.equals(mesh2)).to.be.false;
    });

    it('active', function () {
        const obj = WL.scene.addObject();
        const light = obj.addComponent('light')!;
        expect(light.active).to.be.true;
        light.active = false;
        expect(light.active).to.be.false;
        light.active = true;
        expect(light.active).to.be.true;
    });

    it('destroy', function () {
        const obj = WL.scene.addObject();
        obj.addComponent('mesh');
        const light = obj.addComponent('light')!;
        const light2 = obj.addComponent('light')!;
        expect(light._id).to.exist;
        expect(light._manager).to.exist;
        expect(obj.getComponents('light').length).to.equal(2);

        light.destroy();
        expect(light._id).to.equal(-1);
        expect(light._manager).to.equal(-1);
        expect(obj.getComponents('light').length).to.equal(1);
        expect(obj.getComponents('light')[0].equals(light2)).to.be.true;
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
        WL.registerComponent(TestComponent);

        expect(obj.getComponents(TestComponent)).to.have.lengthOf(0);
        const compA = obj.addComponent(TestComponent)!;
        compA.name = 1;
        const compB = obj.addComponent(TestComponent)!;
        compB.name = 2;
        expect(
            obj
                .getComponents(TestComponent)
                .sort((a, b) => a.name - b.name)
                .map((v) => v.name)
        ).to.eql([1, 2]);
        expect(obj.getComponents(TestComponent)).to.have.lengthOf(2);

        /* Calling with no argument should return all components. */
        const compC = obj.addComponent('light')!;
        (compC as any).name = 3;

        const components = obj.getComponents() as (Component & {name: number})[];
        expect(components.sort((a, b) => a.name - b.name).map((v) => v.name)).to.eql([
            1, 2, 3,
        ]);
    });

    describe('lifecycle', function () {
        class TestLifecycle extends Component {
            static TypeName = 'test-lifecycle';
            static Properties = {};
            initialized = 0;
            started = 0;
            updated = 0;
            activated = 0;
            deactivated = 0;
            destroyed = 0;
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
                ++this.destroyed;
            }
        }

        beforeEach(() => WL.registerComponent(TestLifecycle));

        /* @deprecated Remove at 1.1 */
        it('dependencies-deprecated', function () {
            class DependencyA extends Component {
                static TypeName = 'dependency-a';
            }
            class DependencyB extends Component {
                static TypeName = 'dependency-b';
            }
            class DependencyC extends Component {
                static TypeName = 'dependency-c';
                static Dependencies = [DependencyB];
            }
            class MyComponent extends Component {
                static TypeName = 'my-component';
                static Dependencies = [DependencyA, DependencyC];
            }

            expect(WL.isRegistered(DependencyA)).to.be.false;
            expect(WL.isRegistered(DependencyB)).to.be.false;
            expect(WL.isRegistered(DependencyC)).to.be.false;
            WL.registerComponent(MyComponent);
            expect(WL.isRegistered(DependencyA)).to.be.true;
            expect(WL.isRegistered(DependencyB)).to.be.true;
            expect(WL.isRegistered(DependencyC)).to.be.true;
        });

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
        });

        it('onDestroy()', function () {
            const obj = WL.scene.addObject();
            const c = obj.addComponent(TestLifecycle, {active: false})!;
            expect([c.started, c.updated, c.activated, c.deactivated, c.destroyed]).to.eql([
                0, 0, 0, 0, 0,
            ]);
            obj.destroy();
            expect(c.destroyed).to.equal(1);
            expect([c.started, c.updated, c.activated, c.deactivated]).to.eql([0, 0, 0, 0]);
        });
    });

    describe('add Components', function () {
        it('type', function () {
            /* Registers a simple component and ensure its methods are called */
            class TestComponent extends Component {
                static TypeName = 'custom';
                static Properties = {
                    customParam: {type: Type.Int},
                };
                customParam = Number.NEGATIVE_INFINITY;
                initCalled = false;
                paramDefined = false;
                unknownParamDefined: boolean = undefined!;
                init() {
                    this.initCalled = true;
                    this.paramDefined = this.customParam !== undefined;
                    this.unknownParamDefined = (this as any).unknownParam !== undefined;
                }
            }
            WL.registerComponent(TestComponent);
            const obj = WL.scene.addObject();
            const light = obj.addComponent('light')!;
            expect(light._id).to.equal(0);
            expect(light).to.be.an.instanceof(LightComponent);

            const view = obj.addComponent('view')!;
            expect(view._id).to.equal(0);
            expect(view).to.be.an.instanceof(ViewComponent);

            const text = obj.addComponent('text')!;
            expect(text._id).to.equal(0);
            expect(text).to.be.an.instanceof(TextComponent);

            const mesh = obj.addComponent('mesh')!;
            expect(mesh._id).to.equal(0);
            expect(mesh).to.be.an.instanceof(MeshComponent);

            const input = obj.addComponent('input')!;
            expect(input._id).to.equal(0);
            expect(input).to.be.an.instanceof(InputComponent);

            const collision = obj.addComponent('collision')!;
            expect(collision._id).to.equal(0);
            expect(collision).to.be.an.instanceof(CollisionComponent);

            const custom = obj.addComponent('custom', {
                customParam: 42,
                unknownParam: 12,
            })! as TestComponent;
            expect(custom).to.exist;
            expect(custom).to.be.an.instanceof(Component);
            expect(custom.initCalled).to.be.true;
            expect(custom.paramDefined).to.be.true;
            /* Only properties listed in Properties are cloned */
            expect(custom.unknownParamDefined).to.be.false;
            try {
                obj.addComponent('this-type-does-not-exist');
            } catch (e) {
                expect(e).to.be.instanceof(TypeError);
            }
        });
    });

    describe('CollisionComponent', function () {
        it('properties', function () {
            expect(CollisionComponent.Properties).to.have.keys([
                'extents',
                'collider',
                'group',
            ]);
        });

        it('getters / setters', function () {
            const objA = WL.scene.addObject();
            objA.transformLocal = [0, 0, -10];
            const compA = objA.addComponent('collision')!;
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
            const o = WL.scene.addObject();
            const c = o.addComponent('collision')!;
            c.collider = Collider.AxisAlignedBox;
            c.extents[0] = 2.0;
            c.group = 2;

            expect(c.collider).to.equal(Collider.AxisAlignedBox);
            expect(c.extents[0]).to.equal(2.0);
            expect(c.group).to.equal(2);
        });

        it('cloning', function () {
            const obj = WL.scene.addObject();
            const comp = obj.addComponent('collision')!;
            comp.extents = [1, 3, 9];
            comp.collider = Collider.Sphere;
            comp.group = 1;

            const clone = obj.addComponent('collision', comp)!;
            expect(clone).to.be.instanceof(CollisionComponent);
            expect(clone._manager).to.equal(comp._manager);
            expect(clone._id).to.not.equal(comp._id);
            expect(clone.extents).to.deep.equal(comp.extents);
            expect(clone.collider).to.equal(comp.collider);
            expect(clone.group).to.equal(comp.group);
        });
    });

    describe('TextComponent', function () {
        it('properties', function () {
            expect(TextComponent.Properties).to.have.keys([
                'text',
                'material',
                'alignment',
                'justification',
                'characterSpacing',
                'lineSpacing',
                'effect',
            ]);
        });

        it('getters / setters', function () {
            const obj = WL.scene.addObject();
            const comp = obj.addComponent('text')!;

            comp.text = 'Initial Text';
            comp.alignment = Alignment.Left;
            comp.justification = Justification.Top;
            comp.characterSpacing = 0.25;
            comp.lineSpacing = 2.0;
            comp.effect = TextEffect.Outline;

            expect(comp.text).to.equal('Initial Text');
            expect(comp.alignment).to.equal(Alignment.Left);
            expect(comp.justification).to.equal(Justification.Top);
            expect(comp.characterSpacing).to.equal(0.25);
            expect(comp.lineSpacing).to.equal(2.0);
            expect(comp.effect).to.equal(TextEffect.Outline);

            comp.text = 'Modified Text';
            comp.alignment = Alignment.Center;
            comp.justification = Justification.Middle;
            comp.characterSpacing = 0.5;
            comp.lineSpacing = 1.5;
            comp.effect = TextEffect.None;

            expect(comp.text).to.equal('Modified Text');
            expect(comp.alignment).to.equal(Alignment.Center);
            expect(comp.justification).to.equal(Justification.Middle);
            expect(comp.characterSpacing).to.equal(0.5);
            expect(comp.lineSpacing).to.equal(1.5);
            expect(comp.effect).to.equal(TextEffect.None);

            /* Test tempMem size */
            const largeText = 'w'.repeat(10 * 1024);
            comp.text = largeText;
            expect(comp.text.length).to.equal(largeText.length);

            /* Test setting anything other then string */
            comp.text = 123;
            expect(comp.text).to.equal('123');
            comp.text = obj;
            expect(comp.text).to.equal('[object Object]');
        });

        it('cloning', function () {
            const obj = WL.scene.addObject();
            const comp = obj.addComponent('text')!;
            comp.text = 'Initial Text';
            comp.material = null;
            // TODO: test non-null material
            comp.alignment = Alignment.Left;
            comp.justification = Justification.Top;
            comp.characterSpacing = 0.25;
            comp.lineSpacing = 2.0;
            comp.effect = TextEffect.Outline;

            const clone = obj.addComponent('text', comp)!;
            expect(clone).to.be.instanceof(TextComponent);
            expect(clone._manager).to.equal(comp._manager);
            expect(clone._id).to.not.equal(comp._id);
            expect(clone.text).to.equal(comp.text);
            expect(clone.material).to.equal(null);
            expect(clone.alignment).to.equal(comp.alignment);
            expect(clone.justification).to.equal(comp.justification);
            expect(clone.characterSpacing).to.equal(comp.characterSpacing);
            expect(clone.lineSpacing).to.equal(comp.lineSpacing);
            expect(clone.effect).to.equal(comp.effect);
        });
    });

    describe('ViewComponent', function () {
        it('properties', function () {
            expect(ViewComponent.Properties).to.have.keys(['near', 'far', 'fov']);
        });

        it('getters / setters', function () {
            const obj = WL.scene.addObject();
            const comp = obj.addComponent('view')!;

            comp.near = 0.1;
            comp.far = 100.0;
            comp.fov = 45.0;

            expect(comp.near).to.almost(0.1);
            expect(comp.far).to.almost(100.0);
            expect(comp.fov).to.almost(45.0);

            comp.near = 0.2;
            comp.far = 50.0;
            comp.fov = 90.0;

            expect(comp.near).to.almost(0.2);
            expect(comp.far).to.almost(50.0);
            expect(comp.fov).to.almost(90.0);
        });

        it('cloning', function () {
            const obj = WL.scene.addObject();
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
    });

    describe('InputComponent', function () {
        it('properties', function () {
            expect(InputComponent.Properties).to.have.keys(['inputType']);
        });

        it('Input Type', function () {
            const obj = WL.scene.addObject();
            const comp = obj.addComponent('input')!;

            expect(comp.inputType).to.equal(InputType.Head);
            expect(comp.xrInputSource).to.equal(null);
            expect(comp.handedness).to.equal(null);

            comp.inputType = InputType.ControllerLeft;
            expect(comp.inputType).to.equal(InputType.ControllerLeft);
            expect(comp.handedness).to.equal('left');
        });

        it('cloning', function () {
            const obj = WL.scene.addObject();
            const comp = obj.addComponent('input')!;
            comp.inputType = InputType.ControllerRight;

            const clone = obj.addComponent('input', comp)!;
            expect(clone).to.be.instanceof(InputComponent);
            expect(clone._manager).to.equal(comp._manager);
            expect(clone._id).to.not.equal(comp._id);
            expect(clone.inputType).to.equal(comp.inputType);
        });
    });

    describe('LightComponent', function () {
        it('properties', function () {
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

        it('getters / setters', function () {
            const obj = WL.scene.addObject();
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
            const obj = WL.scene.addObject();
            const comp = obj.addComponent('light')!;

            const out = new Float32Array(3);

            comp.setColor([5.0, 6.0, 7.0]);
            comp.getColor(out);
            expect(out).to.eql(new Float32Array([5.0, 6.0, 7.0]));
            expect(comp.getColor()).to.eql(out);
        });

        it('cloning', function () {
            const obj = WL.scene.addObject();
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

            const clone = obj.addComponent('light', comp)!;
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
        });
    });

    describe('AnimationComponent', function () {
        it('properties', function () {
            expect(AnimationComponent.Properties).to.have.keys([
                'animation',
                'playCount',
                'speed',
            ]);
        });

        it('getters / setters', function () {
            const objA = WL.scene.addObject();
            const objB = WL.scene.addObject();
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

            comp.play();
            expect(comp.state).to.equal(AnimationState.Playing);
            comp.pause();
            expect(comp.state).to.equal(AnimationState.Paused);
            comp.stop();
            expect(comp.state).to.equal(AnimationState.Stopped);
        });

        it('cloning', function () {
            const obj = WL.scene.addObject();
            const comp = obj.addComponent('animation')!;
            // TODO: animation
            comp.playCount = 4;
            comp.speed = 2.25;

            const clone = obj.addComponent('animation', comp)!;
            expect(clone).to.be.instanceof(AnimationComponent);
            expect(clone._manager).to.equal(comp._manager);
            expect(clone._id).to.not.equal(comp._id);
            expect(clone.playCount).to.equal(comp.playCount);
            expect(clone.speed).to.equal(comp.speed);
        });
    });

    describe('JSComponent', function () {
        it('getters / setters', function () {
            class TestComponent extends Component {
                static TypeName = 'custom';
                myCustomProp = Number.NEGATIVE_INFINITY;
            }
            WL.registerComponent(TestComponent);

            const objA = WL.scene.addObject();
            const objB = WL.scene.addObject();
            const compA = objA.addComponent(TestComponent)!;
            const compB = objB.addComponent(TestComponent)!;

            compA.myCustomProp = 42;
            compB.myCustomProp = 123;

            expect(compA.equals(compB)).to.be.false;
            expect(compA.equals(objA.getComponent('custom'))).to.be.true;
        });

        it('equals', function () {
            const obj = WL.scene.addObject();

            class TestComponent extends Component {
                static TypeName = 'test';
                someValue = Number.NEGATIVE_INFINITY;
            }
            WL.registerComponent(TestComponent);
            WL.registerComponent(TestComponent);

            const custom1 = obj.addComponent('test')! as TestComponent;
            const custom2 = obj.addComponent('test')! as TestComponent;
            const custom3 = new Component(WL, custom1._manager, custom1._id);

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
                WL,
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
            const weirdClass = new TestComponent(WL, customClass1._manager, custom1._id);
            expect(weirdClass.equals(custom1)).to.be.true;
        });

        it('cloning', function () {
            class CustomComponent extends Component {
                static TypeName = 'custom';
                static Properties = {
                    aFloat: {type: Type.Float},
                    anObject: {type: Type.Object},
                };
            }
            interface CustomComponent {
                aFloat: number;
                anObject: Object3D;
                myCustomProp: number;
            }

            WL.registerComponent(CustomComponent);

            const obj1 = WL.scene.addObject();
            const obj2 = WL.scene.addObject();

            const classComp = obj1.addComponent(CustomComponent)!;
            const comp = obj2.addComponent('custom') as CustomComponent;

            for (let instance of [comp, classComp]) {
                instance.active = false;
                instance.aFloat = 2.0;
                instance.anObject = obj1;
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
                expect(clonedInstance.aFloat).to.equal(instance.aFloat);
                expect(clonedInstance.anObject).to.equal(instance.anObject);
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

            const obj = WL.scene.addObject();

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

            const obj = WL.scene.addObject();
            const comp = obj.addComponent(CustomComponent)!;
            comp.active = false;

            const cloneDefault = obj.addComponent(CustomComponent, {aProperty: 2.0})!;
            expect(cloneDefault.active).to.equal(true);
            expect(cloneDefault.aProperty).to.equal(2.0);

            const cloneExplicit = obj.addComponent(CustomComponent, {
                aProperty: 2.0,
                active: false,
            })!;
            expect(cloneExplicit.active).to.equal(false);
            expect(cloneDefault.aProperty).to.equal(2.0);
        });
    });
});
