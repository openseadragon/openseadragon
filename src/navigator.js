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
        sizeRatio:              $.DEFAULT_SETTINGS.navigatorSizeRatio
    }, options, {
        element:                this.element,
        //These need to be overridden to prevent recursion since
        //the navigator is a viewer and a viewer has a navigator
        minPixelRatio:          0,
        showNavigator:          false,
        mouseNavEnabled:        false,
        showNavigationControl:  false
    });

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

    this.displayRegion    = $.makeNeutralElement( "div" );
    this.displayRegion.id = this.element.id + '-displayregion';

    (function( style ){
        style.position      = 'relative';
        style.top           = '0px';
        style.left          = '0px';
        style.border        = '1px solid #900';
        style.outline       = '2px auto #900';
        style.background    = 'transparent';
        style.float         = 'left';
        style.zIndex        = 999999999;
    }( this.displayRegion.style ));

    this.element.appendChild( this.displayRegion );

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