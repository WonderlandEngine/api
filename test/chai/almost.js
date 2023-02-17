const ObjectConstructor = {}.constructor;

function isArray(val) {
    if(!val) return false;
    return Array.isArray(val) || (val.buffer && val.buffer instanceof ArrayBuffer);
}

function isObject(val) {
   return val && val.constructor == ObjectConstructor;
}

function almost(a, b, tolerance) {
  return Math.abs(a - b) <= tolerance;
}

function almostEqualArray(a, b, tolerance) {
    if(a.length !== b.length) return false;
    for(let i = 0; i < a.length; ++i) {
        const eq = almostDeepEqual(a[i], b[i], tolerance);
        if(eq == false)
            return `index ${i}`;
        else if(typeof eq == 'string')
            return `index ${i} -> ${i}`;
    }
    return true;
}

function almostEqualObject(a, b, tolerance) {
    const keys = Object.keys(a);
    for(const key of keys) {
        const eq = almostDeepEqual(a[key], b[key], tolerance);
        if(typeof eq == false)
            return `key ${i}`;
        else if(typeof eq == 'string')
            return `key ${i} -> ${i}`;
    }
}

/**
 * Recursively checks two values with a tolerance threshold.
 *
 * @param {Object|Number|Array|ArrayBuffer|Map|Set} a First value for comparison
 * @param {Object|Number|Array|ArrayBuffer|Map|Set} b Second value for comparison
 * @param {number} tolerance
 *
 * @returns {boolean|string} `true` if values are the same with some tolerance, `false` otherwise.
 *     In addition, the method can return a string when an error occurs to give feedback
 *     about where the difference happened.
 */
function almostDeepEqual(a, b, tolerance) {
    if(isArray(a) && isArray(b))
       return almostEqualArray(a, b, tolerance);
    else if(isObject(a) && isObject(b))
        return almostEqualObject(a, b, tolerance);
    else if(a instanceof Map && b instanceof Map)
        return almostEqualObject(a, b,  tolerance);
    else if(a instanceof Set && b instanceof Set)
        return almostEqualObject(a, b, tolerance);
    else if(!isNaN(a) && !isNaN(b))
        return almost(a, b, tolerance);
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
function chaiAlmostAssert(_super, flag, deep = false) {
    return function(val, msg) {
        if(msg) flag(this, 'message', msg);

        const tolerance = flag(this, 'tolerance');
        if(!flag(this, 'almost') || tolerance === undefined) {
            /* The user is trying to perform an exact comparison */
            return _super.apply(this, arguments);
        }

        let value = null;
        let message = '';

        if(deep) {
            const deepEq = almostDeepEqual(val, this._obj, tolerance);
            value = deepEq;
            if(typeof deepEq === 'string') {
                message = `\n\t\tDifference path: ${deepEq}`;
                value = false;
            }
        } else if(tolerance && !isNaN(val) && !isNaN(this._obj)) {
            value = almost(val, this._obj, tolerance);
        } else {
            return _super.apply(this, arguments);
        }
        this.assert(value,
            `expected #{this} to deeply almost equal #{exp}${message}`,
            `expected #{this} to not deeply almost equal #{exp}${message}`, val, this._obj, true);
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
export function chaiAlmost(tolerance) {
  return function(chai, utils) {
    const flag = utils.flag;
    tolerance = tolerance || 1e-4;

    /**
     * Override for methods of the form: 'equal', 'equals', 'eq'.
     */
    function overridenEqualityAssert(_super) {
        return chaiAlmostAssert(_super, flag);
    }

    /**
     * Override for methods of the form: 'eql', 'eqls'.
     *
     * According to Chai's documentation, `eql` and `eqls` must be deep.
     * This function thus force the `deep` flag.
     */
    function overridenDeepEqualityAssert(_super) {
        return chaiAlmostAssert(_super, flag, true);
    }

    function assert(val, toleranceOverride) {
        flag(this, 'tolerance', toleranceOverride || tolerance)
        return this.equal(val);
    }

    function chain() {
        flag(this, 'tolerance', tolerance);
        flag(this, 'almost', true);
    }

    chai.Assertion.addChainableMethod('almost', assert, chain);
    chai.Assertion.overwriteMethod('equal', overridenEqualityAssert)
    chai.Assertion.overwriteMethod('equals', overridenEqualityAssert)
    chai.Assertion.overwriteMethod('eq', overridenEqualityAssert)
    chai.Assertion.overwriteMethod('eql', overridenDeepEqualityAssert)
    chai.Assertion.overwriteMethod('eqls', overridenDeepEqualityAssert)
  }
}
