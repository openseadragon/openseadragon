/* global module, asyncTest, $, ok, equal, notEqual, start, test, Util, testLog */

(function() {
    var viewer;

    module('Drawer', {
        setup: function () {
            var example = $('<div id="example"></div>').appendTo("#qunit-fixture");

            testLog.reset();
        },
        teardown: function () {
            if (viewer && viewer.close) {
                viewer.close();
            }

            viewer = null;
        }
    });

    // ----------
    var createViewer = function(options) {
        options = options || {};
        viewer = OpenSeadragon(OpenSeadragon.extend({
            id:            'example',
            prefixUrl:     '/build/openseadragon/images/',
            springStiffness: 100 // Faster animation = faster tests
        }, options));
    };

    // ----------
    asyncTest('basics', function() {
        createViewer();
        ok(viewer.drawer, 'Drawer exists');
        equal(viewer.drawer.canRotate(), OpenSeadragon.supportsCanvas, 'we can rotate if we have canvas');
        equal(viewer.drawer.getOpacity(), 1, 'starts with full opacity');
        viewer.drawer.setOpacity(0.4);
        equal(viewer.drawer.getOpacity(), 0.4, 'setting opacity works');
        start();
    });

    // ----------
    asyncTest('tile-drawing event', function() {
        createViewer({
            tileSources: '/test/data/testpattern.dzi'
        });

        viewer.addHandler('tile-drawing', function handler(event) {
            viewer.removeHandler('tile-drawing', handler);
            equal(event.eventSource, viewer, 'sender of tile-drawing event was viewer');
            ok(event.tile, 'tile-drawing event includes a tile');
            ok(event.context, 'tile-drawing event includes a context');
            ok(event.rendered, 'tile-drawing event includes a rendered');
            start();
        });
    });

    // ----------
    asyncTest('rotation', function() {
        createViewer({
            tileSources: '/test/data/testpattern.dzi'
        });

        viewer.addHandler('open', function handler(event) {
            viewer.viewport.setRotation(30);
            Util.spyOnce(viewer.drawer.context, 'rotate', function() {
                ok(true, 'drawing with new rotation');
                start();
            });
        });
    });

    // ----------
    asyncTest('debug', function() {
        createViewer({
            tileSources: '/test/data/testpattern.dzi',
            debugMode: true
        });

        Util.spyOnce(viewer.drawer, 'drawDebugInfo', function() {
            ok(true, 'drawDebugInfo is called');
            start();
        });
    });

    // ----------
    asyncTest('deprecations', function() {
        createViewer();
        Util.testDeprecation(viewer.drawer, 'addOverlay', viewer, 'addOverlay');
        Util.testDeprecation(viewer.drawer, 'updateOverlay', viewer, 'updateOverlay');
        Util.testDeprecation(viewer.drawer, 'removeOverlay', viewer, 'removeOverlay');
        Util.testDeprecation(viewer.drawer, 'clearOverlays', viewer, 'clearOverlays');
        Util.testDeprecation(viewer.drawer, 'needsUpdate', viewer.world, 'needsUpdate');
        Util.testDeprecation(viewer.drawer, 'numTilesLoaded', viewer.tileCache, 'numTilesLoaded');
        Util.testDeprecation(viewer.drawer, 'reset', viewer.world, 'resetItems');
        Util.testDeprecation(viewer.drawer, 'update', viewer.world, 'update');
        start();
    });

})();
