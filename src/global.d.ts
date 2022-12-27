/**
 * WL WebAssembly interface.
 */
interface WebAssemblyWL {
    /* Contains instantiated components.
     * Stored as `any` until the wasm is fully decentralized from WL.
     */
    _components: any[];
    _componentTypes: {new (...args: any[]): any}[];
    _componentTypeIndices: Record<string, number>;
    _materialDefinitions: Map<
        string | symbol,
        {
            index: number;
            type: {
                type: number;
                componentCount: number;
                metaType: number;
            };
        }
    >[];

    UTF8ViewToString(beginPtr: number, endPtr: number): string;

    reset(): void;
    registerComponent(
        name: string | {new: () => any},
        params?: {[key: string]: any},
        object?: any
    ): number;
}

/**
 * WL WebAssembly exports.
 */

declare const _WL: WebAssemblyWL;

/**
 * Emsripten exports.
 */

interface Window {
    Module: {
        worker?: string;
        wasm: ArrayBuffer;
        ready?: () => void;
    };
}

declare const HEAP8: Int8Array;
declare const HEAPU8: Uint8Array;
declare const HEAPU16: Uint16Array;
declare const HEAPU32: Uint32Array;
declare const HEAP32: Int32Array;
declare const HEAPF32: Float32Array;

declare function assert(condition: boolean, msg?: string): void;
declare function _free(ptr: number): void;
declare function _malloc(size: number): number;
declare function lengthBytesUTF8(str: string): number;
declare function stringToUTF8(str: string, outPtr: number, len: number): void;
declare function UTF8ToString(ptr: number): string;

