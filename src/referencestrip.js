/*
 * OpenSeadragon - ReferenceStrip
 *
 * Copyright (C) 2009 CodePlex Foundation
 * Copyright (C) 2010-2025 OpenSeadragon contributors
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

(function ( $ ) {

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
 *  supported by OpenSeadragon, in heterogeneous or homogeneous
 *  sequences just like mixed groups already supported by the viewer
 *  for the purpose of image sequnces.
 *
 *  TODO:   The difficult part of this feature is figuring out how to express
 *          this functionality as a combination of the functionality already
 *          provided by Drawer, Viewport, TileSource, and Navigator.  It may
 *          require better abstraction at those points in order to efficiently
 *          reuse those paradigms.
 */
/**
 * @class ReferenceStrip
 * @memberof OpenSeadragon
 * @param {Object} options
 */
$.ReferenceStrip = function ( options ) {

    var _this       = this,
        viewer      = options.viewer,
        viewerSize  = $.getElementSize( viewer.element ),
        element,
        style,
        i;

    //We may need to create a new element and id if they did not
    //provide the id for the existing element
    if ( !options.id ) {
        options.id              = 'referencestrip-' + $.now();
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
        element:                this.element
    } );

    $.extend( this, options );
    //Private state properties
    THIS[this.id] = {
        animating:           false
    };

    this.minPixelRatio = this.viewer.minPixelRatio;

    this.element.tabIndex = 0;

    style = this.element.style;
    style.marginTop     = '0px';
    style.marginRight   = '0px';
    style.marginBottom  = '0px';
    style.marginLeft    = '0px';
    style.left          = '0px';
    style.bottom        = '0px';
    style.border        = '0px';
    style.background    = '#000';
    style.position      = 'relative';

    $.setElementTouchActionNone( this.element );

    $.setElementOpacity( this.element, 0.8 );

    this.viewer = viewer;
    this.tracker = new $.MouseTracker( {
        userData:       'ReferenceStrip.tracker',
        element:        this.element,
        clickHandler:   $.delegate( this, onStripClick ),
        dragHandler:    $.delegate( this, onStripDrag ),
        scrollHandler:  $.delegate( this, onStripScroll ),
        enterHandler:   $.delegate( this, onStripEnter ),
        leaveHandler:   $.delegate( this, onStripLeave ),
        keyDownHandler: $.delegate( this, onKeyDown ),
        keyHandler:     $.delegate( this, onKeyPress ),
        preProcessEventHandler: function (eventInfo) {
            if (eventInfo.eventType === 'wheel') {
                eventInfo.preventDefault = true;
            }
        }
    } );

    //Controls the position and orientation of the reference strip and sets the
    //appropriate width and height
    if ( options.width && options.height ) {
        this.element.style.width  = options.width + 'px';
        this.element.style.height = options.height + 'px';
        viewer.addControl(
            this.element,
            { anchor: $.ControlAnchor.BOTTOM_LEFT }
        );
    } else {
        if ( "horizontal" === options.scroll ) {
            this.element.style.width = (
                viewerSize.x *
                options.sizeRatio *
                viewer.tileSources.length
            ) + ( 12 * viewer.tileSources.length ) + 'px';

            this.element.style.height = (
                viewerSize.y *
                options.sizeRatio
            ) + 'px';

            viewer.addControl(
                this.element,
                { anchor: $.ControlAnchor.BOTTOM_LEFT }
            );
        } else {
            this.element.style.height = (
                viewerSize.y *
                options.sizeRatio *
                viewer.tileSources.length
            ) + ( 12 * viewer.tileSources.length ) + 'px';

            this.element.style.width = (
                viewerSize.x *
                options.sizeRatio
            ) + 'px';

            viewer.addControl(
                this.element,
                { anchor: $.ControlAnchor.TOP_LEFT }
            );

        }
    }

    this.panelWidth = ( viewerSize.x * this.sizeRatio ) + 8;
    this.panelHeight = ( viewerSize.y * this.sizeRatio ) + 8;
    this.panels = [];
    this.miniViewers = {};

    /*jshint loopfunc:true*/
    for ( i = 0; i < viewer.tileSources.length; i++ ) {

        element = $.makeNeutralElement( 'div' );
        element.id = this.element.id + "-" + i;

        element.style.width         = _this.panelWidth + 'px';
        element.style.height        = _this.panelHeight + 'px';
        element.style.display       = 'inline';
        element.style['float']      = 'left'; //Webkit
        element.style.cssFloat      = 'left'; //Firefox
        element.style.padding       = '2px';
        $.setElementTouchActionNone( element );
        $.setElementPointerEventsNone( element );

        this.element.appendChild( element );

        element.activePanel = false;

        this.panels.push( element );

    }
    loadPanels( this, this.scroll === 'vertical' ? viewerSize.y : viewerSize.x, 0 );
    this.setFocus( 0 );

};

