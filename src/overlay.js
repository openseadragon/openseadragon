/*
 * OpenSeadragon - Overlay
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
     * An enumeration of positions that an overlay may be assigned relative to
     * the viewport.
     * It is identical to OpenSeadragon.Placement but is kept for backward
     * compatibility.
     * @member OverlayPlacement
     * @memberof OpenSeadragon
     * @see OpenSeadragon.Placement
     * @static
     * @readonly
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
     * @member OverlayRotationMode
     * @memberOf OpenSeadragon
     * @static
     * @readonly
     * @property {Number} NO_ROTATION The overlay ignore the viewport rotation.
     * @property {Number} EXACT The overlay use CSS 3 transforms to rotate with
     * the viewport. If the overlay contains text, it will get rotated as well.
     * @property {Number} BOUNDING_BOX The overlay adjusts for rotation by
     * taking the size of the bounding box of the rotated bounds.
     * Only valid for overlays with Rect location and scalable in both directions.
     */
    $.OverlayRotationMode = $.freezeObject({
        NO_ROTATION: 1,
        EXACT: 2,
        BOUNDING_BOX: 3
    });

    /**
     * @class Overlay
     * @classdesc Provides a way to float an HTML element on top of the viewer element.
     *
     * @memberof OpenSeadragon
     * @param {Object} options
     * @param {Element} options.element
     * @param {OpenSeadragon.Point|OpenSeadragon.Rect} options.location - The
     * location of the overlay on the image. If a {@link OpenSeadragon.Point}
     * is specified, the overlay will be located at this location with respect
     * to the placement option. If a {@link OpenSeadragon.Rect} is specified,
     * the overlay will be placed at this location with the corresponding width
     * and height and placement TOP_LEFT.
     * @param {OpenSeadragon.Placement} [options.placement=OpenSeadragon.Placement.TOP_LEFT]
     * Defines what part of the overlay should be at the specified options.location
     * @param {OpenSeadragon.Overlay.OnDrawCallback} [options.onDraw]
     * @param {Boolean} [options.checkResize=true] Set to false to avoid to
     * check the size of the overlay every time it is drawn in the directions
     * which are not scaled. It will improve performances but will cause a
     * misalignment if the overlay size changes.
     * @param {Number} [options.width] The width of the overlay in viewport
     * coordinates. If specified, the width of the overlay will be adjusted when
     * the zoom changes.
     * @param {Number} [options.height] The height of the overlay in viewport
     * coordinates. If specified, the height of the overlay will be adjusted when
     * the zoom changes.
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

        this.elementWrapper = document.createElement('div');
        this.element = options.element;
        this.elementWrapper.appendChild(this.element);

        if (this.element.id) {
            this.elementWrapper.id = "overlay-wrapper-" + this.element.id; // Unique ID if element has one
        }

        // Always add a class for styling & selection
        this.elementWrapper.classList.add("openseadragon-overlay-wrapper");

        this.style = this.elementWrapper.style;
        this._init(options);
    };

    /** @lends OpenSeadragon.Overlay.prototype */
    $.Overlay.prototype = {

        // private
        _init: function(options) {
            this.location = options.location;
            this.placement = options.placement === undefined ?
                $.Placement.TOP_LEFT : options.placement;
            this.onDraw = options.onDraw;
            this.checkResize = options.checkResize === undefined ?
                true : options.checkResize;

            // When this.width is not null, the overlay get scaled horizontally
            this.width = options.width === undefined ? null : options.width;

            // When this.height is not null, the overlay get scaled vertically
            this.height = options.height === undefined ? null : options.height;

            this.rotationMode = options.rotationMode || $.OverlayRotationMode.EXACT;

            // Having a rect as location is a syntactic sugar
            if (this.location instanceof $.Rect) {
                this.width = this.location.width;
                this.height = this.location.height;
                this.location = this.location.getTopLeft();
                this.placement = $.Placement.TOP_LEFT;
            }

            // Deprecated properties kept for backward compatibility.
            this.scales = this.width !== null && this.height !== null;
            this.bounds = new $.Rect(
                this.location.x, this.location.y, this.width, this.height);
            this.position = this.location;
        },

        /**
         * Internal function to adjust the position of an overlay
         * depending on it size and placement.
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
            var element = this.elementWrapper;
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

            if (this.width !== null) {
                style.width = "";
            }
            if (this.height !== null) {
                style.height = "";
            }
            var transformOriginProp = $.getCssPropertyWithVendorPrefix(
                'transformOrigin');
            var transformProp = $.getCssPropertyWithVendorPrefix(
                'transform');
            if (transformOriginProp && transformProp) {
                style[transformOriginProp] = "";
                style[transformProp] = "";
            }
        },

        /**
         * @function
         * @param {Element} container
         */
        drawHTML: function(container, viewport) {
            var element = this.elementWrapper;
            if (element.parentNode !== container) {
                //save the source parent for later if we need it
                element.prevElementParent = element.parentNode;
                element.prevNextSibling = element.nextSibling;
                container.appendChild(element);

                // have to set position before calculating size, fix #1116
                this.style.position = "absolute";
                // this.size is used by overlays which don't get scaled in at
                // least one direction when this.checkResize is set to false.
                this.size = $.getElementSize(this.elementWrapper);
            }
            var positionAndSize = this._getOverlayPositionAndSize(viewport);
            var position = positionAndSize.position;
            var size = this.size = positionAndSize.size;
            var outerScale = "";
            if (viewport.overlayPreserveContentDirection) {
                outerScale = viewport.flipped ? " scaleX(-1)" : " scaleX(1)";
            }
            var rotate = viewport.flipped ? -positionAndSize.rotate : positionAndSize.rotate;
            var scale = viewport.flipped ? " scaleX(-1)" : "";
            // call the onDraw callback if it exists to allow one to overwrite
            // the drawing/positioning/sizing of the overlay
            if (this.onDraw) {
                this.onDraw(position, size, this.element);
            } else {
                var style = this.style;
                var innerStyle = this.element.style;
                innerStyle.display = "block";
                style.left = position.x + "px";
                style.top = position.y + "px";
                if (this.width !== null) {
                    innerStyle.width = size.x + "px";
                }
                if (this.height !== null) {
                    innerStyle.height = size.y + "px";
                }
                var transformOriginProp = $.getCssPropertyWithVendorPrefix(
                    'transformOrigin');
                var transformProp = $.getCssPropertyWithVendorPrefix(
                    'transform');
                if (transformOriginProp && transformProp) {
                    if (rotate && !viewport.flipped) {
                        innerStyle[transformProp] = "";
                        style[transformOriginProp] = this._getTransformOrigin();
                        style[transformProp] = "rotate(" + rotate + "deg)";
                    } else if (!rotate && viewport.flipped) {
                        innerStyle[transformProp] = outerScale;
                        style[transformOriginProp] = this._getTransformOrigin();
                        style[transformProp] = scale;
                    } else if (rotate && viewport.flipped){
                        innerStyle[transformProp] = outerScale;
                        style[transformOriginProp] = this._getTransformOrigin();
                        style[transformProp] = "rotate(" + rotate + "deg)" + scale;
                    } else {
                        innerStyle[transformProp] = "";
                        style[transformOriginProp] = "";
                        style[transformProp] = "";
                    }
                }
                style.display = 'flex';
            }
        },

        // private
        _getOverlayPositionAndSize: function(viewport) {
            var position = viewport.pixelFromPoint(this.location, true);
            var size = this._getSizeInPixels(viewport);
            this.adjust(position, size);

            var rotate = 0;
            if (viewport.getRotation(true) &&
                this.rotationMode !== $.OverlayRotationMode.NO_ROTATION) {
                // BOUNDING_BOX is only valid if both directions get scaled.
                // Get replaced by EXACT otherwise.
                if (this.rotationMode === $.OverlayRotationMode.BOUNDING_BOX &&
                    this.width !== null && this.height !== null) {
                    var rect = new $.Rect(position.x, position.y, size.x, size.y);
                    var boundingBox = this._getBoundingBox(rect, viewport.getRotation(true));
                    position = boundingBox.getTopLeft();
                    size = boundingBox.getSize();
                } else {
                    rotate = viewport.getRotation(true);
                }
            }

            if (viewport.flipped) {
                position.x = (viewport.getContainerSize().x - position.x);
            }
            return {
                position: position,
                size: size,
                rotate: rotate
            };
        },

        // private
        _getSizeInPixels: function(viewport) {
            var width = this.size.x;
            var height = this.size.y;
            if (this.width !== null || this.height !== null) {
                var scaledSize = viewport.deltaPixelsFromPointsNoRotate(
                    new $.Point(this.width || 0, this.height || 0), true);
                if (this.width !== null) {
                    width = scaledSize.x;
                }
                if (this.height !== null) {
                    height = scaledSize.y;
                }
            }
            if (this.checkResize &&
                (this.width === null || this.height === null)) {
                var eltSize = this.size = $.getElementSize(this.elementWrapper);
                if (this.width === null) {
                    width = eltSize.x;
                }
                if (this.height === null) {
                    height = eltSize.y;
                }
            }
            return new $.Point(width, height);
        },

        // private
        _getBoundingBox: function(rect, degrees) {
            var refPoint = this._getPlacementPoint(rect);
            return rect.rotate(degrees, refPoint).getBoundingBox();
        },

        // private
        _getPlacementPoint: function(rect) {
            var result = new $.Point(rect.x, rect.y);
            var properties = $.Placement.properties[this.placement];
            if (properties) {
                if (properties.isHorizontallyCentered) {
                    result.x += rect.width / 2;
                } else if (properties.isRight) {
                    result.x += rect.width;
                }
                if (properties.isVerticallyCentered) {
                    result.y += rect.height / 2;
                } else if (properties.isBottom) {
                    result.y += rect.height;
                }
            }
            return result;
        },

        // private
        _getTransformOrigin: function() {
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
         * Changes the overlay settings.
         * @function
         * @param {OpenSeadragon.Point|OpenSeadragon.Rect|Object} location
         * If an object is specified, the options are the same than the constructor
         * except for the element which can not be changed.
         * @param {OpenSeadragon.Placement} placement
         */
        update: function(location, placement) {
            var options = $.isPlainObject(location) ? location : {
                location: location,
                placement: placement
            };
            this._init({
                location: options.location || this.location,
                placement: options.placement !== undefined ?
                    options.placement : this.placement,
                onDraw: options.onDraw || this.onDraw,
                checkResize: options.checkResize || this.checkResize,
                width: options.width !== undefined ? options.width : this.width,
                height: options.height !== undefined ? options.height : this.height,
                rotationMode: options.rotationMode || this.rotationMode
            });
        },

        /**
         * Returns the current bounds of the overlay in viewport coordinates
         * @function
         * @param {OpenSeadragon.Viewport} viewport the viewport
         * @returns {OpenSeadragon.Rect} overlay bounds
         */
        getBounds: function(viewport) {
            $.console.assert(viewport,
                'A viewport must now be passed to Overlay.getBounds.');
            var width = this.width;
            var height = this.height;
            if (width === null || height === null) {
                var size = viewport.deltaPointsFromPixelsNoRotate(this.size, true);
                if (width === null) {
                    width = size.x;
                }
                if (height === null) {
                    height = size.y;
                }
            }
            var location = this.location.clone();
            this.adjust(location, new $.Point(width, height));
            return this._adjustBoundsForRotation(
                viewport, new $.Rect(location.x, location.y, width, height));
        },

        // private
        _adjustBoundsForRotation: function(viewport, bounds) {
            if (!viewport ||
                viewport.getRotation(true) === 0 ||
                this.rotationMode === $.OverlayRotationMode.EXACT) {
                return bounds;
            }
            if (this.rotationMode === $.OverlayRotationMode.BOUNDING_BOX) {
                // If overlay not fully scalable, BOUNDING_BOX falls back to EXACT
                if (this.width === null || this.height === null) {
                    return bounds;
                }
                // It is easier to just compute the position and size and
                // convert to viewport coordinates.
                var positionAndSize = this._getOverlayPositionAndSize(viewport);
                return viewport.viewerElementToViewportRectangle(new $.Rect(
                    positionAndSize.position.x,
                    positionAndSize.position.y,
                    positionAndSize.size.x,
                    positionAndSize.size.y));
            }

            // NO_ROTATION case
            return bounds.rotate(-viewport.getRotation(true),
                this._getPlacementPoint(bounds));
        }
    };

}(OpenSeadragon));
