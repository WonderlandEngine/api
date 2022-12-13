
const MISALIGNED_MSG = "Misaligned pointer: please report a bug";
/* Component class instances per type to avoid GC */
let ComponentCache = {};
/* Object class instances per type to avoid GC */
let ObjectCache = [];
/* Component properties to exclude when cloning, see addComponent() */
const EXCLUDED_COMPONENT_PROPERTIES = ['_id', '_manager', 'type', '_type', 'active'];

/**
 * Wonderland Engine API
 * @namespace WL
 */

/**
 * @typedef CustomParameter
 * @type {object}
 * @property {Type} type Parameter type
 * @property {*} [default] Default value, depending on type.
 * @property {string[]} values Values for {@link Type.Enum}
 */
/**
 * Register a custom JavaScript component type
 *
 * @param {string} name Name of the component
 * @param {object} params Dict of param names to {@link CustomParameter}
 * @param {Component} object Object containing functions for the component type
 *
 * @example
 * registerComponent('my-new-type', {
 *  myParam: {type: Type.Float, default: 42.0},
 * }, {
 *  init: function() {},
 *  start: function() {},
 *  update: function(dt) {},
 *  onActivate: function() {},
 *  onDeactivate: function() {},
 *  // Since 0.9.0:
 *  onDestroy: function() {},
 * });
 */
function registerComponent(name, params, object) {
    _WL.registerComponent(name, params, object);
};

/**
 * Component parameter type enum
 * @enum {number}
 */
const Type = {
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
     * specified for the parameter as well.
     *
     * @example
     *     camera: {type: Type.Enum, values: ['auto', 'back', 'front'], default: 'auto'},
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
};
export { Type };

/**
 * Collider type enum for {@link CollisionComponent}
 * @enum {number}
 */
const Collider = {
    /**
     * **Sphere Collider**:
     *
     * Simplest and most performant collision shape. If this type is set on a
     * {@link CollisionComponent}, only the first component of
     * {@link CollisionComponent#extents} will be used to determine the radius.
     */
    Sphere: 0,

    /**
     * **Axis Aligned Bounding Box Collider**:
     *
     * Box that is always aligned to XYZ axis. It cannot be rotated but is more
     * efficient than {@link Collider.Box}.
     */
    AxisAlignedBox: 1,

    /**
     * **Aligned Bounding Box Collider**:
     *
     * Box that matches the object's rotation and translation correctly. This
     * is the least efficient collider and should only be chosen over
     * {@link Collider.Sphere} and {@link Collider.AxisAlignedBox} if really
     * necessary.
     */
    Box: 2
};
export { Collider };

/**
 * Alignment type enum for {@link TextComponent}
 * @enum {number}
 */
const Alignment = {
    /** Text start is at object origin */
    Left: 1,

    /** Text center is at object origin */
    Center: 2,

    /** Text end is at object origin */
    Right: 3
};
export { Alignment };

/**
 * Justification type enum for {@link TextComponent}
 * @enum {number}
 */
const Justification = {
    /** Text line is at object origin */
    Line: 1,

    /** Text middle is at object origin */
    Middle: 2,

    /** Text top is at object origin */
    Top: 3,

    /** Text bottom is at object origin */
    Bottom: 4
};
export { Justification };

/**
 * Effect type enum for {@link TextComponent}
 * @enum {number}
 */
 const TextEffect = {
    /** Text is rendered normally */
    None: 0,

    /** Text is rendered with an outline */
    Outline: 1
};
export { TextEffect };

/**
 * Input type enum for {@link InputComponent}
 * @enum {number}
 */
const InputType = {
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
};
export { InputType };

/**
 * Light type enum for {@link LightComponent}
 * @enum {number}
 */
const LightType = {
    /** Point light */
    Point: 1,

    /** Spot light */
    Spot: 2,

    /** Sun light / Directional light */
    Sun: 3,
};
export { LightType };

/**
 * Animation state of {@link AnimationComponent}
 * @enum {number}
 */
const AnimationState = {
    /** Animation is currently playing */
    Playing: 1,

    /** Animation is paused and will continue at current playback
    * time on {@link AnimationComponent#play} */
    Paused: 2,

    /** Animation is stopped */
    Stopped: 3
};
export { AnimationState };

/**
 * Rigid body force mode for {@link PhysXComponent#addForce} and {@link PhysXComponent#addTorque}.
 * @enum {number}
 *
 * [PhysX API Reference](https://gameworksdocs.nvidia.com/PhysX/4.1/documentation/physxapi/files/structPxForceMode.html)
 */
const ForceMode = {
    /** Apply as force */
    Force: 0,

    /** Apply as impulse */
    Impulse: 1,

    /** Apply as velocity change, mass dependent */
    VelocityChange: 2,

    /** Apply as mass dependent force */
    Acceleration: 3
};
export { ForceMode };

/**
 * Collision callback event type
 * @enum {number}
 */
const CollisionEventType = {
    /** Touch/contact detected, collision */
    Touch: 0,

    /** Touch/contact lost, uncollide */
    TouchLost: 1,

    /** Touch/contact with trigger detected */
    TriggerTouch: 2,

    /** Touch/contact with trigger lost */
    TriggerTouchLost: 3,
};
export { CollisionEventType };

/**
 * Rigid body {@link PhysXComponent#shape|shape}.
 * @enum {number}
 *
 * [PhysX SDK Guide](https://gameworksdocs.nvidia.com/PhysX/4.1/documentation/physxguide/Manual/Geometry.html#geometry-types)
 */
const Shape = {
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
};
export { Shape };

/**
 * Canvas element that Wonderland Engine renders to
 * @type {HTMLCanvasElement}
 */
let canvas = null;

/**
 * Current WebXR session or {@link null} if no session active
 * @type {XRSession}
 */
let xrSession = null;
/**
 * @callback xrSessionStartCallback
 * @param {XRSession} session WebXR session that started
 */
/**
 * @callback xrSessionEndCallback
 */
/**
 * List of functions to call if a WebXR session is started
 * @type {xrSessionStartCallback[]}
 */
const onXRSessionStart = [ (s) => { xrSession = s; } ];
/**
 * List of functions to call if a WebXR session ends
 * @type {xrSessionEndCallback[]}
 */
const onXRSessionEnd = [ () => { xrSession = null; } ];

/**
 * @callback xrSupportCallback
 * @param {string} type Type of session which is supported/not supported. Either `"vr"` or `"ar"`
 * @param {boolean} supported Whether given session type is supported
 */
/**
 * List of functions to call once VR/AR support has been determined.
 * @type {xrSupportCallback[]}
 *
 * Will be called once for AR and once for VR independent of support for each.
 * This allows you to notify the user of both cases: support and missing support of XR.
 * See the `supported` parameter of the callback, which indicates support.
 */
let onXRSupported = [
  (type, supported) => {
    if(type == 'ar') arSupported = supported;
    if(type == 'vr') vrSupported = supported;
  }
];

/**
 * @callback sceneLoadedCallback
 */
/**
 * List of functions to call once the main scene has been loaded
 * @type {sceneLoadedCallback[]}
 */
let onSceneLoaded = [];

/**
 * Whether AR is supported by the browser
 *
 * `undefined` until support could be determined
 */
let arSupported = undefined;
/**
 * Whether VR is supported by the browser
 *
 * `undefined` until support could be determined
 */
let vrSupported = undefined;
/**
 * Current main scene
 * @type {Scene}
 */
let scene = undefined;
/**
 * Physics, only available when physx is enabled in the runtime
 * @type {Physics}
 */
let physics = undefined;

let _images = [];
let _sceneLoadedCallback = [];
let _tempMem = null;
let _tempMemSize = 0;
let _tempMemFloat = null;
let _tempMemInt = null;
let _tempMemUint32 = null;
let _tempMemUint16 = null;
let _tempMemUint8 = null;

/** Initialize API resources, called by the engine automatically. */
function init() {
    scene = new Scene();
    /* For internal testing, we provide compatibility with DOM-less execution */
    canvas = (typeof document === 'undefined') ? null : document.getElementById('canvas');

    ComponentCache = {};
    /* Object class instances per type to avoid GC */
    ObjectCache = [];

    /* Target memory for JS API functions that return arrays */
    allocateTempMemory(1024);
}

/**
 * Reset the runtime state, including:
 *     - Component cache
 *     - Images
 *     - Callbacks
 */
function reset() {
    ComponentCache = {};
    ObjectCache.length = 0;
    _images.length = 0;
    _sceneLoadedCallback.length = 0;
    _WL.reset();
}

/** Initialize API resources, called by the engine automatically, if
 * PhysX is enabled. */
function _initPhysics() {
    physics = new Physics();
}

function allocateTempMemory(size) {
    console.log("Allocating temp mem:", size);
    _tempMemSize = size;
    if(_tempMem) _free(_tempMem);
    _tempMem = _malloc(_tempMemSize);
    updateTempMemory();
}

function requireTempMem(size) {
    if(_tempMemSize >= size) return;
    /* Grow in 1kb increments */
    allocateTempMemory(Math.ceil(size/1024)*1024);
}

function updateTempMemory() {
    _tempMemFloat = new Float32Array(HEAP8.buffer,_tempMem,_tempMemSize >> 2);
    _tempMemInt = new Int32Array(HEAP8.buffer,_tempMem,_tempMemSize >> 2);
    _tempMemUint32 = new Uint32Array(HEAP8.buffer,_tempMem,_tempMemSize >> 2);
    _tempMemUint16 = new Uint16Array(HEAP8.buffer,_tempMem,_tempMemSize >> 1);
    _tempMemUint8 = new Uint8Array(HEAP8.buffer,_tempMem,_tempMemSize);
}

/**
 * Returns a uint8 buffer view on temporary WASM memory.
 *
 * **Note**: this method might allocate if the requested memory is bigger
 * than the current temporary memory allocated.
 *
 * @param {number} count The number of **elements** required
 * @returns {Uint8Array} A {@link TypedArray} over the WASM memory
 */
function getTempBufferU8(count) {
    requireTempMem(count);
    return _tempMemUint8;
}

/**
 * Returns a uint16 buffer view on temporary WASM memory.
 *
 * **Note**: this method might allocate if the requested memory is bigger
 * than the current temporary memory allocated.
 *
 * @param {number} count The number of **elements** required
 * @returns {Uint16Array} A {@link TypedArray} over the WASM memory
 */
