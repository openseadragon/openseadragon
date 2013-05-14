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

(function( $ ){
        
        // is any button currently being pressed while mouse events occur
    var IS_BUTTON_DOWN  = false,
        // is any tracker currently capturing?
        IS_CAPTURING    = false,
        // dictionary from hash to MouseTracker
        ACTIVE          = {},   
        // list of trackers interested in capture
        CAPTURING       = [],
        // dictionary from hash to private properties
        THIS            = {};   

    /**
     * The MouseTracker allows other classes to set handlers for common mouse 
     * events on a specific element like, 'enter', 'exit', 'press', 'release',
     * 'scroll', 'click', and 'drag'.
     * @class
     * @param {Object} options 
     *      Allows configurable properties to be entirely specified by passing
     *      an options object to the constructor.  The constructor also supports 
     *      the original positional arguments 'elements', 'clickTimeThreshold',
     *      and 'clickDistThreshold' in that order.
     * @param {Element|String} options.element 
     *      A reference to an element or an element id for which the mouse 
     *      events will be monitored.
     * @param {Number} options.clickTimeThreshold 
     *      The number of milliseconds within which mutliple mouse clicks 
     *      will be treated as a single event.
     * @param {Number} options.clickDistThreshold 
     *      The distance between mouse click within multiple mouse clicks 
     *      will be treated as a single event.
     * @param {Function} options.enterHandler
     *      An optional handler for mouse enter.
     * @param {Function} options.exitHandler
     *      An optional handler for mouse exit.
     * @param {Function} options.pressHandler
     *      An optional handler for mouse press.
     * @param {Function} options.releaseHandler
     *      An optional handler for mouse release.
     * @param {Function} options.scrollHandler
     *      An optional handler for mouse scroll.
     * @param {Function} options.clickHandler
     *      An optional handler for mouse click.
     * @param {Function} options.dragHandler
     *      An optional handler for mouse drag.
     * @property {Number} hash 
     *      An unique hash for this tracker.
     * @property {Element} element 
     *      The element for which mouse event are being monitored.
     * @property {Number} clickTimeThreshold
     *      The number of milliseconds within which mutliple mouse clicks 
     *      will be treated as a single event.
     * @property {Number} clickDistThreshold
     *      The distance between mouse click within multiple mouse clicks 
     *      will be treated as a single event.
     */
    $.MouseTracker = function ( options ) {

        var args  = arguments;

        if( !$.isPlainObject( options ) ){
            options = {
                element:            args[ 0 ],
                clickTimeThreshold: args[ 1 ],
                clickDistThreshold: args[ 2 ]
            };
        }

        this.hash               = Math.random(); 
        this.element            = $.getElement( options.element );
        this.clickTimeThreshold = options.clickTimeThreshold;
        this.clickDistThreshold = options.clickDistThreshold;


        this.enterHandler       = options.enterHandler   || null;
        this.exitHandler        = options.exitHandler    || null;
        this.pressHandler       = options.pressHandler   || null;
        this.releaseHandler     = options.releaseHandler || null;
        this.scrollHandler      = options.scrollHandler  || null;
        this.clickHandler       = options.clickHandler   || null;
        this.dragHandler        = options.dragHandler    || null;
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
         * @property {Boolean} buttonDown
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
            mouseover:          function( event ){ onMouseOver( _this, event ); },
            mouseout:           function( event ){ onMouseOut( _this, event ); },
            mousedown:          function( event ){ onMouseDown( _this, event ); },
            mouseup:            function( event ){ onMouseUp( _this, event ); },
            click:              function( event ){ onMouseClick( _this, event ); },
            DOMMouseScroll:     function( event ){ onMouseWheelSpin( _this, event ); },
            mousewheel:         function( event ){ onMouseWheelSpin( _this, event ); },
            mouseupie:          function( event ){ onMouseUpIE( _this, event ); },
            mousemoveie:        function( event ){ onMouseMoveIE( _this, event ); },
            mouseupwindow:      function( event ){ onMouseUpWindow( _this, event ); },
            mousemove:          function( event ){ onMouseMove( _this, event ); },
            touchstart:         function( event ){ onTouchStart( _this, event ); },
            touchmove:          function( event ){ onTouchMove( _this, event ); },
            touchend:           function( event ){ onTouchEnd( _this, event ); },
            keypress:           function( event ){ onKeyPress( _this, event ); },
            focus:              function( event ){ onFocus( _this, event ); },
            blur:               function( event ){ onBlur( _this, event ); },
            tracking:           false,
            capturing:          false,
            buttonDown:         false,
            insideElement:      false,
            lastPoint:          null,
            lastMouseDownTime:  null,
            lastMouseDownPoint: null,
            lastPinchDelta:     0
        };

    };

    $.MouseTracker.prototype = {

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
         * Implement or assign implmentation to these handlers during or after
         * calling the constructor.
         * @function
         * @param {OpenSeadragon.MouseTracker} tracker  
         *      A reference to the tracker instance.
         * @param {OpenSeadragon.Point} position
         *      The poistion of the event on the screen.
         * @param {Boolean} buttonDown
         *      True if the left mouse button is currently being pressed and was 
         *      initiated inside the tracked element, otherwise false.
         * @param {Boolean} buttonDownAny
         *      Was the button down anywhere in the screen during the event.
         */
        enterHandler: function(){},

        /**
         * Implement or assign implmentation to these handlers during or after
         * calling the constructor.
         * @function
         * @param {OpenSeadragon.MouseTracker} tracker  
         *      A reference to the tracker instance.
         * @param {OpenSeadragon.Point} position
         *      The poistion of the event on the screen.
         * @param {Boolean} buttonDown
         *      True if the left mouse button is currently being pressed and was 
         *      initiated inside the tracked element, otherwise false.
         * @param {Boolean} buttonDownAny
         *      Was the button down anywhere in the screen during the event.
         */
        exitHandler: function(){},

        /**
         * Implement or assign implmentation to these handlers during or after
         * calling the constructor.
         * @function
         * @param {OpenSeadragon.MouseTracker} tracker  
         *      A reference to the tracker instance.
         * @param {OpenSeadragon.Point} position
         *      The poistion of the event on the screen.
         */
        pressHandler: function(){},

        /**
         * Implement or assign implmentation to these handlers during or after
         * calling the constructor.
         * @function
         * @param {OpenSeadragon.MouseTracker} tracker  
         *      A reference to the tracker instance.
         * @param {OpenSeadragon.Point} position
         *      The poistion of the event on the screen.
         * @param {Boolean} buttonDown
         *      True if the left mouse button is currently being pressed and was 
         *      initiated inside the tracked element, otherwise false.
         * @param {Boolean} insideElementRelease
         *      Was the mouse still inside the tracked element when the button
         *      was released.
         */
        releaseHandler: function(){},

        /**
         * Implement or assign implmentation to these handlers during or after
         * calling the constructor.
         * @function
         * @param {OpenSeadragon.MouseTracker} tracker  
         *      A reference to the tracker instance.
         * @param {OpenSeadragon.Point} position
         *      The poistion of the event on the screen.
         * @param {Number} scroll
         *      The scroll delta for the event.
         * @param {Boolean} shift
         *      Was the shift key being pressed during this event?
         */
        scrollHandler: function(){},

        /**
         * Implement or assign implmentation to these handlers during or after
         * calling the constructor. 
         * @function
         * @param {OpenSeadragon.MouseTracker} tracker  
         *      A reference to the tracker instance.
         * @param {OpenSeadragon.Point} position
         *      The poistion of the event on the screen.
         * @param {Boolean} quick
         *      True only if the clickDistThreshold and clickDeltaThreshold are 
         *      both pased. Useful for ignoring events.
         * @param {Boolean} shift
         *      Was the shift key being pressed during this event?
         */
        clickHandler: function(){},

        /**
         * Implement or assign implmentation to these handlers during or after
         * calling the constructor. 
         * @function
         * @param {OpenSeadragon.MouseTracker} tracker  
         *      A reference to the tracker instance.
         * @param {OpenSeadragon.Point} position
         *      The poistion of the event on the screen.
         * @param {OpenSeadragon.Point} delta
         *      The x,y components of the difference between start drag and
         *      end drag.  Usefule for ignoring or weighting the events.
         * @param {Boolean} shift
         *      Was the shift key being pressed during this event?
         */
        dragHandler: function(){},

        /**
         * Implement or assign implmentation to these handlers during or after
         * calling the constructor. 
         * @function
         * @param {OpenSeadragon.MouseTracker} tracker  
         *      A reference to the tracker instance.
         * @param {Number} keyCode
         *      The key code that was pressed.
         * @param {Boolean} shift
         *      Was the shift key being pressed during this event?
         */
        keyHandler: function(){},

        focusHandler: function(){},

        blurHandler: function(){}
    };

    /**
     * Starts tracking mouse events on this element.
     * @private
     * @inner
     */
    function startTracking( tracker ) {
        var events = [
                "mouseover", "mouseout", "mousedown", "mouseup", 
                "click",
                "DOMMouseScroll", "mousewheel", 
                "touchstart", "touchmove", "touchend",
                "keypress",
                "focus", "blur"
            ], 
            delegate = THIS[ tracker.hash ],
            event, 
            i;

        if ( !delegate.tracking ) {
            for( i = 0; i < events.length; i++ ){
                event = events[ i ];
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
        var events = [
                "mouseover", "mouseout", "mousedown", "mouseup", 
                "click",
                "DOMMouseScroll", "mousewheel", 
                "touchstart", "touchmove", "touchend",
                "keypress",
                "focus", "blur"
            ],
            delegate = THIS[ tracker.hash ],
            event, 
            i;
        
        if ( delegate.tracking ) {
            for( i = 0; i < events.length; i++ ){
                event = events[ i ];
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
                    delegate.mouseupie, 
                    true 
                );
                $.addEvent( 
                    tracker.element, 
                    "mousemove", 
                    delegate.mousemoveie, 
                    true 
                );
            } else {
                $.addEvent( 
                    window, 
                    "mouseup", 
                    delegate.mouseupwindow, 
                    true 
                );
                $.addEvent( 
                    window, 
                    "mousemove", 
                    delegate.mousemove, 
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
                    delegate.mousemoveie, 
                    true 
                );
                $.removeEvent( 
                    tracker.element, 
                    "mouseup", 
                    delegate.mouseupie, 
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
                    delegate.mousemove, 
                    true 
                );
                $.removeEvent( 
                    window, 
                    "mouseup", 
                    delegate.mouseupwindow, 
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
    function triggerOthers( tracker, handler, event ) {
        var otherHash;
        for ( otherHash in ACTIVE ) {
            if ( ACTIVE.hasOwnProperty( otherHash ) && tracker.hash != otherHash ) {
                handler( ACTIVE[ otherHash ], event );
            }
        }
    }


    /**
     * @private
     * @inner
     */
    function onFocus( tracker, event ){
        //console.log( "focus %s", event );
        var propagate;
        if ( tracker.focusHandler ) {
            propagate = tracker.focusHandler( 
                tracker, 
                event
            );
            if( propagate === false ){
                $.cancelEvent( event );
            }
        }
    }


    /**
     * @private
     * @inner
     */
    function onBlur( tracker, event ){
        //console.log( "blur %s", event );
        var propagate;
        if ( tracker.blurHandler ) {
            propagate = tracker.blurHandler( 
                tracker, 
                event
            );
            if( propagate === false ){
                $.cancelEvent( event );
            }
        }
    }

    
    /**
     * @private
     * @inner
     */
    function onKeyPress( tracker, event ){
        //console.log( "keypress %s %s %s %s %s", event.keyCode, event.charCode, event.ctrlKey, event.shiftKey, event.altKey );
        var propagate;
        if ( tracker.keyHandler ) {
            propagate = tracker.keyHandler( 
                tracker, 
                event.keyCode ? event.keyCode : event.charCode,
                event.shiftKey
            );
            if( !propagate ){
                $.cancelEvent( event );
            }
        }
    }


    /**
     * @private
     * @inner
     */
    function onMouseOver( tracker, event ) {

        var delegate = THIS[ tracker.hash ],
            propagate;

        event = $.getEvent( event );

        if ( $.Browser.vendor == $.BROWSERS.IE && 
             $.Browser.version < 9 && 
             delegate.capturing && 
             !isChild( event.srcElement, tracker.element ) ) {

            triggerOthers( tracker, onMouseOver, event );
        }

        var to = event.target ? 
                event.target : 
                event.srcElement,
            from = event.relatedTarget ? 
                event.relatedTarget : 
                event.fromElement;

        if ( !isChild( tracker.element, to ) || 
              isChild( tracker.element, from ) ) {
            return;
        }

        delegate.insideElement = true;

        if ( tracker.enterHandler ) {
            propagate = tracker.enterHandler(
                tracker, 
                getMouseRelative( event, tracker.element ),
                delegate.buttonDown, 
                IS_BUTTON_DOWN
            );
            if( propagate === false ){
                $.cancelEvent( event );
            }
        }
    }


    /**
     * @private
     * @inner
     */
    function onMouseOut( tracker, event ) {
        var delegate = THIS[ tracker.hash ],
            propagate;

        event = $.getEvent( event );

        if ( $.Browser.vendor == $.BROWSERS.IE && 
             $.Browser.version < 9 &&
             delegate.capturing && 
             !isChild( event.srcElement, tracker.element ) ) {

            triggerOthers( tracker, onMouseOut, event );

        }

        var from = event.target ? 
                event.target : 
                event.srcElement,
            to = event.relatedTarget ? 
                event.relatedTarget : 
                event.toElement;

        if ( !isChild( tracker.element, from ) || 
              isChild( tracker.element, to ) ) {
            return;
        }

        delegate.insideElement = false;

        if ( tracker.exitHandler ) {
            propagate = tracker.exitHandler( 
                tracker, 
                getMouseRelative( event, tracker.element ),
                delegate.buttonDown, 
                IS_BUTTON_DOWN
            );

            if( propagate === false ){
                $.cancelEvent( event );
            }
        }
    }


    /**
     * @private
     * @inner
     */
    function onMouseDown( tracker, event ) {
        var delegate = THIS[ tracker.hash ],
            propagate;

        event = $.getEvent( event );

        if ( event.button == 2 ) {
            return;
        }

        delegate.buttonDown = true;

        delegate.lastPoint = getMouseAbsolute( event );
        delegate.lastMouseDownPoint = delegate.lastPoint;
        delegate.lastMouseDownTime = +new Date();

        if ( tracker.pressHandler ) {
            propagate = tracker.pressHandler( 
                tracker, 
                getMouseRelative( event, tracker.element )
            );
            if( propagate === false ){
                $.cancelEvent( event );
            }
        }

        if ( tracker.pressHandler || tracker.dragHandler ) {
            $.cancelEvent( event );
        }

        if ( !( $.Browser.vendor == $.BROWSERS.IE && $.Browser.version < 9 ) || 
             !IS_CAPTURING ) {
            captureMouse( tracker );
            IS_CAPTURING = true;
            // reset to empty & add us
            CAPTURING = [ tracker ];     
        } else if ( $.Browser.vendor == $.BROWSERS.IE  && $.Browser.version < 9 ) {
            // add us to the list
            CAPTURING.push( tracker );   
        }
    }

    /**
     * @private
     * @inner
     */
    function onTouchStart( tracker, event ) {
        var touchA,
            touchB;

        if( event.touches.length == 1 &&
            event.targetTouches.length == 1 && 
            event.changedTouches.length == 1 ){
            
            THIS[ tracker.hash ].lastTouch = event.touches[ 0 ];  
            onMouseOver( tracker, event.changedTouches[ 0 ] );
            onMouseDown( tracker, event.touches[ 0 ] );
        }

        if( event.touches.length == 2 ){
            
            touchA = getMouseAbsolute( event.touches[ 0 ] );
            touchB = getMouseAbsolute( event.touches[ 1 ] );
            THIS[ tracker.hash ].lastPinchDelta = 
                Math.abs( touchA.x - touchB.x ) +
                Math.abs( touchA.y - touchB.y );
            THIS[ tracker.hash ].pinchMidpoint = new $.Point(
                ( touchA.x + touchB.x ) / 2 ,
                ( touchA.y + touchB.y ) / 2
            );
            //$.console.debug("pinch start : "+THIS[ tracker.hash ].lastPinchDelta);
        }

        event.preventDefault();
    }


    /**
     * @private
     * @inner
     */
    function onMouseUp( tracker, event ) {
        var delegate = THIS[ tracker.hash ],
            //were we inside the tracked element when we were pressed
            insideElementPress = delegate.buttonDown,
            //are we still inside the tracked element when we released
            insideElementRelease = delegate.insideElement,
            propagate;

        event = $.getEvent( event );

        if ( event.button == 2 ) {
            return;
        }

        delegate.buttonDown = false;

        if ( tracker.releaseHandler ) {
            propagate = tracker.releaseHandler(
                tracker, 
                getMouseRelative( event, tracker.element ),
                insideElementPress, 
                insideElementRelease
            );
            if( propagate === false ){
                $.cancelEvent( event );
            }
        }

        if ( insideElementPress && insideElementRelease ) {
            handleMouseClick( tracker, event );
        }
    }


    /**
     * @private
     * @inner
     */
    function onTouchEnd( tracker, event ) {

        if( event.touches.length === 0 &&
            event.targetTouches.length === 0 && 
            event.changedTouches.length == 1 ){

            THIS[ tracker.hash ].lastTouch = null;
            onMouseUp( tracker, event.changedTouches[ 0 ] );
            onMouseOut( tracker, event.changedTouches[ 0 ] );
        }
        if( event.touches.length + event.changedTouches.length == 2 ){
            THIS[ tracker.hash ].lastPinchDelta = null;
            THIS[ tracker.hash ].pinchMidpoint  = null;
            //$.console.debug("pinch end");
        }
        event.preventDefault();
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
    function onMouseUpIE( tracker, event ) {
        var othertracker,
            i;

        event = $.getEvent( event );

        if ( event.button == 2 ) {
            return;
        }

        for ( i = 0; i < CAPTURING.length; i++ ) {
            othertracker = CAPTURING[ i ];
            if ( !hasMouse( othertracker ) ) {
                onMouseUp( othertracker, event );
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
     * Only triggered in W3C browsers by elements within which the mouse was
     * initially pressed, since they are now listening to the window for
     * mouseup during the capture phase. We shouldn't handle the mouseup
     * here if the mouse is still inside this element, since the regular
     * mouseup handler will still fire.
     * @private
     * @inner
     */
    function onMouseUpWindow( tracker, event ) {
        if ( ! THIS[ tracker.hash ].insideElement ) {
            onMouseUp( tracker, event );
        }
        releaseMouse( tracker );
    }


    /**
     * @private
     * @inner
     */
    function onMouseClick( tracker, event ) {
        if ( tracker.clickHandler ) {
            $.cancelEvent( event );
        }
    }


    /**
     * @private
     * @inner
     */
    function onMouseWheelSpin( tracker, event ) {
        var nDelta = 0,
            propagate;
        
        if ( !event ) { // For IE, access the global (window) event object
            event = window.event;
        }

        if ( event.wheelDelta ) { // IE and Opera
            nDelta = event.wheelDelta;
            if ( window.opera ) {  // Opera has the values reversed
                nDelta = -nDelta;
            }
        } else if (event.detail) { // Mozilla FireFox
            nDelta = -event.detail;
        }
        //The nDelta variable is gated to provide smooth z-index scrolling
        //since the mouse wheel allows for substantial deltas meant for rapid
        //y-index scrolling.
        nDelta = nDelta > 0 ? 1 : -1;

        if ( tracker.scrollHandler ) {
            propagate = tracker.scrollHandler(
                tracker, 
                getMouseRelative( event, tracker.element ), 
                nDelta, 
                event.shiftKey
            );
            if( propagate === false ){
                $.cancelEvent( event );
            }
        }
    }


    /**
     * @private
     * @inner
     */
    function handleMouseClick( tracker, event ) {
        var delegate = THIS[ tracker.hash ],
            propagate;

        event = $.getEvent( event );

        if ( event.button == 2 ) {
            return;
        }

        var time     = +new Date() - delegate.lastMouseDownTime,
            point    = getMouseAbsolute( event ),
            distance = delegate.lastMouseDownPoint.distanceTo( point ),
            quick    = time     <= tracker.clickTimeThreshold && 
                       distance <= tracker.clickDistThreshold;

        if ( tracker.clickHandler ) {
            propagate = tracker.clickHandler(
                tracker, 
                getMouseRelative( event, tracker.element ),
                quick, 
                event.shiftKey
            );
            if( propagate === false ){
                $.cancelEvent( event );
            }
        }
    }


    /**
     * @private
     * @inner
     */
    function onMouseMove( tracker, event ) {
        var delegate = THIS[ tracker.hash ],
            delta,
            propagate,
            point;

        event = $.getEvent( event );
        point = getMouseAbsolute( event );
        delta = point.minus( delegate.lastPoint );

        delegate.lastPoint = point;

        if ( tracker.dragHandler ) {
            propagate = tracker.dragHandler(
                tracker, 
                getMouseRelative( event, tracker.element ),
                delta, 
                event.shiftKey
            );
            if( propagate === false ){
                $.cancelEvent( event );
            }
        }
    }


    /**
     * @private
     * @inner
     */
    function onTouchMove( tracker, event ) {
        var touchA,
            touchB,
            pinchDelta;

        if( event.touches.length === 1 &&
            event.targetTouches.length === 1 && 
            event.changedTouches.length === 1 && 
            THIS[ tracker.hash ].lastTouch.identifier === event.touches[ 0 ].identifier){

            onMouseMove( tracker, event.touches[ 0 ] );

        } else if (  event.touches.length === 2 ){

            touchA = getMouseAbsolute( event.touches[ 0 ] );
            touchB = getMouseAbsolute( event.touches[ 1 ] );
            pinchDelta =
                Math.abs( touchA.x - touchB.x ) +
                Math.abs( touchA.y - touchB.y );
            
            //TODO: make the 75px pinch threshold configurable
            if( Math.abs( THIS[ tracker.hash ].lastPinchDelta - pinchDelta ) > 75 ){
                //$.console.debug( "pinch delta : " + pinchDelta + " | previous : " + THIS[ tracker.hash ].lastPinchDelta);

                onMouseWheelSpin( tracker, {
                    shift: false,
                    pageX: THIS[ tracker.hash ].pinchMidpoint.x,
                    pageY: THIS[ tracker.hash ].pinchMidpoint.y,
                    detail:( 
                        THIS[ tracker.hash ].lastPinchDelta > pinchDelta 
                    ) ? 1 : -1
                });

                THIS[ tracker.hash ].lastPinchDelta = pinchDelta;
            }
        }
        event.preventDefault();
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
    function onMouseMoveIE( tracker, event ) {
        var i;
        for ( i = 0; i < CAPTURING.length; i++ ) {
            onMouseMove( CAPTURING[ i ], event );
        }

        $.stopEvent( event );
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
        var mouse   = $.getMousePosition( event ),
            offset  = $.getElementPosition( element );

        return mouse.minus( offset );
    }

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
            } catch (e) {
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
    })();
    
}( OpenSeadragon ));
