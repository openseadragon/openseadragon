/*
 * OpenSeadragon - TmsTileSource
 *
 * Copyright (C) 2009 CodePlex Foundation
 * Copyright (C) 2010-2025 OpenSeadragon contributors
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

/*
 * Derived from the TMS tile source in Rainer Simon's seajax-utils project
 * <http://github.com/rsimon/seajax-utils>.  Rainer Simon has contributed
 * the included code to the OpenSeadragon project under the New BSD license;
 * see <https://github.com/openseadragon/openseadragon/issues/58>.
 */


(function( $ ){

/**
 * @class TmsTileSource
 * @classdesc A tilesource implementation for Tiled Map Services (TMS).
 * TMS tile scheme ( [ as supported by OpenLayers ] is described here
 * ( http://openlayers.org/dev/examples/tms.html ).
 *
 * @memberof OpenSeadragon
 * @extends OpenSeadragon.TileSource
 * @param {Number|Object} width - the pixel width of the image or the idiomatic
 *      options object which is used instead of positional arguments.
 * @param {Number} height
 * @param {Number} tileSize
 * @param {Number} tileOverlap
 * @param {String} tilesUrl
 */
$.TmsTileSource = function( width, height, tileSize, tileOverlap, tilesUrl ) {
    var options;

    if( $.isPlainObject( width ) ){
        options = width;
    }else{
        options = {
            width: arguments[0],
            height: arguments[1],
            tileSize: arguments[2],
            tileOverlap: arguments[3],
            tilesUrl: arguments[4]
        };
    }
    // TMS has integer multiples of 256 for width/height and adds buffer
    // if necessary -> account for this!
    var bufferedWidth = Math.ceil(options.width / 256) * 256,
        bufferedHeight = Math.ceil(options.height / 256) * 256,
        max;

    // Compute number of zoomlevels in this tileset
    if (bufferedWidth > bufferedHeight) {
        max = bufferedWidth / 256;
    } else {
        max = bufferedHeight / 256;
    }
    options.maxLevel = Math.ceil(Math.log(max) / Math.log(2)) - 1;
    options.tileSize = 256;
    options.width = bufferedWidth;
    options.height = bufferedHeight;

    $.TileSource.apply( this, [ options ] );

};

$.extend( $.TmsTileSource.prototype, $.TileSource.prototype, /** @lends OpenSeadragon.TmsTileSource.prototype */{


    /**
     * Determine if the data and/or url imply the image service is supported by
     * this tile source.
     * @function
     * @param {Object|Array} data
     * @param {String} optional - url
     */
    supports: function( data, url ){
        return ( data.type && "tiledmapservice" === data.type );
    },

    /**
     *
     * @function
     * @param {Object} data - the raw configuration
     * @param {String} url - the url the data was retrieved from if any.
     * @param {String} postData - HTTP POST data in k=v&k2=v2... form or null
     * @returns {Object} options - A dictionary of keyword arguments sufficient
     *      to configure this tile sources constructor.
     */
    configure: function( data, url, postData ){
        return data;
    },


    /**
     * @function
     * @param {Number} level
     * @param {Number} x
     * @param {Number} y
     */
    getTileUrl: function( level, x, y ) {
        // Convert from Deep Zoom definition to TMS zoom definition
        var yTiles = this.getNumTiles( level ).y - 1;

        return this.tilesUrl + level + "/" + x + "/" + (yTiles - y) + ".png";
    },

    /**
     * Equality comparator
     */
    equals: function (otherSource) {
        return this.tilesUrl === otherSource.tilesUrl;
    }
});


}( OpenSeadragon ));
