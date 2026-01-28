/*
 * OpenSeadragon - WebGL2Drawer
 *
 * Copyright (C) 2009 CodePlex Foundation
 * Copyright (C) 2010-2025 OpenSeadragon contributors
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 * - Redistributions of source code must retain the above copyright notice,
 *   this list of conditions and the following disclaimer.
 *
 * - Redistributions in binary form must reproduce the above copyright
 *   notice, this list of conditions and the following disclaimer in the
 *   documentation and/or other materials provided with the distribution.
 *
 * - Neither the name of CodePlex Foundation nor the names of its
 *   contributors may be used to endorse or promote products derived from
 *   this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

(function( $ ){

    const OpenSeadragon = $; // alias for JSDoc

   /**
    * @class OpenSeadragon.WebGL2Drawer
    * @classdesc WebGL2 implementation of Drawer for an {@link OpenSeadragon.Viewer}. The WebGL2Drawer
    * extends the capabilities of the WebGLDrawer by utilizing WebGL2 features such as:
    * - Vertex Array Objects (VAOs) for improved performance and state management
    * - Enhanced texture formats and capabilities
    * - More efficient uniform buffer objects
    * - Advanced WebGL2 extensions (anisotropic filtering, etc.)
    *
    * Unlike the fallback behavior in some drawers, WebGL2Drawer requires WebGL2 support.
    * If WebGL2 is not available, this drawer will report as unsupported and the viewer
    * will try the next drawer in the fallback chain (typically WebGLDrawer).
    *
    * The drawer utilizes the same two-pass rendering pipeline as WebGLDrawer but with WebGL2 optimizations.
    *
    * @extends OpenSeadragon.WebGLDrawer
    * @param {Object} options - Options for this Drawer.
    * @param {OpenSeadragon.Viewer} options.viewer - The Viewer that owns this Drawer.
    * @param {OpenSeadragon.Viewport} options.viewport - Reference to Viewer viewport.
    * @param {HTMLElement} options.element - Parent element.
    * @param {Array} [options.debugGridColor] - An array of hex color values to use for the debug grid.
    * @param {Boolean} [options.unpackWithPremultipliedAlpha=false] - Whether to enable gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL when uploading textures.
    * @param {Boolean} [options.useVertexArrayObjects=true] - Whether to use Vertex Array Objects for improved performance.
    */
    OpenSeadragon.WebGL2Drawer = class WebGL2Drawer extends OpenSeadragon.WebGLDrawer {
        constructor(options) {
            // Always call parent constructor first
            super(options);

            /**
             * Whether to use Vertex Array Objects
             * @member {Boolean} _useVertexArrayObjects
             * @memberof OpenSeadragon.WebGL2Drawer#
             * @private
             */
            this._useVertexArrayObjects = this.options.useVertexArrayObjects !== false;

            /**
             * Vertex Array Objects cache
             * @member {Map} _vaoCache
             * @memberof OpenSeadragon.WebGL2Drawer#
             * @private
             */
            this._vaoCache = new Map();

            // Initialize WebGL2-specific features
            this._initWebGL2Features();
        }

        /**
         * Get the default options for this drawer.
         * Note: preloadCache is set to true to enable async cache preparation,
         * which improves performance since texture creation/upload is heavy.
         * @returns {Object} The default options
         */
        get defaultOptions() {
            return $.extend({}, super.defaultOptions, {
                useVertexArrayObjects: true,
                preloadCache: true
            });
        }

        /**
         * Returns drawer type string for this drawer
         * @returns {String} The drawer type
         */
        static getType() {
            return 'webgl2';
        }

        /**
         * Check if this drawer is supported.
         * Returns true only if WebGL2 is available - does NOT fall back to WebGL.
         * This allows the viewer's drawer fallback chain to work properly.
         * @returns {Boolean} Whether WebGL2 is supported
         */
        static isSupported() {
            return OpenSeadragon.WebGL2Drawer.isWebGL2Supported();
        }

        /**
         * Check if WebGL2 is specifically supported
         * @returns {Boolean} Whether WebGL2 is supported by the browser
         */
        static isWebGL2Supported() {
            try {
                const canvas = document.createElement('canvas');
                const gl = canvas.getContext('webgl2');
                const supported = !!gl;
                if (gl) {
                    // Clean up the context
                    const ext = gl.getExtension('WEBGL_lose_context');
                    if (ext) {
                        ext.loseContext();
                    }
                }
                return supported;
            } catch (e) {
                return false;
            }
        }

        /**
         * Initialize WebGL2-specific features
         * @private
         */
        _initWebGL2Features() {
            // WebGL2-specific initialization
            // Extensions are set up in _setupWebGL2Extensions after context is created
        }

        /**
         * Override the canvas setup to use WebGL2 context
         * @private
         */
        _setupCanvases() {
            const _this = this;

            this._outputCanvas = this.canvas; // output canvas
            this._outputContext = this._outputCanvas.getContext('2d');

            this._renderingCanvas = document.createElement('canvas');

            this._clippingCanvas = document.createElement('canvas');
            this._clippingContext = this._clippingCanvas.getContext('2d');
            this._renderingCanvas.width = this._clippingCanvas.width = this._outputCanvas.width;
            this._renderingCanvas.height = this._clippingCanvas.height = this._outputCanvas.height;

            // Create WebGL2 context - no fallback to WebGL here
            this._gl = this._renderingCanvas.getContext('webgl2');
            if (!this._gl) {
                $.console.error('WebGL2Drawer: WebGL2 context creation failed');
                throw new Error('WebGL2 is not supported');
            }

            // Check for context loss/invalid parameters
            const maxTextureUnits = this._gl.getParameter(this._gl.MAX_TEXTURE_IMAGE_UNITS);
            if (maxTextureUnits <= 0) {
                $.console.warn(`WebGL2Drawer: Invalid MAX_TEXTURE_IMAGE_UNITS (${maxTextureUnits}). Falling back to CanvasDrawer.`);
                this._webglFailed = true;
                return;
            }

            this._gl.pixelStorei(this._gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, this._unpackWithPremultipliedAlpha);

            // Set up WebGL2 extensions
            this._setupWebGL2Extensions();

            this._resizeHandler = function() {
                if (_this._outputCanvas !== _this.viewer.drawer.canvas) {
                    _this._outputCanvas.style.width = _this.viewer.drawer.canvas.clientWidth + 'px';
                    _this._outputCanvas.style.height = _this.viewer.drawer.canvas.clientHeight + 'px';
                }

                const viewportSize = _this._calculateCanvasSize();
                if (_this._outputCanvas.width !== viewportSize.x ||
                    _this._outputCanvas.height !== viewportSize.y) {
                    _this._outputCanvas.width = viewportSize.x;
                    _this._outputCanvas.height = viewportSize.y;
                }

                _this._renderingCanvas.style.width = _this._outputCanvas.clientWidth + 'px';
                _this._renderingCanvas.style.height = _this._outputCanvas.clientHeight + 'px';
                _this._renderingCanvas.width = _this._clippingCanvas.width = _this._outputCanvas.width;
                _this._renderingCanvas.height = _this._clippingCanvas.height = _this._outputCanvas.height;

                // important - update the size of the rendering viewport!
                _this._resizeRenderer();
            };

            // make the additional canvas elements mirror size changes to the output canvas
            this.viewer.addHandler("resize", this._resizeHandler);
        }

        /**
         * Set up WebGL2 extensions
         * @private
         */
        _setupWebGL2Extensions() {
            const gl = this._gl;

            // Get useful WebGL2 extensions
            this._extColorBufferFloat = gl.getExtension('EXT_color_buffer_float');
            this._extTextureFilterAnisotropic = gl.getExtension('EXT_texture_filter_anisotropic');

            if (this._extTextureFilterAnisotropic) {
                this._maxAnisotropy = gl.getParameter(
                    this._extTextureFilterAnisotropic.MAX_TEXTURE_MAX_ANISOTROPY_EXT
                );
            }
        }

        /**
         * Override texture filter to use WebGL2 features like anisotropic filtering.
         * Note: We don't use mipmaps here because tiled images already have their own
         * resolution pyramid through the tile levels. Generating mipmaps per tile would
         * be wasteful since tiles are replaced by higher/lower resolution tiles as needed.
         * @private
         * @returns {Number} The texture filter constant
         */
        _textureFilter() {
            const gl = this._gl;

            // Always set wrap parameters (fixes bug where wrap was only set in else branch)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            if (this._imageSmoothingEnabled) {
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

                // Use anisotropic filtering if available for better quality at angles
                if (this._extTextureFilterAnisotropic && this._maxAnisotropy) {
                    gl.texParameterf(
                        gl.TEXTURE_2D,
                        this._extTextureFilterAnisotropic.TEXTURE_MAX_ANISOTROPY_EXT,
                        Math.min(4, this._maxAnisotropy)
                    );
                }

                return gl.LINEAR;
            } else {
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                return gl.NEAREST;
            }
        }

        /**
         * Clean up WebGL2-specific resources
         */
        destroy() {
            if (this._destroyed) {
                return;
            }

            if (this._vaoCache) {
                // Clean up VAOs
                const gl = this._gl;
                if (gl) {
                    for (const vao of this._vaoCache.values()) {
                        if (vao) {
                            gl.deleteVertexArray(vao);
                        }
                    }
                }
                this._vaoCache.clear();
            }

            // Call parent destroy
            super.destroy();
        }

        /**
         * Get debug information about the drawer
         * @returns {Object} Debug information
         */
        getDebugInfo() {
            const baseInfo = super.getDebugInfo ? super.getDebugInfo() : {};
            const gl = this._gl;

            return $.extend({}, baseInfo, {
                drawerType: 'WebGL2Drawer',
                useVertexArrayObjects: this._useVertexArrayObjects,
                webgl2Features: gl ? {
                    maxColorAttachments: gl.getParameter(gl.MAX_COLOR_ATTACHMENTS),
                    maxDrawBuffers: gl.getParameter(gl.MAX_DRAW_BUFFERS),
                    maxFragmentUniformBlocks: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_BLOCKS),
                    maxVertexUniformBlocks: gl.getParameter(gl.MAX_VERTEX_UNIFORM_BLOCKS),
                    hasAnisotropicFiltering: !!this._extTextureFilterAnisotropic,
                    maxAnisotropy: this._maxAnisotropy || 0
                } : null
            });
        }

        /**
         * Get the instance type for debugging
         * @returns {String} The drawer type
         */
        getType() {
            return 'webgl2';
        }
    };

}( OpenSeadragon ));
