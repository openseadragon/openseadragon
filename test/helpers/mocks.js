// Test-wide mocks for more test stability: tests might require calling functions that expect
// presence of certain mock properties. It is better to include maintened mock props than to copy
// over all the place

window.MockSeadragon = {
    /**
     * Get mocked tile: loaded state, cutoff such that it is not kept in cache by force,
     *  level: 1, x: 0, y: 0,  all coords: [x0 y0 w0 h0]
     *
     *  Requires TiledImage referece (mock or real)
     * @return {OpenSeadragon.Tile}
     */
    getTile(url, tiledImage, props={}) {
        const dummyRect = new OpenSeadragon.Rect(0, 0, 0, 0, 0);
        //default cutoof = 0 --> use level 1 to not to keep caches from unloading (cutoff = navigator data, kept in cache)
        const dummyTile = new OpenSeadragon.Tile(1, 0, 0, dummyRect, true, url,
            undefined, true, null, dummyRect, null, url);
        dummyTile.tiledImage = tiledImage;
        //by default set as ready
        dummyTile.loaded = true;
        dummyTile.loading = false;
        //override anything we need
        OpenSeadragon.extend(tiledImage, props);
        return dummyTile;
    },

    /**
     * Get mocked viewer: it has not all props that might be required. If your
     * tests fails because they do not find some props on a viewer, add them here.
     *
     * Requires a drawer reference (mock or real). Automatically created if not provided.
     * @return {OpenSeadragon.Viewer}
     */
    getViewer(drawer=null, props={}) {
        drawer = drawer || this.getDrawer();
        return OpenSeadragon.extend(new class extends OpenSeadragon.EventSource {
            forceRedraw () {}
            drawer = drawer
            tileCache = new OpenSeadragon.TileCache()
        }, props);
    },

    /**
     * Get mocked viewer: it has not all props that might be required. If your
     * tests fails because they do not find some props on a viewer, add them here.
     * @return {OpenSeadragon.Viewer}
     */
    getDrawer(props={}) {
        return OpenSeadragon.extend({
            getType: function () {
                return "mock";
            }
        }, props);
    },

    /**
     * Get mocked tiled image: it has not all props that might be required. If your
     * tests fails because they do not find some props on a tiled image, add them here.
     *
     * Requires viewer reference (mock or real). Automatically created if not provided.
     * @return {OpenSeadragon.TiledImage}
     */
    getTiledImage(viewer=null, props={}) {
        viewer = viewer || this.getViewer();
        return OpenSeadragon.extend({
            viewer: viewer,
            source: OpenSeadragon.TileSource.prototype,
            redraw: function() {},
            _tileCache: viewer.tileCache
        }, props);
    },

    /**
     * Get mocked tile source
     * @return {OpenSeadragon.TileSource}
     */
    getTileSource(props={}) {
        return new OpenSeadragon.TileSource(OpenSeadragon.extend({
            width: 1500,
            height: 1000,
            ready: true,
            tileWidth: 200,
            tileHeight: 150,
            tileOverlap: 0
        }, props));
    },

    /**
     * Get mocked cache record
     * @return {OpenSeadragon.CacheRecord}
     */
    getCacheRecord(props={}) {
        return OpenSeadragon.extend(new OpenSeadragon.CacheRecord(), props);
    },

    /**
     * Create a mock WebGL context for testing WebGL error handling.
     * The context includes all necessary WebGL constants and stub methods.
     *
     * @param {Object} overrides - Properties to override in the mock context
     * @param {Function} overrides.getParameter - Custom getParameter implementation
     * @param {Function} overrides.isContextLost - Custom isContextLost implementation
     * @return {Object} Mock WebGL context
     */
    createMockWebGLContext(overrides = {}) {
        const defaultContext = {
            // WebGL constants
            MAX_TEXTURE_IMAGE_UNITS: 0x8872,
            UNPACK_PREMULTIPLY_ALPHA_WEBGL: 0x9241,
            TEXTURE_2D: 0x0DE1,
            FRAMEBUFFER: 0x8D40,
            COLOR_ATTACHMENT0: 0x8CE0,
            ARRAY_BUFFER: 0x8892,
            STATIC_DRAW: 0x88E4,
            VERTEX_SHADER: 0x8B31,
            FRAGMENT_SHADER: 0x8B30,
            COMPILE_STATUS: 0x8B81,
            LINK_STATUS: 0x8B82,
            COLOR_BUFFER_BIT: 0x00004000,
            BLEND: 0x0BE2,
            ONE: 1,
            ONE_MINUS_SRC_ALPHA: 0x0303,
            CLAMP_TO_EDGE: 0x812F,
            TEXTURE_WRAP_S: 0x2802,
            TEXTURE_WRAP_T: 0x2803,
            TEXTURE_MIN_FILTER: 0x2801,
            TEXTURE_MAG_FILTER: 0x2800,
            LINEAR: 0x2601,
            TEXTURE0: 0x84C0,
            RGBA: 0x1908,
            UNSIGNED_BYTE: 0x1401,
            TEXTURE_CUBE_MAP: 0x8513,
            ELEMENT_ARRAY_BUFFER: 0x8893,
            RENDERBUFFER: 0x8D41,

            // Default method implementations
            getParameter: function(param) {
                if (param === this.MAX_TEXTURE_IMAGE_UNITS) {
                    return 16; // Valid default
                }
                return 16;
            },
            pixelStorei: function() {},
            isContextLost: function() { return false; },
            createShader: function() { return {}; },
            shaderSource: function() {},
            compileShader: function() {},
            getShaderParameter: function() { return true; },
            createProgram: function() { return {}; },
            attachShader: function() {},
            linkProgram: function() {},
            getProgramParameter: function() { return true; },
            useProgram: function() {},
            getUniformLocation: function() { return {}; },
            uniform1iv: function() {},
            uniform1fv: function() {},
            uniformMatrix3fv: function() {},
            uniform1f: function() {},
            getAttribLocation: function() { return 0; },
            enableVertexAttribArray: function() {},
            createBuffer: function() { return {}; },
            bindBuffer: function() {},
            bufferData: function() {},
            vertexAttribPointer: function() {},
            createTexture: function() { return {}; },
            bindTexture: function() {},
            texImage2D: function() {},
            texParameteri: function() {},
            activeTexture: function() {},
            drawArrays: function() {},
            createFramebuffer: function() { return {}; },
            bindFramebuffer: function() {},
            framebufferTexture2D: function() {},
            viewport: function() {},
            clearColor: function() {},
            clear: function() {},
            enable: function() {},
            blendFunc: function() {},
            bindRenderbuffer: function() {},
            deleteBuffer: function() {},
            deleteFramebuffer: function() {},
            deleteTexture: function() {},
            deleteShader: function() {},
            deleteProgram: function() {},
            getExtension: function() { return null; }
        };

        // Apply overrides
        return Object.assign(defaultContext, overrides);
    },

    /**
     * Create a mock viewer for WebGL drawer testing.
     *
     * @param {Object} props - Properties to override in the mock viewer
     * @return {Object} Mock viewer object
     */
    createMockViewerForWebGL(props = {}) {
        const element = document.createElement('div');
        const canvas = document.createElement('canvas');

        const defaultViewer = {
            rejectEventHandler: function() {},
            addHandler: function() {},
            _registerDrawer: function() {}, // Required by DrawerBase constructor
            canvas: canvas,
            container: element,
            opacity: 1, // Required by DrawerBase constructor
            viewport: {
                getContainerSize: function() { return new OpenSeadragon.Point(500, 400); }
            }
        };

        return Object.assign(defaultViewer, props);
    },

    /**
     * Helper to mock HTMLCanvasElement.getContext for WebGL testing.
     * Returns the original getContext function for restoration.
     *
     * @param {Object|null} mockContext - The mock WebGL context to return, or null to simulate no WebGL support
     * @return {Function} The original getContext function to restore after testing
     */
    mockWebGLContext(mockContext) {
        const originalGetContext = HTMLCanvasElement.prototype.getContext;

        HTMLCanvasElement.prototype.getContext = function(contextType) {
            if (contextType === 'webgl' || contextType === 'experimental-webgl') {
                return mockContext;
            }
            return originalGetContext.call(this, contextType);
        };

        return originalGetContext;
    },

    /**
     * Restore the original HTMLCanvasElement.getContext function.
     *
     * @param {Function} originalGetContext - The original getContext function to restore
     */
    restoreWebGLContext(originalGetContext) {
        HTMLCanvasElement.prototype.getContext = originalGetContext;
    }
};

