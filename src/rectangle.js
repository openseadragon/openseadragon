/*
 * OpenSeadragon - Rect
 *
 * Copyright (C) 2009 CodePlex Foundation
 * Copyright (C) 2010-2025 OpenSeadragon contributors
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

(function($) {

/**
 * @class Rect
 * @classdesc A Rectangle is described by it top left coordinates (x, y), width,
 * height and degrees of rotation around (x, y).
 * Note that the coordinate system used is the one commonly used with images:
 * x increases when going to the right
 * y increases when going to the bottom
 * degrees increases clockwise with 0 being the horizontal
 *
 * The constructor normalizes the rectangle to always have 0 <= degrees < 90
 *
 * @memberof OpenSeadragon
 * @param {Number} [x=0] The vector component 'x'.
 * @param {Number} [y=0] The vector component 'y'.
 * @param {Number} [width=0] The vector component 'width'.
 * @param {Number} [height=0] The vector component 'height'.
 * @param {Number} [degrees=0] Rotation of the rectangle around (x,y) in degrees.
 */
$.Rect = function(x, y, width, height, degrees) {
    /**
     * The vector component 'x'.
     * @member {Number} x
     * @memberof OpenSeadragon.Rect#
     */
    this.x = typeof (x) === "number" ? x : 0;
    /**
     * The vector component 'y'.
     * @member {Number} y
     * @memberof OpenSeadragon.Rect#
     */
    this.y = typeof (y) === "number" ? y : 0;
    /**
     * The vector component 'width'.
     * @member {Number} width
     * @memberof OpenSeadragon.Rect#
     */
    this.width  = typeof (width) === "number" ? width : 0;
    /**
     * The vector component 'height'.
     * @member {Number} height
     * @memberof OpenSeadragon.Rect#
     */
    this.height = typeof (height) === "number" ? height : 0;

    /**
     * The rotation of the rectangle, in degrees.
     * @member {Number} degrees
     * @memberof OpenSeadragon.Rect#
     */
    this.degrees = typeof (degrees) === "number" ? degrees : 0;

    // Normalizes the rectangle.
    this.degrees = $.positiveModulo(this.degrees, 360);
    var newTopLeft, newWidth;
    if (this.degrees >= 270) {
        newTopLeft = this.getTopRight();
        this.x = newTopLeft.x;
        this.y = newTopLeft.y;
        newWidth = this.height;
        this.height = this.width;
        this.width = newWidth;
        this.degrees -= 270;
    } else if (this.degrees >= 180) {
        newTopLeft = this.getBottomRight();
        this.x = newTopLeft.x;
        this.y = newTopLeft.y;
        this.degrees -= 180;
    } else if (this.degrees >= 90) {
        newTopLeft = this.getBottomLeft();
        this.x = newTopLeft.x;
        this.y = newTopLeft.y;
        newWidth = this.height;
        this.height = this.width;
        this.width = newWidth;
        this.degrees -= 90;
    }
};

/**
 * Builds a rectangle having the 3 specified points as summits.
 * @static
 * @memberof OpenSeadragon.Rect
 * @param {OpenSeadragon.Point} topLeft
 * @param {OpenSeadragon.Point} topRight
 * @param {OpenSeadragon.Point} bottomLeft
 * @returns {OpenSeadragon.Rect}
 */
$.Rect.fromSummits = function(topLeft, topRight, bottomLeft) {
    var width = topLeft.distanceTo(topRight);
    var height = topLeft.distanceTo(bottomLeft);
    var diff = topRight.minus(topLeft);
    var radians = Math.atan(diff.y / diff.x);
    if (diff.x < 0) {
        radians += Math.PI;
    } else if (diff.y < 0) {
        radians += 2 * Math.PI;
    }
    return new $.Rect(
        topLeft.x,
        topLeft.y,
        width,
        height,
        radians / Math.PI * 180);
};

