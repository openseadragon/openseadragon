/* global QUnit, OpenSeadragon */

(function() {

    QUnit.module('WebGL2Drawer');

    QUnit.test('WebGL2Drawer.isSupported()', function(assert) {
        // Should return true if WebGL2 or WebGL is supported
        const supported = OpenSeadragon.WebGL2Drawer.isSupported();
        assert.ok(typeof supported === 'boolean', 'isSupported should return a boolean');

        // Should be supported if either WebGL2 or WebGL is available
        const webgl2Available = OpenSeadragon.WebGL2Drawer.isWebGL2Supported();
        const webglAvailable = OpenSeadragon.WebGLDrawer.isSupported();

        if (webgl2Available || webglAvailable) {
            assert.ok(supported, 'Should be supported when WebGL2 or WebGL is available');
        }
    });

    QUnit.test('WebGL2Drawer.isWebGL2Supported()', function(assert) {
        const webgl2Supported = OpenSeadragon.WebGL2Drawer.isWebGL2Supported();
        assert.ok(typeof webgl2Supported === 'boolean', 'isWebGL2Supported should return a boolean');
    });

    QUnit.test('WebGL2Drawer.getType()', function(assert) {
        assert.equal(OpenSeadragon.WebGL2Drawer.getType(), 'webgl2', 'getType should return "webgl2"');
    });

    QUnit.test('WebGL2Drawer fallback behavior', function(assert) {
        const done = assert.async();

        // Skip this test if neither WebGL2 nor WebGL is supported
        if (!OpenSeadragon.WebGL2Drawer.isSupported()) {
            assert.ok(true, 'Skipping WebGL2Drawer test - WebGL not supported');
            done();
            return;
        }

        const viewer = OpenSeadragon({
            id: 'qunit-fixture',
            prefixUrl: '/build/openseadragon/images/',
            drawer: 'webgl2',
            tileSources: '/test/data/testpattern.dzi'
        });

        viewer.addHandler('open', function() {
            // Check that a drawer was created
            assert.ok(viewer.drawer, 'Drawer should be created');

            // Check the drawer type - it might be webgl2, webgl, or canvas depending on browser support
            const drawerType = viewer.drawer.getType();
            assert.ok(['webgl2', 'webgl', 'canvas'].includes(drawerType),
                'Drawer should be webgl2, webgl, or canvas, got: ' + drawerType);

            viewer.destroy();
            done();
        });

        viewer.addHandler('open-failed', function() {
            assert.ok(false, 'Viewer should not fail to open');
            viewer.destroy();
            done();
        });
    });

    QUnit.test('WebGL2Drawer constructor with WebGL2 not supported', function(assert) {
        // This test verifies the fallback behavior when WebGL2 is not supported
        // We need to temporarily mock the WebGL2 support check

        const originalIsWebGL2Supported = OpenSeadragon.WebGL2Drawer.isWebGL2Supported;

        // Mock WebGL2 as not supported
        OpenSeadragon.WebGL2Drawer.isWebGL2Supported = function() {
            return false;
        };

        try {
            if (OpenSeadragon.WebGLDrawer.isSupported()) {
                const mockViewer = {
                    rejectEventHandler: function() {},
                    addHandler: function() {},
                    canvas: document.createElement('canvas'),
                    container: document.createElement('div'),
                    viewport: {
                        getContainerSize: function() { return new OpenSeadragon.Point(500, 400); }
                    },
                    tileCache: {
                        clearDrawerInternalCache: function() {}
                    }
                };

                // This should create a WebGLDrawer instead of WebGL2Drawer
                const drawer = new OpenSeadragon.WebGL2Drawer({
                    viewer: mockViewer,
                    viewport: mockViewer.viewport,
                    element: document.createElement('div')
                });

                // The drawer should still be a WebGL2Drawer instance, but using WebGL internally
                assert.equal(drawer.getType(), 'webgl2', 'Should still be WebGL2Drawer type');
                assert.equal(drawer._usingWebGL2, false, 'Should indicate it is using WebGL fallback');

                drawer.destroy();
            } else {
                assert.ok(true, 'Skipping test - WebGL not supported');
            }
        } catch (error) {
            assert.ok(false, 'WebGL2Drawer constructor should not throw when falling back: ' + error.message);
        } finally {
            // Restore original function
            OpenSeadragon.WebGL2Drawer.isWebGL2Supported = originalIsWebGL2Supported;
        }
    });

    QUnit.test('WebGL2Drawer in drawer fallback chain', function(assert) {
        const done = assert.async();

        // Test that webgl2 works in the fallback chain
        const viewer = OpenSeadragon({
            id: 'qunit-fixture',
            prefixUrl: '/build/openseadragon/images/',
            drawer: ['webgl2', 'webgl', 'canvas', 'html'],
            tileSources: '/test/data/testpattern.dzi'
        });

        viewer.addHandler('open', function() {
            assert.ok(viewer.drawer, 'A drawer should be selected from the fallback chain');

            const drawerType = viewer.drawer.getType();
            assert.ok(['webgl2', 'webgl', 'canvas', 'html'].includes(drawerType),
                'Drawer should be one of the fallback options, got: ' + drawerType);

            viewer.destroy();
            done();
        });

        viewer.addHandler('open-failed', function() {
            assert.ok(false, 'Viewer should not fail to open with fallback chain');
            viewer.destroy();
            done();
        });
    });

})();