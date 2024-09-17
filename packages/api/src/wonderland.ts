/**
 * Types
 */

import {nativeProperty, enumerable} from './decorators.js';
import {WonderlandEngine} from './engine.js';
import {isImageLike, isNumber, isString} from './utils/object.js';
import {Emitter} from './utils/event.js';
import {Material} from './resources/material-manager.js';
import {ComponentProperty, Type, defaultPropertyCloner} from './property.js';
import {WASM} from './wasm.js';
import {Constructor, ImageLike, NumberArray, TypedArray, TypedArrayCtor} from './types.js';
import {Resource, SceneResource} from './resources/resource.js';
import {Prefab} from './prefab.js';
import {Scene} from './scene.js';
import {createDestroyedProxy} from './utils/misc.js';

/**
 * Component constructor type.
 *
 * For more information, please have a look at the {@link Component} class.
 */
export type ComponentConstructor<T extends Component = Component> = {
    new (scene: Prefab, manager: number, id: number): T;
} & {
    _isBaseComponent: boolean;
    _propertyOrder: string[];
    TypeName: string;
    Properties: Record<string, ComponentProperty>;
    InheritProperties?: boolean;
    onRegister?: (engine: WonderlandEngine) => void;
};

/**
 * Component prototype interface.
 *
 * User component's should have the same structure.
 */
export interface ComponentProto {
    /**
     * Triggered after the component instantiation.
     * For more information, please have a look at {@link Component.init}.
     */
    init?: () => void;
    /**
     * Triggered after the component is activated for the first time.
     * For more information, please have a look at {@link Component.start}.
     */
    start?: () => void;
    /**
     * Triggered once per frame.
     * For more information, please have a look at {@link Component.update}.
     *
     * @param dt Delta time, time since last update.
     */
    update?: (dt: number) => void;
    /**
     * Triggered when the component goes from deactivated to activated.
     * For more information, please have a look at {@link Component.onActivate}.
     */
    onActivate?: () => void;
    /**
     * Triggered when the component goes from activated to deactivated.
     * For more information, please have a look at {@link Component.onDeactivate}.
     */
    onDeactivate?: () => void;
    /**
     * Triggered when the component is removed from its object.
     * For more information, please have a look at {@link Component.onDestroy}.
     *
     * @since 0.9.0
     */
    onDestroy?: () => void;
}

/**
 * Callback triggered on collision event.
 *
 * @param type Type of the event.
 * @param other Other component that was (un)collided with
 */
export type CollisionCallback = (type: CollisionEventType, other: PhysXComponent) => void;

/** @todo Remove at 1.0.0 */
declare const WL: WonderlandEngine;

/**
 * Wonderland Engine API
 * @namespace WL
 */

/**
 * Default set of logging tags used by the API.
 */
export enum LogTag {
    /** Initialization, component registration, etc... */
    Engine = 0,
    /** Scene loading */
    Scene = 1,
    /** Component init, update, etc... */
    Component = 2,
}

/**
 * Collider type enum for {@link CollisionComponent}.
 */
export enum Collider {
    /**
     * **Sphere Collider**:
     *
     * Simplest and most performant collision shape. If this type is set on a
     * {@link CollisionComponent}, only the first component of
     * {@link CollisionComponent#extents} will be used to determine the radius.
     */
    Sphere = 0,

    /**
     * **Axis Aligned Bounding Box Collider**:
     *
     * Box that is always aligned to XYZ axis. It cannot be rotated but is more
     * efficient than {@link Collider.Box}.
     */
    AxisAlignedBox = 1,

    /**
     * **Aligned Bounding Box Collider**:
     *
     * Box that matches the object's rotation and translation correctly. This
     * is the least efficient collider and should only be chosen over
     * {@link Collider.Sphere} and {@link Collider.AxisAlignedBox} if really
     * necessary.
     */
    Box = 2,
}

/**
 * Alignment type enum for {@link TextComponent}.
 */
export enum Alignment {
    /** Text start is at object origin */
    Left = 0,

    /** Text center is at object origin */
    Center = 1,

    /** Text end is at object origin */
    Right = 2,
}

/**
 * Vertical alignment type enum for {@link TextComponent}.
 */
export enum VerticalAlignment {
    /** Text line is at object origin */
    Line = 0,

    /** Text middle is at object origin */
    Middle = 1,

    /** Text top is at object origin */
    Top = 2,

    /** Text bottom is at object origin */
    Bottom = 3,
}

/**
 * Justification type enum for {@link TextComponent}.
 *
 * @deprecated Please use {@link VerticalAlignment} instead.
 */
export const Justification = VerticalAlignment;

/**
 * Effect type enum for {@link TextComponent}.
 */
export enum TextEffect {
    /** Text is rendered normally */
    None = 0,

    /** Text is rendered with an outline */
    Outline = 1,
}

/**
 * Wrap mode enum for {@link TextComponent}.
 *
 * @since 1.2.1
 */
export enum TextWrapMode {
    /** Text doesn't wrap automatically, only with explicit newline */
    None = 0,

    /** Text wraps at word boundaries */
    Soft = 1,

    /** Text wraps anywhere */
    Hard = 2,

    /** Text is cut off */
    Clip = 3,
}

/**
 * Input type enum for {@link InputComponent}.
 */
export enum InputType {
    /** Head input */
    Head = 0,

    /** Left eye input */
    EyeLeft = 1,

    /** Right eye input */
    EyeRight = 2,

    /** Left controller input */
    ControllerLeft = 3,

    /** Right controller input */
    ControllerRight = 4,

    /** Left ray input */
    RayLeft = 5,

    /** Right ray input */
    RayRight = 6,
}

/**
 * Projection type enum for {@link ViewComponent}.
 */
export enum ProjectionType {
    /** Perspective projection */
    Perspective = 0,

    /** Orthographic projection */
    Orthographic = 1,
}

/**
 * Light type enum for {@link LightComponent}.
 */
export enum LightType {
    /** Point light */
    Point = 0,

    /** Spot light */
    Spot = 1,

    /** Sun light / Directional light */
    Sun = 2,
}

/**
 * Animation state of {@link AnimationComponent}.
 */
export enum AnimationState {
    /** Animation is currently playing */
    Playing = 0,

    /** Animation is paused and will continue at current playback
     * time on {@link AnimationComponent#play} */
    Paused = 1,

    /** Animation is stopped */
    Stopped = 2,
}

/**
 * Root motion mode of {@link AnimationComponent}.
 */
export enum RootMotionMode {
    /** Do nothing */
    None = 0,
    /** Move and rotate root with the delta of its motion */
    ApplyToOwner = 1,
    /** Store the motion to be retrieved by a JS script */
    Script = 2,
}

/**
 * Rigid body force mode for {@link PhysXComponent#addForce} and {@link PhysXComponent#addTorque}.
 *
 * [PhysX API Reference](https://gameworksdocs.nvidia.com/PhysX/4.1/documentation/physxapi/files/structPxForceMode.html)
 */
export enum ForceMode {
    /** Apply as force */
    Force = 0,

    /** Apply as impulse */
    Impulse = 1,

    /** Apply as velocity change, mass dependent */
    VelocityChange = 2,

    /** Apply as mass dependent force */
    Acceleration = 3,
}

/**
 * Collision callback event type.
 */
export enum CollisionEventType {
    /** Touch/contact detected, collision */
    Touch = 0,

    /** Touch/contact lost, uncollide */
    TouchLost = 1,

    /** Touch/contact with trigger detected */
    TriggerTouch = 2,

    /** Touch/contact with trigger lost */
    TriggerTouchLost = 3,
}

/**
 * Rigid body {@link PhysXComponent#shape}.
 *
 * [PhysX SDK Guide](https://gameworksdocs.nvidia.com/PhysX/4.1/documentation/physxguide/Manual/Geometry.html#geometry-types).
 */
export enum Shape {
    /** No shape. */
    None = 0,

    /** Sphere shape. */
    Sphere = 1,

    /** Capsule shape. */
    Capsule = 2,

    /** Box shape. */
    Box = 3,

    /** Plane shape. */
    Plane = 4,

    /** Convex mesh shape. */
    ConvexMesh = 5,

    /** Triangle mesh shape. */
    TriangleMesh = 6,
}

/**
 * Mesh attribute enum.
 * @since 0.9.0
 */
export enum MeshAttribute {
    /** Position attribute, 3 floats */
    Position = 0,

    /** Tangent attribute, 4 floats */
    Tangent = 1,

    /** Normal attribute, 3 floats */
    Normal = 2,

    /** Texture coordinate attribute, 2 floats */
    TextureCoordinate = 3,

    /** Color attribute, 4 floats, RGBA, range `0` to `1` */
    Color = 4,

    /** Joint id attribute, 8 unsigned ints */
    JointId = 5,

    /** Joint weights attribute, 8 floats */
    JointWeight = 6,
}

/** Proxy used to override prototypes of destroyed objects. */
export const DestroyedObjectInstance = createDestroyedProxy('object');
/** Proxy used to override prototypes of destroyed components. */
export const DestroyedComponentInstance = createDestroyedProxy('component');
/** Proxy used to override prototypes of destroyed prefabs. */
export const DestroyedPrefabInstance = createDestroyedProxy('prefab/scene');

/**
 * Check whether a given shape is a mesh or not.
 *
 * @param shape The shape to check.
 * @returns `true` if the shape is a mesh, `false` if it's a primitive.
 */
function isMeshShape(shape: Shape): boolean {
    return shape === Shape.ConvexMesh || shape === Shape.TriangleMesh;
}

/**
 * Check whether an object is the {@link Component} class or not,
 *
 * @note This method if foolproof to developers inadvertently using
 * multiple Wonderland Engine API in a bundle.
 *
 * @param value The object to check.
 * @returns `true` if the object is a {@link Component} class, `false` otherwise.
 */
function isBaseComponentClass(
    value: Constructor<any> | null
): value is ComponentConstructor {
    return (
        !!value &&
        value.hasOwnProperty('_isBaseComponent') &&
        (value as ComponentConstructor)._isBaseComponent
    );
}

/**
 * Constants.
 */

/**
 * Default world up vector.
 */
const UP_VECTOR = [0, 1, 0];

const SQRT_3 = Math.sqrt(3);

/**
 * Provides access to a component instance of a specified component type.
 *
 * @example
 *
 * This is how you extend this class to create your own custom
 * component:
 *
 * ```js
 * import { Component, Type } from '@wonderlandengine/api';
 *
 * export class MyComponent extends Component {
 *     static TypeName = 'my-component';
 *     static Properties = {
 *         myBoolean: { type: Type.Boolean, default: false },
 *     };
 *     start() {}
 *     onActivate() {}
 *     onDeactivate() {}
 *     update(dt) {}
 * }
 * ```
 *
 * In a component, the scene can be accessed using `this.scene`:
 *
 * ```js
 * import { Component, Type } from '@wonderlandengine/api';
 *
 * export class MyComponent extends Component {
 *     static TypeName = 'my-component';
 *     start() {
 *         const obj = this.scene.addObject();
 *     }
 * }
 * ```
 */
export class Component {
    /**
     * Pack scene index and component id.
     *
     * @param scene Scene index.
     * @param id Component id.
     * @returns The packed id.
     *
     * @hidden
     */
    static _pack(scene: number, id: number) {
        return (scene << 22) | id;
    }

    /**
     * `true` for every class inheriting from this class.
     *
     * @note This is a workaround for `instanceof` to prevent issues
     * that could arise when an application ends up using multiple API versions.
     *
     * @hidden
     */
    static readonly _isBaseComponent = true;

    /**
     * Fixed order of attributes in the `Properties` array.
     *
     * @note This is used for parameter deserialization and is filled during
     * component registration.
     *
     * @hidden
     */
    static _propertyOrder: string[] = [];

    /**
     * Unique identifier for this component class.
     *
     * This is used to register, add, and retrieve components of a given type.
     */
    static TypeName: string;

    /**
     * Properties of this component class.
     *
     * Properties are public attributes that can be configured via the
     * Wonderland Editor.
     *
     * Example:
     *
     * ```js
     * import { Component, Type } from '@wonderlandengine/api';
     * class MyComponent extends Component {
     *     static TypeName = 'my-component';
     *     static Properties = {
     *         myBoolean: { type: Type.Boolean, default: false },
     *         myFloat: { type: Type.Float, default: false },
     *         myTexture: { type: Type.Texture, default: null },
     *     };
     * }
     * ```
     *
     * Properties are automatically added to each component instance, and are
     * accessible like any JS attribute:
     *
     * ```js
     * // Creates a new component and set each properties value:
     * const myComponent = object.addComponent(MyComponent, {
     *     myBoolean: true,
     *     myFloat: 42.0,
     *     myTexture: null
     * });
     *
     * // You can also override the properties on the instance:
     * myComponent.myBoolean = false;
     * myComponent.myFloat = -42.0;
     * ```
     *
     * #### References
     *
     * Reference types (i.e., mesh, object, etc...) can also be listed as **required**:
     *
     * ```js
     * import {Component, Property} from '@wonderlandengine/api';
     *
     * class MyComponent extends Component {
     *     static Properties = {
     *         myObject: Property.object({required: true}),
     *         myAnimation: Property.animation({required: true}),
     *         myTexture: Property.texture({required: true}),
     *         myMesh: Property.mesh({required: true}),
     *     }
     * }
     * ```
     *
     * Please note that references are validated **once** before the call to {@link Component.start} only,
     * via the {@link Component.validateProperties} method.
     */
    static Properties: Record<string, ComponentProperty>;

    /**
     * When set to `true`, the child class inherits from the parent
     * properties, as shown in the following example:
     *
     * ```js
     * import {Component, Property} from '@wonderlandengine/api';
     *
     * class Parent extends Component {
     *     static TypeName = 'parent';
     *     static Properties = {parentName: Property.string('parent')}
     * }
     *
     * class Child extends Parent {
     *     static TypeName = 'child';
     *     static Properties = {name: Property.string('child')}
     *     static InheritProperties = true;
     *
     *     start() {
     *         // Works because `InheritProperties` is `true`.
     *         console.log(`${this.name} inherits from ${this.parentName}`);
     *     }
     * }
     * ```
     *
     * @note Properties defined in descendant classes will override properties
     * with the same name defined in ancestor classes.
     *
     * Defaults to `true`.
     */
    static InheritProperties?: boolean;

    /**
     * Called when this component class is registered.
     *
     * @example
     *
     * This callback can be used to register dependencies of a component,
     * e.g., component classes that need to be registered in order to add
     * them at runtime with {@link Object3D.addComponent}, independent of whether
     * they are used in the editor.
     *
     * ```js
     * class Spawner extends Component {
     *     static TypeName = 'spawner';
     *
     *     static onRegister(engine) {
     *         engine.registerComponent(SpawnedComponent);
     *     }
     *
     *     // You can now use addComponent with SpawnedComponent
     * }
     * ```
     *
     * @example
     *
     * This callback can be used to register different implementations of a
     * component depending on client features or API versions.
     *
     * ```js
     * // Properties need to be the same for all implementations!
     * const SharedProperties = {};
     *
     * class Anchor extends Component {
     *     static TypeName = 'spawner';
     *     static Properties = SharedProperties;
     *
     *     static onRegister(engine) {
     *         if(navigator.xr === undefined) {
     *             /* WebXR unsupported, keep this dummy component *\/
     *             return;
     *         }
     *         /* WebXR supported! Override already registered dummy implementation
     *          * with one depending on hit-test API support *\/
     *         engine.registerComponent(window.HitTestSource === undefined ?
     *             AnchorWithoutHitTest : AnchorWithHitTest);
     *     }
     *
     *     // This one implements no functions
     * }
     * ```
     */
    static onRegister?: (engine: WonderlandEngine) => void;

    /**
     * Allows to inherit properties directly inside the editor.
     *
     * @note Do not use directly, prefer using {@link inheritProperties}.
     *
     * @hidden
     */
    static _inheritProperties() {
        inheritProperties(this);
    }

    /**
     * Triggered when the component is initialized by the runtime. This method
     * will only be triggered **once** after instantiation.
     *
     * @note During the initialization phase, `this.scene` will not match
     * `engine.scene`, since `engine.scene` references the **active** scene:
     *
     * ```js
     * import {Component} from '@wonderlandengine/api';
     *
     * class MyComponent extends Component{
     *     init() {
     *         const activeScene = this.engine.scene;
     *         console.log(this.scene === activeScene); // Prints `false`
     *     }
     *     start() {
     *         const activeScene = this.engine.scene;
     *         console.log(this.scene === activeScene); // Prints `true`
     *     }
     * }
     * ```
     */
    init?(): void;

    /**
     * Triggered when the component is started by the runtime, or activated.
     *
     * You can use that to re-initialize the state of the component.
     */
    start?(): void;

    /**
     * Triggered  **every frame** by the runtime.
     *
     * You should perform your business logic in this method. Example:
     *
     * ```js
     * import { Component, Type } from '@wonderlandengine/api';
     *
     * class TranslateForwardComponent extends Component {
     *     static TypeName = 'translate-forward-component';
     *     static Properties = {
     *         speed: { type: Type.Float, default: 1.0 }
     *     };
     *     constructor() {
     *         this._forward = new Float32Array([0, 0, 0]);
     *     }
     *     update(dt) {
     *         this.object.getForward(this._forward);
     *         this._forward[0] *= this.speed;
     *         this._forward[1] *= this.speed;
     *         this._forward[2] *= this.speed;
     *         this.object.translate(this._forward);
     *     }
     * }
     * ```
     *
     * @param delta Elapsed time between this frame and the previous one, in **seconds**.
     */
    update?(delta: number): void;

    /**
     * Triggered when the component goes from an inactive state to an active state.
     *
     * @note When using ({@link WonderlandEngine.switchTo}), all the components
     * that were previously active will trigger this method.
     *
     * @note You can manually activate or deactivate a component using: {@link Component.active:setter}.
     */
    onActivate?(): void;

    /**
     * Triggered when the component goes from an activated state to an inactive state.
     *
     * @note When using ({@link WonderlandEngine.switchTo}), the components of
     * the scene getting deactivated will trigger this method.
     *
     * @note You can manually activate or deactivate a component using: {@link Component.active:setter}.
     */
    onDeactivate?(): void;

    /**
     * Triggered when the component is removed from its object.
     * For more information, please have a look at {@link Component.onDestroy}.
     *
     * @note This method will not be triggered for inactive scene being destroyed.
     *
     * @since 0.9.0
     */
    onDestroy?(): void;

    /** Manager index. @hidden */
    readonly _manager: number;
    /** Packed id, containing the scene and the local id. @hidden */
    readonly _id: number;
    /** Id relative to the scene component's manager. @hidden */
    readonly _localId: number;

    /**
     * Object containing this object.
     *
     * **Note**: This is cached for faster retrieval.
     *
     * @hidden
     */
    _object: Object3D | null;

    /** Scene instance. @hidden */
    protected readonly _scene: Prefab;

    /**
     * Create a new instance
     *
     * @param engine The engine instance.
     * @param manager Index of the manager.
     * @param id WASM component instance index.
     *
     * @hidden
     */
    constructor(scene: Prefab, manager: number = -1, id: number = -1) {
        this._scene = scene;
        this._manager = manager;
        this._localId = id;
        this._id = Component._pack(scene._index, id);
        this._object = null;
    }

    /** Scene this component is part of. */
    get scene() {
        return this._scene;
    }

    /** Hosting engine instance. */
    get engine() {
        return this._scene.engine;
    }

    /** The name of this component's type */
    get type(): string {
        const ctor = this.constructor as ComponentConstructor;
        return ctor.TypeName;
    }

    /** The object this component is attached to. */
    get object(): Object3D {
        if (!this._object) {
            const objectId = this.engine.wasm._wl_component_get_object(
                this._manager,
                this._id
            );
            this._object = this._scene.wrap(objectId);
        }
        return this._object;
    }

    /**
     * Set whether this component is active.
     *
     * Activating/deactivating a component comes at a small cost of reordering
     * components in the respective component manager. This function therefore
     * is not a trivial assignment.
     *
     * Does nothing if the component is already activated/deactivated.
     *
     * @param active New active state.
     */
    set active(active: boolean) {
        this.engine.wasm._wl_component_setActive(this._manager, this._id, active);
    }

    /** `true` if the component is marked as active and its scene is active. */
    get active(): boolean {
        return this.markedActive && this._scene.isActive;
    }

    /**
     * `true` if the component is marked as active in the scene, `false` otherwise.
     *
     * @note At the opposite of {@link Component.active}, this accessor doesn't
     * take into account whether the scene is active or not.
     */
    get markedActive(): boolean {
        return this.engine.wasm._wl_component_isActive(this._manager, this._id) != 0;
    }

    /**
     * Copy all the properties from `src` into this instance.
     *
     * @note Only properties are copied. If a component needs to
     * copy extra data, it needs to override this method.
     *
     * #### Example
     *
     * ```js
     * class MyComponent extends Component {
     *     nonPropertyData = 'Hello World';
     *
     *     copy(src) {
     *         super.copy(src);
     *         this.nonPropertyData = src.nonPropertyData;
     *         return this;
     *     }
     * }
     * ```
     *
     * @note This method is called by {@link Object3D.clone}. Do not attempt to:
     *     - Create new component
     *     - Read references to other objects
     *
     * When cloning via {@link Object3D.clone}, this method will be called before
     * {@link Component.start}.
     *
     * @note JavaScript component properties aren't retargeted. Thus, references
     * inside the source object will not be retargeted to the destination object,
     * at the exception of the skin data on {@link MeshComponent} and {@link AnimationComponent}.
     *
     * @param src The source component to copy from.
     *
     * @returns Reference to self (for method chaining).
     */
    copy(src: Record<string, any>): this {
        const ctor = this.constructor as ComponentConstructor;
        const properties = ctor.Properties;
        if (!properties) return this;
        for (const name in properties) {
            const property = properties[name];
            const value = src[name];
            if (value === undefined) continue;
            const cloner = property.cloner ?? defaultPropertyCloner;
            (this as Record<string, any>)[name] = cloner.clone(property.type, value);
        }
        return this;
    }

    /**
     * Remove this component from its objects and destroy it.
     *
     * It is best practice to set the component to `null` after,
     * to ensure it does not get used later.
     *
     * ```js
     *    c.destroy();
     *    c = null;
     * ```
     * @since 0.9.0
     */
    destroy(): void {
        const manager = this._manager;
        if (manager < 0 || this._id < 0) return;

        /* This call will mark the component destroyed,
         * automatically calling `_triggerOnDestroy`.  */
        this.engine.wasm._wl_component_remove(manager, this._id);
    }

    /**
     * Checks equality by comparing ids and **not** the JavaScript reference.
     *
     * @deprecate Use JavaScript reference comparison instead:
     *
     * ```js
     * const componentA = obj.addComponent('mesh');
     * const componentB = obj.addComponent('mesh');
     * const componentC = componentB;
     * console.log(componentA === componentB); // false
     * console.log(componentA === componentA); // true
     * console.log(componentB === componentC); // true
     * ```
     */
    equals(otherComponent: Component | undefined | null): boolean {
        /** @todo(2.0.0): Remove this method. */
        if (!otherComponent) return false;
        return this._manager === otherComponent._manager && this._id === otherComponent._id;
    }

    /**
     * Reset the component properties to default.
     *
     * @note This is automatically called during the component instantiation.
     *
     * @returns Reference to self (for method chaining).
     */
    resetProperties(): this {
        const ctor = this.constructor as ComponentConstructor;
        const properties = ctor.Properties;
        if (!properties) return this;
        for (const name in properties) {
            const property = properties[name];
            const cloner = property.cloner ?? defaultPropertyCloner;
            (this as Record<string, any>)[name] = cloner.clone(
                property.type,
                property.default
            );
        }
        return this;
    }

    /** @deprecated Use {@link Component.resetProperties} instead. */
    reset(): this {
        return this.resetProperties();
    }

    /**
     * Validate the properties on this instance.
     *
     * @throws If any of the required properties isn't initialized
     * on this instance.
     */
    validateProperties(): void {
        const ctor = this.constructor as ComponentConstructor;
        if (!ctor.Properties) return;

        for (const name in ctor.Properties) {
            if (!ctor.Properties[name].required) continue;
            if (!(this as Record<string, any>)[name]) {
                throw new Error(`Property '${name}' is required but was not initialized`);
            }
        }
    }

    toString() {
        if (this.isDestroyed) {
            return 'Component(destroyed)';
        }
        return `Component('${this.type}', ${this._localId})`;
    }

    /**
     * `true` if the component is destroyed, `false` otherwise.
     *
     * If {@link WonderlandEngine.erasePrototypeOnDestroy} is `true`,
     * reading a custom property will not work:
     *
     * ```js
     * engine.erasePrototypeOnDestroy = true;
     *
     * const comp = obj.addComponent('mesh');
     * comp.customParam = 'Hello World!';
     *
     * console.log(comp.isDestroyed); // Prints `false`
     * comp.destroy();
     * console.log(comp.isDestroyed); // Prints `true`
     * console.log(comp.customParam); // Throws an error
     * ```
     *
     * @since 1.1.1
     */
    get isDestroyed(): boolean {
        return this._id < 0;
    }

