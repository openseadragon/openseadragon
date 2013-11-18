/*
 * OpenSeadragon - Button
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
 * An enumeration of button states including, REST, GROUP, HOVER, and DOWN
 * @member ButtonState
 * @memberof OpenSeadragon
 * @static
 */
$.ButtonState = {
    REST:   0,
    GROUP:  1,
    HOVER:  2,
    DOWN:   3
};

/**
 * Manages events, hover states for individual buttons, tool-tips, as well
 * as fading the bottons out when the user has not interacted with them
 * for a specified period.
 * @class Button
 * @memberof OpenSeadragon
 * @extends OpenSeadragon.EventSource
 * @param {Object} options
 * @param {String} options.tooltip Provides context help for the button we the
 *  user hovers over it.
 * @param {String} options.srcRest URL of image to use in 'rest' state
 * @param {String} options.srcGroup URL of image to use in 'up' state
 * @param {String} options.srcHover URL of image to use in 'hover' state
 * @param {String} options.srcDown URL of image to use in 'down' state
 * @param {Element} [options.element] Element to use as a container for the
 *  button.
 * @property {String} tooltip Provides context help for the button we the
 *  user hovers over it.
 * @property {String} srcRest URL of image to use in 'rest' state
 * @property {String} srcGroup URL of image to use in 'up' state
 * @property {String} srcHover URL of image to use in 'hover' state
 * @property {String} srcDown URL of image to use in 'down' state
 * @property {Object} config Configurable settings for this button. DEPRECATED.
 * @property {Element} [element] Element to use as a container for the
 *  button.
 * @property {Number} fadeDelay How long to wait before fading
 * @property {Number} fadeLength How long should it take to fade the button.
 * @property {Number} fadeBeginTime When the button last began to fade.
 * @property {Boolean} shouldFade Whether this button should fade after user
 *  stops interacting with the viewport.
    this.fadeDelay      = 0;      // begin fading immediately
    this.fadeLength     = 2000;   // fade over a period of 2 seconds
    this.fadeBeginTime  = null;
    this.shouldFade     = false;
 */
