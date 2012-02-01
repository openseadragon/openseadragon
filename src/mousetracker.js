
(function( $ ){

    //Ensures we dont break existing instances of mousetracker if we are dumb
    //enough to load openseadragon.js onto the page twice.  I don't know how
    //useful this pattern is, but if we decide to use it we should use it 
    //everywhere
    if ( $.MouseTracker ) {
        return;
    }

    var buttonDownAny       = false,
        ieCapturingAny      = false,
        ieTrackersActive    = {},   // dictionary from hash to MouseTracker
        ieTrackersCapturing = [];   // list of trackers interested in capture

    /**
     * @class
     */
    $.MouseTracker = function ( element, clickTimeThreshold, clickDistThreshold ) {
        //Start Thatcher - TODO: remove local function definitions in favor of 
        //               -       a global closure for MouseTracker so the number
        //               -       of Viewers has less memory impact.  Also use 
        //               -       prototype pattern instead of Singleton pattern.
        //End Thatcher

        this.hash = Math.random(); // a unique hash for this tracker
        this.element = $.getElement( element );

        this.tracking        = false;
        this.capturing       = false;
        this.buttonDownElement  = false;
        this.insideElement      = false;

        this.lastPoint           = null; // position of last mouse down/move
        this.lastMouseDownTime   = null; // time of last mouse down
        this.lastMouseDownPoint  = null; // position of last mouse down
        this.clickTimeThreshold  = clickTimeThreshold;
        this.clickDistThreshold  = clickDistThreshold;


        this.target         = element;
        this.enterHandler   = null;     // function(tracker, position, buttonDownElement, buttonDownAny)
        this.exitHandler    = null;     // function(tracker, position, buttonDownElement, buttonDownAny)
        this.pressHandler   = null;     // function(tracker, position)
        this.releaseHandler = null;     // function(tracker, position, insideElementPress, insideElementRelease)
        this.scrollHandler  = null;     // function(tracker, position, scroll, shift)
        this.clickHandler   = null;     // function(tracker, position, quick, shift)
        this.dragHandler    = null;     // function(tracker, position, delta, shift)

        this.delegates = {
            "mouseover": $.delegate(this, this.onMouseOver),
            "mouseout": $.delegate(this, this.onMouseOut), 
            "mousedown": $.delegate(this, this.onMouseDown),
            "mouseup": $.delegate(this, this.onMouseUp),
            "click": $.delegate(this, this.onMouseClick),
            "DOMMouseScroll": $.delegate(this, this.onMouseWheelSpin),
            "mousewheel": $.delegate(this, this.onMouseWheelSpin),
            "mouseupie": $.delegate(this, this.onMouseUpIE),
            "mousemoveie": $.delegate(this, this.onMouseMoveIE),
            "mouseupwindow": $.delegate(this, this.onMouseUpWindow),
            "mousemove": $.delegate(this, this.onMouseMove)
        };

    };

    $.MouseTracker.prototype = {


        /**
         * @method
         */
        isTracking: function () {
            return this.tracking;
        },

        /**
         * @method
         */
        setTracking: function ( track ) {
            if ( track ) {
                this.startTracking();
            } else {
                this.stopTracking();
            }
        },

        /**
         * @method
         */
        startTracking: function() {
            if ( !this.tracking ) {
                $.addEvent( this.element, "mouseover", this.delegates["mouseover"], false);
                $.addEvent( this.element, "mouseout", this.delegates["mouseout"], false);
                $.addEvent( this.element, "mousedown", this.delegates["mousedown"], false);
                $.addEvent( this.element, "mouseup", this.delegates["mouseup"], false);
                $.addEvent( this.element, "click", this.delegates["click"], false);
                $.addEvent( this.element, "DOMMouseScroll", this.delegates["DOMMouseScroll"], false);
                $.addEvent( this.element, "mousewheel", this.delegates["mousewheel"], false); // Firefox

                this.tracking = true;
                ieTrackersActive[ this.hash ] = this;
            }
        },

        /**
         * @method
         */
        stopTracking: function() {
            if ( this.tracking ) {
                $.removeEvent( this.element, "mouseover", this.delegates["mouseover"], false);
                $.removeEvent( this.element, "mouseout", this.delegates["mouseout"], false);
                $.removeEvent( this.element, "mousedown", this.delegates["mousedown"], false);
                $.removeEvent( this.element, "mouseup", this.delegates["mouseup"], false);
                $.removeEvent( this.element, "click", this.delegates["click"], false);
                $.removeEvent( this.element, "DOMMouseScroll", this.delegates["DOMMouseScroll"], false);
                $.removeEvent( this.element, "mousewheel", this.delegates["mousewheel"], false);

                this.releaseMouse();
                this.tracking = false;
                delete ieTrackersActive[ this.hash ];
            }
        },

        /**
         * @method
         */
        captureMouse: function() {
            if ( !this.capturing ) {
                if ( $.Browser.vendor == $.BROWSERS.IE ) {
                    $.removeEvent( this.element, "mouseup", this.delegates["mouseup"], false );
                    $.addEvent( this.element, "mouseup", this.delegates["mouseupie"], true );
                    $.addEvent( this.element, "mousemove", this.delegates["mousemoveie"], true );
                } else {
                    $.addEvent( window, "mouseup", this.delegates["mouseupwindow"], true );
                    $.addEvent( window, "mousemove", this.delegates["mousemove"], true );
                }

                this.capturing = true;
            }
        },

        
        /**
         * @method
         */
        releaseMouse: function() {
            if ( this.capturing ) {
                if ( $.Browser.vendor == $.BROWSERS.IE ) {
                    $.removeEvent( this.element, "mousemove", this.delegates["mousemoveie"], true );
                    $.removeEvent( this.element, "mouseup", this.delegates["mouseupie"], true );
                    $.addEvent( this.element, "mouseup", this.delegates["mouseup"], false );
                } else {
                    $.removeEvent( window, "mousemove", this.delegates["mousemove"], true );
                    $.removeEvent( window, "mouseup", this.delegates["mouseupwindow"], true );
                }

                this.capturing = false;
            }
        },


        /**
         * @method
         */
        triggerOthers: function( eventName, event ) {
            var trackers = ieTrackersActive,
                otherHash;
            for ( otherHash in trackers ) {
                if ( trackers.hasOwnProperty( otherHash ) && this.hash != otherHash ) {
                    trackers[ otherHash ][ eventName ]( event );
                }
            }
        },

        /**
         * @method
         */
        hasMouse: function() {
            return this.insideElement;
        },


        /**
         * @method
         */
        onMouseOver: function( event ) {
            var event = $.getEvent( event );

            if ( $.Browser.vendor == $.BROWSERS.IE && 
                 this.capturing && 
                 !isChild( event.srcElement, this.element ) ) {
                this.triggerOthers( "onMouseOver", event );
            }

            var to = event.target ? 
                    event.target : 
                    event.srcElement,
                from = event.relatedTarget ? 
                    event.relatedTarget : 
                    event.fromElement;

            if ( !isChild( this.element, to ) || isChild( this.element, from ) ) {
                return;
            }

            this.insideElement = true;

            if ( typeof( this.enterHandler ) == "function") {
                try {
                    this.enterHandler(
                        this, 
                        getMouseRelative( event, this.element ),
                        this.buttonDownElement, 
                        buttonDownAny
                    );
                } catch ( e ) {
                    $.console.error(
                        e.name + " while executing enter handler: " + e.message, 
                        e
                    );
                }
            }
        },

        /**
         * @method
         */
        onMouseOut: function( event ) {
            var event = $.getEvent( event );

            if ( $.Browser.vendor == $.BROWSERS.IE && 
                 this.capturing && 
                 !isChild( event.srcElement, this.element ) ) {
                this.triggerOthers( "onMouseOut", event );
            }

            var from = event.target ? 
                    event.target : 
                    event.srcElement,
                to = event.relatedTarget ? 
                    event.relatedTarget : 
                    event.toElement;

            if ( !isChild( this.element, from ) || isChild( this.element, to ) ) {
                return;
            }

            this.insideElement = false;

            if ( typeof( this.exitHandler ) == "function" ) {
                try {
                    this.exitHandler( 
                        this, 
                        getMouseRelative( event, this.element ),
                        this.buttonDownElement, 
                        buttonDownAny
                    );
                } catch ( e ) {
                    $.console.error(
                        e.name + " while executing exit handler: " + e.message, 
                        e
                    );
                }
            }
        },

        /**
         * @method
         * @inner
         */
        onMouseDown: function( event ) {
            var event = $.getEvent( event );

            if ( event.button == 2 ) {
                return;
            }

            this.buttonDownElement = true;

            this.lastPoint = getMouseAbsolute( event );
            this.lastMouseDownPoint = this.lastPoint;
            this.lastMouseDownTime = new Date().getTime();

            if ( typeof( this.pressHandler ) == "function" ) {
                try {
                    this.pressHandler( 
                        this, 
                        getMouseRelative( event, this.element )
                    );
                } catch (e) {
                    $.console.error(
                        e.name + " while executing press handler: " + e.message, 
                        e
                    );
                }
            }

            if ( this.pressHandler || this.dragHandler ) {
                $.cancelEvent( event );
            }

            if ( !( $.Browser.vendor == $.BROWSERS.IE ) || !ieCapturingAny ) {
                this.captureMouse();
                ieCapturingAny = true;
                ieTrackersCapturing = [ this ];     // reset to empty & add us
            } else if ( $.Browser.vendor == $.BROWSERS.IE ) {
                ieTrackersCapturing.push( this );   // add us to the list
            }
        },

        /**
         * @method
         */
        onMouseUp: function( event ) {
            var event = $.getEvent( event ),
                insideElementPress = this.buttonDownElement,
                insideElementRelease = this.insideElement;

            if ( event.button == 2 ) {
                return;
            }

            this.buttonDownElement = false;

            if ( typeof( this.releaseHandler ) == "function" ) {
                try {
                    this.releaseHandler(
                        this, 
                        getMouseRelative( event, this.element ),
                        insideElementPress, 
                        insideElementRelease
                    );
                } catch (e) {
                    $.console.error(
                        e.name + " while executing release handler: " + e.message, 
                        e
                    );
                }
            }

            if ( insideElementPress && insideElementRelease ) {
                this.handleMouseClick( event );
            }
        },

        /**
         * @method
         * Only triggered once by the deepest element that initially received
         * the mouse down event. We want to make sure THIS event doesn't bubble.
         * Instead, we want to trigger the elements that initially received the
         * mouse down event (including this one) only if the mouse is no longer
         * inside them. Then, we want to release capture, and emulate a regular
         * mouseup on the event that this event was meant for.
         */
        onMouseUpIE: function( event ) {
            var event = $.getEvent( event ),
                tracker,
                i;

            if ( event.button == 2 ) {
                return;
            }

            for ( i = 0; i < ieTrackersCapturing.length; i++ ) {
                tracker = ieTrackersCapturing[ i ];
                if ( !tracker.hasMouse() ) {
                    tracker.onMouseUp( event );
                }
            }

            this.releaseMouse();
            ieCapturingAny = false;
            event.srcElement.fireEvent(
                "on" + event.type,
                document.createEventObject( event )
            );

            $.stopEvent( event );
        },

        /**
         * @method
         * Only triggered in W3C browsers by elements within which the mouse was
         * initially pressed, since they are now listening to the window for
         * mouseup during the capture phase. We shouldn't handle the mouseup
         * here if the mouse is still inside this element, since the regular
         * mouseup handler will still fire.
         */
        onMouseUpWindow: function( event ) {
            if ( !this.insideElement ) {
                this.onMouseUp( event );
            }

            this.releaseMouse();
        },

        /**
         * @method
         */
        onMouseClick: function( event ) {

            if ( this.clickHandler ) {
                $.cancelEvent( event );
            }
        },

        /**
         * @method
         */
        onMouseWheelSpin: function( event ) {
            var nDelta = 0;
            
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

            nDelta = nDelta > 0 ? 1 : -1;

            if ( typeof( this.scrollHandler ) == "function" ) {
                try {
                    this.scrollHandler(
                        this, 
                        getMouseRelative( event, this.element ), 
                        nDelta, 
                        event.shiftKey
                    );
                } catch (e) {
                    $.console.error(
                        e.name + " while executing scroll handler: " + e.message, 
                        e
                    );
                }

                $.cancelEvent( event );
            }
        },

        /**
         * @method
         */
        handleMouseClick: function( event ) {
            var event = $.getEvent( event );

            if ( event.button == 2 ) {
                return;
            }

            var time = new Date().getTime() - this.lastMouseDownTime;
            var point = getMouseAbsolute( event );
            var distance = this.lastMouseDownPoint.distanceTo( point );
            var quick = (
                    time <= this.clickTimeThreshold 
                ) && (
                    distance <= this.clickDistThreshold
                );

            if ( typeof( this.clickHandler ) == "function" ) {
                try {
                    this.clickHandler(
                        this, 
                        getMouseRelative( event, this.element ),
                        quick, 
                        event.shiftKey
                    );
                } catch ( e ) {
                    $.console.error(
                        e.name + " while executing click handler: " + e.message, 
                        e
                    );
                }
            }
        },

        /**
         * @method
         */
        onMouseMove: function( event ) {
            var event = $.getEvent( event );
            var point = getMouseAbsolute( event );
            var delta = point.minus( this.lastPoint );

            this.lastPoint = point;

            if ( typeof( this.dragHandler ) == "function" ) {
                try {
                    this.dragHandler(
                        this, 
                        getMouseRelative( event, this.element ),
                        delta, 
                        event.shiftKey
                    );
                } catch (e) {
                    $.console.error(
                        e.name + " while executing drag handler: " + e.message, 
                        e
                    );
                }

                $.cancelEvent( event );
            }
        },

        /**
         * Only triggered once by the deepest element that initially received
         * the mouse down event. Since no other element has captured the mouse,
         * we want to trigger the elements that initially received the mouse
         * down event (including this one).
         * @method
         */
        onMouseMoveIE: function( event ) {
            var i;
            for ( i = 0; i < ieTrackersCapturing.length; i++ ) {
                ieTrackersCapturing[ i ].onMouseMove( event );
            }

            $.stopEvent( event );
        }

    };

    /**
    * @private
    * @inner
    */
    function getMouseAbsolute( event ) {
        return $.getMousePosition( event );
    };

    /**
    * @private
    * @inner
    */
    function getMouseRelative( event, element ) {
        var mouse   = $.getMousePosition( event ),
            offset  = $.getElementPosition( element );

        return mouse.minus( offset );
    };

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
    };

    /**
    * @private
    * @inner
    */
    function onGlobalMouseDown() {
        buttonDownAny = true;
    };

    /**
    * @private
    * @inner
    */
    function onGlobalMouseUp() {
        buttonDownAny = false;
    };


    (function () {
        if ( $.Browser.vendor == $.BROWSERS.IE ) {
            $.addEvent( document, "mousedown", onGlobalMouseDown, false );
            $.addEvent( document, "mouseup", onGlobalMouseUp, false );
        } else {
            $.addEvent( window, "mousedown", onGlobalMouseDown, true );
            $.addEvent( window, "mouseup", onGlobalMouseUp, true );
        }
    })();
    
}( OpenSeadragon ));