    /** @hidden */
    _copy(src: this, offsetsPtr: number) {
        const wasm = this.engine.wasm;

        /** @todo: Support retargeting for `Object3D.clone` as well. */
        const offsets = wasm.HEAPU32;
        const offsetsStart = offsetsPtr >>> 2;

        const destScene = this._scene;

        const ctor = this.constructor as ComponentConstructor;
        for (const name in ctor.Properties) {
            const value = (src as Record<string, any>)[name];
            if (value === null) {
                (this as Record<string, any>)[name] = null;
                continue;
            }

            const prop = ctor.Properties[name];
            const offset = offsets[offsetsStart + prop.type];

            let retargeted;
            switch (prop.type) {
                case Type.Object: {
                    const index = wasm._wl_object_index((value as Object3D)._id);
                    const id = wasm._wl_object_id(destScene._index, index + offset);
                    retargeted = destScene.wrap(id);
                    break;
                }
                case Type.Animation:
                    retargeted = destScene.animations.wrap(
                        offset + (value as Animation)._index
                    );
                    break;
                case Type.Skin:
                    retargeted = destScene.skins.wrap(offset + (value as Skin)._index);
                    break;
                default:
                    const cloner = prop.cloner ?? defaultPropertyCloner;
                    retargeted = cloner.clone(prop.type, value);
                    break;
            }
            (this as Record<string, any>)[name] = retargeted;
        }
        return this;
    }

    /**
     * Trigger the component {@link Component.init} method.
     *
     * @note Use this method instead of directly calling {@link Component.init},
     * because this method creates an handler for the {@link Component.start}.
     *
     * @note This api is meant to be used internally.
     *
     * @hidden
     */
    _triggerInit() {
        if (this.init) {
            try {
                this.init();
            } catch (e) {
                this.engine.log.error(
                    LogTag.Component,
                    `Exception during ${this.type} init() on object ${this.object.name}`
                );
                this.engine.log.error(LogTag.Component, e);
            }
        }

        /* Arm onActivate() with the initial start() call */
        const oldActivate = this.onActivate;
        this.onActivate = function () {
            this.onActivate = oldActivate;
            let failed = false;
            try {
                this.validateProperties();
            } catch (e) {
                this.engine.log.error(
                    LogTag.Component,
                    `Exception during ${this.type} validateProperties() on object ${this.object.name}`
                );
                this.engine.log.error(LogTag.Component, e);
                failed = true;
            }

            try {
                this.start?.();
            } catch (e) {
                this.engine.log.error(
                    LogTag.Component,
                    `Exception during ${this.type} start() on object ${this.object.name}`
                );
                this.engine.log.error(LogTag.Component, e);
                failed = true;
            }

            if (failed) {
                this.active = false;
                return;
            }

            if (!this.onActivate) return;

            try {
                this.onActivate();
            } catch (e) {
                this.engine.log.error(
                    LogTag.Component,
                    `Exception during ${this.type} onActivate() on object ${this.object.name}`
                );
                this.engine.log.error(LogTag.Component, e);
            }
        };
    }

    /**
     * Trigger the component {@link Component.update} method.
     *
     * @note This api is meant to be used internally.
     *
     * @hidden
     */
    _triggerUpdate(dt: number) {
        if (!this.update) return;
        try {
            this.update(dt);
        } catch (e) {
            this.engine.log.error(
                LogTag.Component,
                `Exception during ${this.type} update() on object ${this.object.name}`
            );
            this.engine.log.error(LogTag.Component, e);
            if (this.engine.wasm._deactivate_component_on_error) {
                this.active = false;
            }
        }
    }

    /**
     * Trigger the component {@link Component.onActivate} method.
     *
     * @note This api is meant to be used internally.
     *
     * @hidden
     */
    _triggerOnActivate() {
        if (!this.onActivate) return;
        try {
            this.onActivate();
        } catch (e) {
            this.engine.log.error(
                LogTag.Component,
                `Exception during ${this.type} onActivate() on object ${this.object.name}`
            );
            this.engine.log.error(LogTag.Component, e);
        }
    }

    /**
     * Trigger the component {@link Component.onDeactivate} method.
     *
     * @note This api is meant to be used internally.
     *
     * @hidden
     */
    _triggerOnDeactivate() {
        if (!this.onDeactivate) return;
        try {
            this.onDeactivate();
        } catch (e) {
            this.engine.log.error(
                LogTag.Component,
                `Exception during ${this.type} onDeactivate() on object ${this.object.name}`
            );
            this.engine.log.error(LogTag.Component, e);
        }
    }

    /**
     * Trigger the component {@link Component.onDestroy} method.
     *
     * @note This api is meant to be used internally.
     *
     * @hidden
     */
    _triggerOnDestroy() {
        try {
            if (this.onDestroy) this.onDestroy();
        } catch (e) {
            this.engine.log.error(
                LogTag.Component,
                `Exception during ${this.type} onDestroy() on object ${this.object.name}`
            );
            this.engine.log.error(LogTag.Component, e);
        }
        this._scene._components.destroy(this);
    }
}

/**
 * Components must be registered before loading / appending a scene.
 *
 * It's possible to end up with a broken component in the following cases:
 *
 * - Component wasn't registered when the scene was loaded
 * - Component instantiation failed
 *
 * This dummy component is thus used as a placeholder by the engine.
 */
export class BrokenComponent extends Component {
    static TypeName = '__broken-component__';
}

/**
 * Merge the ascendant properties of class
 *
 * This method walks the prototype chain, and merges
 * all the properties found in parent components.
 *
 * Example:
 *
 * ```js
 * import {Property, inheritProperties} from '@wonderlandengine/api';
 *
 * class Parent {
 *     static Properties = { parentProp: Property.string('parent') };
 * }
 *
 * class Child extends Parent {
 *     static Properties = { childProp: Property.string('child') };
 * }
 * inheritProperties(Child);
 * ```
 *
 * @param target The class in which properties should be merged
 *
 * @hidden
 */
export function inheritProperties(target: ComponentConstructor) {
    if (!target.TypeName) return;

    const chain: ComponentConstructor[] = [];
    let curr: Constructor<any> | null = target;
    while (curr && !isBaseComponentClass(curr)) {
        const comp = curr as ComponentConstructor;

        /* Stop at the first class that doesn't require properties merging */
        const needsMerge = comp.hasOwnProperty('InheritProperties')
            ? comp.InheritProperties
            : true;
        if (!needsMerge) break;

        if (comp.hasOwnProperty('Properties')) {
            /* We push properties even if the object isn't deriving from a Component class.
             * This could theoretically lead to issue, when inheriting from another type
             * of component (lit-like elements) but extremely unlikely. */
            chain.push(comp);
        }
        curr = Object.getPrototypeOf(curr);
    }

    /* No prototype merge is needed. */
    if (!chain.length || (chain.length === 1 && chain[0] === target)) {
        return;
    }

    const merged: Record<string, ComponentProperty> = {};
    for (let i = chain.length - 1; i >= 0; --i) {
        Object.assign(merged, chain[i].Properties);
    }
    target.Properties = merged;
}

/**
 * Native collision component.
 *
 * Provides access to a native collision component instance.
 */
export class CollisionComponent extends Component {
    /** @override */
    static TypeName = 'collision';

    /** @overload */
    getExtents(): Float32Array;
    /**
     * Collision component extents.
     *
     * If {@link collider} returns {@link Collider.Sphere}, only the first
     * component of the returned vector is used.
     *
     * @param out Destination array/vector, expected to have at least 3 elements.
     * @returns The `out` parameter.
     */
    getExtents<T extends NumberArray>(out: T): T;
    getExtents(out: NumberArray = new Float32Array(3)): NumberArray {
        const wasm = this.engine.wasm;
        const ptr = wasm._wl_collision_component_get_extents(this._id) / 4; /* Align F32 */
        out[0] = wasm.HEAPF32[ptr];
        out[1] = wasm.HEAPF32[ptr + 1];
        out[2] = wasm.HEAPF32[ptr + 2];
        return out;
    }

    /** Collision component collider */
    @nativeProperty()
    get collider(): Collider {
        return this.engine.wasm._wl_collision_component_get_collider(this._id);
    }

    /**
     * Set collision component collider.
     *
     * @param collider Collider of the collision component.
     */
    set collider(collider: Collider) {
        this.engine.wasm._wl_collision_component_set_collider(this._id, collider);
    }

    /**
     * Equivalent to {@link CollisionComponent.getExtents}.
     *
     * @note Prefer to use {@link CollisionComponent.getExtents} for performance.
     */
    @nativeProperty()
    get extents(): Float32Array {
        /** @todo: Break at 2.0.0. Do not allow modifying memory in-place. */
        const wasm = this.engine.wasm;
        return new Float32Array(
            wasm.HEAPF32.buffer,
            wasm._wl_collision_component_get_extents(this._id),
            3
        );
    }

    /**
     * Set collision component extents.
     *
     * If {@link collider} returns {@link Collider.Sphere}, only the first
     * component of the passed vector is used.
     *
     * Example:
     *
     * ```js
     * // Spans 1 unit on the x-axis, 2 on the y-axis, 3 on the z-axis.
     * collision.extent = [1, 2, 3];
     * ```
     *
     * @param extents Extents of the collision component, expects a
     *      3 component array.
     */
    set extents(extents: Readonly<NumberArray>) {
        const wasm = this.engine.wasm;
        const ptr = wasm._wl_collision_component_get_extents(this._id) / 4; /* Align F32 */
        wasm.HEAPF32[ptr] = extents[0];
        wasm.HEAPF32[ptr + 1] = extents[1];
        wasm.HEAPF32[ptr + 2] = extents[2];
    }

    /**
     * Get collision component radius.
     *
     * @note If {@link collider} is not {@link Collider.Sphere}, the returned value
     * corresponds to the radius of a sphere enclosing the shape.
     *
     * Example:
     *
     * ```js
     * sphere.radius = 3.0;
     * console.log(sphere.radius); // 3.0
     *
     * box.extents = [2.0, 2.0, 2.0];
     * console.log(box.radius); // 1.732...
     * ```
     *
     */
    get radius(): number {
        const wasm = this.engine.wasm;
        if (this.collider === Collider.Sphere)
            return wasm.HEAPF32[wasm._wl_collision_component_get_extents(this._id) >> 2];
        const extents = new Float32Array(
            wasm.HEAPF32.buffer,
            wasm._wl_collision_component_get_extents(this._id),
            3
        );
        const x2 = extents[0] * extents[0];
        const y2 = extents[1] * extents[1];
        const z2 = extents[2] * extents[2];
        return Math.sqrt(x2 + y2 + z2) / 2;
    }

    /**
     * Set collision component radius.
     *
     * @param radius Radius of the collision component
     *
     * @note If {@link collider} is not {@link Collider.Sphere},
     * the extents are set to form a square that fits a sphere with the provided radius.
     *
     * Example:
     *
     * ```js
     * aabbCollision.radius = 2.0; // AABB fits a sphere of radius 2.0
     * boxCollision.radius = 3.0; // Box now fits a sphere of radius 3.0, keeping orientation
     * ```
     *
     */
    set radius(radius: number) {
        const length = this.collider === Collider.Sphere ? radius : (2 * radius) / SQRT_3;
        this.extents.set([length, length, length]);
    }

    /**
     * Collision component group.
     *
     * The groups is a bitmask that is compared to other components in {@link CollisionComponent#queryOverlaps}
     * or the group in {@link Scene#rayCast}.
     *
     * Colliders that have no common groups will not overlap with each other. If a collider
     * has none of the groups set for {@link Scene#rayCast}, the ray will not hit it.
     *
     * Each bit represents belonging to a group, see example.
     *
     * ```js
     *    // c belongs to group 2
     *    c.group = (1 << 2);
     *
     *    // c belongs to group 0
     *    c.group = (1 << 0);
     *
     *    // c belongs to group 0 *and* 2
     *    c.group = (1 << 0) | (1 << 2);
     *
     *    (c.group & (1 << 2)) != 0; // true
     *    (c.group & (1 << 7)) != 0; // false
     * ```
     */
    @nativeProperty()
    get group(): number {
        return this.engine.wasm._wl_collision_component_get_group(this._id);
    }

    /**
     * Set collision component group.
     *
     * @param group Group mask of the collision component.
     */
    set group(group: number) {
        this.engine.wasm._wl_collision_component_set_group(this._id, group);
    }

    /**
     * Query overlapping objects.
     *
     * Usage:
     *
     * ```js
     * const collision = object.getComponent('collision');
     * const overlaps = collision.queryOverlaps();
     * for(const otherCollision of overlaps) {
     *     const otherObject = otherCollision.object;
     *     console.log(`Collision with object ${otherObject.objectId}`);
     * }
     * ```
     *
     * @returns Collision components overlapping this collider.
     */
    queryOverlaps(): CollisionComponent[] {
        const count = this.engine.wasm._wl_collision_component_query_overlaps(
            this._id,
            this.engine.wasm._tempMem,
            this.engine.wasm._tempMemSize >> 1
        );
        const overlaps: CollisionComponent[] = new Array(count);
        for (let i = 0; i < count; ++i) {
            const id = this.engine.wasm._tempMemUint16[i];
            overlaps[i] = this._scene._components.wrapCollision(id);
        }
        return overlaps;
    }
}

/**
 * Native text component
 *
 * Provides access to a native text component instance
 */
export class TextComponent extends Component {
    /** @override */
    static TypeName = 'text';

    /** Text component alignment. */
    @nativeProperty()
    get alignment(): Alignment {
        return this.engine.wasm._wl_text_component_get_horizontal_alignment(this._id);
    }

    /**
     * Set text component alignment.
     *
     * @param alignment Alignment for the text component.
     */
    set alignment(alignment: Alignment) {
        this.engine.wasm._wl_text_component_set_horizontal_alignment(this._id, alignment);
    }

    /**
     * Text component vertical alignment.
     * @since 1.2.0
     */
    @nativeProperty()
    get verticalAlignment(): VerticalAlignment {
        return this.engine.wasm._wl_text_component_get_vertical_alignment(this._id);
    }

    /**
     * Set text component vertical alignment.
     *
     * @param verticalAlignment Vertical for the text component.
     * @since 1.2.0
     */
    set verticalAlignment(verticalAlignment: VerticalAlignment) {
        this.engine.wasm._wl_text_component_set_vertical_alignment(
            this._id,
            verticalAlignment
        );
    }

    /**
     * Text component justification.
     *
     * @deprecated Please use {@link TextComponent.verticalAlignment} instead.
     */
    @nativeProperty()
    get justification() {
        return this.verticalAlignment;
    }

    /**
     * Set text component justification.
     *
     * @param justification Justification for the text component.
     *
     * @deprecated Please use {@link TextComponent.verticalAlignment} instead.
     */
    set justification(justification: VerticalAlignment) {
        this.verticalAlignment = justification;
    }

    /** Text component character spacing. */
    @nativeProperty()
    get characterSpacing(): number {
        return this.engine.wasm._wl_text_component_get_character_spacing(this._id);
    }

    /**
     * Set text component character spacing.
     *
     * @param spacing Character spacing for the text component.
     */
    set characterSpacing(spacing: number) {
        this.engine.wasm._wl_text_component_set_character_spacing(this._id, spacing);
    }

    /** Text component line spacing. */
    @nativeProperty()
    get lineSpacing(): number {
        return this.engine.wasm._wl_text_component_get_line_spacing(this._id);
    }

    /**
     * Set text component line spacing
     *
     * @param spacing Line spacing for the text component
     */
    set lineSpacing(spacing: number) {
        this.engine.wasm._wl_text_component_set_line_spacing(this._id, spacing);
    }

    /** Text component effect. */
    @nativeProperty()
    get effect(): TextEffect {
        return this.engine.wasm._wl_text_component_get_effect(this._id);
    }

    /**
     * Set text component effect
     *
     * @param effect Effect for the text component
     */
    set effect(effect: TextEffect) {
        this.engine.wasm._wl_text_component_set_effect(this._id, effect);
    }

    /**
     * Text component line wrap mode.
     * @since 1.2.1
     */
    @nativeProperty()
    get wrapMode(): TextWrapMode {
        return this.engine.wasm._wl_text_component_get_wrapMode(this._id);
    }

    /**
     * Set text component line wrap mode.
     *
     * @param wrapMode Line wrap mode for the text component.
     * @since 1.2.1
     */
    set wrapMode(wrapMode: TextWrapMode) {
        this.engine.wasm._wl_text_component_set_wrapMode(this._id, wrapMode);
    }

    /**
     * Text component line wrap width.
     * @since 1.2.1
     */
    @nativeProperty()
    get wrapWidth(): number {
        return this.engine.wasm._wl_text_component_get_wrapWidth(this._id);
    }

    /**
     * Set text component line wrap width.
     *
     * Only takes effect when {@link wrapMode} is something other than
     * {@link TextWrapMode.None}.
     *
     * @param width Line wrap width for the text component.
     * @since 1.2.1
     */
    set wrapWidth(width: number) {
        this.engine.wasm._wl_text_component_set_wrapWidth(this._id, width);
    }

    /** Text component text. */
    @nativeProperty()
    get text(): string {
        const wasm = this.engine.wasm;
        const ptr = wasm._wl_text_component_get_text(this._id);
        return wasm.UTF8ToString(ptr);
    }

    /**
     * Set text component text.
     *
     * @param text Text of the text component.
     */
    set text(text: any) {
        const wasm = this.engine.wasm;
        wasm._wl_text_component_set_text(this._id, wasm.tempUTF8(text.toString()));
    }

    /**
     * Set material to render the text with.
     *
     * @param material New material.
     */
    set material(material: Material | null | undefined) {
        const matIndex = material ? material._id : 0;
        this.engine.wasm._wl_text_component_set_material(this._id, matIndex);
    }

    /** Material used to render the text. */
    @nativeProperty()
    get material(): Material | null {
        const index = this.engine.wasm._wl_text_component_get_material(this._id);
        return this.engine.materials.wrap(index);
    }

    /** @overload */
    getBoundingBoxForText(text: string): Float32Array;
    /**
     * Axis-aligned bounding box for a given text, in object space.
     *
     * To calculate the size for the currently set text, use
     * {@link getBoundingBox}.
     *
     * Useful for calculating the text size before an update and potentially
     * adjusting the text:
     *
     * ```js
     * let updatedName = 'some very long name';
     * const box = new Float32Array(4);
     * text.getBoundingBoxForText(updatedName, box);
     * const width = box[2] - box[0];
     * if(width > 2.0) {
     *     updatedName = updatedName.slice(0, 5) + '...';
     * }
     * text.text = updatedName;
     * ```
     *
     * @param text Text string to calculate the bounding box for.
     * @param out Preallocated array to write into, to avoid garbage,
     *     otherwise will allocate a new Float32Array.
     *
     * @returns Bounding box - left, bottom, right, top.
     */
    getBoundingBoxForText<T extends NumberArray>(text: string, out: T): T;
    /** @overload */
    getBoundingBoxForText<T extends NumberArray>(
        text: string,
        out: T | Float32Array = new Float32Array(4)
    ): T | Float32Array {
        const wasm = this.engine.wasm;
        /* Offset by 4 floats, output is written to _tempMem */
        const textPtr = wasm.tempUTF8(text, 4 * 4);
        this.engine.wasm._wl_text_component_get_boundingBox(
            this._id,
            textPtr,
            wasm._tempMem
        );
        out[0] = wasm._tempMemFloat[0];
        out[1] = wasm._tempMemFloat[1];
        out[2] = wasm._tempMemFloat[2];
        out[3] = wasm._tempMemFloat[3];
        return out as T;
    }

    /** @overload */
    getBoundingBox(): Float32Array;
    /**
     * Axis-aligned bounding box, in object space.
     *
     * The bounding box is computed using the current component properties
     * that influence the position and size of the text. The bounding box is
     * affected by alignment, spacing, effect type and the font set in the
     * material.
     *
     * To calculate the size for a different text, use
     * {@link getBoundingBoxForText}.
     *
     * Useful for adjusting text position or scaling:
     *
     * ```js
     * const box = new Float32Array(4);
     * text.getBoundingBox(box);
     * const width = box[2] - box[0];
     * // Make text 1m wide
     * text.object.setScalingLocal([1/width, 1, 1]);
     * ```
     *
     * @param text Text string to calculate the bounding box for.
     * @param out Preallocated array to write into, to avoid garbage,
     *     otherwise will allocate a new Float32Array.
     *
     * @returns Bounding box - left, bottom, right, top.
     */
    getBoundingBox<T extends NumberArray>(out: T): T;
    /** @overload */
    getBoundingBox<T extends NumberArray>(
        out: T | Float32Array = new Float32Array(4)
    ): T | Float32Array {
        const wasm = this.engine.wasm;
        this.engine.wasm._wl_text_component_get_boundingBox(this._id, 0, wasm._tempMem);
        out[0] = wasm._tempMemFloat[0];
        out[1] = wasm._tempMemFloat[1];
        out[2] = wasm._tempMemFloat[2];
        out[3] = wasm._tempMemFloat[3];
        return out as T;
    }
}

/**
 * Native view component.
 *
 * Provides access to a native view component instance.
 */
export class ViewComponent extends Component {
    /** @override */
    static TypeName = 'view';

    /**
     * Projection type of the view.
     *
     * @since 1.2.2
     */
    @nativeProperty()
    get projectionType(): ProjectionType {
        return this.engine.wasm._wl_view_component_get_projectionType(this._id);
    }

    /**
     * Set the projection type of the view.
     *
     * @param type New projection type.
     * @since 1.2.2
     */
    set projectionType(type) {
        this.engine.wasm._wl_view_component_set_projectionType(this._id, type);
    }

    /** @overload */
    getProjectionMatrix(): Float32Array;
    /**
     * Projection matrix.
     *
     * @param out Destination array/vector, expected to have at least 16 elements.
     * @returns The `out` parameter.
     */
    getProjectionMatrix<T extends NumberArray>(out: T): T;
    getProjectionMatrix(out: NumberArray = new Float32Array(16)): NumberArray {
        const wasm = this.engine.wasm;
        const ptr =
            wasm._wl_view_component_get_projection_matrix(this._id) / 4; /* Align F32 */
        for (let i = 0; i < 16; ++i) {
            out[i] = wasm.HEAPF32[ptr + i];
        }
        return out;
    }

    /**
     * Equivalent to {@link ViewComponent.getProjectionMatrix}.
     *
     * @note Prefer to use {@link ViewComponent.getProjectionMatrix} for performance.
     */
    @enumerable()
    get projectionMatrix(): Float32Array {
        /** @todo: Break at 2.0.0. Do not allow modifying memory in-place. */
        const wasm = this.engine.wasm;
        return new Float32Array(
            wasm.HEAPF32.buffer,
            wasm._wl_view_component_get_projection_matrix(this._id),
            16
        );
    }

    /** ViewComponent near clipping plane value. */
    @nativeProperty()
    get near(): number {
        return this.engine.wasm._wl_view_component_get_near(this._id);
    }

    /**
     * Set near clipping plane distance for the view.
     *
     * If an XR session is active, the change will apply in the
     * following frame, otherwise the change is immediate.
     *
     * @param near Near depth value.
     */
    set near(near: number) {
        this.engine.wasm._wl_view_component_set_near(this._id, near);
    }

    /** Far clipping plane value. */
    @nativeProperty()
    get far(): number {
        return this.engine.wasm._wl_view_component_get_far(this._id);
    }

    /**
     * Set far clipping plane distance for the view.
     *
     * If an XR session is active, the change will apply in the
     * following frame, otherwise the change is immediate.
     *
     * @param far Near depth value.
     */
    set far(far: number) {
        this.engine.wasm._wl_view_component_set_far(this._id, far);
    }

    /**
     * Get the horizontal field of view for the view, **in degrees**.
     *
     * If an XR session is active and this is the left or right eye view, this
     * returns the field of view reported by the device, regardless of the fov
     * that was set.
     */
    @nativeProperty()
    get fov(): number {
        return this.engine.wasm._wl_view_component_get_fov(this._id);
    }

    /**
     * Set the horizontal field of view for the view, **in degrees**.
     *
     * Only has an effect if {@link projectionType} is
     * {@link ProjectionType.Perspective}.
     *
     * If an XR session is active and this is the left or right eye view, the
     * field of view reported by the device is used and this value is ignored.
     * After the XR session ends, the new value is applied.
     *
     * @param fov Horizontal field of view, **in degrees**.
     */
    set fov(fov) {
        this.engine.wasm._wl_view_component_set_fov(this._id, fov);
    }

