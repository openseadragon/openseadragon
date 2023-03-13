/*
 * OpenSeadragon - Drawer
 *
 * Copyright (C) 2009 CodePlex Foundation
 * Copyright (C) 2010-2022 OpenSeadragon contributors
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
 * @class HTMLDrawer
 * @memberof OpenSeadragon
 * @classdesc HTML-based implementation of DrawerBase for an {@link OpenSeadragon.Viewer}.
 * @param {Object} options - Options for this Drawer.
 * @param {OpenSeadragon.Viewer} options.viewer - The Viewer that owns this Drawer.
 * @param {OpenSeadragon.Viewport} options.viewport - Reference to Viewer viewport.
 * @param {Element} options.element - Parent element.
 * @param {Number} [options.debugGridColor] - See debugGridColor in {@link OpenSeadragon.Options} for details.
 */
$.HTMLDrawer = function(options) {

    $.DrawerBase.call(this, options);

    /**
     * 2d drawing context for {@link OpenSeadragon.Drawer#canvas} if it's a &lt;canvas&gt; element, otherwise null.
     * @member {Object} context
     * @memberof OpenSeadragon.Drawer#
     */
    this.context = null;


    // We force our container to ltr because our drawing math doesn't work in rtl.
    // This issue only affects our canvas renderer, but we do it always for consistency.
    // Note that this means overlays you want to be rtl need to be explicitly set to rtl.
    this.container.dir = 'ltr';

};

