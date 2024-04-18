/* eslint-disable new-cap */
/* global QUnit, $, Util, testLog */

(function () {
    var viewer;
    var VIEWER_ID = "example";
    var PREFIX_URL = "/build/openseadragon/images/";
    var SPRING_STIFFNESS = 100; // Faster animation = faster tests
    var EPSILON = 0.0000000001;

     QUnit.module("viewport", {
        beforeEach: function () {
            $('<div id="example"></div>').appendTo("#qunit-fixture");

            testLog.reset();

            viewer = OpenSeadragon({
                id:            VIEWER_ID,
                prefixUrl:     PREFIX_URL,
                springStiffness: SPRING_STIFFNESS
            });
        },
        afterEach: function () {
            if (viewer){
                viewer.destroy();
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

    var testZoomLevels = [0.1, 0.2, 0.5, 1, 4, 10];

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
    var reopenViewerHelper = function(assert, config) {
        var done = assert.async();
        var expected, level, actual;
        var i = 0;
        var openHandler = function(event) {
            var viewport = viewer.viewport;
            expected = config.processExpected(level, expected);
            actual = viewport[config.method]();

            assert.propEqual(
                actual,
                expected,
                "Test " + config.method + " with zoom level of " + level + ". Expected : " + expected + ", got " + actual
            );
            i++;
            if (i < testZoomLevels.length) {
                level = expected = testZoomLevels[i];
                var viewerConfig = {
                    id:            VIEWER_ID,
                    prefixUrl:     PREFIX_URL,
                    springStiffness: SPRING_STIFFNESS
                };

                if (viewer){
                    viewer.destroy();
                }
                viewerConfig[config.property] = level;
                viewer = OpenSeadragon(viewerConfig);
                viewer.addOnceHandler('open', openHandler);
                viewer.open(DZI_PATH);
            } else {
                done();
            }
        };
        level = expected = testZoomLevels[i];
        var viewerConfig = {
            id: VIEWER_ID,
            prefixUrl: PREFIX_URL,
            springStiffness: SPRING_STIFFNESS
        };

        viewerConfig[config.property] = level;

        if (viewer){
            viewer.destroy();
        }
        viewer = OpenSeadragon(viewerConfig);
        viewer.addOnceHandler('open', openHandler);
        viewer.open(DZI_PATH);
    };

    // Test helper - a lot of these tests loop through a test data
    // array and test different values. This helper does not reopen the viewer.
    var loopingTestHelper = function(assert, config) {
        var done = assert.async();
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);

            var orig, expected, actual;
            for (var i = 0; i < config.testArray.length; i++){
                orig = config.getOrig(config.testArray[i], viewport);
                expected = config.getExpected(orig, viewport);
                actual = viewport[config.method](orig);
                if(config.assert) {
                    config.assert(
                        assert,
                        actual,
                        expected,
                        1e-15,
                        "Correctly converted coordinates " + orig
                    );
                } else {
                    assert.propEqual(
                        actual,
                        expected,
                        "Correctly converted coordinates " + orig
                    );
                }

            }

            done();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    };

    function assertPointsEquals(assert, actual, expected, variance, message) {
        Util.assertPointsEquals(assert, actual, expected, variance, message);
    }

// Tests start here.

    QUnit.test('getContainerSize', function(assert) {
        var done = assert.async();
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);

            assert.propEqual(viewport.getContainerSize(), new OpenSeadragon.Point(500, 500), "Test container size");
            done();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    QUnit.test('getAspectRatio', function(assert) {
        var done = assert.async();
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);

            assert.equal(viewport.getAspectRatio(), 1, "Test aspect ratio");
            done();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    QUnit.test('getMinZoomDefault', function(assert) {
        var done = assert.async();
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            assert.equal(viewport.getMinZoom(), 0.9, "Test default min zoom level");
            done();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    QUnit.test('getMaxZoomDefault', function(assert) {
    var done = assert.async();
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            assert.equal(viewport.getMaxZoom(), 2.2, "Test default max zoom level");
            done();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    QUnit.test('getMinZoom', function(assert) {
        reopenViewerHelper(assert, {
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

    QUnit.test('getMaxZoom', function(assert) {
        reopenViewerHelper(assert, {
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

    QUnit.test('getHomeBounds', function(assert) {
        reopenViewerHelper(assert, {
            property: 'defaultZoomLevel',
            method: 'getHomeBounds',
            processExpected: function(level, expected) {
                var sideLength = 1.0 / viewer.defaultZoomLevel;  // it's a square in this case
                var position = 0.5 - (sideLength / 2.0);
                return new OpenSeadragon.Rect(position, position, sideLength, sideLength);
            }
        });
    });

    QUnit.test('getHomeBoundsNoRotate with rotation', function(assert) {
        var done = assert.async();
        function openHandler() {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.setRotation(-675, true);
            Util.assertRectangleEquals(
                assert,
                viewport.getHomeBoundsNoRotate(),
                new OpenSeadragon.Rect(
                    (1 - Math.sqrt(2)) / 2,
                    (1 - Math.sqrt(2)) / 2,
                    Math.sqrt(2),
                    Math.sqrt(2)),
                0.00000001,
                "Test getHomeBoundsNoRotate with degrees = -675");
            done();
        }
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    QUnit.test('getHomeBounds with rotation', function(assert) {
        var done = assert.async();
        function openHandler() {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.setRotation(-675, true);
            Util.assertRectangleEquals(
                assert,
                viewport.getHomeBounds(),
                new OpenSeadragon.Rect(
                    0.5,
                    -0.5,
                    Math.sqrt(2),
                    Math.sqrt(2),
                    45),
                0.00000001,
                "Test getHomeBounds with degrees = -675");
            done();
        }
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    QUnit.test('getHomeBoundsWithMultiImages', function(assert) {
        var done = assert.async();
        function openHandler() {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            Util.assertRectangleEquals(
                assert,
                new OpenSeadragon.Rect(0, 0, 4, 4),
                viewport.getHomeBounds(),
                0.00000001,
                "Test getHomeBoundsWithMultiImages");
            done();
        }
        viewer.addHandler('open', openHandler);
        viewer.open([{
                tileSource: DZI_PATH,
                x: 0,
                y: 0,
                width: 2
        }, {
                tileSource: DZI_PATH,
                x: 3,
                y: 3,
                width: 1
        }]);
    });

    QUnit.test('getHomeBoundsWithMultiImagesAndClipping', function(assert) {
        var done = assert.async();
        function openHandler() {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            Util.assertRectangleEquals(
                assert,
                new OpenSeadragon.Rect(1, 1, 4, 4),
                viewport.getHomeBounds(),
                0.00000001,
                "Test getHomeBoundsWithMultiImagesAndClipping");
            done();
        }
        viewer.addHandler('open', openHandler);
        viewer.open([{
                tileSource: DZI_PATH,
                x: 0,
                y: 0,
                width: 2,
                clip: new OpenSeadragon.Rect(500, 500, 500, 500)
        }, {
                tileSource: DZI_PATH,
                x: 4,
                y: 4,
                width: 1
        }]);
    });

    QUnit.test('getHomeZoom', function(assert) {
        reopenViewerHelper(assert, {
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
    QUnit.test('getHomeZoomWithHomeFillsViewer', function(assert) {
        var done = assert.async();
        var i = 0;
        var openHandler = function(event) {
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);

            assert.equal(
                viewport.getHomeZoom(),
                testZoomLevels[i],
                "Test getHomeZoom with homeFillsViewer = true and default zoom level of " + testZoomLevels[i]
            );
            i++;
            if (i < testZoomLevels.length) {
                if (viewer){
                    viewer.destroy();
                }
                viewer = OpenSeadragon({
                    id: VIEWER_ID,
                    prefixUrl: PREFIX_URL,
                    springStiffness: SPRING_STIFFNESS,
                    defaultZoomLevel: testZoomLevels[i],
                    homeFillsViewer: true
                });
                viewer.addOnceHandler('open', openHandler);
                viewer.open(TALL_PATH);  // use a different image for homeFillsViewer
            } else {
                done();
            }
        };
        if (viewer){
            viewer.destroy();
        }
        viewer = OpenSeadragon({
            id: VIEWER_ID,
            prefixUrl: PREFIX_URL,
            springStiffness: SPRING_STIFFNESS,
            defaultZoomLevel: testZoomLevels[i],
            homeFillsViewer: true
        });
        viewer.addOnceHandler('open', openHandler);
        viewer.open(TALL_PATH); // use a different image for homeFillsViewer
    });

    QUnit.test('resetContentSize', function(assert) {
        var done = assert.async();
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            for(var i = 0; i < testRects.length; i++){
                var rect = testRects[i].times(viewport.getContainerSize());
                viewport.resetContentSize(rect.getSize());
                assert.propEqual(
                    viewport._contentSize,
                    rect.getSize(),
                    "Reset content size correctly."
                );
            }
            done();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    QUnit.test('goHome', function(assert) {
        var done = assert.async();
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            // zoom/pan somewhere
            viewport.zoomTo(ZOOM_FACTOR, true);

            viewport.goHome(true);
            assert.propEqual(
                viewport.getBounds(),
                viewport.getHomeBounds(),
                 "Went home."
            );
            done();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    QUnit.test('ensureVisible', function(assert) {
        var done = assert.async();
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            // zoom/pan so that the image is out of view
            viewport.zoomTo(ZOOM_FACTOR * -50, true);
            viewport.panBy(new OpenSeadragon.Point(5000, 5000), null, true);

            viewport.ensureVisible(true);
            var bounds = viewport.getBounds();
            assert.ok(bounds.getSize().x > 1 && bounds.getSize().y > 1, "Moved viewport so that image is visible.");
            done();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    QUnit.test('applyConstraints', function(assert) {
        var done = assert.async();
        var openHandler = function() {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            viewport.fitBounds(new OpenSeadragon.Rect(1, 1, 1, 1), true);
            viewport.visibilityRatio = 0.3;
            viewport.applyConstraints(true);
            var bounds = viewport.getBounds();
            Util.assertRectangleEquals(
                assert,
                new OpenSeadragon.Rect(0.7, 0.7, 1, 1),
                bounds,
                EPSILON,
                "Viewport.applyConstraints should move viewport.");

            done();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    QUnit.test('applyConstraints flipped', function(assert) {
        var done = assert.async();
        var openHandler = function() {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            viewport.setFlip(true);

            viewport.fitBounds(new OpenSeadragon.Rect(1, 1, 1, 1), true);
            viewport.visibilityRatio = 0.3;
            viewport.applyConstraints(true);
            var bounds = viewport.getBounds();
            Util.assertRectangleEquals(
                assert,
                new OpenSeadragon.Rect(0.7, 0.7, 1, 1),
                bounds,
                EPSILON,
                "Viewport.applyConstraints should move flipped viewport.");

            done();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    QUnit.test('applyConstraints with visibilityRatio = 1 shouldn\'t bounce around', function(assert) {
        var done = assert.async();
        var openHandler = function() {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            viewport.visibilityRatio = 1;
            viewport.zoomTo(0.5, undefined, true);
            viewport.panBy(new OpenSeadragon.Point(0.75, 0), true);
            viewport.applyConstraints(true);
            var bounds = viewport.getBounds();
            Util.assertRectangleEquals(
                assert,
                new OpenSeadragon.Rect(0, 1, 2, 2),
                bounds,
                EPSILON,
                "Viewport.applyConstraints should move viewport to the center, not to a side.");
            done();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(TALL_PATH);
    });

    QUnit.test('applyConstraints with rotation', function(assert) {
        var done = assert.async();
        var openHandler = function() {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.setRotation(45, true);
            viewport.fitBounds(new OpenSeadragon.Rect(1, 1, 1, 1), true);
            viewport.applyConstraints(true);
            var bounds = viewport.getBounds();
            Util.assertRectangleEquals(
                assert,
                new OpenSeadragon.Rect(1.0, 0.0, Math.sqrt(2), Math.sqrt(2), 45),
                bounds,
                EPSILON,
                "Viewport.applyConstraints with rotation should move viewport.");

            done();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    QUnit.test('applyConstraints flipped with rotation', function(assert) {
        var done = assert.async();
        var openHandler = function() {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            viewport.setFlip(true);
            viewport.setRotation(45, true);

            viewport.fitBounds(new OpenSeadragon.Rect(1, 1, 1, 1), true);
            viewport.applyConstraints(true);
            var bounds = viewport.getBounds();
            Util.assertRectangleEquals(
                assert,
                new OpenSeadragon.Rect(1.0, 0.0, Math.sqrt(2), Math.sqrt(2), 45),
                bounds,
                EPSILON,
                "Viewport.applyConstraints flipped and with rotation should move viewport.");

            done();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    // Fit bounds tests
    var testRectsFitBounds = [
        new OpenSeadragon.Rect(0, -0.75, 0.5, 1),
        new OpenSeadragon.Rect(0.5, 0, 0.5, 0.8),
        new OpenSeadragon.Rect(0.75, 0.75, 0.5, 0.5),
        new OpenSeadragon.Rect(-0.3, -0.3, 0.5, 0.5),
        new OpenSeadragon.Rect(0.5, 0.25, Math.sqrt(0.125), Math.sqrt(0.125), 45)
    ];

    var expectedRectsFitBounds = [
        new OpenSeadragon.Rect(-0.25, -0.75, 1, 1),
        new OpenSeadragon.Rect(0.35, 0, 0.8, 0.8),
        new OpenSeadragon.Rect(0.75, 0.75, 0.5, 0.5),
        new OpenSeadragon.Rect(-0.3, -0.3, 0.5, 0.5),
        new OpenSeadragon.Rect(0.25, 0.25, 0.5, 0.5)
    ];

    var expectedRectsFitBoundsWithRotation = [
        new OpenSeadragon.Rect(
            0.25,
            -1,
            Math.sqrt(0.125) + Math.sqrt(0.5),
            Math.sqrt(0.125) + Math.sqrt(0.5),
            45),
        new OpenSeadragon.Rect(
            0.75,
            -0.25,
            Math.sqrt(0.125) + Math.sqrt(8 / 25),
            Math.sqrt(0.125) + Math.sqrt(8 / 25),
            45),
        new OpenSeadragon.Rect(
            1,
            0.5,
            Math.sqrt(0.125) * 2,
            Math.sqrt(0.125) * 2,
            45),
        new OpenSeadragon.Rect(
            -0.05,
            -0.55,
            Math.sqrt(0.125) * 2,
            Math.sqrt(0.125) * 2,
            45),
        new OpenSeadragon.Rect(
            0.5,
            0.25,
            Math.sqrt(0.125),
            Math.sqrt(0.125),
            45)
    ];

    var expectedRectsFitBoundsWithConstraints = [
        new OpenSeadragon.Rect(-0.25, -0.5, 1, 1),
        new OpenSeadragon.Rect(0.35, 0, 0.8, 0.8),
        new OpenSeadragon.Rect(0.75, 0.75, 0.5, 0.5),
        new OpenSeadragon.Rect(-0.25, -0.25, 0.5, 0.5),
        new OpenSeadragon.Rect(0.25, 0.25, 0.5, 0.5)
    ];

    QUnit.test('fitBounds', function(assert) {
        var done = assert.async();
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            for(var i = 0; i < testRectsFitBounds.length; i++){
                var rect = testRectsFitBounds[i];
                viewport.fitBounds(rect, true);
                assert.propEqual(
                    viewport.getBounds(),
                    expectedRectsFitBounds[i],
                    "Fit bounds correctly."
                );
            }
            done();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    QUnit.test('fitBounds with viewport rotation', function(assert) {
        var done = assert.async();
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.setRotation(45, true);

            for(var i = 0; i < testRectsFitBounds.length; i++){
                var rect = testRectsFitBounds[i];
                viewport.fitBounds(rect, true);
                Util.assertRectangleEquals(
                    assert,
                    viewport.getBounds(),
                    expectedRectsFitBoundsWithRotation[i],
                    EPSILON,
                    "Fit bounds correctly."
                );
            }
            done();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    QUnit.test('fitBoundsWithConstraints', function(assert) {
        var done = assert.async();
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.zoomTo(ZOOM_FACTOR, null, true);
            for(var i = 0; i < testRectsFitBounds.length; i++){
                var rect = testRectsFitBounds[i];

                viewport.fitBoundsWithConstraints(rect, true);
                assert.propEqual(
                    viewport.getBounds(),
                    expectedRectsFitBoundsWithConstraints[i],
                    "Fit bounds correctly."
                );
            }
            done();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    QUnit.test('fitBounds with almost same zoom', function(assert) {
        var done = assert.async();
        var openHandler = function() {
            var viewport = viewer.viewport;
            var rect1 = new OpenSeadragon.Rect(0, 0, 1, 1);
            viewport.fitBounds(rect1, true);
            Util.assertRectangleEquals(assert, rect1, viewport.getBounds(), 1e-6,
                'Bounds should be ' + rect1);

            // Zoom and pan
            var rect2 = new OpenSeadragon.Rect(1, 1, 1 + 1e-8, 1 + 1e-8);
            viewport.fitBounds(rect2);
            Util.assertRectangleEquals(assert, rect2, viewport.getBounds(), 1e-6,
                'Bounds should be ' + rect2);
            done();
        };
        viewer.addOnceHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    QUnit.test('fitBounds with big rectangle', function(assert) {
        var done = assert.async();
        var openHandler = function() {
            var viewport = viewer.viewport;
            var rect1 = new OpenSeadragon.Rect(0, 0, 1e9, 1e9);
            viewport.fitBounds(rect1, true);
            Util.assertRectangleEquals(assert, rect1, viewport.getBounds(), 1e-6,
                'Bounds should be ' + rect1);

            // Zoom and pan
            var rect2 = new OpenSeadragon.Rect(1, 1, 2e9, 2e9);
            viewport.fitBounds(rect2);
            Util.assertRectangleEquals(assert, rect2, viewport.getBounds(), 1e-6,
                'Bounds should be ' + rect2);
            done();
        };
        viewer.addOnceHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    QUnit.test('fitHorizontally', function(assert) {
        var done = assert.async();
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.fitHorizontally(true);
            assert.propEqual(
                viewport.getBounds(),
                new OpenSeadragon.Rect(0, 1.5, 1, 1),
                "Viewport fit a tall image horizontally."
            );
            done();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(TALL_PATH);
    });

    QUnit.test('fitVertically', function(assert) {
        var done = assert.async();
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;
            viewport.fitVertically(true);
            assert.propEqual(
                viewport.getBounds(),
                new OpenSeadragon.Rect(0.375, 0, 0.25, 0.25),
                "Viewport fit a wide image vertically."
            );
            done();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(WIDE_PATH);
    });
    // End fitBounds tests.

    QUnit.test('panBy', function(assert) {
        var done = assert.async();
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            for (var i = 0; i < testPoints.length; i++){
                var expected = viewport.getCenter().plus(testPoints[i]);
                viewport.panBy(testPoints[i], true);
                assert.propEqual(
                    viewport.getCenter(),
                    expected,
                    "Panned by the correct amount."
                );
            }

            done();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    QUnit.test('panBy flipped', function(assert) {
        var done = assert.async();
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            viewport.setFlip(true);

            for (var i = 0; i < testPoints.length; i++){
                var expected = viewport.getCenter().plus(testPoints[i]);
                viewport.panBy(testPoints[i], true);
                assert.propEqual(
                    viewport.getCenter(),
                    expected,
                    "Panned flipped by the correct amount."
                );
            }

            done();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    QUnit.test('panTo', function(assert) {
        var done = assert.async();
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            for (var i = 0; i < testPoints.length; i++){
                viewport.panTo(testPoints[i], true);
                assert.propEqual(
                    viewport.getCenter(),
                    testPoints[i],
                    "Panned to the correct location."
                );
            }

            done();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    QUnit.test('panTo flipped', function(assert) {
        var done = assert.async();
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            viewport.setFlip(true);

            for (var i = 0; i < testPoints.length; i++){
                viewport.panTo(testPoints[i], true);
                assert.propEqual(
                    viewport.getCenter(),
                    testPoints[i],
                    "Panned flipped to the correct location."
                );
            }

            done();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    QUnit.test('zoomBy no ref point', function(assert) {
        var done = assert.async();
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            for (var i = 0; i < testZoomLevels.length; i++) {
                viewport.zoomBy(testZoomLevels[i], null, true);
                assert.propEqual(
                    viewport.getZoom(),
                    testZoomLevels[i],
                    "Zoomed by the correct amount."
                );
            }

            done();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    QUnit.test('zoomBy with ref point', function(assert) {
        var done = assert.async();
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            var expectedCenters = [
                new OpenSeadragon.Point(5, 5),
                new OpenSeadragon.Point(6.996, 6.996),
                new OpenSeadragon.Point(7.246, 6.996),
                new OpenSeadragon.Point(7.246, 6.996),
                new OpenSeadragon.Point(7.621, 7.371),
                new OpenSeadragon.Point(7.621, 7.371),
            ];

            for (var i = 0; i < testZoomLevels.length; i++) {
                viewport.zoomBy(testZoomLevels[i], testPoints[i], true);
                assert.propEqual(
                    viewport.getZoom(),
                    testZoomLevels[i],
                    "Zoomed by the correct amount."
                );
                assertPointsEquals(
                    assert,
                    viewport.getCenter(),
                    expectedCenters[i],
                    1e-14,
                    "Panned to the correct location."
                );
            }

            done();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    QUnit.test('zoomBy flipped with ref point', function(assert) {
        var done = assert.async();
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            viewport.setFlip(true);

            var expectedFlippedCenters = [
                new OpenSeadragon.Point(5, 5),
                new OpenSeadragon.Point(6.996, 6.996),
                new OpenSeadragon.Point(7.246, 6.996),
                new OpenSeadragon.Point(7.246, 6.996),
                new OpenSeadragon.Point(7.621, 7.371),
                new OpenSeadragon.Point(7.621, 7.371),
            ];

            for (var i = 0; i < testZoomLevels.length; i++) {
                viewport.zoomBy(testZoomLevels[i], testPoints[i], true);
                assert.propEqual(
                    testZoomLevels[i],
                    viewport.getZoom(),
                    "Zoomed flipped by the correct amount."
                );
                assertPointsEquals(
                    assert,
                    expectedFlippedCenters[i],
                    viewport.getCenter(),
                    1e-6,
                    "Panned flipped to the correct location."
                );
            }

            done();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    QUnit.test('zoomTo no ref point', function(assert) {
        var done = assert.async();
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            for (var i = 0; i < testZoomLevels.length; i++) {
                viewport.zoomTo(testZoomLevels[i], null, true);
                assert.propEqual(
                    viewport.getZoom(),
                    testZoomLevels[i],
                    "Zoomed to the correct level."
                );
            }

            done();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    QUnit.test('zoomTo with ref point', function(assert) {
        var done = assert.async();
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            var expectedCenters = [
                new OpenSeadragon.Point(5, 5),
                new OpenSeadragon.Point(4.7505, 4.7505),
                new OpenSeadragon.Point(4.6005, 4.7505),
                new OpenSeadragon.Point(4.8455, 4.9955),
                new OpenSeadragon.Point(5.2205, 5.3705),
                new OpenSeadragon.Point(5.2205, 5.3705),
            ];

            for (var i = 0; i < testZoomLevels.length; i++) {
                viewport.zoomTo(testZoomLevels[i], testPoints[i], true);
                assert.propEqual(
                    viewport.getZoom(),
                    testZoomLevels[i],
                    "Zoomed to the correct level."
                );
                assertPointsEquals(
                    assert,
                    expectedCenters[i],
                    viewport.getCenter(),
                    1e-14,
                    "Panned to the correct location."
                );
            }

            done();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    QUnit.test('zoomTo flipped with ref point', function(assert) {
        var done = assert.async();
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            viewport.setFlip(true);

            var expectedFlippedCenters = [
                new OpenSeadragon.Point(5, 5),
                new OpenSeadragon.Point(4.7505, 4.7505),
                new OpenSeadragon.Point(4.6005, 4.7505),
                new OpenSeadragon.Point(4.8455, 4.9955),
                new OpenSeadragon.Point(5.2205, 5.3705),
                new OpenSeadragon.Point(5.2205, 5.3705),
            ];

            for (var i = 0; i < testZoomLevels.length; i++) {
                viewport.zoomTo(testZoomLevels[i], testPoints[i], true);
                assert.propEqual(
                    viewport.getZoom(),
                    testZoomLevels[i],
                    "Zoomed flipped to the correct level."
                );
                assertPointsEquals(
                    assert,
                    expectedFlippedCenters[i],
                    viewport.getCenter(),
                    1e-14,
                    "Panned flipped to the correct location."
                );
            }

            done();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    QUnit.test('rotation', function(assert){
        var done = assert.async();
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            assert.propEqual(viewport.getRotation, 0, "Original rotation should be 0 degrees");
            viewport.setRotation(90, true);
            assert.propEqual(viewport.getRotation, 90, "Rotation should be 90 degrees");
            viewport.setRotation(-75, true);
            assert.propEqual(viewport.getRotation, -75, "Rotation should be -75 degrees");

            viewport.setRotation(0, true);
            assert.strictEqual(viewport.getRotation(true), 0, 'viewport has default current rotation');
            assert.strictEqual(viewport.getRotation(false), 0, 'viewport has default target rotation');

            viewport.setRotation(33);
            assert.strictEqual(viewport.getRotation(true), 0, 'current rotation is not changed');
            assert.strictEqual(viewport.getRotation(false), 33, 'target rotation is set correctly');

            viewport.setRotation(200, true);
            assert.strictEqual(viewport.getRotation(true), 200, 'current rotation is set correctly');
            assert.strictEqual(viewport.getRotation(false), 200, 'target rotation is set correctly');

            done();
        };

        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    QUnit.test('rotation (flipped)', function(assert){
        var done = assert.async();
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            viewport.setFlip(true);

            assert.propEqual(viewport.getRotation, 0, "Original flipped rotation should be 0 degrees");
            viewport.setRotation(90, true);
            assert.propEqual(viewport.getRotation, 90, "Flipped rotation should be 90 degrees");
            viewport.setRotation(-75, true);
            assert.propEqual(viewport.getRotation, -75, "Flipped rotation should be -75 degrees");

            done();
        };

        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    QUnit.test('resize', function(assert) {
        var done = assert.async();
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            var viewport = viewer.viewport;

            for(var i = 0; i < testPoints.length; i++){
                var newSize = testPoints[i].times(viewer.source.dimensions.x);
                viewport.resize(newSize);
                assert.propEqual(viewport.getContainerSize(), newSize, "Viewport resized successfully.");
            }
            done();
        };
        viewer.addHandler('open', openHandler);
        viewer.open(DZI_PATH);
    });

    QUnit.test('deltaPixelsFromPoints', function(assert) {
         loopingTestHelper(assert, {
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

    QUnit.test('deltaPointsFromPixels', function(assert) {
        loopingTestHelper(assert, {
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

    QUnit.test('pixelFromPoint', function(assert) {
        loopingTestHelper(assert, {
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

    QUnit.test('pointFromPixel', function(assert) {
        loopingTestHelper(assert, {
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

    QUnit.test('viewportToImageCoordinates', function(assert) {
        loopingTestHelper(assert, {
            testArray: testPoints,
            getOrig: function(el, viewport) {
                return el.times(viewport.getContainerSize().x);
            },
            getExpected: function(orig, viewport) {
                return orig.divide(viewer.source.dimensions.x);
            },
            method: 'imageToViewportCoordinates',
            assert: assertPointsEquals
        });
    });

    QUnit.test('imageToViewportCoordinates', function(assert) {
        loopingTestHelper(assert, {
            testArray: testPoints,
            getOrig: function(el, viewport) {
                return el.times(viewer.source.dimensions.x);
            },
            getExpected: function(orig, viewport) {
                return orig.divide(ZOOM_FACTOR * viewport.getContainerSize().x);
            },
            method: 'imageToViewportCoordinates',
            assert: assertPointsEquals
        });
    });
    QUnit.test('imageToViewportRectangle', function(assert) {
        loopingTestHelper(assert, {
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
            method: 'imageToViewportRectangle',
            assert: assertPointsEquals
        });
    });

    QUnit.test('viewportToImageRectangle', function(assert) {
        loopingTestHelper(assert, {
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

    QUnit.test('viewerElementToImageCoordinates', function(assert) {
        loopingTestHelper(assert, {
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

    QUnit.test('imageToViewerElementCoordinates', function(assert) {
        loopingTestHelper(assert, {
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

    QUnit.test('windowToImageCoordinates', function(assert) {
        loopingTestHelper(assert, {
            testArray: testPoints,
            getOrig: function(el, viewport) {
                var windowBoundary = Math.min(window.innerWidth, window.innerHeight);
                return el.times(windowBoundary);
            },
            getExpected: function(orig, viewport) {
                var posPoint = OpenSeadragon.getElementOffset(viewer.element);
                return orig.minus(posPoint).divide(viewport.getContainerSize().x * ZOOM_FACTOR).plus(VIEWER_PADDING);
            },
            method: 'windowToViewportCoordinates'
        });
    });

    QUnit.test('imageToWindowCoordinates', function(assert) {
        loopingTestHelper(assert, {
            testArray: testPoints,
            getOrig: function(el, viewport) {
                return el.times(viewer.source.dimensions.x);
            },
            getExpected: function(orig, viewport) {
                var posPoint = OpenSeadragon.getElementOffset(viewer.element);
                return orig.plus(posPoint).minus(VIEWER_PADDING.times(viewport.getContainerSize().x * ZOOM_FACTOR));
            },
            method: 'imageToWindowCoordinates'
        });
    });

    QUnit.test('windowToViewportCoordinates', function(assert) {
        loopingTestHelper(assert, {
            testArray: testPoints,
            getOrig: function(el, viewport) {
                var windowBoundary = Math.min(window.innerWidth, window.innerHeight);
                return el.times(windowBoundary);
            },
            getExpected: function(orig, viewport) {
                var posPoint = OpenSeadragon.getElementOffset(viewer.element);
                return orig.minus(posPoint).divide(viewport.getContainerSize().x * ZOOM_FACTOR).plus(VIEWER_PADDING);
            },
            method: 'windowToViewportCoordinates'
        });
    });

    QUnit.test('viewportToWindowCoordinates', function(assert) {
        loopingTestHelper(assert, {
            testArray: testPoints,
            getOrig: function(el, viewport) {
                return el.times(viewer.source.dimensions.x);
            },
            getExpected: function(orig, viewport) {
                var posPoint = OpenSeadragon.getElementOffset(viewer.element);
                return orig.minus(VIEWER_PADDING).times(viewport.getContainerSize().x * ZOOM_FACTOR).plus(posPoint);
            },
            method: 'viewportToWindowCoordinates'
        });
    });

    QUnit.test('viewportToImageZoom', function(assert) {
        loopingTestHelper(assert, {
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

    QUnit.test('imageToViewportZoom', function(assert) {
        loopingTestHelper(assert, {
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

    QUnit.test('toggleFlipState', function(assert) {
      var done = assert.async();
      var openHandler = function(event) {
          viewer.removeHandler('open', openHandler);
          var viewport = viewer.viewport;

          assert.deepEqual(viewport.getFlip(), false, "Get original flip state should be false");

          viewport.toggleFlip();
          assert.deepEqual(viewport.getFlip(), true, "Toggling flip state variable, viewport should be true");

          viewport.toggleFlip();
          assert.deepEqual(viewport.getFlip(), false, "Toggling back flip state variable, viewport should be false again");

          done();
      };
      viewer.addHandler('open', openHandler);
      viewer.open(DZI_PATH);
    });

    QUnit.test('setFlipState', function(assert) {
      var done = assert.async();
      var openHandler = function(event) {
          viewer.removeHandler('open', openHandler);
          var viewport = viewer.viewport;

          assert.deepEqual(viewport.getFlip(), false, "Get original flip state should be false");

          viewport.setFlip(true);
          assert.deepEqual(viewport.getFlip(), true, "Setting flip state variable should be true");

          viewport.setFlip(false);
          assert.deepEqual(viewport.getFlip(), false, "Unsetting flip state variable, viewport should be false again");

          done();
      };
      viewer.addHandler('open', openHandler);
      viewer.open(DZI_PATH);
    });

    QUnit.test('setMaxZoomPixelRatio', function(assert) {
      var done = assert.async();
      var openHandler = function(event) {
          viewer.removeHandler('open', openHandler);
          var viewport = viewer.viewport;

          for (var i = 0; i < testZoomLevels.length; i++) {
              viewport.setMaxZoomPixelRatio(testZoomLevels[i])
              assert.equal(viewport.getMaxZoomPixelRatio(), testZoomLevels[i], "Max zoom pixel ratio is set correctly.");
          }

          viewport.zoomTo(viewport.getMaxZoom())
          viewport.setMaxZoomPixelRatio(testZoomLevels[0], true)
          assert.equal(viewport.getZoom(), viewport.getMaxZoom(), "Zoom should be adjusted to max zoom level.");

          done();
      };
      viewer.addHandler('open', openHandler);
      viewer.open(DZI_PATH);
    });

})();