    /**
     * Get the width of the orthographic viewing volume.
     *
     * @since 1.2.2
     */
    @nativeProperty()
    get extent(): number {
        return this.engine.wasm._wl_view_component_get_extent(this._id);
    }

    /**
     * Set the width of the orthographic viewing volume.
     *
     * Only has an effect if {@link projectionType} is
     * {@link ProjectionType.Orthographic}.
     *
     * @param extent New extent.
     * @since 1.2.2
     */
    set extent(extent) {
        this.engine.wasm._wl_view_component_set_extent(this._id, extent);
    }
}

/**
 * Native input component.
 *
 * Provides access to a native input component instance.
 */
export class InputComponent extends Component {
    /** @override */
    static TypeName = 'input';

    /** Input component type */
    @nativeProperty()
    get inputType(): InputType {
        return this.engine.wasm._wl_input_component_get_type(this._id);
    }

    /**
     * Set input component type.
     *
     * @params New input component type.
     */
    set inputType(type: InputType) {
        this.engine.wasm._wl_input_component_set_type(this._id, type);
    }

    /**
     * WebXR Device API input source associated with this input component,
     * if type {@link InputType.ControllerLeft} or {@link InputType.ControllerRight}.
     */
    @enumerable()
    get xrInputSource(): XRInputSource | null {
        const xr = this.engine.xr;
        if (!xr) return null;

        for (let inputSource of xr.session.inputSources) {
            if (inputSource.handedness == this.handedness) {
                return inputSource;
            }
        }

        return null;
    }

    /**
     * 'left', 'right' or `null` depending on the {@link InputComponent#inputType}.
     */
    @enumerable()
    get handedness(): 'left' | 'right' | null {
        const inputType = this.inputType;
        if (
            inputType == InputType.ControllerRight ||
            inputType == InputType.RayRight ||
            inputType == InputType.EyeRight
        )
            return 'right';
        if (
            inputType == InputType.ControllerLeft ||
            inputType == InputType.RayLeft ||
            inputType == InputType.EyeLeft
        )
            return 'left';

        return null;
    }
}

/**
 * Native light component.
 *
 * Provides access to a native light component instance.
 */
export class LightComponent extends Component {
    /** @override */
    static TypeName = 'light';

    /** @overload */
    getColor(): Float32Array;
    /**
     * Get light color.
     *
     * @param out Destination array/vector, expected to have at least 3 elements.
     * @returns The `out` parameter.
     * @since 1.0.0
     */
    getColor<T extends NumberArray>(out: T): T;
    getColor(out: NumberArray = new Float32Array(3)): NumberArray {
        const wasm = this.engine.wasm;
        const ptr = wasm._wl_light_component_get_color(this._id) / 4; /* Align F32 */
        out[0] = wasm.HEAPF32[ptr];
        out[1] = wasm.HEAPF32[ptr + 1];
        out[2] = wasm.HEAPF32[ptr + 2];
        return out;
    }

    /**
     * Set light color.
     *
     * @param c New color array/vector, expected to have at least 3 elements.
     * @since 1.0.0
     */
    setColor(c: Readonly<NumberArray>): void {
        const wasm = this.engine.wasm;
        const ptr = wasm._wl_light_component_get_color(this._id) / 4; /* Align F32 */
        wasm.HEAPF32[ptr] = c[0];
        wasm.HEAPF32[ptr + 1] = c[1];
        wasm.HEAPF32[ptr + 2] = c[2];
    }

    /**
     * View on the light color.
     *
     * @note Prefer to use {@link getColor} in performance-critical code.
     */
    @nativeProperty()
    get color(): Float32Array {
        const wasm = this.engine.wasm;
        return new Float32Array(
            wasm.HEAPF32.buffer,
            wasm._wl_light_component_get_color(this._id),
            3
        );
    }

    /**
     * Set light color.
     *
     * @param c Color of the light component.
     *
     * @note Prefer to use {@link setColor} in performance-critical code.
     */
    set color(c: Readonly<NumberArray>) {
        this.color.set(c);
    }

    /** Light type. */
    @nativeProperty()
    get lightType(): LightType {
        return this.engine.wasm._wl_light_component_get_type(this._id);
    }

    /**
     * Set light type.
     *
     * @param lightType Type of the light component.
     */
    set lightType(t: LightType) {
        this.engine.wasm._wl_light_component_set_type(this._id, t);
    }

    /**
     * Light intensity.
     * @since 1.0.0
     */
    @nativeProperty()
    get intensity(): number {
        return this.engine.wasm._wl_light_component_get_intensity(this._id);
    }

    /**
     * Set light intensity.
     *
     * @param intensity Intensity of the light component.
     * @since 1.0.0
     */
    set intensity(intensity: number) {
        this.engine.wasm._wl_light_component_set_intensity(this._id, intensity);
    }

    /**
     * Outer angle for spot lights, in degrees.
     * @since 1.0.0
     */
    @nativeProperty()
    get outerAngle(): number {
        return this.engine.wasm._wl_light_component_get_outerAngle(this._id);
    }

    /**
     * Set outer angle for spot lights.
     *
     * @param angle Outer angle, in degrees.
     * @since 1.0.0
     */
    set outerAngle(angle: number) {
        this.engine.wasm._wl_light_component_set_outerAngle(this._id, angle);
    }

    /**
     * Inner angle for spot lights, in degrees.
     * @since 1.0.0
     */
    @nativeProperty()
    get innerAngle(): number {
        return this.engine.wasm._wl_light_component_get_innerAngle(this._id);
    }

    /**
     * Set inner angle for spot lights.
     *
     * @param angle Inner angle, in degrees.
     * @since 1.0.0
     */
    set innerAngle(angle: number) {
        this.engine.wasm._wl_light_component_set_innerAngle(this._id, angle);
    }

    /**
     * Whether the light casts shadows.
     * @since 1.0.0
     */
    @nativeProperty()
    get shadows(): boolean {
        return !!this.engine.wasm._wl_light_component_get_shadows(this._id);
    }

    /**
     * Set whether the light casts shadows.
     *
     * @param b Whether the light casts shadows.
     * @since 1.0.0
     */
    set shadows(b: boolean) {
        this.engine.wasm._wl_light_component_set_shadows(this._id, b);
    }

    /**
     * Range for shadows.
     * @since 1.0.0
     */
    @nativeProperty()
    get shadowRange(): number {
        return this.engine.wasm._wl_light_component_get_shadowRange(this._id);
    }

    /**
     * Set range for shadows.
     *
     * @param range Range for shadows.
     * @since 1.0.0
     */
    set shadowRange(range: number) {
        this.engine.wasm._wl_light_component_set_shadowRange(this._id, range);
    }

    /**
     * Bias value for shadows.
     * @since 1.0.0
     */
    @nativeProperty()
    get shadowBias(): number {
        return this.engine.wasm._wl_light_component_get_shadowBias(this._id);
    }

    /**
     * Set bias value for shadows.
     *
     * @param bias Bias for shadows.
     * @since 1.0.0
     */
    set shadowBias(bias: number) {
        this.engine.wasm._wl_light_component_set_shadowBias(this._id, bias);
    }

    /**
     * Normal bias value for shadows.
     * @since 1.0.0
     */
    @nativeProperty()
    get shadowNormalBias(): number {
        return this.engine.wasm._wl_light_component_get_shadowNormalBias(this._id);
    }

    /**
     * Set normal bias value for shadows.
     *
     * @param bias Normal bias for shadows.
     * @since 1.0.0
     */
    set shadowNormalBias(bias: number) {
        this.engine.wasm._wl_light_component_set_shadowNormalBias(this._id, bias);
    }

    /**
     * Texel size for shadows.
     * @since 1.0.0
     */
    @nativeProperty()
    get shadowTexelSize(): number {
        return this.engine.wasm._wl_light_component_get_shadowTexelSize(this._id);
    }

    /**
     * Set texel size for shadows.
     *
     * @param size Texel size for shadows.
     * @since 1.0.0
     */
    set shadowTexelSize(size: number) {
        this.engine.wasm._wl_light_component_set_shadowTexelSize(this._id, size);
    }

    /**
     * Cascade count for {@link LightType.Sun} shadows.
     * @since 1.0.0
     */
    @nativeProperty()
    get cascadeCount(): number {
        return this.engine.wasm._wl_light_component_get_cascadeCount(this._id);
    }

    /**
     * Set cascade count for {@link LightType.Sun} shadows.
     *
     * @param count Cascade count.
     * @since 1.0.0
     */
    set cascadeCount(count: number) {
        this.engine.wasm._wl_light_component_set_cascadeCount(this._id, count);
    }
}

/**
 * Native animation component.
 *
 * Provides access to a native animation component instance.
 */
export class AnimationComponent extends Component {
    /** @override */
    static TypeName = 'animation';

    /**
     * Emitter for animation events triggered on this component.
     *
     * The first argument is the name of the event.
     */
    readonly onEvent = new Emitter<[string]>();

    /**
     * Set animation to play.
     *
     * Make sure to {@link Animation#retarget} the animation to affect the
     * right objects.
     *
     * @param anim Animation to play.
     */
    set animation(anim: Animation | null | undefined) {
        this.scene.assertOrigin(anim);
        this.engine.wasm._wl_animation_component_set_animation(
            this._id,
            anim ? anim._id : 0
        );
    }

    /** Animation set for this component */
    @nativeProperty()
    get animation(): Animation | null {
        const index = this.engine.wasm._wl_animation_component_get_animation(this._id);
        return this._scene.animations.wrap(index);
    }

    /**
     * Set play count. Set to `0` to loop indefinitely.
     *
     * @param playCount Number of times to repeat the animation.
     */
    set playCount(playCount: number) {
        this.engine.wasm._wl_animation_component_set_playCount(this._id, playCount);
    }

    /** Number of times the animation is played. */
    @nativeProperty()
    get playCount(): number {
        return this.engine.wasm._wl_animation_component_get_playCount(this._id);
    }

    /**
     * Set speed. Set to negative values to run the animation backwards.
     *
     * Setting speed has an immediate effect for the current frame's update
     * and will continue with the speed from the current point in the animation.
     *
     * @param speed New speed at which to play the animation.
     * @since 0.8.10
     */
    set speed(speed: number) {
        this.engine.wasm._wl_animation_component_set_speed(this._id, speed);
    }

    /**
     * Speed factor at which the animation is played.
     *
     * @since 0.8.10
     */
    @nativeProperty()
    get speed(): number {
        return this.engine.wasm._wl_animation_component_get_speed(this._id);
    }

    /** Current playing state of the animation */
    @enumerable()
    get state(): AnimationState {
        return this.engine.wasm._wl_animation_component_state(this._id);
    }

    /**
     * How to handle root motion on this component.
     *
     * @since 1.2.2
     */
    @nativeProperty()
    @enumerable()
    get rootMotionMode(): RootMotionMode {
        return this.engine.wasm._wl_animation_component_get_rootMotionMode(this._id);
    }

    /**
     * Set how to handle root motion.
     *
     * @param mode Mode to handle root motion, see {@link RootMotionMode}.
     * @since 1.2.2
     */
    set rootMotionMode(mode: RootMotionMode) {
        this.engine.wasm._wl_animation_component_set_rootMotionMode(this._id, mode);
    }

    /**
     * Current iteration of the animation.
     *
     * If {@link playCount} is not unlimited, the value is in the range from
     * `0` to `playCount`.
     *
     * @since 1.2.3
     */
    get iteration(): number {
        return this.engine.wasm._wl_animation_component_get_iteration(this._id);
    }

    /**
     * Current playing position of the animation within the current iteration,
     * in seconds.
     *
     * The value is in the range from `0.0` to {@link AnimationComponent#duration},
     * if playing in reverse, this range is reversed as well.
     *
     * @since 1.2.3
     */
    get position(): number {
        return this.engine.wasm._wl_animation_component_get_position(this._id);
    }

    /**
     * Current duration to loop one iteration in seconds, offers a more accurate duration
     * than {@link Animation#duration} when blending multiple animations.
     *
     * @since 1.2.3
     */
    get duration(): number {
        return this.engine.wasm._wl_animation_component_get_duration(this._id);
    }

    /**
     * Play animation.
     *
     * If the animation is currently paused, resumes from that position. If the
     * animation is already playing, does nothing.
     *
     * To restart the animation, {@link AnimationComponent#stop} it first.
     */
    play(): void {
        this.engine.wasm._wl_animation_component_play(this._id);
    }

    /** Stop animation. */
    stop(): void {
        this.engine.wasm._wl_animation_component_stop(this._id);
    }

    /** Pause animation. */
    pause(): void {
        this.engine.wasm._wl_animation_component_pause(this._id);
    }

    /**
     * Get the value of a float parameter in the attached graph.
     * Throws if the parameter is missing.
     *
     * @param name Name of the parameter.
     * @since 1.2.0
     */
    getFloatParameter(name: string): number | null {
        const wasm = this.engine.wasm;
        const index = wasm._wl_animation_component_getGraphParamIndex(
            this._id,
            wasm.tempUTF8(name)
        );
        if (index === -1) {
            throw Error(`Missing parameter '${name}'`);
        }
        wasm._wl_animation_component_getGraphParamValue(this._id, index, wasm._tempMem);
        return wasm._tempMemFloat[0];
    }

    /**
     * Set the value of a float parameter in the attached graph
     * Throws if the parameter is missing.
     *
     * @param name Name of the parameter.
     * @param value Float value to set.
     * @returns 1 if the parameter was successfully set, 0 on fail.
     * @since 1.2.0
     */
    setFloatParameter(name: string, value: number): void {
        const wasm = this.engine.wasm;
        const index = wasm._wl_animation_component_getGraphParamIndex(
            this._id,
            wasm.tempUTF8(name)
        );
        if (index === -1) {
            throw Error(`Missing parameter '${name}'`);
        }
        wasm._tempMemFloat[0] = value;
        wasm._wl_animation_component_setGraphParamValue(this._id, index, wasm._tempMem);
    }

    /** @overload */
    getRootMotionTranslation(): Float32Array;
    /**
     * Get the root motion translation in **local space** calculated for the current frame.
     *
     * @note If {@link AnimationComponent.rootMotionMode} is not
     * set to {@link RootMotionMode.Script} this will always return an identity translation.
     *
     * @since 1.2.2
     */
    getRootMotionTranslation<T extends NumberArray>(out: T): T;
    getRootMotionTranslation(out: NumberArray = new Float32Array(3)): NumberArray {
        const wasm = this.engine.wasm;
        wasm._wl_animation_component_get_rootMotion_translation(this._id, wasm._tempMem);
        out[0] = wasm._tempMemFloat[0];
        out[1] = wasm._tempMemFloat[1];
        out[2] = wasm._tempMemFloat[2];
        return out;
    }

    /** @overload */
    getRootMotionRotation(): Float32Array;
    /**
     * Get the root motion rotation in **local space** calculated for the current frame.
     *
     * @note If {@link AnimationComponent.rootMotionMode} is not
     * set to {@link RootMotionMode.Script} this will always return an identity rotation.
     *
     * @since 1.2.2
     */
    getRootMotionRotation<T extends NumberArray>(out: T): T;
    getRootMotionRotation(out: NumberArray = new Float32Array(3)): NumberArray {
        const wasm = this.engine.wasm;
        wasm._wl_animation_component_get_rootMotion_rotation(this._id, wasm._tempMem);
        out[0] = wasm._tempMemFloat[0];
        out[1] = wasm._tempMemFloat[1];
        out[2] = wasm._tempMemFloat[2];
        return out;
    }
}

/**
 * Native mesh component.
 *
 * Provides access to a native mesh component instance.
 */
export class MeshComponent extends Component {
    /** @override */
    static TypeName = 'mesh';

    /**
     * Set material to render the mesh with.
     *
     * @param material Material to render the mesh with.
     */
    set material(material: Material | null | undefined) {
        this.engine.wasm._wl_mesh_component_set_material(
            this._id,
            material ? material._id : 0
        );
    }

    /** Material used to render the mesh. */
    @nativeProperty()
    get material(): Material | null {
        const index = this.engine.wasm._wl_mesh_component_get_material(this._id);
        return this.engine.materials.wrap(index);
    }

    /** Mesh rendered by this component. */
    @nativeProperty()
    get mesh(): Mesh | null {
        const index = this.engine.wasm._wl_mesh_component_get_mesh(this._id);
        return this.engine.meshes.wrap(index);
    }

    /**
     * Set mesh to rendered with this component.
     *
     * @param mesh Mesh rendered by this component.
     */
    set mesh(mesh: Mesh | null | undefined) {
        this.engine.wasm._wl_mesh_component_set_mesh(this._id, mesh?._id ?? 0);
    }

    /** Skin for this mesh component. */
    @nativeProperty()
    get skin(): Skin | null {
        const index = this.engine.wasm._wl_mesh_component_get_skin(this._id);
        return this._scene.skins.wrap(index);
    }

    /**
     * Set skin to transform this mesh component.
     *
     * @param skin Skin to use for rendering skinned meshes.
     */
    set skin(skin: Skin | null | undefined) {
        this.scene.assertOrigin(skin);
        this.engine.wasm._wl_mesh_component_set_skin(this._id, skin ? skin._id : 0);
    }

    /**
     * Morph targets for this mesh component.
     *
     * @since 1.2.0
     */
    @nativeProperty()
    get morphTargets(): MorphTargets | null {
        const index = this.engine.wasm._wl_mesh_component_get_morph_targets(this._id);
        return this.engine.morphTargets.wrap(index);
    }

    /**
     * Set morph targets to transform this mesh component.
     *
     * @param morphTargets Morph targets to use for rendering.
     *
     * @since 1.2.0
     */
    set morphTargets(morphTargets: MorphTargets | null | undefined) {
        this.engine.wasm._wl_mesh_component_set_morph_targets(
            this._id,
            morphTargets?._id ?? 0
        );
    }

    /**
     * Equivalent to {@link getMorphTargetWeights}.
     *
     * @note Prefer to use {@link getMorphTargetWeights} for performance.
     *
     * @since 1.2.0
     */
    @nativeProperty()
    get morphTargetWeights(): Float32Array {
        return this.getMorphTargetWeights();
    }

    /**
     * Set the morph target weights to transform this mesh component.
     *
     * @param weights New weights.
     *
     * @since 1.2.0
     */
    set morphTargetWeights(weights: Readonly<NumberArray>) {
        this.setMorphTargetWeights(weights);
    }

    /** @overload */
    getMorphTargetWeights(): Float32Array;
    /**
     * Get morph target weights for this mesh component.
     *
     * @param out Destination array, expected to have at least as many elements
     *     as {@link MorphTargets.count}.
     * @returns The `out` parameter.
     *
     * @since 1.2.0
     */
    getMorphTargetWeights<T extends NumberArray>(out: T): T;
    getMorphTargetWeights(out?: NumberArray): NumberArray {
        const wasm = this.engine.wasm;
        const count = wasm._wl_mesh_component_get_morph_target_weights(
            this._id,
            wasm._tempMem
        );
        if (!out) {
            out = new Float32Array(count);
        }
        for (let i = 0; i < count; ++i) {
            out[i] = wasm._tempMemFloat[i];
        }
        return out;
    }

    /**
     * Get the weight of a single morph target.
     *
     * @param target Index of the morph target.
     * @returns The weight.
     *
     * @since 1.2.0
     */
    getMorphTargetWeight(target: number) {
        const count = this.morphTargets?.count ?? 0;
        if (target >= count) {
            throw new Error(`Index ${target} is out of bounds for ${count} targets`);
        }
        return this.engine.wasm._wl_mesh_component_get_morph_target_weight(
            this._id,
            target
        );
    }

    /**
     * Set morph target weights for this mesh component.
     *
     * @param weights Array of new weights, expected to have at least as many
     *     elements as {@link MorphTargets.count}.
     *
     * @since 1.2.0
     */
    setMorphTargetWeights(weights: Readonly<NumberArray>) {
        const count = this.morphTargets?.count ?? 0;
        if (weights.length !== count) {
            throw new Error(`Expected ${count} weights but got ${weights.length}`);
        }
        const wasm = this.engine.wasm;
        wasm._tempMemFloat.set(weights);
        wasm._wl_mesh_component_set_morph_target_weights(
            this._id,
            wasm._tempMem,
            weights.length
        );
    }

    /**
     * Set the weight of a single morph target.
     *
     * @param target Index of the morph target.
     * @param weight The new weight.
     *
     * ## Usage
     *
     * ```js
     * const mesh = object.getComponent('mesh');
     * const mouthTarget = mesh.morphTargets.getTargetIndex('mouth');
     * mesh.setMorphTargetWeight(mouthTarget, 0.5);
     * ```
     *
     * @since 1.2.0
     */
    setMorphTargetWeight(target: number, weight: number) {
        const count = this.morphTargets?.count ?? 0;
        if (target >= count) {
            throw new Error(`Index ${target} is out of bounds for ${count} targets`);
        }
        this.engine.wasm._wl_mesh_component_set_morph_target_weight(
            this._id,
            target,
            weight
        );
    }
}

/**
 * Enum for Physics axes locking
 *
 * See {@link PhysXComponent.angularLockAxis} and {@link PhysXComponent.linearLockAxis}.
 */
export enum LockAxis {
    /**
     * No axis selected.
     */
    None = 0,

    /**
     * **X axis**:
     */
    X = 1 << 0,

    /**
     * **Y axis**:
     */
    Y = 1 << 1,

    /**
     * **Z axis**:
     */
    Z = 1 << 2,
}

/**
 * Native physx rigid body component.
 *
 * Provides access to a native mesh component instance.
 * Only available when using physx enabled runtime, see "Project Settings > Runtime".
 */
export class PhysXComponent extends Component {
    /** @override */
    static TypeName = 'physx';

    /** @overload */
    getTranslationOffset(): Float32Array;
    /**
     * Local translation offset.
     *
     * Allows to move a physx component without creating a new object in the hierarchy.
     *
     * @param out Destination array/vector, expected to have at least 3 elements.
     * @returns The `out` parameter.
     *
     * @since 1.1.1
     */
    getTranslationOffset<T extends NumberArray>(out: T): T;
    getTranslationOffset(out: NumberArray = new Float32Array(3)): NumberArray {
        const wasm = this.engine.wasm;
        wasm._wl_physx_component_get_offsetTranslation(this._id, wasm._tempMem);
        out[0] = wasm._tempMemFloat[0];
        out[1] = wasm._tempMemFloat[1];
        out[2] = wasm._tempMemFloat[2];
        return out;
    }

    /** @overload */
    getRotationOffset(): Float32Array;
    /**
     * Local rotation offset represented as a quaternion.
     *
     * Allows to rotate a physx component without creating a new object in the hierarchy.
     *
     * @param out Destination array/vector, expected to have at least 4 elements.
     * @returns The `out` parameter.
     *
     * @since 1.1.1
     */
    getRotationOffset<T extends NumberArray>(out: T): T;
    getRotationOffset(out: NumberArray = new Float32Array(4)): NumberArray {
        const wasm = this.engine.wasm;
        const ptr =
            wasm._wl_physx_component_get_offsetTransform(this._id) >> 2; /* Align F32 */
        out[0] = wasm.HEAPF32[ptr];
        out[1] = wasm.HEAPF32[ptr + 1];
        out[2] = wasm.HEAPF32[ptr + 2];
        out[3] = wasm.HEAPF32[ptr + 3];
        return out;
    }

    /** @overload */
    getExtents(): Float32Array;
    /**
     * The shape extents for collision detection.
     *
     * @param out Destination array/vector, expected to have at least 3 elements.
     * @returns The `out` parameter.
     */
    getExtents<T extends NumberArray>(out: T): T;
    getExtents(out: NumberArray = new Float32Array(3)): NumberArray {
        const wasm = this.engine.wasm;
        const ptr = wasm._wl_physx_component_get_extents(this._id) / 4; /* Align F32 */
        out[0] = wasm.HEAPF32[ptr];
        out[1] = wasm.HEAPF32[ptr + 1];
        out[2] = wasm.HEAPF32[ptr + 2];
        return out;
    }

    /** @overload */
    getLinearVelocity(): Float32Array;
    /**
     * Linear velocity or `[0, 0, 0]` if the component is not active.
     *
     * @param out Destination array/vector, expected to have at least 3 elements.
     * @returns The `out` parameter.
     */
    getLinearVelocity<T extends NumberArray>(out: T): T;
    getLinearVelocity(out: NumberArray = new Float32Array(3)): NumberArray {
        const wasm = this.engine.wasm;
        const tempMemFloat = wasm._tempMemFloat;
        wasm._wl_physx_component_get_linearVelocity(
            this._id,
            wasm._tempMem
        ); /* Align F32 */
        out[0] = tempMemFloat[0];
        out[1] = tempMemFloat[1];
        out[2] = tempMemFloat[2];
        return out;
    }

