import {Material, Texture} from '@wonderlandengine/api';

export interface PhongMaterial extends Material {
    shininess: number;
    diffuseTexture: Texture;
}
