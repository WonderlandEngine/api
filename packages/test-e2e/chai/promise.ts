import {expect} from '@esm-bundle/chai';

/**
 * Expects the promise to fulfill.
 *
 * @param {Promise} promise The promise to check.
 * @param {number} timeout Maximum amount of time it can take to fulfill, in ms.
 * @returns The promise result.
 */
export function expectSuccess<T = unknown>(promise: Promise<T>, timeout = 1500) {
    return new Promise<T>((res, rej) => {
        setTimeout(() => {
            rej(`expected promise to fulfill before timeout of ${timeout}`);
        }, timeout);
        promise.then(res).catch(rej);
    }).catch((e) => {
        expect.fail(
            'promise expected to succeed but failed.\n' +
                '\tExpected: Success\n' +
                '\tBut rejected with: ' +
                e
        );
    });
}

/**
 * Expects the promise to fail.
 *
 * @param {Promise} promise The promise to check.
 * @param {number} timeout Maximum amount of time it can take to fail, in ms.
 * @returns The promise result.
 */
export function expectFail<T = any>(promise: Promise<unknown>, timeout = 1500) {
    return new Promise<T>((res, rej) => {
        setTimeout(() => {
            rej(`expected promise to fail before timeout of ${timeout}`);
        }, timeout);
        promise.then(rej).catch(res);
    }).catch((data) => {
        expect.fail(
            'promise expected to fail but resolved.\n' +
                '\tExpected: Error\n' +
                '\tBut resolved with: ' +
                data
        );
    });
}
