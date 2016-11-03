/*
 * OpenSeadragon - TiledImage
 *
 * Copyright (C) 2009 CodePlex Foundation
 * Copyright (C) 2010-2013 OpenSeadragon contributors
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
 * You shouldn't have to create a TiledImage directly; use {@link OpenSeadragon.Viewer#open}
 * or {@link OpenSeadragon.Viewer#addTiledImage} instead.
 * @class TiledImage
 * @memberof OpenSeadragon
 * @extends OpenSeadragon.EventSource
 * @classdesc Handles rendering of tiles for an {@link OpenSeadragon.Viewer}.
 * A new instance is created for each TileSource opened.
 * @param {Object} options - Configuration for this TiledImage.
 * @param {OpenSeadragon.TileSource} options.source - The TileSource that defines this TiledImage.
 * @param {OpenSeadragon.Viewer} options.viewer - The Viewer that owns this TiledImage.
 * @param {OpenSeadragon.TileCache} options.tileCache - The TileCache for this TiledImage to use.
 * @param {OpenSeadragon.Drawer} options.drawer - The Drawer for this TiledImage to draw onto.
 * @param {OpenSeadragon.ImageLoader} options.imageLoader - The ImageLoader for this TiledImage to use.
 * @param {Number} [options.x=0] - Left position, in viewport coordinates.
 * @param {Number} [options.y=0] - Top position, in viewport coordinates.
 * @param {Number} [options.width=1] - Width, in viewport coordinates.
 * @param {Number} [options.height] - Height, in viewport coordinates.
 * @param {OpenSeadragon.Rect} [options.fitBounds] The bounds in viewport coordinates
 * to fit the image into. If specified, x, y, width and height get ignored.
 * @param {OpenSeadragon.Placement} [options.fitBoundsPlacement=OpenSeadragon.Placement.CENTER]
 * How to anchor the image in the bounds if options.fitBounds is set.
 * @param {OpenSeadragon.Rect} [options.clip] - An area, in image pixels, to clip to
 * (portions of the image outside of this area will not be visible). Only works on
 * browsers that support the HTML5 canvas.
 * @param {Number} [options.springStiffness] - See {@link OpenSeadragon.Options}.
 * @param {Boolean} [options.animationTime] - See {@link OpenSeadragon.Options}.
 * @param {Number} [options.minZoomImageRatio] - See {@link OpenSeadragon.Options}.
 * @param {Boolean} [options.wrapHorizontal] - See {@link OpenSeadragon.Options}.
 * @param {Boolean} [options.wrapVertical] - See {@link OpenSeadragon.Options}.
 * @param {Boolean} [options.immediateRender] - See {@link OpenSeadragon.Options}.
 * @param {Number} [options.blendTime] - See {@link OpenSeadragon.Options}.
 * @param {Boolean} [options.alwaysBlend] - See {@link OpenSeadragon.Options}.
 * @param {Number} [options.minPixelRatio] - See {@link OpenSeadragon.Options}.
 * @param {Number} [options.smoothTileEdgesMinZoom] - See {@link OpenSeadragon.Options}.
 * @param {Boolean} [options.iOSDevice] - See {@link OpenSeadragon.Options}.
 * @param {Number} [options.opacity=1] - Opacity the tiled image should be drawn at.
 * @param {Boolean} [options.preload=false] - If true, tiles in image load without drawing. Defaults to false, so tiles are loaded and drawn.
 * @param {String} [options.compositeOperation] - How the image is composited onto other images; see compositeOperation in {@link OpenSeadragon.Options} for possible values.
 * @param {Boolean} [options.debugMode] - See {@link OpenSeadragon.Options}.
 * @param {String|CanvasGradient|CanvasPattern|Function} [options.placeholderFillStyle] - See {@link OpenSeadragon.Options}.
 * @param {String|Boolean} [options.crossOriginPolicy] - See {@link OpenSeadragon.Options}.
 */
$.TiledImage = function( options ) {
    var _this = this;

    $.console.assert( options.tileCache, "[TiledImage] options.tileCache is required" );
    $.console.assert( options.drawer, "[TiledImage] options.drawer is required" );
    $.console.assert( options.viewer, "[TiledImage] options.viewer is required" );
    $.console.assert( options.imageLoader, "[TiledImage] options.imageLoader is required" );
    $.console.assert( options.source, "[TiledImage] options.source is required" );
    $.console.assert(!options.clip || options.clip instanceof $.Rect,
        "[TiledImage] options.clip must be an OpenSeadragon.Rect if present");

    $.EventSource.call( this );

    this._tileCache = options.tileCache;
    delete options.tileCache;

    this._drawer = options.drawer;
    delete options.drawer;

    this._imageLoader = options.imageLoader;
    delete options.imageLoader;

    if (options.clip instanceof $.Rect) {
        this._clip = options.clip.clone();
    }

    delete options.clip;

    var x = options.x || 0;
    delete options.x;
    var y = options.y || 0;
    delete options.y;

    // Ratio of zoomable image height to width.
    this.normHeight = options.source.dimensions.y / options.source.dimensions.x;
    this.contentAspectX = options.source.dimensions.x / options.source.dimensions.y;

    var scale = 1;
    if ( options.width ) {
        scale = options.width;
        delete options.width;

        if ( options.height ) {
            $.console.error( "specifying both width and height to a tiledImage is not supported" );
            delete options.height;
        }
    } else if ( options.height ) {
        scale = options.height / this.normHeight;
        delete options.height;
    }

    var fitBounds = options.fitBounds;
    delete options.fitBounds;
    var fitBoundsPlacement = options.fitBoundsPlacement || OpenSeadragon.Placement.CENTER;
    delete options.fitBoundsPlacement;

    this._degrees = $.positiveModulo(options.degrees || 0, 360);
    delete options.degrees;

    $.extend( true, this, {

        //internal state properties
        viewer:         null,
        tilesMatrix:    {},    // A '3d' dictionary [level][x][y] --> Tile.
        coverage:       {},    // A '3d' dictionary [level][x][y] --> Boolean.
        lastDrawn:      [],    // An unordered list of Tiles drawn last frame.
        lastResetTime:  0,     // Last time for which the tiledImage was reset.
        _midDraw:       false, // Is the tiledImage currently updating the viewport?
        _needsDraw:     true,  // Does the tiledImage need to update the viewport again?
        _hasOpaqueTile: false,  // Do we have even one fully opaque tile?
        //configurable settings
        springStiffness:        $.DEFAULT_SETTINGS.springStiffness,
        animationTime:          $.DEFAULT_SETTINGS.animationTime,
        minZoomImageRatio:      $.DEFAULT_SETTINGS.minZoomImageRatio,
        wrapHorizontal:         $.DEFAULT_SETTINGS.wrapHorizontal,
        wrapVertical:           $.DEFAULT_SETTINGS.wrapVertical,
        immediateRender:        $.DEFAULT_SETTINGS.immediateRender,
        blendTime:              $.DEFAULT_SETTINGS.blendTime,
        alwaysBlend:            $.DEFAULT_SETTINGS.alwaysBlend,
        minPixelRatio:          $.DEFAULT_SETTINGS.minPixelRatio,
        smoothTileEdgesMinZoom: $.DEFAULT_SETTINGS.smoothTileEdgesMinZoom,
        iOSDevice:              $.DEFAULT_SETTINGS.iOSDevice,
        debugMode:              $.DEFAULT_SETTINGS.debugMode,
        crossOriginPolicy:      $.DEFAULT_SETTINGS.crossOriginPolicy,
        placeholderFillStyle:   $.DEFAULT_SETTINGS.placeholderFillStyle,
        opacity:                $.DEFAULT_SETTINGS.opacity,
        preload:                $.DEFAULT_SETTINGS.preload,
        compositeOperation:     $.DEFAULT_SETTINGS.compositeOperation
    }, options );

    this._fullyLoaded = false;

    this._xSpring = new $.Spring({
        initial: x,
        springStiffness: this.springStiffness,
        animationTime: this.animationTime
    });

    this._ySpring = new $.Spring({
        initial: y,
        springStiffness: this.springStiffness,
        animationTime: this.animationTime
    });

    this._scaleSpring = new $.Spring({
        initial: scale,
        springStiffness: this.springStiffness,
        animationTime: this.animationTime
    });

    this._updateForScale();

    if (fitBounds) {
        this.fitBounds(fitBounds, fitBoundsPlacement, true);
    }

    // We need a callback to give image manipulation a chance to happen
    this._drawingHandler = function(args) {
      /**
       * This event is fired just before the tile is drawn giving the application a chance to alter the image.
       *
       * NOTE: This event is only fired when the drawer is using a &lt;canvas&gt;.
       *
       * @event tile-drawing
       * @memberof OpenSeadragon.Viewer
       * @type {object}
       * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
       * @property {OpenSeadragon.Tile} tile - The Tile being drawn.
       * @property {OpenSeadragon.TiledImage} tiledImage - Which TiledImage is being drawn.
       * @property {OpenSeadragon.Tile} context - The HTML canvas context being drawn into.
       * @property {OpenSeadragon.Tile} rendered - The HTML canvas context containing the tile imagery.
       * @property {?Object} userData - Arbitrary subscriber-defined object.
       */
        _this.viewer.raiseEvent('tile-drawing', $.extend({
            tiledImage: _this
        }, args));
    };
};

