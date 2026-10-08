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

})();
