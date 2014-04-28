/*
 * OpenSeadragon - Navigator
 *
 * Copyright (C) 2009 CodePlex Foundation
 * Copyright (C) 2010-2013 OpenSeadragon contributors
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 * - Redistributions of source code must retain the above copyright notice,
 *   this list of conditions and the following disclaimer.
 *
 * - Redistributions in binary form must reproduce the above copyright
 *   notice, this list of conditions and the following disclaimer in the
 *   documentation and/or other materials provided with the distribution.
 *
 * - Neither the name of CodePlex Foundation nor the names of its
 *   contributors may be used to endorse or promote products derived from
 *   this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

(function( $ ){

/**
 * @class Navigator
 * @classdesc The Navigator provides a small view of the current image as fixed
 * while representing the viewport as a moving box serving as a frame
 * of reference in the larger viewport as to which portion of the image
 * is currently being examined.  The navigator's viewport can be interacted
 * with using the keyboard or the mouse.
 *
 * @memberof OpenSeadragon
 * @extends OpenSeadragon.Viewer
 * @extends OpenSeadragon.EventSource
 * @param {Object} options
 */
$.Navigator = function( options ){

    var viewer      = options.viewer,
        viewerSize,
        navigatorSize,
        unneededElement;

    //We may need to create a new element and id if they did not
    //provide the id for the existing element
    if( !options.id ){
        options.id              = 'navigator-' + $.now();
        this.element            = $.makeNeutralElement( "div" );
        options.controlOptions  = {
            anchor:           $.ControlAnchor.TOP_RIGHT,
            attachToViewer:   true,
            autoFade:         true
        };

        if( options.position ){
            if( 'BOTTOM_RIGHT' == options.position ){
               options.controlOptions.anchor = $.ControlAnchor.BOTTOM_RIGHT;
            } else if( 'BOTTOM_LEFT' == options.position ){
               options.controlOptions.anchor = $.ControlAnchor.BOTTOM_LEFT;
            } else if( 'TOP_RIGHT' == options.position ){
               options.controlOptions.anchor = $.ControlAnchor.TOP_RIGHT;
            } else if( 'TOP_LEFT' == options.position ){
               options.controlOptions.anchor = $.ControlAnchor.TOP_LEFT;
            } else if( 'ABSOLUTE' == options.position ){
               options.controlOptions.anchor = $.ControlAnchor.ABSOLUTE;
               options.controlOptions.top = options.top;
               options.controlOptions.left = options.left;
               options.controlOptions.height = options.height;
               options.controlOptions.width = options.width;
            }
        }
        
    } else {
        this.element            = document.getElementById( options.id );
        options.controlOptions  = {
            anchor:           $.ControlAnchor.NONE,
            attachToViewer:   false,
            autoFade:         false
        };
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
        animationTime:          0,
        autoResize:             options.autoResize
    });

    options.minPixelRatio = this.minPixelRatio = viewer.minPixelRatio;

    this.borderWidth = 2;
    //At some browser magnification levels the display regions lines up correctly, but at some there appears to
    //be a one pixel gap.
    this.fudge = new $.Point(1, 1);
    this.totalBorderWidths = new $.Point(this.borderWidth*2, this.borderWidth*2).minus(this.fudge);


    if ( options.controlOptions.anchor != $.ControlAnchor.NONE ) {
        (function( style, borderWidth ){
            style.margin        = '0px';
            style.border        = borderWidth + 'px solid #555';
            style.padding       = '0px';
            style.background    = '#000';
            style.opacity       = 0.8;
            style.overflow      = 'hidden';
        }( this.element.style, this.borderWidth));
    }

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
        element:         this.element,
        dragHandler:     $.delegate( this, onCanvasDrag ),
        clickHandler:    $.delegate( this, onCanvasClick ),
        releaseHandler:  $.delegate( this, onCanvasRelease ),
        scrollHandler:   $.delegate( this, onCanvasScroll )
    }).setTracking( true );

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

    if ( options.controlOptions.anchor != $.ControlAnchor.ABSOLUTE && options.controlOptions.anchor != $.ControlAnchor.NONE ) {
        if ( options.width && options.height ) {
            this.element.style.height = typeof ( options.height )  == "number" ? ( options.height + 'px' ) : options.height;
            this.element.style.width  = typeof ( options.width )  == "number" ? ( options.width + 'px' ) : options.width;
        } else {
            viewerSize = $.getElementSize( viewer.element );
            this.element.style.height = Math.round( viewerSize.y * options.sizeRatio ) + 'px';
            this.element.style.width  = Math.round( viewerSize.x * options.sizeRatio ) + 'px';
            this.oldViewerSize = viewerSize;
        }
        navigatorSize = $.getElementSize( this.element );
        this.elementArea = navigatorSize.x * navigatorSize.y;
    }

    this.oldContainerSize = new $.Point( 0, 0 );

    $.Viewer.apply( this, [ options ] );

    this.element.getElementsByTagName( 'div' )[0].appendChild( this.displayRegion );
    unneededElement = this.element.getElementsByTagName('textarea')[0];
    if (unneededElement) {
        unneededElement.parentNode.removeChild(unneededElement);
    }

};

