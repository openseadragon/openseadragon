/* global module, asyncTest, $, ok, equal, notEqual, start, test, Util, testLog, propEqual */

(function () {
    var viewer;
    var VIEWER_ID = "example";
    var PREFIX_URL = "/build/openseadragon/images";
    var SPRING_STIFFNESS = 100; // Faster animation = faster tests

     module("viewport", {
        setup: function () {
            var example = $('<div id="example"></div>').appendTo("#qunit-fixture");

            testLog.reset();

            viewer = OpenSeadragon({
                id:            VIEWER_ID,
                prefixUrl:     PREFIX_URL,
                springStiffness: SPRING_STIFFNESS
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
    var VIEWER_PADDING = new OpenSeadragon.Point(0.25, 0.25);
    var DZI_PATH = '/test/data/testpattern.dzi';
    var TALL_PATH = '/test/data/tall.dzi';

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

    // Test helper - a lot of these tests loop through a few possible
    // values for zoom levels, and reopen the viewer for each iteration.
    var reopenViewerHelper = function(config) {
        var expected, level, actual, i = 0;
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            expected = config.processExpected(level, expected);
            actual = viewport[config.method]();

            propEqual(
                actual,
                expected,
                "Test " + config.method + " with zoom level of " + level + ". Expected : " + expected + ", got " + actual
            );
            i++;
            if(i < testZoomLevels.length){
                level = expected = testZoomLevels[i];
                var viewerConfig = {
                    id:            VIEWER_ID,
                    prefixUrl:     PREFIX_URL,
                    springStiffness: SPRING_STIFFNESS
                };

                viewerConfig[config.property] = level;
                viewer = OpenSeadragon(viewerConfig);
                viewer.addHandler('open', openHandler);
                viewer.open(DZI_PATH);
            } else {
                start();
            }
        };
        viewer.addHandler('open', openHandler);
        level = expected = testZoomLevels[i];
        viewer[config.property] = level;
        viewer.open(DZI_PATH);
    };

// Tests start here.
    asyncTest('getContainerSize', function() {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);
            viewport.update(); // need to call this even with immediately=true

            propEqual(viewport.getContainerSize(), new OpenSeadragon.Point(500, 500), "Test container size");
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
            viewport.update(); // need to call this even with immediately=true

            equal(viewport.getAspectRatio(), 1, "Test aspect ratio");
            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    asyncTest('getMinZoomDefault', function() {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            equal(viewport.getMinZoom(), 0.9, "Test default min zoom level");
            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    asyncTest('getMaxZoomDefault', function() {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            equal(viewport.getMaxZoom(), 2.2, "Test default max zoom level");
            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    asyncTest('getMinZoom', function() {
        reopenViewerHelper({
            property: 'minZoomLevel',
            method: 'getMinZoom',
            processExpected: function(level, expected){
                if(level === 0) { // 0 means use the default
                    expected = 0.9;
                } else if(level > 1) {
                    expected = 1; // min zoom won't go bigger than 1.
                }
                return expected;
            }
        });
    });

    asyncTest('getMaxZoom', function() {
        reopenViewerHelper({
            property: 'maxZoomLevel',
            method: 'getMaxZoom',
            processExpected: function(level, expected) {
                if(level === 0){ // 0 means use the default
                    expected = 2.2;
                } else if(level < 1){
                    expected = 1; // max zoom won't go smaller than 1.
                }
                return expected;
            }

        });
    });

    asyncTest('getHomeBounds', function() {
        reopenViewerHelper({
            property: 'defaultZoomLevel',
            method: 'getHomeBounds',
            processExpected: function(level, expected) {
                // Have to special case this to avoid dividing by 0
                if(level === 0){
                    expected = new OpenSeadragon.Rect(0, 0, 1, 1);
                } else {
                    var sideLength = 1.0 / viewer.defaultZoomLevel;  // it's a square in this case
                    var position = 0.5 - (sideLength / 2.0);
                    expected = new OpenSeadragon.Rect(position, position, sideLength, sideLength);
                }
                return expected;
            }
        });
    });

    asyncTest('getHomeZoom', function() {
        reopenViewerHelper({
            property: 'defaultZoomLevel',
            method: 'getHomeZoom',
            processExpected: function(level, expected){
                // If the default zoom level is set to 0, then we expect the home zoom to be 1.
                if(expected === 0){
                    expected = 1;
                }
                return expected;
            }
        });
    });

    // I don't use the helper for this one because it sets a couple more
    // properties that would need a lot of special casing.
    asyncTest('getHomeZoomWithHomeFillsViewer', function() {
        var expected, level, i = 0;
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);
            viewport.update(); // need to call this even with immediately=true

            // If the default zoom level is set to 0, then we expect the home zoom to be 1.
            if(level === 0){
                expected = 1;
            }

            equal(
                viewport.getHomeZoom(),
                expected,
                "Test getHomeZoom with homeFillsViewer = true and default zoom level of " + expected
            );
            i++;
            if(i < testZoomLevels.length){
                level = expected = testZoomLevels[i];
                viewer = OpenSeadragon({
                    id:            VIEWER_ID,
                    prefixUrl:     PREFIX_URL,
                    springStiffness: SPRING_STIFFNESS,
                    defaultZoomLevel: level,
                    homeFillsViewer: true
                });
                viewer.addHandler('open', openHandler);
                viewer.open(TALL_PATH);  // use a different image for homeFillsViewer
            } else {
                start();
            }
        };
        viewer.addHandler('open', openHandler);
        level = expected = testZoomLevels[i];
        viewer.homeFillsViewer = true;
        viewer.defaultZoomLevel = expected;
        viewer.open(TALL_PATH); // use a different image for homeFillsViewer
    });

    asyncTest('deltaPixelsFromPoints', function() {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);
            viewport.update(); // need to call this even with immediately=true

            var orig, expected, actual;
            for (var i = 0; i < testPoints.length; i++){
                orig = testPoints[i].times(viewer.source.dimensions.x);
                expected = orig.times(viewport.getContainerSize().x * ZOOM_FACTOR);
                actual = viewport.deltaPixelsFromPoints(orig);
                propEqual(actual, expected, "Correctly got delta pixels from points" + orig);
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
            viewport.update(); // need to call this even with immediately=true

            var orig, expected, actual;
            for (var i = 0; i < testPoints.length; i++){
                orig = testPoints[i].times(viewport.getContainerSize().x);

                expected = orig.divide(viewport.getContainerSize().x * ZOOM_FACTOR);
                actual = viewport.deltaPointsFromPixels(orig);
                propEqual(actual, expected, "Correctly got delta points from pixels " + orig);
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
            viewport.update(); // need to call this even with immediately=true

            var orig, expected, actual;
            for (var i = 0; i < testPoints.length; i++){
                orig = testPoints[i].times(viewer.source.dimensions.x);
                expected = orig.plus(VIEWER_PADDING).times(viewport.getContainerSize().x * ZOOM_FACTOR).minus(viewport.getContainerSize());
                actual = viewport.pixelFromPoint(orig, false);
                propEqual(
                    actual,
                    expected,
                    "Correctly converted coordinates " + orig
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
            viewport.update(); // need to call this even with immediately=true

            var orig, expected, actual;
            for (var i = 0; i < testPoints.length; i++){
                orig = testPoints[i].times(viewport.getContainerSize().x);
                expected = orig.divide(viewer.source.dimensions.x).plus(VIEWER_PADDING);
                actual = viewport.pointFromPixel(orig, false);
                propEqual(
                    actual,
                    expected,
                    "Correctly converted coordinates " + orig
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
            viewport.update(); // need to call this even with immediately=true

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
            viewport.update(); // need to call this even with immediately=true

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
            viewport.update(); // need to call this even with immediately=true

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
            viewport.update(); // need to call this even with immediately=true

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
            viewport.update(); // need to call this even with immediately=true

            var orig, expected, actual;
            for (var i = 0; i < testPoints.length; i++){
                orig = testPoints[i].times(viewport.getContainerSize().x);
                expected = orig.plus(viewport.getContainerSize().divide(2));
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
            viewport.update(); // need to call this even with immediately=true

            var orig, expected, actual;
            for (var i = 0; i < testPoints.length; i++){
                orig = testPoints[i].times(viewer.source.dimensions.x);
                expected = orig.minus(viewport.getContainerSize().divide(2));
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
            viewport.update(); // need to call this even with immediately=true

            var window_boundary = Math.min(window.innerWidth, window.innerHeight);
            var orig, expected, actual, position, pos_point;
            position = viewer.element.getBoundingClientRect();
            pos_point = new OpenSeadragon.Point(position.top, position.left);
            for (var i = 0; i < testPoints.length; i++){
                orig = testPoints[i].times(window_boundary);
                expected = orig.minus(pos_point).divide(viewport.getContainerSize().x * ZOOM_FACTOR).plus(VIEWER_PADDING);
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
            viewport.update(); // need to call this even with immediately=true

            var position, orig, expected, actual, pos_point;
            position = viewer.element.getBoundingClientRect();
            pos_point = new OpenSeadragon.Point(position.top, position.left);
            for (var i = 0; i < testPoints.length; i++){
                orig = testPoints[i].times(viewer.source.dimensions.x);
                expected = orig.plus(pos_point).minus(VIEWER_PADDING.times(viewport.getContainerSize().x * ZOOM_FACTOR));
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
            viewport.update(); // need to call this even with immediately=true

            var window_boundary = Math.min(window.innerWidth, window.innerHeight);
            var orig, expected, actual, position;
            position = viewer.element.getBoundingClientRect();
            pos_point = new OpenSeadragon.Point(position.top, position.left);
            for (var i = 0; i < testPoints.length; i++){
                orig = testPoints[i].times(window_boundary);
                expected = orig.minus(pos_point).divide(viewport.getContainerSize().x * ZOOM_FACTOR).plus(VIEWER_PADDING);
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
            viewport.update(); // need to call this even with immediately=true

            var orig, expected, actual, position;
            position = viewer.element.getBoundingClientRect();
            pos_point = new OpenSeadragon.Point(position.top, position.left);
            for (var i = 0; i < testPoints.length; i++){
                orig = testPoints[i].times(viewer.source.dimensions.x);
                expected = orig.minus(VIEWER_PADDING).times(viewport.getContainerSize().x * ZOOM_FACTOR).plus(pos_point);
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
            viewport.update(); // need to call this even with immediately=true

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
            viewport.update(); // need to call this even with immediately=true

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
