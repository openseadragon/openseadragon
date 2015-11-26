/*
 * OpenSeadragon - Rect
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
 * @class Rect
 * @classdesc A Rectangle is described by it top left coordinates (x, y), width,
 * height and degrees of rotation around (x, y).
 * Note that the coordinate system used is the one commonly used with images:
 * x increases when going to the right
 * y increases when going to the bottom
 * degrees increases clockwise with 0 being the horizontal
 *
 * @memberof OpenSeadragon
 * @param {Object} options
 * @param {Number} options.x X coordinate of the top left corner of the rectangle.
 * @param {Number} options.y Y coordinate of the top left corner of the rectangle.
 * @param {Number} options.width Width of the rectangle.
 * @param {Number} options.height Height of the rectangle.
 * @param {Number} options.degrees Rotation of the rectangle around (x,y) in degrees.
 * @param {Number} [x] Deprecated: The vector component 'x'.
 * @param {Number} [y] Deprecated: The vector component 'y'.
 * @param {Number} [width] Deprecated: The vector component 'width'.
 * @param {Number} [height] Deprecated: The vector component 'height'.
 */
$.Rect = function(x, y, width, height) {

    var options = x;
    if (!$.isPlainObject(options)) {
        options = {
            x: x,
            y: y,
            width: width,
            height: height
        };
    }

    /**
     * The vector component 'x'.
     * @member {Number} x
     * @memberof OpenSeadragon.Rect#
     */
    this.x = typeof(options.x) === "number" ? options.x : 0;
    /**
     * The vector component 'y'.
     * @member {Number} y
     * @memberof OpenSeadragon.Rect#
     */
    this.y = typeof(options.y) === "number" ? options.y : 0;
    /**
     * The vector component 'width'.
     * @member {Number} width
     * @memberof OpenSeadragon.Rect#
     */
    this.width  = typeof(options.width) === "number" ? options.width : 0;
    /**
     * The vector component 'height'.
     * @member {Number} height
     * @memberof OpenSeadragon.Rect#
     */
    this.height = typeof(options.height) === "number" ? options.height : 0;

    this.degrees = typeof(options.degrees) === "number" ? options.degrees : 0;
};

