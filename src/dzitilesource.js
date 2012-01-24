
(function( $ ){
    

$.DziTileSource = function( width, height, tileSize, tileOverlap, tilesUrl, fileFormat, displayRects ) {
    var i,
        rect,
        level;

    $.TileSource.call( this, width, height, tileSize, tileOverlap, null, null );

    this._levelRects  = {};
    this.tilesUrl     = tilesUrl;
    this.fileFormat   = fileFormat;
    this.displayRects = displayRects;
    
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

};

$.extend( $.DziTileSource.prototype, $.TileSource.prototype, {

    getTileUrl: function( level, x, y ) {
        return [ this.tilesUrl, level, '/', x, '_', y, '.', this.fileFormat ].join( '' );
    },

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

$.DziTileSourceHelper = {

    createFromXml: function( xmlUrl, xmlString, callback ) {
        var async = typeof (callback) == "function",
            error = null,
            urlParts,
            filename,
            lastDot,
            tilesUrl,
            handler;

        if ( !xmlUrl ) {
            this.error = $.getString( "Errors.Empty" );
            if ( async ) {
                window.setTimeout( function() {
                    callback( null, error );
                }, 1 );
                return null;
            }
            throw new Error( error );
        }

        urlParts = xmlUrl.split( '/' );
        filename = urlParts[ urlParts.length - 1 ];
        lastDot  = filename.lastIndexOf( '.' );

        if ( lastDot > -1 ) {
            urlParts[ urlParts.length - 1 ] = filename.slice( 0, lastDot );
        }

        tilesUrl = urlParts.join( '/' ) + "_files/";

        function finish( func, obj ) {
            try {
                return func( obj, tilesUrl );
            } catch ( e ) {
                if ( async ) {
                    return null;
                } else {
                    throw e;
                }
            }
        }

        if ( async ) {
            if ( xmlString ) {
                handler = $.delegate( this, this.processXml );
                window.setTimeout( function() {
                    var source = finish( handler, $.parseXml( xmlString ) );
                    // call after finish sets error
                    callback( source, error );    
                }, 1);
            } else {
                handler = $.delegate( this, this.processResponse );
                $.makeAjaxRequest( xmlUrl, function( xhr ) {
                    var source = finish( handler, xhr );
                    // call after finish sets error
                    callback( source, error );
                });
            }

            return null;
        }

        if ( xmlString ) {
            return finish( 
                $.delegate( this, this.processXml ), 
                $.parseXml( xmlString ) 
            );
        } else {
            return finish( 
                $.delegate( this, this.processResponse ), 
                $.makeAjaxRequest( xmlUrl )
            );
        }
    },
    processResponse: function( xhr, tilesUrl ) {
        var status,
            statusText,
            doc = null;

        if ( !xhr ) {
            throw new Error( $.getString( "Errors.Security" ) );
        } else if ( xhr.status !== 200 && xhr.status !== 0 ) {
            status     = xhr.status;
            statusText = ( status == 404 ) ? 
                "Not Found" : 
                xhr.statusText;
            throw new Error( $.getString( "Errors.Status", status, statusText ) );
        }

        if ( xhr.responseXML && xhr.responseXML.documentElement ) {
            doc = xhr.responseXML;
        } else if ( xhr.responseText ) {
            doc = $.parseXml( xhr.responseText );
        }

        return this.processXml( doc, tilesUrl );
    },

    processXml: function( xmlDoc, tilesUrl ) {

        if ( !xmlDoc || !xmlDoc.documentElement ) {
            throw new Error( $.getString( "Errors.Xml" ) );
        }

        var root     = xmlDoc.documentElement,
            rootName = root.tagName;

        if ( rootName == "Image" ) {
            try {
                return this.processDzi( root, tilesUrl );
            } catch ( e ) {
                throw (e instanceof Error) ? 
                    e : 
                    new Error( $.getString("Errors.Dzi") );
            }
        } else if ( rootName == "Collection" ) {
            throw new Error( $.getString( "Errors.Dzc" ) );
        } else if ( rootName == "Error" ) {
            return this.processError( root );
        }

        throw new Error( $.getString( "Errors.Dzi" ) );
    },

    processDzi: function( imageNode, tilesUrl ) {
        var fileFormat    = imageNode.getAttribute( "Format" ),
            sizeNode      = imageNode.getElementsByTagName( "Size" )[ 0 ],
            dispRectNodes = imageNode.getElementsByTagName( "DisplayRect" ),
            width         = parseInt( sizeNode.getAttribute( "Width" ) ),
            height        = parseInt( sizeNode.getAttribute( "Height" ) ),
            tileSize      = parseInt( imageNode.getAttribute( "TileSize" ) ),
            tileOverlap   = parseInt( imageNode.getAttribute( "Overlap" ) ),
            dispRects     = [],
            dispRectNode,
            rectNode,
            i;

        if ( !$.imageFormatSupported( fileFormat ) ) {
            throw new Error(
                $.getString( "Errors.ImageFormat", fileFormat.toUpperCase() )
            );
        }

        for ( i = 0; i < dispRectNodes.length; i++ ) {
            dispRectNode = dispRectNodes[ i ];
            rectNode     = dispRectNode.getElementsByTagName( "Rect" )[ 0 ];

            dispRects.push( new $.DisplayRect(
                parseInt( rectNode.getAttribute( "X" ) ),
                parseInt( rectNode.getAttribute( "Y" ) ),
                parseInt( rectNode.getAttribute( "Width" ) ),
                parseInt( rectNode.getAttribute( "Height" ) ),
                0,  // ignore MinLevel attribute, bug in Deep Zoom Composer
                parseInt( dispRectNode.getAttribute( "MaxLevel" ) )
            ));
        }
        return new $.DziTileSource(
            width, 
            height, 
            tileSize, 
            tileOverlap,
            tilesUrl, 
            fileFormat, 
            dispRects
        );
    },

    processError: function( errorNode ) {
        var messageNode = errorNode.getElementsByTagName( "Message" )[ 0 ],
            message     = messageNode.firstChild.nodeValue;

        throw new Error(message);
    }
};


}( OpenSeadragon ));
