/*
 * OpenSeadragon - Viewer
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

// dictionary from hash to private properties
var THIS = {},
// We keep a list of viewers so we can 'wake-up' each viewer on
// a page after toggling between fullpage modes
    VIEWERS = {};

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
 * @class Viewer
 * @classdesc The main OpenSeadragon viewer class.
 *
 * @memberof OpenSeadragon
 * @extends OpenSeadragon.EventSource
 * @extends OpenSeadragon.ControlDock
 * @param {OpenSeadragon.Options} options - Viewer options.
 *
 **/
$.Viewer = function( options ) {

    var args  = arguments,
        _this = this,
        i;


    //backward compatibility for positional args while prefering more
    //idiomatic javascript options object as the only argument
    if( !$.isPlainObject( options ) ){
        options = {
            id:                 args[ 0 ],
            xmlPath:            args.length > 1 ? args[ 1 ] : undefined,
            prefixUrl:          args.length > 2 ? args[ 2 ] : undefined,
            controls:           args.length > 3 ? args[ 3 ] : undefined,
            overlays:           args.length > 4 ? args[ 4 ] : undefined
        };
    }

    //options.config and the general config argument are deprecated
    //in favor of the more direct specification of optional settings
    //being pass directly on the options object
    if ( options.config ){
        $.extend( true, options, options.config );
        delete options.config;
    }

    //Public properties
    //Allow the options object to override global defaults
    $.extend( true, this, {

        //internal state and dom identifiers
        id:             options.id,
        hash:           options.hash || options.id,

        //dom nodes
        /**
         * The parent element of this Viewer instance, passed in when the Viewer was created.
         * @member {Element} element
         * @memberof OpenSeadragon.Viewer#
         */
        element:        null,
        /**
         * A &lt;div&gt; element (provided by {@link OpenSeadragon.ControlDock}), the base element of this Viewer instance.<br><br>
         * Child element of {@link OpenSeadragon.Viewer#element}.
         * @member {Element} container
         * @memberof OpenSeadragon.Viewer#
         */
        container:      null,
        /**
         * A &lt;div&gt; element, the element where user-input events are handled for panning and zooming.<br><br>
         * Child element of {@link OpenSeadragon.Viewer#container},
         * positioned on top of {@link OpenSeadragon.Viewer#keyboardCommandArea}.<br><br>
         * The parent of {@link OpenSeadragon.Drawer#canvas} instances. 
         * @member {Element} canvas
         * @memberof OpenSeadragon.Viewer#
         */
        canvas:         null,

        // Overlays list. An overlay allows to add html on top of the viewer.
        overlays:           [],
        // Container inside the canvas where overlays are drawn.
        overlaysContainer:  null,

        //private state properties
        previousBody:   [],

        //This was originally initialized in the constructor and so could never
        //have anything in it.  now it can because we allow it to be specified
        //in the options and is only empty by default if not specified. Also
        //this array was returned from get_controls which I find confusing
        //since this object has a controls property which is treated in other
        //functions like clearControls.  I'm removing the accessors.
        customControls: [],

        //These are originally not part options but declared as members
        //in initialize.  It's still considered idiomatic to put them here
        source:         null,
        /**
         * Handles rendering of tiles in the viewer. Created for each TileSource opened.
         * @member {OpenSeadragon.Drawer} drawer
         * @memberof OpenSeadragon.Viewer#
         */
        drawer:             null,
        drawers:            [],
        // Container inside the canvas where drawers (layers) are drawn.
        drawersContainer:   null,
        /**
         * Handles coordinate-related functionality - zoom, pan, rotation, etc. Created for each TileSource opened.
         * @member {OpenSeadragon.Viewport} viewport
         * @memberof OpenSeadragon.Viewer#
         */
        viewport:       null,
        /**
         * @member {OpenSeadragon.Navigator} navigator
         * @memberof OpenSeadragon.Viewer#
         */
        navigator:      null,

        //A collection viewport is a separate viewport used to provide
        //simultaneous rendering of sets of tiles
        collectionViewport:     null,
        collectionDrawer:       null,

        //UI image resources
        //TODO: rename navImages to uiImages
        navImages:      null,

        //interface button controls
        buttons:        null,

        //TODO: this is defunct so safely remove it
        profiler:       null

    }, $.DEFAULT_SETTINGS, options );

    if ( typeof( this.hash) === "undefined" ) {
        throw new Error("A hash must be defined, either by specifying options.id or options.hash.");
    }
    if ( typeof( THIS[ this.hash ] ) !== "undefined" ) {
        // We don't want to throw an error here, as the user might have discarded
        // the previous viewer with the same hash and now want to recreate it.
        $.console.warn("Hash " + this.hash + " has already been used.");
    }

    //Private state properties
    THIS[ this.hash ] = {
        "fsBoundsDelta":     new $.Point( 1, 1 ),
        "prevContainerSize": null,
        "animating":         false,
        "forceRedraw":       false,
        "mouseInside":       false,
        "group":             null,
        // whether we should be continuously zooming
        "zooming":           false,
        // how much we should be continuously zooming by
        "zoomFactor":        null,
        "lastZoomTime":      null,
        // did we decide this viewer has a sequence of tile sources
        "sequenced":         false,
        "sequence":          0,
        "fullPage":          false,
        "onfullscreenchange": null
    };

    this._updateRequestId = null;
    this.currentOverlays = [];

    //Inherit some behaviors and properties
    $.EventSource.call( this );

    this.addHandler( 'open-failed', function ( event ) {
        var msg = $.getString( "Errors.OpenFailed", event.eventSource, event.message);
        _this._showMessage( msg );
    });

    $.ControlDock.call( this, options );

    //Deal with tile sources
    var initialTileSource;

    if ( this.xmlPath  ){
        //Deprecated option.  Now it is preferred to use the tileSources option
        this.tileSources = [ this.xmlPath ];
    }

    if ( this.tileSources  ){
        // tileSources is a complex option...
        //
        // It can be a string, object, or an array of any of strings and objects.
        // At this point we only care about if it is an Array or not.
        //
        if( $.isArray( this.tileSources ) ){

            //must be a sequence of tileSource since the first item
            //is a legacy tile source
            if( this.tileSources.length > 1 ){
                THIS[ this.hash ].sequenced = true;
            }
            
            //Keeps the initial page within bounds
            if ( this.initialPage > this.tileSources.length - 1 ){
                this.initialPage = this.tileSources.length - 1;
            }
            
            initialTileSource = this.tileSources[ this.initialPage ];
            
            //Update the sequence (aka currrent page) property
            THIS[ this.hash ].sequence = this.initialPage;
        } else {
            initialTileSource = this.tileSources;
        }
    }

    this.element              = this.element || document.getElementById( this.id );
    this.canvas               = $.makeNeutralElement( "div" );
    this.drawersContainer     = $.makeNeutralElement( "div" );
    this.overlaysContainer    = $.makeNeutralElement( "div" );

    this.canvas.className = "openseadragon-canvas";
    (function( style ){
        style.width    = "100%";
        style.height   = "100%";
        style.overflow = "hidden";
        style.position = "absolute";
        style.top      = "0px";
        style.left     = "0px";
    }(this.canvas.style));
    $.setElementTouchActionNone( this.canvas );
    this.canvas.tabIndex = options.tabIndex || 0;

    //the container is created through applying the ControlDock constructor above
    this.container.className = "openseadragon-container";
    (function( style ){
        style.width     = "100%";
        style.height    = "100%";
        style.position  = "relative";
        style.overflow  = "hidden";
        style.left      = "0px";
        style.top       = "0px";
        style.textAlign = "left";  // needed to protect against
    }( this.container.style ));

    this.container.insertBefore( this.canvas, this.container.firstChild );
    this.element.appendChild( this.container );
    this.canvas.appendChild( this.drawersContainer );
    this.canvas.appendChild( this.overlaysContainer );

    //Used for toggling between fullscreen and default container size
    //TODO: these can be closure private and shared across Viewer
    //      instances.
    this.bodyWidth      = document.body.style.width;
    this.bodyHeight     = document.body.style.height;
    this.bodyOverflow   = document.body.style.overflow;
    this.docOverflow    = document.documentElement.style.overflow;

    this.innerTracker = new $.MouseTracker({
        element:                  this.canvas,
        startDisabled:            this.mouseNavEnabled ? false : true,
        clickTimeThreshold:       this.clickTimeThreshold,
        clickDistThreshold:       this.clickDistThreshold,
        dblClickTimeThreshold:    this.dblClickTimeThreshold,
        dblClickDistThreshold:    this.dblClickDistThreshold,
        keyDownHandler:           $.delegate( this, onCanvasKeyDown ),
        keyHandler:               $.delegate( this, onCanvasKeyPress ),
        clickHandler:             $.delegate( this, onCanvasClick ),
        dblClickHandler:          $.delegate( this, onCanvasDblClick ),
        dragHandler:              $.delegate( this, onCanvasDrag ),
        dragEndHandler:           $.delegate( this, onCanvasDragEnd ),
        enterHandler:             $.delegate( this, onCanvasEnter ),
        exitHandler:              $.delegate( this, onCanvasExit ),
        pressHandler:             $.delegate( this, onCanvasPress ),
        releaseHandler:           $.delegate( this, onCanvasRelease ),
        nonPrimaryPressHandler:   $.delegate( this, onCanvasNonPrimaryPress ),
        nonPrimaryReleaseHandler: $.delegate( this, onCanvasNonPrimaryRelease ),
        scrollHandler:            $.delegate( this, onCanvasScroll ),
        pinchHandler:             $.delegate( this, onCanvasPinch )
    });

    this.outerTracker = new $.MouseTracker({
        element:               this.container,
        startDisabled:         this.mouseNavEnabled ? false : true,
        clickTimeThreshold:    this.clickTimeThreshold,
        clickDistThreshold:    this.clickDistThreshold,
        dblClickTimeThreshold: this.dblClickTimeThreshold,
        dblClickDistThreshold: this.dblClickDistThreshold,
        enterHandler:          $.delegate( this, onContainerEnter ),
        exitHandler:           $.delegate( this, onContainerExit )
    });

    if( this.toolbar ){
        this.toolbar = new $.ControlDock({ element: this.toolbar });
    }

    this.bindStandardControls();
    this.bindSequenceControls();

    if ( initialTileSource ) {
        this.open( initialTileSource );

        if ( this.tileSources.length > 1 ) {
            this._updateSequenceButtons( this.initialPage );
        }
    }

    for ( i = 0; i < this.customControls.length; i++ ) {
        this.addControl(
            this.customControls[ i ].id,
            {anchor: this.customControls[ i ].anchor}
        );
    }

    $.requestAnimationFrame( function(){
        beginControlsAutoHide( _this );
    } );    // initial fade out

};

