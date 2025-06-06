/*
 * OpenSeadragon - MouseTracker
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

    // All MouseTracker instances
    var MOUSETRACKERS  = [];

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
     * @param {Boolean} [options.startDisabled=false]
     *      If true, event tracking on the element will not start until
     *      {@link OpenSeadragon.MouseTracker.setTracking|setTracking} is called.
     * @param {Number} [options.clickTimeThreshold=300]
     *      The number of milliseconds within which a pointer down-up event combination
     *      will be treated as a click gesture.
     * @param {Number} [options.clickDistThreshold=5]
     *      The maximum distance allowed between a pointer down event and a pointer up event
     *      to be treated as a click gesture.
     * @param {Number} [options.dblClickTimeThreshold=300]
     *      The number of milliseconds within which two pointer down-up event combinations
     *      will be treated as a double-click gesture.
     * @param {Number} [options.dblClickDistThreshold=20]
     *      The maximum distance allowed between two pointer click events
     *      to be treated as a click gesture.
     * @param {Number} [options.stopDelay=50]
     *      The number of milliseconds without pointer move before the stop
     *      event is fired.
     * @param {OpenSeadragon.EventHandler} [options.preProcessEventHandler=null]
     *      An optional handler for controlling DOM event propagation and processing.
     * @param {OpenSeadragon.EventHandler} [options.contextMenuHandler=null]
     *      An optional handler for contextmenu.
     * @param {OpenSeadragon.EventHandler} [options.enterHandler=null]
     *      An optional handler for pointer enter.
     * @param {OpenSeadragon.EventHandler} [options.leaveHandler=null]
     *      An optional handler for pointer leave.
     * @param {OpenSeadragon.EventHandler} [options.exitHandler=null]
     *      An optional handler for pointer leave. <span style="color:red;">Deprecated. Use leaveHandler instead.</span>
     * @param {OpenSeadragon.EventHandler} [options.overHandler=null]
     *      An optional handler for pointer over.
     * @param {OpenSeadragon.EventHandler} [options.outHandler=null]
     *      An optional handler for pointer out.
     * @param {OpenSeadragon.EventHandler} [options.pressHandler=null]
     *      An optional handler for pointer press.
     * @param {OpenSeadragon.EventHandler} [options.nonPrimaryPressHandler=null]
     *      An optional handler for pointer non-primary button press.
     * @param {OpenSeadragon.EventHandler} [options.releaseHandler=null]
     *      An optional handler for pointer release.
     * @param {OpenSeadragon.EventHandler} [options.nonPrimaryReleaseHandler=null]
     *      An optional handler for pointer non-primary button release.
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
     * @param {OpenSeadragon.EventHandler} [options.keyDownHandler=null]
     *      An optional handler for keydown.
     * @param {OpenSeadragon.EventHandler} [options.keyUpHandler=null]
     *      An optional handler for keyup.
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

        MOUSETRACKERS.push( this );

        var args = arguments;

        if ( !$.isPlainObject( options ) ) {
            options = {
                element:            args[ 0 ],
                clickTimeThreshold: args[ 1 ],
                clickDistThreshold: args[ 2 ]
            };
        }

        this.hash               = uniqueHash(); // An unique hash for this tracker.
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
        this.clickTimeThreshold = options.clickTimeThreshold || $.DEFAULT_SETTINGS.clickTimeThreshold;
        /**
         * The maximum distance allowed between a pointer down event and a pointer up event
         * to be treated as a click gesture.
         * @member {Number} clickDistThreshold
         * @memberof OpenSeadragon.MouseTracker#
         */
        this.clickDistThreshold = options.clickDistThreshold || $.DEFAULT_SETTINGS.clickDistThreshold;
        /**
         * The number of milliseconds within which two pointer down-up event combinations
         * will be treated as a double-click gesture.
         * @member {Number} dblClickTimeThreshold
         * @memberof OpenSeadragon.MouseTracker#
         */
        this.dblClickTimeThreshold = options.dblClickTimeThreshold || $.DEFAULT_SETTINGS.dblClickTimeThreshold;
        /**
         * The maximum distance allowed between two pointer click events
         * to be treated as a double-click gesture.
         * @member {Number} dblClickDistThreshold
         * @memberof OpenSeadragon.MouseTracker#
         */
        this.dblClickDistThreshold = options.dblClickDistThreshold || $.DEFAULT_SETTINGS.dblClickDistThreshold;
        /*eslint-disable no-multi-spaces*/
        this.userData              = options.userData          || null;
        this.stopDelay             = options.stopDelay         || 50;

        this.preProcessEventHandler   = options.preProcessEventHandler   || null;
        this.contextMenuHandler       = options.contextMenuHandler       || null;
        this.enterHandler             = options.enterHandler             || null;
        this.leaveHandler             = options.leaveHandler             || null;
        this.exitHandler              = options.exitHandler              || null; // Deprecated v2.5.0
        this.overHandler              = options.overHandler              || null;
        this.outHandler               = options.outHandler               || null;
        this.pressHandler             = options.pressHandler             || null;
        this.nonPrimaryPressHandler   = options.nonPrimaryPressHandler   || null;
        this.releaseHandler           = options.releaseHandler           || null;
        this.nonPrimaryReleaseHandler = options.nonPrimaryReleaseHandler || null;
        this.moveHandler              = options.moveHandler              || null;
        this.scrollHandler            = options.scrollHandler            || null;
        this.clickHandler             = options.clickHandler             || null;
        this.dblClickHandler          = options.dblClickHandler          || null;
        this.dragHandler              = options.dragHandler              || null;
        this.dragEndHandler           = options.dragEndHandler           || null;
        this.pinchHandler             = options.pinchHandler             || null;
        this.stopHandler              = options.stopHandler              || null;
        this.keyDownHandler           = options.keyDownHandler           || null;
        this.keyUpHandler             = options.keyUpHandler             || null;
        this.keyHandler               = options.keyHandler               || null;
        this.focusHandler             = options.focusHandler             || null;
        this.blurHandler              = options.blurHandler              || null;
        /*eslint-enable no-multi-spaces*/

        //Store private properties in a scope sealed hash map
        var _this = this;

        /**
         * @private
         * @property {Boolean} tracking
         *      Are we currently tracking pointer events for this element.
         */
        THIS[ this.hash ] = {
            click:                 function ( event ) { onClick( _this, event ); },
            dblclick:              function ( event ) { onDblClick( _this, event ); },
            keydown:               function ( event ) { onKeyDown( _this, event ); },
            keyup:                 function ( event ) { onKeyUp( _this, event ); },
            keypress:              function ( event ) { onKeyPress( _this, event ); },
            focus:                 function ( event ) { onFocus( _this, event ); },
            blur:                  function ( event ) { onBlur( _this, event ); },
            contextmenu:           function ( event ) { onContextMenu( _this, event ); },

            wheel:                 function ( event ) { onWheel( _this, event ); },
            mousewheel:            function ( event ) { onMouseWheel( _this, event ); },
            DOMMouseScroll:        function ( event ) { onMouseWheel( _this, event ); },
            MozMousePixelScroll:   function ( event ) { onMouseWheel( _this, event ); },

            losecapture:           function ( event ) { onLoseCapture( _this, event ); },

            mouseenter:            function ( event ) { onPointerEnter( _this, event ); },
            mouseleave:            function ( event ) { onPointerLeave( _this, event ); },
            mouseover:             function ( event ) { onPointerOver( _this, event ); },
            mouseout:              function ( event ) { onPointerOut( _this, event ); },
            mousedown:             function ( event ) { onPointerDown( _this, event ); },
            mouseup:               function ( event ) { onPointerUp( _this, event ); },
            mousemove:             function ( event ) { onPointerMove( _this, event ); },

            touchstart:            function ( event ) { onTouchStart( _this, event ); },
            touchend:              function ( event ) { onTouchEnd( _this, event ); },
            touchmove:             function ( event ) { onTouchMove( _this, event ); },
            touchcancel:           function ( event ) { onTouchCancel( _this, event ); },

            gesturestart:          function ( event ) { onGestureStart( _this, event ); }, // Safari/Safari iOS
            gesturechange:         function ( event ) { onGestureChange( _this, event ); }, // Safari/Safari iOS

            gotpointercapture:     function ( event ) { onGotPointerCapture( _this, event ); },
            lostpointercapture:    function ( event ) { onLostPointerCapture( _this, event ); },
            pointerenter:          function ( event ) { onPointerEnter( _this, event ); },
            pointerleave:          function ( event ) { onPointerLeave( _this, event ); },
            pointerover:           function ( event ) { onPointerOver( _this, event ); },
            pointerout:            function ( event ) { onPointerOut( _this, event ); },
            pointerdown:           function ( event ) { onPointerDown( _this, event ); },
            pointerup:             function ( event ) { onPointerUp( _this, event ); },
            pointermove:           function ( event ) { onPointerMove( _this, event ); },
            pointercancel:         function ( event ) { onPointerCancel( _this, event ); },
            pointerupcaptured:     function ( event ) { onPointerUpCaptured( _this, event ); },
            pointermovecaptured:   function ( event ) { onPointerMoveCaptured( _this, event ); },

            tracking:              false,

            // Active pointers lists. Array of GesturePointList objects, one for each pointer device type.
            // GesturePointList objects are added each time a pointer is tracked by a new pointer device type (see getActivePointersListByType()).
            // Active pointers are any pointer being tracked for this element which are in the hit-test area
            //     of the element (for hover-capable devices) and/or have contact or a button press initiated in the element.
            activePointersLists:   [],

            // Tracking for double-click gesture
            lastClickPos:          null,
            dblClickTimeOut:       null,

            // Tracking for pinch gesture
            pinchGPoints:          [],
            lastPinchDist:         0,
            currentPinchDist:      0,
            lastPinchCenter:       null,
            currentPinchCenter:    null,

            // Tracking for drag
            sentDragEvent:         false
        };

        if ( $.MouseTracker.havePointerEvents ) {
            $.setElementPointerEvents( this.element, 'auto' );
        }

        if (this.exitHandler) {
            $.console.error("MouseTracker.exitHandler is deprecated. Use MouseTracker.leaveHandler instead.");
        }

        if ( !options.startDisabled ) {
            this.setTracking( true );
        }
    };

    /** @lends OpenSeadragon.MouseTracker.prototype */
    $.MouseTracker.prototype = {

        /**
         * Clean up any events or objects created by the tracker.
         * @function
         */
        destroy: function () {
            var i;

            stopTracking( this );
            this.element = null;

            for ( i = 0; i < MOUSETRACKERS.length; i++ ) {
                if ( MOUSETRACKERS[ i ] === this ) {
                    MOUSETRACKERS.splice( i, 1 );
                    break;
                }
            }

            THIS[ this.hash ] = null;
            delete THIS[ this.hash ];
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
                len = delegate ? delegate.activePointersLists.length : 0,
                list;

            for ( i = 0; i < len; i++ ) {
                if ( delegate.activePointersLists[ i ].type === type ) {
                    return delegate.activePointersLists[ i ];
                }
            }

            list = new $.MouseTracker.GesturePointList( type );
            if(delegate){
                delegate.activePointersLists.push( list );
            }
            return list;
        },

        /**
         * Returns the total number of pointers currently active on the tracked element.
         * @function
         * @returns {Number}
         */
        getActivePointerCount: function () {
            var delegate = THIS[ this.hash ],
                i,
                len = delegate.activePointersLists.length,
                count = 0;

            for ( i = 0; i < len; i++ ) {
                count += delegate.activePointersLists[ i ].getLength();
            }

            return count;
        },

        /**
         * Do we currently have any assigned gesture handlers.
         * @returns {Boolean} Do we currently have any assigned gesture handlers.
         */
        get hasGestureHandlers() {
            return !!(this.pressHandler ||
                      this.nonPrimaryPressHandler ||
                      this.releaseHandler ||
                      this.nonPrimaryReleaseHandler ||
                      this.clickHandler ||
                      this.dblClickHandler ||
                      this.dragHandler ||
                      this.dragEndHandler ||
                      this.pinchHandler);
        },

        /**
         * Do we currently have a scroll handler.
         * @returns {Boolean} Do we currently have a scroll handler.
         */
        get hasScrollHandler() {
            return !!this.scrollHandler;
        },

        /**
         * Implement or assign implementation to these handlers during or after
         * calling the constructor.
         * @function
         * @param {OpenSeadragon.MouseTracker.EventProcessInfo} eventInfo
         */
        preProcessEventHandler: function () { },

        /**
         * Implement or assign implementation to these handlers during or after
         * calling the constructor.
         * @function
         * @param {Object} event
         * @param {OpenSeadragon.MouseTracker} event.eventSource
         *      A reference to the tracker instance.
         * @param {OpenSeadragon.Point} event.position
         *      The position of the event relative to the tracked element.
         * @param {Object} event.originalEvent
         *      The original event object.
         * @param {Boolean} event.preventDefault
         *      Set to true to prevent the default user-agent's handling of the contextmenu event.
         * @param {Object} event.userData
         *      Arbitrary user-defined object.
         */
        contextMenuHandler: function () { },

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
         * @param {Number} event.pointers
         *      Number of pointers (all types) active in the tracked element.
         * @param {Boolean} event.insideElementPressed
         *      True if the left mouse button is currently being pressed and was
         *      initiated inside the tracked element, otherwise false.
         * @param {Boolean} event.buttonDownAny
         *      Was the button down anywhere in the screen during the event. <span style="color:red;">Deprecated. Use buttons instead.</span>
         * @param {Boolean} event.isTouchEvent
         *      True if the original event is a touch event, otherwise false. <span style="color:red;">Deprecated. Use pointerType and/or originalEvent instead.</span>
         * @param {Object} event.originalEvent
         *      The original event object.
         * @param {Object} event.userData
         *      Arbitrary user-defined object.
         */
        enterHandler: function () { },

        /**
         * Implement or assign implementation to these handlers during or after
         * calling the constructor.
         * @function
         * @since v2.5.0
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
         * @param {Number} event.pointers
         *      Number of pointers (all types) active in the tracked element.
         * @param {Boolean} event.insideElementPressed
         *      True if the left mouse button is currently being pressed and was
         *      initiated inside the tracked element, otherwise false.
         * @param {Boolean} event.buttonDownAny
         *      Was the button down anywhere in the screen during the event. <span style="color:red;">Deprecated. Use buttons instead.</span>
         * @param {Boolean} event.isTouchEvent
         *      True if the original event is a touch event, otherwise false. <span style="color:red;">Deprecated. Use pointerType and/or originalEvent instead.</span>
         * @param {Object} event.originalEvent
         *      The original event object.
         * @param {Object} event.userData
         *      Arbitrary user-defined object.
         */
        leaveHandler: function () { },

        /**
         * Implement or assign implementation to these handlers during or after
         * calling the constructor.
         * @function
         * @deprecated v2.5.0 Use leaveHandler instead
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
         * @param {Number} event.pointers
         *      Number of pointers (all types) active in the tracked element.
         * @param {Boolean} event.insideElementPressed
         *      True if the left mouse button is currently being pressed and was
         *      initiated inside the tracked element, otherwise false.
         * @param {Boolean} event.buttonDownAny
         *      Was the button down anywhere in the screen during the event. <span style="color:red;">Deprecated. Use buttons instead.</span>
         * @param {Boolean} event.isTouchEvent
         *      True if the original event is a touch event, otherwise false. <span style="color:red;">Deprecated. Use pointerType and/or originalEvent instead.</span>
         * @param {Object} event.originalEvent
         *      The original event object.
         * @param {Object} event.userData
         *      Arbitrary user-defined object.
         */
        exitHandler: function () { },

        /**
         * Implement or assign implementation to these handlers during or after
         * calling the constructor.
         * @function
         * @since v2.5.0
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
         * @param {Number} event.pointers
         *      Number of pointers (all types) active in the tracked element.
         * @param {Boolean} event.insideElementPressed
         *      True if the left mouse button is currently being pressed and was
         *      initiated inside the tracked element, otherwise false.
         * @param {Boolean} event.buttonDownAny
         *      Was the button down anywhere in the screen during the event. <span style="color:red;">Deprecated. Use buttons instead.</span>
         * @param {Boolean} event.isTouchEvent
         *      True if the original event is a touch event, otherwise false. <span style="color:red;">Deprecated. Use pointerType and/or originalEvent instead.</span>
         * @param {Object} event.originalEvent
         *      The original event object.
         * @param {Object} event.userData
         *      Arbitrary user-defined object.
         */
        overHandler: function () { },

        /**
         * Implement or assign implementation to these handlers during or after
         * calling the constructor.
         * @function
         * @since v2.5.0
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
         * @param {Number} event.pointers
         *      Number of pointers (all types) active in the tracked element.
         * @param {Boolean} event.insideElementPressed
         *      True if the left mouse button is currently being pressed and was
         *      initiated inside the tracked element, otherwise false.
         * @param {Boolean} event.buttonDownAny
         *      Was the button down anywhere in the screen during the event. <span style="color:red;">Deprecated. Use buttons instead.</span>
         * @param {Boolean} event.isTouchEvent
         *      True if the original event is a touch event, otherwise false. <span style="color:red;">Deprecated. Use pointerType and/or originalEvent instead.</span>
         * @param {Object} event.originalEvent
         *      The original event object.
         * @param {Object} event.userData
         *      Arbitrary user-defined object.
         */
        outHandler: function () { },

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
         * @param {Number} event.button
         *      Button which caused the event.
         *      -1: none, 0: primary/left, 1: aux/middle, 2: secondary/right, 3: X1/back, 4: X2/forward, 5: pen eraser.
         * @param {Number} event.buttons
         *      Current buttons pressed.
         *      Combination of bit flags 0: none, 1: primary (or touch contact), 2: secondary, 4: aux (often middle), 8: X1 (often back), 16: X2 (often forward), 32: pen eraser.
         * @param {Boolean} event.isTouchEvent
         *      True if the original event is a touch event, otherwise false. <span style="color:red;">Deprecated. Use pointerType and/or originalEvent instead.</span>
         * @param {Object} event.originalEvent
         *      The original event object.
         * @param {Object} event.userData
         *      Arbitrary user-defined object.
         */
        nonPrimaryPressHandler: function () { },

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
         * @param {Number} event.button
         *      Button which caused the event.
         *      -1: none, 0: primary/left, 1: aux/middle, 2: secondary/right, 3: X1/back, 4: X2/forward, 5: pen eraser.
         * @param {Number} event.buttons
         *      Current buttons pressed.
         *      Combination of bit flags 0: none, 1: primary (or touch contact), 2: secondary, 4: aux (often middle), 8: X1 (often back), 16: X2 (often forward), 32: pen eraser.
         * @param {Boolean} event.isTouchEvent
         *      True if the original event is a touch event, otherwise false. <span style="color:red;">Deprecated. Use pointerType and/or originalEvent instead.</span>
         * @param {Object} event.originalEvent
         *      The original event object.
         * @param {Object} event.userData
         *      Arbitrary user-defined object.
         */
        nonPrimaryReleaseHandler: function () { },

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
         * @param {Boolean} event.preventDefault
         *      Set to true to prevent the default user-agent's handling of the wheel event.
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
         * @param {Element} event.originalTarget
         *      The DOM element clicked on.
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
         * @param {Boolean} event.ctrl
         *      True if the ctrl key was pressed during this event.
         * @param {Boolean} event.shift
         *      True if the shift key was pressed during this event.
         * @param {Boolean} event.alt
         *      True if the alt key was pressed during this event.
         * @param {Boolean} event.meta
         *      True if the meta key was pressed during this event.
         * @param {Object} event.originalEvent
         *      The original event object.
         * @param {Boolean} event.preventDefault
         *      Set to true to prevent the default user-agent's handling of the keydown event.
         * @param {Object} event.userData
         *      Arbitrary user-defined object.
         */
        keyDownHandler: function () { },

        /**
         * Implement or assign implementation to these handlers during or after
         * calling the constructor.
         * @function
         * @param {Object} event
         * @param {OpenSeadragon.MouseTracker} event.eventSource
         *      A reference to the tracker instance.
         * @param {Number} event.keyCode
         *      The key code that was pressed.
         * @param {Boolean} event.ctrl
         *      True if the ctrl key was pressed during this event.
         * @param {Boolean} event.shift
         *      True if the shift key was pressed during this event.
         * @param {Boolean} event.alt
         *      True if the alt key was pressed during this event.
         * @param {Boolean} event.meta
         *      True if the meta key was pressed during this event.
         * @param {Object} event.originalEvent
         *      The original event object.
         * @param {Boolean} event.preventDefault
         *      Set to true to prevent the default user-agent's handling of the keyup event.
         * @param {Object} event.userData
         *      Arbitrary user-defined object.
         */
        keyUpHandler: function () { },

        /**
         * Implement or assign implementation to these handlers during or after
         * calling the constructor.
         * @function
         * @param {Object} event
         * @param {OpenSeadragon.MouseTracker} event.eventSource
         *      A reference to the tracker instance.
         * @param {Number} event.keyCode
         *      The key code that was pressed.
         * @param {Boolean} event.ctrl
         *      True if the ctrl key was pressed during this event.
         * @param {Boolean} event.shift
         *      True if the shift key was pressed during this event.
         * @param {Boolean} event.alt
         *      True if the alt key was pressed during this event.
         * @param {Boolean} event.meta
         *      True if the meta key was pressed during this event.
         * @param {Object} event.originalEvent
         *      The original event object.
         * @param {Boolean} event.preventDefault
         *      Set to true to prevent the default user-agent's handling of the keypress event.
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
         * @param {Object} event.userData
         *      Arbitrary user-defined object.
         */
        blurHandler: function () { }
    };

    // https://github.com/openseadragon/openseadragon/pull/790
    /**
     * True if inside an iframe, otherwise false.
     * @member {Boolean} isInIframe
     * @private
     * @inner
     */
    var isInIframe = (function() {
        try {
            return window.self !== window.top;
        } catch (e) {
            return true;
        }
    })();

    // https://github.com/openseadragon/openseadragon/pull/790
    /**
     * @function
     * @private
     * @inner
     * @returns {Boolean} True if the target supports DOM Level 2 event subscription methods, otherwise false.
     */
    function canAccessEvents (target) {
        try {
            return target.addEventListener && target.removeEventListener;
        } catch (e) {
            return false;
        }
    }

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

    $.MouseTracker.captureElement = document;

    /**
     * Detect available mouse wheel event name.
     */
    $.MouseTracker.wheelEventName = ( 'onwheel' in document.createElement( 'div' ) ) ? 'wheel' : // Modern browsers support 'wheel'
                                    document.onmousewheel !== undefined ? 'mousewheel' :         // Webkit (and unsupported IE) support at least 'mousewheel'
                                    'DOMMouseScroll';                                            // Assume old Firefox (deprecated)

    /**
     * Detect browser pointer device event model(s) and build appropriate list of events to subscribe to.
     */
    $.MouseTracker.subscribeEvents = [ "click", "dblclick", "keydown", "keyup", "keypress", "focus", "blur", "contextmenu", $.MouseTracker.wheelEventName ];

    if( $.MouseTracker.wheelEventName === "DOMMouseScroll" ) {
        // Older Firefox
        $.MouseTracker.subscribeEvents.push( "MozMousePixelScroll" );
    }

    if ( window.PointerEvent ) {
        // W3C Pointer Event implementations (see http://www.w3.org/TR/pointerevents)
        $.MouseTracker.havePointerEvents = true;
        $.MouseTracker.subscribeEvents.push( "pointerenter", "pointerleave", "pointerover", "pointerout", "pointerdown", "pointerup", "pointermove", "pointercancel" );
        // Pointer events capture support
        $.MouseTracker.havePointerCapture = (function () {
            var divElement = document.createElement( 'div' );
            return $.isFunction( divElement.setPointerCapture ) && $.isFunction( divElement.releasePointerCapture );
        }());
        if ( $.MouseTracker.havePointerCapture ) {
            $.MouseTracker.subscribeEvents.push( "gotpointercapture", "lostpointercapture" );
        }
    } else {
        // Legacy W3C mouse events
        $.MouseTracker.havePointerEvents = false;
        $.MouseTracker.subscribeEvents.push( "mouseenter", "mouseleave", "mouseover", "mouseout", "mousedown", "mouseup", "mousemove" );
        $.MouseTracker.mousePointerId = "legacy-mouse";
        // Legacy mouse events capture support (IE/Firefox only?)
        $.MouseTracker.havePointerCapture = (function () {
            var divElement = document.createElement( 'div' );
            return $.isFunction( divElement.setCapture ) && $.isFunction( divElement.releaseCapture );
        }());
        if ( $.MouseTracker.havePointerCapture ) {
            $.MouseTracker.subscribeEvents.push( "losecapture" );
        }
        // Legacy touch events
        if ( 'ontouchstart' in window ) {
            // iOS, Android, and other W3c Touch Event implementations
            //    (see http://www.w3.org/TR/touch-events/)
            //    (see https://developer.apple.com/library/ios/documentation/AppleApplications/Reference/SafariWebContent/HandlingEvents/HandlingEvents.html)
            //    (see https://developer.apple.com/library/safari/documentation/AppleApplications/Reference/SafariWebContent/HandlingEvents/HandlingEvents.html)
            $.MouseTracker.subscribeEvents.push( "touchstart", "touchend", "touchmove", "touchcancel" );
        }
        if ( 'ongesturestart' in window ) {
            // iOS (see https://developer.apple.com/library/ios/documentation/AppleApplications/Reference/SafariWebContent/HandlingEvents/HandlingEvents.html)
            //   Subscribe to these to prevent default gesture handling
            $.MouseTracker.subscribeEvents.push( "gesturestart", "gesturechange" );
        }
    }


