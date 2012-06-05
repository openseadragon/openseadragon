
(function( $ ){


/**
 * The LegacyTileSource allows simple, traditional image pyramids to be loaded
 * into an OpenSeadragon Viewer.  Basically, this translates to the historically
 * common practice of starting with a 'master' image, maybe a tiff for example,
 * and generating a set of 'service' images like one or more thumbnails, a medium 
 * resolution image and a high resolution image in standard web formats like
 * png or jpg.
 * @class
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
    width = options.levels[ options.levels.length - 1 ].width;
    height = options.levels[ options.levels.length - 1 ].height;

    $.extend( true,  options, {
        width:       width,
        height:      height,
        tileSize:    Math.max( height, width ),
        tileOverlap: 0,
        minLevel:    0,
        maxLevel:    options.levels.length - 1
    });

    $.TileSource.apply( this, [ options ] );

    this.levels = options.levels;
};

$.LegacyTileSource.prototype = {
    /**
     * Determine if the data and/or url imply the image service is supported by
     * this tile source.
     * @function
     * @name OpenSeadragon.DziTileSource.prototype.supports
     * @param {Object|Array} data
     * @param {String} optional - url
     */
    supports: function( data, url ){
        return ( 
            data.type && 
            "legacy-image-pyramid" == data.type
        ) || (
            data.documentElement &&
            "legacy-image-pyramid" == data.documentElement.getAttribute('type')
        );
    },


    /**
     * 
     * @function
     * @name OpenSeadragon.DziTileSource.prototype.configure
     * @param {Object|XMLDocument} configuration - the raw configuration
     * @param {String} dataUrl - the url the data was retreived from if any.
     * @return {Array} args - positional arguments required and/or optional
     *      for this tile sources constructor
     */
    configure: function( configuration, dataUrl ){

        var options;

        if( configuration instanceof XMLDocument ){

            options = configureFromXML( this, configuration );

        }else if( 'object' == $.type( configuration) ){

            options = configureFromObject( this, configuration );
        }

        return options;

    },
    
    /**
     * @function
     * @param {Number} level
     */
    getLevelScale: function( level ) {
        var levelScale = NaN;
        if (  level >= this.minLevel && level <= this.maxLevel ){
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
     * @function
     * @param {Number} level
     */
    getPixelRatio: function( level ) {
        var imageSizeScaled = this.dimensions.times( this.getLevelScale( level ) ),
            rx = 1.0 / imageSizeScaled.x,
            ry = 1.0 / imageSizeScaled.y;

        return new $.Point(rx, ry);
    },

    /**
     * @function
     * @param {Number} level
     * @param {OpenSeadragon.Point} point
     */
    getTileAtPoint: function( level, point ) {
        return new $.Point( 0, 0 );
    },

    /**
     * @function
     * @param {Number} level
     * @param {Number} x
     * @param {Number} y
     */
    getTileBounds: function( level, x, y ) {
        var dimensionsScaled = this.dimensions.times( this.getLevelScale( level ) ),
            px = ( x === 0 ) ? 0 : this.levels[ level ].width,
            py = ( y === 0 ) ? 0 : this.levels[ level ].height,
            sx = this.levels[ level ].width,
            sy = this.levels[ level ].height,
            scale = 1.0 / ( this.width >= this.height  ? 
                dimensionsScaled.y :
                dimensionsScaled.x 
            );

        sx = Math.min( sx, dimensionsScaled.x - px );
        sy = Math.min( sy, dimensionsScaled.y - py );

        return new $.Rect( px * scale, py * scale, sx * scale, sy * scale );
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
    getTileUrl: function( level, x, y ) {
        var url = null;
        if( level >= this.minLevel && level <= this.maxLevel ){   
            url = this.levels[ level ].url;
        }
        return url;
    },

    /**
     * @function
     * @param {Number} level
     * @param {Number} x
     * @param {Number} y
     */
    tileExists: function( level, x, y ) {
        var numTiles = this.getNumTiles( level );
        return  level >= this.minLevel && 
                level <= this.maxLevel &&
                x >= 0 && 
                y >= 0 && 
                x < numTiles.x && 
                y < numTiles.y;
    }
};

/**
 * This method removes any files from the Array which dont conform to our
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
            file.url && (
                file.url.toLowerCase().match(/^.*\.(png|jpg|jpeg|gif)$/) || (
                    file.mimetype && 
                    file.mimetype.toLowerCase().match(/^.*\/(png|jpg|jpeg|gif)$/) 
                )
            ) ){
            //This is sufficient to serve as a level
            filtered.push({
                url: file.url,
                width: Number( file.width ),
                height: Number( file.height )
            });
        }
    }

    return filtered.sort(function(a,b){
        return a.height - b.height;
    });

};

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

    if ( rootName == "image" ) {
        
        try {
            conf = {
                type:        root.getAttribute( "type" ),
                levels:      []
            };
            
            levels = root.getElementsByTagName( "level" );
            for ( i = 0; i < levels.length; i++ ) {
                level = levels[ i ];

                conf.levels .push({
                    url:    level.getAttribute( "url" ),
                    width:  parseInt( level.getAttribute( "width" ) ),
                    height: parseInt( level.getAttribute( "height" ) )
                });
            }

            return configureFromObject( tileSource, conf );

        } catch ( e ) {
            throw (e instanceof Error) ? 
                e : 
                new Error( 'Unknown error parsing Legacy Image Pyramid XML.' );
        }
    } else if ( rootName == "collection" ) {
        throw new Error( 'Legacy Image Pyramid Collections not yet supported.' );
    } else if ( rootName == "error" ) {
        throw new Error( 'Error: ' + xmlDoc );
    }

    throw new Error( 'Unknown element ' + rootName );
};

/**
 * @private
 * @inner
 * @function
 */
function configureFromObject( tileSource, configuration ){
    
    return configuration.levels;

};

}( OpenSeadragon ));
