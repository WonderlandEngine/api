const MISALIGNED_MSG = "Misaligned pointer: please report a bug";

/**
 * Wonderland Engine Library
 * @namespace WL
 */
var WL = {
/**
 * @typedef WL.CustomParameter
 * @type {object}
 * @property {WL.Type} type Parameter type
 * @property {*} [default] Default value, depending on type.
 * @property {string[]} values Values for {@link WL.Type.Enum}
 */
/**
 * Register a custom JavaScript component type
 *
 * @param {string} name Name of the component
 * @param {object} params Dict of param names to {@link WL.CustomParameter}
 * @param {WL.Component} object Object containing functions for the component type
 *
 * @example
 * WL.registerComponent('my-new-type', {
 *  myParam: {type: WL.Type.Float, default: 42.0},
 * }, {
 *  init: function() {},
 *  start: function() {},
 *  update: function(dt) {},
 *  onActivate: function() {},
 *  onDeactivate: function() {},
 * });
 */
registerComponent: function(name, params, object) { _WL.registerComponent(name, params, object); },

/**
 * Component parameter type enum
 * @enum {number}
 */
Type: {
    /**
     * **Bool**:
     *
     * Appears in the editor as checkbox.
     */
    Bool: 1<<1,

    /**
     * **Int**:
     *
     * Appears in the editor as int input field.
     */
    Int: 1<<2,

    /**
     * **Float**:
     *
     * Appears in the editor as float input field.
     */
    Float: 1<<3,

    /**
     * **String / Text**:
     *
     * Appears in the editor as text input field.
     */
    String: 1<<4,

    /**
     * **Enumeration**:
     *
     * Appears in the editor as dropdown with given values.
     * If parameters is enum, a `values` parameter needs to be
     * specified for the parameter aswell.
     *
     * @example
     *     camera: {type: WL.Type.Enum, values: ['auto', 'back', 'front'], default: 'auto'},
     */
    Enum: 1<<5,

    /**
     * **Object reference**:
     *
     * Appears in the editor as object resource selection dropdown
     * with object picker.
     */
    Object: 1<<6,

    /**
     * **Mesh reference**:
     *
     * Appears in the editor as mesh resource selection dropdown.
     */
    Mesh: 1<<7,

    /**
     * **Texture reference**:
     *
     * Appears in the editor as texture resource selection dropdown.
     */
    Texture: 1<<8,

    /**
     * **Material reference**:
     *
     * Appears in the editor as material resource selection dropdown.
     */
    Material: 1<<9,

    /**
     * **Animation reference**:
     *
     * Appears in the editor as animation resource selection dropdown.
     */
    Animation: 1<<10,

    /**
     * **Skin reference**:
     *
     * Appears in the editor as skin resource selection dropdown.
     */
    Skin: 1<<11,
},

/**
 * Collider type enum for {@link WL.CollisionComponent}
 * @enum {number}
 */
Collider: {
    /**
     * **Sphere Collider**:
     *
     * Simplest and most performant collision shape. If this type is set on a
     * {@link WL.CollisionComponent}, only the first component of
     * {@link WL.CollisionComponent#extents} will be used to determine the radius.
     */
    Sphere: 0,

    /**
     * **Axis Aligned Bounding Box Collider**:
     *
     * Box that is always aligned to XYZ axis. It cannot be rotated but is more
     * efficient than {@link WL.Collider.Box}.
     */
    AxisAlignedBox: 1,

    /**
     * **Aligned Bounding Box Collider**:
     *
     * Box that matches the object's rotation and translation correctly. This
     * is the least efficient collider and should only chosen over
     * {@link WL.Collider.Sphere} and {@link WL.Collider.AxisAlignedBox} if really
     * neccessary.
     */
    Box: 2
},

/**
 * Alignment type enum for {@link WL.TextComponent}
 * @enum {number}
 */
Alignment: {
    /** Text start is at object origin */
    Left: 1,

    /** Text center is at object origin */
    Center: 2,

    /** Text end is at object origin */
    Right: 3
},

/**
 * Justification type enum for {@link WL.TextComponent}
 * @enum {number}
 */
Justification: {
    /** Text line is at object origin */
    Line: 1,

    /** Text middle is at object origin */
    Middle: 2,

    /** Text top is at object origin */
    Top: 3
},

/**
 * Input type enum for {@link WL.InputComponent}
 * @enum {number}
 */
InputType: {
    /** Head input */
    Head: 0,

    /** Left eye input */
    EyeLeft: 1,

    /** Right eye input */
    EyeRight: 2,

    /** Left controller input */
    ControllerLeft: 3,

    /** Right controller input */
    ControllerRight: 4,

    /** Left ray input */
    RayLeft: 5,

    /** Right ray input */
    RayRight: 6,
},

/**
 * Light type enum for {@link WL.LightComponent}
 * @enum {number}
 */
LightType: {
    /** Point light */
    Point: 1,

    /** Sun light / Directional light */
    Sun: 2,
},

/**
 * Animation state of {@link WL.AnimationComponent}
 * @enum {number}
 */
AnimationState: {
    /** Animation is currently playing */
    Playing: 1,

    /** Animation is paused and will continue at current playback
    * time on {@link WL.AnimationComponent#play} */
    Paused: 2,

    /** Animation is stopped */
    Stopped: 3
},

/**
 * Rigid body force mode for {@link WL.PhysXComponent#addForce} and {@link WL.PhysXComponent#addTorque}.
 * @enum {number}
 *
 * [PhysX API Reference](https://gameworksdocs.nvidia.com/PhysX/4.1/documentation/physxapi/files/structPxForceMode.html)
 */
ForceMode: {
    /** Apply as force */
    Force: 0,

    /** Apply as impulse */
    Impulse: 1,

    /** Apply as velocity change, mass dependent */
    VelocityChange: 2,

    /** Apply as mass dependent force */
    Acceleration: 3
},

/**
 * Collision callback event type
 * @enum {number}
 */
CollisionEventType: {
    /** Touch/contact detected, collision */
    Touch: 0,

    /** Touch/contact lost, uncollide */
    TouchLost: 1,
},

/**
 * Rigid body {@link WL.PhysXComponent#shape|shape}.
 * @enum {number}
 *
 * [PhysX SDK Guide](https://gameworksdocs.nvidia.com/PhysX/4.1/documentation/physxguide/Manual/Geometry.html#geometry-types)
 */
Shape: {
    /** No shape */
    None: 0,

    /** Sphere shape */
    Sphere: 1,

    /** Capsule shape */
    Capsule: 2,

    /** Box shape */
    Box: 3,

    /** Plane shape */
    Plane: 4,

    /** Convex mesh shape */
    ConvexMesh: 5,

    /** Triangle mesh shape */
    TriangleMesh: 6,
},

/**
 * Canvas element that Wonderland Engine renders to
 * @type {HTMLCanvasElement}
 */
canvas: null,
/**
 * Current WebXR session or {@link null} if no session active
 * @type {XRSession}
 */
xrSession: null,
/**
 * @callback xrSessionStartCallback
 * @param {XRSession} session WebXR session that started
 */
/**
 * @callback xrSessionEndCallback
 */
/**
 * List of functions to call if a WebXR session is started
 * @type {xrSessionStartCallback}
 */
onXRSessionStart: [],
/**
 * List of functions to call if a WebXR session ends
 * @type {xrSessionEndCallback}
 */
onXRSessionEnd: [],

/**
 * @callback xrSupportCallback
 * @param {string} type Type of session which is supported/not supported. Either `"vr"` or `"ar"`
 * @param {boolean} supported Whether given session type is supported
 */
/**
 * List of functions to call once VR/AR support has been determined.
 * @type {xrSupportCallback}
 *
 * Will be called once for AR and once for VR independent of support for each.
 * This allows you to notify the user of both cases: support and missing support of XR.
 * See the `supported` parameter of the callback, which indicates support.
 */
onXRSupported: [],

/**
 * @callback sceneLoadedCallback
 */
/**
 * List of functions to call once the main scene has been loaded
 * @type {sceneLoadedCallback}
 */
onSceneLoaded: [],

/**
 * Whether AR is supported by the browser
 *
 * `undefined` until support could be determined
 */
arSupported: undefined,
/**
 * Whether VR is supported by the browser
 *
 * `undefined` until support could be determined
 */
vrSupported: undefined,
/**
 * Current main scene
 * @type{WL.Scene}
 */
scene: undefined,
/**
 * Physics, only available when physx is enabled in the runtime
 * @type{WL.Physics}
 */
physics: undefined,

_images: [],

_tempMem: null,
_tempMemFloat: null,
_tempMemInt: null,
_tempMemUint32: null,
};

