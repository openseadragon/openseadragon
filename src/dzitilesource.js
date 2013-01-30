
(function( $ ){
    
/**
 * @class
 * @extends OpenSeadragon.TileSource
 * @param {Number|Object} width - the pixel width of the image or the idiomatic
 *      options object which is used instead of positional arguments.
 * @param {Number} height
 * @param {Number} tileSize
 * @param {Number} tileOverlap
 * @param {String} tilesUrl
 * @param {String} fileFormat
 * @param {OpenSeadragon.DisplayRect[]} displayRects
 * @property {String} tilesUrl
 * @property {String} fileFormat
 * @property {OpenSeadragon.DisplayRect[]} displayRects
 */ 
$.DziTileSource = function( width, height, tileSize, tileOverlap, tilesUrl, fileFormat, displayRects ) {
    var i,
        rect,
        level,
        options;
    
    if( $.isPlainObject( width ) ){
        options = width;
    }else{
        options = {
            width: arguments[ 0 ],
            height: arguments[ 1 ],
            tileSize: arguments[ 2 ],
            tileOverlap: arguments[ 3 ],
            tilesUrl: arguments[ 4 ],
            fileFormat: arguments[ 5 ],
            displayRects: arguments[ 6 ]
        };
    }

    this._levelRects  = {};
    this.tilesUrl     = options.tilesUrl;
    this.fileFormat   = options.fileFormat;
    this.displayRects = options.displayRects;
    
    if ( this.displayRects ) {
        for ( i = this.displayRects.length - 1; i >= 0; i-- ) {
            rect = this.displayRects[ i ];
            for ( level = rect.minLevel; level <= rect.maxLevel; level++ ) {
                if ( !this._levelRects[ level ] ) {
                    this._levelRects[ level ] = [];
                }
                this._levelRects[ level ].push( rect );
            }
        }
    }
    
    $.TileSource.apply( this, [ options ] );

};

$.extend( $.DziTileSource.prototype, $.TileSource.prototype, {


    /**
     * Determine if the data and/or url imply the image service is supported by
     * this tile source.
     * @function
     * @name OpenSeadragon.DziTileSource.prototype.supports
     * @param {Object|Array} data
     * @param {String} optional - url
     */
    supports: function( data, url ){
        var ns;
        if ( data.Image ) {
            ns = data.Image.xmlns;
        } else if ( data.documentElement && "Image" == data.documentElement.tagName ) {
            ns = data.documentElement.namespaceURI;
        }

        return ( "http://schemas.microsoft.com/deepzoom/2008" == ns ||
            "http://schemas.microsoft.com/deepzoom/2009" == ns );
    },

    /**
     * 
     * @function
     * @name OpenSeadragon.DziTileSource.prototype.configure
     * @param {Object|XMLDocument} data - the raw configuration
     * @param {String} url - the url the data was retreived from if any.
     * @return {Object} options - A dictionary of keyword arguments sufficient 
     *      to configure this tile sources constructor.
     */
    configure: function( data, url ){

        var dziPath,
            dziName,
            tilesUrl,
            options,
            host;

        if( !$.isPlainObject(data) ){

            options = configureFromXML( this, data );

        }else{

            options = configureFromObject( this, data );
        }

        if( url && !options.tilesUrl ){
            if( !( 'http' == url.substring( 0, 4 ) ) ){
                host = location.protocol + '//' + location.host;
            }
            dziPath = url.split('/');
            dziName = dziPath.pop();
            dziName = dziName.substring(0, dziName.lastIndexOf('.'));
            dziPath = '/' + dziPath.join('/') + '/' + dziName + '_files/';
            tilesUrl = dziPath;
            if( host ){
                tilesUrl = host + tilesUrl;
            }
            options.tilesUrl = tilesUrl;
        }

        return options;
    },


    /**
     * @function
     * @name OpenSeadragon.DziTileSource.prototype.getTileUrl
     * @param {Number} level
     * @param {Number} x
     * @param {Number} y
     */
    getTileUrl: function( level, x, y ) {
        return [ this.tilesUrl, level, '/', x, '_', y, '.', this.fileFormat ].join( '' );
    },


    /**
     * @function
     * @name OpenSeadragon.DziTileSource.prototype.tileExists
     * @param {Number} level
     * @param {Number} x
     * @param {Number} y
     */
    tileExists: function( level, x, y ) {
        var rects = this._levelRects[ level ],
            rect,
            scale,
            xMin,
            yMin,
            xMax,
            yMax,
            i;

        if ( !rects || !rects.length ) {
            return true;
        }

        for ( i = rects.length - 1; i >= 0; i-- ) {
            rect = rects[ i ];

            if ( level < rect.minLevel || level > rect.maxLevel ) {
                continue;
            }

            scale = this.getLevelScale( level );
            xMin = rect.x * scale;
            yMin = rect.y * scale;
            xMax = xMin + rect.width * scale;
            yMax = yMin + rect.height * scale;

            xMin = Math.floor( xMin / this.tileSize );
            yMin = Math.floor( yMin / this.tileSize );
            xMax = Math.ceil( xMax / this.tileSize );
            yMax = Math.ceil( yMax / this.tileSize );

            if ( xMin <= x && x < xMax && yMin <= y && y < yMax ) {
                return true;
            }
        }

        return false;
    }
});


/**
 * @private
 * @inner
 * @function
 */
function configureFromXML( tileSource, xmlDoc ){
    
    if ( !xmlDoc || !xmlDoc.documentElement ) {
        throw new Error( $.getString( "Errors.Xml" ) );
    }

    var root           = xmlDoc.documentElement,
        rootName       = root.tagName,
        configuration  = null,
        displayRects   = [],
        dispRectNodes,
        dispRectNode,
        rectNode,
        sizeNode,
        i;

    if ( rootName == "Image" ) {
        
        try {
            sizeNode = root.getElementsByTagName( "Size" )[ 0 ];
            configuration = {
                Image: {
                    xmlns:       "http://schemas.microsoft.com/deepzoom/2008",
                    Format:      root.getAttribute( "Format" ),
                    DisplayRect: null,
                    Overlap:     parseInt( root.getAttribute( "Overlap" ) ), 
                    TileSize:    parseInt( root.getAttribute( "TileSize" ) ),
                    Size: {
                        Height: parseInt( sizeNode.getAttribute( "Height" ) ),
                        Width:  parseInt( sizeNode.getAttribute( "Width" ) )
                    }
                }
            };

            if ( !$.imageFormatSupported( configuration.Image.Format ) ) {
                throw new Error(
                    $.getString( "Errors.ImageFormat", configuration.Image.Format.toUpperCase() )
                );
            }
            
            dispRectNodes = root.getElementsByTagName( "DisplayRect" );
            for ( i = 0; i < dispRectNodes.length; i++ ) {
                dispRectNode = dispRectNodes[ i ];
                rectNode     = dispRectNode.getElementsByTagName( "Rect" )[ 0 ];

                displayRects.push({
                    Rect: {
                        X: parseInt( rectNode.getAttribute( "X" ) ),
                        Y: parseInt( rectNode.getAttribute( "Y" ) ),
                        Width: parseInt( rectNode.getAttribute( "Width" ) ),
                        Height: parseInt( rectNode.getAttribute( "Height" ) ),
                        MinLevel: 0,  // ignore MinLevel attribute, bug in Deep Zoom Composer
                        MaxLevel: parseInt( dispRectNode.getAttribute( "MaxLevel" ) )
                    }
                });
            }

            if( displayRects.length ){
                configuration.Image.DisplayRect = displayRects;
            }

            return configureFromObject( tileSource, configuration );

        } catch ( e ) {
            throw (e instanceof Error) ? 
                e : 
                new Error( $.getString("Errors.Dzi") );
        }
    } else if ( rootName == "Collection" ) {
        throw new Error( $.getString( "Errors.Dzc" ) );
    } else if ( rootName == "Error" ) {
        return processDZIError( root );
    }

    throw new Error( $.getString( "Errors.Dzi" ) );
};

/**
 * @private
 * @inner
 * @function
 */
function configureFromObject( tileSource, configuration ){
    var imageData     = configuration.Image,
        tilesUrl      = imageData.Url,
        fileFormat    = imageData.Format,
        sizeData      = imageData.Size,
        dispRectData  = imageData.DisplayRect || [],
        width         = parseInt( sizeData.Width ),
        height        = parseInt( sizeData.Height ),
        tileSize      = parseInt( imageData.TileSize ),
        tileOverlap   = parseInt( imageData.Overlap ),
        displayRects  = [],
        rectData,
        i;

    //TODO: need to figure out out to better handle image format compatibility
    //      which actually includes additional file formats like xml and pdf
    //      and plain text for various tilesource implementations to avoid low 
    //      level errors.
    //
    //      For now, just don't perform the check.
    //
    /*if ( !imageFormatSupported( fileFormat ) ) {
        throw new Error(
            $.getString( "Errors.ImageFormat", fileFormat.toUpperCase() )
        );
    }*/

    for ( i = 0; i < dispRectData.length; i++ ) {
        rectData = dispRectData[ i ].Rect;

        displayRects.push( new $.DisplayRect(
            parseInt( rectData.X ),
            parseInt( rectData.Y ),
            parseInt( rectData.Width ),
            parseInt( rectData.Height ),
            0,  // ignore MinLevel attribute, bug in Deep Zoom Composer
            parseInt( rectData.MaxLevel )
        ));
    }


    return {
        width: width, /* width *required */
        height: height, /* height *required */
        tileSize: tileSize, /* tileSize *required */
        tileOverlap: tileOverlap, /* tileOverlap *required */
        minLevel: null, /* minLevel */
        maxLevel: null, /* maxLevel */
        tilesUrl: tilesUrl, /* tilesUrl */
        fileFormat: fileFormat, /* fileFormat */
        displayRects: displayRects /* displayRects */
    };

};

}( OpenSeadragon ));
