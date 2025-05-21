/*
 * OpenSeadragon - Navigator
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
 * @param {Object} options - Navigator options
 * @param {Element} [options.element] - An element to use for the navigator.
 * @param {String} [options.id] - Id of the element to use for the navigator. However, this is ignored if {@link options.element} is provided.
 */
$.Navigator = function( options ){

    var viewer      = options.viewer,
        _this = this,
        viewerSize,
        navigatorSize;

    //We may need to create a new element and id if they did not
    //provide the id for the existing element or the element itself
    if( options.element || options.id ){
        if ( options.element ) {
            if ( options.id ){
                $.console.warn("Given option.id for Navigator was ignored since option.element was provided and is being used instead.");
            }

            // Don't overwrite the element's id if it has one already
            if ( options.element.id ) {
                options.id = options.element.id;
            } else {
                options.id = 'navigator-' + $.now();
            }

            this.element = options.element;
        } else {
            this.element = document.getElementById( options.id );
        }

        options.controlOptions  = {
            anchor:           $.ControlAnchor.NONE,
            attachToViewer:   false,
            autoFade:         false
        };
    } else {
        options.id              = 'navigator-' + $.now();
        this.element            = $.makeNeutralElement( "div" );
        options.controlOptions  = {
            anchor:           $.ControlAnchor.TOP_RIGHT,
            attachToViewer:   true,
            autoFade:         options.autoFade
        };

        if( options.position ){
            if( 'BOTTOM_RIGHT' === options.position ){
               options.controlOptions.anchor = $.ControlAnchor.BOTTOM_RIGHT;
            } else if( 'BOTTOM_LEFT' === options.position ){
               options.controlOptions.anchor = $.ControlAnchor.BOTTOM_LEFT;
            } else if( 'TOP_RIGHT' === options.position ){
               options.controlOptions.anchor = $.ControlAnchor.TOP_RIGHT;
            } else if( 'TOP_LEFT' === options.position ){
               options.controlOptions.anchor = $.ControlAnchor.TOP_LEFT;
            } else if( 'ABSOLUTE' === options.position ){
               options.controlOptions.anchor = $.ControlAnchor.ABSOLUTE;
               options.controlOptions.top = options.top;
               options.controlOptions.left = options.left;
               options.controlOptions.height = options.height;
               options.controlOptions.width = options.width;
            }
        }
    }
    this.element.id         = options.id;
    this.element.className  += ' navigator';

    options = $.extend( true, {
        sizeRatio:     $.DEFAULT_SETTINGS.navigatorSizeRatio
    }, options, {
        element:                this.element,
        tabIndex:               -1, // No keyboard navigation, omit from tab order
        //These need to be overridden to prevent recursion since
        //the navigator is a viewer and a viewer has a navigator
        showNavigator:          false,
        mouseNavEnabled:        false,
        showNavigationControl:  false,
        showSequenceControl:    false,
        immediateRender:        true,
        blendTime:              0,
        animationTime:          options.animationTime,
        // disable autoResize since resize behavior is implemented differently by the navigator
        autoResize:             false,
        // prevent resizing the navigator from adding unwanted space around the image
        minZoomImageRatio:      1.0,
        background:             options.background,
        opacity:                options.opacity,
        borderColor:            options.borderColor,
        displayRegionColor:     options.displayRegionColor
    });

    options.minPixelRatio = this.minPixelRatio = viewer.minPixelRatio;

    $.setElementTouchActionNone( this.element );

    this.borderWidth = 2;
    //At some browser magnification levels the display regions lines up correctly, but at some there appears to
    //be a one pixel gap.
    this.fudge = new $.Point(1, 1);
    this.totalBorderWidths = new $.Point(this.borderWidth * 2, this.borderWidth * 2).minus(this.fudge);


    if ( options.controlOptions.anchor !== $.ControlAnchor.NONE ) {
        (function( style, borderWidth ){
            style.margin        = '0px';
            style.border        = borderWidth + 'px solid ' + options.borderColor;
            style.padding       = '0px';
            style.background    = options.background;
            style.opacity       = options.opacity;
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
        style.border        = borderWidth + 'px solid ' + options.displayRegionColor;
        style.margin        = '0px';
        style.padding       = '0px';
        style.background    = 'transparent';

        // We use square bracket notation on the statement below, because float is a keyword.
        // This is important for the Google Closure compiler, if nothing else.
        /*jshint sub:true */
        style['float']      = 'left'; //Webkit

        style.cssFloat      = 'left'; //Firefox
        style.zIndex        = 999999999;
        style.cursor        = 'default';
        style.boxSizing     = 'content-box';
    }( this.displayRegion.style, this.borderWidth ));
    $.setElementPointerEventsNone( this.displayRegion );
    $.setElementTouchActionNone( this.displayRegion );

    this.displayRegionContainer = $.makeNeutralElement("div");
    this.displayRegionContainer.id = this.element.id + '-displayregioncontainer';
    this.displayRegionContainer.className = "displayregioncontainer";
    this.displayRegionContainer.style.width = "100%";
    this.displayRegionContainer.style.height = "100%";
    $.setElementPointerEventsNone( this.displayRegionContainer );
    $.setElementTouchActionNone( this.displayRegionContainer );

    viewer.addControl(
        this.element,
        options.controlOptions
    );

    this._resizeWithViewer = options.controlOptions.anchor !== $.ControlAnchor.ABSOLUTE &&
        options.controlOptions.anchor !== $.ControlAnchor.NONE;

    if (options.width && options.height) {
        this.setWidth(options.width);
        this.setHeight(options.height);
    } else if ( this._resizeWithViewer ) {
        viewerSize = $.getElementSize( viewer.element );
        this.element.style.height = Math.round( viewerSize.y * options.sizeRatio ) + 'px';
        this.element.style.width  = Math.round( viewerSize.x * options.sizeRatio ) + 'px';
        this.oldViewerSize = viewerSize;
        navigatorSize = $.getElementSize( this.element );
        this.elementArea = navigatorSize.x * navigatorSize.y;
    }

    this.oldContainerSize = new $.Point( 0, 0 );

    $.Viewer.apply( this, [ options ] );

    this.displayRegionContainer.appendChild(this.displayRegion);
    this.element.getElementsByTagName('div')[0].appendChild(this.displayRegionContainer);

    function rotate(degrees, immediately) {
        _setTransformRotate(_this.displayRegionContainer, degrees);
        _setTransformRotate(_this.displayRegion, -degrees);
        _this.viewport.setRotation(degrees, immediately);
    }
    if (options.navigatorRotate) {
        var degrees = options.viewer.viewport ?
            options.viewer.viewport.getRotation() :
            options.viewer.degrees || 0;

        rotate(degrees, true);
        options.viewer.addHandler("rotate", function (args) {
            rotate(args.degrees, args.immediately);
        });
    }


    // Remove the base class' (Viewer's) innerTracker and replace it with our own
    this.innerTracker.destroy();
    this.innerTracker = new $.MouseTracker({
        userData:        'Navigator.innerTracker',
        element:         this.element, //this.canvas,
        dragHandler:     $.delegate( this, onCanvasDrag ),
        clickHandler:    $.delegate( this, onCanvasClick ),
        releaseHandler:  $.delegate( this, onCanvasRelease ),
        scrollHandler:   $.delegate( this, onCanvasScroll ),
        preProcessEventHandler: function (eventInfo) {
            if (eventInfo.eventType === 'wheel') {
                //don't scroll the page up and down if the user is scrolling
                //in the navigator
                eventInfo.preventDefault = true;
            }
        }
    });
    this.outerTracker.userData = 'Navigator.outerTracker';

    // this.innerTracker is attached to this.element...we need to allow pointer
    //   events to pass through this Viewer's canvas/container elements so implicit
    //   pointer capture works on touch devices
    //TODO an alternative is to attach the new MouseTracker to this.canvas...not
    //   sure why it isn't already (see MouseTracker constructor call above)
    $.setElementPointerEventsNone( this.canvas );
    $.setElementPointerEventsNone( this.container );

    this.addHandler("reset-size", function() {
        if (_this.viewport) {
            _this.viewport.goHome(true);
        }
    });

    viewer.world.addHandler("item-index-change", function(event) {
        window.setTimeout(function(){
            var item = _this.world.getItemAt(event.previousIndex);
            _this.world.setItemIndex(item, event.newIndex);
        }, 1);
    });

    viewer.world.addHandler("remove-item", function(event) {
        var theirItem = event.item;
        var myItem = _this._getMatchingItem(theirItem);
        if (myItem) {
            _this.world.removeItem(myItem);
        }
    });

    this.update(viewer.viewport);
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
                this.viewport.resize( containerSize, true );
                this.viewport.goHome(true);
                this.oldContainerSize = containerSize;
                this.world.update();
                this.world.draw();
                this.update(this.viewer.viewport);
            }
        }
    },

    /**
     * Explicitly sets the width of the navigator, in web coordinates. Disables automatic resizing.
     * @param {Number|String} width - the new width, either a number of pixels or a CSS string, such as "100%"
     */
    setWidth: function(width) {
        this.width = width;
        this.element.style.width = typeof (width) === "number" ? (width + 'px') : width;
        this._resizeWithViewer = false;
        this.updateSize();
    },

    /**
     * Explicitly sets the height of the navigator, in web coordinates. Disables automatic resizing.
     * @param {Number|String} height - the new height, either a number of pixels or a CSS string, such as "100%"
     */
    setHeight: function(height) {
        this.height = height;
        this.element.style.height = typeof (height) === "number" ? (height + 'px') : height;
        this._resizeWithViewer = false;
        this.updateSize();
    },

    /**
      * Flip navigator element
      * @param {Boolean} state - Flip state to set.
      */
    setFlip: function(state) {
      this.viewport.setFlip(state);

      this.setDisplayTransform(this.viewer.viewport.getFlip() ? "scale(-1,1)" : "scale(1,1)");
      return this;
    },

    setDisplayTransform: function(rule) {
      setElementTransform(this.canvas, rule);
      setElementTransform(this.element, rule);
    },

    /**
     * Used to update the navigator minimap's viewport rectangle when a change in the viewer's viewport occurs.
     * @function
     * @param {OpenSeadragon.Viewport} [viewport] The viewport to display. Default: the viewport this navigator is tracking.
     */
    update: function( viewport ) {

        var viewerSize,
            newWidth,
            newHeight,
            bounds,
            topleft,
            bottomright;

        if(!viewport){
            viewport = this.viewer.viewport;
        }

        viewerSize = $.getElementSize( this.viewer.element );
        if ( this._resizeWithViewer && viewerSize.x && viewerSize.y && !viewerSize.equals( this.oldViewerSize ) ) {
            this.oldViewerSize = viewerSize;

            if ( this.maintainSizeRatio || !this.elementArea) {
                newWidth  = viewerSize.x * this.sizeRatio;
                newHeight = viewerSize.y * this.sizeRatio;
            } else {
                newWidth = Math.sqrt(this.elementArea * (viewerSize.x / viewerSize.y));
                newHeight = this.elementArea / newWidth;
            }

            this.element.style.width  = Math.round( newWidth ) + 'px';
            this.element.style.height = Math.round( newHeight ) + 'px';

            if (!this.elementArea) {
                this.elementArea = newWidth * newHeight;
            }

            this.updateSize();
        }

        if (viewport && this.viewport) {
            bounds      = viewport.getBoundsNoRotate(true);
            topleft     = this.viewport.pixelFromPointNoRotate(bounds.getTopLeft(), false);
            bottomright = this.viewport.pixelFromPointNoRotate(bounds.getBottomRight(), false)
                .minus( this.totalBorderWidths );

            if (!this.navigatorRotate) {
                var degrees = viewport.getRotation(true);
                _setTransformRotate(this.displayRegion, -degrees);
            }

            //update style for navigator-box
            var style = this.displayRegion.style;
            style.display = this.world.getItemCount() ? 'block' : 'none';

            style.top = topleft.y.toFixed(2) + "px";
            style.left = topleft.x.toFixed(2) + "px";

            var width = bottomright.x - topleft.x;
            var height = bottomright.y - topleft.y;
            // make sure width and height are non-negative so IE doesn't throw
            style.width  = Math.round( Math.max( width, 0 ) ) + 'px';
            style.height = Math.round( Math.max( height, 0 ) ) + 'px';
        }

    },

    // overrides Viewer.addTiledImage
    addTiledImage: function(options) {
        var _this = this;

        var original = options.originalTiledImage;
        delete options.original;

        var optionsClone = $.extend({}, options, {
            success: function(event) {
                var myItem = event.item;
                myItem._originalForNavigator = original;
                _this._matchBounds(myItem, original, true);
                _this._matchOpacity(myItem, original);
                _this._matchCompositeOperation(myItem, original);

                function matchBounds() {
                    _this._matchBounds(myItem, original);
                }

                function matchOpacity() {
                    _this._matchOpacity(myItem, original);
                }

                function matchCompositeOperation() {
                    _this._matchCompositeOperation(myItem, original);
                }

                original.addHandler('bounds-change', matchBounds);
                original.addHandler('clip-change', matchBounds);
                original.addHandler('opacity-change', matchOpacity);
                original.addHandler('composite-operation-change', matchCompositeOperation);
            }
        });

        return $.Viewer.prototype.addTiledImage.apply(this, [optionsClone]);
    },

    destroy: function() {
        return $.Viewer.prototype.destroy.apply(this);
    },

    // private
    _getMatchingItem: function(theirItem) {
        var count = this.world.getItemCount();
        var item;
        for (var i = 0; i < count; i++) {
            item = this.world.getItemAt(i);
            if (item._originalForNavigator === theirItem) {
                return item;
            }
        }

        return null;
    },

    // private
    _matchBounds: function(myItem, theirItem, immediately) {
        var bounds = theirItem.getBoundsNoRotate();
        myItem.setPosition(bounds.getTopLeft(), immediately);
        myItem.setWidth(bounds.width, immediately);
        myItem.setRotation(theirItem.getRotation(), immediately);
        myItem.setClip(theirItem.getClip());
        myItem.setFlip(theirItem.getFlip());
    },

    // private
    _matchOpacity: function(myItem, theirItem) {
        myItem.setOpacity(theirItem.opacity);
    },

    // private
    _matchCompositeOperation: function(myItem, theirItem) {
        myItem.setCompositeOperation(theirItem.compositeOperation);
    }
});


