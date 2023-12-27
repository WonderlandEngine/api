import {expect} from '@esm-bundle/chai';

import {Emitter, RetainEmitter} from '..';

describe('Emitter', function () {
    it('.add()', function () {
        const emitter = new Emitter();
        let data1 = 0;
        let data2 = 0;
        emitter.add(() => data1++);
        expect(data1).to.equal(0);
        emitter.notify();
        expect(data1).to.equal(1);
        emitter.add(() => data2++);
        expect(data1).to.equal(1);
        expect(data2).to.equal(0);
        emitter.notify();
        expect(data1).to.equal(2);
        expect(data2).to.equal(1);
    });

    it('.add() with {once: true}', function () {
        const emitter = new Emitter();
        let count = 0;
        emitter.add(() => count++, {once: true});
        emitter.notify();
        expect(count).to.equal(1);
        emitter.notify();
        expect(count).to.equal(1);

        emitter.add(() => count++, {once: true});
        emitter.add(() => count++, {once: true});
        emitter.add(() => count++, {once: true});
        emitter.notify();
        emitter.notify(); // Second call on purpose.
        expect(count).to.equal(4);
    });

    it('.once()', function () {
        const emitter = new Emitter();
        let count = 0;
        emitter.once(() => count++);
        expect(count).to.equal(0);
        emitter.notify();
        expect(count).to.equal(1);
        emitter.notify();
        expect(count).to.equal(1);
    });

    it('notify with data', function () {
        const emitter = new Emitter<[{result: number}]>();
        const initial = {result: 100};
        let data = initial;
        emitter.add((result) => (data = result));
        expect(data).to.equal(initial); // Reference check.
        emitter.notify({result: 42});
        expect(data).to.not.equal(initial);
        expect(data.result).to.equal(42);

        /* Check that multiple listeners receive the same reference. */
        let data2 = initial;
        emitter.add((result) => (data2 = result));
        emitter.notify({result: 43});
        expect(data2).to.equal(data);
        expect(data2.result).to.equal(43);
    });

    it('.notify() with throw', function () {
        const count = {a: 0, b: 0};

        const emitter = new Emitter();
        emitter.add(() => {
            throw new Error('Oopsie');
            ++count.a;
        });
        emitter.add(() => ++count.b);
        expect(count).to.deep.equal({a: 0, b: 0});

        expect(emitter.notify.bind(emitter)).to.not.throw();
        expect(count).to.deep.equal({a: 0, b: 1});
        expect(emitter.notify.bind(emitter)).to.not.throw();
        expect(count).to.deep.equal({a: 0, b: 2});
    });

    it('.notifyUnsafe()', function () {
        const count = {a: 0, b: 0};

        const emitter = new Emitter();
        emitter.add(() => {
            ++count.a;
            throw new Error('Oopsie');
        });
        emitter.add(() => ++count.b);
        expect(count).to.deep.equal({a: 0, b: 0});

        expect(emitter.notifyUnsafe.bind(emitter)).to.throw();
        expect(count).to.deep.equal({a: 1, b: 0});
    });

    it('.notify() with nested .add()', function () {
        const emitter = new Emitter();

        const count = {a: 0, b: 0};
        const a = () => ++count.a;
        const b = () => ++count.b;

        emitter.add(() => emitter.add(a));
        emitter.add(() => emitter.add(b));

        emitter.notify();
        expect(count).to.deep.equal({a: 0, b: 0});
        emitter.notify();
        expect(count).to.deep.equal({a: 1, b: 1});
        emitter.notify();
        expect(count).to.deep.equal({a: 3, b: 3});
    });

    it('.notify() with nested .remove()', function () {
        const emitter = new Emitter();

        const count = {a: 0, b: 0, c: 0};
        const a = () => ++count.a;
        const b = () => ++count.b;
        const c = () => ++count.c;

        emitter.add(a);
        emitter.add(() => {
            emitter.remove(a);
            emitter.add(c);
            emitter.remove(b);
        });
        emitter.add(b);

        emitter.notify();
        expect(count).to.deep.equal({a: 1, b: 1, c: 0});
        emitter.notify();
        expect(count).to.deep.equal({a: 1, b: 1, c: 1});
        expect(emitter.listenerCount).to.equal(3); /* `c` added twice at this point */
    });

    it('.remove() with reference', function () {
        const emitter = new Emitter();
        const count = {a: 0, b: 0, c: 0};

        const a = () => ++count.a;
        const b = () => ++count.b;
        const c = () => ++count.c;
        emitter.add(a);
        emitter.add(b);

        emitter.notify();
        expect(count).to.deep.equal({a: 1, b: 1, c: 0});

        emitter.remove(a);
        emitter.notify();
        expect(count).to.deep.equal({a: 1, b: 2, c: 0});

        emitter.remove(b);
        emitter.notify();
        expect(count).to.deep.equal({a: 1, b: 2, c: 0});

        emitter.add(a);
        emitter.add(c);
        emitter.notify();
        expect(count).to.deep.equal({a: 2, b: 2, c: 1});

        emitter.remove(() => {}); /* Shouldn't do anything */
        expect(count).to.deep.equal({a: 2, b: 2, c: 1});

        emitter.remove(c);
        emitter.notify();
        expect(count).to.deep.equal({a: 3, b: 2, c: 1});

        /* `off() when empty. Shouldn't do anything */
        emitter.remove(() => {});
    });

    it('.remove() with id', function () {
        const emitter = new Emitter();
        const count = {a: 0, b: 0, c: 0};
        emitter.add(() => ++count.a, {id: 'a'});
        emitter.add(() => ++count.b, {id: 'b'});
        emitter.add(() => ++count.c, {id: 'c'});
        emitter.notify();

        emitter.remove('a');
        emitter.notify();
        expect(count).deep.equal({a: 1, b: 2, c: 2});
        emitter.remove('c');
        emitter.notify();
        expect(count).deep.equal({a: 1, b: 3, c: 2});
        emitter.remove('b');
        emitter.notify();
        expect(count).deep.equal({a: 1, b: 3, c: 2});

        expect(emitter.listenerCount).to.equal(0);
    });

    it('.remove() with reference id', function () {
        const emitter = new Emitter();
        const count = {a: 0, b: 0};

        const idA = {};
        const idB = () => {}; /* Test with a function as id */
        const listenerB = () => ++count.b;
        emitter.add(() => ++count.a, {id: idA});
        emitter.add(listenerB, {id: idB});
        emitter.notify();
        expect(count).deep.equal({a: 1, b: 1});

        emitter.remove(idA);
        emitter.notify();
        expect(count).deep.equal({a: 1, b: 2});
        emitter.remove(idB);
        emitter.notify();
        expect(count).deep.equal({a: 1, b: 2});

        expect(emitter.listenerCount).to.equal(0);
    });

    it('.remove() with duplicates', function () {
        const emitter = new Emitter();

        const count = {a: 0, b: 0, c: 0};
        const idA = () => {};
        const bListener = () => ++count.b;
        emitter.add(() => ++count.a, {id: idA});
        emitter.add(() => ++count.a, {id: idA});
        emitter.add(bListener);
        emitter.add(bListener);
        emitter.add(() => ++count.c, {id: 'c'});
        emitter.add(() => ++count.c, {id: 'c'});
        emitter.notify();
        expect(count).deep.equal({a: 2, b: 2, c: 2});

        emitter.remove(bListener);
        emitter.notify();
        expect(count).deep.equal({a: 4, b: 2, c: 4});
        emitter.remove('c');
        emitter.notify();
        expect(count).deep.equal({a: 6, b: 2, c: 4});
        emitter.remove(idA);
        emitter.notify();
        expect(count).deep.equal({a: 6, b: 2, c: 4});
    });

    it('.has()', function () {
        const emitter = new Emitter();
        const a = () => {};
        const b = () => console.log('Hello World! From B');
        const c = () => console.log('Hello World! From C');
        expect(emitter.has(a)).to.be.false;
        expect(emitter.has(b)).to.be.false;
        expect(emitter.has(c)).to.be.false;

        emitter.add(a);
        expect(emitter.has(a)).to.be.true;
        emitter.add(b);
        expect(emitter.has(b)).to.be.true;
        emitter.add(c, {id: 'c'});
        expect(emitter.has('c')).to.be.true;

        emitter.remove(b);
        expect(emitter.has(b)).to.be.false;
        emitter.remove('c');
        expect(emitter.has(c)).to.be.false;
        emitter.remove(a);
        expect(emitter.has(a)).to.be.false;
    });

    it('.promise()', async function () {
        const emitter = new Emitter<[number]>();
        setTimeout(() => emitter.notify(42), 5);
        const result = await emitter.promise();
        expect(result).to.equal(42);
    });

    describe('Multiple Data', function () {
        it('notify', function () {
            const emitter = new Emitter<[number | null, string | null]>();
            const result: {a: number | null; b: string | null} = {a: null, b: null};
            emitter.add((a, b) => {
                result.a = a;
                result.b = b;
            });

            expect(result).deep.equal({a: null, b: null});
            emitter.notify(42, 'Hello World!');
            expect(result).deep.equal({a: 42, b: 'Hello World!'});
        });

        it('notify references', function () {
            const expectedA = {myNumber: 43};
            const expectedB = {myString: 'Hello Planet!'};
            const result: {a: typeof expectedA | null; b: typeof expectedB | null} = {
                a: null,
                b: null,
            };
            const emitter = new Emitter<[typeof expectedA, typeof expectedB]>();
            emitter.add((a, b) => {
                result.a = a;
                result.b = b;
            });
            emitter.notify(expectedA, expectedB);
            expect(result.a).equal(expectedA);
            expect(result.b).equal(expectedB);
        });
    });
});

