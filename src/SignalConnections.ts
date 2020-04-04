import { SignalConnection } from "./SignalConnection";

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
