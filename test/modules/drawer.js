/* global QUnit, $, Util, testLog */

(function() {
    let viewer;
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
        const createViewer = function(options) {
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
            const done = assert.async();
            createViewer();
            assert.ok(viewer.drawer, 'Drawer exists');
            assert.equal(viewer.drawer.canRotate(), ['webgl','canvas'].includes(drawerType), 'we can rotate if we have canvas or webgl');
            done();
        });

        // ----------
        QUnit.test('isWebGL2', function(assert) {
            const done = assert.async();
            createViewer();

            if (viewer.drawer.getType() !== 'webgl') {
                assert.expect(0);
                done();
                return;
            }

            const probeCanvas = document.createElement('canvas');
            const webgl2Context = probeCanvas.getContext('webgl2');
            const webgl2Supported = !!webgl2Context;
            if (webgl2Context && webgl2Context.getExtension) {
                const ext = webgl2Context.getExtension('WEBGL_lose_context');
                if (ext) {
                    ext.loseContext();
                }
            }

            assert.equal(
                viewer.drawer.isWebGL2(),
                webgl2Supported,
                'isWebGL2 matches WebGL2 context availability'
            );
            done();
        });

        // ----------
        QUnit.test('rotation', function(assert) {
            const done = assert.async();

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
            const done = assert.async();
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
            const done = assert.async();

            createViewer({
                tileSources: '/test/data/testpattern.dzi',
            });
            const drawer = viewer.drawer;

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
                let tiledImage;
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
            const done = assert.async();

            createViewer({
                tileSources: '/test/data/testpattern.dzi'
            });
            viewer.world.addHandler('add-item', function() {
                // no current deprecated methods
                assert.expect(0);
                done();
            });
        });

        if (drawerType === 'webgl') {
            // ----------
            QUnit.test('Webgl context recovery: enabled. Recreates webgl drawer and fires webgl-context-recovered', function(assert) {
                const done = assert.async();
                const timeout = Util.timeWatcher(assert, 5000);

                // Create viewer without tileSources so we can setup testing before we open and draw an image
                createViewer();

                if (viewer.drawer.getType() !== 'webgl') {
                    assert.expect(0);
                    done();
                    return;
                }

                viewer.drawer.setContextRecoveryEnabled(true);

                // Patch before opening an image
                const oldDrawer = viewer.drawer;
                const gl = oldDrawer._gl;
                const originalGetParameter = gl.getParameter;

                gl.getParameter = function(param) {
                    if (param === gl.MAX_TEXTURE_IMAGE_UNITS) {
                        return 0;
                    }
                    return originalGetParameter.call(this, param);
                };

                // Set up event handler before opening an image
                viewer.addOnceHandler('webgl-context-recovered', function(event) {
                    gl.getParameter = originalGetParameter;
                    timeout.done();

                    assert.strictEqual(event.oldDrawer, oldDrawer, 'event.oldDrawer is the failing drawer');
                    assert.ok(event.newDrawer, 'event.newDrawer is present');
                    assert.notStrictEqual(event.newDrawer, oldDrawer, 'newDrawer is a different instance');
                    assert.strictEqual(viewer.drawer, event.newDrawer, 'viewer.drawer is replaced with newDrawer');
                    assert.equal(viewer.drawer.getType(), 'webgl', 'viewer.drawer remains WebGL after recovery');
                    done();
                });

                // open the image - this will trigger draw cycle with patched code and event handlers in place
                viewer.open('/test/data/testpattern.dzi');
            });

            // ----------
            QUnit.test('Webgl context recovery: disabled. Fires webgl-context-recovery-failed and rethrows', function(assert) {
                const done = assert.async();
                const timeout = Util.timeWatcher(assert, 5000);

                // Create viewer without tileSources so we can setup testing before we open and draw an image
                createViewer();

                if (viewer.drawer.getType() !== 'webgl') {
                    assert.expect(0);
                    done();
                    return;
                }

                viewer.drawer.setContextRecoveryEnabled(false);

                // Patch before opening an image
                const oldDrawer = viewer.drawer;
                const gl = oldDrawer._gl;
                const originalGetParameter = gl.getParameter;

                gl.getParameter = function(param) {
                    if (param === gl.MAX_TEXTURE_IMAGE_UNITS) {
                        return 0;
                    }
                    return originalGetParameter.call(this, param);
                };

                let eventFired = false;
                let errorSuppressed = false;

                // Helper function to complete the test when both event fired and error suppressed
                const completeTest = function() {
                    if (eventFired && errorSuppressed) {
                        gl.getParameter = originalGetParameter;
                        window.onerror = originalErrorHandler;
                        timeout.done();
                        done();
                    }
                };

                // Set up event handler before opening an image
                viewer.addOnceHandler('webgl-context-recovery-failed', function(event) {
                    eventFired = true;

                    assert.ok(event, 'webgl-context-recovery-failed event fired');
                    assert.strictEqual(event.drawer, oldDrawer, 'event.drawer is the failing drawer');
                    assert.strictEqual(event.canvasDrawer, null, 'event.canvasDrawer is null when recovery not attempted');
                    assert.strictEqual(viewer.drawer, oldDrawer, 'viewer.drawer is unchanged');
                    assert.equal(viewer.drawer.getType(), 'webgl', 'viewer.drawer remains WebGL when recovery is disabled');

                    // Check if we can complete the test (error may have already been suppressed)
                    completeTest();
                });

                // Set up minimal error handler to suppress the expected re-thrown error
                // This error is expected behavior when recovery is disabled
                const originalErrorHandler = window.onerror;
                window.onerror = function(message) {
                    // Only suppress the specific error we expect, and only after the event has fired
                    if (/max_texture_image_units/i.test(message) && eventFired) {
                        errorSuppressed = true;
                        // Check if we can complete the test now
                        completeTest();
                        return true; // Suppress the error
                    }
                    // Let other errors propagate
                    if (originalErrorHandler) {
                        return originalErrorHandler.apply(this, arguments);
                    }
                    return false;
                };

                // open an image - this will trigger draw cycle with patched code
                // The error will be thrown, event will fire, then error will be re-thrown (expected behavior)
                viewer.open('/test/data/testpattern.dzi');

                // Fallback timeout in case error doesn't get thrown (shouldn't happen, but safe)
                setTimeout(function() {
                    if (!eventFired) {
                        gl.getParameter = originalGetParameter;
                        window.onerror = originalErrorHandler;
                        timeout.done();
                        assert.ok(false, 'Expected webgl-context-recovery-failed event but it did not fire');
                        done();
                    } else if (!errorSuppressed) {
                        // Event fired but error wasn't suppressed - this shouldn't happen but handle it
                        gl.getParameter = originalGetParameter;
                        window.onerror = originalErrorHandler;
                        timeout.done();
                        assert.ok(false, 'Event fired but expected error was not thrown/suppressed');
                        done();
                    }
                }, 3000);
            });

            // ----------
            QUnit.test('Webgl context recovery: enabled. Falls back to canvas when recreation fails', function(assert) {
                const done = assert.async();
                const timeout = Util.timeWatcher(assert, 5000);

                // Create viewer without tileSources so we can setup testing before we open and draw an image
                createViewer();

                if (viewer.drawer.getType() !== 'webgl') {
                    assert.expect(0);
                    done();
                    return;
                }

                viewer.drawer.setContextRecoveryEnabled(true);

                // Patch before opening an image
                const oldDrawer = viewer.drawer;
                const gl = oldDrawer._gl;
                const originalGetParameter = gl.getParameter;
                const originalRequestDrawer = viewer.requestDrawer;

                gl.getParameter = function(param) {
                    if (param === gl.MAX_TEXTURE_IMAGE_UNITS) {
                        return 0;
                    }
                    return originalGetParameter.call(this, param);
                };

                // Patch requestDrawer to fail WebGL recreation
                viewer.requestDrawer = function(drawerCandidate, options) {
                    if (drawerCandidate === 'webgl') {
                        return false;
                    }
                    return originalRequestDrawer.call(this, drawerCandidate, options);
                };

                // Set up event handler before opening an image
                viewer.addOnceHandler('webgl-context-recovery-failed', function(event) {
                    viewer.requestDrawer = originalRequestDrawer;
                    gl.getParameter = originalGetParameter;
                    timeout.done();

                    assert.strictEqual(event.drawer, oldDrawer, 'event.drawer is the failing WebGL drawer');
                    assert.ok(event.canvasDrawer, 'event.canvasDrawer is provided');
                    assert.strictEqual(viewer.drawer, event.canvasDrawer, 'viewer.drawer is replaced with canvasDrawer');
                    assert.equal(viewer.drawer.getType(), 'canvas', 'viewer.drawer switches to CanvasDrawer on failed recovery');
                    done();
                });

                // open the image - this will trigger draw cycle with patched code and event handlers in place
                viewer.open('/test/data/testpattern.dzi');
            });
        }

    }

})();
