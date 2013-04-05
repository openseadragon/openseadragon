(function( $ ){
    
/**
 * The Navigator provides a small view of the current image as fixed
 * while representing the viewport as a moving box serving as a frame
 * of reference in the larger viewport as to which portion of the image
 * is currently being examined.  The navigator's viewport can be interacted
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
        viewerSize  = $.getElementSize( viewer.element),
        unneededElement;

    //We may need to create a new element and id if they did not
    //provide the id for the existing element
    if( !options.id ){
        options.id              = 'navigator-' + (+new Date());
        this.element            = $.makeNeutralElement( "div" );
        options.controlOptions  = {anchor:           $.ControlAnchor.TOP_RIGHT,
                                   attachToViewer:   true,
                                   autoFade:         true};
    }
    else {
        this.element            = document.getElementById( options.id );
        options.controlOptions  = {anchor:           $.ControlAnchor.NONE,
                                   attachToViewer:   false,
                                   autoFade:         false};
    }
    this.element.id         = options.id;
    this.element.className  += ' navigator';

    options = $.extend( true, {
        sizeRatio:     $.DEFAULT_SETTINGS.navigatorSizeRatio
    }, options, {
        element:                this.element,
        //These need to be overridden to prevent recursion since
        //the navigator is a viewer and a viewer has a navigator
        showNavigator:          false,
        mouseNavEnabled:        false,
        showNavigationControl:  false,
        showSequenceControl:    false,
        immediateRender:        true,
        blendTime:              0,
        animationTime:          0
    });

    options.minPixelRatio = this.minPixelRatio = viewer.minPixelRatio;

    this.viewerSizeInPoints = viewer.viewport.deltaPointsFromPixels(viewerSize);
    this.borderWidth = 2;
    //At some browser magnification levels the display regions lines up correctly, but at some there appears to
    //be a one pixel gap.
    this.fudge = new $.Point(1, 1);
    this.totalBorderWidths = new $.Point(this.borderWidth*2, this.borderWidth*2).minus(this.fudge);


    (function( style, borderWidth ){
        style.margin        = '0px';
        style.border        = borderWidth + 'px solid #555';
        style.padding       = '0px';
        style.background    = '#000';
        style.opacity       = 0.8;
        style.overflow      = 'hidden';
    }( this.element.style, this.borderWidth));

    this.displayRegion           = $.makeNeutralElement( "div" );
    this.displayRegion.id        = this.element.id + '-displayregion';
    this.displayRegion.className = 'displayregion';

    (function( style, borderWidth ){
        style.position      = 'relative';
        style.top           = '0px';
        style.left          = '0px';
        style.fontSize      = '0px';
        style.overflow      = 'hidden';
        style.border        = borderWidth + 'px solid #900';
        style.margin        = '0px';
        style.padding       = '0px';
        //TODO: IE doesnt like this property being set
        //try{ style.outline  = '2px auto #909'; }catch(e){/*ignore*/}
        
        style.background    = 'transparent';

        // We use square bracket notation on the statement below, because float is a keyword.
        // This is important for the Google Closure compiler, if nothing else.
        /*jshint sub:true */ 
        style['float']      = 'left'; //Webkit
        
        style.cssFloat      = 'left'; //Firefox
        style.styleFloat    = 'left'; //IE
        style.zIndex        = 999999999;
        style.cursor        = 'default';
    }( this.displayRegion.style, this.borderWidth ));


    this.element.innerTracker = new $.MouseTracker({
        element:        this.element,
        clickHandler:       $.delegate( this, onCanvasClick ),
        releaseHandler:     $.delegate( this, onCanvasRelease ),
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

        dragHandler:        $.delegate( this, onCanvasDrag ),
        releaseHandler:     $.delegate( this, onCanvasRelease ),
        scrollHandler:      $.delegate( this, onCanvasScroll )
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
        options.controlOptions
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
    unneededElement = this.element.getElementsByTagName('textarea')[0];
    if (unneededElement) {
        unneededElement.parentNode.removeChild(unneededElement);
    }

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
            topleft     = this.viewport.pixelFromPoint( bounds.getTopLeft());
            bottomright = this.viewport.pixelFromPoint( bounds.getBottomRight()).minus(this.totalBorderWidths);

            //update style for navigator-box    
            (function(style, borderWidth){

                style.top    = topleft.y + 'px';
                style.left   = topleft.x + 'px';

                var width = Math.abs( topleft.x - bottomright.x );
                var height = Math.abs( topleft.y - bottomright.y );
                // make sure width and height are non-negative so IE doesn't throw
                style.width  = Math.max( width, 0 ) + 'px';
                style.height = Math.max( height, 0 ) + 'px';

            }( this.displayRegion.style, this.borderWidth));
        } 

    },

    open: function( source ){
        var containerSize = this.viewer.viewport.containerSize.times( this.sizeRatio );
        if( source.tileSize > containerSize.x || 
            source.tileSize > containerSize.y ){
            this.minPixelRatio = Math.min( 
                containerSize.x, 
                containerSize.y 
            ) / source.tileSize;
        } else {
            this.minPixelRatio = this.viewer.minPixelRatio;
        }
        return $.Viewer.prototype.open.apply( this, [ source ] );
    }

});

/**
 * @private
 * @inner
 * @function
 */
function onCanvasClick( tracker, position, quick, shift ) {
    var newBounds,
        viewerPosition,
        dimensions;
    if (! this.drag) {
        if ( this.viewer.viewport ) {
            viewerPosition = this.viewport.deltaPointsFromPixels(position);
            dimensions = this.viewer.viewport.getBounds().getSize();
            newBounds = new $.Rect(
                viewerPosition.x - dimensions.x/2,
                viewerPosition.y - dimensions.y/2,
                dimensions.x,
                dimensions.y
            );
            if (this.viewer.source.aspectRatio > this.viewer.viewport.getAspectRatio()) {
                newBounds.y = newBounds.y -  ((this.viewerSizeInPoints.y - (1/this.viewer.source.aspectRatio)) /2 );
            }
            else  {
                newBounds.x = newBounds.x -  ((this.viewerSizeInPoints.x -1) /2 );
            }
            this.viewer.viewport.fitBounds(newBounds);
            this.viewer.viewport.applyConstraints();
        }
    }
    else {
        this.drag = false;
    }
}

/**
 * @private
 * @inner
 * @function
 */
function onCanvasDrag( tracker, position, delta, shift ) {
    if ( this.viewer.viewport ) {
        this.drag = true;
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
            this.viewport.getCenter()
        );
        this.viewer.viewport.applyConstraints();
    }
    //cancels event
    return false;
}


}( OpenSeadragon ));
