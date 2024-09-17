import {InMemoryLoadOptions, Scene, WonderlandEngine} from '@wonderlandengine/api';
import {fetchWithProgress, onImageReady} from '@wonderlandengine/api/utils/fetch.js';
import {projectURL} from './setup.js';

class ResourceLike {
    _index = -1;
    constructor(index: number) {
        this._index = index;
    }
    equals(other: ResourceLike) {
        return this._index === other._index;
    }
}

/**
 * Create a dummy image with dimensions `width * height`.
 *
 * @param width The image width
 * @param height The image height
 * @returns The image
 */
export function dummyImage(width: number, height: number): Promise<HTMLImageElement> {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const img = new Image(width, height);
    img.src = canvas.toDataURL();

    return onImageReady(img);
}

/**
 * Create a mocked {@link Scene} object.
 *
 * @param index Index of the scene
 * @returns An object with a similar structure to {@link Scene}.
 */
export function mockedScene(index: number = 0) {
    return new ResourceLike(index) as unknown as Scene;
}

/**
 * Load multiple project bins.
 *
 * @param filenames Name of each bin to load
 * @returns A promise that resolve with an array of object
 *     that can be used with {@link WonderlandEngine.loadSceneAsGroupFromMemory}
 *     and {@link SceneGroup.loadSceneFromBuffer}.
 */
export async function loadProjectBins(...filenames: string[]) {
    const bins: InMemoryLoadOptions[] = [];
    const promises: Promise<InMemoryLoadOptions>[] = [];
    for (const filename of filenames) {
        promises.push(
            fetchWithProgress(projectURL(filename)).then((buffer) => {
                return {filename, baseURL: projectURL(''), buffer};
            })
        );
    }
    return Promise.all(promises);
}
