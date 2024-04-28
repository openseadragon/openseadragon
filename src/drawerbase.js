/*
 * OpenSeadragon - DrawerBase
 *
 * Copyright (C) 2009 CodePlex Foundation
 * Copyright (C) 2010-2024 OpenSeadragon contributors
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

    const OpenSeadragon = $; // (re)alias back to OpenSeadragon for JSDoc
/**
 * @class OpenSeadragon.DrawerBase
 * @classdesc Base class for Drawers that handle rendering of tiles for an {@link OpenSeadragon.Viewer}.
 * @param {Object} options - Options for this Drawer.
 * @param {OpenSeadragon.Viewer} options.viewer - The Viewer that owns this Drawer.
 * @param {OpenSeadragon.Viewport} options.viewport - Reference to Viewer viewport.
 * @param {HTMLElement} options.element - Parent element.
 * @abstract
 */

OpenSeadragon.DrawerBase = class DrawerBase{
    constructor(options){
        $.console.assert( options.viewer, "[Drawer] options.viewer is required" );
        $.console.assert( options.viewport, "[Drawer] options.viewport is required" );
        $.console.assert( options.element, "[Drawer] options.element is required" );

        this.viewer = options.viewer;
        this.viewport = options.viewport;
        this.debugGridColor = typeof options.debugGridColor === 'string' ? [options.debugGridColor] : options.debugGridColor || $.DEFAULT_SETTINGS.debugGridColor;
        this.options = options.options || {};

        this.container  = $.getElement( options.element );

        this._renderingTarget = this._createDrawingElement();


        this.canvas.style.width     = "100%";
        this.canvas.style.height    = "100%";
        this.canvas.style.position  = "absolute";
        // set canvas.style.left = 0 so the canvas is positioned properly in ltr and rtl html
        this.canvas.style.left = "0";
        $.setElementOpacity( this.canvas, this.viewer.opacity, true );

        // Allow pointer events to pass through the canvas element so implicit
        //   pointer capture works on touch devices
        $.setElementPointerEventsNone( this.canvas );
        $.setElementTouchActionNone( this.canvas );

        // explicit left-align
        this.container.style.textAlign = "left";
        this.container.appendChild( this.canvas );

        this._checkForAPIOverrides();
    }

    // protect the canvas member with a getter
    get canvas(){
        return this._renderingTarget;
    }
    get element(){
        $.console.error('Drawer.element is deprecated. Use Drawer.container instead.');
        return this.container;
    }

    /**
     * @abstract
     * @returns {String | undefined} What type of drawer this is. Must be overridden by extending classes.
     */
    getType(){
        $.console.error('Drawer.getType must be implemented by child class');
        return undefined;
    }

    /**
     * @abstract
     * @returns {Boolean} Whether the drawer implementation is supported by the browser. Must be overridden by extending classes.
     */
    static isSupported() {
        $.console.error('Drawer.isSupported must be implemented by child class');
    }

    /**
     * @abstract
     * @returns {Element} the element to draw into
     * @private
     */
    _createDrawingElement() {
        $.console.error('Drawer._createDrawingElement must be implemented by child class');
        return null;
    }

    /**
     * @abstract
     * @param {Array} tiledImages - An array of TiledImages that are ready to be drawn.
     * @private
     */
    draw(tiledImages) {
        $.console.error('Drawer.draw must be implemented by child class');
    }

    /**
     * @abstract
     * @returns {Boolean} True if rotation is supported.
     */
    canRotate() {
        $.console.error('Drawer.canRotate must be implemented by child class');
    }

    /**
     * @abstract
     */
    destroy() {
        $.console.error('Drawer.destroy must be implemented by child class');
    }

    /**
     * @param {TiledImage} tiledImage the tiled image that is calling the function
     * @returns {Boolean} Whether this drawer requires enforcing minimum tile overlap to avoid showing seams.
     * @private
     */
    minimumOverlapRequired(tiledImage) {
        return false;
    }


    /**
     * @abstract
     * @param {Boolean} [imageSmoothingEnabled] - Whether or not the image is
     * drawn smoothly on the canvas; see imageSmoothingEnabled in
     * {@link OpenSeadragon.Options} for more explanation.
     */
    setImageSmoothingEnabled(imageSmoothingEnabled){
        $.console.error('Drawer.setImageSmoothingEnabled must be implemented by child class');
    }

    /**
     * Optional public API to draw a rectangle (e.g. for debugging purposes)
     * Child classes can override this method if they wish to support this
     * @param {OpenSeadragon.Rect} rect
     */
    drawDebuggingRect(rect) {
        $.console.warn('[drawer].drawDebuggingRect is not implemented by this drawer');
    }

    // Deprecated functions
    clear(){
        $.console.warn('[drawer].clear() is deprecated. The drawer is responsible for clearing itself as needed before drawing tiles.');
    }

    // Private functions

    /**
     * Ensures that child classes have provided implementations for public API methods
     * draw, canRotate, destroy, and setImageSmoothinEnabled. Throws an exception if the original
     * placeholder methods are still in place.
     * @private
     *
     */
    _checkForAPIOverrides(){
        if(this._createDrawingElement === $.DrawerBase.prototype._createDrawingElement){
            throw(new Error("[drawer]._createDrawingElement must be implemented by child class"));
        }
        if(this.draw === $.DrawerBase.prototype.draw){
            throw(new Error("[drawer].draw must be implemented by child class"));
        }
        if(this.canRotate === $.DrawerBase.prototype.canRotate){
            throw(new Error("[drawer].canRotate must be implemented by child class"));
        }
        if(this.destroy === $.DrawerBase.prototype.destroy){
            throw(new Error("[drawer].destroy must be implemented by child class"));
        }
        if(this.setImageSmoothingEnabled === $.DrawerBase.prototype.setImageSmoothingEnabled){
            throw(new Error("[drawer].setImageSmoothingEnabled must be implemented by child class"));
        }
    }


    // Utility functions

    /**
     * Scale from OpenSeadragon viewer rectangle to drawer rectangle
     * (ignoring rotation)
     * @param {OpenSeadragon.Rect} rectangle - The rectangle in viewport coordinate system.
     * @returns {OpenSeadragon.Rect} Rectangle in drawer coordinate system.
     */
    viewportToDrawerRectangle(rectangle) {
        var topLeft = this.viewport.pixelFromPointNoRotate(rectangle.getTopLeft(), true);
        var size = this.viewport.deltaPixelsFromPointsNoRotate(rectangle.getSize(), true);

        return new $.Rect(
            topLeft.x * $.pixelDensityRatio,
            topLeft.y * $.pixelDensityRatio,
            size.x * $.pixelDensityRatio,
            size.y * $.pixelDensityRatio
        );
    }

    /**
     * This function converts the given point from to the drawer coordinate by
     * multiplying it with the pixel density.
     * This function does not take rotation into account, thus assuming provided
     * point is at 0 degree.
     * @param {OpenSeadragon.Point} point - the pixel point to convert
     * @returns {OpenSeadragon.Point} Point in drawer coordinate system.
     */
    viewportCoordToDrawerCoord(point) {
        var vpPoint = this.viewport.pixelFromPointNoRotate(point, true);
        return new $.Point(
            vpPoint.x * $.pixelDensityRatio,
            vpPoint.y * $.pixelDensityRatio
        );
    }


    // Internal utility functions

    /**
     * Calculate width and height of the canvas based on viewport dimensions
     * and pixelDensityRatio
     * @private
     * @returns {OpenSeadragon.Point} {x, y} size of the canvas
     */
    _calculateCanvasSize() {
        var pixelDensityRatio = $.pixelDensityRatio;
        var viewportSize = this.viewport.getContainerSize();
        return new OpenSeadragon.Point( Math.round(viewportSize.x * pixelDensityRatio), Math.round(viewportSize.y * pixelDensityRatio));
    }

    /**
     * Called by implementations to fire the tiled-image-drawn event (used by tests)
     * @private
     */
    _raiseTiledImageDrawnEvent(tiledImage, tiles){
        if(!this.viewer) {
            return;
        }

        /**
        *  Raised when a tiled image is drawn to the canvas. Used internally for testing.
        *  The update-viewport event is preferred if you want to know when a frame has been drawn.
        *
        * @event tiled-image-drawn
        * @memberof OpenSeadragon.Viewer
        * @type {object}
        * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
        * @property {OpenSeadragon.TiledImage} tiledImage - Which TiledImage is being drawn.
        * @property {Array} tiles - An array of Tile objects that were drawn.
        * @property {?Object} userData - Arbitrary subscriber-defined object.
        * @private
        */
        this.viewer.raiseEvent( 'tiled-image-drawn', {
            tiledImage: tiledImage,
            tiles: tiles,
        });
    }

    /**
     * Called by implementations to fire the drawer-error event
     * @private
     */
    _raiseDrawerErrorEvent(tiledImage, errorMessage){
        if(!this.viewer) {
            return;
        }

        /**
        *  Raised when a tiled image is drawn to the canvas. Used internally for testing.
        *  The update-viewport event is preferred if you want to know when a frame has been drawn.
        *
        * @event drawer-error
        * @memberof OpenSeadragon.Viewer
        * @type {object}
        * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
        * @property {OpenSeadragon.TiledImage} tiledImage - Which TiledImage is being drawn.
        * @property {OpenSeadragon.DrawerBase} drawer - The drawer that raised the error.
        * @property {String} error - A message describing the error.
        * @property {?Object} userData - Arbitrary subscriber-defined object.
        * @private
        */
        this.viewer.raiseEvent( 'drawer-error', {
            tiledImage: tiledImage,
            drawer: this,
            error: errorMessage,
        });
    }


};

}( OpenSeadragon ));
