/**
 * Types
 */

import {nativeProperty, enumerable} from './decorators.js';
import {WonderlandEngine} from './engine.js';
import {isNumber, isString} from './utils/object.js';
import {Emitter} from './utils/event.js';
import {ComponentProperty} from './property.js';

/**
 * A type alias for any TypedArray constructor, except big-int arrays.
 */
export type TypedArrayCtor = Int8ArrayConstructor | Uint8ArrayConstructor | Uint8ClampedArrayConstructor | Int16ArrayConstructor | Uint16ArrayConstructor | Int32ArrayConstructor | Uint32ArrayConstructor |  Float32ArrayConstructor | Float64ArrayConstructor;
/**
 * The TypedArray corresponding to a given TypedArray constructor.
 *
 * @template {TypedArrayCtor} T - The TypedArray constructor.
 */
export type TypedArray<T extends TypedArrayCtor> = InstanceType<T>;

/**
 * Represents any object that can be used as an array for read / write.
 */
export interface NumberArray {
    length: number;
    [n: number]: number;
}

/**
 * Type to describe a constructor.
 */
export type Constructor<T = any> = {
    new (...args: any[]): T;
};

/**
 * Component constructor type.
 *
 * For more information, please have a look at the {@link Component} class.
 */
export type ComponentConstructor<T extends Component = Component> = Constructor<T> & {
    TypeName: string;
    Properties: Record<string, ComponentProperty>;
    Dependencies?: ComponentConstructor[];
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

export interface GLTFExtensions {
    root: Record<string, any>;
    mesh: Record<string, any>;
    node: Record<string, any>;
    idMapping: Record<string, any>;
}

/**
 * Result obtained when loading a scene.
 */
export type SceneAppendResult =
    | Object3D
    | {
          root: Object3D;
          extensions: Record<string, any>;
      };

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
    Left = 1,

    /** Text center is at object origin */
    Center = 2,

    /** Text end is at object origin */
    Right = 3,
}

/**
 * Justification type enum for {@link TextComponent}.
 */
export enum Justification {
    /** Text line is at object origin */
    Line = 1,

    /** Text middle is at object origin */
    Middle = 2,

    /** Text top is at object origin */
    Top = 3,

    /** Text bottom is at object origin */
    Bottom = 4,
}

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
 * Light type enum for {@link LightComponent}.
 */
export enum LightType {
    /** Point light */
    Point = 1,

    /** Spot light */
    Spot = 2,

    /** Sun light / Directional light */
    Sun = 3,
}

/**
 * Animation state of {@link AnimationComponent}.
 */
export enum AnimationState {
    /** Animation is currently playing */
    Playing = 1,

    /** Animation is paused and will continue at current playback
     * time on {@link AnimationComponent#play} */
    Paused = 2,

    /** Animation is stopped */
    Stopped = 3,
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

/**
 * Material parameter type.
 */
export enum MaterialParamType {
    /** Unsigned integer parameter type. */
    UnsignedInt = 0,
    /** Integer parameter type. */
    Int = 1,
    /** Float parameter type. */
    Float = 2,
    /** Sampler resource parameter type, i.e., a {@link Texture}. */
    Sampler = 3,
    /**
     * Font resource parameter type.
     *
     * **Note**: Changing font isn't exposed yet and will raise an error.
     */
    Font = 4,
}

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
 * Constants.
 */

/**
 * Default world up vector.
 */
const UP_VECTOR = [0, 1, 0];

/**
 * Provides global scene functionality like raycasting.
 */
export class Scene {
    /** Called before rendering the scene */
    readonly onPreRender = new Emitter();
    /** Called after the scene has been rendered */
    readonly onPostRender = new Emitter();

    /** Wonderland Engine instance. @hidden */
    protected _engine: WonderlandEngine;

    /** Ray hit pointer in WASM heap. @hidden */
    private _rayHit: number;
    /** Ray hit. @hidden */
    private _hit: RayHit;

    constructor(engine: WonderlandEngine) {
        this._engine = engine;
        this._rayHit = engine.wasm._malloc(4 * (3 * 4 + 3 * 4 + 4 + 2) + 4);
        this._hit = new RayHit(this._engine, this._rayHit);
    }

    /**
     * Currently active view components.
     */
    get activeViews(): ViewComponent[] {
        const wasm = this._engine.wasm;
        const count = wasm._wl_scene_get_active_views(this._engine.wasm._tempMem, 16);

        const views: ViewComponent[] = [];
        const viewTypeIndex = wasm._typeIndexFor('view');
        for (let i = 0; i < count; ++i) {
            views.push(
                new ViewComponent(
                    this._engine,
                    viewTypeIndex,
                    this._engine.wasm._tempMemInt[i]
                )
            );
        }

        return views;
    }

    /**
     * Cast a ray through the scene and find intersecting objects.
     *
     * The resulting ray hit will contain up to **4** closest ray hits,
     * sorted by increasing distance.
     *
     * @param o Ray origin.
     * @param d Ray direction.
     * @param group Collision group to filter by: only objects that are
     *        part of given group are considered for raycast.
     *
     * @returns The scene cached {@link RayHit} instance.
     * @note The returned object is owned by the Scene instance
     *   will be reused with the next {@link Scene#rayCast} call.
     */
    rayCast(o: Readonly<NumberArray>, d: Readonly<NumberArray>, group: number): RayHit {
        this._engine.wasm._wl_scene_ray_cast(
            o[0],
            o[1],
            o[2],
            d[0],
            d[1],
            d[2],
            group,
            this._rayHit
        );
        return this._hit;
    }

    /**
     * Add an object to the scene.
     *
     * @param parent Parent object or `null`.
     * @returns A newly created object.
     */
    addObject(parent: Object3D | null): Object3D {
        const parentId = parent ? parent.objectId : 0;
        const objectId = this._engine.wasm._wl_scene_add_object(parentId);
        return this._engine.wrapObject(objectId);
    }

    /**
     * Batch-add objects to the scene.
     *
     * Will provide better performance for adding multiple objects (e.g. > 16)
     * than calling {@link Scene#addObject} repeatedly in a loop.
     *
     * By providing upfront information of how many objects will be required,
     * the engine is able to batch-allocate the required memory rather than
     * convervatively grow the memory in small steps.
     *
     * **Experimental:** This API might change in upcoming versions.
     *
     * @param count Number of objects to add.
     * @param parent Parent object or `null`, default `null`.
     * @param componentCountHint Hint for how many components in total will
     *      be added to the created objects afterwards, default `0`.
     * @returns Newly created objects
     */
    addObjects(
        count: number,
        parent: Object3D | null,
        componentCountHint: number
    ): Object3D[] {
        const parentId = parent ? parent.objectId : 0;
        this._engine.wasm.requireTempMem(count * 2);
        const actualCount = this._engine.wasm._wl_scene_add_objects(
            parentId,
            count,
            componentCountHint || 0,
            this._engine.wasm._tempMem,
            this._engine.wasm._tempMemSize >> 1
        );
        const ids = this._engine.wasm._tempMemUint16.subarray(0, actualCount);
        const wrapper = this._engine.wrapObject.bind(this._engine);
        const objects = Array.from(ids, wrapper);
        return objects;
    }

    /**
     * Pre-allocate memory for a given amount of objects and components.
     *
     * Will provide better performance for adding objects later with {@link Scene#addObject}
     * and {@link Scene#addObjects}.
     *
     * By providing upfront information of how many objects will be required,
     * the engine is able to batch-allocate the required memory rather than
     * conservatively grow the memory in small steps.
     *
     * **Experimental:** This API might change in upcoming versions.
     *
     * @param objectCount Number of objects to add.
     * @param componentCountPerType Amount of components to
     *      allocate for {@link Object3D.addComponent}, e.g. `{mesh: 100, collision: 200, "my-comp": 100}`.
     * @since 0.8.10
     */
    reserveObjects(objectCount: number, componentCountPerType: {[key: string]: number}) {
        const wasm = this._engine.wasm;
        componentCountPerType = componentCountPerType || {};
        const jsManagerIndex = wasm._typeIndexFor('js');
        let countsPerTypeIndex = wasm._tempMemInt.subarray();
        countsPerTypeIndex.fill(0);
        for (const e of Object.entries(componentCountPerType)) {
            const typeIndex = wasm._typeIndexFor(e[0]);
            countsPerTypeIndex[typeIndex < 0 ? jsManagerIndex : typeIndex] += e[1];
        }
        wasm._wl_scene_reserve_objects(objectCount, wasm._tempMem);
    }

    /**
     * Set the background clear color.
     *
     * @param color new clear color (RGBA).
     * @since 0.8.5
     */
    set clearColor(color: number[]) {
        this._engine.wasm._wl_scene_set_clearColor(color[0], color[1], color[2], color[3]);
    }

    /**
     * Set whether to clear the color framebuffer before drawing.
     *
     * This function is useful if an external framework (e.g. an AR tracking
     * framework) is responsible for drawing a camera frame before Wonderland
     * Engine draws the scene on top of it.
     *
     * @param b Whether to enable color clear.
     * @since 0.9.4
     */
    set colorClearEnabled(b: boolean) {
        this._engine.wasm._wl_scene_enableColorClear(b);
    }

    /** Hosting engine instance. */
    get engine() {
        return this._engine;
    }

    /**
     * Load a scene file (.bin)
     *
     * Will replace the currently active scene with the one loaded
     * from given file. It is assumed that JavaScript components required by
     * the new scene were registered in advance.
     *
     * @param filename Path to the .bin file.
     */
    load(filename: string) {
        const wasm = this._engine.wasm;
        const strLen = wasm.lengthBytesUTF8(filename) + 1;
        const ptr = wasm._tempMem;
        wasm.stringToUTF8(filename, ptr, strLen);
        wasm._wl_load_scene(ptr);
    }

