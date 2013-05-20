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
 * @class
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
        maxZoomLevel:       $.DEFAULT_SETTINGS.maxZoomLevel

    }, options );

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
        initial: 1, 
        springStiffness: this.springStiffness,
        animationTime:   this.animationTime
    });

    this.resetContentSize( this.contentSize );
    this.goHome( true );
    this.update();
};

$.Viewport.prototype = {

    /**
     * @function
     * @return {OpenSeadragon.Viewport} Chainable.
     */
    resetContentSize: function( contentSize ){
        this.contentSize    = contentSize;
        this.contentAspectX = this.contentSize.x / this.contentSize.y;
        this.contentAspectY = this.contentSize.y / this.contentSize.x;
        this.fitWidthBounds = new $.Rect( 0, 0, 1, this.contentAspectY );
        this.fitHeightBounds = new $.Rect( 0, 0, this.contentAspectY, this.contentAspectY);

        this.homeBounds = new $.Rect( 0, 0, 1, this.contentAspectY );

        if( this.viewer ){
            this.viewer.raiseEvent( 'reset-size', { 
                contentSize: contentSize,
                viewer: this.viewer
            });
        }
        
        return this;
    },

    /**
     * @function
     */
    getHomeZoom: function() {
        var aspectFactor = 
            this.contentAspectX / this.getAspectRatio();

        if( this.defaultZoomLevel ){
            return this.defaultZoomLevel;
        } else {
            return ( aspectFactor >= 1 ) ? 
                1 : 
                aspectFactor;
        }
    },

    /**
     * @function
     */
    getHomeBounds: function() {
        var center = this.homeBounds.getCenter( ),
            width  = 1.0 / this.getHomeZoom( ),
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
     * @param {Boolean} immediately
     */
    goHome: function( immediately ) {
        if( this.viewer ){
            this.viewer.raiseEvent( 'home', { 
                immediately: immediately,
                viewer: this.viewer
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

        return Math.min( zoom, homeZoom );
    },

    /**
     * @function
     */
    getMaxZoom: function() {
        var zoom = this.maxZoomLevel ?
            this.maxZoomLevel :
                ( this.contentSize.x * this.maxZoomPixelRatio / this.containerSize.x );

        return Math.max( zoom, this.getHomeZoom() );
    },

    /**
     * @function
     */
    getAspectRatio: function() {
        return this.containerSize.x / this.containerSize.y;
    },

    /**
     * @function
     */
    getContainerSize: function() {
        return new $.Point(
            this.containerSize.x, 
            this.containerSize.y
        );
    },

    /**
     * @function
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

        newZoomPixel    = this.zoomPoint.minus(
            bounds.getTopLeft()
        ).times(
            this.containerSize.x / bounds.width
        );
        deltaZoomPixels = newZoomPixel.minus( oldZoomPixel );
        deltaZoomPoints = deltaZoomPixels.divide( this.containerSize.x * zoom );

        return centerTarget.plus( deltaZoomPoints );
    },

    /**
     * @function
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
     * @return {OpenSeadragon.Viewport} Chainable.
     */
    applyConstraints: function( immediately ) {
        var actualZoom = this.getZoom(),
            constrainedZoom = Math.max(
                Math.min( actualZoom, this.getMaxZoom() ), 
                this.getMinZoom()
            ),
            bounds,
            horizontalThreshold,
            verticalThreshold,
            left,
            right,
            top,
            bottom,
            center,
            dx = 0,
            dy = 0,
            dx1 = 0, dx2 = 0, dy1 = 0, dy2 = 0;

        if ( actualZoom != constrainedZoom ) {
            this.zoomTo( constrainedZoom, this.zoomPoint, immediately );
        }

        bounds = this.getBounds();

        horizontalThreshold = this.visibilityRatio * bounds.width;
        verticalThreshold   = this.visibilityRatio * bounds.height;

        left   = bounds.x + bounds.width;
        right  = 1 - bounds.x;
        top    = bounds.y + bounds.height;
        bottom = this.contentAspectY - bounds.y;

        if ( this.wrapHorizontal ) {
            //do nothing
        } else {
            if ( left < horizontalThreshold ) {
                dx = horizontalThreshold - left;
            } 
            if ( right < horizontalThreshold ) {
                dx = dx ? 
                    ( dx + right - horizontalThreshold ) / 2 :
                    ( right - horizontalThreshold );
            }
        }

        if ( this.wrapVertical ) {
            //do nothing
        } else {
            if ( top < verticalThreshold ) {
                dy = ( verticalThreshold - top );
            } 
            if ( bottom < verticalThreshold ) {
                dy =  dy ? 
                    ( dy + bottom - verticalThreshold ) / 2 :
                    ( bottom - verticalThreshold );
            }
        }

        if ( dx || dy || immediately ) {
            bounds.x += dx;
            bounds.y += dy;
            if( bounds.width > 1  ){
                bounds.x = 0.5 - bounds.width/2;
            }
            if( bounds.height > this.contentAspectY ){
                bounds.y = this.contentAspectY/2 - bounds.height/2;
            }
            this.fitBounds( bounds, immediately );
        }

        if( this.viewer ){
            this.viewer.raiseEvent( 'constrain', { 
                immediately: immediately,
                viewer: this.viewer
            });
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
     * @param {OpenSeadragon.Rect} bounds
     * @param {Boolean} immediately
     * @return {OpenSeadragon.Viewport} Chainable.
     */
    fitBounds: function( bounds, immediately ) {
        var aspect = this.getAspectRatio(),
            center = bounds.getCenter(),
            newBounds = new $.Rect(
                bounds.x, 
                bounds.y, 
                bounds.width, 
                bounds.height
            ),
            oldBounds,
            oldZoom,
            newZoom,
            referencePoint;

        if ( newBounds.getAspectRatio() >= aspect ) {
            newBounds.height = bounds.width / aspect;
            newBounds.y      = center.y - newBounds.height / 2;
        } else {
            newBounds.width = bounds.height * aspect;
            newBounds.x     = center.x - newBounds.width / 2;
        }

        this.panTo( this.getCenter( true ), true );
        this.zoomTo( this.getZoom( true ), null, true );

        oldBounds = this.getBounds();
        oldZoom   = this.getZoom();
        newZoom   = 1.0 / newBounds.width;
        if ( newZoom == oldZoom || newBounds.width == oldBounds.width ) {
            return this.panTo( center, immediately );
        }

        referencePoint = oldBounds.getTopLeft().times( 
            this.containerSize.x / oldBounds.width 
        ).minus(
            newBounds.getTopLeft().times( 
                this.containerSize.x / newBounds.width 
            )
        ).divide(
            this.containerSize.x / oldBounds.width - 
            this.containerSize.x / newBounds.width
        );

        return this.zoomTo( newZoom, referencePoint, immediately );
    },
    

    /**
     * @function
     * @param {Boolean} immediately
     * @return {OpenSeadragon.Viewport} Chainable.
     */
    fitVertically: function( immediately ) {
        var center = this.getCenter();

        if ( this.wrapHorizontal ) {
            center.x = ( 1 + ( center.x % 1 ) ) % 1;
            this.centerSpringX.resetTo( center.x );
            this.centerSpringX.update();
        }

        if ( this.wrapVertical ) {
            center.y = (
                this.contentAspectY + ( center.y % this.contentAspectY )
            ) % this.contentAspectY;
            this.centerSpringY.resetTo( center.y );
            this.centerSpringY.update();
        }

        return this.fitBounds( this.fitHeightBounds, immediately );
    },

    /**
     * @function
     * @param {Boolean} immediately
     * @return {OpenSeadragon.Viewport} Chainable.
     */
    fitHorizontally: function( immediately ) {
        var center = this.getCenter();

        if ( this.wrapHorizontal ) {
            center.x = ( 
                this.contentAspectX + ( center.x % this.contentAspectX ) 
            ) % this.contentAspectX;
            this.centerSpringX.resetTo( center.x );
            this.centerSpringX.update();
        }

        if ( this.wrapVertical ) {
            center.y = ( 1 + ( center.y % 1 ) ) % 1;
            this.centerSpringY.resetTo( center.y );
            this.centerSpringY.update();
        }

        return this.fitBounds( this.fitWidthBounds, immediately );
    },


    /**
     * @function
     * @param {OpenSeadragon.Point} delta
     * @param {Boolean} immediately
     * @return {OpenSeadragon.Viewport} Chainable.
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
            this.viewer.raiseEvent( 'pan', { 
                center: center,
                immediately: immediately,
                viewer: this.viewer
            });
        }

        return this;
    },

    /**
     * @function
     * @return {OpenSeadragon.Viewport} Chainable.
     */
    zoomBy: function( factor, refPoint, immediately ) {
        return this.zoomTo( this.zoomSpring.target.value * factor, refPoint, immediately );
    },

    /**
     * @function
     * @return {OpenSeadragon.Viewport} Chainable.
     */
    zoomTo: function( zoom, refPoint, immediately ) {

        this.zoomPoint = refPoint instanceof $.Point ? 
            refPoint : 
            null;
            
        if ( immediately ) {
            this.zoomSpring.resetTo( zoom );
        } else {        
            this.zoomSpring.springTo( zoom );
        }

        if( this.viewer ){
            this.viewer.raiseEvent( 'zoom', { 
                zoom: zoom,
                refPoint: refPoint,
                immediately: immediately,
                viewer: this.viewer
            });
        }

        return this;
    },

    /**
     * @function
     * @return {OpenSeadragon.Viewport} Chainable.
     */
    resize: function( newContainerSize, maintain ) {
        var oldBounds = this.getBounds(),
            newBounds = oldBounds,
            widthDeltaFactor = newContainerSize.x / this.containerSize.x;

        this.containerSize = new $.Point(
            newContainerSize.x, 
            newContainerSize.y
        );

        if (maintain) {
            newBounds.width  = oldBounds.width * widthDeltaFactor;
            newBounds.height = newBounds.width / this.getAspectRatio();
        }

        if( this.viewer ){
            this.viewer.raiseEvent( 'resize', { 
                newContainerSize: newContainerSize,
                maintain: maintain,
                viewer: this.viewer
            });
        }

        return this.fitBounds( newBounds, true );
    },

    /**
     * @function
     */
    update: function() {
        var oldCenterX = this.centerSpringX.current.value,
            oldCenterY = this.centerSpringY.current.value,
            oldZoom    = this.zoomSpring.current.value,
            oldZoomPixel,
            newZoomPixel,
            deltaZoomPixels,
            deltaZoomPoints;

        if (this.zoomPoint) {
            oldZoomPixel = this.pixelFromPoint( this.zoomPoint, true );
        }

        this.zoomSpring.update();

        if (this.zoomPoint && this.zoomSpring.current.value != oldZoom) {
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

        return this.centerSpringX.current.value != oldCenterX ||
            this.centerSpringY.current.value != oldCenterY ||
            this.zoomSpring.current.value != oldZoom;
    },


    /**
     * @function
     */
    deltaPixelsFromPoints: function( deltaPoints, current ) {
        return deltaPoints.times(
            this.containerSize.x * this.getZoom( current )
        );
    },

    /**
     * @function
     */
    deltaPointsFromPixels: function( deltaPixels, current ) {
        return deltaPixels.divide(
            this.containerSize.x * this.getZoom( current )
        );
    },

    /**
     * @function
     */
    pixelFromPoint: function( point, current ) {
        var bounds = this.getBounds( current );
        return point.minus(
            bounds.getTopLeft()
        ).times(
            this.containerSize.x / bounds.width
        );
    },

    /**
     * @function
     */
    pointFromPixel: function( pixel, current ) {
        var bounds = this.getBounds( current );
        return pixel.divide(
            this.containerSize.x / bounds.width
        ).plus(
            bounds.getTopLeft()
        );
    },

    /**
     * Translates from Seajax viewer coordinate 
     * system to image coordinate system 
     */
    viewportToImageCoordinates: function(viewerX, viewerY) {
       return new $.Point(viewerX * this.contentSize.x, viewerY * this.contentSize.y * this.contentAspectX);
    },

    /**
     * Translates from image coordinate system to
     * Seajax viewer coordinate system 
     */
    imageToViewportCoordinates: function( imageX, imageY ) {
       return new $.Point( imageX / this.contentSize.x, imageY / this.contentSize.y / this.contentAspectX);
    },

    /**
     * Translates from a rectanlge which describes a portion of
     * the image in pixel coordinates to OpenSeadragon viewport
     * rectangle coordinates.
     */
    imageToViewportRectangle: function( imageX, imageY, pixelWidth, pixelHeight ) {
        var coordA,
            coordB,
            rect;
        if( arguments.length == 1 ){
            //they passed a rectangle instead of individual components
            rect = imageX;
            return this.imageToViewportRectangle(rect.x, rect.y, rect.width, rect.height);
        }
        coordA = this.imageToViewportCoordinates(
            imageX, imageY
        );
        coordB = this.imageToViewportCoordinates(
            pixelWidth, pixelHeight
        );
        return new $.Rect( 
            coordA.x,
            coordA.y,
            coordA.x + coordB.x,
            coordA.y + coordB.y
        );
    }
};

}( OpenSeadragon ));
