
/*
 * OpenSeadragon - WebGLDrawer
 *
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
 * @param {boolean} options.twoPassRendering
 * @param {Element} options.element - Parent element.
 * @param {Number} [options.debugGridColor] - See debugGridColor in {@link OpenSeadragon.Options} for details.
 */

$.WebGL = class WebGL extends OpenSeadragon.DrawerBase {
    constructor(options){
        super(options);

        const gl = this.renderer.gl;
        this.maxTextureUnits = 4 || gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
        this.maxDrawBufferUnits = gl.getParameter(gl.MAX_DRAW_BUFFERS);

        this._createSinglePassShader('TEXTURE_2D');

        const size = this._calculateCanvasSize();
        this.renderer.init(size.x, size.y);
        this._size = size;
        this.renderer.setDataBlendingEnabled(true);

        this.destroyed = false;
        this._textureMap = {};
        this._renderOffScreenBuffer = gl.createFramebuffer();
        this._renderOffScreenTextures = [];
        //batch rendering (artifacts)
        // this._tileTexturePositions = new Float32Array(this.maxTextureUnits * 8);
        // this._transformMatrices = new Float32Array(this.maxTextureUnits * 9);


        this.viewer.addHandler("resize", this._resizeRenderer.bind(this));
        // Add listeners for events that require modifying the scene or camera
        this.viewer.addHandler("tile-ready", this._tileReadyHandler.bind(this));
        this.viewer.addHandler("image-unloaded", (e) => {
            const tileData = this._textureMap[e.tile.cacheKey];
            if (tileData.texture) {
                this.renderer.gl.deleteTexture(tileData.texture);
                delete this._textureMap[e.tile.cacheKey];
            }
        });
        this.viewer.world.addHandler("add-item", (e) => {
            let shader = e.item.source.shader;
            if (shader) {
                const targetIndex = this.renderer.getSpecificationsCount();
                if (this.renderer.addRenderingSpecifications(shader)) {
                    shader._programIndexTarget = targetIndex;
                    return;
                }
            } else {
                e.item.source.shader = shader = this.defaultRenderingSpecification;
            }
            //set default program: identity
            shader._programIndexTarget = 0;
        });
        this.viewer.world.addHandler("remove-item", (e) => {
            const tIndex = e.item.source.shader._programIndexTarget;
            if (tIndex > 0) {
                this.renderer.setRenderingSpecification(tIndex, null);
            }
        });
    }

    // Public API required by all Drawer implementations
    /**
     * Clean up the renderer, removing all resources
     */
    destroy(){
        if(this.destroyed){
            return;
        }
        //todo
        const gl = this.renderer.gl;
        this._renderOffScreenTextures.forEach(t => {
            if (t) {
                gl.deleteTexture(t);
            }
        });
        this._renderOffScreenTextures = [];

        if (this._renderOffScreenBuffer) {
            gl.deleteFramebuffer(this._renderOffScreenBuffer);
        }
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
        return true; //todo
    }

    getType() {
        return 'universal_webgl';
    }

    /**
     * create the HTML element (canvas in this case) that the image will be drawn into
     * @returns {Element} the canvas to draw into
     */
    createDrawingElement(){
        this.renderer = new $.WebGLModule($.extend(this.options, {
            uniqueId: "openseadragon",
            "2.0": {
                canvasOptions: {
                    stencil: true
                }
            }
        }));
        return this.renderer.canvas;
    }

    enableStencilTest(enabled) {
        if (enabled) {
            if (!this._stencilTestEnabled) {
                const gl = this.renderer.gl;
                gl.enable(gl.STENCIL_TEST);
                gl.stencilMask(0xff);
                gl.stencilFunc(gl.GREATER, 1, 0xff);
                gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
                this._stencilTestEnabled = true;
            }
        } else {
            if (this._stencilTestEnabled) {
                this._stencilTestEnabled = false;
                const gl = this.renderer.gl;
                gl.disable(gl.STENCIL_TEST);
            }
        }
    }

    /**
     *
     * @param {Array} tiledImages Array of TiledImage objects to draw
     */
    draw(tiledImages){
        let twoPassRendering = this.options.twoPassRendering;
        if (!twoPassRendering) {
            for (const tiledImage of tiledImages) {
                if (tiledImage.blendTime > 0) {
                    twoPassRendering = false; //todo set true, now we debug single pass
                }
            }
        }

        let viewport = {
            bounds: this.viewport.getBoundsNoRotate(true),
            center: this.viewport.getCenter(true),
            rotation: this.viewport.getRotation(true) * Math.PI / 180,
            zoom: this.viewport.getZoom(true)
        };

        let flipMultiplier = this.viewport.flipped ? -1 : 1;
        // calculate view matrix for viewer
        let posMatrix = $.Mat3.makeTranslation(-viewport.center.x, -viewport.center.y);
        let scaleMatrix = $.Mat3.makeScaling(2 / viewport.bounds.width * flipMultiplier, -2 / viewport.bounds.height);
        let rotMatrix = $.Mat3.makeRotation(-viewport.rotation);
        let viewMatrix = scaleMatrix.multiply(rotMatrix).multiply(posMatrix);
        this._batchTextures = Array(this.maxTextureUnits);

        if (twoPassRendering) {
            this._resizeOffScreenTextures(0);
            this.enableStencilTest(true);
            this._drawTwoPass(tiledImages, viewport, viewMatrix);
        } else {
            this._resizeOffScreenTextures(tiledImages.length);
            this.enableStencilTest(false);
            this._drawSinglePass(tiledImages, viewport, viewMatrix);
        }
    }


    tiledImageViewportToImageZoom(tiledImage, viewportZoom) {
        var ratio = tiledImage._scaleSpring.current.value *
            tiledImage.viewport._containerInnerSize.x /
            tiledImage.source.dimensions.x;
        return ratio * viewportZoom;
    }


    _drawSinglePass(tiledImages, viewport, viewMatrix) {
        const gl = this.renderer.gl;
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        for (const tiledImage of tiledImages) {
            let tilesToDraw = tiledImage.getTilesToDraw();

            if (tilesToDraw.length === 0) {
                continue;
            }

            //todo better access to the rendering context
            const shader = this.renderer.specification(0).shaders.renderShader._renderContext;
            shader.setBlendMode(tiledImage.index === 0 ?
                "source-over" : tiledImage.compositeOperation || this.viewer.compositeOperation);

            const sourceShader = tiledImage.source.shader;
            if (tiledImage.debugMode !== this.renderer.getCompiled("debug", sourceShader._programIndexTarget)) {
                this.buildOptions.debug = tiledImage.debugMode;
                //todo per image-level debug info :/
                this.renderer.buildProgram(sourceShader._programIndexTarget, null, true, this.buildOptions);
            }


            this.renderer.useProgram(sourceShader._programIndexTarget);
            gl.clear(gl.STENCIL_BUFFER_BIT);

            let overallMatrix = viewMatrix;
            let imageRotation = tiledImage.getRotation(true);
            // if needed, handle the tiledImage being rotated
            if( imageRotation % 360 !== 0) {
                let imageRotationMatrix = $.Mat3.makeRotation(-imageRotation * Math.PI / 180);
                let imageCenter = tiledImage.getBoundsNoRotate(true).getCenter();
                let t1 = $.Mat3.makeTranslation(imageCenter.x, imageCenter.y);
                let t2 = $.Mat3.makeTranslation(-imageCenter.x, -imageCenter.y);

                // update the view matrix to account for this image's rotation
                let localMatrix = t1.multiply(imageRotationMatrix).multiply(t2);
                overallMatrix = viewMatrix.multiply(localMatrix);
            }
            let pixelSize = this.tiledImageViewportToImageZoom(tiledImage, viewport.zoom);

            //tile level opacity not supported with single pass rendering
            shader.opacity.set(tiledImage.opacity);

            //batch rendering (artifacts)
            //let batchSize = 0;

            // iterate over tiles and add data for each one to the buffers
            for (let tileIndex = tilesToDraw.length - 1; tileIndex >= 0; tileIndex--){
                const tile = tilesToDraw[tileIndex].tile;
                const matrix = this._getTileMatrix(tile, tiledImage, overallMatrix);
                const tileData = this._textureMap[tile.cacheKey];

                this.renderer.processData(tileData.texture, {
                    transform: matrix,
                    zoom: viewport.zoom,
                    pixelSize: pixelSize,
                    textureCoords: tileData.position,
                });

                //batch rendering (artifacts)
                // this._transformMatrices.set(matrix, batchSize * 9);
                // this._tileTexturePositions.set(tileData.position, batchSize * 8);
                // this._batchTextures[batchSize] = tileData.texture;
                // batchSize++;
                // if (batchSize === this.maxTextureUnits) {
                //     console.log("tiles inside", this._tileTexturePositions);
                //     this.renderer.processData(this._batchTextures, {
                //         transform: this._transformMatrices,
                //         zoom: viewport.zoom,
                //         pixelSize: pixelSize,
                //         textureCoords: this._tileTexturePositions,
                //         instanceCount: batchSize
                //     });
                //     batchSize = 0;
                // }
            }

            //batch rendering (artifacts)
            // if (batchSize > 0) {
            //     console.log("tiles outside", this._tileTexturePositions);
            //
            //     //todo possibly zero out unused, or limit drawing size
            //     this.renderer.processData(this._batchTextures, {
            //         transform: this._transformMatrices,
            //         zoom: viewport.zoom,
            //         pixelSize: pixelSize,
            //         textureCoords: this._tileTexturePositions,
            //         instanceCount: batchSize
            //     });
            // }

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
        }
    }

    _drawTwoPass(tiledImages, viewport, viewMatrix) {
        const gl = this.renderer.gl;
        gl.clear(gl.COLOR_BUFFER_BIT);

        let drawnItems = 0;

        for (const tiledImage of tiledImages) {
            let tilesToDraw = tiledImage.getTilesToDraw();

            if (tilesToDraw.length === 0) {
                continue;
            }

            //second pass first: check whether next render won't overflow batch size
            //todo better access to the rendering context
            const shader = this.renderer.specification(0).shaders.renderShader._renderContext;
            shader.setBlendMode(tiledImage.index === 0 ?
                "source-over" : tiledImage.compositeOperation || this.viewer.compositeOperation);
            // const willDraw = drawnItems + shader.dataReferences.length;
            // if (willDraw > this.maxTextureUnits) {
            //     //merge to the output screen
            //     this._bindOffScreenTexture(-1);
            //
            //     //todo
            //
            //     drawnItems = 0;
            // }

            this.renderer.useProgram(0); //todo use program based on texture used, e.g. drawing multi output



            this._bindOffScreenTexture(drawnItems);

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

            // iterate over tiles and add data for each one to the buffers
            for (let tileIndex = tilesToDraw.length - 1; tileIndex >= 0; tileIndex--){
                const tile = tilesToDraw[tileIndex].tile;

                const matrix = this._getTileMatrix(tile, tiledImage, overallMatrix);
                shader.opacity.set(tile.opacity * tiledImage.opacity);
                const tileData = this._textureMap[tile.cacheKey];

                //todo pixelSize value (not yet memoized)
                this.renderer.processData(tileData.texture, {
                    transform: matrix,
                    zoom: viewport.zoom,
                    pixelSize: 0,
                    textureCoords: tileData.position
                });
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
        }
    }

    //single pass shaders are built-in shaders compiled from JSON
    _createSinglePassShader(textureType) {
        this.defaultRenderingSpecification = {
            shaders: {
                renderShader: {
                    type: "identity",
                    dataReferences: [0],
                }
            }
        };
        this.buildOptions = {
            textureType: textureType,
            //batch rendering (artifacts)
            //instanceCount: this.maxTextureUnits,
            debug: false
        };
        const index = this.renderer.getSpecificationsCount();
        this.renderer.addRenderingSpecifications(this.defaultRenderingSpecification);
        this.renderer.buildProgram(index, null, true, this.buildOptions);
    }

    //two pass shaders are special
    _createTwoPassShaderForFirstPass(textureType) {
        //custom program for two pass processing
        const gl = this.renderer.gl;
        const program = gl.createProgram();

        //works only in version dependent matter!
        const glContext = this.renderer.webglContext;
        const options = {
            textureType: textureType
        };

        glContext.compileVertexShader(program, `
uniform mat3 transform_matrix;
const vec3 quad[4] = vec3[4] (
    vec3(0.0, 1.0, 1.0),
    vec3(0.0, 0.0, 1.0),
    vec3(1.0, 1.0, 1.0),
    vec3(1.0, 0.0, 1.0)
);`, `
gl_Position = vec4(transform_matrix * quad[gl_VertexID], 1);`, options);
        glContext.compileFragmentShader(program, `
uniform int texture_location;`, `
blend(osd_texture(texture_location, osd_texture_coords), 0, false)`, options);
        return program;
    }

    /**
     * Set the context2d imageSmoothingEnabled parameter
     * @param {Boolean} enabled
     */
    setImageSmoothingEnabled(enabled){
        //todo
        // this._clippingContext.imageSmoothingEnabled = enabled;
        // this._outputContext.imageSmoothingEnabled = enabled;
    }

    // private
    _getTileMatrix(tile, tiledImage, viewMatrix){
        // compute offsets that account for tile overlap; needed for calculating the transform matrix appropriately
        // x, y, w, h in viewport coords

        let overlapFraction = this._calculateOverlapFraction(tile, tiledImage);
        let xOffset = tile.positionedBounds.width * overlapFraction.x;
        let yOffset = tile.positionedBounds.height * overlapFraction.y;

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
        return overallMatrix.values;
    }

    _resizeRenderer(){
        const size = this._calculateCanvasSize();
        this.renderer.setDimensions(0, 0, size.x, size.y);
        this._size = size;
    }

    _bindOffScreenTexture(index) {
        const gl = this.renderer.gl;
        if (index < 0) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        } else {
            let texture = this._renderOffScreenTextures[index];
            gl.bindFramebuffer(gl.FRAMEBUFFER, this._renderOffScreenBuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        }
    }

    _resizeOffScreenTextures(count) {
        //create at most count textures, with max texturing units constraint
        const gl = this.renderer.gl;

        count = Math.min(count, this.maxTextureUnits);

        if (count > 0) {
            //append or reinitialize textures
            const rebuildStartIndex =
                this._renderBufferSize === this._size ?
                this._renderOffScreenTextures.length : 0;

            let i;
            for (i = rebuildStartIndex; i < count; i++) {
                let texture = this._renderOffScreenTextures[i];
                if (!texture) {
                    this._renderOffScreenTextures[i] = texture = gl.createTexture();
                }
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8,
                    this._size.x, this._size.y, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
            }

            //destroy any textures that we don't need todo maybe just keep dont bother?
            for (let j = this._renderOffScreenTextures.length - 1; j >= i; j--) {
                let texture = this._renderOffScreenTextures.pop();
                gl.deleteTexture(texture);
            }

            this._renderBufferSize = this._size;
            return count;
        }
        //just leave the textures be, freeing consumes time
        return 0;
    }


    _tileReadyHandler(event){
        //todo tile overlap
        let tile = event.tile;
        let tiledImage = event.tiledImage;
        if (this._textureMap[tile.cacheKey]) {
            return;
        }

        let position,
            overlap = tiledImage.source.tileOverlap;
        if( overlap > 0){
            // calculate the normalized position of the rect to actually draw
            // discarding overlap.
            let overlapFraction = this._calculateOverlapFraction(tile, tiledImage);

            let left = tile.x === 0 ? 0 : overlapFraction.x;
            let top = tile.y === 0 ? 0 : overlapFraction.y;
            let right = tile.isRightMost ? 1 : 1 - overlapFraction.x;
            let bottom = tile.isBottomMost ? 1 : 1 - overlapFraction.y;
            position = new Float32Array([
                left, bottom,
                left, top,
                right, bottom,
                right, top
            ]);
        } else {
            // no overlap: this texture can use the unit quad as it's position data
            position = new Float32Array([
                0, 1,
                0, 0,
                1, 1,
                1, 0
            ]);
        }

        //todo rewrite with new cache api, support data arrays
        let data = tile.cacheImageRecord ? tile.cacheImageRecord.getData() : tile.getCanvasContext().canvas;

        const options = this.renderer.webglContext.options;
        const gl = this.renderer.gl;
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, options.wrap);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, options.wrap);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, options.minFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, options.magFilter);
        gl.texImage2D(gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            data);
        this._textureMap[tile.cacheKey] = {
            texture: texture,
            position: position,
        };
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
};
}( OpenSeadragon ));
