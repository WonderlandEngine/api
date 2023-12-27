import {WonderlandEngine} from './engine.js';
import {Texture} from './wonderland.js';

/**
 * Manage textures.
 *
 * This manager is accessible on the engine instance using {@link WonderlandEngine.textures}.
 *
 * Usage:
 *
 * ```js
 * this.engine.load('path/to/texture.png').then((texture) => {
 *     console.log('Loaded!');
 *     console.log(texture);
 * })
 * ```
 */
export class TextureManager {
    /** Wonderland Engine instance. @hidden */
    protected readonly _engine: WonderlandEngine;

    /** Texture cache. @hidden */
    readonly #cache: (Texture | null)[] = [];

    /** @hidden */
    constructor(engine: WonderlandEngine) {
        this._engine = engine;
    }

    /** Hosting engine instance. */
    get engine() {
        return this._engine;
    }

    /**
     * Retrieve the texture with the given id.
     *
     * @param id The texture identifier.
     * @return The {@link Texture} if found, `null` otherwise.
     */
    get(id: number): Texture | null {
        return this.#cache[id] ?? null;
    }

    /**
     * Load an image from URL as {@link Texture}.
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
                let texture = new Texture(this._engine, image);
                if (!texture.valid) {
                    reject(
                        'Failed to add image ' +
                            image.src +
                            ' to texture atlas. Probably incompatible format.'
                    );
                }
                resolve(texture);
            };
            image.onerror = function () {
                reject('Failed to load image. Not found or no read access');
            };
        });
    }

    /**
     * Wrap a texture ID using {@link Texture}.
     *
     * @note This method performs caching and will return the same
     * instance on subsequent calls.
     *
     * @param id ID of the texture to create.
     *
     * @returns The texture.
     */
    wrap(id: number) {
        const texture =
            this.#cache[id] ?? (this.#cache[id] = new Texture(this._engine, id));
        (texture['_id'] as number) = id;
        return texture;
    }

    /** Number of textures allocated in the manager. */
    get allocatedCount() {
        return this.#cache.length;
    }

    /**
     * Number of textures in the manager.
     *
     * @note For performance reasons, avoid calling this method when possible.
     */
    get count() {
        let count = 0;
        for (const tex of this.#cache) {
            if (tex && tex.id >= 0) ++count;
        }
        return count;
    }

    /**
     * Set a new texture in the manager cache.
     *
     * @note This api is meant to be used internally.
     *
     * @param texture The texture to add.
     *
     * @hidden
     */
    _set(texture: Texture) {
        /* @todo: Destroy texture at previous id? */
        this.#cache[texture.id] = texture;
    }

    /**
     * Destroys the texture.
     *
     * @note This api is meant to be used internally.
     *
     * @param texture The texture to destroy.
     *
     * @hidden
     */
    _destroy(texture: Texture) {
        this._engine.wasm._wl_texture_destroy(texture.id);
        const img = texture['_imageIndex'];
        if (img !== null) {
            this._engine.wasm._images[img] = null;
        }
    }

    /**
     * Reset the manager.
     *
     * @note This api is meant to be used internally.
     *
     * @hidden
     */
    _reset() {
        this.#cache.length = 0;
    }
}