/**
 * Provides global scene functionality like raycasting.
 */
WL.Scene = class Scene {
    constructor() {
        this._rayHit = _malloc(4*(3*4+3*4+4+2)+4);
        this._hit = new WL.RayHit(this._rayHit);

        /* Hidden property, list of functions to call after a
         * frame has been rendered */
        this.onPreRender = [];
        this.onPostRender = [];
    }

    /**
     * @returns {WL.ViewComponent[]} currently active view components
     */
    get activeViews() {
        const count = _wl_scene_get_active_views(WL._tempMem, 16);

        const views = [];
        const viewTypeIndex = WL.Object._typeIndexFor("view");
        for(let i = 0; i < count; ++i) {
            views.push(new WL.ViewComponent(viewTypeIndex, WL._tempMemInt[i]));
        }

        return views;
    }

    /**
     * Cast a ray through the scene and find intersecting objects.
     *
     * The resulting ray hit will contain up to **4** closest ray hits,
     * sorted by increasing distance.
     *
     * @param {number[]} o Ray origin
     * @param {number[]} d Ray direction
     * @param {number} group Collision group to filter by: only objects that are
     *        part of given group are considered for raycast.
     *
     * @note The returned {@link WL.RayHit} object is owned by the Scene instance and
     *       will be reused with the next {@link WL.Scene#rayCast} call.
     */
    rayCast(o, d, group) {
        _wl_scene_ray_cast(
            o[0], o[1], o[2],
            d[0], d[1], d[2],
            group, this._rayHit);
        return this._hit;
    }

    /**
     * Add object to the scene
     *
     * @param {WL.Object} parent Parent object or {@link null}
     * @returns {WL.Object} newly created object
     */
    addObject(parent) {
        const parentId = parent ? parent.objectId : 0;
        const objectId = _wl_scene_add_object(parentId);
        return new WL.Object(objectId);
    }

    /**
     * Batch-add objects to the scene
     *
     * Will provide better performance for adding multiple objects (e.g. > 16)
     * than calling {@link WL.Scene#addObject} repeatidly in a loop.
     *
     * By providing upfront information of how many objects will be required,
     * the engine is able to batch-allocate the required memory rather than
     * convervatively grow the memory in small steps.
     *
     * **Experimental:** This API might change in upcoming versions.
     *
     * @param {number} count Number of objects to add
     * @param {WL.Object} parent Parent object or {@link null}, default {@link null}
     * @param {number} componentCountHint Hint for how many components in total will
     *      be added to the created objects afterwards, default `0`.
     * @returns {WL.Object[]} newly created objects
     */
    addObjects(count, parent, componentCountHint) {
        const parentId = parent ? parent.objectId : 0;
        const objectIdsPtr = _wl_scene_add_objects(parentId, count, componentCountHint || 0);
        const objects = Array.from(new Uint16Array(HEAPU16.buffer, objectIdsPtr, count),
            id => new WL.Object(id));
        _free(objectIdsPtr);
        return objects;
    }

    /**
     * Load a scene file (.bin)
     *
     * Will replace the currently active scene with the one loaded from
     * given file. It is assumed that JavaScript components required by
     * the new scene were registered in advance.
     *
     * @param filename Path to the .bin file
     */
    load(filename) {
        const strLen = lengthBytesUTF8(filename) + 1;
        const ptr = _malloc(strLen);
        stringToUTF8(filename, ptr, strLen);
        _wl_load_scene(ptr);
        _free(ptr);
    }
};

/**
 * Native component
 *
 * Provides access to a native component instance of a specified component type
 */
WL.Component = class Component {
    constructor(managerIndex, id) {
        this._id = id;
        this._manager = managerIndex;
    }

    /**
     * @returns {string} the name of this component's type
     */
    get type() {
        return this._type || WL.Object._typeNameFor(this._manager);
    }

    /**
     * @returns {WL.Object} The object this component is attached to
     */
    get object() {
        const objectId = _wl_component_get_object(this._manager, this._id);
        return new WL.Object(objectId);
    }

    /**
     * Set whether this component is active
     *
     * Activating/deactivating a component comes at a small cost of reordering
     * components in the respective component manager. This function therefore
     * is not a trivial assignment.
     *
     * Does nothing if the component is already activated/deactivated.
     *
     * @param {boolean} active New active state
     */
    set active(active) {
        _wl_component_setActive(this._manager, this._id, active);
    }

    /**
     * @returns {boolean} Whether this component is active
     */
    get active() {
        return _wl_component_isActive(this._manager, this._id) != 0;
    }

    /**
     * Checks equality by comparing whether the wrapped native component ids
     * and component manager types are equal.
     *
     * @param {?WL.Component} otherComponent Component to check equality with
     * @returns {boolean} Whether this component equals the given component
     */
    equals(otherComponent) {
        if(!otherComponent) return false;
        return this._manager == otherComponent._manager && this._id == otherComponent._id;
    }
};

/**
 * Native collision component
 *
 * Provides access to a native collision component instance
 */
WL.CollisionComponent = class CollisionComponent extends WL.Component {

    /**
     * @returns {WL.Collider} Collision component collider
     */
    get collider() {
        return _wl_collision_component_get_collider(this._id);
    }

    /**
     * Set collision component collider
     *
     * @param {WL.Collider} collider Collider of the collision component.
     */
    set collider(collider) {
        _wl_collision_component_set_collider(this._id, collider);
    }

    /**
     * If {@link WL.CollisionComponent#collider} returns {@link WL.Collider.Sphere}, only the first
     * component of the returned vector is used.
     *
     * @returns {number[]} Collision component extents
    */
    get extents() {
        return new Float32Array(HEAPF32.buffer, _wl_collision_component_get_extents(this._id), 3);
    }

    /**
     * Set collision component extents
     *
     * If {@link WL.CollisionComponent#collider} returns {@link WL.Collider.Sphere}, only the first
     * component of the passed vector is used.
     *
     * @param {number[]} extents Extents of the collision component, expects a
     *      3 component array.
     */
    set extents(extents) {
        this.extents.set(extents);
    }

    /**
     * The groups is a bitmask that is compared to other components in {@link WL.CollisionComponent#queryOverlaps}
     * or the group in {@link WL.Scene#rayCast}.
     *
     * Colliders that have no common groups will not overlap with each other. If a collider
     * has none of the groups set for {@link WL.Scene#rayCast}, the ray will not hit it.
     *
     * Each bit represents belonging to a group, see example.
     *
     * @example
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
     *
     * @returns {number} collision component group
     */
    get group() {
        return _wl_collision_component_get_group(this._id);
    }

    /**
     * Set collision component group
     *
     * @param {number} group Group mask of the collision component
     */
    set group(group) {
        _wl_collision_component_set_group(this._id, group);
    }

    /**
     * Query overlapping objects
     *
     * @returns {WL.CollisionComponent[]} Collision components overlapping this collider.
     */
    queryOverlaps() {
        const count = _wl_collision_component_query_overlaps(this._id, WL._tempMem, WL._tempMemSize >> 1);
        let overlaps = new Array(count);
        for(let i = 0; i < count; ++i) {
            overlaps[i] = new WL.CollisionComponent(this._manager, WL._tempMemUint16[i]);
        }
        return overlaps;
    }
};

/**
 * Native text component
 *
 * Provides access to a native text component instance
 */