    /**
     * Load an external 3D file (.gltf, .glb).
     *
     * Loads and parses the gltf file and its images and appends the result
     * to scene.
     *
     * ```js
     * WL.scene.append(filename).then(root => {
     *     // root contains the loaded scene
     * });
     * ```
     *
     * In case the `loadGltfExtensions` option is set to true, the response
     * will be an object containing both the root of the loaded scene and
     * any glTF extensions found on nodes, meshes and the root of the file.
     *
     * ```js
     * WL.scene.append(filename, { loadGltfExtensions: true }).then(({root, extensions}) => {
     *     // root contains the loaded scene
     *     // extensions.root contains any extensions at the root of glTF document
     *     const rootExtensions = extensions.root;
     *     // extensions.mesh and extensions.node contain extensions indexed by Object id
     *     const childObject = root.children[0];
     *     const meshExtensions = root.meshExtensions[childObject.objectId];
     *     const nodeExtensions = root.nodeExtensions[childObject.objectId];
     *     // extensions.idMapping contains a mapping from glTF node index to Object id
     * });
     * ```
     *
     * @param filename Path to the .gltf or .glb file.
     * @param options Additional options for loading.
     * @returns Root of the loaded scene.
     */
    append(filename: string, options: Record<any, string>): Promise<SceneAppendResult> {
        options = options || {};
        const loadGltfExtensions = !!options.loadGltfExtensions;

        const wasm = this._engine.wasm;

        const strLen = wasm.lengthBytesUTF8(filename) + 1;
        const ptr = wasm._tempMem;
        wasm.stringToUTF8(filename, ptr, strLen);
        const callback = wasm._sceneLoadedCallback.length;
        const promise = new Promise((resolve: (r: SceneAppendResult) => void, reject) => {
            wasm._sceneLoadedCallback[callback] = {
                success: (id: number, extensions: Record<string, any>) => {
                    const root = this._engine.wrapObject(id);
                    resolve(extensions ? {root, extensions} : root);
                },
                error: () => reject(),
            };
        });

        wasm._wl_append_scene(ptr, loadGltfExtensions, callback);
        return promise;
    }

    /**
     * Unmarshalls the GltfExtensions from an Uint32Array.
     *
     * @param data Array containing the gltf extension data.
     * @returns The extensions stored in an object literal.
     *
     * @hidden
     */
    _unmarshallGltfExtensions(data: Uint32Array): GLTFExtensions {
        /* @todo: This method should be moved in the internal Emscripten library. */
        const extensions: GLTFExtensions = {
            root: {},
            mesh: {},
            node: {},
            idMapping: {},
        };

        let index = 0;
        const readString = () => {
            const strPtr = data[index++];
            const strLen = data[index++];
            return this._engine.wasm.UTF8ViewToString(strPtr, strPtr + strLen);
        };

        const idMappingSize = data[index++];
        const idMapping = new Array(idMappingSize);
        for (let i = 0; i < idMappingSize; ++i) {
            idMapping[i] = data[index++];
        }
        extensions.idMapping = idMapping;

        const meshExtensionsSize = data[index++];
        for (let i = 0; i < meshExtensionsSize; ++i) {
            const objectId = data[index++];
            extensions.mesh[idMapping[objectId]] = JSON.parse(readString());
        }
        const nodeExtensionsSize = data[index++];
        for (let i = 0; i < nodeExtensionsSize; ++i) {
            const objectId = data[index++];
            extensions.node[idMapping[objectId]] = JSON.parse(readString());
        }
        const rootExtensionsStr = readString();
        if (rootExtensionsStr) {
            extensions.root = JSON.parse(rootExtensionsStr);
        }

        return extensions;
    }

    /**
     * Reset the scene.
     *
     * This method deletes all used and allocated objects, and components.
     */
    reset() {
        this._engine.wasm._wl_scene_reset();
    }
}

/**
 * Native component
 *
 * Provides access to a native component instance of a specified component type.
 *
 * Usage example:
 *
 * ```js
 * import { Component, Type } from '@wonderlandengine/api';
 *
 * class MyComponent extends Component {
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
 */
export class Component {
    /**
     * Unique identifier for this component class.
     *
     * This is used to register, add, and retrieve component of a given type.
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
     */
    static Properties: Record<string, ComponentProperty>;

    /**
     * List of components this type depends on.
     *
     * When the {@link WonderlandEngine.autoRegisterDependencies} is set to `true`,
     * those components will be automatically registered.
     *
     * Usage example:
     *
     * ```js
     * class DependencyA extends Component {
     *     static TypeName = 'dependency-a';
     * }
     *
     * class MyComponent extends Component {
     *     static TypeName = 'my-component';
     *     static Dependencies = [DependencyA];
     * }
     * ```
     *
     * On the above example, registering `MyComponent` automatically leads to
     * the registration of `DependencyA`.
     */
    static Dependencies?: ComponentConstructor[];

    /**
     * Triggered when the component is initialized by the runtime. This method
     * will only be triggered **once** after instantiation.
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
     * @note You can manually activate or deactivate a component using: {@link Component.active:setter}.
     */
    onActivate?(): void;

    /**
     * Triggered when the component goes from an activated state to an inactive state.
     *
     * @note You can manually activate or deactivate a component using: {@link Component.active:setter}.
     */
    onDeactivate?(): void;

    /**
     * Triggered when the component is removed from its object.
     *
     * @note You can remove a component using: {@link Component.destroy}.
     *
     * @since 0.9.0
     */
    onDestroy?(): void;

    /** Manager index. @hidden */
    readonly _manager: number;
    /** Instance index. @hidden */
    readonly _id: number;

    /**
     * Object containing this object.
     *
     * **Note**: This is cached for faster retrieval.
     *
     * @hidden
     */
    _object: Object3D | null;

    /** Wonderland Engine instance */
    protected readonly _engine: WonderlandEngine;

    /**
     * Create a new instance
     *
     * @param engine The engine instance.
     * @param manager Index of the manager.
     * @param id WASM component instance index.
     *
     * @hidden
     */
    constructor(engine: WonderlandEngine, manager: number = -1, id: number = -1) {
        this._engine = engine;
        this._manager = manager;
        this._id = id;
        this._object = null;
    }

    /** Hosting engine instance. */
    get engine() {
        return this._engine;
    }

    /** The name of this component's type */
    get type(): string {
        const ctor = this.constructor as ComponentConstructor;
        return ctor.TypeName ?? this._engine.wasm._typeNameFor(this._manager);
    }

    /** The object this component is attached to. */
    get object(): Object3D {
        if (!this._object) {
            const objectId = this._engine.wasm._wl_component_get_object(
                this._manager,
                this._id
            );
            this._object = this._engine.wrapObject(objectId);
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
        this._engine.wasm._wl_component_setActive(this._manager, this._id, active);
    }

    /**
     * Whether this component is active
     */
    get active(): boolean {
        return this._engine.wasm._wl_component_isActive(this._manager, this._id) != 0;
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
        this._engine.wasm._wl_component_remove(this._manager, this._id);
        (this._manager as number) = -1;
        (this._id as number) = -1;
    }

    /**
     * Checks equality by comparing whether the wrapped native component ids
     * and component manager types are equal.
     *
     * @param otherComponent Component to check equality with.
     * @returns Whether this component equals the given component.
     */
    equals(otherComponent: Component | undefined | null): boolean {
        if (!otherComponent) return false;
        return this._manager == otherComponent._manager && this._id == otherComponent._id;
    }
}

/**
 * Native collision component.
 *
 * Provides access to a native collision component instance.
 */
export class CollisionComponent extends Component {
    /** @override */
    static TypeName = 'collision';

    /** Collision component collider */
    @nativeProperty()
    get collider(): Collider {
        return this._engine.wasm._wl_collision_component_get_collider(this._id);
    }

    /**
     * Set collision component collider.
     *
     * @param collider Collider of the collision component.
     */
    set collider(collider: Collider) {
        this._engine.wasm._wl_collision_component_set_collider(this._id, collider);
    }

    /**
     * Collision component extents.
     *
     * If {@link collider} returns {@link Collider.Sphere}, only the first
     * component of the returned vector is used.
     */
    @nativeProperty()
    get extents(): Float32Array {
        const wasm = this._engine.wasm;
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
        this.extents.set(extents);
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
        return this._engine.wasm._wl_collision_component_get_group(this._id);
    }

