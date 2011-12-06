
(function( $ ){

$.Point=$.Point = function(x, y) {
    this.x = typeof (x) == "number" ? x : 0;
    this.y = typeof (y) == "number" ? y : 0;
};

$.Point.prototype = {

    plus: function(point) {
        return new $.Point(this.x + point.x, this.y + point.y);
    },

    minus: function(point) {
        return new $.Point(this.x - point.x, this.y - point.y);
    },

    times: function(factor) {
        return new $.Point(this.x * factor, this.y * factor);
    },

    divide: function(factor) {
        return new $.Point(this.x / factor, this.y / factor);
    },

    negate: function() {
        return new $.Point(-this.x, -this.y);
    },

    distanceTo: function(point) {
        return Math.sqrt(Math.pow(this.x - point.x, 2) +
                        Math.pow(this.y - point.y, 2));
    },

    apply: function(func) {
        return new $.Point(func(this.x), func(this.y));
    },

    equals: function(point) {
        return (point instanceof $.Point) &&
                (this.x === point.x) && (this.y === point.y);
    },

    toString: function() {
        return "(" + this.x + "," + this.y + ")";
    }
};

}( OpenSeadragon ));
