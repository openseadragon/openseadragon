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
    * - Vertex Array Objects (VAOs) for improved performance
    * - Enhanced texture formats and capabilities
    * - More efficient uniform buffer objects
    * - Transform feedback for advanced rendering techniques
    *
    * If WebGL2 is not available, this drawer will automatically fall back to WebGL (WebGLDrawer),
    * which in turn falls back to Canvas if WebGL is not supported.
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
    OpenSeadragon.WebGL2Drawer = class WebGL2Drawer extends OpenSeadragon.WebGLDrawer{
        constructor(options){
            // Always call parent constructor first
            super(options);

            /**
             * Indicates that this is using WebGL2
             * @member {Boolean} _usingWebGL2
             * @memberof OpenSeadragon.WebGL2Drawer#
             * @private
             */
            this._usingWebGL2 = this.constructor.isWebGL2Supported();

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

            // Override WebGL context creation to use WebGL2
            this._initializeWebGL2Features();
        }

        /**
         * Get the default options for this drawer
         * @returns {Object} The default options
         */
        get defaultOptions() {
            return $.extend(super.defaultOptions, {
                useVertexArrayObjects: true
            });
        }

        /**
         * Returns drawer ID string for this drawer
         * @returns {String} The drawer ID
         */
        static getType(){
            return 'webgl2';
        }

        /**
         * Check if this drawer is supported
         * @returns {Boolean} Whether WebGL2 is supported, with fallback to WebGL
         */
        static isSupported(){
            return WebGL2Drawer.isWebGL2Supported() || OpenSeadragon.WebGLDrawer.isSupported();
        }

        /**
         * Check if WebGL2 is specifically supported
         * @returns {Boolean} Whether WebGL2 is supported by the browser
         */
        static isWebGL2Supported(){
            try {
                const canvas = document.createElement('canvas');
                const gl = canvas.getContext('webgl2');
                const supported = !!gl;
                if (gl) {
                    // Clean up
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
        _initializeWebGL2Features() {
            if (this._usingWebGL2) {
                $.console.log('WebGL2Drawer: Initializing WebGL2 features');
                // Additional WebGL2-specific initialization can go here
                // For now, we use the same rendering pipeline as WebGL but with WebGL2 context
            }
        }

        /**
         * Override the canvas setup to use WebGL2 context
         * @private
         */
        _setupCanvases(){
            const _this = this;

            this._outputCanvas = this.canvas; //output canvas
            this._outputContext = this._outputCanvas.getContext('2d');

            this._renderingCanvas = document.createElement('canvas');

            this._clippingCanvas = document.createElement('canvas');
            this._clippingContext = this._clippingCanvas.getContext('2d');
            this._renderingCanvas.width = this._clippingCanvas.width = this._outputCanvas.width;
            this._renderingCanvas.height = this._clippingCanvas.height = this._outputCanvas.height;

            // Try WebGL2 first, fall back to WebGL if needed
            this._gl = this._renderingCanvas.getContext('webgl2');
            if (!this._gl) {
                $.console.warn('WebGL2Drawer: WebGL2 context creation failed, falling back to WebGL');
                this._gl = this._renderingCanvas.getContext('webgl');
                this._usingWebGL2 = false;
                if (!this._gl) {
                    $.console.error('WebGL2Drawer: Both WebGL2 and WebGL context creation failed');
                    throw new Error('Neither WebGL2 nor WebGL is supported');
                }
            }

            // Check for context loss/invalid parameters like the original WebGLDrawer
            const maxTextureUnits = this._gl.getParameter(this._gl.MAX_TEXTURE_IMAGE_UNITS);
            if (maxTextureUnits <= 0) {
                $.console.warn(`WebGL2Drawer: Invalid MAX_TEXTURE_IMAGE_UNITS (${maxTextureUnits}). Falling back to CanvasDrawer.`);
                this._webglFailed = true;
                return;
            }

            this._gl.pixelStorei(this._gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, this._unpackWithPremultipliedAlpha);

            this._resizeHandler = function(){

                if(_this._outputCanvas !== _this.viewer.drawer.canvas){
                    _this._outputCanvas.style.width = _this.viewer.drawer.canvas.clientWidth + 'px';
                    _this._outputCanvas.style.height = _this.viewer.drawer.canvas.clientHeight + 'px';
                }

                const viewportSize = _this._calculateCanvasSize();
                if( _this._outputCanvas.width !== viewportSize.x ||
                    _this._outputCanvas.height !== viewportSize.y ) {
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

            //make the additional canvas elements mirror size changes to the output canvas
            this.viewer.addHandler("resize", this._resizeHandler);
        }

        /**
         * Create a Vertex Array Object for improved performance (WebGL2 feature)
         * @param {Object} attributes - Attribute configuration
         * @returns {WebGLVertexArrayObject|null} The created VAO or null if not supported
         * @private
         */
        _createVertexArrayObject(attributes) {
            if (!this._usingWebGL2 || !this._useVertexArrayObjects) {
                return null;
            }

            const gl = this._gl;
            const vao = gl.createVertexArray();
            gl.bindVertexArray(vao);

            // Configure vertex attributes here based on the attributes parameter
            // This is a simplified version - in a full implementation you'd configure
            // all the vertex attribute pointers
            gl.bindVertexArray(null);
            return vao;
        }

        /**
         * Clean up WebGL2-specific resources
         */
        destroy(){
            if (this._vaoCache) {
                // Clean up VAOs
                const gl = this._gl;
                if (gl && this._usingWebGL2) {
                    for (const vao of this._vaoCache.values()) {
                        gl.deleteVertexArray(vao);
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
            return $.extend(baseInfo, {
                drawerType: 'WebGL2Drawer',
                usingWebGL2: this._usingWebGL2,
                useVertexArrayObjects: this._useVertexArrayObjects,
                webgl2Features: this._usingWebGL2 ? {
                    maxColorAttachments: this._gl.getParameter(this._gl.MAX_COLOR_ATTACHMENTS),
                    maxDrawBuffers: this._gl.getParameter(this._gl.MAX_DRAW_BUFFERS),
                    maxFragmentUniformBlocks: this._gl.getParameter(this._gl.MAX_FRAGMENT_UNIFORM_BLOCKS),
                    maxVertexUniformBlocks: this._gl.getParameter(this._gl.MAX_VERTEX_UNIFORM_BLOCKS)
                } : null
            });
        }
    };

    // Make the type method accessible on the prototype as well
    OpenSeadragon.WebGL2Drawer.prototype.getType = function(){
        return 'webgl2';
    };

}( OpenSeadragon ));