WL.TextComponent = class TextComponent extends WL.Component {

    /**
     * @returns {WL.Alignment} Text component alignment
     */
    get alignment() {
        return _wl_text_component_get_alignment(this._id) & 7;
    }

    /**
     * Set text component alignment
     *
     * @param {WL.Alignment} alignment Alignment for the text component.
     */
    set alignment(alignment) {
        _wl_text_component_set_alignment(this._id, this.justification << 3 | alignment);
    }

    /**
     * @returns {WL.Justification} Text component justification
     */
    get justification() {
        return _wl_text_component_get_alignment(this._id) >> 3;
    }

    /**
     * Set text component justification
     *
     * @param {WL.Justification} justification Justification for the text component.
     */
    set justification(justification) {
        _wl_text_component_set_alignment(this._id, justification << 3 | this.alignment);
    }

    /**
     * @returns {string} Text component text
     */
    get text() {
        return UTF8ToString(_wl_text_component_get_text(this._id));
    }

    /**
     * Set text component text
     *
     * @param {string} text Text of the text component
     */
    set text(text) {
        const strLen = lengthBytesUTF8(text) + 1;
        const ptr = _malloc(strLen);
        stringToUTF8(text, ptr, strLen);
        _wl_text_component_set_text(this._id, ptr);
        _free(ptr);
    }

    /**
     * Set material to render the text with
     *
     * @param {WL.Material} material New material
     */
    set material(material) {
        _wl_text_component_set_material(this._id, material._index);
    }

    /**
     * @returns {?WL.Material} Material used to render the text
     */
    get material() {
        return WL.Material.wrap(_wl_text_component_get_material(this._id));
    }

};

/**
 * Native view component
 *
 * Provides access to a native view component instance
 */
WL.ViewComponent = class ViewComponent extends WL.Component {

    /**
     * @returns {Float32Array} Projection matrix
     */
    get projectionMatrix() {
        return new Float32Array(HEAPF32.buffer,
            _wl_view_component_get_projection_matrix(this._id), 16);
    }
};

/**
 * Native input component
 *
 * Provides access to a native input component instance
 */
WL.InputComponent = class InputComponent extends WL.Component {

    /**
     * @returns {WL.InputType} Input component type
     */
    get inputType() {
        return _wl_input_component_get_type(this._id);
    }

    /**
     * Set input component type
     *
     * @params {WL.InputType} New input component type
     */
    set inputType(type) {
        _wl_input_component_set_type(this._id, type);
    }

    /**
     * @returns {?XRInputSource} WebXR Device API input source associated
     *          with this input component, if type {@link WL.InputType.ControllerLeft}
     *          or {@link WL.InputType.ControllerRight}.
     */
    get xrInputSource() {
        if(WL.xrSession) {
            for(let inputSource of WL.xrSession.inputSources) {
                if(inputSource.handedness == this.handedness) {
                    return inputSource;
                }
            }
        }

        return null;
    }

    /**
     * @returns {?string} 'left', 'right' or {@link null} depending on the {@link WL.InputComponent#inputType}.
     */
    get handedness() {
        const inputType = this.inputType;
        if(inputType == WL.InputType.ControllerRight || inputType == WL.InputType.RayRight || inputType == WL.InputType.EyeRight)
            return 'right';
        if(inputType == WL.InputType.ControllerLeft || inputType == WL.InputType.RayLeft || inputType == WL.InputType.EyeLeft)
            return 'left';

        return null;
    }
};

/**
 * Native light component
 *
 * Provides access to a native light component instance
 */
WL.LightComponent = class LightComponent extends WL.Component {

    /** @returns {Float32Array} View on the light color */
    get color() {
        return new Float32Array(HEAPF32.buffer, _wl_light_component_get_color(this._id), 4);
    }

    /** @returns {WL.LightType} Light type */
    get lightType() {
        return _wl_light_component_get_type(this._id);
    }

    /**
     * Set light type
     *
     * @param {WL.LightType} lightType Type of the light component.
     */
    set lightType(t) {
        return _wl_light_component_set_type(this._id, t);
    }
};

/**
 * Native animation component
 *
 * Provides access to a native animation component instance
 */
WL.AnimationComponent = class AnimationComponent extends WL.Component {

    /**
     * Set animation to play
     *
     * Make sure to {@link WL.Animation#retarget} the animation to affect the
     * right objects.
     *
     * @param {WL.Animation} animation to play
     */
    set animation(anim) {
        _wl_animation_component_set_animation(this._id, anim._index);
    }

    /** @returns {WL.Animation} animation set for this component */
    get animation() {
        return new WL.Animation(_wl_animation_component_get_animation(this._id));
    }

    /**
     * Set play count. Set to `0` to loop indefinitely.
     *
     * @param {number} playCount Number of times to repeat the animation
     */
    set playCount(playCount) {
        _wl_animation_component_set_playCount(this._id, playCount);
    }

    /** @returns {number} Number of times the animation is played */
    get playCount() {
        return _wl_animation_component_get_playCount(this._id);
    }

    /** Play animation */
    play() {
        _wl_animation_component_play(this._id);
    }

    /** Stop animation */
    stop() {
        _wl_animation_component_stop(this._id);
    }

    /** Pause animation */
    pause() {
        _wl_animation_component_pause(this._id);
    }

    /** @returns {WL.AnimationState} Current playing state of the animation */
    get state() {
        return _wl_animation_component_state(this._id);
    }

};

/**
 * Native mesh component
 *
 * Provides access to a native mesh component instance
 */
WL.MeshComponent = class MeshComponent extends WL.Component {
    /**
     * Set material to render the mesh with
     *
     * @param {?WL.Material} material Material to render the mesh with
     */
    set material(material) {
        _wl_mesh_component_set_material(this._id, material._index);
    }

    /** @returns {?WL.Material} Material used to render the mesh */
    get material() {
        return WL.Material.wrap(_wl_mesh_component_get_material(this._id));
    }

    /** @returns {?WL.Mesh} Mesh rendered by this component */
    get mesh() {
        return new WL.Mesh(_wl_mesh_component_get_mesh(this._id));
    }

    /**
     * Set mesh to rendered with this component
     *
     * @param {?WL.Mesh} mesh Mesh rendered by this component
     */
    set mesh(mesh) {
        _wl_mesh_component_set_mesh(this._id, mesh._index);
    }

    /** @returns {?WL.Skin} Skin for this mesh component */
    get skin() {
        return new WL.Skin(_wl_mesh_component_get_skin(this._id));
    }

    /**
     * Set skin to transform this mesh component
     *
     * @param {?WL.Skin} skin Skin to use for rendering skinned meshes
     */
    set skin(skin) {
        _wl_mesh_component_set_skin(this._id, skin._index);
    }
};

/**
 * Native physx rigid body component
 *
 * Provides access to a native mesh component instance.
 * Only available when using physx enabled runtime, see "Project Settings > Runtime".
 */
