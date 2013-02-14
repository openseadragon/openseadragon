(function( $ ){
    
/**
 * @class
 * @extends OpenSeadragon.TileSourceCollection
 */ 
$.TileSourceCollection = function( tileSize, tileSources, rows, layout  ) {
    
    
    if( $.isPlainObject( tileSize ) ){
        options = tileSize;
    }else{
        options = {
            tileSize: arguments[ 0 ],
            tileSources: arguments[ 1 ],
            rows: arguments[ 2 ],
            layout: arguments[ 3 ]
        };
    }

    if( !options.layout ){
        options.layout = 'horizontal';
    }

    var minLevel = 0,
        levelSize = 1.0,
        tilesPerRow = Math.ceil( options.tileSources.length / options.rows ),
        longSide = tilesPerRow >= options.rows ?
            tilesPerRow :
            options.rows;

    if( 'horizontal' == options.layout ){
        options.width = ( options.tileSize ) * tilesPerRow;
        options.height = ( options.tileSize ) * options.rows;
    } else {
        options.height = ( options.tileSize ) * tilesPerRow;
        options.width = ( options.tileSize ) * options.rows;
    }

    options.tileOverlap = -options.tileMargin;
    options.tilesPerRow = tilesPerRow;

    //Set min level to avoid loading sublevels since collection is a
    //different kind of abstraction

    while( levelSize  <  ( options.tileSize ) * longSide ){
        //$.console.log( '%s levelSize %s minLevel %s', options.tileSize * longSide, levelSize, minLevel );
        levelSize = levelSize * 2.0;
        minLevel++;
    }
    options.minLevel = minLevel;

    //for( var name in options ){
    //    $.console.log( 'Collection %s %s', name, options[ name ] ); 
    //}

    $.TileSource.apply( this, [ options ] );

};

$.extend( $.TileSourceCollection.prototype, $.TileSource.prototype, {

    /**
     * @function
     * @param {Number} level
     * @param {Number} x
     * @param {Number} y
     */
    getTileBounds: function( level, x, y ) {
        var dimensionsScaled = this.dimensions.times( this.getLevelScale( level ) ),
            px = this.tileSize * x - this.tileOverlap,
            py = this.tileSize * y - this.tileOverlap,
            sx = this.tileSize + 1 * this.tileOverlap,
            sy = this.tileSize + 1 * this.tileOverlap,
            scale = 1.0 / dimensionsScaled.x;

        sx = Math.min( sx, dimensionsScaled.x - px );
        sy = Math.min( sy, dimensionsScaled.y - py );

        return new $.Rect( px * scale, py * scale, sx * scale, sy * scale );
    },

    /**
     * 
     * @function
     * @name OpenSeadragon.TileSourceCollection.prototype.configure
     */
    configure: function( data, url ){
        return;
    },


    /**
     * @function
     * @name OpenSeadragon.TileSourceCollection.prototype.getTileUrl
     * @param {Number} level
     * @param {Number} x
     * @param {Number} y
     */
    getTileUrl: function( level, x, y ) {
        //$.console.log([  level, '/', x, '_', y ].join( '' ));
        return null;
    }


    
});


}( OpenSeadragon ));
