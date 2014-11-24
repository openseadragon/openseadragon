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
 * @param {Number} [options.x=0] - Left position, in world coordinates.
 * @param {Number} [options.y=0] - Top position, in world coordinates.
 * @param {Number} [options.width=1] - Width, in world coordinates.
 * @param {Number} [options.height] - Height, in world coordinates.
 * @param {Number} [options.minZoomImageRatio] - See {@link OpenSeadragon.Options}.
 * @param {Boolean} [options.wrapHorizontal] - See {@link OpenSeadragon.Options}.
 * @param {Boolean} [options.wrapVertical] - See {@link OpenSeadragon.Options}.
 * @param {Boolean} [options.immediateRender] - See {@link OpenSeadragon.Options}.
 * @param {Number} [options.blendTime] - See {@link OpenSeadragon.Options}.
 * @param {Boolean} [options.alwaysBlend] - See {@link OpenSeadragon.Options}.
 * @param {Number} [options.minPixelRatio] - See {@link OpenSeadragon.Options}.
 * @param {Boolean} [options.debugMode] - See {@link OpenSeadragon.Options}.
 * @param {String|Boolean} [options.crossOriginPolicy] - See {@link OpenSeadragon.Options}.
 */
$.TiledImage = function( options ) {
    $.console.assert( options.tileCache, "[TiledImage] options.tileCache is required" );
    $.console.assert( options.drawer, "[TiledImage] options.drawer is required" );
    $.console.assert( options.viewer, "[TiledImage] options.viewer is required" );
    $.console.assert( options.imageLoader, "[TiledImage] options.imageLoader is required" );
    $.console.assert( options.source, "[TiledImage] options.source is required" );

    $.EventSource.call( this );

    this._tileCache = options.tileCache;
    delete options.tileCache;

    this._drawer = options.drawer;
    delete options.drawer;

    this._imageLoader = options.imageLoader;
    delete options.imageLoader;

    this._worldX = options.x || 0;
    delete options.x;
    this._worldY = options.y || 0;
    delete options.y;

    // Ratio of zoomable image height to width.
    this.normHeight = options.source.dimensions.y / options.source.dimensions.x;
    this.contentAspectX = options.source.dimensions.x / options.source.dimensions.y;

    if ( options.width ) {
        this._setScale(options.width);
        delete options.width;

        if ( options.height ) {
            $.console.error( "specifying both width and height to a tiledImage is not supported" );
            delete options.height;
        }
    } else if ( options.height ) {
        this._setScale(options.height / this.normHeight);
        delete options.height;
    } else {
        this._setScale(1);
    }

    $.extend( true, this, {

        //internal state properties
        viewer:         null,
        tilesMatrix:    {},    // A '3d' dictionary [level][x][y] --> Tile.
        coverage:       {},    // A '3d' dictionary [level][x][y] --> Boolean.
        lastDrawn:      [],    // An unordered list of Tiles drawn last frame.
        lastResetTime:  0,     // Last time for which the tiledImage was reset.
        midUpdate:      false, // Is the tiledImage currently updating the viewport?
        updateAgain:    true,  // Does the tiledImage need to update the viewport again?

        //configurable settings
        minZoomImageRatio:  $.DEFAULT_SETTINGS.minZoomImageRatio,
        wrapHorizontal:     $.DEFAULT_SETTINGS.wrapHorizontal,
        wrapVertical:       $.DEFAULT_SETTINGS.wrapVertical,
        immediateRender:    $.DEFAULT_SETTINGS.immediateRender,
        blendTime:          $.DEFAULT_SETTINGS.blendTime,
        alwaysBlend:        $.DEFAULT_SETTINGS.alwaysBlend,
        minPixelRatio:      $.DEFAULT_SETTINGS.minPixelRatio,
        debugMode:          $.DEFAULT_SETTINGS.debugMode,
        crossOriginPolicy:  $.DEFAULT_SETTINGS.crossOriginPolicy

    }, options );
};

