/*
 * OpenSeadragon - TiledImage
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

/**
 * You shouldn't have to create a TiledImage instance directly; get it asynchronously by
 * using {@link OpenSeadragon.Viewer#open} or {@link OpenSeadragon.Viewer#addTiledImage} instead.
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
 * @param {Number} [options.opacity=1] - Set to draw at proportional opacity. If zero, images will not draw.
 * @param {Boolean} [options.preload=false] - Set true to load even when the image is hidden by zero opacity.
 * @param {String} [options.compositeOperation] - How the image is composited onto other images;
 * see compositeOperation in {@link OpenSeadragon.Options} for possible values.
 * @param {Boolean} [options.debugMode] - See {@link OpenSeadragon.Options}.
 * @param {String|CanvasGradient|CanvasPattern|Function} [options.placeholderFillStyle] - See {@link OpenSeadragon.Options}.
 * @param {String|Boolean} [options.crossOriginPolicy] - See {@link OpenSeadragon.Options}.
 * @param {Boolean} [options.ajaxWithCredentials] - See {@link OpenSeadragon.Options}.
 * @param {Boolean} [options.loadTilesWithAjax]
 *      Whether to load tile data using AJAX requests.
 *      Defaults to the setting in {@link OpenSeadragon.Options}.
 * @param {Object} [options.ajaxHeaders={}]
 *      A set of headers to include when making tile AJAX requests.
 */
$.TiledImage = function( options ) {
    this._initialized = false;
    /**
     * The {@link OpenSeadragon.TileSource} that defines this TiledImage.
     * @member {OpenSeadragon.TileSource} source
     * @memberof OpenSeadragon.TiledImage#
     */
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

    var degrees = options.degrees || 0;
    delete options.degrees;

    var ajaxHeaders = options.ajaxHeaders;
    delete options.ajaxHeaders;

    $.extend( true, this, {

        //internal state properties
        viewer:         null,
        tilesMatrix:    {},    // A '3d' dictionary [level][x][y] --> Tile.
        coverage:       {},    // A '3d' dictionary [level][x][y] --> Boolean; shows what areas have been drawn.
        loadingCoverage: {},   // A '3d' dictionary [level][x][y] --> Boolean; shows what areas are loaded or are being loaded/blended.
        lastDrawn:      [],    // An unordered list of Tiles drawn last frame.
        lastResetTime:  0,     // Last time for which the tiledImage was reset.
        _needsDraw:     true,  // Does the tiledImage need to be drawn again?
        _needsUpdate:   true,  // Does the tiledImage need to update the viewport again?
        _hasOpaqueTile: false,  // Do we have even one fully opaque tile?
        _tilesLoading:  0,     // The number of pending tile requests.
        _zombieCache:   false, // Allow cache to stay in memory upon deletion.
        _tilesToDraw:   [],    // info about the tiles currently in the viewport, two deep: array[level][tile]
        _lastDrawn:     [],    // array of tiles that were last fetched by the drawer
        _isBlending:    false, // Are any tiles still being blended?
        _wasBlending:   false, // Were any tiles blending before the last draw?
        _isTainted:     false, // Has a Tile been found with tainted data?
        //configurable settings
        springStiffness:                   $.DEFAULT_SETTINGS.springStiffness,
        animationTime:                     $.DEFAULT_SETTINGS.animationTime,
        minZoomImageRatio:                 $.DEFAULT_SETTINGS.minZoomImageRatio,
        wrapHorizontal:                    $.DEFAULT_SETTINGS.wrapHorizontal,
        wrapVertical:                      $.DEFAULT_SETTINGS.wrapVertical,
        immediateRender:                   $.DEFAULT_SETTINGS.immediateRender,
        loadDestinationTilesOnAnimation:   $.DEFAULT_SETTINGS.loadDestinationTilesOnAnimation,
        blendTime:                         $.DEFAULT_SETTINGS.blendTime,
        alwaysBlend:                       $.DEFAULT_SETTINGS.alwaysBlend,
        minPixelRatio:                     $.DEFAULT_SETTINGS.minPixelRatio,
        smoothTileEdgesMinZoom:            $.DEFAULT_SETTINGS.smoothTileEdgesMinZoom,
        iOSDevice:                         $.DEFAULT_SETTINGS.iOSDevice,
        debugMode:                         $.DEFAULT_SETTINGS.debugMode,
        crossOriginPolicy:                 $.DEFAULT_SETTINGS.crossOriginPolicy,
        ajaxWithCredentials:               $.DEFAULT_SETTINGS.ajaxWithCredentials,
        placeholderFillStyle:              $.DEFAULT_SETTINGS.placeholderFillStyle,
        opacity:                           $.DEFAULT_SETTINGS.opacity,
        preload:                           $.DEFAULT_SETTINGS.preload,
        compositeOperation:                $.DEFAULT_SETTINGS.compositeOperation,
        subPixelRoundingForTransparency:   $.DEFAULT_SETTINGS.subPixelRoundingForTransparency,
        maxTilesPerFrame:                  $.DEFAULT_SETTINGS.maxTilesPerFrame,
        _currentMaxTilesPerFrame:          (options.maxTilesPerFrame || $.DEFAULT_SETTINGS.maxTilesPerFrame) * 10
    }, options );

    this._preload = this.preload;
    delete this.preload;

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

    this._degreesSpring = new $.Spring({
        initial: degrees,
        springStiffness: this.springStiffness,
        animationTime: this.animationTime
    });

    this._updateForScale();

    if (fitBounds) {
        this.fitBounds(fitBounds, fitBoundsPlacement, true);
    }

    this._ownAjaxHeaders = {};
    this.setAjaxHeaders(ajaxHeaders, false);
    this._initialized = true;
    // this.invalidatedAt = 0;
};

