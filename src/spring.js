(function( $ ){
    
/**
 * @class
 * @param {Object} options - Spring configuration settings.
 * @param {Number} options.initial - Initial value of spring, default to 0 so 
 *  spring is not in motion initally by default.
 * @param {Number} options.springStiffness - Spring stiffness.
 * @param {Number} options.animationTime - Animation duration per spring.
 * 
 * @property {Number} initial - Initial value of spring, default to 0 so 
 *  spring is not in motion initally by default.
 * @property {Number} springStiffness - Spring stiffness.
 * @property {Number} animationTime - Animation duration per spring.
 * @property {Object} current 
 * @property {Number} start
 * @property {Number} target
 */
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
                1.5
        };
    }

    $.extend( true, this, options);


    this.current = {
        value: typeof ( this.initial ) == "number" ? 
            this.initial : 
            0,
        time:  new Date().getTime() // always work in milliseconds
    };

    this.start = {
        value: this.current.value,
        time:  this.current.time
    };

    this.target = {
        value: this.current.value,
        time:  this.current.time
    };
};

$.Spring.prototype = {

    /**
     * @function
     * @param {Number} target
     */
    resetTo: function( target ) {
        this.target.value = target;
        this.target.time  = this.current.time;
        this.start.value  = this.target.value;
        this.start.time   = this.target.time;
    },

    /**
     * @function
     * @param {Number} target
     */
    springTo: function( target ) {
        this.start.value  = this.current.value;
        this.start.time   = this.current.time;
        this.target.value = target;
        this.target.time  = this.start.time + 1000 * this.animationTime;
    },

    /**
     * @function
     * @param {Number} delta
     */
    shiftBy: function( delta ) {
        this.start.value  += delta;
        this.target.value += delta;
    },

    /**
     * @function
     */
    update: function() {
        this.current.time  = new Date().getTime();
        this.current.value = (this.current.time >= this.target.time) ? 
            this.target.value :
            this.start.value + 
                ( this.target.value - this.start.value ) *
                transform( 
                    this.springStiffness, 
                    ( this.current.time - this.start.time ) / 
                    ( this.target.time  - this.start.time )
                );
    }
};

/**
 * @private
 */
function transform( stiffness, x ) {
    return ( 1.0 - Math.exp( stiffness * -x ) ) / 
        ( 1.0 - Math.exp( -stiffness ) );
}

}( OpenSeadragon ));
