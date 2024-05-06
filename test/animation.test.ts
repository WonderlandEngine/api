import {expect} from '@esm-bundle/chai';

import {Animation, AnimationState, Scene, InMemoryLoadOptions} from '..';
import {describeMainScene, init, reset, WL} from './setup.js';
import {loadProjectBins} from './utils.js';

before(init);

/* Use in-memory .bin as much as possible to speed up the tests. */
let bins: InMemoryLoadOptions[] = [];
try {
    bins = await loadProjectBins('Animations.bin');
} catch (e) {
    console.error('Failed to load required test scenes');
    throw e;
}
const animationsBin = bins[0];

describe('Animation', function () {
    beforeEach(reset);

    it('deprecated .equals()', function () {
        const anim1 = new Animation(WL, 1);
        const anim2 = new Animation(WL, 2);
        const anim3 = new Animation(WL, 1);
        expect(anim1.equals(null)).to.be.false;
        expect(anim1.equals(undefined)).to.be.false;
        expect(anim1.equals(anim1)).to.be.true;
        expect(anim1.equals(anim2)).to.be.false;
        expect(anim2.equals(anim1)).to.be.false;
        expect(anim1.equals(anim3)).to.be.true;
        expect(anim3.equals(anim1)).to.be.true;
    });
});

describe('Animation Events', function () {
    let scene: Scene = null!;
    before(async function () {
        scene = await WL.loadMainSceneFromBuffer(animationsBin);
    });

    it('Animation Events', async function () {
        /* Animated cube with events */
        const cube = scene.findByName('Cube')[0];
        /* Duplicate of the first animated cube with same events */
        const cube2 = scene.findByName('Cube2')[0];
        /* Cube with a different animation and no events */
        const cube3 = scene.findByName('Cube3')[0];

        for (const [i, c] of [cube, cube2, cube3].entries()) {
            expect(c, `cube${i} is null`).to.not.be.null;
        }

        const component = cube.getComponent('animation')!;
        const component2 = cube2.getComponent('animation')!;
        const component3 = cube3.getComponent('animation')!;

        for (const [i, comp] of [component, component2, component3].entries()) {
            expect(comp, `component${i} is null`).to.not.be.null;
            expect(comp.animation, `component${i}.animation is null`).to.not.be.null;
        }

        const triggeredEvents: string[] = [];
        component.onEvent.add((name: string) => {
            triggeredEvents.push(name);
        });

        const triggeredEvents2: string[] = [];
        component2.onEvent.add((name: string) => {
            triggeredEvents2.push(name);
        });

        const triggeredEvents3: string[] = [];
        component3.onEvent.add((name: string) => {
            triggeredEvents3.push(name);
        });

        component.play();
        component2.play();
        component3.play();

        WL.wasm._wl_nextUpdate(component.animation!.duration / 4.0);
        expect(triggeredEvents).to.eql(['start']);
        expect(triggeredEvents2).to.eql(['start']);
        expect(triggeredEvents3).to.eql(['other start']);
        WL.wasm._wl_nextUpdate(component.animation!.duration / 4.0);
        expect(triggeredEvents).to.eql(['start', 'step1']);
        expect(triggeredEvents2).to.eql(['start', 'step1']);
        expect(triggeredEvents3).to.eql(['other start', 'other step1']);
        WL.wasm._wl_nextUpdate(component.animation!.duration / 4.0);
        expect(triggeredEvents).to.eql(['start', 'step1', 'Ώ']);
        expect(triggeredEvents2).to.eql(['start', 'step1', 'Ώ']);
        expect(triggeredEvents3).to.eql(['other start', 'other step1', 'other Ώ']);
        WL.wasm._wl_nextUpdate(component.animation!.duration / 4.0);
        expect(triggeredEvents).to.eql(['start', 'step1', 'Ώ', 'end']);
        expect(triggeredEvents2).to.eql(['start', 'step1', 'Ώ', 'end']);
        expect(triggeredEvents3).to.eql([
            'other start',
            'other step1',
            'other Ώ',
            'other end',
        ]);

        component.stop();
        component2.stop();
        component3.stop();
        triggeredEvents.length = 0;
        triggeredEvents2.length = 0;
        triggeredEvents3.length = 0;

        /* Simulate lag spike */
        component.play();
        component2.play();
        component3.play();

        WL.wasm._wl_nextUpdate(component.animation!.duration * 2.0);
        expect(triggeredEvents).to.eql(['start', 'step1', 'Ώ', 'end']);
        expect(triggeredEvents2).to.eql(['start', 'step1', 'Ώ', 'end']);
        expect(triggeredEvents3).to.eql([
            'other start',
            'other step1',
            'other Ώ',
            'other end',
        ]);

        component.stop();
        component2.stop();
        component3.stop();
        triggeredEvents.length = 0;
        triggeredEvents2.length = 0;
        triggeredEvents3.length = 0;

        /* De-activate the first component */
        component.active = false;
        component.play();
        component2.play();
        component3.play();

        WL.wasm._wl_nextUpdate(component.animation!.duration / 4.0);
        expect(triggeredEvents).to.eql([]);
        expect(triggeredEvents2).to.eql(['start']);
        expect(triggeredEvents3).to.eql(['other start']);
        WL.wasm._wl_nextUpdate(component.animation!.duration / 4.0);
        expect(triggeredEvents).to.eql([]);
        expect(triggeredEvents2).to.eql(['start', 'step1']);
        expect(triggeredEvents3).to.eql(['other start', 'other step1']);
        WL.wasm._wl_nextUpdate(component.animation!.duration / 4.0);
        expect(triggeredEvents).to.eql([]);
        expect(triggeredEvents2).to.eql(['start', 'step1', 'Ώ']);
        expect(triggeredEvents3).to.eql(['other start', 'other step1', 'other Ώ']);
        WL.wasm._wl_nextUpdate(component.animation!.duration / 4.0);
        expect(triggeredEvents).to.eql([]);
        expect(triggeredEvents2).to.eql(['start', 'step1', 'Ώ', 'end']);
        expect(triggeredEvents3).to.eql([
            'other start',
            'other step1',
            'other Ώ',
            'other end',
        ]);
    });

    it('Animation State', async function () {
        /* Calling play, stop or pause now no longer updates
         * the state of the component if no animation is loaded,
         * since the graphs allocate players for each sampling node.
         * If no animation is set, no players are allocated,
         * so there is nothing to play pause or stop.
         */
        /* Animated cube with events */
        const cube = WL.scene.findByName('Cube')[0];
        const comp = cube.getComponent('animation')!;

        comp.play();
        expect(comp.state).to.equal(AnimationState.Playing);
        comp.pause();
        expect(comp.state).to.equal(AnimationState.Paused);
        comp.stop();
        expect(comp.state).to.equal(AnimationState.Stopped);
    });
});