WL.PhysXComponent = class PhysXComponent extends WL.Component {
    /**
     * Set whether this rigid body is static
     *
     * Setting this property only takes effect once the component
     * switches from inactive to active.
     *
     * @param {boolean} b Whether the rigid body should be static
     */
    set static(b) {
        _wl_physx_component_set_static(this._id, b);
    }

    /**
     * Whether this rigid body is static
     *
     * This property returns whether the rigid body is *effectively*
     * static. If static property was set while the rigid body was
     * active, it will not take effect until the rigid body is set
     * inactive and active again. Until the component is set inactive,
     * this getter will return whether the rigidbody is actually
     * static.
     */
    get static() {
        return !!_wl_physx_component_get_static(this._id);
    }

    /**
     * Set whether this rigid body is kinematic
     *
     * @param {boolean} b Whether the rigid body should be kinematic
     */
    set kinematic(b) {
        _wl_physx_component_set_kinematic(this._id, b);
    }

    /**
     * Whether this rigid body is kinematic
     */
    get kinematic() {
        return !!_wl_physx_component_get_kinematic(this._id);
    }

    /**
     * Set the shape for collision detection
     *
     * @param {WL.Shape} s New shape
     */
    set shape(s) {
        _wl_physx_component_set_shape(this._id, s);
    }

    /**
     * The shape for collision detection
     */
    get shape() {
        return _wl_physx_component_get_shape(this._id);
    }

    /**
     * Set the shape extents for collision detection
     *
     * @param {number[]} e New extents for the shape
     */
    set extents(e) {
        this.extents.set(e);
    }

    /**
     * The shape extents for collision detection
     */
    get extents() {
        const ptr = _wl_physx_component_get_extents(this._id);
        return new Float32Array(HEAPF32.buffer, ptr, 3);
    }

    /**
     * Get staticFriction
     */
    get staticFriction() {
        return _wl_physx_component_get_staticFriction(this._id);
    }

    /**
     * Set staticFriction
     * @param {number} v New staticFriction
     */
    set staticFriction(v) {
        _wl_physx_component_set_staticFriction(this._id, v);
    }

    /**
     * Get dynamicFriction
     */
    get dynamicFriction() {
        return _wl_physx_component_get_dynamicFriction(this._id);
    }

    /**
     * Set dynamicFriction
     * @param {number} v New dynamicDamping
     */
    set dynamicFriction(v) {
        _wl_physx_component_set_dynamicFriction(this._id, v);
    }

    /**
     * Get restitution
     */
    get restitution() {
        return _wl_physx_component_get_restitution(this._id);
    }

    /**
     * Set restitution
     * @param {number} v New restitution
     */
    set restitution(v) {
        _wl_physx_component_set_restitution(this._id, v);
    }

    /**
     * Get linearDamping
     */
    get linearDamping() {
        return _wl_physx_component_get_linearDamping(this._id);
    }

    /**
     * Set linearDamping
     * @param {number} v New linearDamping
     */
    set linearDamping(v) {
        _wl_physx_component_set_linearDamping(this._id, v);
    }

    /**
     * Get angularDamping
     */
    get angularDamping() {
        return _wl_physx_component_get_angularDamping(this._id);
    }

    /**
     * Set angularDamping
     * @param {number} v New angularDamping
     */
    set angularDamping(v) {
        _wl_physx_component_set_angularDamping(this._id, v);
    }

    /**
     * Set linear velocity
     *
     * [PhysX Manual - "Velocity"](https://gameworksdocs.nvidia.com/PhysX/4.1/documentation/physxguide/Manual/RigidBodyDynamics.html#velocity)
     *
     * @param {number[]} v New linear velocity
     */
    set linearVelocity(v) {
        _wl_physx_component_set_linearVelocity(this._id, v[0], v[1], v[2]);
    }

    /** @returns {Float32Array} Linear velocity */
    get linearVelocity() {
        _wl_physx_component_get_linearVelocity(this._id, WL._tempMem);
        return new Float32Array(HEAPF32.buffer, WL._tempMem, 3);
    }

    /**
     * Set angular velocity
     *
     * [PhysX Manual - "Velocity"](https://gameworksdocs.nvidia.com/PhysX/4.1/documentation/physxguide/Manual/RigidBodyDynamics.html#velocity)
     *
     * @param {number[]} v New angular velocity
     */
    set angularVelocity(v) {
        _wl_physx_component_set_angularVelocity(this._id, v[0], v[1], v[2]);
    }

    /** @returns {Float32Array} Linear velocity */
    get angularVelocity() {
        _wl_physx_component_get_angularVelocity(this._id, WL._tempMem);
        return new Float32Array(HEAPF32.buffer, WL._tempMem, 3);
    }

    /**
     * Set mass
     *
     * [PhysX Manual - "Mass Properties"](https://gameworksdocs.nvidia.com/PhysX/4.1/documentation/physxguide/Manual/RigidBodyDynamics.html#mass-properties)
     *
     * @param {number} m New mass
     */
    set mass(m) {
        _wl_physx_component_set_mass(this._id, m);
    }

    /** @returns {number} mass */
    get mass() {
        return _wl_physx_component_get_mass(this._id);
    }

    /**
     * Set mass space interia tensor
     *
     * [PhysX Manual - "Mass Properties"](https://gameworksdocs.nvidia.com/PhysX/4.1/documentation/physxguide/Manual/RigidBodyDynamics.html#mass-properties)
     *
     * @param {number[]} v New mass space interatia tensor
     */
    set massSpaceInteriaTensor(v) {
        _wl_physx_component_set_massSpaceInertiaTensor(this._id, v[0], v[1], v[2]);
    }

    /**
     * Apply a force
     *
     * [PhysX Manual - "Applying Forces and Torques"](https://gameworksdocs.nvidia.com/PhysX/4.1/documentation/physxguide/Manual/RigidBodyDynamics.html#applying-forces-and-torques)
     *
     * @param {number[]} f Force vector
     * @param {number[]} m Force mode, see {@link WL.ForceMode}, default `Force`.
     * @param {number[]} localForce Whether the force vector is in local space, default `false`.
     * @param {number[]} p Position to apply force at, default is center of mass.
     * @param {number[]} local Whether position is in local space, default `false`.
     */
    addForce(f, m, localForce, p, local) {
        m = m || WL.ForceMode.Force;
        if(!p) {
            _wl_physx_component_addForce(this._id, f[0], f[1], f[2], m, !!localForce);
        } else {
            _wl_physx_component_addForceAt(this._id, f[0], f[1], f[2], m, !!localForce, p[0], p[1], p[2], !!local);
        }
    }

    /**
     * Apply torque
     *
     * [PhysX Manual - "Applying Forces and Torques"](https://gameworksdocs.nvidia.com/PhysX/4.1/documentation/physxguide/Manual/RigidBodyDynamics.html#applying-forces-and-torques)
     *
     * @param {number[]} f Force vector
     * @param {number[]} m Force mode, see {@link WL.ForceMode}, default `Force`.
     */
    addTorque(f, m) {
        m = m || WL.ForceMode.Force;
        _wl_physx_component_addTorque(this._id, f[0], f[1], f[2], m);
    }

    /**
     * @callback collisionCallback
     * @param {WL.CollisionEventType} type Type of the event
     * @param {WL.PhysXComponent} other Other component that was (un)collided with
     */
    /**
     * Add on collision callback
     *
     * @param {collisionCallback} callback Function to call when this rigid body
     *        (un)collides with any other.
     *
     * @example
     *  let rigidBody = this.object.getComponent('physx');
     *  rigidBody.onCollision(function(type, other) {
     *      // Ignore uncollides
     *      if(type == WL.CollisionEventType.TouchLost) return;
     *
     *      // Take damage on collision with enemies
     *      if(other.object.name.startsWith('enemy-')) {
     *          this.applyDamage(10);
     *      }
     *  }.bind(this));
     */
    onCollision(callback) {
        this.onCollisionWith(this, callback);
    }

    /**
     * Add filtered on collision callback
     *
     * @param {WL.PhysXComponent} otherComp Component for which callbacks will
     *        be triggered. If you pass this component, the method is equivalent to
     *        {@link WL.PhysXComponent#onCollision}.
     * @param {collisionCallback} callback Function to call when this rigid body
     *        (un)collides with `otherComp`.
     */
    onCollisionWith(otherComp, callback) {
        WL.physics._callbacks[this._id] = WL.physics._callbacks[this._id] || [];
        WL.physics._callbacks[this._id].push(callback);
        _wl_physx_component_addCallback(this._id, otherComp._id || this._id);
    }
};

/**
 * Access to the physics scene
 */
WL.Physics = class Physics {
    constructor() {
        this._rayHit = _malloc(4*(3*4+3*4+4+2)+4);
        this._hit = new WL.RayHit(this._rayHit);
        this._callbacks = {};
    }

    /**
     * Cast a ray through the physics scene and find intersecting objects.
     *
     * The resulting ray hit will contain **up to 4** closest ray hits,
     * sorted by increasing distance.
     *
     * @param {number[]} o Ray origin
     * @param {number[]} d Ray direction
     * @param {number} group Collision group to filter by: only objects that are
     *        part of given group are considered for raycast.
     * @param {number} maxDistance Maxium ray distance, default `100.0`.
     *
     * @note The returned {@link WL.RayHit} object is owned by the Physics instance and
     *       will be reused with the next {@link WL.Physics#rayCast} call.
     */
    rayCast(o, d, group, maxDistance) {
        if(typeof maxDistance === 'undefined') maxDistance = 100.0;
        _wl_physx_ray_cast(
            o[0], o[1], o[2],
            d[0], d[1], d[2],
            group, maxDistance||100, this._rayHit);
        return this._hit;
    }

    _callCollisionCallback(a, index, type, b) {
        WL.physics._callbacks[a][index](type,
            new WL.PhysXComponent(WL.Object._typeIndexFor('physx'), b));
    }
};

