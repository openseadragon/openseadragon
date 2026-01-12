declare namespace OpenSeadragon {
    class Browser {
        vendor: BROWSERS;
        version: number;
        alpha: boolean;
    }

    enum BROWSERS {
        UNKNOWN = 0,
        IE = 1,
        FIREFOX = 2,
        SAFARI = 3,
        CHROME = 4,
        OPERA = 5,
        EDGE = 6,
        CHROMEEDGE = 7,
    }

    enum ButtonState {
        REST,
        GROUP,
        HOVER,
        DOWN,
    }

    enum ControlAnchor {
        NONE,
        TOP_LEFT,
        TOP_RIGHT,
        BOTTOM_LEFT,
        BOTTOM_RIGHT,
        ABSOLUTE,
    }

    const DEFAULT_SETTINGS: Options;

    const fullScreenApi: {
        supportsFullScreen: boolean;
        isFullScreen: () => boolean;
        getFullScreenElement: () => HTMLElement;
        requestFullScreen: () => void;
        exitFullScreen: () => void;
        cancelFullScreen: () => void;
        fullScreenEventName: string;
        fullScreenErrorEventName: string;
    };

    enum OverlayPlacement {
        CENTER,
        TOP_LEFT,
        TOP,
        TOP_RIGHT,
        RIGHT,
        BOTTOM_RIGHT,
        BOTTOM,
        BOTTOM_LEFT,
        LEFT,
    }

    enum OverlayRotationMode {
        NO_ROTATION,
        EXACT,
        BOUNDING_BOX,
    }

    let pixelDensityRatio: number;

    enum Placement {
        CENTER,
        TOP_LEFT,
        TOP,
        TOP_RIGHT,
        RIGHT,
        BOTTOM_RIGHT,
        BOTTOM,
        BOTTOM_LEFT,
        LEFT,
    }

    let supportsCanvas: boolean;

    let version: {
        versionStr: string;
        major: number;
        minor: number;
        revision: number;
    };

    function addClass(element: Element | string, className: string): void;

    function addEvent(
        element: Element | string,
        eventName: string,
        handler: (event: Event) => void,
        useCapture?: boolean | { capture?: boolean; passive?: boolean; once?: boolean },
    ): void;

    function cancelEvent(event?: OSDEvent<any>): void;

    function capitalizeFirstLetter(value: string): string;

    function createCallback(object: object, method: (...args: any[]) => void, ...args: any[]): (...args: any[]) => void;

    function delegate(object: object, method: (...args: any[]) => void): (object: any, ...args: any[]) => void; // REVIEW: unsure of return type

    function eventIsCanceled(event: OSDEvent<any>): boolean;

    function extend(): any;

    function getCssPropertyWithVendorPrefix(property: string): string;

    function getElement(element: string | Element): Element;

    function getElementOffset(element: Element | string): Point;

    function getElementPosition(element: Element | string): Point;

    function getElementSize(element: Element | string): Point;

    function getElementStyle(element: Element | string): CSSStyleDeclaration;

    function getViewer(element: string | Element): Viewer;

    function getMousePosition(event?: OSDEvent<any>): Point;

    function getPageScroll(): Point;

    function getString(property: string): string;

    function getUrlParameter(key: string): string;

    function getWindowSize(): Point;

    function imageFormatSupported(extension?: string): boolean;

    function indexOf(array: any[], searchElement: object, fromIndex?: number): number;

    // (missing jquery functions)

    function makeAjaxRequest(options: {
        url: string;
        success: (obj: object) => void;
        error: (obj: object) => void;
        headers: object;
        responseType: string;
        withCredentials?: boolean;
    }): XMLHttpRequest;

    function makeCenteredNode(element: Element | string): Element;

    function makeNeutralElement(tagName: string): Element;

    function makeTransparentImage(src: string): Element;

    function normalizeEventListenerOptions(
        options: boolean | { capture?: boolean; passive?: boolean; once?: boolean },
    ): string;

    function now(): number;

    function parseJSON(string: string): object;

    function parseXml(string: string): Document;

    function pointInElement(element: Element | string, point: Point): boolean;

    function positiveModulo(number: number, modulo: number): number;

    function removeClass(element: Element | string, className: string): void;

    function removeEvent(
        element: Element | string,
        eventName: string,
        handler: EventHandler<any>,
        useCapture?: boolean | { capture?: boolean },
    ): void;

    function setElementOpacity(element: Element | string, opacity: number, usesAlpha?: boolean): void;

    function setElementPointerEvents(element: Element | string, value: string): void;

    function setElementPointerEventsNone(element: Element | string): void;

    function setElementTouchActionNone(element: Element | string): void;

    function setImageFormatsSupported(formats: {
        bmp?: boolean;
        jpeg?: boolean;
        jpg?: boolean;
        png?: boolean;
        tif?: boolean;
        wdp?: boolean;
    }): void;

    function setPageScroll(point: Point): void;

    function setString(property: string, value: string): void;

    function stopEvent(event?: OSDEvent<any>): void;

    interface GestureSettings {
        scrollToZoom?: boolean;
        clickToZoom?: boolean;
        dblClickToZoom?: boolean;
        dragToPan?: boolean;
        pinchToZoom?: boolean;
        flickEnabled?: boolean;
        flickMinSpeed?: number;
        flickMomentum?: number;
    }

    interface NavImagesValues {
        REST: string;
        GROUP: string;
        HOVER: string;
        DOWN: string;
    }

    interface NavImages {
        zoomIn: NavImagesValues;
        zoomOut: NavImagesValues;
        home: NavImagesValues;
        fullpage: NavImagesValues;
        rotateleft: NavImagesValues;
        rotateright: NavImagesValues;
        flip: NavImagesValues;
        previous: NavImagesValues;
        next: NavImagesValues;
    }

    type DrawerType = "html" | "canvas" | "webgl";
    type DrawerConstructor = new(options: TDrawerOptions) => DrawerBase;

    interface Options {
        id?: string;
        element?: HTMLElement;
        tileSources?:
            | string
            | TileSourceOptions
            | {
            type: string;
            levels?: Array<{
                url: string;
                height: number;
                width: number;
            }>;
        }
            | {
            Image: {
                xmlns?: string;
                Url: string;
                Format: string;
                Overlap: string;
                TileSize: string;
                Size: {
                    Width: string;
                    Height: string;
                };
            };
        }
            | Array<string | TileSource | { type: "openstreetmaps" }>;
        tabIndex?: number;
        overlays?: any[];
        xmlPath?: string;
        prefixUrl?: string;
        navImages?: NavImages;
        debugMode?: boolean;
        debugGridColor?: string;
        silenceMultiImageWarnings?: boolean;
        blendTime?: number;
        alwaysBlend?: boolean;
        autoHideControls?: boolean;
        immediateRender?: boolean;
        defaultZoomLevel?: number;
        drawer?: DrawerType | DrawerConstructor | Array<DrawerType | DrawerConstructor>;
        drawerOptions?: DrawerOptions;
        opacity?: number;
        preload?: boolean;
        compositeOperation?:
            | "source-over"
            | "source-atop"
            | "source-in"
            | "source-out"
            | "destination-over"
            | "destination-atop"
            | "destination-in"
            | "destination-out"
            | "lighter"
            | "copy"
            | "xor"
            | "multiply"
            | "screen"
            | "overlay"
            | "darken"
            | "lighten"
            | "color-dodge"
            | "color-burn"
            | "hard-light"
            | "soft-light"
            | "difference"
            | "exclusion"
            | "hue"
            | "saturation"
            | "color"
            | "luminosity";
        imageSmoothingEnabled?: boolean;
        placeholderFillStyle?: string | CanvasGradient | CanvasPattern;
        subPixelRoundingForTransparency?: object;
        degrees?: number;
        flipped?: boolean;
        overlayPreserveContentDirection?: boolean;
        minZoomLevel?: number;
        maxZoomLevel?: number;
        homeFillsViewer?: boolean;
        panHorizontal?: boolean;
        panVertical?: boolean;
        constrainDuringPan?: boolean;
        wrapHorizontal?: boolean;
        wrapVertical?: boolean;
        minZoomImageRatio?: number;
        maxZoomPixelRatio?: number;
        smoothTileEdgesMinZoom?: number;
        iOSDevice?: boolean;
        autoResize?: boolean;
        preserveImageSizeOnResize?: boolean;
        minScrollDeltaTime?: number;
        rotationIncrement?: number;
        maxTilesPerFrame?: number;
        pixelsPerWheelLine?: number;
        pixelsPerArrowPress?: number;
        visibilityRatio?: number;
        viewportMargins?: object;
        imageLoaderLimit?: number;
        clickTimeThreshold?: number;
        clickDistThreshold?: number;
        dblClickTimeThreshold?: number;
        dblClickDistThreshold?: number;
        springStiffness?: number;
        animationTime?: number;
        gestureSettingsMouse?: GestureSettings;
        gestureSettingsTouch?: GestureSettings;
        gestureSettingsPen?: GestureSettings;
        gestureSettingsUnknown?: GestureSettings;
        zoomPerClick?: number;
        zoomPerScroll?: number;
        zoomPerDblClickDrag?: number;
        zoomPerSecond?: number;
        showNavigator?: boolean;
        navigatorElement?: Element;
        navigatorId?: string;
        navigatorPosition?: "TOP_LEFT" | "TOP_RIGHT" | "BOTTOM_LEFT" | "BOTTOM_RIGHT" | "ABSOLUTE";
        navigatorSizeRatio?: number;
        navigatorMaintainSizeRatio?: boolean;
        navigatorTop?: number | string;
        navigatorLeft?: number | string;
        navigatorHeight?: number | string;
        navigatorWidth?: number | string;
        navigatorAutoFade?: boolean;
        navigatorRotate?: boolean;
        navigatorBackground?: string;
        navigatorOpacity?: number;
        navigatorBorderColor?: string;
        navigatorDisplayRegionColor?: string;
        controlsFadeDelay?: number;
        controlsFadeLength?: number;
        maxImageCacheCount?: number;
        timeout?: number;
        tileRetryMax?: number;
        tileRetryDelay?: number;
        /**
         * @deprecated Use the `drawer` option to specify preferred renderer.
         */
        useCanvas?: boolean;
        minPixelRatio?: number;
        mouseNavEnabled?: boolean;
        showNavigationControl?: boolean;
        navigationControlAnchor?: ControlAnchor;
        showZoomControl?: boolean;
        showHomeControl?: boolean;
        showFullPageControl?: boolean;
        showRotationControl?: boolean;
        showFlipControl?: boolean;
        showSequenceControl?: boolean;
        sequenceControlAnchor?: ControlAnchor;
        navPrevNextWrap?: boolean;
        toolbar?: string | Element;
        zoomInButton?: string | Element;
        zoomOutButton?: string | Element;
        homeButton?: string | Element;
        fullPageButton?: string | Element;
        rotateLeftButton?: string | Element;
        rotateRightButton?: string | Element;
        previousButton?: string | Element;
        nextButton?: string | Element;
        sequenceMode?: boolean;
        /**
         * If sequenceMode is true, display this page initially.
         * @default 0
         */
        initialPage?: number;
        preserveViewport?: boolean;
        preserveOverlays?: boolean;
        showReferenceStrip?: boolean;
        referenceStripScroll?: string;
        referenceStripElement?: HTMLElement;
        referenceStripHeight?: number;
        referenceStripWidth?: number;
        referenceStripPosition?: string;
        referenceStripSizeRatio?: number;
        collectionMode?: boolean;
        collectionRows?: number;
        collectionColumns?: number;
        collectionLayout?: "horizontal" | "vertical";
        collectionTileSize?: number;
        collectionTileMargin?: number;
        crossOriginPolicy?: "Anonymous" | "use-credentials" | false;
        ajaxWithCredentials?: boolean;
        loadTilesWithAjax?: boolean;
        ajaxHeaders?: object;
        splitHashDataForPost?: boolean;
    }

    interface TileSourceOptions {
        url?: string;
        referenceStripThumbnailUrl?: string;
        success?: ((event: Event) => void);
        ajaxWithCredentials?: boolean;
        ajaxHeaders?: object;
        splitHashDataForPost?: boolean;
        width?: number;
        height?: number;
        tileSize?: number;
        tileWidth?: number;
        tileHeight?: number;
        tileOverlap?: number;
        minLevel?: number;
        maxLevel?: number;
        getTileUrl?: ((l: number, x: number, y: number) => string);
    }

    class Button extends EventSource<ButtonEventMap> {
        currentState: ButtonState;
        element: Element;
        fadeDelay: number;
        fadeLength: number;
        tracker: MouseTracker;

        constructor(options: {
            userData?: string;
            element?: Element;
            tooltip?: string;
            srcRest?: string;
            srcGroup?: string;
            srcHover?: string;
            srcDown?: string;
            fadeDelay?: number;
            fadeLength?: number;
            onPress?: EventHandler<ButtonEvent>;
            onRelease?: EventHandler<ButtonEvent>;
            onClick?: EventHandler<ButtonEvent>;
            onEnter?: EventHandler<ButtonEvent>;
            onExit?: EventHandler<ButtonEvent>;
            onFocus?: EventHandler<ButtonEvent>;
            onBlur?: EventHandler<ButtonEvent>;
        });
        disable(): void;
        enable(): void;
        notifyGroupEnter(): void;
        notifyGroupExit(): void;
        destroy(): void;
    }

    class ButtonGroup {
        buttons: Button[];
        element: Element;
        tracker: MouseTracker;

        constructor(options: { buttons: Button[]; element?: Element });

        addButton(button: Button): void;
        destroy(): void;
    }

    interface TControlOptions {
        anchor?: ControlAnchor;
        attachToViewer?: boolean;
        autoFade?: boolean;
    }

    class Control {
        anchor: ControlAnchor;
        autoFade: boolean;
        container: Element;
        element: Element;
        wrapper: Element;

        constructor(element: Element, options: TControlOptions, container: Element);

        destroy(): void;
        isVisible(): boolean;
        setOpacity(opacity: number): void;
        setVisible(visible: boolean): void;
    }

    class ControlDock {
        constructor(options: object);

        addControl(element: string | Element, controlOptions: TControlOptions): void;
        areControlsEnabled(): boolean;
        clearControls(): ControlDock;
        removeControl(element: Control): ControlDock;
        setControlsEnabled(enabled: boolean): ControlDock;
    }

    class DisplayRect extends Rect {
        maxLevel: number;
        minLevel: number;

        constructor(x: number, y: number, width: number, height: number, minLevel: number, maxLevel: number);
    }

    class Drawer {
        canvas: HTMLCanvasElement | HTMLElement;
        container: Element;
        context: CanvasRenderingContext2D | null;
        // element : Element; // Deprecated

        constructor(options: {
            viewer: Viewer;
            viewport: Viewport;
            element: Element;
            debugGridColor?: string;
        });

        blendSketch(options: {
            opacity: number;
            scale?: number;
            translate?: Point;
            compositeOperation?: string;
            bounds?: Rect;
        }): void;
        canRotate(): boolean;
        clear(): void;
        destroy(): void;
        drawTile(
            tile: Tile,
            drawingHandler: (context: CanvasRenderingContext2D, tile: any, rendered: any) => void, // TODO: determine handler parameter types
            useSketch: boolean,
            scale?: number,
            translate?: Point,
        ): void;
        getCanvasSize(sketch: boolean): Point;
        getOpacity(): number;
        setOpacity(opacity: number): Drawer;
        viewportToDrawerRectangle(rectangle: Rect): Rect;
        setImageSmoothingEnabled(imageSmoothingEnabled?: boolean): void;
        viewportCoordToDrawerCoord(point: Point): Point;
        clipWithPolygons(polygons: Point[][], useSketch?: boolean): void;
    }

    class DrawerBase {
        constructor(options: { viewer: Viewer; viewport: Viewport; element: HTMLElement });
        static isSupported(): boolean;
        canRotate(): boolean;
        destroy(): void;
        drawDebuggingRect(rect: Rect): void;
        getType(): string | undefined;
        setImageSmoothingEnabled(imageSmoothingEnabled: boolean): void;
        viewportCoordToDrawerCoord(point: Point): Point;
        viewportToDrawerRectangle(rectangle: Rect): Rect;
    }

    interface TDrawerOptions {
        viewer: Viewer;
        viewport: Viewport;
        element: Element;
        debugGridColor?: number;
    }

    class CanvasDrawer extends DrawerBase {
        canvas: Element;
        container: Element;

        constructor(options: TDrawerOptions);
    }

    class DziTileSource extends TileSource {
        tilesUrl: string;
        fileFormat: string;
        displayRects: DisplayRect[];

        constructor(
            width: number | object,
            height: number,
            tileSize: number,
            tileOverlap: number,
            tilesUrl: string,
            fileFormat: string,
            displayRects: DisplayRect[],
        );
    }

    class EventSource<EventMap extends Record<string, any> = any> {
        addHandler<K extends keyof EventMap>(
            eventName: K,
            handler: EventHandler<EventMap[K]>,
            userData?: object,
            priority?: number,
        ): boolean;
        addOnceHandler<K extends keyof EventMap>(
            eventName: K,
            handler: EventHandler<EventMap[K]>,
            userData?: object,
            times?: number,
            priority?: number,
        ): boolean;
        getHandler<K extends keyof EventMap>(eventName: K): void;
        numberOfHandlers<K extends keyof EventMap>(eventName: K): number;
        raiseEvent<K extends keyof EventMap>(eventName: K, eventArgs: object): boolean;
        removeAllHandlers<K extends keyof EventMap>(eventName?: K): boolean;
        removeHandler<K extends keyof EventMap>(eventName: K, handler: EventHandler<EventMap[K]>): boolean;
    }

    class HTMLDrawer extends DrawerBase {
        canvas: Element;
        container: Element;
        constructor(options: TDrawerOptions);
    }

    class IIIFTileSource extends TileSource {
        constructor(options: TileSourceOptions & { tileFormat?: string });
    }

    interface TImageJobOptions {
        src?: string;
        tile?: Tile;
        source?: TileSource;
        loadWithAjax?: string;
        ajaxHeaders?: Record<string, string>;
        ajaxWithCredentials?: boolean;
        crossOriginPolicy?: string;
        postData?: string | null;
        userData?: any;
        abort?(): void;
        callback?(): void;
        timeout?: number;
        tries?: number;
    }

    class ImageJob {
        data: any;
        userData: any;
        constructor(options: TImageJobOptions);
        finish(data: any, request: XMLHttpRequest, errorMessage: string): void;
        start(): void;
    }

    class ImageLoader {
        constructor(options: { jobLimit?: number; timeout?: number });

        addJob(options: TImageJobOptions): void;
        clear(): void;
    }

    class ImageTileSource extends TileSource {
        constructor(options: {
            url: string;
            buildPyramid?: boolean;
            crossOriginPolicy?: string | boolean;
            ajaxWithCredentials?: string | boolean;
        });
        _freeupCanvasMemory(): void;
        destroy(viewer: Viewer): void;
        getContext2D(level: number, x: number, y: number): CanvasRenderingContext2D | null;
    }

    class LegacyTileSource extends TileSource {
        constructor(
            aspectRatio: number,
            dimensions: number,
            tileSize: number,
            tileOverlap: number,
            minLevel: number,
            maxLevel: number,
            levels?: Array<{
                url: string;
                width: number;
                height: number;
            }>,
        );
    }

    class Mat3 {
        constructor(values: any[]);
        multiply(other: Mat3): Mat3;
        static makeIdentity(): Mat3;
        static makeRotation(angleInRadians: number): Mat3;
        static makeScaling(sx: number, sy: number): Mat3;
        static makeTranslation(tx: number, ty: number): Mat3;
    }

    interface MouseTrackerOptions {
        element: Element | string;
        startDisabled?: boolean;
        clickTimeThreshold?: number;
        clickDistThreshold?: number;
        dblClickTimeThreshold?: number;
        dblClickDistThreshold?: number;
        stopDelay?: number;
        preProcessEventHandler?: PreprocessEventHandler;
        contextMenuHandler?: EventHandler<ContextMenuMouseTrackerEvent>;
        enterHandler?: EventHandler<MouseTrackerEvent>;
        /**
         * @deprecated use leaveHandler instead
         */
        exitHandler?: EventHandler<MouseTrackerEvent>;
        leaveHandler?: EventHandler<MouseTrackerEvent>;
        overHandler?: EventHandler<MouseTrackerEvent>;
        outHandler?: EventHandler<MouseTrackerEvent>;
        pressHandler?: EventHandler<PressMouseTrackerEvent>;
        nonPrimaryPressHandler?: EventHandler<MouseTrackerEvent>;
        releaseHandler?: EventHandler<MouseTrackerEvent>;
        nonPrimaryReleaseHandler?: EventHandler<MouseTrackerEvent>;
        moveHandler?: EventHandler<MouseTrackerEvent>;
        scrollHandler?: EventHandler<MouseTrackerEvent>;
        clickHandler?: EventHandler<MouseTrackerEvent>;
        dblClickHandler?: EventHandler<MouseTrackerEvent>;
        dragHandler?: EventHandler<MouseTrackerEvent>;
        dragEndHandler?: EventHandler<MouseTrackerEvent>;
        pinchHandler?: EventHandler<MouseTrackerEvent>;
        keyDownHandler?: EventHandler<MouseTrackerEvent>;
        keyUpHandler?: EventHandler<MouseTrackerEvent>;
        keyHandler?: EventHandler<MouseTrackerEvent>;
        focusHandler?: EventHandler<MouseTrackerEvent>;
        blurHandler?: EventHandler<MouseTrackerEvent>;
        userData?: object;
    }

    class MouseTracker {
        clickTimeThreshold: number;
        clickDistThreshold: number;
        dblClickTimeThreshold: number;
        dblClickDistThreshold: number;
        element: Element;

        constructor(options: MouseTrackerOptions);

        blurHandler: EventHandler<MouseTrackerEvent>;
        clickHandler: EventHandler<MouseTrackerEvent>;
        contextMenuHandler: EventHandler<ContextMenuMouseTrackerEvent>;
        dblClickHandler: EventHandler<MouseTrackerEvent>;
        destroy(): void;
        dragEndHandler: EventHandler<MouseTrackerEvent>;
        dragHandler: EventHandler<MouseTrackerEvent>;
        enterHandler: EventHandler<MouseTrackerEvent>;
        /**
         * @deprecated use leaveHandler instead
         */
        exitHandler: EventHandler<MouseTrackerEvent>;
        leaveHandler: EventHandler<MouseTrackerEvent>;
        focusHandler: EventHandler<MouseTrackerEvent>;
        getActivePointerCount(): number;
        getActivePointersListByType(type: string): GesturePointList;
        /**
         * @deprecated Just use `this.tracking`
         */
        isTracking(): boolean;
        keyDownHandler: EventHandler<KeyMouseTrackerEvent>;
        keyHandler: EventHandler<KeyMouseTrackerEvent>;
        keyUpHandler: EventHandler<KeyMouseTrackerEvent>;
        moveHandler: EventHandler<MouseTrackerEvent>;
        nonPrimaryPressHandler: EventHandler<MouseTrackerEvent>;
        nonPrimaryReleaseHandler: EventHandler<MouseTrackerEvent>;
        overHandler: EventHandler<MouseTrackerEvent>;
        outHandler: EventHandler<MouseTrackerEvent>;
        pinchHandler: EventHandler<MouseTrackerEvent>;
        pressHandler: EventHandler<PressMouseTrackerEvent>;
        preProcessEventHandler: PreprocessEventHandler;
        releaseHandler: EventHandler<MouseTrackerEvent>;
        scrollHandler: EventHandler<MouseTrackerEvent>;
        setTracking(track: boolean): MouseTracker;
        stopHandler: EventHandler<MouseTrackerEvent>;
    }

    interface EventProcessInfo {
        eventSource: MouseTracker;
        originalEvent: Event;
        originalTarget: Element;
        eventPhase: EventPhase;
        eventType:
            | "keydown"
            | "keyup"
            | "keypress"
            | "focus"
            | "blur"
            | "contextmenu"
            | "gotpointercapture"
            | "lostpointercapture"
            | "pointerenter"
            | "pointerleave"
            | "pointerover"
            | "pointerout"
            | "pointerdown"
            | "pointerup"
            | "pointermove"
            | "pointercancel"
            | "wheel"
            | "click"
            | "dblclick";
        pointerType: string;
        isEmulated: boolean;
        isStoppable: boolean;
        isCancelable: boolean;
        defaultPrevented: boolean;
        preventDefault: boolean;
        preventGesture: boolean;
        stopPropagation: boolean;
        shouldCapture: boolean;
        shouldReleaseCapture: boolean;
        userData: unknown;
    }

    interface GesturePoint {
        id: number;
        type: string;
        captured: boolean;
        isPrimary: boolean;
        insideElementPressed: boolean;
        insideElement: boolean;
        speed: number;
        direction: number;
        contactPos: Point;
        contactTime: number;
        lastPos: Point;
        lastTime: number;
        currentPos: Point;
        currentTime: number;
    }

    class GesturePointList {
        buttons: number;
        captureCount: number;
        clicks: number;
        contacts: number;
        type: string;

        constructor(type: string);

        add(gesturePoint: GesturePoint): number;
        addContact(): void;
        asArray(): GesturePoint[];
        getById(id: number): GesturePoint | null;
        getByIndex(index: number): GesturePoint | null;
        getLength(): number;
        getPrimary(): GesturePoint | null;
        removeById(id: number): number;
        removeContact(): void;
    }

    class Navigator extends Viewer {
        setFlip(state: boolean): void;
        update(viewport?: Viewport): void;
        updateSize(): void;
        setWidth(width: number | string): void;
        setHeight(width: number | string): void;
    }

    class OsmTileSource extends TileSource {
        constructor(width: number | object, height: number, tileSize: number, tileOverlap: number, tilesUrl: string);
    }

    type OnDrawCallback = (position: Point, size: Point, element: Element) => void;

    interface OverlayOptions {
        element: Element;
        location: Point | Rect;
        placement?: Placement;
        onDraw?: OnDrawCallback;
        checkResize?: boolean;
        width?: number;
        height?: number;
        rotationMode?: OverlayRotationMode;
    }

    class Overlay {
        constructor(options: OverlayOptions);
        adjust(position: Point, size: Point): void;
        destroy(): void;
        drawHTML(container: Element): void;
        getBounds(viewport: Viewport): Rect;
        update(location: Point | Rect | object, placement: Placement): void;
    }

    class Point {
        x: number;
        y: number;
        constructor(x?: number, y?: number);
        apply(func: (v: number) => number): Point;
        clone(): Point;
        distanceTo(point: Point): number;
        divide(factor: number): Point;
        equals(point: Point): boolean;
        minus(point: Point): Point;
        negate(): Point;
        plus(point: Point): Point;
        rotate(degrees: number, pivot?: Point): Point;
        squaredDistanceTo(point: Point): number;
        times(factor: number): Rect;
        toString(): string;
    }

    class Rect {
        x: number;
        y: number;
        width: number;
        height: number;
        degrees: number;
        constructor(x?: number, y?: number, width?: number, height?: number, degrees?: number);
        clone(): Rect;
        containsPoint(point: Point, epsilon?: number): boolean;
        equals(rectangle: Rect): boolean;
        getAspectRatio(): number;
        getBottomLeft(): Point;
        getBottomRight(): Point;
        getBoundingBox(): Rect;
        getCenter(): Point;
        getIntegerBoundingBox(): Rect;
        getSize(): Point;
        getTopLeft(): Point;
        getTopRight(): Point;
        intersection(rect: Rect): Rect;
        rotate(degrees: number, pivot?: Rect): Rect;
        times(factor: number): Rect;
        toString(): string;
        translate(delta: Point): Rect;
        union(rect: Rect): Rect;
    }

    class ReferenceStrip {
        constructor(options: object);
        setFocus(): void;
        update(): void;
    }

    interface TSpringObj {
        value: number;
        time: number;
    }

    class Spring {
        animationTime: number;
        current: TSpringObj;
        springStiffness: number;
        start: TSpringObj;
        target: TSpringObj;
        constructor(options: {
            springStiffness: number;
            animationTime: number;
            initial?: number;
            exponential?: boolean;
        });
        isAtTargetValue(): boolean;
        resetTo(target: number): void;
        shiftBy(delta: number): void;
        springTo(target: number): void;
        update(): void;
    }

    class Tile {
        ajaxHeaders: object;
        beingDrawn: boolean;
        blendStart: number;
        bounds: Rect;
        cacheKey: string;
        context2D: CanvasRenderingContext2D;
        element: Element;
        exists: boolean;
        flipped: boolean;
        hasTransparency: boolean;
        /**
         * @deprecated use `getImage()` instead
         */
        image: object;
        imgElement: HTMLImageElement;
        isBottomMost: boolean;
        isRightMost: boolean;
        lastTouchTime: number;
        level: number;
        loaded: boolean;
        loading: boolean;
        loadWithAjax: boolean;
        opacity: number;
        position: Point;
        positionedBounds: Rect;
        postData: string;
        size: Point;
        sourceBounds: Rect;
        style: string;
        /**
         * @deprecated use `getUrl()` instead
         */
        url: string;
        visibility: number;
        x: number;
        y: number;

        constructor(
            level: number,
            x: number,
            y: number,
            bounds: Rect,
            exists: boolean,
            url: string,
            context2D: CanvasRenderingContext2D,
            loadWithAjax: boolean,
            ajaxHeaders: object,
            sourceBounds: Rect,
            postData: string,
            cacheKey: string,
        );
        getCanvasContext(): CanvasRenderingContext2D;
        getImage(): object;
        drawCanvas(
            context: CanvasRenderingContext2D,
            drawingHandler: (context: CanvasRenderingContext2D, tile: any, rendered: any) => void,
            scale?: number,
            translate?: Point,
        ): void;
        drawHTML(container: Element): void;
        getScaleForEdgeSmoothing(): number;
        getTranslationForEdgeSmoothing(scale?: number): Point;
        getUrl(): string;
        toString(): string;
        unload(): void;
    }

    class TileCache {
        constructor(options: { maxImageCacheCount?: number });
        cacheTile(options: {
            tile: Tile;
            image: HTMLImageElement; // TODO: check type
            tiledImage: TiledImage;
            cutoff?: number;
        }): void;
        clearTilesFor(tiledImage: TiledImage): void;
        numTilesLoaded(): number;
    }

    interface TiledImageInitOptions {
        source: TileSource;
        viewer: Viewer;
        tileCache: TileCache;
        drawer: Drawer;
        imageLoader: ImageLoader;
        x?: number;
        y?: number;
        width?: number;
        height?: number;
        fitBounds?: Rect;
        fitBoundsPlacement?: Placement;
        clip?: Rect;
        springStiffness?: number;
        animationTime?: boolean;
        minZoomImageRatio?: number;
        wrapHorizontal?: boolean;
        wrapVertical?: boolean;
        immediateRender?: boolean;
        blendTime?: number;
        alwaysBlend?: boolean;
        minPixelRatio?: number;
        smoothTileEdgesMinZoom?: number;
        iOSDevice?: boolean;
        opacity?: number;
        preload?: boolean;
        compositeOperation?: string;
        debugMode?: boolean;
        placeholderFillStyle?: string | CanvasGradient | CanvasPattern;
        crossOriginPolicy?: string | boolean;
        ajaxWithCredentials?: boolean;
        loadTilesWithAjax?: boolean;
        ajaxHeaders?: object;
    }

    class TiledImage extends EventSource<TiledImageEventMap> {
        source: TileSource;
        constructor(options: TiledImageInitOptions);

        destroy(): void;
        draw(): void;
        fitBounds(bounds: Rect, anchor?: Placement, immediately?: boolean): void;
        getBounds(current?: boolean): Rect;
        getBoundsNoRotate(current?: boolean): Rect;
        getClip(): Rect | null;
        getClippedBounds(current?: boolean): Rect;
        getCompositeOperation(): string;
        getContentSize(): Point;
        getDrawArea(): Rect;
        getFullyLoaded(): boolean;
        getFlip(): boolean;
        getOpacity(): number;
        getPreload(): boolean;
        getRotation(current?: boolean): number;
        getSizeInWindowCoordinates(): Point;
        getTileBounds(level: number, x: number, y: number): Rect;
        getTilesToDraw(): any[];
        imageToViewerElementCoordinates(pixel: Point): Point;
        imageToViewportCoordinates(position: Point, current?: boolean): Point;
        imageToViewportCoordinates(imageX: number, imageY: number, current?: boolean): Point;
        imageToViewportRectangle(
            imageX: number,
            imageY?: number,
            pixelWidth?: number,
            pixelHeight?: number,
            current?: boolean,
        ): Rect;
        imageToViewportRectangle(position: Rect, pixelWidth?: number, pixelHeight?: number, current?: boolean): Rect;

        imageToViewportZoom(imageZoom: number): number;
        imageToWindowCoordinates(pixel: Point): Point;
        needsDraw(): boolean;
        redraw(): void;
        reset(): void;
        resetCroppingPolygons(): void;
        setAjaxHeaders(ajaxHeaders: object, propagate?: boolean): void;
        setClip(newClip: Rect | null): void;
        setCompositeOperation(compositeOperation: string): void;
        setCroppingPolygons(polygons: Point[][]): void;
        setDrawn(): boolean;
        setFlip(flip: boolean): void;
        setHeight(height: number, immediately?: boolean): void;
        setOpacity(opacity: number): void;
        setPosition(position: Point, immediately?: boolean): void;
        setPreload(preload: boolean): void;
        setRotation(degrees: number, immediately?: boolean): void;
        setWidth(width: number, immediately?: boolean): void;
        update(viewportChanged: boolean): boolean;
        viewerElementToImageCoordinates(pixel: Point): Point;
        viewportToImageCoordinates(position: Point, current?: boolean): Point;
        viewportToImageCoordinates(viewerX: number, viewerY: number, current?: boolean): Point;
        viewportToImageRectangle(position: Rect, current?: boolean): Rect;
        viewportToImageRectangle(
            viewportX: number,
            viewportY: number,
            pixelWidth?: number,
            pixelHeight?: number,
            current?: boolean,
        ): Rect;
        viewportToImageZoom(viewportZoom: number): number;
        windowToImageCoordinates(pixel: Point): Point;
    }

    interface ConfigureOptions {
        [key: string]: any;
    }

    class TileSource extends EventSource<TileSourceEventMap> {
        aspectRatio: number;
        dimensions: Point;
        maxLevel: number;
        minLevel: number;
        ready: boolean;
        tileOverlap: number;

        constructor(options: TileSourceOptions);
        configure(data: string | object | any[] | Document, url: string, postData: string): ConfigureOptions;
        createTileCache(cacheObject: object, data: any, tile: Tile): void;
        destroyTileCache(cacheObject: object): void;
        downloadTileAbort(context: ImageJob): void;
        downloadTileStart(context: ImageJob): void;
        getClosestLevel(): number;
        getImageInfo(url: string): void;
        getLevelScale(level: number): number;
        getNumTiles(level: number): number;
        getPixelRatio(level: number): number;
        getTileAjaxHeaders(level: number, x: number, y: number): object;
        getTileAtPoint(level: number, point: Point): Tile;
        getTileBounds(level: number, x: number, y: number, isSource?: boolean): Rect;
        getTileCacheData(cacheObject: object): any;
        getTileCacheDataAsContext2D(cacheObject: object): CanvasRenderingContext2D;
        getTileCacheDataAsImage(cacheObject: object): HTMLImageElement;
        getTileHashKey(level: number, x: number, y: number, url: string, ajaxHeaders: object, postData: any): void;
        getTileHeight(level: number): number;
        getTilePostData(level: number, x: number, y: number): any;
        getTileUrl(level: number, x: number, y: number): string | (() => string);
        getTileWidth(level: number): number;
        hasTransparency(): boolean;
        setMaxLevel(level: number): void;
        supports(data: string | object | any[] | Document, url: string): boolean;
        tileExists(level: number, x: number, y: number): boolean;
    }

    class TmsTileSource extends TileSource {
        constructor(width: number, height: number, tileSize: number, tileOverlap: number, tilesUrl: string);
    }

    interface ImageOptions {
        index?: number;
        replace?: boolean;
        x?: number;
        y?: number;
        width?: number;
        height?: number;
        fitBounds?: Rect;
        fitBoundsPlacement?: Placement;
        clip?: Rect;
        opacity?: number;
        preload?: boolean;
        degrees?: number;
        flipped?: boolean;
        compositeOperation?: string;
        crossOriginPolicy?: string;
        ajaxWithCredentials?: boolean;
        loadTilesWithAjax?: boolean;
        ajaxHeaders?: object;
        success?: ((event: Event) => void);
        error?: ((error: Error) => void);
        collectionImmediately?: boolean;
        placeholderFillStyle?: string | CanvasGradient | CanvasPattern;
    }

    interface TiledImageOptions extends ImageOptions {
        tileSource: string | object;
    }

    interface SimpleImageOptions extends ImageOptions {
        url: string;
    }

    class Viewer {
        canvas: Element;
        container: Element;
        drawer: Drawer;
        element: Element;
        initialPage: number;
        navigator: Navigator;
        viewport: Viewport;
        world: World;
        referenceStrip: ReferenceStrip;

        constructor(options: Options);
        _cancelPendingImages(): void;
        addButton(button: Button): void;
        addOverlay(
            element: Element | string | OverlayOptions,
            location?: Point | Rect,
            placement?: Placement,
            onDraw?: (element: HTMLElement, location: Location, placement: Placement) => void,
        ): Viewer;
        addReferenceStrip(): void;
        addSimpleImage(options: SimpleImageOptions): void;
        addTiledImage(options: TiledImageOptions): void;
        bindSequenceControls(): Viewer;
        bindStandardControls(): Viewer;
        clearOverlays(): Viewer;
        close(): Viewer;
        currentPage(): number;
        destroy(): void;
        forceRedraw(): Viewer;
        forceResize(): void;
        gestureSettingsByDeviceType(type: string): GestureSettings;
        getOverlayById(element: Element | string): Overlay;
        goToNextPage(): void;
        goToPage(page: number): Viewer;
        goToPreviousPage(): void;
        isFullPage(): boolean;
        isFullScreen(): boolean;
        isMouseNavEnabled(): boolean;
        isOpen(): boolean;
        isVisible(): boolean;
        open(tileSources: string | object | TileSource[], initialPage?: number): Viewer;
        removeOverlay(overlay: Element | string): Viewer;
        removeReferenceStrip(): void;
        requestDrawer(drawerCandidate: string | DrawerBase, options: {
            mainDrawer?: boolean;
            redrawImmediately?: boolean;
            drawerOptions: object;
        }): object | boolean;
        setAjaxHeaders(ajaxHeaders: object, propagate?: boolean): void;
        setDebugMode(debug: boolean): Viewer;
        setFullPage(fullScreen: boolean): Viewer;
        setFullScreen(fullScreen: boolean): Viewer;
        setMouseNavEnabled(enabled: boolean): Viewer;
        setVisible(visible: boolean): Viewer;
        updateOverlay(element: Element | string, location: Point | Rect, placement?: Placement): Viewer;
    }

    interface Viewer extends ControlDock, EventSource<ViewerEventMap> {}

    interface ViewportOptions {
        margins: object;
        springStiffness?: number;
        animationTime?: number;
        minZoomImageRatio?: number;
        maxZoomPixelRatio?: number;
        visibilityRatio?: number;
        wrapHorizontal?: boolean;
        wrapVertical?: boolean;
        defaultZoomLevel?: number;
        minZoomLevel?: number;
        maxZoomLevel?: number;
        degrees?: number;
        homeFillsViewer?: boolean;
        silenceMultiImageWarnings?: boolean;
    }

    class Viewport {
        constructor(options: ViewportOptions);

        applyConstraints(immediately?: boolean): Viewport;
        deltaPixelsFromPoints(deltaPoints: Point, current?: boolean): Point;
        deltaPixelsFromPointsNoRotate(deltaPoints: Point, current?: boolean): Point;
        deltaPointsFromPixels(deltaPoints: Point, current?: boolean): Point;
        deltaPointsFromPixelsNoRotate(deltaPoints: Point, current?: boolean): Point;
        ensureVisible(immediately?: boolean): Viewport;
        fitBounds(bounds: Rect, immediately?: boolean): Viewport;
        fitBoundsWithConstraints(bounds: Rect, immediately?: boolean): Viewport;
        fitHorizontally(immediately?: boolean): Viewport;
        fitVertically(immediately?: boolean): Viewport;
        getAspectRatio(): number;
        getBounds(current?: boolean): Rect;
        getBoundsNoRotate(current?: boolean): Rect;
        getBoundsNoRotateWithMargins(current?: boolean): Rect;
        getBoundsWithMargins(current?: boolean): Rect;
        getCenter(current?: boolean): Point;
        getConstrainedBounds(current?: boolean): Rect;
        getContainerSize(): Point;
        getFlip(): boolean;
        getHomeBounds(): Rect;
        getHomeBoundsNoRotate(): Rect;
        getHomeZoom(): number;
        getMargins(): object;
        getMaxZoom(): number;
        getMaxZoomPixelRatio(): number;
        getMinZoom(): number;
        getRotation(current?: boolean): number;
        getZoom(current?: boolean): number;
        goHome(immediately?: boolean): Viewport;
        imageToViewerElementCoordinates(pixel: Point): Point;
        imageToViewportCoordinates(position: Point): Point;
        imageToViewportCoordinates(imageX: number, imageY: number): Point;
        imageToViewportCoordinates(imageX: number, imageY: number, pixelWidth: number, pixelHeight: number): Point;
        imageToViewportRectangle(
            imageX: number | Rect,
            imageY?: number,
            pixelWidth?: number,
            pixelHeight?: number,
        ): Rect;
        imageToViewportZoom(imageZoom: number): number;
        imageToWindowCoordinates(pixel: Point): Point;
        panBy(delta: Point, immediately?: boolean): Viewport;
        panTo(center: Point, immediately?: boolean): Viewport;
        pixelFromPoint(point: Point, current?: boolean): Point;
        pixelFromPointNoRotate(point: Point, current?: boolean): Point;
        pointFromPixel(point: Point, current?: boolean): Point;
        pointFromPixelNoRotate(point: Point, current?: boolean): Point;
        resetContentSize(contentSize: Point): Viewport;
        resize(): Viewport;
        rotateBy(degrees: number, pivot?: Point): Viewport;
        rotateTo(degrees: number, pivot?: Point, immediately?: boolean): Viewport;
        setFlip(state: boolean): Viewport;
        setMargins(margins: object): void;
        setMaxZoomPixelRatio(ratio: number, applyConstraints?: boolean, immediately?: boolean): void;
        setRotation(degrees: number, immediately?: boolean): Viewport;
        setRotationWithPivot(degrees: number, pivot?: Point, immediately?: boolean): Viewport;
        toggleFlip(): Viewport;
        update(): boolean;
        viewerElementToImageCoordinates(pixel: Point): Point;
        viewerElementToViewportCoordinates(pixel: Point): Point;
        viewerElementToViewportRectangle(rectangle: Rect): Rect;
        viewportToImageCoordinates(position: Point): Point;
        viewportToImageCoordinates(viewerX: number, viewerY: number): Point;
        viewportToImageRectangle(rectangle: Rect): Rect;
        viewportToImageRectangle(viewerX: number, viewerY: number, pointWidth: number, pointHeight: number): Rect;
        viewportToImageZoom(viewportZoom: number): number;
        viewportToViewerElementCoordinates(point: Point): Point;
        viewportToViewerElementRectangle(rectangle: Rect): Rect;
        viewportToWindowCoordinates(point: Point): Point;
        windowToImageCoordinates(pixel: Point): Point;
        windowToViewportCoordinates(pixel: Point): Point;
        zoomBy(factor: number, refPoint?: Point, immediately?: boolean): Viewport;
        zoomTo(factor: number, refPoint?: Point, immediately?: boolean): Viewport;
    }

    class WebGLDrawer extends DrawerBase {
        canvas: Element;
        container: Element;

        constructor(options: TDrawerOptions);

        draw(tiledImages: any[]): void;
    }

    class World extends EventSource<WorldEventMap> {
        constructor(options: object);
        addItem(item: TiledImage, options?: { index?: number }): void;
        arrange(options: {
            immediately?: boolean;
            layout?: "horizontal" | "vertical";
            rows?: number;
            columns?: number;
            tileSize?: number;
            tileMargin?: number;
        }): void;
        draw(): void;
        getContentFactor(): number;
        getHomeBounds(): Rect;
        getIndexOfItem(item: TiledImage): number;
        getItemAt(id: number): TiledImage;
        getItemCount(): number;
        needsDraw(): boolean;
        removeAll(): void;
        removeItem(item: TiledImage): void;
        resetItems(): void;
        setAutoRefigureSizes(value?: boolean): void;
        setItemIndex(item: TiledImage, index: number): void;
        update(viewportChanged: boolean): void;
    }

    class ZoomifyTileSource extends TileSource {
        constructor(width: number, height: number, tileSize: number, tilesUrl: string);
    }

    type EventHandler<T> = (event: T) => void;

    interface DrawerOptions {
        webgl?: object;
        canvas?: object;
        html?: object;
        custom?: object;
    }

    type PreprocessEventHandler = (event: EventProcessInfo) => void;

    interface ButtonEventMap {
        "blur": ButtonEvent;
        "click": ButtonEvent;
        "enter": ButtonEvent;
        "exit": ButtonEvent;
        "focus": ButtonEvent;
        "press": ButtonEvent;
        "release": ButtonEvent;
    }

    interface TiledImageEventMap {
        "bounds-change": TiledImageEvent;
        "clip-change": TiledImageEvent;
        "composite-operation-change": CompositeOperationChangeTiledImageEvent;
        "fully-loaded-change": FullyLoadedChangeTiledImageEvent;
        "opacity-change": OpacityChangeTiledImageEvent;
    }

    interface TileSourceEventMap {
        "open-failed": OpenFailedTileSourceEvent;
        "ready": ReadyTileSourceEvent;
    }

    interface ViewerEventMap {
        "add-item-failed": AddItemFailedEvent;
        "add-overlay": AddOverlayEvent;
        "after-resize": AfterResizeEvent;
        "animation": ViewerEvent;
        "animation-finish": ViewerEvent;
        "animation-start": ViewerEvent;
        "before-destroy": ViewerEvent;
        "canvas-blur": CanvasTrackerEvent;
        "canvas-click": CanvasClickEvent;
        "canvas-contextmenu": CanvasContextMenuEvent;
        "canvas-double-click": CanvasDoubleClickEvent;
        "canvas-drag": CanvasDragEvent;
        "canvas-drag-end": CanvasDragEvent;
        "canvas-enter": CanvasEnterEvent;
        "canvas-exit": CanvasExitEvent;
        "canvas-focus": CanvasTrackerEvent;
        "canvas-key": CanvasKeyEvent;
        "canvas-key-press": CanvasOriginalEvent;
        "canvas-nonprimary-press": CanvasNonPrimaryButtonEvent;
        "canvas-nonprimary-release": CanvasNonPrimaryButtonEvent;
        "canvas-pinch": CanvasPinchEvent;
        "canvas-press": CanvasPressEvent;
        "canvas-release": CanvasReleaseEvent;
        "canvas-scroll": CanvasScrollEvent;
        "clear-overlay": ViewerEvent;
        "close": ViewerEvent;
        "constrain": ConstrainEvent;
        "container-enter": ContainerEvent;
        "container-exit": ContainerEvent;
        "controls-enabled": ControlsEnabledEvent;
        "destroy": ViewerEvent;
        "flip": FlipEvent;
        "full-page": FullPageEvent;
        "full-screen": FullScreenEvent;
        "home": HomeEvent;
        "mouse-enabled": MouseEnabledEvent;
        "navigator-click": NavigatorClickEvent;
        "navigator-drag": NavigatorDragEvent;
        "navigator-scroll": NavigatorScrollEvent;
        "open": OpenEvent;
        "open-failed": OpenFailedEvent;
        "page": PageEvent;
        "pan": PanEvent;
        "pre-full-page": PreFullPageEvent;
        "pre-full-screen": PreFullScreenEvent;
        "remove-overlay": RemoveOverlayEvent;
        "reset-size": ResetSizeEvent;
        "resize": ResizeEvent;
        "rotate": RotateEvent;
        "tile-drawing": TileDrawingEvent;
        "tile-drawn": TileEvent;
        "tile-load-failed": TileLoadFailedEvent;
        "tile-loaded": TileLoadedEvent;
        "tile-unloaded": TileEvent;
        "update-level": UpdateLevelEvent;
        "update-overlay": UpdateOverlayEvent;
        "update-tile": TileEvent;
        "update-viewport": ViewerEvent;
        "viewport-change": ViewerEvent;
        "visible": VisibleEvent;
        "zoom": ZoomEvent;
    }

    interface WorldEventMap {
        "add-item": AddItemWorldEvent;
        "item-index-change": ItemIndexChangeWorldEvent;
        "metrics-change": WorldEvent;
        "remove-item": RemoveItemWorldEvent;
    }

    interface OSDEvent<T> {
        eventSource: T;
        userData: unknown;
    }

    interface ButtonEvent extends OSDEvent<Button> {
        originalEvent: Event;
    }

    // -- TILED IMAGE EVENTS --
    interface TiledImageEvent extends OSDEvent<TiledImage> {}

    interface CompositeOperationChangeTiledImageEvent extends TiledImageEvent {
        compositeOperationChange: string;
    }

    interface FullyLoadedChangeTiledImageEvent extends TiledImageEvent {
        fullyLoaded: boolean;
    }

    interface OpacityChangeTiledImageEvent extends TiledImageEvent {
        opacity: boolean;
    }

    // -- TILE SOURCE EVENTS --
    interface TileSourceEvent extends OSDEvent<TileSource> {}

    interface OpenFailedTileSourceEvent extends TileSourceEvent {
        message: string;
        source: string;
    }

    interface ReadyTileSourceEvent extends TileSourceEvent {
        tileSource: object;
    }

    // -- VIEWER EVENTS --
    interface ViewerEvent extends OSDEvent<Viewer> {}

    interface AddItemFailedEvent extends ViewerEvent {
        message: string;
        source: string;
        options: object;
    }

    interface AddOverlayEvent extends ViewerEvent {
        element: Element;
        location: Point | Rect;
        placement: Placement;
    }

    interface AfterResizeEvent extends ViewerEvent {
        newContainerSize: Point;
        maintain: boolean;
    }

    interface CanvasOriginalEvent extends ViewerEvent {
        originalEvent: Event;
    }

    interface CanvasTrackerEvent extends CanvasOriginalEvent {
        tracker: MouseTracker;
    }

    interface CanvasEvent extends CanvasTrackerEvent {
        position: Point;
    }

    interface CanvasClickEvent extends CanvasEvent {
        quick: boolean;
        shift: boolean;
        originalTarget: Element;
        preventDefaultAction: boolean;
    }

    interface CanvasContextMenuEvent extends CanvasEvent {
        preventDefault: boolean;
    }

    interface CanvasDoubleClickEvent extends CanvasEvent {
        shift: boolean;
        preventDefaultAction: boolean;
    }

    interface CanvasDragEvent extends CanvasEvent {
        pointerType: PointerType;
        delta: Point;
        speed: number;
        direction: number;
        shift: boolean;
        preventDefaultAction: boolean;
    }

    interface CanvasEnterEvent extends CanvasEvent {
        pointerType: PointerType;
        buttons: number;
        pointers: number;
        insideElementPressed: boolean;
        /**
         * @deprecated Use `buttons` instead
         */
        buttonDownAny: boolean;
    }

    interface CanvasExitEvent extends CanvasEvent {
        pointerType: PointerType;
        buttons: number;
        pointers: number;
        insideElementPressed: boolean;
        /**
         * @deprecated Use `buttons` instead
         */
        buttonDownAny: boolean;
    }

    interface CanvasKeyEvent extends CanvasEvent {
        preventDefaultAction: boolean;
        preventVerticalPan: boolean;
        preventHorizontalPan: boolean;
    }

    interface CanvasNonPrimaryButtonEvent extends CanvasEvent {
        pointerType: PointerType;
        button: number;
        buttons: number;
    }

    interface CanvasPinchEvent extends CanvasEvent {
        pointerType: PointerType;
        gesturePoints: GesturePoint[];
        lastCenter: Point;
        center: Point;
        lastDistance: number;
        distance: number;
        shift: boolean;
        preventDefaultPanAction: boolean;
        preventDefaultZoomAction: boolean;
        preventDefaultRotateAction: boolean;
    }

    interface CanvasPressEvent extends CanvasEvent {
        pointerType: PointerType;
        insideElementPressed: boolean;
        insideElementReleased: boolean;
    }

    interface CanvasReleaseEvent extends CanvasEvent {
        pointerType: PointerType;
        insideElementPressed: boolean;
        insideElementReleased: boolean;
    }

    interface CanvasScrollEvent extends CanvasEvent {
        scroll: number;
        shift: boolean;
        preventDefaultAction: boolean;
        preventDefault: boolean;
    }

    interface ConstrainEvent extends ViewerEvent {
        immediately: boolean;
    }

    interface ContainerEvent extends ViewerEvent {
        tracker: MouseTracker;
        pointerType: PointerType;
        position: Point;
        buttons: number;
        pointers: number;
        insideElementPressed: boolean;
        /**
         * @deprecated Use `buttons` instead
         */
        buttonDownAny: boolean;
        originalEvent: Event;
    }

    interface ControlsEnabledEvent extends ViewerEvent {
        enabled: boolean;
    }

    interface FlipEvent extends ViewerEvent {
        flipped: number;
    }

    interface FullPageEvent extends ViewerEvent {
        fullPage: boolean;
    }

    interface FullScreenEvent extends ViewerEvent {
        fullScreen: boolean;
    }

    interface HomeEvent extends ViewerEvent {
        immediately: boolean;
    }

    interface MouseEnabledEvent extends ViewerEvent {
        enabled: boolean;
    }

    interface NavigatorEvent extends ViewerEvent {
        tracker: MouseTracker;
        position: Point;
        shift: boolean;
        originalEvent: Event;
    }

    interface NavigatorClickEvent extends NavigatorEvent {
        quick: boolean;
        preventDefaultAction: boolean;
    }

    interface NavigatorDragEvent extends NavigatorEvent {
        delta: Point;
        speed: number;
        direction: number;
        preventDefaultAction: boolean;
    }

    interface NavigatorScrollEvent extends NavigatorEvent {
        scroll: number;
        preventDefault: boolean;
    }

    interface OpenEvent extends ViewerEvent {
        source: TileSource;
    }

    interface OpenFailedEvent extends OpenEvent {
        message: string;
    }

    interface PageEvent extends ViewerEvent {
        page: number;
    }

    interface PanEvent extends ViewerEvent {
        center: Point;
        immediately: boolean;
    }

    interface PreFullPageEvent extends ViewerEvent {
        fullPage: boolean;
        preventDefaultAction: boolean;
    }

    interface PreFullScreenEvent extends ViewerEvent {
        fullScreen: boolean;
        preventDefaultAction: boolean;
    }

    interface RemoveOverlayEvent extends ViewerEvent {
        element: Element;
    }

    interface ResetSizeEvent extends ViewerEvent {
        contentSize: Point;
        contentBounds: Rect;
        homeBounds: Rect;
        contentFactor: number;
    }

    interface ResizeEvent extends ViewerEvent {
        newContainerSize: Point;
        maintain: boolean;
    }

    interface RotateEvent extends ViewerEvent {
        degrees: number;
    }

    interface TileEvent extends ViewerEvent {
        tile: Tile;
        tiledImage: TiledImage;
    }

    interface TileDrawingEvent extends TileEvent {
        context: Tile;
        rendered: Tile;
    }

    interface TileLoadFailedEvent extends TileEvent {
        time: number;
        message: string;
        tileRequest: XMLHttpRequest;
    }

    interface TileLoadedEvent extends TileEvent {
        image: HTMLImageElement;
        tileRequest: XMLHttpRequest;
        getCompletionCallback: () => () => void;
    }

    interface UpdateLevelEvent extends ViewerEvent {
        tiledImage: TiledImage;
        havedrawn: object;
        level: object;
        opacity: object;
        visibility: object;
        drawArea: Rect;
        /**
         * @deprecated use `drawArea` instead
         */
        topleft: object;
        /**
         * @deprecated use `drawArea` instead
         */
        bottomright: object;
        currenttime: object;
        best: object;
    }

    interface UpdateOverlayEvent extends ViewerEvent {
        element: Element;
        location: Point | Rect;
        placement: Placement;
    }

    interface VisibleEvent extends ViewerEvent {
        visible: boolean;
    }

    interface ZoomEvent extends ViewerEvent {
        zoom: number;
        refPoint: Point;
        immediately: boolean;
    }

    // -- WORLD EVENTS --
    interface WorldEvent extends OSDEvent<World> {}

    interface AddItemWorldEvent extends WorldEvent {
        item: TiledImage;
    }

    interface ItemIndexChangeWorldEvent extends WorldEvent {
        item: TiledImage;
        previousIndex: number;
        newIndex: number;
    }

    interface RemoveItemWorldEvent extends WorldEvent {
        item: TiledImage;
    }

    // -- MOUSE TRACKER EVENTS --
    interface MouseTrackerEvent<T extends Event = Event> extends OSDEvent<MouseTracker> {
        originalEvent: T;
    }

    interface PointerMouseTrackerEvent extends MouseTrackerEvent<PointerEvent> {
        pointerType: PointerType;
        position: Point;
        /**
         * @deprecated Use `pointerType` and/or `originalEvent` instead
         */
        isTouchEvent: boolean;
    }

    interface KeyMouseTrackerEvent extends MouseTrackerEvent<KeyboardEvent> {
        keyCode: number;
        ctrl: boolean;
        shift: boolean;
        alt: boolean;
        meta: boolean;
        preventDefault: boolean;
    }

    interface ContextMenuMouseTrackerEvent extends MouseTrackerEvent<MouseEvent> {
        position: Point;
        preventDefault: boolean;
    }

    interface PressMouseTrackerEvent extends PointerMouseTrackerEvent {
        buttons: number;
    }

    type PointerType = "mouse" | "touch" | "pen";

    type EventPhase = 0 | 1 | 2 | 3;
}

export as namespace OpenSeadragon;

declare function OpenSeadragon(options: OpenSeadragon.Options): OpenSeadragon.Viewer;

export default OpenSeadragon;
