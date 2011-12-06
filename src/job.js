
(function( $ ){
    
$.Job = function(src, callback) {
    this._image = null;
    this._timeout = null;
    this._src = src;
    this._callback = callback;
    this.TIMEOUT = 5000;
};

$.Job.prototype = {
    _finish: function(success) {
        this._image.onload = null;
        this._image.onabort = null;
        this._image.onerror = null;


        if (this._timeout) {
            window.clearTimeout(this._timeout);
        }

        var image = this._image;
        var callback = this._callback;
        window.setTimeout(function() {
            callback(this._src, success ? image : null);
        }, 1);
    },
    _onloadHandler: function() {
        this._finish(true);
    },
    _onerrorHandler: function() {
        this._finish(false);
    },
    start: function() {
        this._image = new Image();
        this._image.onload = $.delegate(this, this._onloadHandler);
        this._image.onabort = $.delegate(this, this._onerrorHandler);
        this._image.onerror = $.delegate(this, this._onerrorHandler);

        this._timeout = window.setTimeout($.delegate(this, this._onerrorHandler), this.TIMEOUT);

        this._image.src = this._src;
    }
};

}( OpenSeadragon ));
