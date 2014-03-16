/*
 * OpenSeadragon - MouseTracker
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

(function ( $ ) {

        // is any button currently being pressed while mouse events occur
    var IS_BUTTON_DOWN = false,
        // is any tracker currently capturing?
        IS_CAPTURING   = false,
        // dictionary from hash to MouseTracker
        ACTIVE         = {},
        // list of trackers interested in capture
        CAPTURING      = [],
        // dictionary from hash to private properties
        THIS           = {};

    /**
     * @class MouseTracker
     * @classdesc Provides simplified handling of common mouse, touch, and keyboard
     * events on a specific element, like 'enter', 'exit', 'press', 'release',
     * 'scroll', 'click', and 'drag'.
     *
     * @memberof OpenSeadragon
     * @param {Object} options
     *      Allows configurable properties to be entirely specified by passing
     *      an options object to the constructor.  The constructor also supports
     *      the original positional arguments 'element', 'clickTimeThreshold',
     *      and 'clickDistThreshold' in that order.
     * @param {Element|String} options.element
     *      A reference to an element or an element id for which the mouse/touch/key
     *      events will be monitored.
     * @param {Number} options.clickTimeThreshold
     *      The number of milliseconds within which multiple mouse clicks
     *      will be treated as a single event.
     * @param {Number} options.clickDistThreshold
     *      The distance between mouse click within multiple mouse clicks
     *      will be treated as a single event.
     * @param {Number} [options.stopDelay=50]
     *      The number of milliseconds without mouse move before the mouse stop
     *      event is fired.
     * @param {OpenSeadragon.EventHandler} [options.enterHandler=null]
     *      An optional handler for mouse enter.
     * @param {OpenSeadragon.EventHandler} [options.exitHandler=null]
     *      An optional handler for mouse exit.
     * @param {OpenSeadragon.EventHandler} [options.pressHandler=null]
     *      An optional handler for mouse press.
     * @param {OpenSeadragon.EventHandler} [options.releaseHandler=null]
     *      An optional handler for mouse release.
     * @param {OpenSeadragon.EventHandler} [options.moveHandler=null]
     *      An optional handler for mouse move.
     * @param {OpenSeadragon.EventHandler} [options.scrollHandler=null]
     *      An optional handler for mouse scroll.
     * @param {OpenSeadragon.EventHandler} [options.clickHandler=null]
     *      An optional handler for mouse click.
     * @param {OpenSeadragon.EventHandler} [options.dragHandler=null]
     *      An optional handler for the drag gesture.
     * @param {OpenSeadragon.EventHandler} [options.pinchHandler=null]
     *      An optional handler for the pinch gesture.
     * @param {OpenSeadragon.EventHandler} [options.swipeHandler=null]
     *      An optional handler for the swipe gesture.
     * @param {OpenSeadragon.EventHandler} [options.keyHandler=null]
     *      An optional handler for keypress.
     * @param {OpenSeadragon.EventHandler} [options.focusHandler=null]
     *      An optional handler for focus.
     * @param {OpenSeadragon.EventHandler} [options.blurHandler=null]
     *      An optional handler for blur.
     * @param {Object} [options.userData=null]
     *      Arbitrary object to be passed unchanged to any attached handler methods.
     */
    $.MouseTracker = function ( options ) {

        var args = arguments;

        if ( !$.isPlainObject( options ) ) {
            options = {
                element:            args[ 0 ],
                clickTimeThreshold: args[ 1 ],
                clickDistThreshold: args[ 2 ]
            };
        }

        this.hash               = Math.random(); // An unique hash for this tracker.
        /**
         * The element for which mouse/touch/key events are being monitored.
         * @member {Element} element
         * @memberof OpenSeadragon.MouseTracker#
         */
        this.element            = $.getElement( options.element );
        /**
         * The number of milliseconds within which mutliple mouse clicks will be treated as a single event.
         * @member {Number} clickTimeThreshold
         * @memberof OpenSeadragon.MouseTracker#
         */
        this.clickTimeThreshold = options.clickTimeThreshold;
        /**
         * The distance between mouse click within multiple mouse clicks will be treated as a single event.
         * @member {Number} clickDistThreshold
         * @memberof OpenSeadragon.MouseTracker#
         */
        this.clickDistThreshold = options.clickDistThreshold;
        this.userData           = options.userData       || null;
        this.stopDelay          = options.stopDelay      || 50;

        this.enterHandler       = options.enterHandler   || null;
        this.exitHandler        = options.exitHandler    || null;
        this.pressHandler       = options.pressHandler   || null;
        this.releaseHandler     = options.releaseHandler || null;
        this.moveHandler        = options.moveHandler    || null;
        this.scrollHandler      = options.scrollHandler  || null;
        this.clickHandler       = options.clickHandler   || null;
        this.dragHandler        = options.dragHandler    || null;
        this.pinchHandler       = options.pinchHandler   || null;
        this.swipeHandler       = options.swipeHandler   || null;
        this.stopHandler        = options.stopHandler    || null;
        this.keyHandler         = options.keyHandler     || null;
        this.focusHandler       = options.focusHandler   || null;
        this.blurHandler        = options.blurHandler    || null;

        //Store private properties in a scope sealed hash map
        var _this = this;

        /**
         * @private
         * @property {Boolean} tracking
         *      Are we currently tracking mouse events.
         * @property {Boolean} capturing
         *      Are we curruently capturing mouse events.
         * @property {Boolean} insideElementPressed
         *      True if the left mouse button is currently being pressed and was
         *      initiated inside the tracked element, otherwise false.
         * @property {Boolean} insideElement
         *      Are we currently inside the screen area of the tracked element.
         * @property {OpenSeadragon.Point} lastPoint
         *      Position of last mouse down/move
         * @property {Number} lastMouseDownTime
         *      Time of last mouse down.
         * @property {OpenSeadragon.Point} lastMouseDownPoint
         *      Position of last mouse down
         */
        THIS[ this.hash ] = {
            click:                 function ( event ) { onClick( _this, event ); },
            keypress:              function ( event ) { onKeyPress( _this, event ); },
            focus:                 function ( event ) { onFocus( _this, event ); },
            blur:                  function ( event ) { onBlur( _this, event ); },
            wheel:                 function ( event ) { onWheel( _this, event ); },
            mousewheel:            function ( event ) { onMouseWheel( _this, event ); },
            DOMMouseScroll:        function ( event ) { onMouseWheel( _this, event ); },
            MozMousePixelScroll:   function ( event ) { onMouseWheel( _this, event ); },
            pointerover:           function ( event ) { onPointerOver( _this, event ); },
            MSPointerOver:         function ( event ) { onPointerOver( _this, event ); },
            mouseover:             function ( event ) { onMouseOver( _this, event ); },
            pointerout:            function ( event ) { onPointerOut( _this, event ); },
            MSPointerOut:          function ( event ) { onPointerOut( _this, event ); },
            mouseout:              function ( event ) { onMouseOut( _this, event ); },
            pointerdown:           function ( event ) { onPointerDown( _this, event ); },
            MSPointerDown:         function ( event ) { onPointerDown( _this, event ); },
            mousedown:             function ( event ) { onMouseDown( _this, event ); },
            pointerup:             function ( event ) { onPointerUp( _this, event ); },
            MSPointerUp:           function ( event ) { onPointerUp( _this, event ); },
            mouseup:               function ( event ) { onMouseUp( _this, event ); },
            pointermove:           function ( event ) { onPointerMove( _this, event ); },
            MSPointerMove:         function ( event ) { onPointerMove( _this, event ); },
            mousemove:             function ( event ) { onMouseMove( _this, event ); },
            pointercancel:         function ( event ) { onPointerCancel( _this, event ); },
            MSPointerCancel:       function ( event ) { onPointerCancel( _this, event ); },
            mouseupcapturedie:     function ( event ) { onMouseUpCapturedIE( _this, event ); },
            mousemovecapturedie:   function ( event ) { onMouseMoveCapturedIE( _this, event ); },
            mouseupcaptured:       function ( event ) { onMouseUpCaptured( _this, event ); },
            mousemovecaptured:     function ( event ) { onMouseMoveCaptured( _this, event ); },
            touchstart:            function ( event ) { onTouchStart( _this, event ); },
            touchmove:             function ( event ) { onTouchMove( _this, event ); },
            touchend:              function ( event ) { onTouchEnd( _this, event ); },
            gesturestart:          function ( event ) { onGestureStart( _this, event ); },
            gesturechange:         function ( event ) { onGestureChange( _this, event ); },
            tracking: false,
            capturing:             false,
            // Contact Points
            mousePoints:           {},
            mousePointCount:       0,
            touchPoints:           {},
            touchPointCount:       0,
            penPoints:             {},
            penPointCount:         0,
            // Tracking for pinch gesture
            pinchGesturePoints:    [],
            lastPinchDist:         0,
            currentPinchDist:      0,
            lastPinchCenter:       null,
            currentPinchCenter:    null,

            //insideElementPressed:  false,
            //insideElement:         false,
            //lastPoint:             null,
            //lastMouseDownTime:     null,
            //lastMouseDownPoint:    null,
            //lastPinchDelta:        0,
        };

    };

    $.MouseTracker.prototype = /** @lends OpenSeadragon.MouseTracker.prototype */{

        /**
         * Clean up any events or objects created by the mouse tracker.
         * @function
         */
        destroy: function () {
            stopTracking( this );
            this.element = null;
        },

        /**
         * Are we currently tracking events on this element.
         * @deprecated Just use this.tracking
         * @function
         * @returns {Boolean} Are we currently tracking events on this element.
         */
        isTracking: function () {
            return THIS[ this.hash ].tracking;
        },

        /**
         * Enable or disable whether or not we are tracking events on this element.
         * @function
         * @param {Boolean} track True to start tracking, false to stop tracking.
         * @returns {OpenSeadragon.MouseTracker} Chainable.
         */
        setTracking: function ( track ) {
            if ( track ) {
                startTracking( this );
            } else {
                stopTracking( this );
            }
            //chain
            return this;
        },

        /**
         * Implement or assign implementation to these handlers during or after
         * calling the constructor.
         * @function
         * @param {Object} event
         * @param {OpenSeadragon.MouseTracker} event.eventSource
         *      A reference to the tracker instance.
         * @param {OpenSeadragon.Point} event.position
         *      The position of the event relative to the tracked element.
         * @param {Boolean} event.insideElementPressed
         *      True if the left mouse button is currently being pressed and was
         *      initiated inside the tracked element, otherwise false.
         * @param {Boolean} event.buttonDownAny
         *      Was the button down anywhere in the screen during the event.
         * @param {Boolean} event.isTouchEvent
         *      True if the original event is a touch event, otherwise false. <span style="color:red;">Deprecated. Examine originalEvent instead.</span>
         * @param {Object} event.originalEvent
         *      The original event object.
         * @param {Boolean} event.preventDefaultAction
         *      Set to true to prevent the tracker subscriber from performing its default action (subscriber implementation dependent). Default: false.
         * @param {Object} event.userData
         *      Arbitrary user-defined object.
         */
        enterHandler: function () { },

        /**
         * Implement or assign implementation to these handlers during or after
         * calling the constructor.
         * @function
         * @param {Object} event
         * @param {OpenSeadragon.MouseTracker} event.eventSource
         *      A reference to the tracker instance.
         * @param {OpenSeadragon.Point} event.position
         *      The position of the event relative to the tracked element.
         * @param {Boolean} event.insideElementPressed
         *      True if the left mouse button is currently being pressed and was
         *      initiated inside the tracked element, otherwise false.
         * @param {Boolean} event.buttonDownAny
         *      Was the button down anywhere in the screen during the event.
         * @param {Boolean} event.isTouchEvent
         *      True if the original event is a touch event, otherwise false. <span style="color:red;">Deprecated. Examine originalEvent instead.</span>
         * @param {Object} event.originalEvent
         *      The original event object.
         * @param {Boolean} event.preventDefaultAction
         *      Set to true to prevent the tracker subscriber from performing its default action (subscriber implementation dependent). Default: false.
         * @param {Object} event.userData
         *      Arbitrary user-defined object.
         */
        exitHandler: function () { },

        /**
         * Implement or assign implementation to these handlers during or after
         * calling the constructor.
         * @function
         * @param {Object} event
         * @param {OpenSeadragon.MouseTracker} event.eventSource
         *      A reference to the tracker instance.
         * @param {OpenSeadragon.Point} event.position
         *      The position of the event relative to the tracked element.
         * @param {Boolean} event.isTouchEvent
         *      True if the original event is a touch event, otherwise false. <span style="color:red;">Deprecated. Examine originalEvent instead.</span>
         * @param {Object} event.originalEvent
         *      The original event object.
         * @param {Boolean} event.preventDefaultAction
         *      Set to true to prevent the tracker subscriber from performing its default action (subscriber implementation dependent). Default: false.
         * @param {Object} event.userData
         *      Arbitrary user-defined object.
         */
        pressHandler: function () { },

        /**
         * Implement or assign implementation to these handlers during or after
         * calling the constructor.
         * @function
         * @param {Object} event
         * @param {OpenSeadragon.MouseTracker} event.eventSource
         *      A reference to the tracker instance.
         * @param {OpenSeadragon.Point} event.position
         *      The position of the event relative to the tracked element.
         * @param {Boolean} event.insideElementPressed
         *      True if the left mouse button is currently being pressed and was
         *      initiated inside the tracked element, otherwise false.
         * @param {Boolean} event.insideElementReleased
         *      True if the cursor still inside the tracked element when the button was released.
         * @param {Boolean} event.isTouchEvent
         *      True if the original event is a touch event, otherwise false. <span style="color:red;">Deprecated. Examine originalEvent instead.</span>
         * @param {Object} event.originalEvent
         *      The original event object.
         * @param {Boolean} event.preventDefaultAction
         *      Set to true to prevent the tracker subscriber from performing its default action (subscriber implementation dependent). Default: false.
         * @param {Object} event.userData
         *      Arbitrary user-defined object.
         */
        releaseHandler: function () { },

        /**
         * Implement or assign implementation to these handlers during or after
         * calling the constructor.
         * @function
         * @param {Object} event
         * @param {OpenSeadragon.MouseTracker} event.eventSource
         *      A reference to the tracker instance.
         * @param {OpenSeadragon.Point} event.position
         *      The position of the event relative to the tracked element.
         * @param {Boolean} event.isTouchEvent
         *      True if the original event is a touch event, otherwise false. <span style="color:red;">Deprecated. Examine originalEvent instead.</span>
         * @param {Object} event.originalEvent
         *      The original event object.
         * @param {Boolean} event.preventDefaultAction
         *      Set to true to prevent the tracker subscriber from performing its default action (subscriber implementation dependent). Default: false.
         * @param {Object} event.userData
         *      Arbitrary user-defined object.
         */
        moveHandler: function () { },

        /**
         * Implement or assign implementation to these handlers during or after
         * calling the constructor.
         * @function
         * @param {Object} event
         * @param {OpenSeadragon.MouseTracker} event.eventSource
         *      A reference to the tracker instance.
         * @param {OpenSeadragon.Point} event.position
         *      The position of the event relative to the tracked element.
         * @param {Number} event.scroll
         *      The scroll delta for the event.
         * @param {Boolean} event.shift
         *      True if the shift key was pressed during this event.
         * @param {Boolean} event.isTouchEvent
         *      True if the original event is a touch event, otherwise false. <span style="color:red;">Deprecated. Examine originalEvent instead.</span>
         * @param {Object} event.originalEvent
         *      The original event object.
         * @param {Boolean} event.preventDefaultAction
         *      Set to true to prevent the tracker subscriber from performing its default action (subscriber implementation dependent). Default: false.
         * @param {Object} event.userData
         *      Arbitrary user-defined object.
         */
        scrollHandler: function () { },

        /**
         * Implement or assign implementation to these handlers during or after
         * calling the constructor.
         * @function
         * @param {Object} event
         * @param {OpenSeadragon.MouseTracker} event.eventSource
         *      A reference to the tracker instance.
         * @param {OpenSeadragon.Point} event.position
         *      The position of the event relative to the tracked element.
         * @param {Number} event.quick
         *      True only if the clickDistThreshold and clickDeltaThreshold are both passed. Useful for ignoring events.
         * @param {Boolean} event.shift
         *      True if the shift key was pressed during this event.
         * @param {Boolean} event.isTouchEvent
         *      True if the original event is a touch event, otherwise false. <span style="color:red;">Deprecated. Examine originalEvent instead.</span>
         * @param {Object} event.originalEvent
         *      The original event object.
         * @param {Boolean} event.preventDefaultAction
         *      Set to true to prevent the tracker subscriber from performing its default action (subscriber implementation dependent). Default: false.
         * @param {Object} event.userData
         *      Arbitrary user-defined object.
         */
        clickHandler: function () { },

        /**
         * Implement or assign implementation to these handlers during or after
         * calling the constructor.
         * @function
         * @param {Object} event
         * @param {OpenSeadragon.MouseTracker} event.eventSource
         *      A reference to the tracker instance.
         * @param {OpenSeadragon.Point} event.position
         *      The position of the event relative to the tracked element.
         * @param {OpenSeadragon.Point} event.delta
         *      The x,y components of the difference between start drag and end drag.  Usefule for ignoring or weighting the events.
         * @param {Boolean} event.shift
         *      True if the shift key was pressed during this event.
         * @param {Boolean} event.isTouchEvent
         *      True if the original event is a touch event, otherwise false. <span style="color:red;">Deprecated. Examine originalEvent instead.</span>
         * @param {Object} event.originalEvent
         *      The original event object.
         * @param {Boolean} event.preventDefaultAction
         *      Set to true to prevent the tracker subscriber from performing its default action (subscriber implementation dependent). Default: false.
         * @param {Object} event.userData
         *      Arbitrary user-defined object.
         */
        dragHandler: function () { },

        /**
         * Implement or assign implementation to these handlers during or after
         * calling the constructor.
         * @function
         * @param {Object} event
         * @param {OpenSeadragon.MouseTracker} event.eventSource
         *      A reference to the tracker instance.
         * @param {OpenSeadragon.Point} event.position
         *      The position of the event relative to the tracked element.
         * @param {OpenSeadragon.Point} event.delta
         *      The x,y components of the difference between start drag and end drag.  Usefule for ignoring or weighting the events.
         * @param {Boolean} event.shift
         *      True if the shift key was pressed during this event.
         * @param {Boolean} event.isTouchEvent
         *      True if the original event is a touch event, otherwise false. <span style="color:red;">Deprecated. Examine originalEvent instead.</span>
         * @param {Object} event.originalEvent
         *      The original event object.
         * @param {Boolean} event.preventDefaultAction
         *      Set to true to prevent the tracker subscriber from performing its default action (subscriber implementation dependent). Default: false.
         * @param {Object} event.userData
         *      Arbitrary user-defined object.
         */
        pinchHandler: function () { },

        /**
         * Implement or assign implementation to these handlers during or after
         * calling the constructor.
         * @function
         * @param {Object} event
         * @param {OpenSeadragon.MouseTracker} event.eventSource
         *      A reference to the tracker instance.
         * @param {OpenSeadragon.Point} event.position
         *      The position of the event relative to the tracked element.
         * @param {OpenSeadragon.Point} event.delta
         *      The x,y components of the difference between start drag and end drag.  Usefule for ignoring or weighting the events.
         * @param {Boolean} event.shift
         *      True if the shift key was pressed during this event.
         * @param {Boolean} event.isTouchEvent
         *      True if the original event is a touch event, otherwise false. <span style="color:red;">Deprecated. Examine originalEvent instead.</span>
         * @param {Object} event.originalEvent
         *      The original event object.
         * @param {Boolean} event.preventDefaultAction
         *      Set to true to prevent the tracker subscriber from performing its default action (subscriber implementation dependent). Default: false.
         * @param {Object} event.userData
         *      Arbitrary user-defined object.
         */
        swipeHandler: function () { },

        /**
         * Implement or assign implementation to these handlers during or after
         * calling the constructor.
         * @function
         * @param {Object} event
         * @param {OpenSeadragon.MouseTracker} event.eventSource
         *      A reference to the tracker instance.
         * @param {OpenSeadragon.Point} event.position
         *      The position of the event relative to the tracked element.
         * @param {Boolean} event.isTouchEvent
         *      True if the original event is a touch event, otherwise false. <span style="color:red;">Deprecated. Examine originalEvent instead.</span>
         * @param {Object} event.originalEvent
         *      The original event object.
         * @param {Boolean} event.preventDefaultAction
         *      Set to true to prevent the tracker subscriber from performing its default action (subscriber implementation dependent). Default: false.
         * @param {Object} event.userData
         *      Arbitrary user-defined object.
         */
        stopHandler: function () { },

        /**
         * Implement or assign implementation to these handlers during or after
         * calling the constructor.
         * @function
         * @param {Object} event
         * @param {OpenSeadragon.MouseTracker} event.eventSource
         *      A reference to the tracker instance.
         * @param {Number} event.keyCode
         *      The key code that was pressed.
         * @param {Boolean} event.shift
         *      True if the shift key was pressed during this event.
         * @param {Object} event.originalEvent
         *      The original event object.
         * @param {Boolean} event.preventDefaultAction
         *      Set to true to prevent the tracker subscriber from performing its default action (subscriber implementation dependent). Default: false.
         * @param {Object} event.userData
         *      Arbitrary user-defined object.
         */
        keyHandler: function () { },

        /**
         * Implement or assign implementation to these handlers during or after
         * calling the constructor.
         * @function
         * @param {Object} event
         * @param {OpenSeadragon.MouseTracker} event.eventSource
         *      A reference to the tracker instance.
         * @param {Object} event.originalEvent
         *      The original event object.
         * @param {Boolean} event.preventDefaultAction
         *      Set to true to prevent the tracker subscriber from performing its default action (subscriber implementation dependent). Default: false.
         * @param {Object} event.userData
         *      Arbitrary user-defined object.
         */
        focusHandler: function () { },

        /**
         * Implement or assign implementation to these handlers during or after
         * calling the constructor.
         * @function
         * @param {Object} event
         * @param {OpenSeadragon.MouseTracker} event.eventSource
         *      A reference to the tracker instance.
         * @param {Object} event.originalEvent
         *      The original event object.
         * @param {Boolean} event.preventDefaultAction
         *      Set to true to prevent the tracker subscriber from performing its default action (subscriber implementation dependent). Default: false.
         * @param {Object} event.userData
         *      Arbitrary user-defined object.
         */
        blurHandler: function () { }
    };


    /**
     * Detect available mouse wheel event name.
     */
    $.MouseTracker.wheelEventName = ( $.Browser.vendor == $.BROWSERS.IE && $.Browser.version > 8 ) ||
                                                ( 'onwheel' in document.createElement( 'div' ) ) ? 'wheel' : // Modern browsers support 'wheel'
                                    document.onmousewheel !== undefined ? 'mousewheel' :                     // Webkit and IE support at least 'mousewheel'
                                    'DOMMouseScroll';                                                        // Assume old Firefox

    /**
     * Detect browser pointer/touch event model and build appropriate list of events to subscribe to.
     */
    $.MouseTracker.subscribeEvents = [ "click", "keypress", "focus", "blur", $.MouseTracker.wheelEventName ];

    if( $.MouseTracker.wheelEventName == "DOMMouseScroll" ) {
        // Older Firefox
        $.MouseTracker.subscribeEvents.push( "MozMousePixelScroll" );
    }

    if ( window.PointerEvent ) {
        // IE11 and other W3C Pointer Event implementations (see http://www.w3.org/TR/pointerevents)
        $.MouseTracker.subscribeEvents.push( "pointerover", "pointerout", "pointerdown", "pointerup", "pointermove", "pointercancel" );
        $.MouseTracker.unprefixedPointerEvents = true;
        if( navigator.maxTouchPoints ) {
            $.MouseTracker.maxTouchPoints = navigator.maxTouchPoints;
        }
        else {
            $.MouseTracker.maxTouchPoints = 0;
        }
    }
    else if ( window.MSPointerEvent ) {
        // IE10
        $.MouseTracker.subscribeEvents.push( "MSPointerOver", "MSPointerOut", "MSPointerDown", "MSPointerUp", "MSPointerMove", "MSPointerCancel" );
        $.MouseTracker.unprefixedPointerEvents = false;
        if( navigator.msMaxTouchPoints ) {
            $.MouseTracker.maxTouchPoints = navigator.msMaxTouchPoints;
        }
        else {
            $.MouseTracker.maxTouchPoints = 0;
        }
    }
    else {
        $.MouseTracker.subscribeEvents.push( "mouseover", "mouseout", "mousedown", "mouseup", "mousemove" );
        if ( 'ontouchstart' in window ) {
            // iOS, Android, and other W3c Touch Event implementations (see http://www.w3.org/TR/2011/WD-touch-events-20110505)
            $.MouseTracker.subscribeEvents.push( "touchstart", "touchmove", "touchend", "gesturestart", "gesturechange" );
        }
        $.MouseTracker.mousePointerId = "legacy-mouse";
        $.MouseTracker.maxTouchPoints = 10;
    }
    

