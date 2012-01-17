
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

    getPixelRatio: function(level) {
        if (!this.cachePixelRatios[level]) {
            this.cachePixelRatios[level] = this.source.getPixelRatio(level);
        }

        return this.cachePixelRatios[level];
    },


    _getTile: function(level, x, y, time, numTilesX, numTilesY) {
        if (!this.tilesMatrix[level]) {
            this.tilesMatrix[level] = {};
        }
        if (!this.tilesMatrix[level][x]) {
            this.tilesMatrix[level][x] = {};
        }

        if (!this.tilesMatrix[level][x][y]) {
            var xMod = (numTilesX + (x % numTilesX)) % numTilesX;
            var yMod = (numTilesY + (y % numTilesY)) % numTilesY;
            var bounds = this.source.getTileBounds(level, xMod, yMod);
            var exists = this.source.tileExists(level, xMod, yMod);
            var url = this.source.getTileUrl(level, xMod, yMod);

            bounds.x += 1.0 * (x - xMod) / numTilesX;
            bounds.y += this.normHeight * (y - yMod) / numTilesY;

            this.tilesMatrix[level][x][y] = new $.Tile(level, x, y, bounds, exists, url);
        }

        var tile = this.tilesMatrix[level][x][y];

        tile.lastTouchTime = time;

        return tile;
    },

    _loadTile: function(tile, time) {
        tile.loading = this.loadImage(
            tile.url,
            $.createCallback(
                null, 
                $.delegate(this, this._onTileLoad), 
                tile, 
                time
            )
        );
    },

    _onTileLoad: function(tile, time, image) {
        tile.loading = false;

        if (this.midUpdate) {
            $.Debug.error("Tile load callback in middle of drawing routine.");
            return;
        } else if (!image) {
            $.Debug.log("Tile " + tile + " failed to load: " + tile.url);
            tile.exists = false;
            return;
        } else if (time < this.lastResetTime) {
            $.Debug.log("Ignoring tile " + tile + " loaded before reset: " + tile.url);
            return;
        }

        tile.loaded = true;
        tile.image = image;

        var insertionIndex = this.tilesLoaded.length;

        if (this.tilesLoaded.length >= QUOTA) {
            var cutoff = Math.ceil(Math.log(this.tileSize) / Math.log(2));

            var worstTile = null;
            var worstTileIndex = -1;

            for (var i = this.tilesLoaded.length - 1; i >= 0; i--) {
                var prevTile = this.tilesLoaded[i];

                if (prevTile.level <= this.cutoff || prevTile.beingDrawn) {
                    continue;
                } else if (!worstTile) {
                    worstTile = prevTile;
                    worstTileIndex = i;
                    continue;
                }

                var prevTime = prevTile.lastTouchTime;
                var worstTime = worstTile.lastTouchTime;
                var prevLevel = prevTile.level;
                var worstLevel = worstTile.level;

                if (prevTime < worstTime ||
                            (prevTime == worstTime && prevLevel > worstLevel)) {
                    worstTile = prevTile;
                    worstTileIndex = i;
                }
            }

            if (worstTile && worstTileIndex >= 0) {
                worstTile.unload();
                insertionIndex = worstTileIndex;
            }
        }

        this.tilesLoaded[insertionIndex] = tile;
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
    _providesCoverage: function(level, x, y) {
        if (!this.coverage[level]) {
            return false;
        }

        if (x === undefined || y === undefined) {
            var rows = this.coverage[level];
            for (var i in rows) {
                if (rows.hasOwnProperty(i)) {
                    var cols = rows[i];
                    for (var j in cols) {
                        if (cols.hasOwnProperty(j) && !cols[j]) {
                            return false;
                        }
                    }
                }
            }

            return true;
        }

        return (this.coverage[level][x] === undefined ||
                    this.coverage[level][x][y] === undefined ||
                    this.coverage[level][x][y] === true);
    },

    /**
    * Returns true if the given tile is completely covered by higher-level
    * tiles of higher resolution representing the same content. If neither x
    * nor y is given, returns true if the entire visible level is covered.
    */
    _isCovered: function(level, x, y) {
        if (x === undefined || y === undefined) {
            return this._providesCoverage(level + 1);
        } else {
            return (this._providesCoverage(level + 1, 2 * x, 2 * y) &&
                        this._providesCoverage(level + 1, 2 * x, 2 * y + 1) &&
                        this._providesCoverage(level + 1, 2 * x + 1, 2 * y) &&
                        this._providesCoverage(level + 1, 2 * x + 1, 2 * y + 1));
        }
    },

    /**
    * Sets whether the given tile provides coverage or not.
    */
    _setCoverage: function(level, x, y, covers) {
        if (!this.coverage[level]) {
            $.Debug.error("Setting coverage for a tile before its " +
                        "level's coverage has been reset: " + level);
            return;
        }

        if (!this.coverage[level][x]) {
            this.coverage[level][x] = {};
        }

        this.coverage[level][x][y] = covers;
    },

    /**
    * Resets coverage information for the given level. This should be called
    * after every draw routine. Note that at the beginning of the next draw
    * routine, coverage for every visible tile should be explicitly set. 
    */
    _resetCoverage: function(level) {
        this.coverage[level] = {};
    },


    _compareTiles: function(prevBest, tile) {
        if (!prevBest) {
            return tile;
        }

        if (tile.visibility > prevBest.visibility) {
            return tile;
        } else if (tile.visibility == prevBest.visibility) {
            if (tile.distance < prevBest.distance) {
                return tile;
            }
        }

        return prevBest;
    },


    _getOverlayIndex: function(elmt) {
        for (var i = this.overlays.length - 1; i >= 0; i--) {
            if (this.overlays[i].elmt == elmt) {
                return i;
            }
        }

        return -1;
    },


    _updateActual: function() {
        this.updateAgain = false;

        var _canvas = this.canvas;
        var _context = this.context;
        var _container = this.container;
        var _lastDrawn = this.lastDrawn;

        while (_lastDrawn.length > 0) {
            var tile = _lastDrawn.pop();
            tile.beingDrawn = false;
        }

        var viewportSize = this.viewport.getContainerSize();
        var viewportWidth = viewportSize.x;
        var viewportHeight = viewportSize.y;

        _canvas.innerHTML = "";
        if ( USE_CANVAS ) {
            _canvas.width = viewportWidth;
            _canvas.height = viewportHeight;
            _context.clearRect(0, 0, viewportWidth, viewportHeight);
        }

        var viewportBounds = this.viewport.getBounds(true);
        var viewportTL = viewportBounds.getTopLeft();
        var viewportBR = viewportBounds.getBottomRight();
        if (!this.config.wrapHorizontal &&
                    (viewportBR.x < 0 || viewportTL.x > 1)) {
            return;
        } else if (!this.config.wrapVertical &&
                    (viewportBR.y < 0 || viewportTL.y > this.normHeight)) {
            return;
        }




        var _abs = Math.abs;
        var _ceil = Math.ceil;
        var _floor = Math.floor;
        var _log = Math.log;
        var _max = Math.max;
        var _min = Math.min;
        var alwaysBlend = this.config.alwaysBlend;
        var blendTimeMillis = 1000 * this.config.blendTime;
        var immediateRender = this.config.immediateRender;
        var wrapHorizontal = this.config.wrapHorizontal;
        var wrapVertical = this.config.wrapVertical;

        if (!wrapHorizontal) {
            viewportTL.x = _max(viewportTL.x, 0);
            viewportBR.x = _min(viewportBR.x, 1);
        }
        if (!wrapVertical) {
            viewportTL.y = _max(viewportTL.y, 0);
            viewportBR.y = _min(viewportBR.y, this.normHeight);
        }

        var best = null;
        var haveDrawn = false;
        var currentTime = new Date().getTime();

        var viewportCenter = this.viewport.pixelFromPoint(this.viewport.getCenter());
        var zeroRatioT = this.viewport.deltaPixelsFromPoints(this.source.getPixelRatio(0), false).x;
        var optimalPixelRatio = immediateRender ? 1 : zeroRatioT;

        var lowestLevel = _max(this.minLevel, _floor(_log(this.config.minZoomImageRatio) / _log(2)));
        var zeroRatioC = this.viewport.deltaPixelsFromPoints(this.source.getPixelRatio(0), true).x;
        var highestLevel = _min(this.maxLevel,
                    _floor(_log(zeroRatioC / MIN_PIXEL_RATIO) / _log(2)));

        lowestLevel = _min(lowestLevel, highestLevel);

        for (var level = highestLevel; level >= lowestLevel; level--) {
            var drawLevel = false;
            var renderPixelRatioC = this.viewport.deltaPixelsFromPoints(
                        this.source.getPixelRatio(level), true).x;     // note the .x!

            if ((!haveDrawn && renderPixelRatioC >= MIN_PIXEL_RATIO) ||
                        level == lowestLevel) {
                drawLevel = true;
                haveDrawn = true;
            } else if (!haveDrawn) {
                continue;
            }

            this._resetCoverage(level);

            var levelOpacity = _min(1, (renderPixelRatioC - 0.5) / 0.5);
            var renderPixelRatioT = this.viewport.deltaPixelsFromPoints(
                        this.source.getPixelRatio(level), false).x;
            var levelVisibility = optimalPixelRatio /
                        _abs(optimalPixelRatio - renderPixelRatioT);

            var tileTL = this.source.getTileAtPoint(level, viewportTL);
            var tileBR = this.source.getTileAtPoint(level, viewportBR);
            var numTiles = numberOfTiles( this, level );
            var numTilesX = numTiles.x;
            var numTilesY = numTiles.y;
            if (!wrapHorizontal) {
                tileBR.x = _min(tileBR.x, numTilesX - 1);
            }
            if (!wrapVertical) {
                tileBR.y = _min(tileBR.y, numTilesY - 1);
            }

            for (var x = tileTL.x; x <= tileBR.x; x++) {
                for (var y = tileTL.y; y <= tileBR.y; y++) {
                    var tile = this._getTile(level, x, y, currentTime, numTilesX, numTilesY);
                    var drawTile = drawLevel;

                    this._setCoverage(level, x, y, false);

                    if (!tile.exists) {
                        continue;
                    }

                    if (haveDrawn && !drawTile) {
                        if (this._isCovered(level, x, y)) {
                            this._setCoverage(level, x, y, true);
                        } else {
                            drawTile = true;
                        }
                    }

                    if (!drawTile) {
                        continue;
                    }

                    var boundsTL = tile.bounds.getTopLeft();
                    var boundsSize = tile.bounds.getSize();
                    var positionC = this.viewport.pixelFromPoint(boundsTL, true);
                    var sizeC = this.viewport.deltaPixelsFromPoints(boundsSize, true);

                    if (!this.tileOverlap) {
                        sizeC = sizeC.plus(new $.Point(1, 1));
                    }

                    var positionT = this.viewport.pixelFromPoint(boundsTL, false);
                    var sizeT = this.viewport.deltaPixelsFromPoints(boundsSize, false);
                    var tileCenter = positionT.plus(sizeT.divide(2));
                    var tileDistance = viewportCenter.distanceTo(tileCenter);

                    tile.position = positionC;
                    tile.size = sizeC;
                    tile.distance = tileDistance;
                    tile.visibility = levelVisibility;

                    if (tile.loaded) {
                        if (!tile.blendStart) {
                            tile.blendStart = currentTime;
                        }

                        var deltaTime = currentTime - tile.blendStart;
                        var opacity = _min(1, deltaTime / blendTimeMillis);
                        
                        if (alwaysBlend) {
                            opacity *= levelOpacity;
                        }

                        tile.opacity = opacity;

                        _lastDrawn.push(tile);

                        if (opacity == 1) {
                            this._setCoverage(level, x, y, true);
                        } else if (deltaTime < blendTimeMillis) {
                            updateAgain = true;
                        }
                    } else if (tile.Loading) {
                    } else {
                        best = this._compareTiles(best, tile);
                    }
                }
            }

            if (this._providesCoverage(level)) {
                break;
            }
        }

        for (var i = _lastDrawn.length - 1; i >= 0; i--) {
            var tile = _lastDrawn[i];

            if ( USE_CANVAS ) {
                tile.drawCanvas(_context);
            } else {
                tile.drawHTML(_canvas);
            }

            tile.beingDrawn = true;
        }

        var numOverlays = this.overlays.length;
        for (var i = 0; i < numOverlays; i++) {
            var overlay = this.overlays[i];
            var bounds = overlay.bounds;

            overlay.position = this.viewport.pixelFromPoint(bounds.getTopLeft(), true);
            overlay.size = this.viewport.deltaPixelsFromPoints(bounds.getSize(), true);
            overlay.drawHTML(_container);
        }

        if (best) {
            this._loadTile(best, currentTime);
            this.updateAgain = true; // because we haven't finished drawing, so
        }
    },


    addOverlay: function(elmt, loc, placement) {
        var elmt = $.getElement(elmt);

        if (this._getOverlayIndex(elmt) >= 0) {
            return;     // they're trying to add a duplicate overlay
        }

        this.overlays.push(new $.Overlay(elmt, loc, placement));
        this.updateAgain = true;
    },

    updateOverlay: function(elmt, loc, placement) {
        var elmt = $.getElement(elmt);
        var i = this._getOverlayIndex(elmt);

        if (i >= 0) {
            this.overlays[i].update(loc, placement);
            this.updateAgain = true;
        }
    },

    removeOverlay: function(elmt) {
        var elmt = $.getElement(elmt);
        var i = this._getOverlayIndex(elmt);

        if (i >= 0) {
            this.overlays[i].destroy();
            this.overlays.splice(i, 1);
            this.updateAgain = true;
        }
    },

    clearOverlays: function() {
        while (this.overlays.length > 0) {
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
