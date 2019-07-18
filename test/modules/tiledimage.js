/* global QUnit, $, Util, testLog */

(function() {
    var viewer;

    QUnit.module('TiledImage', {
        beforeEach: function() {
            $('<div id="example"></div>').appendTo("#qunit-fixture");

            testLog.reset();

            viewer = OpenSeadragon({
                id: 'example',
                prefixUrl: '/build/openseadragon/images/',
                springStiffness: 100 // Faster animation = faster tests
            });
        },
        afterEach: function() {
            if (viewer && viewer.close) {
                viewer.close();
            }

            viewer = null;
        }
    });

    // ----------
    var checkBounds = function(assert, image, expected, message) {
        var bounds = image.getBounds();
        assert.equal(bounds.x, expected.x, message + ' x');
        assert.equal(bounds.y, expected.y, message + ' y');
        assert.equal(bounds.width, expected.width, message + ' width');
        assert.equal(bounds.height, expected.height, message + ' height');
    };

    // ----------
    QUnit.test('metrics', function(assert) {
        var done = assert.async();
        var handlerCount = 0;

        viewer.addHandler('open', function(event) {
            var image = viewer.world.getItemAt(0);
            var contentSize = image.getContentSize();
            assert.equal(contentSize.x, 500, 'contentSize.x');
            assert.equal(contentSize.y, 2000, 'contentSize.y');

            checkBounds(assert, image, new OpenSeadragon.Rect(5, 6, 10, 40), 'initial bounds');

            var scale = image.getContentSize().x / image.getBounds().width;
            var viewportPoint = new OpenSeadragon.Point(10, 11);
            var imagePoint = viewportPoint.minus(image.getBounds().getTopLeft()).times(scale);

            assert.propEqual(image.viewportToImageCoordinates(viewportPoint), imagePoint, 'viewportToImageCoordinates');
            assert.propEqual(image.imageToViewportCoordinates(imagePoint), viewportPoint, 'imageToViewportCoordinates');

            var viewportRect = new OpenSeadragon.Rect(viewportPoint.x, viewportPoint.y, 6, 7);
            var imageRect = new OpenSeadragon.Rect(imagePoint.x, imagePoint.y,
                viewportRect.width * scale, viewportRect.height * scale);

            assert.propEqual(image.viewportToImageRectangle(viewportRect), imageRect, 'viewportToImageRectangle');
            assert.propEqual(image.imageToViewportRectangle(imageRect), viewportRect, 'imageToViewportRectangle');

            image.addHandler('bounds-change', function boundsChangeHandler(event) {
                image.removeHandler('bounds-change', boundsChangeHandler);
                handlerCount++;
            });

            image.setPosition(new OpenSeadragon.Point(7, 8));
            checkBounds(assert, image, new OpenSeadragon.Rect(7, 8, 10, 40), 'bounds after position');

            image.setWidth(5);
            checkBounds(assert, image, new OpenSeadragon.Rect(7, 8, 5, 20), 'bounds after width');

            image.setHeight(4);
            checkBounds(assert, image, new OpenSeadragon.Rect(7, 8, 1, 4), 'bounds after width');

            assert.equal(handlerCount, 1, 'correct number of handlers called');
            done();
        });

        viewer.open({
            tileSource: '/test/data/tall.dzi',
            x: 5,
            y: 6,
            width: 10
        });
    });

    // ----------
    QUnit.test('animation', function(assert) {
        var done = assert.async();
        viewer.addHandler("open", function() {
            var image = viewer.world.getItemAt(0);
            assert.propEqual(image.getBounds(), new OpenSeadragon.Rect(0, 0, 1, 1), 'target bounds on open');
            assert.propEqual(image.getBounds(true), new OpenSeadragon.Rect(0, 0, 1, 1), 'current bounds on open');

            image.setPosition(new OpenSeadragon.Point(1, 2));
            assert.propEqual(image.getBounds(), new OpenSeadragon.Rect(1, 2, 1, 1), 'target bounds after position');
            assert.propEqual(image.getBounds(true), new OpenSeadragon.Rect(0, 0, 1, 1), 'current bounds after position');

            image.setWidth(3);
            assert.propEqual(image.getBounds(), new OpenSeadragon.Rect(1, 2, 3, 3), 'target bounds after width');
            assert.propEqual(image.getBounds(true), new OpenSeadragon.Rect(0, 0, 1, 1), 'current bounds after width');

            viewer.addHandler('animation-finish', function animationHandler() {
                viewer.removeHandler('animation-finish', animationHandler);
                assert.propEqual(image.getBounds(), new OpenSeadragon.Rect(1, 2, 3, 3), 'target bounds after animation');
                assert.propEqual(image.getBounds(true), new OpenSeadragon.Rect(1, 2, 3, 3), 'current bounds after animation');
                done();
            });
        });

        viewer.open('/test/data/testpattern.dzi');
    });

    // ----------
    QUnit.test('update', function(assert) {
        var done = assert.async();
        var handlerCount = 0;

        viewer.addHandler('open', function(event) {
            var image = viewer.world.getItemAt(0);
            assert.equal(image.needsDraw(), true, 'needs draw after open');

            viewer.addHandler('update-level', function updateLevelHandler(event) {
                viewer.removeHandler('update-level', updateLevelHandler);
                handlerCount++;
                assert.equal(event.eventSource, viewer, 'sender of update-level event was viewer');
                assert.equal(event.tiledImage, image, 'tiledImage of update-level event is correct');
                assert.ok('havedrawn' in event, 'update-level event includes havedrawn');
                assert.ok('level' in event, 'update-level event includes level');
                assert.ok('opacity' in event, 'update-level event includes opacity');
                assert.ok('visibility' in event, 'update-level event includes visibility');
                assert.ok('topleft' in event, 'update-level event includes topleft');
                assert.ok('bottomright' in event, 'update-level event includes bottomright');
                assert.ok('currenttime' in event, 'update-level event includes currenttime');
                assert.ok('best' in event, 'update-level event includes best');
            });

            viewer.addHandler('update-tile', function updateTileHandler(event) {
                viewer.removeHandler('update-tile', updateTileHandler);
                handlerCount++;
                assert.equal(event.eventSource, viewer, 'sender of update-tile event was viewer');
                assert.equal(event.tiledImage, image, 'tiledImage of update-level event is correct');
                assert.ok(event.tile, 'update-tile event includes tile');
            });

            viewer.addHandler('tile-drawing', function tileDrawingHandler(event) {
                viewer.removeHandler('tile-drawing', tileDrawingHandler);
                handlerCount++;
                assert.equal(event.eventSource, viewer, 'sender of tile-drawing event was viewer');
                assert.equal(event.tiledImage, image, 'tiledImage of update-level event is correct');
                assert.ok(event.tile, 'tile-drawing event includes a tile');
                assert.ok(event.context, 'tile-drawing event includes a context');
                assert.ok(event.rendered, 'tile-drawing event includes a rendered');
            });

            viewer.addHandler('tile-drawn', function tileDrawnHandler(event) {
                viewer.removeHandler('tile-drawn', tileDrawnHandler);
                handlerCount++;
                assert.equal(event.eventSource, viewer, 'sender of tile-drawn event was viewer');
                assert.equal(event.tiledImage, image, 'tiledImage of update-level event is correct');
                assert.ok(event.tile, 'tile-drawn event includes tile');

                assert.equal(handlerCount, 4, 'correct number of handlers called');
                done();
            });

            image.draw();
        });

        viewer.open('/test/data/testpattern.dzi');
    });

    // ----------
    QUnit.test('reset', function(assert) {
        var done = assert.async();
        viewer.addHandler('tile-drawn', function updateHandler() {
            viewer.removeHandler('tile-drawn', updateHandler);
            assert.ok(viewer.tileCache.numTilesLoaded() > 0, 'we have tiles after tile-drawn');
            viewer.world.getItemAt(0).reset();
            assert.equal(viewer.tileCache.numTilesLoaded(), 0, 'no tiles after reset');

            viewer.addHandler('tile-drawn', function updateHandler2() {
                viewer.removeHandler('tile-drawn', updateHandler2);
                assert.ok(viewer.tileCache.numTilesLoaded() > 0, 'more tiles load');
                viewer.world.getItemAt(0).destroy();
                assert.equal(viewer.tileCache.numTilesLoaded(), 0, 'no tiles after destroy');
                done();
            });
        });

        assert.equal(viewer.tileCache.numTilesLoaded(), 0, 'no tiles at start');

        viewer.open('/test/data/testpattern.dzi');
    });

    // ----------
    QUnit.test('clip', function(assert) {
        var done = assert.async();
        var clip = new OpenSeadragon.Rect(100, 100, 800, 800);

        viewer.addHandler('open', function() {
            var image = viewer.world.getItemAt(0);
            assert.propEqual(image.getClip(), clip, 'image has correct clip');

            image.setClip(null);
            assert.equal(image.getClip(), null, 'clip is cleared');

            image.setClip(clip);
            assert.propEqual(image.getClip(), clip, 'clip is set correctly');

            Util.spyOnce(viewer.drawer, 'setClip', function(rect) {
                var homeBounds = viewer.viewport.getHomeBounds();
                var canvasClip = viewer.drawer
                    .viewportToDrawerRectangle(homeBounds);
                var precision = 0.00000001;
                Util.assertRectangleEquals(assert, rect, canvasClip, precision,
                    'clipping should be ' + canvasClip);
                done();
            });
        });

        viewer.open({
            tileSource: '/test/data/testpattern.dzi',
            clip: clip
        });
    });

    // ----------
    QUnit.test('clip-change event', function(assert) {
        var done = assert.async();
        assert.expect(0);
        var clip = new OpenSeadragon.Rect(100, 100, 800, 800);

        viewer.addHandler('open', function() {
            var image = viewer.world.getItemAt(0);
            image.addOnceHandler('clip-change', function() {
                image.addOnceHandler('clip-change', function() {
                    done();
                });
                image.setClip(clip);
            });
            image.setClip(null);
        });

        viewer.open({
            tileSource: '/test/data/testpattern.dzi'
        });
    });

    // ----------
    QUnit.test('getClipBounds', function(assert) {
        var done = assert.async();
        var clip = new OpenSeadragon.Rect(100, 200, 800, 500);

        viewer.addHandler('open', function() {
            var image = viewer.world.getItemAt(0);
            var bounds = image.getClippedBounds();
            var expectedBounds = new OpenSeadragon.Rect(1.2, 1.4, 1.6, 1);
            assert.propEqual(bounds, expectedBounds,
                'getClipBounds should take clipping into account.');

            image = viewer.world.getItemAt(1);
            bounds = image.getClippedBounds();
            expectedBounds = new OpenSeadragon.Rect(1, 2, 2, 2);
            assert.propEqual(bounds, expectedBounds,
                'getClipBounds should work when no clipping set.');

            done();
        });

        viewer.open([{
            tileSource: '/test/data/testpattern.dzi',
            clip: clip,
            x: 1,
            y: 1,
            width: 2
        }, {
            tileSource: '/test/data/testpattern.dzi',
            x: 1,
            y: 2,
            width: 2
        }]);
    });

    // ----------
    QUnit.test('opacity', function(assert) {
        var done = assert.async();
        function testDefaultOpacity() {
            viewer.removeHandler('open', testDefaultOpacity);
            var image = viewer.world.getItemAt(0);
            assert.strictEqual(image.getOpacity(), 0.5, 'image has default opacity');

            image.setOpacity(1);
            assert.strictEqual(image.getOpacity(), 1, 'opacity is set correctly');

            viewer.addHandler('open', testTileSourceOpacity);
            viewer.open({
                tileSource: '/test/data/testpattern.dzi',
                opacity: 0.25
            });
        }

        function testTileSourceOpacity() {
            viewer.removeHandler('open', testTileSourceOpacity);
            var image = viewer.world.getItemAt(0);
            assert.strictEqual(image.getOpacity(), 0.25, 'image has correct opacity');

            image.setOpacity(0);
            assert.strictEqual(image.getOpacity(), 0, 'opacity is set correctly');

            done();
        }

        viewer.addHandler('open', testDefaultOpacity);

        viewer.opacity = 0.5;
        viewer.open({
            tileSource: '/test/data/testpattern.dzi',
        });
    });

    // ----------
    QUnit.test('rotation', function(assert) {
        var done = assert.async();
        function testDefaultRotation() {
            var image = viewer.world.getItemAt(0);
            assert.strictEqual(image.getRotation(true), 0, 'image has default current rotation');
            assert.strictEqual(image.getRotation(false), 0, 'image has default target rotation');

            image.setRotation(400);
            assert.strictEqual(image.getRotation(true), 0, 'current rotation is not changed');
            assert.strictEqual(image.getRotation(false), 400, 'target rotation is set correctly');

            image.setRotation(200, true);
            assert.strictEqual(image.getRotation(true), 200, 'current rotation is set correctly');
            assert.strictEqual(image.getRotation(false), 200, 'target rotation is set correctly');

            viewer.addOnceHandler('open', testTileSourceRotation);
            viewer.open({
                tileSource: '/test/data/testpattern.dzi',
                degrees: -60
            });
        }

        function testTileSourceRotation() {
            var image = viewer.world.getItemAt(0);
            assert.strictEqual(image.getRotation(true), -60, 'image has correct current rotation');
            assert.strictEqual(image.getRotation(false), -60, 'image has correct target rotation');
            done();
        }

        viewer.addOnceHandler('open', testDefaultRotation);
        viewer.open({
            tileSource: '/test/data/testpattern.dzi',
        });
    });

    QUnit.test('fitBounds', function(assert) {
        var done = assert.async();
        function assertRectEquals(actual, expected, message) {
            assert.ok(actual.equals(expected), message + ' should be ' +
                expected.toString() + ', found ' + actual.toString());
        }

        viewer.addHandler('open', function openHandler() {
            viewer.removeHandler('open', openHandler);

            var squareImage = viewer.world.getItemAt(0);
            squareImage.fitBounds(
                new OpenSeadragon.Rect(0, 0, 1, 2),
                OpenSeadragon.Placement.CENTER,
                true);
            var actualBounds = squareImage.getBounds(true);
            var expectedBounds = new OpenSeadragon.Rect(0, 0.5, 1, 1);
            assertRectEquals(actualBounds, expectedBounds, 'Square image bounds');

            var tallImage = viewer.world.getItemAt(1);
            tallImage.fitBounds(
                new OpenSeadragon.Rect(0, 0, 1, 2),
                OpenSeadragon.Placement.TOP_LEFT,
                true);
            actualBounds = tallImage.getBounds(true);
            expectedBounds = new OpenSeadragon.Rect(0, 0, 0.5, 2);
            assertRectEquals(actualBounds, expectedBounds, 'Tall image bounds');

            var wideImage = viewer.world.getItemAt(2);
            wideImage.fitBounds(
                new OpenSeadragon.Rect(0, 0, 1, 2),
                OpenSeadragon.Placement.BOTTOM_RIGHT,
                true);
            actualBounds = wideImage.getBounds(true);
            expectedBounds = new OpenSeadragon.Rect(0, 1.75, 1, 0.25);
            assertRectEquals(actualBounds, expectedBounds, 'Wide image bounds');
            done();
        });

        viewer.open([
            '/test/data/testpattern.dzi',
            '/test/data/tall.dzi',
            '/test/data/wide.dzi'
        ]);
    });

    // ----------
    QUnit.test('fitBounds in constructor', function(assert) {
        var done = assert.async();
        function assertRectEquals(actual, expected, message) {
            assert.ok(actual.equals(expected), message + ' should be ' +
                expected.toString() + ', found ' + actual.toString());
        }

        viewer.addHandler('open', function openHandler() {
            viewer.removeHandler('open', openHandler);

            var squareImage = viewer.world.getItemAt(0);
            var actualBounds = squareImage.getBounds(true);
            var expectedBounds = new OpenSeadragon.Rect(0, 0.5, 1, 1);
            assertRectEquals(actualBounds, expectedBounds, 'Square image bounds');

            var tallImage = viewer.world.getItemAt(1);
            actualBounds = tallImage.getBounds(true);
            expectedBounds = new OpenSeadragon.Rect(0, 0, 0.5, 2);
            assertRectEquals(actualBounds, expectedBounds, 'Tall image bounds');

            var wideImage = viewer.world.getItemAt(2);
            actualBounds = wideImage.getBounds(true);
            expectedBounds = new OpenSeadragon.Rect(0, 1.75, 1, 0.25);
            assertRectEquals(actualBounds, expectedBounds, 'Wide image bounds');
            done();
        });

        viewer.open([{
                tileSource: '/test/data/testpattern.dzi',
                x: 1, // should be ignored
                y: 1, // should be ignored
                width: 2, // should be ignored
                fitBounds: new OpenSeadragon.Rect(0, 0, 1, 2)
                // No placement specified, should default to CENTER
            }, {
                tileSource: '/test/data/tall.dzi',
                fitBounds: new OpenSeadragon.Rect(0, 0, 1, 2),
                fitBoundsPlacement: OpenSeadragon.Placement.TOP_LEFT
            }, {
                tileSource: '/test/data/wide.dzi',
                fitBounds: new OpenSeadragon.Rect(0, 0, 1, 2),
                fitBoundsPlacement: OpenSeadragon.Placement.BOTTOM_RIGHT
            }]);
    });

    // ----------
    QUnit.test('fitBounds with clipping', function(assert) {
        var done = assert.async();
        function assertRectEquals(actual, expected, message) {
            assert.ok(actual.equals(expected), message + ' should be ' +
                expected.toString() + ', found ' + actual.toString());
        }

        viewer.addHandler('open', function openHandler() {
            viewer.removeHandler('open', openHandler);

            var squareImage = viewer.world.getItemAt(0);
            var actualBounds = squareImage.getBounds(true);
            var expectedBounds = new OpenSeadragon.Rect(-1, -1, 2, 2);
            assertRectEquals(actualBounds, expectedBounds, 'Square image bounds');

            var tallImage = viewer.world.getItemAt(1);
            actualBounds = tallImage.getBounds(true);
            expectedBounds = new OpenSeadragon.Rect(1, 1, 2, 8);
            assertRectEquals(actualBounds, expectedBounds, 'Tall image bounds');

            var wideImage = viewer.world.getItemAt(2);
            actualBounds = wideImage.getBounds(true);
            expectedBounds = new OpenSeadragon.Rect(1, 1, 16, 4);
            assertRectEquals(actualBounds, expectedBounds, 'Wide image bounds');
            done();
        });

        viewer.open([{
                tileSource: '/test/data/testpattern.dzi',
                clip: new OpenSeadragon.Rect(500, 500, 500, 500),
                fitBounds: new OpenSeadragon.Rect(0, 0, 1, 1)
            }, {
                tileSource: '/test/data/tall.dzi',
                clip: new OpenSeadragon.Rect(0, 0, 250, 100),
                fitBounds: new OpenSeadragon.Rect(1, 1, 1, 2),
                fitBoundsPlacement: OpenSeadragon.Placement.TOP
            }, {
                tileSource: '/test/data/wide.dzi',
                clip: new OpenSeadragon.Rect(0, 0, 100, 250),
                fitBounds: new OpenSeadragon.Rect(1, 1, 1, 2),
                fitBoundsPlacement: OpenSeadragon.Placement.TOP_LEFT
            }]);
    });

    // ----------
    QUnit.test('fullyLoaded', function(assert) {
        var done = assert.async();
        viewer.addHandler('open', function openHandler() {
            viewer.removeHandler('open', openHandler);

            var image = viewer.world.getItemAt(0);
            assert.equal(image.getFullyLoaded(), false, 'not fully loaded at first');

            var count = 0;

            var fullyLoadedChangeHandler = function(event) {
                if (count === 0) {
                    assert.equal(event.fullyLoaded, true, 'event includes true fullyLoaded property');
                    assert.equal(image.getFullyLoaded(), true, 'image is fully loaded after event');
                    viewer.viewport.zoomBy(5, null, true);
                } else if (count === 1) {
                    assert.equal(event.fullyLoaded, false, 'event includes false fullyLoaded property');
                    assert.equal(image.getFullyLoaded(), false, 'image is not fully loaded after zoom');
                } else {
                    image.removeHandler('fully-loaded-change', fullyLoadedChangeHandler);
                    assert.equal(image.getFullyLoaded(), true, 'image is once again fully loaded');
                    done();
                }

                count++;
            };

            image.addHandler('fully-loaded-change', fullyLoadedChangeHandler);
        });

        viewer.open([{
            tileSource: '/test/data/tall.dzi',
        }]);
    });

    QUnit.test('_getCornerTiles without wrapping', function(assert) {
        var tiledImageMock = {
            wrapHorizontal: false,
            wrapVertical: false,
            source: new OpenSeadragon.TileSource({
                width: 1500,
                height: 1000,
                tileWidth: 200,
                tileHeight: 150,
                tileOverlap: 1,
            }),
        };
        var _getCornerTiles = OpenSeadragon.TiledImage.prototype._getCornerTiles.bind(tiledImageMock);

        function assertCornerTiles(topLeftBound, bottomRightBound,
            expectedTopLeft, expectedBottomRight) {
            var cornerTiles = _getCornerTiles(11, topLeftBound, bottomRightBound);
            assert.ok(cornerTiles.topLeft.equals(expectedTopLeft),
                'Top left tile should be ' + expectedTopLeft.toString() +
                ' found ' + cornerTiles.topLeft.toString());
            assert.ok(cornerTiles.bottomRight.equals(expectedBottomRight),
                'Bottom right tile should be ' + expectedBottomRight.toString() +
                ' found ' + cornerTiles.bottomRight.toString());
        }

        assertCornerTiles(
            new OpenSeadragon.Point(0, 0),
            new OpenSeadragon.Point(1, 10 / 15),
            new OpenSeadragon.Point(0, 0),
            new OpenSeadragon.Point(7, 6)
        );

        // Floating point errors should be handled
        assertCornerTiles(
            new OpenSeadragon.Point(-1e-14, -1e-14),
            new OpenSeadragon.Point(1 + 1e-14, 10 / 15 + 1e-14),
            new OpenSeadragon.Point(0, 0),
            new OpenSeadragon.Point(7, 6)
        );

        assertCornerTiles(
            new OpenSeadragon.Point(0.3, 0.5),
            new OpenSeadragon.Point(0.5, 0.6),
            new OpenSeadragon.Point(2, 5),
            new OpenSeadragon.Point(3, 6)
        );
    });

    QUnit.test('_getCornerTiles with horizontal wrapping', function(assert) {
        var tiledImageMock = {
            wrapHorizontal: true,
            wrapVertical: false,
            source: new OpenSeadragon.TileSource({
                width: 1500,
                height: 1000,
                tileWidth: 200,
                tileHeight: 150,
                tileOverlap: 1,
            }),
        };
        var _getCornerTiles = OpenSeadragon.TiledImage.prototype._getCornerTiles.bind(tiledImageMock);

        function assertCornerTiles(topLeftBound, bottomRightBound,
            expectedTopLeft, expectedBottomRight) {
            var cornerTiles = _getCornerTiles(11, topLeftBound, bottomRightBound);
            assert.ok(cornerTiles.topLeft.equals(expectedTopLeft),
                'Top left tile should be ' + expectedTopLeft.toString() +
                ' found ' + cornerTiles.topLeft.toString());
            assert.ok(cornerTiles.bottomRight.equals(expectedBottomRight),
                'Bottom right tile should be ' + expectedBottomRight.toString() +
                ' found ' + cornerTiles.bottomRight.toString());
        }

        assertCornerTiles(
            new OpenSeadragon.Point(0, 0),
            new OpenSeadragon.Point(1, 10 / 15),
            new OpenSeadragon.Point(0, 0),
            new OpenSeadragon.Point(8, 6)
        );

        assertCornerTiles(
            new OpenSeadragon.Point(-1, 0),
            new OpenSeadragon.Point(0.5, 10 / 15 + 1e-14),
            new OpenSeadragon.Point(-8, 0),
            new OpenSeadragon.Point(3, 6)
        );

        assertCornerTiles(
            new OpenSeadragon.Point(1.3, 0.5),
            new OpenSeadragon.Point(1.5, 0.6),
            new OpenSeadragon.Point(10, 5),
            new OpenSeadragon.Point(11, 6)
        );
    });

    QUnit.test('_getCornerTiles with vertical wrapping', function(assert) {
        var tiledImageMock = {
            wrapHorizontal: false,
            wrapVertical: true,
            source: new OpenSeadragon.TileSource({
                width: 1500,
                height: 1000,
                tileWidth: 200,
                tileHeight: 150,
                tileOverlap: 1,
            }),
        };
        var _getCornerTiles = OpenSeadragon.TiledImage.prototype._getCornerTiles.bind(tiledImageMock);

        function assertCornerTiles(topLeftBound, bottomRightBound,
            expectedTopLeft, expectedBottomRight) {
            var cornerTiles = _getCornerTiles(11, topLeftBound, bottomRightBound);
            assert.ok(cornerTiles.topLeft.equals(expectedTopLeft),
                'Top left tile should be ' + expectedTopLeft.toString() +
                ' found ' + cornerTiles.topLeft.toString());
            assert.ok(cornerTiles.bottomRight.equals(expectedBottomRight),
                'Bottom right tile should be ' + expectedBottomRight.toString() +
                ' found ' + cornerTiles.bottomRight.toString());
        }

        assertCornerTiles(
            new OpenSeadragon.Point(0, 0),
            new OpenSeadragon.Point(1, 10 / 15),
            new OpenSeadragon.Point(0, 0),
            new OpenSeadragon.Point(7, 7)
        );

        assertCornerTiles(
            new OpenSeadragon.Point(0, -10 / 15 / 2),
            new OpenSeadragon.Point(0.5, 0.5),
            new OpenSeadragon.Point(0, -4),
            new OpenSeadragon.Point(3, 5)
        );

        assertCornerTiles(
            new OpenSeadragon.Point(0, 10 / 15 + 0.1),
            new OpenSeadragon.Point(0.3, 10 / 15 + 0.3),
            new OpenSeadragon.Point(0, 7),
            new OpenSeadragon.Point(2, 9)
        );
    });

})();
