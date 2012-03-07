(function( $ ){
    
/**
 * @param {Object} options
 * @param {String} options.viewerId
 */
$.Navigator = function( options ){

    var _this       = this,
        viewer      = $.getElement( options.viewerId ),
        viewerSize  = $.getElementSize( viewer );
    
    //We may need to create a new element and id if they did not
    //provide the id for the existing element
    if( !options.id ){
        options.id      = 'navigator-' + (+new Date());
        this.element    = $.makeNeutralElement( "div" );
        this.element.id = options.id;
    }

    options = $.extend( true, options, {
        element:                this.element,
        //These need to be overridden to prevent recursion since
        //the navigator is a viewer and a viewer has a navigator
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

    this.displayRegion = $.makeNeutralElement( "div" );
    this.displayRegion.id = this.element.id + '-displayregion';

    (function( style ){
        style.position      = 'relative';
        style.top           = '0px';
        style.left          = '0px';
        style.border        = '1px solid red';
        style.background    = 'transparent';
        style.float         = 'left';
        style.zIndex        = 999999999;
        style.opacity       = 0.8;
    }( this.displayRegion.style ));

    this.element.appendChild( this.displayRegion );

    $.Viewer.apply( this, [ options ] ); 

    if( options.width ){
        this.element.style.width = options.width + 'px';
    } else {
        this.element.style.width = ( viewerSize.x / 4 ) + 'px';
    }
    if( options.height ){
        this.element.style.height = options.height + 'px';
    } else {
        this.element.style.height = ( viewerSize.y / 4 ) + 'px';
    }

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
            style.width  = ( Math.abs( topleft.x - bottomright.x ) - 2 ) + 'px';
            style.height = ( Math.abs( topleft.y - bottomright.y ) - 2 ) + 'px';

        }( this.displayRegion.style ));   

    }

});


}( OpenSeadragon ));