    /** @overload */
    getAngularVelocity(): Float32Array;
    /**
     * Angular velocity or `[0, 0, 0]` if the component is not active.
     *
     * @param out Destination array/vector, expected to have at least 3 elements.
     * @returns The `out` parameter.
     */
    getAngularVelocity<T extends NumberArray>(out: T): T;
    getAngularVelocity(out: NumberArray = new Float32Array(3)): NumberArray {
        const wasm = this.engine.wasm;
        const tempMemFloat = wasm._tempMemFloat;
        wasm._wl_physx_component_get_angularVelocity(
            this._id,
            wasm._tempMem
        ); /* Align F32 */
        out[0] = tempMemFloat[0];
        out[1] = tempMemFloat[1];
        out[2] = tempMemFloat[2];
        return out;
    }

    /**
     * Set whether this rigid body is static.
     *
     * Setting this property only takes effect once the component
     * switches from inactive to active.
     *
     * @param b Whether the rigid body should be static.
     */
    set static(b: boolean) {
        this.engine.wasm._wl_physx_component_set_static(this._id, b);
    }

    /**
     * Whether this rigid body is static.
     *
     * This property returns whether the rigid body is *effectively*
     * static. If static property was set while the rigid body was
     * active, it will not take effect until the rigid body is set
     * inactive and active again. Until the component is set inactive,
     * this getter will return whether the rigid body is actually
     * static.
     */
    @nativeProperty()
    get static(): boolean {
        return !!this.engine.wasm._wl_physx_component_get_static(this._id);
    }

    /**
     * Equivalent to {@link PhysXComponent.getTranslationOffset}.
     *
     * Gives a quick view of the offset in a debugger.
     *
     * @note Prefer to use {@link PhysXComponent.getTranslationOffset} for performance.
     *
     * @since 1.1.1
     */
    @nativeProperty()
    get translationOffset(): Float32Array {
        return this.getTranslationOffset();
    }

    /**
     * Set the offset translation.
     *
     * The array must be a vector of at least **3** elements.
     *
     * @note The component must be re-activated to apply the change.
     *
     * @since 1.1.1
     */
    set translationOffset(offset: ArrayLike<number>) {
        const wasm = this.engine.wasm;
        wasm._wl_physx_component_set_offsetTranslation(
            this._id,
            offset[0],
            offset[1],
            offset[2]
        );
    }

    /**
     * Equivalent to {@link PhysXComponent.getRotationOffset}.
     *
     * Gives a quick view of the offset in a debugger.
     *
     * @note Prefer to use {@link PhysXComponent.getRotationOffset} for performance.
     *
     * @since 1.1.1
     */
    @nativeProperty()
    get rotationOffset(): Float32Array {
        return this.getRotationOffset();
    }

    /**
     * Set the offset rotation.
     *
     * The array must be a quaternion of at least **4** elements.
     *
     * @note The component must be re-activated to apply the change.
     *
     * @since 1.1.1
     */
    set rotationOffset(offset: ArrayLike<number>) {
        const wasm = this.engine.wasm;
        wasm._wl_physx_component_set_offsetRotation(
            this._id,
            offset[0],
            offset[1],
            offset[2],
            offset[3]
        );
    }

    /**
     * Set whether this rigid body is kinematic.
     *
     * @param b Whether the rigid body should be kinematic.
     */
    set kinematic(b: boolean) {
        this.engine.wasm._wl_physx_component_set_kinematic(this._id, b);
    }

    /**
     * Whether this rigid body is kinematic.
     */
    @nativeProperty()
    get kinematic(): boolean {
        return !!this.engine.wasm._wl_physx_component_get_kinematic(this._id);
    }

    /**
     * Set whether this rigid body's gravity is enabled.
     *
     * @param b Whether the rigid body's gravity should be enabled.
     */
    set gravity(b: boolean) {
        this.engine.wasm._wl_physx_component_set_gravity(this._id, b);
    }

    /**
     * Whether this rigid body's gravity flag is enabled.
     */
    @nativeProperty()
    get gravity(): boolean {
        return !!this.engine.wasm._wl_physx_component_get_gravity(this._id);
    }

    /**
     * Set whether this rigid body's simulate flag is enabled.
     *
     * @param b Whether the rigid body's simulate flag should be enabled.
     */
    set simulate(b: boolean) {
        this.engine.wasm._wl_physx_component_set_simulate(this._id, b);
    }

    /**
     * Whether this rigid body's simulate flag is enabled.
     */
    @nativeProperty()
    get simulate(): boolean {
        return !!this.engine.wasm._wl_physx_component_get_simulate(this._id);
    }

    /**
     * Set whether to allow simulation of this rigid body.
     *
     * {@link allowSimulation} and {@link trigger} can not be enabled at the
     * same time. Enabling {@link allowSimulation} while {@link trigger} is enabled
     * will disable {@link trigger}.
     *
     * @param b Whether to allow simulation of this rigid body.
     */
    set allowSimulation(b: boolean) {
        this.engine.wasm._wl_physx_component_set_allowSimulation(this._id, b);
    }

    /**
     * Whether to allow simulation of this rigid body.
     */
    @nativeProperty()
    get allowSimulation(): boolean {
        return !!this.engine.wasm._wl_physx_component_get_allowSimulation(this._id);
    }

    /**
     * Set whether this rigid body may be queried in ray casts.
     *
     * @param b Whether this rigid body may be queried in ray casts.
     */
    set allowQuery(b: boolean) {
        this.engine.wasm._wl_physx_component_set_allowQuery(this._id, b);
    }

    /**
     * Whether this rigid body may be queried in ray casts.
     */
    @nativeProperty()
    get allowQuery(): boolean {
        return !!this.engine.wasm._wl_physx_component_get_allowQuery(this._id);
    }

    /**
     * Set whether this physics body is a trigger.
     *
     * {@link allowSimulation} and {@link trigger} can not be enabled at the
     * same time. Enabling trigger while {@link allowSimulation} is enabled,
     * will disable {@link allowSimulation}.
     *
     * @param b Whether this physics body is a trigger.
     */
    set trigger(b: boolean) {
        this.engine.wasm._wl_physx_component_set_trigger(this._id, b);
    }

    /**
     * Whether this physics body is a trigger.
     */
    @nativeProperty()
    get trigger(): boolean {
        return !!this.engine.wasm._wl_physx_component_get_trigger(this._id);
    }

    /**
     * Set the shape for collision detection.
     *
     * @param s New shape.
     * @since 0.8.5
     */
    set shape(s: Shape) {
        this.engine.wasm._wl_physx_component_set_shape(this._id, s);
    }

    /** The shape for collision detection. */
    @nativeProperty()
    get shape(): Shape {
        return this.engine.wasm._wl_physx_component_get_shape(this._id);
    }

    /**
     * Set additional data for the shape.
     *
     * Retrieved only from {@link PhysXComponent#shapeData}.
     * @since 0.8.10
     */
    set shapeData(d) {
        if (d == null || !isMeshShape(this.shape)) return;
        this.engine.wasm._wl_physx_component_set_shape_data(this._id, d.index);
    }

    /**
     * Additional data for the shape.
     *
     * `null` for {@link Shape} values: `None`, `Sphere`, `Capsule`, `Box`, `Plane`.
     * `{index: n}` for `TriangleMesh` and `ConvexHull`.
     *
     * This data is currently only for passing onto or creating other {@link PhysXComponent}.
     * @since 0.8.10
     */
    @nativeProperty()
    get shapeData(): {
        index: number;
    } | null {
        if (!isMeshShape(this.shape)) return null;
        return {
            index: this.engine.wasm._wl_physx_component_get_shape_data(this._id),
        };
    }

    /**
     * Set the shape extents for collision detection.
     *
     * @param e New extents for the shape.
     * @since 0.8.5
     */
    set extents(e: Readonly<NumberArray>) {
        this.extents.set(e);
    }

    /**
     * Equivalent to {@link PhysXComponent.getExtents}.
     *
     * @note Prefer to use {@link PhysXComponent.getExtents} for performance.
     */
    @nativeProperty()
    get extents(): Float32Array {
        const wasm = this.engine.wasm;
        /** @todo: Break at 2.0.0. Do not allow modifying memory in-place. */
        const ptr = wasm._wl_physx_component_get_extents(this._id);
        return new Float32Array(wasm.HEAPF32.buffer, ptr, 3);
    }

    /**
     * Get staticFriction.
     */
    @nativeProperty()
    get staticFriction(): number {
        return this.engine.wasm._wl_physx_component_get_staticFriction(this._id);
    }

    /**
     * Set staticFriction.
     * @param v New staticFriction.
     */
    set staticFriction(v: number) {
        this.engine.wasm._wl_physx_component_set_staticFriction(this._id, v);
    }

    /**
     * Get dynamicFriction.
     */
    @nativeProperty()
    get dynamicFriction(): number {
        return this.engine.wasm._wl_physx_component_get_dynamicFriction(this._id);
    }

    /**
     * Set dynamicFriction
     * @param v New dynamicDamping.
     */
    set dynamicFriction(v: number) {
        this.engine.wasm._wl_physx_component_set_dynamicFriction(this._id, v);
    }

    /**
     * Get bounciness.
     * @since 0.9.0
     */
    @nativeProperty()
    get bounciness(): number {
        return this.engine.wasm._wl_physx_component_get_bounciness(this._id);
    }

    /**
     * Set bounciness.
     * @param v New bounciness.
     * @since 0.9.0
     */
    set bounciness(v: number) {
        this.engine.wasm._wl_physx_component_set_bounciness(this._id, v);
    }

    /**
     * Get linearDamping/
     */
    @nativeProperty()
    get linearDamping(): number {
        return this.engine.wasm._wl_physx_component_get_linearDamping(this._id);
    }

    /**
     * Set linearDamping.
     * @param v New linearDamping.
     */
    set linearDamping(v: number) {
        this.engine.wasm._wl_physx_component_set_linearDamping(this._id, v);
    }

    /** Get angularDamping. */
    @nativeProperty()
    get angularDamping(): number {
        return this.engine.wasm._wl_physx_component_get_angularDamping(this._id);
    }

    /**
     * Set angularDamping.
     * @param v New angularDamping.
     */
    set angularDamping(v: number) {
        this.engine.wasm._wl_physx_component_set_angularDamping(this._id, v);
    }

    /**
     * Set linear velocity.
     *
     * [PhysX Manual - "Velocity"](https://gameworksdocs.nvidia.com/PhysX/4.1/documentation/physxguide/Manual/RigidBodyDynamics.html#velocity)
     *
     * Has no effect, if the component is not active.
     *
     * @param v New linear velocity.
     */
    set linearVelocity(v: Readonly<NumberArray>) {
        this.engine.wasm._wl_physx_component_set_linearVelocity(this._id, v[0], v[1], v[2]);
    }

    /**
     * Equivalent to {@link PhysXComponent.getLinearVelocity}.
     *
     * @note Prefer to use {@link PhysXComponent.getLinearVelocity} for performance.
     */
    @nativeProperty()
    get linearVelocity(): Float32Array {
        /** @todo: Break at 2.0.0. Do not allow modifying memory in-place. */
        const wasm = this.engine.wasm;
        wasm._wl_physx_component_get_linearVelocity(this._id, wasm._tempMem);
        return new Float32Array(wasm.HEAPF32.buffer, wasm._tempMem, 3);
    }

    /**
     * Set angular velocity
     *
     * [PhysX Manual - "Velocity"](https://gameworksdocs.nvidia.com/PhysX/4.1/documentation/physxguide/Manual/RigidBodyDynamics.html#velocity)
     *
     * Has no effect, if the component is not active.
     *
     * @param v New angular velocity
     */
    set angularVelocity(v: Readonly<NumberArray>) {
        this.engine.wasm._wl_physx_component_set_angularVelocity(
            this._id,
            v[0],
            v[1],
            v[2]
        );
    }

    /**
     * Equivalent to {@link PhysXComponent.getAngularVelocity}.
     *
     * @note Prefer to use {@link PhysXComponent.getAngularVelocity} for performance.
     */
    @nativeProperty()
    get angularVelocity(): Float32Array {
        /** @todo: Break at 2.0.0. Do not allow modifying memory in-place. */
        const wasm = this.engine.wasm;
        wasm._wl_physx_component_get_angularVelocity(this._id, wasm._tempMem);
        return new Float32Array(wasm.HEAPF32.buffer, wasm._tempMem, 3);
    }

    /**
     * Set the components groups mask.
     *
     * @param flags New flags that need to be set.
     */
    set groupsMask(flags: number) {
        this.engine.wasm._wl_physx_component_set_groupsMask(this._id, flags);
    }

    /**
     * Get the components groups mask flags.
     *
     * Each bit represents membership to group, see example.
     *
     * ```js
     * // Assign c to group 2
     * c.groupsMask = (1 << 2);
     *
     * // Assign c to group 0
     * c.groupsMask  = (1 << 0);
     *
     * // Assign c to group 0 and 2
     * c.groupsMask = (1 << 0) | (1 << 2);
     *
     * (c.groupsMask & (1 << 2)) != 0; // true
     * (c.groupsMask & (1 << 7)) != 0; // false
     * ```
     */
    @nativeProperty()
    get groupsMask(): number {
        return this.engine.wasm._wl_physx_component_get_groupsMask(this._id);
    }

    /**
     * Set the components blocks mask.
     *
     * @param flags New flags that need to be set.
     */
    set blocksMask(flags: number) {
        this.engine.wasm._wl_physx_component_set_blocksMask(this._id, flags);
    }

    /**
     * Get the components blocks mask flags.
     *
     * Each bit represents membership to the block, see example.
     *
     * ```js
     * // Block overlap with any objects in group 2
     * c.blocksMask = (1 << 2);
     *
     * // Block overlap with any objects in group 0
     * c.blocksMask  = (1 << 0)
     *
     * // Block overlap with any objects in group 0 and 2
     * c.blocksMask = (1 << 0) | (1 << 2);
     *
     * (c.blocksMask & (1 << 2)) != 0; // true
     * (c.blocksMask & (1 << 7)) != 0; // false
     * ```
     */
    @nativeProperty()
    get blocksMask(): number {
        return this.engine.wasm._wl_physx_component_get_blocksMask(this._id);
    }

    /**
     * Set axes to lock for linear velocity.
     *
     * @param lock The Axis that needs to be set.
     *
     * Combine flags with Bitwise OR:
     *
     * ```js
     * body.linearLockAxis = LockAxis.X | LockAxis.Y; // x and y set
     * body.linearLockAxis = LockAxis.X; // y unset
     * ```
     *
     * @note This has no effect if the component is static.
     */
    set linearLockAxis(lock: LockAxis) {
        this.engine.wasm._wl_physx_component_set_linearLockAxis(this._id, lock);
    }

    /**
     * Get the linear lock axes flags.
     *
     * To get the state of a specific flag, Bitwise AND with the LockAxis needed.
     *
     * ```js
     * if(body.linearLockAxis & LockAxis.Y) {
     *     console.log("The Y flag was set!");
     * }
     * ```
     *
     * @return axes that are currently locked for linear movement.
     */
    @nativeProperty()
    get linearLockAxis(): LockAxis {
        return this.engine.wasm._wl_physx_component_get_linearLockAxis(this._id);
    }

    /**
     * Set axes to lock for angular velocity.
     *
     * @param lock The Axis that needs to be set.
     *
     * ```js
     * body.angularLockAxis = LockAxis.X | LockAxis.Y; // x and y set
     * body.angularLockAxis = LockAxis.X; // y unset
     * ```
     *
     * @note This has no effect if the component is static.
     */
    set angularLockAxis(lock: LockAxis) {
        this.engine.wasm._wl_physx_component_set_angularLockAxis(this._id, lock);
    }

    /**
     * Get the angular lock axes flags.
     *
     * To get the state of a specific flag, Bitwise AND with the LockAxis needed:
     *
     * ```js
     * if(body.angularLockAxis & LockAxis.Y) {
     *     console.log("The Y flag was set!");
     * }
     * ```
     *
     * @return axes that are currently locked for angular movement.
     */
    @nativeProperty()
    get angularLockAxis(): LockAxis {
        return this.engine.wasm._wl_physx_component_get_angularLockAxis(this._id);
    }

    /**
     * Set mass.
     *
     * [PhysX Manual - "Mass Properties"](https://gameworksdocs.nvidia.com/PhysX/4.1/documentation/physxguide/Manual/RigidBodyDynamics.html#mass-properties)
     *
     * @param m New mass.
     */
    set mass(m: number) {
        this.engine.wasm._wl_physx_component_set_mass(this._id, m);
    }

    /** Mass */
    @nativeProperty()
    get mass(): number {
        return this.engine.wasm._wl_physx_component_get_mass(this._id);
    }

    /**
     * Set mass space interia tensor.
     *
     * [PhysX Manual - "Mass Properties"](https://gameworksdocs.nvidia.com/PhysX/4.1/documentation/physxguide/Manual/RigidBodyDynamics.html#mass-properties)
     *
     * Has no effect, if the component is not active.
     *
     * @param v New mass space interatia tensor.
     */
    set massSpaceInteriaTensor(v: Readonly<NumberArray>) {
        this.engine.wasm._wl_physx_component_set_massSpaceInertiaTensor(
            this._id,
            v[0],
            v[1],
            v[2]
        );
    }

    /**
     * Set the rigid body to sleep upon activation.
     *
     * When asleep, the rigid body will not be simulated until the next contact.
     *
     * @param flag `true` to sleep upon activation.
     *
     * @since 1.1.5
     */
    set sleepOnActivate(flag: boolean) {
        this.engine.wasm._wl_physx_component_set_sleepOnActivate(this._id, flag);
    }

    /**
     * `true` if the rigid body is set to sleep upon activation, `false` otherwise.
     *
     * @since 1.1.5
     */
    @nativeProperty()
    get sleepOnActivate(): boolean {
        return !!this.engine.wasm._wl_physx_component_get_sleepOnActivate(this._id);
    }

    /**
     * Apply a force.
     *
     * [PhysX Manual - "Applying Forces and Torques"](https://gameworksdocs.nvidia.com/PhysX/4.1/documentation/physxguide/Manual/RigidBodyDynamics.html#applying-forces-and-torques)
     *
     * Has no effect, if the component is not active.
     *
     * @param f Force vector.
     * @param m Force mode, see {@link ForceMode}, default `Force`.
     * @param localForce Whether the force vector is in local space, default `false`.
     * @param p Position to apply force at, default is center of mass.
     * @param local Whether position is in local space, default `false`.
     */
    addForce(
        f: Readonly<NumberArray>,
        m: ForceMode = ForceMode.Force,
        localForce: boolean = false,
        p?: Readonly<NumberArray>,
        local: boolean = false
    ) {
        const wasm = this.engine.wasm;
        if (!p) {
            wasm._wl_physx_component_addForce(this._id, f[0], f[1], f[2], m, localForce);
            return;
        }
        wasm._wl_physx_component_addForceAt(
            this._id,
            f[0],
            f[1],
            f[2],
            m,
            localForce,
            p[0],
            p[1],
            p[2],
            local
        );
    }

    /**
     * Apply torque.
     *
     * [PhysX Manual - "Applying Forces and Torques"](https://gameworksdocs.nvidia.com/PhysX/4.1/documentation/physxguide/Manual/RigidBodyDynamics.html#applying-forces-and-torques)
     *
     * Has no effect, if the component is not active.
     *
     * @param f Force vector.
     * @param m Force mode, see {@link ForceMode}, default `Force`.
     */
    addTorque(f: Readonly<NumberArray>, m: ForceMode = ForceMode.Force) {
        this.engine.wasm._wl_physx_component_addTorque(this._id, f[0], f[1], f[2], m);
    }

    /**
     * Add on collision callback.
     *
     * @param callback Function to call when this rigid body (un)collides with any other.
     *
     * ```js
     *  let rigidBody = this.object.getComponent('physx');
     *  rigidBody.onCollision(function(type, other) {
     *      // Ignore uncollides
     *      if(type == CollisionEventType.TouchLost) return;
     *
     *      // Take damage on collision with enemies
     *      if(other.object.name.startsWith("enemy-")) {
     *          this.applyDamage(10);
     *      }
     *  }.bind(this));
     * ```
     *
     * @returns Id of the new callback for use with {@link PhysXComponent#removeCollisionCallback}.
     */
    onCollision(callback: CollisionCallback): number {
        return this.onCollisionWith(this, callback);
    }

    /**
     * Add filtered on collision callback.
     *
     * @param otherComp Component for which callbacks will
     *        be triggered. If you pass this component, the method is equivalent to.
     *        {@link PhysXComponent#onCollision}.
     * @param callback Function to call when this rigid body
     *        (un)collides with `otherComp`.
     * @returns Id of the new callback for use with {@link PhysXComponent#removeCollisionCallback}.
     */
    onCollisionWith(otherComp: this, callback: CollisionCallback): number {
        const physics = this.engine.physics;
        physics!._callbacks[this._id] = physics!._callbacks[this._id] || [];
        physics!._callbacks[this._id].push(callback);
        return this.engine.wasm._wl_physx_component_addCallback(
            this._id,
            otherComp._id || this._id
        );
    }

    /**
     * Remove a collision callback added with {@link PhysXComponent#onCollision} or {@link PhysXComponent#onCollisionWith}.
     *
     * @param callbackId Callback id as returned by {@link PhysXComponent#onCollision} or {@link PhysXComponent#onCollisionWith}.
     * @throws When the callback does not belong to the component.
     * @throws When the callback does not exist.
     */
    removeCollisionCallback(callbackId: number): void {
        const physics = this.engine.physics;
        const r = this.engine.wasm._wl_physx_component_removeCallback(this._id, callbackId);
        /* r is the amount of object to remove from the end of the
         * callbacks array for this object */
        if (r) physics!._callbacks[this._id].splice(-r);
    }
}

/**
 * Access to the physics scene
 */
export class Physics {
    /**
     * @hidden
     *
     * **Note**: This is public to emulate a `friend` accessor.
     */
    _callbacks: Record<string, CollisionCallback[]>;

    /**
     * Hit.
     * @hidden
     */
    _hit: RayHit;

    /**
     * Wonderland Engine instance
     * @hidden
     */
    protected readonly _engine: WonderlandEngine;

    /**
     * Ray Hit
     * @hidden
     */
    private _rayHit: number;

    constructor(engine: WonderlandEngine) {
        this._engine = engine;
        this._rayHit = engine.wasm._malloc(4 * (3 * 4 + 3 * 4 + 4 + 2) + 4);
        this._hit = new RayHit(engine.scene, this._rayHit);
        this._callbacks = {};
    }

    /**
     * Cast a ray through the scene and find intersecting physics components.
     *
     * The resulting ray hit will contain **up to 4** closest ray hits,
     * sorted by increasing distance.
     *
     * Example:
     *
     * ```js
     * const hit = engine.physics.rayCast(
     *     [0, 0, 0],
     *     [0, 0, 1],
     *     1 << 0 | 1 << 4, // Only check against physics components in groups 0 and 4
     *     25
     * );
     * if (hit.hitCount > 0) {
     *     const locations = hit.getLocations();
     *     console.log(`Object hit at: ${locations[0][0]}, ${locations[0][1]}, ${locations[0][2]}`);
     * }
     * ```
     *
     * @param o Ray origin.
     * @param d Ray direction.
     * @param groupMask Bitmask of physics groups to filter by: only objects
     *        that are part of given groups are considered for the raycast.
     * @param maxDistance Maximum **inclusive** hit distance. Defaults to `100`.
     *
     * @returns The {@link RayHit} instance, cached by this class.
     *
     * @note The returned {@link RayHit} object is owned by the {@link Physics}
     *       instance and will be reused with the next {@link Physics#rayCast} call.
     */
    rayCast(
        o: Readonly<NumberArray>,
        d: Readonly<NumberArray>,
        groupMask: number,
        maxDistance: number = 100.0
    ): RayHit {
        const scene = this._engine.scene._index;
        this._engine.wasm._wl_physx_ray_cast(
            scene,
            o[0],
            o[1],
            o[2],
            d[0],
            d[1],
            d[2],
            groupMask,
            maxDistance,
            this._rayHit
        );
        return this._hit;
    }

    /** Hosting engine instance. */
    get engine() {
        return this._engine;
    }
}

/**
 * Mesh index type.
 */
export enum MeshIndexType {
    /** Single byte mesh index, range 0-255 */
    UnsignedByte = 1,

    /** Two byte mesh index, range 0-65535 */
    UnsignedShort = 2,

    /** Four byte mesh index, range 0-4294967295 */
    UnsignedInt = 4,
}

/**
 * Mesh skinning type.
 */
export enum MeshSkinningType {
    /** Not skinned */
    None = 0,

    /** Skinned, 4 joints/weight per vertex */
    FourJoints = 1,

    /** Skinned, 8 joints/weight per vertex */
    EightJoints = 2,
}

/**
 * Mesh constructor parameters object.
 *
 * Usage:
 *
 * ```js
 * const mesh = Mesh({vertexCount: 3, indexData: [0, 1, 2]});
 * ```
 */
