import { Collector } from "./Collector";

/**
 * Returns the result of the last signal handler from a signal emission.
 *
 * @typeparam THandler The function signature to be implemented by handlers.
 */
export class CollectorLast<THandler extends (...args: any[]) => any> extends Collector<THandler> {
    private result: ReturnType<THandler> | undefined;

    public handleResult(result: ReturnType<THandler>): boolean {
        this.result = result;
        return true;
    }

    /**
     * Get the result of the last signal handler.
     */
    public getResult(): ReturnType<THandler> | undefined {
        return this.result;
    }

    /**
     * Reset the result
     */
    public reset(): void {
        delete this.result;
    }
}
