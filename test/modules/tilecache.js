/* global QUnit, testLog */

(function() {

    // ----------
    QUnit.module('TileCache', {
        beforeEach: function () {
            testLog.reset();
        },
        afterEach: function () {
        }
    });

    // ----------
    // TODO: this used to be async
    QUnit.test('basics', function(assert) {
        var done = assert.async();
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
        assert.equal(cache.numTilesLoaded(), 0, 'no tiles to begin with');

        cache.cacheTile({
            tile: fakeTile0,
            tiledImage: fakeTiledImage0
        });

        assert.equal(cache.numTilesLoaded(), 1, 'tile count after cache');

        cache.cacheTile({
            tile: fakeTile1,
            tiledImage: fakeTiledImage1
        });

        assert.equal(cache.numTilesLoaded(), 2, 'tile count after second cache');

        cache.clearTilesFor(fakeTiledImage0);

        assert.equal(cache.numTilesLoaded(), 1, 'tile count after first clear');

        cache.clearTilesFor(fakeTiledImage1);

        assert.equal(cache.numTilesLoaded(), 0, 'tile count after second clear');

        done();
    });

    // ----------
    QUnit.test('maxImageCacheCount', function(assert) {
        var done = assert.async();
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

        assert.equal(cache.numTilesLoaded(), 0, 'no tiles to begin with');

        cache.cacheTile({
            tile: fakeTile0,
            tiledImage: fakeTiledImage0
        });

        assert.equal(cache.numTilesLoaded(), 1, 'tile count after add');

        cache.cacheTile({
            tile: fakeTile1,
            tiledImage: fakeTiledImage0
        });

        assert.equal(cache.numTilesLoaded(), 1, 'tile count after add of second image');

        cache.cacheTile({
            tile: fakeTile2,
            tiledImage: fakeTiledImage0
        });

        assert.equal(cache.numTilesLoaded(), 2, 'tile count after additional same image');

        done();
    });

})();
