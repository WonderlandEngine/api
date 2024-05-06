/**
 * This component uses the local api on purpose.
 *
 * This greatly simplify the testing process, since we don't need
 * to install the `wonderlandengine/api` package in the project.
 */
import {Animation, Component, Property} from '../../../..';

export class TestComponentTranslate extends Component {
    static TypeName = 'test-component-translate-params';

    static Properties = {
        animationProp: Property.animation(),
        stringProp: Property.string(),
        floatProp: Property.float(),
    };

    animationProp!: Animation | null;
    stringProp!: string;
    floatProp!: number;
}
