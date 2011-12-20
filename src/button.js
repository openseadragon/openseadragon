
(function( $ ){

$.ButtonState = {
    REST:   0,
    GROUP:  1,
    HOVER:  2,
    DOWN:   3
};

$.Button = function( options ) {

    var _this = this;

    $.EventHandler.call( this );

    this.tooltip   = options.tooltip;
    this.srcRest   = options.srcRest;
    this.srcGroup  = options.srcGroup;
    this.srcHover  = options.srcHover;
    this.srcDown   = options.srcDown;
    //TODO: make button elements accessible by making them a-tags
    //      maybe even consider basing them on the element and adding
    //      methods jquery-style.
    this.element    = options.element || $.Utils.makeNeutralElement("span");
    this.config     = options.config;

    if ( options.onPress != undefined ){
        this.addHandler("onPress", options.onPress );
    }
    if ( options.onRelease != undefined ){
        this.addHandler("onRelease", options.onRelease );
    }
    if ( options.onClick != undefined ){
        this.addHandler("onClick", options.onClick );
    }
    if ( options.onEnter != undefined ){
        this.addHandler("onEnter", options.onEnter );
    }
    if ( options.onExit != undefined ){
        this.addHandler("onExit", options.onExit );
    }

    this.currentState = $.ButtonState.GROUP;
    this.tracker = new $.MouseTracker(
        this.element, 
        this.config.clickTimeThreshold, 
        this.config.clickDistThreshold
    );
    this.imgRest    = $.Utils.makeTransparentImage( this.srcRest );
    this.imgGroup   = $.Utils.makeTransparentImage( this.srcGroup );
    this.imgHover   = $.Utils.makeTransparentImage( this.srcHover );
    this.imgDown    = $.Utils.makeTransparentImage( this.srcDown );

    this.fadeDelay      = 0;      // begin fading immediately
    this.fadeLength     = 2000;   // fade over a period of 2 seconds
    this.fadeBeginTime  = null;
    this.shouldFade     = false;

    this.element.style.display  = "inline-block";
    this.element.style.position = "relative";
    this.element.title          = this.tooltip;

    this.element.appendChild( this.imgRest );
    this.element.appendChild( this.imgGroup );
    this.element.appendChild( this.imgHover );
    this.element.appendChild( this.imgDown );

    var styleRest   = this.imgRest.style;
    var styleGroup  = this.imgGroup.style;
    var styleHover  = this.imgHover.style;
    var styleDown   = this.imgDown.style;

    styleGroup.position = 
        styleHover.position = 
        styleDown.position = 
            "absolute";

    styleGroup.top = 
        styleHover.top = 
        styleDown.top = 
            "0px";

    styleGroup.left = 
        styleHover.left = 
        styleDown.left = 
            "0px";

    styleHover.visibility = 
        styleDown.visibility = 
            "hidden";

    if ( $.Utils.getBrowser() == $.Browser.FIREFOX 
         && $.Utils.getBrowserVersion() < 3 ){

        styleGroup.top = 
            styleHover.top = 
            styleDown.top = "";
    }

    //TODO - refactor mousetracer next to avoid this extension
    $.extend( this.tracker, {
        enterHandler: function(tracker, position, buttonDownElmt, buttonDownAny) {
            if ( buttonDownElmt ) {
                inTo( _this, $.ButtonState.DOWN );
                _this.raiseEvent( "onEnter", _this );
            } else if ( !buttonDownAny ) {
                inTo( _this, $.ButtonState.HOVER );
            }
        },
        exitHandler: function(tracker, position, buttonDownElmt, buttonDownAny) {
            outTo( _this, $.ButtonState.GROUP );
            if ( buttonDownElmt ) {
                _this.raiseEvent( "onExit", _this );
            }
        },
        pressHandler: function(tracker, position) {
            inTo( _this, $.ButtonState.DOWN );
            _this.raiseEvent( "onPress", _this );
        },
        releaseHandler: function(tracker, position, insideElmtPress, insideElmtRelease) {
            if ( insideElmtPress && insideElmtRelease ) {
                outTo( _this, $.ButtonState.HOVER );
                _this.raiseEvent( "onRelease", _this );
            } else if ( insideElmtPress ) {
                outTo( _this, $.ButtonState.GROUP );
            } else {
                inTo( _this, $.ButtonState.HOVER );
            }
        },
        clickHandler: function(tracker, position, quick, shift) {
            if ( quick ) {
                _this.raiseEvent("onClick", _this);
            }
        }
    });

    this.tracker.setTracking( true );
    outTo( this, $.ButtonState.REST );
};

$.extend( $.Button.prototype, $.EventHandler.prototype, {
    notifyGroupEnter: function() {
        inTo( this, $.ButtonState.GROUP );
    },
    notifyGroupExit: function() {
        outTo( this, $.ButtonState.REST );
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
        deltaTime   = currentTime - this.fadeBeginTime;
        opacity     = 1.0 - deltaTime / this.fadeLength;
        opacity     = Math.min( 1.0, opacity );
        opacity     = Math.max( 0.0, opacity );

        $.Utils.setElementOpacity( button.imgGroup, opacity, true );
        if ( opacity > 0 ) {
            // fade again
            scheduleFade( button );
        }
    }
};

function beginFading( button ) {
    button.shouldFade = true;
    button.fadeBeginTime = new Date().getTime() + button.fadeDelay;
    window.setTimeout(function(){ 
        scheduleFade( button );
    }, button.fadeDelay );
};

function stopFading( button ) {
    button.shouldFade = false;
    $.Utils.setElementOpacity( button.imgGroup, 1.0, true );
};

function inTo( button, newState ) {
    if ( newState >= $.ButtonState.GROUP && button.currentState == $.ButtonState.REST ) {
        stopFading( button );
        button.currentState = $.ButtonState.GROUP;
    }

    if ( newState >= $.ButtonState.HOVER && button.currentState == $.ButtonState.GROUP ) {
        button.imgHover.style.visibility = "";
        button.currentState = $.ButtonState.HOVER;
    }

    if ( newState >= $.ButtonState.DOWN && button.currentState == $.ButtonState.HOVER ) {
        button.imgDown.style.visibility = "";
        button.currentState = $.ButtonState.DOWN;
    }
};


function outTo( button, newState ) {
    if ( newState <= $.ButtonState.HOVER && button.currentState == $.ButtonState.DOWN ) {
        button.imgDown.style.visibility = "hidden";
        button.currentState = $.ButtonState.HOVER;
    }

    if ( newState <= $.ButtonState.GROUP && button.currentState == $.ButtonState.HOVER ) {
        button.imgHover.style.visibility = "hidden";
        button.currentState = $.ButtonState.GROUP;
    }

    if ( button.newState <= $.ButtonState.REST && button.currentState == $.ButtonState.GROUP ) {
        button.beginFading();
        button.currentState = $.ButtonState.REST;
    }
};



}( OpenSeadragon ));
