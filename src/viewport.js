/*
 * OpenSeadragon - Viewport
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

(function( $ ){


/**
 * @class Viewport
 * @memberof OpenSeadragon
 * @classdesc Handles coordinate-related functionality (zoom, pan, rotation, etc.)
 * for an {@link OpenSeadragon.Viewer}.
 * @param {Object} options - Options for this Viewport.
 * @param {Object} [options.margins] - See viewportMargins in {@link OpenSeadragon.Options}.
 * @param {Number} [options.springStiffness] - See springStiffness in {@link OpenSeadragon.Options}.
 * @param {Number} [options.animationTime] - See animationTime in {@link OpenSeadragon.Options}.
 * @param {Number} [options.minZoomImageRatio] - See minZoomImageRatio in {@link OpenSeadragon.Options}.
 * @param {Number} [options.maxZoomPixelRatio] - See maxZoomPixelRatio in {@link OpenSeadragon.Options}.
 * @param {Number} [options.visibilityRatio] - See visibilityRatio in {@link OpenSeadragon.Options}.
 * @param {Boolean} [options.wrapHorizontal] - See wrapHorizontal in {@link OpenSeadragon.Options}.
 * @param {Boolean} [options.wrapVertical] - See wrapVertical in {@link OpenSeadragon.Options}.
 * @param {Number} [options.defaultZoomLevel] - See defaultZoomLevel in {@link OpenSeadragon.Options}.
 * @param {Number} [options.minZoomLevel] - See minZoomLevel in {@link OpenSeadragon.Options}.
 * @param {Number} [options.maxZoomLevel] - See maxZoomLevel in {@link OpenSeadragon.Options}.
 * @param {Number} [options.degrees] - See degrees in {@link OpenSeadragon.Options}.
 * @param {Boolean} [options.homeFillsViewer] - See homeFillsViewer in {@link OpenSeadragon.Options}.
 * @param {Boolean} [options.silenceMultiImageWarnings] - See silenceMultiImageWarnings in {@link OpenSeadragon.Options}.
 */
$.Viewport = function( options ) {

    //backward compatibility for positional args while preferring more
    //idiomatic javascript options object as the only argument
    var args = arguments;
    if (args.length && args[0] instanceof $.Point) {
        options = {
            containerSize:  args[0],
            contentSize:    args[1],
            config:         args[2]
        };
    }

    //options.config and the general config argument are deprecated
    //in favor of the more direct specification of optional settings
    //being passed directly on the options object
    if ( options.config ){
        $.extend( true, options, options.config );
        delete options.config;
    }

    this._margins = $.extend({
        left: 0,
        top: 0,
        right: 0,
        bottom: 0
    }, options.margins || {});

    delete options.margins;

    options.initialDegrees = options.degrees;
    delete options.degrees;

    $.extend( true, this, {

        //required settings
        containerSize:      null,
        contentSize:        null,

        //internal state properties
        zoomPoint:          null,
        rotationPivot:      null,
        viewer:             null,

        //configurable options
        springStiffness:            $.DEFAULT_SETTINGS.springStiffness,
        animationTime:              $.DEFAULT_SETTINGS.animationTime,
        minZoomImageRatio:          $.DEFAULT_SETTINGS.minZoomImageRatio,
        maxZoomPixelRatio:          $.DEFAULT_SETTINGS.maxZoomPixelRatio,
        visibilityRatio:            $.DEFAULT_SETTINGS.visibilityRatio,
        wrapHorizontal:             $.DEFAULT_SETTINGS.wrapHorizontal,
        wrapVertical:               $.DEFAULT_SETTINGS.wrapVertical,
        defaultZoomLevel:           $.DEFAULT_SETTINGS.defaultZoomLevel,
        minZoomLevel:               $.DEFAULT_SETTINGS.minZoomLevel,
        maxZoomLevel:               $.DEFAULT_SETTINGS.maxZoomLevel,
        initialDegrees:             $.DEFAULT_SETTINGS.degrees,
        flipped:                    $.DEFAULT_SETTINGS.flipped,
        homeFillsViewer:            $.DEFAULT_SETTINGS.homeFillsViewer,
        silenceMultiImageWarnings:  $.DEFAULT_SETTINGS.silenceMultiImageWarnings

    }, options );

    this._updateContainerInnerSize();

    this.centerSpringX = new $.Spring({
        initial: 0,
        springStiffness: this.springStiffness,
        animationTime:   this.animationTime
    });
    this.centerSpringY = new $.Spring({
        initial: 0,
        springStiffness: this.springStiffness,
        animationTime:   this.animationTime
    });
    this.zoomSpring    = new $.Spring({
        exponential: true,
        initial: 1,
        springStiffness: this.springStiffness,
        animationTime:   this.animationTime
    });

    this.degreesSpring = new $.Spring({
        initial: options.initialDegrees,
        springStiffness: this.springStiffness,
        animationTime: this.animationTime
    });

    this._oldCenterX = this.centerSpringX.current.value;
    this._oldCenterY = this.centerSpringY.current.value;
    this._oldZoom    = this.zoomSpring.current.value;
    this._oldDegrees = this.degreesSpring.current.value;

    this._setContentBounds(new $.Rect(0, 0, 1, 1), 1);

    this.goHome(true);
    this.update();
};

