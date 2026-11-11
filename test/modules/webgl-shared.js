/* global QUnit, $ */

(function() {
    let viewers;
    let restoreWarn;

    QUnit.module('Shared WebGL', {
        beforeEach: function() {
            viewers = [];
        },
        afterEach: function() {
            if (restoreWarn) {
                restoreWarn();
                restoreWarn = null;
            }
            viewers.forEach(viewer => viewer.destroy());
        }
    });

    function createViewer(options) {
        const id = 'shared-webgl-' + viewers.length;
        $('<div></div>').attr('id', id).css({ width: '240px', height: '144px' }).appendTo('#qunit-fixture');
        const viewer = OpenSeadragon(OpenSeadragon.extend({
            id: id,
            drawer: 'webgl',
            showNavigationControl: false,
            animationTime: 0,
            drawerOptions: { webgl: { useSharedRenderer: true } }
        }, options));
        viewers.push(viewer);
        return viewer;
    }

    function tileSource(colors) {
        return {
            width: 40,
            height: 24,
            tileSize: 40,
            minLevel: 1,
            getTileUrl: function() { return ''; },
            downloadTileStart: function(context) {
                const canvas = document.createElement('canvas');
                canvas.width = context.tile.size.x;
                canvas.height = context.tile.size.y;
                const ctx = canvas.getContext('2d');
                colors.forEach((color, index) => {
                    ctx.fillStyle = color;
                    ctx.fillRect((index % 2) * canvas.width / 2, Math.floor(index / 2) * canvas.height / 2,
                        canvas.width / 2, canvas.height / 2);
                });
                context.finish(ctx, null, 'context2d');
            }
        };
    }

    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffffff'];

    function pixels(viewer) {
        const canvas = viewer.drawer.canvas;
        return [0, 1, 2, 3].map(index => Array.from(viewer.drawer.context.getImageData(
            Math.floor(canvas.width * ((index % 2) ? 0.75 : 0.25)),
            Math.floor(canvas.height * ((index < 2) ? 0.25 : 0.75)), 1, 1).data));
    }

    function rendered(viewer) {
        return new Promise(resolve => {
            const handler = function() {
                const result = pixels(viewer);
                if (result.every(pixel => pixel[3] > 0)) {
                    viewer.removeHandler('update-viewport', handler);
                    resolve(result);
                } else {
                    viewer.forceRedraw();
                }
            };
            viewer.addHandler('update-viewport', handler);
            viewer.forceRedraw();
        });
    }

    function event(target, name) {
        return new Promise(resolve => target.addOnceHandler(name, resolve));
    }

    function canvasEvent(canvas, name) {
        return new Promise(resolve => canvas.addEventListener(name, resolve, { once: true }));
    }

    QUnit.test('performance flags are limited to shared WebGL buffers', function(assert) {
        const shared = createViewer();
        const dedicated = createViewer({ drawerOptions: { webgl: { useSharedRenderer: false } } });
        assert.ok(shared.drawer._glContext.getContext().getContextAttributes().preserveDrawingBuffer, 'shared buffers are preserved');
        assert.notOk(dedicated.drawer._glContext.getContext().getContextAttributes().preserveDrawingBuffer, 'dedicated buffers use the default');
        [shared, dedicated].forEach(viewer => {
            assert.notOk(viewer.drawer.context.getContextAttributes().willReadFrequently, 'output remains optimized for writes');
            assert.notOk(viewer.drawer._clippingContext.getContextAttributes().willReadFrequently, 'clipping remains optimized for writes');
        });
    });

    QUnit.test('GPU size limits preserve complete output and match CanvasDrawer', async function(assert) {
        const shared = createViewer({ tileSources: tileSource(colors), imageSmoothingEnabled: false });
        const reference = createViewer({ drawer: 'canvas', tileSources: tileSource(colors), imageSmoothingEnabled: false });
        const context = shared.drawer._sharedContext;
        const originalLimit = context.maxTextureSize;
        context.maxTextureSize = 64;
        try {
            shared.drawer._syncRenderingCanvasSize();
            shared.drawer._resizeRenderer();
            assert.ok(shared.drawer._renderWidth <= 64 && shared.drawer._renderHeight <= 64, 'render target respects GPU limits');
            const gl = shared.drawer._glContext.getContext();
            assert.equal(gl.checkFramebufferStatus(gl.FRAMEBUFFER), gl.FRAMEBUFFER_COMPLETE, 'render framebuffer is complete');
            const results = await Promise.all([rendered(shared), rendered(reference)]);
            assert.deepEqual(results[0], results[1], 'all four corners match canvas rendering after downsampling and scaling');
            shared.drawer._setSharedViewport(gl, false);
            assert.ok(gl.getParameter(gl.VIEWPORT)[1] >= 0, 'viewport never has a negative Y offset');
            gl.disable(gl.SCISSOR_TEST);
        } finally {
            context.maxTextureSize = originalLimit;
        }
    });

    QUnit.test('temporary large viewers release shared buffer space on resize and destroy', function(assert) {
        const large = createViewer();
        const small = createViewer();
        const context = large.drawer._sharedContext;
        large.viewport.resize(new OpenSeadragon.Point(480, 288));
        large.raiseEvent('resize');
        assert.equal(context.canvas.width, large.drawer._renderWidth, 'buffer grows for the largest live viewer');
        large.viewport.resize(new OpenSeadragon.Point(120, 72));
        large.raiseEvent('resize');
        assert.equal(context.canvas.width, small.drawer._renderWidth, 'buffer shrinks after the large viewer shrinks');
        small.destroy();
        assert.equal(context.canvas.width, large.drawer._renderWidth, 'buffer shrinks when the larger peer is destroyed');
        assert.equal(context.refCount, 1, 'only the surviving viewer owns the context');
    });

    QUnit.test('failed constructor releases ownership and resources without destroying its peers', function(assert) {
        const viewer = createViewer();
        const context = viewer.drawer._sharedContext;
        const gl = context.gl;
        let failedManager;
        class FailingDrawer extends OpenSeadragon.WebGLDrawer {
            static isSupported() { return true; }
            _setupRenderer() {
                super._setupRenderer();
                failedManager = this._glContext;
                throw new Error('Simulated shader setup failure');
            }
        }
        assert.throws(() => viewer.requestDrawer(FailingDrawer, {
            mainDrawer: false, drawerOptions: { useSharedRenderer: true }
        }), /shader setup failure/);
        assert.equal(context.refCount, 1, 'failed construction does not leak a reference');
        assert.equal(context.drawers.length, 1, 'failed drawer is unregistered');
        assert.ok(failedManager.isDestroyed(), 'partially initialized renderer resources are destroyed');
        assert.notOk(gl.isContextLost(), 'surviving context remains valid');
        viewer.destroy();
        assert.equal(context.refCount, 0, 'last owner releases the context');
        assert.strictEqual(context.gl, null, 'singleton GL reference is freed');
        assert.strictEqual(context.canvas, null, 'singleton canvas reference is freed');
    });

    QUnit.test('destroying one shared manager leaves a peer buffer bound', function(assert) {
        const first = createViewer();
        const second = createViewer();
        const gl = first.drawer._glContext.getContext();
        const buffer = first.drawer._glContext.getFirstPass().bufferOutputPosition;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        second.destroy();
        assert.strictEqual(gl.getParameter(gl.ARRAY_BUFFER_BINDING), buffer, 'teardown does not unbind peer resources');
        assert.ok(gl.isBuffer(buffer), 'peer resources still exist');
    });

    QUnit.test('exceptions release scissor state for the next shared draw', function(assert) {
        const first = createViewer();
        const second = createViewer();
        const gl = first.drawer._glContext.getContext();
        const originalDraw = first.drawer._draw;
        first.drawer._draw = function() {
            this._setSharedViewport(gl, false);
            throw new Error('Simulated tile failure');
        };
        try {
            assert.throws(() => first.drawer.draw([]), /tile failure/);
            assert.notOk(gl.isEnabled(gl.SCISSOR_TEST), 'scissor is disabled after an exception');
            second.drawer.draw([]);
            assert.notOk(gl.isEnabled(gl.SCISSOR_TEST), 'scissor is disabled after a normal draw');
        } finally {
            first.drawer._draw = originalDraw;
        }
    });

    QUnit.test('real shared context loss recovers idle viewers through one shared context', async function(assert) {
        const first = createViewer({ tileSources: tileSource(colors) });
        const second = createViewer({ tileSources: tileSource(colors.slice().reverse()), imageSmoothingEnabled: false });
        const initial = await Promise.all([rendered(first), rendered(second)]);
        const context = first.drawer._sharedContext;
        const oldGl = context.gl;
        const extension = oldGl.getExtension('WEBGL_lose_context');
        assert.ok(extension, 'browser supports real context-loss simulation');
        if (!extension) { return; }
        const recovered = Promise.all([event(first, 'webgl-context-recovered'), event(second, 'webgl-context-recovered')]);
        extension.loseContext();
        await recovered;
        assert.notStrictEqual(context.gl, oldGl, 'lost shared context is replaced');
        assert.strictEqual(first.drawer._glContext.getContext(), second.drawer._glContext.getContext(), 'both drawers recover through the same context');
        assert.ok(first.drawer._useSharedRenderer && second.drawer._useSharedRenderer, 'both viewers remain shared');
        assert.equal(context.refCount, 2, 'recovery preserves ownership');
        assert.deepEqual(await Promise.all([rendered(first), rendered(second)]), initial, 'both distinct images still render after loss');
    });

    QUnit.test('browser restoration preserves the singleton and rebuilds every shared drawer', async function(assert) {
        const first = createViewer({ tileSources: tileSource(colors) });
        const second = createViewer({ tileSources: tileSource(colors.slice().reverse()) });
        const initial = await Promise.all([rendered(first), rendered(second)]);
        const gl = first.drawer._glContext.getContext();
        const canvas = first.drawer._renderingCanvas;
        const extension = gl.getExtension('WEBGL_lose_context');
        assert.ok(extension, 'browser supports real context-loss simulation');
        if (!extension) { return; }
        first.drawer.setContextRecoveryEnabled(false);
        second.drawer.setContextRecoveryEnabled(false);
        const lost = canvasEvent(canvas, 'webglcontextlost');
        extension.loseContext();
        await lost;
        await new Promise(resolve => setTimeout(resolve, 0));
        const restored = canvasEvent(canvas, 'webglcontextrestored');
        extension.restoreContext();
        await restored;
        const recovered = Promise.all([event(first, 'webgl-context-recovered'), event(second, 'webgl-context-recovered')]);
        first.drawer.setContextRecoveryEnabled(true);
        second.drawer.setContextRecoveryEnabled(true);
        await recovered;
        assert.strictEqual(first.drawer._glContext.getContext(), gl, 'first drawer reuses the restored context');
        assert.strictEqual(second.drawer._glContext.getContext(), gl, 'second drawer reuses the same restored context');
        assert.deepEqual(await Promise.all([rendered(first), rendered(second)]), initial, 'invalidated tile textures are rebuilt for both viewers');
    });

    QUnit.test('a new viewer replaces a lost singleton before existing viewers notice', async function(assert) {
        const first = createViewer();
        const second = createViewer();
        const oldGl = first.drawer._sharedContext.gl;
        const extension = oldGl.getExtension('WEBGL_lose_context');
        assert.ok(extension, 'browser supports real context-loss simulation');
        if (!extension) { return; }
        extension.loseContext();
        assert.ok(oldGl.isContextLost(), 'GL reports loss synchronously before the event');
        const third = createViewer();
        const newGl = third.drawer._glContext.getContext();
        assert.notOk(newGl.isContextLost(), 'new viewer receives a live context');
        assert.notStrictEqual(newGl, oldGl, 'new viewer does not receive the lost context');
        first.drawer.draw([]);
        second.drawer.draw([]);
        assert.strictEqual(first.drawer._glContext.getContext(), newGl, 'first existing viewer rejoins the singleton');
        assert.strictEqual(second.drawer._glContext.getContext(), newGl, 'second existing viewer rejoins the singleton');
        assert.equal(third.drawer._sharedContext.refCount, 3, 'all viewers retain ownership');
        // Let queued events run so the next test cannot inherit a loss event.
        await new Promise(resolve => setTimeout(resolve, 0));
    });

    QUnit.test('dedicated loss suggests sharing and browser restoration rebuilds resources', async function(assert) {
        const viewer = createViewer({ drawerOptions: { webgl: { useSharedRenderer: false } }, tileSources: tileSource(colors) });
        const initial = await rendered(viewer);
        const drawer = viewer.drawer;
        drawer.setContextRecoveryEnabled(false);
        const gl = drawer._glContext.getContext();
        const extension = gl.getExtension('WEBGL_lose_context');
        assert.ok(extension, 'browser supports real context-loss simulation');
        if (!extension) { return; }
        const warnings = [];
        const originalWarn = OpenSeadragon.console.warn;
        OpenSeadragon.console.warn = function(message) { warnings.push(message); };
        restoreWarn = () => { OpenSeadragon.console.warn = originalWarn; };
        const lost = canvasEvent(drawer._renderingCanvas, 'webglcontextlost');
        extension.loseContext();
        assert.ok((await lost).defaultPrevented, 'loss handler allows browser restoration');
        assert.ok(warnings.some(message => message.includes('drawerOptions.webgl.useSharedRenderer')), 'dedicated loss suggests opting into sharing');
        // The browser enables restoration after dispatch of the loss event completes.
        await new Promise(resolve => setTimeout(resolve, 0));
        const restored = canvasEvent(drawer._renderingCanvas, 'webglcontextrestored');
        extension.restoreContext();
        await restored;
        const recovered = event(viewer, 'webgl-context-recovered');
        drawer.setContextRecoveryEnabled(true);
        await recovered;
        assert.deepEqual(await rendered(viewer), initial, 'restored viewer rebuilds textures and shaders');
    });
})();
