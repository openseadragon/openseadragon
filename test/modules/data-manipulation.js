/* global QUnit, testLog */

(function() {

    let viewer;
    QUnit.module(`Data Manipulation Across Drawers`, {
        beforeEach: function () {
            $('<div id="example"></div>').appendTo("#qunit-fixture");
            testLog.reset();
        },
        afterEach: function () {
            if (viewer && viewer.close) {
                viewer.close();
            }

            viewer = null;
        }
    });

    const PROMISE_REF_KEY = Symbol("_private_test_ref");

    OpenSeadragon.getBuiltInDrawersForTest().forEach(testDrawer);
    // If you want to debug a specific drawer, use instead:
    // ['webgl'].forEach(testDrawer);

    function getPluginCode(overlayColor = "rgba(0,0,255,0.5)") {
        return async function(e) {
            const ctx = await e.getData('context2d');
            if (ctx) {
                const canvas = ctx.canvas;
                ctx.fillStyle = overlayColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                await e.setData(ctx, 'context2d');
            }
        };
    }

    function getResetTileDataCode() {
        return async function(e) {
            e.resetData();
        };
    }

    function getTileDescription(t) {
        return `${t.level}/${t.x}-${t.y}`;
    }


    function testDrawer(type) {

        function whiteViewport() {
            viewer = OpenSeadragon({
                id: 'example',
                prefixUrl: '/build/openseadragon/images/',
                maxImageCacheCount: 200,
                springStiffness: 100,
                drawer: type
            });

            viewer.open({
                width: 24,
                height: 24,
                tileSize: 24,
                minLevel: 1,

                // This is a crucial test feature: all tiles share the same URL, so there are plenty collisions
                getTileUrl: (x, y, l) => "",
                getTilePostData: () => "",
                downloadTileStart: (context) => {
                    const canvas = document.createElement("canvas");
                    const ctx = canvas.getContext("2d");
                    canvas.width = context.tile.size.x;
                    canvas.height = context.tile.size.y;
                    ctx.fillStyle = "#ffffff";
                    ctx.fillRect(0, 0, context.tile.size.x, context.tile.size.y);

                    context.finish(ctx, null, "context2d");
                }
            });

            // Get promise reference to wait for tile ready
            viewer.addHandler('tile-loaded', e => {
                e.tile[PROMISE_REF_KEY] = e.promise;
            });
        }
        const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

        // we test middle of the canvas, so that we can test both tiles or the output canvas of canvas drawer :)
        async function readTileData(tileRef = null) {
            // Get some time for viewer to load data
            await sleep(50);
            // make sure at least one tile loaded
            const tile = tileRef || viewer.world.getItemAt(0).getTilesToDraw()[0];
            await tile[PROMISE_REF_KEY];
            // Get some time for viewer to load data
            await sleep(50);

            if (type === "canvas") {
                //test with the underlying canvas instead
                const canvas = viewer.drawer.canvas;
                return viewer.drawer.canvas.getContext("2d").getImageData(canvas.width/2, canvas.height/2, 1, 1);
            }

            //else incompatible drawer for data getting
            const cache = tile.tile.getCache();
            if (!cache || !cache.loaded) return null;

            const ctx = await cache.getDataAs("context2d");
            if (!ctx) return null;
            return ctx.getImageData(ctx.canvas.width/2, ctx.canvas.height/2, 1, 1)
        }

        QUnit.test(type + ' drawer: basic scenario.', function(assert) {
            whiteViewport();
            const done = assert.async();
            const fnA = getPluginCode("rgba(0,0,255,1)");
            const fnB = getPluginCode("rgba(255,0,0,1)");

            viewer.addHandler('tile-invalidated', fnA);
            viewer.addHandler('tile-invalidated', fnB);

            viewer.addHandler('open', async () => {
                await viewer.waitForFinishedJobsForTest();
                let data = await readTileData();
                assert.equal(data.data[0], 255);
                assert.equal(data.data[1], 0);
                assert.equal(data.data[2], 0);
                assert.equal(data.data[3], 255);

                // Thorough testing of the cache state
                for (let tile of viewer.tileCache._tilesLoaded) {
                    await tile[PROMISE_REF_KEY]; // to be sure all tiles has finished before checking

                    const caches = Object.entries(tile._caches);
                    assert.equal(caches.length, 2, `Tile ${getTileDescription(tile)} has only two caches - main & original`);
                    for (let [key, value] of caches) {
                        assert.ok(value.loaded, `Attached cache '${key}' is ready.`);
                        assert.notOk(value._destroyed, `Attached cache '${key}' is not destroyed.`);
                        assert.ok(value._tiles.includes(tile), `Attached cache '${key}' reference is bidirectional.`);
                    }
                }

                done();
            });
        });

        QUnit.test(type + ' drawer: basic scenario with priorities + events addition.', function(assert) {
            whiteViewport();
            const done = assert.async();
            // FNA gets applied last since it has low priority
            const fnA = getPluginCode("rgba(0,0,255,1)");
            const fnB = getPluginCode("rgba(255,0,0,1)");

            viewer.addHandler('tile-invalidated', fnA);
            viewer.addHandler('tile-invalidated', fnB, null, 1);
            // const promise = viewer.requestInvalidate();

            viewer.addHandler('open', async () => {
                await viewer.waitForFinishedJobsForTest();

                let data = await readTileData();
                assert.equal(data.data[0], 0);
                assert.equal(data.data[1], 0);
                assert.equal(data.data[2], 255);
                assert.equal(data.data[3], 255);

                // Test swap
                viewer.addHandler('tile-invalidated', fnB);
                await viewer.requestInvalidate();

                data = await readTileData();
                // suddenly B is applied since it was added with same priority but later
                assert.equal(data.data[0], 255);
                assert.equal(data.data[1], 0);
                assert.equal(data.data[2], 0);
                assert.equal(data.data[3], 255);

                // Now B gets applied last! Red
                viewer.addHandler('tile-invalidated', fnB, null, -1);
                await viewer.requestInvalidate();
                // no change
                data = await readTileData();
                assert.equal(data.data[0], 255);
                assert.equal(data.data[1], 0);
                assert.equal(data.data[2], 0);
                assert.equal(data.data[3], 255);

                // Thorough testing of the cache state
                for (let tile of viewer.tileCache._tilesLoaded) {
                    await tile[PROMISE_REF_KEY]; // to be sure all tiles has finished before checking

                    const caches = Object.entries(tile._caches);
                    assert.equal(caches.length, 2, `Tile ${getTileDescription(tile)} has only two caches - main & original`);
                    for (let [key, value] of caches) {
                        assert.ok(value.loaded, `Attached cache '${key}' is ready.`);
                        assert.notOk(value._destroyed, `Attached cache '${key}' is not destroyed.`);
                        assert.ok(value._tiles.includes(tile), `Attached cache '${key}' reference is bidirectional.`);
                    }
                }

                done();
            });
        });

        QUnit.test(type + ' drawer: one calls tile restore.', function(assert) {
            whiteViewport();

            const done = assert.async();
            const fnA = getPluginCode("rgba(0,255,0,1)");
            const fnB = getResetTileDataCode();

            viewer.addHandler('tile-invalidated', fnA);
            viewer.addHandler('tile-invalidated', fnB, null, 1);
            // const promise = viewer.requestInvalidate();

            viewer.addHandler('open', async () => {
                await viewer.waitForFinishedJobsForTest();

                let data = await readTileData();
                assert.equal(data.data[0], 0);
                assert.equal(data.data[1], 255);
                assert.equal(data.data[2], 0);
                assert.equal(data.data[3], 255);

                // Test swap - suddenly B applied since it was added later
                viewer.addHandler('tile-invalidated', fnB);
                await viewer.requestInvalidate();
                data = await readTileData();
                assert.equal(data.data[0], 255);
                assert.equal(data.data[1], 255);
                assert.equal(data.data[2], 255);
                assert.equal(data.data[3], 255);

                viewer.addHandler('tile-invalidated', fnB, null, -1);
                await viewer.requestInvalidate();
                data = await readTileData();
                //Erased!
                assert.equal(data.data[0], 255);
                assert.equal(data.data[1], 255);
                assert.equal(data.data[2], 255);
                assert.equal(data.data[3], 255);

                // Thorough testing of the cache state
                for (let tile of viewer.tileCache._tilesLoaded) {
                    await tile[PROMISE_REF_KEY]; // to be sure all tiles has finished before checking

                    const caches = Object.entries(tile._caches);
                    assert.equal(caches.length, 1, `Tile ${getTileDescription(tile)} has only single, original cache`);
                    for (let [key, value] of caches) {
                        assert.ok(value.loaded, `Attached cache '${key}' is ready.`);
                        assert.notOk(value._destroyed, `Attached cache '${key}' is not destroyed.`);
                        assert.ok(value._tiles.includes(tile), `Attached cache '${key}' reference is bidirectional.`);
                    }
                }

                done();
            });
        });
    }
}());