/** @lends OpenSeadragon.ReferenceStrip.prototype */
$.ReferenceStrip.prototype = {

    /**
     * @function
     */
    setFocus: function ( page ) {
        var element      = this.element.querySelector('#' + this.element.id + '-' + page ),
            viewerSize   = $.getElementSize( this.viewer.canvas ),
            scrollWidth  = Number( this.element.style.width.replace( 'px', '' ) ),
            scrollHeight = Number( this.element.style.height.replace( 'px', '' ) ),
            offsetLeft   = -Number( this.element.style.marginLeft.replace( 'px', '' ) ),
            offsetTop    = -Number( this.element.style.marginTop.replace( 'px', '' ) ),
            offset;

        if ( this.currentSelected !== element ) {
            if ( this.currentSelected ) {
                this.currentSelected.style.background = '#000';
            }
            this.currentSelected = element;
            this.currentSelected.style.background = '#999';

            if ( 'horizontal' === this.scroll ) {
                //right left
                offset = ( Number( page ) ) * ( this.panelWidth + 3 );
                if ( offset > offsetLeft + viewerSize.x - this.panelWidth ) {
                    offset = Math.min( offset, ( scrollWidth - viewerSize.x ) );
                    this.element.style.marginLeft = -offset + 'px';
                    loadPanels( this, viewerSize.x, -offset );
                } else if ( offset < offsetLeft ) {
                    offset = Math.max( 0, offset - viewerSize.x / 2 );
                    this.element.style.marginLeft = -offset + 'px';
                    loadPanels( this, viewerSize.x, -offset );
                }
            } else {
                offset = ( Number( page ) ) * ( this.panelHeight + 3 );
                if ( offset > offsetTop + viewerSize.y - this.panelHeight ) {
                    offset = Math.min( offset, ( scrollHeight - viewerSize.y ) );
                    this.element.style.marginTop = -offset + 'px';
                    loadPanels( this, viewerSize.y, -offset );
                } else if ( offset < offsetTop ) {
                    offset = Math.max( 0, offset - viewerSize.y / 2 );
                    this.element.style.marginTop = -offset + 'px';
                    loadPanels( this, viewerSize.y, -offset );
                }
            }

            this.currentPage = page;
            onStripEnter.call( this, { eventSource: this.tracker } );
        }
    },

    /**
     * @function
     */
    update: function () {
        if ( THIS[this.id].animating ) {
            // $.console.log( 'image reference strip update' );
            return true;
        }
        return false;
    },

    destroy: function() {
        if (this.miniViewers) {
          for (var key in this.miniViewers) {
            this.miniViewers[key].destroy();
          }
        }

        this.tracker.destroy();

        if (this.element) {
            this.viewer.removeControl( this.element );
        }
    }

};


/**
 * @private
 * @inner
 * @function
 */
function onStripClick( event ) {
    if ( event.quick ) {
        var page;

        if ( 'horizontal' === this.scroll ) {
            // +4px fix to solve problem with precision on thumbnail selection if there is a lot of them
            page = Math.floor(event.position.x / (this.panelWidth + 4));
        } else {
            page = Math.floor(event.position.y / this.panelHeight);
        }

        this.viewer.goToPage( page );
    }

    this.element.focus();
}


/**
 * @private
 * @inner
 * @function
 */
