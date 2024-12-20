/* global QUnit, Util, console */

(function () {

    var originalNow;
    var now;

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
        var done = assert.async();
        var spring = new OpenSeadragon.Spring({
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
        var done = assert.async();
        var spring = new OpenSeadragon.Spring({
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

})();
