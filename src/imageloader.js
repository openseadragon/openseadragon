
(function( $ ){
    
$.ImageLoader = function( imageLoaderLimit ) {
    this.downloading = 0;
    this.imageLoaderLimit = imageLoaderLimit;
};

$.ImageLoader.prototype = {
    loadImage: function(src, callback) {
        var _this = this;
        if (this.downloading >= this.imageLoaderLimit) {
            return false;
        }

        var job = new $.Job(src, function(src, image){
            
            _this.downloading--;
            if (typeof (callback) == "function") {
                try {
                    callback(image);
                } catch (e) {
                    $.Debug.error(e.name + " while executing " + src +
                                " callback: " + e.message, e);
                }
            }
        });

        this.downloading++;
        job.start();

        return true;
    }
};

}( OpenSeadragon ));
