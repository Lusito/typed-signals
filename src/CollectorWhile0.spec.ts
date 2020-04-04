import { Signal } from "./Signal";
import { CollectorWhile0 } from "./CollectorWhile0";
import { TestCollector } from "./testUtils";

describe("CollectorWhile0", () => {
    it("should collect until true is returned by a listener", () => {
        const self = new TestCollector();
        const sig = new Signal<() => boolean>();
        sig.connect(self.handler_false);
        sig.connect(self.handler_true);
        sig.connect(self.handler_fail);
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
