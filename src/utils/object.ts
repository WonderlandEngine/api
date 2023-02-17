/**
 * Check if a given value is a native string or a `String` instance.
 *
 * @param value The value to check.
 * @returns `true` if the `value` has type string literal or `String`, `false` otherwise.
 */
export function isString(value: unknown) {
    if (value === '') return true;
    return value && (typeof value === 'string' || value.constructor === String);
}
