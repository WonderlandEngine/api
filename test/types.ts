import {Material, Texture} from '..';

export interface PhongMaterial extends Material {
    shininess: number;
    diffuseTexture: Texture;
}
