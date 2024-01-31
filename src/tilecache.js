/*
 * OpenSeadragon - TileCache
 *
 * Copyright (C) 2009 CodePlex Foundation
 * Copyright (C) 2010-2024 OpenSeadragon contributors
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

// private class
var TileRecord = function( options ) {
    $.console.assert( options, "[TileCache.cacheTile] options is required" );
    $.console.assert( options.tile, "[TileCache.cacheTile] options.tile is required" );
    $.console.assert( options.tiledImage, "[TileCache.cacheTile] options.tiledImage is required" );
    this.tile = options.tile;
    this.tiledImage = options.tiledImage;
};

// private class
var ImageRecord = function(options) {
    $.console.assert( options, "[ImageRecord] options is required" );
    $.console.assert( options.data, "[ImageRecord] options.data is required" );
    this._tiles = [];

    options.create.apply(null, [this, options.data, options.ownerTile]);
    this._destroyImplementation = options.destroy.bind(null, this);
    this.getImage = options.getImage.bind(null, this);
    this.getData = options.getData.bind(null, this);
    this.getRenderedContext = options.getRenderedContext.bind(null, this);
};

ImageRecord.prototype = {
    destroy: function() {
        this._destroyImplementation();
        this._tiles = null;
    },

    addTile: function(tile) {
        $.console.assert(tile, '[ImageRecord.addTile] tile is required');
        this._tiles.push(tile);
    },

    removeTile: function(tile) {
        for (var i = 0; i < this._tiles.length; i++) {
            if (this._tiles[i] === tile) {
                this._tiles.splice(i, 1);
                return;
            }
        }

        $.console.warn('[ImageRecord.removeTile] trying to remove unknown tile', tile);
    },

    getTileCount: function() {
        return this._tiles.length;
    }
};

/**
 * @class TileCache
 * @memberof OpenSeadragon
 * @classdesc Stores all the tiles displayed in a {@link OpenSeadragon.Viewer}.
 * You generally won't have to interact with the TileCache directly.
 * @param {Object} options - Configuration for this TileCache.
 * @param {Number} [options.maxImageCacheCount] - See maxImageCacheCount in
 * {@link OpenSeadragon.Options} for details.
 */
$.TileCache = function( options ) {
    options = options || {};

    this._maxImageCacheCount = options.maxImageCacheCount || $.DEFAULT_SETTINGS.maxImageCacheCount;
    this._tilesLoaded = [];
    this._imagesLoaded = [];
    this._imagesLoadedCount = 0;
};

