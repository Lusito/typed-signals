// CC0 Public Domain: http://creativecommons.org/publicdomain/zero/1.0/

import { assert } from "chai";
import { Signal, SignalConnections, CollectorLast, CollectorUntil0, CollectorWhile0, CollectorArray } from "../src/Signal";

class Dummy {
}

class ListenerMock {
    count = 0;

    public callback(object: Dummy): void {
        ++this.count;

        assert.notStrictEqual(object, null);
    }
}

type PriorityEvent = {
    count: number;
};

class ListenerPriorityMock {
    priority: number;
    constructor(priority: number) { this.priority = priority; }

    public callback(e: PriorityEvent): void {
        assert.strictEqual(e.count, this.priority);
        ++e.count;
    }
}

class Foo {
    foo_bool(result: string[], f: number, i: number, s: string) {
        result.push("Foo: " + (f + i + s.length).toFixed(2) + "\n");
    }
}
function float_callback(result: string[], f: number, i: number, s: string) {
    result.push("float: " + f.toFixed(2) + "\n");
}

namespace TestCollectorArray {
    export function handler1() { return 1; }
    export function handler42() { return 42; }
    export function handler777() { return 777; }
}

class TestCollector {
    true_handler_called = false;
    false_handler_called = false;
    handler_true() { this.true_handler_called = true; return true; }
    handler_false() { this.false_handler_called = true; return false; }
    handler_fail() { assert.fail("Abort"); return false; }
}

describe("Signal", () => {
    it("should call one listener on emit", () => {
        const dummy = new Dummy();
        const signal = new Signal<(e: Dummy) => void>();
        const listener = new ListenerMock();
        signal.connect(listener.callback.bind(listener));

        for (let i = 0; i < 10; ++i) {
            assert.strictEqual(i, listener.count);
            signal.emit(dummy);
            assert.strictEqual((i + 1), listener.count);
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
            for (let listener of listeners) {
                assert.strictEqual(i, listener.count);
            }

            signal.emit(dummy);

            for (let listener of listeners) {
                assert.strictEqual((i + 1), listener.count);
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
        assert.strictEqual(listener1.count, 0);
        assert.strictEqual(listener2.count, 0);
        signal.emit(dummy);
        assert.strictEqual(listener1.count, 1);
        assert.strictEqual(listener2.count, 1);

        assert.isTrue(con1.enabled);
        con1.enabled = false;
        assert.isFalse(con1.enabled);
        signal.emit(dummy);
        assert.strictEqual(listener1.count, 1);
        assert.strictEqual(listener2.count, 2);

        con1.enabled = true;
        assert.isTrue(con1.enabled);
        signal.emit(dummy);
        assert.strictEqual(listener1.count, 2);
        assert.strictEqual(listener2.count, 3);
    });

    it("should be possible to disable disconnected listeners", () => {
        const sig = new Signal<() => void>();
        const connection = sig.connect(() => { });
        assert.isTrue(connection.disconnect());
        assert.doesNotThrow(() => connection.enabled = false);
        assert.isFalse(connection.disconnect());
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
            assert.strictEqual(i, listenerA.count);
            assert.strictEqual(i, listenerB.count);

            signal.emit(dummy);

            assert.strictEqual((i + 1), listenerA.count);
            assert.strictEqual((i + 1), listenerB.count);
        }

        assert.isTrue(refB.disconnect());

        for (let i = 0; i < numDispatchs; ++i) {
            assert.strictEqual((i + numDispatchs), listenerA.count);
            assert.strictEqual(numDispatchs, listenerB.count);

            signal.emit(dummy);

            assert.strictEqual((i + 1 + numDispatchs), listenerA.count);
            assert.strictEqual(numDispatchs, listenerB.count);
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

        assert.strictEqual(1, count);
        assert.strictEqual(1, listenerB.count);
        assert.strictEqual(0, countB);
        assert.isTrue(ref.disconnect());
        signal.emit(dummy);
        assert.strictEqual(1, count);
        assert.strictEqual(2, listenerB.count);
        assert.strictEqual(1, countB);
    });

    it("should allow disconnecting listeners during emit", () => {
        const dummy = new Dummy();
        const signal = new Signal<(e: Dummy) => void>();
        const listenerB = new ListenerMock();

        let count = 0;

        const ref = signal.connect(() => {
            ++count;
            assert.isTrue(ref.disconnect());
        });
        signal.connect(listenerB.callback.bind(listenerB));

        signal.emit(dummy);

        assert.strictEqual(1, count);
        assert.strictEqual(1, listenerB.count);
    });

    it("should allow disconnecting all listeners", () => {
        const sig = new Signal<() => void>();
        let count1 = 0;
        let count2 = 0;
        sig.connect(() => count1++);
        sig.connect(() => count2++);
        sig.emit();
        assert.strictEqual(1, count1);
        assert.strictEqual(1, count2);
        sig.disconnectAll();
        sig.emit();
        assert.strictEqual(1, count1);
        assert.strictEqual(1, count2);
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
        assert.strictEqual(1, count1);
        assert.strictEqual(1, count2);
        assert.isTrue(sig.disconnect(cb1));
        sig.emit();
        assert.strictEqual(1, count1);
        assert.strictEqual(2, count2);

        assert.isFalse(sig.disconnect(cb1));
    });

    it("should pass parameters to listeners", () => {
        const result: string[] = [];
        const sig1 = new Signal<(result: string[], f: number, i: number, s: string) => void>();
        const id1 = sig1.connect(float_callback);
        const id2 = sig1.connect((r, f, i, s) => { result.push(`int: ${i}\n`); });
        const id3 = sig1.connect((r, f, i, s) => { result.push(`string: ${s}\n`); });
        sig1.emit(result, 0.3, 4, "huhu");
        assert.isTrue(id1.disconnect());
        assert.isFalse(id1.disconnect());
        assert.isTrue(id2.disconnect());
        assert.isTrue(id3.disconnect());
        assert.isFalse(id3.disconnect());
        assert.isFalse(id2.disconnect());
        const foo = new Foo();
        sig1.connect(foo.foo_bool.bind(foo));
        sig1.connect(foo.foo_bool.bind(foo));
        sig1.emit(result, 0.5, 1, "12");

        const sig2 = new Signal<(msg: string, d: number) => void>();
        sig2.connect((msg, d) => { result.push(`msg: ${msg}`); });
        sig2.connect((msg, d) => { result.push(` *${d}*\n`); });
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
        assert.strictEqual(result.join(""), expected);
    });

    context("without priority", () => {
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
            assert.strictEqual(4, e.count);
        });
    });

    context("with manual priority", () => {
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
            assert.strictEqual(4, e.count);
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

        assert.strictEqual(1, listenerA.count);
        assert.strictEqual(1, listenerB.count);
        connections.disconnectAll();

        signal.emit(dummy);

        assert.strictEqual(1, listenerA.count);
        assert.strictEqual(1, listenerB.count);
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
        const collector = new CollectorLast<() => number, number>(sig);
        collector.emit();
        assert.strictEqual(5, collector.getResult());
        collector.reset();
        assert.isUndefined(collector.getResult());
    });

    it("should ignore disabled listeners", () => {
        const sig = new Signal<() => number>();
        sig.connect(() => 23);
        const connection = sig.connect(() => 42);
        const collector = new CollectorLast<() => number, number>(sig);
        collector.emit();
        assert.strictEqual(42, collector.getResult());
        collector.reset();
        assert.isUndefined(collector.getResult());
        connection.enabled = false;
        collector.emit();
        assert.strictEqual(23, collector.getResult());
    });
});