$.extend($.TiledImage.prototype, $.EventSource.prototype, /** @lends OpenSeadragon.TiledImage.prototype */{
    /**
     * @returns {Boolean} Whether the TiledImage needs to be drawn.
     */
    needsDraw: function() {
        return this._needsDraw;
    },

    /**
     * @returns {Boolean} Whether all tiles necessary for this TiledImage to draw at the current view have been loaded.
     */
    getFullyLoaded: function() {
        return this._fullyLoaded;
    },

    // private
    _setFullyLoaded: function(flag) {
        if (flag === this._fullyLoaded) {
            return;
        }

        this._fullyLoaded = flag;

        /**
         * Fired when the TiledImage's "fully loaded" flag (whether all tiles necessary for this TiledImage
         * to draw at the current view have been loaded) changes.
         *
         * @event fully-loaded-change
         * @memberof OpenSeadragon.TiledImage
         * @type {object}
         * @property {Boolean} fullyLoaded - The new "fully loaded" value.
         * @property {OpenSeadragon.TiledImage} eventSource - A reference to the TiledImage which raised the event.
         * @property {?Object} userData - Arbitrary subscriber-defined object.
         */
        this.raiseEvent('fully-loaded-change', {
            fullyLoaded: this._fullyLoaded
        });
    },

    /**
     * Clears all tiles and triggers an update on the next call to
     * {@link OpenSeadragon.TiledImage#update}.
     */
    reset: function() {
        this._tileCache.clearTilesFor(this);
        this.lastResetTime = $.now();
        this._needsDraw = true;
    },

    /**
     * Updates the TiledImage's bounds, animating if needed.
     * @returns {Boolean} Whether the TiledImage animated.
     */
    update: function() {
        var oldX = this._xSpring.current.value;
        var oldY = this._ySpring.current.value;
        var oldScale = this._scaleSpring.current.value;

        this._xSpring.update();
        this._ySpring.update();
        this._scaleSpring.update();

        if (this._xSpring.current.value !== oldX || this._ySpring.current.value !== oldY ||
                this._scaleSpring.current.value !== oldScale) {
            this._updateForScale();
            this._needsDraw = true;
            return true;
        }

        return false;
    },

    /**
     * Draws the TiledImage to its Drawer.
     */
    draw: function() {
        if (this.opacity !== 0 && !this.preload) {
            this._midDraw = true;
            this._updateViewport();
            this._midDraw = false;
        }
    },

    /**
     * Destroy the TiledImage (unload current loaded tiles).
     */
    destroy: function() {
        this.reset();
    },

    /**
     * Get this TiledImage's bounds in viewport coordinates.
     * @param {Boolean} [current=false] - Pass true for the current location;
     * false for target location.
     * @returns {OpenSeadragon.Rect} This TiledImage's bounds in viewport coordinates.
     */
    getBounds: function(current) {
        return this.getBoundsNoRotate(current)
            .rotate(this._degrees, this._getRotationPoint(current));
    },

    /**
     * Get this TiledImage's bounds in viewport coordinates without taking
     * rotation into account.
     * @param {Boolean} [current=false] - Pass true for the current location;
     * false for target location.
     * @returns {OpenSeadragon.Rect} This TiledImage's bounds in viewport coordinates.
     */
    getBoundsNoRotate: function(current) {
        return current ?
            new $.Rect(
                this._xSpring.current.value,
                this._ySpring.current.value,
                this._worldWidthCurrent,
                this._worldHeightCurrent) :
            new $.Rect(
                this._xSpring.target.value,
                this._ySpring.target.value,
                this._worldWidthTarget,
                this._worldHeightTarget);
    },

    // deprecated
    getWorldBounds: function() {
        $.console.error('[TiledImage.getWorldBounds] is deprecated; use TiledImage.getBounds instead');
        return this.getBounds();
    },

    /**
     * Get the bounds of the displayed part of the tiled image.
     * @param {Boolean} [current=false] Pass true for the current location,
     * false for the target location.
     * @returns {$.Rect} The clipped bounds in viewport coordinates.
     */
    getClippedBounds: function(current) {
        var bounds = this.getBoundsNoRotate(current);
        if (this._clip) {
            var worldWidth = current ?
                this._worldWidthCurrent : this._worldWidthTarget;
            var ratio = worldWidth / this.source.dimensions.x;
            var clip = this._clip.times(ratio);
            bounds = new $.Rect(
                bounds.x + clip.x,
                bounds.y + clip.y,
                clip.width,
                clip.height);
        }
        return bounds.rotate(this._degrees, this._getRotationPoint(current));
    },

    /**
     * @returns {OpenSeadragon.Point} This TiledImage's content size, in original pixels.
     */
    getContentSize: function() {
        return new $.Point(this.source.dimensions.x, this.source.dimensions.y);
    },

    // private
    _viewportToImageDelta: function( viewerX, viewerY, current ) {
        var scale = (current ? this._scaleSpring.current.value : this._scaleSpring.target.value);
        return new $.Point(viewerX * (this.source.dimensions.x / scale),
            viewerY * ((this.source.dimensions.y * this.contentAspectX) / scale));
    },

    /**
     * Translates from OpenSeadragon viewer coordinate system to image coordinate system.
     * This method can be called either by passing X,Y coordinates or an {@link OpenSeadragon.Point}.
     * @param {Number|OpenSeadragon.Point} viewerX - The X coordinate or point in viewport coordinate system.
     * @param {Number} [viewerY] - The Y coordinate in viewport coordinate system.
     * @param {Boolean} [current=false] - Pass true to use the current location; false for target location.
     * @return {OpenSeadragon.Point} A point representing the coordinates in the image.
     */
    viewportToImageCoordinates: function(viewerX, viewerY, current) {
        var point;
        if (viewerX instanceof $.Point) {
            //they passed a point instead of individual components
            current = viewerY;
            point = viewerX;
        } else {
            point = new $.Point(viewerX, viewerY);
        }

        point = point.rotate(-this._degrees, this._getRotationPoint(current));
        return current ?
            this._viewportToImageDelta(
                point.x - this._xSpring.current.value,
                point.y - this._ySpring.current.value) :
            this._viewportToImageDelta(
                point.x - this._xSpring.target.value,
                point.y - this._ySpring.target.value);
    },

    // private
    _imageToViewportDelta: function( imageX, imageY, current ) {
        var scale = (current ? this._scaleSpring.current.value : this._scaleSpring.target.value);
        return new $.Point((imageX / this.source.dimensions.x) * scale,
            (imageY / this.source.dimensions.y / this.contentAspectX) * scale);
    },

    /**
     * Translates from image coordinate system to OpenSeadragon viewer coordinate system
     * This method can be called either by passing X,Y coordinates or an {@link OpenSeadragon.Point}.
     * @param {Number|OpenSeadragon.Point} imageX - The X coordinate or point in image coordinate system.
     * @param {Number} [imageY] - The Y coordinate in image coordinate system.
     * @param {Boolean} [current=false] - Pass true to use the current location; false for target location.
     * @return {OpenSeadragon.Point} A point representing the coordinates in the viewport.
     */
    imageToViewportCoordinates: function(imageX, imageY, current) {
        if (imageX instanceof $.Point) {
            //they passed a point instead of individual components
            current = imageY;
            imageY = imageX.y;
            imageX = imageX.x;
        }

        var point = this._imageToViewportDelta(imageX, imageY);
        if (current) {
            point.x += this._xSpring.current.value;
            point.y += this._ySpring.current.value;
        } else {
            point.x += this._xSpring.target.value;
            point.y += this._ySpring.target.value;
        }

        return point.rotate(this._degrees, this._getRotationPoint(current));
    },

    /**
     * Translates from a rectangle which describes a portion of the image in
     * pixel coordinates to OpenSeadragon viewport rectangle coordinates.
     * This method can be called either by passing X,Y,width,height or an {@link OpenSeadragon.Rect}.
     * @param {Number|OpenSeadragon.Rect} imageX - The left coordinate or rectangle in image coordinate system.
     * @param {Number} [imageY] - The top coordinate in image coordinate system.
     * @param {Number} [pixelWidth] - The width in pixel of the rectangle.
     * @param {Number} [pixelHeight] - The height in pixel of the rectangle.
     * @param {Boolean} [current=false] - Pass true to use the current location; false for target location.
     * @return {OpenSeadragon.Rect} A rect representing the coordinates in the viewport.
     */
    imageToViewportRectangle: function( imageX, imageY, pixelWidth, pixelHeight, current ) {
        var rect = imageX;
        if (rect instanceof $.Rect) {
            //they passed a rect instead of individual components
            current = imageY;
        } else {
            rect = new $.Rect(imageX, imageY, pixelWidth, pixelHeight);
        }

        var coordA = this.imageToViewportCoordinates(rect.getTopLeft(), current);
        var coordB = this._imageToViewportDelta(rect.width, rect.height, current);

        return new $.Rect(
            coordA.x,
            coordA.y,
            coordB.x,
            coordB.y,
            rect.degrees + this._degrees
        );
    },

    /**
     * Translates from a rectangle which describes a portion of
     * the viewport in point coordinates to image rectangle coordinates.
     * This method can be called either by passing X,Y,width,height or an {@link OpenSeadragon.Rect}.
     * @param {Number|OpenSeadragon.Rect} viewerX - The left coordinate or rectangle in viewport coordinate system.
     * @param {Number} [viewerY] - The top coordinate in viewport coordinate system.
     * @param {Number} [pointWidth] - The width in viewport coordinate system.
     * @param {Number} [pointHeight] - The height in viewport coordinate system.
     * @param {Boolean} [current=false] - Pass true to use the current location; false for target location.
     * @return {OpenSeadragon.Rect} A rect representing the coordinates in the image.
     */
    viewportToImageRectangle: function( viewerX, viewerY, pointWidth, pointHeight, current ) {
        var rect = viewerX;
        if (viewerX instanceof $.Rect) {
            //they passed a rect instead of individual components
            current = viewerY;
        } else {
            rect = new $.Rect(viewerX, viewerY, pointWidth, pointHeight);
        }

        var coordA = this.viewportToImageCoordinates(rect.getTopLeft(), current);
        var coordB = this._viewportToImageDelta(rect.width, rect.height, current);

        return new $.Rect(
            coordA.x,
            coordA.y,
            coordB.x,
            coordB.y,
            rect.degrees - this._degrees
        );
    },

    /**
     * Convert pixel coordinates relative to the viewer element to image
     * coordinates.
     * @param {OpenSeadragon.Point} pixel
     * @returns {OpenSeadragon.Point}
     */
    viewerElementToImageCoordinates: function( pixel ) {
        var point = this.viewport.pointFromPixel( pixel, true );
        return this.viewportToImageCoordinates( point );
    },

    /**
     * Convert pixel coordinates relative to the image to
     * viewer element coordinates.
     * @param {OpenSeadragon.Point} pixel
     * @returns {OpenSeadragon.Point}
     */
    imageToViewerElementCoordinates: function( pixel ) {
        var point = this.imageToViewportCoordinates( pixel );
        return this.viewport.pixelFromPoint( point, true );
    },

    /**
     * Convert pixel coordinates relative to the window to image coordinates.
     * @param {OpenSeadragon.Point} pixel
     * @returns {OpenSeadragon.Point}
     */
    windowToImageCoordinates: function( pixel ) {
        var viewerCoordinates = pixel.minus(
                OpenSeadragon.getElementPosition( this.viewer.element ));
        return this.viewerElementToImageCoordinates( viewerCoordinates );
    },

    /**
     * Convert image coordinates to pixel coordinates relative to the window.
     * @param {OpenSeadragon.Point} pixel
     * @returns {OpenSeadragon.Point}
     */
    imageToWindowCoordinates: function( pixel ) {
        var viewerCoordinates = this.imageToViewerElementCoordinates( pixel );
        return viewerCoordinates.plus(
                OpenSeadragon.getElementPosition( this.viewer.element ));
    },

    // private
    // Convert rectangle in viewport coordinates to this tiled image point
    // coordinates (x in [0, 1] and y in [0, aspectRatio])
    _viewportToTiledImageRectangle: function(rect) {
        var scale = this._scaleSpring.current.value;
        rect = rect.rotate(-this.getRotation(), this._getRotationPoint(true));
        return new $.Rect(
            (rect.x - this._xSpring.current.value) / scale,
            (rect.y - this._ySpring.current.value) / scale,
            rect.width / scale,
            rect.height / scale,
            rect.degrees);
    },

    /**
     * Convert a viewport zoom to an image zoom.
     * Image zoom: ratio of the original image size to displayed image size.
     * 1 means original image size, 0.5 half size...
     * Viewport zoom: ratio of the displayed image's width to viewport's width.
     * 1 means identical width, 2 means image's width is twice the viewport's width...
     * @function
     * @param {Number} viewportZoom The viewport zoom
     * @returns {Number} imageZoom The image zoom
     */
    viewportToImageZoom: function( viewportZoom ) {
        var ratio = this._scaleSpring.current.value *
                this.viewport._containerInnerSize.x / this.source.dimensions.x;
        return ratio * viewportZoom ;
    },

    /**
     * Convert an image zoom to a viewport zoom.
     * Image zoom: ratio of the original image size to displayed image size.
     * 1 means original image size, 0.5 half size...
     * Viewport zoom: ratio of the displayed image's width to viewport's width.
     * 1 means identical width, 2 means image's width is twice the viewport's width...
     * Note: not accurate with multi-image.
     * @function
     * @param {Number} imageZoom The image zoom
     * @returns {Number} viewportZoom The viewport zoom
     */
    imageToViewportZoom: function( imageZoom ) {
        var ratio = this._scaleSpring.current.value *
                this.viewport._containerInnerSize.x / this.source.dimensions.x;
        return imageZoom / ratio;
    },

    /**
     * Sets the TiledImage's position in the world.
     * @param {OpenSeadragon.Point} position - The new position, in viewport coordinates.
     * @param {Boolean} [immediately=false] - Whether to animate to the new position or snap immediately.
     * @fires OpenSeadragon.TiledImage.event:bounds-change
     */
    setPosition: function(position, immediately) {
        var sameTarget = (this._xSpring.target.value === position.x &&
            this._ySpring.target.value === position.y);

        if (immediately) {
            if (sameTarget && this._xSpring.current.value === position.x &&
                    this._ySpring.current.value === position.y) {
                return;
            }

            this._xSpring.resetTo(position.x);
            this._ySpring.resetTo(position.y);
            this._needsDraw = true;
        } else {
            if (sameTarget) {
                return;
            }

            this._xSpring.springTo(position.x);
            this._ySpring.springTo(position.y);
            this._needsDraw = true;
        }

        if (!sameTarget) {
            this._raiseBoundsChange();
        }
    },

    /**
     * Sets the TiledImage's width in the world, adjusting the height to match based on aspect ratio.
     * @param {Number} width - The new width, in viewport coordinates.
     * @param {Boolean} [immediately=false] - Whether to animate to the new size or snap immediately.
     * @fires OpenSeadragon.TiledImage.event:bounds-change
     */
    setWidth: function(width, immediately) {
        this._setScale(width, immediately);
    },

    /**
     * Sets the TiledImage's height in the world, adjusting the width to match based on aspect ratio.
     * @param {Number} height - The new height, in viewport coordinates.
     * @param {Boolean} [immediately=false] - Whether to animate to the new size or snap immediately.
     * @fires OpenSeadragon.TiledImage.event:bounds-change
     */
    setHeight: function(height, immediately) {
        this._setScale(height / this.normHeight, immediately);
    },

    /**
     * Positions and scales the TiledImage to fit in the specified bounds.
     * Note: this method fires OpenSeadragon.TiledImage.event:bounds-change
     * twice
     * @param {OpenSeadragon.Rect} bounds The bounds to fit the image into.
     * @param {OpenSeadragon.Placement} [anchor=OpenSeadragon.Placement.CENTER]
     * How to anchor the image in the bounds.
     * @param {Boolean} [immediately=false] Whether to animate to the new size
     * or snap immediately.
     * @fires OpenSeadragon.TiledImage.event:bounds-change
     */
    fitBounds: function(bounds, anchor, immediately) {
        anchor = anchor || $.Placement.CENTER;
        var anchorProperties = $.Placement.properties[anchor];
        var aspectRatio = this.contentAspectX;
        var xOffset = 0;
        var yOffset = 0;
        var displayedWidthRatio = 1;
        var displayedHeightRatio = 1;
        if (this._clip) {
            aspectRatio = this._clip.getAspectRatio();
            displayedWidthRatio = this._clip.width / this.source.dimensions.x;
            displayedHeightRatio = this._clip.height / this.source.dimensions.y;
            if (bounds.getAspectRatio() > aspectRatio) {
                xOffset = this._clip.x / this._clip.height * bounds.height;
                yOffset = this._clip.y / this._clip.height * bounds.height;
            } else {
                xOffset = this._clip.x / this._clip.width * bounds.width;
                yOffset = this._clip.y / this._clip.width * bounds.width;
            }
        }

        if (bounds.getAspectRatio() > aspectRatio) {
            // We will have margins on the X axis
            var height = bounds.height / displayedHeightRatio;
            var marginLeft = 0;
            if (anchorProperties.isHorizontallyCentered) {
                marginLeft = (bounds.width - bounds.height * aspectRatio) / 2;
            } else if (anchorProperties.isRight) {
                marginLeft = bounds.width - bounds.height * aspectRatio;
            }
            this.setPosition(
                new $.Point(bounds.x - xOffset + marginLeft, bounds.y - yOffset),
                immediately);
            this.setHeight(height, immediately);
        } else {
            // We will have margins on the Y axis
            var width = bounds.width / displayedWidthRatio;
            var marginTop = 0;
            if (anchorProperties.isVerticallyCentered) {
                marginTop = (bounds.height - bounds.width / aspectRatio) / 2;
            } else if (anchorProperties.isBottom) {
                marginTop = bounds.height - bounds.width / aspectRatio;
            }
            this.setPosition(
                new $.Point(bounds.x - xOffset, bounds.y - yOffset + marginTop),
                immediately);
            this.setWidth(width, immediately);
        }
    },

    /**
     * @returns {OpenSeadragon.Rect|null} The TiledImage's current clip rectangle,
     * in image pixels, or null if none.
     */
    getClip: function() {
        if (this._clip) {
            return this._clip.clone();
        }

        return null;
    },

    /**
     * @param {OpenSeadragon.Rect|null} newClip - An area, in image pixels, to clip to
     * (portions of the image outside of this area will not be visible). Only works on
     * browsers that support the HTML5 canvas.
     * @fires OpenSeadragon.TiledImage.event:clip-change
     */
    setClip: function(newClip) {
        $.console.assert(!newClip || newClip instanceof $.Rect,
            "[TiledImage.setClip] newClip must be an OpenSeadragon.Rect or null");

        if (newClip instanceof $.Rect) {
            this._clip = newClip.clone();
        } else {
            this._clip = null;
        }

        this._needsDraw = true;
        /**
         * Raised when the TiledImage's clip is changed.
         * @event clip-change
         * @memberOf OpenSeadragon.TiledImage
         * @type {object}
         * @property {OpenSeadragon.TiledImage} eventSource - A reference to the
         * TiledImage which raised the event.
         * @property {?Object} userData - Arbitrary subscriber-defined object.
         */
        this.raiseEvent('clip-change');
    },

    /**
     * @returns {Number} The TiledImage's current opacity.
     */
    getOpacity: function() {
        return this.opacity;
    },

    /**
     * @param {Number} opacity Opacity the tiled image should be drawn at.
     */
    setOpacity: function(opacity) {
        this.opacity = opacity;
        this._needsDraw = true;
    },

    /**
     * @returns {Boolean} whether the tiledImage is set to load tiles without drawing them.
     */
    getPreload: function() {
        return this.preload;
    },

    /**
     * Set true to load without drawing. Set false for default loading and drawing.
     * @param {Boolean} whether to load tiles without drawing in this tiledImage.
     */
    setPreload: function(preload) {
        this.preload = (true == preload);
        this._needsDraw = true;
    },

    /**
     * Get the current rotation of this tiled image in degrees.
     * @returns {Number} the current rotation of this tiled image in degrees.
     */
    getRotation: function() {
        return this._degrees;
    },

    /**
     * Set the current rotation of this tiled image in degrees.
     * @param {Number} degrees the rotation in degrees.
     * @fires OpenSeadragon.TiledImage.event:bounds-change
     */
    setRotation: function(degrees) {
        degrees = $.positiveModulo(degrees, 360);
        if (this._degrees === degrees) {
            return;
        }
        this._degrees = degrees;
        this._needsDraw = true;
        this._raiseBoundsChange();
    },

    /**
     * @private
     * Get the point around which this tiled image is rotated
     * @param {Boolean} current True for current rotation point, false for target.
     * @returns {OpenSeadragon.Point}
     */
    _getRotationPoint: function(current) {
        return this.getBoundsNoRotate(current).getCenter();
    },

    /**
     * @returns {String} The TiledImage's current compositeOperation.
     */
    getCompositeOperation: function() {
        return this.compositeOperation;
    },

    /**
     * @param {String} compositeOperation the tiled image should be drawn with this globalCompositeOperation.
     */
    setCompositeOperation: function(compositeOperation) {
        this.compositeOperation = compositeOperation;
        this._needsDraw = true;
    },

    // private
    _setScale: function(scale, immediately) {
        var sameTarget = (this._scaleSpring.target.value === scale);
        if (immediately) {
            if (sameTarget && this._scaleSpring.current.value === scale) {
                return;
            }

            this._scaleSpring.resetTo(scale);
            this._updateForScale();
            this._needsDraw = true;
        } else {
            if (sameTarget) {
                return;
            }

            this._scaleSpring.springTo(scale);
            this._updateForScale();
            this._needsDraw = true;
        }

        if (!sameTarget) {
            this._raiseBoundsChange();
        }
    },

    // private
    _updateForScale: function() {
        this._worldWidthTarget = this._scaleSpring.target.value;
        this._worldHeightTarget = this.normHeight * this._scaleSpring.target.value;
        this._worldWidthCurrent = this._scaleSpring.current.value;
        this._worldHeightCurrent = this.normHeight * this._scaleSpring.current.value;
    },

    // private
    _raiseBoundsChange: function() {
        /**
         * Raised when the TiledImage's bounds are changed.
         * Note that this event is triggered only when the animation target is changed;
         * not for every frame of animation.
         * @event bounds-change
         * @memberOf OpenSeadragon.TiledImage
         * @type {object}
         * @property {OpenSeadragon.TiledImage} eventSource - A reference to the
         * TiledImage which raised the event.
         * @property {?Object} userData - Arbitrary subscriber-defined object.
         */
        this.raiseEvent('bounds-change');
    },

    // private
    _isBottomItem: function() {
        return this.viewer.world.getItemAt(0) === this;
    },

    // private
    _getLevelsInterval: function() {
        var lowestLevel = Math.max(
            this.source.minLevel,
            Math.floor(Math.log(this.minZoomImageRatio) / Math.log(2))
        );
        var currentZeroRatio = this.viewport.deltaPixelsFromPointsNoRotate(
            this.source.getPixelRatio(0), true).x *
            this._scaleSpring.current.value;
        var highestLevel = Math.min(
            Math.abs(this.source.maxLevel),
            Math.abs(Math.floor(
                Math.log(currentZeroRatio / this.minPixelRatio) / Math.log(2)
            ))
        );

        // Calculations for the interval of levels to draw
        // can return invalid intervals; fix that here if necessary
        lowestLevel = Math.min(lowestLevel, highestLevel);
        return {
            lowestLevel: lowestLevel,
            highestLevel: highestLevel
        };
    },

    // private
    _updateViewport: function() {
        this._needsDraw = false;

        // Reset tile's internal drawn state
        while (this.lastDrawn.length > 0) {
            var tile = this.lastDrawn.pop();
            tile.beingDrawn = false;
        }

        var viewport = this.viewport;
        var drawArea = this._viewportToTiledImageRectangle(
            viewport.getBoundsWithMargins(true));

        if (!this.wrapHorizontal && !this.wrapVertical) {
            var tiledImageBounds = this._viewportToTiledImageRectangle(
                this.getClippedBounds(true));
            drawArea = drawArea.intersection(tiledImageBounds);
            if (drawArea === null) {
                return;
            }
        }

        var levelsInterval = this._getLevelsInterval();
        var lowestLevel = levelsInterval.lowestLevel;
        var highestLevel = levelsInterval.highestLevel;
        var bestTile = null;
        var haveDrawn = false;
        var currentTime = $.now();

        // Update any level that will be drawn
        for (var level = highestLevel; level >= lowestLevel; level--) {
            var drawLevel = false;

            //Avoid calculations for draw if we have already drawn this
            var currentRenderPixelRatio = viewport.deltaPixelsFromPointsNoRotate(
                this.source.getPixelRatio(level),
                true
            ).x * this._scaleSpring.current.value;

            if (level === lowestLevel ||
                (!haveDrawn && currentRenderPixelRatio >= this.minPixelRatio)) {
                drawLevel = true;
                haveDrawn = true;
            } else if (!haveDrawn) {
                continue;
            }

            //Perform calculations for draw if we haven't drawn this
            var targetRenderPixelRatio = viewport.deltaPixelsFromPointsNoRotate(
                this.source.getPixelRatio(level),
                false
            ).x * this._scaleSpring.current.value;

            var targetZeroRatio = viewport.deltaPixelsFromPointsNoRotate(
                this.source.getPixelRatio(
                    Math.max(
                        this.source.getClosestLevel(viewport.containerSize) - 1,
                        0
                    )
                ),
                false
            ).x * this._scaleSpring.current.value;

            var optimalRatio = this.immediateRender ? 1 : targetZeroRatio;
            var levelOpacity = Math.min(1, (currentRenderPixelRatio - 0.5) / 0.5);
            var levelVisibility = optimalRatio / Math.abs(
                optimalRatio - targetRenderPixelRatio
            );

            // Update the level and keep track of 'best' tile to load
            bestTile = updateLevel(
                this,
                haveDrawn,
                drawLevel,
                level,
                levelOpacity,
                levelVisibility,
                drawArea,
                currentTime,
                bestTile
            );

            // Stop the loop if lower-res tiles would all be covered by
            // already drawn tiles
            if (providesCoverage(this.coverage, level)) {
                break;
            }
        }

        // Perform the actual drawing
        drawTiles(this, this.lastDrawn);

        // Load the new 'best' tile
        if (bestTile && !bestTile.context2D) {
            loadTile(this, bestTile, currentTime);
            this._needsDraw = true;
            this._setFullyLoaded(false);
        } else {
            this._setFullyLoaded(true);
        }
    }
});

