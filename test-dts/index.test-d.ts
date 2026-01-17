import { expectType, expectError, expectAssignable } from 'tsd';
import OpenSeadragon from '..';

// Viewer
const viewer = OpenSeadragon({ id: "viewer" });
expectType<OpenSeadragon.Viewer>(viewer);
expectType<OpenSeadragon.Viewer>(OpenSeadragon({ element: document.createElement("div") }));
expectError(OpenSeadragon({ id: 123 }));
expectType<boolean>(viewer.isOpen());
expectType<boolean>(viewer.isFullPage());
expectType<OpenSeadragon.Viewer>(viewer.close());
viewer.destroy();

// Viewport
expectType<number>(viewer.viewport.getZoom());
expectType<OpenSeadragon.Rect>(viewer.viewport.getBounds());
expectType<OpenSeadragon.Point>(viewer.viewport.getCenter());
expectType<number>(viewer.viewport.getRotation());
expectType<boolean>(viewer.viewport.getFlip());
viewer.viewport.zoomTo(2);
viewer.viewport.panTo(new OpenSeadragon.Point(0.5, 0.5));
viewer.viewport.setRotation(45);
viewer.viewport.setFlip(true);
expectType<OpenSeadragon.Point>(viewer.viewport.viewportToImageCoordinates(0.5, 0.5));
expectType<OpenSeadragon.Point>(viewer.viewport.imageToViewportCoordinates(100, 100));
expectType<OpenSeadragon.Rect>(viewer.viewport.getHomeBounds());
expectType<number>(viewer.viewport.getHomeZoom());
expectType<number>(viewer.viewport.getMinZoom());
expectType<number>(viewer.viewport.getMaxZoom());
expectType<number>(viewer.viewport.getAspectRatio());
expectType<OpenSeadragon.Point>(viewer.viewport.getContainerSize());
expectType<OpenSeadragon.Rect>(viewer.viewport.getBoundsNoRotate());
expectType<OpenSeadragon.Point>(viewer.viewport.deltaPixelsFromPoints(new OpenSeadragon.Point(1, 1)));
expectType<OpenSeadragon.Point>(viewer.viewport.deltaPointsFromPixels(new OpenSeadragon.Point(100, 100)));
expectType<OpenSeadragon.Point>(viewer.viewport.pixelFromPoint(new OpenSeadragon.Point(0.5, 0.5)));
expectType<OpenSeadragon.Point>(viewer.viewport.pointFromPixel(new OpenSeadragon.Point(100, 100)));
expectType<OpenSeadragon.Point>(viewer.viewport.viewerElementToImageCoordinates(new OpenSeadragon.Point(100, 100)));
expectType<OpenSeadragon.Point>(viewer.viewport.imageToViewerElementCoordinates(new OpenSeadragon.Point(100, 100)));
expectType<OpenSeadragon.Point>(viewer.viewport.windowToImageCoordinates(new OpenSeadragon.Point(100, 100)));
expectType<OpenSeadragon.Point>(viewer.viewport.imageToWindowCoordinates(new OpenSeadragon.Point(100, 100)));
expectType<OpenSeadragon.Point>(viewer.viewport.viewportToViewerElementCoordinates(new OpenSeadragon.Point(0.5, 0.5)));
expectType<OpenSeadragon.Point>(viewer.viewport.viewerElementToViewportCoordinates(new OpenSeadragon.Point(100, 100)));
expectType<OpenSeadragon.Viewport>(viewer.viewport.applyConstraints());
expectType<OpenSeadragon.Viewport>(viewer.viewport.ensureVisible());
expectType<OpenSeadragon.Viewport>(viewer.viewport.fitBounds(new OpenSeadragon.Rect(0, 0, 1, 1)));
expectType<OpenSeadragon.Viewport>(viewer.viewport.fitBoundsWithConstraints(new OpenSeadragon.Rect(0, 0, 1, 1)));
expectType<OpenSeadragon.Viewport>(viewer.viewport.fitVertically());
expectType<OpenSeadragon.Viewport>(viewer.viewport.fitHorizontally());
expectType<OpenSeadragon.Viewport>(viewer.viewport.goHome());
expectType<OpenSeadragon.Viewport>(viewer.viewport.panBy(new OpenSeadragon.Point(0.1, 0.1)));
expectType<OpenSeadragon.Viewport>(viewer.viewport.resize(new OpenSeadragon.Point(800, 600)));
expectType<boolean>(viewer.viewport.update());
expectType<OpenSeadragon.Viewport>(viewer.viewport.toggleFlip());
expectType<OpenSeadragon.Rect>(viewer.viewport.viewportToImageRectangle(new OpenSeadragon.Rect(0, 0, 1, 1)));
expectType<OpenSeadragon.Rect>(viewer.viewport.imageToViewportRectangle(new OpenSeadragon.Rect(0, 0, 100, 100)));
expectType<OpenSeadragon.Rect>(viewer.viewport.viewerElementToViewportRectangle(new OpenSeadragon.Rect(0, 0, 100, 100)));
expectType<number>(viewer.viewport.viewportToImageZoom(1));
expectType<number>(viewer.viewport.imageToViewportZoom(1));