function onStripDrag( event ) {

    this.dragging = true;
    if ( this.element ) {
        var offsetLeft   = Number( this.element.style.marginLeft.replace( 'px', '' ) ),
        offsetTop    = Number( this.element.style.marginTop.replace( 'px', '' ) ),
        scrollWidth  = Number( this.element.style.width.replace( 'px', '' ) ),
        scrollHeight = Number( this.element.style.height.replace( 'px', '' ) ),
        viewerSize   = $.getElementSize( this.viewer.canvas );

        if ( 'horizontal' === this.scroll ) {
            if ( -event.delta.x > 0 ) {
                //forward
                if ( offsetLeft > -( scrollWidth - viewerSize.x ) ) {
                    this.element.style.marginLeft = ( offsetLeft + ( event.delta.x * 2 ) ) + 'px';
                    loadPanels( this, viewerSize.x, offsetLeft + ( event.delta.x * 2 ) );
                }
            } else if ( -event.delta.x < 0 ) {
                //reverse
                if ( offsetLeft < 0 ) {
                    this.element.style.marginLeft = ( offsetLeft + ( event.delta.x * 2 ) ) + 'px';
                    loadPanels( this, viewerSize.x, offsetLeft + ( event.delta.x * 2 ) );
                }
            }
        } else {
            if ( -event.delta.y > 0 ) {
                //forward
                if ( offsetTop > -( scrollHeight - viewerSize.y ) ) {
                    this.element.style.marginTop = ( offsetTop + ( event.delta.y * 2 ) ) + 'px';
                    loadPanels( this, viewerSize.y, offsetTop + ( event.delta.y * 2 ) );
                }
            } else if ( -event.delta.y < 0 ) {
                //reverse
                if ( offsetTop < 0 ) {
                    this.element.style.marginTop = ( offsetTop + ( event.delta.y * 2 ) ) + 'px';
                    loadPanels( this, viewerSize.y, offsetTop + ( event.delta.y * 2 ) );
                }
            }
        }
    }

}



/**
 * @private
 * @inner
 * @function
 */
function onStripScroll( event ) {
    if ( this.element ) {
        var offsetLeft   = Number( this.element.style.marginLeft.replace( 'px', '' ) ),
        offsetTop    = Number( this.element.style.marginTop.replace( 'px', '' ) ),
        scrollWidth  = Number( this.element.style.width.replace( 'px', '' ) ),
        scrollHeight = Number( this.element.style.height.replace( 'px', '' ) ),
        viewerSize   = $.getElementSize( this.viewer.canvas );

        if ( 'horizontal' === this.scroll ) {
            if ( event.scroll > 0 ) {
                //forward
                if ( offsetLeft > -( scrollWidth - viewerSize.x ) ) {
                    this.element.style.marginLeft = ( offsetLeft - ( event.scroll * 60 ) ) + 'px';
                    loadPanels( this, viewerSize.x, offsetLeft - ( event.scroll * 60 ) );
                }
            } else if ( event.scroll < 0 ) {
                //reverse
                if ( offsetLeft < 0 ) {
                    this.element.style.marginLeft = ( offsetLeft - ( event.scroll * 60 ) ) + 'px';
                    loadPanels( this, viewerSize.x, offsetLeft - ( event.scroll * 60 ) );
                }
            }
        } else {
            if ( event.scroll < 0 ) {
                //scroll up
                if ( offsetTop > viewerSize.y - scrollHeight ) {
                    this.element.style.marginTop = ( offsetTop + ( event.scroll * 60 ) ) + 'px';
                    loadPanels( this, viewerSize.y, offsetTop + ( event.scroll * 60 ) );
                }
            } else if ( event.scroll > 0 ) {
                //scroll dowm
                if ( offsetTop < 0 ) {
                    this.element.style.marginTop = ( offsetTop + ( event.scroll * 60 ) ) + 'px';
                    loadPanels( this, viewerSize.y, offsetTop + ( event.scroll * 60 ) );
                }
            }
        }

        event.preventDefault = true;
    }
}


function loadPanels( strip, viewerSize, scroll ) {
    var panelSize,
        activePanelsStart,
        activePanelsEnd,
        miniViewer,
        i,
        element;
    if ( 'horizontal' === strip.scroll ) {
        panelSize = strip.panelWidth;
    } else {
        panelSize = strip.panelHeight;
    }
    activePanelsStart = Math.ceil( viewerSize / panelSize ) + 5;
    activePanelsEnd = Math.ceil( ( Math.abs( scroll ) + viewerSize ) / panelSize ) + 1;
    activePanelsStart = activePanelsEnd - activePanelsStart;
    activePanelsStart = activePanelsStart < 0 ? 0 : activePanelsStart;

    for ( i = activePanelsStart; i < activePanelsEnd && i < strip.panels.length; i++ ) {
        element = strip.panels[i];
        if ( !element.activePanel ) {
            var miniTileSource;
            var originalTileSource = strip.viewer.tileSources[i];
            if (originalTileSource.referenceStripThumbnailUrl) {
                miniTileSource = {
                    type: 'image',
                    url: originalTileSource.referenceStripThumbnailUrl
                };
            } else {
                miniTileSource = originalTileSource;
            }
            miniViewer = new $.Viewer( {
                id:                     element.id,
                tileSources:            [miniTileSource],
                element:                element,
                navigatorSizeRatio:     strip.sizeRatio,
                showNavigator:          false,
                mouseNavEnabled:        false,
                showNavigationControl:  false,
                showSequenceControl:    false,
                immediateRender:        true,
                blendTime:              0,
                animationTime:          0,
                loadTilesWithAjax:      strip.viewer.loadTilesWithAjax,
                ajaxHeaders:            strip.viewer.ajaxHeaders,
                drawer:                 'canvas', //always use canvas for the reference strip
            } );
            // Allow pointer events to pass through miniViewer's canvas/container
            //   elements so implicit pointer capture works on touch devices
            $.setElementPointerEventsNone( miniViewer.canvas );
            $.setElementPointerEventsNone( miniViewer.container );
            // We'll use event delegation from the reference strip element instead of
            //   handling events on every miniViewer
            miniViewer.innerTracker.setTracking( false );
            miniViewer.outerTracker.setTracking( false );

            strip.miniViewers[element.id] = miniViewer;

            element.activePanel = true;
        }
    }
}


