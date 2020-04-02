/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-unused-vars */
// CC0 Public Domain: http://creativecommons.org/publicdomain/zero/1.0/

import {
    Signal,
    SignalConnections,
    CollectorLast,
    CollectorUntil0,
    CollectorWhile0,
    CollectorArray,
} from "./Signal";

class Dummy {}

class ListenerMock {
    count = 0;

    public callback(object: Dummy): void {
        ++this.count;

        expect(object).not.toBe(null);
    }
}

type PriorityEvent = {
    count: number;
};

class ListenerPriorityMock {
    priority: number;

    constructor(priority: number) {
        this.priority = priority;
    }

    public callback(e: PriorityEvent): void {
        expect(e.count).toBe(this.priority);
        ++e.count;
    }
}

class Foo {
    foo_bool(result: string[], f: number, i: number, s: string) {
        result.push(`Foo: ${(f + i + s.length).toFixed(2)}\n`);
    }
}
function float_callback(result: string[], f: number, i: number, s: string) {
    result.push(`float: ${f.toFixed(2)}\n`);
}

const TestCollectorArray = {
    handler1() {
        return 1;
    },
    handler42() {
        return 42;
    },
    handler777() {
        return 777;
    },
};

class TestCollector {
    true_handler_called = false;

    false_handler_called = false;

    handler_true() {
        this.true_handler_called = true;
        return true;
    }

    handler_false() {
        this.false_handler_called = true;
        return false;
    }

    handler_fail() {
        fail("Abort");
        return false;
    }
}

