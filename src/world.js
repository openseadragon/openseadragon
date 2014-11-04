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
    $.console.assert( options.viewer, "[World] options.viewer is required" );

    $.EventSource.call( this );

    this.viewer = options.viewer;
    this._items = [];
    this._needsUpdate = false;
    this._figureSizes();
};

$.extend( $.World.prototype, $.EventSource.prototype, /** @lends OpenSeadragon.World.prototype */{
    /**
     * Add the specified item.
     * @param {OpenSeadragon.TiledImage} item - The item to add.
     * @param {Number} [options.index] - Index for the item. If not specified, goes at the top.
     * @fires OpenSeadragon.World.event:add-item
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
        this._needsUpdate = true;

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
        $.console.assert(index !== 'undefined', "[World.getItemAt] index is required");
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
     * @fires OpenSeadragon.World.event:item-index-changed
     */
    setItemIndex: function( item, index ) {
        $.console.assert(item, "[World.setItemIndex] item is required");
        $.console.assert(index !== 'undefined', "[World.setItemIndex] index is required");

        var oldIndex = this.getIndexOfItem( item );

        if ( index >= this._items.length ) {
            throw new Error( "Index bigger than number of layers." );
        }

        if ( index === oldIndex || oldIndex === -1 ) {
            return;
        }

        this._items.splice( oldIndex, 1 );
        this._items.splice( index, 0, item );
        this._needsUpdate = true;

        /**
         * Raised when the order of the indexes has been changed.
         * @event item-index-changed
         * @memberOf OpenSeadragon.World
         * @type {object}
         * @property {OpenSeadragon.World} eventSource - A reference to the World which raised the event.
         * @property {OpenSeadragon.TiledImage} item - The item whose index has
         * been changed
         * @property {Number} previousIndex - The previous index of the item
         * @property {Number} newIndex - The new index of the item
         * @property {?Object} userData - Arbitrary subscriber-defined object.
         */
        this.raiseEvent( 'item-index-changed', {
            item: item,
            previousIndex: oldIndex,
            newIndex: index
        } );
    },

    /**
     * Remove an item.
     * @param {OpenSeadragon.TiledImage} item - The item to remove.
     * @fires OpenSeadragon.World.event:remove-item
     */
    removeItem: function( item ) {
        $.console.assert(item, "[World.removeItem] item is required");

        var index = this._items.indexOf( item );
        if ( index === -1 ) {
            return;
        }

        this._items.splice( index, 1 );
        this._figureSizes();
        this._needsUpdate = true;
        this._raiseRemoveItem(item);
    },

    /**
     * Remove all items.
     * @fires OpenSeadragon.World.event:remove-item
     */
    removeAll: function() {
        var removedItems = this._items;
        this._items = [];
        this._figureSizes();
        this._needsUpdate = true;

        for (var i = 0; i < removedItems.length; i++) {
            this._raiseRemoveItem(removedItems[i]);
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
     * Updates (i.e. draws) all items.
     */
    update: function() {
        for ( var i = 0; i < this._items.length; i++ ) {
            this._items[i].update();
        }

        this._needsUpdate = false;
    },

    /**
     * @returns {Boolean} true if any items need updating.
     */
    needsUpdate: function() {
        for ( var i = 0; i < this._items.length; i++ ) {
            if ( this._items[i].needsUpdate() ) {
                return true;
            }
        }
        return this._needsUpdate;
    },

    /**
     * @returns {OpenSeadragon.Rect} The smallest rectangle that encloses all items, in world coordinates.
     */
    getHomeBounds: function() {
        return this._homeBounds.clone();
    },

    /**
     * To facilitate zoom constraints, we keep track of the pixel density of the
     * densest item in the World (i.e. the item whose content size to world size
     * ratio is the highest) and save it as this "content factor".
     * @returns {Number} the number of content units per world unit.
     */
    getContentFactor: function() {
        return this._contentFactor;
    },

    // private
    _figureSizes: function() {
        if ( !this._items.length ) {
            this._homeBounds = new $.Rect(0, 0, 1, 1);
            this._contentSize = new $.Point(1, 1);
            return;
        }

        var bounds = this._items[0].getWorldBounds();
        this._contentFactor = this._items[0].getContentSize().x / bounds.width;
        var left = bounds.x;
        var top = bounds.y;
        var right = bounds.x + bounds.width;
        var bottom = bounds.y + bounds.height;
        var box;
        for ( var i = 1; i < this._items.length; i++ ) {
            box = this._items[i].getWorldBounds();
            this._contentFactor = Math.max(this._contentFactor, this._items[i].getContentSize().x / box.width);
            left = Math.min( left, box.x );
            top = Math.min( top, box.y );
            right = Math.max( right, box.x + box.width );
            bottom = Math.max( bottom, box.y + box.height );
        }

        this._homeBounds = new $.Rect( left, top, right - left, bottom - top );
        this._contentSize = new $.Point(this._homeBounds.width * this._contentFactor,
            this._homeBounds.height * this._contentFactor);
    },

    // private
    _raiseRemoveItem: function(item) {
        /**
         * Raised when a item is removed.
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
