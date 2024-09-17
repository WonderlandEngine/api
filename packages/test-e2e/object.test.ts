import {expect, use} from '@esm-bundle/chai';
import {chaiAlmost} from './chai/almost.js';

import {describeScene, init, reset, WL} from './setup.js';
import {
    Component,
    ComponentConstructor,
    Object3D,
    Property,
    Scene,
} from '@wonderlandengine/api';

before(init);
beforeEach(reset);

use(chaiAlmost());

function objectsToIds(objects: Object3D[]): number[] {
    return objects.map((o) => o.objectId).sort();
}

/**
 * Create a simple test hierarchy of the form:
 * grandparent
 *     -> parent
 *         -> child
 *
 * @param scene Scene to create the hierarchy
 * @returns Grand parent object
 */
function createHierarchy(scene: Scene) {
    const grandparent = scene.addObject();
    grandparent.name = 'grandparent';
    const parent = scene.addObject(grandparent);
    parent.name = 'parent';
    const child = scene.addObject(parent);
    child.name = 'child';
    return [grandparent, parent, child];
}

describeScene('Object', function (ctx) {
    it('get and set name', function () {
        const obj = ctx.scene.addChild();
        obj.name = 'Object1';
        expect(obj.name).to.equal('Object1');

        /* Test with a second object to ensure no clash occurs. */
        const obj2 = ctx.scene.addChild();
        obj2.name = 'Object2';
        expect(obj.name).to.equal('Object1');
        expect(obj2.name).to.equal('Object2');
    });

    it('get children', function () {
        /*
         * |-> parent
         *     |-> childA
         *     |-> childB
         */
        const parent = ctx.scene.addChild();
        expect(parent.childrenCount).to.equal(0);
        expect(parent.children).to.eql([]);
        expect(parent.getChildren()).to.eql([]);

        const childA = parent.addChild();
        expect(childA.children).to.eql([]);
        expect(parent.children).to.eql([childA]);

        const childB = ctx.scene.addChild();
        expect(childB.children).to.eql([]);
        childB.parent = parent;
        expect(parent.childrenCount).to.equal(2);
        expect(parent.children).to.eql([childA, childB]);

        /* Check that the accessor and the method return the same thing */
        expect(parent.getChildren()).to.eql([childA, childB]);

        const out: Object3D[] = [null!, null!];
        expect(parent.getChildren(out)).to.equal(out);
        expect(out).to.deep.equal([childA, childB]);
    });

    it('.wrap() and references equality', function () {
        const obj1 = ctx.scene.addChild();
        const obj2 = ctx.scene.addChild();
        const obj3 = ctx.scene.wrap(obj1._localId);
        expect(obj1).to.not.equal(obj2);
        expect(obj1).to.equal(obj3);
    });

    it('deprecated .equals()', function () {
        const obj1 = ctx.scene.addChild();
        const obj2 = ctx.scene.addChild();
        const obj3 = ctx.scene.wrap(obj1._localId);
        expect(obj1.equals(null)).to.be.false;
        expect(obj1.equals(undefined)).to.be.false;
        expect(obj1.equals(obj1)).to.be.true;
        expect(obj1.equals(obj2)).to.be.false;
        expect(obj2.equals(obj1)).to.be.false;
        expect(obj1.equals(obj3)).to.be.true;
        expect(obj3.equals(obj1)).to.be.true;
    });

    it('get changed', function () {
        /** @todo Test unchanged state once it can be replicated in tests */
        const x = ctx.scene.addChild();
        const a = x.addChild();
        const b = a.addChild();

        expect(x.changed).to.be.false;
        expect(a.changed).to.be.true;
        expect(b.changed).to.be.true;
    });

    it('.destroy() without prototype destruction', function () {
        const x = ctx.scene.addChild();
        const a = x.addChild();
        const b = x.addChild();
        a.addChild();
        a.destroy();

        expect(a.objectId).to.equal(-1);
        expect(x.children.length).to.equal(1);
        expect(x.children[0].equals(b)).to.be.true;
        expect(a.isDestroyed).to.be.true;
    });

    it('.destroy() id re-use', function () {
        const a = ctx.scene.addObject();
        const b = ctx.scene.addObject();

        {
            const id = a._id;
            a.destroy();
            const c = ctx.scene.addObject();
            expect(c._id).to.equal(id);
        }
        ctx.scene.addObject();
        {
            const id = b._id;
            b.destroy();
            const d = ctx.scene.addObject();
            expect(d._id).to.equal(id);
        }
    });

    it('.destroy() with prototype destruction', function () {
        WL.erasePrototypeOnDestroy = true;

        const a = ctx.scene.addChild();
        const b = ctx.scene.addChild();
        const bId = b.objectId;

        a.destroy();
        expect(() => a.translateLocal([1, 1, 1])).to.throw(
            `Cannot read 'translateLocal' of destroyed object`
        );
        expect(() => (a.active = false)).to.throw(
            `Cannot write 'active' of destroyed object`
        );
        expect(() => ((a as Record<string, any>).test = 5)).to.throw(
            `Cannot write 'test' of destroyed object`
        );

        /* Ensure destroying `a` didn't destroy `b` as well */
        expect(b.objectId).to.equal(bId);
    });

    it('.destroy() parent should destroy children', function () {
        const notDestroyed1 = ctx.scene.addChild(); /* Should be untouched */
        notDestroyed1.addChild();

        const parent = ctx.scene.addChild();
        const child = parent.addChild();
        const grandchild = child.addChild();

        const notDestroyed2 = ctx.scene.addChild(); /* Should be untouched */
        notDestroyed2.addChild();

        const light = child.addComponent('light');
        const view = child.addComponent('view');
        const mesh = grandchild.addComponent('mesh');
        const input = grandchild.addComponent('input');

        parent.destroy();
        expect(child.isDestroyed).to.be.true;
        expect(grandchild.isDestroyed).to.be.true;
        expect(light.isDestroyed).to.be.true;
        expect(view.isDestroyed).to.be.true;
        expect(mesh.isDestroyed).to.be.true;
        expect(input.isDestroyed).to.be.true;
        /* `notDestroyed1` and `notDestroyed2` should be unaffected */
        expect(notDestroyed1.isDestroyed).to.be.false;
        expect(notDestroyed1.children[0].isDestroyed).to.be.false;
        expect(notDestroyed2.isDestroyed).to.be.false;
        expect(notDestroyed2.children[0].isDestroyed).to.be.false;
    });

    it('(set|get)Position(World|Local)', function () {
        const obj = ctx.scene.addChild();
        const objB = obj.addChild();
        const out = new Float32Array(3);
        expect(obj.transformWorld).to.eql(new Float32Array([0, 0, 0, 1, 0, 0, 0, 0]));

        obj.setPositionLocal([1, 2, 3]);
        obj.getPositionLocal(out);
        expect(out).to.eql(new Float32Array([1, 2, 3]));

        obj.setPositionWorld([5, 6, 7]);
        obj.getPositionWorld(out);
        expect(out).to.eql(new Float32Array([5, 6, 7]));

        /* Setting the translation should be rotation independent */
        obj.rotateAxisAngleDeg([1, 0, 0], 45.0);
        obj.setPositionLocal([3, 2, 1]);

        obj.getPositionLocal(out);
        expect(out).to.be.deep.almost(new Float32Array([3, 2, 1]), 0.01);

        objB.rotateAxisAngleDeg([0, 1, 0], 45.0);
        objB.setPositionWorld([7, 6, 5]);
        objB.getPositionWorld(out);
        expect(out).to.be.deep.almost([7, 6, 5], 0.01);

        /* Regression test for issue #1158, rotation drift
         * when using setTranslationWorld */
        obj.transformLocal.set([
            0.21471689641475677, -0.2291741520166397, 0.13939940929412842,
            0.939118504524231, 1.8250943422317505, 4.1528143882751465, 12.229280471801758,
            -1.2191383838653564,
        ]);
        obj.transformWorld.set(obj.transformLocal);

        objB.resetRotation();
        /* Setting the child to a position "far" from the parent
         * resulted in a drift in rotation in 0.9.5 */
        objB.setTranslationWorld([10, 20, 30]);
        expect(objB.transformLocal.subarray(0, 4)).to.be.deep.equal(
            new Float32Array([0, 0, 0, 1])
        );
    });

    it('transformation reset', function () {
        const obj = ctx.scene.addChild();
        obj.resetTransform();
        expect(obj.transformLocal).to.eql(new Float32Array([0, 0, 0, 1, 0, 0, 0, 0]));
    });

    it('translate', function () {
        const obj = ctx.scene.addChild();
        obj.translate([1, 2, 3]);
        expect(obj.transformLocal).to.eql(new Float32Array([0, 0, 0, 1, 0.5, 1, 1.5, 0]));
    });

    it('rotation', function () {
        const obj = ctx.scene.addChild();
        obj.rotateAxisAngleDeg([1, 0, 0], 45);

        expect(obj.transformLocal).to.be.deep.almost(
            new Float32Array([0.3826834559440613, 0, 0, 0.9238795042037964, 0, 0, 0, 0]),
            0.00001
        );

        obj.resetTransform();
        obj.rotate([0.283524, 0.340229, 0.850572, 0.283524]);
        expect(obj.transformLocal).to.be.deep.almost(
            new Float32Array([0.283524, 0.340229, 0.850572, 0.283524, 0, 0, 0, 0]),
            0.00001
        );

        expect(obj.transformLocal).to.be.deep.almost(
            new Float32Array([0.283524, 0.340229, 0.850572, 0.283524, 0, 0, 0, 0]),
            0.00001
        );
    });

    it('scaling', function () {
        const obj = ctx.scene.addChild();
        obj.scale([0.1, 0.2, 0.3]);
        expect(obj.scalingLocal).to.eql(new Float32Array([0.1, 0.2, 0.3]));
    });

    it('object component', function () {
        const obj = ctx.scene.addChild();
        obj.addComponent('light');
        obj.addComponent('light');
        expect(obj.getComponent('view', 0)).to.be.null;
        expect(obj.getComponent('light', 1)).to.not.be.null;
    });

    it('object components', function () {
        const obj = ctx.scene.addChild();
        obj.addComponent('light');
        obj.addComponent('light');

        const comps = obj.getComponents('light');
        const compA = obj.getComponent('light', 0);
        const compB = obj.getComponent('light', 1);
        expect(comps.length).to.equal(2);
        expect(comps[0]).to.equal(compA);
        expect(comps[1]).to.equal(compB);
    });

    it('object components without type', function () {
        const obj = ctx.scene.addChild();
        const compA = obj.addComponent('light');

        const comps = obj.getComponents();
        expect(comps.length).to.equal(1);
        expect(comps[0]).to.equal(compA);
    });

    it('parent', function () {
        const obj = ctx.scene.addChild();
        const objB = obj.addChild();

        expect(objB.parent?.objectId).to.equal(obj.objectId);

        objB.parent = null;
        expect(objB.parent).to.equal(null);

        obj.parent = objB;
        expect(obj.parent.objectId).to.equal(objB.objectId);
        expect(objB.children.length).to.equal(1);
        expect(objB.children[0].objectId).to.equal(obj.objectId);
    });

    it('.findByNameDirect()', function () {
        const NAME = 'target';
        const expected: Object3D[] = [];
        const parent = ctx.scene.addChild();

        expect(parent.findByNameDirect('toto')).to.eql([]);

        /* Add dummy objects */
        for (let i = 0; i < 32; ++i) {
            const obj = parent.addChild();
            obj.name = `target-${i}`;
        }

        /* No children with target name */
        expect(parent.findByNameDirect(NAME)).to.eql([]);

        /* Add a single child with the target name */
        {
            const obj = parent.addChild();
            obj.name = NAME;
            expected.push(obj);
        }
        expect(objectsToIds(parent.findByNameDirect(NAME))).to.eql(objectsToIds(expected));

        /* Add more dummy objects to ensure it works on sparsed data */
        {
            const obj = parent.addChild();
            obj.name = 'dummy';
        }
        const dummy = parent.addChild();
        dummy.name = 'hello';

        /* Ensure only direct descendants are accounted */
        {
            const obj = dummy.addChild();
            obj.name = NAME;
        }
        {
            const obj = expected[0].addChild();
            obj.name = NAME;
        }
        expect(objectsToIds(parent.findByNameDirect(NAME))).to.eql(objectsToIds(expected));

        /* Ensures targets count > half temporary works */
        const count = 140;
        WL.wasm.allocateTempMemory(256);
        for (let i = 0; i < count; ++i) {
            const obj = parent.addChild();
            obj.name = NAME;
            expected.push(obj);
            const dummy = parent.addChild();
            dummy.name = `dummy-${i}`;
        }
        expect(objectsToIds(parent.findByNameDirect(NAME))).to.eql(objectsToIds(expected));
    });

    it('.findByNameRecursive()', function () {
        const NAME = 'target';
        const expected: Object3D[] = [];
        const parent = ctx.scene.addChild();

        expect(parent.findByNameRecursive('toto')).to.eql([]);

        /* Add chain of dummies */
        let dummy = parent.addChild();
        for (let i = 0; i < 5; ++i) {
            const obj = dummy.addChild();
            obj.name = `target dummy-${i}`;
            dummy = obj;
        }

        expect(parent.findByNameRecursive(NAME)).to.eql([]);

        /* Ensure direct descendant are found */
        {
            const obj = parent.addChild();
            obj.name = NAME;
            expected.push(obj);
        }
        expect(objectsToIds(parent.findByNameRecursive(NAME))).to.eql(
            objectsToIds(expected)
        );

        /* Ensure deep objects are found */
        {
            const obj = dummy.addChild();
            obj.name = NAME;
            expected.push(obj);
        }
        expect(objectsToIds(parent.findByNameRecursive(NAME))).to.eql(
            objectsToIds(expected)
        );

        /* Ensures targets count > MAX_COUNT works */
        const child = parent.addChild();
        const count = 140;
        WL.wasm.allocateTempMemory(256);
        for (let i = 0; i < count; ++i) {
            const obj = child.addChild();
            obj.name = NAME;
            expected.push(obj);
            const dummy = child.addChild();
            dummy.name = `new-dummy-${i}`;
        }
        expect(objectsToIds(parent.findByNameRecursive(NAME))).to.eql(
            objectsToIds(expected)
        );
    });

    describe('Object3D.clone()', function () {
        it('scene graph structure and names', function () {
            /*
             * parent
             *     |-> child0
             *         |-> chilchild0
             *     |-> child1
             */
            const src = ctx.scene.addChild();
            src.name = 'parent';
            {
                const child = src.addChild();
                child.name = 'child0';
                const childchild = child.addChild();
                childchild.name = 'childchild0';
                const child1 = src.addChild();
                child1.name = 'child1';
            }

            const dst = src.clone();
            expect(dst.name).to.equal('parent');
            expect(dst.children).to.have.lengthOf(2);

            const child = dst.findByNameDirect('child0')[0];
            expect(child).to.not.be.undefined;
            expect(child.children).to.have.lengthOf(1);
            const childchild = child.findByNameDirect('childchild0')[0];
            expect(childchild).to.not.be.undefined;

            const child1 = dst.findByNameDirect('child1')[0];
            expect(child1).to.not.be.undefined;
            expect(child1.children).to.have.lengthOf(0);
        });

        it('clone into specific parent', function () {
            const src = ctx.scene.addChild();
            src.name = 'source';
            const child = src.addChild();
            child.name = 'child';

            const parent = ctx.scene.addChild();

            const clone = src.clone(parent);
            expect(clone.parent).to.equal(parent);
            expect(clone.name).to.equal('source');
            expect(clone.children).to.have.lengthOf(1);
            expect(clone.children[0].name).to.equal('child');
        });

        it('native components cloned', function () {
            /*
             * parent
             *     |-> child
             *         |-> child
             */
            const src = ctx.scene.addChild();
            const child = src.addChild();
            child.name = 'child';
            const childcomp = child.addComponent('light')!;
            childcomp.color = [0.1, 0.2, 0.3];

            const childchild = child.addChild();
            childchild.name = 'child';
            const childchildcomp = childchild.addComponent('light')!;
            childchildcomp.color = [0.4, 0.5, 0.6];

            const dst = src.clone();
            const dstChild = dst.findByNameDirect('child')[0];
            expect(dstChild).to.not.be.undefined;
            expect(dstChild.getComponent('light')?.color).to.deep.almost([0.1, 0.2, 0.3]);

            const dstChildChild = dstChild.findByNameDirect('child')[0];
            expect(dstChildChild).to.not.be.undefined;
            expect(dstChildChild.getComponent('light')?.color).to.deep.almost([
                0.4, 0.5, 0.6,
            ]);
        });

        it('clone source with several components multiple times', function () {
            const srcComponents = ['input', 'light', 'mesh', 'view'];
            const src = ctx.scene.addChild();
            for (const name of srcComponents) src.addComponent(name);

            for (let i = 0; i < 10; ++i) {
                const dst = src.clone();
                const components = dst
                    .getComponents()
                    .map((c) => (c.constructor as ComponentConstructor).TypeName)
                    .sort();
                expect(components).to.deep.equal(srcComponents);
            }
        });
    });

    describe('Object Transform', function () {
        it('(set|get)Translation(World|Local)', function () {
            // TODO: potentially add the rotation transformations from ApiTest.cpp?
            const parent = ctx.scene.addChild();
            const child = parent.addChild();

            const translationLocal = new Float32Array([3.0, -2.0, -1.0]);
            const translationWorld = new Float32Array([0.5, 1.0, 1.5]);
            const noTranslation = new Float32Array([0, 0, 0]);
            const out = new Float32Array(3);
            child.getPositionLocal(out);

            expect(out).to.eql(noTranslation);

            child.setPositionLocal(translationLocal);
            child.getPositionLocal(out);
            expect(out).to.eql(translationLocal);

            child.setPositionWorld(translationWorld);
            child.setDirty();
            child.getPositionWorld(out);
            expect(out).to.eql(translationWorld);

            child.resetPosition();
            child.getPositionWorld(out);
            expect(out).to.eql(noTranslation);
        });

        it('(set|get)Scaling(World|Local)', function () {
            const out = new Float32Array(3);
            const obj = ctx.scene.addChild();
            obj.setScalingLocal([3, 2, 1]);
            expect(obj.getScalingLocal(out)).to.eql(new Float32Array([3, 2, 1]));

            obj.setScalingLocal([1, 1, 1]);

            const parent = ctx.scene.addChild();
            obj.parent = parent;
            parent.setScalingLocal([2, 2, 2]);
            obj.setScalingWorld([1.5, 1.5, 1.5]);
            expect(obj.getScalingWorld(out)).to.eql(new Float32Array([1.5, 1.5, 1.5]));

            obj.destroy();
            parent.destroy();

            /* Deprecated accessors. */
            {
                const obj = ctx.scene.addChild();
                obj.scalingLocal = [3, 2, 1];
                obj.scalingLocal[0] = 1.5;
                expect(obj.scalingLocal).to.eql(new Float32Array([1.5, 2, 1]));

                obj.scalingLocal = [1, 1, 1];
                obj.scalingWorld = [3, 2, 1];
                obj.scalingWorld[0] = 1.5;
                expect(obj.scalingWorld).to.eql(new Float32Array([1.5, 2, 1]));
            }
        });

        it('(set|get)Rotation(World|Local)', function () {
            const out = new Float32Array(4);
            const obj = ctx.scene.addChild();

            obj.setRotationLocal([0, 1, 0, 1]);
            expect(obj.getRotationLocal(out)).to.eql(new Float32Array([0, 1, 0, 1]));

            const parent = ctx.scene.addChild();
            obj.parent = parent;
            parent.setRotationWorld([1, 0, 0, 1]);

            expect(obj.getRotationWorld(out)).to.eql(
                new Float32Array([
                    0.7071067690849304, 0.7071067690849304, 0.7071067690849304,
                    0.7071067690849304,
                ])
            );
        });

        it('(set|get)Transform(World|Local)', function () {
            const out = new Float32Array(8);
            const obj = ctx.scene.addChild();

            expect(obj.getTransformLocal(out)).to.eql(
                new Float32Array([0, 0, 0, 1, 0, 0, 0, 0])
            );
            obj.setTransformLocal([0, 0, 0, 0, 0, 0, 0, 0]);
            expect(obj.getTransformLocal(out)).to.eql(
                new Float32Array([0, 0, 0, 0, 0, 0, 0, 0])
            );

            obj.resetTransform();

            const parent = ctx.scene.addChild();
            obj.parent = parent;

            expect(obj.getTransformWorld()).to.eql(
                new Float32Array([0, 0, 0, 1, 0, 0, 0, 0])
            );

            parent.setTransformLocal([0, 0, 0, 1, 1, 0, 0, 0]);
            obj.setTransformWorld([0, 0, 0, 0, 0, 0, 0, 1]);
            expect(obj.getTransformWorld(out)).to.eql(
                new Float32Array([0, 0, 0, 0, 0, 0, 0, 1])
            );

            obj.destroy();
            parent.destroy();

            /* Deprecated accessors. */

            {
                const obj = ctx.scene.addChild();
                expect(obj.transformLocal).to.eql(
                    new Float32Array([0, 0, 0, 1, 0, 0, 0, 0])
                );
                obj.transformLocal = [0, 0, 0, 0, 0, 0, 0, 0];
                expect(obj.transformLocal).to.eql(
                    new Float32Array([0, 0, 0, 0, 0, 0, 0, 0])
                );
            }
            {
                const obj = ctx.scene.addChild();
                expect(obj.transformWorld).to.eql(
                    new Float32Array([0, 0, 0, 1, 0, 0, 0, 0])
                );
                obj.transformWorld = [0, 0, 0, 0, 0, 0, 0, 1];
                expect(obj.transformWorld).to.eql(
                    new Float32Array([0, 0, 0, 0, 0, 0, 0, 1])
                );
            }
        });

        it('getForwardWorld', function () {
            const out = new Float32Array(3);
            const obj = ctx.scene.addChild();
            expect(obj.getForwardWorld(out)).to.deep.almost([0, 0, -1]);
            obj.rotateAxisAngleRad([0, 1, 0], Math.PI);
            expect(obj.getForwardWorld(out)).to.deep.almost([0, 0, 1]);
        });

        it('getUpWorld', function () {
            const out = new Float32Array(3);
            const obj = ctx.scene.addChild();
            expect(obj.getUpWorld(out)).to.eql(new Float32Array([0, 1, 0]));
            obj.rotateAxisAngleRad([0, 1, 0], Math.PI);
            expect(obj.getUpWorld(out)).to.deep.almost([0, 1, 0]);
            obj.rotateAxisAngleRad([1, 0, 0], Math.PI);
            expect(obj.getUpWorld(out)).to.deep.almost([0, -1, 0]);
        });

        it('getRightWorld', function () {
            const out = new Float32Array(3);
            const obj = ctx.scene.addChild();
            expect(obj.getRightWorld(out)).to.deep.almost([1, 0, 0]);
            obj.rotateAxisAngleRad([0, 1, 0], Math.PI);
            expect(obj.getRightWorld(out)).to.deep.almost([-1, 0, 0]);
        });

        it('translation', function () {
            const parent = ctx.scene.addChild();
            const child = parent.addChild();
            const out = new Float32Array(3);

            child.translate([1, 2, 3]);
            child.getPositionWorld(out);
            expect(out).to.eql(new Float32Array([1, 2, 3]));

            child.resetPosition();
            child.translateObject([1.0, 2.0, 3.0]);
            child.getPositionWorld(out);
            expect(out).to.eql(new Float32Array([1, 2, 3]));

            child.resetPosition();
            child.translateWorld([3.0, 2.0, 1.0]);
            child.getPositionWorld(out);
            expect(out).to.eql(new Float32Array([3.0, 2.0, 1.0]));
        });

        it('scaling', function () {
            const parent = ctx.scene.addChild();
            const child = parent.addChild();
            const out = new Float32Array(3);

            out.set(child.scalingLocal);
            expect(out).to.eql(new Float32Array([1, 1, 1]));
            out.set(child.scalingWorld);
            expect(out).to.eql(new Float32Array([1, 1, 1]));

            child.scalingLocal = [0.5, 0.5, 0.5];
            out.set(child.scalingLocal);
            expect(out).to.eql(new Float32Array([0.5, 0.5, 0.5]));
            out.set(child.scalingWorld);
            expect(out).to.eql(new Float32Array([0.5, 0.5, 0.5]));

            child.resetScaling();
            child.scalingWorld = [0.25, 0.25, 0.25];
            out.set(child.scalingWorld);
            expect(out).to.eql(new Float32Array([0.25, 0.25, 0.25]));
        });

        it('look at', function () {
            const parent = ctx.scene.addChild();
            const child = parent.addChild();
            const out = new Float32Array(3);

            child.lookAt([0.0, 0.0, 1.0], [0, 1, 0]);
            child.getPositionWorld(out);
            expect(out).to.eql(new Float32Array([0, 0, 0]));
        });
    });
});

