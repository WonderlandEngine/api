/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014-2016 Patrick Gansterer <paroga@paroga.com>
 * Copyright (c) 2020-2023 Aaron Huggins <ahuggins@aaronhuggins.com>
 * Copyright (c) 2024 Wonderland GmbH <contact@wonderlandengine.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

const kCborTagBignum = 2;
const kCborTagNegativeBignum = 3;
/* RFC 8746 Tag values for typed little-endian arrays */
const kCborTagUint8 = 64;
const kCborTagUint16 = 69;
const kCborTagUint32 = 70;
const kCborTagUint64 = 71;
const kCborTagInt8 = 72;
const kCborTagInt16 = 77;
const kCborTagInt32 = 78;
const kCborTagInt64 = 79;
const kCborTagFloat32 = 85;
const kCborTagFloat64 = 86;

/**
 * Whether key/value dictionaries should be decoded as objects or as
 * `Map<K, V>`. The latter is useful if non-string keys or iterating in
 * insertion order are required.
 */
export type DictionaryOption = 'object' | 'map';

/** Options for the decoder. */
export interface Options {
    /** The dictionary type to use. Defaults to `object`. */
    dictionary?: DictionaryOption;
}

/** A function to modify tagged values which are encountered during decoding. */
export type Tagger = (tag: number | bigint, value: any) => any;

/**
 * Converts a Concise Binary Object Representation (CBOR) buffer into an object.
 *
 * ```js
 * const buffer = new Uint8Array([0xa2, 0x01, 0x02, 0x03, 0x04]).buffer;
 * const decoded = decode(buffer);
 * console.log(decoded); // { "1": 2, "3": 4 }
 * ```
 *
 * CBOR values can be wrapped in a numeric tag. To handle and possibly
 * transform tagged values, pass a tagger function:
 *
 * ```js
 * const buffer = new Uint8Array([
 *   0xa1, 0x63, 0x75, 0x72, 0x6c, 0xd8, 0x20, 0x70,
 *   0x68, 0x74, 0x74, 0x70, 0x3a, 0x2f, 0x2f, 0x73,
 *   0x69, 0x74, 0x65, 0x2e, 0x63, 0x6f, 0x6d, 0x2f
 * ]);
 * const decoded = decode(buffer, (tag, value) => {
 *     if (tag === 32) return new URL(value);
 *     return value;
 * });
 * console.log(decoded); // { url: URL { href: "http://site.com/" } }
 * ```
 *
 * Decoded basic types generally match the equivalent JavaScript types. Byte
 * strings are decoded to Uint8Array.
 *
 * Tagged values are left as-is, with the following exceptions:
 * - Bignum values (byte strings with tag 2 or 3) are decoded to BigInt
 * - Little-endian versions of typed arrays as defined in RFC 8746 are decoded
 *   to JavaScript typed arrays
 *
 * @param data A valid CBOR buffer.
 * @param tagger Optional callback for transformation of tagged values.
 * @param options Options for decoding behavior.
 * @returns The CBOR buffer converted to a JavaScript value.
 */
