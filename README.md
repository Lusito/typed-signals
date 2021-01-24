![](https://lusito.github.io/typed-signals/typed_signals.png)

[![Minified + gzipped size](https://badgen.net/bundlephobia/minzip/typed-signals)](https://www.npmjs.com/package/typed-signals)
[![NPM version](https://badgen.net/npm/v/typed-signals)](https://www.npmjs.com/package/typed-signals)
[![License](https://badgen.net/github/license/lusito/typed-signals)](https://github.com/lusito/typed-signals/blob/master/LICENSE)
[![Stars](https://badgen.net/github/stars/lusito/typed-signals)](https://github.com/lusito/typed-signals)
[![Watchers](https://badgen.net/github/watchers/lusito/typed-signals)](https://github.com/lusito/typed-signals)
[![Build Status](https://travis-ci.org/Lusito/typed-signals.svg?branch=master)](https://travis-ci.org/Lusito/typed-signals)
[![Code Coverage](https://coveralls.io/repos/github/Lusito/typed-signals/badge.svg?branch=master)](https://coveralls.io/github/Lusito/typed-signals)

A type-checked [signal](https://en.wikipedia.org/wiki/Signals_and_slots) library written in TypeScript, usable from plain JavaScript as well. This is a TypeScript port of this excellent C++11 version:
[Performance of a C++11 Signal System](https://testbit.eu/cpp11-signal-system-performance/).
Of course, some changes have been made to make it work with TypeScript.

The original unit tests and additional ones are running automatically on [Travis-CI](https://travis-ci.org/)

#### Fair Warning
With version 2, the target is now es2015, so if you want to support older browser, you'll have to ensure that this module is being transpiled to an older es version during your build-process.

### Why Typed-Signals?

- Arbitrary arguments lists
- Type checking
- Support for priorities
- Add and remove listeners anytime, even during callbacks
- Signals can have return values, which can be collected
- No dependencies
- Automated [unit tests](https://travis-ci.org/Lusito/typed-signals)  with 100% [code coverage](https://coveralls.io/github/Lusito/typed-signals)
- Liberal license: [CC0 Public Domain](http://creativecommons.org/publicdomain/zero/1.0/)
- [Fully documented](https://lusito.github.io/typed-signals/index.html) using TypeDoc

### Installation via NPM

```npm install typed-signals --save```

### Simple usage

```typescript
import { Signal } from "typed-signals";

// Create a new signal, defining the function signature of handlers :
let mySignal = new Signal<(n: number, b: boolean, s: string) => void>();

//Register a handler:
let connection = mySignal.connect((n, b, s)=> console.log(`Called: ${n} ${b} ${s}`));

// Emit a signal:
mySignal.emit(42, true, 'Galactic Gargleblaster');

// Disconnect a handler:
connection.disconnect();
```

### Connections

```typescript
import { Signal, SignalConnections } from "typed-signals";

let mySignal = new Signal<() => void>();

// Disable and re-enable handlers
function handler42() {}
let connection = mySignal.connect(handler42);
connection.enabled = false;
mySignal.emit(); // won't call handler42
connection.enabled = true;
mySignal.emit(); // will call handler42

// Remember multiple connections and disconnect them all at once:
let connections = new SignalConnections();
connections.add(mySignal.connect(()=>{}));
connections.add(mySignal.connect(()=>{}));
connections.add(mySignal.connect(()=>{}));
connections.disconnectAll();

// Or disconnect all handlers of a signal:
mySignal.disconnectAll();
```

### Execution order

```typescript
import { Signal } from "typed-signals";

let mySignal = new Signal<() => void>();

// Handlers are called in the order in which they are added:
mySignal.connect(()=>console.log('first'));
mySignal.connect(()=>console.log('second'));
mySignal.disconnectAll();

// Second parameter to connect is an order value. A higher order value means later execution:
mySignal.connect(()=>console.log('second'), 1);
mySignal.connect(()=>console.log('first'), 0);
```

### Collectors

Collectors can be used to stop processing further handlers depending on the return value of a handler and/or to collect return values of those handlers.

Built-in Collectors:
- `CollectorLast<THandler extends (...args: any[]) => any>`
    - Returns the result of the last signal handler from a signal emission.
- `CollectorUntil0<THandler extends (...args: any[]) => boolean>`
    - Keep signal emissions going while all handlers return true.
- `CollectorWhile0<THandler extends (...args: any[]) => boolean>`
    - Keep signal emissions going while all handlers return false.
- `CollectorArray<THandler extends (...args: any[]) => any>`
    - Returns the result of the all signal handlers from a signal emission in an array.

`THandler` must be the same function signature as the signal. Here is an example:

```typescript
import { Signal, CollectorLast } from "typed-signals";

let mySignal = new Signal<() => string>();
let collector = new CollectorLast<() => string>(mySignal);
mySignal.connect(()=> 'Hello World');
mySignal.connect(()=> 'Foo Bar');
collector.emit(); // calls signal.emit();
console.log(collector.getResult()); // 'Foo Bar'
```

### Report issues

Something not working quite as expected? Do you need a feature that has not been implemented yet? Check the [issue tracker](https://github.com/Lusito/typed-signals/issues) and add a new one if your problem is not already listed. Please try to provide a detailed description of your problem, including the steps to reproduce it.

### Contribute

Awesome! If you would like to contribute with a new feature or submit a bugfix, fork this repo and send a pull request. Please, make sure all the unit tests are passing before submitting and add new ones in case you introduced new features.

### License

Typed-Signals has been released under the [CC0 Public Domain](http://creativecommons.org/publicdomain/zero/1.0/) license, meaning you
can use it free of charge, without strings attached in commercial and non-commercial projects. Credits are appreciated but not mandatory.
