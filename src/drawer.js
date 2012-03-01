
(function( $ ){
    
var TIMEOUT             = 5000,

    BROWSER             = $.Browser.vendor,
    BROWSER_VERSION     = $.Browser.version,

    SUBPIXEL_RENDERING = (
        ( BROWSER == $.BROWSERS.FIREFOX ) ||
        ( BROWSER == $.BROWSERS.OPERA )   ||
        ( BROWSER == $.BROWSERS.SAFARI && BROWSER_VERSION >= 4 ) ||
        ( BROWSER == $.BROWSERS.CHROME && BROWSER_VERSION >= 2 )
    ) && ( !navigator.appVersion.match( 'Mobile' ) ),

    USE_CANVAS = $.isFunction( document.createElement( "canvas" ).getContext ) &&
        SUBPIXEL_RENDERING;

//console.error( 'USE_CANVAS ' + USE_CANVAS );

/**
 * @class
 * @param {OpenSeadragon.TileSource} source - Reference to Viewer tile source.
 * @param {OpenSeadragon.Viewport} viewport - Reference to Viewer viewport.
 * @param {Element} element - Reference to Viewer 'canvas'.
 * @property {OpenSeadragon.TileSource} source - Reference to Viewer tile source.
 * @property {OpenSeadragon.Viewport} viewport - Reference to Viewer viewport.
 * @property {Element} container - Reference to Viewer 'canvas'.
 * @property {Element|Canvas} canvas - TODO
 * @property {CanvasContext} context - TODO
 * @property {Object} config - Reference to Viewer config.
 * @property {Number} downloading - How many images are currently being loaded in parallel.
 * @property {Number} normHeight - Ratio of zoomable image height to width.
 * @property {Object} tilesMatrix - A '3d' dictionary [level][x][y] --> Tile.
 * @property {Array} tilesLoaded - An unordered list of Tiles with loaded images.
 * @property {Object} coverage - A '3d' dictionary [level][x][y] --> Boolean.
 * @property {Array} overlays - An unordered list of Overlays added.
 * @property {Array} lastDrawn - An unordered list of Tiles drawn last frame.
 * @property {Number} lastResetTime - Last time for which the drawer was reset.
 * @property {Boolean} midUpdate - Is the drawer currently updating the viewport?
 * @property {Boolean} updateAgain - Does the drawer need to update the viewort again?
 * @property {Element} element - DEPRECATED Alias for container.
 */
$.Drawer = function( options ) {
    
    //backward compatibility for positional args while prefering more 
    //idiomatic javascript options object as the only argument
    var args  = arguments;
    if( !$.isPlainObject( options ) ){
        options = {
            source:     args[ 0 ],
            viewport:   args[ 1 ],
            element:    args[ 2 ]
        };
    }

    $.extend( true, this, {
        //references to closely related openseadragon objects
        //viewport:       null,
        //source:         null,

        //internal state properties
        downloading:    0,
        tilesMatrix:    {},
        tilesLoaded:    [],
        coverage:       {},
        overlays:       [],
        lastDrawn:      [],
        lastResetTime:  0,
        midUpdate:      false,
        updateAgain:    true,

        //configurable settings
        maxImageCacheCount: $.DEFAULT_SETTINGS.maxImageCacheCount,
        imageLoaderLimit:   $.DEFAULT_SETTINGS.imageLoaderLimit,
        minZoomImageRatio:  $.DEFAULT_SETTINGS.minZoomImageRatio,
        wrapHorizontal:     $.DEFAULT_SETTINGS.wrapHorizontal,
        wrapVertical:       $.DEFAULT_SETTINGS.wrapVertical,
        immediateRender:    $.DEFAULT_SETTINGS.immediateRender,
        blendTime:          $.DEFAULT_SETTINGS.blendTime,
        alwaysBlend:        $.DEFAULT_SETTINGS.alwaysBlend,
        minPixelRatio:      $.DEFAULT_SETTINGS.minPixelRatio

    }, options );

    this.container  = $.getElement( this.element );
    this.canvas     = $.makeNeutralElement( USE_CANVAS ? "canvas" : "div" );
    this.context    = USE_CANVAS ? this.canvas.getContext( "2d" ) : null;
    this.normHeight = this.source.dimensions.y / this.source.dimensions.x;
    this.element    = this.container;

    
    this.canvas.style.width     = "100%";
    this.canvas.style.height    = "100%";
    this.canvas.style.position  = "absolute";
    
    // explicit left-align
    this.container.style.textAlign = "left";
    this.container.appendChild( this.canvas );

    //this.profiler    = new $.Profiler();
};

$.Drawer.prototype = {

    /**
     * Adds an html element as an overlay to the current viewport.  Useful for
     * highlighting words or areas of interest on an image or other zoomable
     * interface.
     * @method
     * @param {Element|String} element - A reference to an element or an id for
     *      the element which will overlayed.
     * @param {OpenSeadragon.Point|OpenSeadragon.Rect} location - The point or 
     *      rectangle which will be overlayed.
     * @param {OpenSeadragon.OverlayPlacement} placement - The position of the 
     *      viewport which the location coordinates will be treated as relative 
     *      to. 
     */
    addOverlay: function( element, location, placement ) {
        element = $.getElement( element );

        if ( getOverlayIndex( this.overlays, element ) >= 0 ) {
            // they're trying to add a duplicate overlay
            return;     
        }

        this.overlays.push( new $.Overlay( element, location, placement ) );
        this.updateAgain = true;
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
     */
    updateOverlay: function( element, location, placement ) {
        var i;

        element = $.getElement( element );
        i = getOverlayIndex( this.overlays, element );

        if ( i >= 0 ) {
            this.overlays[ i ].update( location, placement );
            this.updateAgain = true;
        }
    },

    /**
     * Removes and overlay identified by the reference element or element id 
     *      and schedules and update.
     * @method
     * @param {Element|String} element - A reference to the element or an 
     *      element id which represent the ovelay content to be removed.
     */
    removeOverlay: function( element ) {
        var i;

        element = $.getElement( element );
        i = getOverlayIndex( this.overlays, element );

        if ( i >= 0 ) {
            this.overlays[ i ].destroy();
            this.overlays.splice( i, 1 );
            this.updateAgain = true;
        }
    },

    /**
     * Removes all currently configured Overlays from this Drawer and schedules
     *      and update.
     * @method
     */
    clearOverlays: function() {
        while ( this.overlays.length > 0 ) {
            this.overlays.pop().destroy();
            this.updateAgain = true;
        }
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
     */
    reset: function() {
        clearTiles( this );
        this.lastResetTime = +new Date();
        this.updateAgain = true;
    },

    /**
     * Forces the Drawer to update.
     * @method
     */
    update: function() {
        //this.profiler.beginUpdate();
        this.midUpdate = true;
        updateViewport( this );
        this.midUpdate = false;
        //this.profiler.endUpdate();
    },

    /**
     * Used internally to load images when required.  May also be used to 
     * preload a set of images so the browser will have them available in 
     * the local cache to optimize user experience in certain cases. Because
     * the number of parallel image loads is configurable, if too many images
     * are currently being loaded, the request will be ignored.  Since by 
     * default drawer.imageLoaderLimit is 0, the native browser parallel 
     * image loading policy will be used.
     * @method
     * @param {String} src - The url of the image to load.
     * @param {Function} callback - The function that will be called with the
     *      Image object as the only parameter, whether on 'load' or on 'abort'.
     *      For now this means the callback is expected to distinguish between
     *      error and success conditions by inspecting the Image object.
     * @return {Boolean} loading - Wheter the request was submitted or ignored 
     *      based on OpenSeadragon.DEFAULT_SETTINGS.imageLoaderLimit.
     */
    loadImage: function( src, callback ) {
        var _this = this,
            loading = false,
            image,
            jobid,
            complete;
        
        if ( !this.imageLoaderLimit || 
              this.downloading < this.imageLoaderLimit ) {
            
            this.downloading++;

            image = new Image();

            complete = function( imagesrc ){
                _this.downloading--;
                if (typeof ( callback ) == "function") {
                    try {
                        callback( image );
                    } catch ( e ) {
                        $.console.error(
                            "%s while executing %s callback: %s", 
                            e.name,
                            src,
                            e.message,
                            e
                        );
                    }
                }
            };

            image.onload = function(){
                finishLoadingImage( image, complete, true );
            };

            image.onabort = image.onerror = function(){
                finishLoadingImage( image, complete, false );
            };

            jobid = window.setTimeout( function(){
                finishLoadingImage( image, complete, false, jobid );
            }, TIMEOUT );

            loading   = true;
            image.src = src;
        }

        return loading;
    }
};

/**
 * @private
 * @inner
 * Pretty much every other line in this needs to be documented so its clear
 * how each piece of this routine contributes to the drawing process.  That's
 * why there are so many TODO's inside this function.
 */
function updateViewport( drawer ) {
    
    drawer.updateAgain = false;

    var tile,
        level,
        best            = null,
        haveDrawn       = false,
        currentTime     = +new Date(),
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
            drawer.source.maxLevel,
            Math.floor( 
                Math.log( zeroRatioC / drawer.minPixelRatio ) / 
                Math.log( 2 )
            )
        ),
        renderPixelRatioC,
        renderPixelRatioT,
        zeroRatioT,
        optimalRatio,
        levelOpacity,
        levelVisibility;

    //TODO
    while ( drawer.lastDrawn.length > 0 ) {
        tile = drawer.lastDrawn.pop();
        tile.beingDrawn = false;
    }

    //TODO
    drawer.canvas.innerHTML   = "";
    if ( USE_CANVAS ) {
        drawer.canvas.width   = viewportSize.x;
        drawer.canvas.height  = viewportSize.y;
        drawer.context.clearRect( 0, 0, viewportSize.x, viewportSize.y );
    }

    //TODO
    if  ( !drawer.wrapHorizontal && 
        ( viewportBR.x < 0 || viewportTL.x > 1 ) ) {
        return;
    } else if 
        ( !drawer.wrapVertical &&
        ( viewportBR.y < 0 || viewportTL.y > drawer.normHeight ) ) {
        return;
    }

    //TODO
    if ( !drawer.wrapHorizontal ) {
        viewportTL.x = Math.max( viewportTL.x, 0 );
        viewportBR.x = Math.min( viewportBR.x, 1 );
    }
    if ( !drawer.wrapVertical ) {
        viewportTL.y = Math.max( viewportTL.y, 0 );
        viewportBR.y = Math.min( viewportBR.y, drawer.normHeight );
    }

    //TODO
    lowestLevel = Math.min( lowestLevel, highestLevel );

    //TODO
    for ( level = highestLevel; level >= lowestLevel; level-- ) {

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

        renderPixelRatioT = drawer.viewport.deltaPixelsFromPoints(
            drawer.source.getPixelRatio( level ), 
            false
        ).x;

        zeroRatioT      = drawer.viewport.deltaPixelsFromPoints( 
            drawer.source.getPixelRatio( 0 ), 
            false
        ).x;
        
        optimalRatio    = drawer.immediateRender ? 
            1 : 
            zeroRatioT;

        levelOpacity    = Math.min( 1, ( renderPixelRatioC - 0.5 ) / 0.5 );
        
        levelVisibility = optimalRatio / Math.abs( 
            optimalRatio - renderPixelRatioT 
        );

        //TODO
        best = updateLevel(
            drawer, 
            haveDrawn,
            level, 
            levelOpacity,
            levelVisibility,
            viewportTL, 
            viewportBR, 
            currentTime, 
            best 
        );

        //TODO
        if (  providesCoverage( drawer.coverage, level ) ) {
            break;
        }
    }

    //TODO
    drawTiles( drawer, drawer.lastDrawn );
    drawOverlays( drawer.viewport, drawer.overlays, drawer.container );

    //TODO
    if ( best ) {
        loadTile( drawer, best, currentTime );
        // because we haven't finished drawing, so
        drawer.updateAgain = true; 
    }
};


function updateLevel( drawer, haveDrawn, level, levelOpacity, levelVisibility, viewportTL, viewportBR, currentTime, best ){
    
    var x, y,
        tileTL,
        tileBR,
        numberOfTiles,
        viewportCenter  = drawer.viewport.pixelFromPoint( drawer.viewport.getCenter() );


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
};

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
        
        drawer.updateAgain = blendTile(
            drawer,
            tile, 
            x, y,
            level,
            levelOpacity, 
            currentTime 
        );

    } else if ( tile.Loading ) {
        //TODO: .Loading is never defined... did they mean .loading?
        //      but they didnt do anything so what is this block if
        //      if it does nothing?
    } else {
        best = compareTiles( best, tile );
    }

    return best;
};

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
};