function updateLevel(tiledImage, haveDrawn, drawLevel, level, levelOpacity,
    levelVisibility, drawArea, currentTime, best) {

    var topLeftBound = drawArea.getBoundingBox().getTopLeft();
    var bottomRightBound = drawArea.getBoundingBox().getBottomRight();

    if (tiledImage.viewer) {
        /**
         * <em>- Needs documentation -</em>
         *
         * @event update-level
         * @memberof OpenSeadragon.Viewer
         * @type {object}
         * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
         * @property {OpenSeadragon.TiledImage} tiledImage - Which TiledImage is being drawn.
         * @property {Object} havedrawn
         * @property {Object} level
         * @property {Object} opacity
         * @property {Object} visibility
         * @property {OpenSeadragon.Rect} drawArea
         * @property {Object} topleft deprecated, use drawArea instead
         * @property {Object} bottomright deprecated, use drawArea instead
         * @property {Object} currenttime
         * @property {Object} best
         * @property {?Object} userData - Arbitrary subscriber-defined object.
         */
        tiledImage.viewer.raiseEvent('update-level', {
            tiledImage: tiledImage,
            havedrawn: haveDrawn,
            level: level,
            opacity: levelOpacity,
            visibility: levelVisibility,
            drawArea: drawArea,
            topleft: topLeftBound,
            bottomright: bottomRightBound,
            currenttime: currentTime,
            best: best
        });
    }

    //OK, a new drawing so do your calculations
    var topLeftTile = tiledImage.source.getTileAtPoint(level, topLeftBound);
    var bottomRightTile = tiledImage.source.getTileAtPoint(level, bottomRightBound);
    var numberOfTiles  = tiledImage.source.getNumTiles(level);

    resetCoverage(tiledImage.coverage, level);

    if (!tiledImage.wrapHorizontal) {
        // Adjust for floating point error
        topLeftTile.x = Math.max(topLeftTile.x, 0);
        bottomRightTile.x = Math.min(bottomRightTile.x, numberOfTiles.x - 1);
    }
    if (!tiledImage.wrapVertical) {
        // Adjust for floating point error
        topLeftTile.y = Math.max(topLeftTile.y, 0);
        bottomRightTile.y = Math.min(bottomRightTile.y, numberOfTiles.y - 1);
    }

    var viewportCenter = tiledImage.viewport.pixelFromPoint(
        tiledImage.viewport.getCenter());
    for (var x = topLeftTile.x; x <= bottomRightTile.x; x++) {
        for (var y = topLeftTile.y; y <= bottomRightTile.y; y++) {

            // Optimisation disabled with wrapping because getTileBounds does not
            // work correctly with x and y outside of the number of tiles
            if (!tiledImage.wrapHorizontal && !tiledImage.wrapVertical) {
                var tileBounds = tiledImage.source.getTileBounds(level, x, y);
                if (drawArea.intersection(tileBounds) === null) {
                    // This tile is outside of the viewport, no need to draw it
                    continue;
                }
            }

            best = updateTile(
                tiledImage,
                drawLevel,
                haveDrawn,
                x, y,
                level,
                levelOpacity,
                levelVisibility,
                viewportCenter,
                numberOfTiles,
                currentTime,
                best
            );

        }
    }

    return best;
}