$.extend($.TiledImage.prototype, $.EventSource.prototype, /** @lends OpenSeadragon.TiledImage.prototype */{
    /**
     * @returns {Boolean} Whether the TiledImage is scheduled for an update at the
     * soonest possible opportunity.
     */
    needsUpdate: function() {
        return this.updateAgain;
    },

    /**
     * Clears all tiles and triggers an update on the next call to
     * {@link OpenSeadragon.TiledImage#update}.
     */
    reset: function() {
        this._tileCache.clearTilesFor(this);
        this.lastResetTime = $.now();
        this.updateAgain = true;
    },

    /**
     * Forces the TiledImage to update.
     */
    update: function() {
        this.midUpdate = true;
        updateViewport( this );
        this.midUpdate = false;
    },

    /**
     * Destroy the TiledImage (unload current loaded tiles).
     */
    destroy: function() {
        this.reset();
    },

    /**
     * @returns {OpenSeadragon.Rect} This TiledImage's bounds in world coordinates.
     */
    getBounds: function() {
        return new $.Rect( this._worldX, this._worldY, this._worldWidth, this._worldHeight );
    },

    // deprecated
    getWorldBounds: function() {
        $.console.error('[TiledImage.getWorldBounds] is deprecated; use TiledImage.getBounds instead');
        return this.getBounds();
    },

    /**
     * @returns {OpenSeadragon.Point} This TiledImage's content size, in original pixels.
     */
    getContentSize: function() {
        return new $.Point(this.source.dimensions.x, this.source.dimensions.y);
    },

    // private
    _viewportToImageDelta: function( viewerX, viewerY ) {
        return new $.Point(viewerX * (this.source.dimensions.x / this._scale),
            viewerY * ((this.source.dimensions.y * this.contentAspectX) / this._scale));
    },

    /**
     * Translates from OpenSeadragon viewer coordinate system to image coordinate system.
     * This method can be called either by passing X,Y coordinates or an
     * OpenSeadragon.Point
     * @function
     * @param {OpenSeadragon.Point} viewerX the point in viewport coordinate system.
     * @param {Number} viewerX X coordinate in viewport coordinate system.
     * @param {Number} viewerY Y coordinate in viewport coordinate system.
     * @return {OpenSeadragon.Point} a point representing the coordinates in the image.
     */
    viewportToImageCoordinates: function( viewerX, viewerY ) {
        if ( arguments.length == 1 ) {
            //they passed a point instead of individual components
            return this.viewportToImageCoordinates( viewerX.x, viewerX.y );
        }

        return this._viewportToImageDelta(viewerX - this._worldX, viewerY - this._worldY);
    },

    // private
    _imageToViewportDelta: function( imageX, imageY ) {
        return new $.Point((imageX / this.source.dimensions.x) * this._scale,
            (imageY / this.source.dimensions.y / this.contentAspectX) * this._scale);
    },

    /**
     * Translates from image coordinate system to OpenSeadragon viewer coordinate system
     * This method can be called either by passing X,Y coordinates or an
     * OpenSeadragon.Point
     * @function
     * @param {OpenSeadragon.Point} imageX the point in image coordinate system.
     * @param {Number} imageX X coordinate in image coordinate system.
     * @param {Number} imageY Y coordinate in image coordinate system.
     * @return {OpenSeadragon.Point} a point representing the coordinates in the viewport.
     */
    imageToViewportCoordinates: function( imageX, imageY ) {
        if ( arguments.length == 1 ) {
            //they passed a point instead of individual components
            return this.imageToViewportCoordinates( imageX.x, imageX.y );
        }

        var point = this._imageToViewportDelta(imageX, imageY);
        point.x += this._worldX;
        point.y += this._worldY;
        return point;
    },

    /**
     * Translates from a rectangle which describes a portion of the image in
     * pixel coordinates to OpenSeadragon viewport rectangle coordinates.
     * This method can be called either by passing X,Y,width,height or an
     * OpenSeadragon.Rect
     * @function
     * @param {OpenSeadragon.Rect} imageX the rectangle in image coordinate system.
     * @param {Number} imageX the X coordinate of the top left corner of the rectangle
     * in image coordinate system.
     * @param {Number} imageY the Y coordinate of the top left corner of the rectangle
     * in image coordinate system.
     * @param {Number} pixelWidth the width in pixel of the rectangle.
     * @param {Number} pixelHeight the height in pixel of the rectangle.
     */
    imageToViewportRectangle: function( imageX, imageY, pixelWidth, pixelHeight ) {
        var coordA,
            coordB,
            rect;
        if( arguments.length == 1 ) {
            //they passed a rectangle instead of individual components
            rect = imageX;
            return this.imageToViewportRectangle(
                rect.x, rect.y, rect.width, rect.height
            );
        }
        coordA = this.imageToViewportCoordinates(
            imageX, imageY
        );
        coordB = this._imageToViewportDelta(
            pixelWidth, pixelHeight
        );
        return new $.Rect(
            coordA.x,
            coordA.y,
            coordB.x,
            coordB.y
        );
    },

    /**
     * Translates from a rectangle which describes a portion of
     * the viewport in point coordinates to image rectangle coordinates.
     * This method can be called either by passing X,Y,width,height or an
     * OpenSeadragon.Rect
     * @function
     * @param {OpenSeadragon.Rect} viewerX the rectangle in viewport coordinate system.
     * @param {Number} viewerX the X coordinate of the top left corner of the rectangle
     * in viewport coordinate system.
     * @param {Number} imageY the Y coordinate of the top left corner of the rectangle
     * in viewport coordinate system.
     * @param {Number} pointWidth the width of the rectangle in viewport coordinate system.
     * @param {Number} pointHeight the height of the rectangle in viewport coordinate system.
     */
    viewportToImageRectangle: function( viewerX, viewerY, pointWidth, pointHeight ) {
        var coordA,
            coordB,
            rect;
        if ( arguments.length == 1 ) {
            //they passed a rectangle instead of individual components
            rect = viewerX;
            return this.viewportToImageRectangle(
                rect.x, rect.y, rect.width, rect.height
            );
        }
        coordA = this.viewportToImageCoordinates( viewerX, viewerY );
        coordB = this._viewportToImageDelta(pointWidth, pointHeight);
        return new $.Rect(
            coordA.x,
            coordA.y,
            coordB.x,
            coordB.y
        );
    },

    /**
     * Sets the TiledImage's position in the world.
     * @param {OpenSeadragon.Point} position - The new position, in world coordinates.
     * @fires OpenSeadragon.TiledImage.event:bounds-change
     */
    setPosition: function(position) {
        if (this._worldX === position.x && this._worldY === position.y) {
            return;
        }

        this._worldX = position.x;
        this._worldY = position.y;
        this.updateAgain = true;
        this._raiseBoundsChange();
    },

    /**
     * Sets the TiledImage's width in the world, adjusting the height to match based on aspect ratio.
     * @param {Number} width - The new width, in world coordinates.
     * @fires OpenSeadragon.TiledImage.event:bounds-change
     */
    setWidth: function(width) {
        if (this._worldWidth === width) {
            return;
        }

        this._setScale(width);
        this.updateAgain = true;
        this._raiseBoundsChange();
    },

    /**
     * Sets the TiledImage's height in the world, adjusting the width to match based on aspect ratio.
     * @param {Number} height - The new height, in world coordinates.
     * @fires OpenSeadragon.TiledImage.event:bounds-change
     */
    setHeight: function(height) {
        if (this._worldHeight === height) {
            return;
        }

        this._setScale(height / this.normHeight);
        this.updateAgain = true;
        this._raiseBoundsChange();
    },

    // private
    _setScale: function(scale) {
        this._scale = scale;
        this._worldWidth = this._scale;
        this._worldHeight = this.normHeight * this._scale;
    },

    // private
    _raiseBoundsChange: function() {
        /**
         * Raised when the TiledImage's bounds are changed.
         * @event bounds-change
         * @memberOf OpenSeadragon.TiledImage
         * @type {object}
         * @property {OpenSeadragon.World} eventSource - A reference to the TiledImage which raised the event.
         * @property {?Object} userData - Arbitrary subscriber-defined object.
         */
        this.raiseEvent('bounds-change');
    }
});