//*******************************************************************************************************************************************
//** Utility Functions


    /**
     * Starts tracking mouse events on this element.
     * @private
     * @inner
     */
    function startTracking( tracker ) {
        var delegate = THIS[ tracker.hash ],
            event,
            i;

        if ( !delegate.tracking ) {
            for ( i = 0; i < $.MouseTracker.subscribeEvents.length; i++ ) {
                event = $.MouseTracker.subscribeEvents[ i ];
                $.addEvent(
                    tracker.element,
                    event,
                    delegate[ event ],
                    false
                );
            }
            delegate.tracking = true;
            ACTIVE[ tracker.hash ] = tracker;
        }
    }

    /**
     * Stops tracking mouse events on this element.
     * @private
     * @inner
     */
    function stopTracking( tracker ) {
        var delegate = THIS[ tracker.hash ],
            event,
            i;

        if ( delegate.tracking ) {
            for ( i = 0; i < $.MouseTracker.subscribeEvents.length; i++ ) {
                event = $.MouseTracker.subscribeEvents[ i ];
                $.removeEvent(
                    tracker.element,
                    event,
                    delegate[ event ],
                    false
                );
            }

            releaseMouse( tracker );
            delegate.tracking = false;
            delete ACTIVE[ tracker.hash ];
        }
    }

    /**
     * @private
     * @inner
     */
    function hasMouse( tracker ) {
        return THIS[ tracker.hash ].insideElement;
    }

    /**
     * Begin capturing mouse events on this element.
     * @private
     * @inner
     */
    function captureMouse( tracker ) {
        var delegate = THIS[ tracker.hash ];
        if ( !delegate.capturing ) {

            if ( $.Browser.vendor == $.BROWSERS.IE && $.Browser.version < 9 ) {
                $.removeEvent(
                    tracker.element,
                    "mouseup",
                    delegate.mouseup,
                    false
                );
                $.addEvent(
                    tracker.element,
                    "mouseup",
                    delegate.mouseupcapturedie,
                    true
                );
                $.addEvent(
                    tracker.element,
                    "mousemove",
                    delegate.mousemovecapturedie,
                    true
                );
            } else {
                $.addEvent(
                    window,
                    "mouseup",
                    delegate.mouseupcaptured,
                    true
                );
                $.addEvent(
                    window,
                    "mousemove",
                    delegate.mousemovecaptured,
                    true
                );
            }
            delegate.capturing = true;
        }
    }


    /**
     * Stop capturing mouse events on this element.
     * @private
     * @inner
     */
    function releaseMouse( tracker ) {
        var delegate = THIS[ tracker.hash ];
        if ( delegate.capturing ) {

            if ( $.Browser.vendor == $.BROWSERS.IE && $.Browser.version < 9 ) {
                $.removeEvent(
                    tracker.element,
                    "mousemove",
                    delegate.mousemovecapturedie,
                    true
                );
                $.removeEvent(
                    tracker.element,
                    "mouseup",
                    delegate.mouseupcapturedie,
                    true
                );
                $.addEvent(
                    tracker.element,
                    "mouseup",
                    delegate.mouseup,
                    false
                );
            } else {
                $.removeEvent(
                    window,
                    "mousemove",
                    delegate.mousemovecaptured,
                    true
                );
                $.removeEvent(
                    window,
                    "mouseup",
                    delegate.mouseupcaptured,
                    true
                );
            }
            delegate.capturing = false;
        }
    }


    /**
     * @private
     * @inner
     */
    //function triggerOthers( tracker, handler, event, isTouch ) {
    //    var otherHash;
    //    for ( otherHash in ACTIVE ) {
    //        if ( ACTIVE.hasOwnProperty( otherHash ) && tracker.hash != otherHash ) {
    //            handler( ACTIVE[ otherHash ], event, isTouch );
    //        }
    //    }
    //}


    /**
     * @private
     * @inner
     */
    function getPointerType( event ) {
        var pointerTypeStr;
        if ( $.MouseTracker.unprefixedPointerEvents ) {
            pointerTypeStr = event.pointerType;
        }
        else {
            // IE10
            //  MSPOINTER_TYPE_TOUCH: 0x00000002
            //  MSPOINTER_TYPE_PEN:   0x00000003
            //  MSPOINTER_TYPE_MOUSE: 0x00000004
            switch( event.pointerType )
            {
                case 0x00000002:
                    pointerTypeStr = 'touch';
                    break;
                case 0x00000003:
                    pointerTypeStr = 'pen';
                    break;
                case 0x00000004:
                    pointerTypeStr = 'mouse';
                    break;
                default:
                    pointerTypeStr = '';
            }
        }
        return pointerTypeStr;
    }


    /**
     * @private
     * @inner
     */
    function getMouseAbsolute( event ) {
        return $.getMousePosition( event );
    }

    /**
     * @private
     * @inner
     */
    function getMouseRelative( event, element ) {
        return getPointRelative( getMouseAbsolute( event ), element );
    }

    /**
     * @private
     * @inner
     */
    function getPointRelative( point, element ) {
        var offset = $.getElementOffset( element );
        return point.minus( offset );
    }

    /**
     * @private
     * @inner
     */
    function getCenterPoint( point1, point2 ) {
        return new $.Point( ( point1.x + point2.x ) / 2, ( point1.y + point2.y ) / 2 );
    }


