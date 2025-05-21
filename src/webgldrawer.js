
/*
 * OpenSeadragon - WebGLDrawer
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
    * @class OpenSeadragon.WebGLDrawer
    * @classdesc Default implementation of WebGLDrawer for an {@link OpenSeadragon.Viewer}. The WebGLDrawer
    * defines its own data type that ensures textures are correctly loaded to and deleted from the GPU memory.
    * The drawer utilizes a context-dependent two pass drawing pipeline. For the first pass, tile composition
    * for a given TiledImage is always done using a canvas with a WebGL context. This allows tiles to be stitched
    * together without seams or artifacts, without requiring a tile source with overlap. If overlap is present,
    * overlapping pixels are discarded. The second pass copies all pixel data from the WebGL context onto an output
    * canvas with a Context2d context. This allows applications to have access to pixel data and other functionality
    * provided by Context2d, regardless of whether the CanvasDrawer or the WebGLDrawer is used. Certain options,
    * including compositeOperation, clip, croppingPolygons, and debugMode are implemented using Context2d operations;
    * in these scenarios, each TiledImage is drawn onto the output canvas immediately after the tile composition step
    * (pass 1). Otherwise, for efficiency, all TiledImages are copied over to the output canvas at once, after all
    * tiles have been composited for all images.
    * @param {Object} options - Options for this Drawer.
    * @param {OpenSeadragon.Viewer} options.viewer - The Viewer that owns this Drawer.
    * @param {OpenSeadragon.Viewport} options.viewport - Reference to Viewer viewport.
    * @param {Element} options.element - Parent element.
    * @param {Number} [options.debugGridColor] - See debugGridColor in {@link OpenSeadragon.Options} for details.
    */
    OpenSeadragon.WebGLDrawer = class WebGLDrawer extends OpenSeadragon.DrawerBase{
        constructor(options){
           super(options);

            /**
             * The HTML element (canvas) that this drawer uses for drawing
             * @member {Element} canvas
             * @memberof OpenSeadragon.WebGLDrawer#
             */

            /**
             * The parent element of this Drawer instance, passed in when the Drawer was created.
             * The parent of {@link OpenSeadragon.WebGLDrawer#canvas}.
             * @member {Element} container
             * @memberof OpenSeadragon.WebGLDrawer#
             */

            // private members
            this._destroyed = false;
            this._gl = null;
            this._firstPass = null;
            this._secondPass = null;
            this._glFrameBuffer = null;
            this._renderToTexture = null;
            this._outputCanvas = null;
            this._outputContext = null;
            this._clippingCanvas = null;
            this._clippingContext = null;
            this._renderingCanvas = null;
            this._backupCanvasDrawer = null;

            this._imageSmoothingEnabled = true; // will be updated by setImageSmoothingEnabled

            // Reject listening for the tile-drawing and tile-drawn events, which this drawer does not fire
            this.viewer.rejectEventHandler("tile-drawn", "The WebGLDrawer does not raise the tile-drawn event");
            this.viewer.rejectEventHandler("tile-drawing", "The WebGLDrawer does not raise the tile-drawing event");

            // this.viewer and this.canvas are part of the public DrawerBase API
            // and are defined by the parent DrawerBase class. Additional setup is done by
            // the private _setupCanvases and _setupRenderer functions.
            this._setupCanvases();
            this._setupRenderer();

            this._supportedFormats = ["context2d", "image"];
            this.context = this._outputContext; // API required by tests
        }

        get defaultOptions() {
            return {
                // use detached cache: our type conversion will not collide (and does not have to preserve CPU data ref)
                usePrivateCache: true,
                preloadCache: false,
            };
        }

        getSupportedDataFormats() {
            return this._supportedFormats;
        }

        // Public API required by all Drawer implementations
        /**
        * Clean up the renderer, removing all resources
        */
        destroy(){
            if(this._destroyed){
                return;
            }
            // clear all resources used by the renderer, geometries, textures etc
            let gl = this._gl;

            // adapted from https://stackoverflow.com/a/23606581/1214731
            var numTextureUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
            for (let unit = 0; unit < numTextureUnits; ++unit) {
                gl.activeTexture(gl.TEXTURE0 + unit);
                gl.bindTexture(gl.TEXTURE_2D, null);
                gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
            gl.bindRenderbuffer(gl.RENDERBUFFER, null);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);

            // Delete all our created resources
            gl.deleteBuffer(this._secondPass.bufferOutputPosition);
            gl.deleteFramebuffer(this._glFrameBuffer);

            // make canvases 1 x 1 px and delete references
            this._renderingCanvas.width = this._renderingCanvas.height = 1;
            this._clippingCanvas.width = this._clippingCanvas.height = 1;
            this._outputCanvas.width = this._outputCanvas.height = 1;
            this._renderingCanvas = null;
            this._clippingCanvas = this._clippingContext = null;
            this._outputCanvas = this._outputContext = null;

            let ext = gl.getExtension('WEBGL_lose_context');
            if(ext){
                ext.loseContext();
            }

            // set our webgl context reference to null to enable garbage collection
            this._gl = null;

            if(this._backupCanvasDrawer){
                this._backupCanvasDrawer.destroy();
                this._backupCanvasDrawer = null;
            }

            this.container.removeChild(this.canvas);
            if(this.viewer.drawer === this){
                this.viewer.drawer = null;
            }

            this.destroyInternalCache();

            // set our destroyed flag to true
            this._destroyed = true;
        }

        // Public API required by all Drawer implementations
        /**
        *
        * @returns {Boolean} true
        */
        canRotate(){
            return true;
        }

        // Public API required by all Drawer implementations
        /**
        * @returns {Boolean} true if canvas and webgl are supported
        */
        static isSupported(){
            let canvasElement = document.createElement( 'canvas' );
            let webglContext = $.isFunction( canvasElement.getContext ) &&
                        canvasElement.getContext( 'webgl' );
            let ext = webglContext && webglContext.getExtension('WEBGL_lose_context');
            if(ext){
                ext.loseContext();
            }
            return !!( webglContext );
        }

        /**
         *
         * @returns {string} 'webgl'
         */
        getType(){
            return 'webgl';
        }

        /**
         * @param {TiledImage} tiledImage the tiled image that is calling the function
         * @returns {Boolean} Whether this drawer requires enforcing minimum tile overlap to avoid showing seams.
         * @private
         */
        minimumOverlapRequired(tiledImage) {
            // return true if the tiled image is tainted, since the backup canvas drawer will be used.
            return tiledImage.isTainted();
        }

        /**
        * create the HTML element (canvas in this case) that the image will be drawn into
        * @private
        * @returns {Element} the canvas to draw into
        */
        _createDrawingElement(){
            let canvas = $.makeNeutralElement("canvas");
            let viewportSize = this._calculateCanvasSize();
            canvas.width = viewportSize.x;
            canvas.height = viewportSize.y;
            return canvas;
        }

        /**
         * Get the backup renderer (CanvasDrawer) to use if data cannot be used by webgl
         * Lazy loaded
         * @private
         * @returns {CanvasDrawer}
         */
        _getBackupCanvasDrawer(){
            if(!this._backupCanvasDrawer){
                this._backupCanvasDrawer = this.viewer.requestDrawer('canvas', {mainDrawer: false});
                this._backupCanvasDrawer.canvas.style.setProperty('visibility', 'hidden');
                this._backupCanvasDrawer.getSupportedDataFormats = () => this._supportedFormats;
                this._backupCanvasDrawer.getDataToDraw = this.getDataToDraw.bind(this);
            }

            return this._backupCanvasDrawer;
        }

        /**
        *
        * @param {Array} tiledImages Array of TiledImage objects to draw
        */
        draw(tiledImages){
            let gl = this._gl;
            const bounds = this.viewport.getBoundsNoRotateWithMargins(true);
            let view = {
                bounds: bounds,
                center: new OpenSeadragon.Point(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2),
                rotation: this.viewport.getRotation(true) * Math.PI / 180
            };

            let flipMultiplier = this.viewport.flipped ? -1 : 1;
            // calculate view matrix for viewer
            let posMatrix = $.Mat3.makeTranslation(-view.center.x, -view.center.y);
            let scaleMatrix = $.Mat3.makeScaling(2 / view.bounds.width * flipMultiplier, -2 / view.bounds.height);
            let rotMatrix = $.Mat3.makeRotation(-view.rotation);
            let viewMatrix = scaleMatrix.multiply(rotMatrix).multiply(posMatrix);

            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.clear(gl.COLOR_BUFFER_BIT); // clear the back buffer

            // clear the output canvas
            this._outputContext.clearRect(0, 0, this._outputCanvas.width, this._outputCanvas.height);


            let renderingBufferHasImageData = false;

            //iterate over tiled images and draw each one using a two-pass rendering pipeline if needed
            tiledImages.forEach( (tiledImage, tiledImageIndex) => {

                if(tiledImage.isTainted()){
                    // first, draw any data left in the rendering buffer onto the output canvas
                    if(renderingBufferHasImageData){
                        this._outputContext.drawImage(this._renderingCanvas, 0, 0);
                        // clear the buffer
                        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                        gl.clear(gl.COLOR_BUFFER_BIT); // clear the back buffer
                        renderingBufferHasImageData = false;
                    }

                    // next, use the backup canvas drawer to draw this tainted image
                    const canvasDrawer = this._getBackupCanvasDrawer();
                    canvasDrawer.draw([tiledImage]);
                    this._outputContext.drawImage(canvasDrawer.canvas, 0, 0);

                } else {
                    let tilesToDraw = tiledImage.getTilesToDraw();

                    if ( tiledImage.placeholderFillStyle && tiledImage._hasOpaqueTile === false ) {
                        this._drawPlaceholder(tiledImage);
                    }

                    if(tilesToDraw.length === 0 || tiledImage.getOpacity() === 0){
                        return;
                    }
                    let firstTile = tilesToDraw[0];

                    let useContext2dPipeline = ( tiledImage.compositeOperation ||
                        this.viewer.compositeOperation ||
                        tiledImage._clip ||
                        tiledImage._croppingPolygons ||
                        tiledImage.debugMode
                    );

                    let useTwoPassRendering = useContext2dPipeline || (tiledImage.opacity < 1) || firstTile.tile.hasTransparency;

                    // using the context2d pipeline requires a clean rendering (back) buffer to start
                    if(useContext2dPipeline){
                        // if the rendering buffer has image data currently, write it to the output canvas now and clear it

                        if(renderingBufferHasImageData){
                            this._outputContext.drawImage(this._renderingCanvas, 0, 0);
                        }

                        // clear the buffer
                        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                        gl.clear(gl.COLOR_BUFFER_BIT); // clear the back buffer
                    }

                    // First rendering pass: compose tiles that make up this tiledImage
                    gl.useProgram(this._firstPass.shaderProgram);

                    // bind to the framebuffer for render-to-texture if using two-pass rendering, otherwise back buffer (null)
                    if(useTwoPassRendering){
                        gl.bindFramebuffer(gl.FRAMEBUFFER, this._glFrameBuffer);
                        // clear the buffer to draw a new image
                        gl.clear(gl.COLOR_BUFFER_BIT);
                    } else {
                        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                        // no need to clear, just draw on top of the existing pixels
                    }

                    let overallMatrix = viewMatrix;

                    let imageRotation = tiledImage.getRotation(true);
                    // if needed, handle the tiledImage being rotated
                    if( imageRotation % 360 !== 0){
                        let imageRotationMatrix = $.Mat3.makeRotation(-imageRotation * Math.PI / 180);
                        let imageCenter = tiledImage.getBoundsNoRotate(true).getCenter();
                        let t1 = $.Mat3.makeTranslation(imageCenter.x, imageCenter.y);
                        let t2 = $.Mat3.makeTranslation(-imageCenter.x, -imageCenter.y);

                        // update the view matrix to account for this image's rotation
                        let localMatrix = t1.multiply(imageRotationMatrix).multiply(t2);
                        overallMatrix = viewMatrix.multiply(localMatrix);
                    }

                    let maxTextures = this._gl.getParameter(this._gl.MAX_TEXTURE_IMAGE_UNITS);
                    if(maxTextures <= 0){
                        // This can apparently happen on some systems if too many WebGL contexts have been created
                        // in which case maxTextures can be null, leading to out of bounds errors with the array.
                        // For example, when viewers were created and not destroyed in the test suite, this error
                        // occurred in the TravisCI tests, though it did not happen when testing locally either in
                        // a browser or on the command line via grunt test.

                        throw(new Error(`WegGL error: bad value for gl parameter MAX_TEXTURE_IMAGE_UNITS (${maxTextures}). This could happen
                        if too many contexts have been created and not released, or there is another problem with the graphics card.`));
                    }

                    let texturePositionArray = new Float32Array(maxTextures * 12); // 6 vertices (2 triangles) x 2 coordinates per vertex
                    let textureDataArray = new Array(maxTextures);
                    let matrixArray = new Array(maxTextures);
                    let opacityArray = new Array(maxTextures);

                    // iterate over tiles and add data for each one to the buffers
                    for(let tileIndex = 0; tileIndex < tilesToDraw.length; tileIndex++){
                        let tile = tilesToDraw[tileIndex].tile;
                        let indexInDrawArray = tileIndex % maxTextures;
                        let numTilesToDraw =  indexInDrawArray + 1;
                        const textureInfo = this.getDataToDraw(tile);

                        if (textureInfo && textureInfo.texture) {
                            this._getTileData(tile, tiledImage, textureInfo, overallMatrix, indexInDrawArray, texturePositionArray, textureDataArray, matrixArray, opacityArray);
                        } else {
                            // console.log('No tile info', tile);
                        }

                        if( (numTilesToDraw === maxTextures) || (tileIndex === tilesToDraw.length - 1)){
                            // We've filled up the buffers: time to draw this set of tiles

                            // bind each tile's texture to the appropriate gl.TEXTURE#
                            for(let i = 0; i <= numTilesToDraw; i++){
                                gl.activeTexture(gl.TEXTURE0 + i);
                                gl.bindTexture(gl.TEXTURE_2D, textureDataArray[i]);
                            }

                            // set the buffer data for the texture coordinates to use for each tile
                            gl.bindBuffer(gl.ARRAY_BUFFER, this._firstPass.bufferTexturePosition);
                            gl.bufferData(gl.ARRAY_BUFFER, texturePositionArray, gl.DYNAMIC_DRAW);

                            // set the transform matrix uniform for each tile
                            matrixArray.forEach( (matrix, index) => {
                                gl.uniformMatrix3fv(this._firstPass.uTransformMatrices[index], false, matrix);
                            });
                            // set the opacity uniform for each tile
                            gl.uniform1fv(this._firstPass.uOpacities, new Float32Array(opacityArray));

                            // bind vertex buffers and (re)set attributes before calling gl.drawArrays()
                            gl.bindBuffer(gl.ARRAY_BUFFER, this._firstPass.bufferOutputPosition);
                            gl.vertexAttribPointer(this._firstPass.aOutputPosition, 2, gl.FLOAT, false, 0, 0);

                            gl.bindBuffer(gl.ARRAY_BUFFER, this._firstPass.bufferTexturePosition);
                            gl.vertexAttribPointer(this._firstPass.aTexturePosition, 2, gl.FLOAT, false, 0, 0);

                            gl.bindBuffer(gl.ARRAY_BUFFER, this._firstPass.bufferIndex);
                            gl.vertexAttribPointer(this._firstPass.aIndex, 1, gl.FLOAT, false, 0, 0);

                            // Draw! 6 vertices per tile (2 triangles per rectangle)
                            gl.drawArrays(gl.TRIANGLES, 0, 6 * numTilesToDraw );
                        }
                    }

                    if(useTwoPassRendering){
                        // Second rendering pass: Render the tiled image from the framebuffer into the back buffer
                        gl.useProgram(this._secondPass.shaderProgram);

                        // set the rendering target to the back buffer (null)
                        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

                        // bind the rendered texture from the first pass to use during this second pass
                        gl.activeTexture(gl.TEXTURE0);
                        gl.bindTexture(gl.TEXTURE_2D, this._renderToTexture);

                        // set opacity to the value for the current tiledImage
                        this._gl.uniform1f(this._secondPass.uOpacityMultiplier, tiledImage.opacity);

                        // bind buffers and set attributes before calling gl.drawArrays
                        gl.bindBuffer(gl.ARRAY_BUFFER, this._secondPass.bufferTexturePosition);
                        gl.vertexAttribPointer(this._secondPass.aTexturePosition, 2, gl.FLOAT, false, 0, 0);
                        gl.bindBuffer(gl.ARRAY_BUFFER, this._secondPass.bufferOutputPosition);
                        gl.vertexAttribPointer(this._secondPass.aOutputPosition, 2, gl.FLOAT, false, 0, 0);

                        // Draw the quad (two triangles)
                        gl.drawArrays(gl.TRIANGLES, 0, 6);

                    }

                    renderingBufferHasImageData = true;

                    if(useContext2dPipeline){
                        // draw from the rendering canvas onto the output canvas, clipping/cropping if needed.
                        this._applyContext2dPipeline(tiledImage, tilesToDraw, tiledImageIndex);
                        renderingBufferHasImageData = false;
                        // clear the buffer
                        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                        gl.clear(gl.COLOR_BUFFER_BIT); // clear the back buffer
                    }

                    // after drawing the first TiledImage, fire the tiled-image-drawn event (for testing)
                    if(tiledImageIndex === 0){
                        this._raiseTiledImageDrawnEvent(tiledImage, tilesToDraw.map(info=>info.tile));
                    }
                }

            });

            if(renderingBufferHasImageData){
                this._outputContext.drawImage(this._renderingCanvas, 0, 0);
            }

        }

        // Public API required by all Drawer implementations
        /**
        * Sets whether image smoothing is enabled or disabled
        * @param {Boolean} enabled If true, uses gl.LINEAR as the TEXTURE_MIN_FILTER and TEXTURE_MAX_FILTER, otherwise gl.NEAREST.
        */
        setImageSmoothingEnabled(enabled){
            if( this._imageSmoothingEnabled !== enabled ){
                this._imageSmoothingEnabled = enabled;
                this.setInternalCacheNeedsRefresh();
                this.viewer.forceRedraw();
            }
        }

        /**
        * Draw a rect onto the output canvas for debugging purposes
        * @param {OpenSeadragon.Rect} rect
        */
        drawDebuggingRect(rect){
            let context = this._outputContext;
            context.save();
            context.lineWidth = 2 * $.pixelDensityRatio;
            context.strokeStyle = this.debugGridColor[0];
            context.fillStyle = this.debugGridColor[0];

            context.strokeRect(
                rect.x * $.pixelDensityRatio,
                rect.y * $.pixelDensityRatio,
                rect.width * $.pixelDensityRatio,
                rect.height * $.pixelDensityRatio
            );

            context.restore();
        }

        // private
        _getTextureDataFromTile(tile){
            return tile.getCanvasContext().canvas;
        }

        /**
        * Draw data from the rendering canvas onto the output canvas, with clipping,
        * cropping and/or debug info as requested.
        * @private
        * @param {OpenSeadragon.TiledImage} tiledImage - the tiledImage to draw
        * @param {Array} tilesToDraw - array of objects containing tiles that were drawn
        */
        _applyContext2dPipeline(tiledImage, tilesToDraw, tiledImageIndex){
            // composite onto the output canvas, clipping if necessary
            this._outputContext.save();

            // set composite operation; ignore for first image drawn
            this._outputContext.globalCompositeOperation = tiledImageIndex === 0 ? null : tiledImage.compositeOperation || this.viewer.compositeOperation;
            if(tiledImage._croppingPolygons || tiledImage._clip){
                this._renderToClippingCanvas(tiledImage);
                this._outputContext.drawImage(this._clippingCanvas, 0, 0);

            } else {
                this._outputContext.drawImage(this._renderingCanvas, 0, 0);
            }
            this._outputContext.restore();
            if(tiledImage.debugMode){
                const flipped = this.viewer.viewport.getFlip();
                if(flipped){
                    this._flip();
                }
                this._drawDebugInfo(tilesToDraw, tiledImage, flipped);
                if(flipped){
                    this._flip();
                }
            }


        }

        // private
        _getTileData(tile, tiledImage, textureInfo, viewMatrix, index, texturePositionArray, textureDataArray, matrixArray, opacityArray){

            let texture = textureInfo.texture;
            let textureQuad = textureInfo.position;

            // set the position of this texture
            texturePositionArray.set(textureQuad, index * 12);

            // compute offsets that account for tile overlap; needed for calculating the transform matrix appropriately
            let overlapFraction = this._calculateOverlapFraction(tile, tiledImage);
            let xOffset = tile.positionedBounds.width * overlapFraction.x;
            let yOffset = tile.positionedBounds.height * overlapFraction.y;

            // x, y, w, h in viewport coords
            let x = tile.positionedBounds.x + (tile.x === 0 ? 0 : xOffset);
            let y = tile.positionedBounds.y + (tile.y === 0 ? 0 : yOffset);
            let right = tile.positionedBounds.x + tile.positionedBounds.width - (tile.isRightMost ? 0 : xOffset);
            let bottom = tile.positionedBounds.y + tile.positionedBounds.height - (tile.isBottomMost ? 0 : yOffset);
            let w = right - x;
            let h = bottom - y;

            let matrix = new $.Mat3([
                w, 0, 0,
                0, h, 0,
                x, y, 1,
            ]);

            if(tile.flipped){
                // flip the tile around the center of the unit quad
                let t1 = $.Mat3.makeTranslation(0.5, 0);
                let t2 = $.Mat3.makeTranslation(-0.5, 0);

                // update the view matrix to account for this image's rotation
                let localMatrix = t1.multiply($.Mat3.makeScaling(-1, 1)).multiply(t2);
                matrix = matrix.multiply(localMatrix);
            }

            let overallMatrix = viewMatrix.multiply(matrix);

            opacityArray[index] = tile.opacity;
            textureDataArray[index] = texture;
            matrixArray[index] = overallMatrix.values;

        }

        // private
        _textureFilter(){
            return this._imageSmoothingEnabled ? this._gl.LINEAR : this._gl.NEAREST;
        }

        // private
        _setupRenderer(){
            let gl = this._gl;
            if(!gl){
                $.console.error('_setupCanvases must be called before _setupRenderer');
            }
            this._unitQuad = this._makeQuadVertexBuffer(0, 1, 0, 1); // used a few places; create once and store the result

            this._makeFirstPassShaderProgram();
            this._makeSecondPassShaderProgram();

            // set up the texture to render to in the first pass, and which will be used for rendering the second pass
            this._renderToTexture = gl.createTexture();
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this._renderToTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this._renderingCanvas.width, this._renderingCanvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this._textureFilter());
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            // set up the framebuffer for render-to-texture
            this._glFrameBuffer = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, this._glFrameBuffer);
            gl.framebufferTexture2D(
                gl.FRAMEBUFFER,
                gl.COLOR_ATTACHMENT0,       // attach texture as COLOR_ATTACHMENT0
                gl.TEXTURE_2D,              // attach a 2D texture
                this._renderToTexture,  // the texture to attach
                0
            );

            gl.enable(gl.BLEND);
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        }

        //private
        _makeFirstPassShaderProgram(){
            let numTextures = this._glNumTextures = this._gl.getParameter(this._gl.MAX_TEXTURE_IMAGE_UNITS);
            let makeMatrixUniforms = () => {
                return [...Array(numTextures).keys()].map(index => `uniform mat3 u_matrix_${index};`).join('\n');
            };
            let makeConditionals = () => {
                return [...Array(numTextures).keys()].map(index => `${index > 0 ? 'else ' : ''}if(int(a_index) == ${index}) { transform_matrix = u_matrix_${index}; }`).join('\n');
            };

            const vertexShaderProgram = `
            attribute vec2 a_output_position;
            attribute vec2 a_texture_position;
            attribute float a_index;

            ${makeMatrixUniforms()} // create a uniform mat3 for each potential tile to draw

            varying vec2 v_texture_position;
            varying float v_image_index;

            void main() {

                mat3 transform_matrix; // value will be set by the if/elses in makeConditional()

                ${makeConditionals()}

                gl_Position = vec4(transform_matrix * vec3(a_output_position, 1), 1);

                v_texture_position = a_texture_position;
                v_image_index = a_index;
            }
            `;

            const fragmentShaderProgram = `
            precision mediump float;

            // our textures
            uniform sampler2D u_images[${numTextures}];
            // our opacities
            uniform float u_opacities[${numTextures}];

            // the varyings passed in from the vertex shader.
            varying vec2 v_texture_position;
            varying float v_image_index;

            void main() {
                // can't index directly with a variable, need to use a loop iterator hack
                for(int i = 0; i < ${numTextures}; ++i){
                    if(i == int(v_image_index)){
                        gl_FragColor = texture2D(u_images[i], v_texture_position) * u_opacities[i];
                    }
                }
            }
            `;

            let gl = this._gl;

            let program = this.constructor.initShaderProgram(gl, vertexShaderProgram, fragmentShaderProgram);
            gl.useProgram(program);

            // get locations of attributes and uniforms, and create buffers for each attribute
            this._firstPass = {
                shaderProgram: program,
                aOutputPosition: gl.getAttribLocation(program, 'a_output_position'),
                aTexturePosition: gl.getAttribLocation(program, 'a_texture_position'),
                aIndex: gl.getAttribLocation(program, 'a_index'),
                uTransformMatrices: [...Array(this._glNumTextures).keys()].map(i=>gl.getUniformLocation(program, `u_matrix_${i}`)),
                uImages: gl.getUniformLocation(program, 'u_images'),
                uOpacities: gl.getUniformLocation(program, 'u_opacities'),
                bufferOutputPosition: gl.createBuffer(),
                bufferTexturePosition: gl.createBuffer(),
                bufferIndex: gl.createBuffer(),
            };

            gl.uniform1iv(this._firstPass.uImages, [...Array(numTextures).keys()]);

            // provide coordinates for the rectangle in output space, i.e. a unit quad for each one.
            let outputQuads = new Float32Array(numTextures * 12);
            for(let i = 0; i < numTextures; ++i){
                outputQuads.set(Float32Array.from(this._unitQuad), i * 12);
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, this._firstPass.bufferOutputPosition);
            gl.bufferData(gl.ARRAY_BUFFER, outputQuads, gl.STATIC_DRAW); // bind data statically here, since it's unchanging
            gl.enableVertexAttribArray(this._firstPass.aOutputPosition);

            // provide texture coordinates for the rectangle in image (texture) space. Data will be set later.
            gl.bindBuffer(gl.ARRAY_BUFFER, this._firstPass.bufferTexturePosition);
            gl.enableVertexAttribArray(this._firstPass.aTexturePosition);

            // for each vertex, provide an index into the array of textures/matrices to use for the correct tile
            gl.bindBuffer(gl.ARRAY_BUFFER, this._firstPass.bufferIndex);
            let indices = [...Array(this._glNumTextures).keys()].map(i => Array(6).fill(i)).flat(); // repeat each index 6 times, for the 6 vertices per tile (2 triangles)
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(indices), gl.STATIC_DRAW); // bind data statically here, since it's unchanging
            gl.enableVertexAttribArray(this._firstPass.aIndex);

        }

        // private
        _makeSecondPassShaderProgram(){
            const vertexShaderProgram = `
            attribute vec2 a_output_position;
            attribute vec2 a_texture_position;

            uniform mat3 u_matrix;

            varying vec2 v_texture_position;

            void main() {
                gl_Position = vec4(u_matrix * vec3(a_output_position, 1), 1);

                v_texture_position = a_texture_position;
            }
            `;

            const fragmentShaderProgram = `
            precision mediump float;

            // our texture
            uniform sampler2D u_image;

            // the texCoords passed in from the vertex shader.
            varying vec2 v_texture_position;

            // the opacity multiplier for the image
            uniform float u_opacity_multiplier;

            void main() {
                gl_FragColor = texture2D(u_image, v_texture_position);
                gl_FragColor *= u_opacity_multiplier;
            }
            `;

            let gl = this._gl;

            let program = this.constructor.initShaderProgram(gl, vertexShaderProgram, fragmentShaderProgram);
            gl.useProgram(program);

            // get locations of attributes and uniforms, and create buffers for each attribute
            this._secondPass = {
                shaderProgram: program,
                aOutputPosition: gl.getAttribLocation(program, 'a_output_position'),
                aTexturePosition: gl.getAttribLocation(program, 'a_texture_position'),
                uMatrix: gl.getUniformLocation(program, 'u_matrix'),
                uImage: gl.getUniformLocation(program, 'u_image'),
                uOpacityMultiplier: gl.getUniformLocation(program, 'u_opacity_multiplier'),
                bufferOutputPosition: gl.createBuffer(),
                bufferTexturePosition: gl.createBuffer(),
            };


            // provide coordinates for the rectangle in output space, i.e. a unit quad for each one.
            gl.bindBuffer(gl.ARRAY_BUFFER, this._secondPass.bufferOutputPosition);
            gl.bufferData(gl.ARRAY_BUFFER, this._unitQuad, gl.STATIC_DRAW); // bind data statically here since it's unchanging
            gl.enableVertexAttribArray(this._secondPass.aOutputPosition);

            // provide texture coordinates for the rectangle in image (texture) space.
            gl.bindBuffer(gl.ARRAY_BUFFER, this._secondPass.bufferTexturePosition);
            gl.bufferData(gl.ARRAY_BUFFER, this._unitQuad, gl.DYNAMIC_DRAW); // bind data statically here since it's unchanging
            gl.enableVertexAttribArray(this._secondPass.aTexturePosition);

            // set the matrix that transforms the framebuffer to clip space
            let matrix = $.Mat3.makeScaling(2, 2).multiply($.Mat3.makeTranslation(-0.5, -0.5));
            gl.uniformMatrix3fv(this._secondPass.uMatrix, false, matrix.values);
        }

        // private
        _resizeRenderer(){
            let gl = this._gl;
            let w = this._renderingCanvas.width;
            let h = this._renderingCanvas.height;
            gl.viewport(0, 0, w, h);

            //release the old texture
            gl.deleteTexture(this._renderToTexture);
            //create a new texture and set it up
            this._renderToTexture = gl.createTexture();
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this._renderToTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this._textureFilter());
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            //bind the frame buffer to the new texture
            gl.bindFramebuffer(gl.FRAMEBUFFER, this._glFrameBuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this._renderToTexture, 0);
        }

        // private
        _setupCanvases(){
            let _this = this;

            this._outputCanvas = this.canvas; //output canvas
            this._outputContext = this._outputCanvas.getContext('2d');

            this._renderingCanvas = document.createElement('canvas');

            this._clippingCanvas = document.createElement('canvas');
            this._clippingContext = this._clippingCanvas.getContext('2d');
            this._renderingCanvas.width = this._clippingCanvas.width = this._outputCanvas.width;
            this._renderingCanvas.height = this._clippingCanvas.height = this._outputCanvas.height;

            this._gl = this._renderingCanvas.getContext('webgl');

            this._resizeHandler = function(){

                if(_this._outputCanvas !== _this.viewer.drawer.canvas){
                    _this._outputCanvas.style.width = _this.viewer.drawer.canvas.clientWidth + 'px';
                    _this._outputCanvas.style.height = _this.viewer.drawer.canvas.clientHeight + 'px';
                }

                let viewportSize = _this._calculateCanvasSize();
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

        internalCacheCreate(cache, tile) {
            let tiledImage = tile.tiledImage;
            let gl = this._gl;
            let texture;
            let position;

            let data = cache.data;

            if (!tiledImage.isTainted()) {
                if((data instanceof CanvasRenderingContext2D) && $.isCanvasTainted(data.canvas)){
                    tiledImage.setTainted(true);
                    $.console.warn('WebGL cannot be used to draw this TiledImage because it has tainted data. Does crossOriginPolicy need to be set?');
                    this._raiseDrawerErrorEvent(tiledImage, 'Tainted data cannot be used by the WebGLDrawer. Falling back to CanvasDrawer for this TiledImage.');
                    this.setInternalCacheNeedsRefresh();
                } else {
                    let sourceWidthFraction, sourceHeightFraction;
                    if (tile.sourceBounds) {
                        sourceWidthFraction = Math.min(tile.sourceBounds.width, data.width) / data.width;
                        sourceHeightFraction = Math.min(tile.sourceBounds.height, data.height) / data.height;
                    } else {
                        sourceWidthFraction = 1;
                        sourceHeightFraction = 1;
                    }

                    // create a gl Texture for this tile and bind the canvas with the image data
                    texture = gl.createTexture();
                    let overlap = tiledImage.source.tileOverlap;
                    if( overlap > 0){
                        // calculate the normalized position of the rect to actually draw
                        // discarding overlap.
                        let overlapFraction = this._calculateOverlapFraction(tile, tiledImage);

                        let left = (tile.x === 0 ? 0 : overlapFraction.x) * sourceWidthFraction;
                        let top = (tile.y === 0 ? 0 : overlapFraction.y) * sourceHeightFraction;
                        let right = (tile.isRightMost ? 1 : 1 - overlapFraction.x) * sourceWidthFraction;
                        let bottom = (tile.isBottomMost ? 1 : 1 - overlapFraction.y) * sourceHeightFraction;
                        position = this._makeQuadVertexBuffer(left, right, top, bottom);
                    } else if (sourceWidthFraction === 1 && sourceHeightFraction === 1) {
                        // no overlap and no padding: this texture can use the unit quad as its position data
                        position = this._unitQuad;
                    } else {
                        position = this._makeQuadVertexBuffer(0, sourceWidthFraction, 0, sourceHeightFraction);
                    }

                    gl.activeTexture(gl.TEXTURE0);
                    gl.bindTexture(gl.TEXTURE_2D, texture);
                    // Set the parameters so we can render any size image.
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this._textureFilter());
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this._textureFilter());

                    try {
                        // This depends on gl.TEXTURE_2D being bound to the texture
                        // associated with this canvas before calling this function
                        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data);
                        // TextureInfo stored in the cache
                        return {
                            texture: texture,
                            position: position,
                        };
                    } catch (e){
                        // Todo a bit dirty re-use of the tainted flag, but makes the code more stable
                        tiledImage.setTainted(true);
                        $.console.error('Error uploading image data to WebGL. Falling back to canvas renderer.', e);
                        this._raiseDrawerErrorEvent(tiledImage, 'Unknown error when uploading texture. Falling back to CanvasDrawer for this TiledImage.');
                        this.setInternalCacheNeedsRefresh();
                    }
                }
            }
            if (data instanceof Image) {
                const canvas = document.createElement( 'canvas' );
                canvas.width = data.width;
                canvas.height = data.height;
                const context = canvas.getContext('2d', { willReadFrequently: true });
                context.drawImage( data, 0, 0 );
                data = context;
            }
            if (data instanceof CanvasRenderingContext2D) {
                return data;
            }
            $.console.error("Unsupported data used for WebGL Drawer - probably a bug!");
            return {};
        }

        internalCacheFree(data) {
            if (data && data.texture) {
                this._gl.deleteTexture(data.texture);
                data.texture = null;
            }
        }

        // private
        _makeQuadVertexBuffer(left, right, top, bottom){
            return new Float32Array([
                left, bottom,
                right, bottom,
                left, top,
                left, top,
                right, bottom,
                right, top]);
        }

        // private
        _calculateOverlapFraction(tile, tiledImage){
            let overlap = tiledImage.source.tileOverlap;
            let nativeWidth = tile.sourceBounds.width; // in pixels
            let nativeHeight = tile.sourceBounds.height; // in pixels
            let overlapWidth  = (tile.x === 0 ? 0 : overlap) + (tile.isRightMost ? 0 : overlap); // in pixels
            let overlapHeight = (tile.y === 0 ? 0 : overlap) + (tile.isBottomMost ? 0 : overlap); // in pixels
            let widthOverlapFraction = overlap / (nativeWidth + overlapWidth); // as a fraction of image including overlap
            let heightOverlapFraction = overlap / (nativeHeight + overlapHeight); // as a fraction of image including overlap
            return {
                x: widthOverlapFraction,
                y: heightOverlapFraction
            };
        }

        // private
