
(function( $ ){


/**
 * The LegacyTileSource allows simple, traditional image pyramids to be loaded
 * into an OpenSeadragon Viewer.  Basically, this translates to the historically
 * common practice of starting with a 'master' image, maybe a tiff for example,
 * and generating a set of 'service' images like one or more thumbnails, a medium 
 * resolution image and a high resolution image in standard web formats like
 * png or jpg.
 * @class
 * @param {Array} files An array of file descriptions, each is an object with
 *      a 'url', a 'width', and a 'height'.  Overriding classes can expect more
 *      properties but these properties are sufficient for this implementation.
 *      Additionally, the files are required to be listed in order from
 *      smallest to largest.
 * @property {Number} aspectRatio
 * @property {Number} dimensions
 * @property {Number} tileSize
 * @property {Number} tileOverlap
 * @property {Number} minLevel
 * @property {Number} maxLevel
 * @property {Array} files
 */ 
$.LegacyTileSource = function( files ) {
    var width   = files[ files.length - 1 ].width,
        height  = files[ files.length - 1 ].height;

    $.TileSource.apply( this, [ 
        width,      
        height, 
        Math.max( height, width ),  //tileSize
        0,                          //overlap
        0,                          //mimLevel
        files.length - 1            //maxLevel
    ] );

    this.files = files;
};

$.LegacyTileSource.prototype = {
    
    /**
     * @function
     * @param {Number} level
     */
    getLevelScale: function( level ) {
        var levelScale = NaN;
        if (  level >= this.minLevel && level <= this.maxLevel ){
            levelScale = 
                this.files[ level ].height / 
                this.files[ this.maxLevel ].height;
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
            px = ( x === 0 ) ? 0 : this.files[ level ].width,
            py = ( y === 0 ) ? 0 : this.files[ level ].height,
            sx = this.files[ level ].width,
            sy = this.files[ level ].height,
            scale = Math.max( 
                1.0 / dimensionsScaled.x,
                1.0 / dimensionsScaled.y
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
            url = this.files[ level ].url;
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

}( OpenSeadragon ));
