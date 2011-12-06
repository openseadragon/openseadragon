
(function( $ ){
    
$.ImageLoader = function(imageLoaderLimit) {
    this._downloading = 0;
    this.imageLoaderLimit = imageLoaderLimit;
};

$.ImageLoader.prototype = {
    _onComplete: function(callback, src, image) {
        this._downloading--;
        if (typeof (callback) == "function") {
            try {
                callback(image);
            } catch (e) {
                $.Debug.error(e.name + " while executing " + src +
                            " callback: " + e.message, e);
            }
        }
    },
    loadImage: function(src, callback) {
        if (this._downloading >= this.imageLoaderLimit) {
            return false;
        }

        var func = $.Utils.createCallback(null, $.delegate(this, this._onComplete), callback);
        var job = new $.Job(src, func);

        this._downloading++;
        job.start();

        return true;
    }
};

}( OpenSeadragon ));
