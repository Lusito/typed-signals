import type { Signal } from "./Signal";

/**
 * Base class for collectors.
 *
 * @typeparam THandler The function signature to be implemented by handlers.
 */
export abstract class Collector<THandler extends (...args: any[]) => any> {
    /**
     * Publish the bound signal event (call all handlers) to start the collection process.
     *
     * @method
     */
    public readonly emit: (...args: Parameters<THandler>) => void;

    /**
     * Create a new collector.
     *
     * @param signal The signal to emit.
     */
    public constructor(signal: Signal<THandler>) {
        // eslint-disable-next-line dot-notation
        this.emit = (...args: Parameters<THandler>) => {
            // eslint-disable-next-line dot-notation
            signal["emitCollecting"](this, args);
        };
    }

    /**
     * Process the results of a handler invocation.
     *
     * @param result true to continue processing handlers.
     */
    public abstract handleResult(result: ReturnType<THandler>): boolean;
}