function updateTile( tiledImage, drawLevel, haveDrawn, x, y, level, levelOpacity, levelVisibility, viewportCenter, numberOfTiles, currentTime, best){

    var tile = getTile(
            x, y,
            level,
            tiledImage.source,
            tiledImage.tilesMatrix,
            currentTime,
            numberOfTiles,
            tiledImage._worldWidthCurrent,
            tiledImage._worldHeightCurrent
        ),
        drawTile = drawLevel;

    if( tiledImage.viewer ){
        /**
         * <em>- Needs documentation -</em>
         *
         * @event update-tile
         * @memberof OpenSeadragon.Viewer
         * @type {object}
         * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
         * @property {OpenSeadragon.TiledImage} tiledImage - Which TiledImage is being drawn.
         * @property {OpenSeadragon.Tile} tile
         * @property {?Object} userData - Arbitrary subscriber-defined object.
         */
        tiledImage.viewer.raiseEvent( 'update-tile', {
            tiledImage: tiledImage,
            tile: tile
        });
    }

    setCoverage( tiledImage.coverage, level, x, y, false );

    if ( !tile.exists ) {
        return best;
    }

    if ( haveDrawn && !drawTile ) {
        if ( isCovered( tiledImage.coverage, level, x, y ) ) {
            setCoverage( tiledImage.coverage, level, x, y, true );
        } else {
            drawTile = true;
        }
    }

    if ( !drawTile ) {
        return best;
    }

    positionTile(
        tile,
        tiledImage.source.tileOverlap,
        tiledImage.viewport,
        viewportCenter,
        levelVisibility,
        tiledImage
    );

    if (!tile.loaded) {
        if (tile.context2D) {
            setTileLoaded(tiledImage, tile);
        } else {
            var imageRecord = tiledImage._tileCache.getImageRecord(tile.url);
            if (imageRecord) {
                var image = imageRecord.getImage();
                setTileLoaded(tiledImage, tile, image);
            }
        }
    }

    if ( tile.loaded ) {
        var needsDraw = blendTile(
            tiledImage,
            tile,
            x, y,
            level,
            levelOpacity,
            currentTime
        );

        if ( needsDraw ) {
            tiledImage._needsDraw = true;
        }
    } else if ( tile.loading ) {
        // the tile is already in the download queue
        // thanks josh1093 for finally translating this typo
    } else {
        best = compareTiles( best, tile );
    }

    return best;
}

