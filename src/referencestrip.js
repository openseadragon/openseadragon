(function( $ ){
    
// dictionary from id to private properties
var THIS = {};

/**
 *  The CollectionDrawer is a reimplementation if the Drawer API that
 *  focuses on allowing a viewport to be redefined as a collection 
 *  of smaller viewports, defined by a clear number of rows and / or
 *  columns of which each item in the matrix of viewports has its own
 *  source.  
 *
 *  This idea is a reexpression of the idea of dzi collections
 *  which allows a clearer algorithm to reuse the tile sources already
 *  supported by OpenSeadragon, in heterogenious or homogenious
 *  sequences just like mixed groups already supported by the viewer
 *  for the purpose of image sequnces.
 *
 *  TODO:   The difficult part of this feature is figuring out how to express
 *          this functionality as a combination of the functionality already 
 *          provided by Drawer, Viewport, TileSource, and Navigator.  It may 
 *          require better abstraction at those points in order to effeciently
 *          reuse those paradigms.
 */
$.ReferenceStrip = function( options ){

    var _this       = this,
        viewer      = options.viewer,
        viewerSize  = $.getElementSize( viewer.element ),
        miniViewer,
        minPixelRatio,
        element,
        i;
    
    //We may need to create a new element and id if they did not
    //provide the id for the existing element
    if( !options.id ){
        options.id              = 'referencestrip-' + (+new Date());
        this.element            = $.makeNeutralElement( "div" );
        this.element.id         = options.id;
        this.element.className  = 'referencestrip';
    }

    options = $.extend( true, {
        sizeRatio:  $.DEFAULT_SETTINGS.referenceStripSizeRatio,
        position:   $.DEFAULT_SETTINGS.referenceStripPosition,
        scroll:     $.DEFAULT_SETTINGS.referenceStripScroll,
        clickTimeThreshold:  $.DEFAULT_SETTINGS.clickTimeThreshold
    }, options, {
        //required overrides
        element:                this.element,
        //These need to be overridden to prevent recursion since
        //the navigator is a viewer and a viewer has a navigator
        showNavigator:          false,
        mouseNavEnabled:        false,
        showNavigationControl:  false,
        showSequenceControl:    false
    });

    $.extend( this, options );

    //Private state properties
    THIS[ this.id ] = {
        "animating":         false
    };

    this.minPixelRatio = this.viewer.minPixelRatio;

    (function( style ){
        style.marginTop     = '0px';
        style.marginRight   = '0px';
        style.marginBottom  = '0px';
        style.marginLeft    = '0px';
        style.left          = '0px';
        style.bottom        = '0px';
        style.border        = '0px';
        style.background    = '#000';
        style.position      = 'relative';
    }( this.element.style ));

    $.setElementOpacity( this.element, 0.8 );

    this.viewer = viewer;
    this.innerTracker = new $.MouseTracker({
        element:        this.element,
        dragHandler:    $.delegate( this, onStripDrag ),
        scrollHandler:  $.delegate( this, onStripScroll ),
        enterHandler:   $.delegate( this, onStripEnter ),
        exitHandler:    $.delegate( this, onStripExit ),
        keyHandler:     $.delegate( this, onKeyPress )
    }).setTracking( true );

    

    //Controls the position and orientation of the reference strip and sets the  
    //appropriate width and height
    if( options.width && options.height ){
        this.element.style.width  = options.width + 'px';
        this.element.style.height = options.height + 'px';
        viewer.addControl( 
            this.element, 
            $.ControlAnchor.BOTTOM_LEFT
        );
    } else {
        if( "horizontal" == options.scroll ){
            this.element.style.width = ( 
                viewerSize.x * 
                options.sizeRatio * 
                viewer.tileSources.length
            ) + ( 12 * viewer.tileSources.length ) + 'px';

            this.element.style.height  = ( 
                viewerSize.y * 
                options.sizeRatio 
            ) + 'px';

            viewer.addControl( 
                this.element, 
                $.ControlAnchor.BOTTOM_LEFT
            );
        }else {
            this.element.style.height = ( 
                viewerSize.y * 
                options.sizeRatio * 
                viewer.tileSources.length
            ) + ( 12 * viewer.tileSources.length ) + 'px';

            this.element.style.width  = ( 
                viewerSize.x * 
                options.sizeRatio 
            ) + 'px';

            viewer.addControl( 
                this.element, 
                $.ControlAnchor.TOP_LEFT
            );

        }
    }

    this.panelWidth = ( viewerSize.x * this.sizeRatio ) + 8;
    this.panelHeight = ( viewerSize.y * this.sizeRatio ) + 8;
    this.panels = [];

    for( i = 0; i < viewer.tileSources.length; i++ ){
        
        element = $.makeNeutralElement('div');
        element.id = this.element.id + "-" + i;

        (function(style){
            style.width         = _this.panelWidth + 'px';
            style.height        = _this.panelHeight + 'px';
            style.display       = 'inline';
            style.float         = 'left'; //Webkit
            style.cssFloat      = 'left'; //Firefox
            style.styleFloat    = 'left'; //IE
            style.padding       = '2px';
        }(element.style));

        element.innerTracker = new $.MouseTracker({
            element:        element,
            clickTimeThreshold: this.clickTimeThreshold, 
            clickDistThreshold: this.clickDistThreshold,
            pressHandler: function( tracker ){
                tracker.dragging = +new Date;
            },
            releaseHandler: function( tracker, position, insideElementPress, insideElementRelease ){
                var id = tracker.element.id,
                    page = Number( id.split( '-' )[ 2 ] ),
                    now = +new Date;
                
                if ( insideElementPress && 
                     insideElementRelease && 
                     tracker.dragging &&
                     ( now - tracker.dragging ) < tracker.clickTimeThreshold ){
                    tracker.dragging = null;
                    viewer.goToPage( page );
                }
            }
        }).setTracking( true );

        this.element.appendChild( element );

        element.activePanel = false;

        this.panels.push( element );

    }
    loadPanels( this, this.scroll == 'vertical' ? viewerSize.y : viewerSize.y, 0);
    this.setFocus( 0 );

};

$.extend( $.ReferenceStrip.prototype, $.EventHandler.prototype, $.Viewer.prototype, {

    setFocus: function( page ){
        var element = $.getElement( this.element.id + '-' + page ),
            viewerSize = $.getElementSize( this.viewer.canvas ),
            scrollWidth = Number(this.element.style.width.replace('px','')),
            scrollHeight = Number(this.element.style.height.replace('px','')),
            offsetLeft = -Number(this.element.style.marginLeft.replace('px','')),
            offsetTop = -Number(this.element.style.marginTop.replace('px','')),
            offset;

        if ( this.currentSelected !== element ){
            if( this.currentSelected ){
                this.currentSelected.style.background = '#000';
            }
            this.currentSelected = element;
            this.currentSelected.style.background = '#999';

            if( 'horizontal' == this.scroll ){
                //right left
                offset = (Number(page)) * ( this.panelWidth + 3 );
                if( offset > offsetLeft + viewerSize.x - this.panelWidth){
                    offset = Math.min(offset, (scrollWidth - viewerSize.x));
                    this.element.style.marginLeft = -offset + 'px';
                    loadPanels( this, viewerSize.x, -offset );
                }else if( offset < offsetLeft ){
                    offset = Math.max(0, offset - viewerSize.x / 2);
                    this.element.style.marginLeft = -offset + 'px';
                    loadPanels( this, viewerSize.x, -offset );
                }
            }else{
                offset = (Number(page) ) * ( this.panelHeight + 3 );
                if( offset > offsetTop + viewerSize.y - this.panelHeight){
                    offset = Math.min(offset, (scrollHeight - viewerSize.y));
                    this.element.style.marginTop = -offset + 'px';
                    loadPanels( this, viewerSize.y, -offset );
                }else if( offset < offsetTop ){
                    offset = Math.max(0, offset - viewerSize.y / 2);
                    this.element.style.marginTop = -offset + 'px';
                    loadPanels( this, viewerSize.y, -offset );
                }
            }

            this.currentPage = page;
            $.getElement( element.id + '-displayregion' ).focus();
            onStripEnter.call( this, this.innerTracker );
        }
    },
    /**
     * @function
     * @name OpenSeadragon.Navigator.prototype.update
     */
    update: function( viewport ){

        if( THIS[ this.id ].animating ){
            $.console.log('image reference strip update');
            return true;
        }
        return false;

    }

});




/**
 * @private
 * @inner
 * @function
 */
function onStripDrag( tracker, position, delta, shift ) {
    
    var offsetLeft = Number(this.element.style.marginLeft.replace('px','')),
        offsetTop = Number(this.element.style.marginTop.replace('px','')),
        scrollWidth = Number(this.element.style.width.replace('px','')),
        scrollHeight = Number(this.element.style.height.replace('px','')),
        viewerSize = $.getElementSize( this.viewer.canvas );
    this.dragging = true;
    if ( this.element ) {
        if( 'horizontal' == this.scroll ){
            if ( -delta.x > 0 ) {
                //forward
                if( offsetLeft > -(scrollWidth - viewerSize.x)){
                    this.element.style.marginLeft = ( offsetLeft + (delta.x * 2) ) + 'px';
                    loadPanels( this, viewerSize.x, offsetLeft + (delta.x * 2) );
                }
            } else if ( -delta.x < 0 ) {
                //reverse
                if( offsetLeft < 0 ){
                    this.element.style.marginLeft = ( offsetLeft + (delta.x * 2) ) + 'px';
                    loadPanels( this, viewerSize.x, offsetLeft + (delta.x * 2) );
                }
            }
        }else{
            if ( -delta.y > 0 ) {
                //forward
                if( offsetTop > -(scrollHeight - viewerSize.y)){
                    this.element.style.marginTop = ( offsetTop + (delta.y * 2) ) + 'px';
                    loadPanels( this, viewerSize.y, offsetTop + (delta.y * 2) );
                }
            } else if ( -delta.y < 0 ) {
                //reverse
                if( offsetTop < 0 ){
                    this.element.style.marginTop = ( offsetTop + (delta.y * 2) ) + 'px';
                    loadPanels( this, viewerSize.y, offsetTop + (delta.y * 2) );
                }
            }
        }
    }
    return false;

};



/**
 * @private
 * @inner
 * @function
 */
function onStripScroll( tracker, position, scroll, shift ) {
    var offsetLeft = Number(this.element.style.marginLeft.replace('px','')),
        offsetTop = Number(this.element.style.marginTop.replace('px','')),
        scrollWidth = Number(this.element.style.width.replace('px','')),
        scrollHeight = Number(this.element.style.height.replace('px','')),
        viewerSize = $.getElementSize( this.viewer.canvas );
    if ( this.element ) {
        if( 'horizontal' == this.scroll ){
            if ( scroll > 0 ) {
                //forward
                if( offsetLeft > -(scrollWidth - viewerSize.x)){
                    this.element.style.marginLeft = ( offsetLeft - (scroll * 60) ) + 'px';
                    loadPanels( this, viewerSize.x, offsetLeft - (scroll * 60) );
                }
            } else if ( scroll < 0 ) {
                //reverse
                if( offsetLeft < 0 ){
                    this.element.style.marginLeft = ( offsetLeft - (scroll * 60) ) + 'px';
                    loadPanels( this, viewerSize.x, offsetLeft - (scroll * 60) );
                }
            }
        }else{
            if ( scroll < 0 ) {
                //scroll up
                if( offsetTop > viewerSize.y - scrollHeight  ){
                    this.element.style.marginTop = ( offsetTop + (scroll * 60) ) + 'px';
                    loadPanels( this, viewerSize.y, offsetTop + (scroll * 60) );
                }
            } else if ( scroll > 0 ) {
                //scroll dowm
                if( offsetTop < 0 ){
                    this.element.style.marginTop = ( offsetTop + (scroll * 60) ) + 'px';
                    loadPanels( this, viewerSize.y, offsetTop + (scroll * 60) );
                }
            }
        }
    }
    //cancels event
    return false;
};


function loadPanels(strip, viewerSize, scroll){
    var panelSize,
        activePanelsStart,
        activePanelsEnd,
        miniViewer,
        i;
    if( 'horizontal' == strip.scroll ){
        panelSize = strip.panelWidth;
    }else{
        panelSize = strip.panelHeight;
    }
    activePanelsStart = Math.ceil( viewerSize / panelSize ) + 5;
    activePanelsEnd = Math.ceil( (Math.abs(scroll) + viewerSize ) / panelSize ) + 1;
    activePanelsStart = activePanelsEnd - activePanelsStart;
    activePanelsStart = activePanelsStart < 0 ? 0 : activePanelsStart;

    for( i = activePanelsStart; i < activePanelsEnd && i < strip.panels.length; i++ ){
        element = strip.panels[ i ];
        if ( !element.activePanel ){
            miniViewer = new $.Viewer( {
                id:                     element.id,
                tileSources:            [ strip.viewer.tileSources[ i ] ],
                element:                element,
                navigatorSizeRatio:     strip.sizeRatio,
                minPixelRatio:          strip.minPixelRatio, 
                showNavigator:          false,
                mouseNavEnabled:        false,
                showNavigationControl:  false,
                showSequenceControl:    false
            } ); 

            miniViewer.displayRegion           = $.makeNeutralElement( "textarea" );
            miniViewer.displayRegion.id        = element.id + '-displayregion';
            miniViewer.displayRegion.className = 'displayregion';

            (function( style ){
                style.position      = 'relative';
                style.top           = '0px';
                style.left          = '0px';
                style.fontSize      = '0px';
                style.overflow      = 'hidden';
                style.float         = 'left'; //Webkit
                style.cssFloat      = 'left'; //Firefox
                style.styleFloat    = 'left'; //IE
                style.zIndex        = 999999999;
                style.cursor        = 'default';
                style.width         = ( strip.panelWidth - 4 ) + 'px';
                style.height        = ( strip.panelHeight - 4 ) + 'px';
            }( miniViewer.displayRegion.style ));

            miniViewer.displayRegion.innerTracker = new $.MouseTracker({
                element:        miniViewer.displayRegion
            });

            element.getElementsByTagName('form')[ 0 ].appendChild( 
                miniViewer.displayRegion 
            );

            element.activePanel = true;
        }
    }
};


/**
 * @private
 * @inner
 * @function
 */
function onStripEnter( tracker ) {

    //$.setElementOpacity(tracker.element, 0.8);

    //tracker.element.style.border = '1px solid #555';
    //tracker.element.style.background = '#000';

    if( 'horizontal' == this.scroll ){

        //tracker.element.style.paddingTop = "0px";
        tracker.element.style.marginBottom = "0px";

    } else {
        
        //tracker.element.style.paddingRight = "0px";
        tracker.element.style.marginLeft = "0px";

    }
    return false
};


/**
 * @private
 * @inner
 * @function
 */
function onStripExit( tracker ) {

    var viewerSize = $.getElementSize( this.viewer.element );

    //$.setElementOpacity(tracker.element, 0.4);
    //tracker.element.style.border = 'none';
    //tracker.element.style.background = '#fff';
    

    if( 'horizontal' == this.scroll ){
    
        //tracker.element.style.paddingTop = "10px";
        tracker.element.style.marginBottom = "-" + ( $.getElementSize( tracker.element ).y / 2 ) + "px";
    
    } else {
    
        //tracker.element.style.paddingRight = "10px";
        tracker.element.style.marginLeft = "-" + ( $.getElementSize( tracker.element ).x / 2 )+ "px";
    
    }
    return false;
};



/**
 * @private
 * @inner
 * @function
 */
function onKeyPress( tracker, keyCode, shiftKey ){
    //console.log( keyCode );

    switch( keyCode ){
        case 61://=|+
            onStripScroll.call(this, this.tracker, null, 1, null);
            return false;
        case 45://-|_
            onStripScroll.call(this, this.tracker, null, -1, null);
            return false;
        case 48://0|)
        case 119://w
        case 87://W
        case 38://up arrow
            onStripScroll.call(this, this.tracker, null, 1, null);
            return false;
        case 115://s
        case 83://S
        case 40://down arrow
            onStripScroll.call(this, this.tracker, null, -1, null);
            return false;
        case 97://a
        case 37://left arrow
            onStripScroll.call(this, this.tracker, null, -1, null);
            return false;
        case 100://d
        case 39://right arrow
            onStripScroll.call(this, this.tracker, null, 1, null);
            return false;
        default:
            //console.log( 'navigator keycode %s', keyCode );
            return true;
    }
};



}( OpenSeadragon ));