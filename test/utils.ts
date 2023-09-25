/**
 * Promise that resolves when the image is loaded.
 *
 * If the image fails to load, the promise will be
 * rejected with the error.
 *
 * @param img The image to wait for
 * @returns A promise wrapping the image on success,
 *     an error otherwise.
 */
export function imagePromise<T extends HTMLImageElement | HTMLCanvasElement>(
    image: T | null
): Promise<T> {
    if (!image) return Promise.reject('image is null');
    if (image instanceof HTMLCanvasElement) return Promise.resolve(image);

    const img = image as HTMLImageElement;
    if (img.complete) return Promise.resolve(img as T);

    return new Promise((res, rej) => {
        function success() {
            img.removeEventListener('load', success);
            res(img as T);
        }
        function error(e: ErrorEvent) {
            img.removeEventListener('error', error);
            rej(e);
        }
        img.addEventListener('error', error);
        img.addEventListener('load', success);
    });
}

/**
 * Create a dummy image with dimensiosn `width * height`.
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

    return imagePromise(img);
}