// World
expectType<number>(viewer.world.getItemCount());
expectAssignable<OpenSeadragon.TiledImage | undefined>(viewer.world.getItemAt(0));
viewer.world.addHandler("add-item", (ev) => {
    expectType<OpenSeadragon.TiledImage>(ev.item);
});

// TiledImage
viewer.addTiledImage({ tileSource: { width: 800, height: 600, tileSize: 256 } });
const item = viewer.world.getItemAt(0);
if (item) {
    expectType<OpenSeadragon.Rect>(item.getBounds());
    expectType<number>(item.getOpacity());
    expectType<boolean>(item.getFlip());
    expectType<OpenSeadragon.Point>(item.viewportToImageCoordinates(new OpenSeadragon.Point(0, 0)));
    item.setOpacity(0.5);
    item.setFlip(true);
    item.setRotation(90);
    expectType<OpenSeadragon.Point>(item.getContentSize());
    expectType<number>(item.getRotation());
    expectType<OpenSeadragon.Rect | null>(item.getClip());
    expectType<OpenSeadragon.Point>(item.imageToViewportCoordinates(100, 100));
    expectType<OpenSeadragon.Rect>(item.imageToViewportRectangle(new OpenSeadragon.Rect(0, 0, 100, 100)));
    expectType<OpenSeadragon.Rect>(item.viewportToImageRectangle(new OpenSeadragon.Rect(0, 0, 1, 1)));
    expectType<number>(item.imageToViewportZoom(1));
    expectType<number>(item.viewportToImageZoom(1));
    expectType<OpenSeadragon.Point>(item.windowToImageCoordinates(new OpenSeadragon.Point(100, 100)));
    expectType<OpenSeadragon.Point>(item.imageToWindowCoordinates(new OpenSeadragon.Point(100, 100)));
    expectType<OpenSeadragon.Point>(item.viewerElementToImageCoordinates(new OpenSeadragon.Point(100, 100)));
    expectType<OpenSeadragon.Point>(item.imageToViewerElementCoordinates(new OpenSeadragon.Point(100, 100)));
    expectType<void>(item.fitBounds(new OpenSeadragon.Rect(0, 0, 1, 1)));
    expectType<void>(item.setPosition(new OpenSeadragon.Point(0.5, 0.5)));
    expectType<void>(item.setWidth(0.5));
    expectType<void>(item.setHeight(0.5));
    expectType<void>(item.setClip(new OpenSeadragon.Rect(0, 0, 100, 100)));
    expectType<void>(item.resetCroppingPolygons());
    expectType<void>(item.destroy());
}

// Events
viewer.addHandler("open", (ev) => {
    expectType<OpenSeadragon.Viewer>(ev.eventSource);
    expectType<OpenSeadragon.TileSource>(ev.source);
});
viewer.addHandler("zoom", (ev) => {
    expectType<number>(ev.zoom);
    expectType<OpenSeadragon.Point>(ev.refPoint);
});
viewer.addHandler("canvas-click", (ev) => {
    expectType<OpenSeadragon.Point>(ev.position);
    expectType<boolean>(ev.quick);
});
viewer.addHandler("tile-loaded", (ev) => {
    expectType<OpenSeadragon.Tile>(ev.tile);
    expectType<OpenSeadragon.TiledImage>(ev.tiledImage);
});
expectError(viewer.addHandler("invalid", () => {}));

