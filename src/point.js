/*
 * OpenSeadragon - Point
 *
 * Copyright (C) 2009 CodePlex Foundation
 * Copyright (C) 2010-2013 OpenSeadragon contributors
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 * - Redistributions of source code must retain the above copyright notice,
 *   this list of conditions and the following disclaimer.
 *
 * - Redistributions in binary form must reproduce the above copyright
 *   notice, this list of conditions and the following disclaimer in the
 *   documentation and/or other materials provided with the distribution.
 *
 * - Neither the name of CodePlex Foundation nor the names of its
 *   contributors may be used to endorse or promote products derived from
 *   this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

(function( $ ){

/**
 * @class Point
 * @classdesc A Point is really used as a 2-dimensional vector, equally useful for
 * representing a point on a plane, or the height and width of a plane
 * not requiring any other frame of reference.
 *
 * @memberof OpenSeadragon
 * @param {Number} [x] The vector component 'x'. Defaults to the origin at 0.
 * @param {Number} [y] The vector component 'y'. Defaults to the origin at 0.
 */
$.Point = function( x, y ) {
    /**
     * The vector component 'x'.
     * @member {Number} x
     * @memberof OpenSeadragon.Point#
     */
    this.x = typeof ( x ) == "number" ? x : 0;
    /**
     * The vector component 'y'.
     * @member {Number} y
     * @memberof OpenSeadragon.Point#
     */
    this.y = typeof ( y ) == "number" ? y : 0;
};

$.Point.prototype = /** @lends OpenSeadragon.Point.prototype */{

    /**
     * Add another Point to this point and return a new Point.
     * @function
     * @param {OpenSeadragon.Point} point The point to add vector components.
     * @returns {OpenSeadragon.Point} A new point representing the sum of the
     *  vector components
     */
    plus: function( point ) {
        return new $.Point(
            this.x + point.x,
            this.y + point.y
        );
    },

    /**
     * Substract another Point to this point and return a new Point.
     * @function
     * @param {OpenSeadragon.Point} point The point to substract vector components.
     * @returns {OpenSeadragon.Point} A new point representing the substraction of the
     *  vector components
     */
    minus: function( point ) {
        return new $.Point(
            this.x - point.x,
            this.y - point.y
        );
    },

    /**
     * Multiply this point by a factor and return a new Point.
     * @function
     * @param {Number} factor The factor to multiply vector components.
     * @returns {OpenSeadragon.Point} A new point representing the multiplication
     *  of the vector components by the factor
     */
    times: function( factor ) {
        return new $.Point(
            this.x * factor,
            this.y * factor
        );
    },

    /**
     * Divide this point by a factor and return a new Point.
     * @function
     * @param {Number} factor The factor to divide vector components.
     * @returns {OpenSeadragon.Point} A new point representing the division of the
     *  vector components by the factor
     */
    divide: function( factor ) {
        return new $.Point(
            this.x / factor,
            this.y / factor
        );
    },

    /**
     * Compute the opposite of this point and return a new Point.
     * @function
     * @returns {OpenSeadragon.Point} A new point representing the opposite of the
     *  vector components
     */
    negate: function() {
        return new $.Point( -this.x, -this.y );
    },

    /**
     * Compute the distance between this point and another point.
     * @function
     * @param {OpenSeadragon.Point} point The point to compute the distance with.
     * @returns {Number} The distance between the 2 points
     */
    distanceTo: function( point ) {
        return Math.sqrt(
            Math.pow( this.x - point.x, 2 ) +
            Math.pow( this.y - point.y, 2 )
        );
    },

    /**
     * Apply a function to each coordinate of this point and return a new point.
     * @function
     * @param {function} func The function to apply to each coordinate.
     * @returns {OpenSeadragon.Point} A new point with the coordinates computed
     * by the specified function
     */
    apply: function( func ) {
        return new $.Point( func( this.x ), func( this.y ) );
    },

    /**
     * Check if this point is equal to another one.
     * @function
     * @param {OpenSeadragon.Point} point The point to compare this point with.
     * @returns {Boolean} true if they are equal, false otherwise.
     */
    equals: function( point ) {
        return (
            point instanceof $.Point
        ) && (
            this.x === point.x
        ) && (
            this.y === point.y
        );
    },

    /**
     * Rotates the point around the specified pivot
     * From http://stackoverflow.com/questions/4465931/rotate-rectangle-around-a-point
     * @function
     * @param {Number} degress to rotate around the pivot.
     * @param {OpenSeadragon.Point} pivot Point about which to rotate.
     * @returns {OpenSeadragon.Point}. A new point representing the point rotated around the specified pivot
     */
    rotate: function ( degrees, pivot ) {
        var angle = degrees * Math.PI / 180.0,
            x = Math.cos( angle ) * ( this.x - pivot.x ) - Math.sin( angle ) * ( this.y - pivot.y ) + pivot.x,
            y = Math.sin( angle ) * ( this.x - pivot.x ) + Math.cos( angle ) * ( this.y - pivot.y ) + pivot.y;
        return new $.Point( x, y );
    },

    /**
     * Convert this point to a string in the format (x,y) where x and y are
     * rounded to the nearest integer.
     * @function
     * @returns {String} A string representation of this point.
     */
    toString: function() {
        return "(" + Math.round(this.x) + "," + Math.round(this.y) + ")";
    }
};

}( OpenSeadragon ));