/**
 * Wrapper around a native mesh data
 */
WL.Mesh = class Mesh {
    /** Size of a vertex in float elements */
    static get VERTEX_FLOAT_SIZE() { return 3 + 3 + 2; }
    /** Size of a vertex in bytes */
    static get VERTEX_SIZE() { return this.VERTEX_FLOAT_SIZE*4; }

    /** Position attribute offsets in float elements */
    static get POS() { return { X: 0, Y: 1, Z: 2 }; }
    /** Texture coordinate attribute offsets in float elements */
    static get TEXCOORD() { return { U: 3, V: 4 }; }
    /** Normal attribute offsets in float elements */
    static get NORMAL() { return { X: 5, Y: 6, Z: 7 }; }

    /**
     * Constructor
     *
     * @param params Either index to wrap or set of parameters to create a new mesh
     * @param {number[]} params.indexData Index data values
     * @param {WL.MeshIndexType} params.indexType Index type
     * @param {number[]} params.vertexData Interleaved vertex data values. A vertex is a set of 8 float values:
     *          - 0-3 Position
     *          - 4-7 Normal
     *          - 7-8 Texture Coordinate
     */
    constructor(params) {
        if(typeof(params) === 'object') {
            params.indexType = params.indexType || WL.MeshIndexType.UnsignedShort;
            let indexData = _malloc(params.indexData.length*params.indexType);
            let vertexData = _malloc(params.vertexData.length*4 /* sizeof(float) */);

            switch(params.indexType) {
                case WL.MeshIndexType.UnsignedByte:
                    HEAPU8.set(params.indexData, indexData);
                    break;
                case WL.MeshIndexType.UnsignedShort:
                    HEAPU16.set(params.indexData, indexData >> 1);
                    break;
                case WL.MeshIndexType.UnsignedInt:
                    HEAPU32.set(params.indexData, indexData >> 2);
                    break;
            }
            HEAPF32.set(params.vertexData, vertexData >> 2);
            this._index = _wl_mesh_create(indexData,
                params.indexData.length*params.indexType,
                params.indexType,
                vertexData,
                params.vertexData.length*4 /* sizeof(float) */);

        } else {
            this._index = params;
        }
    }

    /** @returns {Float32Array} Vertex data */
    get vertexData() {
        let ptr = _wl_mesh_get_vertexData(this._index, WL._tempMem);
        return new Float32Array(HEAPF32.buffer, ptr, HEAPU32[WL._tempMem/4]);
    }

    /** @returns {Uint8Array|Uint16Array|Uint32Array} Vertex data */
    get indexData() {
        let ptr = _wl_mesh_get_indexData(this._index, WL._tempMem, WL._tempMem + 4);
        const indexCount = HEAPU32[WL._tempMem/4];
        const indexSize = HEAPU32[WL._tempMem/4 + 1];
        switch(indexSize) {
            case WL.UnsignedByte:
                return new Uint8Array(HEAPU8.buffer, ptr, indexCount);
            case WL.UnsignedShort:
                return new Uint16Array(HEAPU16.buffer, ptr, indexCount);
            case WL.UnsignedInt:
                return new Uint32Array(HEAPU32.buffer, ptr, indexCount);
        }
    }
};

/**
 * Mesh index type
 * @enum {number}
 */
WL.MeshIndexType = {
    /** Single byte mesh index, range 0-255 */
    UnsignedByte: 1,

    /** Two byte mesh index, range 0-65535 */
    UnsignedShort: 2,

    /** Four byte mesh index, range 0-4294967295 */
    UnsignedInt: 4,
};

/**
 * Wrapper around a native material
 */
WL.Material = class Material {
    /**
     * Create a new WL.Material. Used internally by {@link WL.Material.wrap}.
     *
     * @note Do not use this constructor directly, rather use
     *     {@link WL.Material#clone} or {@link WL.Material.wrap} to create instances.
     */
    constructor(index) {
        this._index = index;
    }

    /**
     * @returns {string} Name of the shader used by this material
     */
    get shader() {
        return UTF8ToString(_wl_material_get_shader(this._index));
    }

    /**
     * Create a copy of the underlying native material and {@link WL.Material.wrap} the result
     * @returns {WL.Material} Material clone
     */
    clone() {
        return WL.Material.wrap(_wl_material_clone(this._index));
    }

    _paramIndex(name) {
        const lengthBytes = lengthBytesUTF8(name) + 1;
        const mem = _malloc(lengthBytes);
        stringToUTF8(name, mem, lengthBytes);
        const index = _wl_material_get_param_index(this._index, mem);
        _free(mem);
        return index;
    }

    _paramType(paramIndex) {
        const t = _wl_material_get_param_type(this._index, paramIndex);
        return {type: (t & 0xFF), componentCount: ((t >> 8) & 0xFF), metaType: ((t >> 16) & 0xFF)};
    }

    /**
     * Wrap a native material index
     * @param {number} index
     * @returns {WL.Material} Material instance or {@link null} if index <= 0.
     */
    static wrap(index) {
        if(index <= 0) return null;

        const material = new WL.Material(index);
        return new Proxy(material, {
            get(target, prop) {
                const paramIndex = target._paramIndex(prop);
                if (paramIndex != -1) {
                    const paramType = target._paramType(paramIndex);
                    if(_wl_material_get_param_value(target._index, paramIndex, WL._tempMem)) {
                        if(paramType.type == 0) {
                            return paramType.componentCount == 1 ? WL._tempMemUint32[0] : new Uint32Array(HEAPF32.buffer, WL._tempMem, paramType.componentCount);
                        }
                        if(paramType.type == 1) {
                            return paramType.componentCount == 1 ? WL._tempMemInt[0] : new Int32Array(HEAPF32.buffer, WL._tempMem, paramType.componentCount);
                        }
                        if(paramType.type == 2) {
                            return paramType.componentCount == 1 ? WL._tempMemFloat[0] : new Float32Array(HEAPF32.buffer, WL._tempMem, paramType.componentCount);
                        }
                        if(paramType.type == 3) {
                            return new WL.Texture(WL._tempMemInt[0]);
                        }
                    }
                    throw new Error(`Invalid type ${paramType} on parameter ${paramIndex} for material ${target._index}`);
                } else {
                    return target[prop];
                }
            },

            set(target, prop, value) {
                const paramIndex = target._paramIndex(prop);
                if(paramIndex >= 0) {
                    if(value instanceof WL.Texture) {
                        _wl_material_set_param_value_uint(
                            target._index, paramIndex, value._id);
                    } else if(typeof(value) === 'number') {
                        WL._tempMemFloat[0] = value;
                        _wl_material_set_param_value_float(
                            target._index, paramIndex, WL._tempMem, 1);
                    } else {
                        let length = value.length;
                        for(let i = 0; i < length; ++i) {
                            WL._tempMemFloat[i] = value[i];
                        }
                        _wl_material_set_param_value_float(
                            target._index, paramIndex, WL._tempMem, length);
                    }
                } else {
                    target[prop] = value;
                }
                return true;
            }
        });
    }
};

/**
 * Wrapper around a native texture data
 */
