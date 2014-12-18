/*
 * OpenSeadragon - World
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
 * @class World
 * @memberof OpenSeadragon
 * @extends OpenSeadragon.EventSource
 * @classdesc Keeps track of all of the tiled images in the scene.
 * @param {Object} options - World options.
 * @param {OpenSeadragon.Viewer} options.viewer - The Viewer that owns this World.
 **/
$.World = function( options ) {
    var _this = this;

    $.console.assert( options.viewer, "[World] options.viewer is required" );

    $.EventSource.call( this );

    this.viewer = options.viewer;
    this._items = [];
    this._needsDraw = false;
    this._delegatedFigureSizes = function(event) {
        _this._figureSizes();
    };

    this._figureSizes();
};

$.extend( $.World.prototype, $.EventSource.prototype, /** @lends OpenSeadragon.World.prototype */{
    /**
     * Add the specified item.
     * @param {OpenSeadragon.TiledImage} item - The item to add.
     * @param {Number} [options.index] - Index for the item. If not specified, goes at the top.
     * @fires OpenSeadragon.World.event:add-item
     * @fires OpenSeadragon.World.event:metrics-change
     */
    addItem: function( item, options ) {
        $.console.assert(item, "[World.addItem] item is required");
        $.console.assert(item instanceof $.TiledImage, "[World.addItem] only TiledImages supported at this time");

        options = options || {};
        if (options.index !== undefined) {
            var index = Math.max(0, Math.min(this._items.length, options.index));
            this._items.splice(index, 0, item);
        } else {
            this._items.push( item );
        }

        this._figureSizes();
        this._needsDraw = true;

        item.addHandler('bounds-change', this._delegatedFigureSizes);

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

        var oldIndex = this.getIndexOfItem( item );

        if ( index >= this._items.length ) {
            throw new Error( "Index bigger than number of layers." );
        }

        if ( index === oldIndex || oldIndex === -1 ) {
            return;
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

        var index = this._items.indexOf( item );
        if ( index === -1 ) {
            return;
        }

        item.removeHandler('bounds-change', this._delegatedFigureSizes);
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
        var item;
        for (var i = 0; i < this._items.length; i++) {
            item = this._items[i];
            item.removeHandler('bounds-change', this._delegatedFigureSizes);
        }

        var removedItems = this._items;
        this._items = [];
        this._figureSizes();
        this._needsDraw = true;

        for (i = 0; i < removedItems.length; i++) {
            item = removedItems[i];
            this._raiseRemoveItem(item);
        }
    },

    /**
     * Clears all tiles and triggers updates for all items.
     */
    resetItems: function() {
        for ( var i = 0; i < this._items.length; i++ ) {
            this._items[i].reset();
        }
    },

    /**
     * Updates (i.e. animates bounds of) all items.
     */
    update: function() {
        var animated = false;
        for ( var i = 0; i < this._items.length; i++ ) {
            animated = this._items[i].update() || animated;
        }

        return animated;
    },

    /**
     * Draws all items.
     */
    draw: function() {
        for ( var i = 0; i < this._items.length; i++ ) {
            this._items[i].draw();
        }

        this._needsDraw = false;
    },

    /**
     * @returns {Boolean} true if any items need updating.
     */
    needsDraw: function() {
        for ( var i = 0; i < this._items.length; i++ ) {
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
     * Arranges all of the TiledImages with the specified settings.
     * @param {Object} options - Specifies how to arrange.
     * @param {Boolean} [options.immediately=false] - Whether to animate to the new arrangement.
     * @param {String} [options.layout] - See collectionLayout in {@link OpenSeadragon.Options}.
     * @param {Number} [options.rows] - See collectionRows in {@link OpenSeadragon.Options}.
     * @param {Number} [options.tileSize] - See collectionTileSize in {@link OpenSeadragon.Options}.
     * @param {Number} [options.tileMargin] - See collectionTileMargin in {@link OpenSeadragon.Options}.
     * @fires OpenSeadragon.World.event:metrics-change
     */
    arrange: function(options) {
        options = options || {};
        var immediately = options.immediately || false;
        var layout = options.layout || $.DEFAULT_SETTINGS.collectionLayout;
        var rows = options.rows || $.DEFAULT_SETTINGS.collectionRows;
        var tileSize = options.tileSize || $.DEFAULT_SETTINGS.collectionTileSize;
        var tileMargin = options.tileMargin || $.DEFAULT_SETTINGS.collectionTileMargin;
        var increment = tileSize + tileMargin;
        var wrap = Math.ceil(this._items.length / rows);
        var x = 0;
        var y = 0;
        var item, box, width, height, position;
        for (var i = 0; i < this._items.length; i++) {
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
            box = item.getBounds();
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
    },

    // private
    _figureSizes: function() {
        var oldHomeBounds = this._homeBounds ? this._homeBounds.clone() : null;
        var oldContentSize = this._contentSize ? this._contentSize.clone() : null;
        var oldContentFactor = this._contentFactor || 0;

        if ( !this._items.length ) {
            this._homeBounds = new $.Rect(0, 0, 1, 1);
            this._contentSize = new $.Point(1, 1);
            this._contentFactor = 1;
        } else {
            var bounds = this._items[0].getBounds();
            this._contentFactor = this._items[0].getContentSize().x / bounds.width;
            var left = bounds.x;
            var top = bounds.y;
            var right = bounds.x + bounds.width;
            var bottom = bounds.y + bounds.height;
            var box;
            for ( var i = 1; i < this._items.length; i++ ) {
                box = this._items[i].getBounds();
                this._contentFactor = Math.max(this._contentFactor, this._items[i].getContentSize().x / box.width);
                left = Math.min( left, box.x );
                top = Math.min( top, box.y );
                right = Math.max( right, box.x + box.width );
                bottom = Math.max( bottom, box.y + box.height );
            }

            this._homeBounds = new $.Rect( left, top, right - left, bottom - top );
            this._contentSize = new $.Point(this._homeBounds.width * this._contentFactor,
                this._homeBounds.height * this._contentFactor);
        }

        if (this._contentFactor !== oldContentFactor || !this._homeBounds.equals(oldHomeBounds) ||
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
