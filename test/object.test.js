import {expect, use} from '@esm-bundle/chai';
import { chaiAlmost } from './chai/almost.js';

import { init, reset } from './setup.js';

before(init);
beforeEach(reset);

use(chaiAlmost());

describe('Object', function() {

    it('get and set name', function() {
        const obj = WL.scene.addObject();
        obj.name = 'Object1';
        expect(obj.name).to.equal('Object1');

        /* Test with a second object to ensure no clash occurs. */
        const obj2 = WL.scene.addObject();
        obj2.name = 'Object2';
        expect(obj.name).to.equal('Object1');
        expect(obj2.name).to.equal('Object2');
    });

    it('equals', function() {
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

    it('get changed', function() {
        /* @TODO Test unchanged state once it can be replicated in tests */
        const x = WL.scene.addObject();
        const a = WL.scene.addObject(x);
        const b = WL.scene.addObject(a);

        expect(x.changed).to.be.false;
        expect(a.changed).to.be.true;
        expect(b.changed).to.be.true;
    });

    it('local transformation', function() {
        const obj = WL.scene.addObject();
        expect(obj.transformLocal).to.eql(
            new Float32Array([0, 0, 0, 1, 0, 0, 0, 0]));
        obj.transformLocal = [0, 0, 0, 0, 0, 0, 0, 0];
        expect(obj.transformLocal).to.eql(
            new Float32Array([0, 0, 0, 0, 0, 0, 0, 0]));
    });

    it('world transformation', function() {
        const obj = WL.scene.addObject();
        expect(obj.transformWorld).to.eql(
            new Float32Array([0, 0, 0, 1, 0, 0, 0, 0]));
        obj.transformWorld = [0, 0, 0, 0, 0, 0, 0, 1];
        expect(obj.transformWorld).to.eql(
            new Float32Array([0, 0, 0, 0, 0, 0, 0, 1]));
    });

    it('(set|get)Translation(World|Local)', function() {
        const obj = WL.scene.addObject();
        const objB = WL.scene.addObject(obj);
        const out =  new Float32Array(3);
        expect(obj.transformWorld).to.eql(
            new Float32Array([0, 0, 0, 1, 0, 0, 0, 0]));

        obj.setTranslationLocal([1, 2, 3]);
        obj.getTranslationLocal(out)
        expect(out).to.eql(new Float32Array([1, 2, 3]));

        obj.setTranslationWorld([5, 6, 7]);
        obj.getTranslationWorld(out);
        expect(out).to.eql(new Float32Array([5, 6, 7]));

        /* Setting the translation should be rotation independent */
        obj.rotateAxisAngleDeg([1, 0, 0], 45.0);
        obj.setTranslationLocal([3, 2, 1]);

        obj.getTranslationLocal(out);
        expect(out).to.be.deep.almost(
            new Float32Array([3, 2, 1]), 0.01);

        objB.rotateAxisAngleDeg([0, 1, 0], 45.0);
        objB.setTranslationWorld([7, 6, 5]);
        objB.getTranslationWorld(out);
        expect(out).to.be.almost.deep.equal(
            new Float32Array([7, 6, 5]), 0.01);
    });

    it('scaling local', function() {
        const obj = WL.scene.addObject();
        obj.scalingLocal = [3, 2, 1];
        obj.scalingLocal[0] = 1.5;
        expect(obj.scalingLocal).to.eql(new Float32Array([1.5, 2, 1]));

        obj.scalingLocal = [1, 1, 1];
        obj.scalingWorld = [3, 2, 1];
        obj.scalingWorld[0] = 1.5;
        expect(obj.scalingWorld).to.eql(new Float32Array([1.5, 2, 1]));
    });

    it('transformation reset', function() {
        const obj = WL.scene.addObject();
        obj.resetTransform();
        expect(obj.transformLocal).to.eql(
            new Float32Array([0, 0, 0, 1, 0, 0, 0, 0]));
    });

    it('translate', function() {
        const obj = WL.scene.addObject();
        obj.translate([1, 2, 3]);
        expect(obj.transformLocal).to.eql(
            new Float32Array([0, 0, 0, 1, 0.5, 1, 1.5, 0]))
    });

    it('rotation', function() {
        const obj = WL.scene.addObject();
        obj.rotateAxisAngleDeg([1, 0, 0], 45);

        expect(obj.transformLocal).to.be.deep.almost(
            new Float32Array([0.3826834559440613, 0, 0, 0.9238795042037964, 0, 0, 0, 0]), 0.00001);

        obj.resetTransform();
        obj.rotate([0.283524, 0.340229, 0.850572, 0.283524]);
        expect(obj.transformLocal).to.be.deep.almost(
            new Float32Array([0.283524, 0.340229, 0.850572, 0.283524, 0, 0, 0, 0]), 0.00001);

        expect(obj.transformLocal).to.be.deep.almost(
            new Float32Array([0.283524, 0.340229, 0.850572, 0.283524, 0, 0, 0, 0]), 0.00001);
    });

    it('scaling', function() {
        const obj = WL.scene.addObject();
        obj.scale([0.1, 0.2, 0.3]);
        expect(obj.scalingLocal).to.eql(
            new Float32Array([0.1, 0.2, 0.3]));
    });

    it('object component', function() {
        const obj = WL.scene.addObject();
        obj.addComponent('light');
        obj.addComponent('light');
        expect(obj.getComponent("view", 0)).to.be.null;
        expect(obj.getComponent("light", 1)).to.not.be.null;
    });

    it('object components', function() {
        const obj = WL.scene.addObject();
        obj.addComponent('light');
        obj.addComponent('light');

        const comps = obj.getComponents("light");
        const compA = obj.getComponent("light", 0);
        const compB = obj.getComponent("light", 1);
        expect(comps.length).to.equal(2);
        expect(comps[0].equals(compA)).to.be.true;
        expect(comps[1].equals(compB)).to.be.true;
    });

    it('object components without type', function() {
        const obj = WL.scene.addObject();
        const compA = obj.addComponent('light');

        const comps = obj.getComponents();
        expect(comps.length).to.equal(1);
        expect(comps[0].equals(compA)).to.be.true;
    });

    it('parent', function() {
        const obj = WL.scene.addObject();
        const objB = WL.scene.addObject(obj);

        expect(objB.parent.objectId).to.equal(obj.objectId);

        objB.parent = null;
        expect(objB.parent).to.equal(null);

        obj.parent = objB;
        expect(obj.parent.objectId).to.equal(objB.objectId);
        expect(objB.children.length).to.equal(1);
        expect(objB.children[0].objectId).to.equal(obj.objectId);
    });

    describe('Object Transform', function() {

        it('(set|get)Translation(World|Local)', function() {

            // TODO: potentially add the rotation transformations from ApiTest.cpp?
            const parent = WL.scene.addObject();
            const child = WL.scene.addObject(parent);

            const translationLocal = new Float32Array([3.0, -2.0, -1.0]);
            const translationWorld = new Float32Array([0.5, 1.0, 1.5]);
            const noTranslation = new Float32Array([0, 0, 0]);
            const out = new Float32Array(3);
            child.getTranslationLocal(out);

            expect(out).to.eql(noTranslation);

            child.setTranslationLocal(translationLocal);
            child.getTranslationLocal(out);
            expect(out).to.eql(translationLocal);

            child.setTranslationWorld(translationWorld);
            child.setDirty();
            child.getTranslationWorld(out);
            expect(out).to.eql(translationWorld);

            child.resetTranslation();
            child.getTranslationWorld(out);
            expect(out).to.eql(noTranslation);
        });

        it('translation', function () {
            const parent = WL.scene.addObject();
            const child = WL.scene.addObject(parent);
            const out = new Float32Array(3);

            child.translate([1, 2, 3]);
            child.getTranslationWorld(out);
            expect(out).to.eql(new Float32Array([1, 2, 3]));

            child.resetTranslation();
            child.translateObject([1.0, 2.0, 3.0]);
            child.getTranslationWorld(out);
            expect(out).to.eql(new Float32Array([1, 2, 3]));

            child.resetTranslation();
            child.translateWorld([3.0, 2.0, 1.0]);
            child.getTranslationWorld(out);
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

            child.scalingLocal = ([0.5, 0.5, 0.5]);
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
            child.getTranslationWorld(out);
            expect(out).to.eql(new Float32Array([0, 0, 0]));
        });

    });
});
