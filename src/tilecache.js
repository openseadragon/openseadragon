/*
 * OpenSeadragon - TileCache
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

var TileRecord = function( params ) {
    $.console.assert( params, "[TileCache.cacheTile] params is required" );
    $.console.assert( params.tile, "[TileCache.cacheTile] params.tile is required" );
    $.console.assert( params.tiledImage, "[TileCache.cacheTile] params.tiledImage is required" );
    this.tile = params.tile;
    this.tiledImage = params.tiledImage;
};

/**
 * @class TileCache
 * @classdesc
 */
$.TileCache = function( options ) {
    options = options || {};

    this._tilesLoaded = [];
    this._maxImageCacheCount = options.maxImageCacheCount || $.DEFAULT_SETTINGS.maxImageCacheCount;
};

$.TileCache.prototype = /** @lends OpenSeadragon.TileCache.prototype */{
    /**
     * Returns the total number of tiles that have been loaded by this TileCache.
     * @method
     * @returns {Number} - The total number of tiles that have been loaded by
     *      this TileCache.
     */
    numTilesLoaded: function() {
        return this._tilesLoaded.length;
    },

    cacheTile: function( params ) {
        $.console.assert( params, "[TileCache.cacheTile] params is required" );
        $.console.assert( params.tile, "[TileCache.cacheTile] params.tile is required" );
        $.console.assert( params.tiledImage, "[TileCache.cacheTile] params.tiledImage is required" );

        var cutoff = params.cutoff || 0;
        var insertionIndex = this._tilesLoaded.length;

        if ( this._tilesLoaded.length >= this._maxImageCacheCount ) {
            var worstTile       = null;
            var worstTileIndex  = -1;
            var prevTile, worstTime, worstLevel, prevTime, prevLevel, prevTileRecord;

            for ( var i = this._tilesLoaded.length - 1; i >= 0; i-- ) {
                prevTileRecord = this._tilesLoaded[ i ];
                prevTile = prevTileRecord.tile;

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

        this._tilesLoaded[ insertionIndex ] = new TileRecord({
            tile: params.tile,
            tiledImage: params.tiledImage
        });
    },

    /**
     * Clears all tiles associated with the specified tiledImage.
     * @method
     */
    clearTilesFor: function( tiledImage ) {
        var tileRecord;
        for ( var i = 0; i < this._tilesLoaded.length; ++i ) {
            tileRecord = this._tilesLoaded[ i ];
            if ( tileRecord.tiledImage === tiledImage ) {
                tileRecord.tile.unload();
                this._tilesLoaded.splice( i, 1 );
                i--;
            }
        }
    }
};

}( OpenSeadragon ));
