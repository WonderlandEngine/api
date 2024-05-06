import {expect} from '@esm-bundle/chai';

import {BitSet} from '../src/utils/bitset.js';
import {CBOR} from '../src/utils/cbor.js';
import {getBaseUrl, getFilename} from '../src/utils/fetch.js';

import {CborTestVectors} from './cbor-test-vectors.js';

describe('BitSet', function () {
    it('.enable()', function () {
        const set = new BitSet();
        expect(set.enabled(0)).to.be.false;
        expect(set.enable(0).enabled(0)).to.be.true;
        set.enable(2);

        /* Ensure we didn't disable the first bit. */
        expect(set.enabled(0)).to.be.true;
        expect(set.enabled(2)).to.be.true;

        /* Ensure we can set the last bit without a reset of other bits. */
        set.enable(31);
        for (let i = 0; i < 32; ++i) {
            const expected = i === 0 || i === 2 || i === 31;
            expect(set.enabled(i)).to.equal(expected);
        }
    });

    it('.enableAll() / .disableAll()', function () {
        const set = new BitSet().enableAll();
        for (let i = 0; i < 32; ++i) {
            expect(set.enabled(i)).to.be.true;
        }
        set.disableAll();
        for (let i = 0; i < 32; ++i) {
            expect(set.enabled(i)).to.be.false;
        }
    });

    it('.disable()', function () {
        const set = new BitSet().enableAll();
        expect(set.disable(10).enabled(10)).to.be.false;

        set.enableAll();

        /* Ensure we can unset a few bits without a reset of other bits. */
        set.disable(0);
        set.disable(1);
        set.disable(2);
        set.disable(31);
        for (let i = 0; i < 32; ++i) {
            const expected = i > 2 && i < 31;
            expect(set.enabled(i)).to.equal(expected);
        }
    });

    it('typed with an enum', function () {
        enum TestTag {
            First = 0,
        }
        const set = new BitSet<TestTag>();
        expect(set.enable(TestTag.First).enabled(TestTag.First)).to.be.true;
    });

    it('ensure bit 0 and 31 do not override', function () {
        const set = new BitSet();

        expect(set.enable(31).enabled(31)).to.be.true;
        expect(set.enable(0).enabled(0)).to.be.true;
        expect(set.enabled(31)).to.be.true;

        expect(set.disable(0).enabled(0)).to.be.false;
        expect(set.enabled(31)).to.be.true;

        expect(set.enable(0).enabled(0)).to.be.true;
        expect(set.enabled(31)).to.be.true;
        expect(set.disable(31).enabled(31)).to.be.false;
        expect(set.enabled(0)).to.be.true;
    });
});

