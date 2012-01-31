/**
 * @version  OpenSeadragon 0.8.26
 *
 * @fileOverview 
 * <h2>
 * <strong>
 * OpenSeadragon - Javascript Deep Zooming
 * </strong>
 * </h2> 
 * <p>
 * OpenSeadragon is provides an html interface for creating 
 * deep zoom user interfaces.  The simplest examples include deep 
 * zoom for large resolution images, and complex examples include
 * zoomable map interfaces driven by SVG files.
 * </p>
 * 
 * @author <br/>(c) 2011 Christopher Thatcher 
 * @author <br/>(c) 2010 OpenSeadragon Team 
 * @author <br/>(c) 2010 CodePlex Foundation 
 * 
 * <p>
 * <strong>Original license preserved below: </strong><br/>
 * <pre>
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
 * </pre>
 * </p>
 **/

 /** 
  * The root namespace for OpenSeadragon.  All utility methods and classes
  * are defined on or below this namespace. The OpenSeadragon namespace will
  * only be defined once even if mutliple versions are loaded on the page in 
  * succession.
  * @namespace 
  * @name OpenSeadragon
  * @exports $ as OpenSeadragon
  */
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

    /**
     * @static
     * @ignore
     */
    $.SIGNAL = "----seadragon----";

    /**
     * Invokes the the method as if it where a method belonging to the object.
     * @param {Object} object 
     * @param {Function} method
     */
    $.delegate = function( object, method ) {
        return function() {
            if ( arguments === undefined )
                arguments = [];
            return method.apply( object, arguments );
        };
    };
    
    /**
     * Taken from jQuery 1.6.1, see the jQuery documentation
     */
    $.extend = function() {
        var options, 
            name, 
            src, 
            copy, 
            copyIsArray, 
            clone,
            target  = arguments[ 0 ] || {},
            length  = arguments.length,
            deep    = false,
            i       = 1;

        // Handle a deep copy situation
        if ( typeof target === "boolean" ) {
            deep    = target;
            target  = arguments[ 1 ] || {};
            // skip the boolean and the target
            i = 2;
        }

        // Handle case when target is a string or something (possible in deep copy)
        if ( typeof target !== "object" && !OpenSeadragon.isFunction( target ) ) {
            target = {};
        }

        // extend jQuery itself if only one argument is passed
        if ( length === i ) {
            target = this;
            --i;
        }

        for ( ; i < length; i++ ) {
            // Only deal with non-null/undefined values
            if ( ( options = arguments[ i ] ) != null ) {
                // Extend the base object
                for ( name in options ) {
                    src = target[ name ];
                    copy = options[ name ];

                    // Prevent never-ending loop
                    if ( target === copy ) {
                        continue;
                    }

                    // Recurse if we're merging plain objects or arrays
                    if ( deep && copy && ( OpenSeadragon.isPlainObject( copy ) || ( copyIsArray = OpenSeadragon.isArray( copy ) ) ) ) {
                        if ( copyIsArray ) {
                            copyIsArray = false;
                            clone = src && OpenSeadragon.isArray( src ) ? src : [];

                        } else {
                            clone = src && OpenSeadragon.isPlainObject( src ) ? src : {};
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
    //module but have been moved to Openseadragon to avoid the 'Utils' anti-
    //pattern.  Not all of the code is A-grade compared to equivalent functions
    // from libraries like jquery, but until we need better we'll leave those
    //orignally developed by the project.
    
    /**
     * An enumeration of Browser vendors including UNKNOWN, IE, FIREFOX,
     * SAFARI, CHROME, and OPERA.
     * @static
     */
    $.BROWSERS = {
        UNKNOWN:    0,
        IE:         1,
        FIREFOX:    2,
        SAFARI:     3,
        CHROME:     4,
        OPERA:      5
    };

    /**
     * The current browser vendor, version, and related information regarding
     * detected features.  Features include <br/>
     *  <strong>'alpha'</strong> - Does the browser support image alpha 
     *  transparency.<br/>
     * @static
     */
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
        //A small auto-executing routine to determine the browser vendor, 
        //version and supporting feature sets.
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

            // ignore '?' portion of query string
        var query = window.location.search.substring( 1 ),
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

        //determine if this browser supports image alpha transparency
        $.Browser.alpha = !( 
            $.Browser.vendor == $.BROWSERS.IE || (
                $.Browser.vendor == $.BROWSERS.CHROME && 
                $.Browser.version < 2
            )
        );

    })();

    //TODO: $.console is often used inside a try/catch block which generally
    //      prevents allowings errors to occur with detection until a debugger
    //      is attached.  Although I've been guilty of the same anti-pattern
    //      I eventually was convinced that errors should naturally propogate in
    //      all but the most special cases.
    /**
     * A convenient alias for console when available, and a simple null 
     * function when console is unavailable.
     * @static
     */
    $.console = window.console ? window.console : function(){};


    $.extend( $, {

        /**
         * Returns a DOM Element for the given id or element.
         * @function
         * @name OpenSeadragon.getElement
         * @param {String|Element} element Accepts an id or element.
         * @returns {Element} The element with the given id, null, or the element itself.
         */
        getElement: function( element ) { 
            if ( typeof ( element ) == "string") {
                element = document.getElementById( element );
            }
            return element;
        },

        /**
         * Determines the position of the upper-left corner of the element.
         * @function
         * @name OpenSeadragon.getElementPosition
         * @param {Element|String} element - the elemenet we want the position for.
         * @returns {Point} - the position of the upper left corner of the element. 
         */
        getElementPosition: function( element ) {
            var result = new $.Point(),
                isFixed,
                offsetParent;

            element      = $.getElement( element );
            isFixed      = $.getElementStyle( element ).position == "fixed";
            offsetParent = getOffsetParent( element, isFixed );

            while ( offsetParent ) {

                result.x += element.offsetLeft;
                result.y += element.offsetTop;

                if ( isFixed ) {
                    result = result.plus( $.getPageScroll() );
                }

                element = offsetParent;
                isFixed = $.getElementStyle( element ).position == "fixed";
                offsetParent = getOffsetParent( element, isFixed );
            }

            return result;
        },

        /**
         * Determines the height and width of the given element.
         * @function
         * @name OpenSeadragon.getElementSize
         * @param {Element|String} element
         * @returns {Point}
         */
        getElementSize: function( element ) {
            element = $.getElement( element );

            return new $.Point(
                element.clientWidth, 
                element.clientHeight
            );
        },

        /**
         * Returns the CSSStyle object for the given element.
         * @function
         * @name OpenSeadragon.getElementStyle
         * @param {Element|String} element
         * @returns {CSSStyle}
         */
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

        /**
         * Gets the latest event, really only useful internally since its 
         * specific to IE behavior.  TODO: Deprecate this from the api and
         * use it internally.
         * @function
         * @name OpenSeadragon.getEvent
         * @param {Event} [event]
         * @returns {Event}
         */
        getEvent: function( event ) {
            return event ? event : window.event;
        },

        /**
         * Gets the position of the mouse on the screen for a given event.
         * @function
         * @name OpenSeadragon.getMousePosition
         * @param {Event} [event]
         * @returns {Point}
         */
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

        /**
         * Determines the pages current scroll position.
         * @function
         * @name OpenSeadragon.getPageScroll
         * @returns {Point}
         */
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

        /**
         * Determines the size of the browsers window.
         * @function
         * @name OpenSeadragon.getWindowSize
         * @returns {Point}
         */
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


        /**
         * Wraps the given element in a nest of divs so that the element can
         * be easily centered.
         * @function
         * @name OpenSeadragon.makeCenteredNode
         * @param {Element|String} element
         * @returns {Element}
         */
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

        /**
         * Creates an easily positionable element of the given type that therefor
         * serves as an excellent container element.
         * @function
         * @name OpenSeadragon.makeNeutralElement
         * @param {String} tagName
         * @returns {Element}
         */
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

        /**
         * Ensures an image is loaded correctly to support alpha transparency.
         * Generally only IE has issues doing this correctly for formats like 
         * png.
         * @function
         * @name OpenSeadragon.makeTransparentImage
         * @param {String} src
         * @returns {Element}
         */
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

        /**
         * Sets the opacity of the specified element.
         * @function
         * @name OpenSeadragon.setElementOpacity
         * @param {Element|String} element
         * @param {Number} opacity
         * @param {Boolean} [usesAlpha]
         */
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

        /**
         * Adds an event listener for the given element, eventName and handler.
         * @function
         * @name OpenSeadragon.addEvent
         * @param {Element|String} element
         * @param {String} eventName
         * @param {Function} handler
         * @param {Boolean} [useCapture]
         * @throws {Error}
         */
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

        /**
         * Remove a given event listener for the given element, event type and 
         * handler.
         * @function
         * @name OpenSeadragon.removeEvent
         * @param {Element|String} element
         * @param {String} eventName
         * @param {Function} handler
         * @param {Boolean} [useCapture]
         * @throws {Error}
         */
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

        /**
         * Cancels the default browser behavior had the event propagated all
         * the way up the DOM to the window object.
         * @function
         * @name OpenSeadragon.cancelEvent
         * @param {Event} [event]
         */
        cancelEvent: function( event ) {
            event = $.getEvent( event );

            if ( event.preventDefault ) {
                // W3C for preventing default
                event.preventDefault();
            }
            // legacy for preventing default
            event.cancel = true;
            // IE for preventing default
            event.returnValue = false;
        },

        /**
         * Stops the propagation of the event up the DOM.
         * @function
         * @name OpenSeadragon.stopEvent
         * @param {Event} [event]
         */
        stopEvent: function( event ) {
            event = $.getEvent( event );

            if ( event.stopPropagation ) {
                event.stopPropagation();    // W3C for stopping propagation
            }

            event.cancelBubble = true;      // IE for stopping propagation
        },

        /**
         * Similar to OpenSeadragon.delegate, but it does not immediately call 
         * the method on the object, returning a function which can be called
         * repeatedly to delegate the method. It also allows additonal arguments
         * to be passed during construction which will be added during each
         * invocation, and each invocation can add additional arguments as well.
         * 
         * @function
         * @name OpenSeadragon.createCallback
         * @param {Object} object
         * @param {Function} method
         * @param [args] any additional arguments are passed as arguments to the 
         *  created callback
         * @returns {Function}
         */
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

        /**
         * Retreives the value of a url parameter from the window.location string.
         * @function
         * @name OpenSeadragon.getUrlParameter
         * @param {String} key
         * @returns {String} The value of the url parameter or null if no param matches.
         */
        getUrlParameter: function( key ) {
            var value = URLPARAMS[ key ];
            return value ? value : null;
        },

        /**
         * Makes an AJAX request.
         * @function
         * @name OpenSeadragon.makeAjaxRequest
         * @param {String} url - the url to request 
         * @param {Function} [callback] - a function to call when complete
         * @throws {Error}
         */
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
                /** @ignore */
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
                $.console.log(
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


        /**
         * Loads a Deep Zoom Image description from a url or XML string and
         * provides a callback hook for the resulting Document
         * @function
         * @name OpenSeadragon.createFromDZI
         * @param {String} xmlUrl
         * @param {String} xmlString
         * @param {Function} callback
         */
        createFromDZI: function( dzi, callback ) {
            var async       = typeof ( callback ) == "function",
                xmlUrl      = dzi.substring(0,1) != '<' ? dzi : null,
                xmlString   = xmlUrl ? null : dzi,
                error       = null,
                urlParts,
                filename,
                lastDot,
                tilesUrl;


            if( xmlUrl ){
                urlParts = xmlUrl.split( '/' );
                filename = urlParts[ urlParts.length - 1 ];
                lastDot  = filename.lastIndexOf( '.' );

                if ( lastDot > -1 ) {
                    urlParts[ urlParts.length - 1 ] = filename.slice( 0, lastDot );
                }

                tilesUrl = urlParts.join( '/' ) + "_files/";
            }

            function finish( func, obj ) {
                try {
                    return func( obj, tilesUrl );
                } catch ( e ) {
                    if ( async ) {
                        return null;
                    } else {
                        throw e;
                    }
                }
            }

            if ( async ) {
                if ( xmlString ) {
                    window.setTimeout( function() {
                        var source = finish( processDZIXml, parseXml( xmlString ) );
                        // call after finish sets error
                        callback( source, error );    
                    }, 1);
                } else {
                    $.makeAjaxRequest( xmlUrl, function( xhr ) {
                        var source = finish( processDZIResponse, xhr );
                        // call after finish sets error
                        callback( source, error );
                    });
                }

                return null;
            }

            if ( xmlString ) {
                return finish( 
                    processDZIXml,
                    parseXml( xmlString ) 
                );
            } else {
                return finish( 
                    processDZIResponse, 
                    $.makeAjaxRequest( xmlUrl )
                );
            }
        }

    });

    /**
     * @private
     * @inner
     * @function
     * @param {Element} element 
     * @param {Boolean} [isFixed]
     * @returns {Element}
     */
    function getOffsetParent( element, isFixed ) {
        if ( isFixed && element != document.body ) {
            return document.body;
        } else {
            return element.offsetParent;
        }
    };

    /**
     * @private
     * @inner
     * @function
     * @param {XMLHttpRequest} xhr
     * @param {String} tilesUrl
     */
    function processDZIResponse( xhr, tilesUrl ) {
        var status,
            statusText,
            doc = null;

        if ( !xhr ) {
            throw new Error( $.getString( "Errors.Security" ) );
        } else if ( xhr.status !== 200 && xhr.status !== 0 ) {
            status     = xhr.status;
            statusText = ( status == 404 ) ? 
                "Not Found" : 
                xhr.statusText;
            throw new Error( $.getString( "Errors.Status", status, statusText ) );
        }

        if ( xhr.responseXML && xhr.responseXML.documentElement ) {
            doc = xhr.responseXML;
        } else if ( xhr.responseText ) {
            doc = parseXml( xhr.responseText );
        }

        return processDZIXml( doc, tilesUrl );
    };

    /**
     * @private
     * @inner
     * @function
     * @param {Document} xmlDoc
     * @param {String} tilesUrl
     */
    function processDZIXml( xmlDoc, tilesUrl ) {

        if ( !xmlDoc || !xmlDoc.documentElement ) {
            throw new Error( $.getString( "Errors.Xml" ) );
        }

        var root     = xmlDoc.documentElement,
            rootName = root.tagName;

        if ( rootName == "Image" ) {
            try {
                return processDZI( root, tilesUrl );
            } catch ( e ) {
                throw (e instanceof Error) ? 
                    e : 
                    new Error( $.getString("Errors.Dzi") );
            }
        } else if ( rootName == "Collection" ) {
            throw new Error( $.getString( "Errors.Dzc" ) );
        } else if ( rootName == "Error" ) {
            return processDZIError( root );
        }

        throw new Error( $.getString( "Errors.Dzi" ) );
    };

    /**
     * @private
     * @inner
     * @function
     * @param {Element} imageNode
     * @param {String} tilesUrl
     */
    function processDZI( imageNode, tilesUrl ) {
        var fileFormat    = imageNode.getAttribute( "Format" ),
            sizeNode      = imageNode.getElementsByTagName( "Size" )[ 0 ],
            dispRectNodes = imageNode.getElementsByTagName( "DisplayRect" ),
            width         = parseInt( sizeNode.getAttribute( "Width" ) ),
            height        = parseInt( sizeNode.getAttribute( "Height" ) ),
            tileSize      = parseInt( imageNode.getAttribute( "TileSize" ) ),
            tileOverlap   = parseInt( imageNode.getAttribute( "Overlap" ) ),
            dispRects     = [],
            dispRectNode,
            rectNode,
            i;

        if ( !imageFormatSupported( fileFormat ) ) {
            throw new Error(
                $.getString( "Errors.ImageFormat", fileFormat.toUpperCase() )
            );
        }

        for ( i = 0; i < dispRectNodes.length; i++ ) {
            dispRectNode = dispRectNodes[ i ];
            rectNode     = dispRectNode.getElementsByTagName( "Rect" )[ 0 ];

            dispRects.push( new $.DisplayRect(
                parseInt( rectNode.getAttribute( "X" ) ),
                parseInt( rectNode.getAttribute( "Y" ) ),
                parseInt( rectNode.getAttribute( "Width" ) ),
                parseInt( rectNode.getAttribute( "Height" ) ),
                0,  // ignore MinLevel attribute, bug in Deep Zoom Composer
                parseInt( dispRectNode.getAttribute( "MaxLevel" ) )
            ));
        }
        return new $.DziTileSource(
            width, 
            height, 
            tileSize, 
            tileOverlap,
            tilesUrl, 
            fileFormat, 
            dispRects
        );
    };

    /**
     * @private
     * @inner
     * @function
     * @param {Document} errorNode
     * @throws {Error}
     */
    function processDZIError( errorNode ) {
        var messageNode = errorNode.getElementsByTagName( "Message" )[ 0 ],
            message     = messageNode.firstChild.nodeValue;

        throw new Error(message);
    };

    /**
     * Reports whether the image format is supported for tiling in this
     * version.
     * @private
     * @inner
     * @function
     * @param {String} [extension]
     * @returns {Boolean}
     */
    function imageFormatSupported( extension ) {
        extension = extension ? extension : "";
        return !!FILEFORMATS[ extension.toLowerCase() ];
    };

    /**
     * Parses an XML string into a DOM Document.
     * @private
     * @inner
     * @function
     * @name OpenSeadragon.parseXml
     * @param {String} string
     * @returns {Document}
     */
    function parseXml( string ) {
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
    };
    
}( OpenSeadragon ));

(function($){

/**
 * @class
 */
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
                length = events.length;
            for ( i = 0; i < length; i++ ) {
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

(function( $ ){
    
/**
 * An enumeration of supported locations where controls can be anchored,
 * including NONE, TOP_LEFT, TOP_RIGHT, BOTTOM_RIGHT, and BOTTOM_LEFT.
 * The anchoring is always relative to the container
 * @static
 */
$.ControlAnchor = {
    NONE: 0,
    TOP_LEFT: 1,
    TOP_RIGHT: 2,
    BOTTOM_RIGHT: 3,
    BOTTOM_LEFT: 4
};

/**
 * A Control represents any interface element which is meant to allow the user 
 * to interact with the zoomable interface. Any control can be anchored to any 
 * element.
 * @class
 * @param {Element} elmt - the contol element to be anchored in the container.
 * @param {OpenSeadragon.ControlAnchor} anchor - the location to anchor at.
 * @param {Element} container - the element to control will be anchored too.
 * 
 * @property {Element} elmt - the element providing the user interface with 
 *  some type of control. Eg a zoom-in button
 * @property {OpenSeadragon.ControlAnchor} anchor - the position of the control 
 *  relative to the container.
 * @property {Element} container - the element within with the control is 
 *  positioned.
 * @property {Element} wrapper - a nuetral element surrounding the control 
 *  element.
 */
$.Control = function ( elmt, anchor, container ) {
    this.elmt       = elmt;
    this.anchor     = anchor;
    this.container  = container;
    this.wrapper    = $.makeNeutralElement( "span" );
    this.wrapper.style.display = "inline-block";
    this.wrapper.appendChild( this.elmt );

    if ( this.anchor == $.ControlAnchor.NONE ) {
        // IE6 fix
        this.wrapper.style.width = this.wrapper.style.height = "100%";    
    }

    if ( this.anchor == $.ControlAnchor.TOP_RIGHT || 
         this.anchor == $.ControlAnchor.BOTTOM_RIGHT ) {
        this.container.insertBefore( 
            this.wrapper, 
            this.container.firstChild 
        );
    } else {
        this.container.appendChild( this.wrapper );
    }
};

$.Control.prototype = {

    /**
     * Removes the control from the container.
     * @function
     */
    destroy: function() {
        this.wrapper.removeChild( this.elmt );
        this.container.removeChild( this.wrapper );
    },

    /**
     * Determines if the control is currently visible.
     * @function
     * @return {Boolean} true if currenly visible, false otherwise.
     */
    isVisible: function() {
        return this.wrapper.style.display != "none";
    },

    /**
     * Toggles the visibility of the control.
     * @function
     * @param {Boolean} visible - true to make visible, false to hide.
     */
    setVisible: function( visible ) {
        this.wrapper.style.display = visible ? 
            "inline-block" : 
            "none";
    },

    /**
     * Sets the opacity level for the control.
     * @function
     * @param {Number} opactiy - a value between 1 and 0 inclusively.
     */
    setOpacity: function( opacity ) {
        if ( this.elmt[ $.SIGNAL ] && $.Browser.vendor == $.BROWSERS.IE ) {
            $.setElementOpacity( this.elmt, opacity, true );
        } else {
            $.setElementOpacity( this.wrapper, opacity, true );
        }
    }
};

}( OpenSeadragon ));

(function( $ ){
/**
 *
 * The main point of entry into creating a zoomable image on the page.
 *
 * We have provided an idiomatic javascript constructor which takes
 * a single object, but still support the legacy positional arguments.
 *
 * The options below are given in order that they appeared in the constructor
 * as arguments and we translate a positional call into an idiomatic call.
 *
 * @class
 * @extends OpenSeadragon.EventHandler
 * @param {Object} options
 * @param {String} options.element Id of Element to attach to,
 * @param {String} options.xmlPath  Xpath ( TODO: not sure! ),
 * @param {String} options.prefixUrl  Url used to prepend to paths, eg button 
 *  images, etc.
 * @param {Seadragon.Controls[]} options.controls Array of Seadragon.Controls,
 * @param {Seadragon.Overlays[]} options.overlays Array of Seadragon.Overlays,
 * @param {Seadragon.Controls[]} options.overlayControls An Array of ( TODO: 
 *  not sure! )
 *
 **/    
$.Viewer = function( options ) {

    var args  = arguments,
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
    this.container      = $.makeNeutralElement( "div" );
    this.canvas         = $.makeNeutralElement( "div" );

    //Used for toggling between fullscreen and default container size
    this.bodyWidth      = document.body.style.width;
    this.bodyHeight     = document.body.style.height;
    this.bodyOverflow   = document.body.style.overflow;
    this.docOverflow    = document.documentElement.style.overflow;

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
    this.innerTracker.clickHandler   = $.delegate( this, onCanvasClick );
    this.innerTracker.dragHandler    = $.delegate( this, onCanvasDrag );
    this.innerTracker.releaseHandler = $.delegate( this, onCanvasRelease );
    this.innerTracker.scrollHandler  = $.delegate( this, onCanvasScroll );
    this.innerTracker.setTracking( true ); // default state

    this.outerTracker = new $.MouseTracker(
        this.container, 
        this.config.clickTimeThreshold, 
        this.config.clickDistThreshold
    );
    this.outerTracker.enterHandler   = $.delegate( this, onContainerEnter );
    this.outerTracker.exitHandler    = $.delegate( this, onContainerExit );
    this.outerTracker.releaseHandler = $.delegate( this, onContainerRelease );
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
        this.controls[ layout ] = $.makeNeutralElement( "div" );
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
    this._group         = null; 
    // whether we should be continuously zooming
    this._zooming       = false;
    // how much we should be continuously zooming by
    this._zoomFactor    = null;  
    this._lastZoomTime  = null;

    this.elmt = null;
    
    var beginZoomingInHandler   = $.delegate( this, beginZoomingIn ),
        endZoomingHandler       = $.delegate( this, endZooming ),
        doSingleZoomInHandler   = $.delegate( this, doSingleZoomIn ),
        beginZoomingOutHandler  = $.delegate( this, beginZoomingOut ),
        doSingleZoomOutHandler  = $.delegate( this, doSingleZoomOut ),
        onHomeHandler           = $.delegate( this, onHome ),
        onFullPageHandler       = $.delegate( this, onFullPage ),
        navImages               = this.config.navImages,
        zoomIn = new $.Button({ 
            config:     this.config, 
            tooltip:    $.getString( "Tooltips.ZoomIn" ), 
            srcRest:    resolveUrl( this.urlPrefix, navImages.zoomIn.REST ),
            srcGroup:   resolveUrl( this.urlPrefix, navImages.zoomIn.GROUP ),
            srcHover:   resolveUrl( this.urlPrefix, navImages.zoomIn.HOVER ),
            srcDown:    resolveUrl( this.urlPrefix, navImages.zoomIn.DOWN ),
            onPress:    beginZoomingInHandler,
            onRelease:  endZoomingHandler,
            onClick:    doSingleZoomInHandler,
            onEnter:    beginZoomingInHandler,
            onExit:     endZoomingHandler
        }),
        zoomOut = new $.Button({ 
            config:     this.config, 
            tooltip:    $.getString( "Tooltips.ZoomOut" ), 
            srcRest:    resolveUrl( this.urlPrefix, navImages.zoomOut.REST ), 
            srcGroup:   resolveUrl( this.urlPrefix, navImages.zoomOut.GROUP ), 
            srcHover:   resolveUrl( this.urlPrefix, navImages.zoomOut.HOVER ), 
            srcDown:    resolveUrl( this.urlPrefix, navImages.zoomOut.DOWN ),
            onPress:    beginZoomingOutHandler, 
            onRelease:  endZoomingHandler, 
            onClick:    doSingleZoomOutHandler, 
            onEnter:    beginZoomingOutHandler, 
            onExit:     endZoomingHandler 
        }),
        goHome = new $.Button({ 
            config:     this.config, 
            tooltip:    $.getString( "Tooltips.Home" ), 
            srcRest:    resolveUrl( this.urlPrefix, navImages.home.REST ), 
            srcGroup:   resolveUrl( this.urlPrefix, navImages.home.GROUP ), 
            srcHover:   resolveUrl( this.urlPrefix, navImages.home.HOVER ), 
            srcDown:    resolveUrl( this.urlPrefix, navImages.home.DOWN ),
            onRelease:  onHomeHandler 
        }),
        fullPage = new $.Button({ 
            config:     this.config, 
            tooltip:    $.getString( "Tooltips.FullPage" ),
            srcRest:    resolveUrl( this.urlPrefix, navImages.fullpage.REST ),
            srcGroup:   resolveUrl( this.urlPrefix, navImages.fullpage.GROUP ),
            srcHover:   resolveUrl( this.urlPrefix, navImages.fullpage.HOVER ),
            srcDown:    resolveUrl( this.urlPrefix, navImages.fullpage.DOWN ),
            onRelease:  onFullPageHandler 
        });

    this.buttons = new $.ButtonGroup({ 
        config:     this.config, 
        buttons:    [ zoomIn, zoomOut, goHome, fullPage ] 
    });

    this.navControl  = this.buttons.element;
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

    if ( this.xmlPath ){
        this.openDzi( this.xmlPath );
    }
};

$.extend( $.Viewer.prototype, $.EventHandler.prototype, {

    /**
     * @function
     * @name OpenSeadragon.Viewer.prototype.addControl
     */
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

    /**
     * @function
     * @name OpenSeadragon.Viewer.prototype.isOpen
     */
    isOpen: function () {
        return !!this.source;
    },

    /**
     * If the string is xml is simply parsed and opened, otherwise the string 
     * is treated as an URL and an xml document is requested via ajax, parsed 
     * and then opened in the viewer.
     * @function
     * @name OpenSeadragon.Viewer.prototype.openDzi
     * @param {String} dzi and xml string or the url to a DZI xml document.
     */
    openDzi: function ( dzi ) {
        var _this = this;
        $.createFromDZI(
            dzi,
            function( source ){
               _this.open( source );
            }
        );
    },

    /**
     * @function
     * @name OpenSeadragon.Viewer.prototype.openTileSource
     */
    openTileSource: function ( tileSource ) {
        var _this = this;
        window.setTimeout( function () {
            _this.open( tileSource );
        }, 1 );
    },

    /**
     * @function
     * @name OpenSeadragon.Viewer.prototype.open
     */
    open: function( source ) {
        var _this = this,
            overlay,
            i;

        if ( this.source ) {
            this.close();
        }
        
        // to ignore earlier opens
        this._lastOpenStartTime = +new Date();

        window.setTimeout( function () {
            if ( _this._lastOpenStartTime > _this._lastOpenEndTime ) {
                _this._setMessage( $.getString( "Messages.Loading" ) );
            }
        }, 2000);

        this._lastOpenEndTime = +new Date();

        if ( this._lastOpenStartTime < viewer._lastOpenStartTime ) {
            $.console.log( "Ignoring out-of-date open." );
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

        //this.profiler = new $.Profiler();

        this._animating = false;
        this._forceRedraw = true;
        scheduleUpdate( this, updateMulti );

        for ( i = 0; i < this.overlayControls.length; i++ ) {
            
            overlay = this.overlayControls[ i ];
            
            if ( overlay.point != null ) {
            
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

    /**
     * @function
     * @name OpenSeadragon.Viewer.prototype.close
     */
    close: function () {
        this.source     = null;
        this.viewport   = null;
        this.drawer     = null;
        //this.profiler   = null;
        this.canvas.innerHTML = "";
    },

    /**
     * @function
     * @name OpenSeadragon.Viewer.prototype.removeControl
     */
    removeControl: function ( elmt ) {
        
        var elmt = $.getElement( elmt ),
            i    = getControlIndex( this, elmt );
        
        if ( i >= 0 ) {
            this.controls[ i ].destroy();
            this.controls.splice( i, 1 );
        }
    },

    /**
     * @function
     * @name OpenSeadragon.Viewer.prototype.clearControls
     */
    clearControls: function () {
        while ( this.controls.length > 0 ) {
            this.controls.pop().destroy();
        }
    },

    /**
     * @function
     * @name OpenSeadragon.Viewer.prototype.isDashboardEnabled
     */
    isDashboardEnabled: function () {
        var i;
        
        for ( i = this.controls.length - 1; i >= 0; i-- ) {
            if ( this.controls[ i ].isVisible() ) {
                return true;
            }
        }

        return false;
    },

    /**
     * @function
     * @name OpenSeadragon.Viewer.prototype.isFullPage
     */
    isFullPage: function () {
        return this.container.parentNode == document.body;
    },

    /**
     * @function
     * @name OpenSeadragon.Viewer.prototype.isMouseNavEnabled
     */
    isMouseNavEnabled: function () {
        return this.innerTracker.isTracking();
    },

    /**
     * @function
     * @name OpenSeadragon.Viewer.prototype.isVisible
     */
    isVisible: function () {
        return this.container.style.visibility != "hidden";
    },

    /**
     * @function
     * @name OpenSeadragon.Viewer.prototype.setDashboardEnabled
     */
    setDashboardEnabled: function( enabled ) {
        var i;
        for ( i = this.controls.length - 1; i >= 0; i-- ) {
            this.controls[ i ].setVisible( enabled );
        }
    },

    /**
     * @function
     * @name OpenSeadragon.Viewer.prototype.setFullPage
     */
    setFullPage: function( fullPage ) {

        var body            = document.body,
            bodyStyle       = body.style,
            docStyle        = document.documentElement.style,
            containerStyle  = this.container.style,
            canvasStyle     = this.canvas.style,
            oldBounds,
            newBounds;
        
        if ( fullPage == this.isFullPage() ) {
            return;
        }

        if ( fullPage ) {
            
            this.bodyOverflow   = bodyStyle.overflow;
            this.docOverflow    = docStyle.overflow;
            bodyStyle.overflow  = "hidden";
            docStyle.overflow   = "hidden";

            this.bodyWidth      = bodyStyle.width;
            this.bodyHeight     = bodyStyle.height;
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
            
            bodyStyle.overflow  = this.bodyOverflow;
            docStyle.overflow   = this.docOverflow;

            bodyStyle.width     = this.bodyWidth;
            bodyStyle.height    = this.bodyHeight;

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
            this.viewport.resize( this._prevContainerSize );
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

    /**
     * @function
     * @name OpenSeadragon.Viewer.prototype.setMouseNavEnabled
     */
    setMouseNavEnabled: function( enabled ){
        this.innerTracker.setTracking( enabled );
    },

    /**
     * @function
     * @name OpenSeadragon.Viewer.prototype.setVisible
     */
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

    if ( this._animating ) {
        return window.setTimeout( function(){
            updateFunc( viewer );
        }, 1 );
    }

    currentTime     = +new Date();
    prevUpdateTime  = prevUpdateTime ? prevUpdateTime : currentTime;
    // 60 frames per second is ideal
    targetTime      = prevUpdateTime + 1000 / 60;
    deltaTime       = Math.max( 1, targetTime - currentTime );
    
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
        +new Date() + 
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
function onCanvasClick( tracker, position, quick, shift ) {
    var zoomPreClick,
        factor;
    if ( this.viewport && quick ) {    // ignore clicks where mouse moved         
        zoomPerClick = this.config.zoomPerClick;
        factor = shift ? 1.0 / zoomPerClick : zoomPerClick;
        this.viewport.zoomBy(
            factor, 
            this.viewport.pointFromPixel( position, true )
        );
        this.viewport.applyConstraints();
    }
};

function onCanvasDrag( tracker, position, delta, shift ) {
    if ( this.viewport ) {
        this.viewport.panBy( 
            this.viewport.deltaPointsFromPixels( 
                delta.negate() 
            ) 
        );
    }
};

function onCanvasRelease( tracker, position, insideElmtPress, insideElmtRelease ) {
    if ( insideElmtPress && this.viewport ) {
        this.viewport.applyConstraints();
    }
};

function onCanvasScroll( tracker, position, scroll, shift ) {
    var factor;
    if ( this.viewport ) {
        factor = Math.pow( this.config.zoomPerScroll, scroll );
        this.viewport.zoomBy( 
            factor, 
            this.viewport.pointFromPixel( position, true ) 
        );
        this.viewport.applyConstraints();
    }
};

function onContainerExit( tracker, position, buttonDownElmt, buttonDownAny ) {
    if ( !buttonDownElmt ) {
        this._mouseInside = false;
        if ( !this._animating ) {
            beginControlsAutoHide( this );
        }
    }
};

function onContainerRelease( tracker, position, insideElmtPress, insideElmtRelease ) {
    if ( !insideElmtRelease ) {
        this._mouseInside = false;
        if ( !this._animating ) {
            beginControlsAutoHide( this );
        }
    }
};

function onContainerEnter( tracker, position, buttonDownElmt, buttonDownAny ) {
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

    var beginTime;

    if ( !viewer.source ) {
        return;
    }

    beginTime = +new Date();
    updateOnce( viewer );
    scheduleUpdate( viewer, arguments.callee, beginTime );
};

function updateOnce( viewer ) {

    var containerSize,
        animated;

    if ( !viewer.source ) {
        return;
    }

    //viewer.profiler.beginUpdate();

    containerSize = $.getElementSize( viewer.container );
    if ( !containerSize.equals( viewer._prevContainerSize ) ) {
        // maintain image position
        viewer.viewport.resize( containerSize, true ); 
        viewer._prevContainerSize = containerSize;
        viewer.raiseEvent( "resize" );
    }

    animated = viewer.viewport.update();
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
    window.setTimeout( $.delegate( viewer, doZoom ), 10 );
}

function doZoom() {
    var currentTime,
        deltaTime,
        adjustFactor;

    if ( this._zooming && this.viewport) {
        currentTime     = +new Date();
        deltaTime       = currentTime - this._lastZoomTime;
        adjustedFactor  = Math.pow( this._zoomFactor, deltaTime / 1000 );

        this.viewport.zoomBy( adjustedFactor );
        this.viewport.applyConstraints();
        this._lastZoomTime = currentTime;
        scheduleZoom( this );
    }
};

function doSingleZoomIn() {
    if ( this.viewport ) {
        this._zooming = false;
        this.viewport.zoomBy( 
            this.config.zoomPerClick / 1.0 
        );
        this.viewport.applyConstraints();
    }
};

function doSingleZoomOut() {
    if ( this.viewport ) {
        this._zooming = false;
        this.viewport.zoomBy(
            1.0 / this.config.zoomPerClick
        );
        this.viewport.applyConstraints();
    }
};

function lightUp() {
    this.buttons.emulateEnter();
    this.buttons.emulateExit();
};

function onHome() {
    if ( this.viewport ) {
        this.viewport.goHome();
    }
};

function onFullPage() {
    this.setFullPage( !this.isFullPage() );
    // correct for no mouseout event on change
    this.buttons.emulateExit();  
    if ( this.viewport ) {
        this.viewport.applyConstraints();
    }
};

}( OpenSeadragon ));

(function( $ ){
    
//TODO: I guess this is where the i18n needs to be reimplemented.  I'll look 
//      into existing patterns for i18n in javascript but i think that mimicking
//      pythons gettext might be a reasonable approach.
var I18N = {
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
    }
};

$.extend( $, {

    getString: function( prop ) {
        
        var props   = prop.split('.'),
            string  = I18N,
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

});

}( OpenSeadragon ));

(function( $ ){

/**
 * A Point is really used as a 2-dimensional vector, equally useful for 
 * representing a point on a plane, or the height and width of a plane
 * not requiring any other frame of reference.
 * @class
 * @param {Number} [x] The vector component 'x'. Defaults to the origin at 0.
 * @param {Number} [y] The vector component 'y'. Defaults to the origin at 0.
 * @property {Number} [x] The vector component 'x'. 
 * @property {Number} [y] The vector component 'y'.
 */
$.Point = function( x, y ) {
    this.x = typeof ( x ) == "number" ? x : 0;
    this.y = typeof ( y ) == "number" ? y : 0;
};

$.Point.prototype = {

    /**
     * Add another Point to this point and return a new Point.
     * @function
     * @param {OpenSeadragon.Point} point The point to add vector components.
     * @returns {OpenSeadragon.Point} A new point representing the sum of the
     *  vector components
     */
    plus: function( point ) {
        return new $.Point(
            this.x + point.x, 
            this.y + point.y
        );
    },

    /**
     * Add another Point to this point and return a new Point.
     * @function
     * @param {OpenSeadragon.Point} point The point to add vector components.
     * @returns {OpenSeadragon.Point} A new point representing the sum of the
     *  vector components
     */
    minus: function( point ) {
        return new $.Point(
            this.x - point.x, 
            this.y - point.y
        );
    },

    /**
     * Add another Point to this point and return a new Point.
     * @function
     * @param {OpenSeadragon.Point} point The point to add vector components.
     * @returns {OpenSeadragon.Point} A new point representing the sum of the
     *  vector components
     */
    times: function( factor ) {
        return new $.Point(
            this.x * factor, 
            this.y * factor
        );
    },

    /**
     * Add another Point to this point and return a new Point.
     * @function
     * @param {OpenSeadragon.Point} point The point to add vector components.
     * @returns {OpenSeadragon.Point} A new point representing the sum of the
     *  vector components
     */
    divide: function( factor ) {
        return new $.Point(
            this.x / factor, 
            this.y / factor
        );
    },

    /**
     * Add another Point to this point and return a new Point.
     * @function
     * @param {OpenSeadragon.Point} point The point to add vector components.
     * @returns {OpenSeadragon.Point} A new point representing the sum of the
     *  vector components
     */
    negate: function() {
        return new $.Point( -this.x, -this.y );
    },

    /**
     * Add another Point to this point and return a new Point.
     * @function
     * @param {OpenSeadragon.Point} point The point to add vector components.
     * @returns {OpenSeadragon.Point} A new point representing the sum of the
     *  vector components
     */
    distanceTo: function( point ) {
        return Math.sqrt(
            Math.pow( this.x - point.x, 2 ) +
            Math.pow( this.y - point.y, 2 )
        );
    },

    /**
     * Add another Point to this point and return a new Point.
     * @function
     * @param {OpenSeadragon.Point} point The point to add vector components.
     * @returns {OpenSeadragon.Point} A new point representing the sum of the
     *  vector components
     */
    apply: function( func ) {
        return new $.Point( func( this.x ), func( this.y ) );
    },

    /**
     * Add another Point to this point and return a new Point.
     * @function
     * @param {OpenSeadragon.Point} point The point to add vector components.
     * @returns {OpenSeadragon.Point} A new point representing the sum of the
     *  vector components
     */
    equals: function( point ) {
        return ( 
            point instanceof $.Point 
        ) && ( 
            this.x === point.x 
        ) && ( 
            this.y === point.y 
        );
    },

    /**
     * Add another Point to this point and return a new Point.
     * @function
     * @param {OpenSeadragon.Point} point The point to add vector components.
     * @returns {OpenSeadragon.Point} A new point representing the sum of the
     *  vector components
     */
    toString: function() {
        return "(" + this.x + "," + this.y + ")";
    }
};

}( OpenSeadragon ));

(function( $ ){


/**
 * @class
 * @param {Number} width
 * @param {Number} height
 * @param {Number} tileSize
 * @param {Number} tileOverlap
 * @param {Number} minLevel
 * @param {Number} maxLevel
 * @property {Number} aspectRatio
 * @property {Number} dimensions
 * @property {Number} tileSize
 * @property {Number} tileOverlap
 * @property {Number} minLevel
 * @property {Number} maxLevel
 */ 
$.TileSource = function( width, height, tileSize, tileOverlap, minLevel, maxLevel ) {
    this.aspectRatio = width / height;
    this.dimensions  = new $.Point( width, height );
    this.tileSize    = tileSize ? tileSize : 0;
    this.tileOverlap = tileOverlap ? tileOverlap : 0;
    this.minLevel    = minLevel ? minLevel : 0;
    this.maxLevel    = maxLevel ? maxLevel :
        Math.ceil( 
            Math.log( Math.max( width, height ) ) / 
            Math.log( 2 ) 
        );
};

$.TileSource.prototype = {
    
    /**
     * @function
     * @param {Number} level
     */
    getLevelScale: function( level ) {
        return 1 / ( 1 << ( this.maxLevel - level ) );
    },

    /**
     * @function
     * @param {Number} level
     */
    getNumTiles: function( level ) {
        var scale = this.getLevelScale( level ),
            x = Math.ceil( scale * this.dimensions.x / this.tileSize ),
            y = Math.ceil( scale * this.dimensions.y / this.tileSize );

        return new $.Point( x, y );
    },

    /**
     * @function
     * @param {Number} level
     */
    getPixelRatio: function( level ) {
        var imageSizeScaled = this.dimensions.times( this.getLevelScale( level ) ),
            rx = 1.0 / imageSizeScaled.x,
            ry = 1.0 / imageSizeScaled.y;

        return new $.Point(rx, ry);
    },

    /**
     * @function
     * @param {Number} level
     * @param {OpenSeadragon.Point} point
     */
    getTileAtPoint: function( level, point ) {
        var pixel = point.times( this.dimensions.x ).times( this.getLevelScale(level ) ),
            tx = Math.floor( pixel.x / this.tileSize ),
            ty = Math.floor( pixel.y / this.tileSize );

        return new $.Point( tx, ty );
    },

    /**
     * @function
     * @param {Number} level
     * @param {Number} x
     * @param {Number} y
     */
    getTileBounds: function( level, x, y ) {
        var dimensionsScaled = this.dimensions.times( this.getLevelScale( level ) ),
            px = ( x === 0 ) ? 0 : this.tileSize * x - this.tileOverlap,
            py = ( y === 0 ) ? 0 : this.tileSize * y - this.tileOverlap,
            sx = this.tileSize + ( x === 0 ? 1 : 2 ) * this.tileOverlap,
            sy = this.tileSize + ( y === 0 ? 1 : 2 ) * this.tileOverlap,
            scale = 1.0 / dimensionsScaled.x;

        sx = Math.min( sx, dimensionsScaled.x - px );
        sy = Math.min( sy, dimensionsScaled.y - py );

        return new $.Rect( px * scale, py * scale, sx * scale, sy * scale );
    },

    /**
     * This method is not implemented by this class other than to throw an Error
     * announcing you have to implement it.  Because of the variety of tile 
     * server technologies, and various specifications for building image
     * pyramids, this method is here to allow easy integration.
     * @function
     * @param {Number} level
     * @param {Number} x
     * @param {Number} y
     * @throws {Error}
     */
    getTileUrl: function( level, x, y ) {
        throw new Error( "Method not implemented." );
    },

    /**
     * @function
     * @param {Number} level
     * @param {Number} x
     * @param {Number} y
     */
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
    
/**
 * @class
 * @extends OpenSeadragon.TileSource
 * @param {Number} width
 * @param {Number} height
 * @param {Number} tileSize
 * @param {Number} tileOverlap
 * @param {String} tilesUrl
 * @param {String} fileFormat
 * @param {OpenSeadragon.DisplayRect[]} displayRects
 * @property {String} tilesUrl
 * @property {String} fileFormat
 * @property {OpenSeadragon.DisplayRect[]} displayRects
 */ 
$.DziTileSource = function( width, height, tileSize, tileOverlap, tilesUrl, fileFormat, displayRects ) {
    var i,
        rect,
        level;

    $.TileSource.call( this, width, height, tileSize, tileOverlap, null, null );

    this._levelRects  = {};
    this.tilesUrl     = tilesUrl;
    this.fileFormat   = fileFormat;
    this.displayRects = displayRects;
    
    if ( this.displayRects ) {
        for ( i = this.displayRects.length - 1; i >= 0; i-- ) {
            rect = this.displayRects[ i ];
            for ( level = rect.minLevel; level <= rect.maxLevel; level++ ) {
                if ( !this._levelRects[ level ] ) {
                    this._levelRects[ level ] = [];
                }
                this._levelRects[ level ].push( rect );
            }
        }
    }

};

$.extend( $.DziTileSource.prototype, $.TileSource.prototype, {
    
    /**
     * @function
     * @name OpenSeadragon.DziTileSource.prototype.getTileUrl
     * @param {Number} level
     * @param {Number} x
     * @param {Number} y
     */
    getTileUrl: function( level, x, y ) {
        return [ this.tilesUrl, level, '/', x, '_', y, '.', this.fileFormat ].join( '' );
    },

    /**
     * @function
     * @name OpenSeadragon.DziTileSource.prototype.tileExists
     * @param {Number} level
     * @param {Number} x
     * @param {Number} y
     */
    tileExists: function( level, x, y ) {
        var rects = this._levelRects[ level ],
            rect,
            scale,
            xMin,
            yMin,
            xMax,
            yMax,
            i;

        if ( !rects || !rects.length ) {
            return true;
        }

        for ( i = rects.length - 1; i >= 0; i-- ) {
            rect = rects[ i ];

            if ( level < rect.minLevel || level > rect.maxLevel ) {
                continue;
            }

            scale = this.getLevelScale( level );
            xMin = rect.x * scale;
            yMin = rect.y * scale;
            xMax = xMin + rect.width * scale;
            yMax = yMin + rect.height * scale;

            xMin = Math.floor( xMin / this.tileSize );
            yMin = Math.floor( yMin / this.tileSize );
            xMax = Math.ceil( xMax / this.tileSize );
            yMax = Math.ceil( yMax / this.tileSize );

            if ( xMin <= x && x < xMax && yMin <= y && y < yMax ) {
                return true;
            }
        }

        return false;
    }
});



}( OpenSeadragon ));


(function( $ ){

/**
 * An enumeration of button states including, REST, GROUP, HOVER, and DOWN
 * @static
 */
$.ButtonState = {
    REST:   0,
    GROUP:  1,
    HOVER:  2,
    DOWN:   3
};

/**
 * Manages events, hover states for individual buttons, tool-tips, as well 
 * as fading the bottons out when the user has not interacted with them
 * for a specified period.
 * @class
 * @extends OpenSeadragon.EventHandler
 * @param {Object} options
 * @param {String} options.tooltip Provides context help for the button we the
 *  user hovers over it.
 * @param {String} options.srcRest URL of image to use in 'rest' state
 * @param {String} options.srcGroup URL of image to use in 'up' state
 * @param {String} options.srcHover URL of image to use in 'hover' state
 * @param {String} options.srcDown URL of image to use in 'domn' state
 * @param {Element} [options.element] Element to use as a container for the 
 *  button.
 * @property {String} tooltip Provides context help for the button we the
 *  user hovers over it.
 * @property {String} srcRest URL of image to use in 'rest' state
 * @property {String} srcGroup URL of image to use in 'up' state
 * @property {String} srcHover URL of image to use in 'hover' state
 * @property {String} srcDown URL of image to use in 'domn' state
 * @property {Object} config Configurable settings for this button.
 * @property {Element} [element] Element to use as a container for the 
 *  button.
 * @property {Number} fadeDelay How long to wait before fading
 * @property {Number} fadeLength How long should it take to fade the button.
 * @property {Number} fadeBeginTime When the button last began to fade.
 * @property {Boolean} shouldFade Whether this button should fade after user 
 *  stops interacting with the viewport.
    this.fadeDelay      = 0;      // begin fading immediately
    this.fadeLength     = 2000;   // fade over a period of 2 seconds
    this.fadeBeginTime  = null;
    this.shouldFade     = false;
 */
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
    this.element    = options.element || $.makeNeutralElement( "a" );
    this.element.href = '#';
    this.config     = options.config;

    if ( options.onPress ){
        this.addHandler( "onPress", options.onPress );
    }
    if ( options.onRelease ){
        this.addHandler( "onRelease", options.onRelease );
    }
    if ( options.onClick ){
        this.addHandler( "onClick", options.onClick );
    }
    if ( options.onEnter ){
        this.addHandler( "onEnter", options.onEnter );
    }
    if ( options.onExit ){
        this.addHandler( "onExit", options.onExit );
    }

    this.currentState = $.ButtonState.GROUP;
    this.tracker    = new $.MouseTracker(
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

    var styleRest   = this.imgRest.style,
        styleGroup  = this.imgGroup.style,
        styleHover  = this.imgHover.style,
        styleDown   = this.imgDown.style;

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
        enterHandler: function( tracker, position, buttonDownElmt, buttonDownAny ) {
            if ( buttonDownElmt ) {
                inTo( _this, $.ButtonState.DOWN );
                _this.raiseEvent( "onEnter", _this );
            } else if ( !buttonDownAny ) {
                inTo( _this, $.ButtonState.HOVER );
            }
        },
        exitHandler: function( tracker, position, buttonDownElmt, buttonDownAny ) {
            outTo( _this, $.ButtonState.GROUP );
            if ( buttonDownElmt ) {
                _this.raiseEvent( "onExit", _this );
            }
        },
        pressHandler: function( tracker, position ) {
            inTo( _this, $.ButtonState.DOWN );
            _this.raiseEvent( "onPress", _this );
        },
        releaseHandler: function( tracker, position, insideElmtPress, insideElmtRelease ) {
            if ( insideElmtPress && insideElmtRelease ) {
                outTo( _this, $.ButtonState.HOVER );
                _this.raiseEvent( "onRelease", _this );
            } else if ( insideElmtPress ) {
                outTo( _this, $.ButtonState.GROUP );
            } else {
                inTo( _this, $.ButtonState.HOVER );
            }
        },
        clickHandler: function( tracker, position, quick, shift ) {
            if ( quick ) {
                _this.raiseEvent("onClick", _this);
            }
        }
    });

    this.tracker.setTracking( true );
    outTo( this, $.ButtonState.REST );
};

$.extend( $.Button.prototype, $.EventHandler.prototype, {

    /**
     * TODO: Determine what this function is intended to do and if it's actually
     * useful as an API point.
     * @function
     * @name OpenSeadragon.Button.prototype.notifyGroupEnter
     */
    notifyGroupEnter: function() {
        inTo( this, $.ButtonState.GROUP );
    },

    /**
     * TODO: Determine what this function is intended to do and if it's actually
     * useful as an API point.
     * @function
     * @name OpenSeadragon.Button.prototype.notifyGroupExit
     */
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
    window.setTimeout( function(){ 
        scheduleFade( button );
    }, button.fadeDelay );
};

function stopFading( button ) {
    button.shouldFade = false;
    $.setElementOpacity( button.imgGroup, 1.0, true );
};

function inTo( button, newState ) {
    if ( newState >= $.ButtonState.GROUP && 
         button.currentState == $.ButtonState.REST ) {
        stopFading( button );
        button.currentState = $.ButtonState.GROUP;
    }

    if ( newState >= $.ButtonState.HOVER && 
         button.currentState == $.ButtonState.GROUP ) {
        button.imgHover.style.visibility = "";
        button.currentState = $.ButtonState.HOVER;
    }

    if ( newState >= $.ButtonState.DOWN && 
         button.currentState == $.ButtonState.HOVER ) {
        button.imgDown.style.visibility = "";
        button.currentState = $.ButtonState.DOWN;
    }
};


function outTo( button, newState ) {
    if ( newState <= $.ButtonState.HOVER && 
         button.currentState == $.ButtonState.DOWN ) {
        button.imgDown.style.visibility = "hidden";
        button.currentState = $.ButtonState.HOVER;
    }

    if ( newState <= $.ButtonState.GROUP && 
         button.currentState == $.ButtonState.HOVER ) {
        button.imgHover.style.visibility = "hidden";
        button.currentState = $.ButtonState.GROUP;
    }

    if ( button.newState <= $.ButtonState.REST && 
         button.currentState == $.ButtonState.GROUP ) {
        button.beginFading();
        button.currentState = $.ButtonState.REST;
    }
};



}( OpenSeadragon ));

(function( $ ){
/**
 * Manages events on groups of buttons.
 * @class
 * @param {Object} options - a dictionary of settings applied against the entire 
 * group of buttons
 * @param {Array}    options.buttons Array of buttons
 * @param {Element}  [options.group]   Element to use as the container,
 * @param {Object}   options.config  Object with Viewer settings ( TODO: is 
 *  this actually used anywhere? )
 * @param {Function} [options.enter]   Function callback for when the mouse 
 *  enters group
 * @param {Function} [options.exit]    Function callback for when mouse leaves 
 *  the group
 * @param {Function} [options.release] Function callback for when mouse is 
 *  released
 * @property {Array} buttons - An array containing the buttons themselves.
 * @property {Element} element - The shared container for the buttons.
 * @property {Object} config - Configurable settings for the group of buttons.
 * @property {OpenSeadragon.MouseTracker} tracker - Tracks mouse events accross
 *  the group of buttons.
 **/
$.ButtonGroup = function( options ) {

    this.buttons = options.buttons;
    this.element = options.group || $.makeNeutralElement( "span" );
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
        for ( i = 0; i < _this.buttons.length; i++ ) {
            _this.buttons[ i ].notifyGroupEnter();
        }
    };

    this.tracker.exit = options.exit || function() {
        var i,
            buttonDownElmt = arguments.length > 2 ? arguments[ 2 ] : null;
        if ( !buttonDownElmt ) {
            for ( i = 0; i < _this.buttons.length; i++ ) {
                _this.buttons[ i ].notifyGroupExit();
            }
        }
    };

    this.tracker.release = options.release || function() {
        var i,
            insideElmtRelease = arguments.length > 3 ? arguments[ 3 ] : null;
        if ( !insideElmtRelease ) {
            for ( i = 0; i < _this.buttons.length; i++ ) {
                _this.buttons[ i ].notifyGroupExit();
            }
        }
    };

    this.tracker.setTracking( true );
};

$.ButtonGroup.prototype = {

    /**
     * TODO: Figure out why this is used on the public API and if a more useful
     * api can be created.
     * @function
     * @name OpenSeadragon.ButtonGroup.prototype.emulateEnter
     */
    emulateEnter: function() {
        this.tracker.enter();
    },

    /**
     * TODO: Figure out why this is used on the public API and if a more useful
     * api can be created.
     * @function
     * @name OpenSeadragon.ButtonGroup.prototype.emulateExit
     */
    emulateExit: function() {
        this.tracker.exit();
    }
};


}( OpenSeadragon ));

(function( $ ){
    
/**
 * A Rectangle really represents a 2x2 matrix where each row represents a
 * 2 dimensional vector component, the first is (x,y) and the second is 
 * (width, height).  The latter component implies the equation of a simple 
 * plane.
 *
 * @class
 * @param {Number} x The vector component 'x'.
 * @param {Number} y The vector component 'y'.
 * @param {Number} width The vector component 'height'.
 * @param {Number} height The vector component 'width'.
 * @property {Number} x The vector component 'x'.
 * @property {Number} y The vector component 'y'.
 * @property {Number} width The vector component 'width'.
 * @property {Number} height The vector component 'height'.
 */
$.Rect = function( x, y, width, height ) {
    this.x = typeof ( x ) == "number" ? x : 0;
    this.y = typeof ( y ) == "number" ? y : 0;
    this.width  = typeof ( width )  == "number" ? width : 0;
    this.height = typeof ( height ) == "number" ? height : 0;
};

$.Rect.prototype = {

    /**
     * The aspect ratio is simply the ratio of width to height.
     * @function
     * @returns {Number} The ratio of width to height.
     */
    getAspectRatio: function() {
        return this.width / this.height;
    },

    /**
     * Provides the coordinates of the upper-left corner of the rectanglea s a
     * point.
     * @function
     * @returns {OpenSeadragon.Point} The coordinate of the upper-left corner of
     *  the rectangle.
     */
    getTopLeft: function() {
        return new $.Point( this.x, this.y );
    },

    /**
     * Provides the coordinates of the bottom-right corner of the rectangle as a
     * point.
     * @function
     * @returns {OpenSeadragon.Point} The coordinate of the bottom-right corner of
     *  the rectangle.
     */
    getBottomRight: function() {
        return new $.Point(
            this.x + this.width, 
            this.y + this.height
        );
    },

    /**
     * Computes the center of the rectangle.
     * @function
     * @returns {OpenSeadragon.Point} The center of the rectangle as represnted 
     *  as represented by a 2-dimensional vector (x,y)
     */
    getCenter: function() {
        return new $.Point(
            this.x + this.width / 2.0,
            this.y + this.height / 2.0
        );
    },

    /**
     * Returns the width and height component as a vector OpenSeadragon.Point
     * @function
     * @returns {OpenSeadragon.Point} The 2 dimensional vector represnting the
     *  the width and height of the rectangle.
     */
    getSize: function() {
        return new $.Point( this.width, this.height );
    },

    /**
     * Determines if two Rectanlges have equivalent components.  
     * @function
     * @param {OpenSeadragon.Rect} rectangle The Rectangle to compare to.
     * @return {Boolean} 'true' if all components are equal, otherwise 'false'.
     */
    equals: function( other ) {
        return ( other instanceof $.Rect ) &&
            ( this.x === other.x ) && 
            ( this.y === other.y ) &&
            ( this.width === other.width ) && 
            ( this.height === other.height );
    },

    /**
     * Provides a string representation of the retangle which is useful for 
     * debugging.
     * @function
     * @returns {String} A string representation of the rectangle.
     */
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

/**
 * A display rectanlge is very similar to the OpenSeadragon.Rect but adds two
 * fields, 'minLevel' and 'maxLevel' which denote the supported zoom levels
 * for this rectangle.
 * @class
 * @extends OpenSeadragon.Rect
 * @param {Number} x The vector component 'x'.
 * @param {Number} y The vector component 'y'.
 * @param {Number} width The vector component 'height'.
 * @param {Number} height The vector component 'width'.
 * @param {Number} minLevel The lowest zoom level supported.
 * @param {Number} maxLevel The highest zoom level supported.
 * @property {Number} minLevel The lowest zoom level supported.
 * @property {Number} maxLevel The highest zoom level supported.
 */
$.DisplayRect = function( x, y, width, height, minLevel, maxLevel ) {
    $.Rect.apply( this, [ x, y, width, height ] );

    this.minLevel = minLevel;
    this.maxLevel = maxLevel;
}

$.extend( $.DisplayRect.prototype, $.Rect.prototype );

}( OpenSeadragon ));

(function( $ ){
    
/**
 * @class
 */
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
    
/**
 * @class
 * @param {Number} level The zoom level this tile belongs to.
 * @param {Number} x The vector component 'x'.
 * @param {Number} y The vector component 'y'.
 * @param {OpenSeadragon.Point} bounds Where this tile fits, in normalized 
 *  coordinates
 * @param {Boolean} exists Is this tile a part of a sparse image? ( Also has 
 *  this tile failed to load?
 * @param {String} url The URL of this tile's image.
 *
 * @property {Number} level The zoom level this tile belongs to.
 * @property {Number} x The vector component 'x'.
 * @property {Number} y The vector component 'y'.
 * @property {OpenSeadragon.Point} bounds Where this tile fits, in normalized 
 *  coordinates
 * @property {Boolean} exists Is this tile a part of a sparse image? ( Also has 
 *  this tile failed to load?
 * @property {String} url The URL of this tile's image.
 * @property {Boolean} loaded Is this tile loaded?
 * @property {Boolean} loading Is this tile loading
 * @property {Element} elmt The HTML element for this tile
 * @property {Image} image The Image object for this tile
 * @property {String} style The alias of this.elmt.style.
 * @property {String} position This tile's position on screen, in pixels.
 * @property {String} size This tile's size on screen, in pixels
 * @property {String} blendStart The start time of this tile's blending
 * @property {String} opacity The current opacity this tile should be.
 * @property {String} distance The distance of this tile to the viewport center
 * @property {String} visibility The visibility score of this tile.
 * @property {Boolean} beingDrawn Whether this tile is currently being drawn
 * @property {Number} lastTouchTime Timestamp the tile was last touched.
 */
$.Tile = function(level, x, y, bounds, exists, url) {
    this.level   = level;
    this.x       = x;
    this.y       = y;
    this.bounds  = bounds;
    this.exists  = exists;
    this.url     = url;
    this.loaded  = false;
    this.loading = false;

    this.elmt    = null;
    this.image   = null;

    this.style      = null;
    this.position   = null;
    this.size       = null;
    this.blendStart = null;
    this.opacity    = null;
    this.distance   = null;
    this.visibility = null;

    this.beingDrawn     = false;
    this.lastTouchTime  = 0;
};

$.Tile.prototype = {
    
    /**
     * Provides a string representation of this tiles level and (x,y) 
     * components.
     * @function
     * @returns {String}
     */
    toString: function() {
        return this.level + "/" + this.x + "_" + this.y;
    },

    /**
     * Renders the tile in an html container.
     * @function
     * @param {Element} container
     */
    drawHTML: function( container ) {

        var position = this.position.apply( Math.floor ),
            size     = this.size.apply( Math.ceil );

        if ( !this.loaded ) {
            $.console.warn(
                "Attempting to draw tile %s when it's not yet loaded.",
                this.toString()
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


        if ( this.elmt.parentNode != container ) {
            container.appendChild( this.elmt );
        }

        this.elmt.style.left    = position.x + "px";
        this.elmt.style.top     = position.y + "px";
        this.elmt.style.width   = size.x + "px";
        this.elmt.style.height  = size.y + "px";

        $.setElementOpacity( this.elmt, this.opacity );

    },

    /**
     * Renders the tile in a canvas-based context.
     * @function
     * @param {Canvas} context
     */
    drawCanvas: function( context ) {

        var position = this.position,
            size     = this.size;

        if ( !this.loaded ) {
            $.console.warn(
                "Attempting to draw tile %s when it's not yet loaded.",
                this.toString()
            );
            return;
        }

        context.globalAlpha = this.opacity;
        context.drawImage( this.image, position.x, position.y, size.x, size.y );
    },

    /**
     * Removes tile from it's contianer.
     * @function
     */
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

    /**
     * An enumeration of positions that an overlay may be assigned relative
     * to the viewport including CENTER, TOP_LEFT (default), TOP, TOP_RIGHT,
     * RIGHT, BOTTOM_RIGHT, BOTTOM, BOTTOM_LEFT, and LEFT.
     * @static
     */
    $.OverlayPlacement = {
        CENTER:       0,
        TOP_LEFT:     1,
        TOP:          2,
        TOP_RIGHT:    3,
        RIGHT:        4,
        BOTTOM_RIGHT: 5,
        BOTTOM:       6,
        BOTTOM_LEFT:  7,
        LEFT:         8
    };

    /**
     * @class
     */
    $.Overlay = function( elmt, location, placement ) {
        this.elmt       = elmt;
        this.scales     = location instanceof $.Rect;
        this.bounds     = new $.Rect(
            location.x, 
            location.y,
            location.width, 
            location.height
        );
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

        adjust: function( position, size ) {
            switch ( this.placement ) {
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
            var element = this.elmt,
                style   = this.style;

            if ( element.parentNode ) {
                element.parentNode.removeChild( element );
            }

            style.top = "";
            style.left = "";
            style.position = "";

            if ( this.scales ) {
                style.width = "";
                style.height = "";
            }
        },

        drawHTML: function( container ) {
            var element = this.elmt,
                style   = this.style,
                scales  = this.scales,
                position,
                size;

            if ( element.parentNode != container ) {
                container.appendChild( element );
            }

            if ( !scales ) {
                this.size = $.getElementSize( element );
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

        update: function( location, placement ) {
            this.scales     = location instanceof $.Rect;
            this.bounds     = new $.Rect( 
                location.x, 
                location.y, 
                location.width, 
                location.height
            );
            // rects are always top-left
            this.placement  = location instanceof $.Point ?
                placement : 
                $.OverlayPlacement.TOP_LEFT;    
        }

    };

}( OpenSeadragon ));

(function( $ ){
    
    // the max number of images we should keep in memory
var QUOTA               = 100,
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

    USE_CANVAS = $.isFunction( document.createElement( "canvas" ).getContext ) &&
        SUBPIXEL_RENDERING;

/**
 * @class
 * @param {OpenSeadragon.TileSource} source - Reference to Viewer tile source.
 * @param {OpenSeadragon.Viewport} viewport - Reference to Viewer viewport.
 * @param {Element} element - Reference to Viewer 'canvas'.
 * @property {OpenSeadragon.TileSource} source - Reference to Viewer tile source.
 * @property {OpenSeadragon.Viewport} viewport - Reference to Viewer viewport.
 * @property {Element} container -Reference to Viewer 'canvas'.
 * @property {Element|Canvas} canvas
 * @property {CanvasContext} context
 * @property {Object} config - Reference to Viewer config.
 * @property {Number} downloading - How many images are currently being loaded in parallel.
 * @property {Number} normHeight - Ratio of zoomable image height to width.
 * @property {Object} tilesMatrix A '3d' dictionary [level][x][y] --> Tile.
 * @property {Array} tilesLoaded An unordered list of Tiles with loaded images.
 * @property {Object} coverage '3d' dictionary [level][x][y] --> Boolean.
 * @property {Array} overlays An unordered list of Overlays added.
 * @property {Array} lastDrawn An unordered list of Tiles drawn last frame.
 * @property {Number} lastResetTime
 * @property {Boolean} midUpdate Is the drawer currently updating the viewport.
 * @property {Boolean} updateAgain Does the drawer need to update the viewort again.
 * @property {Element} elmt DEPRECATED Alias for container.
 */
$.Drawer = function( source, viewport, element ) {

    this.viewport   = viewport;
    this.source     = source;
    this.container  = $.getElement( element );
    this.canvas     = $.makeNeutralElement( USE_CANVAS ? "canvas" : "div" );
    this.context    = USE_CANVAS ? this.canvas.getContext( "2d" ) : null;
    this.config     = this.viewport.config;
    this.normHeight = source.dimensions.y / source.dimensions.x;

    this.downloading        = 0;
    this.tilesMatrix        = {};
    this.tilesLoaded        = [];
    this.coverage           = {};
    this.overlays           = [];
    this.lastDrawn          = [];
    this.lastResetTime      = 0;
    this.midUpdate          = false;
    this.updateAgain        = true;
    this.elmt               = this.container;
    
    this.canvas.style.width     = "100%";
    this.canvas.style.height    = "100%";
    this.canvas.style.position  = "absolute";
    
    // explicit left-align
    this.container.style.textAlign = "left";
    this.container.appendChild( this.canvas );

    //this.profiler    = new $.Profiler();
};

$.Drawer.prototype = {

    addOverlay: function( element, location, placement ) {
        element = $.getElement( element );

        if ( getOverlayIndex( this.overlays, element ) >= 0 ) {
            // they're trying to add a duplicate overlay
            return;     
        }

        this.overlays.push( new $.Overlay( element, location, placement ) );
        this.updateAgain = true;
    },

    updateOverlay: function( element, location, placement ) {
        var i;

        element = $.getElement( element );
        i = getOverlayIndex( this.overlays, element );

        if ( i >= 0 ) {
            this.overlays[ i ].update( location, placement );
            this.updateAgain = true;
        }
    },

    removeOverlay: function( element ) {
        var i;

        element = $.getElement( element );
        i = getOverlayIndex( this.overlays, element );

        if ( i >= 0 ) {
            this.overlays[ i ].destroy();
            this.overlays.splice( i, 1 );
            this.updateAgain = true;
        }
    },

    clearOverlays: function() {
        while ( this.overlays.length > 0 ) {
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
        clearTiles( this );
        this.lastResetTime = +new Date();
        this.updateAgain = true;
    },

    update: function() {
        //this.profiler.beginUpdate();
        this.midUpdate = true;
        updateViewport( this );
        this.midUpdate = false;
        //this.profiler.endUpdate();
    },

    loadImage: function( src, callback ) {
        var _this = this,
            loading = false,
            image,
            jobid,
            complete;

        if ( !this.config.imageLoaderLimit || 
              this.downloading < this.config.imageLoaderLimit ) {
            
            this.downloading++;

            image = new Image();

            complete = function( imagesrc ){
                _this.downloading--;
                if (typeof ( callback ) == "function") {
                    try {
                        callback( image );
                    } catch ( e ) {
                        $.console.error(
                            "%s while executing %s callback: %s", 
                            e.name,
                            src,
                            e.message,
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

/**
 * @private
 * @inner
 * Pretty much every other line in this needs to be documented so its clear
 * how each piece of this routine contributes to the drawing process.  That's
 * why there are so many TODO's inside this function.
 */
function updateViewport( drawer ) {
    drawer.updateAgain = false;

    var tile,
        level,
        best            = null,
        haveDrawn       = false,
        currentTime     = +new Date(),
        viewportSize    = drawer.viewport.getContainerSize(),
        viewportBounds  = drawer.viewport.getBounds( true ),
        viewportTL      = viewportBounds.getTopLeft(),
        viewportBR      = viewportBounds.getBottomRight(),
        zeroRatioC      = drawer.viewport.deltaPixelsFromPoints( 
            drawer.source.getPixelRatio( 0 ), 
            true
        ).x,
        lowestLevel     = Math.max(
            drawer.source.minLevel, 
            Math.floor( 
                Math.log( drawer.config.minZoomImageRatio ) / 
                Math.log( 2 )
            )
        ),
        highestLevel    = Math.min(
            drawer.source.maxLevel,
            Math.floor( 
                Math.log( zeroRatioC / MIN_PIXEL_RATIO ) / 
                Math.log( 2 )
            )
        );

    //TODO
    while ( drawer.lastDrawn.length > 0 ) {
        tile = drawer.lastDrawn.pop();
        tile.beingDrawn = false;
    }

    //TODO
    drawer.canvas.innerHTML   = "";
    if ( USE_CANVAS ) {
        drawer.canvas.width   = viewportSize.x;
        drawer.canvas.height  = viewportSize.y;
        drawer.context.clearRect( 0, 0, viewportSize.x, viewportSize.y );
    }

    //TODO
    if  ( !drawer.config.wrapHorizontal && 
        ( viewportBR.x < 0 || viewportTL.x > 1 ) ) {
        return;
    } else if 
        ( !drawer.config.wrapVertical &&
        ( viewportBR.y < 0 || viewportTL.y > drawer.normHeight ) ) {
        return;
    }

    //TODO
    if ( !drawer.config.wrapHorizontal ) {
        viewportTL.x = Math.max( viewportTL.x, 0 );
        viewportBR.x = Math.min( viewportBR.x, 1 );
    }
    if ( !drawer.config.wrapVertical ) {
        viewportTL.y = Math.max( viewportTL.y, 0 );
        viewportBR.y = Math.min( viewportBR.y, drawer.normHeight );
    }

    //TODO
    lowestLevel = Math.min( lowestLevel, highestLevel );

    //TODO
    for ( level = highestLevel; level >= lowestLevel; level-- ) {

        //TODO
        best = updateLevel(
            drawer, 
            level, 
            lowestLevel, 
            viewportTL, 
            viewportBR, 
            currentTime, 
            best 
        );

        //TODO
        if (  providesCoverage( drawer.coverage, level ) ) {
            break;
        }
    }

    //TODO
    drawTiles( drawer, drawer.lastDrawn );
    drawOverlays( drawer.viewport, drawer.overlays, drawer.container );

    //TODO
    if ( best ) {
        loadTile( drawer, best, currentTime );
        // because we haven't finished drawing, so
        drawer.updateAgain = true; 
    }
};


function updateLevel( drawer, level, lowestLevel, viewportTL, viewportBR, currentTime, best ){
    var x, y,
        tileTL,
        tileBR,
        numberOfTiles,
        levelOpacity,
        levelVisibility,
        renderPixelRatioC,
        renderPixelRatioT,
        haveDrawn       = false,
        drawLevel       = false,
        viewportCenter  = drawer.viewport.pixelFromPoint( drawer.viewport.getCenter() ),
        zeroRatioT      = drawer.viewport.deltaPixelsFromPoints( 
            drawer.source.getPixelRatio( 0 ), 
            false
        ).x,
        optimalRatio    = drawer.config.immediateRender ? 
            1 : 
            zeroRatioT;

    //Avoid calculations for draw if we have already drawn this
    renderPixelRatioC = drawer.viewport.deltaPixelsFromPoints(
        drawer.source.getPixelRatio( level ), 
        true
    ).x;

    if ( ( !haveDrawn && renderPixelRatioC >= MIN_PIXEL_RATIO ) ||
         ( level == lowestLevel ) ) {
        drawLevel = true;
        haveDrawn = true;
    } else if ( !haveDrawn ) {
        return best;
    }

    //OK, a new drawing so do your calculations
    tileTL    = drawer.source.getTileAtPoint( level, viewportTL );
    tileBR    = drawer.source.getTileAtPoint( level, viewportBR );
    numberOfTiles  = drawer.source.getNumTiles( level );

    renderPixelRatioT = drawer.viewport.deltaPixelsFromPoints(
        drawer.source.getPixelRatio( level ), 
        false
    ).x;

    levelOpacity    = Math.min( 1, ( renderPixelRatioC - 0.5 ) / 0.5 );
    levelVisibility = optimalRatio / Math.abs( 
        optimalRatio - renderPixelRatioT 
    );

    resetCoverage( drawer.coverage, level );

    if ( !drawer.config.wrapHorizontal ) {
        tileBR.x = Math.min( tileBR.x, numberOfTiles.x - 1 );
    }
    if ( !drawer.config.wrapVertical ) {
        tileBR.y = Math.min( tileBR.y, numberOfTiles.y - 1 );
    }

    for ( x = tileTL.x; x <= tileBR.x; x++ ) {
        for ( y = tileTL.y; y <= tileBR.y; y++ ) {

            best = updateTile( 
                drawer,
                drawLevel,
                haveDrawn,
                x, y,
                level,
                levelOpacity,
                levelVisibility,
                viewportCenter,
                numberOfTiles,
                currentTime,
                best
            );

        }
    }
    return best;
};

function updateTile( drawer, drawLevel, haveDrawn, x, y, level, levelOpacity, levelVisibility, viewportCenter, numberOfTiles, currentTime, best){
    
    var tile = getTile( 
            x, y, 
            level, 
            drawer.source,
            drawer.tilesMatrix,
            currentTime, 
            numberOfTiles, 
            drawer.normHeight 
        ),
        drawTile = drawLevel;

    setCoverage( drawer.coverage, level, x, y, false );

    if ( !tile.exists ) {
        return best;
    }

    if ( haveDrawn && !drawTile ) {
        if ( isCovered( drawer.coverage, level, x, y ) ) {
            setCoverage( drawer.coverage, level, x, y, true );
        } else {
            drawTile = true;
        }
    }

    if ( !drawTile ) {
        return best;
    }

    positionTile( 
        tile, 
        drawer.source.tileOverlap,
        drawer.viewport,
        viewportCenter, 
        levelVisibility 
    );

    if ( tile.loaded ) {
        
        drawer.updateAgain = blendTile(
            drawer,
            tile, 
            x, y,
            level,
            levelOpacity, 
            currentTime 
        );

    } else if ( tile.Loading ) {
        //TODO: .Loading is never defined... did they mean .loading?
        //      but they didnt do anything so what is this block if
        //      if it does nothing?
    } else {
        best = compareTiles( best, tile );
    }

    return best;
};

function getTile( x, y, level, tileSource, tilesMatrix, time, numTiles, normHeight ) {
    var xMod,
        yMod,
        bounds,
        exists,
        url,
        tile;

    if ( !tilesMatrix[ level ] ) {
        tilesMatrix[ level ] = {};
    }
    if ( !tilesMatrix[ level ][ x ] ) {
        tilesMatrix[ level ][ x ] = {};
    }

    if ( !tilesMatrix[ level ][ x ][ y ] ) {
        xMod    = ( numTiles.x + ( x % numTiles.x ) ) % numTiles.x;
        yMod    = ( numTiles.y + ( y % numTiles.y ) ) % numTiles.y;
        bounds  = tileSource.getTileBounds( level, xMod, yMod );
        exists  = tileSource.tileExists( level, xMod, yMod );
        url     = tileSource.getTileUrl( level, xMod, yMod );

        bounds.x += 1.0 * ( x - xMod ) / numTiles.x;
        bounds.y += normHeight * ( y - yMod ) / numTiles.y;

        tilesMatrix[ level ][ x ][ y ] = new $.Tile(
            level, 
            x, 
            y, 
            bounds, 
            exists, 
            url
        );
    }

    tile = tilesMatrix[ level ][ x ][ y ];
    tile.lastTouchTime = time;

    return tile;
};


function loadTile( drawer, tile, time ) {
    tile.loading = drawer.loadImage(
        tile.url,
        function( image ){
            onTileLoad( drawer, tile, time, image );
        }
    );
};

function onTileLoad( drawer, tile, time, image ) {
    var insertionIndex,
        cutoff,
        worstTile,
        worstTime,
        worstLevel,
        worstTileIndex,
        prevTile,
        prevTime,
        prevLevel,
        i;

    tile.loading = false;

    if ( drawer.midUpdate ) {
        $.console.warn( "Tile load callback in middle of drawing routine." );
        return;
    } else if ( !image ) {
        $.console.log( "Tile %s failed to load: %s", tile, tile.url );
        tile.exists = false;
        return;
    } else if ( time < drawer.lastResetTime ) {
        $.console.log( "Ignoring tile %s loaded before reset: %s", tile, tile.url );
        return;
    }

    tile.loaded = true;
    tile.image  = image;

    insertionIndex = drawer.tilesLoaded.length;

    if ( drawer.tilesLoaded.length >= QUOTA ) {
        cutoff = Math.ceil( Math.log( drawer.source.tileSize ) / Math.log( 2 ) );

        worstTile       = null;
        worstTileIndex  = -1;

        for ( i = drawer.tilesLoaded.length - 1; i >= 0; i-- ) {
            prevTile = drawer.tilesLoaded[ i ];

            if ( prevTile.level <= drawer.cutoff || prevTile.beingDrawn ) {
                continue;
            } else if ( !worstTile ) {
                worstTile       = prevTile;
                worstTileIndex  = i;
                continue;
            }

            prevTime    = prevTile.lastTouchTime;
            worstTime   = worstTile.lastTouchTime;
            prevLevel   = prevTile.level;
            worstLevel  = worstTile.level;

            if ( prevTime < worstTime || 
               ( prevTime == worstTime && prevLevel > worstLevel ) ) {
                worstTile       = prevTile;
                worstTileIndex  = i;
            }
        }

        if ( worstTile && worstTileIndex >= 0 ) {
            worstTile.unload();
            insertionIndex = worstTileIndex;
        }
    }

    drawer.tilesLoaded[ insertionIndex ] = tile;
    drawer.updateAgain = true;
};


function positionTile( tile, overlap, viewport, viewportCenter, levelVisibility ){
    var boundsTL     = tile.bounds.getTopLeft(),
        boundsSize   = tile.bounds.getSize(),
        positionC    = viewport.pixelFromPoint( boundsTL, true ),
        positionT    = viewport.pixelFromPoint( boundsTL, false ),
        sizeC        = viewport.deltaPixelsFromPoints( boundsSize, true ),
        sizeT        = viewport.deltaPixelsFromPoints( boundsSize, false ),
        tileCenter   = positionT.plus( sizeT.divide( 2 ) ),
        tileDistance = viewportCenter.distanceTo( tileCenter );

    if ( !overlap ) {
        sizeC = sizeC.plus( new $.Point( 1, 1 ) );
    }

    tile.position   = positionC;
    tile.size       = sizeC;
    tile.distance   = tileDistance;
    tile.visibility = levelVisibility;
};


function blendTile( drawer, tile, x, y, level, levelOpacity, currentTime ){
    var blendTimeMillis = 1000 * drawer.config.blendTime,
        deltaTime,
        opacity;

    if ( !tile.blendStart ) {
        tile.blendStart = currentTime;
    }

    deltaTime   = currentTime - tile.blendStart;
    opacity     = Math.min( 1, deltaTime / blendTimeMillis );
    
    if ( drawer.config.alwaysBlend ) {
        opacity *= levelOpacity;
    }

    tile.opacity = opacity;

    drawer.lastDrawn.push( tile );

    if ( opacity == 1 ) {
        setCoverage( drawer.coverage, level, x, y, true );
    } else if ( deltaTime < blendTimeMillis ) {
        return true;
    }

    return false;
};


function clearTiles( drawer ) {
    drawer.tilesMatrix = {};
    drawer.tilesLoaded = [];
};

/**
 * @private
 * @inner
 * Returns true if the given tile provides coverage to lower-level tiles of
 * lower resolution representing the same content. If neither x nor y is
 * given, returns true if the entire visible level provides coverage.
 * 
 * Note that out-of-bounds tiles provide coverage in this sense, since
 * there's no content that they would need to cover. Tiles at non-existent
 * levels that are within the image bounds, however, do not.
 */
function providesCoverage( coverage, level, x, y ) {
    var rows,
        cols,
        i, j;

    if ( !coverage[ level ] ) {
        return false;
    }

    if ( x === undefined || y === undefined ) {
        rows = coverage[ level ];
        for ( i in rows ) {
            if ( rows.hasOwnProperty( i ) ) {
                cols = rows[ i ];
                for ( j in cols ) {
                    if ( cols.hasOwnProperty( j ) && !cols[ j ] ) {
                        return false;
                    }
                }
            }
        }

        return true;
    }

    return (
        coverage[ level ][ x] === undefined ||
        coverage[ level ][ x ][ y ] === undefined ||
        coverage[ level ][ x ][ y ] === true
    );
};

/**
 * @private
 * @inner
 * Returns true if the given tile is completely covered by higher-level
 * tiles of higher resolution representing the same content. If neither x
 * nor y is given, returns true if the entire visible level is covered.
 */
function isCovered( coverage, level, x, y ) {
    if ( x === undefined || y === undefined ) {
        return providesCoverage( coverage, level + 1 );
    } else {
        return (
             providesCoverage( coverage, level + 1, 2 * x, 2 * y ) &&
             providesCoverage( coverage, level + 1, 2 * x, 2 * y + 1 ) &&
             providesCoverage( coverage, level + 1, 2 * x + 1, 2 * y ) &&
             providesCoverage( coverage, level + 1, 2 * x + 1, 2 * y + 1 )
        );
    }
};

/**
 * @private
 * @inner
 * Sets whether the given tile provides coverage or not.
 */
function setCoverage( coverage, level, x, y, covers ) {
    if ( !coverage[ level ] ) {
        $.console.warn(
            "Setting coverage for a tile before its level's coverage has been reset: %s", 
            level
        );
        return;
    }

    if ( !coverage[ level ][ x ] ) {
        coverage[ level ][ x ] = {};
    }

    coverage[ level ][ x ][ y ] = covers;
};

/**
 * @private
 * @inner
 * Resets coverage information for the given level. This should be called
 * after every draw routine. Note that at the beginning of the next draw
 * routine, coverage for every visible tile should be explicitly set. 
 */
function resetCoverage( coverage, level ) {
    coverage[ level ] = {};
};

/**
 * @private
 * @inner
 * Determines the 'z-index' of the given overlay.  Overlays are ordered in
 * a z-index based on the order they are added to the Drawer.
 */
function getOverlayIndex( overlays, element ) {
    var i;
    for ( i = overlays.length - 1; i >= 0; i-- ) {
        if ( overlays[ i ].elmt == element ) {
            return i;
        }
    }

    return -1;
};

/**
 * @private
 * @inner
 * Determines whether the 'last best' tile for the area is better than the 
 * tile in question.
 */
function compareTiles( previousBest, tile ) {
    if ( !previousBest ) {
        return tile;
    }

    if ( tile.visibility > previousBest.visibility ) {
        return tile;
    } else if ( tile.visibility == previousBest.visibility ) {
        if ( tile.distance < previousBest.distance ) {
            return tile;
        }
    }

    return previousBest;
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


function drawOverlays( viewport, overlays, container ){
    var i,
        length = overlays.length;
    for ( i = 0; i < length; i++ ) {
        drawOverlay( viewport, overlays[ i ], container );
    }
};

function drawOverlay( viewport, overlay, container ){

    overlay.position = viewport.pixelFromPoint(
        overlay.bounds.getTopLeft(), 
        true
    );
    overlay.size     = viewport.deltaPixelsFromPoints(
        overlay.bounds.getSize(), 
        true
    );
    overlay.drawHTML( container );
};

function drawTiles( drawer, lastDrawn ){
    var i, 
        tile;

    for ( i = lastDrawn.length - 1; i >= 0; i-- ) {
        tile = lastDrawn[ i ];

        //TODO: get rid of this if by determining the tile draw method once up
        //      front and defining the appropriate 'draw' function
        if ( USE_CANVAS ) {
            tile.drawCanvas( drawer.context );
        } else {
            tile.drawHTML( drawer.canvas );
        }

        tile.beingDrawn = true;
    }
};

}( OpenSeadragon ));

(function( $ ){


/**
 * @class
 */
$.Viewport = function( options ) {

    var options;

    if(  arguments.length && arguments[ 0 ] instanceof $.Point ){
        options = {
            containerSize:      arguments[ 0 ],
            contentSize:        arguments[ 1 ],
            config:             arguments[ 2 ]
        };
    } else {
        options = arguments[ 0 ];
    }

    //TODO: this.config is something that should go away but currently the 
    //      Drawer references the viewport.config
    this.config        = options.config;
    this.zoomPoint     = null;
    this.containerSize = options.containerSize;
    this.contentSize   = options.contentSize;
    this.contentAspect = this.contentSize.x / this.contentSize.y;
    this.contentHeight = this.contentSize.y / this.contentSize.x;
    this.centerSpringX = new $.Spring({
        initial: 0, 
        springStiffness: this.config.springStiffness,
        animationTime:   this.config.animationTime
    });
    this.centerSpringY = new $.Spring({
        initial: 0, 
        springStiffness: this.config.springStiffness,
        animationTime:   this.config.animationTime
    });
    this.zoomSpring = new $.Spring({
        initial: 1, 
        springStiffness: this.config.springStiffness,
        animationTime:   this.config.animationTime
    });
    this.minZoomImageRatio = this.config.minZoomImageRatio;
    this.maxZoomPixelRatio = this.config.maxZoomPixelRatio;
    this.visibilityRatio   = this.config.visibilityRatio;
    this.wrapHorizontal    = this.config.wrapHorizontal;
    this.wrapVertical      = this.config.wrapVertical;
    this.homeBounds = new $.Rect( 0, 0, 1, this.contentHeight );
    this.goHome( true );
    this.update();
};

$.Viewport.prototype = {

    getHomeZoom: function() {
        var aspectFactor = this.contentAspect / this.getAspectRatio();
        return ( aspectFactor >= 1 ) ? 
            1 : 
            aspectFactor;
    },

    getMinZoom: function() {
        var homeZoom = this.getHomeZoom()
            zoom = this.minZoomImageRatio * homeZoom;

        return Math.min( zoom, homeZoom );
    },

    getMaxZoom: function() {
        var zoom = 
            this.contentSize.x * 
            this.maxZoomPixelRatio / 
            this.containerSize.x;
        return Math.max( zoom, this.getHomeZoom() );
    },

    getAspectRatio: function() {
        return this.containerSize.x / this.containerSize.y;
    },

    getContainerSize: function() {
        return new $.Point(
            this.containerSize.x, 
            this.containerSize.y
        );
    },

    getBounds: function( current ) {
        var center = this.getCenter( current ),
            width  = 1.0 / this.getZoom( current ),
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

        if ( current ) {
            return centerCurrent;
        } else if ( !this.zoomPoint ) {
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

    /**
     * 
     */
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

        if ( newBounds.getAspectRatio() >= aspect ) {
            newBounds.height = bounds.width / aspect;
            newBounds.y      = center.y - newBounds.height / 2;
        } else {
            newBounds.width = bounds.height * aspect;
            newBounds.x     = center.x - newBounds.width / 2;
        }

        this.panTo( this.getCenter( true ), true );
        this.zoomTo( this.getZoom( true ), null, true );

        oldBounds = this.getBounds();
        oldZoom   = this.getZoom();
        newZoom   = 1.0 / newBounds.width;
        if ( newZoom == oldZoom || newBounds.width == oldBounds.width ) {
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

    goHome: function( immediately ) {
        var center = this.getCenter();

        if ( this.wrapHorizontal ) {
            center.x = ( 1 + ( center.x % 1 ) ) % 1;
            this.centerSpringX.resetTo( center.x );
            this.centerSpringX.update();
        }

        if ( this.wrapVertical ) {
            center.y = (
                this.contentHeight + ( center.y % this.contentHeight )
            ) % this.contentHeight;
            this.centerSpringY.resetTo( center.y );
            this.centerSpringY.update();
        }

        this.fitBounds( this.homeBounds, immediately );
    },

    panBy: function( delta, immediately ) {
        var center = new $.Point(
            this.centerSpringX.target.value,
            this.centerSpringY.target.value
        );
        this.panTo( center.plus( delta ), immediately );
    },

    panTo: function( center, immediately ) {
        if ( immediately ) {
            this.centerSpringX.resetTo( center.x );
            this.centerSpringY.resetTo( center.y );
        } else {
            this.centerSpringX.springTo( center.x );
            this.centerSpringY.springTo( center.y );
        }
    },

    zoomBy: function( factor, refPoint, immediately ) {
        this.zoomTo( this.zoomSpring.target.value * factor, refPoint, immediately );
    },

    zoomTo: function( zoom, refPoint, immediately ) {

        if ( immediately ) {
            this.zoomSpring.resetTo( zoom );
        } else {        
            this.zoomSpring.springTo( zoom );
        }

        this.zoomPoint = refPoint instanceof $.Point ? 
            refPoint : 
            null;
    },

    resize: function( newContainerSize, maintain ) {
        var oldBounds = this.getBounds(),
            newBounds = oldBounds,
            widthDeltaFactor = newContainerSize.x / this.containerSize.x;

        this.containerSize = new $.Point(
            newContainerSize.x, 
            newContainerSize.y
        );

        if (maintain) {
            newBounds.width  = oldBounds.width * widthDeltaFactor;
            newBounds.height = newBounds.width / this.getAspectRatio();
        }

        this.fitBounds( newBounds, true );
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
            oldZoomPixel = this.pixelFromPoint( this.zoomPoint, true );
        }

        this.zoomSpring.update();

        if (this.zoomPoint && this.zoomSpring.current.value != oldZoom) {
            newZoomPixel    = this.pixelFromPoint( this.zoomPoint, true );
            deltaZoomPixels = newZoomPixel.minus( oldZoomPixel );
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


    deltaPixelsFromPoints: function( deltaPoints, current ) {
        return deltaPoints.times(
            this.containerSize.x * this.getZoom( current )
        );
    },

    deltaPointsFromPixels: function( deltaPixels, current ) {
        return deltaPixels.divide(
            this.containerSize.x * this.getZoom( current )
        );
    },

    pixelFromPoint: function( point, current ) {
        var bounds = this.getBounds( current );
        return point.minus(
            bounds.getTopLeft()
        ).times(
            this.containerSize.x / bounds.width
        );
    },

    pointFromPixel: function( pixel, current ) {
        var bounds = this.getBounds( current );
        return pixel.divide(
            this.containerSize.x / bounds.width
        ).plus(
            bounds.getTopLeft()
        );
    }
};

}( OpenSeadragon ));