describeMainScene('Animation Graphs', animationsBin, function (ctx) {
    it('Animation Graph Properties', async function () {
        const cube = ctx.scene.findByName('Cube4')[0];
        expect(cube).to.not.be.null;
        const component = cube.getComponent('animation')!;
        expect(component).to.not.be.null;
        const blendFactor = component.getFloatParameter('blendFactor');
        expect(blendFactor).to.be.equal(0.5);
        component.setFloatParameter('blendFactor', 0.75);
        const newBlendFactor = component.getFloatParameter('blendFactor');
        expect(newBlendFactor).to.be.equal(0.75);
        expect(() => component.setFloatParameter('blendFactor1', 0.5)).to.throw(
            Error,
            "Missing parameter 'blendFactor1'"
        );
        expect(() => component.getFloatParameter('blendFactor1')).to.throw(
            Error,
            "Missing parameter 'blendFactor1'"
        );
        component.setFloatParameter('blendFactor', 0.5);
    });

    it('.instantiate', async function () {
        const toInstantiate = await WL.loadSceneFromBuffer(animationsBin);
        ctx.scene.instantiate(toInstantiate);

        const cubes = ctx.scene.findByNameRecursive('Cube4');
        expect(cubes).to.have.lengthOf(2);

        const animCompA = cubes[0].getComponent('animation')!;
        const animCompB = cubes[1].getComponent('animation')!;
        expect(animCompA).to.not.be.null;
        expect(animCompB).to.not.be.null;

        const blendFactor1 = animCompA.getFloatParameter('blendFactor');
        const blendFactor2 = animCompB.getFloatParameter('blendFactor');
        expect(blendFactor1).to.be.equal(0.5);
        expect(blendFactor2).to.be.equal(0.5);
        animCompA.setFloatParameter('blendFactor', 0.25);
        const newBlendFactor1 = animCompA.getFloatParameter('blendFactor');
        const newBlendFactor2 = animCompB.getFloatParameter('blendFactor');
        expect(newBlendFactor1).to.be.equal(0.25);
        expect(newBlendFactor2).to.be.equal(0.5);

        animCompB.setFloatParameter('blendFactor', 0.75);

        const finalBlendFactor1 = animCompA.getFloatParameter('blendFactor');
        const finalBlendFactor2 = animCompB.getFloatParameter('blendFactor');
        expect(finalBlendFactor1).to.be.equal(0.25);
        expect(finalBlendFactor2).to.be.equal(0.75);
    });

    it('set animation on component', function () {
        const cube = ctx.scene.findByName('Cube')[0];
        expect(cube).to.not.be.null;
        const cube4 = ctx.scene.findByName('Cube4')[0];
        expect(cube4).to.not.be.null;

        const component0 = cube.getComponent('animation')!;
        const component1 = cube4.getComponent('animation')!;
        const animation0 = component0.animation;
        const animation1 = component1.animation;

        component0.animation = animation1;
        WL.wasm._wl_nextUpdate(0.01);
        component1.animation = animation0;
        WL.wasm._wl_nextUpdate(0.01);
    });
});

describe('Animation Graphs', function () {
    it('.instantiate() scene inside itself', async function () {
        const mainScene = await WL.loadSceneFromBuffer(animationsBin);
        mainScene.instantiate(mainScene);

        const cubes = mainScene.findByNameRecursive('Cube4');
        expect(cubes).to.have.lengthOf(2);

        const animCompA = cubes[0].getComponent('animation')!;
        const animCompB = cubes[1].getComponent('animation')!;
        expect(animCompA).to.not.be.null;
        expect(animCompB).to.not.be.null;

        const blendFactor1 = animCompA.getFloatParameter('blendFactor');
        const blendFactor2 = animCompB.getFloatParameter('blendFactor');
        expect(blendFactor1).to.be.equal(0.5);
        expect(blendFactor2).to.be.equal(0.5);
        animCompA.setFloatParameter('blendFactor', 0.25);
        const newBlendFactor1 = animCompA.getFloatParameter('blendFactor');
        const newBlendFactor2 = animCompB.getFloatParameter('blendFactor');
        expect(newBlendFactor1).to.be.equal(0.25);
        expect(newBlendFactor2).to.be.equal(0.5);

        animCompB.setFloatParameter('blendFactor', 0.75);

        const finalBlendFactor1 = animCompA.getFloatParameter('blendFactor');
        const finalBlendFactor2 = animCompB.getFloatParameter('blendFactor');
        expect(finalBlendFactor1).to.be.equal(0.25);
        expect(finalBlendFactor2).to.be.equal(0.75);
    });
});