///////////////////////////////////////////////////////////////////////////////
// Classes and typedefs
///////////////////////////////////////////////////////////////////////////////

    /**
     * Used for the processing/disposition of DOM events (propagation, default handling, capture, etc.)
     *
     * @typedef {Object} EventProcessInfo
     * @memberof OpenSeadragon.MouseTracker
     * @since v2.5.0
     *
     * @property {OpenSeadragon.MouseTracker} eventSource
     *      A reference to the tracker instance.
     * @property {Object} originalEvent
     *      The original DOM event object.
     * @property {Number} eventPhase
     *      0 == NONE, 1 == CAPTURING_PHASE, 2 == AT_TARGET, 3 == BUBBLING_PHASE.
     * @property {String} eventType
     *     "keydown", "keyup", "keypress", "focus", "blur", "contextmenu", "gotpointercapture", "lostpointercapture", "pointerenter", "pointerleave", "pointerover", "pointerout", "pointerdown", "pointerup", "pointermove", "pointercancel", "wheel", "click", "dblclick".
     * @property {String} pointerType
     *     "mouse", "touch", "pen", etc.
     * @property {Boolean} isEmulated
     *      True if this is an emulated event. If true, originalEvent is either the event that caused
     *      the emulated event, a synthetic event object created with values from the actual DOM event,
     *      or null if no DOM event applies. Emulated events can occur on eventType "wheel" on legacy mouse-scroll
     *      event emitting user agents.
     * @property {Boolean} isStoppable
     *      True if propagation of the event (e.g. bubbling) can be stopped with stopPropagation/stopImmediatePropagation.
     * @property {Boolean} isCancelable
     *      True if the event's default handling by the browser can be prevented with preventDefault.
     * @property {Boolean} defaultPrevented
     *      True if the event's default handling has already been prevented by a descendent element.
     * @property {Boolean} preventDefault
     *      Set to true to prevent the event's default handling by the browser.
     * @property {Boolean} preventGesture
     *      Set to true to prevent this MouseTracker from generating a gesture from the event.
     *      Valid on eventType "pointerdown".
     * @property {Boolean} stopPropagation
     *      Set to true prevent the event from propagating to ancestor/descendent elements on capture/bubble phase.
     * @property {Boolean} shouldCapture
     *      (Internal Use) Set to true if the pointer should be captured (events (re)targeted to tracker element).
     * @property {Boolean} shouldReleaseCapture
     *      (Internal Use) Set to true if the captured pointer should be released.
     * @property {Object} userData
     *      Arbitrary user-defined object.
     */


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
        /**
         * Current number of captured pointers for the device.
         * @member {Number} captureCount
         * @memberof OpenSeadragon.MouseTracker.GesturePointList#
         */
        this.captureCount = 0;
    };

    /** @lends OpenSeadragon.MouseTracker.GesturePointList.prototype */
    $.MouseTracker.GesturePointList.prototype = {
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
        },

        /**
         * Increment this pointer list's contact count.
         * It will evaluate whether this pointer type is allowed to have multiple contacts.
         * @function
         */
        addContact: function() {
            ++this.contacts;

            if (this.contacts > 1 && (this.type === "mouse" || this.type === "pen")) {
                $.console.warn('GesturePointList.addContact() Implausible contacts value');
                this.contacts = 1;
            }
        },

        /**
         * Decrement this pointer list's contact count.
         * It will make sure the count does not go below 0.
         * @function
         */
        removeContact: function() {
            --this.contacts;

            if (this.contacts < 0) {
                this.contacts = 0;
            }
        }
    };