$.extend( $.HTMLDrawer.prototype, $.DrawerBase.prototype, /** @lends OpenSeadragon.Drawer.prototype */ {

    /**
     * Draws the TiledImages
     */
    draw: function(tiledImages) {
        var _this = this;
        this._prepareNewFrame(); // prepare to draw a new frame
        tiledImages.forEach(function(tiledImage){
            if (tiledImage.opacity !== 0 || tiledImage._preload) {
                // _this._updateViewportWithTiledImage(tiledImage);
                _this._drawTiles(tiledImage);
            }
            else {
                tiledImage._needsDraw = false;
            }
        });

    },

    /**
     * @returns {Boolean} False - rotation is not supported.
     */
    canRotate: function() {
        return false;
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
     * Turns image smoothing on or off for this viewer. Note: Ignored by HTML Drawer
     *
     * @function
     * @param {Boolean} [imageSmoothingEnabled] - Whether or not the image is
     * drawn smoothly on the canvas; see imageSmoothingEnabled in
     * {@link OpenSeadragon.Options} for more explanation.
     */
    setImageSmoothingEnabled: function(){
        // noop - HTML Drawer does not deal with this property
        $.console.warn('HTMLDrawer.setImageSmoothingEnabled does not have an effect.');
    },

    /**
     * @private
     * @inner
     * Clears the Drawer so it's ready to draw another frame.
     *
     */
    _prepareNewFrame: function() {
        this.canvas.innerHTML = "";
    },

    /* Methods from TiledImage */

    /**
     * @private
     * @inner
     * Handles drawing a single TiledImage to the canvas
     *
     */
    _updateViewportWithTiledImage: function(tiledImage) {
        var _this = this;
        tiledImage._needsDraw = false;
        tiledImage._tilesLoading = 0;
        tiledImage.loadingCoverage = {};

        // Reset tile's internal drawn state
        while (tiledImage.lastDrawn.length > 0) {
            var tile = tiledImage.lastDrawn.pop();
            tile.beingDrawn = false;
        }


        var drawArea = tiledImage.getDrawArea();
        if(!drawArea){
            return;
        }

        function updateTile(info){
            var tile = info.tile;
            if(tile && tile.loaded){
                var needsDraw = _this._blendTile(
                    tiledImage,
                    tile,
                    tile.x,
                    tile.y,
                    info.level,
                    info.levelOpacity,
                    info.currentTime
                );
                if(needsDraw){
                    tiledImage._needsDraw = true;
                }
            }
        }

        var infoArray = tiledImage.getTileInfoForDrawing();
        infoArray.forEach(updateTile);

        this._drawTiles(tiledImage);

    },



    /**
     * @private
     * @inner
     * Updates the opacity of a tile according to the time it has been on screen
     * to perform a fade-in.
     * Updates coverage once a tile is fully opaque.
     * Returns whether the fade-in has completed.
     *
     * @param {OpenSeadragon.Tile} tile
     * @param {Number} x
     * @param {Number} y
     * @param {Number} level
     * @param {Number} levelOpacity
     * @param {Number} currentTime
     * @returns {Boolean}
     */
    _blendTile: function( tiledImage, tile, x, y, level, levelOpacity, currentTime ){
        var blendTimeMillis = 1000 * tiledImage.blendTime,
            deltaTime,
            opacity;

        if ( !tile.blendStart ) {
            tile.blendStart = currentTime;
        }

        deltaTime   = currentTime - tile.blendStart;
        opacity     = blendTimeMillis ? Math.min( 1, deltaTime / ( blendTimeMillis ) ) : 1;

        if ( tiledImage.alwaysBlend ) {
            opacity *= levelOpacity;
        }

        tile.opacity = opacity;

        tiledImage.lastDrawn.push( tile );

        if ( opacity === 1 ) {
            tiledImage._setCoverage( tiledImage.coverage, level, x, y, true );
            tiledImage._hasOpaqueTile = true;
        } else if ( deltaTime < blendTimeMillis ) {
            return true;
        }

        return false;
    },

    /**
     * @private
     * @inner
     * Draws a TiledImage.
     *
     */
    _drawTiles: function( tiledImage ) {
        var lastDrawn = tiledImage.lastDrawn;
        if (tiledImage.opacity === 0 || (lastDrawn.length === 0 && !tiledImage.placeholderFillStyle)) {
            return;
        }

        // Iterate over the tiles to draw, and draw them
        for (var i = lastDrawn.length - 1; i >= 0; i--) {
            var tile = lastDrawn[ i ];
            this._drawTile( tile );
            tile.beingDrawn = true;

            if( this.viewer ){
                /**
                 * Raised when a tile is drawn to the canvas
                 *
                 * @event tile-drawn
                 * @memberof OpenSeadragon.Viewer
                 * @type {object}
                 * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
                 * @property {OpenSeadragon.TiledImage} tiledImage - Which TiledImage is being drawn.
                 * @property {OpenSeadragon.Tile} tile
                 * @property {?Object} userData - Arbitrary subscriber-defined object.
                 */
                this.viewer.raiseEvent( 'tile-drawn', {
                    tiledImage: tiledImage,
                    tile: tile
                });
            }
        }

    },

    /* Methods from Tile */

    /**
     * @private
     * @inner
     * Draws the given tile.
     * @param {OpenSeadragon.Tile} tile - The tile to draw.
     * @param {Function} drawingHandler - Method for firing the drawing event if using canvas.
     * drawingHandler({context, tile, rendered})
     */
    _drawTile: function( tile ) {
        $.console.assert(tile, '[Drawer._drawTile] tile is required');

        this._drawTileToHTML( tile, this.canvas );
    },


    /**
     * @private
     * @inner
     * Renders the tile in an html container.
     * @function
     * @param {OpenSeadragon.Tile} tile
     * @param {Element} container
     */
    _drawTileToHTML: function( tile, container ) {
        if (!tile.cacheImageRecord) {
            $.console.warn(
                '[Drawer._drawTileToHTML] attempting to draw tile %s when it\'s not cached',
                tile.toString());
            return;
        }

        if ( !tile.loaded ) {
            $.console.warn(
                "Attempting to draw tile %s when it's not yet loaded.",
                tile.toString()
            );
            return;
        }

        //EXPERIMENTAL - trying to figure out how to scale the container
        //               content during animation of the container size.

        if ( !tile.element ) {
            var image = tile.getImage();
            if (!image) {
                return;
            }

            tile.element                              = $.makeNeutralElement( "div" );
            tile.imgElement                           = image.cloneNode();
            tile.imgElement.style.msInterpolationMode = "nearest-neighbor";
            tile.imgElement.style.width               = "100%";
            tile.imgElement.style.height              = "100%";

            tile.style                     = tile.element.style;
            tile.style.position            = "absolute";
        }
        if ( tile.element.parentNode !== container ) {
            container.appendChild( tile.element );
        }
        if ( tile.imgElement.parentNode !== tile.element ) {
            tile.element.appendChild( tile.imgElement );
        }

        tile.style.top     = tile.position.y + "px";
        tile.style.left    = tile.position.x + "px";
        tile.style.height  = tile.size.y + "px";
        tile.style.width   = tile.size.x + "px";

        if (tile.flipped) {
            tile.style.transform = "scaleX(-1)";
        }

        $.setElementOpacity( tile.element, tile.opacity );
    },

});




}( OpenSeadragon ));
