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
        "lastOpenStartTime": 0,
        "lastOpenEndTime":   0,
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
        "sequence":          0
    };

    //Inherit some behaviors and properties
    $.EventHandler.call( this );
    $.ControlDock.call( this, options );

    //Deal with tile sources
    var initialTileSource,
        customTileSource;

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

        this.openTileSource( initialTileSource );
    }

    this.element        = this.element || document.getElementById( this.id );
    this.canvas         = $.makeNeutralElement( "div" );

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
        container.overflow  = "hidden";
        container.left      = "0px";
        container.top       = "0px";
        container.textAlign = "left";  // needed to protect against
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
            this.customControls[ i ].anchor
        );
    }

    window.setTimeout( function(){
        beginControlsAutoHide( _this );
    }, 1 );    // initial fade out

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
     * If the string is xml is simply parsed and opened, otherwise the string 
     * is treated as an URL and an xml document is requested via ajax, parsed 
     * and then opened in the viewer.
     * @function
     * @name OpenSeadragon.Viewer.prototype.openDzi
     * @param {String} dzi and xml string or the url to a DZI xml document.
     * @return {OpenSeadragon.Viewer} Chainable.
     *
     * @deprecated - use 'open' instead.
     */
    openDzi: function ( dzi ) {
        var _this = this;
        $.createFromDZI(
            dzi,
            function( source ){
               _this.open( source );
            },
            this.tileHost
        );
        return this;
    },

    /**
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
     * @name OpenSeadragon.Viewer.prototype.openTileSource
     * @return {OpenSeadragon.Viewer} Chainable.
     */
    openTileSource: function ( tileSource ) {
        var _this = this,
            customTileSource,
            readySource,
            $TileSource,
            options;

        setTimeout(function(){
            if ( $.type( tileSource ) == 'string') {
                //TODO: We cant assume a string implies a dzi since all 
                //complete TileSource implementations should have a getInfo
                //which allows them to be configured via AJAX.  Im not sure
                //if its better to use file extension or url pattern, or to 
                //inspect the resulting info object.
                tileSource = new $.TileSource( tileSource, function( readySource ){
                    _this.open( readySource );
                });

            } else if ( $.isPlainObject( tileSource ) ){
                if( $.isFunction( tileSource.getTileUrl ) ){
                    //Custom tile source
                    customTileSource = new $.TileSource(tileSource);
                    customTileSource.getTileUrl = tileSource.getTileUrl;
                    _this.open( customTileSource );
                } else {
                    //inline configuration
                    $TileSource = $.TileSource.determineType( _this, tileSource );
                    options = $TileSource.prototype.configure.apply( _this, [ tileSource ]);
                    readySource = new $TileSource( options );
                    _this.open( readySource );
                }
            } else {
                //can assume it's already a tile source implementation
                _this.open( tileSource );
            }
        }, 1);

        return this;
    },

    /**
     * @function
     * @name OpenSeadragon.Viewer.prototype.open
     * @return {OpenSeadragon.Viewer} Chainable.
     */
    open: function( source ) {
        var _this = this,
            overlay,
            i;

        if ( this.source ) {
            this.close( );
        }
        
        // to ignore earlier opens
        THIS[ this.hash ].lastOpenStartTime = +new Date();

        window.setTimeout( function () {
            if ( THIS[ _this.hash ].lastOpenStartTime > THIS[ _this.hash ].lastOpenEndTime ) {
                THIS[ _this.hash ].setMessage( $.getString( "Messages.Loading" ) );
            }
        }, 2000);

        THIS[ this.hash ].lastOpenEndTime = +new Date();
        this.canvas.innerHTML = "";
        THIS[ this.hash ].prevContainerSize = $.getElementSize( this.container );


        if( this.collectionMode ){
            this.source = new $.TileSourceCollection({
                rows: this.collectionRows,
                layout: this.collectionLayout,
                tileSize: this.collectionTileSize,
                tileSources: this.tileSources,
                tileMargin: this.collectionTileMargin
            });
            this.viewport = this.viewport ? this.viewport : new $.Viewport({
                collectionMode:         true,
                collectionTileSource:   this.source,
                containerSize:          THIS[ this.hash ].prevContainerSize, 
                contentSize:            this.source.dimensions, 
                springStiffness:        this.springStiffness,
                animationTime:          this.animationTime,
                showNavigator:          false,
                minZoomImageRatio:      1,
                maxZoomPixelRatio:      1
            });
        }else{
            if( source ){
                this.source = source;
            }
            this.viewport = this.viewport ? this.viewport : new $.Viewport({
                containerSize:      THIS[ this.hash ].prevContainerSize, 
                contentSize:        this.source.dimensions, 
                springStiffness:    this.springStiffness,
                animationTime:      this.animationTime,
                minZoomImageRatio:  this.minZoomImageRatio,
                maxZoomPixelRatio:  this.maxZoomPixelRatio,
                visibilityRatio:    this.visibilityRatio,
                wrapHorizontal:     this.wrapHorizontal,
                wrapVertical:       this.wrapVertical
            });
        }
        
        if( this.preserveVewport ){
            
            this.viewport.resetContentSize( this.source.dimensions );

        } else if( this.defaultZoomLevel || this.collectionMode ){

            if( this.collectionMode ){
                /*this.viewport.zoomTo( 
                    ( this.viewport.getMaxZoom() + this.viewport.getMaxZoom())/ 2, 
                    this.viewport.getCenter(),
                    true
                );*/
            }else{
                this.viewport.zoomTo( 
                    this.defaultZoomLevel, 
                    this.viewport.getCenter(),  
                    true
                );
            }
        }

        this.drawer = new $.Drawer({
            source:             this.source, 
            viewport:           this.viewport, 
            element:            this.canvas,
            overlays:           this.overlays,
            maxImageCacheCount: this.maxImageCacheCount,
            imageLoaderLimit:   this.imageLoaderLimit,
            minZoomImageRatio:  this.minZoomImageRatio,
            wrapHorizontal:     this.wrapHorizontal,
            wrapVertical:       this.wrapVertical,
            immediateRender:    this.immediateRender,
            blendTime:          this.blendTime,
            alwaysBlend:        this.alwaysBlend,
            minPixelRatio:      this.collectionMode ? 0 : this.minPixelRatio,
            timeout:            this.timeout,
            debugMode:          this.debugMode,
            debugGridColor:     this.debugGridColor
        });

        //Instantiate a navigator if configured
        if ( this.showNavigator  && ! this.navigator && !this.collectionMode ){
            this.navigator = new $.Navigator({
                id:          this.navigatorElement,
                position:    this.navigatorPosition,
                sizeRatio:   this.navigatorSizeRatio,
                height:      this.navigatorHeight,
                width:       this.navigatorWidth,
                tileSources: this.tileSources,
                tileHost:    this.tileHost,
                prefixUrl:   this.prefixUrl,
                overlays:    this.overlays,
                viewer:      this
            });
        }

        //Instantiate a referencestrip if configured
        if ( this.showReferenceStrip  && ! this.referenceStrip ){
            this.referenceStrip = new $.ReferenceStrip({
                id:          this.referenceStripElement,
                position:    this.referenceStripPosition,
                sizeRatio:   this.referenceStripSizeRatio,
                scroll:      this.referenceStripScroll,
                height:      this.referenceStripHeight,
                width:       this.referenceStripWidth,
                tileSources: this.tileSources,
                tileHost:    this.tileHost,
                prefixUrl:   this.prefixUrl,
                overlays:    this.overlays,
                viewer:      this
            });
        }

        //this.profiler = new $.Profiler();

        THIS[ this.hash ].animating = false;
        THIS[ this.hash ].forceRedraw = true;
        scheduleUpdate( this, updateMulti );

        //Assuming you had programatically created a bunch of overlays
        //and added them via configuration
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
        VIEWERS[ this.hash ] = this;
        this.raiseEvent( "open" );

        if( this.navigator ){
            this.navigator.open( source );
        }

        return this;
    },

    /**
     * @function
     * @name OpenSeadragon.Viewer.prototype.close
     * @return {OpenSeadragon.Viewer} Chainable.
     */
    close: function ( ) {
        this.source     = null;
        this.drawer     = null;
        this.viewport   = this.preserveViewport ? this.viewport : null;
        //this.profiler   = null;
        this.canvas.innerHTML = "";

        VIEWERS[ this.hash ] = null;
        delete VIEWERS[ this.hash ];
        
        return this;
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
     * @function
     * @name OpenSeadragon.Viewer.prototype.setDashboardEnabled
     * @return {OpenSeadragon.Viewer} Chainable.
     */
    setControlsEnabled: function( enabled ) {
        if( enabled ){
            abortControlsAutoHide( this );
        } else {
            beginControlsAutoHide( this );
        };
    },

    
    /**
     * @function
     * @name OpenSeadragon.Viewer.prototype.isFullPage
     * @return {Boolean}
     */
    isFullPage: function () {
        return this.element.parentNode == document.body;
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
            containerStyle  = this.element.style,
            canvasStyle     = this.canvas.style,
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

            //canvasStyle.backgroundColor = "black";
            //canvasStyle.color           = "white";

            //containerStyle.position = "fixed";

            //when entering full screen on the ipad it wasnt sufficient to leave
            //the body intact as only only the top half of the screen would 
            //respond to touch events on the canvas, while the bottom half treated
            //them as touch events on the document body.  Thus we remove and store
            //the bodies elements and replace them when we leave full screen.
            this.previousBody = [];
            THIS[ this.hash ].prevElementParent = this.element.parentNode;
            THIS[ this.hash ].prevNextSibling = this.element.prevNextSibling;
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
                this.toolbar.element.setAttribute( 
                    'class',
                    this.toolbar.element.className +" fullpage"
                );
                //this.toolbar.element.style.position = 'fixed';

                //this.container.style.top = $.getElementSize(
                //    this.toolbar.element
                //).y + 'px';
            }
            body.appendChild( this.element );
            if( this.toolbar && this.toolbar.element ){
                this.element.style.height = (
                    $.getWindowSize().y - $.getElementSize( this.toolbar.element ).y
                ) + 'px';
            }else{
                this.element.style.height = $.getWindowSize().y + 'px';
            }
            this.element.style.width = $.getWindowSize().x + 'px';

            // mouse will be inside container now
            $.delegate( this, onContainerEnter )();    


        } else {
            
            bodyStyle.overflow  = this.bodyOverflow;
            docStyle.overflow   = this.docOverflow;

            bodyStyle.width     = this.bodyWidth;
            bodyStyle.height    = this.bodyHeight;

            canvasStyle.backgroundColor = "";
            canvasStyle.color           = "";

            //containerStyle.position = "relative";
            //containerStyle.zIndex   = "";

            body.removeChild( this.element );
            nodes = this.previousBody.length;
            for ( i = 0; i < nodes; i++ ){
                body.appendChild( this.previousBody.shift() );
            }
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
                this.toolbar.element.setAttribute( 
                    'class',
                    this.toolbar.element.className.replace('fullpage','')
                );
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

            // mouse will likely be outside now
            $.delegate( this, onContainerExit )();      

        }

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
            this.raiseEvent( "resize", this );
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
        return this;
    },

    bindSequenceControls: function(){
        
        //////////////////////////////////////////////////////////////////////////
        // Image Sequence Controls
        //////////////////////////////////////////////////////////////////////////
        var onFocusHandler          = $.delegate( this, onFocus ),
            onBlurHandler           = $.delegate( this, onBlur ),
            onNextHandler           = $.delegate( this, onNext ),
            onPreviousHandler       = $.delegate( this, onPrevious ),
            navImages               = this.navImages,
            buttons                 = [],
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

            this.previousButton.disable();

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
                        $.ControlAnchor.BOTTOM_RIGHT  
                    );
                }else{
                    this.addControl( 
                        this.pagingControl, 
                        $.ControlAnchor.TOP_LEFT 
                    );
                }
            }
        }
    },

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
                        $.ControlAnchor.TOP_LEFT  
                    );
                }else{
                    this.addControl( 
                        this.navControl, 
                        $.ControlAnchor.TOP_LEFT 
                    );
                }
            }

            
        }
    },

    goToPage: function( page ){
        //page is a 1 based index so normalize now
        //page = page;
        if( this.tileSources.length > page ){
            
            THIS[ this.hash ].sequence = page;

            if( this.nextButton ){
                if( ( this.tileSources.length - 1 ) === page  ){
                    //Disable next button
                    this.nextButton.disable();
                } else {
                    this.nextButton.enable();
                }
            }
            if( this.previousButton ){
                if( page > 0 ){
                    //Enable previous button
                    this.previousButton.enable();
                } else {
                    this.previousButton.disable();
                }
            }

            this.openTileSource( this.tileSources[ page ] );
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
    }

});



