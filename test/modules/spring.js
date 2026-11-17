/* global QUnit, Util, console */

(function () {

    let originalNow;
    let now;

    QUnit.module("spring", {
        beforeEach: function () {
            now = 0;
            originalNow = OpenSeadragon.now;

            OpenSeadragon.now = function() {
                return now;
            };
        },
        afterEach: function () {
            OpenSeadragon.now = originalNow;
        }
    });

    QUnit.test('regular spring', function(assert) {
        const done = assert.async();
        const spring = new OpenSeadragon.Spring({
            initial: 5,
            animationTime: 1,
            springStiffness: 0.000001
        });

        assert.equal(spring.current.value, 5, 'initial current value');
        assert.equal(spring.target.value, 5, 'initial target value');

        spring.springTo(6);
        assert.equal(spring.current.value, 5, 'current value after springTo');
        assert.equal(spring.target.value, 6, 'target value after springTo');

        now = 500;
        spring.update();
        Util.assessNumericValue(assert, spring.current.value, 5.5, 0.00001, 'current value after first update');
        assert.equal(spring.target.value, 6, 'target value after first update');

        now = 1000;
        spring.update();
        assert.equal(spring.current.value, 6, 'current value after second update');
        assert.equal(spring.target.value, 6, 'target value after second update');

        done();
    });

    QUnit.test('exponential spring', function(assert) {
        const done = assert.async();
        const spring = new OpenSeadragon.Spring({
            exponential: true,
            initial: 1,
            animationTime: 1,
            springStiffness: 0.000001
        });

        assert.equal(spring.current.value, 1, 'initial current value');
        assert.equal(spring.target.value, 1, 'initial target value');

        spring.springTo(2);
        assert.equal(spring.current.value, 1, 'current value after springTo');
        assert.equal(spring.target.value, 2, 'target value after springTo');

        now = 500;
        spring.update();
        Util.assessNumericValue(assert, spring.current.value, 1.41421, 0.00001, 'current value after first update');
        assert.equal(spring.target.value, 2, 'target value after first update');

        now = 1000;
        spring.update();
        assert.equal(spring.current.value, 2, 'current value after second update');
        assert.equal(spring.target.value, 2, 'target value after second update');

        done();
    });

    QUnit.test('valueAt predicts update without changing the spring', function(assert) {
        [false, true].forEach(function(exponential) {
            const name = exponential ? 'exponential' : 'linear';
            const spring = new OpenSeadragon.Spring({
                exponential: exponential,
                initial: 2,
                animationTime: 1,
                springStiffness: 6.5
            });
            now = 0;
            spring.springTo(16);

            const predicted = [0, 100, 250, 600, 999, 1000, 5000].map(t => spring.valueAt(t));
            assert.equal(spring.current.value, 2, name + ': predicting does not move the spring');
            assert.equal(spring.valueAt(Infinity), 16, name + ': the end of time is the target');

            [0, 100, 250, 600, 999, 1000, 5000].forEach(function(t, i) {
                now = t;
                spring.update();
                Util.assessNumericValue(assert, predicted[i], spring.current.value, 1e-9,
                    name + ': value at ' + t + ' ms matches update()');
            });
        });
    });

})();