function getTile( x, y, level, tileSource, tilesMatrix, time, numTiles, worldWidth, worldHeight ) {
    var xMod,
        yMod,
        bounds,
        exists,
        url,
        context2D,
        tile;

    if ( !tilesMatrix[ level ] ) {
        tilesMatrix[ level ] = {};
    }
    if ( !tilesMatrix[ level ][ x ] ) {
        tilesMatrix[ level ][ x ] = {};
    }

    if ( !tilesMatrix[ level ][ x ][ y ] ) {
        xMod    = ( numTiles.x + ( x % numTiles.x ) ) % numTiles.x;
        yMod    = ( numTiles.y + ( y % numTiles.y ) ) % numTiles.y;
        bounds  = tileSource.getTileBounds( level, xMod, yMod );
        exists  = tileSource.tileExists( level, xMod, yMod );
        url     = tileSource.getTileUrl( level, xMod, yMod );
        context2D = tileSource.getContext2D ?
            tileSource.getContext2D(level, xMod, yMod) : undefined;

        bounds.x += ( x - xMod ) / numTiles.x;
        bounds.y += (worldHeight / worldWidth) * (( y - yMod ) / numTiles.y);

        tilesMatrix[ level ][ x ][ y ] = new $.Tile(
            level,
            x,
            y,
            bounds,
            exists,
            url,
            context2D
        );
    }

    tile = tilesMatrix[ level ][ x ][ y ];
    tile.lastTouchTime = time;

    return tile;
}

