// CC0 Public Domain: http://creativecommons.org/publicdomain/zero/1.0/

/**
 * SignalLink implements a doubly-linked ring with nodes containing the signal handlers.
 */
class SignalLink<THandler extends (...args: any[]) => any> {
    private enabled = true;

    private readonly order: number;

    public newLink = false;

    public next: SignalLink<THandler>;

    public prev: SignalLink<THandler>;

    public callback: THandler | null = null;

    public constructor(prev: SignalLink<THandler> | null = null, next: SignalLink<THandler> | null = null, order = 0) {
        this.prev = prev ?? this;
        this.next = next ?? this;
        this.order = order;
    }

    public isEnabled(): boolean {
        return this.enabled && !this.newLink;
    }

    public setEnabled(flag: boolean): void {
        this.enabled = flag;
    }

    public unlink(): void {
        this.callback = null;
        this.next.prev = this.prev;
        this.prev.next = this.next;
    }

    public insert(callback: THandler, order: number): SignalLink<THandler> {
        let after = this.prev;
        while (after !== this) {
            if (after.order <= order) break;
            after = after.prev;
        }

        const link = new SignalLink(after, after.next, order);
        link.callback = callback;
        after.next = link;
        link.next.prev = link;

        return link;
    }
}

/**
 * Represents a connection of a callback to a signal.
 */
export interface SignalConnection {
    /**
     * Stop this connection from receiving further events permanently.
     *
     * @returns false if the connection has already been severed.
     */
    disconnect(): boolean;

    /**
     * If set to false it prevents the handler from receiving the signals events.
     */
    enabled: boolean;
}

/**
 * Implementation of SignalConnection, for internal use only.
 */
class SignalConnectionImpl<THandler extends (...args: any[]) => any> implements SignalConnection {
    private link: SignalLink<THandler> | null;

    /**
     * @param head The head link of the signal.
     * @param link The actual link of the connection.
     */
    public constructor(link: SignalLink<THandler>) {
        this.link = link;
    }

    public disconnect(): boolean {
        if (this.link !== null) {
            this.link.unlink();
            this.link = null;
            return true;
        }

        return false;
    }

    public set enabled(enable: boolean) {
        if (this.link) this.link.setEnabled(enable);
    }

    public get enabled(): boolean {
        // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
        return this.link !== null && this.link.isEnabled();
    }
}

/**
 * Represents a list of connections to a signal for easy disconnect.
 */
export class SignalConnections {
    private list: SignalConnection[] = [];

    /**
     * Add a connection to the list.
     * @param connection
     */
    public add(connection: SignalConnection) {
        this.list.push(connection);
    }

    /**
     * Disconnect all connections in the list and empty the list.
     */
    public disconnectAll() {
        for (const connection of this.list) {
            connection.disconnect();
        }
        this.list = [];
    }
}

/**
 * A signal is a way to publish and subscribe to events.
 *
 * @typeparam THandler The function signature to be implemented by handlers.
 */
export class Signal<THandler extends (...args: any[]) => any> {
    private readonly head = new SignalLink<THandler>();

    private hasNewLinks = false;

    private emitDepth = 0;

    /**
     * Subscribe to this signal.
     *
     * @param callback This callback will be run when emit() is called.
     * @param order Handlers with a higher order value will be called later.
     */
    public connect(callback: THandler, order = 0): SignalConnection {
        const link = this.head.insert(callback, order);
        if (this.emitDepth > 0) {
            this.hasNewLinks = true;
            link.newLink = true;
        }
        return new SignalConnectionImpl(link);
    }

    /**
     * Unsubscribe from this signal with the original callback instance.
     * While you can use this method, the SignalConnection returned by connect() will not be updated!
     *
     * @param callback The callback you passed to connect().
     */
    public disconnect(callback: THandler) {
        for (let link = this.head.next; link !== this.head; link = link.next) {
            if (link.callback === callback) {
                link.unlink();
                return true;
            }
        }
        return false;
    }

    /**
     * Disconnect all handlers from this signal event.
     */
    public disconnectAll() {
        while (this.head.next !== this.head) {
            this.head.next.unlink();
        }
    }

    /**
     * Publish this signal event (call all handlers).
     */
    public emit(...args: Parameters<THandler>) {
        this.emitDepth++;

        for (let link = this.head.next; link !== this.head; link = link.next) {
            if (link.isEnabled() && link.callback) link.callback.apply(null, args);
        }

        this.emitDepth--;
        this.unsetNewLink();
    }

    protected emitCollecting(collector: Collector<THandler>, args: Parameters<THandler>) {
        this.emitDepth++;

        for (let link = this.head.next; link !== this.head; link = link.next) {
            if (link.isEnabled() && link.callback) {
                const result = link.callback.apply(null, args);
                if (!collector.handleResult(result)) break;
            }
        }
        this.emitDepth--;
        this.unsetNewLink();
    }

    private unsetNewLink() {
        if (this.hasNewLinks && this.emitDepth === 0) {
            for (let link = this.head.next; link !== this.head; link = link.next) link.newLink = false;
            this.hasNewLinks = false;
        }
    }
}

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

/**
 * Keep signal emissions going while all handlers return true.
 *
 * @typeparam THandler The function signature to be implemented by handlers.
 */
export class CollectorUntil0<THandler extends (...args: any[]) => boolean> extends Collector<THandler> {
    private result = false;

    public handleResult(result: boolean): boolean {
        this.result = result;
        return this.result;
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
