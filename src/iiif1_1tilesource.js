/*
 * OpenSeadragon - IIIF1_1TileSource
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
 * @class IIIF1_1TileSource
 * @classdesc A client implementation of the International Image Interoperability
 * Format: Image API 1.1
 *
 * @memberof OpenSeadragon
 * @extends OpenSeadragon.TileSource
 * @see http://library.stanford.edu/iiif/image-api/
 */
$.IIIF1_1TileSource = function( options ){


    $.extend( true, this, options );


    if ( !( this.height && this.width && this['@id'] ) ){
        throw new Error( 'IIIF required parameters not provided.' );
    }

    if ( ( this.profile &&
        this.profile == "http://library.stanford.edu/iiif/image-api/1.1/compliance.html#level0" ) ){
        // what if not reporting a profile?
        throw new Error( 'IIIF Image API 1.1 compliance level 1 or greater is required.' );
    }

    if ( this.tile_width ) {
        options.tileSize = this.tile_width;
    } else if ( this.tile_height ) {
        options.tileSize = this.tile_height;
    } else {
        // use the largest of tileOptions that is smaller than the short
        // dimension

        var shortDim = Math.min( this.height, this.width ),
            tileOptions = [256,512,1024],
            smallerTiles = [];

            for ( var c = 0; c < tileOptions.length; c++ ) {
                if ( tileOptions[c] <= shortDim ) {
                    smallerTiles.push( tileOptions[c] );
                }
            }

        if ( smallerTiles.length > 0 ) {
            options.tileSize = Math.max.apply( null, smallerTiles );
        } else {
            // If we're smaller than 256, just use the short side.
            options.tileSize = shortDim;
        }
        this.tile_width = options.tileSize;  // So that 'full' gets used for 
        this.tile_height = options.tileSize; // the region below
    }

    if ( !options.maxLevel ) {
        var mf = -1;
        var scfs = this.scale_factors || this.scale_factor;
        if ( scfs instanceof Array ) {
            for ( var i = 0; i < scfs.length; i++ ) {
                var cf = Number( scfs[i] );
                if ( !isNaN( cf ) && cf > mf ) { mf = cf; }
            }
        }
        if ( mf < 0 ) { options.maxLevel = Number( Math.ceil( Math.log( Math.max( this.width, this.height ), 2 ) ) ); }
        else { options.maxLevel = mf; }
    }

    $.TileSource.apply( this, [ options ] );
};

$.extend( $.IIIF1_1TileSource.prototype, $.TileSource.prototype, /** @lends OpenSeadragon.IIIF1_1TileSource.prototype */{
    /**
     * Determine if the data and/or url imply the image service is supported by
     * this tile source.
     * @function
     * @param {Object|Array} data
     * @param {String} optional - url
     */
    supports: function( data, url ) {
        return ( data['@context'] &&
            data['@context'] == "http://library.stanford.edu/iiif/image-api/1.1/context.json" );
    },

    /**
     *
     * @function
     * @param {Object} data - the raw configuration
     * @example <caption>IIIF 1.1 Info Looks like this (XML syntax is no more)</caption>
     * {
     *   "@context" : "http://library.stanford.edu/iiif/image-api/1.1/context.json",
     *   "@id" : "http://iiif.example.com/prefix/1E34750D-38DB-4825-A38A-B60A345E591C",
     *   "width" : 6000,
     *   "height" : 4000,
     *   "scale_factors" : [ 1, 2, 4 ],
     *   "tile_width" : 1024,
     *   "tile_height" : 1024,
     *   "formats" : [ "jpg", "png" ],
     *   "qualities" : [ "native", "grey" ],
     *   "profile" : "http://library.stanford.edu/iiif/image-api/1.1/compliance.html#level0"
     * }
     */
    configure: function( data ){
      return data;
    },
    /**
     * Responsible for retreiving the url which will return an image for the
     * region specified by the given x, y, and level components.
     * @function
     * @param {Number} level - z index
     * @param {Number} x
     * @param {Number} y
     * @throws {Error}
     */
    getTileUrl: function( level, x, y ){

        //# constants

        var IIIF_ROTATION = '0',
            IIIF_QUALITY = 'native.jpg',

            //## get the scale (level as a decimal)
            scale = Math.pow( 0.5, this.maxLevel - level ),

            //# image dimensions at this level
            levelWidth = Math.ceil( this.width * scale ),
            levelHeight = Math.ceil( this.height * scale ),

            //## iiif region
            iiifTileSizeWidth = Math.ceil( this.tileSize / scale ),
            iiifTileSizeHeight = Math.ceil( this.tileSize / scale ),
            iiifRegion,
            iiifTileX,
            iiifTileY,
            iiifTileW,
            iiifTileH,
            iiifSize,
            uri;

        if ( levelWidth < this.tile_width && levelHeight < this.tile_height ){
            iiifSize = levelWidth + ",";
            iiifRegion = 'full';
        } else {
            iiifTileX = x * iiifTileSizeWidth;
            iiifTileY = y * iiifTileSizeHeight;
            iiifTileW = Math.min( iiifTileSizeWidth, this.width - iiifTileX );
            iiifTileH = Math.min( iiifTileSizeHeight, this.height - iiifTileY );

            iiifSize = Math.ceil( iiifTileW * scale ) + ",";

            iiifRegion = [ iiifTileX, iiifTileY, iiifTileW, iiifTileH ].join( ',' );
        }
        uri = [ this['@id'], iiifRegion, iiifSize, IIIF_ROTATION, IIIF_QUALITY ].join( '/' );
        return uri;
    }
  });

}( OpenSeadragon ));