function decode<T = any>(
    data: Uint8Array,
    tagger: Tagger = (_, value) => value,
    options: Options = {}
): T {
    const {dictionary = 'object'} = options;
    const dataView = new DataView(data.buffer, data.byteOffset, data.byteLength);
    let offset = 0;

    function commitRead<T>(length: number, value: T): T {
        offset += length;
        return value;
    }
    function readArrayBuffer(length: number) {
        return commitRead(length, data.subarray(offset, offset + length));
    }
    function readFloat16() {
        const POW_2_24 = 5.960464477539063e-8;

        const tempArrayBuffer = new ArrayBuffer(4);
        const tempDataView = new DataView(tempArrayBuffer);
        const value = readUint16();

        const sign = value & 0x8000;
        let exponent = value & 0x7c00;
        const fraction = value & 0x03ff;

        if (exponent === 0x7c00) exponent = 0xff << 10;
        else if (exponent !== 0) exponent += (127 - 15) << 10;
        else if (fraction !== 0) return (sign ? -1 : 1) * fraction * POW_2_24;

        tempDataView.setUint32(0, (sign << 16) | (exponent << 13) | (fraction << 13));
        return tempDataView.getFloat32(0);
    }
    function readFloat32(): number {
        return commitRead(4, dataView.getFloat32(offset));
    }
    function readFloat64(): number {
        return commitRead(8, dataView.getFloat64(offset));
    }
    function readUint8(): number {
        return commitRead(1, data[offset]);
    }
    function readUint16(): number {
        return commitRead(2, dataView.getUint16(offset));
    }
    function readUint32(): number {
        return commitRead(4, dataView.getUint32(offset));
    }
    function readUint64(): bigint {
        return commitRead(8, dataView.getBigUint64(offset));
    }
    function readBreak(): boolean {
        if (data[offset] !== 0xff) return false;
        offset += 1;
        return true;
    }
    function readLength(additionalInformation: number): number | bigint {
        if (additionalInformation < 24) return additionalInformation;
        if (additionalInformation === 24) return readUint8();
        if (additionalInformation === 25) return readUint16();
        if (additionalInformation === 26) return readUint32();
        if (additionalInformation === 27) {
            const integer = readUint64();
            if (integer <= Number.MAX_SAFE_INTEGER) return Number(integer);
            return integer;
        }
        if (additionalInformation === 31) return -1;
        throw new Error('CBORError: Invalid length encoding');
    }
    function readIndefiniteStringLength(majorType: number): number {
        const initialByte = readUint8();
        if (initialByte === 0xff) return -1;
        const length = readLength(initialByte & 0x1f);
        if (length < 0 || initialByte >> 5 !== majorType) {
            throw new Error('CBORError: Invalid indefinite length element');
        }
        return Number(length);
    }
    function appendUtf16Data(utf16data: number[], length: number) {
        for (let i = 0; i < length; ++i) {
            let value = readUint8();
            if (value & 0x80) {
                if (value < 0xe0) {
                    value = ((value & 0x1f) << 6) | (readUint8() & 0x3f);
                    length -= 1;
                } else if (value < 0xf0) {
                    value =
                        ((value & 0x0f) << 12) |
                        ((readUint8() & 0x3f) << 6) |
                        (readUint8() & 0x3f);
                    length -= 2;
                } else {
                    value =
                        ((value & 0x07) << 18) |
                        ((readUint8() & 0x3f) << 12) |
                        ((readUint8() & 0x3f) << 6) |
                        (readUint8() & 0x3f);
                    length -= 3;
                }
            }

            if (value < 0x10000) {
                utf16data.push(value);
            } else {
                value -= 0x10000;
                utf16data.push(0xd800 | (value >> 10));
                utf16data.push(0xdc00 | (value & 0x3ff));
            }
        }
    }

    function decodeItem(): any {
        const initialByte = readUint8();
        const majorType = initialByte >> 5;
        const additionalInformation = initialByte & 0x1f;
        let i;
        let length;

        if (majorType === 7) {
            switch (additionalInformation) {
                case 25:
                    return readFloat16();
                case 26:
                    return readFloat32();
                case 27:
                    return readFloat64();
            }
        }

        length = readLength(additionalInformation);
        if (length < 0 && (majorType < 2 || 6 < majorType)) {
            throw new Error('CBORError: Invalid length');
        }

        switch (majorType) {
            case 0:
                return length;
            case 1:
                if (typeof length === 'number') {
                    return -1 - length;
                }
                return -1n - length;
            case 2: {
                if (length < 0) {
                    const elements = [];
                    let fullArrayLength = 0;
                    while ((length = readIndefiniteStringLength(majorType)) >= 0) {
                        fullArrayLength += length;
                        elements.push(readArrayBuffer(length));
                    }
                    const fullArray = new Uint8Array(fullArrayLength);
                    let fullArrayOffset = 0;
                    for (i = 0; i < elements.length; ++i) {
                        fullArray.set(elements[i], fullArrayOffset);
                        fullArrayOffset += elements[i].length;
                    }
                    return fullArray;
                }
                return readArrayBuffer(length as number).slice();
            }
            case 3: {
                /* Can't use TextDecoder.decode() because not all browsers
                 * support calling it with an underlying SharedArrayBuffer yet.
                 * See https://github.com/whatwg/encoding/issues/172 */
                /** @todo Re-evaluate browser support */
                const utf16data: number[] = [];
                if (length < 0) {
                    while ((length = readIndefiniteStringLength(majorType)) >= 0) {
                        appendUtf16Data(utf16data, length);
                    }
                } else {
                    appendUtf16Data(utf16data, length as number);
                }
                let string = '';
                const DECODE_CHUNK_SIZE = 8192;
                for (i = 0; i < utf16data.length; i += DECODE_CHUNK_SIZE) {
                    string += String.fromCharCode.apply(
                        null,
                        utf16data.slice(i, i + DECODE_CHUNK_SIZE)
                    );
                }
                return string;
            }
            case 4: {
                let retArray;
                if (length < 0) {
                    retArray = [];
                    let index = 0;
                    while (!readBreak()) {
                        retArray.push(decodeItem());
                    }
                } else {
                    retArray = new Array(length);
                    for (i = 0; i < length; ++i) {
                        retArray[i] = decodeItem();
                    }
                }
                return retArray;
            }
            case 5: {
                if (dictionary === 'map') {
                    const retMap = new Map<any, any>();
                    for (i = 0; i < length || (length < 0 && !readBreak()); ++i) {
                        const key = decodeItem();
                        if (retMap.has(key)) {
                            throw new Error('CBORError: Duplicate key encountered');
                        }
                        retMap.set(key, decodeItem());
                    }
                    return retMap;
                }
                const retObject: any = {};
                for (i = 0; i < length || (length < 0 && !readBreak()); ++i) {
                    const key = decodeItem();
                    if (Object.prototype.hasOwnProperty.call(retObject, key)) {
                        throw new Error('CBORError: Duplicate key encountered');
                    }
                    retObject[key] = decodeItem();
                }
                return retObject;
            }
            case 6: {
                const value = decodeItem();
                const tag = length;
                if (value instanceof Uint8Array) {
                    switch (tag) {
                        case kCborTagBignum:
                        case kCborTagNegativeBignum:
                            let num = value.reduce((acc, n) => (acc << 8n) + BigInt(n), 0n);
                            if (tag == kCborTagNegativeBignum) {
                                num = -1n - num;
                            }
                            return num;
                        /* Little-endian typed arrays (RFC 8746) */
                        case kCborTagUint8:
                            return value;
                        case kCborTagInt8:
                            return new Int8Array(value.buffer);
                        case kCborTagUint16:
                            return new Uint16Array(value.buffer);
                        case kCborTagInt16:
                            return new Int16Array(value.buffer);
                        case kCborTagUint32:
                            return new Uint32Array(value.buffer);
                        case kCborTagInt32:
                            return new Int32Array(value.buffer);
                        case kCborTagUint64:
                            return new BigUint64Array(value.buffer);
                        case kCborTagInt64:
                            return new BigInt64Array(value.buffer);
                        case kCborTagFloat32:
                            return new Float32Array(value.buffer);
                        case kCborTagFloat64:
                            return new Float64Array(value.buffer);
                    }
                }
                return tagger(tag, value);
            }
            case 7:
                switch (length) {
                    case 20:
                        return false;
                    case 21:
                        return true;
                    case 22:
                        return null;
                    case 23:
                        return undefined;
                    default:
                        return length as number;
                }
        }
    }

    const ret = decodeItem();
    if (offset !== data.byteLength) {
        throw new Error('CBORError: Remaining bytes');
    }
    return ret;
}

export const CBOR = {
    decode,
};