/** @lends OpenSeadragon.Viewport.prototype */
$.Viewport.prototype = {

    // deprecated
    get degrees () {
        $.console.warn('Accessing [Viewport.degrees] is deprecated. Use viewport.getRotation instead.');
        return this.getRotation();
    },

    // deprecated
    set degrees (degrees) {
        $.console.warn('Setting [Viewport.degrees] is deprecated. Use viewport.rotateTo, viewport.rotateBy, or viewport.setRotation instead.');
        this.rotateTo(degrees);
    },

    /**
     * Updates the viewport's home bounds and constraints for the given content size.
     * @function
     * @param {OpenSeadragon.Point} contentSize - size of the content in content units
     * @returns {OpenSeadragon.Viewport} Chainable.
     * @fires OpenSeadragon.Viewer.event:reset-size
     */
    resetContentSize: function(contentSize) {
        $.console.assert(contentSize, "[Viewport.resetContentSize] contentSize is required");
        $.console.assert(contentSize instanceof $.Point, "[Viewport.resetContentSize] contentSize must be an OpenSeadragon.Point");
        $.console.assert(contentSize.x > 0, "[Viewport.resetContentSize] contentSize.x must be greater than 0");
        $.console.assert(contentSize.y > 0, "[Viewport.resetContentSize] contentSize.y must be greater than 0");

        this._setContentBounds(new $.Rect(0, 0, 1, contentSize.y / contentSize.x), contentSize.x);
        return this;
    },

    // deprecated
    setHomeBounds: function(bounds, contentFactor) {
        $.console.error("[Viewport.setHomeBounds] this function is deprecated; The content bounds should not be set manually.");
        this._setContentBounds(bounds, contentFactor);
    },

    // Set the viewport's content bounds
    // @param {OpenSeadragon.Rect} bounds - the new bounds in viewport coordinates
    // without rotation
    // @param {Number} contentFactor - how many content units per viewport unit
    // @fires OpenSeadragon.Viewer.event:reset-size
    // @private
    _setContentBounds: function(bounds, contentFactor) {
        $.console.assert(bounds, "[Viewport._setContentBounds] bounds is required");
        $.console.assert(bounds instanceof $.Rect, "[Viewport._setContentBounds] bounds must be an OpenSeadragon.Rect");
        $.console.assert(bounds.width > 0, "[Viewport._setContentBounds] bounds.width must be greater than 0");
        $.console.assert(bounds.height > 0, "[Viewport._setContentBounds] bounds.height must be greater than 0");

        this._contentBoundsNoRotate = bounds.clone();
        this._contentSizeNoRotate = this._contentBoundsNoRotate.getSize().times(
            contentFactor);

        this._contentBounds = bounds.rotate(this.getRotation()).getBoundingBox();
        this._contentSize = this._contentBounds.getSize().times(contentFactor);
        this._contentAspectRatio = this._contentSize.x / this._contentSize.y;

        if (this.viewer) {
            /**
             * Raised when the viewer's content size or home bounds are reset
             * (see {@link OpenSeadragon.Viewport#resetContentSize}).
             *
             * @event reset-size
             * @memberof OpenSeadragon.Viewer
             * @type {object}
             * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised this event.
             * @property {OpenSeadragon.Point} contentSize
             * @property {OpenSeadragon.Rect} contentBounds - Content bounds.
             * @property {OpenSeadragon.Rect} homeBounds - Content bounds.
             * Deprecated use contentBounds instead.
             * @property {Number} contentFactor
             * @property {?Object} userData - Arbitrary subscriber-defined object.
             */
            this.viewer.raiseEvent('reset-size', {
                contentSize: this._contentSizeNoRotate.clone(),
                contentFactor: contentFactor,
                homeBounds: this._contentBoundsNoRotate.clone(),
                contentBounds: this._contentBounds.clone()
            });
        }
    },

    /**
     * Returns the home zoom in "viewport zoom" value.
     * @function
     * @returns {Number} The home zoom in "viewport zoom".
     */
    getHomeZoom: function() {
        if (this.defaultZoomLevel) {
            return this.defaultZoomLevel;
        }

        var aspectFactor = this._contentAspectRatio / this.getAspectRatio();
        var output;
        if (this.homeFillsViewer) { // fill the viewer and clip the image
            output = aspectFactor >= 1 ? aspectFactor : 1;
        } else {
            output = aspectFactor >= 1 ? 1 : aspectFactor;
        }

        return output / this._contentBounds.width;
    },

    /**
     * Returns the home bounds in viewport coordinates.
     * @function
     * @returns {OpenSeadragon.Rect} The home bounds in vewport coordinates.
     */
    getHomeBounds: function() {
        return this.getHomeBoundsNoRotate().rotate(-this.getRotation());
    },

    /**
     * Returns the home bounds in viewport coordinates.
     * This method ignores the viewport rotation. Use
     * {@link OpenSeadragon.Viewport#getHomeBounds} to take it into account.
     * @function
     * @returns {OpenSeadragon.Rect} The home bounds in vewport coordinates.
     */
    getHomeBoundsNoRotate: function() {
        var center = this._contentBounds.getCenter();
        var width  = 1.0 / this.getHomeZoom();
        var height = width / this.getAspectRatio();

        return new $.Rect(
            center.x - (width / 2.0),
            center.y - (height / 2.0),
            width,
            height
        );
    },

    /**
     * @function
     * @param {Boolean} immediately
     * @fires OpenSeadragon.Viewer.event:home
     */
    goHome: function(immediately) {
        if (this.viewer) {
            /**
             * Raised when the "home" operation occurs (see {@link OpenSeadragon.Viewport#goHome}).
             *
             * @event home
             * @memberof OpenSeadragon.Viewer
             * @type {object}
             * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised this event.
             * @property {Boolean} immediately
             * @property {?Object} userData - Arbitrary subscriber-defined object.
             */
            this.viewer.raiseEvent('home', {
                immediately: immediately
            });
        }
        return this.fitBounds(this.getHomeBounds(), immediately);
    },

    /**
     * @function
     */
    getMinZoom: function() {
        var homeZoom = this.getHomeZoom(),
            zoom = this.minZoomLevel ?
            this.minZoomLevel :
                this.minZoomImageRatio * homeZoom;

        return zoom;
    },

    /**
     * @function
     */
    getMaxZoom: function() {
        var zoom = this.maxZoomLevel;
        if (!zoom) {
            zoom = this._contentSize.x * this.maxZoomPixelRatio / this._containerInnerSize.x;
            zoom /= this._contentBounds.width;
        }

        return Math.max( zoom, this.getHomeZoom() );
    },

    /**
     * @function
     */
    getAspectRatio: function() {
        return this._containerInnerSize.x / this._containerInnerSize.y;
    },

    /**
     * @function
     * @returns {OpenSeadragon.Point} The size of the container, in screen coordinates.
     */
    getContainerSize: function() {
        return new $.Point(
            this.containerSize.x,
            this.containerSize.y
        );
    },

    /**
     * The margins push the "home" region in from the sides by the specified amounts.
     * @function
     * @returns {Object} Properties (Numbers, in screen coordinates): left, top, right, bottom.
     */
    getMargins: function() {
        return $.extend({}, this._margins); // Make a copy so we are not returning our original
    },

    /**
     * The margins push the "home" region in from the sides by the specified amounts.
     * @function
     * @param {Object} margins - Properties (Numbers, in screen coordinates): left, top, right, bottom.
     */
    setMargins: function(margins) {
        $.console.assert($.type(margins) === 'object', '[Viewport.setMargins] margins must be an object');

        this._margins = $.extend({
            left: 0,
            top: 0,
            right: 0,
            bottom: 0
        }, margins);

        this._updateContainerInnerSize();
        if (this.viewer) {
            this.viewer.forceRedraw();
        }
    },

    /**
     * Returns the bounds of the visible area in viewport coordinates.
     * @function
     * @param {Boolean} current - Pass true for the current location; defaults to false (target location).
     * @returns {OpenSeadragon.Rect} The location you are zoomed/panned to, in viewport coordinates.
     */
    getBounds: function(current) {
        return this.getBoundsNoRotate(current).rotate(-this.getRotation(current));
    },

    /**
     * Returns the bounds of the visible area in viewport coordinates.
     * This method ignores the viewport rotation. Use
     * {@link OpenSeadragon.Viewport#getBounds} to take it into account.
     * @function
     * @param {Boolean} current - Pass true for the current location; defaults to false (target location).
     * @returns {OpenSeadragon.Rect} The location you are zoomed/panned to, in viewport coordinates.
     */
    getBoundsNoRotate: function(current) {
        var center = this.getCenter(current);
        var width  = 1.0 / this.getZoom(current);
        var height = width / this.getAspectRatio();

        return new $.Rect(
            center.x - (width / 2.0),
            center.y - (height / 2.0),
            width,
            height
        );
    },

    /**
     * @function
     * @param {Boolean} current - Pass true for the current location; defaults to false (target location).
     * @returns {OpenSeadragon.Rect} The location you are zoomed/panned to,
     * including the space taken by margins, in viewport coordinates.
     */
    getBoundsWithMargins: function(current) {
        return this.getBoundsNoRotateWithMargins(current).rotate(
            -this.getRotation(current), this.getCenter(current));
    },

    /**
     * @function
     * @param {Boolean} current - Pass true for the current location; defaults to false (target location).
     * @returns {OpenSeadragon.Rect} The location you are zoomed/panned to,
     * including the space taken by margins, in viewport coordinates.
     */
    getBoundsNoRotateWithMargins: function(current) {
        var bounds = this.getBoundsNoRotate(current);
        var factor = this._containerInnerSize.x * this.getZoom(current);
        bounds.x -= this._margins.left / factor;
        bounds.y -= this._margins.top / factor;
        bounds.width += (this._margins.left + this._margins.right) / factor;
        bounds.height += (this._margins.top + this._margins.bottom) / factor;
        return bounds;
    },

    /**
     * @function
     * @param {Boolean} current - Pass true for the current location; defaults to false (target location).
     */
    getCenter: function( current ) {
        var centerCurrent = new $.Point(
                this.centerSpringX.current.value,
                this.centerSpringY.current.value
            ),
            centerTarget = new $.Point(
                this.centerSpringX.target.value,
                this.centerSpringY.target.value
            ),
            oldZoomPixel,
            zoom,
            width,
            height,
            bounds,
            newZoomPixel,
            deltaZoomPixels,
            deltaZoomPoints;

        if ( current ) {
            return centerCurrent;
        } else if ( !this.zoomPoint ) {
            return centerTarget;
        }

        oldZoomPixel = this.pixelFromPoint(this.zoomPoint, true);

        zoom    = this.getZoom();
        width   = 1.0 / zoom;
        height  = width / this.getAspectRatio();
        bounds  = new $.Rect(
            centerCurrent.x - width / 2.0,
            centerCurrent.y - height / 2.0,
            width,
            height
        );

        newZoomPixel = this._pixelFromPoint(this.zoomPoint, bounds);
        deltaZoomPixels = newZoomPixel.minus( oldZoomPixel ).rotate(-this.getRotation(true));
        deltaZoomPoints = deltaZoomPixels.divide( this._containerInnerSize.x * zoom );

        return centerTarget.plus( deltaZoomPoints );
    },

    /**
     * @function
     * @param {Boolean} current - Pass true for the current location; defaults to false (target location).
     */
    getZoom: function( current ) {
        if ( current ) {
            return this.zoomSpring.current.value;
        } else {
            return this.zoomSpring.target.value;
        }
    },

    // private
    _applyZoomConstraints: function(zoom) {
        return Math.max(
            Math.min(zoom, this.getMaxZoom()),
            this.getMinZoom());
    },

    /**
     * @function
     * @private
     * @param {OpenSeadragon.Rect} bounds
     * @returns {OpenSeadragon.Rect} constrained bounds.
     */
    _applyBoundaryConstraints: function(bounds) {
        var newBounds = this.viewportToViewerElementRectangle(bounds).getBoundingBox();
        var cb = this.viewportToViewerElementRectangle(this._contentBoundsNoRotate).getBoundingBox();

        var xConstrained = false;
        var yConstrained = false;

        if (this.wrapHorizontal) {
            //do nothing
        } else {
            var boundsRight = newBounds.x + newBounds.width;
            var contentRight = cb.x + cb.width;

            var horizontalThreshold, leftDx, rightDx;
            if (newBounds.width > cb.width) {
                horizontalThreshold = this.visibilityRatio * cb.width;
            } else {
                horizontalThreshold = this.visibilityRatio * newBounds.width;
            }

            leftDx = cb.x - boundsRight + horizontalThreshold;
            rightDx = contentRight - newBounds.x - horizontalThreshold;
            if (horizontalThreshold > cb.width) {
                newBounds.x += (leftDx + rightDx) / 2;
                xConstrained = true;
            } else if (rightDx < 0) {
                newBounds.x += rightDx;
                xConstrained = true;
            } else if (leftDx > 0) {
                newBounds.x += leftDx;
                xConstrained = true;
            }

        }

        if (this.wrapVertical) {
            //do nothing
        } else {
            var boundsBottom = newBounds.y + newBounds.height;
            var contentBottom = cb.y + cb.height;

            var verticalThreshold, topDy, bottomDy;
            if (newBounds.height > cb.height) {
                verticalThreshold = this.visibilityRatio * cb.height;
            } else{
                verticalThreshold = this.visibilityRatio * newBounds.height;
            }

            topDy = cb.y - boundsBottom + verticalThreshold;
            bottomDy = contentBottom - newBounds.y - verticalThreshold;
            if (verticalThreshold > cb.height) {
                newBounds.y += (topDy + bottomDy) / 2;
                yConstrained = true;
            } else if (bottomDy < 0) {
                newBounds.y += bottomDy;
                yConstrained = true;
            } else if (topDy > 0) {
                newBounds.y += topDy;
                yConstrained = true;
            }

        }

        var constraintApplied = xConstrained || yConstrained;
        var newViewportBounds = constraintApplied ? this.viewerElementToViewportRectangle(newBounds) : bounds.clone();
        newViewportBounds.xConstrained = xConstrained;
        newViewportBounds.yConstrained = yConstrained;
        newViewportBounds.constraintApplied = constraintApplied;

        return newViewportBounds;
    },

    /**
     * @function
     * @private
     * @param {Boolean} [immediately=false] - whether the function that triggered this event was
     * called with the "immediately" flag
     */
    _raiseConstraintsEvent: function(immediately) {
        if (this.viewer) {
            /**
             * Raised when the viewport constraints are applied (see {@link OpenSeadragon.Viewport#applyConstraints}).
             *
             * @event constrain
             * @memberof OpenSeadragon.Viewer
             * @type {object}
             * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised this event.
             * @property {Boolean} immediately - whether the function that triggered this event was
             * called with the "immediately" flag
             * @property {?Object} userData - Arbitrary subscriber-defined object.
             */
            this.viewer.raiseEvent( 'constrain', {
                immediately: immediately
            });
        }
    },

    /**
     * Enforces the minZoom, maxZoom and visibilityRatio constraints by
     * zooming and panning to the closest acceptable zoom and location.
     * @function
     * @param {Boolean} [immediately=false]
     * @returns {OpenSeadragon.Viewport} Chainable.
     * @fires OpenSeadragon.Viewer.event:constrain if constraints were applied
     */
    applyConstraints: function(immediately) {
        var actualZoom = this.getZoom();
        var constrainedZoom = this._applyZoomConstraints(actualZoom);

        if (actualZoom !== constrainedZoom) {
            this.zoomTo(constrainedZoom, this.zoomPoint, immediately);
        }

        var constrainedBounds = this.getConstrainedBounds(false);

        if(constrainedBounds.constraintApplied){
            this.fitBounds(constrainedBounds, immediately);
            this._raiseConstraintsEvent(immediately);
        }

        return this;
    },

    /**
     * Equivalent to {@link OpenSeadragon.Viewport#applyConstraints}
     * @function
     * @param {Boolean} [immediately=false]
     * @returns {OpenSeadragon.Viewport} Chainable.
     * @fires OpenSeadragon.Viewer.event:constrain
     */
    ensureVisible: function(immediately) {
        return this.applyConstraints(immediately);
    },

    /**
     * @function
     * @private
     * @param {OpenSeadragon.Rect} bounds
     * @param {Object} options (immediately=false, constraints=false)
     * @returns {OpenSeadragon.Viewport} Chainable.
     */
    _fitBounds: function(bounds, options) {
        options = options || {};
        var immediately = options.immediately || false;
        var constraints = options.constraints || false;

        var aspect = this.getAspectRatio();
        var center = bounds.getCenter();

        // Compute width and height of bounding box.
        var newBounds = new $.Rect(
            bounds.x,
            bounds.y,
            bounds.width,
            bounds.height,
            bounds.degrees + this.getRotation())
            .getBoundingBox();

        if (newBounds.getAspectRatio() >= aspect) {
            newBounds.height = newBounds.width / aspect;
        } else {
            newBounds.width = newBounds.height * aspect;
        }

        // Compute x and y from width, height and center position
        newBounds.x = center.x - newBounds.width / 2;
        newBounds.y = center.y - newBounds.height / 2;
        var newZoom = 1.0 / newBounds.width;

        if (immediately) {
            this.panTo(center, true);
            this.zoomTo(newZoom, null, true);
            if(constraints){
                this.applyConstraints(true);
            }
            return this;
        }

        var currentCenter = this.getCenter(true);
        var currentZoom = this.getZoom(true);
        this.panTo(currentCenter, true);
        this.zoomTo(currentZoom, null, true);

        var oldBounds = this.getBounds();
        var oldZoom   = this.getZoom();

        if (oldZoom === 0 || Math.abs(newZoom / oldZoom - 1) < 0.00000001) {
            this.zoomTo(newZoom, null, true);
            this.panTo(center, immediately);
            if(constraints){
                this.applyConstraints(false);
            }
            return this;
        }

        if(constraints){
            this.panTo(center, false);

            newZoom = this._applyZoomConstraints(newZoom);
            this.zoomTo(newZoom, null, false);

            var constrainedBounds = this.getConstrainedBounds();

            this.panTo(currentCenter, true);
            this.zoomTo(currentZoom, null, true);

            this.fitBounds(constrainedBounds);
        } else {
            var rotatedNewBounds = newBounds.rotate(-this.getRotation());
            var referencePoint = rotatedNewBounds.getTopLeft().times(newZoom)
                .minus(oldBounds.getTopLeft().times(oldZoom))
                .divide(newZoom - oldZoom);

            this.zoomTo(newZoom, referencePoint, immediately);
        }
        return this;
    },

    /**
     * Makes the viewport zoom and pan so that the specified bounds take
     * as much space as possible in the viewport.
     * Note: this method ignores the constraints (minZoom, maxZoom and
     * visibilityRatio).
     * Use {@link OpenSeadragon.Viewport#fitBoundsWithConstraints} to enforce
     * them.
     * @function
     * @param {OpenSeadragon.Rect} bounds
     * @param {Boolean} [immediately=false]
     * @returns {OpenSeadragon.Viewport} Chainable.
     */
    fitBounds: function(bounds, immediately) {
        return this._fitBounds(bounds, {
            immediately: immediately,
            constraints: false
        });
    },

    /**
     * Makes the viewport zoom and pan so that the specified bounds take
     * as much space as possible in the viewport while enforcing the constraints
     * (minZoom, maxZoom and visibilityRatio).
     * Note: because this method enforces the constraints, part of the
     * provided bounds may end up outside of the viewport.
     * Use {@link OpenSeadragon.Viewport#fitBounds} to ignore them.
     * @function
     * @param {OpenSeadragon.Rect} bounds
     * @param {Boolean} [immediately=false]
     * @returns {OpenSeadragon.Viewport} Chainable.
     */
    fitBoundsWithConstraints: function(bounds, immediately) {
        return this._fitBounds(bounds, {
            immediately: immediately,
            constraints: true
        });
    },

    /**
     * Zooms so the image just fills the viewer vertically.
     * @param {Boolean} immediately
     * @returns {OpenSeadragon.Viewport} Chainable.
     */
    fitVertically: function(immediately) {
        var box = new $.Rect(
            this._contentBounds.x + (this._contentBounds.width / 2),
            this._contentBounds.y,
            0,
            this._contentBounds.height);
        return this.fitBounds(box, immediately);
    },

    /**
     * Zooms so the image just fills the viewer horizontally.
     * @param {Boolean} immediately
     * @returns {OpenSeadragon.Viewport} Chainable.
     */
    fitHorizontally: function(immediately) {
        var box = new $.Rect(
            this._contentBounds.x,
            this._contentBounds.y + (this._contentBounds.height / 2),
            this._contentBounds.width,
            0);
        return this.fitBounds(box, immediately);
    },


    /**
     * Returns bounds taking constraints into account
     * Added to improve constrained panning
     * @param {Boolean} current - Pass true for the current location; defaults to false (target location).
     * @returns {OpenSeadragon.Rect} The bounds in viewport coordinates after applying constraints. The returned $.Rect
     *                               contains additional properties constraintsApplied, xConstrained and yConstrained.
     *                               These flags indicate whether the viewport bounds were modified by the constraints
     *                               of the viewer rectangle, and in which dimension(s).
     */
    getConstrainedBounds: function(current) {
        var bounds,
            constrainedBounds;

        bounds = this.getBounds(current);

        constrainedBounds = this._applyBoundaryConstraints(bounds);

        return constrainedBounds;
    },

    /**
     * @function
     * @param {OpenSeadragon.Point} delta
     * @param {Boolean} immediately
     * @returns {OpenSeadragon.Viewport} Chainable.
     * @fires OpenSeadragon.Viewer.event:pan
     */
    panBy: function( delta, immediately ) {
        var center = new $.Point();
        if (immediately) {
            center.x = this.centerSpringX.current.value;
            center.y = this.centerSpringY.current.value;
        } else {
            center.x = this.centerSpringX.target.value;
            center.y = this.centerSpringY.target.value;
        }
        return this.panTo( center.plus( delta ), immediately );
    },

    /**
     * @function
     * @param {OpenSeadragon.Point} center
     * @param {Boolean} immediately
     * @returns {OpenSeadragon.Viewport} Chainable.
     * @fires OpenSeadragon.Viewer.event:pan
     */
    panTo: function( center, immediately ) {
        if ( immediately ) {
            this.centerSpringX.resetTo( center.x );
            this.centerSpringY.resetTo( center.y );
        } else {
            this.centerSpringX.springTo( center.x );
            this.centerSpringY.springTo( center.y );
        }

        if( this.viewer ){
            /**
             * Raised when the viewport is panned (see {@link OpenSeadragon.Viewport#panBy} and {@link OpenSeadragon.Viewport#panTo}).
             *
             * @event pan
             * @memberof OpenSeadragon.Viewer
             * @type {object}
             * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised this event.
             * @property {OpenSeadragon.Point} center
             * @property {Boolean} immediately
             * @property {?Object} userData - Arbitrary subscriber-defined object.
             */
            this.viewer.raiseEvent( 'pan', {
                center: center,
                immediately: immediately
            });
        }

        return this;
    },

    /**
     * @function
     * @returns {OpenSeadragon.Viewport} Chainable.
     * @fires OpenSeadragon.Viewer.event:zoom
     */
    zoomBy: function(factor, refPoint, immediately) {
        return this.zoomTo(
            this.zoomSpring.target.value * factor, refPoint, immediately);
    },

    /**
     * Zooms to the specified zoom level
     * @function
     * @param {Number} zoom The zoom level to zoom to.
     * @param {OpenSeadragon.Point} [refPoint] The point which will stay at
     * the same screen location. Defaults to the viewport center.
     * @param {Boolean} [immediately=false]
     * @returns {OpenSeadragon.Viewport} Chainable.
     * @fires OpenSeadragon.Viewer.event:zoom
     */
    zoomTo: function(zoom, refPoint, immediately) {
        var _this = this;

        this.zoomPoint = refPoint instanceof $.Point &&
            !isNaN(refPoint.x) &&
            !isNaN(refPoint.y) ?
            refPoint :
            null;

        if (immediately) {
            this._adjustCenterSpringsForZoomPoint(function() {
                _this.zoomSpring.resetTo(zoom);
            });
        } else {
            this.zoomSpring.springTo(zoom);
        }

        if (this.viewer) {
            /**
             * Raised when the viewport zoom level changes (see {@link OpenSeadragon.Viewport#zoomBy} and {@link OpenSeadragon.Viewport#zoomTo}).
             *
             * @event zoom
             * @memberof OpenSeadragon.Viewer
             * @type {object}
             * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised this event.
             * @property {Number} zoom
             * @property {OpenSeadragon.Point} refPoint
             * @property {Boolean} immediately
             * @property {?Object} userData - Arbitrary subscriber-defined object.
             */
            this.viewer.raiseEvent('zoom', {
                zoom: zoom,
                refPoint: refPoint,
                immediately: immediately
            });
        }

        return this;
    },

    /**
     * Rotates this viewport to the angle specified.
     * @function
     * @param {Number} degrees The degrees to set the rotation to.
     * @param {Boolean} [immediately=false] Whether to animate to the new angle
     * or rotate immediately.
     * * @returns {OpenSeadragon.Viewport} Chainable.
     */
    setRotation: function(degrees, immediately) {
        return this.rotateTo(degrees, null, immediately);
    },

    /**
     * Gets the current rotation in degrees.
     * @function
     * @param {Boolean} [current=false] True for current rotation, false for target.
     * @returns {Number} The current rotation in degrees.
     */
    getRotation: function(current) {
        return current ?
            this.degreesSpring.current.value :
            this.degreesSpring.target.value;
    },

    /**
     * Rotates this viewport to the angle specified around a pivot point. Alias for rotateTo.
     * @function
     * @param {Number} degrees The degrees to set the rotation to.
     * @param {OpenSeadragon.Point} [pivot] (Optional) point in viewport coordinates
     * around which the rotation should be performed. Defaults to the center of the viewport.
     * @param {Boolean} [immediately=false] Whether to animate to the new angle
     * or rotate immediately.
     * * @returns {OpenSeadragon.Viewport} Chainable.
     */
    setRotationWithPivot: function(degrees, pivot, immediately) {
        return this.rotateTo(degrees, pivot, immediately);
    },

    /**
     * Rotates this viewport to the angle specified.
     * @function
     * @param {Number} degrees The degrees to set the rotation to.
     * @param {OpenSeadragon.Point} [pivot] (Optional) point in viewport coordinates
     * around which the rotation should be performed. Defaults to the center of the viewport.
     * @param {Boolean} [immediately=false] Whether to animate to the new angle
     * or rotate immediately.
     * @returns {OpenSeadragon.Viewport} Chainable.
     */
    rotateTo: function(degrees, pivot, immediately){
        if (!this.viewer || !this.viewer.drawer.canRotate()) {
            return this;
        }

        if (this.degreesSpring.target.value === degrees &&
            this.degreesSpring.isAtTargetValue()) {
            return this;
        }
        this.rotationPivot = pivot instanceof $.Point &&
            !isNaN(pivot.x) &&
            !isNaN(pivot.y) ?
            pivot :
            null;
        if (immediately) {
            if(this.rotationPivot){
                var changeInDegrees = degrees - this._oldDegrees;
                if(!changeInDegrees){
                    this.rotationPivot = null;
                    return this;
                }
                this._rotateAboutPivot(degrees);
            } else{
                this.degreesSpring.resetTo(degrees);
            }
        } else {
            var normalizedFrom = $.positiveModulo(this.degreesSpring.current.value, 360);
            var normalizedTo = $.positiveModulo(degrees, 360);
            var diff = normalizedTo - normalizedFrom;
            if (diff > 180) {
                normalizedTo -= 360;
            } else if (diff < -180) {
                normalizedTo += 360;
            }

            var reverseDiff = normalizedFrom - normalizedTo;
            this.degreesSpring.resetTo(degrees + reverseDiff);
            this.degreesSpring.springTo(degrees);
        }

        this._setContentBounds(
            this.viewer.world.getHomeBounds(),
            this.viewer.world.getContentFactor());
        this.viewer.forceRedraw();

        /**
         * Raised when rotation has been changed.
         *
         * @event rotate
         * @memberof OpenSeadragon.Viewer
         * @type {object}
         * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
         * @property {Number} degrees - The number of degrees the rotation was set to.
         * @property {Boolean} immediately - Whether the rotation happened immediately or was animated
         * @property {OpenSeadragon.Point} pivot - The point in viewport coordinates around which the rotation (if any) happened
         * @property {?Object} userData - Arbitrary subscriber-defined object.
         */
        this.viewer.raiseEvent('rotate', {degrees: degrees, immediately: !!immediately, pivot: this.rotationPivot || this.getCenter()});
        return this;
    },

    /**
     * Rotates this viewport by the angle specified.
     * @function
     * @param {Number} degrees The degrees by which to rotate the viewport.
     * @param {OpenSeadragon.Point} [pivot] (Optional) point in viewport coordinates
     * around which the rotation should be performed. Defaults to the center of the viewport.
     * * @param {Boolean} [immediately=false] Whether to animate to the new angle
     * or rotate immediately.
     * @returns {OpenSeadragon.Viewport} Chainable.
     */
    rotateBy: function(degrees, pivot, immediately){
        return this.rotateTo(this.degreesSpring.target.value + degrees, pivot, immediately);
    },

    /**
     * @function
     * @returns {OpenSeadragon.Viewport} Chainable.
     * @fires OpenSeadragon.Viewer.event:resize
     */
    resize: function( newContainerSize, maintain ) {
        var oldBounds = this.getBoundsNoRotate(),
            newBounds = oldBounds,
            widthDeltaFactor;

        this.containerSize.x = newContainerSize.x;
        this.containerSize.y = newContainerSize.y;

        this._updateContainerInnerSize();

        if ( maintain ) {
            // TODO: widthDeltaFactor will always be 1; probably not what's intended
            widthDeltaFactor = newContainerSize.x / this.containerSize.x;
            newBounds.width  = oldBounds.width * widthDeltaFactor;
            newBounds.height = newBounds.width / this.getAspectRatio();
        }

        if( this.viewer ){
            /**
             * Raised when a viewer resize operation is initiated (see {@link OpenSeadragon.Viewport#resize}).
             * This event happens before the viewport bounds have been updated.
             * See also {@link OpenSeadragon.Viewer#after-resize} which reflects
             * the new viewport bounds following the resize action.
             *
             * @event resize
             * @memberof OpenSeadragon.Viewer
             * @type {object}
             * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised this event.
             * @property {OpenSeadragon.Point} newContainerSize
             * @property {Boolean} maintain
             * @property {?Object} userData - Arbitrary subscriber-defined object.
             */
            this.viewer.raiseEvent( 'resize', {
                newContainerSize: newContainerSize,
                maintain: maintain
            });
        }

        var output = this.fitBounds( newBounds, true );

        if( this.viewer ){
            /**
             * Raised after the viewer is resized (see {@link OpenSeadragon.Viewport#resize}).
             * See also {@link OpenSeadragon.Viewer#resize} event which happens
             * before the new bounds have been calculated and applied.
             *
             * @event after-resize
             * @memberof OpenSeadragon.Viewer
             * @type {object}
             * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised this event.
             * @property {OpenSeadragon.Point} newContainerSize
             * @property {Boolean} maintain
             * @property {?Object} userData - Arbitrary subscriber-defined object.
             */
            this.viewer.raiseEvent( 'after-resize', {
                newContainerSize: newContainerSize,
                maintain: maintain
            });
        }

        return output;
    },

    // private
    _updateContainerInnerSize: function() {
        this._containerInnerSize = new $.Point(
            Math.max(1, this.containerSize.x - (this._margins.left + this._margins.right)),
            Math.max(1, this.containerSize.y - (this._margins.top + this._margins.bottom))
        );
    },

    /**
     * Update the zoom, degrees, and center (X and Y) springs.
     * @function
     * @returns {Boolean} True if the viewport is still animating, false otherwise.
     */
    update: function() {
        var _this = this;
        this._adjustCenterSpringsForZoomPoint(function() {
            _this.zoomSpring.update();
        });
        if(this.degreesSpring.isAtTargetValue()){
            this.rotationPivot = null;
        }
        this.centerSpringX.update();
        this.centerSpringY.update();

        if(this.rotationPivot){
            this._rotateAboutPivot(true);
        }
        else{
            this.degreesSpring.update();
        }


        var changed = this.centerSpringX.current.value !== this._oldCenterX ||
            this.centerSpringY.current.value !== this._oldCenterY ||
            this.zoomSpring.current.value !== this._oldZoom ||
            this.degreesSpring.current.value !== this._oldDegrees;


        this._oldCenterX = this.centerSpringX.current.value;
        this._oldCenterY = this.centerSpringY.current.value;
        this._oldZoom    = this.zoomSpring.current.value;
        this._oldDegrees = this.degreesSpring.current.value;

        var isAnimating = changed ||
                          !this.zoomSpring.isAtTargetValue() ||
                          !this.centerSpringX.isAtTargetValue() ||
                          !this.centerSpringY.isAtTargetValue() ||
                          !this.degreesSpring.isAtTargetValue();

        return isAnimating;
    },

    // private - pass true to use spring, or a number for degrees for immediate rotation
    _rotateAboutPivot: function(degreesOrUseSpring){
        var useSpring = degreesOrUseSpring === true;

        var delta = this.rotationPivot.minus(this.getCenter());
        this.centerSpringX.shiftBy(delta.x);
        this.centerSpringY.shiftBy(delta.y);

        if(useSpring){
            this.degreesSpring.update();
        } else {
            this.degreesSpring.resetTo(degreesOrUseSpring);
        }

        var changeInDegrees = this.degreesSpring.current.value - this._oldDegrees;
        var rdelta = delta.rotate(changeInDegrees * -1).times(-1);
        this.centerSpringX.shiftBy(rdelta.x);
        this.centerSpringY.shiftBy(rdelta.y);
    },

    // private
    _adjustCenterSpringsForZoomPoint: function(zoomSpringHandler) {
        if (this.zoomPoint) {
            var oldZoomPixel = this.pixelFromPoint(this.zoomPoint, true);
            zoomSpringHandler();
            var newZoomPixel = this.pixelFromPoint(this.zoomPoint, true);

            var deltaZoomPixels = newZoomPixel.minus(oldZoomPixel);
            var deltaZoomPoints = this.deltaPointsFromPixels(
                deltaZoomPixels, true);

            this.centerSpringX.shiftBy(deltaZoomPoints.x);
            this.centerSpringY.shiftBy(deltaZoomPoints.y);

            if (this.zoomSpring.isAtTargetValue()) {
                this.zoomPoint = null;
            }
        } else {
            zoomSpringHandler();
        }
    },

    /**
     * Convert a delta (translation vector) from viewport coordinates to pixels
     * coordinates. This method does not take rotation into account.
     * Consider using deltaPixelsFromPoints if you need to account for rotation.
     * @param {OpenSeadragon.Point} deltaPoints - The translation vector to convert.
     * @param {Boolean} [current=false] - Pass true for the current location;
     * defaults to false (target location).
     * @returns {OpenSeadragon.Point}
     */
    deltaPixelsFromPointsNoRotate: function(deltaPoints, current) {
        return deltaPoints.times(
            this._containerInnerSize.x * this.getZoom(current)
        );
    },

    /**
     * Convert a delta (translation vector) from viewport coordinates to pixels
     * coordinates.
     * @param {OpenSeadragon.Point} deltaPoints - The translation vector to convert.
     * @param {Boolean} [current=false] - Pass true for the current location;
     * defaults to false (target location).
     * @returns {OpenSeadragon.Point}
     */
    deltaPixelsFromPoints: function(deltaPoints, current) {
        return this.deltaPixelsFromPointsNoRotate(
            deltaPoints.rotate(this.getRotation(current)),
            current);
    },

    /**
     * Convert a delta (translation vector) from pixels coordinates to viewport
     * coordinates. This method does not take rotation into account.
     * Consider using deltaPointsFromPixels if you need to account for rotation.
     * @param {OpenSeadragon.Point} deltaPixels - The translation vector to convert.
     * @param {Boolean} [current=false] - Pass true for the current location;
     * defaults to false (target location).
     * @returns {OpenSeadragon.Point}
     */
    deltaPointsFromPixelsNoRotate: function(deltaPixels, current) {
        return deltaPixels.divide(
            this._containerInnerSize.x * this.getZoom(current)
        );
    },

    /**
     * Convert a delta (translation vector) from pixels coordinates to viewport
     * coordinates.
     * @param {OpenSeadragon.Point} deltaPixels - The translation vector to convert.
     * @param {Boolean} [current=false] - Pass true for the current location;
     * defaults to false (target location).
     * @returns {OpenSeadragon.Point}
     */
    deltaPointsFromPixels: function(deltaPixels, current) {
        return this.deltaPointsFromPixelsNoRotate(deltaPixels, current)
            .rotate(-this.getRotation(current));
    },

    /**
     * Convert viewport coordinates to pixels coordinates.
     * This method does not take rotation into account.
     * Consider using pixelFromPoint if you need to account for rotation.
     * @param {OpenSeadragon.Point} point the viewport coordinates
     * @param {Boolean} [current=false] - Pass true for the current location;
     * defaults to false (target location).
     * @returns {OpenSeadragon.Point}
     */
    pixelFromPointNoRotate: function(point, current) {
        return this._pixelFromPointNoRotate(
            point, this.getBoundsNoRotate(current));
    },

    /**
     * Convert viewport coordinates to pixel coordinates.
     * @param {OpenSeadragon.Point} point the viewport coordinates
     * @param {Boolean} [current=false] - Pass true for the current location;
     * defaults to false (target location).
     * @returns {OpenSeadragon.Point}
     */
    pixelFromPoint: function(point, current) {
        return this._pixelFromPoint(point, this.getBoundsNoRotate(current));
    },

    // private
    _pixelFromPointNoRotate: function(point, bounds) {
        return point.minus(
            bounds.getTopLeft()
        ).times(
            this._containerInnerSize.x / bounds.width
        ).plus(
            new $.Point(this._margins.left, this._margins.top)
        );
    },

    // private
    _pixelFromPoint: function(point, bounds) {
        return this._pixelFromPointNoRotate(
            point.rotate(this.getRotation(true), this.getCenter(true)),
            bounds);
    },

    /**
     * Convert pixel coordinates to viewport coordinates.
     * This method does not take rotation into account.
     * Consider using pointFromPixel if you need to account for rotation.
     * @param {OpenSeadragon.Point} pixel Pixel coordinates
     * @param {Boolean} [current=false] - Pass true for the current location;
     * defaults to false (target location).
     * @returns {OpenSeadragon.Point}
     */
    pointFromPixelNoRotate: function(pixel, current) {
        var bounds = this.getBoundsNoRotate(current);
        return pixel.minus(
            new $.Point(this._margins.left, this._margins.top)
        ).divide(
            this._containerInnerSize.x / bounds.width
        ).plus(
            bounds.getTopLeft()
        );
    },

    /**
     * Convert pixel coordinates to viewport coordinates.
     * @param {OpenSeadragon.Point} pixel Pixel coordinates
     * @param {Boolean} [current=false] - Pass true for the current location;
     * defaults to false (target location).
     * @returns {OpenSeadragon.Point}
     */
    pointFromPixel: function(pixel, current) {
        return this.pointFromPixelNoRotate(pixel, current).rotate(
            -this.getRotation(current),
            this.getCenter(current)
        );
    },

    // private
    _viewportToImageDelta: function( viewerX, viewerY ) {
        var scale = this._contentBoundsNoRotate.width;
        return new $.Point(
            viewerX * this._contentSizeNoRotate.x / scale,
            viewerY * this._contentSizeNoRotate.x / scale);
    },

    /**
     * Translates from OpenSeadragon viewer coordinate system to image coordinate system.
     * This method can be called either by passing X,Y coordinates or an
     * OpenSeadragon.Point
     * Note: not accurate with multi-image; use TiledImage.viewportToImageCoordinates instead.
     * @function
     * @param {(OpenSeadragon.Point|Number)} viewerX either a point or the X
     * coordinate in viewport coordinate system.
     * @param {Number} [viewerY] Y coordinate in viewport coordinate system.
     * @returns {OpenSeadragon.Point} a point representing the coordinates in the image.
     */
    viewportToImageCoordinates: function(viewerX, viewerY) {
        if (viewerX instanceof $.Point) {
            //they passed a point instead of individual components
            return this.viewportToImageCoordinates(viewerX.x, viewerX.y);
        }

        if (this.viewer) {
            var count = this.viewer.world.getItemCount();
            if (count > 1) {
                if (!this.silenceMultiImageWarnings) {
                    $.console.error('[Viewport.viewportToImageCoordinates] is not accurate ' +
                        'with multi-image; use TiledImage.viewportToImageCoordinates instead.');
                }
            } else if (count === 1) {
                // It is better to use TiledImage.viewportToImageCoordinates
                // because this._contentBoundsNoRotate can not be relied on
                // with clipping.
                var item = this.viewer.world.getItemAt(0);
                return item.viewportToImageCoordinates(viewerX, viewerY, true);
            }
        }

        return this._viewportToImageDelta(
            viewerX - this._contentBoundsNoRotate.x,
            viewerY - this._contentBoundsNoRotate.y);
    },

    // private
    _imageToViewportDelta: function( imageX, imageY ) {
        var scale = this._contentBoundsNoRotate.width;
        return new $.Point(
            imageX / this._contentSizeNoRotate.x * scale,
            imageY / this._contentSizeNoRotate.x * scale);
    },

    /**
     * Translates from image coordinate system to OpenSeadragon viewer coordinate system
     * This method can be called either by passing X,Y coordinates or an
     * OpenSeadragon.Point
     * Note: not accurate with multi-image; use TiledImage.imageToViewportCoordinates instead.
     * @function
     * @param {(OpenSeadragon.Point | Number)} imageX the point or the
     * X coordinate in image coordinate system.
     * @param {Number} [imageY] Y coordinate in image coordinate system.
     * @returns {OpenSeadragon.Point} a point representing the coordinates in the viewport.
     */
    imageToViewportCoordinates: function(imageX, imageY) {
        if (imageX instanceof $.Point) {
            //they passed a point instead of individual components
            return this.imageToViewportCoordinates(imageX.x, imageX.y);
        }

        if (this.viewer) {
            var count = this.viewer.world.getItemCount();
            if (count > 1) {
                if (!this.silenceMultiImageWarnings) {
                    $.console.error('[Viewport.imageToViewportCoordinates] is not accurate ' +
                        'with multi-image; use TiledImage.imageToViewportCoordinates instead.');
                }
            } else if (count === 1) {
                // It is better to use TiledImage.viewportToImageCoordinates
                // because this._contentBoundsNoRotate can not be relied on
                // with clipping.
                var item = this.viewer.world.getItemAt(0);
                return item.imageToViewportCoordinates(imageX, imageY, true);
            }
        }

        var point = this._imageToViewportDelta(imageX, imageY);
        point.x += this._contentBoundsNoRotate.x;
        point.y += this._contentBoundsNoRotate.y;
        return point;
    },

    /**
     * Translates from a rectangle which describes a portion of the image in
     * pixel coordinates to OpenSeadragon viewport rectangle coordinates.
     * This method can be called either by passing X,Y,width,height or an
     * OpenSeadragon.Rect
     * Note: not accurate with multi-image; use TiledImage.imageToViewportRectangle instead.
     * @function
     * @param {(OpenSeadragon.Rect | Number)} imageX the rectangle or the X
     * coordinate of the top left corner of the rectangle in image coordinate system.
     * @param {Number} [imageY] the Y coordinate of the top left corner of the rectangle
     * in image coordinate system.
     * @param {Number} [pixelWidth] the width in pixel of the rectangle.
     * @param {Number} [pixelHeight] the height in pixel of the rectangle.
     * @returns {OpenSeadragon.Rect} This image's bounds in viewport coordinates
     */
    imageToViewportRectangle: function(imageX, imageY, pixelWidth, pixelHeight) {
        var rect = imageX;
        if (!(rect instanceof $.Rect)) {
            //they passed individual components instead of a rectangle
            rect = new $.Rect(imageX, imageY, pixelWidth, pixelHeight);
        }

        if (this.viewer) {
            var count = this.viewer.world.getItemCount();
            if (count > 1) {
                if (!this.silenceMultiImageWarnings) {
                    $.console.error('[Viewport.imageToViewportRectangle] is not accurate ' +
                       'with multi-image; use TiledImage.imageToViewportRectangle instead.');
                }
            } else if (count === 1) {
                // It is better to use TiledImage.imageToViewportRectangle
                // because this._contentBoundsNoRotate can not be relied on
                // with clipping.
                var item = this.viewer.world.getItemAt(0);
                return item.imageToViewportRectangle(
                    imageX, imageY, pixelWidth, pixelHeight, true);
            }
        }

        var coordA = this.imageToViewportCoordinates(rect.x, rect.y);
        var coordB = this._imageToViewportDelta(rect.width, rect.height);
        return new $.Rect(
            coordA.x,
            coordA.y,
            coordB.x,
            coordB.y,
            rect.degrees
        );
    },

    /**
     * Translates from a rectangle which describes a portion of
     * the viewport in point coordinates to image rectangle coordinates.
     * This method can be called either by passing X,Y,width,height or an
     * OpenSeadragon.Rect
     * Note: not accurate with multi-image; use TiledImage.viewportToImageRectangle instead.
     * @function
     * @param {(OpenSeadragon.Rect | Number)} viewerX either a rectangle or
     * the X coordinate of the top left corner of the rectangle in viewport
     * coordinate system.
     * @param {Number} [viewerY] the Y coordinate of the top left corner of the rectangle
     * in viewport coordinate system.
     * @param {Number} [pointWidth] the width of the rectangle in viewport coordinate system.
     * @param {Number} [pointHeight] the height of the rectangle in viewport coordinate system.
     */
    viewportToImageRectangle: function(viewerX, viewerY, pointWidth, pointHeight) {
        var rect = viewerX;
        if (!(rect instanceof $.Rect)) {
            //they passed individual components instead of a rectangle
            rect = new $.Rect(viewerX, viewerY, pointWidth, pointHeight);
        }

        if (this.viewer) {
            var count = this.viewer.world.getItemCount();
            if (count > 1) {
                if (!this.silenceMultiImageWarnings) {
                    $.console.error('[Viewport.viewportToImageRectangle] is not accurate ' +
                        'with multi-image; use TiledImage.viewportToImageRectangle instead.');
                }
            } else if (count === 1) {
                // It is better to use TiledImage.viewportToImageCoordinates
                // because this._contentBoundsNoRotate can not be relied on
                // with clipping.
                var item = this.viewer.world.getItemAt(0);
                return item.viewportToImageRectangle(
                    viewerX, viewerY, pointWidth, pointHeight, true);
            }
        }

        var coordA = this.viewportToImageCoordinates(rect.x, rect.y);
        var coordB = this._viewportToImageDelta(rect.width, rect.height);
        return new $.Rect(
            coordA.x,
            coordA.y,
            coordB.x,
            coordB.y,
            rect.degrees
        );
    },

    /**
     * Convert pixel coordinates relative to the viewer element to image
     * coordinates.
     * Note: not accurate with multi-image.
     * @param {OpenSeadragon.Point} pixel
     * @returns {OpenSeadragon.Point}
     */
    viewerElementToImageCoordinates: function( pixel ) {
        var point = this.pointFromPixel( pixel, true );
        return this.viewportToImageCoordinates( point );
    },

    /**
     * Convert pixel coordinates relative to the image to
     * viewer element coordinates.
     * Note: not accurate with multi-image.
     * @param {OpenSeadragon.Point} pixel
     * @returns {OpenSeadragon.Point}
     */
    imageToViewerElementCoordinates: function( pixel ) {
        var point = this.imageToViewportCoordinates( pixel );
        return this.pixelFromPoint( point, true );
    },

    /**
     * Convert pixel coordinates relative to the window to image coordinates.
     * Note: not accurate with multi-image.
     * @param {OpenSeadragon.Point} pixel
     * @returns {OpenSeadragon.Point}
     */
    windowToImageCoordinates: function(pixel) {
        $.console.assert(this.viewer,
            "[Viewport.windowToImageCoordinates] the viewport must have a viewer.");
        var viewerCoordinates = pixel.minus(
                $.getElementPosition(this.viewer.element));
        return this.viewerElementToImageCoordinates(viewerCoordinates);
    },

    /**
     * Convert image coordinates to pixel coordinates relative to the window.
     * Note: not accurate with multi-image.
     * @param {OpenSeadragon.Point} pixel
     * @returns {OpenSeadragon.Point}
     */
    imageToWindowCoordinates: function(pixel) {
        $.console.assert(this.viewer,
            "[Viewport.imageToWindowCoordinates] the viewport must have a viewer.");
        var viewerCoordinates = this.imageToViewerElementCoordinates(pixel);
        return viewerCoordinates.plus(
                $.getElementPosition(this.viewer.element));
    },

    /**
     * Convert pixel coordinates relative to the viewer element to viewport
     * coordinates.
     * @param {OpenSeadragon.Point} pixel
     * @returns {OpenSeadragon.Point}
     */
    viewerElementToViewportCoordinates: function( pixel ) {
        return this.pointFromPixel( pixel, true );
    },

    /**
     * Convert viewport coordinates to pixel coordinates relative to the
     * viewer element.
     * @param {OpenSeadragon.Point} point
     * @returns {OpenSeadragon.Point}
     */
    viewportToViewerElementCoordinates: function( point ) {
        return this.pixelFromPoint( point, true );
    },

    /**
     * Convert a rectangle in pixel coordinates relative to the viewer element
     * to viewport coordinates.
     * @param {OpenSeadragon.Rect} rectangle the rectangle to convert
     * @returns {OpenSeadragon.Rect} the converted rectangle
     */
    viewerElementToViewportRectangle: function(rectangle) {
        return $.Rect.fromSummits(
            this.pointFromPixel(rectangle.getTopLeft(), true),
            this.pointFromPixel(rectangle.getTopRight(), true),
            this.pointFromPixel(rectangle.getBottomLeft(), true)
        );
    },

    /**
     * Convert a rectangle in viewport coordinates to pixel coordinates relative
     * to the viewer element.
     * @param {OpenSeadragon.Rect} rectangle the rectangle to convert
     * @returns {OpenSeadragon.Rect} the converted rectangle
     */
    viewportToViewerElementRectangle: function(rectangle) {
        return $.Rect.fromSummits(
            this.pixelFromPoint(rectangle.getTopLeft(), true),
            this.pixelFromPoint(rectangle.getTopRight(), true),
            this.pixelFromPoint(rectangle.getBottomLeft(), true)
        );
    },

    /**
     * Convert pixel coordinates relative to the window to viewport coordinates.
     * @param {OpenSeadragon.Point} pixel
     * @returns {OpenSeadragon.Point}
     */
    windowToViewportCoordinates: function(pixel) {
        $.console.assert(this.viewer,
            "[Viewport.windowToViewportCoordinates] the viewport must have a viewer.");
        var viewerCoordinates = pixel.minus(
                $.getElementPosition(this.viewer.element));
        return this.viewerElementToViewportCoordinates(viewerCoordinates);
    },

    /**
     * Convert viewport coordinates to pixel coordinates relative to the window.
     * @param {OpenSeadragon.Point} point
     * @returns {OpenSeadragon.Point}
     */
    viewportToWindowCoordinates: function(point) {
        $.console.assert(this.viewer,
            "[Viewport.viewportToWindowCoordinates] the viewport must have a viewer.");
        var viewerCoordinates = this.viewportToViewerElementCoordinates(point);
        return viewerCoordinates.plus(
                $.getElementPosition(this.viewer.element));
    },

    /**
     * Convert a viewport zoom to an image zoom.
     * Image zoom: ratio of the original image size to displayed image size.
     * 1 means original image size, 0.5 half size...
     * Viewport zoom: ratio of the displayed image's width to viewport's width.
     * 1 means identical width, 2 means image's width is twice the viewport's width...
     * Note: not accurate with multi-image.
     * @function
     * @param {Number} viewportZoom The viewport zoom
     * target zoom.
     * @returns {Number} imageZoom The image zoom
     */
    viewportToImageZoom: function(viewportZoom) {
        if (this.viewer) {
            var count = this.viewer.world.getItemCount();
            if (count > 1) {
                if (!this.silenceMultiImageWarnings) {
                    $.console.error('[Viewport.viewportToImageZoom] is not ' +
                        'accurate with multi-image.');
                }
            } else if (count === 1) {
                // It is better to use TiledImage.viewportToImageZoom
                // because this._contentBoundsNoRotate can not be relied on
                // with clipping.
                var item = this.viewer.world.getItemAt(0);
                return item.viewportToImageZoom(viewportZoom);
            }
        }

        var imageWidth = this._contentSizeNoRotate.x;
        var containerWidth = this._containerInnerSize.x;
        var scale = this._contentBoundsNoRotate.width;
        var viewportToImageZoomRatio = (containerWidth / imageWidth) * scale;
        return viewportZoom * viewportToImageZoomRatio;
    },

    /**
     * Convert an image zoom to a viewport zoom.
     * Image zoom: ratio of the original image size to displayed image size.
     * 1 means original image size, 0.5 half size...
     * Viewport zoom: ratio of the displayed image's width to viewport's width.
     * 1 means identical width, 2 means image's width is twice the viewport's width...
     * Note: not accurate with multi-image; use [TiledImage.imageToViewportZoom] for the specific image of interest.
     * @function
     * @param {Number} imageZoom The image zoom
     * target zoom.
     * @returns {Number} viewportZoom The viewport zoom
     */
    imageToViewportZoom: function(imageZoom) {
        if (this.viewer) {
            var count = this.viewer.world.getItemCount();
            if (count > 1) {
                if (!this.silenceMultiImageWarnings) {
                    $.console.error('[Viewport.imageToViewportZoom] is not accurate ' +
                        'with multi-image. Instead, use [TiledImage.imageToViewportZoom] for the specific image of interest');
                }
            } else if (count === 1) {
                // It is better to use TiledImage.imageToViewportZoom
                // because this._contentBoundsNoRotate can not be relied on
                // with clipping.
                var item = this.viewer.world.getItemAt(0);
                return item.imageToViewportZoom(imageZoom);
            }
        }

        var imageWidth = this._contentSizeNoRotate.x;
        var containerWidth = this._containerInnerSize.x;
        var scale = this._contentBoundsNoRotate.width;
        var viewportToImageZoomRatio = (imageWidth / containerWidth) / scale;
        return imageZoom * viewportToImageZoomRatio;
    },

    /**
     * Toggles flip state and demands a new drawing on navigator and viewer objects.
     * @function
     * @returns {OpenSeadragon.Viewport} Chainable.
     */
    toggleFlip: function() {
      this.setFlip(!this.getFlip());
      return this;
    },

    /**
     * Get flip state stored on viewport.
     * @function
     * @returns {Boolean} Flip state.
     */
    getFlip: function() {
      return this.flipped;
    },

    /**
     * Sets flip state according to the state input argument.
     * @function
     * @param {Boolean} state - Flip state to set.
     * @returns {OpenSeadragon.Viewport} Chainable.
     */
    setFlip: function( state ) {
      if ( this.flipped === state ) {
        return this;
      }

      this.flipped = state;
      if(this.viewer.navigator){
        this.viewer.navigator.setFlip(this.getFlip());
      }
      this.viewer.forceRedraw();

      /**
       * Raised when flip state has been changed.
       *
       * @event flip
       * @memberof OpenSeadragon.Viewer
       * @type {object}
       * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
       * @property {Number} flipped - The flip state after this change.
       * @property {?Object} userData - Arbitrary subscriber-defined object.
       */
      this.viewer.raiseEvent('flip', {flipped: state});
      return this;
    },

    /**
     * Gets current max zoom pixel ratio
     * @function
     * @returns {Number} Max zoom pixel ratio
     */
    getMaxZoomPixelRatio: function() {
        return this.maxZoomPixelRatio;
    },

    /**
     * Sets max zoom pixel ratio
     * @function
     * @param {Number} ratio - Max zoom pixel ratio
     * @param {Boolean} [applyConstraints=true] - Apply constraints after setting ratio;
     * Takes effect only if current zoom is greater than set max zoom pixel ratio
     * @param {Boolean} [immediately=false] - Whether to animate to new zoom
     */
    setMaxZoomPixelRatio: function(ratio, applyConstraints = true, immediately = false) {

        $.console.assert(!isNaN(ratio), "[Viewport.setMaxZoomPixelRatio] ratio must be a number");

        if (isNaN(ratio)) {
            return;
        }

        this.maxZoomPixelRatio = ratio;

        if (applyConstraints) {
            if (this.getZoom() > this.getMaxZoom()) {
                this.applyConstraints(immediately);
            }
        }
    },

};

}( OpenSeadragon ));
