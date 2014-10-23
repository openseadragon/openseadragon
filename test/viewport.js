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
    };

    var ZOOM_FACTOR = 2; // the image will be twice as large as the viewer.

    // ----------
/*
    asyncTest('template', function() {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);

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
    asyncTest('imageToViewportRectangle', function() {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);

            var orig = new OpenSeadragon.Rect(
                getRandom(0, 1000),
                getRandom(0, 1000),
                getRandom(0, 1000),
                getRandom(0, 1000)
            );
            var expected = new OpenSeadragon.Rect(
                orig.x / 1000,
                orig.y / 1000,
                orig.width / 1000,
                orig.height / 1000
            );
            var actual = viewport.imageToViewportRectangle(orig);
            propEqual(actual, expected, "Coordinates converted correctly for " + orig);

            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open('/test/data/testpattern.dzi');
    });

    asyncTest('viewportToImageRectangle', function() {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);

            var orig = new OpenSeadragon.Rect(
                getRandom(0, 500),
                getRandom(0, 500),
                getRandom(0, 500),
                getRandom(0, 500)
            );
            var expected = new OpenSeadragon.Rect(
                orig.x * 1000,
                orig.y * 1000,
                orig.width * 1000,
                orig.height * 1000
            );
            var actual = viewport.viewportToImageRectangle(orig);
            propEqual(actual, expected, "Coordinates converted correctly for " + orig);

            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open('/test/data/testpattern.dzi');
    });

    asyncTest('viewerElementToImageCoordinates', function() {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);

            var orig = new OpenSeadragon.Point(
                    getRandom(0, 500), getRandom(0, 500)
                );
            var expected = orig.times(ZOOM_FACTOR);
            var actual = viewport.viewerElementToImageCoordinates(orig);
            propEqual(actual, expected, "Coordinates converted correctly for " + orig);

            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open('/test/data/testpattern.dzi');
    });

    asyncTest('imageToViewerElementCoordinates', function() {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);

            var orig = new OpenSeadragon.Point(
                    getRandom(0, 1000), getRandom(0, 1000)
                );
            var expected = orig.divide(ZOOM_FACTOR);
            var actual = viewport.imageToViewerElementCoordinates(orig);
            propEqual(actual, expected, "Coordinates converted correctly for " + orig);

            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open('/test/data/testpattern.dzi');
    });

   asyncTest('windowToImageCoordinates', function() {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);

            var orig = new OpenSeadragon.Point(
                    getRandom(100, 3000), getRandom(100, 3000)
                );
            // 500 is the viewer size; there's 20 px of padding (I think)
            var expected = orig.divide(500).plus( new OpenSeadragon.Point(20, 20) );
            var actual = viewport.windowToViewportCoordinates(orig);
            propEqual(actual, expected, "Coordinates converted correctly for " + orig);

            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open('/test/data/testpattern.dzi');
    });

    asyncTest('imageToWindowCoordinates', function() {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);

            // test image is 1000 x 1000
            var orig = new OpenSeadragon.Point(
                    getRandom(0, 1000), getRandom(0, 1000)
                );
            var position = viewer.element.getBoundingClientRect();
            var expected = orig.divide(ZOOM_FACTOR).plus( new OpenSeadragon.Point(position.top, position.left) );
            var actual = viewport.imageToWindowCoordinates(orig);
            propEqual(actual, expected, "Coordinates converted correctly for " + orig);

            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open('/test/data/testpattern.dzi');
    });

    asyncTest('WindowToViewportCoordinates', function() {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);

            var orig = new OpenSeadragon.Point(
                    getRandom(100, 3000), getRandom(100, 3000)
                );

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
            viewport.zoomTo(ZOOM_FACTOR, null, true);

            var orig = new OpenSeadragon.Point(
                    getRandom(0, 1000), getRandom(0, 1000)
                );

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
            viewport.zoomTo(ZOOM_FACTOR, null, true);

            var orig = getRandom(0, 4);
            var expected = orig / ZOOM_FACTOR;
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
            viewport.zoomTo(ZOOM_FACTOR, null, true);

            var orig = getRandom(0, 4);
            var expected = orig * ZOOM_FACTOR;
            var actual = viewport.imageToViewportZoom(orig);
            equal(expected, actual, "Coordinates converted correctly for " + orig);
            start();
        };

        viewer.addHandler('open', openHandler);
        viewer.open('/test/data/testpattern.dzi');
    });

})();