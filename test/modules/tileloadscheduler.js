/* global QUnit, $, testLog, MockSeadragon */

(function() {
    let viewer;
    const scheduler = OpenSeadragon.tileLoadScheduler;
    const baseOptions = {
        id: 'example',
        prefixUrl: '/build/openseadragon/images/',
        springStiffness: 100 // Faster animation = faster tests
    };

    QUnit.module('TileLoadScheduler', {
        beforeEach: function () {
            $('<div id="example"></div>').appendTo("#qunit-fixture");
            scheduler.reset();
            testLog.reset();
        },
        afterEach: function () {
            if (viewer) {
                viewer.destroy();
            }
            viewer = null;
            // The scheduler is page-wide, so anything left registered would follow the next test around.
            scheduler.reset();
        }
    });

    // ----------

    QUnit.test('origins are derived from the tile url', function(assert) {
        assert.equal(scheduler.originOf('https://tiles.example.com/a/1.jpg'), 'https://tiles.example.com',
            'An absolute url yields its origin.');
        assert.equal(scheduler.originOf('https://tiles.example.com:8443/a/1.jpg'),
            'https://tiles.example.com:8443', 'The port is part of the origin - it is a separate pool.');
        assert.equal(scheduler.originOf('/test/data/testpattern.dzi'), window.location.origin,
            'A relative url resolves against the page.');

        // These are not connection pools, so they all share one budget rather than inventing origins.
        assert.equal(scheduler.originOf('data:image/png;base64,AAAA'), '*', 'A data url has no origin.');
        assert.equal(scheduler.originOf(''), '*', 'An empty url has no origin.');
        assert.equal(scheduler.originOf(null), '*', 'A missing url has no origin.');
        // Anything that is not a url at all still resolves as a relative path against the page, which is
        // the right answer for a tile source built on custom url getters.
        assert.equal(scheduler.originOf('not a url'), window.location.origin,
            'An unrecognized url resolves against the page.');
    });

    // ----------

    QUnit.test('protocol names are normalized', function(assert) {
        assert.equal(scheduler.normalizeProtocol('h2'), 'h2', 'The ALPN id is taken as-is.');
        assert.equal(scheduler.normalizeProtocol('http/2'), 'h2', 'The friendly spelling maps onto it.');
        assert.equal(scheduler.normalizeProtocol('HTTP/2'), 'h2', 'Case does not matter.');
        assert.equal(scheduler.normalizeProtocol('http/1.1'), 'http/1.1', 'HTTP/1.1 is recognized.');
        assert.equal(scheduler.normalizeProtocol('h3'), 'h3', 'HTTP/3 is recognized.');

        // 'auto' means "find out", so it must not resolve to a protocol on its own.
        assert.equal(scheduler.normalizeProtocol('auto'), null, 'auto is not a protocol.');
        assert.equal(scheduler.normalizeProtocol(false), null, 'Disabled is not a protocol.');
        assert.equal(scheduler.normalizeProtocol('spdy/3'), null, 'An unknown protocol is not guessed at.');
    });

    // ----------

    QUnit.test('the concurrency limit follows the protocol', function(assert) {
        const origin = 'https://tiles.example.com';
        const image = {
            _schedulerOrigin: origin,
            serverProtocol: 'auto',
            _imageLoader: {jobLimit: 0}
        };
        scheduler.register(image);

        // An undetected protocol is probed: the ceiling is generous, but the budget starts at the browser's
        // HTTP/1.1 connection cap, since asking for more than that on an HTTP/1.1 origin just queues inside
        // the browser, where the tile order can no longer be revised.
        assert.equal(scheduler.limitFor(origin), 24, 'An undetected protocol gets the probing ceiling.');
        assert.equal(scheduler.budgetFor(origin), 6, 'An undetected protocol starts at the conservative budget.');

        scheduler.noteProtocol(origin, 'h2');
        assert.equal(scheduler.limitFor(origin), 24, 'A detected multiplexing protocol sets the ceiling.');
        assert.equal(scheduler.budgetFor(origin), 24, 'A detected protocol is trusted for the budget.');

        // An explicitly stated protocol is not overridden by what was detected. serverProtocol and
        // imageLoaderLimit are construction-time options; poking them directly bypasses the cache.
        image.serverProtocol = 'http/1.1';
        scheduler._invalidateLimits();
        assert.equal(scheduler.limitFor(origin), 6, 'A stated protocol beats a detected one.');
        assert.equal(scheduler.budgetFor(origin), 6, 'The budget never exceeds the ceiling.');

        image.serverProtocol = 'auto';
        image._imageLoader.jobLimit = 3;
        scheduler._invalidateLimits();
        assert.equal(scheduler.limitFor(origin), 3, 'imageLoaderLimit still caps the scheduler.');
        assert.equal(scheduler.budgetFor(origin), 3, 'imageLoaderLimit caps the budget too.');

        // A different origin is budgeted independently.
        assert.equal(scheduler.limitFor('https://other.example.com'), 6, 'Other origins are unaffected.');
    });

    // ----------

    QUnit.test('several images on one origin get the most conservative limit', function(assert) {
        const origin = 'https://tiles.example.com';
        // A navigator is a Viewer whose own viewer property points at its parent; it shares the origin
        // with the main image and must neither lower the origin's limit nor be excluded from it.
        const main = {_schedulerOrigin: origin, serverProtocol: 'h2', _imageLoader: {jobLimit: 0}};
        const navigator = {
            _schedulerOrigin: origin, serverProtocol: 'h2', _imageLoader: {jobLimit: 0},
            viewer: {viewer: {}}
        };
        scheduler.register(main);
        scheduler.register(navigator);
        assert.equal(scheduler.limitFor(origin), 24, 'Images agreeing on the protocol keep its full limit.');

        navigator.serverProtocol = 'http/1.1';
        scheduler._invalidateLimits(); // construction-time option poked directly, see above
        assert.equal(scheduler.limitFor(origin), 6, 'An image stating a lower protocol lowers the origin.');
    });

    // ----------

    QUnit.test('slots are booked and released per origin', function(assert) {
        const origin = 'https://tiles.example.com';
        assert.equal(scheduler.inFlightFor(origin), 0, 'Nothing is in flight to start with.');

        scheduler.noteStart(origin);
        scheduler.noteStart(origin);
        assert.equal(scheduler.inFlightFor(origin), 2, 'Dispatching books a slot.');

        scheduler.noteFinish(origin);
        assert.equal(scheduler.inFlightFor(origin), 1, 'Completing releases it.');

        // A double release would let the origin hand out more slots than it has, forever after.
        scheduler.noteFinish(origin);
        scheduler.noteFinish(origin);
        assert.equal(scheduler.inFlightFor(origin), 0, 'The count never goes negative.');
    });

    // ----------

    QUnit.test('registration is per image and destroy releases it', function(assert) {
        const done = assert.async();

        viewer = OpenSeadragon(OpenSeadragon.extend(true, {}, baseOptions, {
            serverProtocol: 'http/1.1'
        }));

        viewer.addHandler('open', function() {
            const image = viewer.world.getItemAt(0);
            assert.ok(scheduler.isEnabled(), 'An opted-in image registers itself.');
            assert.equal(image.serverProtocol, 'http/1.1', 'The option reaches the tiled image.');

            // The scheduler outlives every viewer on the page, so an image it keeps a reference to is an
            // image - and a viewer, and a tile cache - that can never be collected.
            image.destroy();
            assert.ok(!scheduler.isEnabled(), 'Destroying the image unregisters it.');

            done();
        });

        viewer.open({tileSource: '/test/data/testpattern.dzi'});
    });

    // ----------

    QUnit.test('the frame loop only fills a wish list; the scheduler dispatches it', function(assert) {
        const done = assert.async();

        viewer = OpenSeadragon(OpenSeadragon.extend(true, {}, baseOptions, {
            serverProtocol: 'http/1.1'
        }));

        viewer.addHandler('open', function() {
            const image = viewer.world.getItemAt(0);

            const dispatched = [];
            const realLoadTile = image._loadTile;
            image._loadTile = function(tile, time) {
                dispatched.push(tile);
                realLoadTile.call(this, tile, time);
            };

            image._wishList.length = 0;
            image._updateLevelsForViewport();

            // Selection and dispatch are separate now: the frame decides what is wanted, the scheduler
            // decides how much of it fits on the wire.
            assert.ok(image._wishList.length > 0, 'Selecting tiles fills the wish list.');
            assert.equal(dispatched.length, 0, 'Selecting tiles does not dispatch them.');

            const wanted = image._wishList.length;
            scheduler.pump();
            assert.ok(dispatched.length > 0, 'Pumping dispatches from the wish list.');
            assert.ok(image._wishList.length < wanted, 'The dispatched tiles leave the wish list.');

            done();
        });

        viewer.open({tileSource: '/test/data/testpattern.dzi'});
    });

    // ----------

    QUnit.test('maxTilesPerFrame does not cap the scheduler', function(assert) {
        const done = assert.async();

        viewer = OpenSeadragon(OpenSeadragon.extend(true, {}, baseOptions, {
            serverProtocol: 'h2',
            maxTilesPerFrame: 1
        }));

        viewer.addHandler('open', function() {
            const image = viewer.world.getItemAt(0);
            // Applying it as a ceiling would reintroduce the frame-rate coupling the scheduler exists to
            // remove; the deprecated option only drives the frame-paced path.
            const dispatched = [];
            image._loadTile = function(tile) {
                dispatched.push(tile);
                tile.loading = true;
            };

            image._updateLevelsForViewport();
            scheduler.pump();
            assert.ok(dispatched.length > image.maxTilesPerFrame,
                'A single frame dispatches more than maxTilesPerFrame tiles.');

            done();
        });

        viewer.open({tileSource: '/test/data/testpattern.dzi'});
    });

    // ----------

    QUnit.test('the budget follows the measured wait', function(assert) {
        const origin = 'https://tiles.example.com';
        const image = {serverProtocol: 'auto', _schedulerOrigin: origin, _imageLoader: {jobLimit: 0}};
        scheduler.register(image);
        assert.equal(scheduler.budgetFor(origin), 6, 'Probing starts at the HTTP/1.1 figure.');

        const record = scheduler._recordFor(origin);
        // One round is `budget` completions, dispatched into a pipeline holding 1 .. budget requests;
        // saturated means every slot was in use during the round. waitFor(concurrency) models the origin.
        const round = function(waitFor, saturated) {
            record.saturated = saturated !== false;
            const count = scheduler.budgetFor(origin);
            for (let c = 1; c <= count; c++) {
                scheduler.noteFinish(origin, waitFor(c), c);
            }
        };
        const flat = () => 100;

        // Growing takes two consecutive flat rounds with enough samples in both bands: four of these.
        for (let i = 0; i < 4; i++) {
            round(flat);
        }
        assert.equal(scheduler.budgetFor(origin), 8, 'Flat waits with every slot in use grow the budget.');

        for (let i = 0; i < 4; i++) {
            round(flat, false);
        }
        assert.equal(scheduler.budgetFor(origin), 8, 'Flat waits without saturation change nothing.');

        for (let i = 0; i < 40; i++) {
            round(flat);
        }
        assert.equal(scheduler.budgetFor(origin), 24, 'Growth stops at the probing ceiling.');

        // An origin that keeps up with 8 requests and queues beyond that: a request dispatched behind more
        // than 8 others waits in proportion. Requests dispatched into the fuller half of the budget then
        // wait longer than those dispatched into the emptier half, which is the queueing signal, and the
        // budget has to come down to where that stops - not sit at the ceiling.
        const knee8 = c => 100 * Math.max(1, c / 8);
        for (let i = 0; i < 30; i++) {
            round(knee8);
        }
        const settled = scheduler.budgetFor(origin);
        assert.ok(settled >= 8 && settled <= 14, 'The budget settles where waits stop inflating, at ' + settled);

        // An origin that queues on any concurrency at all is driven down to the floor, which stays above
        // one so progress never stops.
        for (let i = 0; i < 60; i++) {
            round(c => 100 * c);
        }
        assert.ok(scheduler.budgetFor(origin) <= 3, 'Shrinking floors at two, was ' + scheduler.budgetFor(origin));

        // A network that is simply slower for good is followed, not punished: the same wait however full
        // the pipeline is not queueing, however long it is, and with every slot in use the budget grows back.
        for (let i = 0; i < 120; i++) {
            round(() => 1000);
        }
        assert.equal(scheduler.budgetFor(origin), 24, 'Constant waits let the budget grow back to the ceiling.');

        // Learning the protocol replaces the guess with the table.
        scheduler.noteProtocol(origin, 'h2');
        assert.equal(scheduler.budgetFor(origin), 24, 'A detected protocol restarts the budget at its ceiling.');

        // Aborted and failed requests report no wait and must not move the budget.
        record.saturated = true;
        for (let i = 0; i < 30; i++) {
            scheduler.noteFinish(origin, undefined, 24);
        }
        assert.equal(scheduler.budgetFor(origin), 24, 'Releases without a wait leave the budget alone.');
    });

    // ----------

    QUnit.test('a slow pan is not throttled to one tile on the way per frame', function(assert) {
        const done = assert.async();

        viewer = OpenSeadragon(OpenSeadragon.extend(true, {}, baseOptions, {
            serverProtocol: 'h2'
        }));

        viewer.addHandler('open', function() {
            const image = viewer.world.getItemAt(0);
            const viewport = viewer.viewport;
            for (const spring of [viewport.zoomSpring, viewport.centerSpringX, viewport.centerSpringY]) {
                spring.animationTime = 20;
                spring.springStiffness = 1;
            }

            // Mid-pan state: a long, slow pan with plenty of time before the destination is needed.
            viewport.zoomTo(4, null, true);
            viewport.panTo(new OpenSeadragon.Point(0.1, 0.1), true);
            viewport.update();
            // The jumps above were only setup; the pan below is a single deliberate animation, not one of a
            // burst of retargets.
            viewport._retargetGap = Infinity;
            viewport.panTo(new OpenSeadragon.Point(0.9, 0.4), false);

            const dispatched = [];
            image._loadTile = function(tile) {
                dispatched.push(tile);
                tile.loading = true;
            };

            image._updateLevelsForViewport();
            scheduler.pump();
            const onTheWay = dispatched.filter(t => !t.inLoadArea).length;
            // The plan only lists positions worth loading, so the origin's budget, not a per-frame trickle,
            // is what bounds them.
            assert.ok(onTheWay > 1, onTheWay + ' tiles on the way were dispatched in one frame.');
            assert.ok(dispatched.length <= scheduler.budgetFor(image._schedulerOrigin),
                'Dispatch stays within the origin budget.');

            done();
        });

        viewer.open({tileSource: '/test/data/testpattern.dzi'});
    });

    // ----------

    QUnit.test('waiting on the network does not force a redraw', function(assert) {
        const done = assert.async();

        viewer = OpenSeadragon(OpenSeadragon.extend(true, {}, baseOptions, {
            serverProtocol: 'http/1.1'
        }));

        viewer.addHandler('open', function() {
            const image = viewer.world.getItemAt(0);

            // Nothing is dispatched here, so the wish list stays full - exactly the state the image is in
            // for as long as the origin is saturated. Tile arrival is what triggers a redraw, not waiting.
            image._needsDraw = false;
            image._updateLevelsForViewport();
            assert.ok(image._wishList.length > 0, 'Tiles are waiting to be dispatched.');
            assert.ok(!image.needsDraw(), 'A pending wish list alone does not request a draw.');

            // The frame-paced path dispatches a few tiles per frame and needs the next frame to continue.
            image.serverProtocol = false;
            image._loadTile = function(tile) {
                tile.loading = true;
            };
            image._needsDraw = false;
            image._updateLevelsForViewport();
            assert.ok(image.needsDraw(), 'Frame-paced loading still asks for the next frame.');

            done();
        });

        viewer.open({tileSource: '/test/data/testpattern.dzi'});
    });

    // ----------

    QUnit.test('protocol detection runs only while an origin is unresolved', function(assert) {
        const origin = 'https://tiles.example.com';
        const image = {serverProtocol: 'auto', _schedulerOrigin: null, _imageLoader: {jobLimit: 0}};
        scheduler.register(image);
        assert.ok(!scheduler._observing, 'Nothing to detect before the first tile is dispatched.');
        assert.equal(scheduler.limitFor(origin), 6, 'An origin nobody uses yet gets the conservative limit.');

        scheduler.assignOrigin(image, origin + '/a/1.jpg');
        assert.equal(image._schedulerOrigin, origin, 'The origin is taken from the tile url.');
        if (typeof PerformanceObserver !== 'undefined') {
            assert.ok(scheduler._observing, 'An unresolved auto origin starts watching resource timing.');
        }

        // Resource timing costs a callback for every resource the page loads, so once there is nothing
        // left to learn the observer has to go - and the cached limit has to follow the detection.
        scheduler.noteProtocol(origin, 'h2');
        assert.ok(!scheduler._observing, 'Detection stops once every origin is resolved.');
        assert.equal(scheduler.limitFor(origin), 24, 'The cached limit is refreshed by detection.');

        // A stated protocol never needs detection in the first place.
        const stated = {serverProtocol: 'h2', _schedulerOrigin: null, _imageLoader: {jobLimit: 0}};
        scheduler.register(stated);
        scheduler.assignOrigin(stated, 'https://other.example.com/1.jpg');
        assert.ok(!scheduler._observing, 'A stated protocol does not start detection.');
    });

    // ----------

    QUnit.test('a slot is released even when the tile was unloaded meanwhile', function(assert) {
        const done = assert.async();
        const origin = 'https://tiles.example.com';

        let context = null;
        const source = MockSeadragon.getTileSource();
        source.downloadTileStart = function(ctx) {
            context = ctx;
        };
        source.downloadTileAbort = function() {};

        viewer = OpenSeadragon(OpenSeadragon.extend(true, {}, baseOptions));

        // Tile.prototype._unload() clears tiledImage, and a request can outlive its tile - after a reset,
        // say - so the release must not need the image any more.
        const tile = {tiledImage: {serverProtocol: 'h2', _schedulerOrigin: origin}};
        viewer.imageLoader.addJob({
            src: 'test',
            tile: tile,
            source: source,
            loadWithAjax: false,
            crossOriginPolicy: false,
            ajaxWithCredentials: false,
            abort: function() {},
            callback: function() {
                assert.equal(scheduler.inFlightFor(origin), 0, 'Completion released the slot.');
                done();
            }
        });
        assert.equal(scheduler.inFlightFor(origin), 1, 'Dispatching booked the slot.');

        tile.tiledImage = null;
        context.finish({}, null, 'image');
    });

    // ----------

    QUnit.test('a tile source that throws on start gives its slot back', function(assert) {
        const done = assert.async();
        const origin = 'https://tiles.example.com';

        const source = MockSeadragon.getTileSource();
        source.downloadTileStart = function() {
            throw new Error('custom source failed');
        };
        source.downloadTileAbort = function() {};

        // A long timeout: the slot must come back right away, not when the timeout fires.
        viewer = OpenSeadragon(OpenSeadragon.extend(true, {}, baseOptions, {timeout: 60000, tileRetryMax: 0}));
        const loader = viewer.imageLoader;

        // start() turns the throw into fail() -> completeJob(), synchronously, so both counts come back to
        // where they were and the exception does not reach whoever dispatched the job.
        const tile = {tiledImage: {serverProtocol: 'h2', _schedulerOrigin: origin}};
        let error = null;
        loader.addJob({
            src: 'test',
            tile: tile,
            source: source,
            loadWithAjax: false,
            crossOriginPolicy: false,
            ajaxWithCredentials: false,
            abort: function() {},
            callback: function(data, errorMsg) {
                error = errorMsg;
            }
        });

        assert.ok(error && /custom source failed/.test(error), 'The job failed with the thrown message.');
        assert.equal(loader.jobsInProgress, 0, 'The loader slot was given back.');
        assert.equal(scheduler.inFlightFor(origin), 0, 'The origin slot was given back.');
        done();
    });

    // ----------

    QUnit.test('a tile that no longer exists is skipped by dispatch', function(assert) {
        const origin = 'https://tiles.example.com';
        const image = {serverProtocol: 'h2', _schedulerOrigin: null, _imageLoader: {jobLimit: 0}};
        scheduler.register(image);
        scheduler.assignOrigin(image, origin + '/1.jpg');

        // A wish list built before a failure landed still holds the failed tile; its retry belongs to the
        // ImageLoader retry queue, never to the wish list.
        const failed = {exists: false, loaded: false, loading: false};
        const wanted = {exists: true, loaded: false, loading: false};
        const dispatched = [];
        image._wishList = [failed, wanted];
        image._wishListTime = 0;
        image._loadTile = function(tile) {
            dispatched.push(tile);
            tile.loading = true;
        };

        assert.ok(scheduler._dispatchOne(image), 'A tile was dispatched.');
        assert.deepEqual(dispatched, [wanted], 'Only the existing tile was dispatched.');
        assert.equal(image._wishList.length, 0, 'The failed tile left the wish list.');
    });

    // ----------

    QUnit.test('a tile that failed is not dispatched again', function(assert) {
        const done = assert.async();
        const starts = {};
        const fails = url => /\/(9|10)\//.test(url);

        viewer = OpenSeadragon(OpenSeadragon.extend(true, {}, baseOptions, {
            serverProtocol: 'http/1.1',
            tileRetryMax: 0
        }));

        // completeJob() pumps right after a failure lands, from wish lists built before it. The failed tile
        // left its list when it was dispatched and is never ranked again, so the retry policy still holds.
        viewer.world.addHandler('add-item', function(event) {
            event.item.addHandler('fully-loaded-change', function(e) {
                if (!e.fullyLoaded) {
                    return;
                }
                const failed = Object.keys(starts).filter(fails);
                assert.ok(failed.length > 0, 'Some tiles failed.');
                assert.deepEqual(failed.filter(url => starts[url] > 1), [], 'Each failed tile was requested once.');
                done();
            });
        });

        viewer.open({
            width: 1024,
            height: 1024,
            tileSize: 256,
            tileOverlap: 0,
            getTileUrl: (level, x, y) => 'https://tiles.example.com/' + level + '/' + x + '_' + y,
            downloadTileStart: function(context) {
                starts[context.src] = (starts[context.src] || 0) + 1;
                setTimeout(function() {
                    if (fails(context.src)) {
                        context.fail('unavailable', null);
                    } else {
                        const canvas = document.createElement('canvas');
                        canvas.width = canvas.height = 8;
                        context.finish(canvas.getContext('2d'), null, 'context2d');
                    }
                }, 0);
            },
            downloadTileAbort: function() {}
        });
    });

    // ----------

    QUnit.test('a scheduled viewer loads its tiles', function(assert) {
        const done = assert.async();

        viewer = OpenSeadragon(OpenSeadragon.extend(true, {}, baseOptions, {
            serverProtocol: 'http/1.1'
        }));

        // The end-to-end check: with the frame-paced dispatch replaced, tiles still have to arrive, and the
        // origin's budget has to come back down afterwards rather than leaking a slot per tile.
        viewer.world.addHandler('add-item', function(event) {
            event.item.addHandler('fully-loaded-change', function(e) {
                if (!e.fullyLoaded) {
                    return;
                }
                assert.ok(true, 'The image loads to completion under the scheduler.');
                assert.equal(scheduler.inFlightFor(event.item._schedulerOrigin), 0,
                    'Every booked slot was released.');
                done();
            });
        });

        viewer.open({tileSource: '/test/data/testpattern.dzi'});
    });

    // ----------
    // Many images at once. Users run up to 60 layers in one viewer (multiplexed channels stacked on top of
    // each other); every one of them competes for the same origin budget.

    // Enough cache for every tile of every layer, so that eviction does not cause legitimate re-requests.
    const manyImageOptions = {maxImageCacheCount: 10000};

    // A synthetic tile source answering after `latency` ms, logging every request into `log`.
    const makeSyntheticSource = function(origin, index, latency, log) {
        return {
            width: 2048,
            height: 2048,
            tileSize: 256,
            tileOverlap: 0,
            getTileUrl: (level, x, y) => origin + '/' + index + '/' + level + '/' + x + '_' + y,
            downloadTileStart: function(context) {
                log.push({src: context.src, image: index, onTheWay: context.tile && context.tile.inLoadArea === false});
                context.userData.timer = setTimeout(function() {
                    const canvas = document.createElement('canvas');
                    canvas.width = canvas.height = 4;
                    context.finish(canvas.getContext('2d'), null, 'context2d');
                }, latency);
            },
            downloadTileAbort: function(context) {
                clearTimeout(context.userData.timer);
            }
        };
    };

    // Watches noteStart() for the highest number of requests each origin and all origins together carried.
    const watchConcurrency = function() {
        const peaks = {total: 0, perOrigin: {}};
        const original = scheduler.noteStart;
        scheduler.noteStart = function(origin) {
            const result = original.apply(this, arguments);
            peaks.perOrigin[origin] = Math.max(peaks.perOrigin[origin] || 0, result);
            let total = 0;
            this._origins.forEach(record => {
                total += record.inFlight;
            });
            peaks.total = Math.max(peaks.total, total);
            return result;
        };
        peaks.restore = () => {
            scheduler.noteStart = original;
        };
        return peaks;
    };

    // Resolves once every image of the world reports itself fully loaded.
    const whenAllLoaded = function(count, callback) {
        const loaded = new Set();
        let fired = false;
        viewer.world.addHandler('add-item', function(event) {
            event.item.addHandler('fully-loaded-change', function(e) {
                if (e.fullyLoaded) {
                    loaded.add(event.item);
                } else {
                    loaded.delete(event.item);
                }
                if (!fired && loaded.size === count && viewer.world.getItemCount() === count) {
                    fired = true;
                    // Let the completion that triggered this finish unwinding before checking the counters.
                    setTimeout(callback, 0);
                }
            });
        });
    };

    QUnit.test('60 images take turns on one origin', function(assert) {
        const origin = 'https://tiles.example.com';
        const count = 60;
        const served = [];
        const images = [];
        for (let i = 0; i < count; i++) {
            const image = {
                serverProtocol: 'h2',
                _schedulerOrigin: null,
                _imageLoader: {jobLimit: 0},
                _wishList: [],
                _wishListTime: 0,
                _loadTile: function(tile) {
                    tile.loading = true;
                    served.push(i);
                    scheduler.noteStart(this._schedulerOrigin);
                }
            };
            for (let t = 0; t < 5; t++) {
                image._wishList.push({
                    exists: true, loaded: false, loading: false,
                    getUrl: () => origin + '/' + i + '/' + t
                });
            }
            scheduler.register(image);
            images.push(image);
        }

        const budget = scheduler.budgetFor(origin);
        scheduler.pump();
        assert.equal(served.length, budget, 'One pump fills the budget and no more.');
        assert.equal(new Set(served).size, budget, 'Every slot went to a different image.');

        // Completions free the slots; each refill continues where the last one stopped, so nobody is served
        // twice before everybody has been served once.
        while (served.length < count) {
            const inFlight = scheduler.inFlightFor(origin);
            for (let i = 0; i < inFlight; i++) {
                scheduler.noteFinish(origin);
            }
            scheduler.pump();
        }
        assert.equal(new Set(served.slice(0, count)).size, count,
            'The first ' + count + ' requests reached all ' + count + ' images.');
    });

    // ----------

    QUnit.test('60 images on one origin load within one budget', function(assert) {
        const done = assert.async();
        const count = 60;
        const origin = 'https://tiles.example.com';
        const log = [];

        viewer = OpenSeadragon(OpenSeadragon.extend(true, {}, baseOptions, manyImageOptions, {serverProtocol: 'h2'}));
        const peaks = watchConcurrency();

        whenAllLoaded(count, function() {
            peaks.restore();
            assert.ok(log.length >= count, log.length + ' tiles were requested.');
            assert.ok(peaks.perOrigin[origin] <= scheduler.limitFor(origin),
                'The origin never carried more than its ceiling (' + peaks.perOrigin[origin] + ').');

            const seen = new Set();
            const repeated = log.filter(entry => {
                const again = seen.has(entry.src);
                seen.add(entry.src);
                return again;
            });
            assert.deepEqual(repeated, [], 'No tile was requested twice.');

            assert.equal(viewer.imageLoader.jobsInProgress, 0, 'The loader has no job left in progress.');
            assert.equal(scheduler.inFlightFor(origin), 0, 'Every booked slot was released.');
            done();
        });

        const sources = [];
        for (let i = 0; i < count; i++) {
            sources.push(makeSyntheticSource(origin, i, 10, log));
        }
        viewer.open(sources);
    });

    QUnit.test('60 images on three origins get independent budgets', function(assert) {
        const done = assert.async();
        const count = 60;
        const origins = ['https://a.example.com', 'https://b.example.com', 'https://c.example.com'];
        const log = [];

        viewer = OpenSeadragon(OpenSeadragon.extend(true, {}, baseOptions, manyImageOptions, {serverProtocol: 'http/1.1'}));
        const peaks = watchConcurrency();

        whenAllLoaded(count, function() {
            peaks.restore();
            for (const origin of origins) {
                assert.ok(peaks.perOrigin[origin] <= scheduler.limitFor(origin),
                    origin + ' stayed within its own ceiling (' + peaks.perOrigin[origin] + ').');
                assert.equal(scheduler.inFlightFor(origin), 0, origin + ' released every slot.');
            }
            assert.ok(peaks.total > scheduler.limitFor(origins[0]),
                'Together the origins carried more than one origin may (' + peaks.total + '): budgets are per origin.');
            assert.equal(viewer.imageLoader.jobsInProgress, 0, 'The loader has no job left in progress.');
            done();
        });

        const sources = [];
        for (let i = 0; i < count; i++) {
            sources.push(makeSyntheticSource(origins[i % origins.length], i, 15, log));
        }
        viewer.open(sources);
    });

    QUnit.test('60 images all load ahead during a slow pan', function(assert) {
        const done = assert.async();
        const count = 60;
        const origin = 'https://tiles.example.com';
        const log = [];
        let panStartedAt = -1;

        viewer = OpenSeadragon(OpenSeadragon.extend(true, {}, baseOptions, manyImageOptions, {serverProtocol: 'h2'}));

        whenAllLoaded(count, function() {
            const viewport = viewer.viewport;
            for (const spring of [viewport.zoomSpring, viewport.centerSpringX, viewport.centerSpringY]) {
                spring.animationTime = 20;
                spring.springStiffness = 1;
            }
            viewport.zoomTo(6, null, true);
            viewport.panTo(new OpenSeadragon.Point(0.1, 0.1), true);
            panStartedAt = log.length;
            viewport.panTo(new OpenSeadragon.Point(0.9, 0.9));

            setTimeout(function() {
                const imagesAhead = new Set(log.slice(panStartedAt).filter(e => e.onTheWay).map(e => e.image));
                assert.equal(imagesAhead.size, count, 'Every image loaded tiles along the way; none was starved.');
                done();
            }, 1500);
        });

        const sources = [];
        for (let i = 0; i < count; i++) {
            sources.push(makeSyntheticSource(origin, i, 10, log));
        }
        viewer.open(sources);
    });

    QUnit.test('removing images while their tiles land keeps the accounting right', function(assert) {
        const done = assert.async();
        const count = 20;
        const origin = 'https://tiles.example.com';
        const log = [];
        const removed = new Set();

        viewer = OpenSeadragon(OpenSeadragon.extend(true, {}, baseOptions, manyImageOptions, {serverProtocol: 'h2'}));

        // Every other image is removed from inside its first tile-loaded handler, i.e. from within a
        // completion that is about to pump the scheduler again.
        viewer.addHandler('tile-loaded', function(event) {
            const image = event.tiledImage;
            const index = viewer.world.getIndexOfItem(image);
            if (index > -1 && !removed.has(image) && image._testIndex % 2 === 0) {
                removed.add(image);
                viewer.world.removeItem(image);
            }
        });
        viewer.world.addHandler('add-item', function(event) {
            event.item._testIndex = viewer.world.getItemCount() - 1;
        });

        const remaining = count / 2;
        const loaded = new Set();
        let finished = false;
        const check = function() {
            if (finished || loaded.size < remaining || removed.size < remaining) {
                return;
            }
            finished = true;
            setTimeout(function() {
                assert.equal(viewer.world.getItemCount(), remaining, 'Half of the images were removed.');
                assert.equal(scheduler._images.length, remaining, 'Removed images left the scheduler.');
                assert.equal(viewer.imageLoader.jobsInProgress, 0, 'The loader has no job left in progress.');
                assert.equal(scheduler.inFlightFor(origin), 0, 'Every booked slot was released.');
                done();
            }, 50);
        };
        viewer.addHandler('tile-loaded', check);
        viewer.world.addHandler('add-item', function(event) {
            event.item.addHandler('fully-loaded-change', function(e) {
                if (e.fullyLoaded && !removed.has(event.item)) {
                    loaded.add(event.item);
                }
                check();
            });
        });

        const sources = [];
        for (let i = 0; i < count; i++) {
            sources.push(makeSyntheticSource(origin, i, 10, log));
        }
        viewer.open(sources);
    });

})();
