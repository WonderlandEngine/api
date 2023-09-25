/**
 * Component property type.
 */
export enum Type {
    /**
     * **Native**
     *
     * Property of a native component. Must not be used in custom components.
     *
     * @hidden
     */
    Native = 1 << 0,

    /**
     * **Bool**:
     *
     * Appears in the editor as a checkbox.
     *
     * Initial value is `false`, unless overridden by the `default` property.
     */
    Bool = 1 << 1,

    /**
     * **Int**:
     *
     * Appears in the editor as an integer input field.
     *
     * Initial value is `0`, unless overridden by the `default` property.
     */
    Int = 1 << 2,

    /**
     * **Float**:
     *
     * Appears in the editor as a floating point input field.
     *
     * Initial value is `0.0`, unless overridden by the `default` property.
     */
    Float = 1 << 3,

    /**
     * **String / Text**:
     *
     * Appears in the editor as a single-line text input field.
     *
     * Initial value is an empty string, unless overridden by the `default`
     * property.
     */
    String = 1 << 4,

    /**
     * **Enumeration**:
     *
     * Appears in the editor as a dropdown with given values. The additional
     * `values` parameter with selection options is mandatory.
     *
     * The property value is resolved to an **index** into the `values` array.
     *
     * Initial value is the first element in `values`, unless overridden by
     * the `default` property. The `default` value can be a string or an index
     * into `values`.
     *
     * @example
     *
     * ```js
     *     camera: {type: Type.Enum, values: ['auto', 'back', 'front'], default: 'auto'},
     * ```
     */
    Enum = 1 << 5,

    /**
     * **Object reference**:
     *
     * Appears in the editor as an object resource selection dropdown
     * with object picker.
     *
     * Initial value is `null`.
     */
    Object = 1 << 6,

    /**
     * **Mesh reference**:
     *
     * Appears in the editor as a mesh resource selection dropdown.
     *
     * Initial value is `null`.
     */
    Mesh = 1 << 7,

    /**
     * **Texture reference**:
     *
     * Appears in the editor as a texture resource selection dropdown.
     *
     * Initial value is `null`.
     */
    Texture = 1 << 8,

    /**
     * **Material reference**:
     *
     * Appears in the editor as a material resource selection dropdown.
     *
     * Initial value is `null`.
     */
    Material = 1 << 9,

    /**
     * **Animation reference**:
     *
     * Appears in the editor as an animation resource selection dropdown.
     *
     * Initial value is `null`.
     */
    Animation = 1 << 10,

    /**
     * **Skin reference**:
     *
     * Appears in the editor as a skin resource selection dropdown.
     *
     * Initial value is `null`.
     */
    Skin = 1 << 11,

    /**
     * **Color**:
     *
     * Appears in the editor as a color widget.
     *
     * Initial value is `[0.0, 0.0, 0.0, 1.0]`, unless overridden by the
     * `default` property.
     */
    Color = 1 << 12,
}

/**
 * Custom component property.
 *
 * For more information about component properties, have a look
 * at the {@link Component.Properties} attribute.
 */
export interface ComponentProperty {
    /** Property type. */
    type: Type;
    /** Default value, depending on type. */
    default?: any;
    /** Values for {@link Type.Enum} */
    values?: string[];
    required?: boolean;
}

/**
 * Component property namespace.
 *
 * Usage:
 *
 * ```js
 * import {Component, Property} from '@wonderlandengine/api';
 *
 * class MyComponent extends Component {
 *     static Properties = {
 *         myBool: Property.bool(true),
 *         myInt: Property.int(42),
 *         myString: Property.string('Hello World!'),
 *         myMesh: Property.mesh(),
 *     }
 * }
 * ```
 *
 * For TypeScript users, you can use the decorators instead.
 */
export const Property = {
    /**
     * Create an boolean property.
     *
     * @param defaultValue The default value. If not provided, defaults to `false`.
     */
    bool(defaultValue: boolean = false): ComponentProperty {
        return {type: Type.Bool, default: defaultValue};
    },

    /**
     * Create an integer property.
     *
     * @param defaultValue The default value. If not provided, defaults to `0`.
     */
    int(defaultValue: number = 0): ComponentProperty {
        return {type: Type.Int, default: defaultValue};
    },

    /**
     * Create an float property.
     *
     * @param defaultValue The default value. If not provided, defaults to `0.0`.
     */
    float(defaultValue: number = 0.0): ComponentProperty {
        return {type: Type.Float, default: defaultValue};
    },

    /**
     * Create an string property.
     *
     * @param defaultValue The default value. If not provided, defaults to `''`.
     */
    string(defaultValue = ''): ComponentProperty {
        return {type: Type.String, default: defaultValue};
    },

    /**
     * Create an enumeration property.
     *
     * @param values The list of values.
     * @param defaultValue The default value. Can be a string or an index into
     *     `values`. If not provided, defaults to the first element.
     */
    enum(values: string[], defaultValue?: string | number): ComponentProperty {
        return {type: Type.Enum, values, default: defaultValue};
    },

    /** Create an {@link Object3D} reference property. */
    object(opts?: PropertyReferenceOptions): ComponentProperty {
        return {type: Type.Object, default: null, required: opts?.required ?? false};
    },

    /** Create a {@link Mesh} reference property. */
    mesh(opts?: PropertyReferenceOptions): ComponentProperty {
        return {type: Type.Mesh, default: null, required: opts?.required ?? false};
    },

    /** Create a {@link Texture} reference property. */
    texture(opts?: PropertyReferenceOptions): ComponentProperty {
        return {type: Type.Texture, default: null, required: opts?.required ?? false};
    },

    /** Create a {@link Material} reference property. */
    material(opts?: PropertyReferenceOptions): ComponentProperty {
        return {type: Type.Material, default: null, required: opts?.required ?? false};
    },

    /** Create an {@link Animation} reference property. */
    animation(opts?: PropertyReferenceOptions): ComponentProperty {
        return {type: Type.Animation, default: null, required: opts?.required ?? false};
    },

    /** Create a {@link Skin} reference property. */
    skin(opts?: PropertyReferenceOptions): ComponentProperty {
        return {type: Type.Skin, default: null, required: opts?.required ?? false};
    },

    /**
     * Create a color property.
     *
     * @param r The red component, in the range [0; 1].
     * @param g The green component, in the range [0; 1].
     * @param b The blue component, in the range [0; 1].
     * @param a The alpha component, in the range [0; 1].
     */
    color(r = 0.0, g = 0.0, b = 0.0, a = 1.0): ComponentProperty {
        return {type: Type.Color, default: [r, g, b, a]};
    },
};

/**
 * Options to create a reference property, i.e.,
 * object, mesh, animation, skin, etc...
 */
export interface PropertyReferenceOptions {
    /** If `true`, the component will throw if the property isn't initialized. */
    required?: boolean;
}

/** All the keys that exists on the {@link Property} object. */
export type PropertyKeys = keyof typeof Property;

/** Retrieve all the argument types of a {@link Property} function. */
export type PropertyArgs<key extends PropertyKeys> = Parameters<typeof Property[key]>;
