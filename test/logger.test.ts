import {expect} from '@esm-bundle/chai';

import {Logger, LogLevel} from '..';

/** Tag enumeration to use throughout the test. */
enum Tag {
    First = 0,
    Last = 31,
}

describe('Logger', function () {
    const consoleLog = console.log;
    const consoleWarn = console.warn;
    const consoleErr = console.error;
    after(function () {
        console.log = consoleLog;
        console.warn = consoleWarn;
        console.error = consoleErr;
    });

    let logs = {info: [] as any[], warn: [] as any[], error: [] as any[]};
    console.log = function (...data: any[]) {
        logs.info.push(...data);
    };
    console.warn = function (...data: any[]) {
        logs.warn.push(...data);
    };
    console.error = function (...data: any[]) {
        logs.error.push(...data);
    };

    beforeEach(function () {
        logs = {info: [], warn: [], error: []};
    });

    /**
     * Create a test for a given log level
     *
     * @param level The level to create the test for
     * @param tags The tags to check
     */
    function levelTest(level: keyof typeof LogLevel, tags: (keyof typeof Tag)[]) {
        const logger = new Logger(LogLevel[level]);

        const logFunction = level.toLowerCase() as 'info' | 'warn' | 'error';
        const messages = {info: 'Hello', warn: 'World', error: 'How are you?'};

        const expected = {
            info: [] as string[],
            warn: [] as string[],
            error: [] as string[],
        };
        expected[logFunction].push(messages[logFunction]);

        for (const name of tags) {
            const tag = Tag[name];
            it(`LogLevel.${level} > Tag ${name}`, function () {
                expect(logs).to.deep.equal({info: [], warn: [], error: []});
                logger.info(tag, messages.info);
                logger.warn(tag, messages.warn);
                logger.error(tag, messages.error);
                expect(logs).to.deep.equal(expected);
            });
        }
    }

    /* Create tests for each log level: info, warn & error. */
    levelTest('Info', ['First', 'Last']);
    levelTest('Warn', ['First', 'Last']);
    levelTest('Error', ['First', 'Last']);

    it('LogLevel.Info | LogLevel.Warn | LogLevel.Error', async function () {
        const logger = new Logger(LogLevel.Info, LogLevel.Warn, LogLevel.Error);
        expect(logs).to.deep.equal({info: [], warn: [], error: []});
        logger.info(Tag.First, 'Hello');
        logger.warn(Tag.First, 'World');
        logger.error(Tag.First, 'How are you?');
        expect(logs).to.deep.equal({
            info: ['Hello'],
            warn: ['World'],
            error: ['How are you?'],
        });
    });

    it('non matching tags', function () {
        expect(logs).to.deep.equal({info: [], warn: [], error: []});

        const logger = new Logger(LogLevel.Info);
        logger.tags.disableAll();

        logger.info(Tag.First, 'First');
        expect(logs).to.deep.equal({info: [], warn: [], error: []});
        logger.info(Tag.Last, 'Last');
        expect(logs).to.deep.equal({info: [], warn: [], error: []});

        logger.tags.enable(Tag.First);
        logger.info(Tag.First, 'First');
        logger.info(Tag.Last, 'Last');
        expect(logs).to.deep.equal({info: ['First'], warn: [], error: []});

        logger.tags.enable(Tag.Last);
        logger.info(Tag.Last, 'Last');
        expect(logs).to.deep.equal({info: ['First', 'Last'], warn: [], error: []});
    });

    it('multiple arguments', function () {
        const logger = new Logger(LogLevel.Info, LogLevel.Warn, LogLevel.Error);
        expect(logs).to.deep.equal({info: [], warn: [], error: []});
        logger.info(Tag.First, 'Hello', 'you');
        logger.warn(Tag.First, 'How', 'are', 'you');
        logger.error(Tag.First, 'today', '?');
        expect(logs).to.deep.equal({
            info: ['Hello', 'you'],
            warn: ['How', 'are', 'you'],
            error: ['today', '?'],
        });
    });
});