describe("Signal", () => {
    it("should call one listener on emit", () => {
        const dummy = new Dummy();
        const signal = new Signal<(e: Dummy) => void>();
        const listener = new ListenerMock();
        signal.connect(listener.callback.bind(listener));

        for (let i = 0; i < 10; ++i) {
            expect(i).toBe(listener.count);
            signal.emit(dummy);
            expect(i + 1).toBe(listener.count);
        }
    });

    it("should call multiple listeners on emit", () => {
        const dummy = new Dummy();
        const signal = new Signal<(d: Dummy) => void>();
        const numListeners = 10;
        const listeners: ListenerMock[] = [];

        for (let i = 0; i < numListeners; i++) {
            const listener = new ListenerMock();
            listeners.push(listener);
            signal.connect(listener.callback.bind(listener));
        }

        const numDispatchs = 10;

        for (let i = 0; i < numDispatchs; ++i) {
            for (const listener of listeners) {
                expect(i).toBe(listener.count);
            }

            signal.emit(dummy);

            for (const listener of listeners) {
                expect(i + 1).toBe(listener.count);
            }
        }
    });

    it("should not call disabled listeners on emit", () => {
        const dummy = new Dummy();
        const signal = new Signal<(e: Dummy) => void>();
        const listener1 = new ListenerMock();
        const con1 = signal.connect(listener1.callback.bind(listener1));
        const listener2 = new ListenerMock();
        signal.connect(listener2.callback.bind(listener2));
        expect(listener1.count).toBe(0);
        expect(listener2.count).toBe(0);
        signal.emit(dummy);
        expect(listener1.count).toBe(1);
        expect(listener2.count).toBe(1);

        expect(con1.enabled).toBe(true);
        con1.enabled = false;
        expect(con1.enabled).toBe(false);
        signal.emit(dummy);
        expect(listener1.count).toBe(1);
        expect(listener2.count).toBe(2);

        con1.enabled = true;
        expect(con1.enabled).toBe(true);
        signal.emit(dummy);
        expect(listener1.count).toBe(2);
        expect(listener2.count).toBe(3);
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

        signal.connect(listenerA.callback.bind(listenerA));
        const refB = signal.connect(listenerB.callback.bind(listenerB));

        const numDispatchs = 5;

        for (let i = 0; i < numDispatchs; ++i) {
            expect(i).toBe(listenerA.count);
            expect(i).toBe(listenerB.count);

            signal.emit(dummy);

            expect(i + 1).toBe(listenerA.count);
            expect(i + 1).toBe(listenerB.count);
        }

        expect(refB.disconnect()).toBe(true);

        for (let i = 0; i < numDispatchs; ++i) {
            expect(i + numDispatchs).toBe(listenerA.count);
            expect(numDispatchs).toBe(listenerB.count);

            signal.emit(dummy);

            expect(i + 1 + numDispatchs).toBe(listenerA.count);
            expect(numDispatchs).toBe(listenerB.count);
        }
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
        signal.connect(listenerB.callback.bind(listenerB));

        signal.emit(dummy);

        expect(1).toBe(count);
        expect(1).toBe(listenerB.count);
        expect(0).toBe(countB);
        expect(ref.disconnect()).toBe(true);
        signal.emit(dummy);
        expect(1).toBe(count);
        expect(2).toBe(listenerB.count);
        expect(1).toBe(countB);
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
        signal.connect(listenerB.callback.bind(listenerB));

        signal.emit(dummy);

        expect(1).toBe(count);
        expect(1).toBe(listenerB.count);
    });

    it("should allow disconnecting all listeners", () => {
        const sig = new Signal<() => void>();
        let count1 = 0;
        let count2 = 0;
        sig.connect(() => count1++);
        sig.connect(() => count2++);
        sig.emit();
        expect(1).toBe(count1);
        expect(1).toBe(count2);
        sig.disconnectAll();
        sig.emit();
        expect(1).toBe(count1);
        expect(1).toBe(count2);
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
        expect(1).toBe(count1);
        expect(1).toBe(count2);
        expect(sig.disconnect(cb1)).toBe(true);
        sig.emit();
        expect(1).toBe(count1);
        expect(2).toBe(count2);

        expect(sig.disconnect(cb1)).toBe(false);
    });

    it("should pass parameters to listeners", () => {
        const result: string[] = [];
        const sig1 = new Signal<(result: string[], f: number, i: number, s: string) => void>();
        const id1 = sig1.connect(float_callback);
        const id2 = sig1.connect((r, f, i, s) => {
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
        sig1.connect(foo.foo_bool.bind(foo));
        sig1.connect(foo.foo_bool.bind(foo));
        sig1.emit(result, 0.5, 1, "12");

        const sig2 = new Signal<(msg: string, d: number) => void>();
        sig2.connect((msg, d) => {
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

            const signal = new Signal<(e: PriorityEvent) => void>();
            signal.connect(a.callback.bind(a));
            signal.connect(b.callback.bind(b));
            signal.connect(c.callback.bind(c));
            signal.connect(d.callback.bind(d));

            const e = { count: 0 };
            signal.emit(e);
            expect(4).toBe(e.count);
        });
    });

    describe("with manual priority", () => {
        it("should handle listeners in the specified order", () => {
            const a = new ListenerPriorityMock(0);
            const b = new ListenerPriorityMock(1);
            const c = new ListenerPriorityMock(2);
            const d = new ListenerPriorityMock(3);

            const signal = new Signal<(e: PriorityEvent) => void>();
            signal.connect(d.callback.bind(d), 3);
            signal.connect(a.callback.bind(a), 0);
            signal.connect(c.callback.bind(c), 2);
            signal.connect(b.callback.bind(b), 1);

            const e = { count: 0 };
            signal.emit(e);
            expect(4).toBe(e.count);
        });
    });
});

describe("SignalConnections", () => {
    it("should allow disconnecting all listeners of the collection", () => {
        const dummy = new Dummy();
        const signal = new Signal<(e: Dummy) => void>();

        const listenerA = new ListenerMock();
        const listenerB = new ListenerMock();

        const connections = new SignalConnections();
        connections.add(signal.connect(listenerA.callback.bind(listenerA)));
        connections.add(signal.connect(listenerB.callback.bind(listenerB)));

        signal.emit(dummy);

        expect(1).toBe(listenerA.count);
        expect(1).toBe(listenerB.count);
        connections.disconnectAll();

        signal.emit(dummy);

        expect(1).toBe(listenerA.count);
        expect(1).toBe(listenerB.count);
    });
});

describe("CollectorLast", () => {
    it("should collect the last emitted value", () => {
        const sig = new Signal<() => number>();
        sig.connect(() => 0);
        sig.connect(() => 1);
        sig.connect(() => 2);
        sig.connect(() => 3);
        sig.connect(() => 4);
        sig.connect(() => 5);
        const collector = new CollectorLast<() => number>(sig);
        collector.emit();
        expect(5).toBe(collector.getResult());
        collector.reset();
        expect(collector.getResult()).toBeUndefined();
    });

    it("should ignore disabled listeners", () => {
        const sig = new Signal<() => number>();
        sig.connect(() => 23);
        const connection = sig.connect(() => 42);
        const collector = new CollectorLast<() => number>(sig);
        collector.emit();
        expect(42).toBe(collector.getResult());
        collector.reset();
        expect(collector.getResult()).toBeUndefined();
        connection.enabled = false;
        collector.emit();
        expect(23).toBe(collector.getResult());
    });
});

describe("CollectorUntil0", () => {
    it("should collect until false is returned by a listener", () => {
        const self = new TestCollector();
        const sig = new Signal<() => boolean>();
        sig.connect(self.handler_true.bind(self));
        sig.connect(self.handler_false.bind(self));
        sig.connect(self.handler_fail.bind(self));
        expect(self.true_handler_called).toBe(false);
        expect(self.false_handler_called).toBe(false);
        const collector = new CollectorUntil0(sig);
        collector.emit();
        expect(collector.getResult()).toBe(false);
        expect(self.true_handler_called).toBe(true);
        expect(self.false_handler_called).toBe(true);
        collector.reset();
        expect(collector.getResult()).toBe(false);
    });
});

describe("CollectorWhile0", () => {
    it("should collect until true is returned by a listener", () => {
        const self = new TestCollector();
        const sig = new Signal<() => boolean>();
        sig.connect(self.handler_false.bind(self));
        sig.connect(self.handler_true.bind(self));
        sig.connect(self.handler_fail.bind(self));
        expect(self.true_handler_called).toBe(false);
        expect(self.false_handler_called).toBe(false);
        const collector = new CollectorWhile0(sig);
        collector.emit();
        expect(collector.getResult()).toBe(true);
        expect(self.true_handler_called).toBe(true);
        expect(self.false_handler_called).toBe(true);
        collector.reset();
        expect(collector.getResult()).toBe(false);
    });
});

describe("CollectorArray", () => {
    it("should collect the return values of all listeners", () => {
        const sig_array = new Signal<() => number>();
        sig_array.connect(TestCollectorArray.handler777);
        sig_array.connect(TestCollectorArray.handler42);
        sig_array.connect(TestCollectorArray.handler1);
        sig_array.connect(TestCollectorArray.handler42);
        sig_array.connect(TestCollectorArray.handler777);
        const collector = new CollectorArray<() => number>(sig_array);
        collector.emit();
        const result = collector.getResult();
        expect(result).toEqual([777, 42, 1, 42, 777]);
        collector.reset();
        expect(collector.getResult()).toHaveLength(0);
    });
});
