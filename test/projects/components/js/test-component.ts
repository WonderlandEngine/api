/**
 * This component uses the local api on purpose.
 *
 * This greatly simplify the testing process, since we don't need
 * to install the `wonderlandengine/api` package in the project.
 */
import {Component, Property} from '../../../..';

export class TestComponentBase extends Component {
    deactivated = false;
    order: ('init' | 'started' | 'activated' | 'deactivated' | 'destroyed')[] = [];
    init() {
        this.order.push('init');
    }
    start() {
        this.order.push('started');
    }
    onActivate() {
        this.order.push('activated');
    }
    onDeactivate() {
        this.deactivated = true;
        this.order.push('deactivated');
    }
    onDestroy(): void {
        this.order.push('destroyed');
    }
}

export class TestComponentActivatedWithParam extends TestComponentBase {
    static TypeName = 'test-component-activated-with-param';

    static Properties = {
        param: Property.int(),
    };

    param = 0;
    hi: string = '';

    init() {
        this.hi = 'Hello';
        super.init();
    }
    start() {
        this.hi = `${this.hi} ${this.param}`;
        super.start();
    }
}

export class TestComponentInactiveOnStart extends TestComponentBase {
    static TypeName = 'test-component-inactive-on-start';
}

export class TestComponentGettingActivated extends TestComponentBase {
    static TypeName = 'test-component-getting-activated';
}

export class TestComponentActivatingOther extends TestComponentBase {
    static TypeName = 'test-component-activating-other';

    start(): void {
        const other = this.object.getComponent(TestComponentGettingActivated)!;
        other.active = true;
        /* Last to skip count increment if an error is thrown */
        super.start();
    }
}

export class TestComponentGettingDeactivated extends TestComponentBase {
    static TypeName = 'test-component-getting-deactivated';
}

export class TestComponentDeactivatingOther extends TestComponentBase {
    static TypeName = 'test-component-deactivating-other';

    start(): void {
        const other = this.object.getComponent(TestComponentGettingDeactivated)!;
        other.active = false;
        /* Last to skip count increment if an error is thrown */
        super.start();
    }
}

export class TestComponentGettingDestroyed extends TestComponentBase {
    static TypeName = 'test-component-getting-destroyed';
}

export class TestComponentDestroyingOther extends TestComponentBase {
    static TypeName = 'test-component-destroying-other';

    /** Store the target to be able to access it post-destruction */
    target: TestComponentGettingDestroyed = null!;

    start(): void {
        this.target = this.object.getComponent(TestComponentGettingDestroyed)!;
        this.target.destroy();
        /* Last to skip count increment if an error is thrown */
        super.start();
    }
}
