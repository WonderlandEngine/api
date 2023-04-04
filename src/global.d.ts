/**
 * Emscripten exports.
 */

interface Window {
    instantiateWonderlandRuntime?: (module: any) => void;
    _WL?: {
        runtimes: {[key: string]: (module: any) => void};
    };
}
