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

        // is any button currently being pressed while pointer events occur
    var IS_BUTTON_DOWN = false,
        // dictionary from hash to private properties
        THIS           = {};


    /**
     * @class MouseTracker
     * @classdesc Provides simplified handling of common pointing device (mouse, touch, pen) and keyboard
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
     *      A reference to an element or an element id for which the pointer/key
     *      events will be monitored.
     * @param {Number} options.clickTimeThreshold
     *      The number of milliseconds within which multiple pointer clicks
     *      will be treated as a single event.
     * @param {Number} options.clickDistThreshold
     *      The distance between pointer click within multiple pointer clicks
     *      will be treated as a single event.
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
         * The number of milliseconds within which mutliple pointer clicks will be treated as a single event.
         * @member {Number} clickTimeThreshold
         * @memberof OpenSeadragon.MouseTracker#
         */
        this.clickTimeThreshold = options.clickTimeThreshold;
        /**
         * The distance between pointer click within multiple pointer clicks will be treated as a single event.
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
        this.dragEndHandler     = options.dragEndHandler || null;
        this.pinchHandler       = options.pinchHandler   || null;
        this.stopHandler        = options.stopHandler    || null;
        this.keyHandler         = options.keyHandler     || null;
        this.focusHandler       = options.focusHandler   || null;
        this.blurHandler        = options.blurHandler    || null;

        //Store private properties in a scope sealed hash map
        var _this = this;

        /**
         * @private
         * @property {Boolean} tracking
         *      Are we currently tracking pointer events.
         * @property {Boolean} capturing
         *      Are we curruently capturing mouse events (legacy mouse events only).
         */
        THIS[ this.hash ] = {
            setCaptureCapable:     !!this.element.setCapture && !!this.element.releaseCapture,

            click:                 function ( event ) { onClick( _this, event ); },
            keypress:              function ( event ) { onKeyPress( _this, event ); },
            focus:                 function ( event ) { onFocus( _this, event ); },
            blur:                  function ( event ) { onBlur( _this, event ); },

            wheel:                 function ( event ) { onWheel( _this, event ); },
            mousewheel:            function ( event ) { onMouseWheel( _this, event ); },
            DOMMouseScroll:        function ( event ) { onMouseWheel( _this, event ); },
            MozMousePixelScroll:   function ( event ) { onMouseWheel( _this, event ); },

            mouseover:             function ( event ) { onMouseOver( _this, event ); },
            mouseout:              function ( event ) { onMouseOut( _this, event ); },
            mousedown:             function ( event ) { onMouseDown( _this, event ); },
            mouseup:               function ( event ) { onMouseUp( _this, event ); },
            mouseupcaptured:       function ( event ) { onMouseUpCaptured( _this, event ); },
            //mouseupcapturedie:     function ( event ) { onMouseUpCapturedIE( _this, event ); },
            mousemove:             function ( event ) { onMouseMove( _this, event ); },
            mousemovecaptured:     function ( event ) { onMouseMoveCaptured( _this, event ); },
            //mousemovecapturedie:   function ( event ) { onMouseMoveCapturedIE( _this, event ); },

            touchenter:            function ( event ) { onTouchEnter( _this, event ); },
            touchleave:            function ( event ) { onTouchLeave( _this, event ); },
            touchstart:            function ( event ) { onTouchStart( _this, event ); },
            touchend:              function ( event ) { onTouchEnd( _this, event ); },
            touchmove:             function ( event ) { onTouchMove( _this, event ); },
            touchcancel:           function ( event ) { onTouchCancel( _this, event ); },

            gesturestart:          function ( event ) { onGestureStart( _this, event ); },
            gesturechange:         function ( event ) { onGestureChange( _this, event ); },

            pointerover:           function ( event ) { onPointerOver( _this, event ); },
            MSPointerOver:         function ( event ) { onPointerOver( _this, event ); },
            pointerout:            function ( event ) { onPointerOut( _this, event ); },
            MSPointerOut:          function ( event ) { onPointerOut( _this, event ); },
            pointerdown:           function ( event ) { onPointerDown( _this, event ); },
            MSPointerDown:         function ( event ) { onPointerDown( _this, event ); },
            pointerup:             function ( event ) { onPointerUp( _this, event ); },
            MSPointerUp:           function ( event ) { onPointerUp( _this, event ); },
            pointermove:           function ( event ) { onPointerMove( _this, event ); },
            MSPointerMove:         function ( event ) { onPointerMove( _this, event ); },
            pointercancel:         function ( event ) { onPointerCancel( _this, event ); },
            MSPointerCancel:       function ( event ) { onPointerCancel( _this, event ); },

            tracking:              false,
            capturing:             false,

            // Active Contact Points
            mousePoints:           new $.MouseTracker.GesturePointList(),
            touchPoints:           new $.MouseTracker.GesturePointList(),
            penPoints:             new $.MouseTracker.GesturePointList(),
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
         * Implement or assign implementation to these handlers during or after
         * calling the constructor.
         * @function
         * @param {Object} event
         * @param {OpenSeadragon.MouseTracker} event.eventSource
         *      A reference to the tracker instance.
         * @param {String} event.pointerType
         *     "mouse", "touch", "pen", or "".
         * @param {OpenSeadragon.Point} event.position
         *      The position of the event relative to the tracked element.
         * @param {Boolean} event.insideElementPressed
         *      True if the left mouse button is currently being pressed and was
         *      initiated inside the tracked element, otherwise false.
         * @param {Boolean} event.buttonDownAny
         *      Was the button down anywhere in the screen during the event.
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
         *     "mouse", "touch", "pen", or "".
         * @param {OpenSeadragon.Point} event.position
         *      The position of the event relative to the tracked element.
         * @param {Boolean} event.insideElementPressed
         *      True if the left mouse button is currently being pressed and was
         *      initiated inside the tracked element, otherwise false.
         * @param {Boolean} event.buttonDownAny
         *      Was the button down anywhere in the screen during the event.
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
         *     "mouse", "touch", "pen", or "".
         * @param {OpenSeadragon.Point} event.position
         *      The position of the event relative to the tracked element.
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
         *     "mouse", "touch", "pen", or "".
         * @param {OpenSeadragon.Point} event.position
         *      The position of the event relative to the tracked element.
         * @param {Boolean} event.insideElementPressed
         *      True if the left mouse button is currently being pressed and was
         *      initiated inside the tracked element, otherwise false.
         * @param {Boolean} event.insideElementReleased
         *      True if the cursor still inside the tracked element when the button was released.
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
         *     "mouse", "touch", "pen", or "".
         * @param {OpenSeadragon.Point} event.position
         *      The position of the event relative to the tracked element.
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
         *     "mouse", "touch", "pen", or "".
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
         *     "mouse", "touch", "pen", or "".
         * @param {OpenSeadragon.Point} event.position
         *      The position of the event relative to the tracked element.
         * @param {Number} event.quick
         *      True only if the clickDistThreshold and clickDeltaThreshold are both passed. Useful for ignoring events.
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
         *     "mouse", "touch", "pen", or "".
         * @param {OpenSeadragon.Point} event.position
         *      The position of the event relative to the tracked element.
         * @param {OpenSeadragon.Point} event.delta
         *      The x,y components of the difference between the current position and the last drag event position.  Useful for ignoring or weighting the events.
         * @param {Number} speed
         *     Current computed speed, in pixels per second.
         * @property {Number} direction
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
         *     "mouse", "touch", "pen", or "".
         * @param {OpenSeadragon.Point} event.position
         *      The position of the event relative to the tracked element.
         * @param {Number} speed
         *     Speed at the end of a drag gesture, in pixels per second.
         * @property {Number} direction
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
         *     "mouse", "touch", "pen", or "".
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
         *     "mouse", "touch", "pen", or "".
         * @param {OpenSeadragon.Point} event.position
         *      The position of the event relative to the tracked element.
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
     * This is a singleton, used by all MouseTracker instances. Currently it is extremely unlikely there will ever be more than
     * two active gesture pointers at a time.
     *
     * @member gesturePointVelocityTracker
     * @memberof OpenSeadragon.MouseTracker
     * @private
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

            // Only fire up the interval timer when there's gesture points to track
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
                    // Only run the interval timer if theres gesture points to track
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
// Event model detection
///////////////////////////////////////////////////////////////////////////////

    /**
     * Detect available mouse wheel event name.
     */
    $.MouseTracker.wheelEventName = ( $.Browser.vendor == $.BROWSERS.IE && $.Browser.version > 8 ) ||
                                                ( 'onwheel' in document.createElement( 'div' ) ) ? 'wheel' : // Modern browsers support 'wheel'
                                    document.onmousewheel !== undefined ? 'mousewheel' :                     // Webkit and IE support at least 'mousewheel'
                                    'DOMMouseScroll';                                                        // Assume old Firefox

    /**
     * Detect browser pointer device event model(s) and build appropriate list of events to subscribe to.
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
        // Legacy W3C mouse events
        $.MouseTracker.subscribeEvents.push( "mouseover", "mouseout", "mousedown", "mouseup", "mousemove" );
        if ( 'ontouchstart' in window ) {
            // iOS, Android, and other W3c Touch Event implementations (see http://www.w3.org/TR/2011/WD-touch-events-20110505)
            $.MouseTracker.subscribeEvents.push( "touchstart", "touchend", "touchmove", "touchcancel" );
            if ( 'ontouchenter' in window ) {
                $.MouseTracker.subscribeEvents.push( "touchenter", "touchleave" );
                $.MouseTracker.haveTouchEnter = true;
            }
            else {
                $.MouseTracker.haveTouchEnter = false;
            }
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
     * Represents a point of contact on the screen made by a mouse cursor, pen, touch, or other pointing device.
     *
     * @typedef {Object} GesturePoint
     * @memberof OpenSeadragon.MouseTracker
     *
     * @property {Number} id
     *     Identifier unique from all other active GesturePoints for a given pointer device.
     * @property {String} type
     *     The pointer device type: "mouse", "touch", "pen", or "".
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
     * @property {OpenSeadragon.Point} startPos
     *     The initial pointer position, relative to the page including any scrolling.
     * @property {Number} startTime
     *     The initial pointer contact time, in milliseconds.
     * @property {OpenSeadragon.Point} lastPos
     *     The last pointer position, relative to the page including any scrolling.
     * @property {Number} lastTime
     *     The last pointer contact time, in milliseconds.
     * @property {OpenSeadragon.Point} currentPos
     *     The current pointer position, relative to the page including any scrolling.
     * @property {Number} currentTime
     *     The current pointer contact time, in milliseconds.
     */


    /***
     * @class GesturePointList
     * @classdesc Provides an abstraction for a set of {@link OpenSeadragon.MouseTracker.GesturePoint} objects.
     * @memberof OpenSeadragon.MouseTracker
     * @private
     */
    $.MouseTracker.GesturePointList = function () {
        this._gPoints = [];
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
            if ( delegate.setCaptureCapable ) {
                // IE<10, Firefox, other browsers with setCapture()/releaseCapture()
                tracker.element.setCapture( true );
            }
            else {
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
            if ( delegate.setCaptureCapable ) {
                // IE<10, Firefox, other browsers with setCapture()/releaseCapture()
                tracker.element.releaseCapture();
            }
            else {
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
    function getGPointsListByType( tracker, type ) {
        var delegate = THIS[ tracker.hash ],
            list;
        if ( type === 'mouse' ) {
            list = delegate.mousePoints;
        }
        else if ( type === 'touch' ) {
            list = delegate.touchPoints;
        }
        else if ( type === 'pen' ) {
            list = delegate.penPoints;
        }
        else {
            list = null;
        }
        return list;
    }


    /**
     * Gets a W3C Pointer Events model compatible pointer type string from a DOM pointer event.
     * IE10 used a long integer value, but the W3C specification (and IE11+) use a string "mouse", "touch", "pen", or "".
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
// DOM event handlers
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
    function onMouseOver( tracker, event ) {
        var gPoint;

        event = $.getEvent( event );

        gPoint = {
            id: $.MouseTracker.mousePointerId,
            type: 'mouse',
            isPrimary: true,
            insideElement: true,
            currentPos: getMouseAbsolute( event ),
            currentTime: $.now()
        };

        updatePointersOver( tracker, event, [ gPoint ] );
    }


    /**
     * @private
     * @inner
     */
    function onMouseOut( tracker, event ) {
        var gPoint;

        event = $.getEvent( event );

        gPoint = {
            id: $.MouseTracker.mousePointerId,
            type: 'mouse',
            isPrimary: true,
            insideElement: false,
            currentPos: getMouseAbsolute( event ),
            currentTime: $.now()
        };

        updatePointersOut( tracker, event, [ gPoint ] );
    }


    /**
     * @private
     * @inner
     */
    function onMouseDown( tracker, event ) {
        var gPoint;

        event = $.getEvent( event );

        if ( event.button == 2 ) {
            return;
        }

        if ( tracker.pressHandler || tracker.clickHandler || tracker.dragHandler ) {
            captureMouse( tracker );
        }

        gPoint = {
            id: $.MouseTracker.mousePointerId,
            type: 'mouse',
            isPrimary: true,
            currentPos: getMouseAbsolute( event ),
            currentTime: $.now()
        };

        addPointers( tracker, event, [ gPoint ] );

        if ( tracker.pressHandler || tracker.clickHandler || tracker.dragHandler ) {
            $.cancelEvent( event );
        }
    }


    /**
     * @private
     * @inner
     */
    function onMouseUp( tracker, event ) {
        var delegate = THIS[ tracker.hash ];

        if ( !delegate.capturing || delegate.setCaptureCapable ) {
            handleMouseUp( tracker, event );
        }

        if ( delegate.capturing ) {
            releaseMouse( tracker );
        }
    }

    /**
     * This handler is attached to the window object to emulate mouse capture.
     * Only triggered in older W3C browsers that don't have setCapture/releaseCapture 
     * methods or don't support the new pointer events model.
     * onMouseUp is still called on the tracked element, so avoid processing twice.
     * @private
     * @inner
     */
    function onMouseUpCaptured( tracker, event ) {
        var delegate = THIS[ tracker.hash ];

        handleMouseUp( tracker, event );

        if ( delegate.capturing ) {
            releaseMouse( tracker );
        }
    }


    /**
     * @private
     * @inner
     */
    function onMouseMove( tracker, event ) {
        var delegate = THIS[ tracker.hash ];
        if ( !delegate.capturing || delegate.setCaptureCapable ) {
            handleMouseMove( tracker, event );
        }
   }

    
    /**
     * This handler is attached to the window object to emulate mouse capture.
     * Only triggered in older W3C browsers that don't have setCapture/releaseCapture 
     * methods or don't support the new pointer events model.
     * onMouseMove is still called on the tracked element, so avoid processing twice.
     * @private
     * @inner
     */
    function onMouseMoveCaptured( tracker, event ) {
        handleMouseMove( tracker, event );
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
                insideElement: true,
                currentPos: getMouseAbsolute( event.changedTouches[ i ] ),
                currentTime: $.now()
            } );
        }

        updatePointersOver( tracker, event, gPoints );
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
                insideElement: false,
                currentPos: getMouseAbsolute( event.changedTouches[ i ] ),
                currentTime: $.now()
            } );
        }

        updatePointersOut( tracker, event, gPoints );
    }


    /**
     * @private
     * @inner
     */
    function onTouchStart( tracker, event ) {
        var delegate = THIS[ tracker.hash ],
            time,
            primaryPoint,
            primaryId,
            gPoint,
            i,
            touchCount = event.changedTouches.length,
            gPoints = [];

        time = $.now();

        if ( !$.MouseTracker.haveTouchEnter && touchCount > 0 && delegate.touchPoints.getLength() === 0 ) {
            gPoint = {
                id: event.changedTouches[ 0 ].identifier,
                type: 'touch',
                insideElement: true,
                currentPos: getMouseAbsolute( event.changedTouches[ 0 ] ),
                currentTime: time
            };
            updatePointersOver( tracker, event, [ gPoint ] );
        }

        primaryPoint = delegate.touchPoints.getPrimary();
        if ( primaryPoint ) {
            primaryId = primaryPoint.id;
        }
        else {
            primaryId = event.changedTouches[ 0 ].identifier;
        }

        for ( i = 0; i < touchCount; i++ ) {
            gPoints.push( {
                id: event.changedTouches[ i ].identifier,
                type: 'touch',
                isPrimary: event.changedTouches[ i ].identifier === primaryId,
                currentPos: getMouseAbsolute( event.changedTouches[ i ] ),
                currentTime: time
            } );
        }

        addPointers( tracker, event, gPoints );

        if ( tracker.pressHandler || tracker.dragHandler || tracker.pinchHandler ) {
            $.stopEvent( event );
            $.cancelEvent( event );
            return false;
        }
    }


    /**
     * @private
     * @inner
     */
    function onTouchEnd( tracker, event ) {
        var delegate = THIS[ tracker.hash ],
            time,
            primaryPoint,
            gPoint,
            i,
            touchCount = event.changedTouches.length,
            gPoints = [];

        time = $.now();

        for ( i = 0; i < touchCount; i++ ) {
            gPoints.push( {
                id: event.changedTouches[ i ].identifier,
                type: 'touch',
                currentPos: getMouseAbsolute( event.changedTouches[ i ] ),
                currentTime: time
            } );
        }

        removePointers( tracker, event, gPoints );

        primaryPoint = delegate.touchPoints.getPrimary();
        if ( !primaryPoint ) {
            primaryPoint = delegate.touchPoints.getByIndex( 0 );
            if ( primaryPoint ) {
                primaryPoint.isPrimary = true;
            }
        }

        if ( !$.MouseTracker.haveTouchEnter && touchCount > 0 && delegate.touchPoints.getLength() === 0 ) {
            gPoint = {
                id: event.changedTouches[ 0 ].identifier,
                type: 'touch',
                insideElement: false,
                currentPos: getMouseAbsolute( event.changedTouches[ 0 ] ),
                currentTime: time
            };
            updatePointersOut( tracker, event, [ gPoint ] );
        }

        if ( tracker.pressHandler || tracker.dragHandler || tracker.dragEndHandler || tracker.pinchHandler ) {
            $.stopEvent( event );
            $.cancelEvent( event );
            return false;
        }
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
                currentPos: getMouseAbsolute( event.changedTouches[ i ] ),
                currentTime: $.now()
            } );
        }

        updatePointers( tracker, event, gPoints );

        if ( tracker.pressHandler || tracker.dragHandler || tracker.pinchHandler ) {
            $.stopEvent( event );
            $.cancelEvent( event );
            return false;
        }
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

        cancelPointers( tracker, event, gPoints );
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
    function onPointerOver( tracker, event ) {
        var gPoint;

        gPoint = {
            id: event.pointerId,
            type: getPointerType( event ),
            isPrimary: event.isPrimary,
            insideElement: true,
            currentPos: getMouseAbsolute( event ),
            currentTime: $.now()
        };

        updatePointersOver( tracker, event, [ gPoint ] );
    }


    /**
     * @private
     * @inner
     */
    function onPointerOut( tracker, event ) {
        var gPoint;

        gPoint = {
            id: event.pointerId,
            type: getPointerType( event ),
            isPrimary: event.isPrimary,
            insideElement: false,
            currentPos: getMouseAbsolute( event ),
            currentTime: $.now()
        };

        updatePointersOut( tracker, event, [ gPoint ] );
    }


    /**
     * @private
     * @inner
     */
    function onPointerDown( tracker, event ) {
        var gPoint;

        if ( event.button == 2 ) {
            return;
        }

        if ( $.MouseTracker.unprefixedPointerEvents ) {
            event.currentTarget.setPointerCapture( event.pointerId );
        }
        else {
            event.currentTarget.msSetPointerCapture( event.pointerId );
        }

        gPoint = {
            id: event.pointerId,
            type: getPointerType( event ),
            isPrimary: event.isPrimary,
            currentPos: getMouseAbsolute( event ),
            currentTime: $.now()
        };

        addPointers( tracker, event, [ gPoint ] );

        if ( tracker.pressHandler || tracker.dragHandler || tracker.pinchHandler ) {
            $.stopEvent( event );
            $.cancelEvent( event );
            return false;
        }
    }


    /**
     * @private
     * @inner
     */
    function onPointerUp( tracker, event ) {
        var gPoint;

        if ( event.button == 2 ) {
            return;
        }

        if ( $.MouseTracker.unprefixedPointerEvents ) {
            event.currentTarget.releasePointerCapture( event.pointerId );
        }
        else {
            event.currentTarget.msReleasePointerCapture( event.pointerId );
        }

        gPoint = {
            id: event.pointerId,
            type: getPointerType( event ),
            isPrimary: event.isPrimary,
            currentPos: getMouseAbsolute( event ),
            currentTime: $.now()
        };

        removePointers(tracker, event, [ gPoint ]);

        if ( tracker.pressHandler || tracker.dragHandler || tracker.dragEndHandler || tracker.pinchHandler ) {
            $.stopEvent( event );
            $.cancelEvent( event );
            return false;
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

        updatePointers(tracker, event, [ gPoint ]);

        if ( tracker.pressHandler || tracker.dragHandler || tracker.pinchHandler ) {
            $.stopEvent( event );
            $.cancelEvent( event );
            return false;
        }
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
            isPrimary: event.isPrimary,
        };

        cancelPointers( tracker, event, [ gPoint ] );
    }


