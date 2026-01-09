import OpenSeadragon from '../types/index';
import Viewer = OpenSeadragon.Viewer;

function assertType<T>(_v: T) {}

// -----------------------------
// Construction / Options
// -----------------------------
// string ID form
const viewer = OpenSeadragon({ id: "viewer", prefixUrl: "/p/" });
assertType<OpenSeadragon.Viewer>(viewer);

// element form
const el = document.createElement("div");
const v2 = OpenSeadragon({ element: el });
assertType<OpenSeadragon.Viewer>(v2);

// navigator option shapes
const v3 = OpenSeadragon({
    id: "viewer2",
    showNavigator: true,
    navigatorSizeRatio: 0.25,
    navigatorTop: "10px",
});
assertType<OpenSeadragon.Viewer>(v3);

// Negative: id must not be number
// @ts-expect-error - id should be string | HTMLElement
OpenSeadragon({ id: 123 });

// -----------------------------
// Core viewport & methods
// -----------------------------
assertType<number>(viewer.viewport.getZoom());
assertType<OpenSeadragon.Rect>((viewer as OpenSeadragon.Viewer).viewport.getBounds());

viewer.open("https://example.com/info.json");

// panTo wrong type should error
// @ts-expect-error - panTo expects Point
viewer.panTo({ x: "no" });

// close/destroy existence
assertType<Viewer>(viewer.close());

// -----------------------------
// addTiledImage / TileSource shapes
// -----------------------------
viewer.addTiledImage({
    tileSource: {
        width: 800,
        height: 600,
        tileSize: 256, // your type mentions tileSize as possible field
    },
});

// Missing width should error (most tileSource shapes require width)
viewer.addTiledImage({ tileSource: { height: 100 } });

// Test open() overloads (string | object | array)
viewer.open("https://example.com/info.json");
viewer.open({ width: 10, height: 10, tileSize: 10 });
viewer.open([{ width: 1, height: 1, tileSize: 1 }]);

// -----------------------------
// Events: addHandler / removeHandler
// -----------------------------
viewer.addHandler("open", (ev) => {
    // eventSource should be Viewer
    assertType<OpenSeadragon.Viewer>(ev.eventSource);
    void ev;
});

// invalid event name should error
// @ts-expect-error - invalid event name should not compile
viewer.addHandler("notAnEvent", () => {});

// wrong handler signature should error
// @ts-expect-error - handler param must be event object
viewer.addHandler("open", (_s: string) => {});

// -----------------------------
// Overlays & Navigator
// -----------------------------
const div = document.createElement("div");
viewer.addOverlay({
    element: div,
    location: new OpenSeadragon.Rect(0, 0, 1, 1),
});
assertType<Viewer>((viewer as OpenSeadragon.Viewer).removeOverlay("some-id"));

if (viewer.navigator) {
    const nav = (viewer as OpenSeadragon.Viewer).navigator;
    assertType<OpenSeadragon.Navigator>(nav);
}

// -----------------------------
// World & TiledImage API
// -----------------------------
const world = viewer.world;
assertType<number>(world.getItemCount());
if (world.getItemCount() > 0) {
    const item = world.getItemAt(0);
    assertType<OpenSeadragon.TiledImage | undefined>(item);
    if (item) {
        const p = item.viewportToImageCoordinates(new OpenSeadragon.Point(0, 0));
        assertType<OpenSeadragon.Point>(p);
    }
}

// -----------------------------
// Geometry factories
// -----------------------------
const pt = new OpenSeadragon.Point(5, 6);
const rr = new OpenSeadragon.Rect(0, 0, 10, 10);
assertType<number>(pt.x);
assertType<number>(rr.width);
