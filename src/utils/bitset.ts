/**
 * Assert that the given bit index is less than 32.
 *
 * @param bit The bit to test.
 */
function assert(bit: number): void {
    if (bit >= 32) {
        throw new Error(`BitSet.enable(): Value ${bit} is over 31`);
    }
}

/**
 * Stores a bit pattern to quickly test if an index is enabled / disabled.
 *
 * This class can store up to **32** different values in the range [0; 31].
 *
 * #### Usage
 *
 * ```js
 * const bitset = new BitSet();
 * bitset.enable(10); // Enable bit at index `10`.
 * console.log(bitset.enabled(10)); // Prints 'true'.
 * ```
 *
 * #### TypeScript
 *
 * The set can be typed over an enum:
 *
 * ```ts
 * enum Tag {
 *     First = 0,
 *     Second = 1,
 * }
 *
 * const bitset = new BitSet<Tag>();
 * bitset.enable(Tag.First);
 * ```
 */
export class BitSet<T extends number = number> {
    /** Enabled bits. @hidden */
    private _bits: number = 0;

    /**
     * Enable the bit at the given index.
     *
     * @param bits A spread of all the bits to enable.
     * @returns Reference to self (for method chaining).
     */
    enable(...bits: T[]) {
        for (const bit of bits) {
            assert(bit);
            /* Casts the result to an unsigned integer */
            this._bits |= (1 << bit) >>> 0;
        }
        return this;
    }

    /**
     * Enable all bits.
     *
     * @returns Reference to self (for method chaining).
     */
    enableAll() {
        this._bits = ~0;
        return this;
    }

    /**
     * Disable the bit at the given index.
     *
     * @param bits A spread of all the bits to disable.
     * @returns Reference to self (for method chaining).
     */
    disable(...bits: T[]) {
        for (const bit of bits) {
            assert(bit);
            /* Casts the result to an unsigned integer */
            this._bits &= ~((1 << bit) >>> 0);
        }
        return this;
    }

    /**
     * Disable all bits.
     *
     * @returns Reference to self (for method chaining).
     */
    disableAll() {
        this._bits = 0;
        return this;
    }

    /**
     * Checker whether the bit is set or not.
     *
     * @param bit The bit to check.
     * @returns `true` if it's enabled, `false` otherwise.
     */
    enabled(bit: T) {
        return !!(this._bits & ((1 << bit) >>> 0));
    }
}
