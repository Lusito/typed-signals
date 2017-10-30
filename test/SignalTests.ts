// CC0 Public Domain: http://creativecommons.org/publicdomain/zero/1.0/

import { suite, test } from "mocha-typescript";
import { assert } from "chai";
import { Signal, SignalConnections, CollectorArray, CollectorUntil0, CollectorWhile0 } from "../src/Signal";

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
	check1 = false;
	check2 = false;
	handler_true() { this.check1 = true; return true; }
	handler_false() { this.check2 = true; return false; }
	handler_fail() { assert.fail("Abort"); return false; }
}

@suite export class SignalTests {
	@test add_listener_and_emit() {
		let dummy = new Dummy();
		let signal = new Signal<(e: Dummy) => void>();
		let listener = new ListenerMock();
		signal.connect(listener.callback.bind(listener));

		for (let i = 0; i < 10; ++i) {
			assert.strictEqual(i, listener.count);
			signal.emit(dummy);
			assert.strictEqual((i + 1), listener.count);
		}
	}

	@test add_listeners_and_emit() {
		let dummy = new Dummy();
		let signal = new Signal<(d: Dummy) => void>();
		let numListeners = 10;
		let listeners: ListenerMock[] = [];

		for (let i = 0; i < numListeners; i++) {
			let listener = new ListenerMock();
			listeners.push(listener);
			signal.connect(listener.callback.bind(listener));
		}

		let numDispatchs = 10;

		for (let i = 0; i < numDispatchs; ++i) {
			for (let listener of listeners) {
				assert.strictEqual(i, listener.count);
			}

			signal.emit(dummy);

			for (let listener of listeners) {
				assert.strictEqual((i + 1), listener.count);
			}
		}
	}
	
	@test disabled_connections() {
		let dummy = new Dummy();
		let signal = new Signal<(e: Dummy) => void>();
		let listener1 = new ListenerMock();
		let con1 = signal.connect(listener1.callback.bind(listener1));
		let listener2 = new ListenerMock();
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
	}

	@test add_listener_emit_and_disconnect() {
		let dummy = new Dummy();
		let signal = new Signal<(e: Dummy) => void>();
		let listenerA = new ListenerMock();
		let listenerB = new ListenerMock();

		signal.connect(listenerA.callback.bind(listenerA));
		let refB = signal.connect(listenerB.callback.bind(listenerB));

		let numDispatchs = 5;

		for (let i = 0; i < numDispatchs; ++i) {
			assert.strictEqual(i, listenerA.count);
			assert.strictEqual(i, listenerB.count);

			signal.emit(dummy);

			assert.strictEqual((i + 1), listenerA.count);
			assert.strictEqual((i + 1), listenerB.count);
		}

		refB.disconnect();

		for (let i = 0; i < numDispatchs; ++i) {
			assert.strictEqual((i + numDispatchs), listenerA.count);
			assert.strictEqual(numDispatchs, listenerB.count);

			signal.emit(dummy);

			assert.strictEqual((i + 1 + numDispatchs), listenerA.count);
			assert.strictEqual(numDispatchs, listenerB.count);
		}
	}

