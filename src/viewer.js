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
 * @class
 * @extends OpenSeadragon.EventHandler
 * @extends OpenSeadragon.ControlDock
 * @param {Object} options
 * @param {String} options.element Id of Element to attach to,
 * @param {String} options.xmlPath  Xpath ( TODO: not sure! ),
 * @param {String} options.prefixUrl  Url used to prepend to paths, eg button
 *  images, etc.
 * @param {OpenSeadragon.Control[]} options.controls Array of OpenSeadragon.Control,
 * @param {OpenSeadragon.Overlay[]} options.overlays Array of OpenSeadragon.Overlay,
 * @param {OpenSeadragon.Control[]} options.overlayControls An Array of ( TODO:
 *  not sure! )
 * @property {OpenSeadragon.Viewport} viewport The viewer's viewport, where you
 *  can access zoom, pan, etc.
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
            overlays:           args.length > 4 ? args[ 4 ] : undefined,
            overlayControls:    args.length > 5 ? args[ 5 ] : undefined
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
        hash:           options.id,

        //dom nodes
        element:        null,
        canvas:         null,
        container:      null,

        //TODO: not sure how to best describe these
        overlays:       [],
        overlayControls:[],

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
        //in initialize.  Its still considered idiomatic to put them here
        source:         null,
        drawer:         null,
        drawers:        [],
        viewport:       null,
        navigator:      null,

        //A collection viewport is a seperate viewport used to provide
        //simultanious rendering of sets of tiless
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

    //Inherit some behaviors and properties
    $.EventHandler.call( this );

    this.addHandler( 'open-failed', function (source, args) {
        var msg = $.getString( "Errors.Open-Failed", args.source, args.message);
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
            initialTileSource = this.tileSources[ 0 ];
        } else {
            initialTileSource = this.tileSources;
        }

        this.open( initialTileSource );
    }

    this.element              = this.element || document.getElementById( this.id );
    this.canvas               = $.makeNeutralElement( "div" );
    this.keyboardCommandArea  = $.makeNeutralElement( "textarea" );

    this.canvas.className = "openseadragon-canvas";
    (function( style ){
        style.width    = "100%";
        style.height   = "100%";
        style.overflow = "hidden";
        style.position = "absolute";
        style.top      = "0px";
        style.left     = "0px";
    }(  this.canvas.style ));

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

    this.keyboardCommandArea.className = "keyboard-command-area";
    (function( style ){
        style.width    = "100%";
        style.height   = "100%";
        style.overflow = "hidden";
        style.position = "absolute";
        style.top      = "0px";
        style.left     = "0px";
        style.resize   = "none";
    }(  this.keyboardCommandArea.style ));

    this.container.insertBefore( this.canvas, this.container.firstChild );
    this.container.insertBefore( this.keyboardCommandArea, this.container.firstChild );
    this.element.appendChild( this.container );

    //Used for toggling between fullscreen and default container size
    //TODO: these can be closure private and shared across Viewer
    //      instances.
    this.bodyWidth      = document.body.style.width;
    this.bodyHeight     = document.body.style.height;
    this.bodyOverflow   = document.body.style.overflow;
    this.docOverflow    = document.documentElement.style.overflow;

    this.keyboardCommandArea.innerTracker = new $.MouseTracker({
            _this : this,
            element:            this.keyboardCommandArea,
            focusHandler:       function(){
                var point    = $.getElementPosition( this.element );
                window.scrollTo( 0, point.y );
            },

            keyHandler:         function(tracker, keyCode, shiftKey){
                switch( keyCode ){
                    case 61://=|+
                        _this.viewport.zoomBy(1.1);
                        _this.viewport.applyConstraints();
                        return false;
                    case 45://-|_
                        _this.viewport.zoomBy(0.9);
                        _this.viewport.applyConstraints();
                        return false;
                    case 48://0|)
                        _this.viewport.goHome();
                        _this.viewport.applyConstraints();
                        return false;
                    case 119://w
                    case 87://W
                    case 38://up arrow
                        if (shiftKey) {
                            _this.viewport.zoomBy(1.1);
                        } else {
                            _this.viewport.panBy(new $.Point(0, -0.05));
                        }
                        _this.viewport.applyConstraints();
                        return false;
                    case 115://s
                    case 83://S
                    case 40://down arrow
                        if (shiftKey) {
                            _this.viewport.zoomBy(0.9);
                        } else {
                            _this.viewport.panBy(new $.Point(0, 0.05));
                        }
                        _this.viewport.applyConstraints();
                        return false;
                    case 97://a
                    case 37://left arrow
                        _this.viewport.panBy(new $.Point(-0.05, 0));
                        _this.viewport.applyConstraints();
                        return false;
                    case 100://d
                    case 39://right arrow
                        _this.viewport.panBy(new $.Point(0.05, 0));
                        _this.viewport.applyConstraints();
                        return false;
                    default:
                        //console.log( 'navigator keycode %s', keyCode );
                        return true;
                }
            }
        }).setTracking( true ); // default state


    this.innerTracker = new $.MouseTracker({
        element:            this.canvas,
        clickTimeThreshold: this.clickTimeThreshold,
        clickDistThreshold: this.clickDistThreshold,
        clickHandler:       $.delegate( this, onCanvasClick ),
        dragHandler:        $.delegate( this, onCanvasDrag ),
        releaseHandler:     $.delegate( this, onCanvasRelease ),
        scrollHandler:      $.delegate( this, onCanvasScroll )
    }).setTracking( this.mouseNavEnabled ? true : false ); // default state

    this.outerTracker = new $.MouseTracker({
        element:            this.container,
        clickTimeThreshold: this.clickTimeThreshold,
        clickDistThreshold: this.clickDistThreshold,
        enterHandler:       $.delegate( this, onContainerEnter ),
        exitHandler:        $.delegate( this, onContainerExit ),
        releaseHandler:     $.delegate( this, onContainerRelease )
    }).setTracking( this.mouseNavEnabled ? true : false ); // always tracking

    if( this.toolbar ){
        this.toolbar = new $.ControlDock({ element: this.toolbar });
    }

    this.bindStandardControls();
    this.bindSequenceControls();

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