//*******************************************************************************************************************************************
//** DOM EVent Handlers


    /**
     * @private
     * @inner
     */
    function onClick( tracker, event ) {
        if ( tracker.clickHandler ) {
            $.cancelEvent( event );
        }
    }


    /**
     * @private
     * @inner
     */
    function onKeyPress( tracker, event ) {
        //console.log( "keypress %s %s %s %s %s", event.keyCode, event.charCode, event.ctrlKey, event.shiftKey, event.altKey );
        var propagate;
        if ( tracker.keyHandler ) {
            event = $.getEvent( event );
            propagate = tracker.keyHandler(
                {
                    eventSource:          tracker,
                    position:             getMouseRelative( event, tracker.element ),
                    keyCode:              event.keyCode ? event.keyCode : event.charCode,
                    shift:                event.shiftKey,
                    originalEvent:        event,
                    preventDefaultAction: false,
                    userData:             tracker.userData
                }
            );
            if ( !propagate ) {
                $.cancelEvent( event );
            }
        }
    }


    /**
     * @private
     * @inner
     */
    function onFocus( tracker, event ) {
        //console.log( "focus %s", event );
        var propagate;
        if ( tracker.focusHandler ) {
            event = $.getEvent( event );
            propagate = tracker.focusHandler(
                {
                    eventSource:          tracker,
                    originalEvent:        event,
                    preventDefaultAction: false,
                    userData:             tracker.userData
                }
            );
            if ( propagate === false ) {
                $.cancelEvent( event );
            }
        }
    }


    /**
     * @private
     * @inner
     */
    function onBlur( tracker, event ) {
        //console.log( "blur %s", event );
        var propagate;
        if ( tracker.blurHandler ) {
            event = $.getEvent( event );
            propagate = tracker.blurHandler(
                {
                    eventSource:          tracker,
                    originalEvent:        event,
                    preventDefaultAction: false,
                    userData:             tracker.userData
                }
            );
            if ( propagate === false ) {
                $.cancelEvent( event );
            }
        }
    }


    /**
     * Handler for 'wheel' events
     *
     * @private
     * @inner
     */
    function onWheel( tracker, event ) {
        handleWheelEvent( tracker, event, event );
    }


    /**
     * Handler for 'mousewheel', 'DOMMouseScroll', and 'MozMousePixelScroll' events
     *
     * @private
     * @inner
     */
    function onMouseWheel( tracker, event ) {
        event = $.getEvent( event );

        // Simulate a 'wheel' event
        var simulatedEvent = {
            target:     event.target || event.srcElement,
            type:       "wheel",
            shiftKey:   event.shiftKey || false,
            clientX:    event.clientX,
            clientY:    event.clientY,
            pageX:      event.pageX ? event.pageX : event.clientX,
            pageY:      event.pageY ? event.pageY : event.clientY,
            deltaMode:  event.type == "MozMousePixelScroll" ? 0 : 1, // 0=pixel, 1=line, 2=page
            deltaX:     0,
            deltaZ:     0
        };

        // Calculate deltaY
        if ( $.MouseTracker.wheelEventName == "mousewheel" ) {
            simulatedEvent.deltaY = - 1 / $.DEFAULT_SETTINGS.pixelsPerWheelLine * event.wheelDelta;
        } else {
            simulatedEvent.deltaY = event.detail;
        }

        handleWheelEvent( tracker, simulatedEvent, event );
    }


    /**
     * @private
     * @inner
     */
    function onPointerOver( tracker, event ) {
        var time,
            point,
            pointer;

        time = $.now();
        point = getMouseAbsolute( event );

        pointer = {
            id: event.pointerId,
            type: getPointerType( event ),
            //isCaptured: false,
            //insideElementPressed: true,
            insideElement: true,
            //startPos: point,
            //startTime: time,
            //lastPos: point,
            //lastTime: time,
            currentPos: point,
            currentTime: time
        };

        updatePointersOver( tracker, event, [pointer] );
    }


    /**
     * @private
     * @inner
     */
    function onMouseOver( tracker, event ) {
        var time,
            point,
            pointer;

        event = $.getEvent(event);

        time = $.now();
        point = getMouseAbsolute( event );

        pointer = {
            id: $.MouseTracker.mousePointerId,
            type: 'mouse',
            //isCaptured: true,
            //insideElementPressed: true,
            insideElement: true,
            //startPos: point,
            //startTime: time,
            //lastPos: point,
            //lastTime: time,
            currentPos: point,
            currentTime: time
        };

        updatePointersOver( tracker, event, [pointer] );
    }


    /**
     * @private
     * @inner
     */
    function onPointerOut( tracker, event ) {
        var time,
            point,
            pointer;

        time = $.now();
        point = getMouseAbsolute( event );

        pointer = {
            id: event.pointerId,
            type: getPointerType( event ),
            //isCaptured: false,
            //insideElementPressed: true,
            insideElement: false,
            //startPos: point,
            //startTime: time,
            //lastPos: point,
            //lastTime: time,
            currentPos: point,
            currentTime: time
        };

        updatePointersOut( tracker, event, [pointer] );
    }


    /**
     * @private
     * @inner
     */
    function onMouseOut( tracker, event ) {
        var time,
            point,
            pointer;

        event = $.getEvent(event);

        var eventOrTouchPoint = event;//isTouch ? event.touches[ 0 ] : event;

        time = $.now();
        point = getMouseAbsolute( event );

        pointer = {
            id: $.MouseTracker.mousePointerId,
            type: 'mouse',
            //isCaptured: true,
            //insideElementPressed: true,
            insideElement: false,
            //startPos: point,
            //startTime: time,
            //lastPos: point,
            //lastTime: time,
            currentPos: point,
            currentTime: time
        };

        updatePointersOut( tracker, event, [pointer] );
    }


