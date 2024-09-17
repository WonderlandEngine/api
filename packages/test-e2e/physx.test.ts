import {expect, use} from '@esm-bundle/chai';
import {chaiAlmost} from './chai/almost.js';

import {
    PhysXComponent,
    Shape,
    ForceMode,
    CollisionEventType,
    LockAxis,
    Scene,
    Component,
} from '@wonderlandengine/api';

import {describeScene, init, reset, WL} from './setup.js';

use(chaiAlmost());

before(init.bind(null, {physx: true}));

describeScene('PhysX Component', function (ctx) {
    it('addComponent', function () {
        const object = ctx.scene.addObject();

        object.name = 'testobj';
        const obj = object;

        const physx = obj.addComponent('physx')!;
        expect(physx._localId).to.equal(0);
        expect(physx instanceof PhysXComponent).to.equal(true);
    });

    it('physxComponent', function () {
        const objA = ctx.scene.addObject();
        const objB = ctx.scene.addObject();

        objA.setTranslationWorld([0, 0, -10]);
        objB.setTranslationWorld([1, 1, -10]);

        /* Falling cube */
        const compA = objA.addComponent('physx', {
            shape: Shape.Box,
            mass: 1,
        });

        /* Static ground plane */
        const compB = objB.addComponent('physx', {
            static: true,
            shape: Shape.Plane,
        })!;

        WL.wasm._wl_nextUpdate(0.01);

        /* Test getters */
        const pA = objA.getComponent('physx', 0)!;
        expect(pA.static).to.equal(false);
        expect(pA.shape).to.equal(Shape.Box);

        const pB = objB.getComponent('physx', 0)!;
        expect(compB.static).to.equal(true);
        expect(compB.shape).to.equal(Shape.Plane);

        pA.linearVelocity = [0, 1, 2];
        expect(pA.linearVelocity).to.deep.almost([0, 1, 2]);

        pA.angularVelocity = [0, 2, 4];
        expect(pA.angularVelocity).to.deep.almost([0, 2, 4]);

        pA.mass = 0.1;
        expect(pA.mass).to.be.closeTo(0.1, 0.000001);

        pA.addForce([1, 0, 0]);
        pA.addForce([1, 0, 0], ForceMode.Impulse);
        pA.addForce([1, 0, 0], ForceMode.Impulse, true);
        pA.addForce([1, 0, 0], ForceMode.Impulse, true, [0, 1, 0]);
        pA.addForce([1, 0, 0], ForceMode.Impulse, false, [0, 1, 0]);
        pA.addForce([1, 0, 0], ForceMode.Impulse, true, [0, 1, 0], true);
        pA.addForce([1, 0, 0], ForceMode.Impulse, false, [0, 1, 0], true);

        pA.addTorque([1, 0, 0]);
    });

    it('collisionShape', function () {
        const objA = ctx.scene.addObject();
        const objB = ctx.scene.addObject();

        objA.setTranslationWorld([0, 0, -10]);
        objB.setTranslationWorld([1, 1, -10]);

        WL.wasm._wl_nextUpdate(0.01);

        /* Add a physx component */
        const compA = objA.addComponent('physx')!;

        compA.shape = Shape.Plane;
        compA.extents = [1.0, 2.0, 3.0];

        compA.staticFriction = 0.1;
        compA.dynamicFriction = 0.2;
        compA.bounciness = 0.3;
        compA.linearDamping = 0.4;
        compA.angularDamping = 0.5;

        expect(compA.static).to.equal(false);

        expect(compA.extents).to.deep.almost([1.0, 2.0, 3.0]);
        expect(compA.shape).to.equal(Shape.Plane);
        expect(compA.staticFriction).to.almost(0.1);
        expect(compA.dynamicFriction).to.almost(0.2);
        expect(compA.bounciness).to.almost(0.3);
        expect(compA.linearDamping).to.almost(0.4);
        expect(compA.angularDamping).to.almost(0.5);

        const compB = objB.addComponent('physx')!;
        compB.static = false;
        compB.kinematic = true;
        compB.extents = [3.0, 1.0, 2.0];
        compB.shape = Shape.Box;
        compB.staticFriction = 1.1;
        compB.dynamicFriction = 1.2;
        compB.bounciness = 1.3;
        compB.linearDamping = 1.4;
        compB.angularDamping = 1.5;

        /* Clone physx component */
        const p2 = objB.addComponent('physx', compB)!;

        expect(p2.extents).to.deep.almost([3.0, 1.0, 2.0]);
        expect(p2.static).to.equal(false);
        expect(p2.kinematic).to.equal(true);
        expect(p2.shape).to.equal(Shape.Box);
        expect(p2.staticFriction).to.almost(1.1);
        expect(p2.dynamicFriction).to.almost(1.2);
        expect(p2.bounciness).to.almost(1.3);
        expect(p2.linearDamping).to.almost(1.4);
        expect(p2.angularDamping).to.almost(1.5);
    });

    it('get/set offsetTranslation', function () {
        const obj = ctx.scene.addObject();
        const comp = obj.addComponent('physx', {shape: Shape.Box})!;
        expect(comp.translationOffset).to.deep.almost([0, 0, 0]);
        comp.translationOffset = [1, 2, 3];
        expect(comp.translationOffset).to.deep.almost([1, 2, 3]);
    });

    it('get/set offsetRotation', function () {
        const obj = ctx.scene.addObject();
        const comp = obj.addComponent('physx', {shape: Shape.Box})!;
        expect(comp.rotationOffset).to.deep.almost([0, 0, 0, 1]);
        comp.rotationOffset = [1, 0, 0, 1];
        expect(comp.rotationOffset).to.deep.almost([0.707, 0, 0, 0.707], 0.01);
    });

    it('get/set linearVelocity', function () {
        const obj = ctx.scene.addObject();
        const comp = obj.addComponent('physx', {shape: Shape.Box, active: true})!;
        expect(comp.linearVelocity).to.deep.almost([0, 0, 0]);
        expect(comp.getLinearVelocity()).to.deep.almost([0, 0, 0]);

        comp.linearVelocity = [1, 2, 3];
        expect(comp.linearVelocity).to.deep.almost([1, 2, 3]);
        expect(comp.getLinearVelocity()).to.deep.almost([1, 2, 3]);

        comp.active = false;
        expect(comp.linearVelocity).to.deep.almost([0, 0, 0]);
    });

    it('get/set angularVelocity', function () {
        const obj = ctx.scene.addObject();
        const comp = obj.addComponent('physx', {shape: Shape.Box, active: true})!;
        expect(comp.angularVelocity).to.deep.almost([0, 0, 0]);
        expect(comp.getAngularVelocity()).to.deep.almost([0, 0, 0]);

        comp.angularVelocity = [1, 2, 3];
        expect(comp.angularVelocity).to.deep.almost([1, 2, 3]);
        expect(comp.getAngularVelocity()).to.deep.almost([1, 2, 3]);

        comp.active = false;
        expect(comp.angularVelocity).to.deep.almost([0, 0, 0]);
    });

    it('get/set sleepOnActivate', function () {
        const obj = ctx.scene.addObject();
        {
            const comp = obj.addComponent('physx', {shape: Shape.Box, active: false})!;
            expect(comp.sleepOnActivate).to.be.false;
            comp.sleepOnActivate = true;
            expect(comp.sleepOnActivate).to.be.true;
        }
        const comp = obj.addComponent('physx', {
            shape: Shape.Box,
            sleepOnActivate: true,
            active: false,
        })!;
        expect(comp.sleepOnActivate).to.be.true;
    });

    describe('Flags', function () {
        it('static', function () {
            const obj = ctx.scene.addObject();
            const comp = obj.addComponent('physx')!;
            expect(comp.static).to.be.false;
            /* Must deactivate to change the static flag */
            comp.active = false;
            comp.static = true;
            comp.active = true;
            expect(comp.static).to.be.true;
        });

        it('kinematic', function () {
            const obj = ctx.scene.addObject();
            const comp = obj.addComponent('physx')!;
            comp.kinematic = true;
            expect(comp.kinematic).to.be.true;
            comp.kinematic = false;
            expect(comp.kinematic).to.be.false;
        });

        it('gravity', function () {
            const obj = ctx.scene.addObject();
            const comp = obj.addComponent('physx')!;
            expect(comp.gravity).to.be.true;
            comp.gravity = false;
            expect(comp.gravity).to.be.false;
        });

        it('simulate', function () {
            const obj = ctx.scene.addObject();
            const comp = obj.addComponent('physx')!;
            expect(comp.simulate).to.be.true;
            comp.simulate = false;
            expect(comp.simulate).to.be.false;
        });

        it('allowSimulation', function () {
            const obj = ctx.scene.addObject();
            const comp = obj.addComponent('physx')!;
            comp.allowSimulation = true;
            expect(comp.allowSimulation).to.be.true;
            expect(comp.trigger).to.be.false;
            comp.trigger = true;
            expect(comp.allowSimulation).to.be.false;
        });

        it('allowQuery', function () {
            const obj = ctx.scene.addObject();
            const comp = obj.addComponent('physx')!;
            comp.allowQuery = true;
            expect(comp.allowQuery).to.be.true;
            comp.allowQuery = false;
            expect(comp.allowQuery).to.be.false;
        });

        it('trigger', function () {
            const obj = ctx.scene.addObject();
            const comp = obj.addComponent('physx')!;
            comp.trigger = true;
            expect(comp.trigger).to.be.true;
            expect(comp.allowSimulation).to.be.false;
            comp.allowSimulation = true;
            expect(comp.trigger).to.be.false;
        });

        it('linearLockAxis', function () {
            const obj = ctx.scene.addObject();
            const comp = obj.addComponent('physx')!;
            expect(comp.linearLockAxis).to.equal(LockAxis.None);
            comp.linearLockAxis = LockAxis.Y;
            expect(comp.linearLockAxis).to.equal(LockAxis.Y);
            comp.linearLockAxis = LockAxis.X | LockAxis.Z;
            expect(comp.linearLockAxis).to.equal(LockAxis.X | LockAxis.Z);
            comp.linearLockAxis = LockAxis.None;
            expect(comp.linearLockAxis).to.equal(LockAxis.None);
        });

        it('angularLockAxis', function () {
            const obj = ctx.scene.addObject();
            const comp = obj.addComponent('physx')!;
            expect(comp.angularLockAxis).to.equal(LockAxis.None);
            comp.angularLockAxis = LockAxis.Z;
            expect(comp.angularLockAxis).to.equal(LockAxis.Z);
            comp.angularLockAxis = LockAxis.None;
            expect(comp.angularLockAxis).to.equal(LockAxis.None);
        });

        it('groupsMask', function () {
            const obj = ctx.scene.addObject();
            const comp = obj.addComponent('physx')!;
            expect(comp.groupsMask).to.equal(255);
            comp.groupsMask = 1 << 2;
            expect(comp.groupsMask).to.equal(1 << 2);
        });

        it('blocksMask', function () {
            const obj = ctx.scene.addObject();
            const comp = obj.addComponent('physx')!;
            expect(comp.blocksMask).to.equal(255);
            comp.blocksMask = 1 << 2;
            expect(comp.blocksMask).to.equal(1 << 2);
        });

        it('clone', function () {
            const obj = ctx.scene.addObject();
            const comp = obj.addComponent('physx')!;
            comp.static = true;
            comp.kinematic = true;
            comp.gravity = false;
            comp.simulate = false;
            comp.allowSimulation = false;
            comp.allowQuery = false;
            comp.trigger = true;
            comp.extents = [3.0, 1.0, 2.0];
            comp.staticFriction = 4.0;
            comp.dynamicFriction = 2.0;
            comp.bounciness = 1.75;
            comp.linearDamping = 0.25;
            comp.angularDamping = 0.5;
            comp.linearVelocity = [1.0, 2.0, 3.0];
            comp.angularVelocity = [3.0, 4.0, 5.0];
            comp.groupsMask = 1 << 3;
            comp.blocksMask = 1 << 5;
            comp.linearLockAxis = LockAxis.Y;
            comp.angularLockAxis = LockAxis.Z;
            comp.mass = 12.5;
            /* Need ConvexMesh or TriangleMesh for shapeData to be used.
             * Otherwise the getter returns null and the setter does nothing. */
            comp.shape = Shape.ConvexMesh;
            comp.shapeData = {index: 42};
            expect(comp.shapeData).to.not.be.null;
            /* Deactivate component to avoid PhysXManager trying to index
             * shapeData.index during doActivate */
            comp.active = false;

            const clone = obj.addComponent('physx', comp)!;
            expect(clone).to.be.instanceof(PhysXComponent);
            expect(clone._id).to.not.equal(comp._id);
            expect(clone.static).to.equal(comp.static);
            expect(clone.kinematic).to.equal(comp.kinematic);
            expect(clone.gravity).to.equal(comp.gravity);
            expect(clone.simulate).to.equal(comp.simulate);
            expect(clone.allowSimulation).to.equal(comp.allowSimulation);
            expect(clone.allowQuery).to.equal(comp.allowQuery);
            expect(clone.trigger).to.equal(comp.trigger);
            expect(clone.extents).to.deep.equal(comp.extents);
            expect(clone.staticFriction).to.equal(comp.staticFriction);
            expect(clone.dynamicFriction).to.equal(comp.dynamicFriction);
            expect(clone.bounciness).to.equal(comp.bounciness);
            expect(clone.linearDamping).to.equal(comp.linearDamping);
            expect(clone.angularDamping).to.equal(comp.angularDamping);
            expect(clone.linearVelocity).to.deep.equal(comp.linearVelocity);
            expect(clone.angularVelocity).to.deep.equal(comp.angularVelocity);
            expect(clone.groupsMask).to.equal(comp.groupsMask);
            expect(clone.blocksMask).to.equal(comp.blocksMask);
            expect(clone.linearLockAxis).to.equal(comp.linearLockAxis);
            expect(clone.angularLockAxis).to.equal(comp.angularLockAxis);
            expect(clone.mass).to.equal(comp.mass);
            expect(clone.shape).to.equal(comp.shape);
            expect(clone.shapeData).to.deep.equal(comp.shapeData);
        });
    });
});

