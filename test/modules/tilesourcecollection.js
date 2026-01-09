/* global QUnit, Util, testLog */

(function() {
    QUnit.module('TileSourceCollection', {
        beforeEach: function () {
            testLog.reset();
        },
        afterEach: function () {
        }
    });

    // ----------
    QUnit.test('deprecation', function(assert) {
        const done = assert.async();
        Util.testDeprecation(assert, OpenSeadragon, 'TileSourceCollection');
        done();
    });

})();