$.extend( $.Navigator.prototype, $.EventSource.prototype, $.Viewer.prototype, /** @lends OpenSeadragon.Navigator.prototype */{

    /**
     * Used to notify the navigator when its size has changed. 
     * Especially useful when {@link OpenSeadragon.Options}.navigatorAutoResize is set to false and the navigator is resizable.
     * @function
     */
    updateSize: function () {
        if ( this.viewport ) {
            var containerSize = new $.Point(
                    (this.container.clientWidth === 0 ? 1 : this.container.clientWidth),
                    (this.container.clientHeight === 0 ? 1 : this.container.clientHeight)
                );
            if ( !containerSize.equals( this.oldContainerSize ) ) {
                var oldBounds = this.viewport.getBounds();
                var oldCenter = this.viewport.getCenter();
                this.viewport.resize( containerSize, true );
                var imageHeight = 1 / this.source.aspectRatio;
                var newWidth = oldBounds.width <= 1 ? oldBounds.width : 1;
                var newHeight = oldBounds.height <= imageHeight ?
                    oldBounds.height : imageHeight;
                var newBounds = new $.Rect(
                    oldCenter.x - ( newWidth / 2.0 ),
                    oldCenter.y - ( newHeight / 2.0 ),
                    newWidth,
                    newHeight
                    );
                this.viewport.fitBounds( newBounds, true );
                this.oldContainerSize = containerSize;
                this.drawer.update();
            }
        }
    },

    /**
     * Used to update the navigator minimap's viewport rectangle when a change in the viewer's viewport occurs.
     * @function
     * @param {OpenSeadragon.Viewport} The viewport this navigator is tracking.
     */
    update: function( viewport ) {

        var viewerSize,
            newWidth,
            newHeight,
            bounds,
            topleft,
            bottomright;

        viewerSize = $.getElementSize( this.viewer.element );
        if ( !viewerSize.equals( this.oldViewerSize ) ) {
            this.oldViewerSize = viewerSize;
            if ( this.maintainSizeRatio ) {
                newWidth  = viewerSize.x * this.sizeRatio;
                newHeight = viewerSize.y * this.sizeRatio;
            }
            else {
                newWidth = Math.sqrt(this.elementArea * (viewerSize.x / viewerSize.y));
                newHeight = this.elementArea / newWidth;
            }
            this.element.style.width  = Math.round( newWidth ) + 'px';
            this.element.style.height = Math.round( newHeight ) + 'px';
            this.updateSize();
        }

        if( viewport && this.viewport ) {
            bounds      = viewport.getBounds( true );
            topleft     = this.viewport.pixelFromPoint( bounds.getTopLeft(), false );
            bottomright = this.viewport.pixelFromPoint( bounds.getBottomRight(), false ).minus( this.totalBorderWidths );

            //update style for navigator-box
            (function(style) {

                style.top    = Math.round( topleft.y ) + 'px';
                style.left   = Math.round( topleft.x ) + 'px';

                var width = Math.abs( topleft.x - bottomright.x );
                var height = Math.abs( topleft.y - bottomright.y );
                // make sure width and height are non-negative so IE doesn't throw
                style.width  = Math.round( Math.max( width, 0 ) ) + 'px';
                style.height = Math.round( Math.max( height, 0 ) ) + 'px';

            }( this.displayRegion.style ));
        }

    },

    open: function( source ) {
        this.updateSize();
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
function onCanvasClick( event ) {
    var newBounds,
        viewerPosition,
        dimensions;
    if (! this.drag) {
        if ( this.viewer.viewport ) {
            this.viewer.viewport.panTo( this.viewport.pointFromPixel( event.position ) );
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
function onCanvasDrag( event ) {
    if ( this.viewer.viewport ) {
        this.drag = true;
        if( !this.panHorizontal ){
            event.delta.x = 0;
        }
        if( !this.panVertical ){
            event.delta.y = 0;
        }
        this.viewer.viewport.panBy(
            this.viewport.deltaPointsFromPixels(
                event.delta
            )
        );
    }
}


/**
 * @private
 * @inner
 * @function
 */
function onCanvasRelease( event ) {
    if ( event.insideElementPressed && this.viewer.viewport ) {
        this.viewer.viewport.applyConstraints();
    }
}


/**
 * @private
 * @inner
 * @function
 */
function onCanvasScroll( event ) {
    /**
     * Raised when a scroll event occurs on the {@link OpenSeadragon.Viewer#navigator} element (mouse wheel, touch pinch, etc.).
     *
     * @event navigator-scroll
     * @memberof OpenSeadragon.Viewer
     * @type {object}
     * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised this event.
     * @property {OpenSeadragon.MouseTracker} tracker - A reference to the MouseTracker which originated this event.
     * @property {OpenSeadragon.Point} position - The position of the event relative to the tracked element.
     * @property {Number} scroll - The scroll delta for the event.
     * @property {Boolean} shift - True if the shift key was pressed during this event.
     * @property {Object} originalEvent - The original DOM event.
     * @property {?Object} userData - Arbitrary subscriber-defined object.
     */
    this.viewer.raiseEvent( 'navigator-scroll', {
        tracker: event.eventSource,
        position: event.position,
        scroll: event.scroll,
        shift: event.shift,
        originalEvent: event.originalEvent
    });

    //dont scroll the page up and down if the user is scrolling
    //in the navigator
    return false;
}


}( OpenSeadragon ));
