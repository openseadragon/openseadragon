/*
 * OpenSeadragon - Drawer
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
 * @class Drawer
 * @memberof OpenSeadragon
 * @classdesc Handles rendering of tiles for an {@link OpenSeadragon.Viewer}.
 * @param {Object} options - Options for this Drawer.
 * @param {OpenSeadragon.Viewer} options.viewer - The Viewer that owns this Drawer.
 * @param {OpenSeadragon.Viewport} options.viewport - Reference to Viewer viewport.
 * @param {Element} options.element - Parent element.
 * @param {Number} [options.opacity=1] - See opacity in {@link OpenSeadragon.Options} for details.
 * @param {Number} [options.debugGridColor] - See debugGridColor in {@link OpenSeadragon.Options} for details.
 */
$.Drawer = function( options ) {
    var _this = this;

    $.console.assert( options.viewer, "[Drawer] options.viewer is required" );

    //backward compatibility for positional args while prefering more
    //idiomatic javascript options object as the only argument
    var args  = arguments;

    if( !$.isPlainObject( options ) ){
        options = {
            source:     args[ 0 ], // Reference to Viewer tile source.
            viewport:   args[ 1 ], // Reference to Viewer viewport.
            element:    args[ 2 ]  // Parent element.
        };
    }

    $.console.assert( options.viewport, "[Drawer] options.viewport is required" );
    $.console.assert( options.element, "[Drawer] options.element is required" );

    if ( options.source ) {
        $.console.error( "[Drawer] options.source is no longer accepted; use TiledImage instead" );
    }

    this.viewer = options.viewer;
    this.viewport = options.viewport;
    this.debugGridColor = options.debugGridColor || $.DEFAULT_SETTINGS.debugGridColor;
    this.opacity = options.opacity === undefined ? $.DEFAULT_SETTINGS.opacity : options.opacity;

    this.useCanvas  = $.supportsCanvas && ( this.viewer ? this.viewer.useCanvas : true );
    /**
     * The parent element of this Drawer instance, passed in when the Drawer was created.
     * The parent of {@link OpenSeadragon.Drawer#canvas}.
     * @member {Element} container
     * @memberof OpenSeadragon.Drawer#
     */
    this.container  = $.getElement( options.element );
    /**
     * A &lt;canvas&gt; element if the browser supports them, otherwise a &lt;div&gt; element.
     * Child element of {@link OpenSeadragon.Drawer#container}.
     * @member {Element} canvas
     * @memberof OpenSeadragon.Drawer#
     */
    this.canvas     = $.makeNeutralElement( this.useCanvas ? "canvas" : "div" );
    /**
     * 2d drawing context for {@link OpenSeadragon.Drawer#canvas} if it's a &lt;canvas&gt; element, otherwise null.
     * @member {Object} context
     * @memberof OpenSeadragon.Drawer#
     */
    this.context    = this.useCanvas ? this.canvas.getContext( "2d" ) : null;

    /**
     * @member {Element} element
     * @memberof OpenSeadragon.Drawer#
     * @deprecated Alias for {@link OpenSeadragon.Drawer#container}.
     */
    this.element    = this.container;

    // We force our container to ltr because our drawing math doesn't work in rtl.
    // This issue only affects our canvas renderer, but we do it always for consistency.
    // Note that this means overlays you want to be rtl need to be explicitly set to rtl.
    this.container.dir = 'ltr';

    // check canvas available width and height, set canvas width and height such that the canvas backing store is set to the proper pixel density
    if (this.useCanvas) {
        var viewportSize = this._calculateCanvasSize();
        this.canvas.width = viewportSize.x;
        this.canvas.height = viewportSize.y;
    }

    this.canvas.style.width     = "100%";
    this.canvas.style.height    = "100%";
    this.canvas.style.position  = "absolute";
    $.setElementOpacity( this.canvas, this.opacity, true );

    // explicit left-align
    this.container.style.textAlign = "left";
    this.container.appendChild( this.canvas );
};

