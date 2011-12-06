
(function( $ ){
    
$.DziError = function(message) {
    Error.apply(this, arguments);
    this.message = message;
};
$.DziError.prototype = new Error();
$.DziError.constructor = $.DziError;

}( OpenSeadragon ));
