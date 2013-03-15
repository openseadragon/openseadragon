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
 * @param {Element} element - the contol element to be anchored in the container.
 * @param {OpenSeadragon.ControlAnchor} anchor - the location to anchor at.
 * @param {Element} container - the element to control will be anchored too.
 * 
 * @property {Element} element - the element providing the user interface with 
 *  some type of control. Eg a zoom-in button
 * @property {OpenSeadragon.ControlAnchor} anchor - the position of the control 
 *  relative to the container.
 * @property {Element} container - the element within with the control is 
 *  positioned.
 * @property {Element} wrapper - a nuetral element surrounding the control 
 *  element.
 */
$.Control = function ( element, options, container ) {
    var parent = element.parentNode;
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
