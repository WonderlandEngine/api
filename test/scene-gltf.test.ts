import {expect} from '@esm-bundle/chai';

import {init, projectURL, reset, resourceURL, WL} from './setup.js';

import {
    AnimationComponent,
    CollisionComponent,
    Component,
    ComponentConstructor,
    InputComponent,
    LightComponent,
    MeshComponent,
    Object3D,
    PhysXComponent,
    Scene,
    SceneAppendResultWithExtensions,
    PrefabGLTF,
    Texture,
    ViewComponent,
} from '..';
import {fetchWithProgress} from '../src/utils/fetch.js';
import {dummyImage} from './utils.js';
import {PhongMaterial} from './types.js';

before(() => init({loader: true, physx: true}));

/* Use in-memory .bin as much as possible to speed up the tests. */
const bins: ArrayBuffer[] = [];
try {
    bins.push(
        ...(await Promise.all([
            fetchWithProgress(projectURL('Advanced.bin')),
            fetchWithProgress(projectURL('Tiny.bin')),
            fetchWithProgress(resourceURL('Box.glb')),
            fetchWithProgress(resourceURL('BoxWithExtensions.glb')),
        ]))
    );
} catch (e) {
    console.error('Failed to load required test scenes');
    throw e;
}
const advancedBin = {buffer: bins[0], baseURL: projectURL('')};
const tinyBin = {buffer: bins[1], baseURL: projectURL('')};
const boxGLB = {buffer: bins[2], baseURL: resourceURL('')};
const boxExtensionsGLB = {buffer: bins[3], baseURL: resourceURL('')};

describe('PrefabGLTF', function () {
    let scene: PrefabGLTF;
    before(async function () {
        reset();
        scene = await WL.loadGLTFFromBuffer(boxGLB);
    });

    it('can modify scene graph', function () {
        class TestComponent extends Component {
            static TypeName = 'test-component';
            started = 0;
            start() {
                ++this.started;
            }
        }
        WL.registerComponent(TestComponent);

        const count = scene.children.length;
        const obj = scene.addObject();
        obj.name = 'wonderland';
        expect(obj.name).to.equal('wonderland');
        expect(scene.children).to.have.lengthOf(count + 1);

        /* Ensure we can add a component of each type */
        const classes: ComponentConstructor[] = [
            AnimationComponent,
            CollisionComponent,
            InputComponent,
            ViewComponent,
            LightComponent,
            MeshComponent,
            PhysXComponent,
            TestComponent,
        ];
        for (const ctor of classes) {
            const added = obj.addComponent(ctor)!;
            const comp = obj.getComponent(ctor)!;
            expect(comp).to.not.be.undefined;
            expect(added._id).to.equal(comp._id);
        }
    });
});

describe('SceneGLTF > Extensions', function () {
    let mainScene: Scene;
    let scene: PrefabGLTF;

    before(async function () {
        reset();

        mainScene = await WL.loadMainSceneFromBuffer(tinyBin);
        scene = await WL.loadGLTFFromBuffer({
            ...boxExtensionsGLB,
            extensions: true,
        });
    });

    it('raw extensions', function () {
        const rawExtensions = scene.extensions!;
        expect(rawExtensions, 'extensions not marshalled').to.not.be.null;
        expect(rawExtensions.root).to.eql({'TEST_root_extension': {}});
    });

    for (let i = 0; i < 2; ++i) {
        it(`instantiation ${i}`, function () {
            const result = mainScene.instantiate(scene)!;
            expect(result, 'instantiation in non active root').to.not.be.undefined;

            const {root, extensions} = result;

            expect(root).to.be.an.instanceof(Object3D);
            expect(extensions, 'extensions not remapped').to.not.be.null;
            expect(extensions).to.have.all.keys('node', 'mesh', 'idMapping');

            const child = root.children[0];
            const grandChild = child.children[0];

            expect(extensions!.node).to.have.all.keys(grandChild._localId);
            expect(extensions!.node[grandChild._localId]).to.eql({
                'TEST_node_extension': {},
            });
            expect(extensions!.mesh).to.have.all.keys(grandChild._localId);
            expect(extensions!.mesh[grandChild._localId]).to.eql({
                'TEST_mesh_extension': {},
            });
        });
    }
});

