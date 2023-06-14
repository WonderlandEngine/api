import {expect, use} from '@esm-bundle/chai';
import {chaiAlmost} from './chai/almost.js';

import {init, reset, WL} from './setup.js';

use(chaiAlmost());

before(init);
beforeEach(reset);

describe('Memory', function () {
    let ptr: number | null = null;

    after(function () {
        if (ptr !== null) WL.wasm._free(ptr);
    });

    it('grow memory, ensure views are updated', async function () {
        const oldHEAP8 = WL.wasm.HEAP8;
        const oldHEAP16 = WL.wasm.HEAP16;
        const oldHEAP32 = WL.wasm.HEAP32;
        const oldHEAPU8 = WL.wasm.HEAPU8;
        const oldHEAPU16 = WL.wasm.HEAPU16;
        const oldHEAPU32 = WL.wasm.HEAPU32;
        const oldHEAPF32 = WL.wasm.HEAPF32;
        const oldHEAPF64 = WL.wasm.HEAPF64;

        /* Allocate 24 MB to grow beyond the 24 initial MB
         * This should never fail with out of memory. If it does,
         * read the error closely, it could fail in our updateMemoryViews() */
        ptr = WL.wasm._malloc(1024 * 1024 * 24);

        expect(oldHEAP8 == WL.wasm.HEAP8).to.be.false;
        expect(oldHEAP16 == WL.wasm.HEAP16).to.be.false;
        expect(oldHEAP32 == WL.wasm.HEAP32).to.be.false;
        expect(oldHEAPU8 == WL.wasm.HEAPU8).to.be.false;
        expect(oldHEAPU16 == WL.wasm.HEAPU16).to.be.false;
        expect(oldHEAPU32 == WL.wasm.HEAPU32).to.be.false;
        expect(oldHEAPF32 == WL.wasm.HEAPF32).to.be.false;
        expect(oldHEAPF64 == WL.wasm.HEAPF64).to.be.false;
    });
});
