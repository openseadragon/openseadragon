
(function( $ ){

    //TODO: make TIMEOUT configurable
    var TIMEOUT = 5000;
    
$.ImageLoader = function( imageLoaderLimit ) {
    this.downloading = 0;
    this.imageLoaderLimit = imageLoaderLimit;
};

$.ImageLoader.prototype = {
    loadImage: function(src, callback) {
        var _this = this,
            loading = false,
            image,
            jobid,
            complete;

        if ( !this.imageLoaderLimit || this.downloading < this.imageLoaderLimit ) {
            
            this.downloading++;

            image = new Image();

            complete = function( imagesrc ){
                _this.downloading--;
                if (typeof ( callback ) == "function") {
                    try {
                        callback( image );
                    } catch ( e ) {
                        $.Debug.error(
                            e.name + " while executing " + src +" callback: " + e.message, 
                            e
                        );
                    }
                }
            };

            image.onload = function(){
                finish( image, complete, true );
            };

            image.onabort = image.onerror = function(){
                finish( image, complete, false );
            };

            jobid = window.setTimeout( function(){
                finish( image, complete, false, jobid );
            }, TIMEOUT );

            loading   = true;
            image.src = src;
        }

        return loading;
    }
};

function finish( image, callback, successful, jobid ){

    image.onload = null;
    image.onabort = null;
    image.onerror = null;

    if ( jobid ) {
        window.clearTimeout( jobid );
    }
    window.setTimeout( function() {
        callback( image.src, successful ? image : null);
    }, 1 );

};

}( OpenSeadragon ));
