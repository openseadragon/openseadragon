/* global QUnit, $, testLog */

(function() {
    let viewer;
    const baseOptions = {
            id:            'example',
            prefixUrl:     '/build/openseadragon/images/',
            springStiffness: 100 // Faster animation = faster tests
        };

    QUnit.module('ImageLoader', {
        beforeEach: function () {
            $('<div id="example"></div>').appendTo("#qunit-fixture");

            testLog.reset();
        },
        afterEach: function () {
            if (viewer){
                viewer.destroy();
            }

            viewer = null;
        }
    });

    // ----------

    QUnit.test('Default timeout', function(assert) {
        const expected = OpenSeadragon.DEFAULT_SETTINGS.timeout;
        const options = OpenSeadragon.extend(true, baseOptions, {
                imageLoaderLimit: 1
            });
        const viewer = OpenSeadragon(options);
        const imageLoader = viewer.imageLoader;

        let message = 'ImageLoader timeout should be set to the default value of ' + expected + ' when none is specified';
        let actual = imageLoader.timeout;
        assert.equal(actual, expected, message);

        // Manually seize the ImageLoader
        imageLoader.jobsInProgress = imageLoader.jobLimit;
        imageLoader.addJob({
            src: 'test',
            source: MockSeadragon.getTileSource(),
            loadWithAjax: false,
            crossOriginPolicy: 'test',
            ajaxWithCredentials: false,
            abort: function() {}
        });

        message = 'ImageJob should inherit the ImageLoader timeout value';
        actual = imageLoader.jobQueue.shift().timeout;
        assert.equal(actual, expected, message);
    });

    // ----------

    QUnit.test('Configure timeout', function(assert) {
        const expected = 123456;
        const options = OpenSeadragon.extend(true, baseOptions, {
                imageLoaderLimit: 1,
                timeout: expected
            }),
            viewer = OpenSeadragon(options),
            imageLoader = viewer.imageLoader;

        let message = 'ImageLoader timeout should be configurable';
        let actual = imageLoader.timeout;
        assert.equal(actual, expected, message);

        imageLoader.jobsInProgress = imageLoader.jobLimit;
        imageLoader.addJob({
            src: 'test',
            source: MockSeadragon.getTileSource(),
            loadWithAjax: false,
            crossOriginPolicy: 'test',
            ajaxWithCredentials: false,
            abort: function() {}
        });

        message = 'ImageJob should inherit the ImageLoader timeout value';
        actual = imageLoader.jobQueue.shift().timeout;
        assert.equal(actual, expected, message);
    });

    // ----------

    QUnit.test('Timing out a job aborts the underlying request', function(assert) {
        const done = assert.async();

        const source = MockSeadragon.getTileSource();
        let abortedJob = null;
        // Never call finish/fail, so the only way out is the timeout.
        source.downloadTileStart = function() {};
        source.downloadTileAbort = function(context) {
            abortedJob = context;
        };

        viewer = OpenSeadragon(OpenSeadragon.extend(true, {}, baseOptions, { timeout: 20 }));

        viewer.imageLoader.addJob({
            src: 'test',
            source: source,
            loadWithAjax: false,
            crossOriginPolicy: false,
            ajaxWithCredentials: false,
            abort: function() {},
            callback: function(data, errorMsg) {
                assert.ok(errorMsg, 'Timed out job reports an error.');
                // Without this the XHR (or Image) keeps holding a connection slot until the server gives up.
                assert.ok(abortedJob, 'Timing out calls downloadTileAbort on the tile source.');
                done();
            }
        });
    });

    // ----------

    QUnit.test('Retrying a failed batched job does not corrupt jobsInProgress', function(assert) {
        const done = assert.async();

        // Batching is opt-in per tile source, and retries are off by default; the double-decrement only shows
        // up when both are on.
        const source = MockSeadragon.getTileSource();
        source.batchEnabled = function() { return true; };
        source.batchCompatible = function() { return true; };
        source.batchMaxJobs = function() { return 1; };
        source.batchTimeout = function() { return 0; };
        source.downloadTileStart = function(context) {
            context.fail('always fails', null);
        };
        source.downloadTileAbort = function() {};

        viewer = OpenSeadragon(OpenSeadragon.extend(true, {}, baseOptions, {
            tileRetryMax: 1,
            tileRetryDelay: 1
        }));
        const imageLoader = viewer.imageLoader;

        imageLoader.addJob({
            src: 'test',
            source: source,
            loadWithAjax: false,
            crossOriginPolicy: false,
            ajaxWithCredentials: false,
            abort: function() {},
            callback: function(data, errorMsg, request, dataType, tries) {
                // The counter is incremented once, for the parent BatchImageJob. A failed child must not
                // decrement it as well, or jobsInProgress drifts negative and jobLimit stops gating.
                assert.ok(imageLoader.jobsInProgress >= 0,
                    'jobsInProgress stays non-negative, was ' + imageLoader.jobsInProgress);
                // The child fails once as part of the batch and once as a standalone retry; the retry is only
                // reported if the batch's finish/fail wrappers were removed when the job left the batch.
                if (tries > 1) {
                    assert.equal(tries, 2, 'The retry of a batched child reports back.');
                    done();
                }
            }
        });
    });

    // ----------

    QUnit.test('Clearing the loader releases staged batch jobs', function(assert) {
        const source = MockSeadragon.getTileSource();
        source.batchEnabled = function() { return true; };
        source.batchCompatible = function() { return true; };
        // Large enough that the bucket is still waiting when we clear it.
        source.batchMaxJobs = function() { return 100; };
        source.batchTimeout = function() { return 10000; };

        viewer = OpenSeadragon(OpenSeadragon.extend(true, {}, baseOptions));
        const imageLoader = viewer.imageLoader;

        let released = false;
        imageLoader.addJob({
            src: 'test',
            source: source,
            loadWithAjax: false,
            crossOriginPolicy: false,
            ajaxWithCredentials: false,
            // This is the callback TiledImage uses to reset tile.loading.
            abort: function() { released = true; },
            callback: function() {}
        });

        assert.equal(imageLoader._batchBuckets.length, 1, 'Job was staged into a batch bucket.');

        imageLoader.clear();

        // Dropping the bucket without aborting leaves tile.loading === true forever, so the tile is never
        // re-selected for download.
        assert.ok(released, 'Clearing the loader aborts jobs still staged for batching.');
        assert.equal(imageLoader._batchBuckets.length, 0, 'Batch buckets are dropped.');
    });

    // ----------

    QUnit.test('Clearing the loader releases queued, unstarted batch jobs', function(assert) {
        const source = MockSeadragon.getTileSource();
        source.batchEnabled = function() { return true; };
        source.batchCompatible = function() { return true; };
        // Flush immediately, so the batch job goes straight to the (already full) job queue.
        source.batchMaxJobs = function() { return 1; };
        source.batchTimeout = function() { return 0; };

        viewer = OpenSeadragon(OpenSeadragon.extend(true, {}, baseOptions, { imageLoaderLimit: 1 }));
        const imageLoader = viewer.imageLoader;

        // Manually seize the loader so the flushed batch cannot start.
        imageLoader.jobsInProgress = imageLoader.jobLimit;

        let released = false;
        imageLoader.addJob({
            src: 'test',
            source: source,
            loadWithAjax: false,
            crossOriginPolicy: false,
            ajaxWithCredentials: false,
            // This is the callback TiledImage uses to reset tile.loading.
            abort: function() { released = true; },
            callback: function() {}
        });

        assert.equal(imageLoader.jobQueue.length, 1, 'The batch job is waiting in the queue.');

        imageLoader.clear();

        // A batch job only gets its abort in start(), so before this it was dropped without releasing its
        // children and their tiles stayed "loading" forever - never re-selected for download.
        assert.ok(released, 'Clearing the loader releases the children of a queued batch job.');
        assert.equal(imageLoader.jobQueue.length, 0, 'The queue is emptied.');
    });

    // ----------

    QUnit.test('Completing a batch job starts the next waiting job', function(assert) {
        const done = assert.async();

        const source = MockSeadragon.getTileSource();
        source.batchEnabled = function() { return true; };
        source.batchCompatible = function() { return true; };
        source.batchMaxJobs = function() { return 1; };
        source.batchTimeout = function() { return 0; };
        source.downloadTileBatchStart = function(context) {
            // Fail the child, which parks it in failedTiles while the parent still holds the only slot.
            context.jobs[0].fail('always fails', null);
        };
        source.downloadTileStart = function(context) {
            context.finish({}, null, 'image');
        };
        source.downloadTileAbort = function() {};

        viewer = OpenSeadragon(OpenSeadragon.extend(true, {}, baseOptions, {
            imageLoaderLimit: 1,
            tileRetryMax: 1,
            tileRetryDelay: 1
        }));
        const imageLoader = viewer.imageLoader;

        let tries = 0;
        imageLoader.addJob({
            src: 'test',
            source: source,
            loadWithAjax: false,
            crossOriginPolicy: false,
            ajaxWithCredentials: false,
            abort: function() {},
            callback: function(data, errorMsg, request, dataType, jobTries) {
                tries = jobTries;
                if (tries > 1) {
                    // Only completeJob() used to start waiting work. A batch frees its slot in
                    // completeBatchJob(), so retries queued by its children were stranded permanently.
                    assert.ok(true, 'The retry runs once the batch releases its slot.');
                    assert.ok(imageLoader.jobsInProgress >= 0,
                        'jobsInProgress stays non-negative, was ' + imageLoader.jobsInProgress);
                    done();
                }
            }
        });
    });

    // ----------

    QUnit.test('Retrying a job completes it once per attempt', function(assert) {
        const done = assert.async();

        const source = MockSeadragon.getTileSource();
        let aborts = 0;
        // Never finish/fail, so every attempt can only end in the timeout.
        source.downloadTileStart = function() {};
        source.downloadTileAbort = function() { aborts++; };

        viewer = OpenSeadragon(OpenSeadragon.extend(true, {}, baseOptions, {
            timeout: 10,
            tileRetryMax: 2,
            tileRetryDelay: 1
        }));
        const imageLoader = viewer.imageLoader;

        let callbacks = 0, lastTries = 0, releases = 0;
        imageLoader.addJob({
            src: 'test',
            source: source,
            loadWithAjax: false,
            crossOriginPolicy: false,
            ajaxWithCredentials: false,
            // This is the callback TiledImage uses to reset tile.loading.
            abort: function() { releases++; },
            callback: function(data, errorMsg, request, dataType, jobTries) {
                callbacks++;
                lastTries = jobTries;
            }
        });

        // 3 attempts (the first plus tileRetryMax retries), each timing out after 10ms and waiting 1ms.
        setTimeout(function() {
            // start() used to re-read this.abort, so attempt 2 wrapped attempt 1's closure and attempt 3
            // wrapped them both: one timeout then called fail() once per attempt already made, giving
            // 1 + 2 + 3 = 6 callbacks and leaving jobsInProgress at -3.
            assert.equal(callbacks, 3, 'One completion per attempt.');
            assert.equal(lastTries, 3, 'The job stops after tileRetryMax retries.');
            assert.equal(aborts, 3, 'The tile source is told to abort once per attempt.');
            assert.equal(releases, 3, 'The tile is released once per attempt.');
            assert.equal(imageLoader.jobsInProgress, 0,
                'Every reserved slot is given back exactly once, was ' + imageLoader.jobsInProgress);
            assert.equal(imageLoader.failedTiles.length, 0, 'The job is not queued for retry twice.');
            done();
        }, 300);
    });

    // ----------

    QUnit.test('A tile source reporting a failure twice completes the job once', function(assert) {
        const done = assert.async();

        const source = MockSeadragon.getTileSource();
        source.downloadTileStart = function(context) {
            context.fail('first report', null);
            // An aborted XHR fires its error handler from inside downloadTileAbort(), so a source can
            // report the same failure a second time.
            context.fail('second report', null);
        };
        source.downloadTileAbort = function() {};

        viewer = OpenSeadragon(OpenSeadragon.extend(true, {}, baseOptions, { tileRetryMax: 1, tileRetryDelay: 1 }));
        const imageLoader = viewer.imageLoader;

        let callbacks = 0;
        imageLoader.addJob({
            src: 'test',
            source: source,
            loadWithAjax: false,
            crossOriginPolicy: false,
            ajaxWithCredentials: false,
            abort: function() {},
            callback: function() { callbacks++; }
        });

        setTimeout(function() {
            // 2 attempts (the first plus tileRetryMax), one completion each.
            assert.equal(callbacks, 2, 'The duplicate report is ignored.');
            assert.equal(imageLoader.jobsInProgress, 0,
                'jobsInProgress is balanced, was ' + imageLoader.jobsInProgress);
            done();
        }, 100);
    });

    // ----------

    // Fails one plain job so it lands in failedTiles and _pumpQueue schedules its retry. All of that is
    // synchronous, because downloadTileStart fails immediately.
    function failOneJob(assert, options, onCallback) {
        const source = MockSeadragon.getTileSource();
        const calls = { aborts: 0, callbacks: 0 };
        source.downloadTileStart = function(context) {
            context.fail('always fails', null);
        };
        source.downloadTileAbort = function() {
            calls.aborts++;
        };

        viewer = OpenSeadragon(OpenSeadragon.extend(true, {}, baseOptions, options));
        const imageLoader = viewer.imageLoader;

        imageLoader.addJob({
            src: 'test',
            source: source,
            loadWithAjax: false,
            crossOriginPolicy: false,
            ajaxWithCredentials: false,
            abort: function() {},
            callback: function(data, errorMsg, request, dataType, jobTries) {
                calls.callbacks++;
                if (onCallback) {
                    onCallback(jobTries);
                }
            }
        });

        assert.equal(imageLoader._retryTimers.length, 1, 'The failed tile has a retry scheduled.');
        assert.equal(imageLoader.failedTiles.length, 0, 'It was already taken out of failedTiles.');
        return { imageLoader: imageLoader, calls: calls };
    }

    // ----------

    QUnit.test('Per-frame clear keeps pending tile retries', function(assert) {
        const done = assert.async();

        const fixture = failOneJob(assert, { tileRetryMax: 1, tileRetryDelay: 1 }, function(jobTries) {
            if (jobTries > 1) {
                assert.ok(true, 'The retry still ran after a per-frame clear.');
                done();
            }
        });

        // drawWorld() calls this on every frame the wanted tile set changes. A failed tile is marked
        // tile.exists = false, and tile selection skips such tiles, so the retry queue is its only way
        // back - dropping it here would leave the tile blank until TiledImage#reset().
        fixture.imageLoader.clear();

        assert.equal(fixture.imageLoader._retryTimers.length, 1, 'The pending retry survives clear().');
    });

    // ----------

    QUnit.test('Teardown clear cancels pending tile retries', function(assert) {
        const done = assert.async();

        // Long enough that the retry is certainly still pending when we clear.
        const fixture = failOneJob(assert, { tileRetryMax: 1, tileRetryDelay: 10000 });
        const imageLoader = fixture.imageLoader;
        const slotsBefore = imageLoader.jobsInProgress;

        imageLoader.clear(true);

        assert.equal(imageLoader._retryTimers.length, 0, 'The pending retry timer is cancelled.');
        assert.equal(imageLoader.failedTiles.length, 0, 'Tiles waiting for a retry are dropped.');
        assert.equal(imageLoader.jobsInProgress, slotsBefore - 1,
            'The slot the retry had reserved is given back exactly once.');
        // Aborting would route the job through fail() -> completeJob(), which re-queues it and decrements
        // jobsInProgress for a job that was never counted as in progress.
        assert.equal(fixture.calls.aborts, 0, 'Dropped retries are not aborted.');

        const callbacksBefore = fixture.calls.callbacks;
        setTimeout(function() {
            assert.equal(fixture.calls.callbacks, callbacksBefore, 'The cancelled retry never runs.');
            done();
        }, 50);
    });

    // ----------

    QUnit.test('Teardown stops in-flight jobs from queueing fresh retries', function(assert) {
        const done = assert.async();

        const source = MockSeadragon.getTileSource();
        // Never finish/fail, so the attempt is still in flight when we tear down and only its timeout
        // completes it - afterwards.
        source.downloadTileStart = function() {};
        source.downloadTileAbort = function() {};

        viewer = OpenSeadragon(OpenSeadragon.extend(true, {}, baseOptions, {
            timeout: 20,
            tileRetryMax: 3,
            tileRetryDelay: 5
        }));
        const imageLoader = viewer.imageLoader;

        let callbacks = 0;
        imageLoader.addJob({
            src: 'test',
            source: source,
            loadWithAjax: false,
            crossOriginPolicy: false,
            ajaxWithCredentials: false,
            abort: function() {},
            callback: function() { callbacks++; }
        });

        assert.equal(imageLoader._retryTimers.length, 0, 'The attempt is in flight, not waiting to retry.');

        // Cancelling the pending timers is not enough on its own: a job that is already running lands
        // later and used to queue a brand new retry, so the loader kept working after close().
        imageLoader.clear(true);

        setTimeout(function() {
            assert.equal(callbacks, 1, 'The in-flight attempt completes exactly once and stops there.');
            assert.equal(imageLoader._retryTimers.length, 0, 'No retry is scheduled after teardown.');
            assert.equal(imageLoader.failedTiles.length, 0, 'The torn-down job is not queued for retry.');
            assert.equal(imageLoader.jobsInProgress, 0,
                'jobsInProgress settles at zero, was ' + imageLoader.jobsInProgress);
            done();
        }, 200);
    });

    // ----------

    QUnit.test('Retries still work for jobs added after a teardown', function(assert) {
        const done = assert.async();

        const source = MockSeadragon.getTileSource();
        source.downloadTileStart = function(context) {
            context.fail('always fails', null);
        };
        source.downloadTileAbort = function() {};

        viewer = OpenSeadragon(OpenSeadragon.extend(true, {}, baseOptions, {
            tileRetryMax: 1,
            tileRetryDelay: 1
        }));
        const imageLoader = viewer.imageLoader;

        // A viewer can be reopened on the same loader, so the generation bump must not disable retries
        // for everything queued afterwards.
        imageLoader.clear(true);

        let callbacks = 0;
        imageLoader.addJob({
            src: 'test',
            source: source,
            loadWithAjax: false,
            crossOriginPolicy: false,
            ajaxWithCredentials: false,
            abort: function() {},
            callback: function() { callbacks++; }
        });

        setTimeout(function() {
            assert.equal(callbacks, 2, 'The new job is retried tileRetryMax times.');
            assert.equal(imageLoader.jobsInProgress, 0,
                'jobsInProgress is balanced, was ' + imageLoader.jobsInProgress);
            done();
        }, 100);
    });

    // ----------

    QUnit.test('Closing the viewer cancels pending tile retries', function(assert) {
        const fixture = failOneJob(assert, { tileRetryMax: 1, tileRetryDelay: 10000 });
        const imageLoader = fixture.imageLoader;

        // close() tears down the world the retry would load into, so it must pass the teardown flag.
        viewer.close();

        assert.equal(imageLoader._retryTimers.length, 0, 'close() cancels pending retry timers.');
        assert.equal(imageLoader.failedTiles.length, 0, 'close() drops tiles waiting for a retry.');
    });

})();
