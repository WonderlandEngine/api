import {WonderlandEngine} from '../engine.js';
import {NumberArray} from '../types.js';
import {capitalizeFirstUTF8, createDestroyedProxy} from '../utils/misc.js';
import {Font, Texture} from '../wonderland.js';

import {Resource, ResourceManager, SceneResource} from './resource.js';

/**
 * Material parameter type.
 */
export enum MaterialParamType {
    /** Unsigned integer parameter type. */
    UnsignedInt = 0,
    /** Integer parameter type. */
    Int = 1,
    /** 16-bit float parameter type. */
    HalfFloat = 2,
    /** Float parameter type. */
    Float = 3,
    /** Sampler resource parameter type, i.e., a {@link Texture}. */
    Sampler = 4,
    /**
     * Font resource parameter type.
     *
     * **Note**: Changing font isn't exposed yet and will raise an error.
     */
    Font = 5,
}

/**
 * Constructor parameters object for a {@link Material} instance.
 *
 * @deprecated Use {@link MaterialManager#getTemplate} instead:
 *
 * ```js
 * const PhongMaterial = engine.materials.getTemplate('Phong Opaque');
 * const material = new PhongMaterial();
 * material.setDiffuseColor([1, 0, 0]);
 * ```
 */
export interface MaterialParameters {
    /** The name of the pipeline. */
    pipeline: string;
}

/**
 * Material constructor.
 *
 * Material classes are automatically generated by the runtime based on the
 * loaded scene shaders.
 */
export interface MaterialConstructor<T extends Material = Material> {
    /**
     * Set of the dynamic parameters that exist on the definition.
     *
     * For instance, the set would contain elements such as `ambientColor`, `diffuseColor`
     * for a Phong material.
     */
    readonly Parameters: Set<string>;
    /**
     * Create a new Material.
     *
     * The material is created from the pipeline associated to the material class.
     *
     * @note Creating material is expensive. Please use {@link Material#clone} to clone a material.
     * @note Do not use this constructor directly with an index, this is reserved for internal purposes.
     */
    new (index?: number): T;
}

/**
 * Wrapper around a native material.
 *
 * For more information about how to create materials, have a look at the
 * {@link MaterialManager} class.
 *
 * #### Properties
 *
 * The material properties are automatically converted into getters/setters:
 *
 * ```js
 * const material = new PhongMaterial();
 *
 * // Set the `diffuseColor` property
 * material.setDiffuseColor([1.0, 0.0, 0.0, 1.0]);
 * console.log(material.getDiffuseColor());
 * ```
 *
 * Getters for non-scalar types have an optional argument to skip an array
 * allocation:
 *
 * ```js
 * const material = new PhongMaterial();
 * const diffuse = [0, 0, 0, 0];
 * material.getDiffuseColor(diffuse);
 * console.log(diffuse) // Prints '[1.0, 1.0, 1.0, 1.0]'
 * ```
 *
 * @note Materials are **per-engine**, they can thus be shared by multiple scenes.
 *
 * #### TypeScript
 *
 * The Wonderland Editor can automatically generate material definitions (.d.ts)
 * from the project pipelines.
 *
 * To enable the generation, go to the `Project Settings > JavaScript` panel and
 * set `materialDefinitions` to a path, e.g., `materials.d.ts`.
 *
 * It's then possible to cast the material type using:
 *
 * ```ts
 * // Note the `.js` instead of `.d.ts`
 * import {PhongOpaque} from './materials.js';
 *
 * const mesh = object.getComponent('mesh');
 * const material = mesh.material as PhongOpaque;
 * material.setDiffuseColor([1, 0, 0, 1]); // Set a red diffuse
 * ```
 *
 * @since 1.2.0
 */
export class Material extends Resource {
    /** Proxy used to override prototypes of destroyed materials. */
    static readonly _destroyedPrototype = createDestroyedProxy('material');

    /**
     * @deprecated Use {@link MaterialManager#getTemplate} via {@link WonderlandEngine.materials}
     * to create a new material with a given pipeline:
     *
     * ```js
     * const PhongMaterial = engine.materials.getTemplate('Phong Opaque');
     * const material = new PhongMaterial();
     * material.setDiffuseColor([1, 0, 0]);
     * ```
     */
    constructor(engine: WonderlandEngine, params: number | MaterialParameters) {
        if (typeof params !== 'number') {
            if (!params?.pipeline) throw new Error("Missing parameter 'pipeline'");
            const template = engine.materials.getTemplate(params.pipeline);
            const material = new template();
            super(engine, material._index);
            return material;
        }
        super(engine, params);
    }

