import { Signal } from "./Signal";
import { CollectorLast } from "./CollectorLast";

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
        expect(collector.getResult()).toBe(5);
        collector.reset();
        expect(collector.getResult()).toBeUndefined();
    });

    it("should ignore disabled listeners", () => {
        const sig = new Signal<() => number>();
        sig.connect(() => 23);
        const connection = sig.connect(() => 42);
        const collector = new CollectorLast<() => number>(sig);
        collector.emit();
        expect(collector.getResult()).toBe(42);
        collector.reset();
        expect(collector.getResult()).toBeUndefined();
        connection.enabled = false;
        collector.emit();
        expect(collector.getResult()).toBe(23);
    });
});
