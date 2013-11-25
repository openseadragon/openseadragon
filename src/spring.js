/*
 * OpenSeadragon - Spring
 *
 * Copyright (C) 2009 CodePlex Foundation
 * Copyright (C) 2010-2013 OpenSeadragon contributors
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 * - Redistributions of source code must retain the above copyright notice,
 *   this list of conditions and the following disclaimer.
 *
 * - Redistributions in binary form must reproduce the above copyright
 *   notice, this list of conditions and the following disclaimer in the
 *   documentation and/or other materials provided with the distribution.
 *
 * - Neither the name of CodePlex Foundation nor the names of its
 *   contributors may be used to endorse or promote products derived from
 *   this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

(function( $ ){

/**
 * @class Spring
 * @memberof OpenSeadragon
 * @param {Object} options - Spring configuration settings.
 * @param {Number} options.initial - Initial value of spring, default to 0 so
 *  spring is not in motion initally by default.
 * @param {Number} options.springStiffness - Spring stiffness.
 * @param {Number} options.animationTime - Animation duration per spring.
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
            /**
             * Spring stiffness.
             * @member {Number} springStiffness
             * @memberof OpenSeadragon.Spring#
             */
            springStiffness: args.length > 1 ?
                args[ 1 ].springStiffness :
                5.0,
            /**
             * Animation duration per spring.
             * @member {Number} animationTime
             * @memberof OpenSeadragon.Spring#
             */
            animationTime: args.length > 1 ?
                args[ 1 ].animationTime :
                1.5
        };
    }

    $.extend( true, this, options);

    /**
     * @member {Object} current
     * @memberof OpenSeadragon.Spring#
     * @property {Number} value
     * @property {Number} time
     */
    this.current = {
        value: typeof ( this.initial ) == "number" ?
            this.initial :
            0,
        time:  $.now() // always work in milliseconds
    };

    /**
     * @member {Object} start
     * @memberof OpenSeadragon.Spring#
     * @property {Number} value
     * @property {Number} time
     */
    this.start = {
        value: this.current.value,
        time:  this.current.time
    };

    /**
     * @member {Object} target
     * @memberof OpenSeadragon.Spring#
     * @property {Number} value
     * @property {Number} time
     */
    this.target = {
        value: this.current.value,
        time:  this.current.time
    };
};

$.Spring.prototype = /** @lends OpenSeadragon.Spring.prototype */{

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
        this.current.time  = $.now();
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
