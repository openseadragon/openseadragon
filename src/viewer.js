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
var THIS = {};
var nextHash = 1;

/**
 *
 * The main point of entry into creating a zoomable image on the page.<br>
 * <br>
 * We have provided an idiomatic javascript constructor which takes
 * a single object, but still support the legacy positional arguments.<br>
 * <br>
 * The options below are given in order that they appeared in the constructor
 * as arguments and we translate a positional call into an idiomatic call.<br>
 * <br>
 * To create a viewer, you can use either of this methods:<br>
 * <ul>
 * <li><code>var viewer = new OpenSeadragon.Viewer(options);</code></li>
 * <li><code>var viewer = OpenSeadragon(options);</code></li>
 * </ul>
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


    //backward compatibility for positional args while preferring more
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
        hash:           options.hash || nextHash++,
        /**
         * Index for page to be shown first next time open() is called (only used in sequenceMode).
         * @member {Number} initialPage
         * @memberof OpenSeadragon.Viewer#
         */
        initialPage:    0,

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
        //source is here for backwards compatibility. It is not an official
        //part of the API and should not be relied upon.
        source:         null,
        /**
         * Handles rendering of tiles in the viewer. Created for each TileSource opened.
         * @member {OpenSeadragon.Drawer} drawer
         * @memberof OpenSeadragon.Viewer#
         */
        drawer:             null,
        /**
         * Keeps track of all of the tiled images in the scene.
         * @member {OpenSeadragon.Drawer} world
         * @memberof OpenSeadragon.Viewer#
         */
        world:              null,
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

    if ( typeof ( this.hash) === "undefined" ) {
        throw new Error("A hash must be defined, either by specifying options.id or options.hash.");
    }
    if ( typeof ( THIS[ this.hash ] ) !== "undefined" ) {
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
        "fullPage":          false,
        "onfullscreenchange": null
    };

    this._sequenceIndex = 0;
    this._firstOpen = true;
    this._updateRequestId = null;
    this._loadQueue = [];
    this.currentOverlays = [];

    this._lastScrollTime = $.now(); // variable used to help normalize the scroll event speed of different devices

    //Inherit some behaviors and properties
    $.EventSource.call( this );

    this.addHandler( 'open-failed', function ( event ) {
        var msg = $.getString( "Errors.OpenFailed", event.eventSource, event.message);
        _this._showMessage( msg );
    });

    $.ControlDock.call( this, options );

    //Deal with tile sources
    if (this.xmlPath) {
        //Deprecated option.  Now it is preferred to use the tileSources option
        this.tileSources = [ this.xmlPath ];
    }

    this.element              = this.element || document.getElementById( this.id );
    this.canvas               = $.makeNeutralElement( "div" );

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
    if (options.tabIndex !== "") {
        this.canvas.tabIndex = (options.tabIndex === undefined ? 0 : options.tabIndex);
    }

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

    //Used for toggling between fullscreen and default container size
    //TODO: these can be closure private and shared across Viewer
    //      instances.
    this.bodyWidth      = document.body.style.width;
    this.bodyHeight     = document.body.style.height;
    this.bodyOverflow   = document.body.style.overflow;
    this.docOverflow    = document.documentElement.style.overflow;

    this.innerTracker = new $.MouseTracker({
        element:                  this.canvas,
        startDisabled:            !this.mouseNavEnabled,
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
        startDisabled:         !this.mouseNavEnabled,
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

    THIS[ this.hash ].prevContainerSize = _getSafeElemSize( this.container );

    // Create the world
    this.world = new $.World({
        viewer: this
    });

    this.world.addHandler('add-item', function(event) {
        // For backwards compatibility, we maintain the source property
        _this.source = _this.world.getItemAt(0).source;

        THIS[ _this.hash ].forceRedraw = true;

        if (!_this._updateRequestId) {
            _this._updateRequestId = scheduleUpdate( _this, updateMulti );
        }
    });

    this.world.addHandler('remove-item', function(event) {
        // For backwards compatibility, we maintain the source property
        if (_this.world.getItemCount()) {
            _this.source = _this.world.getItemAt(0).source;
        } else {
            _this.source = null;
        }

        THIS[ _this.hash ].forceRedraw = true;
    });

    this.world.addHandler('metrics-change', function(event) {
        if (_this.viewport) {
            _this.viewport._setContentBounds(_this.world.getHomeBounds(), _this.world.getContentFactor());
        }
    });

    this.world.addHandler('item-index-change', function(event) {
        // For backwards compatibility, we maintain the source property
        _this.source = _this.world.getItemAt(0).source;
    });

    // Create the viewport
    this.viewport = new $.Viewport({
        containerSize:      THIS[ this.hash ].prevContainerSize,
        springStiffness:    this.springStiffness,
        animationTime:      this.animationTime,
        minZoomImageRatio:  this.minZoomImageRatio,
        maxZoomPixelRatio:  this.maxZoomPixelRatio,
        visibilityRatio:    this.visibilityRatio,
        wrapHorizontal:     this.wrapHorizontal,
        wrapVertical:       this.wrapVertical,
        defaultZoomLevel:   this.defaultZoomLevel,
        minZoomLevel:       this.minZoomLevel,
        maxZoomLevel:       this.maxZoomLevel,
        viewer:             this,
        degrees:            this.degrees,
        flipped:            this.flipped,
        navigatorRotate:    this.navigatorRotate,
        homeFillsViewer:    this.homeFillsViewer,
        margins:            this.viewportMargins
    });

    this.viewport._setContentBounds(this.world.getHomeBounds(), this.world.getContentFactor());

    // Create the image loader
    this.imageLoader = new $.ImageLoader({
        jobLimit: this.imageLoaderLimit,
        timeout: options.timeout
    });

    // Create the tile cache
    this.tileCache = new $.TileCache({
        maxImageCacheCount: this.maxImageCacheCount
    });

    // Create the drawer
    this.drawer = new $.Drawer({
        viewer:             this,
        viewport:           this.viewport,
        element:            this.canvas,
        debugGridColor:     this.debugGridColor
    });

    // Overlay container
    this.overlaysContainer    = $.makeNeutralElement( "div" );
    this.canvas.appendChild( this.overlaysContainer );

    // Now that we have a drawer, see if it supports rotate. If not we need to remove the rotate buttons
    if (!this.drawer.canRotate()) {
        // Disable/remove the rotate left/right buttons since they aren't supported
        if (this.rotateLeft) {
            i = this.buttons.buttons.indexOf(this.rotateLeft);
            this.buttons.buttons.splice(i, 1);
            this.buttons.element.removeChild(this.rotateLeft.element);
        }
        if (this.rotateRight) {
            i = this.buttons.buttons.indexOf(this.rotateRight);
            this.buttons.buttons.splice(i, 1);
            this.buttons.element.removeChild(this.rotateRight.element);
        }
    }

    //Instantiate a navigator if configured
    if ( this.showNavigator){
        this.navigator = new $.Navigator({
            id:                this.navigatorId,
            position:          this.navigatorPosition,
            sizeRatio:         this.navigatorSizeRatio,
            maintainSizeRatio: this.navigatorMaintainSizeRatio,
            top:               this.navigatorTop,
            left:              this.navigatorLeft,
            width:             this.navigatorWidth,
            height:            this.navigatorHeight,
            autoResize:        this.navigatorAutoResize,
            autoFade:          this.navigatorAutoFade,
            prefixUrl:         this.prefixUrl,
            viewer:            this,
            navigatorRotate:   this.navigatorRotate,
            background:        this.navigatorBackground,
            opacity:           this.navigatorOpacity,
            borderColor:       this.navigatorBorderColor,
            displayRegionColor: this.navigatorDisplayRegionColor,
            crossOriginPolicy: this.crossOriginPolicy
        });
    }

    // Sequence mode
    if (this.sequenceMode) {
        this.bindSequenceControls();
    }

    // Open initial tilesources
    if (this.tileSources) {
        this.open( this.tileSources );
    }

    // Add custom controls
    for ( i = 0; i < this.customControls.length; i++ ) {
        this.addControl(
            this.customControls[ i ].id,
            {anchor: this.customControls[ i ].anchor}
        );
    }

    // Initial fade out
    $.requestAnimationFrame( function(){
        beginControlsAutoHide( _this );
    } );

    // Initial canvas options
    if ( this.imageSmoothingEnabled !== undefined && !this.imageSmoothingEnabled){
        this.drawer.setImageSmoothingEnabled(this.imageSmoothingEnabled);
    }

};

$.extend( $.Viewer.prototype, $.EventSource.prototype, $.ControlDock.prototype, /** @lends OpenSeadragon.Viewer.prototype */{


    /**
     * @function
     * @return {Boolean}
     */
    isOpen: function () {
        return !!this.world.getItemCount();
    },

    // deprecated
    openDzi: function ( dzi ) {
        $.console.error( "[Viewer.openDzi] this function is deprecated; use Viewer.open() instead." );
        return this.open( dzi );
    },

    // deprecated
    openTileSource: function ( tileSource ) {
        $.console.error( "[Viewer.openTileSource] this function is deprecated; use Viewer.open() instead." );
        return this.open( tileSource );
    },

    /**
     * Open tiled images into the viewer, closing any others.
     * To get the TiledImage instance created by open, add an event listener for
     * {@link OpenSeadragon.Viewer.html#.event:open}, which when fired can be used to get access
     * to the instance, i.e., viewer.world.getItemAt(0).
     * @function
     * @param {Array|String|Object|Function} tileSources - This can be a TiledImage
     * specifier, a TileSource specifier, or an array of either. A TiledImage specifier
     * is the same as the options parameter for {@link OpenSeadragon.Viewer#addTiledImage},
     * except for the index property; images are added in sequence.
     * A TileSource specifier is anything you could pass as the tileSource property
     * of the options parameter for {@link OpenSeadragon.Viewer#addTiledImage}.
     * @param {Number} initialPage - If sequenceMode is true, display this page initially
     * for the given tileSources. If specified, will overwrite the Viewer's existing initialPage property.
     * @return {OpenSeadragon.Viewer} Chainable.
     * @fires OpenSeadragon.Viewer.event:open
     * @fires OpenSeadragon.Viewer.event:open-failed
     */
    open: function (tileSources, initialPage) {
        var _this = this;

        this.close();

        if (!tileSources) {
            return;
        }

        if (this.sequenceMode && $.isArray(tileSources)) {
            if (this.referenceStrip) {
                this.referenceStrip.destroy();
                this.referenceStrip = null;
            }

            if (typeof initialPage != 'undefined' && !isNaN(initialPage)) {
              this.initialPage = initialPage;
            }

            this.tileSources = tileSources;
            this._sequenceIndex = Math.max(0, Math.min(this.tileSources.length - 1, this.initialPage));
            if (this.tileSources.length) {
                this.open(this.tileSources[this._sequenceIndex]);

                if ( this.showReferenceStrip ){
                    this.addReferenceStrip();
                }
            }

            this._updateSequenceButtons( this._sequenceIndex );
            return;
        }

        if (!$.isArray(tileSources)) {
            tileSources = [tileSources];
        }

        if (!tileSources.length) {
            return;
        }

        this._opening = true;

        var expected = tileSources.length;
        var successes = 0;
        var failures = 0;
        var failEvent;

        var checkCompletion = function() {
            if (successes + failures === expected) {
                if (successes) {
                    if (_this._firstOpen || !_this.preserveViewport) {
                        _this.viewport.goHome( true );
                        _this.viewport.update();
                    }

                    _this._firstOpen = false;

                    var source = tileSources[0];
                    if (source.tileSource) {
                        source = source.tileSource;
                    }

                    // Global overlays
                    if( _this.overlays && !_this.preserveOverlays ){
                        for ( var i = 0; i < _this.overlays.length; i++ ) {
                            _this.currentOverlays[ i ] = getOverlayObject( _this, _this.overlays[ i ] );
                        }
                    }

                    _this._drawOverlays();
                    _this._opening = false;

                    /**
                     * Raised when the viewer has opened and loaded one or more TileSources.
                     *
                     * @event open
                     * @memberof OpenSeadragon.Viewer
                     * @type {object}
                     * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
                     * @property {OpenSeadragon.TileSource} source - The tile source that was opened.
                     * @property {?Object} userData - Arbitrary subscriber-defined object.
                     */
                    // TODO: what if there are multiple sources?
                    _this.raiseEvent( 'open', { source: source } );
                } else {
                    _this._opening = false;

                    /**
                     * Raised when an error occurs loading a TileSource.
                     *
                     * @event open-failed
                     * @memberof OpenSeadragon.Viewer
                     * @type {object}
                     * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
                     * @property {String} message - Information about what failed.
                     * @property {String} source - The tile source that failed.
                     * @property {?Object} userData - Arbitrary subscriber-defined object.
                     */
                    _this.raiseEvent( 'open-failed', failEvent );
                }
            }
        };

        var doOne = function(options) {
            if (!$.isPlainObject(options) || !options.tileSource) {
                options = {
                    tileSource: options
                };
            }

            if (options.index !== undefined) {
                $.console.error('[Viewer.open] setting indexes here is not supported; use addTiledImage instead');
                delete options.index;
            }

            if (options.collectionImmediately === undefined) {
                options.collectionImmediately = true;
            }

            var originalSuccess = options.success;
            options.success = function(event) {
                successes++;

                // TODO: now that options has other things besides tileSource, the overlays
                // should probably be at the options level, not the tileSource level.
                if (options.tileSource.overlays) {
                    for (var i = 0; i < options.tileSource.overlays.length; i++) {
                        _this.addOverlay(options.tileSource.overlays[i]);
                    }
                }

                if (originalSuccess) {
                    originalSuccess(event);
                }

                checkCompletion();
            };

            var originalError = options.error;
            options.error = function(event) {
                failures++;

                if (!failEvent) {
                    failEvent = event;
                }

                if (originalError) {
                    originalError(event);
                }

                checkCompletion();
            };

            _this.addTiledImage(options);
        };

        // TileSources
        for (var i = 0; i < tileSources.length; i++) {
            doOne(tileSources[i]);
        }

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

        this._opening = false;

        if ( this.navigator ) {
            this.navigator.close();
        }

        if (!this.preserveOverlays) {
            this.clearOverlays();
            this.overlaysContainer.innerHTML = "";
        }

        THIS[ this.hash ].animating = false;
        this.world.removeAll();
        this.imageLoader.clear();

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
        if ( !THIS[ this.hash ] ) {
            //this viewer has already been destroyed: returning immediately
            return;
        }

        this.close();

        this.clearOverlays();
        this.overlaysContainer.innerHTML = "";

        //TODO: implement this...
        //this.unbindSequenceControls()
        //this.unbindStandardControls()

        if (this.referenceStrip) {
            this.referenceStrip.destroy();
            this.referenceStrip = null;
        }

        if ( this._updateRequestId !== null ) {
            $.cancelAnimationFrame( this._updateRequestId );
            this._updateRequestId = null;
        }

        if ( this.drawer ) {
            this.drawer.destroy();
        }

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
        this.outerTracker.setTracking( enabled );
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
     * Turns debugging mode on or off for this viewer.
     *
     * @function
     * @param {Boolean} true to turn debug on, false to turn debug off.
     */
    setDebugMode: function(debugMode){

        for (var i = 0; i < this.world.getItemCount(); i++) {
            this.world.getItemAt(i).debugMode = debugMode;
        }

        this.debugMode = debugMode;
        this.forceRedraw();
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
            nodes,
            i;

        //don't bother modifying the DOM if we are already in full page mode.
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
            this.docWidth = docStyle.width;
            bodyStyle.width = "100%";
            docStyle.width = "100%";

            this.bodyHeight = bodyStyle.height;
            this.docHeight = docStyle.height;
            bodyStyle.height = "100%";
            docStyle.height = "100%";

            //when entering full screen on the ipad it wasn't sufficient to leave
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
            docStyle.width = this.docWidth;

            bodyStyle.height = this.bodyHeight;
            docStyle.height = this.docHeight;

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
                if (restoreScrollCounter < 10 &&
                    (pageScroll.x !== _this.pageScroll.x ||
                    pageScroll.y !== _this.pageScroll.y)) {
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
         * Note: the pre-full-screen event is not raised when the user is exiting
         * full-screen mode by pressing the Esc key. In that case, consider using
         * the full-screen, pre-full-page or full-page events.
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
                    //09/08/2018 - Fabroh : Fix issue #1504 : Ensure to get the navigator updated on fullscreen out with custom location with a timeout
                    setTimeout(function(){
                        _this.navigator.update( _this.viewport );
                    });
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
     * Add a tiled image to the viewer.
     * options.tileSource can be anything that {@link OpenSeadragon.Viewer#open}
     *  supports except arrays of images.
     * Note that you can specify options.width or options.height, but not both.
     * The other dimension will be calculated according to the item's aspect ratio.
     * If collectionMode is on (see {@link OpenSeadragon.Options}), the new image is
     * automatically arranged with the others.
     * @function
     * @param {Object} options
     * @param {String|Object|Function} options.tileSource - The TileSource specifier.
     * A String implies a url used to determine the tileSource implementation
     *      based on the file extension of url. JSONP is implied by *.js,
     *      otherwise the url is retrieved as text and the resulting text is
     *      introspected to determine if its json, xml, or text and parsed.
     * An Object implies an inline configuration which has a single
     *      property sufficient for being able to determine tileSource
     *      implementation. If the object has a property which is a function
     *      named 'getTileUrl', it is treated as a custom TileSource.
     * @param {Number} [options.index] The index of the item. Added on top of
     * all other items if not specified.
     * @param {Boolean} [options.replace=false] If true, the item at options.index will be
     * removed and the new item is added in its place. options.tileSource will be
     * interpreted and fetched if necessary before the old item is removed to avoid leaving
     * a gap in the world.
     * @param {Number} [options.x=0] The X position for the image in viewport coordinates.
     * @param {Number} [options.y=0] The Y position for the image in viewport coordinates.
     * @param {Number} [options.width=1] The width for the image in viewport coordinates.
     * @param {Number} [options.height] The height for the image in viewport coordinates.
     * @param {OpenSeadragon.Rect} [options.fitBounds] The bounds in viewport coordinates
     * to fit the image into. If specified, x, y, width and height get ignored.
     * @param {OpenSeadragon.Placement} [options.fitBoundsPlacement=OpenSeadragon.Placement.CENTER]
     * How to anchor the image in the bounds if options.fitBounds is set.
     * @param {OpenSeadragon.Rect} [options.clip] - An area, in image pixels, to clip to
     * (portions of the image outside of this area will not be visible). Only works on
     * browsers that support the HTML5 canvas.
     * @param {Number} [options.opacity=1] Proportional opacity of the tiled images (1=opaque, 0=hidden)
     * @param {Boolean} [options.preload=false]  Default switch for loading hidden images (true loads, false blocks)
     * @param {Number} [options.degrees=0] Initial rotation of the tiled image around
     * its top left corner in degrees.
     * @param {String} [options.compositeOperation] How the image is composited onto other images.
     * @param {String} [options.crossOriginPolicy] The crossOriginPolicy for this specific image,
     * overriding viewer.crossOriginPolicy.
     * @param {Boolean} [options.ajaxWithCredentials] Whether to set withCredentials on tile AJAX
     * @param {Boolean} [options.loadTilesWithAjax]
     *      Whether to load tile data using AJAX requests.
     *      Defaults to the setting in {@link OpenSeadragon.Options}.
     * @param {Object} [options.ajaxHeaders]
     *      A set of headers to include when making tile AJAX requests.
     *      Note that these headers will be merged over any headers specified in {@link OpenSeadragon.Options}.
     *      Specifying a falsy value for a header will clear its existing value set at the Viewer level (if any).
     * requests.
     * @param {Function} [options.success] A function that gets called when the image is
     * successfully added. It's passed the event object which contains a single property:
     * "item", which is the resulting instance of TiledImage.
     * @param {Function} [options.error] A function that gets called if the image is
     * unable to be added. It's passed the error event object, which contains "message"
     * and "source" properties.
     * @param {Boolean} [options.collectionImmediately=false] If collectionMode is on,
     * specifies whether to snap to the new arrangement immediately or to animate to it.
     * @param {String|CanvasGradient|CanvasPattern|Function} [options.placeholderFillStyle] - See {@link OpenSeadragon.Options}.
     * @fires OpenSeadragon.World.event:add-item
     * @fires OpenSeadragon.Viewer.event:add-item-failed
     */
    addTiledImage: function( options ) {
        $.console.assert(options, "[Viewer.addTiledImage] options is required");
        $.console.assert(options.tileSource, "[Viewer.addTiledImage] options.tileSource is required");
        $.console.assert(!options.replace || (options.index > -1 && options.index < this.world.getItemCount()),
            "[Viewer.addTiledImage] if options.replace is used, options.index must be a valid index in Viewer.world");

        var _this = this;

        if (options.replace) {
            options.replaceItem = _this.world.getItemAt(options.index);
        }

        this._hideMessage();

        if (options.placeholderFillStyle === undefined) {
            options.placeholderFillStyle = this.placeholderFillStyle;
        }
        if (options.opacity === undefined) {
            options.opacity = this.opacity;
        }
        if (options.preload === undefined) {
            options.preload = this.preload;
        }
        if (options.compositeOperation === undefined) {
            options.compositeOperation = this.compositeOperation;
        }
        if (options.crossOriginPolicy === undefined) {
            options.crossOriginPolicy = options.tileSource.crossOriginPolicy !== undefined ? options.tileSource.crossOriginPolicy : this.crossOriginPolicy;
        }
        if (options.ajaxWithCredentials === undefined) {
            options.ajaxWithCredentials = this.ajaxWithCredentials;
        }
        if (options.loadTilesWithAjax === undefined) {
            options.loadTilesWithAjax = this.loadTilesWithAjax;
        }
        if (options.ajaxHeaders === undefined || options.ajaxHeaders === null) {
            options.ajaxHeaders = this.ajaxHeaders;
        } else if ($.isPlainObject(options.ajaxHeaders) && $.isPlainObject(this.ajaxHeaders)) {
            options.ajaxHeaders = $.extend({}, this.ajaxHeaders, options.ajaxHeaders);
        }

        var myQueueItem = {
            options: options
        };

        function raiseAddItemFailed( event ) {
            for (var i = 0; i < _this._loadQueue.length; i++) {
                if (_this._loadQueue[i] === myQueueItem) {
                    _this._loadQueue.splice(i, 1);
                    break;
                }
            }

            if (_this._loadQueue.length === 0) {
                refreshWorld(myQueueItem);
            }

             /**
             * Raised when an error occurs while adding a item.
             * @event add-item-failed
             * @memberOf OpenSeadragon.Viewer
             * @type {object}
             * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
             * @property {String} message
             * @property {String} source
             * @property {Object} options The options passed to the addTiledImage method.
             * @property {?Object} userData - Arbitrary subscriber-defined object.
             */
            _this.raiseEvent( 'add-item-failed', event );

            if (options.error) {
                options.error(event);
            }
        }

        function refreshWorld(theItem) {
            if (_this.collectionMode) {
                _this.world.arrange({
                    immediately: theItem.options.collectionImmediately,
                    rows: _this.collectionRows,
                    columns: _this.collectionColumns,
                    layout: _this.collectionLayout,
                    tileSize: _this.collectionTileSize,
                    tileMargin: _this.collectionTileMargin
                });
                _this.world.setAutoRefigureSizes(true);
            }
        }

        if ($.isArray(options.tileSource)) {
            setTimeout(function() {
                raiseAddItemFailed({
                    message: "[Viewer.addTiledImage] Sequences can not be added; add them one at a time instead.",
                    source: options.tileSource,
                    options: options
                });
            });
            return;
        }

        this._loadQueue.push(myQueueItem);

        function processReadyItems() {
            var queueItem, tiledImage, optionsClone;
            while (_this._loadQueue.length) {
                queueItem = _this._loadQueue[0];
                if (!queueItem.tileSource) {
                    break;
                }

                _this._loadQueue.splice(0, 1);

                if (queueItem.options.replace) {
                    var newIndex = _this.world.getIndexOfItem(queueItem.options.replaceItem);
                    if (newIndex != -1) {
                        queueItem.options.index = newIndex;
                    }
                    _this.world.removeItem(queueItem.options.replaceItem);
                }

                tiledImage = new $.TiledImage({
                    viewer: _this,
                    source: queueItem.tileSource,
                    viewport: _this.viewport,
                    drawer: _this.drawer,
                    tileCache: _this.tileCache,
                    imageLoader: _this.imageLoader,
                    x: queueItem.options.x,
                    y: queueItem.options.y,
                    width: queueItem.options.width,
                    height: queueItem.options.height,
                    fitBounds: queueItem.options.fitBounds,
                    fitBoundsPlacement: queueItem.options.fitBoundsPlacement,
                    clip: queueItem.options.clip,
                    placeholderFillStyle: queueItem.options.placeholderFillStyle,
                    opacity: queueItem.options.opacity,
                    preload: queueItem.options.preload,
                    degrees: queueItem.options.degrees,
                    flipped: queueItem.options.flipped,
                    compositeOperation: queueItem.options.compositeOperation,
                    springStiffness: _this.springStiffness,
                    animationTime: _this.animationTime,
                    minZoomImageRatio: _this.minZoomImageRatio,
                    wrapHorizontal: _this.wrapHorizontal,
                    wrapVertical: _this.wrapVertical,
                    immediateRender: _this.immediateRender,
                    blendTime: _this.blendTime,
                    alwaysBlend: _this.alwaysBlend,
                    minPixelRatio: _this.minPixelRatio,
                    smoothTileEdgesMinZoom: _this.smoothTileEdgesMinZoom,
                    iOSDevice: _this.iOSDevice,
                    crossOriginPolicy: queueItem.options.crossOriginPolicy,
                    ajaxWithCredentials: queueItem.options.ajaxWithCredentials,
                    loadTilesWithAjax: queueItem.options.loadTilesWithAjax,
                    ajaxHeaders: queueItem.options.ajaxHeaders,
                    debugMode: _this.debugMode
                });

                if (_this.collectionMode) {
                    _this.world.setAutoRefigureSizes(false);
                }
                _this.world.addItem( tiledImage, {
                    index: queueItem.options.index
                });

                if (_this._loadQueue.length === 0) {
                    //this restores the autoRefigureSizes flag to true.
                    refreshWorld(queueItem);
                }

                if (_this.world.getItemCount() === 1 && !_this.preserveViewport) {
                    _this.viewport.goHome(true);
                }

                if (_this.navigator) {
                    optionsClone = $.extend({}, queueItem.options, {
                        replace: false, // navigator already removed the layer, nothing to replace
                        originalTiledImage: tiledImage,
                        tileSource: queueItem.tileSource
                    });

                    _this.navigator.addTiledImage(optionsClone);
                }

                if (queueItem.options.success) {
                    queueItem.options.success({
                        item: tiledImage
                    });
                }
            }
        }

        getTileSourceImplementation( this, options.tileSource, options, function( tileSource ) {

            myQueueItem.tileSource = tileSource;

            // add everybody at the front of the queue that's ready to go
            processReadyItems();
        }, function( event ) {
            event.options = options;
            raiseAddItemFailed(event);

            // add everybody at the front of the queue that's ready to go
            processReadyItems();
        } );
    },

    /**
     * Add a simple image to the viewer.
     * The options are the same as the ones in {@link OpenSeadragon.Viewer#addTiledImage}
     * except for options.tileSource which is replaced by options.url.
     * @function
     * @param {Object} options - See {@link OpenSeadragon.Viewer#addTiledImage}
     * for all the options
     * @param {String} options.url - The URL of the image to add.
     * @fires OpenSeadragon.World.event:add-item
     * @fires OpenSeadragon.Viewer.event:add-item-failed
     */
    addSimpleImage: function(options) {
        $.console.assert(options, "[Viewer.addSimpleImage] options is required");
        $.console.assert(options.url, "[Viewer.addSimpleImage] options.url is required");

        var opts = $.extend({}, options, {
            tileSource: {
                type: 'image',
                url:  options.url
            }
        });
        delete opts.url;
        this.addTiledImage(opts);
    },

    // deprecated
    addLayer: function( options ) {
        var _this = this;

        $.console.error( "[Viewer.addLayer] this function is deprecated; use Viewer.addTiledImage() instead." );

        var optionsClone = $.extend({}, options, {
            success: function(event) {
                _this.raiseEvent("add-layer", {
                    options: options,
                    drawer: event.item
                });
            },
            error: function(event) {
                _this.raiseEvent("add-layer-failed", event);
            }
        });

        this.addTiledImage(optionsClone);
        return this;
    },

    // deprecated
    getLayerAtLevel: function( level ) {
        $.console.error( "[Viewer.getLayerAtLevel] this function is deprecated; use World.getItemAt() instead." );
        return this.world.getItemAt(level);
    },

    // deprecated
    getLevelOfLayer: function( drawer ) {
        $.console.error( "[Viewer.getLevelOfLayer] this function is deprecated; use World.getIndexOfItem() instead." );
        return this.world.getIndexOfItem(drawer);
    },

    // deprecated
    getLayersCount: function() {
        $.console.error( "[Viewer.getLayersCount] this function is deprecated; use World.getItemCount() instead." );
        return this.world.getItemCount();
    },

    // deprecated
    setLayerLevel: function( drawer, level ) {
        $.console.error( "[Viewer.setLayerLevel] this function is deprecated; use World.setItemIndex() instead." );
        return this.world.setItemIndex(drawer, level);
    },

    // deprecated
    removeLayer: function( drawer ) {
        $.console.error( "[Viewer.removeLayer] this function is deprecated; use World.removeItem() instead." );
        return this.world.removeItem(drawer);
    },

    /**
     * Force the viewer to redraw its contents.
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
            useGroup                = true;

        if( this.showSequenceControl ){

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

            if (!this.tileSources || !this.tileSources.length) {
                this.nextButton.disable();
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
            onFlipHandler           = $.delegate( this, onFlip),
            onFocusHandler          = $.delegate( this, onFocus ),
            onBlurHandler           = $.delegate( this, onBlur ),
            navImages               = this.navImages,
            buttons                 = [],
            useGroup                = true;


        if ( this.showNavigationControl ) {

            if( this.zoomInButton || this.zoomOutButton ||
                this.homeButton || this.fullPageButton ||
                this.rotateLeftButton || this.rotateRightButton ||
                this.flipButton ) {
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

            if ( this.showFlipControl ) {
                buttons.push( this.flipButton = new $.Button({
                    element:    this.flipButton ? $.getElement( this.flipButton ) : null,
                    clickTimeThreshold: this.clickTimeThreshold,
                    clickDistThreshold: this.clickDistThreshold,
                    tooltip:    $.getString( "Tooltips.Flip" ),
                    srcRest:    resolveUrl( this.prefixUrl, navImages.flip.REST ),
                    srcGroup:   resolveUrl( this.prefixUrl, navImages.flip.GROUP ),
                    srcHover:   resolveUrl( this.prefixUrl, navImages.flip.HOVER ),
                    srcDown:    resolveUrl( this.prefixUrl, navImages.flip.DOWN ),
                    onRelease:  onFlipHandler,
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
                        {anchor: this.navigationControlAnchor || $.ControlAnchor.TOP_LEFT}
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
        return this._sequenceIndex;
    },

    /**
     * @function
     * @return {OpenSeadragon.Viewer} Chainable.
     * @fires OpenSeadragon.Viewer.event:page
     */
    goToPage: function( page ){
        if( this.tileSources && page >= 0 && page < this.tileSources.length ){
            this._sequenceIndex = page;

            this._updateSequenceButtons( page );

            this.open( this.tileSources[ page ] );

            if( this.referenceStrip ){
                this.referenceStrip.setFocus( page );
            }

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
     *      the element which will be overlaid. Or an Object specifying the configuration for the overlay.
     *      If using an object, see {@link OpenSeadragon.Overlay} for a list of
     *      all available options.
     * @param {OpenSeadragon.Point|OpenSeadragon.Rect} location - The point or
     *      rectangle which will be overlaid. This is a viewport relative location.
     * @param {OpenSeadragon.Placement} placement - The position of the
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

        var overlay = getOverlayObject( this, options);
        this.currentOverlays.push(overlay);
        overlay.drawHTML( this.overlaysContainer, this.viewport );

        /**
         * Raised when an overlay is added to the viewer (see {@link OpenSeadragon.Viewer#addOverlay}).
         *
         * @event add-overlay
         * @memberof OpenSeadragon.Viewer
         * @type {object}
         * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
         * @property {Element} element - The overlay element.
         * @property {OpenSeadragon.Point|OpenSeadragon.Rect} location
         * @property {OpenSeadragon.Placement} placement
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
     * @param {Element|String} element - A reference to an element or an id for
     *      the element which is overlaid.
     * @param {OpenSeadragon.Point|OpenSeadragon.Rect} location - The point or
     *      rectangle which will be overlaid. This is a viewport relative location.
     * @param {OpenSeadragon.Placement} placement - The position of the
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
             * @property {OpenSeadragon.Placement} placement
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
     * Finds an overlay identified by the reference element or element id
     * and returns it as an object, return null if not found.
     * @method
     * @param {Element|String} element - A reference to the element or an
     *      element id which represents the overlay content.
     * @return {OpenSeadragon.Overlay} the matching overlay or null if none found.
     */
    getOverlayById: function( element ) {
        var i;

        element = $.getElement( element );
        i = getOverlayIndex( this.currentOverlays, element );

        if (i >= 0) {
            return this.currentOverlays[i];
        } else {
            return null;
        }
    },

    /**
     * Updates the sequence buttons.
     * @function OpenSeadragon.Viewer.prototype._updateSequenceButtons
     * @private
     * @param {Number} Sequence Value
     */
    _updateSequenceButtons: function( page ) {

            if ( this.nextButton ) {
                if(!this.tileSources || this.tileSources.length - 1 === page) {
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
    },

    // private
    _drawOverlays: function() {
        var i,
            length = this.currentOverlays.length;
        for ( i = 0; i < length; i++ ) {
            this.currentOverlays[ i ].drawHTML( this.overlaysContainer, this.viewport );
        }
    },

    /**
     * Cancel the "in flight" images.
     */
    _cancelPendingImages: function() {
        this._loadQueue = [];
    },

    /**
     * Removes the reference strip and disables displaying it.
     * @function
     */
    removeReferenceStrip: function() {
        this.showReferenceStrip = false;

        if (this.referenceStrip) {
            this.referenceStrip.destroy();
            this.referenceStrip = null;
        }
    },

    /**
     * Enables and displays the reference strip based on the currently set tileSources.
     * Works only when the Viewer has sequenceMode set to true.
     * @function
     */
    addReferenceStrip: function() {
        this.showReferenceStrip = true;

        if (this.sequenceMode) {
            if (this.referenceStrip) {
                return;
            }

            if (this.tileSources.length && this.tileSources.length > 1) {
                this.referenceStrip = new $.ReferenceStrip({
                    id:          this.referenceStripElement,
                    position:    this.referenceStripPosition,
                    sizeRatio:   this.referenceStripSizeRatio,
                    scroll:      this.referenceStripScroll,
                    height:      this.referenceStripHeight,
                    width:       this.referenceStripWidth,
                    tileSources: this.tileSources,
                    prefixUrl:   this.prefixUrl,
                    viewer:      this
                });

                this.referenceStrip.setFocus( this._sequenceIndex );
            }
        } else {
            $.console.warn('Attempting to display a reference strip while "sequenceMode" is off.');
        }
    }
});


/**
 * _getSafeElemSize is like getElementSize(), but refuses to return 0 for x or y,
 * which was causing some calling operations to return NaN.
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
function getTileSourceImplementation( viewer, tileSource, imgOptions, successCallback,
    failCallback ) {
    var _this = viewer;

    //allow plain xml strings or json strings to be parsed here
    if ( $.type( tileSource ) == 'string' ) {
        //xml should start with "<" and end with ">"
        if ( tileSource.match( /^\s*<.*>\s*$/ ) ) {
            tileSource = $.parseXml( tileSource );
        //json should start with "{" or "[" and end with "}" or "]"
        } else if ( tileSource.match(/^\s*[\{\[].*[\}\]]\s*$/ ) ) {
            try {
              var tileSourceJ = $.parseJSON(tileSource);
              tileSource = tileSourceJ;
            } catch (e) {
              //tileSource = tileSource;
            }
        }
    }

    function waitUntilReady(tileSource, originalTileSource) {
        if (tileSource.ready) {
            successCallback(tileSource);
        } else {
            tileSource.addHandler('ready', function () {
                successCallback(tileSource);
            });
            tileSource.addHandler('open-failed', function (event) {
                failCallback({
                    message: event.message,
                    source: originalTileSource
                });
            });
        }
    }

    setTimeout( function() {
        if ( $.type( tileSource ) == 'string' ) {
            //If its still a string it means it must be a url at this point
            tileSource = new $.TileSource({
                url: tileSource,
                crossOriginPolicy: imgOptions.crossOriginPolicy !== undefined ?
                    imgOptions.crossOriginPolicy : viewer.crossOriginPolicy,
                ajaxWithCredentials: viewer.ajaxWithCredentials,
                ajaxHeaders: viewer.ajaxHeaders,
                useCanvas: viewer.useCanvas,
                success: function( event ) {
                    successCallback( event.tileSource );
                }
            });
            tileSource.addHandler( 'open-failed', function( event ) {
                failCallback( event );
            } );

        } else if ($.isPlainObject(tileSource) || tileSource.nodeType) {
            if (tileSource.crossOriginPolicy === undefined &&
                (imgOptions.crossOriginPolicy !== undefined || viewer.crossOriginPolicy !== undefined)) {
                tileSource.crossOriginPolicy = imgOptions.crossOriginPolicy !== undefined ?
                    imgOptions.crossOriginPolicy : viewer.crossOriginPolicy;
            }
            if (tileSource.ajaxWithCredentials === undefined) {
                tileSource.ajaxWithCredentials = viewer.ajaxWithCredentials;
            }
            if (tileSource.useCanvas === undefined) {
                tileSource.useCanvas = viewer.useCanvas;
            }

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
                waitUntilReady(new $TileSource(options), tileSource);
            }
        } else {
            //can assume it's already a tile source implementation
            waitUntilReady(tileSource, tileSource);
        }
    });
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
    var width = overlay.width;
    var height = overlay.height;
    if (!location) {
        var x = overlay.x;
        var y = overlay.y;
        if (overlay.px !== undefined) {
            var rect = viewer.viewport.imageToViewportRectangle(new $.Rect(
                overlay.px,
                overlay.py,
                width || 0,
                height || 0));
            x = rect.x;
            y = rect.y;
            width = width !== undefined ? rect.width : undefined;
            height = height !== undefined ? rect.height : undefined;
        }
        location = new $.Point(x, y);
    }

    var placement = overlay.placement;
    if (placement && $.type(placement) === "string") {
        placement = $.Placement[overlay.placement.toUpperCase()];
    }

    return new $.Overlay({
        element: element,
        location: location,
        placement: placement,
        onDraw: overlay.onDraw,
        checkResize: overlay.checkResize,
        width: width,
        height: height,
        rotationMode: overlay.rotationMode
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
    var canvasKeyDownEventArgs = {
      originalEvent: event.originalEvent,
      preventDefaultAction: event.preventDefaultAction,
      preventVerticalPan: event.preventVerticalPan,
      preventHorizontalPan: event.preventHorizontalPan
    };

    /**
     * Raised when a keyboard key is pressed and the focus is on the {@link OpenSeadragon.Viewer#canvas} element.
     *
     * @event canvas-key
     * @memberof OpenSeadragon.Viewer
     * @type {object}
     * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised this event.
     * @property {Object} originalEvent - The original DOM event.
     * @property {Boolean} preventDefaultAction - Set to true to prevent default keyboard behaviour. Default: false.
     * @property {Boolean} preventVerticalPan - Set to true to prevent keyboard vertical panning. Default: false.
     * @property {Boolean} preventHorizontalPan - Set to true to prevent keyboard horizontal panning. Default: false.
     * @property {?Object} userData - Arbitrary subscriber-defined object.
     */

    this.raiseEvent('canvas-key', canvasKeyDownEventArgs);

    if ( !canvasKeyDownEventArgs.preventDefaultAction && !event.ctrl && !event.alt && !event.meta ) {
        switch( event.keyCode ){
            case 38://up arrow
                if (!canvasKeyDownEventArgs.preventVerticalPan) {
                  if ( event.shift ) {
                    this.viewport.zoomBy(1.1);
                  } else {
                    this.viewport.panBy(this.viewport.deltaPointsFromPixels(new $.Point(0, -this.pixelsPerArrowPress)));
                  }
                  this.viewport.applyConstraints();
                }
                return false;
            case 40://down arrow
                if (!canvasKeyDownEventArgs.preventVerticalPan) {
                  if ( event.shift ) {
                    this.viewport.zoomBy(0.9);
                  } else {
                    this.viewport.panBy(this.viewport.deltaPointsFromPixels(new $.Point(0, this.pixelsPerArrowPress)));
                  }
                  this.viewport.applyConstraints();
                }
                return false;
            case 37://left arrow
                if (!canvasKeyDownEventArgs.preventHorizontalPan) {
                  this.viewport.panBy(this.viewport.deltaPointsFromPixels(new $.Point(-this.pixelsPerArrowPress, 0)));
                  this.viewport.applyConstraints();
                }
                return false;
            case 39://right arrow
                if (!canvasKeyDownEventArgs.preventHorizontalPan) {
                  this.viewport.panBy(this.viewport.deltaPointsFromPixels(new $.Point(this.pixelsPerArrowPress, 0)));
                  this.viewport.applyConstraints();
                }
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
    var canvasKeyPressEventArgs = {
      originalEvent: event.originalEvent,
      preventDefaultAction: event.preventDefaultAction,
      preventVerticalPan: event.preventVerticalPan,
      preventHorizontalPan: event.preventHorizontalPan
    };

    // This event is documented in onCanvasKeyDown
    this.raiseEvent('canvas-key', canvasKeyPressEventArgs);

    if ( !canvasKeyPressEventArgs.preventDefaultAction && !event.ctrl && !event.alt && !event.meta ) {
        switch( event.keyCode ){
            case 43://=|+
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
                if (!canvasKeyPressEventArgs.preventVerticalPan) {
                    if ( event.shift ) {
                        this.viewport.zoomBy(1.1);
                    } else {
                        this.viewport.panBy(this.viewport.deltaPointsFromPixels(new $.Point(0, -40)));
                    }
                    this.viewport.applyConstraints();
                  }
                  return false;
            case 115://s
            case 83://S
                if (!canvasKeyPressEventArgs.preventVerticalPan) {
                  if ( event.shift ) {
                    this.viewport.zoomBy(0.9);
                  } else {
                    this.viewport.panBy(this.viewport.deltaPointsFromPixels(new $.Point(0, 40)));
                  }
                  this.viewport.applyConstraints();
                }
                return false;
            case 97://a
                if (!canvasKeyPressEventArgs.preventHorizontalPan) {
                  this.viewport.panBy(this.viewport.deltaPointsFromPixels(new $.Point(-40, 0)));
                  this.viewport.applyConstraints();
                }
                return false;
            case 100://d
                if (!canvasKeyPressEventArgs.preventHorizontalPan) {
                  this.viewport.panBy(this.viewport.deltaPointsFromPixels(new $.Point(40, 0)));
                  this.viewport.applyConstraints();
                }
                return false;
            case 114: //r - clockwise rotation
              if((this.viewport.getFlip() && !this.world._items[0].getFlip()) || (!this.viewport.getFlip() && this.world._items[0].getFlip())){
                this.viewport.setRotation($.positiveModulo(this.viewport.degrees - this.rotationIncrement, 360));
              } else{
                this.viewport.setRotation($.positiveModulo(this.viewport.degrees + this.rotationIncrement, 360));
              }
              this.viewport.applyConstraints();
              return false;
            case 82: //R - counterclockwise  rotation
              if((this.viewport.getFlip() && !this.world._items[0].getFlip()) || (!this.viewport.getFlip() && this.world._items[0].getFlip())){
                this.viewport.setRotation($.positiveModulo(this.viewport.degrees + this.rotationIncrement, 360));
              } else{
                this.viewport.setRotation($.positiveModulo(this.viewport.degrees - this.rotationIncrement, 360));
              }
              this.viewport.applyConstraints();
              return false;
            case 102: //f
              this.viewport.toggleFlip();
              return false;
            default:
                // console.log( 'navigator keycode %s', event.keyCode );
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
    if((this.viewport.getFlip() && !this.world._items[0].getFlip()) || (!this.viewport.getFlip() && this.world._items[0].getFlip())){
        event.position.x = this.viewport.getContainerSize().x - event.position.x;
    }

    var canvasClickEventArgs = {
        tracker: event.eventSource,
        position: event.position,
        quick: event.quick,
        shift: event.shift,
        originalEvent: event.originalEvent,
        preventDefaultAction: event.preventDefaultAction
    };

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
     * @property {Boolean} preventDefaultAction - Set to true to prevent default click to zoom behaviour. Default: false.
     * @property {?Object} userData - Arbitrary subscriber-defined object.
     */
    this.raiseEvent( 'canvas-click', canvasClickEventArgs);

    if ( !canvasClickEventArgs.preventDefaultAction && this.viewport && event.quick ) {
        gestureSettings = this.gestureSettingsByDeviceType( event.pointerType );
        if ( gestureSettings.clickToZoom ) {
            this.viewport.zoomBy(
                event.shift ? 1.0 / this.zoomPerClick : this.zoomPerClick,
                gestureSettings.zoomToRefPoint ? this.viewport.pointFromPixel( event.position, true ) : null
            );
            this.viewport.applyConstraints();
        }
    }
}

function onCanvasDblClick( event ) {
    var gestureSettings;

    var canvasDblClickEventArgs = {
        tracker: event.eventSource,
        position: event.position,
        shift: event.shift,
        originalEvent: event.originalEvent,
        preventDefaultAction: event.preventDefaultAction
    };

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
     * @property {Boolean} preventDefaultAction - Set to true to prevent default double tap to zoom behaviour. Default: false.
     * @property {?Object} userData - Arbitrary subscriber-defined object.
     */
    this.raiseEvent( 'canvas-double-click', canvasDblClickEventArgs);

    if ( !canvasDblClickEventArgs.preventDefaultAction && this.viewport ) {
        gestureSettings = this.gestureSettingsByDeviceType( event.pointerType );
        if ( gestureSettings.dblClickToZoom ) {
            this.viewport.zoomBy(
                event.shift ? 1.0 / this.zoomPerClick : this.zoomPerClick,
                gestureSettings.zoomToRefPoint ? this.viewport.pointFromPixel( event.position, true ) : null
            );
            this.viewport.applyConstraints();
        }
    }
}

function onCanvasDrag( event ) {
    var gestureSettings;

    var canvasDragEventArgs = {
        tracker: event.eventSource,
        position: event.position,
        delta: event.delta,
        speed: event.speed,
        direction: event.direction,
        shift: event.shift,
        originalEvent: event.originalEvent,
        preventDefaultAction: event.preventDefaultAction
    };

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
     * @property {Boolean} preventDefaultAction - Set to true to prevent default drag behaviour. Default: false.
     * @property {?Object} userData - Arbitrary subscriber-defined object.
     */
    this.raiseEvent( 'canvas-drag', canvasDragEventArgs);

    if ( !canvasDragEventArgs.preventDefaultAction && this.viewport ) {
        gestureSettings = this.gestureSettingsByDeviceType( event.pointerType );
        if( !this.panHorizontal ){
            event.delta.x = 0;
        }
        if( !this.panVertical ){
            event.delta.y = 0;
        }
        if((this.viewport.getFlip() && !this.world._items[0].getFlip()) || (!this.viewport.getFlip() && this.world._items[0].getFlip())){
            event.delta.x = -event.delta.x;
        }

        if( this.constrainDuringPan ){
            var delta = this.viewport.deltaPointsFromPixels( event.delta.negate() );

            this.viewport.centerSpringX.target.value += delta.x;
            this.viewport.centerSpringY.target.value += delta.y;

            var bounds = this.viewport.getBounds();
            var constrainedBounds = this.viewport.getConstrainedBounds();

            this.viewport.centerSpringX.target.value -= delta.x;
            this.viewport.centerSpringY.target.value -= delta.y;

            if (bounds.x != constrainedBounds.x) {
                event.delta.x = 0;
            }

            if (bounds.y != constrainedBounds.y) {
                event.delta.y = 0;
            }
        }

        this.viewport.panBy( this.viewport.deltaPointsFromPixels( event.delta.negate() ), gestureSettings.flickEnabled && !this.constrainDuringPan);
    }
}

function onCanvasDragEnd( event ) {
    if (!event.preventDefaultAction && this.viewport) {
        var gestureSettings = this.gestureSettingsByDeviceType(event.pointerType);
        if (gestureSettings.flickEnabled &&
            event.speed >= gestureSettings.flickMinSpeed) {
            var amplitudeX = 0;
            if (this.panHorizontal) {
                amplitudeX = gestureSettings.flickMomentum * event.speed *
                    Math.cos(event.direction);
            }
            var amplitudeY = 0;
            if (this.panVertical) {
                amplitudeY = gestureSettings.flickMomentum * event.speed *
                    Math.sin(event.direction);
            }
            var center = this.viewport.pixelFromPoint(
                this.viewport.getCenter(true));
            var target = this.viewport.pointFromPixel(
                new $.Point(center.x - amplitudeX, center.y - amplitudeY));
            this.viewport.panTo(target, false);
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
    this.raiseEvent('canvas-drag-end', {
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

    if (window.location != window.parent.location){
        $.MouseTracker.resetAllMouseTrackers();
    }

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
            if ( gestureSettings.zoomToRefPoint ) {
                this.viewport.panBy(panByPt, true);
            }
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
        factor,
        thisScrollTime,
        deltaScrollTime;

    /* Certain scroll devices fire the scroll event way too fast so we are injecting a simple adjustment to keep things
     * partially normalized. If we have already fired an event within the last 'minScrollDelta' milliseconds we skip
     * this one and wait for the next event. */
    thisScrollTime = $.now();
    deltaScrollTime = thisScrollTime - this._lastScrollTime;
    if (deltaScrollTime > this.minScrollDeltaTime) {
        this._lastScrollTime = thisScrollTime;

        if((this.viewport.getFlip() && !this.world._items[0].getFlip()) || (!this.viewport.getFlip() && this.world._items[0].getFlip())){
          event.position.x = this.viewport.getContainerSize().x - event.position.x;
        }

        if ( !event.preventDefaultAction && this.viewport ) {
            gestureSettings = this.gestureSettingsByDeviceType( event.pointerType );
            if ( gestureSettings.scrollToZoom ) {
                factor = Math.pow( this.zoomPerScroll, event.scroll );
                this.viewport.zoomBy(
                    factor,
                    gestureSettings.zoomToRefPoint ? this.viewport.pointFromPixel( event.position, true ) : null
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
        if (gestureSettings && gestureSettings.scrollToZoom) {
            //cancels event
            return false;
        }
    }
    else {
        gestureSettings = this.gestureSettingsByDeviceType( event.pointerType );
        if (gestureSettings && gestureSettings.scrollToZoom) {
            return false;   // We are swallowing this event
        }
    }
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
    updateOnce( viewer );

    // Request the next frame, unless we've been closed
    if ( viewer.isOpen() ) {
        viewer._updateRequestId = scheduleUpdate( viewer, updateMulti );
    } else {
        viewer._updateRequestId = false;
    }
}

function updateOnce( viewer ) {

    //viewer.profiler.beginUpdate();

    if (viewer._opening) {
        return;
    }

    if (viewer.autoResize) {
        var containerSize = _getSafeElemSize(viewer.container);
        var prevContainerSize = THIS[viewer.hash].prevContainerSize;
        if (!containerSize.equals(prevContainerSize)) {
            var viewport = viewer.viewport;
            if (viewer.preserveImageSizeOnResize) {
                var resizeRatio = prevContainerSize.x / containerSize.x;
                var zoom = viewport.getZoom() * resizeRatio;
                var center = viewport.getCenter();
                viewport.resize(containerSize, false);
                viewport.zoomTo(zoom, null, true);
                viewport.panTo(center, true);
            } else {
                // maintain image position
                var oldBounds = viewport.getBounds();
                viewport.resize(containerSize, true);
                viewport.fitBoundsWithConstraints(oldBounds, true);
            }
            THIS[viewer.hash].prevContainerSize = containerSize;
            THIS[viewer.hash].forceRedraw = true;
        }
    }

    var viewportChange = viewer.viewport.update();
    var animated = viewer.world.update() || viewportChange;

    if (viewportChange) {
        /**
         * Raised when any spring animation update occurs (zoom, pan, etc.),
         * before the viewer has drawn the new location.
         *
         * @event viewport-change
         * @memberof OpenSeadragon.Viewer
         * @type {object}
         * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised this event.
         * @property {?Object} userData - Arbitrary subscriber-defined object.
         */
        viewer.raiseEvent('viewport-change');
    }

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

    if ( animated || THIS[ viewer.hash ].forceRedraw || viewer.world.needsDraw() ) {
        drawWorld( viewer );
        viewer._drawOverlays();
        if( viewer.navigator ){
          viewer.navigator.update( viewer.viewport );
        }

        THIS[ viewer.hash ].forceRedraw = false;

        if (animated) {
            /**
             * Raised when any spring animation update occurs (zoom, pan, etc.),
             * after the viewer has drawn the new location.
             *
             * @event animation
             * @memberof OpenSeadragon.Viewer
             * @type {object}
             * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised this event.
             * @property {?Object} userData - Arbitrary subscriber-defined object.
             */
            viewer.raiseEvent( "animation" );
        }
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

    // Update navigator flip transformation
    if (viewer.navigator && viewer.viewport != "undefined"){
      viewer.navigator.setFlip(viewer.viewport.getFlip());
    }
    //viewer.profiler.endUpdate();
}

function drawWorld( viewer ) {
    viewer.imageLoader.clear();
    viewer.drawer.clear();
    viewer.world.draw();

    /**
     * <em>- Needs documentation -</em>
     *
     * @event update-viewport
     * @memberof OpenSeadragon.Viewer
     * @type {object}
     * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
     * @property {?Object} userData - Arbitrary subscriber-defined object.
     */
    viewer.raiseEvent( 'update-viewport', {} );
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

function onRotateLeft() {
    if ( this.viewport ) {
        var currRotation = this.viewport.getRotation();

        if((this.viewport.getFlip() && !this.world._items[0].getFlip()) || (!this.viewport.getFlip() && this.world._items[0].getFlip())){
          currRotation = $.positiveModulo(currRotation + this.rotationIncrement, 360);
        } else {
          currRotation = $.positiveModulo(currRotation - this.rotationIncrement, 360);
        }
        this.viewport.setRotation(currRotation);
    }
}

function onRotateRight() {
    if ( this.viewport ) {
        var currRotation = this.viewport.getRotation();

        if((this.viewport.getFlip() && !this.world._items[0].getFlip()) || (!this.viewport.getFlip() && this.world._items[0].getFlip())){
          currRotation = $.positiveModulo(currRotation - this.rotationIncrement, 360);
        } else {
          currRotation = $.positiveModulo(currRotation + this.rotationIncrement, 360);
        }
        this.viewport.setRotation(currRotation);
    }
}
/**
 * Note: When pressed flip control button
 */
function onFlip() {
   this.viewport.toggleFlip();
}

function onPrevious(){
    var previous = this._sequenceIndex - 1;
    if(this.navPrevNextWrap && previous < 0){
        previous += this.tileSources.length;
    }
    this.goToPage( previous );
}


function onNext(){
    var next = this._sequenceIndex + 1;
    if(this.navPrevNextWrap && next >= this.tileSources.length){
        next = 0;
    }
    this.goToPage( next );
}


}( OpenSeadragon ));
