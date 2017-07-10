/* global module, asyncTest, $, ok, equal, notEqual, start, test, Util, testLog */

(function() {

    // ----------
    module('TileCache', {
        setup: function () {
            testLog.reset();
        },
        teardown: function () {
        }
    });

    // ----------
    asyncTest('basics', function() {
        var fakeViewer = {
            raiseEvent: function() {}
        };
        var fakeTiledImage0 = {
            viewer: fakeViewer
        };
        var fakeTiledImage1 = {
            viewer: fakeViewer
        };

        var fakeTile0 = {
            url: 'foo.jpg',
            cacheKey: 'foo.jpg',
            image: {},
            unload: function() {}
        };

        var fakeTile1 = {
            url: 'foo.jpg',
            cacheKey: 'foo.jpg',
            image: {},
            unload: function() {}
        };

        var cache = new OpenSeadragon.TileCache();
        equal(cache.numTilesLoaded(), 0, 'no tiles to begin with');

        cache.cacheTile({
            tile: fakeTile0,
            tiledImage: fakeTiledImage0
        });

        equal(cache.numTilesLoaded(), 1, 'tile count after cache');

        cache.cacheTile({
            tile: fakeTile1,
            tiledImage: fakeTiledImage1
        });

        equal(cache.numTilesLoaded(), 2, 'tile count after second cache');

        cache.clearTilesFor(fakeTiledImage0);

        equal(cache.numTilesLoaded(), 1, 'tile count after first clear');

        cache.clearTilesFor(fakeTiledImage1);

        equal(cache.numTilesLoaded(), 0, 'tile count after second clear');

        start();
    });

    // ----------
    asyncTest('maxImageCacheCount', function() {
        var fakeViewer = {
            raiseEvent: function() {}
        };
        var fakeTiledImage0 = {
            viewer: fakeViewer
        };

        var fakeTile0 = {
            url: 'different.jpg',
            cacheKey: 'different.jpg',
            image: {},
            unload: function() {}
        };

        var fakeTile1 = {
            url: 'same.jpg',
            cacheKey: 'same.jpg',
            image: {},
            unload: function() {}
        };

        var fakeTile2 = {
            url: 'same.jpg',
            cacheKey: 'same.jpg',
            image: {},
            unload: function() {}
        };

        var cache = new OpenSeadragon.TileCache({
            maxImageCacheCount: 1
        });

        equal(cache.numTilesLoaded(), 0, 'no tiles to begin with');

        cache.cacheTile({
            tile: fakeTile0,
            tiledImage: fakeTiledImage0
        });

        equal(cache.numTilesLoaded(), 1, 'tile count after add');

        cache.cacheTile({
            tile: fakeTile1,
            tiledImage: fakeTiledImage0
        });

        equal(cache.numTilesLoaded(), 1, 'tile count after add of second image');

        cache.cacheTile({
            tile: fakeTile2,
            tiledImage: fakeTiledImage0
        });

        equal(cache.numTilesLoaded(), 2, 'tile count after additional same image');

        start();
    });

})();
