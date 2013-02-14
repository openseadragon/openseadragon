(function( $ ){
/**
 * Manages events on groups of buttons.
 * @class
 * @param {Object} options - a dictionary of settings applied against the entire 
 * group of buttons
 * @param {Array}    options.buttons Array of buttons
 * @param {Element}  [options.group]   Element to use as the container,
 * @param {Object}   options.config  Object with Viewer settings ( TODO: is 
 *  this actually used anywhere? )
 * @param {Function} [options.enter]   Function callback for when the mouse 
 *  enters group
 * @param {Function} [options.exit]    Function callback for when mouse leaves 
 *  the group
 * @param {Function} [options.release] Function callback for when mouse is 
 *  released
 * @property {Array} buttons - An array containing the buttons themselves.
 * @property {Element} element - The shared container for the buttons.
 * @property {Object} config - Configurable settings for the group of buttons.
 * @property {OpenSeadragon.MouseTracker} tracker - Tracks mouse events accross
 *  the group of buttons.
 **/
$.ButtonGroup = function( options ) {

    $.extend( true, this, {
        buttons:            [],
        clickTimeThreshold: $.DEFAULT_SETTINGS.clickTimeThreshold,
        clickDistThreshold: $.DEFAULT_SETTINGS.clickDistThreshold,
        labelText:          ""
    }, options );

    // copy the botton elements
    var buttons = this.buttons.concat([]),   
        _this = this,
        i;

    this.element = options.element || $.makeNeutralElement( "fieldgroup" );
    
    if( !options.group ){
        this.label   = $.makeNeutralElement( "label" );
        //TODO: support labels for ButtonGroups
        //this.label.innerHTML = this.labelText;
        this.element.style.display = "inline-block";
        this.element.appendChild( this.label );
        for ( i = 0; i < buttons.length; i++ ) {
            this.element.appendChild( buttons[ i ].element );
        }
    }

    this.tracker = new $.MouseTracker({
        element:            this.element, 
        clickTimeThreshold: this.clickTimeThreshold, 
        clickDistThreshold: this.clickDistThreshold,
        enterHandler: function() {
            var i;
            for ( i = 0; i < _this.buttons.length; i++ ) {
                _this.buttons[ i ].notifyGroupEnter();
            }
        },
        exitHandler: function() {
            var i,
                buttonDownElement = arguments.length > 2 ? 
                    arguments[ 2 ] : 
                    null;
            if ( !buttonDownElement ) {
                for ( i = 0; i < _this.buttons.length; i++ ) {
                    _this.buttons[ i ].notifyGroupExit();
                }
            }
        },
        releaseHandler: function() {
            var i,
                insideElementRelease = arguments.length > 3 ? 
                    arguments[ 3 ] : 
                    null;
            if ( !insideElementRelease ) {
                for ( i = 0; i < _this.buttons.length; i++ ) {
                    _this.buttons[ i ].notifyGroupExit();
                }
            }
        }
    }).setTracking( true );
};

$.ButtonGroup.prototype = {

    /**
     * TODO: Figure out why this is used on the public API and if a more useful
     * api can be created.
     * @function
     * @name OpenSeadragon.ButtonGroup.prototype.emulateEnter
     */
    emulateEnter: function() {
        this.tracker.enterHandler();
    },

    /**
     * TODO: Figure out why this is used on the public API and if a more useful
     * api can be created.
     * @function
     * @name OpenSeadragon.ButtonGroup.prototype.emulateExit
     */
    emulateExit: function() {
        this.tracker.exitHandler();
    }
};


}( OpenSeadragon ));
