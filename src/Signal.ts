// CC0 Public Domain: http://creativecommons.org/publicdomain/zero/1.0/

/**
 * SignalLink implements a doubly-linked ring with nodes containing the signal handlers.
 */
class SignalLink {
    private enabled = true;
    private readonly order: number;
    public newLink = false;
    public next: SignalLink;
    public prev: SignalLink;
    public callback: Function | null = null;

    public constructor(prev: SignalLink | null = null, next: SignalLink | null = null, order: number = 0) {
        this.prev = prev ? prev : this;
        this.next = next ? next : this;
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

    public insert(callback: Function, order: number): SignalLink {
        let after = this.prev;
        while (after !== this) {
            if (after.order <= order)
                break;
            after = after.prev;
        }

        let link = new SignalLink(after, after.next, order);
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
class SignalConnectionImpl implements SignalConnection {
    private link: SignalLink | null;

    /**
     * @param head The head link of the signal.
     * @param link The actual link of the connection.
     */
    public constructor(head: SignalLink, link: SignalLink) {
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
        if (this.link)
            this.link.setEnabled(enable);
    }
    public get enabled(): boolean {
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
        for (let connection of this.list) {
            connection.disconnect();
        }
        this.list = [];
    }
}

/**
 * A signal is a way to publish and subscribe to events.
 * 
 * @typeparam CB The function signature to be implemented by handlers.
 */
export class Signal<CB extends Function> {
    /**
     * Publish this signal event (call all handlers).
     * 
     * @function
     */
    public readonly emit: CB;
    private readonly head = new SignalLink();
    private hasNewLinks = false;
    private emitDepth = 0;

    /**
     * Create a new signal.
     */
    public constructor() {
        this.emit = this.emitInternal.bind(this);
    }

    /**
     * Subscribe to this signal.
     * 
     * @param callback This callback will be run when emit() is called.
     * @param order Handlers with a higher order value will be called later.
     */
    public connect(callback: CB, order: number = 0): SignalConnection {
        let link = this.head.insert(callback, order);
        if (this.emitDepth > 0) {
            this.hasNewLinks = true;
            link.newLink = true;
        }
        return new SignalConnectionImpl(this.head, link);
    }

    /**
     * Disconnect all handlers from this signal event.
     */
    public disconnectAll() {
        while (this.head.next !== this.head) {
            this.head.next.unlink();
        }
    }

    private emitInternal() {
        this.emitDepth++;

        for (let link = this.head.next; link !== this.head; link = link.next) {
            if (link.isEnabled() && link.callback)
                link.callback.apply(null, arguments);
        }

        this.emitDepth--;
        this.unsetNewLink();
    }

    protected emitCollecting<RT>(collector: Collector<CB, RT>, args: any) {
        this.emitDepth++;

        for (let link = this.head.next; link !== this.head; link = link.next) {
            if (link.isEnabled() && link.callback) {
                let result = link.callback.apply(null, args);
                if (!collector.handleResult(result))
                    break;
            }
        }
        this.emitDepth--;
        this.unsetNewLink();
    }

    private unsetNewLink() {
        if (this.hasNewLinks && this.emitDepth == 0) {
            for (let link = this.head.next; link !== this.head; link = link.next)
                link.newLink = false;
            this.hasNewLinks = false;
        }
    }
}

/**
 * Base class for collectors.
 * 
 * @typeparam CB The function signature to be implemented by handlers.
 * @typeparam RT The return type of CB
 */
export abstract class Collector<CB extends Function, RT> {
    /**
     * Publish the bound signal event (call all handlers) to start the collection process.
     * 
     * @method
     */
    public readonly emit: CB;

    /**
     * Create a new collector.
     * 
     * @param signal The signal to emit.
     */
    public constructor(signal: Signal<CB>) {
        let self = this;
        this.emit = function () { (signal as any).emitCollecting(self, arguments); } as any;
    }

    /**
     * Process the results of a handler invocation.
     * 
     * @param result true to continue processing handlers.
     */
    public abstract handleResult(result: RT): boolean;
}

/**
 * Returns the result of the last signal handler from a signal emission.
 * 
 * @typeparam CB The function signature to be implemented by handlers.
 * @typeparam RT The return type of CB
 */
export class CollectorLast<CB extends Function, RT> extends Collector<CB, RT> {
    private result: RT | undefined;

    public handleResult(result: RT): boolean {
        this.result = result;
        return true;
    }

    /**
     * Get the result of the last signal handler.
     */
    public getResult(): RT | undefined {
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
 * @typeparam CB The function signature to be implemented by handlers.
 * Return type of CB must be boolean.
 */
export class CollectorUntil0<CB extends Function> extends Collector<CB, boolean> {
    private result: boolean = false;

    public handleResult(result: boolean): boolean {
        this.result = result;
        return this.result ? true : false;
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
 * @typeparam CB The function signature to be implemented by handlers.
 * Return type of CB must be boolean.
 */
export class CollectorWhile0<CB extends Function> extends Collector<CB, boolean> {
    private result: boolean = false;

    public handleResult(result: boolean): boolean {
        this.result = result;
        return this.result ? false : true;
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
 * @typeparam CB The function signature to be implemented by handlers.
 * @typeparam RT The return type of CB
 */
export class CollectorArray<CB extends Function, RT> extends Collector<CB, RT> {
    private result: RT[] = [];

    public handleResult(result: RT): boolean {
        this.result.push(result);
        return true;
    }

    /**
     * Get the list of results from the signal handlers.
     */
    public getResult(): RT[] {
        return this.result;
    }

    /**
     * Reset the result
     */
    public reset(): void {
        this.result.length = 0;
    }
}