/** @lends OpenSeadragon.TileCache.prototype */
$.TileCache.prototype = {
    /**
     * @returns {Number} The total number of tiles that have been loaded by
     * this TileCache.
     */
    numTilesLoaded: function() {
        return this._tilesLoaded.length;
    },

    /**
     * Caches the specified tile, removing an old tile if necessary to stay under the
     * maxImageCacheCount specified on construction. Note that if multiple tiles reference
     * the same image, there may be more tiles than maxImageCacheCount; the goal is to keep
     * the number of images below that number. Note, as well, that even the number of images
     * may temporarily surpass that number, but should eventually come back down to the max specified.
     * @param {Object} options - Tile info.
     * @param {OpenSeadragon.Tile} options.tile - The tile to cache.
     * @param {String} options.tile.cacheKey - The unique key used to identify this tile in the cache.
     * @param {Image} options.image - The image of the tile to cache.
     * @param {OpenSeadragon.TiledImage} options.tiledImage - The TiledImage that owns that tile.
     * @param {Number} [options.cutoff=0] - If adding this tile goes over the cache max count, this
     * function will release an old tile. The cutoff option specifies a tile level at or below which
     * tiles will not be released.
     */
    cacheTile: function( options ) {
        $.console.assert( options, "[TileCache.cacheTile] options is required" );
        $.console.assert( options.tile, "[TileCache.cacheTile] options.tile is required" );
        $.console.assert( options.tile.cacheKey, "[TileCache.cacheTile] options.tile.cacheKey is required" );
        $.console.assert( options.tiledImage, "[TileCache.cacheTile] options.tiledImage is required" );

        var cutoff = options.cutoff || 0;
        var insertionIndex = this._tilesLoaded.length;

        var imageRecord = this._imagesLoaded[options.tile.cacheKey];
        if (!imageRecord) {

            if (!options.data) {
                $.console.error("[TileCache.cacheTile] options.image was renamed to options.data. '.image' attribute " +
                    "has been deprecated and will be removed in the future.");
                options.data = options.image;
            }

            $.console.assert( options.data, "[TileCache.cacheTile] options.data is required to create an ImageRecord" );
            imageRecord = this._imagesLoaded[options.tile.cacheKey] = new ImageRecord({
                data: options.data,
                ownerTile: options.tile,
                create: options.tiledImage.source.createTileCache,
                destroy: options.tiledImage.source.destroyTileCache,
                getImage: options.tiledImage.source.getTileCacheDataAsImage,
                getData: options.tiledImage.source.getTileCacheData,
                getRenderedContext: options.tiledImage.source.getTileCacheDataAsContext2D,
            });

            this._imagesLoadedCount++;
        }

        imageRecord.addTile(options.tile);
        options.tile.cacheImageRecord = imageRecord;

        // Note that just because we're unloading a tile doesn't necessarily mean
        // we're unloading an image. With repeated calls it should sort itself out, though.
        if ( this._imagesLoadedCount > this._maxImageCacheCount ) {
            var worstTile       = null;
            var worstTileIndex  = -1;
            var worstTileRecord = null;
            var prevTile, worstTime, worstLevel, prevTime, prevLevel, prevTileRecord;

            for ( var i = this._tilesLoaded.length - 1; i >= 0; i-- ) {
                prevTileRecord = this._tilesLoaded[ i ];
                prevTile = prevTileRecord.tile;

                if ( prevTile.level <= cutoff || prevTile.beingDrawn ) {
                    continue;
                } else if ( !worstTile ) {
                    worstTile       = prevTile;
                    worstTileIndex  = i;
                    worstTileRecord = prevTileRecord;
                    continue;
                }

                prevTime    = prevTile.lastTouchTime;
                worstTime   = worstTile.lastTouchTime;
                prevLevel   = prevTile.level;
                worstLevel  = worstTile.level;

                if ( prevTime < worstTime ||
                    ( prevTime === worstTime && prevLevel > worstLevel ) ) {
                    worstTile       = prevTile;
                    worstTileIndex  = i;
                    worstTileRecord = prevTileRecord;
                }
            }

            if ( worstTile && worstTileIndex >= 0 ) {
                this._unloadTile(worstTileRecord);
                insertionIndex = worstTileIndex;
            }
        }

        this._tilesLoaded[ insertionIndex ] = new TileRecord({
            tile: options.tile,
            tiledImage: options.tiledImage
        });
    },

    /**
     * Clears all tiles associated with the specified tiledImage.
     * @param {OpenSeadragon.TiledImage} tiledImage
     */
    clearTilesFor: function( tiledImage ) {
        $.console.assert(tiledImage, '[TileCache.clearTilesFor] tiledImage is required');
        var tileRecord;
        for ( var i = 0; i < this._tilesLoaded.length; ++i ) {
            tileRecord = this._tilesLoaded[ i ];
            if ( tileRecord.tiledImage === tiledImage ) {
                this._unloadTile(tileRecord);
                this._tilesLoaded.splice( i, 1 );
                i--;
            }
        }
    },

    // private
    getImageRecord: function(cacheKey) {
        $.console.assert(cacheKey, '[TileCache.getImageRecord] cacheKey is required');
        return this._imagesLoaded[cacheKey];
    },

    // private
    _unloadTile: function(tileRecord) {
        $.console.assert(tileRecord, '[TileCache._unloadTile] tileRecord is required');
        var tile = tileRecord.tile;
        var tiledImage = tileRecord.tiledImage;

        // tile.getCanvasContext should always exist in normal usage (with $.Tile)
        // but the tile cache test passes in a dummy object
        let context2D = tile.getCanvasContext && tile.getCanvasContext();

        tile.unload();
        tile.cacheImageRecord = null;

        var imageRecord = this._imagesLoaded[tile.cacheKey];
        if(!imageRecord){
            return;
        }
        imageRecord.removeTile(tile);
        if (!imageRecord.getTileCount()) {

            imageRecord.destroy();
            delete this._imagesLoaded[tile.cacheKey];
            this._imagesLoadedCount--;

            if(context2D){
                /**
                 * Free up canvas memory
                 * (iOS 12 or higher on 2GB RAM device has only 224MB canvas memory,
                 * and Safari keeps canvas until its height and width will be set to 0).
                 */
                context2D.canvas.width = 0;
                context2D.canvas.height = 0;

                /**
                 * Triggered when an image has just been unloaded
                 *
                 * @event image-unloaded
                 * @memberof OpenSeadragon.Viewer
                 * @type {object}
                 * @property {CanvasRenderingContext2D} context2D - The context that is being unloaded
                 */
                tiledImage.viewer.raiseEvent("image-unloaded", {
                    context2D: context2D,
                    tile: tile
                });
            }

        }

        /**
         * Triggered when a tile has just been unloaded from the cache.
         *
         * @event tile-unloaded
         * @memberof OpenSeadragon.Viewer
         * @type {object}
         * @property {OpenSeadragon.TiledImage} tiledImage - The tiled image of the unloaded tile.
         * @property {OpenSeadragon.Tile} tile - The tile which has been unloaded.
         */
        tiledImage.viewer.raiseEvent("tile-unloaded", {
            tile: tile,
            tiledImage: tiledImage
        });

    }
};

}( OpenSeadragon ));
