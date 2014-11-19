/* global module, asyncTest, $, ok, equal, notEqual, start, test, Util, testLog */

(function() {
    var viewer;

    module('Drawer', {
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
    asyncTest('basics', function() {
        ok(viewer.drawer, 'Drawer exists');
        equal(viewer.drawer.canRotate(), OpenSeadragon.supportsCanvas, 'we can rotate if we have canvas');
        equal(viewer.drawer.getOpacity(), 1, 'starts with full opacity');
        viewer.drawer.setOpacity(0.4);
        equal(viewer.drawer.getOpacity(), 0.4, 'setting opacity works');
        start();
    });

    // ----------
    asyncTest('tile-drawing event', function() {
        viewer.addHandler('tile-drawing', function handler(event) {
            viewer.removeHandler('tile-drawing', handler);
            equal(event.eventSource, viewer, 'sender of tile-drawing event was viewer');
            ok(event.tile, 'tile-drawing event includes a tile');
            ok(event.context, 'tile-drawing event includes a context');
            ok(event.rendered, 'tile-drawing event includes a rendered');
            start();
        });

        viewer.open('/test/data/testpattern.dzi');
    });

})();
