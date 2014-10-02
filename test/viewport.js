/* global module, asyncTest, $, ok, equal, notEqual, start, test, Util, testLog */

(function () {
    var viewer;

     module("viewport", {
        setup: function () {
            var example = $('<div id="example"></div>').appendTo("#qunit-fixture");

            testLog.reset();

            viewer = OpenSeadragon({
                id:            'example',
                prefixUrl:     '/build/openseadragon/images/',
                springStiffness: 100 // Faster animation = faster tests
            });
        },
        teardown: function () {
            if (viewer && viewer.close) {
                viewer.close();
            }

            viewer = null;
        }
    });

    // ----------
/*
    asyncTest('template', function() {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            // do stuff here
            var orig = ;
            var expected = ;
            var actual = ;
            equal(expected, actual, "what are you testing");

            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open('/test/data/testpattern.dzi');
    });
*/    asyncTest('WindowToWViewportCoordinates', function() {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            var orig_x = Math.floor(Math.random() * 10000);
            var orig_y = Math.floor(Math.random() * 10000);
            var orig = new OpenSeadragon.Point(orig_x, orig_y);
            // why does the math work this way?
            var expected = new OpenSeadragon.Point((orig_x / 500) + 20, (orig_x / 500) + 20);
            var actual = viewport.windowToViewportCoordinates(orig);
            equal(actual.x, expected.x, "x coordinate for " + orig_x);
            equal(actual.y, expected.y, "y coordinate for " + orig_y);

            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open('/test/data/testpattern.dzi');
    });

    asyncTest('viewportToWindowCoordinates', function() {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            var orig_x = Math.floor(Math.random() * 1000);
            var orig_y = Math.floor(Math.random() * 1000);
            var orig = new OpenSeadragon.Point(orig_x, orig_y);
            // why does the math work this way?
            var expected = new OpenSeadragon.Point((orig_x - 20) * 500, (orig_y -20) * 500);
            var actual = viewport.viewportToWindowCoordinates(orig);
            equal(actual.x, expected.x, "x coordinate for " + orig_x);
            equal(actual.y, expected.y, "y coordinate for " + orig_y);

            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open('/test/data/testpattern.dzi');
    });

    asyncTest('viewportToImageZoom', function() {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            var orig = Math.floor(Math.random() * 4);
            var expected = orig / 2; // because the container is 500 x 500
            var actual = viewport.viewportToImageZoom(orig);
            equal(expected, actual, "Expected " + expected + ", got " + actual);
            start();
        };

        viewer.addHandler('open', openHandler);
        viewer.open('/test/data/testpattern.dzi');
    });

    asyncTest('imageToViewportZoom', function() {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            var orig = Math.floor(Math.random() * 4);
            var expected = orig * 2; // because the container is 500 x 500
            var actual = viewport.imageToViewportZoom(orig);
            equal(expected, actual, "Expected " + expected + ", got " + actual);
            start();
        };

        viewer.addHandler('open', openHandler);
        viewer.open('/test/data/testpattern.dzi');
    });

})();