//$.MouseTracker.mousePointerId = "legacy-mouse";
//$.MouseTracker.unprefixedPointerEvents = false;
//$.MouseTracker.maxTouchPoints = 10;
//    function addPointers( tracker, event, pointers ) {
//    }
//    function updatePointersOver( tracker, event, pointers ) {
//    }
//    function updatePointersOut( tracker, event, pointers ) {
//    }
//    function updatePointers( tracker, event, pointers ) {
//    }
//    function removePointers( tracker, event, pointers ) {
//    }
//    function cancelPointers( tracker, event, pointers ) {
//    }
//pointer = {
//    id: x,            // getPointerType( event )
//    type: '',         // 'mouse', 'touch', 'pen', ''
//    isCaptured: false,
//    insideElementPressed: true,
//    insideElement: true,
//    startPos: null,   // $.Point getMouseAbsolute( eventOrTouchPoint ); getPointRelative( point, tracker.element )
//    startTime: 0xFFFFFFFF,
//    lastPos: null,    // $.Point getMouseAbsolute( eventOrTouchPoint ); getPointRelative( point, tracker.element )
//    lastTime: 0xFFFFFFFF,
//    currentPos: null, // $.Point getMouseAbsolute( eventOrTouchPoint ); getPointRelative( point, tracker.element )
//    currentTime: 0xFFFFFFFF,
//}
//var delegate = THIS[ tracker.hash ]
//delegate.mousePoints:           {},
//delegate.mousePointCount:       0,
//delegate.touchPoints:           {},
//delegate.touchPointCount:       0,
//delegate.penPoints:             {},
//delegate.penPointCount:         0
//
//var touchPoints = {};
//touchPoints[event.pointerId] = "test";
//touchPoints[12345] = "test12345";
//delete touchPoints[event.pointerId];
    /**
     * @private
     * @inner
     */
    function onPointerDown( tracker, event ) {
        var delegate = THIS[ tracker.hash ],
            time,
            point,
            pointer;

        if ( event.button == 2 ) {
            return;
        }

        if ( $.MouseTracker.unprefixedPointerEvents ) {
            event.currentTarget.setPointerCapture(event.pointerId);
        }
        else {
            event.currentTarget.msSetPointerCapture(event.pointerId);
        }

        time = $.now();
        point = getMouseAbsolute( event );

        pointer = {
            id: event.pointerId,
            type: getPointerType( event ),
            isCaptured: true,
            insideElementPressed: true,
            insideElement: true,
            startPos: point,
            startTime: time,
            lastPos: point,
            lastTime: time,
            currentPos: point,
            currentTime: time
        };

        addPointers( tracker, event, [pointer] );

        //if ( tracker.pressHandler || tracker.dragHandler || tracker.pinchHandler || tracker.swipeHandler ) {
        //    $.cancelEvent(event);
        event.stopPropagation();
        event.preventDefault();
            return false;
        //}
    }


    /**
     * @private
     * @inner
     */
    function onMouseDown( tracker, event ) {
        var delegate = THIS[ tracker.hash ],
            time,
            point,
            pointer;

        event = $.getEvent(event);

        if ( event.button == 2 ) {
            return;
        }

        time = $.now();
        point = getMouseAbsolute( event );

        pointer = {
            id: $.MouseTracker.mousePointerId,
            type: 'mouse',
            isCaptured: true,
            insideElementPressed: true,
            insideElement: true,
            startPos: point,
            startTime: time,
            lastPos: point,
            lastTime: time,
            currentPos: point,
            currentTime: time
        };

        addPointers( tracker, event, [pointer] );

        if ( tracker.pressHandler || tracker.dragHandler || tracker.pinchHandler || tracker.swipeHandler ) {
            $.cancelEvent( event );
        }

        if ( !( $.Browser.vendor == $.BROWSERS.IE && $.Browser.version < 9 ) ||
             !IS_CAPTURING ) {
            captureMouse( tracker );
            IS_CAPTURING = true;
            // reset to empty & add us
            CAPTURING = [ tracker ];
        } else if ( $.Browser.vendor == $.BROWSERS.IE && $.Browser.version < 9 ) {
            // add us to the list
            CAPTURING.push( tracker );
        }
    }


    /**
     * @private
     * @inner
     */
    function onPointerUp( tracker, event ) {
        var delegate = THIS[ tracker.hash ],
            time,
            point,
            pointer;

        if ( event.button == 2 ) {
            return;
        }

        if ( $.MouseTracker.unprefixedPointerEvents ) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        else {
            event.currentTarget.msReleasePointerCapture(event.pointerId);
        }

        time = $.now();
        point = getMouseAbsolute( event );

        pointer = {
            id: event.pointerId,
            type: getPointerType( event ),
            isCaptured: false,
            //insideElementPressed: true,
            //insideElement: true,
            //startPos: point,
            //startTime: time,
            //lastPos: point,
            //lastTime: time,
            currentPos: point,
            currentTime: time
        };

        removePointers(tracker, event, [pointer]);

        //if ( tracker.pressHandler || tracker.dragHandler || tracker.pinchHandler || tracker.swipeHandler ) {
        //    $.cancelEvent(event);
        event.stopPropagation();
        event.preventDefault();
        return false;
        //}
    }


    /**
     * @private
     * @inner
     */
    function onMouseUp( tracker, event ) {
        handleMouseUp( tracker, event );
    }


    /**
     * Only triggered in W3C browsers by elements within which the mouse was
     * initially pressed, since they are now listening to the window for
     * mouseup during the capture phase. We shouldn't handle the mouseup
     * here if the mouse is still inside this element, since the regular
     * mouseup handler will still fire.
     * @private
     * @inner
     */
    function onMouseUpCaptured( tracker, event ) {
        var delegate = THIS[ tracker.hash ],
            pointer = delegate.mousePoints[ $.MouseTracker.mousePointerId ] || null;

        if ( !pointer.insideElement ) {
            handleMouseUp( tracker, event );
        }

        releaseMouse( tracker );
    }


    /**
     * Only triggered once by the deepest element that initially received
     * the mouse down event. We want to make sure THIS event doesn't bubble.
     * Instead, we want to trigger the elements that initially received the
     * mouse down event (including this one) only if the mouse is no longer
     * inside them. Then, we want to release capture, and emulate a regular
     * mouseup on the event that this event was meant for.
     * @private
     * @inner
     */
    function onMouseUpCapturedIE( tracker, event ) {
        var othertracker,
            i;

        event = $.getEvent( event );

        if ( event.button == 2 ) {
            return;
        }

        for ( i = 0; i < CAPTURING.length; i++ ) {
            othertracker = CAPTURING[ i ];
            if ( !hasMouse( othertracker ) ) {
                handleMouseUp( othertracker, event );
            }
        }

        releaseMouse( tracker );
        IS_CAPTURING = false;
        event.srcElement.fireEvent(
            "on" + event.type,
            document.createEventObject( event )
        );

        $.stopEvent( event );
    }


    /**
     * @private
     * @inner
     */
    function onPointerMove( tracker, event ) {
        // Pointer changed coordinates, button state, pressure, tilt, or contact geometry (e.g. width and height)
        var time,
            point,
            pointer;

        time = $.now();
        point = getMouseAbsolute( event );

        pointer = {
            id: event.pointerId,
            type: getPointerType( event ),
            //isCaptured: false,
            //insideElementPressed: true,
            //insideElement: true,
            //startPos: point,
            //startTime: time,
            //lastPos: point,
            //lastTime: time,
            currentPos: point,
            currentTime: time
        };

        updatePointers(tracker, event, [pointer]);

        //if ( tracker.pressHandler || tracker.dragHandler || tracker.pinchHandler || tracker.swipeHandler ) {
        //    $.cancelEvent(event);
        event.stopPropagation();
        event.preventDefault();
        return false;
        //}
    }


    /**
     * @private
     * @inner
     */
    function onMouseMove( tracker, event ) {
        handleMouseMove( tracker, event );
    }

    
    /**
     * @private
     * @inner
     */
    function onMouseMoveCaptured( tracker, event ) {
        handleMouseMove( tracker, event );
    }


    /**
     * Only triggered once by the deepest element that initially received
     * the mouse down event. Since no other element has captured the mouse,
     * we want to trigger the elements that initially received the mouse
     * down event (including this one). The the param tracker isn't used
     * but for consistency with the other event handlers we include it.
     * @private
     * @inner
     */
    function onMouseMoveCapturedIE( tracker, event ) {
        var i;
        for ( i = 0; i < CAPTURING.length; i++ ) {
            handleMouseMove( CAPTURING[ i ], event );
        }

        $.stopEvent( event );
    }


    /**
     * @private
     * @inner
     */
    function onPointerCancel( tracker, event ) {
        var //time,
            //point,
            pointer;

        //time = $.now();
        //point = getMouseAbsolute( event );

        pointer = {
            id: event.pointerId,
            type: getPointerType( event ),
            //isCaptured: false,
            //insideElementPressed: true,
            //insideElement: true,
            //startPos: point,
            //startTime: time,
            //lastPos: point,
            //lastTime: time,
            //currentPos: point,
            //currentTime: time
        };

        cancelPointers( tracker, event, [pointer] );
    }


    /**
     * @private
     * @inner
     */
    function onTouchStart( tracker, event ) {
        var delegate = THIS[ tracker.hash ],
            time,
            point,
            pointer,
            i,
            touchCount = event.changedTouches.length,
            pointers = [];

        time = $.now();

        if ( touchCount > 0 && delegate.touchPointCount === 0 ) {
            pointer = {
                id: event.changedTouches[ 0 ].identifier,
                type: 'touch',
                //isCaptured: false,
                //insideElementPressed: true,
                insideElement: true,
                //startPos: point,
                //startTime: time,
                //lastPos: point,
                //lastTime: time,
                currentPos: getMouseAbsolute( event.changedTouches[ 0 ] ),
                currentTime: time
            };
            updatePointersOver( tracker, event, [pointer] );
        }

        for ( i = 0; i < touchCount; i++ ) {
            point = getMouseAbsolute( event.changedTouches[ i ] );

            pointers.push( {
                id: event.changedTouches[ i ].identifier,
                type: 'touch',
                isCaptured: false,
                insideElementPressed: true,
                insideElement: true,
                startPos: point,
                startTime: time,
                lastPos: point,
                lastTime: time,
                currentPos: point,
                currentTime: time
            } );
        }

        addPointers( tracker, event, pointers );

        event.stopPropagation();
        event.preventDefault();
        return false;
////****************************************************************
//        var touchA,
//            touchB;

//        if ( event.touches.length == 1 &&
//            event.targetTouches.length == 1 &&
//            event.changedTouches.length == 1 ) {

//            THIS[ tracker.hash ].lastTouch = event.touches[ 0 ];
//            handlePointerOver( tracker, event, getMouseRelative( event.changedTouches[ 0 ], tracker.element ) );
//            // call with no capture as the onMouseMoveCaptured will 
//            // be triggered by onTouchMove
//            onMouseDown( tracker, event, true, true );
//        }

//        if ( event.touches.length == 2 ) {

//            touchA = getMouseAbsolute( event.touches[ 0 ] );
//            touchB = getMouseAbsolute( event.touches[ 1 ] );
//            THIS[ tracker.hash ].lastPinchDelta =
//                Math.abs( touchA.x - touchB.x ) +
//                Math.abs( touchA.y - touchB.y );
//            THIS[ tracker.hash ].pinchMidpoint = new $.Point(
//                ( touchA.x + touchB.x ) / 2,
//                ( touchA.y + touchB.y ) / 2
//            );
//            //$.console.debug("pinch start : "+THIS[ tracker.hash ].lastPinchDelta);
//        }

//        event.preventDefault();
    }


    /**
     * @private
     * @inner
     */
    function onTouchEnd( tracker, event ) {
        var delegate = THIS[ tracker.hash ],
            time,
            point,
            pointer,
            i,
            touchCount = event.changedTouches.length,
            pointers = [];

        time = $.now();

        for ( i = 0; i < touchCount; i++ ) {
            point = getMouseAbsolute( event.changedTouches[ i ] );

            pointers.push( {
                id: event.changedTouches[ i ].identifier,
                type: 'touch',
                isCaptured: false,
                //insideElementPressed: true,
                //insideElement: true,
                //startPos: point,
                //startTime: time,
                //lastPos: point,
                //lastTime: time,
                currentPos: point,
                currentTime: time
            } );
        }

        removePointers( tracker, event, pointers );

        if ( touchCount > 0 && delegate.touchPointCount === 0 ) {
            pointer = {
                id: event.changedTouches[ 0 ].identifier,
                type: 'touch',
                //isCaptured: false,
                //insideElementPressed: true,
                insideElement: false,
                //startPos: point,
                //startTime: time,
                //lastPos: point,
                //lastTime: time,
                currentPos: getMouseAbsolute( event.changedTouches[ 0 ] ),
                currentTime: time
            };
            updatePointersOut( tracker, event, [pointer] );
        }

        event.stopPropagation();
        event.preventDefault();
        return false;
//****************************************************************************************
//        if ( event.touches.length === 0 &&
//            event.targetTouches.length === 0 &&
//            event.changedTouches.length == 1 ) {

//            THIS[ tracker.hash ].lastTouch = null;

//            // call with no release, as the mouse events are 
//            // not registered in onTouchStart
//            onMouseUpCaptured( tracker, event, true, true );
//            handlePointerOut( tracker, event, getMouseRelative( event.changedTouches[ 0 ], tracker.element ) );
//        }
//        if ( event.touches.length + event.changedTouches.length == 2 ) {
//            THIS[ tracker.hash ].lastPinchDelta = null;
//            THIS[ tracker.hash ].pinchMidpoint = null;
//            //$.console.debug("pinch end");
//        }
//        event.preventDefault();
    }


    /**
     * @private
     * @inner
     */
    function onTouchMove( tracker, event ) {
        var time,
            point,
            i,
            touchCount = event.changedTouches.length,
            pointers = [];

        time = $.now();

        for ( i = 0; i < touchCount; i++ ) {
            point = getMouseAbsolute( event.changedTouches[ i ] );

            pointers.push( {
                id: event.changedTouches[ i ].identifier,
                type: 'touch',
                //isCaptured: false,
                //insideElementPressed: true,
                //insideElement: true,
                //startPos: point,
                //startTime: time,
                //lastPos: point,
                //lastTime: time,
                currentPos: point,
                currentTime: time
            } );
        }

        updatePointers( tracker, event, pointers );

        event.stopPropagation();
        event.preventDefault();
        return false;
//*******************************************************************************
//        var touchA,
//            touchB,
//            pinchDelta;

//        if ( !THIS[ tracker.hash ].lastTouch ) {
//            return;
//        }

//        if ( event.touches.length === 1 &&
//            event.targetTouches.length === 1 &&
//            event.changedTouches.length === 1 &&
//            THIS[ tracker.hash ].lastTouch.identifier === event.touches[ 0 ].identifier ) {

//            onMouseMoveCaptured( tracker, event, true );

//        } else if ( event.touches.length === 2 ) {

//            touchA = getMouseAbsolute( event.touches[ 0 ] );
//            touchB = getMouseAbsolute( event.touches[ 1 ] );
//            pinchDelta =
//                Math.abs( touchA.x - touchB.x ) +
//                Math.abs( touchA.y - touchB.y );

//                ////TODO: make the 75px pinch threshold configurable
//                //if ( Math.abs( THIS[ tracker.hash ].lastPinchDelta - pinchDelta ) > 75 ) {
//                //    //$.console.debug( "pinch delta : " + pinchDelta + " | previous : " + THIS[ tracker.hash ].lastPinchDelta);

//                //    // Simulate a 'wheel' event
//                //    var simulatedEvent = {
//                //        target:     event.target || event.srcElement,
//                //        type:       "wheel",
//                //        shiftKey:   event.shiftKey || false,
//                //        clientX:    THIS[ tracker.hash ].pinchMidpoint.x,
//                //        clientY:    THIS[ tracker.hash ].pinchMidpoint.y,
//                //        pageX:      THIS[ tracker.hash ].pinchMidpoint.x,
//                //        pageY:      THIS[ tracker.hash ].pinchMidpoint.y,
//                //        deltaMode:  1, // 0=pixel, 1=line, 2=page
//                //        deltaX:     0,
//                //        deltaY:     ( THIS[ tracker.hash ].lastPinchDelta > pinchDelta ) ? 1 : -1,
//                //        deltaZ:     0
//                //    };

//                //    handleWheelEvent( tracker, simulatedEvent, event, true );

//                //    THIS[ tracker.hash ].lastPinchDelta = pinchDelta;
//                //}
//        }
//        event.preventDefault();
    }


    /**
     * @private
     * @inner
     */
    function onGestureStart( tracker, event ) {
        event.stopPropagation();
        event.preventDefault();
        return false;
    }


    /**
     * @private
     * @inner
     */
    function onGestureChange( tracker, event ) {
        event.stopPropagation();
        event.preventDefault();
        return false;
    }