$.extend( $.Viewer.prototype, $.EventSource.prototype, $.ControlDock.prototype, /** @lends OpenSeadragon.Viewer.prototype */{


    /**
     * @function
     * @return {Boolean}
     */
    isOpen: function () {
        return !!this.source;
    },

    /**
     * A deprecated function, renamed to 'open' to match event name and
     * match current 'close' method.
     * @function
     * @param {String} dzi xml string or the url to a DZI xml document.
     * @return {OpenSeadragon.Viewer} Chainable.
     *
     * @deprecated - use {@link OpenSeadragon.Viewer#open} instead.
     */
    openDzi: function ( dzi ) {
        return this.open( dzi );
    },

    /**
     * A deprecated function, renamed to 'open' to match event name and
     * match current 'close' method.
     * @function
     * @param {String|Object|Function} See OpenSeadragon.Viewer.prototype.open
     * @return {OpenSeadragon.Viewer} Chainable.
     *
     * @deprecated - use {@link OpenSeadragon.Viewer#open} instead.
     */
    openTileSource: function ( tileSource ) {
        return this.open( tileSource );
    },

    /**
     * Open a TileSource object into the viewer.
     *
     * tileSources is a complex option...
     *
     * It can be a string, object, function, or an array of any of these:
     *
     * - A String implies a url used to determine the tileSource implementation
     *      based on the file extension of url. JSONP is implied by *.js,
     *      otherwise the url is retrieved as text and the resulting text is
     *      introspected to determine if its json, xml, or text and parsed.
     * - An Object implies an inline configuration which has a single
     *      property sufficient for being able to determine tileSource
     *      implementation. If the object has a property which is a function
     *      named 'getTileUrl', it is treated as a custom TileSource.
     * @function
     * @param {String|Object|Function}
     * @return {OpenSeadragon.Viewer} Chainable.
     * @fires OpenSeadragon.Viewer.event:open
     * @fires OpenSeadragon.Viewer.event:open-failed
     */
    open: function ( tileSource ) {
        var _this = this;

        _this._hideMessage();

        getTileSourceImplementation( _this, tileSource, function( tileSource ) {
            openTileSource( _this, tileSource );
        }, function( event ) {
            /**
             * Raised when an error occurs loading a TileSource.
             *
             * @event open-failed
             * @memberof OpenSeadragon.Viewer
             * @type {object}
             * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
             * @property {String} message
             * @property {String} source
             * @property {?Object} userData - Arbitrary subscriber-defined object.
             */
            _this.raiseEvent( 'open-failed', event );
        });

        return this;
    },


    /**
     * @function
     * @return {OpenSeadragon.Viewer} Chainable.
     * @fires OpenSeadragon.Viewer.event:close
     */
    close: function ( ) {
        
        if ( !THIS[ this.hash ] ) {
            //this viewer has already been destroyed: returning immediately
            return this;
        }
        
        if ( this._updateRequestId !== null ) {
            $.cancelAnimationFrame( this._updateRequestId );
            this._updateRequestId = null;
        }

        if ( this.navigator ) {
            this.navigator.close();
        }

        if( ! this.preserveOverlays)
        {
            this.clearOverlays();
            this.overlaysContainer.innerHTML = "";
        }

        this.drawersContainer.innerHTML = "";

        if ( this.drawer ) {
            this.drawer.destroy();
        }

        this.overlays   = [];
        this.source     = null;
        this.drawer     = null;
        this.drawers    = [];

        this.viewport   = this.preserveViewport ? this.viewport : null;


        VIEWERS[ this.hash ] = null;
        delete VIEWERS[ this.hash ];

        /**
         * Raised when the viewer is closed (see {@link OpenSeadragon.Viewer#close}).
         *
         * @event close
         * @memberof OpenSeadragon.Viewer
         * @type {object}
         * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
         * @property {?Object} userData - Arbitrary subscriber-defined object.
         */
        this.raiseEvent( 'close' );

        return this;
    },


    /**
     * Function to destroy the viewer and clean up everything created by OpenSeadragon.
     * 
     * Example:
     * var viewer = OpenSeadragon({
     *   [...]
     * });
     *
     * //when you are done with the viewer:
     * viewer.destroy();
     * viewer = null; //important
     *
     * @function
     */
    destroy: function( ) {
        this.close();

        //TODO: implement this...
        //this.unbindSequenceControls()
        //this.unbindStandardControls()        
        
        this.removeAllHandlers();

        // Go through top element (passed to us) and remove all children
        // Use removeChild to make sure it handles SVG or any non-html
        // also it performs better - http://jsperf.com/innerhtml-vs-removechild/15
        if (this.element){
            while (this.element.firstChild) {
                this.element.removeChild(this.element.firstChild);
            }
        }

        // destroy the mouse trackers
        if (this.innerTracker){
            this.innerTracker.destroy();
        }
        if (this.outerTracker){
            this.outerTracker.destroy();
        }

        THIS[ this.hash ] = null;
        delete THIS[ this.hash ];

        // clear all our references to dom objects
        this.canvas = null;
        this.container = null;

        // clear our reference to the main element - they will need to pass it in again, creating a new viewer
        this.element = null;
    },


    /**
     * @function
     * @return {Boolean}
     */
    isMouseNavEnabled: function () {
        return this.innerTracker.isTracking();
    },

    /**
     * @function
     * @param {Boolean} enabled - true to enable, false to disable
     * @return {OpenSeadragon.Viewer} Chainable.
     * @fires OpenSeadragon.Viewer.event:mouse-enabled
     */
    setMouseNavEnabled: function( enabled ){
        this.innerTracker.setTracking( enabled );
        /**
         * Raised when mouse/touch navigation is enabled or disabled (see {@link OpenSeadragon.Viewer#setMouseNavEnabled}).
         *
         * @event mouse-enabled
         * @memberof OpenSeadragon.Viewer
         * @type {object}
         * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
         * @property {Boolean} enabled
         * @property {?Object} userData - Arbitrary subscriber-defined object.
         */
        this.raiseEvent( 'mouse-enabled', { enabled: enabled } );
        return this;
    },


    /**
     * @function
     * @return {Boolean}
     */
    areControlsEnabled: function () {
        var enabled = this.controls.length,
            i;
        for( i = 0; i < this.controls.length; i++ ){
            enabled = enabled && this.controls[ i ].isVisibile();
        }
        return enabled;
    },


    /**
     * Shows or hides the controls (e.g. the default navigation buttons).
     *
     * @function
     * @param {Boolean} true to show, false to hide.
     * @return {OpenSeadragon.Viewer} Chainable.
     * @fires OpenSeadragon.Viewer.event:controls-enabled
     */
    setControlsEnabled: function( enabled ) {
        if( enabled ){
            abortControlsAutoHide( this );
        } else {
            beginControlsAutoHide( this );
        }
        /**
         * Raised when the navigation controls are shown or hidden (see {@link OpenSeadragon.Viewer#setControlsEnabled}).
         *
         * @event controls-enabled
         * @memberof OpenSeadragon.Viewer
         * @type {object}
         * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
         * @property {Boolean} enabled
         * @property {?Object} userData - Arbitrary subscriber-defined object.
         */
        this.raiseEvent( 'controls-enabled', { enabled: enabled } );
        return this;
    },


    /**
     * @function
     * @return {Boolean}
     */
    isFullPage: function () {
        return THIS[ this.hash ].fullPage;
    },


    /**
     * Toggle full page mode.
     * @function
     * @param {Boolean} fullPage
     *      If true, enter full page mode.  If false, exit full page mode.
     * @return {OpenSeadragon.Viewer} Chainable.
     * @fires OpenSeadragon.Viewer.event:pre-full-page
     * @fires OpenSeadragon.Viewer.event:full-page
     */
    setFullPage: function( fullPage ) {

        var body = document.body,
            bodyStyle = body.style,
            docStyle = document.documentElement.style,
            _this = this,
            hash,
            nodes,
            i;

        //dont bother modifying the DOM if we are already in full page mode.
        if ( fullPage == this.isFullPage() ) {
            return this;
        }

        var fullPageEventArgs = {
            fullPage: fullPage,
            preventDefaultAction: false
        };
        /**
         * Raised when the viewer is about to change to/from full-page mode (see {@link OpenSeadragon.Viewer#setFullPage}).
         *
         * @event pre-full-page
         * @memberof OpenSeadragon.Viewer
         * @type {object}
         * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
         * @property {Boolean} fullPage - True if entering full-page mode, false if exiting full-page mode.
         * @property {Boolean} preventDefaultAction - Set to true to prevent full-page mode change. Default: false.
         * @property {?Object} userData - Arbitrary subscriber-defined object.
         */
        this.raiseEvent( 'pre-full-page', fullPageEventArgs );
        if ( fullPageEventArgs.preventDefaultAction ) {
            return this;
        }

        if ( fullPage ) {

            this.elementSize = $.getElementSize( this.element );
            this.pageScroll = $.getPageScroll();

            this.elementMargin = this.element.style.margin;
            this.element.style.margin = "0";
            this.elementPadding = this.element.style.padding;
            this.element.style.padding = "0";

            this.bodyMargin = bodyStyle.margin;
            this.docMargin = docStyle.margin;
            bodyStyle.margin = "0";
            docStyle.margin = "0";

            this.bodyPadding = bodyStyle.padding;
            this.docPadding = docStyle.padding;
            bodyStyle.padding = "0";
            docStyle.padding = "0";

            this.bodyWidth = bodyStyle.width;
            this.bodyHeight = bodyStyle.height;
            bodyStyle.width = "100%";
            bodyStyle.height = "100%";

            //when entering full screen on the ipad it wasnt sufficient to leave
            //the body intact as only only the top half of the screen would
            //respond to touch events on the canvas, while the bottom half treated
            //them as touch events on the document body.  Thus we remove and store
            //the bodies elements and replace them when we leave full screen.
            this.previousBody = [];
            THIS[ this.hash ].prevElementParent = this.element.parentNode;
            THIS[ this.hash ].prevNextSibling = this.element.nextSibling;
            THIS[ this.hash ].prevElementWidth = this.element.style.width;
            THIS[ this.hash ].prevElementHeight = this.element.style.height;
            nodes = body.childNodes.length;
            for ( i = 0; i < nodes; i++ ) {
                this.previousBody.push( body.childNodes[ 0 ] );
                body.removeChild( body.childNodes[ 0 ] );
            }

            //If we've got a toolbar, we need to enable the user to use css to
            //preserve it in fullpage mode
            if ( this.toolbar && this.toolbar.element ) {
                //save a reference to the parent so we can put it back
                //in the long run we need a better strategy
                this.toolbar.parentNode = this.toolbar.element.parentNode;
                this.toolbar.nextSibling = this.toolbar.element.nextSibling;
                body.appendChild( this.toolbar.element );

                //Make sure the user has some ability to style the toolbar based
                //on the mode
                $.addClass( this.toolbar.element, 'fullpage' );
            }

            $.addClass( this.element, 'fullpage' );
            body.appendChild( this.element );

            this.element.style.height = $.getWindowSize().y + 'px';
            this.element.style.width = $.getWindowSize().x + 'px';

            if ( this.toolbar && this.toolbar.element ) {
                this.element.style.height = (
                    $.getElementSize( this.element ).y - $.getElementSize( this.toolbar.element ).y
                ) + 'px';
            }

            THIS[ this.hash ].fullPage = true;

            // mouse will be inside container now
            $.delegate( this, onContainerEnter )( {} );

        } else {

            this.element.style.margin = this.elementMargin;
            this.element.style.padding = this.elementPadding;

            bodyStyle.margin = this.bodyMargin;
            docStyle.margin = this.docMargin;

            bodyStyle.padding = this.bodyPadding;
            docStyle.padding = this.docPadding;

            bodyStyle.width = this.bodyWidth;
            bodyStyle.height = this.bodyHeight;

            body.removeChild( this.element );
            nodes = this.previousBody.length;
            for ( i = 0; i < nodes; i++ ) {
                body.appendChild( this.previousBody.shift() );
            }

            $.removeClass( this.element, 'fullpage' );
            THIS[ this.hash ].prevElementParent.insertBefore(
                this.element,
                THIS[ this.hash ].prevNextSibling
            );

            //If we've got a toolbar, we need to enable the user to use css to
            //reset it to its original state
            if ( this.toolbar && this.toolbar.element ) {
                body.removeChild( this.toolbar.element );

                //Make sure the user has some ability to style the toolbar based
                //on the mode
                $.removeClass( this.toolbar.element, 'fullpage' );

                this.toolbar.parentNode.insertBefore(
                    this.toolbar.element,
                    this.toolbar.nextSibling
                );
                delete this.toolbar.parentNode;
                delete this.toolbar.nextSibling;
            }

            this.element.style.width = THIS[ this.hash ].prevElementWidth;
            this.element.style.height = THIS[ this.hash ].prevElementHeight;

            // After exiting fullPage or fullScreen, it can take some time
            // before the browser can actually set the scroll.
            var restoreScrollCounter = 0;
            var restoreScroll = function() {
                $.setPageScroll( _this.pageScroll );
                var pageScroll = $.getPageScroll();
                restoreScrollCounter++;
                if ( restoreScrollCounter < 10 &&
                    pageScroll.x !== _this.pageScroll.x ||
                    pageScroll.y !== _this.pageScroll.y ) {
                    $.requestAnimationFrame( restoreScroll );
                }
            };
            $.requestAnimationFrame( restoreScroll );

            THIS[ this.hash ].fullPage = false;

            // mouse will likely be outside now
            $.delegate( this, onContainerExit )( { } );

        }

        if ( this.navigator && this.viewport ) {
            this.navigator.update( this.viewport );
        }

        /**
         * Raised when the viewer has changed to/from full-page mode (see {@link OpenSeadragon.Viewer#setFullPage}).
         *
         * @event full-page
         * @memberof OpenSeadragon.Viewer
         * @type {object}
         * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
         * @property {Boolean} fullPage - True if changed to full-page mode, false if exited full-page mode.
         * @property {?Object} userData - Arbitrary subscriber-defined object.
         */
        this.raiseEvent( 'full-page', { fullPage: fullPage } );

        return this;
    },

    /**
     * Toggle full screen mode if supported. Toggle full page mode otherwise.
     * @function
     * @param {Boolean} fullScreen
     *      If true, enter full screen mode.  If false, exit full screen mode.
     * @return {OpenSeadragon.Viewer} Chainable.
     * @fires OpenSeadragon.Viewer.event:pre-full-screen
     * @fires OpenSeadragon.Viewer.event:full-screen
     */
    setFullScreen: function( fullScreen ) {
        var _this = this;

        if ( !$.supportsFullScreen ) {
            return this.setFullPage( fullScreen );
        }

        if ( $.isFullScreen() === fullScreen ) {
            return this;
        }

        var fullScreeEventArgs = {
            fullScreen: fullScreen,
            preventDefaultAction: false
        };
        /**
         * Raised when the viewer is about to change to/from full-screen mode (see {@link OpenSeadragon.Viewer#setFullScreen}).
         *
         * @event pre-full-screen
         * @memberof OpenSeadragon.Viewer
         * @type {object}
         * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
         * @property {Boolean} fullScreen - True if entering full-screen mode, false if exiting full-screen mode.
         * @property {Boolean} preventDefaultAction - Set to true to prevent full-screen mode change. Default: false.
         * @property {?Object} userData - Arbitrary subscriber-defined object.
         */
        this.raiseEvent( 'pre-full-screen', fullScreeEventArgs );
        if ( fullScreeEventArgs.preventDefaultAction ) {
            return this;
        }

        if ( fullScreen ) {

            this.setFullPage( true );
            // If the full page mode is not actually entered, we need to prevent
            // the full screen mode.
            if ( !this.isFullPage() ) {
                return this;
            }

            this.fullPageStyleWidth = this.element.style.width;
            this.fullPageStyleHeight = this.element.style.height;
            this.element.style.width = '100%';
            this.element.style.height = '100%';

            var onFullScreenChange = function() {
                var isFullScreen = $.isFullScreen();
                if ( !isFullScreen ) {
                    $.removeEvent( document, $.fullScreenEventName, onFullScreenChange );
                    $.removeEvent( document, $.fullScreenErrorEventName, onFullScreenChange );

                    _this.setFullPage( false );
                    if ( _this.isFullPage() ) {
                        _this.element.style.width = _this.fullPageStyleWidth;
                        _this.element.style.height = _this.fullPageStyleHeight;
                    }
                }
                if ( _this.navigator && _this.viewport ) {
                    _this.navigator.update( _this.viewport );
                }
                /**
                 * Raised when the viewer has changed to/from full-screen mode (see {@link OpenSeadragon.Viewer#setFullScreen}).
                 *
                 * @event full-screen
                 * @memberof OpenSeadragon.Viewer
                 * @type {object}
                 * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
                 * @property {Boolean} fullScreen - True if changed to full-screen mode, false if exited full-screen mode.
                 * @property {?Object} userData - Arbitrary subscriber-defined object.
                 */
                _this.raiseEvent( 'full-screen', { fullScreen: isFullScreen } );
            };
            $.addEvent( document, $.fullScreenEventName, onFullScreenChange );
            $.addEvent( document, $.fullScreenErrorEventName, onFullScreenChange );

            $.requestFullScreen( document.body );

        } else {
            $.exitFullScreen();
        }
        return this;
    },

    /**
     * @function
     * @return {Boolean}
     */
    isVisible: function () {
        return this.container.style.visibility != "hidden";
    },


    /**
     * @function
     * @param {Boolean} visible
     * @return {OpenSeadragon.Viewer} Chainable.
     * @fires OpenSeadragon.Viewer.event:visible
     */
    setVisible: function( visible ){
        this.container.style.visibility = visible ? "" : "hidden";
        /**
         * Raised when the viewer is shown or hidden (see {@link OpenSeadragon.Viewer#setVisible}).
         *
         * @event visible
         * @memberof OpenSeadragon.Viewer
         * @type {object}
         * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
         * @property {Boolean} visible
         * @property {?Object} userData - Arbitrary subscriber-defined object.
         */
        this.raiseEvent( 'visible', { visible: visible } );
        return this;
    },

    /**
     * Add a layer.
     * options.tileSource can be anything that {@link OpenSeadragon.Viewer#open}
     *  supports except arrays of images as layers cannot be sequences.
     * @function
     * @param {Object} options
     * @param {String|Object|Function} options.tileSource The TileSource of the layer.
     * @param {Number} [options.opacity=1] The opacity of the layer.
     * @param {Number} [options.level] The level of the layer. Added on top of
     * all other layers if not specified.
     * @returns {OpenSeadragon.Viewer} Chainable.
     * @fires OpenSeadragon.Viewer.event:add-layer
     * @fires OpenSeadragon.Viewer.event:add-layer-failed
     */
    addLayer: function( options ) {
        var _this = this,
            tileSource = options.tileSource;

        if ( !this.isOpen() ) {
            throw new Error( "An image must be loaded before adding layers." );
        }
        if ( !tileSource ) {
            throw new Error( "No tile source provided as new layer." );
        }
        if ( this.collectionMode ) {
            throw new Error( "Layers not supported in collection mode." );
        }

        function raiseAddLayerFailed( event ) {
             /**
             * Raised when an error occurs while adding a layer.
             * @event add-layer-failed
             * @memberOf OpenSeadragon.Viewer
             * @type {object}
             * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
             * @property {String} message
             * @property {String} source
             * @property {Object} options The options passed to the addLayer method.
             * @property {?Object} userData - Arbitrary subscriber-defined object.
             */
            _this.raiseEvent( 'add-layer-failed', event );
        }

        getTileSourceImplementation( this, tileSource, function( tileSource ) {

            if ( tileSource instanceof Array ) {
                raiseAddLayerFailed({
                    message: "Sequences can not be added as layers.",
                    source: tileSource,
                    options: options
                });
                return;
            }

            for ( var i = 0; i < _this.drawers.length; i++ ) {
                var otherAspectRatio = _this.drawers[ i ].source.aspectRatio;
                var diff = otherAspectRatio - tileSource.aspectRatio;
                if ( Math.abs( diff ) > _this.layersAspectRatioEpsilon ) {
                    raiseAddLayerFailed({
                        message: "Aspect ratio mismatch with layer " + i + ".",
                        source: tileSource,
                        options: options
                    });
                    return;
                }
            }

            var drawer = new $.Drawer({
                viewer: _this,
                source: tileSource,
                viewport: _this.viewport,
                element: _this.drawersContainer,
                opacity: options.opacity !== undefined ?
                    options.opacity : _this.opacity,
                maxImageCacheCount: _this.maxImageCacheCount,
                imageLoaderLimit: _this.imageLoaderLimit,
                minZoomImageRatio: _this.minZoomImageRatio,
                wrapHorizontal: _this.wrapHorizontal,
                wrapVertical: _this.wrapVertical,
                immediateRender: _this.immediateRender,
                blendTime: _this.blendTime,
                alwaysBlend: _this.alwaysBlend,
                minPixelRatio: _this.minPixelRatio,
                timeout: _this.timeout,
                debugMode: _this.debugMode,
                debugGridColor: _this.debugGridColor
            });
            _this.drawers.push( drawer );
            if ( options.level !== undefined ) {
                _this.setLayerLevel( drawer, options.level );
            }
            THIS[ _this.hash ].forceRedraw = true;
            /**
             * Raised when a layer is successfully added.
             * @event add-layer
             * @memberOf OpenSeadragon.Viewer
             * @type {object}
             * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
             * @property {Object} options The options passed to the addLayer method.
             * @property {OpenSeadragon.Drawer} drawer The layer's underlying drawer.
             * @property {?Object} userData - Arbitrary subscriber-defined object.
             */
            _this.raiseEvent( 'add-layer', {
                options: options,
                drawer: drawer
            });
        }, function( event ) {
            event.options = options;
            raiseAddLayerFailed(event);
        } );

        return this;
    },

    /**
     * Get the layer at the specified level.
     * @param {Number} level The layer to retrieve level.
     * @returns {OpenSeadragon.Drawer} The layer at the specified level.
     */
    getLayerAtLevel: function( level ) {
        if ( level >= this.drawers.length ) {
            throw new Error( "Level bigger than number of layers." );
        }
        return this.drawers[ level ];
    },

    /**
     * Get the level of the layer associated with the given drawer or -1 if not
     * present.
     * @param {OpenSeadragon.Drawer} drawer The underlying drawer of the layer.
     * @returns {Number} The level of the layer or -1 if not present.
     */
    getLevelOfLayer: function( drawer ) {
        return $.indexOf( this.drawers, drawer );
    },

    /**
     * Get the number of layers used.
     * @returns {Number} The number of layers used.
     */
    getLayersCount: function() {
        return this.drawers.length;
    },

    /**
     * Change the level of a layer so that it appears over or under others.
     * @param {OpenSeadragon.Drawer} drawer The underlying drawer of the changing
     * level layer.
     * @param {Number} level The new level
     * @returns {OpenSeadragon.Viewer} Chainable.
     * @fires OpenSeadragon.Viewer.event:layer-level-changed
     */
    setLayerLevel: function( drawer, level ) {
        var oldLevel = this.getLevelOfLayer( drawer );

        if ( level >= this.drawers.length ) {
            throw new Error( "Level bigger than number of layers." );
        }
        if ( level === oldLevel || oldLevel === -1 ) {
            return this;
        }
        if ( level === 0 || oldLevel === 0 ) {
            if ( THIS[ this.hash ].sequenced ) {
                throw new Error( "Cannot reassign base level when in sequence mode." );
            }
            // We need to re-assign the base drawer and the source
            this.drawer = level === 0 ? drawer : this.getLayerAtLevel( level );
            this.source = this.drawer.source;
        }
        this.drawers.splice( oldLevel, 1 );
        this.drawers.splice( level, 0, drawer );
        this.drawersContainer.removeChild( drawer.canvas );
        if ( level === 0 ) {
            var nextLevelCanvas = this.drawers[ 1 ].canvas;
            nextLevelCanvas.parentNode.insertBefore( drawer.canvas,
                nextLevelCanvas );
        } else {
            // Insert right after layer at level - 1
            var prevLevelCanvas = this.drawers[level - 1].canvas;
            prevLevelCanvas.parentNode.insertBefore( drawer.canvas,
                prevLevelCanvas.nextSibling );
        }

        /**
         * Raised when the order of the layers has been changed.
         * @event layer-level-changed
         * @memberOf OpenSeadragon.Viewer
         * @type {object}
         * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
         * @property {OpenSeadragon.Drawer} drawer - The drawer which level has
         * been changed
         * @property {Number} previousLevel - The previous level of the drawer
         * @property {Number} newLevel - The new level of the drawer
         * @property {?Object} userData - Arbitrary subscriber-defined object.
         */
        this.raiseEvent( 'layer-level-changed', {
            drawer: drawer,
            previousLevel: oldLevel,
            newLevel: level
        } );

        return this;
    },

    /**
     * Remove a layer. If there is only one layer, close the viewer.
     * @function
     * @param {OpenSeadragon.Drawer} drawer The underlying drawer of the layer 
     * to remove
     * @returns {OpenSeadragon.Viewer} Chainable.
     * @fires OpenSeadragon.Viewer.event:remove-layer
     */
    removeLayer: function( drawer ) {
        var index = this.drawers.indexOf( drawer );
        if ( index === -1 ) {
            return this;
        }
        if ( index === 0 ) {
            if ( THIS[ this.hash ].sequenced ) {
                throw new Error( "Cannot remove base layer when in sequence mode." );
            }
            if ( this.drawers.length === 1 ) {
                this.close();
                return this;
            }
            this.drawer = this.drawers[ 1 ];
        }

        this.drawers.splice( index, 1 );
        this.drawersContainer.removeChild( drawer.canvas );
        /**
         * Raised when a layer is removed.
         * @event remove-layer
         * @memberOf OpenSeadragon.Viewer
         * @type {object}
         * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
         * @property {OpenSeadragon.Drawer} drawer The layer's underlying drawer.
         * @property {?Object} userData - Arbitrary subscriber-defined object.
         */
        this.raiseEvent( 'remove-layer', { drawer: drawer } );
        return this;
    },

    /**
     * Force the viewer to redraw its drawers.
     * @returns {OpenSeadragon.Viewer} Chainable.
     */
    forceRedraw: function() {
        THIS[ this.hash ].forceRedraw = true;
        return this;
    },

    /**
     * @function
     * @return {OpenSeadragon.Viewer} Chainable.
     */
    bindSequenceControls: function(){

        //////////////////////////////////////////////////////////////////////////
        // Image Sequence Controls
        //////////////////////////////////////////////////////////////////////////
        var onFocusHandler          = $.delegate( this, onFocus ),
            onBlurHandler           = $.delegate( this, onBlur ),
            onNextHandler           = $.delegate( this, onNext ),
            onPreviousHandler       = $.delegate( this, onPrevious ),
            navImages               = this.navImages,
            useGroup                = true ;

        if( this.showSequenceControl && THIS[ this.hash ].sequenced ){

            if( this.previousButton || this.nextButton ){
                //if we are binding to custom buttons then layout and
                //grouping is the responsibility of the page author
                useGroup = false;
            }

            this.previousButton = new $.Button({
                element:    this.previousButton ? $.getElement( this.previousButton ) : null,
                clickTimeThreshold: this.clickTimeThreshold,
                clickDistThreshold: this.clickDistThreshold,
                tooltip:    $.getString( "Tooltips.PreviousPage" ),
                srcRest:    resolveUrl( this.prefixUrl, navImages.previous.REST ),
                srcGroup:   resolveUrl( this.prefixUrl, navImages.previous.GROUP ),
                srcHover:   resolveUrl( this.prefixUrl, navImages.previous.HOVER ),
                srcDown:    resolveUrl( this.prefixUrl, navImages.previous.DOWN ),
                onRelease:  onPreviousHandler,
                onFocus:    onFocusHandler,
                onBlur:     onBlurHandler
            });

            this.nextButton = new $.Button({
                element:    this.nextButton ? $.getElement( this.nextButton ) : null,
                clickTimeThreshold: this.clickTimeThreshold,
                clickDistThreshold: this.clickDistThreshold,
                tooltip:    $.getString( "Tooltips.NextPage" ),
                srcRest:    resolveUrl( this.prefixUrl, navImages.next.REST ),
                srcGroup:   resolveUrl( this.prefixUrl, navImages.next.GROUP ),
                srcHover:   resolveUrl( this.prefixUrl, navImages.next.HOVER ),
                srcDown:    resolveUrl( this.prefixUrl, navImages.next.DOWN ),
                onRelease:  onNextHandler,
                onFocus:    onFocusHandler,
                onBlur:     onBlurHandler
            });

            if( !this.navPrevNextWrap ){
                this.previousButton.disable();
            }

            if( useGroup ){
                this.paging = new $.ButtonGroup({
                    buttons: [
                        this.previousButton,
                        this.nextButton
                    ],
                    clickTimeThreshold: this.clickTimeThreshold,
                    clickDistThreshold: this.clickDistThreshold
                });

                this.pagingControl = this.paging.element;

                if( this.toolbar ){
                    this.toolbar.addControl(
                        this.pagingControl,
                        {anchor: $.ControlAnchor.BOTTOM_RIGHT}
                    );
                }else{
                    this.addControl(
                        this.pagingControl,
                        {anchor: this.sequenceControlAnchor || $.ControlAnchor.TOP_LEFT}
                    );
                }
            }
        }
        return this;
    },


    /**
     * @function
     * @return {OpenSeadragon.Viewer} Chainable.
     */
    bindStandardControls: function(){
        //////////////////////////////////////////////////////////////////////////
        // Navigation Controls
        //////////////////////////////////////////////////////////////////////////
        var beginZoomingInHandler   = $.delegate( this, beginZoomingIn ),
            endZoomingHandler       = $.delegate( this, endZooming ),
            doSingleZoomInHandler   = $.delegate( this, doSingleZoomIn ),
            beginZoomingOutHandler  = $.delegate( this, beginZoomingOut ),
            doSingleZoomOutHandler  = $.delegate( this, doSingleZoomOut ),
            onHomeHandler           = $.delegate( this, onHome ),
            onFullScreenHandler     = $.delegate( this, onFullScreen ),
            onRotateLeftHandler     = $.delegate( this, onRotateLeft ),
            onRotateRightHandler    = $.delegate( this, onRotateRight ),
            onFocusHandler          = $.delegate( this, onFocus ),
            onBlurHandler           = $.delegate( this, onBlur ),
            navImages               = this.navImages,
            buttons                 = [],
            useGroup                = true ;


        if ( this.showNavigationControl ) {

            if( this.zoomInButton || this.zoomOutButton ||
                this.homeButton || this.fullPageButton ||
                this.rotateLeftButton || this.rotateRightButton ) {
                //if we are binding to custom buttons then layout and
                //grouping is the responsibility of the page author
                useGroup = false;
            }

            if ( this.showZoomControl ) {
                buttons.push( this.zoomInButton = new $.Button({
                    element:    this.zoomInButton ? $.getElement( this.zoomInButton ) : null,
                    clickTimeThreshold: this.clickTimeThreshold,
                    clickDistThreshold: this.clickDistThreshold,
                    tooltip:    $.getString( "Tooltips.ZoomIn" ),
                    srcRest:    resolveUrl( this.prefixUrl, navImages.zoomIn.REST ),
                    srcGroup:   resolveUrl( this.prefixUrl, navImages.zoomIn.GROUP ),
                    srcHover:   resolveUrl( this.prefixUrl, navImages.zoomIn.HOVER ),
                    srcDown:    resolveUrl( this.prefixUrl, navImages.zoomIn.DOWN ),
                    onPress:    beginZoomingInHandler,
                    onRelease:  endZoomingHandler,
                    onClick:    doSingleZoomInHandler,
                    onEnter:    beginZoomingInHandler,
                    onExit:     endZoomingHandler,
                    onFocus:    onFocusHandler,
                    onBlur:     onBlurHandler
                }));

                buttons.push( this.zoomOutButton = new $.Button({
                    element:    this.zoomOutButton ? $.getElement( this.zoomOutButton ) : null,
                    clickTimeThreshold: this.clickTimeThreshold,
                    clickDistThreshold: this.clickDistThreshold,
                    tooltip:    $.getString( "Tooltips.ZoomOut" ),
                    srcRest:    resolveUrl( this.prefixUrl, navImages.zoomOut.REST ),
                    srcGroup:   resolveUrl( this.prefixUrl, navImages.zoomOut.GROUP ),
                    srcHover:   resolveUrl( this.prefixUrl, navImages.zoomOut.HOVER ),
                    srcDown:    resolveUrl( this.prefixUrl, navImages.zoomOut.DOWN ),
                    onPress:    beginZoomingOutHandler,
                    onRelease:  endZoomingHandler,
                    onClick:    doSingleZoomOutHandler,
                    onEnter:    beginZoomingOutHandler,
                    onExit:     endZoomingHandler,
                    onFocus:    onFocusHandler,
                    onBlur:     onBlurHandler
                }));
            }

            if ( this.showHomeControl ) {
                buttons.push( this.homeButton = new $.Button({
                    element:    this.homeButton ? $.getElement( this.homeButton ) : null,
                    clickTimeThreshold: this.clickTimeThreshold,
                    clickDistThreshold: this.clickDistThreshold,
                    tooltip:    $.getString( "Tooltips.Home" ),
                    srcRest:    resolveUrl( this.prefixUrl, navImages.home.REST ),
                    srcGroup:   resolveUrl( this.prefixUrl, navImages.home.GROUP ),
                    srcHover:   resolveUrl( this.prefixUrl, navImages.home.HOVER ),
                    srcDown:    resolveUrl( this.prefixUrl, navImages.home.DOWN ),
                    onRelease:  onHomeHandler,
                    onFocus:    onFocusHandler,
                    onBlur:     onBlurHandler
                }));
            }

            if ( this.showFullPageControl ) {
                buttons.push( this.fullPageButton = new $.Button({
                    element:    this.fullPageButton ? $.getElement( this.fullPageButton ) : null,
                    clickTimeThreshold: this.clickTimeThreshold,
                    clickDistThreshold: this.clickDistThreshold,
                    tooltip:    $.getString( "Tooltips.FullPage" ),
                    srcRest:    resolveUrl( this.prefixUrl, navImages.fullpage.REST ),
                    srcGroup:   resolveUrl( this.prefixUrl, navImages.fullpage.GROUP ),
                    srcHover:   resolveUrl( this.prefixUrl, navImages.fullpage.HOVER ),
                    srcDown:    resolveUrl( this.prefixUrl, navImages.fullpage.DOWN ),
                    onRelease:  onFullScreenHandler,
                    onFocus:    onFocusHandler,
                    onBlur:     onBlurHandler
                }));
            }

            if ( this.showRotationControl ) {
                buttons.push( this.rotateLeftButton = new $.Button({
                    element:    this.rotateLeftButton ? $.getElement( this.rotateLeftButton ) : null,
                    clickTimeThreshold: this.clickTimeThreshold,
                    clickDistThreshold: this.clickDistThreshold,
                    tooltip:    $.getString( "Tooltips.RotateLeft" ),
                    srcRest:    resolveUrl( this.prefixUrl, navImages.rotateleft.REST ),
                    srcGroup:   resolveUrl( this.prefixUrl, navImages.rotateleft.GROUP ),
                    srcHover:   resolveUrl( this.prefixUrl, navImages.rotateleft.HOVER ),
                    srcDown:    resolveUrl( this.prefixUrl, navImages.rotateleft.DOWN ),
                    onRelease:  onRotateLeftHandler,
                    onFocus:    onFocusHandler,
                    onBlur:     onBlurHandler
                }));

                buttons.push( this.rotateRightButton = new $.Button({
                    element:    this.rotateRightButton ? $.getElement( this.rotateRightButton ) : null,
                    clickTimeThreshold: this.clickTimeThreshold,
                    clickDistThreshold: this.clickDistThreshold,
                    tooltip:    $.getString( "Tooltips.RotateRight" ),
                    srcRest:    resolveUrl( this.prefixUrl, navImages.rotateright.REST ),
                    srcGroup:   resolveUrl( this.prefixUrl, navImages.rotateright.GROUP ),
                    srcHover:   resolveUrl( this.prefixUrl, navImages.rotateright.HOVER ),
                    srcDown:    resolveUrl( this.prefixUrl, navImages.rotateright.DOWN ),
                    onRelease:  onRotateRightHandler,
                    onFocus:    onFocusHandler,
                    onBlur:     onBlurHandler
                }));

            }

            if ( useGroup ) {
                this.buttons = new $.ButtonGroup({
                    buttons:            buttons,
                    clickTimeThreshold: this.clickTimeThreshold,
                    clickDistThreshold: this.clickDistThreshold
                });

                this.navControl  = this.buttons.element;
                this.addHandler( 'open', $.delegate( this, lightUp ) );

                if( this.toolbar ){
                    this.toolbar.addControl(
                        this.navControl,
                        {anchor: $.ControlAnchor.TOP_LEFT}
                    );
                } else {
                    this.addControl(
                        this.navControl,
                        {anchor: this.navigationControlAnchor || $.ControlAnchor.TOP_LEFT}
                    );
                }
            }

        }
        return this;
    },
    
    /**
     * Gets the active page of a sequence
     * @function
     * @return {Number}
     */
    currentPage: function() {
        return THIS[ this.hash ].sequence;
    },

    /**
     * @function
     * @return {OpenSeadragon.Viewer} Chainable.
     * @fires OpenSeadragon.Viewer.event:page
     */
    goToPage: function( page ){
        if( page >= 0 && page < this.tileSources.length ){
            /**
             * Raised when the page is changed on a viewer configured with multiple image sources (see {@link OpenSeadragon.Viewer#goToPage}).
             *
             * @event page
             * @memberof OpenSeadragon.Viewer
             * @type {Object}
             * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
             * @property {Number} page - The page index.
             * @property {?Object} userData - Arbitrary subscriber-defined object.
             */
            this.raiseEvent( 'page', { page: page } );

            THIS[ this.hash ].sequence = page;

            this._updateSequenceButtons( page );

            this.open( this.tileSources[ page ] );

            if( this.referenceStrip ){
                this.referenceStrip.setFocus( page );
            }
        }

        return this;
    },

   /**
     * Adds an html element as an overlay to the current viewport.  Useful for
     * highlighting words or areas of interest on an image or other zoomable
     * interface. The overlays added via this method are removed when the viewport
     * is closed which include when changing page.
     * @method
     * @param {Element|String|Object} element - A reference to an element or an id for
     *      the element which will overlayed. Or an Object specifying the configuration for the overlay
     * @param {OpenSeadragon.Point|OpenSeadragon.Rect} location - The point or
     *      rectangle which will be overlayed.
     * @param {OpenSeadragon.OverlayPlacement} placement - The position of the
     *      viewport which the location coordinates will be treated as relative
     *      to.
     * @param {function} onDraw - If supplied the callback is called when the overlay
     *      needs to be drawn. It it the responsibility of the callback to do any drawing/positioning.
     *      It is passed position, size and element.
     * @return {OpenSeadragon.Viewer} Chainable.
     * @fires OpenSeadragon.Viewer.event:add-overlay
     */
    addOverlay: function( element, location, placement, onDraw ) {
        var options;
        if( $.isPlainObject( element ) ){
            options = element;
        } else {
            options = {
                element: element,
                location: location,
                placement: placement,
                onDraw: onDraw
            };
        }

        element = $.getElement( options.element );

        if ( getOverlayIndex( this.currentOverlays, element ) >= 0 ) {
            // they're trying to add a duplicate overlay
            return this;
        }
        this.currentOverlays.push( getOverlayObject( this, options ) );
        THIS[ this.hash ].forceRedraw = true;
        /**
         * Raised when an overlay is added to the viewer (see {@link OpenSeadragon.Viewer#addOverlay}).
         *
         * @event add-overlay
         * @memberof OpenSeadragon.Viewer
         * @type {object}
         * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
         * @property {Element} element - The overlay element.
         * @property {OpenSeadragon.Point|OpenSeadragon.Rect} location
         * @property {OpenSeadragon.OverlayPlacement} placement
         * @property {?Object} userData - Arbitrary subscriber-defined object.
         */
        this.raiseEvent( 'add-overlay', {
            element: element,
            location: options.location,
            placement: options.placement
        });
        return this;
    },

    /**
     * Updates the overlay represented by the reference to the element or
     * element id moving it to the new location, relative to the new placement.
     * @method
     * @param {OpenSeadragon.Point|OpenSeadragon.Rect} location - The point or
     *      rectangle which will be overlayed.
     * @param {OpenSeadragon.OverlayPlacement} placement - The position of the
     *      viewport which the location coordinates will be treated as relative
     *      to.
     * @return {OpenSeadragon.Viewer} Chainable.
     * @fires OpenSeadragon.Viewer.event:update-overlay
     */
    updateOverlay: function( element, location, placement ) {
        var i;

        element = $.getElement( element );
        i = getOverlayIndex( this.currentOverlays, element );

        if ( i >= 0 ) {
            this.currentOverlays[ i ].update( location, placement );
            THIS[ this.hash ].forceRedraw = true;
            /**
             * Raised when an overlay's location or placement changes
             * (see {@link OpenSeadragon.Viewer#updateOverlay}).
             *
             * @event update-overlay
             * @memberof OpenSeadragon.Viewer
             * @type {object}
             * @property {OpenSeadragon.Viewer} eventSource - A reference to the
             * Viewer which raised the event.
             * @property {Element} element
             * @property {OpenSeadragon.Point|OpenSeadragon.Rect} location
             * @property {OpenSeadragon.OverlayPlacement} placement
             * @property {?Object} userData - Arbitrary subscriber-defined object.
             */
            this.raiseEvent( 'update-overlay', {
                element: element,
                location: location,
                placement: placement
            });
        }
        return this;
    },

    /**
     * Removes an overlay identified by the reference element or element id
     * and schedules an update.
     * @method
     * @param {Element|String} element - A reference to the element or an
     *      element id which represent the ovelay content to be removed.
     * @return {OpenSeadragon.Viewer} Chainable.
     * @fires OpenSeadragon.Viewer.event:remove-overlay
     */
    removeOverlay: function( element ) {
        var i;

        element = $.getElement( element );
        i = getOverlayIndex( this.currentOverlays, element );

        if ( i >= 0 ) {
            this.currentOverlays[ i ].destroy();
            this.currentOverlays.splice( i, 1 );
            THIS[ this.hash ].forceRedraw = true;
            /**
             * Raised when an overlay is removed from the viewer
             * (see {@link OpenSeadragon.Viewer#removeOverlay}).
             *
             * @event remove-overlay
             * @memberof OpenSeadragon.Viewer
             * @type {object}
             * @property {OpenSeadragon.Viewer} eventSource - A reference to the
             * Viewer which raised the event.
             * @property {Element} element - The overlay element.
             * @property {?Object} userData - Arbitrary subscriber-defined object.
             */
            this.raiseEvent( 'remove-overlay', {
                element: element
            });
        }
        return this;
    },

    /**
     * Removes all currently configured Overlays from this Viewer and schedules
     * an update.
     * @method
     * @return {OpenSeadragon.Viewer} Chainable.
     * @fires OpenSeadragon.Viewer.event:clear-overlay
     */
    clearOverlays: function() {
        while ( this.currentOverlays.length > 0 ) {
            this.currentOverlays.pop().destroy();
        }
        THIS[ this.hash ].forceRedraw = true;
        /**
         * Raised when all overlays are removed from the viewer (see {@link OpenSeadragon.Drawer#clearOverlays}).
         *
         * @event clear-overlay
         * @memberof OpenSeadragon.Viewer
         * @type {object}
         * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
         * @property {?Object} userData - Arbitrary subscriber-defined object.
         */
        this.raiseEvent( 'clear-overlay', {} );
        return this;
    },

    /**
     * Updates the sequence buttons.
     * @function OpenSeadragon.Viewer.prototype._updateSequenceButtons
     * @private
     * @param {Number} Sequence Value
     */
    _updateSequenceButtons: function( page ) {

            if ( this.nextButton ) {
                if( ( this.tileSources.length - 1 ) === page ) {
                    //Disable next button
                    if ( !this.navPrevNextWrap ) {
                        this.nextButton.disable();
                    }
                } else {
                    this.nextButton.enable();
                }
            }
            if ( this.previousButton ) {
                if ( page > 0 ) {
                    //Enable previous button
                    this.previousButton.enable();
                } else {
                    if ( !this.navPrevNextWrap ) {
                        this.previousButton.disable();
                    }
                }
            }
      },
      
    /**
     * Display a message in the viewport
     * @function OpenSeadragon.Viewer.prototype._showMessage
     * @private
     * @param {String} text message
     */
    _showMessage: function ( message ) {
        this._hideMessage();

        var div = $.makeNeutralElement( "div" );
        div.appendChild( document.createTextNode( message ) );

        this.messageDiv = $.makeCenteredNode( div );

        $.addClass(this.messageDiv, "openseadragon-message");

        this.container.appendChild( this.messageDiv );
    },

    /**
     * Hide any currently displayed viewport message
     * @function OpenSeadragon.Viewer.prototype._hideMessage
     * @private
     */
    _hideMessage: function () {
        var div = this.messageDiv;
        if (div) {
            div.parentNode.removeChild(div);
            delete this.messageDiv;
        }
    },

    /**
     * Gets this viewer's gesture settings for the given pointer device type.
     * @method
     * @param {String} type - The pointer device type to get the gesture settings for ("mouse", "touch", "pen", etc.).
     * @return {OpenSeadragon.GestureSettings}
     */
    gestureSettingsByDeviceType: function ( type ) {
        switch ( type ) {
            case 'mouse':
                return this.gestureSettingsMouse;
            case 'touch':
                return this.gestureSettingsTouch;
            case 'pen':
                return this.gestureSettingsPen;
            default:
                return this.gestureSettingsUnknown;
        }
    }

});


