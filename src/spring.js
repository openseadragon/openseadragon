
(function( $ ){
    
$.Spring = function(initialValue, config) {
    this._currentValue = typeof (initialValue) == "number" ? initialValue : 0;
    this._startValue = this._currentValue;
    this._targetValue = this._currentValue;
    this.config = config;

    this._currentTime = new Date().getTime(); // always work in milliseconds
    this._startTime = this._currentTime;
    this._targetTime = this._currentTime;
};

$.Spring.prototype = {
    _transform: function(x) {
        var s = this.config.springStiffness;
        return (1.0 - Math.exp(-x * s)) / (1.0 - Math.exp(-s));
    },
    getCurrent: function() {
        return this._currentValue;
    },

    getTarget: function() {
        return this._targetValue;
    },

    resetTo: function(target) {
        this._targetValue = target;
        this._targetTime = this._currentTime;
        this._startValue = this._targetValue;
        this._startTime = this._targetTime;
    },

    springTo: function(target) {
        this._startValue = this._currentValue;
        this._startTime = this._currentTime;
        this._targetValue = target;
        this._targetTime = this._startTime + 1000 * this.config.animationTime;
    },

    shiftBy: function(delta) {
        this._startValue += delta;
        this._targetValue += delta;
    },

    update: function() {
        this._currentTime = new Date().getTime();
        this._currentValue = (this._currentTime >= this._targetTime) ? this._targetValue :
                this._startValue + (this._targetValue - this._startValue) *
                this._transform((this._currentTime - this._startTime) / (this._targetTime - this._startTime));
    }
}

}( OpenSeadragon ));
