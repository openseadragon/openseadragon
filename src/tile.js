
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

        var position = this.position.apply( Math.floor ),
            size     = this.size.apply( Math.ceil );

        if ( !this.loaded || !this.image ) {
            $.console.warn(
                "Attempting to draw tile %s when it's not yet loaded.",
                this.toString()
            );
            return;
        }

        if ( !this.element ) {
            this.element        = $.makeNeutralElement("img");
            this.element.src    = this.url;
            this.style          = this.element.style;

            this.style.position            = "absolute";
            this.style.msInterpolationMode = "nearest-neighbor";
        }


        if ( this.element.parentNode != container ) {
            container.appendChild( this.element );
        }

        this.element.style.left    = position.x + "px";
        this.element.style.top     = position.y + "px";
        this.element.style.width   = size.x + "px";
        this.element.style.height  = size.y + "px";

        $.setElementOpacity( this.element, this.opacity );

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
        context.drawImage( this.image, position.x, position.y, size.x, size.y );
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
