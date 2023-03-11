/*
 * OpenSeadragon - Drawer
 *
 * Copyright (C) 2009 CodePlex Foundation
 * Copyright (C) 2010-2022 OpenSeadragon contributors
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
 * @class Drawer
 * @memberof OpenSeadragon
 * @classdesc Default implementation of Drawer for an {@link OpenSeadragon.Viewer}.
 * @param {Object} options - Options for this Drawer.
 * @param {OpenSeadragon.Viewer} options.viewer - The Viewer that owns this Drawer.
 * @param {OpenSeadragon.Viewport} options.viewport - Reference to Viewer viewport.
 * @param {Element} options.element - Parent element.
 * @param {Number} [options.debugGridColor] - See debugGridColor in {@link OpenSeadragon.Options} for details.
 */
$.Drawer = function(options) {

    $.DrawerBase.call(this, options);

    /**
     * 2d drawing context for {@link OpenSeadragon.Drawer#canvas} if it's a &lt;canvas&gt; element, otherwise null.
     * @member {Object} context
     * @memberof OpenSeadragon.Drawer#
     */
    this.context    = this.useCanvas ? this.canvas.getContext( '2d' ) : null;

    /**
     * Sketch canvas used to temporarily draw tiles which cannot be drawn directly
     * to the main canvas due to opacity. Lazily initialized.
     */
    this.sketchCanvas = null;
    this.sketchContext = null;

    // We force our container to ltr because our drawing math doesn't work in rtl.
    // This issue only affects our canvas renderer, but we do it always for consistency.
    // Note that this means overlays you want to be rtl need to be explicitly set to rtl.
    this.container.dir = 'ltr';

    // Image smoothing for canvas rendering (only if canvas is used).
    // Canvas default is "true", so this will only be changed if user specified "false".
    this._imageSmoothingEnabled = true;
};

