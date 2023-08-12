/*
 * OpenSeadragon - ReferenceStrip
 *
 * Copyright (C) 2009 CodePlex Foundation
 * Copyright (C) 2010-2023 OpenSeadragon contributors
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
const THIS = {};

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
 *          require better abstraction at those points in order to efficiently
 *          reuse those paradigms.
 */
/**
 * @class ReferenceStrip
 * @memberof OpenSeadragon
 * @param {Object} options
 */
$.ReferenceStrip = function ( options ) {
    // //REFERENCE STRIP SETTINGS ($.DEFAULT_SETTINGS)
    // showReferenceStrip:           false,
    // referenceStripElement:        null,
    // referenceStripId:             null,
    // referenceStripScroll:         'horizontal',
    // referenceStripPosition:       'BOTTOM_LEFT',
    // referenceStripSizeRatio:      0.2,
    // referenceStripMaintainSizeRatio: false,
    // referenceStripTop:            null,
    // referenceStripLeft:           null,
    // referenceStripHeight:         null,
    // referenceStripWidth:          null,
    // referenceStripAutoResize:     true,
    // referenceStripAutoHide:       true,
    // referenceStripAutoHideFactor: 0.5,
    // referenceStripAutoFade:       true,
    // referenceStripBackground:     '#000',
    // referenceStripOpacity:        0.8,
    // referenceStripBorderColor:    '#555',

    // this.referenceStrip = new $.ReferenceStrip({
    //     viewer:            this,
    //     element:           this.referenceStripElement,
    //     id:                this.referenceStripId,
    //     scroll:            this.referenceStripScroll,
    //     position:          this.referenceStripPosition,
    //     sizeRatio:         this.referenceStripSizeRatio,
    //     maintainSizeRatio: this.referenceStripMaintainSizeRatio,
    //     top:               this.referenceStripTop,
    //     left:              this.referenceStripLeft,
    //     width:             this.referenceStripWidth,
    //     height:            this.referenceStripHeight,
    //     autoResize:        this.referenceStripAutoResize,
    //     autoHide:          this.referenceStripAutoHide,
    //     autoHideFactor:    this.referenceStripAutoHideFactor,
    //     autoFade:          this.referenceStripAutoFade,
    //     background:        this.referenceStripBackground,
    //     opacity:           this.referenceStripOpacity,
    //     borderColor:       this.referenceStripBorderColor,
    //     //TODO
    //     //crossOriginPolicy: this.crossOriginPolicy,

    //     viewer:      this,
    //     id:          this.referenceStripId,
    //     scroll:      this.referenceStripScroll,
    //     position:    this.referenceStripPosition,
    //     sizeRatio:   this.referenceStripSizeRatio,
    //     height:      this.referenceStripHeight,
    //     width:       this.referenceStripWidth
    // });

    const viewer      = options.viewer,
          viewerSize  = $.getElementSize( viewer.element );

    //We may need to create a new element and id if they did not
    //provide the id for the existing element
    if ( !options.id ) {
        options.id                   = 'referencestrip-' + $.now();
        this.stripElement            = $.makeNeutralElement( "div" );
        this.stripElement.id         = options.id;
        this.stripElement.className  = 'referencestrip';
    }

    options = $.extend(
        true,
        {
            // // Viewer passes these commented options always...
            // // We only need these if ReferenceStrip constructor is made usable outside of Viewer
            // element:             $.DEFAULT_SETTINGS.referenceStripElement,
            // id:                  $.DEFAULT_SETTINGS.referenceStripId,
            // scroll:              $.DEFAULT_SETTINGS.referenceStripScroll,
            // position:            $.DEFAULT_SETTINGS.referenceStripPosition,
            // sizeRatio:           $.DEFAULT_SETTINGS.referenceStripSizeRatio,
            // maintainSizeRatio:   $.DEFAULT_SETTINGS.referenceStripMaintainSizeRatio,
            // top:                 $.DEFAULT_SETTINGS.referenceStripTop,
            // left:                $.DEFAULT_SETTINGS.referenceStripLeft,
            // width:               $.DEFAULT_SETTINGS.referenceStripWidth,
            // height:              $.DEFAULT_SETTINGS.referenceStripHeight,
            // autoResize:          $.DEFAULT_SETTINGS.referenceStripAutoResize,
            // autoHide:            $.DEFAULT_SETTINGS.referenceStripAutoHide,
            // autoHideFactor:      $.DEFAULT_SETTINGS.referenceStripAutoHideFactor,
            // autoFade:            $.DEFAULT_SETTINGS.referenceStripAutoFade,
            // background:          $.DEFAULT_SETTINGS.referenceStripBackground,
            // opacity:             $.DEFAULT_SETTINGS.referenceStripOpacity,
            // borderColor:         $.DEFAULT_SETTINGS.referenceStripBorderColor,
            clickTimeThreshold:  $.DEFAULT_SETTINGS.clickTimeThreshold,
            clickDistThreshold:  $.DEFAULT_SETTINGS.clickDistThreshold,
        },
        options
    );

    $.extend( this, options );

    //Private state properties
    THIS[this.id] = {
        animating:      false
    };

    this.stripElement.tabIndex = 0;

    const style = this.stripElement.style;
    style.marginTop     = '0px';
    style.marginRight   = '0px';
    style.marginBottom  = '0px';
    style.marginLeft    = '0px';
    style.left          = '0px';
    style.bottom        = '0px';
    style.border        = '0px';
    style.background    = '#000';
    style.position      = 'relative';

    $.setElementTouchActionNone( this.stripElement );

    $.setElementOpacity( this.stripElement, 0.8 );

    this.stripTracker = new $.MouseTracker( {
        userData:           'ReferenceStrip.stripTracker',
        element:            this.stripElement,
        clickTimeThreshold: this.clickTimeThreshold,
        clickDistThreshold: this.clickDistThreshold,
        clickHandler:       $.delegate( this, onStripClick ),
        dragHandler:        $.delegate( this, onStripDrag ),
        scrollHandler:      $.delegate( this, onStripScroll ),
        enterHandler:       $.delegate( this, onStripEnter ),
        leaveHandler:       $.delegate( this, onStripLeave ),
        keyDownHandler:     $.delegate( this, onStripKeyDown ),
        keyHandler:         $.delegate( this, onStripKeyPress ),
        preProcessEventHandler: function (eventInfo) {
            if (eventInfo.eventType === 'wheel') {
                eventInfo.preventDefault = true;
            }
        }
    } );

    //Controls the position and orientation of the reference strip and sets the
    //appropriate width and height
    if ( options.width && options.height ) {
        //TODO fix this - isn't correct
        this.panelWidth = ( viewerSize.x * this.sizeRatio ) + 12;
        this.panelHeight = ( viewerSize.y * this.sizeRatio );

        this.stripElement.style.width  = options.width + 'px';
        this.stripElement.style.height = options.height + 'px';
        viewer.addControl(
            this.stripElement,
            { anchor: $.ControlAnchor.BOTTOM_LEFT }
        );
    } else {
        if ( "horizontal" === options.scroll ) {
            this.panelWidth = ( viewerSize.x * this.sizeRatio ) + 12;
            this.panelHeight = ( viewerSize.y * this.sizeRatio );

            this.stripElement.style.width = (
                this.panelWidth *
                viewer.tileSources.length
            ) + 'px';

            this.stripElement.style.height = this.panelHeight + 'px';

            viewer.addControl(
                this.stripElement,
                { anchor: $.ControlAnchor.BOTTOM_LEFT }
            );
        } else {
            this.panelWidth = ( viewerSize.x * this.sizeRatio );
            this.panelHeight = ( viewerSize.y * this.sizeRatio ) + 12;

            this.stripElement.style.height = (
                this.panelHeight *
                viewer.tileSources.length
            ) + 'px';

            this.stripElement.style.width = this.panelWidth + 'px';

            viewer.addControl(
                this.stripElement,
                { anchor: $.ControlAnchor.TOP_LEFT }
            );

        }
    }

    this.panels = [];
    this.miniViewers = {};

    /*jshint loopfunc:true*/
    for ( let i = 0; i < viewer.tileSources.length; i++ ) {

        const panelElement = $.makeNeutralElement( 'div' );

        panelElement.id = this.stripElement.id + "-" + i;

        panelElement.style.width         = this.panelWidth + 'px';
        panelElement.style.height        = this.panelHeight + 'px';
        panelElement.style.display       = 'inline';
        panelElement.style['float']      = 'left'; //Webkit
        panelElement.style.cssFloat      = 'left'; //Firefox
        panelElement.style.styleFloat    = 'left'; //IE
        panelElement.style.padding       = '2px';
        $.setElementTouchActionNone( panelElement );
        $.setElementPointerEventsNone( panelElement );

        this.stripElement.appendChild( panelElement );

        panelElement.activePanel = false;

        this.panels.push( panelElement );

    }
    loadPanels( this, this.scroll === 'vertical' ? viewerSize.y : viewerSize.x, 0 );
    this.setFocus( 0 );

};