/**
 * @private
 * @inner
 * @function
 */
function onCanvasClick( event ) {
  var canvasClickEventArgs = {
    tracker: event.eventSource,
    position: event.position,
    quick: event.quick,
    shift: event.shift,
    originalEvent: event.originalEvent,
    preventDefaultAction: false
  };
  /**
   * Raised when a click event occurs on the {@link OpenSeadragon.Viewer#navigator} element.
   *
   * @event navigator-click
   * @memberof OpenSeadragon.Viewer
   * @type {object}
   * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised this event.
   * @property {OpenSeadragon.MouseTracker} tracker - A reference to the MouseTracker which originated this event.
   * @property {OpenSeadragon.Point} position - The position of the event relative to the tracked element.
   * @property {Boolean} quick - True only if the clickDistThreshold and clickTimeThreshold are both passed. Useful for differentiating between clicks and drags.
   * @property {Boolean} shift - True if the shift key was pressed during this event.
   * @property {Object} originalEvent - The original DOM event.
   * @property {?Object} userData - Arbitrary subscriber-defined object.
   * @property {Boolean} preventDefaultAction - Set to true to prevent default click to zoom behaviour. Default: false.
   */

   this.viewer.raiseEvent('navigator-click', canvasClickEventArgs);

   if ( !canvasClickEventArgs.preventDefaultAction && event.quick && this.viewer.viewport && (this.panVertical || this.panHorizontal)) {
    if(this.viewer.viewport.flipped) {
      event.position.x = this.viewport.getContainerSize().x - event.position.x;
    }
    var target = this.viewport.pointFromPixel(event.position);
    if (!this.panVertical) {
      // perform only horizonal pan
      target.y = this.viewer.viewport.getCenter(true).y;
    } else if (!this.panHorizontal) {
      // perform only vertical pan
      target.x = this.viewer.viewport.getCenter(true).x;
    }
    this.viewer.viewport.panTo(target);
    this.viewer.viewport.applyConstraints();
  }

}

