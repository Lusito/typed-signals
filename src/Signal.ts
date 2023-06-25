import { Collector } from "./Collector";
import { SignalConnection, SignalConnectionImpl } from "./SignalConnection";
import { SignalLink } from "./SignalLink";

// eslint-disable-next-line @typescript-eslint/no-empty-function
const headOptions = { order: 0, onUnlink() {} } as const;

/**
 * A signal is a way to publish and subscribe to events.
 *
 * @typeparam THandler The function signature to be implemented by handlers.
 */
export class Signal<THandler extends (...args: any[]) => any> {
    private readonly head = new SignalLink<THandler>(null, null, headOptions);

    private hasNewLinks = false;

    private emitDepth = 0;

    private connectionsCount = 0;

    /**
     * @returns The number of connections on this signal.
     */
    public getConnectionsCount() {
        return this.connectionsCount;
    }

    /**
     * @returns true if this signal has connections.
     */
    public hasConnections() {
        return this.connectionsCount > 0;
    }

    /**
     * Subscribe to this signal.
     *
     * @param callback This callback will be run when emit() is called.
     * @param order Handlers with a higher order value will be called later.
     */
    public connect(callback: THandler, order = 0): SignalConnection {
        this.connectionsCount++;
        const link = this.head.insert({ callback, order, onUnlink: this.onUnlink });
        if (this.emitDepth > 0) {
            this.hasNewLinks = true;
            link.newLink = true;
        }
        return new SignalConnectionImpl(link);
    }

    private onUnlink = () => {
        this.connectionsCount--;
    };

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