describeScene(
    'Object3D.destroy() with graph changes during Component.onDestroy()',
    function (ctx) {
        /* The following tests perform scene graph modification during `onDestroy()`.
         *
         * Before 1.2.0, the engine had no safety mechanism to prevent double-free. It should
         * now be possibly to modify the scene graph in a callback, while another
         * object/component is getting destroyed. */

        class DestroyTarget extends Component {
            static TypeName = 'destroy-target';
            static Properties = {
                target: Property.object(),
            };
            target: Object3D = null!;
            before: string[] = [];
            after: string[] = [];
            isObjectDestroyed = false;
            onDestroy(): void {
                this.before = this._flatten();
                if (!this.target.isDestroyed) {
                    this.target.destroy();
                }
                this.isObjectDestroyed = this.object.isDestroyed;
                this.after = this._flatten();
            }

            private _flatten() {
                let curr: Object3D | undefined = undefined;
                const stack: Object3D[] = [this.scene.wrap(0)];
                const result: string[] = [];
                while (stack.length) {
                    curr = stack.shift()!;
                    const children = curr.children;
                    stack.push(...children);
                    if (!curr._localId) continue;
                    result.push(curr.name);
                }
                return result;
            }
        }

        beforeEach(function () {
            WL.registerComponent(DestroyTarget);
        });

        it('destroy first sibiling', function () {
            for (let i = 0; i < 2; ++i) {
                const msg = `iteration ${i}`;
                ['first', 'second', 'third'].forEach((n) => {
                    const obj = ctx.scene.addObject();
                    obj.name = n;
                });
                const destroy = ctx.scene.children[1];
                const comp = destroy.addComponent(DestroyTarget, {
                    target: ctx.scene.children[0],
                });

                destroy.destroy();
                expect(ctx.scene.children).have.lengthOf(1, msg);
                expect(comp.before).to.eql(['first', 'second', 'third'], msg);
                expect(comp.after).to.eql(['second', 'third'], msg);

                ctx.scene.children.forEach((c) => c.destroy());
            }
        });
        it('destroy last sibiling', function () {
            for (let i = 0; i < 2; ++i) {
                const msg = `iteration ${i}`;
                ['first', 'second', 'third'].forEach((n) => {
                    const obj = ctx.scene.addObject();
                    obj.name = n;
                });
                const destroy = ctx.scene.children[1];
                const comp = destroy.addComponent(DestroyTarget, {
                    target: ctx.scene.children[2],
                });

                /* -> 'second' pending destroy
                 * -> comp.onDestroy()
                 * -> 'third' pending destroy
                 * -> destruction of 'second' and 'third' occurs */
                destroy.destroy();
                expect(ctx.scene.children).have.lengthOf(1, msg);
                expect(comp.before).to.eql(['first', 'second', 'third'], msg);
                expect(comp.after).to.eql(['first', 'second'], msg);

                ctx.scene.children.forEach((c) => c.destroy());
            }
        });

        it('add siblings', function () {
            class Test extends Component {
                static TypeName = 'test';
                onDestroy() {
                    const first = ctx.scene.addObject();
                    first.name = 'first';
                    const dummy = ctx.scene.addObject();
                    dummy.name = 'dummy';
                    dummy.destroy();
                    const last = ctx.scene.addObject();
                    last.name = 'last';
                }
            }
            WL.registerComponent(Test);
            const [_, parent] = createHierarchy(ctx.scene);
            parent.addComponent(Test);
            parent.destroy();
            expect(ctx.scene.children.map((c) => c.name).sort()).to.eql([
                'first',
                'grandparent',
                'last',
            ]);
        });

        it('implicit grandparent destruction', function () {
            for (let i = 0; i < 2; ++i) {
                const hierarchy = createHierarchy(ctx.scene);
                const [grandparent, parent] = hierarchy;

                const comp = hierarchy[i + 1].addComponent(DestroyTarget);
                comp.target = grandparent;
                parent.destroy();
                expect(ctx.scene.children).to.have.lengthOf(0, `iteration ${i}`);
                expect(comp.before).to.eql(
                    ['grandparent', 'parent', 'child'],
                    `iteration ${i}`
                );
                expect(comp.after).to.eql([], `iteration ${i}`);
                expect(comp.isObjectDestroyed).to.be.true;
            }
        });
        it('implicit child destruction', function () {
            for (let i = 0; i < 2; ++i) {
                const hierarchy = createHierarchy(ctx.scene);
                const [_, parent, child] = hierarchy;

                const comp = hierarchy[i + 1].addComponent(DestroyTarget);
                comp.target = child;
                parent.destroy();
                expect(ctx.scene.children).to.have.lengthOf(1, `iteration ${i}`);
                expect(comp.before).to.eql(
                    ['grandparent', 'parent', 'child'],
                    `iteration ${i}`
                );
                expect(comp.after).to.eql(
                    ['grandparent', 'parent', 'child'],
                    `iteration ${i}`
                );
                expect(comp.isObjectDestroyed).to.be.false;

                ctx.scene.children.forEach((c) => c.destroy());
            }
        });

        it('circular destroy with two distinct objects', function () {
            const comps = ['a', 'b'].map((n) => {
                const obj = ctx.scene.addObject();
                obj.name = n;
                return obj.addComponent(DestroyTarget);
            });
            const [compA, compB] = comps;
            compA.target = compB.object;
            compB.target = compA.object;

            /* -> a pending destroy
             * -> compa.onDestroy()
             * -> b pending destroy
             * -> compB.onDestroy()
             * -> destruction of 'a' and 'b' occurs */
            compA.object.destroy();
            expect(ctx.scene.children).to.have.lengthOf(0);
            expect(compA.before).to.eql(['a', 'b']);
            expect(compA.after).to.eql(['a']);
            expect(compB.before).to.eql(['a', 'b']);
            expect(compB.after).to.eql(['a', 'b']);
        });
        it('circular destroy with same object', function () {
            const a = ctx.scene.addObject();
            a.name = 'a';
            const b = ctx.scene.addObject();
            b.name = 'b';
            const compA = a.addComponent(DestroyTarget);
            compA.target = a;
            const compB = a.addComponent(DestroyTarget);
            compB.target = a;

            /* -> a pending destroy
             * -> compA.onDestroy()
             * -> compB.onDestroy() */
            a.destroy();
            const expected = ['a', 'b'];
            expect(compA.before).to.eql(expected);
            expect(compA.after).to.eql(expected);
            expect(compB.before).to.eql(expected);
            expect(compB.after).to.eql(expected);
        });

        it('remove components', function () {
            class Test extends Component {
                static TypeName = 'test';
                before: string[] = [];
                after: string[] = [];
                onDestroy() {
                    const components = this.object.getComponents();
                    this.before = components.map((c) => c.type).sort();
                    components[0].destroy();
                    components[2].destroy();
                    this.after = this.object
                        .getComponents()
                        .map((c) => c.type)
                        .sort();
                }
            }
            WL.registerComponent(Test);

            const [grandparent, parent] = createHierarchy(ctx.scene);
            const components = ['animation', 'input', 'mesh', 'view'];
            components.forEach((c) => parent.addComponent(c));
            const comp = parent.addComponent(Test);

            grandparent.destroy();
            expect(comp.before).to.eql(['animation', 'input', 'mesh', 'view']);
            expect(comp.after).to.eql(['input', 'view']);
        });

        abstract class Thrower extends Component {
            static TypeName = 'thrower';
            error: string | null = null;
            abstract doDestroy(): void;
            onDestroy(): void {
                try {
                    this.doDestroy();
                } catch (e: any) {
                    this.error = e?.message ?? null;
                }
            }
        }
        it('reparent from/to object marked as destroyed should throw', function () {
            class ReparentThrower extends Thrower {
                error: string | null = null;
                child!: Object3D;
                parent!: Object3D;
                doDestroy(): void {
                    this.child.parent = this.parent;
                }
            }
            WL.registerComponent(ReparentThrower);

            for (let i = 0; i < 2; ++i) {
                const parent = ctx.scene.addObject();
                parent.name = 'parent';
                const child = ctx.scene.addObject();
                child.name = 'child';

                const toDestroy = i === 0 ? child : parent;
                const comp = toDestroy.addComponent(ReparentThrower);
                comp.child = child;
                comp.parent = parent;

                /* Stringify before destruction since id/name will not be available after */
                const parentStr = parent.toString();
                const childStr = child.toString();
                const destroyStr = toDestroy.toString();
                toDestroy.destroy();
                expect(ctx.scene.children).to.have.lengthOf(1);
                expect(comp.error).to.equal(
                    `Failed to attach ${childStr} to ${parentStr}. ${destroyStr} is marked as destroyed.`
                );
                ctx.scene.children.forEach((c) => c.destroy());
            }
        });
        it('.addComponent() should throw', function () {
            class AddComponentThrower extends Thrower {
                doDestroy(): void {
                    this.object.addComponent('collision');
                }
            }
            WL.registerComponent(AddComponentThrower);
            for (let i = 0; i < 3; ++i) {
                const hierarchy = createHierarchy(ctx.scene);
                const comp = hierarchy[i].addComponent(AddComponentThrower);
                const str = hierarchy[i].toString();
                hierarchy[0].destroy();
                expect(comp.error).to.equal(
                    `Failed to add component. ${str} is marked as destroyed.`
                );
                ctx.scene.children.forEach((c) => c.destroy());
            }
        });
        it('addObject() to object marked as destroyed should throw', function () {
            class AddObjectThrower extends Thrower {
                doDestroy(): void {
                    this.scene.addObject(this.object);
                }
            }
            WL.registerComponent(AddObjectThrower);
            for (let i = 0; i < 3; ++i) {
                const hierarchy = createHierarchy(ctx.scene);
                const comp = hierarchy[i].addComponent(AddObjectThrower);
                const str = hierarchy[i].toString();
                hierarchy[0].destroy();
                expect(comp.error).to.equal(
                    `Failed to add object. ${str} is marked as destroyed.`
                );
                ctx.scene.children.forEach((c) => c.destroy());
            }
        });
        it('destroy scene should throw', function () {
            class SceneThrower extends Thrower {
                doDestroy() {
                    this.scene.destroy();
                }
            }
            WL.registerComponent(SceneThrower);

            const scene = WL._createEmpty();
            const first = scene.addObject();
            const toDestroy = scene.addObject(first);

            const comp = toDestroy.addComponent(SceneThrower);
            toDestroy.destroy();
            expect(comp.error).to.equal(
                "It's forbidden to destroy a scene from onDestroy()."
            );
            expect(first.isDestroyed).to.be.false;
            expect(toDestroy.isDestroyed).to.be.true;
        });
    }
);

describe('Object3D Legacy', function () {
    it('constructor', function () {
        const obj = new Object3D(WL, 0);
        expect(obj._id).to.equal(WL.scene.wrap(0)._id);

        const nextScene = WL._createEmpty();
        WL.switchTo(nextScene);
        const obj2 = new Object3D(WL, 0);
        expect(obj2._id).to.not.equal(obj._id);
        expect(obj2._id).to.equal(WL.scene.wrap(0)._id);
    });

    it('Scene.addObject()', function () {
        const parent = WL.scene.addObject();
        parent.name = 'parent';
        const child = WL.scene.addObject(parent);
        child.name = 'child';

        expect(parent.parent).to.equal(null);
        expect(parent.name).to.equal('parent');
        expect(child.parent?._id).to.equal(parent._id);
        expect(child.name).to.equal('child');
    });
});