    /**
     * Check whether a parameter exists on this material.
     *
     * @param name The name to check.
     * @returns `true` if the parameter with name `name` exists on this material,
     *     `false` otherwise.
     */
    hasParameter(name: string) {
        const parameters = (this.constructor as MaterialConstructor).Parameters;
        return parameters && parameters.has(name);
    }

    /** @deprecated Use {@link pipeline} instead. */
    get shader(): string {
        return this.pipeline;
    }

    /** Name of the pipeline used by this material. */
    get pipeline(): string {
        const wasm = this.engine.wasm;
        return wasm.UTF8ToString(wasm._wl_material_get_pipeline(this._id));
    }

    /**
     * Create a copy of the underlying native material.
     *
     * @returns Material clone.
     */
    clone(): Material | null {
        const index = this.engine.wasm._wl_material_clone(this._id);
        return this.engine.materials.wrap(index);
    }

    toString() {
        if (this.isDestroyed) {
            return 'Material(destroyed)';
        }
        return `Material('${this.pipeline}', ${this._index})`;
    }

    /**
     * Wrap a native material index.
     *
     * @param engine Engine instance.
     * @param index The index.
     * @returns Material instance or `null` if index <= 0.
     *
     * @deprecated Use the {@link WonderlandEngine.materials} instead.
     */
    static wrap(engine: WonderlandEngine, index: number): Material | null {
        return engine.materials.wrap(index);
    }
}

/**
 * Manage materials.
 *
 * #### Creation
 *
 * To create a material, first retrieve the class associated to
 * the pipeline using {@link MaterialManager.getTemplate}:
 *
 * ```js
 * const PhongMaterial = engine.materials.getTemplate('Phong Opaque');
 * ```
 *
 * Creating a material is then done using the constructor:
 *
 * ```js
 * const material = new PhongMaterial();
 * material.setDiffuseColor([1.0, 0.0, 0.0, 1.0]);
 * ```
 */
export class MaterialManager extends ResourceManager<Material> {
    /** Material classes. @hidden. */
    private readonly _materialTemplates: MaterialConstructor[] = [];

    /** @hidden */
    constructor(engine: WonderlandEngine) {
        super(engine, Material);
        this._cacheDefinitions();
    }

    /** @override */
    wrap(index: number) {
        if (index <= 0) return null;

        const cached = this._cache[index];
        if (cached) return cached;

        const wasm = this.engine.wasm;
        const definition = wasm._wl_material_get_definition(index);

        const Template = this._materialTemplates[definition];
        const material = new Template(index);
        return this._wrapInstance(material);
    }

    /**
     * Get the material class with the given pipeline name.
     *
     * #### Usage
     *
     * ```js
     * const PhongMaterial = engine.materials.getTemplate('Phong Opaque');
     * const material = new PhongMaterial();
     * material.setDiffuseColor([1.0, 0.0, 0.0, 1.0]);
     * ```
     *
     * #### TypeScript
     *
     * This method provide a simple way to cast the constructor returned by `getTemplate`:
     *
     * ```ts
     * interface Phong {
     *     getAmbientColor(out?: Float32Array): Float32Array;
     *     setAmbientColor(value: NumberArray): void;
     * }
     * const PhongMaterial = engine.materials.getTemplate<Phong>('Phong Opaque');
     * const mat = new PhongMaterial(); // `mat` is of type `Phong`
     * ```
     *
     * However, this means manually writing types for each pipeline.
     *
     * Fortunately, The Wonderland Editor can automatically generate material definitions (.d.ts)
     * from the project pipelines.
     *
     * To enable the generation, go to the `Project Settings > JavaScript` panel and
     * set `materialDefinitions` to a path, e.g., `materials.d.ts`.
     *
     * Material constructors will then be typed automatically when using a string literal pipeline name:
     *
     * ```ts
     * // Note the `.js` instead of `.d.ts`
     * import {PhongOpaque} from './materials.js';
     *
     * const PhongMaterial = engine.materials.getTemplate('Phong Opaque');
     * const mat = new PhongMaterial(); // `mat` is of type `PhongOpaque`
     * ```
     *
     * @param pipeline The pipeline name to search for.
     * @returns The material class.
     *
     * @throws `Error` if the material class doesn't exist.
     */
    getTemplate<T extends Material = Material>(pipeline: string): MaterialConstructor<T> {
        const wasm = this.engine.wasm;
        const index = wasm._wl_get_material_definition_index(wasm.tempUTF8(pipeline));
        if (!index) {
            throw new Error(`Pipeline '${pipeline}' doesn't exist in the scene`);
        }
        return this._materialTemplates[index] as MaterialConstructor<T>;
    }

