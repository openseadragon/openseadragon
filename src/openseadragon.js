/**
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
 * @author <br/>(c) 2011, 2012 Christopher Thatcher 
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
 * ---------------------------------------------------------------------------
 * </pre>
 * </p>
 * <p>
 * <strong> Work done by Chris Thatcher adds an MIT license </strong><br/>
 * <pre>
 * ----------------------------------------------------------------------------
 * (c) Christopher Thatcher 2011, 2012. All rights reserved.
 * 
 * Licensed with the MIT License
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * ---------------------------------------------------------------------------
 * </pre>
 * </p>
 **/

 /** 
  * The root namespace for OpenSeadragon, this function also serves as a single
  * point of instantiation for an {@link OpenSeadragon.Viewer}, including all 
  * combinations of out-of-the-box configurable features.  All utility methods 
  * and classes are defined on or below this namespace. 
  *
  * @namespace
  * @function
  * @name OpenSeadragon
  * @exports $ as OpenSeadragon
  *
  * @param {Object} options All required and optional settings for instantiating
  *     a new instance of an OpenSeadragon image viewer. 
  *
  * @param {String} options.xmlPath 
  *     DEPRECATED. A relative path to load a DZI file from the server. 
  *     Prefer the newer options.tileSources.
  *
  * @param {Array|String|Function|Object[]|Array[]|String[]|Function[]} options.tileSources
  *     As an Array, the tileSource can hold either be all Objects or mixed 
  *     types of Arrays of Objects, String, Function. When a value is a String, 
  *     the tileSource is used to create a {@link OpenSeadragon.DziTileSource}.  
  *     When a value is a Function, the function is used to create a new 
  *     {@link OpenSeadragon.TileSource} whose abstract method 
  *     getUrl( level, x, y ) is implemented by the function. Finally, when it 
  *     is an Array of objects, it is used to create a 
  *     {@link OpenSeadragon.LegacyTileSource}.
  *
  * @param {Boolean} [options.debugMode=true]
  *     Currently does nothing. TODO: provide an in-screen panel providing event
  *     detail feedback.
  *
  * @param {Number} [options.animationTime=1.5]
  *     Specifies the animation duration per each {@link OpenSeadragon.Spring}
  *     which occur when the image is dragged or zoomed.
  *
  * @param {Number} [options.blendTime=0.5] 
  *     Specifies the duration of animation as higher or lower level tiles are
  *     replacing the existing tile.
  *
  * @param {Boolean} [options.alwaysBlend=false]
  *     Forces the tile to always blend.  By default the tiles skip blending
  *     when the blendTime is surpassed and the current animation frame would
  *     not complete the blend.
  *
  * @param {Boolean} [options.autoHideControls=true]
  *     If the user stops interacting with the viewport, fade the navigation 
  *     controls.  Useful for presentation since the controls are by default
  *     floated on top of the image the user is viewing.
  *
  * @param {Boolean} [options.immediateRender=false]
  *     Render the best closest level first, ignoring the lowering levels which
  *     provide the effect of very blurry to sharp. It is recommended to change 
  *     setting to true for mobile devices.
  *
  * @param {Boolean} [options.wrapHorizontal=false]
  *     Set to true to force the image to wrap horizontally within the viewport.
  *     Useful for maps or images representing the surface of a sphere or cylinder.
  *
  * @param {Boolean} [options.wrapVertical=false]
  *     Set to true to force the image to wrap vertically within the viewport.
  *     Useful for maps or images representing the surface of a sphere or cylinder.
  *
  * @param {Number} [options.minZoomImageRatio=0.8]
  *     The minimum percentage ( expressed as a number between 0 and 1 ) of 
  *     the viewport height or width at which the zoom out will be constrained.
  *     Setting it to 0, for example will allow you to zoom out infinitly.
  *
  * @param {Number} [options.maxZoomPixelRatio=2]
  *     The maximum ratio to allow a zoom-in to affect the highest level pixel
  *     ratio. This can be set to Infinity to allow 'infinite' zooming into the
  *     image though it is less effective visually if the HTML5 Canvas is not 
  *     availble on the viewing device.
  *
  * @param {Number} [options.visibilityRatio=0.5]
  *     The percentage ( as a number from 0 to 1 ) of the source image which
  *     must be kept within the viewport.  If the image is dragged beyond that
  *     limit, it will 'bounce' back until the minimum visibility ration is 
  *     achieved.  Setting this to 0 and wrapHorizontal ( or wrapVertical ) to
  *     true will provide the effect of an infinitely scrolling viewport.
  *
  * @param {Number} [options.springStiffness=5.0]
  *
  * @param {Number} [options.imageLoaderLimit=0]
  *     The maximum number of image requests to make concurrently.  By default
  *     it is set to 0 allowing the browser to make the maximum number of
  *     image requests in parallel as allowed by the browsers policy.
  *
  * @param {Number} [options.clickTimeThreshold=200]
  *     If multiple mouse clicks occurs within less than this number of 
  *     milliseconds, treat them as a single click.
  *
  * @param {Number} [options.clickDistThreshold=5]
  *     If a mouse or touch drag occurs and the distance to the starting drag
  *     point is less than this many pixels, ignore the drag event.
  *
  * @param {Number} [options.zoomPerClick=2.0]
  *     The "zoom distance" per mouse click or touch tap.
  *
  * @param {Number} [options.zoomPerScroll=1.2]
  *     The "zoom distance" per mouse scroll or touch pinch.
  *
  * @param {Number} [options.zoomPerSecond=2.0]
  *     The number of seconds to animate a single zoom event over.
  *
  * @param {Boolean} [options.showNavigationControl=true]
  *     Set to false to prevent the appearance of the default navigation controls.
  *
  * @param {Number} [options.controlsFadeDelay=2000]
  *     The number of milliseconds to wait once the user has stopped interacting
  *     with the interface before begining to fade the controls. Assumes
  *     showNavigationControl and autoHideControls are both true.
  *
  * @param {Number} [options.controlsFadeLength=1500]
  *     The number of milliseconds to animate the controls fading out.
  *
  * @param {Number} [options.maxImageCacheCount=100]
  *     The max number of images we should keep in memory (per drawer).
  *
  * @param {Number} [options.minPixelRatio=0.5]
  *     The higher the minPixelRatio, the lower the quality of the image that
  *     is considered sufficient to stop rendering a given zoom level.  For
  *     example, if you are targeting mobile devices with less bandwith you may 
  *     try setting this to 1.5 or higher.
  *
  * @param {Boolean} [options.mouseNavEnabled=true]
  *     Is the user able to interact with the image via mouse or touch. Default 
  *     interactions include draging the image in a plane, and zooming in toward
  *     and away from the image.
  *
  * @param {Boolean} [options.preserveViewport=false]
  *     If the viewer has been configured with a sequence of tile sources, then
  *     normally navigating to through each image resets the viewport to 'home'
  *     position.  If preserveViewport is set to true, then the viewport position
  *     is preserved when navigating between images in the sequence.
  *
  * @param {String} [options.prefixUrl='/images/']
  *     Prepends the prefixUrl to navImages paths, which is very useful
  *     since the default paths are rarely useful for production
  *     environments.
  *
  * @param {Object} [options.navImages=]
  *     An object with a property for each button or other built-in navigation
  *     control, eg the current 'zoomIn', 'zoomOut', 'home', and 'fullpage'.
  *     Each of those in turn provides an image path for each state of the botton
  *     or navigation control, eg 'REST', 'GROUP', 'HOVER', 'PRESS'. Finally the
  *     image paths, by default assume there is a folder on the servers root path
  *     called '/images', eg '/images/zoomin_rest.png'.  If you need to adjust
  *     these paths, prefer setting the option.prefixUrl rather than overriding 
  *     every image path directly through this setting.
  *
  * @returns {OpenSeadragon.Viewer}
  */