function loadTile( drawer, tile, time ) {
    tile.loading = drawer.loadImage(
        tile.url,
        function( image ){
            onTileLoad( drawer, tile, time, image );
        }
    );
};

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
    } else if ( !image ) {
        $.console.log( "Tile %s failed to load: %s", tile, tile.url );
        tile.exists = false;
        return;
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
};


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
};


function blendTile( drawer, tile, x, y, level, levelOpacity, currentTime ){
    var blendTimeMillis = 1000 * drawer.blendTime,
        deltaTime,
        opacity;

    if ( !tile.blendStart ) {
        tile.blendStart = currentTime;
    }

    deltaTime   = currentTime - tile.blendStart;
    opacity     = Math.min( 1, deltaTime / blendTimeMillis );
    
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
};


function clearTiles( drawer ) {
    drawer.tilesMatrix = {};
    drawer.tilesLoaded = [];
};

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
};

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
};

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
};

/**
 * @private
 * @inner
 * Resets coverage information for the given level. This should be called
 * after every draw routine. Note that at the beginning of the next draw
 * routine, coverage for every visible tile should be explicitly set. 
 */
function resetCoverage( coverage, level ) {
    coverage[ level ] = {};
};

/**
 * @private
 * @inner
 * Determines the 'z-index' of the given overlay.  Overlays are ordered in
 * a z-index based on the order they are added to the Drawer.
 */
