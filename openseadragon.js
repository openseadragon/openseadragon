/**
 * (c) 2011 Christopher Thatcher
 * (c) 2010 OpenSeadragon
 * (c) 2010 CodePlex Foundation
 *
 * OpenSeadragon 0.8.0
 * ----------------------------------------------------------------------------
 * 
 *  License: New BSD License (BSD)
 *  Copyright (c) 2010, OpenSeadragon
 *  All rights reserved.
 * 
 *  Redistribution and use in source and binary forms, with or without 
 *  modification, are permitted provided that the following conditions are met:
 *  
 *  * Redistributions of source code must retain the above copyright notice, this 
 *    list of conditions and the following disclaimer.
 *  
 *  * Redistributions in binary form must reproduce the above copyright notice, 
 *    this list of conditions and the following disclaimer in the documentation 
 *    and/or other materials provided with the distribution.
 * 
 *  * Neither the name of OpenSeadragon nor the names of its contributors may be 
 *    used to endorse or promote products derived from this software without 
 *    specific prior written permission.
 * 
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" 
 *  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE 
 *  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE 
 *  ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE 
 *  LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR 
 *  CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF 
 *  SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS 
 *  INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN 
 *  CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) 
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE 
 *  POSSIBILITY OF SUCH DAMAGE.
 * 
 * ----------------------------------------------------------------------------
 *
 **/

OpenSeadragon = window.OpenSeadragon || (function(){
    
    //Taken from jquery 1.6.1
    // [[Class]] -> type pairs
    var class2type = {
        '[object Boolean]':     'boolean',
        '[object Number]':      'number',
        '[object String]':      'string',
        '[object Function]':    'function',
        '[object Array]':       'array',
        '[object Date]':        'date',
        '[object RegExp]':      'regexp',
        '[object Object]':      'object'
    },
    // Save a reference to some core methods
    toString    = Object.prototype.toString,
    hasOwn      = Object.prototype.hasOwnProperty,
    push        = Array.prototype.push,
    slice       = Array.prototype.slice,
    trim        = String.prototype.trim,
    indexOf     = Array.prototype.indexOf;

    return {
        // See test/unit/core.js for details concerning isFunction.
        // Since version 1.3, DOM methods and functions like alert
        // aren't supported. They return false on IE (#2968).
        isFunction: function( obj ) {
            return OpenSeadragon.type(obj) === "function";
        },

        isArray: Array.isArray || function( obj ) {
            return OpenSeadragon.type(obj) === "array";
        },

        // A crude way of determining if an object is a window
        isWindow: function( obj ) {
            return obj && typeof obj === "object" && "setInterval" in obj;
        },

        type: function( obj ) {
            return obj == null ?
                String( obj ) :
                class2type[ toString.call(obj) ] || "object";
        },

        isPlainObject: function( obj ) {
            // Must be an Object.
            // Because of IE, we also have to check the presence of the constructor property.
            // Make sure that DOM nodes and window objects don't pass through, as well
            if ( !obj || OpenSeadragon.type(obj) !== "object" || obj.nodeType || OpenSeadragon.isWindow( obj ) ) {
                return false;
            }

            // Not own constructor property must be Object
            if ( obj.constructor &&
                !hasOwn.call(obj, "constructor") &&
                !hasOwn.call(obj.constructor.prototype, "isPrototypeOf") ) {
                return false;
            }

            // Own properties are enumerated firstly, so to speed up,
            // if last one is own, then all properties are own.

            var key;
            for ( key in obj ) {}

            return key === undefined || hasOwn.call( obj, key );
        },

        isEmptyObject: function( obj ) {
            for ( var name in obj ) {
                return false;
            }
            return true;
        }

    };

}());

(function( $ ){
    
    $.SIGNAL = "----seadragon----";

    $.delegate = function(object, method) {
        return function() {
            if (arguments === undefined)
                arguments = [];
            return method.apply(object, arguments);
        };
    };

    //Taken from jQuery 1.6.1:
    $.extend = function() {
        var options, name, src, copy, copyIsArray, clone,
            target = arguments[0] || {},
            i = 1,
            length = arguments.length,
            deep = false;

        // Handle a deep copy situation
        if ( typeof target === "boolean" ) {
            deep = target;
            target = arguments[1] || {};
            // skip the boolean and the target
            i = 2;
        }

        // Handle case when target is a string or something (possible in deep copy)
        if ( typeof target !== "object" && !OpenSeadragon.isFunction(target) ) {
            target = {};
        }

        // extend jQuery itself if only one argument is passed
        if ( length === i ) {
            target = this;
            --i;
        }

        for ( ; i < length; i++ ) {
            // Only deal with non-null/undefined values
            if ( (options = arguments[ i ]) != null ) {
                // Extend the base object
                for ( name in options ) {
                    src = target[ name ];
                    copy = options[ name ];

                    // Prevent never-ending loop
                    if ( target === copy ) {
                        continue;
                    }

                    // Recurse if we're merging plain objects or arrays
                    if ( deep && copy && ( OpenSeadragon.isPlainObject(copy) || (copyIsArray = OpenSeadragon.isArray(copy)) ) ) {
                        if ( copyIsArray ) {
                            copyIsArray = false;
                            clone = src && OpenSeadragon.isArray(src) ? src : [];

                        } else {
                            clone = src && OpenSeadragon.isPlainObject(src) ? src : {};
                        }

                        // Never move original objects, clone them
                        target[ name ] = OpenSeadragon.extend( deep, clone, copy );

                    // Don't bring in undefined values
                    } else if ( copy !== undefined ) {
                        target[ name ] = copy;
                    }
                }
            }
        }

        // Return the modified object
        return target;
    };

}( OpenSeadragon ));

(function($){


    $.EventHandlerList = function() {
        this._list = {};
    };

    $.EventHandlerList.prototype = {

        addHandler: function(id, handler) {
            var events = this._list[ id ];
            if( !events ){
                this._list[ id ] = events = [];
            }
            events[events.length] = handler;
        },

        removeHandler: function(id, handler) {
            //Start Thatcher - unneccessary indirection.  Also, because events were
            //               - not actually being removed, we need to add the code
            //               - to do the removal ourselves. TODO
            var evt = this._list[ id ];
            if (!evt) return;
            //End Thatcher
        },
        getHandler: function(id) {
            var evt = this._list[ id ]; 
            if (!evt || !evt.length) return null;
            evt = evt.length === 1 ? 
                [evt[0]] : 
                Array.apply( null, evt );
            return function(source, args) {
                for (var i = 0, l = evt.length; i < l; i++) {
                    evt[i](source, args);
                }
            };
        }
    };

}( OpenSeadragon ));


OpenSeadragon.Utils = OpenSeadragon.Utils  || function(){};

