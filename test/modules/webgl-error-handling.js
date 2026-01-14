/* global QUnit, OpenSeadragon, MockSeadragon */

(function() {

    QUnit.module('WebGL Error Handling');

    // Test that MAX_TEXTURE_IMAGE_UNITS validation prevents crashes
    QUnit.test('WebGL drawer handles invalid MAX_TEXTURE_IMAGE_UNITS without crashing', function(assert) {
        // Create mock context with invalid MAX_TEXTURE_IMAGE_UNITS (0)
        const mockContext = MockSeadragon.createMockWebGLContext({
            getParameter: function(param) {
                if (param === this.MAX_TEXTURE_IMAGE_UNITS) {
                    return 0; // Invalid value that should be caught
                }
                return 16;
            }
        });

        const originalGetContext = MockSeadragon.mockWebGLContext(mockContext);

        // Capture console warnings - OpenSeadragon uses $.console.warn
        const originalWarn = OpenSeadragon.console.warn;
        let warningLogged = false;
        OpenSeadragon.console.warn = function(message) {
            if (message.includes('WebGL context invalid') && message.includes('MAX_TEXTURE_IMAGE_UNITS is 0')) {
                warningLogged = true;
            }
        };

        try {
            const mockViewer = MockSeadragon.createMockViewerForWebGL();

            const drawer = new OpenSeadragon.WebGLDrawer({
                viewer: mockViewer,
                viewport: mockViewer.viewport,
                element: mockViewer.container
            });

            // Test passes if we get here without throwing
            assert.ok(true, 'WebGLDrawer constructor completed without crashing');
            assert.ok(drawer._webglFailed, 'WebGL failed flag should be set');
            assert.ok(warningLogged, 'Warning should be logged for invalid MAX_TEXTURE_IMAGE_UNITS');

        } catch (error) {
            assert.ok(false, 'WebGLDrawer should not crash: ' + error.message);
        } finally {
            MockSeadragon.restoreWebGLContext(originalGetContext);
            OpenSeadragon.console.warn = originalWarn;
        }
    });

    // Test that null MAX_TEXTURE_IMAGE_UNITS is handled
    QUnit.test('WebGL drawer handles null MAX_TEXTURE_IMAGE_UNITS without crashing', function(assert) {
        // Create mock context with null MAX_TEXTURE_IMAGE_UNITS
        const mockContext = MockSeadragon.createMockWebGLContext({
            getParameter: function(param) {
                if (param === this.MAX_TEXTURE_IMAGE_UNITS) {
                    return null; // Null value that should be caught
                }
                return 16;
            }
        });

        const originalGetContext = MockSeadragon.mockWebGLContext(mockContext);

        try {
            const mockViewer = MockSeadragon.createMockViewerForWebGL();

            const drawer = new OpenSeadragon.WebGLDrawer({
                viewer: mockViewer,
                viewport: mockViewer.viewport,
                element: mockViewer.container
            });

            assert.ok(true, 'WebGLDrawer constructor completed without crashing');
            assert.ok(drawer._webglFailed, 'WebGL failed flag should be set for null MAX_TEXTURE_IMAGE_UNITS');

        } catch (error) {
            assert.ok(false, 'WebGLDrawer should not crash: ' + error.message);
        } finally {
            MockSeadragon.restoreWebGLContext(originalGetContext);
        }
    });

    // Test that WebGL context creation failure is handled
    QUnit.test('WebGL drawer handles context creation failure without crashing', function(assert) {
        // Mock context creation to return null (WebGL not supported)
        const originalGetContext = MockSeadragon.mockWebGLContext(null);

        try {
            const mockViewer = MockSeadragon.createMockViewerForWebGL();

            const drawer = new OpenSeadragon.WebGLDrawer({
                viewer: mockViewer,
                viewport: mockViewer.viewport,
                element: mockViewer.container
            });

            assert.ok(true, 'WebGLDrawer constructor completed without crashing');
            assert.ok(drawer._webglFailed, 'WebGL failed flag should be set for context creation failure');

        } catch (error) {
            assert.ok(false, 'WebGLDrawer should not crash: ' + error.message);
        } finally {
            MockSeadragon.restoreWebGLContext(originalGetContext);
        }
    });

})();