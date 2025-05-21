/*
 * OpenSeadragon - ControlDock
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
     * @class ControlDock
     * @classdesc Provides a container element (a &lt;form&gt; element) with support for the layout of control elements.
     *
     * @memberof OpenSeadragon
     */
    $.ControlDock = function( options ){
        var layouts = [ 'topleft', 'topright', 'bottomright', 'bottomleft'],
            layout,
            i;

        $.extend( true, this, {
            id: 'controldock-' + $.now() + '-' + Math.floor(Math.random() * 1000000),
            container: $.makeNeutralElement( 'div' ),
            controls: []
        }, options );

        // Disable the form's submit; otherwise button clicks and return keys
        // can trigger it.
        this.container.onsubmit = function() {
            return false;
        };

        if( this.element ){
            this.element = $.getElement( this.element );
            this.element.appendChild( this.container );
            if( $.getElementStyle(this.element).position === 'static' ){
                this.element.style.position = 'relative';
            }
            this.container.style.width = '100%';
            this.container.style.height = '100%';
        }

        for( i = 0; i < layouts.length; i++ ){
            layout = layouts[ i ];
            this.controls[ layout ] = $.makeNeutralElement( "div" );
            this.controls[ layout ].style.position = 'absolute';
            if ( layout.match( 'left' ) ){
                this.controls[ layout ].style.left = '0px';
            }
            if ( layout.match( 'right' ) ){
                this.controls[ layout ].style.right = '0px';
            }
            if ( layout.match( 'top' ) ){
                this.controls[ layout ].style.top = '0px';
            }
            if ( layout.match( 'bottom' ) ){
                this.controls[ layout ].style.bottom = '0px';
            }
        }

        this.container.appendChild( this.controls.topleft );
        this.container.appendChild( this.controls.topright );
        this.container.appendChild( this.controls.bottomright );
        this.container.appendChild( this.controls.bottomleft );
    };

    /** @lends OpenSeadragon.ControlDock.prototype */
    $.ControlDock.prototype = {

        /**
         * @function
         */
        addControl: function ( element, controlOptions ) {
            element = $.getElement( element );
            var div = null;

            if ( getControlIndex( this, element ) >= 0 ) {
                return;     // they're trying to add a duplicate control
            }

            switch ( controlOptions.anchor ) {
                case $.ControlAnchor.TOP_RIGHT:
                    div = this.controls.topright;
                    element.style.position = "relative";
                    element.style.paddingRight = "0px";
                    element.style.paddingTop = "0px";
                    break;
                case $.ControlAnchor.BOTTOM_RIGHT:
                    div = this.controls.bottomright;
                    element.style.position = "relative";
                    element.style.paddingRight = "0px";
                    element.style.paddingBottom = "0px";
                    break;
                case $.ControlAnchor.BOTTOM_LEFT:
                    div = this.controls.bottomleft;
                    element.style.position = "relative";
                    element.style.paddingLeft = "0px";
                    element.style.paddingBottom = "0px";
                    break;
                case $.ControlAnchor.TOP_LEFT:
                    div = this.controls.topleft;
                    element.style.position = "relative";
                    element.style.paddingLeft = "0px";
                    element.style.paddingTop = "0px";
                    break;
                case $.ControlAnchor.ABSOLUTE:
                    div = this.container;
                    element.style.margin = "0px";
                    element.style.padding = "0px";
                    break;
                default:
                case $.ControlAnchor.NONE:
                    div = this.container;
                    element.style.margin = "0px";
                    element.style.padding = "0px";
                    break;
            }

            this.controls.push(
                new $.Control( element, controlOptions, div )
            );
            element.style.display = "inline-block";
        },


        /**
         * @function
         * @returns {OpenSeadragon.ControlDock} Chainable.
         */
        removeControl: function ( element ) {
            element = $.getElement( element );
            var i = getControlIndex( this, element );

            if ( i >= 0 ) {
                this.controls[ i ].destroy();
                this.controls.splice( i, 1 );
            }

            return this;
        },

        /**
         * @function
         * @returns {OpenSeadragon.ControlDock} Chainable.
         */
        clearControls: function () {
            while ( this.controls.length > 0 ) {
                this.controls.pop().destroy();
            }

            return this;
        },


        /**
         * @function
         * @returns {Boolean}
         */
        areControlsEnabled: function () {
            var i;

            for ( i = this.controls.length - 1; i >= 0; i-- ) {
                if ( this.controls[ i ].isVisible() ) {
                    return true;
                }
            }

            return false;
        },


        /**
         * @function
         * @returns {OpenSeadragon.ControlDock} Chainable.
         */
        setControlsEnabled: function( enabled ) {
            var i;

            for ( i = this.controls.length - 1; i >= 0; i-- ) {
                this.controls[ i ].setVisible( enabled );
            }

            return this;
        }

    };


    ///////////////////////////////////////////////////////////////////////////////
    // Utility methods
    ///////////////////////////////////////////////////////////////////////////////
    function getControlIndex( dock, element ) {
        var controls = dock.controls,
            i;

        for ( i = controls.length - 1; i >= 0; i-- ) {
            if ( controls[ i ].element === element ) {
                return i;
            }
        }

        return -1;
    }

}( OpenSeadragon ));