(function( $ ){

$.Utils = function() {


    var Browser = {
        UNKNOWN: 0,
        IE: 1,
        FIREFOX: 2,
        SAFARI: 3,
        CHROME: 4,
        OPERA: 5
    };

    $.Browser = Browser;


    var self = this;

    var arrActiveX = ["Msxml2.XMLHTTP", "Msxml3.XMLHTTP", "Microsoft.XMLHTTP"];
    var fileFormats = {
        "bmp": false,
        "jpeg": true,
        "jpg": true,
        "png": true,
        "tif": false,
        "wdp": false
    };

    var browser = Browser.UNKNOWN;
    var browserVersion = 0;
    var badAlphaBrowser = false;    // updated in constructor

    var urlParams = {};


    (function() {


        var app = navigator.appName;
        var ver = navigator.appVersion;
        var ua = navigator.userAgent;

        if (app == "Microsoft Internet Explorer" &&
                !!window.attachEvent && !!window.ActiveXObject) {

            var ieOffset = ua.indexOf("MSIE");
            browser = Browser.IE;
            browserVersion = parseFloat(
                    ua.substring(ieOffset + 5, ua.indexOf(";", ieOffset)));

        } else if (app == "Netscape" && !!window.addEventListener) {

            var ffOffset = ua.indexOf("Firefox");
            var saOffset = ua.indexOf("Safari");
            var chOffset = ua.indexOf("Chrome");

            if (ffOffset >= 0) {
                browser = Browser.FIREFOX;
                browserVersion = parseFloat(ua.substring(ffOffset + 8));
            } else if (saOffset >= 0) {
                var slash = ua.substring(0, saOffset).lastIndexOf("/");
                browser = (chOffset >= 0) ? Browser.CHROME : Browser.SAFARI;
                browserVersion = parseFloat(ua.substring(slash + 1, saOffset));
            }

        } else if (app == "Opera" && !!window.opera && !!window.attachEvent) {

            browser = Browser.OPERA;
            browserVersion = parseFloat(ver);

        }


        var query = window.location.search.substring(1);    // ignore '?'
        var parts = query.split('&');

        for (var i = 0; i < parts.length; i++) {
            var part = parts[i];
            var sep = part.indexOf('=');

            if (sep > 0) {
                urlParams[part.substring(0, sep)] =
                        decodeURIComponent(part.substring(sep + 1));
            }
        }


        badAlphaBrowser = (browser == Browser.IE ||
                (browser == Browser.CHROME && browserVersion < 2));

    })();


    function getOffsetParent(elmt, isFixed) {
        if (isFixed && elmt != document.body) {
            return document.body;
        } else {
            return elmt.offsetParent;
        }
    }


    this.getBrowser = function() {
        return browser;
    };

    this.getBrowserVersion = function() {
        return browserVersion;
    };

    this.getElement = function(elmt) {
        if (typeof (elmt) == "string") {
            elmt = document.getElementById(elmt);
        }
        return elmt;
    };

    this.getElementPosition = function(elmt) {
        var elmt = self.getElement(elmt);
        var result = new $.Point();


        var isFixed = self.getElementStyle(elmt).position == "fixed";
        var offsetParent = getOffsetParent(elmt, isFixed);

        while (offsetParent) {
            result.x += elmt.offsetLeft;
            result.y += elmt.offsetTop;

            if (isFixed) {
                result = result.plus(self.getPageScroll());
            }

            elmt = offsetParent;
            isFixed = self.getElementStyle(elmt).position == "fixed";
            offsetParent = getOffsetParent(elmt, isFixed);
        }

        return result;
    };

    this.getElementSize = function(elmt) {
        var elmt = self.getElement(elmt);
        return new $.Point(elmt.clientWidth, elmt.clientHeight);
    };

    this.getElementStyle = function(elmt) {
        var elmt = self.getElement(elmt);

        if (elmt.currentStyle) {
            return elmt.currentStyle;
        } else if (window.getComputedStyle) {
            return window.getComputedStyle(elmt, "");
        } else {
            $.Debug.fail("Unknown element style, no known technique.");
        }
    };

    this.getEvent = function(event) {
        return event ? event : window.event;
    };

    this.getMousePosition = function(event) {
        var event = self.getEvent(event);
        var result = new $.Point();


        if (typeof (event.pageX) == "number") {
            result.x = event.pageX;
            result.y = event.pageY;
        } else if (typeof (event.clientX) == "number") {
            result.x = event.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
            result.y = event.clientY + document.body.scrollTop + document.documentElement.scrollTop;
        } else {
            $.Debug.fail("Unknown event mouse position, no known technique.");
        }

        return result;
    };

    this.getPageScroll = function() {
        var result = new $.Point();
        var docElmt = document.documentElement || {};
        var body = document.body || {};


        if (typeof (window.pageXOffset) == "number") {
            result.x = window.pageXOffset;
            result.y = window.pageYOffset;
        } else if (body.scrollLeft || body.scrollTop) {
            result.x = body.scrollLeft;
            result.y = body.scrollTop;
        } else if (docElmt.scrollLeft || docElmt.scrollTop) {
            result.x = docElmt.scrollLeft;
            result.y = docElmt.scrollTop;
        }


        return result;
    };

    this.getWindowSize = function() {
        var result = new $.Point();
        var docElmt = document.documentElement || {};
        var body = document.body || {};



        if (typeof (window.innerWidth) == 'number') {
            result.x = window.innerWidth;
            result.y = window.innerHeight;
        } else if (docElmt.clientWidth || docElmt.clientHeight) {
            result.x = docElmt.clientWidth;
            result.y = docElmt.clientHeight;
        } else if (body.clientWidth || body.clientHeight) {
            result.x = body.clientWidth;
            result.y = body.clientHeight;
        } else {
            $.Debug.fail("Unknown window size, no known technique.");
        }

        return result;
    };

    this.imageFormatSupported = function(ext) {
        var ext = ext ? ext : "";
        return !!fileFormats[ext.toLowerCase()];
    };

    this.makeCenteredNode = function(elmt) {
        var elmt = $.Utils.getElement(elmt);
        var div = self.makeNeutralElement("div");
        var html = [];

        html.push('<div style="display:table; height:100%; width:100%;');
        html.push('border:none; margin:0px; padding:0px;'); // neutralizing
        html.push('#position:relative; overflow:hidden; text-align:left;">');
        html.push('<div style="#position:absolute; #top:50%; width:100%; ');
        html.push('border:none; margin:0px; padding:0px;'); // neutralizing
        html.push('display:table-cell; vertical-align:middle;">');
        html.push('<div style="#position:relative; #top:-50%; width:100%; ');
        html.push('border:none; margin:0px; padding:0px;'); // neutralizing
        html.push('text-align:center;"></div></div></div>');

        div.innerHTML = html.join('');
        div = div.firstChild;

        var innerDiv = div;
        var innerDivs = div.getElementsByTagName("div");
        while (innerDivs.length > 0) {
            innerDiv = innerDivs[0];
            innerDivs = innerDiv.getElementsByTagName("div");
        }

        innerDiv.appendChild(elmt);

        return div;
    };

    this.makeNeutralElement = function(tagName) {
        var elmt = document.createElement(tagName);
        var style = elmt.style;

        style.background = "transparent none";
        style.border = "none";
        style.margin = "0px";
        style.padding = "0px";
        style.position = "static";

        return elmt;
    };

    this.makeTransparentImage = function(src) {
        var img = self.makeNeutralElement("img");
        var elmt = null;

        if (browser == Browser.IE && browserVersion < 7) {
            elmt = self.makeNeutralElement("span");
            elmt.style.display = "inline-block";

            img.onload = function() {
                elmt.style.width = elmt.style.width || img.width + "px";
                elmt.style.height = elmt.style.height || img.height + "px";

                img.onload = null;
                img = null;     // to prevent memory leaks in IE
            };

            img.src = src;
            elmt.style.filter =
                    "progid:DXImageTransform.Microsoft.AlphaImageLoader(src='" +
                    src + "', sizingMethod='scale')";
        } else {
            elmt = img;
            elmt.src = src;
        }

        return elmt;
    };

    this.setElementOpacity = function(elmt, opacity, usesAlpha) {
        var elmt = self.getElement(elmt);

        if (usesAlpha && badAlphaBrowser) {
            opacity = Math.round(opacity);
        }

        if (opacity < 1) {
            elmt.style.opacity = opacity;
        } else {
            elmt.style.opacity = "";
        }

        if (opacity == 1) {
            var prevFilter = elmt.style.filter || "";
            elmt.style.filter = prevFilter.replace(/alpha\(.*?\)/g, "");
            return;
        }

        var ieOpacity = Math.round(100 * opacity);
        var ieFilter = " alpha(opacity=" + ieOpacity + ") ";

        try {
            if (elmt.filters && elmt.filters.alpha) {
                elmt.filters.alpha.opacity = ieOpacity;
            } else {
                elmt.style.filter += ieFilter;
            }
        } catch (e) {
            elmt.style.filter += ieFilter;
        }
    };

    this.addEvent = function(elmt, eventName, handler, useCapture) {
        var elmt = self.getElement(elmt);


        if (elmt.addEventListener) {
            elmt.addEventListener(eventName, handler, useCapture);
        } else if (elmt.attachEvent) {
            elmt.attachEvent("on" + eventName, handler);
            if (useCapture && elmt.setCapture) {
                elmt.setCapture();
            }
        } else {
            $.Debug.fail("Unable to attach event handler, no known technique.");
        }
    };

    this.removeEvent = function(elmt, eventName, handler, useCapture) {
        var elmt = self.getElement(elmt);


        if (elmt.removeEventListener) {
            elmt.removeEventListener(eventName, handler, useCapture);
        } else if (elmt.detachEvent) {
            elmt.detachEvent("on" + eventName, handler);
            if (useCapture && elmt.releaseCapture) {
                elmt.releaseCapture();
            }
        } else {
            $.Debug.fail("Unable to detach event handler, no known technique.");
        }
    };

    this.cancelEvent = function(event) {
        var event = self.getEvent(event);


        if (event.preventDefault) {
            event.preventDefault();     // W3C for preventing default
        }

        event.cancel = true;            // legacy for preventing default
        event.returnValue = false;      // IE for preventing default
    };

    this.stopEvent = function(event) {
        var event = self.getEvent(event);


        if (event.stopPropagation) {
            event.stopPropagation();    // W3C for stopping propagation
        }

        event.cancelBubble = true;      // IE for stopping propagation
    };

    this.createCallback = function(object, method) {
        var initialArgs = [];
        for (var i = 2; i < arguments.length; i++) {
            initialArgs.push(arguments[i]);
        }

        return function() {
            var args = initialArgs.concat([]);
            for (var i = 0; i < arguments.length; i++) {
                args.push(arguments[i]);
            }

            return method.apply(object, args);
        };
    };

    this.getUrlParameter = function(key) {
        var value = urlParams[key];
        return value ? value : null;
    };

    this.makeAjaxRequest = function(url, callback) {
        var async = typeof (callback) == "function";
        var req = null;

        if (async) {
            var actual = callback;
            var callback = function() {
                window.setTimeout($.Utils.createCallback(null, actual, req), 1);
            };
        }

        if (window.ActiveXObject) {
            for (var i = 0; i < arrActiveX.length; i++) {
                try {
                    req = new ActiveXObject(arrActiveX[i]);
                    break;
                } catch (e) {
                    continue;
                }
            }
        } else if (window.XMLHttpRequest) {
            req = new XMLHttpRequest();
        }

        if (!req) {
            $.Debug.fail("Browser doesn't support XMLHttpRequest.");
        }


        if (async) {
            req.onreadystatechange = function() {
                if (req.readyState == 4) {
                    req.onreadystatechange = new function() { };
                    callback();
                }
            };
        }

        try {
            req.open("GET", url, async);
            req.send(null);
        } catch (e) {
            $.Debug.log(e.name + " while making AJAX request: " + e.message);

            req.onreadystatechange = null;
            req = null;

            if (async) {
                callback();
            }
        }

        return async ? null : req;
    };

    this.parseXml = function(string) {
        var xmlDoc = null;

        if (window.ActiveXObject) {
            try {
                xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
                xmlDoc.async = false;
                xmlDoc.loadXML(string);
            } catch (e) {
                $.Debug.log(e.name + " while parsing XML (ActiveX): " + e.message);
            }
        } else if (window.DOMParser) {
            try {
                var parser = new DOMParser();
                xmlDoc = parser.parseFromString(string, "text/xml");
            } catch (e) {
                $.Debug.log(e.name + " while parsing XML (DOMParser): " + e.message);
            }
        } else {
            $.Debug.fail("Browser doesn't support XML DOM.");
        }

        return xmlDoc;
    };

};

//Start Thatcher - Remove Singleton pattern in favor of object literals
//  TODO
$.Utils = new $.Utils();
//End Thatcher

}( OpenSeadragon ));
(function( $ ){

    if ($.MouseTracker) {
        return;
    }


    var isIE = $.Utils.getBrowser() == $.Browser.IE;


    var buttonDownAny = false;

    var ieCapturingAny = false;
    var ieTrackersActive = {};      // dictionary from hash to MouseTracker
    var ieTrackersCapturing = [];   // list of trackers interested in capture


    function getMouseAbsolute(event) {
        return $.Utils.getMousePosition(event);
    }

    function getMouseRelative(event, elmt) {
        var mouse = $.Utils.getMousePosition(event);
        var offset = $.Utils.getElementPosition(elmt);

        return mouse.minus(offset);
    }

    /**
    * Returns true if elmtB is a child node of elmtA, or if they're equal.
    */
    function isChild(elmtA, elmtB) {
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
            $.Utils.addEvent(document, "mousedown", onGlobalMouseDown, false);
            $.Utils.addEvent(document, "mouseup", onGlobalMouseUp, false);
        } else {
            $.Utils.addEvent(window, "mousedown", onGlobalMouseDown, true);
            $.Utils.addEvent(window, "mouseup", onGlobalMouseUp, true);
        }
    })();


    $.MouseTracker = function (elmt, clickTimeThreshold, clickDistThreshold) {
        //Start Thatcher - TODO: remove local function definitions in favor of 
        //               -       a global closre for MouseTracker so the number
        //               -       of Viewers has less memory impact.  Also use 
        //               -       prototype pattern instead of Singleton pattern.
        //End Thatcher
        var self = this;
        var ieSelf = null;

        var hash = Math.random();     // a unique hash for this tracker
        var elmt = $.Utils.getElement(elmt);

        var tracking = false;
        var capturing = false;
        var buttonDownElmt = false;
        var insideElmt = false;

        var lastPoint = null;           // position of last mouse down/move
        var lastMouseDownTime = null;   // time of last mouse down
        var lastMouseDownPoint = null;  // position of last mouse down
        var clickTimeThreshold = clickTimeThreshold;
        var clickDistThreshold = clickDistThreshold;


        this.target = elmt;
        this.enterHandler = null;       // function(tracker, position, buttonDownElmt, buttonDownAny)
        this.exitHandler = null;        // function(tracker, position, buttonDownElmt, buttonDownAny)
        this.pressHandler = null;       // function(tracker, position)
        this.releaseHandler = null;     // function(tracker, position, insideElmtPress, insideElmtRelease)
        this.scrollHandler = null;      // function(tracker, position, scroll, shift)
        this.clickHandler = null;       // function(tracker, position, quick, shift)
        this.dragHandler = null;        // function(tracker, position, delta, shift)



        function startTracking() {
            if (!tracking) {
                $.Utils.addEvent(elmt, "mouseover", onMouseOver, false);
                $.Utils.addEvent(elmt, "mouseout", onMouseOut, false);
                $.Utils.addEvent(elmt, "mousedown", onMouseDown, false);
                $.Utils.addEvent(elmt, "mouseup", onMouseUp, false);
                $.Utils.addEvent(elmt, "click", onMouseClick, false);
                $.Utils.addEvent(elmt, "DOMMouseScroll", onMouseWheelSpin, false);
                $.Utils.addEvent(elmt, "mousewheel", onMouseWheelSpin, false); // Firefox

                tracking = true;
                ieTrackersActive[hash] = ieSelf;
            }
        }

        function stopTracking() {
            if (tracking) {
                $.Utils.removeEvent(elmt, "mouseover", onMouseOver, false);
                $.Utils.removeEvent(elmt, "mouseout", onMouseOut, false);
                $.Utils.removeEvent(elmt, "mousedown", onMouseDown, false);
                $.Utils.removeEvent(elmt, "mouseup", onMouseUp, false);
                $.Utils.removeEvent(elmt, "click", onMouseClick, false);
                $.Utils.removeEvent(elmt, "DOMMouseScroll", onMouseWheelSpin, false);
                $.Utils.removeEvent(elmt, "mousewheel", onMouseWheelSpin, false);

                releaseMouse();
                tracking = false;
                delete ieTrackersActive[hash];
            }
        }

        function captureMouse() {
            if (!capturing) {
                if (isIE) {
                    $.Utils.removeEvent(elmt, "mouseup", onMouseUp, false);
                    $.Utils.addEvent(elmt, "mouseup", onMouseUpIE, true);
                    $.Utils.addEvent(elmt, "mousemove", onMouseMoveIE, true);
                } else {
                    $.Utils.addEvent(window, "mouseup", onMouseUpWindow, true);
                    $.Utils.addEvent(window, "mousemove", onMouseMove, true);
                }

                capturing = true;
            }
        }

        function releaseMouse() {
            if (capturing) {
                if (isIE) {
                    $.Utils.removeEvent(elmt, "mousemove", onMouseMoveIE, true);
                    $.Utils.removeEvent(elmt, "mouseup", onMouseUpIE, true);
                    $.Utils.addEvent(elmt, "mouseup", onMouseUp, false);
                } else {
                    $.Utils.removeEvent(window, "mousemove", onMouseMove, true);
                    $.Utils.removeEvent(window, "mouseup", onMouseUpWindow, true);
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
            var event = $.Utils.getEvent(event);

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
                    $.Debug.error(e.name +
                            " while executing enter handler: " + e.message, e);
                }
            }
        }

        function onMouseOut(event) {
            var event = $.Utils.getEvent(event);

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
                    $.Debug.error(e.name +
                            " while executing exit handler: " + e.message, e);
                }
            }
        }

        function onMouseDown(event) {
            var event = $.Utils.getEvent(event);

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
                    $.Debug.error(e.name +
                            " while executing press handler: " + e.message, e);
                }
            }

            if (self.pressHandler || self.dragHandler) {
                $.Utils.cancelEvent(event);
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
            var event = $.Utils.getEvent(event);
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
                    $.Debug.error(e.name +
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
            var event = $.Utils.getEvent(event);

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

            $.Utils.stopEvent(event);
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
                $.Utils.cancelEvent(event);
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
                    $.Debug.error(e.name +
                            " while executing scroll handler: " + e.message, e);
                }

                $.Utils.cancelEvent(event);
            }
        }

        function handleMouseClick(event) {
            var event = $.Utils.getEvent(event);

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
                    $.Debug.error(e.name +
                            " while executing click handler: " + e.message, e);
                }
            }
        }

        function onMouseMove(event) {
            var event = $.Utils.getEvent(event);
            var point = getMouseAbsolute(event);
            var delta = point.minus(lastPoint);

            lastPoint = point;

            if (typeof (self.dragHandler) == "function") {
                try {
                    self.dragHandler(self, getMouseRelative(event, elmt),
                            delta, event.shiftKey);
                } catch (e) {
                    $.Debug.error(e.name +
                            " while executing drag handler: " + e.message, e);
                }

                $.Utils.cancelEvent(event);
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

            $.Utils.stopEvent(event);
        }


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

    };

    
}( OpenSeadragon ));

(function( $ ){
    

    $.ControlAnchor = function() {
        throw Error.invalidOperation();
    };

    $.ControlAnchor = {
        NONE: 0,
        TOP_LEFT: 1,
        TOP_RIGHT: 2,
        BOTTOM_RIGHT: 3,
        BOTTOM_LEFT: 4
    };
    
    $.ControlAnchor = $.ControlAnchor;

}( OpenSeadragon ));


(function( $ ){
    
    $.OverlayPlacement = function() {
        throw Error.invalidOperation();
    };

    $.OverlayPlacement = {
        CENTER: 0,
        TOP_LEFT: 1,
        TOP: 2,
        TOP_RIGHT: 3,
        RIGHT: 4,
        BOTTOM_RIGHT: 5,
        BOTTOM: 6,
        BOTTOM_LEFT: 7,
        LEFT: 8
    };

}( OpenSeadragon ));

(function( $ ){
    
$.NavControl = function(viewer) {
    this._group = null;
    this._zooming = false;    // whether we should be continuously zooming
    this._zoomFactor = null;  // how much we should be continuously zooming by
    this._lastZoomTime = null;
    this._viewer = viewer;
    this.config = this._viewer.config;

    this.elmt = null;
    this.initialize();
};

$.NavControl.prototype = {
    initialize: function() {
        var beginZoomingInHandler = $.delegate(this, this._beginZoomingIn);
        var endZoomingHandler = $.delegate(this, this._endZooming);
        var doSingleZoomInHandler = $.delegate(this, this._doSingleZoomIn);
        var beginZoomingOutHandler = $.delegate(this, this._beginZoomingOut);
        var doSingleZoomOutHandler = $.delegate(this, this._doSingleZoomOut);
        var onHomeHandler = $.delegate(this, this._onHome);
        var onFullPageHandler = $.delegate(this, this._onFullPage);

        var navImages = this._viewer.config.navImages;

        var zoomIn = new $.Button({ 
            config: this._viewer.config, 
            tooltip: $.Strings.getString("Tooltips.ZoomIn"), 
            srcRest: this._resolveUrl(navImages.zoomIn.REST), 
            srcGroup: this._resolveUrl(navImages.zoomIn.GROUP), 
            srcHover: this._resolveUrl(navImages.zoomIn.HOVER), 
            srcDown: this._resolveUrl(navImages.zoomIn.DOWN) 
        },{ 
            onPress: beginZoomingInHandler, 
            onRelease: endZoomingHandler, 
            onClick: doSingleZoomInHandler, 
            onEnter: beginZoomingInHandler, 
            onExit: endZoomingHandler 
        });
        var zoomOut = new $.Button({ 
            config: this._viewer.config, 
            tooltip: $.Strings.getString("Tooltips.ZoomOut"), 
            srcRest: this._resolveUrl(navImages.zoomOut.REST), 
            srcGroup: this._resolveUrl(navImages.zoomOut.GROUP), 
            srcHover: this._resolveUrl(navImages.zoomOut.HOVER), 
            srcDown: this._resolveUrl(navImages.zoomOut.DOWN) 
        }, { 
            onPress: beginZoomingOutHandler, 
            onRelease: endZoomingHandler, 
            onClick: doSingleZoomOutHandler, 
            onEnter: beginZoomingOutHandler, 
            onExit: endZoomingHandler 
        });
        var goHome = new $.Button({ 
            config: this._viewer.config, 
            tooltip: $.Strings.getString("Tooltips.Home"), 
            srcRest: this._resolveUrl(navImages.home.REST), 
            srcGroup: this._resolveUrl(navImages.home.GROUP), 
            srcHover: this._resolveUrl(navImages.home.HOVER), 
            srcDown: this._resolveUrl(navImages.home.DOWN) 
        },{ 
            onRelease: onHomeHandler 
        });
        var fullPage = new $.Button({ 
            config: this._viewer.config, 
            tooltip: $.Strings.getString("Tooltips.FullPage"), 
            srcRest: this._resolveUrl(navImages.fullpage.REST), 
            srcGroup: this._resolveUrl(navImages.fullpage.GROUP), 
            srcHover: this._resolveUrl(navImages.fullpage.HOVER), 
            srcDown: this._resolveUrl(navImages.fullpage.DOWN) 
        },{ 
            onRelease: onFullPageHandler 
        });
        this._group = new $.ButtonGroup({ 
            config: this._viewer.config, 
            buttons: [zoomIn, zoomOut, goHome, fullPage] 
        });

        this.elmt = this._group.element;
        this.elmt[$.SIGNAL] = true;   // hack to get our controls to fade
        this._viewer.add_open($.delegate(this, this._lightUp));
    },

    get_events: function() {
        return this._events;
    },
    set_events: function(value) {
        this._events = value;
    },
    _resolveUrl: function(url) {
        var prefix = this._viewer.prefixUrl;
        return prefix ? prefix + url : url;
    },
    _beginZoomingIn: function() {
        this._lastZoomTime = new Date().getTime();
        this._zoomFactor = this.config.zoomPerSecond;
        this._zooming = true;
        this._scheduleZoom();
    },
    _beginZoomingOut: function() {
        this._lastZoomTime = new Date().getTime();
        this._zoomFactor = 1.0 / this.config.zoomPerSecond;
        this._zooming = true;
        this._scheduleZoom();
    },

    _endZooming: function() {
        this._zooming = false;
    },
    _scheduleZoom: function() {
        window.setTimeout($.delegate(this, this._doZoom), 10);
    },
    _doZoom: function() {
        if (this._zooming && this._viewer.viewport) {
            var currentTime = new Date().getTime();
            var deltaTime = currentTime - this._lastZoomTime;
            var adjustedFactor = Math.pow(this._zoomFactor, deltaTime / 1000);

            this._viewer.viewport.zoomBy(adjustedFactor);
            this._viewer.viewport.applyConstraints();
            this._lastZoomTime = currentTime;
            this._scheduleZoom();
        }
    },
    _doSingleZoomIn: function() {
        if (this._viewer.viewport) {
            this._zooming = false;
            this._viewer.viewport.zoomBy(this.config.zoomPerClick / 1.0);
            this._viewer.viewport.applyConstraints();
        }
    },
    _doSingleZoomOut: function() {
        if (this._viewer.viewport) {
            this._zooming = false;
            this._viewer.viewport.zoomBy(1.0 / this.config.zoomPerClick);
            this._viewer.viewport.applyConstraints();
        }
    },
    _lightUp: function() {
        this._group.emulateEnter();
        this._group.emulateExit();
    },
    _onHome: function() {
        if (this._viewer.viewport) {
            this._viewer.viewport.goHome();
        }
    },
    _onFullPage: function() {
        this._viewer.setFullPage(!this._viewer.isFullPage());
        this._group.emulateExit();  // correct for no mouseout event on change

        if (this._viewer.viewport) {
            this._viewer.viewport.applyConstraints();
        }
    }
};

}( OpenSeadragon ));

