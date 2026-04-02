/* global QUnit, $, Util, testLog */

(function() {
    let viewer;
    OpenSeadragon.getBuiltInDrawersForTest().forEach(runDrawerTests);

    function runDrawerTests(drawerType){
        let getContextPrototypeRestore = null;
        let initShaderProgramRestore = null;

        QUnit.module('Drawer-'+drawerType, {
            beforeEach: function () {
                $('<div id="example"></div>').appendTo("#qunit-fixture");

                testLog.reset();
            },
            afterEach: function () {
                if (initShaderProgramRestore) {
                    initShaderProgramRestore();
                    initShaderProgramRestore = null;
                }
                if (getContextPrototypeRestore) {
                    getContextPrototypeRestore();
                    getContextPrototypeRestore = null;
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

                // Create viewer with webgl and canvas so canvas fallback is allowed when recovery fails
                createViewer({ drawer: ['webgl', 'canvas'] });

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

            // ----------
            // Bad shader (simulated) with fallback. isSupported() functional test rejects WebGL; viewer falls back to canvas. Mirrors demo scenario 3.
            QUnit.test('Falls back to canvas when WebGL error is detected because of a shader error', function(assert) {
                const done = assert.async();
                const originalInitShaderProgram = OpenSeadragon.WebGLDrawer.initShaderProgram;
                let initShaderCallCount = 0;
                OpenSeadragon.WebGLDrawer.initShaderProgram = function(gl, vsSource, fsSource) {
                    initShaderCallCount++;
                    const originalAttach = gl.attachShader.bind(gl);
                    let attachCount = 0;
                    gl.attachShader = function(program, shader) {
                        attachCount++;
                        if (initShaderCallCount === 1 && attachCount === 1) {
                            shader = null;
                        }
                        return originalAttach(program, shader);
                    };
                    try {
                        return originalInitShaderProgram(gl, vsSource, fsSource);
                    } finally {
                        gl.attachShader = originalAttach;
                    }
                };
                initShaderProgramRestore = function() {
                    OpenSeadragon.WebGLDrawer.initShaderProgram = originalInitShaderProgram;
                };
                createViewer({ drawer: ['webgl', 'canvas'] });
                assert.ok(viewer.drawer, 'viewer has a drawer');
                assert.equal(viewer.drawer.getType(), 'canvas', 'viewer uses canvas when WebGL shader fails');
                done();
            });

            // ----------
            // Simulates failure to draw correctly. isSupported() functional test rejects WebGL; viewer falls back to canvas. Mirrors demo scenario 4.
            QUnit.test('Falls back to canvas when WebGL fails to correctly draw test pixels', function(assert) {
                const done = assert.async();
                const originalGetContext = HTMLCanvasElement.prototype.getContext;
                getContextPrototypeRestore = function() {
                    HTMLCanvasElement.prototype.getContext = originalGetContext;
                };
                HTMLCanvasElement.prototype.getContext = function(type) {
                    const gl = originalGetContext.apply(this, arguments);
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
                createViewer({ drawer: ['webgl', 'canvas'] });
                assert.ok(viewer.drawer, 'viewer has a drawer');
                assert.equal(viewer.drawer.getType(), 'canvas', 'viewer uses canvas when WebGL readback fails');
                done();
            });
        }
    }

    QUnit.module('WebGLDrawer internals');

    function createFakeGl() {
        const gl = {
            TEXTURE0: 100,
            TEXTURE_2D: 'TEXTURE_2D',
            ARRAY_BUFFER: 'ARRAY_BUFFER',
            DYNAMIC_DRAW: 'DYNAMIC_DRAW',
            TRIANGLES: 'TRIANGLES',
            FLOAT: 'FLOAT',
            divisorCalls: [],
            activeTextures: [],
            boundTextures: [],
            drawArraysCalls: [],
            drawArraysInstancedCalls: [],
            uniformMatrixCalls: [],
            uniform1fvCalls: [],
            uniform1ivCalls: [],
            bufferDataCalls: [],
            bindBufferCalls: [],
            activeTexture(unit) {
                this.activeTextures.push(unit);
            },
            bindTexture(target, texture) {
                this.boundTextures.push({target, texture});
            },
            bindBuffer(target, buffer) {
                this.bindBufferCalls.push({target, buffer});
            },
            bufferData(target, data, usage) {
                this.bufferDataCalls.push({target, data: Array.from(data), usage});
            },
            uniformMatrix3fv(location, transpose, matrix) {
                this.uniformMatrixCalls.push({location, transpose, matrix: Array.from(matrix)});
            },
            uniform1fv(location, value) {
                this.uniform1fvCalls.push({location, value: Array.from(value)});
            },
            uniform1iv(location, value) {
                this.uniform1ivCalls.push({location, value: Array.from(value)});
            },
            useProgram() {},
            vertexAttribPointer() {},
            vertexAttribDivisor(location, value) {
                this.divisorCalls.push({location, value});
            },
            drawArrays(mode, first, count) {
                this.drawArraysCalls.push({mode, first, count});
            },
            drawArraysInstanced(mode, first, count, instances) {
                this.drawArraysInstancedCalls.push({mode, first, count, instances});
            }
        };
        return gl;
    }

    QUnit.test('WebGLDrawer batched rendering skips missing textures and does not bind beyond draw count', function(assert) {
        const gl = createFakeGl();
        const drawer = {
            _gl: gl,
            _firstPass: {
                shaderProgram: 'program',
                bufferTexturePosition: 'textureBuffer',
                bufferOutputPosition: 'outputBuffer',
                bufferIndex: 'indexBuffer',
                aOutputPosition: 'aOutput',
                aTexturePosition: 'aTexture',
                aIndex: 'aIndex',
                uTransformMatrices: ['m0', 'm1'],
                uOpacities: 'uOpacities'
            },
            getDataToDraw(tile) {
                return tile.skip ? null : {texture: tile.texture};
            },
            _getTileData(tile, tiledImage, textureInfo, overallMatrix, index, texturePositionArray, textureDataArray, matrixArray, opacityArray) {
                texturePositionArray.set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], index * 12);
                textureDataArray[index] = textureInfo.texture;
                matrixArray[index] = [index + 1, 0, 0, 0, index + 1, 0, 0, 0, 1];
                opacityArray[index] = 1;
            },
            _bindTileTextures: OpenSeadragon.WebGLDrawer.prototype._bindTileTextures
        };

        OpenSeadragon.WebGLDrawer.prototype._drawTilesBatched.call(drawer, [
            {tile: {texture: 'tex-a'}},
            {tile: {skip: true}},
            {tile: {texture: 'tex-b'}}
        ], null, null, 2);

        assert.deepEqual(gl.activeTextures, [100, 101], 'binds exactly the used texture units');
        assert.deepEqual(gl.boundTextures.map(item => item.texture), ['tex-a', 'tex-b'], 'binds only drawable tile textures');
        assert.strictEqual(gl.drawArraysCalls.length, 1, 'draws a single batch');
        assert.strictEqual(gl.drawArraysCalls[0].count, 12, 'draw count reflects the two drawable tiles');
        assert.strictEqual(gl.uniformMatrixCalls.length, 2, 'updates uniforms only for drawable tiles');
        assert.deepEqual(gl.uniform1fvCalls[0].value, [1, 1], 'opacity uniform excludes skipped tiles');
    });

    QUnit.test('WebGLDrawer instanced rendering resets divisors after draw failure', function(assert) {
        const gl = createFakeGl();
        gl.drawArraysInstanced = function(mode, first, count, instances) {
            this.drawArraysInstancedCalls.push({mode, first, count, instances});
            throw new Error('draw failed');
        };

        const pass = {
            shaderProgram: 'instanced-program',
            uImages: 'uImages',
            bufferTexturePositionTL: 'tlBuffer',
            bufferTexturePositionSize: 'sizeBuffer',
            bufferTransformMatrix: 'matrixBuffer',
            bufferOpacity: 'opacityBuffer',
            bufferTextureIndex: 'indexBuffer',
            bufferOutputPosition: 'outputBuffer',
            aTexturePositionTL: 'aTL',
            aTexturePositionSize: 'aSize',
            aTransformCol0: 'aCol0',
            aTransformCol1: 'aCol1',
            aTransformCol2: 'aCol2',
            aOpacity: 'aOpacity',
            aTextureIndex: 'aTextureIndex',
            aOutputPosition: 'aOutput'
        };
        const drawer = {
            _gl: gl,
            _firstPassInstanced: pass,
            _glNumTextures: 3,
            _textureUnitIndices: null,
            _instancedArrays: null,
            _instancedArrayCapacity: 0,
            getDataToDraw(tile) {
                return tile.skip ? null : {texture: tile.texture};
            },
            _getTextureUnitIndices: OpenSeadragon.WebGLDrawer.prototype._getTextureUnitIndices,
            _ensureInstancedArrays: OpenSeadragon.WebGLDrawer.prototype._ensureInstancedArrays,
            _bindTileTextures: OpenSeadragon.WebGLDrawer.prototype._bindTileTextures,
            _resetInstancedAttributeDivisors: OpenSeadragon.WebGLDrawer.prototype._resetInstancedAttributeDivisors,
            _getTileDataInstanced(tile, tiledImage, textureInfo, overallMatrix, index, texturePositionTLArray, texturePositionSizeArray, transformMatrixArray, opacityArray, textureIndexArray, textureDataArray) {
                texturePositionTLArray.set([0, 0], index * 2);
                texturePositionSizeArray.set([1, 1], index * 2);
                transformMatrixArray.set([1, 0, 0, 0, 1, 0, 0, 0, 1], index * 9);
                opacityArray[index] = 1;
                textureIndexArray[index] = index;
                textureDataArray[index] = textureInfo.texture;
            }
        };

        assert.throws(function() {
            OpenSeadragon.WebGLDrawer.prototype._drawTilesInstanced.call(drawer, [
                {tile: {texture: 'tex-a'}},
                {tile: {skip: true}},
                {tile: {texture: 'tex-b'}}
            ], null, null, 4);
        }, /draw failed/, 'surfaces the draw failure');

        assert.strictEqual(gl.drawArraysInstancedCalls.length, 1, 'attempts one instanced draw');
        assert.strictEqual(gl.drawArraysInstancedCalls[0].instances, 2, 'draw count excludes skipped tiles');
        assert.deepEqual(gl.boundTextures.map(item => item.texture), ['tex-a', 'tex-b'], 'binds only drawable tile textures');

        const resetCalls = gl.divisorCalls.slice(-7);
        assert.deepEqual(resetCalls, [
            {location: 'aTL', value: 0},
            {location: 'aSize', value: 0},
            {location: 'aCol0', value: 0},
            {location: 'aCol1', value: 0},
            {location: 'aCol2', value: 0},
            {location: 'aOpacity', value: 0},
            {location: 'aTextureIndex', value: 0}
        ], 'always resets instanced divisors in finally');
    });

    QUnit.test('WebGLDrawer instanced shader setup falls back when shader compilation throws', function(assert) {
        const originalInitShaderProgram = OpenSeadragon.WebGLDrawer.initShaderProgram;
        const warnings = [];

        OpenSeadragon.WebGLDrawer.initShaderProgram = function() {
            throw new Error('shader compile failed');
        };

        const gl = {
            ARRAY_BUFFER: 'ARRAY_BUFFER',
            FLOAT: 'FLOAT',
            STATIC_DRAW: 'STATIC_DRAW',
            createBuffer() { return {}; },
            createProgram() { return {}; },
            bindBuffer() {},
            bufferData() {},
            enableVertexAttribArray() {},
            vertexAttribPointer() {},
            vertexAttribDivisor() {},
            getAttribLocation() { return 0; },
            getUniformLocation() { return {}; },
            useProgram() {},
            uniform1iv() {}
        };
        const drawer = {
            _isWebGL2: true,
            _gl: gl,
            _glNumTextures: 2,
            _unitQuad: new Float32Array([0, 0, 1, 0, 0, 1]),
            _textureUnitIndices: null,
            _firstPassInstanced: {stale: true},
            _getTextureUnitIndices: OpenSeadragon.WebGLDrawer.prototype._getTextureUnitIndices,
            _resetInstancedAttributeDivisors: OpenSeadragon.WebGLDrawer.prototype._resetInstancedAttributeDivisors
        };

        const originalWarn = OpenSeadragon.console.warn;
        OpenSeadragon.console.warn = function() {
            warnings.push(Array.from(arguments).join(' '));
        };

        try {
            OpenSeadragon.WebGLDrawer.prototype._makeFirstPassInstancedShaderProgram.call(drawer);
        } finally {
            OpenSeadragon.WebGLDrawer.initShaderProgram = originalInitShaderProgram;
            OpenSeadragon.console.warn = originalWarn;
        }

        assert.strictEqual(drawer._firstPassInstanced, null, 'clears the instanced program on setup failure');
        assert.ok(warnings.some(msg => msg.indexOf('falling back to batched rendering') >= 0), 'logs a fallback warning');
    });

})();
