import { Signal } from "./Signal";
import { Dummy, ListenerMock } from "./testUtils";

class ListenerPriorityMock {
    priority: number;

    constructor(priority: number) {
        this.priority = priority;
    }

    testCallback = jest.fn();

    callback = () => {
        this.testCallback(this.priority);
    };
}

class Foo {
    foo_bool = (result: string[], f: number, i: number, s: string) => {
        result.push(`Foo: ${(f + i + s.length).toFixed(2)}\n`);
    };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function float_callback(result: string[], f: number, i: number, s: string) {
    result.push(`float: ${f.toFixed(2)}\n`);
}

describe("Signal", () => {
    it("should call one listener on emit", () => {
        const dummy = new Dummy();
        const signal = new Signal<(e: Dummy) => void>();
        const listener = new ListenerMock();
        signal.connect(listener.callback);

        signal.emit(dummy);
        expect(listener.callback).toHaveBeenCalledTimes(1);
        expect(listener.callback).toHaveBeenCalledWith(dummy);
    });

    it("should call multiple listeners on emit", () => {
        const dummy = new Dummy();
        const signal = new Signal<(d: Dummy) => void>();
        const numListeners = 10;
        const listeners: ListenerMock[] = [];

        for (let i = 0; i < numListeners; i++) {
            const listener = new ListenerMock();
            listeners.push(listener);
            signal.connect(listener.callback);
        }

        listeners.forEach((listener) => expect(listener.callback).not.toHaveBeenCalled());

        signal.emit(dummy);

        for (const listener of listeners) {
            expect(listener.callback).toHaveBeenCalledTimes(1);
            expect(listener.callback).toHaveBeenCalledWith(dummy);
        }
    });

    it("should not call disabled listeners on emit", () => {
        const dummy = new Dummy();
        const signal = new Signal<(e: Dummy) => void>();
        const listener1 = new ListenerMock();
        const con1 = signal.connect(listener1.callback);
        const listener2 = new ListenerMock();
        signal.connect(listener2.callback);
        expect(listener1.callback).not.toHaveBeenCalled();
        expect(listener2.callback).not.toHaveBeenCalled();
        signal.emit(dummy);
        expect(listener1.callback).toHaveBeenCalledTimes(1);
        expect(listener1.callback).toHaveBeenCalledWith(dummy);
        expect(listener2.callback).toHaveBeenCalledTimes(1);
        expect(listener2.callback).toHaveBeenCalledWith(dummy);

        listener1.callback.mockReset();
        listener2.callback.mockReset();
        expect(con1.enabled).toBe(true);
        con1.enabled = false;
        expect(con1.enabled).toBe(false);
        signal.emit(dummy);
        expect(listener1.callback).not.toHaveBeenCalled();
        expect(listener2.callback).toHaveBeenCalledTimes(1);
        expect(listener2.callback).toHaveBeenCalledWith(dummy);

        listener1.callback.mockReset();
        listener2.callback.mockReset();
        con1.enabled = true;
        expect(con1.enabled).toBe(true);
        signal.emit(dummy);
        expect(listener1.callback).toHaveBeenCalledTimes(1);
        expect(listener1.callback).toHaveBeenCalledWith(dummy);
        expect(listener2.callback).toHaveBeenCalledTimes(1);
        expect(listener2.callback).toHaveBeenCalledWith(dummy);
    });

    it("should be possible to disable disconnected listeners", () => {
        const sig = new Signal<() => void>();
        const connection = sig.connect(() => undefined);
        expect(connection.disconnect()).toBe(true);
        expect(() => {
            connection.enabled = false;
        }).not.toThrow();
        expect(connection.disconnect()).toBe(false);
    });

    it("should not call disconnected listeners on emit", () => {
        const dummy = new Dummy();
        const signal = new Signal<(e: Dummy) => void>();
        const listenerA = new ListenerMock();
        const listenerB = new ListenerMock();

        signal.connect(listenerA.callback);
        const refB = signal.connect(listenerB.callback);

        signal.emit(dummy);
        expect(listenerA.callback).toHaveBeenCalledTimes(1);
        expect(listenerA.callback).toHaveBeenCalledWith(dummy);
        expect(listenerB.callback).toHaveBeenCalledTimes(1);
        expect(listenerB.callback).toHaveBeenCalledWith(dummy);

        listenerA.callback.mockReset();
        listenerB.callback.mockReset();
        expect(refB.disconnect()).toBe(true);

        signal.emit(dummy);

        expect(listenerA.callback).toHaveBeenCalledTimes(1);
        expect(listenerA.callback).toHaveBeenCalledWith(dummy);
        expect(listenerB.callback).not.toHaveBeenCalled();
    });

    it("should allow adding listeners during emit", () => {
        const dummy = new Dummy();
        const signal = new Signal<(e: Dummy) => void>();
        const listenerB = new ListenerMock();

        let count = 0;
        let countB = 0;

        const ref = signal.connect(() => {
            ++count;
            signal.connect(() => {
                ++countB;
            });
        });
        signal.connect(listenerB.callback);

        signal.emit(dummy);

        expect(count).toBe(1);
        expect(listenerB.callback).toHaveBeenCalledTimes(1);
        expect(listenerB.callback).toHaveBeenCalledWith(dummy);
        expect(countB).toBe(0);
        expect(ref.disconnect()).toBe(true);
        listenerB.callback.mockReset();
        signal.emit(dummy);
        expect(count).toBe(1);
        expect(listenerB.callback).toHaveBeenCalledTimes(1);
        expect(listenerB.callback).toHaveBeenCalledWith(dummy);
        expect(countB).toBe(1);
    });

    it("should allow disconnecting listeners during emit", () => {
        const dummy = new Dummy();
        const signal = new Signal<(e: Dummy) => void>();
        const listenerB = new ListenerMock();

        let count = 0;

        const ref = signal.connect(() => {
            ++count;
            expect(ref.disconnect()).toBe(true);
        });
        signal.connect(listenerB.callback);

        signal.emit(dummy);

        expect(count).toBe(1);
        expect(listenerB.callback).toHaveBeenCalledTimes(1);
        expect(listenerB.callback).toHaveBeenCalledWith(dummy);
    });

    it("should allow disconnecting all listeners", () => {
        const sig = new Signal<() => void>();
        let count1 = 0;
        let count2 = 0;
        sig.connect(() => count1++);
        sig.connect(() => count2++);
        sig.emit();
        expect(count1).toBe(1);
        expect(count2).toBe(1);
        sig.disconnectAll();
        sig.emit();
        expect(count1).toBe(1);
        expect(count2).toBe(1);
    });

    it("should allow disconnecting one listener", () => {
        const sig = new Signal<() => void>();
        let count1 = 0;
        let count2 = 0;
        const cb1 = () => count1++;
        const cb2 = () => count2++;
        sig.connect(cb1);
        sig.connect(cb2);
        sig.emit();
        expect(count1).toBe(1);
        expect(count2).toBe(1);
        expect(sig.disconnect(cb1)).toBe(true);
        sig.emit();
        expect(count1).toBe(1);
        expect(count2).toBe(2);

        expect(sig.disconnect(cb1)).toBe(false);
    });

    it("should pass parameters to listeners", () => {
        const result: string[] = [];
        const sig1 = new Signal<(_result: string[], f: number, i: number, s: string) => void>();
        const id1 = sig1.connect(float_callback);
        const id2 = sig1.connect((r, f, i) => {
            result.push(`int: ${i}\n`);
        });
        const id3 = sig1.connect((r, f, i, s) => {
            result.push(`string: ${s}\n`);
        });
        sig1.emit(result, 0.3, 4, "huhu");
        expect(id1.disconnect()).toBe(true);
        expect(id1.disconnect()).toBe(false);
        expect(id2.disconnect()).toBe(true);
        expect(id3.disconnect()).toBe(true);
        expect(id3.disconnect()).toBe(false);
        expect(id2.disconnect()).toBe(false);
        const foo = new Foo();
        sig1.connect(foo.foo_bool);
        sig1.connect(foo.foo_bool);
        sig1.emit(result, 0.5, 1, "12");

        const sig2 = new Signal<(msg: string, d: number) => void>();
        sig2.connect((msg) => {
            result.push(`msg: ${msg}`);
        });
        sig2.connect((msg, d) => {
            result.push(` *${d}*\n`);
        });
        sig2.emit("in sig2", 17);

        result.push("DONE");

        const expected =
            "float: 0.30\n" +
            "int: 4\n" +
            "string: huhu\n" +
            "Foo: 3.50\n" +
            "Foo: 3.50\n" +
            "msg: in sig2 *17*\n" +
            "DONE";
        expect(result.join("")).toBe(expected);
    });

    describe("without priority", () => {
        it("should handle listeners in the order they where added", () => {
            const a = new ListenerPriorityMock(0);
            const b = new ListenerPriorityMock(1);
            const c = new ListenerPriorityMock(2);
            const d = new ListenerPriorityMock(3);

            const signal = new Signal<() => void>();
            signal.connect(a.callback);
            signal.connect(b.callback);
            signal.connect(c.callback);
            signal.connect(d.callback);

            signal.emit();
            expect(a.testCallback).toHaveBeenCalledTimes(1);
            expect(a.testCallback).toHaveBeenCalledWith(a.priority);
            expect(b.testCallback).toHaveBeenCalledTimes(1);
            expect(b.testCallback).toHaveBeenCalledWith(b.priority);
            expect(c.testCallback).toHaveBeenCalledTimes(1);
            expect(c.testCallback).toHaveBeenCalledWith(c.priority);
            expect(d.testCallback).toHaveBeenCalledTimes(1);
            expect(d.testCallback).toHaveBeenCalledWith(d.priority);
        });
    });

    describe("with manual priority", () => {
        it("should handle listeners in the specified order", () => {
            const a = new ListenerPriorityMock(0);
            const b = new ListenerPriorityMock(1);
            const c = new ListenerPriorityMock(2);
            const d = new ListenerPriorityMock(3);

            const signal = new Signal<() => void>();
            signal.connect(d.callback, 3);
            signal.connect(a.callback, 0);
            signal.connect(c.callback, 2);
            signal.connect(b.callback, 1);

            signal.emit();
            expect(a.testCallback).toHaveBeenCalledTimes(1);
            expect(a.testCallback).toHaveBeenCalledWith(a.priority);
            expect(b.testCallback).toHaveBeenCalledTimes(1);
            expect(b.testCallback).toHaveBeenCalledWith(b.priority);
            expect(c.testCallback).toHaveBeenCalledTimes(1);
            expect(c.testCallback).toHaveBeenCalledWith(c.priority);
            expect(d.testCallback).toHaveBeenCalledTimes(1);
            expect(d.testCallback).toHaveBeenCalledWith(d.priority);
        });
    });
});
