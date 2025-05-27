/*
 * OpenSeadragon - ButtonGroup
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
 * @class ButtonGroup
 * @classdesc Manages events on groups of buttons.
 *
 * @memberof OpenSeadragon
 * @param {Object} options - A dictionary of settings applied against the entire group of buttons.
 * @param {Array} options.buttons Array of buttons
 * @param {Element} [options.element] Element to use as the container
 **/
$.ButtonGroup = function( options ) {

    $.extend( true, this, {
        /**
         * An array containing the buttons themselves.
         * @member {Array} buttons
         * @memberof OpenSeadragon.ButtonGroup#
         */
        buttons:            [],
        clickTimeThreshold: $.DEFAULT_SETTINGS.clickTimeThreshold,
        clickDistThreshold: $.DEFAULT_SETTINGS.clickDistThreshold,
        labelText:          ""
    }, options );

    // copy the button elements  TODO: Why?
    var buttons = this.buttons.concat([]),
        _this = this,
        i;

    /**
     * The shared container for the buttons.
     * @member {Element} element
     * @memberof OpenSeadragon.ButtonGroup#
     */
    this.element = options.element || $.makeNeutralElement( "div" );

    // TODO What if there IS an options.group specified?
    if( !options.group ){
        this.element.style.display = "inline-block";
        //this.label   = $.makeNeutralElement( "label" );
        //TODO: support labels for ButtonGroups
        //this.label.innerHTML = this.labelText;
        //this.element.appendChild( this.label );
        for ( i = 0; i < buttons.length; i++ ) {
            this.element.appendChild( buttons[ i ].element );
        }
    }

    $.setElementTouchActionNone( this.element );

    /**
     * Tracks mouse/touch/key events across the group of buttons.
     * @member {OpenSeadragon.MouseTracker} tracker
     * @memberof OpenSeadragon.ButtonGroup#
     */
    this.tracker = new $.MouseTracker({
        userData:           'ButtonGroup.tracker',
        element:            this.element,
        clickTimeThreshold: this.clickTimeThreshold,
        clickDistThreshold: this.clickDistThreshold,
        enterHandler: function ( event ) {
            var i;
            for ( i = 0; i < _this.buttons.length; i++ ) {
                _this.buttons[ i ].notifyGroupEnter();
            }
        },
        leaveHandler: function ( event ) {
            var i;
            if ( !event.insideElementPressed ) {
                for ( i = 0; i < _this.buttons.length; i++ ) {
                    _this.buttons[ i ].notifyGroupExit();
                }
            }
        },
    });
};

/** @lends OpenSeadragon.ButtonGroup.prototype */
$.ButtonGroup.prototype = {

    /**
     * Adds the given button to this button group.
     *
     * @function
     * @param {OpenSeadragon.Button} button
     */
    addButton: function( button ){
        this.buttons.push(button);
        this.element.appendChild(button.element);
    },

    /**
     * TODO: Figure out why this is used on the public API and if a more useful
     * api can be created.
     * @function
     * @private
     */
    emulateEnter: function() {
        this.tracker.enterHandler( { eventSource: this.tracker } );
    },

    /**
     * TODO: Figure out why this is used on the public API and if a more useful
     * api can be created.
     * @function
     * @private
     */
    emulateLeave: function() {
        this.tracker.leaveHandler( { eventSource: this.tracker } );
    },

    destroy: function() {
        while (this.buttons.length) {
            var button = this.buttons.pop();
            this.element.removeChild(button.element);
            button.destroy();
        }
        this.tracker.destroy();
        this.element = null;
    }
};


}( OpenSeadragon ));
