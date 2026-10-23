import OpenSeadragon from "./openseadragon.js";

// Imported in dependency order: each file extends OpenSeadragon with what later files use.
import "./matrix3.js";
import "./fullscreen.js";
import "./eventsource.js";
import "./mousetracker.js";
import "./control.js";
import "./controldock.js";
import "./placement.js";
import "./viewer.js";
import "./navigator.js";
import "./strings.js";
import "./point.js";
import "./tilesource.js";
import "./dzitilesource.js";
import "./iiiftilesource.js";
import "./iiptilesource.js";
import "./iristilesource.js";
import "./osmtilesource.js";
import "./tmstilesource.js";
import "./zoomifytilesource.js";
import "./legacytilesource.js";
import "./imagetilesource.js";
import "./tilesourcecollection.js";
import "./priorityqueue.js";
import "./datatypeconverter.js";
import "./button.js";
import "./buttongroup.js";
import "./rectangle.js";
import "./referencestrip.js";
import "./displayrectangle.js";
import "./spring.js";
import "./imageloader.js";
import "./tile.js";
import "./overlay.js";
import "./drawerbase.js";
import "./htmldrawer.js";
import "./canvasdrawer.js";
import "./webgldrawer.js";
import "./viewport.js";
import "./tiledimage.js";
import "./tilecache.js";
import "./world.js";

// Universal Module Definition. In a plain script tag the build's top-level
// `var OpenSeadragon` is the global, as the function declaration was before.
if (typeof define === 'function' && define.amd) {
    define([], function () {
        return OpenSeadragon;
    });
} else if (typeof module === 'object' && module.exports) {
    module.exports = OpenSeadragon;
}

export default OpenSeadragon;
