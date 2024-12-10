// Test-wide mocks for more test stability: tests might require calling functions that expect
// presence of certain mock properties. It is better to include maintened mock props than to copy
// over all the place

window.MockSeadragon = {
    /**
     * Get mocked tile: loaded state, cutoff such that it is not kept in cache by force,
     *  level: 1, x: 0, y: 0,  all coords: [x0 y0 w0 h0]
     *
     *  Requires TiledImage referece (mock or real)
     * @return {OpenSeadragon.Tile}
     */
    getTile(url, tiledImage, props={}) {
        const dummyRect = new OpenSeadragon.Rect(0, 0, 0, 0, 0);
        //default cutoof = 0 --> use level 1 to not to keep caches from unloading (cutoff = navigator data, kept in cache)
        const dummyTile = new OpenSeadragon.Tile(1, 0, 0, dummyRect, true, url,
            undefined, true, null, dummyRect, null, url);
        dummyTile.tiledImage = tiledImage;
        //by default set as ready
        dummyTile.loaded = true;
        dummyTile.loading = false;
        //override anything we need
        OpenSeadragon.extend(tiledImage, props);
        return dummyTile;
    },

    /**
     * Get mocked viewer: it has not all props that might be required. If your
     * tests fails because they do not find some props on a viewer, add them here.
     *
     * Requires a drawer reference (mock or real). Automatically created if not provided.
     * @return {OpenSeadragon.Viewer}
     */
    getViewer(drawer=null, props={}) {
        drawer = drawer || this.getDrawer();
        return OpenSeadragon.extend(new class extends OpenSeadragon.EventSource {
            forceRedraw () {}
            drawer = drawer
            tileCache = new OpenSeadragon.TileCache()
        }, props);
    },

    /**
     * Get mocked viewer: it has not all props that might be required. If your
     * tests fails because they do not find some props on a viewer, add them here.
     * @return {OpenSeadragon.Viewer}
     */
    getDrawer(props={}) {
        return OpenSeadragon.extend({
            getType: function () {
                return "mock";
            }
        }, props);
    },

    /**
     * Get mocked tiled image: it has not all props that might be required. If your
     * tests fails because they do not find some props on a tiled image, add them here.
     *
     * Requires viewer reference (mock or real). Automatically created if not provided.
     * @return {OpenSeadragon.TiledImage}
     */
    getTiledImage(viewer=null, props={}) {
        viewer = viewer || this.getViewer();
        return OpenSeadragon.extend({
            viewer: viewer,
            source: OpenSeadragon.TileSource.prototype,
            redraw: function() {},
            _tileCache: viewer.tileCache
        }, props);
    },

    /**
     * Get mocked tile source
     * @return {OpenSeadragon.TileSource}
     */
    getTileSource(props={}) {
        return new OpenSeadragon.TileSource(OpenSeadragon.extend({
            width: 1500,
            height: 1000,
            tileWidth: 200,
            tileHeight: 150,
            tileOverlap: 0
        }, props));
    },

    /**
     * Get mocked cache record
     * @return {OpenSeadragon.CacheRecord}
     */
    getCacheRecord(props={}) {
        return OpenSeadragon.extend(new OpenSeadragon.CacheRecord(), props);
    }
};

