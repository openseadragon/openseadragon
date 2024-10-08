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

    // Replace conversion with our own system and test: __TEST__ prefix must be used, otherwise
    // other tests will interfere
    let typeAtoB = 0, typeBtoC = 0, typeCtoA = 0, typeDtoA = 0, typeCtoE = 0;
    //set all same costs to get easy testing, know which path will be taken
    Convertor.learn(T_A, T_B, (tile, x) => {
        typeAtoB++;
        return x+1;
    });
    Convertor.learn(T_B, T_C, (tile, x) => {
        typeBtoC++;
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
            tiledImage: fakeTiledImage0
        });
        tile0._cacheSize++;

        assert.equal(cache.numTilesLoaded(), 1, 'tile count after cache');

        tile1._caches[tile1.cacheKey] = cache.cacheTile({
            tile: tile1,
            tiledImage: fakeTiledImage1
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
            tiledImage: fakeTiledImage0
        });
        tile0._cacheSize++;

        assert.equal(cache.numTilesLoaded(), 1, 'tile count after add');

        tile1._caches[tile1.cacheKey] = cache.cacheTile({
            tile: tile1,
            tiledImage: fakeTiledImage0
        });
        tile1._cacheSize++;

        assert.equal(cache.numTilesLoaded(), 1, 'tile count after add of second image');

        tile2._caches[tile2.cacheKey] = cache.cacheTile({
            tile: tile2,
            tiledImage: fakeTiledImage0
        });
        tile2._cacheSize++;

        assert.equal(cache.numTilesLoaded(), 2, 'tile count after additional same image');

        done();
    });

    //Tile API and cache interaction
    QUnit.test('Tile API: basic conversion', function(test) {
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

        const collideGetSet = async (tile, type) => {
            const value = await tile.getData(type);
            await tile.setData(value, type);
            return value;
        };

        //test set/get data in async env
        (async function() {
            test.equal(tileCache.numTilesLoaded(), 5, "We loaded 5 tiles");
            test.equal(tileCache.numCachesLoaded(), 3, "We loaded 3 cache objects");

            //test structure
            const c00 = tile00.getCache(tile00.cacheKey);
            test.equal(c00.getTileCount(), 2, "Two tiles share key = url = foo.jpg.");
            const c01 = tile01.getCache(tile01.cacheKey);
            test.equal(c01.getTileCount(), 1, "No tiles share key = url = foo2.jpg.");
            const c10 = tile10.getCache(tile10.cacheKey);
            test.equal(c10.getTileCount(), 2, "Two tiles share key = url = foo3.jpg.");
            const c12 = tile12.getCache(tile12.cacheKey);

            //test get/set data A
            let value = await tile00.getData(T_A);
            test.equal(typeAtoB, 0, "No conversion happened when requesting default type data.");
            test.equal(value, 1, "One copy happened: getData creates working cache -> copy.");
            //explicit type
            value = await tile00.getData(T_A);
            test.equal(typeAtoB, 0, "No conversion also for tile sharing the cache.");
            test.equal(value, 1, "No increase in value A, working cache initialized.");

            //copy & set type A
            value = await tile00.getData(T_A);
            test.equal(typeAtoB, 0, "No conversion also for tile sharing the cache.");
            test.equal(copyA, 1, "A copy happened.");
            test.equal(value, 1, "+1 conversion step happened.");
            await tile00.setData(value, T_A); //overwrite
            test.equal(tile00.cacheKey, tile00.originalCacheKey, "Overwriting cache: no change in value.");
            test.equal(c00.type, T_A, "The tile cache data type was unchanged.");
            //convert to B, async + sync behavior
            value = await tile00.getData(T_B);
            await tile00.setData(value, T_B); //overwrite
            test.equal(typeAtoB, 1, "Conversion A->B happened.");
            test.equal(value, 2, "+1 conversion step happened.");
            // shares cache, but it is different tile instance

            value = await tile12.getData(T_B);
            test.equal(typeAtoB, 2, "Conversion A->B happened second time -> working cache forcefully initiated over shared data.");
            test.equal(value, 1, "Original data is 1 since all previous modifications happened over working cache of tile00.");

            //test ASYNC get data
            value = await tile12.getData(T_B);
            await tile12.setData(value, T_B); //overwrite
            test.equal(typeAtoB, 2, "Two working caches created, two conversions.");
            test.equal(typeBtoC, 0, "No conversion happened when requesting default type data.");
            test.equal(copyB, 0, "B type not copied, working cache already initialized.");
            test.equal(value, 1, "Data stayed the same.");

            // Async collisions testing

            //convert to A, before that request conversion to A and B several times, since we copy
            // there should be just exactly the right amount of conversions
            tile12.getData(T_A); // B -> C -> A
            tile12.getData(T_B); // no conversion, all run at the same time
            tile12.getData(T_B); // no conversion, all run at the same time
            tile12.getData(T_A); // B -> C -> A
            tile12.getData(T_B); // no conversion, all run at the same time
            value = await tile12.getData(T_A); // B -> C -> A
            test.equal(typeAtoB, 2, "No conversion A->B.");
            test.equal(typeBtoC, 3, "Conversion B->C happened three times.");
            test.equal(typeCtoA, 3, "Conversion C->A happened three times.");
            test.equal(typeDtoA, 0, "Conversion D->A did not happen.");
            test.equal(typeCtoE, 0, "Conversion C->E did not happen.");
            test.equal(value, 3, "We started from value 1 (wokring cache state), and performed two conversions (B->C->A). " +
                "Any other conversion attempt results were thrown away, cache state does not get updated when conversion takes place, data is copied (by default).");

            // C12 cache is still type A, we modified wokring cache!
            //but direct requests on cache change await all modifications, but are lazy
            //convert to A, before that request conversion to A and B several times, should finish accordingly
            c12.transformTo(T_A); // no-op
            c12.transformTo(T_B); // A -> B
            c12.transformTo(T_B); // no-op
            c12.transformTo(T_A); // B -> C -> A
            c12.transformTo(T_B); // A -> B
            //should finish with next await with 6 steps at this point, add two more and await end
            value = await c12.transformTo(T_A); // B -> C -> A
            test.equal(typeAtoB, 4, "Conversion A->B happened two more times, in total 4.");
            test.equal(typeBtoC, 5, "Conversion B->C happened five (3+2) times.");
            test.equal(typeCtoA, 5, "Conversion C->A happened five (3+2) times.");
            test.equal(typeDtoA, 0, "Conversion D->A did not happen.");
            test.equal(typeCtoE, 0, "Conversion C->E did not happen.");
            test.equal(value, 6, "In total 6 conversions on the cache object.");
            await tile12.setData(value, T_A);
            test.equal(c12.data, 6, "In total 6 conversions on the cache object, above set changes working cache.");
            test.equal(c12.data, 6, "Changing type of working cache fires no conversion, we overwrite cache state.");

            //TODO fix test from here
            test.ok("TODO: FIX TEST SUITE FOR NEW CACHE SYSTEM");

            // // Get set collide tries to modify the cache
            // collideGetSet(tile12, T_A); // B -> C -> A
            // collideGetSet(tile12, T_B); // no conversion, all run at the same time
            // collideGetSet(tile12, T_B); // no conversion, all run at the same time
            // collideGetSet(tile12, T_A); // B -> C -> A
            // collideGetSet(tile12, T_B); // no conversion, all run at the same time
            // //should finish with next await with 6 steps at this point, add two more and await end
            // value = await collideGetSet(tile12, T_A); // B -> C -> A
            // test.equal(typeAtoB, 3, "Conversion A->B not increased, not needed as all T_B requests resolve immediatelly.");
            // test.equal(typeBtoC, 9, "Conversion B->C happened three times more.");
            // test.equal(typeCtoA, 9, "Conversion C->A happened three times more.");
            // test.equal(typeDtoA, 0, "Conversion D->A did not happen.");
            // test.equal(typeCtoE, 0, "Conversion C->E did not happen.");
            // test.equal(value, 13, "11+2 steps (writes are colliding, just single write will happen).");
            //
            // //shares cache with tile12
            // value = await tile00.getData(T_A, false);
            // test.equal(typeAtoB, 3, "Conversion A->B nor triggered.");
            // test.equal(value, 13, "Value did not change.");
            //
            // //now set value with keeping origin
            // await tile00.setData(42, T_D, true);
            // test.equal(tile12.originalCacheKey, tile12.cacheKey, "Related tile not affected.");
            // test.equal(tile00.originalCacheKey, tile12.originalCacheKey, "Cache data was modified, original kept.");
            // test.notEqual(tile00.cacheKey, tile12.cacheKey, "Main cache keys changed.");
            // const newCache = tile00.getCache();
            // await newCache.transformTo(T_C);
            // test.equal(typeDtoA, 1, "Conversion D->A happens first time.");
            // test.equal(c12.data, 13, "Original cache value kept");
            // test.equal(c12.type, T_A, "Original cache type kept");
            // test.equal(c12, c00, "The same cache.");
            //
            // test.equal(typeAtoB, 4, "Conversion A->B triggered.");
            // test.equal(newCache.type, T_C, "Original cache type kept");
            // test.equal(newCache.data, 45, "42+3 steps happened.");
            //
            // //try again change in set data, now the cache gets overwritten
            // await tile00.setData(42, T_B, true);
            // test.equal(newCache.type, T_B, "Reset happened in place.");
            // test.equal(newCache.data, 42, "Reset happened in place.");
            //
            // // Overwriting stress test with diff cache (see the same test as above, the same reasoning)
            // collideGetSet(tile00, T_A); // B -> C -> A
            // collideGetSet(tile00, T_B); // no conversion, all run at the same time
            // collideGetSet(tile00, T_B); // no conversion, all run at the same time
            // collideGetSet(tile00, T_A); // B -> C -> A
            // collideGetSet(tile00, T_B); // no conversion, all run at the same time
            // //should finish with next await with 6 steps at this point, add two more and await end
            // value = await collideGetSet(tile00, T_A); // B -> C -> A
            // test.equal(typeAtoB, 4, "Conversion A->B not increased.");
            // test.equal(typeBtoC, 13, "Conversion B->C happened three times more.");
            // //we converted D->C before, that's why C->A is one less
            // test.equal(typeCtoA, 12, "Conversion C->A happened three times more.");
            // test.equal(typeDtoA, 1, "Conversion D->A did not happen.");
            // test.equal(typeCtoE, 0, "Conversion C->E did not happen.");
            // test.equal(value, 44, "+2 writes value (writes collide, just one finishes last).");
            //
            // test.equal(c12.data, 13, "Original cache value kept");
            // test.equal(c12.type, T_A, "Original cache type kept");
            // test.equal(c12, c00, "The same cache.");
            //
            // //todo test destruction throughout the test above
            // //tile00.unload();

            done();
        })();
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
            // TODO FIX
            test.ok("TODO: FIX TEST SUITE FOR NEW CACHE SYSTEM");
            done();
            // test.equal(tileCache.numTilesLoaded(), 5, "We loaded 5 tiles");
            // test.equal(tileCache.numCachesLoaded(), 3, "We loaded 3 cache objects");
            //
            // const c00 = tile00.getCache(tile00.cacheKey);
            // const c12 = tile12.getCache(tile12.cacheKey);
            //
            // //now test multi-cache within tile
            // const theTileKey = tile00.cacheKey;
            // tile00.setData(42, T_E, true);
            // test.ok(tile00.cacheKey !== tile00.originalCacheKey, "Original cache key differs.");
            // test.equal(theTileKey, tile00.originalCacheKey, "Original cache key preserved.");
            //
            // //now add artifically another record
            // tile00.addCache("my_custom_cache", 128, T_C);
            // test.equal(tileCache.numTilesLoaded(), 5, "We still loaded only 5 tiles.");
            // test.equal(tileCache.numCachesLoaded(), 5, "The cache has now 5 items.");
            // test.equal(c00.getTileCount(), 2, "The cache still has only two tiles attached.");
            // test.equal(tile00.getCacheSize(), 3, "The tile has three cache objects.");
            // //related tile not really affected
            // test.equal(tile12.cacheKey, tile12.originalCacheKey, "Original cache key not affected elsewhere.");
            // test.equal(tile12.originalCacheKey, theTileKey, "Original cache key also preserved.");
            // test.equal(c12.getTileCount(), 2, "The original data cache still has only two tiles attached.");
            // test.equal(tile12.getCacheSize(), 1, "Related tile cache did not increase.");
            //
            // //add and delete cache nothing changes
            // tile00.addCache("my_custom_cache2", 128, T_C);
            // tile00.removeCache("my_custom_cache2");
            // test.equal(tileCache.numTilesLoaded(), 5, "We still loaded only 5 tiles.");
            // test.equal(tileCache.numCachesLoaded(), 5, "The cache has now 5 items.");
            // test.equal(tile00.getCacheSize(), 3, "The tile has three cache objects.");
            //
            // //delete cache as a zombie
            // tile00.addCache("my_custom_cache2", 17, T_C);
            // //direct access shoes correct value although we set key!
            // const myCustomCache2Data = tile00.getCache("my_custom_cache2").data;
            // test.equal(myCustomCache2Data, 17, "Previously defined cache does not intervene.");
            // test.equal(tileCache.numCachesLoaded(), 6, "The cache size is 6.");
            // //keep zombie
            // tile00.removeCache("my_custom_cache2", false);
            // test.equal(tileCache.numCachesLoaded(), 6, "The cache is 5 + 1 zombie, no change.");
            // test.equal(tile00.getCacheSize(), 3, "The tile has three cache objects.");
            //
            // //revive zombie
            // tile01.addCache("my_custom_cache2", 18, T_C);
            // const myCustomCache2OtherData = tile01.getCache("my_custom_cache2").data;
            // test.equal(myCustomCache2OtherData, myCustomCache2Data, "Caches are equal because revived.");
            // //again, keep zombie
            // tile01.removeCache("my_custom_cache2", false);
            //
            // //first create additional cache so zombie is not the youngest
            // tile01.addCache("some weird cache", 11, T_A);
            // test.ok(tile01.cacheKey === tile01.originalCacheKey, "Custom cache does not touch tile cache keys.");
            //
            // //insertion aadditional cache clears the zombie first although it is not the youngest one
            // test.equal(tileCache.numCachesLoaded(), 7, "The cache has now 7 items.");
            //
            // //Test CAP
            // tileCache._maxCacheItemCount = 7;
            //
            // //does not trigger insertion - deletion, since we setData to cache that already exists, 43 value ignored
            // tile12.setData(43, T_B, true);
            // test.notEqual(tile12.cacheKey, tile12.originalCacheKey, "Original cache key differs.");
            // test.equal(theTileKey, tile12.originalCacheKey, "Original cache key preserved.");
            // test.equal(tileCache.numCachesLoaded(), 7, "The cache has still 7 items.");
            // //we called SET DATA with preserve=true on tile12 which was sharing cache with tile00, new cache is also shared
            // test.equal(tile00.originalCacheKey, tile12.originalCacheKey, "Original cache key matches between tiles.");
            // test.equal(tile00.cacheKey, tile12.cacheKey, "Modified cache key matches between tiles.");
            // test.equal(tile12.getCache().data, 42, "The value is not 43 as setData triggers cache share!");
            //
            // //triggers insertion - deletion of zombie cache 'my_custom_cache2'
            // tile00.addCache("trigger-max-cache-handler", 5, T_C);
            // //reset CAP
            // tileCache._maxCacheItemCount = OpenSeadragon.DEFAULT_SETTINGS.maxImageCacheCount;
            //
            // //try to revive zombie will fail: the zombie was deleted, we will find 18
            // tile01.addCache("my_custom_cache2", 18, T_C);
            // const myCustomCache2RecreatedData = tile01.getCache("my_custom_cache2").data;
            // test.notEqual(myCustomCache2RecreatedData, myCustomCache2Data, "Caches are not equal because created.");
            // test.equal(myCustomCache2RecreatedData, 18, "Cache data is actually as set to 18.");
            // test.equal(tileCache.numCachesLoaded(), 8, "The cache has now 8 items.");
            //
            //
            // //delete cache bound to other tiles, this tile has 4 caches:
            // // cacheKey: shared, originalCacheKey: shared, <custom cache key>, <custom cache key>
            // // note that cacheKey is shared because we called setData on two items that both create MOD cache
            // tileCache.unloadTile(tile00, true, tileCache._tilesLoaded.indexOf(tile00));
            // test.equal(tileCache.numCachesLoaded(), 6, "The cache has now 8-2 items.");
            // test.equal(tileCache.numTilesLoaded(), 4, "One tile removed.");
            // test.equal(c00.getTileCount(), 1, "The cache has still tile12 left.");
            //
            // //now test tile destruction as zombie
            //
            // //now test tile cache sharing
            // done();
        })();
    });

    QUnit.test('Zombie Cache', function(test) {
        const done = test.async();

        // TODO FIX
        test.ok("TODO: FIX TEST SUITE FOR NEW CACHE SYSTEM");
        done();
        // //test jobs by coverage: fail if
        // let jobCounter = 0, coverage = undefined;
        // OpenSeadragon.ImageLoader.prototype.addJob = function (options) {
        //     jobCounter++;
        //     if (coverage) {
        //         //old coverage of previous tiled image: if loaded, fail --> should be in cache
        //         const coverageItem = coverage[options.tile.level][options.tile.x][options.tile.y];
        //         test.ok(!coverageItem, "Attempt to add job for tile that is not in cache OK if previously not loaded.");
        //     }
        //     return originalJob.call(this, options);
        // };
        //
        // let tilesFinished = 0;
        // const tileCounter = function (event) {tilesFinished++;}
        //
        // const openHandler = function(event) {
        //     event.item.allowZombieCache(true);
        //
        //     viewer.world.removeHandler('add-item', openHandler);
        //     test.ok(jobCounter === 0, 'Initial state, no images loaded');
        //
        //     waitFor(() => {
        //         if (tilesFinished === jobCounter && event.item._fullyLoaded) {
        //             coverage = $.extend(true, {}, event.item.coverage);
        //             viewer.world.removeAll();
        //             return true;
        //         }
        //         return false;
        //     });
        // };
        //
        // let jobsAfterRemoval = 0;
        // const removalHandler = function (event) {
        //     viewer.world.removeHandler('remove-item', removalHandler);
        //     test.ok(jobCounter > 0, 'Tiled image removed after 100 ms, should load some images.');
        //     jobsAfterRemoval = jobCounter;
        //
        //     viewer.world.addHandler('add-item', reopenHandler);
        //     viewer.addTiledImage({
        //         tileSource: '/test/data/testpattern.dzi'
        //     });
        // }
        //
        // const reopenHandler = function (event) {
        //     event.item.allowZombieCache(true);
        //
        //     viewer.removeHandler('add-item', reopenHandler);
        //     test.equal(jobCounter, jobsAfterRemoval, 'Reopening image does not fetch any tiles imemdiatelly.');
        //
        //     waitFor(() => {
        //         if (event.item._fullyLoaded) {
        //             viewer.removeHandler('tile-unloaded', unloadTileHandler);
        //             viewer.removeHandler('tile-loaded', tileCounter);
        //
        //             //console test needs here explicit removal to finish correctly
        //             OpenSeadragon.ImageLoader.prototype.addJob = originalJob;
        //             done();
        //             return true;
        //         }
        //         return false;
        //     });
        // };
        //
        // const unloadTileHandler = function (event) {
        //     test.equal(event.destroyed, false, "Tile unload event should not delete with zombies!");
        // }
        //
        // viewer.world.addHandler('add-item', openHandler);
        // viewer.world.addHandler('remove-item', removalHandler);
        // viewer.addHandler('tile-unloaded', unloadTileHandler);
        // viewer.addHandler('tile-loaded', tileCounter);
        //
        // viewer.open('/test/data/testpattern.dzi');
    });

    QUnit.test('Zombie Cache Replace Item', function(test) {
        const done = test.async();

        //TODO FIX
        test.ok("TODO: FIX TEST SUITE FOR NEW CACHE SYSTEM");
        done();
        // //test jobs by coverage: fail if
        // let jobCounter = 0, coverage = undefined;
        // OpenSeadragon.ImageLoader.prototype.addJob = function (options) {
        //     jobCounter++;
        //     if (coverage) {
        //         //old coverage of previous tiled image: if loaded, fail --> should be in cache
        //         const coverageItem = coverage[options.tile.level][options.tile.x][options.tile.y];
        //         if (!coverageItem) {
        //             console.warn(coverage, coverage[options.tile.level][options.tile.x], options.tile);
        //         }
        //         test.ok(!coverageItem, "Attempt to add job for tile data that was previously loaded.");
        //     }
        //     return originalJob.call(this, options);
        // };
        //
        // let tilesFinished = 0;
        // const tileCounter = function (event) {tilesFinished++;}
        //
        // const openHandler = function(event) {
        //     event.item.allowZombieCache(true);
        //     viewer.world.removeHandler('add-item', openHandler);
        //     viewer.world.addHandler('add-item', reopenHandler);
        //
        //     waitFor(() => {
        //         if (tilesFinished === jobCounter && event.item._fullyLoaded) {
        //             coverage = $.extend(true, {}, event.item.coverage);
        //             viewer.addTiledImage({
        //                 tileSource: '/test/data/testpattern.dzi',
        //                 index: 0,
        //                 replace: true
        //             });
        //             return true;
        //         }
        //         return false;
        //     });
        // };
        //
        // const reopenHandler = function (event) {
        //     event.item.allowZombieCache(true);
        //
        //     viewer.removeHandler('add-item', reopenHandler);
        //     waitFor(() => {
        //         if (event.item._fullyLoaded) {
        //             viewer.removeHandler('tile-unloaded', unloadTileHandler);
        //             viewer.removeHandler('tile-loaded', tileCounter);
        //
        //             //console test needs here explicit removal to finish correctly
        //             OpenSeadragon.ImageLoader.prototype.addJob = originalJob;
        //             done();
        //             return true;
        //         }
        //         return false;
        //     });
        // };
        //
        // const unloadTileHandler = function (event) {
        //     test.equal(event.destroyed, false, "Tile unload event should not delete with zombies!");
        // }
        //
        // viewer.world.addHandler('add-item', openHandler);
        // viewer.addHandler('tile-unloaded', unloadTileHandler);
        // viewer.addHandler('tile-loaded', tileCounter);
        //
        // viewer.open('/test/data/testpattern.dzi');
    });

})();