///////////////////////////////////////////////////////////////////////////////
// Schedulers provide the general engine for animation
///////////////////////////////////////////////////////////////////////////////
function scheduleUpdate( viewer, updateFunc, prevUpdateTime ){
    var currentTime,
        targetTime,
        deltaTime;

    if ( THIS[ viewer.hash ].animating ) {
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
    if ( !viewer.autoHideControls ) {
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
function onFocus(){
    abortControlsAutoHide( this );
};

function onBlur(){
    beginControlsAutoHide( this );
    
};

function onCanvasClick( tracker, position, quick, shift ) {
    var zoomPreClick,
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
};

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
    }
};

function onCanvasRelease( tracker, position, insideElementPress, insideElementRelease ) {
    if ( insideElementPress && this.viewport ) {
        this.viewport.applyConstraints();
    }
};

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
    //cancels event
    return false;
};

function onContainerExit( tracker, position, buttonDownElement, buttonDownAny ) {
    if ( !buttonDownElement ) {
        THIS[ this.hash ].mouseInside = false;
        if ( !THIS[ this.hash ].animating ) {
            beginControlsAutoHide( this );
        }
    }
};

function onContainerRelease( tracker, position, insideElementPress, insideElementRelease ) {
    if ( !insideElementRelease ) {
        THIS[ this.hash ].mouseInside = false;
        if ( !THIS[ this.hash ].animating ) {
            beginControlsAutoHide( this );
        }
    }
};

