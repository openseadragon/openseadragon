/**
 * (c) 2011 Christopher Thatcher
 * (c) 2010 OpenSeadragon
 * (c) 2010 CodePlex Foundation
 *
 * OpenSeadragon 0.8.19
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

    //The following functions are originally from the Openseadragon Utils 
    //module but have been moved to Openseadragon to avoid the Utils anti-
    //pattern.  Not all of the code is A-grade compared to equivalent functions
    // from libraries like jquery, but until we need better we'll leave those
    //orignally developed by the project.
    $.BROWSERS = {
        UNKNOWN:    0,
        IE:         1,
        FIREFOX:    2,
        SAFARI:     3,
        CHROME:     4,
        OPERA:      5
    };

    $.Browser = {
        vendor:     $.BROWSERS.UNKNOWN,
        version:    0,
        alpha:      true
    };

    var ACTIVEX = [
            "Msxml2.XMLHTTP", 
            "Msxml3.XMLHTTP", 
            "Microsoft.XMLHTTP"
        ],  
        FILEFORMATS = {
            "bmp":  false,
            "jpeg": true,
            "jpg":  true,
            "png":  true,
            "tif":  false,
            "wdp":  false
        },
        URLPARAMS = {};

    (function() {

        var app = navigator.appName,
            ver = navigator.appVersion,
            ua  = navigator.userAgent;

        switch( navigator.appName ){
            case "Microsoft Internet Explorer":
                if( !!window.attachEvent && 
                    !!window.ActiveXObject ) {

                    $.Browser.vendor = $.BROWSERS.IE;
                    $.Browser.version = parseFloat(
                        ua.substring( 
                            ua.indexOf( "MSIE" ) + 5, 
                            ua.indexOf( ";", ua.indexOf( "MSIE" ) ) )
                        );
                }
                break;
            case "Netscape":
                if( !!window.addEventListener ){
                    if ( ua.indexOf( "Firefox" ) >= 0 ) {
                        $.Browser.vendor = $.BROWSERS.FIREFOX;
                        $.Browser.version = parseFloat(
                            ua.substring( ua.indexOf( "Firefox" ) + 8 )
                        );
                    } else if ( ua.indexOf( "Safari" ) >= 0 ) {
                        $.Browser.vendor = ua.indexOf( "Chrome" ) >= 0 ? 
                            $.BROWSERS.CHROME : 
                            $.BROWSERS.SAFARI;
                        $.Browser.version = parseFloat(
                            ua.substring( 
                                ua.substring( 0, ua.indexOf( "Safari" ) ).lastIndexOf( "/" ) + 1, 
                                ua.indexOf( "Safari" )
                            )
                        );
                    }
                }
                break;
            case "Opera":
                $.Browser.vendor = $.BROWSERS.OPERA;
                $.Browser.version = parseFloat( ver );
                break;
        }


        var query = window.location.search.substring( 1 ),    // ignore '?'
            parts = query.split('&'),
            part,
            sep,
            i;

        for ( i = 0; i < parts.length; i++ ) {
            part = parts[ i ];
            sep  = part.indexOf( '=' );

            if ( sep > 0 ) {
                URLPARAMS[ part.substring( 0, sep ) ] =
                    decodeURIComponent( part.substring( sep + 1 ) );
            }
        }

        //determine if this browser supports 
        $.Browser.alpha = !( 
            $.Browser.vendor == $.BROWSERS.IE || (
                $.Browser.vendor == $.BROWSERS.CHROME && 
                $.Browser.version < 2
            )
        );

    })();

    //TODO: $.Debug is often used inside a try/catch block which generally
    //      prevents allowings errors to occur with detection until a debugger
    //      is attached.  Although I've been guilty of the same anti-pattern
    //      I eventually was convinced that errors should naturally propogate in
    //      all but the most special cases.
    $.Debug = window.console ? window.console : function(){};


    $.extend( $, {

        getElement: function( element ) {
            if (typeof ( element ) == "string") {
                element = document.getElementById( element );
            }
            return element;
        },
        
        getOffsetParent: function( element, isFixed ) {
            if ( isFixed && element != document.body ) {
                return document.body;
            } else {
                return element.offsetParent;
            }
        },

        getElementPosition: function( element ) {
            var element = $.getElement( element );

            var isFixed = $.getElementStyle( element ).position == "fixed",
                offsetParent = $.getOffsetParent( element, isFixed ),
                result  = new $.Point();

            while ( offsetParent ) {

                result.x += element.offsetLeft;
                result.y += element.offsetTop;

                if ( isFixed ) {
                    result = result.plus( $.getPageScroll() );
                }

                element = offsetParent;
                isFixed = $.getElementStyle( element ).position == "fixed";
                offsetParent = $.getOffsetParent( element, isFixed );
            }

            return result;
        },

        getElementSize: function( element ) {
            var element = $.getElement( element );

            return new $.Point(
                element.clientWidth, 
                element.clientHeight
            );
        },

        getElementStyle: function( element ) {
            var element = $.getElement( element );

            if ( element.currentStyle ) {
                return element.currentStyle;
            } else if ( window.getComputedStyle ) {
                return window.getComputedStyle( element, "" );
            } else {
                throw new Error( "Unknown element style, no known technique." );
            }
        },

        getEvent: function( event ) {
            return event ? event : window.event;
        },

        getMousePosition: function( event ) {
            var event = $.getEvent( event );

            var result = new $.Point();

            if ( typeof( event.pageX ) == "number" ) {
                result.x = event.pageX;
                result.y = event.pageY;
            } else if ( typeof( event.clientX ) == "number" ) {

                result.x = 
                    event.clientX + 
                    document.body.scrollLeft + 
                    document.documentElement.scrollLeft;
                result.y = 
                    event.clientY + 
                    document.body.scrollTop + 
                    document.documentElement.scrollTop;
            } else {
                throw new Error(
                    "Unknown event mouse position, no known technique."
                );
            }

            return result;
        },

        getPageScroll: function() {
            var result  = new $.Point(),
                docElmt = document.documentElement || {},
                body    = document.body || {};

            if ( typeof( window.pageXOffset ) == "number" ) {
                result.x = window.pageXOffset;
                result.y = window.pageYOffset;
            } else if ( body.scrollLeft || body.scrollTop ) {
                result.x = body.scrollLeft;
                result.y = body.scrollTop;
            } else if ( docElmt.scrollLeft || docElmt.scrollTop ) {
                result.x = docElmt.scrollLeft;
                result.y = docElmt.scrollTop;
            }

            return result;
        },

        getWindowSize: function() {
            var result  = new $.Point(),
                docElmt = document.documentElement || {},
                body    = document.body || {};

            if ( typeof( window.innerWidth ) == 'number' ) {
                result.x = window.innerWidth;
                result.y = window.innerHeight;
            } else if ( docElmt.clientWidth || docElmt.clientHeight ) {
                result.x = docElmt.clientWidth;
                result.y = docElmt.clientHeight;
            } else if ( body.clientWidth || body.clientHeight ) {
                result.x = body.clientWidth;
                result.y = body.clientHeight;
            } else {
                throw new Error("Unknown window size, no known technique.");
            }

            return result;
        },

        imageFormatSupported: function( extension ) {
            var extension = extension ? extension : "";
            return !!FILEFORMATS[ extension.toLowerCase() ];
        },

        makeCenteredNode: function( element ) {
            var element = $.getElement( element );

            var div      = $.makeNeutralElement( "div" ),
                html     = [],
                innerDiv,
                innerDivs;

            //TODO: I dont understand the use of # inside the style attributes
            //      below.  Invetigate the results of the constructed html in
            //      the browser and clean up the mark-up to make this clearer.
            html.push('<div style="display:table; height:100%; width:100%;');
            html.push('border:none; margin:0px; padding:0px;'); // neutralizing
            html.push('#position:relative; overflow:hidden; text-align:left;">');
            html.push('<div style="#position:absolute; #top:50%; width:100%; ');
            html.push('border:none; margin:0px; padding:0px;'); // neutralizing
            html.push('display:table-cell; vertical-align:middle;">');
            html.push('<div style="#position:relative; #top:-50%; width:100%; ');
            html.push('border:none; margin:0px; padding:0px;'); // neutralizing
            html.push('text-align:center;"></div></div></div>');

            div.innerHTML = html.join( '' );
            div           = div.firstChild;

            innerDiv    = div;
            innerDivs   = div.getElementsByTagName( "div" );
            while ( innerDivs.length > 0 ) {
                innerDiv  = innerDivs[ 0 ];
                innerDivs = innerDiv.getElementsByTagName( "div" );
            }

            innerDiv.appendChild( element );

            return div;
        },

        makeNeutralElement: function( tagName ) {
            var element = document.createElement( tagName ),
                style   = element.style;

            style.background = "transparent none";
            style.border     = "none";
            style.margin     = "0px";
            style.padding    = "0px";
            style.position   = "static";

            return element;
        },

        makeTransparentImage: function( src ) {
            var img     = $.makeNeutralElement( "img" ),
                element = null;

            if ( $.Browser.vendor == $.BROWSERS.IE && 
                 $.Browser.version < 7 ) {

                element = $.makeNeutralElement("span");
                element.style.display = "inline-block";

                img.onload = function() {
                    element.style.width  = element.style.width || img.width + "px";
                    element.style.height = element.style.height || img.height + "px";

                    img.onload = null;
                    img = null;     // to prevent memory leaks in IE
                };

                img.src = src;
                element.style.filter =
                    "progid:DXImageTransform.Microsoft.AlphaImageLoader(src='" +
                    src + 
                    "', sizingMethod='scale')";

            } else {

                element = img;
                element.src = src;

            }

            return element;
        },

        setElementOpacity: function( element, opacity, usesAlpha ) {
            var element = $.getElement( element );

            var previousFilter,
                ieOpacity,
                ieFilter;

            if ( usesAlpha && !$.Browser.alpha ) {
                opacity = Math.round( opacity );
            }

            if ( opacity < 1 ) {
                element.style.opacity = opacity;
            } else {
                element.style.opacity = "";
            }

            if ( opacity == 1 ) {
                prevFilter = element.style.filter || "";
                element.style.filter = prevFilter.replace(/alpha\(.*?\)/g, "");
                return;
            }

            ieOpacity = Math.round( 100 * opacity );
            ieFilter  = " alpha(opacity=" + ieOpacity + ") ";

            //TODO: find out why this uses a try/catch instead of a predetermined
            //      routine or at least an if/elseif/else
            try {
                if ( element.filters && element.filters.alpha ) {
                    element.filters.alpha.opacity = ieOpacity;
                } else {
                    element.style.filter += ieFilter;
                }
            } catch ( e ) {
                element.style.filter += ieFilter;
            }
        },

        addEvent: function( element, eventName, handler, useCapture ) {
            var element = $.getElement( element );

            //TODO: Why do this if/else on every method call instead of just
            //      defining this function once based on the same logic
            if ( element.addEventListener ) {
                element.addEventListener( eventName, handler, useCapture );
            } else if ( element.attachEvent ) {
                element.attachEvent( "on" + eventName, handler );
                if ( useCapture && element.setCapture ) {
                    element.setCapture();
                }
            } else {
                throw new Error(
                    "Unable to attach event handler, no known technique."
                );
            }
        },

        removeEvent: function( element, eventName, handler, useCapture ) {
            var element = $.getElement( element );

            //TODO: Why do this if/else on every method call instead of just
            //      defining this function once based on the same logic
            if ( element.removeEventListener ) {
                element.removeEventListener( eventName, handler, useCapture );
            } else if ( element.detachEvent ) {
                element.detachEvent("on" + eventName, handler);
                if ( useCapture && element.releaseCapture ) {
                    element.releaseCapture();
                }
            } else {
                throw new Error(
                    "Unable to detach event handler, no known technique."
                );
            }
        },

        cancelEvent: function( event ) {
            var event = $.getEvent( event );

            if ( event.preventDefault ) {
                event.preventDefault();     // W3C for preventing default
            }

            event.cancel = true;            // legacy for preventing default
            event.returnValue = false;      // IE for preventing default
        },

        stopEvent: function( event ) {
            var event = $.getEvent( event );

            if ( event.stopPropagation ) {
                event.stopPropagation();    // W3C for stopping propagation
            }

            event.cancelBubble = true;      // IE for stopping propagation
        },

        createCallback: function( object, method ) {
            //TODO: This pattern is painful to use and debug.  It's much cleaner
            //      to use pinning plus anonymous functions.  Get rid of this
            //      pattern!
            var initialArgs = [],
                i;
            for ( i = 2; i < arguments.length; i++ ) {
                initialArgs.push( arguments[ i ] );
            }

            return function() {
                var args = initialArgs.concat( [] ),
                    i;
                for ( i = 0; i < arguments.length; i++ ) {
                    args.push( arguments[ i ] );
                }

                return method.apply( object, args );
            };
        },

        getUrlParameter: function( key ) {
            var value = URLPARAMS[ key ];
            return value ? value : null;
        },

        makeAjaxRequest: function( url, callback ) {
            var async   = typeof( callback ) == "function",
                request = null,
                actual,
                i;

            if ( async ) {
                actual = callback;
                callback = function() {
                    window.setTimeout(
                        $.createCallback( null, actual, request ), 
                        1
                    );
                };
            }

            if ( window.ActiveXObject ) {
                //TODO: very bad...Why check every time using try/catch when
                //      we could determine once at startup which activeX object
                //      was supported.  This will have significant impact on 
                //      performance for IE Browsers
                for ( i = 0; i < ACTIVEX.length; i++ ) {
                    try {
                        request = new ActiveXObject( ACTIVEX[ i ] );
                        break;
                    } catch (e) {
                        continue;
                    }
                }
            } else if ( window.XMLHttpRequest ) {
                request = new XMLHttpRequest();
            }

            if ( !request ) {
                throw new Error( "Browser doesn't support XMLHttpRequest." );
            }


            if ( async ) {
                request.onreadystatechange = function() {
                    if ( request.readyState == 4) {
                        request.onreadystatechange = new function() { };
                        callback();
                    }
                };
            }

            try {
                request.open( "GET", url, async );
                request.send( null );
            } catch (e) {
                $.Debug.log(e.name + " while making AJAX request: " + e.message);

                request.onreadystatechange = null;
                request = null;

                if ( async ) {
                    callback();
                }
            }

            return async ? null : request;
        },

        parseXml: function( string ) {
            //TODO: yet another example where we can determine the correct
            //      implementation once at start-up instead of everytime we use
            //      the function.
            var xmlDoc = null,
                parser;

            if ( window.ActiveXObject ) {

                xmlDoc = new ActiveXObject( "Microsoft.XMLDOM" );
                xmlDoc.async = false;
                xmlDoc.loadXML( string );

            } else if ( window.DOMParser ) {

                parser = new DOMParser();
                xmlDoc = parser.parseFromString( string, "text/xml" );
                
            } else {
                throw new Error( "Browser doesn't support XML DOM." );
            }

            return xmlDoc;
        }
    });

    
}( OpenSeadragon ));

(function($){


    $.EventHandler = function() {
        this.events = {};
    };

    $.EventHandler.prototype = {

        addHandler: function( id, handler ) {
            var events = this.events[ id ];
            if( !events ){
                this.events[ id ] = events = [];
            }
            events[ events.length ] = handler;
        },

        removeHandler: function( id, handler ) {
            //Start Thatcher - unneccessary indirection.  Also, because events were
            //               - not actually being removed, we need to add the code
            //               - to do the removal ourselves. TODO
            var events = this.events[ id ];
            if ( !events ){ 
                return; 
            }
            //End Thatcher
        },

        getHandler: function( id ) {
            var events = this.events[ id ]; 
            if ( !events || !events.length ){ 
                return null; 
            }
            events = events.length === 1 ? 
                [ events[ 0 ] ] : 
                Array.apply( null, events );
            return function( source, args ) {
                var i, 
                    l = events.length;
                for ( i = 0; i < l; i++ ) {
                    events[ i ]( source, args );
                }
            };
        },

        raiseEvent: function( eventName, eventArgs ) {
            var handler = this.getHandler( eventName );

            if ( handler ) {
                if ( !eventArgs ) {
                    eventArgs = new Object();
                }

                handler( this, eventArgs );
            }
        }
    };

}( OpenSeadragon ));

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
                    $.Debug.error(e.name +
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
                    $.Debug.error(e.name +
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
                    $.Debug.error(e.name +
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
                    $.Debug.error(e.name +
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
                    $.Debug.error(e.name +
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
                    $.Debug.error(
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

(function( $ ){
    

$.ControlAnchor = {
    NONE: 0,
    TOP_LEFT: 1,
    TOP_RIGHT: 2,
    BOTTOM_RIGHT: 3,
    BOTTOM_LEFT: 4
};

$.Control = function (elmt, anchor, container) {
    this.elmt = elmt;
    this.anchor = anchor;
    this.container = container;
    this.wrapper = $.makeNeutralElement("span");
    this.wrapper.style.display = "inline-block";
    this.wrapper.appendChild(this.elmt);

    if (this.anchor == $.ControlAnchor.NONE) {
        // IE6 fix
        this.wrapper.style.width = this.wrapper.style.height = "100%";    
    }

    if ( this.anchor == $.ControlAnchor.TOP_RIGHT || 
         this.anchor == $.ControlAnchor.BOTTOM_RIGHT ) {
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
        if (this.elmt[ $.SIGNAL ] && $.Browser.vendor == $.BROWSERS.IE ) {
            $.setElementOpacity(this.elmt, opacity, true);
        } else {
            $.setElementOpacity(this.wrapper, opacity, true);
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
        i;

    $.EventHandler.call( this );

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
            imageLoaderLimit:   0,
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
    this.container      = $.makeNeutralElement("div");
    this.canvas         = $.makeNeutralElement("div");

    this._fsBoundsDelta     = new $.Point( 1, 1 );
    this._prevContainerSize = null;
    this._lastOpenStartTime = 0;
    this._lastOpenEndTime   = 0;
    this._animating         = false;
    this._forceRedraw       = false;
    this._mouseInside       = false;

    this.innerTracker = new $.MouseTracker(
        this.canvas, 
        this.config.clickTimeThreshold, 
        this.config.clickDistThreshold
    );
    this.innerTracker.clickHandler   = $.delegate(this, onCanvasClick);
    this.innerTracker.dragHandler    = $.delegate(this, onCanvasDrag);
    this.innerTracker.releaseHandler = $.delegate(this, onCanvasRelease);
    this.innerTracker.scrollHandler  = $.delegate(this, onCanvasScroll);
    this.innerTracker.setTracking( true ); // default state

    this.outerTracker = new $.MouseTracker(
        this.container, 
        this.config.clickTimeThreshold, 
        this.config.clickDistThreshold
    );
    this.outerTracker.enterHandler   = $.delegate(this, onContainerEnter);
    this.outerTracker.exitHandler    = $.delegate(this, onContainerExit);
    this.outerTracker.releaseHandler = $.delegate(this, onContainerRelease);
    this.outerTracker.setTracking( true ); // always tracking

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
        this.controls[ layout ] = $.makeNeutralElement("div");
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

    //////////////////////////////////////////////////////////////////////////
    // Navigation Controls
    //////////////////////////////////////////////////////////////////////////
    this._group = null;
    this._zooming = false;    // whether we should be continuously zooming
    this._zoomFactor = null;  // how much we should be continuously zooming by
    this._lastZoomTime = null;

    this.elmt = null;
    
    var beginZoomingInHandler   = $.delegate(this, beginZoomingIn);
    var endZoomingHandler       = $.delegate(this, endZooming);
    var doSingleZoomInHandler   = $.delegate(this, doSingleZoomIn);
    var beginZoomingOutHandler  = $.delegate(this, beginZoomingOut);
    var doSingleZoomOutHandler  = $.delegate(this, doSingleZoomOut);
    var onHomeHandler           = $.delegate(this, onHome);
    var onFullPageHandler       = $.delegate(this, onFullPage);

    var navImages = this.config.navImages;

    var zoomIn = new $.Button({ 
        config:     this.config, 
        tooltip:    $.Strings.getString("Tooltips.ZoomIn"), 
        srcRest:    resolveUrl(this.urlPrefix, navImages.zoomIn.REST), 
        srcGroup:   resolveUrl(this.urlPrefix, navImages.zoomIn.GROUP), 
        srcHover:   resolveUrl(this.urlPrefix, navImages.zoomIn.HOVER), 
        srcDown:    resolveUrl(this.urlPrefix, navImages.zoomIn.DOWN),
        onPress:    beginZoomingInHandler, 
        onRelease:  endZoomingHandler, 
        onClick:    doSingleZoomInHandler, 
        onEnter:    beginZoomingInHandler, 
        onExit:     endZoomingHandler 
    });

    var zoomOut = new $.Button({ 
        config:     this.config, 
        tooltip:    $.Strings.getString("Tooltips.ZoomOut"), 
        srcRest:    resolveUrl(this.urlPrefix, navImages.zoomOut.REST), 
        srcGroup:   resolveUrl(this.urlPrefix, navImages.zoomOut.GROUP), 
        srcHover:   resolveUrl(this.urlPrefix, navImages.zoomOut.HOVER), 
        srcDown:    resolveUrl(this.urlPrefix, navImages.zoomOut.DOWN),
        onPress:    beginZoomingOutHandler, 
        onRelease:  endZoomingHandler, 
        onClick:    doSingleZoomOutHandler, 
        onEnter:    beginZoomingOutHandler, 
        onExit:     endZoomingHandler 
    });
    var goHome = new $.Button({ 
        config:     this.config, 
        tooltip:    $.Strings.getString("Tooltips.Home"), 
        srcRest:    resolveUrl(this.urlPrefix, navImages.home.REST), 
        srcGroup:   resolveUrl(this.urlPrefix, navImages.home.GROUP), 
        srcHover:   resolveUrl(this.urlPrefix, navImages.home.HOVER), 
        srcDown:    resolveUrl(this.urlPrefix, navImages.home.DOWN),
        onRelease:  onHomeHandler 
    });
    var fullPage = new $.Button({ 
        config:     this.config, 
        tooltip:    $.Strings.getString("Tooltips.FullPage"), 
        srcRest:    resolveUrl(this.urlPrefix, navImages.fullpage.REST), 
        srcGroup:   resolveUrl(this.urlPrefix, navImages.fullpage.GROUP), 
        srcHover:   resolveUrl(this.urlPrefix, navImages.fullpage.HOVER), 
        srcDown:    resolveUrl(this.urlPrefix, navImages.fullpage.DOWN),
        onRelease:  onFullPageHandler 
    });

    this._group = new $.ButtonGroup({ 
        config:     this.config, 
        buttons:    [ zoomIn, zoomOut, goHome, fullPage ] 
    });

    this.navControl  = this._group.element;
    this.navControl[ $.SIGNAL ] = true;   // hack to get our controls to fade
    this.addHandler( 'open', $.delegate( this, lightUp ) );

    if ( this.config.showNavigationControl ) {
        this.navControl.style.marginRight = "4px";
        this.navControl.style.marginBottom = "4px";
        this.addControl(this.navControl, $.ControlAnchor.BOTTOM_RIGHT);
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

$.extend($.Viewer.prototype, $.EventHandler.prototype, {

    addControl: function ( elmt, anchor ) {
        var elmt = $.getElement( elmt ),
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
        var _this = this;
        $.DziTileSourceHelper.createFromXml(
            xmlUrl, 
            xmlString,
            function( source ){
               _this.open( source );
            }
        );
    },

    openTileSource: function ( tileSource ) {
        var _this = this;
        window.setTimeout( function () {
            _this.open( tileSource );
        }, 1 );
    },

    open: function( source ) {
        var _this = this;

        if ( this.source ) {
            this.close();
        }

        this._lastOpenStartTime = new Date().getTime();   // to ignore earlier opens

        window.setTimeout( function () {
            if ( _this._lastOpenStartTime > _this._lastOpenEndTime ) {
                _this._setMessage( $.Strings.getString( "Messages.Loading" ) );
            }
        }, 2000);

        this._lastOpenEndTime = new Date().getTime();

        if ( this._lastOpenStartTime < viewer._lastOpenStartTime ) {
            $.Debug.log( "Ignoring out-of-date open." );
            this.raiseEvent( "ignore" );
            return;
        }

        this.canvas.innerHTML = "";
        this._prevContainerSize = $.getElementSize( this.container );

        if( source ){
            this.source = source;
        }
        this.viewport = new $.Viewport( 
            this._prevContainerSize, 
            this.source.dimensions, 
            this.config
        );
        this.drawer = new $.Drawer(
            this.source, 
            this.viewport, 
            this.canvas
        );
        this.profiler = new $.Profiler();

        this._animating = false;
        this._forceRedraw = true;
        scheduleUpdate( this, updateMulti );

        for ( var i = 0; i < this.overlayControls.length; i++ ) {
            var overlay = this.overlayControls[ i ];
            if (overlay.point != null) {
                this.drawer.addOverlay(
                    overlay.id, 
                    new $.Point( 
                        overlay.point.X, 
                        overlay.point.Y 
                    ), 
                    $.OverlayPlacement.TOP_LEFT
                );
            } else {
                this.drawer.addOverlay(
                    overlay.id, 
                    new $.Rect(
                        overlay.rect.Point.X, 
                        overlay.rect.Point.Y, 
                        overlay.rect.Width, 
                        overlay.rect.Height
                    ), 
                    overlay.placement
                );
            }
        }
        this.raiseEvent( "open" );
    },
    close: function () {
        
        this.source = null;
        this.viewport = null;
        this.drawer = null;
        this.profiler = null;

        this.canvas.innerHTML = "";
    },
    removeControl: function ( elmt ) {
        var elmt = $.getElement( elmt ),
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
        return this.innerTracker.isTracking();
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
            this._prevContainerSize = $.getWindowSize();

            // mouse will be inside container now
            $.delegate( this, onContainerEnter )();    

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
            this._prevContainerSize = $.getElementSize( this.element );
            
            // mouse will likely be outside now
            $.delegate( this, onContainerExit )();      

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
            this.raiseEvent( "resize", this );
            updateOnce( this );
        }
    },

    setMouseNavEnabled: function( enabled ){
        this.innerTracker.setTracking( enabled );
    },

    setVisible: function( visible ){
        this.container.style.visibility = visible ? "" : "hidden";
    }

});

///////////////////////////////////////////////////////////////////////////////
// Schedulers provide the general engine for animation
///////////////////////////////////////////////////////////////////////////////

function scheduleUpdate( viewer, updateFunc, prevUpdateTime ){
    var currentTime,
        targetTime,
        deltaTime;

    if (this._animating) {
        return window.setTimeout( function(){
            updateFunc( viewer );
        }, 1 );
    }

    currentTime     = +new Date();
    prevUpdateTime  = prevUpdateTime ? prevUpdateTime : currentTime;
    targetTime      = prevUpdateTime + 1000 / 60;    // 60 fps ideal
    deltaTime       = Math.max(1, targetTime - currentTime);
    
    return window.setTimeout( function(){
        updateFunc( viewer );
    }, deltaTime );
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

        for ( i = viewer.controls.length - 1; i >= 0; i--) {
            viewer.controls[ i ].setOpacity( opacity );
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
// Utility methods
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

function updateMulti( viewer ) {
    if (!viewer.source) {
        return;
    }

    var beginTime = new Date().getTime();

    updateOnce( viewer );
    scheduleUpdate( viewer, arguments.callee, beginTime );
};

function updateOnce( viewer ) {
    if ( !viewer.source ) {
        return;
    }

    //viewer.profiler.beginUpdate();

    var containerSize = $.getElementSize( viewer.container );

    if ( !containerSize.equals( viewer._prevContainerSize ) ) {
        viewer.viewport.resize( containerSize, true ); // maintain image position
        viewer._prevContainerSize = containerSize;
        viewer.raiseEvent( "resize" );
    }

    var animated = viewer.viewport.update();

    if ( !viewer._animating && animated ) {
        viewer.raiseEvent( "animationstart" );
        abortControlsAutoHide( viewer );
    }

    if ( animated ) {
        viewer.drawer.update();
        viewer.raiseEvent( "animation" );
    } else if ( viewer._forceRedraw || viewer.drawer.needsUpdate() ) {
        viewer.drawer.update();
        viewer._forceRedraw = false;
    } 

    if ( viewer._animating && !animated ) {
        viewer.raiseEvent( "animationfinish" );

        if ( !viewer._mouseInside ) {
            beginControlsAutoHide( viewer );
        }
    }

    viewer._animating = animated;

    //viewer.profiler.endUpdate();
};

///////////////////////////////////////////////////////////////////////////////
// Navigation Controls
///////////////////////////////////////////////////////////////////////////////

function resolveUrl( prefix, url ) {
    return prefix ? prefix + url : url;
};


function beginZoomingIn() {
    this._lastZoomTime = +new Date();
    this._zoomFactor = this.config.zoomPerSecond;
    this._zooming = true;
    scheduleZoom( this );
}

function beginZoomingOut() {
    this._lastZoomTime = +new Date();
    this._zoomFactor = 1.0 / this.config.zoomPerSecond;
    this._zooming = true;
    scheduleZoom( this );
}

function endZooming() {
    this._zooming = false;
}

function scheduleZoom( viewer ) {
    window.setTimeout($.delegate(viewer, doZoom), 10);
}

function doZoom() {
    if (this._zooming && this.viewport) {
        var currentTime = +new Date();
        var deltaTime = currentTime - this._lastZoomTime;
        var adjustedFactor = Math.pow(this._zoomFactor, deltaTime / 1000);

        this.viewport.zoomBy(adjustedFactor);
        this.viewport.applyConstraints();
        this._lastZoomTime = currentTime;
        scheduleZoom( this );
    }
};

function doSingleZoomIn() {
    if (this.viewport) {
        this._zooming = false;
        this.viewport.zoomBy( 
            this.config.zoomPerClick / 1.0 
        );
        this.viewport.applyConstraints();
    }
};

function doSingleZoomOut() {
    if (this.viewport) {
        this._zooming = false;
        this.viewport.zoomBy(
            1.0 / this.config.zoomPerClick
        );
        this.viewport.applyConstraints();
    }
};

function lightUp() {
    this._group.emulateEnter();
    this._group.emulateExit();
};

function onHome() {
    if (this.viewport) {
        this.viewport.goHome();
    }
};

function onFullPage() {
    this.setFullPage( !this.isFullPage() );
    this._group.emulateExit();  // correct for no mouseout event on change

    if (this.viewport) {
        this.viewport.applyConstraints();
    }
};

}( OpenSeadragon ));

(function( $ ){
    
//TODO: I guess this is where the i18n needs to be reimplemented.  I'll look 
//      into existing patterns for i18n in javascript but i think that mimicking
//      pythons gettext might be a reasonable approach.

$.Strings = {

    Errors: {
        Failure:    "Sorry, but Seadragon Ajax can't run on your browser!\n" +
                    "Please try using IE 7 or Firefox 3.\n",
        Dzc:        "Sorry, we don't support Deep Zoom Collections!",
        Dzi:        "Hmm, this doesn't appear to be a valid Deep Zoom Image.",
        Xml:        "Hmm, this doesn't appear to be a valid Deep Zoom Image.",
        Empty:      "You asked us to open nothing, so we did just that.",
        ImageFormat: "Sorry, we don't support {0}-based Deep Zoom Images.",
        Security:   "It looks like a security restriction stopped us from " +
                    "loading this Deep Zoom Image.",
        Status:     "This space unintentionally left blank ({0} {1}).",
        Unknown:    "Whoops, something inexplicably went wrong. Sorry!"
    },

    Messages: {
        Loading:    "Loading..."
    },

    Tooltips: {
        FullPage:   "Toggle full page",
        Home:       "Go home",
        ZoomIn:     "Zoom in",
        ZoomOut:    "Zoom out"
    },

    getString: function( prop ) {
        
        var props   = prop.split('.'),
            string  = $.Strings,
            args    = arguments,
            i;

        for ( i = 0; i < props.length; i++ ) {
            string = string[ props[ i ] ] || {};    // in case not a subproperty
        }

        if ( typeof( string ) != "string" ) {
            string = "";
        }

        return string.replace(/\{\d+\}/g, function(capture) {
            var i = parseInt( capture.match( /\d+/ ) ) + 1;
            return i < args.length ? 
                args[ i ] : 
                "";
        });
    },

    setString: function( prop, value ) {

        var props     = prop.split('.'),
            container = $.Strings,
            i;

        for ( i = 0; i < props.length - 1; i++ ) {
            if ( !container[ props[ i ] ] ) {
                container[ props[ i ] ] = {};
            }
            container = container[ props[ i ] ];
        }

        container[ props[ i ] ] = value;
    }

};

}( OpenSeadragon ));

(function( $ ){

$.Point = function(x, y) {
    this.x = typeof (x) == "number" ? x : 0;
    this.y = typeof (y) == "number" ? y : 0;
};

$.Point.prototype = {

    plus: function( point ) {
        return new $.Point(
            this.x + point.x, 
            this.y + point.y
        );
    },

    minus: function( point ) {
        return new $.Point(
            this.x - point.x, 
            this.y - point.y
        );
    },

    times: function( factor ) {
        return new $.Point(
            this.x * factor, 
            this.y * factor
        );
    },

    divide: function( factor ) {
        return new $.Point(
            this.x / factor, 
            this.y / factor
        );
    },

    negate: function() {
        return new $.Point( -this.x, -this.y );
    },

    distanceTo: function( point ) {
        return Math.sqrt(
            Math.pow( this.x - point.x, 2 ) +
            Math.pow( this.y - point.y, 2 )
        );
    },

    apply: function( func ) {
        return new $.Point( func(this.x), func(this.y) );
    },

    equals: function( point ) {
        return  ( point instanceof $.Point ) &&
                ( this.x === point.x ) && 
                ( this.y === point.y );
    },

    toString: function() {
        return "(" + this.x + "," + this.y + ")";
    }
};

}( OpenSeadragon ));

(function( $ ){

$.Profiler = function() {

    this.midUpdate = false;
    this.numUpdates = 0;

    this.lastBeginTime = null;
    this.lastEndTime = null;

    this.minUpdateTime = Infinity;
    this.avgUpdateTime = 0;
    this.maxUpdateTime = 0;

    this.minIdleTime = Infinity;
    this.avgIdleTime = 0;
    this.maxIdleTime = 0;
};

$.Profiler.prototype = {

    beginUpdate: function() {
        if (this.midUpdate) {
            this.endUpdate();
        }

        this.midUpdate = true;
        this.lastBeginTime = new Date().getTime();

        if (this.numUpdates < 1) {
            return;     // this is the first update
        }

        var time = this.lastBeginTime - this.lastEndTime;

        this.avgIdleTime = (this.avgIdleTime * (this.numUpdates - 1) + time) / this.numUpdates;

        if (time < this.minIdleTime) {
            this.minIdleTime = time;
        }
        if (time > this.maxIdleTime) {
            this.maxIdleTime = time;
        }
    },

    endUpdate: function() {
        if (!this.midUpdate) {
            return;
        }

        this.lastEndTime = new Date().getTime();
        this.midUpdate = false;

        var time = this.lastEndTime - this.lastBeginTime;

        this.numUpdates++;
        this.avgUpdateTime = (this.avgUpdateTime * (this.numUpdates - 1) + time) / this.numUpdates;

        if (time < this.minUpdateTime) {
            this.minUpdateTime = time;
        }
        if (time > this.maxUpdateTime) {
            this.maxUpdateTime = time;
        }
    },

    clearProfile: function() {
        this.midUpdate = false;
        this.numUpdates = 0;

        this.lastBeginTime = null;
        this.lastEndTime = null;

        this.minUpdateTime = Infinity;
        this.avgUpdateTime = 0;
        this.maxUpdateTime = 0;

        this.minIdleTime = Infinity;
        this.avgIdleTime = 0;
        this.maxIdleTime = 0;
    }
};

}( OpenSeadragon ));

(function( $ ){

$.TileSource = function(width, height, tileSize, tileOverlap, minLevel, maxLevel) {
    this.aspectRatio = width / height;
    this.dimensions = new $.Point(width, height);
    this.minLevel = minLevel ? minLevel : 0;
    this.maxLevel = maxLevel ? maxLevel :
        Math.ceil( 
            Math.log( Math.max( width, height ) ) / 
            Math.log( 2 ) 
        );
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

    getTileUrl: function( level, x, y ) {
        throw new Error("Method not implemented.");
    },

    tileExists: function( level, x, y ) {
        var numTiles = this.getNumTiles( level );
        return  level >= this.minLevel && 
                level <= this.maxLevel &&
                x >= 0 && 
                y >= 0 && 
                x < numTiles.x && 
                y < numTiles.y;
    }
};

}( OpenSeadragon ));

(function( $ ){
    

$.DziTileSource = function(width, height, tileSize, tileOverlap, tilesUrl, fileFormat, displayRects) {
    $.TileSource.call(this, width, height, tileSize, tileOverlap, null, null);

    this._levelRects = {};
    this.tilesUrl = tilesUrl;

    this.fileFormat = fileFormat;
    this.displayRects = displayRects;
    
    if ( this.displayRects ) {
        for (var i = this.displayRects.length - 1; i >= 0; i--) {
            var rect = this.displayRects[i];
            for (var level = rect.minLevel; level <= rect.maxLevel; level++) {
                if (!this._levelRects[level]) {
                    this._levelRects[level] = [];
                }
                this._levelRects[level].push(rect);
            }
        }
    }

};

$.extend( $.DziTileSource.prototype, $.TileSource.prototype, {

    getTileUrl: function(level, x, y) {
        return [this.tilesUrl, level, '/', x, '_', y, '.', this.fileFormat].join('');
    },

    tileExists: function(level, x, y) {
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
    }
});

$.DziTileSourceHelper = {
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
            throw new Error(error);
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
                    return null;
                } else {
                    throw e;
                }
            }
        }
        if (async) {
            if (xmlString) {
                var handler = $.delegate(this, this.processXml);
                window.setTimeout(function() {
                    var source = finish(handler, $.parseXml(xmlString));
                    callback(source, error);    // call after finish sets error
                }, 1);
            } else {
                var handler = $.delegate(this, this.processResponse);
                $.makeAjaxRequest(xmlUrl, function(xhr) {
                    var source = finish(handler, xhr);
                    callback(source, error);    // call after finish sets error
                });
            }

            return null;
        }

        if (xmlString) {
            return finish($.delegate(this, this.processXml), $.parseXml(xmlString));
        } else {
            return finish($.delegate(this, this.processResponse), $.makeAjaxRequest(xmlUrl));
        }
    },
    processResponse: function(xhr, tilesUrl) {
        if (!xhr) {
            throw new Error($.Strings.getString("Errors.Security"));
        } else if (xhr.status !== 200 && xhr.status !== 0) {
            var status = xhr.status;
            var statusText = (status == 404) ? "Not Found" : xhr.statusText;
            throw new Error($.Strings.getString("Errors.Status", status, statusText));
        }

        var doc = null;

        if (xhr.responseXML && xhr.responseXML.documentElement) {
            doc = xhr.responseXML;
        } else if (xhr.responseText) {
            doc = $.parseXml(xhr.responseText);
        }

        return this.processXml(doc, tilesUrl);
    },

    processXml: function(xmlDoc, tilesUrl) {
        if (!xmlDoc || !xmlDoc.documentElement) {
            throw new Error($.Strings.getString("Errors.Xml"));
        }

        var root = xmlDoc.documentElement;
        var rootName = root.tagName;

        if (rootName == "Image") {
            try {
                return this.processDzi(root, tilesUrl);
            } catch (e) {
                var defMsg = $.Strings.getString("Errors.Dzi");
                throw (e instanceof Error) ? e : new Error(defMsg);
            }
        } else if (rootName == "Collection") {
            throw new Error($.Strings.getString("Errors.Dzc"));
        } else if (rootName == "Error") {
            return this.processError(root);
        }

        throw new Error($.Strings.getString("Errors.Dzi"));
    },

    processDzi: function(imageNode, tilesUrl) {
        var fileFormat = imageNode.getAttribute("Format");

        if (!$.imageFormatSupported(fileFormat)) {
            throw new Error($.Strings.getString("Errors.ImageFormat",
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

        throw new Error(message);
    }
};


}( OpenSeadragon ));

(function( $ ){

$.ButtonState = {
    REST:   0,
    GROUP:  1,
    HOVER:  2,
    DOWN:   3
};

$.Button = function( options ) {

    var _this = this;

    $.EventHandler.call( this );

    this.tooltip   = options.tooltip;
    this.srcRest   = options.srcRest;
    this.srcGroup  = options.srcGroup;
    this.srcHover  = options.srcHover;
    this.srcDown   = options.srcDown;
    //TODO: make button elements accessible by making them a-tags
    //      maybe even consider basing them on the element and adding
    //      methods jquery-style.
    this.element    = options.element || $.makeNeutralElement("span");
    this.config     = options.config;

    if ( options.onPress != undefined ){
        this.addHandler("onPress", options.onPress );
    }
    if ( options.onRelease != undefined ){
        this.addHandler("onRelease", options.onRelease );
    }
    if ( options.onClick != undefined ){
        this.addHandler("onClick", options.onClick );
    }
    if ( options.onEnter != undefined ){
        this.addHandler("onEnter", options.onEnter );
    }
    if ( options.onExit != undefined ){
        this.addHandler("onExit", options.onExit );
    }

    this.currentState = $.ButtonState.GROUP;
    this.tracker = new $.MouseTracker(
        this.element, 
        this.config.clickTimeThreshold, 
        this.config.clickDistThreshold
    );
    this.imgRest    = $.makeTransparentImage( this.srcRest );
    this.imgGroup   = $.makeTransparentImage( this.srcGroup );
    this.imgHover   = $.makeTransparentImage( this.srcHover );
    this.imgDown    = $.makeTransparentImage( this.srcDown );

    this.fadeDelay      = 0;      // begin fading immediately
    this.fadeLength     = 2000;   // fade over a period of 2 seconds
    this.fadeBeginTime  = null;
    this.shouldFade     = false;

    this.element.style.display  = "inline-block";
    this.element.style.position = "relative";
    this.element.title          = this.tooltip;

    this.element.appendChild( this.imgRest );
    this.element.appendChild( this.imgGroup );
    this.element.appendChild( this.imgHover );
    this.element.appendChild( this.imgDown );

    var styleRest   = this.imgRest.style;
    var styleGroup  = this.imgGroup.style;
    var styleHover  = this.imgHover.style;
    var styleDown   = this.imgDown.style;

    styleGroup.position = 
        styleHover.position = 
        styleDown.position = 
            "absolute";

    styleGroup.top = 
        styleHover.top = 
        styleDown.top = 
            "0px";

    styleGroup.left = 
        styleHover.left = 
        styleDown.left = 
            "0px";

    styleHover.visibility = 
        styleDown.visibility = 
            "hidden";

    if ( $.Browser.vendor == $.BROWSERS.FIREFOX 
         && $.Browser.version < 3 ){

        styleGroup.top = 
            styleHover.top = 
            styleDown.top = "";
    }

    //TODO - refactor mousetracer next to avoid this extension
    $.extend( this.tracker, {
        enterHandler: function(tracker, position, buttonDownElmt, buttonDownAny) {
            if ( buttonDownElmt ) {
                inTo( _this, $.ButtonState.DOWN );
                _this.raiseEvent( "onEnter", _this );
            } else if ( !buttonDownAny ) {
                inTo( _this, $.ButtonState.HOVER );
            }
        },
        exitHandler: function(tracker, position, buttonDownElmt, buttonDownAny) {
            outTo( _this, $.ButtonState.GROUP );
            if ( buttonDownElmt ) {
                _this.raiseEvent( "onExit", _this );
            }
        },
        pressHandler: function(tracker, position) {
            inTo( _this, $.ButtonState.DOWN );
            _this.raiseEvent( "onPress", _this );
        },
        releaseHandler: function(tracker, position, insideElmtPress, insideElmtRelease) {
            if ( insideElmtPress && insideElmtRelease ) {
                outTo( _this, $.ButtonState.HOVER );
                _this.raiseEvent( "onRelease", _this );
            } else if ( insideElmtPress ) {
                outTo( _this, $.ButtonState.GROUP );
            } else {
                inTo( _this, $.ButtonState.HOVER );
            }
        },
        clickHandler: function(tracker, position, quick, shift) {
            if ( quick ) {
                _this.raiseEvent("onClick", _this);
            }
        }
    });

    this.tracker.setTracking( true );
    outTo( this, $.ButtonState.REST );
};

$.extend( $.Button.prototype, $.EventHandler.prototype, {
    notifyGroupEnter: function() {
        inTo( this, $.ButtonState.GROUP );
    },
    notifyGroupExit: function() {
        outTo( this, $.ButtonState.REST );
    }
});


function scheduleFade( button ) {
    window.setTimeout(function(){
        updateFade( button );
    }, 20 );
};

function updateFade( button ) {
    var currentTime,
        deltaTime,
        opacity;

    if ( button.shouldFade ) {
        currentTime = +new Date();
        deltaTime   = currentTime - this.fadeBeginTime;
        opacity     = 1.0 - deltaTime / this.fadeLength;
        opacity     = Math.min( 1.0, opacity );
        opacity     = Math.max( 0.0, opacity );

        $.setElementOpacity( button.imgGroup, opacity, true );
        if ( opacity > 0 ) {
            // fade again
            scheduleFade( button );
        }
    }
};

function beginFading( button ) {
    button.shouldFade = true;
    button.fadeBeginTime = new Date().getTime() + button.fadeDelay;
    window.setTimeout(function(){ 
        scheduleFade( button );
    }, button.fadeDelay );
};

function stopFading( button ) {
    button.shouldFade = false;
    $.setElementOpacity( button.imgGroup, 1.0, true );
};

function inTo( button, newState ) {
    if ( newState >= $.ButtonState.GROUP && button.currentState == $.ButtonState.REST ) {
        stopFading( button );
        button.currentState = $.ButtonState.GROUP;
    }

    if ( newState >= $.ButtonState.HOVER && button.currentState == $.ButtonState.GROUP ) {
        button.imgHover.style.visibility = "";
        button.currentState = $.ButtonState.HOVER;
    }

    if ( newState >= $.ButtonState.DOWN && button.currentState == $.ButtonState.HOVER ) {
        button.imgDown.style.visibility = "";
        button.currentState = $.ButtonState.DOWN;
    }
};


function outTo( button, newState ) {
    if ( newState <= $.ButtonState.HOVER && button.currentState == $.ButtonState.DOWN ) {
        button.imgDown.style.visibility = "hidden";
        button.currentState = $.ButtonState.HOVER;
    }

    if ( newState <= $.ButtonState.GROUP && button.currentState == $.ButtonState.HOVER ) {
        button.imgHover.style.visibility = "hidden";
        button.currentState = $.ButtonState.GROUP;
    }

    if ( button.newState <= $.ButtonState.REST && button.currentState == $.ButtonState.GROUP ) {
        button.beginFading();
        button.currentState = $.ButtonState.REST;
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
    this.element = options.group || $.makeNeutralElement("span");
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
        this.element.appendChild( buttons[ i ].element );
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
    
$.Rect = function( x, y, width, height ) {
    this.x = typeof ( x ) == "number" ? x : 0;
    this.y = typeof ( y ) == "number" ? y : 0;
    this.width  = typeof ( width )  == "number" ? width : 0;
    this.height = typeof ( height ) == "number" ? height : 0;
};

$.Rect.prototype = {
    getAspectRatio: function() {
        return this.width / this.height;
    },

    getTopLeft: function() {
        return new $.Point( this.x, this.y );
    },

    getBottomRight: function() {
        return new $.Point(
            this.x + this.width, 
            this.y + this.height
        );
    },

    getCenter: function() {
        return new $.Point(
            this.x + this.width / 2.0,
            this.y + this.height / 2.0
        );
    },

    getSize: function() {
        return new $.Point( this.width, this.height );
    },

    equals: function( other ) {
        return 
            ( other instanceof $.Rect ) &&
            ( this.x === other.x ) && 
            ( this.y === other.y ) &&
            ( this.width === other.width ) && 
            ( this.height === other.height );
    },

    toString: function() {
        return "[" + 
            this.x + "," + 
            this.y + "," + 
            this.width + "x" +
            this.height + 
        "]";
    }
};

}( OpenSeadragon ));

(function( $ ){

$.DisplayRect = function( x, y, width, height, minLevel, maxLevel ) {
    $.Rect.apply( this, [ x, y, width, height ] );

    this.minLevel = minLevel;
    this.maxLevel = maxLevel;
}
$.DisplayRect.prototype = new $.Rect();
$.DisplayRect.prototype.constructor = $.DisplayRect;

}( OpenSeadragon ));

(function( $ ){
    
$.Spring = function( options ) {
    var args = arguments;

    if( typeof( options ) != 'object' ){
        //allows backward compatible use of ( initialValue, config ) as 
        //constructor parameters
        options = {
            initial: args.length && typeof ( args[ 0 ] ) == "number" ? 
                args[ 0 ] : 
                0,
            springStiffness: args.length > 1 ? 
                args[ 1 ].springStiffness : 
                5.0,
            animationTime: args.length > 1 ? 
                args[ 1 ].animationTime : 
                1.5,
        };
    }

    $.extend( true, this, options);


    this.current = {
        value: typeof ( this.initial ) == "number" ? 
            this.initial : 
            0,
        time:  new Date().getTime() // always work in milliseconds
    };

    this.start = {
        value: this.current.value,
        time:  this.current.time
    };

    this.target = {
        value: this.current.value,
        time:  this.current.time
    };
};

$.Spring.prototype = {

    resetTo: function( target ) {
        this.target.value = target;
        this.target.time  = this.current.time;
        this.start.value  = this.target.value;
        this.start.time   = this.target.time;
    },

    springTo: function( target ) {
        this.start.value  = this.current.value;
        this.start.time   = this.current.time;
        this.target.value = target;
        this.target.time  = this.start.time + 1000 * this.animationTime;
    },

    shiftBy: function( delta ) {
        this.start.value  += delta;
        this.target.value += delta;
    },

    update: function() {
        this.current.time  = new Date().getTime();
        this.current.value = (this.current.time >= this.target.time) ? 
            this.target.value :
            this.start.value + 
                ( this.target.value - this.start.value ) *
                transform( 
                    this.springStiffness, 
                    ( this.current.time - this.start.time ) / 
                    ( this.target.time  - this.start.time )
                );
    }
}


function transform( stiffness, x ) {
    return ( 1.0 - Math.exp( stiffness * -x ) ) / 
        ( 1.0 - Math.exp( -stiffness ) );
};

}( OpenSeadragon ));

(function( $ ){
    
$.Tile = function(level, x, y, bounds, exists, url) {
    this.level   = level;
    this.x       = x;
    this.y       = y;
    this.bounds  = bounds;  // where this tile fits, in normalized coordinates
    this.exists  = exists;  // part of sparse image? tile hasn't failed to load?
    this.loaded  = false;   // is this tile loaded?
    this.loading = false;   // or is this tile loading?

    this.elmt    = null;    // the HTML element for this tile
    this.image   = null;    // the Image object for this tile
    this.url     = url;     // the URL of this tile's image

    this.style      = null; // alias of this.elmt.style
    this.position   = null; // this tile's position on screen, in pixels
    this.size       = null; // this tile's size on screen, in pixels
    this.blendStart = null; // the start time of this tile's blending
    this.opacity    = null; // the current opacity this tile should be
    this.distance   = null; // the distance of this tile to the viewport center
    this.visibility = null; // the visibility score of this tile

    this.beingDrawn     = false; // whether this tile is currently being drawn
    this.lastTouchTime  = 0;     // the time that tile was last touched
};

$.Tile.prototype = {
    
    toString: function() {
        return this.level + "/" + this.x + "_" + this.y;
    },

    drawHTML: function( container ) {

        if ( !this.loaded ) {
            $.Debug.error(
                "Attempting to draw tile " + 
                this.toString() +
                " when it's not yet loaded."
            );
            return;
        }

        if ( !this.elmt ) {
            this.elmt       = $.makeNeutralElement("img");
            this.elmt.src   = this.url;
            this.style      = this.elmt.style;

            this.style.position            = "absolute";
            this.style.msInterpolationMode = "nearest-neighbor";
        }

        var position = this.position.apply( Math.floor );
        var size     = this.size.apply( Math.ceil );


        if ( this.elmt.parentNode != container ) {
            container.appendChild( this.elmt );
        }

        this.elmt.style.left    = position.x + "px";
        this.elmt.style.top     = position.y + "px";
        this.elmt.style.width   = size.x + "px";
        this.elmt.style.height  = size.y + "px";

        $.setElementOpacity( this.elmt, this.opacity );

    },

    drawCanvas: function(context) {
        if (!this.loaded) {
            $.Debug.error(
                "Attempting to draw tile " + 
                this.toString() +
                " when it's not yet loaded."
            );
            return;
        }

        var position = this.position,
            size     = this.size;

        context.globalAlpha = this.opacity;
        context.drawImage(this.image, position.x, position.y, size.x, size.y);
    },

    unload: function() {
        if ( this.elmt && this.elmt.parentNode ) {
            this.elmt.parentNode.removeChild( this.elmt );
        }

        this.elmt    = null;
        this.image   = null;
        this.loaded  = false;
        this.loading = false;
    }
};

}( OpenSeadragon ));

(function( $ ){

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

    $.Overlay = function(elmt, location, placement) {
        this.elmt       = elmt;
        this.scales     = location instanceof $.Rect;
        this.bounds     = new $.Rect(
            location.x, 
            location.y,
            location.width, 
            location.height)
        ;
        this.position   = new $.Point(
            location.x, 
            location.y
        );
        this.size       = new $.Point(
            location.width, 
            location.height
        );
        this.style      = elmt.style;
        // rects are always top-left
        this.placement  = location instanceof $.Point ? 
            placement : 
            $.OverlayPlacement.TOP_LEFT;    
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
        drawHTML: function( container ) {
            var elmt    = this.elmt,
                style   = this.style,
                scales  = this.scales,
                position,
                size;

            if ( elmt.parentNode != container ) {
                container.appendChild( elmt );
            }

            if ( !scales ) {
                this.size = $.getElementSize( elmt );
            }

            position = this.position;
            size     = this.size;

            this.adjust( position, size );

            position = position.apply( Math.floor );
            size     = size.apply( Math.ceil );

            style.left     = position.x + "px";
            style.top      = position.y + "px";
            style.position = "absolute";

            if ( scales ) {
                style.width  = size.x + "px";
                style.height = size.y + "px";
            }
        },
        update: function( loc, placement ) {
            this.scales     = ( loc instanceof $.Rect );
            this.bounds     = new $.Rect(loc.x, loc.y, loc.width, loc.height);
            // rects are always top-left
            this.placement  = loc instanceof $.Point ?
                    placement : 
                    $.OverlayPlacement.TOP_LEFT;    
        }

    };

}( OpenSeadragon ));

(function( $ ){
    
var // the max number of images we should keep in memory
    QUOTA               = 100,
    // the most shrunk a tile should be
    MIN_PIXEL_RATIO     = 0.5,
    //TODO: make TIMEOUT configurable
    TIMEOUT             = 5000,

    BROWSER             = $.Browser.vendor,
    BROWSER_VERSION     = $.Browser.version,

    SUBPIXEL_RENDERING = (
        ( BROWSER == $.BROWSERS.FIREFOX ) ||
        ( BROWSER == $.BROWSERS.OPERA )   ||
        ( BROWSER == $.BROWSERS.SAFARI && BROWSER_VERSION >= 4 ) ||
        ( BROWSER == $.BROWSERS.CHROME && BROWSER_VERSION >= 2 )
    ),

    USE_CANVAS =
        $.isFunction( document.createElement("canvas").getContext ) &&
        SUBPIXEL_RENDERING;

$.Drawer = function(source, viewport, elmt) {

    this.container  = $.getElement( elmt );
    this.canvas     = $.makeNeutralElement( USE_CANVAS ? "canvas" : "div" );
    this.context    = USE_CANVAS ? this.canvas.getContext("2d") : null;
    this.viewport   = viewport;
    this.source     = source;
    this.config     = this.viewport.config;

    this.downloading        = 0;
    this.imageLoaderLimit   = this.config.imageLoaderLimit;

    this.profiler    = new $.Profiler();

    this.minLevel    = source.minLevel;
    this.maxLevel    = source.maxLevel;
    this.tileSize    = source.tileSize;
    this.tileOverlap = source.tileOverlap;
    this.normHeight  = source.dimensions.y / source.dimensions.x;
    
    // 1d dictionary [level] --> Point
    this.cacheNumTiles      = {};
    // 1d dictionary [level] --> Point
    this.cachePixelRatios   = {};
    // 3d dictionary [level][x][y] --> Tile
    this.tilesMatrix        = {};
    // unordered list of Tiles with loaded images
    this.tilesLoaded        = [];
    // 3d dictionary [level][x][y] --> Boolean
    this.coverage           = {};
    
    // unordered list of Overlays added
    this.overlays           = [];
    // unordered list of Tiles drawn last frame
    this.lastDrawn          = [];
    this.lastResetTime      = 0;
    this.midUpdate          = false;
    this.updateAgain        = true;

    this.elmt = this.container;
    
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.position = "absolute";

    // explicit left-align
    this.container.style.textAlign = "left";
    this.container.appendChild(this.canvas);
};

$.Drawer.prototype = {

    getPixelRatio: function(level) {
        if (!this.cachePixelRatios[level]) {
            this.cachePixelRatios[level] = this.source.getPixelRatio(level);
        }

        return this.cachePixelRatios[level];
    },


    _getTile: function(level, x, y, time, numTilesX, numTilesY) {
        if (!this.tilesMatrix[level]) {
            this.tilesMatrix[level] = {};
        }
        if (!this.tilesMatrix[level][x]) {
            this.tilesMatrix[level][x] = {};
        }

        if (!this.tilesMatrix[level][x][y]) {
            var xMod = (numTilesX + (x % numTilesX)) % numTilesX;
            var yMod = (numTilesY + (y % numTilesY)) % numTilesY;
            var bounds = this.source.getTileBounds(level, xMod, yMod);
            var exists = this.source.tileExists(level, xMod, yMod);
            var url = this.source.getTileUrl(level, xMod, yMod);

            bounds.x += 1.0 * (x - xMod) / numTilesX;
            bounds.y += this.normHeight * (y - yMod) / numTilesY;

            this.tilesMatrix[level][x][y] = new $.Tile(level, x, y, bounds, exists, url);
        }

        var tile = this.tilesMatrix[level][x][y];

        tile.lastTouchTime = time;

        return tile;
    },

    _loadTile: function(tile, time) {
        tile.loading = this.loadImage(
            tile.url,
            $.createCallback(
                null, 
                $.delegate(this, this._onTileLoad), 
                tile, 
                time
            )
        );
    },

    _onTileLoad: function(tile, time, image) {
        tile.loading = false;

        if (this.midUpdate) {
            $.Debug.error("Tile load callback in middle of drawing routine.");
            return;
        } else if (!image) {
            $.Debug.log("Tile " + tile + " failed to load: " + tile.url);
            tile.exists = false;
            return;
        } else if (time < this.lastResetTime) {
            $.Debug.log("Ignoring tile " + tile + " loaded before reset: " + tile.url);
            return;
        }

        tile.loaded = true;
        tile.image = image;

        var insertionIndex = this.tilesLoaded.length;

        if (this.tilesLoaded.length >= QUOTA) {
            var cutoff = Math.ceil(Math.log(this.tileSize) / Math.log(2));

            var worstTile = null;
            var worstTileIndex = -1;

            for (var i = this.tilesLoaded.length - 1; i >= 0; i--) {
                var prevTile = this.tilesLoaded[i];

                if (prevTile.level <= this.cutoff || prevTile.beingDrawn) {
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

        this.tilesLoaded[insertionIndex] = tile;
        this.updateAgain = true;
    },

    _clearTiles: function() {
        this.tilesMatrix = {};
        this.tilesLoaded = [];
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
        if (!this.coverage[level]) {
            return false;
        }

        if (x === undefined || y === undefined) {
            var rows = this.coverage[level];
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

        return (this.coverage[level][x] === undefined ||
                    this.coverage[level][x][y] === undefined ||
                    this.coverage[level][x][y] === true);
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
        if (!this.coverage[level]) {
            $.Debug.error("Setting coverage for a tile before its " +
                        "level's coverage has been reset: " + level);
            return;
        }

        if (!this.coverage[level][x]) {
            this.coverage[level][x] = {};
        }

        this.coverage[level][x][y] = covers;
    },

    /**
    * Resets coverage information for the given level. This should be called
    * after every draw routine. Note that at the beginning of the next draw
    * routine, coverage for every visible tile should be explicitly set. 
    */
    _resetCoverage: function(level) {
        this.coverage[level] = {};
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
        for (var i = this.overlays.length - 1; i >= 0; i--) {
            if (this.overlays[i].elmt == elmt) {
                return i;
            }
        }

        return -1;
    },


    _updateActual: function() {
        this.updateAgain = false;

        var _canvas = this.canvas;
        var _context = this.context;
        var _container = this.container;
        var _lastDrawn = this.lastDrawn;

        while (_lastDrawn.length > 0) {
            var tile = _lastDrawn.pop();
            tile.beingDrawn = false;
        }

        var viewportSize = this.viewport.getContainerSize();
        var viewportWidth = viewportSize.x;
        var viewportHeight = viewportSize.y;

        _canvas.innerHTML = "";
        if ( USE_CANVAS ) {
            _canvas.width = viewportWidth;
            _canvas.height = viewportHeight;
            _context.clearRect(0, 0, viewportWidth, viewportHeight);
        }

        var viewportBounds = this.viewport.getBounds(true);
        var viewportTL = viewportBounds.getTopLeft();
        var viewportBR = viewportBounds.getBottomRight();
        if (!this.config.wrapHorizontal &&
                    (viewportBR.x < 0 || viewportTL.x > 1)) {
            return;
        } else if (!this.config.wrapVertical &&
                    (viewportBR.y < 0 || viewportTL.y > this.normHeight)) {
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
            viewportBR.y = _min(viewportBR.y, this.normHeight);
        }

        var best = null;
        var haveDrawn = false;
        var currentTime = new Date().getTime();

        var viewportCenter = this.viewport.pixelFromPoint(this.viewport.getCenter());
        var zeroRatioT = this.viewport.deltaPixelsFromPoints(this.source.getPixelRatio(0), false).x;
        var optimalPixelRatio = immediateRender ? 1 : zeroRatioT;

        var lowestLevel = _max(this.minLevel, _floor(_log(this.config.minZoomImageRatio) / _log(2)));
        var zeroRatioC = this.viewport.deltaPixelsFromPoints(this.source.getPixelRatio(0), true).x;
        var highestLevel = _min(this.maxLevel,
                    _floor(_log(zeroRatioC / MIN_PIXEL_RATIO) / _log(2)));

        lowestLevel = _min(lowestLevel, highestLevel);

        for (var level = highestLevel; level >= lowestLevel; level--) {
            var drawLevel = false;
            var renderPixelRatioC = this.viewport.deltaPixelsFromPoints(
                        this.source.getPixelRatio(level), true).x;     // note the .x!

            if ((!haveDrawn && renderPixelRatioC >= MIN_PIXEL_RATIO) ||
                        level == lowestLevel) {
                drawLevel = true;
                haveDrawn = true;
            } else if (!haveDrawn) {
                continue;
            }

            this._resetCoverage(level);

            var levelOpacity = _min(1, (renderPixelRatioC - 0.5) / 0.5);
            var renderPixelRatioT = this.viewport.deltaPixelsFromPoints(
                        this.source.getPixelRatio(level), false).x;
            var levelVisibility = optimalPixelRatio /
                        _abs(optimalPixelRatio - renderPixelRatioT);

            var tileTL = this.source.getTileAtPoint(level, viewportTL);
            var tileBR = this.source.getTileAtPoint(level, viewportBR);
            var numTiles = numberOfTiles( this, level );
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
                    var positionC = this.viewport.pixelFromPoint(boundsTL, true);
                    var sizeC = this.viewport.deltaPixelsFromPoints(boundsSize, true);

                    if (!this.tileOverlap) {
                        sizeC = sizeC.plus(new $.Point(1, 1));
                    }

                    var positionT = this.viewport.pixelFromPoint(boundsTL, false);
                    var sizeT = this.viewport.deltaPixelsFromPoints(boundsSize, false);
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

            if ( USE_CANVAS ) {
                tile.drawCanvas(_context);
            } else {
                tile.drawHTML(_canvas);
            }

            tile.beingDrawn = true;
        }

        var numOverlays = this.overlays.length;
        for (var i = 0; i < numOverlays; i++) {
            var overlay = this.overlays[i];
            var bounds = overlay.bounds;

            overlay.position = this.viewport.pixelFromPoint(bounds.getTopLeft(), true);
            overlay.size = this.viewport.deltaPixelsFromPoints(bounds.getSize(), true);
            overlay.drawHTML(_container);
        }

        if (best) {
            this._loadTile(best, currentTime);
            this.updateAgain = true; // because we haven't finished drawing, so
        }
    },


    addOverlay: function(elmt, loc, placement) {
        var elmt = $.getElement(elmt);

        if (this._getOverlayIndex(elmt) >= 0) {
            return;     // they're trying to add a duplicate overlay
        }

        this.overlays.push(new $.Overlay(elmt, loc, placement));
        this.updateAgain = true;
    },

    updateOverlay: function(elmt, loc, placement) {
        var elmt = $.getElement(elmt);
        var i = this._getOverlayIndex(elmt);

        if (i >= 0) {
            this.overlays[i].update(loc, placement);
            this.updateAgain = true;
        }
    },

    removeOverlay: function(elmt) {
        var elmt = $.getElement(elmt);
        var i = this._getOverlayIndex(elmt);

        if (i >= 0) {
            this.overlays[i].destroy();
            this.overlays.splice(i, 1);
            this.updateAgain = true;
        }
    },

    clearOverlays: function() {
        while (this.overlays.length > 0) {
            this.overlays.pop().destroy();
            this.updateAgain = true;
        }
    },


    needsUpdate: function() {
        return this.updateAgain;
    },

    numTilesLoaded: function() {
        return this.tilesLoaded.length;
    },

    reset: function() {
        this._clearTiles();
        this.lastResetTime = new Date().getTime();
        this.updateAgain = true;
    },

    update: function() {
        //this.profiler.beginUpdate();
        this.midUpdate = true;
        this._updateActual();
        this.midUpdate = false;
        //this.profiler.endUpdate();
    },

    loadImage: function(src, callback) {
        var _this = this,
            loading = false,
            image,
            jobid,
            complete;

        if ( !this.imageLoaderLimit || this.downloading < this.imageLoaderLimit ) {
            
            this.downloading++;

            image = new Image();

            complete = function( imagesrc ){
                _this.downloading--;
                if (typeof ( callback ) == "function") {
                    try {
                        callback( image );
                    } catch ( e ) {
                        $.Debug.error(
                            e.name + " while executing " + src +" callback: " + e.message, 
                            e
                        );
                    }
                }
            };

            image.onload = function(){
                finishLoadingImage( image, complete, true );
            };

            image.onabort = image.onerror = function(){
                finishLoadingImage( image, complete, false );
            };

            jobid = window.setTimeout( function(){
                finishLoadingImage( image, complete, false, jobid );
            }, TIMEOUT );

            loading   = true;
            image.src = src;
        }

        return loading;
    }
};

