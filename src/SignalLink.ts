type SignalLinkOptions<THandler extends (...args: any[]) => any> = {
    order: number;
    isPublic: boolean;
    onUnlink(): void;
    callback?: THandler;
};

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

    public callback?: THandler;

    public readonly isPublic: boolean;

    private onUnlink: () => void;

    public constructor(
        prev: SignalLink<THandler> | null,
        next: SignalLink<THandler> | null,
        options: SignalLinkOptions<THandler>
    ) {
        this.prev = prev ?? this;
        this.next = next ?? this;
        this.order = options.order;
        this.isPublic = options.isPublic;
        this.callback = options.callback;
        this.onUnlink = options.onUnlink;
    }

    public isEnabled(): boolean {
        return this.enabled && !this.newLink;
    }

    public setEnabled(flag: boolean): void {
        this.enabled = flag;
    }

    public unlink(): boolean {
        if (this.callback) {
            delete this.callback;
            this.next.prev = this.prev;
            this.prev.next = this.next;
            this.onUnlink();

            return true;
        }

        return false;
    }

    public insert(options: SignalLinkOptions<THandler>): SignalLink<THandler> {
        const { order } = options;
        let after = this.prev;
        while (after !== this) {
            if (after.order <= order) break;
            after = after.prev;
        }

        const link = new SignalLink(after, after.next, options);
        after.next = link;
        link.next.prev = link;

        return link;
    }
}
