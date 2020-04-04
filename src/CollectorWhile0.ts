import { Collector } from "./Collector";

/**
 * Keep signal emissions going while all handlers return false.
 *
 * @typeparam THandler The function signature to be implemented by handlers.
 */
export class CollectorWhile0<THandler extends (...args: any[]) => boolean> extends Collector<THandler> {
    private result = false;

    public handleResult(result: boolean): boolean {
        this.result = result;
        return !this.result;
    }

    /**
     * Get the result of the last signal handler.
     */
    public getResult(): boolean {
        return this.result;
    }

    /**
     * Reset the result
     */
    public reset(): void {
        this.result = false;
    }
}
