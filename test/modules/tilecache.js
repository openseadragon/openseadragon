/* global QUnit, testLog */

(function() {
    const Convertor = OpenSeadragon.convertor,
        T_A = "__TEST__typeA", T_B = "__TEST__typeB", T_C = "__TEST__typeC", T_D = "__TEST__typeD", T_E = "__TEST__typeE";

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
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    // Replace conversion with our own system and test: __TEST__ prefix must be used, otherwise
    // other tests will interfere
    let typeAtoB = 0, typeBtoC = 0, typeCtoA = 0, typeDtoA = 0, typeCtoE = 0;
    //set all same costs to get easy testing, know which path will be taken
    Convertor.learn(T_A, T_B, (tile, x) => {
        typeAtoB++;
        return x+1;
    });
    // Costly conversion to C simulation
    Convertor.learn(T_B, T_C, async (tile, x) => {
        typeBtoC++;
        await sleep(5);
        return x+1;
    });
    Convertor.learn(T_C, T_A, (tile, x) => {
        typeCtoA++;
        return x+1;
    });
    Convertor.learn(T_D, T_A, (tile, x) => {
        typeDtoA++;
        return x+1;
    });
    Convertor.learn(T_C, T_E, (tile, x) => {
        typeCtoE++;
        return x+1;
    });
    //'Copy constructors'
    let copyA = 0, copyB = 0, copyC = 0, copyD = 0, copyE = 0;
    //also learn destructors
    Convertor.learn(T_A, T_A,(tile, x) => {
        copyA++;
        return x+1;
    });
    Convertor.learn(T_B, T_B,(tile, x) => {
        copyB++;
        return x+1;
    });
    Convertor.learn(T_C, T_C,(tile, x) => {
        copyC++;
        return x-1;
    });
    Convertor.learn(T_D, T_D,(tile, x) => {
        copyD++;
        return x+1;
    });
    Convertor.learn(T_E, T_E,(tile, x) => {
        copyE++;
        return x+1;
    });
    let destroyA = 0, destroyB = 0, destroyC = 0, destroyD = 0, destroyE = 0;
    //also learn destructors
    Convertor.learnDestroy(T_A, () => {
        destroyA++;
    });
    Convertor.learnDestroy(T_B, () => {
        destroyB++;
    });
    Convertor.learnDestroy(T_C, () => {
        destroyC++;
    });
    Convertor.learnDestroy(T_D, () => {
        destroyD++;
    });
    Convertor.learnDestroy(T_E, () => {
        destroyE++;
    });

    // ----------
    QUnit.module('TileCache', {
        beforeEach: function () {
            $('<div id="example"></div>').appendTo("#qunit-fixture");

            testLog.reset();
            OpenSeadragon.ImageLoader.prototype.addJob = originalJob;

            // Reset counters
            typeAtoB = 0, typeBtoC = 0, typeCtoA = 0, typeDtoA = 0, typeCtoE = 0;
            copyA = 0, copyB = 0, copyC = 0, copyD = 0, copyE = 0;
            destroyA = 0, destroyB = 0, destroyC = 0, destroyD = 0, destroyE = 0;

            OpenSeadragon.TestCacheDrawer = class extends OpenSeadragon.DrawerBase {
                constructor(opts) {
                    super(opts);
                    this.testEvents = new OpenSeadragon.EventSource();
                }

                static isSupported() {
                    return true;
                }

                _createDrawingElement() {
                    return document.createElement("div");
                }

                draw(tiledImages) {
                    for (let image of tiledImages) {
                        const tilesDoDraw = image.getTilesToDraw().map(info => info.tile);
                        for (let tile of tilesDoDraw) {
                            const data = this.getDataToDraw(tile);
                            this.testEvents.raiseEvent('test-tile', {
                                tile: tile,
                                dataToDraw: data,
                            });
                        }
                    }
                }

                internalCacheFree(data) {
                    this.testEvents.raiseEvent('free-data');
                }

                canRotate() {
                    return true;
                }

                destroy() {
                    this.destroyInternalCache();
                }

                setImageSmoothingEnabled(imageSmoothingEnabled){
                    //noop
                }

                drawDebuggingRect(rect) {
                    //noop
                }

                clear(){
                    //noop
                }
            }

            OpenSeadragon.SyncInternalCacheDrawer = class extends OpenSeadragon.TestCacheDrawer {

                getType() {
                    return "test-cache-drawer-sync";
                }

                getSupportedDataFormats() {
                    return [T_C, T_E];
                }

                // Make test use private cache
                get defaultOptions() {
                    return {
                        usePrivateCache: true,
                        preloadCache: false,
                    };
                }

                internalCacheCreate(cache, tile) {
                    this.testEvents.raiseEvent('create-data');
                    return cache.data;
                }
            }

            OpenSeadragon.AsnycInternalCacheDrawer = class extends OpenSeadragon.TestCacheDrawer {

                getType() {
                    return "test-cache-drawer-async";
                }

                getSupportedDataFormats() {
                    return [T_A];
                }

                // Make test use private cache
                get defaultOptions() {
                    return {
                        usePrivateCache: true,
                        preloadCache: true,
                    };
                }

                internalCacheCreate(cache, tile) {
                    this.testEvents.raiseEvent('create-data');
                    return cache.getDataAs(T_C, true);
                }

                internalCacheFree(data) {
                    super.internalCacheFree(data);
                    // Be nice and truly destroy the data copy
                    OpenSeadragon.convertor.destroy(data, T_C);
                }
            }

            OpenSeadragon.EmptyTestT_ATileSource = class extends OpenSeadragon.TileSource {

                supports( data, url ){
                    return data && data.isTestSource;
                }

                configure( data, url, postData ){
                    return {
                        width: 512, /* width *required */
                        height: 512, /* height *required */
                        tileSize: 128, /* tileSize *required */
                        tileOverlap: 0, /* tileOverlap *required */
                        minLevel: 0, /* minLevel */
                        maxLevel: 3, /* maxLevel */
                        tilesUrl: "", /* tilesUrl */
                        fileFormat: "", /* fileFormat */
                        displayRects: null /* displayRects */
                    }
                }

                getTileUrl(level, x, y) {
                    return String(level); //treat each tile on level same to introduce cache overlaps
                }

                downloadTileStart(context) {
                    context.finish(0, null, T_A);
                }
            }
        },
        afterEach: function () {
            if (viewer && viewer.close) {
                viewer.close();
            }

            // Some tests test all drawers - remove test drawers to avoid collision with other tests
            OpenSeadragon.EmptyTestT_ATileSource = null;
            OpenSeadragon.AsnycInternalCacheDrawer = null;
            OpenSeadragon.SyncInternalCacheDrawer = null;
            OpenSeadragon.TestCacheDrawer = null;

            viewer = null;
        }
    });

    // ----------
    QUnit.test('basics', function(assert) {
        const done = assert.async();
        const fakeViewer = MockSeadragon.getViewer(
            MockSeadragon.getDrawer({
                // tile in safe mode inspects the supported formats upon cache set
                getSupportedDataFormats() {
                    return [T_A, T_B, T_C, T_D, T_E];
                }
            })
        );
        const fakeTiledImage0 = MockSeadragon.getTiledImage(fakeViewer);
        const fakeTiledImage1 = MockSeadragon.getTiledImage(fakeViewer);

        const tile0 = MockSeadragon.getTile('foo.jpg', fakeTiledImage0);
        const tile1 = MockSeadragon.getTile('foo.jpg', fakeTiledImage1);

        const cache = new OpenSeadragon.TileCache();
        assert.equal(cache.numTilesLoaded(), 0, 'no tiles to begin with');

        tile0._caches[tile0.cacheKey] = cache.cacheTile({
            tile: tile0,
            tiledImage: fakeTiledImage0,
            data: 3,
            dataType: T_A
        });
        tile0._cacheSize++;

        assert.equal(cache.numTilesLoaded(), 1, 'tile count after cache');

        tile1._caches[tile1.cacheKey] = cache.cacheTile({
            tile: tile1,
            tiledImage: fakeTiledImage1,
            data: 55,
            dataType: T_B
        });
        tile1._cacheSize++;
        assert.equal(cache.numTilesLoaded(), 2, 'tile count after second cache');

        cache.clearTilesFor(fakeTiledImage0);

        assert.equal(cache.numTilesLoaded(), 1, 'tile count after first clear');

        cache.clearTilesFor(fakeTiledImage1);

        assert.equal(cache.numTilesLoaded(), 0, 'tile count after second clear');

        done();
    });

    // ----------
    QUnit.test('maxImageCacheCount', function(assert) {
        const done = assert.async();
        const fakeViewer = MockSeadragon.getViewer(
            MockSeadragon.getDrawer({
                // tile in safe mode inspects the supported formats upon cache set
                getSupportedDataFormats() {
                    return [T_A, T_B, T_C, T_D, T_E];
                }
            })
        );
        const fakeTiledImage0 = MockSeadragon.getTiledImage(fakeViewer);
        const tile0 = MockSeadragon.getTile('different.jpg', fakeTiledImage0);
        const tile1 = MockSeadragon.getTile('same.jpg', fakeTiledImage0);
        const tile2 = MockSeadragon.getTile('same.jpg', fakeTiledImage0);

        const cache = new OpenSeadragon.TileCache({
            maxImageCacheCount: 1
        });

        assert.equal(cache.numTilesLoaded(), 0, 'no tiles to begin with');

        tile0._caches[tile0.cacheKey] = cache.cacheTile({
            tile: tile0,
            tiledImage: fakeTiledImage0,
            data: 55,
            dataType: T_B
        });
        tile0._cacheSize++;

        assert.equal(cache.numTilesLoaded(), 1, 'tile count after add');

        tile1._caches[tile1.cacheKey] = cache.cacheTile({
            tile: tile1,
            tiledImage: fakeTiledImage0,
            data: 55,
            dataType: T_B
        });
        tile1._cacheSize++;

        assert.equal(cache.numTilesLoaded(), 1, 'tile count after add of second image');

        tile2._caches[tile2.cacheKey] = cache.cacheTile({
            tile: tile2,
            tiledImage: fakeTiledImage0,
            data: 55,
            dataType: T_B
        });
        tile2._cacheSize++;

        assert.equal(cache.numTilesLoaded(), 2, 'tile count after additional same image');

        done();
    });

    // Tile API and cache interaction
    QUnit.test('Tile: basic rendering & test setup (sync drawer)', function(test) {
        const done = test.async();

        viewer = OpenSeadragon({
            id: 'example',
            prefixUrl: '/build/openseadragon/images/',
            maxImageCacheCount: 200, //should be enough to fit test inside the cache
            springStiffness: 100, // Faster animation = faster tests
            drawer: 'test-cache-drawer-sync',
        });

        const tileCache = viewer.tileCache;
        const drawer = viewer.drawer;

        let testTileCalled = false;
        let countFreeCalled = 0;
        let countCreateCalled = 0;
        drawer.testEvents.addHandler('test-tile', e => {
            testTileCalled = true;
            test.ok(e.dataToDraw, "Tile data is ready to be drawn");
        });
        drawer.testEvents.addHandler('create-data', e => {
            countCreateCalled++;
        });
        drawer.testEvents.addHandler('free-data', e => {
            countFreeCalled++;
        });

        viewer.addHandler('open', async () => {
            await viewer.waitForFinishedJobsForTest();
            await sleep(1);  // necessary to make space for a draw call

            test.ok(viewer.world.getItemAt(0).source instanceof OpenSeadragon.EmptyTestT_ATileSource, "Tests are done with empty test source type T_A.");
            test.ok(viewer.world.getItemAt(1).source instanceof OpenSeadragon.EmptyTestT_ATileSource, "Tests are done with empty test source type T_A.");
            test.ok(testTileCalled, "Drawer tested at least one tile.");

            test.ok(typeAtoB > 1, "At least one conversion was triggered.");
            test.equal(typeAtoB, typeBtoC, "A->B = B->C, since we need to move all data to T_C for the drawer.");

            for (let tile of tileCache._tilesLoaded) {
                const cache = tile.getCache();
                test.equal(cache.type, T_C, "Cache data was affected, the drawer supports only T_C since there is no way to get to T_E.");

                const internalCache = cache.getDataForRendering(drawer, tile);
                test.equal(internalCache.type, viewer.drawer.getId(), "Sync conversion routine means T_C is also internal since dataCreate only creates data. However, internal cache keeps type of the drawer ID.");
                test.ok(internalCache.loaded, "Internal cache ready.");
            }

            test.ok(countCreateCalled > 0, "Internal cache creation called.");
            viewer.drawer.destroyInternalCache();
            test.equal(countCreateCalled, countFreeCalled, "Free called as many times as create.");

            done();
        });
        viewer.open([
            {isTestSource: true},
            {isTestSource: true},
        ]);
    });

    QUnit.test('Tile & Invalidation API: basic conversion & preprocessing', function(test) {
        const done = test.async();

        viewer = OpenSeadragon({
            id: 'example',
            prefixUrl: '/build/openseadragon/images/',
            maxImageCacheCount: 200, //should be enough to fit test inside the cache
            springStiffness: 100, // Faster animation = faster tests
            drawer: 'test-cache-drawer-async',
        });
        const tileCache = viewer.tileCache;
        const drawer = viewer.drawer;

        let testTileCalled = false;

        let _currentTestVal = undefined;
        let previousTestValue = undefined;
        drawer.testEvents.addHandler('test-tile', e => {
            test.ok(e.dataToDraw, "Tile data is ready to be drawn");
            if (_currentTestVal !== undefined) {
                testTileCalled = true;
                test.equal(e.dataToDraw, _currentTestVal, "Value is correct on the drawn data.");
            }
        });

        function testDrawingRoutine(value) {
            _currentTestVal = value;
            viewer.world.needsDraw();
            viewer.world.draw();
            _currentTestVal = undefined;
        }

        viewer.addHandler('open', async () => {
            await viewer.waitForFinishedJobsForTest();
            await sleep(1);  // necessary to make space for a draw call

            // Test simple data set -> creates main cache

            let testHandler = async e => {
                // data comes in as T_A
                test.equal(typeDtoA, 0, "No conversion needed to get type A.");
                test.equal(typeCtoA, 0, "No conversion needed to get type A.");

                const data = await e.getData(T_A);
                test.equal(data, 1, "Copy: creation of a working cache.");
                e.tile.__TEST_PROCESSED = true;

                // Test value 2 since we set T_C no need to convert
                await e.setData(2, T_C);
                test.notOk(e.outdated(), "Event is still valid.");
            };

            viewer.addHandler('tile-invalidated', testHandler);
            await viewer.world.requestInvalidate(true);

            //test for each level only single cache was processed
            const processedLevels = {};
            for (let tile of tileCache._tilesLoaded) {
                const level = tile.level;

                if (tile.__TEST_PROCESSED) {
                    test.ok(!processedLevels[level], "Only single tile processed per level.");
                    processedLevels[level] = true;
                    delete tile.__TEST_PROCESSED;
                }

                const origCache = tile.getCache(tile.originalCacheKey);
                test.equal(origCache.type, T_A, "Original cache data was not affected, the drawer uses internal cache.");
                test.equal(origCache.data, 0, "Original cache data was not affected, the drawer uses internal cache.");

                const cache = tile.getCache();
                test.equal(cache.type, T_A, "Main Cache Converted T_C -> T_A (drawer supports type A) (suite 1)");
                test.equal(cache.data, 3, "Conversion step increases plugin-stored value 2 to 3");

                const internalCache = cache.getDataForRendering(drawer, tile);
                test.equal(internalCache.type, viewer.drawer.getId(), "Internal cache has type of the drawer ID.");
                test.ok(internalCache.loaded, "Internal cache ready.");
            }
            // Internal cache will have value 5: main cache is 3, type is T_A,
            testDrawingRoutine(5); // internal cache transforms to T_C: two steps, TA->TB->TC 3+2

            // Test that basic scenario with reset data false starts from the main cache data of previous round
            const modificationConstant = 50;
            viewer.removeHandler('tile-invalidated', testHandler);
            testHandler = async e => {
                const data = await e.getData(T_B);
                test.equal(data, 4, "A -> B conversion happened, we started from value 3 in the main cache.");
                await e.setData(data + modificationConstant, T_B);
                test.notOk(e.outdated(), "Event is still valid.");
            };

            viewer.addHandler('tile-invalidated', testHandler);
            await viewer.world.requestInvalidate(false);

            // We set data as TB - there is required T_A: T_B -> T_C -> T_A conversion round on the main cache
            let newValue = modificationConstant + 4 + 2;
            // and there is still requirement of T_C on internal data, +2 steps
            testDrawingRoutine(newValue + 2);

            for (let tile of tileCache._tilesLoaded) {
                const cache = tile.getCache();
                test.equal(cache.type, T_A, "Main Cache Updated (suite 2).");
                test.equal(cache.data, newValue, "Main Cache Updated (suite 2).");
            }

            // Now test whether data reset works, value 1 -> copy perfomed due to internal cache cration
            viewer.removeHandler('tile-invalidated', testHandler);
            testHandler = async e => {
                const data = await e.getData(T_B);
                test.equal(data, 1, "Copy: creation of a working cache.");
                await e.setData(-8, T_E);
                e.resetData();
            };
            viewer.addHandler('tile-invalidated', testHandler);
            await viewer.world.requestInvalidate(true);
            await sleep(1);  // necessary to make space for a draw call
            testDrawingRoutine(2); // Value +2 rendering from original data

            for (let tile of tileCache._tilesLoaded) {
                const origCache = tile.getCache(tile.originalCacheKey);
                test.ok(tile.getCache() === origCache, "Main cache is now original cache.");
            }

            // Now force main cache creation that differs
            viewer.removeHandler('tile-invalidated', testHandler);
            testHandler = async e => {
                await e.setData(41, T_B);
            };
            viewer.addHandler('tile-invalidated', testHandler);
            await viewer.world.requestInvalidate(true);

            // Now test whether data reset works, even with non-original data
            viewer.removeHandler('tile-invalidated', testHandler);
            testHandler = async e => {
                const data = await e.getData(T_B);
                test.equal(data, 44, "Copy: 41 +2 (previous request invalidate ends at T_A) + 1 (we request type B).");
                await e.setData(data, T_E); // there is no way to convert T_E -> T_A, this would throw an error
                e.resetData(); // reset data will revert to original cache
            };
            viewer.addHandler('tile-invalidated', testHandler);

            // The data will be 45 since no change has been made:
            // last main cache set was 41 T_B, supported T_A = +2
            //  and internal requirement T_C = +2
            const checkNotCalled = e => {
                test.ok(false, "Create data must not be called when there is no change!");
            };
            drawer.testEvents.addHandler('create-data', checkNotCalled);

            await viewer.world.requestInvalidate(false);
            testDrawingRoutine(45);

            for (let tile of tileCache._tilesLoaded) {
                const origCache = tile.getCache(tile.originalCacheKey);
                test.equal(origCache.type, T_A, "Original cache data was not affected, the drawer uses main cache even after refresh.");
                test.equal(origCache.data, 0, "Original cache data was not affected, the drawer uses main cache even after refresh.");
            }

            test.ok(testTileCalled, "Drawer tested at least one tile.");
            viewer.destroy();
            done();
        });
        viewer.open([
            {isTestSource: true},
            {isTestSource: true},
        ]);
    });

    //Tile API and cache interaction
    QUnit.test('Tile API Cache Interaction', function(test) {
        const done = test.async();
        const fakeViewer = MockSeadragon.getViewer(
            MockSeadragon.getDrawer({
                // tile in safe mode inspects the supported formats upon cache set
                getSupportedDataFormats() {
                    return [T_A, T_B, T_C, T_D, T_E];
                }
            })
        );
        const tileCache = fakeViewer.tileCache;
        const fakeTiledImage0 = MockSeadragon.getTiledImage(fakeViewer);
        const fakeTiledImage1 = MockSeadragon.getTiledImage(fakeViewer);

        //load data
        const tile00 = MockSeadragon.getTile('foo.jpg', fakeTiledImage0);
        tile00.addCache(tile00.cacheKey, 0, T_A, false, false);
        const tile01 = MockSeadragon.getTile('foo2.jpg', fakeTiledImage0);
        tile01.addCache(tile01.cacheKey, 0, T_B, false, false);
        const tile10 = MockSeadragon.getTile('foo3.jpg', fakeTiledImage1);
        tile10.addCache(tile10.cacheKey, 0, T_C, false, false);
        const tile11 = MockSeadragon.getTile('foo3.jpg', fakeTiledImage1);
        tile11.addCache(tile11.cacheKey, 0, T_C, false, false);
        const tile12 = MockSeadragon.getTile('foo.jpg', fakeTiledImage1);
        tile12.addCache(tile12.cacheKey, 0, T_A, false, false);

        //test set/get data in async env
        (async function() {
            test.equal(tileCache.numTilesLoaded(), 5, "We loaded 5 tiles");
            test.equal(tileCache.numCachesLoaded(), 3, "We loaded 3 cache objects - three different urls");

            const c00 = tile00.getCache(tile00.cacheKey);
            const c12 = tile12.getCache(tile12.cacheKey);

            //now test multi-cache within tile
            const theTileKey = tile00.cacheKey;
            tile00.addCache(tile00.buildDistinctMainCacheKey(), 42, T_E, true, false);
            test.notEqual(tile00.cacheKey, tile00.originalCacheKey, "New cache rendered.");

            //now add artifically another record
            tile00.addCache("my_custom_cache", 128, T_C);
            test.equal(tileCache.numTilesLoaded(), 5, "We still loaded only 5 tiles.");
            test.equal(tileCache.numCachesLoaded(), 5, "The cache has now 5 items (two new added already).");

            test.equal(c00.getTileCount(), 2, "The cache still has only two tiles attached.");
            test.equal(tile00.getCacheSize(), 3, "The tile has three cache objects (original data, main cache & custom.");
            //related tile not affected
            test.equal(tile12.cacheKey, tile12.originalCacheKey, "Original cache change not reflected on shared caches.");
            test.equal(tile12.originalCacheKey, theTileKey, "Original cache key also preserved.");
            test.equal(c12.getTileCount(), 2, "The original data cache still has only two tiles attached.");

            //add and delete cache nothing changes (+1 destroy T_C)
            tile00.addCache("my_custom_cache2", 128, T_C);
            tile00.removeCache("my_custom_cache2");
            test.equal(tileCache.numTilesLoaded(), 5, "We still loaded only 5 tiles.");
            test.equal(tileCache.numCachesLoaded(), 5, "The cache has now 5 items.");
            test.equal(tile00.getCacheSize(), 3, "The tile has three cache objects.");

            //delete cache as a zombie  (+0 destroy)
            tile00.addCache("my_custom_cache2", 17, T_D);
            //direct access shoes correct value although we set key!
            const myCustomCache2Data = tile00.getCache("my_custom_cache2").data;
            test.equal(myCustomCache2Data, 17, "Previously defined cache does not intervene.");
            test.equal(tileCache.numCachesLoaded(), 6, "The cache size is 6.");
            //keep zombie
            tile00.removeCache("my_custom_cache2", false);
            test.equal(tileCache.numCachesLoaded(), 6, "The cache is 5 + 1 zombie, no change.");
            test.equal(tile00.getCacheSize(), 3, "The tile has three cache objects.");
            test.equal(tileCache._zombiesLoadedCount, 1, "One zombie.");

            //revive zombie
            tile01.addCache("my_custom_cache2", 18, T_D);
            const myCustomCache2OtherData = tile01.getCache("my_custom_cache2").data;
            test.equal(myCustomCache2OtherData, myCustomCache2Data, "Caches are equal because revived.");
            test.equal(tileCache._cachesLoadedCount, 6, "Zombie revived, original state restored.");
            test.equal(tileCache._zombiesLoadedCount, 0, "No zombies.");

            //again, keep zombie
            tile01.removeCache("my_custom_cache2", false);

            //first create additional cache so zombie is not the youngest
            tile01.addCache("some weird cache", 11, T_A);
            test.ok(tile01.cacheKey === tile01.originalCacheKey, "Custom cache does not touch tile cache keys.");

            //insertion aadditional cache clears the zombie first although it is not the youngest one
            test.equal(tileCache.numCachesLoaded(), 7, "The cache has now 7 items.");
            test.equal(tileCache._cachesLoadedCount, 6, "New cache created -> 5+1.");
            test.equal(tileCache._zombiesLoadedCount, 1, "One zombie remains.");

            //Test CAP
            tileCache._maxCacheItemCount = 7;

            // Zombie destroyed before other caches (+1 destroy T_D)
            tile12.addCache("someKey", 43, T_B);
            test.equal(tileCache.numCachesLoaded(), 7, "The cache has now 7 items.");
            test.equal(tileCache._zombiesLoadedCount, 0, "One zombie sacrificed, preferred over living cache.");
            test.notOk([tile00, tile01, tile10, tile11, tile12].find(x => !x.loaded), "All tiles sill loaded since zombie was sacrificed.");

            // test destructors called as expected
            test.equal(destroyA, 0, "No destructors for A called.");
            test.equal(destroyB, 0, "No destructors for B called.");
            test.equal(destroyC, 1, "One destruction for C called.");
            test.equal(destroyD, 1, "One destruction for D called.");
            test.equal(destroyE, 0, "No destructors for E called.");


            //try to revive zombie will fail: the zombie was deleted, we will find new vaue there
            tile01.addCache("my_custom_cache2", -849613, T_C);
            const myCustomCache2RecreatedData = tile01.getCache("my_custom_cache2").data;
            test.notEqual(myCustomCache2RecreatedData, myCustomCache2Data, "Caches are not equal because zombie was killed.");
            test.equal(myCustomCache2RecreatedData, -849613, "Cache data is actually as set to 18.");
            test.equal(tileCache.numCachesLoaded(), 7, "The cache has still 7 items.");

            // some tile has been selected as a sacrifice since we triggered cap control
            test.ok([tile00, tile01, tile10, tile11, tile12].find(x => !x.loaded), "One tile has been sacrificed.");
            done();
        })();
    });

    QUnit.test('Zombie Cache', function(test) {
        const done = test.async();

        viewer = OpenSeadragon({
            id: 'example',
            prefixUrl: '/build/openseadragon/images/',
            maxImageCacheCount: 200, //should be enough to fit test inside the cache
            springStiffness: 100, // Faster animation = faster tests
            drawer: 'test-cache-drawer-sync',
        });

        //test jobs by coverage: fail if cached coverage not fully re-stored without jobs
        let jobCounter = 0, coverage = undefined;
        OpenSeadragon.ImageLoader.prototype.addJob = function (options) {
            jobCounter++;
            if (coverage) {
                //old coverage of previous tiled image: if loaded, fail --> should be in cache
                const coverageItem = coverage[options.tile.level][options.tile.x][options.tile.y];
                test.ok(!coverageItem, "Attempt to add job for tile that should be already in memory.");
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
                    coverage = undefined;

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

        viewer = OpenSeadragon({
            id: 'example',
            prefixUrl: '/build/openseadragon/images/',
            maxImageCacheCount: 200, //should be enough to fit test inside the cache
            springStiffness: 100, // Faster animation = faster tests
            drawer: 'test-cache-drawer-sync',
        });

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
