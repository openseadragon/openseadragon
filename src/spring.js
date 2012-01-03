
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

    $.extend( true, this, options);


    this.currentValue = typeof ( this.initial ) == "number" ? this.initial : 0;
    this.startValue = this.currentValue;
    this.targetValue = this.currentValue;

    this.currentTime = new Date().getTime(); // always work in milliseconds
    this.startTime = this.currentTime;
    this.targetTime = this.currentTime;
};

$.Spring.prototype = {
    getCurrent: function() {
        return this.currentValue;
    },

    getTarget: function() {
        return this.targetValue;
    },

    resetTo: function(target) {
        this.targetValue = target;
        this.targetTime = this.currentTime;
        this.startValue = this.targetValue;
        this.startTime = this.targetTime;
    },

    springTo: function(target) {
        this.startValue = this.currentValue;
        this.startTime = this.currentTime;
        this.targetValue = target;
        this.targetTime = this.startTime + 1000 * this.animationTime;
    },

    shiftBy: function(delta) {
        this.startValue += delta;
        this.targetValue += delta;
    },

    update: function() {
        this.currentTime = new Date().getTime();
        this.currentValue = (this.currentTime >= this.targetTime) ? 
            this.targetValue :
            this.startValue + 
                (this.targetValue - this.startValue) *
                transform( 
                    this.springStiffness, 
                    (this.currentTime - this.startTime) / 
                    (this.targetTime - this.startTime)
                );
    }
}


function transform( stiffness, x ) {
    return ( 1.0 - Math.exp( stiffness * -x ) ) / 
        ( 1.0 - Math.exp( -stiffness ) );
};

}( OpenSeadragon ));
