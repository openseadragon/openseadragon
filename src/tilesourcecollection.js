/*
 * OpenSeadragon - TileSourceCollection
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
 * @class TileSourceCollection
 * @memberof OpenSeadragon
 * @extends OpenSeadragon.TileSource
 */
$.TileSourceCollection = function( tileSize, tileSources, rows, layout  ) {
    var options;

    if( $.isPlainObject( tileSize ) ){
        options = tileSize;
    }else{
        options = {
            tileSize: arguments[ 0 ],
            tileSources: arguments[ 1 ],
            rows: arguments[ 2 ],
            layout: arguments[ 3 ]
        };
    }

    if( !options.layout ){
        options.layout = 'horizontal';
    }

    var minLevel = 0,
        levelSize = 1.0,
        tilesPerRow = Math.ceil( options.tileSources.length / options.rows ),
        longSide = tilesPerRow >= options.rows ?
            tilesPerRow :
            options.rows;

    if( 'horizontal' == options.layout ){
        options.width = ( options.tileSize ) * tilesPerRow;
        options.height = ( options.tileSize ) * options.rows;
    } else {
        options.height = ( options.tileSize ) * tilesPerRow;
        options.width = ( options.tileSize ) * options.rows;
    }

    options.tileOverlap = -options.tileMargin;
    options.tilesPerRow = tilesPerRow;

    //Set min level to avoid loading sublevels since collection is a
    //different kind of abstraction

    while( levelSize  <  ( options.tileSize ) * longSide ){
        //$.console.log( '%s levelSize %s minLevel %s', options.tileSize * longSide, levelSize, minLevel );
        levelSize = levelSize * 2.0;
        minLevel++;
    }
    options.minLevel = minLevel;

    //for( var name in options ){
    //    $.console.log( 'Collection %s %s', name, options[ name ] );
    //}

    $.TileSource.apply( this, [ options ] );

};

$.extend( $.TileSourceCollection.prototype, $.TileSource.prototype, /** @lends OpenSeadragon.TileSourceCollection.prototype */{

    /**
     * @function
     * @param {Number} level
     * @param {Number} x
     * @param {Number} y
     */
    getTileBounds: function( level, x, y ) {
        var dimensionsScaled = this.dimensions.times( this.getLevelScale( level ) ),
            px = this.tileSize * x - this.tileOverlap,
            py = this.tileSize * y - this.tileOverlap,
            sx = this.tileSize + 1 * this.tileOverlap,
            sy = this.tileSize + 1 * this.tileOverlap,
            scale = 1.0 / dimensionsScaled.x;

        sx = Math.min( sx, dimensionsScaled.x - px );
        sy = Math.min( sy, dimensionsScaled.y - py );

        return new $.Rect( px * scale, py * scale, sx * scale, sy * scale );
    },

    /**
     *
     * @function
     */
    configure: function( data, url ){
        return;
    },


    /**
     * @function
     * @param {Number} level
     * @param {Number} x
     * @param {Number} y
     */
    getTileUrl: function( level, x, y ) {
        //$.console.log([  level, '/', x, '_', y ].join( '' ));
        return null;
    }



});


}( OpenSeadragon ));