function getOverlayIndex( overlays, element ) {
    var i;
    for ( i = overlays.length - 1; i >= 0; i-- ) {
        if ( overlays[ i ].element == element ) {
            return i;
        }
    }

    return -1;
};

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
};

function finishLoadingImage( image, callback, successful, jobid ){

    image.onload = null;
    image.onabort = null;
    image.onerror = null;

    if ( jobid ) {
        window.clearTimeout( jobid );
    }
    window.setTimeout( function() {
        callback( image.src, successful ? image : null);
    }, 1 );

};


function drawOverlays( viewport, overlays, container ){
    var i,
        length = overlays.length;
    for ( i = 0; i < length; i++ ) {
        drawOverlay( viewport, overlays[ i ], container );
    }
};

function drawOverlay( viewport, overlay, container ){

    overlay.position = viewport.pixelFromPoint(
        overlay.bounds.getTopLeft(), 
        true
    );
    overlay.size     = viewport.deltaPixelsFromPoints(
        overlay.bounds.getSize(), 
        true
    );
    overlay.drawHTML( container );
};

function drawTiles( drawer, lastDrawn ){
    var i, 
        tile;

    for ( i = lastDrawn.length - 1; i >= 0; i-- ) {
        tile = lastDrawn[ i ];

        //TODO: get rid of this if by determining the tile draw method once up
        //      front and defining the appropriate 'draw' function
        if ( USE_CANVAS ) {
            tile.drawCanvas( drawer.context );
        } else {
            tile.drawHTML( drawer.canvas );
        }

        tile.beingDrawn = true;
    }
};

}( OpenSeadragon ));
