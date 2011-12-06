
(function( $ ){
    
$.NavControl = function(viewer) {
    this._group = null;
    this._zooming = false;    // whether we should be continuously zooming
    this._zoomFactor = null;  // how much we should be continuously zooming by
    this._lastZoomTime = null;
    this._viewer = viewer;
    this.config = this._viewer.config;

    this.elmt = null;
    this.initialize();
};

$.NavControl.prototype = {
    initialize: function() {
        var beginZoomingInHandler = $.delegate(this, this._beginZoomingIn);
        var endZoomingHandler = $.delegate(this, this._endZooming);
        var doSingleZoomInHandler = $.delegate(this, this._doSingleZoomIn);
        var beginZoomingOutHandler = $.delegate(this, this._beginZoomingOut);
        var doSingleZoomOutHandler = $.delegate(this, this._doSingleZoomOut);
        var onHomeHandler = $.delegate(this, this._onHome);
        var onFullPageHandler = $.delegate(this, this._onFullPage);

        var navImages = this._viewer.config.navImages;

        var zoomIn = new $.Button({ 
            config: this._viewer.config, 
            tooltip: $.Strings.getString("Tooltips.ZoomIn"), 
            srcRest: this._resolveUrl(navImages.zoomIn.REST), 
            srcGroup: this._resolveUrl(navImages.zoomIn.GROUP), 
            srcHover: this._resolveUrl(navImages.zoomIn.HOVER), 
            srcDown: this._resolveUrl(navImages.zoomIn.DOWN) 
        },{ 
            onPress: beginZoomingInHandler, 
            onRelease: endZoomingHandler, 
            onClick: doSingleZoomInHandler, 
            onEnter: beginZoomingInHandler, 
            onExit: endZoomingHandler 
        });
        var zoomOut = new $.Button({ 
            config: this._viewer.config, 
            tooltip: $.Strings.getString("Tooltips.ZoomOut"), 
            srcRest: this._resolveUrl(navImages.zoomOut.REST), 
            srcGroup: this._resolveUrl(navImages.zoomOut.GROUP), 
            srcHover: this._resolveUrl(navImages.zoomOut.HOVER), 
            srcDown: this._resolveUrl(navImages.zoomOut.DOWN) 
        }, { 
            onPress: beginZoomingOutHandler, 
            onRelease: endZoomingHandler, 
            onClick: doSingleZoomOutHandler, 
            onEnter: beginZoomingOutHandler, 
            onExit: endZoomingHandler 
        });
        var goHome = new $.Button({ 
            config: this._viewer.config, 
            tooltip: $.Strings.getString("Tooltips.Home"), 
            srcRest: this._resolveUrl(navImages.home.REST), 
            srcGroup: this._resolveUrl(navImages.home.GROUP), 
            srcHover: this._resolveUrl(navImages.home.HOVER), 
            srcDown: this._resolveUrl(navImages.home.DOWN) 
        },{ 
            onRelease: onHomeHandler 
        });
        var fullPage = new $.Button({ 
            config: this._viewer.config, 
            tooltip: $.Strings.getString("Tooltips.FullPage"), 
            srcRest: this._resolveUrl(navImages.fullpage.REST), 
            srcGroup: this._resolveUrl(navImages.fullpage.GROUP), 
            srcHover: this._resolveUrl(navImages.fullpage.HOVER), 
            srcDown: this._resolveUrl(navImages.fullpage.DOWN) 
        },{ 
            onRelease: onFullPageHandler 
        });
        this._group = new $.ButtonGroup({ 
            config: this._viewer.config, 
            buttons: [zoomIn, zoomOut, goHome, fullPage] 
        });

        this.elmt = this._group.get_element();
        this.elmt[SIGNAL] = true;   // hack to get our controls to fade
        this._viewer.add_open($.delegate(this, this._lightUp));
    },

    get_events: function() {
        return this._events;
    },
    set_events: function(value) {
        this._events = value;
    },
    _resolveUrl: function(url) {
        return $.format("{1}", this._viewer.get_prefixUrl(), url);
    },
    _beginZoomingIn: function() {
        this._lastZoomTime = new Date().getTime();
        this._zoomFactor = this.config.zoomPerSecond;
        this._zooming = true;
        this._scheduleZoom();
    },
    _beginZoomingOut: function() {
        this._lastZoomTime = new Date().getTime();
        this._zoomFactor = 1.0 / this.config.zoomPerSecond;
        this._zooming = true;
        this._scheduleZoom();
    },

    _endZooming: function() {
        this._zooming = false;
    },
    _scheduleZoom: function() {
        window.setTimeout($.delegate(this, this._doZoom), 10);
    },
    _doZoom: function() {
        if (this._zooming && this._viewer.viewport) {
            var currentTime = new Date().getTime();
            var deltaTime = currentTime - this._lastZoomTime;
            var adjustedFactor = Math.pow(this._zoomFactor, deltaTime / 1000);

            this._viewer.viewport.zoomBy(adjustedFactor);
            this._viewer.viewport.applyConstraints();
            this._lastZoomTime = currentTime;
            this._scheduleZoom();
        }
    },
    _doSingleZoomIn: function() {
        if (this._viewer.viewport) {
            this._zooming = false;
            this._viewer.viewport.zoomBy(this.config.zoomPerClick / 1.0);
            this._viewer.viewport.applyConstraints();
        }
    },
    _doSingleZoomOut: function() {
        if (this._viewer.viewport) {
            this._zooming = false;
            this._viewer.viewport.zoomBy(1.0 / this.config.zoomPerClick);
            this._viewer.viewport.applyConstraints();
        }
    },
    _lightUp: function() {
        this._group.emulateEnter();
        this._group.emulateExit();
    },
    _onHome: function() {
        if (this._viewer.viewport) {
            this._viewer.viewport.goHome();
        }
    },
    _onFullPage: function() {
        this._viewer.setFullPage(!this._viewer.isFullPage());
        this._group.emulateExit();  // correct for no mouseout event on change

        if (this._viewer.viewport) {
            this._viewer.viewport.applyConstraints();
        }
    }
};

}( OpenSeadragon ));
