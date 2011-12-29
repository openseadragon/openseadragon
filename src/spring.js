
(function( $ ){
    
$.Spring = function( options ) {
    var args = arguments;

    if( typeof( options ) != 'object' ){
        //allows backward compatible use of ( initialValue, config ) as 
        //constructor parameters
        options = {
            initial: args.length && typeof ( args[ 0 ] ) == "number" ? 
                args[ 0 ] : 
                0,
            springStiffness: args.length > 1 ? 
                args[ 1 ].springStiffness : 
                5.0,
            animationTime: args.length > 1 ? 
                args[ 1 ].animationTime : 
                1.5,
        };
    }

    $.extend( true, this, options );


    this._currentValue = typeof ( this.initial ) == "number" ? this.initial : 0;
    this._startValue = this._currentValue;
    this._targetValue = this._currentValue;

    this._currentTime = new Date().getTime(); // always work in milliseconds
    this._startTime = this._currentTime;
    this._targetTime = this._currentTime;
};

$.Spring.prototype = {
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
        this._targetTime = this._startTime + 1000 * this.animationTime;
    },

    shiftBy: function(delta) {
        this._startValue += delta;
        this._targetValue += delta;
    },

    update: function() {
        this._currentTime = new Date().getTime();
        this._currentValue = (this._currentTime >= this._targetTime) ? this._targetValue :
                this._startValue + (this._targetValue - this._startValue) *
                transform( this.springStiffness, (this._currentTime - this._startTime) / (this._targetTime - this._startTime));
    }
}


function transform( stiffness, x ) {
    return ( 1.0 - Math.exp( stiffness * -x ) ) / 
        ( 1.0 - Math.exp( -stiffness ) );
};

}( OpenSeadragon ));
