import { expect, use } from '@esm-bundle/chai';
import { chaiAlmost } from './chai/almost.js';

import { PhysXComponent, Shape, ForceMode, CollisionEventType } from '../wonderland.js';

import { init, reset } from './setup.js';

use(chaiAlmost());

before(init.bind(null, { physx: true }));
beforeEach(reset);

describe('PhysX', function() {

    it('addComponent', function() {
        const object = WL.scene.addObject();

        object.name = "testobj";
        const obj = object;

        const physx = obj.addComponent('physx');
        expect(physx._id).to.equal(0);
        expect(physx instanceof PhysXComponent).to.equal(true);
    });

    it('physxComponent', function() {
        const objA = WL.scene.addObject();
        const objB = WL.scene.addObject();

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
        });

        _wl_physx_update(0.01);

        /* Test getters */
        const pA = objA.getComponent("physx", 0);
        expect(pA.static).to.equal(false);
        expect(pA.shape).to.equal(Shape.Box);

        const pB = objB.getComponent("physx", 0);
        expect(compB.static).to.equal(true);
        expect(compB.shape).to.equal(Shape.Plane);

        pA.linearVelocity = ([0, 1, 2]);
        expect(pA.linearVelocity).to.almost.eql([0, 1, 2]);

        pA.angularVelocity = ([0, 2, 4]);
        expect(pA.angularVelocity).to.almost.eql([0, 2, 4]);

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

    it('collisionCallbacks', function() {
        const objA = WL.scene.addObject();
        const objB = WL.scene.addObject();
        const objC = WL.scene.addObject();
        const objD = WL.scene.addObject();

        objA.setTranslationWorld([10, 10, -5]);
        objB.setTranslationWorld([1, 1, -10]);
        objC.setTranslationWorld([-1, -1, 10]);
        objD.setTranslationWorld([-1, -10, 10]);

        const compA = objA.addComponent('physx', {
            shape: Shape.Box,
            mass: 1,
        });

        const compB = objB.addComponent('physx', {
            static: true,
            shape: Shape.Plane,
        });

        const compC = objC.addComponent('physx', {
            static: true,
            shape: Shape.Sphere,
        });

        const compD = objD.addComponent('physx', {
            static: true,
            trigger: true,
            allowQuery: true,
            shape: Shape.Sphere,
        });

        _wl_physx_update(0.01);

        let otherId = 123;
        let otherIdFiltered = 123;
        let triggered = 0;

        const p = objA.getComponent("physx", 0);

        expect(p.static).to.equal(false);
        p.kinematic = true;

        const cbA = p.onCollision(function(event, other) {
            if(event == CollisionEventType.Touch) otherId = other._id;
            else if(event == CollisionEventType.TouchLost) otherId = 0;
        });
        const cbB = p.onCollisionWith(objC.getComponent('physx'), function(event, other) {
            if(event == CollisionEventType.Touch) otherIdFiltered = other._id;
            else if(event == CollisionEventType.TouchLost) otherIdFiltered = 0;
        });

        /* Set 'triggered' to true when trigger object callback called */
        const t = objD.getComponent("physx", 0);
        t.onCollision((e, o) => { triggered = 1; });

        /* Changing the kinematic flag while component is inactive would throw
         * an assertion in 0.8.9. We since handle this more gracefully. */
        p.active = false;
        p.kinematic = true;
        p.active = true;

        expect(p.kinematic).to.equal(true);

        /* Make A collide with B */
        objA.setTranslationWorld([1, 1, -10]);
        _wl_physx_update_global_pose(objA.objectId, compA._id);

        _wl_physx_update(0.01);

        /* Kinematic flag should have kept objA from falling */
        const local = [0, 0, 0];
        const world = [0, 0, 0];
        objA.getTranslationLocal(local);
        objA.getTranslationWorld(world);
        expect(local).to.eql([1, 1, -10]);
        expect(world).to.eql([1, 1, -10]);

        expect(otherId).to.equal(compB._id);
        expect(otherIdFiltered).to.equal(123);
        expect(triggered).to.equal(0);

        /* Stop A from colliding with B */
        objA.setTranslationWorld([2.1, 1, -10]);
        _wl_physx_update_global_pose(objA.objectId, compA._id);

        _wl_physx_update(0.01);

        expect(otherId).to.equal(0);
        expect(otherIdFiltered).to.equal(123);
        expect(triggered).to.equal(0);

        /* Make A collide with C */
        objA.setTranslationWorld([-1, -1, 10]);
        _wl_physx_update_global_pose(objA.objectId, compA._id);

        _wl_physx_update(0.01);

        expect(otherId).to.equal(compC._id);
        expect(otherIdFiltered).to.equal(compC._id);
        expect(triggered).to.equal(0);

        /* Uncollide and soak up the associated events */
        objA.setTranslationWorld([10, 10, -5]);

        _wl_physx_update(0.01);

        /* Make A collide with D */
        objA.setTranslationWorld([-1, -10, 10]);
        _wl_physx_update_global_pose(objA.objectId, compA._id);

        _wl_physx_update(0.01);

        expect(triggered).to.equal(1);

        p.removeCollisionCallback(cbA);
        p.removeCollisionCallback(cbB);
        expect(() => p.removeCollisionCallback(123)).to.throw(Error);
    });

    it('raycast', function() {
        const objA = WL.scene.addObject();
        const objB = WL.scene.addObject();
        const objC = WL.scene.addObject();
        const objD = WL.scene.addObject();

        objA.setTranslationWorld([0, 1, -5]);
        objB.setTranslationWorld([0, 1, -10]);
        objC.setTranslationWorld([0, 1, -15]);
        objD.setTranslationWorld([0, 1, -20]);

        const compA = objA.addComponent('physx', {
            static: true,
            shape: Shape.Box,
            mass: 1,
        });

        const compB = objB.addComponent('physx', {
            kinematic: true,
            shape: Shape.Box,
        });

        const compC = objC.addComponent('physx', {
            static: true,
            shape: Shape.Box,
        });

        const compD = objD.addComponent('physx', {
            gravity: false,
            shape: Shape.Box,
        });

        _wl_physx_update(0.01);

        const hit = WL.physics.rayCast([0, 1, 0], [0, 0, -1], 255, 50);

        expect(hit.hitCount).to.equal(4);
        expect(hit.distances).to.almost.eql([4, 9, 14, 19]);
        expect(hit.objects[0].equals(objA)).to.be.true;
        expect(hit.objects[1].equals(objB)).to.be.true;
        expect(hit.objects[2].equals(objC)).to.be.true;
        expect(hit.objects[3].equals(objD)).to.be.true;
    });

    it('collisionShape', function () {
        const objA = WL.scene.addObject();
        const objB = WL.scene.addObject();

        objA.setTranslationWorld([0, 0, -10]);
        objB.setTranslationWorld([1, 1, -10]);

        _wl_physx_update(0.01);

        /* Add a physx component */
        const compA = objA.addComponent("physx");

        compA.shape = Shape.Plane;
        compA.extents.set([1.0, 2.0, 3.0]);

        compA.staticFriction = 0.1;
        compA.dynamicFriction = 0.2;
        compA.bounciness = 0.3;
        compA.linearDamping = 0.4;
        compA.angularDamping = 0.5;

        expect(compA.static).to.equal(false);

        expect(compA.extents).to.almost.eql([1.0, 2.0, 3.0]);
        expect(compA.shape).to.equal(Shape.Plane);
        expect(compA.staticFriction).to.almost.equal(0.1);
        expect(compA.dynamicFriction).to.almost.equal(0.2);
        expect(compA.bounciness).to.almost.equal(0.3);
        expect(compA.linearDamping).to.almost.equal(0.4);
        expect(compA.angularDamping).to.almost.equal(0.5);

        const compB = objB.addComponent("physx");
        compB.static = false;
        compB.kinematic = true;
        compB.extents.set([3.0, 1.0, 2.0]);
        compB.shape = Shape.Box;
        compB.staticFriction = 1.1;
        compB.dynamicFriction = 1.2;
        compB.bounciness = 1.3;
        compB.linearDamping = 1.4;
        compB.angularDamping = 1.5;

        /* Clone physx component */
        const p2 = objB.addComponent("physx", compB);

        expect(p2.extents).to.almost.eql([3.0, 1.0, 2.0]);
        expect(p2.static).to.equal(false);
        expect(p2.kinematic).to.equal(true);
        expect(p2.shape).to.equal(Shape.Box);
        expect(p2.staticFriction).to.almost.equal(1.1);
        expect(p2.dynamicFriction).to.almost.equal(1.2);
        expect(p2.bounciness).to.almost.equal(1.3);
        expect(p2.linearDamping).to.almost.equal(1.4);
        expect(p2.angularDamping).to.almost.equal(1.5);
    });

    describe('Flags', function() {
        it('static', function() {
            const obj = WL.scene.addObject();
            const comp = obj.addComponent('physx');
            expect(comp.static).to.be.false;
            /* Must deactivate to change the static flag */
            comp.active = false;
            comp.static = true;
            comp.active = true;
            expect(comp.static).to.be.true;
        });

        it('kinematic', function() {
            const obj = WL.scene.addObject();
            const comp = obj.addComponent('physx');
            comp.kinematic = true;
            expect(comp.kinematic).to.be.true;
            comp.kinematic = false;
            expect(comp.kinematic).to.be.false;
        });

        it('gravity', function() {
            const obj = WL.scene.addObject();
            const comp = obj.addComponent('physx');
            expect(comp.gravity).to.be.true;
            comp.gravity = false;
            expect(comp.gravity).to.be.false;
        });

        it('simulate', function() {
            const obj = WL.scene.addObject();
            const comp = obj.addComponent('physx');
            expect(comp.simulate).to.be.true;
            comp.simulate = false;
            expect(comp.simulate).to.be.false;
        });

        it('allowSimulation', function() {
            const obj = WL.scene.addObject();
            const comp = obj.addComponent('physx');
            comp.allowSimulation = true;
            expect(comp.allowSimulation).to.be.true;
            expect(comp.trigger).to.be.false;
            comp.trigger = true;
            expect(comp.allowSimulation).to.be.false;
        });

        it('allowQuery', function() {
            const obj = WL.scene.addObject();
            const comp = obj.addComponent('physx');
            comp.allowQuery = true;
            expect(comp.allowQuery).to.be.true;
            comp.allowQuery = false;
            expect(comp.allowQuery).to.be.false;
        });

        it('trigger', function() {
            const obj = WL.scene.addObject();
            const comp = obj.addComponent('physx');
            comp.trigger = true;
            expect(comp.trigger).to.be.true;
            expect(comp.allowSimulation).to.be.false;
            comp.allowSimulation = true;
            expect(comp.trigger).to.be.false;
        });
    });
});
