import {WonderlandEngine} from '../index.js';
import {Mesh, MeshIndexType, MeshParameters, MeshSkinningType} from '../wonderland.js';

import {ResourceManager} from './resource.js';

/**
 * Manage meshes.
 *
 * #### Creation
 *
 * Creating a mesh is done using {@link MeshManager.create}:
 *
 * ```js
 * const mesh = engine.meshes.create({vertexCount: 3, indexData: [0, 1, 2]});
 * ```
 *
 * @since 1.2.0
 */
export class MeshManager extends ResourceManager<Mesh> {
    constructor(engine: WonderlandEngine) {
        super(engine, Mesh);
    }

    /**
     * Create a new mesh.
     *
     * @param params Vertex and index data. For more information, have a look
     *     at the {@link MeshParameters} object.
     */
    create(params: Partial<MeshParameters>) {
        if (!params.vertexCount) throw new Error("Missing parameter 'vertexCount'");

        const wasm = this.engine.wasm;

        let indexData = 0;
        let indexType = 0;
        let indexDataSize = 0;
        if (params.indexData) {
            indexType = params.indexType || MeshIndexType.UnsignedShort;
            indexDataSize = params.indexData.length * indexType;
            indexData = wasm._malloc(indexDataSize);
            /* Copy the index data into wasm memory */
            switch (indexType) {
                case MeshIndexType.UnsignedByte:
                    wasm.HEAPU8.set(params.indexData, indexData);
                    break;
                case MeshIndexType.UnsignedShort:
                    wasm.HEAPU16.set(params.indexData, indexData >> 1);
                    break;
                case MeshIndexType.UnsignedInt:
                    wasm.HEAPU32.set(params.indexData, indexData >> 2);
                    break;
            }
        }

        const {skinningType = MeshSkinningType.None} = params;

        const index = wasm._wl_mesh_create(
            indexData,
            indexDataSize,
            indexType,
            params.vertexCount,
            skinningType
        );
        const instance = new Mesh(this._host, index);
        this._cache[instance.index] = instance;
        return instance;
    }
}
