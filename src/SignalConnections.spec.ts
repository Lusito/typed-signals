import { Signal } from "./Signal";
import { SignalConnections } from "./SignalConnections";
import { Dummy, ListenerMock } from "./testUtils";

describe("SignalConnections", () => {
    it("should allow disconnecting all listeners of the collection", () => {
        const dummy = new Dummy();
        const signal = new Signal<(e: Dummy) => void>();

        const listenerA = new ListenerMock();
        const listenerB = new ListenerMock();

        const connections = new SignalConnections();
        connections.add(signal.connect(listenerA.callback));
        connections.add(signal.connect(listenerB.callback));

        signal.emit(dummy);

        expect(listenerA.callback).toHaveBeenCalledTimes(1);
        expect(listenerA.callback).toHaveBeenCalledWith(dummy);
        expect(listenerB.callback).toHaveBeenCalledTimes(1);
        expect(listenerB.callback).toHaveBeenCalledWith(dummy);
        connections.disconnectAll();

        signal.emit(dummy);

        expect(listenerA.callback).toHaveBeenCalledTimes(1);
        expect(listenerA.callback).toHaveBeenCalledWith(dummy);
        expect(listenerB.callback).toHaveBeenCalledTimes(1);
        expect(listenerB.callback).toHaveBeenCalledWith(dummy);
    });

    it("should show count correctly", () => {
        const signal = new Signal<(e: Dummy) => void>();

        const listenerA = new ListenerMock();
        const listenerB = new ListenerMock();

        const connections = new SignalConnections();
        expect(connections.getCount()).toBe(0);
        expect(connections.isEmpty()).toBe(true);
        connections.add(signal.connect(listenerA.callback));
        expect(connections.getCount()).toBe(1);
        expect(connections.isEmpty()).toBe(false);
        connections.add(signal.connect(listenerB.callback));
        expect(connections.getCount()).toBe(2);
        expect(connections.isEmpty()).toBe(false);

        connections.disconnectAll();
        expect(connections.getCount()).toBe(0);
        expect(connections.isEmpty()).toBe(true);
    });
});
