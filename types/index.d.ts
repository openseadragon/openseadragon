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

    const pixelDensityRatio: number;

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

    class SUBPIXEL_ROUNDING_OCCURRENCES {
        static NEVER: number;
        static ALWAYS: number;
        static ONLY_AT_REST: number;
    }

    const supportsAddEventListener: boolean;

    const supportsCanvas: boolean;

    const supportsEventListenerOptions: boolean;

    const supportsRemoveEventListener: boolean;

    const version: {
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

    function getCurrentPixelDensityRatio(): number;

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
        postData: string;
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
        dragToPan?: boolean;
        scrollToZoom?: boolean;
        clickToZoom?: boolean;
        dblClickToZoom?: boolean;
        dblClickDragToZoom?: boolean;
        pinchToZoom?: boolean;
        zoomToRefPoint?: boolean;
        flickEnabled?: boolean;
        flickMinSpeed?: number;
        flickMomentum?: number;
        pinchRotate?: boolean;
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

    type DrawerType = "auto" | "html" | "canvas" | "webgl";
    type DrawerConstructor = new(options: TDrawerOptions) => DrawerBase;
    type TypeConverter<TIn = any, TOut = any> = (tile: OpenSeadragon.Tile, data: TIn) => TOut | Promise<TOut>;
    type TypeDestructor<TIn = any, TOut = any> = (data: TIn) => TOut | Promise<TOut>;

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
            | Array<string | TileSource | { type: "openstreetmaps" }>
            | (() => string)
            | { getTileUrl: (level: number, x: number, y: number) => string };
        tabIndex?: number;
        overlays?: any[];
        toolbar?: string | HTMLElement;
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
        loadDestinationTilesOnAnimation?: boolean;
        gestureSettingsMouse?: GestureSettings;
        gestureSettingsTouch?: GestureSettings;
        gestureSettingsPen?: GestureSettings;
        gestureSettingsUnknown?: GestureSettings;
        zoomPerClick?: number;
        zoomPerScroll?: number;
        zoomPerDblClickDrag?: number;
        zoomPerSecond?: number;
        showNavigator?: boolean;
        navigatorElement?: HTMLElement;
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
        keyboardNavEnabled?: boolean;
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
        callTileLoadedWithCachedData?: boolean;
    }

    interface TileSourceOptions {
        url?: string;
        referenceStripThumbnailUrl?: string;
        success?: ((event: Event) => void);
        ajaxWithCredentials?: string | boolean;
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
        ready?: boolean;
    }

    interface ButtonOptions {
        userData?: object;
        element?: HTMLElement;
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
    }

    class Button extends EventSource<ButtonEventMap> {
        clickDistThreshold: number;
        clickTimeThreshold: number;
        currentState: ButtonState;
        element: HTMLElement;
        fadeDelay: number;
        fadeLength: number;
        srcDown: string | null;
        srcGroup: string | null;
        srcHover: string | null;
        srcRest: string | null;
        tooltip: string | null;
        tracker: MouseTracker;
        userData: any;

        constructor(options: ButtonOptions);
        disable(): void;
        enable(): void;
        notifyGroupEnter(): void;
        notifyGroupExit(): void;
        destroy(): void;
    }

    class ButtonGroup {
        buttons: Button[];
        clickDistThreshold: number;
        clickTimeThreshold: number;
        element: HTMLElement;
        tracker: MouseTracker;

        constructor(options: { buttons: Button[]; element?: Element });

        addButton(button: Button): void;
        destroy(): void;
    }

    class InternalCacheRecord {
        constructor(data: any | Promise<any>, type: string, onDestroy?: (data: any) => void);

        tstamp: number;
        loaded: boolean;
        readonly data: any;
        readonly type: string;

        await(): Promise<any>;
        withTileReference(referenceTile: Tile): InternalCacheRecord;
        destroy(): void;
    }

    class CacheRecord {
        constructor();

        loaded: boolean;
        readonly data: any;
        readonly type: string;

        await(): Promise<any>;
        getImage(): any;
        getRenderedContext(): any;
        setDataAs(data: any, type: string): Promise<any>;
        getDataAs(type?: string, copy?: boolean): Promise<any>;
        getDataForRendering(drawer: DrawerBase, tileToDraw: Tile): CacheRecord | InternalCacheRecord | undefined;
        isUsableForDrawer(drawer: DrawerBase): boolean;
        prepareForRendering(drawer: DrawerBase): Promise<any>;
        prepareInternalCacheAsync(drawer: DrawerBase): Promise<any>;
        prepareInternalCacheSync(drawer: DrawerBase): InternalCacheRecord;
        transformTo(type?: string | string[]): Promise<any>;
        destroyInternalCache(drawerId?: string): void;
        withTileReference(ref: Tile): CacheRecord;
        toString(): string;
        revive(): void;
        destroy(): void;
        addTile(tile: Tile, data?: any, type?: string): void;
        removeTile(tile: Tile): boolean;
        getTileCount(): number;
    }

    interface TControlOptions {
        anchor?: ControlAnchor;
        attachToViewer?: boolean;
        autoFade?: boolean;
    }

    class Control {
        anchor: ControlAnchor;
        autoFade: boolean;
        container: HTMLElement;
        element: HTMLElement;
        wrapper: HTMLElement;

        constructor(element: Element, options: TControlOptions, container: Element);

        destroy(): void;
        isVisible(): boolean;
        setOpacity(opacity: number): void;
        setVisible(visible: boolean): void;
    }

    class ControlDock {
        container: HTMLElement;
        controls: any[];

        constructor(options: object);

        addControl(element: string | Element, controlOptions: TControlOptions): void;
        areControlsEnabled(): boolean;
        clearControls(): ControlDock;
        removeControl(element: Control): ControlDock;
        setControlsEnabled(enabled: boolean): ControlDock;
    }

    interface ConversionStep {
        target: PriorityQueue.Node<string>;
        origin: PriorityQueue.Node<string>;
        weight: number;
        transform: TypeConverter;
    }

    class DataTypeConverter {
        constructor();

        guessType(x: any): string;
        learn(from: string, to: string, callback: TypeConverter, costPower?: number, costMultiplier?: number): void;
        learnDestroy(type: string, callback: TypeDestructor): void;
        convert<TOut = any>(tile: Tile, data: any, from: string, ...to: string[]): Promise<TOut | undefined>;
        copy<TOut = any>(tile: Tile, data: any, type: string): Promise<TOut | undefined>;
        destroy<TOut = any>(data: any, type: string): Promise<TOut> | undefined;
        getConversionPath(from: string, to: string | string[]): ConversionStep[] | undefined;
        getConversionPathFinalType(path: ConversionStep[] | undefined): string | undefined;
        getKnownTypes(): string[];
        existsType(type: string): boolean;
    }

    const converter: DataTypeConverter;

    class DisplayRect extends Rect {
        minLevel: number;
        maxLevel: number;

        constructor(x: number, y: number, width: number, height: number, minLevel: number, maxLevel: number);
    }

    interface BaseDrawerOptions {
        usePrivateCache?: boolean;
        preloadCache?: boolean;
        offScreen?: boolean;
        broadCastTileInvalidation?: boolean;
    }

    interface WebGLDrawerOptions extends BaseDrawerOptions {
        unpackWithPremultipliedAlpha?: boolean;
    }

    interface DrawerOptions {
        webgl?: WebGLDrawerOptions;
        canvas?: BaseDrawerOptions;
        html?: BaseDrawerOptions;
        custom?: BaseDrawerOptions;
        [key: string]: BaseDrawerOptions | undefined;
    }

    class DrawerBase {
        container: HTMLElement;
        debugGridColor: string[];
        options: BaseDrawerOptions;
        viewer: Viewer;
        viewport: Viewport;

        constructor(options: { viewer: Viewer; viewport: Viewport; element: HTMLElement });
        static isSupported(): boolean;
        get defaultOptions(): BaseDrawerOptions;
        get canvas(): HTMLCanvasElement;
        canRotate(): boolean;
        destroy(): void;
        destroyInternalCache(): void;
        drawDebuggingRect(rect: Rect): void;
        getDataToDraw(tile: Tile): any | undefined;
        getId(): string;
        getRequiredDataFormats(): string[];
        getSupportedDataFormats(): string[];
        getType(): string | undefined;
        internalCacheCreate(cache: CacheRecord, tile: Tile): any;
        internalCacheFree(data: any): any;
        setImageSmoothingEnabled(imageSmoothingEnabled: boolean): void;
        setInternalCacheNeedsRefresh(): void;
        tiledImageCreated(tiledImage: TiledImage): void;
        viewportCoordToDrawerCoord(point: Point): Point;
        viewportToDrawerRectangle(rectangle: Rect): Rect;
    }

    interface TDrawerOptions {
        viewer: Viewer;
        viewport: Viewport;
        element: HTMLElement;
        debugGridColor?: string | string[];
    }

    class CanvasDrawer extends DrawerBase {
        container: HTMLElement;

        constructor(options: TDrawerOptions);

        get canvas(): HTMLCanvasElement;
        blendSketch(options: {
            opacity: number;
            scale: number;
            translate?: Point;
            compositeOperation?: string;
            bounds?: Rect
        }): void;
    }

    interface IDziTileSourceOptions {
        width?: number,
        height?: number,
        tileSize?: number,
        tileOverlap?: number,
        tilesUrl?: string,
        fileFormat?: string,
        displayRects?: DisplayRect[],
        minLevel?: number,
        maxLevel?: number,
    }

    class DziTileSource extends TileSource {
        displayRects: DisplayRect[];
        fileFormat: string;
        queryParams: string;
        tilesUrl: string;

        constructor(
            width: number | IDziTileSourceOptions,
            height?: number,
            tileSize?: number,
            tileOverlap?: number,
            tilesUrl?: string,
            fileFormat?: string,
            displayRects?: DisplayRect[],
            minLevel?: number,
            maxLevel?: number,
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
        getAwaitingHandler<K extends keyof EventMap>(eventName: K, bindTarget: any): null | Promise<any>;
        getHandler<K extends keyof EventMap>(eventName: K): void;
        numberOfHandlers<K extends keyof EventMap>(eventName: K): number;
        raiseEvent<K extends keyof EventMap>(eventName: K, eventArgs: object): boolean;
        raiseEventAwaiting<K extends keyof EventMap>(eventName: K, eventArgs: object | undefined, bindTarget: any): Promise<any> | undefined;
        removeAllHandlers<K extends keyof EventMap>(eventName: K): boolean;
        removeHandler<K extends keyof EventMap>(eventName: K, handler: EventHandler<EventMap[K]>): boolean;
    }

    class HTMLDrawer extends DrawerBase {
        container: HTMLElement;
        constructor(options: TDrawerOptions);
        get canvas(): HTMLCanvasElement;
    }

    class IIIFTileSource extends TileSource {
        isLevel0: boolean;
        levelSizes?: Array<{ width: number; height: number }>;
        scale_factors?: number[];
        tileFormat: string;
        tiles?: Array<{ width: number; height?: number; scaleFactors: number[] }>;
        version: number;

        constructor(options: TileSourceOptions & { tileFormat?: string });
    }

    interface IrisTileSourceOptions extends TileSourceOptions {
        type: 'iris';
        serverUrl: string;
        slideId: string;
        metadata?: {
            extent: {
                width: number;
                height: number;
                layers: Array<{
                    scale: number;
                    x_tiles: number;
                    y_tiles: number;
                }>;
            };
        };
    }

    interface IIPTileSourceOptions extends TileSourceOptions {
        iipsrv: string;
        image: string;
        format?: string;
        transform?: {
            stack?: string;
            quality?: number;
            contrast?: number;
            color?: string;
            invert?: boolean;
            colormap?: string;
            gamma?: number;
            minmax?: string;
            twist?: string;
            hillshade?: string;
        };
    }

    class IIPTileSource extends TileSource {
        format?: string;
        iipsrv: string;
        image: string;
        levelSizes: Array<{ width: number; height: number }>;
        transform?: IIPTileSourceOptions['transform'];

        constructor(options: IIPTileSourceOptions);
        getMetadataUrl(): string;
        parseIIP(data: string): void;
    }

    class IrisTileSource extends TileSource {
        levelScales: number[];
        levelSizes: Array<{
            height: number;
            width: number;
            xTiles: number;
            yTiles: number;
        }>;
        serverUrl: string;
        slideId: string;

        constructor(options: IrisTileSourceOptions);
        getMetadataUrl(): string;
        parseMetadata(data: IrisTileSourceOptions['metadata']): void;
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
        abort?: () => void;
        callback?: () => void;
        timeout?: number;
        tries?: number;
    }

    class ImageJob {
        ajaxHeaders: object;
        ajaxWithCredentials: boolean;
        crossOriginPolicy: string;
        data: any;
        dataType: string | null;
        errorMsg: string | null;
        jobId: number | null;
        loadWithAjax: boolean;
        postData: string | object;
        request: XMLHttpRequest | null;
        source: TileSource;
        src: string;
        tile: Tile;
        timeout: number;
        tries: number;
        userData: any;

        constructor(options: TImageJobOptions);
        abort(): void;
        fail(errorMessage: string, request: XMLHttpRequest | null): void;
        finish(data: any, request: XMLHttpRequest | null, dataType?: string): void;
    }

    interface BatchImageJobOptions {
        source: TileSource;
        jobs: ImageJob[];
        callback?: (job: BatchImageJob) => void;
        abort?: () => void;
        timeout?: number;
    }

    class BatchImageJob {
        data: any;
        dataType: string | null;
        errorMsg: string | null;
        jobId: number | null;
        jobs: ImageJob[];
        request: XMLHttpRequest | null;
        source: TileSource;
        timeout: number;

        constructor(options: BatchImageJobOptions);
        abort(): void;
        fail(errorMessage: string, request: XMLHttpRequest | null): void;
        finish(data: any, request: XMLHttpRequest | null, dataType?: string): void;
        start(): void;
    }

    interface ImageLoaderOptions {
        jobLimit?: number;
        timeout?: number;
    }

    class ImageLoader {
        jobLimit: number;
        jobQueue: Array<ImageJob | BatchImageJob>;
        jobsInProgress: number;
        timeout: number;

        constructor(options: ImageLoaderOptions);

        addJob(options: TImageJobOptions): boolean;
        canAcceptNewJob(): boolean;
        clear(): void;
    }

    interface ImageTileSourceOptions extends TileSourceOptions {
        url: string;
        buildPyramid?: boolean;
        crossOriginPolicy?: string | boolean;
        ajaxWithCredentials?: string | boolean;
        useCanvas?: boolean;
    }

    class ImageTileSource extends TileSource {
        buildPyramid: boolean;
        crossOriginPolicy: string | boolean;
        ajaxWithCredentials: string | boolean;
        useCanvas: boolean;
        image: HTMLImageElement | null;
        levels: Array<{ url?: string; width: number; height: number }>;

        constructor(options: ImageTileSourceOptions);
        downloadTileStart(job: ImageJob): void;
        /** @deprecated */
        getContext2D(level: number, x: number, y: number): CanvasRenderingContext2D;
    }

    class LegacyTileSource extends TileSource {
        levels: Array<{
            url: string;
            width: number;
            height: number;
        }>;

        constructor(
            levels: Array<{
                url: string;
                width: number;
                height: number;
            }>
        );
    }

    class Mat3 {
        values: number[];

        constructor(values?: number[]);
        multiply(other: Mat3): Mat3;
        scaleAndTranslate(sx: number, sy: number, tx: number, ty: number): Mat3;
        scaleAndTranslateSelf(sx: number, sy: number, tx: number, ty: number): void;
        scaleAndTranslateOtherSetSelf(other: Mat3): void;
        setValues(a00: number, a01: number, a02: number, a10: number, a11: number, a12: number, a20: number, a21: number, a22: number): void;
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
        hash: string;
        stopDelay: number;
        userData: any;

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
        get hasGestureHandlers(): boolean;
        get hasScrollHandler(): boolean;
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
        setDisplayTransform(rule: string): Navigator;
        setFlip(state: boolean): Navigator;
        setHeight(height: number | string): void;
        setWidth(width: number | string): void;
        update(viewport?: Viewport): void;
        updateSize(): void;
    }

    interface OsmTileSourceOptions extends TileSourceOptions {
        width?: number;
        height?: number;
        tileSize?: number;
        tileOverlap?: number;
        tilesUrl?: string;
    }

    class OsmTileSource extends TileSource {
        constructor(width: number | OsmTileSourceOptions, height?: number, tileSize?: number, tileOverlap?: number, tilesUrl?: string);
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
        bounds: Rect;
        element: Element;
        height: number | null;
        location: Point;
        placement: Placement;
        position: Point;
        scales: boolean;
        width: number | null;

        constructor(options: OverlayOptions);
        constructor(element: Element, location: Point | Rect, placement?: Placement);
        adjust(position: Point, size: Point): void;
        destroy(): void;
        drawHTML(container: Element, viewport: Viewport): void;
        getBounds(viewport: Viewport): Rect;
        update(location: Point | Rect | object, placement?: Placement): void;
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
        times(factor: number): Point;
        toString(): string;
    }

    class PriorityQueue<K = any, V = any> {
        constructor(optHeap?: PriorityQueue<K, V>);

        insert(key: K, value: V): void;
        insertNode(node: PriorityQueue.Node<K, V>): void;
        insertAll(heap: PriorityQueue<K, V>): void;
        remove(): PriorityQueue.Node<K, V> | undefined;
        peek(): V | undefined;
        peekKey(): K | undefined;
        decreaseKey(node: PriorityQueue.Node<K, V>, key: K): void;
        getValues(): V[];
        getKeys(): K[];
        containsValue(val: V): boolean;
        containsKey(key: K): boolean;
        clone(): PriorityQueue<K, V>;
        getCount(): number;
        isEmpty(): boolean;
        clear(): void;
    }

    namespace PriorityQueue {
        class Node<K = any, V = any> {
            constructor(key: K, value: V);

            key: K;
            value: V;
            index?: number;

            clone(): PriorityQueue.Node<K, V>;
        }
    }

    class Rect {
        x: number;
        y: number;
        width: number;
        height: number;
        degrees: number;
        constructor(x?: number, y?: number, width?: number, height?: number, degrees?: number);
        static fromSummits(topLeft: Point, topRight: Point, bottomLeft: Point): Rect;
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
        intersection(rect: Rect): Rect | null;
        rotate(degrees: number, pivot?: Point): Rect;
        times(factor: number): Rect;
        toString(): string;
        translate(delta: Point): Rect;
        union(rect: Rect): Rect;
    }

    class ReferenceStrip {
        element: HTMLElement;
        viewer: Viewer;

        constructor(options: object);
        destroy(): void;
        setFocus(page: number): void;
        update(): boolean;
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
        setExponential(value: boolean): void;
        shiftBy(delta: number): void;
        springTo(target: number): void;
        update(): boolean;
    }

    class Tile {
        ajaxHeaders: object;
        beingDrawn: boolean;
        blendStart: number | null;
        bounds: Rect;
        cacheImageRecord: CacheRecord;
        cacheKey: string;
        context2D: CanvasRenderingContext2D;
        element: HTMLElement;
        exists: boolean;
        flipped: boolean;
        hasTransparency: boolean;
        image: object;
        imgElement: Element;
        isBottomMost: boolean;
        isRightMost: boolean;
        lastTouchTime: number;
        level: number;
        loaded: boolean;
        loading: boolean;
        loadWithAjax: boolean;
        opacity: number | null;
        originalCacheKey: string;
        position: Point | null;
        positionedBounds: Rect;
        postData: string;
        processing: boolean | number;
        size: Point | null;
        sourceBounds: Rect;
        style: string;
        tiledImage: TiledImage | null;
        url: string;
        visibility: number | null;
        x: number;
        y: number;

        constructor(
            level: number,
            x: number,
            y: number,
            bounds: Rect,
            exists: boolean,
            url: string | (() => string),
            context2D?: CanvasRenderingContext2D,
            loadWithAjax?: boolean,
            ajaxHeaders?: object,
            sourceBounds?: Rect,
            postData?: string,
            cacheKey?: string,
        );

        equals(tile: Tile): boolean;
        getCache(key?: string): CacheRecord;
        getCacheSize(): number;
        getTranslationForEdgeSmoothing(scale: number | undefined, canvasSize: Point, sketchCanvasSize: Point): Point;
        getUrl(): string;
        toString(): string;
        unload(erase?: boolean): void;

        /** @deprecated */
        getCanvasContext(): CanvasRenderingContext2D | undefined;
        /** @deprecated */
        getImage(): object;
        /** @deprecated */
        getScaleForEdgeSmoothing(): number;
    }

    class TileCache {
        constructor(options: { maxImageCacheCount?: number });
        cacheTile(options: {
            tile: Tile;
            image: HTMLImageElement; // TODO: check type
            tiledImage: TiledImage;
            cutoff?: number;
        }): void;
        clear(withZombies?: boolean): void;
        clearDrawerInternalCache(drawer: DrawerBase): void;
        clearTilesFor(tiledImage: TiledImage): void;
        getCacheRecord(cacheKey: string): CacheRecord | undefined;
        getLoadedTilesFor(tiledImage: TiledImage | null): Tile[];
        numCachesLoaded(): number;
        numTilesLoaded(): number;
        safeUnloadCache(cache: CacheRecord): void;
        unloadTile(tile: Tile, destroy?: boolean): void;
    }

    interface TiledImageInitOptions {
        source: TileSource;
        viewer: Viewer;
        tileCache: TileCache;
        drawer: DrawerBase;
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

    interface DrawTileInfo {
        currentTime: number;
        level: number;
        levelOpacity: number;
        tile: Tile;
    }

    type Issue = 'webgl';

    class TiledImage extends EventSource<TiledImageEventMap> {
        source: TileSource;
        viewer: Viewer;
        readonly lastDrawn: DrawTileInfo[];

        constructor(options: TiledImageInitOptions);

        allowZombieCache(allow: boolean): void;
        destroy(): void;
        fitBounds(bounds: Rect, anchor?: Placement, immediately?: boolean): void;
        getBounds(current?: boolean): Rect;
        getBoundsNoRotate(current?: boolean): Rect;
        getClip(): Rect | null;
        getClippedBounds(current?: boolean): Rect;
        getCompositeOperation(): string;
        getContentSize(): Point;
        getDrawArea(): Rect | false;
        getDrawer(): DrawerBase;
        getFlip(): boolean;
        getFullyLoaded(): boolean;
        getIssue(issueType: string): string | undefined;
        getLoadArea(): Rect;
        getOpacity(): number;
        getPreload(): boolean;
        getRotation(current?: boolean): number;
        getSizeInWindowCoordinates(): Point;
        getTileBounds(level: number, x: number, y: number): Rect;
        getTilesToDraw(): DrawTileInfo[];
        hasIssue(issueType: string): boolean;
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
        requestInvalidate(restoreTiles?: boolean, viewportOnly?: boolean, tStamp?: number): Promise<any>;
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
        whenFullyLoaded(callback: () => void): void;
        windowToImageCoordinates(pixel: Point): Point;
        /** @deprecated */
        getWorldBounds(): Rect;
    }

    interface ConfigureOptions {
        [key: string]: any;
    }

    class TileSource extends EventSource<TileSourceEventMap> {
        constructor(options: TileSourceOptions | string);

        aspectRatio: number;
        dimensions: Point;
        maxLevel: number;
        minLevel: number;
        ready: boolean;
        tileOverlap: number;
        url: string | null;

        batchCompatible(otherSource: TileSource): boolean;
        batchEnabled(): boolean;
        batchMaxJobs(): number;
        batchTimeout(): number;
        configure(data: string | object | any[] | Document, url?: string, postData?: string): ConfigureOptions;
        destroy(viewer: Viewer): void;
        downloadTileBatchAbort(batchJob: BatchImageJob): void;
        downloadTileBatchStart(batchJob: BatchImageJob): void;
        downloadTileAbort(context: ImageJob): void;
        downloadTileStart(context: ImageJob): void;
        equals(otherSource: TileSource): boolean;
        getClosestLevel(): number;
        getImageInfo(url: string): void;
        getLevelScale(level: number): number;
        getNumTiles(level: number): Point;
        getPixelRatio(level: number): number;
        getTileAjaxHeaders(level: number, x: number, y: number): object;
        getTileAtPoint(level: number, point: Point): Tile;
        getTileBounds(level: number, x: number, y: number, isSource?: boolean): Rect;
        getTileHashKey(level: number, x: number, y: number, url: string, ajaxHeaders: object, postData: any): string | null;
        getTileHeight(level: number): number;
        getTilePostData(level: number, x: number, y: number): any | null;
        getTileUrl(level: number, x: number, y: number): string | (() => string);
        getTileWidth(level: number): number;
        hasTransparency(context2D: any, url: string, ajaxHeaders: object, post: any): boolean;
        setMaxLevel(level: number): void;
        supports(data: any, url?: string): boolean;
        tileExists(level: number, x: number, y: number): boolean;

        /** @deprecated */
        createTileCache(cacheObject: CacheRecord, data: any, tile: Tile): void;
        /** @deprecated */
        destroyTileCache(cacheObject: CacheRecord): void;
        /** @deprecated */
        getTileCacheData(cacheObject: CacheRecord): Promise<any>;
        /** @deprecated */
        getTileCacheDataAsContext2D(cacheObject: CacheRecord): CanvasRenderingContext2D;
        /** @deprecated */
        getTileCacheDataAsImage(cacheObject: CacheRecord): HTMLImageElement;
        /** @deprecated */
        getTileSize(level: number): number;
    }

    interface TmsTileSourceOptions extends TileSourceOptions {
        tilesUrl: string;
    }

    class TmsTileSource extends TileSource {
        constructor(width: number, height: number, tileSize: number, tileOverlap: number, tilesUrl: string);
        constructor(options: TmsTileSourceOptions);

        tilesUrl: string;
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
        zombieCache?: boolean;
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

    interface TileSourceSpecifier extends ImageOptions {
        tileSource: string | object;
    }

    interface SimpleImageOptions extends ImageOptions {
        url: string;
    }

    class Viewer {
        canvas: HTMLCanvasElement;
        container: HTMLElement;
        drawer: DrawerBase;
        element: HTMLElement;
        initialPage: number;
        navigator: Navigator;
        viewport: Viewport;
        world: World;
        referenceStrip: ReferenceStrip;
        source: TileSource | null;
        imageLoader: ImageLoader;
        tileCache: TileCache;

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
        addTiledImage(options: TileSourceSpecifier): void;
        bindSequenceControls(): Viewer;
        bindStandardControls(): Viewer;
        clearOverlays(): Viewer;
        close(): Viewer;
        currentPage(): number;
        destroy(): void;
        endZoomAction(): void;
        forceRedraw(): Viewer;
        forceResize(): void;
        gestureSettingsByDeviceType(type: string): GestureSettings;
        getFullyLoaded(): boolean;
        getOverlayById(element: Element | string): Overlay;
        rejectEventHandler(eventName: string, message: string): void;
        goToNextPage(): void;
        goToPage(page: number): Viewer;
        goToPreviousPage(): void;
        instantiateTiledImageClass(options: TileSourceSpecifier): Promise<TiledImage | object>
        instantiateTileSourceClass(options: TileSourceSpecifier): Promise<object>
        isDestroyed(): boolean;
        isFullPage(): boolean;
        isFullScreen(): boolean;
        isKeyboardNavEnabled(): boolean;
        isMouseNavEnabled(): boolean;
        isOpen(): boolean;
        isVisible(): boolean;
        open(tileSources: TileSourceSpecifier | TileSourceSpecifier[], initialPage?: number): Viewer;
        removeOverlay(overlay: Element | string): Viewer;
        removeReferenceStrip(): void;
        requestDrawer(drawerCandidate: string | DrawerBase, options: {
            mainDrawer?: boolean;
            redrawImmediately?: boolean;
            drawerOptions: object;
        }): object | boolean;
        requestInvalidate(restoreTiles?: boolean): Promise<any>;
        setAjaxHeaders(ajaxHeaders: object, propagate?: boolean): void;
        setDebugMode(debug: boolean): Viewer;
        setFullPage(fullScreen: boolean): Viewer;
        setFullScreen(fullScreen: boolean): Viewer;
        setKeyboardNavEnabled(enabled: boolean): Viewer;
        setMouseNavEnabled(enabled: boolean): Viewer;
        setVisible(visible: boolean): Viewer;
        singleZoomInAction(): void;
        singleZoomOutAction(): void;
        startZoomInAction(): void;
        startZoomOutAction(): void;
        updateOverlay(element: Element | string, location: Point | Rect, placement?: Placement): Viewer;
        whenFullyLoaded(callback: () => void): void;
    }

    interface Viewer extends ControlDock, EventSource<ViewerEventMap> {
    }

    interface ViewportOptions {
        animationTime?: number;
        containerSize?: Point;
        contentSize?: Point;
        defaultZoomLevel?: number;
        degrees?: number;
        flipped?: boolean;
        homeFillsViewer?: boolean;
        margins?: { left?: number; top?: number; right?: number; bottom?: number };
        maxZoomLevel?: number;
        maxZoomPixelRatio?: number;
        minZoomImageRatio?: number;
        minZoomLevel?: number;
        silenceMultiImageWarnings?: boolean;
        springStiffness?: number;
        visibilityRatio?: number;
        wrapHorizontal?: boolean;
        wrapVertical?: boolean;
    }

    class Viewport {
        containerSize: Point;
        viewer: Viewer | null;

        constructor(options: ViewportOptions);

        applyConstraints(immediately?: boolean): Viewport;
        deltaPixelsFromPoints(deltaPoints: Point, current?: boolean): Point;
        deltaPixelsFromPointsNoRotate(deltaPoints: Point, current?: boolean): Point;
        deltaPointsFromPixels(deltaPixels: Point, current?: boolean): Point;
        deltaPointsFromPixelsNoRotate(deltaPixels: Point, current?: boolean): Point;
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
        getMargins(): { left: number; top: number; right: number; bottom: number };
        getMaxZoom(): number;
        getMaxZoomPixelRatio(): number;
        getMinZoom(): number;
        getRotation(current?: boolean): number;
        getZoom(current?: boolean): number;
        goHome(immediately?: boolean): Viewport;
        imageToViewerElementCoordinates(pixel: Point): Point;
        imageToViewportCoordinates(imageX: number, imageY: number): Point;
        imageToViewportCoordinates(position: Point): Point;
        imageToViewportRectangle(imageX: number, imageY?: number, pixelWidth?: number, pixelHeight?: number): Rect;
        imageToViewportRectangle(position: Rect): Rect;
        imageToViewportZoom(imageZoom: number): number;
        imageToWindowCoordinates(pixel: Point): Point;
        panBy(delta: Point, immediately?: boolean): Viewport;
        panTo(center: Point, immediately?: boolean): Viewport;
        pixelFromPoint(point: Point, current?: boolean): Point;
        pixelFromPointNoRotate(point: Point, current?: boolean): Point;
        pointFromPixel(pixel: Point, current?: boolean): Point;
        pointFromPixelNoRotate(pixel: Point, current?: boolean): Point;
        resetContentSize(contentSize: Point): Viewport;
        resize(newContainerSize: Point, maintain?: boolean): Viewport;
        rotateBy(degrees: number, pivot?: Point, immediately?: boolean): Viewport;
        rotateTo(degrees: number, pivot?: Point, immediately?: boolean): Viewport;
        setFlip(state: boolean): Viewport;
        setMargins(margins: { left?: number; top?: number; right?: number; bottom?: number }): void;
        setMaxZoomPixelRatio(ratio: number, applyConstraints?: boolean, immediately?: boolean): void;
        setRotation(degrees: number, immediately?: boolean): Viewport;
        setRotationWithPivot(degrees: number, pivot?: Point, immediately?: boolean): Viewport;
        toggleFlip(): Viewport;
        update(): boolean;
        viewerElementToImageCoordinates(pixel: Point): Point;
        viewerElementToViewportCoordinates(pixel: Point): Point;
        viewerElementToViewportRectangle(rectangle: Rect): Rect;
        viewportToImageCoordinates(viewerX: number, viewerY: number): Point;
        viewportToImageCoordinates(position: Point): Point;
        viewportToImageRectangle(viewerX: number, viewerY?: number, pointWidth?: number, pointHeight?: number): Rect;
        viewportToImageRectangle(position: Rect): Rect;
        viewportToImageZoom(viewportZoom: number): number;
        viewportToViewerElementCoordinates(point: Point): Point;
        viewportToViewerElementRectangle(rectangle: Rect): Rect;
        viewportToWindowCoordinates(point: Point): Point;
        windowToImageCoordinates(pixel: Point): Point;
        windowToViewportCoordinates(pixel: Point): Point;
        zoomBy(factor: number, refPoint?: Point, immediately?: boolean): Viewport;
        zoomTo(zoom: number, refPoint?: Point, immediately?: boolean): Viewport;

        /** @deprecated */
        get degrees(): number;
        /** @deprecated */
        set degrees(degrees: number);
        /** @deprecated */
        setHomeBounds(bounds: Rect, contentFactor: number): void;
    }

    class WebGLDrawer extends DrawerBase {
        get canvas(): HTMLCanvasElement;
        container: HTMLElement;
        context: CanvasRenderingContext2D;

        constructor(options: TDrawerOptions);

        draw(tiledImages: any[]): void;
        setContextRecoveryEnabled(enabled: boolean): void;
        isContextRecoveryEnabled(): boolean;
        isWebGL2(): boolean;
        setUnpackWithPremultipliedAlpha(enabled: boolean): void;
    }

    class World extends EventSource<WorldEventMap> {
        viewer: Viewer;

        constructor(options: { viewer: Viewer });
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
        requestInvalidate(restoreTiles?: boolean, tStamp?: number): Promise<any>;
        requestTileInvalidateEvent(tilesToProcess: Tile[], tStamp: number, restoreTiles?: boolean, _allowTileUnloaded?: boolean, _isFromTileLoad?: boolean): Promise<any>;
        ensureTilesUpToDate(tileList: Tile[]): void;
        resetItems(): void;
        setAutoRefigureSizes(value?: boolean): void;
        setItemIndex(item: TiledImage, index: number): void;
        update(viewportChanged: boolean): boolean;
    }

    interface ZoomifyTileSourceOptions extends TileSourceOptions {
        width?: number;
        height?: number;
        tileSize?: number;
        tilesUrl: string;
        fileFormat?: string;
    }

    class ZoomifyTileSource extends TileSource {
        fileFormat: string;
        tilesUrl: string;

        constructor(options: ZoomifyTileSourceOptions);
    }

    type EventHandler<T> = (event: T) => void;

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
        "drawer-error": DrawerErrorEvent;
        "flip": FlipEvent;
        "full-page": FullPageEvent;
        "full-screen": FullScreenEvent;
        "fully-loaded-change": FullyLoadedChangeEvent;
        "home": HomeEvent;
        "job-queue-full": JobQueueFullEvent;
        "keyboard-enabled": KeyboardEnabledEvent;
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
        "tile-invalidated": TileInvalidatedEvent;
        "tile-load-failed": TileLoadFailedEvent;
        "tile-loaded": TileLoadedEvent;
        "tile-unloaded": TileUnloadedEvent;
        "update-level": UpdateLevelEvent;
        "update-overlay": UpdateOverlayEvent;
        "update-tile": TileEvent;
        "update-viewport": ViewerEvent;
        "viewport-change": ViewerEvent;
        "visible": VisibleEvent;
        "webgl-context-recovered": WebGLContextRecoveredEvent;
        "webgl-context-recovery-failed": WebGLContextRecoveryFailedEvent;
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
        stopPropagation?: boolean | (() => boolean);
    }

    interface ButtonEvent extends OSDEvent<Button> {
        originalEvent: Event;
    }

    // -- TILED IMAGE EVENTS --
    interface TiledImageEvent extends OSDEvent<TiledImage> {
    }

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
    interface TileSourceEvent extends OSDEvent<TileSource> {
    }

    interface OpenFailedTileSourceEvent extends TileSourceEvent {
        message: string;
        source: string;
    }

    interface ReadyTileSourceEvent extends TileSourceEvent {
        tileSource: object;
    }

    // -- VIEWER EVENTS --
    interface ViewerEvent extends OSDEvent<Viewer> {
    }

    interface AddItemFailedEvent extends ViewerEvent {
        message: string;
        source: string;
        options: object;
    }

    interface AddOverlayEvent extends ViewerEvent {
        element: HTMLElement;
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
        originalTarget: HTMLElement;
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

    interface DrawerErrorEvent extends ViewerEvent {
        tiledImage: TiledImage;
        drawer: DrawerBase;
        error: string;
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

    interface FullyLoadedChangeEvent extends ViewerEvent {
        fullyLoaded: boolean;
    }

    interface HomeEvent extends ViewerEvent {
        immediately: boolean;
    }

    interface JobQueueFullEvent extends TileEvent {
        time: number;
    }

    interface KeyboardEnabledEvent extends ViewerEvent {
        enabled: boolean;
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
        element: HTMLElement;
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

    interface TileInvalidatedEvent extends TileEvent {
        outdated: () => Promise<boolean>;
        getData: (type: string) => Promise<any>;
        setData: (data: any, type: string) => Promise<undefined>;
        resetData: () => void;
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

    interface TileUnloadedEvent extends TileEvent {
        destroyed: boolean;
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
        element: HTMLElement;
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

    interface WebGLContextRecoveredEvent extends ViewerEvent {
        drawer: WebGLDrawer; // Same instance, context recreated
        error: Error;
    }

    interface WebGLContextRecoveryFailedEvent extends ViewerEvent {
        drawer: WebGLDrawer;
        canvasDrawer: CanvasDrawer | null;
        error: Error;
    }

    // -- WORLD EVENTS --
    interface WorldEvent extends OSDEvent<World> {
    }

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