//         _unloadTextures(){
//             let canvases = Array.from(this._TextureMap.keys());
//             canvases.forEach(canvas => {
//                 this._cleanupImageData(canvas); // deletes texture, removes from _TextureMap
//             });
//         }

        _setClip(){
            // no-op: called by _renderToClippingCanvas when tiledImage._clip is truthy
            // so that tests will pass.
        }

        // private
        _renderToClippingCanvas(item){

            this._clippingContext.clearRect(0, 0, this._clippingCanvas.width, this._clippingCanvas.height);
            this._clippingContext.save();
            if(this.viewer.viewport.getFlip()){
                const point = new $.Point(this.canvas.width / 2, this.canvas.height / 2);
                this._clippingContext.translate(point.x, 0);
                this._clippingContext.scale(-1, 1);
                this._clippingContext.translate(-point.x, 0);
            }

            if(item._clip){
                const polygon = [
                    {x: item._clip.x, y: item._clip.y},
                    {x: item._clip.x + item._clip.width, y: item._clip.y},
                    {x: item._clip.x + item._clip.width, y: item._clip.y + item._clip.height},
                    {x: item._clip.x, y: item._clip.y + item._clip.height},
                ];
                let clipPoints = polygon.map(coord => {
                    let point = item.imageToViewportCoordinates(coord.x, coord.y, true)
                        .rotate(this.viewer.viewport.getRotation(true), this.viewer.viewport.getCenter(true));
                    let clipPoint = this.viewportCoordToDrawerCoord(point);
                    return clipPoint;
                });
                this._clippingContext.beginPath();
                clipPoints.forEach( (coord, i) => {
                    this._clippingContext[i === 0 ? 'moveTo' : 'lineTo'](coord.x, coord.y);
                });
                this._clippingContext.clip();
                this._setClip();
            }
            if(item._croppingPolygons){
                let polygons = item._croppingPolygons.map(polygon => {
                    return polygon.map(coord => {
                        let point = item.imageToViewportCoordinates(coord.x, coord.y, true)
                            .rotate(this.viewer.viewport.getRotation(true), this.viewer.viewport.getCenter(true));
                        let clipPoint = this.viewportCoordToDrawerCoord(point);
                        return clipPoint;
                    });
                });
                this._clippingContext.beginPath();
                polygons.forEach((polygon) => {
                    polygon.forEach( (coord, i) => {
                        this._clippingContext[i === 0 ? 'moveTo' : 'lineTo'](coord.x, coord.y);
                    });
                });
                this._clippingContext.clip();
            }

            if(this.viewer.viewport.getFlip()){
                const point = new $.Point(this.canvas.width / 2, this.canvas.height / 2);
                this._clippingContext.translate(point.x, 0);
                this._clippingContext.scale(-1, 1);
                this._clippingContext.translate(-point.x, 0);
            }

            this._clippingContext.drawImage(this._renderingCanvas, 0, 0);

            this._clippingContext.restore();
        }

        /**
         * Set rotations for viewport & tiledImage
         * @private
         * @param {OpenSeadragon.TiledImage} tiledImage
         */
        _setRotations(tiledImage) {
            var saveContext = false;
            if (this.viewport.getRotation(true) % 360 !== 0) {
                this._offsetForRotation({
                    degrees: this.viewport.getRotation(true),
                    saveContext: saveContext
                });
                saveContext = false;
            }
            if (tiledImage.getRotation(true) % 360 !== 0) {
                this._offsetForRotation({
                    degrees: tiledImage.getRotation(true),
                    point: this.viewport.pixelFromPointNoRotate(
                        tiledImage._getRotationPoint(true), true),
                    saveContext: saveContext
                });
            }
        }

        // private
        _offsetForRotation(options) {
            var point = options.point ?
                options.point.times($.pixelDensityRatio) :
                this._getCanvasCenter();

            var context = this._outputContext;
            context.save();

            context.translate(point.x, point.y);
            context.rotate(Math.PI / 180 * options.degrees);
            context.translate(-point.x, -point.y);
        }

        // private
        _flip(options) {
            options = options || {};
            var point = options.point ?
            options.point.times($.pixelDensityRatio) :
            this._getCanvasCenter();
            var context = this._outputContext;

            context.translate(point.x, 0);
            context.scale(-1, 1);
            context.translate(-point.x, 0);
        }

        // private
        _drawDebugInfo( tilesToDraw, tiledImage, flipped ) {

            for ( var i = tilesToDraw.length - 1; i >= 0; i-- ) {
                var tile = tilesToDraw[ i ].tile;
                try {
                    this._drawDebugInfoOnTile(tile, tilesToDraw.length, i, tiledImage, flipped);
                } catch(e) {
                    $.console.error(e);
                }
            }
        }

        // private
        _drawDebugInfoOnTile(tile, count, i, tiledImage, flipped) {

            var colorIndex = this.viewer.world.getIndexOfItem(tiledImage) % this.debugGridColor.length;
            var context = this.context;
            context.save();
            context.lineWidth = 2 * $.pixelDensityRatio;
            context.font = 'small-caps bold ' + (13 * $.pixelDensityRatio) + 'px arial';
            context.strokeStyle = this.debugGridColor[colorIndex];
            context.fillStyle = this.debugGridColor[colorIndex];

            this._setRotations(tiledImage);

            if(flipped){
                this._flip({point: tile.position.plus(tile.size.divide(2))});
            }

            context.strokeRect(
                tile.position.x * $.pixelDensityRatio,
                tile.position.y * $.pixelDensityRatio,
                tile.size.x * $.pixelDensityRatio,
                tile.size.y * $.pixelDensityRatio
            );

            var tileCenterX = (tile.position.x + (tile.size.x / 2)) * $.pixelDensityRatio;
            var tileCenterY = (tile.position.y + (tile.size.y / 2)) * $.pixelDensityRatio;

            // Rotate the text the right way around.
            context.translate( tileCenterX, tileCenterY );
            const angleInDegrees = this.viewport.getRotation(true);
            context.rotate( Math.PI / 180 * -angleInDegrees );
            context.translate( -tileCenterX, -tileCenterY );

            if( tile.x === 0 && tile.y === 0 ){
                context.fillText(
                    "Zoom: " + this.viewport.getZoom(),
                    tile.position.x * $.pixelDensityRatio,
                    (tile.position.y - 30) * $.pixelDensityRatio
                );
                context.fillText(
                    "Pan: " + this.viewport.getBounds().toString(),
                    tile.position.x * $.pixelDensityRatio,
                    (tile.position.y - 20) * $.pixelDensityRatio
                );
            }
            context.fillText(
                "Level: " + tile.level,
                (tile.position.x + 10) * $.pixelDensityRatio,
                (tile.position.y + 20) * $.pixelDensityRatio
            );
            context.fillText(
                "Column: " + tile.x,
                (tile.position.x + 10) * $.pixelDensityRatio,
                (tile.position.y + 30) * $.pixelDensityRatio
            );
            context.fillText(
                "Row: " + tile.y,
                (tile.position.x + 10) * $.pixelDensityRatio,
                (tile.position.y + 40) * $.pixelDensityRatio
            );
            context.fillText(
                "Order: " + i + " of " + count,
                (tile.position.x + 10) * $.pixelDensityRatio,
                (tile.position.y + 50) * $.pixelDensityRatio
            );
            context.fillText(
                "Size: " + tile.size.toString(),
                (tile.position.x + 10) * $.pixelDensityRatio,
                (tile.position.y + 60) * $.pixelDensityRatio
            );
            context.fillText(
                "Position: " + tile.position.toString(),
                (tile.position.x + 10) * $.pixelDensityRatio,
                (tile.position.y + 70) * $.pixelDensityRatio
            );

            if (this.viewport.getRotation(true) % 360 !== 0 ) {
                this._restoreRotationChanges();
            }
            if (tiledImage.getRotation(true) % 360 !== 0) {
                this._restoreRotationChanges();
            }

            context.restore();
        }

        _drawPlaceholder(tiledImage){

            const bounds = tiledImage.getBounds(true);
            const rect = this.viewportToDrawerRectangle(tiledImage.getBounds(true));
            const context = this._outputContext;

            let fillStyle;
            if ( typeof tiledImage.placeholderFillStyle === "function" ) {
                fillStyle = tiledImage.placeholderFillStyle(tiledImage, context);
            }
            else {
                fillStyle = tiledImage.placeholderFillStyle;
            }

            this._offsetForRotation({degrees: this.viewer.viewport.getRotation(true)});
            context.fillStyle = fillStyle;
            context.translate(rect.x, rect.y);
            context.rotate(Math.PI / 180 * bounds.degrees);
            context.translate(-rect.x, -rect.y);
            context.fillRect(rect.x, rect.y, rect.width, rect.height);
            this._restoreRotationChanges();

        }

        /**
         * Get the canvas center
         * @private
         * @returns {OpenSeadragon.Point} The center point of the canvas
         */
        _getCanvasCenter() {
            return new $.Point(this.canvas.width / 2, this.canvas.height / 2);
        }

        // private
        _restoreRotationChanges() {
            var context = this._outputContext;
            context.restore();
        }

        // modified from https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Adding_2D_content_to_a_WebGL_context
        static initShaderProgram(gl, vsSource, fsSource) {

            function loadShader(gl, type, source) {
                const shader = gl.createShader(type);

                // Send the source to the shader object

                gl.shaderSource(shader, source);

                // Compile the shader program

                gl.compileShader(shader);

                // See if it compiled successfully

                if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                    $.console.error(
                        `An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`
                    );
                    gl.deleteShader(shader);
                    return null;
                }

                return shader;
            }

            const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
            const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

            // Create the shader program

            const shaderProgram = gl.createProgram();
            gl.attachShader(shaderProgram, vertexShader);
            gl.attachShader(shaderProgram, fragmentShader);
            gl.linkProgram(shaderProgram);

            // If creating the shader program failed, alert

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            $.console.error(
                `Unable to initialize the shader program: ${gl.getProgramInfoLog(
                shaderProgram
                )}`
            );
            return null;
            }

            return shaderProgram;
        }
    };


}( OpenSeadragon ));
