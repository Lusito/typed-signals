import { Signal } from "./Signal";
import { CollectorUntil0 } from "./CollectorUntil0";
import { TestCollector } from "./testUtils";

describe("CollectorUntil0", () => {
    it("should collect until false is returned by a listener", () => {
        const self = new TestCollector();
        const sig = new Signal<() => boolean>();
        sig.connect(self.handler_true);
        sig.connect(self.handler_false);
        sig.connect(self.handler_fail);
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
