
(function( $ ){
    
var // the max number of images we should keep in memory
    QUOTA               = 100,
    // the most shrunk a tile should be
    MIN_PIXEL_RATIO     = 0.5,
    //TODO: make TIMEOUT configurable
    TIMEOUT             = 5000,

    BROWSER             = $.Browser.vendor,
    BROWSER_VERSION     = $.Browser.version,

    SUBPIXEL_RENDERING = (
        ( BROWSER == $.BROWSERS.FIREFOX ) ||
        ( BROWSER == $.BROWSERS.OPERA )   ||
        ( BROWSER == $.BROWSERS.SAFARI && BROWSER_VERSION >= 4 ) ||
        ( BROWSER == $.BROWSERS.CHROME && BROWSER_VERSION >= 2 )
    ),

    USE_CANVAS =
        $.isFunction( document.createElement("canvas").getContext ) &&
        SUBPIXEL_RENDERING;

$.Drawer = function(source, viewport, elmt) {

    this.container  = $.getElement( elmt );
    this.canvas     = $.makeNeutralElement( USE_CANVAS ? "canvas" : "div" );
    this.context    = USE_CANVAS ? this.canvas.getContext("2d") : null;
    this.viewport   = viewport;
    this.source     = source;
    this.config     = this.viewport.config;

    this.downloading        = 0;
    this.imageLoaderLimit   = this.config.imageLoaderLimit;

    this.profiler    = new $.Profiler();

    this.minLevel    = source.minLevel;
    this.maxLevel    = source.maxLevel;
    this.tileSize    = source.tileSize;
    this.tileOverlap = source.tileOverlap;
    this.normHeight  = source.dimensions.y / source.dimensions.x;
    
    // 1d dictionary [level] --> Point
    this.cacheNumTiles      = {};
    // 1d dictionary [level] --> Point
    this.cachePixelRatios   = {};
    // 3d dictionary [level][x][y] --> Tile
    this.tilesMatrix        = {};
    // unordered list of Tiles with loaded images
    this.tilesLoaded        = [];
    // 3d dictionary [level][x][y] --> Boolean
    this.coverage           = {};
    
    // unordered list of Overlays added
    this.overlays           = [];
    // unordered list of Tiles drawn last frame
    this.lastDrawn          = [];
    this.lastResetTime      = 0;
    this.midUpdate          = false;
    this.updateAgain        = true;

    this.elmt = this.container;
    
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.position = "absolute";

    // explicit left-align
    this.container.style.textAlign = "left";
    this.container.appendChild(this.canvas);
};

$.Drawer.prototype = {

    getPixelRatio: function( level ) {
        if ( !this.cachePixelRatios[ level ] ) {
            this.cachePixelRatios[ level ] = this.source.getPixelRatio( level );
        }

        return this.cachePixelRatios[ level ];
    },


    _getTile: function( level, x, y, time, numTilesX, numTilesY ) {
        var xMod,
            yMod,
            bounds,
            exists,
            url,
            tile;

        if ( !this.tilesMatrix[ level ] ) {
            this.tilesMatrix[ level ] = {};
        }
        if ( !this.tilesMatrix[ level ][ x ] ) {
            this.tilesMatrix[ level ][ x ] = {};
        }

        if ( !this.tilesMatrix[ level ][ x ][ y ] ) {
            xMod    = ( numTilesX + ( x % numTilesX ) ) % numTilesX;
            yMod    = ( numTilesY + ( y % numTilesY ) ) % numTilesY;
            bounds  = this.source.getTileBounds( level, xMod, yMod );
            exists  = this.source.tileExists( level, xMod, yMod );
            url     = this.source.getTileUrl( level, xMod, yMod );

            bounds.x += 1.0 * ( x - xMod ) / numTilesX;
            bounds.y += this.normHeight * ( y - yMod ) / numTilesY;

            this.tilesMatrix[ level ][ x ][ y ] = new $.Tile(
                level, 
                x, 
                y, 
                bounds, 
                exists, 
                url
            );
        }

        tile = this.tilesMatrix[ level ][ x ][ y ];
        tile.lastTouchTime = time;

        return tile;
    },

    _loadTile: function( tile, time ) {
        tile.loading = this.loadImage(
            tile.url,
            $.createCallback(
                null, 
                $.delegate( this, this._onTileLoad ), 
                tile, 
                time
            )
        );
    },

    _onTileLoad: function(tile, time, image) {
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

        if ( this.midUpdate ) {
            $.Debug.error( "Tile load callback in middle of drawing routine." );
            return;
        } else if ( !image ) {
            $.Debug.log( "Tile " + tile + " failed to load: " + tile.url );
            tile.exists = false;
            return;
        } else if ( time < this.lastResetTime ) {
            $.Debug.log( "Ignoring tile " + tile + " loaded before reset: " + tile.url );
            return;
        }

        tile.loaded = true;
        tile.image  = image;

        insertionIndex = this.tilesLoaded.length;

        if ( this.tilesLoaded.length >= QUOTA ) {
            cutoff = Math.ceil( Math.log( this.tileSize ) / Math.log( 2 ) );

            worstTile       = null;
            worstTileIndex  = -1;

            for ( i = this.tilesLoaded.length - 1; i >= 0; i-- ) {
                prevTile = this.tilesLoaded[ i ];

                if ( prevTile.level <= this.cutoff || prevTile.beingDrawn ) {
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

        this.tilesLoaded[ insertionIndex ] = tile;
        this.updateAgain = true;
    },

    _clearTiles: function() {
        this.tilesMatrix = {};
        this.tilesLoaded = [];
    },



    /**
    * Returns true if the given tile provides coverage to lower-level tiles of
    * lower resolution representing the same content. If neither x nor y is
    * given, returns true if the entire visible level provides coverage.
    * 
    * Note that out-of-bounds tiles provide coverage in this sense, since
    * there's no content that they would need to cover. Tiles at non-existent
    * levels that are within the image bounds, however, do not.
    */
    _providesCoverage: function( level, x, y ) {
        var rows,
            cols,
            i, j;

        if ( !this.coverage[ level ] ) {
            return false;
        }

        if ( x === undefined || y === undefined ) {
            rows = this.coverage[ level ];
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
            this.coverage[ level ][ x] === undefined ||
            this.coverage[ level ][ x ][ y ] === undefined ||
            this.coverage[ level ][ x ][ y ] === true
        );
    },

    /**
    * Returns true if the given tile is completely covered by higher-level
    * tiles of higher resolution representing the same content. If neither x
    * nor y is given, returns true if the entire visible level is covered.
    */
    _isCovered: function( level, x, y ) {
        if ( x === undefined || y === undefined ) {
            return this._providesCoverage( level + 1 );
        } else {
            return (
                this._providesCoverage( level + 1, 2 * x, 2 * y ) &&
                this._providesCoverage( level + 1, 2 * x, 2 * y + 1 ) &&
                this._providesCoverage( level + 1, 2 * x + 1, 2 * y ) &&
                this._providesCoverage( level + 1, 2 * x + 1, 2 * y + 1 )
            );
        }
    },

    /**
    * Sets whether the given tile provides coverage or not.
    */
    _setCoverage: function( level, x, y, covers ) {
        if ( !this.coverage[ level ] ) {
            $.Debug.error(
                "Setting coverage for a tile before its level's coverage has been reset: " + level
            );
            return;
        }

        if ( !this.coverage[ level ][ x ] ) {
            this.coverage[ level ][ x ] = {};
        }

        this.coverage[ level ][ x ][ y ] = covers;
    },

    /**
    * Resets coverage information for the given level. This should be called
    * after every draw routine. Note that at the beginning of the next draw
    * routine, coverage for every visible tile should be explicitly set. 
    */
    _resetCoverage: function( level ) {
        this.coverage[ level ] = {};
    },


    _compareTiles: function( prevBest, tile ) {
        if ( !prevBest ) {
            return tile;
        }

        if ( tile.visibility > prevBest.visibility ) {
            return tile;
        } else if ( tile.visibility == prevBest.visibility ) {
            if ( tile.distance < prevBest.distance ) {
                return tile;
            }
        }

        return prevBest;
    },


    _getOverlayIndex: function( elmt ) {
        var i;
        for ( i = this.overlays.length - 1; i >= 0; i-- ) {
            if ( this.overlays[ i ].elmt == elmt ) {
                return i;
            }
        }

        return -1;
    },


    _updateActual: function() {
        this.updateAgain = false;

        var i, x, y,
            tile,
            tileTL,
            tileBR,
            numTiles,
            numTilesX,
            numTilesY,
            level,
            drawLevel,
            drawTile,
            renderPixelRatioC,
            renderPixelRatioT,
            levelOpacity,
            levelVisibility,
            viewportSize    = this.viewport.getContainerSize(),
            viewportWidth   = viewportSize.x,
            viewportHeight  = viewportSize.y,
            viewportBounds  = this.viewport.getBounds( true ),
            viewportTL      = viewportBounds.getTopLeft(),
            viewportBR      = viewportBounds.getBottomRight(),
            viewportCenter  = this.viewport.pixelFromPoint( this.viewport.getCenter() ),
            best            = null,
            haveDrawn       = false,
            currentTime     = new Date().getTime(),
            zeroRatioT      = this.viewport.deltaPixelsFromPoints( 
                this.source.getPixelRatio( 0 ), 
                false
            ).x,
            zeroRatioC      = this.viewport.deltaPixelsFromPoints( 
                this.source.getPixelRatio( 0 ), 
                true
            ).x,
            optimalRatio    = this.config.immediateRender ? 1 : zeroRatioT,
            lowestLevel     = Math.max(
                this.minLevel, 
                Math.floor( 
                    Math.log( this.config.minZoomImageRatio ) / 
                    Math.log( 2 )
                )
            ),
            highestLevel    = Math.min(
                this.maxLevel,
                Math.floor( 
                    Math.log( zeroRatioC / MIN_PIXEL_RATIO ) / 
                    Math.log( 2 )
                )
            );


        while ( this.lastDrawn.length > 0 ) {
            tile = this.lastDrawn.pop();
            tile.beingDrawn = false;
        }


        this.canvas.innerHTML   = "";
        if ( USE_CANVAS ) {
            this.canvas.width   = viewportWidth;
            this.canvas.height  = viewportHeight;
            this.context.clearRect( 0, 0, viewportWidth, viewportHeight );
        }

        if  ( !this.config.wrapHorizontal && 
            ( viewportBR.x < 0 || viewportTL.x > 1 ) ) {
            return;
        } else if ( !this.config.wrapVertical &&
            ( viewportBR.y < 0 || viewportTL.y > this.normHeight ) ) {
            return;
        }


        if ( !this.config.wrapHorizontal ) {
            viewportTL.x = Math.max( viewportTL.x, 0 );
            viewportBR.x = Math.min( viewportBR.x, 1 );
        }
        if ( !this.config.wrapVertical ) {
            viewportTL.y = Math.max( viewportTL.y, 0 );
            viewportBR.y = Math.min( viewportBR.y, this.normHeight );
        }

        lowestLevel = Math.min( lowestLevel, highestLevel );

        for ( level = highestLevel; level >= lowestLevel; level-- ) {
            drawLevel = false;
            // note the .x!
            renderPixelRatioC = this.viewport.deltaPixelsFromPoints(
                this.source.getPixelRatio( level ), 
                true
            ).x;
            renderPixelRatioT = this.viewport.deltaPixelsFromPoints(
                this.source.getPixelRatio( level ), 
                false
            ).x;

            if ( ( !haveDrawn && renderPixelRatioC >= MIN_PIXEL_RATIO ) ||
                 ( level == lowestLevel ) ) {
                drawLevel = true;
                haveDrawn = true;
            } else if ( !haveDrawn ) {
                continue;
            }

            this._resetCoverage( level );

            levelOpacity    = Math.min( 1, ( renderPixelRatioC - 0.5 ) / 0.5 );
            levelVisibility = optimalRatio / Math.abs( 
                optimalRatio - renderPixelRatioT 
            );

            tileTL    = this.source.getTileAtPoint( level, viewportTL );
            tileBR    = this.source.getTileAtPoint( level, viewportBR );
            numTiles  = numberOfTiles( this, level );
            numTilesX = numTiles.x;
            numTilesY = numTiles.y;

            if ( !this.config.wrapHorizontal ) {
                tileBR.x = Math.min( tileBR.x, numTilesX - 1 );
            }
            if ( !this.config.wrapVertical ) {
                tileBR.y = Math.min( tileBR.y, numTilesY - 1 );
            }

            for ( x = tileTL.x; x <= tileBR.x; x++ ) {
                for ( y = tileTL.y; y <= tileBR.y; y++ ) {
                    drawTile = drawLevel;
                    tile     = this._getTile( 
                        level, 
                        x, y, 
                        currentTime, 
                        numTilesX, 
                        numTilesY 
                    );

                    this._setCoverage( level, x, y, false );

                    if ( !tile.exists ) {
                        continue;
                    }

                    if ( haveDrawn && !drawTile ) {
                        if ( this._isCovered( level, x, y ) ) {
                            this._setCoverage( level, x, y, true );
                        } else {
                            drawTile = true;
                        }
                    }

                    if ( !drawTile ) {
                        continue;
                    }

                    this._positionTile( 
                        tile, 
                        viewportCenter, 
                        levelVisibility 
                    );

                    if ( tile.loaded ) {
                        
                        updateAgain = this._blendTile(
                            tile, 
                            x, y,
                            level,
                            levelOpacity, 
                            currentTime 
                        );

                    } else if ( tile.Loading ) {
                        //do nothing
                    } else {
                        best = this._compareTiles( best, tile );
                    }
                }
            }

            if ( this._providesCoverage( level ) ) {
                break;
            }
        }

        this._drawTiles();
        this._drawOverlays();

        if ( best ) {
            this._loadTile( best, currentTime );
            // because we haven't finished drawing, so
            this.updateAgain = true; 
        }
    },

    _drawLevel: function(  ){
        
    },

    _positionTile: function( tile, viewportCenter, levelVisibility ){
        var boundsTL     = tile.bounds.getTopLeft(),
            boundsSize   = tile.bounds.getSize(),
            positionC    = this.viewport.pixelFromPoint( boundsTL, true ),
            sizeC        = this.viewport.deltaPixelsFromPoints( boundsSize, true ),
            positionT    = this.viewport.pixelFromPoint( boundsTL, false ),
            sizeT        = this.viewport.deltaPixelsFromPoints( boundsSize, false ),
            tileCenter   = positionT.plus( sizeT.divide( 2 ) ),
            tileDistance = viewportCenter.distanceTo( tileCenter );

        if ( !this.tileOverlap ) {
            sizeC = sizeC.plus( new $.Point( 1, 1 ) );
        }

        tile.position   = positionC;
        tile.size       = sizeC;
        tile.distance   = tileDistance;
        tile.visibility = levelVisibility;
    },

    _blendTile: function( tile, x, y, level, levelOpacity, currentTime ){
        var blendTimeMillis = 1000 * this.config.blendTime,
            deltaTime,
            opacity;

        if ( !tile.blendStart ) {
            tile.blendStart = currentTime;
        }

        deltaTime   = currentTime - tile.blendStart;
        opacity     = Math.min( 1, deltaTime / blendTimeMillis );
        
        if ( this.config.alwaysBlend ) {
            opacity *= levelOpacity;
        }

        tile.opacity = opacity;

        this.lastDrawn.push( tile );

        if ( opacity == 1 ) {
            this._setCoverage( level, x, y, true );
        } else if ( deltaTime < blendTimeMillis ) {
            return true;
        }

        return false;
    },

    _drawTiles: function(){
        var i, 
            tile;

        for ( i = this.lastDrawn.length - 1; i >= 0; i-- ) {
            tile = this.lastDrawn[ i ];

            if ( USE_CANVAS ) {
                tile.drawCanvas( this.context );
            } else {
                tile.drawHTML( this.canvas );
            }

            tile.beingDrawn = true;
        }
    },

    _drawOverlays: function(){
        var i,
            length = this.overlays.length;
        for ( i = 0; i < length; i++ ) {
            this._drawOverlay( this.overlays[ i ] );
        }
    },

    _drawOverlay: function( overlay ){
        
        var bounds  = overlay.bounds;

        overlay.position = this.viewport.pixelFromPoint(
            bounds.getTopLeft(), 
            true
        );
        overlay.size     = this.viewport.deltaPixelsFromPoints(
            bounds.getSize(), 
            true
        );
        overlay.drawHTML( this.container );
    },

    addOverlay: function( element, location, placement ) {
        element = $.getElement( element );

        if ( this._getOverlayIndex( element ) >= 0 ) {
            // they're trying to add a duplicate overlay
            return;     
        }

        this.overlays.push( new $.Overlay( element, location, placement ) );
        this.updateAgain = true;
    },

    updateOverlay: function( element, location, placement ) {
        var i;

        element = $.getElement( element );
        i = this._getOverlayIndex( element );

        if ( i >= 0 ) {
            this.overlays[ i ].update( location, placement );
            this.updateAgain = true;
        }
    },

    removeOverlay: function( element ) {
        var i;

        element = $.getElement( element );
        i = this._getOverlayIndex( element );

        if ( i >= 0 ) {
            this.overlays[ i ].destroy();
            this.overlays.splice( i, 1 );
            this.updateAgain = true;
        }
    },

    clearOverlays: function() {
        while ( this.overlays.length > 0 ) {
            this.overlays.pop().destroy();
            this.updateAgain = true;
        }
    },


    needsUpdate: function() {
        return this.updateAgain;
    },

    numTilesLoaded: function() {
        return this.tilesLoaded.length;
    },

    reset: function() {
        this._clearTiles();
        this.lastResetTime = new Date().getTime();
        this.updateAgain = true;
    },

    update: function() {
        //this.profiler.beginUpdate();
        this.midUpdate = true;
        this._updateActual();
        this.midUpdate = false;
        //this.profiler.endUpdate();
    },

    loadImage: function(src, callback) {
        var _this = this,
            loading = false,
            image,
            jobid,
            complete;

        if ( !this.imageLoaderLimit || this.downloading < this.imageLoaderLimit ) {
            
            this.downloading++;

            image = new Image();

            complete = function( imagesrc ){
                _this.downloading--;
                if (typeof ( callback ) == "function") {
                    try {
                        callback( image );
                    } catch ( e ) {
                        $.Debug.error(
                            e.name + " while executing " + src +" callback: " + e.message, 
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

function numberOfTiles( drawer, level ){
    
    if ( !drawer.cacheNumTiles[ level ] ) {
        drawer.cacheNumTiles[ level ] = drawer.source.getNumTiles( level );
    }

    return drawer.cacheNumTiles[ level ];
};

}( OpenSeadragon ));