//*******************************************************************************************************************************************
//** Event Processing Functions


    /**
     * Handles 'wheel' events. 
     * The event may be simulated by the legacy mouse wheel event handler (onMouseWheel()).
     *
     * @private
     * @inner
     */
    function handleWheelEvent( tracker, event, originalEvent ) {
        var nDelta = 0,
            propagate;

        // The nDelta variable is gated to provide smooth z-index scrolling
        //   since the mouse wheel allows for substantial deltas meant for rapid
        //   y-index scrolling.
        // event.deltaMode: 0=pixel, 1=line, 2=page
        // TODO: Deltas in pixel mode should be accumulated then a scroll value computed after $.DEFAULT_SETTINGS.pixelsPerWheelLine threshold reached
        nDelta = event.deltaY < 0 ? 1 : -1;

        if ( tracker.scrollHandler ) {
            propagate = tracker.scrollHandler(
                {
                    eventSource:          tracker,
                    position:             getMouseRelative( event, tracker.element ),
                    scroll:               nDelta,
                    shift:                event.shiftKey,
                    isTouchEvent:         false,
                    originalEvent:        originalEvent,
                    preventDefaultAction: false,
                    userData:             tracker.userData
                }
            );
            if ( propagate === false ) {
                $.cancelEvent( originalEvent );
            }
        }
    }


    /**
     * @private
     * @inner
     */
    function handleMouseMove( tracker, event ) {
        var time,
            point,
            pointer;

        event = $.getEvent(event);

        time = $.now();
        point = getMouseAbsolute( event );

        pointer = {
            id: $.MouseTracker.mousePointerId,
            type: 'mouse',
            //isCaptured: false,
            //insideElementPressed: true,
            //insideElement: true,
            //startPos: point,
            //startTime: time,
            //lastPos: point,
            //lastTime: time,
            currentPos: point,
            currentTime: time
        };

        updatePointers( tracker, event, [pointer] );
    }


    /**
     * @private
     * @inner
     */
    function handleMouseUp( tracker, event ) {
        var time,
            point,
            pointer;

        event = $.getEvent(event);

        if ( event.button == 2 ) {
            return;
        }

        time = $.now();
        point = getMouseAbsolute( event );

        pointer = {
            id: $.MouseTracker.mousePointerId,
            type: 'mouse',
            isCaptured: false,
            //insideElementPressed: true,
            //insideElement: true,
            //startPos: point,
            //startTime: time,
            //lastPos: point,
            //lastTime: time,
            currentPos: point,
            currentTime: time
        };

        removePointers( tracker, event, [pointer] );
    }


    /**
     * @private
     * @inner
     */
    function handlePointerStop( tracker, originalMoveEvent ) {
        if ( tracker.stopHandler ) {
            tracker.stopHandler( {
                eventSource:          tracker,
                position:             getMouseRelative( originalMoveEvent, tracker.element ),
                isTouchEvent:         false,
                originalEvent:        originalMoveEvent,
                preventDefaultAction: false,
                userData:             tracker.userData
            } );
        }
    }