/** @lends OpenSeadragon.Rect.prototype */
$.Rect.prototype = {
    /**
     * @function
     * @returns {OpenSeadragon.Rect} a duplicate of this Rect
     */
    clone: function() {
        return new $.Rect(
            this.x,
            this.y,
            this.width,
            this.height,
            this.degrees);
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
     *  width and height of the rectangle.
     */
    getSize: function() {
        return new $.Point(this.width, this.height);
    },

    /**
     * Determines if two Rectangles have equivalent components.
     * @function
     * @param {OpenSeadragon.Rect} rectangle The Rectangle to compare to.
     * @returns {Boolean} 'true' if all components are equal, otherwise 'false'.
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
        return new $.Rect(
            this.x * factor,
            this.y * factor,
            this.width * factor,
            this.height * factor,
            this.degrees);
    },

    /**
    * Translate/move this Rect by a vector and return new Rect.
    * @function
    * @param {OpenSeadragon.Point} delta The translation vector.
    * @returns {OpenSeadragon.Rect} A new rect with altered position
    */
    translate: function(delta) {
        return new $.Rect(
            this.x + delta.x,
            this.y + delta.y,
            this.width,
            this.height,
            this.degrees);
    },

    /**
     * Returns the smallest rectangle that will contain this and the given
     * rectangle bounding boxes.
     * @param {OpenSeadragon.Rect} rect
     * @returns {OpenSeadragon.Rect} The new rectangle.
     */
    union: function(rect) {
        var thisBoundingBox = this.getBoundingBox();
        var otherBoundingBox = rect.getBoundingBox();

        var left = Math.min(thisBoundingBox.x, otherBoundingBox.x);
        var top = Math.min(thisBoundingBox.y, otherBoundingBox.y);
        var right = Math.max(
            thisBoundingBox.x + thisBoundingBox.width,
            otherBoundingBox.x + otherBoundingBox.width);
        var bottom = Math.max(
            thisBoundingBox.y + thisBoundingBox.height,
            otherBoundingBox.y + otherBoundingBox.height);

        return new $.Rect(
            left,
            top,
            right - left,
            bottom - top);
    },

    /**
     * Returns the bounding box of the intersection of this rectangle with the
     * given rectangle.
     * @param {OpenSeadragon.Rect} rect
     * @returns {OpenSeadragon.Rect} the bounding box of the intersection
     * or null if the rectangles don't intersect.
     */
    intersection: function(rect) {
        // Simplified version of Weiler Atherton clipping algorithm
        // https://en.wikipedia.org/wiki/Weiler%E2%80%93Atherton_clipping_algorithm
        // Because we just want the bounding box of the intersection,
        // we can just compute the bounding box of:
        // 1. all the summits of this which are inside rect
        // 2. all the summits of rect which are inside this
        // 3. all the intersections of rect and this
        var EPSILON = 0.0000000001;

        var intersectionPoints = [];

        var thisTopLeft = this.getTopLeft();
        if (rect.containsPoint(thisTopLeft, EPSILON)) {
            intersectionPoints.push(thisTopLeft);
        }
        var thisTopRight = this.getTopRight();
        if (rect.containsPoint(thisTopRight, EPSILON)) {
            intersectionPoints.push(thisTopRight);
        }
        var thisBottomLeft = this.getBottomLeft();
        if (rect.containsPoint(thisBottomLeft, EPSILON)) {
            intersectionPoints.push(thisBottomLeft);
        }
        var thisBottomRight = this.getBottomRight();
        if (rect.containsPoint(thisBottomRight, EPSILON)) {
            intersectionPoints.push(thisBottomRight);
        }

        var rectTopLeft = rect.getTopLeft();
        if (this.containsPoint(rectTopLeft, EPSILON)) {
            intersectionPoints.push(rectTopLeft);
        }
        var rectTopRight = rect.getTopRight();
        if (this.containsPoint(rectTopRight, EPSILON)) {
            intersectionPoints.push(rectTopRight);
        }
        var rectBottomLeft = rect.getBottomLeft();
        if (this.containsPoint(rectBottomLeft, EPSILON)) {
            intersectionPoints.push(rectBottomLeft);
        }
        var rectBottomRight = rect.getBottomRight();
        if (this.containsPoint(rectBottomRight, EPSILON)) {
            intersectionPoints.push(rectBottomRight);
        }

        var thisSegments = this._getSegments();
        var rectSegments = rect._getSegments();
        for (var i = 0; i < thisSegments.length; i++) {
            var thisSegment = thisSegments[i];
            for (var j = 0; j < rectSegments.length; j++) {
                var rectSegment = rectSegments[j];
                var intersect = getIntersection(thisSegment[0], thisSegment[1],
                    rectSegment[0], rectSegment[1]);
                if (intersect) {
                    intersectionPoints.push(intersect);
                }
            }
        }

        // Get intersection point of segments [a,b] and [c,d]
        function getIntersection(a, b, c, d) {
            // http://stackoverflow.com/a/1968345/1440403
            var abVector = b.minus(a);
            var cdVector = d.minus(c);

            var denom = -cdVector.x * abVector.y + abVector.x * cdVector.y;
            if (denom === 0) {
                return null;
            }

            var s = (abVector.x * (a.y - c.y) - abVector.y * (a.x - c.x)) / denom;
            var t = (cdVector.x * (a.y - c.y) - cdVector.y * (a.x - c.x)) / denom;

            if (-EPSILON <= s && s <= 1 - EPSILON &&
                -EPSILON <= t && t <= 1 - EPSILON) {
                return new $.Point(a.x + t * abVector.x, a.y + t * abVector.y);
            }
            return null;
        }

        if (intersectionPoints.length === 0) {
            return null;
        }

        var minX = intersectionPoints[0].x;
        var maxX = intersectionPoints[0].x;
        var minY = intersectionPoints[0].y;
        var maxY = intersectionPoints[0].y;
        for (var k = 1; k < intersectionPoints.length; k++) {
            var point = intersectionPoints[k];
            if (point.x < minX) {
                minX = point.x;
            }
            if (point.x > maxX) {
                maxX = point.x;
            }
            if (point.y < minY) {
                minY = point.y;
            }
            if (point.y > maxY) {
                maxY = point.y;
            }
        }
        return new $.Rect(minX, minY, maxX - minX, maxY - minY);
    },

    // private
    _getSegments: function() {
        var topLeft = this.getTopLeft();
        var topRight = this.getTopRight();
        var bottomLeft = this.getBottomLeft();
        var bottomRight = this.getBottomRight();
        return [[topLeft, topRight],
            [topRight, bottomRight],
            [bottomRight, bottomLeft],
            [bottomLeft, topLeft]];
    },

    /**
     * Rotates a rectangle around a point.
     * @function
     * @param {Number} degrees The angle in degrees to rotate.
     * @param {OpenSeadragon.Point} [pivot] The point about which to rotate.
     * Defaults to the center of the rectangle.
     * @returns {OpenSeadragon.Rect}
     */
    rotate: function(degrees, pivot) {
        degrees = $.positiveModulo(degrees, 360);
        if (degrees === 0) {
            return this.clone();
        }

        pivot = pivot || this.getCenter();
        var newTopLeft = this.getTopLeft().rotate(degrees, pivot);
        var newTopRight = this.getTopRight().rotate(degrees, pivot);

        var diff = newTopRight.minus(newTopLeft);
        // Handle floating point error
        diff = diff.apply(function(x) {
            var EPSILON = 1e-15;
            return Math.abs(x) < EPSILON ? 0 : x;
        });
        var radians = Math.atan(diff.y / diff.x);
        if (diff.x < 0) {
            radians += Math.PI;
        } else if (diff.y < 0) {
            radians += 2 * Math.PI;
        }
        return new $.Rect(
            newTopLeft.x,
            newTopLeft.y,
            this.width,
            this.height,
            radians / Math.PI * 180);
    },

    /**
     * Retrieves the smallest horizontal (degrees=0) rectangle which contains
     * this rectangle.
     * @returns {OpenSeadragon.Rect}
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
        return new $.Rect(
            minX,
            minY,
            maxX - minX,
            maxY - minY);
    },

    /**
     * Retrieves the smallest horizontal (degrees=0) rectangle which contains
     * this rectangle and has integers x, y, width and height
     * @returns {OpenSeadragon.Rect}
     */
    getIntegerBoundingBox: function() {
        var boundingBox = this.getBoundingBox();
        var x = Math.floor(boundingBox.x);
        var y = Math.floor(boundingBox.y);
        var width = Math.ceil(boundingBox.width + boundingBox.x - x);
        var height = Math.ceil(boundingBox.height + boundingBox.y - y);
        return new $.Rect(x, y, width, height);
    },

    /**
     * Determines whether a point is inside this rectangle (edge included).
     * @function
     * @param {OpenSeadragon.Point} point
     * @param {Number} [epsilon=0] the margin of error allowed
     * @returns {Boolean} true if the point is inside this rectangle, false
     * otherwise.
     */
    containsPoint: function(point, epsilon) {
        epsilon = epsilon || 0;

        // See http://stackoverflow.com/a/2752754/1440403 for explanation
        var topLeft = this.getTopLeft();
        var topRight = this.getTopRight();
        var bottomLeft = this.getBottomLeft();
        var topDiff = topRight.minus(topLeft);
        var leftDiff = bottomLeft.minus(topLeft);

        return ((point.x - topLeft.x) * topDiff.x +
            (point.y - topLeft.y) * topDiff.y >= -epsilon) &&

            ((point.x - topRight.x) * topDiff.x +
            (point.y - topRight.y) * topDiff.y <= epsilon) &&

            ((point.x - topLeft.x) * leftDiff.x +
            (point.y - topLeft.y) * leftDiff.y >= -epsilon) &&

            ((point.x - bottomLeft.x) * leftDiff.x +
            (point.y - bottomLeft.y) * leftDiff.y <= epsilon);
    },

    /**
     * Provides a string representation of the rectangle which is useful for
     * debugging.
     * @function
     * @returns {String} A string representation of the rectangle.
     */
    toString: function() {
        return "[" +
            (Math.round(this.x * 100) / 100) + ", " +
            (Math.round(this.y * 100) / 100) + ", " +
            (Math.round(this.width * 100) / 100) + "x" +
            (Math.round(this.height * 100) / 100) + ", " +
            (Math.round(this.degrees * 100) / 100) + "deg" +
            "]";
    }
};


}(OpenSeadragon));
