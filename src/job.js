
(function( $ ){
    
$.Job = function( src, callback ) {
    this.image = null;
    this.timeout = null;
    this.src = src;
    this.callback = callback;
    //TODO: make TIMEOUT configurable
    this.TIMEOUT = 5000;
};

$.Job.prototype = {
    start: function() {
        var _this = this;
        this.image = new Image();
        this.image.onload = function(){
            finish( _this, true );
        };
        this.image.onabort = this.image.onerror = function(){
            finish( _this, false );
        };
        this.timeout = window.setTimeout( function(){
            onerror( _this );
        }, this.TIMEOUT );

        this.image.src = this.src;
    }
};

function onload( job ){
    finish( job, true );
};

function onerror( job ){
    finish( job, false )
};

function finish( job, success ){
    var image    = job.image,
        callback = job.callback;

    image.onload = null;
    image.onabort = null;
    image.onerror = null;

    if ( job.timeout ) {
        window.clearTimeout( job.timeout );
    }
    window.setTimeout( function() {
        callback(job.src, success ? image : null);
    }, 1 );

};

}( OpenSeadragon ));
