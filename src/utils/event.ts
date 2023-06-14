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
     * The identifier can be any type. However, remember that the comparison will be
     * by-value for primitive types (string, number), but by reference for objects.
     *
     * For more information, please look at the {@link Emitter.remove} method.
     */
    id: any | undefined;
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
 * scene.onPostRender.add(() => console.log('after rendering'));
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
    protected readonly _listeners: Listener<T>[] = [];

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
     * Using identifiers, you will need to ensure your value is unique to avoid
     * removing listeners from other libraries, e.g.,:
     *
     * ```js
     * emitter.add((data) => console.log(data), {id: 'non-unique'});
     * // This second listener could be added by a third-party library.
     * emitter.add((data) => console.log('Hello From Library!'), {id: 'non-unique'});
     *
     * // Ho Snap! This also removed the library listener!
     * emitter.remove('non-unique');
     * ```
     *
     * The identifier can be any type. However, remember that the comparison will be
     * by-value for primitive types (string, number), but by reference for objects.
     *
     * Example:
     *
     * ```js
     * emitter.add(() => console.log('Hello'), {id: {value: 42}});
     * emitter.add(() => console.log('World!'), {id: {value: 42}});
     * emitter.remove({value: 42}); // None of the above listeners match!
     * emitter.notify(); // Prints 'Hello' and 'World!'.
     * ```
     *
     * Here, both emitters have id `{value: 42}`, but the comparison is made by reference. Thus,
     * the `remove()` call has no effect. We can make it work by doing:
     *
     * ```js
     * const id = {value: 42};
     * emitter.add(() => console.log('Hello'), {id});
     * emitter.add(() => console.log('World!'), {id});
     * emitter.remove(id); // Same reference, it works!
     * emitter.notify(); // Doesn't print.
     * ```
     *
     * @param listener The registered callback or a value representing the `id`.
     *
     * @returns Reference to self (for method chaining)
     */
    remove(listener: ListenerCallback<T> | any): this {
        const listeners = this._listeners;
        for (let i = 0; i < listeners.length; ++i) {
            const target = listeners[i];
            if (target.callback === listener || target.id === listener) {
                listeners.splice(i--, 1);
            }
        }
        return this;
    }

    /**
     * Check whether the listener is registered.
     *
     * @note This method performs a linear search.
     *
     * @param listener The registered callback or a value representing the `id`.
     * @returns `true` if the handle is found, `false` otherwise.
     */
    has(listener: ListenerCallback<T> | any): boolean {
        const listeners = this._listeners;
        for (let i = 0; i < listeners.length; ++i) {
            const target = listeners[i];
            if (target.callback === listener || target.id === listener) return true;
        }
        return false;
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

    /** Number of listeners. */
    get listenerCount() {
        return this._listeners.length;
    }

    /** `true` if it has no listeners, `false` otherwise. */
    get isEmpty() {
        return this.listenerCount === 0;
    }
}

/**
 * Registration options for a listener in an {@link RetainEmitter}.
 *
 * Those options extend {@link ListenerOptions}.
 */
export interface RetainListenerOptions extends ListenerOptions {
    /**
     * If `true`, directly resolves if the emitter retains a value. If `false`,
     * the listener isn't invoked until the next {@link Emitter.notify}.
     *
     * Defaults to `true`.
     */
    immediate: boolean;
}

/* Dummy value used with RetainEmitter. */
const RetainEmitterUndefined: Record<any, unknown> = {};

/**
 * Event emitter that retains event data when notified.
 *
 * After a notification happens, subsequent calls to {@link RetainEmitter.add} will get
 * automatically notified.
 *
 * You can use another emitter in order to cancel the last retained event:
 *
 * ```js
 * import {Emitter, RetainedEmitter} from '@wonderlandengine/api';
 *
 * const onStart = new RetainedEmitter();
 *
 * onStart.notify(42);
 * onStart.add((data) => console.log(data)) // Prints '42'.
 * ```
 *
 * You can reset the state of the emitter, i.e., making it forget about the
 * last event using:
 *
 * ```js
 * import {Emitter, RetainedEmitter} from '@wonderlandengine/api';
 *
 * const onStart = new RetainedEmitter();
 * onStart.notify(42);
 * onStart.add((data) => console.log(data)) // Prints '42'.
 *
 * // Reset the state of the emitter.
 * onStart.reset();
 * onStart.add((data) => console.log(data)) // Doesn't print anything.
 * ```
 *
 * For more information about emitters, please have a look at the base {@link Emitter} class.
 *
 * @category event
 */
export class RetainEmitter<T extends unknown[] = void[]> extends Emitter<T> {
    /** Pre-resolved data. @hidden */
    protected _event: T | typeof RetainEmitterUndefined = RetainEmitterUndefined;

    /**
     * Emitter target used to reset the state of this emitter.
     *
     * @hidden
     */
    protected readonly _reset: Emitter<any> | undefined;

    /** @override */
    add(listener: ListenerCallback<T>, opts?: Partial<RetainListenerOptions>): this {
        const immediate = opts?.immediate ?? true;
        if (this._event !== RetainEmitterUndefined && immediate) {
            listener(...(this._event as T));
        }
        super.add(listener, opts);
        return this;
    }

    /**
     * @override
     *
     * @param listener The callback to register.
     * @param immediate If `true`, directly resolves if the emitter retains a value.
     *
     * @returns Reference to self (for method chaining).
     */
    once(listener: ListenerCallback<T>, immediate?: boolean) {
        return this.add(listener, {once: true, immediate});
    }

    /** @override */
    notify(...data: T): void {
        this._event = data;
        super.notify(...data);
    }

    /** @override */
    notifyUnsafe(...data: T): void {
        this._event = data;
        super.notifyUnsafe(...data);
    }

    /**
     * Reset the state of the emitter.
     *
     * Further call to {@link Emitter.add} will not automatically resolve,
     * until a new call to {@link Emitter.notify} is performed.
     *
     * @returns Reference to self (for method chaining)
     */
    reset(): this {
        this._event = RetainEmitterUndefined;
        return this;
    }

    /** Returns the retained data, or `undefined` if no data was retained. */
    get data(): T | undefined {
        return this.isDataRetained ? this._event : undefined;
    }

    /** `true` if data is retained from the last event, `false` otherwise. */
    get isDataRetained(): boolean {
        return this._event !== RetainEmitterUndefined;
    }
}