(function( $ ){
    

$.Control = function (elmt, anchor, container) {
    this.elmt = elmt;
    this.anchor = anchor;
    this.container = container;
    this.wrapper = $.Utils.makeNeutralElement("span");
    this.wrapper.style.display = "inline-block";
    this.wrapper.appendChild(this.elmt);
    if (this.anchor == $.ControlAnchor.NONE) {
        this.wrapper.style.width = this.wrapper.style.height = "100%";    // IE6 fix
    }

    if (this.anchor == $.ControlAnchor.TOP_RIGHT || this.anchor == $.ControlAnchor.BOTTOM_RIGHT) {
        this.container.insertBefore(this.wrapper, this.container.firstChild);
    } else {
        this.container.appendChild(this.wrapper);
    }
};

$.Control.prototype = {
    destroy: function() {
        this.wrapper.removeChild(this.elmt);
        this.container.removeChild(this.wrapper);
    },
    isVisible: function() {
        return this.wrapper.style.display != "none";
    },
    setVisible: function(visible) {
        this.wrapper.style.display = visible ? "inline-block" : "none";
    },
    setOpacity: function(opacity) {
        if (this.elmt[$.SIGNAL] && $.Utils.getBrowser() == $.Browser.IE) {
            $.Utils.setElementOpacity(this.elmt, opacity, true);
        } else {
            $.Utils.setElementOpacity(this.wrapper, opacity, true);
        }
    }
};

}( OpenSeadragon ));

