
/*
 * OpenSeadragon - WebGLDrawer
 *
 * Copyright (C) 2009 CodePlex Foundation
 * Copyright (C) 2010-2023 OpenSeadragon contributors
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

   /**
    * @class WebGLDrawer
    * @memberof OpenSeadragon
    * @classdesc Default implementation of WebGLDrawer for an {@link OpenSeadragon.Viewer}.
    * @param {Object} options - Options for this Drawer.
    * @param {OpenSeadragon.Viewer} options.viewer - The Viewer that owns this Drawer.
    * @param {OpenSeadragon.Viewport} options.viewport - Reference to Viewer viewport.
    * @param {Element} options.element - Parent element.
    * @param {Number} [options.debugGridColor] - See debugGridColor in {@link OpenSeadragon.Options} for details.
    */

    $.WebGLDrawer = class WebGLDrawer extends OpenSeadragon.DrawerBase{
        constructor(options){
           super(options);

           this.destroyed = false;
           // private members

           this._TextureMap = new Map();
           this._TileMap = new Map();

           this._gl = null;
           this._firstPass = null;
           this._secondPass = null;
           this._glFrameBuffer = null;
           this._renderToTexture = null;
           this._glFramebufferToCanvasTransform = null;
           this._outputCanvas = null;
           this._outputContext = null;
           this._clippingCanvas = null;
           this._clippingContext = null;
           this._renderingCanvas = null;

           // Add listeners for events that require modifying the scene or camera
           this.viewer.addHandler("tile-ready", ev => this._tileReadyHandler(ev));
           this.viewer.addHandler("image-unloaded", ev => this._imageUnloadedHandler(ev));

           // this.viewer is set by parent constructor
           // this.canvas is set by parent constructor, created and appended to the viewer container element
           this._setupCanvases();

           this._setupRenderer();

           this.context = this._outputContext; // API required by tests
       }

        // Public API required by all Drawer implementations
        /**
            * Clean up the renderer, removing all resources
            */
        destroy(){
            if(this.destroyed){
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

            let canvases = Array.from(this._TextureMap.keys());
            canvases.forEach(canvas => {
                this._cleanupImageData(canvas); // deletes texture, removes from _TextureMap
            });

            // Delete all our created resources
            gl.deleteBuffer(this._secondPass.bufferOutputPosition);
            gl.deleteFramebuffer(this._glFrameBuffer);
            // TODO: if/when render buffers or frame buffers are used, release them:
            // gl.deleteRenderbuffer(someRenderbuffer);
            // gl.deleteFramebuffer(someFramebuffer);

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

            // set our destroyed flag to true
            this.destroyed = true;
        }

        // Public API required by all Drawer implementations
        /**
            *
            * @returns true if the drawer supports rotation
            */
        canRotate(){
            return true;
        }

        // Public API required by all Drawer implementations

        /**
        * @returns {Boolean} returns true if canvas and webgl are supported
        */
        static isSupported(){
            let canvasElement = document.createElement( 'canvas' );
            let webglContext = $.isFunction( canvasElement.getContext ) &&
                        canvasElement.getContext( 'webgl' );
            let ext = webglContext.getExtension('WEBGL_lose_context');
            if(ext){
                ext.loseContext();
            }
            return !!( webglContext );
        }

        getType(){
            return 'webgl';
        }

        /**
            * create the HTML element (canvas in this case) that the image will be drawn into
            * @returns {Element} the canvas to draw into
            */
        createDrawingElement(){
            let canvas = $.makeNeutralElement("canvas");
            let viewportSize = this._calculateCanvasSize();
            canvas.width = viewportSize.x;
            canvas.height = viewportSize.y;
            return canvas;
        }

        /**
            *
            * @param {Array} tiledImages Array of TiledImage objects to draw
            */
        draw(tiledImages){
            let gl = this._gl;
            let viewport = {
                bounds: this.viewport.getBoundsNoRotate(true),
                center: this.viewport.getCenter(true),
                rotation: this.viewport.getRotation(true) * Math.PI / 180
            };

            let flipMultiplier = this.viewport.flipped ? -1 : 1;
            // calculate view matrix for viewer
            let posMatrix = $.Mat3.makeTranslation(-viewport.center.x, -viewport.center.y);
            let scaleMatrix = $.Mat3.makeScaling(2 / viewport.bounds.width * flipMultiplier, -2 / viewport.bounds.height);
            let rotMatrix = $.Mat3.makeRotation(-viewport.rotation);
            let viewMatrix = scaleMatrix.multiply(rotMatrix).multiply(posMatrix);

            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.clear(gl.COLOR_BUFFER_BIT); // clear the back buffer

            // clear the output canvas
            this._outputContext.clearRect(0, 0, this._outputCanvas.width, this._outputCanvas.height);


            let renderingBufferHasImageData = false;

            //iterate over tiled images and draw each one using a two-pass rendering pipeline if needed
            tiledImages.forEach( (tiledImage, tiledImageIndex) => {

                let useContext2dPipeline = ( tiledImage.compositeOperation ||
                                        this.viewer.compositeOperation ||
                                        tiledImage._clip ||
                                        tiledImage._croppingPolygons ||
                                        tiledImage.debugMode
                                    );
                let useTwoPassRendering = useContext2dPipeline || (tiledImage.opacity < 1); // TODO: check hasTransparency in addition to opacity


                let tilesToDraw = tiledImage.getTilesToDraw();

                if(tilesToDraw.length === 0){
                    return;
                }

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
                let texturePositionArray = new Float32Array(maxTextures * 12); // 6 vertices (2 triangles) x 2 coordinates per vertex
                let textureDataArray = new Array(maxTextures);
                let matrixArray = new Array(maxTextures);
                let opacityArray = new Array(maxTextures);

                // iterate over tiles and add data for each one to the buffers
                for(let tileIndex = 0; tileIndex < tilesToDraw.length; tileIndex++){
                    let tile = tilesToDraw[tileIndex].tile;
                    let index = tileIndex % maxTextures;
                    let tileContext = tile.getCanvasContext();

                    let textureInfo = tileContext ? this._TextureMap.get(tileContext.canvas) : null;
                    if(textureInfo){
                        this._getTileData(tile, tiledImage, textureInfo, overallMatrix, index, texturePositionArray, textureDataArray, matrixArray, opacityArray);
                    } else {
                        // console.log('No tile info', tile);
                    }
                    if( (index === maxTextures - 1) || (tileIndex === tilesToDraw.length - 1)){
                        // We've filled up the buffers: time to draw this set of tiles

                        // bind each tile's texture to the appropriate gl.TEXTURE#
                        for(let i = 0; i <= index; i++){
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
                        gl.drawArrays(gl.TRIANGLES, 0, 6 * (index + 1) );
                    }
                }

                // gl.flush(); // is this necessary?

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
                    gl.vertexAttribPointer(this._firstPass.aOutputPosition, 2, gl.FLOAT, false, 0, 0);

                    // Draw the quad (two triangles)
                    gl.drawArrays(gl.TRIANGLES, 0, 6);

                    // TODO: is this the mechanism we want to use here?
                    // iterate over any filters - filters can use this._renderToTexture to get rendered data if desired
                    let filters = this.filters || [];
                    for(let fi = 0; fi < filters.length; fi++){
                        let filter = this.filters[fi];
                        if(filter.apply){
                            filter.apply(gl); // filter.apply should write data on top of the backbuffer (bound above)
                        }
                    }
                }

                renderingBufferHasImageData = true;

                // gl.flush(); //make sure drawing to the output buffer of the rendering canvas is complete. Is this necessary?

                if(useContext2dPipeline){
                    // draw from the rendering canvas onto the output canvas, clipping/cropping if needed.
                    this._applyContext2dPipeline(tiledImage, tilesToDraw, tiledImageIndex);
                    renderingBufferHasImageData = false;
                    // clear the buffer
                    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                    gl.clear(gl.COLOR_BUFFER_BIT); // clear the back buffer
                }

                // Fire tiled-image-drawn event.
                // TODO: the image data may not be on the output canvas yet!!
                if( this.viewer ){
                    /**
                        * Raised when a tiled image is drawn to the canvas. Only valid
                        * for webgl drawer.
                        *
                        * @event tiled-image-drawn
                        * @memberof OpenSeadragon.Viewer
                        * @type {object}
                        * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
                        * @property {OpenSeadragon.TiledImage} tiledImage - Which TiledImage is being drawn.
                        * @property {Array} tiles - An array of Tile objects that were drawn.
                        * @property {?Object} userData - Arbitrary subscriber-defined object.
                        */
                    this.viewer.raiseEvent( 'tiled-image-drawn', {
                        tiledImage: tiledImage,
                        tiles: tilesToDraw.map(info => info.tile),
                    });
                }

            });
            // TODO: the line below is a test!
            if(renderingBufferHasImageData){
                this._outputContext.drawImage(this._renderingCanvas, 0, 0);
            }

        }

        // Public API required by all Drawer implementations
        /**
        * Set the context2d imageSmoothingEnabled parameter
        * @param {Boolean} enabled
        */
        setImageSmoothingEnabled(enabled){
            this._clippingContext.imageSmoothingEnabled = enabled;
            this._outputContext.imageSmoothingEnabled = enabled;
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
                let colorIndex = this.viewer.world.getIndexOfItem(tiledImage) % this.debugGridColor.length;
                let strokeStyle = this.debugGridColor[colorIndex];
                let fillStyle = this.debugGridColor[colorIndex];
                this._drawDebugInfo(tilesToDraw, tiledImage, strokeStyle, fillStyle);
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

            opacityArray[index] = tile.opacity;// * tiledImage.opacity;
            textureDataArray[index] = texture;
            matrixArray[index] = overallMatrix.values;

            if(this.continuousTileRefresh){
                // Upload the image into the texture
                // TODO: test if this works appropriately
                let tileContext = tile.getCanvasContext();
                this._raiseTileDrawingEvent(tiledImage, this._outputContext, tile, tileContext);
                this._uploadImageData(tileContext, tile, tiledImage);
            }

        }

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
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
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
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            //bind the frame buffer to the new texture
            gl.bindFramebuffer(gl.FRAMEBUFFER, this._glFrameBuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this._renderToTexture, 0);

        }

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

            //make the additional canvas elements mirror size changes to the output canvas
            this.viewer.addHandler("resize", function(){

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
            });
        }

        _makeQuadVertexBuffer(left, right, top, bottom){
            return new Float32Array([
                left, bottom,
                right, bottom,
                left, top,
                left, top,
                right, bottom,
                right, top]);
        }


        _tileReadyHandler(event){
            let tile = event.tile;
            let tiledImage = event.tiledImage;
            let tileContext = tile.getCanvasContext();
            let canvas = tileContext.canvas;
            let textureInfo = this._TextureMap.get(canvas);

            // if this is a new image for us, create a texture
            if(!textureInfo){
                let gl = this._gl;

                // create a gl Texture for this tile and bind the canvas with the image data
                let texture = gl.createTexture();
                let position;
                let overlap = tiledImage.source.tileOverlap;
                if( overlap > 0){
                    // calculate the normalized position of the rect to actually draw
                    // discarding overlap.
                    let overlapFraction = this._calculateOverlapFraction(tile, tiledImage);

                    let left = tile.x === 0 ? 0 : overlapFraction.x;
                    let top = tile.y === 0 ? 0 : overlapFraction.y;
                    let right = tile.isRightMost ? 1 : 1 - overlapFraction.x;
                    let bottom = tile.isBottomMost ? 1 : 1 - overlapFraction.y;
                    position = this._makeQuadVertexBuffer(left, right, top, bottom);
                } else {
                    // no overlap: this texture can use the unit quad as it's position data
                    position = this._unitQuad;
                }

                let textureInfo = {
                    texture: texture,
                    position: position,
                };

                // add it to our _TextureMap
                this._TextureMap.set(canvas, textureInfo);
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, texture);
                // Set the parameters so we can render any size image.
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

                // Upload the image into the texture.
                this._uploadImageData(tileContext);

            }

        }

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

        _uploadImageData(tileContext){

            let gl = this._gl;
            let canvas = tileContext.canvas;

            try{
                if(!canvas){
                    throw('Tile context does not have a canvas', tileContext);
                }
                // This depends on gl.TEXTURE_2D being bound to the texture
                // associated with this canvas before calling this function
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
            } catch (e){
                $.console.error('Error uploading image data to WebGL', e);
            }
        }

        _imageUnloadedHandler(event){
            let canvas = event.context2D.canvas;
            this._cleanupImageData(canvas);
        }

        _cleanupImageData(tileCanvas){
            let textureInfo = this._TextureMap.get(tileCanvas);
            //remove from the map
            this._TextureMap.delete(tileCanvas);

            //release the texture from the GPU
            if(textureInfo){
                this._gl.deleteTexture(textureInfo.texture);
            }

            // release the position buffer from the GPU
            // TODO: do this!
        }
        // private
        // necessary for clip testing to pass (test uses spyOnce(drawer._setClip))
        _setClip(rect){
            this._clippingContext.beginPath();
            this._clippingContext.rect(rect.x, rect.y, rect.width, rect.height);
            this._clippingContext.clip();
        }
        _renderToClippingCanvas(item){
            let _this = this;

            this._clippingContext.clearRect(0, 0, this._clippingCanvas.width, this._clippingCanvas.height);
            this._clippingContext.save();

            if(item._clip){
                var box = item.imageToViewportRectangle(item._clip, true);
                var rect = this.viewportToDrawerRectangle(box);
                this._setClip(rect);
            }
            if(item._croppingPolygons){
                let polygons = item._croppingPolygons.map(function (polygon) {
                    return polygon.map(function (coord) {
                        let point = item.imageToViewportCoordinates(coord.x, coord.y, true)
                            .rotate(_this.viewer.viewport.getRotation(true), _this.viewer.viewport.getCenter(true));
                        let clipPoint = _this._viewportCoordToDrawerCoord(point);
                        return clipPoint;
                    });
                });
                this._clippingContext.beginPath();
                polygons.forEach(function (polygon) {
                    polygon.forEach(function (coord, i) {
                        _this._clippingContext[i === 0 ? 'moveTo' : 'lineTo'](coord.x, coord.y);
                    });
                });
                this._clippingContext.clip();
            }

            this._clippingContext.drawImage(this._renderingCanvas, 0, 0);

            this._clippingContext.restore();
        }

        // private
        _offsetForRotation(options) {
            var point = options.point ?
                options.point.times($.pixelDensityRatio) :
                new $.Point(this._outputCanvas.width / 2, this._outputCanvas.height / 2);

            var context = this._outputContext;
            context.save();

            context.translate(point.x, point.y);
            if(this.viewport.flipped){
                context.rotate(Math.PI / 180 * -options.degrees);
                context.scale(-1, 1);
            } else{
                context.rotate(Math.PI / 180 * options.degrees);
            }
            context.translate(-point.x, -point.y);
        }


        /**
            * @private
            * @inner
            * This function converts the given point from to the drawer coordinate by
            * multiplying it with the pixel density.
            * This function does not take rotation into account, thus assuming provided
            * point is at 0 degree.
            * @param {OpenSeadragon.Point} point - the pixel point to convert
            * @returns {OpenSeadragon.Point} Point in drawer coordinate system.
            */
        _viewportCoordToDrawerCoord(point) {
            var vpPoint = this.viewport.pixelFromPointNoRotate(point, true);
            return new $.Point(
                vpPoint.x * $.pixelDensityRatio,
                vpPoint.y * $.pixelDensityRatio
            );
        }

        // private
        _drawDebugInfo( tilesToDraw, tiledImage, stroke, fill ) {

            for ( var i = tilesToDraw.length - 1; i >= 0; i-- ) {
                var tile = tilesToDraw[ i ].tile;
                try {
                    this._drawDebugInfoOnTile(tile, tilesToDraw.length, i, tiledImage, stroke, fill);
                } catch(e) {
                    $.console.error(e);
                }
            }
        }
        // private
        _drawDebugInfoOnTile(tile, count, i, tiledImage, stroke, fill) {

            var context = this._outputContext;
            context.save();
            context.lineWidth = 2 * $.pixelDensityRatio;
            context.font = 'small-caps bold ' + (13 * $.pixelDensityRatio) + 'px arial';
            context.strokeStyle = stroke;
            context.fillStyle = fill;

            if (this.viewport.getRotation(true) % 360 !== 0 ) {
                this._offsetForRotation({degrees: this.viewport.getRotation(true)});
            }
            if (tiledImage.getRotation(true) % 360 !== 0) {
                this._offsetForRotation({
                    degrees: tiledImage.getRotation(true),
                    point: tiledImage.viewport.pixelFromPointNoRotate(
                        tiledImage._getRotationPoint(true), true)
                });
            }
            if (tiledImage.viewport.getRotation(true) % 360 === 0 &&
                tiledImage.getRotation(true) % 360 === 0) {
                if(tiledImage._drawer.viewer.viewport.getFlip()) {
                    tiledImage._drawer._flip();
                }
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
            context.rotate( Math.PI / 180 * -this.viewport.getRotation(true) );
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

            if (tiledImage.viewport.getRotation(true) % 360 === 0 &&
                tiledImage.getRotation(true) % 360 === 0) {
                if(tiledImage._drawer.viewer.viewport.getFlip()) {
                    tiledImage._drawer._flip();
                }
            }

            context.restore();
        }

        // private
        _restoreRotationChanges() {
            var context = this._outputContext;
            context.restore();
        }

        // modified from https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Adding_2D_content_to_a_WebGL_context
        static initShaderProgram(gl, vsSource, fsSource) {
            const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
            const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

            // Create the shader program

            const shaderProgram = gl.createProgram();
            gl.attachShader(shaderProgram, vertexShader);
            gl.attachShader(shaderProgram, fragmentShader);
            gl.linkProgram(shaderProgram);

            // If creating the shader program failed, alert

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            alert(
                `Unable to initialize the shader program: ${gl.getProgramInfoLog(
                shaderProgram
                )}`
            );
            return null;
            }

            return shaderProgram;

            function loadShader(gl, type, source) {
                    const shader = gl.createShader(type);

                    // Send the source to the shader object

                    gl.shaderSource(shader, source);

                    // Compile the shader program

                    gl.compileShader(shader);

                    // See if it compiled successfully

                    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                        alert(
                            `An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`
                        );
                        gl.deleteShader(shader);
                        return null;
                    }

                return shader;
            }
        }

    };



}( OpenSeadragon ));
