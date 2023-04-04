import {isString} from './object.js';

/**
 * Listener callback type, used in {@link Emitter.add}.
 */
export type ListenerCallback<T extends unknown[] = void[]> = (...data: T) => void;

/**
 * Registration options for a listener in an {@link Emitter}.
 */
export interface ListenerOptions {
    /**
     * Listener identifier. This is used to find and remove the listener
     * without needing the callback reference.
     *
     * For more information, please look at the {@link Emitter.remove} method.
     */
    id: string | undefined;
    /**
     * If `true`, the listener is automatically removed after it's invoked.
     * Defaults to `false`.
     */
    once: boolean;
}

/** Internal listener type. */
type Listener<T extends unknown[]> = ListenerOptions & {
    callback: ListenerCallback<T>;
};

/**
 * Event emitter.
 *
 * This class allows to register listeners that will get notified by the emitter.
 *
 * Usage example
 *
 * ```js
 * // `onPreRender` is an `Emitter` instance.
 * scene.onPreRender.add(() => console.log('before rendering'));
 * // `onPostRender` is an `Emitter` instance.
 * scene.onPostRender.add(() => console.log('before rendering'));
 * ```
 *
 * You can create your own emitters:
 *
 * ```js
 * import {Emitter} from '@wonderlandengine/api';
 *
 * const emitter = new Emitter();
 * ```
 *
 * You can notify listeners in to your emitter using {@link Emitter.notify}:
 *
 * ```js
 * // Notifies all the listeners.
 * emitter.notify();
 * // Notifies all the listeners with some data.
 * emitter.notify({ myInt: 42, myStr: 'Hello World!' });
 * ```
 *
 * @category event
 */
export class Emitter<T extends unknown[] = void[]> {
    /**
     * List of listeners to trigger when `notify` is called.
     *
     * @hidden
     */
    private readonly _listeners: Listener<T>[] = [];

    /** Pre-resolved data. @hidden */
    private _event: T | undefined = undefined;

    /**
     * If `true`, the emitter will emit the value of the last
     * {@link Emitter.notify notify} to listeners added afterwards.
     *
     * @hidden
     */
    private readonly _autoResolve: boolean;

    /**
     * Create a new instance.
     *
     * @param autoResolve If `true`, the emitter will store the data of last
     *     {@link Emitter.notify} notify to automatically resolve future listeners.
     */
    constructor(autoResolve = false) {
        this._autoResolve = autoResolve;
    }

    /**
     * Register a new listener to be triggered on {@link Emitter.notify}.
     *
     * Basic usage:
     *
     * ```js
     * emitter.add((data) => {
     *     console.log('event received!');
     *     console.log(data);
     * });
     * ```
     *
     * Automatically remove the listener when an event is received:
     *
     * ```js
     * emitter.add((data) => {
     *     console.log('event received!');
     *     console.log(data);
     * }, {once: true});
     * ```
     *
     * @param listener The callback to register.
     * @param opts The listener options. For more information, please have a look
     *     at the {@link ListenerOptions} interface.
     *
     * @returns Reference to self (for method chaining)
     */
    add(listener: ListenerCallback<T>, opts: Partial<ListenerOptions> = {}): this {
        const {once = false, id = undefined} = opts;

        if (this._event !== undefined) {
            listener(...this._event);
            /* Listener doesn't need to be stored, short circuit the insertion. */
            if (once) return this;
        }
        this._listeners.push({id, once, callback: listener});
        return this;
    }

    /**
     * Equivalent to {@link Emitter.add}.
     *
     * @param listeners The callback(s) to register.
     * @returns Reference to self (for method chaining).
     *
     * @deprecated Please use {@link Emitter.add} instead.
     */
    push(...listeners: ListenerCallback<T>[]): this {
        for (const cb of listeners) this.add(cb);
        return this;
    }

    /**
     * Register a new listener to be triggered on {@link Emitter.notify}.
     *
     * Once notified, the listener will be automatically removed.
     *
     * The method is equivalent to calling {@link Emitter.add} with:
     *
     * ```js
     * emitter.add(listener, {once: true});
     * ```
     *
     * @param listener The callback to register.
     * @param opts The listener options. For more information, please have a look
     *     at the {@link ListenerOptions} interface.
     *
     * @returns Reference to self (for method chaining).
     */
    once(listener: ListenerCallback<T>) {
        return this.add(listener, {once: true});
    }

    /**
     * Remove a registered listener.
     *
     * Usage with a callback:
     *
     * ```js
     * const listener = (data) => console.log(data);
     * emitter.add(listener);
     *
     * // Remove using the callback reference:
     * emitter.remove(listener);
     * ```
     *
     * Usage with an id:
     *
     * ```js
     * emitter.add((data) => console.log(data), {id: 'my-callback'});
     *
     * // Remove using the id:
     * emitter.remove('my-callback');
     * ```
     *
     * @param listener The registered callback or a string representing the `id`.
     *
     * @returns Reference to self (for method chaining)
     */
    remove(listener: ListenerCallback<T> | string): this {
        const index = this._find(listener);
        if (index !== null) this._listeners.splice(index, 1);
        return this;
    }

    /**
     * Check whether the listener is registered.
     *
     * @note This method performs a linear search.
     *
     * @param listener The registered callback or a string representing the `id`.
     * @returns `true` if the handle is found, `false` otherwise.
     */
    has(listener: ListenerCallback<T> | string): boolean {
        return this._find(listener) !== null;
    }

    /**
     * Notify listeners with the given data object.
     *
     * @note This method ensures all listeners are called even if
     * an exception is thrown. For (possibly) faster notification,
     * please use {@link Emitter.notifyUnsafe}.
     *
     * @param data The data to pass to listener when invoked.
     */
    notify(...data: T): void {
        const listeners = this._listeners;

        if (this._autoResolve) this._event = data;

        for (let i = 0; i < listeners.length; ++i) {
            const listener = listeners[i];
            if (listener.once) listeners.splice(i--, 1);
            try {
                listener.callback(...data);
            } catch (e) {
                console.error(e);
            }
        }
    }

    /**
     * Notify listeners with the given data object.
     *
     * @note Because this method doesn't catch exceptions, some listeners
     * will be skipped on a throw. Please use {@link Emitter.notify} for safe
     * notification.
     *
     * @param data The data to pass to listener when invoked.
     */
    notifyUnsafe(...data: T): void {
        const listeners = this._listeners;

        if (this._autoResolve) this._event = data;

        for (let i = 0; i < listeners.length; ++i) {
            const listener = listeners[i];
            if (listener.once) listeners.splice(i--, 1);
            listener.callback(...data);
        }
    }

    /**
     * Return a promise that will resolve on the next event.
     *
     * @note The promise might never resolve if no event is sent.
     *
     * @returns A promise that resolves with the data passed to
     *     {@link Emitter.notify}.
     */
    promise(): Promise<T> {
        return new Promise((res, _) => {
            this.once((...args) => {
                if (args.length > 1) {
                    res(args);
                } else {
                    res(args[0] as T);
                }
            });
        });
    }

    /**
     * Find the listener index.
     *
     * @param listener The registered callback or a string representing the `id`.
     * @returns The index if found, `null` otherwise.
     *
     * @hidden
     */
    private _find(listener: ListenerCallback<T> | string): number | null {
        const listeners = this._listeners;
        if (isString(listener)) {
            for (let i = 0; i < listeners.length; ++i) {
                if (listeners[i].id === listener) return i;
            }
            return null;
        }
        for (let i = 0; i < listeners.length; ++i) {
            if (listeners[i].callback === listener) return i;
        }
        return null;
    }
}