    /**
     * Wrap a material instance.
     *
     * @todo: Remove at 2.0.0.
     *
     * @note Wrapping should only be called once per instance.
     *
     * @param instance The material instance.
     * @returns The new material, wrapped in a proxy.
     */
    _wrapInstance(instance: Material): Material {
        this._cache[instance.index] = instance;
        if (!this.engine.legacyMaterialSupport) return instance;

        /** @todo: Remove at 2.0.0. This is kept for backward compatibility. */
        const proxy = new Proxy(instance, {
            get(target: Material, prop: string) {
                if (!target.hasParameter(prop)) {
                    return (target as Record<string, any>)[prop];
                }
                /** This is slow, but users should migrate to `getParam` */
                const name = `get${capitalizeFirstUTF8(prop)}`;
                return (target as Record<string, any>)[name]();
            },
            set(target, prop: string, value) {
                if (!target.hasParameter(prop)) {
                    (target as Record<string | symbol, any>)[prop] = value;
                    return true;
                }
                /** This is slow, but users should migrate to `getParam` */
                const name = `set${capitalizeFirstUTF8(prop)}`;
                (target as Record<string, any>)[name](value);
                return true;
            },
        });
        this._cache[instance.index] = proxy;
        return proxy;
    }

    /**
     * Cache all pipeline definitions.
     *
     * @hidden
     */
    private _cacheDefinitions() {
        const wasm = this.engine.wasm;
        const count = wasm._wl_get_material_definition_count();
        for (let i = 0; i < count; ++i) {
            this._materialTemplates[i] = this._createMaterialTemplate(i);
        }
    }

    /**
     * Create a material class from a definition index.
     *
     * @param wasm The WASM instance.
     * @param definitionIndex The definition index to wrap.
     * @returns The material class.
     */
    private _createMaterialTemplate(definitionIndex: number) {
        const engine = this.engine;
        const template = class CustomMaterial extends Material {
            static Parameters: Set<string> = new Set();

            constructor(index?: number) {
                index = index ?? engine.wasm._wl_material_create(definitionIndex);
                super(engine, index);
                /** @todo(2.0.0): Unify with Material. We need to wrap in both since materials
                 * can be created via the parent class, or via child classes.
                 * In addition, wrapping returns a proxy, we want to support Proxy<Material>
                 * as well as Proxy<CustomMaterial>. */
                return engine.materials._wrapInstance(this);
            }
        };

        const wasm = this.engine.wasm;
        const nbParams = wasm._wl_material_definition_get_param_count(definitionIndex);
        for (let index = 0; index < nbParams; ++index) {
            const name = wasm.UTF8ToString(
                wasm._wl_material_definition_get_param_name(definitionIndex, index)
            );
            template.Parameters.add(name);

            const t = wasm._wl_material_definition_get_param_type(definitionIndex, index);
            const type = t & 0xff;
            const componentCount = (t >> 8) & 0xff;
            /* metaType could also be extracted using: (t >> 16) & 0xff */

            const capitalized = capitalizeFirstUTF8(name);
            const getterId = `get${capitalized}`;
            const setterId = `set${capitalized}`;

            const templateProto = template.prototype as Record<string, any>;
            switch (type) {
                case MaterialParamType.UnsignedInt:
                    templateProto[getterId] = uint32Getter(index, componentCount);
                    /* For now, it's only possible to set scalar uint values */
                    templateProto[setterId] = uint32Setter(index);
                    break;
                case MaterialParamType.Int:
                    templateProto[getterId] = int32Getter(index, componentCount);
                    /* For now, it's only possible to set scalar int values. Integer values setter
                     * is purposely shared with uint. */
                    templateProto[setterId] = uint32Setter(index);
                    break;
                case MaterialParamType.HalfFloat:
                case MaterialParamType.Float:
                    templateProto[getterId] = float32Getter(index, componentCount);
                    templateProto[setterId] = float32Setter(index);
                    break;
                case MaterialParamType.Sampler:
                    templateProto[getterId] = samplerGetter(index);
                    templateProto[setterId] = samplerSetter(index);
                    break;
                case MaterialParamType.Font:
                    templateProto[getterId] = fontGetter(index);
                    /* For now, setting fonts is not supported */
                    break;
            }
        }

        return template as MaterialConstructor;
    }
}