describe('Physx > Active', function () {
    let scene: Scene = null!;

    beforeEach(function () {
        reset();
        scene = WL._createEmpty();
        return WL.switchTo(scene);
    });

    it('collisionCallbacks', function () {
        const objA = scene.addObject();
        const objB = scene.addObject();
        const objC = scene.addObject();
        const objD = scene.addObject();

        objA.setTranslationWorld([10, 10, -5]);
        objB.setTranslationWorld([1, 1, -10]);
        objC.setTranslationWorld([-1, -1, 10]);
        objD.setTranslationWorld([-1, -10, 10]);

        const compA = objA.addComponent('physx', {
            shape: Shape.Box,
            mass: 1,
        })!;

        const compB = objB.addComponent('physx', {
            static: true,
            shape: Shape.Plane,
        })!;

        const compC = objC.addComponent('physx', {
            static: true,
            shape: Shape.Sphere,
        })!;

        objD.addComponent('physx', {
            static: true,
            trigger: true,
            allowQuery: true,
            shape: Shape.Sphere,
        })!;

        WL.wasm._wl_nextUpdate(0.01);

        let otherId = 123;
        let otherIdFiltered = 123;
        let triggered = 0;

        const p = objA.getComponent('physx', 0)!;

        expect(p.static).to.equal(false);
        p.kinematic = true;

        const cbA = p.onCollision(function (event, other) {
            if (event == CollisionEventType.Touch) otherId = other._localId;
            else if (event == CollisionEventType.TouchLost) otherId = 0;
        });
        const cbB = p.onCollisionWith(objC.getComponent('physx')!, function (event, other) {
            if (event == CollisionEventType.Touch) otherIdFiltered = other._localId;
            else if (event == CollisionEventType.TouchLost) otherIdFiltered = 0;
        });

        /* Set 'triggered' to true when trigger object callback called */
        const t = objD.getComponent('physx', 0)!;
        t.onCollision((e, o) => {
            triggered = 1;
        });

        /* Changing the kinematic flag while component is inactive would throw
         * an assertion in 0.8.9. We since handle this more gracefully. */
        p.active = false;
        p.kinematic = true;
        p.active = true;

        expect(p.kinematic).to.equal(true);

        /* Make A collide with B */
        objA.setTranslationWorld([1, 1, -10]);
        WL.wasm._wl_physx_update_global_pose(objA._id, compA._id);

        WL.wasm._wl_nextUpdate(0.01);

        /* Kinematic flag should have kept objA from falling */
        const local = [0, 0, 0];
        const world = [0, 0, 0];
        objA.getTranslationLocal(local);
        objA.getTranslationWorld(world);
        expect(local).to.eql([1, 1, -10]);
        expect(world).to.eql([1, 1, -10]);

        expect(otherId).to.equal(compB._localId);
        expect(otherIdFiltered).to.equal(123);
        expect(triggered).to.equal(0);

        /* Stop A from colliding with B */
        objA.setTranslationWorld([2.1, 1, -10]);
        WL.wasm._wl_physx_update_global_pose(objA._id, compA._id);

        WL.wasm._wl_nextUpdate(0.01);

        expect(otherId).to.equal(0);
        expect(otherIdFiltered).to.equal(123);
        expect(triggered).to.equal(0);

        /* Make A collide with C */
        objA.setTranslationWorld([-1, -1, 10]);
        WL.wasm._wl_physx_update_global_pose(objA._id, compA._id);

        WL.wasm._wl_nextUpdate(0.01);

        expect(otherId).to.equal(compC._localId);
        expect(otherIdFiltered).to.equal(compC._localId);
        expect(triggered).to.equal(0);

        /* Uncollide and soak up the associated events */
        objA.setTranslationWorld([10, 10, -5]);

        WL.wasm._wl_nextUpdate(0.01);

        /* Make A collide with D */
        objA.setTranslationWorld([-1, -10, 10]);
        WL.wasm._wl_physx_update_global_pose(objA._id, compA._id);

        WL.wasm._wl_nextUpdate(0.01);

        expect(triggered).to.equal(1);

        p.removeCollisionCallback(cbA);
        p.removeCollisionCallback(cbB);
        expect(() => p.removeCollisionCallback(123)).to.throw(Error);
    });

    it('raycast', function () {
        const obj = scene.addObject();
        const comp = obj.addComponent('physx', {
            static: true,
            shape: Shape.Box,
            mass: 1,
        });

        const physx = WL.physics!;
        const hit = physx.rayCast([0, 0, 5], [0, 0, -1], 255, 50);

        expect(hit.hitCount).to.equal(1);
        expect(hit.getDistances()).to.deep.almost([4]);
        expect(hit.distances).to.deep.almost([4]);
        expect(hit.getLocations()).to.deep.almost([[0, 0, 1]]);
        expect(hit.locations).to.deep.almost([[0, 0, 1]]);
        expect(hit.getNormals()).to.deep.almost([[0, 0, 1]]);
        expect(hit.normals).to.deep.almost([[0, 0, 1]]);

        physx.rayCast([0, 2, 0], [0, -1, 0], 255, 50);
        expect(hit.hitCount).to.equal(1);
        expect(hit.getDistances()).to.deep.almost([1]);
        expect(hit.distances).to.deep.almost([1]);
        expect(hit.getLocations()).to.deep.almost([[0, 1, 0]]);
        expect(hit.locations).to.deep.almost([[0, 1, 0]]);
        expect(hit.getNormals()).to.deep.almost([[0, 1, 0]]);
        expect(hit.normals).to.deep.almost([[0, 1, 0]]);

        obj.rotateAxisAngleDeg([0, 1, 0], 45);
        comp.active = false;
        comp.active = true;
        physx.rayCast([0, 0, 2], [0, 0, -1], 255, 50);
        expect(hit.hitCount).to.equal(1);
        /* Origin is located at [0, 0, 2], and the cube diagonal has length sqrt(2). */
        expect(hit.getDistances()).to.deep.almost([2 - Math.sqrt(2)]);
        expect(hit.getLocations()).to.deep.almost([[0, 0, Math.sqrt(2)]]);
    });

    it('raycast aligned objects', function () {
        const objA = scene.addObject();
        const objB = scene.addObject();
        const objC = scene.addObject();
        const objD = scene.addObject();

        objA.setTranslationWorld([0, 1, -5]);
        objB.setTranslationWorld([0, 1, -10]);
        objC.setTranslationWorld([0, 1, -15]);
        objD.setTranslationWorld([0, 1, -20]);

        objA.addComponent('physx', {
            static: true,
            shape: Shape.Box,
            mass: 1,
        });
        objB.addComponent('physx', {
            kinematic: true,
            shape: Shape.Box,
        });
        objC.addComponent('physx', {
            static: true,
            shape: Shape.Box,
        });
        objD.addComponent('physx', {
            gravity: false,
            shape: Shape.Box,
        });

        WL.wasm._wl_nextUpdate(0.01);

        const hit = WL.physics!.rayCast([0, 1, 0], [0, 0, -1], 255, 50);

        expect(hit.hitCount).to.equal(4);

        expect(hit.getDistances()).to.deep.almost([4, 9, 14, 19]);

        const locations = hit.getLocations();
        expect(locations[0]).to.deep.almost([0, 1, -4]);
        expect(locations[1]).to.deep.almost([0, 1, -9]);
        expect(locations[2]).to.deep.almost([0, 1, -14]);
        expect(locations[3]).to.deep.almost([0, 1, -19]);

        const normals = hit.getNormals();
        expect(normals[0]).to.deep.almost([0, 0, 1]);
        expect(normals[1]).to.deep.almost([0, 0, 1]);
        expect(normals[2]).to.deep.almost([0, 0, 1]);
        expect(normals[3]).to.deep.almost([0, 0, 1]);

        expect(hit.objects[0]!.equals(objA)).to.be.true;
        expect(hit.objects[1]!.equals(objB)).to.be.true;
        expect(hit.objects[2]!.equals(objC)).to.be.true;
        expect(hit.objects[3]!.equals(objD)).to.be.true;
    });

    it('sleeping objects simulation', function () {
        const obj = scene.addObject();
        obj.setPositionWorld([0, 1, 0]);
        const comp = obj.addComponent('physx', {
            mass: 1,
            shape: Shape.Box,
            sleepOnActivate: true,
        })!;

        WL.wasm._wl_nextUpdate(1.0); /* Large update to ensure it doesn't move */
        expect(obj.getPositionWorld()).to.deep.almost([0, 1, 0]);

        comp.active = false;
        comp.sleepOnActivate = false;
        comp.active = true;
        WL.wasm._wl_nextUpdate(1.0); /* Large update to ensure it moves */
        expect(obj.getPositionWorld()[1]).to.be.lessThan(0.0);
    });
});

