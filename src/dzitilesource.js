
(function( $ ){
    
/**
 * @class
 * @extends OpenSeadragon.TileSource
 * @param {Number} width
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



}( OpenSeadragon ));