WL.Texture = class Texture {
    constructor(param) {
        if(param instanceof HTMLImageElement || param instanceof HTMLVideoElement || param instanceof HTMLCanvasElement) {
            const index = WL._images.length;
            WL._images.push(param);
            this._imageIndex = index;
            this._id = _wl_renderer_addImage(index);
        } else {
            this._id = param;
        }
        WL.textures[this._id] = this;
    }

    /** @returns {boolean} Whether this texture is valid */
    get valid() {
        return this._id >= 0;
    }

    update() {
        if(!this.valid) return;
        _wl_renderer_updateTexture(this._id, this._imageIndex);
    }
};

/**
 * Access to the texures managed by Wonderland Engine
 */
WL.textures = {

    /**
     * Load an image from URL as {@link WL.Texture}
     * @param {string} filename URL to load from
     * @param {string} crossOrigin Cross origin flag for the {@link Image} object
     * @returns {Promise<WL.Texture>} Loaded texture
     */
    load: function(filename, crossOrigin) {
        let image = new Image();
        if(crossOrigin !== undefined) {
            image.crossOrigin = crossOrigin;
        }
        image.src = filename;
        return new Promise((resolve, reject) => {
            image.onload = function() {
                let texture = new WL.Texture(image);
                if(!texture.valid) {
                    reject("Failed to add image " + image.src + " to texture atlas. Probably incompatible format.");
                }
                resolve(texture);
            };
        });
    }
};

/**
 * Wrapper around a native animation
 */
WL.Animation = class Animation {
    constructor(index) {
        this._index = index;
    }

    /** @returns {number} Duration of this animation */
    get duration() {
        return _wl_animation_get_duration(this._index);
    }

    /** @returns {number} Number of tracks in this animation */
    get trackCount() {
        return _wl_animation_get_trackCount(this._index);
    }

    /**
     * Clone this animation retargeted to a new set of objects.
     *
     * The clone shares most of the data with the original and is therefore
     * light-weight.
     *
     * **Experimental:** This API might change in upcoming versions.
     *
     * If retargetting to {@link WL.Skin}, the join names will be used to determine a mapping
     * from the previous skin to the new skin. The source skin will be retrieved from
     * the first track in the animation that targets a joint.
     *
     * @param {WL.Object[]|WL.Skin} newTargets New targets per track. Expected to have
     *      {@link WL.Animation#trackCount} elements or to be a {@link WL.Skin}.
     * @returns {WL.Animation} The retargeted clone of this animation.
     */
    retarget(newTargets) {
        if(newTargets instanceof WL.Skin) {
            const animId = _wl_animation_retargetToSkin(this._index, newTargets._index);
            return new WL.Animation(animId);
        }

        if(newTargets.length != this.trackCount) {
            throw Error("Expected " + this.trackCount.toString() + " targets, but got " + newTargets.length.toString());
        }
        const ptr = _malloc(2*newTargets.length);
        for(let i = 0; i < newTargets.length; ++i) {
            HEAPU16[ptr >> 1 + i] = newTargets[i].objectId;
        }
        const animId = _wl_animation_retarget(this._index, ptr);
        _free(ptr);

        return new WL.Animation(animId);
    }
};

/**
 * Scene graph object
 *
 * Node in the scene graph or "entity". Consists of transformation and a reference
 * to its parent object. Usually holds components and is accessible by components
 * through {@link WL.Component#object}.
 *
 * Objects are stored in a data oriented mannor inside WebAssembly memory. This class
 * is a JavaScript API wrapper around this memory for more conventient use in
 * components.
 *
 * Objects can be created and added to a scene through
 * {@link WL.Scene#addObject} on the {@link WL.scene|main scene}.
 */
