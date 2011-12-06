
(function( $ ){
    

$.Control = function (elmt, anchor, container) {
    this.elmt = elmt;
    this.anchor = anchor;
    this.container = container;
    this.wrapper = $.Utils.makeNeutralElement("span");
    this.wrapper.style.display = "inline-block";
    this.wrapper.appendChild(this.elmt);
    if (this.anchor == $.ControlAnchor.NONE) {
        this.wrapper.style.width = this.wrapper.style.height = "100%";    // IE6 fix
    }

    if (this.anchor == $.ControlAnchor.TOP_RIGHT || this.anchor == $.ControlAnchor.BOTTOM_RIGHT) {
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
        if (this.elmt[SIGNAL] && $.Utils.getBrowser() == $.Browser.IE) {
            $.Utils.setElementOpacity(this.elmt, opacity, true);
        } else {
            $.Utils.setElementOpacity(this.wrapper, opacity, true);
        }
    }
};

}( OpenSeadragon ));
