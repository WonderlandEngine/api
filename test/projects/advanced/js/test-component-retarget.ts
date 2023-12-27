/**
 * This component uses the local api on purpose.
 *
 * This greatly simplify the testing process, since we don't need
 * to install the `wonderlandengine/api` package in the project.
 */
import {Property} from '../../../../src/property';

export class TestComponentRetarget {
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
    };
}
