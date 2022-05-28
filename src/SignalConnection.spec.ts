import { Signal } from "./Signal";
import { Dummy, ListenerMock } from "./testUtils";

describe("SignalConnection", () => {
    describe("when disconnecting", () => {
        it("should update the connection count of the parent Signal", () => {
            const signal = new Signal<(d: Dummy) => void>();
            const connections = [];

            expect(signal.getConnectionsCount()).toBe(0);
            expect(signal.hasConnections()).toBe(false);

            let listener = new ListenerMock();
            connections.push(signal.connect(listener.callback));

            expect(signal.getConnectionsCount()).toBe(1);
            expect(signal.hasConnections()).toBe(true);

            listener = new ListenerMock();
            connections.push(signal.connect(listener.callback));

            expect(signal.getConnectionsCount()).toBe(2);
            expect(signal.hasConnections()).toBe(true);

            connections.pop()!.disconnect();

            expect(signal.getConnectionsCount()).toBe(1);
            expect(signal.hasConnections()).toBe(true);

            connections.pop()!.disconnect();

            expect(signal.getConnectionsCount()).toBe(0);
            expect(signal.hasConnections()).toBe(false);
        });
    });
});