describe('Scene GLTF > Legacy', function () {
    beforeEach(reset);

    describe('append()', function () {
        it('.glb', async function () {
            /* Make sure we have all the pipelines used in the streamed .bin */
            await WL.scene.load(advancedBin);
            const root = (await WL.scene.append(boxGLB.buffer)) as Object3D;

            expect(root).to.be.an.instanceof(Object3D);
            expect(root.children).to.have.a.lengthOf(1);
            const child = root.children[0];
            expect(child.children).to.have.a.lengthOf(1);
            const grandChild = child.children[0];

            const meshComponents = grandChild.getComponents('mesh') as MeshComponent[];
            expect(meshComponents).to.have.a.lengthOf(1);
            const mesh = meshComponents[0].mesh;
            expect(mesh).to.not.be.null;
            expect(mesh!.vertexCount).to.equal(24);
        });

        it('.glb with textures', async function () {
            /* Make sure we have all the pipelines used in the streamed .bin */
            await WL.scene.load(advancedBin);

            /* Appends two dummy textures to ensure images indices are correct. */
            const dummyImages = await Promise.all([dummyImage(42, 42), dummyImage(43, 43)]);
            new Texture(WL, dummyImages[0]);
            new Texture(WL, dummyImages[1]);

            const root = (await WL.scene.append(
                resourceURL('TwoPlanesWithTextures.glb')
            )) as Object3D;
            expect(root).to.be.an.instanceof(Object3D);
            expect(root.children).to.have.a.lengthOf(2);

            /* Ensure images are properly retargeted. */
            const images = await WL.imagesPromise;
            expect([images[0].width, images[0].height]).to.eql([2, 2]);
            expect(images[1]).to.equal(dummyImages[0]);
            expect(images[2]).to.equal(dummyImages[1]);

            /* The .glb contains two textures: 2x2 and 4x4 */
            expect([images[3].width, images[3].height]).to.eql([2, 2]);
            expect([images[4].width, images[4].height]).to.eql([4, 4]);

            const objA = root.findByName('PlaneA')[0];
            expect(objA).to.not.be.undefined;
            const objB = root.findByName('PlaneB')[0];
            expect(objB).to.not.be.undefined;

            const compA = objA.getComponent('mesh');
            expect(compA).to.not.be.undefined;
            const materialA = compA?.material as PhongMaterial;
            expect(materialA).to.not.be.undefined;
            expect(materialA.pipeline).to.equal('Phong Opaque Textured');
            expect(materialA.shininess).to.be.lessThanOrEqual(20);
            {
                const texture = materialA.diffuseTexture;
                expect([texture.width, texture.height]).to.eql([2, 2]);
            }

            const compB = objB.getComponent('mesh');
            expect(compB).to.not.be.undefined;
            const materialB = compB?.material as PhongMaterial;
            expect(materialB).to.not.be.undefined;
            expect(materialB.pipeline).to.equal('Phong Opaque Textured');
            expect(materialB.shininess).to.be.greaterThanOrEqual(140);
            {
                const texture = materialB.diffuseTexture;
                expect([texture.width, texture.height]).to.eql([4, 4]);
            }
        });

        it('.glb, loadGltfExtensions', async function () {
            /* Make sure we have all the pipelines used in the streamed .bin */
            await WL.scene.load(advancedBin);

            const {root, extensions} = (await WL.scene.append(boxExtensionsGLB.buffer, {
                loadGltfExtensions: true,
            })) as SceneAppendResultWithExtensions;

            expect(root).to.be.an.instanceof(Object3D);

            expect(extensions).to.have.all.keys('root', 'node', 'mesh', 'idMapping');
            expect(extensions.root).to.eql({'TEST_root_extension': {}});

            const child = root!.children[0];
            const grandChild = child.children[0];
            expect(extensions.node).to.have.all.keys(grandChild.objectId);
            expect(extensions.node[grandChild.objectId]).to.eql({
                'TEST_node_extension': {},
            });
            expect(extensions.mesh).to.have.all.keys(grandChild.objectId);
            expect(extensions.mesh[grandChild.objectId]).to.eql({
                'TEST_mesh_extension': {},
            });
        });
    });
});
