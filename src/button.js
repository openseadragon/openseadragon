

(function( $ ){

/**
 * An enumeration of button states including, REST, GROUP, HOVER, and DOWN
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
 * @class
 * @extends OpenSeadragon.EventHandler
 * @param {Object} options
 * @param {String} options.tooltip Provides context help for the button we the
 *  user hovers over it.
 * @param {String} options.srcRest URL of image to use in 'rest' state
 * @param {String} options.srcGroup URL of image to use in 'up' state
 * @param {String} options.srcHover URL of image to use in 'hover' state
 * @param {String} options.srcDown URL of image to use in 'domn' state
 * @param {Element} [options.element] Element to use as a container for the 
 *  button.
 * @property {String} tooltip Provides context help for the button we the
 *  user hovers over it.
 * @property {String} srcRest URL of image to use in 'rest' state
 * @property {String} srcGroup URL of image to use in 'up' state
 * @property {String} srcHover URL of image to use in 'hover' state
 * @property {String} srcDown URL of image to use in 'domn' state
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

    $.EventHandler.call( this );

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
    this.element.href   = this.element.href || '#';
    
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


    this.addHandler( "onPress",     this.onPress );
    this.addHandler( "onRelease",   this.onRelease );
    this.addHandler( "onClick",     this.onClick );
    this.addHandler( "onEnter",     this.onEnter );
    this.addHandler( "onExit",      this.onExit );
    this.addHandler( "onFocus",     this.onFocus );
    this.addHandler( "onBlur",      this.onBlur );

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

        enterHandler: function( tracker, position, buttonDownElement, buttonDownAny ) {
            if ( buttonDownElement ) {
                inTo( _this, $.ButtonState.DOWN );
                _this.raiseEvent( "onEnter", _this );
            } else if ( !buttonDownAny ) {
                inTo( _this, $.ButtonState.HOVER );
            }
        },

        focusHandler: function( tracker, position, buttonDownElement, buttonDownAny ) {
            this.enterHandler( tracker, position, buttonDownElement, buttonDownAny );
            _this.raiseEvent( "onFocus", _this );
        },

        exitHandler: function( tracker, position, buttonDownElement, buttonDownAny ) {
            outTo( _this, $.ButtonState.GROUP );
            if ( buttonDownElement ) {
                _this.raiseEvent( "onExit", _this );
            }
        },

        blurHandler: function( tracker, position, buttonDownElement, buttonDownAny ) {
            this.exitHandler( tracker, position, buttonDownElement, buttonDownAny );
            _this.raiseEvent( "onBlur", _this );
        },

        pressHandler: function( tracker, position ) {
            inTo( _this, $.ButtonState.DOWN );
            _this.raiseEvent( "onPress", _this );
        },

        releaseHandler: function( tracker, position, insideElementPress, insideElementRelease ) {
            if ( insideElementPress && insideElementRelease ) {
                outTo( _this, $.ButtonState.HOVER );
                _this.raiseEvent( "onRelease", _this );
            } else if ( insideElementPress ) {
                outTo( _this, $.ButtonState.GROUP );
            } else {
                inTo( _this, $.ButtonState.HOVER );
            }
        },

        clickHandler: function( tracker, position, quick, shift ) {
            if ( quick ) {
                _this.raiseEvent("onClick", _this);
            }
        },

        keyHandler: function( tracker, key ){
            //console.log( "%s : handling key %s!", _this.tooltip, key);
            if( 13 === key ){
                _this.raiseEvent( "onClick", _this );
                _this.raiseEvent( "onRelease", _this );
                return false;
            }
            return true;
        }

    }).setTracking( true );

    outTo( this, $.ButtonState.REST );
};

$.extend( $.Button.prototype, $.EventHandler.prototype, {

    /**
     * TODO: Determine what this function is intended to do and if it's actually
     * useful as an API point.
     * @function
     * @name OpenSeadragon.Button.prototype.notifyGroupEnter
     */
    notifyGroupEnter: function() {
        inTo( this, $.ButtonState.GROUP );
    },

    /**
     * TODO: Determine what this function is intended to do and if it's actually
     * useful as an API point.
     * @function
     * @name OpenSeadragon.Button.prototype.notifyGroupExit
     */
    notifyGroupExit: function() {
        outTo( this, $.ButtonState.REST );
    },

    disable: function(){
        this.notifyGroupExit();
        this.element.disabled = true;
        $.setElementOpacity( this.element, 0.2, true );
    },

    enable: function(){
        this.element.disabled = false;
        $.setElementOpacity( this.element, 1.0, true );
        this.notifyGroupEnter();
    }

});


function scheduleFade( button ) {
    window.setTimeout(function(){
        updateFade( button );
    }, 20 );
};

function updateFade( button ) {
    var currentTime,
        deltaTime,
        opacity;

    if ( button.shouldFade ) {
        currentTime = +new Date();
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
};

function beginFading( button ) {
    button.shouldFade = true;
    button.fadeBeginTime = +new Date() + button.fadeDelay;
    window.setTimeout( function(){ 
        scheduleFade( button );
    }, button.fadeDelay );
};

function stopFading( button ) {
    button.shouldFade = false;
    if( button.imgGroup ){
        $.setElementOpacity( button.imgGroup, 1.0, true );
    }
};

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
};


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
};



}( OpenSeadragon ));
