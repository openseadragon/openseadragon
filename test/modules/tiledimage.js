/* global QUnit, $, Util, testLog */

(function() {
    let viewer;

    const precision = 0.000000001;

    QUnit.module('TiledImage', {
        beforeEach: function() {
            $('<div id="example"></div>').appendTo("#qunit-fixture");

            testLog.reset();

            // eslint-disable-next-line new-cap
            viewer = OpenSeadragon({
                id: 'example',
                prefixUrl: '/build/openseadragon/images/',
                springStiffness: 100, // Faster animation = faster tests
                drawer: 'canvas', // always use canvas drawer for these tests
            });
        },
        afterEach: function() {
            if (viewer){
                viewer.destroy();
            }

            viewer = null;
        }
    });

    // ----------
    const checkBounds = function(assert, image, expected, message) {
        const bounds = image.getBounds();
        assert.equal(bounds.x, expected.x, message + ' x');
        assert.equal(bounds.y, expected.y, message + ' y');
        assert.equal(bounds.width, expected.width, message + ' width');
        assert.equal(bounds.height, expected.height, message + ' height');
    };

    // ----------
    QUnit.test('metrics', function(assert) {
        const done = assert.async();
        let handlerCount = 0;

        viewer.addHandler('open', function(event) {
            const image = viewer.world.getItemAt(0);
            const contentSize = image.getContentSize();
            const sizeInWindowCoords = image.getSizeInWindowCoordinates();
            assert.equal(contentSize.x, 500, 'contentSize.x');
            assert.equal(contentSize.y, 2000, 'contentSize.y');
            assert.equal(sizeInWindowCoords.x, 125, 'sizeInWindowCoords.x');
            assert.equal(sizeInWindowCoords.y, 500, 'sizeInWindowCoords.y');

            checkBounds(assert, image, new OpenSeadragon.Rect(5, 6, 10, 40), 'initial bounds');

            const scale = image.getContentSize().x / image.getBounds().width;
            const viewportPoint = new OpenSeadragon.Point(10, 11);
            const imagePoint = viewportPoint.minus(image.getBounds().getTopLeft()).times(scale);

            assert.propEqual(image.viewportToImageCoordinates(viewportPoint), imagePoint, 'viewportToImageCoordinates');
            assert.propEqual(image.imageToViewportCoordinates(imagePoint), viewportPoint, 'imageToViewportCoordinates');

            const viewportRect = new OpenSeadragon.Rect(viewportPoint.x, viewportPoint.y, 6, 7);
            const imageRect = new OpenSeadragon.Rect(imagePoint.x, imagePoint.y,
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

            viewer.addHandler('zoom', function zoomHandler(event) {
                const sizeInWindowCoords = image.getSizeInWindowCoordinates();
                viewer.removeHandler('zoom', zoomHandler);
                handlerCount++;
                assert.equal(sizeInWindowCoords.x, 4000, 'sizeInWindowCoords.x after zoom');
                assert.equal(sizeInWindowCoords.y, 16000, 'sizeInWindowCoords.y after zoom');
            });

            viewer.viewport.zoomTo(8, null, true);

            assert.equal(handlerCount, 2, 'correct number of handlers called');

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
        const done = assert.async();
        viewer.addHandler("open", function() {
            const image = viewer.world.getItemAt(0);
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
                Util.assertRectangleEquals(assert,  new OpenSeadragon.Rect(1, 2, 3, 3), image.getBounds(), precision, 'target bounds after animation');
                Util.assertRectangleEquals(assert,  new OpenSeadragon.Rect(1, 2, 3, 3), image.getBounds(true), precision, 'target bounds after animation');
                done();
            });
        });

        viewer.open('/test/data/testpattern.dzi');
    });

    // ----------
    QUnit.test('update', function(assert) {
        const done = assert.async();
        let handlerCount = 0;
        const expectedHandlers = 4;

        viewer.addHandler('open', function(event) {
            const image = viewer.world.getItemAt(0);
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



            viewer.addHandler('tiled-image-drawn', function tileDrawnHandler(event) {
                viewer.removeHandler('tiled-image-drawn', tileDrawnHandler);
                handlerCount++;
                assert.equal(event.eventSource, viewer, 'sender of tiled-image-drawn event was viewer');
                assert.equal(event.tiledImage, image, 'tiledImage of update-level event is correct');
                assert.ok(event.tiles, 'tiled-image-drawn event includes tiles');

                assert.equal(handlerCount, expectedHandlers, 'correct number of handlers called');
                done();
            });

            viewer.drawer.draw( [ image ] );
        });

        viewer.open('/test/data/testpattern.dzi');
    });

    // ----------
    QUnit.test('reset', function(assert) {
        const done = assert.async();
        viewer.addHandler('tiled-image-drawn', function updateHandler() {
            viewer.removeHandler('tiled-image-drawn', updateHandler);
            assert.ok(viewer.tileCache.numTilesLoaded() > 0, 'we have tiles after tiled-image-drawn');
            viewer.world.getItemAt(0).reset();
            assert.equal(viewer.tileCache.numTilesLoaded(), 0, 'no tiles after reset');

            viewer.addHandler('tiled-image-drawn', function updateHandler2() {
                viewer.removeHandler('tiled-image-drawn', updateHandler2);

                setTimeout(() => {
                    assert.ok(viewer.tileCache.numTilesLoaded() > 0, 'more tiles load');
                    viewer.world.getItemAt(0).destroy();
                    assert.equal(viewer.tileCache.numTilesLoaded(), 0, 'no tiles after destroy');
                    done();
                }, 20);
            });
        });

        assert.equal(viewer.tileCache.numTilesLoaded(), 0, 'no tiles at start');

        viewer.open('/test/data/testpattern.dzi');
    });

    // ----------
    QUnit.test('clip', function(assert) {
        const done = assert.async();
        const clip = new OpenSeadragon.Rect(100, 100, 800, 800);

        viewer.addHandler('open', function() {
            const image = viewer.world.getItemAt(0);
            assert.propEqual(image.getClip(), clip, 'image has correct clip');

            image.setClip(null);
            assert.equal(image.getClip(), null, 'clip is cleared');

            image.setClip(clip);
            assert.propEqual(image.getClip(), clip, 'clip is set correctly');

            Util.spyOnce(viewer.drawer, '_setClip', function(rect) {
                const homeBounds = viewer.viewport.getHomeBounds();
                const canvasClip = viewer.drawer
                    .viewportToDrawerRectangle(homeBounds);
                const precision = 0.00000001;
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
    QUnit.test('tile load rate boost decays once per frame, not once per level', function(assert) {
        const done = assert.async();

        viewer.addHandler('open', function() {
            const image = viewer.world.getItemAt(0);
            const steady = image.maxTilesPerFrame;

            // _updateLevel runs once per pyramid level, so decaying there collapsed the whole boost within a
            // single frame and the boost never actually did anything.
            image._boostTileLoadingRate();
            const boosted = image._currentMaxTilesPerFrame;
            assert.equal(boosted, steady * 10, 'Boost raises the per-frame allowance tenfold.');

            image._updateLevelsForViewport();
            assert.equal(image._currentMaxTilesPerFrame, Math.ceil(boosted / 2),
                'One frame halves the allowance exactly once, whatever the level count.');

            // And it must bottom out at the configured steady-state value rather than decaying to nothing.
            for (let i = 0; i < 20; i++) {
                image._updateLevelsForViewport();
            }
            assert.equal(image._currentMaxTilesPerFrame, steady,
                'The allowance decays down to maxTilesPerFrame and stops there.');

            done();
        });

        viewer.open({
            tileSource: '/test/data/testpattern.dzi'
        });
    });

    // ----------
    QUnit.test('tile load rate is re-boosted whenever tiles become needed', function(assert) {
        const done = assert.async();

        viewer.addHandler('open', function() {
            const image = viewer.world.getItemAt(0);

            // Settle the allowance at its steady-state value.
            image._setFullyLoaded(true);
            for (let i = 0; i < 20; i++) {
                image._updateLevelsForViewport();
            }
            assert.equal(image._currentMaxTilesPerFrame, image.maxTilesPerFrame, 'Allowance starts settled.');

            // Discovering that the view is incomplete - what a pan or zoom does - must refill fast rather than
            // trickle at the steady-state rate. Before this, only reset() ever re-armed the boost.
            image._setFullyLoaded(false);
            assert.equal(image._currentMaxTilesPerFrame, image.maxTilesPerFrame * 10,
                'Becoming not-fully-loaded re-boosts the per-frame allowance.');

            done();
        });

        viewer.open({
            tileSource: '/test/data/testpattern.dzi'
        });
    });

    // ----------
    QUnit.test('tileLoadingConcurrency tops the download pipeline back up', function(assert) {
        const done = assert.async();

        viewer.addHandler('open', function() {
            const image = viewer.world.getItemAt(0);
            image.tileLoadingConcurrency = 16;
            image._currentMaxTilesPerFrame = 2;

            // Pipeline empty: dispatch enough to reach the concurrency target, not just the per-frame floor.
            image._tilesInFlight = 0;
            image._updateLevelsForViewport();
            assert.equal(image._tileLoadBudget, 16, 'An empty pipeline is refilled up to the target.');

            image._currentMaxTilesPerFrame = 2;
            image._tilesInFlight = 14;
            image._updateLevelsForViewport();
            assert.equal(image._tileLoadBudget, 2,
                'A nearly full pipeline falls back to the per-frame allowance as a floor.');

            image._currentMaxTilesPerFrame = 2;
            image._tilesInFlight = 40;
            image._updateLevelsForViewport();
            assert.equal(image._tileLoadBudget, 2, 'An over-full pipeline never yields a negative budget.');

            image.tileLoadingConcurrency = 0;
            image._currentMaxTilesPerFrame = 2;
            image._tilesInFlight = 0;
            image._updateLevelsForViewport();
            assert.equal(image._tileLoadBudget, 2, 'Disabled by default: the per-frame allowance is the only limit.');

            done();
        });

        viewer.open({
            tileSource: '/test/data/testpattern.dzi'
        });
    });

    // ----------
    QUnit.test('tileLoadingConcurrency is budgeted per image, not per viewer', function(assert) {
        const done = assert.async();

        viewer.world.addHandler('add-item', function() {
            if (viewer.world.getItemCount() < 2) {
                return;
            }

            const first = viewer.world.getItemAt(0);
            const second = viewer.world.getItemAt(1);

            for (const image of [first, second]) {
                image.tileLoadingConcurrency = 16;
                image._currentMaxTilesPerFrame = 1;
            }

            // The images share one ImageLoader, so counting in-flight requests loader-wide would let whichever
            // image is updated first consume the whole target and leave the other one at its per-frame floor.
            first._tilesInFlight = 16;
            second._tilesInFlight = 0;

            first._updateLevelsForViewport();
            assert.equal(first._tileLoadBudget, 1, 'A saturated image drops to its per-frame allowance.');

            second._updateLevelsForViewport();
            assert.equal(second._tileLoadBudget, 16,
                'The other image still gets its own full target, whatever the first one is doing.');

            done();
        });

        viewer.open([
            { tileSource: '/test/data/testpattern.dzi' },
            { tileSource: '/test/data/testpattern.dzi', x: 1.5 }
        ]);
    });

    // ----------
    QUnit.test('in-flight tile count is released exactly once', function(assert) {
        const done = assert.async();

        viewer.addHandler('open', function() {
            const image = viewer.world.getItemAt(0);
            const tile = MockSeadragon.getTile('/test/data/A.png', image);

            let jobOptions = null;
            image._imageLoader = {
                addJob: function(options) {
                    jobOptions = options;
                    return true;
                }
            };
            // The release is what this test is about; what happens with the tile afterwards is not.
            image._onTileLoad = function() {};

            image._tilesInFlight = 0;
            image._loadTile(tile, OpenSeadragon.now());
            assert.equal(image._tilesInFlight, 1, 'Dispatching a tile counts it as in flight.');

            // An aborted job reports the abort and then fails, so both paths run for the same tile. Counting
            // both would drift the counter negative and hand out an unbounded budget forever after.
            jobOptions.abort();
            assert.equal(image._tilesInFlight, 0, 'Aborting releases the tile.');

            jobOptions.callback(null, 'Image load aborted.', null, undefined, 1);
            assert.equal(image._tilesInFlight, 0, 'The failure that follows the abort does not release it twice.');

            done();
        });

        viewer.open({
            tileSource: '/test/data/testpattern.dzi'
        });
    });

    // ----------
    QUnit.test('clip-change event', function(assert) {
        const done = assert.async();
        assert.expect(0);
        const clip = new OpenSeadragon.Rect(100, 100, 800, 800);

        viewer.addHandler('open', function() {
            const image = viewer.world.getItemAt(0);
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
        const done = assert.async();
        const clip = new OpenSeadragon.Rect(100, 200, 800, 500);

        viewer.addHandler('open', function() {
            let image = viewer.world.getItemAt(0);
            let bounds = image.getClippedBounds();
            let expectedBounds = new OpenSeadragon.Rect(1.2, 1.4, 1.6, 1);
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
        const done = assert.async();
        function testDefaultOpacity() {
            viewer.removeHandler('open', testDefaultOpacity);
            const image = viewer.world.getItemAt(0);
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
            const image = viewer.world.getItemAt(0);
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
        const done = assert.async();
        function testDefaultRotation() {
            const image = viewer.world.getItemAt(0);
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
            const image = viewer.world.getItemAt(0);
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
        const done = assert.async();
        function assertRectEquals(actual, expected, message) {
            assert.ok(actual.equals(expected), message + ' should be ' +
                expected.toString() + ', found ' + actual.toString());
        }

        viewer.addHandler('open', function openHandler() {
            viewer.removeHandler('open', openHandler);

            const squareImage = viewer.world.getItemAt(0);
            squareImage.fitBounds(
                new OpenSeadragon.Rect(0, 0, 1, 2),
                OpenSeadragon.Placement.CENTER,
                true);
            let actualBounds = squareImage.getBounds(true);
            let expectedBounds = new OpenSeadragon.Rect(0, 0.5, 1, 1);
            assertRectEquals(actualBounds, expectedBounds, 'Square image bounds');

            const tallImage = viewer.world.getItemAt(1);
            tallImage.fitBounds(
                new OpenSeadragon.Rect(0, 0, 1, 2),
                OpenSeadragon.Placement.TOP_LEFT,
                true);
            actualBounds = tallImage.getBounds(true);
            expectedBounds = new OpenSeadragon.Rect(0, 0, 0.5, 2);
            assertRectEquals(actualBounds, expectedBounds, 'Tall image bounds');

            const wideImage = viewer.world.getItemAt(2);
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
        const done = assert.async();
        function assertRectEquals(actual, expected, message) {
            assert.ok(actual.equals(expected), message + ' should be ' +
                expected.toString() + ', found ' + actual.toString());
        }

        viewer.addHandler('open', function openHandler() {
            viewer.removeHandler('open', openHandler);

            const squareImage = viewer.world.getItemAt(0);
            let actualBounds = squareImage.getBounds(true);
            let expectedBounds = new OpenSeadragon.Rect(0, 0.5, 1, 1);
            assertRectEquals(actualBounds, expectedBounds, 'Square image bounds');

            const tallImage = viewer.world.getItemAt(1);
            actualBounds = tallImage.getBounds(true);
            expectedBounds = new OpenSeadragon.Rect(0, 0, 0.5, 2);
            assertRectEquals(actualBounds, expectedBounds, 'Tall image bounds');

            const wideImage = viewer.world.getItemAt(2);
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
        const done = assert.async();
        function assertRectEquals(actual, expected, message) {
            assert.ok(actual.equals(expected), message + ' should be ' +
                expected.toString() + ', found ' + actual.toString());
        }

        viewer.addHandler('open', function openHandler() {
            viewer.removeHandler('open', openHandler);

            const squareImage = viewer.world.getItemAt(0);
            let actualBounds = squareImage.getBounds(true);
            let expectedBounds = new OpenSeadragon.Rect(-1, -1, 2, 2);
            assertRectEquals(actualBounds, expectedBounds, 'Square image bounds');

            const tallImage = viewer.world.getItemAt(1);
            actualBounds = tallImage.getBounds(true);
            expectedBounds = new OpenSeadragon.Rect(1, 1, 2, 8);
            assertRectEquals(actualBounds, expectedBounds, 'Tall image bounds');

            const wideImage = viewer.world.getItemAt(2);
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
        const done = assert.async();
        viewer.addHandler('open', function openHandler() {
            viewer.removeHandler('open', openHandler);

            const image = viewer.world.getItemAt(0);
            assert.equal(image.getFullyLoaded(), false, 'not fully loaded at first');

            // Zoom out enough that we don't start out with all the tiles loaded.
            viewer.viewport.zoomBy(0.5, null, true);

            let count = 0;

            const fullyLoadedChangeHandler = function(event) {
                if (count === 0) {
                    assert.equal(event.fullyLoaded, true, 'event includes true fullyLoaded property');
                    assert.equal(image.getFullyLoaded(), true, 'image is fully loaded after event');

                    // Zoom in enough that it needs to load some new tiles.
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
        const tiledImageMock = MockSeadragon.getTiledImage(null, {
            wrapHorizontal: false,
            wrapVertical: false,
            source: MockSeadragon.getTileSource({
                width: 1500,
                height: 1000,
                tileWidth: 200,
                tileHeight: 150,
                tileOverlap: 1,
            })
        });
        const _getCornerTiles = OpenSeadragon.TiledImage.prototype._getCornerTiles.bind(tiledImageMock);

        function assertCornerTiles(topLeftBound, bottomRightBound,
            expectedTopLeft, expectedBottomRight) {
            const cornerTiles = _getCornerTiles(11, topLeftBound, bottomRightBound);
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
        const tiledImageMock = MockSeadragon.getTiledImage(null, {
            wrapHorizontal: true,
            wrapVertical: false,
            source: MockSeadragon.getTileSource({
                tileOverlap: 1
            })
        });
        const _getCornerTiles = OpenSeadragon.TiledImage.prototype._getCornerTiles.bind(tiledImageMock);

        function assertCornerTiles(topLeftBound, bottomRightBound,
            expectedTopLeft, expectedBottomRight) {
            const cornerTiles = _getCornerTiles(11, topLeftBound, bottomRightBound);
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
        const tiledImageMock = MockSeadragon.getTiledImage(null, {
            wrapHorizontal: false,
            wrapVertical: true,
            source: MockSeadragon.getTileSource({
                tileOverlap: 1
            })
        });
        const _getCornerTiles = OpenSeadragon.TiledImage.prototype._getCornerTiles.bind(tiledImageMock);

        function assertCornerTiles(topLeftBound, bottomRightBound,
            expectedTopLeft, expectedBottomRight) {
            const cornerTiles = _getCornerTiles(11, topLeftBound, bottomRightBound);
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
