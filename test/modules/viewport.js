/* global module, asyncTest, $, ok, equal, notEqual, start, test, Util, testLog, propEqual, console */

(function () {
    var viewer;
    var VIEWER_ID = "example";
    var PREFIX_URL = "/build/openseadragon/images/";
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
    var WIDE_PATH = '/test/data/wide.dzi';

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

    // Test helper - a lot of these tests loop through a test data
    // array and test different values. This helper does not reopen the viewer.
    var loopingTestHelper = function(config) {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);

            var orig, expected, actual;
            for (var i = 0; i < config.testArray.length; i++){
                orig = config.getOrig(config.testArray[i], viewport);
                expected = config.getExpected(orig, viewport);
                actual = viewport[config.method](orig);
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
    };

// Tests start here.

    asyncTest('getContainerSize', function() {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);

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
                if(level === -1 || level === 0){
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

    asyncTest('getHomeBoundsWithRotation', function() {
        function openHandler() {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.setRotation(-675);
            Util.assertRectangleEquals(
                viewport.getHomeBounds(),
                new OpenSeadragon.Rect(
                    (1 - Math.sqrt(2)) / 2,
                    (1 - Math.sqrt(2)) / 2,
                    Math.sqrt(2),
                    Math.sqrt(2)),
                0.00000001,
                "Test getHomeBounds with degrees = -675");
            start();
        }
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
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
    // properties that would need special casing.
    asyncTest('getHomeZoomWithHomeFillsViewer', function() {
        var expected, level, i = 0;
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);

            // Special cases for oddball levels
            if (level === -1) {
                expected = 0.25;
            } else if(level === 0){
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

    asyncTest('resetContentSize', function(){
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            for(var i = 0; i < testRects.length; i++){
                var rect = testRects[i].times(viewport.getContainerSize());
                viewport.resetContentSize(rect.getSize());
                propEqual(
                    viewport._contentSize,
                    rect.getSize(),
                    "Reset content size correctly."
                );
            }
            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    asyncTest('goHome', function(){
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            // zoom/pan somewhere
            viewport.zoomTo(ZOOM_FACTOR, true);

            viewport.goHome(true);
            propEqual(
                viewport.getBounds(),
                viewport.getHomeBounds(),
                 "Went home."
            );
            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    asyncTest('ensureVisible', function(){
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            // zoom/pan so that the image is out of view
            viewport.zoomTo(ZOOM_FACTOR * -50, true);
            viewport.panBy(new OpenSeadragon.Point(5000, 5000), null, true);

            viewport.ensureVisible(true);
            var bounds = viewport.getBounds();
            ok(bounds.getSize().x > 1 && bounds.getSize().y > 1, "Moved viewport so that image is visible.");
            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    asyncTest('fitBounds', function(){
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            for(var i = 0; i < testRects.length; i++){
                var rect = testRects[i].times(viewport.getContainerSize());
                viewport.fitBounds(rect, true);
                propEqual(
                    viewport.getBounds(),
                    rect,
                    "Fit bounds correctly."
                );
            }
            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    var testRectsFitBounds = [
        new OpenSeadragon.Rect(0, -0.75, 0.5, 1),
        new OpenSeadragon.Rect(0.5, 0, 0.5, 0.8),
        new OpenSeadragon.Rect(0.75, 0.75, 0.5, 0.5),
        new OpenSeadragon.Rect(-0.3, -0.3, 0.5, 0.5)
    ];

    var expectedRectsFitBounds = [
        new OpenSeadragon.Rect(-0.25, -0.5, 1, 1),
        new OpenSeadragon.Rect(0.35, 0, 0.8, 0.8),
        new OpenSeadragon.Rect(0.75, 0.75, 0.5, 0.5),
        new OpenSeadragon.Rect(-0.25, -0.25, 0.5, 0.5)
    ];

    asyncTest('fitBoundsWithConstraints', function(){
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);
            for(var i = 0; i < testRectsFitBounds.length; i++){
                var rect = testRectsFitBounds[i];

                viewport.fitBoundsWithConstraints(rect, true);
                propEqual(
                    viewport.getBounds(),
                    expectedRectsFitBounds[i],
                    "Fit bounds correctly."
                );
            }
            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    asyncTest('fitHorizontally', function(){
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.fitHorizontally(true);
            propEqual(
                viewport.getBounds(),
                new OpenSeadragon.Rect(0, 1.5, 1, 1),
                "Viewport fit a tall image horizontally."
            );
            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(TALL_PATH);
    });

    asyncTest('fitVertically', function(){
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.fitVertically(true);
            propEqual(
                viewport.getBounds(),
                new OpenSeadragon.Rect(0.375, 0, 0.25, 0.25),
                "Viewport fit a wide image vertically."
            );
            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(WIDE_PATH);
    });

    asyncTest('panBy', function(){
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            for (var i = 0; i < testPoints.length; i++){
                var expected = viewport.getCenter().plus(testPoints[i]);
                viewport.panBy(testPoints[i], true);
                propEqual(
                    viewport.getCenter(),
                    expected,
                    "Panned by the correct amount."
                );
            }

            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    asyncTest('panTo', function(){
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            for (var i = 0; i < testPoints.length; i++){
                viewport.panTo(testPoints[i], true);
                propEqual(
                    viewport.getCenter(),
                    testPoints[i],
                    "Panned to the correct location."
                );
            }

            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    asyncTest('zoomBy', function(){
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            for (var i = 0; i < testZoomLevels.length; i++){
                viewport.zoomBy(testZoomLevels[i], null, true);
                propEqual(
                    viewport.getZoom(),
                    testZoomLevels[i],
                    "Zoomed by the correct amount."
                );

                // now use a ref point
                // TODO: check the ending position due to ref point
                viewport.zoomBy(testZoomLevels[i], testPoints[i], true);
                propEqual(
                    viewport.getZoom(),
                    testZoomLevels[i],
                    "Zoomed by the correct amount."
                );
            }

            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    asyncTest('zoomTo', function(){
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            for (var i = 0; i < testZoomLevels.length; i++){
                viewport.zoomTo(testZoomLevels[i], null, true);
                propEqual(
                    viewport.getZoom(),
                    testZoomLevels[i],
                    "Zoomed to the correct level."
                );

                // now use a ref point
                // TODO: check the ending position due to ref point
                viewport.zoomTo(testZoomLevels[i], testPoints[i], true);
                propEqual(
                    viewport.getZoom(),
                    testZoomLevels[i],
                    "Zoomed to the correct level."
                );
            }

            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    asyncTest('rotation', function(){
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            propEqual(viewport.getRotation, 0, "Original rotation should be 0 degrees");
            viewport.setRotation(90);
            propEqual(viewport.getRotation, 90, "Rotation should be 90 degrees");
            viewport.setRotation(-75);
            propEqual(viewport.getRotation, -75, "Rotation should be -75 degrees");
            start();
        };

        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    asyncTest('resize', function() {
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            for(var i = 0; i < testPoints.length; i++){
                var new_size = testPoints[i].times(viewer.source.dimensions.x);
                viewport.resize(new_size);
                propEqual(viewport.getContainerSize(), new_size, "Viewport resized successfully.");
            }
            start();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    asyncTest('deltaPixelsFromPoints', function() {
         loopingTestHelper({
            testArray: testPoints,
            getOrig: function(el, viewport){
                return el.times(viewer.source.dimensions.x);
            },
            getExpected: function(orig, viewport){
                return orig.times(viewport.getContainerSize().x * ZOOM_FACTOR);
            },
            method: 'deltaPixelsFromPoints'
        });
    });

    asyncTest('deltaPointsFromPixels', function() {
        loopingTestHelper({
            testArray: testPoints,
            getOrig: function(el, viewport) {
                return el.times(viewport.getContainerSize().x);
            },
            getExpected: function(orig, viewport) {
                return orig.divide(viewport.getContainerSize().x * ZOOM_FACTOR);
            },
            method: 'deltaPointsFromPixels'
        });
    });

    asyncTest('pixelFromPoint', function() {
        loopingTestHelper({
            testArray: testPoints,
            getOrig: function(el, viewport) {
                return el.times(viewer.source.dimensions.x);
            },
            getExpected: function(orig, viewport) {
                return orig.plus(VIEWER_PADDING).times(viewport.getContainerSize().x * ZOOM_FACTOR).minus(viewport.getContainerSize());
            },
            method: 'pixelFromPoint'
        });
    });

    asyncTest('pointFromPixel', function() {
        loopingTestHelper({
            testArray: testPoints,
            getOrig: function(el, viewport) {
                return el.times(viewport.getContainerSize().x);
            },
            getExpected: function(orig, viewport) {
                return orig.divide(viewer.source.dimensions.x).plus(VIEWER_PADDING);
            },
            method: 'pointFromPixel'
        });
    });

    asyncTest('viewportToImageCoordinates', function() {
        loopingTestHelper({
            testArray: testPoints,
            getOrig: function(el, viewport) {
                return el.times(viewport.getContainerSize().x);
            },
            getExpected: function(orig, viewport) {
                return orig.divide(viewer.source.dimensions.x);
            },
            method: 'imageToViewportCoordinates'
        });
    });

    asyncTest('imageToViewportCoordinates', function() {
        loopingTestHelper({
            testArray: testPoints,
            getOrig: function(el, viewport) {
                return el.times(viewer.source.dimensions.x);
            },
            getExpected: function(orig, viewport) {
                return orig.divide(ZOOM_FACTOR * viewport.getContainerSize().x);
            },
            method: 'imageToViewportCoordinates'
        });
    });
    asyncTest('imageToViewportRectangle', function() {
        loopingTestHelper({
            testArray: testRects,
            getOrig: function(el, viewport) {
                return el.times(viewer.source.dimensions.x);
            },
            getExpected: function(orig, viewport) {
                return new OpenSeadragon.Rect(
                    orig.x / viewer.source.dimensions.x,
                    orig.y / viewer.source.dimensions.x,
                    orig.width / viewer.source.dimensions.x,
                    orig.height / viewer.source.dimensions.x
                );
            },
            method: 'imageToViewportRectangle'
        });
    });

    asyncTest('viewportToImageRectangle', function() {
        loopingTestHelper({
            testArray: testRects,
            getOrig: function(el, viewport) {
                return el.times(viewport.getContainerSize().x);
            },
            getExpected: function(orig, viewport) {
                return new OpenSeadragon.Rect(
                    orig.x * viewer.source.dimensions.x,
                    orig.y * viewer.source.dimensions.x,
                    orig.width * viewer.source.dimensions.x,
                    orig.height * viewer.source.dimensions.x
                );
            },
            method: 'viewportToImageRectangle'
        });
    });

    asyncTest('viewerElementToImageCoordinates', function() {
        loopingTestHelper({
            testArray: testPoints,
            getOrig: function(el, viewport) {
                return el.times(viewport.getContainerSize().x);
            },
            getExpected: function(orig, viewport) {
                return orig.plus(viewport.getContainerSize().divide(2));
            },
            method: 'viewerElementToImageCoordinates'
        });
    });

    asyncTest('imageToViewerElementCoordinates', function() {
        loopingTestHelper({
            testArray: testPoints,
            getOrig: function(el, viewport) {
                return el.times(viewer.source.dimensions.x);
            },
            getExpected: function(orig, viewport) {
                return orig.minus(viewport.getContainerSize().divide(2));
            },
            method: 'imageToViewerElementCoordinates'
        });
    });

   asyncTest('windowToImageCoordinates', function() {
        loopingTestHelper({
            testArray: testPoints,
            getOrig: function(el, viewport) {
                var window_boundary = Math.min(window.innerWidth, window.innerHeight);
                return el.times(window_boundary);
            },
            getExpected: function(orig, viewport) {
                var pos_point = OpenSeadragon.getElementOffset(viewer.element);
                return orig.minus(pos_point).divide(viewport.getContainerSize().x * ZOOM_FACTOR).plus(VIEWER_PADDING);
            },
            method: 'windowToViewportCoordinates'
        });
    });

    asyncTest('imageToWindowCoordinates', function() {
        loopingTestHelper({
            testArray: testPoints,
            getOrig: function(el, viewport) {
                return el.times(viewer.source.dimensions.x);
            },
            getExpected: function(orig, viewport) {
                var pos_point = OpenSeadragon.getElementOffset(viewer.element);
                return orig.plus(pos_point).minus(VIEWER_PADDING.times(viewport.getContainerSize().x * ZOOM_FACTOR));
            },
            method: 'imageToWindowCoordinates'
        });
    });

    asyncTest('windowToViewportCoordinates', function() {
        loopingTestHelper({
            testArray: testPoints,
            getOrig: function(el, viewport) {
                var window_boundary = Math.min(window.innerWidth, window.innerHeight);
                return el.times(window_boundary);
            },
            getExpected: function(orig, viewport) {
                var pos_point = OpenSeadragon.getElementOffset(viewer.element);
                return orig.minus(pos_point).divide(viewport.getContainerSize().x * ZOOM_FACTOR).plus(VIEWER_PADDING);
            },
            method: 'windowToViewportCoordinates'
        });
    });

    asyncTest('viewportToWindowCoordinates', function() {
        loopingTestHelper({
            testArray: testPoints,
            getOrig: function(el, viewport) {
                return el.times(viewer.source.dimensions.x);
            },
            getExpected: function(orig, viewport) {
                var pos_point = OpenSeadragon.getElementOffset(viewer.element);
                return orig.minus(VIEWER_PADDING).times(viewport.getContainerSize().x * ZOOM_FACTOR).plus(pos_point);
            },
            method: 'viewportToWindowCoordinates'
        });
    });

    asyncTest('viewportToImageZoom', function() {
        loopingTestHelper({
            testArray: testPoints,
            getOrig: function(el, viewport) {
                return el;
            },
            getExpected: function(orig, viewport) {
                return orig / ZOOM_FACTOR;
            },
            method: 'viewportToImageZoom'
        });
    });

    asyncTest('imageToViewportZoom', function() {
        loopingTestHelper({
            testArray: testPoints,
            getOrig: function(el, viewport) {
                return el;
            },
            getExpected: function(orig, viewport) {
                return orig * ZOOM_FACTOR;
            },
            method: 'imageToViewportZoom'
        });
    });

})();
