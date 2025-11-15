import OpenSeadragon from "../types";

// construction
const viewer = OpenSeadragon({ id: "viewer" });

// event handler should accept typed event param (adjust to your d.ts shapes)
viewer.addHandler("open", (e) => {
    // basic smoke access
    void e;
});

// tiled image call smoke
viewer.addTiledImage({
    tileSource: { width: 800, height: 600, tileSize: 256 }
});