export interface MeshParameters {
    /** Number of vertices to allocate. */
    vertexCount: number;
    /** Index data values. */
    indexData: Readonly<NumberArray>;
    /** Index type, `null` if not indexed. */
    indexType: MeshIndexType;
    /** Whether the mesh should be skinned. Defaults to not skinned. */
    skinningType: MeshSkinningType;
}

/**
 * Wrapper around a native mesh data.
 *
 * For more information about how to create meshes, have a look at the
 * {@link MeshManager} class.
 *
 * #### Update
 *
 * To modify a mesh, you get access to a {@link MeshAttributeAccessor} that
 * allows you to modify the content of the buffers:
 *
 * Usage:
 *
 * ```js
 * const mesh = engine.es.create({vertexCount: 3, indexData: [0, 1, 2]});
 * const positions = mesh.attribute(MeshAttribute.Position);
 * ...
 * ```
 *
 * @note Meshes are **per-engine**, they can thus be shared by multiple scenes.
 */
export class Mesh extends Resource {
    /**
     * @deprecated Use {@link MeshManager.create} instead, accessible via {@link WonderlandEngine.meshes}:
     *
     * ```js
     * const mesh = engine.meshes.create({vertexCount: 3, indexData: [0, 1, 2]});
     * ...
     * mesh.update();
     * ```
     */
    constructor(engine: WonderlandEngine, params: Partial<MeshParameters> | number) {
        if (!isNumber(params)) {
            const mesh = engine.meshes.create(params);
            /* `super()` must be called as stated in the specification */
            super(engine, mesh._index);
            return mesh;
        }
        super(engine, params);
    }

    /** Number of vertices in this mesh. */
    get vertexCount(): number {
        return this.engine.wasm._wl_mesh_get_vertexCount(this._id);
    }

    /** Index data (read-only) or `null` if the mesh is not indexed. */
    get indexData(): Uint8Array | Uint16Array | Uint32Array | null {
        const wasm = this.engine.wasm;
        const tempMem = wasm._tempMem;
        const ptr = wasm._wl_mesh_get_indexData(this._id, tempMem, tempMem + 4);
        if (ptr === null) return null;

        const indexCount = wasm.HEAPU32[tempMem / 4];
        const indexSize = wasm.HEAPU32[tempMem / 4 + 1];
        switch (indexSize) {
            case MeshIndexType.UnsignedByte:
                return new Uint8Array(wasm.HEAPU8.buffer, ptr, indexCount);
            case MeshIndexType.UnsignedShort:
                return new Uint16Array(wasm.HEAPU16.buffer, ptr, indexCount);
            case MeshIndexType.UnsignedInt:
                return new Uint32Array(wasm.HEAPU32.buffer, ptr, indexCount);
        }
        return null;
    }

    /**
     * Apply changes to {@link attribute | vertex attributes}.
     *
     * Uploads the updated vertex attributes to the GPU and updates the bounding
     * sphere to match the new vertex positions.
     *
     * Since this is an expensive operation, call it only once you have performed
     * all modifications on a mesh and avoid calling if you did not perform any
     * modifications at all.
     */
    update() {
        this.engine.wasm._wl_mesh_update(this._id);
    }

    /** @overload */
    getBoundingSphere(): Float32Array;
    /** @overload */
    getBoundingSphere<T extends NumberArray>(out: T): T;
    /**
     * Mesh bounding sphere.
     *
     * @param out Preallocated array to write into, to avoid garbage,
     *     otherwise will allocate a new Float32Array.
     *
     * ```js
     *  const sphere = new Float32Array(4);
     *  for(...) {
     *      mesh.getBoundingSphere(sphere);
     *      ...
     *  }
     * ```
     *
     * If the position data is changed, call {@link Mesh#update} to update the
     * bounding sphere.
     *
     * @returns Bounding sphere, 0-2 sphere origin, 3 radius.
     */
    getBoundingSphere<T extends NumberArray>(out: T | Float32Array): T | Float32Array;
    getBoundingSphere<T extends NumberArray>(
        out: T | Float32Array = new Float32Array(4)
    ): T | Float32Array {
        const wasm = this.engine.wasm;
        this.engine.wasm._wl_mesh_get_boundingSphere(this._id, wasm._tempMem);
        out[0] = wasm._tempMemFloat[0];
        out[1] = wasm._tempMemFloat[1];
        out[2] = wasm._tempMemFloat[2];
        out[3] = wasm._tempMemFloat[3];
        return out as T;
    }

    /** @overload */
    attribute(
        attr: MeshAttribute.Position
    ): MeshAttributeAccessor<Float32ArrayConstructor> | null;
    /** @overload */
    attribute(
        attr: MeshAttribute.Tangent
    ): MeshAttributeAccessor<Float32ArrayConstructor> | null;
    /** @overload */
    attribute(
        attr: MeshAttribute.Normal
    ): MeshAttributeAccessor<Float32ArrayConstructor> | null;
    /** @overload */
    attribute(
        attr: MeshAttribute.TextureCoordinate
    ): MeshAttributeAccessor<Float32ArrayConstructor> | null;
    /** @overload */
    attribute(
        attr: MeshAttribute.Color
    ): MeshAttributeAccessor<Float32ArrayConstructor> | null;
    /** @overload */
    attribute(
        attr: MeshAttribute.JointId
    ): MeshAttributeAccessor<Uint16ArrayConstructor> | null;
    /** @overload */
    attribute(
        attr: MeshAttribute.JointWeight
    ): MeshAttributeAccessor<Float32ArrayConstructor> | null;
    /**
     * Get an attribute accessor to retrieve or modify data of give attribute.
     *
     * @param attr Attribute to get access to
     * @returns Attribute to get access to or `null`, if mesh does not have this attribute.
     *
     * Call {@link update} for changes to vertex attributes to take effect.
     *
     * If there are no shaders in the scene that use `TextureCoordinate` for example,
     * no meshes will have the `TextureCoordinate` attribute.
     *
     * For flexible reusable components, take this into account that only `Position`
     * is guaranteed to be present at all time.
     */
    attribute(attr: MeshAttribute): MeshAttributeAccessor | null;
    attribute(attr: MeshAttribute): MeshAttributeAccessor | null {
        if (typeof attr != 'number')
            throw new TypeError('Expected number, but got ' + typeof attr);

        const wasm = this.engine.wasm;
        const tempMemUint32 = wasm._tempMemUint32;
        wasm._wl_mesh_get_attribute(this._id, attr, wasm._tempMem);
        if (tempMemUint32[0] == 255) return null;

        const arraySize = tempMemUint32[5];
        return new MeshAttributeAccessor(this.engine, {
            attribute: tempMemUint32[0],
            offset: tempMemUint32[1],
            stride: tempMemUint32[2],
            formatSize: tempMemUint32[3],
            componentCount: tempMemUint32[4],
            /* The WASM API returns `0` for a scalar value. We clamp it to 1 as we strictly use it as a multiplier for get/set operations */
            arraySize: arraySize ? arraySize : 1,
            length: this.vertexCount,
            bufferType: (attr !== MeshAttribute.JointId
                ? Float32Array
                : Uint16Array) as TypedArrayCtor,
        });
    }

    /**
     * Destroy and free the meshes memory.
     *
     * It is best practice to set the mesh variable to `null` after calling
     * destroy to prevent accidental use:
     *
     * ```js
     *   mesh.destroy();
     *   mesh = null;
     * ```
     *
     * Accessing the mesh after destruction behaves like accessing an empty
     * mesh.
     *
     * @since 0.9.0
     */
    destroy(): void {
        this.engine.wasm._wl_mesh_destroy(this._id);
        this.engine.meshes._destroy(this);
    }

    toString() {
        if (this.isDestroyed) {
            return 'Mesh(destroyed)';
        }
        return `Mesh(${this._index})`;
    }
}

/**
 * Options to create a new {@link MeshAttributeAccessor} instance.
 */
interface MeshAttributeAccessorOptions<T extends TypedArrayCtor> {
    attribute: number;
    offset: number;
    stride: number;
    formatSize: number;
    componentCount: number;
    arraySize: number;
    length: number;
    bufferType: T;
}

/**
 * An iterator over a mesh vertex attribute.
 *
 * Usage:
 *
 * ```js
 * const mesh = this.object.getComponent('mesh').mesh;
 * const positions = mesh.attribute(MeshAttribute.Position);
 *
 * // Equivalent to `new Float32Array(3)`.
 * const temp = positions.createArray();
 *
 * for(let i = 0; i < positions.length; ++i) {
 *     // `pos` will reference `temp` and thereby not allocate additional
 *     // memory, which would cause a perf spike when collected.
 *     const pos = positions.get(i, temp);
 *     // Scale position by 2 on x-axis only.
 *     pos[0] *= 2.0;
 *     positions.set(i, pos);
 * }
 * // We're done modifying, tell the engine to move vertex data to the GPU.
 * mesh.update();
 * ```
 */
export class MeshAttributeAccessor<T extends TypedArrayCtor = TypedArrayCtor> {
    /** Max number of elements. */
    readonly length: number = 0;

    /** Wonderland Engine instance. @hidden */
    protected readonly _engine: WonderlandEngine;

    /** Attribute index. @hidden */
    private _attribute: number = -1;
    /** Attribute offset. @hidden */
    private _offset: number = 0;
    /** Attribute stride. @hidden */
    private _stride: number = 0;
    /** Format size native enum. @hidden */
    private _formatSize: number = 0;
    /** Number of components per vertex. @hidden */
    private _componentCount: number = 0;
    /** Number of values per vertex. @hidden */
    private _arraySize: number = 1;
    /**
     * Class to instantiate an ArrayBuffer to get/set values.
     */
    private _bufferType: T;
    /**
     * Function to allocate temporary WASM memory. It is cached in the accessor to avoid
     * conditionals during get/set.
     */
    private _tempBufferGetter: (bytes: number) => TypedArray<T>;

    /**
     * Create a new instance.
     *
     * @note Please use {@link Mesh.attribute} to create a new instance.
     *
     * @param options Contains information about how to read the data.
     * @note Do not use this constructor. Instead, please use the {@link Mesh.attribute} method.
     *
     * @hidden
     */
    constructor(engine: WonderlandEngine, options: MeshAttributeAccessorOptions<T>) {
        this._engine = engine;
        const wasm = this._engine.wasm;

        this._attribute = options.attribute;
        this._offset = options.offset;
        this._stride = options.stride;
        this._formatSize = options.formatSize;
        this._componentCount = options.componentCount;
        this._arraySize = options.arraySize;
        this._bufferType = options.bufferType;
        this.length = options.length;

        this._tempBufferGetter = (
            this._bufferType === Float32Array
                ? wasm.getTempBufferF32.bind(wasm)
                : wasm.getTempBufferU16.bind(wasm)
        ) as () => TypedArray<T>;
    }

    /**
     * Create a new TypedArray to hold this attribute's values.
     *
     * This method is useful to create a view to hold the data to
     * pass to {@link get} and {@link set}
     *
     * Example:
     *
     * ```js
     * const vertexCount = 4;
     * const positionAttribute = mesh.attribute(MeshAttribute.Position);
     *
     * // A position has 3 floats per vertex. Thus, positions has length 3 * 4.
     * const positions = positionAttribute.createArray(vertexCount);
     * ```
     *
     * @param count The number of **vertices** expected.
     * @returns A TypedArray with the appropriate format to access the data
     */
    createArray(count = 1): TypedArray<T> {
        count = count > this.length ? this.length : count;
        return new this._bufferType(
            count * this._componentCount * this._arraySize
        ) as TypedArray<T>;
    }

    /** @overload */
    get(index: number): TypedArray<T>;
    /**
     * Get attribute element.
     *
     * @param index Index
     * @param out Preallocated array to write into,
     *      to avoid garbage, otherwise will allocate a new TypedArray.
     *
     * `out.length` needs to be a multiple of the attributes component count, see
     * {@link MeshAttribute}. If `out.length` is more than one multiple, it will be
     * filled with the next n attribute elements, which can reduce overhead
     * of this call.
     *
     * @returns The `out` parameter
     */
    get<T extends NumberArray>(index: number, out: T): T;
    get(index: number, out: NumberArray = this.createArray()): NumberArray {
        if (out.length % this._componentCount !== 0) {
            throw new Error(
                `out.length, ${out.length} is not a multiple of the attribute vector components, ${this._componentCount}`
            );
        }

        const dest = this._tempBufferGetter(out.length);
        const elementSize = this._bufferType.BYTES_PER_ELEMENT;
        const destSize = elementSize * out.length;
        const srcFormatSize = this._formatSize * this._arraySize;
        const destFormatSize = this._componentCount * elementSize * this._arraySize;

        this._engine.wasm._wl_mesh_get_attribute_values(
            this._attribute,
            srcFormatSize,
            this._offset + index * this._stride,
            this._stride,
            destFormatSize,
            dest.byteOffset,
            destSize
        );

        for (let i = 0; i < out.length; ++i) out[i] = dest[i];
        return out;
    }

    /**
     * Set attribute element.
     *
     * @param i Index
     * @param v Value to set the element to
     *
     * `v.length` needs to be a multiple of the attributes component count, see
     * {@link MeshAttribute}. If `v.length` is more than one multiple, it will be
     * filled with the next n attribute elements, which can reduce overhead
     * of this call.
     *
     * @returns Reference to self (for method chaining)
     */
    set(i: number, v: Readonly<NumberArray>) {
        if (v.length % this._componentCount !== 0)
            throw new Error(
                `out.length, ${v.length} is not a multiple of the attribute vector components, ${this._componentCount}`
            );

        const elementSize = this._bufferType.BYTES_PER_ELEMENT;
        const srcSize = elementSize * v.length;
        const srcFormatSize = this._componentCount * elementSize * this._arraySize;
        const destFormatSize = this._formatSize * this._arraySize;

        const wasm = this._engine.wasm;

        /* Unless we are already working with data from WASM heap, we
         * need to copy into temporary memory. */
        if ((v as Float32Array).buffer != wasm.HEAPU8.buffer) {
            const dest = this._tempBufferGetter(v.length);
            dest.set(v);
            v = dest;
        }

        wasm._wl_mesh_set_attribute_values(
            this._attribute,
            srcFormatSize,
            (v as Float32Array).byteOffset,
            srcSize,
            destFormatSize,
            this._offset + i * this._stride,
            this._stride
        );

        return this;
    }

    /** Hosting engine instance. */
    get engine() {
        return this._engine;
    }
}

/**
 * Wrapper around a native font resource.
 *
 * @note Fonts are **per-engine**, they can thus be shared by multiple scenes.
 *
 * @since 1.2.0
 */
export class Font extends Resource {
    /** Em height in object space. Equivalent to line height. */
    get emHeight(): number {
        return this.engine.wasm._wl_font_get_emHeight(this._id);
    }

    /**
     * Cap height in object space. This is the typical height of capital
     * letters. Can be 0 if not defined by the font.
     */
    get capHeight(): number {
        return this.engine.wasm._wl_font_get_capHeight(this._id);
    }

    /**
     * X height in object space. This is the typical height of lowercase
     * letters. Can be 0 if not defined by the font.
     */
    get xHeight(): number {
        return this.engine.wasm._wl_font_get_xHeight(this._id);
    }

    /**
     * Outline size. This is the factor by which characters are expanded to
     * create the outline effect. Returns 0 if the font was compiled without
     * an outline.
     *
     * @since 1.2.1
     */
    get outlineSize(): number {
        return this.engine.wasm._wl_font_get_outlineSize(this._id);
    }
}

/** Temporary canvas */
let temp2d: {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
} | null = null;

/**
 * Wrapper around a native texture data.
 *
 * For more information about how to create meshes, have a look at the
 * {@link TextureManager} class.
 *
 * @note Textures are **per-engine**, they can thus be shared by multiple scenes.
 */
export class Texture extends Resource {
    /**
     * @deprecated Use {@link TextureManager.create} instead, accessible via
     * {@link WonderlandEngine.textures}:
     *
     * ```js
     * const image = new Image();
     * image.onload = () => {
     *     const texture = engine.textures.create(image);
     * };
     * ```
     */
    constructor(engine: WonderlandEngine, param: ImageLike | number) {
        if (isImageLike(param)) {
            const texture = engine.textures.create(param);
            /* `super()` must be called as stated in the specification */
            super(engine, texture._index);
            return texture;
        }
        super(engine, param);
    }

    /**
     * Whether this texture is valid
     *
     * @deprecated Use {@link SceneResource#isDestroyed} instead.
     */
    get valid(): boolean {
        return !this.isDestroyed;
    }

    /**
     * Index in this manager.
     *
     * @deprecated Use {@link Texture.index} instead.
     */
    get id(): number {
        return this.index;
    }

    /** Update the texture to match the HTML element (e.g. reflect the current frame of a video). */
    update() {
        const image = this._imageIndex;
        if (!this.valid || !image) return;
        this.engine.wasm._wl_renderer_updateImage(image);
    }

    /** Width of the texture. */
    get width(): number {
        /* HTML textures should be read directly from js, since the C++ could be
         * one frame out-of-sync on the size of the element itself. */
        const element = this.htmlElement;
        if (element) return element.width;

        const wasm = this.engine.wasm;
        wasm._wl_image_size(this._imageIndex, wasm._tempMem);
        return wasm._tempMemUint32[0];
    }

    /** Height of the texture. */
    get height(): number {
        /* HTML textures should be read directly from js, since the C++ could be
         * one frame out-of-sync on the size of the element itself. */
        const element = this.htmlElement;
        if (element) return element.height;

        const wasm = this.engine.wasm;
        wasm._wl_image_size(this._imageIndex, wasm._tempMem);
        return wasm._tempMemUint32[1];
    }

    /**
     * Returns the html element associated to this texture.
     *
     * @note This accessor will return `null` if the image is compressed.
     */
    get htmlElement(): ImageLike | null {
        const image = this._imageIndex;
        if (!image) return null;

        const wasm = this.engine.wasm;
        const jsImageIndex = wasm._wl_image_get_jsImage_index(image);

        /* Since the first element is `null`, no need to check for `jsImageIndex` */
        return wasm._images[jsImageIndex];
    }

    /**
     * Update a subrange on the texture to match the HTML element (e.g. reflect the current frame of a video).
     *
     * Usage:
     *
     * ```js
     * // Copies rectangle of pixel starting from (10, 20)
     * texture.updateSubImage(10, 20, 600, 400);
     * ```
     *
     * @param x x offset
     * @param y y offset
     * @param w width
     * @param h height
     */
    updateSubImage(x: number, y: number, w: number, h: number): void {
        if (this.isDestroyed) return;

        const image = this._imageIndex;
        if (!image) return;

        const wasm = this.engine.wasm;
        const jsImageIndex = wasm._wl_image_get_jsImage_index(image);

        /* Lazy initialize temp canvas */
        if (!temp2d) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                throw new Error(
                    'Texture.updateSubImage(): Failed to obtain CanvasRenderingContext2D.'
                );
            }
            temp2d = {
                canvas,
                ctx,
            };
        }

        const img = wasm._images[jsImageIndex];
        if (!img) return;

        /** @todo: If the image is an instance of canvas, this
         * can be skipped entirely. */
        temp2d.canvas.width = w;
        temp2d.canvas.height = h;
        temp2d.ctx.drawImage(img, x, y, w, h, 0, 0, w, h);

        const yOffset = ((img as HTMLVideoElement).videoHeight ?? img.height) - y - h;
        wasm._images[jsImageIndex] = temp2d.canvas;
        wasm._wl_renderer_updateImage(image, x, yOffset);
        wasm._images[jsImageIndex] = img;
    }

    /**
     * Destroy and free the texture's texture altas space and memory.
     *
     * It is best practice to set the texture variable to `null` after calling
     * destroy to prevent accidental use of the invalid texture:
     *
     * ```js
     *   texture.destroy();
     *   texture = null;
     * ```
     *
     * @since 0.9.0
     */
    destroy(): void {
        const wasm = this.engine.wasm;
        wasm._wl_texture_destroy(this._id);
        this.engine.textures._destroy(this);
    }

    toString() {
        if (this.isDestroyed) {
            return 'Texture(destroyed)';
        }
        return `Texture(${this._index})`;
    }
    private get _imageIndex() {
        return this.engine.wasm._wl_texture_get_image_index(this._id);
    }
}

/**
 * Wrapper around a native animation.
 */
export class Animation extends SceneResource {
    /**
     * @param index Index in the manager
     */
    constructor(host: WonderlandEngine | Prefab = WL, index: number) {
        const scene = host instanceof Prefab ? host : host.scene;
        super(scene as Prefab, index);
    }

    /** Duration of this animation. */
    get duration(): number {
        return this.engine.wasm._wl_animation_get_duration(this._id);
    }

    /** Number of tracks in this animation. */
    get trackCount(): number {
        return this.engine.wasm._wl_animation_get_trackCount(this._id);
    }

    /**
     * Clone this animation retargeted to a new set of objects.
     *
     * The clone shares most of the data with the original and is therefore
     * light-weight.
     *
     * **Experimental:** This API might change in upcoming versions.
     *
     * If retargeting to {@link Skin}, the join names will be used to determine a mapping
     * from the previous skin to the new skin. The source skin will be retrieved from
     * the first track in the animation that targets a joint.
     *
     * @param newTargets New targets per track. Expected to have
     *      {@link Animation#trackCount} elements or to be a {@link Skin}.
     * @returns The retargeted clone of this animation.
     */
    retarget(newTargets: Object3D[] | Skin): Animation {
        const wasm = this.engine.wasm;
        if (newTargets instanceof Skin) {
            const index = wasm._wl_animation_retargetToSkin(this._id, newTargets._id);
            return this._scene.animations.wrap(index)!;
        }

        if (newTargets.length != this.trackCount) {
            throw Error(
                'Expected ' +
                    this.trackCount.toString() +
                    ' targets, but got ' +
                    newTargets.length.toString()
            );
        }
        const ptr = wasm._malloc(2 * newTargets.length);
        for (let i = 0; i < newTargets.length; ++i) {
            const object3d = newTargets[i];
            this.scene.assertOrigin(object3d);
            /* Use local id here and **not** packed id, because the WASM
             * takes ownership and reinterprets the ids. */
            wasm.HEAPU16[ptr >> (1 + i)] = newTargets[i].objectId;
        }
        const index = wasm._wl_animation_retarget(this._id, ptr);
        wasm._free(ptr);

        return this._scene.animations.wrap(index)!;
    }

    toString() {
        if (this.isDestroyed) {
            return 'Animation(destroyed)';
        }
        return `Animation(${this._index})`;
    }
}

/**
 * Scene graph object.
 *
 * Node in the scene graph or "entity". Consists of transformation and a reference
 * to its parent object. Usually holds components and is accessible by components
 * through {@link Component#object}.
 *
 * Objects are stored in a data oriented manner inside WebAssembly memory. This class
 * is a JavaScript API wrapper around this memory for more convenient use in
 * components.
 *
 * Objects can be created and added to a scene through {@link Prefab.addObject}:
 *
 * ```js
 * const parent = scene.addObject();
 * parent.name = 'parent`';
 * const child = scene.addObject(parent);
 * child.name = 'child`';
 * ```
 */
export class Object3D {
    /**
     * Packed object id, containing scene index and local id.
     *
     * @hidden
     */
    readonly _id: number = -1;
    /** Object id, relative to the scene manager. @hidden */
    readonly _localId: number = -1;

    /** Scene instance. @hidden */
    protected readonly _scene: Prefab;
    /** Wonderland Engine instance. @hidden */
    protected readonly _engine: WonderlandEngine;

    /**
     * @param o Object id to wrap.
     *
     * @deprecated Objects must be obtained via {@link Scene.addObject} or {@link Scene.wrap}:
     *
     * ```js
     * // Create a new object.
     * const obj = scene.addObject();
     *
     * // Wrap an object using its id. The id must be valid.
     * const obj = scene.wrap(0);
     * ```
     *
     * @hidden
     */
    constructor(scene: WonderlandEngine | Prefab, id: number) {
        scene = scene instanceof Prefab ? scene : scene.scene;
        this._localId = id;
        this._id = (scene._index << 22) | id;
        this._scene = scene;
        /** @todo: Remove and only keep getter. */
        this._engine = scene.engine;
    }

    /**
     * Name of the object.
     *
     * Useful for identifying objects during debugging.
     */
    get name(): string {
        const wasm = this._engine.wasm;
        return wasm.UTF8ToString(wasm._wl_object_name(this._id));
    }

    /**
     * Set the object's name.
     *
     * @param newName The new name to set.
     */
    set name(newName: string) {
        const wasm = this._engine.wasm;
        wasm._wl_object_set_name(this._id, wasm.tempUTF8(newName));
    }

    /**
     * Parent of this object or `null` if parented to root.
     */
    get parent(): Object3D | null {
        const p = this._engine.wasm._wl_object_parent(this._id);
        return p === 0 ? null : this._scene.wrap(p);
    }