// Point
const pt = new OpenSeadragon.Point(5, 6);
expectType<number>(pt.x);
expectType<number>(pt.y);
expectType<OpenSeadragon.Point>(pt.plus(new OpenSeadragon.Point(1, 1)));
expectType<OpenSeadragon.Point>(pt.minus(new OpenSeadragon.Point(1, 1)));
expectType<OpenSeadragon.Rect>(pt.times(2));
expectType<OpenSeadragon.Point>(pt.divide(2));
expectType<number>(pt.distanceTo(new OpenSeadragon.Point(0, 0)));
expectType<boolean>(pt.equals(new OpenSeadragon.Point(5, 6)));
expectType<OpenSeadragon.Point>(pt.rotate(45));

// Rect
const rect = new OpenSeadragon.Rect(0, 0, 10, 10);
expectType<number>(rect.x);
expectType<number>(rect.y);
expectType<number>(rect.width);
expectType<number>(rect.height);
expectType<OpenSeadragon.Point>(rect.getCenter());
expectType<OpenSeadragon.Point>(rect.getTopLeft());
expectType<OpenSeadragon.Point>(rect.getBottomRight());
expectType<number>(rect.getAspectRatio());
expectType<OpenSeadragon.Rect>(rect.times(2));
expectType<OpenSeadragon.Rect>(rect.union(new OpenSeadragon.Rect(5, 5, 10, 10)));
expectType<boolean>(rect.containsPoint(pt));
expectType<OpenSeadragon.Rect>(rect.rotate(45));

// TileSource
const dziSource = new OpenSeadragon.DziTileSource(1000, 800, 256, 1, "/tiles/", "jpg", []);
expectType<number>(dziSource.aspectRatio);
expectType<OpenSeadragon.Point>(dziSource.dimensions);
expectType<number>(dziSource.maxLevel);
expectType<number>(dziSource.getTileWidth(0));
expectType<OpenSeadragon.Rect>(dziSource.getTileBounds(0, 0, 0));
expectAssignable<string | (() => string)>(dziSource.getTileUrl(0, 0, 0));
expectType<boolean>(dziSource.tileExists(0, 0, 0));
expectType<OpenSeadragon.Tile>(dziSource.getTileAtPoint(0, new OpenSeadragon.Point(0.5, 0.5)));
expectType<number>(dziSource.getClosestLevel());
expectType<OpenSeadragon.Point>(dziSource.getNumTiles(0));
expectType<number>(dziSource.getPixelRatio(0));

const iiifSource = new OpenSeadragon.IIIFTileSource({ width: 1000, height: 800, tileSize: 256 });
const imgSource = new OpenSeadragon.ImageTileSource({ url: "image.jpg" });
const zoomifySource = new OpenSeadragon.ZoomifyTileSource(1000, 800, 256, "/tiles/");

// TmsTileSource
const tmsSource = new OpenSeadragon.TmsTileSource({ width: 1000, height: 800, tileSize: 256, tilesUrl: "/tiles/" });
expectType<string>(tmsSource.tilesUrl);

// Overlay
const div = document.createElement("div");
viewer.addOverlay({ element: div, location: new OpenSeadragon.Rect(0, 0, 1, 1) });
viewer.addOverlay({ element: div, location: new OpenSeadragon.Point(0.5, 0.5) });
expectType<OpenSeadragon.Viewer>(viewer.removeOverlay(div));
viewer.updateOverlay(div, new OpenSeadragon.Rect(0.1, 0.1, 0.5, 0.5));
viewer.clearOverlays();

const overlay = new OpenSeadragon.Overlay({
    element: div,
    location: new OpenSeadragon.Point(0.5, 0.5),
    placement: OpenSeadragon.Placement.CENTER
});
overlay.destroy();

