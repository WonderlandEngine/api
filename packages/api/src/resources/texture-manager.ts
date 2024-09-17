import {WonderlandEngine} from '../index.js';
import {ImageLike} from '../types.js';
import {Texture} from '../wonderland.js';

import {ResourceManager, SceneResource} from './resource.js';

/**
 * Manage textures.
 *
 * #### Creation
 *
 * Creating a texture is done using {@link TextureManager.load}:
 *
 * ```js
 * const texture = await engine.textures.load('my-image.png');
 * ```
 *
 * Alternatively, textures can be created directly via a loaded image using
 * {@link TextureManager.create}.
 *
 * @since 1.2.0
 */
export class TextureManager extends ResourceManager<Texture> {
    constructor(engine: WonderlandEngine) {
        super(engine, Texture);
    }

    /**
     * Create a new texture from an image or video.
     *
     * #### Usage
     *
     * ```js
     * const img = new Image();
     * img.load = function(img) {
     *     const texture = engine.textures.create(img);
     * };
     * img.src = 'my-image.png';
     * ```
     *
     * @note The media must already be loaded. To automatically
     * load the media and create a texture, use {@link TextureManager.load} instead.
     *
     * @param image Media element to create the texture from.
     * @ret\urns The new texture with the media content.
     */
    create(image: ImageLike): Texture {
        const wasm = this.engine.wasm;

        const jsImageIndex = wasm._images.length;
        wasm._images.push(image);

        if (image instanceof HTMLImageElement && !image.complete) {
            throw new Error('image must be ready to create a texture');
        }

        const width = (image as HTMLVideoElement).videoWidth ?? image.width;
        const height = (image as HTMLVideoElement).videoHeight ?? image.height;

        const imageIndex = wasm._wl_image_create(jsImageIndex, width, height);

        /* Required because the image isn't a resource by itself, but will eventually be one. */
        const index = wasm._wl_texture_create(imageIndex);

        const instance = new Texture(this.engine, index);
        this._cache[instance.index] = instance;
        return instance;
    }

    /**
     * Load an image from URL as {@link Texture}.
     *
     * #### Usage
     *
     * ```js
     * const texture = await engine.textures.load('my-image.png');
     * ```
     *
     * @param filename URL to load from.
     * @param crossOrigin Cross origin flag for the image object.
     * @returns Loaded texture.
     */
    load(filename: string, crossOrigin?: string): Promise<Texture> {
        let image = new Image();
        image.crossOrigin = crossOrigin ?? image.crossOrigin;
        image.src = filename;
        return new Promise((resolve, reject) => {
            image.onload = () => {
                resolve(this.create(image));
            };
            image.onerror = function () {
                reject('Failed to load image. Not found or no read access');
            };
        });
    }
}
