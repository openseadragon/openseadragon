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
     * The MouseTracker allows other classes to set handlers for common mouse
     * events on a specific element like, 'enter', 'exit', 'press', 'release',
     * 'scroll', 'click', and 'drag'.
     * @class MouseTracker
     * @memberof OpenSeadragon
     * @param {Object} options
     *      Allows configurable properties to be entirely specified by passing
     *      an options object to the constructor.  The constructor also supports
     *      the original positional arguments 'elements', 'clickTimeThreshold',
     *      and 'clickDistThreshold' in that order.
     * @param {Element|String} options.element
     *      A reference to an element or an element id for which the mouse
     *      events will be monitored.
     * @param {Number} options.clickTimeThreshold
     *      The number of milliseconds within which multiple mouse clicks
     *      will be treated as a single event.
     * @param {Number} options.clickDistThreshold
     *      The distance between mouse click within multiple mouse clicks
     *      will be treated as a single event.
     * @param {Number} options.stopDelay
     *      The number of milliseconds without mouse move before the mouse stop
     *      event is fired.
     * @param {OpenSeadragon.EventHandler} options.enterHandler
     *      An optional handler for mouse enter.
     * @param {OpenSeadragon.EventHandler} options.exitHandler
     *      An optional handler for mouse exit.
     * @param {OpenSeadragon.EventHandler} options.pressHandler
     *      An optional handler for mouse press.
     * @param {OpenSeadragon.EventHandler} options.releaseHandler
     *      An optional handler for mouse release.
     * @param {OpenSeadragon.EventHandler} options.moveHandler
     *      An optional handler for mouse move.
     * @param {OpenSeadragon.EventHandler} options.scrollHandler
     *      An optional handler for mouse scroll.
     * @param {OpenSeadragon.EventHandler} options.clickHandler
     *      An optional handler for mouse click.
     * @param {OpenSeadragon.EventHandler} options.dragHandler
     *      An optional handler for mouse drag.
     * @param {OpenSeadragon.EventHandler} options.keyHandler
     *      An optional handler for keypress.
     * @param {OpenSeadragon.EventHandler} options.focusHandler
     *      An optional handler for focus.
     * @param {OpenSeadragon.EventHandler} options.blurHandler
     *      An optional handler for blur.
     * @param {Object} [options.userData=null]
     *      Arbitrary object to be passed unchanged to any attached handler methods.
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

        var args = arguments;

        if ( !$.isPlainObject( options ) ) {
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
            mouseover:             function ( event ) { onMouseOver( _this, event, false ); },
            mouseout:              function ( event ) { onMouseOut( _this, event, false ); },
            mousedown:             function ( event ) { onMouseDown( _this, event ); },
            mouseup:               function ( event ) { onMouseUp( _this, event, false ); },
            mousemove:             function ( event ) { onMouseMove( _this, event ); },
            click:                 function ( event ) { onMouseClick( _this, event ); },
            wheel:                 function ( event ) { onWheel( _this, event ); },
            mousewheel:            function ( event ) { onMouseWheel( _this, event ); },
            DOMMouseScroll:        function ( event ) { onMouseWheel( _this, event ); },
            MozMousePixelScroll:   function ( event ) { onMouseWheel( _this, event ); },
            mouseupie:             function ( event ) { onMouseUpIE( _this, event ); },
            mousemovecapturedie:   function ( event ) { onMouseMoveCapturedIE( _this, event ); },
            mouseupcaptured:       function ( event ) { onMouseUpCaptured( _this, event ); },
            mousemovecaptured:     function ( event ) { onMouseMoveCaptured( _this, event, false ); },
            touchstart:            function ( event ) { onTouchStart( _this, event ); },
            touchmove:             function ( event ) { onTouchMove( _this, event ); },
            touchend:              function ( event ) { onTouchEnd( _this, event ); },
            keypress:              function ( event ) { onKeyPress( _this, event ); },
            focus:                 function ( event ) { onFocus( _this, event ); },
            blur:                  function ( event ) { onBlur( _this, event ); },
            tracking:              false,
            capturing:             false,
            insideElementPressed:  false,
            insideElement:         false,
            lastPoint:             null,
            lastMouseDownTime:     null,
            lastMouseDownPoint:    null,
            lastPinchDelta:        0
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
         *      True if the original event is a touch event, otherwise false.
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
         *      True if the original event is a touch event, otherwise false.
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
         *      True if the original event is a touch event, otherwise false.
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
         *      True if the original event is a touch event, otherwise false.
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
         *      True if the original event is a touch event, otherwise false.
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
         *      True if the original event is a touch event, otherwise false.
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
         *      True if the original event is a touch event, otherwise false.
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
         *      True if the original event is a touch event, otherwise false.
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
         * @param {Boolean} event.isTouchEvent
         *      True if the original event is a touch event, otherwise false.
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
     * Detect available mouse wheel event.
     */
    $.MouseTracker.wheelEventName = ( $.Browser.vendor == $.BROWSERS.IE && $.Browser.version > 8 ) ||
                                                ( 'onwheel' in document.createElement( 'div' ) ) ? 'wheel' : // Modern browsers support 'wheel'
                                    document.onmousewheel !== undefined ? 'mousewheel' :                     // Webkit and IE support at least 'mousewheel'
                                    'DOMMouseScroll';                                                        // Assume old Firefox

    /**
     * Starts tracking mouse events on this element.
     * @private
     * @inner
     */
    function startTracking( tracker ) {
        var events = [
                "mouseover", "mouseout", "mousedown", "mouseup", "mousemove",
                "click",
                $.MouseTracker.wheelEventName,
                "touchstart", "touchmove", "touchend",
                "keypress",
                "focus", "blur"
            ],
            delegate = THIS[ tracker.hash ],
            event,
            i;

        // Add 'MozMousePixelScroll' event handler for older Firefox
        if( $.MouseTracker.wheelEventName == "DOMMouseScroll" ) {
            events.push( "MozMousePixelScroll" );
        }

        if ( !delegate.tracking ) {
            for ( i = 0; i < events.length; i++ ) {
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
                "mouseover", "mouseout", "mousedown", "mouseup", "mousemove",
                "click",
                $.MouseTracker.wheelEventName,
                "touchstart", "touchmove", "touchend",
                "keypress",
                "focus", "blur"
            ],
            delegate = THIS[ tracker.hash ],
            event,
            i;

        // Remove 'MozMousePixelScroll' event handler for older Firefox
        if( $.MouseTracker.wheelEventName == "DOMMouseScroll" ) {
            events.push( "MozMousePixelScroll" );
        }

        if ( delegate.tracking ) {
            for ( i = 0; i < events.length; i++ ) {
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
    function triggerOthers( tracker, handler, event, isTouch ) {
        var otherHash;
        for ( otherHash in ACTIVE ) {
            if ( ACTIVE.hasOwnProperty( otherHash ) && tracker.hash != otherHash ) {
                handler( ACTIVE[ otherHash ], event, isTouch );
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
     * @private
     * @inner
     */
    function onKeyPress( tracker, event ) {
        //console.log( "keypress %s %s %s %s %s", event.keyCode, event.charCode, event.ctrlKey, event.shiftKey, event.altKey );
        var propagate;
        if ( tracker.keyHandler ) {
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
    function onMouseOver( tracker, event, isTouch ) {

        var delegate = THIS[ tracker.hash ],
            propagate;

        isTouch = isTouch || false;

        event = $.getEvent( event );

        if ( !isTouch ) {
            if ( $.Browser.vendor == $.BROWSERS.IE &&
                 $.Browser.version < 9 &&
                 delegate.capturing &&
                 !isChild( event.srcElement, tracker.element ) ) {

                triggerOthers( tracker, onMouseOver, event, isTouch );
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
        }

        delegate.insideElement = true;

        if ( tracker.enterHandler ) {
            propagate = tracker.enterHandler(
                {
                    eventSource:          tracker,
                    position:             getMouseRelative( isTouch ? event.changedTouches[ 0 ] : event, tracker.element ),
                    insideElementPressed: delegate.insideElementPressed,
                    buttonDownAny:        IS_BUTTON_DOWN,
                    isTouchEvent:         isTouch,
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
    function onMouseOut( tracker, event, isTouch ) {
        var delegate = THIS[ tracker.hash ],
            propagate;

        isTouch = isTouch || false;

        event = $.getEvent( event );

        if ( !isTouch ) {
            if ( $.Browser.vendor == $.BROWSERS.IE &&
                 $.Browser.version < 9 &&
                 delegate.capturing &&
                 !isChild( event.srcElement, tracker.element ) ) {

                triggerOthers( tracker, onMouseOut, event, isTouch );

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
        }

        delegate.insideElement = false;

        if ( tracker.exitHandler ) {
            propagate = tracker.exitHandler(
                {
                    eventSource:          tracker,
                    position:             getMouseRelative( isTouch ? event.changedTouches[ 0 ] : event, tracker.element ),
                    insideElementPressed: delegate.insideElementPressed,
                    buttonDownAny:        IS_BUTTON_DOWN,
                    isTouchEvent:         isTouch,
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
    function onMouseDown( tracker, event, noCapture, isTouch ) {
        var delegate = THIS[ tracker.hash ],
            propagate;

        isTouch = isTouch || false;

        event = $.getEvent(event);

        var eventOrTouchPoint = isTouch ? event.touches[ 0 ] : event;

        if ( event.button == 2 ) {
            return;
        }

        delegate.insideElementPressed = true;

        delegate.lastPoint = getMouseAbsolute( eventOrTouchPoint );
        delegate.lastMouseDownPoint = delegate.lastPoint;
        delegate.lastMouseDownTime = $.now();

        if ( tracker.pressHandler ) {
            propagate = tracker.pressHandler(
                {
                    eventSource:          tracker,
                    position:             getMouseRelative( eventOrTouchPoint, tracker.element ),
                    isTouchEvent:         isTouch,
                    originalEvent:        event,
                    preventDefaultAction: false,
                    userData:             tracker.userData
                }
            );
            if ( propagate === false ) {
                $.cancelEvent( event );
            }
        }

        if ( tracker.pressHandler || tracker.dragHandler ) {
            $.cancelEvent( event );
        }

        if ( noCapture ) {
            return;
        }

        if ( isTouch ||
             !( $.Browser.vendor == $.BROWSERS.IE && $.Browser.version < 9 ) ||
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
    function onTouchStart( tracker, event ) {
        var touchA,
            touchB;

        if ( event.touches.length == 1 &&
            event.targetTouches.length == 1 &&
            event.changedTouches.length == 1 ) {

            THIS[ tracker.hash ].lastTouch = event.touches[ 0 ];
            onMouseOver( tracker, event, true );
            // call with no capture as the onMouseMoveCaptured will 
            // be triggered by onTouchMove
            onMouseDown( tracker, event, true, true );
        }

        if ( event.touches.length == 2 ) {

            touchA = getMouseAbsolute( event.touches[ 0 ] );
            touchB = getMouseAbsolute( event.touches[ 1 ] );
            THIS[ tracker.hash ].lastPinchDelta =
                Math.abs( touchA.x - touchB.x ) +
                Math.abs( touchA.y - touchB.y );
            THIS[ tracker.hash ].pinchMidpoint = new $.Point(
                ( touchA.x + touchB.x ) / 2,
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
    function onMouseUp( tracker, event, isTouch ) {
        var delegate = THIS[ tracker.hash ],
            //were we inside the tracked element when we were pressed
            insideElementPressed = delegate.insideElementPressed,
            //are we still inside the tracked element when we released
            insideElementReleased = delegate.insideElement,
            propagate;

        isTouch = isTouch || false;

        event = $.getEvent(event);

        if ( event.button == 2 ) {
            return;
        }

        delegate.insideElementPressed = false;

        if ( tracker.releaseHandler ) {
            propagate = tracker.releaseHandler(
                {
                    eventSource:           tracker,
                    position:              getMouseRelative( isTouch ? event.changedTouches[ 0 ] : event, tracker.element ),
                    insideElementPressed:  insideElementPressed,
                    insideElementReleased: insideElementReleased,
                    isTouchEvent:          isTouch,
                    originalEvent:         event,
                    preventDefaultAction:  false,
                    userData:              tracker.userData
                }
            );
            if ( propagate === false ) {
                $.cancelEvent( event );
            }
        }

        if ( insideElementPressed && insideElementReleased ) {
            handleMouseClick( tracker, event, isTouch );
        }
    }


    /**
     * @private
     * @inner
     */
    function onTouchEnd( tracker, event ) {

        if ( event.touches.length === 0 &&
            event.targetTouches.length === 0 &&
            event.changedTouches.length == 1 ) {

            THIS[ tracker.hash ].lastTouch = null;

            // call with no release, as the mouse events are 
            // not registered in onTouchStart
            onMouseUpCaptured( tracker, event, true, true );
            onMouseOut( tracker, event, true );
        }
        if ( event.touches.length + event.changedTouches.length == 2 ) {
            THIS[ tracker.hash ].lastPinchDelta = null;
            THIS[ tracker.hash ].pinchMidpoint = null;
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
                onMouseUp( othertracker, event, false );
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
    function onMouseUpCaptured( tracker, event, noRelease, isTouch ) {
        isTouch = isTouch || false;

        if ( !THIS[ tracker.hash ].insideElement || isTouch ) {
            onMouseUp( tracker, event, isTouch );
        }

        if ( noRelease ) {
            return;
        }

        releaseMouse( tracker );
    }


    /**
     * @private
     * @inner
     */
    function onMouseMove( tracker, event ) {
        if ( tracker.moveHandler ) {
            event = $.getEvent( event );

            var propagate = tracker.moveHandler(
                {
                    eventSource:          tracker,
                    position:             getMouseRelative( event, tracker.element ),
                    isTouchEvent:         false,
                    originalEvent:        event,
                    preventDefaultAction: false,
                    userData:             tracker.userData
                }
            );
            if ( propagate === false ) {
                $.cancelEvent( event );
            }
        }
        if ( tracker.stopHandler ) {
            clearTimeout( tracker.stopTimeOut );
            tracker.stopTimeOut = setTimeout( function() {
                onMouseStop( tracker, event );
            }, tracker.stopDelay );
        }
    }
    
    /**
     * @private
     * @inner
     */
    function onMouseStop( tracker, originalMoveEvent ) {
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
     * Handler for 'wheel' events
     *
     * @private
     * @inner
     */
    function onWheel( tracker, event ) {
        handleWheelEvent( tracker, event, event, false );
    }


    /**
     * Handler for 'mousewheel', 'DOMMouseScroll', and 'MozMousePixelScroll' events
     *
     * @private
     * @inner
     */
    function onMouseWheel( tracker, event ) {
        // For legacy IE, access the global (window) event object
        event = event || window.event;

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

        handleWheelEvent( tracker, simulatedEvent, event, false );
    }


    /**
     * Handles 'wheel' events. 
     * The event may be simulated by the legacy mouse wheel event handler (onMouseWheel()) or onTouchMove().
     *
     * @private
     * @inner
     */
    function handleWheelEvent( tracker, event, originalEvent, isTouch ) {
        var nDelta = 0,
            propagate;

        isTouch = isTouch || false;

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
                    isTouchEvent:         isTouch,
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
    function handleMouseClick( tracker, event, isTouch ) {
        var delegate = THIS[ tracker.hash ],
            propagate;

        isTouch = isTouch || false;

        event = $.getEvent( event );

        var eventOrTouchPoint = isTouch ? event.changedTouches[ 0 ] : event;

        if ( event.button == 2 ) {
            return;
        }

        var time = $.now() - delegate.lastMouseDownTime,
            point = getMouseAbsolute( eventOrTouchPoint ),
            distance = delegate.lastMouseDownPoint.distanceTo( point ),
            quick = time <= tracker.clickTimeThreshold &&
                       distance <= tracker.clickDistThreshold;

        if ( tracker.clickHandler ) {
            propagate = tracker.clickHandler(
                {
                    eventSource:          tracker,
                    position:             getMouseRelative( eventOrTouchPoint, tracker.element ),
                    quick:                quick,
                    shift:                event.shiftKey,
                    isTouchEvent:         isTouch,
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
    function onMouseMoveCaptured( tracker, event, isTouch ) {
        var delegate = THIS[ tracker.hash ],
            delta,
            propagate,
            point;

        isTouch = isTouch || false;

        event = $.getEvent(event);
        var eventOrTouchPoint = isTouch ? event.touches[ 0 ] : event;
        point = getMouseAbsolute( eventOrTouchPoint );
        delta = point.minus( delegate.lastPoint );

        delegate.lastPoint = point;

        if ( tracker.dragHandler ) {
            propagate = tracker.dragHandler(
                {
                    eventSource:          tracker,
                    position:             getMouseRelative( eventOrTouchPoint, tracker.element ),
                    delta:                delta,
                    shift:                event.shiftKey,
                    isTouchEvent:         isTouch,
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
    function onTouchMove( tracker, event ) {
        var touchA,
            touchB,
            pinchDelta;

        if ( !THIS[ tracker.hash ].lastTouch ) {
            return;
        }

        if ( event.touches.length === 1 &&
            event.targetTouches.length === 1 &&
            event.changedTouches.length === 1 &&
            THIS[ tracker.hash ].lastTouch.identifier === event.touches[ 0 ].identifier ) {

            onMouseMoveCaptured( tracker, event, true );

        } else if ( event.touches.length === 2 ) {

            touchA = getMouseAbsolute( event.touches[ 0 ] );
            touchB = getMouseAbsolute( event.touches[ 1 ] );
            pinchDelta =
                Math.abs( touchA.x - touchB.x ) +
                Math.abs( touchA.y - touchB.y );

            //TODO: make the 75px pinch threshold configurable
            if ( Math.abs( THIS[ tracker.hash ].lastPinchDelta - pinchDelta ) > 75 ) {
                //$.console.debug( "pinch delta : " + pinchDelta + " | previous : " + THIS[ tracker.hash ].lastPinchDelta);

                // Simulate a 'wheel' event
                var simulatedEvent = {
                    target:     event.target || event.srcElement,
                    type:       "wheel",
                    shiftKey:   event.shiftKey || false,
                    clientX:    THIS[ tracker.hash ].pinchMidpoint.x,
                    clientY:    THIS[ tracker.hash ].pinchMidpoint.y,
                    pageX:      THIS[ tracker.hash ].pinchMidpoint.x,
                    pageY:      THIS[ tracker.hash ].pinchMidpoint.y,
                    deltaMode:  1, // 0=pixel, 1=line, 2=page
                    deltaX:     0,
                    deltaY:     ( THIS[ tracker.hash ].lastPinchDelta > pinchDelta ) ? 1 : -1,
                    deltaZ:     0
                };

                handleWheelEvent( tracker, simulatedEvent, event, true );

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
    function onMouseMoveCapturedIE( tracker, event ) {
        var i;
        for ( i = 0; i < CAPTURING.length; i++ ) {
            onMouseMoveCaptured( CAPTURING[ i ], event, false );
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
        var mouse  = $.getMousePosition( event ),
            offset = $.getElementOffset( element );

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