describe('RetainEmitter', function () {
    it('already resolved', function () {
        const emitter = new RetainEmitter<[number, string]>();
        const result: {a: number | null; b: string | null} = {a: null, b: null};

        emitter.notify(42, 'Hello World!');
        expect(result).deep.equal({a: null, b: null});

        emitter.add(
            (a, b) => {
                result.a = a;
                result.b = b;
            },
            {id: 'listener'}
        );
        expect(result).deep.equal({a: 42, b: 'Hello World!'});
        emitter.remove('listener');
    });

    it('already resolved references', function () {
        const expectedA = {myNumber: 43};
        const expectedB = {myString: 'Hello Planet!'};
        const emitter = new RetainEmitter<[typeof expectedA, typeof expectedB]>();
        const result: {a: typeof expectedA | null; b: typeof expectedB | null} = {
            a: null,
            b: null,
        };
        emitter.notify(expectedA, expectedB);
        emitter.add((a, b) => {
            result.a = a;
            result.b = b;
        });
        expect(result.a).equal(expectedA);
        expect(result.b).equal(expectedB);
    });

    it('.notify() with nested .add() already resolved', function () {
        const emitter = new RetainEmitter<[number, string]>();

        const count = {a: 0, b: 0};
        const a = () => ++count.a;
        const b = () => ++count.b;

        emitter.add(() => emitter.add(a));
        emitter.add(() => emitter.add(b));
        expect(count).to.deep.equal({a: 0, b: 0});

        /* Notify will add a and b which should be immediately called */
        emitter.notify(42, 'Hello World!');

        expect(count).to.deep.equal({a: 1, b: 1});
    });

    it('reset', function () {
        const emitter = new RetainEmitter<[number]>();

        let result = null;

        emitter.notify(42);
        emitter.add((data) => (result = data));
        expect(result).to.equal(42);

        /* When the reset emitter notifies its listeners, this should
         * unresolve the `emitter`. */
        result = null;
        emitter.reset();
        emitter.add((data) => (result = data));
        expect(result).to.be.null;
    });

    it('.data & .hasData', function () {
        const emitter = new RetainEmitter<[number]>();
        expect(emitter.isDataRetained).to.be.false;
        emitter.notify(42);
        expect(emitter.isDataRetained).to.be.true;
        expect(emitter.data).to.deep.equal([42]);
        emitter.reset();
        expect(emitter.isDataRetained).to.be.false;
    });
});
