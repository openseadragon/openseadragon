
(function( $ ){

    //Ensures we dont break existing instances of mousetracker if we are dumb
    //enough to load openseadragon.js onto the page twice.  I don't know how
    //useful this pattern is, but if we decide to use it we should use it 
    //everywhere
    if ($.MouseTracker) {
        return;
    }

    var isIE                = $.Browser.vendor == $.BROWSERS.IE,
        buttonDownAny       = false,
        ieCapturingAny      = false,
        ieTrackersActive    = {},   // dictionary from hash to MouseTracker
        ieTrackersCapturing = [];   // list of trackers interested in capture

    /**
     * @class
     */
    $.MouseTracker = function (elmt, clickTimeThreshold, clickDistThreshold) {
        //Start Thatcher - TODO: remove local function definitions in favor of 
        //               -       a global closure for MouseTracker so the number
        //               -       of Viewers has less memory impact.  Also use 
        //               -       prototype pattern instead of Singleton pattern.
        //End Thatcher
        var self    = this,
            ieSelf  = null,

            hash = Math.random(), // a unique hash for this tracker
            elmt = $.getElement(elmt),

            tracking        = false,
            capturing       = false,
            buttonDownElmt  = false,
            insideElmt      = false,

            lastPoint           = null, // position of last mouse down/move
            lastMouseDownTime   = null, // time of last mouse down
            lastMouseDownPoint  = null, // position of last mouse down
            clickTimeThreshold  = clickTimeThreshold,
            clickDistThreshold  = clickDistThreshold;


        this.target         = elmt;
        this.enterHandler   = null;     // function(tracker, position, buttonDownElmt, buttonDownAny)
        this.exitHandler    = null;     // function(tracker, position, buttonDownElmt, buttonDownAny)
        this.pressHandler   = null;     // function(tracker, position)
        this.releaseHandler = null;     // function(tracker, position, insideElmtPress, insideElmtRelease)
        this.scrollHandler  = null;     // function(tracker, position, scroll, shift)
        this.clickHandler   = null;     // function(tracker, position, quick, shift)
        this.dragHandler    = null;     // function(tracker, position, delta, shift)

        (function () {
            ieSelf = {
                hasMouse: hasMouse,
                onMouseOver: onMouseOver,
                onMouseOut: onMouseOut,
                onMouseUp: onMouseUp,
                onMouseMove: onMouseMove
            };
        })();


        this.isTracking = function () {
            return tracking;
        };

        this.setTracking = function (track) {
            if (track) {
                startTracking();
            } else {
                stopTracking();
            }
        };

        function startTracking() {
            if (!tracking) {
                $.addEvent(elmt, "mouseover", onMouseOver, false);
                $.addEvent(elmt, "mouseout", onMouseOut, false);
                $.addEvent(elmt, "mousedown", onMouseDown, false);
                $.addEvent(elmt, "mouseup", onMouseUp, false);
                $.addEvent(elmt, "click", onMouseClick, false);
                $.addEvent(elmt, "DOMMouseScroll", onMouseWheelSpin, false);
                $.addEvent(elmt, "mousewheel", onMouseWheelSpin, false); // Firefox

                tracking = true;
                ieTrackersActive[hash] = ieSelf;
            }
        }

        function stopTracking() {
            if (tracking) {
                $.removeEvent(elmt, "mouseover", onMouseOver, false);
                $.removeEvent(elmt, "mouseout", onMouseOut, false);
                $.removeEvent(elmt, "mousedown", onMouseDown, false);
                $.removeEvent(elmt, "mouseup", onMouseUp, false);
                $.removeEvent(elmt, "click", onMouseClick, false);
                $.removeEvent(elmt, "DOMMouseScroll", onMouseWheelSpin, false);
                $.removeEvent(elmt, "mousewheel", onMouseWheelSpin, false);

                releaseMouse();
                tracking = false;
                delete ieTrackersActive[hash];
            }
        }

        function captureMouse() {
            if (!capturing) {
                if (isIE) {
                    $.removeEvent(elmt, "mouseup", onMouseUp, false);
                    $.addEvent(elmt, "mouseup", onMouseUpIE, true);
                    $.addEvent(elmt, "mousemove", onMouseMoveIE, true);
                } else {
                    $.addEvent(window, "mouseup", onMouseUpWindow, true);
                    $.addEvent(window, "mousemove", onMouseMove, true);
                }

                capturing = true;
            }
        }

        function releaseMouse() {
            if (capturing) {
                if (isIE) {
                    $.removeEvent(elmt, "mousemove", onMouseMoveIE, true);
                    $.removeEvent(elmt, "mouseup", onMouseUpIE, true);
                    $.addEvent(elmt, "mouseup", onMouseUp, false);
                } else {
                    $.removeEvent(window, "mousemove", onMouseMove, true);
                    $.removeEvent(window, "mouseup", onMouseUpWindow, true);
                }

                capturing = false;
            }
        }


        function triggerOthers(eventName, event) {
            var trackers = ieTrackersActive;
            for (var otherHash in trackers) {
                if (trackers.hasOwnProperty(otherHash) && hash != otherHash) {
                    trackers[otherHash][eventName](event);
                }
            }
        }

        function hasMouse() {
            return insideElmt;
        }


        function onMouseOver(event) {
            var event = $.getEvent(event);

            if (isIE && capturing && !isChild(event.srcElement, elmt)) {
                triggerOthers("onMouseOver", event);
            }

            var to = event.target ? event.target : event.srcElement;
            var from = event.relatedTarget ? event.relatedTarget : event.fromElement;
            if (!isChild(elmt, to) || isChild(elmt, from)) {
                return;
            }

            insideElmt = true;

            if (typeof (self.enterHandler) == "function") {
                try {
                    self.enterHandler(self, getMouseRelative(event, elmt),
                            buttonDownElmt, buttonDownAny);
                } catch (e) {
                    $.console.error(e.name +
                            " while executing enter handler: " + e.message, e);
                }
            }
        }

        function onMouseOut(event) {
            var event = $.getEvent(event);

            if (isIE && capturing && !isChild(event.srcElement, elmt)) {
                triggerOthers("onMouseOut", event);
            }

            var from = event.target ? event.target : event.srcElement;
            var to = event.relatedTarget ? event.relatedTarget : event.toElement;
            if (!isChild(elmt, from) || isChild(elmt, to)) {
                return;
            }

            insideElmt = false;

            if (typeof (self.exitHandler) == "function") {
                try {
                    self.exitHandler(self, getMouseRelative(event, elmt),
                            buttonDownElmt, buttonDownAny);
                } catch (e) {
                    $.console.error(e.name +
                            " while executing exit handler: " + e.message, e);
                }
            }
        }

        function onMouseDown(event) {
            var event = $.getEvent(event);

            if (event.button == 2) {
                return;
            }

            buttonDownElmt = true;

            lastPoint = getMouseAbsolute(event);
            lastMouseDownPoint = lastPoint;
            lastMouseDownTime = new Date().getTime();

            if (typeof (self.pressHandler) == "function") {
                try {
                    self.pressHandler(self, getMouseRelative(event, elmt));
                } catch (e) {
                    $.console.error(e.name +
                            " while executing press handler: " + e.message, e);
                }
            }

            if (self.pressHandler || self.dragHandler) {
                $.cancelEvent(event);
            }

            if (!isIE || !ieCapturingAny) {
                captureMouse();
                ieCapturingAny = true;
                ieTrackersCapturing = [ieSelf];     // reset to empty & add us
            } else if (isIE) {
                ieTrackersCapturing.push(ieSelf);   // add us to the list
            }
        }

        function onMouseUp(event) {
            var event = $.getEvent(event);
            var insideElmtPress = buttonDownElmt;
            var insideElmtRelease = insideElmt;

            if (event.button == 2) {
                return;
            }

            buttonDownElmt = false;

            if (typeof (self.releaseHandler) == "function") {
                try {
                    self.releaseHandler(self, getMouseRelative(event, elmt),
                            insideElmtPress, insideElmtRelease);
                } catch (e) {
                    $.console.error(e.name +
                            " while executing release handler: " + e.message, e);
                }
            }

            if (insideElmtPress && insideElmtRelease) {
                handleMouseClick(event);
            }
        }

        /**
        * Only triggered once by the deepest element that initially received
        * the mouse down event. We want to make sure THIS event doesn't bubble.
        * Instead, we want to trigger the elements that initially received the
        * mouse down event (including this one) only if the mouse is no longer
        * inside them. Then, we want to release capture, and emulate a regular
        * mouseup on the event that this event was meant for.
        */
        function onMouseUpIE(event) {
            var event = $.getEvent(event);

            if (event.button == 2) {
                return;
            }

            for (var i = 0; i < ieTrackersCapturing.length; i++) {
                var tracker = ieTrackersCapturing[i];
                if (!tracker.hasMouse()) {
                    tracker.onMouseUp(event);
                }
            }

            releaseMouse();
            ieCapturingAny = false;
            event.srcElement.fireEvent("on" + event.type,
                    document.createEventObject(event));

            $.stopEvent(event);
        }

        /**
        * Only triggered in W3C browsers by elements within which the mouse was
        * initially pressed, since they are now listening to the window for
        * mouseup during the capture phase. We shouldn't handle the mouseup
        * here if the mouse is still inside this element, since the regular
        * mouseup handler will still fire.
        */
        function onMouseUpWindow(event) {
            if (!insideElmt) {
                onMouseUp(event);
            }

            releaseMouse();
        }

        function onMouseClick(event) {

            if (self.clickHandler) {
                $.cancelEvent(event);
            }
        }

        function onMouseWheelSpin(event) {
            var nDelta = 0;
            if (!event) { // For IE, access the global (window) event object
                event = window.event;
            }
            if (event.wheelDelta) { // IE and Opera
                nDelta = event.wheelDelta;
                if (window.opera) {  // Opera has the values reversed
                    nDelta = -nDelta;
                }
            }
            else if (event.detail) { // Mozilla FireFox
                nDelta = -event.detail;
            }

            nDelta = nDelta > 0 ? 1 : -1;

            if (typeof (self.scrollHandler) == "function") {
                try {
                    self.scrollHandler(self, getMouseRelative(event, elmt), nDelta, event.shiftKey);
                } catch (e) {
                    $.console.error(e.name +
                            " while executing scroll handler: " + e.message, e);
                }

                $.cancelEvent(event);
            }
        }

        function handleMouseClick(event) {
            var event = $.getEvent(event);

            if (event.button == 2) {
                return;
            }

            var time = new Date().getTime() - lastMouseDownTime;
            var point = getMouseAbsolute(event);
            var distance = lastMouseDownPoint.distanceTo(point);
            var quick = time <= clickTimeThreshold &&
                    distance <= clickDistThreshold;

            if (typeof (self.clickHandler) == "function") {
                try {
                    self.clickHandler(self, getMouseRelative(event, elmt),
                            quick, event.shiftKey);
                } catch (e) {
                    $.console.error(e.name +
                            " while executing click handler: " + e.message, e);
                }
            }
        }

        function onMouseMove(event) {
            var event = $.getEvent(event);
            var point = getMouseAbsolute(event);
            var delta = point.minus(lastPoint);

            lastPoint = point;

            if (typeof (self.dragHandler) == "function") {
                try {
                    self.dragHandler(
                        self, 
                        getMouseRelative( event, elmt ),
                        delta, 
                        event.shiftKey
                    );
                } catch (e) {
                    $.console.error(
                        e.name +
                        " while executing drag handler: " 
                        + e.message, 
                        e
                    );
                }

                $.cancelEvent(event);
            }
        }

        /**
        * Only triggered once by the deepest element that initially received
        * the mouse down event. Since no other element has captured the mouse,
        * we want to trigger the elements that initially received the mouse
        * down event (including this one).
        */
        function onMouseMoveIE(event) {
            for (var i = 0; i < ieTrackersCapturing.length; i++) {
                ieTrackersCapturing[i].onMouseMove(event);
            }

            $.stopEvent(event);
        }

    };

    function getMouseAbsolute( event ) {
        return $.getMousePosition(event);
    }

    function getMouseRelative( event, elmt ) {
        var mouse = $.getMousePosition(event);
        var offset = $.getElementPosition(elmt);

        return mouse.minus(offset);
    }

    /**
    * @private
    * Returns true if elmtB is a child node of elmtA, or if they're equal.
    */
    function isChild( elmtA, elmtB ) {
        var body = document.body;
        while (elmtB && elmtA != elmtB && body != elmtB) {
            try {
                elmtB = elmtB.parentNode;
            } catch (e) {
                return false;
            }
        }
        return elmtA == elmtB;
    }

    function onGlobalMouseDown() {
        buttonDownAny = true;
    }

    function onGlobalMouseUp() {
        buttonDownAny = false;
    }


    (function () {
        if (isIE) {
            $.addEvent(document, "mousedown", onGlobalMouseDown, false);
            $.addEvent(document, "mouseup", onGlobalMouseUp, false);
        } else {
            $.addEvent(window, "mousedown", onGlobalMouseDown, true);
            $.addEvent(window, "mouseup", onGlobalMouseUp, true);
        }
    })();
    
}( OpenSeadragon ));