    /**
     * Equivalent to {@link Object3D.getChildren}.
     *
     * @note Prefer to use {@link Object3D.getChildren} for performance.
     */
    get children(): Object3D[] {
        return this.getChildren();
    }

    /** The number of children of this object. */
    get childrenCount(): number {
        return this._engine.wasm._wl_object_get_children_count(this._id);
    }

    /**
     * Reparent object to given object.
     *
     * @note Reparenting is not trivial and might have a noticeable performance impact.
     *
     * @param newParent New parent or `null` to parent to root
     */
    set parent(newParent: Object3D | undefined | null) {
        if (this.markedDestroyed) {
            const strThis = this.toString();
            const strParent = newParent ? newParent : 'root';
            throw new Error(
                `Failed to attach ${strThis} to ${strParent}. ${strThis} is marked as destroyed.`
            );
        } else if (newParent?.markedDestroyed) {
            const strParent = newParent.toString();
            throw new Error(
                `Failed to attach ${this} to ${strParent}. ${strParent} is marked as destroyed.`
            );
        }
        this.scene.assertOrigin(newParent);
        this._engine.wasm._wl_object_set_parent(
            this._id,
            newParent == null ? 0 : newParent._id
        );
    }

    /** Local object id in the scene manager. */
    get objectId() {
        return this._localId;
    }

    /** Scene instance. */
    get scene() {
        return this._scene;
    }

    /** Hosting engine instance. */
    get engine() {
        return this._engine;
    }

    /**
     * Add an object as a child of this instance.
     *
     * @returns A newly created object.
     */
    addChild(): Object3D {
        const objectId = this.engine.wasm._wl_scene_add_object(this.scene._index, this._id);
        const obj = this.scene.wrap(objectId);
        return obj;
    }

    /**
     * Clone this hierarchy into a new one.
     *
     * Cloning copies the hierarchy structure, object names,
     * as well as components.
     *
     * JavaScript components are cloned using {@link Component.copy}. You can
     * override this method in your components.
     *
     * @param parent The parent for the cloned hierarchy or `null` to clone
     *     into the scene root. Defaults to `null`.
     *
     * @returns The clone of this object.
     */
    clone(parent: Object3D | null = null): Object3D {
        this.scene.assertOrigin(parent);
        const engine = this._engine;
        const id = engine.wasm._wl_object_clone(this._id, parent ? parent._id : 0);
        return this._scene.wrap(id);
    }

    /**
     * Children of this object.
     *
     * @note Child order is **undefined**. No assumptions should be made
     * about the index of a specific object.
     *
     * If you need to access a specific child of this object, you can
     * use {@link Object3D.findByName}.
     *
     * When the object exists in the scene at editor time, prefer passing it as
     * a component property.
     *
     * @note When providing an output array, only `this.childrenCount` elements will be written.
     * The rest of the array will not be modified by this method.
     *
     * @param out Destination array, expected to have at least `this.childrenCount` elements.
     * @returns The `out` parameter.
     */
    getChildren(out: Object3D[] = new Array(this.childrenCount)): Object3D[] {
        const childrenCount = this.childrenCount;
        if (childrenCount === 0) return out;

        const wasm = this._engine.wasm;
        wasm.requireTempMem(childrenCount * 2);

        this._engine.wasm._wl_object_get_children(
            this._id,
            wasm._tempMem,
            wasm._tempMemSize >> 1
        );

        for (let i = 0; i < childrenCount; ++i) {
            out[i] = this._scene.wrap(wasm._tempMemUint16[i]);
        }
        return out;
    }

    /**
     * Reset local transformation (translation, rotation and scaling) to identity.
     *
     * @returns Reference to self (for method chaining).
     */
    resetTransform(): this {
        this._engine.wasm._wl_object_reset_translation_rotation(this._id);
        this._engine.wasm._wl_object_reset_scaling(this._id);
        return this;
    }

    /**
     * Reset local position and rotation to identity.
     *
     * @returns Reference to self (for method chaining).
     */
    resetPositionRotation(): this {
        this._engine.wasm._wl_object_reset_translation_rotation(this._id);
        return this;
    }

    /** @deprecated Please use {@link Object3D.resetPositionRotation} instead. */
    resetTranslationRotation(): this {
        return this.resetPositionRotation();
    }

    /**
     * Reset local rotation, keep translation.
     *
     * @note To reset both rotation and translation, prefer
     *       {@link resetTranslationRotation}.
     *
     * @returns Reference to self (for method chaining).
     */
    resetRotation(): this {
        this._engine.wasm._wl_object_reset_rotation(this._id);
        return this;
    }

    /**
     * Reset local translation, keep rotation.
     *
     * @note To reset both rotation and translation, prefer
     *       {@link resetTranslationRotation}.
     *
     * @returns Reference to self (for method chaining).
     */
    resetPosition(): this {
        this._engine.wasm._wl_object_reset_translation(this._id);
        return this;
    }

    /** @deprecated Please use {@link Object3D.resetPosition} instead. */
    resetTranslation(): this {
        return this.resetPosition();
    }

    /**
     * Reset local scaling to identity (``[1.0, 1.0, 1.0]``).
     *
     * @returns Reference to self (for method chaining).
     */
    resetScaling(): this {
        this._engine.wasm._wl_object_reset_scaling(this._id);
        return this;
    }

    /** @deprecated Please use {@link Object3D.translateLocal} instead. */
    translate(v: Readonly<NumberArray>): this {
        return this.translateLocal(v);
    }

    /**
     * Translate object by a vector in the parent's space.
     *
     * @param v Vector to translate by.
     *
     * @returns Reference to self (for method chaining).
     */
    translateLocal(v: Readonly<NumberArray>): this {
        this._engine.wasm._wl_object_translate(this._id, v[0], v[1], v[2]);
        return this;
    }

    /**
     * Translate object by a vector in object space.
     *
     * @param v Vector to translate by.
     *
     * @returns Reference to self (for method chaining).
     */
    translateObject(v: Readonly<NumberArray>): this {
        this._engine.wasm._wl_object_translate_obj(this._id, v[0], v[1], v[2]);
        return this;
    }

    /**
     * Translate object by a vector in world space.
     *
     * @param v Vector to translate by.
     *
     * @returns Reference to self (for method chaining).
     */
    translateWorld(v: Readonly<NumberArray>): this {
        this._engine.wasm._wl_object_translate_world(this._id, v[0], v[1], v[2]);
        return this;
    }

    /** @deprecated Please use {@link Object3D.rotateAxisAngleDegLocal} instead. */
    rotateAxisAngleDeg(a: Readonly<NumberArray>, d: number): this {
        this.rotateAxisAngleDegLocal(a, d);
        return this;
    }

    /**
     * Rotate around given axis by given angle (degrees) in local space.
     *
     * @param a Vector representing the rotation axis.
     * @param d Angle in degrees.
     *
     * @note If the object is translated the rotation will be around
     *     the parent. To rotate around the object origin, use
     *     {@link rotateAxisAngleDegObject}
     *
     * @see {@link rotateAxisAngleRad}
     *
     * @returns Reference to self (for method chaining).
     */
    rotateAxisAngleDegLocal(a: Readonly<NumberArray>, d: number): this {
        this._engine.wasm._wl_object_rotate_axis_angle(this._id, a[0], a[1], a[2], d);
        return this;
    }

    /** @deprecated Please use {@link Object3D.rotateAxisAngleRadLocal} instead. */
    rotateAxisAngleRad(a: Readonly<NumberArray>, d: number): this {
        return this.rotateAxisAngleRadLocal(a, d);
    }

    /**
     * Rotate around given axis by given angle (radians) in local space.
     *
     * @param a Vector representing the rotation axis.
     * @param d Angle in radians.
     *
     * @note If the object is translated the rotation will be around
     *     the parent. To rotate around the object origin, use
     *     {@link rotateAxisAngleDegObject}
     *
     * @see {@link rotateAxisAngleDeg}
     *
     * @returns Reference to self (for method chaining).
     */
    rotateAxisAngleRadLocal(a: Readonly<NumberArray>, d: number): this {
        this._engine.wasm._wl_object_rotate_axis_angle_rad(this._id, a[0], a[1], a[2], d);
        return this;
    }

    /**
     * Rotate around given axis by given angle (degrees) in object space.
     *
     * @param a Vector representing the rotation axis.
     * @param d Angle in degrees.
     *
     * Equivalent to prepending a rotation quaternion to the object's
     * local transformation.
     *
     * @see {@link rotateAxisAngleRadObject}
     *
     * @returns Reference to self (for method chaining).
     */
    rotateAxisAngleDegObject(a: Readonly<NumberArray>, d: number): this {
        this._engine.wasm._wl_object_rotate_axis_angle_obj(this._id, a[0], a[1], a[2], d);
        return this;
    }

    /**
     * Rotate around given axis by given angle (radians) in object space
     * Equivalent to prepending a rotation quaternion to the object's
     * local transformation.
     *
     * @param a Vector representing the rotation axis
     * @param d Angle in degrees
     *
     * @see {@link rotateAxisAngleDegObject}
     *
     * @returns Reference to self (for method chaining).
     */
    rotateAxisAngleRadObject(a: Readonly<NumberArray>, d: number): this {
        this._engine.wasm._wl_object_rotate_axis_angle_rad_obj(
            this._id,
            a[0],
            a[1],
            a[2],
            d
        );
        return this;
    }

    /** @deprecated Please use {@link Object3D.rotateLocal} instead. */
    rotate(q: Readonly<NumberArray>): this {
        this.rotateLocal(q);
        return this;
    }

    /**
     * Rotate by a quaternion.
     *
     * @param q the Quaternion to rotate by.
     *
     * @returns Reference to self (for method chaining).
     */
    rotateLocal(q: Readonly<NumberArray>): this {
        this._engine.wasm._wl_object_rotate_quat(this._id, q[0], q[1], q[2], q[3]);
        return this;
    }

    /**
     * Rotate by a quaternion in object space.
     *
     * Equivalent to prepending a rotation quaternion to the object's
     * local transformation.
     *
     * @param q the Quaternion to rotate by.
     *
     * @returns Reference to self (for method chaining).
     */
    rotateObject(q: Readonly<NumberArray>): this {
        this._engine.wasm._wl_object_rotate_quat_obj(this._id, q[0], q[1], q[2], q[3]);
        return this;
    }

    /** @deprecated Please use {@link Object3D.scaleLocal} instead. */
    scale(v: Readonly<NumberArray>): this {
        this.scaleLocal(v);
        return this;
    }

    /**
     * Scale object by a vector in object space.
     *
     * @param v Vector to scale by.
     *
     * @returns Reference to self (for method chaining).
     */
    scaleLocal(v: Readonly<NumberArray>): this {
        this._engine.wasm._wl_object_scale(this._id, v[0], v[1], v[2]);
        return this;
    }

    /** @overload */
    getPositionLocal(): Float32Array;
    /**
     * Compute local / object space position from transformation.
     *
     * @param out Destination array/vector, expected to have at least 3 elements.
     * @returns The `out` parameter.
     */
    getPositionLocal<T extends NumberArray>(out: T): T;
    getPositionLocal(out: NumberArray = new Float32Array(3)): NumberArray {
        const wasm = this._engine.wasm;
        /* Translation is different than rotation & scaling.
         * We can't simply read the memory. */
        wasm._wl_object_get_translation_local(this._id, wasm._tempMem);
        out[0] = wasm._tempMemFloat[0];
        out[1] = wasm._tempMemFloat[1];
        out[2] = wasm._tempMemFloat[2];
        return out;
    }

    /** @overload */
    getTranslationLocal(): Float32Array;
    /** @deprecated Please use {@link Object3D.getPositionLocal} instead. */
    getTranslationLocal<T extends NumberArray>(out: T): T;
    getTranslationLocal(out: NumberArray = new Float32Array(3)): NumberArray {
        return this.getPositionLocal(out);
    }

    /** @overload */
    getPositionWorld(): Float32Array;
    /**
     * Compute world space position from transformation.
     *
     * May recompute transformations of the hierarchy of this object,
     * if they were changed by JavaScript components this frame.
     *
     * @param out Destination array/vector, expected to have at least 3 elements.
     * @return The `out` parameter.
     */
    getPositionWorld<T extends NumberArray>(out: T): T;
    getPositionWorld(out: NumberArray = new Float32Array(3)): NumberArray {
        const wasm = this._engine.wasm;
        /* Translation is different than rotation & scaling.
         * We can't simply read the memory. */
        wasm._wl_object_get_translation_world(this._id, wasm._tempMem);
        out[0] = wasm._tempMemFloat[0];
        out[1] = wasm._tempMemFloat[1];
        out[2] = wasm._tempMemFloat[2];
        return out;
    }

    /** @overload */
    getTranslationWorld(): Float32Array;
    /** @deprecated Please use {@link Object3D.getPositionWorld} instead. */
    getTranslationWorld<T extends NumberArray>(out: T): T;
    getTranslationWorld(out: NumberArray = new Float32Array(3)): NumberArray {
        return this.getPositionWorld(out);
    }

    /**
     * Set local / object space position.
     *
     * Concatenates a new translation dual quaternion onto the existing rotation.
     *
     * @param v New local position array/vector, expected to have at least 3 elements.
     *
     * @returns Reference to self (for method chaining).
     */
    setPositionLocal(v: Readonly<NumberArray>): this {
        this._engine.wasm._wl_object_set_translation_local(this._id, v[0], v[1], v[2]);
        return this;
    }

    /** @deprecated Please use {@link Object3D.setPositionLocal} instead. */
    setTranslationLocal(v: Readonly<NumberArray>): this {
        return this.setPositionLocal(v);
    }

    /**
     * Set world space position.
     *
     * Applies the inverse parent transform with a new translation dual quaternion
     * which is concatenated onto the existing rotation.
     *
     * @param v New world position array/vector, expected to have at least 3 elements.
     *
     * @returns Reference to self (for method chaining).
     */
    setPositionWorld(v: Readonly<NumberArray>): this {
        this._engine.wasm._wl_object_set_translation_world(this._id, v[0], v[1], v[2]);
        return this;
    }

    /** @deprecated Please use {@link Object3D.setPositionWorld} instead. */
    setTranslationWorld(v: Readonly<NumberArray>): this {
        return this.setPositionWorld(v);
    }

    /** @overload */
    getScalingLocal(): Float32Array;
    /**
     * Local / object space scaling.
     *
     * @param out Destination array/vector, expected to have at least 3 elements.
     * @return The `out` parameter.
     *
     * @since 1.0.0
     */
    getScalingLocal<T extends NumberArray>(out: T): T;
    getScalingLocal(out: NumberArray = new Float32Array(3)) {
        const wasm = this._engine.wasm;
        const ptr = wasm._wl_object_scaling_local(this._id) / 4; /* Align F32 */
        out[0] = wasm.HEAPF32[ptr];
        out[1] = wasm.HEAPF32[ptr + 1];
        out[2] = wasm.HEAPF32[ptr + 2];
        return out;
    }

    /**
     * Set local / object space scaling.
     *
     * @param v New local scaling array/vector, expected to have at least 3 elements.
     *
     * @returns Reference to self (for method chaining).
     */
    setScalingLocal(v: Readonly<NumberArray>): this {
        this._engine.wasm._wl_object_set_scaling_local(this._id, v[0], v[1], v[2]);
        return this;
    }

    /** @overload */
    getScalingWorld(): Float32Array;
    /**
     * World space scaling.
     *
     * @param out Destination array/vector, expected to have at least 3 elements.
     * @return The `out` parameter.
     *
     * @since 1.0.0
     */
    getScalingWorld<T extends NumberArray>(out: T): T;
    getScalingWorld(out: NumberArray = new Float32Array(3)) {
        const wasm = this._engine.wasm;
        const ptr = wasm._wl_object_scaling_world(this._id) / 4; /* Align F32 */
        out[0] = wasm.HEAPF32[ptr];
        out[1] = wasm.HEAPF32[ptr + 1];
        out[2] = wasm.HEAPF32[ptr + 2];
        return out;
    }

    /**
     * Set World space scaling.
     *
     * @param v New world scaling array/vector, expected to have at least 3 elements.
     *
     * @returns Reference to self (for method chaining).
     */
    setScalingWorld(v: Readonly<NumberArray>): this {
        this._engine.wasm._wl_object_set_scaling_world(this._id, v[0], v[1], v[2]);
        return this;
    }

    /** @overload */
    getRotationLocal(): Float32Array;
    /**
     * Local space rotation.
     *
     * @param out Destination array/vector, expected to have at least 4 elements.
     * @return The `out` parameter.
     *
     * @since 1.0.0
     */
    getRotationLocal<T extends NumberArray>(out: T): T;
    getRotationLocal(out: NumberArray = new Float32Array(4)) {
        const wasm = this._engine.wasm;
        const ptr = wasm._wl_object_trans_local(this._id) / 4; /* Align F32 */
        /* The first 4 floats represent the rotation quaternion. */
        out[0] = wasm.HEAPF32[ptr];
        out[1] = wasm.HEAPF32[ptr + 1];
        out[2] = wasm.HEAPF32[ptr + 2];
        out[3] = wasm.HEAPF32[ptr + 3];
        return out;
    }

    /**
     * Set local space rotation.
     *
     * @param v New world rotation array/vector, expected to have at least 4 elements.
     *
     * @returns Reference to self (for method chaining).
     */
    setRotationLocal(v: Readonly<NumberArray>): this {
        this._engine.wasm._wl_object_set_rotation_local(this._id, v[0], v[1], v[2], v[3]);
        return this;
    }

    /** @overload */
    getRotationWorld(): Float32Array;
    /**
     * World space rotation.
     *
     * @param out Destination array/vector, expected to have at least 4 elements.
     * @return The `out` parameter.
     *
     * @since 1.0.0
     */
    getRotationWorld<T extends NumberArray>(out: T): T;
    getRotationWorld(out: NumberArray = new Float32Array(4)) {
        const wasm = this._engine.wasm;
        const ptr = wasm._wl_object_trans_world(this._id) / 4; /* Align F32 */
        /* The first 4 floats represent the rotation quaternion. */
        out[0] = wasm.HEAPF32[ptr];
        out[1] = wasm.HEAPF32[ptr + 1];
        out[2] = wasm.HEAPF32[ptr + 2];
        out[3] = wasm.HEAPF32[ptr + 3];
        return out;
    }

    /**
     * Set local space rotation.
     *
     * @param v New world rotation array/vector, expected to have at least 4 elements.
     *
     * @returns Reference to self (for method chaining).
     */
    setRotationWorld(v: Readonly<NumberArray>): this {
        this._engine.wasm._wl_object_set_rotation_world(this._id, v[0], v[1], v[2], v[3]);
        return this;
    }

    /** @overload */
    getTransformLocal(): Float32Array;
    /**
     * Local space transformation.
     *
     * @param out Destination array/vector, expected to have at least 8 elements.
     * @return The `out` parameter.
     */
    getTransformLocal<T extends NumberArray>(out: T): T;
    getTransformLocal(out: NumberArray = new Float32Array(8)) {
        const wasm = this._engine.wasm;
        const ptr = wasm._wl_object_trans_local(this._id) / 4; /* Align F32 */
        out[0] = wasm.HEAPF32[ptr];
        out[1] = wasm.HEAPF32[ptr + 1];
        out[2] = wasm.HEAPF32[ptr + 2];
        out[3] = wasm.HEAPF32[ptr + 3];
        out[4] = wasm.HEAPF32[ptr + 4];
        out[5] = wasm.HEAPF32[ptr + 5];
        out[6] = wasm.HEAPF32[ptr + 6];
        out[7] = wasm.HEAPF32[ptr + 7];
        return out;
    }

    /**
     * Set local space rotation.
     *
     * @param v New local transform array, expected to have at least 8 elements.
     *
     * @returns Reference to self (for method chaining).
     */
    setTransformLocal(v: Readonly<NumberArray>): this {
        const wasm = this._engine.wasm;
        const ptr = wasm._wl_object_trans_local(this._id) / 4; /* Align F32 */
        wasm.HEAPF32[ptr] = v[0];
        wasm.HEAPF32[ptr + 1] = v[1];
        wasm.HEAPF32[ptr + 2] = v[2];
        wasm.HEAPF32[ptr + 3] = v[3];
        wasm.HEAPF32[ptr + 4] = v[4];
        wasm.HEAPF32[ptr + 5] = v[5];
        wasm.HEAPF32[ptr + 6] = v[6];
        wasm.HEAPF32[ptr + 7] = v[7];
        this.setDirty();
        return this;
    }

    /** @overload */
    getTransformWorld(): Float32Array;
    /**
     * World space transformation.
     *
     * @param out Destination array, expected to have at least 8 elements.
     * @return The `out` parameter.
     */
    getTransformWorld<T extends NumberArray>(out: T): T;
    getTransformWorld(out: NumberArray = new Float32Array(8)) {
        const wasm = this._engine.wasm;
        const ptr = wasm._wl_object_trans_world(this._id) / 4; /* Align F32 */
        out[0] = wasm.HEAPF32[ptr];
        out[1] = wasm.HEAPF32[ptr + 1];
        out[2] = wasm.HEAPF32[ptr + 2];
        out[3] = wasm.HEAPF32[ptr + 3];
        out[4] = wasm.HEAPF32[ptr + 4];
        out[5] = wasm.HEAPF32[ptr + 5];
        out[6] = wasm.HEAPF32[ptr + 6];
        out[7] = wasm.HEAPF32[ptr + 7];
        return out;
    }

    /**
     * Set world space rotation.
     *
     * @param v New world transform array, expected to have at least 8 elements.
     *
     * @returns Reference to self (for method chaining).
     */
    setTransformWorld(v: Readonly<NumberArray>): this {
        const wasm = this._engine.wasm;
        const ptr = wasm._wl_object_trans_world(this._id) / 4; /* Align F32 */
        wasm.HEAPF32[ptr] = v[0];
        wasm.HEAPF32[ptr + 1] = v[1];
        wasm.HEAPF32[ptr + 2] = v[2];
        wasm.HEAPF32[ptr + 3] = v[3];
        wasm.HEAPF32[ptr + 4] = v[4];
        wasm.HEAPF32[ptr + 5] = v[5];
        wasm.HEAPF32[ptr + 6] = v[6];
        wasm.HEAPF32[ptr + 7] = v[7];
        this._engine.wasm._wl_object_trans_world_to_local(this._id);
        return this;
    }

    /**
     * Local space transformation.
     *
     * @deprecated Please use {@link Object3D.setTransformLocal} and
     * {@link Object3D.getTransformLocal} instead.
     */
    get transformLocal(): Float32Array {
        const wasm = this._engine.wasm;
        return new Float32Array(
            wasm.HEAPF32.buffer,
            wasm._wl_object_trans_local(this._id),
            8
        );
    }

    /**
     * Set local transform.
     *
     * @param t Local space transformation.
     *
     * @since 0.8.5
     *
     * @deprecated Please use {@link Object3D.setTransformLocal} and
     * {@link Object3D.getTransformLocal} instead.
     */
    set transformLocal(t: Readonly<NumberArray>) {
        this.transformLocal.set(t);
        this.setDirty();
    }

    /**
     * Global / world space transformation.
     *
     * May recompute transformations of the hierarchy of this object,
     * if they were changed by JavaScript components this frame.
     *
     * @deprecated Please use {@link Object3D.setTransformWorld} and
     * {@link Object3D.getTransformWorld} instead.
     */
    get transformWorld(): Float32Array {
        const wasm = this._engine.wasm;
        return new Float32Array(
            wasm.HEAPF32.buffer,
            wasm._wl_object_trans_world(this._id),
            8
        );
    }

    /**
     * Set world transform.
     *
     * @param t Global / world space transformation.
     *
     * @since 0.8.5
     *
     * @deprecated Please use {@link Object3D.setTransformWorld} and
     * {@link Object3D.getTransformWorld} instead.
     */
    set transformWorld(t: Readonly<NumberArray>) {
        this.transformWorld.set(t);
        this._engine.wasm._wl_object_trans_world_to_local(this._id);
    }

    /**
     * Local / object space scaling.
     *
     * @deprecated Please use {@link Object3D.setScalingLocal} and
     * {@link Object3D.getScalingLocal} instead.
     */
    get scalingLocal(): Float32Array {
        const wasm = this._engine.wasm;
        return new Float32Array(
            wasm.HEAPF32.buffer,
            wasm._wl_object_scaling_local(this._id),
            3
        );
    }

    /**
     * Set local space scaling.
     *
     * @param s Local space scaling.
     *
     * @since 0.8.7
     *
     * @deprecated Please use {@link Object3D.setScalingLocal} and
     * {@link Object3D.getScalingLocal} instead.
     */
    set scalingLocal(s: Readonly<NumberArray>) {
        this.scalingLocal.set(s);
        this.setDirty();
    }

