/*
 * OpenSeadragon - Control
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
 * An enumeration of supported locations where controls can be anchored,
 * including NONE, TOP_LEFT, TOP_RIGHT, BOTTOM_RIGHT, and BOTTOM_LEFT.
 * The anchoring is always relative to the container
 * @static
 */
$.ControlAnchor = {
    NONE: 0,
    TOP_LEFT: 1,
    TOP_RIGHT: 2,
    BOTTOM_RIGHT: 3,
    BOTTOM_LEFT: 4
};

/**
 * A Control represents any interface element which is meant to allow the user
 * to interact with the zoomable interface. Any control can be anchored to any
 * element.
 * @class
 * @param {Element} element - the control element to be anchored in the container.
 * @param {Object } options - All required and optional settings for configuring a control element.
 * @param {OpenSeadragon.ControlAnchor} [options.anchor=OpenSeadragon.ControlAnchor.NONE] - the position of the control
 *  relative to the container.
 * @param {Boolean} [options.attachToViewer=true] - Whether the control should be added directly to the viewer, or
 *  directly to the container
 * @param {Boolean} [options.autoFade=true] - Whether the control should have the autofade behavior
 * @param {Element} container - the element to control will be anchored too.
 *
 * @property {Element} element - the element providing the user interface with
 *  some type of control. Eg a zoom-in button
 * @property {OpenSeadragon.ControlAnchor} anchor - the position of the control
 *  relative to the container.
 * @property {Boolean} autoFade - Whether the control should have the autofade behavior
 * @property {Element} container - the element within with the control is
 *  positioned.
 * @property {Element} wrapper - a neutral element surrounding the control
 *  element.
 */
$.Control = function ( element, options, container ) {
    var parent = element.parentNode;
    if (typeof options === 'number')
    {
        $.console.error("Passing an anchor directly into the OpenSeadragon.Control constructor is deprecated; " +
                        "please use an options object instead.  " +
                        "Support for this deprecated variant is scheduled for removal in December 2013");
         options = {anchor: options};
    }
    options.attachToViewer = (typeof options.attachToViewer === 'undefined') ? true : options.attachToViewer;
    this.autoFade = (typeof options.autoFade === 'undefined') ? true : options.autoFade;
    this.element    = element;
    this.anchor     = options.anchor;
    this.container  = container;
    this.wrapper    = $.makeNeutralElement( "span" );
    this.wrapper.style.display = "inline-block";
    this.wrapper.appendChild( this.element );

    if ( this.anchor == $.ControlAnchor.NONE ) {
        // IE6 fix
        this.wrapper.style.width = this.wrapper.style.height = "100%";
    }

    if (options.attachToViewer ) {
        if ( this.anchor == $.ControlAnchor.TOP_RIGHT ||
             this.anchor == $.ControlAnchor.BOTTOM_RIGHT ) {
            this.container.insertBefore(
                this.wrapper,
                this.container.firstChild
            );
        } else {
            this.container.appendChild( this.wrapper );
        }
    } else {
        parent.appendChild( this.wrapper );
    }
};

$.Control.prototype = {

    /**
     * Removes the control from the container.
     * @function
     */
    destroy: function() {
        this.wrapper.removeChild( this.element );
        this.container.removeChild( this.wrapper );
    },

    /**
     * Determines if the control is currently visible.
     * @function
     * @return {Boolean} true if currenly visible, false otherwise.
     */
    isVisible: function() {
        return this.wrapper.style.display != "none";
    },

    /**
     * Toggles the visibility of the control.
     * @function
     * @param {Boolean} visible - true to make visible, false to hide.
     */
    setVisible: function( visible ) {
        this.wrapper.style.display = visible ?
            "inline-block" :
            "none";
    },

    /**
     * Sets the opacity level for the control.
     * @function
     * @param {Number} opactiy - a value between 1 and 0 inclusively.
     */
    setOpacity: function( opacity ) {
        if ( this.element[ $.SIGNAL ] && $.Browser.vendor == $.BROWSERS.IE ) {
            $.setElementOpacity( this.element, opacity, true );
        } else {
            $.setElementOpacity( this.wrapper, opacity, true );
        }
    }
};

}( OpenSeadragon ));
