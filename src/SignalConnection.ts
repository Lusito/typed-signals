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
