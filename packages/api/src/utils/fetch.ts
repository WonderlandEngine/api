import {ImageLike, ProgressCallback} from '../types.js';

/**
 * Transformer for {@link TransformStream} that passes read progress to a
 * callback.
 *
 * Invokes the callback for each streamed chunk, and one final time when the
 * stream closes.
 *
 * @hidden
 */
class FetchProgressTransformer implements Transformer<Uint8Array, Uint8Array> {
    #progress = 0;
    #callback: ProgressCallback;
    #totalSize: number;

    /**
     * Constructor.
     * @param callback Callback that receives the progress.
     * @param totalSize Total size of the data. Pass 0 to indicate that the
     *     size is unknown, then the callback will only be called once after
     *     all data was transferred.
     */
    constructor(callback: ProgressCallback, totalSize = 0) {
        this.#callback = callback;
        this.#totalSize = totalSize;
    }

    transform(chunk: Uint8Array, controller: TransformStreamDefaultController<Uint8Array>) {
        controller.enqueue(chunk);
        this.#progress += chunk.length;
        if (this.#totalSize > 0) {
            this.#callback(this.#progress, this.#totalSize);
        }
    }

    flush() {
        this.#callback(this.#progress, this.#progress);
    }
}

/**
 * Sink for `WritableStream` that writes data to an `ArrayBuffer`.
 *
 * @hidden
 */
export class ArrayBufferSink implements UnderlyingSink<Uint8Array> {
    #buffer: Uint8Array;
    #offset = 0;

    /**
     * Constructor.
     * @param size Initial size of the buffer. If less than the received data,
     *     the buffer is dynamically reallocated.
     */
    constructor(size = 0) {
        this.#buffer = new Uint8Array(size);
    }

    /** Get the received data as an `ArrayBuffer`. */
    get arrayBuffer() {
        const arrayBuffer = this.#buffer.buffer;
        if (this.#offset < arrayBuffer.byteLength) {
            return arrayBuffer.slice(0, this.#offset);
        }
        return arrayBuffer;
    }

    write(chunk: Uint8Array) {
        const newLength = this.#offset + chunk.length;
        if (newLength > this.#buffer.length) {
            const newBuffer = new Uint8Array(
                Math.max(this.#buffer.length * 1.5, newLength)
            );
            newBuffer.set(this.#buffer);
            this.#buffer = newBuffer;
        }
        this.#buffer.set(chunk, this.#offset);
        this.#offset = newLength;
    }
}

/**
 * Source for `ReadableStream` that reads data from an`ArrayBuffer`.
 *
 * @hidden
 */
export class ArrayBufferSource implements UnderlyingSource<Uint8Array> {
    #buffer: ArrayBuffer;

    /**
     * Constructor.
     * @param buffer Buffer to read from.
     */
    constructor(buffer: ArrayBuffer) {
        this.#buffer = buffer;
    }

    start(controller: ReadableStreamController<Uint8Array>) {
        if (this.#buffer.byteLength > 0) {
            controller.enqueue(new Uint8Array(this.#buffer));
        }
        controller.close();
    }
}

/**
 * Fetch a file as an `ArrayBuffer`, with fetch progress passed to a callback.
 *
 * @param path Path of the file to fetch.
 * @param onProgress Callback receiving the current fetch progress and total
 *     size, in bytes. Also called a final time on completion.
 * @param signal Abort signal passed to `fetch()`.
 * @returns Promise that resolves when the fetch successfully completes.
 */
export async function fetchWithProgress(
    path: string,
    onProgress?: ProgressCallback,
    signal?: AbortSignal
): Promise<ArrayBuffer> {
    const res = await fetch(path, {signal});
    if (!res.ok) throw res.statusText;
    if (!onProgress || !res.body) return res.arrayBuffer();
    let size = Number(res.headers.get('Content-Length') ?? 0);
    if (Number.isNaN(size)) size = 0;
    const sink = new ArrayBufferSink(size);
    await res.body
        .pipeThrough(new TransformStream(new FetchProgressTransformer(onProgress, size)))
        .pipeTo(new WritableStream(sink));
    return sink.arrayBuffer;
}

/**
 * Fetch a file as a `ReadableStream`, with fetch progress passed to a
 * callback.
 *
 * @param path Path of the file to fetch.
 * @param onProgress Callback receiving the current fetch progress and total
 *     size, in bytes. Also called a final time on completion.
 * @param signal Abort signal passed to `fetch()`.
 * @returns Promise that resolves when the fetch successfully completes.
 */
export async function fetchStreamWithProgress(
    path: string,
    onProgress?: ProgressCallback,
    signal?: AbortSignal
): Promise<ReadableStream<Uint8Array>> {
    const res = await fetch(path, {signal});
    if (!res.ok) throw res.statusText;
    const body = res.body ?? new ReadableStream();
    let size = Number(res.headers.get('Content-Length') ?? 0);
    if (Number.isNaN(size)) size = 0;
    if (!onProgress) return body;
    const stream = body.pipeThrough(
        new TransformStream(new FetchProgressTransformer(onProgress, size))
    );
    return stream;
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
