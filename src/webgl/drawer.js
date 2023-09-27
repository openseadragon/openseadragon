
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
 * @param {Element} options.element - Parent element.
 * @param {Number} [options.debugGridColor] - See debugGridColor in {@link OpenSeadragon.Options} for details.
 */

$.WebGL = class WebGL extends OpenSeadragon.DrawerBase {
    constructor(options){
        super(options);

        this.destroyed = false;
        // Add listeners for events that require modifying the scene or camera
        this.viewer.addHandler("tile-ready", this._tileReadyHandler.bind(this));
        this.viewer.addHandler("image-unloaded", this.renderer.freeData.bind(this.renderer));
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

        const engine = new $.WebGLModule($.extend(this.options, {
            uniqueId: "openseadragon",
            "2.0": {
                canvasOptions: {
                    stencil: true
                }
            }
        }));

        engine.addRenderingSpecifications({
            shaders: {
                renderShader: {
                    type: "identity",
                    dataReferences: [0],
                }
            }
        });

        engine.prepare();

        const size = this._calculateCanvasSize();
        engine.init(size.x, size.y);
        this.viewer.addHandler("resize", this._resizeRenderer.bind(this));
        this.renderer = engine;
        this.renderer.setDataBlendingEnabled(true);

        const gl = this.renderer.gl;
        // this._renderToTexture = gl.createTexture();
        // gl.activeTexture(gl.TEXTURE0);
        // gl.bindTexture(gl.TEXTURE_2D, this._renderToTexture);
        // gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size.x, size.y, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        //
        // // set up the framebuffer for render-to-texture
        // this._glFrameBuffer = gl.createFramebuffer();
        // gl.bindFramebuffer(gl.FRAMEBUFFER, this._glFrameBuffer);
        // gl.framebufferTexture2D(
        //     gl.FRAMEBUFFER,
        //     gl.COLOR_ATTACHMENT0,       // attach texture as COLOR_ATTACHMENT0
        //     gl.TEXTURE_2D,              // attach a 2D texture
        //     this._renderToTexture,  // the texture to attach
        //     0
        // );
        // gl.bindFramebuffer(gl.FRAMEBUFFER, this._glFrameBuffer);
        // gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this._renderToTexture, 0);

        gl.enable(gl.STENCIL_TEST);
        gl.stencilMask(0xff);
        gl.stencilFunc(gl.GREATER, 1, 0xff);
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
        return engine.canvas;
    }

    /**
     *
     * @param {Array} tiledImages Array of TiledImage objects to draw
     */
    draw(tiledImages){
        let viewport = {
            bounds: this.viewport.getBoundsNoRotate(true),
            center: this.viewport.getCenter(true),
            rotation: this.viewport.getRotation(true) * Math.PI / 180,
            zoom: this.viewport.getZoom(true)
        };


        // let flipMultiplier = this.viewport.flipped ? -1 : 1;
        // calculate view matrix for viewer
        let posMatrix = $.Mat3.makeTranslation(-viewport.center.x, -viewport.center.y);
        let scaleMatrix = $.Mat3.makeScaling(2 / viewport.bounds.width, -2 / viewport.bounds.height);
        let rotMatrix = $.Mat3.makeRotation(-viewport.rotation);
        let viewMatrix = scaleMatrix.multiply(rotMatrix).multiply(posMatrix);

        const gl = this.renderer.gl;
        // gl.bindFramebuffer(gl.FRAMEBUFFER, this._glFrameBuffer);
        // clear the buffer to draw a new image
        gl.clear(gl.COLOR_BUFFER_BIT);

        //iterate over tiled images and draw each one using a two-pass rendering pipeline if needed
        for (const tiledImage of tiledImages) {
            let tilesToDraw = tiledImage.getTilesToDraw();

            if (tilesToDraw.length === 0) {
                continue;
            }

            gl.clear(gl.STENCIL_BUFFER_BIT);

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


            //todo better access to the rendering context
            const shader = this.renderer.specification(0).shaders.renderShader._renderContext;
            // iterate over tiles and add data for each one to the buffers
            for (let tileIndex = tilesToDraw.length - 1; tileIndex >= 0; tileIndex--){
                const tile = tilesToDraw[tileIndex].tile;

                const matrix = this._getTileMatrix(tile, tiledImage, overallMatrix);
                shader.opacity.set(tile.opacity * tiledImage.opacity);

                //todo pixelSize value (not yet memoized)
                this.renderer.processData(tile.cacheKey, {
                    transform: matrix,
                    zoom: viewport.zoom,
                    pixelSize: 0
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
        return overallMatrix.values;
    }

    _resizeRenderer(){
        const size = this._calculateCanvasSize();
        this.renderer.setDimensions(0, 0, size.x, size.y);
    }

    _imageUnloadedHandler(event){
        this.renderer.freeData(event.tile.cacheKey);
    }

    _tileReadyHandler(event){
        //todo tile overlap
        let tile = event.tile;
        //todo fix cache system and then this line
        //access by default raw tile data, and only access canvas if not cache set
        let data = tile.cacheImageRecord ? tile.cacheImageRecord.getData() : tile.getCanvasContext().canvas;
        this.renderer.loadData(tile.cacheKey, data, tile.sourceBounds.width, tile.sourceBounds.height);
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
