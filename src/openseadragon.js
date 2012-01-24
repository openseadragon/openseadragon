/**
 * (c) 2011 Christopher Thatcher
 * (c) 2010 OpenSeadragon
 * (c) 2010 CodePlex Foundation
 *
 * OpenSeadragon @VERSION@
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
            if ( typeof ( element ) == "string") {
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
            var result = new $.Point(),
                isFixed,
                offsetParent;

            element      = $.getElement( element );
            isFixed      = $.getElementStyle( element ).position == "fixed";
            offsetParent = $.getOffsetParent( element, isFixed );

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
            element = $.getElement( element );

            return new $.Point(
                element.clientWidth, 
                element.clientHeight
            );
        },

        getElementStyle: function( element ) {
            element = $.getElement( element );

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
            var result = new $.Point();

            event = $.getEvent( event );

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
            extension = extension ? extension : "";
            return !!FILEFORMATS[ extension.toLowerCase() ];
        },

        makeCenteredNode: function( element ) {

            var div      = $.makeNeutralElement( "div" ),
                html     = [],
                innerDiv,
                innerDivs;

            element = $.getElement( element );

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

            var previousFilter,
                ieOpacity,
                ieFilter;

            element = $.getElement( element );

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
            element = $.getElement( element );

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
            element = $.getElement( element );

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
            event = $.getEvent( event );

            if ( event.preventDefault ) {
                event.preventDefault();     // W3C for preventing default
            }

            event.cancel = true;            // legacy for preventing default
            event.returnValue = false;      // IE for preventing default
        },

        stopEvent: function( event ) {
            event = $.getEvent( event );

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
                $.Debug.log(
                    "%s while making AJAX request: %s",
                    e.name, 
                    e.message
                );

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
