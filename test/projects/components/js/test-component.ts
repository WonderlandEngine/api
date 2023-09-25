/**
 * This component doesn't inherit `Component` on purpose!
 *
 * This greatly simplify the testing process, since we don't need
 * to install the `wonderlandengine/api` package at this stage.
 */
export class TestDummyComponent {
    static TypeName = 'test-component';

    static Properties = {
        param: {type: 4} /* Int property. */,
    };

    param = 0;
    hi: string = '';

    init() {
        this.hi = 'Hello';
    }
    start() {
        this.hi = `${this.hi} ${this.param}`;
    }
}
