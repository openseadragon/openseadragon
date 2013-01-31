
(function( $ ){
    
/**
 * @class
 * @param {Number} level The zoom level this tile belongs to.
 * @param {Number} x The vector component 'x'.
 * @param {Number} y The vector component 'y'.
 * @param {OpenSeadragon.Point} bounds Where this tile fits, in normalized 
 *      coordinates.
 * @param {Boolean} exists Is this tile a part of a sparse image? ( Also has 
 *      this tile failed to load? )
 * @param {String} url The URL of this tile's image.
 *
 * @property {Number} level The zoom level this tile belongs to.
 * @property {Number} x The vector component 'x'.
 * @property {Number} y The vector component 'y'.
 * @property {OpenSeadragon.Point} bounds Where this tile fits, in normalized 
 *      coordinates
 * @property {Boolean} exists Is this tile a part of a sparse image? ( Also has 
 *      this tile failed to load?
 * @property {String} url The URL of this tile's image.
 * @property {Boolean} loaded Is this tile loaded?
 * @property {Boolean} loading Is this tile loading
 * @property {Element} element The HTML element for this tile
 * @property {Image} image The Image object for this tile
 * @property {String} style The alias of this.element.style.
 * @property {String} position This tile's position on screen, in pixels.
 * @property {String} size This tile's size on screen, in pixels
 * @property {String} blendStart The start time of this tile's blending
 * @property {String} opacity The current opacity this tile should be.
 * @property {String} distance The distance of this tile to the viewport center
 * @property {String} visibility The visibility score of this tile.
 * @property {Boolean} beingDrawn Whether this tile is currently being drawn
 * @property {Number} lastTouchTime Timestamp the tile was last touched.
 */
$.Tile = function(level, x, y, bounds, exists, url) {
    this.level   = level;
    this.x       = x;
    this.y       = y;
    this.bounds  = bounds;
    this.exists  = exists;
    this.url     = url;
    this.loaded  = false;
    this.loading = false;

    this.element    = null;
    this.image      = null;

    this.style      = null;
    this.position   = null;
    this.size       = null;
    this.blendStart = null;
    this.opacity    = null;
    this.distance   = null;
    this.visibility = null;

    this.beingDrawn     = false;
    this.lastTouchTime  = 0;
};

$.Tile.prototype = {
    
    /**
     * Provides a string representation of this tiles level and (x,y) 
     * components.
     * @function
     * @returns {String}
     */
    toString: function() {
        return this.level + "/" + this.x + "_" + this.y;
    },

    /**
     * Renders the tile in an html container.
     * @function
     * @param {Element} container
     */
    drawHTML: function( container ) {

        var containerSize = $.getElementSize( container );

        if ( !this.loaded || !this.image ) {
            $.console.warn(
                "Attempting to draw tile %s when it's not yet loaded.",
                this.toString()
            );
            return;
        }

        /* EXISTING IMPLEMENTATION
        if ( !this.element ) {
            this.element              = $.makeNeutralElement("img");
            this.element.src          = this.url;

            this.style                     = this.element.style;
            this.style.position            = "absolute";
            this.style.msInterpolationMode = "nearest-neighbor";
        }

        if ( this.element.parentNode != container ) {
            container.appendChild( this.element );
        }

        this.style.top     = position.y + "px";
        this.style.left    = position.x + "px";
        this.style.height  = size.y + "px";
        this.style.width   = size.x + "px";
        */

        //EXPERIMENTAL - trying to figure out how to scale the container
        //               content during animation of the container size.
        
        if ( !this.element ) {
            this.element            = $.makeNeutralElement("div");
            this.image              = $.makeNeutralElement("img");
            this.image.src          = this.url;
            this.image.style.height = '100%';
            this.image.style.width  = '100%';
            this.image.style.msInterpolationMode = "nearest-neighbor";
            this.element.appendChild( this.image );

            this.style                     = this.element.style;
            this.style.position            = "absolute";
        }
        if ( this.element.parentNode != container ) {
            container.appendChild( this.element );
        }

        this.style.top     = 100 * ( this.position.y / containerSize.y ) + "%";
        this.style.left    = 100 * ( this.position.x / containerSize.x ) + "%";
        this.style.height  = 100 * ( this.size.y / containerSize.y ) + "%";
        this.style.width   = 100 * ( this.size.x / containerSize.x ) + "%";
        
        $.setElementOpacity( this.image, this.opacity );


    },

    /**
     * Renders the tile in a canvas-based context.
     * @function
     * @param {Canvas} context
     */
    drawCanvas: function( context ) {

        var position = this.position,
            size     = this.size;

        if ( !this.loaded || !this.image ) {
            $.console.warn(
                "Attempting to draw tile %s when it's not yet loaded.",
                this.toString()
            );
            return;
        }
        context.globalAlpha = this.opacity;

        context.save();

        //if we are supposed to b rendering fully opaque rectangle,
        //ie its done fading or fading is turned off, and if we are drawing
        //an image with an alpha channel, then the only way
        //to avoid seeing the tile underneath is to clear the rectangle
        if( context.globalAlpha == 1 && this.image.src.match('.png') ){
            //clearing only the inside of the rectangle occupied
            //by the png prevents edge flikering
            context.clearRect( 
                position.x+1, 
                position.y+1, 
                size.x-2, 
                size.y-2 
            );

        }
        
        context.drawImage( this.image, position.x, position.y, size.x, size.y );

        context.restore();
    },

    /**
     * Removes tile from it's contianer.
     * @function
     */
    unload: function() {
        if ( this.element && this.element.parentNode ) {
            this.element.parentNode.removeChild( this.element );
        }

        this.element    = null;
        this.image   = null;
        this.loaded  = false;
        this.loading = false;
    }
};

}( OpenSeadragon ));
