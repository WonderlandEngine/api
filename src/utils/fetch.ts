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
    onProgress?: (current: number, total: number) => void
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