///////////////////////////////////////////////////////////////////////////////
// DOM event handler utility functions
///////////////////////////////////////////////////////////////////////////////

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

        updatePointers( tracker, event, [ gPoint ] );
    }


    /**
     * @private
     * @inner
     */
    function handleMouseUp( tracker, event ) {
        var gPoint;

        event = $.getEvent( event );

        if ( event.button == 2 ) {
            return;
        }

        gPoint = {
            id: $.MouseTracker.mousePointerId,
            type: 'mouse',
            isPrimary: true,
            currentPos: getMouseAbsolute( event ),
            currentTime: $.now()
        };

        removePointers( tracker, event, [ gPoint ] );
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
                isTouchEvent:         pointerType === 'touch',
                originalEvent:        originalMoveEvent,
                preventDefaultAction: false,
                userData:             tracker.userData
            } );
        }
    }


    /**
     * @private
     * @inner
     */
    function addPointers( tracker, event, gPoints ) {
        var delegate = THIS[ tracker.hash ],
            propagate,
            pointsList = getGPointsListByType( tracker, gPoints[ 0 ].type ),
            pointsListLength,
            i,
            gPointCount = gPoints.length,
            curGPoint;

        if ( pointsList ) {
            for ( i = 0; i < gPointCount; i++ ) {
                curGPoint = gPoints[ i ];

                // Initialize for gesture tracking
                curGPoint.insideElementPressed = true;
                curGPoint.insideElement = true;
                curGPoint.speed = 0;
                curGPoint.direction = 0;
                curGPoint.startPos = curGPoint.currentPos;
                curGPoint.startTime = curGPoint.currentTime;
                curGPoint.lastPos = curGPoint.currentPos;
                curGPoint.lastTime = curGPoint.currentTime;

                if ( tracker.dragHandler || tracker.dragEndHandler || tracker.pinchHandler ) {
                    $.MouseTracker.gesturePointVelocityTracker.addPoint( tracker, curGPoint );
                }

                pointsListLength = pointsList.add( curGPoint );

                if ( pointsListLength == 1 ) {
                    // Press
                    if ( tracker.pressHandler ) {
                        propagate = tracker.pressHandler(
                            {
                                eventSource:          tracker,
                                pointerType:          curGPoint.type,
                                position:             getPointRelativeToAbsolute( curGPoint.startPos, tracker.element ),
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
                else if ( pointsListLength == 2 ) {
                    if ( tracker.pinchHandler && curGPoint.type === 'touch' ) {
                        // Initialize for pinch
                        delegate.pinchGPoints = pointsList.asArray();
                        delegate.lastPinchDist = delegate.currentPinchDist = delegate.pinchGPoints[ 0 ].currentPos.distanceTo( delegate.pinchGPoints[ 1 ].currentPos );
                        delegate.lastPinchCenter = delegate.currentPinchCenter = getCenterPoint( delegate.pinchGPoints[ 0 ].currentPos, delegate.pinchGPoints[ 1 ].currentPos );
                    }
                }
            }
        }
    }


    /**
     * @private
     * @inner
     */
    function updatePointersOver( tracker, event, gPoints ) {
        var delegate = THIS[ tracker.hash ],
            pointsList = getGPointsListByType( tracker, gPoints[ 0 ].type ),
            i,
            gPointCount = gPoints.length,
            curGPoint,
            updateGPoint,
            insideElementPressed,
            propagate;

        if ( pointsList ) {
            for ( i = 0; i < gPointCount; i++ ) {
                curGPoint = gPoints[ i ];
                updateGPoint = pointsList.getById( curGPoint.id );

                if ( updateGPoint ) {
                    updateGPoint.insideElement = true;
                    updateGPoint.lastPos = updateGPoint.currentPos;
                    updateGPoint.lastTime = updateGPoint.currentTime;
                    updateGPoint.currentPos = curGPoint.currentPos;
                    updateGPoint.currentTime = curGPoint.currentTime;
                    insideElementPressed = updateGPoint.insideElementPressed;
                }
                else {
                    insideElementPressed = false;
                }

                // Enter
                if ( tracker.enterHandler ) {
                    propagate = tracker.enterHandler(
                        {
                            eventSource:          tracker,
                            pointerType:          curGPoint.type,
                            position:             getPointRelativeToAbsolute( curGPoint.currentPos, tracker.element ),
                            insideElementPressed: insideElementPressed,
                            buttonDownAny:        IS_BUTTON_DOWN,
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
    }


    /**
     * @private
     * @inner
     */
    function updatePointersOut( tracker, event, gPoints ) {
        var delegate = THIS[ tracker.hash ],
            pointsList = getGPointsListByType( tracker, gPoints[ 0 ].type ),
            i,
            gPointCount = gPoints.length,
            curGPoint,
            updateGPoint,
            insideElementPressed,
            propagate;

        if ( pointsList ) {
            for ( i = 0; i < gPointCount; i++ ) {
                curGPoint = gPoints[ i ];
                updateGPoint = pointsList.getById( curGPoint.id );

                if ( updateGPoint ) {
                    updateGPoint.insideElement = false;
                    updateGPoint.lastPos = updateGPoint.currentPos;
                    updateGPoint.lastTime = updateGPoint.currentTime;
                    updateGPoint.currentPos = curGPoint.currentPos;
                    updateGPoint.currentTime = curGPoint.currentTime;
                    insideElementPressed = updateGPoint.insideElementPressed;
                }
                else {
                    insideElementPressed = false;
                }

                // Exit
                if ( tracker.exitHandler ) {
                    propagate = tracker.exitHandler(
                        {
                            eventSource:          tracker,
                            pointerType:          curGPoint.type,
                            position:             getPointRelativeToAbsolute( curGPoint.currentPos, tracker.element ),
                            insideElementPressed: insideElementPressed,
                            buttonDownAny:        IS_BUTTON_DOWN,
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
    }


    /**
     * @private
     * @inner
     */
    function updatePointers( tracker, event, gPoints ) {
        // Pointer(s) changed coordinates, button state, pressure, tilt, or contact geometry (e.g. width and height)
        var delegate = THIS[ tracker.hash ],
            pointsList = getGPointsListByType( tracker, gPoints[ 0 ].type ),
            pointsListLength,
            i,
            gPointCount = gPoints.length,
            curGPoint,
            updateGPoint,
            gPointArray,
            delta,
            propagate;

        if ( pointsList ) {
            pointsListLength = pointsList.getLength();

            for ( i = 0; i < gPointCount; i++ ) {
                curGPoint = gPoints[ i ];
                updateGPoint = pointsList.getById( curGPoint.id );

                if ( updateGPoint ) {
                    updateGPoint.lastPos = updateGPoint.currentPos;
                    updateGPoint.lastTime = updateGPoint.currentTime;
                    updateGPoint.currentPos = curGPoint.currentPos;
                    updateGPoint.currentTime = curGPoint.currentTime;
                }
            }

            // Stop (mouse only)
            if ( gPoints[ 0 ].type === 'mouse' && tracker.stopHandler ) {
                clearTimeout( tracker.stopTimeOut );
                tracker.stopTimeOut = setTimeout( function() {
                    handlePointerStop( tracker, event, gPoints[ 0 ].type );
                }, tracker.stopDelay );
            }

            if ( pointsListLength === 0 ) {
                // Move (no contacts, mouse or other hover-capable device)
                if ( tracker.moveHandler ) {
                    propagate = tracker.moveHandler(
                        {
                            eventSource:          tracker,
                            pointerType:          gPoints[ 0 ].type,
                            position:             getPointRelativeToAbsolute( gPoints[ 0 ].currentPos, tracker.element ),
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
            }
            else if ( pointsListLength === 1 ) {
                // Move (1 contact)
                if ( tracker.moveHandler ) {
                    updateGPoint = pointsList.asArray()[ 0 ];
                    propagate = tracker.moveHandler(
                        {
                            eventSource:          tracker,
                            pointerType:          updateGPoint.type,
                            position:             getPointRelativeToAbsolute( updateGPoint.currentPos, tracker.element ),
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
            }
            else if ( pointsListLength === 2 ) {
                // Move (2 contacts, use center)
                if ( tracker.moveHandler ) {
                    gPointArray = pointsList.asArray();
                    propagate = tracker.moveHandler(
                        {
                            eventSource:          tracker,
                            pointerType:          gPointArray[ 0 ].type,
                            position:             getPointRelativeToAbsolute( getCenterPoint( gPointArray[ 0 ].currentPos, gPointArray[ 1 ].currentPos ), tracker.element ),
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
    }


    /**
     * @private
     * @inner
     */
    function removePointers( tracker, event, gPoints ) {
        var delegate = THIS[ tracker.hash ],
            pointsList = getGPointsListByType( tracker, gPoints[ 0 ].type ),
            pointsListLength,
            propagate,
            insideElementPressed,
            insideElementReleased,
            releasePoint,
            releaseTime,
            i,
            gPointCount = gPoints.length,
            curGPoint,
            updateGPoint,
            removedGPoint;

        if ( pointsList ) {
            for ( i = 0; i < gPointCount; i++ ) {
                curGPoint = gPoints[ i ];

                removedGPoint = pointsList.getById( curGPoint.id );

                if ( removedGPoint ) {

                    releasePoint = removedGPoint.currentPos;
                    releaseTime = removedGPoint.currentTime;

                    if ( tracker.dragHandler || tracker.dragEndHandler || tracker.pinchHandler ) {
                        $.MouseTracker.gesturePointVelocityTracker.removePoint( tracker, removedGPoint );
                    }

                    pointsListLength = pointsList.removeById( curGPoint.id );

                    if ( pointsListLength === 0 ) {

                        insideElementPressed = removedGPoint.insideElementPressed;
                        insideElementReleased = removedGPoint.insideElement || $.pointInElement( tracker.element, releasePoint );

                        // Release
                        if ( tracker.releaseHandler ) {
                            propagate = tracker.releaseHandler(
                                {
                                    eventSource:           tracker,
                                    pointerType:           removedGPoint.type,
                                    position:              getPointRelativeToAbsolute( releasePoint, tracker.element ),
                                    insideElementPressed:  insideElementPressed,
                                    insideElementReleased: insideElementReleased,
                                    isTouchEvent:          removedGPoint.type === 'touch',
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
                        if ( tracker.dragEndHandler ) {
                            propagate = tracker.dragEndHandler(
                                {
                                    eventSource:          tracker,
                                    pointerType:          removedGPoint.type,
                                    position:             getPointRelativeToAbsolute( removedGPoint.currentPos, tracker.element ),
                                    speed:                removedGPoint.speed,
                                    direction:            removedGPoint.direction,
                                    shift:                event.shiftKey,
                                    isTouchEvent:         removedGPoint.type === 'touch',
                                    originalEvent:        event,
                                    preventDefaultAction: false,
                                    userData:             tracker.userData
                                }
                            );
                            if ( propagate === false ) {
                                $.cancelEvent( event );
                            }
                        }

                        // Click
                        if ( tracker.clickHandler && insideElementPressed && insideElementReleased ) {
                            var time = releaseTime - removedGPoint.startTime,
                                distance = removedGPoint.startPos.distanceTo( releasePoint ),
                                quick = time <= tracker.clickTimeThreshold &&
                                           distance <= tracker.clickDistThreshold;

                            propagate = tracker.clickHandler(
                                {
                                    eventSource:          tracker,
                                    pointerType:          curGPoint.type,
                                    position:             getPointRelativeToAbsolute( curGPoint.currentPos, tracker.element ),
                                    quick:                quick,
                                    shift:                event.shiftKey,
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
                    //else if ( pointsListLength === 1 ) {
                    //}
                    else if ( pointsListLength === 2 ) {
                        if ( tracker.pinchHandler && curGPoint.type === 'touch' ) {
                            // Reset for pinch
                            delegate.pinchGPoints = pointsList.asArray();
                            delegate.lastPinchDist = delegate.currentPinchDist = delegate.pinchGPoints[ 0 ].currentPos.distanceTo( delegate.pinchGPoints[ 1 ].currentPos );
                            delegate.lastPinchCenter = delegate.currentPinchCenter = getCenterPoint( delegate.pinchGPoints[ 0 ].currentPos, delegate.pinchGPoints[ 1 ].currentPos );
                        }
                    }
                }
            }
        }
    }


    /**
     * @private
     * @inner
     */
    function cancelPointers( tracker, event, gPoints ) {
        removePointers( tracker, event, gPoints );
    }


///////////////////////////////////////////////////////////////////////////////
// Deprecated
///////////////////////////////////////////////////////////////////////////////

   // TODO Do we really need these anymore (used as buttonDownAny in enterHandler/exitHandler callbacks)?
    //      Surely there's a more robust and elegant solution...

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
