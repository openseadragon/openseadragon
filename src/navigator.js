(function( $ ){
    
/**
 * @param {Object} options
 * @param {String} options.viewerId
 */
$.Navigator = function( options ){

    var _this       = this,
        viewer      = options.viewer,
        viewerSize  = $.getElementSize( viewer.element );
    
    //We may need to create a new element and id if they did not
    //provide the id for the existing element
    if( !options.id ){
        options.id              = 'navigator-' + (+new Date());
        this.element            = $.makeNeutralElement( "div" );
        this.element.id         = options.id;
        this.element.className  = 'navigator';
    }

    options = $.extend( true, {
        navigatorSizeRatio:     $.DEFAULT_SETTINGS.navigatorSizeRatio
    }, options, {
        element:                this.element,
        //These need to be overridden to prevent recursion since
        //the navigator is a viewer and a viewer has a navigator
        showNavigator:          false,
        mouseNavEnabled:        false,
        showNavigationControl:  false
    });

    options.minPixelRatio = Math.min(
        options.navigatorSizeRatio * $.DEFAULT_SETTINGS.minPixelRatio,
        $.DEFAULT_SETTINGS.minPixelRatio
    );

    (function( style ){
        style.marginTop     = '0px';
        style.marginRight   = '0px';
        style.marginBottom  = '0px';
        style.marginLeft    = '0px';
        style.border        = '2px solid #555';
        style.background    = '#000';
        style.opacity       = 0.8;
        style.overflow      = 'hidden';
    }( this.element.style ));

    this.displayRegion           = $.makeNeutralElement( "textarea" );
    this.displayRegion.id        = this.element.id + '-displayregion';
    this.displayRegion.className = 'displayregion';

    (function( style ){
        style.position      = 'relative';
        style.top           = '0px';
        style.left          = '0px';
        style.border        = '1px solid #900';
        //TODO: IE doesnt like this property being set
        //style.outline       = '2px auto #900';
        style.background    = 'transparent';
        style.float         = 'left'; //Webkit
        style.cssFloat      = 'left'; //Firefox
        style.styleFloat    = 'left'; //IE
        style.zIndex        = 999999999;
    }( this.displayRegion.style ));

    this.displayRegion.innerTracker = new $.MouseTracker({
        element:            this.displayRegion, 
        clickTimeThreshold: this.clickTimeThreshold, 
        clickDistThreshold: this.clickDistThreshold,
        focusHandler:       function(){
            _this.viewer.setControlsEnabled( true );
            (function( style ){
                style.border        = '1px solid #437AB2';
                style.outline       = '2px auto #437AB2';
            }( this.element.style ));

        },
        blurHandler:       function(){
            _this.viewer.setControlsEnabled( false );
            (function( style ){
                style.border        = '1px solid #900';
                style.outline       = '2px auto #900';
            }( this.element.style ));
        },
        keyHandler:         function(tracker, keyCode){
            //console.log( keyCode );
            switch( keyCode ){
                case 119://w
                case 38://up arrow
                    _this.viewer.viewport.panBy(new $.Point(0, -0.05));
                    return false;
                case 115://s
                case 40://down arrow
                    _this.viewer.viewport.panBy(new $.Point(0, 0.05));
                    return false;
                case 97://a
                case 37://left arrow
                    _this.viewer.viewport.panBy(new $.Point(-0.05, 0));
                    return false;
                case 100://d
                case 39://right arrow
                    _this.viewer.viewport.panBy(new $.Point(0.05, 0));  
                    return false;
                case 61://=|+
                    _this.viewer.viewport.zoomBy(1.1);  
                    return false;
                case 45://-|_
                    _this.viewer.viewport.zoomBy(0.9);
                    return false;
                case 48://0|)
                    _this.viewer.viewport.goHome();
                    return false;
                default:
                    //console.log( 'navigator keycode %s', keyCode );
                    return true;
            }
        }
    }).setTracking( true ); // default state

    /*this.displayRegion.outerTracker = new $.MouseTracker({
        element:            this.container, 
        clickTimeThreshold: this.clickTimeThreshold, 
        clickDistThreshold: this.clickDistThreshold,
        enterHandler:       $.delegate( this, onContainerEnter ),
        exitHandler:        $.delegate( this, onContainerExit ),
        releaseHandler:     $.delegate( this, onContainerRelease )
    }).setTracking( this.mouseNavEnabled ? true : false ); // always tracking*/

    this.element.appendChild( this.displayRegion );

    viewer.addControl( 
        this.element, 
        $.ControlAnchor.TOP_RIGHT 
    );

    if( options.width && options.height ){
        this.element.style.width  = options.width + 'px';
        this.element.style.height = options.height + 'px';
    } else {
        this.element.style.width  = ( viewerSize.x * options.navigatorSizeRatio ) + 'px';
        this.element.style.height = ( viewerSize.y * options.navigatorSizeRatio ) + 'px';
    }

    $.Viewer.apply( this, [ options ] ); 

};

$.extend( $.Navigator.prototype, $.EventHandler.prototype, $.Viewer.prototype, {

    update: function( viewport ){

        var bounds      = viewport.getBounds( true ),
            topleft     = this.viewport.pixelFromPoint( bounds.getTopLeft() )
            bottomright = this.viewport.pixelFromPoint( bounds.getBottomRight() );

        //update style for navigator-box    
        (function(style){

            style.top    = topleft.y + 'px';
            style.left   = topleft.x + 'px';
            style.width  = ( Math.abs( topleft.x - bottomright.x ) - 3 ) + 'px';
            style.height = ( Math.abs( topleft.y - bottomright.y ) - 3 ) + 'px';

        }( this.displayRegion.style ));   

    }

});


}( OpenSeadragon ));