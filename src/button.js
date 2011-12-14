
(function( $ ){

$.ButtonState = {
    REST:   0,
    GROUP:  1,
    HOVER:  2,
    DOWN:   3
};

$.Button = function( options ) {

    this._tooltip   = options.tooltip;
    this._srcRest   = options.srcRest;
    this._srcGroup  = options.srcGroup;
    this._srcHover  = options.srcHover;
    this._srcDown   = options.srcDown;
    this._button    = options.button;
    this.config     = options.config;
    
    this._events = new $.EventHandlerList();

    if ( options.onPress != undefined )
        this.add_onPress( options.onPress );
    if ( options.onRelease != undefined )
        this.add_onRelease( options.onRelease );
    if ( options.onClick != undefined )
        this.add_onClick( options.onClick );
    if ( options.onEnter != undefined )
        this.add_onEnter( options.onEnter );
    if ( options.onExit != undefined )
        this.add_onExit( options.onExit );

    this._button = $.Utils.makeNeutralElement("span");
    this._currentState = $.ButtonState.GROUP;
    this._tracker = new $.MouseTracker(
        this._button, 
        this.config.clickTimeThreshold, 
        this.config.clickDistThreshold
    );
    this._imgRest = $.Utils.makeTransparentImage(this._srcRest);
    this._imgGroup = $.Utils.makeTransparentImage(this._srcGroup);
    this._imgHover = $.Utils.makeTransparentImage(this._srcHover);
    this._imgDown = $.Utils.makeTransparentImage(this._srcDown);

    this._fadeDelay = 0;      // begin fading immediately
    this._fadeLength = 2000;  // fade over a period of 2 seconds
    this._fadeBeginTime = null;
    this._shouldFade = false;

    this._button.style.display = "inline-block";
    this._button.style.position = "relative";
    this._button.title = this._tooltip;

    this._button.appendChild(this._imgRest);
    this._button.appendChild(this._imgGroup);
    this._button.appendChild(this._imgHover);
    this._button.appendChild(this._imgDown);

    var styleRest = this._imgRest.style;
    var styleGroup = this._imgGroup.style;
    var styleHover = this._imgHover.style;
    var styleDown = this._imgDown.style;

    styleGroup.position = styleHover.position = styleDown.position = "absolute";
    styleGroup.top = styleHover.top = styleDown.top = "0px";
    styleGroup.left = styleHover.left = styleDown.left = "0px";
    styleHover.visibility = styleDown.visibility = "hidden";

    if ($.Utils.getBrowser() == $.Browser.FIREFOX &&
                $.Utils.getBrowserVersion() < 3) {
        styleGroup.top = styleHover.top = styleDown.top = "";
    }

    this._tracker.enterHandler = $.delegate(this, this._enterHandler);
    this._tracker.exitHandler = $.delegate(this, this._exitHandler);
    this._tracker.pressHandler = $.delegate(this, this._pressHandler);
    this._tracker.releaseHandler = $.delegate(this, this._releaseHandler);
    this._tracker.clickHandler = $.delegate(this, this._clickHandler);

    this._tracker.setTracking( true );
    this._outTo( $.ButtonState.REST );
};

$.Button.prototype = {
    _scheduleFade: function() {
        window.setTimeout($.delegate(this, this._updateFade), 20);
    },
    _updateFade: function() {
        if (this._shouldFade) {
            var currentTime = new Date().getTime();
            var deltaTime = currentTime - this._fadeBeginTime;
            var opacity = 1.0 - deltaTime / this._fadeLength;

            opacity = Math.min(1.0, opacity);
            opacity = Math.max(0.0, opacity);

            $.Utils.setElementOpacity(this._imgGroup, opacity, true);
            if (opacity > 0) {
                this._scheduleFade();    // fade again
            }
        }
    },
    _beginFading: function() {
        this._shouldFade = true;
        this._fadeBeginTime = new Date().getTime() + this._fadeDelay;
        window.setTimeout($.delegate(this, this._scheduleFade), this._fadeDelay);
    },
    _stopFading: function() {
        this._shouldFade = false;
        $.Utils.setElementOpacity(this._imgGroup, 1.0, true);
    },
    _inTo: function(newState) {
        if (newState >= $.ButtonState.GROUP && this._currentState == $.ButtonState.REST) {
            this._stopFading();
            this._currentState = $.ButtonState.GROUP;
        }

        if (newState >= $.ButtonState.HOVER && this._currentState == $.ButtonState.GROUP) {
            this._imgHover.style.visibility = "";
            this._currentState = $.ButtonState.HOVER;
        }

        if (newState >= $.ButtonState.DOWN && this._currentState == $.ButtonState.HOVER) {
            this._imgDown.style.visibility = "";
            this._currentState = $.ButtonState.DOWN;
        }
    },
    _outTo: function(newState) {
        if (newState <= $.ButtonState.HOVER && this._currentState == $.ButtonState.DOWN) {
            this._imgDown.style.visibility = "hidden";
            this._currentState = $.ButtonState.HOVER;
        }

        if (newState <= $.ButtonState.GROUP && this._currentState == $.ButtonState.HOVER) {
            this._imgHover.style.visibility = "hidden";
            this._currentState = $.ButtonState.GROUP;
        }

        if (this._newState <= $.ButtonState.REST && this._currentState == $.ButtonState.GROUP) {
            this._beginFading();
            this._currentState = $.ButtonState.REST;
        }
    },
    _enterHandler: function(tracker, position, buttonDownElmt, buttonDownAny) {
        if (buttonDownElmt) {
            this._inTo($.ButtonState.DOWN);
            this._raiseEvent("onEnter", this);
        } else if (!buttonDownAny) {
            this._inTo($.ButtonState.HOVER);
        }
    },
    _exitHandler: function(tracker, position, buttonDownElmt, buttonDownAny) {
        this._outTo($.ButtonState.GROUP);
        if (buttonDownElmt) {
            this._raiseEvent("onExit", this);
        }
    },
    _pressHandler: function(tracker, position) {
        this._inTo($.ButtonState.DOWN);
        this._raiseEvent("onPress", this);
    },
    _releaseHandler: function(tracker, position, insideElmtPress, insideElmtRelease) {
        if (insideElmtPress && insideElmtRelease) {
            this._outTo($.ButtonState.HOVER);
            this._raiseEvent("onRelease", this);
        } else if (insideElmtPress) {
            this._outTo($.ButtonState.GROUP);
        } else {
            this._inTo($.ButtonState.HOVER);
        }
    },
    _clickHandler: function(tracker, position, quick, shift) {
        if (quick) {
            this._raiseEvent("onClick", this);
        }
    },
    get_events: function get_events() {
        return this._events;
    },
    _raiseEvent: function(eventName, eventArgs) {
        var handler = this.get_events().getHandler(eventName);

        if (handler) {
            if (!eventArgs) {
                eventArgs = new Object(); // Sys.EventArgs.Empty;
            }

            handler(this, eventArgs);
        }
    },
    get_element: function() {
        return this._button;
    },
    get_tooltip: function() {
        return this._tooltip;
    },
    set_tooltip: function(value) {
        this._tooltip = value;
    },
    get_config: function() {
        return this.config;
    },
    set_config: function(value) {
        this.config = value;
    },
    get_srcRest: function() {
        return this._srcRest;
    },
    set_srcRest: function(value) {
        this._srcRest = value;
    },
    get_srcGroup: function() {
        return this._srcGroup;
    },
    set_srcGroup: function(value) {
        this._srcGroup = value;
    },
    get_srcHover: function() {
        return this._srcHover;
    },
    set_srcHover: function(value) {
        this._srcHover = value;
    },
    get_srcDown: function() {
        return this._srcDown;
    },
    set_srcDown: function(value) {
        this._srcDown = value;
    },
    add_onPress: function(handler) {
        this.get_events().addHandler("onPress", handler);
    },
    remove_onPress: function(handler) {
        this.get_events().removeHandler("onPress", handler);
    },
    add_onClick: function(handler) {
        this.get_events().addHandler("onClick", handler);
    },
    remove_onClick: function(handler) {
        this.get_events().removeHandler("onClick", handler);
    },
    add_onEnter: function(handler) {
        this.get_events().addHandler("onEnter", handler);
    },
    remove_onEnter: function(handler) {
        this.get_events().removeHandler("onEnter", handler);
    },
    add_onRelease: function(handler) {
        this.get_events().addHandler("onRelease", handler);
    },
    remove_onRelease: function(handler) {
        this.get_events().removeHandler("onRelease", handler);
    },
    add_onExit: function(handler) {
        this.get_events().addHandler("onExit", handler);
    },
    remove_onExit: function(handler) {
        this.get_events().removeHandler("onExit", handler);
    },
    notifyGroupEnter: function() {
        this._inTo($.ButtonState.GROUP);
    },
    notifyGroupExit: function() {
        this._outTo($.ButtonState.REST);
    }
};

}( OpenSeadragon ));
