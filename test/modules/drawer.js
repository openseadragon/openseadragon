/* global QUnit, $, Util, testLog */

(function() {
    let viewer;
    OpenSeadragon.getBuiltInDrawersForTest().forEach(runDrawerTests);

    function runDrawerTests(drawerType){
        let getContextPrototypeRestore = null;

        QUnit.module('Drawer-'+drawerType, {
            beforeEach: function () {
                $('<div id="example"></div>').appendTo("#qunit-fixture");

                testLog.reset();
            },
            afterEach: function () {
                if (getContextPrototypeRestore) {
                    getContextPrototypeRestore();
                }
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
                const oldGlContext = oldDrawer._glContext;
                const gl = oldDrawer._glContext.getContext();
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

                    assert.ok(event.drawer, 'event.drawer is present');
                    assert.strictEqual(event.drawer, oldDrawer, 'event.drawer is the same drawer instance');
                    assert.strictEqual(viewer.drawer, oldDrawer, 'viewer.drawer is the same drawer instance');
                    assert.strictEqual(viewer.drawer, event.drawer, 'viewer.drawer matches event.drawer');
                    assert.notStrictEqual(viewer.drawer._glContext, oldGlContext, 'glContext is a new instance');
                    assert.ok(viewer.drawer._glContext.getContext(), 'new glContext has valid context');
                    assert.equal(viewer.drawer.getType(), 'webgl', 'viewer.drawer remains WebGL after recovery');
                    done();
                });

                // open the image - this will trigger draw cycle with patched code and event handlers in place
                viewer.open('/test/data/testpattern.dzi');
            });

            // ----------
            QUnit.test('Webgl context recovery: disabled. Rethrows on WebGL failure (no fallback)', function(assert) {
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

                // Patch before opening an image so getMaxTextures() returns 0 and draw throws
                const oldDrawer = viewer.drawer;
                const gl = oldDrawer._glContext.getContext();
                const originalGetParameter = gl.getParameter;

                gl.getParameter = function(param) {
                    if (param === gl.MAX_TEXTURE_IMAGE_UNITS) {
                        return 0;
                    }
                    return originalGetParameter.call(this, param);
                };

                const previousOnError = window.onerror;
                window.onerror = function(message) {
                    if (message && message.indexOf('MAX_TEXTURE_IMAGE_UNITS') !== -1) {
                        gl.getParameter = originalGetParameter;
                        window.onerror = previousOnError;
                        timeout.done();
                        assert.strictEqual(viewer.drawer, oldDrawer, 'viewer.drawer unchanged when recovery disabled (no fallback)');
                        assert.equal(viewer.drawer.getType(), 'webgl', 'drawer remains WebGL when recovery disabled');
                        done();
                        return true;
                    }
                    if (previousOnError) {
                        return previousOnError.apply(this, arguments);
                    }
                    return false;
                };

                // open the image - this will trigger draw cycle with patched code; error will be caught by window.onerror
                viewer.open('/test/data/testpattern.dzi');
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
                const gl = oldDrawer._glContext.getContext();
                const originalGetParameter = gl.getParameter;
                const originalRequestDrawer = viewer.requestDrawer;

                gl.getParameter = function(param) {
                    if (param === gl.MAX_TEXTURE_IMAGE_UNITS) {
                        return 0;
                    }
                    return originalGetParameter.call(this, param);
                };

                // Patch HTMLCanvasElement.prototype.getContext so _recreateContext()'s new canvas gets a context with invalid MAX_TEXTURE_IMAGE_UNITS
                const originalGetContextProto = HTMLCanvasElement.prototype.getContext;
                getContextPrototypeRestore = function() {
                    HTMLCanvasElement.prototype.getContext = originalGetContextProto;
                    getContextPrototypeRestore = null;
                };
                HTMLCanvasElement.prototype.getContext = function(contextType) {
                    const ctx = originalGetContextProto.apply(this, arguments);
                    if (ctx && typeof ctx.getParameter === 'function' && ctx.MAX_TEXTURE_IMAGE_UNITS !== undefined) {
                        const orig = ctx.getParameter.bind(ctx);
                        ctx.getParameter = function(p) {
                            if (p === ctx.MAX_TEXTURE_IMAGE_UNITS) {
                                return 0;
                            }
                            return orig(p);
                        };
                    }
                    return ctx;
                };

                // Set up event handler before opening an image
                viewer.addOnceHandler('webgl-context-recovery-failed', function(event) {
                    if (getContextPrototypeRestore) {
                        getContextPrototypeRestore();
                    }
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

            // ----------
            QUnit.test('Webgl context recovery: enabled. Recovery succeeds when new context is valid', function(assert) {
                const done = assert.async();
                const timeout = Util.timeWatcher(assert, 5000);

                createViewer();

                if (viewer.drawer.getType() !== 'webgl') {
                    assert.expect(0);
                    done();
                    return;
                }

                viewer.drawer.setContextRecoveryEnabled(true);

                // Patch only the current context so first draw throws; do NOT patch getContext,
                // so the new context created in _recreateContext() will have valid MAX_TEXTURE_IMAGE_UNITS
                const gl = viewer.drawer._glContext.getContext();
                const originalGetParameter = gl.getParameter;

                gl.getParameter = function(param) {
                    if (param === gl.MAX_TEXTURE_IMAGE_UNITS) {
                        return 0;
                    }
                    return originalGetParameter.call(this, param);
                };

                viewer.addOnceHandler('webgl-context-recovered', function(event) {
                    gl.getParameter = originalGetParameter;
                    timeout.done();

                    assert.ok(event.drawer, 'event.drawer is the WebGL drawer');
                    assert.equal(event.drawer.getType(), 'webgl', 'drawer remains WebGL after recovery');
                    assert.strictEqual(viewer.drawer, event.drawer, 'viewer.drawer is unchanged (same instance)');
                    assert.equal(viewer.drawer.getType(), 'webgl', 'viewer.drawer remains WebGL after successful recovery');
                    done();
                });

                viewer.open('/test/data/testpattern.dzi');
            });
        }
    }

    // ----------
    // Demo scenario 3: Bad shader (simulated) with fallback. Simulate WebGL failure via initShaderProgram patch
    // so the functional test rejects WebGL; viewer falls back to canvas.
    QUnit.module('Drawer: fallback to canvas when WebGL fails', {
        beforeEach: function () {
            $('<div id="example"></div>').appendTo("#qunit-fixture");
            testLog.reset();
            this._originalInitShaderProgram = OpenSeadragon.WebGLDrawer.initShaderProgram;
            this._initShaderCallCount = 0;
            const self = this;
            OpenSeadragon.WebGLDrawer.initShaderProgram = function(gl, vsSource, fsSource) {
                self._initShaderCallCount++;
                const originalAttach = gl.attachShader.bind(gl);
                let attachCount = 0;
                gl.attachShader = function(program, shader) {
                    attachCount++;
                    if (self._initShaderCallCount === 1 && attachCount === 1) {
                        shader = null;
                    }
                    return originalAttach(program, shader);
                };
                try {
                    return self._originalInitShaderProgram(gl, vsSource, fsSource);
                } finally {
                    gl.attachShader = originalAttach;
                }
            };
            viewer = OpenSeadragon(OpenSeadragon.extend({
                id: 'example',
                prefixUrl: '/build/openseadragon/images/',
                springStiffness: 100,
                drawer: ['webgl', 'canvas']
            }));
        },
        afterEach: function () {
            OpenSeadragon.WebGLDrawer.initShaderProgram = this._originalInitShaderProgram;
            if (viewer) {
                viewer.destroy();
            }
            viewer = null;
        }
    });

    QUnit.test('Uses canvas when WebGL is rejected (demo scenario 3: bad shader)', function(assert) {
        assert.ok(viewer.drawer, 'viewer has a drawer');
        assert.equal(viewer.drawer.getType(), 'canvas', 'viewer uses canvas when WebGL shader fails');
    });

    // ----------
    // Demo scenario 4: Black pixels (simulated) with fallback. Simulate WebGL failure via readPixels returning
    // all zeros so the functional test rejects WebGL; viewer falls back to canvas.
    QUnit.module('Drawer: fallback to canvas when WebGL fails (demo scenario 4, black pixels)', {
        beforeEach: function () {
            $('<div id="example"></div>').appendTo("#qunit-fixture");
            testLog.reset();
            this._originalGetContext = HTMLCanvasElement.prototype.getContext;
            const self = this;
            HTMLCanvasElement.prototype.getContext = function(type) {
                const gl = self._originalGetContext.apply(this, arguments);
                if (gl && (type === 'webgl2' || type === 'webgl')) {
                    const originalReadPixels = gl.readPixels.bind(gl);
                    gl.readPixels = function(x, y, width, height, format, pixelType, pixels) {
                        originalReadPixels(x, y, width, height, format, pixelType, pixels);
                        if (pixels && pixels.length) {
                            for (let i = 0; i < pixels.length; i++) {
                                pixels[i] = 0;
                            }
                        }
                    };
                }
                return gl;
            };
            viewer = OpenSeadragon(OpenSeadragon.extend({
                id: 'example',
                prefixUrl: '/build/openseadragon/images/',
                springStiffness: 100,
                drawer: ['webgl', 'canvas']
            }));
        },
        afterEach: function () {
            HTMLCanvasElement.prototype.getContext = this._originalGetContext;
            if (viewer) {
                viewer.destroy();
            }
            viewer = null;
        }
    });

    QUnit.test('Uses canvas when WebGL is rejected (demo scenario 4: black pixels)', function(assert) {
        assert.ok(viewer.drawer, 'viewer has a drawer');
        assert.equal(viewer.drawer.getType(), 'canvas', 'viewer uses canvas when WebGL readback fails');
    });

})();