$.Rect.prototype = /** @lends OpenSeadragon.Rect.prototype */{
    /**
     * @function
     * @returns {OpenSeadragon.Rect} a duplicate of this Rect
     */
    clone: function() {
        return new $.Rect({
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            degrees: this.degrees
        });
    },

    /**
     * The aspect ratio is simply the ratio of width to height.
     * @function
     * @returns {Number} The ratio of width to height.
     */
    getAspectRatio: function() {
        return this.width / this.height;
    },

    /**
     * Provides the coordinates of the upper-left corner of the rectangle as a
     * point.
     * @function
     * @returns {OpenSeadragon.Point} The coordinate of the upper-left corner of
     *  the rectangle.
     */
    getTopLeft: function() {
        return new $.Point(
            this.x,
            this.y
        );
    },

    /**
     * Provides the coordinates of the bottom-right corner of the rectangle as a
     * point.
     * @function
     * @returns {OpenSeadragon.Point} The coordinate of the bottom-right corner of
     *  the rectangle.
     */
    getBottomRight: function() {
        return new $.Point(this.x + this.width, this.y + this.height)
            .rotate(this.degrees, this.getTopLeft());
    },

    /**
     * Provides the coordinates of the top-right corner of the rectangle as a
     * point.
     * @function
     * @returns {OpenSeadragon.Point} The coordinate of the top-right corner of
     *  the rectangle.
     */
    getTopRight: function() {
        return new $.Point(this.x + this.width, this.y)
            .rotate(this.degrees, this.getTopLeft());
    },

    /**
     * Provides the coordinates of the bottom-left corner of the rectangle as a
     * point.
     * @function
     * @returns {OpenSeadragon.Point} The coordinate of the bottom-left corner of
     *  the rectangle.
     */
    getBottomLeft: function() {
        return new $.Point(this.x, this.y + this.height)
            .rotate(this.degrees, this.getTopLeft());
    },

    /**
     * Computes the center of the rectangle.
     * @function
     * @returns {OpenSeadragon.Point} The center of the rectangle as represented
     *  as represented by a 2-dimensional vector (x,y)
     */
    getCenter: function() {
        return new $.Point(
            this.x + this.width / 2.0,
            this.y + this.height / 2.0
        ).rotate(this.degrees, this.getTopLeft());
    },

    /**
     * Returns the width and height component as a vector OpenSeadragon.Point
     * @function
     * @returns {OpenSeadragon.Point} The 2 dimensional vector representing the
     *  the width and height of the rectangle.
     */
    getSize: function() {
        return new $.Point( this.width, this.height );
    },

    /**
     * Determines if two Rectangles have equivalent components.
     * @function
     * @param {OpenSeadragon.Rect} rectangle The Rectangle to compare to.
     * @return {Boolean} 'true' if all components are equal, otherwise 'false'.
     */
    equals: function(other) {
        return (other instanceof $.Rect) &&
            this.x === other.x &&
            this.y === other.y &&
            this.width === other.width &&
            this.height === other.height &&
            this.degrees === other.degrees;
    },

    /**
    * Multiply all dimensions (except degrees) in this Rect by a factor and
    * return a new Rect.
    * @function
    * @param {Number} factor The factor to multiply vector components.
    * @returns {OpenSeadragon.Rect} A new rect representing the multiplication
    *  of the vector components by the factor
    */
    times: function(factor) {
        return new $.Rect({
            x: this.x * factor,
            y: this.y * factor,
            width: this.width * factor,
            height: this.height * factor,
            degrees: this.degrees
        });
    },

    /**
    * Translate/move this Rect by a vector and return new Rect.
    * @function
    * @param {OpenSeadragon.Point} delta The translation vector.
    * @returns {OpenSeadragon.Rect} A new rect with altered position
    */
    translate: function(delta) {
        return new $.Rect({
            x: this.x + delta.x,
            y: this.y + delta.y,
            width: this.width,
            height: this.height,
            degrees: this.degrees
        });
    },

    /**
     * Returns the smallest rectangle that will contain this and the given rectangle.
     * @param {OpenSeadragon.Rect} rect
     * @return {OpenSeadragon.Rect} The new rectangle.
     */
    // ----------
    union: function(rect) {
        if (this.degrees !== 0 || rect.degrees !== 0) {
            throw new Error('Only union of non rotated rectangles are supported.');
        }
        var left = Math.min(this.x, rect.x);
        var top = Math.min(this.y, rect.y);
        var right = Math.max(this.x + this.width, rect.x + rect.width);
        var bottom = Math.max(this.y + this.height, rect.y + rect.height);

        return new $.Rect({
            left: left,
            top: top,
            width: right - left,
            height: bottom - top
        });
    },

    /**
     * Rotates a rectangle around a point.
     * @function
     * @param {Number} degrees The angle in degrees to rotate.
     * @param {OpenSeadragon.Point} pivot The point about which to rotate.
     * Defaults to the center of the rectangle.
     * @return {OpenSeadragon.Rect}
     */
    rotate: function(degrees, pivot) {
        degrees = (degrees + 360) % 360;
        if (degrees === 0) {
            return this.clone();
        }

        pivot = pivot || this.getCenter();
        var newTopLeft = this.getTopLeft().rotate(degrees, pivot);
        var newTopRight = this.getTopRight().rotate(degrees, pivot);

        var diff = newTopRight.minus(newTopLeft);
        var radians = Math.atan(diff.y / diff.x);
        if (diff.x < 0) {
            radians += Math.PI;
        } else if (diff.y < 0) {
            radians += 2 * Math.PI;
        }
        return new $.Rect({
            x: newTopLeft.x,
            y: newTopLeft.y,
            width: this.width,
            height: this.height,
            degrees: radians / Math.PI * 180
        });
    },

    /**
     * Retrieves the smallest horizontal (degrees=0) rectangle which contains
     * this rectangle.
     * @returns {OpenSeadrayon.Rect}
     */
    getBoundingBox: function() {
        if (this.degrees === 0) {
            return this.clone();
        }
        var topLeft = this.getTopLeft();
        var topRight = this.getTopRight();
        var bottomLeft = this.getBottomLeft();
        var bottomRight = this.getBottomRight();
        var minX = Math.min(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x);
        var maxX = Math.max(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x);
        var minY = Math.min(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y);
        var maxY = Math.max(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y);
        return new $.Rect({
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        });
    },

    /**
     * Provides a string representation of the rectangle which is useful for
     * debugging.
     * @function
     * @returns {String} A string representation of the rectangle.
     */
    toString: function() {
        return "[" +
            (Math.round(this.x * 100) / 100) + "," +
            (Math.round(this.y * 100) / 100) + "," +
            (Math.round(this.width * 100) / 100) + "x" +
            (Math.round(this.height * 100) / 100) + "," +
            (Math.round(this.degrees * 100) / 100) + "°" +
            "]";
    }
};


}( OpenSeadragon ));