(function( $ ){
/**
 *  OpenSeadragon Viewer
 *
 *  The main point of entry into creating a zoomable image on the page.
 *
 *  We have provided an idiomatic javascript constructor which takes
 *  a single object, but still support the legacy positional arguments.
 *
 *  The options below are given in order that they appeared in the constructor
 *  as arguments and we translate a positional call into an idiomatic call.
 *
 *  options:{
 *      element:    String id of Element to attach to,
 *      xmlPath:    String xpath ( TODO: not sure! ),
 *      prefixUrl:  String url used to prepend to paths, eg button images,
 *      controls:   Array of Seadragon.Controls,
 *      overlays:   Array of Seadragon.Overlays,
 *      overlayControls: An Array of ( TODO: not sure! )
 *  }
 *
 *
 **/    
$.Viewer = function( options ) {

    var args = arguments,
        _this = this,
        innerTracker,
        outerTracker,
        i;

    if( typeof( options ) != 'object' ){
        options = {
            id:                 args[ 0 ],
            xmlPath:            args.length > 1 ? args[ 1 ] : undefined,
            prefixUrl:          args.length > 2 ? args[ 2 ] : undefined,
            controls:           args.length > 3 ? args[ 3 ] : undefined,
            overlays:           args.length > 4 ? args[ 4 ] : undefined,
            overlayControls:    args.length > 5 ? args[ 5 ] : undefined,
            config:             {}
        };
    }
    
    //Allow the options object to override global defaults
    $.extend( true, this, { 
        id:                 options.id,
        xmlPath:            null,
        prefixUrl:          '',
        controls:           [],
        overlays:           [],
        overlayControls:    [],
        config: {
            debugMode:          true,
            animationTime:      1.5,
            blendTime:          0.5,
            alwaysBlend:        false,
            autoHideControls:   true,
            immediateRender:    false,
            wrapHorizontal:     false,
            wrapVertical:       false,
            minZoomImageRatio:  0.8,
            maxZoomPixelRatio:  2,
            visibilityRatio:    0.5,
            springStiffness:    5.0,
            imageLoaderLimit:   2,
            clickTimeThreshold: 200,
            clickDistThreshold: 5,
            zoomPerClick:       2.0,
            zoomPerScroll:      1.2,
            zoomPerSecond:      2.0,
            showNavigationControl: true,
            maxImageCacheCount: 100,
            minPixelRatio:      0.5,
            mouseNavEnabled:    true,
            navImages: {
                zoomIn: {
                    REST:   '/images/zoomin_rest.png',
                    GROUP:  '/images/zoomin_grouphover.png',
                    HOVER:  '/images/zoomin_hover.png',
                    DOWN:   '/images/zoomin_pressed.png'
                },
                zoomOut: {
                    REST:   '/images/zoomout_rest.png',
                    GROUP:  '/images/zoomout_grouphover.png',
                    HOVER:  '/images/zoomout_hover.png',
                    DOWN:   '/images/zoomout_pressed.png'
                },
                home: {
                    REST:   '/images/home_rest.png',
                    GROUP:  '/images/home_grouphover.png',
                    HOVER:  '/images/home_hover.png',
                    DOWN:   '/images/home_pressed.png'
                },
                fullpage: {
                    REST:   '/images/fullpage_rest.png',
                    GROUP:  '/images/fullpage_grouphover.png',
                    HOVER:  '/images/fullpage_hover.png',
                    DOWN:   '/images/fullpage_pressed.png'
                }
            }
        },

        //These were referenced but never defined
        controlsFadeDelay:  2000,
        controlsFadeLength: 1500,

        //These are originally not part options but declared as members
        //in initialize.  Its still considered idiomatic to put them here
        source:     null,
        drawer:     null,
        viewport:   null,
        profiler:   null,

        //This was originally initialized in the constructor and so could never
        //have anything in it.  now it can because we allow it to be specified
        //in the options and is only empty by default if not specified. Also
        //this array was returned from get_controls which I find confusing
        //since this object has a controls property which is treated in other
        //functions like clearControls.  I'm removing the accessors.
        customControls: []

    }, options );

    this.element        = document.getElementById( options.id );
    this.container      = $.Utils.makeNeutralElement("div");
    this.canvas         = $.Utils.makeNeutralElement("div");
    this.events         = new $.EventHandlerList();

    this._fsBoundsDelta = new $.Point(1, 1);
    this._prevContainerSize = null;
    this._lastOpenStartTime = 0;
    this._lastOpenEndTime   = 0;
    this._animating         = false;
    this._forceRedraw       = false;
    this._mouseInside       = false;

    innerTracker = new $.MouseTracker(
        this.canvas, 
        this.config.clickTimeThreshold, 
        this.config.clickDistThreshold
    );
    innerTracker.clickHandler   = $.delegate(this, onCanvasClick);
    innerTracker.dragHandler    = $.delegate(this, onCanvasDrag);
    innerTracker.releaseHandler = $.delegate(this, onCanvasRelease);
    innerTracker.scrollHandler  = $.delegate(this, onCanvasScroll);
    innerTracker.setTracking( true ); // default state

    outerTracker = new $.MouseTracker(
        this.container, 
        this.config.clickTimeThreshold, 
        this.config.clickDistThreshold
    );
    outerTracker.enterHandler   = $.delegate(this, onContainerEnter);
    outerTracker.exitHandler    = $.delegate(this, onContainerExit);
    outerTracker.releaseHandler = $.delegate(this, onContainerRelease);
    outerTracker.setTracking( true ); // always tracking

    (function( canvas ){
        canvas.width    = "100%";
        canvas.height   = "100%";
        canvas.overflow = "hidden";
        canvas.position = "absolute";
        canvas.top      = "0px";
        canvas.left     = "0px";
    }(  this.canvas.style ));


    (function( container ){
        container.width     = "100%";
        container.height    = "100%";
        container.position  = "relative";
        container.left      = "0px";
        container.top       = "0px";
        container.textAlign = "left";  // needed to protect against
    }( this.container.style ));

    var layouts = [ 'topleft', 'topright', 'bottomright', 'bottomleft'],
        layout;

    for( i = 0; i < layouts.length; i++ ){
        layout = layouts[ i ]
        this.controls[ layout ] = $.Utils.makeNeutralElement("div");
        this.controls[ layout ].style.position = 'absolute';
        if ( layout.match( 'left' ) ){
            this.controls[ layout ].style.left = '0px';
        }
        if ( layout.match( 'right' ) ){
            this.controls[ layout ].style.right = '0px';
        }
        if ( layout.match( 'top' ) ){
            this.controls[ layout ].style.top = '0px';
        }
        if ( layout.match( 'bottom' ) ){
            this.controls[ layout ].style.bottom = '0px';
        }
    }

    if ( this.get_showNavigationControl() ) {
        navControl = (new $.NavControl(this)).elmt;
        navControl.style.marginRight = "4px";
        navControl.style.marginBottom = "4px";
        this.addControl(navControl, $.ControlAnchor.BOTTOM_RIGHT);
    }

    for ( i = 0; i < this.customControls.length; i++ ) {
        this.addControl(
            this.customControls[ i ].id, 
            this.customControls[ i ].anchor
        );
    }

    this.container.appendChild( this.canvas );
    this.container.appendChild( this.controls.topleft );
    this.container.appendChild( this.controls.topright );
    this.container.appendChild( this.controls.bottomright );
    this.container.appendChild( this.controls.bottomleft );
    this.element.appendChild( this.container );

    window.setTimeout( function(){
        beginControlsAutoHide( _this );
    }, 1 );    // initial fade out

    if (this.xmlPath){
        this.openDzi( this.xmlPath );
    }
};

$.Viewer.prototype = {
    
    _onClose: function () {

        this.source = null;
        this.viewport = null;
        this.drawer = null;
        this.profiler = null;

        this.canvas.innerHTML = "";
    },
    _beforeOpen: function () {
        if (this.source) {
            this._onClose();
        }

        this._lastOpenStartTime = new Date().getTime();   // to ignore earlier opens

        window.setTimeout($.delegate(this, function () {
            if (this._lastOpenStartTime > this._lastOpenEndTime) {
                this._setMessage($.Strings.getString("Messages.Loading"));
            }
        }), 2000);

        return this._lastOpenStartTime;
    },
    _onOpen: function (time, _source, error) {
        this._lastOpenEndTime = new Date().getTime();

        if (time < this._lastOpenStartTime) {
            $.Debug.log("Ignoring out-of-date open.");
            raiseEvent( this, "ignore" );
            return;
        } else if (!_source) {
            this._setMessage(error);
            raiseEvent( this, "error" );
            return;
        }

        this.canvas.innerHTML = "";
        this._prevContainerSize = $.Utils.getElementSize( this.container );

        this.source = _source;
        this.viewport = new $.Viewport(this._prevContainerSize, this.source.dimensions, this.config);
        this.drawer = new $.Drawer(this.source, this.viewport, this.canvas);
        this.profiler = new $.Profiler();

        this._animating = false;
        this._forceRedraw = true;
        scheduleUpdate( this, this._updateMulti );

        for (var i = 0; i < this.overlayControls.length; i++) {
            var overlay = this.overlayControls[ i ];
            if (overlay.point != null) {
                this.drawer.addOverlay(overlay.id, new $.Point(overlay.point.X, overlay.point.Y), $.OverlayPlacement.TOP_LEFT);
            }
            else {
                this.drawer.addOverlay(overlay.id, new $.Rect(overlay.rect.Point.X, overlay.rect.Point.Y, overlay.rect.Width, overlay.rect.Height), overlay.placement);
            }
        }
        raiseEvent( this, "open" );
    },
    _updateMulti: function () {
        if (!this.source) {
            return;
        }

        var beginTime = new Date().getTime();

        this._updateOnce();
        scheduleUpdate( this, arguments.callee, beginTime );
    },
    _updateOnce: function () {
        if (!this.source) {
            return;
        }

        this.profiler.beginUpdate();

        var containerSize = $.Utils.getElementSize( this.container );

        if (!containerSize.equals(this._prevContainerSize)) {
            this.viewport.resize(containerSize, true); // maintain image position
            this._prevContainerSize = containerSize;
            raiseEvent( this, "resize" );
        }

        var animated = this.viewport.update();

        if (!this._animating && animated) {
            raiseEvent( this, "animationstart" );
            abortControlsAutoHide( this );
        }

        if (animated) {
            this.drawer.update();
            raiseEvent( this, "animation" );
        } else if (this._forceRedraw || this.drawer.needsUpdate()) {
            this.drawer.update();
            this._forceRedraw = false;
        } else {
            this.drawer.idle();
        }

        if (this._animating && !animated) {
            raiseEvent( this, "animationfinish" );

            if (!this._mouseInside) {
                beginControlsAutoHide( this );
            }
        }

        this._animating = animated;

        this.profiler.endUpdate();
    },

    getNavControl: function () {
        return this._navControl;
    },
    get_element: function () {
        return this._element;
    },
    get_debugMode: function () {
        return this.config.debugMode;
    },
    set_debugMode: function (value) {
        this.config.debugMode = value;
    },
    get_animationTime: function () {
        return this.config.animationTime;
    },
    set_animationTime: function (value) {
        this.config.animationTime = value;
    },
    get_blendTime: function () {
        return this.config.blendTime;
    },
    set_blendTime: function (value) {
        this.config.blendTime = value;
    },
    get_alwaysBlend: function () {
        return this.config.alwaysBlend;
    },
    set_alwaysBlend: function (value) {
        this.config.alwaysBlend = value;
    },
    get_autoHideControls: function () {
        return this.config.autoHideControls;
    },
    set_autoHideControls: function (value) {
        this.config.autoHideControls = value;
    },
    get_immediateRender: function () {
        return this.config.immediateRender;
    },
    set_immediateRender: function (value) {
        this.config.immediateRender = value;
    },
    get_wrapHorizontal: function () {
        return this.config.wrapHorizontal;
    },
    set_wrapHorizontal: function (value) {
        this.config.wrapHorizontal = value;
    },
    get_wrapVertical: function () {
        return this.config.wrapVertical;
    },
    set_wrapVertical: function (value) {
        this.config.wrapVertical = value;
    },
    get_minZoomImageRatio: function () {
        return this.config.minZoomImageRatio;
    },
    set_minZoomImageRatio: function (value) {
        this.config.minZoomImageRatio = value;
    },
    get_maxZoomPixelRatio: function () {
        return this.config.maxZoomPixelRatio;
    },
    set_maxZoomPixelRatio: function (value) {
        this.config.maxZoomPixelRatio = value;
    },
    get_visibilityRatio: function () {
        return this.config.visibilityRatio;
    },
    set_visibilityRatio: function (value) {
        this.config.visibilityRatio = value;
    },
    get_springStiffness: function () {
        return this.config.springStiffness;
    },
    set_springStiffness: function (value) {
        this.config.springStiffness = value;
    },
    get_imageLoaderLimit: function () {
        return this.config.imageLoaderLimit;
    },
    set_imageLoaderLimit: function (value) {
        this.config.imageLoaderLimit = value;
    },
    get_clickTimeThreshold: function () {
        return this.config.clickTimeThreshold;
    },
    set_clickTimeThreshold: function (value) {
        this.config.clickTimeThreshold = value;
    },
    get_clickDistThreshold: function () {
        return this.config.clickDistThreshold;
    },
    set_clickDistThreshold: function (value) {
        this.config.clickDistThreshold = value;
    },
    get_zoomPerClick: function () {
        return this.config.zoomPerClick;
    },
    set_zoomPerClick: function (value) {
        this.config.zoomPerClick = value;
    },
    get_zoomPerSecond: function () {
        return this.config.zoomPerSecond;
    },
    set_zoomPerSecond: function (value) {
        this.config.zoomPerSecond = value;
    },
    get_zoomPerScroll: function () {
        return this.config.zoomPerScroll;
    },
    set_zoomPerScroll: function (value) {
        this.config.zoomPerScroll = value;
    },
    get_maxImageCacheCount: function () {
        return this.config.maxImageCacheCount;
    },
    set_maxImageCacheCount: function (value) {
        this.config.maxImageCacheCount = value;
    },
    get_showNavigationControl: function () {
        return this.config.showNavigationControl;
    },
    set_showNavigationControl: function (value) {
        this.config.showNavigationControl = value;
    },
    get_minPixelRatio: function () {
        return this.config.minPixelRatio;
    },
    set_minPixelRatio: function (value) {
        this.config.minPixelRatio = value;
    },
    get_mouseNavEnabled: function () {
        return this.config.mouseNavEnabled;
    },
    set_mouseNavEnabled: function (value) {
        this.config.mouseNavEnabled = value;
    },
    add_open: function (handler) {
        this.events.addHandler("open", handler);
    },
    remove_open: function (handler) {
        this.events.removeHandler("open", handler);
    },
    add_error: function (handler) {
        this.events.addHandler("error", handler);
    },
    remove_error: function (handler) {
        this.events.removeHandler("error", handler);
    },
    add_ignore: function (handler) {
        this.events.addHandler("ignore", handler);
    },
    remove_ignore: function (handler) {
        this.events.removeHandler("ignore", handler);
    },
    add_resize: function (handler) {
        this.events.addHandler("resize", handler);
    },
    remove_resize: function (handler) {
        this.events.removeHandler("resize", handler);
    },
    add_animationstart: function (handler) {
        this.events.addHandler("animationstart", handler);
    },
    remove_animationstart: function (handler) {
        this.events.removeHandler("animationstart", handler);
    },
    add_animation: function (handler) {
        this.events.addHandler("animation", handler);
    },
    remove_animation: function (handler) {
        this.events.removeHandler("animation", handler);
    },
    add_animationfinish: function (handler) {
        this.events.addHandler("animationfinish", handler);
    },
    remove_animationfinish: function (handler) {
        this.events.removeHandler("animationfinish", handler);
    },
    addControl: function ( elmt, anchor ) {
        var elmt = $.Utils.getElement( elmt ),
            div = null;

        if ( getControlIndex( this, elmt ) >= 0 ) {
            return;     // they're trying to add a duplicate control
        }

        switch ( anchor ) {
            case $.ControlAnchor.TOP_RIGHT:
                div = this.controls.topright;
                elmt.style.position = "relative";
                break;
            case $.ControlAnchor.BOTTOM_RIGHT:
                div = this.controls.bottomright;
                elmt.style.position = "relative";
                break;
            case $.ControlAnchor.BOTTOM_LEFT:
                div = this.controls.bottomleft;
                elmt.style.position = "relative";
                break;
            case $.ControlAnchor.TOP_LEFT:
                div = this.controls.topleft;
                elmt.style.position = "relative";
                break;
            case $.ControlAnchor.NONE:
            default:
                div = this.container;
                elmt.style.position = "absolute";
                break;
        }

        this.controls.push(
            new $.Control( elmt, anchor, div )
        );
        elmt.style.display = "inline-block";
    },
    isOpen: function () {
        return !!this.source;
    },
    openDzi: function (xmlUrl, xmlString) {
        var currentTime = this._beforeOpen();
        $.DziTileSourceHelper.createFromXml(
            xmlUrl, 
            xmlString,
            $.Utils.createCallback(
                null, 
                $.delegate(this, this._onOpen), 
                currentTime
            )
        );
    },
    openTileSource: function (tileSource) {
        var currentTime = beforeOpen();
        window.setTimeout($.delegate(this, function () {
            onOpen(currentTime, tileSource);
        }), 1);
    },
    close: function () {
        if ( !this.source ) {
            return;
        }

        this._onClose();
    },
    removeControl: function ( elmt ) {
        var elmt = $.Utils.getElement( elmt ),
            i    = getControlIndex( this, elmt );
        if ( i >= 0 ) {
            this.controls[ i ].destroy();
            this.controls.splice( i, 1 );
        }
    },
    clearControls: function () {
        while ( this.controls.length > 0 ) {
            this.controls.pop().destroy();
        }
    },
    isDashboardEnabled: function () {
        var i;
        for ( i = this.controls.length - 1; i >= 0; i-- ) {
            if (this.controls[ i ].isVisible()) {
                return true;
            }
        }

        return false;
    },

    isFullPage: function () {
        return this.container.parentNode == document.body;
    },

    isMouseNavEnabled: function () {
        return this._innerTracker.isTracking();
    },

    isVisible: function () {
        return this.container.style.visibility != "hidden";
    },

    setDashboardEnabled: function (enabled) {
        var i;
        for ( i = this.controls.length - 1; i >= 0; i-- ) {
            this.controls[ i ].setVisible( enabled );
        }
    },

    setFullPage: function( fullPage ) {
        if ( fullPage == this.isFullPage() ) {
            return;
        }

        var body        = document.body,
            bodyStyle   = body.style,
            docStyle    = document.documentElement.style,
            containerStyle = this.container.style,
            canvasStyle = this.canvas.style,
            oldBounds,
            newBounds;

        if ( fullPage ) {

            bodyOverflow        = bodyStyle.overflow;
            docOverflow         = docStyle.overflow;
            bodyStyle.overflow  = "hidden";
            docStyle.overflow   = "hidden";

            bodyWidth           = bodyStyle.width;
            bodyHeight          = bodyStyle.height;
            bodyStyle.width     = "100%";
            bodyStyle.height    = "100%";

            canvasStyle.backgroundColor = "black";
            canvasStyle.color           = "white";

            containerStyle.position = "fixed";
            containerStyle.zIndex   = "99999999";

            body.appendChild( this.container );
            this._prevContainerSize = $.Utils.getWindowSize();

            // mouse will be inside container now
            onContainerEnter( this );

        } else {

            bodyStyle.overflow  = bodyOverflow;
            docStyle.overflow   = docOverflow;

            bodyStyle.width     = bodyWidth;
            bodyStyle.height    = bodyHeight;

            canvasStyle.backgroundColor = "";
            canvasStyle.color           = "";

            containerStyle.position = "relative";
            containerStyle.zIndex   = "";

            this.element.appendChild( this.container );
            this._prevContainerSize = $.Utils.getElementSize( this.element );
            
            // mouse will likely be outside now
            onContainerExit( this );      

        }

        if ( this.viewport ) {
            oldBounds = this.viewport.getBounds();
            this.viewport.resize(this._prevContainerSize);
            newBounds = this.viewport.getBounds();

            if ( fullPage ) {
                this._fsBoundsDelta = new $.Point(
                    newBounds.width  / oldBounds.width,
                    newBounds.height / oldBounds.height
                );
            } else {
                this.viewport.update();
                this.viewport.zoomBy(
                    Math.max( 
                        this._fsBoundsDelta.x, 
                        this._fsBoundsDelta.y 
                    ),
                    null, 
                    true
                );
            }

            this._forceRedraw = true;
            raiseEvent( this, "resize", this );
            this._updateOnce();
        }
    },

    setMouseNavEnabled: function( enabled ){
        this._innerTracker.setTracking(enabled);
    },

    setVisible: function( visible ){
        this.container.style.visibility = visible ? "" : "hidden";
    }

};

///////////////////////////////////////////////////////////////////////////////
// Schedulers provide the general engine for animation
///////////////////////////////////////////////////////////////////////////////

function scheduleUpdate( viewer, updateFunc, prevUpdateTime ){
    var currentTime,
        prevUpdateTime,
        targetTime,
        deltaTime;

    if (this._animating) {
        return window.setTimeout(
            $.delegate(viewer, updateFunc), 
            1
        );
    }

    currentTime     = +new Date();
    prevUpdateTime  = prevUpdateTime ? prevUpdateTime : currentTime;
    targetTime      = prevUpdateTime + 1000 / 60;    // 60 fps ideal
    deltaTime       = Math.max(1, targetTime - currentTime);
    
    return window.setTimeout($.delegate(viewer, updateFunc), deltaTime);
};

//provides a sequence in the fade animation
function scheduleControlsFade( viewer ) {
    window.setTimeout( function(){
        updateControlsFade( viewer );
    }, 20);
};

//initiates an animation to hide the controls
function beginControlsAutoHide( viewer ) {
    if ( !viewer.config.autoHideControls ) {
        return;
    }
    viewer.controlsShouldFade = true;
    viewer.controlsFadeBeginTime = 
        new Date().getTime() + 
        viewer.controlsFadeDelay;

    window.setTimeout( function(){
        scheduleControlsFade( viewer );
    }, viewer.controlsFadeDelay );
};


//determines if fade animation is done or continues the animation
function updateControlsFade( viewer ) {
    var currentTime,
        deltaTime,
        opacity,
        i;
    if ( viewer.controlsShouldFade ) {
        currentTime = new Date().getTime();
        deltaTime = currentTime - viewer.controlsFadeBeginTime;
        opacity = 1.0 - deltaTime / viewer.controlsFadeLength;

        opacity = Math.min( 1.0, opacity );
        opacity = Math.max( 0.0, opacity );

        for ( i = this.controls.length - 1; i >= 0; i--) {
            this.controls[ i ].setOpacity( opacity );
        }

        if ( opacity > 0 ) {
            // fade again
            scheduleControlsFade( viewer ); 
        }
    }
};

//stop the fade animation on the controls and show them
function abortControlsAutoHide( viewer ) {
    var i;
    viewer.controlsShouldFade = false;
    for ( i = viewer.controls.length - 1; i >= 0; i-- ) {
        viewer.controls[ i ].setOpacity( 1.0 );
    }
};

///////////////////////////////////////////////////////////////////////////////
// Event engine is simple, look up event handler and call.
///////////////////////////////////////////////////////////////////////////////
function raiseEvent( viewer, eventName, eventArgs) {
    var  handler = viewer.events.getHandler( eventName );
    if ( handler ) {
        if (!eventArgs) {
            eventArgs = new Object();
        }
        handler( viewer, eventArgs );
    }
};


///////////////////////////////////////////////////////////////////////////////
// Default view event handlers.
///////////////////////////////////////////////////////////////////////////////
function onCanvasClick(tracker, position, quick, shift) {
    var zoomPreClick,
        factor;
    if (this.viewport && quick) {    // ignore clicks where mouse moved         
        zoomPerClick = this.config.zoomPerClick;
        factor = shift ? 1.0 / zoomPerClick : zoomPerClick;
        this.viewport.zoomBy(factor, this.viewport.pointFromPixel(position, true));
        this.viewport.applyConstraints();
    }
};

function onCanvasDrag(tracker, position, delta, shift) {
    if (this.viewport) {
        this.viewport.panBy(this.viewport.deltaPointsFromPixels(delta.negate()));
    }
};

function onCanvasRelease(tracker, position, insideElmtPress, insideElmtRelease) {
    if (insideElmtPress && this.viewport) {
        this.viewport.applyConstraints();
    }
};

function onCanvasScroll(tracker, position, scroll, shift) {
    var factor;
    if (this.viewport) {
        factor = Math.pow(this.config.zoomPerScroll, scroll);
        this.viewport.zoomBy(factor, this.viewport.pointFromPixel(position, true));
        this.viewport.applyConstraints();
    }
};

function onContainerExit(tracker, position, buttonDownElmt, buttonDownAny) {
    if (!buttonDownElmt) {
        this._mouseInside = false;
        if (!this._animating) {
            beginControlsAutoHide( this );
        }
    }
};

function onContainerRelease(tracker, position, insideElmtPress, insideElmtRelease) {
    if (!insideElmtRelease) {
        this._mouseInside = false;
        if (!this._animating) {
            beginControlsAutoHide( this );
        }
    }
};

function onContainerEnter(tracker, position, buttonDownElmt, buttonDownAny) {
    this._mouseInside = true;
    abortControlsAutoHide( this );
};

///////////////////////////////////////////////////////////////////////////////
// Default view event handlers.
///////////////////////////////////////////////////////////////////////////////
function getControlIndex( viewer, elmt ) {
    for ( i = viewer.controls.length - 1; i >= 0; i-- ) {
        if ( viewer.controls[ i ].elmt == elmt ) {
            return i;
        }
    }
    return -1;
};


///////////////////////////////////////////////////////////////////////////////
// Page update routines ( aka Views - for future reference )
///////////////////////////////////////////////////////////////////////////////

}( OpenSeadragon ));

(function( $ ){
    
$.Strings = {
    Errors: {
        Failure: "Sorry, but Seadragon Ajax can't run on your browser!\n" +
                    "Please try using IE 7 or Firefox 3.\n",
        Dzc: "Sorry, we don't support Deep Zoom Collections!",
        Dzi: "Hmm, this doesn't appear to be a valid Deep Zoom Image.",
        Xml: "Hmm, this doesn't appear to be a valid Deep Zoom Image.",
        Empty: "You asked us to open nothing, so we did just that.",
        ImageFormat: "Sorry, we don't support {0}-based Deep Zoom Images.",
        Security: "It looks like a security restriction stopped us from " +
                    "loading this Deep Zoom Image.",
        Status: "This space unintentionally left blank ({0} {1}).",
        Unknown: "Whoops, something inexplicably went wrong. Sorry!"
    },

    Messages: {
        Loading: "Loading..."
    },

    Tooltips: {
        FullPage: "Toggle full page",
        Home: "Go home",
        ZoomIn: "Zoom in",
        ZoomOut: "Zoom out"
    },
    getString: function(prop) {
        var props = prop.split('.');
        var string = $.Strings;

        for (var i = 0; i < props.length; i++) {
            string = string[props[i]] || {};    // in case not a subproperty
        }

        if (typeof (string) != "string") {
            string = "";
        }

        var args = arguments;
        return string.replace(/\{\d+\}/g, function(capture) {
            var i = parseInt(capture.match(/\d+/)) + 1;
            return i < args.length ? args[i] : "";
        });
    },

    setString: function(prop, value) {
        var props = prop.split('.');
        var container = $.Strings;

        for (var i = 0; i < props.length - 1; i++) {
            if (!container[props[i]]) {
                container[props[i]] = {};
            }
            container = container[props[i]];
        }

        container[props[i]] = value;
    }

};

$.Strings = $.Strings;

}( OpenSeadragon ));

