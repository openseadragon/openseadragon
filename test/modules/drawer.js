/* global QUnit, $, Util, testLog */

(function() {
    var viewer;
    OpenSeadragon.getBuiltInDrawersForTest().forEach(runDrawerTests);

    function runDrawerTests(drawerType){

        QUnit.module('Drawer-'+drawerType, {
            beforeEach: function () {
                $('<div id="example"></div>').appendTo("#qunit-fixture");

                testLog.reset();
            },
            afterEach: function () {
                if (viewer){
                    viewer.destroy();
                }
                viewer = null;
            }
        });

        // ----------
        var createViewer = function(options) {
            options = options || {};
            // eslint-disable-next-line new-cap
            viewer = OpenSeadragon(OpenSeadragon.extend({
                id:            'example',
                prefixUrl:     '/build/openseadragon/images/',
                springStiffness: 100, // Faster animation = faster tests
                drawer: drawerType,
            }, options));
        };

        // ----------
        QUnit.test('basics', function(assert) {
            var done = assert.async();
            createViewer();
            assert.ok(viewer.drawer, 'Drawer exists');
            assert.equal(viewer.drawer.canRotate(), ['webgl','canvas'].includes(drawerType), 'we can rotate if we have canvas');
            done();
        });

        // ----------
        QUnit.test('rotation', function(assert) {
            var done = assert.async();

            createViewer({
                tileSources: '/test/data/testpattern.dzi'
            });

            // this test only makes sense for canvas drawer because of how it is
            // detected by watching for the canvas context rotate function
            // TODO: add test for actual rotation of the drawn image in a way that
            // applies to the webgl drawer as well as the canvas drawer.
            if(viewer.drawer.getType() !== 'canvas'){
                assert.expect(0);
                done();
            };


            viewer.addHandler('open', function handler(event) {
                viewer.viewport.setRotation(30, true);
                Util.spyOnce(viewer.drawer.context, 'rotate', function() {
                    assert.ok(true, 'drawing with new rotation');
                    done();
                });
            });
        });

        // ----------
        QUnit.test('debug', function(assert) {
            var done = assert.async();
            createViewer({
                tileSources: '/test/data/testpattern.dzi',
                debugMode: true
            });

            // only test this for canvas and webgl drawers
            if( !['canvas','webgl'].includes(viewer.drawer.getType() )){
                assert.expect(0);
                done()
            }
            Util.spyOnce(viewer.drawer, '_drawDebugInfo', function() {
                assert.ok(true, '_drawDebugInfo is called');
                done();
            });
        });

        // ----------
        QUnit.test('sketchCanvas', function(assert) {
            var done = assert.async();

            createViewer({
                tileSources: '/test/data/testpattern.dzi',
            });
            var drawer = viewer.drawer;

            // this test only makes sense for canvas drawer
            if(viewer.drawer.getType() !== 'canvas'){
                assert.expect(0);
                done();
            };

            viewer.addHandler('tile-drawn', function noOpacityHandler() {
                viewer.removeHandler('tile-drawn', noOpacityHandler);
                assert.equal(drawer.sketchCanvas, null,
                    'The sketch canvas should be null if no decimal opacity is used.');
                assert.equal(drawer.sketchContext, null,
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
                    assert.notEqual(drawer.sketchCanvas, null,
                        'The sketch canvas should not be null once a decimal opacity has been used.');
                    assert.notEqual(drawer.sketchContext, null,
                        'The sketch context should not be null once a decimal opacity has been used.');
                    done();
                });
            }
        });

        // ----------
        QUnit.test('deprecations', function(assert) {
            var done = assert.async();

            createViewer({
                tileSources: '/test/data/testpattern.dzi'
            });
            viewer.world.addHandler('add-item', function() {
                // no current deprecated methods
                assert.expect(0);
                done();
            });
        });

    }

})();
