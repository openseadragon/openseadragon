
(function( $ ){

    /**
     * An enumeration of positions that an overlay may be assigned relative
     * to the viewport including CENTER, TOP_LEFT (default), TOP, TOP_RIGHT,
     * RIGHT, BOTTOM_RIGHT, BOTTOM, BOTTOM_LEFT, and LEFT.
     * @static
     */
    $.OverlayPlacement = {
        CENTER:       0,
        TOP_LEFT:     1,
        TOP:          2,
        TOP_RIGHT:    3,
        RIGHT:        4,
        BOTTOM_RIGHT: 5,
        BOTTOM:       6,
        BOTTOM_LEFT:  7,
        LEFT:         8
    };

    /**
     * An Overlay provides a 
     * @class
     */
    $.Overlay = function( element, location, placement ) {
        this.element    = element;
        this.scales     = location instanceof $.Rect;
        this.bounds     = new $.Rect(
            location.x, 
            location.y,
            location.width, 
            location.height
        );
        this.position   = new $.Point(
            location.x, 
            location.y
        );
        this.size       = new $.Point(
            location.width, 
            location.height
        );
        this.style      = element.style;
        // rects are always top-left
        this.placement  = location instanceof $.Point ? 
            placement : 
            $.OverlayPlacement.TOP_LEFT;    
    };

    $.Overlay.prototype = {

        /**
         * @function
         * @param {OpenSeadragon.OverlayPlacement} position
         * @param {OpenSeadragon.Point} size
         */
        adjust: function( position, size ) {
            switch ( this.placement ) {
                case $.OverlayPlacement.TOP_LEFT:
                    break;
                case $.OverlayPlacement.TOP:
                    position.x -= size.x / 2;
                    break;
                case $.OverlayPlacement.TOP_RIGHT:
                    position.x -= size.x;
                    break;
                case $.OverlayPlacement.RIGHT:
                    position.x -= size.x;
                    position.y -= size.y / 2;
                    break;
                case $.OverlayPlacement.BOTTOM_RIGHT:
                    position.x -= size.x;
                    position.y -= size.y;
                    break;
                case $.OverlayPlacement.BOTTOM:
                    position.x -= size.x / 2;
                    position.y -= size.y;
                    break;
                case $.OverlayPlacement.BOTTOM_LEFT:
                    position.y -= size.y;
                    break;
                case $.OverlayPlacement.LEFT:
                    position.y -= size.y / 2;
                    break;
                case $.OverlayPlacement.CENTER:
                default:
                    position.x -= size.x / 2;
                    position.y -= size.y / 2;
                    break;
            }
        },

        /**
         * @function
         */
        destroy: function() {
            var element = this.element,
                style   = this.style;

            if ( element.parentNode ) {
                element.parentNode.removeChild( element );
            }

            style.top = "";
            style.left = "";
            style.position = "";

            if ( this.scales ) {
                style.width = "";
                style.height = "";
            }
        },

        /**
         * @function
         * @param {Element} container
         */
        drawHTML: function( container ) {
            var element = this.element,
                style   = this.style,
                scales  = this.scales,
                position,
                size;

            if ( element.parentNode != container ) {
                container.appendChild( element );
            }

            if ( !scales ) {
                this.size = $.getElementSize( element );
            }

            position = this.position;
            size     = this.size;

            this.adjust( position, size );

            position = position.apply( Math.floor );
            size     = size.apply( Math.ceil );

            style.left     = position.x + "px";
            style.top      = position.y + "px";
            style.position = "absolute";

            if ( scales ) {
                style.width  = size.x + "px";
                style.height = size.y + "px";
            }
        },

        /**
         * @function
         * @param {OpenSeadragon.Point|OpenSeadragon.Rect} location
         * @param {OpenSeadragon.OverlayPlacement} position
         */
        update: function( location, placement ) {
            this.scales     = location instanceof $.Rect;
            this.bounds     = new $.Rect( 
                location.x, 
                location.y, 
                location.width, 
                location.height
            );
            // rects are always top-left
            this.placement  = location instanceof $.Point ?
                placement : 
                $.OverlayPlacement.TOP_LEFT;    
        }

    };

}( OpenSeadragon ));
