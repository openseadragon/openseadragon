/*
 * OpenSeadragon - LegacyTileSource
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

(function( $ ){

/**
 * @class LegacyTileSource
 * @classdesc The LegacyTileSource allows simple, traditional image pyramids to be loaded
 * into an OpenSeadragon Viewer.  Basically, this translates to the historically
 * common practice of starting with a 'master' image, maybe a tiff for example,
 * and generating a set of 'service' images like one or more thumbnails, a medium
 * resolution image and a high resolution image in standard web formats like
 * png or jpg.
 *
 * @memberof OpenSeadragon
 * @extends OpenSeadragon.TileSource
 * @param {Array} levels An array of file descriptions, each is an object with
 *      a 'url', a 'width', and a 'height'.  Overriding classes can expect more
 *      properties but these properties are sufficient for this implementation.
 *      Additionally, the levels are required to be listed in order from
 *      smallest to largest.
 * @property {Number} aspectRatio
 * @property {Number} dimensions
 * @property {Number} tileSize
 * @property {Number} tileOverlap
 * @property {Number} minLevel
 * @property {Number} maxLevel
 * @property {Array}  levels
 */
$.LegacyTileSource = function( levels ) {

    var options,
        width,
        height;

    if( $.isArray( levels ) ){
        options = {
            type: 'legacy-image-pyramid',
            levels: levels
        };
    }

    //clean up the levels to make sure we support all formats
    options.levels = filterFiles( options.levels );

    if ( options.levels.length > 0 ) {
        width = options.levels[ options.levels.length - 1 ].width;
        height = options.levels[ options.levels.length - 1 ].height;
    }
    else {
        width = 0;
        height = 0;
        $.console.error( "No supported image formats found" );
    }

    $.extend( true, options, {
        width: width,
        height: height,
        tileSize: Math.max( height, width ),
        tileOverlap: 0,
        minLevel: 0,
        maxLevel: options.levels.length > 0 ? options.levels.length - 1 : 0
    } );

    $.TileSource.apply( this, [ options ] );

    this.levels = options.levels;
};

$.extend( $.LegacyTileSource.prototype, $.TileSource.prototype, /** @lends OpenSeadragon.LegacyTileSource.prototype */{
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
            "legacy-image-pyramid" === data.type
        ) || (
            data.documentElement &&
            "legacy-image-pyramid" === data.documentElement.getAttribute('type')
        );
    },


    /**
     *
     * @function
     * @param {Object|XMLDocument} configuration - the raw configuration
     * @param {String} dataUrl - the url the data was retrieved from if any.
     * @param {String} postData - HTTP POST data in k=v&k2=v2... form or null
     * @returns {Object} options - A dictionary of keyword arguments sufficient
     *      to configure this tile sources constructor.
     */
    configure: function( configuration, dataUrl, postData ){

        var options;

        if( !$.isPlainObject(configuration) ){

            options = configureFromXML( this, configuration );

        }else{

            options = configureFromObject( this, configuration );
        }

        return options;

    },

    /**
     * @function
     * @param {Number} level
     */
    getLevelScale: function ( level ) {
        var levelScale = NaN;
        if ( this.levels.length > 0 && level >= this.minLevel && level <= this.maxLevel ) {
            levelScale =
                this.levels[ level ].width /
                this.levels[ this.maxLevel ].width;
        }
        return levelScale;
    },

    /**
     * @function
     * @param {Number} level
     */
    getNumTiles: function( level ) {
        var scale = this.getLevelScale( level );
        if ( scale ){
            return new $.Point( 1, 1 );
        } else {
            return new $.Point( 0, 0 );
        }
    },

    /**
     * This method is not implemented by this class other than to throw an Error
     * announcing you have to implement it.  Because of the variety of tile
     * server technologies, and various specifications for building image
     * pyramids, this method is here to allow easy integration.
     * @function
     * @param {Number} level
     * @param {Number} x
     * @param {Number} y
     * @throws {Error}
     */
    getTileUrl: function ( level, x, y ) {
        var url = null;
        if ( this.levels.length > 0 && level >= this.minLevel && level <= this.maxLevel ) {
            url = this.levels[ level ].url;
        }
        return url;
    },

    /**
     * Equality comparator
     */
    equals: function (otherSource) {
        if (!otherSource.levels || otherSource.levels.length !== this.levels.length) {
            return false;
        }
        for (let i = this.minLevel; i <= this.maxLevel; i++) {
            if (this.levels[i].url !== otherSource.levels[i].url) {
                return false;
            }
        }
        return true;
    }
} );

/**
 * This method removes any files from the Array which don't conform to our
 * basic requirements for a 'level' in the LegacyTileSource.
 * @private
 * @inner
 * @function
 */
function filterFiles( files ){
    var filtered = [],
        file,
        i;
    for( i = 0; i < files.length; i++ ){
        file = files[ i ];
        if( file.height &&
            file.width &&
            file.url ){
            //This is sufficient to serve as a level
            filtered.push({
                url: file.url,
                width: Number( file.width ),
                height: Number( file.height )
            });
        }
        else {
            $.console.error( 'Unsupported image format: %s', file.url ? file.url : '<no URL>' );
        }
    }

    return filtered.sort(function(a, b) {
        return a.height - b.height;
    });

}

/**
 * @private
 * @inner
 * @function
 */
function configureFromXML( tileSource, xmlDoc ){

    if ( !xmlDoc || !xmlDoc.documentElement ) {
        throw new Error( $.getString( "Errors.Xml" ) );
    }

    var root         = xmlDoc.documentElement,
        rootName     = root.tagName,
        conf         = null,
        levels       = [],
        level,
        i;

    if ( rootName === "image" ) {

        try {
            conf = {
                type:        root.getAttribute( "type" ),
                levels:      []
            };

            levels = root.getElementsByTagName( "level" );
            for ( i = 0; i < levels.length; i++ ) {
                level = levels[ i ];

                conf.levels.push({
                    url:    level.getAttribute( "url" ),
                    width:  parseInt( level.getAttribute( "width" ), 10 ),
                    height: parseInt( level.getAttribute( "height" ), 10 )
                });
            }

            return configureFromObject( tileSource, conf );

        } catch ( e ) {
            throw (e instanceof Error) ?
                e :
                new Error( 'Unknown error parsing Legacy Image Pyramid XML.' );
        }
    } else if ( rootName === "collection" ) {
        throw new Error( 'Legacy Image Pyramid Collections not yet supported.' );
    } else if ( rootName === "error" ) {
        throw new Error( 'Error: ' + xmlDoc );
    }

    throw new Error( 'Unknown element ' + rootName );
}

/**
 * @private
 * @inner
 * @function
 */
function configureFromObject( tileSource, configuration ){

    return configuration.levels;

}

}( OpenSeadragon ));