/**
 * @private
 * @inner
 * Pretty much every other line in this needs to be documented so it's clear
 * how each piece of this routine contributes to the drawing process.  That's
 * why there are so many TODO's inside this function.
 */
function updateViewport( tiledImage ) {

    tiledImage.updateAgain = false;

    var tile,
        level,
        best            = null,
        haveDrawn       = false,
        currentTime     = $.now(),
        viewportBounds  = tiledImage.viewport.getBoundsWithMargins( true ),
        zeroRatioC      = tiledImage.viewport.deltaPixelsFromPoints(
            tiledImage.source.getPixelRatio( 0 ),
            true
        ).x * tiledImage._scale,
        lowestLevel     = Math.max(
            tiledImage.source.minLevel,
            Math.floor(
                Math.log( tiledImage.minZoomImageRatio ) /
                Math.log( 2 )
            )
        ),
        highestLevel    = Math.min(
            Math.abs(tiledImage.source.maxLevel),
            Math.abs(Math.floor(
                Math.log( zeroRatioC / tiledImage.minPixelRatio ) /
                Math.log( 2 )
            ))
        ),
        degrees         = tiledImage.viewport.degrees,
        renderPixelRatioC,
        renderPixelRatioT,
        zeroRatioT,
        optimalRatio,
        levelOpacity,
        levelVisibility;

    viewportBounds.x -= tiledImage._worldX;
    viewportBounds.y -= tiledImage._worldY;

    // Reset tile's internal drawn state
    while ( tiledImage.lastDrawn.length > 0 ) {
        tile = tiledImage.lastDrawn.pop();
        tile.beingDrawn = false;
    }

    //Change bounds for rotation
    if (degrees === 90 || degrees === 270) {
        viewportBounds = viewportBounds.rotate( degrees );
    } else if (degrees !== 0 && degrees !== 180) {
        // This is just an approximation.
        var orthBounds = viewportBounds.rotate(90);
        viewportBounds.x -= orthBounds.width / 2;
        viewportBounds.y -= orthBounds.height / 2;
        viewportBounds.width += orthBounds.width;
        viewportBounds.height += orthBounds.height;
    }

    var viewportTL = viewportBounds.getTopLeft();
    var viewportBR = viewportBounds.getBottomRight();

    //Don't draw if completely outside of the viewport
    if  ( !tiledImage.wrapHorizontal && (viewportBR.x < 0 || viewportTL.x > tiledImage._worldWidth ) ) {
        return;
    }

    if ( !tiledImage.wrapVertical && ( viewportBR.y < 0 || viewportTL.y > tiledImage._worldHeight ) ) {
        return;
    }

    // Calculate viewport rect / bounds
    if ( !tiledImage.wrapHorizontal ) {
        viewportTL.x = Math.max( viewportTL.x, 0 );
        viewportBR.x = Math.min( viewportBR.x, tiledImage._worldWidth );
    }

    if ( !tiledImage.wrapVertical ) {
        viewportTL.y = Math.max( viewportTL.y, 0 );
        viewportBR.y = Math.min( viewportBR.y, tiledImage._worldHeight );
    }

    // Calculations for the interval of levels to draw
    // (above in initial var statement)
    // can return invalid intervals; fix that here if necessary
    lowestLevel = Math.min( lowestLevel, highestLevel );

    // Update any level that will be drawn
    var drawLevel; // FIXME: drawLevel should have a more explanatory name
    for ( level = highestLevel; level >= lowestLevel; level-- ) {
        drawLevel = false;

        //Avoid calculations for draw if we have already drawn this
        renderPixelRatioC = tiledImage.viewport.deltaPixelsFromPoints(
            tiledImage.source.getPixelRatio( level ),
            true
        ).x * tiledImage._scale;

        if ( ( !haveDrawn && renderPixelRatioC >= tiledImage.minPixelRatio ) ||
             ( level == lowestLevel ) ) {
            drawLevel = true;
            haveDrawn = true;
        } else if ( !haveDrawn ) {
            continue;
        }

        //Perform calculations for draw if we haven't drawn this
        renderPixelRatioT = tiledImage.viewport.deltaPixelsFromPoints(
            tiledImage.source.getPixelRatio( level ),
            false
        ).x * tiledImage._scale;

        zeroRatioT      = tiledImage.viewport.deltaPixelsFromPoints(
            tiledImage.source.getPixelRatio(
                Math.max(
                    tiledImage.source.getClosestLevel( tiledImage.viewport.containerSize ) - 1,
                    0
                )
            ),
            false
        ).x * tiledImage._scale;

        optimalRatio    = tiledImage.immediateRender ?
            1 :
            zeroRatioT;

        levelOpacity    = Math.min( 1, ( renderPixelRatioC - 0.5 ) / 0.5 );

        levelVisibility = optimalRatio / Math.abs(
            optimalRatio - renderPixelRatioT
        );

        // Update the level and keep track of 'best' tile to load
        best = updateLevel(
            tiledImage,
            haveDrawn,
            drawLevel,
            level,
            levelOpacity,
            levelVisibility,
            viewportTL,
            viewportBR,
            currentTime,
            best
        );

        // Stop the loop if lower-res tiles would all be covered by
        // already drawn tiles
        if (  providesCoverage( tiledImage.coverage, level ) ) {
            break;
        }
    }

    // Perform the actual drawing
    drawTiles( tiledImage, tiledImage.lastDrawn );

    // Load the new 'best' tile
    if ( best ) {
        loadTile( tiledImage, best, currentTime );
        // because we haven't finished drawing, so
        tiledImage.updateAgain = true;
    }

}


