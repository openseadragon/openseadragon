import OpenSeadragon from '../types/index';
import Viewer = OpenSeadragon.Viewer;

function assertType<T>(_v: T) {}

// -----------------------------
// Construction / Options
// -----------------------------
// string ID form
const v1 = OpenSeadragon({ id: "viewer", prefixUrl: "/p/" });
assertType<OpenSeadragon.Viewer>(v1);

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
assertType<number>((v1 as OpenSeadragon.Viewer).viewport.getZoom());
assertType<OpenSeadragon.Rect>((v1 as OpenSeadragon.Viewer).viewport.getBounds());

(v1 as OpenSeadragon.Viewer).open("https://example.com/info.json");

// panTo wrong type should error
// @ts-expect-error - panTo expects Point
(v1 as OpenSeadragon.Viewer).panTo({ x: "no" });

// close/destroy existence
assertType<Viewer>((v1 as OpenSeadragon.Viewer).close());

// -----------------------------
// addTiledImage / TileSource shapes
// -----------------------------
(v1 as OpenSeadragon.Viewer).addTiledImage({
    tileSource: {
        width: 800,
        height: 600,
        tileSize: 256, // your type mentions tileSize as possible field
    },
});

// Missing width should error (most tileSource shapes require width)
(v1 as OpenSeadragon.Viewer).addTiledImage({ tileSource: { height: 100 } });

// Test open() overloads (string | object | array)
(v1 as OpenSeadragon.Viewer).open("https://example.com/info.json");
(v1 as OpenSeadragon.Viewer).open({ width: 10, height: 10, tileSize: 10 });
(v1 as OpenSeadragon.Viewer).open([{ width: 1, height: 1, tileSize: 1 }]);

// -----------------------------
// Events: addHandler / removeHandler
// -----------------------------
(v1 as OpenSeadragon.Viewer).addHandler("open", (ev) => {
    // eventSource should be Viewer
    assertType<OpenSeadragon.Viewer>(ev.eventSource);
    void ev;
});

// invalid event name should error
// @ts-expect-error - invalid event name should not compile
v1.addHandler("notAnEvent", () => {});

// wrong handler signature should error
// @ts-expect-error - handler param must be event object
(v1 as OpenSeadragon.Viewer).addHandler("open", (_s: string) => {});

// -----------------------------
// Overlays & Navigator
// -----------------------------
const div = document.createElement("div");
(v1 as OpenSeadragon.Viewer).addOverlay({
    element: div,
    location: new OpenSeadragon.Rect(0, 0, 1, 1),
});
assertType<Viewer>((v1 as OpenSeadragon.Viewer).removeOverlay("some-id"));

if ((v1 as OpenSeadragon.Viewer).navigator) {
    const nav = (v1 as OpenSeadragon.Viewer).navigator;
    assertType<OpenSeadragon.Navigator>(nav);
}

// -----------------------------
// World & TiledImage API
// -----------------------------
const world = (v1 as OpenSeadragon.Viewer).world;
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
