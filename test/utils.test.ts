import {expect} from '@esm-bundle/chai';

import {BitSet} from '..';

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
