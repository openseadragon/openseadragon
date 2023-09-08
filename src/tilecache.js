/*
 * OpenSeadragon - TileCache
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

/**
 * Cached Data Record, the cache object.
 * Keeps only latest object type required.
 * @typedef {{
 *    getImage: function,
 *    getData: function,
 *    getRenderedContext: function
 * }} OpenSeadragon.CacheRecord
 */
$.CacheRecord = class {
    constructor() {
        this._tiles = [];
    }

    destroy() {
        this._tiles = null;
        this._data = null;
        this._type = null;
    }

    save() {
        for (let tile of this._tiles) {
            tile._needsDraw = true;
        }
    }

    get data() {
        $.console.warn("[CacheRecord.data] is deprecated property. Use getData(...) instead!");
        return this._data;
    }

    set data(value) {
        //FIXME: addTile bit bad name, related to the issue mentioned elsewhere
        $.console.warn("[CacheRecord.data] is deprecated property. Use addTile(...) instead!");
        this._data = value;
        this._type = $.convertor.guessType(value);
    }

    getImage() {
        return this.getData("image");
    }

    getRenderedContext() {
        return this.getData("context2d");
    }

    getData(type = this._type) {
        if (type !== this._type) {
            this._data = $.convertor.convert(this._data, this._type, type);
            this._type = type;
        }
        return this._data;
    }

    addTile(tile, data, type) {
        $.console.assert(tile, '[CacheRecord.addTile] tile is required');

        //allow overriding the cache - existing tile or different type
        if (this._tiles.includes(tile)) {
            this.removeTile(tile);
        } else if (!this._type !== type) {
            this._type = type;
            this._data = data;
        }

        this._tiles.push(tile);
    }

    removeTile(tile) {
        for (let i = 0; i < this._tiles.length; i++) {
            if (this._tiles[i] === tile) {
                this._tiles.splice(i, 1);
                return;
            }
        }

        $.console.warn('[CacheRecord.removeTile] trying to remove unknown tile', tile);
    }

    getTileCount() {
        return this._tiles.length;
    }
};