    /**
     * Set collision component group.
     *
     * @param group Group mask of the collision component.
     */
    set group(group: number) {
        this._engine.wasm._wl_collision_component_set_group(this._id, group);
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
        const count = this._engine.wasm._wl_collision_component_query_overlaps(
            this._id,
            this._engine.wasm._tempMem,
            this._engine.wasm._tempMemSize >> 1
        );
        let overlaps = new Array(count);
        for (let i = 0; i < count; ++i) {
            overlaps[i] = new CollisionComponent(
                this._engine,
                this._manager,
                this._engine.wasm._tempMemUint16[i]
            );
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
        return this._engine.wasm._wl_text_component_get_horizontal_alignment(this._id);
    }

    /**
     * Set text component alignment.
     *
     * @param alignment Alignment for the text component.
     */
    set alignment(alignment: Alignment) {
        this._engine.wasm._wl_text_component_set_horizontal_alignment(this._id, alignment);
    }

    /** Text component justification. */
    @nativeProperty()
    get justification(): Justification {
        return this._engine.wasm._wl_text_component_get_vertical_alignment(this._id);
    }

    /**
     * Set text component justification.
     *
     * @param justification Justification for the text component.
     */
    set justification(justification: Justification) {
        this._engine.wasm._wl_text_component_set_vertical_alignment(
            this._id,
            justification
        );
    }

    /** Text component character spacing. */
    @nativeProperty()
    get characterSpacing(): number {
        return this._engine.wasm._wl_text_component_get_character_spacing(this._id);
    }

    /**
     * Set text component character spacing.
     *
     * @param spacing Character spacing for the text component.
     */
    set characterSpacing(spacing) {
        this._engine.wasm._wl_text_component_set_character_spacing(this._id, spacing);
    }

    /** Text component line spacing. */
    @nativeProperty()
    get lineSpacing(): number {
        return this._engine.wasm._wl_text_component_get_line_spacing(this._id);
    }

    /**
     * Set text component line spacing
     *
     * @param spacing Line spacing for the text component
     */
    set lineSpacing(spacing: number) {
        this._engine.wasm._wl_text_component_set_line_spacing(this._id, spacing);
    }

    /** Text component effect. */
    @nativeProperty()
    get effect(): TextEffect {
        return this._engine.wasm._wl_text_component_get_effect(this._id);
    }

    /**
     * Set text component effect
     *
     * @param effect Effect for the text component
     */
    set effect(effect: TextEffect) {
        this._engine.wasm._wl_text_component_set_effect(this._id, effect);
    }

    /** Text component text. */
    @nativeProperty()
    get text(): string {
        const wasm = this._engine.wasm;
        const ptr = wasm._wl_text_component_get_text(this._id);
        return wasm.UTF8ToString(ptr);
    }

    /**
     * Set text component text.
     *
     * @param text Text of the text component.
     */
    set text(text: string) {
        const wasm = this._engine.wasm;
        const strLen = wasm.lengthBytesUTF8(text) + 1;
        wasm.requireTempMem(strLen);
        const ptr = wasm._tempMem;
        wasm.stringToUTF8(text, ptr, strLen);
        wasm._wl_text_component_set_text(this._id, ptr);
    }

    /**
     * Set material to render the text with.
     *
     * @param material New material.
     */
    set material(material: Material | null | undefined) {
        const matIndex = material ? material._index : 0;
        this._engine.wasm._wl_text_component_set_material(this._id, matIndex);
    }

    /** Material used to render the text. */
    @nativeProperty()
    get material(): Material | null {
        const id = this._engine.wasm._wl_text_component_get_material(this._id);
        return id > 0 ? new Material(this._engine, id) : null;
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

    /** Projection matrix. */
    @enumerable()
    get projectionMatrix(): Float32Array {
        const wasm = this._engine.wasm;
        return new Float32Array(
            wasm.HEAPF32.buffer,
            wasm._wl_view_component_get_projection_matrix(this._id),
            16
        );
    }

    /** ViewComponent near clipping plane value. */
    @nativeProperty()
    get near(): number {
        return this._engine.wasm._wl_view_component_get_near(this._id);
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
        this._engine.wasm._wl_view_component_set_near(this._id, near);
    }

    /** Far clipping plane value. */
    @nativeProperty()
    get far(): number {
        return this._engine.wasm._wl_view_component_get_far(this._id);
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
        this._engine.wasm._wl_view_component_set_far(this._id, far);
    }

    /**
     * Get the horizontal field of view for the view, **in degrees**.
     *
     * If an XR session is active, this returns the field of view reported by
     * the device, regardless of the fov that was set.
     */
    @nativeProperty()
    get fov(): number {
        return this._engine.wasm._wl_view_component_get_fov(this._id);
    }

    /**
     * Set the horizontal field of view for the view, **in degrees**.
     *
     * If an XR session is active, the field of view reported by the device is
     * used and this value is ignored. After the XR session ends, the new value
     * is applied.
     *
     * @param fov Horizontal field of view, **in degrees**.
     */
    set fov(fov) {
        this._engine.wasm._wl_view_component_set_fov(this._id, fov);
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
        return this._engine.wasm._wl_input_component_get_type(this._id);
    }

    /**
     * Set input component type.
     *
     * @params New input component type.
     */
    set inputType(type: InputType) {
        this._engine.wasm._wl_input_component_set_type(this._id, type);
    }

    /**
     * WebXR Device API input source associated with this input component,
     * if type {@link InputType.ControllerLeft} or {@link InputType.ControllerRight}.
     */
    @enumerable()
    get xrInputSource(): XRInputSource | null {
        const xrSession = this._engine.xrSession;
        if (xrSession) {
            for (let inputSource of xrSession.inputSources) {
                if (inputSource.handedness == this.handedness) {
                    return inputSource;
                }
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

    /** View on the light color. */
    @nativeProperty()
    get color(): Float32Array {
        const wasm = this._engine.wasm;
        return new Float32Array(
            wasm.HEAPF32.buffer,
            wasm._wl_light_component_get_color(this._id),
            4
        );
    }

    /**
     * Set light color.
     *
     * @param c Color of the light component.
     */
    set color(c: Readonly<NumberArray>) {
        this.color.set(c);
    }

    /** Light type. */
    @nativeProperty()
    get lightType(): LightType {
        return this._engine.wasm._wl_light_component_get_type(this._id);
    }

    /**
     * Set light type.
     *
     * @param lightType Type of the light component.
     */
    set lightType(t: LightType) {
        this._engine.wasm._wl_light_component_set_type(this._id, t);
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
     * Set animation to play.
     *
     * Make sure to {@link Animation#retarget} the animation to affect the
     * right objects.
     *
     * @param anim Animation to play.
     */
    set animation(anim: Animation | null | undefined) {
        this._engine.wasm._wl_animation_component_set_animation(
            this._id,
            anim ? anim._index : 0
        );
    }

    /** Animation set for this component */
    @nativeProperty()
    get animation(): Animation | null {
        const id = this._engine.wasm._wl_animation_component_get_animation(this._id);
        return id > 0 ? new Animation(this._engine, id) : null;
    }

    /**
     * Set play count. Set to `0` to loop indefinitely.
     *
     * @param playCount Number of times to repeat the animation.
     */
    set playCount(playCount: number) {
        this._engine.wasm._wl_animation_component_set_playCount(this._id, playCount);
    }

    /** Number of times the animation is played. */
    @nativeProperty()
    get playCount(): number {
        return this._engine.wasm._wl_animation_component_get_playCount(this._id);
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
        this._engine.wasm._wl_animation_component_set_speed(this._id, speed);
    }

    /**
     * Speed factor at which the animation is played.
     *
     * @since 0.8.10
     */
    @nativeProperty()
    get speed(): number {
        return this._engine.wasm._wl_animation_component_get_speed(this._id);
    }

    /** Current playing state of the animation */
    @enumerable()
    get state(): AnimationState {
        return this._engine.wasm._wl_animation_component_state(this._id);
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
        this._engine.wasm._wl_animation_component_play(this._id);
    }

    /** Stop animation. */
    stop(): void {
        this._engine.wasm._wl_animation_component_stop(this._id);
    }

    /** Pause animation. */
    pause(): void {
        this._engine.wasm._wl_animation_component_pause(this._id);
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
        this._engine.wasm._wl_mesh_component_set_material(
            this._id,
            material ? material._index : 0
        );
    }

    /** Material used to render the mesh. */
    @nativeProperty()
    get material(): Material | null {
        const id = this._engine.wasm._wl_mesh_component_get_material(this._id);
        return id > 0 ? new Material(this._engine, id) : null;
    }

    /** Mesh rendered by this component. */
    @nativeProperty()
    get mesh(): Mesh | null {
        const id = this._engine.wasm._wl_mesh_component_get_mesh(this._id);
        return id > 0 ? new Mesh(this._engine, id) : null;
    }

    /**
     * Set mesh to rendered with this component.
     *
     * @param mesh Mesh rendered by this component.
     */
    set mesh(mesh: Mesh | null | undefined) {
        this._engine.wasm._wl_mesh_component_set_mesh(this._id, mesh ? mesh._index : 0);
    }

    /** Skin for this mesh component. */
    @nativeProperty()
    get skin(): Skin | null {
        const id = this._engine.wasm._wl_mesh_component_get_skin(this._id);
        return id > 0 ? new Skin(this._engine, id) : null;
    }

    /**
     * Set skin to transform this mesh component.
     *
     * @param skin Skin to use for rendering skinned meshes.
     */
    set skin(skin: Skin | null | undefined) {
        this._engine.wasm._wl_mesh_component_set_skin(this._id, skin ? skin._index : 0);
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

    /**
     * Set whether this rigid body is static.
     *
     * Setting this property only takes effect once the component
     * switches from inactive to active.
     *
     * @param b Whether the rigid body should be static.
     */
    set static(b: boolean) {
        this._engine.wasm._wl_physx_component_set_static(this._id, b);
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
        return !!this._engine.wasm._wl_physx_component_get_static(this._id);
    }

    /**
     * Set whether this rigid body is kinematic.
     *
     * @param b Whether the rigid body should be kinematic.
     */
    set kinematic(b: boolean) {
        this._engine.wasm._wl_physx_component_set_kinematic(this._id, b);
    }

    /**
     * Whether this rigid body is kinematic.
     */
    @nativeProperty()
    get kinematic(): boolean {
        return !!this._engine.wasm._wl_physx_component_get_kinematic(this._id);
    }

    /**
     * Set whether this rigid body's gravity is enabled.
     *
     * @param b Whether the rigid body's gravity should be enabled.
     */
    set gravity(b: boolean) {
        this._engine.wasm._wl_physx_component_set_gravity(this._id, b);
    }

    /**
     * Whether this rigid body's gravity flag is enabled.
     */
    @nativeProperty()
    get gravity(): boolean {
        return !!this._engine.wasm._wl_physx_component_get_gravity(this._id);
    }

    /**
     * Set whether this rigid body's simulate flag is enabled.
     *
     * @param b Whether the rigid body's simulate flag should be enabled.
     */
    set simulate(b: boolean) {
        this._engine.wasm._wl_physx_component_set_simulate(this._id, b);
    }

    /**
     * Whether this rigid body's simulate flag is enabled.
     */
    @nativeProperty()
    get simulate(): boolean {
        return !!this._engine.wasm._wl_physx_component_get_simulate(this._id);
    }

    /**
     * Set whether to allow simulation of this rigid body.
     *
     * {@link #allowSimulation} and {@link #trigger} can not be enabled at the
     * same time. Enabling {@link #allowSimulation} while {@link trigger} is enabled
     * will disable {@link #trigger}.
     *
     * @param b Whether to allow simulation of this rigid body.
     */
    set allowSimulation(b: boolean) {
        this._engine.wasm._wl_physx_component_set_allowSimulation(this._id, b);
    }

    /**
     * Whether to allow simulation of this rigid body.
     */
    @nativeProperty()
    get allowSimulation(): boolean {
        return !!this._engine.wasm._wl_physx_component_get_allowSimulation(this._id);
    }

    /**
     * Set whether this rigid body may be queried in ray casts.
     *
     * @param b Whether this rigid body may be queried in ray casts.
     */
    set allowQuery(b: boolean) {
        this._engine.wasm._wl_physx_component_set_allowQuery(this._id, b);
    }

    /**
     * Whether this rigid body may be queried in ray casts.
     */
    @nativeProperty()
    get allowQuery(): boolean {
        return !!this._engine.wasm._wl_physx_component_get_allowQuery(this._id);
    }

    /**
     * Set whether this physics body is a trigger.
     *
     * {@link #allowSimulation} and {@link trigger} can not be enabled at the
     * same time. Enabling trigger while {@link allowSimulation} is enabled,
     * will disable {@link allowSimulation}.
     *
     * @param b Whether this physics body is a trigger.
     */
    set trigger(b: boolean) {
        this._engine.wasm._wl_physx_component_set_trigger(this._id, b);
    }

    /**
     * Whether this physics body is a trigger.
     */
    @nativeProperty()
    get trigger(): boolean {
        return !!this._engine.wasm._wl_physx_component_get_trigger(this._id);
    }

    /**
     * Set the shape for collision detection.
     *
     * @param s New shape.
     * @since 0.8.5
     */
    set shape(s: Shape) {
        this._engine.wasm._wl_physx_component_set_shape(this._id, s);
    }

    /** The shape for collision detection. */
    @nativeProperty()
    get shape(): Shape {
        return this._engine.wasm._wl_physx_component_get_shape(this._id);
    }

    /**
     * Set additional data for the shape.
     *
     * Retrieved only from {@link PhysXComponent#shapeData}.
     * @since 0.8.10
     */
    set shapeData(d) {
        if (d == null || !isMeshShape(this.shape)) return;
        this._engine.wasm._wl_physx_component_set_shape_data(this._id, d.index);
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
    get shapeData(): {index: number} | null {
        if (!isMeshShape(this.shape)) return null;
        return {index: this._engine.wasm._wl_physx_component_get_shape_data(this._id)};
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
     * The shape extents for collision detection.
     */
    @nativeProperty()
    get extents(): Float32Array {
        const wasm = this._engine.wasm;
        const ptr = wasm._wl_physx_component_get_extents(this._id);
        return new Float32Array(wasm.HEAPF32.buffer, ptr, 3);
    }

    /**
     * Get staticFriction.
     */
    @nativeProperty()
    get staticFriction(): number {
        return this._engine.wasm._wl_physx_component_get_staticFriction(this._id);
    }

    /**
     * Set staticFriction.
     * @param v New staticFriction.
     */
    set staticFriction(v: number) {
        this._engine.wasm._wl_physx_component_set_staticFriction(this._id, v);
    }

    /**
     * Get dynamicFriction.
     */
    @nativeProperty()
    get dynamicFriction(): number {
        return this._engine.wasm._wl_physx_component_get_dynamicFriction(this._id);
    }

    /**
     * Set dynamicFriction
     * @param v New dynamicDamping.
     */
    set dynamicFriction(v: number) {
        this._engine.wasm._wl_physx_component_set_dynamicFriction(this._id, v);
    }

    /**
     * Get bounciness.
     * @since 0.9.0
     */
    @nativeProperty()
    get bounciness(): number {
        return this._engine.wasm._wl_physx_component_get_bounciness(this._id);
    }

    /**
     * Set bounciness.
     * @param v New bounciness.
     * @since 0.9.0
     */
    set bounciness(v: number) {
        this._engine.wasm._wl_physx_component_set_bounciness(this._id, v);
    }

    /**
     * Get linearDamping/
     */
    @nativeProperty()
    get linearDamping(): number {
        return this._engine.wasm._wl_physx_component_get_linearDamping(this._id);
    }

    /**
     * Set linearDamping.
     * @param v New linearDamping.
     */
    set linearDamping(v: number) {
        this._engine.wasm._wl_physx_component_set_linearDamping(this._id, v);
    }

    /** Get angularDamping. */
    @nativeProperty()
    get angularDamping(): number {
        return this._engine.wasm._wl_physx_component_get_angularDamping(this._id);
    }

    /**
     * Set angularDamping.
     * @param v New angularDamping.
     */
    set angularDamping(v: number) {
        this._engine.wasm._wl_physx_component_set_angularDamping(this._id, v);
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
        this._engine.wasm._wl_physx_component_set_linearVelocity(
            this._id,
            v[0],
            v[1],
            v[2]
        );
    }

    /** Linear velocity or `[0, 0, 0]` if the component is not active. */
    @nativeProperty()
    get linearVelocity(): Float32Array {
        const wasm = this._engine.wasm;
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
        this._engine.wasm._wl_physx_component_set_angularVelocity(
            this._id,
            v[0],
            v[1],
            v[2]
        );
    }

    /** Angular velocity or `[0, 0, 0]` if the component is not active. */
    @nativeProperty()
    get angularVelocity(): Float32Array {
        const wasm = this._engine.wasm;
        wasm._wl_physx_component_get_angularVelocity(this._id, wasm._tempMem);
        return new Float32Array(wasm.HEAPF32.buffer, wasm._tempMem, 3);
    }

    /**
     * Set the components groups mask.
     *
     * @param flags New flags that need to be set.
     */
    set groupsMask(flags: number) {
        this._engine.wasm._wl_physx_component_set_groupsMask(this._id, flags);
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
        return this._engine.wasm._wl_physx_component_get_groupsMask(this._id);
    }

    /**
     * Set the components blocks mask.
     *
     * @param flags New flags that need to be set.
     */
    set blocksMask(flags: number) {
        this._engine.wasm._wl_physx_component_set_blocksMask(this._id, flags);
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
        return this._engine.wasm._wl_physx_component_get_blocksMask(this._id);
    }

    /**
     * Set axes to lock for linear velocity.
     *
     * @param lock The Axis that needs to be set.
     *
     * Combine flags with Bitwise OR.
     * ```js
     * body.linearLockAxis = LockAxis.X | LockAxis.Y; // x and y set
     * body.linearLockAxis = LockAxis.X; // y unset
     * ```
     *
     * @note This has no effect if the component is static.
     */
    set linearLockAxis(lock: LockAxis) {
        this._engine.wasm._wl_physx_component_set_linearLockAxis(this._id, lock);
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
        return this._engine.wasm._wl_physx_component_get_linearLockAxis(this._id);
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
        this._engine.wasm._wl_physx_component_set_angularLockAxis(this._id, lock);
    }

    /**
     * Get the angular lock axes flags.
     *
     * To get the state of a specific flag, Bitwise AND with the LockAxis needed.
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
        return this._engine.wasm._wl_physx_component_get_angularLockAxis(this._id);
    }

    /**
     * Set mass.
     *
     * [PhysX Manual - "Mass Properties"](https://gameworksdocs.nvidia.com/PhysX/4.1/documentation/physxguide/Manual/RigidBodyDynamics.html#mass-properties)
     *
     * @param m New mass.
     */
    set mass(m: number) {
        this._engine.wasm._wl_physx_component_set_mass(this._id, m);
    }

    /** Mass */
    @nativeProperty()
    get mass(): number {
        return this._engine.wasm._wl_physx_component_get_mass(this._id);
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
        this._engine.wasm._wl_physx_component_set_massSpaceInertiaTensor(
            this._id,
            v[0],
            v[1],
            v[2]
        );
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
        const wasm = this._engine.wasm;
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
        this._engine.wasm._wl_physx_component_addTorque(this._id, f[0], f[1], f[2], m);
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
     *      if(other.object.name.startsWith('enemy-')) {
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
        const physics = this._engine.physics;
        physics!._callbacks[this._id] = physics!._callbacks[this._id] || [];
        physics!._callbacks[this._id].push(callback);
        return this._engine.wasm._wl_physx_component_addCallback(
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
        const physics = this._engine.physics;
        const r = this._engine.wasm._wl_physx_component_removeCallback(
            this._id,
            callbackId
        );
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

    /** Wonderland Engine instance */
    protected readonly _engine: WonderlandEngine;

    /** Ray Hit */
    private _rayHit: number;
    /** Hit. */
    private _hit: RayHit;

    constructor(engine: WonderlandEngine) {
        this._engine = engine;
        this._rayHit = engine.wasm._malloc(4 * (3 * 4 + 3 * 4 + 4 + 2) + 4);
        this._hit = new RayHit(this._engine, this._rayHit);
        this._callbacks = {};
    }

    /**
     * Cast a ray through the physics scene and find intersecting objects.
     *
     * The resulting ray hit will contain **up to 4** closest ray hits,
     * sorted by increasing distance.
     *
     * @param o Ray origin.
     * @param d Ray direction.
     * @param group Collision group to filter by: only objects that are
     *        part of given group are considered for raycast.
     * @param maxDistance Maximum ray distance, default `100.0`.
     *
     * @returns The RayHit instance, belonging to this class.
     *
     * @note The returned {@link RayHit} object is owned by the Physics instance and
     *       will be reused with the next {@link Physics#rayCast} call.
     */
    rayCast(
        o: Readonly<NumberArray>,
        d: Readonly<NumberArray>,
        group: number,
        maxDistance?: number
    ): RayHit {
        if (typeof maxDistance === 'undefined') maxDistance = 100.0;
        this._engine.wasm._wl_physx_ray_cast(
            o[0],
            o[1],
            o[2],
            d[0],
            d[1],
            d[2],
            group,
            maxDistance || 100,
            this._rayHit
        );
        return this._hit;
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
    /** `true` if the mesh should be skinned. Defaults to false. */
    skinned: boolean;
}

/**
 * Wrapper around a native mesh data.
 *
 * To modify a mesh, you get access to a {@link MeshAttributeAccessor} that allows you to modify
 * the content of the buffers:
 *
 * Usage:
 *
 * ```js
 * const mesh = new Mesh(engine, {vertexCount: 3, indexData: [0, 1, 2] });
 * const positions = mesh.attribute(MeshAttribute.Position);
 * ...
 * ```
 */
export class Mesh {
    /**
     * Index of the mesh in the manager.
     *
     * @hidden
     */
    readonly _index: number = -1;

    /** Wonderland Engine instance. @hidden */
    protected _engine: WonderlandEngine;

    /**
     * Create a new instance.
     *
     * @param params Either a mesh index to wrap or set of parameters to create a new mesh.
     *    For more information, please have a look at the {@link MeshParameters} interface.
     */
    constructor(engine: WonderlandEngine, params: Partial<MeshParameters> | number) {
        this._engine = engine ?? WL;
        this._index = -1;

        if (isNumber(params)) {
            this._index = params;
            return;
        }

        if (!params.vertexCount) throw new Error("Missing parameter 'vertexCount'");

        const wasm = this._engine.wasm;

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

        const {skinned = false} = params;

        this._index = wasm._wl_mesh_create(
            indexData,
            indexDataSize,
            indexType,
            params.vertexCount,
            skinned
        );
    }

    /** Number of vertices in this mesh. */
    get vertexCount(): number {
        return this._engine.wasm._wl_mesh_get_vertexCount(this._index);
    }

    /** Index data (read-only) or `null` if the mesh is not indexed. */
    get indexData(): Uint8Array | Uint16Array | Uint32Array | null {
        const wasm = this._engine.wasm;
        const tempMem = wasm._tempMem;
        const ptr = wasm._wl_mesh_get_indexData(this._index, tempMem, tempMem + 4);
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

    /** Hosting engine instance. */
    get engine() {
        return this._engine;
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
        this._engine.wasm._wl_mesh_update(this._index);
    }

    /** @overload */
    getBoundingSphere(): Float32Array;
    /** @overload */
    getBoundingSphere<T extends NumberArray>(out: T): T;
    /**
     * Mesh bounding sphere.
     *
     * @param out Preallocated array to write into, to avoid garbage,
     *     otherwise will allocate a new {@link Float32Array}.
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
    getBoundingSphere<T extends NumberArray>(
        out: T | Float32Array = new Float32Array(4)
    ): T | Float32Array {
        const tempMemFloat = this._engine.wasm._tempMemFloat;
        this._engine.wasm._wl_mesh_get_boundingSphere(
            this._index,
            this._engine.wasm._tempMem
        );
        out[0] = tempMemFloat[0];
        out[1] = tempMemFloat[1];
        out[2] = tempMemFloat[2];
        out[3] = tempMemFloat[3];
        return out as T;
    }

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
    attribute(attr: MeshAttribute.Position): MeshAttributeAccessor<Float32ArrayConstructor> | null;
    attribute(attr: MeshAttribute.Tangent): MeshAttributeAccessor<Float32ArrayConstructor> | null;
    attribute(attr: MeshAttribute.Normal): MeshAttributeAccessor<Float32ArrayConstructor> | null;
    attribute(attr: MeshAttribute.TextureCoordinate): MeshAttributeAccessor<Float32ArrayConstructor> | null;
    attribute(attr: MeshAttribute.Color): MeshAttributeAccessor<Float32ArrayConstructor> | null;
    attribute(attr: MeshAttribute.JointId): MeshAttributeAccessor<Uint16ArrayConstructor> | null;
    attribute(attr: MeshAttribute.JointWeight): MeshAttributeAccessor<Float32ArrayConstructor> | null;
    attribute(attr: MeshAttribute): MeshAttributeAccessor<Float32ArrayConstructor | Uint16ArrayConstructor> | null;
    attribute<C extends Float32ArrayConstructor | Uint16ArrayConstructor>(attr: MeshAttribute): MeshAttributeAccessor<C> | null {
        if (typeof attr != 'number')
            throw new TypeError('Expected number, but got ' + typeof attr);

        const tempMemUint32 = this._engine.wasm._tempMemUint32;
        this._engine.wasm._wl_mesh_get_attribute(
            this._index,
            attr,
            this._engine.wasm._tempMem
        );
        if (tempMemUint32[0] == 255) return null;

        const a = new MeshAttributeAccessor<C>(this._engine, attr);
        a._attribute = tempMemUint32[0];
        a._offset = tempMemUint32[1];
        a._stride = tempMemUint32[2];
        a._formatSize = tempMemUint32[3];
        a._componentCount = tempMemUint32[4];
        const arraySize = tempMemUint32[5];
        /* The WASM API returns `0` for a scalar value. We clamp it to 1 as we strictly use it as a multiplier for get/set operations */
        a._arraySize = arraySize ? arraySize : 1;
        (a.length as number) = this.vertexCount;
        return a;
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
        this._engine.wasm._wl_mesh_destroy(this._index);
    }

    /**
     * Checks equality by comparing whether the wrapped native mesh ids are
     * equal.
     *
     * @param otherMesh Mesh to check equality with.
     * @returns Whether this mesh equals the given mesh.
     *
     * @since 1.0.0
     */
    equals(otherMesh: Mesh | undefined | null): boolean {
        if (!otherMesh) return false;
        return this._index === otherMesh._index;
    }
}

/**
 * An iterator over a mesh vertex attribute.
 *
 * Usage:
 *
 * ```js
 *   const mesh = this.object.getComponent('mesh').mesh;
 *   const positions = mesh.attribute(WL.MeshAttribute.Position);
 *
 *   const temp = new Float32Array(3);
 *   for(int i = 0; i < positions.length; ++i) {
 *       // pos will reference temp and thereby not allocate additional
 *       // JavaScript garbage, which would cause a perf spike when collected.
 *       const pos = positions.get(i, temp);
 *       // scale position by 2 on X axis only
 *       pos[0] *= 2.0f;
 *       positions.set(i, pos);
 *   }
 *   // we're done modifying, tell the engine to move vertex data to the GPU
 *   mesh.update();
 * ```
 */
export class MeshAttributeAccessor<C extends Float32ArrayConstructor | Uint16ArrayConstructor = Float32ArrayConstructor | Uint16ArrayConstructor> {
    /** Attribute index. @hidden */
    _attribute: number = -1;
    /** Attribute offset. @hidden */
    _offset: number = 0;
    /** Attribute stride. @hidden */
    _stride: number = 0;
    /** Format size native enum. @hidden */
    _formatSize: number = 0;
    /** Number of components per vertex. @hidden */
    _componentCount: number = 0;
    /** Number of values per vertex. @hidden */
    _arraySize: number = 1;

    /** Max number of elements. */
    readonly length: number = 0;

    /** Wonderland Engine instance. @hidden */
    protected _engine: WonderlandEngine;

    /**
     * Class to instantiate an ArrayBuffer to get/set values.
     */
    private _bufferType: C;
    /**
     * Function to allocate temporary WASM memory. It is cached in the accessor to avoid
     * conditionals during get/set.
     */
    private _tempBufferGetter: (bytes: number) => TypedArray<C>;

    /**
     * Create a new instance.
     *
     * @param type The type of data this accessor is wrapping.
     * @note Do not use this constructor. Instead, please use the {@link Mesh.attribute} method.
     *
     * @hidden
     */
    constructor(engine: WonderlandEngine, type = MeshAttribute.Position) {
        this._engine = engine;
        const wasm = this._engine.wasm;
        switch (type) {
            case MeshAttribute.Position:
            case MeshAttribute.Normal:
            case MeshAttribute.TextureCoordinate:
            case MeshAttribute.Tangent:
            case MeshAttribute.Color:
            case MeshAttribute.JointWeight:
                this._bufferType = Float32Array as C;
                this._tempBufferGetter = wasm.getTempBufferF32.bind(wasm) as (bytes: number) => TypedArray<C>;
                break;
            case MeshAttribute.JointId:
                this._bufferType = Uint16Array as C;
                this._tempBufferGetter = wasm.getTempBufferU16.bind(wasm) as (bytes: number) => TypedArray<C>;
                break;
            default:
                throw new Error(`Invalid attribute accessor type: ${type}`);
        }
    }

    /**
     * Create a new TypedArray to hold this attribute values.
     *
     * This method is useful to create a view to hold the data to
     * pass to {@link MeshAttributeAccessor.get} and {@link MeshAttributeAccessor.set}
     *
     * Example:
     *
     * ```js
     * const vertexCount = 4;
     * const positionAttribute = mesh.attribute(MeshAttributes.Position);
     *
     * // A position has 3 floats per vertex. Thus, positions has length 3 * 4.
     * const positions = positionAttribute.createArray(vertexCount);
     * ```
     *
     * @param count The number of **vertices** expected.
     * @returns A TypedArray with the appropriate format to access the data
     */
    createArray(count = 1) {
        count = count > this.length ? this.length : count;
        return new this._bufferType(count * this._componentCount * this._arraySize);
    }

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
    get(index: number): TypedArray<C>;
    get<T extends NumberArray>(index: number, out: T): T;
    get(
        index: number,
        out: NumberArray = this.createArray()
    ) {
        if (out.length % this._componentCount !== 0)
            throw new Error(
                `out.length, ${out.length} is not a multiple of the attribute vector components, ${this._componentCount}`
            );

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
}

/**
 * Constructor parameters object for a {@link Material} instance.
 */
export interface MaterialParameters {
    /** The name of the pipeline. */
    pipeline: string;
}

/**
 * Wrapper around a native material.
 *
 * Each material instance will have properties associated to the pipeline it uses.
 * The material properties are automatically added to each material instance, example:
 *
 * ```js
 * const material = mesh.material; // Material with a `Phong Opaque Textured` pipeline
 * // You can access all the material properties from the editor using:
 * material.diffuseTexture = null;
 * material.diffuseColor = [1.0, 0.0, 0.0, 1.0];
 * ```
 */
export class Material {
    /**
     * Index of this material in the manager.
     *
     * @hidden
     */
    _index: number;

    /**
     * Material definition index in the scene.
     *
     * @hidden
     */
    private _definition: number;

    /** Wonderland Engine instance. @hidden */
    protected _engine: WonderlandEngine;

    /**
     * Create a new Material.
     *
     * @note Creating material is expensive. Please use {@link Material#clone} to clone a material.
     * @note Do not use this constructor directly with an index, this is reserved for internal purposes.
     */
    constructor(engine: WonderlandEngine, params: number | MaterialParameters) {
        this._engine = engine;

        if (typeof params !== 'number') {
            if (!params?.pipeline) throw new Error("Missing parameter 'pipeline'");
            const wasm = this._engine.wasm;
            const pipeline = params.pipeline;
            const lengthBytes = wasm.lengthBytesUTF8(pipeline) + 1;
            wasm.stringToUTF8(pipeline, wasm._tempMem, lengthBytes);
            this._index = wasm._wl_material_create(wasm._tempMem);
            if (this._index < 0) throw new Error(`No such pipeline '${pipeline}'`);
        } else {
            this._index = params;
        }

        this._definition = this._engine.wasm._wl_material_get_definition(this._index);
        if (!this._engine.wasm._materialDefinitions[this._definition])
            throw new Error(
                `Material Definition ${this._definition} not found for material with index ${this._index}`
            );

        return new Proxy(this, {
            get(target, prop) {
                const wasm = engine.wasm;
                const definition = wasm._materialDefinitions[target._definition];
                const param = definition.get(prop);
                if (!param) return (target as {[key: string | symbol]: any})[prop];
                if (
                    wasm._wl_material_get_param_value(
                        target._index,
                        param.index,
                        wasm._tempMem
                    )
                ) {
                    const type = param.type;
                    switch (type.type) {
                        case MaterialParamType.UnsignedInt:
                            return type.componentCount == 1
                                ? wasm._tempMemUint32[0]
                                : new Uint32Array(
                                      wasm.HEAPU32.buffer,
                                      wasm._tempMem,
                                      type.componentCount
                                  );
                        case MaterialParamType.Int:
                            return type.componentCount == 1
                                ? wasm._tempMemInt[0]
                                : new Int32Array(
                                      wasm.HEAP32.buffer,
                                      wasm._tempMem,
                                      type.componentCount
                                  );
                        case MaterialParamType.Float:
                            return type.componentCount == 1
                                ? wasm._tempMemFloat[0]
                                : new Float32Array(
                                      wasm.HEAPF32.buffer,
                                      wasm._tempMem,
                                      type.componentCount
                                  );
                        case MaterialParamType.Sampler:
                            return new Texture(engine, wasm._tempMemInt[0]);
                        default:
                            throw new Error(
                                `Invalid type ${type} on parameter ${param.index} for material ${target._index}`
                            );
                    }
                }
            },

            set(target, prop, value) {
                const wasm = engine.wasm;
                const definition = wasm._materialDefinitions[target._definition];
                const param = definition.get(prop);
                if (!param) {
                    (target as {[key: string | symbol]: any})[prop] = value;
                    return true;
                }
                const type = param.type;
                switch (type.type) {
                    case MaterialParamType.UnsignedInt:
                    case MaterialParamType.Int:
                    case MaterialParamType.Sampler:
                        const v = value.id ?? value;
                        wasm._wl_material_set_param_value_uint(
                            target._index,
                            param.index,
                            v
                        );
                        break;
                    case MaterialParamType.Float:
                        let count = 1;
                        if (typeof value === 'number') {
                            wasm._tempMemFloat[0] = value;
                        } else {
                            count = value.length;
                            for (let i = 0; i < count; ++i)
                                wasm._tempMemFloat[i] = value[i];
                        }
                        wasm._wl_material_set_param_value_float(
                            target._index,
                            param.index,
                            wasm._tempMem,
                            count
                        );
                        break;
                    case MaterialParamType.Font:
                        throw new Error(
                            'Setting font properties is currently unsupported.'
                        );
                }
                return true;
            },
        });
    }

    /** @deprecated Use {@link #pipeline} instead. */
    get shader(): string {
        return this.pipeline;
    }

    /** Name of the pipeline used by this material. */
    get pipeline(): string {
        const wasm = this._engine.wasm;
        return wasm.UTF8ToString(
            (wasm._wl_material_get_pipeline || wasm._wl_material_get_shader)(this._index)
        );
    }

    /** Hosting engine instance. */
    get engine() {
        return this._engine;
    }

    /**
     * Create a copy of the underlying native material.
     *
     * @returns Material clone.
     */
    clone(): Material | null {
        const id = this._engine.wasm._wl_material_clone(this._index);
        return id > 0 ? new Material(this._engine, id) : null;
    }

    /**
     * Checks equality by comparing whether the wrapped native material ids are
     * equal.
     *
     * @param otherMaterial Material to check equality with.
     * @returns Whether this material equals the given material.
     *
     * @since 1.0.0
     */
    equals(otherMaterial: Material | undefined | null): boolean {
        if (!otherMaterial) return false;
        return this._index === otherMaterial._index;
    }

    /**
     * Wrap a native material index.
     *
     * @param engine Engine instance.
     * @param index The index.
     * @returns Material instance or `null` if index <= 0.
     *
     * @deprecated Please use `new Material()` instead.
     */
    static wrap(engine: WonderlandEngine, index: number): Material | null {
        /** @todo: this propagate nullable in the entire codebase. Remove. */
        return index > 0 ? new Material(engine, index) : null;
    }
}

/** Temporary canvas */
let temp2d: {canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D} | null = null;

/**
 * Wrapper around a native texture data.
 */
export class Texture {
    /** Wonderland Engine instance. @hidden */
    protected _engine: WonderlandEngine;

    /** Index in the manager. @hidden */
    private _id: number = 0;
    /** HTML image index. @hidden */
    private _imageIndex: number | null = null;

    /**
     * @param engine The engine instance
     * @param param HTML media element to create texture from or texture id to wrap.
     */
    constructor(
        engine: WonderlandEngine,
        param: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | number
    ) {
        this._engine = engine ?? WL;
        const wasm = engine.wasm;
        if (
            param instanceof HTMLImageElement ||
            param instanceof HTMLVideoElement ||
            param instanceof HTMLCanvasElement
        ) {
            const index = wasm._images.length;
            wasm._images.push(param);
            this._imageIndex = index;
            this._id = this._engine.wasm._wl_renderer_addImage(index);
        } else {
            this._id = param;
        }
        this._engine.textures[this._id] = this;
    }

    /** Whether this texture is valid. */
    get valid(): boolean {
        return this._id >= 0;
    }

    /** Index in this manager. */
    get id(): number {
        return this._id;
    }

    /** Update the texture to match the HTML element (e.g. reflect the current frame of a video). */
    update() {
        if (!this.valid || this._imageIndex === null) return;
        this._engine.wasm._wl_renderer_updateImage(this._id, this._imageIndex);
    }

    /** Width of the texture. */
    get width(): number {
        return this._engine.wasm._wl_texture_width(this._id);
    }

    /** Height of the texture. */
    get height(): number {
        return this._engine.wasm._wl_texture_height(this._id);
    }

    /** Hosting engine instance. */
    get engine() {
        return this._engine;
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
        if (!this.valid || this._imageIndex === null) return;

        /* Lazy initialize temp canvas */
        if (!temp2d) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                throw new Error(
                    'Texture.updateSubImage(): Failed to obtain CanvasRenderingContext2D.'
                );
            }
            temp2d = {canvas, ctx};
        }

        const wasm = this._engine.wasm;
        const img = wasm._images[this._imageIndex];
        if (!img) return;

        temp2d.canvas.width = w;
        temp2d.canvas.height = h;
        temp2d.ctx.drawImage(img, x, y, w, h, 0, 0, w, h);

        const yOffset = ((img as HTMLVideoElement).videoHeight ?? img.height) - y - h;
        wasm._images[this._imageIndex] = temp2d.canvas;
        wasm._wl_renderer_updateImage(this._id, this._imageIndex, x, yOffset);
        wasm._images[this._imageIndex] = img;
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
        this._engine.wasm._wl_texture_destroy(this._id);
        if (this._imageIndex !== null) {
            this._engine.wasm._images[this._imageIndex] = null;
            this._imageIndex = undefined!;
        }
    }

    /**
     * Checks equality by comparing whether the wrapped native texture ids are
     * equal.
     *
     * @param otherTexture Texture to check equality with.
     * @returns Whether this texture equals the given texture.
     *
     * @since 1.0.0
     */
    equals(otherTexture: Texture | undefined | null): boolean {
        if (!otherTexture) return false;
        return this._id === otherTexture._id;
    }
}

/**
 * Wrapper around a native animation.
 */
export class Animation {
    /** Index of the mesh in the manager. @hidden */
    _index: number;

    /** Wonderland Engine instance. @hidden */
    protected _engine: WonderlandEngine;

    /**
     * @param index Index in the manager
     */
    constructor(engine: WonderlandEngine = WL, index: number) {
        this._engine = engine;
        this._index = index;
    }

    /** Duration of this animation. */
    get duration(): number {
        return this._engine.wasm._wl_animation_get_duration(this._index);
    }

    /** Number of tracks in this animation. */
    get trackCount(): number {
        return this._engine.wasm._wl_animation_get_trackCount(this._index);
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
        const wasm = this._engine.wasm;
        if (newTargets instanceof Skin) {
            const animId = wasm._wl_animation_retargetToSkin(
                this._index,
                newTargets._index
            );
            return new Animation(this._engine, animId);
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
            wasm.HEAPU16[ptr >> (1 + i)] = (newTargets[i] as Object3D).objectId;
        }
        const animId = wasm._wl_animation_retarget(this._index, ptr);
        wasm._free(ptr);

        return new Animation(this._engine, animId);
    }

    /**
     * Checks equality by comparing whether the wrapped native animation ids
     * are equal.
     *
     * @param otherAnimation Animation to check equality with.
     * @returns Whether this animation equals the given animation.
     *
     * @since 1.0.0
     */
    equals(otherAnimation: Animation | undefined | null): boolean {
        if (!otherAnimation) return false;
        return this._index === otherAnimation._index;
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
 * Objects can be created and added to a scene through
 * {@link Scene#addObject} on the {@link WonderlandEngine.scene}.
 */
export class Object3D {
    /** Wonderland Engine instance. @hidden */
    protected _engine: WonderlandEngine;

    /**
     * Object index in the manager.
     *
     * @hidden
     */
    protected readonly _objectId: number = -1;

    /**
     * @param o Object id to wrap
     *
     * For performance reasons, please use {@link WonderlandEngine.wrapObject}
     */
    constructor(engine: WonderlandEngine, o: number) {
        this._objectId = o;
        this._engine = engine;
    }

    /**
     * Name of the object.
     *
     * Useful for identifying objects during debugging.
     */
    get name(): string {
        const wasm = this._engine.wasm;
        return wasm.UTF8ToString(wasm._wl_object_name(this.objectId));
    }

    /**
     * Set the object's name.
     *
     * @param newName The new name to set.
     */
    set name(newName: string) {
        const wasm = this._engine.wasm;
        const lengthBytes = wasm.lengthBytesUTF8(newName) + 1;
        const mem = wasm._tempMem;
        wasm.stringToUTF8(newName, mem, lengthBytes);
        wasm._wl_object_set_name(this.objectId, mem);
    }

    /**
     * Parent of this object or `null` if parented to root.
     */
    get parent(): Object3D | null {
        const p = this._engine.wasm._wl_object_parent(this.objectId);
        return p === 0 ? null : this._engine.wrapObject(p);
    }

    /**
     * Children of this object.
     */
    get children(): Object3D[] {
        const childrenCount = this._engine.wasm._wl_object_get_children_count(
            this.objectId
        );
        if (childrenCount === 0) return [];

        const wasm = this._engine.wasm;
        wasm.requireTempMem(childrenCount * 2);

        this._engine.wasm._wl_object_get_children(
            this.objectId,
            wasm._tempMem,
            wasm._tempMemSize >> 1
        );

        const children = new Array(childrenCount);
        for (let i = 0; i < childrenCount; ++i) {
            children[i] = this._engine.wrapObject(wasm._tempMemUint16[i]);
        }
        return children;
    }

    /**
     * Reparent object to given object.
     *
     * @note Reparenting is not trivial and might have a noticeable performance impact.
     *
     * @param newParent New parent or `null` to parent to root
     */
    set parent(newParent: Object3D | undefined | null) {
        this._engine.wasm._wl_object_set_parent(
            this.objectId,
            newParent == null ? 0 : newParent.objectId
        );
    }

    /** Object index in the manager. */
    get objectId() {
        return this._objectId;
    }

    /** Hosting engine instance. */
    get engine() {
        return this._engine;
    }

    /** Reset local transformation (translation, rotation and scaling) to identity. */
    resetTransform(): void {
        this._engine.wasm._wl_object_reset_translation_rotation(this.objectId);
        this._engine.wasm._wl_object_reset_scaling(this.objectId);
    }

    /** Reset local translation and rotation to identity */
    resetTranslationRotation(): void {
        this._engine.wasm._wl_object_reset_translation_rotation(this.objectId);
    }

    /**
     * Reset local rotation, keep translation.
     * @note To reset both rotation and translation, prefer
     *       {@link resetTranslationRotation}.
     */
    resetRotation(): void {
        this._engine.wasm._wl_object_reset_rotation(this.objectId);
    }

    /**
     * Reset local translation, keep rotation.
     * @note To reset both rotation and translation, prefer
     *       {@link resetTranslationRotation}.
     */
    resetTranslation(): void {
        this._engine.wasm._wl_object_reset_translation(this.objectId);
    }

    /** Reset local scaling to identity (``[1.0, 1.0, 1.0]``). */
    resetScaling(): void {
        this._engine.wasm._wl_object_reset_scaling(this.objectId);
    }

    /**
     * Translate object by a vector in the parent's space.
     * @param v Vector to translate by.
     */
    translate(v: Readonly<NumberArray>): void {
        this._engine.wasm._wl_object_translate(this.objectId, v[0], v[1], v[2]);
    }

    /**
     * Translate object by a vector in object space.
     * @param v Vector to translate by.
     */
    translateObject(v: Readonly<NumberArray>): void {
        this._engine.wasm._wl_object_translate_obj(this.objectId, v[0], v[1], v[2]);
    }

    /**
     * Translate object by a vector in world space.
     * @param v Vector to translate by.
     */
    translateWorld(v: Readonly<NumberArray>): void {
        this._engine.wasm._wl_object_translate_world(this.objectId, v[0], v[1], v[2]);
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
     */
    rotateAxisAngleDeg(a: Readonly<NumberArray>, d: number): void {
        this._engine.wasm._wl_object_rotate_axis_angle(this.objectId, a[0], a[1], a[2], d);
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
     */
    rotateAxisAngleRad(a: Readonly<NumberArray>, d: number): void {
        this._engine.wasm._wl_object_rotate_axis_angle_rad(
            this.objectId,
            a[0],
            a[1],
            a[2],
            d
        );
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
     */
    rotateAxisAngleDegObject(a: Readonly<NumberArray>, d: number): void {
        this._engine.wasm._wl_object_rotate_axis_angle_obj(
            this.objectId,
            a[0],
            a[1],
            a[2],
            d
        );
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
     */
    rotateAxisAngleRadObject(a: Readonly<NumberArray>, d: number): void {
        this._engine.wasm._wl_object_rotate_axis_angle_rad_obj(
            this.objectId,
            a[0],
            a[1],
            a[2],
            d
        );
    }

    /**
     * Rotate by a quaternion.
     *
     * @param q the Quaternion to rotate by.
     */
    rotate(q: Readonly<NumberArray>): void {
        this._engine.wasm._wl_object_rotate_quat(this.objectId, q[0], q[1], q[2], q[3]);
    }

    /**
     * Rotate by a quaternion in object space.
     *
     * Equivalent to prepending a rotation quaternion to the object's
     * local transformation.
     *
     * @param q the Quaternion to rotate by.
     */
    rotateObject(q: Readonly<NumberArray>): void {
        this._engine.wasm._wl_object_rotate_quat_obj(this.objectId, q[0], q[1], q[2], q[3]);
    }

    /**
     * Scale object by a vector in object space.
     *
     * @param v Vector to scale by.
     */
    scale(v: Readonly<NumberArray>): void {
        this._engine.wasm._wl_object_scale(this.objectId, v[0], v[1], v[2]);
    }

    /** Local / object space transformation. */
    get transformLocal(): Float32Array {
        const wasm = this._engine.wasm;
        return new Float32Array(
            wasm.HEAPF32.buffer,
            wasm._wl_object_trans_local(this.objectId),
            8
        );
    }

    /**
     * Set local transform.
     *
     * @param t Local space transformation.
     *
     * @since 0.8.5
     */
    set transformLocal(t: Readonly<NumberArray>) {
        this.transformLocal.set(t);
        this.setDirty();
    }

    /**
     * Compute local / object space translation from transformation.
     *
     * @param out Destination array/vector, expected to have at least 3 elements.
     * @return The `out` parameter.
     */
    getTranslationLocal<T extends NumberArray>(out: T): T {
        const wasm = this._engine.wasm;
        wasm._wl_object_get_translation_local(this.objectId, wasm._tempMem);
        out[0] = wasm._tempMemFloat[0];
        out[1] = wasm._tempMemFloat[1];
        out[2] = wasm._tempMemFloat[2];
        return out;
    }

    /**
     * Compute world space translation from transformation.
     *
     * May recompute transformations of the hierarchy of this object,
     * if they were changed by JavaScript components this frame.
     *
     * @param out Destination array/vector, expected to have at least 3 elements.
     * @return The `out` parameter.
     */
    getTranslationWorld<T extends NumberArray>(out: T): T {
        const wasm = this._engine.wasm;
        wasm._wl_object_get_translation_world(this.objectId, wasm._tempMem);
        out[0] = wasm._tempMemFloat[0];
        out[1] = wasm._tempMemFloat[1];
        out[2] = wasm._tempMemFloat[2];
        return out;
    }

    /**
     * Set local / object space translation.
     *
     * Concatenates a new translation dual quaternion onto the existing rotation.
     *
     * @param v New local translation array/vector, expected to have at least 3 elements.
     */
    setTranslationLocal(v: Readonly<NumberArray>): void {
        this._engine.wasm._wl_object_set_translation_local(this.objectId, v[0], v[1], v[2]);
    }

    /**
     * Set world space translation.
     *
     * Applies the inverse parent transform with a new translation dual quaternion
     * which is concatenated onto the existing rotation.
     *
     * @param v New world translation array/vector, expected to have at least 3 elements.
     */
    setTranslationWorld(v: Readonly<NumberArray>): void {
        this._engine.wasm._wl_object_set_translation_world(this.objectId, v[0], v[1], v[2]);
    }

    /**
     * Global / world space transformation.
     *
     * May recompute transformations of the hierarchy of this object,
     * if they were changed by JavaScript components this frame.
     */
    get transformWorld(): Float32Array {
        const wasm = this._engine.wasm;
        return new Float32Array(
            wasm.HEAPF32.buffer,
            wasm._wl_object_trans_world(this.objectId),
            8
        );
    }

    /**
     * Set world transform.
     *
     * @param t Global / world space transformation.
     *
     * @since 0.8.5
     */
    set transformWorld(t: Readonly<NumberArray>) {
        this.transformWorld.set(t);
        this._engine.wasm._wl_object_trans_world_to_local(this.objectId);
    }

    /** Local / object space scaling. */
    get scalingLocal(): Float32Array {
        const wasm = this._engine.wasm;
        return new Float32Array(
            wasm.HEAPF32.buffer,
            wasm._wl_object_scaling_local(this.objectId),
            3
        );
    }

    /**
     * Set local space scaling.
     *
     * @param s Global / world space transformation.
     *
     * @since 0.8.7
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
     */
    get scalingWorld(): Float32Array {
        const wasm = this._engine.wasm;
        return new Float32Array(
            wasm.HEAPF32.buffer,
            wasm._wl_object_scaling_world(this.objectId),
            3
        );
    }

    /**
     * Set world space scaling.
     *
     * @param t Global / world space transformation.
     *
     * @since 0.8.7
     */
    set scalingWorld(s: Readonly<NumberArray>) {
        this.scalingWorld.set(s);
        this._engine.wasm._wl_object_scaling_world_to_local(this.objectId);
    }

    /**
     * Local space rotation.
     *
     * @since 0.8.7
     */
    get rotationLocal(): Float32Array {
        return this.transformLocal.subarray(0, 4);
    }

    /**
     * Global / world space rotation
     *
     * @since 0.8.7
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
     */
    set rotationLocal(r: Readonly<NumberArray>) {
        this._engine.wasm._wl_object_set_rotation_local(
            this.objectId,
            r[0],
            r[1],
            r[2],
            r[3]
        );
    }

    /**
     * Set world space rotation.
     *
     * @param r Global / world space rotation.
     *
     * @since 0.8.7
     */
    set rotationWorld(r: Readonly<NumberArray>) {
        this._engine.wasm._wl_object_set_rotation_world(
            this.objectId,
            r[0],
            r[1],
            r[2],
            r[3]
        );
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
    getForward<T extends NumberArray>(out: T): T {
        out[0] = 0;
        out[1] = 0;
        out[2] = -1;
        this.transformVectorWorld(out);
        return out;
    }

    /**
     * Compute the object's up facing world space vector.
     *
     * @param out Destination array/vector, expected to have at least 3 elements.
     * @return The `out` parameter.
     */
    getUp<T extends NumberArray>(out: T): T {
        out[0] = 0;
        out[1] = 1;
        out[2] = 0;
        this.transformVectorWorld(out);
        return out;
    }

    /**
     * Compute the object's right facing world space vector.
     *
     * @param out Destination array/vector, expected to have at least 3 elements.
     * @return The `out` parameter.
     */
    getRight<T extends NumberArray>(out: T): T {
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
        wasm._wl_object_transformVectorWorld(this.objectId, wasm._tempMem);
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
        wasm._wl_object_transformVectorLocal(this.objectId, wasm._tempMem);
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
        wasm._wl_object_transformPointWorld(this.objectId, wasm._tempMem);
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
        wasm._wl_object_transformPointLocal(this.objectId, wasm._tempMem);
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
        wasm._wl_object_transformVectorInverseWorld(this.objectId, wasm._tempMem);
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
        wasm._wl_object_transformVectorInverseLocal(this.objectId, wasm._tempMem);
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
        wasm._wl_object_transformPointInverseWorld(this.objectId, wasm._tempMem);
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
        wasm._wl_object_transformPointInverseLocal(this.objectId, wasm._tempMem);
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
        wasm._wl_object_toWorldSpaceTransform(this.objectId, wasm._tempMem);
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
        wasm._wl_object_toObjectSpaceTransform(this.objectId, wasm._tempMem);
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
     */
    lookAt(p: NumberArray, up: NumberArray = UP_VECTOR): void {
        this._engine.wasm._wl_object_lookAt(
            this.objectId,
            p[0],
            p[1],
            p[2],
            up[0],
            up[1],
            up[2]
        );
    }

    /** Destroy the object with all of its components and remove it from the scene */
    destroy(): void {
        this._engine.wasm._wl_scene_remove_object(this.objectId);
        (this._objectId as number) = -1;
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
        this._engine.wasm._wl_object_set_dirty(this.objectId);
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
    /** @overload */
    getComponent<T extends Component>(
        typeOrClass: ComponentConstructor<T>,
        index?: number
    ): T | null;

    /**
     * Get a component attached to this object.
     *
     * @param typeOrClass Type name. It's also possible to give a class definition.
     *     In this case, the method will use the `class.TypeName` field to find the component.
     * @param index=0 Index for component of given type. This can be used to access specific
     *      components if the object has multiple components of the same type.
     * @returns The component or `null` if there is no such component on this object
     */
    getComponent(
        typeOrClass: string | ComponentConstructor,
        index?: number
    ): Component | null {
        const type = isString(typeOrClass) ? typeOrClass : typeOrClass.TypeName;
        const wasm = this._engine.wasm;
        const lengthBytes = wasm.lengthBytesUTF8(type) + 1;
        const mem = wasm._tempMem;
        wasm.stringToUTF8(type, mem, lengthBytes);
        const componentType = this._engine.wasm._wl_get_component_manager_index(mem);

        if (componentType < 0) {
            /* Not a native component, try js: */
            const typeIndex = this._engine.wasm._componentTypeIndices[type];
            const jsIndex = this._engine.wasm._wl_get_js_component_index(
                this.objectId,
                typeIndex,
                index || 0
            );
            return jsIndex < 0 ? null : this._engine.wasm._components[jsIndex];
        }

        const componentId = this._engine.wasm._wl_get_component_id(
            this.objectId,
            componentType,
            index || 0
        );
        return this._engine._wrapComponent(type, componentType, componentId);
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
    /** @overload */
    getComponents<T extends Component>(typeClass: ComponentConstructor<T>): T[];

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
    getComponents<T extends Component>(
        typeOrClass?: string | ComponentConstructor<T> | null
    ): T[] {
        const wasm = this._engine.wasm;

        let componentType = null;
        let type = null;
        if (typeOrClass) {
            type = isString(typeOrClass) ? typeOrClass : typeOrClass.TypeName;
            componentType = wasm._typeIndexFor(type);
        }

        const components: Component[] = [];
        const maxComps = Math.floor((wasm._tempMemSize / 3) * 2);
        const componentsCount = wasm._wl_object_get_components(
            this.objectId,
            wasm._tempMem,
            maxComps
        );
        const offset = 2 * componentsCount;
        wasm._wl_object_get_component_types(
            this.objectId,
            wasm._tempMem + offset,
            maxComps
        );

        const jsManagerIndex = wasm._typeIndexFor('js');
        for (let i = 0; i < componentsCount; ++i) {
            const t = wasm._tempMemUint8[i + offset];
            const componentId = wasm._tempMemUint16[i];
            /* Handle JS types separately */
            if (t == jsManagerIndex) {
                const typeIndex = wasm._wl_get_js_component_index_for_id(componentId);
                const comp = wasm._components[typeIndex];
                if (componentType === null || comp.type == type) components.push(comp);
                continue;
            }

            if (componentType === null) {
                const managerName = wasm._typeNameFor(t);
                components.push(this._engine._wrapComponent(managerName, t, componentId)!);
            } else if (t == componentType) {
                /* Optimized manager name retrieval, already have type */
                components.push(
                    this._engine._wrapComponent(type as string, componentType, componentId)!
                );
            }
        }
        return components as T[];
    }

    /* `addComponent` overloads for native components. */

    /** @overload */
    addComponent(
        type: 'collision',
        params?: Record<string, any>
    ): CollisionComponent | null;
    /** @overload */
    addComponent(type: 'text', params?: Record<string, any>): TextComponent | null;
    /** @overload */
    addComponent(type: 'view', params?: Record<string, any>): ViewComponent | null;
    /** @overload */
    addComponent(type: 'mesh', params?: Record<string, any>): MeshComponent | null;
    /** @overload */
    addComponent(type: 'input', params?: Record<string, any>): InputComponent | null;
    /** @overload */
    addComponent(type: 'light', params?: Record<string, any>): LightComponent | null;
    /** @overload */
    addComponent(
        type: 'animation',
        params?: Record<string, any>
    ): AnimationComponent | null;
    /** @overload */
    addComponent(type: 'physx', params?: Record<string, any>): PhysXComponent | null;
    /** @overload */
    addComponent<T extends Component>(
        typeClass: ComponentConstructor<T>,
        params?: Record<string, any>
    ): T | null;
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
    addComponent(
        typeOrClass: ComponentConstructor | string,
        params?: Record<string, any>
    ): Component | null {
        const wasm = this._engine.wasm;

        const type = isString(typeOrClass) ? typeOrClass : typeOrClass.TypeName;
        const componentType = wasm._typeIndexFor(type);
        let component: Component = null!;
        let componentIndex = null;
        if (componentType < 0) {
            /* JavaScript component */
            if (!(type in wasm._componentTypeIndices)) {
                throw new TypeError("Unknown component type '" + type + "'");
            }
            const componentId = wasm._wl_object_add_js_component(
                this.objectId,
                wasm._componentTypeIndices[type]
            );
            componentIndex = wasm._wl_get_js_component_index_for_id(componentId);
            component = wasm._components[componentIndex];
        } else {
            /* native component */
            const componentId = wasm._wl_object_add_component(this.objectId, componentType);
            component = this._engine._wrapComponent(type, componentType, componentId)!;
        }

        if (params !== undefined) {
            const ctor = component.constructor as ComponentConstructor;
            for (const key in params) {
                if (!(key in ctor.Properties)) continue;
                (component as Record<string, any>)[key] = params[key];
            }
        }

        /* Explicitly initialize native components */
        if (componentType < 0) {
            /* @todo: `componentIndex` can be null here, that's an error */
            wasm._wljs_component_init(componentIndex!);
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
     * Whether given object's transformation has changed.
     */
    get changed(): boolean {
        return !!this._engine.wasm._wl_object_is_changed(this.objectId);
    }

    /**
     * Checks equality by comparing whether the wrapped native object ids are
     * equal.
     *
     * @param otherObject Object to check equality with.
     * @returns Whether this object equals the given object.
     */
    equals(otherObject: Object3D | undefined | null): boolean {
        if (!otherObject) return false;
        return this.objectId == otherObject.objectId;
    }
}

/**
 * Wrapper around a native skin data.
 */
export class Skin {
    /**
     * Index of the skin in the manager.
     * @hidden
     */
    _index: number;

    /** Wonderland Engine instance. @hidden */
    protected _engine: WonderlandEngine;

    constructor(engine: WonderlandEngine, index: number) {
        this._engine = engine;
        this._index = index;
    }

    /** Amount of joints in this skin. */
    get jointCount() {
        return this._engine.wasm._wl_skin_get_joint_count(this._index);
    }

    /** Joints object ids for this skin */
    get jointIds(): Uint16Array {
        const wasm = this._engine.wasm;
        return new Uint16Array(
            wasm.HEAPU16.buffer,
            wasm._wl_skin_joint_ids(this._index),
            this.jointCount
        );
    }

    /**
     * Dual quaternions in a flat array of size 8 times {@link jointCount}.
     *
     * Inverse bind transforms of the skin.
     */
    get inverseBindTransforms(): Float32Array {
        const wasm = this._engine.wasm;
        return new Float32Array(
            wasm.HEAPF32.buffer,
            wasm._wl_skin_inverse_bind_transforms(this._index),
            8 * this.jointCount
        );
    }

    /**
     * Vectors in a flat array of size 3 times {@link jointCount}.
     *
     * Inverse bind scalings of the skin.
     */
    get inverseBindScalings(): Float32Array {
        const wasm = this._engine.wasm;
        return new Float32Array(
            wasm.HEAPF32.buffer,
            wasm._wl_skin_inverse_bind_scalings(this._index),
            3 * this.jointCount
        );
    }

    /**
     * Checks equality by comparing whether the wrapped native skin ids are
     * equal.
     *
     * @param otherSkin Skin to check equality with.
     * @returns Whether this skin equals the given skin.
     *
     * @since 1.0.0
     */
    equals(otherSkin: Skin | undefined | null): boolean {
        if (!otherSkin) return false;
        return this._index === otherSkin._index;
    }
}

/* For backward compatibility with < 1.0.0. */
export {Object3D as Object};

/**
 * Ray hit.
 *
 * Result of a {@link Scene.rayCast}.
 *
 * @note this class wraps internal engine data and should only be created internally.
 */
export class RayHit {
    /** Wonderland Engine instance. @hidden */
    protected _engine: WonderlandEngine;

    /** Pointer to the memory heap. */
    private _ptr: number;

    /**
     * @param ptr Pointer to the ray hits memory.
     */
    constructor(engine: WonderlandEngine, ptr: number) {
        if ((ptr & 3) !== 0) {
            throw new Error('Misaligned pointer: please report a bug');
        }
        this._engine = engine;
        this._ptr = ptr;
    }

    /** Array of ray hit locations. */
    get locations(): Float32Array[] {
        let p = this._ptr;
        let l = [];
        for (let i = 0; i < this.hitCount; ++i) {
            l.push(new Float32Array(this._engine.wasm.HEAPF32.buffer, p + 12 * i, 3));
        }
        return l;
    }

    /** Array of ray hit normals (only when using {@link Physics#rayCast}. */
    get normals(): Float32Array[] {
        let p = this._ptr + 48;
        let l = [];
        for (let i = 0; i < this.hitCount; ++i) {
            l.push(new Float32Array(this._engine.wasm.HEAPF32.buffer, p + 12 * i, 3));
        }
        return l;
    }

    /**
     * Prefer these to recalculating the distance from locations.
     *
     * Distances of array hits to ray origin.
     */
    get distances(): Float32Array {
        const p = this._ptr + 48 * 2;
        return new Float32Array(this._engine.wasm.HEAPF32.buffer, p, this.hitCount);
    }

    /** Hit objects */
    get objects(): (Object3D | null)[] {
        let p = this._ptr + (48 * 2 + 16);
        let objIds = new Uint16Array(this._engine.wasm.HEAPU16.buffer, p, this.hitCount);
        return [
            objIds[0] <= 0 ? null : this._engine.wrapObject(objIds[0]),
            objIds[1] <= 0 ? null : this._engine.wrapObject(objIds[1]),
            objIds[2] <= 0 ? null : this._engine.wrapObject(objIds[2]),
            objIds[3] <= 0 ? null : this._engine.wrapObject(objIds[3]),
        ];
    }

    /** Number of hits (max 4) */
    get hitCount(): number {
        return Math.min(this._engine.wasm.HEAPU32[this._ptr / 4 + 30], 4);
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
 * {@link I18N.translate() "individual terms"}.
 *
 * Internationalization works with terms,
 * a string type keyword that is linked to a different text for each language.
 *
 * Internally, string parameters for text and js components are
 * automatically swapped during language change, given they are linked to a term.
 * If manual text swapping is desired, {@link I18N.translate()}
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
    protected _engine: WonderlandEngine;

    /**
     * Constructor
     */
    constructor(engine: WonderlandEngine) {
        this._engine = engine;
    }

    /**
     * Set current language and apply translations to linked text parameters.
     *
     * @param code Language code to switch to
     */
    set language(code: string | null) {
        const wasm = this._engine.wasm;
        if (code == null) return;
        const strLen = wasm.lengthBytesUTF8(code) + 1;
        wasm.stringToUTF8(code, wasm._tempMem, strLen);
        wasm._wl_i18n_setLanguage(wasm._tempMem);
    }

    /**
     * Get current language code.
     *
     */
    get language(): string | null {
        const wasm = this._engine.wasm;
        const code = wasm._wl_i18n_currentLanguage();
        if (code === 0) return null;
        return wasm.UTF8ToString(code);
    }

    /**
     * Get translated string for a term for the currently loaded language.
     *
     * @param term Term to translate
     */
    translate(term: string): string | null {
        const wasm = this._engine.wasm;
        const strLen = wasm.lengthBytesUTF8(term) + 1;
        wasm.stringToUTF8(term, wasm._tempMem, strLen);
        const translation = wasm._wl_i18n_translate(wasm._tempMem);
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
        const strLen = wasm.lengthBytesUTF8(code) + 1;
        wasm.stringToUTF8(code, wasm._tempMem, strLen);
        return wasm._wl_i18n_languageIndex(wasm._tempMem);
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
}
