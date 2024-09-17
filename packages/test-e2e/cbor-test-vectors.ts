type TestVector = {
    hex: string;
    tag?: number;
    decoded: any;
};

/* Examples of encoded CBOR data items given in RFC 8949 Appendix A. Adapted
 * from https://github.com/cbor/test-vectors/blob/aba89b653e484bc8573c22f3ff35641d79dfd8c1/appendix_a.json */
export const CborTestVectors: TestVector[] = [
    {
        hex: '00',
        decoded: 0,
    },
    {
        hex: '01',
        decoded: 1,
    },
    {
        hex: '0a',
        decoded: 10,
    },
    {
        hex: '17',
        decoded: 23,
    },
    {
        hex: '1818',
        decoded: 24,
    },
    {
        hex: '1819',
        decoded: 25,
    },
    {
        hex: '1864',
        decoded: 100,
    },
    {
        hex: '1903e8',
        decoded: 1000,
    },
    {
        hex: '1a000f4240',
        decoded: 1000000,
    },
    {
        hex: '1b000000e8d4a51000',
        decoded: 1000000000000,
    },
    {
        hex: '1bffffffffffffffff',
        decoded: 18446744073709551615n,
    },
    {
        hex: 'c249010000000000000000',
        decoded: 18446744073709551616n,
    },
    {
        hex: '3bffffffffffffffff',
        decoded: -18446744073709551616n,
    },
    {
        hex: 'c349010000000000000000',
        decoded: -18446744073709551617n,
    },
    {
        hex: '20',
        decoded: -1,
    },
    {
        hex: '29',
        decoded: -10,
    },
    {
        hex: '3863',
        decoded: -100,
    },
    {
        hex: '3903e7',
        decoded: -1000,
    },
    {
        hex: 'f90000',
        decoded: 0.0,
    },
    {
        hex: 'f98000',
        decoded: -0.0,
    },
    {
        hex: 'f93c00',
        decoded: 1.0,
    },
    {
        hex: 'fb3ff199999999999a',
        decoded: 1.1,
    },
    {
        hex: 'f93e00',
        decoded: 1.5,
    },
    {
        hex: 'f97bff',
        decoded: 65504.0,
    },
    {
        hex: 'fa47c35000',
        decoded: 100000.0,
    },
    {
        hex: 'fa7f7fffff',
        decoded: 3.4028234663852886e38,
    },
    {
        hex: 'fb7e37e43c8800759c',
        decoded: 1.0e300,
    },
    {
        hex: 'f90001',
        decoded: 5.960464477539063e-8,
    },
    {
        hex: 'f90400',
        decoded: 6.103515625e-5,
    },
    {
        hex: 'f9c400',
        decoded: -4.0,
    },
    {
        hex: 'fbc010666666666666',
        decoded: -4.1,
    },
    {
        hex: 'f97c00',
        decoded: Infinity,
    },
    {
        hex: 'f97e00',
        decoded: NaN,
    },
    {
        hex: 'f9fc00',
        decoded: -Infinity,
    },
    {
        hex: 'fa7f800000',
        decoded: Infinity,
    },
    {
        hex: 'fa7fc00000',
        decoded: NaN,
    },
    {
        hex: 'faff800000',
        decoded: -Infinity,
    },
    {
        hex: 'fb7ff0000000000000',
        decoded: Infinity,
    },
    {
        hex: 'fb7ff8000000000000',
        decoded: NaN,
    },
    {
        hex: 'fbfff0000000000000',
        decoded: -Infinity,
    },
    {
        hex: 'f4',
        decoded: false,
    },
    {
        hex: 'f5',
        decoded: true,
    },
    {
        hex: 'f6',
        decoded: null,
    },
    {
        hex: 'f7',
        decoded: undefined,
    },
    {
        hex: 'f0',
        decoded: 16,
    },
    {
        hex: 'f818',
        decoded: 24,
    },
    {
        hex: 'f8ff',
        decoded: 255,
    },
    {
        hex: 'c074323031332d30332d32315432303a30343a30305a',
        tag: 0,
        decoded: '2013-03-21T20:04:00Z',
    },
    {
        hex: 'c11a514b67b0',
        tag: 1,
        decoded: 1363896240,
    },
    {
        hex: 'c1fb41d452d9ec200000',
        tag: 1,
        decoded: 1363896240.5,
    },
    {
        hex: 'd74401020304',
        tag: 23,
        decoded: Uint8Array.from([0x01, 0x02, 0x03, 0x04]),
    },
    {
        hex: 'd818456449455446',
        tag: 24,
        decoded: Uint8Array.from([0x64, 0x49, 0x45, 0x54, 0x46]),
    },
    {
        hex: 'd82076687474703a2f2f7777772e6578616d706c652e636f6d',
        tag: 32,
        decoded: 'http://www.example.com',
    },
    {
        hex: '40',
        decoded: Uint8Array.from([]),
    },
    {
        hex: '4401020304',
        decoded: Uint8Array.from([0x01, 0x02, 0x03, 0x04]),
    },
    {
        hex: '60',
        decoded: '',
    },
    {
        hex: '6161',
        decoded: 'a',
    },
    {
        hex: '6449455446',
        decoded: 'IETF',
    },
    {
        hex: '62225c',
        decoded: '"\\',
    },
    {
        hex: '62c3bc',
        decoded: 'ü',
    },
    {
        hex: '63e6b0b4',
        decoded: '水',
    },
    {
        hex: '64f0908591',
        decoded: '𐅑',
    },
    {
        hex: '80',
        decoded: [],
    },
    {
        hex: '83010203',
        decoded: [1, 2, 3],
    },
    {
        hex: '8301820203820405',
        decoded: [1, [2, 3], [4, 5]],
    },
    {
        hex: '98190102030405060708090a0b0c0d0e0f101112131415161718181819',
        decoded: [
            1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
            23, 24, 25,
        ],
    },
    {
        hex: 'a0',
        decoded: new Map(Object.entries({})),
    },
    {
        hex: 'a201020304',
        decoded: new Map([
            [1, 2],
            [3, 4],
        ]),
    },
    {
        hex: 'a26161016162820203',
        decoded: new Map(
            Object.entries({
                a: 1,
                b: [2, 3],
            })
        ),
    },
    {
        hex: '826161a161626163',
        decoded: [
            'a',
            new Map(
                Object.entries({
                    b: 'c',
                })
            ),
        ],
    },
    {
        hex: 'a56161614161626142616361436164614461656145',
        decoded: new Map(
            Object.entries({
                a: 'A',
                b: 'B',
                c: 'C',
                d: 'D',
                e: 'E',
            })
        ),
    },
    {
        hex: '5f42010243030405ff',
        decoded: Uint8Array.from([0x01, 0x02, 0x03, 0x04, 0x05]),
    },
    {
        hex: '7f657374726561646d696e67ff',
        decoded: 'streaming',
    },
    {
        hex: '9fff',
        decoded: [],
    },
    {
        hex: '9f018202039f0405ffff',
        decoded: [1, [2, 3], [4, 5]],
    },
    {
        hex: '9f01820203820405ff',
        decoded: [1, [2, 3], [4, 5]],
    },
    {
        hex: '83018202039f0405ff',
        decoded: [1, [2, 3], [4, 5]],
    },
    {
        hex: '83019f0203ff820405',
        decoded: [1, [2, 3], [4, 5]],
    },
    {
        hex: '9f0102030405060708090a0b0c0d0e0f101112131415161718181819ff',
        decoded: [
            1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
            23, 24, 25,
        ],
    },
    {
        hex: 'bf61610161629f0203ffff',
        decoded: new Map(
            Object.entries({
                a: 1,
                b: [2, 3],
            })
        ),
    },
    {
        hex: '826161bf61626163ff',
        decoded: [
            'a',
            new Map(
                Object.entries({
                    b: 'c',
                })
            ),
        ],
    },
    {
        hex: 'bf6346756ef563416d7421ff',
        decoded: new Map(
            Object.entries({
                Fun: true,
                Amt: -2,
            })
        ),
    },
];