$.extend( $.Drawer.prototype, $.DrawerBase.prototype, /** @lends OpenSeadragon.Drawer.prototype */ {

    /**
     * Draws the TiledImages
     */
    draw: function(tiledImages) {
        var _this = this;
        this._prepareNewFrame(); // prepare to draw a new frame
        tiledImages.forEach(function(tiledImage){
            if (tiledImage.opacity !== 0 || tiledImage._preload) {
                tiledImage._midDraw = true;
                _this._updateViewportWithTiledImage(tiledImage);
                tiledImage._midDraw = false;
            }
            else {
                tiledImage._needsDraw = false;
            }
        });

    },

    /**
     * @returns {Boolean} True if rotation is supported.
     */
    canRotate: function() {
        return this.useCanvas;
    },

    /**
     * Destroy the drawer (unload current loaded tiles)
     */
    destroy: function() {
        //force unloading of current canvas (1x1 will be gc later, trick not necessarily needed)
        this.canvas.width  = 1;
        this.canvas.height = 1;
        this.sketchCanvas = null;
        this.sketchContext = null;
    },

    /**
     * Turns image smoothing on or off for this viewer. Note: Ignored in some (especially older) browsers that do not support this property.
     *
     * @function
     * @param {Boolean} [imageSmoothingEnabled] - Whether or not the image is
     * drawn smoothly on the canvas; see imageSmoothingEnabled in
     * {@link OpenSeadragon.Options} for more explanation.
     */
    setImageSmoothingEnabled: function(imageSmoothingEnabled){
        if ( this.useCanvas ) {
            this._imageSmoothingEnabled = imageSmoothingEnabled;
            this._updateImageSmoothingEnabled(this.context);
            this.viewer.forceRedraw();
        }
    },

    /**
     * Draw a rectangle onto the canvas
     * @param {OpenSeadragon.Rect} rect
     */
    drawDebuggingRect: function(rect) {
        if ( this.useCanvas ) {
            var context = this.context;
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
    },

    /**
     * @private
     * @inner
     * Clears the Drawer so it's ready to draw another frame.
     *
     */
    _prepareNewFrame: function() {
        this.canvas.innerHTML = "";
        if ( this.useCanvas ) {
            var viewportSize = this._calculateCanvasSize();
            if( this.canvas.width !== viewportSize.x ||
                this.canvas.height !== viewportSize.y ) {
                this.canvas.width = viewportSize.x;
                this.canvas.height = viewportSize.y;
                this._updateImageSmoothingEnabled(this.context);
                if ( this.sketchCanvas !== null ) {
                    var sketchCanvasSize = this._calculateSketchCanvasSize();
                    this.sketchCanvas.width = sketchCanvasSize.x;
                    this.sketchCanvas.height = sketchCanvasSize.y;
                    this._updateImageSmoothingEnabled(this.sketchContext);
                }
            }
            this._clear();
        }
    },

    /**
     * @private
     * @inner
     * @param {Boolean} useSketch Whether to clear sketch canvas or main canvas
     * @param {OpenSeadragon.Rect} [bounds] The rectangle to clear
     */
    _clear: function(useSketch, bounds){
        if( this.useCanvas ){
            var context = this._getContext(useSketch);
            if (bounds) {
                context.clearRect(bounds.x, bounds.y, bounds.width, bounds.height);
            } else {
                var canvas = context.canvas;
                context.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    },

    /* Methods from TiledImage */

    /**
     * @private
     * @inner
     * Handles drawing a single TiledImage to the canvas
     *
     */
    _updateViewportWithTiledImage: function(tiledImage) {
        var _this = this;
        tiledImage._needsDraw = false;
        tiledImage._tilesLoading = 0;
        tiledImage.loadingCoverage = {};

        // Reset tile's internal drawn state
        while (tiledImage.lastDrawn.length > 0) {
            var tile = tiledImage.lastDrawn.pop();
            tile.beingDrawn = false;
        }


        var drawArea = tiledImage.getDrawArea();
        if(!drawArea){
            return;
        }

        function updateTile(info){
            var tile = info.tile;
            if(tile && tile.loaded){
                var needsDraw = _this._blendTile(
                    tiledImage,
                    tile,
                    tile.x,
                    tile.y,
                    info.level,
                    info.levelOpacity,
                    info.currentTime
                );
                if(needsDraw){
                    tiledImage._needsDraw = true;
                }
            }
        }

        var infoArray = tiledImage.getTileInfoForDrawing();
        infoArray.forEach(updateTile);

        this._drawTiles(tiledImage);

    },



    /**
     * @private
     * @inner
     * Updates the opacity of a tile according to the time it has been on screen
     * to perform a fade-in.
     * Updates coverage once a tile is fully opaque.
     * Returns whether the fade-in has completed.
     *
     * @param {OpenSeadragon.Tile} tile
     * @param {Number} x
     * @param {Number} y
     * @param {Number} level
     * @param {Number} levelOpacity
     * @param {Number} currentTime
     * @returns {Boolean}
     */
    _blendTile: function( tiledImage, tile, x, y, level, levelOpacity, currentTime ){
        var blendTimeMillis = 1000 * tiledImage.blendTime,
            deltaTime,
            opacity;

        if ( !tile.blendStart ) {
            tile.blendStart = currentTime;
        }

        deltaTime   = currentTime - tile.blendStart;
        opacity     = blendTimeMillis ? Math.min( 1, deltaTime / ( blendTimeMillis ) ) : 1;

        if ( tiledImage.alwaysBlend ) {
            opacity *= levelOpacity;
        }

        tile.opacity = opacity;

        tiledImage.lastDrawn.push( tile );

        if ( opacity === 1 ) {
            tiledImage._setCoverage( tiledImage.coverage, level, x, y, true );
            tiledImage._hasOpaqueTile = true;
        } else if ( deltaTime < blendTimeMillis ) {
            return true;
        }

        return false;
    },

    /**
     * @private
     * @inner
     * Draws a TiledImage.
     *
     */
    _drawTiles: function( tiledImage ) {
        var lastDrawn = tiledImage.lastDrawn;
        if (tiledImage.opacity === 0 || (lastDrawn.length === 0 && !tiledImage.placeholderFillStyle)) {
            return;
        }

        var tile = lastDrawn[0];
        var useSketch;

        if (tile) {
            useSketch = tiledImage.opacity < 1 ||
                (tiledImage.compositeOperation && tiledImage.compositeOperation !== 'source-over') ||
                (!tiledImage._isBottomItem() &&
                tiledImage.source.hasTransparency(tile.context2D, tile.getUrl(), tile.ajaxHeaders, tile.postData));
        }

        var sketchScale;
        var sketchTranslate;

        var zoom = this.viewport.getZoom(true);
        var imageZoom = tiledImage.viewportToImageZoom(zoom);

        if (lastDrawn.length > 1 &&
            imageZoom > tiledImage.smoothTileEdgesMinZoom &&
            !tiledImage.iOSDevice &&
            tiledImage.getRotation(true) % 360 === 0 && // TO DO: support tile edge smoothing with tiled image rotation.
            $.supportsCanvas && this.viewer.useCanvas) {
            // When zoomed in a lot (>100%) the tile edges are visible.
            // So we have to composite them at ~100% and scale them up together.
            // Note: Disabled on iOS devices per default as it causes a native crash
            useSketch = true;
            sketchScale = tile.getScaleForEdgeSmoothing();
            sketchTranslate = tile.getTranslationForEdgeSmoothing(sketchScale,
                this._getCanvasSize(false),
                this._getCanvasSize(true));
        }

        var bounds;
        if (useSketch) {
            if (!sketchScale) {
                // Except when edge smoothing, we only clean the part of the
                // sketch canvas we are going to use for performance reasons.
                bounds = this.viewport.viewportToViewerElementRectangle(
                    tiledImage.getClippedBounds(true))
                    .getIntegerBoundingBox();

                if(this.viewer.viewport.getFlip()) {
                    if (this.viewport.getRotation(true) % 360 !== 0 ||
                        tiledImage.getRotation(true) % 360 !== 0) {
                        bounds.x = this.viewer.container.clientWidth - (bounds.x + bounds.width);
                    }
                }

                bounds = bounds.times($.pixelDensityRatio);
            }
            this._clear(true, bounds);
        }

        // When scaling, we must rotate only when blending the sketch canvas to
        // avoid interpolation
        if (!sketchScale) {
            if (this.viewport.getRotation(true) % 360 !== 0) {
                this._offsetForRotation({
                    degrees: this.viewport.getRotation(true),
                    useSketch: useSketch
                });
            }
            if (tiledImage.getRotation(true) % 360 !== 0) {
                this._offsetForRotation({
                    degrees: tiledImage.getRotation(true),
                    point: this.viewport.pixelFromPointNoRotate(
                        tiledImage._getRotationPoint(true), true),
                    useSketch: useSketch
                });
            }

            if (this.viewport.getRotation(true) % 360 === 0 &&
                tiledImage.getRotation(true) % 360 === 0) {
                if(this.viewer.viewport.getFlip()) {
                    this._flip();
                }
            }
        }

        var usedClip = false;
        if ( tiledImage._clip ) {
            this._saveContext(useSketch);

            var box = tiledImage.imageToViewportRectangle(tiledImage._clip, true);
            box = box.rotate(-tiledImage.getRotation(true), tiledImage._getRotationPoint(true));
            var clipRect = this._viewportToDrawerRectangle(box);
            if (sketchScale) {
                clipRect = clipRect.times(sketchScale);
            }
            if (sketchTranslate) {
                clipRect = clipRect.translate(sketchTranslate);
            }
            this._setClip(clipRect, useSketch);

            usedClip = true;
        }

        if (tiledImage._croppingPolygons) {
            var self = this;
            this._saveContext(useSketch);
            try {
                var polygons = tiledImage._croppingPolygons.map(function (polygon) {
                    return polygon.map(function (coord) {
                        var point = tiledImage
                            .imageToViewportCoordinates(coord.x, coord.y, true)
                            .rotate(-tiledImage.getRotation(true), tiledImage._getRotationPoint(true));
                        var clipPoint = self._viewportCoordToDrawerCoord(point);
                        if (sketchScale) {
                            clipPoint = clipPoint.times(sketchScale);
                        }
                        if (sketchTranslate) { // mostly fixes #2312
                            clipPoint = clipPoint.plus(sketchTranslate);
                        }
                        return clipPoint;
                    });
                });
                this._clipWithPolygons(polygons, useSketch);
            } catch (e) {
                $.console.error(e);
            }
            usedClip = true;
        }

        if ( tiledImage.placeholderFillStyle && tiledImage._hasOpaqueTile === false ) {
            var placeholderRect = this._viewportToDrawerRectangle(tiledImage.getBounds(true));
            if (sketchScale) {
                placeholderRect = placeholderRect.times(sketchScale);
            }
            if (sketchTranslate) {
                placeholderRect = placeholderRect.translate(sketchTranslate);
            }

            var fillStyle = null;
            if ( typeof tiledImage.placeholderFillStyle === "function" ) {
                fillStyle = tiledImage.placeholderFillStyle(tiledImage, this.context);
            }
            else {
                fillStyle = tiledImage.placeholderFillStyle;
            }

            this.drawRectangle(placeholderRect, fillStyle, useSketch);
        }

        var subPixelRoundingRule = determineSubPixelRoundingRule(tiledImage.subPixelRoundingForTransparency);

        var shouldRoundPositionAndSize = false;

        if (subPixelRoundingRule === $.SUBPIXEL_ROUNDING_OCCURRENCES.ALWAYS) {
            shouldRoundPositionAndSize = true;
        } else if (subPixelRoundingRule === $.SUBPIXEL_ROUNDING_OCCURRENCES.ONLY_AT_REST) {
            var isAnimating = this.viewer && this.viewer.isAnimating();
            shouldRoundPositionAndSize = !isAnimating;
        }

        // Iterate over the tiles to draw, and draw them
        for (var i = lastDrawn.length - 1; i >= 0; i--) {
            tile = lastDrawn[ i ];
            this._drawTile( tile, tiledImage._drawingHandler, useSketch, sketchScale,
                sketchTranslate, shouldRoundPositionAndSize, tiledImage.source );
            tile.beingDrawn = true;

            if( this.viewer ){
                /**
                 * Raised when a tile is drawn to the canvas
                 *
                 * @event tile-drawn
                 * @memberof OpenSeadragon.Viewer
                 * @type {object}
                 * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
                 * @property {OpenSeadragon.TiledImage} tiledImage - Which TiledImage is being drawn.
                 * @property {OpenSeadragon.Tile} tile
                 * @property {?Object} userData - Arbitrary subscriber-defined object.
                 */
                this.viewer.raiseEvent( 'tile-drawn', {
                    tiledImage: tiledImage,
                    tile: tile
                });
            }
        }

        if ( usedClip ) {
            this._restoreContext( useSketch );
        }

        if (!sketchScale) {
            if (tiledImage.getRotation(true) % 360 !== 0) {
                this._restoreRotationChanges(useSketch);
            }
            if (this.viewport.getRotation(true) % 360 !== 0) {
                this._restoreRotationChanges(useSketch);
            }
        }

        if (useSketch) {
            if (sketchScale) {
                if (this.viewport.getRotation(true) % 360 !== 0) {
                    this._offsetForRotation({
                        degrees: this.viewport.getRotation(true),
                        useSketch: false
                    });
                }
                if (tiledImage.getRotation(true) % 360 !== 0) {
                    this._offsetForRotation({
                        degrees: tiledImage.getRotation(true),
                        point: this.viewport.pixelFromPointNoRotate(
                            tiledImage._getRotationPoint(true), true),
                        useSketch: false
                    });
                }
            }
            this.blendSketch({
                opacity: tiledImage.opacity,
                scale: sketchScale,
                translate: sketchTranslate,
                compositeOperation: tiledImage.compositeOperation,
                bounds: bounds
            });
            if (sketchScale) {
                if (tiledImage.getRotation(true) % 360 !== 0) {
                    this._restoreRotationChanges(false);
                }
                if (this.viewport.getRotation(true) % 360 !== 0) {
                    this._restoreRotationChanges(false);
                }
            }
        }

        if (!sketchScale) {
            if (this.viewport.getRotation(true) % 360 === 0 &&
                tiledImage.getRotation(true) % 360 === 0) {
                if(this.viewer.viewport.getFlip()) {
                    this._flip();
                }
            }
        }

        this._drawDebugInfo( tiledImage, lastDrawn );
    },

    /**
     * @private
     * @inner
     * Draws special debug information for a TiledImage if in debug mode.
     * @param {OpenSeadragon.Tile[]} lastDrawn - An unordered list of Tiles drawn last frame.
     */
    _drawDebugInfo: function( tiledImage, lastDrawn ) {
        if( tiledImage.debugMode ) {
            for ( var i = lastDrawn.length - 1; i >= 0; i-- ) {
                var tile = lastDrawn[ i ];
                try {
                    this.drawDebugInfo(tile, lastDrawn.length, i, tiledImage);
                } catch(e) {
                    $.console.error(e);
                }
            }
        }
    },

    /* Methods from Tile */

    /**
     * @private
     * @inner
     * This function will create multiple polygon paths on the drawing context by provided polygons,
     * then clip the context to the paths.
     * @param {OpenSeadragon.Point[][]} polygons - an array of polygons. A polygon is an array of OpenSeadragon.Point
     * @param {Boolean} useSketch - Whether to use the sketch canvas or not.
     */
    _clipWithPolygons: function (polygons, useSketch) {
        if (!this.useCanvas) {
            return;
        }
        var context = this._getContext(useSketch);
        context.beginPath();
        polygons.forEach(function (polygon) {
            polygon.forEach(function (coord, i) {
                context[i === 0 ? 'moveTo' : 'lineTo'](coord.x, coord.y);
          });
        });
        context.clip();
    },

    /**
     * @private
     * @inner
     * Draws the given tile.
     * @param {OpenSeadragon.Tile} tile - The tile to draw.
     * @param {Function} drawingHandler - Method for firing the drawing event if using canvas.
     * drawingHandler({context, tile, rendered})
     * @param {Boolean} useSketch - Whether to use the sketch canvas or not.
     * where <code>rendered</code> is the context with the pre-drawn image.
     * @param {Float} [scale=1] - Apply a scale to tile position and size. Defaults to 1.
     * @param {OpenSeadragon.Point} [translate] A translation vector to offset tile position
     * @param {Boolean} [shouldRoundPositionAndSize] - Tells whether to round
     * position and size of tiles supporting alpha channel in non-transparency
     * context.
     * @param {OpenSeadragon.TileSource} source - The source specification of the tile.
     */
    _drawTile: function( tile, drawingHandler, useSketch, scale, translate, shouldRoundPositionAndSize, source) {
        $.console.assert(tile, '[Drawer._drawTile] tile is required');
        $.console.assert(drawingHandler, '[Drawer._drawTile] drawingHandler is required');

        if (this.useCanvas) {
            var context = this._getContext(useSketch);
            scale = scale || 1;
            this._drawTileToCanvas(tile, context, drawingHandler, scale, translate, shouldRoundPositionAndSize, source);
        } else {
            tile._drawTileToHTML( tile, this.canvas );
        }
    },

    /**
     * @private
     * @inner
     * Renders the tile in a canvas-based context.
     * @function
     * @param {OpenSeadragon.Tile} tile - the tile to draw to the canvas
     * @param {Canvas} context
     * @param {Function} drawingHandler - Method for firing the drawing event.
     * drawingHandler({context, tile, rendered})
     * where <code>rendered</code> is the context with the pre-drawn image.
     * @param {Number} [scale=1] - Apply a scale to position and size
     * @param {OpenSeadragon.Point} [translate] - A translation vector
     * @param {Boolean} [shouldRoundPositionAndSize] - Tells whether to round
     * position and size of tiles supporting alpha channel in non-transparency
     * context.
     * @param {OpenSeadragon.TileSource} source - The source specification of the tile.
     */
    _drawTileToCanvas: function( tile, context, drawingHandler, scale, translate, shouldRoundPositionAndSize, source) {

        var position = tile.position.times($.pixelDensityRatio),
            size     = tile.size.times($.pixelDensityRatio),
            rendered;

        if (!tile.context2D && !tile.cacheImageRecord) {
            $.console.warn(
                '[Drawer._drawTileToCanvas] attempting to draw tile %s when it\'s not cached',
                tile.toString());
            return;
        }

        rendered = tile.getCanvasContext();

        if ( !tile.loaded || !rendered ){
            $.console.warn(
                "Attempting to draw tile %s when it's not yet loaded.",
                tile.toString()
            );

            return;
        }

        context.save();
        context.globalAlpha = this.opacity;

        if (typeof scale === 'number' && scale !== 1) {
            // draw tile at a different scale
            position = position.times(scale);
            size = size.times(scale);
        }

        if (translate instanceof $.Point) {
            // shift tile position slightly
            position = position.plus(translate);
        }

        //if we are supposed to be rendering fully opaque rectangle,
        //ie its done fading or fading is turned off, and if we are drawing
        //an image with an alpha channel, then the only way
        //to avoid seeing the tile underneath is to clear the rectangle
        if (context.globalAlpha === 1 && tile.hasTransparency) {
            if (shouldRoundPositionAndSize) {
                // Round to the nearest whole pixel so we don't get seams from overlap.
                position.x = Math.round(position.x);
                position.y = Math.round(position.y);
                size.x = Math.round(size.x);
                size.y = Math.round(size.y);
            }

            //clearing only the inside of the rectangle occupied
            //by the png prevents edge flikering
            context.clearRect(
                position.x,
                position.y,
                size.x,
                size.y
            );
        }

        // This gives the application a chance to make image manipulation
        // changes as we are rendering the image
        drawingHandler({context: context, tile: tile, rendered: rendered});

        var sourceWidth, sourceHeight;
        if (tile.sourceBounds) {
            sourceWidth = Math.min(tile.sourceBounds.width, rendered.canvas.width);
            sourceHeight = Math.min(tile.sourceBounds.height, rendered.canvas.height);
        } else {
            sourceWidth = rendered.canvas.width;
            sourceHeight = rendered.canvas.height;
        }

        context.translate(position.x + size.x / 2, 0);
        if (tile.flipped) {
            context.scale(-1, 1);
        }
        context.drawImage(
            rendered.canvas,
            0,
            0,
            sourceWidth,
            sourceHeight,
            -size.x / 2,
            position.y,
            size.x,
            size.y
        );

        context.restore();
    },

    /**
     * @private
     * @inner
     * Renders the tile in an html container.
     * @function
     * @param {OpenSeadragon.Tile} tile
     * @param {Element} container
     */
    _drawTileToHTML: function( tile, container ) {
        if (!tile.cacheImageRecord) {
            $.console.warn(
                '[Drawer._drawTileToHTML] attempting to draw tile %s when it\'s not cached',
                tile.toString());
            return;
        }

        if ( !tile.loaded ) {
            $.console.warn(
                "Attempting to draw tile %s when it's not yet loaded.",
                tile.toString()
            );
            return;
        }

        //EXPERIMENTAL - trying to figure out how to scale the container
        //               content during animation of the container size.

        if ( !tile.element ) {
            var image = tile.getImage();
            if (!image) {
                return;
            }

            tile.element                              = $.makeNeutralElement( "div" );
            tile.imgElement                           = image.cloneNode();
            tile.imgElement.style.msInterpolationMode = "nearest-neighbor";
            tile.imgElement.style.width               = "100%";
            tile.imgElement.style.height              = "100%";

            tile.style                     = tile.element.style;
            tile.style.position            = "absolute";
        }
        if ( tile.element.parentNode !== container ) {
            container.appendChild( tile.element );
        }
        if ( tile.imgElement.parentNode !== tile.element ) {
            tile.element.appendChild( tile.imgElement );
        }

        tile.style.top     = tile.position.y + "px";
        tile.style.left    = tile.position.x + "px";
        tile.style.height  = tile.size.y + "px";
        tile.style.width   = tile.size.x + "px";

        if (tile.flipped) {
            tile.style.transform = "scaleX(-1)";
        }

        $.setElementOpacity( tile.element, tile.opacity );
    },

    /**
     * @private
     * @inner
     * Get the context of the main or sketch canvas
     * @param {Boolean} useSketch
     * @returns
     */
    _getContext: function( useSketch ) {
        var context = this.context;
        if ( useSketch ) {
            if (this.sketchCanvas === null) {
                this.sketchCanvas = document.createElement( "canvas" );
                var sketchCanvasSize = this._calculateSketchCanvasSize();
                this.sketchCanvas.width = sketchCanvasSize.x;
                this.sketchCanvas.height = sketchCanvasSize.y;
                this.sketchContext = this.sketchCanvas.getContext( "2d" );

                // If the viewport is not currently rotated, the sketchCanvas
                // will have the same size as the main canvas. However, if
                // the viewport get rotated later on, we will need to resize it.
                if (this.viewport.getRotation() === 0) {
                    var self = this;
                    this.viewer.addHandler('rotate', function resizeSketchCanvas() {
                        if (self.viewport.getRotation() === 0) {
                            return;
                        }
                        self.viewer.removeHandler('rotate', resizeSketchCanvas);
                        var sketchCanvasSize = self._calculateSketchCanvasSize();
                        self.sketchCanvas.width = sketchCanvasSize.x;
                        self.sketchCanvas.height = sketchCanvasSize.y;
                    });
                }
                this._updateImageSmoothingEnabled(this.sketchContext);
            }
            context = this.sketchContext;
        }
        return context;
    },

    /**
     * @private
     * @inner
     * Save the context of the main or sketch canvas
     * @param {Boolean} useSketch
     * @returns
     */
    _saveContext: function( useSketch ) {
        if (!this.useCanvas) {
            return;
        }

        this._getContext( useSketch ).save();
    },

    /**
     * @private
     * @inner
     * Restore the context of the main or sketch canvas
     * @param {Boolean} useSketch
     * @returns
     */
    _restoreContext: function( useSketch ) {
        if (!this.useCanvas) {
            return;
        }

        this._getContext( useSketch ).restore();
    },

    // private
    _setClip: function(rect, useSketch) {
        if (!this.useCanvas) {
            return;
        }

        var context = this._getContext( useSketch );
        context.beginPath();
        context.rect(rect.x, rect.y, rect.width, rect.height);
        context.clip();
    },

    // private
    drawRectangle: function(rect, fillStyle, useSketch) {
        if (!this.useCanvas) {
            return;
        }

        var context = this._getContext( useSketch );
        context.save();
        context.fillStyle = fillStyle;
        context.fillRect(rect.x, rect.y, rect.width, rect.height);
        context.restore();
    },

    /**
     * Blends the sketch canvas in the main canvas.
     * @param {Object} options The options
     * @param {Float} options.opacity The opacity of the blending.
     * @param {Float} [options.scale=1] The scale at which tiles were drawn on
     * the sketch. Default is 1.
     * Use scale to draw at a lower scale and then enlarge onto the main canvas.
     * @param {OpenSeadragon.Point} [options.translate] A translation vector
     * that was used to draw the tiles
     * @param {String} [options.compositeOperation] - How the image is
     * composited onto other images; see compositeOperation in
     * {@link OpenSeadragon.Options} for possible values.
     * @param {OpenSeadragon.Rect} [options.bounds] The part of the sketch
     * canvas to blend in the main canvas. If specified, options.scale and
     * options.translate get ignored.
     */
    blendSketch: function(opacity, scale, translate, compositeOperation) {
        var options = opacity;
        if (!$.isPlainObject(options)) {
            options = {
                opacity: opacity,
                scale: scale,
                translate: translate,
                compositeOperation: compositeOperation
            };
        }
        if (!this.useCanvas || !this.sketchCanvas) {
            return;
        }
        opacity = options.opacity;
        compositeOperation = options.compositeOperation;
        var bounds = options.bounds;

        this.context.save();
        this.context.globalAlpha = opacity;
        if (compositeOperation) {
            this.context.globalCompositeOperation = compositeOperation;
        }
        if (bounds) {
            // Internet Explorer, Microsoft Edge, and Safari have problems
            // when you call context.drawImage with negative x or y
            // or x + width or y + height greater than the canvas width or height respectively.
            if (bounds.x < 0) {
                bounds.width += bounds.x;
                bounds.x = 0;
            }
            if (bounds.x + bounds.width > this.canvas.width) {
                bounds.width = this.canvas.width - bounds.x;
            }
            if (bounds.y < 0) {
                bounds.height += bounds.y;
                bounds.y = 0;
            }
            if (bounds.y + bounds.height > this.canvas.height) {
                bounds.height = this.canvas.height - bounds.y;
            }

            this.context.drawImage(
                this.sketchCanvas,
                bounds.x,
                bounds.y,
                bounds.width,
                bounds.height,
                bounds.x,
                bounds.y,
                bounds.width,
                bounds.height
            );
        } else {
            scale = options.scale || 1;
            translate = options.translate;
            var position = translate instanceof $.Point ?
                translate : new $.Point(0, 0);

            var widthExt = 0;
            var heightExt = 0;
            if (translate) {
                var widthDiff = this.sketchCanvas.width - this.canvas.width;
                var heightDiff = this.sketchCanvas.height - this.canvas.height;
                widthExt = Math.round(widthDiff / 2);
                heightExt = Math.round(heightDiff / 2);
            }
            this.context.drawImage(
                this.sketchCanvas,
                position.x - widthExt * scale,
                position.y - heightExt * scale,
                (this.canvas.width + 2 * widthExt) * scale,
                (this.canvas.height + 2 * heightExt) * scale,
                -widthExt,
                -heightExt,
                this.canvas.width + 2 * widthExt,
                this.canvas.height + 2 * heightExt
            );
        }
        this.context.restore();
    },

    // private
    drawDebugInfo: function(tile, count, i, tiledImage) {
        if ( !this.useCanvas ) {
            return;
        }

        var colorIndex = this.viewer.world.getIndexOfItem(tiledImage) % this.debugGridColor.length;
        var context = this.context;
        context.save();
        context.lineWidth = 2 * $.pixelDensityRatio;
        context.font = 'small-caps bold ' + (13 * $.pixelDensityRatio) + 'px arial';
        context.strokeStyle = this.debugGridColor[colorIndex];
        context.fillStyle = this.debugGridColor[colorIndex];

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
    },

    // private
    _updateImageSmoothingEnabled: function(context){
        context.msImageSmoothingEnabled = this._imageSmoothingEnabled;
        context.imageSmoothingEnabled = this._imageSmoothingEnabled;
    },

    /**
     * @private
     * @inner
     * Get the canvas size
     * @param {Boolean} sketch If set to true return the size of the sketch canvas
     * @returns {OpenSeadragon.Point} The size of the canvas
     */
    _getCanvasSize: function(sketch) {
        var canvas = this._getContext(sketch).canvas;
        return new $.Point(canvas.width, canvas.height);
    },

    /**
     * @private
     * @inner
     * Get the canvas center
     * @param {Boolean} sketch If set to true return the center point of the sketch canvas
     * @returns {OpenSeadragon.Point} The center point of the canvas
     */
    _getCanvasCenter: function() {
        return new $.Point(this.canvas.width / 2, this.canvas.height / 2);
    },

    // private
    _offsetForRotation: function(options) {
        var point = options.point ?
            options.point.times($.pixelDensityRatio) :
            this._getCanvasCenter();

        var context = this._getContext(options.useSketch);
        context.save();

        context.translate(point.x, point.y);
        if(this.viewer.viewport.flipped){
          context.rotate(Math.PI / 180 * -options.degrees);
          context.scale(-1, 1);
        } else{
          context.rotate(Math.PI / 180 * options.degrees);
        }
        context.translate(-point.x, -point.y);
    },

    // private
    _flip: function(options) {
      options = options || {};
      var point = options.point ?
        options.point.times($.pixelDensityRatio) :
        this._getCanvasCenter();
      var context = this._getContext(options.useSketch);

      context.translate(point.x, 0);
      context.scale(-1, 1);
      context.translate(-point.x, 0);
    },

    // private
    _restoreRotationChanges: function(useSketch) {
        var context = this._getContext(useSketch);
        context.restore();
    },

    // private
    _calculateCanvasSize: function() {
        var pixelDensityRatio = $.pixelDensityRatio;
        var viewportSize = this.viewport.getContainerSize();
        return {
            // canvas width and height are integers
            x: Math.round(viewportSize.x * pixelDensityRatio),
            y: Math.round(viewportSize.y * pixelDensityRatio)
        };
    },

    // private
    _calculateSketchCanvasSize: function() {
        var canvasSize = this._calculateCanvasSize();
        if (this.viewport.getRotation() === 0) {
            return canvasSize;
        }
        // If the viewport is rotated, we need a larger sketch canvas in order
        // to support edge smoothing.
        var sketchCanvasSize = Math.ceil(Math.sqrt(
            canvasSize.x * canvasSize.x +
            canvasSize.y * canvasSize.y));
        return {
            x: sketchCanvasSize,
            y: sketchCanvasSize
        };
    },


});



/**
 * @private
 * @inner
 * Defines the value for subpixel rounding to fallback to in case of missing or
 * invalid value.
 */
var DEFAULT_SUBPIXEL_ROUNDING_RULE = $.SUBPIXEL_ROUNDING_OCCURRENCES.NEVER;

/**
 * @private
 * @inner
 * Checks whether the input value is an invalid subpixel rounding enum value.
 *
 * @param {SUBPIXEL_ROUNDING_OCCURRENCES} value - The subpixel rounding enum value to check.
 * @returns {Boolean} Returns true if the input value is none of the expected
 * {@link SUBPIXEL_ROUNDING_OCCURRENCES.ALWAYS}, {@link SUBPIXEL_ROUNDING_OCCURRENCES.ONLY_AT_REST} or {@link SUBPIXEL_ROUNDING_OCCURRENCES.NEVER} value.
 */
function isSubPixelRoundingRuleUnknown(value) {
    return value !== $.SUBPIXEL_ROUNDING_OCCURRENCES.ALWAYS &&
        value !== $.SUBPIXEL_ROUNDING_OCCURRENCES.ONLY_AT_REST &&
        value !== $.SUBPIXEL_ROUNDING_OCCURRENCES.NEVER;
}

/**
 * @private
 * @inner
 * Ensures the returned value is always a valid subpixel rounding enum value,
 * defaulting to {@link SUBPIXEL_ROUNDING_OCCURRENCES.NEVER} if input is missing or invalid.
 *
 * @param {SUBPIXEL_ROUNDING_OCCURRENCES} value - The subpixel rounding enum value to normalize.
 * @returns {SUBPIXEL_ROUNDING_OCCURRENCES} Returns a valid subpixel rounding enum value.
 */
function normalizeSubPixelRoundingRule(value) {
    if (isSubPixelRoundingRuleUnknown(value)) {
        return DEFAULT_SUBPIXEL_ROUNDING_RULE;
    }
    return value;
}

/**
 * @private
 * @inner
 * Ensures the returned value is always a valid subpixel rounding enum value,
 * defaulting to 'NEVER' if input is missing or invalid.
 *
 * @param {Object} subPixelRoundingRules - A subpixel rounding enum values dictionary [{@link BROWSERS}] --> {@link SUBPIXEL_ROUNDING_OCCURRENCES}.
 * @returns {SUBPIXEL_ROUNDING_OCCURRENCES} Returns the determined subpixel rounding enum value for the
 * current browser.
 */
function determineSubPixelRoundingRule(subPixelRoundingRules) {
    if (typeof subPixelRoundingRules === 'number') {
        return normalizeSubPixelRoundingRule(subPixelRoundingRules);
    }

    if (!subPixelRoundingRules || !$.Browser) {
        return DEFAULT_SUBPIXEL_ROUNDING_RULE;
    }

    var subPixelRoundingRule = subPixelRoundingRules[$.Browser.vendor];

    if (isSubPixelRoundingRuleUnknown(subPixelRoundingRule)) {
        subPixelRoundingRule = subPixelRoundingRules['*'];
    }

    return normalizeSubPixelRoundingRule(subPixelRoundingRule);
}

}( OpenSeadragon ));
