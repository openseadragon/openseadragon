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

    // helpers and constants

    var ZOOM_FACTOR = 2; // the image will be twice as large as the viewer.
    var VIEWER_SIZE = 500; // We set up the viewer to be 500 px x 500 px.
    var IMAGE_SIZE = ZOOM_FACTOR * VIEWER_SIZE; // mostly for convenience
    var VIEWER_PADDING = new OpenSeadragon.Point(20, 20);

    var testZoomLevels = [-1, 0, 0.1, 0.5, 4, 10];

    var testPoints = [
        new OpenSeadragon.Point(0, 0),
        new OpenSeadragon.Point(0.001, 0.001),
        new OpenSeadragon.Point(0.25, 0.5),
        new OpenSeadragon.Point(0.999, 0.999),
        new OpenSeadragon.Point(1, 1)
    ];

    var testRects = [
        new OpenSeadragon.Rect(0, 0, 0, 0),
        new OpenSeadragon.Rect(0.001, 0.005, 0.001, 0.003),
        new OpenSeadragon.Rect(0.25, 0.25, 0.25, 0.25),
        new OpenSeadragon.Rect(0.999, 0.999, 0.999, 0.999),
        new OpenSeadragon.Rect(1, 1, 1, 1)
    ];

    // If this is something we might want to add to the Rect class, I can do that.
    // But I assumed that since it isn't there already, that's not functionality
    // that we want to make broadly available.
    OpenSeadragon.Rect.prototype.times = function( factor ) {
        return new OpenSeadragon.Rect(
            this.x * factor,
            this.y * factor,
            this.width * factor,
            this.height * factor
        );
    }

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

            var orig, expected, actual;
            for (var i = 0; i < testRects.length; i++){
                orig = testRects[i].times(IMAGE_SIZE);
                expected = new OpenSeadragon.Rect(
                orig.x / IMAGE_SIZE,
                orig.y / IMAGE_SIZE,
                orig.width / IMAGE_SIZE,
                orig.height / IMAGE_SIZE
                );
                actual = viewport.imageToViewportRectangle(orig);
                propEqual(actual, expected, "Coordinates converted correctly for " + orig);
            }

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

            var orig, expected, actual;
            for (var i = 0; i < testRects.length; i++){
                orig = testRects[i].times(VIEWER_SIZE);
                expected = new OpenSeadragon.Rect(
                    orig.x * IMAGE_SIZE,
                    orig.y * IMAGE_SIZE,
                    orig.width * IMAGE_SIZE,
                    orig.height * IMAGE_SIZE
                );
                actual = viewport.viewportToImageRectangle(orig);
                propEqual(actual, expected, "Coordinates converted correctly for " + orig);
            }

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

            var orig, expected, actual;
            for (var i = 0; i < testPoints.length; i++){
                orig = testPoints[i].times(VIEWER_SIZE);
                expected = orig.times(ZOOM_FACTOR);
                actual = viewport.viewerElementToImageCoordinates(orig);
                propEqual(actual, expected, "Coordinates converted correctly for " + orig);
            }

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

            var orig, expected, actual;
            for (var i = 0; i < testPoints.length; i++){
                orig = testPoints[i].times(IMAGE_SIZE);
                expected = orig.divide(ZOOM_FACTOR);
                actual = viewport.imageToViewerElementCoordinates(orig);
                propEqual(actual, expected, "Coordinates converted correctly for " + orig);
            }

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

            var orig, expected, actual;
            for (var i = 0; i < testPoints.length; i++){
                orig = testPoints[i].times(3000);
                expected = orig.divide(VIEWER_SIZE).plus(VIEWER_PADDING);
                actual = viewport.windowToViewportCoordinates(orig);
                propEqual(actual, expected, "Coordinates converted correctly for " + orig);
            }

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

            var orig, expected, actual;
            for (var i = 0; i < testPoints.length; i++){
                // Test image is IMAGE_SIZE x IMAGE_SIZE
                orig = testPoints[i].times(IMAGE_SIZE);
                position = viewer.element.getBoundingClientRect();
                expected = orig.divide(ZOOM_FACTOR).plus( new OpenSeadragon.Point(position.top, position.left) );
                actual = viewport.imageToWindowCoordinates(orig);
                propEqual(actual, expected, "Coordinates converted correctly for " + orig);
            }

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

            var orig, expected, actual;
            for (var i = 0; i < testPoints.length; i++){
                orig = testPoints[i].times(3000);
                expected = orig.divide(VIEWER_SIZE).plus(VIEWER_PADDING);
                actual = viewport.windowToViewportCoordinates(orig);
                propEqual(actual, expected, "Coordinates converted correctly for " + orig);
            }

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

            var orig, expected, actual;
            for (var i = 0; i < testPoints.length; i++){
                // Test image is IMAGE_SIZE x IMAGE_SIZE
                orig = testPoints[i].times(IMAGE_SIZE);
                expected = orig.minus(VIEWER_PADDING).times(VIEWER_SIZE);
                actual = viewport.viewportToWindowCoordinates(orig);
                propEqual(actual, expected, "Coordinates converted correctly for " + orig);
            }

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

            var orig, expected, actual;
            for (var i = 0; i < testPoints.length; i++){
                orig = testZoomLevels[i];
                expected = orig / ZOOM_FACTOR;
                actual = viewport.viewportToImageZoom(orig);
                equal(expected, actual, "Coordinates converted correctly for " + orig);
            }
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


            var orig, expected, actual;
            for (var i = 0; i < testPoints.length; i++){
                orig = testZoomLevels[i];
                expected = orig * ZOOM_FACTOR;
                actual = viewport.imageToViewportZoom(orig);
                equal(expected, actual, "Coordinates converted correctly for " + orig);
            }
            start();
        };

        viewer.addHandler('open', openHandler);
        viewer.open('/test/data/testpattern.dzi');
    });

})();