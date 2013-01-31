/*globals OpenSeadragon */

(function( $ ){
    
/**
 * The Navigator provides a small view of the current image as fixed
 * while representing the viewport as a moving box serving as a frame
 * of reference in the larger viewport as to which portion of the image
 * is currently being examined.  The navigators viewport can be interacted
 * with using the keyboard or the mouse.
 * @class 
 * @name OpenSeadragon.Navigator
 * @extends OpenSeadragon.Viewer
 * @extends OpenSeadragon.EventHandler
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
        sizeRatio:     $.DEFAULT_SETTINGS.navigatorSizeRatio
    }, options, {
        element:                this.element,
        //These need to be overridden to prevent recursion since
        //the navigator is a viewer and a viewer has a navigator
        showNavigator:          false,
        mouseNavEnabled:        false,
        showNavigationControl:  false,
        showSequenceControl:    false
    });

    options.minPixelRatio = this.minPixelRatio = viewer.minPixelRatio;

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
        style.fontSize      = '0px';
        style.overflow      = 'hidden';
        style.border        = '2px solid #900';
        
        //TODO: IE doesnt like this property being set
        //try{ style.outline  = '2px auto #909'; }catch(e){/*ignore*/}
        
        style.background    = 'transparent';

        // We use square bracket notation on the statement below, because float is a keyword.
        // This is important for the Google Closure compliler, if nothing else.
        /*jshint sub:true */ 
        style['float']      = 'left'; //Webkit
        
        style.cssFloat      = 'left'; //Firefox
        style.styleFloat    = 'left'; //IE
        style.zIndex        = 999999999;
        style.cursor        = 'default';
    }( this.displayRegion.style ));

    this.element.innerTracker = new $.MouseTracker({
        element:        this.element,
        scrollHandler:  function(){
            //dont scroll the page up and down if the user is scrolling
            //in the navigator
            return false;
        }
    }).setTracking( true );

    this.displayRegion.innerTracker = new $.MouseTracker({
        element:            this.displayRegion, 
        clickTimeThreshold: this.clickTimeThreshold, 
        clickDistThreshold: this.clickDistThreshold,
        clickHandler:       $.delegate( this, onCanvasClick ),
        dragHandler:        $.delegate( this, onCanvasDrag ),
        releaseHandler:     $.delegate( this, onCanvasRelease ),
        scrollHandler:      $.delegate( this, onCanvasScroll ),
        focusHandler:       function(){
            var point    = $.getElementPosition( _this.viewer.element );

            window.scrollTo( 0, point.y );

            _this.viewer.setControlsEnabled( true );
            (function( style ){
                style.border        = '2px solid #437AB2';
                //style.outline       = '2px auto #437AB2';
            }( this.element.style ));

        },
        blurHandler:       function(){
            _this.viewer.setControlsEnabled( false );
            (function( style ){
                style.border        = '2px solid #900';
                //style.outline       = '2px auto #900';
            }( this.element.style ));
        },
        keyHandler:         function(tracker, keyCode, shiftKey){
            //console.log( keyCode );
            switch( keyCode ){
                case 61://=|+
                    _this.viewer.viewport.zoomBy(1.1);
                    _this.viewer.viewport.applyConstraints();
                    return false;
                case 45://-|_
                    _this.viewer.viewport.zoomBy(0.9);
                    _this.viewer.viewport.applyConstraints();
                    return false;
                case 48://0|)
                    _this.viewer.viewport.goHome();
                    _this.viewer.viewport.applyConstraints();
                    return false;
                case 119://w
                case 87://W
                case 38://up arrow
                    if (shiftKey) 
                        _this.viewer.viewport.zoomBy(1.1);
                    else
                        _this.viewer.viewport.panBy(new $.Point(0, -0.05));
                    _this.viewer.viewport.applyConstraints();
                    return false;
                case 115://s
                case 83://S
                case 40://down arrow
                    if (shiftKey)
                        _this.viewer.viewport.zoomBy(0.9);
                    else
                        _this.viewer.viewport.panBy(new $.Point(0, 0.05));
                    _this.viewer.viewport.applyConstraints();
                    return false;
                case 97://a
                case 37://left arrow
                    _this.viewer.viewport.panBy(new $.Point(-0.05, 0));
                    _this.viewer.viewport.applyConstraints();
                    return false;
                case 100://d
                case 39://right arrow
                    _this.viewer.viewport.panBy(new $.Point(0.05, 0));  
                    _this.viewer.viewport.applyConstraints();
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


    viewer.addControl( 
        this.element, 
        $.ControlAnchor.TOP_RIGHT 
    );

    if( options.width && options.height ){
        this.element.style.width  = options.width + 'px';
        this.element.style.height = options.height + 'px';
    } else {
        this.element.style.width  = ( viewerSize.x * options.sizeRatio ) + 'px';
        this.element.style.height = ( viewerSize.y * options.sizeRatio ) + 'px';
    }

    $.Viewer.apply( this, [ options ] ); 

    this.element.getElementsByTagName('form')[0].appendChild( this.displayRegion );

};

$.extend( $.Navigator.prototype, $.EventHandler.prototype, $.Viewer.prototype, {

    /**
     * @function
     * @name OpenSeadragon.Navigator.prototype.update
     */
    update: function( viewport ){

        var bounds,
            topleft,
            bottomright;

        if( viewport && this.viewport ){
            bounds      = viewport.getBounds( true );
            topleft     = this.viewport.pixelFromPoint( bounds.getTopLeft() );
            bottomright = this.viewport.pixelFromPoint( bounds.getBottomRight() );

            //update style for navigator-box    
            (function(style){

                style.top    = topleft.y + 'px';
                style.left   = topleft.x + 'px';

                var width = Math.abs( topleft.x - bottomright.x ) - 3; // TODO: What's this magic number mean?
                var height = Math.abs( topleft.y - bottomright.y ) - 3;
                // make sure width and height are non-negative so IE doesn't throw
                style.width  = Math.max( width, 0 ) + 'px';
                style.height = Math.max( height, 0 ) + 'px';

            }( this.displayRegion.style ));  
        } 

    }

});


/**
 * @private
 * @inner
 * @function
 */
function onCanvasClick( tracker, position, quick, shift ) {
    this.displayRegion.focus();
}


/**
 * @private
 * @inner
 * @function
 */
function onCanvasDrag( tracker, position, delta, shift ) {
    if ( this.viewer.viewport ) {
        if( !this.panHorizontal ){
            delta.x = 0;
        }
        if( !this.panVertical ){
            delta.y = 0;
        }
        this.viewer.viewport.panBy( 
            this.viewport.deltaPointsFromPixels( 
                delta
            ) 
        );
    }
}


/**
 * @private
 * @inner
 * @function
 */
function onCanvasRelease( tracker, position, insideElementPress, insideElementRelease ) {
    if ( insideElementPress && this.viewer.viewport ) {
        this.viewer.viewport.applyConstraints();
    }
}


/**
 * @private
 * @inner
 * @function
 */
function onCanvasScroll( tracker, position, scroll, shift ) {
    var factor;
    if ( this.viewer.viewport ) {
        factor = Math.pow( this.zoomPerScroll, scroll );
        this.viewer.viewport.zoomBy( 
            factor, 
            //this.viewport.pointFromPixel( position, true ) 
            this.viewport.getCenter()
        );
        this.viewer.viewport.applyConstraints();
    }
    //cancels event
    return false;
}


}( OpenSeadragon ));
