/*
 * OpenSeadragon - Overlay
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

(function($) {

    /**
     * An enumeration of positions that an overlay may be assigned relative to
     * the viewport.
     * It is identical to OpenSeadragon.Placement but is kept for backward
     * compatibility.
     * @member OverlayPlacement
     * @memberof OpenSeadragon
     * @static
     * @type {Object}
     * @property {Number} CENTER
     * @property {Number} TOP_LEFT
     * @property {Number} TOP
     * @property {Number} TOP_RIGHT
     * @property {Number} RIGHT
     * @property {Number} BOTTOM_RIGHT
     * @property {Number} BOTTOM
     * @property {Number} BOTTOM_LEFT
     * @property {Number} LEFT
     */
    $.OverlayPlacement = $.Placement;

    /**
     * An enumeration of possible ways to handle overlays rotation
     * @memberOf OpenSeadragon
     * @static
     * @property {Number} NO_ROTATION The overlay ignore the viewport rotation.
     * @property {Number} EXACT The overlay use CSS 3 transforms to rotate with
     * the viewport. If the overlay contains text, it will get rotated as well.
     * @property {Number} BOUNDING_BOX The overlay adjusts for rotation by
     * taking the size of the bounding box of the rotated bounds.
     * Only valid for overlays with Rect location and scalable in both directions.
     */
    $.OverlayRotationMode = {
        NO_ROTATION: 1,
        EXACT: 2,
        BOUNDING_BOX: 3
    };

    /**
     * @class Overlay
     * @classdesc Provides a way to float an HTML element on top of the viewer element.
     *
     * @memberof OpenSeadragon
     * @param {Object} options
     * @param {Element} options.element
     * @param {OpenSeadragon.Point|OpenSeadragon.Rect} options.location - The
     * location of the overlay on the image. If a {@link OpenSeadragon.Point}
     * is specified, the overlay will keep a constant size independently of the
     * zoom. If a {@link OpenSeadragon.Rect} is specified, the overlay size will
     * be adjusted when the zoom changes.
     * @param {OpenSeadragon.Placement} [options.placement=OpenSeadragon.Placement.TOP_LEFT]
     * Relative position to the viewport.
     * Only used if location is a {@link OpenSeadragon.Point}.
     * @param {OpenSeadragon.Overlay.OnDrawCallback} [options.onDraw]
     * @param {Boolean} [options.checkResize=true] Set to false to avoid to
     * check the size of the overlay everytime it is drawn when using a
     * {@link OpenSeadragon.Point} as options.location. It will improve
     * performances but will cause a misalignment if the overlay size changes.
     * @param {Boolean} [options.scaleWidth=true] Whether the width of the
     * overlay should be adjusted when the zoom changes when using a
     * {@link OpenSeadragon.Rect} as options.location
     * @param {Boolean} [options.scaleHeight=true] Whether the height of the
     * overlay should be adjusted when the zoom changes when using a
     * {@link OpenSeadragon.Rect} as options.location
     * @param {Boolean} [options.rotationMode=OpenSeadragon.OverlayRotationMode.EXACT]
     * How to handle the rotation of the viewport.
     */
    $.Overlay = function(element, location, placement) {

        /**
         * onDraw callback signature used by {@link OpenSeadragon.Overlay}.
         *
         * @callback OnDrawCallback
         * @memberof OpenSeadragon.Overlay
         * @param {OpenSeadragon.Point} position
         * @param {OpenSeadragon.Point} size
         * @param {Element} element
         */

        var options;
        if ($.isPlainObject(element)) {
            options = element;
        } else {
            options = {
                element: element,
                location: location,
                placement: placement
            };
        }

        this.element    = options.element;
        this.scales     = options.location instanceof $.Rect;
        this.bounds     = new $.Rect(
            options.location.x,
            options.location.y,
            options.location.width,
            options.location.height);

        // this.position is never read by this class but is kept for backward
        // compatibility
        this.position = this.bounds.getTopLeft();

        // this.size is only used by PointOverlay with options.checkResize === false
        this.size = this.bounds.getSize();

        this.style = options.element.style;

        // rects are always top-left (RectOverlays don't use placement)
        this.placement = options.location instanceof $.Point ?
            options.placement : $.Placement.TOP_LEFT;
        this.onDraw = options.onDraw;
        this.checkResize = options.checkResize === undefined ?
            true : options.checkResize;
        this.scaleWidth = options.scaleWidth === undefined ?
            true : options.scaleWidth;
        this.scaleHeight = options.scaleHeight === undefined ?
            true : options.scaleHeight;
        this.rotationMode = options.rotationMode || $.OverlayRotationMode.EXACT;
    };

    /** @lends OpenSeadragon.Overlay.prototype */
    $.Overlay.prototype = {

        /**
         * Internal function to adjust the position of a point-based overlay
         * depending on it size and anchor.
         * @function
         * @param {OpenSeadragon.Point} position
         * @param {OpenSeadragon.Point} size
         */
        adjust: function(position, size) {
            var properties = $.Placement.properties[this.placement];
            if (!properties) {
                return;
            }
            if (properties.isHorizontallyCentered) {
                position.x -= size.x / 2;
            } else if (properties.isRight) {
                position.x -= size.x;
            }
            if (properties.isVerticallyCentered) {
                position.y -= size.y / 2;
            } else if (properties.isBottom) {
                position.y -= size.y;
            }
        },

        /**
         * @function
         */
        destroy: function() {
            var element = this.element;
            var style = this.style;

            if (element.parentNode) {
                element.parentNode.removeChild(element);
                //this should allow us to preserve overlays when required between
                //pages
                if (element.prevElementParent) {
                    style.display = 'none';
                    //element.prevElementParent.insertBefore(
                    //    element,
                    //    element.prevNextSibling
                    //);
                    document.body.appendChild(element);
                }
            }

            // clear the onDraw callback
            this.onDraw = null;

            style.top = "";
            style.left = "";
            style.position = "";

            if (this.scales) {
                if (this.scaleWidth) {
                    style.width = "";
                }
                if (this.scaleHeight) {
                    style.height = "";
                }
            }
        },

        /**
         * @function
         * @param {Element} container
         */
        drawHTML: function(container, viewport) {
            var element = this.element;
            if (element.parentNode !== container) {
                //save the source parent for later if we need it
                element.prevElementParent = element.parentNode;
                element.prevNextSibling = element.nextSibling;
                container.appendChild(element);
                this.size = $.getElementSize(element);
            }

            var positionAndSize = this.scales ?
                this._getRectOverlayPositionAndSize(viewport) :
                this._getPointOverlayPositionAndSize(viewport);

            var position = this.position = positionAndSize.position;
            var size = this.size = positionAndSize.size;
            var rotate = positionAndSize.rotate;

            position = position.apply(Math.round);
            size = size.apply(Math.round);

            // call the onDraw callback if it exists to allow one to overwrite
            // the drawing/positioning/sizing of the overlay
            if (this.onDraw) {
                this.onDraw(position, size, this.element);
            } else {
                var style = this.style;
                style.left = position.x + "px";
                style.top = position.y + "px";
                if (this.scales) {
                    if (this.scaleWidth) {
                        style.width = size.x + "px";
                    }
                    if (this.scaleHeight) {
                        style.height = size.y + "px";
                    }
                }
                if (rotate) {
                    style.transformOrigin = this._getTransformOrigin();
                    style.transform = "rotate(" + rotate + "deg)";
                } else {
                    style.transformOrigin = "";
                    style.transform = "";
                }
                style.position = "absolute";

                if (style.display !== 'none') {
                    style.display = 'block';
                }
            }
        },

        // private
        _getRectOverlayPositionAndSize: function(viewport) {
            var position = viewport.pixelFromPoint(
                this.bounds.getTopLeft(), true);
            var size = viewport.deltaPixelsFromPointsNoRotate(
                this.bounds.getSize(), true);
            var rotate = 0;
            // BOUNDING_BOX is only valid if both directions get scaled.
            // Get replaced by exact otherwise.
            if (this.rotationMode === $.OverlayRotationMode.BOUNDING_BOX &&
                this.scaleWidth && this.scaleHeight) {
                var boundingBox = new $.Rect(
                    position.x, position.y, size.x, size.y, viewport.degrees)
                    .getBoundingBox();
                position = boundingBox.getTopLeft();
                size = boundingBox.getSize();
            } else if (this.rotationMode !== $.OverlayRotationMode.NO_ROTATION) {
                rotate = viewport.degrees;
            }
            return {
                position: position,
                size: size,
                rotate: rotate
            };
        },

        // private
        _getPointOverlayPositionAndSize: function(viewport) {
            var position = viewport.pixelFromPoint(
                this.bounds.getTopLeft(), true);
            var size = this.checkResize ?
                $.getElementSize(this.element) : this.size;
            this.adjust(position, size);
            // For point overlays, BOUNDING_BOX is invalid and get replaced by EXACT.
            var rotate = this.rotationMode === $.OverlayRotationMode.NO_ROTATION ?
                0 : viewport.degrees;
            return {
                position: position,
                size: size,
                rotate: rotate
            };
        },

        // private
        _getTransformOrigin: function() {
            if (this.scales) {
                return "top left";
            }

            var result = "";
            var properties = $.Placement.properties[this.placement];
            if (!properties) {
                return result;
            }
            if (properties.isLeft) {
                result = "left";
            } else if (properties.isRight) {
                result = "right";
            }
            if (properties.isTop) {
                result += " top";
            } else if (properties.isBottom) {
                result += " bottom";
            }
            return result;
        },

        /**
         * Changes the location and placement of the overlay.
         * @function
         * @param {OpenSeadragon.Point|OpenSeadragon.Rect} location
         * @param {OpenSeadragon.Placement} position
         */
        update: function(location, placement) {
            this.scales = location instanceof $.Rect;
            this.bounds = new $.Rect(
                location.x,
                location.y,
                location.width,
                location.height);
            // rects are always top-left
            this.placement = location instanceof $.Point ?
                placement : $.Placement.TOP_LEFT;
        },

        /**
         * @function
         * @returns {OpenSeadragon.Rect} overlay bounds
         */
        getBounds: function() {
            return this.bounds.clone();
        }
    };

}(OpenSeadragon));