(function( $ ){

$.Point=$.Point = function(x, y) {
    this.x = typeof (x) == "number" ? x : 0;
    this.y = typeof (y) == "number" ? y : 0;
};

$.Point.prototype = {

    plus: function(point) {
        return new $.Point(this.x + point.x, this.y + point.y);
    },

    minus: function(point) {
        return new $.Point(this.x - point.x, this.y - point.y);
    },

    times: function(factor) {
        return new $.Point(this.x * factor, this.y * factor);
    },

    divide: function(factor) {
        return new $.Point(this.x / factor, this.y / factor);
    },

    negate: function() {
        return new $.Point(-this.x, -this.y);
    },

    distanceTo: function(point) {
        return Math.sqrt(Math.pow(this.x - point.x, 2) +
                        Math.pow(this.y - point.y, 2));
    },

    apply: function(func) {
        return new $.Point(func(this.x), func(this.y));
    },

    equals: function(point) {
        return (point instanceof $.Point) &&
                (this.x === point.x) && (this.y === point.y);
    },

    toString: function() {
        return "(" + this.x + "," + this.y + ")";
    }
};

}( OpenSeadragon ));

(function( $ ){

$.Profiler = function() {

    this._midUpdate = false;
    this._numUpdates = 0;

    this._lastBeginTime = null;
    this._lastEndTime = null;

    this._minUpdateTime = Infinity;
    this._avgUpdateTime = 0;
    this._maxUpdateTime = 0;

    this._minIdleTime = Infinity;
    this._avgIdleTime = 0;
    this._maxIdleTime = 0;
};

$.Profiler.prototype = {

    getAvgUpdateTime: function() {
        return this._avgUpdateTime;
    },

    getMinUpdateTime: function() {
        return this._minUpdateTime;
    },

    getMaxUpdateTime: function() {
        return this._maxUpdateTime;
    },


    getAvgIdleTime: function() {
        return this._avgIdleTime;
    },

    getMinIdleTime: function() {
        return this._minIdleTime;
    },

    getMaxIdleTime: function() {
        return this._maxIdleTime;
    },


    isMidUpdate: function() {
        return this._midUpdate;
    },

    getNumUpdates: function() {
        return this._numUpdates;
    },


    beginUpdate: function() {
        if (this._midUpdate) {
            this.endUpdate();
        }

        this._midUpdate = true;
        this._lastBeginTime = new Date().getTime();

        if (this._numUpdates < 1) {
            return;     // this is the first update
        }

        var time = this._lastBeginTime - this._lastEndTime;

        this._avgIdleTime = (this._avgIdleTime * (this._numUpdates - 1) + time) / this._numUpdates;

        if (time < this._minIdleTime) {
            this._minIdleTime = time;
        }
        if (time > this._maxIdleTime) {
            this._maxIdleTime = time;
        }
    },

    endUpdate: function() {
        if (!this._midUpdate) {
            return;
        }

        this._lastEndTime = new Date().getTime();
        this._midUpdate = false;

        var time = this._lastEndTime - this._lastBeginTime;

        this._numUpdates++;
        this._avgUpdateTime = (this._avgUpdateTime * (this._numUpdates - 1) + time) / this._numUpdates;

        if (time < this._minUpdateTime) {
            this._minUpdateTime = time;
        }
        if (time > this._maxUpdateTime) {
            this._maxUpdateTime = time;
        }
    },

    clearProfile: function() {
        this._midUpdate = false;
        this._numUpdates = 0;

        this._lastBeginTime = null;
        this._lastEndTime = null;

        this._minUpdateTime = Infinity;
        this._avgUpdateTime = 0;
        this._maxUpdateTime = 0;

        this._minIdleTime = Infinity;
        this._avgIdleTime = 0;
        this._maxIdleTime = 0;
    }
};

}( OpenSeadragon ));

(function( $ ){
    
$.Job = function(src, callback) {
    this._image = null;
    this._timeout = null;
    this._src = src;
    this._callback = callback;
    this.TIMEOUT = 5000;
};

$.Job.prototype = {
    _finish: function(success) {
        this._image.onload = null;
        this._image.onabort = null;
        this._image.onerror = null;


        if (this._timeout) {
            window.clearTimeout(this._timeout);
        }

        var image = this._image;
        var callback = this._callback;
        window.setTimeout(function() {
            callback(this._src, success ? image : null);
        }, 1);
    },
    _onloadHandler: function() {
        this._finish(true);
    },
    _onerrorHandler: function() {
        this._finish(false);
    },
    start: function() {
        this._image = new Image();
        this._image.onload = $.delegate(this, this._onloadHandler);
        this._image.onabort = $.delegate(this, this._onerrorHandler);
        this._image.onerror = $.delegate(this, this._onerrorHandler);

        this._timeout = window.setTimeout($.delegate(this, this._onerrorHandler), this.TIMEOUT);

        this._image.src = this._src;
    }
};

}( OpenSeadragon ));

(function( $ ){
    
$.ImageLoader = function(imageLoaderLimit) {
    this._downloading = 0;
    this.imageLoaderLimit = imageLoaderLimit;
};

$.ImageLoader.prototype = {
    _onComplete: function(callback, src, image) {
        this._downloading--;
        if (typeof (callback) == "function") {
            try {
                callback(image);
            } catch (e) {
                $.Debug.error(e.name + " while executing " + src +
                            " callback: " + e.message, e);
            }
        }
    },
    loadImage: function(src, callback) {
        if (this._downloading >= this.imageLoaderLimit) {
            return false;
        }

        var func = $.Utils.createCallback(null, $.delegate(this, this._onComplete), callback);
        var job = new $.Job(src, func);

        this._downloading++;
        job.start();

        return true;
    }
};

}( OpenSeadragon ));

(function( $ ){

$.TileSource = function(width, height, tileSize, tileOverlap, minLevel, maxLevel) {
    this.aspectRatio = width / height;
    this.dimensions = new $.Point(width, height);
    this.minLevel = minLevel ? minLevel : 0;
    this.maxLevel = maxLevel ? maxLevel :
            Math.ceil(Math.log(Math.max(width, height)) / Math.log(2));
    this.tileSize = tileSize ? tileSize : 0;
    this.tileOverlap = tileOverlap ? tileOverlap : 0;
};

$.TileSource.prototype = {
    getLevelScale: function(level) {
        return 1 / (1 << (this.maxLevel - level));
    },

    getNumTiles: function(level) {
        var scale = this.getLevelScale(level);
        var x = Math.ceil(scale * this.dimensions.x / this.tileSize);
        var y = Math.ceil(scale * this.dimensions.y / this.tileSize);

        return new $.Point(x, y);
    },

    getPixelRatio: function(level) {
        var imageSizeScaled = this.dimensions.times(this.getLevelScale(level));
        var rx = 1.0 / imageSizeScaled.x;
        var ry = 1.0 / imageSizeScaled.y;

        return new $.Point(rx, ry);
    },

    getTileAtPoint: function(level, point) {
        var pixel = point.times(this.dimensions.x).times(this.getLevelScale(level));

        var tx = Math.floor(pixel.x / this.tileSize);
        var ty = Math.floor(pixel.y / this.tileSize);

        return new $.Point(tx, ty);
    },

    getTileBounds: function(level, x, y) {
        var dimensionsScaled = this.dimensions.times(this.getLevelScale(level));

        var px = (x === 0) ? 0 : this.tileSize * x - this.tileOverlap;
        var py = (y === 0) ? 0 : this.tileSize * y - this.tileOverlap;

        var sx = this.tileSize + (x === 0 ? 1 : 2) * this.tileOverlap;
        var sy = this.tileSize + (y === 0 ? 1 : 2) * this.tileOverlap;

        sx = Math.min(sx, dimensionsScaled.x - px);
        sy = Math.min(sy, dimensionsScaled.y - py);

        var scale = 1.0 / dimensionsScaled.x;
        return new $.Rect(px * scale, py * scale, sx * scale, sy * scale);
    },

    getTileUrl: function(level, x, y) {
        throw new Error("Method not implemented.");
    },

    tileExists: function(level, x, y) {
        var numTiles = this.getNumTiles(level);
        return level >= this.minLevel && level <= this.maxLevel &&
                x >= 0 && y >= 0 && x < numTiles.x && y < numTiles.y;
    }
};

}( OpenSeadragon ));

(function( $ ){
    
$.DziError = function(message) {
    Error.apply(this, arguments);
    this.message = message;
};
$.DziError.prototype = new Error();
$.DziError.constructor = $.DziError;

}( OpenSeadragon ));

(function( $ ){
    

$.DziTileSource = function(width, height, tileSize, tileOverlap, tilesUrl, fileFormat, displayRects) {
    $.TileSource.call(this, width, height, tileSize, tileOverlap, null, null);

    this._levelRects = {};
    this.tilesUrl = tilesUrl;

    this.fileFormat = fileFormat;
    this.displayRects = displayRects;
    this.initialize();
};

$.DziTileSource.prototype = new $.TileSource();

$.DziTileSource.prototype.constructor = $.DziTileSource;

$.DziTileSource.prototype.initialize = function() {
    if (!this.displayRects) {
        return;
    }

    for (var i = this.displayRects.length - 1; i >= 0; i--) {
        var rect = this.displayRects[i];
        for (var level = rect.minLevel; level <= rect.maxLevel; level++) {
            if (!this._levelRects[level]) {
                this._levelRects[level] = [];
            }
            this._levelRects[level].push(rect);
        }
    }
};

$.DziTileSource.prototype.getTileUrl = function(level, x, y) {
    return [this.tilesUrl, level, '/', x, '_', y, '.', this.fileFormat].join('');
};

$.DziTileSource.prototype.tileExists = function(level, x, y) {
    var rects = this._levelRects[level];

    if (!rects || !rects.length) {
        return true;
    }

    for (var i = rects.length - 1; i >= 0; i--) {
        var rect = rects[i];

        if (level < rect.minLevel || level > rect.maxLevel) {
            continue;
        }

        var scale = this.getLevelScale(level);
        var xMin = rect.x * scale;
        var yMin = rect.y * scale;
        var xMax = xMin + rect.width * scale;
        var yMax = yMin + rect.height * scale;

        xMin = Math.floor(xMin / this.tileSize);
        yMin = Math.floor(yMin / this.tileSize);
        xMax = Math.ceil(xMax / this.tileSize);
        yMax = Math.ceil(yMax / this.tileSize);

        if (xMin <= x && x < xMax && yMin <= y && y < yMax) {
            return true;
        }
    }

    return false;
};

$._DziTileSourceHelper = function() {

};

$._DziTileSourceHelper.prototype = {
    createFromXml: function(xmlUrl, xmlString, callback) {
        var async = typeof (callback) == "function";
        var error = null;

        if (!xmlUrl) {
            this.error = $.Strings.getString("Errors.Empty");
            if (async) {
                window.setTimeout(function() {
                    callback(null, error);
                }, 1);
                return null;
            }
            throw new $.DziError(error);
        }

        var urlParts = xmlUrl.split('/');
        var filename = urlParts[urlParts.length - 1];
        var lastDot = filename.lastIndexOf('.');

        if (lastDot > -1) {
            urlParts[urlParts.length - 1] = filename.slice(0, lastDot);
        }

        var tilesUrl = urlParts.join('/') + "_files/";
        function finish(func, obj) {
            try {
                return func(obj, tilesUrl);
            } catch (e) {
                if (async) {
                    //Start Thatcher - Throwable doesnt have getError
                    //error = this.getError(e).message;
                    return null;
                    //End Thatcher
                } else {
                    throw this.getError(e);
                }
            }
        }
        if (async) {
            if (xmlString) {
                var handler = $.delegate(this, this.processXml);
                window.setTimeout(function() {
                    var source = finish(handler, $.Utils.parseXml(xmlString));
                    callback(source, error);    // call after finish sets error
                }, 1);
            } else {
                var handler = $.delegate(this, this.processResponse);
                $.Utils.makeAjaxRequest(xmlUrl, function(xhr) {
                    var source = finish(handler, xhr);
                    callback(source, error);    // call after finish sets error
                });
            }

            return null;
        }

        if (xmlString) {
            return finish($.delegate(this, this.processXml), $.Utils.parseXml(xmlString));
        } else {
            return finish($.delegate(this, this.processResponse), $.Utils.makeAjaxRequest(xmlUrl));
        }
    },
    processResponse: function(xhr, tilesUrl) {
        if (!xhr) {
            throw new $.DziError($.Strings.getString("Errors.Security"));
        } else if (xhr.status !== 200 && xhr.status !== 0) {
            var status = xhr.status;
            var statusText = (status == 404) ? "Not Found" : xhr.statusText;
            throw new $.DziError($.Strings.getString("Errors.Status", status, statusText));
        }

        var doc = null;

        if (xhr.responseXML && xhr.responseXML.documentElement) {
            doc = xhr.responseXML;
        } else if (xhr.responseText) {
            doc = $.Utils.parseXml(xhr.responseText);
        }

        return this.processXml(doc, tilesUrl);
    },

    processXml: function(xmlDoc, tilesUrl) {
        if (!xmlDoc || !xmlDoc.documentElement) {
            throw new $.DziError($.Strings.getString("Errors.Xml"));
        }

        var root = xmlDoc.documentElement;
        var rootName = root.tagName;

        if (rootName == "Image") {
            try {
                return this.processDzi(root, tilesUrl);
            } catch (e) {
                var defMsg = $.Strings.getString("Errors.Dzi");
                throw (e instanceof $.DziError) ? e : new $.DziError(defMsg);
            }
        } else if (rootName == "Collection") {
            throw new $.DziError($.Strings.getString("Errors.Dzc"));
        } else if (rootName == "Error") {
            return this.processError(root);
        }

        throw new $.DziError($.Strings.getString("Errors.Dzi"));
    },

    processDzi: function(imageNode, tilesUrl) {
        var fileFormat = imageNode.getAttribute("Format");

        if (!$.Utils.imageFormatSupported(fileFormat)) {
            throw new $.DziError($.Strings.getString("Errors.ImageFormat",
                    fileFormat.toUpperCase()));
        }

        var sizeNode = imageNode.getElementsByTagName("Size")[0];
        var dispRectNodes = imageNode.getElementsByTagName("DisplayRect");

        var width = parseInt(sizeNode.getAttribute("Width"), 10);
        var height = parseInt(sizeNode.getAttribute("Height"), 10);
        var tileSize = parseInt(imageNode.getAttribute("TileSize"));
        var tileOverlap = parseInt(imageNode.getAttribute("Overlap"));
        var dispRects = [];

        for (var i = 0; i < dispRectNodes.length; i++) {
            var dispRectNode = dispRectNodes[i];
            var rectNode = dispRectNode.getElementsByTagName("Rect")[0];

            dispRects.push(new $.DisplayRect(
                parseInt(rectNode.getAttribute("X"), 10),
                parseInt(rectNode.getAttribute("Y"), 10),
                parseInt(rectNode.getAttribute("Width"), 10),
                parseInt(rectNode.getAttribute("Height"), 10),
                0,  // ignore MinLevel attribute, bug in Deep Zoom Composer
                parseInt(dispRectNode.getAttribute("MaxLevel"), 10)
            ));
        }
        return new $.DziTileSource(width, height, tileSize, tileOverlap,
                tilesUrl, fileFormat, dispRects);
    },

    processError: function(errorNode) {
        var messageNode = errorNode.getElementsByTagName("Message")[0];
        var message = messageNode.firstChild.nodeValue;

        throw new $.DziError(message);
    },
    getError: function(e) {
        if (!(e instanceof DziError)) {
            $.Debug.error(e.name + " while creating DZI from XML: " + e.message);
            e = new $.DziError($.Strings.getString("Errors.Unknown"));
        }

    }
};

$.DziTileSourceHelper = new $._DziTileSourceHelper();

}( OpenSeadragon ));

