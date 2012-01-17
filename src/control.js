
(function( $ ){
    

$.ControlAnchor = {
    NONE: 0,
    TOP_LEFT: 1,
    TOP_RIGHT: 2,
    BOTTOM_RIGHT: 3,
    BOTTOM_LEFT: 4
};

$.Control = function (elmt, anchor, container) {
    this.elmt = elmt;
    this.anchor = anchor;
    this.container = container;
    this.wrapper = $.makeNeutralElement("span");
    this.wrapper.style.display = "inline-block";
    this.wrapper.appendChild(this.elmt);

    if (this.anchor == $.ControlAnchor.NONE) {
        // IE6 fix
        this.wrapper.style.width = this.wrapper.style.height = "100%";    
    }

    if ( this.anchor == $.ControlAnchor.TOP_RIGHT || 
         this.anchor == $.ControlAnchor.BOTTOM_RIGHT ) {
        this.container.insertBefore(this.wrapper, this.container.firstChild);
    } else {
        this.container.appendChild(this.wrapper);
    }
};

$.Control.prototype = {
    destroy: function() {
        this.wrapper.removeChild(this.elmt);
        this.container.removeChild(this.wrapper);
    },
    isVisible: function() {
        return this.wrapper.style.display != "none";
    },
    setVisible: function(visible) {
        this.wrapper.style.display = visible ? "inline-block" : "none";
    },
    setOpacity: function(opacity) {
        if (this.elmt[ $.SIGNAL ] && $.Browser.vendor == $.BROWSERS.IE ) {
            $.setElementOpacity(this.elmt, opacity, true);
        } else {
            $.setElementOpacity(this.wrapper, opacity, true);
        }
    }
};

}( OpenSeadragon ));