///////////////////////////////////////////////////////////////////////////////
// Utility functions
///////////////////////////////////////////////////////////////////////////////

    /**
     * Removes all tracked pointers.
     * @private
     * @inner
     */
    function clearTrackedPointers( tracker ) {
        var delegate = THIS[ tracker.hash ],
            i, j,
            pointsList,
            gPoints,
            gPointsToRemove,
            pointerListCount = delegate.activePointersLists.length;

        for ( i = 0; i < pointerListCount; i++ ) {
            pointsList = delegate.activePointersLists[ i ];

            if ( pointsList.getLength() > 0 ) {
                // Make an array containing references to the gPoints in the pointer list
                //   (because calls to stopTrackingPointer() are going to modify the pointer list)
                gPointsToRemove = [];
                gPoints = pointsList.asArray();
                for ( j = 0; j < gPoints.length; j++ ) {
                    gPointsToRemove.push( gPoints[ j ] );
                }

                // Release and remove all gPoints from the pointer list
                for ( j = 0; j < gPointsToRemove.length; j++ ) {
                    stopTrackingPointer( tracker, pointsList, gPointsToRemove[ j ] );
                }
            }
        }

        for ( i = 0; i < pointerListCount; i++ ) {
            delegate.activePointersLists.pop();
        }

        delegate.sentDragEvent = false;
    }

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
                    event === $.MouseTracker.wheelEventName ? { passive: false, capture: false } : false
                );
            }

            clearTrackedPointers( tracker );

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

            clearTrackedPointers( tracker );

            delegate.tracking = false;
        }
    }

    /**
     * @private
     * @inner
     */
    function getCaptureEventParams( tracker, pointerType ) {
        var delegate = THIS[ tracker.hash ];

        if ( pointerType === 'pointerevent' ) {
            return {
                upName: 'pointerup',
                upHandler: delegate.pointerupcaptured,
                moveName: 'pointermove',
                moveHandler: delegate.pointermovecaptured
            };
        } else if ( pointerType === 'mouse' ) {
            return {
                upName: 'pointerup',
                upHandler: delegate.pointerupcaptured,
                moveName: 'pointermove',
                moveHandler: delegate.pointermovecaptured
            };
        } else if ( pointerType === 'touch' ) {
            return {
                upName: 'touchend',
                upHandler: delegate.touchendcaptured,
                moveName: 'touchmove',
                moveHandler: delegate.touchmovecaptured
            };
        } else {
            throw new Error( "MouseTracker.getCaptureEventParams: Unknown pointer type." );
        }
    }

    /**
     * Begin capturing pointer events to the tracked element.
     * @private
     * @inner
     */
    function capturePointer( tracker, gPoint ) {
        var eventParams;

        if ( $.MouseTracker.havePointerCapture ) {
            if ( $.MouseTracker.havePointerEvents ) {
                // Can throw NotFoundError (InvalidPointerId Firefox < 82)
                //   (should never happen so we'll log a warning)
                try {
                    tracker.element.setPointerCapture( gPoint.id );
                    //$.console.log('element.setPointerCapture() called');
                } catch ( e ) {
                    $.console.warn('setPointerCapture() called on invalid pointer ID');
                    return;
                }
            } else {
                tracker.element.setCapture( true );
                //$.console.log('element.setCapture() called');
            }
        } else {
            // Emulate mouse capture by hanging listeners on the document object.
            //    (Note we listen on the capture phase so the captured handlers will get called first)
            // eslint-disable-next-line no-use-before-define
            //$.console.log('Emulated mouse capture set');
            eventParams = getCaptureEventParams( tracker, $.MouseTracker.havePointerEvents ? 'pointerevent' : gPoint.type );
            // https://github.com/openseadragon/openseadragon/pull/790
            if (isInIframe && canAccessEvents(window.top)) {
                $.addEvent(
                    window.top,
                    eventParams.upName,
                    eventParams.upHandler,
                    true
                );
            }
            $.addEvent(
                $.MouseTracker.captureElement,
                eventParams.upName,
                eventParams.upHandler,
                true
            );
            $.addEvent(
                $.MouseTracker.captureElement,
                eventParams.moveName,
                eventParams.moveHandler,
                true
            );
        }

        updatePointerCaptured( tracker, gPoint, true );
    }


    /**
     * Stop capturing pointer events to the tracked element.
     * @private
     * @inner
     */
    function releasePointer( tracker, gPoint ) {
        var eventParams;
        var pointsList;
        var cachedGPoint;

        if ( $.MouseTracker.havePointerCapture ) {
            if ( $.MouseTracker.havePointerEvents ) {
                pointsList = tracker.getActivePointersListByType( gPoint.type );
                cachedGPoint = pointsList.getById( gPoint.id );
                if ( !cachedGPoint || !cachedGPoint.captured ) {
                    return;
                }
                // Can throw NotFoundError (InvalidPointerId Firefox < 82)
                //   (should never happen, but it does on Firefox 79 touch so we won't log a warning)
                try {
                    tracker.element.releasePointerCapture( gPoint.id );
                    //$.console.log('element.releasePointerCapture() called');
                } catch ( e ) {
                    //$.console.warn('releasePointerCapture() called on invalid pointer ID');
                }
            } else {
                tracker.element.releaseCapture();
                //$.console.log('element.releaseCapture() called');
            }
        } else {
            // Emulate mouse capture by hanging listeners on the document object.
            //    (Note we listen on the capture phase so the captured handlers will get called first)
            //$.console.log('Emulated mouse capture release');
            eventParams = getCaptureEventParams( tracker, $.MouseTracker.havePointerEvents ? 'pointerevent' : gPoint.type );
            // https://github.com/openseadragon/openseadragon/pull/790
            if (isInIframe && canAccessEvents(window.top)) {
                $.removeEvent(
                    window.top,
                    eventParams.upName,
                    eventParams.upHandler,
                    true
                );
            }
            $.removeEvent(
                $.MouseTracker.captureElement,
                eventParams.moveName,
                eventParams.moveHandler,
                true
            );
            $.removeEvent(
                $.MouseTracker.captureElement,
                eventParams.upName,
                eventParams.upHandler,
                true
            );
        }

        updatePointerCaptured( tracker, gPoint, false );
    }


    /**
     * Note: Called for both pointer events and legacy mouse events
     *         ($.MouseTracker.havePointerEvents determines which)
     * @private
     * @inner
     */
    function getPointerId( event ) {
        return ( $.MouseTracker.havePointerEvents ) ? event.pointerId : $.MouseTracker.mousePointerId;
    }


    /**
     * Gets a W3C Pointer Events model compatible pointer type string from a DOM pointer event.
     *
     * Note: Called for both pointer events and legacy mouse events
     *         ($.MouseTracker.havePointerEvents determines which)
     * @private
     * @inner
     */
    function getPointerType( event ) {
        return $.MouseTracker.havePointerEvents && event.pointerType ? event.pointerType : 'mouse';
    }


    /**
     * Note: Called for both pointer events and legacy mouse events
     *         ($.MouseTracker.havePointerEvents determines which)
     * @private
     * @inner
     */
    function getIsPrimary( event ) {
        return ( $.MouseTracker.havePointerEvents ) ? event.isPrimary : true;
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
        //$.console.log('click ' + (tracker.userData ? tracker.userData.toString() : ''));

        var eventInfo = {
            originalEvent: event,
            eventType: 'click',
            pointerType: 'mouse',
            isEmulated: false
        };
        preProcessEvent( tracker, eventInfo );

        if ( eventInfo.preventDefault && !eventInfo.defaultPrevented ) {
            $.cancelEvent( event );
        }
        if ( eventInfo.stopPropagation ) {
            $.stopEvent( event );
        }
    }


    /**
     * @private
     * @inner
     */
    function onDblClick( tracker, event ) {
        //$.console.log('dblclick ' + (tracker.userData ? tracker.userData.toString() : ''));

        var eventInfo = {
            originalEvent: event,
            eventType: 'dblclick',
            pointerType: 'mouse',
            isEmulated: false
        };
        preProcessEvent( tracker, eventInfo );

        if ( eventInfo.preventDefault && !eventInfo.defaultPrevented ) {
            $.cancelEvent( event );
        }
        if ( eventInfo.stopPropagation ) {
            $.stopEvent( event );
        }
    }


    /**
     * @private
     * @inner
     */
    function onKeyDown( tracker, event ) {
        //$.console.log( "keydown %s %s %s %s %s", event.keyCode, event.charCode, event.ctrlKey, event.shiftKey, event.altKey );
        var eventArgs = null;

        var eventInfo = {
            originalEvent: event,
            eventType: 'keydown',
            pointerType: '',
            isEmulated: false
        };
        preProcessEvent( tracker, eventInfo );

        if ( tracker.keyDownHandler && !eventInfo.preventGesture && !eventInfo.defaultPrevented ) {
            eventArgs = {
                eventSource:          tracker,
                keyCode:              event.keyCode ? event.keyCode : event.charCode,
                ctrl:                 event.ctrlKey,
                shift:                event.shiftKey,
                alt:                  event.altKey,
                meta:                 event.metaKey,
                originalEvent:        event,
                preventDefault:       eventInfo.preventDefault || eventInfo.defaultPrevented,
                userData:             tracker.userData
            };

            tracker.keyDownHandler( eventArgs );
        }

        if ( ( eventArgs && eventArgs.preventDefault ) || ( eventInfo.preventDefault && !eventInfo.defaultPrevented ) ) {
                $.cancelEvent( event );
        }
        if ( eventInfo.stopPropagation ) {
            $.stopEvent( event );
        }
    }


    /**
     * @private
     * @inner
     */
    function onKeyUp( tracker, event ) {
        //$.console.log( "keyup %s %s %s %s %s", event.keyCode, event.charCode, event.ctrlKey, event.shiftKey, event.altKey );

        var eventArgs = null;

        var eventInfo = {
            originalEvent: event,
            eventType: 'keyup',
            pointerType: '',
            isEmulated: false
        };
        preProcessEvent( tracker, eventInfo );

        if ( tracker.keyUpHandler && !eventInfo.preventGesture && !eventInfo.defaultPrevented ) {
            eventArgs = {
                eventSource:          tracker,
                keyCode:              event.keyCode ? event.keyCode : event.charCode,
                ctrl:                 event.ctrlKey,
                shift:                event.shiftKey,
                alt:                  event.altKey,
                meta:                 event.metaKey,
                originalEvent:        event,
                preventDefault:       eventInfo.preventDefault || eventInfo.defaultPrevented,
                userData:             tracker.userData
            };

            tracker.keyUpHandler( eventArgs );
        }

        if ( ( eventArgs && eventArgs.preventDefault ) || ( eventInfo.preventDefault && !eventInfo.defaultPrevented ) ) {
            $.cancelEvent( event );
        }
        if ( eventInfo.stopPropagation ) {
            $.stopEvent( event );
        }
    }


    /**
     * @private
     * @inner
     */
    function onKeyPress( tracker, event ) {
        //$.console.log( "keypress %s %s %s %s %s", event.keyCode, event.charCode, event.ctrlKey, event.shiftKey, event.altKey );

        var eventArgs = null;

        var eventInfo = {
            originalEvent: event,
            eventType: 'keypress',
            pointerType: '',
            isEmulated: false
        };
        preProcessEvent( tracker, eventInfo );

        if ( tracker.keyHandler && !eventInfo.preventGesture && !eventInfo.defaultPrevented ) {
            eventArgs = {
                eventSource:          tracker,
                keyCode:              event.keyCode ? event.keyCode : event.charCode,
                ctrl:                 event.ctrlKey,
                shift:                event.shiftKey,
                alt:                  event.altKey,
                meta:                 event.metaKey,
                originalEvent:        event,
                preventDefault:       eventInfo.preventDefault || eventInfo.defaultPrevented,
                userData:             tracker.userData
            };

            tracker.keyHandler( eventArgs );
        }

        if ( ( eventArgs && eventArgs.preventDefault ) || ( eventInfo.preventDefault && !eventInfo.defaultPrevented ) ) {
            $.cancelEvent( event );
        }
        if ( eventInfo.stopPropagation ) {
            $.stopEvent( event );
        }
    }


    /**
     * @private
     * @inner
     */
    function onFocus( tracker, event ) {
        //$.console.log('focus  ' + (tracker.userData ? tracker.userData.toString() : ''));

        // focus doesn't bubble and is not cancelable, but we call
        //   preProcessEvent() so it's dispatched to preProcessEventHandler
        //   if necessary
        var eventInfo = {
            originalEvent: event,
            eventType: 'focus',
            pointerType: '',
            isEmulated: false
        };
        preProcessEvent( tracker, eventInfo );

        if ( tracker.focusHandler && !eventInfo.preventGesture ) {
            tracker.focusHandler(
                {
                    eventSource:          tracker,
                    originalEvent:        event,
                    userData:             tracker.userData
                }
            );
        }
    }


    /**
     * @private
     * @inner
     */
    function onBlur( tracker, event ) {
        //$.console.log('blur  ' + (tracker.userData ? tracker.userData.toString() : ''));

        // blur doesn't bubble and is not cancelable, but we call
        //   preProcessEvent() so it's dispatched to preProcessEventHandler
        //   if necessary
        var eventInfo = {
            originalEvent: event,
            eventType: 'blur',
            pointerType: '',
            isEmulated: false
        };
        preProcessEvent( tracker, eventInfo );

        if ( tracker.blurHandler && !eventInfo.preventGesture ) {
            tracker.blurHandler(
                {
                    eventSource:          tracker,
                    originalEvent:        event,
                    userData:             tracker.userData
                }
            );
        }
    }


    /**
     * @private
     * @inner
     */
    function onContextMenu( tracker, event ) {
        //$.console.log('contextmenu ' + (tracker.userData ? tracker.userData.toString() : '') + ' ' + (event.target === tracker.element ? 'tracker.element' : ''));

        var eventArgs = null;

        var eventInfo = {
            originalEvent: event,
            eventType: 'contextmenu',
            pointerType: 'mouse',
            isEmulated: false
        };
        preProcessEvent( tracker, eventInfo );

        // ContextMenu
        if ( tracker.contextMenuHandler && !eventInfo.preventGesture && !eventInfo.defaultPrevented ) {
            eventArgs = {
                eventSource:          tracker,
                position:             getPointRelativeToAbsolute( getMouseAbsolute( event ), tracker.element ),
                originalEvent:        eventInfo.originalEvent,
                preventDefault:       eventInfo.preventDefault || eventInfo.defaultPrevented,
                userData:             tracker.userData
            };

            tracker.contextMenuHandler( eventArgs );
        }

        if ( ( eventArgs && eventArgs.preventDefault ) || ( eventInfo.preventDefault && !eventInfo.defaultPrevented ) ) {
            $.cancelEvent( event );
        }
        if ( eventInfo.stopPropagation ) {
            $.stopEvent( event );
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
        // Simulate a 'wheel' event
        var simulatedEvent = {
            target:     event.target || event.srcElement,
            type:       "wheel",
            shiftKey:   event.shiftKey || false,
            clientX:    event.clientX,
            clientY:    event.clientY,
            pageX:      event.pageX ? event.pageX : event.clientX,
            pageY:      event.pageY ? event.pageY : event.clientY,
            deltaMode:  event.type === "MozMousePixelScroll" ? 0 : 1, // 0=pixel, 1=line, 2=page
            deltaX:     0,
            deltaZ:     0
        };

        // Calculate deltaY
        if ( $.MouseTracker.wheelEventName === "mousewheel" ) {
            simulatedEvent.deltaY = -event.wheelDelta / $.DEFAULT_SETTINGS.pixelsPerWheelLine;
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
            eventInfo;

        var eventArgs = null;

        // The nDelta variable is gated to provide smooth z-index scrolling
        //   since the mouse wheel allows for substantial deltas meant for rapid
        //   y-index scrolling.
        // event.deltaMode: 0=pixel, 1=line, 2=page
        // TODO: Deltas in pixel mode should be accumulated then a scroll value computed after $.DEFAULT_SETTINGS.pixelsPerWheelLine threshold reached
        nDelta = event.deltaY ? (event.deltaY < 0 ? 1 : -1) : 0;

        eventInfo = {
            originalEvent: event,
            eventType: 'wheel',
            pointerType: 'mouse',
            isEmulated: event !== originalEvent
        };
        preProcessEvent( tracker, eventInfo );

        if ( tracker.scrollHandler && !eventInfo.preventGesture && !eventInfo.defaultPrevented ) {
            eventArgs = {
                eventSource:          tracker,
                pointerType:          'mouse',
                position:             getMouseRelative( event, tracker.element ),
                scroll:               nDelta,
                shift:                event.shiftKey,
                isTouchEvent:         false,
                originalEvent:        originalEvent,
                preventDefault:       eventInfo.preventDefault || eventInfo.defaultPrevented,
                userData:             tracker.userData
            };


            tracker.scrollHandler( eventArgs );
        }

        if ( eventInfo.stopPropagation ) {
            $.stopEvent( originalEvent );
        }
        if ( ( eventArgs && eventArgs.preventDefault ) || ( eventInfo.preventDefault && !eventInfo.defaultPrevented ) ) {
                $.cancelEvent( originalEvent );
        }
}


    /**
     * TODO Never actually seen this event fired, and documentation is tough to find
     * @private
     * @inner
     */
    function onLoseCapture( tracker, event ) {
        //$.console.log('losecapture ' + (tracker.userData ? tracker.userData.toString() : '') + ' ' + (event.target === tracker.element ? 'tracker.element' : ''));

        var gPoint = {
            id: $.MouseTracker.mousePointerId,
            type: 'mouse'
        };

        var eventInfo = {
            originalEvent: event,
            eventType: 'lostpointercapture',
            pointerType: 'mouse',
            isEmulated: false
        };
        preProcessEvent( tracker, eventInfo );

        if ( event.target === tracker.element ) {
            updatePointerCaptured( tracker, gPoint, false );
        }

        if ( eventInfo.stopPropagation ) {
            $.stopEvent( event );
        }
    }


    /**
     * @private
     * @inner
     */
    function onTouchStart( tracker, event ) {
        var time,
            i,
            touchCount = event.changedTouches.length,
            gPoint,
            pointsList = tracker.getActivePointersListByType( 'touch' );

        time = $.now();

        //$.console.log('touchstart ' + (tracker.userData ? tracker.userData.toString() : '') + ' ' + (event.target === tracker.element ? 'tracker.element' : ''));

        if ( pointsList.getLength() > event.touches.length - touchCount ) {
            $.console.warn('Tracked touch contact count doesn\'t match event.touches.length');
        }

        var eventInfo = {
            originalEvent: event,
            eventType: 'pointerdown',
            pointerType: 'touch',
            isEmulated: false
        };
        preProcessEvent( tracker, eventInfo );

        for ( i = 0; i < touchCount; i++ ) {
            gPoint = {
                id: event.changedTouches[ i ].identifier,
                type: 'touch',
                // Simulate isPrimary
                isPrimary: pointsList.getLength() === 0,
                currentPos: getMouseAbsolute( event.changedTouches[ i ] ),
                currentTime: time
            };

            // simulate touchenter on our tracked element
            updatePointerEnter( tracker, eventInfo, gPoint );

            updatePointerDown( tracker, eventInfo, gPoint, 0 );

            updatePointerCaptured( tracker, gPoint, true );
        }

        if ( eventInfo.preventDefault && !eventInfo.defaultPrevented ) {
            $.cancelEvent( event );
        }
        if ( eventInfo.stopPropagation ) {
            $.stopEvent( event );
        }
    }


    /**
     * @private
     * @inner
     */
    function onTouchEnd( tracker, event ) {
        var time,
            i,
            touchCount = event.changedTouches.length,
            gPoint;

        time = $.now();

        //$.console.log('touchend ' + (tracker.userData ? tracker.userData.toString() : '') + ' ' + (event.target === tracker.element ? 'tracker.element' : ''));

        var eventInfo = {
            originalEvent: event,
            eventType: 'pointerup',
            pointerType: 'touch',
            isEmulated: false
        };
        preProcessEvent( tracker, eventInfo );

        for ( i = 0; i < touchCount; i++ ) {
            gPoint = {
                id: event.changedTouches[ i ].identifier,
                type: 'touch',
                currentPos: getMouseAbsolute( event.changedTouches[ i ] ),
                currentTime: time
            };

            updatePointerUp( tracker, eventInfo, gPoint, 0 );

            updatePointerCaptured( tracker, gPoint, false );

            // simulate touchleave on our tracked element
            updatePointerLeave( tracker, eventInfo, gPoint );
        }

        if ( eventInfo.preventDefault && !eventInfo.defaultPrevented ) {
            $.cancelEvent( event );
        }
        if ( eventInfo.stopPropagation ) {
            $.stopEvent( event );
        }
    }


    /**
     * @private
     * @inner
     */
    function onTouchMove( tracker, event ) {
        var time,
            i,
            touchCount = event.changedTouches.length,
            gPoint;

        time = $.now();

        var eventInfo = {
            originalEvent: event,
            eventType: 'pointermove',
            pointerType: 'touch',
            isEmulated: false
        };
        preProcessEvent( tracker, eventInfo );

        for ( i = 0; i < touchCount; i++ ) {
            gPoint = {
                id: event.changedTouches[ i ].identifier,
                type: 'touch',
                currentPos: getMouseAbsolute( event.changedTouches[ i ] ),
                currentTime: time
            };

            updatePointerMove( tracker, eventInfo, gPoint );
        }

        if ( eventInfo.preventDefault && !eventInfo.defaultPrevented ) {
            $.cancelEvent( event );
        }
        if ( eventInfo.stopPropagation ) {
            $.stopEvent( event );
        }
    }


    /**
     * @private
     * @inner
     */
    function onTouchCancel( tracker, event ) {
        var touchCount = event.changedTouches.length,
            i,
            gPoint;

        //$.console.log('touchcancel ' + (tracker.userData ? tracker.userData.toString() : ''));

        var eventInfo = {
            originalEvent: event,
            eventType: 'pointercancel',
            pointerType: 'touch',
            isEmulated: false
        };
        preProcessEvent( tracker, eventInfo );

        for ( i = 0; i < touchCount; i++ ) {
            gPoint = {
                id: event.changedTouches[ i ].identifier,
                type: 'touch'
            };

            //TODO need to only do this if our element is target?
            updatePointerCancel( tracker, eventInfo, gPoint );
        }

        if ( eventInfo.stopPropagation ) {
            $.stopEvent( event );
        }
    }


    /**
     * @private
     * @inner
     */
    function onGestureStart( tracker, event ) {
        if ( !$.eventIsCanceled( event ) ) {
            event.preventDefault();
        }
        return false;
    }


    /**
     * @private
     * @inner
     */
    function onGestureChange( tracker, event ) {
        if ( !$.eventIsCanceled( event ) ) {
            event.preventDefault();
        }
        return false;
    }


    /**
     * @private
     * @inner
     */
    function onGotPointerCapture( tracker, event ) {
        //$.console.log('gotpointercapture ' + (tracker.userData ? tracker.userData.toString() : '') + ' ' + (event.target === tracker.element ? 'tracker.element' : ''));

        var eventInfo = {
            originalEvent: event,
            eventType: 'gotpointercapture',
            pointerType: getPointerType( event ),
            isEmulated: false
        };
        preProcessEvent( tracker, eventInfo );

        if ( event.target === tracker.element ) {
            //$.console.log('gotpointercapture ' + (tracker.userData ? tracker.userData.toString() : ''));
            updatePointerCaptured( tracker, {
                id: event.pointerId,
                type: getPointerType( event )
            }, true );
        }

        if ( eventInfo.stopPropagation ) {
            $.stopEvent( event );
        }
    }


    /**
     * @private
     * @inner
     */
    function onLostPointerCapture( tracker, event ) {
        //$.console.log('lostpointercapture ' + (tracker.userData ? tracker.userData.toString() : '') + ' ' + (event.target === tracker.element ? 'tracker.element' : ''));

        var eventInfo = {
            originalEvent: event,
            eventType: 'lostpointercapture',
            pointerType: getPointerType( event ),
            isEmulated: false
        };
        preProcessEvent( tracker, eventInfo );

        if ( event.target === tracker.element ) {
            //$.console.log('lostpointercapture ' + (tracker.userData ? tracker.userData.toString() : ''));
            updatePointerCaptured( tracker, {
                id: event.pointerId,
                type: getPointerType( event )
            }, false );
        }

        if ( eventInfo.stopPropagation ) {
            $.stopEvent( event );
        }
    }


    /**
     * Note: Called for both pointer events and legacy mouse events
     *         ($.MouseTracker.havePointerEvents determines which)
     *
     * @private
     * @inner
     */
    function onPointerEnter( tracker, event ) {
        //$.console.log('pointerenter ' + (tracker.userData ? tracker.userData.toString() : ''));

        var gPoint = {
            id: getPointerId( event ),
            type: getPointerType( event ),
            isPrimary: getIsPrimary( event ),
            currentPos: getMouseAbsolute( event ),
            currentTime: $.now()
        };

        // pointerenter doesn't bubble and is not cancelable, but we call
        //   preProcessEvent() so it's dispatched to preProcessEventHandler
        //   if necessary
        var eventInfo = {
            originalEvent: event,
            eventType: 'pointerenter',
            pointerType: gPoint.type,
            isEmulated: false
        };
        preProcessEvent( tracker, eventInfo );

        updatePointerEnter( tracker, eventInfo, gPoint );
    }


    /**
     * Note: Called for both pointer events and legacy mouse events
     *         ($.MouseTracker.havePointerEvents determines which)
     *
     * @private
     * @inner
     */
    function onPointerLeave( tracker, event ) {
        //$.console.log('pointerleave ' + (tracker.userData ? tracker.userData.toString() : ''));

        var gPoint = {
            id: getPointerId( event ),
            type: getPointerType( event ),
            isPrimary: getIsPrimary( event ),
            currentPos: getMouseAbsolute( event ),
            currentTime: $.now()
        };

        // pointerleave doesn't bubble and is not cancelable, but we call
        //   preProcessEvent() so it's dispatched to preProcessEventHandler
        //   if necessary
        var eventInfo = {
            originalEvent: event,
            eventType: 'pointerleave',
            pointerType: gPoint.type,
            isEmulated: false
        };
        preProcessEvent( tracker, eventInfo );

        updatePointerLeave( tracker, eventInfo, gPoint );
    }


    /**
     * Note: Called for both pointer events and legacy mouse events
     *         ($.MouseTracker.havePointerEvents determines which)
     *
     * @private
     * @inner
     */
    function onPointerOver( tracker, event ) {
        //$.console.log('pointerover ' + (tracker.userData ? tracker.userData.toString() : '') + ' ' + (event.target === tracker.element ? 'tracker.element' : ''));

        var gPoint = {
            id: getPointerId( event ),
            type: getPointerType( event ),
            isPrimary: getIsPrimary( event ),
            currentPos: getMouseAbsolute( event ),
            currentTime: $.now()
        };

        var eventInfo = {
            originalEvent: event,
            eventType: 'pointerover',
            pointerType: gPoint.type,
            isEmulated: false
        };
        preProcessEvent( tracker, eventInfo );

        updatePointerOver( tracker, eventInfo, gPoint );

        if ( eventInfo.preventDefault && !eventInfo.defaultPrevented ) {
            $.cancelEvent( event );
        }
        if ( eventInfo.stopPropagation ) {
            $.stopEvent( event );
        }
    }


    /**
     * Note: Called for both pointer events and legacy mouse events
     *         ($.MouseTracker.havePointerEvents determines which)
     *
     * @private
     * @inner
     */
    function onPointerOut( tracker, event ) {
        //$.console.log('pointerout ' + (tracker.userData ? tracker.userData.toString() : '') + ' ' + (event.target === tracker.element ? 'tracker.element' : ''));

        var gPoint = {
            id: getPointerId( event ),
            type: getPointerType( event ),
            isPrimary: getIsPrimary( event ),
            currentPos: getMouseAbsolute( event ),
            currentTime: $.now()
        };

        var eventInfo = {
            originalEvent: event,
            eventType: 'pointerout',
            pointerType: gPoint.type,
            isEmulated: false
        };
        preProcessEvent( tracker, eventInfo );

        updatePointerOut( tracker, eventInfo, gPoint );

        if ( eventInfo.preventDefault && !eventInfo.defaultPrevented ) {
            $.cancelEvent( event );
        }
        if ( eventInfo.stopPropagation ) {
            $.stopEvent( event );
        }
    }


    /**
     * Note: Called for both pointer events and legacy mouse events
     *         ($.MouseTracker.havePointerEvents determines which)
     *
     * @private
     * @inner
     */
    function onPointerDown( tracker, event ) {
        var gPoint = {
            id: getPointerId( event ),
            type: getPointerType( event ),
            isPrimary: getIsPrimary( event ),
            currentPos: getMouseAbsolute( event ),
            currentTime: $.now()
        };

        // Most browsers implicitly capture touch pointer events
        // Note no IE versions (unsupported) have element.hasPointerCapture() so
        //    no implicit pointer capture possible
        // var implicitlyCaptured = ($.MouseTracker.havePointerEvents &&
        //                         event.target.hasPointerCapture &&
        //                         $.Browser.vendor !== $.BROWSERS.IE) ?
        //                         event.target.hasPointerCapture(event.pointerId) : false;
        var implicitlyCaptured = $.MouseTracker.havePointerEvents &&
                                gPoint.type === 'touch';

        //$.console.log('pointerdown ' + (tracker.userData ? tracker.userData.toString() : '') + ' ' + (event.target === tracker.element ? 'tracker.element' : ''));

        var eventInfo = {
            originalEvent: event,
            eventType: 'pointerdown',
            pointerType: gPoint.type,
            isEmulated: false
        };
        preProcessEvent( tracker, eventInfo );

        updatePointerDown( tracker, eventInfo, gPoint, event.button );

        if ( eventInfo.preventDefault && !eventInfo.defaultPrevented ) {
            $.cancelEvent( event );
        }
        if ( eventInfo.stopPropagation ) {
            $.stopEvent( event );
        }
        if ( eventInfo.shouldCapture ) {
            if ( implicitlyCaptured ) {
                updatePointerCaptured( tracker, gPoint, true );
            } else {
                capturePointer( tracker, gPoint );
            }
        }
    }


    /**
     * Note: Called for both pointer events and legacy mouse events
     *         ($.MouseTracker.havePointerEvents determines which)
     *
     * @private
     * @inner
     */
    function onPointerUp( tracker, event ) {
        handlePointerUp( tracker, event );
    }


    /**
     * Note: Called for both pointer events and legacy mouse events
     *         ($.MouseTracker.havePointerEvents determines which)
     *
     * This handler is attached to the window object (on the capture phase) to emulate mouse capture.
     * onPointerUp is still attached to the tracked element, so stop propagation to avoid processing twice.
     *
     * @private
     * @inner
     */
    function onPointerUpCaptured( tracker, event ) {
        var pointsList = tracker.getActivePointersListByType( getPointerType( event ) );
        if ( pointsList.getById( event.pointerId ) ) {
            handlePointerUp( tracker, event );
        }
        $.stopEvent( event );
    }


    /**
     * Note: Called for both pointer events and legacy mouse events
     *         ($.MouseTracker.havePointerEvents determines which)
     *
     * @private
     * @inner
     */
    function handlePointerUp( tracker, event ) {
        var gPoint;

        //$.console.log('pointerup ' + (tracker.userData ? tracker.userData.toString() : '') + ' ' + (event.target === tracker.element ? 'tracker.element' : ''));

        gPoint = {
            id: getPointerId( event ),
            type: getPointerType( event ),
            isPrimary: getIsPrimary( event ),
            currentPos: getMouseAbsolute( event ),
            currentTime: $.now()
        };

        var eventInfo = {
            originalEvent: event,
            eventType: 'pointerup',
            pointerType: gPoint.type,
            isEmulated: false
        };
        preProcessEvent( tracker, eventInfo );

        updatePointerUp( tracker, eventInfo, gPoint, event.button );

        if ( eventInfo.preventDefault && !eventInfo.defaultPrevented ) {
            $.cancelEvent( event );
        }
        if ( eventInfo.stopPropagation ) {
            $.stopEvent( event );
        }

        // Per spec, pointerup events are supposed to release capture. Not all browser
        //   versions have adhered to the spec, and there's no harm in releasing
        //   explicitly
        if ( eventInfo.shouldReleaseCapture ) {
            if ( event.target === tracker.element ) {
                releasePointer( tracker, gPoint );
            } else {
                updatePointerCaptured( tracker, gPoint, false );
            }
        }
    }


    /**
     * Note: Called for both pointer events and legacy mouse events
     *         ($.MouseTracker.havePointerEvents determines which)
     *
     * @private
     * @inner
     */
    function onPointerMove( tracker, event ) {
        handlePointerMove( tracker, event );
    }


    /**
     * Note: Called for both pointer events and legacy mouse events
     *         ($.MouseTracker.havePointerEvents determines which)
     *
     * This handler is attached to the window object (on the capture phase) to emulate mouse capture.
     * onPointerMove is still attached to the tracked element, so stop propagation to avoid processing twice.
     *
     * @private
     * @inner
     */
    function onPointerMoveCaptured( tracker, event ) {
        var pointsList = tracker.getActivePointersListByType( getPointerType( event ) );
        if ( pointsList.getById( event.pointerId ) ) {
            handlePointerMove( tracker, event );
        }
        $.stopEvent( event );
    }


    /**
     * Note: Called for both pointer events and legacy mouse events
     *         ($.MouseTracker.havePointerEvents determines which)
     *
     * @private
     * @inner
     */
    function handlePointerMove( tracker, event ) {
        // Pointer changed coordinates, button state, pressure, tilt, or contact geometry (e.g. width and height)

        var gPoint = {
            id: getPointerId( event ),
            type: getPointerType( event ),
            isPrimary: getIsPrimary( event ),
            currentPos: getMouseAbsolute( event ),
            currentTime: $.now()
        };

        var eventInfo = {
            originalEvent: event,
            eventType: 'pointermove',
            pointerType: gPoint.type,
            isEmulated: false
        };
        preProcessEvent( tracker, eventInfo );

        updatePointerMove( tracker, eventInfo, gPoint );

        if ( eventInfo.preventDefault && !eventInfo.defaultPrevented ) {
            $.cancelEvent( event );
        }
        if ( eventInfo.stopPropagation ) {
            $.stopEvent( event );
        }
    }


    /**
     * @private
     * @inner
     */
    function onPointerCancel( tracker, event ) {
        //$.console.log('pointercancel ' + (tracker.userData ? tracker.userData.toString() : '') + ' ' + (event.target === tracker.element ? 'tracker.element' : ''));

        var gPoint = {
            id: event.pointerId,
            type: getPointerType( event )
        };

        var eventInfo = {
            originalEvent: event,
            eventType: 'pointercancel',
            pointerType: gPoint.type,
            isEmulated: false
        };
        preProcessEvent( tracker, eventInfo );

        //TODO need to only do this if our element is target?
        updatePointerCancel( tracker, eventInfo, gPoint );

        if ( eventInfo.stopPropagation ) {
            $.stopEvent( event );
        }
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
        //$.console.log('startTrackingPointer *** ' + pointsList.type + ' ' + gPoint.id.toString());
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
     * @param {OpenSeadragon.MouseTracker} tracker
     *     A reference to the MouseTracker instance.
     * @param {OpenSeadragon.MouseTracker.GesturePointList} pointsList
     *     The GesturePointList to stop tracking the pointer on.
     * @param {OpenSeadragon.MouseTracker.GesturePoint} gPoint
     *      Gesture point to stop tracking.
     * @returns {Number} Number of gesture points in pointsList.
     */
    function stopTrackingPointer( tracker, pointsList, gPoint ) {
        //$.console.log('stopTrackingPointer *** ' + pointsList.type + ' ' + gPoint.id.toString());
        var listLength;

        var trackedGPoint = pointsList.getById( gPoint.id );

        if ( trackedGPoint ) {
            if ( trackedGPoint.captured ) {
                $.console.warn('stopTrackingPointer() called on captured pointer');
                releasePointer( tracker, trackedGPoint );
            }

            // If child element relinquishes capture to a parent we may get here
            //   from a pointerleave event while a pointerup event will never be received.
            //   In that case, we'll clean up the contact count
            pointsList.removeContact();

            listLength = pointsList.removeById( gPoint.id );
        } else {
            listLength = pointsList.getLength();
        }

        return listLength;
    }


    /**
     * @function
     * @private
     * @inner
     */
    function getEventProcessDefaults( tracker, eventInfo ) {
        switch ( eventInfo.eventType ) {
            case 'pointermove':
                eventInfo.isStoppable = true;
                eventInfo.isCancelable = true;
                eventInfo.preventDefault = false;
                eventInfo.preventGesture = !tracker.hasGestureHandlers;
                eventInfo.stopPropagation = false;
                break;
            case 'pointerover':
            case 'pointerout':
            case 'contextmenu':
            case 'keydown':
            case 'keyup':
            case 'keypress':
                eventInfo.isStoppable = true;
                eventInfo.isCancelable = true;
                eventInfo.preventDefault = false; // onContextMenu(), onKeyDown(), onKeyUp(), onKeyPress() may set true
                eventInfo.preventGesture = false;
                eventInfo.stopPropagation = false;
                break;
            case 'pointerdown':
                eventInfo.isStoppable = true;
                eventInfo.isCancelable = true;
                eventInfo.preventDefault = false; // updatePointerDown() may set true (tracker.hasGestureHandlers)
                eventInfo.preventGesture = !tracker.hasGestureHandlers;
                eventInfo.stopPropagation = false;
                break;
            case 'pointerup':
                eventInfo.isStoppable = true;
                eventInfo.isCancelable = true;
                eventInfo.preventDefault = false;
                eventInfo.preventGesture = !tracker.hasGestureHandlers;
                eventInfo.stopPropagation = false;
                break;
            case 'wheel':
                eventInfo.isStoppable = true;
                eventInfo.isCancelable = true;
                eventInfo.preventDefault = false; // handleWheelEvent() may set true
                eventInfo.preventGesture = !tracker.hasScrollHandler;
                eventInfo.stopPropagation = false;
                break;
            case 'gotpointercapture':
            case 'lostpointercapture':
            case 'pointercancel':
                eventInfo.isStoppable = true;
                eventInfo.isCancelable = false;
                eventInfo.preventDefault = false;
                eventInfo.preventGesture = false;
                eventInfo.stopPropagation = false;
                break;
            case 'click':
                eventInfo.isStoppable = true;
                eventInfo.isCancelable = true;
                eventInfo.preventDefault = !!tracker.clickHandler;
                eventInfo.preventGesture = false;
                eventInfo.stopPropagation = false;
                break;
            case 'dblclick':
                eventInfo.isStoppable = true;
                eventInfo.isCancelable = true;
                eventInfo.preventDefault = !!tracker.dblClickHandler;
                eventInfo.preventGesture = false;
                eventInfo.stopPropagation = false;
                break;
            case 'focus':
            case 'blur':
            case 'pointerenter':
            case 'pointerleave':
            default:
                eventInfo.isStoppable = false;
                eventInfo.isCancelable = false;
                eventInfo.preventDefault = false;
                eventInfo.preventGesture = false;
                eventInfo.stopPropagation = false;
                break;
        }
    }


    /**
     * Sets up for and calls preProcessEventHandler. Call with the following parameters -
     * this function will fill in the rest of the preProcessEventHandler event object
     * properties
     *
     * @function
     * @private
     * @inner
     * @param {OpenSeadragon.MouseTracker} tracker
     *     A reference to the MouseTracker instance.
     * @param {OpenSeadragon.MouseTracker.EventProcessInfo} eventInfo
     * @param {Object} eventInfo.originalEvent
     * @param {String} eventInfo.eventType
     * @param {String} eventInfo.pointerType
     * @param {Boolean} eventInfo.isEmulated
     */
    function preProcessEvent( tracker, eventInfo ) {
        eventInfo.eventSource = tracker;
        eventInfo.eventPhase = eventInfo.originalEvent ?
                        ((typeof eventInfo.originalEvent.eventPhase !== 'undefined') ?
                                            eventInfo.originalEvent.eventPhase : 0) : 0;
        eventInfo.defaultPrevented = $.eventIsCanceled( eventInfo.originalEvent );
        eventInfo.shouldCapture = false;
        eventInfo.shouldReleaseCapture = false;
        eventInfo.userData = tracker.userData;

        getEventProcessDefaults( tracker, eventInfo );

        if ( tracker.preProcessEventHandler ) {
            tracker.preProcessEventHandler( eventInfo );
        }
    }


    /**
     * Sets or resets the captured property on the tracked pointer matching the passed gPoint's id/type
     *
     * @function
     * @private
     * @inner
     * @param {OpenSeadragon.MouseTracker} tracker
     *     A reference to the MouseTracker instance.
     * @param {Object} gPoint
     *     An object with id and type properties describing the pointer to update.
     * @param {Boolean} isCaptured
     *      Value to set the captured property to.
     */
    function updatePointerCaptured( tracker, gPoint, isCaptured ) {
        var pointsList = tracker.getActivePointersListByType( gPoint.type );
        var updateGPoint = pointsList.getById( gPoint.id );

        if ( updateGPoint ) {
            if ( isCaptured && !updateGPoint.captured ) {
                updateGPoint.captured = true;
                pointsList.captureCount++;
            } else if ( !isCaptured && updateGPoint.captured ) {
                updateGPoint.captured = false;
                pointsList.captureCount--;
                if ( pointsList.captureCount < 0 ) {
                    pointsList.captureCount = 0;
                    $.console.warn('updatePointerCaptured() - pointsList.captureCount went negative');
                }
            }
        } else {
            $.console.warn('updatePointerCaptured() called on untracked pointer');
        }
    }


    /**
     * @function
     * @private
     * @inner
     * @param {OpenSeadragon.MouseTracker} tracker
     *     A reference to the MouseTracker instance.
     * @param {OpenSeadragon.MouseTracker.EventProcessInfo} eventInfo
     *     Processing info for originating DOM event.
     * @param {OpenSeadragon.MouseTracker.GesturePoint} gPoint
     *      Gesture point associated with the event.
     */
    function updatePointerEnter( tracker, eventInfo, gPoint ) {
        var pointsList = tracker.getActivePointersListByType( gPoint.type ),
            updateGPoint;

        updateGPoint = pointsList.getById( gPoint.id );

        if ( updateGPoint ) {
            // Already tracking the pointer...update it
            updateGPoint.insideElement = true;
            updateGPoint.lastPos = updateGPoint.currentPos;
            updateGPoint.lastTime = updateGPoint.currentTime;
            updateGPoint.currentPos = gPoint.currentPos;
            updateGPoint.currentTime = gPoint.currentTime;

            gPoint = updateGPoint;
        } else {
            // Initialize for tracking and add to the tracking list
            gPoint.captured = false; // Handled by updatePointerCaptured()
            gPoint.insideElementPressed = false;
            gPoint.insideElement = true;
            startTrackingPointer( pointsList, gPoint );
        }

        // Enter (doesn't bubble and not cancelable)
        if ( tracker.enterHandler ) {
            tracker.enterHandler(
                {
                    eventSource:          tracker,
                    pointerType:          gPoint.type,
                    position:             getPointRelativeToAbsolute( gPoint.currentPos, tracker.element ),
                    buttons:              pointsList.buttons,
                    pointers:             tracker.getActivePointerCount(),
                    insideElementPressed: gPoint.insideElementPressed,
                    buttonDownAny:        pointsList.buttons !== 0,
                    isTouchEvent:         gPoint.type === 'touch',
                    originalEvent:        eventInfo.originalEvent,
                    userData:             tracker.userData
                }
            );
        }
    }


    /**
     * @function
     * @private
     * @inner
     * @param {OpenSeadragon.MouseTracker} tracker
     *     A reference to the MouseTracker instance.
     * @param {OpenSeadragon.MouseTracker.EventProcessInfo} eventInfo
     *     Processing info for originating DOM event.
     * @param {OpenSeadragon.MouseTracker.GesturePoint} gPoint
     *      Gesture point associated with the event.
     */
    function updatePointerLeave( tracker, eventInfo, gPoint ) {
        var pointsList = tracker.getActivePointersListByType(gPoint.type),
            updateGPoint,
            dispatchEventObj;

        updateGPoint = pointsList.getById( gPoint.id );

        if ( updateGPoint ) {
            // Already tracking the pointer. If captured then update it, else stop tracking it
            if ( updateGPoint.captured ) {
                updateGPoint.insideElement = false;
                updateGPoint.lastPos = updateGPoint.currentPos;
                updateGPoint.lastTime = updateGPoint.currentTime;
                updateGPoint.currentPos = gPoint.currentPos;
                updateGPoint.currentTime = gPoint.currentTime;
            } else {
                stopTrackingPointer( tracker, pointsList, updateGPoint );
            }

            gPoint = updateGPoint;
        } else {
            gPoint.captured = false; // Handled by updatePointerCaptured()
            gPoint.insideElementPressed = false;
        }

        // Leave (doesn't bubble and not cancelable)
        //   Note: exitHandler is deprecated (v2.5.0), replaced by leaveHandler
        if ( tracker.leaveHandler || tracker.exitHandler ) {
            dispatchEventObj = {
                eventSource:          tracker,
                pointerType:          gPoint.type,
                // GitHub PR: https://github.com/openseadragon/openseadragon/pull/1754 (gPoint.currentPos && )
                position:             gPoint.currentPos && getPointRelativeToAbsolute( gPoint.currentPos, tracker.element ),
                buttons:              pointsList.buttons,
                pointers:             tracker.getActivePointerCount(),
                insideElementPressed: gPoint.insideElementPressed,
                buttonDownAny:        pointsList.buttons !== 0,
                isTouchEvent:         gPoint.type === 'touch',
                originalEvent:        eventInfo.originalEvent,
                userData:             tracker.userData
            };

            if ( tracker.leaveHandler ) {
                tracker.leaveHandler( dispatchEventObj );
            }
            // Deprecated
            if ( tracker.exitHandler ) {
                tracker.exitHandler( dispatchEventObj );
            }
        }
    }


    /**
     * @function
     * @private
     * @inner
     * @param {OpenSeadragon.MouseTracker} tracker
     *     A reference to the MouseTracker instance.
     * @param {OpenSeadragon.MouseTracker.EventProcessInfo} eventInfo
     *     Processing info for originating DOM event.
     * @param {OpenSeadragon.MouseTracker.GesturePoint} gPoint
     *      Gesture point associated with the event.
     */
    function updatePointerOver( tracker, eventInfo, gPoint ) {
        var pointsList,
            updateGPoint;

        pointsList = tracker.getActivePointersListByType( gPoint.type );

        updateGPoint = pointsList.getById( gPoint.id );

        if ( updateGPoint ) {
            gPoint = updateGPoint;
        } else {
            gPoint.captured = false;
            gPoint.insideElementPressed = false;
            //gPoint.insideElement = true; // Tracked by updatePointerEnter
        }

        if ( tracker.overHandler ) {
            // Over
            tracker.overHandler(
                {
                    eventSource:          tracker,
                    pointerType:          gPoint.type,
                    position:             getPointRelativeToAbsolute( gPoint.currentPos, tracker.element ),
                    buttons:              pointsList.buttons,
                    pointers:             tracker.getActivePointerCount(),
                    insideElementPressed: gPoint.insideElementPressed,
                    buttonDownAny:        pointsList.buttons !== 0,
                    isTouchEvent:         gPoint.type === 'touch',
                    originalEvent:        eventInfo.originalEvent,
                    userData:             tracker.userData
                }
            );
        }
    }

    /**
     * @function
     * @private
     * @inner
     * @param {OpenSeadragon.MouseTracker} tracker
     *     A reference to the MouseTracker instance.
     * @param {OpenSeadragon.MouseTracker.EventProcessInfo} eventInfo
     *     Processing info for originating DOM event.
     * @param {OpenSeadragon.MouseTracker.GesturePoint} gPoint
     *      Gesture point associated with the event.
     */
    function updatePointerOut( tracker, eventInfo, gPoint ) {
        var pointsList,
            updateGPoint;

        pointsList = tracker.getActivePointersListByType(gPoint.type);

        updateGPoint = pointsList.getById( gPoint.id );

        if ( updateGPoint ) {
            gPoint = updateGPoint;
        } else {
            gPoint.captured = false;
            gPoint.insideElementPressed = false;
            //gPoint.insideElement = true; // Tracked by updatePointerEnter
        }

        if ( tracker.outHandler ) {
            // Out
            tracker.outHandler( {
                eventSource:          tracker,
                pointerType:          gPoint.type,
                position:             gPoint.currentPos && getPointRelativeToAbsolute( gPoint.currentPos, tracker.element ),
                buttons:              pointsList.buttons,
                pointers:             tracker.getActivePointerCount(),
                insideElementPressed: gPoint.insideElementPressed,
                buttonDownAny:        pointsList.buttons !== 0,
                isTouchEvent:         gPoint.type === 'touch',
                originalEvent:        eventInfo.originalEvent,
                userData:             tracker.userData
            } );
        }
    }


    /**
     * @function
     * @private
     * @inner
     * @param {OpenSeadragon.MouseTracker} tracker
     *     A reference to the MouseTracker instance.
     * @param {OpenSeadragon.MouseTracker.EventProcessInfo} eventInfo
     *     Processing info for originating DOM event.
     * @param {OpenSeadragon.MouseTracker.GesturePoint} gPoint
     *      Gesture point associated with the event.
     * @param {Number} buttonChanged
     *      The button involved in the event: -1: none, 0: primary/left, 1: aux/middle, 2: secondary/right, 3: X1/back, 4: X2/forward, 5: pen eraser.
     *      Note on chorded button presses (a button pressed when another button is already pressed): In the W3C Pointer Events model,
     *      only one pointerdown/pointerup event combo is fired. Chorded button state changes instead fire pointermove events.
     */
    function updatePointerDown( tracker, eventInfo, gPoint, buttonChanged ) {
        var delegate = THIS[ tracker.hash ],
            pointsList = tracker.getActivePointersListByType( gPoint.type ),
            updateGPoint;

        if ( typeof eventInfo.originalEvent.buttons !== 'undefined' ) {
            pointsList.buttons = eventInfo.originalEvent.buttons;
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
        if ( buttonChanged !== 0 ) {
            eventInfo.shouldCapture = false;
            eventInfo.shouldReleaseCapture = false;

            // Aux Press
            if ( tracker.nonPrimaryPressHandler &&
                                !eventInfo.preventGesture &&
                                !eventInfo.defaultPrevented ) {
                eventInfo.preventDefault = true;

                tracker.nonPrimaryPressHandler(
                    {
                        eventSource:          tracker,
                        pointerType:          gPoint.type,
                        position:             getPointRelativeToAbsolute( gPoint.currentPos, tracker.element ),
                        button:               buttonChanged,
                        buttons:              pointsList.buttons,
                        isTouchEvent:         gPoint.type === 'touch',
                        originalEvent:        eventInfo.originalEvent,
                        userData:             tracker.userData
                    }
                );
            }

            return;
        }

        updateGPoint = pointsList.getById( gPoint.id );

        if ( updateGPoint ) {
            // Already tracking the pointer...update it
            //updateGPoint.captured = true; // Handled by updatePointerCaptured()
            updateGPoint.insideElementPressed = true;
            updateGPoint.insideElement = true;
            updateGPoint.originalTarget = eventInfo.originalEvent.target;
            updateGPoint.contactPos = gPoint.currentPos;
            updateGPoint.contactTime = gPoint.currentTime;
            updateGPoint.lastPos = updateGPoint.currentPos;
            updateGPoint.lastTime = updateGPoint.currentTime;
            updateGPoint.currentPos = gPoint.currentPos;
            updateGPoint.currentTime = gPoint.currentTime;

            gPoint = updateGPoint;
        } else {
            // Initialize for tracking and add to the tracking list (no pointerenter event occurred before this)
            // NOTE: pointerdown event on untracked pointer
            gPoint.captured = false; // Handled by updatePointerCaptured()
            gPoint.insideElementPressed = true;
            gPoint.insideElement = true;
            gPoint.originalTarget = eventInfo.originalEvent.target;
            startTrackingPointer( pointsList, gPoint );
        }

        pointsList.addContact();
        //$.console.log('contacts++ ', pointsList.contacts);

        if ( !eventInfo.preventGesture && !eventInfo.defaultPrevented ) {
            eventInfo.shouldCapture = true;
            eventInfo.shouldReleaseCapture = false;
            eventInfo.preventDefault = true;

            if ( tracker.dragHandler || tracker.dragEndHandler || tracker.pinchHandler ) {
                $.MouseTracker.gesturePointVelocityTracker.addPoint( tracker, gPoint );
            }

            if ( pointsList.contacts === 1 ) {
                // Press
                if ( tracker.pressHandler && !eventInfo.preventGesture ) {
                    tracker.pressHandler(
                        {
                            eventSource:          tracker,
                            pointerType:          gPoint.type,
                            position:             getPointRelativeToAbsolute( gPoint.contactPos, tracker.element ),
                            buttons:              pointsList.buttons,
                            isTouchEvent:         gPoint.type === 'touch',
                            originalEvent:        eventInfo.originalEvent,
                            userData:             tracker.userData
                        }
                    );
                }
            } else if ( pointsList.contacts === 2 ) {
                if ( tracker.pinchHandler && gPoint.type === 'touch' ) {
                    // Initialize for pinch
                    delegate.pinchGPoints = pointsList.asArray();
                    delegate.lastPinchDist = delegate.currentPinchDist = delegate.pinchGPoints[ 0 ].currentPos.distanceTo( delegate.pinchGPoints[ 1 ].currentPos );
                    delegate.lastPinchCenter = delegate.currentPinchCenter = getCenterPoint( delegate.pinchGPoints[ 0 ].currentPos, delegate.pinchGPoints[ 1 ].currentPos );
                }
            }
        } else {
            eventInfo.shouldCapture = false;
            eventInfo.shouldReleaseCapture = false;
        }
    }


    /**
     * @function
     * @private
     * @inner
     * @param {OpenSeadragon.MouseTracker} tracker
     *     A reference to the MouseTracker instance.
     * @param {OpenSeadragon.MouseTracker.EventProcessInfo} eventInfo
     *     Processing info for originating DOM event.
     * @param {OpenSeadragon.MouseTracker.GesturePoint} gPoint
     *      Gesture points associated with the event.
     * @param {Number} buttonChanged
     *      The button involved in the event: -1: none, 0: primary/left, 1: aux/middle, 2: secondary/right, 3: X1/back, 4: X2/forward, 5: pen eraser.
     *      Note on chorded button presses (a button pressed when another button is already pressed): In the W3C Pointer Events model,
     *      only one pointerdown/pointerup event combo is fired. Chorded button state changes instead fire pointermove events.
     */
    function updatePointerUp( tracker, eventInfo, gPoint, buttonChanged ) {
        var delegate = THIS[ tracker.hash ],
            pointsList = tracker.getActivePointersListByType( gPoint.type ),
            releasePoint,
            releaseTime,
            updateGPoint,
            wasCaptured = false,
            quick;

        if ( typeof eventInfo.originalEvent.buttons !== 'undefined' ) {
            pointsList.buttons = eventInfo.originalEvent.buttons;
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

        eventInfo.shouldCapture = false;

        // Only capture and track primary button, pen, and touch contacts
        if ( buttonChanged !== 0 ) {
            eventInfo.shouldReleaseCapture = false;

            // Aux Release
            if ( tracker.nonPrimaryReleaseHandler &&
                                !eventInfo.preventGesture &&
                                !eventInfo.defaultPrevented ) {
                eventInfo.preventDefault = true;

                tracker.nonPrimaryReleaseHandler(
                    {
                        eventSource:           tracker,
                        pointerType:           gPoint.type,
                        position:              getPointRelativeToAbsolute(gPoint.currentPos, tracker.element),
                        button:                buttonChanged,
                        buttons:               pointsList.buttons,
                        isTouchEvent:          gPoint.type === 'touch',
                        originalEvent:         eventInfo.originalEvent,
                        userData:              tracker.userData
                    }
                );
            }

            return;
        }

        updateGPoint = pointsList.getById( gPoint.id );

        if ( updateGPoint ) {
            pointsList.removeContact();
            //$.console.log('contacts-- ', pointsList.contacts);

            // Update the pointer, stop tracking it if not still in this element
            if ( updateGPoint.captured ) {
                //updateGPoint.captured = false; // Handled by updatePointerCaptured()
                wasCaptured = true;
            }
            updateGPoint.lastPos = updateGPoint.currentPos;
            updateGPoint.lastTime = updateGPoint.currentTime;
            updateGPoint.currentPos = gPoint.currentPos;
            updateGPoint.currentTime = gPoint.currentTime;
            if ( !updateGPoint.insideElement ) {
                stopTrackingPointer( tracker, pointsList, updateGPoint );
            }

            releasePoint = updateGPoint.currentPos;
            releaseTime = updateGPoint.currentTime;
        } else {
            // NOTE: updatePointerUp(): pointerup on untracked gPoint
            // ...we'll start to track pointer again
            gPoint.captured = false; // Handled by updatePointerCaptured()
            gPoint.insideElementPressed = false;
            gPoint.insideElement = true;
            startTrackingPointer( pointsList, gPoint );

            updateGPoint = gPoint;
        }

        if ( !eventInfo.preventGesture && !eventInfo.defaultPrevented ) {
            if ( wasCaptured ) {
                // Pointer was activated in our element but could have been removed in any element since events are captured to our element

                eventInfo.shouldReleaseCapture = true;
                eventInfo.preventDefault = true;

                if ( tracker.dragHandler || tracker.dragEndHandler || tracker.pinchHandler ) {
                    $.MouseTracker.gesturePointVelocityTracker.removePoint( tracker, updateGPoint );
                }

                if ( pointsList.contacts === 0 ) {

                    // Release (pressed in our element)
                    if ( tracker.releaseHandler && releasePoint ) {
                        tracker.releaseHandler(
                            {
                                eventSource:           tracker,
                                pointerType:           updateGPoint.type,
                                position:              getPointRelativeToAbsolute( releasePoint, tracker.element ),
                                buttons:               pointsList.buttons,
                                insideElementPressed:  updateGPoint.insideElementPressed,
                                insideElementReleased: updateGPoint.insideElement,
                                isTouchEvent:          updateGPoint.type === 'touch',
                                originalEvent:         eventInfo.originalEvent,
                                userData:              tracker.userData
                            }
                        );
                    }

                    // Drag End
                    if ( tracker.dragEndHandler && delegate.sentDragEvent ) {
                        tracker.dragEndHandler(
                            {
                                eventSource:          tracker,
                                pointerType:          updateGPoint.type,
                                position:             getPointRelativeToAbsolute( updateGPoint.currentPos, tracker.element ),
                                speed:                updateGPoint.speed,
                                direction:            updateGPoint.direction,
                                shift:                eventInfo.originalEvent.shiftKey,
                                isTouchEvent:         updateGPoint.type === 'touch',
                                originalEvent:        eventInfo.originalEvent,
                                userData:             tracker.userData
                            }
                        );
                    }

                    // We want to clear this flag regardless of whether we fired the dragEndHandler
                    delegate.sentDragEvent = false;

                    // Click / Double-Click
                    if ( ( tracker.clickHandler || tracker.dblClickHandler ) && updateGPoint.insideElement ) {
                        quick = releaseTime - updateGPoint.contactTime <= tracker.clickTimeThreshold &&
                                        updateGPoint.contactPos.distanceTo( releasePoint ) <= tracker.clickDistThreshold;

                        // Click
                        if ( tracker.clickHandler ) {
                            tracker.clickHandler(
                                {
                                    eventSource:          tracker,
                                    pointerType:          updateGPoint.type,
                                    position:             getPointRelativeToAbsolute( updateGPoint.currentPos, tracker.element ),
                                    quick:                quick,
                                    shift:                eventInfo.originalEvent.shiftKey,
                                    isTouchEvent:         updateGPoint.type === 'touch',
                                    originalEvent:        eventInfo.originalEvent,
                                    originalTarget:       updateGPoint.originalTarget,
                                    userData:             tracker.userData
                                }
                            );
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
                                    tracker.dblClickHandler(
                                        {
                                            eventSource:          tracker,
                                            pointerType:          updateGPoint.type,
                                            position:             getPointRelativeToAbsolute( updateGPoint.currentPos, tracker.element ),
                                            shift:                eventInfo.originalEvent.shiftKey,
                                            isTouchEvent:         updateGPoint.type === 'touch',
                                            originalEvent:        eventInfo.originalEvent,
                                            userData:             tracker.userData
                                        }
                                    );
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

                eventInfo.shouldReleaseCapture = false;

                // Release (pressed in another element)
                if ( tracker.releaseHandler && releasePoint ) {
                    tracker.releaseHandler(
                        {
                            eventSource:           tracker,
                            pointerType:           updateGPoint.type,
                            position:              getPointRelativeToAbsolute( releasePoint, tracker.element ),
                            buttons:               pointsList.buttons,
                            insideElementPressed:  updateGPoint.insideElementPressed,
                            insideElementReleased: updateGPoint.insideElement,
                            isTouchEvent:          updateGPoint.type === 'touch',
                            originalEvent:         eventInfo.originalEvent,
                            userData:              tracker.userData
                        }
                    );
                    eventInfo.preventDefault = true;
                }
            }
        }
    }


    /**
     * Call when pointer(s) change coordinates, button state, pressure, tilt, or contact geometry (e.g. width and height)
     *
     * @function
     * @private
     * @inner
     * @param {OpenSeadragon.MouseTracker} tracker
     *     A reference to the MouseTracker instance.
     * @param {OpenSeadragon.MouseTracker.EventProcessInfo} eventInfo
     *     Processing info for originating DOM event.
     * @param {OpenSeadragon.MouseTracker.GesturePoint} gPoint
     *      Gesture points associated with the event.
     */
    function updatePointerMove( tracker, eventInfo, gPoint ) {
        var delegate = THIS[ tracker.hash ],
            pointsList = tracker.getActivePointersListByType( gPoint.type ),
            updateGPoint,
            gPointArray,
            delta;

        if ( typeof eventInfo.originalEvent.buttons !== 'undefined' ) {
            pointsList.buttons = eventInfo.originalEvent.buttons;
        }

        updateGPoint = pointsList.getById( gPoint.id );

        if ( updateGPoint ) {
            // Already tracking the pointer...update it
            updateGPoint.lastPos = updateGPoint.currentPos;
            updateGPoint.lastTime = updateGPoint.currentTime;
            updateGPoint.currentPos = gPoint.currentPos;
            updateGPoint.currentTime = gPoint.currentTime;
        } else {
            // Should never get here, but due to user agent bugs (e.g. legacy touch) it sometimes happens
            return;
        }

        eventInfo.shouldCapture = false;
        eventInfo.shouldReleaseCapture = false;

        // Stop (mouse only)
        if ( tracker.stopHandler && gPoint.type === 'mouse' ) {
            clearTimeout( tracker.stopTimeOut );
            tracker.stopTimeOut = setTimeout( function() {
                handlePointerStop( tracker, eventInfo.originalEvent, gPoint.type );
            }, tracker.stopDelay );
        }

        if ( pointsList.contacts === 0 ) {
            // Move (no contacts: hovering mouse or other hover-capable device)
            if ( tracker.moveHandler ) {
                tracker.moveHandler(
                    {
                        eventSource:          tracker,
                        pointerType:          gPoint.type,
                        position:             getPointRelativeToAbsolute( gPoint.currentPos, tracker.element ),
                        buttons:              pointsList.buttons,
                        isTouchEvent:         gPoint.type === 'touch',
                        originalEvent:        eventInfo.originalEvent,
                        userData:             tracker.userData
                    }
                );
            }
        } else if ( pointsList.contacts === 1 ) {
            // Move (1 contact)
            if ( tracker.moveHandler ) {
                updateGPoint = pointsList.asArray()[ 0 ];
                tracker.moveHandler(
                    {
                        eventSource:          tracker,
                        pointerType:          updateGPoint.type,
                        position:             getPointRelativeToAbsolute( updateGPoint.currentPos, tracker.element ),
                        buttons:              pointsList.buttons,
                        isTouchEvent:         updateGPoint.type === 'touch',
                        originalEvent:        eventInfo.originalEvent,
                        userData:             tracker.userData
                    }
                );
            }

            // Drag
            if ( tracker.dragHandler && !eventInfo.preventGesture && !eventInfo.defaultPrevented ) {
                updateGPoint = pointsList.asArray()[ 0 ];
                delta = updateGPoint.currentPos.minus( updateGPoint.lastPos );
                tracker.dragHandler(
                    {
                        eventSource:          tracker,
                        pointerType:          updateGPoint.type,
                        position:             getPointRelativeToAbsolute( updateGPoint.currentPos, tracker.element ),
                        buttons:              pointsList.buttons,
                        delta:                delta,
                        speed:                updateGPoint.speed,
                        direction:            updateGPoint.direction,
                        shift:                eventInfo.originalEvent.shiftKey,
                        isTouchEvent:         updateGPoint.type === 'touch',
                        originalEvent:        eventInfo.originalEvent,
                        userData:             tracker.userData
                    }
                );
                eventInfo.preventDefault = true;
                delegate.sentDragEvent = true;
            }
        } else if ( pointsList.contacts === 2 ) {
            // Move (2 contacts, use center)
            if ( tracker.moveHandler ) {
                gPointArray = pointsList.asArray();
                tracker.moveHandler(
                    {
                        eventSource:          tracker,
                        pointerType:          gPointArray[ 0 ].type,
                        position:             getPointRelativeToAbsolute( getCenterPoint( gPointArray[ 0 ].currentPos, gPointArray[ 1 ].currentPos ), tracker.element ),
                        buttons:              pointsList.buttons,
                        isTouchEvent:         gPointArray[ 0 ].type === 'touch',
                        originalEvent:        eventInfo.originalEvent,
                        userData:             tracker.userData
                    }
                );
            }

            // Pinch
            if ( tracker.pinchHandler && gPoint.type === 'touch' &&
                                !eventInfo.preventGesture && !eventInfo.defaultPrevented ) {
                delta = delegate.pinchGPoints[ 0 ].currentPos.distanceTo( delegate.pinchGPoints[ 1 ].currentPos );
                if ( delta !== delegate.currentPinchDist ) {
                    delegate.lastPinchDist = delegate.currentPinchDist;
                    delegate.currentPinchDist = delta;
                    delegate.lastPinchCenter = delegate.currentPinchCenter;
                    delegate.currentPinchCenter = getCenterPoint( delegate.pinchGPoints[ 0 ].currentPos, delegate.pinchGPoints[ 1 ].currentPos );
                    tracker.pinchHandler(
                        {
                            eventSource:          tracker,
                            pointerType:          'touch',
                            gesturePoints:        delegate.pinchGPoints,
                            lastCenter:           getPointRelativeToAbsolute( delegate.lastPinchCenter, tracker.element ),
                            center:               getPointRelativeToAbsolute( delegate.currentPinchCenter, tracker.element ),
                            lastDistance:         delegate.lastPinchDist,
                            distance:             delegate.currentPinchDist,
                            shift:                eventInfo.originalEvent.shiftKey,
                            originalEvent:        eventInfo.originalEvent,
                            userData:             tracker.userData
                        }
                    );
                    eventInfo.preventDefault = true;
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
     * @param {OpenSeadragon.MouseTracker.EventProcessInfo} eventInfo
     *     Processing info for originating DOM event.
     * @param {OpenSeadragon.MouseTracker.GesturePoint} gPoint
     *      Gesture points associated with the event.
     */
    function updatePointerCancel( tracker, eventInfo, gPoint ) {
        var pointsList = tracker.getActivePointersListByType( gPoint.type ),
            updateGPoint;

        updateGPoint = pointsList.getById( gPoint.id );

        if ( updateGPoint ) {
            stopTrackingPointer( tracker, pointsList, updateGPoint );
        }
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
                userData:             tracker.userData
            } );
        }
    }


    /**
     * @function
     * @private
     * @inner
     */
    function uniqueHash( ) {
        let uniqueId = Date.now().toString(36) + Math.random().toString(36).substring(2);
        while (uniqueId in THIS) {
            // rehash when not unique
            uniqueId = Date.now().toString(36) + Math.random().toString(36).substring(2);
        }
        return uniqueId;
    }

}(OpenSeadragon));