function loadTile( tiledImage, tile, time ) {
    tile.loading = true;
    tiledImage._imageLoader.addJob({
        src: tile.url,
        crossOriginPolicy: tiledImage.crossOriginPolicy,
        callback: function( image, errorMsg ){
            onTileLoad( tiledImage, tile, time, image, errorMsg );
        },
        abort: function() {
            tile.loading = false;
        }
    });
}

function onTileLoad( tiledImage, tile, time, image, errorMsg ) {
    if ( !image ) {
        $.console.log( "Tile %s failed to load: %s - error: %s", tile, tile.url, errorMsg );
        /**
         * Triggered when a tile fails to load.
         *
         * @event tile-load-failed
         * @memberof OpenSeadragon.Viewer
         * @type {object}
         * @property {OpenSeadragon.Tile} tile - The tile that failed to load.
         * @property {OpenSeadragon.TiledImage} tiledImage - The tiled image the tile belongs to.
         * @property {number} time - The time in milliseconds when the tile load began.
         * @property {string} message - The error message.
         */
        tiledImage.viewer.raiseEvent("tile-load-failed", {tile: tile, tiledImage: tiledImage, time: time, message: errorMsg});
        tile.loading = false;
        tile.exists = false;
        return;
    }

    if ( time < tiledImage.lastResetTime ) {
        $.console.log( "Ignoring tile %s loaded before reset: %s", tile, tile.url );
        tile.loading = false;
        return;
    }

    var finish = function() {
        var cutoff = Math.ceil( Math.log(
            tiledImage.source.getTileWidth(tile.level) ) / Math.log( 2 ) );
        setTileLoaded(tiledImage, tile, image, cutoff);
    };

    // Check if we're mid-update; this can happen on IE8 because image load events for
    // cached images happen immediately there
    if ( !tiledImage._midDraw ) {
        finish();
    } else {
        // Wait until after the update, in case caching unloads any tiles
        window.setTimeout( finish, 1);
    }
}