    /**
     * Global / world space scaling.
     *
     * May recompute transformations of the hierarchy of this object,
     * if they were changed by JavaScript components this frame.
     *
     * @deprecated Please use {@link Object3D.setScalingWorld} and
     * {@link Object3D.getScalingWorld} instead.
     */
    get scalingWorld(): Float32Array {
        const wasm = this._engine.wasm;
        return new Float32Array(
            wasm.HEAPF32.buffer,
            wasm._wl_object_scaling_world(this._id),
            3
        );
    }

    /**
     * Set world space scaling.
     *
     * @param t World space scaling.
     *
     * @since 0.8.7
     *
     * @deprecated Please use {@link Object3D.setScalingWorld} and
     * {@link Object3D.getScalingWorld} instead.
     */
    set scalingWorld(s: Readonly<NumberArray>) {
        this.scalingWorld.set(s);
        this._engine.wasm._wl_object_scaling_world_to_local(this._id);
    }

    /**
     * Local space rotation.
     *
     * @since 0.8.7
     *
     * @deprecated Please use {@link Object3D.getRotationLocal} and
     * {@link Object3D.setRotationLocal} instead.
     */
    get rotationLocal(): Float32Array {
        return this.transformLocal.subarray(0, 4);
    }

    /**
     * Global / world space rotation
     *
     * @since 0.8.7
     *
     * @deprecated Please use {@link Object3D.getRotationWorld} and
     * {@link Object3D.setRotationWorld} instead.
     */
    get rotationWorld(): Float32Array {
        return this.transformWorld.subarray(0, 4);
    }

    /**
     * Set local space rotation.
     *
     * @param r Local space rotation
     *
     * @since 0.8.7
     *
     * @deprecated Please use {@link Object3D.getRotationLocal} and
     * {@link Object3D.setRotationLocal} instead.
     */
    set rotationLocal(r: Readonly<NumberArray>) {
        this._engine.wasm._wl_object_set_rotation_local(this._id, r[0], r[1], r[2], r[3]);
    }

    /**
     * Set world space rotation.
     *
     * @param r Global / world space rotation.
     *
     * @since 0.8.7
     *
     * @deprecated Please use {@link Object3D.getRotationWorld} and
     * {@link Object3D.setRotationWorld} instead.
     */
    set rotationWorld(r: Readonly<NumberArray>) {
        this._engine.wasm._wl_object_set_rotation_world(this._id, r[0], r[1], r[2], r[3]);
    }

    /** @deprecated Please use {@link Object3D.getForwardWorld} instead. */
    getForward<T extends NumberArray>(out: T): T {
        return this.getForwardWorld(out);
    }

    /**
     * Compute the object's forward facing world space vector.
     *
     * The forward vector in object space is along the negative z-axis, i.e.,
     * `[0, 0, -1]`.
     *
     * @param out Destination array/vector, expected to have at least 3 elements.
     * @return The `out` parameter.
     */
    getForwardWorld<T extends NumberArray>(out: T): T {
        out[0] = 0;
        out[1] = 0;
        out[2] = -1;
        this.transformVectorWorld(out);
        return out;
    }

    /** @deprecated Please use {@link Object3D.getUpWorld} instead. */
    getUp<T extends NumberArray>(out: T): T {
        return this.getUpWorld(out);
    }

    /**
     * Compute the object's up facing world space vector.
     *
     * @param out Destination array/vector, expected to have at least 3 elements.
     * @return The `out` parameter.
     */
    getUpWorld<T extends NumberArray>(out: T): T {
        out[0] = 0;
        out[1] = 1;
        out[2] = 0;
        this.transformVectorWorld(out);
        return out;
    }

    /** @deprecated Please use {@link Object3D.getRightWorld} instead. */
    getRight<T extends NumberArray>(out: T): T {
        return this.getRightWorld(out);
    }

    /**
     * Compute the object's right facing world space vector.
     *
     * @param out Destination array/vector, expected to have at least 3 elements.
     * @return The `out` parameter.
     */
    getRightWorld<T extends NumberArray>(out: T): T {
        out[0] = 1;
        out[1] = 0;
        out[2] = 0;
        this.transformVectorWorld(out);
        return out;
    }

    /**
     * Transform a vector by this object's world transform.
     *
     * @param out Out vector
     * @param v Vector to transform, default `out`
     * @return The `out` parameter.
     *
     * @since 0.8.7
     */
    transformVectorWorld<T extends NumberArray>(out: T, v: NumberArray = out): T {
        const wasm = this._engine.wasm;
        wasm._tempMemFloat[0] = v[0];
        wasm._tempMemFloat[1] = v[1];
        wasm._tempMemFloat[2] = v[2];
        wasm._wl_object_transformVectorWorld(this._id, wasm._tempMem);
        out[0] = wasm._tempMemFloat[0];
        out[1] = wasm._tempMemFloat[1];
        out[2] = wasm._tempMemFloat[2];
        return out;
    }

    /**
     * Transform a vector by this object's local transform.
     *
     * @param out Out vector
     * @param v Vector to transform, default `out`
     * @return The `out` parameter.
     *
     * @since 0.8.7
     */
    transformVectorLocal<T extends NumberArray>(out: T, v: NumberArray = out): T {
        const wasm = this._engine.wasm;
        wasm._tempMemFloat[0] = v[0];
        wasm._tempMemFloat[1] = v[1];
        wasm._tempMemFloat[2] = v[2];
        wasm._wl_object_transformVectorLocal(this._id, wasm._tempMem);
        out[0] = wasm._tempMemFloat[0];
        out[1] = wasm._tempMemFloat[1];
        out[2] = wasm._tempMemFloat[2];
        return out;
    }

    /**
     * Transform a point by this object's world transform.
     *
     * @param out Out point.
     * @param p Point to transform, default `out`.
     * @return The `out` parameter.
     *
     * @since 0.8.7
     */
    transformPointWorld<T extends NumberArray>(out: T, p: NumberArray = out): T {
        const wasm = this._engine.wasm;
        wasm._tempMemFloat[0] = p[0];
        wasm._tempMemFloat[1] = p[1];
        wasm._tempMemFloat[2] = p[2];
        wasm._wl_object_transformPointWorld(this._id, wasm._tempMem);
        out[0] = wasm._tempMemFloat[0];
        out[1] = wasm._tempMemFloat[1];
        out[2] = wasm._tempMemFloat[2];

        return out;
    }

    /**
     * Transform a point by this object's local transform.
     *
     * @param out Out point.
     * @param p Point to transform, default `out`.
     * @return The `out` parameter.
     *
     * @since 0.8.7
     */
    transformPointLocal<T extends NumberArray>(out: T, p: NumberArray = out): T {
        const wasm = this._engine.wasm;
        wasm._tempMemFloat[0] = p[0];
        wasm._tempMemFloat[1] = p[1];
        wasm._tempMemFloat[2] = p[2];
        wasm._wl_object_transformPointLocal(this._id, wasm._tempMem);
        out[0] = wasm._tempMemFloat[0];
        out[1] = wasm._tempMemFloat[1];
        out[2] = wasm._tempMemFloat[2];

        return out;
    }

    /**
     * Transform a vector by this object's inverse world transform.
     *
     * @param out Out vector.
     * @param v Vector to transform, default `out`.
     * @return The `out` parameter.
     *
     * @since 0.8.7
     */
    transformVectorInverseWorld<T extends NumberArray>(out: T, v: NumberArray = out): T {
        const wasm = this._engine.wasm;
        wasm._tempMemFloat[0] = v[0];
        wasm._tempMemFloat[1] = v[1];
        wasm._tempMemFloat[2] = v[2];
        wasm._wl_object_transformVectorInverseWorld(this._id, wasm._tempMem);
        out[0] = wasm._tempMemFloat[0];
        out[1] = wasm._tempMemFloat[1];
        out[2] = wasm._tempMemFloat[2];

        return out;
    }

    /**
     * Transform a vector by this object's inverse local transform.
     *
     * @param out Out vector
     * @param v Vector to transform, default `out`
     * @return The `out` parameter.
     *
     * @since 0.8.7
     */
    transformVectorInverseLocal<T extends NumberArray>(out: T, v: NumberArray = out): T {
        const wasm = this._engine.wasm;
        wasm._tempMemFloat[0] = v[0];
        wasm._tempMemFloat[1] = v[1];
        wasm._tempMemFloat[2] = v[2];
        wasm._wl_object_transformVectorInverseLocal(this._id, wasm._tempMem);
        out[0] = wasm._tempMemFloat[0];
        out[1] = wasm._tempMemFloat[1];
        out[2] = wasm._tempMemFloat[2];

        return out;
    }

    /**
     * Transform a point by this object's inverse world transform.
     *
     * @param out Out point.
     * @param p Point to transform, default `out`.
     * @return The `out` parameter.
     *
     * @since 0.8.7
     */
    transformPointInverseWorld<T extends NumberArray>(out: T, p: NumberArray = out): T {
        const wasm = this._engine.wasm;
        wasm._tempMemFloat[0] = p[0];
        wasm._tempMemFloat[1] = p[1];
        wasm._tempMemFloat[2] = p[2];
        wasm._wl_object_transformPointInverseWorld(this._id, wasm._tempMem);
        out[0] = wasm._tempMemFloat[0];
        out[1] = wasm._tempMemFloat[1];
        out[2] = wasm._tempMemFloat[2];

        return out;
    }

    /**
     * Transform a point by this object's inverse local transform.
     *
     * @param out Out point.
     * @param p Point to transform, default `out`.
     * @return The `out` parameter.
     *
     * @since 0.8.7
     */
    transformPointInverseLocal<T extends NumberArray>(out: T, p: NumberArray = out): T {
        const wasm = this._engine.wasm;
        wasm._tempMemFloat.set(p);
        wasm._wl_object_transformPointInverseLocal(this._id, wasm._tempMem);
        out[0] = wasm._tempMemFloat[0];
        out[1] = wasm._tempMemFloat[1];
        out[2] = wasm._tempMemFloat[2];

        return out;
    }

    /**
     * Transform an object space dual quaternion into world space.
     *
     * @param out Out transformation.
     * @param q Local space transformation, default `out`.
     * @return The `out` parameter.
     *
     * @since 0.8.7
     */
    toWorldSpaceTransform<T extends NumberArray>(out: T, q: NumberArray = out): T {
        const wasm = this._engine.wasm;
        wasm._tempMemFloat.set(q);
        wasm._wl_object_toWorldSpaceTransform(this._id, wasm._tempMem);
        out[0] = wasm._tempMemFloat[0];
        out[1] = wasm._tempMemFloat[1];
        out[2] = wasm._tempMemFloat[2];
        out[3] = wasm._tempMemFloat[3];

        out[4] = wasm._tempMemFloat[4];
        out[5] = wasm._tempMemFloat[5];
        out[6] = wasm._tempMemFloat[6];
        out[7] = wasm._tempMemFloat[7];

        return out;
    }

    /**
     * Transform a world space dual quaternion into local space.
     *
     * @param out Out transformation
     * @param q World space transformation, default `out`
     * @return The `out` parameter.
     *
     * @since 0.8.7
     */
    toLocalSpaceTransform<T extends NumberArray>(out: T, q: NumberArray = out): T {
        const p = this.parent;
        if (p) {
            p.toObjectSpaceTransform(out, q);
            return out;
        }
        if (out !== q) {
            out[0] = q[0];
            out[1] = q[1];
            out[2] = q[2];
            out[3] = q[3];
            out[4] = q[4];
            out[5] = q[5];
            out[6] = q[6];
            out[7] = q[7];
        }
        return out;
    }

    /**
     * Transform a world space dual quaternion into object space.
     *
     * @param out Out transformation.
     * @param q World space transformation, default `out`
     * @return The `out` parameter.
     *
     * @since 0.8.7
     */
    toObjectSpaceTransform<T extends NumberArray>(out: T, q: NumberArray = out): T {
        const wasm = this._engine.wasm;
        wasm._tempMemFloat.set(q);
        wasm._wl_object_toObjectSpaceTransform(this._id, wasm._tempMem);
        out[0] = wasm._tempMemFloat[0];
        out[1] = wasm._tempMemFloat[1];
        out[2] = wasm._tempMemFloat[2];
        out[3] = wasm._tempMemFloat[3];

        out[4] = wasm._tempMemFloat[4];
        out[5] = wasm._tempMemFloat[5];
        out[6] = wasm._tempMemFloat[6];
        out[7] = wasm._tempMemFloat[7];

        return out;
    }

    /**
     * Turn towards / look at target.
     *
     * Rotates the object so that its forward vector faces towards the target
     * position. The `up` vector acts as a hint to uniquely orient the object's
     * up direction. When orienting a view component, the projected `up` vector
     * faces upwards on the viewing plane.
     *
     * @param p Target position to turn towards, in world space.
     * @param up Up vector to align object with, in world space. Default is `[0, 1, 0]`.
     *
     * @returns Reference to self (for method chaining).
     */
    lookAt(p: NumberArray, up: NumberArray = UP_VECTOR): this {
        this._engine.wasm._wl_object_lookAt(
            this._id,
            p[0],
            p[1],
            p[2],
            up[0],
            up[1],
            up[2]
        );
        return this;
    }

    /** Destroy the object with all of its components and remove it from the scene */
    destroy(): void {
        if (this._id < 0) return;
        /* This will automatically call `scene._destroyObject` */
        this.engine.wasm._wl_object_remove(this._id);
    }

    /**
     * Mark transformation dirty.
     *
     * Causes an eventual recalculation of {@link transformWorld}, either
     * on next {@link getTranslationWorld}, {@link transformWorld} or
     * {@link scalingWorld} or the beginning of next frame, whichever
     * happens first.
     */
    setDirty(): void {
        this._engine.wasm._wl_object_set_dirty(this._id);
    }

    /**
     * Disable/enable all components of this object.
     *
     * @param b New state for the components.
     *
     * @since 0.8.5
     */
    set active(b: boolean) {
        const comps = this.getComponents();
        for (let c of comps) {
            c.active = b;
        }
    }

    /* `getComponent` overloads for native components. */

    /** @overload */
    getComponent(type: 'collision', index?: number): CollisionComponent | null;
    /** @overload */
    getComponent(type: 'text', index?: number): TextComponent | null;
    /** @overload */
    getComponent(type: 'view', index?: number): ViewComponent | null;
    /** @overload */
    getComponent(type: 'mesh', index?: number): MeshComponent | null;
    /** @overload */
    getComponent(type: 'input', index?: number): InputComponent | null;
    /** @overload */
    getComponent(type: 'light', index?: number): LightComponent | null;
    /** @overload */
    getComponent(type: 'animation', index?: number): AnimationComponent | null;
    /** @overload */
    getComponent(type: 'physx', index?: number): PhysXComponent | null;
    /** @overload */
    getComponent(typeOrClass: string, index?: number): Component | null;
    /**
     * Get a component attached to this object.
     *
     * @param typeOrClass Type name. It's also possible to give a class definition.
     *     In this case, the method will use the `class.TypeName` field to find the component.
     * @param index=0 Index for component of given type. This can be used to access specific
     *      components if the object has multiple components of the same type.
     * @returns The component or `null` if there is no such component on this object
     */
    getComponent<T extends Component>(
        typeOrClass: ComponentConstructor<T>,
        index?: number
    ): T | null;
    getComponent(
        typeOrClass: string | ComponentConstructor,
        index: number = 0
    ): Component | null {
        const wasm = this._engine.wasm;
        const type = isString(typeOrClass) ? typeOrClass : typeOrClass.TypeName;

        const scene = this._scene;
        const componentType = wasm._wl_scene_get_component_manager_index(
            scene._index,
            wasm.tempUTF8(type)
        );

        if (componentType < 0) {
            /* Not a native component, try js: */
            const typeIndex = wasm._componentTypeIndices[type];
            if (typeIndex === undefined) return null;
            const jsIndex = wasm._wl_get_js_component_index(this._id, typeIndex, index);
            if (jsIndex < 0) return null;

            const component = this._scene._jsComponents[jsIndex];
            return component.constructor !== BrokenComponent ? component : null;
        }

        const componentId = wasm._wl_get_component_id(this._id, componentType, index);
        return scene._components.wrapNative(componentType, componentId);
    }

    /* `getComponents` overloads for native components. */

    /** @overload */
    getComponents(type: 'collision'): CollisionComponent[];
    /** @overload */
    getComponents(type: 'text'): TextComponent[];
    /** @overload */
    getComponents(type: 'view'): ViewComponent[];
    /** @overload */
    getComponents(type: 'mesh'): MeshComponent[];
    /** @overload */
    getComponents(type: 'input'): InputComponent[];
    /** @overload */
    getComponents(type: 'light'): LightComponent[];
    /** @overload */
    getComponents(type: 'animation'): AnimationComponent[];
    /** @overload */
    getComponents(type: 'physx'): PhysXComponent[];
    /** @overload */
    getComponents(type?: string | null): Component[];
    /**
     * @param typeOrClass Type name, pass a falsey value (`undefined` or `null`) to retrieve all.
     *     It's also possible to give a class definition. In this case, the method will use the `class.TypeName` field to
     *     find the components.
     * @returns All components of given type attached to this object.
     *
     * @note As this function is non-trivial, avoid using it in `update()` repeatedly,
     *      but rather store its result in `init()` or `start()`
     * @warning This method will currently return at most 341 components.
     */
    getComponents<T extends Component>(typeOrClass: ComponentConstructor<T>): T[];
    getComponents<T extends Component>(
        typeOrClass?: string | ComponentConstructor<T> | null
    ): T[] {
        const wasm = this._engine.wasm;
        const scene = this._scene;

        let manager = null;
        let type = null;
        if (typeOrClass) {
            type = isString(typeOrClass) ? typeOrClass : typeOrClass.TypeName;
            const nativeManager = scene._components.getNativeManager(type);
            manager = nativeManager !== null ? nativeManager : scene._components.js;
        }

        const components: Component[] = [];
        const maxComps = Math.floor((wasm._tempMemSize / 3) * 2);
        const componentsCount = wasm._wl_object_get_components(
            this._id,
            wasm._tempMem,
            maxComps
        );
        const offset = 2 * componentsCount;
        wasm._wl_object_get_component_types(this._id, wasm._tempMem + offset, maxComps);

        for (let i = 0; i < componentsCount; ++i) {
            const t = wasm._tempMemUint8[i + offset];
            const componentId = wasm._tempMemUint16[i];
            if (manager !== null && t !== manager) continue;

            const comp = this._scene._components.wrapAny(t, componentId);
            if (!comp) continue;
            if (type && type !== (comp.constructor as ComponentConstructor).TypeName)
                continue;
            components.push(comp);
        }
        return components as T[];
    }

    /* `addComponent` overloads for native components. */

    /** @overload */
    addComponent(type: 'collision', params?: Record<string, any>): CollisionComponent;
    /** @overload */
    addComponent(type: 'text', params?: Record<string, any>): TextComponent;
    /** @overload */
    addComponent(type: 'view', params?: Record<string, any>): ViewComponent;
    /** @overload */
    addComponent(type: 'mesh', params?: Record<string, any>): MeshComponent;
    /** @overload */
    addComponent(type: 'input', params?: Record<string, any>): InputComponent;
    /** @overload */
    addComponent(type: 'light', params?: Record<string, any>): LightComponent;
    /** @overload */
    addComponent(type: 'animation', params?: Record<string, any>): AnimationComponent;
    /** @overload */
    addComponent(type: 'physx', params?: Record<string, any>): PhysXComponent;
    /** @overload */
    addComponent(type: string, params?: Record<string, any>): Component;
    /**
     * Add component of given type to the object.
     *
     * You can use this function to clone components, see the example below.
     *
     * ```js
     *  // Clone existing component (since 0.8.10)
     *  let original = this.object.getComponent('mesh');
     *  otherObject.addComponent('mesh', original);
     *  // Create component from parameters
     *  this.object.addComponent('mesh', {
     *      mesh: someMesh,
     *      material: someMaterial,
     *  });
     * ```
     *
     * @param typeOrClass Typename to create a component of. Can be native or
     *     custom JavaScript component type. It's also possible to give a class definition.
     *     In this case, the method will use the `class.TypeName` field.
     * @param params Parameters to initialize properties of the new component,
     *      can be another component to copy properties from.
     *
     * @returns The component or `null` if the type was not found
     */
    addComponent<T extends Component>(
        typeClass: ComponentConstructor<T>,
        params?: Record<string, any>
    ): T;
    addComponent(
        typeOrClass: ComponentConstructor | string,
        params?: Record<string, any>
    ): Component {
        if (this.markedDestroyed) {
            throw new Error(`Failed to add component. ${this} is marked as destroyed.`);
        }

        const wasm = this._engine.wasm;

        const type = isString(typeOrClass) ? typeOrClass : typeOrClass.TypeName;
        const nativeManager = this._scene._components.getNativeManager(type);
        const isNative = nativeManager !== null;
        const manager = isNative ? nativeManager : this._scene._components.js;

        let componentId = -1;
        if (!isNative) {
            /* JavaScript component */
            if (!(type in wasm._componentTypeIndices)) {
                throw new TypeError("Unknown component type '" + type + "'");
            }
            componentId = wasm._wl_object_add_js_component(
                this._id,
                wasm._componentTypeIndices[type]
            );
        } else {
            /* native component */
            componentId = wasm._wl_object_add_component(this._id, manager);
        }

        const component = this._scene._components.wrapAny(manager, componentId)!;

        if (params !== undefined) component.copy(params as Component);

        /* Explicitly initialize js components */
        if (!isNative) {
            component._triggerInit();
            /* start() is called through onActivate() */
        }

        /* If it was not explicitly requested by the user to leave the component inactive,
         * we activate it as a final step. This invalidates componentIndex! */
        if (!params || !('active' in params && !params.active)) {
            component.active = true;
        }

        return component;
    }

    /**
     * Search for descendants matching the name.
     *
     * This method is a wrapper around {@link Object3D.findByNameDirect} and
     * {@link Object3D.findByNameRecursive}.
     *
     * @param name The name to search for.
     * @param recursive If `true`, the method will look at all the descendants of this object.
     *     If `false`, this method will only perform the search in direct children.
     * @returns An array of {@link Object3D} matching the name.
     *
     * @since 1.1.0
     */
    findByName(name: string, recursive = false): Object3D[] {
        return recursive ? this.findByNameRecursive(name) : this.findByNameDirect(name);
    }

    /**
     * Search for all **direct** children matching the name.
     *
     * @note Even though this method is heavily optimized, it does perform
     * a linear search to find the objects. Do not use in a hot path.
     *
     * @param name The name to search for.
     * @returns An array of {@link Object3D} matching the name.
     *
     * @since 1.1.0
     */
    findByNameDirect(name: string): Object3D[] {
        const wasm = this._engine.wasm;
        const id = this._id;

        /* Divide by 4 to get half as many ushort as possible */
        const tempSizeU16 = wasm._tempMemSize >> 2;
        const maxCount = tempSizeU16 - 2; /* Reserve two ushort */

        const buffer = wasm._tempMemUint16;
        buffer[maxCount] = 0; /* Index offset */
        buffer[maxCount + 1] = 0; /* child count */

        const bufferPtr = wasm._tempMem;
        const indexPtr = bufferPtr + maxCount * 2;
        const childCountPtr = bufferPtr + maxCount * 2 + 2;
        const namePtr = wasm.tempUTF8(name, (maxCount + 2) * 2);

        const result: Object3D[] = [];
        let read = 0;
        while (
            (read = wasm._wl_object_findByName(
                id,
                namePtr,
                indexPtr,
                childCountPtr,
                bufferPtr,
                maxCount
            ))
        ) {
            for (let i = 0; i < read; ++i) {
                result.push(this._scene.wrap(buffer[i]));
            }
        }

        return result;
    }

    /**
     * Search for **all descendants** matching the name.
     *
     * @note Even though this method is heavily optimized, it does perform
     * a linear search to find the objects. Do not use in a hot path.
     *
     * @param name The name to search for.
     * @returns An array of {@link Object3D} matching the name.
     *
     * @since 1.1.0
     */
    findByNameRecursive(name: string): Object3D[] {
        const wasm = this._engine.wasm;
        const id = this._id;

        /* Divide by 4 to get half as many ushort as possible */
        const tempSizeU16 = wasm._tempMemSize >> 2;
        const maxCount = tempSizeU16 - 1; /* Reserve one ushort */

        const buffer = wasm._tempMemUint16;
        buffer[maxCount] = 0; /* Index offset */

        const bufferPtr = wasm._tempMem;
        const indexPtr = bufferPtr + maxCount * 2;
        const namePtr = wasm.tempUTF8(name, (maxCount + 1) * 2);

        let read = 0;
        const result: Object3D[] = [];
        while (
            (read = wasm._wl_object_findByNameRecursive(
                id,
                namePtr,
                indexPtr,
                bufferPtr,
                maxCount
            ))
        ) {
            for (let i = 0; i < read; ++i) {
                result.push(this._scene.wrap(buffer[i]));
            }
        }

        return result;
    }

