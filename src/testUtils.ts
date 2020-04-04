/* istanbul ignore file */
export class Dummy {}

export class ListenerMock {
    callback = jest.fn();
}

export class TestCollector {
    true_handler_called = false;

    false_handler_called = false;

    handler_true = () => {
        this.true_handler_called = true;
        return true;
    };

    handler_false = () => {
        this.false_handler_called = true;
        return false;
    };

    handler_fail = () => {
        throw new Error("Abort");
    };
}
