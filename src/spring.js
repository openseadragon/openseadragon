/*
 * OpenSeadragon - Spring
 *
 * Copyright (C) 2009 CodePlex Foundation
 * Copyright (C) 2010-2025 OpenSeadragon contributors
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
 * @param {Number} options.springStiffness - Spring stiffness. Must be greater than zero.
 * The closer to zero, the closer to linear animation.
 * @param {Number} options.animationTime - Animation duration per spring, in seconds.
 * Must be zero or greater.
 * @param {Number} [options.initial=0] - Initial value of spring.
 * @param {Boolean} [options.exponential=false] - Whether this spring represents
 * an exponential scale (such as zoom) and should be animated accordingly. Note that
 * exponential springs must have non-zero values.
 */
$.Spring = function( options ) {
    var args = arguments;

    if( typeof ( options ) !== 'object' ){
        //allows backward compatible use of ( initialValue, config ) as
        //constructor parameters
        options = {
            initial: args.length && typeof ( args[ 0 ] ) === "number" ?
                args[ 0 ] :
                undefined,
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

    $.console.assert(typeof options.springStiffness === "number" && options.springStiffness !== 0,
        "[OpenSeadragon.Spring] options.springStiffness must be a non-zero number");

    $.console.assert(typeof options.animationTime === "number" && options.animationTime >= 0,
        "[OpenSeadragon.Spring] options.animationTime must be a number greater than or equal to 0");

    if (options.exponential) {
        this._exponential = true;
        delete options.exponential;
    }

    $.extend( true, this, options);

    /**
     * @member {Object} current
     * @memberof OpenSeadragon.Spring#
     * @property {Number} value
     * @property {Number} time
     */
    this.current = {
        value: typeof ( this.initial ) === "number" ?
            this.initial :
            (this._exponential ? 0 : 1),
        time:  $.now() // always work in milliseconds
    };

    $.console.assert(!this._exponential || this.current.value !== 0,
        "[OpenSeadragon.Spring] value must be non-zero for exponential springs");

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

    if (this._exponential) {
        this.start._logValue = Math.log(this.start.value);
        this.target._logValue = Math.log(this.target.value);
        this.current._logValue = Math.log(this.current.value);
    }
};

/** @lends OpenSeadragon.Spring.prototype */
$.Spring.prototype = {

    /**
     * @function
     * @param {Number} target
     */
    resetTo: function( target ) {
        $.console.assert(!this._exponential || target !== 0,
            "[OpenSeadragon.Spring.resetTo] target must be non-zero for exponential springs");

        this.start.value = this.target.value = this.current.value = target;
        this.start.time = this.target.time = this.current.time = $.now();

        if (this._exponential) {
            this.start._logValue = Math.log(this.start.value);
            this.target._logValue = Math.log(this.target.value);
            this.current._logValue = Math.log(this.current.value);
        }
    },

    /**
     * @function
     * @param {Number} target
     */
    springTo: function( target ) {
        $.console.assert(!this._exponential || target !== 0,
            "[OpenSeadragon.Spring.springTo] target must be non-zero for exponential springs");

        this.start.value  = this.current.value;
        this.start.time   = this.current.time;
        this.target.value = target;
        this.target.time  = this.start.time + 1000 * this.animationTime;

        if (this._exponential) {
            this.start._logValue = Math.log(this.start.value);
            this.target._logValue = Math.log(this.target.value);
        }
    },

    /**
     * @function
     * @param {Number} delta
     */
    shiftBy: function( delta ) {
        this.start.value  += delta;
        this.target.value += delta;

        if (this._exponential) {
            $.console.assert(this.target.value !== 0 && this.start.value !== 0,
                "[OpenSeadragon.Spring.shiftBy] spring value must be non-zero for exponential springs");

            this.start._logValue = Math.log(this.start.value);
            this.target._logValue = Math.log(this.target.value);
        }
    },

    setExponential: function(value) {
        this._exponential = value;

        if (this._exponential) {
            $.console.assert(this.current.value !== 0 && this.target.value !== 0 && this.start.value !== 0,
                "[OpenSeadragon.Spring.setExponential] spring value must be non-zero for exponential springs");

            this.start._logValue = Math.log(this.start.value);
            this.target._logValue = Math.log(this.target.value);
            this.current._logValue = Math.log(this.current.value);
        }
    },

    /**
     * @function
     * @returns true if the spring is still updating its value, false if it is
     * already at the target value.
     */
    update: function() {
        this.current.time  = $.now();

        let startValue, targetValue;
        if (this._exponential) {
            startValue = this.start._logValue;
            targetValue = this.target._logValue;
        } else {
            startValue = this.start.value;
            targetValue = this.target.value;
        }

        if(this.current.time >= this.target.time){
            this.current.value = this.target.value;
        } else {
            let currentValue = startValue +
                    ( targetValue - startValue ) *
                    transform(
                        this.springStiffness,
                        ( this.current.time - this.start.time ) /
                        ( this.target.time - this.start.time )
                    );

            if (this._exponential) {
                this.current.value = Math.exp(currentValue);
            } else {
                this.current.value = currentValue;
            }
        }

        return this.current.value !== this.target.value;
    },

    /**
     * Returns whether the spring is at the target value
     * @function
     * @returns {Boolean} True if at target value, false otherwise
     */
    isAtTargetValue: function() {
        return this.current.value === this.target.value;
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
