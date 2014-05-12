/*
 * OpenSeadragon - Drawer
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

var DEVICE_SCREEN       = $.getWindowSize(),
    BROWSER             = $.Browser.vendor,
    BROWSER_VERSION     = $.Browser.version,

    SUBPIXEL_RENDERING = (
        ( BROWSER == $.BROWSERS.FIREFOX ) ||
        ( BROWSER == $.BROWSERS.OPERA )   ||
        ( BROWSER == $.BROWSERS.SAFARI && BROWSER_VERSION >= 4 ) ||
        ( BROWSER == $.BROWSERS.CHROME && BROWSER_VERSION >= 2 ) ||
        ( BROWSER == $.BROWSERS.IE     && BROWSER_VERSION >= 9 )
    );


/**
 * @class Drawer
 * @classdesc Handles rendering of tiles for an {@link OpenSeadragon.Viewer}. 
 * A new instance is created for each TileSource opened (see {@link OpenSeadragon.Viewer#drawer}).
 *
 * @memberof OpenSeadragon
 * @param {OpenSeadragon.TileSource} source - Reference to Viewer tile source.
 * @param {OpenSeadragon.Viewport} viewport - Reference to Viewer viewport.
 * @param {Element} element - Parent element.
 */
$.Drawer = function( options ) {

    //backward compatibility for positional args while prefering more
    //idiomatic javascript options object as the only argument
    var args  = arguments,
        i;

    if( !$.isPlainObject( options ) ){
        options = {
            source:     args[ 0 ], // Reference to Viewer tile source.
            viewport:   args[ 1 ], // Reference to Viewer viewport.
            element:    args[ 2 ]  // Parent element.
        };
    }

    $.extend( true, this, {

        //internal state properties
        viewer:         null,
        imageLoader:    new $.ImageLoader(),
        tilesMatrix:    {},    // A '3d' dictionary [level][x][y] --> Tile.
        tilesLoaded:    [],    // An unordered list of Tiles with loaded images.
        coverage:       {},    // A '3d' dictionary [level][x][y] --> Boolean.
        lastDrawn:      [],    // An unordered list of Tiles drawn last frame.
        lastResetTime:  0,     // Last time for which the drawer was reset.
        midUpdate:      false, // Is the drawer currently updating the viewport?
        updateAgain:    true,  // Does the drawer need to update the viewort again?


        //internal state / configurable settings
        collectionOverlays: {}, // For collection mode. Here an overlay is actually a viewer.

        //configurable settings
        opacity:            $.DEFAULT_SETTINGS.opacity,
        maxImageCacheCount: $.DEFAULT_SETTINGS.maxImageCacheCount,
        minZoomImageRatio:  $.DEFAULT_SETTINGS.minZoomImageRatio,
        wrapHorizontal:     $.DEFAULT_SETTINGS.wrapHorizontal,
        wrapVertical:       $.DEFAULT_SETTINGS.wrapVertical,
        immediateRender:    $.DEFAULT_SETTINGS.immediateRender,
        blendTime:          $.DEFAULT_SETTINGS.blendTime,
        alwaysBlend:        $.DEFAULT_SETTINGS.alwaysBlend,
        minPixelRatio:      $.DEFAULT_SETTINGS.minPixelRatio,
        debugMode:          $.DEFAULT_SETTINGS.debugMode,
        timeout:            $.DEFAULT_SETTINGS.timeout,
        crossOriginPolicy:  $.DEFAULT_SETTINGS.crossOriginPolicy

    }, options );

    this.useCanvas  = $.supportsCanvas && ( this.viewer ? this.viewer.useCanvas : true );
    /**
     * The parent element of this Drawer instance, passed in when the Drawer was created.
     * The parent of {@link OpenSeadragon.Drawer#canvas}.
     * @member {Element} container
     * @memberof OpenSeadragon.Drawer#
     */
    this.container  = $.getElement( this.element );
    /**
     * A &lt;canvas&gt; element if the browser supports them, otherwise a &lt;div&gt; element.
     * Child element of {@link OpenSeadragon.Drawer#container}.
     * @member {Element} canvas
     * @memberof OpenSeadragon.Drawer#
     */
    this.canvas     = $.makeNeutralElement( this.useCanvas ? "canvas" : "div" );
    /**
     * 2d drawing context for {@link OpenSeadragon.Drawer#canvas} if it's a &lt;canvas&gt; element, otherwise null.
     * @member {Object} context
     * @memberof OpenSeadragon.Drawer#
     */
    this.context    = this.useCanvas ? this.canvas.getContext( "2d" ) : null;
    // Ratio of zoomable image height to width.
    this.normHeight = this.source.dimensions.y / this.source.dimensions.x;
    /**
     * @member {Element} element
     * @memberof OpenSeadragon.Drawer#
     * @deprecated Alias for {@link OpenSeadragon.Drawer#container}.
     */
    this.element    = this.container;

    // We force our container to ltr because our drawing math doesn't work in rtl.
    // This issue only affects our canvas renderer, but we do it always for consistency.
    // Note that this means overlays you want to be rtl need to be explicitly set to rtl.
    this.container.dir = 'ltr';

    this.canvas.style.width     = "100%";
    this.canvas.style.height    = "100%";
    this.canvas.style.position  = "absolute";
    $.setElementOpacity( this.canvas, this.opacity, true );

    // explicit left-align
    this.container.style.textAlign = "left";
    this.container.appendChild( this.canvas );

    //this.profiler    = new $.Profiler();
};

