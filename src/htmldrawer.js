/*
 * OpenSeadragon - HTMLDrawer
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

const OpenSeadragon = $; // alias back for JSDoc

/**
 * @class OpenSeadragon.HTMLDrawer
 * @extends OpenSeadragon.DrawerBase
 * @classdesc HTML-based implementation of DrawerBase for an {@link OpenSeadragon.Viewer}.
 * @param {Object} options - Options for this Drawer.
 * @param {OpenSeadragon.Viewer} options.viewer - The Viewer that owns this Drawer.
 * @param {OpenSeadragon.Viewport} options.viewport - Reference to Viewer viewport.
 * @param {Element} options.element - Parent element.
 * @param {Number} [options.debugGridColor] - See debugGridColor in {@link OpenSeadragon.Options} for details.
 */

class HTMLDrawer extends OpenSeadragon.DrawerBase{
    constructor(options){
        super(options);

        /**
         * The HTML element (div) that this drawer uses for drawing
         * @member {Element} canvas
         * @memberof OpenSeadragon.HTMLDrawer#
         */

        /**
         * The parent element of this Drawer instance, passed in when the Drawer was created.
         * The parent of {@link OpenSeadragon.WebGLDrawer#canvas}.
         * @member {Element} container
         * @memberof OpenSeadragon.HTMLDrawer#
         */

        // Reject listening for the tile-drawing event, which this drawer does not fire
        this.viewer.rejectEventHandler("tile-drawing", "The HTMLDrawer does not raise the tile-drawing event");
        // Since the tile-drawn event is fired by this drawer, make sure handlers can be added for it
        this.viewer.allowEventHandler("tile-drawn");

        // Wrap the node to be placed in the DOM: the positioning happens at draw time, but the elements
        // themselves are built here, when the cache is created.
        function _wrapTile(imgElement, data) {
            const element = $.makeNeutralElement( "div" );
            imgElement.style.msInterpolationMode = "nearest-neighbor";
            imgElement.style.width = "100%";
            imgElement.style.height = "100%";

            const style = element.style;
            style.position = "absolute";

            return {
                element, imgElement, style, data
            };
        }

        // The image is placed in the DOM as-is rather than cloned. cloneNode() only carries over the
        // src, so the clone has to load all over again - and by the time it does, the conversion has
        // already destroyed the source, which releases the object URL a Blob-decoded image loads from.
        // The element is already decoded, so reusing it needs no URL and no second decode.
        function _prepareImageTile(tile, data) {
            return _wrapTile(data, data);
        }

        function _copyCanvas(source) {
            const canvas = document.createElement( "canvas" );
            canvas.width = source.width;
            canvas.height = source.height;
            canvas.getContext('2d').drawImage(source, 0, 0);
            return canvas;
        }

        // A canvas cannot be handled the same way as an image: cloneNode() on a canvas copies attributes
        // only and never the bitmap, and the source context2d is destroyed - its canvas resized to zero -
        // as soon as this conversion step returns. So the pixels have to be copied out right here, and
        // that copy is then both the node placed in the DOM and the data this cache holds.
        function _prepareCanvasTile(tile, context) {
            const canvas = _copyCanvas(context.canvas);
            return _wrapTile(canvas, canvas);
        }

        // Going back has to copy as well, rather than handing out a context on the canvas that is live in
        // the DOM: the receiver owns what it gets, and the context2d destructor resizes its canvas to zero,
        // which would blank the tile this drawer is currently displaying.
        function _canvasTileToContext(tile, data) {
            return _copyCanvas(data.data).getContext('2d');
        }

        // Accepting context2d directly matters for performance: reaching the image type from a canvas
        // means encoding the tile (toBlob) and decoding it again, whereas this is a single drawImage.
        $.converter.learn("context2d", HTMLDrawer.canvasCacheType, _prepareCanvasTile, 1, 1);
        $.converter.learn("image", HTMLDrawer.imageCacheType, _prepareImageTile, 1, 1);
        // Also learn how to move back, since these elements can be just used as-is
        $.converter.learn(HTMLDrawer.canvasCacheType, "context2d", _canvasTileToContext, 1, 3);
        $.converter.learn(HTMLDrawer.imageCacheType, "image", (t, d) => d.data, 1, 3);

        function _freeTile(data) {
            if ( data.imgElement && data.imgElement.parentNode ) {
                data.imgElement.parentNode.removeChild( data.imgElement );
            }
            if ( data.element && data.element.parentNode ) {
                data.element.parentNode.removeChild( data.element );
            }
        }

        // The canvas is a copy this cache owns exclusively - the way back out copies again - so its
        // bitmap can be released here. Detaching the node only makes it collectable eventually, and
        // Safari holds canvas memory until width and height are set to zero.
        $.converter.learnDestroy(HTMLDrawer.canvasCacheType, data => {
            _freeTile(data);
            data.data.width = 0;
            data.data.height = 0;
        });
        // The image type holds an element owned by the 'image' cache it came from, so it is only detached.
        $.converter.learnDestroy(HTMLDrawer.imageCacheType, _freeTile);
    }