window.OpenSeadragon = window.OpenSeadragon || function( options ){
    
    return new OpenSeadragon.Viewer( options );

};

(function( $ ){
    

    /**
     * Taken from jquery 1.6.1
     * [[Class]] -> type pairs
     * @private
     */
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


    /**
     * Taken from jQuery 1.6.1
     * @name $.isFunction
     * @function
     * @see <a href='http://www.jquery.com/'>jQuery</a>
     */
    $.isFunction = function( obj ) {
        return $.type(obj) === "function";
    };


    /**
     * Taken from jQuery 1.6.1
     * @name $.isArray
     * @function
     * @see <a href='http://www.jquery.com/'>jQuery</a>
     */
    $.isArray = Array.isArray || function( obj ) {
        return $.type(obj) === "array";
    };


    /**
     * A crude way of determining if an object is a window.
     * Taken from jQuery 1.6.1
     * @name $.isWindow
     * @function
     * @see <a href='http://www.jquery.com/'>jQuery</a>
     */
    $.isWindow = function( obj ) {
        return obj && typeof obj === "object" && "setInterval" in obj;
    };


    /**
     * Taken from jQuery 1.6.1
     * @name $.type
     * @function
     * @see <a href='http://www.jquery.com/'>jQuery</a>
     */
    $.type = function( obj ) {
        return ( obj === null ) || ( obj === undefined ) ?
            String( obj ) :
            class2type[ toString.call(obj) ] || "object";
    };


    /**
     * Taken from jQuery 1.6.1
     * @name $.isPlainObject
     * @function
     * @see <a href='http://www.jquery.com/'>jQuery</a>
     */
    $.isPlainObject = function( obj ) {
        // Must be an Object.
        // Because of IE, we also have to check the presence of the constructor property.
        // Make sure that DOM nodes and window objects don't pass through, as well
        if ( !obj || OpenSeadragon.type(obj) !== "object" || obj.nodeType || $.isWindow( obj ) ) {
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
    };


    /**
     * Taken from jQuery 1.6.1
     * @name $.isEmptyObject
     * @function
     * @see <a href='http://www.jquery.com/'>jQuery</a>
     */
    $.isEmptyObject = function( obj ) {
        for ( var name in obj ) {
            return false;
        }
        return true;
    };


}( OpenSeadragon ));

/**
 *  This closure defines all static methods available to the OpenSeadragon
 *  namespace.  Many, if not most, are taked directly from jQuery for use
 *  to simplify and reduce common programming patterns.  More static methods 
 *  from jQuery may eventually make their way into this though we are
 *  attempting to avoid substaintial plagarism or the more explicit dependency
 *  on jQuery only because OpenSeadragon is a broadly useful code base and
 *  would be made less broad by requiring jQuery fully.
 *
 *  Some static methods have also been refactored from the original OpenSeadragon 
 *  project.
 */
(function( $ ){

    /**
     * Taken from jQuery 1.6.1
     * @see <a href='http://www.jquery.com/'>jQuery</a>
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
            options = arguments[ i ];
            if ( options !== null || options !== undefined ) {
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
    

    $.extend( $, {
        /**
         * These are the default values for the optional settings documented
         * in the {@link OpenSeadragon} constructor detail.
         * @name $.DEFAULT_SETTINGS
         * @static
         */
        DEFAULT_SETTINGS: {
            //DATA SOURCE DETAILS
            xmlPath:                null,
            tileSources:            null, 
            tileHost:               null,
            
            //PAN AND ZOOM SETTINGS AND CONSTRAINTS
            panHorizontal:          true,
            panVertical:            true,
            constrainDuringPan:     false,
            wrapHorizontal:         false,
            wrapVertical:           false,
            visibilityRatio:        0.5,
            minPixelRatio:          0.5,
            minZoomImageRatio:      0.8,
            maxZoomPixelRatio:      2,
            defaultZoomLevel:       0,
            minZoomLevel:           null,
            maxZoomLevel:           null, 

            //UI RESPONSIVENESS AND FEEL
            springStiffness:        5.0,
            clickTimeThreshold:     300,
            clickDistThreshold:     5,
            zoomPerClick:           2.0,
            zoomPerScroll:          1.2,
            zoomPerSecond:          2.0,
            animationTime:          1.5,
            blendTime:              1.5,
            alwaysBlend:            false,
            autoHideControls:       true,
            immediateRender:        false,

            //DEFAULT CONTROL SETTINGS
            showSequenceControl:    true,  //SEQUENCE
            preserveViewport:       false, //SEQUENCE
            showNavigationControl:  true,  //ZOOM/HOME/FULL/SEQUENCE
            controlsFadeDelay:      2000,  //ZOOM/HOME/FULL/SEQUENCE
            controlsFadeLength:     1500,  //ZOOM/HOME/FULL/SEQUENCE
            mouseNavEnabled:        true,  //GENERAL MOUSE INTERACTIVITY

            //VIEWPORT NAVIGATOR SETTINGS
            showNavigator:          true, //promoted to default in 0.9.64
            navigatorElement:       null,
            navigatorHeight:        null,
            navigatorWidth:         null,
            navigatorPosition:      null,
            navigatorSizeRatio:     0.2,

            //REFERENCE STRIP SETTINGS
            showReferenceStrip:          false, 
            referenceStripScroll:       'horizontal',
            referenceStripElement:       null,
            referenceStripHeight:        null,
            referenceStripWidth:         null,
            referenceStripPosition:      'BOTTOM_LEFT',
            referenceStripSizeRatio:     0.2,

            //COLLECTION VISUALIZATION SETTINGS
            collectionRows:         3, //or columns depending on layout
            collectionLayout:       'horizontal', //vertical
            collectionMode:         false,
            collectionTileSize:     800,

            //EVENT RELATED CALLBACKS
            onPageChange:           null, 
            
            //PERFORMANCE SETTINGS
            imageLoaderLimit:       0,
            maxImageCacheCount:     200,
            timeout:                5000,

            //INTERFACE RESOURCE SETTINGS
            prefixUrl:              "/images/",
            navImages: {
                zoomIn: {
                    REST:   'zoomin_rest.png',
                    GROUP:  'zoomin_grouphover.png',
                    HOVER:  'zoomin_hover.png',
                    DOWN:   'zoomin_pressed.png'
                },
                zoomOut: {
                    REST:   'zoomout_rest.png',
                    GROUP:  'zoomout_grouphover.png',
                    HOVER:  'zoomout_hover.png',
                    DOWN:   'zoomout_pressed.png'
                },
                home: {
                    REST:   'home_rest.png',
                    GROUP:  'home_grouphover.png',
                    HOVER:  'home_hover.png',
                    DOWN:   'home_pressed.png'
                },
                fullpage: {
                    REST:   'fullpage_rest.png',
                    GROUP:  'fullpage_grouphover.png',
                    HOVER:  'fullpage_hover.png',
                    DOWN:   'fullpage_pressed.png'
                },
                previous: {
                    REST:   'previous_rest.png',
                    GROUP:  'previous_grouphover.png',
                    HOVER:  'previous_hover.png',
                    DOWN:   'previous_pressed.png'
                },
                next: {
                    REST:   'next_rest.png',
                    GROUP:  'next_grouphover.png',
                    HOVER:  'next_hover.png',
                    DOWN:   'next_pressed.png'
                }
            },

            //DEVELOPER SETTINGS
            debugMode:              false,
            debugGridColor:         '#437AB2'
        },


        /**
         * TODO: get rid of this.  I can't see how it's required at all.  Looks
         *       like an early legacy code artifact.
         * @static
         * @ignore
         */
        SIGNAL: "----seadragon----",


        /**
         * Invokes the the method as if it where a method belonging to the object.
         * @name $.delegate
         * @function
         * @param {Object} object 
         * @param {Function} method
         */
        delegate: function( object, method ) {
            return function(){
                var args = arguments;
                if ( args === undefined ){
                    args = [];
                }
                return method.apply( object, args );
            };
        },
        
        
        /**
         * An enumeration of Browser vendors including UNKNOWN, IE, FIREFOX,
         * SAFARI, CHROME, and OPERA.
         * @name $.BROWSERS
         * @static
         */
        BROWSERS: {
            UNKNOWN:    0,
            IE:         1,
            FIREFOX:    2,
            SAFARI:     3,
            CHROME:     4,
            OPERA:      5
        },


        /**
         * Returns a DOM Element for the given id or element.
         * @function
         * @name OpenSeadragon.getElement
         * @param {String|Element} element Accepts an id or element.
         * @returns {Element} The element with the given id, null, or the element itself.
         */
        getElement: function( element ) { 
            if ( typeof ( element ) == "string" ) {
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
        getElementStyle: 
            document.documentElement.currentStyle ? 
            function( element ) {
                element = $.getElement( element );
                return element.currentStyle;
            } : 
            function( element ) {
                element = $.getElement( element );
                return window.getComputedStyle( element, "" );
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
            if( event ){
                $.getEvent = function( event ){
                    return event;
                };
            } else {
                $.getEvent = function( event ){
                    return window.event;
                };
            }
            return $.getEvent( event );
        },


        /**
         * Gets the position of the mouse on the screen for a given event.
         * @function
         * @name OpenSeadragon.getMousePosition
         * @param {Event} [event]
         * @returns {Point}
         */
        getMousePosition: function( event ) {

            if ( typeof( event.pageX ) == "number" ) {
                $.getMousePosition = function( event ){
                    var result = new $.Point();

                    event = $.getEvent( event );
                    result.x = event.pageX;
                    result.y = event.pageY;

                    return result;
                };
            } else if ( typeof( event.clientX ) == "number" ) {
                $.getMousePosition = function( event ){
                    var result = new $.Point();

                    event = $.getEvent( event );
                    result.x = 
                        event.clientX + 
                        document.body.scrollLeft + 
                        document.documentElement.scrollLeft;
                    result.y = 
                        event.clientY + 
                        document.body.scrollTop + 
                        document.documentElement.scrollTop;

                    return result;
                };
            } else {
                throw new Error(
                    "Unknown event mouse position, no known technique."
                );
            }

            return $.getMousePosition( event );
        },


        /**
         * Determines the pages current scroll position.
         * @function
         * @name OpenSeadragon.getPageScroll
         * @returns {Point}
         */
        getPageScroll: function() {
            var docElement  = document.documentElement || {},
                body        = document.body || {};

            if ( typeof( window.pageXOffset ) == "number" ) {
                $.getPageScroll = function(){
                    return new $.Point(
                        window.pageXOffset,
                        window.pageYOffset
                    );
                };
            } else if ( body.scrollLeft || body.scrollTop ) {
                $.getPageScroll = function(){
                    return new $.Point(
                        document.body.scrollLeft,
                        document.body.scrollTop
                    );
                };
            } else if ( docElement.scrollLeft || docElement.scrollTop ) {
                $.getPageScroll = function(){
                    return new $.Point(
                        document.documentElement.scrollLeft,
                        document.documentElement.scrollTop
                    );
                };
            } else {
                $.getPageScroll = function(){
                    return new $.Point(0,0);
                };
            }

            return $.getPageScroll();
        },


        /**
         * Determines the size of the browsers window.
         * @function
         * @name OpenSeadragon.getWindowSize
         * @returns {Point}
         */
        getWindowSize: function() {
            var docElement = document.documentElement || {},
                body    = document.body || {};

            if ( typeof( window.innerWidth ) == 'number' ) {
                $.getWindowSize = function(){
                    return new $.Point(
                        window.innerWidth,
                        window.innerHeight
                    );
                };
            } else if ( docElement.clientWidth || docElement.clientHeight ) {
                $.getWindowSize = function(){
                    return new $.Point(
                        document.documentElement.clientWidth,
                        document.documentElement.clientHeight
                    );
                };
            } else if ( body.clientWidth || body.clientHeight ) {
                $.getWindowSize = function(){
                    return new $.Point(
                        document.body.clientWidth,
                        document.body.clientHeight
                    );
                };
            } else {
                throw new Error("Unknown window size, no known technique.");
            }

            return $.getWindowSize();
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

            $.makeTransparentImage = function( src ){
                var img = $.makeNeutralElement( "img" );
                
                img.src = src;
                
                return img;
            };

            if ( $.Browser.vendor == $.BROWSERS.IE && $.Browser.version < 7 ) {

                $.makeTransparentImage = function( src ){
                    var img     = $.makeNeutralElement( "img" ),
                        element = null;

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

                    return element;
                };

            } 

            return $.makeTransparentImage( src );
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
                $.addEvent = function( element, eventName, handler, useCapture ){
                    element = $.getElement( element );
                    element.addEventListener( eventName, handler, useCapture );                    
                };
            } else if ( element.attachEvent ) {
                $.addEvent = function( element, eventName, handler, useCapture ){
                    element = $.getElement( element );
                    element.attachEvent( "on" + eventName, handler );
                    if ( useCapture && element.setCapture ) {
                        element.setCapture();
                    }                    
                };
            } else {
                throw new Error(
                    "Unable to attach event handler, no known technique."
                );
            }

            return $.addEvent( element, eventName, handler, useCapture );
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
                $.removeEvent = function( element, eventName, handler, useCapture ) {
                    element = $.getElement( element );
                    element.removeEventListener( eventName, handler, useCapture );
                };
            } else if ( element.detachEvent ) {
                $.removeEvent = function( element, eventName, handler, useCapture ) {
                    element = $.getElement( element );
                    element.detachEvent("on" + eventName, handler);
                    if ( useCapture && element.releaseCapture ) {
                        element.releaseCapture();
                    }
                };
            } else {
                throw new Error(
                    "Unable to detach event handler, no known technique."
                );
            }
            return $.removeEvent( element, eventName, handler, useCapture );
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
                $.cancelEvent = function( event ){
                    // W3C for preventing default
                    event.preventDefault();
                };
            } else {
                $.cancelEvent = function( event ){
                    event = $.getEvent( event );
                    // legacy for preventing default
                    event.cancel = true;
                    // IE for preventing default
                    event.returnValue = false;
                };
            }
            $.cancelEvent( event );
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
                // W3C for stopping propagation
                $.stopEvent = function( event ){
                    event.stopPropagation();
                };
            } else {      
                // IE for stopping propagation
                $.stopEvent = function( event ){
                    event = $.getEvent( event );
                    event.cancelBubble = true;
                };
                
            }

            $.stopEvent( event );
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


        createAjaxRequest: function(){
            var request;

            if ( window.ActiveXObject ) {
                //TODO: very bad...Why check every time using try/catch when
                //      we could determine once at startup which activeX object
                //      was supported.  This will have significant impact on 
                //      performance for IE Browsers DONE
                /*jshint loopfunc:true*/
                for ( i = 0; i < ACTIVEX.length; i++ ) {
                    try {
                        request = new ActiveXObject( ACTIVEX[ i ] );
                        $.createAjaxRequest = function( ){
                            return new ActiveXObject( ACTIVEX[ i ] );
                        };
                        break;
                    } catch (e) {
                        continue;
                    }
                }
            } else if ( window.XMLHttpRequest ) {
                $.createAjaxRequest = function( ){
                    return new XMLHttpRequest();
                };
                request = new XMLHttpRequest();
            }

            if ( !request ) {
                throw new Error( "Browser doesn't support XMLHttpRequest." );
            }

            return request;
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

            var async   = true,
                request = $.createAjaxRequest(),
                actual,
                options,
                i;


            if( $.isPlainObject( url ) ){
                options.async = options.async || async;
            }else{
                options = {
                    url: url,
                    async: $.isFunction( callback ),
                    success: callback,
                    error: null
                };
            }

            if ( options.async ) {
                /** @ignore */
                request.onreadystatechange = function() {
                    if ( request.readyState == 4) {
                        request.onreadystatechange = function(){};
                        options.success( request );
                    }
                };
            }

            try {
                request.open( "GET", options.url, options.async );
                request.send( null );
            } catch (e) {
                $.console.log(
                    "%s while making AJAX request: %s",
                    e.name, 
                    e.message
                );

                request.onreadystatechange = null;
                request = null;

                if ( options.error && $.isFunction( options.error ) ) {
                    options.error( request );
                }
            }

            if( !options.async && $.isFunction( options.success ) ){
                options.success( request );
            }

            return options.async ? null : request;
        },


        /**
         * Taken from jQuery 1.6.1
         * @function
         * @name OpenSeadragon.jsonp
         * @param {Object} options
         * @param {String} options.url
         * @param {Function} options.callback
         * @param {String} [options.param='callback'] The name of the url parameter
         *      to request the jsonp provider with.
         * @param {String} [options.callbackName=] The name of the callback to
         *      request the jsonp provider with.
         */
        jsonp: function( options ){
            var script,
                url     = options.url,
                head    = document.head || 
                    document.getElementsByTagName( "head" )[ 0 ] || 
                    document.documentElement,
                jsonpCallback = options.callbackName || 'openseadragon' + (+new Date()),
                previous      = window[ jsonpCallback ],
                replace       = "$1" + jsonpCallback + "$2",
                callbackParam = options.param || 'callback',
                callback      = options.callback;

            url = url.replace( /(\=)\?(&|$)|\?\?/i, replace );
            // Add callback manually
            url += (/\?/.test( url ) ? "&" : "?") + callbackParam + "=" + jsonpCallback;

            // Install callback
            window[ jsonpCallback ] = function( response ) {
                if ( !previous ){
                    try{
                        delete window[ jsonpCallback ];
                    }catch(e){
                        //swallow
                    }
                } else {
                    window[ jsonpCallback ] = previous;
                }
                if( callback && $.isFunction( callback ) ){
                    callback( response );
                }
            };

            script = document.createElement( "script" );

            //TODO: having an issue with async info requests
            if( undefined !== options.async || false !== options.async ){
                script.async = "async";
            }

            if ( options.scriptCharset ) {
                script.charset = options.scriptCharset;
            }

            script.src = url;

            // Attach handlers for all browsers
            script.onload = script.onreadystatechange = function( _, isAbort ) {

                if ( isAbort || !script.readyState || /loaded|complete/.test( script.readyState ) ) {

                    // Handle memory leak in IE
                    script.onload = script.onreadystatechange = null;

                    // Remove the script
                    if ( head && script.parentNode ) {
                        head.removeChild( script );
                    }

                    // Dereference the script
                    script = undefined;
                }
            };
            // Use insertBefore instead of appendChild  to circumvent an IE6 bug.
            // This arises when a base node is used (#2709 and #4378).
            head.insertBefore( script, head.firstChild );
        
        },


        /**
         * Loads a Deep Zoom Image description from a url, XML string or JSON string
         * and provides a callback hook for the resulting Document
         * @function
         * @name OpenSeadragon.createFromDZI
         * @param {String} xmlUrl
         * @param {String} xmlString
         * @param {Function} callback
         * @deprecated
         */
        createFromDZI: function( dzi, callback, tileHost ) {
            var async       = typeof ( callback ) == "function",
                dziUrl      = (
                    dzi.substring(0,1) != '<' && 
                    dzi.substring(0,1) != '{' 
                ) ? dzi : null,
                dziString   = dziUrl ? null : dzi,
                error       = null,
                urlParts,
                filename,
                lastDot,
                tilesUrl,
                callbackName;


            if( tileHost ){

                tilesUrl = tileHost + "/_files/";
                
            } else if( dziUrl ) {

                urlParts = dziUrl.split( '/' );
                filename = urlParts[ urlParts.length - 1 ];
                if( filename.match(/_dzi\.js$/) ){
                    //for jsonp dzi specification, the '_dzi' needs to be removed
                    //from the filename to be consistent with the spec
                    filename = filename.replace('_dzi.js', '.js');
                }

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
                if ( dziString ) {
                    window.setTimeout( function() {
                        var source = finish( processDZIXml, $.parseXml( xmlString ) );
                        // call after finish sets error
                        callback( source, error );    
                    }, 1);
                } else {
                    if( dziUrl.match(/_dzi\.js$/) ){
                        callbackName = dziUrl.split( '/' ).pop().replace('.js','');
                        $.jsonp({
                            url: dziUrl,
                            callbackName: callbackName,
                            callback: function( imageData ){
                                var source = finish( processDZIJSON, imageData.Image );
                                callback( source );
                            }
                        });
                    } else {
                        $.makeAjaxRequest( dziUrl, function( xhr ) {
                            var source = finish( processDZIResponse, xhr );
                            // call after finish sets error
                            callback( source, error );
                        });
                    }
                }

                return null;
            }

            if ( dziString ) {
                return finish( 
                    processDZIXml,
                    $.parseXml( dziString ) 
                );
            } else {
                return finish( 
                    processDZIResponse, 
                    $.makeAjaxRequest( dziUrl )
                );
            }
        },

        /**
         * Parses an XML string into a DOM Document.
         * @function
         * @name OpenSeadragon.parseXml
         * @param {String} string
         * @returns {Document}
         */
        parseXml: function( string ) {
            //TODO: yet another example where we can determine the correct
            //      implementation once at start-up instead of everytime we use
            //      the function. DONE.
            if ( window.ActiveXObject ) {

                $.parseXml = function( string ){
                    var xmlDoc = null,
                        parser;

                    xmlDoc = new ActiveXObject( "Microsoft.XMLDOM" );
                    xmlDoc.async = false;
                    xmlDoc.loadXML( string );
                    return xmlDoc;
                };

            } else if ( window.DOMParser ) {
                
                $.parseXml = function( string ){
                    var xmlDoc = null,
                        parser;

                    parser = new DOMParser();
                    xmlDoc = parser.parseFromString( string, "text/xml" );
                    return xmlDoc;
                };

            } else {
                throw new Error( "Browser doesn't support XML DOM." );
            }

            return $.parseXml( string );
        },


        /**
         * Reports whether the image format is supported for tiling in this
         * version.
         * @function
         * @name OpenSeadragon.imageFormatSupported
         * @param {String} [extension]
         * @returns {Boolean}
         */
        imageFormatSupported: function( extension ) {
            extension = extension ? extension : "";
            return !!FILEFORMATS[ extension.toLowerCase() ];
        }

    });


    /**
     * The current browser vendor, version, and related information regarding
     * detected features.  Features include <br/>
     *  <strong>'alpha'</strong> - Does the browser support image alpha 
     *  transparency.<br/>
     * @name $.Browser
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

        //console.error( 'appName: ' + navigator.appName );
        //console.error( 'appVersion: ' + navigator.appVersion );
        //console.error( 'userAgent: ' + navigator.userAgent );

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
            ( 
                $.Browser.vendor == $.BROWSERS.IE && 
                $.Browser.version < 9
            ) || (
                $.Browser.vendor == $.BROWSERS.CHROME && 
                $.Browser.version < 2
            )
        );

    })();

    /**
     * Determines the appropriate level of native full secreen support we can get 
     * from the browser.
     * Thanks to John Dyer for the implementation and research
     * http://johndyer.name/native-fullscreen-javascript-api-plus-jquery-plugin/
     * Also includes older IE support based on
     * http://stackoverflow.com/questions/1125084/how-to-make-in-javascript-full-screen-windows-stretching-all-over-the-screen/7525760
     * @name $.supportsFullScreen
     */
    (function() {
        var fullScreenApi = {
                supportsFullScreen: false,
                isFullScreen: function() { return false; },
                requestFullScreen: function() {},
                cancelFullScreen: function() {},
                fullScreenEventName: '',
                prefix: ''
            },
            browserPrefixes = 'webkit moz o ms khtml'.split(' ');
     
        // check for native support
        if (typeof document.cancelFullScreen != 'undefined') {
            fullScreenApi.supportsFullScreen = true;
        } else {
            // check for fullscreen support by vendor prefix
            for (var i = 0, il = browserPrefixes.length; i < il; i++ ) {
                fullScreenApi.prefix = browserPrefixes[i];
     
                if (typeof document[fullScreenApi.prefix + 'CancelFullScreen' ] != 'undefined' ) {
                    fullScreenApi.supportsFullScreen = true;
     
                    break;
                }
            }
        }
     
        // update methods to do something useful
        if (fullScreenApi.supportsFullScreen) {
            fullScreenApi.fullScreenEventName = fullScreenApi.prefix + 'fullscreenchange';
     
            fullScreenApi.isFullScreen = function() {
                switch (this.prefix) {
                    case '':
                        return document.fullScreen;
                    case 'webkit':
                        return document.webkitIsFullScreen;
                    default:
                        return document[this.prefix + 'FullScreen'];
                }
            };
            fullScreenApi.requestFullScreen = function( element ) {
                return (this.prefix === '') ? 
                    element.requestFullScreen() : 
                    element[this.prefix + 'RequestFullScreen']();

            };
            fullScreenApi.cancelFullScreen = function( element ) {
                return (this.prefix === '') ? 
                    document.cancelFullScreen() : 
                    document[this.prefix + 'CancelFullScreen']();
            };
        } else if ( typeof window.ActiveXObject !== "undefined" ){
            // Older IE.
            fullScreenApi.requestFullScreen = function(){
                var wscript = new ActiveXObject("WScript.Shell");
                if ( wscript !== null ) {
                    wscript.SendKeys("{F11}");
                }
                return false;
            };
            fullScreenApi.cancelFullScreen = fullScreenApi.requestFullScreen;
        }

     
        // export api
        $.extend( $, fullScreenApi );

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
     * @private
     */
    var nullfunction = function( msg ){
            //document.location.hash = msg;
        };

    $.console = window.console || {
        log:    nullfunction,
        debug:  nullfunction,
        info:   nullfunction,
        warn:   nullfunction,
        error:  nullfunction
    };
        

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
    }

    /**
     * @private
     * @inner
     * @function
     * @param {XMLHttpRequest} xhr
     * @param {String} tilesUrl
     * @deprecated
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
            doc = $.parseXml( xhr.responseText );
        }

        return processDZIXml( doc, tilesUrl );
    }

    /**
     * @private
     * @inner
     * @function
     * @param {Document} xmlDoc
     * @param {String} tilesUrl
     * @deprecated
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
    }

    /**
     * @private
     * @inner
     * @function
     * @param {Element} imageNode
     * @param {String} tilesUrl
     * @deprecated
     */
    function processDZI( imageNode, tilesUrl ) {
        var fileFormat    = imageNode.getAttribute( "Format" ),
            sizeNode      = imageNode.getElementsByTagName( "Size" )[ 0 ],
            dispRectNodes = imageNode.getElementsByTagName( "DisplayRect" ),
            width         = parseInt( sizeNode.getAttribute( "Width" ), 10 ),
            height        = parseInt( sizeNode.getAttribute( "Height" ), 10 ),
            tileSize      = parseInt( imageNode.getAttribute( "TileSize" ), 10 ),
            tileOverlap   = parseInt( imageNode.getAttribute( "Overlap" ), 10 ),
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
                parseInt( rectNode.getAttribute( "X" ), 10 ),
                parseInt( rectNode.getAttribute( "Y" ), 10 ),
                parseInt( rectNode.getAttribute( "Width" ), 10 ),
                parseInt( rectNode.getAttribute( "Height" ), 10 ),
                0,  // ignore MinLevel attribute, bug in Deep Zoom Composer
                parseInt( dispRectNode.getAttribute( "MaxLevel" ), 10 )
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
    }

    /**
     * @private
     * @inner
     * @function
     * @param {Element} imageNode
     * @param {String} tilesUrl
     * @deprecated
     */
    function processDZIJSON( imageData, tilesUrl ) {
        var fileFormat    = imageData.Format,
            sizeData      = imageData.Size,
            dispRectData  = imageData.DisplayRect || [],
            width         = parseInt( sizeData.Width, 10 ),
            height        = parseInt( sizeData.Height, 10 ),
            tileSize      = parseInt( imageData.TileSize, 10 ),
            tileOverlap   = parseInt( imageData.Overlap, 10 ),
            dispRects     = [],
            rectData,
            i;

        if ( !imageFormatSupported( fileFormat ) ) {
            throw new Error(
                $.getString( "Errors.ImageFormat", fileFormat.toUpperCase() )
            );
        }

        for ( i = 0; i < dispRectData.length; i++ ) {
            rectData     = dispRectData[ i ].Rect;

            dispRects.push( new $.DisplayRect(
                parseInt( rectData.X, 10 ),
                parseInt( rectData.Y, 10 ),
                parseInt( rectData.Width, 10 ),
                parseInt( rectData.Height, 10 ),
                0,  // ignore MinLevel attribute, bug in Deep Zoom Composer
                parseInt( rectData.MaxLevel, 10 )
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
    }

    /**
     * @private
     * @inner
     * @function
     * @param {Document} errorNode
     * @throws {Error}
     * @deprecated
     */
    function processDZIError( errorNode ) {
        var messageNode = errorNode.getElementsByTagName( "Message" )[ 0 ],
            message     = messageNode.firstChild.nodeValue;

        throw new Error(message);
    }

}( OpenSeadragon ));
