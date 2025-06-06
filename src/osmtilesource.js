/*
 * OpenSeadragon - OsmTileSource
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
 * Derived from the OSM tile source in Rainer Simon's seajax-utils project
 * <http://github.com/rsimon/seajax-utils>.  Rainer Simon has contributed
 * the included code to the OpenSeadragon project under the New BSD license;
 * see <https://github.com/openseadragon/openseadragon/issues/58>.
 */


(function( $ ){

/**
 * @class OsmTileSource
 * @classdesc A tilesource implementation for OpenStreetMap.<br><br>
 *
 * Note 1. Zoomlevels. Deep Zoom and OSM define zoom levels differently. In  Deep
 * Zoom, level 0 equals an image of 1x1 pixels. In OSM, level 0 equals an image of
 * 256x256 levels (see http://gasi.ch/blog/inside-deep-zoom-2). I.e. there is a
 * difference of log2(256)=8 levels.<br><br>
 *
 * Note 2. Image dimension. According to the OSM Wiki
 * (http://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#Zoom_levels)
 * the highest Mapnik zoom level has 256.144x256.144 tiles, with a 256x256
 * pixel size. I.e. the Deep Zoom image dimension is 65.572.864x65.572.864
 * pixels.
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
$.OsmTileSource = function( width, height, tileSize, tileOverlap, tilesUrl ) {
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
    //apply default setting for standard public OpenStreatMaps service
    //but allow them to be specified so fliks can host there own instance
    //or apply against other services supportting the same standard
    if( !options.width || !options.height ){
        options.width = 65572864;
        options.height = 65572864;
    }
    if( !options.tileSize ){
        options.tileSize = 256;
        options.tileOverlap = 0;
    }
    if( !options.tilesUrl ){
        options.tilesUrl = "http://tile.openstreetmap.org/";
    }
    options.minLevel = 8;

    $.TileSource.apply( this, [ options ] );

};

$.extend( $.OsmTileSource.prototype, $.TileSource.prototype, /** @lends OpenSeadragon.OsmTileSource.prototype */{


    /**
     * Determine if the data and/or url imply the image service is supported by
     * this tile source.
     * @function
     * @param {Object|Array} data
     * @param {String} optional - url
     */
    supports: function( data, url ){
        return (
            data.type &&
            "openstreetmaps" === data.type
        );
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
        return this.tilesUrl + (level - 8) + "/" + x + "/" + y + ".png";
    },

    /**
     * Equality comparator
     */
    equals: function(otherSource) {
        return this.tilesUrl === otherSource.tilesUrl;
    }
});


}( OpenSeadragon ));
