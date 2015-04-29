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
        start();
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
    asyncTest('sketchCanvas', function() {
        createViewer({
            tileSources: '/test/data/testpattern.dzi'
        });
        var drawer = viewer.drawer;

        viewer.addHandler('tile-drawn', function noOpacityHandler() {
            viewer.removeHandler('tile-drawn', noOpacityHandler);
            equal(drawer.sketchCanvas, null,
                'The sketch canvas should be null if no decimal opacity is used.');
            equal(drawer.sketchContext, null,
                'The sketch context should be null if no decimal opacity is used.');
            testOpacityDecimal();
        });

        function testOpacityDecimal() {
            var tiledImage;
            viewer.addTiledImage({
                tileSource: '/test/data/testpattern.dzi',
                opacity: 0.5,
                success: function(event) {
                    tiledImage = event.item;
                }
            });

            viewer.addHandler('tile-drawn', function opacityDecimalHandler(event) {
                if (tiledImage !== event.tiledImage) {
                    return;
                }
                viewer.removeHandler('tile-drawn', opacityDecimalHandler);
                notEqual(drawer.sketchCanvas, null,
                    'The sketch canvas should not be null once a decimal opacity has been used.');
                notEqual(drawer.sketchContext, null,
                    'The sketch context should not be null once a decimal opacity has been used.');
                start();
            });
        }
    });

    // ----------
    asyncTest('deprecations', function() {
        createViewer({
            tileSources: '/test/data/testpattern.dzi'
        });
        viewer.world.addHandler('add-item', function() {
            Util.testDeprecation(viewer.drawer, 'addOverlay', viewer, 'addOverlay');
            Util.testDeprecation(viewer.drawer, 'updateOverlay', viewer, 'updateOverlay');
            Util.testDeprecation(viewer.drawer, 'removeOverlay', viewer, 'removeOverlay');
            Util.testDeprecation(viewer.drawer, 'clearOverlays', viewer, 'clearOverlays');
            Util.testDeprecation(viewer.drawer, 'needsUpdate', viewer.world, 'needsDraw');
            Util.testDeprecation(viewer.drawer, 'numTilesLoaded', viewer.tileCache, 'numTilesLoaded');
            Util.testDeprecation(viewer.drawer, 'reset', viewer.world, 'resetItems');
            Util.testDeprecation(viewer.drawer, 'update', viewer.world, 'draw');
            Util.testDeprecation(viewer.drawer, 'setOpacity', viewer.world.getItemAt(0), 'setOpacity');
            Util.testDeprecation(viewer.drawer, 'getOpacity', viewer.world.getItemAt(0), 'getOpacity');
            start();
        });
    });

})();
