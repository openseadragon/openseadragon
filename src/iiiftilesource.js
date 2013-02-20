(function( $ ){
    
/**
 * A client implementation of the International Image Interoperability 
 * Format: Image API Draft 0.2 - Please read more about the specification
 * at 
 *
 * The getTileUrl implementation is based on the gist from:
 * https://gist.github.com/jpstroop/4624253
 *
 * @class
 * @extends OpenSeadragon.TileSource
 * @see http://library.stanford.edu/iiif/image-api/
 */
$.IIIFTileSource = function( options ){

    $.extend( true, this, options );

    if( !(this.height && this.width && this.identifier && this.tilesUrl ) ){
        throw new Error('IIIF required parameters not provided.');
    }

    //TODO: at this point the base tile source implementation assumes
    //      a tile is a square and so only has one property tileSize
    //      to store it.  It may be possible to make tileSize a vector
    //      OpenSeadraon.Point but would require careful implementation
    //      to preserve backward compatibility.
    options.tileSize = this.tile_width;

    options.maxLevel = options.maxLevel ? options.maxLevel : Number( 
        Math.ceil( Math.log( Math.max( this.width, this.height ), 2 ) )
    );
    
    $.TileSource.apply( this, [ options ] );
};

$.extend( $.IIIFTileSource.prototype, $.TileSource.prototype, {
    /**
     * Determine if the data and/or url imply the image service is supported by
     * this tile source.
     * @function
     * @name OpenSeadragon.IIIFTileSource.prototype.supports
     * @param {Object|Array} data
     * @param {String} optional - url
     */
    supports: function( data, url ){
        return ( 
            data.ns && 
            "http://library.stanford.edu/iiif/image-api/ns/" == data.ns
        ) || (
            data.profile && (
                "http://library.stanford.edu/iiif/image-api/compliance.html#level1" == data.profile ||
                "http://library.stanford.edu/iiif/image-api/compliance.html#level2" == data.profile ||
                "http://library.stanford.edu/iiif/image-api/compliance.html#level3" == data.profile ||
                "http://library.stanford.edu/iiif/image-api/compliance.html" == data.profile 
            )
        ) || (
            data.documentElement &&
            "info" == data.documentElement.tagName &&
            "http://library.stanford.edu/iiif/image-api/ns/" ==
                data.documentElement.namespaceURI
        );
    },

    /**
     * 
     * @function
     * @name OpenSeadragon.IIIFTileSource.prototype.configure
     * @param {Object|XMLDocument} data - the raw configuration
     * @param {String} url - the url the data was retreived from if any.
     * @return {Object} options - A dictionary of keyword arguments sufficient 
     *      to configure this tile source via it's constructor.
     */
    configure: function( data, url ){
        var service,
            identifier,
            options,
            host;

        if( !$.isPlainObject(data) ){

            options = configureFromXml( this, data );

        }else{

            options = configureFromObject( this, data );
        }

        if( url && !options.tilesUrl ){
            service = url.split('/');
            service.pop(); //info.json or info.xml
            service = service.join('/');
            if( 'http' !== url.substring( 0, 4 ) ){
                host = location.protocol + '//' + location.host;
                service = host + service;
            }
            options.tilesUrl = service.replace(
                data.identifier,
                ''
            );
        }

        return options;
    },

    /**
     * Responsible for retreiving the url which will return an image for the 
     * region speified by the given x, y, and level components.
     * @function
     * @name OpenSeadragon.IIIFTileSource.prototype.getTileUrl
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
         
            //## get iiif size
            iiif_size = 'pct:' + ( scale * 100 ),

            //# image dimensions at this level
            level_width = Math.ceil( this.width * scale ),
            level_height = Math.ceil( this.height * scale ),
         
            //## iiif region
            iiif_tile_size_width = Math.ceil( this.tileSize / scale ),
            iiif_tile_size_height = Math.ceil( this.tileSize / scale ),
            iiif_region,
            iiif_tile_x,
            iiif_tile_y,
            iiif_tile_w,
            iiif_tile_h;
         
         
        if ( level_width < this.tile_width || level_height < this.tile_height ){
            iiif_region = 'full';
        } else {
            iiif_tile_x = x * iiif_tile_size_width;
            iiif_tile_y = y * iiif_tile_size_height;
            iiif_tile_w = Math.min( iiif_tile_size_width, this.width - iiif_tile_x );
            iiif_tile_h = Math.min( iiif_tile_size_height, this.height - iiif_tile_y );
            iiif_region = [ iiif_tile_x, iiif_tile_y, iiif_tile_w, iiif_tile_h ].join(',');
        }
         
        return [ 
            this.tilesUrl, 
            this.identifier, 
            iiif_region, 
            iiif_size, 
            IIIF_ROTATION, 
            IIIF_QUALITY 
        ].join('/');
    }


});

/**
 * @private
 * @inner
 * @function
 * 
    <?xml version="1.0" encoding="UTF-8"?>
    <info xmlns="http://library.stanford.edu/iiif/image-api/ns/">
      <identifier>1E34750D-38DB-4825-A38A-B60A345E591C</identifier>
      <width>6000</width>
      <height>4000</height>
      <scale_factors>
        <scale_factor>1</scale_factor>
        <scale_factor>2</scale_factor>
        <scale_factor>4</scale_factor>
      </scale_factors>
      <tile_width>1024</tile_width>
      <tile_height>1024</tile_height>
      <formats>
        <format>jpg</format>
        <format>png</format>
      </formats>
      <qualities>
        <quality>native</quality>
        <quality>grey</quality>
      </qualities>
    </info>
 */
function configureFromXml( tileSource, xmlDoc ){

    //parse the xml
    if ( !xmlDoc || !xmlDoc.documentElement ) {
        throw new Error( $.getString( "Errors.Xml" ) );
    }

    var root            = xmlDoc.documentElement,
        rootName        = root.tagName,
        configuration   = null,
        scale_factors,
        formats,
        qualities,
        i;

    if ( rootName == "info" ) {
        
        try {

            configuration = {
                "ns": root.namespaceURI
            };

            parseXML( root, configuration );

            return configureFromObject( tileSource, configuration );

        } catch ( e ) {
            throw (e instanceof Error) ? 
                e : 
                new Error( $.getString("Errors.IIIF") );
        }
    }

    throw new Error( $.getString( "Errors.IIIF" ) );

}


/**
 * @private
 * @inner
 * @function
 */
function parseXML( node, configuration, property ){
    var i,
        value;
    if( node.nodeType == 3 && property ){//text node
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
            parseXML( node.childNodes[ i ], configuration, node.nodeName );
        }
    }
}


/**
 * @private
 * @inner
 * @function
 * 
    { 
        "profile" : "http://library.stanford.edu/iiif/image-api/compliance.html#level1",
        "identifier" : "1E34750D-38DB-4825-A38A-B60A345E591C",
        "width" : 6000,
        "height" : 4000,
        "scale_factors" : [ 1, 2, 4 ],
        "tile_width" : 1024,
        "tile_height" : 1024,
        "formats" : [ "jpg", "png" ],
        "quality" : [ "native", "grey" ]
    } 
 */
function configureFromObject( tileSource, configuration ){
    //the image_host property is not part of the iiif standard but is included here to
    //allow the info.json and info.xml specify a different server to load the
    //images from so we can test the implementation.
    if( configuration.image_host ){
        configuration.tilesUrl = configuration.image_host;
    }
    return configuration;
}

}( OpenSeadragon ));