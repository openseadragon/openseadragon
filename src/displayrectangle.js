
(function( $ ){

$.DisplayRect = function( x, y, width, height, minLevel, maxLevel ) {
    $.Rect.apply( this, [ x, y, width, height ] );

    this.minLevel = minLevel;
    this.maxLevel = maxLevel;
}

$.extend( $.DisplayRect.prototype, $.Rect.prototype );

}( OpenSeadragon ));