	@test add_listener_during_emit() {
		let dummy = new Dummy();
		let signal = new Signal<(e: Dummy) => void>();
		let listenerB = new ListenerMock();

		let count = 0;
		let countB = 0;

		let ref = signal.connect(() => {
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
		ref.disconnect();
		signal.emit(dummy);
		assert.strictEqual(1, count);
		assert.strictEqual(2, listenerB.count);
		assert.strictEqual(1, countB);
	}

	@test disconnect_during_emit() {
		let dummy = new Dummy();
		let signal = new Signal<(e: Dummy) => void>();
		let listenerB = new ListenerMock();

		let count = 0;

		let ref = signal.connect(() => {
			++count;
			ref.disconnect();
		});
		signal.connect(listenerB.callback.bind(listenerB));

		signal.emit(dummy);

		assert.strictEqual(1, count);
		assert.strictEqual(1, listenerB.count);
	}

	@test signal_connections() {
		let dummy = new Dummy();
		let signal = new Signal<(e: Dummy) => void>();

		let listenerA = new ListenerMock();
		let listenerB = new ListenerMock();

		let connections = new SignalConnections();
		connections.add(signal.connect(listenerA.callback.bind(listenerA)));
		connections.add(signal.connect(listenerB.callback.bind(listenerB)));

		signal.emit(dummy);

		assert.strictEqual(1, listenerA.count);
		assert.strictEqual(1, listenerB.count);
		connections.disconnectAll();

		signal.emit(dummy);

		assert.strictEqual(1, listenerA.count);
		assert.strictEqual(1, listenerB.count);
	}

	@test signal_priority_default() {
		let a = new ListenerPriorityMock(0);
		let b = new ListenerPriorityMock(1);
		let c = new ListenerPriorityMock(2);
		let d = new ListenerPriorityMock(3);

		let signal = new Signal<(e: PriorityEvent) => void>();
		signal.connect(a.callback.bind(a));
		signal.connect(b.callback.bind(b));
		signal.connect(c.callback.bind(c));
		signal.connect(d.callback.bind(d));

		let e = { count: 0 };
		signal.emit(e);
		assert.strictEqual(4, e.count);
	}

	@test signal_priority_manual() {
		let a = new ListenerPriorityMock(0);
		let b = new ListenerPriorityMock(1);
		let c = new ListenerPriorityMock(2);
		let d = new ListenerPriorityMock(3);

		let signal = new Signal<(e: PriorityEvent) => void>();
		signal.connect(d.callback.bind(d), 3);
		signal.connect(a.callback.bind(a), 0);
		signal.connect(c.callback.bind(c), 2);
		signal.connect(b.callback.bind(b), 1);

		let e = { count: 0 };
		signal.emit(e);
		assert.strictEqual(4, e.count);
	}

	@test basic_signal_test() {
		let result:string[] = [];
		let sig1 = new Signal<(result: string[], f: number, i: number, s: string) => void>();
		let id1 = sig1.connect(float_callback);
		let id2 = sig1.connect((r, f, i, s) => { result.push(`int: ${i}\n`); });
		let id3 = sig1.connect((r, f, i, s) => { result.push(`string: ${s}\n`); });
		sig1.emit(result, 0.3, 4, "huhu");
		assert.isTrue(id1.disconnect());
		assert.isFalse(id1.disconnect());
		assert.isTrue(id2.disconnect());
		assert.isTrue(id3.disconnect());
		assert.isFalse(id3.disconnect());
		assert.isFalse(id2.disconnect());
		let foo = new Foo();
		sig1.connect(foo.foo_bool.bind(foo));
		sig1.connect(foo.foo_bool.bind(foo));
		sig1.emit(result, 0.5, 1, "12");

		let sig2 = new Signal<(msg: string, d: number) => void>();
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
		assert.strictEqual(result.join(''), expected);
	}

	@test collector_array() {
		let sig_array = new Signal<() => number>();
		sig_array.connect(TestCollectorArray.handler777);
		sig_array.connect(TestCollectorArray.handler42);
		sig_array.connect(TestCollectorArray.handler1);
		sig_array.connect(TestCollectorArray.handler42);
		sig_array.connect(TestCollectorArray.handler777);
		let collector = new CollectorArray<() => number, number>(sig_array);
		collector.emit();
		let result = collector.getResult();
		assert.sameOrderedMembers(result, [777, 42, 1, 42, 777]);
	}

	@test collector_until_0() {
		let self = new TestCollector();
		let sig = new Signal<() => boolean>();
		sig.connect(self.handler_true.bind(self));
		sig.connect(self.handler_false.bind(self));
		sig.connect(self.handler_fail.bind(self));
		assert.isFalse(self.check1);
		assert.isFalse(self.check2);
		let collector = new CollectorUntil0(sig);
		collector.emit();
		assert.isFalse(collector.getResult());
		assert.isTrue(self.check1);
		assert.isTrue(self.check2);
	}

	@test collector_while_0() {
		let self = new TestCollector();
		let sig = new Signal<() => boolean>();
		sig.connect(self.handler_false.bind(self));
		sig.connect(self.handler_true.bind(self));
		sig.connect(self.handler_fail.bind(self));
		assert.isFalse(self.check1);
		assert.isFalse(self.check2);
		let collector = new CollectorWhile0(sig);
		collector.emit();
		assert.isTrue(collector.getResult());
		assert.isTrue(self.check1);
		assert.isTrue(self.check2);
	}
}