import {expect, use} from '@esm-bundle/chai';
import {chaiAlmost} from './chai/almost.js';

import {init, reset, WL} from './setup.js';
import {Object3D} from '..';

before(init);
beforeEach(reset);

use(chaiAlmost());

/**
 * Comparator to use when sorting on an array of `Object3D`.
 *
 * @param a The first object to compare.
 * @param b The second object to compare.
 */
function objectSort(a: Object3D, b: Object3D) {
    return a.objectId - b.objectId;
}

function objectsToIds(objects: Object3D[]): number[] {
    return objects.map((o) => o.objectId).sort();
}

describe('Object', function () {
    it('get and set name', function () {
        const obj = WL.scene.addObject();
        obj.name = 'Object1';
        expect(obj.name).to.equal('Object1');

        /* Test with a second object to ensure no clash occurs. */
        const obj2 = WL.scene.addObject();
        obj2.name = 'Object2';
        expect(obj.name).to.equal('Object1');
        expect(obj2.name).to.equal('Object2');
    });

    it('equals', function () {
        const obj1 = WL.scene.addObject();
        const obj2 = WL.scene.addObject();
        const obj3 = WL.wrapObject(obj1.objectId);
        expect(obj1.equals(null)).to.be.false;
        expect(obj1.equals(undefined)).to.be.false;
        expect(obj1.equals(obj1)).to.be.true;
        expect(obj1.equals(obj2)).to.be.false;
        expect(obj2.equals(obj1)).to.be.false;
        expect(obj1.equals(obj3)).to.be.true;
        expect(obj3.equals(obj1)).to.be.true;
    });

    it('get changed', function () {
        /* @TODO Test unchanged state once it can be replicated in tests */
        const x = WL.scene.addObject();
        const a = WL.scene.addObject(x);
        const b = WL.scene.addObject(a);

        expect(x.changed).to.be.false;
        expect(a.changed).to.be.true;
        expect(b.changed).to.be.true;
    });

    it('.destroy() without prototype destruction', function () {
        const x = WL.scene.addObject();
        const a = WL.scene.addObject(x);
        const b = WL.scene.addObject(x);
        WL.scene.addObject(a);

        a.destroy();

        expect(a.objectId).to.equal(-1);
        expect(x.children.length).to.equal(1);
        expect(x.children[0].equals(b)).to.be.true;
        expect(a.isDestroyed).to.be.true;
    });

    it('.destroy() with prototype destruction', function () {
        WL.erasePrototypeOnDestroy = true;

        const a = WL.scene.addObject();
        const b = WL.scene.addObject();
        const bId = b.objectId;

        a.destroy();
        expect(() => a.translateLocal([1, 1, 1])).to.throw(
            `Canno't read 'translateLocal' of destroyed object`
        );
        expect(() => (a.active = false)).to.throw(
            `Canno't write 'active' of destroyed object`
        );
        expect(() => ((a as Record<string, any>).test = 5)).to.throw(
            `Canno't write 'test' of destroyed object`
        );

        /* Ensure destroying `a` didn't destroy `b` as well */
        expect(b.objectId).to.equal(bId);
    });

    it('(set|get)Position(World|Local)', function () {
        const obj = WL.scene.addObject();
        const objB = WL.scene.addObject(obj);
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
        const obj = WL.scene.addObject();
        obj.resetTransform();
        expect(obj.transformLocal).to.eql(new Float32Array([0, 0, 0, 1, 0, 0, 0, 0]));
    });

    it('translate', function () {
        const obj = WL.scene.addObject();
        obj.translate([1, 2, 3]);
        expect(obj.transformLocal).to.eql(new Float32Array([0, 0, 0, 1, 0.5, 1, 1.5, 0]));
    });

    it('rotation', function () {
        const obj = WL.scene.addObject();
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
        const obj = WL.scene.addObject();
        obj.scale([0.1, 0.2, 0.3]);
        expect(obj.scalingLocal).to.eql(new Float32Array([0.1, 0.2, 0.3]));
    });

    it('object component', function () {
        const obj = WL.scene.addObject();
        obj.addComponent('light');
        obj.addComponent('light');
        expect(obj.getComponent('view', 0)).to.be.null;
        expect(obj.getComponent('light', 1)).to.not.be.null;
    });

    it('object components', function () {
        const obj = WL.scene.addObject();
        obj.addComponent('light');
        obj.addComponent('light');

        const comps = obj.getComponents('light');
        const compA = obj.getComponent('light', 0);
        const compB = obj.getComponent('light', 1);
        expect(comps.length).to.equal(2);
        expect(comps[0].equals(compA)).to.be.true;
        expect(comps[1].equals(compB)).to.be.true;
    });

    it('object components without type', function () {
        const obj = WL.scene.addObject();
        const compA = obj.addComponent('light');

        const comps = obj.getComponents();
        expect(comps.length).to.equal(1);
        expect(comps[0].equals(compA)).to.be.true;
    });

    it('parent', function () {
        const obj = WL.scene.addObject();
        const objB = WL.scene.addObject(obj);

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
        const parent = WL.scene.addObject();

        expect(parent.findByNameDirect('toto')).to.eql([]);

        /* Add dummy objects */
        for (let i = 0; i < 32; ++i) {
            const obj = WL.scene.addObject(parent);
            obj.name = `target-${i}`;
        }

        /* No children with target name */
        expect(parent.findByNameDirect(NAME)).to.eql([]);

        /* Add a single child with the target name */
        expected.push(WL.scene.addObject(parent));
        expected[0].name = NAME;
        expect(parent.findByNameDirect(NAME)).to.eql(expected);

        /* Add more dummy objects to ensure it works on sparsed data */
        const d = WL.scene.addObject(parent);
        d.name = 'dummy';
        const dummy = WL.scene.addObject(parent);
        dummy.name = 'hello';

        /* Ensure only direct descendants are accounted */
        const childA = WL.scene.addObject(dummy);
        childA.name = NAME;
        const childB = WL.scene.addObject(expected[0]);
        childB.name = NAME;
        expect(parent.findByNameDirect(NAME)).to.eql(expected);

        /* Ensures targets count > half temporary works */
        const count = 140;
        WL.wasm.allocateTempMemory(256);
        for (let i = 0; i < count; ++i) {
            const obj = WL.scene.addObject(parent);
            obj.name = NAME;
            expected.push(obj);
            const dummy = WL.scene.addObject(parent);
            dummy.name = `dummy-${i}`;
        }
        expect(objectsToIds(parent.findByNameDirect(NAME))).to.eql(objectsToIds(expected));
    });

    it('.findByNameRecursive()', function () {
        const NAME = 'target';
        const expected: Object3D[] = [];
        const parent = WL.scene.addObject();

        expect(parent.findByNameRecursive('toto')).to.eql([]);

        /* Add chain of dummies */
        let dummy = WL.scene.addObject(parent);
        for (let i = 0; i < 5; ++i) {
            const obj = WL.scene.addObject(dummy);
            obj.name = `target dummy-${i}`;
            dummy = obj;
        }

        expect(parent.findByNameRecursive(NAME)).to.eql([]);

        /* Ensure direct descendant are found */
        expected.push(WL.scene.addObject(parent));
        expected[0].name = NAME;
        expect(parent.findByNameRecursive(NAME)).to.eql(expected);

        /* Ensure deep objects are found */
        expected.push(WL.scene.addObject(dummy));
        expected[1].name = NAME;
        expect(parent.findByNameRecursive(NAME).sort(objectSort)).to.eql(
            expected.sort(objectSort)
        );

        /* Ensures targets count > MAX_COUNT works */
        const child = WL.scene.addObject(parent);
        const count = 140;
        WL.wasm.allocateTempMemory(256);
        for (let i = 0; i < count; ++i) {
            const obj = WL.scene.addObject(child);
            obj.name = NAME;
            expected.push(obj);
            const dummy = WL.scene.addObject(child);
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
            const src = WL.scene.addObject();
            src.name = 'parent';
            {
                const child = WL.scene.addObject(src);
                child.name = 'child0';
                const childchild = WL.scene.addObject(child);
                childchild.name = 'childchild0';
                const child1 = WL.scene.addObject(src);
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
            const src = WL.scene.addObject();
            src.name = 'source';
            const child = WL.scene.addObject(src);
            child.name = 'child';

            const parent = WL.scene.addObject();

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
            const src = WL.scene.addObject();
            const child = WL.scene.addObject(src);
            child.name = 'child';
            const childcomp = child.addComponent('light')!;
            childcomp.color = [0.1, 0.2, 0.3];

            const childchild = WL.scene.addObject(child);
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
    });

    describe('Object Transform', function () {
        it('(set|get)Translation(World|Local)', function () {
            // TODO: potentially add the rotation transformations from ApiTest.cpp?
            const parent = WL.scene.addObject();
            const child = WL.scene.addObject(parent);

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
            const obj = WL.scene.addObject();
            obj.setScalingLocal([3, 2, 1]);
            expect(obj.getScalingLocal(out)).to.eql(new Float32Array([3, 2, 1]));

            obj.setScalingLocal([1, 1, 1]);

            const parent = WL.scene.addObject();
            obj.parent = parent;
            parent.setScalingLocal([2, 2, 2]);
            obj.setScalingWorld([1.5, 1.5, 1.5]);
            expect(obj.getScalingWorld(out)).to.eql(new Float32Array([1.5, 1.5, 1.5]));

            obj.destroy();
            parent.destroy();

            /* Deprecated accessors. */
            {
                const obj = WL.scene.addObject();
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
            const obj = WL.scene.addObject();

            obj.setRotationLocal([0, 1, 0, 1]);
            expect(obj.getRotationLocal(out)).to.eql(new Float32Array([0, 1, 0, 1]));

            const parent = WL.scene.addObject();
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
            const obj = WL.scene.addObject();

            expect(obj.getTransformLocal(out)).to.eql(
                new Float32Array([0, 0, 0, 1, 0, 0, 0, 0])
            );
            obj.setTransformLocal([0, 0, 0, 0, 0, 0, 0, 0]);
            expect(obj.getTransformLocal(out)).to.eql(
                new Float32Array([0, 0, 0, 0, 0, 0, 0, 0])
            );

            obj.resetTransform();

            const parent = WL.scene.addObject();
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
                const obj = WL.scene.addObject();
                expect(obj.transformLocal).to.eql(
                    new Float32Array([0, 0, 0, 1, 0, 0, 0, 0])
                );
                obj.transformLocal = [0, 0, 0, 0, 0, 0, 0, 0];
                expect(obj.transformLocal).to.eql(
                    new Float32Array([0, 0, 0, 0, 0, 0, 0, 0])
                );
            }
            {
                const obj = WL.scene.addObject();
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
            const obj = WL.scene.addObject();
            expect(obj.getForwardWorld(out)).to.deep.almost([0, 0, -1]);
            obj.rotateAxisAngleRad([0, 1, 0], Math.PI);
            expect(obj.getForwardWorld(out)).to.deep.almost([0, 0, 1]);
        });

        it('getUpWorld', function () {
            const out = new Float32Array(3);
            const obj = WL.scene.addObject();
            expect(obj.getUpWorld(out)).to.eql(new Float32Array([0, 1, 0]));
            obj.rotateAxisAngleRad([0, 1, 0], Math.PI);
            expect(obj.getUpWorld(out)).to.deep.almost([0, 1, 0]);
            obj.rotateAxisAngleRad([1, 0, 0], Math.PI);
            expect(obj.getUpWorld(out)).to.deep.almost([0, -1, 0]);
        });

        it('getRightWorld', function () {
            const out = new Float32Array(3);
            const obj = WL.scene.addObject();
            expect(obj.getRightWorld(out)).to.deep.almost([1, 0, 0]);
            obj.rotateAxisAngleRad([0, 1, 0], Math.PI);
            expect(obj.getRightWorld(out)).to.deep.almost([-1, 0, 0]);
        });

        it('translation', function () {
            const parent = WL.scene.addObject();
            const child = WL.scene.addObject(parent);
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
            const parent = WL.scene.addObject();
            const child = WL.scene.addObject(parent);
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
            const parent = WL.scene.addObject();
            const child = WL.scene.addObject(parent);
            const out = new Float32Array(3);

            child.lookAt([0.0, 0.0, 1.0], [0, 1, 0]);
            child.getPositionWorld(out);
            expect(out).to.eql(new Float32Array([0, 0, 0]));
        });
    });
});