//FIXME: really implement or throw away? new parameter would allow users to
// use this implementation isntead of the above to allow caching for old data
// (for example in the default use, the data is downloaded as an image, and
// converted to a canvas -> the image record gets thrown away)
$.MemoryCacheRecord = class extends $.CacheRecord {
    constructor(memorySize) {
        super();
        this.length = memorySize;
        this.index = 0;
        this.content = [];
        this.types = [];
        this.defaultType = "image";
    }

    // overrides:

    destroy() {
        super.destroy();
        this.types = null;
        this.content = null;
        this.types = null;
        this.defaultType = null;
    }

    getData(type = this.defaultType) {
        let item = this.add(type, undefined);
        if (item === undefined) {
            //no such type available, get if possible
            //todo: possible unomptimal use, we could cache costs and re-use known paths, though it adds overhead...
            item = $.convertor.convert(this.current(), this.currentType(), type);
            this.add(type, item);
        }
        return item;
    }

    /**
     * @deprecated
     */
    get data() {
        $.console.warn("[MemoryCacheRecord.data] is deprecated property. Use getData(...) instead!");
        return this.current();
    }

    /**
     * @deprecated
     * @param value
     */
    set data(value) {
        //FIXME: addTile bit bad name, related to the issue mentioned elsewhere
        $.console.warn("[MemoryCacheRecord.data] is deprecated property. Use addTile(...) instead!");
        this.defaultType = $.convertor.guessType(value);
        this.add(this.defaultType, value);
    }

    addTile(tile, data, type) {
        $.console.assert(tile, '[CacheRecord.addTile] tile is required');

        //allow overriding the cache - existing tile or different type
        if (this._tiles.includes(tile)) {
            this.removeTile(tile);
        } else if (!this.defaultType !== type) {
            this.defaultType = type;
            this.add(type, data);
        }

        this._tiles.push(tile);
    }

    // extends:

    add(type, item) {
        const index = this.hasIndex(type);
        if (index > -1) {
            //no index change, swap (optimally, move all by one - too expensive...)
            item = this.content[index];
            this.content[index] = this.content[this.index];
        } else {
            this.index = (this.index + 1) % this.length;
        }
        this.content[this.index] = item;
        this.types[this.index] = type;
        return item;
    }

    has(type) {
        for (let i = 0; i < this.types.length; i++) {
            const t = this.types[i];
            if (t === type) {
                return this.content[i];
            }
        }
        return undefined;
    }

    hasIndex(type) {
        for (let i = 0; i < this.types.length; i++) {
            const t = this.types[i];
            if (t === type) {
                return i;
            }
        }
        return -1;
    }

    current() {
        return this.content[this.index];
    }

    currentType() {
        return this.types[this.index];
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
$.TileCache = class {
    constructor( options ) {
        options = options || {};

        this._maxCacheItemCount = options.maxImageCacheCount || $.DEFAULT_SETTINGS.maxImageCacheCount;
        this._tilesLoaded = [];
        this._cachesLoaded = [];
        this._cachesLoadedCount = 0;
    }

    /**
     * @returns {Number} The total number of tiles that have been loaded by
     * this TileCache. Note that the tile might be recorded here mutliple times,
     * once for each cache it uses.
     */
    numTilesLoaded() {
        return this._tilesLoaded.length;
    }

    /**
     * Caches the specified tile, removing an old tile if necessary to stay under the
     * maxImageCacheCount specified on construction. Note that if multiple tiles reference
     * the same image, there may be more tiles than maxImageCacheCount; the goal is to keep
     * the number of images below that number. Note, as well, that even the number of images
     * may temporarily surpass that number, but should eventually come back down to the max specified.
     * @param {Object} options - Tile info.
     * @param {OpenSeadragon.Tile} options.tile - The tile to cache.
     * @param {String} [options.cacheKey=undefined] - Cache Key to use. Defaults to options.tile.cacheKey
     * @param {String} options.tile.cacheKey - The unique key used to identify this tile in the cache.
     *   Used if cacheKey not set.
     * @param {Image} options.image - The image of the tile to cache. Deprecated.
     * @param {*} options.data - The data of the tile to cache.
     * @param {string} [options.dataType] - The data type of the tile to cache. Required.
     * @param {Number} [options.cutoff=0] - If adding this tile goes over the cache max count, this
     *   function will release an old tile. The cutoff option specifies a tile level at or below which
     *   tiles will not be released.
     */
    cacheTile( options ) {
        $.console.assert( options, "[TileCache.cacheTile] options is required" );
        $.console.assert( options.tile, "[TileCache.cacheTile] options.tile is required" );
        $.console.assert( options.tile.cacheKey, "[TileCache.cacheTile] options.tile.cacheKey is required" );

        let cutoff = options.cutoff || 0,
            insertionIndex = this._tilesLoaded.length,
            cacheKey = options.cacheKey || options.tile.cacheKey;

        let cacheRecord = this._cachesLoaded[options.tile.cacheKey];
        if (!cacheRecord) {

            if (!options.data) {
                $.console.error("[TileCache.cacheTile] options.image was renamed to options.data. '.image' attribute " +
                    "has been deprecated and will be removed in the future.");
                options.data = options.image;
            }

            $.console.assert( options.data, "[TileCache.cacheTile] options.data is required to create an CacheRecord" );
            cacheRecord = this._cachesLoaded[options.tile.cacheKey] = new $.CacheRecord();
            this._cachesLoadedCount++;
        } else if (cacheRecord.__zombie__) {
            delete cacheRecord.__zombie__;
            //revive cache, replace from _tilesLoaded so it won't get unloaded
            this._tilesLoaded.splice( cacheRecord.__index__, 1 );
            delete cacheRecord.__index__;
            insertionIndex--;
        }

        if (!options.dataType) {
            $.console.error("[TileCache.cacheTile] options.dataType is newly required. " +
                "For easier use of the cache system, use the tile instance API.");
            options.dataType = $.convertor.guessType(options.data);
        }
        cacheRecord.addTile(options.tile, options.data, options.dataType);
        options.tile._caches[ cacheKey ] = cacheRecord;

        // Note that just because we're unloading a tile doesn't necessarily mean
        // we're unloading its cache records. With repeated calls it should sort itself out, though.
        if ( this._cachesLoadedCount > this._maxCacheItemCount ) {
            let worstTile       = null;
            let worstTileIndex  = -1;
            let prevTile, worstTime, worstLevel, prevTime, prevLevel;

            for ( let i = this._tilesLoaded.length - 1; i >= 0; i-- ) {
                prevTile = this._tilesLoaded[ i ];

                //todo try different approach? the only ugly part, keep tilesLoaded array empty of unloaded tiles
                if (!prevTile.loaded) {
                    //iterates from the array end, safe to remove
                    this._tilesLoaded.splice( i, 1 );
                    continue;
                }

                if ( prevTile.__zombie__ !== undefined ) {
                    //remove without hesitation, CacheRecord instance
                    worstTile       = prevTile.__zombie__;
                    worstTileIndex  = i;
                    break;
                }

                if ( prevTile.level <= cutoff || prevTile.beingDrawn ) {
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
                    ( prevTime === worstTime && prevLevel > worstLevel )) {
                    worstTile       = prevTile;
                    worstTileIndex  = i;
                }
            }

            if ( worstTile && worstTileIndex >= 0 ) {
                this._unloadTile(worstTile, true);
                insertionIndex = worstTileIndex;
            }
        }

        this._tilesLoaded[ insertionIndex ] = options.tile;
    }

    /**
     * Clears all tiles associated with the specified tiledImage.
     * @param {OpenSeadragon.TiledImage} tiledImage
     */
    clearTilesFor( tiledImage ) {
        $.console.assert(tiledImage, '[TileCache.clearTilesFor] tiledImage is required');
        let tile;
        for ( let i = this._tilesLoaded.length - 1; i >= 0; i-- ) {
            tile = this._tilesLoaded[ i ];

            //todo try different approach? the only ugly part, keep tilesLoaded array empty of unloaded tiles
            if (!tile.loaded) {
                //iterates from the array end, safe to remove
                this._tilesLoaded.splice( i, 1 );
                i--;
            } else if ( tile.tiledImage === tiledImage ) {
                this._unloadTile(tile, !tiledImage._zombieCache ||
                    this._cachesLoadedCount > this._maxCacheItemCount, i);
            }
        }
    }

    // private
    getCacheRecord(cacheKey) {
        $.console.assert(cacheKey, '[TileCache.getCacheRecord] cacheKey is required');
        return this._cachesLoaded[cacheKey];
    }

    /**
     * @param tile tile to unload
     * @param destroy destroy tile cache if the cache tile counts falls to zero
     * @param deleteAtIndex index to remove the tile record at, will not remove from _tiledLoaded if not set
     * @private
     */
    _unloadTile(tile, destroy, deleteAtIndex) {
        $.console.assert(tile, '[TileCache._unloadTile] tile is required');

        for (let key in tile._caches) {
            const cacheRecord = this._cachesLoaded[key];
            if (cacheRecord) {
                cacheRecord.removeTile(tile);
                if (!cacheRecord.getTileCount()) {
                    if (destroy) {
                        // #1 tile marked as destroyed (e.g. too much cached tiles or not a zombie)
                        cacheRecord.destroy();
                        delete this._cachesLoaded[tile.cacheKey];
                        this._cachesLoadedCount--;

                        //delete also the tile record
                        if (deleteAtIndex !== undefined) {
                            this._tilesLoaded.splice( deleteAtIndex, 1 );
                        }
                    } else if (deleteAtIndex !== undefined) {
                        // #2 Tile is a zombie. Do not delete record, reuse.
                        // a bit dirty but performant... -> we can remove later, or revive
                        // we can do this, in array the tile is once for each its cache object
                        this._tilesLoaded[ deleteAtIndex ] = cacheRecord;
                        cacheRecord.__zombie__ = tile;
                        cacheRecord.__index__ = deleteAtIndex;
                    }
                } else if (deleteAtIndex !== undefined) {
                    // #3 Cache stays. Tile record needs to be removed anyway, since the tile is removed.
                    this._tilesLoaded.splice( deleteAtIndex, 1 );
                }
            } else {
                $.console.warn("[TileCache._unloadTile] Attempting to delete missing cache!");
            }
        }
        const tiledImage = tile.tiledImage;
        tile.unload();

        /**
         * Triggered when a tile has just been unloaded from memory.
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