function onContainerEnter( tracker, position, buttonDownElement, buttonDownAny ) {
    THIS[ this.hash ].mouseInside = true;
    abortControlsAutoHide( this );
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
    if ( !containerSize.equals( THIS[ viewer.hash ].prevContainerSize ) ) {
        // maintain image position
        viewer.viewport.resize( containerSize, true ); 
        THIS[ viewer.hash ].prevContainerSize = containerSize;
        viewer.raiseEvent( "resize" );
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
};



///////////////////////////////////////////////////////////////////////////////
// Navigation Controls
///////////////////////////////////////////////////////////////////////////////
function resolveUrl( prefix, url ) {
    return prefix ? prefix + url : url;
};



function beginZoomingIn() {
    THIS[ this.hash ].lastZoomTime = +new Date();
    THIS[ this.hash ].zoomFactor = this.zoomPerSecond;
    THIS[ this.hash ].zooming = true;
    scheduleZoom( this );
};


function beginZoomingOut() {
    THIS[ this.hash ].lastZoomTime = +new Date();
    THIS[ this.hash ].zoomFactor = 1.0 / this.zoomPerSecond;
    THIS[ this.hash ].zooming = true;
    scheduleZoom( this );
};


function endZooming() {
    THIS[ this.hash ].zooming = false;
};


function scheduleZoom( viewer ) {
    window.setTimeout( $.delegate( viewer, doZoom ), 10 );
};


function doZoom() {
    var currentTime,
        deltaTime,
        adjustFactor;

    if ( THIS[ this.hash ].zooming && this.viewport) {
        currentTime     = +new Date();
        deltaTime       = currentTime - THIS[ this.hash ].lastZoomTime;
        adjustedFactor  = Math.pow( THIS[ this.hash ].zoomFactor, deltaTime / 1000 );

        this.viewport.zoomBy( adjustedFactor );
        this.viewport.applyConstraints();
        THIS[ this.hash ].lastZoomTime = currentTime;
        scheduleZoom( this );
    }
};


function doSingleZoomIn() {
    if ( this.viewport ) {
        THIS[ this.hash ].zooming = false;
        this.viewport.zoomBy( 
            this.zoomPerClick / 1.0 
        );
        this.viewport.applyConstraints();
    }
};


function doSingleZoomOut() {
    if ( this.viewport ) {
        THIS[ this.hash ].zooming = false;
        this.viewport.zoomBy(
            1.0 / this.zoomPerClick
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
    if( this.buttons ){
        this.buttons.emulateExit();
    }
    this.fullPageButton.element.focus();
    if ( this.viewport ) {
        this.viewport.applyConstraints();
    }
};


function onPrevious(){
    var previous = THIS[ this.hash ].sequence - 1;
    this.goToPage( previous );
};


function onNext(){
    var next = THIS[ this.hash ].sequence + 1;
    this.goToPage( next );
};


}( OpenSeadragon ));
