/*
 * OpenSeadragon - IIIFTileSource
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
 * @class IIIFTileSource
 * @classdesc A client implementation of the International Image Interoperability Framework
 * Format: Image API 1.0 - 2.1
 *
 * @memberof OpenSeadragon
 * @extends OpenSeadragon.TileSource
 * @see http://iiif.io/api/image/
 */
$.IIIFTileSource = function( options ){


    $.extend( true, this, options );

    if ( !( this.height && this.width && this['@id'] ) ) {
        throw new Error( 'IIIF required parameters not provided.' );
    }

    options.tileSizePerScaleFactor = {};

    // N.B. 2.0 renamed scale_factors to scaleFactors
    if ( this.tile_width && this.tile_height ) {
        options.tileWidth = this.tile_width;
        options.tileHeight = this.tile_height;
    } else if ( this.tile_width ) {
        options.tileSize = this.tile_width;
    } else if ( this.tile_height ) {
        options.tileSize = this.tile_height;
    } else if ( this.tiles ) {
        // Version 2.0 forwards
        if ( this.tiles.length == 1 ) {
            options.tileWidth  = this.tiles[0].width;
            // Use height if provided, otherwise assume square tiles and use width.
            options.tileHeight = this.tiles[0].height || this.tiles[0].width;
            this.scale_factors = this.tiles[0].scaleFactors;
        } else {
            // Multiple tile sizes at different levels
            this.scale_factors = [];
            for (var t = 0; t < this.tiles.length; t++ ) {
                for (var sf = 0; sf < this.tiles[t].scaleFactors.length; sf++) {
                    var scaleFactor = this.tiles[t].scaleFactors[sf];
                    this.scale_factors.push(scaleFactor);
                    options.tileSizePerScaleFactor[scaleFactor] = {
                        width: this.tiles[t].width,
                        height: this.tiles[t].height || this.tiles[t].width
                    };
                }
            }
        }
    } else if ( canBeTiled(options.profile) ) {
        // use the largest of tileOptions that is smaller than the short dimension
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
    } else if (this.sizes && this.sizes.length > 0) {
        // This info.json can't be tiled, but we can still construct a legacy pyramid from the sizes array. 
        // In this mode, IIIFTileSource will call functions from the abstract baseTileSource or the 
        // LegacyTileSource instead of performing IIIF tiling.      
        this.emulateLegacyImagePyramid = true;
        
        options.levels = constructLevels( this );
        // use the largest available size to define tiles
        $.extend( true, options, {
            width: options.levels[ options.levels.length - 1 ].width,
            height: options.levels[ options.levels.length - 1 ].height,
            tileSize: Math.max( options.height, options.width ),
            tileOverlap: 0,
            minLevel: 0,
            maxLevel: options.levels.length - 1
        });
        this.levels = options.levels;
    } else {
        $.console.error("Nothing in the info.json to construct image pyramids from");
    }

    if (!options.maxLevel && !this.emulateLegacyImagePyramid) {
        if (!this.scale_factors) {
            options.maxLevel = Number(Math.ceil(Math.log(Math.max(this.width, this.height), 2)));
        } else {
            options.maxLevel = Math.floor(Math.pow(Math.max.apply(null, this.scale_factors), 0.5));
        }
    }

    $.TileSource.apply( this, [ options ] );
};

