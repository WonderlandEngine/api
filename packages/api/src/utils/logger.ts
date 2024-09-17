import {BitSet} from './bitset.js';

/**
 * Logging levels supported by {@link Logger}.
 */
export enum LogLevel {
    Info = 0,
    Warn = 1,
    Error = 2,
}

/**
 * Logging wrapper.
 *
 * This is used to allow turning on/off:
 *     - `console.log`
 *     - `console.warn`
 *     - `console.error`
 *
 * #### Usage
 *
 * ```js
 * import {Logger, LogLevel, LogTag} from '@wonderlandengine/api';
 *
 * // Create a logger with only the "error" and "warn" levels activated
 * const logger = new Logger(LogLevel.Warn, LogLevel.Error);
 *
 * // Only the "error" and "warn" levels are activated,
 * // this message isn't logged.
 * logger.info(LogTag.Component, 'This message is shushed')
 *
 * // Prints 'Hello Error!'
 * logger.error(LogTag.Component, 'Hello Error!');
 *
 * // Prints 'Hello Warning!'
 * logger.warn(LogTag.Component, 'Hello Warning!');
 * ```
 *
 * The log levels can be changed at anytime using the {@link BitSet} api:
 *
 * ```js
 * // Enable the "info" level
 * logger.levels.enable(LogLevel.Info);
 * * // Disable the "warn" level
 * logger.levels.disable(LogLevel.Warn);
 * ```
 *
 * #### Tags
 *
 * In addition, the logger supports tagging messages:
 *
 * ```js
 * import {Logger, LogLevel, LogTag} from '@wonderlandengine/api';
 *
 * const logger = new Logger(LogLevel.Info);
 *
 * logger.tags.disableAll();
 *
 * // All tags are off, this message isn't logged
 * logger.info(LogTag.Component, 'This message is shushed');
 *
 * logger.tags.enable(LogTag.Component);
 * logger.info(LogTag.Component, 'Hello World!') // Prints 'Hello World!'
 * ```
 *
 * The tagging system gives another layer of control to enable / disable
 * some specific logs.
 */
export class Logger {
    /**
     * Bitset of enabled levels.
     *
     * @hidden
     */
    levels: BitSet<LogLevel> = new BitSet();

    /**
     * Bitset of enabled tags.
     *
     * @hidden
     */
    tags: BitSet = new BitSet().enableAll();

    /**
     * Create a new logger instance.
     *
     * @param levels Default set of levels to enable.
     */
    constructor(...levels: LogLevel[]) {
        this.levels.enable(...levels);
    }

    /**
     * Log the message(s) using `console.log`.
     *
     * @param tag Tag represented by a positive integer.
     * @param msg A spread of message to log.
     * @returns Reference to self (for method chaining).
     */
    info(tag: number, ...msg: unknown[]): this {
        if (this.levels.enabled(LogLevel.Info) && this.tags.enabled(tag)) {
            console.log(...msg);
        }
        return this;
    }

    /**
     * Log the message(s) using `console.warn`.
     *
     * @param tag Tag represented by a positive integer.
     * @param msg A spread of message to log.
     * @returns Reference to self (for method chaining).
     */
    warn(tag: number, ...msg: unknown[]): this {
        if (this.levels.enabled(LogLevel.Warn) && this.tags.enabled(tag)) {
            console.warn(...msg);
        }
        return this;
    }

    /**
     * Log the message(s) using `console.error`.
     *
     * @param tag Tag represented by a positive integer.
     * @param msg A spread of message to log.
     * @returns Reference to self (for method chaining).
     */
    error(tag: number, ...msg: unknown[]): this {
        if (this.levels.enabled(LogLevel.Error) && this.tags.enabled(tag)) {
            console.error(...msg);
        }
        return this;
    }
}