function finishLoadingImage( image, callback, successful, jobid ){

    image.onload = null;
    image.onabort = null;
    image.onerror = null;

    if ( jobid ) {
        window.clearTimeout( jobid );
    }
    window.setTimeout( function() {
        callback( image.src, successful ? image : null);
    }, 1 );

};

function numberOfTiles( drawer, level ){
    
    if ( !drawer.cacheNumTiles[ level ] ) {
        drawer.cacheNumTiles[ level ] = drawer.source.getNumTiles( level );
    }

    return drawer.cacheNumTiles[ level ];
};

}( OpenSeadragon ));

(function( $ ){
    
$.Viewport = function(containerSize, contentSize, config) {
    //TODO: this.config is something that should go away but currently the 
    //      Drawer references the viewport.config
    this.config = config;
    this.zoomPoint = null;
    this.containerSize = containerSize;
    this.contentSize   = contentSize;
    this.contentAspect = contentSize.x / contentSize.y;
    this.contentHeight = contentSize.y / contentSize.x;
    this.centerSpringX = new $.Spring({
        initial: 0, 
        springStiffness: config.springStiffness,
        animationTime:   config.animationTime
    });
    this.centerSpringY = new $.Spring({
        initial: 0, 
        springStiffness: config.springStiffness,
        animationTime:   config.animationTime
    });
    this.zoomSpring = new $.Spring({
        initial: 1, 
        springStiffness: config.springStiffness,
        animationTime:   config.animationTime
    });
    this.minZoomImageRatio = config.minZoomImageRatio;
    this.maxZoomPixelRatio = config.maxZoomPixelRatio;
    this.visibilityRatio   = config.visibilityRatio;
    this.wrapHorizontal    = config.wrapHorizontal;
    this.wrapVertical      = config.wrapVertical;
    this.homeBounds = new $.Rect( 0, 0, 1, this.contentHeight );
    this.goHome( true );
    this.update();
};

$.Viewport.prototype = {
    getHomeZoom: function() {
        var aspectFactor = this.contentAspect / this.getAspectRatio();
        return (aspectFactor >= 1) ? 1 : aspectFactor;
    },

    getMinZoom: function() {
        var homeZoom = this.getHomeZoom()
            zoom = this.minZoomImageRatio * homeZoom;

        return Math.min(zoom, homeZoom);
    },

    getMaxZoom: function() {
        var zoom = 
            this.contentSize.x * 
            this.maxZoomPixelRatio / 
            this.containerSize.x;
        return Math.max(zoom, this.getHomeZoom());
    },

    getAspectRatio: function() {
        return this.containerSize.x / this.containerSize.y;
    },

    getContainerSize: function() {
        return new $.Point(this.containerSize.x, this.containerSize.y);
    },

    getBounds: function( current ) {
        var center = this.getCenter(current),
            width  = 1.0 / this.getZoom(current),
            height = width / this.getAspectRatio();

        return new $.Rect(
            center.x - width / 2.0, 
            center.y - height / 2.0,
            width, 
            height
        );
    },

    getCenter: function( current ) {
        var centerCurrent = new $.Point(
                this.centerSpringX.current.value,
                this.centerSpringY.current.value
            ),
            centerTarget = new $.Point(
                this.centerSpringX.target.value,
                this.centerSpringY.target.value
            ),
            oldZoomPixel,
            zoom,
            width,
            height,
            bounds,
            newZoomPixel,
            deltaZoomPixels,
            deltaZoomPoints;

        if (current) {
            return centerCurrent;
        } else if (!this.zoomPoint) {
            return centerTarget;
        }

        oldZoomPixel = this.pixelFromPoint(this.zoomPoint, true);

        zoom    = this.getZoom();
        width   = 1.0 / zoom;
        height  = width / this.getAspectRatio();
        bounds  = new $.Rect(
            centerCurrent.x - width / 2.0,
            centerCurrent.y - height / 2.0, 
            width, 
            height
        );

        newZoomPixel    = this.zoomPoint.minus(
            bounds.getTopLeft()
        ).times(
            this.containerSize.x / bounds.width
        );
        deltaZoomPixels = newZoomPixel.minus( oldZoomPixel );
        deltaZoomPoints = deltaZoomPixels.divide( this.containerSize.x * zoom );

        return centerTarget.plus( deltaZoomPoints );
    },

    getZoom: function( current ) {
        if ( current ) {
            return this.zoomSpring.current.value;
        } else {
            return this.zoomSpring.target.value;
        }
    },


    applyConstraints: function( immediately ) {
        var actualZoom = this.getZoom(),
            constrainedZoom = Math.max(
                Math.min( actualZoom, this.getMaxZoom() ), 
                this.getMinZoom()
            ),
            bounds,
            horizontalThreshold,
            verticalThreshold,
            left,
            right,
            top,
            bottom,
            dx = 0,
            dy = 0;

        if ( actualZoom != constrainedZoom ) {
            this.zoomTo( constrainedZoom, this.zoomPoint, immediately );
        }

        bounds = this.getBounds();

        horizontalThreshold = this.visibilityRatio * bounds.width;
        verticalThreshold   = this.visibilityRatio * bounds.height;

        left   = bounds.x + bounds.width;
        right  = 1 - bounds.x;
        top    = bounds.y + bounds.height;
        bottom = this.contentHeight - bounds.y;

        if ( this.wrapHorizontal ) {
            //do nothing
        } else if ( left < horizontalThreshold ) {
            dx = horizontalThreshold - left;
        } else if ( right < horizontalThreshold ) {
            dx = right - horizontalThreshold;
        }

        if ( this.wrapVertical ) {
            //do nothing
        } else if ( top < verticalThreshold ) {
            dy = verticalThreshold - top;
        } else if ( bottom < verticalThreshold ) {
            dy = bottom - verticalThreshold;
        }

        if ( dx || dy ) {
            bounds.x += dx;
            bounds.y += dy;
            this.fitBounds( bounds, immediately );
        }
    },

    ensureVisible: function( immediately ) {
        this.applyConstraints( immediately );
    },

    fitBounds: function( bounds, immediately ) {
        var aspect = this.getAspectRatio(),
            center = bounds.getCenter(),
            newBounds = new $.Rect(
                bounds.x, 
                bounds.y, 
                bounds.width, 
                bounds.height
            ),
            oldBounds,
            oldZoom,
            newZoom,
            referencePoint;

        if (newBounds.getAspectRatio() >= aspect) {
            newBounds.height = bounds.width / aspect;
            newBounds.y      = center.y - newBounds.height / 2;
        } else {
            newBounds.width = bounds.height * aspect;
            newBounds.x     = center.x - newBounds.width / 2;
        }

        this.panTo(this.getCenter(true), true);
        this.zoomTo(this.getZoom(true), null, true);

        oldBounds = this.getBounds();
        oldZoom   = this.getZoom();
        newZoom   = 1.0 / newBounds.width;
        if (newZoom == oldZoom || newBounds.width == oldBounds.width) {
            this.panTo( center, immediately );
            return;
        }

        referencePoint = oldBounds.getTopLeft().times( 
            this.containerSize.x / oldBounds.width 
        ).minus(
            newBounds.getTopLeft().times( 
                this.containerSize.x / newBounds.width 
            )
        ).divide(
            this.containerSize.x / oldBounds.width - 
            this.containerSize.x / newBounds.width
        );


        this.zoomTo( newZoom, referencePoint, immediately );
    },

    goHome: function(immediately) {
        var center = this.getCenter();

        if ( this.wrapHorizontal ) {
            center.x = (1 + (center.x % 1)) % 1;
            this.centerSpringX.resetTo(center.x);
            this.centerSpringX.update();
        }

        if ( this.wrapVertical ) {
            center.y = (this.contentHeight + (center.y % this.contentHeight)) % this.contentHeight;
            this.centerSpringY.resetTo(center.y);
            this.centerSpringY.update();
        }

        this.fitBounds(this.homeBounds, immediately);
    },

    panBy: function(delta, immediately) {
        var center = new $.Point(
            this.centerSpringX.target.value,
            this.centerSpringY.target.value
        );
        this.panTo( center.plus( delta ), immediately );
    },

    panTo: function(center, immediately) {
        if (immediately) {
            this.centerSpringX.resetTo(center.x);
            this.centerSpringY.resetTo(center.y);
        } else {
            this.centerSpringX.springTo(center.x);
            this.centerSpringY.springTo(center.y);
        }
    },

    zoomBy: function(factor, refPoint, immediately) {
        this.zoomTo(this.zoomSpring.target.value * factor, refPoint, immediately);
    },

    zoomTo: function(zoom, refPoint, immediately) {

        if (immediately) {
            this.zoomSpring.resetTo(zoom);
        } else {        
            this.zoomSpring.springTo(zoom);
        }

        this.zoomPoint = refPoint instanceof $.Point ? refPoint : null;
    },

    resize: function(newContainerSize, maintain) {
        var oldBounds = this.getBounds(),
            newBounds = oldBounds,
            widthDeltaFactor = newContainerSize.x / this.containerSize.x;

        this.containerSize = new $.Point(newContainerSize.x, newContainerSize.y);

        if (maintain) {
            newBounds.width  = oldBounds.width * widthDeltaFactor;
            newBounds.height = newBounds.width / this.getAspectRatio();
        }

        this.fitBounds(newBounds, true);
    },

    update: function() {
        var oldCenterX = this.centerSpringX.current.value,
            oldCenterY = this.centerSpringY.current.value,
            oldZoom    = this.zoomSpring.current.value,
            oldZoomPixel,
            newZoomPixel,
            deltaZoomPixels,
            deltaZoomPoints;

        if (this.zoomPoint) {
            oldZoomPixel = this.pixelFromPoint(this.zoomPoint, true);
        }

        this.zoomSpring.update();

        if (this.zoomPoint && this.zoomSpring.current.value != oldZoom) {
            newZoomPixel    = this.pixelFromPoint( this.zoomPoint, true );
            deltaZoomPixels = newZoomPixel.minus( oldZoomPixel);
            deltaZoomPoints = this.deltaPointsFromPixels( deltaZoomPixels, true );

            this.centerSpringX.shiftBy( deltaZoomPoints.x );
            this.centerSpringY.shiftBy( deltaZoomPoints.y );
        } else {
            this.zoomPoint = null;
        }

        this.centerSpringX.update();
        this.centerSpringY.update();

        return this.centerSpringX.current.value != oldCenterX ||
            this.centerSpringY.current.value != oldCenterY ||
            this.zoomSpring.current.value != oldZoom;
    },


    deltaPixelsFromPoints: function(deltaPoints, current) {
        return deltaPoints.times(
            this.containerSize.x * this.getZoom( current )
        );
    },

    deltaPointsFromPixels: function(deltaPixels, current) {
        return deltaPixels.divide(
            this.containerSize.x * this.getZoom( current )
        );
    },

    pixelFromPoint: function(point, current) {
        var bounds = this.getBounds( current );
        return point.minus(
            bounds.getTopLeft()
        ).times(
            this.containerSize.x / bounds.width
        );
    },

    pointFromPixel: function(pixel, current) {
        var bounds = this.getBounds( current );
        return pixel.divide(
            this.containerSize.x / bounds.width
        ).plus(
            bounds.getTopLeft()
        );
    }
};

}( OpenSeadragon ));
