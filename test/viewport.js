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
    var TALL_PATH = '/test/data/tall.dzi'

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

            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });
*/
    asyncTest('getContainerSize', function() {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);

            propEqual(viewport.getContainerSize(), new OpenSeadragon.Point(500, 500), "Test container size")
            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    asyncTest('getAspectRatio', function() {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);

            equal(viewport.getAspectRatio(), 1, "Test aspect ratio")
            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    asyncTest('getMinZoomDefault', function() {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);

            equal(viewport.getMinZoom(), .9, "Test default min zoom level")
            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    asyncTest('getMaxZoomDefault', function() {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);

            equal(viewport.getMaxZoom(), 2.2, "Test default max zoom level")
            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    asyncTest('getMinZoom', function() {
        var expected, level, i = 0;
        var openHandler = function(event) {
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);

            if(level == 0) { // 0 means use the default
                expected = 0.9;
            }
            else if(level > 1){
                expected = 1; // min zoom won't go bigger than 1.
            }

            equal(
                viewport.getMinZoom(),
                expected,
                "Test getMinZoom with zoom level of " + level
            );
            i++;
            if(i < testZoomLevels.length){
                level = testZoomLevels[i];
                viewer.minZoomLevel = level;
                expected = level;
                viewer.open(DZI_PATH);
            }
            else {
                viewer.removeHandler('open', openHandler);
                start();
            }
        };

        viewer.addHandler('open', openHandler);
        level = testZoomLevels[i];
        viewer.minZoomLevel = level;
        expected = level;
        viewer.open(DZI_PATH);
    });

    asyncTest('getMaxZoom', function() {
        var expected, level, i = 0;
        var openHandler = function(event) {
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);

            if(level == 0){ // 0 means use the default
                expected = 2.2;
            }
            else if(level < 1){
                expected = 1; // max zoom won't go smaller than 1.
            }

            equal(
                viewport.getMaxZoom(),
                expected,
                "Test getMaxZoom with zoom level of " + level
            );
            i++;
            if(i < testZoomLevels.length){
                level = testZoomLevels[i];
                viewer.maxZoomLevel = level;
                expected = level;
                viewer.open(DZI_PATH);
            }
            else {
                viewer.removeHandler('open', openHandler);
                start();
            }
        };

        viewer.addHandler('open', openHandler);
        level = testZoomLevels[i];
        viewer.maxZoomLevel = level;
        expected = level;
        viewer.open(DZI_PATH);
    });

    asyncTest('getHomeBounds', function() {
        var expected, i = 0;
        var openHandler = function(event) {
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);

            // Have to special case this to avoid dividing by 0
            if(testZoomLevels[i] == 0){
                expected = new OpenSeadragon.Rect(0, 0, 1, 1);
            }
            else{
                var sideLength = 1.0 / viewer.defaultZoomLevel;  // it's a square in this case
                var position = 0.5 - (sideLength / 2.0);
                expected = new OpenSeadragon.Rect(position, position, sideLength, sideLength);
            }
            propEqual(
                viewport.getHomeBounds(),
                expected,
                "Test getHomeBounds with default zoom level of " + viewer.defaultZoomLevel
            );
            i++;
            if(i < testZoomLevels.length){
                viewer.defaultZoomLevel = testZoomLevels[i];
                viewer.open(DZI_PATH);
            }
            else {
                viewer.removeHandler('open', openHandler);
                start();
            }
        };

        viewer.addHandler('open', openHandler);
        viewer.defaultZoomLevel = testZoomLevels[i];
        viewer.open(DZI_PATH);
    });

    asyncTest('getHomeZoom', function() {
        var expected, i = 0;
        var openHandler = function(event) {
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);

            // If the default zoom level is set to 0, then we expect the home zoom to be 1.
            if(expected == 0){
                expected = 1;
            }
            equal(
                viewport.getHomeZoom(),
                expected,
                "Test getHomeZoom with default zoom level of " + expected
            );
            i++;
            if(i < testZoomLevels.length){
                expected = testZoomLevels[i];
                viewer.defaultZoomLevel = expected;
                viewer.open(DZI_PATH);
            }
            else {
                viewer.removeHandler('open', openHandler);
                start();
            }
        };

        viewer.addHandler('open', openHandler);
        expected = testZoomLevels[i];
        viewer.defaultZoomLevel = expected;
        viewer.open(DZI_PATH);
    });

    asyncTest('getHomeZoomWithHomeFillsViewer', function() {
        var expected, i = 0;
        var openHandler = function(event) {
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);

            // If the default zoom level is set to 0, then we expect the home zoom to be 1.
            if(expected == 0){
                expected = 1;
            }

            equal(
                viewport.getHomeZoom(),
                expected,
                "Test getHomeZoom with homeFillsViewer = true and default zoom level of " + expected
            );
            i++;
            if(i < testZoomLevels.length){
                expected = testZoomLevels[i];
                viewer.defaultZoomLevel = expected;
                viewer.open(TALL_PATH);  // use a different image for homeFillsViewer
            }
            else {
                viewer.removeHandler('open', openHandler);
                start();
            }
        };

        viewer.addHandler('open', openHandler);
        expected = testZoomLevels[i];
        viewer.homeFillsViewer = true;
        viewer.defaultZoomLevel = expected;
        viewer.open(TALL_PATH); // use a different image for homeFillsViewer
    });

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
