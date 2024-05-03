import {ImageLike, ProgressCallback} from '../types.js';

/**
 * Fetch a file as an `ArrayBuffer`, with fetch progress passed to a callback.
 *
 * @param path Path of the file to fetch
 * @param onProgress Callback receiving the current fetch progress and total
 *     size, in bytes. Also called a final time on completion.
 * @returns Promise that resolves when the fetch successfully completes
 */
export function fetchWithProgress(
    path: string,
    onProgress?: ProgressCallback
): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', path);
        xhr.responseType = 'arraybuffer';
        xhr.onprogress = (progress) => {
            if (progress.lengthComputable) {
                onProgress?.(progress.loaded, progress.total);
            }
        };
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                const buffer = xhr.response as ArrayBuffer;
                onProgress?.(buffer.byteLength, buffer.byteLength);
                resolve(buffer);
            } else {
                reject(xhr.statusText);
            }
        };
        xhr.onerror = () => reject(xhr.statusText);
        xhr.send();
    });
}

/**
 * Get parent path from a URL.
 *
 * @param url URL to get the parent from.
 * @returns Parent URL without trailing slash.
 */
export function getBaseUrl(url: string): string {
    return url.substring(0, url.lastIndexOf('/'));
}

/**
 * Get the filename of a url.
 *
 * @param url The url to extract the name from.
 * @returns A string containing the filename. If no filename is found,
 *     returns the input string.
 */
export function getFilename(url: string): string {
    if (url.endsWith('/')) {
        /* Remove trailing slash. */
        url = url.substring(0, url.lastIndexOf('/'));
    }
    const lastSlash = url.lastIndexOf('/');
    if (lastSlash < 0) return url;
    return url.substring(lastSlash + 1);
}

/**
 * Promise resolved once the image is ready to be used
 *
 * @param image The image, video, or canvas to wait for.
 * @returns A promise with the image, once it's ready to be used.
 */
export function onImageReady<T extends ImageLike>(image: T): Promise<T> {
    return new Promise((res, rej) => {
        if (image instanceof HTMLCanvasElement) {
            res(image);
        } else if (image instanceof HTMLVideoElement) {
            if (image.readyState >= 2) {
                res(image as T);
                return;
            }
            image.addEventListener(
                'loadeddata',
                () => {
                    if (image.readyState >= 2) res(image);
                },
                {once: true}
            );
            return;
        } else if ((image as HTMLImageElement).complete) {
            res(image);
            return;
        }
        image.addEventListener('load', () => res(image), {once: true});
        image.addEventListener('error', rej, {once: true});
    });
}
