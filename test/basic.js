/* global module, asyncTest, $, ok, equal, notEqual, start, test, Util, testLog */

(function() {
    var viewer;

    module('Basic', {
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

    // ----------
    asyncTest('Open', function() {
        ok(viewer, 'Viewer exists');

        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            ok(true, 'Open event was sent');
            ok(event, 'Handler received event data');
            equal(event.eventSource, viewer, 'Sender of open event was viewer');
            ok(viewer.viewport, 'Viewport exists');
            ok(viewer.source, 'source exists');
            ok(viewer._updateRequestId, 'timer is on');
            start();
        };

        viewer.addHandler('open', openHandler);
        viewer.open('/test/data/testpattern.dzi');
    });

    asyncTest('Open Error Handling', function() {
        ok(viewer, 'Viewer exists');

        viewer.addHandler('open', function(event) {
            ok(false, "The open event should not fire for failed opens");
            start();
        });

        viewer.addHandler('open-failed', function(event) {
            ok(true, "The open-failed event should be fired when the source 404s");

            equal($(".openseadragon-message").length, 1, "Open failures should display a message");

            ok(testLog.log.contains('["AJAX request returned %d: %s",404,"/test/data/not-a-real-file"]'),
               "AJAX failures should be logged to the console");

            start();
        });

        viewer.open('/test/data/not-a-real-file');
    });

    // ----------
    asyncTest('Zoom', function() {
        viewer.addHandler("open", function () {
            var viewport = viewer.viewport;

            equal(viewport.getZoom(), 1, 'We start out unzoomed');

            var zoomHandler = function() {
                viewer.removeHandler('animation-finish', zoomHandler);
                equal(viewport.getZoom(), 2, 'Zoomed correctly');
                start();
            };

            viewer.addHandler('animation-finish', zoomHandler);
            viewport.zoomTo(2);
        });
        viewer.open('/test/data/testpattern.dzi');
    });

    // ----------
    asyncTest('Pan', function() {
        viewer.addHandler("open", function () {
            var viewport = viewer.viewport,
                center = viewport.getCenter();

            ok(center.x === 0.5 && center.y === 0.5, 'We start out unpanned');

            var panHandler = function() {
                viewer.removeHandler('animation-finish', panHandler);
                center = viewport.getCenter();
                ok(center.x === 0.1 && center.y === 0.1, 'Panned correctly');
                start();
            };

            viewer.addHandler('animation-finish', panHandler);
            viewport.panTo(new OpenSeadragon.Point(0.1, 0.1));
        });

        viewer.open('/test/data/testpattern.dzi');
    });

    // ----------
    asyncTest('Home', function() {
        // Test setup:
        function opener() {
            var viewport = viewer.viewport;
            viewport.panTo(new OpenSeadragon.Point(0.1, 0.1));
            viewport.zoomTo(2);
        }

        function stage1() {
            var viewport = viewer.viewport,
                center = viewport.getCenter();

            viewer.removeHandler('animation-finish', stage1);

            ok(center.x !== 0.5 && center.y !== 0.5, 'We start out panned');
            notEqual(viewport.getZoom(), 1, 'We start out zoomed');

            var homeHandler = function() {
                viewer.removeHandler('animation-finish', homeHandler);
                center = viewport.getCenter();
                ok(center.x === 0.5 && center.y === 0.5, 'We end up unpanned');
                equal(viewport.getZoom(), 1, 'We end up unzoomed');
                start();
            };

            viewer.addHandler('animation-finish', homeHandler);
            viewport.goHome(true);
        }

        viewer.addHandler("open", opener);
        viewer.addHandler("animation-finish", stage1);

        viewer.open('/test/data/testpattern.dzi');
    });

    // ----------
    asyncTest('Click', function() {
        viewer.addHandler("open", function () {
            var viewport = viewer.viewport,
            center = viewport.getCenter();

            ok(center.x === 0.5 && center.y === 0.5, 'We start out unpanned');
            equal(viewport.getZoom(), 1, 'We start out unzoomed');

            var clickHandler = function() {
                viewer.removeHandler('animation-finish', clickHandler);
                center = viewport.getCenter();
                ok(center.x > 0.37 && center.x < 0.38 && center.y > 0.37 && center.y < 0.38, 'Panned correctly');
                equal(viewport.getZoom(), 2, 'Zoomed correctly');
                start();
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

    // ----------
    asyncTest('FullPage', function() {
        viewer.addHandler("open", function () {
            ok(!viewer.isFullPage(), 'Started out not fullpage');
            ok(!$(viewer.element).hasClass('fullpage'),
                'No fullpage class on div');

            var checkEnteringPreFullPage = function(event) {
                viewer.removeHandler('pre-full-page', checkEnteringPreFullPage);
                ok(event.fullPage, 'Switching to fullpage');
                ok(!viewer.isFullPage(), 'Not yet fullpage');
            };

            var checkEnteringFullPage = function(event) {
                viewer.removeHandler('full-page', checkEnteringFullPage);
                ok(event.fullPage, 'Switched to fullpage');
                ok(viewer.isFullPage(), 'Enabled fullpage');
                ok($(viewer.element).hasClass('fullpage'),
                    'Fullpage class added to div');

                var checkExitingPreFullPage = function(event) {
                    viewer.removeHandler('pre-full-page', checkExitingPreFullPage);
                    ok(!event.fullPage, 'Exiting fullpage');
                    ok(viewer.isFullPage(), 'Still fullpage');
                };

                var checkExitingFullPage = function(event) {
                    viewer.removeHandler('full-page', checkExitingFullPage);
                    ok(!event.fullPage, 'Exiting fullpage');
                    ok(!viewer.isFullPage(), 'Disabled fullpage');
                    ok(!$(viewer.element).hasClass('fullpage'),
                        'Fullpage class removed from div');
                    start();
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

    asyncTest('FullScreen', function() {

        if (!OpenSeadragon.supportsFullScreen) {
            expect(0);
            start();
            return;
        }

        viewer.addHandler("open", function () {
            ok(!OpenSeadragon.isFullScreen(), 'Started out not fullscreen');

            var checkEnteringPreFullScreen = function(event) {
                viewer.removeHandler('pre-full-screen', checkEnteringPreFullScreen);
                ok(event.fullScreen, 'Switching to fullscreen');
                ok(!OpenSeadragon.isFullScreen(), 'Not yet fullscreen');
            };

            // The fullscreen mode is always denied during tests so we are
            // exiting directly.
            var checkExitingFullScreen = function(event) {
                viewer.removeHandler('full-screen', checkExitingFullScreen);
                ok(!event.fullScreen, 'Exiting fullscreen');
                ok(!OpenSeadragon.isFullScreen(), 'Disabled fullscreen');
                start();
            };
            viewer.addHandler("pre-full-screen", checkEnteringPreFullScreen);
            viewer.addHandler("full-screen", checkExitingFullScreen);
            viewer.setFullScreen(true);
        });

        viewer.open('/test/data/testpattern.dzi');
    });

    // ----------
    asyncTest('Close', function() {
        viewer.addHandler("open", function () {
            var closeHandler = function() {
                viewer.removeHandler('close', closeHandler);
                ok(!viewer.source, 'no source');
                ok(true, 'Close event was sent');
                ok(!viewer._updateRequestId, 'timer is off');
                setTimeout(function() {
                    ok(!viewer._updateRequestId, 'timer is still off');
                    start();
                }, 100);
            };

            viewer.addHandler('close', closeHandler);
            viewer.close();
        });
        viewer.open('/test/data/testpattern.dzi');
    });

    // ----------
    asyncTest('Destroy', function() {
        viewer.addHandler("open", function () {
            // Check that the DOM has been modified
            notEqual(0, $('#example').children().length);

            var closeCalled = false;
            var closeHandler = function() {
                viewer.removeHandler('close', closeHandler);
                closeCalled = true;
            };

            viewer.addHandler('close', closeHandler);
            viewer.destroy();

            // Check that the DOM has been cleaned up
            equal(0, $('#example').children().length);
            equal(null, viewer.canvas);
            equal(null, viewer.keyboardCommandArea);
            equal(null, viewer.container);
            equal(null, viewer.element);
            equal(true, closeCalled);
            start();
        });
        viewer.open('/test/data/testpattern.dzi');
    });

})();