/** @todo: With this implementation, `_wl_material_get_param_value`
 * do not need to check for the parameter type anymore, we could use
 * explicit calls. */

function uint32Getter(index: number, count: number) {
    if (count === 1) {
        return function (this: Material) {
            const wasm = this.engine.wasm;
            wasm._wl_material_get_param_value(this._id, index, wasm._tempMem);
            return wasm._tempMemUint32[0];
        };
    }
    return function (this: Material, out: NumberArray = new Uint32Array(count)) {
        const wasm = this.engine.wasm;
        wasm._wl_material_get_param_value(this._id, index, wasm._tempMem);
        for (let i = 0; i < out.length; ++i) {
            out[i] = wasm._tempMemUint32[i];
        }
        return out;
    };
}

function uint32Setter(index: number) {
    return function (this: Material, value: number) {
        const wasm = this.engine.wasm;
        wasm._wl_material_set_param_value_uint(this._id, index, value);
    };
}

function int32Getter(index: number, count: number) {
    if (count === 1) {
        return function (this: Material) {
            const wasm = this.engine.wasm;
            wasm._wl_material_get_param_value(this._id, index, wasm._tempMem);
            return wasm._tempMemInt[0];
        };
    }
    return function (this: Material, out: NumberArray = new Int32Array(count)) {
        const wasm = this.engine.wasm;
        wasm._wl_material_get_param_value(this._id, index, wasm._tempMem);
        for (let i = 0; i < out.length; ++i) {
            out[i] = wasm._tempMemInt[i];
        }
        return out;
    };
}

function float32Getter(index: number, count: number) {
    if (count === 1) {
        return function (this: Material) {
            const wasm = this.engine.wasm;
            wasm._wl_material_get_param_value(this._id, index, wasm._tempMem);
            return wasm._tempMemFloat[0];
        };
    }
    return function (this: Material, out: NumberArray = new Float32Array(count)) {
        const wasm = this.engine.wasm;
        wasm._wl_material_get_param_value(this._id, index, wasm._tempMem);
        for (let i = 0; i < out.length; ++i) {
            out[i] = wasm._tempMemFloat[i];
        }
        return out;
    };
}

function float32Setter(index: number) {
    return function (this: Material, value: number | NumberArray) {
        const wasm = this.engine.wasm;

        let count = 1;
        if (typeof value === 'number') {
            wasm._tempMemFloat[0] = value;
        } else {
            count = value.length;
            for (let i = 0; i < count; ++i) wasm._tempMemFloat[i] = value[i];
        }
        wasm._wl_material_set_param_value_float(this._id, index, wasm._tempMem, count);
    };
}

function samplerGetter(index: number) {
    return function (this: Material) {
        const wasm = this.engine.wasm;
        wasm._wl_material_get_param_value(this._id, index, wasm._tempMem);
        return this.engine.textures.wrap(wasm._tempMemInt[0]);
    };
}

function samplerSetter(index: number) {
    return function (this: Material, value: Texture | null | undefined) {
        const wasm = this.engine.wasm;
        wasm._wl_material_set_param_value_uint(this._id, index, value?._id ?? 0);
    };
}

function fontGetter(index: number) {
    return function (this: Material) {
        const wasm = this.engine.wasm;
        wasm._wl_material_get_param_value(this._id, index, wasm._tempMem);
        return this.engine.fonts.wrap(wasm._tempMemInt[0]);
    };
}
