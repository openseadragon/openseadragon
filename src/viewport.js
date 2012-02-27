
(function( $ ){


/**
 * @class
 */
$.Viewport = function( options ) {


    if(  arguments.length && arguments[ 0 ] instanceof $.Point ){
        options = {
            containerSize:      arguments[ 0 ],
            contentSize:        arguments[ 1 ],
            config:             arguments[ 2 ]
        };
    }

    //TODO: this.config is something that should go away but currently the 
    //      Drawer references the viewport.config
    this.config        = options.config;
    this.zoomPoint     = null;
    this.containerSize = options.containerSize;
    this.contentSize   = options.contentSize;
    this.contentAspect = this.contentSize.x / this.contentSize.y;
    this.contentHeight = this.contentSize.y / this.contentSize.x;
    this.centerSpringX = new $.Spring({
        initial: 0, 
        springStiffness: this.config.springStiffness,
        animationTime:   this.config.animationTime
    });
    this.centerSpringY = new $.Spring({
        initial: 0, 
        springStiffness: this.config.springStiffness,
        animationTime:   this.config.animationTime
    });
    this.zoomSpring    = new $.Spring({
        initial: 1, 
        springStiffness: this.config.springStiffness,
        animationTime:   this.config.animationTime
    });
    this.minZoomImageRatio = this.config.minZoomImageRatio;
    this.maxZoomPixelRatio = this.config.maxZoomPixelRatio;
    this.visibilityRatio   = this.config.visibilityRatio;
    this.wrapHorizontal    = this.config.wrapHorizontal;
    this.wrapVertical      = this.config.wrapVertical;
    this.homeBounds        = new $.Rect( 0, 0, 1, this.contentHeight );

    this.goHome( true );
    this.update();
};

$.Viewport.prototype = {

    /**
     * @function
     */
    getHomeZoom: function() {
        var aspectFactor = this.contentAspect / this.getAspectRatio();
        return ( aspectFactor >= 1 ) ? 
            1 : 
            aspectFactor;
    },

    /**
     * @function
     */
    getMinZoom: function() {
        var homeZoom = this.getHomeZoom()
            zoom = this.minZoomImageRatio * homeZoom;

        return Math.min( zoom, homeZoom );
    },

    /**
     * @function
     */
    getMaxZoom: function() {
        var zoom = 
            this.contentSize.x * 
            this.maxZoomPixelRatio / 
            this.containerSize.x;
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
            center.x - width / 2.0, 
            center.y - height / 2.0,
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
            dx = 0,
            dy = 0;

        if ( actualZoom != constrainedZoom ) {
            this.zoomTo( constrainedZoom, this.zoomPoint, immediately );
        }

        bounds = this.getBounds();

        horizontalThreshold = this.visibilityRatio * bounds.width;
        verticalThreshold   = this.visibilityRatio * bounds.height;

        left   = bounds.x + bounds.width;
        right  = 1 - bounds.x;
        top    = bounds.y + bounds.height;
        bottom = this.contentHeight - bounds.y;

        if ( this.wrapHorizontal ) {
            //do nothing
        } else if ( left < horizontalThreshold ) {
            dx = horizontalThreshold - left;
        } else if ( right < horizontalThreshold ) {
            dx = right - horizontalThreshold;
        }

        if ( this.wrapVertical ) {
            //do nothing
        } else if ( top < verticalThreshold ) {
            dy = verticalThreshold - top;
        } else if ( bottom < verticalThreshold ) {
            dy = bottom - verticalThreshold;
        }

        if ( dx || dy ) {
            bounds.x += dx;
            bounds.y += dy;
            this.fitBounds( bounds, immediately );
        }
    },

    /**
     * @function
     * @param {Boolean} immediately
     */
    ensureVisible: function( immediately ) {
        this.applyConstraints( immediately );
    },

    /**
     * @function
     * @param {OpenSeadragon.Rect} bounds
     * @param {Boolean} immediately
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
            this.panTo( center, immediately );
            return;
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


        this.zoomTo( newZoom, referencePoint, immediately );
    },

    /**
     * @function
     * @param {Boolean} immediately
     */
    goHome: function( immediately ) {
        var center = this.getCenter();

        if ( this.wrapHorizontal ) {
            center.x = ( 1 + ( center.x % 1 ) ) % 1;
            this.centerSpringX.resetTo( center.x );
            this.centerSpringX.update();
        }

        if ( this.wrapVertical ) {
            center.y = (
                this.contentHeight + ( center.y % this.contentHeight )
            ) % this.contentHeight;
            this.centerSpringY.resetTo( center.y );
            this.centerSpringY.update();
        }

        this.fitBounds( this.homeBounds, immediately );
    },

    /**
     * @function
     * @param {OpenSeadragon.Point} delta
     * @param {Boolean} immediately
     */
    panBy: function( delta, immediately ) {
        var center = new $.Point(
            this.centerSpringX.target.value,
            this.centerSpringY.target.value
        );
        this.panTo( center.plus( delta ), immediately );
    },

    /**
     * @function
     * @param {OpenSeadragon.Point} center
     * @param {Boolean} immediately
     */
    panTo: function( center, immediately ) {
        if ( immediately ) {
            this.centerSpringX.resetTo( center.x );
            this.centerSpringY.resetTo( center.y );
        } else {
            this.centerSpringX.springTo( center.x );
            this.centerSpringY.springTo( center.y );
        }
    },

    /**
     * @function
     */
    zoomBy: function( factor, refPoint, immediately ) {
        this.zoomTo( this.zoomSpring.target.value * factor, refPoint, immediately );
    },

    /**
     * @function
     */
    zoomTo: function( zoom, refPoint, immediately ) {

        if ( immediately ) {
            this.zoomSpring.resetTo( zoom );
        } else {        
            this.zoomSpring.springTo( zoom );
        }

        this.zoomPoint = refPoint instanceof $.Point ? 
            refPoint : 
            null;
    },

    /**
     * @function
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

        this.fitBounds( newBounds, true );
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
    }
};

}( OpenSeadragon ));