$.Drawer.prototype = /** @lends OpenSeadragon.Drawer.prototype */{

    /**
     * Adds an html element as an overlay to the current viewport.  Useful for
     * highlighting words or areas of interest on an image or other zoomable
     * interface.
     * @method
     * @param {Element|String|Object} element - A reference to an element or an id for
     *      the element which will overlayed. Or an Object specifying the configuration for the overlay
     * @param {OpenSeadragon.Point|OpenSeadragon.Rect} location - The point or
     *      rectangle which will be overlayed.
     * @param {OpenSeadragon.OverlayPlacement} placement - The position of the
     *      viewport which the location coordinates will be treated as relative
     *      to.
     * @param {function} onDraw - If supplied the callback is called when the overlay
     *      needs to be drawn. It it the responsibility of the callback to do any drawing/positioning.
     *      It is passed position, size and element.
     * @fires OpenSeadragon.Viewer.event:add-overlay
     * @deprecated - use {@link OpenSeadragon.Viewer#addOverlay} instead.
     */
    addOverlay: function( element, location, placement, onDraw ) {
        $.console.error("drawer.addOverlay is deprecated. Use viewer.addOverlay instead.");
        this.viewer.addOverlay( element, location, placement, onDraw );
        return this;
    },

    /**
     * Updates the overlay represented by the reference to the element or
     * element id moving it to the new location, relative to the new placement.
     * @method
     * @param {OpenSeadragon.Point|OpenSeadragon.Rect} location - The point or
     *      rectangle which will be overlayed.
     * @param {OpenSeadragon.OverlayPlacement} placement - The position of the
     *      viewport which the location coordinates will be treated as relative
     *      to.
     * @return {OpenSeadragon.Drawer} Chainable.
     * @fires OpenSeadragon.Viewer.event:update-overlay
     * @deprecated - use {@link OpenSeadragon.Viewer#updateOverlay} instead.
     */
    updateOverlay: function( element, location, placement ) {
        $.console.error("drawer.updateOverlay is deprecated. Use viewer.updateOverlay instead.");
        this.viewer.updateOverlay( element, location, placement );
        return this;
    },

    /**
     * Removes and overlay identified by the reference element or element id
     *      and schedules and update.
     * @method
     * @param {Element|String} element - A reference to the element or an
     *      element id which represent the ovelay content to be removed.
     * @return {OpenSeadragon.Drawer} Chainable.
     * @fires OpenSeadragon.Viewer.event:remove-overlay
     * @deprecated - use {@link OpenSeadragon.Viewer#removeOverlay} instead.
     */
    removeOverlay: function( element ) {
        $.console.error("drawer.removeOverlay is deprecated. Use viewer.removeOverlay instead.");
        this.viewer.removeOverlay( element );
        return this;
    },

    /**
     * Removes all currently configured Overlays from this Drawer and schedules
     *      and update.
     * @method
     * @return {OpenSeadragon.Drawer} Chainable.
     * @fires OpenSeadragon.Viewer.event:clear-overlay
     * @deprecated - use {@link OpenSeadragon.Viewer#clearOverlays} instead.
     */
    clearOverlays: function() {
        $.console.error("drawer.clearOverlays is deprecated. Use viewer.clearOverlays instead.");
        this.viewer.clearOverlays();
        return this;
    },

    /**
     * Set the opacity of the drawer.
     * @method
     * @param {Number} opacity
     * @return {OpenSeadragon.Drawer} Chainable.
     */
    setOpacity: function( opacity ) {
        this.opacity = opacity;
        $.setElementOpacity( this.canvas, this.opacity, true );
        return this;
    },

    /**
     * Get the opacity of the drawer.
     * @method
     * @returns {Number}
     */
    getOpacity: function() {
        return this.opacity;
    },
    /**
     * Returns whether the Drawer is scheduled for an update at the
     *      soonest possible opportunity.
     * @method
     * @returns {Boolean} - Whether the Drawer is scheduled for an update at the
     *      soonest possible opportunity.
     */
    needsUpdate: function() {
        return this.updateAgain;
    },

    /**
     * Returns the total number of tiles that have been loaded by this Drawer.
     * @method
     * @returns {Number} - The total number of tiles that have been loaded by
     *      this Drawer.
     */
    numTilesLoaded: function() {
        return this.tilesLoaded.length;
    },

    /**
     * Clears all tiles and triggers an update on the next call to
     * Drawer.prototype.update().
     * @method
     * @return {OpenSeadragon.Drawer} Chainable.
     */
    reset: function() {
        clearTiles( this );
        this.lastResetTime = $.now();
        this.updateAgain = true;
        return this;
    },

    /**
     * Forces the Drawer to update.
     * @method
     * @return {OpenSeadragon.Drawer} Chainable.
     */
    update: function() {
        //this.profiler.beginUpdate();
        this.midUpdate = true;
        updateViewport( this );
        this.midUpdate = false;
        //this.profiler.endUpdate();
        return this;
    },

    /**
     * Returns whether rotation is supported or not.
     * @method
     * @return {Boolean} True if rotation is supported.
     */
    canRotate: function() {
        return this.useCanvas;
    }
};