function getTempBufferU16(count) {
    requireTempMem(count * 2);
    return _tempMemUint16;
}

/**
 * Returns a uint32 buffer view on temporary WASM memory.
 *
 * **Note**: this method might allocate if the requested memory is bigger
 * than the current temporary memory allocated.
 *
 * @param {number} count The number of **elements** required.
 * @returns {Uint32Array} A {@link TypedArray} over the WASM memory
 */
function getTempBufferU32(count) {
    requireTempMem(count * 4);
    return _tempMemUint32;
}

/**
 * Returns a int32 buffer view on temporary WASM memory.
 *
 * **Note**: this method might allocate if the requested memory is bigger
 * than the current temporary memory allocated.
 *
 * @param {number} count The number of **elements** required
 * @returns {Int32Array} A {@link TypedArray} over the WASM memory
 */
function getTempBufferI32(count) {
    requireTempMem(count * 4);
    return _tempMemInt;
}

/**
 * Returns a float32 buffer view on temporary WASM memory.
 *
 * **Note**: this method might allocate if the requested memory is bigger
 * than the current temporary memory allocated.
 *
 * @param {number} count The number of **elements** required
 * @returns {Float32Array} A {@link TypedArray} over the WASM memory
 */
function getTempBufferF32(count) {
    requireTempMem(count * 4);
    return _tempMemFloat;
}

export {
    registerComponent,

    canvas,
    scene,
    xrSession,
    onXRSessionStart,
    onXRSessionEnd,
    onXRSupported,
    onSceneLoaded,
    arSupported,
    vrSupported,
    physics,
    _images,
    _sceneLoadedCallback,
    textures,

    init,
    reset,
    _initPhysics,
    updateTempMemory,
};

/**
 * Provides global scene functionality like raycasting.
 */
class Scene {
    constructor() {
        this._rayHit = _malloc(4*(3*4+3*4+4+2)+4);
        this._hit = new RayHit(this._rayHit);

        /* Hidden property, list of functions to call after a
         * frame has been rendered */
        this.onPreRender = [];
        this.onPostRender = [];
    }

