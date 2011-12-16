
(function( $ ){
    
$.Viewport = function(containerSize, contentSize, config) {
    this.zoomPoint = null;
    this.config = config;
    this._containerSize = containerSize;
    this._contentSize = contentSize;
    this._contentAspect = contentSize.x / contentSize.y;
    this._contentHeight = contentSize.y / contentSize.x;
    this._centerSpringX = new $.Spring(0, this.config);
    this._centerSpringY = new $.Spring(0, this.config);
    this._zoomSpring = new $.Spring(1, this.config);
    this._homeBounds = new $.Rect(0, 0, 1, this._contentHeight);
    this.goHome(true);
    this.update();
};

$.Viewport.prototype = {
    _getHomeZoom: function() {
        var aspectFactor = this._contentAspect / this.getAspectRatio();
        return (aspectFactor >= 1) ? 1 : aspectFactor;
    },

    _getMinZoom: function() {
        var homeZoom = this._getHomeZoom();
        var zoom = this.config.minZoomImageRatio * homeZoom;

        return Math.min(zoom, homeZoom);
    },

    _getMaxZoom: function() {
        var zoom = this._contentSize.x * this.config.maxZoomPixelRatio / this._containerSize.x;
        return Math.max(zoom, this._getHomeZoom());
    },
    getAspectRatio: function() {
        return this._containerSize.x / this._containerSize.y;
    },
    getContainerSize: function() {
        return new $.Point(this._containerSize.x, this._containerSize.y);
    },

    getBounds: function(current) {
        var center = this.getCenter(current);
        var width = 1.0 / this.getZoom(current);
        var height = width / this.getAspectRatio();

        return new $.Rect(center.x - width / 2.0, center.y - height / 2.0,
            width, height);
    },

    getCenter: function(current) {
        var centerCurrent = new $.Point(
            this._centerSpringX.getCurrent(),
            this._centerSpringY.getCurrent()
        );
        var centerTarget = new $.Point(
            this._centerSpringX.getTarget(),
            this._centerSpringY.getTarget()
        );

        if (current) {
            return centerCurrent;
        } else if (!this.zoomPoint) {
            return centerTarget;
        }

        var oldZoomPixel = this.pixelFromPoint(this.zoomPoint, true);

        var zoom = this.getZoom();
        var width = 1.0 / zoom;
        var height = width / this.getAspectRatio();
        var bounds = new $.Rect(centerCurrent.x - width / 2.0,
                centerCurrent.y - height / 2.0, width, height);

        var newZoomPixel = this.zoomPoint.minus(bounds.getTopLeft()).times(this._containerSize.x / bounds.width);
        var deltaZoomPixels = newZoomPixel.minus(oldZoomPixel);
        var deltaZoomPoints = deltaZoomPixels.divide(this._containerSize.x * zoom);

        return centerTarget.plus(deltaZoomPoints);
    },

    getZoom: function(current) {
        if (current) {
            return this._zoomSpring.getCurrent();
        } else {
            return this._zoomSpring.getTarget();
        }
    },


    applyConstraints: function(immediately) {
        var actualZoom = this.getZoom();
        var constrainedZoom = Math.max(Math.min(actualZoom, this._getMaxZoom()), this._getMinZoom());
        if (actualZoom != constrainedZoom) {
            this.zoomTo(constrainedZoom, this.zoomPoint, immediately);
        }

        var bounds = this.getBounds();
        var visibilityRatio = this.config.visibilityRatio;

        var horThres = visibilityRatio * bounds.width;
        var verThres = visibilityRatio * bounds.height;

        var left = bounds.x + bounds.width;
        var right = 1 - bounds.x;
        var top = bounds.y + bounds.height;
        var bottom = this._contentHeight - bounds.y;

        var dx = 0;
        if (this.config.wrapHorizontal) {
        } else if (left < horThres) {
            dx = horThres - left;
        } else if (right < horThres) {
            dx = right - horThres;
        }

        var dy = 0;
        if (this.config.wrapVertical) {
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
        var aspect = this.getAspectRatio();
        var center = bounds.getCenter();

        var newBounds = new $.Rect(bounds.x, bounds.y, bounds.width, bounds.height);
        if (newBounds.getAspectRatio() >= aspect) {
            newBounds.height = bounds.width / aspect;
            newBounds.y = center.y - newBounds.height / 2;
        } else {
            newBounds.width = bounds.height * aspect;
            newBounds.x = center.x - newBounds.width / 2;
        }

        this.panTo(this.getCenter(true), true);
        this.zoomTo(this.getZoom(true), null, true);

        var oldBounds = this.getBounds();
        var oldZoom = this.getZoom();

        var newZoom = 1.0 / newBounds.width;
        if (newZoom == oldZoom || newBounds.width == oldBounds.width) {
            this.panTo(center, immediately);
            return;
        }

        var refPoint = oldBounds.getTopLeft().times(this._containerSize.x / oldBounds.width).minus(
                newBounds.getTopLeft().times(this._containerSize.x / newBounds.width)).divide(
                this._containerSize.x / oldBounds.width - this._containerSize.x / newBounds.width);


        this.zoomTo(newZoom, refPoint, immediately);
    },

    goHome: function(immediately) {
        var center = this.getCenter();

        if (this.config.wrapHorizontal) {
            center.x = (1 + (center.x % 1)) % 1;
            this._centerSpringX.resetTo(center.x);
            this._centerSpringX.update();
        }

        if (this.config.wrapVertical) {
            center.y = (this._contentHeight + (center.y % this._contentHeight)) % this._contentHeight;
            this._centerSpringY.resetTo(center.y);
            this._centerSpringY.update();
        }

        this.fitBounds(this._homeBounds, immediately);
    },

    panBy: function(delta, immediately) {
        var center = new $.Point(this._centerSpringX.getTarget(),
                this._centerSpringY.getTarget());
        this.panTo(center.plus(delta), immediately);
    },

    panTo: function(center, immediately) {
        if (immediately) {
            this._centerSpringX.resetTo(center.x);
            this._centerSpringY.resetTo(center.y);
        } else {
            this._centerSpringX.springTo(center.x);
            this._centerSpringY.springTo(center.y);
        }
    },

    zoomBy: function(factor, refPoint, immediately) {
        this.zoomTo(this._zoomSpring.getTarget() * factor, refPoint, immediately);
    },

    zoomTo: function(zoom, refPoint, immediately) {

        if (immediately) {
            this._zoomSpring.resetTo(zoom);
        } else {        
            this._zoomSpring.springTo(zoom);
        }

        this.zoomPoint = refPoint instanceof $.Point ? refPoint : null;
    },

    resize: function(newContainerSize, maintain) {
        var oldBounds = this.getBounds();
        var newBounds = oldBounds;
        var widthDeltaFactor = newContainerSize.x / this._containerSize.x;

        this._containerSize = new $.Point(newContainerSize.x, newContainerSize.y);

        if (maintain) {
            newBounds.width = oldBounds.width * widthDeltaFactor;
            newBounds.height = newBounds.width / this.getAspectRatio();
        }

        this.fitBounds(newBounds, true);
    },

    update: function() {
        var oldCenterX = this._centerSpringX.getCurrent();
        var oldCenterY = this._centerSpringY.getCurrent();
        var oldZoom = this._zoomSpring.getCurrent();

        if (this.zoomPoint) {
            var oldZoomPixel = this.pixelFromPoint(this.zoomPoint, true);
        }

        this._zoomSpring.update();

        if (this.zoomPoint && this._zoomSpring.getCurrent() != oldZoom) {
            var newZoomPixel = this.pixelFromPoint(this.zoomPoint, true);
            var deltaZoomPixels = newZoomPixel.minus(oldZoomPixel);
            var deltaZoomPoints = this.deltaPointsFromPixels(deltaZoomPixels, true);

            this._centerSpringX.shiftBy(deltaZoomPoints.x);
            this._centerSpringY.shiftBy(deltaZoomPoints.y);
        } else {
            this.zoomPoint = null;
        }

        this._centerSpringX.update();
        this._centerSpringY.update();

        return this._centerSpringX.getCurrent() != oldCenterX ||
                this._centerSpringY.getCurrent() != oldCenterY ||
                this._zoomSpring.getCurrent() != oldZoom;
    },


    deltaPixelsFromPoints: function(deltaPoints, current) {
        return deltaPoints.times(this._containerSize.x * this.getZoom(current));
    },

    deltaPointsFromPixels: function(deltaPixels, current) {
        return deltaPixels.divide(this._containerSize.x * this.getZoom(current));
    },

    pixelFromPoint: function(point, current) {
        var bounds = this.getBounds(current);
        return point.minus(bounds.getTopLeft()).times(this._containerSize.x / bounds.width);
    },

    pointFromPixel: function(pixel, current) {
        var bounds = this.getBounds(current);
        return pixel.divide(this._containerSize.x / bounds.width).plus(bounds.getTopLeft());
    }
};

}( OpenSeadragon ));
