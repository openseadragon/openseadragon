/* global QUnit, testLog */

/*
 * TileCache failure-regression tests
 *
 * Purpose: Ensure the system continues rendering even when:
 *  1) a tile-invalidated plugin throws
 *  2) a conversion step throws during invalidation working-cache conversion
 *
 * Drop this file alongside existing QUnit tests and include it in the test runner.
 */

(function () {
    const Converter = OpenSeadragon.converter,
        T_A = "__TEST__typeA_fail", T_B = "__TEST__typeB_fail", T_C = "__TEST__typeC_fail";

    let viewer;

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    function awaitWithTimeout(promise, ms, label) {
        return Promise.race([
            promise,
            sleep(ms).then(() => { throw new Error(`Timeout waiting for: ${label || 'operation'} (${ms}ms)`); })
        ]);
    }

    async function pumpDraw(viewer, ms) {
        const deadline = Date.now() + ms;
        while (Date.now() < deadline) {
            if (viewer && viewer.world) {
                viewer.world.needsDraw();
                viewer.world.draw();
            }
            await sleep(30);
        }
    }

    // Capture unhandled errors during a test so QUnit doesn't abort the whole run.
    // The assertions below require these counters to be 0 for the test to pass.
    function withGlobalErrorCapture(fn) {
        const state = { unhandledRejections: 0, errors: 0, lastReason: null, lastError: null };

        function onUnhandledRejection(ev) {
            state.unhandledRejections += 1;
            state.lastReason = ev.reason;
            // Prevent the browser default handler (and QUnit) from treating it as fatal.
            if (ev && typeof ev.preventDefault === "function") {
                ev.preventDefault();
            }
            return true;
        }

        function onError(ev) {
            state.errors += 1;
            state.lastError = ev && (ev.error || ev.message || ev);
            // Prevent propagation
            if (ev && typeof ev.preventDefault === "function") {
                ev.preventDefault();
            }
            return true;
        }

        window.addEventListener('unhandledrejection', onUnhandledRejection);
        window.addEventListener('error', onError);

        const finalize = () => {
            window.removeEventListener('unhandledrejection', onUnhandledRejection);
            window.removeEventListener('error', onError);
            return state;
        };

        return Promise.resolve()
            .then(() => fn(state))
            .then((res) => ({ res, state: finalize() }))
            .catch((err) => {
                const s = finalize();
                // Re-throw while still returning captured state to the caller if needed
                err.__capturedState = s;
                throw err;
            });
    }


    // Dedicated converters for this file (unique type names => no interference)
    // A->B synchronous
    Converter.learn(T_A, T_B, (tile, x) => x + 1);
    // B->C async (simulate slow path)
    Converter.learn(T_B, T_C, async (tile, x) => {
        await sleep(5);
        return x + 1;
    });
    // Copy constructors
    Converter.learn(T_A, T_A, (tile, x) => x);
    Converter.learn(T_B, T_B, (tile, x) => x);
    Converter.learn(T_C, T_C, (tile, x) => x);
    // Destroyers (no-op but present)
    Converter.learnDestroy(T_A, () => {});
    Converter.learnDestroy(T_B, () => {});
    Converter.learnDestroy(T_C, () => {});

    // Minimal drawer that requests T_C and uses private cache with preload
    OpenSeadragon.__FailTestDrawer = class extends OpenSeadragon.DrawerBase {
        constructor(opts) {
            super(opts);
            this.testEvents = new OpenSeadragon.EventSource();
        }
        static isSupported() { return true; }
        getType() { return "__fail-test-drawer"; }
        getSupportedDataFormats() { return [T_A]; }
        get defaultOptions() {
            return { usePrivateCache: true, preloadCache: true };
        }
        _createDrawingElement() { return document.createElement("div"); }
        draw(tiledImages) {
            for (const image of tiledImages) {
                const tilesDoDraw = image.getTilesToDraw().map(info => info.tile);
                for (const tile of tilesDoDraw) {
                    const data = this.getDataToDraw(tile);
                    this.testEvents.raiseEvent('test-tile', { tile, dataToDraw: data });
                }
            }
        }
        internalCacheCreate(cache, tile) {
            // Internal cache requests T_C from the main cache, forcing conversion.
            return cache.getDataAs(T_C, true);
        }
        internalCacheFree(data) {
            // Destroy internal data copy if converter supports it
            try { OpenSeadragon.converter.destroy(data, T_C); } catch (e) {}
        }
        canRotate() { return true; }
        destroy() { this.destroyInternalCache(); }
        setImageSmoothingEnabled() {}
        drawDebuggingRect() {}
        clear() {}
    };

    // Empty test source that returns constant data (0) as T_A
    OpenSeadragon.__FailTestTileSource = class extends OpenSeadragon.TileSource {
        supports(data) { this.source = data.isFailTestSource; return data && data.isFailTestSource; }
        configure() {
            return {
                width: 512,
                height: 512,
                tileSize: 128,
                tileOverlap: 0,
                minLevel: 0,
                maxLevel: 3,
                tilesUrl: String(this.source), // make unique tiles to have more than single tile in cache
                fileFormat: "",
                displayRects: null
            };
        }
        getTileUrl(level, x, y) { return `${this.tilesUrl}/${level}`; } // overlap caches intentionally
        downloadTileStart(context) { context.finish(0, null, T_A); }
        getClosestLevel() { return Infinity; } // force invalidation for all tiles
    };

    QUnit.module('TileCache failure regressions', {
        beforeEach: function () {
            $('<div id="example-fail"></div>').appendTo("#qunit-fixture");
            if (testLog && testLog.reset) testLog.reset();
        },
        afterEach: function () {
            if (viewer && viewer.close) viewer.close();
            viewer = null;
        }
    });

    function makeViewer() {
        viewer = OpenSeadragon({
            id: 'example-fail',
            prefixUrl: '/build/openseadragon/images/',
            maxImageCacheCount: 200,
            springStiffness: 100,
            drawer: '__fail-test-drawer'
        });
        return viewer;
    }

    async function waitForAnyTileDraw(viewer, drawer, timeoutMs = 3000) {
        let drew = false;
        const handler = () => { drew = true; };
        drawer.testEvents.addHandler('test-tile', handler);

        const deadline = Date.now() + timeoutMs;
        while (!drew && Date.now() < deadline) {
            viewer.forceRedraw();
            viewer.world.draw();
            await sleep(25);
        }

        drawer.testEvents.removeHandler('test-tile', handler);
        return drew;
    }

    QUnit.test('plugin throws during invalidation, viewer still renders', function (assert) {
        const done = assert.async();
        const v = makeViewer();
        const drawer = v.drawer;

        v.addHandler('open', async () => {
            withGlobalErrorCapture(async (cap) => {
                await awaitWithTimeout(v.waitForFinishedJobsForTest(), 8000, 'waitForFinishedJobsForTest');

                // Encourage initial draw/load
                await pumpDraw(v, 250);

                // Baseline draw should happen
                assert.ok(await waitForAnyTileDraw(v, drawer, 5000), "Baseline: tiles draw");

                let threw = false;
                const badPlugin = async (e) => {
                    if (!threw) {
                        threw = true;
                        await e.getData(T_B); // touch working cache
                        throw new Error("Injected plugin failure");
                    }
                };
                v.addHandler('tile-invalidated', badPlugin);

                // The important part: regardless of promise resolution, viewer must remain drawable.
                try { await awaitWithTimeout(v.world.requestInvalidate(true), 8000, 'world.requestInvalidate(true)'); } catch (e) {}

                assert.ok(threw, "Plugin threw at least once");

                // Disable plugin; draw again. Should still draw tiles.
                v.removeHandler('tile-invalidated', badPlugin);
                v.world.needsDraw();
                v.world.draw();

                assert.ok(await waitForAnyTileDraw(v, drawer), "After plugin failure: tiles still draw");
                v.destroy();

            }).then(({state}) => {
                assert.equal(state.unhandledRejections, 0, 'No unhandled promise rejections');
                assert.equal(state.errors, 0, 'No uncaught errors');
            }).then(() => {
                done();
            });

        });

        v.open([{ isFailTestSource: true }, { isFailTestSource: "1" }]);
    });

    QUnit.test('conversion step throws in working cache, viewer still renders', function (assert) {
        const done = assert.async();
        const v = makeViewer();
        const drawer = v.drawer;

        v.addHandler('open', async () => {
            withGlobalErrorCapture(async (cap) => {
                await awaitWithTimeout(v.waitForFinishedJobsForTest(), 8000, 'waitForFinishedJobsForTest');
                await pumpDraw(v, 250);
                assert.ok(await waitForAnyTileDraw(v, drawer, 5000), "Baseline: tiles draw");

                // Patch A->B to throw once.
                let failOnce = true;
                Converter.learn(T_A, T_B, (tile, x) => {
                    if (failOnce) {
                        failOnce = false;
                        throw new Error("Injected converter failure A->B");
                    }
                    return x + 1;;
                });

                const handler = async (e) => {
                    // Forces A->B on working cache; first attempt throws.
                    await e.getData(T_B);
                };
                v.addHandler('tile-invalidated', handler);

                try { await awaitWithTimeout(v.world.requestInvalidate(true), 8000, 'world.requestInvalidate(true)'); } catch (e) {}

                assert.ok(failOnce === false, "Converter failure triggered");

                // Restore a healthy converter and ensure rendering continues.
                Converter.learn(T_A, T_B, (tile, x) => x + 1);
                v.removeHandler('tile-invalidated', handler);

                v.requestInvalidate();
                v.world.needsDraw();
                v.world.draw();

                assert.ok(await waitForAnyTileDraw(v, drawer), "After conversion failure: tiles still draw");

                v.destroy();

            }).then(({state}) => {
                assert.equal(state.unhandledRejections, 0, 'No unhandled promise rejections');
                assert.equal(state.errors, 0, 'No uncaught errors');
            }).then(() => {
                done();
            });

        });

        v.open([{ isFailTestSource: "1" }, { isFailTestSource: "2" }]);
    });

})();
