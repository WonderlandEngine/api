import {Component, ComponentConstructor} from './wonderland.js';
import {Property, PropertyArgs, PropertyKeys, ComponentProperty, Type} from './property.js';

/**
 * Decorator for JS component properties.
 *
 * @param data The property description as an object literal
 * @returns A decorator function modifying the `Properties` static
 *     attribute
 */
function propertyDecorator(data: ComponentProperty) {
    return function (target: Component, propertyKey: string): void {
        const ctor = target.constructor as ComponentConstructor;
        ctor.Properties = ctor.Properties ?? {};
        ctor.Properties[propertyKey] = data;
    };
}

/**
 * Decorator for making a getter enumerable.
 *
 * Usage:
 *
 * ```ts
 * class MyClass {
 *     @enumerable()
 *     get projectionMatrix(): Float32Array { ... }
 * }
 * ```
 */
export function enumerable() {
    return function (_: any, __: string, descriptor: PropertyDescriptor) {
        descriptor.enumerable = true;
    };
}

/**
 * Decorator for native properties.
 *
 * Usage:
 *
 * ```ts
 * class MyClass {
 *     @nativeProperty()
 *     get projectionMatrix(): Float32Array { ... }
 * }
 * ```
 */
export function nativeProperty() {
    return function (
        target: Component,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        enumerable()(target, propertyKey, descriptor);
        propertyDecorator({type: Type.Native})(target, propertyKey);
    };
}

/**
 * Property decorators namespace.
 *
 * You can use the decorators to mark a class attribute as
 * a Wonderland Engine property.
 *
 * Usage:
 *
 * ```ts
 * import {Mesh} from '@wonderlandengine/api';
 * import {property} from '@wonderlandengine/api/decorators.js';
 *
 * class MyComponent extends Component {
 *     @property.bool(true)
 *     myBool!: boolean;
 *
 *     @property.int(42)
 *     myInt!: number;
 *
 *     @property.string('Hello World!')
 *     myString!: string;
 *
 *     @property.mesh()
 *     myMesh!: Mesh;
 * }
 * ```
 *
 * For JavaScript users, please declare the properties statically.
 */
export const property = {} as {
    [key in PropertyKeys]: (
        ...args: PropertyArgs<key>
    ) => ReturnType<typeof propertyDecorator>;
};

for (const name in Property) {
    /* Assign each property functor to a TypeScript decorator.
     * This code extracts parameters and return type to provide proper
     * typings to the user. */
    property[name as PropertyKeys] = (...args: PropertyArgs<PropertyKeys>) => {
        const functor = Property[name as PropertyKeys] as (
            ...args: unknown[]
        ) => ComponentProperty;
        return propertyDecorator(functor(...args));
    };
}