$.extend( $.Viewer.prototype, $.EventHandler.prototype, $.ControlDock.prototype, {


    /**
     * @function
     * @name OpenSeadragon.Viewer.prototype.isOpen
     * @return {Boolean}
     */
    isOpen: function () {
        return !!this.source;
    },

    /**
     * A deprecated function, renamed to 'open' to match event name and
     * match current 'close' method.
     * @function
     * @name OpenSeadragon.Viewer.prototype.openDzi
     * @param {String} dzi xml string or the url to a DZI xml document.
     * @return {OpenSeadragon.Viewer} Chainable.
     *
     * @deprecated - use 'open' instead.
     */
    openDzi: function ( dzi ) {
        return this.open( dzi );
    },

    /**
     * A deprecated function, renamed to 'open' to match event name and
     * match current 'close' method.
     * @function
     * @name OpenSeadragon.Viewer.prototype.openTileSource
     * @param {String|Object|Function} See OpenSeadragon.Viewer.prototype.open
     * @return {OpenSeadragon.Viewer} Chainable.
     *
     * @deprecated - use 'open' instead.
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
     * @name OpenSeadragon.Viewer.prototype.open
     * @param {String|Object|Function}
     * @return {OpenSeadragon.Viewer} Chainable.
     */
    open: function ( tileSource ) {
        var _this = this,
            customTileSource,
            readySource,
            $TileSource,
            options;

        _this._hideMessage();

        //allow plain xml strings or json strings to be parsed here
        if( $.type( tileSource ) == 'string' ){
            if( tileSource.match(/\s*<.*/) ){
                tileSource = $.parseXml( tileSource );
            }else if( tileSource.match(/\s*[\{\[].*/) ){
                /*jshint evil:true*/
                tileSource = eval( '('+tileSource+')' );
            }
        }

        setTimeout(function(){
            if ( $.type( tileSource ) == 'string') {
                //If its still a string it means it must be a url at this point
                tileSource = new $.TileSource( tileSource, function( readySource ){
                    openTileSource( _this, readySource );
                });
                tileSource.addHandler( 'open-failed', function ( name, args ) {
                    _this.raiseEvent( 'open-failed', args );
                });

            } else if ( $.isPlainObject( tileSource ) || tileSource.nodeType ){
                if( $.isFunction( tileSource.getTileUrl ) ){
                    //Custom tile source
                    customTileSource = new $.TileSource(tileSource);
                    customTileSource.getTileUrl = tileSource.getTileUrl;
                    openTileSource( _this, customTileSource );
                } else {
                    //inline configuration
                    $TileSource = $.TileSource.determineType( _this, tileSource );
                    if ( !$TileSource ) {
                        _this.raiseEvent( 'open-failed', {
                            message: "Unable to load TileSource",
                            source: tileSource
                        });
                        return;
                    }
                    options = $TileSource.prototype.configure.apply( _this, [ tileSource ]);
                    readySource = new $TileSource( options );
                    openTileSource( _this, readySource );
                }
            } else {
                //can assume it's already a tile source implementation
                openTileSource( _this, tileSource );
            }
        }, 1);

        return this;
    },


    /**
     * @function
     * @name OpenSeadragon.Viewer.prototype.close
     * @return {OpenSeadragon.Viewer} Chainable.
     */
    close: function ( ) {
        if ( this._updateRequestId !== null ) {
            $.cancelAnimationFrame( this._updateRequestId );
            this._updateRequestId = null;
        }

        if ( this.navigator ) {
            this.navigator.close();
        }

        if ( this.drawer ) {
            this.drawer.clearOverlays();
        }

        this.source     = null;
        this.drawer     = null;

        this.viewport   = this.preserveViewport ? this.viewport : null;
        //this.profiler   = null;
        this.canvas.innerHTML = "";

        VIEWERS[ this.hash ] = null;
        delete VIEWERS[ this.hash ];

        this.raiseEvent( 'close', { viewer: this } );

        return this;
    },

    
    /**
     * Function to destroy the viewer and clean up everything created by Open Seadragon
     * @function
     * @name OpenSeadragon.Viewer.prototype.destroy
     */
    destroy: function( ) {
        this.close();

        this.removeAllHandlersForAllEvents();

        // Go through top element (passed to us) and remove all children
        // Use removeChild to make sure it handles SVG or any non-html
        // also it performs better - http://jsperf.com/innerhtml-vs-removechild/15
        while (this.element.firstChild) {
            this.element.removeChild(this.element.firstChild);
        }

        // remove the mouse trackers - should we be cleaning up their callbacks?
        delete this.keyboardCommandArea.innerTracker;
        delete this.innerTracker;
        delete this.outerTracker;

        // clear all our references to dom objects
        this.canvas = null;
        this.keyboardCommandArea = null;
        this.container = null;

        // clear our reference to the main element - they will need to pass it in again, creating a new viewer
        this.element = null;
    },


    /**
     * @function
     * @name OpenSeadragon.Viewer.prototype.isMouseNavEnabled
     * @return {Boolean}
     */
    isMouseNavEnabled: function () {
        return this.innerTracker.isTracking();
    },

    /**
     * @function
     * @name OpenSeadragon.Viewer.prototype.setMouseNavEnabled
     * @return {OpenSeadragon.Viewer} Chainable.
     */
    setMouseNavEnabled: function( enabled ){
        this.innerTracker.setTracking( enabled );
        this.raiseEvent( 'mouse-enabled', { enabled: enabled, viewer: this } );
        return this;
    },


    /**
     * @function
     * @name OpenSeadragon.Viewer.prototype.areControlsEnabled
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
     * @name OpenSeadragon.Viewer.prototype.setControlsEnabled
     * @param {Boolean} true to show, false to hide.
     * @return {OpenSeadragon.Viewer} Chainable.
     */
    setControlsEnabled: function( enabled ) {
        if( enabled ){
            abortControlsAutoHide( this );
        } else {
            beginControlsAutoHide( this );
        }
        this.raiseEvent( 'controls-enabled', { enabled: enabled, viewer: this } );
        return this;
    },


    /**
     * @function
     * @name OpenSeadragon.Viewer.prototype.isFullPage
     * @return {Boolean}
     */
    isFullPage: function () {
        return THIS[ this.hash ].fullPage;
    },


    /**
     * Toggle full page mode.
     * @function
     * @name OpenSeadragon.Viewer.prototype.setFullPage
     * @param {Boolean} fullPage
     *      If true, enter full page mode.  If false, exit full page mode.
     * @return {OpenSeadragon.Viewer} Chainable.
     */
    setFullPage: function( fullPage ) {

        var body            = document.body,
            bodyStyle       = body.style,
            docStyle        = document.documentElement.style,
            canvasStyle     = this.canvas.style,
            _this           = this,
            oldBounds,
            newBounds,
            viewer,
            hash,
            nodes,
            i;

        //dont bother modifying the DOM if we are already in full page mode.
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

            //when entering full screen on the ipad it wasnt sufficient to leave
            //the body intact as only only the top half of the screen would
            //respond to touch events on the canvas, while the bottom half treated
            //them as touch events on the document body.  Thus we remove and store
            //the bodies elements and replace them when we leave full screen.
            this.previousBody = [];
            THIS[ this.hash ].prevElementParent = this.element.parentNode;
            THIS[ this.hash ].prevNextSibling = this.element.nextSibling;
            THIS[ this.hash ].prevElementSize = $.getElementSize( this.element );
            nodes = body.childNodes.length;
            for ( i = 0; i < nodes; i ++ ){
                this.previousBody.push( body.childNodes[ 0 ] );
                body.removeChild( body.childNodes[ 0 ] );
            }

            //If we've got a toolbar, we need to enable the user to use css to
            //preserve it in fullpage mode
            if( this.toolbar && this.toolbar.element ){
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

            if( $.supportsFullScreen ){
                THIS[ this.hash ].onfullscreenchange = function() {
                    /*
                        fullscreenchange events don't include the new fullscreen status so we need to
                        retrieve the current status from the fullscreen API. See:
                        https://developer.mozilla.org/en-US/docs/Web/Reference/Events/fullscreenchange
                    */

                    if( $.isFullScreen() ){
                        _this.setFullPage( true );
                    } else {
                        _this.setFullPage( false );
                    }
                };

                $.requestFullScreen( document.body );

                // The target of the event is always the document,
                // but it is possible to retrieve the fullscreen element through the API
                // Note that the API is still vendor-prefixed in browsers implementing it
                document.addEventListener(
                    $.fullScreenEventName,
                    THIS[ this.hash ].onfullscreenchange
                );
                this.element.style.height = '100%';
                this.element.style.width = '100%';
            }else{
                this.element.style.height = $.getWindowSize().y + 'px';
                this.element.style.width = $.getWindowSize().x + 'px';
            }

            if( this.toolbar && this.toolbar.element ){
                this.element.style.height = (
                    $.getElementSize( this.element ).y - $.getElementSize( this.toolbar.element ).y
                ) + 'px';
            }

            THIS[ this.hash ].fullPage = true;

            // mouse will be inside container now
            $.delegate( this, onContainerEnter )();


        } else {

            if( $.supportsFullScreen ){
                document.removeEventListener(
                    $.fullScreenEventName,
                    THIS[ this.hash ].onfullscreenchange
                );
                $.cancelFullScreen( document );
            }

            bodyStyle.overflow  = this.bodyOverflow;
            docStyle.overflow   = this.docOverflow;

            bodyStyle.width     = this.bodyWidth;
            bodyStyle.height    = this.bodyHeight;

            canvasStyle.backgroundColor = "";
            canvasStyle.color           = "";

            body.removeChild( this.element );
            nodes = this.previousBody.length;
            for ( i = 0; i < nodes; i++ ){
                body.appendChild( this.previousBody.shift() );
            }

            $.removeClass( this.element, 'fullpage' );
            THIS[ this.hash ].prevElementParent.insertBefore(
                this.element,
                THIS[ this.hash ].prevNextSibling
            );

            //If we've got a toolbar, we need to enable the user to use css to
            //reset it to its original state
            if( this.toolbar && this.toolbar.element ){
                body.removeChild( this.toolbar.element );

                //Make sure the user has some ability to style the toolbar based
                //on the mode
                $.removeClass( this.toolbar.element, 'fullpage' );
                //this.toolbar.element.style.position = 'relative';
                this.toolbar.parentNode.insertBefore(
                    this.toolbar.element,
                    this.toolbar.nextSibling
                );
                delete this.toolbar.parentNode;
                delete this.toolbar.nextSibling;

                //this.container.style.top = 'auto';
            }

            this.element.style.height = THIS[ this.hash ].prevElementSize.y + 'px';
            this.element.style.width = THIS[ this.hash ].prevElementSize.x + 'px';

            THIS[ this.hash ].fullPage = false;

            // mouse will likely be outside now
            $.delegate( this, onContainerExit )();


        }
        this.raiseEvent( 'fullpage', { fullpage: fullPage, viewer: this } );

        if ( this.viewport ) {
            oldBounds = this.viewport.getBounds();
            this.viewport.resize( THIS[ this.hash ].prevContainerSize );
            newBounds = this.viewport.getBounds();

            if ( fullPage ) {
                THIS[ this.hash ].fsBoundsDelta = new $.Point(
                    newBounds.width  / oldBounds.width,
                    newBounds.height / oldBounds.height
                );
            } else {
                this.viewport.update();
                this.viewport.zoomBy(
                    Math.max(
                        THIS[ this.hash ].fsBoundsDelta.x,
                        THIS[ this.hash ].fsBoundsDelta.y
                    ),
                    null,
                    true
                );
                //Ensures that if multiple viewers are on a page, the viewers that
                //were hidden during fullpage are 'reopened'
                for( hash in VIEWERS ){
                    viewer = VIEWERS[ hash ];
                    if( viewer !== this && viewer != this.navigator ){
                        viewer.open( viewer.source );
                        if( viewer.navigator ){
                            viewer.navigator.open( viewer.source );
                        }
                    }
                }
            }

            THIS[ this.hash ].forceRedraw = true;
            updateOnce( this );

        }
        return this;
    },


    /**
     * @function
     * @name OpenSeadragon.Viewer.prototype.isVisible
     * @return {Boolean}
     */
    isVisible: function () {
        return this.container.style.visibility != "hidden";
    },


    /**
     * @function
     * @name OpenSeadragon.Viewer.prototype.setVisible
     * @return {OpenSeadragon.Viewer} Chainable.
     */
    setVisible: function( visible ){
        this.container.style.visibility = visible ? "" : "hidden";
        this.raiseEvent( 'visible', { visible: visible, viewer: this } );
        return this;
    },


    /**
     * @function
     * @name OpenSeadragon.Viewer.prototype.bindSequenceControls
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
                        {anchor: $.ControlAnchor.TOP_LEFT}
                    );
                }
            }
        }
        return this;
    },


    /**
     * @function
     * @name OpenSeadragon.Viewer.prototype.bindStandardControls
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
            onFullPageHandler       = $.delegate( this, onFullPage ),
            onFocusHandler          = $.delegate( this, onFocus ),
            onBlurHandler           = $.delegate( this, onBlur ),
            navImages               = this.navImages,
            buttons                 = [],
            useGroup                = true ;


        if( this.showNavigationControl ){

            if( this.zoomInButton || this.zoomOutButton || this.homeButton || this.fullPageButton ){
                //if we are binding to custom buttons then layout and
                //grouping is the responsibility of the page author
                useGroup = false;
            }

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

            buttons.push( this.fullPageButton = new $.Button({
                element:    this.fullPageButton ? $.getElement( this.fullPageButton ) : null,
                clickTimeThreshold: this.clickTimeThreshold,
                clickDistThreshold: this.clickDistThreshold,
                tooltip:    $.getString( "Tooltips.FullPage" ),
                srcRest:    resolveUrl( this.prefixUrl, navImages.fullpage.REST ),
                srcGroup:   resolveUrl( this.prefixUrl, navImages.fullpage.GROUP ),
                srcHover:   resolveUrl( this.prefixUrl, navImages.fullpage.HOVER ),
                srcDown:    resolveUrl( this.prefixUrl, navImages.fullpage.DOWN ),
                onRelease:  onFullPageHandler,
                onFocus:    onFocusHandler,
                onBlur:     onBlurHandler
            }));

            if( useGroup ){
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
                }else{
                    this.addControl(
                        this.navControl,
                        {anchor: $.ControlAnchor.TOP_LEFT}
                    );
                }
            }

        }
        return this;
    },


    /**
     * @function
     * @name OpenSeadragon.Viewer.prototype.goToPage
     * @return {OpenSeadragon.Viewer} Chainable.
     */
    goToPage: function( page ){
        //page is a 1 based index so normalize now
        //page = page;
        this.raiseEvent( 'page', { page: page, viewer: this } );

        if( this.tileSources.length > page ){

            THIS[ this.hash ].sequence = page;

            if( this.nextButton ){
                if( ( this.tileSources.length - 1 ) === page  ){
                    //Disable next button
                    if(!this.navPrevNextWrap){
                        this.nextButton.disable();
                    }
                } else {
                    this.nextButton.enable();
                }
            }
            if( this.previousButton ){
                if( page > 0 ){
                    //Enable previous button
                    this.previousButton.enable();
                } else {
                    if(!this.navPrevNextWrap){
                        this.previousButton.disable();
                    }
                }
            }

            this.open( this.tileSources[ page ] );
        }

        if( $.isFunction( this.onPageChange ) ){
            this.onPageChange({
                page: page,
                viewer: this
            });
        }
        if( this.referenceStrip ){
            this.referenceStrip.setFocus( page );
        }
        return this;
    },

    /**
     * Display a message in the viewport
     * @function
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
     * @function
     * @private
     */
    _hideMessage: function () {
        var div = this.messageDiv;
        if (div) {
            div.parentNode.removeChild(div);
            delete this.messageDiv;
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
function openTileSource( viewer, source ) {
    var _this = viewer,
        overlay,
        i;

    if ( _this.source ) {
        _this.close( );
    }

    _this.canvas.innerHTML = "";
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
            viewer:                 _this //,
            //TODO: figure out how to support these in a way that makes sense
            //minZoomLevel:           this.minZoomLevel,
            //maxZoomLevel:           this.maxZoomLevel
        });
    }else{
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
            viewer:             _this
        });
    }

    if( _this.preserveViewport ){
        _this.viewport.resetContentSize( _this.source.dimensions );
    }

    _this.source.overlays = _this.source.overlays || [];

    _this.drawer = new $.Drawer({
        viewer:             _this,
        source:             _this.source,
        viewport:           _this.viewport,
        element:            _this.canvas,
        overlays:           [].concat( _this.overlays ).concat( _this.source.overlays ),
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
        debugGridColor:     _this.debugGridColor
    });

    //Instantiate a navigator if configured
    if ( _this.showNavigator  && !_this.collectionMode ){
        // Note: By passing the fully parsed source, the navigator doesn't
        // have to load it again.
        if ( _this.navigator ) {
            _this.navigator.open( source );
        } else {
            _this.navigator = new $.Navigator({
                id:          _this.navigatorId,
                position:    _this.navigatorPosition,
                sizeRatio:   _this.navigatorSizeRatio,
                height:      _this.navigatorHeight,
                width:       _this.navigatorWidth,
                tileSources: source,
                tileHost:    _this.tileHost,
                prefixUrl:   _this.prefixUrl,
                overlays:    _this.overlays,
                viewer:      _this
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
            overlays:    _this.overlays,
            viewer:      _this
        });
    }

    //this.profiler = new $.Profiler();

    THIS[ _this.hash ].animating = false;
    THIS[ _this.hash ].forceRedraw = true;
    _this._updateRequestId = scheduleUpdate( _this, updateMulti );

    //Assuming you had programatically created a bunch of overlays
    //and added them via configuration
    for ( i = 0; i < _this.overlayControls.length; i++ ) {

        overlay = _this.overlayControls[ i ];

        if ( overlay.point ) {

            _this.drawer.addOverlay(
                overlay.id,
                new $.Point(
                    overlay.point.X,
                    overlay.point.Y
                ),
                $.OverlayPlacement.TOP_LEFT
            );

        } else {

            _this.drawer.addOverlay(
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
    VIEWERS[ _this.hash ] = _this;

    _this.raiseEvent( 'open', { source: source, viewer: _this } );

    return _this;
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

function onCanvasClick( tracker, position, quick, shift ) {
    var zoomPerClick,
        factor;
    if ( this.viewport && quick ) {    // ignore clicks where mouse moved
        zoomPerClick = this.zoomPerClick;
        factor = shift ? 1.0 / zoomPerClick : zoomPerClick;
        this.viewport.zoomBy(
            factor,
            this.viewport.pointFromPixel( position, true )
        );
        this.viewport.applyConstraints();
    }
    this.raiseEvent( 'canvas-click', {
        tracker: tracker,
        position: position,
        quick: quick,
        shift: shift
    });
}

function onCanvasDrag( tracker, position, delta, shift ) {
    if ( this.viewport ) {
        if( !this.panHorizontal ){
            delta.x = 0;
        }
        if( !this.panVertical ){
            delta.y = 0;
        }
        this.viewport.panBy(
            this.viewport.deltaPointsFromPixels(
                delta.negate()
            )
        );
        if( this.constrainDuringPan ){
            this.viewport.applyConstraints();
        }
    }
    this.raiseEvent( 'canvas-click', {
        tracker: tracker,
        position: position,
        delta: delta,
        shift: shift
    });
}

function onCanvasRelease( tracker, position, insideElementPress, insideElementRelease ) {
    if ( insideElementPress && this.viewport ) {
        this.viewport.applyConstraints();
    }
    this.raiseEvent( 'canvas-release', {
        tracker: tracker,
        position: position,
        insideElementPress: insideElementPress,
        insideElementRelease: insideElementRelease
    });
}

function onCanvasScroll( tracker, position, scroll, shift ) {
    var factor;
    if ( this.viewport ) {
        factor = Math.pow( this.zoomPerScroll, scroll );
        this.viewport.zoomBy(
            factor,
            this.viewport.pointFromPixel( position, true )
        );
        this.viewport.applyConstraints();
    }
    this.raiseEvent( 'canvas-scroll', {
        tracker: tracker,
        position: position,
        scroll: scroll,
        shift: shift
    });
    //cancels event
    return false;
}

function onContainerExit( tracker, position, buttonDownElement, buttonDownAny ) {
    if ( !buttonDownElement ) {
        THIS[ this.hash ].mouseInside = false;
        if ( !THIS[ this.hash ].animating ) {
            beginControlsAutoHide( this );
        }
    }
    this.raiseEvent( 'container-exit', {
        tracker: tracker,
        position: position,
        buttonDownElement: buttonDownElement,
        buttonDownAny: buttonDownAny
    });
}

function onContainerRelease( tracker, position, insideElementPress, insideElementRelease ) {
    if ( !insideElementRelease ) {
        THIS[ this.hash ].mouseInside = false;
        if ( !THIS[ this.hash ].animating ) {
            beginControlsAutoHide( this );
        }
    }
    this.raiseEvent( 'container-release', {
        tracker: tracker,
        position: position,
        insideElementPress: insideElementPress,
        insideElementRelease: insideElementRelease
    });
}

function onContainerEnter( tracker, position, buttonDownElement, buttonDownAny ) {
    THIS[ this.hash ].mouseInside = true;
    abortControlsAutoHide( this );
    this.raiseEvent( 'container-enter', {
        tracker: tracker,
        position: position,
        buttonDownElement: buttonDownElement,
        buttonDownAny: buttonDownAny
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

    containerSize = _getSafeElemSize( viewer.container );
    if ( !containerSize.equals( THIS[ viewer.hash ].prevContainerSize ) ) {
        // maintain image position
        viewer.viewport.resize( containerSize, true );
        THIS[ viewer.hash ].prevContainerSize = containerSize;
    }

    animated = viewer.viewport.update();

    if( viewer.referenceStrip ){
        animated = viewer.referenceStrip.update( viewer.viewport ) || animated;
    }

    if ( !THIS[ viewer.hash ].animating && animated ) {
        viewer.raiseEvent( "animationstart" );
        abortControlsAutoHide( viewer );
    }

    if ( animated ) {
        viewer.drawer.update();
        if( viewer.navigator ){
            viewer.navigator.update( viewer.viewport );
        }
        viewer.raiseEvent( "animation" );
    } else if ( THIS[ viewer.hash ].forceRedraw || viewer.drawer.needsUpdate() ) {
        viewer.drawer.update();
        if( viewer.navigator ){
            viewer.navigator.update( viewer.viewport );
        }
        THIS[ viewer.hash ].forceRedraw = false;
    }

    if ( THIS[ viewer.hash ].animating && !animated ) {
        viewer.raiseEvent( "animationfinish" );

        if ( !THIS[ viewer.hash ].mouseInside ) {
            beginControlsAutoHide( viewer );
        }
    }

    THIS[ viewer.hash ].animating = animated;

    //viewer.profiler.endUpdate();
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


function onFullPage() {
    this.setFullPage( !this.isFullPage() );
    // correct for no mouseout event on change
    if( this.buttons ){
        this.buttons.emulateExit();
    }
    this.fullPageButton.element.focus();
    if ( this.viewport ) {
        this.viewport.applyConstraints();
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