$.Button = function( options ) {

    var _this = this;

    $.EventSource.call( this );

    $.extend( true, this, {

        tooltip:            null,
        srcRest:            null,
        srcGroup:           null,
        srcHover:           null,
        srcDown:            null,
        clickTimeThreshold: $.DEFAULT_SETTINGS.clickTimeThreshold,
        clickDistThreshold: $.DEFAULT_SETTINGS.clickDistThreshold,
        // begin fading immediately
        fadeDelay:          0,
        // fade over a period of 2 seconds
        fadeLength:         2000,
        onPress:            null,
        onRelease:          null,
        onClick:            null,
        onEnter:            null,
        onExit:             null,
        onFocus:            null,
        onBlur:             null

    }, options );

    this.element        = options.element   || $.makeNeutralElement( "button" );

    //if the user has specified the element to bind the control to explicitly
    //then do not add the default control images
    if( !options.element ){
        this.imgRest      = $.makeTransparentImage( this.srcRest );
        this.imgGroup     = $.makeTransparentImage( this.srcGroup );
        this.imgHover     = $.makeTransparentImage( this.srcHover );
        this.imgDown      = $.makeTransparentImage( this.srcDown );

        this.element.appendChild( this.imgRest );
        this.element.appendChild( this.imgGroup );
        this.element.appendChild( this.imgHover );
        this.element.appendChild( this.imgDown );

        this.imgGroup.style.position =
        this.imgHover.style.position =
        this.imgDown.style.position  =
            "absolute";

        this.imgGroup.style.top =
        this.imgHover.style.top =
        this.imgDown.style.top  =
            "0px";

        this.imgGroup.style.left =
        this.imgHover.style.left =
        this.imgDown.style.left  =
            "0px";

        this.imgHover.style.visibility =
        this.imgDown.style.visibility  =
            "hidden";

        if ( $.Browser.vendor == $.BROWSERS.FIREFOX  && $.Browser.version < 3 ){
            this.imgGroup.style.top =
            this.imgHover.style.top =
            this.imgDown.style.top  =
                "";
        }
    }


    this.addHandler( "press",     this.onPress );
    this.addHandler( "release",   this.onRelease );
    this.addHandler( "click",     this.onClick );
    this.addHandler( "enter",     this.onEnter );
    this.addHandler( "exit",      this.onExit );
    this.addHandler( "focus",     this.onFocus );
    this.addHandler( "blur",      this.onBlur );

    this.currentState = $.ButtonState.GROUP;

    this.fadeBeginTime  = null;
    this.shouldFade     = false;

    this.element.style.display  = "inline-block";
    this.element.style.position = "relative";
    this.element.title          = this.tooltip;

    this.tracker = new $.MouseTracker({

        element:            this.element,
        clickTimeThreshold: this.clickTimeThreshold,
        clickDistThreshold: this.clickDistThreshold,

        enterHandler: function( event ) {
            if ( event.insideElementPressed ) {
                inTo( _this, $.ButtonState.DOWN );
                /**
                 * @event enter
                 * @memberof OpenSeadragon.Button
                 * @type {object}
                 * @property {OpenSeadragon.Button} eventSource - A reference to the Button which raised the event.
                 * @property {Object} originalEvent - The original DOM event.
                 * @property {?Object} userData - Arbitrary subscriber-defined object.
                 */
                _this.raiseEvent( "enter", { originalEvent: event.originalEvent } );
            } else if ( !event.buttonDownAny ) {
                inTo( _this, $.ButtonState.HOVER );
            }
        },

        focusHandler: function ( event ) {
            this.enterHandler( event );
            /**
             * @event focus
             * @memberof OpenSeadragon.Button
             * @type {object}
             * @property {OpenSeadragon.Button} eventSource - A reference to the Button which raised the event.
             * @property {Object} originalEvent - The original DOM event.
             * @property {?Object} userData - Arbitrary subscriber-defined object.
             */
            _this.raiseEvent( "focus", { originalEvent: event.originalEvent } );
        },

        exitHandler: function( event ) {
            outTo( _this, $.ButtonState.GROUP );
            if ( event.insideElementPressed ) {
                /**
                 * @event exit
                 * @memberof OpenSeadragon.Button
                 * @type {object}
                 * @property {OpenSeadragon.Button} eventSource - A reference to the Button which raised the event.
                 * @property {Object} originalEvent - The original DOM event.
                 * @property {?Object} userData - Arbitrary subscriber-defined object.
                 */
                _this.raiseEvent( "exit", { originalEvent: event.originalEvent } );
            }
        },

        blurHandler: function ( event ) {
            this.exitHandler( event );
            /**
             * @event blur
             * @memberof OpenSeadragon.Button
             * @type {object}
             * @property {OpenSeadragon.Button} eventSource - A reference to the Button which raised the event.
             * @property {Object} originalEvent - The original DOM event.
             * @property {?Object} userData - Arbitrary subscriber-defined object.
             */
            _this.raiseEvent( "blur", { originalEvent: event.originalEvent } );
        },

        pressHandler: function ( event ) {
            inTo( _this, $.ButtonState.DOWN );
            /**
             * @event press
             * @memberof OpenSeadragon.Button
             * @type {object}
             * @property {OpenSeadragon.Button} eventSource - A reference to the Button which raised the event.
             * @property {Object} originalEvent - The original DOM event.
             * @property {?Object} userData - Arbitrary subscriber-defined object.
             */
            _this.raiseEvent( "press", { originalEvent: event.originalEvent } );
        },

        releaseHandler: function( event ) {
            if ( event.insideElementPressed && event.insideElementReleased ) {
                outTo( _this, $.ButtonState.HOVER );
                /**
                 * @event release
                 * @memberof OpenSeadragon.Button
                 * @type {object}
                 * @property {OpenSeadragon.Button} eventSource - A reference to the Button which raised the event.
                 * @property {Object} originalEvent - The original DOM event.
                 * @property {?Object} userData - Arbitrary subscriber-defined object.
                 */
                _this.raiseEvent( "release", { originalEvent: event.originalEvent } );
            } else if ( event.insideElementPressed ) {
                outTo( _this, $.ButtonState.GROUP );
            } else {
                inTo( _this, $.ButtonState.HOVER );
            }
        },

        clickHandler: function( event ) {
            if ( event.quick ) {
                /**
                 * @event click
                 * @memberof OpenSeadragon.Button
                 * @type {object}
                 * @property {OpenSeadragon.Button} eventSource - A reference to the Button which raised the event.
                 * @property {Object} originalEvent - The original DOM event.
                 * @property {?Object} userData - Arbitrary subscriber-defined object.
                 */
                _this.raiseEvent("click", { originalEvent: event.originalEvent });
            }
        },

        keyHandler: function( event ){
            //console.log( "%s : handling key %s!", _this.tooltip, event.keyCode);
            if( 13 === event.keyCode ){
                /***
                 * @event click
                 * @memberof OpenSeadragon.Button
                 * @type {object}
                 * @property {OpenSeadragon.Button} eventSource - A reference to the Button which raised the event.
                 * @property {Object} originalEvent - The original DOM event.
                 * @property {?Object} userData - Arbitrary subscriber-defined object.
                 */
                _this.raiseEvent( "click", { originalEvent: event.originalEvent } );
                /***
                 * @event release
                 * @memberof OpenSeadragon.Button
                 * @type {object}
                 * @property {OpenSeadragon.Button} eventSource - A reference to the Button which raised the event.
                 * @property {Object} originalEvent - The original DOM event.
                 * @property {?Object} userData - Arbitrary subscriber-defined object.
                 */
                _this.raiseEvent( "release", { originalEvent: event.originalEvent } );
                return false;
            }
            return true;
        }

    }).setTracking( true );

    outTo( this, $.ButtonState.REST );
};

