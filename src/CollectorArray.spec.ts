import { Signal } from "./Signal";
import { CollectorArray } from "./CollectorArray";

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