declare function _wl_application_start(): void;
declare function _wl_scene_get_active_views(ptr: number, count: number): number;
declare function _wl_scene_ray_cast(
    x: number,
    y: number,
    z: number,
    dx: number,
    dy: number,
    dz: number,
    group: number,
    outPtr: number
): void;
declare function _wl_scene_add_object(parentId: number): number;
declare function _wl_scene_add_objects(
    parentId: number,
    count: number,
    componentCountHint: number,
    ptr: number,
    size: number
): number;
declare function _wl_scene_reserve_objects(objectCount: number, _tempMem: number): void;
declare function _wl_scene_set_clearColor(r: number, g: number, b: number, a: number): void;
declare function _wl_scene_enableColorClear(b: boolean): void;
declare function _wl_load_scene(ptr: number): void;
declare function _wl_append_scene(
    ptr: number,
    loadGltfExtensions: boolean,
    callback: number
): void;
declare function _wl_scene_reset(): void;
declare function _wl_component_get_object(manager: number, id: number): number;
declare function _wl_component_setActive(
    manager: number,
    id: number,
    active: boolean
): void;
declare function _wl_component_isActive(manager: number, id: number): number;
declare function _wl_component_remove(manager: number, id: number): void;
declare function _wl_collision_component_get_collider(id: number): number;
declare function _wl_collision_component_set_collider(id: number, collider: number): void;
declare function _wl_collision_component_get_extents(id: number): number;
declare function _wl_collision_component_get_group(id: number): number;
declare function _wl_collision_component_set_group(id: number, group: number): void;
declare function _wl_collision_component_query_overlaps(
    id: number,
    outPtr: number,
    outCount: number
): number;
declare function _wl_text_component_get_horizontal_alignment(id: number): number;
declare function _wl_text_component_set_horizontal_alignment(
    id: number,
    alignment: number
): void;
declare function _wl_text_component_get_vertical_alignment(id: number): number;
declare function _wl_text_component_set_vertical_alignment(
    id: number,
    justification: number
): void;
declare function _wl_text_component_get_character_spacing(id: number): number;
declare function _wl_text_component_set_character_spacing(
    id: number,
    spacing: number
): void;
declare function _wl_text_component_get_line_spacing(id: number): number;
declare function _wl_text_component_set_line_spacing(id: number, spacing: number): void;
declare function _wl_text_component_get_effect(id: number): number;
declare function _wl_text_component_set_effect(id: number, spacing: number): void;
declare function _wl_text_component_get_text(id: number): number;
declare function _wl_text_component_set_text(id: number, ptr: number): void;
declare function _wl_text_component_set_material(id: number, materialId: number): void;
declare function _wl_text_component_get_material(id: number): number;
declare function _wl_view_component_get_projection_matrix(id: number): number;
declare function _wl_view_component_get_near(id: number): number;
declare function _wl_view_component_set_near(id: number, near: number): void;
declare function _wl_view_component_get_far(id: number): number;
declare function _wl_view_component_set_far(id: number, far: number): void;
declare function _wl_view_component_get_fov(id: number): number;
declare function _wl_view_component_set_fov(id: number, fov: number): void;
declare function _wl_input_component_get_type(id: number): number;
declare function _wl_input_component_set_type(id: number, type: number): void;
declare function _wl_light_component_get_color(id: number): number;
declare function _wl_light_component_get_type(id: number): number;
declare function _wl_light_component_set_type(id: number, type: number): void;
declare function _wl_animation_component_get_animation(id: number): number;
declare function _wl_animation_component_set_animation(id: number, animId: number): void;
declare function _wl_animation_component_get_playCount(id: number): number;
declare function _wl_animation_component_set_playCount(id: number, count: number): void;
declare function _wl_animation_component_get_speed(id: number): number;
declare function _wl_animation_component_set_speed(id: number, speed: number): void;
declare function _wl_animation_component_play(id: number): void;
declare function _wl_animation_component_stop(id: number): void;
declare function _wl_animation_component_pause(id: number): void;
declare function _wl_animation_component_state(id: number): number;
declare function _wl_mesh_component_get_material(id: number): number;
declare function _wl_mesh_component_set_material(id: number, materialId: number): void;
declare function _wl_mesh_component_get_mesh(id: number): number;
declare function _wl_mesh_component_set_mesh(id: number, meshId: number): void;
declare function _wl_mesh_component_get_skin(id: number): number;
declare function _wl_mesh_component_set_skin(id: number, skinId: number): void;
declare function _wl_physx_component_get_static(id: number): number;
declare function _wl_physx_component_set_static(id: number, static: boolean): void;
declare function _wl_physx_component_get_kinematic(id: number): number;
declare function _wl_physx_component_set_kinematic(id: number, kinematic: boolean): void;
declare function _wl_physx_component_get_shape(id: number): number;
declare function _wl_physx_component_set_shape(id: number, shape: number): void;
declare function _wl_physx_component_get_shape_data(id: number): number;
declare function _wl_physx_component_set_shape_data(id: number, shapeIndex: number): void;
declare function _wl_physx_component_get_extents(id: number): number;
declare function _wl_physx_component_get_staticFriction(id: number): number;
declare function _wl_physx_component_set_staticFriction(id: number, value: number): void;
declare function _wl_physx_component_get_dynamicFriction(id: number): number;
declare function _wl_physx_component_set_dynamicFriction(id: number, value: number): void;
declare function _wl_physx_component_get_bounciness(id: number): number;
declare function _wl_physx_component_set_bounciness(id: number, value: number): void;
declare function _wl_physx_component_get_linearDamping(id: number): number;
declare function _wl_physx_component_set_linearDamping(id: number, value: number): void;
declare function _wl_physx_component_get_angularDamping(id: number): number;
declare function _wl_physx_component_set_angularDamping(id: number, value: number): void;
declare function _wl_physx_component_get_linearVelocity(id: number, ptr: number): number;
declare function _wl_physx_component_set_linearVelocity(
    id: number,
    x: number,
    y: number,
    z: number
): void;
declare function _wl_physx_component_get_angularVelocity(id: number, ptr: number): number;
declare function _wl_physx_component_set_angularVelocity(
    id: number,
    x: number,
    y: number,
    z: number
): void;
declare function _wl_physx_component_get_mass(id: number): number;
declare function _wl_physx_component_set_mass(id: number, value: number): void;
declare function _wl_physx_component_set_massSpaceInertiaTensor(
    id: number,
    x: number,
    y: number,
    z: number
): void;
declare function _wl_physx_component_addForce(
    id: number,
    x: number,
    y: number,
    z: number,
    mode: number,
    localForce: boolean
): void;
declare function _wl_physx_component_addForceAt(
    id: number,
    x: number,
    y: number,
    z: number,
    mode: number,
    localForce: boolean,
    posX: number,
    posY: number,
    posZ: number,
    local: boolean
): void;
declare function _wl_physx_component_addTorque(
    id: number,
    x: number,
    y: number,
    z: number,
    mode: number
): void;
declare function _wl_physx_component_addCallback(id: number, otherId: number): number;
declare function _wl_physx_component_removeCallback(id: number, callbackId: number): number;
declare function _wl_physx_ray_cast(
    x: number,
    y: number,
    z: number,
    dx: number,
    dy: number,
    dz: number,
    group: number,
    maxDistance: number,
    outPtr: number
): void;
declare function _wl_mesh_create(
    indicesPtr: number,
    indicesSize: number,
    indexType: number,
    vertexCount: number,
    skinned: boolean
): number;
declare function _wl_mesh_get_vertexData(id: number, outPtr: number): number;
declare function _wl_mesh_get_vertexCount(id: number): number;
declare function _wl_mesh_get_indexData(id: number, outPtr: number, count: number): number;
declare function _wl_mesh_update(id: number): void;
declare function _wl_mesh_get_boundingSphere(id: number, outPtr: number): void;
declare function _wl_mesh_get_attribute(
    id: number,
    attribute: number,
    outPtr: number
): void;
declare function _wl_mesh_destroy(id: number): void;
declare function _wl_mesh_get_attribute_values(
    attribute: number,
    srcFormatSize: number,
    srcPtr: number,
    srcStride: number,
    dstFormatSize: number,
    destPtr: number,
    dstSize: number
): void;
declare function _wl_mesh_set_attribute_values(
    attribute: number,
    srcFormatSize: number,
    srcPtr: number,
    srcSize: number,
    dstFormatSize: number,
    destPtr: number,
    destStride: number
): void;
declare function _wl_material_create(ptr: number): number;
declare function _wl_material_get_definition(id: number): number;
declare function _wl_material_get_shader(id: number): number;
declare function _wl_material_clone(id: number): number;
declare function _wl_material_get_param_index(id: number, namePtr: number): number;
declare function _wl_material_get_param_type(id: number, paramId: number): number;
declare function _wl_material_get_param_value(
    id: number,
    paramId: number,
    outPtr: number
): number;
declare function _wl_material_set_param_value_uint(
    id: number,
    paramId: number,
    valueId: number
): void;
declare function _wl_material_set_param_value_float(
    id: number,
    paramId: number,
    ptr: number,
    count: number
): void;
declare function _wl_renderer_addImage(id: number): number;
declare function _wl_renderer_updateImage(id: number, imageId: number): void;
declare function _wl_texture_width(id: number): number;
declare function _wl_texture_height(id: number): number;
declare function _wl_renderer_updateImage(
    id: number,
    imageIndex: number,
    xOffset: number,
    yOffset: number
): void;
declare function _wl_texture_destroy(id: number): void;
declare function _wl_animation_get_duration(id: number): number;
declare function _wl_animation_get_trackCount(id: number): number;
declare function _wl_animation_retargetToSkin(id: number, targetId: number): number;
declare function _wl_animation_retarget(id: number, ptr: number): number;
declare function _wl_object_name(id: number): number;
declare function _wl_object_set_name(id: number, ptr: number): void;
declare function _wl_object_parent(id: number): number;
declare function _wl_object_get_children_count(id: number): number;
declare function _wl_object_get_children(id: number, outPtr: number, count: number): number;
declare function _wl_object_set_parent(id: number, parentId: number): void;
declare function _wl_object_reset_translation_rotation(id: number): void;
declare function _wl_object_reset_scaling(id: number): void;
declare function _wl_object_reset_translation_rotation(id: number): void;
declare function _wl_object_reset_rotation(id: number): void;
declare function _wl_object_reset_translation(id: number): void;
declare function _wl_object_reset_scaling(id: number): void;
declare function _wl_object_translate(id: number, x: number, y: number, z: number): void;
declare function _wl_object_translate_obj(
    id: number,
    x: number,
    y: number,
    z: number
): void;
declare function _wl_object_translate_world(
    id: number,
    x: number,
    y: number,
    z: number
): void;
declare function _wl_object_rotate_axis_angle(
    id: number,
    x: number,
    y: number,
    z: number,
    deg: number
): void;
declare function _wl_object_rotate_axis_angle_rad(
    id: number,
    x: number,
    y: number,
    z: number,
    rad: number
): void;
declare function _wl_object_rotate_axis_angle_obj(
    id: number,
    x: number,
    y: number,
    z: number,
    deg: number
): void;
declare function _wl_object_rotate_axis_angle_rad_obj(
    id: number,
    x: number,
    y: number,
    z: number,
    rad: number
): void;
declare function _wl_object_rotate_quat(
    id: number,
    x: number,
    y: number,
    z: number,
    w: number
): void;
declare function _wl_object_rotate_quat_obj(
    id: number,
    x: number,
    y: number,
    z: number,
    w: number
): void;
declare function _wl_object_scale(id: number, x: number, y: number, z: number): void;
declare function _wl_object_trans_local(id: number): number;
declare function _wl_object_get_translation_local(id: number, outPtr: number): void;
declare function _wl_object_set_translation_local(
    id: number,
    x: number,
    y: number,
    z: number
): void;
declare function _wl_object_get_translation_world(id: number, outPtr: number): void;
declare function _wl_object_set_translation_world(
    id: number,
    x: number,
    y: number,
    z: number
): void;
declare function _wl_object_trans_world(id: number): number;
declare function _wl_object_trans_world_to_local(id: number): number;
declare function _wl_object_scaling_local(id: number): number;
declare function _wl_object_scaling_world(id: number): number;
declare function _wl_object_scaling_world_to_local(id: number): number;
declare function _wl_object_set_rotation_local(
    id: number,
    x: number,
    y: number,
    z: number,
    w: number
): void;
declare function _wl_object_set_rotation_world(
    id: number,
    x: number,
    y: number,
    z: number,
    w: number
): void;
declare function _wl_object_transformVectorWorld(id: number, ptr: number): number;
declare function _wl_object_transformVectorLocal(id: number, ptr: number): number;
declare function _wl_object_transformPointWorld(id: number, ptr: number): number;
declare function _wl_object_transformPointLocal(id: number, ptr: number): number;
declare function _wl_object_transformVectorInverseWorld(id: number, ptr: number): number;
declare function _wl_object_transformVectorInverseLocal(id: number, ptr: number): number;
declare function _wl_object_transformPointInverseWorld(id: number, ptr: number): number;
declare function _wl_object_transformPointInverseLocal(id: number, ptr: number): number;
declare function _wl_object_toWorldSpaceTransform(id: number, ptr: number): number;
declare function _wl_object_toObjectSpaceTransform(id: number, ptr: number): number;
declare function _wl_object_lookAt(
    id: number,
    x: number,
    y: number,
    z: number,
    upX: number,
    upY: number,
    upZ: number
): void;
declare function _wl_scene_remove_object(id: number): void;
declare function _wl_object_set_dirty(id: number): void;
declare function _wl_get_component_manager_index(ptr: number): number;
declare function _wl_get_js_component_index(
    id: number,
    outPtr: number,
    count: number
): number;
declare function _wl_get_js_component_index_for_id(id: number): number;
declare function _wl_get_component_id(id: number, managerId: number, index: number): number;
declare function _wl_object_get_components(
    id: number,
    outPtr: number,
    count: number
): number;
declare function _wl_object_get_component_types(
    id: number,
    outPtr: number,
    count: number
): void;
declare function _wl_object_add_js_component(id: number, typeId: number): number;
declare function _wl_object_add_component(id: number, typeId: number): number;
declare function _wljs_component_init(id: number): void;
declare function _wl_object_is_changed(id: number): number;
declare function _wl_component_manager_name(id: number): number;
declare function _wl_skin_get_joint_count(id: number): number;
declare function _wl_skin_joint_ids(id: number): number;
declare function _wl_skin_inverse_bind_transforms(id: number): number;
declare function _wl_skin_inverse_bind_scalings(id: number): number;
declare function _wl_math_cubicHermite(
    a: number,
    b: number,
    c: number,
    d: number,
    f: number,
    e: number,
    isQuat: boolean
): void;