(function( $ ){

$.ButtonState = {
    REST:   0,
    GROUP:  1,
    HOVER:  2,
    DOWN:   3
};

$.Button = function( properties, events ) {

    this._tooltip   = properties.tooltip;
    this._srcRest   = properties.srcRest;
    this._srcGroup  = properties.srcGroup;
    this._srcHover  = properties.srcHover;
    this._srcDown   = properties.srcDown;
    this._button    = properties.button;
    this.config     = properties.config;

    this.initialize( events );
};

$.Button.prototype = {
    initialize: function( events ) {

        this._events = new $.EventHandlerList();

        if (events.onPress != undefined)
            this.add_onPress(events.onPress);
        if (events.onRelease != undefined)
            this.add_onRelease(events.onRelease);
        if (events.onClick != undefined)
            this.add_onClick(events.onClick);
        if (events.onEnter != undefined)
            this.add_onEnter(events.onEnter);
        if (events.onExit != undefined)
            this.add_onExit(events.onExit);

        this._button = $.Utils.makeNeutralElement("span");
        this._currentState = $.ButtonState.GROUP;
        this._tracker = new $.MouseTracker(this._button, this.config.clickTimeThreshold, this.config.clickDistThreshold);
        this._imgRest = $.Utils.makeTransparentImage(this._srcRest);
        this._imgGroup = $.Utils.makeTransparentImage(this._srcGroup);
        this._imgHover = $.Utils.makeTransparentImage(this._srcHover);
        this._imgDown = $.Utils.makeTransparentImage(this._srcDown);

        this._fadeDelay = 0;      // begin fading immediately
        this._fadeLength = 2000;  // fade over a period of 2 seconds
        this._fadeBeginTime = null;
        this._shouldFade = false;

        this._button.style.display = "inline-block";
        this._button.style.position = "relative";
        this._button.title = this._tooltip;

        this._button.appendChild(this._imgRest);
        this._button.appendChild(this._imgGroup);
        this._button.appendChild(this._imgHover);
        this._button.appendChild(this._imgDown);

        var styleRest = this._imgRest.style;
        var styleGroup = this._imgGroup.style;
        var styleHover = this._imgHover.style;
        var styleDown = this._imgDown.style;

        styleGroup.position = styleHover.position = styleDown.position = "absolute";
        styleGroup.top = styleHover.top = styleDown.top = "0px";
        styleGroup.left = styleHover.left = styleDown.left = "0px";
        styleHover.visibility = styleDown.visibility = "hidden";

        if ($.Utils.getBrowser() == $.Browser.FIREFOX &&
                    $.Utils.getBrowserVersion() < 3) {
            styleGroup.top = styleHover.top = styleDown.top = "";
        }

        this._tracker.enterHandler = $.delegate(this, this._enterHandler);
        this._tracker.exitHandler = $.delegate(this, this._exitHandler);
        this._tracker.pressHandler = $.delegate(this, this._pressHandler);
        this._tracker.releaseHandler = $.delegate(this, this._releaseHandler);
        this._tracker.clickHandler = $.delegate(this, this._clickHandler);

        this._tracker.setTracking(true);
        this._outTo($.ButtonState.REST);
    },
    _scheduleFade: function() {
        window.setTimeout($.delegate(this, this._updateFade), 20);
    },
    _updateFade: function() {
        if (this._shouldFade) {
            var currentTime = new Date().getTime();
            var deltaTime = currentTime - this._fadeBeginTime;
            var opacity = 1.0 - deltaTime / this._fadeLength;

            opacity = Math.min(1.0, opacity);
            opacity = Math.max(0.0, opacity);

            $.Utils.setElementOpacity(this._imgGroup, opacity, true);
            if (opacity > 0) {
                this._scheduleFade();    // fade again
            }
        }
    },
    _beginFading: function() {
        this._shouldFade = true;
        this._fadeBeginTime = new Date().getTime() + this._fadeDelay;
        window.setTimeout($.delegate(this, this._scheduleFade), this._fadeDelay);
    },
    _stopFading: function() {
        this._shouldFade = false;
        $.Utils.setElementOpacity(this._imgGroup, 1.0, true);
    },
    _inTo: function(newState) {
        if (newState >= $.ButtonState.GROUP && this._currentState == $.ButtonState.REST) {
            this._stopFading();
            this._currentState = $.ButtonState.GROUP;
        }

        if (newState >= $.ButtonState.HOVER && this._currentState == $.ButtonState.GROUP) {
            this._imgHover.style.visibility = "";
            this._currentState = $.ButtonState.HOVER;
        }

        if (newState >= $.ButtonState.DOWN && this._currentState == $.ButtonState.HOVER) {
            this._imgDown.style.visibility = "";
            this._currentState = $.ButtonState.DOWN;
        }
    },
    _outTo: function(newState) {
        if (newState <= $.ButtonState.HOVER && this._currentState == $.ButtonState.DOWN) {
            this._imgDown.style.visibility = "hidden";
            this._currentState = $.ButtonState.HOVER;
        }

        if (newState <= $.ButtonState.GROUP && this._currentState == $.ButtonState.HOVER) {
            this._imgHover.style.visibility = "hidden";
            this._currentState = $.ButtonState.GROUP;
        }

        if (this._newState <= $.ButtonState.REST && this._currentState == $.ButtonState.GROUP) {
            this._beginFading();
            this._currentState = $.ButtonState.REST;
        }
    },
    _enterHandler: function(tracker, position, buttonDownElmt, buttonDownAny) {
        if (buttonDownElmt) {
            this._inTo($.ButtonState.DOWN);
            this._raiseEvent("onEnter", this);
        } else if (!buttonDownAny) {
            this._inTo($.ButtonState.HOVER);
        }
    },
    _exitHandler: function(tracker, position, buttonDownElmt, buttonDownAny) {
        this._outTo($.ButtonState.GROUP);
        if (buttonDownElmt) {
            this._raiseEvent("onExit", this);
        }
    },
    _pressHandler: function(tracker, position) {
        this._inTo($.ButtonState.DOWN);
        this._raiseEvent("onPress", this);
    },
    _releaseHandler: function(tracker, position, insideElmtPress, insideElmtRelease) {
        if (insideElmtPress && insideElmtRelease) {
            this._outTo($.ButtonState.HOVER);
            this._raiseEvent("onRelease", this);
        } else if (insideElmtPress) {
            this._outTo($.ButtonState.GROUP);
        } else {
            this._inTo($.ButtonState.HOVER);
        }
    },
    _clickHandler: function(tracker, position, quick, shift) {
        if (quick) {
            this._raiseEvent("onClick", this);
        }
    },
    get_events: function get_events() {
        return this._events;
    },
    _raiseEvent: function(eventName, eventArgs) {
        var handler = this.get_events().getHandler(eventName);

        if (handler) {
            if (!eventArgs) {
                eventArgs = new Object(); // Sys.EventArgs.Empty;
            }

            handler(this, eventArgs);
        }
    },
    get_element: function() {
        return this._button;
    },
    get_tooltip: function() {
        return this._tooltip;
    },
    set_tooltip: function(value) {
        this._tooltip = value;
    },
    get_config: function() {
        return this.config;
    },
    set_config: function(value) {
        this.config = value;
    },
    get_srcRest: function() {
        return this._srcRest;
    },
    set_srcRest: function(value) {
        this._srcRest = value;
    },
    get_srcGroup: function() {
        return this._srcGroup;
    },
    set_srcGroup: function(value) {
        this._srcGroup = value;
    },
    get_srcHover: function() {
        return this._srcHover;
    },
    set_srcHover: function(value) {
        this._srcHover = value;
    },
    get_srcDown: function() {
        return this._srcDown;
    },
    set_srcDown: function(value) {
        this._srcDown = value;
    },
    add_onPress: function(handler) {
        this.get_events().addHandler("onPress", handler);
    },
    remove_onPress: function(handler) {
        this.get_events().removeHandler("onPress", handler);
    },
    add_onClick: function(handler) {
        this.get_events().addHandler("onClick", handler);
    },
    remove_onClick: function(handler) {
        this.get_events().removeHandler("onClick", handler);
    },
    add_onEnter: function(handler) {
        this.get_events().addHandler("onEnter", handler);
    },
    remove_onEnter: function(handler) {
        this.get_events().removeHandler("onEnter", handler);
    },
    add_onRelease: function(handler) {
        this.get_events().addHandler("onRelease", handler);
    },
    remove_onRelease: function(handler) {
        this.get_events().removeHandler("onRelease", handler);
    },
    add_onExit: function(handler) {
        this.get_events().addHandler("onExit", handler);
    },
    remove_onExit: function(handler) {
        this.get_events().removeHandler("onExit", handler);
    },
    notifyGroupEnter: function() {
        this._inTo($.ButtonState.GROUP);
    },
    notifyGroupExit: function() {
        this._outTo($.ButtonState.REST);
    }
};

}( OpenSeadragon ));

(function( $ ){
/**
 * OpenSeadragon ButtonGroup
 *
 * Manages events on groups of buttons.
 *    
 * options: {
 *     buttons: Array of buttons * required,
 *     group:   Element to use as the container,
 *     config:  Object with Viewer settings ( TODO: is this actually used anywhere? )
 *     enter:   Function callback for when the mouse enters group
 *     exit:    Function callback for when mouse leaves the group
 *     release: Function callback for when mouse is released
 * }
 **/
$.ButtonGroup = function( options ) {

    this.buttons = options.buttons;
    this.element = options.group || $.Utils.makeNeutralElement("span");
    this.config  = options.config;
    this.tracker = new $.MouseTracker(
        this.element, 
        this.config.clickTimeThreshold, 
        this.config.clickDistThreshold
    );
    
    // copy the botton elements
    var buttons = this.buttons.concat([]),   
        _this = this,
        i;

    this.element.style.display = "inline-block";
    for ( i = 0; i < buttons.length; i++ ) {
        this.element.appendChild( buttons[ i ].get_element() );
    }


    this.tracker.enter =  options.enter || function() {
        var i;
        for ( i = 0; i < _this.buttons.length; i++) {
            _this.buttons[ i ].notifyGroupEnter();
        }
    };

    this.tracker.exit = options.exit || function() {
        var i,
            buttonDownElmt = arguments.length > 2 ? arguments[2] : null;
        if ( !buttonDownElmt ) {
            for ( i = 0; i < _this.buttons.length; i++ ) {
                _this.buttons[ i ].notifyGroupExit();
            }
        }
    };

    this.tracker.release = options.release || function() {
        var i,
            insideElmtRelease = arguments.length > 3 ? arguments[3] : null;
        if ( !insideElmtRelease ) {
            for ( i = 0; i < _this.buttons.length; i++ ) {
                _this.buttons[ i ].notifyGroupExit();
            }
        }
    };

    this.tracker.setTracking( true );
};

$.ButtonGroup.prototype = {

    emulateEnter: function() {
        this.tracker.enter();
    },

    emulateExit: function() {
        this.tracker.exit();
    }
};


}( OpenSeadragon ));



(function( $ ){
    
$.Rect = function(x, y, width, height) {
    this.x = typeof (x) == "number" ? x : 0;
    this.y = typeof (y) == "number" ? y : 0;
    this.width = typeof (width) == "number" ? width : 0;
    this.height = typeof (height) == "number" ? height : 0;
};

$.Rect.prototype = {
    getAspectRatio: function() {
        return this.width / this.height;
    },

    getTopLeft: function() {
    return new $.Point(this.x, this.y);
    },

    getBottomRight: function() {
    return new $.Point(this.x + this.width, this.y + this.height);
    },

    getCenter: function() {
    return new $.Point(this.x + this.width / 2.0,
                        this.y + this.height / 2.0);
    },

    getSize: function() {
    return new $.Point(this.width, this.height);
    },

    equals: function(other) {
        return (other instanceof $.Rect) &&
                (this.x === other.x) && (this.y === other.y) &&
                (this.width === other.width) && (this.height === other.height);
    },

    toString: function() {
        return "[" + this.x + "," + this.y + "," + this.width + "x" +
                this.height + "]";
    }
};

}( OpenSeadragon ));

(function( $ ){

$.DisplayRect = function(x, y, width, height, minLevel, maxLevel) {
    $.Rect.apply(this, [x, y, width, height]);

    this.minLevel = minLevel;
    this.maxLevel = maxLevel;
}
$.DisplayRect.prototype = new $.Rect();
$.DisplayRect.prototype.constructor = $.DisplayRect;

}( OpenSeadragon ));

(function( $ ){
    
$.Spring = function(initialValue, config) {
    this._currentValue = typeof (initialValue) == "number" ? initialValue : 0;
    this._startValue = this._currentValue;
    this._targetValue = this._currentValue;
    this.config = config;

    this._currentTime = new Date().getTime(); // always work in milliseconds
    this._startTime = this._currentTime;
    this._targetTime = this._currentTime;
};

$.Spring.prototype = {
    _transform: function(x) {
        var s = this.config.springStiffness;
        return (1.0 - Math.exp(-x * s)) / (1.0 - Math.exp(-s));
    },
    getCurrent: function() {
        return this._currentValue;
    },

    getTarget: function() {
        return this._targetValue;
    },

    resetTo: function(target) {
        this._targetValue = target;
        this._targetTime = this._currentTime;
        this._startValue = this._targetValue;
        this._startTime = this._targetTime;
    },

    springTo: function(target) {
        this._startValue = this._currentValue;
        this._startTime = this._currentTime;
        this._targetValue = target;
        this._targetTime = this._startTime + 1000 * this.config.animationTime;
    },

    shiftBy: function(delta) {
        this._startValue += delta;
        this._targetValue += delta;
    },

    update: function() {
        this._currentTime = new Date().getTime();
        this._currentValue = (this._currentTime >= this._targetTime) ? this._targetValue :
                this._startValue + (this._targetValue - this._startValue) *
                this._transform((this._currentTime - this._startTime) / (this._targetTime - this._startTime));
    }
}

}( OpenSeadragon ));