/** @lends OpenSeadragon.ReferenceStrip.prototype */
$.ReferenceStrip.prototype = {

    //TODO reference strip auto resize

    // /**
    //  * Used to notify the reference strip when its size has changed.
    //  * Especially useful when {@link OpenSeadragon.Options}.referenceStripAutoResize is set to false and the reference strip is resizable.
    //  * @function
    //  */
    // updateSize: function () {
    //     if ( this.viewport ) {
    //         var containerSize = new $.Point(
    //                 (this.container.clientWidth === 0 ? 1 : this.container.clientWidth),
    //                 (this.container.clientHeight === 0 ? 1 : this.container.clientHeight)
    //             );

    //         if ( !containerSize.equals( this.oldContainerSize ) ) {
    //             this.viewport.resize( containerSize, true );
    //             this.viewport.goHome(true);
    //             this.oldContainerSize = containerSize;
    //             this.drawer.clear();
    //             this.world.draw();
    //         }
    //     }
    // },

    // /**
    //  * Explicitly sets the width of the reference strip, in web coordinates. Disables automatic resizing.
    //  * @param {Number|String} width - the new width, either a number of pixels or a CSS string, such as "100%"
    //  */
    // setWidth: function(width) {
    //     this.width = width;
    //     this.element.style.width = typeof (width) === "number" ? (width + 'px') : width;
    //     this._resizeWithViewer = false;
    //     this.updateSize();
    // },

    // /**
    //  * Explicitly sets the height of the reference strip, in web coordinates. Disables automatic resizing.
    //  * @param {Number|String} height - the new height, either a number of pixels or a CSS string, such as "100%"
    //  */
    // setHeight: function(height) {
    //     this.height = height;
    //     this.element.style.height = typeof (height) === "number" ? (height + 'px') : height;
    //     this._resizeWithViewer = false;
    //     this.updateSize();
    // },

    /**
     * @function
     */
    setFocus: function ( page ) {
        const panelElement = this.stripElement.querySelector('#' + this.stripElement.id + '-' + page ),
              viewerSize   = $.getElementSize( this.viewer.canvas ),
              scrollWidth  = Number( this.stripElement.style.width.replace( 'px', '' ) ),
              scrollHeight = Number( this.stripElement.style.height.replace( 'px', '' ) ),
              offsetLeft   = -Number( this.stripElement.style.marginLeft.replace( 'px', '' ) ),
              offsetTop    = -Number( this.stripElement.style.marginTop.replace( 'px', '' ) );

        if ( this.currentSelected !== panelElement ) {
            if ( this.currentSelected ) {
                this.currentSelected.style.background = '#000';
            }
            this.currentSelected = panelElement;
            this.currentSelected.style.background = '#999';

            if ( 'horizontal' === this.scroll ) {
                //right left
                let offset = ( Number( page ) ) * ( this.panelWidth + 3 );
                if ( offset > offsetLeft + viewerSize.x - this.panelWidth ) {
                    offset = Math.min( offset, ( scrollWidth - viewerSize.x ) );
                    this.stripElement.style.marginLeft = -offset + 'px';
                    loadPanels( this, viewerSize.x, -offset );
                } else if ( offset < offsetLeft ) {
                    offset = Math.max( 0, offset - viewerSize.x / 2 );
                    this.stripElement.style.marginLeft = -offset + 'px';
                    loadPanels( this, viewerSize.x, -offset );
                }
            } else {
                let offset = ( Number( page ) ) * ( this.panelHeight + 3 );
                if ( offset > offsetTop + viewerSize.y - this.panelHeight ) {
                    offset = Math.min( offset, ( scrollHeight - viewerSize.y ) );
                    this.stripElement.style.marginTop = -offset + 'px';
                    loadPanels( this, viewerSize.y, -offset );
                } else if ( offset < offsetTop ) {
                    offset = Math.max( 0, offset - viewerSize.y / 2 );
                    this.stripElement.style.marginTop = -offset + 'px';
                    loadPanels( this, viewerSize.y, -offset );
                }
            }

            this.currentPage = page;
            onStripEnter.call( this, { eventSource: this.stripTracker } );
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

        //TODO reference strip auto resize

        // var viewerSize,
        //     newWidth,
        //     newHeight;

        // viewerSize = $.getElementSize( this.viewer.element );
        // if ( this._resizeWithViewer && viewerSize.x && viewerSize.y && !viewerSize.equals( this.oldViewerSize ) ) {
        //     this.oldViewerSize = viewerSize;

        //     if ( this.maintainSizeRatio || !this.elementArea) {
        //         newWidth  = viewerSize.x * this.sizeRatio;
        //         newHeight = viewerSize.y * this.sizeRatio;
        //     } else {
        //         newWidth = Math.sqrt(this.elementArea * (viewerSize.x / viewerSize.y));
        //         newHeight = this.elementArea / newWidth;
        //     }

        //     this.element.style.width  = Math.round( newWidth ) + 'px';
        //     this.element.style.height = Math.round( newHeight ) + 'px';

        //     if (!this.elementArea) {
        //         this.elementArea = newWidth * newHeight;
        //     }

        //     this.updateSize();
        // }

        return false;
    },

    destroy: function() {
        if (this.miniViewers) {
          for (const key in this.miniViewers) {
            this.miniViewers[key].destroy();
          }
        }

        this.stripTracker.destroy();

        if (this.stripElement) {
            this.viewer.removeControl( this.stripElement );
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
        let page;

        if ( 'horizontal' === this.scroll ) {
            // // +4px fix to solve problem with precision on thumbnail selection if there is a lot of them
            // page = Math.floor(event.position.x / (this.panelWidth + 4));
            // Note: This reverts PR #2280 (fix for issue #1992) as the issue was
            //    fixed in ms-reference-strip commit 7d19edff34f7491248064bef1efa69af588c40a0
            page = Math.floor(event.position.x / this.panelWidth);
        } else {
            page = Math.floor(event.position.y / this.panelHeight);
        }

        this.viewer.goToPage( page );
    }

    this.stripElement.focus();
}


/**
 * @private
 * @inner
 * @function
 */
function onStripDrag( event ) {

    if ( this.stripElement ) {
        const offsetLeft   = Number( this.stripElement.style.marginLeft.replace( 'px', '' ) ),
              offsetTop    = Number( this.stripElement.style.marginTop.replace( 'px', '' ) ),
              scrollWidth  = Number( this.stripElement.style.width.replace( 'px', '' ) ),
              scrollHeight = Number( this.stripElement.style.height.replace( 'px', '' ) ),
              viewerSize   = $.getElementSize( this.viewer.canvas );

        if ( 'horizontal' === this.scroll ) {
            if ( -event.delta.x > 0 ) {
                //forward
                if ( offsetLeft > -( scrollWidth - viewerSize.x ) ) {
                    this.stripElement.style.marginLeft = ( offsetLeft + ( event.delta.x * 2 ) ) + 'px';
                    loadPanels( this, viewerSize.x, offsetLeft + ( event.delta.x * 2 ) );
                }
            } else if ( -event.delta.x < 0 ) {
                //reverse
                if ( offsetLeft < 0 ) {
                    this.stripElement.style.marginLeft = ( offsetLeft + ( event.delta.x * 2 ) ) + 'px';
                    loadPanels( this, viewerSize.x, offsetLeft + ( event.delta.x * 2 ) );
                }
            }
        } else {
            if ( -event.delta.y > 0 ) {
                //forward
                if ( offsetTop > -( scrollHeight - viewerSize.y ) ) {
                    this.stripElement.style.marginTop = ( offsetTop + ( event.delta.y * 2 ) ) + 'px';
                    loadPanels( this, viewerSize.y, offsetTop + ( event.delta.y * 2 ) );
                }
            } else if ( -event.delta.y < 0 ) {
                //reverse
                if ( offsetTop < 0 ) {
                    this.stripElement.style.marginTop = ( offsetTop + ( event.delta.y * 2 ) ) + 'px';
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
    if ( this.stripElement ) {
        const offsetLeft   = Number( this.stripElement.style.marginLeft.replace( 'px', '' ) ),
              offsetTop    = Number( this.stripElement.style.marginTop.replace( 'px', '' ) ),
              scrollWidth  = Number( this.stripElement.style.width.replace( 'px', '' ) ),
              scrollHeight = Number( this.stripElement.style.height.replace( 'px', '' ) ),
              viewerSize   = $.getElementSize( this.viewer.canvas );

        if ( 'horizontal' === this.scroll ) {
            if ( event.scroll > 0 ) {
                //forward
                if ( offsetLeft > -( scrollWidth - viewerSize.x ) ) {
                    this.stripElement.style.marginLeft = ( offsetLeft - ( event.scroll * 50 ) ) + 'px';
                    loadPanels( this, viewerSize.x, offsetLeft - ( event.scroll * 50 ) );
                }
            } else if ( event.scroll < 0 ) {
                //reverse
                if ( offsetLeft < 0 ) {
                    this.stripElement.style.marginLeft = ( offsetLeft - ( event.scroll * 50 ) ) + 'px';
                    loadPanels( this, viewerSize.x, offsetLeft - ( event.scroll * 50 ) );
                }
            }
        } else {
            if ( event.scroll < 0 ) {
                //scroll up
                if ( offsetTop > viewerSize.y - scrollHeight ) {
                    this.stripElement.style.marginTop = ( offsetTop + ( event.scroll * 50 ) ) + 'px';
                    loadPanels( this, viewerSize.y, offsetTop + ( event.scroll * 50 ) );
                }
            } else if ( event.scroll > 0 ) {
                //scroll dowm
                if ( offsetTop < 0 ) {
                    this.stripElement.style.marginTop = ( offsetTop + ( event.scroll * 50 ) ) + 'px';
                    loadPanels( this, viewerSize.y, offsetTop + ( event.scroll * 50 ) );
                }
            }
        }

        event.preventDefault = true;
    }
}


function loadPanels( strip, viewerSize, scroll ) {
    let panelSize;
    if ( 'horizontal' === strip.scroll ) {
        panelSize = strip.panelWidth;
    } else {
        panelSize = strip.panelHeight;
    }
    const activePanelsEnd = Math.ceil( ( Math.abs( scroll ) + viewerSize ) / panelSize ) + 1;
    let activePanelsStart = Math.ceil( viewerSize / panelSize ) + 5;
    activePanelsStart = activePanelsEnd - activePanelsStart;
    activePanelsStart = activePanelsStart < 0 ? 0 : activePanelsStart;

    for ( let i = activePanelsStart; i < activePanelsEnd && i < strip.panels.length; i++ ) {
        const panelElement = strip.panels[i];
        if ( !panelElement.activePanel ) {
            const originalTileSource = strip.viewer.tileSources[i];
            let miniTileSource;
            if (originalTileSource.referenceStripThumbnailUrl) {
                miniTileSource = {
                    type: 'image',
                    url: originalTileSource.referenceStripThumbnailUrl
                };
            } else {
                miniTileSource = originalTileSource;
            }
            const miniViewer = new $.Viewer( {
                id:                     panelElement.id,
                tileSources:            [miniTileSource],
                element:                panelElement,
                mouseNavEnabled:        false,
                showNavigationControl:  false,
                immediateRender:        true,
                blendTime:              0,
                animationTime:          0,
                loadTilesWithAjax:      strip.viewer.loadTilesWithAjax,
                ajaxHeaders:            strip.viewer.ajaxHeaders,
            } );
            // Allow pointer events to pass through miniViewer's canvas/container
            //   elements so implicit pointer capture works on touch devices
            $.setElementPointerEventsNone( miniViewer.canvas );
            $.setElementPointerEventsNone( miniViewer.container );
            // We'll use event delegation from the reference strip element instead of
            //   handling events on every miniViewer
            miniViewer.innerTracker.setTracking( false );
            miniViewer.outerTracker.setTracking( false );

            strip.miniViewers[panelElement.id] = miniViewer;

            panelElement.activePanel = true;
        }
    }
}


/**
 * @private
 * @inner
 * @function
 */
function onStripEnter( event ) {
    const element = event.eventSource.element;

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
    const element = event.eventSource.element;

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
function onStripKeyDown( event ) {
    //console.log( event.keyCode );

    if ( !event.ctrl && !event.alt && !event.meta ) {
        switch ( event.keyCode ) {
            case 38: //up arrow
                onStripScroll.call( this, { eventSource: this.stripTracker, position: null, scroll: 1, shift: null } );
                event.preventDefault = true;
                break;
            case 40: //down arrow
                onStripScroll.call( this, { eventSource: this.stripTracker, position: null, scroll: -1, shift: null } );
                event.preventDefault = true;
                break;
            case 37: //left arrow
                onStripScroll.call( this, { eventSource: this.stripTracker, position: null, scroll: -1, shift: null } );
                event.preventDefault = true;
                break;
            case 39: //right arrow
                onStripScroll.call( this, { eventSource: this.stripTracker, position: null, scroll: 1, shift: null } );
                event.preventDefault = true;
                break;
            default:
                //console.log( 'reference strip keycode %s', event.keyCode );
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
function onStripKeyPress( event ) {
    //console.log( event.keyCode );

    if ( !event.ctrl && !event.alt && !event.meta ) {
        switch ( event.keyCode ) {
            case 61: //=|+
                onStripScroll.call( this, { eventSource: this.stripTracker, position: null, scroll: 1, shift: null } );
                event.preventDefault = true;
                break;
            case 45: //-|_
                onStripScroll.call( this, { eventSource: this.stripTracker, position: null, scroll: -1, shift: null } );
                event.preventDefault = true;
                break;
            case 48: //0|)
            case 119: //w
            case 87: //W
                onStripScroll.call( this, { eventSource: this.stripTracker, position: null, scroll: 1, shift: null } );
                event.preventDefault = true;
                break;
            case 115: //s
            case 83: //S
                onStripScroll.call( this, { eventSource: this.stripTracker, position: null, scroll: -1, shift: null } );
                event.preventDefault = true;
                break;
            case 97: //a
                onStripScroll.call( this, { eventSource: this.stripTracker, position: null, scroll: -1, shift: null } );
                event.preventDefault = true;
                break;
            case 100: //d
                onStripScroll.call( this, { eventSource: this.stripTracker, position: null, scroll: 1, shift: null } );
                event.preventDefault = true;
                break;
            default:
                //console.log( 'reference strip keycode %s', event.keyCode );
                event.preventDefault = false;
                break;
        }
    } else {
        event.preventDefault = false;
    }
}

}(OpenSeadragon));