$.Drawer.prototype = /** @lends OpenSeadragon.Drawer.prototype */{
    // deprecated
    addOverlay: function( element, location, placement, onDraw ) {
        $.console.error("drawer.addOverlay is deprecated. Use viewer.addOverlay instead.");
        this.viewer.addOverlay( element, location, placement, onDraw );
        return this;
    },

    // deprecated
    updateOverlay: function( element, location, placement ) {
        $.console.error("drawer.updateOverlay is deprecated. Use viewer.updateOverlay instead.");
        this.viewer.updateOverlay( element, location, placement );
        return this;
    },

    // deprecated
    removeOverlay: function( element ) {
        $.console.error("drawer.removeOverlay is deprecated. Use viewer.removeOverlay instead.");
        this.viewer.removeOverlay( element );
        return this;
    },

    // deprecated
    clearOverlays: function() {
        $.console.error("drawer.clearOverlays is deprecated. Use viewer.clearOverlays instead.");
        this.viewer.clearOverlays();
        return this;
    },

    /**
     * Set the opacity of the drawer.
     * @param {Number} opacity
     * @return {OpenSeadragon.Drawer} Chainable.
     */
    setOpacity: function( opacity ) {
        this.opacity = opacity;
        $.setElementOpacity( this.canvas, this.opacity, true );
        return this;
    },

    /**
     * Get the opacity of the drawer.
     * @returns {Number}
     */
    getOpacity: function() {
        return this.opacity;
    },

    // deprecated
    needsUpdate: function() {
        $.console.error( "[Drawer.needsUpdate] this function is deprecated. Use World.needsDraw instead." );
        return this.viewer.world.needsDraw();
    },

    // deprecated
    numTilesLoaded: function() {
        $.console.error( "[Drawer.numTilesLoaded] this function is deprecated. Use TileCache.numTilesLoaded instead." );
        return this.viewer.tileCache.numTilesLoaded();
    },

    // deprecated
    reset: function() {
        $.console.error( "[Drawer.reset] this function is deprecated. Use World.resetItems instead." );
        this.viewer.world.resetItems();
        return this;
    },

    // deprecated
    update: function() {
        $.console.error( "[Drawer.update] this function is deprecated. Use Drawer.clear and World.draw instead." );
        this.clear();
        this.viewer.world.draw();
        return this;
    },

    /**
     * @return {Boolean} True if rotation is supported.
     */
    canRotate: function() {
        return this.useCanvas;
    },

    /**
     * Destroy the drawer (unload current loaded tiles)
     */
    destroy: function() {
        //force unloading of current canvas (1x1 will be gc later, trick not necessarily needed)
        this.canvas.width  = 1;
        this.canvas.height = 1;
    },

    /**
     * Clears the Drawer so it's ready to draw another frame.
     */
    clear: function() {
        this.canvas.innerHTML = "";
        if ( this.useCanvas ) {
            var viewportSize = this._calculateCanvasSize();
            if( this.canvas.width != viewportSize.x ||
                this.canvas.height != viewportSize.y ) {
                this.canvas.width = viewportSize.x;
                this.canvas.height = viewportSize.y;
            }
            this.context.clearRect( 0, 0, viewportSize.x, viewportSize.y );
        }
    },

    /**
     * Draws the given tile.
     * @param {OpenSeadragon.Tile} tile - The tile to draw.
     * @param {Function} drawingHandler - Method for firing the drawing event if using canvas.
     * drawingHandler({context, tile, rendered})
     * where <code>rendered</code> is the context with the pre-drawn image.
     */
    drawTile: function( tile, drawingHandler ) {
        $.console.assert(tile, '[Drawer.drawTile] tile is required');
        $.console.assert(drawingHandler, '[Drawer.drawTile] drawingHandler is required');

        if ( this.useCanvas ) {
            // TODO do this in a more performant way
            // specifically, don't save,rotate,restore every time we draw a tile
            if( this.viewport.degrees !== 0 ) {
                this._offsetForRotation( tile, this.viewport.degrees );
                tile.drawCanvas( this.context, drawingHandler );
                this._restoreRotationChanges( tile );
            } else {
                tile.drawCanvas( this.context, drawingHandler );
            }
        } else {
            tile.drawHTML( this.canvas );
        }
    },

    // private
    saveContext: function() {
        if (!this.useCanvas) {
            return;
        }

        this.context.save();
    },

    // private
    restoreContext: function() {
        if (!this.useCanvas) {
            return;
        }

        this.context.restore();
    },

    // private
    setClip: function(rect) {
        if (!this.useCanvas) {
            return;
        }

        this.context.beginPath();
        this.context.rect(rect.x, rect.y, rect.width, rect.height);
        this.context.clip();
    },

    // private
    drawPlaceholder: function(rect) {
        if (!this.useCanvas) {
            return;
        }

        this.context.fillRect(rect.x, rect.y, rect.width, rect.height);
        this.context.fillStyle = "#000000";
    },

    // private
    drawDebugInfo: function( tile, count, i ){
        if ( this.useCanvas ) {
            this.context.save();
            this.context.lineWidth = 2 * $.pixelDensityRatio;
            this.context.font = 'small-caps bold ' + (13 * $.pixelDensityRatio) + 'px arial';
            this.context.strokeStyle = this.debugGridColor;
            this.context.fillStyle = this.debugGridColor;

            if ( this.viewport.degrees !== 0 ) {
                this._offsetForRotation( tile, this.canvas, this.context, this.viewport.degrees );
            }

            this.context.strokeRect(
                tile.position.x * $.pixelDensityRatio,
                tile.position.y * $.pixelDensityRatio,
                tile.size.x * $.pixelDensityRatio,
                tile.size.y * $.pixelDensityRatio
            );

            var tileCenterX = (tile.position.x + (tile.size.x / 2)) * $.pixelDensityRatio;
            var tileCenterY = (tile.position.y + (tile.size.y / 2)) * $.pixelDensityRatio;

            // Rotate the text the right way around.
            this.context.translate( tileCenterX, tileCenterY );
            this.context.rotate( Math.PI / 180 * -this.viewport.degrees );
            this.context.translate( -tileCenterX, -tileCenterY );

            if( tile.x === 0 && tile.y === 0 ){
                this.context.fillText(
                    "Zoom: " + this.viewport.getZoom(),
                    tile.position.x * $.pixelDensityRatio,
                    (tile.position.y - 30) * $.pixelDensityRatio
                );
                this.context.fillText(
                    "Pan: " + this.viewport.getBounds().toString(),
                    tile.position.x * $.pixelDensityRatio,
                    (tile.position.y - 20) * $.pixelDensityRatio
                );
            }
            this.context.fillText(
                "Level: " + tile.level,
                (tile.position.x + 10) * $.pixelDensityRatio,
                (tile.position.y + 20) * $.pixelDensityRatio
            );
            this.context.fillText(
                "Column: " + tile.x,
                (tile.position.x + 10) * $.pixelDensityRatio,
                (tile.position.y + 30) * $.pixelDensityRatio
            );
            this.context.fillText(
                "Row: " + tile.y,
                (tile.position.x + 10) * $.pixelDensityRatio,
                (tile.position.y + 40) * $.pixelDensityRatio
            );
            this.context.fillText(
                "Order: " + i + " of " + count,
                (tile.position.x + 10) * $.pixelDensityRatio,
                (tile.position.y + 50) * $.pixelDensityRatio
            );
            this.context.fillText(
                "Size: " + tile.size.toString(),
                (tile.position.x + 10) * $.pixelDensityRatio,
                (tile.position.y + 60) * $.pixelDensityRatio
            );
            this.context.fillText(
                "Position: " + tile.position.toString(),
                (tile.position.x + 10) * $.pixelDensityRatio,
                (tile.position.y + 70) * $.pixelDensityRatio
            );

            if ( this.viewport.degrees !== 0 ) {
                this._restoreRotationChanges( tile, this.canvas, this.context );
            }
            this.context.restore();
        }
    },

    // private
    debugRect: function(rect) {
        if ( this.useCanvas ) {
            this.context.save();
            this.context.lineWidth = 2 * $.pixelDensityRatio;
            this.context.strokeStyle = this.debugGridColor;
            this.context.fillStyle = this.debugGridColor;

            this.context.strokeRect(
                rect.x * $.pixelDensityRatio,
                rect.y * $.pixelDensityRatio,
                rect.width * $.pixelDensityRatio,
                rect.height * $.pixelDensityRatio
            );

            this.context.restore();
        }
    },

    // private
    _offsetForRotation: function( tile, degrees ){
        var cx = this.canvas.width / 2,
            cy = this.canvas.height / 2,
            px = tile.position.x - cx,
            py = tile.position.y - cy;

        this.context.save();

        this.context.translate(cx, cy);
        this.context.rotate( Math.PI / 180 * degrees);
        tile.position.x = px;
        tile.position.y = py;
    },

    // private
    _restoreRotationChanges: function( tile ){
        var cx = this.canvas.width / 2,
            cy = this.canvas.height / 2,
            px = tile.position.x + cx,
            py = tile.position.y + cy;

        tile.position.x = px;
        tile.position.y = py;

        this.context.restore();
    },

    // private
    _calculateCanvasSize: function() {
        var pixelDensityRatio = $.pixelDensityRatio;
        var viewportSize = this.viewport.getContainerSize();
        return {
            x: viewportSize.x * pixelDensityRatio,
            y: viewportSize.y * pixelDensityRatio
        };
    }
};

}( OpenSeadragon ));
