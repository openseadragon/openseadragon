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

 // internal class Mat3: implements matrix operations
 // Modified from https://webglfundamentals.org/webgl/lessons/webgl-2d-matrices.html
class Mat3{
    constructor(values){
        if(!values) {
            values = [
                0, 0, 0,
                0, 0, 0,
                0, 0, 0
            ];
        }

        this.values = values;
    }

    static makeIdentity(){
        return new Mat3([
            1, 0, 0,
            0, 1, 0,
            0, 0, 1
        ]);
    }

    static makeTranslation(tx, ty) {
        return new Mat3([
            1, 0, 0,
            0, 1, 0,
            tx, ty, 1,
        ]);
    }

    static makeRotation(angleInRadians) {
        var c = Math.cos(angleInRadians);
        var s = Math.sin(angleInRadians);
        return new Mat3([
            c, -s, 0,
            s, c, 0,
            0, 0, 1,
        ]);
    }

    static makeScaling(sx, sy) {
        return new Mat3([
            sx, 0, 0,
            0, sy, 0,
            0, 0, 1,
        ]);
    }

    multiply(other) {
        let a = this.values;
        let b = other.values;

        var a00 = a[0 * 3 + 0];
        var a01 = a[0 * 3 + 1];
        var a02 = a[0 * 3 + 2];
        var a10 = a[1 * 3 + 0];
        var a11 = a[1 * 3 + 1];
        var a12 = a[1 * 3 + 2];
        var a20 = a[2 * 3 + 0];
        var a21 = a[2 * 3 + 1];
        var a22 = a[2 * 3 + 2];
        var b00 = b[0 * 3 + 0];
        var b01 = b[0 * 3 + 1];
        var b02 = b[0 * 3 + 2];
        var b10 = b[1 * 3 + 0];
        var b11 = b[1 * 3 + 1];
        var b12 = b[1 * 3 + 2];
        var b20 = b[2 * 3 + 0];
        var b21 = b[2 * 3 + 1];
        var b22 = b[2 * 3 + 2];
        return new Mat3([
            b00 * a00 + b01 * a10 + b02 * a20,
            b00 * a01 + b01 * a11 + b02 * a21,
            b00 * a02 + b01 * a12 + b02 * a22,
            b10 * a00 + b11 * a10 + b12 * a20,
            b10 * a01 + b11 * a11 + b12 * a21,
            b10 * a02 + b11 * a12 + b12 * a22,
            b20 * a00 + b21 * a10 + b22 * a20,
            b20 * a01 + b21 * a11 + b22 * a21,
            b20 * a02 + b21 * a12 + b22 * a22,
        ]);
    }

}

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
        this._glLocs = null;
        this._glProgram = null;
        this._glPositionBuffer = null;
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
        gl.deleteBuffer(this._glPositionBuffer);

        // TO DO: if/when render buffers or frame buffers are used, release them:
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
     * @returns {Boolean} returns true if canvas and webgl are supported and
     * three.js has been exposed as a global variable named THREE
     */
    isSupported(){
        let canvasElement = document.createElement( 'canvas' );
        let webglContext = $.isFunction( canvasElement.getContext ) &&
                    canvasElement.getContext( 'webgl' );
        let ext = webglContext.getExtension('WEBGL_lose_context');
        if(ext){
            ext.loseContext();
        }
        return !!( webglContext );
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
        let viewport = {
            bounds: this.viewport.getBoundsNoRotate(true),
            center: this.viewport.getCenter(true),
            rotation: this.viewport.getRotation(true) * Math.PI / 180
        };

        let flipMultiplier = this.viewport.flipped ? -1 : 1;
        // calculate view matrix for viewer
        let posMatrix = Mat3.makeTranslation(-viewport.center.x, -viewport.center.y);
        let scaleMatrix = Mat3.makeScaling(2 / viewport.bounds.width * flipMultiplier, -2 / viewport.bounds.height);
        let rotMatrix = Mat3.makeRotation(-viewport.rotation);
        let viewMatrix = scaleMatrix.multiply(rotMatrix).multiply(posMatrix);

        //iterate over tiled imagesget the list of tiles to draw
        this._outputContext.clearRect(0, 0, this._outputCanvas.width, this._outputCanvas.height);

        // TO DO: further optimization is possible.
        // If no clipping and no composite operation, the tiled images
        // can all be drawn onto the rendering canvas at the same time, avoiding
        // unnecessary clearing and copying of the pixel data.
        // For now, I'm doing it this way to replicate full functionality
        // of the context2d drawer
        tiledImages.forEach( (tiledImage, i) => {
            // clear the rendering canvas
            this._gl.clear(this._gl.COLOR_BUFFER_BIT);

            // set opacity for this image
            this._gl.uniform1f(this._glLocs.uOpacityMultiplier, tiledImage.opacity);

            //get the list of tiles to draw
            let tilesToDraw = tiledImage.getTilesToDraw();

            if(tilesToDraw.length === 0){
                return;
            }

            let overallMatrix = viewMatrix;

            let imageRotation = tiledImage.getRotation(true);
            if( imageRotation % 360 !== 0){
                let imageRotationMatrix = Mat3.makeRotation(-imageRotation * Math.PI / 180);
                let imageCenter = tiledImage.getBoundsNoRotate(true).getCenter();
                let t1 = Mat3.makeTranslation(imageCenter.x, imageCenter.y);
                let t2 = Mat3.makeTranslation(-imageCenter.x, -imageCenter.y);

                // update the view matrix to account for this image's rotation
                let localMatrix = t1.multiply(imageRotationMatrix).multiply(t2);
                overallMatrix = viewMatrix.multiply(localMatrix);
            }

            for(let i = 0; i < tilesToDraw.length; i++){
                let tile = tilesToDraw[i].tile;
                let texture = this._TextureMap.get(tile.getCanvasContext().canvas);
                if(texture){
                    this._drawTile(tile, tiledImage, texture, overallMatrix, tiledImage.opacity);
                } else {
                    // console.log('No tile info', tile);
                }
            }

            // composite onto the output canvas, clipping if necessary
            this._outputContext.save();

            // set composite operation; ignore for first image drawn
            this._outputContext.globalCompositeOperation = i === 0 ? null : tiledImage.compositeOperation || this.viewer.compositeOperation;
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
    _getTextureDataFromTile(tile){
        return tile.getCanvasContext().canvas;
    }

    // Private methods
    _drawTile(tile, tiledImage, texture, viewMatrix, imageOpacity){

        let gl = this._gl;

        // x, y, w, h in viewport coords
        let x = tile.positionedBounds.x;
        let y = tile.positionedBounds.y;
        let w = tile.positionedBounds.width;
        let h = tile.positionedBounds.height;

        let matrix = new Mat3([
            w, 0, 0,
            0, h, 0,
            x, y, 1,
        ]);


        if(tile.flipped){
            // flip the tile around the center of the unit quad
            let t1 = Mat3.makeTranslation(0.5, 0);
            let t2 = Mat3.makeTranslation(-0.5, 0);

            // update the view matrix to account for this image's rotation
            let localMatrix = t1.multiply(Mat3.makeScaling(-1, 1)).multiply(t2);
            matrix = matrix.multiply(localMatrix);
        }

        let overallMatrix = viewMatrix.multiply(matrix);

        if(tile.opacity !== 1 && tile.x === 0 && tile.y === 0){
            // set opacity for this image
            this._gl.uniform1f(this._glLocs.uOpacityMultiplier, imageOpacity * tile.opacity);
        }

        gl.uniformMatrix3fv(this._glLocs.uMatrix, false, overallMatrix.values);
        gl.bindTexture(gl.TEXTURE_2D, texture);

        if(this.continuousTileRefresh){
            // Upload the image into the texture.
            let tileContext = tile.getCanvasContext();
            this._raiseTileDrawingEvent(tiledImage, this._outputContext, tile, tileContext);
            this._uploadImageData(tileContext);
        }


        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    _setupRenderer(){

        if(!this._gl){
            $.console.error('_setupCanvases must be called before _setupRenderer');
        }

        const vertexShaderProgram = `
        attribute vec2 a_position;

        uniform mat3 u_matrix;

        varying vec2 v_texCoord;

        void main() {
        gl_Position = vec4(u_matrix * vec3(a_position, 1), 1);

        // because we're using a unit quad we can just use
        // the same data for our texcoords.
        v_texCoord = a_position;
        }
        `;

        const fragmentShaderProgram = `
        precision mediump float;

        // our texture
        uniform sampler2D u_image;

        // the texCoords passed in from the vertex shader.
        varying vec2 v_texCoord;

        // the opacity multiplier for the image
        uniform float u_opacity_multiplier;

        void main() {
        gl_FragColor = texture2D(u_image, v_texCoord);
        // gl_FragColor *= u_opacity_multiplier;
        }
        `;
        let gl = this._gl;
        this._glProgram = this.constructor.initShaderProgram(gl, vertexShaderProgram, fragmentShaderProgram);
        gl.useProgram(this._glProgram);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        this._glLocs = {
            aPosition: gl.getAttribLocation(this._glProgram, 'a_position'),
            uMatrix: gl.getUniformLocation(this._glProgram, 'u_matrix'),
            uImage: gl.getUniformLocation(this._glProgram, 'u_image'),
            uOpacityMultiplier: gl.getUniformLocation(this._glProgram, 'u_opacity_multiplier')
        };

        // provide texture coordinates for the rectangle.
        this._glPositionBuffer = gl.createBuffer(); //keep reference to clear it later
        gl.bindBuffer(gl.ARRAY_BUFFER, this._glPositionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            0.0, 0.0,
            1.0, 0.0,
            0., 1.0,
            0.0, 1.0,
            1.0, 0.0,
            1.0, 1.0]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(this._glLocs.aPosition);
        gl.vertexAttribPointer(this._glLocs.aPosition, 2, gl.FLOAT, false, 0, 0);

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
            _this._gl.viewport(0, 0, _this._renderingCanvas.width, _this._renderingCanvas.height);
        });
    }


    _tileReadyHandler(event){
        let tile = event.tile;
        let tileContext = tile.getCanvasContext();
        let canvas = tileContext.canvas;
        let texture = this._TextureMap.get(canvas);

        // if this is a new image for us, create a texture
        if(!texture){
            let gl = this._gl;

            // create a gl Texture for this tile and bind the canvas with the image data
            texture = gl.createTexture();
            // add it to our _TextureMap
            this._TextureMap.set(canvas, texture);

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

    _uploadImageData(tileContext){
        let gl = this._gl;
        try{
            let canvas = tileContext.canvas;
            if(!canvas){
                throw('Tile context does not have a canvas', tileContext);
            }
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
        } catch(e) {
            $.console.error('Error uploading canvas data to webgl', e);
        }
    }

    _imageUnloadedHandler(event){
        let canvas = event.context2D.canvas;
        this._cleanupImageData(canvas);
    }

    _cleanupImageData(tileCanvas){
        let texture = this._TextureMap.get(tileCanvas);
        //remove from the map
        this._TextureMap.delete(tileCanvas);

        //release the texture from the GPU
        this._gl.deleteTexture(texture);
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
        const vertexShader = this.loadShader(gl, gl.VERTEX_SHADER, vsSource);
        const fragmentShader = this.loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

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
    }

    //
    // creates a shader of the given type, uploads the source and
    // compiles it.
    //
    static loadShader(gl, type, source) {
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
};


}( OpenSeadragon ));