function updateLevel( tiledImage, haveDrawn, drawLevel, level, levelOpacity, levelVisibility, viewportTL, viewportBR, currentTime, best ){

    var x, y,
        tileTL,
        tileBR,
        numberOfTiles,
        viewportCenter  = tiledImage.viewport.pixelFromPoint( tiledImage.viewport.getCenter() );


    if( tiledImage.viewer ){
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
         * @property {Object} topleft
         * @property {Object} bottomright
         * @property {Object} currenttime
         * @property {Object} best
         * @property {?Object} userData - Arbitrary subscriber-defined object.
         */
        tiledImage.viewer.raiseEvent( 'update-level', {
            tiledImage: tiledImage,
            havedrawn: haveDrawn,
            level: level,
            opacity: levelOpacity,
            visibility: levelVisibility,
            topleft: viewportTL,
            bottomright: viewportBR,
            currenttime: currentTime,
            best: best
        });
    }

    //OK, a new drawing so do your calculations
    tileTL    = tiledImage.source.getTileAtPoint( level, viewportTL.divide( tiledImage._scale ));
    tileBR    = tiledImage.source.getTileAtPoint( level, viewportBR.divide( tiledImage._scale ));
    numberOfTiles  = tiledImage.source.getNumTiles( level );

    resetCoverage( tiledImage.coverage, level );

    if ( !tiledImage.wrapHorizontal ) {
        tileBR.x = Math.min( tileBR.x, numberOfTiles.x - 1 );
    }
    if ( !tiledImage.wrapVertical ) {
        tileBR.y = Math.min( tileBR.y, numberOfTiles.y - 1 );
    }

    for ( x = tileTL.x; x <= tileBR.x; x++ ) {
        for ( y = tileTL.y; y <= tileBR.y; y++ ) {

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
            tiledImage._worldWidth,
            tiledImage._worldHeight
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
        var imageRecord = tiledImage._tileCache.getImageRecord(tile.url);
        if (imageRecord) {
            tile.loaded = true;
            tile.image = imageRecord.getImage();

            tiledImage._tileCache.cacheTile({
                tile: tile,
                tiledImage: tiledImage
            });
        }
    }

    if ( tile.loaded ) {
        var needsUpdate = blendTile(
            tiledImage,
            tile,
            x, y,
            level,
            levelOpacity,
            currentTime
        );

        if ( needsUpdate ) {
            tiledImage.updateAgain = true;
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

        bounds.x += ( x - xMod ) / numTiles.x;
        bounds.y += (worldHeight / worldWidth) * (( y - yMod ) / numTiles.y);

        tilesMatrix[ level ][ x ][ y ] = new $.Tile(
            level,
            x,
            y,
            bounds,
            exists,
            url
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
        callback: function( image ){
            onTileLoad( tiledImage, tile, time, image );
        }
    });
}

function onTileLoad( tiledImage, tile, time, image ) {
    if ( !image ) {
        $.console.log( "Tile %s failed to load: %s", tile, tile.url );
        if( !tiledImage.debugMode ){
            tile.loading = false;
            tile.exists = false;
            return;
        }
    } else if ( time < tiledImage.lastResetTime ) {
        $.console.log( "Ignoring tile %s loaded before reset: %s", tile, tile.url );
        tile.loading = false;
        return;
    }

    var finish = function() {
        tile.loading = false;
        tile.loaded = true;
        tile.image  = image;

        var cutoff = Math.ceil( Math.log( tiledImage.source.getTileSize(tile.level) ) / Math.log( 2 ) );
        tiledImage._tileCache.cacheTile({
            tile: tile,
            cutoff: cutoff,
            tiledImage: tiledImage
        });
    };

    // Check if we're mid-update; this can happen on IE8 because image load events for
    // cached images happen immediately there
    if ( !tiledImage.midUpdate ) {
        finish();
    } else {
        // Wait until after the update, in case caching unloads any tiles
        window.setTimeout( finish, 1);
    }

    tiledImage.updateAgain = true;
}


function positionTile( tile, overlap, viewport, viewportCenter, levelVisibility, tiledImage ){
    var boundsTL     = tile.bounds.getTopLeft();

    boundsTL.x *= tiledImage._scale;
    boundsTL.y *= tiledImage._scale;
    boundsTL.x += tiledImage._worldX;
    boundsTL.y += tiledImage._worldY;

    var boundsSize   = tile.bounds.getSize();

    boundsSize.x *= tiledImage._scale;
    boundsSize.y *= tiledImage._scale;

    var positionC    = viewport.pixelFromPoint( boundsTL, true ),
        positionT    = viewport.pixelFromPoint( boundsTL, false ),
        sizeC        = viewport.deltaPixelsFromPoints( boundsSize, true ),
        sizeT        = viewport.deltaPixelsFromPoints( boundsSize, false ),
        tileCenter   = positionT.plus( sizeT.divide( 2 ) ),
        tileDistance = viewportCenter.distanceTo( tileCenter );

    if ( !overlap ) {
        sizeC = sizeC.plus( new $.Point( 1, 1 ) );
    }

    tile.position   = positionC;
    tile.size       = sizeC;
    tile.distance   = tileDistance;
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
        if ( tile.distance < previousBest.distance ) {
            return tile;
        }
    }

    return previousBest;
}

function drawTiles( tiledImage, lastDrawn ){
    var i,
        tile,
        tileKey,
        viewer,
        viewport,
        position,
        tileSource;

    for ( i = lastDrawn.length - 1; i >= 0; i-- ) {
        tile = lastDrawn[ i ];
        tiledImage._drawer.drawTile( tile );
        tile.beingDrawn = true;

        if( tiledImage.debugMode ){
            try{
                tiledImage._drawer.drawDebugInfo( tile, lastDrawn.length, i );
            }catch(e){
                $.console.error(e);
            }
        }

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
}

}( OpenSeadragon ));
