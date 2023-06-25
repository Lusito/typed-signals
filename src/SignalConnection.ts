import { SignalLink } from "./SignalLink";

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
 * @private
 */
export class SignalConnectionImpl<THandler extends (...args: any[]) => any> implements SignalConnection {
    private link: SignalLink<THandler>;

    /**
     * @param link The actual link of the connection.
     */
    public constructor(link: SignalLink<THandler>) {
        this.link = link;
    }

    public disconnect(): boolean {
        return this.link.unlink();
    }

    public set enabled(enable: boolean) {
        this.link.setEnabled(enable);
    }

    public get enabled(): boolean {
        return this.link.isEnabled();
    }
}