/**
 * @private
 * @inner
 * @function
 */
function onCanvasDrag( event ) {
    var canvasDragEventArgs = {
      tracker: event.eventSource,
      position: event.position,
      delta: event.delta,
      speed: event.speed,
      direction: event.direction,
      shift: event.shift,
      originalEvent: event.originalEvent,
      preventDefaultAction: false
    };
    /**
     * Raised when a drag event occurs on the {@link OpenSeadragon.Viewer#navigator} element.
     *
     * @event navigator-drag
     * @memberof OpenSeadragon.Viewer
     * @type {object}
     * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised this event.
     * @property {OpenSeadragon.MouseTracker} tracker - A reference to the MouseTracker which originated this event.
     * @property {OpenSeadragon.Point} position - The position of the event relative to the tracked element.
     * @property {OpenSeadragon.Point} delta - The x,y components of the difference between start drag and end drag.
     * @property {Number} speed - Current computed speed, in pixels per second.
     * @property {Number} direction - Current computed direction, expressed as an angle counterclockwise relative to the positive X axis (-pi to pi, in radians). Only valid if speed > 0.
     * @property {Boolean} shift - True if the shift key was pressed during this event.
     * @property {Object} originalEvent - The original DOM event.
     * @property {?Object} userData - Arbitrary subscriber-defined object.
     * @property {Boolean} preventDefaultAction - Set to true to prevent default drag to pan behaviour. Default: false.
     */
     this.viewer.raiseEvent('navigator-drag', canvasDragEventArgs);

     if ( !canvasDragEventArgs.preventDefaultAction && this.viewer.viewport ) {
       if( !this.panHorizontal ){
            event.delta.x = 0;
        }
        if( !this.panVertical ){
            event.delta.y = 0;
        }

        if(this.viewer.viewport.flipped){
            event.delta.x = -event.delta.x;
        }

        this.viewer.viewport.panBy(
            this.viewport.deltaPointsFromPixels(
                event.delta
            )
        );
        if( this.viewer.constrainDuringPan ){
            this.viewer.viewport.applyConstraints();
        }
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
    var eventArgs = {
        tracker: event.eventSource,
        position: event.position,
        scroll: event.scroll,
        shift: event.shift,
        originalEvent: event.originalEvent,
        preventDefault: event.preventDefault
    };

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
     * @property {Boolean} preventDefault - Set to true to prevent the default user-agent's handling of the wheel event.
     * @property {?Object} userData - Arbitrary subscriber-defined object.
     */
    this.viewer.raiseEvent( 'navigator-scroll', eventArgs );

    event.preventDefault = eventArgs.preventDefault;
}

/**
    * @function
    * @private
    * @param {Object} element
    * @param {Number} degrees
    */
function _setTransformRotate( element, degrees ) {
  setElementTransform(element, "rotate(" + degrees + "deg)");
}

function setElementTransform( element, rule ) {
  element.style.webkitTransform = rule;
  element.style.mozTransform = rule;
  element.style.msTransform = rule;
  element.style.oTransform = rule;
  element.style.transform = rule;
}

}( OpenSeadragon ));
