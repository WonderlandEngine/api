import {ImageLike} from '../types.js';

/**
 * Check if a given value is a native string or a `String` instance.
 *
 * @param value The value to check.
 * @returns `true` if the `value` has type string literal or `String`, `false` otherwise.
 */
export function isString(value: any): value is string {
    if (value === '') return true;
    return value && (typeof value === 'string' || value.constructor === String);
}

/**
 * Check if a given value is a native number or a `Number` instance.
 *
 * @param value The value to check.
 * @returns `true` if the `value` has type number literal or `Number`, `false` otherwise.
 */
export function isNumber(value: any): value is number {
    if (value === null || value === undefined) return false;
    return typeof value === 'number' || value.constructor === Number;
}

/**
 * Check whether a given value is a visual media.
 *
 * @param value The value to check
 * @returns `true` if the `value` is an image, video, or canvas.
 */
export function isImageLike(value: any): value is ImageLike {
    return (
        value instanceof HTMLImageElement ||
        value instanceof HTMLVideoElement ||
        value instanceof HTMLCanvasElement
    );
}
