/* global module, asyncTest, $, ok, equal, notEqual, start, test, Util, testLog, propEqual, console */

(function () {

    var originalNow;
    var now;

    module("spring", {
        setup: function () {
            now = 0;
            originalNow = OpenSeadragon.now;

            OpenSeadragon.now = function() {
                return now;
            };
        },
        teardown: function () {
            OpenSeadragon.now = originalNow;
        }
    });

    asyncTest('regular spring', function() {
        var spring = new OpenSeadragon.Spring({
            initial: 5,
            animationTime: 1,
            springStiffness: 0.000001
        });

        equal(spring.current.value, 5, 'initial current value');
        equal(spring.target.value, 5, 'initial target value');

        spring.springTo(6);
        equal(spring.current.value, 5, 'current value after springTo');
        equal(spring.target.value, 6, 'target value after springTo');

        now = 500;
        spring.update();
        Util.assessNumericValue(5.5, spring.current.value, 0.00001, 'current value after first update');
        equal(spring.target.value, 6, 'target value after first update');

        now = 1000;
        spring.update();
        equal(spring.current.value, 6, 'current value after second update');
        equal(spring.target.value, 6, 'target value after second update');

        start();
    });

    asyncTest('exponential spring', function() {
        var spring = new OpenSeadragon.Spring({
            exponential: true,
            initial: 1,
            animationTime: 1,
            springStiffness: 0.000001
        });

        equal(spring.current.value, 1, 'initial current value');
        equal(spring.target.value, 1, 'initial target value');

        spring.springTo(2);
        equal(spring.current.value, 1, 'current value after springTo');
        equal(spring.target.value, 2, 'target value after springTo');

        now = 500;
        spring.update();
        Util.assessNumericValue(1.41421, spring.current.value, 0.00001, 'current value after first update');
        equal(spring.target.value, 2, 'target value after first update');

        now = 1000;
        spring.update();
        equal(spring.current.value, 2, 'current value after second update');
        equal(spring.target.value, 2, 'target value after second update');

        start();
    });

})();
