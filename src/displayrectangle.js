
(function( $ ){

$.DisplayRect = function(x, y, width, height, minLevel, maxLevel) {
    $.Rect.apply(this, [x, y, width, height]);

    this.minLevel = minLevel;
    this.maxLevel = maxLevel;
}
$.DisplayRect.prototype = new $.Rect();
$.DisplayRect.prototype.constructor = $.DisplayRect;

}( OpenSeadragon ));
