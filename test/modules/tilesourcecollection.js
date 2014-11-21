/* global module, asyncTest, $, ok, equal, notEqual, start, test, Util, testLog */

(function() {
    var viewer;

    module('TileSourceCollection', {
        setup: function () {
            testLog.reset();
        },
        teardown: function () {
        }
    });

    // ----------
    asyncTest('deprecation', function() {
        Util.testDeprecation(OpenSeadragon, 'TileSourceCollection');
        start();
    });

})();
