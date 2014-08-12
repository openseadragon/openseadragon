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
 * @classdesc
 */
$.World = function( options ) {
    $.console.assert( options.viewer, "[World] options.viewer is required" );

    this.viewer = options.viewer;
    this._items = [];
};

$.World.prototype = /** @lends OpenSeadragon.World.prototype */{
    addItem: function( item ) {
        this._items.push( item );
    },

    /**
     * Get the item at the specified level.
     * @param {Number} level The item to retrieve level.
     * @returns {OpenSeadragon.TiledImage} The item at the specified level.
     */
    getItemAt: function( level ) {
        if ( level >= this._items.length ) {
            throw new Error( "Level bigger than number of items." );
        }
        return this._items[ level ];
    },

    /**
     * Get the level of the given item or -1 if not present.
     * @param {OpenSeadragon.TiledImage} item The item.
     * @returns {Number} The level of the item or -1 if not present.
     */
    getLevelOfItem: function( item ) {
        return $.indexOf( this._items, item );
    },

    /**
     * Get the number of items used.
     * @returns {Number} The number of items used.
     */
    getItemCount: function() {
        return this._items.length;
    },

    /**
     * Change the level of a layer so that it appears over or under others.
     * @param {OpenSeadragon.Drawer} drawer The underlying drawer of the changing
     * level layer.
     * @param {Number} level The new level
     * @fires OpenSeadragon.Viewer.event:layer-level-changed
     */
    setItemLevel: function( item, level ) {
        var oldLevel = this.getLevelOfItem( item );

        if ( level >= this._items.length ) {
            throw new Error( "Level bigger than number of layers." );
        }
        if ( level === oldLevel || oldLevel === -1 ) {
            return;
        }
        this._items.splice( oldLevel, 1 );
        this._items.splice( level, 0, item );

        /**
         * Raised when the order of the layers has been changed.
         * @event layer-level-changed
         * @memberOf OpenSeadragon.Viewer
         * @type {object}
         * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
         * @property {OpenSeadragon.Drawer} drawer - The drawer which level has
         * been changed
         * @property {Number} previousLevel - The previous level of the drawer
         * @property {Number} newLevel - The new level of the drawer
         * @property {?Object} userData - Arbitrary subscriber-defined object.
         */
        // TODO: deprecate
        this.viewer.raiseEvent( 'layer-level-changed', {
            drawer: item,
            previousLevel: oldLevel,
            newLevel: level
        } );
    },

    /**
     * Remove a layer. If there is only one layer, close the viewer.
     * @function
     * @param {OpenSeadragon.Drawer} drawer The underlying drawer of the layer
     * to remove
     * @fires OpenSeadragon.Viewer.event:remove-layer
     */
    removeItem: function( item ) {
        var index = this._items.indexOf( item );
        if ( index === -1 ) {
            return;
        }

        this._items.splice( index, 1 );
        /**
         * Raised when a layer is removed.
         * @event remove-layer
         * @memberOf OpenSeadragon.Viewer
         * @type {object}
         * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
         * @property {OpenSeadragon.Drawer} drawer The layer's underlying drawer.
         * @property {?Object} userData - Arbitrary subscriber-defined object.
         */
        // TODO: deprecate
        this.raiseEvent( 'remove-layer', { drawer: item } );
    },

    resetTiles: function() {
        for (var i = 0; i < this._items.length; i++ ) {
            this._items[i].reset();
        }
    },

    update: function() {
        for (var i = 0; i < this._items.length; i++ ) {
            this._items[i].update();
        }
    },

    needsUpdate: function() {
        for (var i = 0; i < this._items.length; i++ ) {
            if (this._items[i].needsUpdate()) {
                return true;
            }
        }
        return false;
    }
};

}( OpenSeadragon ));
