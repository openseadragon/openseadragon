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
 * A Point is really used as a 2-dimensional vector, equally useful for
 * representing a point on a plane, or the height and width of a plane
 * not requiring any other frame of reference.
 * @class
 * @param {Number} [x] The vector component 'x'. Defaults to the origin at 0.
 * @param {Number} [y] The vector component 'y'. Defaults to the origin at 0.
 * @property {Number} [x] The vector component 'x'.
 * @property {Number} [y] The vector component 'y'.
 */
$.Point = function( x, y ) {
    this.x = typeof ( x ) == "number" ? x : 0;
    this.y = typeof ( y ) == "number" ? y : 0;
};

$.Point.prototype = {

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
     * Add another Point to this point and return a new Point.
     * @function
     * @param {OpenSeadragon.Point} point The point to add vector components.
     * @returns {OpenSeadragon.Point} A new point representing the sum of the
     *  vector components
     */
    minus: function( point ) {
        return new $.Point(
            this.x - point.x,
            this.y - point.y
        );
    },

    /**
     * Add another Point to this point and return a new Point.
     * @function
     * @param {OpenSeadragon.Point} point The point to add vector components.
     * @returns {OpenSeadragon.Point} A new point representing the sum of the
     *  vector components
     */
    times: function( factor ) {
        return new $.Point(
            this.x * factor,
            this.y * factor
        );
    },

    /**
     * Add another Point to this point and return a new Point.
     * @function
     * @param {OpenSeadragon.Point} point The point to add vector components.
     * @returns {OpenSeadragon.Point} A new point representing the sum of the
     *  vector components
     */
    divide: function( factor ) {
        return new $.Point(
            this.x / factor,
            this.y / factor
        );
    },

    /**
     * Add another Point to this point and return a new Point.
     * @function
     * @param {OpenSeadragon.Point} point The point to add vector components.
     * @returns {OpenSeadragon.Point} A new point representing the sum of the
     *  vector components
     */
    negate: function() {
        return new $.Point( -this.x, -this.y );
    },

    /**
     * Add another Point to this point and return a new Point.
     * @function
     * @param {OpenSeadragon.Point} point The point to add vector components.
     * @returns {OpenSeadragon.Point} A new point representing the sum of the
     *  vector components
     */
    distanceTo: function( point ) {
        return Math.sqrt(
            Math.pow( this.x - point.x, 2 ) +
            Math.pow( this.y - point.y, 2 )
        );
    },

    /**
     * Add another Point to this point and return a new Point.
     * @function
     * @param {OpenSeadragon.Point} point The point to add vector components.
     * @returns {OpenSeadragon.Point} A new point representing the sum of the
     *  vector components
     */
    apply: function( func ) {
        return new $.Point( func( this.x ), func( this.y ) );
    },

    /**
     * Add another Point to this point and return a new Point.
     * @function
     * @param {OpenSeadragon.Point} point The point to add vector components.
     * @returns {OpenSeadragon.Point} A new point representing the sum of the
     *  vector components
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
            x = $._round(
                    Math.cos( angle ) * ( this.x - pivot.x ) -
                    Math.sin( angle ) * ( this.y - pivot.y ) + pivot.x
                ),
            y = $._round(
                    Math.sin( angle ) * ( this.x - pivot.x ) +
                    Math.cos( angle ) * ( this.y - pivot.y ) + pivot.y
                );
        return new $.Point( x, y );
    },

    /**
     * Add another Point to this point and return a new Point.
     * @function
     * @param {OpenSeadragon.Point} point The point to add vector components.
     * @returns {OpenSeadragon.Point} A new point representing the sum of the
     *  vector components
     */
    toString: function() {
        return "(" + Math.round(this.x) + "," + Math.round(this.y) + ")";
    }
};

}( OpenSeadragon ));