WL.Object = class Object {
    /**
     * @param {number} o Object id to wrap
     */
    constructor(o) {
        this.objectId = o;
    }

    /**
     * Useful for identifying objects during debugging.
     * @returns {string} Name of the object
     */
    get name() {
        return UTF8ToString(_wl_object_name(this.objectId));
    }

    /**
     * Set the object's name
     * @param {string} newName String to the the object's name to
     */
    set name(newName) {
        const lengthBytes = lengthBytesUTF8(newName) + 1;
        const mem = _malloc(lengthBytes);
        stringToUTF8(newName, mem, lengthBytes);
        _wl_object_set_name(this.objectId, mem);
        _free(mem);
    }

    /**
     * @returns {WL.Object} Parent of this object or {@link null} if parented to root
     */
    get parent() {
        const p = _wl_object_parent(this.objectId);
        return p == 0 ? null : new WL.Object(p);
    }

    /**
     * @returns {WL.Object[]} Children of this object
     *
     * @warning This method will currently return at most 512 child object.
     */
    get children() {
        const childrenCount = _wl_object_get_children(this.objectId, WL._tempMem, WL._tempMemSize >> 1);
        if(childrenCount == 0) return [];

        const children = new Array(childrenCount);
        for(let i = 0; i < childrenCount; ++i) {
            children[i] = new WL.Object(WL._tempMemUint16[i]);
        }
        return children;
    }

    /**
     * Reparent object to given object.
     * @param {WL.Object} New parent or {@link null} to parent to root
     * @note Reparenting is not trivial and might have a noticable performance impact
     */
    set parent(newParent) {
        _wl_object_set_parent(this.objectId, newParent == null ? 0 : newParent.objectId);
    }

    /** Reset local transformation (translation, rotation and scaling) to identity */
    resetTransform() {
        _wl_object_reset_translation_rotation(this.objectId);
        _wl_object_reset_scaling(this.objectId);
    }

    /** Reset local translation and rotation to identity */
    resetTranslationRotation() {
        _wl_object_reset_translation_rotation(this.objectId);
    }

    /**
     * Reset local rotation, keep translation.
     * @note To reset both rotation and translation, prefer
     *       {@link WL.Object#resetTranslationRotation}.
     */
    resetRotation() {
        _wl_object_reset_rotation(this.objectId);
    }

    /**
     * Reset local translation, keep rotation.
     * @note To reset both rotation and translation, prefer
     *       {@link WL.Object#resetTranslationRotation}.
     */
    resetTranslation() {
        _wl_object_reset_translation(this.objectId);
    }

    /** Reset local scaling to identity (``[1.0, 1.0, 1.0]``)*/
    resetScaling() {
        _wl_object_reset_scaling(this.objectId);
    }

    /**
     * Translate object by a vector in the parent's space
     * @param {number[]} v Vector to translate by
     */
    translate(v) {
        _wl_object_translate(this.objectId, v[0], v[1], v[2]);
    }

    /**
     * Translate object by a vector in object space
     * @param {number[]} v Vector to translate by
     */
    translateObject(v) {
        _wl_object_translate_obj(this.objectId, v[0], v[1], v[2]);
    }

    /**
     * Translate object by a vector in world space
     * @param {number[]} v Vector to translate by
     */
    translateWorld(v) {
        _wl_object_translate_world(this.objectId, v[0], v[1], v[2]);
    }

    /**
     * Rotate around given axis by given angle (degrees) in local space
     * @param {number[]} a Vector representing the rotation axis
     * @param {number} d Angle in degrees
     *
     * @note If the object is translated the rotation will be around
     *     the parent. To rotate around the object origin, use
     *     {@link WL.Object#rotateAxisAngleDegObject}
     *
     * @see {@link WL.Object#rotateAxisAngleRad}
     */
    rotateAxisAngleDeg(a, d) {
        _wl_object_rotate_axis_angle(this.objectId, a[0], a[1], a[2], d);
    }

    /**
     * Rotate around given axis by given angle (radians) in local space
     * @param {number[]} a Vector representing the rotation axis
     * @param {number} d Angle in degrees
     *
     * @note If the object is translated the rotation will be around
     *     the parent. To rotate around the object origin, use
     *     {@link WL.Object#rotateAxisAngleDegObject}
     *
     * @see {@link WL.Object#rotateAxisAngleDeg}
     */
    rotateAxisAngleRad(a, d) {
        _wl_object_rotate_axis_angle_rad(this.objectId, a[0], a[1], a[2], d);
    }

    /**
     * Rotate around given axis by given angle (degrees) in object space
     * @param {number[]} a Vector representing the rotation axis
     * @param {number} d Angle in degrees
     *
     * Equivalent to prepending a rotation quaternion to the object's
     * local transformation.
     *
     * @see {@link WL.Object#rotateAxisAngleRadObject}
     */
    rotateAxisAngleDegObject(a, d) {
        _wl_object_rotate_axis_angle_obj(this.objectId, a[0], a[1], a[2], d);
    }

    /**
     * Rotate around given axis by given angle (radians) in object space
     * Equivalent to prepending a rotation quaternion to the object's
     * local transformation.
     *
     * @param {number[]} a Vector representing the rotation axis
     * @param {number} d Angle in degrees
     *
     * @see {@link WL.Object#rotateAxisAngleDegObject}
     */
    rotateAxisAngleRadObject(a, d) {
        _wl_object_rotate_axis_angle_rad_obj(this.objectId, a[0], a[1], a[2], d);
    }

    /**
     * Rotate by a quaternion
     * @param {number[]} q the Quaternion to rotate by
     */
    rotate(q) {
        _wl_object_rotate_quat(this.objectId, q[0], q[1], q[2], q[3]);
    }

    /**
     * Rotate by a quaternion in object space
     *
     * Equivalent to prepending a rotation quaternion to the object's
     * local transformation.
     *
     * @param {number[]} q the Quaternion to rotate by
     */
    rotateObject(q) {
        _wl_object_rotate_quat_obj(this.objectId, q[0], q[1], q[2], q[3]);
    }

    /**
     * Scale object by a vector in object space
     *
     * @param {number[]} v Vector to scale by
     */
    scale(v) {
        _wl_object_scale(this.objectId, v[0], v[1], v[2]);
    }


    /** @returns {Float32Array} Local / object space transformation */
    get transformLocal() {
        return new Float32Array(HEAPF32.buffer, _wl_object_trans_local(this.objectId), 8);
    }

    /**
     * Compute local / object space translation from transformation
     * @param {number[]} out Destination array/vector, expected to have at
     *                       least 3 elements.
     * @return {number[]} out
     */
    getTranslationLocal(out) {
        _wl_object_get_translation_local(this.objectId, WL._tempMem);
        out[0] = WL._tempMemFloat[0];
        out[1] = WL._tempMemFloat[1];
        out[2] = WL._tempMemFloat[2];
        return out;
    }

    /**
     * Compute local / object space translation from transformation
     *
     * May recompute transformations of the hierarchy of this object,
     * if they were been by JavaScript components this frame.
     *
     * @param {number[]} out Destination array/vector, expected to have at
     *                       least 3 elements.
     * @return {number[]} out
     */
    getTranslationWorld(out) {
        _wl_object_get_translation_world(this.objectId, WL._tempMem);
        out[0] = WL._tempMemFloat[0];
        out[1] = WL._tempMemFloat[1];
        out[2] = WL._tempMemFloat[2];
        return out;
    }

    /**
     * Set local / object space translation
     *
     * Concatenates a new translation dual quaternion onto the existing rotation.
     *
     * @param {number[]} v New local translation array/vector, expected to
     *                       have at least 3 elements.
     *
     */
    setTranslationLocal(v) {
        _wl_object_set_translation_local(this.objectId, v[0], v[1], v[2]);
    }

    /**
     * Set world space translation
     *
     * Applies the inverse parent transform with a new translation dual quaternion
     * which is concatenated onto the existing rotation.
     *
     * @param {number[]} v New world translation array/vector, expected to
     *                       have at least 3 elements.
     */
    setTranslationWorld(v) {
        _wl_object_set_translation_world(this.objectId, v[0], v[1], v[2]);
    }

    /**
     * May recompute transformations of the hierarchy of this object,
     * if they were been by JavaScript components this frame.
     *
     * @returns {Float32Array} Global / world space transformation
     */
    get transformWorld() {
        return new Float32Array(HEAPF32.buffer, _wl_object_trans_world(this.objectId), 8);
    }

    /** @returns {Float32Array} Local / object space scaling */
    get scalingLocal() {
        return new Float32Array(HEAPF32.buffer, _wl_object_scaling_local(this.objectId), 3);
    }

    /**
     * @returns {Float32Array} Global / world space scaling
     *
     * May recompute transformations of the hierarchy of this object,
     * if they were been by JavaScript components this frame.
     */
    get scalingWorld() {
        return new Float32Array(HEAPF32.buffer, _wl_object_scaling_world(this.objectId), 3);
    }

    /**
     * Compute the object's forward facing world space vector
     * @param {number[]} out Destination array/vector, expected to have at
     *                       least 3 elements.
     * @return {number[]} out
     */
    getForward(out) {
        _wl_object_get_forward(this.objectId, WL._tempMem);
        out[0] = WL._tempMemFloat[0];
        out[1] = WL._tempMemFloat[1];
        out[2] = WL._tempMemFloat[2];
        return out;
    }

    /**
     * Compute the object's up facing world space vector
     * @param {number[]} out Destination array/vector, expected to have at
     *                       least 3 elements.
     * @return {number[]} out
     */
    getUp(out) {
        _wl_object_get_up(this.objectId, WL._tempMem);
        out[0] = WL._tempMemFloat[0];
        out[1] = WL._tempMemFloat[1];
        out[2] = WL._tempMemFloat[2];
        return out;
    }

    /**
     * Compute the object's right facing world space vector
     * @param {number[]} out Destination array/vector, expected to have at
     *                       least 3 elements.
     * @return {number[]} out
     */
    getRight(out) {
        _wl_object_get_right(this.objectId, WL._tempMem);
        out[0] = WL._tempMemFloat[0];
        out[1] = WL._tempMemFloat[1];
        out[2] = WL._tempMemFloat[2];
        return out;
    }

    /**
     * Turn towards / look at target
     * @param {number[]} v Target vector to turn towards
     * @param {number[]} up Up vector of this object, default `[0, 1, 0]`
     */
    lookAt(v, up=[0, 1, 0]) {
        _wl_object_lookAt(this.objectId,
            v[0], v[1], v[2], up[0], up[1], up[2]);
    }

    /** Destroy the object and remove it from the scene */
    destroy() {
        _wl_scene_remove_object(this.objectId);
        this.objectId = null;
    }

    /**
     * @summary Mark transformation dirty
     *
     * Causes an eventual recalculation of {@link WL.Object#transformWorld}, either
     * on next {@link WL.Object#getTranslationWorld}, {@link WL.Object#transformWorld} or
     * {@link WL.Object#scalingWorld} or the beginning of next frame, whichever
     * happens first.
     */
    setDirty() {
        _wl_object_set_dirty(this.objectId);
    }

    /**
     * Get a component attached to this object
     * @param {string} type Type name
     * @param {number} index=0 Index for component of given type. This can be used to access specific
     *      components if the object has multiple components of the same type.
     * @returns {?(WL.Component|WL.CollisionComponent|WL.TextComponent|WL.ViewComponent|WL.MeshComponent|WL.InputComponent|WL.LightComponent|WL.AnimationComponent|WL.PhysXComponent)} The component or {@link null} if there is no such component on this object
     */
    getComponent(type, index) {
        const lengthBytes = lengthBytesUTF8(type) + 1;
        const mem = _malloc(lengthBytes);
        stringToUTF8(type, mem, lengthBytes);
        const componentType = _wl_get_component_manager_index(mem);

        if(componentType < 0) {
            /* Not a native component, try js: */
            const jsIndex = _wl_get_js_component_index(this.objectId, mem, index || 0);
            _free(mem);
            return jsIndex < 0 ? null : _WL._components[jsIndex];
        }
        _free(mem);

        const componentId = _wl_get_component_id(this.objectId, componentType, index || 0);
        return WL.Object._wrapComponent(type, componentType, componentId);
    }

    /**
     * @param {?string} type Type name, pass a falsey value (`undefined` or {@link null}) to retrieve all
     * @returns {WL.Component[]} All components of given type attached to this object
     *
     * @warning This method will currently return at most 341 components.
     */
    getComponents(type) {
        const componentType = type ? WL.Object._typeIndexFor(type) : null;

        const components = [];
        const componentsCount = Math.min(85,
            _wl_object_get_components(this.objectId, WL._tempMem, WL._tempMemSize >> 1));
        const offset = 2*componentsCount;
        _wl_object_get_component_types(this.objectId, WL._tempMem + offset, WL._tempMemSize - offset);

        const jsManagerIndex = WL.Object._typeIndexFor('js');
        for(let i = 0; i < componentsCount; ++i) {
            const t = WL._tempMemUint8[i + offset];
            const componentId = WL._tempMemUint16[i];
            /* Handle JS types separately */
            if(t == jsManagerIndex) {
                const comp = _WL._components[_wl_get_js_component_index_for_id(componentId)];
                if(componentType === null || comp.type == type) components.push(comp);
                continue;
            }

            if(componentType === null) {
                const managerName = WL.Object._typeNameFor(componentType);
                components.push(WL.Object._wrapComponent(
                    managerName, componentType, componentId));
            } else if(t == componentType) {
                /* Optimized manager name retrieval, already have type */
                components.push(WL.Object._wrapComponent(
                    type, componentType, componentId));
            }
        }
        return components;
    }

    /**
     * Add component of given type to the object
     *
     * @param {string} type Typename to create a component of. Can be native or
     *      custom JavaScript component type.
     * @param {object} [params] Parameters to initialize properties of the new component
     *
     * @note As this function is non-trivial, avoid using it in `update()` repeatidly, but rather
     *  store its result in `init()` or `start()`
     * @returns {?(WL.Component|WL.CollisionComponent|WL.TextComponent|WL.ViewComponent|WL.MeshComponent|WL.InputComponent|WL.LightComponent|WL.AnimationComponent|WL.PhysXComponent)} The component or {@link null} if the type was not found
     */
    addComponent(type, params) {
        const componentType = WL.Object._typeIndexFor(type);
        if(componentType < 0) {
            if(!(type in _WL._componentTypeIndices)) {
                throw new TypeError("Unknown component type '" + type + "'");
            }
            const componentId = _wl_object_add_js_component(this.objectId, _WL._componentTypeIndices[type]);
            const componentIndex = _wl_get_js_component_index_for_id(componentId);
            let component = _WL._components[componentIndex];
            if(params !== undefined) {
                for(key in params) {
                    /* active will be set later */
                    if(key == 'active') continue;
                    component[key] = params[key];
                }
            }
            _wljs_component_init(componentIndex);
            _wljs_component_start(componentIndex);

            /* If active was not explicitly set by the user already, we set it to true */
            if(!params || !('active' in params)) {
                component.active = true;
            }

            return component;
        }
        const componentId = _wl_object_add_component(this.objectId, componentType);

        const component = WL.Object._wrapComponent(type, componentType, componentId);
        if(params !== undefined) {
            for(key in params) {
                component[key] = params[key];
            }
        }
        component.active = true;
        return component;
    }

    /**
     * Checks equality by comparing whether the wrapped native component ids
     * and component manager types are equal.
     *
     * @param {?WL.Object} otherObject Object to check equality with
     * @returns {boolean} Whether this object equals the given object
     */
    equals(otherObject) {
        if(!otherObject) return false;
        return this.objectId == otherObject.objectId;
    }

    static _typeIndexFor(type) {
        const lengthBytes = lengthBytesUTF8(type) + 1;
        const mem = _malloc(lengthBytes);
        stringToUTF8(type, mem, lengthBytes);
        const componentType = _wl_get_component_manager_index(mem);
        _free(mem);

        return componentType;
    }

    static _typeNameFor(typeIndex) {
        return UTF8ToString(_wl_component_manager_name(typeIndex));
    }

    /*
     * @param {string} type component type name
     * @param {number} componentType Component manager index
     * @param {number} componentId Component id in the manager
     * @returns {(WL.CollisionComponent|WL.TextComponent|WL.ViewComponent|WL.MeshComponent|WL.InputComponent|WL.LightComponent|WL.AnimationComponent|WL.PhysXComponent)} JavaScript instance wrapping the native component
     */
    static _wrapComponent(type, componentType, componentId) {
        if(componentId < 0) return null;

        if(type == 'collision') {
            return new WL.CollisionComponent(componentType, componentId);
        } else if(type == 'text') {
            return new WL.TextComponent(componentType, componentId);
        } else if(type == 'view') {
            return new WL.ViewComponent(componentType, componentId);
        } else if(type == 'mesh') {
            return new WL.MeshComponent(componentType, componentId);
        } else if(type == 'input') {
            return new WL.InputComponent(componentType, componentId);
        } else if(type == 'light') {
            return new WL.LightComponent(componentType, componentId);
        } else if(type == 'animation') {
            return new WL.AnimationComponent(componentType, componentId);
        } else if(type == 'physx') {
            return new WL.PhysXComponent(componentType, componentId);
        } else {
            return new WL.Component(componentType, componentId);
        }
    }
};

