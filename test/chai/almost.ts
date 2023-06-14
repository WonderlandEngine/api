const ObjectConstructor = {}.constructor;

type GenericMap = {[key: string]: any};
type ChaiFlag = (obj: object, key: string, value?: any) => any;

function isArray(val: any): val is [unknown] {
    if (!val) return false;
    return Array.isArray(val) || (val.buffer && val.buffer instanceof ArrayBuffer);
}

function isObject(val: any): val is Record<symbol, unknown> {
    return val && val.constructor == ObjectConstructor;
}

function almost(a: number, b: number, tolerance: number) {
    return Math.abs(a - b) <= tolerance;
}

function almostEqualArray(a: [any], b: [any], tolerance: number) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; ++i) {
        const eq = almostDeepEqual(a[i], b[i], tolerance);
        if (eq == false) return `index ${i}`;
        else if (typeof eq == 'string') return `index ${i} -> ${i}`;
    }
    return true;
}

function almostEqualObject(a: GenericMap, b: GenericMap, tolerance: number) {
    const keys = Object.keys(a);
    for (const key of keys) {
        const eq = almostDeepEqual(a[key], b[key], tolerance);
        if (typeof eq === 'boolean' && !eq) return `key ${key}`;
        else if (typeof eq == 'string') return `key ${key} -> ${key}`;
    }
}

/**
 * Recursively checks two values with a tolerance threshold.
 *
 * @param a First value for comparison
 * @param b Second value for comparison
 * @param tolerance Floating point tolerance for numbers
 *
 * @returns `true` if values are the same with some tolerance, `false` otherwise.
 *     In addition, the method can return a string when an error occurs to give feedback
 *     about where the difference happened.
 */
function almostDeepEqual(a: any, b: any, tolerance: number) {
    if (isArray(a) && isArray(b)) return almostEqualArray(a, b, tolerance);
    else if (isObject(a) && isObject(b)) return almostEqualObject(a, b, tolerance);
    else if (a instanceof Map && b instanceof Map)
        return almostEqualObject(a, b, tolerance);
    else if (!isNaN(a) && !isNaN(b)) return almost(a, b, tolerance);
    return a === b;
}

/**
 * Main Chai's assert. This function checks the input / expected
 * and performs formatting. In addition, it notifies chai if
 * the assert fails.
 *
 * @param {Function} flag Chai's flag function
 * @param {Object} val The value to check
 * @param {string} msg Chai's message
 */
function chaiAlmostAssert(_super: Chai.Assertion, flag: ChaiFlag, deep = false) {
    return function (this: Chai.AssertionStatic, val: any, msg: string) {
        if (msg) flag(this, 'message', msg);

        const needsAlmost = flag(this, 'almost');
        const tolerance = flag(this, 'tolerance');
        if (!needsAlmost || tolerance === undefined) {
            /* The user is trying to perform an exact comparison */
            return _super.apply(this, arguments as unknown as [string, string | undefined]);
        }

        let value = null;
        let message = '';

        if (deep || flag(this, 'deep')) {
            const deepEq = almostDeepEqual(val, this._obj, tolerance);
            value = deepEq;
            if (typeof deepEq === 'string') {
                message = `\n\t\tDifference path: ${deepEq}`;
                value = false;
            }
        } else if (tolerance && !isNaN(val) && !isNaN(this._obj)) {
            value = almost(val, this._obj, tolerance);
        } else {
            return _super.apply(this, arguments as unknown as [string, string | undefined]);
        }
        this.assert(
            value,
            `expected #{this} to deeply almost equal #{exp}${message}`,
            `expected #{this} to not deeply almost equal #{exp}${message}`,
            val,
            this._obj,
            true
        );
    };
}

/**
 * Chai plugin for almost equality
 *
 * It can be registered using:
 *
 * ```js
 * import { use } from 'chai';
 * import { chaiAlmost } from './utils/almost.js';
 *
 * use(chaiAlmost);
 * ```
 *
 * @param {number} tolerance The default tolerance to use for every assert
 * @returns
 */
export function chaiAlmost(tolerance: number = 1e-4) {
    return function (chai: Chai.ChaiStatic, utils: Chai.ChaiUtils): void {
        const flag = utils.flag;

        /**
         * Override for methods of the form: 'equal', 'equals', 'eq'.
         */
        function overridenEqualityAssert(_super: Chai.Assertion) {
            return chaiAlmostAssert(_super, flag);
        }

        /**
         * Override for methods of the form: 'eql', 'eqls'.
         *
         * According to Chai's documentation, `eql` and `eqls` must be deep.
         * This function thus force the `deep` flag.
         */
        function overridenDeepEqualityAssert(_super: Chai.Assertion) {
            return chaiAlmostAssert(_super, flag, true);
        }

        function assert(this: Chai.Assertion, val: any, toleranceOverride: number) {
            flag(this, 'tolerance', toleranceOverride || tolerance);
            flag(this, 'almost', true);
            return this.equal(val);
        }

        function chain(this: Chai.Assertion) {
            flag(this, 'tolerance', tolerance);
            flag(this, 'almost', true);
        }

        chai.Assertion.addChainableMethod('almost', assert as any, chain);
        chai.Assertion.overwriteMethod('equal', overridenEqualityAssert);
        chai.Assertion.overwriteMethod('equals', overridenEqualityAssert);
        chai.Assertion.overwriteMethod('eq', overridenEqualityAssert);
        chai.Assertion.overwriteMethod('eql', overridenDeepEqualityAssert);
        chai.Assertion.overwriteMethod('eqls', overridenDeepEqualityAssert);
    };
}