describe("CollectorUntil0", () => {
    it("should collect until false is returned by a listener", () => {
        const self = new TestCollector();
        const sig = new Signal<() => boolean>();
        sig.connect(self.handler_true.bind(self));
        sig.connect(self.handler_false.bind(self));
        sig.connect(self.handler_fail.bind(self));
        assert.isFalse(self.true_handler_called);
        assert.isFalse(self.false_handler_called);
        const collector = new CollectorUntil0(sig);
        collector.emit();
        assert.isFalse(collector.getResult());
        assert.isTrue(self.true_handler_called);
        assert.isTrue(self.false_handler_called);
        collector.reset();
        assert.isFalse(collector.getResult());
    });
});

describe("CollectorWhile0", () => {
    it("should collect until true is returned by a listener", () => {
        const self = new TestCollector();
        const sig = new Signal<() => boolean>();
        sig.connect(self.handler_false.bind(self));
        sig.connect(self.handler_true.bind(self));
        sig.connect(self.handler_fail.bind(self));
        assert.isFalse(self.true_handler_called);
        assert.isFalse(self.false_handler_called);
        const collector = new CollectorWhile0(sig);
        collector.emit();
        assert.isTrue(collector.getResult());
        assert.isTrue(self.true_handler_called);
        assert.isTrue(self.false_handler_called);
        collector.reset();
        assert.isFalse(collector.getResult());
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
        const collector = new CollectorArray<() => number, number>(sig_array);
        collector.emit();
        const result = collector.getResult();
        assert.sameOrderedMembers(result, [777, 42, 1, 42, 777]);
        collector.reset();
        assert.isEmpty(collector.getResult());
    });
});
