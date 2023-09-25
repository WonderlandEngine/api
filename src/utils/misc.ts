/**
 * Schedule a timeout, resolving in `time` milliseconds.
 *
 * @note `setTimeout` being a macro-task, this method can
 * be use as a debounce call.
 *
 * @param time The time until it resolves, in milliseconds.
 * @returns A promise resolving in `time` ms.
 */
export function timeout(time: number): Promise<void> {
    return new Promise((res) => setTimeout(res, time));
}

/**
 * Clamp the value in the range [min; max].
 *
 * @param val The value to clamp.
 * @param min The minimum value (inclusive).
 * @param max The maximum value (inclusive).
 * @returns The clamped value.
 */
export function clamp(val: number, min: number, max: number): number {
    return Math.max(Math.min(max, val), min);
}