(function( $ ){
    
$.Tile = function(level, x, y, bounds, exists, url) {
    this.level = level;
    this.x = x;
    this.y = y;
    this.bounds = bounds;   // where this tile fits, in normalized coordinates
    this.exists = exists;   // part of sparse image? tile hasn't failed to load?
    this.loaded = false;    // is this tile loaded?
    this.loading = false;   // or is this tile loading?



    this.elmt = null;       // the HTML element for this tile
    this.image = null;      // the Image object for this tile
    this.url = url;         // the URL of this tile's image


    this.style = null;      // alias of this.elmt.style
    this.position = null;   // this tile's position on screen, in pixels
    this.size = null;       // this tile's size on screen, in pixels
    this.blendStart = null; // the start time of this tile's blending
    this.opacity = null;    // the current opacity this tile should be
    this.distance = null;   // the distance of this tile to the viewport center
    this.visibility = null; // the visibility score of this tile

    this.beingDrawn = false; // whether this tile is currently being drawn
    this.lastTouchTime = 0; // the time that tile was last touched
};

$.Tile.prototype = {
    
    toString: function() {
        return this.level + "/" + this.x + "_" + this.y;
    },
    drawHTML: function(container) {
        if (!this.loaded) {
            $.Debug.error("Attempting to draw tile " + this.toString() +
                    " when it's not yet loaded.");
            return;
        }

        if (!this.elmt) {
            this.elmt = $.Utils.makeNeutralElement("img");
            this.elmt.src = this.url;
            this.style = this.elmt.style;
            this.style.position = "absolute";
            this.style.msInterpolationMode = "nearest-neighbor";
        }

        var elmt = this.elmt;
        var style = this.style;
        var position = this.position.apply(Math.floor);
        var size = this.size.apply(Math.ceil);


        if (elmt.parentNode != container) {
            container.appendChild(elmt);
        }

        style.left = position.x + "px";
        style.top = position.y + "px";
        style.width = size.x + "px";
        style.height = size.y + "px";

        $.Utils.setElementOpacity(elmt, this.opacity);
    },
    drawCanvas: function(context) {
        if (!this.loaded) {
            $.Debug.error("Attempting to draw tile " + this.toString() +
                    " when it's not yet loaded.");
            return;
        }

        var position = this.position;
        var size = this.size;

        context.globalAlpha = this.opacity;
        context.drawImage(this.image, position.x, position.y, size.x, size.y);
    },
    unload: function() {
        if (this.elmt && this.elmt.parentNode) {
            this.elmt.parentNode.removeChild(this.elmt);
        }

        this.elmt = null;
        this.image = null;
        this.loaded = false;
        this.loading = false;
    }
};

}( OpenSeadragon ));

(function( $ ){
    
$.Overlay = function(elmt, loc, placement) {
    this.elmt = elmt;
    this.scales = (loc instanceof $.Rect);
    this.bounds = new $.Rect(loc.x, loc.y, loc.width, loc.height);
    this.placement = loc instanceof $.Point ? placement : $.OverlayPlacement.TOP_LEFT;    // rects are always top-left
    this.position = new $.Point(loc.x, loc.y);
    this.size = new $.Point(loc.width, loc.height);
    this.style = elmt.style;
};

$.Overlay.prototype = {

    adjust: function(position, size) {
        switch (this.placement) {
            case $.OverlayPlacement.TOP_LEFT:
                break;
            case $.OverlayPlacement.TOP:
                position.x -= size.x / 2;
                break;
            case $.OverlayPlacement.TOP_RIGHT:
                position.x -= size.x;
                break;
            case $.OverlayPlacement.RIGHT:
                position.x -= size.x;
                position.y -= size.y / 2;
                break;
            case $.OverlayPlacement.BOTTOM_RIGHT:
                position.x -= size.x;
                position.y -= size.y;
                break;
            case $.OverlayPlacement.BOTTOM:
                position.x -= size.x / 2;
                position.y -= size.y;
                break;
            case $.OverlayPlacement.BOTTOM_LEFT:
                position.y -= size.y;
                break;
            case $.OverlayPlacement.LEFT:
                position.y -= size.y / 2;
                break;
            case $.OverlayPlacement.CENTER:
            default:
                position.x -= size.x / 2;
                position.y -= size.y / 2;
                break;
        }
    },
    destroy: function() {
        var elmt = this.elmt;
        var style = this.style;

        if (elmt.parentNode) {
            elmt.parentNode.removeChild(elmt);
        }

        style.top = "";
        style.left = "";
        style.position = "";

        if (this.scales) {
            style.width = "";
            style.height = "";
        }
    },
    drawHTML: function(container) {
        var elmt = this.elmt;
        var style = this.style;
        var scales = this.scales;

        if (elmt.parentNode != container) {
            container.appendChild(elmt);
        }

        if (!scales) {
            this.size = $.Utils.getElementSize(elmt);
        }

        var position = this.position;
        var size = this.size;

        this.adjust(position, size);

        position = position.apply(Math.floor);
        size = size.apply(Math.ceil);

        style.left = position.x + "px";
        style.top = position.y + "px";
        style.position = "absolute";

        if (scales) {
            style.width = size.x + "px";
            style.height = size.y + "px";
        }
    },
    update: function(loc, placement) {
        this.scales = (loc instanceof $.Rect);
        this.bounds = new $.Rect(loc.x, loc.y, loc.width, loc.height);
        this.placement = loc instanceof $.Point ?
                placement : $.OverlayPlacement.TOP_LEFT;    // rects are always top-left
    }

};

}( OpenSeadragon ));

(function( $ ){
    
var QUOTA = 100;    // the max number of images we should keep in memory
var MIN_PIXEL_RATIO = 0.5;  // the most shrunk a tile should be

var browser = $.Utils.getBrowser();
var browserVer = $.Utils.getBrowserVersion();

var subpixelRenders = browser == $.Browser.FIREFOX ||
            browser == $.Browser.OPERA ||
            (browser == $.Browser.SAFARI && browserVer >= 4) ||
            (browser == $.Browser.CHROME && browserVer >= 2);

var useCanvas =
            typeof (document.createElement("canvas").getContext) == "function" &&
            subpixelRenders;

$.Drawer = function(source, viewport, elmt) {

    this._container = $.Utils.getElement(elmt);
    this._canvas = $.Utils.makeNeutralElement(useCanvas ? "canvas" : "div");
    this._context = useCanvas ? this._canvas.getContext("2d") : null;
    this._viewport = viewport;
    this._source = source;
    this.config = this._viewport.config;

    this._imageLoader = new $.ImageLoader(this.config.imageLoaderLimit);
    this._profiler = new $.Profiler();

    this._minLevel = source.minLevel;
    this._maxLevel = source.maxLevel;
    this._tileSize = source.tileSize;
    this._tileOverlap = source.tileOverlap;
    this._normHeight = source.dimensions.y / source.dimensions.x;

    this._cacheNumTiles = {};     // 1d dictionary [level] --> Point
    this._cachePixelRatios = {};  // 1d dictionary [level] --> Point
    this._tilesMatrix = {};       // 3d dictionary [level][x][y] --> Tile
    this._tilesLoaded = [];       // unordered list of Tiles with loaded images
    this._coverage = {};          // 3d dictionary [level][x][y] --> Boolean

    this._overlays = [];          // unordered list of Overlays added
    this._lastDrawn = [];         // unordered list of Tiles drawn last frame
    this._lastResetTime = 0;
    this._midUpdate = false;
    this._updateAgain = true;


    this.elmt = this._container;


    this._init();
};

$.Drawer.prototype = {

    _init: function() {
        this._canvas.style.width = "100%";
        this._canvas.style.height = "100%";
        this._canvas.style.position = "absolute";
        this._container.style.textAlign = "left";    // explicit left-align
        this._container.appendChild(this._canvas);
    },
    _compareTiles: function(prevBest, tile) {
        if (!prevBest) {
            return tile;
        }

        if (tile.visibility > prevBest.visibility) {
            return tile;
        } else if (tile.visibility == prevBest.visibility) {
            if (tile.distance < prevBest.distance) {
                return tile;
            }
        }

        return prevBest;
    },
    _getNumTiles: function(level) {
        if (!this._cacheNumTiles[level]) {
            this._cacheNumTiles[level] = this._source.getNumTiles(level);
        }

        return this._cacheNumTiles[level];
    },

    _getPixelRatio: function(level) {
        if (!this._cachePixelRatios[level]) {
            this._cachePixelRatios[level] = this._source.getPixelRatio(level);
        }

        return this._cachePixelRatios[level];
    },


    _getTile: function(level, x, y, time, numTilesX, numTilesY) {
        if (!this._tilesMatrix[level]) {
            this._tilesMatrix[level] = {};
        }
        if (!this._tilesMatrix[level][x]) {
            this._tilesMatrix[level][x] = {};
        }

        if (!this._tilesMatrix[level][x][y]) {
            var xMod = (numTilesX + (x % numTilesX)) % numTilesX;
            var yMod = (numTilesY + (y % numTilesY)) % numTilesY;
            var bounds = this._source.getTileBounds(level, xMod, yMod);
            var exists = this._source.tileExists(level, xMod, yMod);
            var url = this._source.getTileUrl(level, xMod, yMod);

            bounds.x += 1.0 * (x - xMod) / numTilesX;
            bounds.y += this._normHeight * (y - yMod) / numTilesY;

            this._tilesMatrix[level][x][y] = new $.Tile(level, x, y, bounds, exists, url);
        }

        var tile = this._tilesMatrix[level][x][y];

        tile.lastTouchTime = time;

        return tile;
    },

    _loadTile: function(tile, time) {
        tile.loading = this._imageLoader.loadImage(tile.url,
                    $.Utils.createCallback(null, $.delegate(this, this._onTileLoad), tile, time));
    },

    _onTileLoad: function(tile, time, image) {
        tile.loading = false;

        if (this._midUpdate) {
            $.Debug.error("Tile load callback in middle of drawing routine.");
            return;
        } else if (!image) {
            $.Debug.log("Tile " + tile + " failed to load: " + tile.url);
            tile.exists = false;
            return;
        } else if (time < this._lastResetTime) {
            $.Debug.log("Ignoring tile " + tile + " loaded before reset: " + tile.url);
            return;
        }

        tile.loaded = true;
        tile.image = image;

        var insertionIndex = this._tilesLoaded.length;

        if (this._tilesLoaded.length >= QUOTA) {
            var cutoff = Math.ceil(Math.log(this._tileSize) / Math.log(2));

            var worstTile = null;
            var worstTileIndex = -1;

            for (var i = this._tilesLoaded.length - 1; i >= 0; i--) {
                var prevTile = this._tilesLoaded[i];

                if (prevTile.level <= this._cutoff || prevTile.beingDrawn) {
                    continue;
                } else if (!worstTile) {
                    worstTile = prevTile;
                    worstTileIndex = i;
                    continue;
                }

                var prevTime = prevTile.lastTouchTime;
                var worstTime = worstTile.lastTouchTime;
                var prevLevel = prevTile.level;
                var worstLevel = worstTile.level;

                if (prevTime < worstTime ||
                            (prevTime == worstTime && prevLevel > worstLevel)) {
                    worstTile = prevTile;
                    worstTileIndex = i;
                }
            }

            if (worstTile && worstTileIndex >= 0) {
                worstTile.unload();
                insertionIndex = worstTileIndex;
            }
        }

        this._tilesLoaded[insertionIndex] = tile;
        this._updateAgain = true;
    },

    _clearTiles: function() {
        this._tilesMatrix = {};
        this._tilesLoaded = [];
    },



    /**
    * Returns true if the given tile provides coverage to lower-level tiles of
    * lower resolution representing the same content. If neither x nor y is
    * given, returns true if the entire visible level provides coverage.
    * 
    * Note that out-of-bounds tiles provide coverage in this sense, since
    * there's no content that they would need to cover. Tiles at non-existent
    * levels that are within the image bounds, however, do not.
    */
    _providesCoverage: function(level, x, y) {
        if (!this._coverage[level]) {
            return false;
        }

        if (x === undefined || y === undefined) {
            var rows = this._coverage[level];
            for (var i in rows) {
                if (rows.hasOwnProperty(i)) {
                    var cols = rows[i];
                    for (var j in cols) {
                        if (cols.hasOwnProperty(j) && !cols[j]) {
                            return false;
                        }
                    }
                }
            }

            return true;
        }

        return (this._coverage[level][x] === undefined ||
                    this._coverage[level][x][y] === undefined ||
                    this._coverage[level][x][y] === true);
    },

    /**
    * Returns true if the given tile is completely covered by higher-level
    * tiles of higher resolution representing the same content. If neither x
    * nor y is given, returns true if the entire visible level is covered.
    */
    _isCovered: function(level, x, y) {
        if (x === undefined || y === undefined) {
            return this._providesCoverage(level + 1);
        } else {
            return (this._providesCoverage(level + 1, 2 * x, 2 * y) &&
                        this._providesCoverage(level + 1, 2 * x, 2 * y + 1) &&
                        this._providesCoverage(level + 1, 2 * x + 1, 2 * y) &&
                        this._providesCoverage(level + 1, 2 * x + 1, 2 * y + 1));
        }
    },

    /**
    * Sets whether the given tile provides coverage or not.
    */
    _setCoverage: function(level, x, y, covers) {
        if (!this._coverage[level]) {
            $.Debug.error("Setting coverage for a tile before its " +
                        "level's coverage has been reset: " + level);
            return;
        }

        if (!this._coverage[level][x]) {
            this._coverage[level][x] = {};
        }

        this._coverage[level][x][y] = covers;
    },

    /**
    * Resets coverage information for the given level. This should be called
    * after every draw routine. Note that at the beginning of the next draw
    * routine, coverage for every visible tile should be explicitly set. 
    */
    _resetCoverage: function(level) {
        this._coverage[level] = {};
    },


    _compareTiles: function(prevBest, tile) {
        if (!prevBest) {
            return tile;
        }

        if (tile.visibility > prevBest.visibility) {
            return tile;
        } else if (tile.visibility == prevBest.visibility) {
            if (tile.distance < prevBest.distance) {
                return tile;
            }
        }

        return prevBest;
    },


    _getOverlayIndex: function(elmt) {
        for (var i = this._overlays.length - 1; i >= 0; i--) {
            if (this._overlays[i].elmt == elmt) {
                return i;
            }
        }

        return -1;
    },


    _updateActual: function() {
        this._updateAgain = false;

        var _canvas = this._canvas;
        var _context = this._context;
        var _container = this._container;
        var _useCanvas = useCanvas;
        var _lastDrawn = this._lastDrawn;

        while (_lastDrawn.length > 0) {
            var tile = _lastDrawn.pop();
            tile.beingDrawn = false;
        }

        var viewportSize = this._viewport.getContainerSize();
        var viewportWidth = viewportSize.x;
        var viewportHeight = viewportSize.y;

        _canvas.innerHTML = "";
        if (_useCanvas) {
            _canvas.width = viewportWidth;
            _canvas.height = viewportHeight;
            _context.clearRect(0, 0, viewportWidth, viewportHeight);
        }

        var viewportBounds = this._viewport.getBounds(true);
        var viewportTL = viewportBounds.getTopLeft();
        var viewportBR = viewportBounds.getBottomRight();
        if (!this.config.wrapHorizontal &&
                    (viewportBR.x < 0 || viewportTL.x > 1)) {
            return;
        } else if (!this.config.wrapVertical &&
                    (viewportBR.y < 0 || viewportTL.y > this._normHeight)) {
            return;
        }




        var _abs = Math.abs;
        var _ceil = Math.ceil;
        var _floor = Math.floor;
        var _log = Math.log;
        var _max = Math.max;
        var _min = Math.min;
        var alwaysBlend = this.config.alwaysBlend;
        var blendTimeMillis = 1000 * this.config.blendTime;
        var immediateRender = this.config.immediateRender;
        var wrapHorizontal = this.config.wrapHorizontal;
        var wrapVertical = this.config.wrapVertical;

        if (!wrapHorizontal) {
            viewportTL.x = _max(viewportTL.x, 0);
            viewportBR.x = _min(viewportBR.x, 1);
        }
        if (!wrapVertical) {
            viewportTL.y = _max(viewportTL.y, 0);
            viewportBR.y = _min(viewportBR.y, this._normHeight);
        }

        var best = null;
        var haveDrawn = false;
        var currentTime = new Date().getTime();

        var viewportCenter = this._viewport.pixelFromPoint(this._viewport.getCenter());
        var zeroRatioT = this._viewport.deltaPixelsFromPoints(this._source.getPixelRatio(0), false).x;
        var optimalPixelRatio = immediateRender ? 1 : zeroRatioT;

        var lowestLevel = _max(this._minLevel, _floor(_log(this.config.minZoomImageRatio) / _log(2)));
        var zeroRatioC = this._viewport.deltaPixelsFromPoints(this._source.getPixelRatio(0), true).x;
        var highestLevel = _min(this._maxLevel,
                    _floor(_log(zeroRatioC / MIN_PIXEL_RATIO) / _log(2)));

        lowestLevel = _min(lowestLevel, highestLevel);

        for (var level = highestLevel; level >= lowestLevel; level--) {
            var drawLevel = false;
            var renderPixelRatioC = this._viewport.deltaPixelsFromPoints(
                        this._source.getPixelRatio(level), true).x;     // note the .x!

            if ((!haveDrawn && renderPixelRatioC >= MIN_PIXEL_RATIO) ||
                        level == lowestLevel) {
                drawLevel = true;
                haveDrawn = true;
            } else if (!haveDrawn) {
                continue;
            }

            this._resetCoverage(level);

            var levelOpacity = _min(1, (renderPixelRatioC - 0.5) / 0.5);
            var renderPixelRatioT = this._viewport.deltaPixelsFromPoints(
                        this._source.getPixelRatio(level), false).x;
            var levelVisibility = optimalPixelRatio /
                        _abs(optimalPixelRatio - renderPixelRatioT);

            var tileTL = this._source.getTileAtPoint(level, viewportTL);
            var tileBR = this._source.getTileAtPoint(level, viewportBR);
            var numTiles = this._getNumTiles(level);
            var numTilesX = numTiles.x;
            var numTilesY = numTiles.y;
            if (!wrapHorizontal) {
                tileBR.x = _min(tileBR.x, numTilesX - 1);
            }
            if (!wrapVertical) {
                tileBR.y = _min(tileBR.y, numTilesY - 1);
            }

            for (var x = tileTL.x; x <= tileBR.x; x++) {
                for (var y = tileTL.y; y <= tileBR.y; y++) {
                    var tile = this._getTile(level, x, y, currentTime, numTilesX, numTilesY);
                    var drawTile = drawLevel;

                    this._setCoverage(level, x, y, false);

                    if (!tile.exists) {
                        continue;
                    }

                    if (haveDrawn && !drawTile) {
                        if (this._isCovered(level, x, y)) {
                            this._setCoverage(level, x, y, true);
                        } else {
                            drawTile = true;
                        }
                    }

                    if (!drawTile) {
                        continue;
                    }

                    var boundsTL = tile.bounds.getTopLeft();
                    var boundsSize = tile.bounds.getSize();
                    var positionC = this._viewport.pixelFromPoint(boundsTL, true);
                    var sizeC = this._viewport.deltaPixelsFromPoints(boundsSize, true);

                    if (!this._tileOverlap) {
                        sizeC = sizeC.plus(new $.Point(1, 1));
                    }

                    var positionT = this._viewport.pixelFromPoint(boundsTL, false);
                    var sizeT = this._viewport.deltaPixelsFromPoints(boundsSize, false);
                    var tileCenter = positionT.plus(sizeT.divide(2));
                    var tileDistance = viewportCenter.distanceTo(tileCenter);

                    tile.position = positionC;
                    tile.size = sizeC;
                    tile.distance = tileDistance;
                    tile.visibility = levelVisibility;

                    if (tile.loaded) {
                        if (!tile.blendStart) {
                            tile.blendStart = currentTime;
                        }

                        var deltaTime = currentTime - tile.blendStart;
                        var opacity = _min(1, deltaTime / blendTimeMillis);
                        
                        if (alwaysBlend) {
                            opacity *= levelOpacity;
                        }

                        tile.opacity = opacity;

                        _lastDrawn.push(tile);

                        if (opacity == 1) {
                            this._setCoverage(level, x, y, true);
                        } else if (deltaTime < blendTimeMillis) {
                            updateAgain = true;
                        }
                    } else if (tile.Loading) {
                    } else {
                        best = this._compareTiles(best, tile);
                    }
                }
            }

            if (this._providesCoverage(level)) {
                break;
            }
        }

        for (var i = _lastDrawn.length - 1; i >= 0; i--) {
            var tile = _lastDrawn[i];

            if (_useCanvas) {
                tile.drawCanvas(_context);
            } else {
                tile.drawHTML(_canvas);
            }

            tile.beingDrawn = true;
        }

        var numOverlays = this._overlays.length;
        for (var i = 0; i < numOverlays; i++) {
            var overlay = this._overlays[i];
            var bounds = overlay.bounds;

            overlay.position = this._viewport.pixelFromPoint(bounds.getTopLeft(), true);
            overlay.size = this._viewport.deltaPixelsFromPoints(bounds.getSize(), true);
            overlay.drawHTML(_container);
        }

        if (best) {
            this._loadTile(best, currentTime);
            this._updateAgain = true; // because we haven't finished drawing, so
        }
    },


    addOverlay: function(elmt, loc, placement) {
        var elmt = $.Utils.getElement(elmt);

        if (this._getOverlayIndex(elmt) >= 0) {
            return;     // they're trying to add a duplicate overlay
        }

        this._overlays.push(new $.Overlay(elmt, loc, placement));
        this._updateAgain = true;
    },

    updateOverlay: function(elmt, loc, placement) {
        var elmt = $.Utils.getElement(elmt);
        var i = this._getOverlayIndex(elmt);

        if (i >= 0) {
            this._overlays[i].update(loc, placement);
            this._updateAgain = true;
        }
    },

    removeOverlay: function(elmt) {
        var elmt = $.Utils.getElement(elmt);
        var i = this._getOverlayIndex(elmt);

        if (i >= 0) {
            this._overlays[i].destroy();
            this._overlays.splice(i, 1);
            this._updateAgain = true;
        }
    },

    clearOverlays: function() {
        while (this._overlays.length > 0) {
            this._overlays.pop().destroy();
            this._updateAgain = true;
        }
    },


    needsUpdate: function() {
        return this._updateAgain;
    },

    numTilesLoaded: function() {
        return this._tilesLoaded.length;
    },

    reset: function() {
        this._clearTiles();
        this._lastResetTime = new Date().getTime();
        this._updateAgain = true;
    },

    update: function() {
        this._profiler.beginUpdate();
        this._midUpdate = true;
        this._updateActual();
        this._midUpdate = false;
        this._profiler.endUpdate();
    },

    idle: function() {
    }
};

}( OpenSeadragon ));

