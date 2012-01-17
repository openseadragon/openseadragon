
(function( $ ){
    
$.Tile = function(level, x, y, bounds, exists, url) {
    this.level   = level;
    this.x       = x;
    this.y       = y;
    this.bounds  = bounds;  // where this tile fits, in normalized coordinates
    this.exists  = exists;  // part of sparse image? tile hasn't failed to load?
    this.loaded  = false;   // is this tile loaded?
    this.loading = false;   // or is this tile loading?

    this.elmt    = null;    // the HTML element for this tile
    this.image   = null;    // the Image object for this tile
    this.url     = url;     // the URL of this tile's image

    this.style      = null; // alias of this.elmt.style
    this.position   = null; // this tile's position on screen, in pixels
    this.size       = null; // this tile's size on screen, in pixels
    this.blendStart = null; // the start time of this tile's blending
    this.opacity    = null; // the current opacity this tile should be
    this.distance   = null; // the distance of this tile to the viewport center
    this.visibility = null; // the visibility score of this tile

    this.beingDrawn     = false; // whether this tile is currently being drawn
    this.lastTouchTime  = 0;     // the time that tile was last touched
};

$.Tile.prototype = {
    
    toString: function() {
        return this.level + "/" + this.x + "_" + this.y;
    },

    drawHTML: function( container ) {

        if ( !this.loaded ) {
            $.Debug.error(
                "Attempting to draw tile " + 
                this.toString() +
                " when it's not yet loaded."
            );
            return;
        }

        if ( !this.elmt ) {
            this.elmt       = $.makeNeutralElement("img");
            this.elmt.src   = this.url;
            this.style      = this.elmt.style;

            this.style.position            = "absolute";
            this.style.msInterpolationMode = "nearest-neighbor";
        }

        var position = this.position.apply( Math.floor );
        var size     = this.size.apply( Math.ceil );


        if ( this.elmt.parentNode != container ) {
            container.appendChild( this.elmt );
        }

        this.elmt.style.left    = position.x + "px";
        this.elmt.style.top     = position.y + "px";
        this.elmt.style.width   = size.x + "px";
        this.elmt.style.height  = size.y + "px";

        $.setElementOpacity( this.elmt, this.opacity );

    },

    drawCanvas: function(context) {
        if (!this.loaded) {
            $.Debug.error(
                "Attempting to draw tile " + 
                this.toString() +
                " when it's not yet loaded."
            );
            return;
        }

        var position = this.position,
            size     = this.size;

        context.globalAlpha = this.opacity;
        context.drawImage(this.image, position.x, position.y, size.x, size.y);
    },

    unload: function() {
        if ( this.elmt && this.elmt.parentNode ) {
            this.elmt.parentNode.removeChild( this.elmt );
        }

        this.elmt    = null;
        this.image   = null;
        this.loaded  = false;
        this.loading = false;
    }
};

}( OpenSeadragon ));