describe('Physics Engine', function () {
    it('js components access valid ray scene during scene activation / deactivation', function () {
        const physx = WL.physics!;
        class TestComponent extends Component {
            static TypeName = 'test';
            pxScene = {init: -1, start: -1, activate: -1, deactivate: -1};
            init() {
                this.pxScene.init = physx._hit._scene._index;
            }
            start() {
                this.pxScene.start = physx._hit._scene._index;
            }
            onActivate() {
                this.pxScene.activate = physx._hit._scene._index;
            }
            onDeactivate() {
                this.pxScene.deactivate = physx._hit._scene._index;
            }
        }
        WL.registerComponent(TestComponent);

        const scene = WL.scene;
        const sceneA = WL._createEmpty();
        const sceneB = WL._createEmpty();

        const compA = sceneA.addObject().addComponent(TestComponent);
        WL.switchTo(sceneA);
        expect(compA.pxScene).to.eql({
            init: scene._index /* `init` is called with previous scene active */,
            start: sceneA._index,
            activate: sceneA._index,
            deactivate: -1,
        });

        const compB = sceneB.addObject().addComponent(TestComponent);
        WL.switchTo(sceneB);
        expect(compA.pxScene.deactivate).to.eql(sceneA._index);
        expect(compB.pxScene).to.eql({
            init: sceneA._index /* `init` is called with previous scene active */,
            start: sceneB._index,
            activate: sceneB._index,
            deactivate: -1,
        });
    });
});
