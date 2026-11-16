/* global QUnit, OpenSeadragon */

(function() {
    let source;

    QUnit.module('EventSource contract', {
        beforeEach: function() {
            source = new OpenSeadragon.EventSource();
        }
    });

    QUnit.test('raiseEvent forwards the same arguments, source and per-handler userData', function(assert) {
        const calls = [];
        const lowData = { level: 'low' };
        const highData = { level: 'high' };
        const args = { value: 17, unchanged: true };

        source.addHandler('payload', function(event) {
            calls.push('low');
            assert.strictEqual(event, args, 'low-priority listener receives the original object');
            assert.strictEqual(event.eventSource, source, 'low-priority event source is correct');
            assert.strictEqual(event.userData, lowData, 'low-priority user data is correct');
            assert.strictEqual(event.value, 17, 'payload survives dispatch');
        }, lowData, -3);

        source.addHandler('payload', function(event) {
            calls.push('high');
            assert.strictEqual(event, args, 'high-priority listener receives the original object');
            assert.strictEqual(event.eventSource, source, 'high-priority event source is correct');
            assert.strictEqual(event.userData, highData, 'high-priority user data is correct');
        }, highData, 5);

        assert.strictEqual(source.raiseEvent('payload', args), true, 'accepted event returns true');
        assert.deepEqual(calls, ['high', 'low'], 'higher priority dispatches first');
        assert.strictEqual(args.userData, lowData, 'last listener leaves its user data on the original args');
        assert.strictEqual(args.eventSource, source, 'source attached to original args');
        assert.strictEqual(args.unchanged, true, 'other event fields are unchanged');
    });

    QUnit.test('raiseEvent succeeds without listeners and creates fresh default arguments', function(assert) {
        assert.strictEqual(source.raiseEvent('unhandled'), true, 'events without listeners are accepted');
        const received = [];
        source.addHandler('empty', function(event) {
            received.push(event);
        });

        assert.strictEqual(source.raiseEvent('empty'), true, 'omitted arguments are accepted');
        assert.strictEqual(source.raiseEvent('empty', null), true, 'null arguments are accepted');
        assert.strictEqual(received.length, 2, 'one callback per raise');
        assert.notStrictEqual(received[0], received[1], 'each empty raise gets its own object');
        received.forEach(function(event) {
            assert.strictEqual(event.eventSource, source, 'default arguments include the source');
            assert.strictEqual(event.userData, null, 'default userData is null');
            assert.deepEqual(Object.keys(event).sort(), ['eventSource', 'userData'], 'no spurious arguments are added');
        });
    });

    QUnit.test('getHandler returns null when empty and snapshots the registered listeners', function(assert) {
        assert.strictEqual(source.getHandler('missing'), null, 'no dispatcher for a missing event');
        const calls = [];
        const userData = { from: 'original' };
        source.addHandler('snapshot', function(event) {
            calls.push('original');
            assert.strictEqual(event.value, 7, 'the event payload is preserved');
            assert.strictEqual(event.userData, userData, 'the captured listener receives its user data');
        }, userData);

        const captured = source.getHandler('snapshot');
        assert.strictEqual(typeof captured, 'function', 'dispatcher is available for an event with listeners');
        source.addHandler('snapshot', function() {
            calls.push('late');
        });

        const otherSource = new OpenSeadragon.EventSource();
        const args = { value: 7 };
        captured(otherSource, args);
        assert.deepEqual(calls, ['original'], 'captured dispatcher does not acquire later handlers');
        assert.strictEqual(args.eventSource, otherSource, 'dispatcher uses its supplied source');
        assert.strictEqual(args.userData, userData, 'dispatcher adds original user data');

        source.raiseEvent('snapshot', { value: 7 });
        assert.deepEqual(calls, ['original', 'original', 'late'], 'a fresh dispatcher sees later registrations');
    });

    QUnit.test('getHandler stops for a boolean or predicate stopPropagation', function(assert) {
        const calls = [];
        source.addHandler('stop', function() {
            calls.push('first');
        });
        source.addHandler('stop', function() {
            calls.push('second');
        });

        source.raiseEvent('stop', { stopPropagation: true });
        assert.deepEqual(calls, ['first'], 'boolean true stops after the first listener');

        calls.length = 0;
        let predicateCalls = 0;
        source.raiseEvent('stop', {
            stopPropagation: function() {
                predicateCalls++;
                return true;
            }
        });
        assert.deepEqual(calls, ['first'], 'true predicate stops after the first listener');
        assert.strictEqual(predicateCalls, 1, 'stop predicate called exactly once');

        calls.length = 0;
        predicateCalls = 0;
        source.raiseEvent('stop', {
            stopPropagation: function() {
                predicateCalls++;
                return false;
            }
        });
        assert.deepEqual(calls, ['first', 'second'], 'false predicate permits both listeners');
        assert.strictEqual(predicateCalls, 2, 'continuing predicate checked after each listener');
    });

    QUnit.test('rejectEventHandler blocks registration and dispatch until allowEventHandler', function(assert) {
        let calls = 0;
        source.addHandler('controlled', function() {
            calls++;
        });
        const messages = [];
        const originalError = OpenSeadragon.console.error;
        OpenSeadragon.console.error = function(message) {
            messages.push(message);
        };

        try {
            source.rejectEventHandler('controlled', 'disabled for this test');
            assert.strictEqual(source.addHandler('controlled', function() {
                calls += 10;
            }), false, 'new ordinary handler is rejected');
            assert.strictEqual(source.addOnceHandler('controlled', function() {
                calls += 100;
            }), false, 'new once handler is also rejected');
            assert.strictEqual(source.numberOfHandlers('controlled'), 1, 'existing handler retained during rejection');
            assert.strictEqual(source.raiseEvent('controlled'), false, 'rejected event cannot fire');
            assert.strictEqual(calls, 0, 'existing handler is not called while blocked');
            assert.strictEqual(messages.length, 3, 'both registrations and dispatch produce a diagnostic');
            assert.ok(messages.every(function(message) {
                return message.indexOf('disabled for this test') !== -1;
            }), 'every diagnostic contains the rejection reason');

            source.allowEventHandler('controlled');
            assert.strictEqual(source.raiseEvent('controlled'), true, 'allow restores dispatch');
            assert.strictEqual(calls, 1, 'previous handler survives allow');
            assert.strictEqual(source.addHandler('controlled', function() {
                calls += 10;
            }), true, 'new registration accepted after allow');
            source.raiseEvent('controlled');
            assert.strictEqual(calls, 12, 'both original and new handlers fire');
            assert.strictEqual(source.numberOfHandlers('controlled'), 2, 'allowed registrations counted');
        } finally {
            OpenSeadragon.console.error = originalError;
        }
    });
})();
