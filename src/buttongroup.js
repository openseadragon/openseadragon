
(function( $ ){
/**
 * OpenSeadragon ButtonGroup
 *
 * Manages events on groups of buttons.
 *    
 * options: {
 *     buttons: Array of buttons * required,
 *     group:   Element to use as the container,
 *     config:  Object with Viewer settings ( TODO: is this actually used anywhere? )
 *     enter:   Function callback for when the mouse enters group
 *     exit:    Function callback for when mouse leaves the group
 *     release: Function callback for when mouse is released
 * }
 **/
$.ButtonGroup = function( options ) {

    this.buttons = options.buttons;
    this.element = options.group || $.makeNeutralElement("span");
    this.config  = options.config;
    this.tracker = new $.MouseTracker(
        this.element, 
        this.config.clickTimeThreshold, 
        this.config.clickDistThreshold
    );
    
    // copy the botton elements
    var buttons = this.buttons.concat([]),   
        _this = this,
        i;

    this.element.style.display = "inline-block";
    for ( i = 0; i < buttons.length; i++ ) {
        this.element.appendChild( buttons[ i ].element );
    }


    this.tracker.enter =  options.enter || function() {
        var i;
        for ( i = 0; i < _this.buttons.length; i++) {
            _this.buttons[ i ].notifyGroupEnter();
        }
    };

    this.tracker.exit = options.exit || function() {
        var i,
            buttonDownElmt = arguments.length > 2 ? arguments[2] : null;
        if ( !buttonDownElmt ) {
            for ( i = 0; i < _this.buttons.length; i++ ) {
                _this.buttons[ i ].notifyGroupExit();
            }
        }
    };

    this.tracker.release = options.release || function() {
        var i,
            insideElmtRelease = arguments.length > 3 ? arguments[3] : null;
        if ( !insideElmtRelease ) {
            for ( i = 0; i < _this.buttons.length; i++ ) {
                _this.buttons[ i ].notifyGroupExit();
            }
        }
    };

    this.tracker.setTracking( true );
};

$.ButtonGroup.prototype = {

    emulateEnter: function() {
        this.tracker.enter();
    },

    emulateExit: function() {
        this.tracker.exit();
    }
};


}( OpenSeadragon ));
