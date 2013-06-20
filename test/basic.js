(function() {

    module('Basic');

    // TODO: Test drag

    var viewer = null;

    // ----------
    asyncTest('Open', function() {
        $(document).ready(function() {
            viewer = OpenSeadragon({
                id:            'example',
                prefixUrl:     '/build/openseadragon/images/',
                tileSources:   '/test/data/testpattern.dzi',
                springStiffness: 100 // Faster animation = faster tests
            });

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
        });
    });

    // ----------
    asyncTest('Zoom', function() {
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

    // ----------
    asyncTest('Pan', function() {
        var viewport = viewer.viewport;
        var center = viewport.getCenter();
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

    // ----------
    asyncTest('Home', function() {
        var viewport = viewer.viewport;
        var center = viewport.getCenter();
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
    });

    // ----------
    asyncTest('Click', function() {
        var viewport = viewer.viewport;
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

    // ----------
    test('Fullscreen', function() {
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
    });

    // ----------
    asyncTest('Close', function() {
        var closeHandler = function() {
            viewer.removeHandler('close', closeHandler);
            ok(!viewer.source, 'no source');
            $('#example').empty();
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

})();