//$.MouseTracker.mousePointerId = "legacy-mouse";
//$.MouseTracker.unprefixedPointerEvents = false;
//$.MouseTracker.maxTouchPoints = 10;
//    function addPointers( tracker, event, pointers ) {
//    }
//    function updatePointersOver( tracker, event, pointers ) {
//    }
//    function updatePointersOut( tracker, event, pointers ) {
//    }
//    function updatePointers( tracker, event, pointers ) {
//    }
//    function removePointers( tracker, event, pointers ) {
//    }
//    function cancelPointers( tracker, event, pointers ) {
//    }
//pointer = {
//    id: x,            // getPointerType( event )
//    type: '',         // 'mouse', 'touch', 'pen', ''
//    isCaptured: false,
//    insideElementPressed: true,
//    insideElement: true,
//    startPos: null,   // $.Point getMouseAbsolute( eventOrTouchPoint ); getPointRelative( point, tracker.element )
//    startTime: 0xFFFFFFFF,
//    lastPos: null,    // $.Point getMouseAbsolute( eventOrTouchPoint ); getPointRelative( point, tracker.element )
//    lastTime: 0xFFFFFFFF,
//    currentPos: null, // $.Point getMouseAbsolute( eventOrTouchPoint ); getPointRelative( point, tracker.element )
//    currentTime: 0xFFFFFFFF,
//}
//var delegate = THIS[ tracker.hash ]
//delegate.mousePoints:           {},
//delegate.mousePointCount:       0,
//delegate.touchPoints:           {},
//delegate.touchPointCount:       0,
//delegate.penPoints:             {},
//delegate.penPointCount:         0
//
//var touchPoints = {};
//touchPoints[event.pointerId] = "test";
//touchPoints[12345] = "test12345";
//delete touchPoints[event.pointerId];

    /**
     * @private
     * @inner
     */
    function addPointers( tracker, event, pointers ) {
        var delegate = THIS[ tracker.hash ],
            propagate,
            dispatchPress = false,
            i,
            pointerCount = pointers.length,
            curPointer;

        for ( i = 0; i < pointerCount; i++ ) {
            curPointer = pointers[ i ];
            if ( curPointer.type === 'mouse' ) {
                if ( !delegate.mousePointCount ) {
                    delegate.mousePoints[ curPointer.id ] = curPointer;
                    delegate.mousePointCount++;
                    dispatchPress = true;
                }
            }
            else if ( curPointer.type === 'touch' ) {
                if ( !delegate.touchPointCount ) {
                    dispatchPress = true;
                }
                if ( !delegate.touchPoints[ curPointer.id ] ) {
                    delegate.touchPoints[ curPointer.id ] = curPointer;
                    delegate.touchPointCount++;
                    if ( delegate.touchPointCount == 2 && tracker.pinchHandler ) {
                        // Initialize for pinch gesture tracking
                        delegate.pinchGesturePoints = [];
                        for ( var p in delegate.touchPoints ) {
                            delegate.pinchGesturePoints.push( delegate.touchPoints[ p ] );
                        }
                        delegate.lastPinchDist = delegate.currentPinchDist = delegate.pinchGesturePoints[0].currentPos.distanceTo( delegate.pinchGesturePoints[1].currentPos );
                        delegate.lastPinchCenter = delegate.currentPinchCenter = getCenterPoint( delegate.pinchGesturePoints[0].currentPos, delegate.pinchGesturePoints[1].currentPos );
                    }
                }
            }
            else if ( curPointer.type === 'pen' ) {
                if ( !delegate.penPointCount ) {
                    delegate.penPoints[ curPointer.id ] = curPointer;
                    delegate.penPointCount++;
                    dispatchPress = true;
                }
            }

            if ( dispatchPress && tracker.pressHandler ) {
                propagate = tracker.pressHandler(
                    {
                        eventSource:          tracker,
                        position:             getPointRelative( curPointer.startPos, tracker.element ),
                        isTouchEvent:         curPointer.type === 'touch',
                        originalEvent:        event,
                        preventDefaultAction: false,
                        userData:             tracker.userData
                    }
                );
                if ( propagate === false ) {
                    $.cancelEvent( event );
                }
            }
        }
    }


    /**
     * @private
     * @inner
     */
    function updatePointersOver( tracker, event, pointers ) {
        var delegate = THIS[ tracker.hash ],
            i,
            pointerCount = pointers.length,
            curPointer,
            updatePointer,
            insideElementPressed,
            propagate;

        for ( i = 0; i < pointerCount; i++ ) {
            curPointer = pointers[ i ];
            if ( curPointer.type === 'mouse' ) {
                updatePointer = delegate.mousePoints[ curPointer.id ] || null;
            }
            else if ( curPointer.type === 'touch' ) {
                updatePointer = delegate.touchPoints[ curPointer.id ] || null;
            }
            else if ( curPointer.type === 'pen' ) {
                updatePointer = delegate.penPoints[ curPointer.id ] || null;
            }
            else {
                updatePointer = null;
            }

            if ( updatePointer ) {
                updatePointer.insideElement = true;
                updatePointer.lastPos = updatePointer.currentPos;
                updatePointer.lastTime = updatePointer.currentTime;
                updatePointer.currentPos = curPointer.currentPos;
                updatePointer.currentTime = curPointer.currentTime;
                insideElementPressed = updatePointer.insideElementPressed;
            }
            else {
                insideElementPressed = false;
            }

            if ( tracker.enterHandler ) {
                propagate = tracker.enterHandler(
                    {
                        eventSource:          tracker,
                        position:             getPointRelative( curPointer.currentPos, tracker.element ),
                        insideElementPressed: insideElementPressed,
                        buttonDownAny:        IS_BUTTON_DOWN,
                        isTouchEvent:         curPointer.type === 'touch',
                        originalEvent:        event,
                        preventDefaultAction: false,
                        userData:             tracker.userData
                    }
                );
                if ( propagate === false ) {
                    $.cancelEvent( event );
                }
            }
        }
    }


    /**
     * @private
     * @inner
     */
    function updatePointersOut( tracker, event, pointers ) {
        var delegate = THIS[ tracker.hash ],
            i,
            pointerCount = pointers.length,
            curPointer,
            updatePointer,
            insideElementPressed,
            propagate;

        for ( i = 0; i < pointerCount; i++ ) {
            curPointer = pointers[ i ];
            if ( curPointer.type === 'mouse' ) {
                updatePointer = delegate.mousePoints[ curPointer.id ] || null;
            }
            else if ( curPointer.type === 'touch' ) {
                updatePointer = delegate.touchPoints[ curPointer.id ] || null;
            }
            else if ( curPointer.type === 'pen' ) {
                updatePointer = delegate.penPoints[ curPointer.id ] || null;
            }
            else {
                updatePointer = null;
            }

            if ( updatePointer ) {
                updatePointer.insideElement = false;
                updatePointer.lastPos = updatePointer.currentPos;
                updatePointer.lastTime = updatePointer.currentTime;
                updatePointer.currentPos = curPointer.currentPos;
                updatePointer.currentTime = curPointer.currentTime;
                insideElementPressed = updatePointer.insideElementPressed;
            }
            else {
                insideElementPressed = false;
            }

            if ( tracker.exitHandler ) {
                propagate = tracker.exitHandler(
                    {
                        eventSource:          tracker,
                        position:             getPointRelative( curPointer.currentPos, tracker.element ),
                        insideElementPressed: insideElementPressed,
                        buttonDownAny:        IS_BUTTON_DOWN,
                        isTouchEvent:         curPointer.type === 'touch',
                        originalEvent:        event,
                        preventDefaultAction: false,
                        userData:             tracker.userData
                    }
                );

                if ( propagate === false ) {
                    $.cancelEvent( event );
                }
            }
        }
    }


    /**
     * @private
     * @inner
     */
    function updatePointers( tracker, event, pointers ) {
        // Pointer(s) changed coordinates, button state, pressure, tilt, or contact geometry (e.g. width and height)
        var delegate = THIS[ tracker.hash ],
            i,
            pointerCount = pointers.length,
            curPointer,
            updatePointer,
            points,
            pointCount,
            delta,
            propagate;

        if ( pointers[ 0 ].type === 'mouse' ) {
            points = delegate.mousePoints;
            pointCount = delegate.mousePointCount;
        }
        else if ( pointers[ 0 ].type === 'touch' ) {
            points = delegate.touchPoints;
            pointCount = delegate.touchPointCount;
        }
        else if ( pointers[ 0 ].type === 'pen' ) {
            points = delegate.penPoints;
            pointCount = delegate.penPointCount;
        }
        else {
            points = null;
        }

        for ( i = 0; i < pointerCount; i++ ) {
            curPointer = pointers[ i ];
            updatePointer = points ? ( points[ curPointer.id ] || null ) : null;

            if ( updatePointer ) {
                updatePointer.lastPos = updatePointer.currentPos;
                updatePointer.lastTime = updatePointer.currentTime;
                updatePointer.currentPos = curPointer.currentPos;
                updatePointer.currentTime = curPointer.currentTime;

                // Drag Gesture
                if ( pointCount == 1 && tracker.dragHandler &&  !updatePointer.currentPos.equals( updatePointer.lastPos ) ) {
                    delta = updatePointer.currentPos.minus( updatePointer.lastPos );
                    propagate = tracker.dragHandler(
                        {
                            eventSource:          tracker,
                            position:             getPointRelative( updatePointer.currentPos, tracker.element ),
                            delta:                delta,
                            shift:                event.shiftKey,
                            isTouchEvent:         curPointer.type === 'touch',
                            originalEvent:        event,
                            preventDefaultAction: false,
                            userData:             tracker.userData
                        }
                    );
                    if ( propagate === false ) {
                        $.cancelEvent( event );
                    }
                }
            }

            if ( pointCount == 1 && tracker.moveHandler ) {
                propagate = tracker.moveHandler(
                    {
                        eventSource:          tracker,
                        position:             getPointRelative( curPointer.currentPos, tracker.element ),
                        isTouchEvent:         curPointer.type === 'touch',
                        originalEvent:        event,
                        preventDefaultAction: false,
                        userData:             tracker.userData
                    }
                );
                if ( propagate === false ) {
                    $.cancelEvent( event );
                }
            }
            //if ( tracker.stopHandler ) {
            //    clearTimeout( tracker.stopTimeOut );
            //    tracker.stopTimeOut = setTimeout( function() {
            //        handlePointerStop( tracker, event );
            //    }, tracker.stopDelay );
            //}
        }

        // Pinch Gesture
        if ( pointers[ 0 ].type === 'touch' && delegate.touchPointCount == 2 && tracker.pinchHandler ) {
            //gesturePoints = [];
            //for ( var p in delegate.touchPoints ) {
            //    gesturePoints.push( delegate.touchPoints[ p ] );
            //}
            delta = delegate.pinchGesturePoints[0].currentPos.distanceTo( delegate.pinchGesturePoints[1].currentPos );
            if ( delta != delegate.currentPinchDist ) {
                delegate.lastPinchDist = delegate.currentPinchDist;
                delegate.currentPinchDist = delta;
                delegate.lastPinchCenter = delegate.currentPinchCenter;
                delegate.currentPinchCenter = getCenterPoint( delegate.pinchGesturePoints[0].currentPos, delegate.pinchGesturePoints[1].currentPos );
                propagate = tracker.pinchHandler(
                    {
                        eventSource:          tracker,
                        gesturePoints:        delegate.pinchGesturePoints,
                        lastCenter:           getPointRelative( delegate.lastPinchCenter, tracker.element ),
                        center:               getPointRelative( delegate.currentPinchCenter, tracker.element ),
                        lastDistance:         delegate.lastPinchDist,
                        currentDistance:      delegate.currentPinchDist,
                        originalEvent:        event,
                        preventDefaultAction: false,
                        userData:             tracker.userData
                    }
                );
                if ( propagate === false ) {
                    $.cancelEvent( event );
                }
            }
        }
    }


    /**
     * @private
     * @inner
     */
    function removePointers( tracker, event, pointers ) {
        var delegate = THIS[ tracker.hash ],
            propagate,
            //were we inside the tracked element when we were pressed
            insideElementPressed,
            //are we still inside the tracked element when we released
            insideElementReleased,
            dispatchRelease,
            pressPoint,
            pressTime,
            releasePoint,
            i,
            pointerCount = pointers.length,
            curPointer,
            updatePointer;

        for ( i = 0; i < pointerCount; i++ ) {
            curPointer = pointers[ i ];
            dispatchRelease = false;
            if ( curPointer.type === 'mouse' ) {
                updatePointer = delegate.mousePoints[ curPointer.id ] || null;
                if ( updatePointer ) {
                    pressPoint = updatePointer.startPos;
                    pressTime = updatePointer.startTime;
                    delete delegate.mousePoints[ curPointer.id ];
                    delegate.mousePointCount--;
                    if ( !delegate.mousePointCount ) {
                        dispatchRelease = true;
                        releasePoint = curPointer.currentPos;
                    }
                }
            }
            else if ( curPointer.type === 'touch' ) {
                updatePointer = delegate.touchPoints[ curPointer.id ] || null;
                if ( updatePointer ) {
                    pressPoint = updatePointer.startPos;
                    pressTime = updatePointer.startTime;
                    delete delegate.touchPoints[ curPointer.id ];
                    delegate.touchPointCount--;
                    if ( !delegate.touchPointCount ) {
                        dispatchRelease = true;
                        releasePoint = curPointer.currentPos;
                    }
                }
            }
            else if ( curPointer.type === 'pen' ) {
                updatePointer = delegate.penPoints[ curPointer.id ] || null;
                if ( updatePointer ) {
                    pressPoint = updatePointer.startPos;
                    pressTime = updatePointer.startTime;
                    delete delegate.penPoints[ curPointer.id ];
                    delegate.penPointCount--;
                    if ( !delegate.penPointCount ) {
                        dispatchRelease = true;
                        releasePoint = curPointer.currentPos;
                    }
                }
            }
            else {
                updatePointer = null;
            }

            if ( dispatchRelease ) {
                if ( updatePointer ) {
                    insideElementPressed = updatePointer.insideElementPressed;
                    insideElementReleased = $.pointInElement( tracker.element, releasePoint );
                }
                else {
                    insideElementPressed = false;
                    insideElementReleased = false;
                }

                if ( tracker.releaseHandler ) {
                    propagate = tracker.releaseHandler(
                        {
                            eventSource:           tracker,
                            position:              getPointRelative( releasePoint, tracker.element ),
                            insideElementPressed:  insideElementPressed,
                            insideElementReleased: insideElementReleased,
                            isTouchEvent:          curPointer.type === 'touch',
                            originalEvent:         event,
                            preventDefaultAction:  false,
                            userData:              tracker.userData
                        }
                    );
                    if ( propagate === false ) {
                        $.cancelEvent( event );
                    }
                }

                // Click Gesture
                if ( insideElementPressed && insideElementReleased && tracker.clickHandler ) {
                    var time = curPointer.currentTime - pressTime,
                        distance = pressPoint.distanceTo( curPointer.currentPos ),
                        quick = time <= tracker.clickTimeThreshold &&
                                   distance <= tracker.clickDistThreshold;

                    propagate = tracker.clickHandler(
                        {
                            eventSource:          tracker,
                            position:             getPointRelative( curPointer.currentPos, tracker.element ),
                            quick:                quick,
                            shift:                event.shiftKey,
                            isTouchEvent:         curPointer.type === 'touch',
                            originalEvent:        event,
                            preventDefaultAction: false,
                            userData:             tracker.userData
                        }
                    );
                    if ( propagate === false ) {
                        $.cancelEvent( event );
                    }
                }
            }
        }
    }


    /**
     * @private
     * @inner
     */
    function cancelPointers( tracker, event, pointers ) {
        var delegate = THIS[ tracker.hash ],
            i,
            pointerCount = pointers.length,
            curPointer;

        for ( i = 0; i < pointerCount; i++ ) {
            curPointer = pointers[ i ];
            if ( curPointer.type === 'mouse' ) {
                if ( delegate.mousePoints[ curPointer.id ] ) {
                    delete delegate.mousePoints[ curPointer.id ];
                    delegate.mousePointCount--;
                }
            }
            else if ( curPointer.type === 'touch' ) {
                if ( delegate.touchPoints[ curPointer.id ] ) {
                    delete delegate.touchPoints[ curPointer.id ];
                    delegate.touchPointCount--;
                }
            }
            else if ( curPointer.type === 'pen' ) {
                if ( delegate.penPoints[ curPointer.id ] ) {
                    delete delegate.penPoints[ curPointer.id ];
                    delegate.penPointCount--;
                }
            }
        }
    }