/**
 * @private
 * @inner
 * @function
 */
function onStripEnter( event ) {
    var element = event.eventSource.element;

    //$.setElementOpacity(element, 0.8);

    //element.style.border = '1px solid #555';
    //element.style.background = '#000';

    if ( 'horizontal' === this.scroll ) {

        //element.style.paddingTop = "0px";
        element.style.marginBottom = "0px";

    } else {

        //element.style.paddingRight = "0px";
        element.style.marginLeft = "0px";

    }
}


/**
 * @private
 * @inner
 * @function
 */
function onStripLeave( event ) {
    var element = event.eventSource.element;

    if ( 'horizontal' === this.scroll ) {

        //element.style.paddingTop = "10px";
        element.style.marginBottom = "-" + ( $.getElementSize( element ).y / 2 ) + "px";

    } else {

        //element.style.paddingRight = "10px";
        element.style.marginLeft = "-" + ( $.getElementSize( element ).x / 2 ) + "px";

    }
}


/**
 * @private
 * @inner
 * @function
 */
function onKeyDown( event ) {
    //console.log( event.keyCode );

    if ( !event.ctrl && !event.alt && !event.meta ) {
        switch ( event.keyCode ) {
            case 38: //up arrow
                onStripScroll.call( this, { eventSource: this.tracker, position: null, scroll: 1, shift: null } );
                event.preventDefault = true;
                break;
            case 40: //down arrow
                onStripScroll.call( this, { eventSource: this.tracker, position: null, scroll: -1, shift: null } );
                event.preventDefault = true;
                break;
            case 37: //left arrow
                onStripScroll.call( this, { eventSource: this.tracker, position: null, scroll: -1, shift: null } );
                event.preventDefault = true;
                break;
            case 39: //right arrow
                onStripScroll.call( this, { eventSource: this.tracker, position: null, scroll: 1, shift: null } );
                event.preventDefault = true;
                break;
            default:
                //console.log( 'navigator keycode %s', event.keyCode );
                event.preventDefault = false;
                break;
        }
    } else {
        event.preventDefault = false;
    }
}


/**
 * @private
 * @inner
 * @function
 */
function onKeyPress( event ) {
    //console.log( event.keyCode );

    if ( !event.ctrl && !event.alt && !event.meta ) {
        switch ( event.keyCode ) {
            case 61: //=|+
                onStripScroll.call( this, { eventSource: this.tracker, position: null, scroll: 1, shift: null } );
                event.preventDefault = true;
                break;
            case 45: //-|_
                onStripScroll.call( this, { eventSource: this.tracker, position: null, scroll: -1, shift: null } );
                event.preventDefault = true;
                break;
            case 48: //0|)
            case 119: //w
            case 87: //W
                onStripScroll.call( this, { eventSource: this.tracker, position: null, scroll: 1, shift: null } );
                event.preventDefault = true;
                break;
            case 115: //s
            case 83: //S
                onStripScroll.call( this, { eventSource: this.tracker, position: null, scroll: -1, shift: null } );
                event.preventDefault = true;
                break;
            case 97: //a
                onStripScroll.call( this, { eventSource: this.tracker, position: null, scroll: -1, shift: null } );
                event.preventDefault = true;
                break;
            case 100: //d
                onStripScroll.call( this, { eventSource: this.tracker, position: null, scroll: 1, shift: null } );
                event.preventDefault = true;
                break;
            default:
                //console.log( 'navigator keycode %s', event.keyCode );
                event.preventDefault = false;
                break;
        }
    } else {
        event.preventDefault = false;
    }
}

}(OpenSeadragon));
