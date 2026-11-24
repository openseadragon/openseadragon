/* global QUnit, $, TouchUtil, Util, testLog */

(function () {
    let context, result=[], eName = "test", eventCounter = 0, finished = false;

    function evaluateTest(e) {
        if (finished) return;
        finished = true;
        e.assert.strictEqual(JSON.stringify(result), JSON.stringify(e.expected), e.message);
        e.done();
    }

    function executor(i, ms) {
        if (ms === undefined) return function (e) {
            eventCounter++;
            result.push(i);
            if (eventCounter === context.numberOfHandlers(eName)) {
                evaluateTest(e);
            }
        };

        return function (e) {
            return new Promise(function (resolve) {
                setTimeout(function () {
                    eventCounter++;
                    result.push(i);
                    if (eventCounter === context.numberOfHandlers(eName)) {
                        evaluateTest(e);
                    }
                    resolve();
                }, ms);
            });
        }
    }

    function runTest(e, async=false) {
        context.raiseEvent(eName, e);
    }

    function runTestAwaiting(e, async=false) {
        context.raiseEventAwaiting(eName, e);
    }

    QUnit.module( 'EventSource', {
        beforeEach: function () {
            context = new OpenSeadragon.EventSource();
            eventCounter = 0;
            result = [];
            finished = false;
        }
    } );

    // ----------
    QUnit.test('EventSource: no events', function(assert) {
        context.addHandler(eName, evaluateTest);
        runTest({
            assert: assert,
            done: assert.async(),
            expected: [],
            message: 'No handlers registered - arrays should be empty.'
        });
    });

    QUnit.test('EventSource: simple callbacks order', function(assert) {
        context.addHandler(eName, executor(1));
        context.addHandler(eName, executor(2));
        context.addHandler(eName, executor(3));
        runTest({
            assert: assert,
            done: assert.async(),
            expected: [1, 2, 3],
            message: 'Simple callback order should follow [1,2,3].'
        });
    });

    QUnit.test('EventSource: priority callbacks order', function(assert) {
        context.addHandler(eName, executor(1), undefined, 20);
        context.addHandler(eName, executor(2), undefined, 124);
        context.addHandler(eName, executor(3), undefined, -5);
        context.addHandler(eName, executor(4));
        context.addHandler(eName, executor(5), undefined, -2);
        runTest({
            assert: assert,
            done: assert.async(),
            expected: [2, 1, 4, 5, 3],
            message: 'Prioritized callback order should follow [2,1,4,5,3].'
        });
    });

    QUnit.test('EventSource: async non-synchronized order', function(assert) {
        context.addHandler(eName, executor(1, 5));
        context.addHandler(eName, executor(2, 50));
        context.addHandler(eName, executor(3));
        context.addHandler(eName, executor(4));
        runTest({
            assert: assert,
            done: assert.async(),
            expected: [3, 4, 1, 2],
            message: 'Async callback order should follow [3,4,1,2].'
        });
    });

    QUnit.test('EventSource: async non-synchronized priority order', function(assert) {
        context.addHandler(eName, executor(1, 5));
        context.addHandler(eName, executor(2, 50), undefined, -100);
        context.addHandler(eName, executor(3), undefined, -500);
        context.addHandler(eName, executor(4), undefined, 675);
        runTest({
            assert: assert,
            done: assert.async(),
            expected: [4, 3, 1, 2],
            message: 'Async callback order with priority should follow [4,3,1,2]. Async functions do not respect priority.'
        });
    });

    QUnit.test('EventSource: async synchronized order', function(assert) {
        context.addHandler(eName, executor(1, 5));
        context.addHandler(eName, executor(2, 50));
        context.addHandler(eName, executor(3));
        context.addHandler(eName, executor(4));
        runTestAwaiting({
            waitForPromiseHandlers: true,
            assert: assert,
            done: assert.async(),
            expected: [1, 2, 3, 4],
            message: 'Async callback order should follow [1,2,3,4], since it is synchronized.'
        });
    });

    QUnit.test('EventSource: async synchronized priority order', function(assert) {
        context.addHandler(eName, executor(1, 5));
        context.addHandler(eName, executor(2), undefined, -500);
        context.addHandler(eName, executor(3, 50), undefined, -200);
        context.addHandler(eName, executor(4), undefined, 675);
        runTestAwaiting({
            waitForPromiseHandlers: true,
            assert: assert,
            done: assert.async(),
            expected: [4, 1, 3, 2],
            message: 'Async callback order with priority should follow [4,1,3,2], since priority is respected when synchronized.'
        });
    });

    QUnit.test('EventSource: removeHandler removes every matching registration only', function(assert) {
        const calls = [];
        function repeated() {
            calls.push('repeated');
        }
        function retained() {
            calls.push('retained');
        }

        context.removeHandler('missing', repeated);
        context.addHandler(eName, repeated);
        context.addHandler(eName, retained);
        context.addHandler(eName, repeated);
        context.addHandler('other', repeated);

        assert.strictEqual(context.numberOfHandlers(eName), 3, 'duplicate callbacks each count');
        context.removeHandler(eName, repeated);
        assert.strictEqual(context.numberOfHandlers(eName), 1, 'both matching registrations removed');
        assert.strictEqual(context.numberOfHandlers('other'), 1, 'unrelated event is unchanged');

        context.raiseEvent(eName);
        context.raiseEvent('other');
        assert.deepEqual(calls, ['retained', 'repeated'], 'only the retained and other-event callbacks fire');
    });

    QUnit.test('EventSource: removeAllHandlers clears one event or all events', function(assert) {
        const calls = [];
        context.addHandler(eName, function() {
            calls.push('first');
        });
        context.addHandler(eName, function() {
            calls.push('second');
        });
        context.addHandler('other', function() {
            calls.push('other');
        });

        context.removeAllHandlers(eName);
        assert.strictEqual(context.numberOfHandlers(eName), 0, 'named event cleared');
        assert.strictEqual(context.numberOfHandlers('other'), 1, 'other event retained');
        context.raiseEvent(eName);
        context.raiseEvent('other');
        assert.deepEqual(calls, ['other'], 'only the other event fires');

        context.addHandler(eName, function() {
            calls.push('restored');
        });
        context.removeAllHandlers();
        assert.strictEqual(context.numberOfHandlers(eName), 0, 'first event cleared globally');
        assert.strictEqual(context.numberOfHandlers('other'), 0, 'second event cleared globally');
        context.raiseEvent(eName);
        context.raiseEvent('other');
        assert.deepEqual(calls, ['other'], 'cleared events stay silent');

        context.addHandler(eName, function() {
            calls.push('new');
        });
        context.raiseEvent(eName);
        assert.deepEqual(calls, ['other', 'new'], 'handlers can be registered after clearing');
    });

    QUnit.test('EventSource: addOnceHandler honors default and explicit times', function(assert) {
        const calls = [];
        const userData = { key: 'twice' };

        assert.strictEqual(context.addOnceHandler(eName, function() {
            calls.push('once');
        }), true, 'default once handler registered');
        assert.strictEqual(context.addOnceHandler(eName, function(event) {
            assert.strictEqual(event.userData, userData, 'user data preserved on each call');
            calls.push('twice');
        }, userData, 2), true, 'two-use handler registered');
        assert.strictEqual(context.numberOfHandlers(eName), 2, 'both wrappers registered');

        context.raiseEvent(eName);
        assert.deepEqual(calls, ['once', 'twice'], 'both handlers fire on first raise');
        assert.strictEqual(context.numberOfHandlers(eName), 1, 'default once handler removed');

        context.raiseEvent(eName);
        assert.deepEqual(calls, ['once', 'twice', 'twice'], 'times=2 fires a second time');
        assert.strictEqual(context.numberOfHandlers(eName), 0, 'second wrapper removed on second raise');

        context.raiseEvent(eName);
        assert.deepEqual(calls, ['once', 'twice', 'twice'], 'neither wrapper fires again');
        assert.strictEqual(context.numberOfHandlers(eName), 0, 'both remain removed');
    });

    QUnit.test('EventSource: once callbacks are not removed by their original function', function(assert) {
        let calls = 0;
        function original() {
            calls++;
        }

        context.addOnceHandler(eName, original);
        context.removeHandler(eName, original);
        assert.strictEqual(context.numberOfHandlers(eName), 1, 'wrapper is distinct from callback');
        context.raiseEvent(eName);
        context.raiseEvent(eName);
        assert.strictEqual(calls, 1, 'wrapper still fires exactly once');
        assert.strictEqual(context.numberOfHandlers(eName), 0, 'wrapper cleans up after firing');
    });

    QUnit.test('EventSource: numberOfHandlers excludes missing and invalid callbacks', function(assert) {
        assert.strictEqual(context.numberOfHandlers('missing'), 0, 'unregistered event has zero handlers');
        assert.strictEqual(context.addHandler(eName, null), false, 'null registration is rejected');
        assert.strictEqual(context.addHandler(eName, 'not a function'), false, 'non-function registration is rejected');
        assert.strictEqual(context.numberOfHandlers(eName), 0, 'invalid callbacks do not count');

        const handler = function() {};
        context.addHandler(eName, handler);
        context.addHandler(eName, handler);
        assert.strictEqual(context.numberOfHandlers(eName), 2, 'each registration counts');
        context.removeHandler(eName, handler);
        assert.strictEqual(context.numberOfHandlers(eName), 0, 'duplicate removal clears the count');
    });

    QUnit.test('EventSource: raiseEvent forwards the same arguments, context and per-handler userData', function(assert) {
        const calls = [];
        const lowData = { level: 'low' };
        const highData = { level: 'high' };
        const args = { value: 17, unchanged: true };

        context.addHandler('payload', function(event) {
            calls.push('low');
            assert.strictEqual(event, args, 'low-priority listener receives the original object');
            assert.strictEqual(event.eventSource, context, 'low-priority event context is correct');
            assert.strictEqual(event.userData, lowData, 'low-priority user data is correct');
            assert.strictEqual(event.value, 17, 'payload survives dispatch');
        }, lowData, -3);

        context.addHandler('payload', function(event) {
            calls.push('high');
            assert.strictEqual(event, args, 'high-priority listener receives the original object');
            assert.strictEqual(event.eventSource, context, 'high-priority event context is correct');
            assert.strictEqual(event.userData, highData, 'high-priority user data is correct');
        }, highData, 5);

        assert.strictEqual(context.raiseEvent('payload', args), true, 'accepted event returns true');
        assert.deepEqual(calls, ['high', 'low'], 'higher priority dispatches first');
        assert.strictEqual(args.userData, lowData, 'last listener leaves its user data on the original args');
        assert.strictEqual(args.eventSource, context, 'context attached to original args');
        assert.strictEqual(args.unchanged, true, 'other event fields are unchanged');
    });

    QUnit.test('EventSource: raiseEvent succeeds without listeners and creates fresh default arguments', function(assert) {
        assert.strictEqual(context.raiseEvent('unhandled'), true, 'events without listeners are accepted');
        const received = [];
        context.addHandler('empty', function(event) {
            received.push(event);
        });

        assert.strictEqual(context.raiseEvent('empty'), true, 'omitted arguments are accepted');
        assert.strictEqual(context.raiseEvent('empty', null), true, 'null arguments are accepted');
        assert.strictEqual(received.length, 2, 'one callback per raise');
        assert.notStrictEqual(received[0], received[1], 'each empty raise gets its own object');
        received.forEach(function(event) {
            assert.strictEqual(event.eventSource, context, 'default arguments include the context');
            assert.strictEqual(event.userData, null, 'default userData is null');
            assert.deepEqual(Object.keys(event).sort(), ['eventSource', 'userData'], 'no spurious arguments are added');
        });
    });

    QUnit.test('EventSource: getHandler returns null when empty and snapshots the registered listeners', function(assert) {
        assert.strictEqual(context.getHandler('missing'), null, 'no dispatcher for a missing event');
        const calls = [];
        const userData = { from: 'original' };
        context.addHandler('snapshot', function(event) {
            calls.push('original');
            assert.strictEqual(event.value, 7, 'the event payload is preserved');
            assert.strictEqual(event.userData, userData, 'the captured listener receives its user data');
        }, userData);

        const captured = context.getHandler('snapshot');
        assert.strictEqual(typeof captured, 'function', 'dispatcher is available for an event with listeners');
        context.addHandler('snapshot', function() {
            calls.push('late');
        });

        const otherSource = new OpenSeadragon.EventSource();
        const args = { value: 7 };
        captured(otherSource, args);
        assert.deepEqual(calls, ['original'], 'captured dispatcher does not acquire later handlers');
        assert.strictEqual(args.eventSource, otherSource, 'dispatcher uses its supplied context');
        assert.strictEqual(args.userData, userData, 'dispatcher adds original user data');

        context.raiseEvent('snapshot', { value: 7 });
        assert.deepEqual(calls, ['original', 'original', 'late'], 'a fresh dispatcher sees later registrations');
    });

    QUnit.test('EventSource: getHandler stops for a boolean or predicate stopPropagation', function(assert) {
        const calls = [];
        context.addHandler('stop', function() {
            calls.push('first');
        });
        context.addHandler('stop', function() {
            calls.push('second');
        });

        context.raiseEvent('stop', { stopPropagation: true });
        assert.deepEqual(calls, ['first'], 'boolean true stops after the first listener');

        calls.length = 0;
        let predicateCalls = 0;
        context.raiseEvent('stop', {
            stopPropagation: function() {
                predicateCalls++;
                return true;
            }
        });
        assert.deepEqual(calls, ['first'], 'true predicate stops after the first listener');
        assert.strictEqual(predicateCalls, 1, 'stop predicate called exactly once');

        calls.length = 0;
        predicateCalls = 0;
        context.raiseEvent('stop', {
            stopPropagation: function() {
                predicateCalls++;
                return false;
            }
        });
        assert.deepEqual(calls, ['first', 'second'], 'false predicate permits both listeners');
        assert.strictEqual(predicateCalls, 2, 'continuing predicate checked after each listener');
    });

    QUnit.test('EventSource: rejectEventHandler blocks registration and dispatch until allowEventHandler', function(assert) {
        let calls = 0;
        context.addHandler('controlled', function() {
            calls++;
        });
        const messages = [];
        const originalError = OpenSeadragon.console.error;
        OpenSeadragon.console.error = function(message) {
            messages.push(message);
        };

        try {
            context.rejectEventHandler('controlled', 'disabled for this test');
            assert.strictEqual(context.addHandler('controlled', function() {
                calls += 10;
            }), false, 'new ordinary handler is rejected');
            assert.strictEqual(context.addOnceHandler('controlled', function() {
                calls += 100;
            }), false, 'new once handler is also rejected');
            assert.strictEqual(context.numberOfHandlers('controlled'), 1, 'existing handler retained during rejection');
            assert.strictEqual(context.raiseEvent('controlled'), false, 'rejected event cannot fire');
            assert.strictEqual(calls, 0, 'existing handler is not called while blocked');
            assert.strictEqual(messages.length, 3, 'both registrations and dispatch produce a diagnostic');
            assert.ok(messages.every(function(message) {
                return message.indexOf('disabled for this test') !== -1;
            }), 'every diagnostic contains the rejection reason');

            context.allowEventHandler('controlled');
            assert.strictEqual(context.raiseEvent('controlled'), true, 'allow restores dispatch');
            assert.strictEqual(calls, 1, 'previous handler survives allow');
            assert.strictEqual(context.addHandler('controlled', function() {
                calls += 10;
            }), true, 'new registration accepted after allow');
            context.raiseEvent('controlled');
            assert.strictEqual(calls, 12, 'both original and new handlers fire');
            assert.strictEqual(context.numberOfHandlers('controlled'), 2, 'allowed registrations counted');
        } finally {
            OpenSeadragon.console.error = originalError;
        }
    });
} )();
