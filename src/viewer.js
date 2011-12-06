
(function( $ ){
    
$.Viewer = function(element, xmlPath, prefixUrl, controls, overlays, overlayControls) {

    this.config = new $.Config();
    this._prefixUrl = prefixUrl ? prefixUrl : "";
    this._element = document.getElementById(element);

    this._controls = controls ? controls : [];
    this._customControls = [];
    this._overlays = overlays ? overlays : [];
    this._overlayControls = overlayControls ? overlayControls : [];
    this._container = null;
    this._canvas = null;
    this._controlsTL = null;
    this._controlsTR = null;
    this._controlsBR = null;
    this._controlsBL = null;
    this._bodyWidth = null;
    this._bodyHeight = null;
    this._bodyOverflow = null;
    this._docOverflow = null;
    this._fsBoundsDelta = null;
    this._prevContainerSize = null;
    this._lastOpenStartTime = 0;
    this._lastOpenEndTime = 0;
    this._animating = false;
    this._forceRedraw = false;
    this._mouseInside = false;
    this._xmlPath = xmlPath ? xmlPath : undefined;

    this.source = null;
    this.drawer = null;
    this.viewport = null;
    this.profiler = null;

    this.initialize();
};

$.Viewer.prototype = {
    initialize: function () {

        this._events = new $.EventHandlerList();

        this._container = $.Utils.makeNeutralElement("div");
        this._canvas = $.Utils.makeNeutralElement("div");

        this._controlsTL = $.Utils.makeNeutralElement("div");
        this._controlsTR = $.Utils.makeNeutralElement("div");
        this._controlsBR = $.Utils.makeNeutralElement("div");
        this._controlsBL = $.Utils.makeNeutralElement("div");

        var innerTracker = new $.MouseTracker(this._canvas, this.config.clickTimeThreshold, this.config.clickDistThreshold);
        var outerTracker = new $.MouseTracker(this._container, this.config.clickTimeThreshold, this.config.clickDistThreshold);

        this._bodyWidth = document.body.style.width;
        this._bodyHeight = document.body.style.height;
        this._bodyOverflow = document.body.style.overflow;
        this._docOverflow = document.documentElement.style.overflow;

        this._fsBoundsDelta = new $.Point(1, 1);

        var canvasStyle = this._canvas.style;
        var containerStyle = this._container.style;
        var controlsTLStyle = this._controlsTL.style;
        var controlsTRStyle = this._controlsTR.style;
        var controlsBRStyle = this._controlsBR.style;
        var controlsBLStyle = this._controlsBL.style;

        containerStyle.width = "100%";
        containerStyle.height = "100%";
        containerStyle.position = "relative";
        containerStyle.left = "0px";
        containerStyle.top = "0px";
        containerStyle.textAlign = "left";  // needed to protect against

        canvasStyle.width = "100%";
        canvasStyle.height = "100%";
        canvasStyle.overflow = "hidden";
        canvasStyle.position = "absolute";
        canvasStyle.top = "0px";
        canvasStyle.left = "0px";

        controlsTLStyle.position = controlsTRStyle.position =
                    controlsBRStyle.position = controlsBLStyle.position =
                    "absolute";

        controlsTLStyle.top = controlsTRStyle.top = "0px";
        controlsTLStyle.left = controlsBLStyle.left = "0px";
        controlsTRStyle.right = controlsBRStyle.right = "0px";
        controlsBLStyle.bottom = controlsBRStyle.bottom = "0px";

        innerTracker.clickHandler = $.delegate(this, this._onCanvasClick);
        innerTracker.dragHandler = $.delegate(this, this._onCanvasDrag);
        innerTracker.releaseHandler = $.delegate(this, this._onCanvasRelease);
        innerTracker.scrollHandler = $.delegate(this, this._onCanvasScroll);
        innerTracker.setTracking(true);     // default state

        if (this.get_showNavigationControl()) {
            navControl = (new $.NavControl(this)).elmt;
            navControl.style.marginRight = "4px";
            navControl.style.marginBottom = "4px";
            this.addControl(navControl, $.ControlAnchor.BOTTOM_RIGHT);
        }
        for (var i = 0; i < this._customControls.length; i++) {
            this.addControl(this._customControls[i].id, this._customControls[i].anchor);
        }

        outerTracker.enterHandler = $.delegate(this, this._onContainerEnter);
        outerTracker.exitHandler = $.delegate(this, this._onContainerExit);
        outerTracker.releaseHandler = $.delegate(this, this._onContainerRelease);
        outerTracker.setTracking(true); // always tracking
        window.setTimeout($.delegate(this, this._beginControlsAutoHide), 1);    // initial fade out

        this._container.appendChild(this._canvas);
        this._container.appendChild(this._controlsTL);
        this._container.appendChild(this._controlsTR);
        this._container.appendChild(this._controlsBR);
        this._container.appendChild(this._controlsBL);
        this.get_element().appendChild(this._container);

        if (this._xmlPath)
            this.openDzi(this._xmlPath);
    },
    get_events: function get_events() {
        return this._events;
    },
    _raiseEvent: function (eventName, eventArgs) {
        var handler = this.get_events().getHandler(eventName);

        if (handler) {
            if (!eventArgs) {
                eventArgs = new Object(); // Sys.EventArgs.Empty;
            }

            handler(this, eventArgs);
        }
    },
    _beginControlsAutoHide: function () {
        if (!this.config.autoHideControls) {
            return;
        }

        this._controlsShouldFade = true;
        this._controlsFadeBeginTime = new Date().getTime() + this._controlsFadeDelay;
        window.setTimeout($.delegate(this, this._scheduleControlsFade), this._controlsFadeDelay);
    },
    _scheduleControlsFade: function () {
        window.setTimeout($.delegate(this, this._updateControlsFade), 20);
    },
    _updateControlsFade: function () {
        if (this._controlsShouldFade) {
            var currentTime = new Date().getTime();
            var deltaTime = currentTime - this._controlsFadeBeginTime;
            var opacity = 1.0 - deltaTime / this._controlsFadeLength;

            opacity = Math.min(1.0, opacity);
            opacity = Math.max(0.0, opacity);

            for (var i = this._controls.length - 1; i >= 0; i--) {
                this._controls[i].setOpacity(opacity);
            }

            if (opacity > 0) {
                this._scheduleControlsFade();    // fade again
            }
        }
    },
    _onCanvasClick: function (tracker, position, quick, shift) {
        if (this.viewport && quick) {    // ignore clicks where mouse moved         
            var zoomPerClick = this.config.zoomPerClick;
            var factor = shift ? 1.0 / zoomPerClick : zoomPerClick;
            this.viewport.zoomBy(factor, this.viewport.pointFromPixel(position, true));
            this.viewport.applyConstraints();
        }
    },
    _onCanvasDrag: function (tracker, position, delta, shift) {
        if (this.viewport) {
            this.viewport.panBy(this.viewport.deltaPointsFromPixels(delta.negate()));
        }
    },
    _onCanvasRelease: function (tracker, position, insideElmtPress, insideElmtRelease) {
        if (insideElmtPress && this.viewport) {
            this.viewport.applyConstraints();
        }
    },
    _onCanvasScroll: function (tracker, position, scroll, shift) {
        if (this.viewport) {
            var factor = Math.pow(this.config.zoomPerScroll,scroll);
            this.viewport.zoomBy(factor, this.viewport.pointFromPixel(position, true));
            this.viewport.applyConstraints();
        }
    },
    _onContainerExit: function (tracker, position, buttonDownElmt, buttonDownAny) {
        if (!buttonDownElmt) {
            this._mouseInside = false;
            if (!this._animating) {
                this._beginControlsAutoHide();
            }
        }
    },
    _onContainerRelease: function (tracker, position, insideElmtPress, insideElmtRelease) {
        if (!insideElmtRelease) {
            this._mouseInside = false;
            if (!this._animating) {
                this._beginControlsAutoHide();
            }
        }
    },
    _getControlIndex: function (elmt) {
        for (var i = this._controls.length - 1; i >= 0; i--) {
            if (this._controls[i].elmt == elmt) {
                return i;
            }
        }

        return -1;
    },
    _abortControlsAutoHide: function () {
        this._controlsShouldFade = false;
        for (var i = this._controls.length - 1; i >= 0; i--) {
            this._controls[i].setOpacity(1.0);
        }
    },
    _onContainerEnter: function (tracker, position, buttonDownElmt, buttonDownAny) {
        this._mouseInside = true;
        this._abortControlsAutoHide();
    },
    _updateOnce: function () {
        if (!this.source) {
            return;
        }

        this.profiler.beginUpdate();

        var containerSize = $.Utils.getElementSize(this._container);

        if (!containerSize.equals(this._prevContainerSize)) {
            this.viewport.resize(containerSize, true); // maintain image position
            this._prevContainerSize = containerSize;
            this._raiseEvent("resize", this);
        }

        var animated = this.viewport.update();

        if (!this._animating && animated) {
            this._raiseEvent("animationstart", self);
            this._abortControlsAutoHide();
        }

        if (animated) {
            this.drawer.update();
            this._raiseEvent("animation", self);
        } else if (this._forceRedraw || this.drawer.needsUpdate()) {
            this.drawer.update();
            this._forceRedraw = false;
        } else {
            this.drawer.idle();
        }

        if (this._animating && !animated) {
            this._raiseEvent("animationfinish", this);

            if (!this._mouseInside) {
                this._beginControlsAutoHide();
            }
        }

        this._animating = animated;

        this.profiler.endUpdate();
    },
    _onClose: function () {

        this.source = null;
        this.viewport = null;
        this.drawer = null;
        this.profiler = null;

        this._canvas.innerHTML = "";
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
    _setMessage: function (message) {
        var textNode = document.createTextNode(message);

        this._canvas.innerHTML = "";
        this._canvas.appendChild($.Utils.makeCenteredNode(textNode));

        var textStyle = textNode.parentNode.style;

        textStyle.color = "white";
        textStyle.fontFamily = "verdana";
        textStyle.fontSize = "13px";
        textStyle.fontSizeAdjust = "none";
        textStyle.fontStyle = "normal";
        textStyle.fontStretch = "normal";
        textStyle.fontVariant = "normal";
        textStyle.fontWeight = "normal";
        textStyle.lineHeight = "1em";
        textStyle.textAlign = "center";
        textStyle.textDecoration = "none";
    },
    _onOpen: function (time, _source, error) {
        this._lastOpenEndTime = new Date().getTime();

        if (time < this._lastOpenStartTime) {
            $.Debug.log("Ignoring out-of-date open.");
            this._raiseEvent("ignore");
            return;
        } else if (!_source) {
            this._setMessage(error);
            this._raiseEvent("error");
            return;
        }

        this._canvas.innerHTML = "";
        this._prevContainerSize = $.Utils.getElementSize(this._container);

        this.source = _source;
        this.viewport = new $.Viewport(this._prevContainerSize, this.source.dimensions, this.config);
        this.drawer = new $.Drawer(this.source, this.viewport, this._canvas);
        this.profiler = new $.Profiler();

        this._animating = false;
        this._forceRedraw = true;
        this._scheduleUpdate(this._updateMulti);

        for (var i = 0; i < this._overlayControls.length; i++) {
            var overlay = this._overlayControls[i];
            if (overlay.point != null) {
                this.drawer.addOverlay(overlay.id, new $.Point(overlay.point.X, overlay.point.Y), $.OverlayPlacement.TOP_LEFT);
            }
            else {
                this.drawer.addOverlay(overlay.id, new $.Rect(overlay.rect.Point.X, overlay.rect.Point.Y, overlay.rect.Width, overlay.rect.Height), overlay.placement);
            }
        }
        this._raiseEvent("open");
    },
    _scheduleUpdate: function (updateFunc, prevUpdateTime) {
        if (this._animating) {
            return window.setTimeout($.delegate(this, updateFunc), 1);
        }

        var currentTime = new Date().getTime();
        var prevUpdateTime = prevUpdateTime ? prevUpdateTime : currentTime;
        var targetTime = prevUpdateTime + 1000 / 60;    // 60 fps ideal

        var deltaTime = Math.max(1, targetTime - currentTime);
        return window.setTimeout($.delegate(this, updateFunc), deltaTime);
    },
    _updateMulti: function () {
        if (!this.source) {
            return;
        }

        var beginTime = new Date().getTime();

        this._updateOnce();
        this._scheduleUpdate(arguments.callee, beginTime);
    },
    _updateOnce: function () {
        if (!this.source) {
            return;
        }

        this.profiler.beginUpdate();

        var containerSize = $.Utils.getElementSize(this._container);

        if (!containerSize.equals(this._prevContainerSize)) {
            this.viewport.resize(containerSize, true); // maintain image position
            this._prevContainerSize = containerSize;
            this._raiseEvent("resize");
        }

        var animated = this.viewport.update();

        if (!this._animating && animated) {
            this._raiseEvent("animationstart");
            this._abortControlsAutoHide();
        }

        if (animated) {
            this.drawer.update();
            this._raiseEvent("animation");
        } else if (this._forceRedraw || this.drawer.needsUpdate()) {
            this.drawer.update();
            this._forceRedraw = false;
        } else {
            this.drawer.idle();
        }

        if (this._animating && !animated) {
            this._raiseEvent("animationfinish");

            if (!this._mouseInside) {
                this._beginControlsAutoHide();
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
    get_xmlPath: function () {
        return this._xmlPath;
    },
    set_xmlPath: function (value) {
        this._xmlPath = value;
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
    get_controls: function () {
        return this._customControls;
    },
    set_controls: function (value) {
        this._customControls = value;
    },
    get_overlays: function () {
        return this._overlayControls;
    },
    set_overlays: function (value) {
        this._overlayControls = value;
    },
    get_prefixUrl: function () {
        return this._prefixUrl;
    },
    set_prefixUrl: function (value) {
        this._prefixUrl = value;
    },
    add_open: function (handler) {
        this.get_events().addHandler("open", handler);
    },
    remove_open: function (handler) {
        this.get_events().removeHandler("open", handler);
    },
    add_error: function (handler) {
        this.get_events().addHandler("error", handler);
    },
    remove_error: function (handler) {
        this.get_events().removeHandler("error", handler);
    },
    add_ignore: function (handler) {
        this.get_events().addHandler("ignore", handler);
    },
    remove_ignore: function (handler) {
        this.get_events().removeHandler("ignore", handler);
    },
    add_resize: function (handler) {
        this.get_events().addHandler("resize", handler);
    },
    remove_resize: function (handler) {
        this.get_events().removeHandler("resize", handler);
    },
    add_animationstart: function (handler) {
        this.get_events().addHandler("animationstart", handler);
    },
    remove_animationstart: function (handler) {
        this.get_events().removeHandler("animationstart", handler);
    },
    add_animation: function (handler) {
        this.get_events().addHandler("animation", handler);
    },
    remove_animation: function (handler) {
        this.get_events().removeHandler("animation", handler);
    },
    add_animationfinish: function (handler) {
        this.get_events().addHandler("animationfinish", handler);
    },
    remove_animationfinish: function (handler) {
        this.get_events().removeHandler("animationfinish", handler);
    },
    addControl: function (elmt, anchor) {
        var elmt = $.Utils.getElement(elmt);

        if (this._getControlIndex(elmt) >= 0) {
            return;     // they're trying to add a duplicate control
        }

        var div = null;

        switch (anchor) {
            case $.ControlAnchor.TOP_RIGHT:
                div = this._controlsTR;
                elmt.style.position = "relative";
                break;
            case $.ControlAnchor.BOTTOM_RIGHT:
                div = this._controlsBR;
                elmt.style.position = "relative";
                break;
            case $.ControlAnchor.BOTTOM_LEFT:
                div = this._controlsBL;
                elmt.style.position = "relative";
                break;
            case $.ControlAnchor.TOP_LEFT:
                div = this._controlsTL;
                elmt.style.position = "relative";
                break;
            case $.ControlAnchor.NONE:
            default:
                div = this._container;
                elmt.style.position = "absolute";
                break;
        }

        this._controls.push(new $.Control(elmt, anchor, div));

        elmt.style.display = "inline-block";
    },
    isOpen: function () {
        return !!this.source;
    },
    openDzi: function (xmlUrl, xmlString) {
        var currentTime = this._beforeOpen();
        $.DziTileSourceHelper.createFromXml(xmlUrl, xmlString,
                    $.Utils.createCallback(null, $.delegate(this, this._onOpen), currentTime));
    },
    openTileSource: function (tileSource) {
        var currentTime = beforeOpen();
        window.setTimeout($.delegate(this, function () {
            onOpen(currentTime, tileSource);
        }), 1);
    },
    close: function () {
        if (!this.source) {
            return;
        }

        this._onClose();
    },
    removeControl: function (elmt) {
        var elmt = $.Utils.getElement(elmt);
        var i = this._getControlIndex(elmt);

        if (i >= 0) {
            this._controls[i].destroy();
            this._controls.splice(i, 1);
        }
    },
    clearControls: function () {
        while (this._controls.length > 0) {
            this._controls.pop().destroy();
        }
    },
    isDashboardEnabled: function () {
        for (var i = this._controls.length - 1; i >= 0; i--) {
            if (this._controls[i].isVisible()) {
                return true;
            }
        }

        return false;
    },

    isFullPage: function () {
        return this._container.parentNode == document.body;
    },

    isMouseNavEnabled: function () {
        return this._innerTracker.isTracking();
    },

    isVisible: function () {
        return this._container.style.visibility != "hidden";
    },

    setDashboardEnabled: function (enabled) {
        for (var i = this._controls.length - 1; i >= 0; i--) {
            this._controls[i].setVisible(enabled);
        }
    },

    setFullPage: function (fullPage) {
        if (fullPage == this.isFullPage()) {
            return;
        }

        var body = document.body;
        var bodyStyle = body.style;
        var docStyle = document.documentElement.style;
        var containerStyle = this._container.style;
        var canvasStyle = this._canvas.style;

        if (fullPage) {
            bodyOverflow = bodyStyle.overflow;
            docOverflow = docStyle.overflow;
            bodyStyle.overflow = "hidden";
            docStyle.overflow = "hidden";

            bodyWidth = bodyStyle.width;
            bodyHeight = bodyStyle.height;
            bodyStyle.width = "100%";
            bodyStyle.height = "100%";

            canvasStyle.backgroundColor = "black";
            canvasStyle.color = "white";

            containerStyle.position = "fixed";
            containerStyle.zIndex = "99999999";

            body.appendChild(this._container);
            this._prevContainerSize = $.Utils.getWindowSize();

            this._onContainerEnter();     // mouse will be inside container now
        } else {
            bodyStyle.overflow = bodyOverflow;
            docStyle.overflow = docOverflow;

            bodyStyle.width = bodyWidth;
            bodyStyle.height = bodyHeight;

            canvasStyle.backgroundColor = "";
            canvasStyle.color = "";

            containerStyle.position = "relative";
            containerStyle.zIndex = "";

            this.get_element().appendChild(this._container);
            this._prevContainerSize = $.Utils.getElementSize(this.get_element());

            this._onContainerExit();      // mouse will likely be outside now
        }
        if (this.viewport) {
            var oldBounds = this.viewport.getBounds();
            this.viewport.resize(this._prevContainerSize);
            var newBounds = this.viewport.getBounds();

            if (fullPage) {
                this._fsBoundsDelta = new $.Point(newBounds.width / oldBounds.width,
                        newBounds.height / oldBounds.height);
            } else {
                this.viewport.update();
                this.viewport.zoomBy(Math.max(this._fsBoundsDelta.x, this._fsBoundsDelta.y),
                            null, true);
            }

            this._forceRedraw = true;
            this._raiseEvent("resize", this);
            this._updateOnce();
        }
    },

    setMouseNavEnabled: function (enabled) {
        this._innerTracker.setTracking(enabled);
    },

    setVisible: function (visible) {
        this._container.style.visibility = visible ? "" : "hidden";
    }

};

}( OpenSeadragon ));
