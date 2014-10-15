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
    // helper
    var getRandom = function(min, max){
        return min + Math.floor(Math.random() * (max - min + 1));
    }

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
*/
/*    asyncTest('windowToImageCoordinates', function() {
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
    });*/

/*  Need imagetoViewerElementCoordinates first to figure out this one
    asyncTest('imageToWindowCoordinates', function() {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            // test image is 1000 x 1000
            var orig = new OpenSeadragon.Point(
                    getRandom(0, 1000), getRandom(0, 1000)
                );
            var expected = orig.plus( new OpenSeadragon.Point(20, 20) );
            console.log(expected);
            var actual = viewport.imageToWindowCoordinates(orig);
            console.log(actual);
            ok(actual.equals(expected), "Coordinates converted correctly for " + orig);

            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open('/test/data/testpattern.dzi');
    });*/

    asyncTest('WindowToViewportCoordinates', function() {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            var orig_x = getRandom(100, 3000);
            var orig_y = getRandom(100, 3000);
            var orig = new OpenSeadragon.Point(orig_x, orig_y);

            // 500 is the viewport container size; there's 20 px of padding (I think)
            var expected = orig.divide(500).plus( new OpenSeadragon.Point(20, 20) );
            var actual = viewport.windowToViewportCoordinates(orig);
            propEqual(actual, expected, "Coordinates converted correctly for " + orig);

            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open('/test/data/testpattern.dzi');
    });

    asyncTest('viewportToWindowCoordinates', function() {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            var orig_x = getRandom(0, 1000);
            var orig_y = getRandom(0, 1000);
            var orig = new OpenSeadragon.Point(orig_x, orig_y);

            // 500 is the viewport container size; there's 20 px of padding (I think)
            var expected = orig.minus( new OpenSeadragon.Point(20, 20) ).times(500);
            var actual = viewport.viewportToWindowCoordinates(orig);
            propEqual(actual, expected, "Coordinates converted correctly for " + orig);

            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open('/test/data/testpattern.dzi');
    });

    asyncTest('viewportToImageZoom', function() {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            var orig = getRandom(0, 4);
            // because the container is 500 x 500 and the image is 1000 x 1000
            var expected = orig / 2;
            var actual = viewport.viewportToImageZoom(orig);
            equal(expected, actual, "Coordinates converted correctly for " + orig);
            start();
        };

        viewer.addHandler('open', openHandler);
        viewer.open('/test/data/testpattern.dzi');
    });

    asyncTest('imageToViewportZoom', function() {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            var orig = getRandom(0, 4);
            // because the container is 500 x 500 and the image is 1000 x 1000
            var expected = orig * 2;
            var actual = viewport.imageToViewportZoom(orig);
            equal(expected, actual, "Coordinates converted correctly for " + orig);
            start();
        };

        viewer.addHandler('open', openHandler);
        viewer.open('/test/data/testpattern.dzi');
    });

})();