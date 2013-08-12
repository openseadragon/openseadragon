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

        var openHandler = function(eventSender, eventData) {
            viewer.removeHandler('open', openHandler);
            ok(true, 'Open event was sent');
            equal(eventSender, viewer, 'Sender of open event was viewer');
            ok(eventData, 'Handler also received event data');
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

        viewer.addHandler('open', function(eventSender, eventData) {
            ok(false, "The open event should not fire for failed opens");
            start();
        });

        viewer.addHandler('open-failed', function(eventSender, eventData) {
            ok(true, "The open-failed event should be fired when the source 404s");

            equal($(".openseadragon-message").length, 1, "Open failures should display a message");

            ok(testLog.log.contains('["AJAX request returned %s: %s",404,"/test/data/not-a-real-file"]'),
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
                viewer.removeHandler('animationfinish', zoomHandler);
                equal(viewport.getZoom(), 2, 'Zoomed correctly');
                start();
            };

            viewer.addHandler('animationfinish', zoomHandler);
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
                viewer.removeHandler('animationfinish', panHandler);
                center = viewport.getCenter();
                ok(center.x === 0.1 && center.y === 0.1, 'Panned correctly');
                start();
            };

            viewer.addHandler('animationfinish', panHandler);
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

            viewer.removeHandler('animationfinish', stage1);

            ok(center.x !== 0.5 && center.y !== 0.5, 'We start out panned');
            notEqual(viewport.getZoom(), 1, 'We start out zoomed');

            var homeHandler = function() {
                viewer.removeHandler('animationfinish', homeHandler);
                center = viewport.getCenter();
                ok(center.x === 0.5 && center.y === 0.5, 'We end up unpanned');
                equal(viewport.getZoom(), 1, 'We end up unzoomed');
                start();
            };

            viewer.addHandler('animationfinish', homeHandler);
            viewport.goHome(true);
        }

        viewer.addHandler("open", opener);
        viewer.addHandler("animationfinish", stage1);

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
                viewer.removeHandler('animationfinish', clickHandler);
                center = viewport.getCenter();
                ok(center.x > 0.37 && center.x < 0.38 && center.y > 0.37 && center.y < 0.38, 'Panned correctly');
                equal(viewport.getZoom(), 2, 'Zoomed correctly');
                start();
            };

            viewer.addHandler('animationfinish', clickHandler);
            Util.simulateViewerClick(viewer, 0.25, 0.25);
        });

        viewer.open('/test/data/testpattern.dzi');
    });

    // ----------
    asyncTest('Fullscreen', function() {
        viewer.addHandler("open", function () {
            ok(!viewer.isFullPage(), 'Started out not fullpage');
            ok(!$(viewer.element).hasClass('fullpage'),
                'No fullpage class on div');

            viewer.setFullPage(true);
            ok(viewer.isFullPage(), 'Enabled fullpage');
            ok($(viewer.element).hasClass('fullpage'),
                'Fullpage class added to div');

            viewer.setFullPage(false);
            ok(!viewer.isFullPage(), 'Disabled fullpage');
            ok(!$(viewer.element).hasClass('fullpage'),
                'Fullpage class removed from div');
            start();
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
            start();
            // Check that the DOM has been modified
            notEqual(0, $('#example').children().length);

            var closeHandler = function() {
                viewer.removeHandler('close', closeHandler);
                ok(true, 'Close event was sent on Destroy');
            };

            viewer.addHandler('close', closeHandler);
            viewer.destroy();

            // Check that the DOM has been cleaned up
            equal(0, $('#example').children().length);
            equal(null, viewer.canvas);
            equal(null, viewer.keyboardCommandArea);
            equal(null, viewer.container);
            equal(null, viewer.element);
        });
        viewer.open('/test/data/testpattern.dzi');
    });

})();
