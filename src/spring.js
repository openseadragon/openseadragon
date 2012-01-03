
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


    this.current = {
        point: typeof ( this.initial ) == "number" ? 
            this.initial : 
            0,
        time:  new Date().getTime() // always work in milliseconds
    }

    this.startValue     = this.current.point;
    this.startTime      = this.current.time;

    this.targetValue    = this.current.point;
    this.targetTime     = this.current.time;
};

$.Spring.prototype = {
    getCurrent: function() {
        return this.current.point;
    },

    getTarget: function() {
        return this.targetValue;
    },

    resetTo: function(target) {
        this.targetValue = target;
        this.targetTime = this.current.time;
        this.startValue = this.targetValue;
        this.startTime = this.targetTime;
    },

    springTo: function(target) {
        this.startValue = this.current.point;
        this.startTime = this.current.time;
        this.targetValue = target;
        this.targetTime = this.startTime + 1000 * this.animationTime;
    },

    shiftBy: function(delta) {
        this.startValue += delta;
        this.targetValue += delta;
    },

    update: function() {
        this.current.time = new Date().getTime();
        this.current.point = (this.current.time >= this.targetTime) ? 
            this.targetValue :
            this.startValue + 
                (this.targetValue - this.startValue) *
                transform( 
                    this.springStiffness, 
                    (this.current.time - this.startTime) / 
                    (this.targetTime - this.startTime)
                );
    }
}


function transform( stiffness, x ) {
    return ( 1.0 - Math.exp( stiffness * -x ) ) / 
        ( 1.0 - Math.exp( -stiffness ) );
};

}( OpenSeadragon ));
