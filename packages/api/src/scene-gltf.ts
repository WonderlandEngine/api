import {WonderlandEngine} from './index.js';
import {InstantiateGltfResult, Scene} from './scene.js';
import {Prefab} from './prefab.js';
import {Object3D} from './wonderland.js';

/** GLTF-specific loading options. */
export type GLTFOptions = {
    /** If `true`, extensions will be parsed. */
    extensions?: boolean;
};

/**
 * Extension data obtained from glTF files.
 */
export interface GLTFExtensionsInstance {
    /**
     * Mesh extension objects. Key is {@link Object3D.objectId}, value is JSON
     * data indexed by extension name.
     */
    mesh: Record<number, Record<string, Record<string, any>>>;
    /**
     * Node extension objects. Key is {@link Object3D.objectId}, value is JSON
     * data indexed by extension name.
     */
    node: Record<number, Record<string, Record<string, any>>>;
    /** Remapping from glTF node index to {@link Object3D.objectId}. */
    idMapping: number[];
}

export class GLTFExtensions {
    objectCount: number;
    /** glTF root extensions object. JSON data indexed by extension name. */
    root: Record<string, any> = {};
    /**
     * Mesh extension objects. Key is the gltf index, value is JSON
     * data indexed by extension name.
     */
    mesh: Record<number, Record<string, any>> = {};
    /**
     * Node extension objects. Key is a glTF index, value is JSON
     * data indexed by extension name.
     */
    node: Record<number, Record<string, any>> = {};

    constructor(count: number) {
        this.objectCount = count;
    }
}

/**
 * glTF scene.
 *
 * At the opposite of {@link Scene}, glTF scenes can be instantiated
 * in other scenes but can't:
 * - Be activated
 * - Be the destination of an instantiation
 *
 * #### Usage
 *
 * ```js
 * const prefab = await engine.loadGLTF('Zombie.glb');
 *
 * const scene = engine.scene;
 * for (let i = 0; i < 100; ++i) {
 *     scene.instantiate(prefab);
 * }
 * ```
 *
 * Since this class inherits from {@link Prefab}, you can use the shared
 * API to modify the glTF before an instantiation:
 *
 * ```js
 * const prefab = await engine.loadGLTF('Zombie.glb');
 * const zombie = prefab.findByName('Zombie')[0];
 *
 * // The mesh is too small, we scale the root
 * zombie.setScalingWorld([2, 2, 2]);
 * // Add a custom js 'health' component to the root
 * zombie.addComponent('health', {value: 100});
 *
 * // 'Zombie' is wrapped in a new root added during instantiation
 * const {root} = engine.scene.instantiate(prefab);
 * const instanceZombie = root.children[0];
 * console.log(instanceZombie.getScalingWorld()); // Prints '[2, 2, 2]'
 * ```
 *
 * @category scene
 * @since 1.2.0
 */
export class PrefabGLTF extends Prefab {
    /**
     * Raw extensions read from the glTF file.
     *
     * The extensions will be mapped to the hierarchy upon instantiation.
     * For more information, have a look at the {@link InstantiateGltfResult} type.
     *
     * @note The glTF must be loaded with `extensions` enabled. If not, this
     * field will be set to `null`. For more information, have a look at the
     * {@link GLTFOptions} type.
     */
    extensions: GLTFExtensions | null = null;

    /**
     * @note This api is meant to be used internally.
     *
     * @hidden
     */
    constructor(engine: WonderlandEngine, index: number) {
        super(engine, index);
        this.extensions = this._readExtensions();
    }

    /**
     * Instantiate the glTF extensions on an active sub scene graph.
     *
     * @param id The root object id.
     * @param result The instantiation object result.
     *
     * @hidden
     */
    _processInstantiaton(dest: Prefab, root: Object3D, result: InstantiateGltfResult) {
        if (!this.extensions) return null;

        const wasm = this.engine.wasm;

        const count = this.extensions.objectCount;
        const idMapping: number[] = new Array(count);

        /** @todo: We need some check to ensure that the gltf layout didn't change to retarget extensions.
         * At least a simple scene graph size check should be required to avoid a segfault. */

        const activeRootIndex = wasm._wl_object_index(root._id);
        for (let i = 0; i < count; ++i) {
            const mappedId = wasm._wl_glTF_scene_extensions_gltfIndex_to_id(
                this._index,
                dest._index,
                activeRootIndex,
                i
            );
            idMapping[i] = mappedId;
        }

        const remapped: GLTFExtensionsInstance = {
            mesh: {},
            node: {},
            idMapping,
        };

        for (const gltfIndex in this.extensions.mesh) {
            const id = idMapping[gltfIndex];
            remapped.mesh[id] = this.extensions.mesh[gltfIndex];
        }
        for (const gltfIndex in this.extensions.node) {
            const id = idMapping[gltfIndex];
            remapped.node[id] = this.extensions.node[gltfIndex];
        }

        result.extensions = remapped;
    }

    /**
     * Unmarshalls gltf extensions.
     *
     * @hidden
     */
    private _readExtensions() {
        const wasm = this.engine.wasm;

        const ptr = wasm._wl_glTF_scene_get_extensions(this._index);
        if (!ptr) return null;

        let index = ptr / 4;
        const data = wasm.HEAPU32;
        const readString = () => {
            const strPtr = data[index++];
            const strLen = data[index++];
            return wasm.UTF8ViewToString(strPtr, strPtr + strLen);
        };

        const objectCount = data[index++];
        const extensions = new GLTFExtensions(objectCount);

        const meshExtensionsSize = data[index++];
        for (let i = 0; i < meshExtensionsSize; ++i) {
            const objectId = data[index++];
            extensions.mesh[objectId] = JSON.parse(readString());
        }
        const nodeExtensionsSize = data[index++];
        for (let i = 0; i < nodeExtensionsSize; ++i) {
            const objectId = data[index++];
            extensions.node[objectId] = JSON.parse(readString());
        }
        const rootExtensionsStr = readString();
        if (rootExtensionsStr) {
            extensions.root = JSON.parse(rootExtensionsStr);
        }

        return extensions;
    }
}