    static get imageCacheType() {
        return 'htmlDrawer[image]';
    }

    static get canvasCacheType() {
        return 'htmlDrawer[canvas]';
    }

    /**
     * @param {Object} options - Options for this drawer.
     * @returns {Boolean} always true
     */
    static isSupported(options) {
        return true;
    }

    /**
     *
     * @returns 'html'
     */
    getType(){
        return 'html';
    }

    getSupportedDataFormats() {
        return [HTMLDrawer.imageCacheType, HTMLDrawer.canvasCacheType];
    }

    /**
     * @param {TiledImage} tiledImage the tiled image that is calling the function
     * @returns {Boolean} Whether this drawer requires enforcing minimum tile overlap to avoid showing seams.
     * @private
     */
    minimumOverlapRequired(tiledImage) {
        return true;
    }

    /**
     * create the HTML element (e.g. canvas, div) that the image will be drawn into
     * @returns {Element} the div to draw into
     */
    _createDrawingElement(){
        return $.makeNeutralElement("div");
    }

    /**
     * Draws the TiledImages
     */
    draw(tiledImages) {
        const _this = this;
        this._prepareNewFrame(); // prepare to draw a new frame
        tiledImages.forEach(function(tiledImage){
            if (tiledImage.opacity !== 0) {
                _this._drawTiles(tiledImage);
            }
        });

    }

    /**
     * @returns {Boolean} False - rotation is not supported.
     */
    canRotate() {
        return false;
    }

    /**
     * Destroy the drawer (unload current loaded tiles)
     */
    destroy() {
        super.destroy();
        this.container.removeChild(this.canvas);
    }

    /**
     * This function is ignored by the HTML Drawer. Implementing it is required by DrawerBase.
     * @param {Boolean} [imageSmoothingEnabled] - Whether or not the image is
     * drawn smoothly on the canvas; see imageSmoothingEnabled in
     * {@link OpenSeadragon.Options} for more explanation.
     */
    setImageSmoothingEnabled(){
        // noop - HTML Drawer does not deal with this property
    }

    /**
     * Clears the Drawer so it's ready to draw another frame.
     * @private
     *
     */
    _prepareNewFrame() {
        this.canvas.innerHTML = "";
    }

    /**
     * Draws a TiledImage.
     * @private
     *
     */
    _drawTiles( tiledImage ) {
        const lastDrawn = tiledImage.getTilesToDraw().map(info => info.tile);
        if (tiledImage.opacity === 0 || (lastDrawn.length === 0 && !tiledImage.placeholderFillStyle)) {
            return;
        }

        // Iterate over the tiles to draw, and draw them
        for (let i = 0; i < lastDrawn.length; i++) {
            const tile = lastDrawn[ i ];
            this._drawTile( tile );

            if( this.viewer ){
                /**
                 * Raised when a tile is drawn to the canvas. Only valid for
                 * context2d and html drawers.
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

    }

    /**
     * Draws the given tile.
     * @private
     * @param {OpenSeadragon.Tile} tile - The tile to draw.
     * @param {Function} drawingHandler - Method for firing the drawing event if using canvas.
     * drawingHandler({context, tile, rendered})
     */
    _drawTile( tile ) {
        $.console.assert(tile, '[Drawer._drawTile] tile is required');

        let container = this.canvas;

        if ( !tile.loaded ) {
            $.console.warn(
                "Attempting to draw tile %s when it's not yet loaded.",
                tile.toString()
            );
            return;
        }

        //EXPERIMENTAL - trying to figure out how to scale the container
        //               content during animation of the container size.

        const dataObject = this.getDataToDraw(tile);
        if (!dataObject) {
            return;
        }

        if ( dataObject.element.parentNode !== container ) {
            container.appendChild( dataObject.element );
        }
        if ( dataObject.imgElement.parentNode !== dataObject.element ) {
            dataObject.element.appendChild( dataObject.imgElement );
        }

        dataObject.style.top     = tile.position.y + "px";
        dataObject.style.left    = tile.position.x + "px";
        dataObject.style.height  = tile.size.y + "px";
        dataObject.style.width   = tile.size.x + "px";

        if (tile.flipped) {
            dataObject.style.transform = "scaleX(-1)";
        }

        $.setElementOpacity( dataObject.element, tile.opacity );
    }
}

$.HTMLDrawer = HTMLDrawer;


}( OpenSeadragon ));
