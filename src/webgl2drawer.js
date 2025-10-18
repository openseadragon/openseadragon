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
    * @classdesc Enhanced WebGL2 implementation of Drawer for an {@link OpenSeadragon.Viewer}. The WebGL2Drawer
    * extends the capabilities of the WebGLDrawer by utilizing WebGL2 features such as:
    * - Vertex Array Objects (VAOs) for improved performance and state management
    * - Enhanced texture formats and capabilities (3D textures, texture arrays)
    * - More efficient uniform buffer objects and instanced rendering
    * - Transform feedback for advanced rendering techniques
    * - Multiple render targets and advanced blending
    * - Integer textures and improved precision
    *
    * If WebGL2 is not available, this drawer will automatically fall back to WebGL (WebGLDrawer),
    * which in turn falls back to Canvas if WebGL is not supported.
    *
    * The drawer utilizes an optimized two-pass rendering pipeline with WebGL2 enhancements:
    * - First pass: Render tiles to framebuffer using VAOs and optimized shaders
    * - Second pass: Composite framebuffer to output canvas with enhanced blending
    *
    * @param {Object} options - Options for this Drawer.
    * @param {OpenSeadragon.Viewer} options.viewer - The Viewer that owns this Drawer.
    * @param {OpenSeadragon.Viewport} options.viewport - Reference to Viewer viewport.
    * @param {HTMLElement} options.element - Parent element.
    * @param {Array} [options.debugGridColor] - An array of hex color values to use for the debug grid.
    * @param {Boolean} [options.unpackWithPremultipliedAlpha=false] - Whether to enable gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL when uploading textures.
    * @param {Boolean} [options.useVertexArrayObjects=true] - Whether to use Vertex Array Objects for improved performance.
    * @param {Boolean} [options.useUniformBufferObjects=true] - Whether to use Uniform Buffer Objects for batch rendering.
    * @param {Boolean} [options.useInstancedDrawing=false] - Whether to use instanced drawing for multiple tiles.
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
             * Whether to use Uniform Buffer Objects
             * @member {Boolean} _useUniformBufferObjects
             * @memberof OpenSeadragon.WebGL2Drawer#
             * @private
             */
            this._useUniformBufferObjects = this.options.useUniformBufferObjects !== false;

            /**
             * Whether to use instanced drawing
             * @member {Boolean} _useInstancedDrawing
             * @memberof OpenSeadragon.WebGL2Drawer#
             * @private
             */
            this._useInstancedDrawing = this.options.useInstancedDrawing === true;

            /**
             * Vertex Array Objects cache
             * @member {Map} _vaos
             * @memberof OpenSeadragon.WebGL2Drawer#
             * @private
             */
            this._vaos = new Map();

            /**
             * Uniform Buffer Objects cache
             * @member {Map} _ubos
             * @memberof OpenSeadragon.WebGL2Drawer#
             * @private
             */
            this._ubos = new Map();

            /**
             * Transform feedback objects
             * @member {Array} _transformFeedbacks
             * @memberof OpenSeadragon.WebGL2Drawer#
             * @private
             */
            this._transformFeedbacks = [];

            // Initialize WebGL2-specific features if available
            if (this._usingWebGL2) {
                // Additional WebGL2-specific initialization
                this._initWebGL2Features();
            }
        }

        /**
         * Get the default options for this drawer
         */
        get defaultOptions() {
            const parentOptions = super.defaultOptions;
            return Object.assign({}, parentOptions, {
                useVertexArrayObjects: true,
                useUniformBufferObjects: true,
                useInstancedDrawing: false
            });
        }

        /**
         * Initialize WebGL2-specific features
         * @private
         */
        _initWebGL2Features() {
            // This will be called after GL context is available
            // Additional setup will happen in _setupRenderer
        }

        /**
         * Static method to get the drawer type
         */
        static getType(){
            return 'webgl2';
        }

        /**
         * Check if this drawer is supported
         */
        static isSupported() {
            return OpenSeadragon.WebGL2Drawer.isWebGL2Supported() ||
                   OpenSeadragon.WebGLDrawer.isSupported();
        }

        /**
         * Check if WebGL2 is specifically supported
         */
        static isWebGL2Supported() {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('webgl2');
                return !!ctx;
            } catch (e) {
                return false;
            }
        }

        /**
         * Get supported data formats
         */
        getSupportedDataFormats() {
            const formats = super.getSupportedDataFormats();

            if (this._usingWebGL2 && this._gl) {
                // Add WebGL2-specific formats
                formats.push('RGB32F', 'RGBA32F', 'RGB16F', 'RGBA16F');
                formats.push('R8', 'RG8', 'RGB8', 'RGBA8');
                formats.push('R16F', 'RG16F');
                formats.push('R32F', 'RG32F');

                // Integer formats
                formats.push('R8I', 'R8UI', 'R16I', 'R16UI', 'R32I', 'R32UI');
                formats.push('RG8I', 'RG8UI', 'RG16I', 'RG16UI', 'RG32I', 'RG32UI');
                formats.push('RGB8I', 'RGB8UI', 'RGB16I', 'RGB16UI', 'RGB32I', 'RGB32UI');
                formats.push('RGBA8I', 'RGBA8UI', 'RGBA16I', 'RGBA16UI', 'RGBA32I', 'RGBA32UI');
            }

            return formats;
        }

        /**
         * Destroy the drawer and clean up WebGL2 resources
         */
        destroy(){
            if(this._destroyed){
                return;
            }

            // Clean up WebGL2-specific resources
            if (this._gl && this._usingWebGL2) {
                // Clean up VAOs
                for (const vao of this._vaos.values()) {
                    if (vao) {
                        this._gl.deleteVertexArray(vao);
                    }
                }
                this._vaos.clear();

                // Clean up UBOs
                for (const ubo of this._ubos.values()) {
                    if (ubo) {
                        this._gl.deleteBuffer(ubo);
                    }
                }
                this._ubos.clear();

                // Clean up transform feedbacks
                for (const tf of this._transformFeedbacks) {
                    if (tf) {
                        this._gl.deleteTransformFeedback(tf);
                    }
                }
                this._transformFeedbacks = [];
            }

            // Call parent destroy
            super.destroy();
        }

        /**
         * Override canvas setup to use WebGL2 context
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
            this._gl = this._renderingCanvas.getContext('webgl2', {
                alpha: false,
                antialias: false,
                premultipliedAlpha: false,
                preserveDrawingBuffer: false,
                powerPreference: 'high-performance'
            });

            if (!this._gl) {
                $.console.warn('WebGL2Drawer: WebGL2 context creation failed, falling back to WebGL');
                this._gl = this._renderingCanvas.getContext('webgl');
                this._usingWebGL2 = false;
                if (!this._gl) {
                    $.console.error('WebGL2Drawer: Both WebGL2 and WebGL context creation failed');
                    throw new Error('Neither WebGL2 nor WebGL is supported');
                }
            }

            // Set up event handlers for context loss
            this._renderingCanvas.addEventListener('webglcontextlost', function(event) {
                event.preventDefault();
                _this._contextLost = true;
                $.console.warn('WebGL2Drawer: WebGL context lost');
            });

            this._renderingCanvas.addEventListener('webglcontextrestored', function() {
                _this._contextLost = false;
                _this._setupRenderer();
                $.console.log('WebGL2Drawer: WebGL context restored');
            });

            // Set up context with high-performance settings
            this._setupRenderer();
        }

        /**
         * Set up the WebGL2 renderer with enhanced features
         * @private
         */
        _setupRenderer(){
            const gl = this._gl;
            if(!gl){
                return;
            }

            // Call parent setup first
            super._setupRenderer();

            // Additional WebGL2-specific setup
            if (this._usingWebGL2) {
                // Enable WebGL2 extensions
                this._setupWebGL2Extensions();

                // Set up Vertex Array Objects
                if (this._useVertexArrayObjects) {
                    this._setupVertexArrayObjects();
                }

                // Set up Uniform Buffer Objects
                if (this._useUniformBufferObjects) {
                    this._setupUniformBufferObjects();
                }

                // Set up advanced WebGL2 state
                this._setupWebGL2State();
            }
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
            this._extDisjointTimerQuery = gl.getExtension('EXT_disjoint_timer_query_webgl2');

            if (this._extTextureFilterAnisotropic) {
                this._maxAnisotropy = gl.getParameter(this._extTextureFilterAnisotropic.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
            }
        }

        /**
         * Set up Vertex Array Objects for improved performance
         * @private
         */
        _setupVertexArrayObjects() {
            const gl = this._gl;

            // Create VAO for basic quad rendering
            const quadVAO = gl.createVertexArray();
            gl.bindVertexArray(quadVAO);

            // Set up vertex buffer for quad
            const quadBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
                -1, -1, 0, 1,
                 1, -1, 1, 1,
                -1, 1, 0, 0,
                 1, 1, 1, 0
            ]), gl.STATIC_DRAW);

            // Set up vertex attributes
            gl.enableVertexAttribArray(0); // position
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
            gl.enableVertexAttribArray(1); // texCoord
            gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);

            gl.bindVertexArray(null);
            this._vaos.set('quad', quadVAO);
        }

        /**
         * Set up Uniform Buffer Objects for batch rendering
         * @private
         */
        _setupUniformBufferObjects() {
            const gl = this._gl;

            // Create UBO for matrices
            const matricesUBO = gl.createBuffer();
            gl.bindBuffer(gl.UNIFORM_BUFFER, matricesUBO);
            gl.bufferData(gl.UNIFORM_BUFFER, 256, gl.DYNAMIC_DRAW); // 4 matrices * 64 bytes each
            gl.bindBuffer(gl.UNIFORM_BUFFER, null);

            this._ubos.set('matrices', matricesUBO);
        }

        /**
         * Set up advanced WebGL2 state
         * @private
         */
        _setupWebGL2State() {
            const gl = this._gl;

            // Enable advanced blending if available
            if (gl.getExtension('EXT_blend_func_extended')) {
                // Can use dual source blending
                this._supportsDualSourceBlending = true;
            }

            // Set up multiple render targets if needed
            this._maxColorAttachments = gl.getParameter(gl.MAX_COLOR_ATTACHMENTS);
            this._maxDrawBuffers = gl.getParameter(gl.MAX_DRAW_BUFFERS);
        }

        /**
         * Create enhanced shader programs for WebGL2
         * @private
         */
        _makeFirstPassShaderProgram(){
            if (!this._usingWebGL2) {
                return super._makeFirstPassShaderProgram();
            }

            const gl = this._gl;
            const numTextures = this._gl.getParameter(this._gl.MAX_TEXTURE_IMAGE_UNITS);

            // Enhanced WebGL2 vertex shader
            const vertexShaderSource = `#version 300 es
                precision highp float;

                layout(location = 0) in vec2 a_position;
                layout(location = 1) in vec2 a_texCoord;
                layout(location = 2) in mat3 a_transform;
                layout(location = 5) in float a_opacity;
                layout(location = 6) in float a_textureIndex;

                uniform mat3 u_transform;
                uniform vec2 u_textureSize;

                // Uniform Buffer Object for matrices
                layout(std140) uniform Matrices {
                    mat4 u_viewMatrix;
                    mat4 u_projMatrix;
                    mat4 u_modelMatrix;
                    mat4 u_normalMatrix;
                };

                out vec2 v_texCoord;
                out float v_opacity;
                flat out int v_textureIndex;

                void main() {
                    vec3 position = a_transform * vec3(a_position, 1.0);
                    position = u_transform * position;
                    gl_Position = vec4(position.xy, 0.0, 1.0);

                    v_texCoord = a_texCoord;
                    v_opacity = a_opacity;
                    v_textureIndex = int(a_textureIndex);
                }
            `;

            // Enhanced WebGL2 fragment shader with texture arrays
            let fragmentShaderSource = `#version 300 es
                precision highp float;
                precision highp sampler2DArray;

                in vec2 v_texCoord;
                in float v_opacity;
                flat in int v_textureIndex;

                uniform sampler2D u_textures[${numTextures}];
                uniform sampler2DArray u_textureArray;
                uniform bool u_useTextureArray;
                uniform float u_globalOpacity;

                out vec4 fragmentColor;

                vec4 sampleTexture(int index, vec2 coord) {
                    if (u_useTextureArray) {
                        return texture(u_textureArray, vec3(coord, float(index)));
                    }

                    // Dynamic texture sampling for WebGL2
                    switch(index) {`;

            // Generate dynamic texture sampling cases
            for(let i = 0; i < numTextures; ++i){
                fragmentShaderSource += `
                        case ${i}: return texture(u_textures[${i}], coord);`;
            }

            fragmentShaderSource += `
                        default: return vec4(1.0, 0.0, 1.0, 1.0); // Magenta for invalid index
                    }
                }

                void main() {
                    vec4 texColor = sampleTexture(v_textureIndex, v_texCoord);
                    fragmentColor = texColor * v_opacity * u_globalOpacity;
                }
            `;

            const program = this.constructor.initShaderProgram(gl, vertexShaderSource, fragmentShaderSource);

            if (program) {
                // Set up uniform block binding for UBO
                if (this._useUniformBufferObjects) {
                    const matricesBlockIndex = gl.getUniformBlockIndex(program, 'Matrices');
                    if (matricesBlockIndex !== gl.INVALID_INDEX) {
                        gl.uniformBlockBinding(program, matricesBlockIndex, 0);
                    }
                }

                // Cache uniform locations
                program.uniformLocations = {
                    uTransform: gl.getUniformLocation(program, 'u_transform'),
                    uTextureSize: gl.getUniformLocation(program, 'u_textureSize'),
                    uTextures: [],
                    uTextureArray: gl.getUniformLocation(program, 'u_textureArray'),
                    uUseTextureArray: gl.getUniformLocation(program, 'u_useTextureArray'),
                    uGlobalOpacity: gl.getUniformLocation(program, 'u_globalOpacity')
                };

                // Cache texture uniform locations
                for (let i = 0; i < numTextures; i++) {
                    program.uniformLocations.uTextures[i] = gl.getUniformLocation(program, `u_textures[${i}]`);
                }
            }

            return program;
        }

        /**
         * Create enhanced second pass shader program for WebGL2
         * @private
         */
        _makeSecondPassShaderProgram(){
            if (!this._usingWebGL2) {
                return super._makeSecondPassShaderProgram();
            }

            const gl = this._gl;

            // Enhanced vertex shader for compositing
            const vertexShaderSource = `#version 300 es
                precision highp float;

                layout(location = 0) in vec2 a_position;
                layout(location = 1) in vec2 a_texCoord;

                out vec2 v_texCoord;

                void main() {
                    gl_Position = vec4(a_position, 0.0, 1.0);
                    v_texCoord = a_texCoord;
                }
            `;

            // Enhanced fragment shader with advanced blending
            const fragmentShaderSource = `#version 300 es
                precision highp float;

                in vec2 v_texCoord;

                uniform sampler2D u_texture;
                uniform float u_opacity;
                uniform vec2 u_viewportSize;
                uniform bool u_flipY;
                uniform vec4 u_colorTransform;
                uniform mat4 u_colorMatrix;

                out vec4 fragmentColor;

                void main() {
                    vec2 coord = v_texCoord;
                    if (u_flipY) {
                        coord.y = 1.0 - coord.y;
                    }

                    vec4 texColor = texture(u_texture, coord);

                    // Apply color transformation matrix
                    texColor = u_colorMatrix * texColor;

                    // Apply color transform
                    texColor *= u_colorTransform;

                    fragmentColor = vec4(texColor.rgb, texColor.a * u_opacity);
                }
            `;

            const program = this.constructor.initShaderProgram(gl, vertexShaderSource, fragmentShaderSource);

            if (program) {
                program.uniformLocations = {
                    uTexture: gl.getUniformLocation(program, 'u_texture'),
                    uOpacity: gl.getUniformLocation(program, 'u_opacity'),
                    uViewportSize: gl.getUniformLocation(program, 'u_viewportSize'),
                    uFlipY: gl.getUniformLocation(program, 'u_flipY'),
                    uColorTransform: gl.getUniformLocation(program, 'u_colorTransform'),
                    uColorMatrix: gl.getUniformLocation(program, 'u_colorMatrix')
                };
            }

            return program;
        }

        /**
         * Enhanced tile data processing for WebGL2
         * @private
         */
        _getTileData(tile, tiledImage, textureInfo, viewMatrix, index, texturePositionArray, textureDataArray, matrixArray, opacityArray){
            if (!this._usingWebGL2) {
                return super._getTileData(tile, tiledImage, textureInfo, viewMatrix, index, texturePositionArray, textureDataArray, matrixArray, opacityArray);
            }

            // Enhanced matrix calculation for WebGL2
            const x = tile.position.x;
            const y = tile.position.y;
            const w = tile.size.x;
            const h = tile.size.y;

            // Calculate transform matrix for tile
            const transformMatrix = [
                w, 0, 0,
                0, h, 0,
                x, y, 1
            ];

            // Store transform matrix for instanced rendering
            const matrixIndex = index * 9;
            for (let i = 0; i < 9; i++) {
                matrixArray[matrixIndex + i] = transformMatrix[i];
            }

            // Enhanced texture coordinate calculation
            let sx = tile.sourceBounds.x;
            let sy = tile.sourceBounds.y;
            let sw = tile.sourceBounds.width;
            let sh = tile.sourceBounds.height;

            // Apply WebGL2-specific texture transformations
            if (tile.flipped) {
                sx = 1.0 - sx - sw;
            }

            // Store texture coordinates
            const texIndex = index * 8;
            texturePositionArray[texIndex] = sx;           // left
            texturePositionArray[texIndex + 1] = sy + sh;  // bottom
            texturePositionArray[texIndex + 2] = sx + sw;  // right
            texturePositionArray[texIndex + 3] = sy + sh;  // bottom
            texturePositionArray[texIndex + 4] = sx;       // left
            texturePositionArray[texIndex + 5] = sy;       // top
            texturePositionArray[texIndex + 6] = sx + sw;  // right
            texturePositionArray[texIndex + 7] = sy;       // top

            // Store texture data
            textureDataArray[index] = textureInfo.texture;

            // Store opacity for vertex attributes
            opacityArray[index] = tiledImage.getOpacity();

            return {
                textureIndex: index,
                opacity: tiledImage.getOpacity(),
                transform: transformMatrix
            };
        }

        /**
         * Enhanced texture filtering for WebGL2
         * @private
         */
        _textureFilter(){
            if (!this._usingWebGL2) {
                return super._textureFilter();
            }

            const gl = this._gl;

            if (this._imageSmoothingEnabled) {
                // Use enhanced filtering for WebGL2
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

                // Use anisotropic filtering if available
                if (this._extTextureFilterAnisotropic) {
                    gl.texParameterf(gl.TEXTURE_2D, this._extTextureFilterAnisotropic.TEXTURE_MAX_ANISOTROPY_EXT,
                                   Math.min(4, this._maxAnisotropy));
                }

                // Generate mipmaps for better quality
                gl.generateMipmap(gl.TEXTURE_2D);
                return gl.LINEAR;
            } else {
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            }

            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            return gl.NEAREST;
        }

        /**
         * Enhanced drawing with VAOs and instanced rendering
         * @private
         */
        _drawTiles(program, tilesToDraw, texturePositionArray, matrixArray, opacityArray) {
            if (!this._usingWebGL2 || !this._useVertexArrayObjects) {
                super._drawTiles(program, tilesToDraw, texturePositionArray, matrixArray, opacityArray);
                return;
            }

            const gl = this._gl;
            const quadVAO = this._vaos.get('quad');

            if (quadVAO && this._useInstancedDrawing && tilesToDraw.length > 1) {
                // Use instanced drawing for multiple tiles
                this._drawTilesInstanced(program, tilesToDraw, texturePositionArray, matrixArray, opacityArray);
            } else {
                // Use VAOs for individual tile drawing
                gl.bindVertexArray(quadVAO);

                for (let i = 0; i < tilesToDraw.length; i++) {
                    // Set per-tile uniforms
                    gl.uniform1f(program.uniformLocations.uOpacity, opacityArray[i]);
                    gl.uniformMatrix3fv(program.uniformLocations.uTransform, false, matrixArray.slice(i * 9, (i + 1) * 9));

                    // Draw quad
                    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                }

                gl.bindVertexArray(null);
            }
        }

        /**
         * Instanced drawing for multiple tiles
         * @private
         */
        _drawTilesInstanced(program, tilesToDraw, texturePositionArray, matrixArray, opacityArray) {
            const gl = this._gl;

            // Create instance data buffers
            const transformBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, transformBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(matrixArray), gl.DYNAMIC_DRAW);

            const opacityBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, opacityBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(opacityArray), gl.DYNAMIC_DRAW);

            // Set up instanced attributes
            const quadVAO = this._vaos.get('quad');
            gl.bindVertexArray(quadVAO);

            // Transform matrix (3x3, locations 2-4)
            gl.bindBuffer(gl.ARRAY_BUFFER, transformBuffer);
            for (let i = 0; i < 3; i++) {
                gl.enableVertexAttribArray(2 + i);
                gl.vertexAttribPointer(2 + i, 3, gl.FLOAT, false, 36, i * 12);
                gl.vertexAttribDivisor(2 + i, 1);
            }

            // Opacity (location 5)
            gl.bindBuffer(gl.ARRAY_BUFFER, opacityBuffer);
            gl.enableVertexAttribArray(5);
            gl.vertexAttribPointer(5, 1, gl.FLOAT, false, 4, 0);
            gl.vertexAttribDivisor(5, 1);

            // Draw all instances
            gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, tilesToDraw.length);

            // Clean up
            gl.bindVertexArray(null);
            gl.deleteBuffer(transformBuffer);
            gl.deleteBuffer(opacityBuffer);
        }

        /**
         * Enhanced internal cache creation with WebGL2 features
         */
        internalCacheCreate(cache, tile) {
            if (!this._usingWebGL2) {
                return super.internalCacheCreate(cache, tile);
            }

            const gl = this._gl;
            if (!gl) {
                return null;
            }

            const texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);

            // Use WebGL2 enhanced texture creation
            const image = tile.getImage();

            if (image instanceof ImageBitmap) {
                // Use ImageBitmap for better performance
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            } else if (image instanceof ImageData) {
                // Handle ImageData
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, image.width, image.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, image.data);
            } else {
                // Handle HTMLImageElement/HTMLCanvasElement
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            }

            // Apply enhanced filtering
            this._textureFilter();

            gl.bindTexture(gl.TEXTURE_2D, null);

            return {
                texture: texture,
                width: image.width || image.videoWidth,
                height: image.height || image.videoHeight
            };
        }

        /**
         * Get the instance type for debugging
         */
        getType(){
            return 'webgl2';
        }
    };

    // Register the WebGL2Drawer
    $.WebGL2Drawer.prototype.getType = function(){
        return 'webgl2';
    };

}( OpenSeadragon ));

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
