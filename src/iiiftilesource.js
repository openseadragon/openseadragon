/*
 * OpenSeadragon - IIIFTileSource
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
 * @class IIIFTileSource
 * @classdesc A client implementation of the International Image Interoperability Framework
 * Format: Image API 1.0 - 3.0
 *
 * @memberof OpenSeadragon
 * @extends OpenSeadragon.TileSource
 * @see http://iiif.io/api/image/
 * @param {String} [options.tileFormat='jpg']
 *      The extension that will be used when requiring tiles.
 */
$.IIIFTileSource = function( options ){

    /* eslint-disable camelcase */

    $.extend( true, this, options );

    /* Normalizes v3-style 'id' keys to an "_id" internal property */
    this._id = this["@id"] || this["id"] || this['identifier'] || null;

    if ( !( this.height && this.width && this._id) ) {
        throw new Error( 'IIIF required parameters (width, height, or id) not provided.' );
    }

    options.tileSizePerScaleFactor = {};

    this.tileFormat = this.tileFormat || 'jpg';

    this.version = options.version;

    this.isLevel0 = checkLevel0( options );

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
        if ( this.tiles.length === 1 ) {
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
    } else if ( canBeTiled(options) ) {
        // use the largest of tileOptions that is smaller than the short dimension
        var shortDim = Math.min( this.height, this.width ),
            tileOptions = [256, 512, 1024],
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
            options.maxLevel = Number(Math.round(Math.log(Math.max(this.width, this.height), 2)));
        } else {
            var maxScaleFactor = Math.max.apply(null, this.scale_factors);
            options.maxLevel = Math.round(Math.log(maxScaleFactor) * Math.LOG2E);
        }
    }

    // Create an array with precise resolution sizes if these have been supplied through the 'sizes' object
    if( this.sizes ) {
        var sizeLength = this.sizes.length;

        // Create a copy of the sizes list and sort in ascending order
        var sortedSizes = this.sizes.slice().sort(( size1, size2 ) => size1.width - size2.width);

        // List may or may not include the full resolution size (should be last after sorting): add it if necessary
        if( sortedSizes[sizeLength - 1].width < this.width && sortedSizes[sizeLength - 1].height < this.height ) {
            sortedSizes.push( {width: this.width, height: this.height} );
            sizeLength++;
        }

        // Only try to use 'sizes' if the number of dimensions within exactly matches the number of resolution levels (maxLevel+1)
        if ( sizeLength === options.maxLevel + 1 ) {

            // If we have a list of scaleFactors, make sure each of our sizes really corresponds to the listed scales
            var isResolutionList = 1;
            if ( this.scale_factors && this.scale_factors.length === sizeLength ) {
                for ( var i = 0; i < sizeLength; i++ ) {
                    var factor = this.scale_factors[sizeLength - i - 1]; // Scale factor order is inverted
                    if ( Math.round( this.width / sortedSizes[i].width ) !== factor ||
                         Math.round( this.height / sortedSizes[i].height ) !== factor ) {
                        isResolutionList = 0;
                        break;
                    }
                }
            }
            // The 'sizes' array does indeed contain a list of resolution levels, so assign our sorted array
            if ( isResolutionList === 1 ) {
                this.levelSizes = sortedSizes;
            }
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
     * @param {String} [url] - url
     */

    supports: function( data, url ) {
        // Version 2.0 and forwards
        if (data.protocol && data.protocol === 'http://iiif.io/api/image') {
            return true;
        // Version 1.1
        } else if ( data['@context'] && (
            data['@context'] === "http://library.stanford.edu/iiif/image-api/1.1/context.json" ||
            data['@context'] === "http://iiif.io/api/image/1/context.json") ) {
            // N.B. the iiif.io context is wrong, but where the representation lives so likely to be used
            return true;

        // Version 1.0
        } else if ( data.profile &&
            data.profile.indexOf("http://library.stanford.edu/iiif/image-api/compliance.html") === 0) {
            return true;
        } else if ( data.identifier && data.width && data.height ) {
            return true;
        } else if ( data.documentElement &&
            "info" === data.documentElement.tagName &&
            "http://library.stanford.edu/iiif/image-api/ns/" ===
                data.documentElement.namespaceURI) {
            return true;

        // Not IIIF
        } else {
            return false;
        }
    },

    /**
     * A static function used to prepare an incoming IIIF Image API info.json
     * response for processing by the tile handler. Normalizes data for all
     * versions of IIIF (1.0, 1.1, 2.x, 3.x) and returns a data object that
     * may be passed to the IIIFTileSource.
     *
     * @function
     * @static
     * @param {Object} data - the raw configuration
     * @param {String} url - the url configuration was retrieved from
     * @param {String} postData - HTTP POST data in k=v&k2=v2... form or null
     * @returns {Object} A normalized IIIF data object
     * @example <caption>IIIF 2.x Info Looks like this</caption>
     * {
     * "@context": "http://iiif.io/api/image/2/context.json",
     * "@id": "http://iiif.example.com/prefix/1E34750D-38DB-4825-A38A-B60A345E591C",
     * "protocol": "http://iiif.io/api/image",
     * "height": 1024,
     * "width": 775,
     * "tiles" : [{"width":256, "scaleFactors":[1,2,4,8]}],
     *  "profile": ["http://iiif.io/api/image/2/level1.json", {
     *    "qualities": [ "native", "bitonal", "grey", "color" ],
     *    "formats": [ "jpg", "png", "gif" ]
     *   }]
     * }
     */
    configure: function( data, url, postData ){
        // Try to deduce our version and fake it upwards if needed
        if ( !$.isPlainObject(data) ) {
            var options = configureFromXml10( data );
            options['@context'] = "http://iiif.io/api/image/1.0/context.json";
            options["@id"] = url.replace('/info.xml', '');
            options.version = 1;
            return options;
        } else {
            if ( !data['@context'] ) {
                data['@context'] = 'http://iiif.io/api/image/1.0/context.json';
                data["@id"] = url.replace('/info.json', '');
                data.version = 1;
            } else {
                var context = data['@context'];
                if (Array.isArray(context)) {
                    for (var i = 0; i < context.length; i++) {
                        if (typeof context[i] === 'string' &&
                            ( /^http:\/\/iiif\.io\/api\/image\/[1-3]\/context\.json$/.test(context[i]) ||
                            context[i] === 'http://library.stanford.edu/iiif/image-api/1.1/context.json' ) ) {
                            context = context[i];
                            break;
                        }
                    }
                }
                switch (context) {
                    case 'http://iiif.io/api/image/1/context.json':
                    case 'http://library.stanford.edu/iiif/image-api/1.1/context.json':
                        data.version = 1;
                        break;
                    case 'http://iiif.io/api/image/2/context.json':
                        data.version = 2;
                        break;
                    case 'http://iiif.io/api/image/3/context.json':
                        data.version = 3;
                        break;
                    default:
                        $.console.error('Data has a @context property which contains no known IIIF context URI.');
                }
            }

            if (data.preferredFormats) {
                for (var f = 0; f < data.preferredFormats.length; f++ ) {
                    if ( $.imageFormatSupported(data.preferredFormats[f]) ) {
                        data.tileFormat = data.preferredFormats[f];
                        break;
                    }
                }
            }
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

        // Use supplied list of scaled resolution sizes if these exist
        if( this.levelSizes ) {
            var levelSize = this.levelSizes[level];
            var x = Math.ceil( levelSize.width / this.getTileWidth(level) ),
                y = Math.ceil( levelSize.height / this.getTileHeight(level) );
            return new $.Point( x, y );
        }
        // Otherwise call default TileSource->getNumTiles() function
        else {
            return $.TileSource.prototype.getNumTiles.call(this, level);
        }
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

        // Use supplied list of scaled resolution sizes if these exist
        if( this.levelSizes ) {

            var validPoint = point.x >= 0 && point.x <= 1 &&
                             point.y >= 0 && point.y <= 1 / this.aspectRatio;
            $.console.assert(validPoint, "[TileSource.getTileAtPoint] must be called with a valid point.");

            var widthScaled = this.levelSizes[level].width;
            var pixelX = point.x * widthScaled;
            var pixelY = point.y * widthScaled;

            var x = Math.floor(pixelX / this.getTileWidth(level));
            var y = Math.floor(pixelY / this.getTileHeight(level));

            // When point.x == 1 or point.y == 1 / this.aspectRatio we want to
            // return the last tile of the row/column
            if (point.x >= 1) {
                x = this.getNumTiles(level).x - 1;
            }
            var EPSILON = 1e-15;
            if (point.y >= 1 / this.aspectRatio - EPSILON) {
                y = this.getNumTiles(level).y - 1;
            }

            return new $.Point(x, y);
        }

        // Otherwise call default TileSource->getTileAtPoint() function
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
            levelWidth,
            levelHeight,

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
            iiifSizeW,
            iiifSizeH,
            iiifQuality,
            uri;

        // Use supplied list of scaled resolution sizes if these exist
        if( this.levelSizes ) {
            levelWidth = this.levelSizes[level].width;
            levelHeight = this.levelSizes[level].height;
        }
        // Otherwise calculate the sizes ourselves
        else {
            levelWidth = Math.ceil( this.width * scale );
            levelHeight = Math.ceil( this.height * scale );
        }

        tileWidth = this.getTileWidth(level);
        tileHeight = this.getTileHeight(level);
        iiifTileSizeWidth = Math.round( tileWidth / scale );
        iiifTileSizeHeight = Math.round( tileHeight / scale );
        if (this.version === 1) {
            iiifQuality = "native." + this.tileFormat;
        } else {
            iiifQuality = "default." + this.tileFormat;
        }
        if ( levelWidth < tileWidth && levelHeight < tileHeight ){
            if ( this.version === 2 && levelWidth === this.width ) {
                iiifSize = "full";
            } else if ( this.version === 3 && levelWidth === this.width && levelHeight === this.height ) {
                iiifSize = "max";
            } else if ( this.version === 3 ) {
                iiifSize = levelWidth + "," + levelHeight;
            } else {
                iiifSize = levelWidth + ",";
            }
            iiifRegion = 'full';
        } else {
            iiifTileX = x * iiifTileSizeWidth;
            iiifTileY = y * iiifTileSizeHeight;
            iiifTileW = Math.min( iiifTileSizeWidth, this.width - iiifTileX );
            iiifTileH = Math.min( iiifTileSizeHeight, this.height - iiifTileY );
            if ( x === 0 && y === 0 && iiifTileW === this.width && iiifTileH === this.height ) {
                iiifRegion = "full";
            } else {
                iiifRegion = [ iiifTileX, iiifTileY, iiifTileW, iiifTileH ].join( ',' );
            }
            iiifSizeW = Math.min( tileWidth, levelWidth - (x * tileWidth) );
            iiifSizeH = Math.min( tileHeight, levelHeight - (y * tileHeight) );
            if ( this.version === 2 && iiifSizeW === this.width ) {
                iiifSize = "full";
            } else if ( this.version === 3 && iiifSizeW === this.width && iiifSizeH === this.height ) {
                iiifSize = "max";
            } else if (this.isLevel0 && this.version < 3) {
                iiifSize = iiifSizeW + ",";
            } else {
                iiifSize = iiifSizeW + "," + iiifSizeH;
            }
        }
        uri = [ this._id, iiifRegion, iiifSize, IIIF_ROTATION, iiifQuality ].join( '/' );

        return uri;
    },

    /**
     * Equality comparator
     */
    equals: function(otherSource) {
        return this._id === otherSource._id;
    },

    __testonly__: {
        canBeTiled: canBeTiled,
        constructLevels: constructLevels
    }

  });

    /**
     * Determine whether we have a level 0 compliance profile
     * @function
     * @param {Object} options
     * @param {Array|String} options.profile
     * @returns {Boolean}
     */
    function checkLevel0 ( options ) {
        var level0Profiles = [
            "http://library.stanford.edu/iiif/image-api/compliance.html#level0",
            "http://library.stanford.edu/iiif/image-api/1.1/compliance.html#level0",
            "http://iiif.io/api/image/2/level0.json",
            "level0",
            "https://iiif.io/api/image/3/level0.json"
        ];
        var profileLevel = Array.isArray(options.profile) ? options.profile[0] : options.profile;
        var isLevel0 = (level0Profiles.indexOf(profileLevel) !== -1);
        return isLevel0;
    }


    /**
     * Determine whether arbitrary tile requests can be made against a service with the given profile
     * @function
     * @param {Object} options
     * @param {Array|String} options.profile
     * @param {Number} options.version
     * @param {String[]} options.extraFeatures
     * @returns {Boolean}
     */
    function canBeTiled ( options ) {
        var isLevel0 = checkLevel0( options );
        var hasCanonicalSizeFeature = false;
        if ( options.version === 2 && options.profile.length > 1 && options.profile[1].supports ) {
            hasCanonicalSizeFeature = options.profile[1].supports.indexOf( "sizeByW" ) !== -1;
        }
        if ( options.version === 3 && options.extraFeatures ) {
            hasCanonicalSizeFeature = options.extraFeatures.indexOf( "sizeByWh" ) !== -1;
        }
        return !isLevel0 || hasCanonicalSizeFeature;
    }


    /**
     * Build the legacy pyramid URLs (one tile per level)
     * @function
     * @param {object} options - infoJson
     * @throws {Error}
     */
    function constructLevels(options) {
        var levels = [];
        for(var i = 0; i < options.sizes.length; i++) {
            levels.push({
                url: options._id + '/full/' + options.sizes[i].width + ',' +
                    (options.version === 3 ? options.sizes[i].height : '') +
                    '/0/default.' + options.tileFormat,
                width: options.sizes[i].width,
                height: options.sizes[i].height
            });
        }
        return levels.sort(function(a, b) {
            return a.width - b.width;
        });
    }


    function configureFromXml10(xmlDoc) {
        //parse the xml
        if ( !xmlDoc || !xmlDoc.documentElement ) {
            throw new Error( $.getString( "Errors.Xml" ) );
        }

        var root            = xmlDoc.documentElement,
            rootName        = root.tagName,
            configuration   = null;

        if ( rootName === "info" ) {
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
        if ( node.nodeType === 3 && property ) {//text node
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
        } else if( node.nodeType === 1 ){
            for( i = 0; i < node.childNodes.length; i++ ){
                parseXML10( node.childNodes[ i ], configuration, node.nodeName );
            }
        }
    }



}( OpenSeadragon ));
