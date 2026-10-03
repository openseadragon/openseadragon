/*
 * OpenSeadragon - World
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
 * @class World
 * @memberof OpenSeadragon
 * @extends OpenSeadragon.EventSource
 * @classdesc Keeps track of all of the tiled images in the scene.
 * @param {Object} options - World options.
 * @param {OpenSeadragon.Viewer} options.viewer - The Viewer that owns this World.
 **/
$.World = function( options ) {
    const _this = this;

    $.console.assert( options.viewer, "[World] options.viewer is required" );

    $.EventSource.call( this );

    this.viewer = options.viewer;
    this._items = [];
    this._needsDraw = false;
    this._invalidationManager = new $.TileInvalidationManager(this);
    this._autoRefigureSizes = true;
    this._needsSizesFigured = false;
    this._delegatedFigureSizes = function(event) {
        if (_this._autoRefigureSizes) {
            _this._figureSizes();
        } else {
            _this._needsSizesFigured = true;
        }
    };

    this._figureSizes();
};

$.extend( $.World.prototype, $.EventSource.prototype, /** @lends OpenSeadragon.World.prototype */{
    /**
     * Add the specified item.
     * @param {OpenSeadragon.TiledImage} item - The item to add.
     * @param {Object} options - Options affecting insertion.
     * @param {Number} [options.index] - Index for the item. If not specified, goes at the top.
     * @fires OpenSeadragon.World.event:add-item
     * @fires OpenSeadragon.World.event:metrics-change
     */
    addItem: function( item, options ) {
        $.console.assert(item, "[World.addItem] item is required");
        $.console.assert(item instanceof $.TiledImage, "[World.addItem] only TiledImages supported at this time");

        options = options || {};
        if (options.index !== undefined) {
            const index = Math.max(0, Math.min(this._items.length, options.index));
            this._items.splice(index, 0, item);
        } else {
            this._items.push( item );
        }

        if (this._autoRefigureSizes) {
            this._figureSizes();
        } else {
            this._needsSizesFigured = true;
        }

        this._needsDraw = true;

        item.addHandler('bounds-change', this._delegatedFigureSizes);
        item.addHandler('clip-change', this._delegatedFigureSizes);

        /**
         * Raised when an item is added to the World.
         * @event add-item
         * @memberOf OpenSeadragon.World
         * @type {object}
         * @property {OpenSeadragon.Viewer} eventSource - A reference to the World which raised the event.
         * @property {OpenSeadragon.TiledImage} item - The item that has been added.
         * @property {?Object} userData - Arbitrary subscriber-defined object.
         */
        this.raiseEvent( 'add-item', {
            item: item
        } );
    },

    /**
     * Get the item at the specified index.
     * @param {Number} index - The item's index.
     * @returns {OpenSeadragon.TiledImage} The item at the specified index.
     */
    getItemAt: function( index ) {
        $.console.assert(index !== undefined, "[World.getItemAt] index is required");
        return this._items[ index ];
    },

    /**
     * Get the index of the given item or -1 if not present.
     * @param {OpenSeadragon.TiledImage} item - The item.
     * @returns {Number} The index of the item or -1 if not present.
     */
    getIndexOfItem: function( item ) {
        $.console.assert(item, "[World.getIndexOfItem] item is required");
        return $.indexOf( this._items, item );
    },

    /**
     * @returns {Number} The number of items used.
     */
    getItemCount: function() {
        return this._items.length;
    },

    /**
     * Change the index of a item so that it appears over or under others.
     * @param {OpenSeadragon.TiledImage} item - The item to move.
     * @param {Number} index - The new index.
     * @fires OpenSeadragon.World.event:item-index-change
     */
    setItemIndex: function( item, index ) {
        $.console.assert(item, "[World.setItemIndex] item is required");
        $.console.assert(index !== undefined, "[World.setItemIndex] index is required");

        const oldIndex = this.getIndexOfItem( item );

        if ( index >= this._items.length ) {
            throw new Error( "Index bigger than number of layers." );
        }

        this._items.splice( oldIndex, 1 );
        this._items.splice( index, 0, item );
        this._needsDraw = true;

        /**
         * Raised when the order of the indexes has been changed.
         * @event item-index-change
         * @memberOf OpenSeadragon.World
         * @type {object}
         * @property {OpenSeadragon.World} eventSource - A reference to the World which raised the event.
         * @property {OpenSeadragon.TiledImage} item - The item whose index has
         * been changed
         * @property {Number} previousIndex - The previous index of the item
         * @property {Number} newIndex - The new index of the item
         * @property {?Object} userData - Arbitrary subscriber-defined object.
         */
        this.raiseEvent( 'item-index-change', {
            item: item,
            previousIndex: oldIndex,
            newIndex: index
        } );
    },

    /**
     * Remove an item.
     * @param {OpenSeadragon.TiledImage} item - The item to remove.
     * @fires OpenSeadragon.World.event:remove-item
     * @fires OpenSeadragon.World.event:metrics-change
     */
    removeItem: function( item ) {
        $.console.assert(item, "[World.removeItem] item is required");

        const index = $.indexOf(this._items, item );
        if ( index === -1 ) {
            return;
        }

        item.removeHandler('bounds-change', this._delegatedFigureSizes);
        item.removeHandler('clip-change', this._delegatedFigureSizes);
        item.destroy();
        this._items.splice( index, 1 );
        this._figureSizes();
        this._needsDraw = true;
        this._raiseRemoveItem(item);
    },

    /**
     * Remove all items.
     * @fires OpenSeadragon.World.event:remove-item
     * @fires OpenSeadragon.World.event:metrics-change
     */
    removeAll: function() {
        // We need to make sure any pending images are canceled so the world items don't get messed up
        this.viewer._cancelPendingImages();
        let item;
        for (let i = 0; i < this._items.length; i++) {
            item = this._items[i];
            item.removeHandler('bounds-change', this._delegatedFigureSizes);
            item.removeHandler('clip-change', this._delegatedFigureSizes);
            item.destroy();
        }

        const removedItems = this._items;
        this._items = [];
        this._figureSizes();
        this._needsDraw = true;

        for (let i = 0; i < removedItems.length; i++) {
            item = removedItems[i];
            this._raiseRemoveItem(item);
        }
    },

    /**
     * Forces the system consider all tiles across all tiled images
     * as outdated, and fire tile update event on relevant tiles
     * Detailed description is available within the 'tile-invalidated'
     * event.
     * @param {Boolean} [restoreTiles=true] if true, tile processing starts from the tile original data
     * @param {number} [tStamp=OpenSeadragon.now()] optionally provide tStamp of the update event
     * @function
     * @fires OpenSeadragon.Viewer.event:tile-invalidated
     * @return {OpenSeadragon.Promise<?>}
     */
    requestInvalidate: function (restoreTiles = true, tStamp = $.now()) {
        return this._invalidationManager.requestInvalidate(restoreTiles, tStamp);
    },

    /**
     * Requests tile data update.
     * @function OpenSeadragon.Viewer.prototype._updateSequenceButtons
     * @private
     * @param {OpenSeadragon.Tile[]} tilesToProcess tiles to update
     * @param {Number} tStamp timestamp in milliseconds, if active timestamp of the same value is executing,
     *   changes are added to the cycle, else they await next iteration
     * @param {Boolean} [restoreTiles=true] if true, tile processing starts from the tile original data
     * @param {Boolean} [_allowTileUnloaded=false] internal flag for calling on tiles that come new to the system
     * @param {Boolean} [_isFromTileLoad=false] internal flag that must not be used manually
     * @fires OpenSeadragon.Viewer.event:tile-invalidated
     * @return {OpenSeadragon.Promise<?>}
     */
    requestTileInvalidateEvent: function(tilesToProcess, tStamp, restoreTiles = true,
                                         _allowTileUnloaded = false, _isFromTileLoad = false) {
        return this._invalidationManager.processTiles(
            tilesToProcess, tStamp, restoreTiles, _allowTileUnloaded, _isFromTileLoad
        );
    },

    /**
     * Check if a tile needs update, update such tiles in the given list
     * @param {OpenSeadragon.Tile[]} tileList
     */
    ensureTilesUpToDate: function(tileList) {
        this._invalidationManager.ensureTilesUpToDate(tileList);
    },

    /**
     * Clears all tiles and triggers updates for all items.
     */
    resetItems: function() {
        for ( let i = 0; i < this._items.length; i++ ) {
            this._items[i].reset();
        }
    },

    /**
     * Updates (i.e. animates bounds of) all items.
     * @function
     * @param viewportChanged Whether the viewport changed, which indicates that
     * all TiledImages need to be updated.
     */
    update: function(viewportChanged) {
        let animated = false;
        for ( let i = 0; i < this._items.length; i++ ) {
            animated = this._items[i].update(viewportChanged) || animated;
        }

        return animated;
    },

    /**
     * Draws all items.
     */
    draw: function() {
        this.viewer.drawer.draw(this._items);
        this._needsDraw = false;
        for (const item of this._items) {
            this._needsDraw = item.setDrawn() || this._needsDraw;
        }
    },

    /**
     * @returns {Boolean} true if any items need updating.
     */
    needsDraw: function() {
        for ( let i = 0; i < this._items.length; i++ ) {
            if ( this._items[i].needsDraw() ) {
                return true;
            }
        }
        return this._needsDraw;
    },

    /**
     * @returns {OpenSeadragon.Rect} The smallest rectangle that encloses all items, in viewport coordinates.
     */
    getHomeBounds: function() {
        return this._homeBounds.clone();
    },

    /**
     * To facilitate zoom constraints, we keep track of the pixel density of the
     * densest item in the World (i.e. the item whose content size to viewport size
     * ratio is the highest) and save it as this "content factor".
     * @returns {Number} the number of content units per viewport unit.
     */
    getContentFactor: function() {
        return this._contentFactor;
    },

    /**
     * As a performance optimization, setting this flag to false allows the bounds-change event handler
     * on tiledImages to skip calculations on the world bounds. If a lot of images are going to be positioned in
     * rapid succession, this is a good idea. When finished, setAutoRefigureSizes should be called with true
     * or the system may behave oddly.
     * @param {Boolean} [value] The value to which to set the flag.
     */
    setAutoRefigureSizes: function(value) {
        this._autoRefigureSizes = value;
        if (value & this._needsSizesFigured) {
            this._figureSizes();
            this._needsSizesFigured = false;
        }
    },

    /**
     * Arranges all of the TiledImages with the specified settings.
     * @param {Object} options - Specifies how to arrange.
     * @param {Boolean} [options.immediately=false] - Whether to animate to the new arrangement.
     * @param {String} [options.layout] - See collectionLayout in {@link OpenSeadragon.Options}.
     * @param {Number} [options.rows] - See collectionRows in {@link OpenSeadragon.Options}.
     * @param {Number} [options.columns] - See collectionColumns in {@link OpenSeadragon.Options}.
     * @param {Number} [options.tileSize] - See collectionTileSize in {@link OpenSeadragon.Options}.
     * @param {Number} [options.tileMargin] - See collectionTileMargin in {@link OpenSeadragon.Options}.
     * @fires OpenSeadragon.World.event:metrics-change
     */
    arrange: function(options) {
        options = options || {};
        const immediately = options.immediately || false;
        const layout = options.layout || $.DEFAULT_SETTINGS.collectionLayout;
        const rows = options.rows || $.DEFAULT_SETTINGS.collectionRows;
        const columns = options.columns || $.DEFAULT_SETTINGS.collectionColumns;
        const tileSize = options.tileSize || $.DEFAULT_SETTINGS.collectionTileSize;
        const tileMargin = options.tileMargin || $.DEFAULT_SETTINGS.collectionTileMargin;
        const increment = tileSize + tileMargin;
        let wrap;
        if (!options.rows && columns) {
            wrap = columns;
        } else {
            wrap = Math.ceil(this._items.length / rows);
        }
        let x = 0;
        let y = 0;
        let item, box, width, height, position;

        this.setAutoRefigureSizes(false);
        for (let i = 0; i < this._items.length; i++) {
            if (i && (i % wrap) === 0) {
                if (layout === 'horizontal') {
                    y += increment;
                    x = 0;
                } else {
                    x += increment;
                    y = 0;
                }
            }

            item = this._items[i];
            box = item.getBoundsNoRotate();
            if (box.width > box.height) {
                width = tileSize;
            } else {
                width = tileSize * (box.width / box.height);
            }

            height = width * (box.height / box.width);
            position = new $.Point(x + ((tileSize - width) / 2),
                y + ((tileSize - height) / 2));

            item.setPosition(position, immediately);
            item.setWidth(width, immediately);

            if (layout === 'horizontal') {
                x += increment;
            } else {
                y += increment;
            }
        }
        this.setAutoRefigureSizes(true);
    },

    // private
    _figureSizes: function() {
        const oldHomeBounds = this._homeBounds ? this._homeBounds.clone() : null;
        const oldContentSize = this._contentSize ? this._contentSize.clone() : null;
        const oldContentFactor = this._contentFactor || 0;

        if (!this._items.length) {
            this._homeBounds = new $.Rect(0, 0, 1, 1);
            this._contentSize = new $.Point(1, 1);
            this._contentFactor = 1;
        } else {
            let item = this._items[0];
            let bounds = item.getBounds();
            this._contentFactor = item.getContentSize().x / bounds.width;
            let clippedBounds = item.getClippedBounds().getBoundingBox();
            let left = clippedBounds.x;
            let top = clippedBounds.y;
            let right = clippedBounds.x + clippedBounds.width;
            let bottom = clippedBounds.y + clippedBounds.height;
            for (let i = 1; i < this._items.length; i++) {
                item = this._items[i];
                bounds = item.getBounds();
                this._contentFactor = Math.max(this._contentFactor,
                    item.getContentSize().x / bounds.width);
                clippedBounds = item.getClippedBounds().getBoundingBox();
                left = Math.min(left, clippedBounds.x);
                top = Math.min(top, clippedBounds.y);
                right = Math.max(right, clippedBounds.x + clippedBounds.width);
                bottom = Math.max(bottom, clippedBounds.y + clippedBounds.height);
            }

            this._homeBounds = new $.Rect(left, top, right - left, bottom - top);
            this._contentSize = new $.Point(
                this._homeBounds.width * this._contentFactor,
                this._homeBounds.height * this._contentFactor);
        }

        if (this._contentFactor !== oldContentFactor ||
            !this._homeBounds.equals(oldHomeBounds) ||
            !this._contentSize.equals(oldContentSize)) {
            /**
             * Raised when the home bounds or content factor change.
             * @event metrics-change
             * @memberOf OpenSeadragon.World
             * @type {object}
             * @property {OpenSeadragon.World} eventSource - A reference to the World which raised the event.
             * @property {?Object} userData - Arbitrary subscriber-defined object.
             */
            this.raiseEvent('metrics-change', {});
        }
    },

    // private
    _raiseRemoveItem: function(item) {
        /**
         * Raised when an item is removed.
         * @event remove-item
         * @memberOf OpenSeadragon.World
         * @type {object}
         * @property {OpenSeadragon.World} eventSource - A reference to the World which raised the event.
         * @property {OpenSeadragon.TiledImage} item - The item's underlying item.
         * @property {?Object} userData - Arbitrary subscriber-defined object.
         */
        this.raiseEvent( 'remove-item', { item: item } );
    }
});

}( OpenSeadragon ));