/**
 * Wrapper around a native skin data
 */
WL.Skin = class Skin {
    constructor(index) {
        this._index = index;
    }

    /** @returns {number} amount of joints in this skin */
    get jointCount() {
        return _wl_skin_get_joint_count(this._index);
    }

    /** @returns {Uint16Array} joints object ids for this skin */
    get jointIds() {
        return new Uint16Array(HEAPU16.buffer,
            _wl_skin_joint_ids(this._index), this.jointCount);
    }

    /**
     * Dual quaternions in a flat array of size 8 times {@link WL.Skin#jointCount}
     *
     * @returns {Float32Array} Inverse bind transforms of the skin
     */
    get inverseBindTransforms() {
        return new Float32Array(HEAPF32.buffer,
            _wl_skin_inverse_bind_transforms(this._index),
            8*this.jointCount);
    }

    /**
     * Vectors in a flat array of size 3 times {@link WL.Skin#jointCount}
     *
     * @returns {Float32Array} Inverse bind scalings of the skin
     */
    get inverseBindScalings() {
        return new Float32Array(HEAPF32.buffer,
            _wl_skin_inverse_bind_scalings(this._index),
            3*this.jointCount);
    }
};

/**
 * @summary Ray hit
 *
 * Result of a {@link WL.Scene#rayCast|ray cast}
 *
 * @param {number} ptr Pointer to the ray hits memory
 * @note this class wraps internal engine data and should only be created
 * internally.
 */
WL.RayHit = class RayHit {
    constructor(ptr) {
        assert((this._ptr & 3) == 0, MISALIGNED_MSG);
        this._ptr = ptr;
    }

    /** @returns {Float32Array[]} array of ray hit locations */
    get locations() {
        let p = this._ptr;
        let l = [];
        for(let i = 0; i < this.hitCount; ++i) {
            l.push(new Float32Array(HEAPF32.buffer, p + 12*i, 3));
        }
        return l;
    }

    /** @returns {Float32Array[]} array of ray hit normals (only when using {@link WL.Physics#rayCast} */
    get normals() {
        let p = this._ptr + 48;
        let l = [];
        for(let i = 0; i < this.hitCount; ++i) {
            l.push(new Float32Array(HEAPF32.buffer, p + 12*i, 3));
        }
        return l;
    }

    /**
     * Prefer these to recalculating the distance from locations.
     *
     * @returns {number} Distances of array hits to ray origin
     */
    get distances() {
        let p = this._ptr + 48*2;
        return new Float32Array(HEAPF32.buffer, p, this.hitCount);
    }

    /** @returns {WL.Object[]} Hit objects */
    get objects() {
        let p = this._ptr + (48*2 + 16);
        let objIds = new Uint16Array(HEAPU16.buffer, p, this.hitCount);
        return [
            objIds[0] <= 0 ? null : new WL.Object(objIds[0]),
            objIds[1] <= 0 ? null : new WL.Object(objIds[1]),
            objIds[2] <= 0 ? null : new WL.Object(objIds[2]),
            objIds[3] <= 0 ? null : new WL.Object(objIds[3]),
        ];
    }

    /** @returns {number} Number of hits (max 4) */
    get hitCount() {
        return Math.min(HEAPU32[(this._ptr/4) + 30], 4);
    }
};
