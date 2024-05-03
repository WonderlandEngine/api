/**
 * This component uses the local api on purpose.
 *
 * This greatly simplify the testing process, since we don't need
 * to install the `wonderlandengine/api` package in the project.
 */
import {
    Animation,
    Component,
    Material,
    Mesh,
    Object3D,
    Property,
    Skin,
    Texture,
} from '../../../..';

export class TestComponentRetarget extends Component {
    static TypeName = 'test-component-retarget-params';

    static Properties = {
        animationProp: Property.animation(),
        materialProp: Property.material(),
        meshProp: Property.mesh(),
        textureProp: Property.texture(),
        objectProp: Property.object(),
        skinProp: Property.skin(),

        /* Reference properties set to `null` to ensure no retargeting occurs */
        animationPropUnset: Property.animation(),
        materialPropUnset: Property.material(),
        meshPropUnset: Property.mesh(),
        texturePropUnset: Property.texture(),
        objectPropUnset: Property.object(),
        skinPropUnset: Property.skin(),

        /* Non-reference properties to ensure no retargeting occurs */
        boolProp: Property.bool(),
        intProp: Property.int(),
        floatProp: Property.float(),
        enumProp: Property.enum(['a', 'b']),
        colorProp: Property.color(),
        vector2Prop: Property.vector2(),
        vector3Prop: Property.vector3(),
        vector4Prop: Property.vector4(),

        /* Defaulted number properties to ensure serializing as undefined works */
        boolPropUnset: Property.bool(true),
        intPropUnset: Property.int(7),
        floatPropUnset: Property.float(1.2),
        enumPropUnset: Property.enum(['a', 'b', 'c'], 'c'),
        colorPropUnset: Property.color(0.1, 0.2, 0.3, 0.4),
        vector2PropUnset: Property.vector2(1.0, 2.0),
        vector3PropUnset: Property.vector3(3.0, 4.0, 5.0),
        vector4PropUnset: Property.vector4(6.0, 7.0, 8.0, 9.0),
    };

    animationProp!: Animation;
    materialProp!: Material;
    meshProp!: Mesh;
    skinProp!: Skin;
    textureProp!: Texture;
    objectProp!: Object3D;

    animationPropUnset!: Animation | null;
    materialPropUnset!: Material | null;
    meshPropUnset!: Mesh | null;
    skinPropUnset!: Skin | null;
    texturePropUnset!: Texture | null;
    objectPropUnset!: Object3D | null;

    boolProp!: boolean;
    intProp!: number;
    floatProp!: number;
    enumProp!: number;
    colorProp!: Float32Array;
    vector2Prop!: Float32Array;
    vector3Prop!: Float32Array;
    vector4Prop!: Float32Array;

    boolPropUnset!: boolean;
    intPropUnset!: number;
    floatPropUnset!: number;
    enumPropUnset!: number;
    colorPropUnset!: Float32Array;
    vector2PropUnset!: Float32Array;
    vector3PropUnset!: Float32Array;
    vector4PropUnset!: Float32Array;
}