    /**
     * @returns {ViewComponent[]} currently active view components
     */
    get activeViews() {
        const count = _wl_scene_get_active_views(_tempMem, 16);

        const views = [];
        const viewTypeIndex = $Object._typeIndexFor("view");
        for(let i = 0; i < count; ++i) {
            views.push(new ViewComponent(viewTypeIndex, _tempMemInt[i]));
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
     * @note The returned {@link RayHit} object is owned by the Scene instance and
     *       will be reused with the next {@link Scene#rayCast} call.
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
     * @param {$Object} parent Parent object or {@link null}
     * @returns {$Object} newly created object
     */
    addObject(parent) {
        const parentId = parent ? parent.objectId : 0;
        const objectId = _wl_scene_add_object(parentId);
        return $Object._wrapObject(objectId);
    }

    /**
     * Batch-add objects to the scene
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
     * @param {number} count Number of objects to add
     * @param {$Object} parent Parent object or {@link null}, default {@link null}
     * @param {number} componentCountHint Hint for how many components in total will
     *      be added to the created objects afterwards, default `0`.
     * @returns {$Object[]} newly created objects
     */
    addObjects(count, parent, componentCountHint) {
        const parentId = parent ? parent.objectId : 0;
        requireTempMem(count*2);
        const actualCount = _wl_scene_add_objects(parentId, count, componentCountHint || 0, _tempMem, _tempMemSize >> 1);
        const ids = _tempMemUint16.subarray(0, actualCount);
        const objects = Array.from(ids, $Object._wrapObject);
        return objects;
    }

    /**
     * Pre-allocate memory for a given amount of objects and components
     *
     * Will provide better performance for adding objects later with {@link Scene#addObject}
     * and {@link Scene#addObjects}
     *
     * By providing upfront information of how many objects will be required,
     * the engine is able to batch-allocate the required memory rather than
     * convervatively grow the memory in small steps.
     *
     * **Experimental:** This API might change in upcoming versions.
     *
     * @param {number} objectCount Number of objects to add
     * @param {Object.<string, number>} componentCountPerType Amount of components to
     *      allocate for {@link $Object#addComponent}, e.g. `{mesh: 100, collision: 200, "my-comp": 100}`
     * @since 0.8.10
     */
    reserveObjects(objectCount, componentCountPerType) {
        componentCountPerType = componentCountPerType || {};
        const jsManagerIndex = $Object._typeIndexFor('js');
        let countsPerTypeIndex = _tempMemInt.subarray();
        countsPerTypeIndex.fill(0);
        for(const e of Object.entries(componentCountPerType)) {
            const typeIndex = $Object._typeIndexFor(e[0]);
            countsPerTypeIndex[(typeIndex < 0) ? jsManagerIndex : typeIndex] += e[1];
        }
        _wl_scene_reserve_objects(objectCount, _tempMem);
    }

    /**
     * Set the background clear color
     *
     * @param {number[]} color new clear color (RGBA)
     * @since 0.8.5
     */
    set clearColor(color) {
        _wl_scene_set_clearColor(color[0], color[1], color[2], color[3]);
    }

    /**
     * Set whether to clear the color framebuffer before drawing.
     *
     * This function is useful if an external framework (e.g. an AR tracking
     * framework) is responsible for drawing a camera frame before Wonderland
     * Engine draws the scene on top of it.
     *
     * @param {boolean} b Whether to enable color clear.
     * @since 0.9.4
     */
    set colorClearEnabled(b) {
        _wl_scene_enableColorClear(b);
    }

    /**
     * Load a scene file (.bin)
     *
     * Will replace the currently active scene with the one loaded
     * from given file. It is assumed that JavaScript components required by
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

    /**
     * Load an external 3D file (.gltf, .glb)
     *
     * Loads and parses the gltf file and its images and appends the result
     * to scene.
     *
     * @example
     *    WL.scene.append(filename).then(root => {
     *        // root contains the loaded scene
     *    });
     *
     * In case the `loadGltfExtensions` option is set to true, the response
     * will be an object containing both the root of the loaded scene and
     * any glTF extensions found on nodes, meshes and the root of the file.
     *
     * @example
     *    WL.scene.append(filename, { loadGltfExtensions: true }).then(({root, extensions}) => {
     *        // root contains the loaded scene
     *
     *        // extensions.root contains any extensions at the root of glTF document
     *        const rootExtensions = extensions.root;
     *
     *        // extensions.mesh and extensions.node contain extensions indexed by Object id
     *        const childObject = root.children[0];
     *        const meshExtensions = root.meshExtensions[childObject.objectId];
     *        const nodeExtensions = root.nodeExtensions[childObject.objectId];
     *
     *        // extensions.idMapping contains a mapping from glTF node index to Object id
     *    });
     *
     * @param filename Path to the .gltf or .glb file
     * @param options Additional options for loading
     * @returns {Promise<$Object>|Promise<Object>} Root of the loaded scene
     */
    append(filename, options) {
        options = options || {};
        const loadGltfExtensions = !!options.loadGltfExtensions;

        const strLen = lengthBytesUTF8(filename) + 1;
        const ptr = _malloc(strLen);
        stringToUTF8(filename, ptr, strLen);
        const callback = _sceneLoadedCallback.length;
        const promise = new Promise((resolve, reject) => {
            _sceneLoadedCallback[callback] = {
                success: (id, extensions) => {
                    const root = $Object._wrapObject(id);
                    resolve(extensions ? { root, extensions } : root);
                },
                error: () => reject()
            };
        });

        _wl_append_scene(ptr, loadGltfExtensions, callback);
        _free(ptr);
        return promise;
    }

    /**
     * Unmarshalls the GltfExtensions from an Uint32Array
     *
     * @param {Uint32Array} data Array containing the gltf extension data
     * @returns {Object}
     */
    _unmarshallGltfExtensions(data) {
        const extensions = {
            root: {},
            mesh: {},
            node: {},
            idMapping: {},
        };

        let index = 0;
        const readString = () => {
            const strPtr = data[index++];
            const strLen = data[index++];
            return _WL.UTF8ViewToString(strPtr, strPtr + strLen);
        }

        const idMappingSize = data[index++];
        const idMapping = new Array(idMappingSize);
        for(let i = 0; i < idMappingSize; ++i) {
            idMapping[i] = data[index++];
        }
        extensions.idMapping = idMapping;

        const meshExtensionsSize = data[index++];
        for(let i = 0; i < meshExtensionsSize; ++i) {
            const objectId = data[index++];
            extensions.mesh[idMapping[objectId]] = JSON.parse(readString());
        }
        const nodeExtensionsSize = data[index++];
        for(let i = 0; i < nodeExtensionsSize; ++i) {
            const objectId = data[index++];
            extensions.node[idMapping[objectId]] = JSON.parse(readString());
        }
        const rootExtensionsStr = readString();
        if(rootExtensionsStr) {
            extensions.root = JSON.parse(rootExtensionsStr);
        }

        return extensions;
    }

    /**
     * Reset the scene
     *
     * This method deletes all used and allocated objects, and components.
     */
    reset() {
        _wl_scene_reset();
    }
};
export { Scene };

/**
 * Native component
 *
 * Provides access to a native component instance of a specified component type
 */
class Component {
    constructor(managerIndex = -1, id = -1) {
        this._manager = managerIndex;
        this._id = id;
        this._object = null;
        this._type = null;
    }

    /**
     * @returns {string} the name of this component's type
     */
    get type() {
        return this._type || $Object._typeNameFor(this._manager);
    }

    /**
     * @returns {$Object} The object this component is attached to
     */
    get object() {
        if(!this._object) {
            const objectId = _wl_component_get_object(this._manager, this._id);
            this._object = $Object._wrapObject(objectId);
        }
        return this._object;
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
     * Remove this component from its objects and destroy it.
     *
     * It is best practice to set the component to `null` after,
     * to ensure it does not get used later.
     *
     * @example
     *    c.destroy();
     *    c = null;
     * @since 0.9.0
     */
    destroy() {
        _wl_component_remove(this._manager, this._id);
        this._manager = undefined;
        this._id = undefined;
    }

    /**
     * Checks equality by comparing whether the wrapped native component ids
     * and component manager types are equal.
     *
     * @param {?Component} otherComponent Component to check equality with
     * @returns {boolean} Whether this component equals the given component
     */
    equals(otherComponent) {
        if(!otherComponent) return false;
        return this._manager == otherComponent._manager && this._id == otherComponent._id;
    }
};
export { Component };

/**
 * Native collision component
 *
 * Provides access to a native collision component instance
 */
class CollisionComponent extends Component {

    /**
     * @returns {Collider} Collision component collider
     */
    get collider() {
        return _wl_collision_component_get_collider(this._id);
    }

    /**
     * Set collision component collider
     *
     * @param {Collider} collider Collider of the collision component.
     */
    set collider(collider) {
        _wl_collision_component_set_collider(this._id, collider);
    }

    /**
     * If {@link CollisionComponent#collider} returns {@link Collider.Sphere}, only the first
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
     * If {@link CollisionComponent#collider} returns {@link Collider.Sphere}, only the first
     * component of the passed vector is used.
     *
     * @param {number[]} extents Extents of the collision component, expects a
     *      3 component array.
     */
    set extents(extents) {
        this.extents.set(extents);
    }

    /**
     * The groups is a bitmask that is compared to other components in {@link CollisionComponent#queryOverlaps}
     * or the group in {@link Scene#rayCast}.
     *
     * Colliders that have no common groups will not overlap with each other. If a collider
     * has none of the groups set for {@link Scene#rayCast}, the ray will not hit it.
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
     * @returns {CollisionComponent[]} Collision components overlapping this collider.
     */
    queryOverlaps() {
        const count = _wl_collision_component_query_overlaps(this._id, _tempMem, _tempMemSize >> 1);
        let overlaps = new Array(count);
        for(let i = 0; i < count; ++i) {
            overlaps[i] = new CollisionComponent(this._manager, _tempMemUint16[i]);
        }
        return overlaps;
    }
};
export { CollisionComponent };

/**
 * Native text component
 *
 * Provides access to a native text component instance
 */
class TextComponent extends Component {

    /**
     * @returns {Alignment} Text component alignment
     */
    get alignment() {
        return _wl_text_component_get_horizontal_alignment(this._id);
    }

    /**
     * Set text component alignment
     *
     * @param {Alignment} alignment Alignment for the text component.
     */
    set alignment(alignment) {
        _wl_text_component_set_horizontal_alignment(this._id, alignment);
    }

    /**
     * @returns {Justification} Text component justification
     */
    get justification() {
        return _wl_text_component_get_vertical_alignment(this._id);
    }

    /**
     * Set text component justification
     *
     * @param {Justification} justification Justification for the text component.
     */
    set justification(justification) {
        _wl_text_component_set_vertical_alignment(this._id, justification);
    }

    /**
     * @returns {number} Text component character spacing
     */
     get characterSpacing() {
        return _wl_text_component_get_character_spacing(this._id);
    }

    /**
     * Set text component character spacing
     *
     * @param {number} spacing Character spacing for the text component
     */
    set characterSpacing(spacing) {
        _wl_text_component_set_character_spacing(this._id, spacing);
    }

    /**
     * @returns {number} Text component line spacing
     */
     get lineSpacing() {
        return _wl_text_component_get_line_spacing(this._id);
    }

    /**
     * Set text component line spacing
     *
     * @param {number} spacing Line spacing for the text component
     */
    set lineSpacing(spacing) {
        _wl_text_component_set_line_spacing(this._id, spacing);
    }

    /**
     * @returns {TextEffect} Text component effect
     */
     get effect() {
        return _wl_text_component_get_effect(this._id);
    }

    /**
     * Set text component effect
     *
     * @param {TextEffect} effect Effect for the text component
     */
    set effect(effect) {
        _wl_text_component_set_effect(this._id, effect);
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
     * @param {Material} material New material
     */
    set material(material) {
        _wl_text_component_set_material(this._id, material ? material._index : 0);
    }

    /**
     * @returns {?Material} Material used to render the text
     */
    get material() {
        return Material.wrap(_wl_text_component_get_material(this._id));
    }

};
export { TextComponent };

/**
 * Native view component
 *
 * Provides access to a native view component instance
 */
class ViewComponent extends Component {

    /**
     * @returns {Float32Array} Projection matrix
     */
    get projectionMatrix() {
        return new Float32Array(HEAPF32.buffer,
            _wl_view_component_get_projection_matrix(this._id), 16);
    }

    /**
     * @returns {number} ViewComponent near clipping plane value
     */
    get near() {
        return _wl_view_component_get_near(this._id);
    }

    /**
     * Set near clipping plane distance for the view
     *
     * If an XR session is active, the change will apply in the
     * following frame, otherwise the change is immediate.
     *
     * @param {number} near Near depth value
     */
    set near(near) {
        _wl_view_component_set_near(this._id, near);
    }

    /**
     * @returns {number} ViewComponent far clipping plane value
     */
    get far() {
        return _wl_view_component_get_far(this._id);
    }

    /**
     * Set far clipping plane distance for the view
     *
     * If an XR session is active, the change will apply in the
     * following frame, otherwise the change is immediate.
     *
     * @param {number} far Near depth value
     */
    set far(far) {
        _wl_view_component_set_far(this._id, far);
    }

    /**
     * Get field of view for the view
     *
     * If an XR session is active, this returns the field of view reported by
     * the device, regardless of the fov that was set.
     *
     * @returns {number} ViewComponent horizontal field of view in degrees
     */
     get fov() {
        return _wl_view_component_get_fov(this._id);
    }

    /**
     * Set field of view for the view
     *
     * If an XR session is active, the field of view reported by the device is
     * used and this value is ignored. After the XR session ends, the new value
     * is applied.
     *
     * @param {number} fov Horizontal field of view in degrees
     */
    set fov(fov) {
        _wl_view_component_set_fov(this._id, fov);
    }
};
export { ViewComponent };

/**
 * Native input component
 *
 * Provides access to a native input component instance
 */
class InputComponent extends Component {

    /**
     * @returns {InputType} Input component type
     */
    get inputType() {
        return _wl_input_component_get_type(this._id);
    }

    /**
     * Set input component type
     *
     * @params {InputType} New input component type
     */
    set inputType(type) {
        _wl_input_component_set_type(this._id, type);
    }

    /**
     * @returns {?XRInputSource} WebXR Device API input source associated
     *          with this input component, if type {@link InputType.ControllerLeft}
     *          or {@link InputType.ControllerRight}.
     */
    get xrInputSource() {
        if(xrSession) {
            for(let inputSource of xrSession.inputSources) {
                if(inputSource.handedness == this.handedness) {
                    return inputSource;
                }
            }
        }

        return null;
    }

    /**
     * @returns {?string} 'left', 'right' or {@link null} depending on the {@link InputComponent#inputType}.
     */
    get handedness() {
        const inputType = this.inputType;
        if(inputType == InputType.ControllerRight || inputType == InputType.RayRight || inputType == InputType.EyeRight)
            return 'right';
        if(inputType == InputType.ControllerLeft || inputType == InputType.RayLeft || inputType == InputType.EyeLeft)
            return 'left';

        return null;
    }
};
export { InputComponent };

/**
 * Native light component
 *
 * Provides access to a native light component instance
 */
class LightComponent extends Component {

    /** @returns {Float32Array} View on the light color */
    get color() {
        return new Float32Array(HEAPF32.buffer, _wl_light_component_get_color(this._id), 4);
    }

    /** @returns {LightType} Light type */
    get lightType() {
        return _wl_light_component_get_type(this._id);
    }

    /**
     * Set light type
     *
     * @param {LightType} lightType Type of the light component.
     */
    set lightType(t) {
        return _wl_light_component_set_type(this._id, t);
    }
};
export { LightComponent };

/**
 * Native animation component
 *
 * Provides access to a native animation component instance
 */
class AnimationComponent extends Component {

    /**
     * Set animation to play
     *
     * Make sure to {@link Animation#retarget} the animation to affect the
     * right objects.
     *
     * @param {Animation} animation to play
     */
    set animation(anim) {
        _wl_animation_component_set_animation(this._id, anim._index);
    }

    /** @returns {Animation} animation set for this component */
    get animation() {
        return new Animation(_wl_animation_component_get_animation(this._id));
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

    /**
     * Set speed. Set to negative values to run the animation backwards.
     *
     * Setting speed has an immediate effect for the current frame's update
     * and will continue with the speed from the current point in the animation.
     *
     * @param {number} speed New speed at which to play the animation.
     * @since 0.8.10
     */
    set speed(speed) {
        _wl_animation_component_set_speed(this._id, speed);
    }

    /**
     * @returns {number} Speed factor at which the animation is played
     * @since 0.8.10
     */
    get speed() {
        return _wl_animation_component_get_speed(this._id);
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

    /** @returns {AnimationState} Current playing state of the animation */
    get state() {
        return _wl_animation_component_state(this._id);
    }

};
export { AnimationComponent };

/**
 * Native mesh component
 *
 * Provides access to a native mesh component instance
 */
class MeshComponent extends Component {
    /**
     * Set material to render the mesh with
     *
     * @param {?Material} material Material to render the mesh with
     */
    set material(material) {
        _wl_mesh_component_set_material(this._id, material ? material._index : 0);
    }

    /** @returns {?Material} Material used to render the mesh */
    get material() {
        return Material.wrap(_wl_mesh_component_get_material(this._id));
    }

    /** @returns {?Mesh} Mesh rendered by this component */
    get mesh() {
        return new Mesh(_wl_mesh_component_get_mesh(this._id));
    }

    /**
     * Set mesh to rendered with this component
     *
     * @param {?Mesh} mesh Mesh rendered by this component
     */
    set mesh(mesh) {
        _wl_mesh_component_set_mesh(this._id, mesh._index);
    }

    /** @returns {?Skin} Skin for this mesh component */
    get skin() {
        return new Skin(_wl_mesh_component_get_skin(this._id));
    }

    /**
     * Set skin to transform this mesh component
     *
     * @param {?Skin} skin Skin to use for rendering skinned meshes
     */
    set skin(skin) {
        _wl_mesh_component_set_skin(this._id, skin._index);
    }
};
export { MeshComponent };

/**
 * Native physx rigid body component
 *
 * Provides access to a native mesh component instance.
 * Only available when using physx enabled runtime, see "Project Settings > Runtime".
 */
class PhysXComponent extends Component {
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
     * @returns {boolean} Whether this rigid body is kinematic
     */
    get kinematic() {
        return !!_wl_physx_component_get_kinematic(this._id);
    }

    /**
     * Set the shape for collision detection
     *
     * @param {Shape} s New shape
     * @since 0.8.5
     */
    set shape(s) {
        _wl_physx_component_set_shape(this._id, s);
    }

    /**
     * The shape for collision detection
     * @returns {Shape} Currently set shape
     */
    get shape() {
        return _wl_physx_component_get_shape(this._id);
    }

    /**
     * Set additional data for the shape.
     *
     * Retrieved only from {@link PhysXComponent#shapeData}.
     * @since 0.8.10
     */
    set shapeData(d) {
        if(d == null || !([Shape.TriangleMesh, Shape.ConvexMesh].includes(this.shape)))
            return;
        _wl_physx_component_set_shape_data(this._id, d.index);
    }

    /**
     * Additional data for the shape.
     *
     * `null` for {@link Shape} values: `None`, `Sphere`, `Capsule`, `Box`, `Plane`.
     * `{index: n}` for `TriangleMesh` and `ConvexHull`.
     *
     * This data is currently only for passing onto or creating other
     * {@link PhysXComponent}s.
     * @since 0.8.10
     */
    get shapeData() {
        if(!([Shape.TriangleMesh, Shape.ConvexMesh].includes(this.shape)))
            return null;
        return { index: _wl_physx_component_get_shape_data(this._id) };
    }

    /**
     * Set the shape extents for collision detection
     *
     * @param {number[]} e New extents for the shape
     * @since 0.8.5
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
     * Get bounciness
     * @since 0.9.0
     */
    get bounciness() {
        return _wl_physx_component_get_bounciness(this._id);
    }

    /**
     * Set bounciness
     * @param {number} v New bounciness
     * @since 0.9.0
     */
    set bounciness(v) {
        _wl_physx_component_set_bounciness(this._id, v);
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
     * Has no effect, if the component is not active.
     *
     * @param {number[]} v New linear velocity
     */
    set linearVelocity(v) {
        _wl_physx_component_set_linearVelocity(this._id, v[0], v[1], v[2]);
    }

    /**
     * @returns {Float32Array} Linear velocity or `[0, 0, 0]`
     *      if the component is not active.
     */
    get linearVelocity() {
        _wl_physx_component_get_linearVelocity(this._id, _tempMem);
        return new Float32Array(HEAPF32.buffer, _tempMem, 3);
    }

    /**
     * Set angular velocity
     *
     * [PhysX Manual - "Velocity"](https://gameworksdocs.nvidia.com/PhysX/4.1/documentation/physxguide/Manual/RigidBodyDynamics.html#velocity)
     *
     * Has no effect, if the component is not active.
     *
     * @param {number[]} v New angular velocity
     */
    set angularVelocity(v) {
        _wl_physx_component_set_angularVelocity(this._id, v[0], v[1], v[2]);
    }

    /**
     * @returns {Float32Array} Angular velocity or `[0, 0, 0]`
     *      if the component is not active.
     */
    get angularVelocity() {
        _wl_physx_component_get_angularVelocity(this._id, _tempMem);
        return new Float32Array(HEAPF32.buffer, _tempMem, 3);
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
     * Has no effect, if the component is not active.
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
     * Has no effect, if the component is not active.
     *
     * @param {number[]} f Force vector
     * @param {number[]} m Force mode, see {@link ForceMode}, default `Force`.
     * @param {number[]} localForce Whether the force vector is in local space, default `false`.
     * @param {number[]} p Position to apply force at, default is center of mass.
     * @param {number[]} local Whether position is in local space, default `false`.
     */
    addForce(f, m, localForce, p, local) {
        m = m || ForceMode.Force;
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
     * Has no effect, if the component is not active.
     *
     * @param {number[]} f Force vector
     * @param {number[]} m Force mode, see {@link ForceMode}, default `Force`.
     */
    addTorque(f, m) {
        m = m || ForceMode.Force;
        _wl_physx_component_addTorque(this._id, f[0], f[1], f[2], m);
    }

    /**
     * @callback collisionCallback
     * @param {CollisionEventType} type Type of the event
     * @param {PhysXComponent} other Other component that was (un)collided with
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
     *      if(type == CollisionEventType.TouchLost) return;
     *
     *      // Take damage on collision with enemies
     *      if(other.object.name.startsWith('enemy-')) {
     *          this.applyDamage(10);
     *      }
     *  }.bind(this));
     */
    onCollision(callback) {
        return this.onCollisionWith(this, callback);
    }

    /**
     * Add filtered on collision callback
     *
     * @param {PhysXComponent} otherComp Component for which callbacks will
     *        be triggered. If you pass this component, the method is equivalent to
     *        {@link PhysXComponent#onCollision}.
     * @param {collisionCallback} callback Function to call when this rigid body
     *        (un)collides with `otherComp`.
     * @returns {number} Id of the new callback for use with {@link PhysXComponent#removeCollisionCallback}.
     */
    onCollisionWith(otherComp, callback) {
        physics._callbacks[this._id] = physics._callbacks[this._id] || [];
        physics._callbacks[this._id].push(callback);
        return _wl_physx_component_addCallback(this._id, otherComp._id || this._id);
    }

    /**
     * Remove a collision callback added with {@link PhysXComponent#onCollision} or {@link PhysXComponent#onCollisionWith}.
     * @param {number} callbackId Callback id as returned by {@link PhysXComponent#onCollision} or {@link PhysXComponent#onCollisionWith}.
     * @throws When the callback does not belong to the component
     * @throws When the callback does not exist
     */
    removeCollisionCallback(callbackId) {
        const r = _wl_physx_component_removeCallback(this._id, callbackId);
        /* r is the amount of object to remove from the end of the
         * callbacks array for this object */
        if(r) physics._callbacks[this._id].splice(-r);
    }
};

for(const prop of [
    'static', 'extents', 'staticFriction', 'dynamicFriction', 'bounciness',
    'linearDamping', 'angularDamping', 'shape', 'shapeData', 'kinematic',
    'linearVelocity', 'angularVelocity', 'mass'])
{
    Object.defineProperty(PhysXComponent.prototype, prop, {enumerable: true});
}
export { PhysXComponent };

/**
 * Access to the physics scene
 */
class Physics {
    constructor() {
        this._rayHit = _malloc(4*(3*4+3*4+4+2)+4);
        this._hit = new RayHit(this._rayHit);
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
     * @param {number} maxDistance Maximum ray distance, default `100.0`.
     *
     * @note The returned {@link RayHit} object is owned by the Physics instance and
     *       will be reused with the next {@link Physics#rayCast} call.
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
        physics._callbacks[a][index](type,
            new PhysXComponent($Object._typeIndexFor('physx'), b));
    }
};
export { Physics };

/**
 * Wrapper around a native mesh data
 */
class Mesh {

    /**
     * Size of a vertex in float elements
     * @deprecated Replaced with {@link Mesh#attribute()} and {@link MeshAttributeAccessor}
     */
    static get VERTEX_FLOAT_SIZE() { return 3 + 3 + 2; }
    /**
     * Size of a vertex in bytes
     * @deprecated Replaced with {@link Mesh#attribute()} and {@link MeshAttributeAccessor}
     */
    static get VERTEX_SIZE() { return this.VERTEX_FLOAT_SIZE*4; }

    /**
     * Position attribute offsets in float elements
     * @deprecated Replaced with {@link Mesh#attribute()} and {@link MeshAttribute#Position}
     */
    static get POS() { return { X: 0, Y: 1, Z: 2 }; }
    /**
     * Texture coordinate attribute offsets in float elements
     * @deprecated Replaced with {@link Mesh#attribute()} and {@link MeshAttribute#TextureCoordinate}
     */
    static get TEXCOORD() { return { U: 3, V: 4 }; }
    /**
     * Normal attribute offsets in float elements
     * @deprecated Replaced with {@link Mesh#attribute()} and {@link MeshAttribute#Normal}
     */
    static get NORMAL() { return { X: 5, Y: 6, Z: 7 }; }

    /**
     * Constructor
     *
     * @param {object} params Either a mesh index to wrap or set of parameters to create a new mesh
     * @param {number} params.vertexCount Number of vertices to allocate
     * @param {boolean} params.skinned `true` if the mesh should be skinned. Defaults to false.
     * @param {number[]} params.vertexData (deprecated, use `vertexCount` instead and set data
     *      with {@link Mesh#attribute} instead.) Interleaved vertex data values. A vertex is a
     *      set of 8 float values:
     *          - 0-2 Position
     *          - 3-5 Normal
     *          - 6-8 Texture Coordinate
     * @param {?number[]} params.indexData Index data values
     * @param {?MeshIndexType} params.indexType Index type, `null` if not indexed
     */
    constructor(params) {
        if(typeof(params) === 'object') {
            if(!params.vertexCount && params.vertexData) {
                params.vertexCount = params.vertexData.length/WL.Mesh.VERTEX_FLOAT_SIZE;
            }
            if(!params.vertexCount) throw new Error("Missing parameter 'vertexCount'");

            let indexData = null;
            let indexDataSize = 0;
            if(params.indexData) {
                const indexType = params.indexType || WL.MeshIndexType.UnsignedShort;
                indexDataSize = params.indexData.length*indexType;
                indexData = _malloc(indexDataSize);
                /* Copy the index data into wasm memory */
                switch(indexType) {
                    case MeshIndexType.UnsignedByte:
                        HEAPU8.set(params.indexData, indexData);
                        break;
                    case MeshIndexType.UnsignedShort:
                        HEAPU16.set(params.indexData, indexData >> 1);
                        break;
                    case MeshIndexType.UnsignedInt:
                        HEAPU32.set(params.indexData, indexData >> 2);
                        break;
                }
            }

            const { skinned = false } = params;

            this._index = _wl_mesh_create(indexData, indexDataSize,
                params.indexType, params.vertexCount, skinned);

            if(params.vertexData) {
                const positions = this.attribute(WL.MeshAttribute.Position);
                const normals = this.attribute(WL.MeshAttribute.Normal);
                const textureCoordinates = this.attribute(WL.MeshAttribute.TextureCoordinate);

                for(let i = 0; i < params.vertexCount; ++i) {
                    const start = i*WL.Mesh.VERTEX_FLOAT_SIZE;
                    positions.set(i, params.vertexData.subarray(start, start + 3));
                    textureCoordinates.set(i, params.vertexData.subarray(start + 3, start + 5));
                    normals.set(i, params.vertexData.subarray(start + 5, start + 8));
                }
            }
        } else {
            this._index = params;
        }
    }

    /**
     * @returns {Float32Array} Vertex data (read-only)
     * @deprecated Replaced with {@link attribute()}
     */
    get vertexData() {
        let ptr = _wl_mesh_get_vertexData(this._index, _tempMem);
        return new Float32Array(HEAPF32.buffer, ptr, WL.Mesh.VERTEX_FLOAT_SIZE*HEAPU32[_tempMem/4]);
    }

    /**
     * @returns {number} Number of vertices in this mesh
     */
    get vertexCount() {
        return _wl_mesh_get_vertexCount(this._index);
    }

    /**
     * @returns {Uint8Array|Uint16Array|Uint32Array} Index data (read-only) or
     *          {@link null} if the mesh is not indexed
     */
    get indexData() {
        let ptr = _wl_mesh_get_indexData(this._index, _tempMem, _tempMem + 4);
        if(ptr === null) return null;

        const indexCount = HEAPU32[_tempMem/4];
        const indexSize = HEAPU32[_tempMem/4 + 1];
        switch(indexSize) {
            case MeshIndexType.UnsignedByte:
                return new Uint8Array(HEAPU8.buffer, ptr, indexCount);
            case MeshIndexType.UnsignedShort:
                return new Uint16Array(HEAPU16.buffer, ptr, indexCount);
            case MeshIndexType.UnsignedInt:
                return new Uint32Array(HEAPU32.buffer, ptr, indexCount);
        }
    }

    /**
     * Updates the bounding sphere to match new vertex positions.
     */
    update() {
        _wl_mesh_update(this._index);
    }

    /**
     * Mesh bounding sphere.
     *
     * @param {?Float32Array} out Preallocated array to write into,
     *  to avoid garbage, otherwise will allocate a new {@link Float32Array}.
     *
     * @example
     *  const sphere = new Float32Array(4);
     *  for(...) {
     *      mesh.getBoundingSphere(sphere);
     *      ...
     *  }
     *
     * @returns {Float32Array} Bounding sphere, 0-2 sphere origin, 3 radius.
     *
     * If the position data is changed, call {@link Mesh#update} to update the
     * bounding sphere.
     */
    getBoundingSphere(out) {
        out = out || new Float32Array(4);
        _wl_mesh_get_boundingSphere(this._index, _tempMem);
        out[0] = _tempMemFloat[0];
        out[1] = _tempMemFloat[1];
        out[2] = _tempMemFloat[2];
        out[3] = _tempMemFloat[3];
        return out;
    }

    /**
     * Get an attribute accessor to retrieve or modify data of give attribute
     * @param {MeshAttribute} attr Attribute to get access to
     * @returns {?MeshAttributeAccessor} attr Attribute to get access to or `null`,
     *      if mesh does not have this attribute.
     *
     * If there are no shaders in the scene that use `TextureCoordinate` for example,
     * no meshes will have the `TextureCoordinate` attribute.
     *
     * For flexible reusable components, take this into account that only `Position`
     * is guaranteed to be present at all time.
     */
    attribute(attr) {
        if(typeof(attr) != 'number')
            throw new TypeError("Expected number, but got " + typeof(attr));
        _wl_mesh_get_attribute(this._index, attr, _tempMem);
        if(_tempMemUint32[0] == 255) return null;

        const a = new MeshAttributeAccessor(attr);
        a._attribute = _tempMemUint32[0];
        a._offset = _tempMemUint32[1];
        a._stride = _tempMemUint32[2];
        a._formatSize = _tempMemUint32[3];
        a._componentCount = _tempMemUint32[4];
        a.length = this.vertexCount;
        return a;
    }

    /**
     * Destroy and free the meshes memory.
     *
     * It is best practice to set the mesh variable to `null` after calling
     * destroy to prevent accidental use:
     *
     * @example
     *   mesh.destroy();
     *   mesh = null;
     *
     * Accessing the mesh after destruction behaves like accessing an empty
     * mesh.
     *
     * @since 0.9.0
     */
    destroy() {
        _wl_mesh_destroy(this._index);
    }
};
export { Mesh };

/**
 * An iterator over a mesh vertex attribute
 *
 * @example
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
 */
class MeshAttributeAccessor {

    constructor(type = MeshAttribute.Position) {
        this._attribute = -1;
        this._offset = 0;
        this._stride = 0;
        this._formatSize = 0;
        this._componentCount = 0;
        this.length = 0;

        /**
         * Function to allocate temporary WASM memory. This is cached to avoid
         * any conditional during get/set.
         * @type {Function}
         * @private
         */
        this._tempBufferGetter = undefined;
        /**
         * Class to instantiate an ArrayBuffer to get/set values.
         * @type {Function}
         * @private
         */
        this._bufferType = undefined; /* ArrayBuffer class tight to the data format */

        switch(type) {
            case MeshAttribute.Position: case MeshAttribute.Normal:
            case MeshAttribute.TextureCoordinate: case MeshAttribute.Tangent:
            case MeshAttribute.Color: case MeshAttribute.JointWeight:
            case MeshAttribute.SecondaryJointWeight:
                this._bufferType = Float32Array;
                this._tempBufferGetter = getTempBufferF32;
                break;
            case MeshAttribute.JointId: case MeshAttribute.SecondaryJointId:
                this._bufferType = Uint16Array;
                this._tempBufferGetter = getTempBufferU16;
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
     * @param {number} count The number of **vertices** expected.
     * @returns {Uint8Array|Uint16Array|Uint32Array|Int32Array|Float32Array} A TypedArray
     *    with the appropriate format to access the data
     */
    createArray(count = 1) {
        count = count > this.length ? this.length : count;
        return new this._bufferType(count * this._componentCount);
    }

    /**
     * Get attribute element
     * @param {number} i Index
     * @param {number[]|Float32Array|Uint32Array} out Preallocated array to write into,
     *      to avoid garbage, otherwise will allocate a new TypedArray.
     *
     * `out.length` needs to be a multiple of the attributes component count, see
     * {@link MeshAttribute}. If `out.length` is more than one multiple, it will be
     * filled with the next n attribute elements, which can reduce overhead
     * of this call.
     */
    get(index, out) {
        out = out || this.createArray();
        if(out.length % this._componentCount !== 0)
            throw new Error(`out.length, ${v.length} is not a multiple of the attribute vector components, ${this._componentCount}`);

        const dest = this._tempBufferGetter(out.length);
        const bytesPerElt = this._bufferType.BYTES_PER_ELEMENT;
        const bytes = bytesPerElt*out.length;
        const destFormatSize = this._componentCount*bytesPerElt;

        _wl_mesh_get_attribute_values(this._attribute, this._formatSize, this._offset + index*this._stride,
            this._stride, destFormatSize, dest.byteOffset, bytes);

        for(let i = 0; i < out.length; ++i) out[i] = dest[i];
        return out;
    }

    /**
     * Set attribute element
     * @param {number} i Index
     * @param {number[]|Float32Array|Uint32Array} v Value to set the element to
     *
     * `v.length` needs to be a multiple of the attributes component count, see
     * {@link MeshAttribute}. If `v.length` is more than one multiple, it will be
     * filled with the next n attribute elements, which can reduce overhead
     * of this call.
     *
     * @returns {MeshAttributeAccessor} Reference to self (for method chaining)
     */
    set(i, v) {
        if(v.length % this._componentCount !== 0)
            throw new Error(`out.length, ${v.length} is not a multiple of the attribute vector components, ${this._componentCount}`);

        const bytesPerElt = this._bufferType.BYTES_PER_ELEMENT;
        const bytes = bytesPerElt*v.length;
        const srcFormatSize = this._componentCount*bytesPerElt;

        /* Unless we are already working with data from WASM heap, we
         * need to copy into temporary memory. */
        if(v.buffer != HEAPU8.buffer) {
            const dest = this._tempBufferGetter(v.length);
            dest.set(v);
            v = dest;
        }

        _wl_mesh_set_attribute_values(this._attribute, srcFormatSize, v.byteOffset, bytes,
            this._formatSize, this._offset + i*this._stride, this._stride);

        return this;
    }
};
export { MeshAttributeAccessor };

/**
 * Mesh index type
 * @enum {number}
 */
const MeshIndexType = {
    /** Single byte mesh index, range 0-255 */
    UnsignedByte: 1,

    /** Two byte mesh index, range 0-65535 */
    UnsignedShort: 2,

    /** Four byte mesh index, range 0-4294967295 */
    UnsignedInt: 4,
};
export { MeshIndexType };

/**
 * Mesh attribute enum
 * @enum{number}
 * @since 0.9.0
 */
const MeshAttribute = {
    /** Position attribute, 3 floats */
    Position: 0,

    /** Tangent attribute, 4 floats */
    Tangent: 1,

    /** Normal attribute, 3 floats */
    Normal: 2,

    /** Texture coordinate attribute, 2 floats */
    TextureCoordinate: 3,

    /** Color attribute, 4 floats, RGBA, range `0` to `1` */
    Color: 4,

    /** Joint id attribute, 4 unsigned ints */
    JointId: 5,

    /** Joint weights attribute, 4 floats */
    JointWeight: 6,

    /** Secondary joint id attribute, 4 unsigned ints */
    SecondaryJointId: 7,

    /** Secondary joint weights attribute, 4 floats */
    SecondaryJointWeight: 8,
};
export { MeshAttribute };

/**
 * Wrapper around a native material
 */
class Material {
    /**
     * Create a new Material. Used internally by {@link Material.wrap}.
     *
     * @note Do not use this constructor directly, rather use
     *     {@link Material#clone} or {@link Material.wrap} to create instances.
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
     * Create a copy of the underlying native material and {@link Material.wrap} the result
     * @returns {Material} Material clone
     */
    clone() {
        return Material.wrap(_wl_material_clone(this._index));
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
     * @returns {Material} Material instance or {@link null} if index <= 0.
     */
    static wrap(index) {
        if(index <= 0) return null;

        const material = new Material(index);
        return new Proxy(material, {
            get(target, prop) {
                const paramIndex = target._paramIndex(prop);
                if (paramIndex != -1) {
                    const paramType = target._paramType(paramIndex);
                    if(_wl_material_get_param_value(target._index, paramIndex, _tempMem)) {
                        if(paramType.type == 0) {
                            return paramType.componentCount == 1 ? _tempMemUint32[0] : new Uint32Array(HEAPU32.buffer, _tempMem, paramType.componentCount);
                        }
                        if(paramType.type == 1) {
                            return paramType.componentCount == 1 ? _tempMemInt[0] : new Int32Array(HEAP32.buffer, _tempMem, paramType.componentCount);
                        }
                        if(paramType.type == 2) {
                            return paramType.componentCount == 1 ? _tempMemFloat[0] : new Float32Array(HEAPF32.buffer, _tempMem, paramType.componentCount);
                        }
                        if(paramType.type == 3) {
                            return new Texture(_tempMemInt[0]);
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
                    if(value instanceof Texture) {
                        _wl_material_set_param_value_uint(
                            target._index, paramIndex, value._id);
                    } else if(typeof(value) === 'number') {
                        _tempMemFloat[0] = value;
                        _wl_material_set_param_value_float(
                            target._index, paramIndex, _tempMem, 1);
                    } else {
                        let length = value.length;
                        for(let i = 0; i < length; ++i) {
                            _tempMemFloat[i] = value[i];
                        }
                        _wl_material_set_param_value_float(
                            target._index, paramIndex, _tempMem, length);
                    }
                } else {
                    target[prop] = value;
                }
                return true;
            }
        });
    }
};
export { Material };

let tempCanvas = null;

/**
 * Wrapper around a native texture data
 */
class Texture {

    /**
     * @param {HTMLImageElement|HTMLVideoElement|HTMLCanvasElement|number} param HTML media element to create texture from or texture id to wrap.
     */
    constructor(param) {
        if(param instanceof HTMLImageElement || param instanceof HTMLVideoElement || param instanceof HTMLCanvasElement) {
            const index = _images.length;
            _images.push(param);
            this._imageIndex = index;
            this._id = _wl_renderer_addImage(index);
        } else {
            this._id = param;
        }
        textures[this._id] = this;
    }

    /** @returns {boolean} Whether this texture is valid */
    get valid() {
        return this._id >= 0;
    }

    /** Update the texture to match the HTML element (e.g. reflect the current frame of a video) */
    update() {
        if(!this.valid) return;
        _wl_renderer_updateImage(this._id, this._imageIndex);
    }

    /** @returns {int} width of the texture */
    get width() {
        return _wl_texture_width(this._id);
    }

    /** @returns {int} height of the texture */
    get height() {
        return _wl_texture_height(this._id);
    }

    /**
     * Update a subrange on the texture to match the HTML element (e.g. reflect the current frame of a video)
     *
     * @param {number} x x offset
     * @param {number} y y offset
     * @param {number} w width
     * @param {number} h height
     */
    updateSubImage(x, y, w, h) {
        if(!this.valid) return;

        /* Lazy initialize temp canvas */
        if(!tempCanvas) tempCanvas = document.createElement('canvas');

        const img = _images[this._imageIndex];

        tempCanvas.width = w;
        tempCanvas.height = h;
        tempCanvas.getContext('2d').drawImage(img, x, y, w, h, 0, 0, w, h);
        _images[this._imageIndex] = tempCanvas;

        try {
            _wl_renderer_updateImage(this._id,
                this._imageIndex, x, (img.videoHeight || img.height) - y - h);
        } finally {
            _images[this._imageIndex] = img;
        }
    }

    /**
     * Destroy and free the texture's texture altas space and memory.
     *
     * It is best practice to set the texture variable to `null` after calling
     * destroy to prevent accidental use of the invalid texture:
     *
     * @example
     *   texture.destroy();
     *   texture = null;
     *
     * @since 0.9.0
     */
    destroy() {
        _wl_texture_destroy(this._id);
        if(this._imageIndex) {
            _images[this._imageIndex] = null;
            this._imageIndex = undefined;
        }
    }
};
export { Texture };

/**
 * Access to the textures managed by Wonderland Engine
 */
const textures = {

    /**
     * Load an image from URL as {@link Texture}
     * @param {string} filename URL to load from
     * @param {string} crossOrigin Cross origin flag for the {@link Image} object
     * @returns {Promise<Texture>} Loaded texture
     */
    load: function(filename, crossOrigin) {
        let image = new Image();
        if(crossOrigin !== undefined) {
            image.crossOrigin = crossOrigin;
        }
        image.src = filename;
        return new Promise((resolve, reject) => {
            image.onload = function() {
                let texture = new Texture(image);
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
class Animation {
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
     * If retargetting to {@link Skin}, the join names will be used to determine a mapping
     * from the previous skin to the new skin. The source skin will be retrieved from
     * the first track in the animation that targets a joint.
     *
     * @param {$Object[]|Skin} newTargets New targets per track. Expected to have
     *      {@link Animation#trackCount} elements or to be a {@link Skin}.
     * @returns {Animation} The retargeted clone of this animation.
     */
    retarget(newTargets) {
        if(newTargets instanceof Skin) {
            const animId = _wl_animation_retargetToSkin(this._index, newTargets._index);
            return new Animation(animId);
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

        return new Animation(animId);
    }
};
export { Animation };

/**
 * Scene graph object
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
 * {@link Scene#addObject} on the {@link scene|main scene}.
 */
class $Object {
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
     * @returns {$Object} Parent of this object or {@link null} if parented to root
     */
    get parent() {
        const p = _wl_object_parent(this.objectId);
        return p == 0 ? null : $Object._wrapObject(p);
    }

    /**
     * @returns {$Object[]} Children of this object
     */
    get children() {
        const childrenCount = _wl_object_get_children_count(this.objectId);
        if(childrenCount === 0) return [];

        requireTempMem(childrenCount*2);

        _wl_object_get_children(this.objectId, _tempMem, _tempMemSize >> 1);

        const children = new Array(childrenCount);
        for(let i = 0; i < childrenCount; ++i) {
            children[i] = $Object._wrapObject(_tempMemUint16[i]);
        }
        return children;
    }

    /**
     * Reparent object to given object.
     * @param {$Object} newParent New parent or {@link null} to parent to root
     * @note Reparenting is not trivial and might have a noticeable performance impact
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
     *       {@link $Object#resetTranslationRotation}.
     */
    resetRotation() {
        _wl_object_reset_rotation(this.objectId);
    }

    /**
     * Reset local translation, keep rotation.
     * @note To reset both rotation and translation, prefer
     *       {@link $Object#resetTranslationRotation}.
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
     *     {@link $Object#rotateAxisAngleDegObject}
     *
     * @see {@link $Object#rotateAxisAngleRad}
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
     *     {@link $Object#rotateAxisAngleDegObject}
     *
     * @see {@link $Object#rotateAxisAngleDeg}
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
     * @see {@link $Object#rotateAxisAngleRadObject}
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
     * @see {@link $Object#rotateAxisAngleDegObject}
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
     * Set local transform.
     *
     * @param {number} t Local space transformation
     *
     * @since 0.8.5
     */
    set transformLocal(t) {
        this.transformLocal.set(t);
        this.setDirty();
    }

    /**
     * Compute local / object space translation from transformation
     * @param {number[]} out Destination array/vector, expected to have at
     *                       least 3 elements.
     * @return {number[]} out
     */
    getTranslationLocal(out) {
        _wl_object_get_translation_local(this.objectId, _tempMem);
        out[0] = _tempMemFloat[0];
        out[1] = _tempMemFloat[1];
        out[2] = _tempMemFloat[2];
        return out;
    }

    /**
     * Compute local / object space translation from transformation
     *
     * May recompute transformations of the hierarchy of this object,
     * if they were changed by JavaScript components this frame.
     *
     * @param {number[]} out Destination array/vector, expected to have at
     *                       least 3 elements.
     * @return {number[]} out
     */
    getTranslationWorld(out) {
        _wl_object_get_translation_world(this.objectId, _tempMem);
        out[0] = _tempMemFloat[0];
        out[1] = _tempMemFloat[1];
        out[2] = _tempMemFloat[2];
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
     * if they were changed by JavaScript components this frame.
     *
     * @returns {Float32Array} Global / world space transformation
     */
    get transformWorld() {
        return new Float32Array(HEAPF32.buffer, _wl_object_trans_world(this.objectId), 8);
    }

    /**
     * Set world transform.
     *
     * @param {number} t Global / world space transformation
     *
     * @since 0.8.5
     */
    set transformWorld(t) {
        this.transformWorld.set(t);
        _wl_object_trans_world_to_local(this.objectId);
    }

    /** @returns {Float32Array} Local / object space scaling */
    get scalingLocal() {
        return new Float32Array(HEAPF32.buffer, _wl_object_scaling_local(this.objectId), 3);
    }

    /**
     * Set scaling local
     *
     * @param {number[]} t Global / world space transformation
     *
     * @since 0.8.7
     */
    set scalingLocal(s) {
        this.scalingLocal.set(s);
        this.setDirty();
    }

    /**
     * @returns {Float32Array} Global / world space scaling
     *
     * May recompute transformations of the hierarchy of this object,
     * if they were changed by JavaScript components this frame.
     */
    get scalingWorld() {
        return new Float32Array(HEAPF32.buffer, _wl_object_scaling_world(this.objectId), 3);
    }

    /**
     * Set scaling world
     *
     * @param {number[]} t Global / world space transformation
     *
     * @since 0.8.7
     */
    set scalingWorld(s) {
        this.scalingWorld.set(s);
        _wl_object_scaling_world_to_local(this.objectId);
    }

    /**
     * @returns {number[]} Local space rotation
     *
     * @since 0.8.7
     */
    get rotationLocal() {
        return this.transformLocal.subarray(0, 4);
    }

    /**
     * @returns {number[]} Global / world space rotation
     *
     * @since 0.8.7
     */
    get rotationWorld() {
        return this.transformWorld.subarray(0, 4);
    }

    /**
     * Set rotation local
     *
     * @param {number} r Local space rotation
     *
     * @since 0.8.7
     */
    set rotationLocal(r) {
        _wl_object_set_rotation_local(this.objectId, r[0], r[1], r[2], r[3]);
    }

    /**
     * Set rotation world
     *
     * @param {number} r Global / world space rotation
     *
     * @since 0.8.7
     */
    set rotationWorld(r) {
        _wl_object_set_rotation_world(this.objectId, r[0], r[1], r[2], r[3]);
    }

    /**
     * Compute the object's forward facing world space vector
     * @param {number[]} out Destination array/vector, expected to have at
     *                       least 3 elements.
     * @return {number[]} out
     */
    getForward(out) {
        out[0] = 0; out[1] = 0; out[2] = -1;
        this.transformVectorWorld(out);
        return out;
    }

    /**
     * Compute the object's up facing world space vector
     * @param {number[]} out Destination array/vector, expected to have at
     *                       least 3 elements.
     * @return {number[]} out
     */
    getUp(out) {
        out[0] = 0; out[1] = 1; out[2] = 0;
        this.transformVectorWorld(out);
        return out;
    }

    /**
     * Compute the object's right facing world space vector
     * @param {number[]} out Destination array/vector, expected to have at
     *                       least 3 elements.
     * @return {number[]} out
     */
    getRight(out) {
        out[0] = 1; out[1] = 0; out[2] = 0;
        this.transformVectorWorld(out);
        return out;
    }

    /**
     * Transform a vector by this object's world transform
     *
     * @param {number[]} out Out point
     * @param {number[]} v Point to transform, default `out`
     * @return {number[]} out
     *
     * @since 0.8.7
     */
    transformVectorWorld(out, v) {
        v = v || out;
        _tempMemFloat[0] = v[0];
        _tempMemFloat[1] = v[1];
        _tempMemFloat[2] = v[2];
        _wl_object_transformVectorWorld(this.objectId, _tempMem);
        out[0] = _tempMemFloat[0];
        out[1] = _tempMemFloat[1];
        out[2] = _tempMemFloat[2];

        return out;
    }

    /**
     * Transform a vector by this object's local transform
     *
     * @param {number[]} out Out point
     * @param {number[]} v Point to transform, default `out`
     * @return {number[]} out
     *
     * @since 0.8.7
     */
    transformVectorLocal(out, v) {
        v = v || out;
        _tempMemFloat[0] = v[0];
        _tempMemFloat[1] = v[1];
        _tempMemFloat[2] = v[2];
        _wl_object_transformVectorLocal(this.objectId, _tempMem);
        out[0] = _tempMemFloat[0];
        out[1] = _tempMemFloat[1];
        out[2] = _tempMemFloat[2];

        return out;
    }

    /**
     * Transform a point by this object's world transform
     *
     * @param {number[]} out Out point
     * @param {number[]} v Point to transform, default `out`
     * @return {number[]} out
     *
     * @since 0.8.7
     */
    transformPointWorld(out, p) {
        p = p || out;
        _tempMemFloat[0] = p[0];
        _tempMemFloat[1] = p[1];
        _tempMemFloat[2] = p[2];
        _wl_object_transformPointWorld(this.objectId, _tempMem);
        out[0] = _tempMemFloat[0];
        out[1] = _tempMemFloat[1];
        out[2] = _tempMemFloat[2];

        return out;
    }

    /**
     * Transform a point by this object's local transform
     *
     * @param {number[]} out Out point
     * @param {number[]} v Point to transform, default `out`
     * @return {number[]} out
     *
     * @since 0.8.7
     */
    transformPointLocal(out, p) {
        p = p || out;
        _tempMemFloat[0] = p[0];
        _tempMemFloat[1] = p[1];
        _tempMemFloat[2] = p[2];
        _wl_object_transformPointLocal(this.objectId, _tempMem);
        out[0] = _tempMemFloat[0];
        out[1] = _tempMemFloat[1];
        out[2] = _tempMemFloat[2];

        return out;
    }

    /**
     * Transform a vector by this object's inverse world transform
     *
     * @param {number[]} out Out point
     * @param {number[]} v Point to transform, default `out`
     * @return {number[]} out
     *
     * @since 0.8.7
     */
    transformVectorInverseWorld(out, v) {
        v = v || out;
        _tempMemFloat[0] = v[0];
        _tempMemFloat[1] = v[1];
        _tempMemFloat[2] = v[2];
        _wl_object_transformVectorInverseWorld(this.objectId, _tempMem);
        out[0] = _tempMemFloat[0];
        out[1] = _tempMemFloat[1];
        out[2] = _tempMemFloat[2];

        return out;
    }

    /**
     * Transform a point by this object's inverse local transform
     *
     * @param {number[]} out Out point
     * @param {number[]} v Point to transform, default `out`
     * @return {number[]} out
     *
     * @since 0.8.7
     */
    transformVectorInverseLocal(out, v) {
        v = v || out;
        _tempMemFloat[0] = v[0];
        _tempMemFloat[1] = v[1];
        _tempMemFloat[2] = v[2];
        _wl_object_transformVectorInverseLocal(this.objectId, _tempMem);
        out[0] = _tempMemFloat[0];
        out[1] = _tempMemFloat[1];
        out[2] = _tempMemFloat[2];

        return out;
    }

    /**
     * Transform a point by this object's inverse world transform
     *
     * @param {number[]} out Out point
     * @param {number[]} v Point to transform, default `out`
     * @return {number[]} out
     *
     * @since 0.8.7
     */
    transformPointInverseWorld(out, p) {
        p = p || out;
        _tempMemFloat[0] = p[0];
        _tempMemFloat[1] = p[1];
        _tempMemFloat[2] = p[2];
        _wl_object_transformPointInverseWorld(this.objectId, _tempMem);
        out[0] = _tempMemFloat[0];
        out[1] = _tempMemFloat[1];
        out[2] = _tempMemFloat[2];

        return out;
    }

    /**
     * Transform a point by this object's inverse local transform
     *
     * @param {number[]} out Out point
     * @param {number[]} p Point to transform, default `out`
     * @return {number[]} out
     *
     * @since 0.8.7
     */
    transformPointInverseLocal(out, p) {
        p = p || out;
        _tempMemFloat.set(p);
        _wl_object_transformPointInverseLocal(this.objectId, _tempMem);
        out[0] = _tempMemFloat[0];
        out[1] = _tempMemFloat[1];
        out[2] = _tempMemFloat[2];

        return out;
    }

    /**
     * Transform a object space dual quaternion into world space
     *
     * @param {number[]} out Out transformation
     * @param {number[]} q Local space transformation, default `out`
     * @return {number[]} out
     *
     * @since 0.8.7
     */
    toWorldSpaceTransform(out, q) {
        q = q || out;
        _tempMemFloat.set(q);
        _wl_object_toWorldSpaceTransform(this.objectId, _tempMem);
        out[0] = _tempMemFloat[0];
        out[1] = _tempMemFloat[1];
        out[2] = _tempMemFloat[2];
        out[3] = _tempMemFloat[3];

        out[4] = _tempMemFloat[4];
        out[5] = _tempMemFloat[5];
        out[6] = _tempMemFloat[6];
        out[7] = _tempMemFloat[7];

        return out;
    }

    /**
     * Transform a world space dual quaternion into local space
     *
     * @param {number[]} out Out transformation
     * @param {number[]} q World space transformation, default `out`
     * @return {number[]} out
     *
     * @since 0.8.7
     */
    toLocalSpaceTransform(out, q) {
        const p = this.parent;
        if(!p) {
            out[0] = q[0]; out[1] = q[1]; out[2] = q[2]; out[3] = q[3];
            out[4] = q[4]; out[5] = q[5]; out[6] = q[6]; out[7] = q[7];
        } else {
            p.toObjectSpaceTransform(q);
        }
        return out;
    }

    /**
     * Transform a world space dual quaternion into object space
     *
     * @param {number[]} out Out transformation
     * @param {number[]} q World space transformation, default `out`
     * @return {number[]} out
     *
     * @since 0.8.7
     */
    toObjectSpaceTransform(out, q) {
        q = q || out;
        _tempMemFloat.set(q);
        _wl_object_toObjectSpaceTransform(this.objectId, _tempMem);
        out[0] = _tempMemFloat[0];
        out[1] = _tempMemFloat[1];
        out[2] = _tempMemFloat[2];
        out[3] = _tempMemFloat[3];

        out[4] = _tempMemFloat[4];
        out[5] = _tempMemFloat[5];
        out[6] = _tempMemFloat[6];
        out[7] = _tempMemFloat[7];

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

    /** Destroy the object with all of its components and remove it from the scene */
    destroy() {
        _wl_scene_remove_object(this.objectId);
        this.objectId = null;
    }

    /**
     * Mark transformation dirty
     *
     * Causes an eventual recalculation of {@link $Object#transformWorld}, either
     * on next {@link $Object#getTranslationWorld}, {@link $Object#transformWorld} or
     * {@link $Object#scalingWorld} or the beginning of next frame, whichever
     * happens first.
     */
    setDirty() {
        _wl_object_set_dirty(this.objectId);
    }

    /**
     * Disable/enable all components of this object
     *
     * @param {boolean} b New state for the components
     * @since 0.8.5
     */
    set active(b) {
        const comps = this.getComponents();
        for(let c of comps) {
            c.active = b;
        }
    }

    /**
     * Get a component attached to this object
     * @param {string|Function} typeOrClass Type name. It's also possible to give a class definition.
     *     In this case, the method will use the `class.TypeName` field to find the component.
     * @param {number} index=0 Index for component of given type. This can be used to access specific
     *      components if the object has multiple components of the same type.
     * @returns {?(Component|CollisionComponent|TextComponent|ViewComponent|MeshComponent|InputComponent|LightComponent|AnimationComponent|PhysXComponent)} The component or {@link null} if there is no such component on this object
     */
    getComponent(typeOrClass, index) {
        const type = isString(typeOrClass) ? typeOrClass : typeOrClass.TypeName;
        const lengthBytes = lengthBytesUTF8(type) + 1;
        const mem = _malloc(lengthBytes);
        stringToUTF8(type, mem, lengthBytes);
        const componentType = _wl_get_component_manager_index(mem);
        _free(mem);

        if(componentType < 0) {
            /* Not a native component, try js: */
            const typeIndex = _WL._componentTypeIndices[type];
            const jsIndex = _wl_get_js_component_index(this.objectId, typeIndex, index || 0);
            return jsIndex < 0 ? null : _WL._components[jsIndex];
        }

        const componentId = _wl_get_component_id(this.objectId, componentType, index || 0);
        return _wrapComponent(type, componentType, componentId);
    }

    /**
     * @param {?string|Function} typeOrClass Type name, pass a falsey value (`undefined` or {@link null}) to retrieve all.
     *     It's also possible to give a class definition. In this case, the method will use the `class.TypeName` field to
     *     find the components.
     * @returns {Component[]} All components of given type attached to this object
     *
     * @note As this function is non-trivial, avoid using it in `update()` repeatedly,
     *      but rather store its result in `init()` or `start()`
     * @warning This method will currently return at most 341 components.
     */
    getComponents(typeOrClass) {
        let componentType = null;
        let type = null;
        if(typeOrClass) {
            type = isString(typeOrClass) ? typeOrClass : typeOrClass.TypeName;
            componentType = $Object._typeIndexFor(type);
        }
        const components = [];
        const maxComps = Math.floor(_tempMemSize/3*2);
        const componentsCount =
            _wl_object_get_components(this.objectId, _tempMem, maxComps);
        const offset = 2*componentsCount;
        _wl_object_get_component_types(this.objectId, _tempMem + offset, maxComps);

        const jsManagerIndex = $Object._typeIndexFor('js');
        for(let i = 0; i < componentsCount; ++i) {
            const t = _tempMemUint8[i + offset];
            const componentId = _tempMemUint16[i];
            /* Handle JS types separately */
            if(t == jsManagerIndex) {
                const comp = _WL._components[_wl_get_js_component_index_for_id(componentId)];
                if(componentType === null || comp.type == type) components.push(comp);
                continue;
            }

            if(componentType === null) {
                const managerName = $Object._typeNameFor(t);
                components.push(_wrapComponent(managerName, t, componentId));
            } else if(t == componentType) {
                /* Optimized manager name retrieval, already have type */
                components.push(_wrapComponent(type, componentType, componentId));
            }
        }
        return components;
    }

    /**
     * Add component of given type to the object
     *
     * You can use this function to clone components, see the example below.
     *
     * @example
     *  // Clone existing component (since 0.8.10)
     *  let original = this.object.getComponent('mesh');
     *  otherObject.addComponent('mesh', original);
     *  // Create component from parameters
     *  this.object.addComponent('mesh', {
     *      mesh: someMesh,
     *      material: someMaterial,
     *  });
     *
     * @param {string|Function} typeOrClass Typename to create a component of. Can be native or
     *     custom JavaScript component type. It's also possible to give a class definition.
     *     In this case, the method will use the `class.TypeName` field.
     * @param {object} [params] Parameters to initialize properties of the new component,
     *      can be another component to copy properties from.
     *
     * @returns {?(Component|CollisionComponent|TextComponent|ViewComponent|MeshComponent|InputComponent|LightComponent|AnimationComponent|PhysXComponent)} The component or {@link null} if the type was not found
     */
    addComponent(typeOrClass, params) {
        const type = isString(typeOrClass) ? typeOrClass : typeOrClass.TypeName;
        const componentType = $Object._typeIndexFor(type);
        let component = null;
        let componentIndex = null;
        if(componentType < 0) {
            /* JavaScript component */
            if(!(type in _WL._componentTypeIndices)) {
                throw new TypeError("Unknown component type '" + type + "'");
            }
            const componentId = _wl_object_add_js_component(this.objectId, _WL._componentTypeIndices[type]);
            componentIndex = _wl_get_js_component_index_for_id(componentId);
            component = _WL._components[componentIndex];
        } else {
            /* native component */
            const componentId = _wl_object_add_component(this.objectId, componentType);
            component = _wrapComponent(type, componentType, componentId);
        }

        if(params !== undefined) {
            for(const key in params) {
                /* active will be set later, other properties should be skipped if
                 * passing a component for cloning. */
                if(EXCLUDED_COMPONENT_PROPERTIES.includes(key)) continue;
                component[key] = params[key];
            }
        }

        /* Explicitly initialize native components */
        if(componentType < 0) {
            _wljs_component_init(componentIndex);
            /* start() is called through onActivate() */
        }

        /* If it was not explicitly requested by the user to leave the component inactive,
         * we activate it as a final step. This invalidates componentIndex! */
        if(!params || !('active' in params && !params.active)) {
            component.active = true;
        }

        return component;
    }

    /**
     * @returns {boolean} Whether given object's transformation has changed.
     */
    get changed() {
        return !!_wl_object_is_changed(this.objectId);
    }

    /**
     * Checks equality by comparing whether the wrapped native component ids
     * and component manager types are equal.
     *
     * @param {?$Object} otherObject Object to check equality with
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
     * @param {number} objectId Object ID to wrap
     * @returns {$Object} Wrapped object
     */
    static _wrapObject(objectId) {
        const o = ObjectCache[objectId] || (ObjectCache[objectId] = new $Object(objectId));
        o.objectId = objectId;
        return o;
    }
};

/**
 * Wrapper around a native skin data
 */
class Skin {
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
     * Dual quaternions in a flat array of size 8 times {@link Skin#jointCount}
     *
     * @returns {Float32Array} Inverse bind transforms of the skin
     */
    get inverseBindTransforms() {
        return new Float32Array(HEAPF32.buffer,
            _wl_skin_inverse_bind_transforms(this._index),
            8*this.jointCount);
    }

    /**
     * Vectors in a flat array of size 3 times {@link Skin#jointCount}
     *
     * @returns {Float32Array} Inverse bind scalings of the skin
     */
    get inverseBindScalings() {
        return new Float32Array(HEAPF32.buffer,
            _wl_skin_inverse_bind_scalings(this._index),
            3*this.jointCount);
    }
};
export { Skin };
/* Unfortunately, the name "Object" is reserved, so internally we
 * use $Object, while we expose WL.Object as previously. */
export { $Object as Object };

/**
 * @summary Ray hit
 *
 * Result of a {@link Scene#rayCast|ray cast}
 *
 * @param {number} ptr Pointer to the ray hits memory
 * @note this class wraps internal engine data and should only be created
 * internally.
 */
class RayHit {
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

    /** @returns {Float32Array[]} array of ray hit normals (only when using {@link Physics#rayCast} */
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

    /** @returns {$Object[]} Hit objects */
    get objects() {
        let p = this._ptr + (48*2 + 16);
        let objIds = new Uint16Array(HEAPU16.buffer, p, this.hitCount);
        return [
            objIds[0] <= 0 ? null : $Object._wrapObject(objIds[0]),
            objIds[1] <= 0 ? null : $Object._wrapObject(objIds[1]),
            objIds[2] <= 0 ? null : $Object._wrapObject(objIds[2]),
            objIds[3] <= 0 ? null : $Object._wrapObject(objIds[3]),
        ];
    }

    /** @returns {number} Number of hits (max 4) */
    get hitCount() {
        return Math.min(HEAPU32[(this._ptr/4) + 30], 4);
    }
};
export { RayHit };

class math {
    /** (Experimental!) Cubic Hermite spline interpolation for vector3 and quaternions.
     *
     * With `f == 0`, `out` will be `b`, if `f == 1`, `out` will be c.
     *
     * Whether a quaternion or vector3 interpolation is intended is determined by
     * length of `a`.
     *
     * @param {number[]} out Array to write result to
     * @param {number[]} a First tangent/handle
     * @param {number[]} b First point or quaternion
     * @param {number[]} c Second point or quaternion
     * @param {number[]} d Second handle
     * @param {number} f Interpolation factor in [0; 1]
     * @returns {number[]} out
     * @since 0.8.6
     */
    static cubicHermite(out, a, b, c, d, f) {
        _tempMemFloat.subarray(0).set(a);
        _tempMemFloat.subarray(4).set(b);
        _tempMemFloat.subarray(8).set(c);
        _tempMemFloat.subarray(12).set(d);

        const isQuat = a.length == 4;

        _wl_math_cubicHermite(
            _tempMem + 4*16,
            _tempMem + 4*0,
            _tempMem + 4*4,
            _tempMem + 4*8,
            _tempMem + 4*12,
            f, isQuat);
        out[0] = _tempMemFloat[16];
        out[1] = _tempMemFloat[17];
        out[2] = _tempMemFloat[18];
        if(isQuat) out[3] = _tempMemFloat[19];
        return out;
    }
}

export { math }

/**
 * Check if a given value is a native string or a `String` instance
 *
 * @param {Object} value The value to check
 * @returns `true` if the `value` has type string literal or `String`, `false` otherwise
 */
export function isString(value) {
    return value && (typeof value === 'string' || value.constructor === String);
}

/**
 * Retrieves a component instance if it exists, or create and cache
 * a new one
 *
 * @param {string} type component type name
 * @param {number} componentType Component manager index
 * @param {number} componentId Component id in the manager
 *
 * @returns {(CollisionComponent|TextComponent|ViewComponent|MeshComponent|InputComponent|LightComponent|AnimationComponent|PhysXComponent|Component)} JavaScript instance wrapping the native component
 */
export function _wrapComponent(type, componentType, componentId) {
    if(componentId < 0) return null;

    /* TODO: extremely slow in JS to do that... Better to use a Map or allocate the array. */
    const c = ComponentCache[componentType] || (ComponentCache[componentType] = []);
    if(c[componentId]) { return c[componentId]; }

    let component;
    if(type == 'collision') {
        component = new CollisionComponent();
    } else if(type == 'text') {
        component = new TextComponent();
    } else if(type == 'view') {
        component = new ViewComponent();
    } else if(type == 'mesh') {
        component = new MeshComponent();
    } else if(type == 'input') {
        component = new InputComponent();
    } else if(type == 'light') {
        component = new LightComponent();
    } else if(type == 'animation') {
        component = new AnimationComponent();
    } else if(type == 'physx') {
        component = new PhysXComponent();
    } else {
        const typeIndex = _WL._componentTypeIndices[type];
        const constructor =  _WL._componentTypes[typeIndex];
        component = new constructor();
    }
    /* Sets the manager and identifier from the outside, to
     * simplify the user's constructor. */
    component._manager = componentType;
    component._id = componentId;
    c[componentId] = component;
    return component;
}
