/*
 * OpenSeadragon - Viewport
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
 */
$.Viewport = function( options ) {

    //backward compatibility for positional args while prefering more
    //idiomatic javascript options object as the only argument
    var args = arguments;
    if(  args.length && args[ 0 ] instanceof $.Point ){
        options = {
            containerSize:  args[ 0 ],
            contentSize:    args[ 1 ],
            config:         args[ 2 ]
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

    $.extend( true, this, {

        //required settings
        containerSize:      null,
        contentSize:        null,

        //internal state properties
        zoomPoint:          null,
        viewer:           null,

        //configurable options
        springStiffness:    $.DEFAULT_SETTINGS.springStiffness,
        animationTime:      $.DEFAULT_SETTINGS.animationTime,
        minZoomImageRatio:  $.DEFAULT_SETTINGS.minZoomImageRatio,
        maxZoomPixelRatio:  $.DEFAULT_SETTINGS.maxZoomPixelRatio,
        visibilityRatio:    $.DEFAULT_SETTINGS.visibilityRatio,
        wrapHorizontal:     $.DEFAULT_SETTINGS.wrapHorizontal,
        wrapVertical:       $.DEFAULT_SETTINGS.wrapVertical,
        defaultZoomLevel:   $.DEFAULT_SETTINGS.defaultZoomLevel,
        minZoomLevel:       $.DEFAULT_SETTINGS.minZoomLevel,
        maxZoomLevel:       $.DEFAULT_SETTINGS.maxZoomLevel,
        degrees:            $.DEFAULT_SETTINGS.degrees,
        homeFillsViewer:    $.DEFAULT_SETTINGS.homeFillsViewer

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

    this._oldCenterX = this.centerSpringX.current.value;
    this._oldCenterY = this.centerSpringY.current.value;
    this._oldZoom    = this.zoomSpring.current.value;

    this._setContentBounds(new $.Rect(0, 0, 1, 1), 1);

    this.goHome(true);
    this.update();
};

/** @lends OpenSeadragon.Viewport.prototype */
$.Viewport.prototype = {
    /**
     * Updates the viewport's home bounds and constraints for the given content size.
     * @function
     * @param {OpenSeadragon.Point} contentSize - size of the content in content units
     * @return {OpenSeadragon.Viewport} Chainable.
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

        this._contentBounds = bounds.rotate(this.degrees).getBoundingBox();
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
    goHome: function( immediately ) {
        if( this.viewer ){
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
            this.viewer.raiseEvent( 'home', {
                immediately: immediately
            });
        }
        return this.fitBounds( this.getHomeBounds(), immediately );
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
     * @function
     * The margins push the "home" region in from the sides by the specified amounts.
     * @returns {Object} Properties (Numbers, in screen coordinates): left, top, right, bottom.
     */
    getMargins: function() {
        return $.extend({}, this._margins); // Make a copy so we are not returning our original
    },

    /**
     * @function
     * The margins push the "home" region in from the sides by the specified amounts.
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
        this.viewer.forceRedraw();
    },

    /**
     * Returns the bounds of the visible area in viewport coordinates.
     * @function
     * @param {Boolean} current - Pass true for the current location; defaults to false (target location).
     * @returns {OpenSeadragon.Rect} The location you are zoomed/panned to, in viewport coordinates.
     */
    getBounds: function( current ) {
        var center = this.getCenter( current ),
            width  = 1.0 / this.getZoom( current ),
            height = width / this.getAspectRatio();

        return new $.Rect(
            center.x - ( width / 2.0 ),
            center.y - ( height / 2.0 ),
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
    getBoundsWithMargins: function( current ) {
        var bounds = this.getBounds(current);
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
        deltaZoomPixels = newZoomPixel.minus( oldZoomPixel );
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

    /**
     * @function
     * @private
     * @param {OpenSeadragon.Rect} bounds
     * @param {Boolean} immediately
     * @return {OpenSeadragon.Rect} constrained bounds.
     */
    _applyBoundaryConstraints: function(bounds, immediately) {
        var newBounds = new $.Rect(
                bounds.x,
                bounds.y,
                bounds.width,
                bounds.height);

        var horizontalThreshold = this.visibilityRatio * newBounds.width;
        var verticalThreshold   = this.visibilityRatio * newBounds.height;

        if (this.wrapHorizontal) {
            //do nothing
        } else {
            var dx = 0;
            var thresholdLeft = newBounds.x + (newBounds.width - horizontalThreshold);
            if (this._contentBoundsNoRotate.x > thresholdLeft) {
                dx = this._contentBoundsNoRotate.x - thresholdLeft;
            }

            var contentRight = this._contentBoundsNoRotate.x + this._contentBoundsNoRotate.width;
            var thresholdRight = newBounds.x + horizontalThreshold;
            if (contentRight < thresholdRight) {
                var newDx = contentRight - thresholdRight;
                if (dx) {
                    dx = (dx + newDx) / 2;
                } else {
                    dx = newDx;
                }
            }
            newBounds.x += dx;
        }

        if (this.wrapVertical) {
            //do nothing
        } else {
            var dy = 0;
            var thresholdTop = newBounds.y + (newBounds.height - verticalThreshold);
            if (this._contentBoundsNoRotate.y > thresholdTop) {
                dy = this._contentBoundsNoRotate.y - thresholdTop;
            }

            var contentBottom = this._contentBoundsNoRotate.y + this._contentBoundsNoRotate.height;
            var thresholdBottom = newBounds.y + verticalThreshold;
            if (contentBottom < thresholdBottom) {
                var newDy = contentBottom - thresholdBottom;
                if (dy) {
                    dy = (dy + newDy) / 2;
                } else {
                    dy = newDy;
                }
            }
            newBounds.y += dy;
        }

        if (this.viewer) {
            /**
             * Raised when the viewport constraints are applied (see {@link OpenSeadragon.Viewport#applyConstraints}).
             *
             * @event constrain
             * @memberof OpenSeadragon.Viewer
             * @type {object}
             * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised this event.
             * @property {Boolean} immediately
             * @property {?Object} userData - Arbitrary subscriber-defined object.
             */
            this.viewer.raiseEvent( 'constrain', {
                immediately: immediately
            });
        }

        return newBounds;
    },

    /**
     * @function
     * @return {OpenSeadragon.Viewport} Chainable.
     * @fires OpenSeadragon.Viewer.event:constrain
     */
    applyConstraints: function( immediately ) {
        var actualZoom = this.getZoom(),
            constrainedZoom = Math.max(
                Math.min( actualZoom, this.getMaxZoom() ),
                this.getMinZoom()
            ),
            bounds,
            constrainedBounds;

        if ( actualZoom != constrainedZoom ) {
            this.zoomTo( constrainedZoom, this.zoomPoint, immediately );
        }

        bounds = this.getBounds();

        constrainedBounds = this._applyBoundaryConstraints( bounds, immediately );

        if ( bounds.x !== constrainedBounds.x || bounds.y !== constrainedBounds.y || immediately ){
            this.fitBounds( constrainedBounds, immediately );
        }

        return this;
    },

    /**
     * @function
     * @param {Boolean} immediately
     */
    ensureVisible: function( immediately ) {
        return this.applyConstraints( immediately );
    },

    /**
     * @function
     * @private
     * @param {OpenSeadragon.Rect} bounds
     * @param {Object} options (immediately=false, constraints=false)
     * @return {OpenSeadragon.Viewport} Chainable.
     */
    _fitBounds: function( bounds, options ) {
        options = options || {};
        var immediately = options.immediately || false;
        var constraints = options.constraints || false;

        var aspect = this.getAspectRatio();
        var center = bounds.getCenter();
        var newBounds = new $.Rect(
            bounds.x,
            bounds.y,
            bounds.width,
            bounds.height
        );

        if ( newBounds.getAspectRatio() >= aspect ) {
            newBounds.height = bounds.width / aspect;
            newBounds.y      = center.y - newBounds.height / 2;
        } else {
            newBounds.width = bounds.height * aspect;
            newBounds.x     = center.x - newBounds.width / 2;
        }

        this.panTo( this.getCenter( true ), true );
        this.zoomTo( this.getZoom( true ), null, true );

        var oldBounds = this.getBounds();
        var oldZoom   = this.getZoom();
        var newZoom   = 1.0 / newBounds.width;

        if (constraints) {
            var newBoundsAspectRatio = newBounds.getAspectRatio();
            var newConstrainedZoom = Math.max(
                Math.min(newZoom, this.getMaxZoom() ),
                this.getMinZoom()
            );

            if (newZoom !== newConstrainedZoom) {
                newZoom = newConstrainedZoom;
                newBounds.width = 1.0 / newZoom;
                newBounds.x = center.x - newBounds.width / 2;
                newBounds.height = newBounds.width / newBoundsAspectRatio;
                newBounds.y = center.y - newBounds.height / 2;
            }

            newBounds = this._applyBoundaryConstraints( newBounds, immediately );
            center = newBounds.getCenter();
        }

        if (immediately) {
            this.panTo( center, true );
            return this.zoomTo(newZoom, null, true);
        }

        if (Math.abs(newZoom - oldZoom) < 0.00000001 ||
                Math.abs(newBounds.width - oldBounds.width) < 0.00000001) {
            return this.panTo( center, immediately );
        }

        var referencePoint = oldBounds.getTopLeft().times(
            this._containerInnerSize.x / oldBounds.width
        ).minus(
            newBounds.getTopLeft().times(
                this._containerInnerSize.x / newBounds.width
            )
        ).divide(
            this._containerInnerSize.x / oldBounds.width -
            this._containerInnerSize.x / newBounds.width
        );

        return this.zoomTo( newZoom, referencePoint, immediately );
    },

    /**
     * @function
     * @param {OpenSeadragon.Rect} bounds
     * @param {Boolean} immediately
     * @return {OpenSeadragon.Viewport} Chainable.
     */
    fitBounds: function( bounds, immediately ) {
        return this._fitBounds( bounds, {
            immediately: immediately,
            constraints: false
        } );
    },

    /**
     * @function
     * @param {OpenSeadragon.Rect} bounds
     * @param {Boolean} immediately
     * @return {OpenSeadragon.Viewport} Chainable.
     */
    fitBoundsWithConstraints: function( bounds, immediately ) {
        return this._fitBounds( bounds, {
            immediately: immediately,
            constraints: true
        } );
    },

    /**
     * Zooms so the image just fills the viewer vertically.
     * @param {Boolean} immediately
     * @return {OpenSeadragon.Viewport} Chainable.
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
     * @return {OpenSeadragon.Viewport} Chainable.
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
     * @function
     * @param {OpenSeadragon.Point} delta
     * @param {Boolean} immediately
     * @return {OpenSeadragon.Viewport} Chainable.
     * @fires OpenSeadragon.Viewer.event:pan
     */
    panBy: function( delta, immediately ) {
        var center = new $.Point(
            this.centerSpringX.target.value,
            this.centerSpringY.target.value
        );
        return this.panTo( center.plus( delta ), immediately );
    },

    /**
     * @function
     * @param {OpenSeadragon.Point} center
     * @param {Boolean} immediately
     * @return {OpenSeadragon.Viewport} Chainable.
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
     * @return {OpenSeadragon.Viewport} Chainable.
     * @fires OpenSeadragon.Viewer.event:zoom
     */
    zoomBy: function(factor, refPoint, immediately) {
        return this.zoomTo(
            this.zoomSpring.target.value * factor, refPoint, immediately);
    },

    /**
     * @function
     * @return {OpenSeadragon.Viewport} Chainable.
     * @fires OpenSeadragon.Viewer.event:zoom
     */
    zoomTo: function( zoom, refPoint, immediately ) {

        this.zoomPoint = refPoint instanceof $.Point &&
            !isNaN(refPoint.x) &&
            !isNaN(refPoint.y) ?
            refPoint :
            null;

        if ( immediately ) {
            this.zoomSpring.resetTo( zoom );
        } else {
            this.zoomSpring.springTo( zoom );
        }

        if( this.viewer ){
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
            this.viewer.raiseEvent( 'zoom', {
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
     * @return {OpenSeadragon.Viewport} Chainable.
     */
    setRotation: function(degrees) {
        if (!this.viewer || !this.viewer.drawer.canRotate()) {
            return this;
        }

        degrees = degrees % 360;
        if (degrees < 0) {
            degrees += 360;
        }
        this.degrees = degrees;
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
         * @property {?Object} userData - Arbitrary subscriber-defined object.
         */
        this.viewer.raiseEvent('rotate', {"degrees": degrees});
        return this;
    },

    /**
     * Gets the current rotation in degrees.
     * @function
     * @return {Number} The current rotation in degrees.
     */
    getRotation: function() {
        return this.degrees;
    },

    /**
     * @function
     * @return {OpenSeadragon.Viewport} Chainable.
     * @fires OpenSeadragon.Viewer.event:resize
     */
    resize: function( newContainerSize, maintain ) {
        var oldBounds = this.getBounds(),
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
             * Raised when the viewer is resized (see {@link OpenSeadragon.Viewport#resize}).
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

        return this.fitBounds( newBounds, true );
    },

    // private
    _updateContainerInnerSize: function() {
        this._containerInnerSize = new $.Point(
            Math.max(1, this.containerSize.x - (this._margins.left + this._margins.right)),
            Math.max(1, this.containerSize.y - (this._margins.top + this._margins.bottom))
        );
    },

    /**
     * @function
     */
    update: function() {
        var oldZoomPixel,
            newZoomPixel,
            deltaZoomPixels,
            deltaZoomPoints;

        if (this.zoomPoint) {
            oldZoomPixel = this.pixelFromPoint( this.zoomPoint, true );
        }

        this.zoomSpring.update();

        if (this.zoomPoint && this.zoomSpring.current.value != this._oldZoom) {
            newZoomPixel    = this.pixelFromPoint( this.zoomPoint, true );
            deltaZoomPixels = newZoomPixel.minus( oldZoomPixel );
            deltaZoomPoints = this.deltaPointsFromPixels( deltaZoomPixels, true );

            this.centerSpringX.shiftBy( deltaZoomPoints.x );
            this.centerSpringY.shiftBy( deltaZoomPoints.y );
        } else {
            this.zoomPoint = null;
        }

        this.centerSpringX.update();
        this.centerSpringY.update();

        var changed = this.centerSpringX.current.value != this._oldCenterX ||
            this.centerSpringY.current.value != this._oldCenterY ||
            this.zoomSpring.current.value != this._oldZoom;

        this._oldCenterX = this.centerSpringX.current.value;
        this._oldCenterY = this.centerSpringY.current.value;
        this._oldZoom    = this.zoomSpring.current.value;

        return changed;
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
            deltaPoints.rotate(this.getRotation()),
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
            .rotate(-this.getRotation());
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
        return this._pixelFromPointNoRotate(point, this.getBounds(current));
    },

    /**
     * Convert viewport coordinates to pixel coordinates.
     * @param {OpenSeadragon.Point} point the viewport coordinates
     * @param {Boolean} [current=false] - Pass true for the current location;
     * defaults to false (target location).
     * @returns {OpenSeadragon.Point}
     */
    pixelFromPoint: function(point, current) {
        return this._pixelFromPoint(point, this.getBounds(current));
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
            point.rotate(this.getRotation(), this.getCenter(true)),
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
        var bounds = this.getBounds( current );
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
            -this.getRotation(),
            this.getCenter(true)
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
     * @return {OpenSeadragon.Point} a point representing the coordinates in the image.
     */
    viewportToImageCoordinates: function(viewerX, viewerY) {
        if (viewerX instanceof $.Point) {
            //they passed a point instead of individual components
            return this.viewportToImageCoordinates(viewerX.x, viewerX.y);
        }

        if (this.viewer) {
            var count = this.viewer.world.getItemCount();
            if (count > 1) {
                $.console.error('[Viewport.viewportToImageCoordinates] is not accurate ' +
                    'with multi-image; use TiledImage.viewportToImageCoordinates instead.');
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
     * @return {OpenSeadragon.Point} a point representing the coordinates in the viewport.
     */
    imageToViewportCoordinates: function(imageX, imageY) {
        if (imageX instanceof $.Point) {
            //they passed a point instead of individual components
            return this.imageToViewportCoordinates(imageX.x, imageX.y);
        }

        if (this.viewer) {
            var count = this.viewer.world.getItemCount();
            if (count > 1) {
                $.console.error('[Viewport.imageToViewportCoordinates] is not accurate ' + 
                    'with multi-image; use TiledImage.imageToViewportCoordinates instead.');
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
                $.console.error('[Viewport.imageToViewportRectangle] is not accurate ' +
                    'with multi-image; use TiledImage.imageToViewportRectangle instead.');
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
                $.console.error('[Viewport.viewportToImageRectangle] is not accurate ' +
                    'with multi-image; use TiledImage.viewportToImageRectangle instead.');
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
    windowToImageCoordinates: function( pixel ) {
        var viewerCoordinates = pixel.minus(
                OpenSeadragon.getElementPosition( this.viewer.element ));
        return this.viewerElementToImageCoordinates( viewerCoordinates );
    },

    /**
     * Convert image coordinates to pixel coordinates relative to the window.
     * Note: not accurate with multi-image.
     * @param {OpenSeadragon.Point} pixel
     * @returns {OpenSeadragon.Point}
     */
    imageToWindowCoordinates: function( pixel ) {
        var viewerCoordinates = this.imageToViewerElementCoordinates( pixel );
        return viewerCoordinates.plus(
                OpenSeadragon.getElementPosition( this.viewer.element ));
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
     * Convert pixel coordinates relative to the window to viewport coordinates.
     * @param {OpenSeadragon.Point} pixel
     * @returns {OpenSeadragon.Point}
     */
    windowToViewportCoordinates: function( pixel ) {
        var viewerCoordinates = pixel.minus(
                OpenSeadragon.getElementPosition( this.viewer.element ));
        return this.viewerElementToViewportCoordinates( viewerCoordinates );
    },

    /**
     * Convert viewport coordinates to pixel coordinates relative to the window.
     * @param {OpenSeadragon.Point} point
     * @returns {OpenSeadragon.Point}
     */
    viewportToWindowCoordinates: function( point ) {
        var viewerCoordinates = this.viewportToViewerElementCoordinates( point );
        return viewerCoordinates.plus(
                OpenSeadragon.getElementPosition( this.viewer.element ));
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
                $.console.error('[Viewport.viewportToImageZoom] is not ' + 
                    'accurate with multi-image.');
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
     * Note: not accurate with multi-image.
     * @function
     * @param {Number} imageZoom The image zoom
     * target zoom.
     * @returns {Number} viewportZoom The viewport zoom
     */
    imageToViewportZoom: function(imageZoom) {
        if (this.viewer) {
            var count = this.viewer.world.getItemCount();
            if (count > 1) {
                $.console.error('[Viewport.imageToViewportZoom] is not accurate ' +
                    'with multi-image.');
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
    }
};

}( OpenSeadragon ));