/**
 * @private
 * @inner
 * Pretty much every other line in this needs to be documented so it's clear
 * how each piece of this routine contributes to the drawing process.  That's
 * why there are so many TODO's inside this function.
 */
function updateViewport( drawer ) {

    drawer.updateAgain = false;

    if( drawer.viewer ){
        /**
         * <em>- Needs documentation -</em>
         *
         * @event update-viewport
         * @memberof OpenSeadragon.Viewer
         * @type {object}
         * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
         * @property {?Object} userData - Arbitrary subscriber-defined object.
         */
        drawer.viewer.raiseEvent( 'update-viewport', {} );
    }

    var tile,
        level,
        best            = null,
        haveDrawn       = false,
        currentTime     = $.now(),
        viewportSize    = drawer.viewport.getContainerSize(),
        viewportBounds  = drawer.viewport.getBounds( true ),
        viewportTL      = viewportBounds.getTopLeft(),
        viewportBR      = viewportBounds.getBottomRight(),
        zeroRatioC      = drawer.viewport.deltaPixelsFromPoints(
            drawer.source.getPixelRatio( 0 ),
            true
        ).x,
        lowestLevel     = Math.max(
            drawer.source.minLevel,
            Math.floor(
                Math.log( drawer.minZoomImageRatio ) /
                Math.log( 2 )
            )
        ),
        highestLevel    = Math.min(
            Math.abs(drawer.source.maxLevel),
            Math.abs(Math.floor(
                Math.log( zeroRatioC / drawer.minPixelRatio ) /
                Math.log( 2 )
            ))
        ),
        degrees         = drawer.viewport.degrees,
        renderPixelRatioC,
        renderPixelRatioT,
        zeroRatioT,
        optimalRatio,
        levelOpacity,
        levelVisibility;

    // Reset tile's internal drawn state
    while ( drawer.lastDrawn.length > 0 ) {
        tile = drawer.lastDrawn.pop();
        tile.beingDrawn = false;
    }

    // Clear canvas
    drawer.canvas.innerHTML   = "";
    if ( drawer.useCanvas ) {
        if( drawer.canvas.width  != viewportSize.x ||
            drawer.canvas.height != viewportSize.y ){
            drawer.canvas.width  = viewportSize.x;
            drawer.canvas.height = viewportSize.y;
        }
        drawer.context.clearRect( 0, 0, viewportSize.x, viewportSize.y );
    }

    //Change bounds for rotation
    if (degrees === 90 || degrees === 270) {
        var rotatedBounds = viewportBounds.rotate( degrees );
        viewportTL = rotatedBounds.getTopLeft();
        viewportBR = rotatedBounds.getBottomRight();
    }

    //Don't draw if completely outside of the viewport
    if  ( !drawer.wrapHorizontal &&
        ( viewportBR.x < 0 || viewportTL.x > 1 ) ) {
        return;
    } else if
        ( !drawer.wrapVertical &&
        ( viewportBR.y < 0 || viewportTL.y > drawer.normHeight ) ) {
        return;
    }

    // Calculate viewport rect / bounds
    if ( !drawer.wrapHorizontal ) {
        viewportTL.x = Math.max( viewportTL.x, 0 );
        viewportBR.x = Math.min( viewportBR.x, 1 );
    }
    if ( !drawer.wrapVertical ) {
        viewportTL.y = Math.max( viewportTL.y, 0 );
        viewportBR.y = Math.min( viewportBR.y, drawer.normHeight );
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
        renderPixelRatioC = drawer.viewport.deltaPixelsFromPoints(
            drawer.source.getPixelRatio( level ),
            true
        ).x;

        if ( ( !haveDrawn && renderPixelRatioC >= drawer.minPixelRatio ) ||
             ( level == lowestLevel ) ) {
            drawLevel = true;
            haveDrawn = true;
        } else if ( !haveDrawn ) {
            continue;
        }

        //Perform calculations for draw if we haven't drawn this
        renderPixelRatioT = drawer.viewport.deltaPixelsFromPoints(
            drawer.source.getPixelRatio( level ),
            false
        ).x;

        zeroRatioT      = drawer.viewport.deltaPixelsFromPoints(
            drawer.source.getPixelRatio(
                Math.max(
                    drawer.source.getClosestLevel( drawer.viewport.containerSize ) - 1,
                    0
                )
            ),
            false
        ).x;

        optimalRatio    = drawer.immediateRender ?
            1 :
            zeroRatioT;

        levelOpacity    = Math.min( 1, ( renderPixelRatioC - 0.5 ) / 0.5 );

        levelVisibility = optimalRatio / Math.abs(
            optimalRatio - renderPixelRatioT
        );

        // Update the level and keep track of 'best' tile to load
        best = updateLevel(
            drawer,
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
        if (  providesCoverage( drawer.coverage, level ) ) {
            break;
        }
    }

    // Perform the actual drawing
    drawTiles( drawer, drawer.lastDrawn );

    // Load the new 'best' tile
    if ( best ) {
        loadTile( drawer, best, currentTime );
        // because we haven't finished drawing, so
        drawer.updateAgain = true;
    }

}


function updateLevel( drawer, haveDrawn, drawLevel, level, levelOpacity, levelVisibility, viewportTL, viewportBR, currentTime, best ){

    var x, y,
        tileTL,
        tileBR,
        numberOfTiles,
        viewportCenter  = drawer.viewport.pixelFromPoint( drawer.viewport.getCenter() );


    if( drawer.viewer ){
        /**
         * <em>- Needs documentation -</em>
         *
         * @event update-level
         * @memberof OpenSeadragon.Viewer
         * @type {object}
         * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
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
        drawer.viewer.raiseEvent( 'update-level', {
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
    tileTL    = drawer.source.getTileAtPoint( level, viewportTL );
    tileBR    = drawer.source.getTileAtPoint( level, viewportBR );
    numberOfTiles  = drawer.source.getNumTiles( level );

    resetCoverage( drawer.coverage, level );

    if ( !drawer.wrapHorizontal ) {
        tileBR.x = Math.min( tileBR.x, numberOfTiles.x - 1 );
    }
    if ( !drawer.wrapVertical ) {
        tileBR.y = Math.min( tileBR.y, numberOfTiles.y - 1 );
    }

    for ( x = tileTL.x; x <= tileBR.x; x++ ) {
        for ( y = tileTL.y; y <= tileBR.y; y++ ) {

            best = updateTile(
                drawer,
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

function updateTile( drawer, drawLevel, haveDrawn, x, y, level, levelOpacity, levelVisibility, viewportCenter, numberOfTiles, currentTime, best){

    var tile = getTile(
            x, y,
            level,
            drawer.source,
            drawer.tilesMatrix,
            currentTime,
            numberOfTiles,
            drawer.normHeight
        ),
        drawTile = drawLevel;

    if( drawer.viewer ){
        /**
         * <em>- Needs documentation -</em>
         *
         * @event update-tile
         * @memberof OpenSeadragon.Viewer
         * @type {object}
         * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
         * @property {OpenSeadragon.Tile} tile
         * @property {?Object} userData - Arbitrary subscriber-defined object.
         */
        drawer.viewer.raiseEvent( 'update-tile', {
            tile: tile
        });
    }

    setCoverage( drawer.coverage, level, x, y, false );

    if ( !tile.exists ) {
        return best;
    }

    if ( haveDrawn && !drawTile ) {
        if ( isCovered( drawer.coverage, level, x, y ) ) {
            setCoverage( drawer.coverage, level, x, y, true );
        } else {
            drawTile = true;
        }
    }

    if ( !drawTile ) {
        return best;
    }

    positionTile(
        tile,
        drawer.source.tileOverlap,
        drawer.viewport,
        viewportCenter,
        levelVisibility
    );

    if ( tile.loaded ) {
        var needsUpdate = blendTile(
            drawer,
            tile,
            x, y,
            level,
            levelOpacity,
            currentTime
        );

        if ( needsUpdate ) {
            drawer.updateAgain = true;
        }
    } else if ( tile.loading ) {
        // the tile is already in the download queue
        // thanks josh1093 for finally translating this typo
    } else {
        best = compareTiles( best, tile );
    }

    return best;
}

function getTile( x, y, level, tileSource, tilesMatrix, time, numTiles, normHeight ) {
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

        bounds.x += 1.0 * ( x - xMod ) / numTiles.x;
        bounds.y += normHeight * ( y - yMod ) / numTiles.y;

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

function loadTile( drawer, tile, time ) {
    if( drawer.viewport.collectionMode ){
        drawer.midUpdate = false;
        onTileLoad( drawer, tile, time );
    } else {
        tile.loading = true;
        drawer.imageLoader.addJob({
            src: tile.url,
            callback: function( image ){
                onTileLoad( drawer, tile, time, image );
            }
        });
    }
}

function onTileLoad( drawer, tile, time, image ) {
    var insertionIndex,
        cutoff,
        worstTile,
        worstTime,
        worstLevel,
        worstTileIndex,
        prevTile,
        prevTime,
        prevLevel,
        i;

    tile.loading = false;

    if ( drawer.midUpdate ) {
        $.console.warn( "Tile load callback in middle of drawing routine." );
        return;
    } else if ( !image  && !drawer.viewport.collectionMode ) {
        $.console.log( "Tile %s failed to load: %s", tile, tile.url );
        if( !drawer.debugMode ){
            tile.exists = false;
            return;
        }
    } else if ( time < drawer.lastResetTime ) {
        $.console.log( "Ignoring tile %s loaded before reset: %s", tile, tile.url );
        return;
    }

    tile.loaded = true;
    tile.image  = image;


    insertionIndex = drawer.tilesLoaded.length;

    if ( drawer.tilesLoaded.length >= drawer.maxImageCacheCount ) {
        cutoff = Math.ceil( Math.log( drawer.source.tileSize ) / Math.log( 2 ) );

        worstTile       = null;
        worstTileIndex  = -1;

        for ( i = drawer.tilesLoaded.length - 1; i >= 0; i-- ) {
            prevTile = drawer.tilesLoaded[ i ];

            if ( prevTile.level <= drawer.cutoff || prevTile.beingDrawn ) {
                continue;
            } else if ( !worstTile ) {
                worstTile       = prevTile;
                worstTileIndex  = i;
                continue;
            }

            prevTime    = prevTile.lastTouchTime;
            worstTime   = worstTile.lastTouchTime;
            prevLevel   = prevTile.level;
            worstLevel  = worstTile.level;

            if ( prevTime < worstTime ||
               ( prevTime == worstTime && prevLevel > worstLevel ) ) {
                worstTile       = prevTile;
                worstTileIndex  = i;
            }
        }

        if ( worstTile && worstTileIndex >= 0 ) {
            worstTile.unload();
            insertionIndex = worstTileIndex;
        }
    }

    drawer.tilesLoaded[ insertionIndex ] = tile;
    drawer.updateAgain = true;
}


function positionTile( tile, overlap, viewport, viewportCenter, levelVisibility ){
    var boundsTL     = tile.bounds.getTopLeft(),
        boundsSize   = tile.bounds.getSize(),
        positionC    = viewport.pixelFromPoint( boundsTL, true ),
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


function blendTile( drawer, tile, x, y, level, levelOpacity, currentTime ){
    var blendTimeMillis = 1000 * drawer.blendTime,
        deltaTime,
        opacity;

    if ( !tile.blendStart ) {
        tile.blendStart = currentTime;
    }

    deltaTime   = currentTime - tile.blendStart;
    opacity     = blendTimeMillis ? Math.min( 1, deltaTime / ( blendTimeMillis ) ) : 1;

    if ( drawer.alwaysBlend ) {
        opacity *= levelOpacity;
    }

    tile.opacity = opacity;

    drawer.lastDrawn.push( tile );

    if ( opacity == 1 ) {
        setCoverage( drawer.coverage, level, x, y, true );
    } else if ( deltaTime < blendTimeMillis ) {
        return true;
    }

    return false;
}


function clearTiles( drawer ) {
    drawer.tilesMatrix = {};
    drawer.tilesLoaded = [];
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

function drawTiles( drawer, lastDrawn ){
    var i,
        tile,
        tileKey,
        viewer,
        viewport,
        position,
        tileSource,
        collectionTileSource;

    // We need a callback to give image manipulation a chance to happen
    var drawingHandler = function(args) {
        if (drawer.viewer) {
          /**
           * This event is fired just before the tile is drawn giving the application a chance to alter the image.
           *
           * NOTE: This event is only fired when the drawer is using a <canvas>.
           *
           * @event tile-drawing
           * @memberof OpenSeadragon.Viewer
           * @type {object}
           * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
           * @property {OpenSeadragon.Tile} tile
           * @property {?Object} userData - 'context', 'tile' and 'rendered'.
           */
            drawer.viewer.raiseEvent('tile-drawing', args);
        }
    };

    for ( i = lastDrawn.length - 1; i >= 0; i-- ) {
        tile = lastDrawn[ i ];

        //We dont actually 'draw' a collection tile, rather its used to house
        //an overlay which does the drawing in its own viewport
        if( drawer.viewport.collectionMode ){

            tileKey = tile.x + '/' + tile.y;
            viewport = drawer.viewport;
            collectionTileSource = viewport.collectionTileSource;

            if( !drawer.collectionOverlays[ tileKey ] ){

                position = collectionTileSource.layout == 'horizontal' ?
                    tile.y + ( tile.x * collectionTileSource.rows ) :
                    tile.x + ( tile.y * collectionTileSource.rows );

                if (position < collectionTileSource.tileSources.length) {
                    tileSource = collectionTileSource.tileSources[ position ];
                } else {
                    tileSource = null;
                }

                //$.console.log("Rendering collection tile %s | %s | %s", tile.y, tile.y, position);
                if( tileSource ){
                    drawer.collectionOverlays[ tileKey ] = viewer = new $.Viewer({
                        hash:                   viewport.viewer.hash + "-" + tileKey,
                        element:                $.makeNeutralElement( "div" ),
                        mouseNavEnabled:        false,
                        showNavigator:          false,
                        showSequenceControl:    false,
                        showNavigationControl:  false,
                        tileSources: [
                            tileSource
                        ]
                    });

                    //TODO: IE seems to barf on this, not sure if its just the border
                    //      but we probably need to clear this up with a better
                    //      test of support for various css features
                    if( SUBPIXEL_RENDERING ){
                        viewer.element.style.border = '1px solid rgba(255,255,255,0.38)';
                        viewer.element.style['-webkit-box-reflect'] =
                            'below 0px -webkit-gradient('+
                                'linear,left '+
                                'top,left '+
                                'bottom,from(transparent),color-stop(62%,transparent),to(rgba(255,255,255,0.62))'+
                            ')';
                    }

                    drawer.viewer.addOverlay(
                        viewer.element,
                        tile.bounds
                    );
                }

            }else{
                viewer = drawer.collectionOverlays[ tileKey ];
                if( viewer.viewport ){
                    viewer.viewport.resize( tile.size, true );
                    viewer.viewport.goHome( true );
                }
            }

        } else {

            if ( drawer.useCanvas ) {
                // TODO do this in a more performant way
                // specifically, don't save,rotate,restore every time we draw a tile
                if( drawer.viewport.degrees !== 0 ) {
                    offsetForRotation( tile, drawer.canvas, drawer.context, drawer.viewport.degrees );
                    tile.drawCanvas( drawer.context, drawingHandler );
                    restoreRotationChanges( tile, drawer.canvas, drawer.context );
                } else {
                    tile.drawCanvas( drawer.context, drawingHandler );
                }
            } else {
                tile.drawHTML( drawer.canvas );
            }


            tile.beingDrawn = true;
        }

        if( drawer.debugMode ){
            try{
                drawDebugInfo( drawer, tile, lastDrawn.length, i );
            }catch(e){
                $.console.error(e);
            }
        }

        if( drawer.viewer ){
            /**
             * <em>- Needs documentation -</em>
             *
             * @event tile-drawn
             * @memberof OpenSeadragon.Viewer
             * @type {object}
             * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
             * @property {OpenSeadragon.Tile} tile
             * @property {?Object} userData - Arbitrary subscriber-defined object.
             */
            drawer.viewer.raiseEvent( 'tile-drawn', {
                tile: tile
            });
        }
    }
}

function offsetForRotation( tile, canvas, context, degrees ){
    var cx = canvas.width / 2,
        cy = canvas.height / 2,
        px = tile.position.x - cx,
        py = tile.position.y - cy;

    context.save();

    context.translate(cx, cy);
    context.rotate( Math.PI / 180 * degrees);
    tile.position.x = px;
    tile.position.y = py;
}

function restoreRotationChanges( tile, canvas, context ){
    var cx = canvas.width / 2,
        cy = canvas.height / 2,
        px = tile.position.x + cx,
        py = tile.position.y + cy;

    tile.position.x = px;
    tile.position.y = py;

    context.restore();
}


function drawDebugInfo( drawer, tile, count, i ){

    if ( drawer.useCanvas ) {
        drawer.context.save();
        drawer.context.lineWidth = 2;
        drawer.context.font = 'small-caps bold 13px ariel';
        drawer.context.strokeStyle = drawer.debugGridColor;
        drawer.context.fillStyle = drawer.debugGridColor;
        drawer.context.strokeRect(
            tile.position.x,
            tile.position.y,
            tile.size.x,
            tile.size.y
        );
        if( tile.x === 0 && tile.y === 0 ){
            drawer.context.fillText(
                "Zoom: " + drawer.viewport.getZoom(),
                tile.position.x,
                tile.position.y - 30
            );
            drawer.context.fillText(
                "Pan: " + drawer.viewport.getBounds().toString(),
                tile.position.x,
                tile.position.y - 20
            );
        }
        drawer.context.fillText(
            "Level: " + tile.level,
            tile.position.x + 10,
            tile.position.y + 20
        );
        drawer.context.fillText(
            "Column: " + tile.x,
            tile.position.x + 10,
            tile.position.y + 30
        );
        drawer.context.fillText(
            "Row: " + tile.y,
            tile.position.x + 10,
            tile.position.y + 40
        );
        drawer.context.fillText(
            "Order: " + i + " of " + count,
            tile.position.x + 10,
            tile.position.y + 50
        );
        drawer.context.fillText(
            "Size: " + tile.size.toString(),
            tile.position.x + 10,
            tile.position.y + 60
        );
        drawer.context.fillText(
            "Position: " + tile.position.toString(),
            tile.position.x + 10,
            tile.position.y + 70
        );
        drawer.context.restore();
    }
}


}( OpenSeadragon ));
