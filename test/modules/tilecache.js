/* global QUnit, testLog */

(function() {
    let viewer;

    //we override jobs: remember original function
    const originalJob = OpenSeadragon.ImageLoader.prototype.addJob;

    //event awaiting
    function waitFor(predicate) {
        const time = setInterval(() => {
            if (predicate()) {
                clearInterval(time);
            }
        }, 20);
    }

    // ----------
    QUnit.module('TileCache', {
        beforeEach: function () {
            $('<div id="example"></div>').appendTo("#qunit-fixture");

            testLog.reset();

            viewer = OpenSeadragon({
                id: 'example',
                prefixUrl: '/build/openseadragon/images/',
                maxImageCacheCount: 200, //should be enough to fit test inside the cache
                springStiffness: 100 // Faster animation = faster tests
            });
            OpenSeadragon.ImageLoader.prototype.addJob = originalJob;
        },
        afterEach: function () {
            if (viewer && viewer.close) {
                viewer.close();
            }

            viewer = null;
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
            viewer: fakeViewer,
            source: OpenSeadragon.TileSource.prototype
        };
        var fakeTiledImage1 = {
            viewer: fakeViewer,
            source: OpenSeadragon.TileSource.prototype
        };

        var fakeTile0 = {
            url: 'foo.jpg',
            cacheKey: 'foo.jpg',
            image: {},
            loaded: true,
            tiledImage: fakeTiledImage0,
            _caches: [],
            unload: function() {}
        };

        var fakeTile1 = {
            url: 'foo.jpg',
            cacheKey: 'foo.jpg',
            image: {},
            loaded: true,
            tiledImage: fakeTiledImage1,
            _caches: [],
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
            viewer: fakeViewer,
            source: OpenSeadragon.TileSource.prototype
        };

        var fakeTile0 = {
            url: 'different.jpg',
            cacheKey: 'different.jpg',
            image: {},
            loaded: true,
            tiledImage: fakeTiledImage0,
            _caches: [],
            unload: function() {}
        };

        var fakeTile1 = {
            url: 'same.jpg',
            cacheKey: 'same.jpg',
            image: {},
            loaded: true,
            tiledImage: fakeTiledImage0,
            _caches: [],
            unload: function() {}
        };

        var fakeTile2 = {
            url: 'same.jpg',
            cacheKey: 'same.jpg',
            image: {},
            loaded: true,
            tiledImage: fakeTiledImage0,
            _caches: [],
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

    QUnit.test('Zombie Cache', function(test) {
        const done = test.async();

        //test jobs by coverage: fail if
        let jobCounter = 0, coverage = undefined;
        OpenSeadragon.ImageLoader.prototype.addJob = function (options) {
            jobCounter++;
            if (coverage) {
                //old coverage of previous tiled image: if loaded, fail --> should be in cache
                const coverageItem = coverage[options.tile.level][options.tile.x][options.tile.y];
                test.ok(!coverageItem, "Attempt to add job for tile that is not in cache OK if previously not loaded.");
            }
            return originalJob.call(this, options);
        };

        let tilesFinished = 0;
        const tileCounter = function (event) {tilesFinished++;}

        const openHandler = function(event) {
            event.item.allowZombieCache(true);

            viewer.world.removeHandler('add-item', openHandler);
            test.ok(jobCounter === 0, 'Initial state, no images loaded');

            waitFor(() => {
                if (tilesFinished === jobCounter && event.item._fullyLoaded) {
                    coverage = $.extend(true, {}, event.item.coverage);
                    viewer.world.removeAll();
                    return true;
                }
                return false;
            });
        };

        let jobsAfterRemoval = 0;
        const removalHandler = function (event) {
            viewer.world.removeHandler('remove-item', removalHandler);
            test.ok(jobCounter > 0, 'Tiled image removed after 100 ms, should load some images.');
            jobsAfterRemoval = jobCounter;

            viewer.world.addHandler('add-item', reopenHandler);
            viewer.addTiledImage({
                tileSource: '/test/data/testpattern.dzi'
            });
        }

        const reopenHandler = function (event) {
            event.item.allowZombieCache(true);

            viewer.removeHandler('add-item', reopenHandler);
            test.equal(jobCounter, jobsAfterRemoval, 'Reopening image does not fetch any tiles imemdiatelly.');

            waitFor(() => {
                if (event.item._fullyLoaded) {
                    viewer.removeHandler('tile-unloaded', unloadTileHandler);
                    viewer.removeHandler('tile-loaded', tileCounter);

                    //console test needs here explicit removal to finish correctly
                    OpenSeadragon.ImageLoader.prototype.addJob = originalJob;
                    done();
                    return true;
                }
                return false;
            });
        };

        const unloadTileHandler = function (event) {
            test.equal(event.destroyed, false, "Tile unload event should not delete with zombies!");
        }

        viewer.world.addHandler('add-item', openHandler);
        viewer.world.addHandler('remove-item', removalHandler);
        viewer.addHandler('tile-unloaded', unloadTileHandler);
        viewer.addHandler('tile-loaded', tileCounter);

        viewer.open('/test/data/testpattern.dzi');
    });

    QUnit.test('Zombie Cache Replace Item', function(test) {
        const done = test.async();

        //test jobs by coverage: fail if
        let jobCounter = 0, coverage = undefined;
        OpenSeadragon.ImageLoader.prototype.addJob = function (options) {
            jobCounter++;
            if (coverage) {
                //old coverage of previous tiled image: if loaded, fail --> should be in cache
                const coverageItem = coverage[options.tile.level][options.tile.x][options.tile.y];
                if (!coverageItem) {
                    console.warn(coverage, coverage[options.tile.level][options.tile.x], options.tile);
                }
                test.ok(!coverageItem, "Attempt to add job for tile data that was previously loaded.");
            }
            return originalJob.call(this, options);
        };

        let tilesFinished = 0;
        const tileCounter = function (event) {tilesFinished++;}

        const openHandler = function(event) {
            event.item.allowZombieCache(true);
            viewer.world.removeHandler('add-item', openHandler);
            viewer.world.addHandler('add-item', reopenHandler);

            waitFor(() => {
                if (tilesFinished === jobCounter && event.item._fullyLoaded) {
                    coverage = $.extend(true, {}, event.item.coverage);
                    viewer.addTiledImage({
                        tileSource: '/test/data/testpattern.dzi',
                        index: 0,
                        replace: true
                    });
                    return true;
                }
                return false;
            });
        };

        const reopenHandler = function (event) {
            event.item.allowZombieCache(true);

            viewer.removeHandler('add-item', reopenHandler);
            waitFor(() => {
                if (event.item._fullyLoaded) {
                    viewer.removeHandler('tile-unloaded', unloadTileHandler);
                    viewer.removeHandler('tile-loaded', tileCounter);

                    //console test needs here explicit removal to finish correctly
                    OpenSeadragon.ImageLoader.prototype.addJob = originalJob;
                    done();
                    return true;
                }
                return false;
            });
        };

        const unloadTileHandler = function (event) {
            test.equal(event.destroyed, false, "Tile unload event should not delete with zombies!");
        }

        viewer.world.addHandler('add-item', openHandler);
        viewer.addHandler('tile-unloaded', unloadTileHandler);
        viewer.addHandler('tile-loaded', tileCounter);

        viewer.open('/test/data/testpattern.dzi');
    });

})();
