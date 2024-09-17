/**
 * Emscripten exports.
 */

interface Window {
    instantiateWonderlandRuntime?: (
        module?: Record<string, any>
    ) => Promise<Record<string, any>>;
    _WL?: {
        runtimes: Record<
            string,
            (module?: Record<string, any>) => Promise<Record<string, any>>
        >;
    };
}
