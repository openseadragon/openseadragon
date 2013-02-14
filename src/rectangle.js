(function( $ ){
    
/**
 * A Rectangle really represents a 2x2 matrix where each row represents a
 * 2 dimensional vector component, the first is (x,y) and the second is 
 * (width, height).  The latter component implies the equation of a simple 
 * plane.
 *
 * @class
 * @param {Number} x The vector component 'x'.
 * @param {Number} y The vector component 'y'.
 * @param {Number} width The vector component 'height'.
 * @param {Number} height The vector component 'width'.
 * @property {Number} x The vector component 'x'.
 * @property {Number} y The vector component 'y'.
 * @property {Number} width The vector component 'width'.
 * @property {Number} height The vector component 'height'.
 */
$.Rect = function( x, y, width, height ) {
    this.x = typeof ( x ) == "number" ? x : 0;
    this.y = typeof ( y ) == "number" ? y : 0;
    this.width  = typeof ( width )  == "number" ? width : 0;
    this.height = typeof ( height ) == "number" ? height : 0;
};

$.Rect.prototype = {

    /**
     * The aspect ratio is simply the ratio of width to height.
     * @function
     * @returns {Number} The ratio of width to height.
     */
    getAspectRatio: function() {
        return this.width / this.height;
    },

    /**
     * Provides the coordinates of the upper-left corner of the rectanglea s a
     * point.
     * @function
     * @returns {OpenSeadragon.Point} The coordinate of the upper-left corner of
     *  the rectangle.
     */
    getTopLeft: function() {
        return new $.Point( this.x, this.y );
    },

    /**
     * Provides the coordinates of the bottom-right corner of the rectangle as a
     * point.
     * @function
     * @returns {OpenSeadragon.Point} The coordinate of the bottom-right corner of
     *  the rectangle.
     */
    getBottomRight: function() {
        return new $.Point(
            this.x + this.width, 
            this.y + this.height
        );
    },

    /**
     * Computes the center of the rectangle.
     * @function
     * @returns {OpenSeadragon.Point} The center of the rectangle as represnted 
     *  as represented by a 2-dimensional vector (x,y)
     */
    getCenter: function() {
        return new $.Point(
            this.x + this.width / 2.0,
            this.y + this.height / 2.0
        );
    },

    /**
     * Returns the width and height component as a vector OpenSeadragon.Point
     * @function
     * @returns {OpenSeadragon.Point} The 2 dimensional vector represnting the
     *  the width and height of the rectangle.
     */
    getSize: function() {
        return new $.Point( this.width, this.height );
    },

    /**
     * Determines if two Rectanlges have equivalent components.  
     * @function
     * @param {OpenSeadragon.Rect} rectangle The Rectangle to compare to.
     * @return {Boolean} 'true' if all components are equal, otherwise 'false'.
     */
    equals: function( other ) {
        return ( other instanceof $.Rect ) &&
            ( this.x === other.x ) && 
            ( this.y === other.y ) &&
            ( this.width === other.width ) && 
            ( this.height === other.height );
    },

    /**
     * Provides a string representation of the retangle which is useful for 
     * debugging.
     * @function
     * @returns {String} A string representation of the rectangle.
     */
    toString: function() {
        return "[" + 
            Math.round(this.x*100) + "," + 
            Math.round(this.y*100) + "," + 
            Math.round(this.width*100) + "x" +
            Math.round(this.height*100) + 
        "]";
    }
};


}( OpenSeadragon ));
