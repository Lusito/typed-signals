import { Collector } from "./Collector";

/**
 * Returns the result of the all signal handlers from a signal emission in an array.
 *
 * @typeparam THandler The function signature to be implemented by handlers.
 */
export class CollectorArray<THandler extends (...args: any[]) => any> extends Collector<THandler> {
    private result: Array<ReturnType<THandler>> = [];

    public handleResult(result: ReturnType<THandler>): boolean {
        this.result.push(result);
        return true;
    }

    /**
     * Get the list of results from the signal handlers.
     */
    public getResult(): Array<ReturnType<THandler>> {
        return this.result;
    }

    /**
     * Reset the result
     */
    public reset(): void {
        this.result.length = 0;
    }
}
