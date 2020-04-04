/**
 * SignalLink implements a doubly-linked ring with nodes containing the signal handlers.
 * @private
 */
export class SignalLink<THandler extends (...args: any[]) => any> {
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
