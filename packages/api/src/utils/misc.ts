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

/**
 * Capitalize the first letter in a string.
 *
 * @note The string must be UTF-8.
 *
 * @param str The string to format.
 * @returns The string with the first letter capitalized.
 */
export function capitalizeFirstUTF8(str: string) {
    return `${str[0].toUpperCase()}${str.substring(1)}`;
}

/**
 * Create a proxy throwing destroyed errors upon access.
 *
 * @param type The type to display upon error
 * @returns The proxy instance
 */
export function createDestroyedProxy(type: string) {
    return new Proxy(
        {},
        {
            get(_, param: string) {
                if (param === 'isDestroyed') return true;
                throw new Error(`Cannot read '${param}' of destroyed ${type}`);
            },
            set(_, param: string) {
                throw new Error(`Cannot write '${param}' of destroyed ${type}`);
            },
        }
    );
}
