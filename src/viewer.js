
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