/**
 * _getSafeElemSize is like getElementSize(), but refuses to return 0 for x or y,
 * which was causing some calling operations in updateOnce and openTileSource to
 * return NaN.
 * @returns {Point}
 * @private
 */
function _getSafeElemSize (oElement) {
    oElement = $.getElement( oElement );

    return new $.Point(
        (oElement.clientWidth === 0 ? 1 : oElement.clientWidth),
        (oElement.clientHeight === 0 ? 1 : oElement.clientHeight)
    );
}

/**
 * @function
 * @private
 */
function getTileSourceImplementation( viewer, tileSource, successCallback,
    failCallback ) {
    var _this = viewer;

    //allow plain xml strings or json strings to be parsed here
    if ( $.type( tileSource ) == 'string' ) {
        if ( tileSource.match( /\s*<.*/ ) ) {
            tileSource = $.parseXml( tileSource );
        } else if ( tileSource.match( /\s*[\{\[].*/ ) ) {
            /*jshint evil:true*/
            tileSource = eval( '(' + tileSource + ')' );
        }
    }

    setTimeout( function() {
        if ( $.type( tileSource ) == 'string' ) {
            //If its still a string it means it must be a url at this point
            tileSource = new $.TileSource( tileSource, function( event ) {
                successCallback( event.tileSource );
            });
            tileSource.addHandler( 'open-failed', function( event ) {
                failCallback( event );
            } );

        } else if ( $.isPlainObject( tileSource ) || tileSource.nodeType ) {
            if ( $.isFunction( tileSource.getTileUrl ) ) {
                //Custom tile source
                var customTileSource = new $.TileSource( tileSource );
                customTileSource.getTileUrl = tileSource.getTileUrl;
                successCallback( customTileSource );
            } else {
                //inline configuration
                var $TileSource = $.TileSource.determineType( _this, tileSource );
                if ( !$TileSource ) {
                    failCallback( {
                        message: "Unable to load TileSource",
                        source: tileSource
                    });
                    return;
                }
                var options = $TileSource.prototype.configure.apply( _this, [ tileSource ] );
                var readySource = new $TileSource( options );
                successCallback( readySource );
            }
        } else {
            //can assume it's already a tile source implementation
            successCallback( tileSource );
        }
    }, 1 );
}

/**
 * @function
 * @private
 */
function openTileSource( viewer, source ) {
    var i,
        _this = viewer;

    if ( _this.source ) {
        _this.close( );
    }

    THIS[ _this.hash ].prevContainerSize = _getSafeElemSize( _this.container );


    if( _this.collectionMode ){
        _this.source = new $.TileSourceCollection({
            rows: _this.collectionRows,
            layout: _this.collectionLayout,
            tileSize: _this.collectionTileSize,
            tileSources: _this.tileSources,
            tileMargin: _this.collectionTileMargin
        });
        _this.viewport = _this.viewport ? _this.viewport : new $.Viewport({
            collectionMode:         true,
            collectionTileSource:   _this.source,
            containerSize:          THIS[ _this.hash ].prevContainerSize,
            contentSize:            _this.source.dimensions,
            springStiffness:        _this.springStiffness,
            animationTime:          _this.animationTime,
            showNavigator:          false,
            minZoomImageRatio:      1,
            maxZoomPixelRatio:      1,
            viewer:                 _this,
            degrees:                 _this.degrees //,
            //TODO: figure out how to support these in a way that makes sense
            //minZoomLevel:           this.minZoomLevel,
            //maxZoomLevel:           this.maxZoomLevel,
            //homeFillsViewer:        this.homeFillsViewer
        });
    } else {
        if( source ){
            _this.source = source;
        }
        _this.viewport = _this.viewport ? _this.viewport : new $.Viewport({
            containerSize:      THIS[ _this.hash ].prevContainerSize,
            contentSize:        _this.source.dimensions,
            springStiffness:    _this.springStiffness,
            animationTime:      _this.animationTime,
            minZoomImageRatio:  _this.minZoomImageRatio,
            maxZoomPixelRatio:  _this.maxZoomPixelRatio,
            visibilityRatio:    _this.visibilityRatio,
            wrapHorizontal:     _this.wrapHorizontal,
            wrapVertical:       _this.wrapVertical,
            defaultZoomLevel:   _this.defaultZoomLevel,
            minZoomLevel:       _this.minZoomLevel,
            maxZoomLevel:       _this.maxZoomLevel,
            viewer:             _this,
            degrees:            _this.degrees,
            navigatorRotate:    _this.navigatorRotate,
            homeFillsViewer:    _this.homeFillsViewer
        });
    }

    if( _this.preserveViewport ){
        _this.viewport.resetContentSize( _this.source.dimensions );
    }

    if( _this.preserveOverlays ){
        if( _this.currentOverlays.length > 0 ){
            _this.overlays = _this.currentOverlays;
        }
    }

    _this.source.overlays = _this.source.overlays || [];

    _this.drawer = new $.Drawer({
        viewer:             _this,
        source:             _this.source,
        viewport:           _this.viewport,
        element:            _this.drawersContainer,
        opacity:            _this.opacity,
        maxImageCacheCount: _this.maxImageCacheCount,
        imageLoaderLimit:   _this.imageLoaderLimit,
        minZoomImageRatio:  _this.minZoomImageRatio,
        wrapHorizontal:     _this.wrapHorizontal,
        wrapVertical:       _this.wrapVertical,
        immediateRender:    _this.immediateRender,
        blendTime:          _this.blendTime,
        alwaysBlend:        _this.alwaysBlend,
        minPixelRatio:      _this.collectionMode ? 0 : _this.minPixelRatio,
        timeout:            _this.timeout,
        debugMode:          _this.debugMode,
        debugGridColor:     _this.debugGridColor,
        crossOriginPolicy:  _this.crossOriginPolicy
    });
    _this.drawers = [_this.drawer];

    // Now that we have a drawer, see if it supports rotate. If not we need to remove the rotate buttons
    if (!_this.drawer.canRotate()) {
        // Disable/remove the rotate left/right buttons since they aren't supported
        if (_this.rotateLeft) {
            i = _this.buttons.buttons.indexOf(_this.rotateLeft);
            _this.buttons.buttons.splice(i, 1);
            _this.buttons.element.removeChild(_this.rotateLeft.element);
        }
        if (_this.rotateRight) {
            i = _this.buttons.buttons.indexOf(_this.rotateRight);
            _this.buttons.buttons.splice(i, 1);
            _this.buttons.element.removeChild(_this.rotateRight.element);
        }
    }

    //Instantiate a navigator if configured
    if ( _this.showNavigator  && !_this.collectionMode ){
        // Note: By passing the fully parsed source, the navigator doesn't
        // have to load it again.
        if ( _this.navigator ) {
            _this.navigator.open( source );
        } else {
            _this.navigator = new $.Navigator({
                id:                _this.navigatorId,
                position:          _this.navigatorPosition,
                sizeRatio:         _this.navigatorSizeRatio,
                maintainSizeRatio: _this.navigatorMaintainSizeRatio,
                top:               _this.navigatorTop,
                left:              _this.navigatorLeft,
                width:             _this.navigatorWidth,
                height:            _this.navigatorHeight,
                autoResize:        _this.navigatorAutoResize,
                tileSources:       source,
                tileHost:          _this.tileHost,
                prefixUrl:         _this.prefixUrl,
                viewer:            _this,
                navigatorRotate:   _this.navigatorRotate
            });
        }
    }

    //Instantiate a referencestrip if configured
    if ( _this.showReferenceStrip  && !_this.referenceStrip ){
        _this.referenceStrip = new $.ReferenceStrip({
            id:          _this.referenceStripElement,
            position:    _this.referenceStripPosition,
            sizeRatio:   _this.referenceStripSizeRatio,
            scroll:      _this.referenceStripScroll,
            height:      _this.referenceStripHeight,
            width:       _this.referenceStripWidth,
            tileSources: _this.tileSources,
            tileHost:    _this.tileHost,
            prefixUrl:   _this.prefixUrl,
            viewer:      _this
        });
    }

    //this.profiler = new $.Profiler();

    THIS[ _this.hash ].animating = false;
    THIS[ _this.hash ].forceRedraw = true;
    _this._updateRequestId = scheduleUpdate( _this, updateMulti );

    VIEWERS[ _this.hash ] = _this;

    loadOverlays( _this );

    /**
     * Raised when the viewer has opened and loaded one or more TileSources.
     *
     * @event open
     * @memberof OpenSeadragon.Viewer
     * @type {object}
     * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
     * @property {OpenSeadragon.TileSource} source
     * @property {?Object} userData - Arbitrary subscriber-defined object.
     */
    _this.raiseEvent( 'open', { source: source } );

    return _this;
}

function loadOverlays( _this ) {
    _this.currentOverlays = [];
    for ( var i = 0; i < _this.overlays.length; i++ ) {
        _this.currentOverlays[ i ] = getOverlayObject( _this, _this.overlays[ i ] );
    }
    for ( var j = 0; j < _this.source.overlays.length; j++ ) {
        _this.currentOverlays[ i + j ] =
            getOverlayObject( _this, _this.source.overlays[ j ] );
    }
}

function getOverlayObject( viewer, overlay ) {
    if ( overlay instanceof $.Overlay ) {
        return overlay;
    }

    var element = null;
    if ( overlay.element ) {
        element = $.getElement( overlay.element );
    } else {
        var id = overlay.id ?
            overlay.id :
            "openseadragon-overlay-" + Math.floor( Math.random() * 10000000 );

        element = $.getElement( overlay.id );
        if ( !element ) {
            element         = document.createElement( "a" );
            element.href    = "#/overlay/" + id;
        }
        element.id = id;
        $.addClass( element, overlay.className ?
            overlay.className :
            "openseadragon-overlay"
        );
    }

    var location = overlay.location;
    if ( !location ) {
        if ( overlay.width && overlay.height ) {
            location = overlay.px !== undefined ?
                viewer.viewport.imageToViewportRectangle( new $.Rect(
                    overlay.px,
                    overlay.py,
                    overlay.width,
                    overlay.height
                ) ) :
                new $.Rect(
                    overlay.x,
                    overlay.y,
                    overlay.width,
                    overlay.height
                );
        } else {
            location = overlay.px !== undefined ?
                viewer.viewport.imageToViewportCoordinates( new $.Point(
                    overlay.px,
                    overlay.py
                ) ) :
                new $.Point(
                    overlay.x,
                    overlay.y
                );
        }
    }

    var placement = overlay.placement;
    if ( placement && ( $.type( placement ) === "string" ) ) {
        placement = $.OverlayPlacement[ overlay.placement.toUpperCase() ];
    }

    return new $.Overlay({
        element: element,
        location: location,
        placement: placement,
        onDraw: overlay.onDraw,
        checkResize: overlay.checkResize
    });
}

/**
 * @private
 * @inner
 * Determines the index of the given overlay in the given overlays array.
 */
function getOverlayIndex( overlays, element ) {
    var i;
    for ( i = overlays.length - 1; i >= 0; i-- ) {
        if ( overlays[ i ].element === element ) {
            return i;
        }
    }

    return -1;
}

function drawOverlays( viewport, overlays, container ) {
    var i,
        length = overlays.length;
    for ( i = 0; i < length; i++ ) {
        overlays[ i ].drawHTML( container, viewport );
    }
}

///////////////////////////////////////////////////////////////////////////////
// Schedulers provide the general engine for animation
///////////////////////////////////////////////////////////////////////////////
function scheduleUpdate( viewer, updateFunc ){
    return $.requestAnimationFrame( function(){
        updateFunc( viewer );
    } );
}


//provides a sequence in the fade animation
function scheduleControlsFade( viewer ) {
    $.requestAnimationFrame( function(){
        updateControlsFade( viewer );
    });
}


//initiates an animation to hide the controls
function beginControlsAutoHide( viewer ) {
    if ( !viewer.autoHideControls ) {
        return;
    }
    viewer.controlsShouldFade = true;
    viewer.controlsFadeBeginTime =
        $.now() +
        viewer.controlsFadeDelay;

    window.setTimeout( function(){
        scheduleControlsFade( viewer );
    }, viewer.controlsFadeDelay );
}


//determines if fade animation is done or continues the animation
function updateControlsFade( viewer ) {
    var currentTime,
        deltaTime,
        opacity,
        i;
    if ( viewer.controlsShouldFade ) {
        currentTime = $.now();
        deltaTime = currentTime - viewer.controlsFadeBeginTime;
        opacity = 1.0 - deltaTime / viewer.controlsFadeLength;

        opacity = Math.min( 1.0, opacity );
        opacity = Math.max( 0.0, opacity );

        for ( i = viewer.controls.length - 1; i >= 0; i--) {
            if (viewer.controls[ i ].autoFade) {
                viewer.controls[ i ].setOpacity( opacity );
            }
        }

        if ( opacity > 0 ) {
            // fade again
            scheduleControlsFade( viewer );
        }
    }
}


//stop the fade animation on the controls and show them
function abortControlsAutoHide( viewer ) {
    var i;
    viewer.controlsShouldFade = false;
    for ( i = viewer.controls.length - 1; i >= 0; i-- ) {
        viewer.controls[ i ].setOpacity( 1.0 );
    }
}



///////////////////////////////////////////////////////////////////////////////
// Default view event handlers.
///////////////////////////////////////////////////////////////////////////////
function onFocus(){
    abortControlsAutoHide( this );
}

function onBlur(){
    beginControlsAutoHide( this );

}

function onCanvasKeyDown( event ) {
    if ( !event.preventDefaultAction && !event.ctrl && !event.alt && !event.meta ) {
        switch( event.keyCode ){
            case 38://up arrow
                if ( event.shift ) {
                    this.viewport.zoomBy(1.1);
                } else {
                    this.viewport.panBy(new $.Point(0, -0.05));
                }
                this.viewport.applyConstraints();
                return false;
            case 40://down arrow
                if ( event.shift ) {
                    this.viewport.zoomBy(0.9);
                } else {
                    this.viewport.panBy(new $.Point(0, 0.05));
                }
                this.viewport.applyConstraints();
                return false;
            case 37://left arrow
                this.viewport.panBy(new $.Point(-0.05, 0));
                this.viewport.applyConstraints();
                return false;
            case 39://right arrow
                this.viewport.panBy(new $.Point(0.05, 0));
                this.viewport.applyConstraints();
                return false;
            default:
                //console.log( 'navigator keycode %s', event.keyCode );
                return true;
        }
    } else {
        return true;
    }
}

function onCanvasKeyPress( event ) {
    if ( !event.preventDefaultAction && !event.ctrl && !event.alt && !event.meta ) {
        switch( event.keyCode ){
            case 61://=|+
                this.viewport.zoomBy(1.1);
                this.viewport.applyConstraints();
                return false;
            case 45://-|_
                this.viewport.zoomBy(0.9);
                this.viewport.applyConstraints();
                return false;
            case 48://0|)
                this.viewport.goHome();
                this.viewport.applyConstraints();
                return false;
            case 119://w
            case 87://W
                if ( event.shift ) {
                    this.viewport.zoomBy(1.1);
                } else {
                    this.viewport.panBy(new $.Point(0, -0.05));
                }
                this.viewport.applyConstraints();
                return false;
            case 115://s
            case 83://S
                if ( event.shift ) {
                    this.viewport.zoomBy(0.9);
                } else {
                    this.viewport.panBy(new $.Point(0, 0.05));
                }
                this.viewport.applyConstraints();
                return false;
            case 97://a
                this.viewport.panBy(new $.Point(-0.05, 0));
                this.viewport.applyConstraints();
                return false;
            case 100://d
                this.viewport.panBy(new $.Point(0.05, 0));
                this.viewport.applyConstraints();
                return false;
            default:
                //console.log( 'navigator keycode %s', event.keyCode );
                return true;
        }
    } else {
        return true;
    }
}

function onCanvasClick( event ) {
    var gestureSettings;

    var haveKeyboardFocus = document.activeElement == this.canvas;

    // If we don't have keyboard focus, request it.
    if ( !haveKeyboardFocus ) {
        this.canvas.focus();
    }

    if ( !event.preventDefaultAction && this.viewport && event.quick ) {
        gestureSettings = this.gestureSettingsByDeviceType( event.pointerType );
        if ( gestureSettings.clickToZoom ) {
            this.viewport.zoomBy(
                event.shift ? 1.0 / this.zoomPerClick : this.zoomPerClick,
                this.viewport.pointFromPixel( event.position, true )
            );
            this.viewport.applyConstraints();
        }
    }
    /**
     * Raised when a mouse press/release or touch/remove occurs on the {@link OpenSeadragon.Viewer#canvas} element.
     *
     * @event canvas-click
     * @memberof OpenSeadragon.Viewer
     * @type {object}
     * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised this event.
     * @property {OpenSeadragon.MouseTracker} tracker - A reference to the MouseTracker which originated this event.
     * @property {OpenSeadragon.Point} position - The position of the event relative to the tracked element.
     * @property {Boolean} quick - True only if the clickDistThreshold and clickTimeThreshold are both passed. Useful for differentiating between clicks and drags.
     * @property {Boolean} shift - True if the shift key was pressed during this event.
     * @property {Object} originalEvent - The original DOM event.
     * @property {?Object} userData - Arbitrary subscriber-defined object.
     */
    this.raiseEvent( 'canvas-click', {
        tracker: event.eventSource,
        position: event.position,
        quick: event.quick,
        shift: event.shift,
        originalEvent: event.originalEvent
    });
}

function onCanvasDblClick( event ) {
    var gestureSettings;

    if ( !event.preventDefaultAction && this.viewport ) {
        gestureSettings = this.gestureSettingsByDeviceType( event.pointerType );
        if ( gestureSettings.dblClickToZoom ) {
            this.viewport.zoomBy(
                event.shift ? 1.0 / this.zoomPerClick : this.zoomPerClick,
                this.viewport.pointFromPixel( event.position, true )
            );
            this.viewport.applyConstraints();
        }
    }
    /**
     * Raised when a double mouse press/release or touch/remove occurs on the {@link OpenSeadragon.Viewer#canvas} element.
     *
     * @event canvas-double-click
     * @memberof OpenSeadragon.Viewer
     * @type {object}
     * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised this event.
     * @property {OpenSeadragon.MouseTracker} tracker - A reference to the MouseTracker which originated this event.
     * @property {OpenSeadragon.Point} position - The position of the event relative to the tracked element.
     * @property {Boolean} shift - True if the shift key was pressed during this event.
     * @property {Object} originalEvent - The original DOM event.
     * @property {?Object} userData - Arbitrary subscriber-defined object.
     */
    this.raiseEvent( 'canvas-double-click', {
        tracker: event.eventSource,
        position: event.position,
        shift: event.shift,
        originalEvent: event.originalEvent
    });
}

function onCanvasDrag( event ) {
    var gestureSettings;

    if ( !event.preventDefaultAction && this.viewport ) {
        gestureSettings = this.gestureSettingsByDeviceType( event.pointerType );
        if( !this.panHorizontal ){
            event.delta.x = 0;
        }
        if( !this.panVertical ){
            event.delta.y = 0;
        }
        this.viewport.panBy( this.viewport.deltaPointsFromPixels( event.delta.negate() ), gestureSettings.flickEnabled );
        if( this.constrainDuringPan ){
            this.viewport.applyConstraints();
        }
    }
    /**
     * Raised when a mouse or touch drag operation occurs on the {@link OpenSeadragon.Viewer#canvas} element.
     *
     * @event canvas-drag
     * @memberof OpenSeadragon.Viewer
     * @type {object}
     * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised this event.
     * @property {OpenSeadragon.MouseTracker} tracker - A reference to the MouseTracker which originated this event.
     * @property {OpenSeadragon.Point} position - The position of the event relative to the tracked element.
     * @property {OpenSeadragon.Point} delta - The x,y components of the difference between start drag and end drag.
     * @property {Number} speed - Current computed speed, in pixels per second.
     * @property {Number} direction - Current computed direction, expressed as an angle counterclockwise relative to the positive X axis (-pi to pi, in radians). Only valid if speed > 0.
     * @property {Boolean} shift - True if the shift key was pressed during this event.
     * @property {Object} originalEvent - The original DOM event.
     * @property {?Object} userData - Arbitrary subscriber-defined object.
     */
    this.raiseEvent( 'canvas-drag', {
        tracker: event.eventSource,
        position: event.position,
        delta: event.delta,
        speed: event.speed,
        direction: event.direction,
        shift: event.shift,
        originalEvent: event.originalEvent
    });
}

function onCanvasDragEnd( event ) {
    var gestureSettings;

    if ( !event.preventDefaultAction && this.viewport ) {
        gestureSettings = this.gestureSettingsByDeviceType( event.pointerType );
        if ( gestureSettings.flickEnabled && event.speed >= gestureSettings.flickMinSpeed ) {
            var amplitudeX = gestureSettings.flickMomentum * ( event.speed * Math.cos( event.direction - (Math.PI / 180 * this.viewport.degrees) ) ),
                amplitudeY = gestureSettings.flickMomentum * ( event.speed * Math.sin( event.direction - (Math.PI / 180 * this.viewport.degrees) ) ),
                center = this.viewport.pixelFromPoint( this.viewport.getCenter( true ) ),
                target = this.viewport.pointFromPixel( new $.Point( center.x - amplitudeX, center.y - amplitudeY ) );
            if( !this.panHorizontal ) {
                target.x = center.x;
            }
            if( !this.panVertical ) {
                target.y = center.y;
            }
            this.viewport.panTo( target, false );
        }
        this.viewport.applyConstraints();
    }
    /**
     * Raised when a mouse or touch drag operation ends on the {@link OpenSeadragon.Viewer#canvas} element.
     *
     * @event canvas-drag-end
     * @memberof OpenSeadragon.Viewer
     * @type {object}
     * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised this event.
     * @property {OpenSeadragon.MouseTracker} tracker - A reference to the MouseTracker which originated this event.
     * @property {OpenSeadragon.Point} position - The position of the event relative to the tracked element.
     * @property {Number} speed - Speed at the end of a drag gesture, in pixels per second.
     * @property {Number} direction - Direction at the end of a drag gesture, expressed as an angle counterclockwise relative to the positive X axis (-pi to pi, in radians). Only valid if speed > 0.
     * @property {Boolean} shift - True if the shift key was pressed during this event.
     * @property {Object} originalEvent - The original DOM event.
     * @property {?Object} userData - Arbitrary subscriber-defined object.
     */
    this.raiseEvent( 'canvas-drag-end', {
        tracker: event.eventSource,
        position: event.position,
        speed: event.speed,
        direction: event.direction,
        shift: event.shift,
        originalEvent: event.originalEvent
    });
}

function onCanvasEnter( event ) {
    /**
     * Raised when a pointer enters the {@link OpenSeadragon.Viewer#canvas} element.
     *
     * @event canvas-enter
     * @memberof OpenSeadragon.Viewer
     * @type {object}
     * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised this event.
     * @property {OpenSeadragon.MouseTracker} tracker - A reference to the MouseTracker which originated this event.
     * @property {String} pointerType - "mouse", "touch", "pen", etc.
     * @property {OpenSeadragon.Point} position - The position of the event relative to the tracked element.
     * @property {Number} buttons - Current buttons pressed. A combination of bit flags 0: none, 1: primary (or touch contact), 2: secondary, 4: aux (often middle), 8: X1 (often back), 16: X2 (often forward), 32: pen eraser.
     * @property {Number} pointers - Number of pointers (all types) active in the tracked element.
     * @property {Boolean} insideElementPressed - True if the left mouse button is currently being pressed and was initiated inside the tracked element, otherwise false.
     * @property {Boolean} buttonDownAny - Was the button down anywhere in the screen during the event. <span style="color:red;">Deprecated. Use buttons instead.</span>
     * @property {Object} originalEvent - The original DOM event.
     * @property {?Object} userData - Arbitrary subscriber-defined object.
     */
    this.raiseEvent( 'canvas-enter', {
        tracker: event.eventSource,
        pointerType: event.pointerType,
        position: event.position,
        buttons: event.buttons,
        pointers: event.pointers,
        insideElementPressed: event.insideElementPressed,
        buttonDownAny: event.buttonDownAny,
        originalEvent: event.originalEvent
    });
}

function onCanvasExit( event ) {
    /**
     * Raised when a pointer leaves the {@link OpenSeadragon.Viewer#canvas} element.
     *
     * @event canvas-exit
     * @memberof OpenSeadragon.Viewer
     * @type {object}
     * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised this event.
     * @property {OpenSeadragon.MouseTracker} tracker - A reference to the MouseTracker which originated this event.
     * @property {String} pointerType - "mouse", "touch", "pen", etc.
     * @property {OpenSeadragon.Point} position - The position of the event relative to the tracked element.
     * @property {Number} buttons - Current buttons pressed. A combination of bit flags 0: none, 1: primary (or touch contact), 2: secondary, 4: aux (often middle), 8: X1 (often back), 16: X2 (often forward), 32: pen eraser.
     * @property {Number} pointers - Number of pointers (all types) active in the tracked element.
     * @property {Boolean} insideElementPressed - True if the left mouse button is currently being pressed and was initiated inside the tracked element, otherwise false.
     * @property {Boolean} buttonDownAny - Was the button down anywhere in the screen during the event. <span style="color:red;">Deprecated. Use buttons instead.</span>
     * @property {Object} originalEvent - The original DOM event.
     * @property {?Object} userData - Arbitrary subscriber-defined object.
     */
    this.raiseEvent( 'canvas-exit', {
        tracker: event.eventSource,
        pointerType: event.pointerType,
        position: event.position,
        buttons: event.buttons,
        pointers: event.pointers,
        insideElementPressed: event.insideElementPressed,
        buttonDownAny: event.buttonDownAny,
        originalEvent: event.originalEvent
    });
}

function onCanvasPress( event ) {
    /**
     * Raised when the primary mouse button is pressed or touch starts on the {@link OpenSeadragon.Viewer#canvas} element.
     *
     * @event canvas-press
     * @memberof OpenSeadragon.Viewer
     * @type {object}
     * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised this event.
     * @property {OpenSeadragon.MouseTracker} tracker - A reference to the MouseTracker which originated this event.
     * @property {String} pointerType - "mouse", "touch", "pen", etc.
     * @property {OpenSeadragon.Point} position - The position of the event relative to the tracked element.
     * @property {Boolean} insideElementPressed - True if the left mouse button is currently being pressed and was initiated inside the tracked element, otherwise false.
     * @property {Boolean} insideElementReleased - True if the cursor still inside the tracked element when the button was released.
     * @property {Object} originalEvent - The original DOM event.
     * @property {?Object} userData - Arbitrary subscriber-defined object.
     */
    this.raiseEvent( 'canvas-press', {
        tracker: event.eventSource,
        pointerType: event.pointerType,
        position: event.position,
        insideElementPressed: event.insideElementPressed,
        insideElementReleased: event.insideElementReleased,
        originalEvent: event.originalEvent
    });
}

function onCanvasRelease( event ) {
    /**
     * Raised when the primary mouse button is released or touch ends on the {@link OpenSeadragon.Viewer#canvas} element.
     *
     * @event canvas-release
     * @memberof OpenSeadragon.Viewer
     * @type {object}
     * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised this event.
     * @property {OpenSeadragon.MouseTracker} tracker - A reference to the MouseTracker which originated this event.
     * @property {String} pointerType - "mouse", "touch", "pen", etc.
     * @property {OpenSeadragon.Point} position - The position of the event relative to the tracked element.
     * @property {Boolean} insideElementPressed - True if the left mouse button is currently being pressed and was initiated inside the tracked element, otherwise false.
     * @property {Boolean} insideElementReleased - True if the cursor still inside the tracked element when the button was released.
     * @property {Object} originalEvent - The original DOM event.
     * @property {?Object} userData - Arbitrary subscriber-defined object.
     */
    this.raiseEvent( 'canvas-release', {
        tracker: event.eventSource,
        pointerType: event.pointerType,
        position: event.position,
        insideElementPressed: event.insideElementPressed,
        insideElementReleased: event.insideElementReleased,
        originalEvent: event.originalEvent
    });
}

function onCanvasNonPrimaryPress( event ) {
    /**
     * Raised when any non-primary pointer button is pressed on the {@link OpenSeadragon.Viewer#canvas} element.
     *
     * @event canvas-nonprimary-press
     * @memberof OpenSeadragon.Viewer
     * @type {object}
     * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised this event.
     * @property {OpenSeadragon.MouseTracker} tracker - A reference to the MouseTracker which originated this event.
     * @property {OpenSeadragon.Point} position - The position of the event relative to the tracked element.
     * @property {String} pointerType - "mouse", "touch", "pen", etc.
     * @property {Number} button - Button which caused the event.
     *      -1: none, 0: primary/left, 1: aux/middle, 2: secondary/right, 3: X1/back, 4: X2/forward, 5: pen eraser.
     * @property {Number} buttons - Current buttons pressed.
     *      Combination of bit flags 0: none, 1: primary (or touch contact), 2: secondary, 4: aux (often middle), 8: X1 (often back), 16: X2 (often forward), 32: pen eraser.
     * @property {Object} originalEvent - The original DOM event.
     * @property {?Object} userData - Arbitrary subscriber-defined object.
     */
    this.raiseEvent( 'canvas-nonprimary-press', {
        tracker: event.eventSource,
        position: event.position,
        pointerType: event.pointerType,
        button: event.button,
        buttons: event.buttons,
        originalEvent: event.originalEvent
    });
}

function onCanvasNonPrimaryRelease( event ) {
    /**
     * Raised when any non-primary pointer button is released on the {@link OpenSeadragon.Viewer#canvas} element.
     *
     * @event canvas-nonprimary-release
     * @memberof OpenSeadragon.Viewer
     * @type {object}
     * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised this event.
     * @property {OpenSeadragon.MouseTracker} tracker - A reference to the MouseTracker which originated this event.
     * @property {OpenSeadragon.Point} position - The position of the event relative to the tracked element.
     * @property {String} pointerType - "mouse", "touch", "pen", etc.
     * @property {Number} button - Button which caused the event.
     *      -1: none, 0: primary/left, 1: aux/middle, 2: secondary/right, 3: X1/back, 4: X2/forward, 5: pen eraser.
     * @property {Number} buttons - Current buttons pressed.
     *      Combination of bit flags 0: none, 1: primary (or touch contact), 2: secondary, 4: aux (often middle), 8: X1 (often back), 16: X2 (often forward), 32: pen eraser.
     * @property {Object} originalEvent - The original DOM event.
     * @property {?Object} userData - Arbitrary subscriber-defined object.
     */
    this.raiseEvent( 'canvas-nonprimary-release', {
        tracker: event.eventSource,
        position: event.position,
        pointerType: event.pointerType,
        button: event.button,
        buttons: event.buttons,
        originalEvent: event.originalEvent
    });
}

function onCanvasPinch( event ) {
    var gestureSettings,
        centerPt,
        lastCenterPt,
        panByPt;

    if ( !event.preventDefaultAction && this.viewport ) {
        gestureSettings = this.gestureSettingsByDeviceType( event.pointerType );
        if ( gestureSettings.pinchToZoom ) {
            centerPt = this.viewport.pointFromPixel( event.center, true );
            lastCenterPt = this.viewport.pointFromPixel( event.lastCenter, true );
            panByPt = lastCenterPt.minus( centerPt );
            if( !this.panHorizontal ) {
                panByPt.x = 0;
            }
            if( !this.panVertical ) {
                panByPt.y = 0;
            }
            this.viewport.zoomBy( event.distance / event.lastDistance, centerPt, true );
            this.viewport.panBy( panByPt, true );
            this.viewport.applyConstraints();
        }
        if ( gestureSettings.pinchRotate ) {
            // Pinch rotate
            var angle1 = Math.atan2(event.gesturePoints[0].currentPos.y - event.gesturePoints[1].currentPos.y,
                event.gesturePoints[0].currentPos.x - event.gesturePoints[1].currentPos.x);
            var angle2 = Math.atan2(event.gesturePoints[0].lastPos.y - event.gesturePoints[1].lastPos.y,
                event.gesturePoints[0].lastPos.x - event.gesturePoints[1].lastPos.x);
            this.viewport.setRotation(this.viewport.getRotation() + ((angle1 - angle2) * (180 / Math.PI)));
        }
    }
    /**
     * Raised when a pinch event occurs on the {@link OpenSeadragon.Viewer#canvas} element.
     *
     * @event canvas-pinch
     * @memberof OpenSeadragon.Viewer
     * @type {object}
     * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised this event.
     * @property {OpenSeadragon.MouseTracker} tracker - A reference to the MouseTracker which originated this event.
     * @property {Array.<OpenSeadragon.MouseTracker.GesturePoint>} gesturePoints - Gesture points associated with the gesture. Velocity data can be found here.
     * @property {OpenSeadragon.Point} lastCenter - The previous center point of the two pinch contact points relative to the tracked element.
     * @property {OpenSeadragon.Point} center - The center point of the two pinch contact points relative to the tracked element.
     * @property {Number} lastDistance - The previous distance between the two pinch contact points in CSS pixels.
     * @property {Number} distance - The distance between the two pinch contact points in CSS pixels.
     * @property {Boolean} shift - True if the shift key was pressed during this event.
     * @property {Object} originalEvent - The original DOM event.
     * @property {?Object} userData - Arbitrary subscriber-defined object.
     */
    this.raiseEvent('canvas-pinch', {
        tracker: event.eventSource,
        gesturePoints: event.gesturePoints,
        lastCenter: event.lastCenter,
        center: event.center,
        lastDistance: event.lastDistance,
        distance: event.distance,
        shift: event.shift,
        originalEvent: event.originalEvent
    });
    //cancels event
    return false;
}

function onCanvasScroll( event ) {
    var gestureSettings,
        factor;

    if ( !event.preventDefaultAction && this.viewport ) {
        gestureSettings = this.gestureSettingsByDeviceType( event.pointerType );
        if ( gestureSettings.scrollToZoom ) {
            factor = Math.pow( this.zoomPerScroll, event.scroll );
            this.viewport.zoomBy(
                factor,
                this.viewport.pointFromPixel( event.position, true )
            );
            this.viewport.applyConstraints();
        }
    }
    /**
     * Raised when a scroll event occurs on the {@link OpenSeadragon.Viewer#canvas} element (mouse wheel).
     *
     * @event canvas-scroll
     * @memberof OpenSeadragon.Viewer
     * @type {object}
     * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised this event.
     * @property {OpenSeadragon.MouseTracker} tracker - A reference to the MouseTracker which originated this event.
     * @property {OpenSeadragon.Point} position - The position of the event relative to the tracked element.
     * @property {Number} scroll - The scroll delta for the event.
     * @property {Boolean} shift - True if the shift key was pressed during this event.
     * @property {Object} originalEvent - The original DOM event.
     * @property {?Object} userData - Arbitrary subscriber-defined object.
     */
    this.raiseEvent( 'canvas-scroll', {
        tracker: event.eventSource,
        position: event.position,
        scroll: event.scroll,
        shift: event.shift,
        originalEvent: event.originalEvent
    });
    //cancels event
    return false;
}

function onContainerEnter( event ) {
    THIS[ this.hash ].mouseInside = true;
    abortControlsAutoHide( this );
    /**
     * Raised when the cursor enters the {@link OpenSeadragon.Viewer#container} element.
     *
     * @event container-enter
     * @memberof OpenSeadragon.Viewer
     * @type {object}
     * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised this event.
     * @property {OpenSeadragon.MouseTracker} tracker - A reference to the MouseTracker which originated this event.
     * @property {OpenSeadragon.Point} position - The position of the event relative to the tracked element.
     * @property {Number} buttons - Current buttons pressed. A combination of bit flags 0: none, 1: primary (or touch contact), 2: secondary, 4: aux (often middle), 8: X1 (often back), 16: X2 (often forward), 32: pen eraser.
     * @property {Number} pointers - Number of pointers (all types) active in the tracked element.
     * @property {Boolean} insideElementPressed - True if the left mouse button is currently being pressed and was initiated inside the tracked element, otherwise false.
     * @property {Boolean} buttonDownAny - Was the button down anywhere in the screen during the event. <span style="color:red;">Deprecated. Use buttons instead.</span>
     * @property {Object} originalEvent - The original DOM event.
     * @property {?Object} userData - Arbitrary subscriber-defined object.
     */
    this.raiseEvent( 'container-enter', {
        tracker: event.eventSource,
        position: event.position,
        buttons: event.buttons,
        pointers: event.pointers,
        insideElementPressed: event.insideElementPressed,
        buttonDownAny: event.buttonDownAny,
        originalEvent: event.originalEvent
    });
}

function onContainerExit( event ) {
    if ( event.pointers < 1 ) {
        THIS[ this.hash ].mouseInside = false;
        if ( !THIS[ this.hash ].animating ) {
            beginControlsAutoHide( this );
        }
    }
    /**
     * Raised when the cursor leaves the {@link OpenSeadragon.Viewer#container} element.
     *
     * @event container-exit
     * @memberof OpenSeadragon.Viewer
     * @type {object}
     * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised this event.
     * @property {OpenSeadragon.MouseTracker} tracker - A reference to the MouseTracker which originated this event.
     * @property {OpenSeadragon.Point} position - The position of the event relative to the tracked element.
     * @property {Number} buttons - Current buttons pressed. A combination of bit flags 0: none, 1: primary (or touch contact), 2: secondary, 4: aux (often middle), 8: X1 (often back), 16: X2 (often forward), 32: pen eraser.
     * @property {Number} pointers - Number of pointers (all types) active in the tracked element.
     * @property {Boolean} insideElementPressed - True if the left mouse button is currently being pressed and was initiated inside the tracked element, otherwise false.
     * @property {Boolean} buttonDownAny - Was the button down anywhere in the screen during the event. <span style="color:red;">Deprecated. Use buttons instead.</span>
     * @property {Object} originalEvent - The original DOM event.
     * @property {?Object} userData - Arbitrary subscriber-defined object.
     */
    this.raiseEvent( 'container-exit', {
        tracker: event.eventSource,
        position: event.position,
        buttons: event.buttons,
        pointers: event.pointers,
        insideElementPressed: event.insideElementPressed,
        buttonDownAny: event.buttonDownAny,
        originalEvent: event.originalEvent
    });
}


///////////////////////////////////////////////////////////////////////////////
// Page update routines ( aka Views - for future reference )
///////////////////////////////////////////////////////////////////////////////

function updateMulti( viewer ) {
    if ( !viewer.source ) {
        viewer._updateRequestId = null;
        return;
    }

    updateOnce( viewer );

    // Request the next frame, unless we've been closed during the updateOnce()
    if ( viewer.source ) {
        viewer._updateRequestId = scheduleUpdate( viewer, updateMulti );
    }
}

function updateOnce( viewer ) {

    var containerSize,
        animated;

    if ( !viewer.source ) {
        return;
    }

    //viewer.profiler.beginUpdate();

    if ( viewer.autoResize ) {
        containerSize = _getSafeElemSize( viewer.container );
        if ( !containerSize.equals( THIS[ viewer.hash ].prevContainerSize ) ) {
            // maintain image position
            var oldBounds = viewer.viewport.getBounds();
            var oldCenter = viewer.viewport.getCenter();
            resizeViewportAndRecenter(viewer, containerSize, oldBounds, oldCenter);
            THIS[ viewer.hash ].prevContainerSize = containerSize;
            THIS[ viewer.hash ].forceRedraw = true;
        }
    }

    animated = viewer.viewport.update();

    if( viewer.referenceStrip ){
        animated = viewer.referenceStrip.update( viewer.viewport ) || animated;
    }

    if ( !THIS[ viewer.hash ].animating && animated ) {
        /**
         * Raised when any spring animation starts (zoom, pan, etc.).
         *
         * @event animation-start
         * @memberof OpenSeadragon.Viewer
         * @type {object}
         * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised this event.
         * @property {?Object} userData - Arbitrary subscriber-defined object.
         */
        viewer.raiseEvent( "animation-start" );
        abortControlsAutoHide( viewer );
    }

    if ( animated ) {
        updateDrawers( viewer );
        drawOverlays( viewer.viewport, viewer.currentOverlays, viewer.overlaysContainer );
        if( viewer.navigator ){
            viewer.navigator.update( viewer.viewport );
        }
        /**
         * Raised when any spring animation update occurs (zoom, pan, etc.).
         *
         * @event animation
         * @memberof OpenSeadragon.Viewer
         * @type {object}
         * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised this event.
         * @property {?Object} userData - Arbitrary subscriber-defined object.
         */
        viewer.raiseEvent( "animation" );
    } else if ( THIS[ viewer.hash ].forceRedraw || drawersNeedUpdate( viewer ) ) {
        updateDrawers( viewer );
        drawOverlays( viewer.viewport, viewer.currentOverlays, viewer.overlaysContainer );
        if( viewer.navigator ){
            viewer.navigator.update( viewer.viewport );
        }
        THIS[ viewer.hash ].forceRedraw = false;
    }

    if ( THIS[ viewer.hash ].animating && !animated ) {
        /**
         * Raised when any spring animation ends (zoom, pan, etc.).
         *
         * @event animation-finish
         * @memberof OpenSeadragon.Viewer
         * @type {object}
         * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised this event.
         * @property {?Object} userData - Arbitrary subscriber-defined object.
         */
        viewer.raiseEvent( "animation-finish" );

        if ( !THIS[ viewer.hash ].mouseInside ) {
            beginControlsAutoHide( viewer );
        }
    }

    THIS[ viewer.hash ].animating = animated;

    //viewer.profiler.endUpdate();
}

// This function resizes the viewport and recenters the image
// as it was before resizing.
// TODO: better adjust width and height. The new width and height
// should depend on the image dimensions and on the dimensions
// of the viewport before and after switching mode.
function resizeViewportAndRecenter( viewer, containerSize, oldBounds, oldCenter ) {
    var viewport = viewer.viewport;

    viewport.resize( containerSize, true );

    // We try to remove blanks as much as possible
    var imageHeight = 1 / viewer.source.aspectRatio;
    var newWidth = oldBounds.width <= 1 ? oldBounds.width : 1;
    var newHeight = oldBounds.height <= imageHeight ?
        oldBounds.height : imageHeight;

    var newBounds = new $.Rect(
        oldCenter.x - ( newWidth / 2.0 ),
        oldCenter.y - ( newHeight / 2.0 ),
        newWidth,
        newHeight
        );
    viewport.fitBounds( newBounds, true );
}

function updateDrawers( viewer ) {
    for (var i = 0; i < viewer.drawers.length; i++ ) {
        viewer.drawers[i].update();
    }
}

function drawersNeedUpdate( viewer ) {
    for (var i = 0; i < viewer.drawers.length; i++ ) {
        if (viewer.drawers[i].needsUpdate()) {
            return true;
        }
    }
    return false;
}

///////////////////////////////////////////////////////////////////////////////
// Navigation Controls
///////////////////////////////////////////////////////////////////////////////
function resolveUrl( prefix, url ) {
    return prefix ? prefix + url : url;
}



function beginZoomingIn() {
    THIS[ this.hash ].lastZoomTime = $.now();
    THIS[ this.hash ].zoomFactor = this.zoomPerSecond;
    THIS[ this.hash ].zooming = true;
    scheduleZoom( this );
}


function beginZoomingOut() {
    THIS[ this.hash ].lastZoomTime = $.now();
    THIS[ this.hash ].zoomFactor = 1.0 / this.zoomPerSecond;
    THIS[ this.hash ].zooming = true;
    scheduleZoom( this );
}


function endZooming() {
    THIS[ this.hash ].zooming = false;
}


function scheduleZoom( viewer ) {
    $.requestAnimationFrame( $.delegate( viewer, doZoom ) );
}


function doZoom() {
    var currentTime,
        deltaTime,
        adjustedFactor;

    if ( THIS[ this.hash ].zooming && this.viewport) {
        currentTime     = $.now();
        deltaTime       = currentTime - THIS[ this.hash ].lastZoomTime;
        adjustedFactor  = Math.pow( THIS[ this.hash ].zoomFactor, deltaTime / 1000 );

        this.viewport.zoomBy( adjustedFactor );
        this.viewport.applyConstraints();
        THIS[ this.hash ].lastZoomTime = currentTime;
        scheduleZoom( this );
    }
}


function doSingleZoomIn() {
    if ( this.viewport ) {
        THIS[ this.hash ].zooming = false;
        this.viewport.zoomBy(
            this.zoomPerClick / 1.0
        );
        this.viewport.applyConstraints();
    }
}


function doSingleZoomOut() {
    if ( this.viewport ) {
        THIS[ this.hash ].zooming = false;
        this.viewport.zoomBy(
            1.0 / this.zoomPerClick
        );
        this.viewport.applyConstraints();
    }
}


function lightUp() {
    this.buttons.emulateEnter();
    this.buttons.emulateExit();
}


function onHome() {
    if ( this.viewport ) {
        this.viewport.goHome();
    }
}


function onFullScreen() {
    if ( this.isFullPage() && !$.isFullScreen() ) {
        // Is fullPage but not fullScreen
        this.setFullPage( false );
    } else {
        this.setFullScreen( !this.isFullPage() );
    }
    // correct for no mouseout event on change
    if ( this.buttons ) {
        this.buttons.emulateExit();
    }
    this.fullPageButton.element.focus();
    if ( this.viewport ) {
        this.viewport.applyConstraints();
    }
}

/**
 * Note: The current rotation feature is limited to 90 degree turns.
 */
function onRotateLeft() {
    if ( this.viewport ) {
        var currRotation = this.viewport.getRotation();
        if (currRotation === 0) {
            currRotation = 270;
        }
        else {
            currRotation -= 90;
        }
        this.viewport.setRotation(currRotation);
    }
}

/**
 * Note: The current rotation feature is limited to 90 degree turns.
 */
function onRotateRight() {
    if ( this.viewport ) {
        var currRotation = this.viewport.getRotation();
        if (currRotation === 270) {
            currRotation = 0;
        }
        else {
            currRotation += 90;
        }
        this.viewport.setRotation(currRotation);
    }
}


function onPrevious(){
    var previous = THIS[ this.hash ].sequence - 1;
    if(this.navPrevNextWrap && previous < 0){
        previous += this.tileSources.length;
    }
    this.goToPage( previous );
}


function onNext(){
    var next = THIS[ this.hash ].sequence + 1;
    if(this.navPrevNextWrap && next >= this.tileSources.length){
        next = 0;
    }
    this.goToPage( next );
}


}( OpenSeadragon ));