(function( $ ){
    
$.Viewport = function(containerSize, contentSize, config) {
    this.zoomPoint = null;
    this.config = config;
    this._containerSize = containerSize;
    this._contentSize = contentSize;
    this._contentAspect = contentSize.x / contentSize.y;
    this._contentHeight = contentSize.y / contentSize.x;
    this._centerSpringX = new $.Spring(0, this.config);
    this._centerSpringY = new $.Spring(0, this.config);
    this._zoomSpring = new $.Spring(1, this.config);
    this._homeBounds = new $.Rect(0, 0, 1, this._contentHeight);
    this.goHome(true);
    this.update();
};

$.Viewport.prototype = {
    _getHomeZoom: function() {
        var aspectFactor = this._contentAspect / this.getAspectRatio();
        return (aspectFactor >= 1) ? 1 : aspectFactor;
    },

    _getMinZoom: function() {
        var homeZoom = this._getHomeZoom();
        var zoom = this.config.minZoomImageRatio * homeZoom;

        return Math.min(zoom, homeZoom);
    },

    _getMaxZoom: function() {
        var zoom = this._contentSize.x * this.config.maxZoomPixelRatio / this._containerSize.x;
        return Math.max(zoom, this._getHomeZoom());
    },
    getAspectRatio: function() {
        return this._containerSize.x / this._containerSize.y;
    },
    getContainerSize: function() {
        return new $.Point(this._containerSize.x, this._containerSize.y);
    },

    getBounds: function(current) {
        var center = this.getCenter(current);
        var width = 1.0 / this.getZoom(current);
        var height = width / this.getAspectRatio();

        return new $.Rect(center.x - width / 2.0, center.y - height / 2.0,
            width, height);
    },

    getCenter: function(current) {
        var centerCurrent = new $.Point(this._centerSpringX.getCurrent(),
                this._centerSpringY.getCurrent());
        var centerTarget = new $.Point(this._centerSpringX.getTarget(),
                this._centerSpringY.getTarget());

        if (current) {
            return centerCurrent;
        } else if (!this.zoomPoint) {
            return centerTarget;
        }

        var oldZoomPixel = this.pixelFromPoint(this.zoomPoint, true);

        var zoom = this.getZoom();
        var width = 1.0 / zoom;
        var height = width / this.getAspectRatio();
        var bounds = new $.Rect(centerCurrent.x - width / 2.0,
                centerCurrent.y - height / 2.0, width, height);

        var newZoomPixel = this.zoomPoint.minus(bounds.getTopLeft()).times(this._containerSize.x / bounds.width);
        var deltaZoomPixels = newZoomPixel.minus(oldZoomPixel);
        var deltaZoomPoints = deltaZoomPixels.divide(this._containerSize.x * zoom);

        return centerTarget.plus(deltaZoomPoints);
    },

    getZoom: function(current) {
        if (current) {
            return this._zoomSpring.getCurrent();
        } else {
            return this._zoomSpring.getTarget();
        }
    },


    applyConstraints: function(immediately) {
        var actualZoom = this.getZoom();
        var constrainedZoom = Math.max(Math.min(actualZoom, this._getMaxZoom()), this._getMinZoom());
        if (actualZoom != constrainedZoom) {
            this.zoomTo(constrainedZoom, this.zoomPoint, immediately);
        }

        var bounds = this.getBounds();
        var visibilityRatio = this.config.visibilityRatio;

        var horThres = visibilityRatio * bounds.width;
        var verThres = visibilityRatio * bounds.height;

        var left = bounds.x + bounds.width;
        var right = 1 - bounds.x;
        var top = bounds.y + bounds.height;
        var bottom = this._contentHeight - bounds.y;

        var dx = 0;
        if (this.config.wrapHorizontal) {
        } else if (left < horThres) {
            dx = horThres - left;
        } else if (right < horThres) {
            dx = right - horThres;
        }

        var dy = 0;
        if (this.config.wrapVertical) {
        } else if (top < verThres) {
            dy = verThres - top;
        } else if (bottom < verThres) {
            dy = bottom - verThres;
        }

        if (dx || dy) {
            bounds.x += dx;
            bounds.y += dy;
            this.fitBounds(bounds, immediately);
        }
    },

    ensureVisible: function(immediately) {
        this.applyConstraints(immediately);
    },

    fitBounds: function(bounds, immediately) {
        var aspect = this.getAspectRatio();
        var center = bounds.getCenter();

        var newBounds = new $.Rect(bounds.x, bounds.y, bounds.width, bounds.height);
        if (newBounds.getAspectRatio() >= aspect) {
            newBounds.height = bounds.width / aspect;
            newBounds.y = center.y - newBounds.height / 2;
        } else {
            newBounds.width = bounds.height * aspect;
            newBounds.x = center.x - newBounds.width / 2;
        }

        this.panTo(this.getCenter(true), true);
        this.zoomTo(this.getZoom(true), null, true);

        var oldBounds = this.getBounds();
        var oldZoom = this.getZoom();

        var newZoom = 1.0 / newBounds.width;
        if (newZoom == oldZoom || newBounds.width == oldBounds.width) {
            this.panTo(center, immediately);
            return;
        }

        var refPoint = oldBounds.getTopLeft().times(this._containerSize.x / oldBounds.width).minus(
                newBounds.getTopLeft().times(this._containerSize.x / newBounds.width)).divide(
                this._containerSize.x / oldBounds.width - this._containerSize.x / newBounds.width);


        this.zoomTo(newZoom, refPoint, immediately);
    },

    goHome: function(immediately) {
        var center = this.getCenter();

        if (this.config.wrapHorizontal) {
            center.x = (1 + (center.x % 1)) % 1;
            this._centerSpringX.resetTo(center.x);
            this._centerSpringX.update();
        }

        if (this.config.wrapVertical) {
            center.y = (this._contentHeight + (center.y % this._contentHeight)) % this._contentHeight;
            this._centerSpringY.resetTo(center.y);
            this._centerSpringY.update();
        }

        this.fitBounds(this._homeBounds, immediately);
    },

    panBy: function(delta, immediately) {
        var center = new $.Point(this._centerSpringX.getTarget(),
                this._centerSpringY.getTarget());
        this.panTo(center.plus(delta), immediately);
    },

    panTo: function(center, immediately) {
        if (immediately) {
            this._centerSpringX.resetTo(center.x);
            this._centerSpringY.resetTo(center.y);
        } else {
            this._centerSpringX.springTo(center.x);
            this._centerSpringY.springTo(center.y);
        }
    },

    zoomBy: function(factor, refPoint, immediately) {
        this.zoomTo(this._zoomSpring.getTarget() * factor, refPoint, immediately);
    },

    zoomTo: function(zoom, refPoint, immediately) {

        if (immediately) {
            this._zoomSpring.resetTo(zoom);
        } else {        
            this._zoomSpring.springTo(zoom);
        }

        this.zoomPoint = refPoint instanceof $.Point ? refPoint : null;
    },

    resize: function(newContainerSize, maintain) {
        var oldBounds = this.getBounds();
        var newBounds = oldBounds;
        var widthDeltaFactor = newContainerSize.x / this._containerSize.x;

        this._containerSize = new $.Point(newContainerSize.x, newContainerSize.y);

        if (maintain) {
            newBounds.width = oldBounds.width * widthDeltaFactor;
            newBounds.height = newBounds.width / this.getAspectRatio();
        }

        this.fitBounds(newBounds, true);
    },

    update: function() {
        var oldCenterX = this._centerSpringX.getCurrent();
        var oldCenterY = this._centerSpringY.getCurrent();
        var oldZoom = this._zoomSpring.getCurrent();

        if (this.zoomPoint) {
            var oldZoomPixel = this.pixelFromPoint(this.zoomPoint, true);
        }

        this._zoomSpring.update();

        if (this.zoomPoint && this._zoomSpring.getCurrent() != oldZoom) {
            var newZoomPixel = this.pixelFromPoint(this.zoomPoint, true);
            var deltaZoomPixels = newZoomPixel.minus(oldZoomPixel);
            var deltaZoomPoints = this.deltaPointsFromPixels(deltaZoomPixels, true);

            this._centerSpringX.shiftBy(deltaZoomPoints.x);
            this._centerSpringY.shiftBy(deltaZoomPoints.y);
        } else {
            this.zoomPoint = null;
        }

        this._centerSpringX.update();
        this._centerSpringY.update();

        return this._centerSpringX.getCurrent() != oldCenterX ||
                this._centerSpringY.getCurrent() != oldCenterY ||
                this._zoomSpring.getCurrent() != oldZoom;
    },


    deltaPixelsFromPoints: function(deltaPoints, current) {
        return deltaPoints.times(this._containerSize.x * this.getZoom(current));
    },

    deltaPointsFromPixels: function(deltaPixels, current) {
        return deltaPixels.divide(this._containerSize.x * this.getZoom(current));
    },

    pixelFromPoint: function(point, current) {
        var bounds = this.getBounds(current);
        return point.minus(bounds.getTopLeft()).times(this._containerSize.x / bounds.width);
    },

    pointFromPixel: function(pixel, current) {
        var bounds = this.getBounds(current);
        return pixel.divide(this._containerSize.x / bounds.width).plus(bounds.getTopLeft());
    }
};

}( OpenSeadragon ));