function setTileLoaded(tiledImage, tile, image, cutoff) {
    var increment = 0;

    function getCompletionCallback() {
        increment++;
        return completionCallback;
    }

    function completionCallback() {
        increment--;
        if (increment === 0) {
            tile.loading = false;
            tile.loaded = true;
            if (!tile.context2D) {
                tiledImage._tileCache.cacheTile({
                    image: image,
                    tile: tile,
                    cutoff: cutoff,
                    tiledImage: tiledImage
                });
            }
            tiledImage._needsDraw = true;
        }
    }

    /**
     * Triggered when a tile has just been loaded in memory. That means that the
     * image has been downloaded and can be modified before being drawn to the canvas.
     *
     * @event tile-loaded
     * @memberof OpenSeadragon.Viewer
     * @type {object}
     * @property {Image} image - The image of the tile.
     * @property {OpenSeadragon.TiledImage} tiledImage - The tiled image of the loaded tile.
     * @property {OpenSeadragon.Tile} tile - The tile which has been loaded.
     * @property {function} getCompletionCallback - A function giving a callback to call
     * when the asynchronous processing of the image is done. The image will be
     * marked as entirely loaded when the callback has been called once for each
     * call to getCompletionCallback.
     */
    tiledImage.viewer.raiseEvent("tile-loaded", {
        tile: tile,
        tiledImage: tiledImage,
        image: image,
        getCompletionCallback: getCompletionCallback
    });
    // In case the completion callback is never called, we at least force it once.
    getCompletionCallback()();
}

function positionTile( tile, overlap, viewport, viewportCenter, levelVisibility, tiledImage ){
    var boundsTL     = tile.bounds.getTopLeft();

    boundsTL.x *= tiledImage._scaleSpring.current.value;
    boundsTL.y *= tiledImage._scaleSpring.current.value;
    boundsTL.x += tiledImage._xSpring.current.value;
    boundsTL.y += tiledImage._ySpring.current.value;

    var boundsSize   = tile.bounds.getSize();

    boundsSize.x *= tiledImage._scaleSpring.current.value;
    boundsSize.y *= tiledImage._scaleSpring.current.value;

    var positionC = viewport.pixelFromPointNoRotate(boundsTL, true),
        positionT = viewport.pixelFromPointNoRotate(boundsTL, false),
        sizeC = viewport.deltaPixelsFromPointsNoRotate(boundsSize, true),
        sizeT = viewport.deltaPixelsFromPointsNoRotate(boundsSize, false),
        tileCenter = positionT.plus( sizeT.divide( 2 ) ),
        tileSquaredDistance = viewportCenter.squaredDistanceTo( tileCenter );

    if ( !overlap ) {
        sizeC = sizeC.plus( new $.Point( 1, 1 ) );
    }

    tile.position   = positionC;
    tile.size       = sizeC;
    tile.squaredDistance   = tileSquaredDistance;
    tile.visibility = levelVisibility;
}


function blendTile( tiledImage, tile, x, y, level, levelOpacity, currentTime ){
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

    if ( opacity == 1 ) {
        setCoverage( tiledImage.coverage, level, x, y, true );
        tiledImage._hasOpaqueTile = true;
    } else if ( deltaTime < blendTimeMillis ) {
        return true;
    }

    return false;
}

/**
 * @private
 * @inner
 * Returns true if the given tile provides coverage to lower-level tiles of
 * lower resolution representing the same content. If neither x nor y is
 * given, returns true if the entire visible level provides coverage.
 *
 * Note that out-of-bounds tiles provide coverage in this sense, since
 * there's no content that they would need to cover. Tiles at non-existent
 * levels that are within the image bounds, however, do not.
 */
function providesCoverage( coverage, level, x, y ) {
    var rows,
        cols,
        i, j;

    if ( !coverage[ level ] ) {
        return false;
    }

    if ( x === undefined || y === undefined ) {
        rows = coverage[ level ];
        for ( i in rows ) {
            if ( rows.hasOwnProperty( i ) ) {
                cols = rows[ i ];
                for ( j in cols ) {
                    if ( cols.hasOwnProperty( j ) && !cols[ j ] ) {
                        return false;
                    }
                }
            }
        }

        return true;
    }

    return (
        coverage[ level ][ x] === undefined ||
        coverage[ level ][ x ][ y ] === undefined ||
        coverage[ level ][ x ][ y ] === true
    );
}

/**
 * @private
 * @inner
 * Returns true if the given tile is completely covered by higher-level
 * tiles of higher resolution representing the same content. If neither x
 * nor y is given, returns true if the entire visible level is covered.
 */
function isCovered( coverage, level, x, y ) {
    if ( x === undefined || y === undefined ) {
        return providesCoverage( coverage, level + 1 );
    } else {
        return (
             providesCoverage( coverage, level + 1, 2 * x, 2 * y ) &&
             providesCoverage( coverage, level + 1, 2 * x, 2 * y + 1 ) &&
             providesCoverage( coverage, level + 1, 2 * x + 1, 2 * y ) &&
             providesCoverage( coverage, level + 1, 2 * x + 1, 2 * y + 1 )
        );
    }
}

/**
 * @private
 * @inner
 * Sets whether the given tile provides coverage or not.
 */
function setCoverage( coverage, level, x, y, covers ) {
    if ( !coverage[ level ] ) {
        $.console.warn(
            "Setting coverage for a tile before its level's coverage has been reset: %s",
            level
        );
        return;
    }

    if ( !coverage[ level ][ x ] ) {
        coverage[ level ][ x ] = {};
    }

    coverage[ level ][ x ][ y ] = covers;
}

