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

        // dictionary from hash to private properties
    var THIS           = {};


    /**
     * @class MouseTracker
     * @classdesc Provides simplified handling of common pointer device (mouse, touch, pen, etc.) gestures
     *            and keyboard events on a specified element.
     * @memberof OpenSeadragon
     * @param {Object} options
     *      Allows configurable properties to be entirely specified by passing
     *      an options object to the constructor.  The constructor also supports
     *      the original positional arguments 'element', 'clickTimeThreshold',
     *      and 'clickDistThreshold' in that order.
     * @param {Element|String} options.element
     *      A reference to an element or an element id for which the pointer/key
     *      events will be monitored.
     * @param {Number} options.clickTimeThreshold
     *      The number of milliseconds within which a pointer down-up event combination
     *      will be treated as a click gesture.
     * @param {Number} options.clickDistThreshold
     *      The maximum distance allowed between a pointer down event and a pointer up event
     *      to be treated as a click gesture.
     * @param {Number} options.dblClickTimeThreshold
     *      The number of milliseconds within which two pointer down-up event combinations
     *      will be treated as a double-click gesture.
     * @param {Number} options.dblClickDistThreshold
     *      The maximum distance allowed between two pointer click events
     *      to be treated as a click gesture.
     * @param {Number} [options.stopDelay=50]
     *      The number of milliseconds without pointer move before the stop
     *      event is fired.
     * @param {OpenSeadragon.EventHandler} [options.enterHandler=null]
     *      An optional handler for pointer enter.
     * @param {OpenSeadragon.EventHandler} [options.exitHandler=null]
     *      An optional handler for pointer exit.
     * @param {OpenSeadragon.EventHandler} [options.pressHandler=null]
     *      An optional handler for pointer press.
     * @param {OpenSeadragon.EventHandler} [options.releaseHandler=null]
     *      An optional handler for pointer release.
     * @param {OpenSeadragon.EventHandler} [options.moveHandler=null]
     *      An optional handler for pointer move.
     * @param {OpenSeadragon.EventHandler} [options.scrollHandler=null]
     *      An optional handler for mouse wheel scroll.
     * @param {OpenSeadragon.EventHandler} [options.clickHandler=null]
     *      An optional handler for pointer click.
     * @param {OpenSeadragon.EventHandler} [options.dblClickHandler=null]
     *      An optional handler for pointer double-click.
     * @param {OpenSeadragon.EventHandler} [options.dragHandler=null]
     *      An optional handler for the drag gesture.
     * @param {OpenSeadragon.EventHandler} [options.dragEndHandler=null]
     *      An optional handler for after a drag gesture.
     * @param {OpenSeadragon.EventHandler} [options.pinchHandler=null]
     *      An optional handler for the pinch gesture.
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
         * The element for which pointer events are being monitored.
         * @member {Element} element
         * @memberof OpenSeadragon.MouseTracker#
         */
        this.element            = $.getElement( options.element );
        /**
         * The number of milliseconds within which a pointer down-up event combination 
         * will be treated as a click gesture.
         * @member {Number} clickTimeThreshold
         * @memberof OpenSeadragon.MouseTracker#
         */
        this.clickTimeThreshold = options.clickTimeThreshold;
        /**
         * The maximum distance allowed between a pointer down event and a pointer up event
         * to be treated as a click gesture.
         * @member {Number} clickDistThreshold
         * @memberof OpenSeadragon.MouseTracker#
         */
        this.clickDistThreshold = options.clickDistThreshold;
        /**
         * The number of milliseconds within which two pointer down-up event combinations
         * will be treated as a double-click gesture.
         * @member {Number} dblClickTimeThreshold
         * @memberof OpenSeadragon.MouseTracker#
         */
        this.dblClickTimeThreshold = options.dblClickTimeThreshold;
        /**
         * The maximum distance allowed between two pointer click events
         * to be treated as a click gesture.
         * @member {Number} clickDistThreshold
         * @memberof OpenSeadragon.MouseTracker#
         */
        this.dblClickDistThreshold = options.dblClickDistThreshold;
        this.userData           = options.userData        || null;
        this.stopDelay          = options.stopDelay       || 50;

        this.enterHandler       = options.enterHandler    || null;
        this.exitHandler        = options.exitHandler     || null;
        this.pressHandler       = options.pressHandler    || null;
        this.releaseHandler     = options.releaseHandler  || null;
        this.moveHandler        = options.moveHandler     || null;
        this.scrollHandler      = options.scrollHandler   || null;
        this.clickHandler       = options.clickHandler    || null;
        this.dblClickHandler    = options.dblClickHandler || null;
        this.dragHandler        = options.dragHandler     || null;
        this.dragEndHandler     = options.dragEndHandler  || null;
        this.pinchHandler       = options.pinchHandler    || null;
        this.stopHandler        = options.stopHandler     || null;
        this.keyHandler         = options.keyHandler      || null;
        this.focusHandler       = options.focusHandler    || null;
        this.blurHandler        = options.blurHandler     || null;

        //Store private properties in a scope sealed hash map
        var _this = this;

        /**
         * @private
         * @property {Boolean} tracking
         *      Are we currently tracking pointer events for this element.
         * @property {Boolean} capturing
         *      Are we curruently capturing mouse events (legacy mouse events only).
         */
        THIS[ this.hash ] = {
            click:                 function ( event ) { onClick( _this, event ); },
            dblclick:              function ( event ) { onDblClick( _this, event ); },
            keypress:              function ( event ) { onKeyPress( _this, event ); },
            focus:                 function ( event ) { onFocus( _this, event ); },
            blur:                  function ( event ) { onBlur( _this, event ); },

            wheel:                 function ( event ) { onWheel( _this, event ); },
            mousewheel:            function ( event ) { onMouseWheel( _this, event ); },
            DOMMouseScroll:        function ( event ) { onMouseWheel( _this, event ); },
            MozMousePixelScroll:   function ( event ) { onMouseWheel( _this, event ); },

            mouseover:             function ( event ) { onMouseOver( _this, event ); },
            mouseout:              function ( event ) { onMouseOut( _this, event ); },
            mouseenter:            function ( event ) { onMouseEnter( _this, event ); },
            mouseleave:            function ( event ) { onMouseLeave( _this, event ); },
            mousedown:             function ( event ) { onMouseDown( _this, event ); },
            mouseup:               function ( event ) { onMouseUp( _this, event ); },
            mouseupcaptured:       function ( event ) { onMouseUpCaptured( _this, event ); },
            mousemove:             function ( event ) { onMouseMove( _this, event ); },
            mousemovecaptured:     function ( event ) { onMouseMoveCaptured( _this, event ); },

            touchenter:            function ( event ) { onTouchEnter( _this, event ); },
            touchleave:            function ( event ) { onTouchLeave( _this, event ); },
            touchstart:            function ( event ) { onTouchStart( _this, event ); },
            touchend:              function ( event ) { onTouchEnd( _this, event ); },
            touchmove:             function ( event ) { onTouchMove( _this, event ); },
            touchcancel:           function ( event ) { onTouchCancel( _this, event ); },

            gesturestart:          function ( event ) { onGestureStart( _this, event ); },
            gesturechange:         function ( event ) { onGestureChange( _this, event ); },

            pointerenter:          function ( event ) { onPointerEnter( _this, event ); },
            MSPointerEnter:        function ( event ) { onPointerEnter( _this, event ); },
            pointerleave:          function ( event ) { onPointerLeave( _this, event ); },
            MSPointerLeave:        function ( event ) { onPointerLeave( _this, event ); },
            pointerdown:           function ( event ) { onPointerDown( _this, event ); },
            MSPointerDown:         function ( event ) { onPointerDown( _this, event ); },
            pointerup:             function ( event ) { onPointerUp( _this, event ); },
            MSPointerUp:           function ( event ) { onPointerUp( _this, event ); },
            pointermove:           function ( event ) { onPointerMove( _this, event ); },
            MSPointerMove:         function ( event ) { onPointerMove( _this, event ); },
            pointercancel:         function ( event ) { onPointerCancel( _this, event ); },
            MSPointerCancel:       function ( event ) { onPointerCancel( _this, event ); },

            tracking:              false,

            // Active pointers lists. Array of GesturePointList objects, one for each pointer device type.
            // GesturePointList objects are added each time a pointer is tracked by a new pointer device type (see getActivePointersListByType()).
            // Active pointers are any pointer being tracked for this element which are in the hit-test area 
            //     of the element (for hover-capable devices) and/or have contact or a button press initiated in the element.
            activePointersLists:   [],

            // Legacy mouse event tracking
            capturing:             false,

            // Tracking for double-click gesture
            lastClickPos:          null,
            dblClickTimeOut:       null,

            // Tracking for pinch gesture
            pinchGPoints:          [],
            lastPinchDist:         0,
            currentPinchDist:      0,
            lastPinchCenter:       null,
            currentPinchCenter:    null
        };

    };

    $.MouseTracker.prototype = /** @lends OpenSeadragon.MouseTracker.prototype */{

        /**
         * Clean up any events or objects created by the tracker.
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
         * Returns the {@link OpenSeadragon.MouseTracker.GesturePointList|GesturePointList} for the given pointer device type,
         * creating and caching a new {@link OpenSeadragon.MouseTracker.GesturePointList|GesturePointList} if one doesn't already exist for the type.
         * @function
         * @param {String} type - The pointer device type: "mouse", "touch", "pen", etc.
         * @returns {OpenSeadragon.MouseTracker.GesturePointList}
         */
        getActivePointersListByType: function ( type ) {
            var delegate = THIS[ this.hash ],
                i,
                len = delegate.activePointersLists.length,
                list;

            for ( i = 0; i < len; i++ ) {
                if ( delegate.activePointersLists[ i ].type === type ) {
                    return delegate.activePointersLists[ i ];
                }
            }

            list = new $.MouseTracker.GesturePointList( type );
            delegate.activePointersLists.push( list );
            return list;
        },

        /**
         * Implement or assign implementation to these handlers during or after
         * calling the constructor.
         * @function
         * @param {Object} event
         * @param {OpenSeadragon.MouseTracker} event.eventSource
         *      A reference to the tracker instance.
         * @param {String} event.pointerType
         *     "mouse", "touch", "pen", etc.
         * @param {OpenSeadragon.Point} event.position
         *      The position of the event relative to the tracked element.
         * @param {Number} event.buttons
         *      Current buttons pressed.
         *      Combination of bit flags 0: none, 1: primary (or touch contact), 2: secondary, 4: aux (often middle), 8: X1 (often back), 16: X2 (often forward), 32: pen eraser.
         * @param {Boolean} event.insideElementPressed
         *      True if the left mouse button is currently being pressed and was
         *      initiated inside the tracked element, otherwise false.
         * @param {Boolean} event.buttonDownAny
         *      Was the button down anywhere in the screen during the event. <span style="color:red;">Deprecated. Use buttons instead.</span>
         * @param {Boolean} event.isTouchEvent
         *      True if the original event is a touch event, otherwise false. <span style="color:red;">Deprecated. Use pointerType and/or originalEvent instead.</span>
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
         * @param {String} event.pointerType
         *     "mouse", "touch", "pen", etc.
         * @param {OpenSeadragon.Point} event.position
         *      The position of the event relative to the tracked element.
         * @param {Number} event.buttons
         *      Current buttons pressed.
         *      Combination of bit flags 0: none, 1: primary (or touch contact), 2: secondary, 4: aux (often middle), 8: X1 (often back), 16: X2 (often forward), 32: pen eraser.
         * @param {Boolean} event.insideElementPressed
         *      True if the left mouse button is currently being pressed and was
         *      initiated inside the tracked element, otherwise false.
         * @param {Boolean} event.buttonDownAny
         *      Was the button down anywhere in the screen during the event. <span style="color:red;">Deprecated. Use buttons instead.</span>
         * @param {Boolean} event.isTouchEvent
         *      True if the original event is a touch event, otherwise false. <span style="color:red;">Deprecated. Use pointerType and/or originalEvent instead.</span>
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
         * @param {String} event.pointerType
         *     "mouse", "touch", "pen", etc.
         * @param {OpenSeadragon.Point} event.position
         *      The position of the event relative to the tracked element.
         * @param {Number} event.buttons
         *      Current buttons pressed.
         *      Combination of bit flags 0: none, 1: primary (or touch contact), 2: secondary, 4: aux (often middle), 8: X1 (often back), 16: X2 (often forward), 32: pen eraser.
         * @param {Boolean} event.isTouchEvent
         *      True if the original event is a touch event, otherwise false. <span style="color:red;">Deprecated. Use pointerType and/or originalEvent instead.</span>
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
         * @param {String} event.pointerType
         *     "mouse", "touch", "pen", etc.
         * @param {OpenSeadragon.Point} event.position
         *      The position of the event relative to the tracked element.
         * @param {Number} event.buttons
         *      Current buttons pressed.
         *      Combination of bit flags 0: none, 1: primary (or touch contact), 2: secondary, 4: aux (often middle), 8: X1 (often back), 16: X2 (often forward), 32: pen eraser.
         * @param {Boolean} event.insideElementPressed
         *      True if the left mouse button is currently being pressed and was
         *      initiated inside the tracked element, otherwise false.
         * @param {Boolean} event.insideElementReleased
         *      True if the cursor inside the tracked element when the button was released.
         * @param {Boolean} event.isTouchEvent
         *      True if the original event is a touch event, otherwise false. <span style="color:red;">Deprecated. Use pointerType and/or originalEvent instead.</span>
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
         * @param {String} event.pointerType
         *     "mouse", "touch", "pen", etc.
         * @param {OpenSeadragon.Point} event.position
         *      The position of the event relative to the tracked element.
         * @param {Number} event.buttons
         *      Current buttons pressed.
         *      Combination of bit flags 0: none, 1: primary (or touch contact), 2: secondary, 4: aux (often middle), 8: X1 (often back), 16: X2 (often forward), 32: pen eraser.
         * @param {Boolean} event.isTouchEvent
         *      True if the original event is a touch event, otherwise false. <span style="color:red;">Deprecated. Use pointerType and/or originalEvent instead.</span>
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
         * @param {String} event.pointerType
         *     "mouse", "touch", "pen", etc.
         * @param {OpenSeadragon.Point} event.position
         *      The position of the event relative to the tracked element.
         * @param {Number} event.scroll
         *      The scroll delta for the event.
         * @param {Boolean} event.shift
         *      True if the shift key was pressed during this event.
         * @param {Boolean} event.isTouchEvent
         *      True if the original event is a touch event, otherwise false. <span style="color:red;">Deprecated. Use pointerType and/or originalEvent instead. Touch devices no longer generate scroll event.</span>
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
         * @param {String} event.pointerType
         *     "mouse", "touch", "pen", etc.
         * @param {OpenSeadragon.Point} event.position
         *      The position of the event relative to the tracked element.
         * @param {Boolean} event.quick
         *      True only if the clickDistThreshold and clickTimeThreshold are both passed. Useful for ignoring drag events.
         * @param {Boolean} event.shift
         *      True if the shift key was pressed during this event.
         * @param {Boolean} event.isTouchEvent
         *      True if the original event is a touch event, otherwise false. <span style="color:red;">Deprecated. Use pointerType and/or originalEvent instead.</span>
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
         * @param {String} event.pointerType
         *     "mouse", "touch", "pen", etc.
         * @param {OpenSeadragon.Point} event.position
         *      The position of the event relative to the tracked element.
         * @param {Boolean} event.shift
         *      True if the shift key was pressed during this event.
         * @param {Boolean} event.isTouchEvent
         *      True if the original event is a touch event, otherwise false. <span style="color:red;">Deprecated. Use pointerType and/or originalEvent instead.</span>
         * @param {Object} event.originalEvent
         *      The original event object.
         * @param {Boolean} event.preventDefaultAction
         *      Set to true to prevent the tracker subscriber from performing its default action (subscriber implementation dependent). Default: false.
         * @param {Object} event.userData
         *      Arbitrary user-defined object.
         */
        dblClickHandler: function () { },

        /**
         * Implement or assign implementation to these handlers during or after
         * calling the constructor.
         * @function
         * @param {Object} event
         * @param {OpenSeadragon.MouseTracker} event.eventSource
         *      A reference to the tracker instance.
         * @param {String} event.pointerType
         *     "mouse", "touch", "pen", etc.
         * @param {OpenSeadragon.Point} event.position
         *      The position of the event relative to the tracked element.
         * @param {Number} event.buttons
         *      Current buttons pressed.
         *      Combination of bit flags 0: none, 1: primary (or touch contact), 2: secondary, 4: aux (often middle), 8: X1 (often back), 16: X2 (often forward), 32: pen eraser.
         * @param {OpenSeadragon.Point} event.delta
         *      The x,y components of the difference between the current position and the last drag event position.  Useful for ignoring or weighting the events.
         * @param {Number} event.speed
         *     Current computed speed, in pixels per second.
         * @param {Number} event.direction
         *     Current computed direction, expressed as an angle counterclockwise relative to the positive X axis (-pi to pi, in radians). Only valid if speed > 0.
         * @param {Boolean} event.shift
         *      True if the shift key was pressed during this event.
         * @param {Boolean} event.isTouchEvent
         *      True if the original event is a touch event, otherwise false. <span style="color:red;">Deprecated. Use pointerType and/or originalEvent instead.</span>
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
         * @param {String} event.pointerType
         *     "mouse", "touch", "pen", etc.
         * @param {OpenSeadragon.Point} event.position
         *      The position of the event relative to the tracked element.
         * @param {Number} event.speed
         *     Speed at the end of a drag gesture, in pixels per second.
         * @param {Number} event.direction
         *     Direction at the end of a drag gesture, expressed as an angle counterclockwise relative to the positive X axis (-pi to pi, in radians). Only valid if speed > 0.
         * @param {Boolean} event.shift
         *      True if the shift key was pressed during this event.
         * @param {Boolean} event.isTouchEvent
         *      True if the original event is a touch event, otherwise false. <span style="color:red;">Deprecated. Use pointerType and/or originalEvent instead.</span>
         * @param {Object} event.originalEvent
         *      The original event object.
         * @param {Boolean} event.preventDefaultAction
         *      Set to true to prevent the tracker subscriber from performing its default action (subscriber implementation dependent). Default: false.
         * @param {Object} event.userData
         *      Arbitrary user-defined object.
         */
        dragEndHandler: function () { },

        /**
         * Implement or assign implementation to these handlers during or after
         * calling the constructor.
         * @function
         * @param {Object} event
         * @param {OpenSeadragon.MouseTracker} event.eventSource
         *      A reference to the tracker instance.
         * @param {String} event.pointerType
         *     "mouse", "touch", "pen", etc.
         * @param {Array.<OpenSeadragon.MouseTracker.GesturePoint>} event.gesturePoints
         *      Gesture points associated with the gesture. Velocity data can be found here.
         * @param {OpenSeadragon.Point} event.lastCenter
         *      The previous center point of the two pinch contact points relative to the tracked element.
         * @param {OpenSeadragon.Point} event.center
         *      The center point of the two pinch contact points relative to the tracked element.
         * @param {Number} event.lastDistance
         *      The previous distance between the two pinch contact points in CSS pixels.
         * @param {Number} event.distance
         *      The distance between the two pinch contact points in CSS pixels.
         * @param {Boolean} event.shift
         *      True if the shift key was pressed during this event.
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
         * @param {String} event.pointerType
         *     "mouse", "touch", "pen", etc.
         * @param {OpenSeadragon.Point} event.position
         *      The position of the event relative to the tracked element.
         * @param {Number} event.buttons
         *      Current buttons pressed.
         *      Combination of bit flags 0: none, 1: primary (or touch contact), 2: secondary, 4: aux (often middle), 8: X1 (often back), 16: X2 (often forward), 32: pen eraser.
         * @param {Boolean} event.isTouchEvent
         *      True if the original event is a touch event, otherwise false. <span style="color:red;">Deprecated. Use pointerType and/or originalEvent instead.</span>
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
     * Provides continuous computation of velocity (speed and direction) of active pointers.
     * This is a singleton, used by all MouseTracker instances, as it is unlikely there will ever be more than
     * two active gesture pointers at a time.
     *
     * @private
     * @member gesturePointVelocityTracker
     * @memberof OpenSeadragon.MouseTracker
     */
    $.MouseTracker.gesturePointVelocityTracker = (function () {
        var trackerPoints = [],
            intervalId = 0,
            lastTime = 0;

        // Generates a unique identifier for a tracked gesture point
        var _generateGuid = function ( tracker, gPoint ) {
            return tracker.hash.toString() + gPoint.type + gPoint.id.toString();
        };

        // Interval timer callback. Computes velocity for all tracked gesture points.
        var _doTracking = function () {
            var i,
                len = trackerPoints.length,
                trackPoint,
                gPoint,
                now = $.now(),
                elapsedTime,
                distance,
                speed;

            elapsedTime = now - lastTime;
            lastTime = now;

            for ( i = 0; i < len; i++ ) {
                trackPoint = trackerPoints[ i ];
                gPoint = trackPoint.gPoint;
                // Math.atan2 gives us just what we need for a velocity vector, as we can simply
                //   use cos()/sin() to extract the x/y velocity components.
                gPoint.direction = Math.atan2( gPoint.currentPos.y - trackPoint.lastPos.y, gPoint.currentPos.x - trackPoint.lastPos.x );
                // speed = distance / elapsed time
                distance = trackPoint.lastPos.distanceTo( gPoint.currentPos );
                trackPoint.lastPos = gPoint.currentPos;
                speed = 1000 * distance / ( elapsedTime + 1 );
                // Simple biased average, favors the most recent speed computation. Smooths out erratic gestures a bit.
                gPoint.speed = 0.75 * speed + 0.25 * gPoint.speed;
            }
        };

        // Public. Add a gesture point to be tracked
        var addPoint = function ( tracker, gPoint ) {
            var guid = _generateGuid( tracker, gPoint );

            trackerPoints.push(
                {
                    guid: guid,
                    gPoint: gPoint,
                    lastPos: gPoint.currentPos
                } );

            // Only fire up the interval timer when there's gesture pointers to track
            if ( trackerPoints.length === 1 ) {
                lastTime = $.now();
                intervalId = window.setInterval( _doTracking, 50 );
            }
        };

        // Public. Stop tracking a gesture point
        var removePoint = function ( tracker, gPoint ) {
            var guid = _generateGuid( tracker, gPoint ),
                i,
                len = trackerPoints.length;
            for ( i = 0; i < len; i++ ) {
                if ( trackerPoints[ i ].guid === guid ) {
                    trackerPoints.splice( i, 1 );
                    // Only run the interval timer if theres gesture pointers to track
                    len--;
                    if ( len === 0 ) {
                        window.clearInterval( intervalId );
                    }
                    break;
                }
            }
        };

        return {
            addPoint:    addPoint,
            removePoint: removePoint
        };
    } )();


///////////////////////////////////////////////////////////////////////////////
// Pointer event model and feature detection
///////////////////////////////////////////////////////////////////////////////

    /**
     * Detect available mouse wheel event name.
     */
    $.MouseTracker.wheelEventName = ( $.Browser.vendor == $.BROWSERS.IE && $.Browser.version > 8 ) ||
                                                ( 'onwheel' in document.createElement( 'div' ) ) ? 'wheel' : // Modern browsers support 'wheel'
                                    document.onmousewheel !== undefined ? 'mousewheel' :                     // Webkit and IE support at least 'mousewheel'
                                    'DOMMouseScroll';                                                        // Assume old Firefox

    /**
     * Detect legacy mouse capture support.
     */
    $.MouseTracker.supportsMouseCapture = (function () {
        var divElement = document.createElement( 'div' );
        return $.isFunction( divElement.setCapture ) && $.isFunction( divElement.releaseCapture );
    }());

    /**
     * Detect browser pointer device event model(s) and build appropriate list of events to subscribe to.
     */
    $.MouseTracker.subscribeEvents = [ "click", "dblclick", "keypress", "focus", "blur", $.MouseTracker.wheelEventName ];

    if( $.MouseTracker.wheelEventName == "DOMMouseScroll" ) {
        // Older Firefox
        $.MouseTracker.subscribeEvents.push( "MozMousePixelScroll" );
    }

    if ( window.PointerEvent ) {
        // IE11 and other W3C Pointer Event implementations (see http://www.w3.org/TR/pointerevents)
        $.MouseTracker.subscribeEvents.push( "pointerenter", "pointerleave", "pointerdown", "pointerup", "pointermove", "pointercancel" );
        $.MouseTracker.unprefixedPointerEvents = true;
        if( navigator.maxTouchPoints ) {
            $.MouseTracker.maxTouchPoints = navigator.maxTouchPoints;
        } else {
            $.MouseTracker.maxTouchPoints = 0;
        }
        $.MouseTracker.haveTouchEnter = true;
        $.MouseTracker.haveMouseEnter = true;
    } else if ( window.MSPointerEvent ) {
        // IE10
        $.MouseTracker.subscribeEvents.push( "MSPointerEnter", "MSPointerLeave", "MSPointerDown", "MSPointerUp", "MSPointerMove", "MSPointerCancel" );
        $.MouseTracker.unprefixedPointerEvents = false;
        if( navigator.msMaxTouchPoints ) {
            $.MouseTracker.maxTouchPoints = navigator.msMaxTouchPoints;
        } else {
            $.MouseTracker.maxTouchPoints = 0;
        }
        $.MouseTracker.haveTouchEnter = true;
        $.MouseTracker.haveMouseEnter = true;
    } else {
        // Legacy W3C mouse events
        // TODO: Favor mouseenter/mouseleave over mouseover/mouseout when Webkit browser support is better
        $.MouseTracker.subscribeEvents.push( "mouseover", "mouseout", "mousedown", "mouseup", "mousemove" );
        $.MouseTracker.haveMouseEnter = false;
        if ( 'ontouchstart' in window ) {
            // iOS, Android, and other W3c Touch Event implementations (see http://www.w3.org/TR/2011/WD-touch-events-20110505)
            $.MouseTracker.subscribeEvents.push( "touchstart", "touchend", "touchmove", "touchcancel" );
            if ( 'ontouchenter' in window ) {
                $.MouseTracker.subscribeEvents.push( "touchenter", "touchleave" );
                $.MouseTracker.haveTouchEnter = true;
            } else {
                $.MouseTracker.haveTouchEnter = false;
            }
        } else {
            $.MouseTracker.haveTouchEnter = false;
        }
        if ( 'ongesturestart' in window ) {
            // iOS (see https://developer.apple.com/library/safari/documentation/UserExperience/Reference/GestureEventClassReference/GestureEvent/GestureEvent.html)
            //   Subscribe to these to prevent default gesture handling
            $.MouseTracker.subscribeEvents.push( "gesturestart", "gesturechange" );
        }
        $.MouseTracker.mousePointerId = "legacy-mouse";
        $.MouseTracker.maxTouchPoints = 10;
    }
    

///////////////////////////////////////////////////////////////////////////////
// Classes and typedefs
///////////////////////////////////////////////////////////////////////////////

    /**
     * Represents a point of contact on the screen made by a mouse cursor, pen, touch, or other pointer device.
     *
     * @typedef {Object} GesturePoint
     * @memberof OpenSeadragon.MouseTracker
     *
     * @property {Number} id
     *     Identifier unique from all other active GesturePoints for a given pointer device.
     * @property {String} type
     *     The pointer device type: "mouse", "touch", "pen", etc.
     * @property {Boolean} captured
     *     True if events for the gesture point are captured to the tracked element.
     * @property {Boolean} isPrimary
     *     True if the gesture point is a master pointer amongst the set of active pointers for each pointer type. True for mouse and primary (first) touch/pen pointers.
     * @property {Boolean} insideElementPressed
     *     True if button pressed or contact point initiated inside the screen area of the tracked element.
     * @property {Boolean} insideElement
     *     True if pointer or contact point is currently inside the bounds of the tracked element.
     * @property {Number} speed
     *     Current computed speed, in pixels per second.
     * @property {Number} direction
     *     Current computed direction, expressed as an angle counterclockwise relative to the positive X axis (-pi to pi, in radians). Only valid if speed > 0.
     * @property {OpenSeadragon.Point} contactPos
     *     The initial pointer contact position, relative to the page including any scrolling. Only valid if the pointer has contact (pressed, touch contact, pen contact).
     * @property {Number} contactTime
     *     The initial pointer contact time, in milliseconds. Only valid if the pointer has contact (pressed, touch contact, pen contact).
     * @property {OpenSeadragon.Point} lastPos
     *     The last pointer position, relative to the page including any scrolling.
     * @property {Number} lastTime
     *     The last pointer contact time, in milliseconds.
     * @property {OpenSeadragon.Point} currentPos
     *     The current pointer position, relative to the page including any scrolling.
     * @property {Number} currentTime
     *     The current pointer contact time, in milliseconds.
     */


    /**
     * @class GesturePointList
     * @classdesc Provides an abstraction for a set of active {@link OpenSeadragon.MouseTracker.GesturePoint|GesturePoint} objects for a given pointer device type.
     *            Active pointers are any pointer being tracked for this element which are in the hit-test area 
     *            of the element (for hover-capable devices) and/or have contact or a button press initiated in the element.
     * @memberof OpenSeadragon.MouseTracker
     * @param {String} type - The pointer device type: "mouse", "touch", "pen", etc.
     */
    $.MouseTracker.GesturePointList = function ( type ) {
        this._gPoints = [];
        /**
         * The pointer device type: "mouse", "touch", "pen", etc.
         * @member {String} type
         * @memberof OpenSeadragon.MouseTracker.GesturePointList#
         */
        this.type = type;
        /**
         * Current buttons pressed for the device.
         * Combination of bit flags 0: none, 1: primary (or touch contact), 2: secondary, 4: aux (often middle), 8: X1 (often back), 16: X2 (often forward), 32: pen eraser.
         * @member {Number} buttons
         * @memberof OpenSeadragon.MouseTracker.GesturePointList#
         */
        this.buttons = 0;
        /**
         * Current number of contact points (touch points, mouse down, etc.) for the device.
         * @member {Number} contacts
         * @memberof OpenSeadragon.MouseTracker.GesturePointList#
         */
        this.contacts = 0;
        /**
         * Current number of clicks for the device. Used for multiple click gesture tracking.
         * @member {Number} clicks
         * @memberof OpenSeadragon.MouseTracker.GesturePointList#
         */
        this.clicks = 0;
    };
    $.MouseTracker.GesturePointList.prototype = /** @lends OpenSeadragon.MouseTracker.GesturePointList.prototype */{
        /**
         * @function
         * @returns {Number} Number of gesture points in the list.
         */
        getLength: function () {
            return this._gPoints.length;
        },
        /**
         * @function
         * @returns {Array.<OpenSeadragon.MouseTracker.GesturePoint>} The list of gesture points in the list as an array (read-only).
         */
        asArray: function () {
            return this._gPoints;
        },
        /**
         * @function
         * @param {OpenSeadragon.MouseTracker.GesturePoint} gesturePoint - A gesture point to add to the list.
         * @returns {Number} Number of gesture points in the list.
         */
        add: function ( gp ) {
            return this._gPoints.push( gp );
        },
        /**
         * @function
         * @param {Number} id - The id of the gesture point to remove from the list.
         * @returns {Number} Number of gesture points in the list.
         */
        removeById: function ( id ) {
            var i,
                len = this._gPoints.length;
            for ( i = 0; i < len; i++ ) {
                if ( this._gPoints[ i ].id === id ) {
                    this._gPoints.splice( i, 1 );
                    break;
                }
            }
            return this._gPoints.length;
        },
        /**
         * @function
         * @param {Number} index - The index of the gesture point to retrieve from the list.
         * @returns {OpenSeadragon.MouseTracker.GesturePoint|null} The gesture point at the given index, or null if not found.
         */
        getByIndex: function ( index ) {
            if ( index < this._gPoints.length) {
                return this._gPoints[ index ];
            }

            return null;
        },
        /**
         * @function
         * @param {Number} id - The id of the gesture point to retrieve from the list.
         * @returns {OpenSeadragon.MouseTracker.GesturePoint|null} The gesture point with the given id, or null if not found.
         */
        getById: function ( id ) {
            var i,
                len = this._gPoints.length;
            for ( i = 0; i < len; i++ ) {
                if ( this._gPoints[ i ].id === id ) {
                    return this._gPoints[ i ];
                }
            }
            return null;
        },
        /**
         * @function
         * @returns {OpenSeadragon.MouseTracker.GesturePoint|null} The primary gesture point in the list, or null if not found.
         */
        getPrimary: function ( id ) {
            var i,
                len = this._gPoints.length;
            for ( i = 0; i < len; i++ ) {
                if ( this._gPoints[ i ].isPrimary ) {
                    return this._gPoints[ i ];
                }
            }
            return null;
        }
    };
    

///////////////////////////////////////////////////////////////////////////////
// Utility functions
///////////////////////////////////////////////////////////////////////////////

    /**
     * Starts tracking pointer events on the tracked element.
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
        }
    }

    /**
     * Stops tracking pointer events on the tracked element.
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
        }
    }

    /**
     * Begin capturing mouse events to the tracked element (legacy mouse events only).
     * @private
     * @inner
     */
    function captureMouse( tracker ) {
        var delegate = THIS[ tracker.hash ];

        if ( !delegate.capturing ) {
            if ( $.MouseTracker.supportsMouseCapture ) {
                // IE<10, Firefox, other browsers with setCapture()/releaseCapture()
                tracker.element.setCapture( true );
            } else {
                // For browsers without setCapture()/releaseCapture(), we emulate mouse capture by hanging listeners on the window object.
                //    (Note we listen on the capture phase so the captured handlers will get called first)
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
     * Stop capturing mouse events to the tracked element (legacy mouse events only).
     * @private
     * @inner
     */
    function releaseMouse( tracker ) {
        var delegate = THIS[ tracker.hash ];

        if ( delegate.capturing ) {
            if ( $.MouseTracker.supportsMouseCapture ) {
                // IE<10, Firefox, other browsers with setCapture()/releaseCapture()
                tracker.element.releaseCapture();
            } else {
                // For browsers without setCapture()/releaseCapture(), we emulate mouse capture by hanging listeners on the window object.
                //    (Note we listen on the capture phase so the captured handlers will get called first)
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
     * Gets a W3C Pointer Events model compatible pointer type string from a DOM pointer event.
     * IE10 used a long integer value, but the W3C specification (and IE11+) use a string "mouse", "touch", "pen", etc.
     * @private
     * @inner
     */
    function getPointerType( event ) {
        var pointerTypeStr;
        if ( $.MouseTracker.unprefixedPointerEvents ) {
            pointerTypeStr = event.pointerType;
        } else {
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
        return getPointRelativeToAbsolute( getMouseAbsolute( event ), element );
    }

    /**
     * @private
     * @inner
     */
    function getPointRelativeToAbsolute( point, element ) {
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


///////////////////////////////////////////////////////////////////////////////
// Device-specific DOM event handlers
///////////////////////////////////////////////////////////////////////////////

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
    function onDblClick( tracker, event ) {
        if ( tracker.dblClickHandler ) {
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
                    pointerType:          'mouse',
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
    function isParentChild( parent, child )
    {
       if ( parent === child ) {
           return false;
       }
       while ( child && child !== parent ) {
           child = child.parentNode;
       }
       return child === parent;
    }


    /**
     * @private
     * @inner
     */
    function onMouseOver( tracker, event ) {
        var gPoint;

        event = $.getEvent( event );

        if ( this === event.relatedTarget || isParentChild( this, event.relatedTarget ) ) {
            return;
        }

        gPoint = {
            id: $.MouseTracker.mousePointerId,
            type: 'mouse',
            isPrimary: true,
            currentPos: getMouseAbsolute( event ),
            currentTime: $.now()
        };

        updatePointersEnter( tracker, event, [ gPoint ] );
    }


    /**
     * @private
     * @inner
     */
    function onMouseOut( tracker, event ) {
        var gPoint;

        event = $.getEvent( event );

        if ( this === event.relatedTarget || isParentChild( this, event.relatedTarget ) ) {
            return;
        }

        gPoint = {
            id: $.MouseTracker.mousePointerId,
            type: 'mouse',
            isPrimary: true,
            currentPos: getMouseAbsolute( event ),
            currentTime: $.now()
        };

        updatePointersExit( tracker, event, [ gPoint ] );
    }


    /**
     * @private
     * @inner
     */
    function onMouseEnter( tracker, event ) {
        var gPoint;

        event = $.getEvent( event );

        gPoint = {
            id: $.MouseTracker.mousePointerId,
            type: 'mouse',
            isPrimary: true,
            currentPos: getMouseAbsolute( event ),
            currentTime: $.now()
        };

        updatePointersEnter( tracker, event, [ gPoint ] );
    }


    /**
     * @private
     * @inner
     */
    function onMouseLeave( tracker, event ) {
        var gPoint;

        event = $.getEvent( event );

        gPoint = {
            id: $.MouseTracker.mousePointerId,
            type: 'mouse',
            isPrimary: true,
            currentPos: getMouseAbsolute( event ),
            currentTime: $.now()
        };

        updatePointersExit( tracker, event, [ gPoint ] );
    }


    /**
     * @private
     * @inner
     */
    function onMouseDown( tracker, event ) {
        var gPoint;

        event = $.getEvent( event );

        gPoint = {
            id: $.MouseTracker.mousePointerId,
            type: 'mouse',
            isPrimary: true,
            currentPos: getMouseAbsolute( event ),
            currentTime: $.now()
        };

        if ( updatePointersDown( tracker, event, [ gPoint ], event.button ) ) {
            $.stopEvent( event );
            captureMouse( tracker );
        }

        if ( tracker.clickHandler || tracker.dblClickHandler || tracker.pressHandler || tracker.dragHandler || tracker.dragEndHandler ) {
            $.cancelEvent( event );
        }
    }


    /**
     * @private
     * @inner
     */
    function onMouseUp( tracker, event ) {
        handleMouseUp( tracker, event );
    }

    /**
     * This handler is attached to the window object (on the capture phase) to emulate mouse capture.
     * Only triggered in W3C browsers that don't have setCapture/releaseCapture 
     * methods or don't support the new pointer events model.
     * onMouseUp is still attached to the tracked element, so stop propagation to avoid processing twice.
     *
     * @private
     * @inner
     */
    function onMouseUpCaptured( tracker, event ) {
        handleMouseUp( tracker, event );
        $.stopEvent( event );
    }


    /**
     * @private
     * @inner
     */
    function handleMouseUp( tracker, event ) {
        var gPoint;

        event = $.getEvent( event );

        gPoint = {
            id: $.MouseTracker.mousePointerId,
            type: 'mouse',
            isPrimary: true,
            currentPos: getMouseAbsolute( event ),
            currentTime: $.now()
        };

        if ( updatePointersUp( tracker, event, [ gPoint ], event.button ) ) {
            releaseMouse( tracker );
        }
    }


    /**
     * @private
     * @inner
     */
    function onMouseMove( tracker, event ) {
        handleMouseMove( tracker, event );
   }

    
    /**
     * This handler is attached to the window object (on the capture phase) to emulate mouse capture.
     * Only triggered in W3C browsers that don't have setCapture/releaseCapture 
     * methods or don't support the new pointer events model.
     * onMouseMove is still attached to the tracked element, so stop propagation to avoid processing twice.
     *
     * @private
     * @inner
     */
    function onMouseMoveCaptured( tracker, event ) {
        handleMouseMove( tracker, event );
        $.stopEvent( event );
    }


    /**
     * @private
     * @inner
     */
    function handleMouseMove( tracker, event ) {
        var gPoint;

        event = $.getEvent( event );

        gPoint = {
            id: $.MouseTracker.mousePointerId,
            type: 'mouse',
            isPrimary: true,
            currentPos: getMouseAbsolute( event ),
            currentTime: $.now()
        };

        updatePointersMove( tracker, event, [ gPoint ] );
    }


    /**
     * @private
     * @inner
     */
    function onTouchEnter( tracker, event ) {
        var i,
            touchCount = event.changedTouches.length,
            gPoints = [];

        for ( i = 0; i < touchCount; i++ ) {
            gPoints.push( {
                id: event.changedTouches[ i ].identifier,
                type: 'touch',
                // isPrimary not set - let the updatePointers functions determine it
                currentPos: getMouseAbsolute( event.changedTouches[ i ] ),
                currentTime: $.now()
            } );
        }

        updatePointersEnter( tracker, event, gPoints );
    }


    /**
     * @private
     * @inner
     */
    function onTouchLeave( tracker, event ) {
        var i,
            touchCount = event.changedTouches.length,
            gPoints = [];

        for ( i = 0; i < touchCount; i++ ) {
            gPoints.push( {
                id: event.changedTouches[ i ].identifier,
                type: 'touch',
                // isPrimary not set - let the updatePointers functions determine it
                currentPos: getMouseAbsolute( event.changedTouches[ i ] ),
                currentTime: $.now()
            } );
        }

        updatePointersExit( tracker, event, gPoints );
    }


    /**
     * @private
     * @inner
     */
    function onTouchStart( tracker, event ) {
        var time,
            i,
            touchCount = event.changedTouches.length,
            gPoints = [];

        time = $.now();

        for ( i = 0; i < touchCount; i++ ) {
            gPoints.push( {
                id: event.changedTouches[ i ].identifier,
                type: 'touch',
                // isPrimary not set - let the updatePointers functions determine it
                currentPos: getMouseAbsolute( event.changedTouches[ i ] ),
                currentTime: time
            } );
        }

        // simulate touchenter if not natively available
        if ( !$.MouseTracker.haveTouchEnter ) {
            updatePointersEnter( tracker, event, gPoints );
        }

        if ( updatePointersDown( tracker, event, gPoints, 0 ) ) { // 0 means primary button press/release or touch contact
            // Touch event model start, end, and move events are always captured so we don't need to capture explicitly
        }

        $.cancelEvent( event );
    }


    /**
     * @private
     * @inner
     */
    function onTouchEnd( tracker, event ) {
        var time,
            i,
            touchCount = event.changedTouches.length,
            gPoints = [];

        time = $.now();

        for ( i = 0; i < touchCount; i++ ) {
            gPoints.push( {
                id: event.changedTouches[ i ].identifier,
                type: 'touch',
                // isPrimary not set - let the updatePointers functions determine it
                currentPos: getMouseAbsolute( event.changedTouches[ i ] ),
                currentTime: time
            } );
        }

        // Touch event model start, end, and move events are always captured so we don't need to release capture.
        // We'll ignore the should-release-capture return value here
        updatePointersUp( tracker, event, gPoints, 0 ); // 0 means primary button press/release or touch contact

        // simulate touchleave if not natively available
        if ( !$.MouseTracker.haveTouchEnter && touchCount > 0 ) {
            updatePointersExit( tracker, event, gPoints );
        }

        $.cancelEvent( event );
    }


    /**
     * @private
     * @inner
     */
    function onTouchMove( tracker, event ) {
        var i,
            touchCount = event.changedTouches.length,
            gPoints = [];

        for ( i = 0; i < touchCount; i++ ) {
            gPoints.push( {
                id: event.changedTouches[ i ].identifier,
                type: 'touch',
                // isPrimary not set - let the updatePointers functions determine it
                currentPos: getMouseAbsolute( event.changedTouches[ i ] ),
                currentTime: $.now()
            } );
        }

        updatePointersMove( tracker, event, gPoints );

        $.cancelEvent( event );
    }


    /**
     * @private
     * @inner
     */
    function onTouchCancel( tracker, event ) {
        var i,
            touchCount = event.changedTouches.length,
            gPoints = [];
        
        for ( i = 0; i < touchCount; i++ ) {
            gPoints.push( {
                id: event.changedTouches[ i ].identifier,
                type: 'touch',
            } );
        }

        updatePointersCancel( tracker, event, gPoints );
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


    /**
     * @private
     * @inner
     */
    function onPointerEnter( tracker, event ) {
        var gPoint;

        gPoint = {
            id: event.pointerId,
            type: getPointerType( event ),
            isPrimary: event.isPrimary,
            currentPos: getMouseAbsolute( event ),
            currentTime: $.now()
        };

        updatePointersEnter( tracker, event, [ gPoint ] );
    }


    /**
     * @private
     * @inner
     */
    function onPointerLeave( tracker, event ) {
        var gPoint;

        gPoint = {
            id: event.pointerId,
            type: getPointerType( event ),
            isPrimary: event.isPrimary,
            currentPos: getMouseAbsolute( event ),
            currentTime: $.now()
        };

        updatePointersExit( tracker, event, [ gPoint ] );
    }


    /**
     * @private
     * @inner
     */
    function onPointerDown( tracker, event ) {
        var gPoint;

        gPoint = {
            id: event.pointerId,
            type: getPointerType( event ),
            isPrimary: event.isPrimary,
            currentPos: getMouseAbsolute( event ),
            currentTime: $.now()
        };

        if ( updatePointersDown( tracker, event, [ gPoint ], event.button ) ) {
            if ( $.MouseTracker.unprefixedPointerEvents ) {
                event.currentTarget.setPointerCapture( event.pointerId );
            } else {
                event.currentTarget.msSetPointerCapture( event.pointerId );
            }
            $.stopEvent( event );
        }

        if ( tracker.clickHandler || tracker.dblClickHandler || tracker.pressHandler || tracker.dragHandler || tracker.dragEndHandler || tracker.pinchHandler ) {
            $.cancelEvent( event );
        }
    }


    /**
     * @private
     * @inner
     */
    function onPointerUp( tracker, event ) {
        var gPoint;

        gPoint = {
            id: event.pointerId,
            type: getPointerType( event ),
            isPrimary: event.isPrimary,
            currentPos: getMouseAbsolute( event ),
            currentTime: $.now()
        };

        if ( updatePointersUp( tracker, event, [ gPoint ], event.button ) ) {
            if ( $.MouseTracker.unprefixedPointerEvents ) {
                event.currentTarget.releasePointerCapture( event.pointerId );
            } else {
                event.currentTarget.msReleasePointerCapture( event.pointerId );
            }
        }
    }


    /**
     * @private
     * @inner
     */
    function onPointerMove( tracker, event ) {
        // Pointer changed coordinates, button state, pressure, tilt, or contact geometry (e.g. width and height)
        var gPoint;

        gPoint = {
            id: event.pointerId,
            type: getPointerType( event ),
            isPrimary: event.isPrimary,
            currentPos: getMouseAbsolute( event ),
            currentTime: $.now()
        };

        updatePointersMove( tracker, event, [ gPoint ] );
    }


    /**
     * @private
     * @inner
     */
    function onPointerCancel( tracker, event ) {
        var gPoint;

        gPoint = {
            id: event.pointerId,
            type: getPointerType( event ),
        };

        updatePointersCancel( tracker, event, [ gPoint ] );
    }


///////////////////////////////////////////////////////////////////////////////
// Device-agnostic DOM event handlers
///////////////////////////////////////////////////////////////////////////////

    /**
     * @function
     * @private
     * @inner
     * @param {OpenSeadragon.MouseTracker.GesturePointList} pointsList
     *     The GesturePointList to track the pointer in.
     * @param {OpenSeadragon.MouseTracker.GesturePoint} gPoint
     *      Gesture point to track.
     * @returns {Number} Number of gesture points in pointsList.
     */
    function startTrackingPointer( pointsList, gPoint ) {

        // If isPrimary is not known for the pointer then set it according to our rules: 
        //    true if the first pointer in the gesture, otherwise false
        if ( !gPoint.hasOwnProperty( 'isPrimary' ) ) {
            if ( pointsList.getLength() === 0 ) {
                gPoint.isPrimary = true;
            } else {
                gPoint.isPrimary = false;
            }
        }
        gPoint.speed = 0;
        gPoint.direction = 0;
        gPoint.contactPos = gPoint.currentPos;
        gPoint.contactTime = gPoint.currentTime;
        gPoint.lastPos = gPoint.currentPos;
        gPoint.lastTime = gPoint.currentTime;

        return pointsList.add( gPoint );
    }


    /**
     * @function
     * @private
     * @inner
     * @param {OpenSeadragon.MouseTracker.GesturePointList} pointsList
     *     The GesturePointList to stop tracking the pointer on.
     * @param {OpenSeadragon.MouseTracker.GesturePoint} gPoint
     *      Gesture point to stop tracking.
     * @returns {Number} Number of gesture points in pointsList.
     */
    function stopTrackingPointer( pointsList, gPoint ) {
        var listLength,
            primaryPoint;

        if ( pointsList.getById( gPoint.id ) ) {
            listLength = pointsList.removeById( gPoint.id );

            // If isPrimary is not known for the pointer and we just removed the primary pointer from the list then we need to set another pointer as primary
            if ( !gPoint.hasOwnProperty( 'isPrimary' ) ) {
                primaryPoint = pointsList.getPrimary();
                if ( !primaryPoint ) {
                    primaryPoint = pointsList.getByIndex( 0 );
                    if ( primaryPoint ) {
                        primaryPoint.isPrimary = true;
                    }
                }
            }
        } else {
            listLength = pointsList.getLength();
        }

        return listLength;
    }


    /**
     * @function
     * @private
     * @inner
     * @param {OpenSeadragon.MouseTracker} tracker
     *     A reference to the MouseTracker instance.
     * @param {Object} event
     *     A reference to the originating DOM event.
     * @param {Array.<OpenSeadragon.MouseTracker.GesturePoint>} gPoints
     *      Gesture points associated with the event.
     */
    function updatePointersEnter( tracker, event, gPoints ) {
        var pointsList = tracker.getActivePointersListByType( gPoints[ 0 ].type ),
            i,
            gPointCount = gPoints.length,
            curGPoint,
            updateGPoint,
            propagate;

        for ( i = 0; i < gPointCount; i++ ) {
            curGPoint = gPoints[ i ];
            updateGPoint = pointsList.getById( curGPoint.id );

            if ( updateGPoint ) {
                // Already tracking the pointer...update it
                updateGPoint.insideElement = true;
                updateGPoint.lastPos = updateGPoint.currentPos;
                updateGPoint.lastTime = updateGPoint.currentTime;
                updateGPoint.currentPos = curGPoint.currentPos;
                updateGPoint.currentTime = curGPoint.currentTime;

                curGPoint = updateGPoint;
            } else {
                // Initialize for tracking and add to the tracking list
                curGPoint.captured = false;
                curGPoint.insideElementPressed = false;
                curGPoint.insideElement = true;
                startTrackingPointer( pointsList, curGPoint );
            }

            // Enter
            if ( tracker.enterHandler ) {
                propagate = tracker.enterHandler(
                    {
                        eventSource:          tracker,
                        pointerType:          curGPoint.type,
                        position:             getPointRelativeToAbsolute( curGPoint.currentPos, tracker.element ),
                        buttons:              pointsList.buttons,
                        insideElementPressed: curGPoint.insideElementPressed,
                        buttonDownAny:        pointsList.buttons !== 0,
                        isTouchEvent:         curGPoint.type === 'touch',
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
     * @function
     * @private
     * @inner
     * @param {OpenSeadragon.MouseTracker} tracker
     *     A reference to the MouseTracker instance.
     * @param {Object} event
     *     A reference to the originating DOM event.
     * @param {Array.<OpenSeadragon.MouseTracker.GesturePoint>} gPoints
     *      Gesture points associated with the event.
     */
    function updatePointersExit( tracker, event, gPoints ) {
        var delegate = THIS[ tracker.hash ],
            pointsList = tracker.getActivePointersListByType( gPoints[ 0 ].type ),
            i,
            gPointCount = gPoints.length,
            curGPoint,
            updateGPoint,
            propagate;

        for ( i = 0; i < gPointCount; i++ ) {
            curGPoint = gPoints[ i ];
            updateGPoint = pointsList.getById( curGPoint.id );

            if ( updateGPoint ) {
                // Already tracking the pointer. If captured then update it, else stop tracking it
                if ( updateGPoint.captured ) {
                    updateGPoint.insideElement = false;
                    updateGPoint.lastPos = updateGPoint.currentPos;
                    updateGPoint.lastTime = updateGPoint.currentTime;
                    updateGPoint.currentPos = curGPoint.currentPos;
                    updateGPoint.currentTime = curGPoint.currentTime;
                } else {
                    stopTrackingPointer( pointsList, updateGPoint );
                }

                curGPoint = updateGPoint;
            }

            // Exit
            if ( tracker.exitHandler ) {
                propagate = tracker.exitHandler(
                    {
                        eventSource:          tracker,
                        pointerType:          curGPoint.type,
                        position:             getPointRelativeToAbsolute( curGPoint.currentPos, tracker.element ),
                        buttons:              pointsList.buttons,
                        insideElementPressed: updateGPoint ? updateGPoint.insideElementPressed : false,
                        buttonDownAny:        pointsList.buttons !== 0,
                        isTouchEvent:         curGPoint.type === 'touch',
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
     * @function
     * @private
     * @inner
     * @param {OpenSeadragon.MouseTracker} tracker
     *     A reference to the MouseTracker instance.
     * @param {Object} event
     *     A reference to the originating DOM event.
     * @param {Array.<OpenSeadragon.MouseTracker.GesturePoint>} gPoints
     *      Gesture points associated with the event.
     * @param {Number} buttonChanged
     *      The button involved in the event: -1: none, 0: primary, 1: aux, 2: secondary, 3: X1, 4: X2, 5: pen eraser.
     *      Note on chorded button presses (a button pressed when another button is already pressed): In the W3C Pointer Events model, 
     *      only one pointerdown/pointerup event combo is fired. Chorded button state changes instead fire pointermove events.
     *
     * @returns {Boolean} True if pointers should be captured to the tracked element, otherwise false.
     */
    function updatePointersDown( tracker, event, gPoints, buttonChanged ) {
        var delegate = THIS[ tracker.hash ],
            propagate,
            pointsList = tracker.getActivePointersListByType( gPoints[ 0 ].type ),
            i,
            gPointCount = gPoints.length,
            curGPoint,
            updateGPoint;

        if ( typeof event.buttons !== 'undefined' ) {
            pointsList.buttons = event.buttons;
        } else {
            if ( buttonChanged === 0 ) {
                // Primary
                pointsList.buttons |= 1;
            } else if ( buttonChanged === 1 ) {
                // Aux
                pointsList.buttons |= 4;
            } else if ( buttonChanged === 2 ) {
                // Secondary
                pointsList.buttons |= 2;
            } else if ( buttonChanged === 3 ) {
                // X1 (Back)
                pointsList.buttons |= 8;
            } else if ( buttonChanged === 4 ) {
                // X2 (Forward)
                pointsList.buttons |= 16;
            } else if ( buttonChanged === 5 ) {
                // Pen Eraser
                pointsList.buttons |= 32;
            }
        }

        // Only capture and track primary button, pen, and touch contacts
        //if ( buttonChanged !== 0 ) {
        if ( buttonChanged !== 0 && buttonChanged !== 1 ) { //TODO Remove this IE8 compatibility and use the commented line above
            return false;
        }

        for ( i = 0; i < gPointCount; i++ ) {
            curGPoint = gPoints[ i ];
            updateGPoint = pointsList.getById( curGPoint.id );

            if ( updateGPoint ) {
                // Already tracking the pointer...update it
                updateGPoint.captured = true;
                updateGPoint.insideElementPressed = true;
                updateGPoint.insideElement = true;
                updateGPoint.contactPos = curGPoint.currentPos;
                updateGPoint.contactTime = curGPoint.currentTime;
                updateGPoint.lastPos = updateGPoint.currentPos;
                updateGPoint.lastTime = updateGPoint.currentTime;
                updateGPoint.currentPos = curGPoint.currentPos;
                updateGPoint.currentTime = curGPoint.currentTime;

                curGPoint = updateGPoint;
            } else {
                // Initialize for tracking and add to the tracking list (no pointerover or pointermove event occurred before this)
                curGPoint.captured = true;
                curGPoint.insideElementPressed = true;
                curGPoint.insideElement = true;
                startTrackingPointer( pointsList, curGPoint );
            }

            pointsList.contacts++;

            if ( tracker.dragHandler || tracker.dragEndHandler || tracker.pinchHandler ) {
                $.MouseTracker.gesturePointVelocityTracker.addPoint( tracker, curGPoint );
            }

            if ( pointsList.contacts === 1 ) {
                // Press
                if ( tracker.pressHandler ) {
                    propagate = tracker.pressHandler(
                        {
                            eventSource:          tracker,
                            pointerType:          curGPoint.type,
                            position:             getPointRelativeToAbsolute( curGPoint.contactPos, tracker.element ),
                            buttons:              pointsList.buttons,
                            isTouchEvent:         curGPoint.type === 'touch',
                            originalEvent:        event,
                            preventDefaultAction: false,
                            userData:             tracker.userData
                        }
                    );
                    if ( propagate === false ) {
                        $.cancelEvent( event );
                    }
                }
            } else if ( pointsList.contacts === 2 ) {
                if ( tracker.pinchHandler && curGPoint.type === 'touch' ) {
                    // Initialize for pinch
                    delegate.pinchGPoints = pointsList.asArray();
                    delegate.lastPinchDist = delegate.currentPinchDist = delegate.pinchGPoints[ 0 ].currentPos.distanceTo( delegate.pinchGPoints[ 1 ].currentPos );
                    delegate.lastPinchCenter = delegate.currentPinchCenter = getCenterPoint( delegate.pinchGPoints[ 0 ].currentPos, delegate.pinchGPoints[ 1 ].currentPos );
                }
            }
        }

        return true;
    }


    /**
     * @function
     * @private
     * @inner
     * @param {OpenSeadragon.MouseTracker} tracker
     *     A reference to the MouseTracker instance.
     * @param {Object} event
     *     A reference to the originating DOM event.
     * @param {Array.<OpenSeadragon.MouseTracker.GesturePoint>} gPoints
     *      Gesture points associated with the event.
     * @param {Number} buttonChanged
     *      The button involved in the event: -1: none, 0: primary, 1: aux, 2: secondary, 3: X1, 4: X2, 5: pen eraser.
     *      Note on chorded button presses (a button pressed when another button is already pressed): In the W3C Pointer Events model, 
     *      only one pointerdown/pointerup event combo is fired. Chorded button state changes instead fire pointermove events.
     *
     * @returns {Boolean} True if pointer capture should be released from the tracked element, otherwise false.
     */
    function updatePointersUp( tracker, event, gPoints, buttonChanged ) {
        var delegate = THIS[ tracker.hash ],
            pointsList = tracker.getActivePointersListByType( gPoints[ 0 ].type ),
            propagate,
            insideElementReleased,
            releasePoint,
            releaseTime,
            i,
            gPointCount = gPoints.length,
            curGPoint,
            updateGPoint,
            releaseCapture = false,
            wasCaptured = false,
            quick;

        if ( typeof event.buttons !== 'undefined' ) {
            pointsList.buttons = event.buttons;
        } else {
            if ( buttonChanged === 0 ) {
                // Primary
                pointsList.buttons ^= ~1;
            } else if ( buttonChanged === 1 ) {
                // Aux
                pointsList.buttons ^= ~4;
            } else if ( buttonChanged === 2 ) {
                // Secondary
                pointsList.buttons ^= ~2;
            } else if ( buttonChanged === 3 ) {
                // X1 (Back)
                pointsList.buttons ^= ~8;
            } else if ( buttonChanged === 4 ) {
                // X2 (Forward)
                pointsList.buttons ^= ~16;
            } else if ( buttonChanged === 5 ) {
                // Pen Eraser
                pointsList.buttons ^= ~32;
            }
        }

        // Only capture and track primary button, pen, and touch contacts
        //if ( buttonChanged !== 0 ) {
        if ( buttonChanged !== 0 && buttonChanged !== 1 ) { //TODO Remove this IE8 compatibility and use the commented line above
            return false;
        }

        for ( i = 0; i < gPointCount; i++ ) {
            curGPoint = gPoints[ i ];
            updateGPoint = pointsList.getById( curGPoint.id );

            if ( updateGPoint ) {
                // Update the pointer, stop tracking it if not still in this element
                if ( updateGPoint.captured ) {
                    updateGPoint.captured = false;
                    releaseCapture = true;
                    wasCaptured = true;
                }
                updateGPoint.lastPos = updateGPoint.currentPos;
                updateGPoint.lastTime = updateGPoint.currentTime;
                updateGPoint.currentPos = curGPoint.currentPos;
                updateGPoint.currentTime = curGPoint.currentTime;
                if ( !updateGPoint.insideElement ) {
                    stopTrackingPointer( pointsList, updateGPoint );
                }

                releasePoint = updateGPoint.currentPos;
                releaseTime = updateGPoint.currentTime;

                if ( wasCaptured ) {
                    // Pointer was activated in our element but could have been removed in any element since events are captured to our element

                    pointsList.contacts--;

                    if ( tracker.dragHandler || tracker.dragEndHandler || tracker.pinchHandler ) {
                        $.MouseTracker.gesturePointVelocityTracker.removePoint( tracker, updateGPoint );
                    }

                    if ( pointsList.contacts === 0 ) {

                        // Release (pressed in our element)
                        if ( tracker.releaseHandler ) {
                            propagate = tracker.releaseHandler(
                                {
                                    eventSource:           tracker,
                                    pointerType:           updateGPoint.type,
                                    position:              getPointRelativeToAbsolute( releasePoint, tracker.element ),
                                    buttons:               pointsList.buttons,
                                    insideElementPressed:  updateGPoint.insideElementPressed,
                                    insideElementReleased: updateGPoint.insideElement,
                                    isTouchEvent:          updateGPoint.type === 'touch',
                                    originalEvent:         event,
                                    preventDefaultAction:  false,
                                    userData:              tracker.userData
                                }
                            );
                            if ( propagate === false ) {
                                $.cancelEvent( event );
                            }
                        }

                        // Drag End
                        if ( tracker.dragEndHandler && !updateGPoint.currentPos.equals( updateGPoint.contactPos ) ) {
                            propagate = tracker.dragEndHandler(
                                {
                                    eventSource:          tracker,
                                    pointerType:          updateGPoint.type,
                                    position:             getPointRelativeToAbsolute( updateGPoint.currentPos, tracker.element ),
                                    speed:                updateGPoint.speed,
                                    direction:            updateGPoint.direction,
                                    shift:                event.shiftKey,
                                    isTouchEvent:         updateGPoint.type === 'touch',
                                    originalEvent:        event,
                                    preventDefaultAction: false,
                                    userData:             tracker.userData
                                }
                            );
                            if ( propagate === false ) {
                                $.cancelEvent( event );
                            }
                        }

                        // Click / Double-Click
                        if ( ( tracker.clickHandler || tracker.dblClickHandler ) && updateGPoint.insideElement ) {
                            quick = releaseTime - updateGPoint.contactTime <= tracker.clickTimeThreshold &&
                                            updateGPoint.contactPos.distanceTo( releasePoint ) <= tracker.clickDistThreshold;

                            // Click
                            if ( tracker.clickHandler ) {
                                propagate = tracker.clickHandler(
                                    {
                                        eventSource:          tracker,
                                        pointerType:          updateGPoint.type,
                                        position:             getPointRelativeToAbsolute( updateGPoint.currentPos, tracker.element ),
                                        quick:                quick,
                                        shift:                event.shiftKey,
                                        isTouchEvent:         updateGPoint.type === 'touch',
                                        originalEvent:        event,
                                        preventDefaultAction: false,
                                        userData:             tracker.userData
                                    }
                                );
                                if ( propagate === false ) {
                                    $.cancelEvent( event );
                                }
                            }

                            // Double-Click
                            if ( tracker.dblClickHandler && quick ) {
                                pointsList.clicks++;
                                if ( pointsList.clicks === 1 ) {
                                    delegate.lastClickPos = releasePoint;
                                    /*jshint loopfunc:true*/
                                    delegate.dblClickTimeOut = setTimeout( function() {
                                        pointsList.clicks = 0;
                                    }, tracker.dblClickTimeThreshold );
                                    /*jshint loopfunc:false*/
                                } else if ( pointsList.clicks === 2 ) {
                                    clearTimeout( delegate.dblClickTimeOut );
                                    pointsList.clicks = 0;
                                    if ( delegate.lastClickPos.distanceTo( releasePoint ) <= tracker.dblClickDistThreshold ) {
                                        propagate = tracker.dblClickHandler(
                                            {
                                                eventSource:          tracker,
                                                pointerType:          updateGPoint.type,
                                                position:             getPointRelativeToAbsolute( updateGPoint.currentPos, tracker.element ),
                                                shift:                event.shiftKey,
                                                isTouchEvent:         updateGPoint.type === 'touch',
                                                originalEvent:        event,
                                                preventDefaultAction: false,
                                                userData:             tracker.userData
                                            }
                                        );
                                        if ( propagate === false ) {
                                            $.cancelEvent( event );
                                        }
                                    }
                                    delegate.lastClickPos = null;
                                }
                            }
                        }
                    } else if ( pointsList.contacts === 2 ) {
                        if ( tracker.pinchHandler && updateGPoint.type === 'touch' ) {
                            // Reset for pinch
                            delegate.pinchGPoints = pointsList.asArray();
                            delegate.lastPinchDist = delegate.currentPinchDist = delegate.pinchGPoints[ 0 ].currentPos.distanceTo( delegate.pinchGPoints[ 1 ].currentPos );
                            delegate.lastPinchCenter = delegate.currentPinchCenter = getCenterPoint( delegate.pinchGPoints[ 0 ].currentPos, delegate.pinchGPoints[ 1 ].currentPos );
                        }
                    }
                } else {
                    // Pointer was activated in another element but removed in our element

                    // Release (pressed in another element)
                    if ( tracker.releaseHandler ) {
                        propagate = tracker.releaseHandler(
                            {
                                eventSource:           tracker,
                                pointerType:           updateGPoint.type,
                                position:              getPointRelativeToAbsolute( releasePoint, tracker.element ),
                                buttons:               pointsList.buttons,
                                insideElementPressed:  updateGPoint.insideElementPressed,
                                insideElementReleased: updateGPoint.insideElement,
                                isTouchEvent:          updateGPoint.type === 'touch',
                                originalEvent:         event,
                                preventDefaultAction:  false,
                                userData:              tracker.userData
                            }
                        );
                        if ( propagate === false ) {
                            $.cancelEvent( event );
                        }
                    }
                }
            }
        }

        return releaseCapture;
    }


    /**
     * Call when pointer(s) change coordinates, button state, pressure, tilt, or contact geometry (e.g. width and height)
     *
     * @function
     * @private
     * @inner
     * @param {OpenSeadragon.MouseTracker} tracker
     *     A reference to the MouseTracker instance.
     * @param {Object} event
     *     A reference to the originating DOM event.
     * @param {Array.<OpenSeadragon.MouseTracker.GesturePoint>} gPoints
     *      Gesture points associated with the event.
     */
    function updatePointersMove( tracker, event, gPoints ) {
        var delegate = THIS[ tracker.hash ],
            pointsList = tracker.getActivePointersListByType( gPoints[ 0 ].type ),
            i,
            gPointCount = gPoints.length,
            curGPoint,
            updateGPoint,
            gPointArray,
            delta,
            propagate;

        if ( typeof event.buttons !== 'undefined' ) {
            pointsList.buttons = event.buttons;
        }

        for ( i = 0; i < gPointCount; i++ ) {
            curGPoint = gPoints[ i ];
            updateGPoint = pointsList.getById( curGPoint.id );

            if ( updateGPoint ) {
                // Already tracking the pointer...update it
                if ( curGPoint.hasOwnProperty( 'isPrimary' ) ) {
                    updateGPoint.isPrimary = curGPoint.isPrimary;
                }
                updateGPoint.lastPos = updateGPoint.currentPos;
                updateGPoint.lastTime = updateGPoint.currentTime;
                updateGPoint.currentPos = curGPoint.currentPos;
                updateGPoint.currentTime = curGPoint.currentTime;
            } else {
                // Initialize for tracking and add to the tracking list (no pointerover or pointerdown event occurred before this)
                curGPoint.captured = false;
                curGPoint.insideElementPressed = false;
                curGPoint.insideElement = true;
                startTrackingPointer( pointsList, curGPoint );
            }
        }

        // Stop (mouse only)
        if ( tracker.stopHandler && gPoints[ 0 ].type === 'mouse' ) {
            clearTimeout( tracker.stopTimeOut );
            tracker.stopTimeOut = setTimeout( function() {
                handlePointerStop( tracker, event, gPoints[ 0 ].type );
            }, tracker.stopDelay );
        }

        if ( pointsList.contacts === 0 ) {
            // Move (no contacts: hovering mouse or other hover-capable device)
            if ( tracker.moveHandler ) {
                propagate = tracker.moveHandler(
                    {
                        eventSource:          tracker,
                        pointerType:          gPoints[ 0 ].type,
                        position:             getPointRelativeToAbsolute( gPoints[ 0 ].currentPos, tracker.element ),
                        buttons:              pointsList.buttons,
                        isTouchEvent:         gPoints[ 0 ].type === 'touch',
                        originalEvent:        event,
                        preventDefaultAction: false,
                        userData:             tracker.userData
                    }
                );
                if ( propagate === false ) {
                    $.cancelEvent( event );
                }
            }
        } else if ( pointsList.contacts === 1 ) {
            // Move (1 contact)
            if ( tracker.moveHandler ) {
                updateGPoint = pointsList.asArray()[ 0 ];
                propagate = tracker.moveHandler(
                    {
                        eventSource:          tracker,
                        pointerType:          updateGPoint.type,
                        position:             getPointRelativeToAbsolute( updateGPoint.currentPos, tracker.element ),
                        buttons:              pointsList.buttons,
                        isTouchEvent:         updateGPoint.type === 'touch',
                        originalEvent:        event,
                        preventDefaultAction: false,
                        userData:             tracker.userData
                    }
                );
                if ( propagate === false ) {
                    $.cancelEvent( event );
                }
            }

            // Drag
            if ( tracker.dragHandler ) {
                updateGPoint = pointsList.asArray()[ 0 ];
                delta = updateGPoint.currentPos.minus( updateGPoint.lastPos );
                propagate = tracker.dragHandler(
                    {
                        eventSource:          tracker,
                        pointerType:          updateGPoint.type,
                        position:             getPointRelativeToAbsolute( updateGPoint.currentPos, tracker.element ),
                        buttons:              pointsList.buttons,
                        delta:                delta,
                        speed:                updateGPoint.speed,
                        direction:            updateGPoint.direction,
                        shift:                event.shiftKey,
                        isTouchEvent:         updateGPoint.type === 'touch',
                        originalEvent:        event,
                        preventDefaultAction: false,
                        userData:             tracker.userData
                    }
                );
                if ( propagate === false ) {
                    $.cancelEvent( event );
                }
            }
        } else if ( pointsList.contacts === 2 ) {
            // Move (2 contacts, use center)
            if ( tracker.moveHandler ) {
                gPointArray = pointsList.asArray();
                propagate = tracker.moveHandler(
                    {
                        eventSource:          tracker,
                        pointerType:          gPointArray[ 0 ].type,
                        position:             getPointRelativeToAbsolute( getCenterPoint( gPointArray[ 0 ].currentPos, gPointArray[ 1 ].currentPos ), tracker.element ),
                        buttons:              pointsList.buttons,
                        isTouchEvent:         gPointArray[ 0 ].type === 'touch',
                        originalEvent:        event,
                        preventDefaultAction: false,
                        userData:             tracker.userData
                    }
                );
                if ( propagate === false ) {
                    $.cancelEvent( event );
                }
            }

            // Pinch
            if ( tracker.pinchHandler && gPoints[ 0 ].type === 'touch' ) {
                delta = delegate.pinchGPoints[ 0 ].currentPos.distanceTo( delegate.pinchGPoints[ 1 ].currentPos );
                if ( delta != delegate.currentPinchDist ) {
                    delegate.lastPinchDist = delegate.currentPinchDist;
                    delegate.currentPinchDist = delta;
                    delegate.lastPinchCenter = delegate.currentPinchCenter;
                    delegate.currentPinchCenter = getCenterPoint( delegate.pinchGPoints[ 0 ].currentPos, delegate.pinchGPoints[ 1 ].currentPos );
                    propagate = tracker.pinchHandler(
                        {
                            eventSource:          tracker,
                            pointerType:          'touch',
                            gesturePoints:        delegate.pinchGPoints,
                            lastCenter:           getPointRelativeToAbsolute( delegate.lastPinchCenter, tracker.element ),
                            center:               getPointRelativeToAbsolute( delegate.currentPinchCenter, tracker.element ),
                            lastDistance:         delegate.lastPinchDist,
                            distance:             delegate.currentPinchDist,
                            shift:                event.shiftKey,
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
     * @function
     * @private
     * @inner
     * @param {OpenSeadragon.MouseTracker} tracker
     *     A reference to the MouseTracker instance.
     * @param {Object} event
     *     A reference to the originating DOM event.
     * @param {Array.<OpenSeadragon.MouseTracker.GesturePoint>} gPoints
     *      Gesture points associated with the event.
     */
    function updatePointersCancel( tracker, event, gPoints ) {
        updatePointersUp( tracker, event, gPoints, 0 );
        updatePointersExit( tracker, event, gPoints );
    }


    /**
     * @private
     * @inner
     */
    function handlePointerStop( tracker, originalMoveEvent, pointerType ) {
        if ( tracker.stopHandler ) {
            tracker.stopHandler( {
                eventSource:          tracker,
                pointerType:          pointerType,
                position:             getMouseRelative( originalMoveEvent, tracker.element ),
                buttons:              tracker.getActivePointersListByType( pointerType ).buttons,
                isTouchEvent:         pointerType === 'touch',
                originalEvent:        originalMoveEvent,
                preventDefaultAction: false,
                userData:             tracker.userData
            } );
        }
    }

} ( OpenSeadragon ) );
