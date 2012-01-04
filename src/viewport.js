
(function( $ ){
    
$.Viewport = function(containerSize, contentSize, config) {
    this.zoomPoint = null;
    this.config = config;
    this.containerSize = containerSize;
    this.contentSize   = contentSize;
    this.contentAspect = contentSize.x / contentSize.y;
    this.contentHeight = contentSize.y / contentSize.x;
    this.centerSpringX = new $.Spring({
        initial: 0, 
        springStiffness: config.springStiffness,
        animationTime:   config.animationTime
    });
    this.centerSpringY = new $.Spring({
        initial: 0, 
        springStiffness: config.springStiffness,
        animationTime:   config.animationTime
    });
    this.zoomSpring = new $.Spring({
        initial: 1, 
        springStiffness: config.springStiffness,
        animationTime:   config.animationTime
    });
    this.minZoomImageRatio = config.minZoomImageRatio;
    this.maxZoomPixelRatio = config.maxZoomPixelRatio;
    this.visibilityRatio   = config.visibilityRatio;
    this.wrapHorizontal    = config.wrapHorizontal;
    this.wrapVertical      = config.wrapVertical;
    this.homeBounds = new $.Rect(0, 0, 1, this.contentHeight);
    this.goHome(true);
    this.update();
};

$.Viewport.prototype = {
    getHomeZoom: function() {
        var aspectFactor = this.contentAspect / this.getAspectRatio();
        return (aspectFactor >= 1) ? 1 : aspectFactor;
    },

    getMinZoom: function() {
        var homeZoom = this.getHomeZoom()
            zoom = this.minZoomImageRatio * homeZoom;

        return Math.min(zoom, homeZoom);
    },

    getMaxZoom: function() {
        var zoom = this.contentSize.x * 
            this.maxZoomPixelRatio / this.containerSize.x;
        return Math.max(zoom, this.getHomeZoom());
    },

    getAspectRatio: function() {
        return this.containerSize.x / this.containerSize.y;
    },

    getContainerSize: function() {
        return new $.Point(this.containerSize.x, this.containerSize.y);
    },

    getBounds: function(current) {
        var center = this.getCenter(current),
            width  = 1.0 / this.getZoom(current),
            height = width / this.getAspectRatio();

        return new $.Rect(
            center.x - width / 2.0, 
            center.y - height / 2.0,
            width, 
            height
        );
    },

    getCenter: function(current) {
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

        if (current) {
            return centerCurrent;
        } else if (!this.zoomPoint) {
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

    getZoom: function(current) {
        if (current) {
            return this.zoomSpring.current.value;
        } else {
            return this.zoomSpring.target.value;
        }
    },


    applyConstraints: function(immediately) {
        var actualZoom = this.getZoom();
        var constrainedZoom = Math.max(Math.min(actualZoom, this.getMaxZoom()), this.getMinZoom());
        if (actualZoom != constrainedZoom) {
            this.zoomTo(constrainedZoom, this.zoomPoint, immediately);
        }

        var bounds = this.getBounds();
        var visibilityRatio = this.visibilityRatio;

        var horThres = visibilityRatio * bounds.width;
        var verThres = visibilityRatio * bounds.height;

        var left = bounds.x + bounds.width;
        var right = 1 - bounds.x;
        var top = bounds.y + bounds.height;
        var bottom = this.contentHeight - bounds.y;

        var dx = 0;
        if ( this.wrapHorizontal ) {
        } else if (left < horThres) {
            dx = horThres - left;
        } else if (right < horThres) {
            dx = right - horThres;
        }

        var dy = 0;
        if ( this.wrapVertical ) {
        } else if (top < verThres) {
            dy = verThres - top;
        } else if (bottom < verThres) {
            dy = bottom - verThres;
        }

        if (dx || dy) {
            bounds.x += dx;
            bounds.y += dy;
            this.fitBounds(bounds, immediately);
        }
    },

    ensureVisible: function(immediately) {
        this.applyConstraints(immediately);
    },

    fitBounds: function(bounds, immediately) {
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
            refPoint;

        if (newBounds.getAspectRatio() >= aspect) {
            newBounds.height = bounds.width / aspect;
            newBounds.y = center.y - newBounds.height / 2;
        } else {
            newBounds.width = bounds.height * aspect;
            newBounds.x = center.x - newBounds.width / 2;
        }

        this.panTo(this.getCenter(true), true);
        this.zoomTo(this.getZoom(true), null, true);

        oldBounds = this.getBounds();
        oldZoom   = this.getZoom();
        newZoom   = 1.0 / newBounds.width;
        if (newZoom == oldZoom || newBounds.width == oldBounds.width) {
            this.panTo( center, immediately );
            return;
        }

        refPoint = oldBounds.getTopLeft().times( 
            this.containerSize.x / oldBounds.width 
        ).minus(
            newBounds.getTopLeft().times( 
                this.containerSize.x / newBounds.width 
            )
        ).divide(
            this.containerSize.x / oldBounds.width - 
            this.containerSize.x / newBounds.width
        );


        this.zoomTo( newZoom, refPoint, immediately );
    },

    goHome: function(immediately) {
        var center = this.getCenter();

        if ( this.wrapHorizontal ) {
            center.x = (1 + (center.x % 1)) % 1;
            this.centerSpringX.resetTo(center.x);
            this.centerSpringX.update();
        }

        if ( this.wrapVertical ) {
            center.y = (this.contentHeight + (center.y % this.contentHeight)) % this.contentHeight;
            this.centerSpringY.resetTo(center.y);
            this.centerSpringY.update();
        }

        this.fitBounds(this.homeBounds, immediately);
    },

    panBy: function(delta, immediately) {
        var center = new $.Point(
            this.centerSpringX.target.value,
            this.centerSpringY.target.value
        );
        this.panTo( center.plus( delta ), immediately );
    },

    panTo: function(center, immediately) {
        if (immediately) {
            this.centerSpringX.resetTo(center.x);
            this.centerSpringY.resetTo(center.y);
        } else {
            this.centerSpringX.springTo(center.x);
            this.centerSpringY.springTo(center.y);
        }
    },

    zoomBy: function(factor, refPoint, immediately) {
        this.zoomTo(this.zoomSpring.target.value * factor, refPoint, immediately);
    },

    zoomTo: function(zoom, refPoint, immediately) {

        if (immediately) {
            this.zoomSpring.resetTo(zoom);
        } else {        
            this.zoomSpring.springTo(zoom);
        }

        this.zoomPoint = refPoint instanceof $.Point ? refPoint : null;
    },

    resize: function(newContainerSize, maintain) {
        var oldBounds = this.getBounds(),
            newBounds = oldBounds,
            widthDeltaFactor = newContainerSize.x / this.containerSize.x;

        this.containerSize = new $.Point(newContainerSize.x, newContainerSize.y);

        if (maintain) {
            newBounds.width = oldBounds.width * widthDeltaFactor;
            newBounds.height = newBounds.width / this.getAspectRatio();
        }

        this.fitBounds(newBounds, true);
    },

    update: function() {
        var oldCenterX = this.centerSpringX.current.value,
            oldCenterY = this.centerSpringY.current.value,
            oldZoom    = this.zoomSpring.current.value,
            oldZoomPixel,
            newZoomPixel,
            deltaZoomPixels,
            deltaZoomPoints;

        if (this.zoomPoint) {
            oldZoomPixel = this.pixelFromPoint(this.zoomPoint, true);
        }

        this.zoomSpring.update();

        if (this.zoomPoint && this.zoomSpring.current.value != oldZoom) {
            newZoomPixel    = this.pixelFromPoint( this.zoomPoint, true );
            deltaZoomPixels = newZoomPixel.minus( oldZoomPixel);
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


    deltaPixelsFromPoints: function(deltaPoints, current) {
        return deltaPoints.times(
            this.containerSize.x * this.getZoom( current )
        );
    },

    deltaPointsFromPixels: function(deltaPixels, current) {
        return deltaPixels.divide(
            this.containerSize.x * this.getZoom( current )
        );
    },

    pixelFromPoint: function(point, current) {
        var bounds = this.getBounds( current );
        return point.minus(
            bounds.getTopLeft()
        ).times(
            this.containerSize.x / bounds.width
        );
    },

    pointFromPixel: function(pixel, current) {
        var bounds = this.getBounds( current );
        return pixel.divide(
            this.containerSize.x / bounds.width
        ).plus(
            bounds.getTopLeft()
        );
    }
};

}( OpenSeadragon ));