$.extend($.TiledImage.prototype, $.EventSource.prototype, /** @lends OpenSeadragon.TiledImage.prototype */{
    /**
     * @returns {Boolean} Whether the TiledImage needs to be drawn.
     */
    needsDraw: function() {
        return this._needsDraw;
    },

    /**
     * Mark the tiled image as needing to be (re)drawn
     */
    redraw: function() {
        this._needsDraw = true;
    },

    /**
     * @returns {Boolean} Whether all tiles necessary for this TiledImage to draw at the current view have been loaded.
     */
    getFullyLoaded: function() {
        return this._fullyLoaded;
    },

    /**
     * Executes the provided callback when the TiledImage is fully loaded. If already loaded,
     * schedules the callback asynchronously. Otherwise, attaches a one-time event listener
     * for the 'fully-loaded-change' event.
     * @param {Function} callback - Function to execute when loading completes
     */
    whenFullyLoaded: function(callback) {
        if (this.getFullyLoaded()) {
            setTimeout(callback, 1); // Asynchronous execution
        } else {
            this.addOnceHandler('fully-loaded-change', function() {
                callback(); // Maintain context
            });
        }
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
     * Forces the system consider all tiles in this tiled image
     * as outdated, and fire tile update event on relevant tiles
     * Detailed description is available within the 'tile-invalidated'
     * event.
     * @param {Boolean} [restoreTiles=true] if true, tile processing starts from the tile original data
     * @param {boolean} [viewportOnly=false] optionally invalidate only viewport-visible tiles if true
     * @param {number} [tStamp=OpenSeadragon.now()] optionally provide tStamp of the update event
     */
    requestInvalidate: function (restoreTiles = true, viewportOnly = false, tStamp = $.now()) {
        const tiles = viewportOnly ? this._lastDrawn.map(x => x.tile) : this._tileCache.getLoadedTilesFor(this);
        return this.viewer.world.requestTileInvalidateEvent(tiles, tStamp, restoreTiles);
    },

    /**
     * Clears all tiles and triggers an update on the next call to
     * {@link OpenSeadragon.TiledImage#update}.
     */
    reset: function() {
        this._tileCache.clearTilesFor(this);
        this._currentMaxTilesPerFrame = this.maxTilesPerFrame * 10;
        this.lastResetTime = $.now();
        this._needsDraw = true;
        this._fullyLoaded = false;
    },

    /**
     * Updates the TiledImage's bounds, animating if needed. Based on the new
     * bounds, updates the levels and tiles to be drawn into the viewport.
     * @param viewportChanged Whether the viewport changed meaning tiles need to be updated.
     * @returns {Boolean} Whether the TiledImage needs to be drawn.
     */
    update: function(viewportChanged) {
        let xUpdated = this._xSpring.update();
        let yUpdated = this._ySpring.update();
        let scaleUpdated = this._scaleSpring.update();
        let degreesUpdated = this._degreesSpring.update();

        let updated = (xUpdated || yUpdated || scaleUpdated || degreesUpdated || this._needsUpdate);

        if (updated || viewportChanged || !this._fullyLoaded){
            let fullyLoadedFlag = this._updateLevelsForViewport();
            this._setFullyLoaded(fullyLoadedFlag);
        }

        this._needsUpdate = false;

        if (updated) {
            this._updateForScale();
            this._raiseBoundsChange();
            this._needsDraw = true;
            return true;
        }

        return false;
    },

    /**
     * Mark this TiledImage as having been drawn, so that it will only be drawn
     * again if something changes about the image. If the image is still blending,
     * this will have no effect.
     * @returns {Boolean} whether the item still needs to be drawn due to blending
     */
    setDrawn: function(){
        this._needsDraw = this._isBlending || this._wasBlending ||
            (this.opacity > 0 && this._lastDrawn.length < 1);
        return this._needsDraw;
    },

    /**
     * Set the internal _isTainted flag for this TiledImage. Lazy loaded - not
     * checked each time a Tile is loaded, but can be set if a consumer of the
     * tiles (e.g. a Drawer) discovers a Tile to have tainted data so that further
     * checks are not needed and alternative rendering strategies can be used.
     * @private
     */
    setTainted(isTainted){
        this._isTainted = isTainted;
    },

    /**
     * @private
     * @returns {Boolean} whether the TiledImage has been marked as tainted
     */
    isTainted(){
        return this._isTainted;
    },

    /**
     * Destroy the TiledImage (unload current loaded tiles).
     */
    destroy: function() {
        this.reset();
        this.source.destroy(this.viewer);
    },

    /**
     * Get this TiledImage's bounds in viewport coordinates.
     * @param {Boolean} [current=false] - Pass true for the current location;
     * false for target location.
     * @returns {OpenSeadragon.Rect} This TiledImage's bounds in viewport coordinates.
     */
    getBounds: function(current) {
        return this.getBoundsNoRotate(current)
            .rotate(this.getRotation(current), this._getRotationPoint(current));
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
        return bounds.rotate(this.getRotation(current), this._getRotationPoint(current));
    },

    /**
     * @function
     * @param {Number} level
     * @param {Number} x
     * @param {Number} y
     * @returns {OpenSeadragon.Rect} Where this tile fits (in normalized coordinates).
     */
    getTileBounds: function( level, x, y ) {
        var numTiles = this.source.getNumTiles(level);
        var xMod    = ( numTiles.x + ( x % numTiles.x ) ) % numTiles.x;
        var yMod    = ( numTiles.y + ( y % numTiles.y ) ) % numTiles.y;
        var bounds = this.source.getTileBounds(level, xMod, yMod);
        if (this.getFlip()) {
            bounds.x = Math.max(0, 1 - bounds.x - bounds.width);
        }
        bounds.x += (x - xMod) / numTiles.x;
        bounds.y += (this._worldHeightCurrent / this._worldWidthCurrent) * ((y - yMod) / numTiles.y);
        return bounds;
    },

    /**
     * @returns {OpenSeadragon.Point} This TiledImage's content size, in original pixels.
     */
    getContentSize: function() {
        return new $.Point(this.source.dimensions.x, this.source.dimensions.y);
    },

    /**
     * @returns {OpenSeadragon.Point} The TiledImage's content size, in window coordinates.
     */
    getSizeInWindowCoordinates: function() {
        var topLeft = this.imageToWindowCoordinates(new $.Point(0, 0));
        var bottomRight = this.imageToWindowCoordinates(this.getContentSize());
        return new $.Point(bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
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
     * @returns {OpenSeadragon.Point} A point representing the coordinates in the image.
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

        point = point.rotate(-this.getRotation(current), this._getRotationPoint(current));
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
     * @returns {OpenSeadragon.Point} A point representing the coordinates in the viewport.
     */
    imageToViewportCoordinates: function(imageX, imageY, current) {
        if (imageX instanceof $.Point) {
            //they passed a point instead of individual components
            current = imageY;
            imageY = imageX.y;
            imageX = imageX.x;
        }

        var point = this._imageToViewportDelta(imageX, imageY, current);
        if (current) {
            point.x += this._xSpring.current.value;
            point.y += this._ySpring.current.value;
        } else {
            point.x += this._xSpring.target.value;
            point.y += this._ySpring.target.value;
        }

        return point.rotate(this.getRotation(current), this._getRotationPoint(current));
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
     * @returns {OpenSeadragon.Rect} A rect representing the coordinates in the viewport.
     */
    imageToViewportRectangle: function(imageX, imageY, pixelWidth, pixelHeight, current) {
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
            rect.degrees + this.getRotation(current)
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
     * @returns {OpenSeadragon.Rect} A rect representing the coordinates in the image.
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
            rect.degrees - this.getRotation(current)
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
        rect = rect.rotate(-this.getRotation(true), this._getRotationPoint(true));
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
        return ratio * viewportZoom;
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
            this._needsUpdate = true;
        } else {
            if (sameTarget) {
                return;
            }

            this._xSpring.springTo(position.x);
            this._ySpring.springTo(position.y);
            this._needsDraw = true;
            this._needsUpdate = true;
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
     * Sets an array of polygons to crop the TiledImage during draw tiles.
     * The render function will use the default non-zero winding rule.
     * @param {OpenSeadragon.Point[][]} polygons - represented in an array of point object in image coordinates.
     * Example format: [
     *  [{x: 197, y:172}, {x: 226, y:172}, {x: 226, y:198}, {x: 197, y:198}], // First polygon
     *  [{x: 328, y:200}, {x: 330, y:199}, {x: 332, y:201}, {x: 329, y:202}]  // Second polygon
     *  [{x: 321, y:201}, {x: 356, y:205}, {x: 341, y:250}] // Third polygon
     * ]
     */
    setCroppingPolygons: function( polygons ) {
        var isXYObject = function(obj) {
            return obj instanceof $.Point || (typeof obj.x === 'number' && typeof obj.y === 'number');
        };

        var objectToSimpleXYObject = function(objs) {
            return objs.map(function(obj) {
                try {
                    if (isXYObject(obj)) {
                        return { x: obj.x, y: obj.y };
                    } else {
                        throw new Error();
                    }
                } catch(e) {
                    throw new Error('A Provided cropping polygon point is not supported');
                }
            });
        };

        try {
            if (!$.isArray(polygons)) {
                throw new Error('Provided cropping polygon is not an array');
            }
            this._croppingPolygons = polygons.map(function(polygon){
                return objectToSimpleXYObject(polygon);
            });
            this._needsDraw = true;
        } catch (e) {
            $.console.error('[TiledImage.setCroppingPolygons] Cropping polygon format not supported');
            $.console.error(e);
            this.resetCroppingPolygons();
        }
    },

    /**
     * Resets the cropping polygons, thus next render will remove all cropping
     * polygon effects.
     */
    resetCroppingPolygons: function() {
        this._croppingPolygons = null;
        this._needsDraw = true;
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

        this._needsUpdate = true;
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
     * @returns {Boolean} Whether the TiledImage should be flipped before rendering.
     */
    getFlip: function() {
        return this.flipped;
    },

    /**
     * @param {Boolean} flip Whether the TiledImage should be flipped before rendering.
     * @fires OpenSeadragon.TiledImage.event:bounds-change
     */
    setFlip: function(flip) {
        this.flipped = flip;
    },

    get flipped() {
        return this._flipped;
    },
    set flipped(flipped) {
        let changed = this._flipped !== !!flipped;
        this._flipped = !!flipped;
        if (changed && this._initialized) {
            this.update(true);
            this._needsDraw = true;
            this._raiseBoundsChange();
        }
    },

    get wrapHorizontal(){
        return this._wrapHorizontal;
    },
    set wrapHorizontal(wrap){
        let changed = this._wrapHorizontal !== !!wrap;
        this._wrapHorizontal = !!wrap;
        if(this._initialized && changed){
            this.update(true);
            this._needsDraw = true;
            // this._raiseBoundsChange();
        }
    },

    get wrapVertical(){
        return this._wrapVertical;
    },
    set wrapVertical(wrap){
        let changed = this._wrapVertical !== !!wrap;
        this._wrapVertical = !!wrap;
        if(this._initialized && changed){
            this.update(true);
            this._needsDraw = true;
            // this._raiseBoundsChange();
        }
    },

    get debugMode(){
        return this._debugMode;
    },
    set debugMode(debug){
        this._debugMode = !!debug;
        this._needsDraw = true;
    },

    /**
     * @returns {Number} The TiledImage's current opacity.
     */
    getOpacity: function() {
        return this.opacity;
    },

    /**
     * @param {Number} opacity Opacity the tiled image should be drawn at.
     * @fires OpenSeadragon.TiledImage.event:opacity-change
     */
    setOpacity: function(opacity) {
        this.opacity = opacity;
    },

    get opacity() {
        return this._opacity;
    },

    set opacity(opacity) {
        if (opacity === this.opacity) {
            return;
        }

        this._opacity = opacity;
        this._needsDraw = true;
        this._needsUpdate = true;
        /**
         * Raised when the TiledImage's opacity is changed.
         * @event opacity-change
         * @memberOf OpenSeadragon.TiledImage
         * @type {object}
         * @property {Number} opacity - The new opacity value.
         * @property {OpenSeadragon.TiledImage} eventSource - A reference to the
         * TiledImage which raised the event.
         * @property {?Object} userData - Arbitrary subscriber-defined object.
         */
        this.raiseEvent('opacity-change', {
            opacity: this.opacity
        });
    },

    /**
     * @returns {Boolean} whether the tiledImage can load its tiles even when it has zero opacity.
     */
    getPreload: function() {
        return this._preload;
    },

    /**
     * Set true to load even when hidden. Set false to block loading when hidden.
     */
    setPreload: function(preload) {
        this._preload = !!preload;
        this._needsDraw = true;
    },

    /**
     * Get the rotation of this tiled image in degrees.
     * @param {Boolean} [current=false] True for current rotation, false for target.
     * @returns {Number} the rotation of this tiled image in degrees.
     */
    getRotation: function(current) {
        return current ?
            this._degreesSpring.current.value :
            this._degreesSpring.target.value;
    },

    /**
     * Set the current rotation of this tiled image in degrees.
     * @param {Number} degrees the rotation in degrees.
     * @param {Boolean} [immediately=false] Whether to animate to the new angle
     * or rotate immediately.
     * @fires OpenSeadragon.TiledImage.event:bounds-change
     */
    setRotation: function(degrees, immediately) {
        if (this._degreesSpring.target.value === degrees &&
            this._degreesSpring.isAtTargetValue()) {
            return;
        }
        if (immediately) {
            this._degreesSpring.resetTo(degrees);
        } else {
            this._degreesSpring.springTo(degrees);
        }
        this._needsDraw = true;
        this._needsUpdate = true;
        this._raiseBoundsChange();
    },

    /**
     * Get the region of this tiled image that falls within the viewport.
     * @returns {OpenSeadragon.Rect} the region of this tiled image that falls within the viewport.
     * Returns false for images with opacity==0 unless preload==true
     */
    getDrawArea: function(){

        if( this._opacity === 0 && !this._preload){
            return false;
        }

        var drawArea = this._viewportToTiledImageRectangle(
            this.viewport.getBoundsWithMargins(true));

        if (!this.wrapHorizontal && !this.wrapVertical) {
            var tiledImageBounds = this._viewportToTiledImageRectangle(
                this.getClippedBounds(true));
            drawArea = drawArea.intersection(tiledImageBounds);
        }

        return drawArea;
    },

    getLoadArea: function() {
        var loadArea = this._viewportToTiledImageRectangle(
            this.viewport.getBoundsWithMargins(false));

        if (!this.wrapHorizontal && !this.wrapVertical) {
            var tiledImageBounds = this._viewportToTiledImageRectangle(
            this.getClippedBounds(false));
            loadArea = loadArea.intersection(tiledImageBounds);
        }

        return loadArea;
    },

    /**
     *
     * @returns {Array} Array of Tiles that make up the current view
     */
    getTilesToDraw: function(){
        // start with all the tiles added to this._tilesToDraw during the most recent
        // call to this.update. Then update them so the blending and coverage properties
        // are updated based on the current time
        let tileArray = this._tilesToDraw.flat();

        // update all tiles, which can change the coverage provided
        this._updateTilesInViewport(tileArray);

        // _tilesToDraw might have been updated by the update; refresh it
        tileArray = this._tilesToDraw.flat();

        // mark the tiles as being drawn, so that they won't be discarded from
        // the tileCache
        tileArray.forEach(tileInfo => {
            tileInfo.tile.beingDrawn = true;
        });
        this._lastDrawn = tileArray;
        return tileArray;
    },

    /**
     * Get the point around which this tiled image is rotated
     * @private
     * @param {Boolean} current True for current rotation point, false for target.
     * @returns {OpenSeadragon.Point}
     */
    _getRotationPoint: function(current) {
        return this.getBoundsNoRotate(current).getCenter();
    },

    get compositeOperation(){
        return this._compositeOperation;
    },

    set compositeOperation(compositeOperation){

        if (compositeOperation === this._compositeOperation) {
            return;
        }
        this._compositeOperation = compositeOperation;
        this._needsDraw = true;
        /**
         * Raised when the TiledImage's opacity is changed.
         * @event composite-operation-change
         * @memberOf OpenSeadragon.TiledImage
         * @type {object}
         * @property {String} compositeOperation - The new compositeOperation value.
         * @property {OpenSeadragon.TiledImage} eventSource - A reference to the
         * TiledImage which raised the event.
         * @property {?Object} userData - Arbitrary subscriber-defined object.
         */
        this.raiseEvent('composite-operation-change', {
            compositeOperation: this._compositeOperation
        });

    },

    /**
     * @returns {String} The TiledImage's current compositeOperation.
     */
    getCompositeOperation: function() {
        return this._compositeOperation;
    },

    /**
     * @param {String} compositeOperation the tiled image should be drawn with this globalCompositeOperation.
     * @fires OpenSeadragon.TiledImage.event:composite-operation-change
     */
    setCompositeOperation: function(compositeOperation) {
        this.compositeOperation = compositeOperation; //invokes setter
    },

    /**
     * Update headers to include when making AJAX requests.
     *
     * Unless `propagate` is set to false (which is likely only useful in rare circumstances),
     * the updated headers are propagated to all tiles and queued image loader jobs.
     *
     * Note that the rules for merging headers still apply, i.e. headers returned by
     * {@link OpenSeadragon.TileSource#getTileAjaxHeaders} take precedence over
     * the headers here in the tiled image (`TiledImage.ajaxHeaders`).
     *
     * @function
     * @param {Object} ajaxHeaders Updated AJAX headers, which will be merged over any headers specified in {@link OpenSeadragon.Options}.
     * @param {Boolean} [propagate=true] Whether to propagate updated headers to existing tiles and queued image loader jobs.
     */
    setAjaxHeaders: function(ajaxHeaders, propagate) {
        if (ajaxHeaders === null) {
            ajaxHeaders = {};
        }
        if (!$.isPlainObject(ajaxHeaders)) {
            $.console.error('[TiledImage.setAjaxHeaders] Ignoring invalid headers, must be a plain object');
            return;
        }

        this._ownAjaxHeaders = ajaxHeaders;
        this._updateAjaxHeaders(propagate);
    },

    /**
     * Update headers to include when making AJAX requests.
     *
     * This function has the same effect as calling {@link OpenSeadragon.TiledImage#setAjaxHeaders},
     * except that the headers for this tiled image do not change. This is especially useful
     * for propagating updated headers from {@link OpenSeadragon.TileSource#getTileAjaxHeaders}
     * to existing tiles.
     *
     * @private
     * @function
     * @param {Boolean} [propagate=true] Whether to propagate updated headers to existing tiles and queued image loader jobs.
     */
    _updateAjaxHeaders: function(propagate) {
        if (propagate === undefined) {
            propagate = true;
        }

        // merge with viewer's headers
        if ($.isPlainObject(this.viewer.ajaxHeaders)) {
            this.ajaxHeaders = $.extend({}, this.viewer.ajaxHeaders, this._ownAjaxHeaders);
        } else {
            this.ajaxHeaders = this._ownAjaxHeaders;
        }

        // propagate header updates to all tiles and queued image loader jobs
        if (propagate) {
            var numTiles, xMod, yMod, tile;

            for (var level in this.tilesMatrix) {
                numTiles = this.source.getNumTiles(level);

                for (var x in this.tilesMatrix[level]) {
                    xMod = ( numTiles.x + ( x % numTiles.x ) ) % numTiles.x;

                    for (var y in this.tilesMatrix[level][x]) {
                        yMod = ( numTiles.y + ( y % numTiles.y ) ) % numTiles.y;
                        tile = this.tilesMatrix[level][x][y];

                        tile.loadWithAjax = this.loadTilesWithAjax;
                        if (tile.loadWithAjax) {
                            var tileAjaxHeaders = this.source.getTileAjaxHeaders( level, xMod, yMod );
                            tile.ajaxHeaders = $.extend({}, this.ajaxHeaders, tileAjaxHeaders);
                        } else {
                            tile.ajaxHeaders = null;
                        }
                    }
                }
            }

            for (var i = 0; i < this._imageLoader.jobQueue.length; i++) {
                var job = this._imageLoader.jobQueue[i];
                job.loadWithAjax = job.tile.loadWithAjax;
                job.ajaxHeaders = job.tile.loadWithAjax ? job.tile.ajaxHeaders : null;
            }
        }
    },

    /**
     * Enable cache preservation even without this tile image,
     * by default disabled. It means that upon removing,
     * the tile cache does not get immediately erased but
     * stays in the memory to be potentially re-used by other
     * TiledImages.
     * @param {boolean} allow
     */
    allowZombieCache: function(allow) {
        this._zombieCache = allow;
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
            this._needsUpdate = true;
        } else {
            if (sameTarget) {
                return;
            }

            this._scaleSpring.springTo(scale);
            this._updateForScale();
            this._needsDraw = true;
            this._needsUpdate = true;
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
        highestLevel = Math.max(highestLevel, this.source.minLevel || 0);
        lowestLevel = Math.min(lowestLevel, highestLevel);
        return {
            lowestLevel: lowestLevel,
            highestLevel: highestLevel
        };
    },

    // returns boolean flag of whether the image should be marked as fully loaded
    _updateLevelsForViewport: function(){
        var levelsInterval = this._getLevelsInterval();
        var lowestLevel = levelsInterval.lowestLevel; // the lowest level we should draw at our current zoom
        var highestLevel = levelsInterval.highestLevel; // the highest level we should draw at our current zoom
        var bestTiles = [];
        var drawArea = this.getDrawArea();
        var loadArea = drawArea;

        if (this.loadDestinationTilesOnAnimation) {
          loadArea = this.getLoadArea();
        }
        var currentTime = $.now();

        // reset each tile's beingDrawn flag
        this._lastDrawn.forEach(tileinfo => {
            tileinfo.tile.beingDrawn = false;
        });
        // clear the list of tiles to draw
        this._tilesToDraw = [];
        this._tilesLoading = 0;
        this.loadingCoverage = {};

        if(!drawArea){
            this._needsDraw = false;
            return this._fullyLoaded;
        }

        // make a list of levels to use for the current zoom level
        var levelList = new Array(highestLevel - lowestLevel + 1);
        // go from highest to lowest resolution
        for(let i = 0, level = highestLevel; level >= lowestLevel; level--, i++){
            levelList[i] = level;
        }

        // if a single-tile level is loaded, add that to the end of the list
        // as a fallback to use during zooming out, until a lower-res tile is
        // loaded
        for(let level = highestLevel + 1; level <= this.source.maxLevel; level++){
            var tile = (
                this.tilesMatrix[level] &&
                this.tilesMatrix[level][0] &&
                this.tilesMatrix[level][0][0]
            );
            if(tile && tile.isBottomMost && tile.isRightMost && tile.loaded){
                levelList.push(level);
                break;
            }
        }


        // Update any level that will be drawn.
        // We are iterating from highest resolution to lowest resolution
        // Once a level fully covers the viewport the loop is halted and
        // lower-resolution levels are skipped
        let useLevel = false;
        for (let i = 0; i < levelList.length; i++) {
            let level = levelList[i];

            var currentRenderPixelRatio = this.viewport.deltaPixelsFromPointsNoRotate(
                this.source.getPixelRatio(level),
                true
            ).x * this._scaleSpring.current.value;

            // make sure we skip levels until currentRenderPixelRatio becomes >= minPixelRatio
            // but always use the last level in the list so we draw something
            if (i === levelList.length - 1 || currentRenderPixelRatio >= this.minPixelRatio ) {
                useLevel = true;
            } else if (!useLevel) {
                continue;
            }

            var targetRenderPixelRatio = this.viewport.deltaPixelsFromPointsNoRotate(
                this.source.getPixelRatio(level),
                false
            ).x * this._scaleSpring.current.value;

            var targetZeroRatio = this.viewport.deltaPixelsFromPointsNoRotate(
                this.source.getPixelRatio(
                    Math.max(
                        this.source.getClosestLevel(),
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

            // Update the level and keep track of 'best' tiles to load
            var result = this._updateLevel(
                level,
                levelOpacity,
                levelVisibility,
                drawArea,
                loadArea,
                currentTime,
                bestTiles
            );

            bestTiles = result.bestTiles;
            var tiles = result.updatedTiles.filter(tile => tile.loaded);
            var makeTileInfoObject = (function(level, levelOpacity, currentTime){
                return function(tile){
                    return {
                        tile: tile,
                        level: level,
                        levelOpacity: levelOpacity,
                        currentTime: currentTime
                    };
                };
            })(level, levelOpacity, currentTime);

            this._tilesToDraw[level] = tiles.map(makeTileInfoObject);

            // Stop the loop if lower-res tiles would all be covered by
            // already drawn tiles
            if (this._providesCoverage(this.coverage, level)) {
                break;
            }
        }


        // Load the new 'best' n tiles
        if (bestTiles && bestTiles.length > 0) {
            for (let tile of bestTiles) {
                if (tile) {
                    this._loadTile(tile, currentTime);
                }
            }
            this._needsDraw = true;
            return false;
        } else {
            return this._tilesLoading === 0;
        }
    },

    /**
     * Update all tiles that contribute to the current view
     * @private
     *
     */
    _updateTilesInViewport: function(tiles) {
        let currentTime = $.now();
        let _this = this;
        this._tilesLoading = 0;
        this._wasBlending = this._isBlending;
        this._isBlending = false;
        this.loadingCoverage = {};
        let lowestLevel = tiles.length ? tiles[0].level : 0;

        let drawArea = this.getDrawArea();
        if(!drawArea){
            return;
        }

        function updateTile(info){
            let tile = info.tile;
            if(tile && tile.loaded){
                let tileIsBlending = _this._blendTile(
                    tile,
                    tile.x,
                    tile.y,
                    info.level,
                    info.levelOpacity,
                    currentTime,
                    lowestLevel
                );
                _this._isBlending = _this._isBlending || tileIsBlending;
                _this._needsDraw = _this._needsDraw || tileIsBlending || _this._wasBlending;
            }
        }

        // Update each tile in the list of tiles. As the tiles are updated,
        // the coverage provided is also updated. If a level provides coverage
        // as part of this process, discard tiles from lower levels
        let level = 0;
        for(let i = 0; i < tiles.length; i++){
            let tile = tiles[i];
            updateTile(tile);
            if(this._providesCoverage(this.coverage, tile.level)){
                level = Math.max(level, tile.level);
            }
        }
        if(level > 0){
            for( let levelKey in this._tilesToDraw ){
                if( levelKey < level ){
                    delete this._tilesToDraw[levelKey];
                }
            }
        }

    },

    /**
     * Updates the opacity of a tile according to the time it has been on screen
     * to perform a fade-in.
     * Updates coverage once a tile is fully opaque.
     * Returns whether the fade-in has completed.
     * @private
     *
     * @param {OpenSeadragon.Tile} tile
     * @param {Number} x
     * @param {Number} y
     * @param {Number} level
     * @param {Number} levelOpacity
     * @param {Number} currentTime
     * @param {Boolean} lowestLevel
     * @returns {Boolean} true if blending did not yet finish
     */
    _blendTile: function(tile, x, y, level, levelOpacity, currentTime, lowestLevel ){
        let blendTimeMillis = 1000 * this.blendTime,
            deltaTime,
            opacity;

        if ( !tile.blendStart ) {
            tile.blendStart = currentTime;
        }

        deltaTime   = currentTime - tile.blendStart;
        opacity     = blendTimeMillis ? Math.min( 1, deltaTime / ( blendTimeMillis ) ) : 1;

        // if this tile is at the lowest level being drawn, render at opacity=1
        if(level === lowestLevel){
            opacity = 1;
            deltaTime = blendTimeMillis;
        }

        if ( this.alwaysBlend ) {
            opacity *= levelOpacity;
        }
        tile.opacity = opacity;

        if ( opacity === 1 ) {
            this._setCoverage( this.coverage, level, x, y, true );
            this._hasOpaqueTile = true;
        }
        // return true if the tile is still blending
        return deltaTime < blendTimeMillis;
    },

    /**
     * Updates all tiles at a given resolution level.
     * @private
     * @param {Number} level
     * @param {Number} levelOpacity
     * @param {Number} levelVisibility
     * @param {OpenSeadragon.Rect} drawArea
     * @param {OpenSeadragon.Rect} loadArea
     * @param {Number} currentTime
     * @param {OpenSeadragon.Tile[]} best Array of the current best tiles
     * @returns {Object} Dictionary {bestTiles: OpenSeadragon.Tile - the current "best" tiles to draw, updatedTiles: OpenSeadragon.Tile) - the updated tiles}.
     */
    _updateLevel: function(level, levelOpacity,
                            levelVisibility, drawArea, loadArea, currentTime, best) {

        var drawTopLeftBound = drawArea.getBoundingBox().getTopLeft();
        var drawBottomRightBound = drawArea.getBoundingBox().getBottomRight();
        if (this.viewer) {
            /**
             * <em>- Needs documentation -</em>
             *
             * @event update-level
             * @memberof OpenSeadragon.Viewer
             * @type {object}
             * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
             * @property {OpenSeadragon.TiledImage} tiledImage - Which TiledImage is being drawn.
             * @property {Object} havedrawn - deprecated, always true (kept for backwards compatibility)
             * @property {Object} level
             * @property {Object} opacity
             * @property {Object} visibility
             * @property {OpenSeadragon.Rect} drawArea
             * @property {Object} topleft deprecated, use drawArea instead
             * @property {Object} bottomright deprecated, use drawArea instead
             * @property {Object} currenttime
             * @property {Object[]} best
             * @property {?Object} userData - Arbitrary subscriber-defined object.
             */
            this.viewer.raiseEvent('update-level', {
                tiledImage: this,
                havedrawn: true, // deprecated, kept for backwards compatibility
                level: level,
                opacity: levelOpacity,
                visibility: levelVisibility,
                drawArea: drawArea,
                topleft: drawTopLeftBound,
                bottomright: drawBottomRightBound,
                currenttime: currentTime,
                best: best
            });
        }

        var updatedTiles = this._updateDrawArea(level,
            levelVisibility, drawArea, currentTime);

        if (loadArea) {
            best = this._updateLoadArea(level, loadArea, currentTime, best);
        }

        return {
            bestTiles: best,
            updatedTiles: updatedTiles
        };
    },

    /**
     * Visit all tiles in an a given area on a given level.
     * @private
     * @param {Number} level
     * @param {OpenSeadragon.Rect} area
     * @param {Function} callback - TiledImage, x, y, total
     */
    _visitTiles: function(level, area, callback) {
        var topLeftBound = area.getBoundingBox().getTopLeft();
        var bottomRightBound = area.getBoundingBox().getBottomRight();

        var drawCornerTiles = this._getCornerTiles(level, topLeftBound, bottomRightBound);
        var drawTopLeftTile = drawCornerTiles.topLeft;
        var drawBottomRightTile = drawCornerTiles.bottomRight;


        var numberOfTiles  = this.source.getNumTiles(level);

        if (this.getFlip()) {
            // The right-most tile can be narrower than the others. When flipped,
            // this tile is now on the left. Because it is narrower than the normal
            // left-most tile, the subsequent tiles may not be wide enough to completely
            // fill the viewport. Fix this by rendering an extra column of tiles. If we
            // are not wrapping, make sure we never render more than the number of tiles
            // in the image.
            drawBottomRightTile.x += 1;
            if (!this.wrapHorizontal) {
                drawBottomRightTile.x  = Math.min(drawBottomRightTile.x, numberOfTiles.x - 1);
            }
        }
        var numTiles = Math.max(0, (drawBottomRightTile.x - drawTopLeftTile.x) * (drawBottomRightTile.y - drawTopLeftTile.y));

        for (var x = drawTopLeftTile.x; x <= drawBottomRightTile.x; x++) {
            for (var y = drawTopLeftTile.y; y <= drawBottomRightTile.y; y++) {

                var flippedX;
                if (this.getFlip()) {
                    var xMod = ( numberOfTiles.x + ( x % numberOfTiles.x ) ) % numberOfTiles.x;
                    flippedX = x + numberOfTiles.x - xMod - xMod - 1;
                } else {
                    flippedX = x;
                }

                if (area.intersection(this.getTileBounds(level, flippedX, y)) === null) {
                    // This tile is not in the draw area
                    continue;
                }

                callback(this, flippedX, y, numTiles);
            }
        }


    },

      /**
     * Updates draw information for all tiles at a given level in the area
     * @private
     * @param {Number} level
     * @param {Number} levelOpacity
     * @param {Number} levelVisibility
     * @param {OpenSeadragon.Rect} drawArea
     * @param {Number} currentTime
     * @param {OpenSeadragon.Tile[]} best Array of the current best tiles
     * @returns {OpenSeadragon.Tile[]} Updated tiles
     */
    _updateDrawArea: function(level,
                            levelVisibility, drawArea, currentTime) {
        var numberOfTiles  = this.source.getNumTiles(level);
        var viewportCenter = this.viewport.pixelFromPoint(this.viewport.getCenter());
        this._resetCoverage(this.coverage, level);

        var tiles = null;
        var tileIndex = 0;

        this._visitTiles(level, drawArea, function(tiledImage, x, y, total) {
            if (!tiles) {
                tiles = new Array(total);
            }
            tiles[tileIndex] = tiledImage._updateTile(
                x, y,
                level,
                levelVisibility,
                viewportCenter,
                numberOfTiles,
                currentTime
            );

            tileIndex += 1;

        });

        return tiles || [];
    },

        /**
     * Updates load information for all tiles at a given level in the area
     * @private
     * @param {Number} level
     * @param {OpenSeadragon.Rect} loadArea
     * @param {Number} currentTime
     * @param {OpenSeadragon.Tile[]} best Array of the current best tiles to load
     * @returns {OpenSeadragon.Tile[]} The new best tiles to load
     */
    _updateLoadArea: function(level, loadArea, currentTime, best) {
        this._resetCoverage(this.loadingCoverage, level);
        var numberOfTiles  = this.source.getNumTiles(level);

        this._visitTiles(level, loadArea, function(tiledImage, x, y, _) {
            best = tiledImage._considerTileForLoad(
                x, y,
                level,
                numberOfTiles,
                currentTime,
                best
            );

        });

        return best;
    },

    /**
     * @private
     * @param {OpenSeadragon.Tile} tile
     * @param {Boolean} overlap
     * @param {OpenSeadragon.Viewport} viewport
     * @param {OpenSeadragon.Point} viewportCenter
     * @param {Number} levelVisibility
     */
    _positionTile: function( tile, overlap, viewport, viewportCenter, levelVisibility ){
        var boundsTL = tile.bounds.getTopLeft();

        boundsTL.x *= this._scaleSpring.current.value;
        boundsTL.y *= this._scaleSpring.current.value;
        boundsTL.x += this._xSpring.current.value;
        boundsTL.y += this._ySpring.current.value;

        var boundsSize   = tile.bounds.getSize();

        boundsSize.x *= this._scaleSpring.current.value;
        boundsSize.y *= this._scaleSpring.current.value;

        tile.positionedBounds.x = boundsTL.x;
        tile.positionedBounds.y = boundsTL.y;
        tile.positionedBounds.width = boundsSize.x;
        tile.positionedBounds.height = boundsSize.y;

        var positionC = viewport.pixelFromPointNoRotate(boundsTL, true),
            positionT = viewport.pixelFromPointNoRotate(boundsTL, false),
            sizeC = viewport.deltaPixelsFromPointsNoRotate(boundsSize, true),
            sizeT = viewport.deltaPixelsFromPointsNoRotate(boundsSize, false),
            tileCenter = positionT.plus( sizeT.divide( 2 ) ),
            tileSquaredDistance = viewportCenter.squaredDistanceTo( tileCenter );

        if(this.viewer.drawer.minimumOverlapRequired(this)){
            if ( !overlap ) {
                sizeC = sizeC.plus( new $.Point(1, 1));
            }

            if (tile.isRightMost && this.wrapHorizontal) {
                sizeC.x += 0.75; // Otherwise Firefox and Safari show seams
            }

            if (tile.isBottomMost && this.wrapVertical) {
                sizeC.y += 0.75; // Otherwise Firefox and Safari show seams
            }
        }

        tile.position   = positionC;
        tile.size       = sizeC;
        tile.squaredDistance   = tileSquaredDistance;
        tile.visibility = levelVisibility;
    },

    /**
     * Update a single tile at a particular resolution level.
     * @private
     * @param {Number} x
     * @param {Number} y
     * @param {Number} level
     * @param {Number} levelVisibility
     * @param {OpenSeadragon.Point} viewportCenter
     * @param {Number} numberOfTiles
     * @param {Number} currentTime
     * @returns {OpenSeadragon.Tile} the updated Tile
     */
    _updateTile: function( x, y, level,
                            levelVisibility, viewportCenter, numberOfTiles, currentTime){

        const tile = this._getTile(
            x, y,
            level,
            currentTime,
            numberOfTiles
        );


        if( this.viewer ){
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
            this.viewer.raiseEvent( 'update-tile', {
                tiledImage: this,
                tile: tile
            });
        }

        this._setCoverage( this.coverage, level, x, y, false );

        if ( !tile.exists ) {
            return tile;
        }
        if (tile.loaded && tile.opacity === 1){
            this._setCoverage( this.coverage, level, x, y, true );
        }
        this._positionTile(
            tile,
            this.source.tileOverlap,
            this.viewport,
            viewportCenter,
            levelVisibility
        );

        return tile;
    },

    /**
     * Consider a tile for loading
     * @private
     * @param {Number} x
     * @param {Number} y
     * @param {Number} level
     * @param {Number} numberOfTiles
     * @param {Number} currentTime
     * @param {OpenSeadragon.Tile[]} best - The current "best" tiles to draw.
     * @returns {OpenSeadragon.Tile[]}  - The updated "best" tiles to draw.
     */
    _considerTileForLoad: function( x, y, level, numberOfTiles, currentTime, best){

        const tile = this._getTile(
            x, y,
            level,
            currentTime,
            numberOfTiles
        );


        var loadingCoverage = tile.loaded || tile.loading || this._isCovered(this.loadingCoverage, level, x, y);
        this._setCoverage(this.loadingCoverage, level, x, y, loadingCoverage);


        if ( !tile.exists ) {
            return best;
        }

        // Try-find will populate tile with data if equal tile exists in system
        if (!tile.loaded && !tile.loading && this._tryFindTileCacheRecord(tile)) {
            loadingCoverage = true;
        }

        if ( tile.loading ) {
            // the tile is already in the download queue
            this._tilesLoading++;
        } else if (!loadingCoverage) {
            // add tile to best tiles to load only when not loaded already
            best = this._compareTiles( best, tile, this._currentMaxTilesPerFrame );
            if (this._currentMaxTilesPerFrame > this.maxTilesPerFrame) {
                this._currentMaxTilesPerFrame = Math.max(Math.ceil(this.maxTilesPerFrame / 2), this.maxTilesPerFrame);
            }
        }

        return best;
    },

    // private
    _getCornerTiles: function(level, topLeftBound, bottomRightBound) {
        var leftX;
        var rightX;
        if (this.wrapHorizontal) {
            leftX = $.positiveModulo(topLeftBound.x, 1);
            rightX = $.positiveModulo(bottomRightBound.x, 1);
        } else {
            leftX = Math.max(0, topLeftBound.x);
            rightX = Math.min(1, bottomRightBound.x);
        }
        var topY;
        var bottomY;
        var aspectRatio = 1 / this.source.aspectRatio;
        if (this.wrapVertical) {
            topY = $.positiveModulo(topLeftBound.y, aspectRatio);
            bottomY = $.positiveModulo(bottomRightBound.y, aspectRatio);
        } else {
            topY = Math.max(0, topLeftBound.y);
            bottomY = Math.min(aspectRatio, bottomRightBound.y);
        }

        var topLeftTile = this.source.getTileAtPoint(level, new $.Point(leftX, topY));
        var bottomRightTile = this.source.getTileAtPoint(level, new $.Point(rightX, bottomY));
        var numTiles  = this.source.getNumTiles(level);

        if (this.wrapHorizontal) {
            topLeftTile.x += numTiles.x * Math.floor(topLeftBound.x);
            bottomRightTile.x += numTiles.x * Math.floor(bottomRightBound.x);
        }
        if (this.wrapVertical) {
            topLeftTile.y += numTiles.y * Math.floor(topLeftBound.y / aspectRatio);
            bottomRightTile.y += numTiles.y * Math.floor(bottomRightBound.y / aspectRatio);
        }

        return {
            topLeft: topLeftTile,
            bottomRight: bottomRightTile,
        };
    },

    /**
     * @private
     * @inner
     * Try to find existing cache of the tile
     * @param {OpenSeadragon.Tile} tile
     */
    _tryFindTileCacheRecord: function(tile) {
        let record = this._tileCache.getCacheRecord(tile.originalCacheKey);

        if (!record) {
            return false;
        }
        tile.loading = true;
        this._setTileLoaded(tile, record.data, null, null, record.type);
        return true;
    },

    /**
     * @private
     * @inner
     * Obtains a tile at the given location.
     * @private
     * @param {Number} x
     * @param {Number} y
     * @param {Number} level
     * @param {Number} time
     * @param {Number} numTiles
     * @returns {OpenSeadragon.Tile}
     */
    _getTile: function(
        x, y,
        level,
        time,
        numTiles
    ) {
        var xMod,
            yMod,
            bounds,
            sourceBounds,
            exists,
            urlOrGetter,
            post,
            ajaxHeaders,
            tile,
            tilesMatrix = this.tilesMatrix,
            tileSource = this.source;

        if ( !tilesMatrix[ level ] ) {
            tilesMatrix[ level ] = {};
        }
        if ( !tilesMatrix[ level ][ x ] ) {
            tilesMatrix[ level ][ x ] = {};
        }

        if ( !tilesMatrix[ level ][ x ][ y ] || !tilesMatrix[ level ][ x ][ y ].flipped !== !this.flipped ) {
            xMod    = ( numTiles.x + ( x % numTiles.x ) ) % numTiles.x;
            yMod    = ( numTiles.y + ( y % numTiles.y ) ) % numTiles.y;
            bounds  = this.getTileBounds( level, x, y );
            sourceBounds = tileSource.getTileBounds( level, xMod, yMod, true );
            exists  = tileSource.tileExists( level, xMod, yMod );
            urlOrGetter     = tileSource.getTileUrl( level, xMod, yMod );
            post    = tileSource.getTilePostData( level, xMod, yMod );

            // Headers are only applicable if loadTilesWithAjax is set
            if (this.loadTilesWithAjax) {
                ajaxHeaders = tileSource.getTileAjaxHeaders( level, xMod, yMod );
                // Combine tile AJAX headers with tiled image AJAX headers (if applicable)
                if ($.isPlainObject(this.ajaxHeaders)) {
                    ajaxHeaders = $.extend({}, this.ajaxHeaders, ajaxHeaders);
                }
            } else {
                ajaxHeaders = null;
            }

            tile = new $.Tile(
                level,
                x,
                y,
                bounds,
                exists,
                urlOrGetter,
                undefined,
                this.loadTilesWithAjax,
                ajaxHeaders,
                sourceBounds,
                post,
                tileSource.getTileHashKey(level, xMod, yMod, urlOrGetter, ajaxHeaders, post)
            );

            if (this.getFlip()) {
                if (xMod === 0) {
                    tile.isRightMost = true;
                }
            } else {
                if (xMod === numTiles.x - 1) {
                    tile.isRightMost = true;
                }
            }

            if (yMod === numTiles.y - 1) {
                tile.isBottomMost = true;
            }

            tile.flipped = this.flipped;

            tilesMatrix[ level ][ x ][ y ] = tile;
        }

        tile = tilesMatrix[ level ][ x ][ y ];
        tile.lastTouchTime = time;

        return tile;
    },

    /**
     * Dispatch a job to the ImageLoader to load the Image for a Tile.
     * @private
     * @param {OpenSeadragon.Tile} tile
     * @param {Number} time
     */
    _loadTile: function(tile, time ) {
        var _this = this;
        tile.loading = true;
        tile.tiledImage = this;
        if (!this._imageLoader.addJob({
            src: tile.getUrl(),
            tile: tile,
            source: this.source,
            postData: tile.postData,
            loadWithAjax: tile.loadWithAjax,
            ajaxHeaders: tile.ajaxHeaders,
            crossOriginPolicy: this.crossOriginPolicy,
            ajaxWithCredentials: this.ajaxWithCredentials,
            callback: function( data, errorMsg, tileRequest, dataType ){
                _this._onTileLoad( tile, time, data, errorMsg, tileRequest, dataType );
            },
            abort: function() {
                tile.loading = false;
            }
        })) {
            /**
             * Triggered if tile load job was added to a full queue.
             * This allows to react upon e.g. network not being able to serve the tiles fast enough.
             * @event job-queue-full
             * @memberof OpenSeadragon.Viewer
             * @type {object}
             * @property {OpenSeadragon.Tile} tile - The tile that failed to load.
             * @property {OpenSeadragon.TiledImage} tiledImage - The tiled image the tile belongs to.
             * @property {number} time - The time in milliseconds when the tile load began.
             */
            this.viewer.raiseEvent("job-queue-full", {
                tile: tile,
                tiledImage: this,
                time: time,
            });
        }
    },

    /**
     * Callback fired when a Tile's Image finished downloading.
     * @private
     * @param {OpenSeadragon.Tile} tile
     * @param {Number} time
     * @param {*} data image data
     * @param {String} errorMsg
     * @param {XMLHttpRequest} tileRequest
     * @param {String} [dataType=undefined] data type, derived automatically if not set
     */
    _onTileLoad: function( tile, time, data, errorMsg, tileRequest, dataType ) {
        //data is set to null on error by image loader, allow custom falsey values (e.g. 0)
        if ( data === null || data === undefined ) {
            $.console.error( "Tile %s failed to load: %s - error: %s", tile, tile.getUrl(), errorMsg );
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
             * @property {XMLHttpRequest} tileRequest - The XMLHttpRequest used to load the tile if available.
             */
            this.viewer.raiseEvent("tile-load-failed", {
                tile: tile,
                tiledImage: this,
                time: time,
                message: errorMsg,
                tileRequest: tileRequest
            });
            tile.loading = false;
            tile.exists = false;
            return;
        } else {
            tile.exists = true;
        }

        if ( time < this.lastResetTime ) {
            $.console.warn( "Ignoring tile %s loaded before reset: %s", tile, tile.getUrl() );
            tile.loading = false;
            return;
        }

        this._setTileLoaded(tile, data, null, tileRequest, dataType);
    },

    /**
     * @private
     * @param {OpenSeadragon.Tile} tile
     * @param {*} data image data, the data sent to ImageJob.prototype.finish(), by default an Image object,
     *   can be null: in that case, cache is assigned to a tile without further processing
     * @param {?Number} cutoff ignored, @deprecated
     * @param {?XMLHttpRequest} tileRequest
     * @param {?String} [dataType=undefined] data type, derived automatically if not set
     */
    _setTileLoaded: function(tile, data, cutoff, tileRequest, dataType) {
        tile.tiledImage = this; //unloaded with tile.unload(), so we need to set it back
        // does nothing if tile.cacheKey already present

        let tileCacheCreated = false;
        tile.addCache(tile.cacheKey, () => {
            tileCacheCreated = true;
            return data;
        }, dataType, false, false);

        let resolver = null,
            increment = 0,
            eventFinished = false;
        const _this = this,
            now = $.now();

        function completionCallback() {
            increment--;
            if (increment > 0) {
                return;
            }
            eventFinished = true;

            //do not override true if set (false is default)
            tile.hasTransparency = tile.hasTransparency || _this.source.hasTransparency(
                undefined, tile.getUrl(), tile.ajaxHeaders, tile.postData
            );
            tile.loading = false;
            tile.loaded = true;
            _this.redraw();
            resolver(tile);
        }

        function getCompletionCallback() {
            if (eventFinished) {
                $.console.error("Event 'tile-loaded' argument getCompletionCallback must be called synchronously. " +
                    "Its return value should be called asynchronously.");
            }
            increment++;
            return completionCallback;
        }

        function markTileAsReady() {
            const fallbackCompletion = getCompletionCallback();

            /**
             * Triggered when a tile has just been loaded in memory. That means that the
             * image has been downloaded and can be modified before being drawn to the canvas.
             * This event is _awaiting_, it supports asynchronous functions or functions that return a promise.
             *
             * @event tile-loaded
             * @memberof OpenSeadragon.Viewer
             * @type {object}
             * @property {Image|*} image - The image (data) of the tile. Deprecated.
             * @property {*} data image data, the data sent to ImageJob.prototype.finish(),
             *   by default an Image object. Deprecated
             * @property {String} dataType type of the data
             * @property {OpenSeadragon.TiledImage} tiledImage - The tiled image of the loaded tile.
             * @property {OpenSeadragon.Tile} tile - The tile which has been loaded.
             * @property {XMLHttpRequest} tileRequest - The AJAX request that loaded this tile (if applicable).
             * @property {OpenSeadragon.Promise} - Promise resolved when the tile gets fully loaded.
             *  NOTE: do no await the promise in the handler: you will create a deadlock!
             * @property {function} getCompletionCallback - deprecated
             */
            _this.viewer.raiseEventAwaiting("tile-loaded", {
                tile: tile,
                tiledImage: _this,
                tileRequest: tileRequest,
                promise: new $.Promise(resolve => {
                    resolver = resolve;
                }),
                get image() {
                    $.console.error("[tile-loaded] event 'image' has been deprecated. Use 'tile-invalidated' event to modify data instead.");
                    return data;
                },
                get data() {
                    $.console.error("[tile-loaded] event 'data' has been deprecated. Use 'tile-invalidated' event to modify data instead.");
                    return data;
                },
                getCompletionCallback: function () {
                    $.console.error("[tile-loaded] getCompletionCallback is deprecated: it introduces race conditions: " +
                        "use async event handlers instead, execution order is deducted by addHandler(...) priority argument.");
                    return getCompletionCallback();
                },
            }).catch(() => {
                $.console.error("[tile-loaded] event finished with failure: there might be a problem with a plugin you are using.");
            }).then(fallbackCompletion);
        }


        if (tileCacheCreated) {
            _this.viewer.world.requestTileInvalidateEvent([tile], now, false, true).then(markTileAsReady);
        } else {
            // Tile-invalidated not called on each tile, but only on tiles with new data! Verify we share the main cache
            const origCache = tile.getCache(tile.originalCacheKey);
            for (let t of origCache._tiles) {

                // if there exists a tile that has different main cache, inherit it as a main cache
                if (t.cacheKey !== tile.cacheKey) {

                    // add reference also to the main cache, no matter what the other tile state has
                    // completion of the invaldate event should take care of all such tiles
                    const targetMainCache = t.getCache();
                    tile.setCache(t.cacheKey, targetMainCache, true, false);
                    break;
                } else if (t.processing) {
                    // Await once processing finishes - mark tile as loaded
                    t.processingPromise.then(t => {
                        const targetMainCache = t.getCache();
                        tile.setCache(t.cacheKey, targetMainCache, true, false);
                        markTileAsReady();
                    });
                    return;
                }
            }
            markTileAsReady();
        }
    },


    /**
     * Determines the 'best tiles' from the given 'last best' tiles and the
     * tile in question.
     * @private
     *
     * @param {OpenSeadragon.Tile[]} previousBest The best tiles so far.
     * @param {OpenSeadragon.Tile} tile The new tile to consider.
     * @param {Number} maxNTiles The max number of best tiles.
     * @returns {OpenSeadragon.Tile[]} The new best tiles.
     */
    _compareTiles: function( previousBest, tile, maxNTiles ) {
        if ( !previousBest ) {
            return [tile];
        }
        previousBest.push(tile);
        this._sortTiles(previousBest);
        if (previousBest.length > maxNTiles) {
            previousBest.pop();
        }
        return previousBest;
    },

    /**
     * Sorts tiles in an array according to distance and visibility.
     * @private
     *
     * @param {OpenSeadragon.Tile[]} tiles The tiles.
     */
    _sortTiles: function( tiles ) {
        tiles.sort(function (a, b) {
            if (a === null) {
                return 1;
            }
            if (b === null) {
                return -1;
            }
            if (a.visibility === b.visibility) {
                // sort by smallest squared distance
                return (a.squaredDistance - b.squaredDistance);
            } else {
                // sort by largest visibility value
                return (b.visibility - a.visibility);
            }
        });
    },

    /**
     * Returns true if the given tile provides coverage to lower-level tiles of
     * lower resolution representing the same content. If neither x nor y is
     * given, returns true if the entire visible level provides coverage.
     *
     * Note that out-of-bounds tiles provide coverage in this sense, since
     * there's no content that they would need to cover. Tiles at non-existent
     * levels that are within the image bounds, however, do not.
     * @private
     *
     * @param {Object} coverage - A '3d' dictionary [level][x][y] --> Boolean.
     * @param {Number} level - The resolution level of the tile.
     * @param {Number} x - The X position of the tile.
     * @param {Number} y - The Y position of the tile.
     * @returns {Boolean}
     */
    _providesCoverage: function( coverage, level, x, y ) {
        var rows,
            cols,
            i, j;

        if ( !coverage[ level ] ) {
            return false;
        }

        if ( x === undefined || y === undefined ) {
            rows = coverage[ level ];
            for ( i in rows ) {
                if ( Object.prototype.hasOwnProperty.call( rows, i ) ) {
                    cols = rows[ i ];
                    for ( j in cols ) {
                        if ( Object.prototype.hasOwnProperty.call( cols, j ) && !cols[ j ] ) {
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
    },

    /**
     * Returns true if the given tile is completely covered by higher-level
     * tiles of higher resolution representing the same content. If neither x
     * nor y is given, returns true if the entire visible level is covered.
     * @private
     *
     * @param {Object} coverage - A '3d' dictionary [level][x][y] --> Boolean.
     * @param {Number} level - The resolution level of the tile.
     * @param {Number} x - The X position of the tile.
     * @param {Number} y - The Y position of the tile.
     * @returns {Boolean}
     */
    _isCovered: function( coverage, level, x, y ) {
        if ( x === undefined || y === undefined ) {
            return this._providesCoverage( coverage, level + 1 );
        } else {
            return (
                this._providesCoverage( coverage, level + 1, 2 * x, 2 * y ) &&
                this._providesCoverage( coverage, level + 1, 2 * x, 2 * y + 1 ) &&
                this._providesCoverage( coverage, level + 1, 2 * x + 1, 2 * y ) &&
                this._providesCoverage( coverage, level + 1, 2 * x + 1, 2 * y + 1 )
            );
        }
    },

    /**
     * Sets whether the given tile provides coverage or not.
     * @private
     *
     * @param {Object} coverage - A '3d' dictionary [level][x][y] --> Boolean.
     * @param {Number} level - The resolution level of the tile.
     * @param {Number} x - The X position of the tile.
     * @param {Number} y - The Y position of the tile.
     * @param {Boolean} covers - Whether the tile provides coverage.
     */
    _setCoverage: function( coverage, level, x, y, covers ) {
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
    },

    /**
     * Resets coverage information for the given level. This should be called
     * after every draw routine. Note that at the beginning of the next draw
     * routine, coverage for every visible tile should be explicitly set.
     * @private
     *
     * @param {Object} coverage - A '3d' dictionary [level][x][y] --> Boolean.
     * @param {Number} level - The resolution level of tiles to completely reset.
     */
    _resetCoverage: function( coverage, level ) {
        coverage[ level ] = {};
    }
});



}( OpenSeadragon ));
