/* global QUnit, $, TouchUtil, Util, testLog */

(function () {
    var context, result=[], eName = "test", eventCounter = 0, finished = false;

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

    function runTest(e) {
        context.raiseEvent(eName, e);
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
} )();