// Button
const button = new OpenSeadragon.Button({
    tooltip: "Zoom In",
    onClick: (ev) => expectType<OpenSeadragon.Button>(ev.eventSource)
});
expectType<OpenSeadragon.ButtonState>(button.currentState);
expectType<Element>(button.element);
button.enable();
button.disable();
button.destroy();

// MouseTracker
const tracker = new OpenSeadragon.MouseTracker({
    element: document.createElement("div"),
    clickHandler: (ev) => expectType<OpenSeadragon.MouseTracker>(ev.eventSource)
});
expectType<number>(tracker.getActivePointerCount());
tracker.setTracking(true);
tracker.destroy();

// Navigator
if (viewer.navigator) {
    expectType<OpenSeadragon.Navigator>(viewer.navigator);
    viewer.navigator.setFlip(true);
    viewer.navigator.update();
}

// Drawer
expectType<OpenSeadragon.DrawerBase>(viewer.drawer);
expectType<boolean>(viewer.drawer.canRotate());
expectType<OpenSeadragon.Point>(viewer.drawer.viewportCoordToDrawerCoord(new OpenSeadragon.Point(0, 0)));

// Tile
const tile = new OpenSeadragon.Tile(0, 0, 0, new OpenSeadragon.Rect(0, 0, 256, 256), true, "tile.jpg", null as any, false, {}, new OpenSeadragon.Rect(0, 0, 256, 256), null as any, "key");
expectType<number>(tile.level);
expectType<number>(tile.x);
expectType<number>(tile.y);
expectType<boolean>(tile.loaded);
expectType<string>(tile.getUrl());
expectType<OpenSeadragon.Point>(tile.getTranslationForEdgeSmoothing(1, new OpenSeadragon.Point(256, 256), new OpenSeadragon.Point(256, 256)));
expectType<string>(tile.toString());
expectType<void>(tile.unload());

// Spring
const spring = new OpenSeadragon.Spring({ springStiffness: 5, animationTime: 1.5 });
expectType<number>(spring.current.value);
spring.springTo(1);
spring.update();
expectType<boolean>(spring.isAtTargetValue());

// Mat3
const mat = OpenSeadragon.Mat3.makeIdentity();
expectType<OpenSeadragon.Mat3>(mat);
expectType<OpenSeadragon.Mat3>(OpenSeadragon.Mat3.makeRotation(Math.PI / 4));
expectType<OpenSeadragon.Mat3>(mat.multiply(OpenSeadragon.Mat3.makeScaling(2, 2)));

// Enums - verify they exist and are accessible
const _enumTest1 = OpenSeadragon.ButtonState.REST;
const _enumTest2 = OpenSeadragon.ControlAnchor.TOP_LEFT;
const _enumTest3 = OpenSeadragon.Placement.CENTER;
const _enumTest4 = OpenSeadragon.OverlayRotationMode.EXACT;

// PriorityQueue
const queue = new OpenSeadragon.PriorityQueue<string, number>();
expectType<void>(queue.insert("item1", 10));
expectType<OpenSeadragon.PriorityQueue.Node<string, number> | undefined>(queue.remove());
expectType<number | undefined>(queue.peek());
expectType<number>(queue.getCount());
expectType<boolean>(queue.isEmpty());
expectType<void>(queue.clear());

// CacheRecord
const cacheRecord = new OpenSeadragon.CacheRecord();
expectType<boolean>(cacheRecord.loaded);
expectType<any>(cacheRecord.data);
expectType<string>(cacheRecord.type);
expectType<void>(cacheRecord.destroy());
expectType<Promise<any>>(cacheRecord.await());
expectType<Promise<any>>(cacheRecord.setDataAs("test", "image"));
expectType<Promise<any>>(cacheRecord.getDataAs("image"));
expectType<any>(cacheRecord.getImage());
expectType<any>(cacheRecord.getRenderedContext());

// Utilities
expectType<Element>(OpenSeadragon.getElement("id"));
expectType<OpenSeadragon.Point>(OpenSeadragon.getElementOffset(document.createElement("div")));
expectType<OpenSeadragon.Point>(OpenSeadragon.getWindowSize());
expectType<string>(OpenSeadragon.version.versionStr);
expectType<boolean>(OpenSeadragon.supportsCanvas);
