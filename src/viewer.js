/*
 * OpenSeadragon - Viewer
 *
 * Copyright (C) 2009 CodePlex Foundation
 * Copyright (C) 2010-2025 OpenSeadragon contributors
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
const THIS = {};
let nextHash = 1;

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

    const args  = arguments;
    const _this = this;
    let i;


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

    // Move deprecated drawer options from the base options object into a sub-object
    // This is an array to make it easy to add additional properties to convert to
    // drawer options later if it makes sense to set at the drawer level rather than
    // per tiled image (for example, subPixelRoundingForTransparency).
    const drawerOptionList = [
            'useCanvas', // deprecated
        ];
    options.drawerOptions = Object.assign({},
        drawerOptionList.reduce((drawerOptions, option) => {
            drawerOptions[option] = options[option];
            delete options[option];
            return drawerOptions;
        }, {}),
        options.drawerOptions);

    //Public properties
    //Allow the options object to override global defaults
    $.extend( true, this, {

        //internal state and dom identifiers
        id:             options.id,
        hash:           options.hash || nextHash++,
        /**
         * Parent viewer reference. Base Viewer has null reference, child viewers (such as navigator
         * or reference strip) must reference the parent viewer they were spawned from.
         * @member {OpenSeadragon.Viewer} viewer
         * @memberof OpenSeadragon.Viewer#
         */
        viewer:         null,
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

        // When we go full-screen we insert ourselves into the body and make
        // everything else hidden. This is basically the same as
        // `requestFullScreen` but works in all browsers: iPhone is known to not
        // allow full-screen with the requestFullScreen API.  This holds the
        // children of the body and their display values, so we can undo our
        // changes when we go out of full-screen
        previousDisplayValuesOfBodyChildren:   [],

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
         * Resolved list of drawer type strings (after expanding 'auto', de-duplicating, and
         * normalizing: constructors are replaced by their getType() result). Used to decide
         * allowed fallbacks: WebGL drawer only falls back to canvas when the string 'canvas' is
         * in this list (see per-tile and context-loss fallback). Normalized so includes('canvas')
         * is reliable even when custom drawer constructors were passed in options.
         * @member {string[]} drawerCandidates
         * @memberof OpenSeadragon.Viewer#
         */
        drawerCandidates:   null,
        /**
         * Keeps track of all of the tiled images in the scene.
         * @member {OpenSeadragon.World} world
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
        buttonGroup:        null,

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
        fsBoundsDelta:     new $.Point( 1, 1 ),
        prevContainerSize: null,
        animating:         false,
        forceRedraw:       false,
        needsResize:       false,
        forceResize:       false,
        mouseInside:       false,
        group:             null,
        // whether we should be continuously zooming
        zooming:           false,
        // how much we should be continuously zooming by
        zoomFactor:        null,
        lastZoomTime:      null,
        fullPage:          false,
        onfullscreenchange: null,
        lastClickTime: null,
        draggingToZoom: false,
    };

    this._sequenceIndex = 0;
    this._firstOpen = true;
    this._updateRequestId = null;
    this._loadQueue = [];
    this.currentOverlays = [];
    this._updatePixelDensityRatioBind = null;

    this._lastScrollTime = $.now(); // variable used to help normalize the scroll event speed of different devices

    this._fullyLoaded = false; // variable used to track the viewer's aggregate loading state.

    this._navActionFrames = {};     // tracks cumulative pan distance per key press
    this._navActionVirtuallyHeld = {};   // marks keys virtually held after early release
    this._minNavActionFrames = 10;      // minimum pan distance per tap or key press

    this._activeActions = { // variable to keep track of currently pressed action
        // Basic arrow key panning (no modifiers)
        panUp: false,
        panDown: false,
        panLeft: false,
        panRight: false,

        // Modifier-based actions
        zoomIn: false,    // Shift + Up
        zoomOut: false    // Shift + Down
    };


    //Inherit some behaviors and properties
    $.EventSource.call( this );

    this.addHandler( 'open-failed', function ( event ) {
        const msg = $.getString( "Errors.OpenFailed", event.eventSource, event.message);
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

    // Injecting mobile-only CSS to remove focus outline
    if (!document.querySelector('style[data-openseadragon-mobile-css]')) {
        const style = document.createElement('style');
        style.setAttribute('data-openseadragon-mobile-css', 'true');
        style.textContent =
            '@media (hover: none) {' +
            '    .openseadragon-canvas:focus {' +
            '        outline: none !important;' +
            '    }' +
            '}';
        document.head.appendChild(style);
    }

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
    $.setElementTouchActionNone( this.container );

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
        userData:                 'Viewer.innerTracker',
        element:                  this.canvas,
        startDisabled:            !this.mouseNavEnabled,
        clickTimeThreshold:       this.clickTimeThreshold,
        clickDistThreshold:       this.clickDistThreshold,
        dblClickTimeThreshold:    this.dblClickTimeThreshold,
        dblClickDistThreshold:    this.dblClickDistThreshold,
        flipPrimaryMouseButton:   this.flipPrimaryMouseButton,
        contextMenuHandler:       $.delegate( this, onCanvasContextMenu ),
        keyDownHandler:           $.delegate( this, onCanvasKeyDown ),
        keyUpHandler:             $.delegate(this, onCanvasKeyUp),
        keyHandler:               $.delegate( this, onCanvasKeyPress ),
        clickHandler:             $.delegate( this, onCanvasClick ),
        dblClickHandler:          $.delegate( this, onCanvasDblClick ),
        dragHandler:              $.delegate( this, onCanvasDrag ),
        dragEndHandler:           $.delegate( this, onCanvasDragEnd ),
        enterHandler:             $.delegate( this, onCanvasEnter ),
        leaveHandler:             $.delegate( this, onCanvasLeave ),
        pressHandler:             $.delegate( this, onCanvasPress ),
        releaseHandler:           $.delegate( this, onCanvasRelease ),
        nonPrimaryPressHandler:   $.delegate( this, onCanvasNonPrimaryPress ),
        nonPrimaryReleaseHandler: $.delegate( this, onCanvasNonPrimaryRelease ),
        scrollHandler:            $.delegate( this, onCanvasScroll ),
        pinchHandler:             $.delegate( this, onCanvasPinch ),
        focusHandler:             $.delegate( this, onCanvasFocus ),
        blurHandler:              $.delegate( this, onCanvasBlur ),
    });

    this.outerTracker = new $.MouseTracker({
        userData:               'Viewer.outerTracker',
        element:                this.container,
        startDisabled:          !this.mouseNavEnabled,
        clickTimeThreshold:     this.clickTimeThreshold,
        clickDistThreshold:     this.clickDistThreshold,
        dblClickTimeThreshold:  this.dblClickTimeThreshold,
        dblClickDistThreshold:  this.dblClickDistThreshold,
        flipPrimaryMouseButton: this.flipPrimaryMouseButton,
        enterHandler:           $.delegate( this, onContainerEnter ),
        leaveHandler:           $.delegate( this, onContainerLeave )
    });

    if( this.toolbar ){
        this.toolbar = new $.ControlDock({ element: this.toolbar });
    }

    this.bindStandardControls();

    THIS[ this.hash ].prevContainerSize = _getSafeElemSize( this.container );

    if(window.ResizeObserver){
        this._autoResizePolling = false;
        this._resizeObserver = new ResizeObserver(function(){
            THIS[_this.hash].needsResize = true;
        });

        this._resizeObserver.observe(this.container, {});
    } else {
        this._autoResizePolling = true;
    }

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

        const tiledImage = event.item;
        const fullyLoadedHandler =  function() {
            const newFullyLoaded = _this._areAllFullyLoaded();
            if (newFullyLoaded !== _this._fullyLoaded) {
                _this._fullyLoaded = newFullyLoaded;

                /**
                 * Fired when the viewer's aggregate "fully loaded" state changes (when all
                 * TiledImages in the world have loaded tiles for the current view resolution).
                 *
                 * @event fully-loaded-change
                 * @memberof OpenSeadragon.Viewer
                 * @type {object}
                 * @property {Boolean} fullyLoaded - The new aggregate "fully loaded" value
                 * @property {OpenSeadragon.Viewer} eventSource - Reference to the Viewer instance
                 * @property {?Object} userData - Arbitrary subscriber-defined object
                 */
                _this.raiseEvent('fully-loaded-change', {
                    fullyLoaded: newFullyLoaded
                });
            }
        };
        tiledImage._fullyLoadedHandlerForViewer = fullyLoadedHandler;
        tiledImage.addHandler('fully-loaded-change', fullyLoadedHandler);
    });

    this.world.addHandler('remove-item', function(event) {
        const tiledImage = event.item;

        // SAFE cleanup with existence check
        if (tiledImage._fullyLoadedHandlerForViewer) {
            tiledImage.removeHandler('fully-loaded-change', tiledImage._fullyLoadedHandlerForViewer);
            delete tiledImage._fullyLoadedHandlerForViewer; // Remove the reference
        }

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
        containerSize:                      THIS[ this.hash ].prevContainerSize,
        springStiffness:                    this.springStiffness,
        animationTime:                      this.animationTime,
        minZoomImageRatio:                  this.minZoomImageRatio,
        maxZoomPixelRatio:                  this.maxZoomPixelRatio,
        visibilityRatio:                    this.visibilityRatio,
        wrapHorizontal:                     this.wrapHorizontal,
        wrapVertical:                       this.wrapVertical,
        defaultZoomLevel:                   this.defaultZoomLevel,
        minZoomLevel:                       this.minZoomLevel,
        maxZoomLevel:                       this.maxZoomLevel,
        viewer:                             this,
        degrees:                            this.degrees,
        flipped:                            this.flipped,
        overlayPreserveContentDirection:    this.overlayPreserveContentDirection,
        navigatorRotate:                    this.navigatorRotate,
        homeFillsViewer:                    this.homeFillsViewer,
        margins:                            this.viewportMargins,
        silenceMultiImageWarnings:          this.silenceMultiImageWarnings
    });

    this.viewport._setContentBounds(this.world.getHomeBounds(), this.world.getContentFactor());

    // Create the image loader
    this.imageLoader = new $.ImageLoader({
        jobLimit: this.imageLoaderLimit,
        timeout: options.timeout,
        tileRetryMax: this.tileRetryMax,
        tileRetryDelay: this.tileRetryDelay
    });

    // Create the tile cache
    this.tileCache = new $.TileCache({
        viewer: this,
        maxImageCacheCount: this.maxImageCacheCount
    });

    //Create the drawer based on selected options
    if (Object.prototype.hasOwnProperty.call(this.drawerOptions, 'useCanvas') ){
        $.console.error('useCanvas is deprecated, use the "drawer" option to indicate preferred drawer(s)');

        // for backwards compatibility, use HTMLDrawer if useCanvas is defined and is falsey
        if (!this.drawerOptions.useCanvas){
            this.drawer = $.HTMLDrawer;
        }

        delete this.drawerOptions.useCanvas;
    }
    let drawerCandidates = Array.isArray(this.drawer) ? this.drawer : [this.drawer];
    if (drawerCandidates.length === 0){
        // if an empty array was passed in, throw a warning and use the defaults
        // note: if the drawer option is not specified, the defaults will already be set so this won't apply
        drawerCandidates = [$.DEFAULT_SETTINGS.drawer].flat(); // ensure it is a list
        $.console.warn('No valid drawers were selected. Using the default value.');
    }

    // 'auto' is expanded in the candidate list in a platform-dependent way: on iOS-like devices
    // to ['canvas'] only, on other platforms to ['webgl', 'canvas'] so that if WebGL fails at
    // creation, canvas is tried next. Same detection as getAutoDrawerCandidates() / determineDrawer('auto').
    drawerCandidates = drawerCandidates.flatMap(
        function(c) {
            return c === 'auto' ? getAutoDrawerCandidates() : [c];
        }
    );
    drawerCandidates = drawerCandidates.filter(
        function(c, i, arr) {
            return arr.indexOf(c) === i;
        }
    );
    this.drawerCandidates = drawerCandidates.map(getDrawerTypeString).filter(Boolean);

    this.drawer = null;
    for (const drawerCandidate of drawerCandidates){
        const success = this.requestDrawer(drawerCandidate, {mainDrawer: true, redrawImmediately: false});
        if(success){
            break;
        }
    }

    if (!this.drawer){
        $.console.error('No drawer could be created!');
        throw('Error with creating the selected drawer(s)');
    }

    // Pass the imageSmoothingEnabled option along to the drawer
    this.drawer.setImageSmoothingEnabled(this.imageSmoothingEnabled);

    // Overlay container
    this.overlaysContainer    = $.makeNeutralElement( "div" );
    this.canvas.appendChild( this.overlaysContainer );

    // Now that we have a drawer, see if it supports rotate. If not we need to remove the rotate buttons
    if (!this.drawer.canRotate()) {
        // Disable/remove the rotate left/right buttons since they aren't supported
        if (this.rotateLeft) {
            i = this.buttonGroup.buttons.indexOf(this.rotateLeft);
            this.buttonGroup.buttons.splice(i, 1);
            this.buttonGroup.element.removeChild(this.rotateLeft.element);
        }
        if (this.rotateRight) {
            i = this.buttonGroup.buttons.indexOf(this.rotateRight);
            this.buttonGroup.buttons.splice(i, 1);
            this.buttonGroup.element.removeChild(this.rotateRight.element);
        }
    }

    this._addUpdatePixelDensityRatioEvent();

    if ('navigatorAutoResize' in this) {
        $.console.warn('navigatorAutoResize is deprecated, this value will be ignored.');
    }

    //Instantiate a navigator if configured
    if ( this.showNavigator){
        this.navigator = new $.Navigator({
            element:           this.navigatorElement,
            id:                this.navigatorId,
            position:          this.navigatorPosition,
            sizeRatio:         this.navigatorSizeRatio,
            maintainSizeRatio: this.navigatorMaintainSizeRatio,
            top:               this.navigatorTop,
            left:              this.navigatorLeft,
            width:             this.navigatorWidth,
            height:            this.navigatorHeight,
            autoFade:          this.navigatorAutoFade,
            prefixUrl:         this.prefixUrl,
            viewer:            this,
            navigatorRotate:   this.navigatorRotate,
            background:        this.navigatorBackground,
            opacity:           this.navigatorOpacity,
            borderColor:       this.navigatorBorderColor,
            displayRegionColor: this.navigatorDisplayRegionColor,
            crossOriginPolicy: this.crossOriginPolicy,
            animationTime:     this.animationTime,
            drawer:            this.drawer.getType(),
            drawerOptions:     this.drawerOptions,
            loadTilesWithAjax: this.loadTilesWithAjax,
            ajaxHeaders:       this.ajaxHeaders,
            ajaxWithCredentials: this.ajaxWithCredentials,
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

    // Register the viewer
    $._viewers.set(this.element, this);
};

$.extend( $.Viewer.prototype, $.EventSource.prototype, $.ControlDock.prototype, /** @lends OpenSeadragon.Viewer.prototype */{


    /**
     * @function
     * @returns {Boolean}
     */
    isOpen: function () {
        return !!this.world.getItemCount();
    },

    /**
     * Checks whether all TiledImage instances in the viewer's world are fully loaded.
     * This determines if the entire viewer content is ready for optimal display without partial tile loading.
     * @private
     * @returns {Boolean} True if all TiledImages report being fully loaded,
     *                    false if any image still has pending tiles
     */
    _areAllFullyLoaded: function() {
        const count = this.world.getItemCount();

        // Iterate through all TiledImages in the viewer's world
        for (let i = 0; i < count; i++) {
            let tiledImage = this.world.getItemAt(i);

            // Return immediately if any image isn't fully loaded
            if (!tiledImage.getFullyLoaded()) {
                return false;
            }
        }
        // All images passed the check
        return true;
    },

    /**
     * @function
     * @returns {Boolean} True if all required tiles are loaded, false otherwise
     */
    getFullyLoaded: function() {
        return this._fullyLoaded;
    },

    /**
     * Executes the provided callback when the TiledImage is fully loaded. If already loaded,
     * schedules the callback asynchronously. Otherwise, attaches a one-time event listener
     * for the 'fully-loaded-change' event.
     * @param {Function} callback - Function to execute when loading completes
     * @memberof OpenSeadragon.Viewer.prototype
     */
    whenFullyLoaded: function(callback) {
        if (this.getFullyLoaded()) {
            setTimeout(callback, 1); // Asynchronous execution
        } else {
            this.addOnceHandler('fully-loaded-change', function() {
                callback(); // Maintain context
            });
        }
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

    //deprecated
    get buttons () {
        $.console.warn('Viewer.buttons is deprecated; Please use Viewer.buttonGroup');
        return this.buttonGroup;
    },

    /**
     * Open tiled images into the viewer, closing any others.
     * To get the TiledImage instance created by open, add an event listener for
     * {@link OpenSeadragon.Viewer.html#.event:open}, which when fired can be used to get access
     * to the instance, i.e., viewer.world.getItemAt(0).
     * @function
     * @param {OpenSeadragon.TileSourceSpecifier|OpenSeadragon.TileSourceSpecifier[]} tileSources - This can be a TiledImage
     * specifier, a TileSource specifier, or an array of either. A TiledImage specifier
     * is the same as the options parameter for {@link OpenSeadragon.Viewer#addTiledImage},
     * except for the index property; images are added in sequence.
     * A TileSource specifier is anything you could pass as the tileSource property
     * of the options parameter for {@link OpenSeadragon.Viewer#addTiledImage}.
     * @param {Number} [initialPage = undefined] - If sequenceMode is true, display this page initially
     * for the given tileSources. If specified, will overwrite the Viewer's existing initialPage property.
     * @returns {OpenSeadragon.Viewer} Chainable.
     * @fires OpenSeadragon.Viewer.event:open
     * @fires OpenSeadragon.Viewer.event:open-failed
     */
    open: function (tileSources, initialPage = undefined) {
        const _this = this;

        this.close();

        if (!tileSources) {
            return this;
        }

        if (this.sequenceMode && $.isArray(tileSources)) {
            if (this.referenceStrip) {
                this.referenceStrip.destroy();
                this.referenceStrip = null;
            }

            if (typeof initialPage !== 'undefined' && !isNaN(initialPage)) {
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
            return this;
        }

        if (!$.isArray(tileSources)) {
            tileSources = [tileSources];
        }

        if (!tileSources.length) {
            return this;
        }

        this._opening = true;

        const expected = tileSources.length;
        let successes = 0;
        let failures = 0;
        let failEvent;

        const checkCompletion = function() {
            if (successes + failures === expected) {
                if (successes) {
                    if (_this._firstOpen || !_this.preserveViewport) {
                        _this.viewport.goHome( true );
                        _this.viewport.update();
                    }

                    _this._firstOpen = false;

                    let source = tileSources[0];
                    if (source.tileSource) {
                        source = source.tileSource;
                    }

                    // Global overlays
                    if( _this.overlays && !_this.preserveOverlays ){
                        for ( let i = 0; i < _this.overlays.length; i++ ) {
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

        const doOne = function(index, options) {
            if (!$.isPlainObject(options) || !options.tileSource) {
                options = {
                    tileSource: options
                };
            }

            if (options.index !== undefined) {
                $.console.warn('[Viewer.open] Ignoring user-supplied index; preserving order by setting index to ' + index + '. If you need to set indexes, use addTiledImage instead.');
                delete options.index;
                // ensure we keep the order we received
                options.index = index;
            }

            if (options.collectionImmediately === undefined) {
                options.collectionImmediately = true;
            }

            const originalSuccess = options.success;
            options.success = function(event) {
                successes++;

                // TODO: now that options has other things besides tileSource, the overlays
                // should probably be at the options level, not the tileSource level.
                if (options.tileSource.overlays) {
                    for (let i = 0; i < options.tileSource.overlays.length; i++) {
                        _this.addOverlay(options.tileSource.overlays[i]);
                    }
                }

                if (originalSuccess) {
                    originalSuccess(event);
                }

                checkCompletion();
            };

            const originalError = options.error;
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
        for (let i = 0; i < tileSources.length; i++) {
            doOne(i, tileSources[i]);
        }

        return this;
    },

    /**
     * Updates data within every tile in the viewer. Should be called
     * when tiles are outdated and should be re-processed. Useful mainly
     * for plugins that change tile data.
     * @function
     * @param {Boolean} [restoreTiles=true] if true, tile processing starts from the tile original data
     * @fires OpenSeadragon.Viewer.event:tile-invalidated
     * @return {OpenSeadragon.Promise<?>}
     */
    requestInvalidate: function (restoreTiles = true) {
        if ( !THIS[ this.hash ] || !this._drawerList ) {
            //this viewer has already been destroyed or is a child in connected mode: returning immediately
            return $.Promise.resolve();
        }

        const tStamp = $.now();
        // if drawer option broadCastTileInvalidation is enabled, this is NOOP for any but the base drawer, that runs update on all
        return $.Promise.all(this._drawerList.map(drawer => drawer.viewer.world.requestInvalidate(restoreTiles, tStamp)));
    },


    /**
     * @function
     * @returns {OpenSeadragon.Viewer} Chainable.
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
        this.tileCache.clear();
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
     * @fires OpenSeadragon.Viewer.event:before-destroy
     * @fires OpenSeadragon.Viewer.event:destroy
     */
    destroy: function( ) {
        if ( !THIS[ this.hash ] ) {
            //this viewer has already been destroyed: returning immediately
            return;
        }

        /**
         * Raised when the viewer is about to be destroyed (see {@link OpenSeadragon.Viewer#before-destroy}).
         *
         * @event before-destroy
         * @memberof OpenSeadragon.Viewer
         * @type {object}
         * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
         * @property {?Object} userData - Arbitrary subscriber-defined object.
         */
        this.raiseEvent( 'before-destroy' );

        this._removeUpdatePixelDensityRatioEvent();

        this.close();

        this.clearOverlays();
        this.overlaysContainer.innerHTML = "";

        //TODO: implement this...
        //this.unbindSequenceControls()
        //this.unbindStandardControls()
        if (this._resizeObserver){
            this._resizeObserver.disconnect();
        }

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

        if ( this.navigator ) {
            this.navigator.destroy();
            THIS[ this.navigator.hash ] = null;
            delete THIS[ this.navigator.hash ];
            this.navigator = null;
        }


        if (this.buttonGroup) {
            this.buttonGroup.destroy();
        } else if (this.customButtons) {
            while (this.customButtons.length) {
                this.customButtons.pop().destroy();
            }
        }

        if (this.paging) {
            this.paging.destroy();
        }

        // Remove both the canvas and container elements added by OpenSeadragon
        // This will also remove its children (like the canvas)
        if (this.container && this.container.parentNode === this.element) {
            this.element.removeChild(this.container);
        }
        this.container.onsubmit = null;
        this.clearControls();

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

        // Unregister the viewer
        $._viewers.delete(this.element);

        // clear our reference to the main element - they will need to pass it in again, creating a new viewer
        this.element = null;



        /**
         * Raised when the viewer is destroyed (see {@link OpenSeadragon.Viewer#destroy}).
         *
         * @event destroy
         * @memberof OpenSeadragon.Viewer
         * @type {object}
         * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
         * @property {?Object} userData - Arbitrary subscriber-defined object.
         */
        this.raiseEvent( 'destroy' );

        this.removeAllHandlers();
    },

    /**
     * Check if the viewer has been destroyed or not yet initialized.
     * @return {boolean}
     */
    isDestroyed() {
        return !THIS[ this.hash ];
    },

    /**
     * Request a drawer for this viewer, as a supported string or drawer constructor.
     * @param {String | OpenSeadragon.DrawerBase} drawerCandidate The type of drawer to try to construct.
     * @param { Object } options
     * @param { Boolean } [options.mainDrawer] Whether to use this as the viewer's main drawer. Default = true.
     * @param { Boolean } [options.redrawImmediately] Whether to immediately draw a new frame. Only used if options.mainDrawer = true. Default = true.
     * @param { Object } [options.drawerOptions] Options for this drawer. Defaults to viewer.drawerOptions.
     * for this viewer type. See {@link OpenSeadragon.Options}.
     * @returns {Object | Boolean} The drawer that was created, or false if the requested drawer is not supported
     */
    requestDrawer(drawerCandidate, options){
        const defaultOpts = {
            mainDrawer: true,
            redrawImmediately: true,
            drawerOptions: null
        };
        options = $.extend(true, defaultOpts, options);
        const mainDrawer = options.mainDrawer;
        const redrawImmediately = options.redrawImmediately;
        const drawerOptions = options.drawerOptions;

        const oldDrawer = this.drawer;

        let Drawer = null;

        //if the candidate inherits from a drawer base, use it
        if (drawerCandidate && drawerCandidate.prototype instanceof $.DrawerBase) {
            Drawer = drawerCandidate;
            drawerCandidate = 'custom';
        } else if (typeof drawerCandidate === "string") {
            Drawer = $.determineDrawer(drawerCandidate);
        }

        if (!Drawer) {
            $.console.warn('Unsupported drawer %s! Drawer must be an existing string type, or a class that extends OpenSeadragon.DrawerBase.', drawerCandidate);
        }

        // Guard isSupported() in try/catch so a buggy or throwing plugin drawer cannot crash the whole viewer
        let supported = false;
        if (Drawer) {
            try {
                supported = Drawer.isSupported();
            } catch (e) {
                $.console.warn('Error in %s isSupported(); treating this drawer as unsupported:', drawerCandidate, e && e.message ? e.message : e);
            }
        }
        if (supported) {
            // if the drawer is supported, create it and return it.
            // first destroy the previous drawer
            if(oldDrawer && mainDrawer){
                oldDrawer.destroy();
            }

            // create the new drawer
            const newDrawer = new Drawer({
                viewer:             this,
                viewport:           this.viewport,
                element:            this.canvas,
                debugGridColor:     this.debugGridColor,
                options:            drawerOptions || this.drawerOptions[drawerCandidate],
            });

            if(mainDrawer){
                this.drawer = newDrawer;
                if(redrawImmediately){
                    this.forceRedraw();
                }
            }

            return newDrawer;
        }

        return false;
    },

    /**
     * @function
     * @returns {Boolean}
     */
    isMouseNavEnabled: function () {
        return this.innerTracker.tracking;
    },

    /**
     * @function
     * @param {Boolean} enabled - true to enable, false to disable
     * @returns {OpenSeadragon.Viewer} Chainable.
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
     * @returns {Boolean}
     */
    isKeyboardNavEnabled: function () {
        return this.keyboardNavEnabled;
    },

    /**
     * @function
     * @param {Boolean} enabled - true to enable, false to disable
     * @returns {OpenSeadragon.Viewer} Chainable.
     * @fires OpenSeadragon.Viewer.event:keyboard-enabled
     */
    setKeyboardNavEnabled: function( enabled ){
        this.keyboardNavEnabled = enabled;

        /**
         * Raised when keyboard navigation is enabled or disabled (see {@link OpenSeadragon.Viewer#setKeyboardNavEnabled}).
         *
         * @event keyboard-enabled
         * @memberof OpenSeadragon.Viewer
         * @type {object}
         * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised the event.
         * @property {Boolean} enabled
         * @property {?Object} userData - Arbitrary subscriber-defined object.
         */
        this.raiseEvent( 'keyboard-enabled', { enabled: enabled } );
        return this;
    },


    /**
     * @function
     * @returns {Boolean}
     */
    areControlsEnabled: function () {
        let enabled = this.controls.length;
        for( let i = 0; i < this.controls.length; i++ ){
            enabled = enabled && this.controls[ i ].isVisible();
        }
        return enabled;
    },


    /**
     * Shows or hides the controls (e.g. the default navigation buttons).
     *
     * @function
     * @param {Boolean} true to show, false to hide.
     * @returns {OpenSeadragon.Viewer} Chainable.
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
     * @param {Boolean} debugMode true to turn debug on, false to turn debug off.
     */
    setDebugMode: function(debugMode){

        for (let i = 0; i < this.world.getItemCount(); i++) {
            this.world.getItemAt(i).debugMode = debugMode;
        }

        this.debugMode = debugMode;
        this.forceRedraw();
    },

    /**
     * Update headers to include when making AJAX requests.
     *
     * Unless `propagate` is set to false (which is likely only useful in rare circumstances),
     * the updated headers are propagated to all tiled images, each of which will subsequently
     * propagate the changed headers to all their tiles.
     * If applicable, the headers of the viewer's navigator and reference strip will also be updated.
     *
     * Note that the rules for merging headers still apply, i.e. headers returned by
     * {@link OpenSeadragon.TileSource#getTileAjaxHeaders} take precedence over
     * `TiledImage.ajaxHeaders`, which take precedence over the headers here in the viewer.
     *
     * @function
     * @param {Object} ajaxHeaders Updated AJAX headers.
     * @param {Boolean} [propagate=true] Whether to propagate updated headers to tiled images, etc.
     */
    setAjaxHeaders: function(ajaxHeaders, propagate) {
        if (ajaxHeaders === null) {
            ajaxHeaders = {};
        }
        if (!$.isPlainObject(ajaxHeaders)) {
            $.console.error('[Viewer.setAjaxHeaders] Ignoring invalid headers, must be a plain object');
            return;
        }
        if (propagate === undefined) {
            propagate = true;
        }

        this.ajaxHeaders = ajaxHeaders;

        if (propagate) {
            for (let i = 0; i < this.world.getItemCount(); i++) {
                this.world.getItemAt(i)._updateAjaxHeaders(true);
            }

            if (this.navigator) {
                this.navigator.setAjaxHeaders(this.ajaxHeaders, true);
            }

            if (this.referenceStrip && this.referenceStrip.miniViewers) {
                for (const key in this.referenceStrip.miniViewers) {
                    this.referenceStrip.miniViewers[key].setAjaxHeaders(this.ajaxHeaders, true);
                }
            }
        }
    },

    /**
     * Adds the given button to this viewer.
     *
     * @function
     * @param {OpenSeadragon.Button} button
     */
    addButton: function( button ){
        this.buttonGroup.addButton(button);
    },

    /**
     * @function
     * @returns {Boolean}
     */
    isFullPage: function () {
        return THIS[this.hash] && THIS[ this.hash ].fullPage;
    },


    /**
     * Toggle full page mode.
     * @function
     * @param {Boolean} fullPage
     *      If true, enter full page mode.  If false, exit full page mode.
     * @returns {OpenSeadragon.Viewer} Chainable.
     * @fires OpenSeadragon.Viewer.event:pre-full-page
     * @fires OpenSeadragon.Viewer.event:full-page
     */
    setFullPage: function( fullPage ) {

        const body = document.body;
        const bodyStyle = body.style;
        const docStyle = document.documentElement.style;
        const _this = this;
        let nodes;

        //don't bother modifying the DOM if we are already in full page mode.
        if ( fullPage === this.isFullPage() ) {
            return this;
        }

        const fullPageEventArgs = {
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

        if ( fullPage && this.element ) {

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

            this.bodyDisplay = bodyStyle.display;
            bodyStyle.display = "block";

            //when entering full screen on the ipad it wasn't sufficient to
            //leave the body intact as only only the top half of the screen
            //would respond to touch events on the canvas, while the bottom half
            //treated them as touch events on the document body.  Thus we make
            //them invisible (display: none) and apply the older values when we
            //go out of full screen.
            this.previousDisplayValuesOfBodyChildren = [];
            THIS[ this.hash ].prevElementParent = this.element.parentNode;
            THIS[ this.hash ].prevNextSibling = this.element.nextSibling;
            THIS[ this.hash ].prevElementWidth = this.element.style.width;
            THIS[ this.hash ].prevElementHeight = this.element.style.height;
            nodes = body.children.length;
            for ( let i = 0; i < nodes; i++ ) {
                const element = body.children[i];
                if (element === this.element) {
                    // Do not hide ourselves...
                    continue;
                }
                this.previousDisplayValuesOfBodyChildren.push({
                    element,
                    display: element.style.display
                });
                element.style.display = 'none';
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

            this.element.style.height = '100vh';
            this.element.style.width = '100vw';

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

            bodyStyle.display = this.bodyDisplay;

            body.removeChild( this.element );
            nodes = this.previousDisplayValuesOfBodyChildren.length;
            for ( let i = 0; i < nodes; i++ ) {
                const { element, display } = this.previousDisplayValuesOfBodyChildren[i];
                element.style.display = display;
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
            let restoreScrollCounter = 0;
            const restoreScroll = function() {
                $.setPageScroll( _this.pageScroll );
                const pageScroll = $.getPageScroll();
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
            $.delegate( this, onContainerLeave )( { } );

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
     * @returns {OpenSeadragon.Viewer} Chainable.
     * @fires OpenSeadragon.Viewer.event:pre-full-screen
     * @fires OpenSeadragon.Viewer.event:full-screen
     */
    setFullScreen: function( fullScreen ) {
        const _this = this;

        if ( !$.supportsFullScreen ) {
            return this.setFullPage( fullScreen );
        }

        if ( $.isFullScreen() === fullScreen ) {
            return this;
        }

        const fullScreenEventArgs = {
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
        this.raiseEvent( 'pre-full-screen', fullScreenEventArgs );
        if ( fullScreenEventArgs.preventDefaultAction ) {
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

            const onFullScreenChange = function() {
                if (!THIS[ _this.hash ]) {
                    $.removeEvent( document, $.fullScreenEventName, onFullScreenChange );
                    $.removeEvent( document, $.fullScreenErrorEventName, onFullScreenChange );
                    return;
                }

                const isFullScreen = $.isFullScreen();
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
     * @returns {Boolean}
     */
    isVisible: function () {
        return this.container.style.visibility !== "hidden";
    },


    //
    /**
     * @function
     * @returns {Boolean} returns true if the viewer is in fullscreen
     */
     isFullScreen: function () {
        return $.isFullScreen() && this.isFullPage();
    },

    /**
     * @function
     * @param {Boolean} visible
     * @returns {OpenSeadragon.Viewer} Chainable.
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
     * @typedef OpenSeadragon.TileSourceSpecifier
     * @property {Object} options
     * @property {OpenSeadragon.TileSource|String|Object|Function} options.tileSource - The TileSource specifier.
     * A String implies a url used to determine the tileSource implementation
     *      based on the file extension of url. JSONP is implied by *.js,
     *      otherwise the url is retrieved as text and the resulting text is
     *      introspected to determine if its json, xml, or text and parsed.
     * An Object implies an inline configuration which has a single
     *      property sufficient for being able to determine tileSource
     *      implementation. If the object has a property which is a function
     *      named 'getTileUrl', it is treated as a custom TileSource.
     * @property {Number} [options.index] The index of the item. Added on top of
     * all other items if not specified.
     * @property {Boolean} [options.replace=false] If true, the item at options.index will be
     * removed and the new item is added in its place. options.tileSource will be
     * interpreted and fetched if necessary before the old item is removed to avoid leaving
     * a gap in the world.
     * @property {Number} [options.x=0] The X position for the image in viewport coordinates.
     * @property {Number} [options.y=0] The Y position for the image in viewport coordinates.
     * @property {Number} [options.width=1] The width for the image in viewport coordinates.
     * @property {Number} [options.height] The height for the image in viewport coordinates.
     * @property {OpenSeadragon.Rect} [options.fitBounds] The bounds in viewport coordinates
     * to fit the image into. If specified, x, y, width and height get ignored.
     * @property {OpenSeadragon.Placement} [options.fitBoundsPlacement=OpenSeadragon.Placement.CENTER]
     * How to anchor the image in the bounds if options.fitBounds is set.
     * @property {OpenSeadragon.Rect} [options.clip] - An area, in image pixels, to clip to
     * (portions of the image outside of this area will not be visible). Only works on
     * browsers that support the HTML5 canvas.
     * @property {Number} [options.opacity=1] Proportional opacity of the tiled images (1=opaque, 0=hidden)
     * @property {Boolean} [options.preload=false] Default switch for loading hidden images (true loads, false blocks)
     * @property {Boolean} [options.zombieCache] In the case that this method removes any TiledImage instance,
     *      allow the item-referenced cache to remain in memory even without active tiles. Default false.
     * @property {Number} [options.degrees=0] Initial rotation of the tiled image around
     * its top left corner in degrees.
     * @property {Boolean} [options.flipped=false] Whether to horizontally flip the image.
     * @property {String} [options.compositeOperation] How the image is composited onto other images.
     * @property {String} [options.crossOriginPolicy] The crossOriginPolicy for this specific image,
     * overriding viewer.crossOriginPolicy.
     * @property {Boolean} [options.ajaxWithCredentials] Whether to set withCredentials on tile AJAX
     * @property {Boolean} [options.loadTilesWithAjax]
     *      Whether to load tile data using AJAX requests.
     *      Defaults to the setting in {@link OpenSeadragon.Options}.
     * @property {Object} [options.ajaxHeaders]
     *      A set of headers to include when making tile AJAX requests.
     *      Note that these headers will be merged over any headers specified in {@link OpenSeadragon.Options}.
     *      Specifying a falsy value for a header will clear its existing value set at the Viewer level (if any).
     * @property {Function} [options.success] A function that gets called when the image is
     * successfully added. It's passed the event object which contains a single property:
     * "item", which is the resulting instance of TiledImage.
     * @property {Function} [options.error] A function that gets called if the image is
     * unable to be added. It's passed the error event object, which contains "message"
     * and "source" properties.
     * @property {Boolean} [options.collectionImmediately=false] If collectionMode is on,
     * specifies whether to snap to the new arrangement immediately or to animate to it.
     * @property {String|CanvasGradient|CanvasPattern|Function} [options.placeholderFillStyle] - See {@link OpenSeadragon.Options}.
     * @param {string|string[]} [options.originalDataType=undefined]
     *      A default format to convert tiles to at the beginning. The format is the base tile format,
     *      and this can optimize rendering or processing logics in case for example a plugin always requires a certain
     *      format to convert to.
     */

    /**
     * Add a tiled image to the viewer.
     * options.tileSource can be anything that {@link OpenSeadragon.Viewer#open}
     *  supports except arrays of images.
     * Note that you can specify options.width or options.height, but not both.
     * The other dimension will be calculated according to the item's aspect ratio.
     * If collectionMode is on (see {@link OpenSeadragon.Options}), the new image is
     * automatically arranged with the others.
     * @function
     * @param {OpenSeadragon.TileSourceSpecifier} options
     * @fires OpenSeadragon.World.event:add-item
     * @fires OpenSeadragon.Viewer.event:add-item-failed
     */
    addTiledImage: function( options ) {
        $.console.assert(options, "[Viewer.addTiledImage] options is required");
        $.console.assert(options.tileSource, "[Viewer.addTiledImage] options.tileSource is required");
        $.console.assert(!options.replace || (options.index > -1 && options.index < this.world.getItemCount()),
            "[Viewer.addTiledImage] if options.replace is used, options.index must be a valid index in Viewer.world");

        this._hideMessage();

        const originalSuccess = options.success;
        const originalError = options.error;
        if (options.replace) {
            options.replaceItem = this.world.getItemAt(options.index);
        }

        const myQueueItem = {
            options: options
        };

        this._loadQueue.push(myQueueItem);

        const refreshWorld = theItem => {
            if (this.collectionMode) {
                this.world.arrange({
                    immediately: theItem.options.collectionImmediately,
                    rows: this.collectionRows,
                    columns: this.collectionColumns,
                    layout: this.collectionLayout,
                    tileSize: this.collectionTileSize,
                    tileMargin: this.collectionTileMargin
                });
                this.world.setAutoRefigureSizes(true);
            }
        };

        const raiseAddItemFailed = ( event ) => {
            for (let i = 0; i < this._loadQueue.length; i++) {
                if (this._loadQueue[i] === myQueueItem) {
                    this._loadQueue.splice(i, 1);
                    break;
                }
            }

            if (this._loadQueue.length === 0) {
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
            this.raiseEvent( 'add-item-failed', event );

            if (originalError) {
                originalError(event);
            }
        };

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

        // ensure nobody provided such entry
        delete myQueueItem.tiledImage;
        options.success = event => {
            myQueueItem.tiledImage = event.item;
            myQueueItem.originalSuccess = originalSuccess;

            let queueItem, optionsClone;
            while (this._loadQueue.length) {
                queueItem = this._loadQueue[0];
                const tiledImage = queueItem.tiledImage;
                if (!tiledImage) {
                    break;
                }

                this._loadQueue.splice(0, 1);
                const tileSource = tiledImage.source;

                if (queueItem.options.replace) {
                    const replaced = queueItem.options.replaceItem;
                    const newIndex = this.world.getIndexOfItem(replaced);
                    if (newIndex !== -1) {
                        queueItem.options.index = newIndex;
                    }
                    if (!replaced._zombieCache && replaced.source.equals(tileSource)) {
                        replaced.allowZombieCache(true);
                    }
                    this.world.removeItem(replaced);
                }

                if (this.collectionMode) {
                    this.world.setAutoRefigureSizes(false);
                }

                if (this.navigator) {
                    optionsClone = $.extend({}, queueItem.options, {
                        replace: false, // navigator already removed the layer, nothing to replace
                        originalTiledImage: tiledImage,
                        tileSource: tileSource
                    });

                    this.navigator.addTiledImage(optionsClone);
                }

                this.world.addItem( tiledImage, {
                    index: queueItem.options.index
                });

                if (this._loadQueue.length === 0) {
                    //this restores the autoRefigureSizes flag to true.
                    refreshWorld(queueItem);
                }

                if (this.world.getItemCount() === 1 && !this.preserveViewport) {
                    this.viewport.goHome(true);
                }

                if (queueItem.originalSuccess) {
                    queueItem.originalSuccess(event);
                }

                // It might happen processReadyItems() is called after viewer.destroy()
                if (this.drawer) {
                    // This is necessary since drawer might react upon finalized tiled image, after
                    // all events have been processed.
                    this.drawer.tiledImageCreated(tiledImage);
                }
            }
        };
        options.error = raiseAddItemFailed;
        this.instantiateTiledImageClass(options);
    },

    /**
     * Create a TiledImage Instance. This instance is not integrated into the viewer
     * and can be used to for example draw custom data in offscreen fashion by instantiating
     * offscreen drawer, creating detached tiled images, forcing them to load certain region
     * and calling drawer.draw([my tiled images]).
     * @param {OpenSeadragon.TileSourceSpecifier} options options to create the image. Some properties
     *   are unused, these properties drive how the image is inserted into the world, and therefore
     *   they are not used in the pure creation of the TiledImage.
     * @return {OpenSeadragon.Promise<OpenSeadragon.TiledImage|object>} A promise that resolves to the created TiledImage.
     *   Also, old options.error and options.success callbacks can be used instead to handle the output.
     */
    instantiateTiledImageClass: function( options) {
        return this.instantiateTileSourceClass(options).then(event => {
            // add everybody at the front of the queue that's ready to go
            const tiledImage = new $.TiledImage({
                viewer: this,
                source: event.source,
                viewport: this.viewport,
                drawer: this.drawer,
                tileCache: this.tileCache,
                imageLoader: this.imageLoader,
                x: options.x,
                y: options.y,
                width: options.width,
                height: options.height,
                fitBounds: options.fitBounds,
                fitBoundsPlacement: options.fitBoundsPlacement,
                clip: options.clip,
                placeholderFillStyle: options.placeholderFillStyle,
                opacity: options.opacity,
                preload: options.preload,
                degrees: options.degrees,
                flipped: options.flipped,
                compositeOperation: options.compositeOperation,
                springStiffness: this.springStiffness,
                animationTime: this.animationTime,
                minZoomImageRatio: this.minZoomImageRatio,
                wrapHorizontal: this.wrapHorizontal,
                wrapVertical: this.wrapVertical,
                maxTilesPerFrame: this.maxTilesPerFrame,
                loadDestinationTilesOnAnimation: this.loadDestinationTilesOnAnimation,
                immediateRender: this.immediateRender,
                blendTime: this.blendTime,
                alwaysBlend: this.alwaysBlend,
                minPixelRatio: this.minPixelRatio,
                smoothTileEdgesMinZoom: this.smoothTileEdgesMinZoom,
                iOSDevice: this.iOSDevice,
                crossOriginPolicy: options.crossOriginPolicy,
                ajaxWithCredentials: options.ajaxWithCredentials,
                loadTilesWithAjax: options.loadTilesWithAjax,
                ajaxHeaders: options.ajaxHeaders,
                debugMode: this.debugMode,
                subPixelRoundingForTransparency: this.subPixelRoundingForTransparency,
                callTileLoadedWithCachedData: this.callTileLoadedWithCachedData,
                originalDataType: options.originalDataType
            });

            options.success({
                item: tiledImage
            });
            return tiledImage;
        }).catch(e => {
            if (options.error) {
                options.error(e);
                return e;
            }
            throw e;
        });
    },

    /**
     * Attempts to initialize a TileSource from various input types and configuration formats.
     * Handles string URLs, raw XML/JSON strings, inline configuration objects, or custom TileSource implementations.
     *
     * @function
     * @param {OpenSeadragon.TileSourceSpecifier} options options to create the image. Some properties
     * @return {OpenSeadragon.Promise<object>} A promise that resolves to info object carrying 'source' and 'message'.
     *   Message is provided only on error, in that case the source is reference to the original source parameter that
     *   was defining the TileSource. On success, the source is a TileSource instance.
     */
    instantiateTileSourceClass( options ) {
        return new $.Promise( ( resolve, reject ) => {
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
                options.crossOriginPolicy = options.tileSource.crossOriginPolicy !== undefined ?
                    options.tileSource.crossOriginPolicy : this.crossOriginPolicy;
            }
            if (options.ajaxWithCredentials === undefined) {
                options.ajaxWithCredentials = this.ajaxWithCredentials;
            }
            if (options.loadTilesWithAjax === undefined) {
                options.loadTilesWithAjax = this.loadTilesWithAjax;
            }
            if (!$.isPlainObject(options.ajaxHeaders)) {
                options.ajaxHeaders = {};
            }

            let tileSource = options.tileSource;

            //allow plain xml strings or json strings to be parsed here
            if ( $.type( tileSource ) === 'string' ) {
                //xml should start with "<" and end with ">"
                if ( tileSource.match( /^\s*<.*>\s*$/ ) ) {
                    tileSource = $.parseXml( tileSource );
                    //json should start with "{" or "[" and end with "}" or "]"
                } else if ( tileSource.match(/^\s*[{[].*[}\]]\s*$/ ) ) {
                    try {
                        tileSource = $.parseJSON(tileSource);
                    } catch (e) {
                        //tileSource = tileSource;
                    }
                }
            }

            function waitUntilReady(tileSource, originalTileSource) {
                if (tileSource.ready) {
                    resolve({
                        source: tileSource
                    });
                } else {
                    tileSource.addHandler('ready', function (event) {
                        resolve({
                            source: event.tileSource
                        });
                    });
                    tileSource.addHandler('open-failed', function (event) {
                        reject({
                            message: event.message,
                            source: originalTileSource
                        });
                    });
                }
            }

            setTimeout(() => {
                if ( $.type( tileSource ) === 'string' ) {
                    //If its still a string it means it must be a url at this point
                    tileSource = new $.TileSource({
                        url: tileSource,
                        crossOriginPolicy: options.crossOriginPolicy !== undefined ?
                            options.crossOriginPolicy : this.crossOriginPolicy,
                        ajaxWithCredentials: this.ajaxWithCredentials,
                        ajaxHeaders: $.extend({}, this.ajaxHeaders, options.ajaxHeaders),
                        splitHashDataForPost: this.splitHashDataForPost,
                    });
                    waitUntilReady(tileSource, tileSource);
                } else if ($.isPlainObject(tileSource) || tileSource.nodeType) {
                    if (tileSource.crossOriginPolicy === undefined &&
                        (options.crossOriginPolicy !== undefined || this.crossOriginPolicy !== undefined)) {
                        tileSource.crossOriginPolicy = options.crossOriginPolicy !== undefined ?
                            options.crossOriginPolicy : this.crossOriginPolicy;
                    }
                    if (tileSource.ajaxWithCredentials === undefined) {
                        tileSource.ajaxWithCredentials = this.ajaxWithCredentials;
                    }

                    if ( $.isFunction( tileSource.getTileUrl ) ) {
                        //Custom tile source
                        const customTileSource = new $.TileSource( tileSource );
                        customTileSource.getTileUrl = tileSource.getTileUrl;
                        tileSource.ready = false;
                        waitUntilReady(customTileSource, tileSource);
                    } else {
                        //inline configuration
                        const $TileSource = $.TileSource.determineType( this, tileSource, null );
                        if ( !$TileSource ) {
                            reject({
                                message: "Unable to load TileSource",
                                source: tileSource,
                                error: true
                            });
                            return;
                        }
                        const tileOptions = $TileSource.prototype.configure.apply( this, [ tileSource ] );
                        tileOptions.ready = false;
                        waitUntilReady(new $TileSource(tileOptions), tileSource);
                    }
                } else {
                    //can assume it's already a tile source implementation, force inheritance
                    waitUntilReady(tileSource, tileSource);
                }
            });
        });
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

        const opts = $.extend({}, options, {
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
        const _this = this;

        $.console.error( "[Viewer.addLayer] this function is deprecated; use Viewer.addTiledImage() instead." );

        const optionsClone = $.extend({}, options, {
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
     * Force the viewer to reset its size to match its container.
     */
    forceResize: function() {
        THIS[this.hash].needsResize = true;
        THIS[this.hash].forceResize = true;
    },

    /**
     * @function
     * @returns {OpenSeadragon.Viewer} Chainable.
     */
    bindSequenceControls: function(){

        //////////////////////////////////////////////////////////////////////////
        // Image Sequence Controls
        //////////////////////////////////////////////////////////////////////////
        const onFocusHandler          = $.delegate( this, onFocus );
        const onBlurHandler           = $.delegate( this, onBlur );
        const onNextHandler           = $.delegate( this, this.goToNextPage );
        const onPreviousHandler       = $.delegate( this, this.goToPreviousPage );
        const navImages               = this.navImages;
        let useGroup                  = true;

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
     * @returns {OpenSeadragon.Viewer} Chainable.
     */
    bindStandardControls: function(){
        //////////////////////////////////////////////////////////////////////////
        // Navigation Controls
        //////////////////////////////////////////////////////////////////////////
        const beginZoomingInHandler   = $.delegate( this, this.startZoomInAction );
        const endZoomingHandler       = $.delegate( this, this.endZoomAction );
        const doSingleZoomInHandler   = $.delegate( this, this.singleZoomInAction );
        const beginZoomingOutHandler  = $.delegate( this, this.startZoomOutAction );
        const doSingleZoomOutHandler  = $.delegate( this, this.singleZoomOutAction );
        const onHomeHandler           = $.delegate( this, onHome );
        const onFullScreenHandler     = $.delegate( this, onFullScreen );
        const onRotateLeftHandler     = $.delegate( this, onRotateLeft );
        const onRotateRightHandler    = $.delegate( this, onRotateRight );
        const onFlipHandler           = $.delegate( this, onFlip);
        const onFocusHandler          = $.delegate( this, onFocus );
        const onBlurHandler           = $.delegate( this, onBlur );
        const navImages               = this.navImages;
        const buttons                 = [];
        let useGroup                = true;


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
                this.buttonGroup = new $.ButtonGroup({
                    buttons:            buttons,
                    clickTimeThreshold: this.clickTimeThreshold,
                    clickDistThreshold: this.clickDistThreshold
                });

                this.navControl  = this.buttonGroup.element;
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
            } else {
                this.customButtons = buttons;
            }

        }
        return this;
    },

    /**
     * Gets the active page of a sequence
     * @function
     * @returns {Number}
     */
    currentPage: function() {
        return this._sequenceIndex;
    },

    /**
     * @function
     * @returns {OpenSeadragon.Viewer} Chainable.
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
     * interface. Unless the viewer has been configured with the preserveOverlays
     * option, overlays added via this method are removed when the viewport
     * is closed (including in sequence mode when changing page).
     * @method
     * @param {Element|String|Object} element - A reference to an element or an id for
     *      the element which will be overlaid. Or an Object specifying the configuration for the overlay.
     *      If using an object, see {@link OpenSeadragon.Overlay} for a list of
     *      all available options.
     * @param {OpenSeadragon.Point|OpenSeadragon.Rect} location - The point or
     *      rectangle which will be overlaid. This is a viewport relative location.
     * @param {OpenSeadragon.Placement} [placement=OpenSeadragon.Placement.TOP_LEFT] - The position of the
     *      viewport which the location coordinates will be treated as relative
     *      to.
     * @param {function} [onDraw] - If supplied the callback is called when the overlay
     *      needs to be drawn. It is the responsibility of the callback to do any drawing/positioning.
     *      It is passed position, size and element.
     * @returns {OpenSeadragon.Viewer} Chainable.
     * @fires OpenSeadragon.Viewer.event:add-overlay
     */
    addOverlay: function( element, location, placement, onDraw ) {
        let options;
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

        const overlay = getOverlayObject( this, options);
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
     * @param {OpenSeadragon.Placement} [placement=OpenSeadragon.Placement.TOP_LEFT] - The position of the
     *      viewport which the location coordinates will be treated as relative
     *      to.
     * @returns {OpenSeadragon.Viewer} Chainable.
     * @fires OpenSeadragon.Viewer.event:update-overlay
     */
    updateOverlay: function( element, location, placement ) {
        element = $.getElement( element );
        const i = getOverlayIndex( this.currentOverlays, element );

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
     * @returns {OpenSeadragon.Viewer} Chainable.
     * @fires OpenSeadragon.Viewer.event:remove-overlay
     */
    removeOverlay: function( element ) {
        element = $.getElement( element );
        const i = getOverlayIndex( this.currentOverlays, element );

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
     * @returns {OpenSeadragon.Viewer} Chainable.
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
     * @returns {OpenSeadragon.Overlay} the matching overlay or null if none found.
     */
    getOverlayById: function( element ) {
        element = $.getElement( element );
        const i = getOverlayIndex( this.currentOverlays, element );

        if (i >= 0) {
            return this.currentOverlays[i];
        } else {
            return null;
        }
    },

    /**
     * Register drawer for shared updates
     * @param drawer
     * @private
     */
    _registerDrawer: function (drawer) {
        if (!this._drawerList) {
            this._drawerList = [];
        }
        this._drawerList.push(drawer);
    },
    /**
     * Unregister drawer from shared updates
     * @param drawer
     * @private
     */
    _unregisterDrawer: function (drawer) {
        if (!this._drawerList) {
            $.console.warn('Viewer._unregisterDrawer: cannot unregister on viewer that is not meant to share updates.');
            return;
        }
        this._drawerList.splice(this._drawerList.indexOf(drawer), 1);
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

        const div = $.makeNeutralElement( "div" );
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
        const div = this.messageDiv;
        if (div) {
            div.parentNode.removeChild(div);
            delete this.messageDiv;
        }
    },

    /**
     * Gets this viewer's gesture settings for the given pointer device type.
     * @method
     * @param {String} type - The pointer device type to get the gesture settings for ("mouse", "touch", "pen", etc.).
     * @returns {OpenSeadragon.GestureSettings}
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
        const length = this.currentOverlays.length;
        for ( let i = 0; i < length; i++ ) {
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
    },

    /**
     * Adds _updatePixelDensityRatio to the window resize event.
     * @private
     */
    _addUpdatePixelDensityRatioEvent: function() {
        this._updatePixelDensityRatioBind = this._updatePixelDensityRatio.bind(this);
        $.addEvent( window, 'resize', this._updatePixelDensityRatioBind );
    },

    /**
     * Removes _updatePixelDensityRatio from the window resize event.
     * @private
     */
    _removeUpdatePixelDensityRatioEvent: function() {
        $.removeEvent( window, 'resize', this._updatePixelDensityRatioBind );
    },

    /**
     * Update pixel density ratio and forces a resize operation.
     * @private
     */
     _updatePixelDensityRatio: function() {
        const previusPixelDensityRatio = $.pixelDensityRatio;
        const currentPixelDensityRatio = $.getCurrentPixelDensityRatio();
        if (previusPixelDensityRatio !== currentPixelDensityRatio) {
            $.pixelDensityRatio = currentPixelDensityRatio;
            this.forceResize();
        }
    },

    /**
     * Sets the image source to the source with index equal to
     * currentIndex - 1. Changes current image in sequence mode.
     * If specified, wraps around (see navPrevNextWrap in
     * {@link OpenSeadragon.Options})
     *
     * @method
     */

    goToPreviousPage: function () {
        let previous = this._sequenceIndex - 1;
        if(this.navPrevNextWrap && previous < 0){
            previous += this.tileSources.length;
        }
        this.goToPage( previous );
    },

    /**
     * Sets the image source to the source with index equal to
     * currentIndex + 1. Changes current image in sequence mode.
     * If specified, wraps around (see navPrevNextWrap in
     * {@link OpenSeadragon.Options})
     *
     * @method
     */
    goToNextPage: function () {
        let next = this._sequenceIndex + 1;
        if(this.navPrevNextWrap && next >= this.tileSources.length){
            next = 0;
        }
        this.goToPage( next );
    },

    isAnimating: function () {
        return THIS[ this.hash ].animating;
    },

    /**
     * Starts continuous zoom-in animation (typically bound to mouse-down on the zoom-in button).
     * @function
     * @memberof OpenSeadragon.Viewer.prototype
     */
    startZoomInAction: function () {
        THIS[ this.hash ].lastZoomTime = $.now();
        THIS[ this.hash ].zoomFactor = this.zoomPerSecond;
        THIS[ this.hash ].zooming = true;
        scheduleZoom( this );
    },

    /**
     * Starts continuous zoom-out animation (typically bound to mouse-down on the zoom-out button).
     * @function
     * @memberof OpenSeadragon.Viewer.prototype
     */
    startZoomOutAction: function () {
        THIS[ this.hash ].lastZoomTime = $.now();
        THIS[ this.hash ].zoomFactor = 1.0 / this.zoomPerSecond;
        THIS[ this.hash ].zooming = true;
        scheduleZoom( this );
    },

    /**
     * Stops any continuous zoom animation (typically bound to mouse-up/leave events on a button).
     * @function
     * @memberof OpenSeadragon.Viewer.prototype
     */
    endZoomAction: function () {
        THIS[ this.hash ].zooming = false;
    },

    /**
     * Performs single-step zoom-in operation (typically bound to click/enter on the zoom-in button).
     * @function
     * @memberof OpenSeadragon.Viewer.prototype
     */
    singleZoomInAction: function () {
        if ( this.viewport ) {
            THIS[ this.hash ].zooming = false;
            this.viewport.zoomBy(
                this.zoomPerClick / 1.0
            );
            this.viewport.applyConstraints();
        }
    },

    /**
     * Performs single-step zoom-out operation (typically bound to click/enter on the zoom-out button).
     * @function
     * @memberof OpenSeadragon.Viewer.prototype
     */
    singleZoomOutAction: function () {
        if ( this.viewport ) {
            THIS[ this.hash ].zooming = false;
            this.viewport.zoomBy(
                1.0 / this.zoomPerClick
            );
            this.viewport.applyConstraints();
        }
    },
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

function getOverlayObject( viewer, overlay ) {
    if ( overlay instanceof $.Overlay ) {
        return overlay;
    }

    let element = null;
    if ( overlay.element ) {
        element = $.getElement( overlay.element );
    } else {
        const id = overlay.id ?
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

    let location = overlay.location;
    let width = overlay.width;
    let height = overlay.height;
    if (!location) {
        let x = overlay.x;
        let y = overlay.y;
        if (overlay.px !== undefined) {
            const rect = viewer.viewport.imageToViewportRectangle(new $.Rect(
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

    let placement = overlay.placement;
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
 * Determines the index of a specific overlay element within an array of overlays.
 *
 * @private
 * @inner
 * @param {Array<Object>} overlays - The array of overlay objects, each containing an `element` property.
 * @param {Element} element - The DOM element of the overlay to find.
 * @returns {number} The index of the matching overlay in the array, or -1 if not found.
 */
function getOverlayIndex( overlays, element ) {
    for ( let i = overlays.length - 1; i >= 0; i-- ) {
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
    if ( viewer.controlsShouldFade ) {
        let currentTime = $.now();
        let deltaTime = currentTime - viewer.controlsFadeBeginTime;
        let opacity = 1.0 - deltaTime / viewer.controlsFadeLength;

        opacity = Math.min( 1.0, opacity );
        opacity = Math.max( 0.0, opacity );

        for ( let i = viewer.controls.length - 1; i >= 0; i--) {
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
    viewer.controlsShouldFade = false;
    for ( let i = viewer.controls.length - 1; i >= 0; i-- ) {
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

function onCanvasContextMenu( event ) {
    const eventArgs = {
        tracker: event.eventSource,
        position: event.position,
        originalEvent: event.originalEvent,
        preventDefault: event.preventDefault
    };

    /**
     * Raised when a contextmenu event occurs in the {@link OpenSeadragon.Viewer#canvas} element.
     *
     * @event canvas-contextmenu
     * @memberof OpenSeadragon.Viewer
     * @type {object}
     * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised this event.
     * @property {OpenSeadragon.MouseTracker} tracker - A reference to the MouseTracker which originated this event.
     * @property {OpenSeadragon.Point} position - The position of the event relative to the tracked element.
     * @property {Object} originalEvent - The original DOM event.
     * @property {Boolean} preventDefault - Set to true to prevent the default user-agent's handling of the contextmenu event.
     * @property {?Object} userData - Arbitrary subscriber-defined object.
     */
    this.raiseEvent( 'canvas-contextmenu', eventArgs );

    event.preventDefault = eventArgs.preventDefault;
}

/**
 * Maps keyboard events to corresponding navigation actions,
 * accounting for Shift modifier state.
 *
 * @private
 * @param {Object} event - Keyboard event object
 * Returns string Navigation action name (e.g. 'panUp') or null if unmapped
 *
 * Handles:
 * - Arrow/WASD keys with Shift for zoom
 * - Arrow/WASD keys without Shift for panning
 * - Equal(=)/Minus(-) keys for zoom
 */
function getActiveActionFromKey(code, shift) {
    switch (code) {
        case 'ArrowUp':
        case 'KeyW':
            return shift ? 'zoomIn' : 'panUp';
        case 'ArrowDown':
        case 'KeyS':
            return shift ? 'zoomOut' : 'panDown';
        case 'ArrowLeft':
        case 'KeyA':
            return 'panLeft';
        case 'ArrowRight':
        case 'KeyD':
            return 'panRight';
        case 'Equal':
            return 'zoomIn';
        case 'Minus':
            return 'zoomOut';
        default:
            return null;
    }
}

/**
 * Handles the keyup event on the viewer's canvas element.
 *
 * @private
 * For the released key, marks both the shifted and non-shifted navigation actions as inactive in the _activeActions object.
 * If either action is released before reaching the minimum frame threshold, sets that action as "virtually held" in _navActionVirtuallyHeld,
 * ensuring smooth completion of the minimum pan or zoom distance regardless of modifier key release order.
 */
function onCanvasKeyUp(event) {

    // Using arrow function to inherit 'this' from parent scope
    const processCombo = (code, shift) => {
        const action = getActiveActionFromKey(code, shift);

        if (action && this._activeActions[action]) {
            this._activeActions[action] = false;
            // If the action was released before the minimum frame threshold,
            // keep it "virtually held" for smoothness
            if (this._navActionFrames[action] < this._minNavActionFrames) {
                this._navActionVirtuallyHeld[action] = true;
            }
        }
    };

    // We don't know if the shift key was held down originally, so we check them both.
    // Clear both possible actions for this key
    const code = event.originalEvent.code;
    processCombo(code, true);
    processCombo(code, false);
}


function onCanvasKeyDown( event ) {

    const canvasKeyDownEventArgs = {
      originalEvent: event.originalEvent,
      preventDefaultAction: !this.keyboardNavEnabled,
      preventVerticalPan: event.preventVerticalPan || !this.panVertical,
      preventHorizontalPan: event.preventHorizontalPan || !this.panHorizontal
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

        const code = event.originalEvent.code;
        const shift = event.shift;
        const action = getActiveActionFromKey(code, shift);

        if (action && !this._activeActions[action]) {
            this._activeActions[action] = true; // Mark this action as held down in the viewer's internal tracking object
            this._navActionFrames[action] = 0; // Reset action frames
            event.preventDefault = true; // prevent browser scroll/zoom, etc
            return;
        }

        switch( event.keyCode ){
            case 48://0|)
                this.viewport.goHome();
                this.viewport.applyConstraints();
                event.preventDefault = true;
                break;
            case 82: //r - clockwise rotation/R - counterclockwise rotation
                if(event.shift){
                    if(this.viewport.flipped){
                        this.viewport.setRotation(this.viewport.getRotation() + this.rotationIncrement);
                    } else{
                        this.viewport.setRotation(this.viewport.getRotation() - this.rotationIncrement);
                    }
                }else{
                    if(this.viewport.flipped){
                        this.viewport.setRotation(this.viewport.getRotation() - this.rotationIncrement);
                    } else{
                        this.viewport.setRotation(this.viewport.getRotation() + this.rotationIncrement);
                    }
                }
                this.viewport.applyConstraints();
                event.preventDefault = true;
                break;
            case 70: //f/F
                this.viewport.toggleFlip();
                event.preventDefault = true;
                break;
            case 74: //j - previous image source
                this.goToPreviousPage();
                break;
            case 75: //k - next image source
                this.goToNextPage();
                break;
            default:
                //console.log( 'navigator keycode %s', event.keyCode );
                event.preventDefault = false;
                break;
        }
    } else {
        event.preventDefault = false;
    }
}

function onCanvasKeyPress( event ) {
    const canvasKeyPressEventArgs = {
      originalEvent: event.originalEvent,
    };

    /**
     * Raised when a keyboard key is pressed and the focus is on the {@link OpenSeadragon.Viewer#canvas} element.
     *
     * @event canvas-key-press
     * @memberof OpenSeadragon.Viewer
     * @type {object}
     * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised this event.
     * @property {Object} originalEvent - The original DOM event.
     * @property {?Object} userData - Arbitrary subscriber-defined object.
     */

    this.raiseEvent('canvas-key-press', canvasKeyPressEventArgs);
}

function onCanvasClick( event ) {
    let gestureSettings;

    const haveKeyboardFocus = document.activeElement === this.canvas;

    // If we don't have keyboard focus, request it.
    if ( !haveKeyboardFocus ) {
        this.canvas.focus();
    }
    if(this.viewport.flipped){
        event.position.x = this.viewport.getContainerSize().x - event.position.x;
    }

    const canvasClickEventArgs = {
        tracker: event.eventSource,
        position: event.position,
        quick: event.quick,
        shift: event.shift,
        originalEvent: event.originalEvent,
        originalTarget: event.originalTarget,
        preventDefaultAction: false
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
     * @property {Element} originalTarget - The DOM element clicked on.
     * @property {Boolean} preventDefaultAction - Set to true to prevent default click to zoom behaviour. Default: false.
     * @property {?Object} userData - Arbitrary subscriber-defined object.
     */

    this.raiseEvent( 'canvas-click', canvasClickEventArgs);


    if ( !canvasClickEventArgs.preventDefaultAction && this.viewport && event.quick ) {
        gestureSettings = this.gestureSettingsByDeviceType( event.pointerType );

        if (gestureSettings.clickToZoom === true){
            this.viewport.zoomBy(
                event.shift ? 1.0 / this.zoomPerClick : this.zoomPerClick,
                gestureSettings.zoomToRefPoint ? this.viewport.pointFromPixel( event.position, true ) : null
            );
            this.viewport.applyConstraints();
        }

        if( gestureSettings.dblClickDragToZoom){
            if(THIS[ this.hash ].draggingToZoom === true){
                THIS[ this.hash ].lastClickTime = null;
                THIS[ this.hash ].draggingToZoom = false;
            }
            else{
                THIS[ this.hash ].lastClickTime = $.now();
            }
        }

    }
}

function onCanvasDblClick( event ) {
    let gestureSettings;

    const canvasDblClickEventArgs = {
        tracker: event.eventSource,
        position: event.position,
        shift: event.shift,
        originalEvent: event.originalEvent,
        preventDefaultAction: false
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
    let gestureSettings;

    const canvasDragEventArgs = {
        tracker: event.eventSource,
        pointerType: event.pointerType,
        position: event.position,
        delta: event.delta,
        speed: event.speed,
        direction: event.direction,
        shift: event.shift,
        originalEvent: event.originalEvent,
        preventDefaultAction: false
    };

    /**
     * Raised when a mouse or touch drag operation occurs on the {@link OpenSeadragon.Viewer#canvas} element.
     *
     * @event canvas-drag
     * @memberof OpenSeadragon.Viewer
     * @type {object}
     * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised this event.
     * @property {OpenSeadragon.MouseTracker} tracker - A reference to the MouseTracker which originated this event.
     * @property {String} pointerType - "mouse", "touch", "pen", etc.
     * @property {OpenSeadragon.Point} position - The position of the event relative to the tracked element.
     * @property {OpenSeadragon.Point} delta - The x,y components of the difference between start drag and end drag.
     * @property {Number} speed - Current computed speed, in pixels per second.
     * @property {Number} direction - Current computed direction, expressed as an angle counterclockwise relative to the positive X axis (-pi to pi, in radians). Only valid if speed > 0.
     * @property {Boolean} shift - True if the shift key was pressed during this event.
     * @property {Object} originalEvent - The original DOM event.
     * @property {Boolean} preventDefaultAction - Set to true to prevent default drag to pan behaviour. Default: false.
     * @property {?Object} userData - Arbitrary subscriber-defined object.
     */
    this.raiseEvent( 'canvas-drag', canvasDragEventArgs);

    gestureSettings = this.gestureSettingsByDeviceType( event.pointerType );

    if(!canvasDragEventArgs.preventDefaultAction && this.viewport){

        if (gestureSettings.dblClickDragToZoom && THIS[ this.hash ].draggingToZoom){
            const factor = Math.pow( this.zoomPerDblClickDrag, event.delta.y / 50);
            this.viewport.zoomBy(factor);
        }
        else if (gestureSettings.dragToPan && !THIS[ this.hash ].draggingToZoom) {
            if( !this.panHorizontal ){
                event.delta.x = 0;
            }
            if( !this.panVertical ){
                event.delta.y = 0;
            }
            if(this.viewport.flipped){
                event.delta.x = -event.delta.x;
            }

            if( this.constrainDuringPan ){
                const delta = this.viewport.deltaPointsFromPixels( event.delta.negate() );

                this.viewport.centerSpringX.target.value += delta.x;
                this.viewport.centerSpringY.target.value += delta.y;

                const constrainedBounds = this.viewport.getConstrainedBounds();

                this.viewport.centerSpringX.target.value -= delta.x;
                this.viewport.centerSpringY.target.value -= delta.y;

                if (constrainedBounds.xConstrained) {
                    event.delta.x = 0;
                }

                if (constrainedBounds.yConstrained) {
                    event.delta.y = 0;
                }
            }
            this.viewport.panBy( this.viewport.deltaPointsFromPixels( event.delta.negate() ), gestureSettings.flickEnabled && !this.constrainDuringPan);
        }

    }

}

function onCanvasDragEnd( event ) {
    let gestureSettings;
    const canvasDragEndEventArgs = {
        tracker: event.eventSource,
        pointerType: event.pointerType,
        position: event.position,
        speed: event.speed,
        direction: event.direction,
        shift: event.shift,
        originalEvent: event.originalEvent,
        preventDefaultAction: false
    };

    /**
     * Raised when a mouse or touch drag operation ends on the {@link OpenSeadragon.Viewer#canvas} element.
     *
     * @event canvas-drag-end
     * @memberof OpenSeadragon.Viewer
     * @type {object}
     * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised this event.
     * @property {OpenSeadragon.MouseTracker} tracker - A reference to the MouseTracker which originated this event.
     * @property {String} pointerType - "mouse", "touch", "pen", etc.
     * @property {OpenSeadragon.Point} position - The position of the event relative to the tracked element.
     * @property {Number} speed - Speed at the end of a drag gesture, in pixels per second.
     * @property {Number} direction - Direction at the end of a drag gesture, expressed as an angle counterclockwise relative to the positive X axis (-pi to pi, in radians). Only valid if speed > 0.
     * @property {Boolean} shift - True if the shift key was pressed during this event.
     * @property {Object} originalEvent - The original DOM event.
     * @property {Boolean} preventDefaultAction - Set to true to prevent default drag-end flick behaviour. Default: false.
     * @property {?Object} userData - Arbitrary subscriber-defined object.
     */
     this.raiseEvent('canvas-drag-end', canvasDragEndEventArgs);

    gestureSettings = this.gestureSettingsByDeviceType( event.pointerType );

    if (!canvasDragEndEventArgs.preventDefaultAction && this.viewport) {
        if ( !THIS[ this.hash ].draggingToZoom &&
            gestureSettings.dragToPan &&
            gestureSettings.flickEnabled &&
            event.speed >= gestureSettings.flickMinSpeed) {
            let amplitudeX = 0;
            if (this.panHorizontal) {
                amplitudeX = gestureSettings.flickMomentum * event.speed *
                    Math.cos(event.direction);
            }
            let amplitudeY = 0;
            if (this.panVertical) {
                amplitudeY = gestureSettings.flickMomentum * event.speed *
                    Math.sin(event.direction);
            }
            const center = this.viewport.pixelFromPoint(
                this.viewport.getCenter(true));
            const target = this.viewport.pointFromPixel(
                new $.Point(center.x - amplitudeX, center.y - amplitudeY));
            this.viewport.panTo(target, false);
        }
        this.viewport.applyConstraints();
    }


    if( gestureSettings.dblClickDragToZoom && THIS[ this.hash ].draggingToZoom === true ){
        THIS[ this.hash ].draggingToZoom = false;
    }


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

function onCanvasLeave( event ) {
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


    const gestureSettings = this.gestureSettingsByDeviceType( event.pointerType );
    if ( gestureSettings.dblClickDragToZoom ){
         const lastClickTime = THIS[ this.hash ].lastClickTime;
         const currClickTime = $.now();

        if ( lastClickTime === null) {
            return;
        }

        if ((currClickTime - lastClickTime) < this.dblClickTimeThreshold) {
            THIS[ this.hash ].draggingToZoom = true;
        }

        THIS[ this.hash ].lastClickTime = null;
    }

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
    let centerPt;
    let lastCenterPt;
    let panByPt;

    const canvasPinchEventArgs = {
        tracker: event.eventSource,
        pointerType: event.pointerType,
        gesturePoints: event.gesturePoints,
        lastCenter: event.lastCenter,
        center: event.center,
        lastDistance: event.lastDistance,
        distance: event.distance,
        shift: event.shift,
        originalEvent: event.originalEvent,
        preventDefaultPanAction: false,
        preventDefaultZoomAction: false,
        preventDefaultRotateAction: false
    };

    /**
     * Raised when a pinch event occurs on the {@link OpenSeadragon.Viewer#canvas} element.
     *
     * @event canvas-pinch
     * @memberof OpenSeadragon.Viewer
     * @type {object}
     * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised this event.
     * @property {OpenSeadragon.MouseTracker} tracker - A reference to the MouseTracker which originated this event.
     * @property {String} pointerType - "mouse", "touch", "pen", etc.
     * @property {Array.<OpenSeadragon.MouseTracker.GesturePoint>} gesturePoints - Gesture points associated with the gesture. Velocity data can be found here.
     * @property {OpenSeadragon.Point} lastCenter - The previous center point of the two pinch contact points relative to the tracked element.
     * @property {OpenSeadragon.Point} center - The center point of the two pinch contact points relative to the tracked element.
     * @property {Number} lastDistance - The previous distance between the two pinch contact points in CSS pixels.
     * @property {Number} distance - The distance between the two pinch contact points in CSS pixels.
     * @property {Boolean} shift - True if the shift key was pressed during this event.
     * @property {Object} originalEvent - The original DOM event.
     * @property {Boolean} preventDefaultPanAction - Set to true to prevent default pinch to pan behaviour. Default: false.
     * @property {Boolean} preventDefaultZoomAction - Set to true to prevent default pinch to zoom behaviour. Default: false.
     * @property {Boolean} preventDefaultRotateAction - Set to true to prevent default pinch to rotate behaviour. Default: false.
     * @property {?Object} userData - Arbitrary subscriber-defined object.
     */
     this.raiseEvent('canvas-pinch', canvasPinchEventArgs);

    if ( this.viewport ) {
        let gestureSettings = this.gestureSettingsByDeviceType( event.pointerType );
        if ( gestureSettings.pinchToZoom &&
                    (!canvasPinchEventArgs.preventDefaultPanAction || !canvasPinchEventArgs.preventDefaultZoomAction) ) {
            centerPt = this.viewport.pointFromPixel( event.center, true );
            if ( gestureSettings.zoomToRefPoint && !canvasPinchEventArgs.preventDefaultPanAction ) {
                lastCenterPt = this.viewport.pointFromPixel( event.lastCenter, true );
                panByPt = lastCenterPt.minus( centerPt );
                if( !this.panHorizontal ) {
                    panByPt.x = 0;
                }
                if( !this.panVertical ) {
                    panByPt.y = 0;
                }
                this.viewport.panBy(panByPt, true);
            }
            if ( !canvasPinchEventArgs.preventDefaultZoomAction ) {
                this.viewport.zoomBy( event.distance / event.lastDistance, centerPt, true );
            }
            this.viewport.applyConstraints();
        }
        if ( gestureSettings.pinchRotate && !canvasPinchEventArgs.preventDefaultRotateAction ) {
            // Pinch rotate
            const angle1 = Math.atan2(event.gesturePoints[0].currentPos.y - event.gesturePoints[1].currentPos.y,
                event.gesturePoints[0].currentPos.x - event.gesturePoints[1].currentPos.x);
            const angle2 = Math.atan2(event.gesturePoints[0].lastPos.y - event.gesturePoints[1].lastPos.y,
                event.gesturePoints[0].lastPos.x - event.gesturePoints[1].lastPos.x);
            centerPt = this.viewport.pointFromPixel( event.center, true );
            this.viewport.rotateTo(this.viewport.getRotation(true) + ((angle1 - angle2) * (180 / Math.PI)), centerPt, true);
        }
    }
}

function onCanvasFocus( event ) {

    /**
     * Raised when the {@link OpenSeadragon.Viewer#canvas} element gets keyboard focus.
     *
     * @event canvas-focus
     * @memberof OpenSeadragon.Viewer
     * @type {object}
     * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised this event.
     * @property {OpenSeadragon.MouseTracker} tracker - A reference to the MouseTracker which originated this event.
     * @property {Object} originalEvent - The original DOM event.
     * @property {?Object} userData - Arbitrary subscriber-defined object.
     */
    this.raiseEvent( 'canvas-focus', {
        tracker: event.eventSource,
        originalEvent: event.originalEvent
    });
}

function onCanvasBlur( event ) {

    // When canvas loses focus, clear all navigation key states.
    for (const action in this._activeActions) {
        this._activeActions[action] = false;
    }
    for (const action in this._navActionVirtuallyHeld) {
        this._navActionVirtuallyHeld[action] = false;
    }

    /**
     * Raised when the {@link OpenSeadragon.Viewer#canvas} element loses keyboard focus.
     *
     * @event canvas-blur
     * @memberof OpenSeadragon.Viewer
     * @type {object}
     * @property {OpenSeadragon.Viewer} eventSource - A reference to the Viewer which raised this event.
     * @property {OpenSeadragon.MouseTracker} tracker - A reference to the MouseTracker which originated this event.
     * @property {Object} originalEvent - The original DOM event.
     * @property {?Object} userData - Arbitrary subscriber-defined object.
     */
    this.raiseEvent( 'canvas-blur', {
        tracker: event.eventSource,
        originalEvent: event.originalEvent
    });
}

function onCanvasScroll( event ) {
    let canvasScrollEventArgs;
    let gestureSettings;
    let factor;

    /* Certain scroll devices fire the scroll event way too fast so we are injecting a simple adjustment to keep things
     * partially normalized. If we have already fired an event within the last 'minScrollDelta' milliseconds we skip
     * this one and wait for the next event. */
    const thisScrollTime = $.now();
    const deltaScrollTime = thisScrollTime - this._lastScrollTime;
    if (deltaScrollTime > this.minScrollDeltaTime) {
        this._lastScrollTime = thisScrollTime;

        canvasScrollEventArgs = {
            tracker: event.eventSource,
            position: event.position,
            scroll: event.scroll,
            shift: event.shift,
            originalEvent: event.originalEvent,
            preventDefaultAction: false,
            preventDefault: true
        };

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
         * @property {Boolean} preventDefaultAction - Set to true to prevent default scroll to zoom behaviour. Default: false.
         * @property {Boolean} preventDefault - Set to true to prevent the default user-agent's handling of the wheel event. Default: true.
         * @property {?Object} userData - Arbitrary subscriber-defined object.
         */
         this.raiseEvent('canvas-scroll', canvasScrollEventArgs );

        if ( !canvasScrollEventArgs.preventDefaultAction && this.viewport ) {
            if(this.viewport.flipped){
                event.position.x = this.viewport.getContainerSize().x - event.position.x;
            }

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

        event.preventDefault = canvasScrollEventArgs.preventDefault;
    } else {
        event.preventDefault = true;
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
     * @property {String} pointerType - "mouse", "touch", "pen", etc.
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
        pointerType: event.pointerType,
        position: event.position,
        buttons: event.buttons,
        pointers: event.pointers,
        insideElementPressed: event.insideElementPressed,
        buttonDownAny: event.buttonDownAny,
        originalEvent: event.originalEvent
    });
}

function onContainerLeave( event ) {
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
     * @property {String} pointerType - "mouse", "touch", "pen", etc.
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
        pointerType: event.pointerType,
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

function doViewerResize(viewer, containerSize){
    const viewport = viewer.viewport;
    const zoom = viewport.getZoom();
    const center = viewport.getCenter();
    viewport.resize(containerSize, viewer.preserveImageSizeOnResize);
    viewport.panTo(center, true);
    let resizeRatio;
    if (viewer.preserveImageSizeOnResize) {
        resizeRatio = THIS[viewer.hash].prevContainerSize.x / containerSize.x;
    } else {
        const origin = new $.Point(0, 0);
        const prevDiag = new $.Point(THIS[viewer.hash].prevContainerSize.x, THIS[viewer.hash].prevContainerSize.y).distanceTo(origin);
        const newDiag = new $.Point(containerSize.x, containerSize.y).distanceTo(origin);
        resizeRatio = newDiag / prevDiag * THIS[viewer.hash].prevContainerSize.x / containerSize.x;
    }
    viewport.zoomTo(zoom * resizeRatio, null, true);
    THIS[viewer.hash].prevContainerSize = containerSize;
    THIS[viewer.hash].forceRedraw = true;
    THIS[viewer.hash].needsResize = false;
    THIS[viewer.hash].forceResize = false;
}

function handleNavKeys(viewer) {
    // Iterate over all navigation actions.
    for (const action in viewer._activeActions) {
        if (viewer._activeActions[action] || viewer._navActionVirtuallyHeld[action]) {
            viewer._navActionFrames[action]++;
            if (viewer._navActionFrames[action] >= viewer._minNavActionFrames) {
                viewer._navActionVirtuallyHeld[action] = false;
            }
        }
    }

    // Helper for action state
    function isDown(action) {
        return viewer._activeActions[action] || viewer._navActionVirtuallyHeld[action];
    }

    // Use the viewer's configured pan amount
    const pixels = viewer.pixelsPerArrowPress / 10;
    const panDelta = viewer.viewport.deltaPointsFromPixels(new OpenSeadragon.Point(pixels, pixels));

    // 1. Zoom actions (priority: zoom disables pan)
    if (isDown('zoomIn')) {
        viewer.viewport.zoomBy(1.01, null, true);
        viewer.viewport.applyConstraints();
        return;
    }
    if (isDown('zoomOut')) {
        viewer.viewport.zoomBy(0.99, null, true);
        viewer.viewport.applyConstraints();
        return;
    }

    // 2. Pan actions
    let dx = 0;
    let dy = 0;

    if (!viewer.preventVerticalPan) {
        if (isDown('panUp')) {
            dy -= panDelta.y;
        }
        if (isDown('panDown')) {
            dy += panDelta.y;
        }
    }

    if (!viewer.preventHorizontalPan) {
        if (isDown('panLeft')) {
            dx -= panDelta.x;
        }
        if (isDown('panRight')) {
            dx += panDelta.x;
        }
    }

    if (dx !== 0 || dy !== 0) {
        viewer.viewport.panBy(new OpenSeadragon.Point(dx, dy), true);
        viewer.viewport.applyConstraints();
    }
}

function updateOnce( viewer ) {

    handleNavKeys(viewer);

    //viewer.profiler.beginUpdate();

    if (viewer._opening || !THIS[viewer.hash]) {
        return;
    }

    let viewerWasResized = false;
    if (viewer.autoResize || THIS[viewer.hash].forceResize){
        let containerSize;
        if(viewer._autoResizePolling){
            containerSize = _getSafeElemSize(viewer.container);
            const prevContainerSize = THIS[viewer.hash].prevContainerSize;
            if (!containerSize.equals(prevContainerSize)) {
                THIS[viewer.hash].needsResize = true;
            }
        }
        if(THIS[viewer.hash].needsResize){
            doViewerResize(viewer, containerSize || _getSafeElemSize(viewer.container));
            viewerWasResized = true;
        }

    }



    const viewportChange = viewer.viewport.update() || viewerWasResized;
    let animated = viewer.world.update(viewportChange) || viewportChange;

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

    const currentAnimating = THIS[ viewer.hash ].animating;

    if ( !currentAnimating && animated ) {
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

    const isAnimationFinished = currentAnimating && !animated;

    if ( isAnimationFinished ) {
        THIS[ viewer.hash ].animating = false;
    }

    if ( animated || isAnimationFinished || THIS[ viewer.hash ].forceRedraw || viewer.world.needsDraw() ) {
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

    if ( isAnimationFinished ) {
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

function drawWorld( viewer ) {
    viewer.imageLoader.clear();
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


function scheduleZoom( viewer ) {
    $.requestAnimationFrame( $.delegate( viewer, doZoom ) );
}


function doZoom() {
    if ( THIS[ this.hash ].zooming && this.viewport) {
        const currentTime     = $.now();
        const deltaTime       = currentTime - THIS[ this.hash ].lastZoomTime;
        const adjustedFactor  = Math.pow( THIS[ this.hash ].zoomFactor, deltaTime / 1000 );

        this.viewport.zoomBy( adjustedFactor );
        this.viewport.applyConstraints();
        THIS[ this.hash ].lastZoomTime = currentTime;
        scheduleZoom( this );
    }
}


function lightUp() {
    if (this.buttonGroup) {
        this.buttonGroup.emulateEnter();
        this.buttonGroup.emulateLeave();
    }
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
    if ( this.buttonGroup ) {
        this.buttonGroup.emulateLeave();
    }
    this.fullPageButton.element.focus();
    if ( this.viewport ) {
        this.viewport.applyConstraints();
    }
}

function onRotateLeft() {
    if ( this.viewport ) {
        let currRotation = this.viewport.getRotation();

        if ( this.viewport.flipped ){
          currRotation += this.rotationIncrement;
        } else {
          currRotation -= this.rotationIncrement;
        }
        this.viewport.setRotation(currRotation);
    }
}

function onRotateRight() {
    if ( this.viewport ) {
        let currRotation = this.viewport.getRotation();

        if ( this.viewport.flipped ){
          currRotation -= this.rotationIncrement;
        } else {
          currRotation += this.rotationIncrement;
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

/**
 * Return the drawer type string for a candidate (string or DrawerBase constructor).
 * Used to normalize drawerCandidates to strings so includes('canvas') is reliable.
 * @private
 * @param {string|Function} candidate - Drawer type string or constructor
 * @returns {string|undefined} Type string, or undefined if not resolvable
 */
function getDrawerTypeString(candidate) {
    if (typeof candidate === 'string') {
        return candidate;
    }
    const proto = candidate && candidate.prototype;
    if (proto && proto instanceof OpenSeadragon.DrawerBase && $.isFunction(proto.getType)) {
        return proto.getType.call(candidate);
    }
    return undefined;
}

/**
 * Return the list of drawer type strings that 'auto' expands to (platform-dependent).
 * Uses the same detection as determineDrawer('auto'): on iOS-like devices, ['canvas'] only;
 * on all other platforms, ['webgl', 'canvas'] so webgl is tried first and canvas next if WebGL fails.
 * @private
 * @returns {string[]}
 */
function getAutoDrawerCandidates() {
    // Our WebGL drawer is not as performant on iOS at the moment, so we use canvas there.
    // Note that modern iPads report themselves as Mac, so we also check for coarse pointer.
    const isPrimaryTouch = window.matchMedia('(pointer: coarse)').matches;
    const isIOSDevice = /iPad|iPhone|iPod|Mac/.test(navigator.userAgent) && isPrimaryTouch;
    return isIOSDevice ? ['canvas'] : ['webgl', 'canvas'];
}

/**
 * Find drawer
 */
$.determineDrawer = function( id ){
    if (id === 'auto') {
        // Same platform detection as getAutoDrawerCandidates(); first entry is the preferred drawer type.
        id = getAutoDrawerCandidates()[0];
    }

    for (const property in OpenSeadragon) {
        const drawer = OpenSeadragon[ property ];
        const proto = drawer.prototype;
        if( proto &&
            proto instanceof OpenSeadragon.DrawerBase &&
            $.isFunction( proto.getType ) &&
            proto.getType.call( drawer ) === id
        ){
            return drawer;
        }
    }
    return null;
};

}( OpenSeadragon ));