//*******************************************************************************************************************************************
//*******************************************************************************************************************************************


    //function handlePointerOver( tracker, event, position ) {
    //    var delegate = THIS[ tracker.hash ],
    //        propagate;

    //    //if ( !isTouch ) {
    //    //    if ( $.Browser.vendor == $.BROWSERS.IE &&
    //    //            $.Browser.version < 9 &&
    //    //            delegate.capturing &&
    //    //            !isChild( event.srcElement, tracker.element ) ) {

    //    //        triggerOthers( tracker, onMouseOver, event, isTouch );
    //    //    }

    //    //    var to = event.target ?
    //    //            event.target :
    //    //            event.srcElement,
    //    //        from = event.relatedTarget ?
    //    //            event.relatedTarget :
    //    //            event.fromElement;

    //    //    if ( !isChild( tracker.element, to ) ||
    //    //            isChild( tracker.element, from ) ) {
    //    //        return;
    //    //    }
    //    //}

    //    //delegate.insideElement = true;

    //    if ( tracker.enterHandler ) {
    //        propagate = tracker.enterHandler(
    //            {
    //                eventSource:          tracker,
    //                position:             position,
    //                insideElementPressed: delegate.insideElementPressed,
    //                buttonDownAny:        IS_BUTTON_DOWN,
    //                isTouchEvent:         false,//isTouch,
    //                originalEvent:        event,
    //                preventDefaultAction: false,
    //                userData:             tracker.userData
    //            }
    //        );
    //        if ( propagate === false ) {
    //            $.cancelEvent( event );
    //        }
    //    }
    //}


    //function handlePointerOut( tracker, event, position ) {
    //    var delegate = THIS[ tracker.hash ],
    //        propagate;

    //    //if ( !isTouch ) {
    //    //    if ( $.Browser.vendor == $.BROWSERS.IE &&
    //    //            $.Browser.version < 9 &&
    //    //            delegate.capturing &&
    //    //            !isChild( event.srcElement, tracker.element ) ) {

    //    //        triggerOthers( tracker, onMouseOut, event, isTouch );

    //    //    }

    //    //    var from = event.target ?
    //    //            event.target :
    //    //            event.srcElement,
    //    //        to = event.relatedTarget ?
    //    //            event.relatedTarget :
    //    //            event.toElement;

    //    //    if ( !isChild( tracker.element, from ) ||
    //    //            isChild( tracker.element, to ) ) {
    //    //        return;
    //    //    }
    //    //}

    //    //delegate.insideElement = false;

    //    if ( tracker.exitHandler ) {
    //        propagate = tracker.exitHandler(
    //            {
    //                eventSource:          tracker,
    //                position:             position,
    //                insideElementPressed: delegate.insideElementPressed,
    //                buttonDownAny:        IS_BUTTON_DOWN,
    //                isTouchEvent:         false,//isTouch,
    //                originalEvent:        event,
    //                preventDefaultAction: false,
    //                userData:             tracker.userData
    //            }
    //        );

    //        if ( propagate === false ) {
    //            $.cancelEvent( event );
    //        }
    //    }
    //}


    ///**
    //    * @private
    //    * @inner
    //    */
    //function handlePointerMove( tracker, event ) {
    //    var propagate;
    //    if ( tracker.moveHandler ) {
    //        propagate = tracker.moveHandler(
    //            {
    //                eventSource:          tracker,
    //                position:             getMouseRelative( event, tracker.element ),
    //                isTouchEvent:         false,
    //                originalEvent:        event,
    //                preventDefaultAction: false,
    //                userData:             tracker.userData
    //            }
    //        );
    //        if ( propagate === false ) {
    //            $.cancelEvent( event );
    //        }
    //    }
    //    if ( tracker.stopHandler ) {
    //        clearTimeout( tracker.stopTimeOut );
    //        tracker.stopTimeOut = setTimeout( function() {
    //            handlePointerStop( tracker, event );
    //        }, tracker.stopDelay );
    //    }
    //}

    //    
    ///**
    //    * @private
    //    * @inner
    //    */
    //function handleMouseClick( tracker, event, isTouch ) {
    //    var delegate = THIS[ tracker.hash ],
    //        propagate;

    //    isTouch = isTouch || false;

    //    event = $.getEvent( event );

    //    var eventOrTouchPoint = isTouch ? event.changedTouches[ 0 ] : event;

    //    if ( event.button == 2 ) {
    //        return;
    //    }

    //    var time = $.now() - delegate.lastMouseDownTime,
    //        point = getMouseAbsolute( eventOrTouchPoint ),
    //        distance = delegate.lastMouseDownPoint.distanceTo( point ),
    //        quick = time <= tracker.clickTimeThreshold &&
    //                    distance <= tracker.clickDistThreshold;

    //    if ( tracker.clickHandler ) {
    //        propagate = tracker.clickHandler(
    //            {
    //                eventSource:          tracker,
    //                position:             getMouseRelative( eventOrTouchPoint, tracker.element ),
    //                quick:                quick,
    //                shift:                event.shiftKey,
    //                isTouchEvent:         isTouch,
    //                originalEvent:        event,
    //                preventDefaultAction: false,
    //                userData:             tracker.userData
    //            }
    //        );
    //        if ( propagate === false ) {
    //            $.cancelEvent( event );
    //        }
    //    }
    //}


    /**
     * @private
     * @inner
     * Returns true if elementB is a child node of elementA, or if they're equal.
     */
    function isChild( elementA, elementB ) {
        var body = document.body;
        while ( elementB && elementA != elementB && body != elementB ) {
            try {
                elementB = elementB.parentNode;
            } catch ( e ) {
                return false;
            }
        }
        return elementA == elementB;
    }

    /**
     * @private
     * @inner
     */
    function onGlobalMouseDown() {
        IS_BUTTON_DOWN = true;
    }

    /**
     * @private
     * @inner
     */
    function onGlobalMouseUp() {
        IS_BUTTON_DOWN = false;
    }


    (function () {
        if ( $.Browser.vendor == $.BROWSERS.IE && $.Browser.version < 9 ) {
            $.addEvent( document, "mousedown", onGlobalMouseDown, false );
            $.addEvent( document, "mouseup", onGlobalMouseUp, false );
        } else {
            $.addEvent( window, "mousedown", onGlobalMouseDown, true );
            $.addEvent( window, "mouseup", onGlobalMouseUp, true );
        }
    } )();

} ( OpenSeadragon ) );
