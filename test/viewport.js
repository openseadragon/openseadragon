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
    var VIEWER_PADDING = new OpenSeadragon.Point(20, 20);
    var DZI_PATH = '/test/data/testpattern.dzi'

    var testZoomLevels = [-1, 0, 0.1, 0.5, 4, 10];

    var testPoints = [
        new OpenSeadragon.Point(0, 0),
        new OpenSeadragon.Point(0.001, 0.001),
        new OpenSeadragon.Point(0.25, 0.5),
        new OpenSeadragon.Point(0.99, 0.99),
        new OpenSeadragon.Point(1, 1)
    ];

    var testRects = [
        new OpenSeadragon.Rect(0, 0, 0, 0),
        new OpenSeadragon.Rect(0.001, 0.005, 0.001, 0.003),
        new OpenSeadragon.Rect(0.25, 0.25, 0.25, 0.25),
        new OpenSeadragon.Rect(0.999, 0.999, 0.999, 0.999),
        new OpenSeadragon.Rect(1, 1, 1, 1)
    ];

    // ----------
/*
    asyncTest('template', function() {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);

            var orig, expected, actual;
            for (var i = 0; i < testPoints.length; i++){
                orig = ;
                expected = ;
                actual = ;
                propEqual(actual, expected, "message " + orig);
            }

            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });
*/
        asyncTest('deltaPixelsFromPoints', function() {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);

            var orig, expected, actual;
            for (var i = 0; i < testPoints.length; i++){
                orig = testPoints[i].times(viewer.source.dimensions.x);
                expected = orig.times(viewport.getContainerSize().x * ZOOM_FACTOR);
                actual = viewport.deltaPixelsFromPoints(orig);
                propEqual(actual, expected, "Correctly got delta pixels from points with current = false " + orig);

                expected_current = orig.times(viewport.getContainerSize().x);
                actual_current = viewport.deltaPixelsFromPoints(orig, true);
                propEqual(actual_current, expected_current, "Correctly got delta pixels from points with current = true " + orig);
            }

            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    asyncTest('deltaPointsFromPixels', function() {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);

            var orig, expected, actual;
            for (var i = 0; i < testPoints.length; i++){
                orig = testPoints[i].times(viewport.getContainerSize().x);

                expected = orig.divide(viewport.getContainerSize().x * ZOOM_FACTOR);
                actual = viewport.deltaPointsFromPixels(orig);
                propEqual(actual, expected, "Correctly got delta points from pixels with current = false " + orig);

                expected_current = orig.divide(viewport.getContainerSize().x);
                actual_current = viewport.deltaPointsFromPixels(orig, true);
                propEqual(actual_current, expected_current, "Correctly got delta points from pixels with current = true " + orig);
            }

            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });
    asyncTest('pixelFromPoint', function() {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);

            var orig, expected, actual;
            for (var i = 0; i < testPoints.length; i++){
                orig = testPoints[i].times(viewer.source.dimensions.x);
                // todo: this magic point is something to do with the target location but I don't entirely understand why it's here
                expected = orig.plus(new OpenSeadragon.Point(0.25, 0.25)).times(viewport.getContainerSize().x * ZOOM_FACTOR).minus(viewport.getContainerSize());
                actual = viewport.pixelFromPoint(orig, false);
                propEqual(
                    actual,
                    expected,
                    "Correctly converted coordinates with current = false " + orig
                );
                expected_current = orig.times(viewport.getContainerSize().x);
                actual_current = viewport.pixelFromPoint(orig, true);
                propEqual(
                    actual_current,
                    expected_current,
                    "Correctly converted coordinates with current = true " + orig
                );
            }

            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    asyncTest('pointFromPixel', function() {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);

            var orig, expected, actual;
            for (var i = 0; i < testPoints.length; i++){
                orig = testPoints[i].times(viewport.getContainerSize().x);
                // todo: this magic point is something to do with the target location but I don't entirely understand why it's here
                expected = orig.divide(viewer.source.dimensions.x).plus(new OpenSeadragon.Point(0.25, 0.25));
                actual = viewport.pointFromPixel(orig, false);
                propEqual(
                    actual,
                    expected,
                    "Correctly converted coordinates with current = false " + orig
                );
                expected_current = orig.divide(viewer.source.dimensions.x / ZOOM_FACTOR);
                actual_current = viewport.pointFromPixel(orig, true);
                propEqual(
                    actual_current,
                    expected_current,
                    "Correctly converted coordinates with current = true " + orig
                );
            }

            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });
    asyncTest('viewportToImageCoordinates', function() {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);

            var orig, expected, actual;
            for (var i = 0; i < testPoints.length; i++){
                orig = testPoints[i].times(viewport.getContainerSize().x);
                expected = orig.divide(viewer.source.dimensions.x);
                actual = viewport.imageToViewportCoordinates(orig);
                propEqual(actual, expected, "Coordinates converted correctly for " + orig);
            }

            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    asyncTest('imageToViewportCoordinates', function() {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);

            var orig, expected, actual;
            for (var i = 0; i < testPoints.length; i++){
                orig = testPoints[i].times(viewer.source.dimensions.x);
                expected = orig.divide(ZOOM_FACTOR * viewport.getContainerSize().x);
                actual = viewport.imageToViewportCoordinates(orig);
                propEqual(actual, expected, "Coordinates converted correctly for " + orig);
            }

            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });
    asyncTest('imageToViewportRectangle', function() {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);

            var orig, expected, actual;
            for (var i = 0; i < testRects.length; i++){
                orig = testRects[i].times(viewer.source.dimensions.x);
                expected = new OpenSeadragon.Rect(
                    orig.x / viewer.source.dimensions.x,
                    orig.y / viewer.source.dimensions.x,
                    orig.width / viewer.source.dimensions.x,
                    orig.height / viewer.source.dimensions.x
                );
                actual = viewport.imageToViewportRectangle(orig);
                propEqual(actual, expected, "Coordinates converted correctly for " + orig);
            }

            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    asyncTest('viewportToImageRectangle', function() {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);

            var orig, expected, actual;
            for (var i = 0; i < testRects.length; i++){
                orig = testRects[i].times(viewport.getContainerSize().x);
                expected = new OpenSeadragon.Rect(
                    orig.x * viewer.source.dimensions.x,
                    orig.y * viewer.source.dimensions.x,
                    orig.width * viewer.source.dimensions.x,
                    orig.height * viewer.source.dimensions.x
                );
                actual = viewport.viewportToImageRectangle(orig);
                propEqual(actual, expected, "Coordinates converted correctly for " + orig);
            }

            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    asyncTest('viewerElementToImageCoordinates', function() {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);

            var orig, expected, actual;
            for (var i = 0; i < testPoints.length; i++){
                orig = testPoints[i].times(viewport.getContainerSize().x);
                expected = orig.times(ZOOM_FACTOR);
                actual = viewport.viewerElementToImageCoordinates(orig);
                propEqual(actual, expected, "Coordinates converted correctly for " + orig);
            }

            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    asyncTest('imageToViewerElementCoordinates', function() {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);

            var orig, expected, actual;
            for (var i = 0; i < testPoints.length; i++){
                orig = testPoints[i].times(viewer.source.dimensions.x);
                expected = orig.divide(ZOOM_FACTOR);
                actual = viewport.imageToViewerElementCoordinates(orig);
                propEqual(actual, expected, "Coordinates converted correctly for " + orig);
            }

            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

   asyncTest('windowToImageCoordinates', function() {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);

            var window_boundary = Math.min(window.innerWidth, window.innerHeight);
            var orig, expected, actual;
            for (var i = 0; i < testPoints.length; i++){
                orig = testPoints[i].times(window_boundary);
                expected = orig.divide(viewport.getContainerSize().x).plus(VIEWER_PADDING);
                actual = viewport.windowToViewportCoordinates(orig);
                propEqual(actual, expected, "Coordinates converted correctly for " + orig);
            }

            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    asyncTest('imageToWindowCoordinates', function() {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);

            var orig, expected, actual;
            for (var i = 0; i < testPoints.length; i++){
                orig = testPoints[i].times(viewer.source.dimensions.x);
                position = viewer.element.getBoundingClientRect();
                expected = orig.divide(ZOOM_FACTOR).plus( new OpenSeadragon.Point(position.top, position.left) );
                actual = viewport.imageToWindowCoordinates(orig);
                propEqual(actual, expected, "Coordinates converted correctly for " + orig);
            }

            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    asyncTest('windowToViewportCoordinates', function() {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);

            var window_boundary = Math.min(window.innerWidth, window.innerHeight);
            var orig, expected, actual;
            for (var i = 0; i < testPoints.length; i++){
                orig = testPoints[i].times(window_boundary);
                expected = orig.divide(viewport.getContainerSize().x).plus(VIEWER_PADDING);
                actual = viewport.windowToViewportCoordinates(orig);
                propEqual(actual, expected, "Coordinates converted correctly for " + orig);
            }

            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    asyncTest('viewportToWindowCoordinates', function() {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);

            var orig, expected, actual;
            for (var i = 0; i < testPoints.length; i++){
                orig = testPoints[i].times(viewer.source.dimensions.x);
                expected = orig.minus(VIEWER_PADDING).times(viewport.getContainerSize().x);
                actual = viewport.viewportToWindowCoordinates(orig);
                propEqual(actual, expected, "Coordinates converted correctly for " + orig);
            }

            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
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
        viewer.open(DZI_PATH);
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
        viewer.open(DZI_PATH);
    });

})();