$.extend( $.IIIFTileSource.prototype, $.TileSource.prototype, /** @lends OpenSeadragon.IIIFTileSource.prototype */{
    /**
     * Determine if the data and/or url imply the image service is supported by
     * this tile source.
     * @function
     * @param {Object|Array} data
     * @param {String} optional - url
     */
     
    supports: function( data, url ) {
        // Version 2.0 and forwards
        if (data.protocol && data.protocol == 'http://iiif.io/api/image') {
            return true;
        // Version 1.1
        } else if ( data['@context'] && (
            data['@context'] == "http://library.stanford.edu/iiif/image-api/1.1/context.json" ||
            data['@context'] == "http://iiif.io/api/image/1/context.json") ) {
            // N.B. the iiif.io context is wrong, but where the representation lives so likely to be used
            return true;

        // Version 1.0
        } else if ( data.profile &&
            data.profile.indexOf("http://library.stanford.edu/iiif/image-api/compliance.html") === 0) {
            return true;
        } else if ( data.identifier && data.width && data.height ) {
            return true;
        } else if ( data.documentElement &&
            "info" == data.documentElement.tagName &&
            "http://library.stanford.edu/iiif/image-api/ns/" ==
                data.documentElement.namespaceURI) {
            return true;

        // Not IIIF
        } else {
            return false;
        }
    },

    /**
     *
     * @function
     * @param {Object} data - the raw configuration
     * @example <caption>IIIF 1.1 Info Looks like this</caption>
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
    configure: function( data, url ){
        // Try to deduce our version and fake it upwards if needed
        if ( !$.isPlainObject(data) ) {
            var options = configureFromXml10( data );
            options['@context'] = "http://iiif.io/api/image/1.0/context.json";
            options['@id'] = url.replace('/info.xml', '');
            return options;
        } else if ( !data['@context'] ) {
            data['@context'] = 'http://iiif.io/api/image/1.0/context.json';
            data['@id'] = url.replace('/info.json', '');
            return data;
        } else {
            return data;
        }
    },

    /**
     * Return the tileWidth for the given level.
     * @function
     * @param {Number} level
     */
    getTileWidth: function( level ) {

        if(this.emulateLegacyImagePyramid) {
            return $.TileSource.prototype.getTileWidth.call(this, level);
        }

        var scaleFactor = Math.pow(2, this.maxLevel - level);

        if (this.tileSizePerScaleFactor && this.tileSizePerScaleFactor[scaleFactor]) {
            return this.tileSizePerScaleFactor[scaleFactor].width;
        }
        return this._tileWidth;
    },

    /**
     * Return the tileHeight for the given level.
     * @function
     * @param {Number} level
     */
    getTileHeight: function( level ) {

        if(this.emulateLegacyImagePyramid) {
            return $.TileSource.prototype.getTileHeight.call(this, level);
        }

        var scaleFactor = Math.pow(2, this.maxLevel - level);

        if (this.tileSizePerScaleFactor && this.tileSizePerScaleFactor[scaleFactor]) {
            return this.tileSizePerScaleFactor[scaleFactor].height;
        }
        return this._tileHeight;
    },

    /**
     * @function
     * @param {Number} level
     */
    getLevelScale: function ( level ) {

        if(this.emulateLegacyImagePyramid) {
            var levelScale = NaN;
            if (this.levels.length > 0 && level >= this.minLevel && level <= this.maxLevel) {
                levelScale =
                    this.levels[level].width /
                    this.levels[this.maxLevel].width;
            }
            return levelScale;
        }

        return $.TileSource.prototype.getLevelScale.call(this, level);
    },

    /**
     * @function
     * @param {Number} level
     */
    getNumTiles: function( level ) {

        if(this.emulateLegacyImagePyramid) {
            var scale = this.getLevelScale(level);
            if (scale) {
                return new $.Point(1, 1);
            } else {
                return new $.Point(0, 0);
            }
        }

        return $.TileSource.prototype.getNumTiles.call(this, level);
    },


    /**
     * @function
     * @param {Number} level
     * @param {OpenSeadragon.Point} point
     */
    getTileAtPoint: function( level, point ) {

        if(this.emulateLegacyImagePyramid) {
            return new $.Point(0, 0);
        }

        return $.TileSource.prototype.getTileAtPoint.call(this, level, point);
    },


    /**
     * Responsible for retrieving the url which will return an image for the
     * region specified by the given x, y, and level components.
     * @function
     * @param {Number} level - z index
     * @param {Number} x
     * @param {Number} y
     * @throws {Error}
     */
    getTileUrl: function( level, x, y ){

        if(this.emulateLegacyImagePyramid) {
            var url = null;
            if ( this.levels.length > 0 && level >= this.minLevel && level <= this.maxLevel ) {
                url = this.levels[ level ].url;
            }
            return url;
        }

        //# constants
        var IIIF_ROTATION = '0',
            //## get the scale (level as a decimal)
            scale = Math.pow( 0.5, this.maxLevel - level ),

            //# image dimensions at this level
            levelWidth = Math.ceil( this.width * scale ),
            levelHeight = Math.ceil( this.height * scale ),

            //## iiif region
            tileWidth,
            tileHeight,
            iiifTileSizeWidth,
            iiifTileSizeHeight,
            iiifRegion,
            iiifTileX,
            iiifTileY,
            iiifTileW,
            iiifTileH,
            iiifSize,
            iiifQuality,
            uri;

        tileWidth = this.getTileWidth(level);
        tileHeight = this.getTileHeight(level);
        iiifTileSizeWidth = Math.ceil( tileWidth / scale );
        iiifTileSizeHeight = Math.ceil( tileHeight / scale );

        if ( this['@context'].indexOf('/1.0/context.json') > -1 ||
             this['@context'].indexOf('/1.1/context.json') > -1 ||
             this['@context'].indexOf('/1/context.json') > -1 ) {
            iiifQuality = "native.jpg";
        } else {
            iiifQuality = "default.jpg";
        }

        if ( levelWidth < tileWidth && levelHeight < tileHeight ){
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
        uri = [ this['@id'], iiifRegion, iiifSize, IIIF_ROTATION, iiifQuality ].join( '/' );

        return uri;
    }

  });

    /**
     * Determine whether arbitrary tile requests can be made against a service with the given profile
     * @function
     * @param {object} profile - IIIF profile object
     * @throws {Error}
     */
    function canBeTiled (profile ) {
        var level0Profiles = [
            "http://library.stanford.edu/iiif/image-api/compliance.html#level0",
            "http://library.stanford.edu/iiif/image-api/1.1/compliance.html#level0",
            "http://iiif.io/api/image/2/level0.json"
        ];
        var isLevel0 = (level0Profiles.indexOf(profile[0]) != -1);
        return !isLevel0 || (profile.indexOf("sizeByW") != -1);
    }

    /**
     * Build the legacy pyramid URLs (one tile per level)
     * @function
     * @param {object} options - infoJson
     * @throws {Error}
     */
    function constructLevels(options) {
        var levels = [];
        for(var i=0; i<options.sizes.length; i++) {
            levels.push({
                url: options['@id'] + '/full/' + options.sizes[i].width + ',/0/default.jpg',
                width: options.sizes[i].width,
                height: options.sizes[i].height
            });
        }
        return levels.sort(function(a,b){return a.width - b.width;});
    }


    function configureFromXml10(xmlDoc) {
        //parse the xml
        if ( !xmlDoc || !xmlDoc.documentElement ) {
            throw new Error( $.getString( "Errors.Xml" ) );
        }

        var root            = xmlDoc.documentElement,
            rootName        = root.tagName,
            configuration   = null;

        if ( rootName == "info" ) {
            try {
                configuration = {};
                parseXML10( root, configuration );
                return configuration;

            } catch ( e ) {
                throw (e instanceof Error) ?
                    e :
                    new Error( $.getString("Errors.IIIF") );
            }
        }
        throw new Error( $.getString( "Errors.IIIF" ) );
    }

    function parseXML10( node, configuration, property ) {
        var i,
            value;
        if ( node.nodeType == 3 && property ) {//text node
            value = node.nodeValue.trim();
            if( value.match(/^\d*$/)){
                value = Number( value );
            }
            if( !configuration[ property ] ){
                configuration[ property ] = value;
            }else{
                if( !$.isArray( configuration[ property ] ) ){
                    configuration[ property ] = [ configuration[ property ] ];
                }
                configuration[ property ].push( value );
            }
        } else if( node.nodeType == 1 ){
            for( i = 0; i < node.childNodes.length; i++ ){
                parseXML10( node.childNodes[ i ], configuration, node.nodeName );
            }
        }
    }



}( OpenSeadragon ));