$.extend( $.Button.prototype, $.EventSource.prototype, /** @lends OpenSeadragon.Button.prototype */{

    /**
     * TODO: Determine what this function is intended to do and if it's actually
     * useful as an API point.
     * @function
     */
    notifyGroupEnter: function() {
        inTo( this, $.ButtonState.GROUP );
    },

    /**
     * TODO: Determine what this function is intended to do and if it's actually
     * useful as an API point.
     * @function
     */
    notifyGroupExit: function() {
        outTo( this, $.ButtonState.REST );
    },

    /**
     * @function
     */
    disable: function(){
        this.notifyGroupExit();
        this.element.disabled = true;
        $.setElementOpacity( this.element, 0.2, true );
    },

    /**
     * @function
     */
    enable: function(){
        this.element.disabled = false;
        $.setElementOpacity( this.element, 1.0, true );
        this.notifyGroupEnter();
    }

});


function scheduleFade( button ) {
    $.requestAnimationFrame(function(){
        updateFade( button );
    });
}

function updateFade( button ) {
    var currentTime,
        deltaTime,
        opacity;

    if ( button.shouldFade ) {
        currentTime = $.now();
        deltaTime   = currentTime - button.fadeBeginTime;
        opacity     = 1.0 - deltaTime / button.fadeLength;
        opacity     = Math.min( 1.0, opacity );
        opacity     = Math.max( 0.0, opacity );

        if( button.imgGroup ){
            $.setElementOpacity( button.imgGroup, opacity, true );
        }
        if ( opacity > 0 ) {
            // fade again
            scheduleFade( button );
        }
    }
}

function beginFading( button ) {
    button.shouldFade = true;
    button.fadeBeginTime = $.now() + button.fadeDelay;
    window.setTimeout( function(){
        scheduleFade( button );
    }, button.fadeDelay );
}

function stopFading( button ) {
    button.shouldFade = false;
    if( button.imgGroup ){
        $.setElementOpacity( button.imgGroup, 1.0, true );
    }
}

function inTo( button, newState ) {

    if( button.element.disabled ){
        return;
    }

    if ( newState >= $.ButtonState.GROUP &&
         button.currentState == $.ButtonState.REST ) {
        stopFading( button );
        button.currentState = $.ButtonState.GROUP;
    }

    if ( newState >= $.ButtonState.HOVER &&
         button.currentState == $.ButtonState.GROUP ) {
        if( button.imgHover ){
            button.imgHover.style.visibility = "";
        }
        button.currentState = $.ButtonState.HOVER;
    }

    if ( newState >= $.ButtonState.DOWN &&
         button.currentState == $.ButtonState.HOVER ) {
        if( button.imgDown ){
            button.imgDown.style.visibility = "";
        }
        button.currentState = $.ButtonState.DOWN;
    }
}


function outTo( button, newState ) {

    if( button.element.disabled ){
        return;
    }

    if ( newState <= $.ButtonState.HOVER &&
         button.currentState == $.ButtonState.DOWN ) {
        if( button.imgDown ){
            button.imgDown.style.visibility = "hidden";
        }
        button.currentState = $.ButtonState.HOVER;
    }

    if ( newState <= $.ButtonState.GROUP &&
         button.currentState == $.ButtonState.HOVER ) {
        if( button.imgHover ){
            button.imgHover.style.visibility = "hidden";
        }
        button.currentState = $.ButtonState.GROUP;
    }

    if ( newState <= $.ButtonState.REST &&
         button.currentState == $.ButtonState.GROUP ) {
        beginFading( button );
        button.currentState = $.ButtonState.REST;
    }
}



}( OpenSeadragon ));