    /**
     * Whether given object's transformation has changed.
     */
    get changed(): boolean {
        return !!this._engine.wasm._wl_object_is_changed(this._id);
    }

    /**
     * `true` if the object is destroyed, `false` otherwise.
     *
     * If {@link WonderlandEngine.erasePrototypeOnDestroy} is `true`,
     * reading a custom property will not work:
     *
     * ```js
     * engine.erasePrototypeOnDestroy = true;
     *
     * const obj = scene.addObject();
     * obj.customParam = 'Hello World!';
     *
     * console.log(obj.isDestroyed); // Prints `false`
     * obj.destroy();
     * console.log(obj.isDestroyed); // Prints `true`
     * console.log(obj.customParam); // Throws an error
     * ```
     *
     * @since 1.1.1
     */
    get isDestroyed(): boolean {
        return this._id < 0;
    }

    /**
     * `true` if the object is marked as destroyed.
     *
     * This boolean will only ever be `true` when reading objects state
     * from the {@link Component.onDestroy} callback, i.e.,
     *
     * ```js
     * import {Component} from '@wonderlandengine/api';
     * class CleanupComponent extends Component {
     *     onDestroy() {
     *         if (this.object.markedDestroyed) {
     *             // this object is getting removed
     *         } else {
     *             // The component is getting destroyed, the object will
     *             // still exist after the destruction call
     *         }
     *     }
     * }
     * ```
     *
     * Certain operations are forbidden when an object is pending destruction:
     * - Reparenting the object via {@link parent}
     * - {@link addComponent}
     * - {@link Scene.addObject}
     * - {@link Scene.destroy}
     */
    get markedDestroyed(): boolean {
        const wasm = this.engine.wasm;
        if (!wasm._wl_object_markedDestroyed) {
            /** @todo(1.3.0): Remove check for runtime < 1.2.2 */
            return false;
        }
        return !!wasm._wl_object_markedDestroyed(this._id);
    }

    /**
     * Checks equality by comparing ids and **not** the JavaScript reference.
     *
     * @deprecate Use JavaScript reference comparison instead:
     *
     * ```js
     * const objectA = scene.addObject();
     * const objectB = scene.addObject();
     * const objectC = objectB;
     * console.log(objectA === objectB); // false
     * console.log(objectA === objectA); // true
     * console.log(objectB === objectC); // true
     * ```
     */
    equals(otherObject: Object3D | undefined | null): boolean {
        /** @todo(2.0.0): Remove this method. */
        if (!otherObject) return false;
        return this._id == otherObject._id;
    }

    toString() {
        if (this.isDestroyed) {
            return 'Object3D(destroyed)';
        }
        return `Object3D('${this.name}', ${this._localId})`;
    }
}

/**
 * Wrapper around a native skin data.
 */
export class Skin extends SceneResource {
    /** Amount of joints in this skin. */
    get jointCount() {
        return this.engine.wasm._wl_skin_get_joint_count(this._id);
    }

    /** Joints object ids for this skin */
    get jointIds(): Uint16Array {
        const wasm = this.engine.wasm;
        return new Uint16Array(
            wasm.HEAPU16.buffer,
            wasm._wl_skin_joint_ids(this._id),
            this.jointCount
        );
    }

    /**
     * Dual quaternions in a flat array of size 8 times {@link jointCount}.
     *
     * Inverse bind transforms of the skin.
     */
    get inverseBindTransforms(): Float32Array {
        const wasm = this.engine.wasm;
        return new Float32Array(
            wasm.HEAPF32.buffer,
            wasm._wl_skin_inverse_bind_transforms(this._id),
            8 * this.jointCount
        );
    }

    /**
     * Vectors in a flat array of size 3 times {@link jointCount}.
     *
     * Inverse bind scalings of the skin.
     */
    get inverseBindScalings(): Float32Array {
        const wasm = this.engine.wasm;
        return new Float32Array(
            wasm.HEAPF32.buffer,
            wasm._wl_skin_inverse_bind_scalings(this._id),
            3 * this.jointCount
        );
    }
}

/**
 * Wrapper around a native set of morph targets.
 *
 * ## Usage
 *
 * ```js
 * const mesh = object.getComponent('mesh');
 * const mouthTarget = mesh.morphTargets.getTargetIndex('mouth');
 * mesh.setMorphTargetWeight(mouthTarget, 0.5);
 * ```
 *
 * @since 1.2.0
 */
export class MorphTargets extends Resource {
    /** Amount of targets in this morph target set. */
    get count() {
        return this.engine.wasm._wl_morph_targets_get_target_count(this._id);
    }

    /** Returns the name of a given target */
    getTargetName(target: number): string {
        if (target >= this.count) {
            throw new Error(`Index ${target} is out of bounds for ${this.count} targets`);
        }
        const wasm = this.engine.wasm;
        return wasm.UTF8ToString(wasm._wl_morph_targets_get_target_name(this._id, target));
    }

    /**
     * Get the index for a given target name.
     *
     * Throws if no target with that name exists.
     *
     * @param name Name of the target.
     */
    getTargetIndex(name: string): number {
        const wasm = this.engine.wasm;
        const index = wasm._wl_morph_targets_get_target_index(
            this._id,
            wasm.tempUTF8(name)
        );
        if (index === -1) {
            throw Error(`Missing target '${name}'`);
        }
        return index;
    }
}

/* For backward compatibility with < 1.0.0. */
export {Object3D as Object};

/**
 * Ray hit.
 *
 * Result of a {@link Scene.rayCast} or {@link Physics.rayCast}.
 *
 * @note this class wraps internal engine data and should only be created internally.
 */
export class RayHit {
    /** Scene instance. @hidden */
    readonly _scene: Scene;

    /** Pointer to the memory heap. */
    private _ptr: number;

    /**
     * @param ptr Pointer to the ray hits memory.
     */
    constructor(scene: Scene, ptr: number) {
        if ((ptr & 3) !== 0) {
            throw new Error('Misaligned pointer: please report a bug');
        }
        this._scene = scene;
        this._ptr = ptr;
    }

    /** @overload */
    getLocations(): Float32Array[];
    /**
     * Array of ray hit locations.
     *
     * #### Usage
     *
     * ```js
     * const hit = engine.physics.rayCast();
     * if (hit.hitCount > 0) {
     *     const locations = hit.getLocations();
     *     console.log(`Object hit at: ${locations[0][0]}, ${locations[0][1]}, ${locations[0][2]}`);
     * }
     * ```
     *
     * @param out Destination array of arrays/vectors, expected to have at least
     *     `this.hitCount` elements. Each array is expected to have at least 3 elements.
     * @returns The `out` parameter.
     */
    getLocations<T extends NumberArray[]>(out: T): T;
    getLocations(out?: NumberArray[]): NumberArray[] {
        out = out ?? Array.from({length: this.hitCount}, () => new Float32Array(3));

        const wasm = this.engine.wasm;
        const alignedPtr = this._ptr / 4; /* Align F32 */
        for (let i = 0; i < this.hitCount; ++i) {
            const locationPtr = alignedPtr + 3 * i;
            out[i][0] = wasm.HEAPF32[locationPtr];
            out[i][1] = wasm.HEAPF32[locationPtr + 1];
            out[i][2] = wasm.HEAPF32[locationPtr + 2];
        }
        return out;
    }

    /** @overload */
    getNormals(): Float32Array[];
    /**
     * Array of ray hit normals (only when using {@link Physics#rayCast}.
     *
     * @param out Destination array of arrays/vectors, expected to have at least
     *     `this.hitCount` elements. Each array is expected to have at least 3 elements.
     * @returns The `out` parameter.
     */
    getNormals<T extends NumberArray[]>(out: T): T;
    getNormals(out?: NumberArray[]): NumberArray[] {
        out = out ?? Array.from({length: this.hitCount}, () => new Float32Array(3));

        const wasm = this.engine.wasm;
        const alignedPtr = (this._ptr + 48) / 4; /* Align F32 */
        for (let i = 0; i < this.hitCount; ++i) {
            const normalPtr = alignedPtr + 3 * i;
            out[i][0] = wasm.HEAPF32[normalPtr];
            out[i][1] = wasm.HEAPF32[normalPtr + 1];
            out[i][2] = wasm.HEAPF32[normalPtr + 2];
        }
        return out;
    }

    /** @overload */
    getDistances(): Float32Array;
    /**
     * Prefer these to recalculating the distance from locations.
     *
     * Distances of array hits to ray origin.
     *
     * @param out Destination array/vector, expected to have at least this.hitCount elements.
     * @returns The `out` parameter.
     */
    getDistances<T extends NumberArray>(out: T): T;
    getDistances(out: NumberArray = new Float32Array(this.hitCount)): NumberArray {
        const wasm = this.engine.wasm;
        const alignedPtr = (this._ptr + 48 * 2) / 4; /* Align F32 */
        for (let i = 0; i < this.hitCount; ++i) {
            const distancePtr = alignedPtr + i;
            out[i] = wasm.HEAPF32[distancePtr];
        }
        return out;
    }

    /**
     * Array of hit objects.
     *
     * @param out Destination array/vector, expected to have at least `this.hitCount` elements.
     * @returns The `out` parameter.
     */
    getObjects(out: Object3D[] = new Array(this.hitCount)): Object3D[] {
        const HEAPU16 = this.engine.wasm.HEAPU16;
        const alignedPtr = (this._ptr + (48 * 2 + 16)) >> 1;
        for (let i = 0; i < this.hitCount; ++i) {
            out[i] = this._scene.wrap(HEAPU16[alignedPtr + i]);
        }
        return out;
    }

    /** Hosting engine instance. */
    get engine() {
        return this._scene.engine;
    }

    /**
     * Equivalent to {@link RayHit.getLocations}.
     *
     * @note Prefer to use {@link RayHit.getLocations} for performance.
     */
    get locations(): Float32Array[] {
        return this.getLocations();
    }

    /**
     * Equivalent to {@link RayHit.getNormals}.
     *
     * @note Prefer to use {@link RayHit.getNormals} for performance.
     */
    get normals(): Float32Array[] {
        return this.getNormals();
    }

    /**
     * Equivalent to {@link RayHit.getDistances}.
     *
     * @note Prefer to use {@link RayHit.getDistances} for performance.
     */
    get distances(): Float32Array {
        return this.getDistances();
    }

    /**
     * Equivalent to {@link RayHit.getObjects}.
     *
     * @note Prefer to use {@link RayHit.getObjects} for performance.
     */
    get objects(): (Object3D | null)[] {
        /** @todo: Remove at 2.0.0, this is kept for backward compatibility. */
        const objects: (Object3D | null)[] = [null, null, null, null];
        return this.getObjects(objects as Object3D[]);
    }

    /** Number of hits (max 4) */
    get hitCount(): number {
        return Math.min(this.engine.wasm.HEAPU32[this._ptr / 4 + 30], 4);
    }
}

class math {
    /** (Experimental!) Cubic Hermite spline interpolation for vector3 and quaternions.
     *
     * With `f == 0`, `out` will be `b`, if `f == 1`, `out` will be c.
     *
     * Whether a quaternion or vector3 interpolation is intended is determined by
     * length of `a`.
     *
     * @param out Array to write result to.
     * @param a First tangent/handle.
     * @param b First point or quaternion.
     * @param c Second point or quaternion.
     * @param d Second handle.
     * @param f Interpolation factor in [0; 1].
     * @returns The `out` parameter.
     *
     * @since 0.8.6
     */
    static cubicHermite<T extends NumberArray>(
        out: T,
        a: Readonly<NumberArray>,
        b: Readonly<NumberArray>,
        c: Readonly<NumberArray>,
        d: Readonly<NumberArray>,
        f: number,
        engine: WonderlandEngine = WL
    ) {
        const wasm = engine.wasm;
        wasm._tempMemFloat.subarray(0).set(a);
        wasm._tempMemFloat.subarray(4).set(b);
        wasm._tempMemFloat.subarray(8).set(c);
        wasm._tempMemFloat.subarray(12).set(d);

        const isQuat = a.length == 4;

        wasm._wl_math_cubicHermite(
            wasm._tempMem + 4 * 16,
            wasm._tempMem + 4 * 0,
            wasm._tempMem + 4 * 4,
            wasm._tempMem + 4 * 8,
            wasm._tempMem + 4 * 12,
            f,
            isQuat
        );
        out[0] = wasm._tempMemFloat[16];
        out[1] = wasm._tempMemFloat[17];
        out[2] = wasm._tempMemFloat[18];
        if (isQuat) out[3] = wasm._tempMemFloat[19];
        return out;
    }
}

export {math};

/**
 * Class for accessing internationalization (i18n) features.
 *
 * Allows {@link I18N.onLanguageChanged "detecting language change"},
 * {@link I18N.language "setting the current language"} or translating
 * {@link I18N.translate "individual terms"}.
 *
 * Internationalization works with terms,
 * a string type keyword that is linked to a different text for each language.
 *
 * Internally, string parameters for text and js components are
 * automatically swapped during language change, given they are linked to a term.
 * If manual text swapping is desired, {@link I18N.translate}
 * can be used to retrieve the current translation for any term.
 *
 * You can also use the {@link I18N.onLanguageChanged} to manually update text
 * when a language is changed to for example update a number in a string.
 *
 * @since 1.0.0
 */
export class I18N {
    /**
     * {@link Emitter} for language change events.
     *
     * First parameter to a listener is the old language index,
     * second parameter is the new language index.
     *
     * Usage from a within a component:
     *
     * ```js
     * this.engine.i18n.onLanguageChanged.add((oldLanguageIndex, newLanguageIndex) => {
     *     const oldLanguage = this.engine.i18n.languageName(oldLanguageIndex);
     *     const newLanguage = this.engine.i18n.languageName(newLanguageIndex);
     *     console.log("Switched from", oldLanguage, "to", newLanguage);
     * });
     * ```
     */
    readonly onLanguageChanged = new Emitter<[number, number]>();

    /** Wonderland Engine instance. @hidden */
    protected readonly _engine: WonderlandEngine;

    /** Previously set language index. @hidden */
    private _prevLanguageIndex: number = -1;

    /**
     * Constructor
     */
    constructor(engine: WonderlandEngine) {
        this._engine = engine;
    }

    /**
     * Set current language and apply translations to linked text parameters.
     *
     * @note This is equivalent to {@link I18N.setLanguage}.
     *
     * @param code Language code to switch to
     */
    set language(code: string | null) {
        this.setLanguage(code);
    }

    /** Get current language code. */
    get language(): string | null {
        const wasm = this._engine.wasm;
        const code = wasm._wl_i18n_currentLanguage();
        if (code === 0) return null;
        return wasm.UTF8ToString(code);
    }

    /**
     * Get the current language index.
     *
     * This method is more efficient than its equivalent:
     *
     * ```js
     * const index = i18n.languageIndex(i18n.language);
     * ```
     */
    get currentIndex(): number {
        return this._engine.wasm._wl_i18n_currentLanguageIndex();
    }

    /** Previous language index. */
    get previousIndex(): number {
        return this._prevLanguageIndex;
    }

    /**
     * Set current language and apply translations to linked text parameters.
     *
     * @param code The language code.
     * @returns A promise that resolves with the current index code when the
     *     language is loaded.
     */
    async setLanguage(code: string | null): Promise<number> {
        if (code == null) return Promise.resolve(this.currentIndex);
        const wasm = this._engine.wasm;
        this._prevLanguageIndex = this.currentIndex;
        wasm._wl_i18n_setLanguage(wasm.tempUTF8(code));

        const scene = this.engine.scene;

        const filename = wasm.UTF8ToString(wasm._wl_i18n_languageFile(this.currentIndex));
        const url = `${scene.baseURL}/locale/${filename}`;

        await scene._downloadDependency(url);

        this.onLanguageChanged.notify(this._prevLanguageIndex, this.currentIndex);

        return this.currentIndex;
    }

    /**
     * Get translated string for a term for the currently loaded language.
     *
     * @param term Term to translate
     */
    translate(term: string): string | null {
        const wasm = this._engine.wasm;
        const translation = wasm._wl_i18n_translate(wasm.tempUTF8(term));
        if (translation === 0) return null;
        return wasm.UTF8ToString(translation);
    }

    /**
     * Get the number of languages in the project.
     *
     */
    languageCount(): number {
        const wasm = this._engine.wasm;
        return wasm._wl_i18n_languageCount();
    }

    /**
     * Get a language code.
     *
     * @param index Index of the language to get the code from
     */
    languageIndex(code: string): number {
        const wasm = this._engine.wasm;
        return wasm._wl_i18n_languageIndex(wasm.tempUTF8(code));
    }

    /**
     * Get a language code.
     *
     * @param index Index of the language to get the code from
     */
    languageCode(index: number): string | null {
        const wasm = this._engine.wasm;
        const code = wasm._wl_i18n_languageCode(index);
        if (code === 0) return null;
        return wasm.UTF8ToString(code);
    }

    /**
     * Get a language name.
     *
     * @param index Index of the language to get the name from
     */
    languageName(index: number): string | null {
        const wasm = this._engine.wasm;
        const name = wasm._wl_i18n_languageName(index);
        if (name === 0) return null;
        return wasm.UTF8ToString(name);
    }

    /** Hosting engine instance. */
    get engine() {
        return this._engine;
    }
}

/** Properties of a WebXR session */
export class XR {
    /** Wonderland WASM bridge. @hidden */
    readonly #wasm: WASM;
    readonly #mode: XRSessionMode;

    /**
     * Constructor.
     *
     * @param wasm Wasm bridge instance
     * @param mode Current XR session mode
     *
     * @hidden
     */
    constructor(wasm: WASM, mode: XRSessionMode) {
        this.#wasm = wasm;
        this.#mode = mode;
    }

    /** Current WebXR session mode */
    get sessionMode(): XRSessionMode {
        return this.#mode;
    }

    /** Current WebXR session */
    get session(): XRSession {
        return this.#wasm.webxr_session!;
    }

    /** Current WebXR frame */
    get frame(): XRFrame {
        return this.#wasm.webxr_frame!;
    }

    /** @overload */
    referenceSpaceForType(type: 'viewer'): XRReferenceSpace;
    /**
     * Get a WebXR reference space of a given reference space type.
     *
     * @param type Type of reference space to get
     * @returns Reference space, or `null` if there's no reference space
     *     of the requested type available
     */
    referenceSpaceForType(type: XRReferenceSpaceType): XRReferenceSpace | null;
    referenceSpaceForType(type: XRReferenceSpaceType): XRReferenceSpace | null {
        return this.#wasm.webxr_refSpaces![type] ?? null;
    }

    /** Set current reference space type used for retrieving eye, head, hand and joint poses */
    set currentReferenceSpace(refSpace: XRReferenceSpace) {
        this.#wasm.webxr_refSpace! = refSpace;

        this.#wasm.webxr_refSpaceType = null;
        for (const type of Object.keys(this.#wasm.webxr_refSpaces!)) {
            if (this.#wasm.webxr_refSpaces![type as XRReferenceSpaceType] === refSpace) {
                /* Keep track of reference space type */
                this.#wasm.webxr_refSpaceType = type as XRReferenceSpaceType;
            }
        }
    }

    /** Current reference space type used for retrieving eye, head, hand and joint poses */
    get currentReferenceSpace(): XRReferenceSpace {
        return this.#wasm.webxr_refSpace!;
    }

    /** Current WebXR reference space type or `null` if not a default reference space */
    get currentReferenceSpaceType(): XRReferenceSpaceType {
        return this.#wasm.webxr_refSpaceType!;
    }

    /** Current WebXR base layer  */
    get baseLayer(): XRProjectionLayer {
        return this.#wasm.webxr_baseLayer!;
    }

    /** Current WebXR framebuffer */
    get framebuffers(): WebGLFramebuffer[] {
        if (!Array.isArray(this.#wasm.webxr_fbo)) {
            return [this.#wasm.GL.framebuffers[this.#wasm.webxr_fbo]];
        }
        return this.#wasm.webxr_fbo.map((id) => this.#wasm.GL.framebuffers[id]);
    }
}

/**
 * Environment lighting properties
 *
 * @since 1.2.3
 */
export class Environment {
    /** Scene instance. @hidden */
    private readonly _scene: Scene;

    /** Constructor */
    constructor(scene: Scene) {
        this._scene = scene;
    }

    /**
     * Get intensity of environment lighting.
     *
     * Incoming environment lighting is multiplied by this factor.
     */
    get intensity() {
        return this._scene.engine.wasm._wl_scene_environment_get_intensity(
            this._scene._index
        );
    }

    /**
     * Set intensity of environment lighting.
     *
     * @param intensity New intensity.
     */
    set intensity(intensity: number) {
        this._scene.engine.wasm._wl_scene_environment_set_intensity(
            this._scene._index,
            intensity
        );
    }

    /** @overload */
    getTint(): Float32Array;
    /**
     * Get tint for environment lighting.
     *
     * Incoming environment lighting color channels are multiplied by these
     * values.
     *
     * @param out Preallocated array to write into, to avoid garbage,
     *     otherwise will allocate a new Float32Array.
     * @returns Tint values - red, green, blue.
     */
    getTint<T extends NumberArray>(out: T): T;
    /** @overload */
    getTint<T extends NumberArray>(
        out: T | Float32Array = new Float32Array(3)
    ): T | Float32Array {
        const wasm = this._scene.engine.wasm;
        wasm._wl_scene_environment_get_tint(this._scene._index, wasm._tempMem);
        out[0] = wasm._tempMemFloat[0];
        out[1] = wasm._tempMemFloat[1];
        out[2] = wasm._tempMemFloat[2];
        return out as T;
    }

    /**
     * Equivalent to {@link getTint}.
     *
     * @note Prefer to use {@link getTint} for performance.
     */
    get tint(): Float32Array {
        return this.getTint();
    }

    /**
     * Set tint for environment lighting.
     *
     * @param v New tint value. Expects a 3 component array.
     */
    setTint(v: Readonly<NumberArray>) {
        this._scene.engine.wasm._wl_scene_environment_set_tint(
            this._scene._index,
            v[0],
            v[1],
            v[2]
        );
    }

    /** Equivalent to {@link setTint}. */
    set tint(v: Readonly<NumberArray>) {
        this.setTint(v);
    }

    /** @overload */
    getCoefficients(): Float32Array;
    /**
     * Get spherical harmonics coefficients for indirect lighting.
     *
     * These are 9 spherical harmonics coefficients for indirect diffuse
     * lighting.
     *
     * @param out Preallocated array to write into, to avoid garbage,
     *     otherwise will allocate a new Float32Array.
     * @returns Spherical harmonics coefficients. Always 27 elements, every
     *     consecutive 3 values representing the red, green, blue components of
     *     a single coefficient. Unused/empty coefficients at the end can be 0.
     */
    getCoefficients<T extends NumberArray>(out: T): T;
    /** @overload */
    getCoefficients<T extends NumberArray>(
        out: T | Float32Array = new Float32Array(3 * 9)
    ): T | Float32Array {
        const wasm = this._scene.engine.wasm;
        wasm.requireTempMem(3 * 9 * 4);
        wasm._wl_scene_environment_get_coefficients(this._scene._index, wasm._tempMem);
        for (let i = 0; i < 3 * 9; ++i) {
            out[i] = wasm._tempMemFloat[i];
        }
        return out as T;
    }

    /**
     * Equivalent to {@link getCoefficients}.
     *
     * @note Prefer to use {@link getCoefficients} for performance.
     */
    get coefficients(): Float32Array {
        return this.getCoefficients();
    }

    /**
     * Set spherical harmonics coefficients for indirect lighting.
     *
     * @note The scene must have been packaged with environment lighting on for
     * this to take effect.
     *
     * @example
     *
     * Coefficients from [WebXR Lighting Estimation](https://www.w3.org/TR/webxr-lighting-estimation-1)
     * can be passed as follows:
     *
     * ```js
     * const probe = await engine.xr.session.requestLightProbe();
     * const estimate = engine.xr.frame.getLightEstimate(probe);
     * scene.environment.coefficients = estimate.sphericalHarmonicsCoefficients;
     * ```
     *
     * @param v A set of spherical harmonics coefficients, every 3 elements
     *     constituting the red/green/blue components of a single coefficient.
     *     Should be 0, 3, 12 or 27 **array elements**. Passing an empty array
     *     disables indirect lighting.
     */
    setCoefficients(v: Readonly<NumberArray>) {
        let count = v.length / 3;
        if (count > 9) count = 9;
        else if (count > 4 && count < 9) count = 4;
        else if (count > 1 && count < 4) count = 1;
        const wasm = this._scene.engine.wasm;
        wasm._tempMemFloat.set(v);
        wasm._wl_scene_environment_set_coefficients(
            this._scene._index,
            wasm._tempMem,
            count
        );
    }

    /** Equivalent to {@link setCoefficients}. */
    set coefficients(v: Readonly<NumberArray>) {
        this.setCoefficients(v);
    }
}
