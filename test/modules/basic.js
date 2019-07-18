/* global QUnit, $, Util, testLog */

(function() {
    var viewer;

    QUnit.module('Basic', {
        beforeEach: function () {
            $('<div id="example"></div>').appendTo("#qunit-fixture");

            testLog.reset();

            viewer = OpenSeadragon({
                id:            'example',
                prefixUrl:     '/build/openseadragon/images/',
                springStiffness: 100 // Faster animation = faster tests
            });
        },
        afterEach: function () {
            if (viewer && viewer.close) {
                viewer.close();
            }

            viewer = null;
        }
    });

    // ----------
    QUnit.test('Open', function(assert) {
        var done = assert.async();
        assert.ok(viewer, 'Viewer exists');

        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            assert.ok(true, 'Open event was sent');
            assert.ok(event, 'Handler received event data');
            assert.equal(event.eventSource, viewer, 'Sender of open event was viewer');
            assert.ok(viewer.viewport, 'Viewport exists');
            assert.ok(viewer.source, 'source exists');
            assert.ok(viewer._updateRequestId, 'timer is on');
            done();
        };

        viewer.addHandler('open', openHandler);
        viewer.open('/test/data/testpattern.dzi');
    });

    QUnit.test('Open Error Handling', function(assert) {
        var done = assert.async();
        assert.ok(viewer, 'Viewer exists');

        viewer.addHandler('open', function(event) {
            assert.ok(false, "The open event should not fire for failed opens");
            done();
        });

        viewer.addHandler('open-failed', function(event) {
            assert.ok(true, "The open-failed event should be fired when the source 404s");

            assert.equal($(".openseadragon-message").length, 1, "Open failures should display a message");

            assert.ok(testLog.log.contains('["AJAX request returned %d: %s",404,"/test/data/not-a-real-file"]'),
               "AJAX failures should be logged to the console");

            done();
        });

        viewer.open('/test/data/not-a-real-file');
    });

    QUnit.test('Zoom', function(assert) {
        var done = assert.async();
        viewer.addHandler("open", function () {
            var viewport = viewer.viewport;

            assert.equal(viewport.getZoom(), 1, 'We start out unzoomed');

            var zoomHandler = function() {
                viewer.removeHandler('animation-finish', zoomHandler);
                assert.equal(viewport.getZoom(), 2, 'Zoomed correctly');
                done();
            };

            viewer.addHandler('animation-finish', zoomHandler);
            viewport.zoomTo(2);
        });
        viewer.open('/test/data/testpattern.dzi');
    });

    QUnit.test('Pan', function(assert) {
        var done = assert.async();
        viewer.addHandler("open", function () {
            var viewport = viewer.viewport,
                center = viewport.getCenter();

            assert.ok(center.x === 0.5 && center.y === 0.5, 'We start out unpanned');

            var panHandler = function() {
                viewer.removeHandler('animation-finish', panHandler);
                center = viewport.getCenter();
                Util.assessNumericValue(assert, center.x, 0.1, 0.00001, 'panned horizontally');
                Util.assessNumericValue(assert, center.y, 0.1, 0.00001, 'panned vertically');
                done();
            };

            viewer.addHandler('animation-finish', panHandler);
            viewport.panTo(new OpenSeadragon.Point(0.1, 0.1));
        });

        viewer.open('/test/data/testpattern.dzi');
    });

    QUnit.test('Home', function(assert) {
        var done = assert.async();
        // Test beforeEach:
        function opener() {
            var viewport = viewer.viewport;
            viewport.panTo(new OpenSeadragon.Point(0.1, 0.1));
            viewport.zoomTo(2);
        }

        function stage1() {
            var viewport = viewer.viewport,
                center = viewport.getCenter();

            viewer.removeHandler('animation-finish', stage1);

            assert.ok(center.x !== 0.5 && center.y !== 0.5, 'We start out panned');
            assert.notEqual(viewport.getZoom(), 1, 'We start out zoomed');

            var homeHandler = function() {
                viewer.removeHandler('animation-finish', homeHandler);
                center = viewport.getCenter();
                assert.ok(center.x === 0.5 && center.y === 0.5, 'We end up unpanned');
                assert.equal(viewport.getZoom(), 1, 'We end up unzoomed');
                done();
            };

            viewer.addHandler('animation-finish', homeHandler);
            viewer.viewport.goHome(true);
        }

        viewer.addHandler("open", opener);
        viewer.addHandler("animation-finish", stage1);

        viewer.open('/test/data/testpattern.dzi');
    });

    QUnit.test('Click', function(assert) {
        var done = assert.async();
        viewer.addHandler("open", function () {
            var viewport = viewer.viewport,
            center = viewport.getCenter();

            assert.ok(center.x === 0.5 && center.y === 0.5, 'We start out unpanned');
            assert.equal(viewport.getZoom(), 1, 'We start out unzoomed');

            var clickHandler = function() {
                viewer.removeHandler('animation-finish', clickHandler);
                center = viewport.getCenter();
                assert.ok(center.x > 0.37 && center.x < 0.38 && center.y > 0.37 && center.y < 0.38, 'Panned correctly');
                assert.equal(viewport.getZoom(), 2, 'Zoomed correctly');
                done();
            };

            viewer.addHandler('animation-finish', clickHandler);
            Util.simulateViewerClickWithDrag( {
                viewer: viewer,
                widthFactor: 0.25,
                heightFactor: 0.25,
                dragCount: 0,
                dragDx: 0,
                dragDy: 0
            } );
        } );

        viewer.open('/test/data/testpattern.dzi');
    });

    QUnit.test('FullPage', function(assert) {
        var done = assert.async();
        viewer.addHandler("open", function () {
            assert.ok(!viewer.isFullPage(), 'Started out not fullpage');
            assert.ok(!$(viewer.element).hasClass('fullpage'),
                'No fullpage class on div');

            var checkEnteringPreFullPage = function(event) {
                viewer.removeHandler('pre-full-page', checkEnteringPreFullPage);
                assert.ok(event.fullPage, 'Switching to fullpage');
                assert.ok(!viewer.isFullPage(), 'Not yet fullpage');
            };

            var checkEnteringFullPage = function(event) {
                viewer.removeHandler('full-page', checkEnteringFullPage);
                assert.ok(event.fullPage, 'Switched to fullpage');
                assert.ok(viewer.isFullPage(), 'Enabled fullpage');
                assert.ok($(viewer.element).hasClass('fullpage'),
                    'Fullpage class added to div');

                var checkExitingPreFullPage = function(event) {
                    viewer.removeHandler('pre-full-page', checkExitingPreFullPage);
                    assert.ok(!event.fullPage, 'Exiting fullpage');
                    assert.ok(viewer.isFullPage(), 'Still fullpage');
                };

                var checkExitingFullPage = function(event) {
                    viewer.removeHandler('full-page', checkExitingFullPage);
                    assert.ok(!event.fullPage, 'Exiting fullpage');
                    assert.ok(!viewer.isFullPage(), 'Disabled fullpage');
                    assert.ok(!$(viewer.element).hasClass('fullpage'),
                        'Fullpage class removed from div');
                    done();
                };

                viewer.addHandler("pre-full-page", checkExitingPreFullPage);
                viewer.addHandler("full-page", checkExitingFullPage);
                viewer.setFullPage(false);
            };
            viewer.addHandler("pre-full-page", checkEnteringPreFullPage);
            viewer.addHandler("full-page", checkEnteringFullPage);
            viewer.setFullPage(true);
        });

        viewer.open('/test/data/testpattern.dzi');
    });

    QUnit.test('FullScreen', function(assert) {
        var done = assert.async();
        if (!OpenSeadragon.supportsFullScreen) {
            assert.expect(0);
            done();
            return;
        }

        viewer.addHandler("open", function () {
            assert.ok(!OpenSeadragon.isFullScreen(), 'Started out not fullscreen');

            var checkEnteringPreFullScreen = function(event) {
                viewer.removeHandler('pre-full-screen', checkEnteringPreFullScreen);
                assert.ok(event.fullScreen, 'Switching to fullscreen');
                assert.ok(!OpenSeadragon.isFullScreen(), 'Not yet fullscreen');
            };

            // The fullscreen mode is always denied during tests so we are
            // exiting directly.
            var checkExitingFullScreen = function(event) {
                viewer.removeHandler('full-screen', checkExitingFullScreen);
                assert.ok(!event.fullScreen, 'Exiting fullscreen');
                assert.ok(!OpenSeadragon.isFullScreen(), 'Disabled fullscreen');
                done();
            };
            viewer.addHandler("pre-full-screen", checkEnteringPreFullScreen);
            viewer.addHandler("full-screen", checkExitingFullScreen);
            viewer.setFullScreen(true);
        });

        viewer.open('/test/data/testpattern.dzi');
    });

    QUnit.test('Close', function(assert) {
        var done = assert.async();
        viewer.addHandler("open", function () {
            var closeHandler = function() {
                viewer.removeHandler('close', closeHandler);
                assert.ok(!viewer.source, 'no source');
                assert.ok(true, 'Close event was sent');
                setTimeout(function() {
                    assert.ok(!viewer._updateRequestId, 'timer is off');
                    done();
                }, 100);
            };

            viewer.addHandler('close', closeHandler);
            viewer.close();
        });
        viewer.open('/test/data/testpattern.dzi');
    });

    QUnit.test('Destroy', function(assert) {
        var done = assert.async();
        viewer.addHandler("open", function () {
            // Check that the DOM has been modified
            assert.notEqual(0, $('#example').children().length);

            var closeCalled = false;
            var closeHandler = function() {
                viewer.removeHandler('close', closeHandler);
                closeCalled = true;
            };

            viewer.addHandler('close', closeHandler);
            viewer.destroy();

            // Check that the DOM has been cleaned up
            assert.equal(0, $('#example').children().length);
            assert.equal(null, viewer.canvas);
            assert.equal(null, viewer.keyboardCommandArea);
            assert.equal(null, viewer.container);
            assert.equal(null, viewer.element);
            assert.equal(true, closeCalled);
            viewer = null;
            done();
        });
        viewer.open('/test/data/testpattern.dzi');
    });


    // The Wikipedia logo has CORS enabled
    var corsImg = 'http://upload.wikimedia.org/wikipedia/en/b/bc/Wiki.png';

    QUnit.test( 'CrossOriginPolicyMissing', function (assert) {
        var done = assert.async();
        viewer.crossOriginPolicy = false;
        viewer.smoothTileEdgesMinZoom = Infinity;
        viewer.open( {
            type: 'legacy-image-pyramid',
            levels: [ {
                    url: corsImg,
                    width: 135,
                    height: 155
                } ]
        } );
        viewer.addOnceHandler('tile-drawn', function() {
            assert.ok(OpenSeadragon.isCanvasTainted(viewer.drawer.context.canvas),
                "Canvas should be tainted.");
            done();
        });

    } );

    QUnit.test( 'CrossOriginPolicyAnonymous', function (assert) {
        var done = assert.async();

        viewer.crossOriginPolicy = 'Anonymous';
        viewer.open( {
            type: 'legacy-image-pyramid',
            levels: [ {
                    url: corsImg,
                    width: 135,
                    height: 155
                } ]
        } );
        viewer.addOnceHandler('tile-drawn', function() {
            assert.ok(!OpenSeadragon.isCanvasTainted(viewer.drawer.context.canvas),
                "Canvas should not be tainted.");
            done();
        });

    } );

    QUnit.test( 'CrossOriginPolicyOption', function (assert) {
        var done = assert.async();

        viewer.crossOriginPolicy = "Anonymous";
        viewer.smoothTileEdgesMinZoom = Infinity;
        viewer.addTiledImage( {
            tileSource: {
                type: 'legacy-image-pyramid',
                levels: [ {
                    url: corsImg,
                    width: 135,
                    height: 155
                } ]
            },
            crossOriginPolicy : false
        } );
        viewer.addOnceHandler('tile-drawn', function() {
            assert.ok(OpenSeadragon.isCanvasTainted(viewer.drawer.context.canvas),
                "Canvas should be tainted.");
            done();
        });

    } );

    QUnit.test( 'CrossOriginPolicyTileSource', function (assert) {
        var done = assert.async();

        viewer.crossOriginPolicy = false;
        viewer.smoothTileEdgesMinZoom = Infinity;
        viewer.addTiledImage( {
            tileSource: {
                type: 'legacy-image-pyramid',
                levels: [ {
                    url: corsImg,
                    width: 135,
                    height: 155
                } ],
                crossOriginPolicy : "Anonymous"
            }
        } );
        viewer.addOnceHandler('tile-drawn', function() {
            assert.ok(!OpenSeadragon.isCanvasTainted(viewer.drawer.context.canvas),
                "Canvas should not be tainted.");
            done();
        });

    } );


    QUnit.test('SetDebugMode', function(assert) {
        var done = assert.async();
        assert.ok(viewer, 'Viewer exists');

        var checkImageTilesDebugState = function (expectedState) {

            for (var i = 0; i < viewer.world.getItemCount(); i++) {
                if(viewer.world.getItemAt(i).debugMode != expectedState) {
                    return false;
                }
            }
            return true;
        };

        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);

            //Ensure we start with debug mode turned off
            viewer.setDebugMode(false);
            assert.ok(checkImageTilesDebugState(false), "All image tiles have debug mode turned off.");
            assert.ok(!viewer.debugMode, "Viewer debug mode is turned off.");

            //Turn debug mode on and check that the Viewer and all tiled images are in debug mode.
            viewer.setDebugMode(true);
            assert.ok(checkImageTilesDebugState(true), "All image tiles have debug mode turned on.");
            assert.ok(viewer.debugMode, "Viewer debug mode is turned on.");

            done();
        };

        viewer.addHandler('open', openHandler);
        viewer.open('/test/data/testpattern.dzi');
    });

    //Version numbers are injected by the build process, so skip version tests if we are only running code coverage
    if(!window.isCoverageTest ){
        QUnit.test('version object', function(assert) {
            assert.equal(typeof OpenSeadragon.version.versionStr, "string", "versionStr should be a string");
            assert.ok(OpenSeadragon.version.major >= 0, "major should be a positive number");
            assert.ok(OpenSeadragon.version.minor >= 0, "minor should be a positive number");
            assert.ok(OpenSeadragon.version.revision >= 0, "revision should be a positive number");
        });
    }
})();