/**
 * @private
 * @inner
 * Resets coverage information for the given level. This should be called
 * after every draw routine. Note that at the beginning of the next draw
 * routine, coverage for every visible tile should be explicitly set.
 */
function resetCoverage( coverage, level ) {
    coverage[ level ] = {};
}

/**
 * @private
 * @inner
 * Determines whether the 'last best' tile for the area is better than the
 * tile in question.
 */
function compareTiles( previousBest, tile ) {
    if ( !previousBest ) {
        return tile;
    }

    if ( tile.visibility > previousBest.visibility ) {
        return tile;
    } else if ( tile.visibility == previousBest.visibility ) {
        if ( tile.squaredDistance < previousBest.squaredDistance ) {
            return tile;
        }
    }

    return previousBest;
}

function drawTiles( tiledImage, lastDrawn ) {
    if (lastDrawn.length === 0) {
        return;
    }
    var tile = lastDrawn[0];

    var useSketch = tiledImage.opacity < 1 ||
        (tiledImage.compositeOperation &&
            tiledImage.compositeOperation !== 'source-over') ||
        (!tiledImage._isBottomItem() && tile._hasTransparencyChannel());

    var sketchScale;
    var sketchTranslate;

    var zoom = tiledImage.viewport.getZoom(true);
    var imageZoom = tiledImage.viewportToImageZoom(zoom);
    // TODO: support tile edge smoothing with tiled image rotation.
    if (imageZoom > tiledImage.smoothTileEdgesMinZoom && !tiledImage.iOSDevice &&
        tiledImage.getRotation() === 0 && $.supportsCanvas) {
        // When zoomed in a lot (>100%) the tile edges are visible.
        // So we have to composite them at ~100% and scale them up together.
        // Note: Disabled on iOS devices per default as it causes a native crash
        useSketch = true;
        sketchScale = tile.getScaleForEdgeSmoothing();
        sketchTranslate = tile.getTranslationForEdgeSmoothing(sketchScale,
            tiledImage._drawer.getCanvasSize(false),
            tiledImage._drawer.getCanvasSize(true));
    }

    var bounds;
    if (useSketch) {
        if (!sketchScale) {
            // Except when edge smoothing, we only clean the part of the
            // sketch canvas we are going to use for performance reasons.
            bounds = tiledImage.viewport.viewportToViewerElementRectangle(
                tiledImage.getClippedBounds(true))
                .getIntegerBoundingBox()
                .times($.pixelDensityRatio);
        }
        tiledImage._drawer._clear(true, bounds);
    }

    // When scaling, we must rotate only when blending the sketch canvas to
    // avoid interpolation
    if (!sketchScale) {
        if (tiledImage.viewport.degrees !== 0) {
            tiledImage._drawer._offsetForRotation({
                degrees: tiledImage.viewport.degrees,
                useSketch: useSketch
            });
        }
        if (tiledImage._degrees !== 0) {
            tiledImage._drawer._offsetForRotation({
                degrees: tiledImage._degrees,
                point: tiledImage.viewport.pixelFromPointNoRotate(
                    tiledImage._getRotationPoint(true), true),
                useSketch: useSketch
            });
        }
    }

    var usedClip = false;
    if ( tiledImage._clip ) {
        tiledImage._drawer.saveContext(useSketch);

        var box = tiledImage.imageToViewportRectangle(tiledImage._clip, true);
        box = box.rotate(-tiledImage._degrees, tiledImage._getRotationPoint());
        var clipRect = tiledImage._drawer.viewportToDrawerRectangle(box);
        if (sketchScale) {
            clipRect = clipRect.times(sketchScale);
        }
        if (sketchTranslate) {
            clipRect = clipRect.translate(sketchTranslate);
        }
        tiledImage._drawer.setClip(clipRect, useSketch);

        usedClip = true;
    }

    if ( tiledImage.placeholderFillStyle && tiledImage._hasOpaqueTile === false ) {
        var placeholderRect = tiledImage._drawer.viewportToDrawerRectangle(tiledImage.getBounds(true));
        if (sketchScale) {
            placeholderRect = placeholderRect.times(sketchScale);
        }
        if (sketchTranslate) {
            placeholderRect = placeholderRect.translate(sketchTranslate);
        }

        var fillStyle = null;
        if ( typeof tiledImage.placeholderFillStyle === "function" ) {
            fillStyle = tiledImage.placeholderFillStyle(tiledImage, tiledImage._drawer.context);
        }
        else {
            fillStyle = tiledImage.placeholderFillStyle;
        }

        tiledImage._drawer.drawRectangle(placeholderRect, fillStyle, useSketch);
    }

    for (var i = lastDrawn.length - 1; i >= 0; i--) {
        tile = lastDrawn[ i ];
        tiledImage._drawer.drawTile( tile, tiledImage._drawingHandler, useSketch, sketchScale, sketchTranslate );
        tile.beingDrawn = true;

        if( tiledImage.viewer ){
            /**
             * <em>- Needs documentation -</em>
             *
             * @event tile-drawn
             * @memberof OpenSeadragon.Viewer
             * @type {object}
             * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
             * @property {OpenSeadragon.TiledImage} tiledImage - Which TiledImage is being drawn.
             * @property {OpenSeadragon.Tile} tile
             * @property {?Object} userData - Arbitrary subscriber-defined object.
             */
            tiledImage.viewer.raiseEvent( 'tile-drawn', {
                tiledImage: tiledImage,
                tile: tile
            });
        }
    }

    if ( usedClip ) {
        tiledImage._drawer.restoreContext( useSketch );
    }

    if (!sketchScale) {
        if (tiledImage._degrees !== 0) {
            tiledImage._drawer._restoreRotationChanges(useSketch);
        }
        if (tiledImage.viewport.degrees !== 0) {
            tiledImage._drawer._restoreRotationChanges(useSketch);
        }
    }

    if (useSketch) {
        if (sketchScale) {
            if (tiledImage.viewport.degrees !== 0) {
                tiledImage._drawer._offsetForRotation({
                    degrees: tiledImage.viewport.degrees,
                    useSketch: false
                });
            }
            if (tiledImage._degrees !== 0) {
                tiledImage._drawer._offsetForRotation({
                    degrees: tiledImage._degrees,
                    point: tiledImage.viewport.pixelFromPointNoRotate(
                        tiledImage._getRotationPoint(true), true),
                    useSketch: false
                });
            }
        }
        tiledImage._drawer.blendSketch({
            opacity: tiledImage.opacity,
            scale: sketchScale,
            translate: sketchTranslate,
            compositeOperation: tiledImage.compositeOperation,
            bounds: bounds
        });
        if (sketchScale) {
            if (tiledImage._degrees !== 0) {
                tiledImage._drawer._restoreRotationChanges(false);
            }
            if (tiledImage.viewport.degrees !== 0) {
                tiledImage._drawer._restoreRotationChanges(false);
            }
        }
    }
    drawDebugInfo( tiledImage, lastDrawn );
}

function drawDebugInfo( tiledImage, lastDrawn ) {
    if( tiledImage.debugMode ) {
        for ( var i = lastDrawn.length - 1; i >= 0; i-- ) {
            var tile = lastDrawn[ i ];
            try {
                tiledImage._drawer.drawDebugInfo(
                    tile, lastDrawn.length, i, tiledImage);
            } catch(e) {
                $.console.error(e);
            }
        }
    }
}

}( OpenSeadragon ));