describe('CBOR.decode()', function () {
    function fromHex(data: string) {
        const length = data.length / 2;
        const ret = new Uint8Array(length);

        for (let i = 0; i < length; ++i) {
            ret[i] = parseInt(data.substring(i * 2, i * 2 + 2), 16);
        }

        return ret;
    }

    /* Official CBOR spec test cases, appendix A of RFC 8949 */
    it('CBOR', function () {
        for (let i = 0; i < CborTestVectors.length; ++i) {
            const vector = CborTestVectors[i];

            const data = fromHex(vector.hex);
            let testTag: number | undefined = undefined;
            const decoded = CBOR.decode(
                data,
                (tag: number | bigint, value: any) => {
                    /* Each test has at most one tag */
                    expect(testTag).to.be.undefined;
                    testTag = tag as number;
                    return value;
                },
                {
                    /* Decode objects as Map, allows non-string keys */
                    /** @todo Make this the default? */
                    dictionary: 'map',
                }
            );

            expect(testTag, 'Test vector ' + i).to.equal(vector.tag);
            expect(decoded, 'Test vector ' + i).to.deep.equal(vector.decoded);
        }
    });

    /* Test library behavior. Adapted from
     * https://github.com/aaronhuggins/cbor-redux/blob/c519338e6024352d64326c562bb6390121b105a7/src/CBOR_test.ts */
    it('Remaining bytes', function () {
        /* decode() only decodes a single item. If there is data left, it
         * throws. Use maps or arrays for multiple items.
         * 0 followed by another 0. */
        const data = fromHex('0000');
        expect(() => CBOR.decode(data)).to.throw('CBORError: Remaining bytes');
    });

    it('Invalid length encoding', function () {
        const data = fromHex('1e');
        expect(() => CBOR.decode(data)).to.throw('CBORError: Invalid length encoding');
    });

    it('Invalid length', function () {
        const data = fromHex('1f');
        expect(() => CBOR.decode(data)).to.throw('CBORError: Invalid length');
    });

    it('Invalid indefinite length element type', function () {
        const data = fromHex('5f00');
        expect(() => CBOR.decode(data)).to.throw(
            'CBORError: Invalid indefinite length element'
        );
    });

    it('Invalid indefinite length element length', function () {
        const data = fromHex('5f5f');
        expect(() => CBOR.decode(data)).to.throw(
            'CBORError: Invalid indefinite length element'
        );
    });

    it('Duplicate key', function () {
        /*
        {
            1: 2,
            3: 4,
            3: 5
        }
        */
        const data = fromHex('a3010203040305');
        expect(() => CBOR.decode(data)).to.throw('CBORError: Duplicate key encountered');
    });

    /* RFC 8746 test cases (ArrayBuffer is sent as byte string). Adapted from
     * https://github.com/aaronhuggins/cbor-redux/blob/c519338e6024352d64326c562bb6390121b105a7/src/testcases.ts */
    it('Uint8Array', function () {
        const data = fromHex('d8404401020304');
        const decoded = CBOR.decode(data);
        expect(decoded).to.be.instanceOf(Uint8Array);
        expect(decoded).to.deep.equal(Uint8Array.from([1, 2, 3, 4]));
    });

    it('Int8Array', function () {
        const data = fromHex('d848440102fdfc');
        const decoded = CBOR.decode(data);
        expect(decoded).to.be.instanceOf(Int8Array);
        expect(decoded).to.deep.equal(Int8Array.from([1, 2, -3, -4]));
    });

    it('Uint16Array', function () {
        const data = fromHex('d8454801000200ffff0400');
        const decoded = CBOR.decode(data);
        expect(decoded).to.be.instanceOf(Uint16Array);
        expect(decoded).to.deep.equal(Uint16Array.from([1, 2, 65535, 4]));
    });

    it('Int16Array', function () {
        const data = fromHex('d84d4801000200ff7ffcff');
        const decoded = CBOR.decode(data);
        expect(decoded).to.be.instanceOf(Int16Array);
        expect(decoded).to.deep.equal(Int16Array.from([1, 2, 32767, -4]));
    });

    it('Uint32Array', function () {
        const data = fromHex('d8465001000000020000000000010004000000');
        const decoded = CBOR.decode(data);
        expect(decoded).to.be.instanceOf(Uint32Array);
        expect(decoded).to.deep.equal(Uint32Array.from([1, 2, 65536, 4]));
    });

    it('Int32Array', function () {
        const data = fromHex('d84e50010000000200000000000100fcffffff');
        const decoded = CBOR.decode(data);
        expect(decoded).to.be.instanceOf(Int32Array);
        expect(decoded).to.deep.equal(Int32Array.from([1, 2, 65536, -4]));
    });

    it('BigUint64Array', function () {
        const data = fromHex('d8475001000000000000000000010000000000');
        const decoded = CBOR.decode(data);
        expect(decoded).to.be.instanceOf(BigUint64Array);
        expect(decoded).to.deep.equal(BigUint64Array.from([1n, 65536n]));
    });

    it('BigInt64Array', function () {
        const data = fromHex('d84f500100000000000000fcffffffffffffff');
        const decoded = CBOR.decode(data);
        expect(decoded).to.be.instanceOf(BigInt64Array);
        expect(decoded).to.deep.equal(BigInt64Array.from([1n, -4n]));
    });

    it('Float32Array', function () {
        const data = fromHex('d855500000803f000000400000a03f0000a0bf');
        const decoded = CBOR.decode(data);
        expect(decoded).to.be.instanceOf(Float32Array);
        expect(decoded).to.deep.equal(Float32Array.from([1, 2, 1.25, -1.25]));
    });

    it('Float64Array', function () {
        const data = fromHex(
            'd8565820000000000000f03f0000000000000040000000000000f43f000000000000f4bf'
        );
        const decoded = CBOR.decode(data);
        expect(decoded).to.be.instanceOf(Float64Array);
        expect(decoded).to.deep.equal(Float64Array.from([1, 2, 1.25, -1.25]));
    });
});

describe('URL Utilities', function () {
    it('getFilename()', function () {
        expect(getFilename('')).to.equal('');
        expect(getFilename('http://test/file.js')).to.equal('file.js');
        expect(getFilename('/file.js/')).to.equal('file.js');
    });
    it('getBaseUrl()', function () {
        const baseURL = getBaseUrl('hello/wonder/land/scene.bin');
        expect(baseURL).to.equal('hello/wonder/land');
    });
});
