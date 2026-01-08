/*
 * OpenSeadragon - ImageLoader
 *
 * Copyright (C) 2009 CodePlex Foundation
 * Copyright (C) 2010-2025 OpenSeadragon contributors

 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 * - Redistributions of source code must retain the above copyright notice,
 *   this list of conditions and the following disclaimer.
 *
 * - Redistributions in binary form must reproduce the above copyright
 *   notice, this list of conditions and the following disclaimer in the
 *   documentation and/or other materials provided with the distribution.
 *
 * - Neither the name of CodePlex Foundation nor the names of its
 *   contributors may be used to endorse or promote products derived from
 *   this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

(function($){

/**
 * @class ImageJob
 * @classdesc Handles downloading of a single image.
 *
 * @memberof OpenSeadragon
 * @param {Object} options - Options for this ImageJob.
 * @param {String} [options.src] - URL of image to download.
 * @param {Tile} [options.tile] - Tile that belongs the data to.
 * @param {TileSource} [options.source] - Image loading strategy
 * @param {String} [options.loadWithAjax] - Whether to load this image with AJAX.
 * @param {String} [options.ajaxHeaders] - Headers to add to the image request if using AJAX.
 * @param {Boolean} [options.ajaxWithCredentials] - Whether to set withCredentials on AJAX requests.
 * @param {String} [options.crossOriginPolicy] - CORS policy to use for downloads
 * @param {String} [options.postData] - HTTP POST data (usually but not necessarily in k=v&k2=v2... form,
 *      see TileSource::getTilePostData) or null
 * @param {Function} [options.callback] - Called once image has been downloaded.
 * @param {Function} [options.abort] - Called when this image job is aborted.
 * @param {Number} [options.timeout] - The max number of milliseconds that this image job may take to complete.
 * @param {Number} [options.tries] - Actual number of the current try.
 */
$.ImageJob = function(options) {

    /**
     * Private parameter. Called automatically once image has been downloaded
     *   (triggered by finish).
     * @member {function} callback
     * @memberof OpenSeadragon.ImageJob#
     * @private
     */

    /**
     * URL of image (or other data item that will be rendered) to download.
     * @member {string} src
     * @memberof OpenSeadragon.ImageJob#
     */

    /**
     * Tile that owns the load. Note the data might be shared between tiles.
     * @member {OpenSeadragon.Tile} tile
     * @memberof OpenSeadragon.ImageJob#
     */

    /**
     * TileSource that initiated the load and owns the tile. Note the data might be shared between tiles and tile sources.
     * @member {OpenSeadragon.TileSource} source
     * @memberof OpenSeadragon.ImageJob#
     */

    /**
     * Whether to load this image with AJAX.
     * @member {boolean} loadWithAjax
     * @memberof OpenSeadragon.ImageJob#
     */

    /**
     * Headers to add to the image request if using AJAX.
     * @member {Object.<string, string>} ajaxHeaders
     * @memberof OpenSeadragon.ImageJob#
     */

    /**
     * Whether to set withCredentials on AJAX requests.
     * @member {boolean} ajaxWithCredentials
     * @memberof OpenSeadragon.ImageJob#
     */

    /**
     * CORS policy to use for downloads
     * @member {String} crossOriginPolicy
     * @memberof OpenSeadragon.ImageJob#
     */

    /**
     * HTTP POST data to send with the request
     * @member {(String|Object)} [postData] - HTTP POST data (usually but not necessarily
     *   in k=v&k2=v2... form, see TileSource::getTilePostData) or null
     * @memberof OpenSeadragon.ImageJob#
     */

    /**
     * Data object which will contain downloaded image data.
     * @member {Image|*} data data object, by default an Image object (depends on TileSource)
     * @memberof OpenSeadragon.ImageJob#
     */
    this.data = null;

    /**
     * User workspace to populate with helper variables
     * @member {*} userData to append custom data and avoid namespace collision
     * @memberof OpenSeadragon.ImageJob#
     */
    this.userData = {};

    /**
     * Error message holder. The final error message, default null (set by finish).
     * @member {string} error message
     * @memberof OpenSeadragon.ImageJob#
     * @private
     */
    this.errorMsg = null;

    /**
     * Private parameter. The max number of milliseconds that
     *   this image job may take to complete.
     * @member {number} timeout
     * @memberof OpenSeadragon.ImageJob#
     * @private
     */
    this.timeout = $.DEFAULT_SETTINGS.timeout;

    /**
     * Flag if part of batch query.
     * @member {boolean} isBatched
     * @memberof OpenSeadragon.ImageJob#
     * @private
     */
    this.isBatched = false;


    $.extend(true, this, {
        jobId: null,
        tries: 0,
    }, options);
};

$.ImageJob.prototype = {
    /**
     * Starts the image job.
     * @method
     * @private
     * @memberof OpenSeadragon.ImageJob#
     */
    start: function() {
        this.tries++;

        const self = this;
        const selfAbort = this.abort;

        this.jobId = window.setTimeout(function () {
            self.fail("Image load exceeded timeout (" + self.timeout + " ms)", null);
        }, this.timeout);

        /**
         * Called automatically when the job times out.
         *   Usage: if you decide to abort the request (no fail/finish will be called), call context.abort().
         * @member {function} abort
         * @memberof OpenSeadragon.ImageJob#
         */
        this.abort = function() {
            // this should call finish or fail
            self.source.downloadTileAbort(self);
            if (typeof selfAbort === "function") {
                selfAbort();
            }
            self.fail("Image load aborted.", null);
        };

        this.source.downloadTileStart(this);
    },

    /**
     * Prepares the image job to be part of batched mode. It does not override abort
     * callback and does not set timeout, nor call any tile source APIs. Managed by parent batch.
     * @method
     * @private
     * @memberof OpenSeadragon.ImageJob#
     */
    prepareForBatch: function() {
        this.tries++;
        this.jobId = -1;  // ensures methods above work, calling clearTimeout is noop
    },

    /**
     * Finish this job. Should be called unless abort() was executed upon successful data retrieval.
     *   Usage: context.finish(data, request, dataType=undefined). Pass the downloaded data object
     *   add also reference to an ajax request if used. Optionally, specify what data type the data is.
     * @param {*} data data that has been downloaded
     * @param {XMLHttpRequest} request reference to the request if used
     * @param {string} dataType data type identifier
     *   fallback compatibility behavior: dataType treated as errorMessage if data is falsey value
     * @memberof OpenSeadragon.ImageJob#
     */
    finish: function(data, request, dataType) {
        if (!this.jobId) {
            return;
        }
        // old behavior, no deprecation due to possible finish calls with invalid data item (e.g. different error)
        if (isInvalidData(data)) {
            this.fail(dataType || "[downloadTileStart->finish()] Retrieved data is invalid!", request);
            return;
        }

        this.data = data;
        this.request = request;
        this.errorMsg = null;
        this.dataType = dataType;

        window.clearTimeout(this.jobId);
        this.jobId = null;

        this.callback(this);
    },

    /**
     * Finish this job as a failure. Should be called unless abort() was executed upon unsuccessful request.
     *   Usage: context.fail(errMessage, request). Provide error message in case of failure,
     *   add also reference to an ajax request if used.
     * @param {string} errorMessage description upon failure
     * @param {XMLHttpRequest} request reference to the request if used
     */
    fail: function(errorMessage, request) {
        this.data = null;
        this.request = request;
        this.errorMsg = errorMessage;
        this.dataType = null;

        if (this.jobId) {
            window.clearTimeout(this.jobId);
            this.jobId = null;
        }

        this.callback(this);
    }
};

/**
 * @class BatchImageJob
 * @memberof OpenSeadragon
 * @classdesc Wraps a group of ImageJobs as a single unit of work for the ImageLoader queue.
 * It mimics the ImageJob API so it can be managed in a similar way.
 * @param {Object} options
 * @param {TileSource} options.source
 * @param {Array<OpenSeadragon.ImageJob>} options.jobs
 * @param {Function} [options.callback]
 * @param {Function} [options.abort]
 */
$.BatchImageJob = function(options) {
    $.extend(true, this, {
        timeout: $.DEFAULT_SETTINGS.timeout,
        jobId: null,
        data: null,
        dataType: null,
        errorMsg: null
    }, options);

    this.jobs = options.jobs || [];
    this.source = options.source;
};

$.BatchImageJob.prototype = {
    /**
     * Starts the batch job.
     */
    start: function() {
        this._finishedJobs = 0;
        const self = this;

        // Set timeout for the whole batch
        this.jobId = window.setTimeout(function () {
            self.fail("Batch image load exceeded timeout (" + self.timeout + " ms)", null);
        }, this.timeout);

        this.abort = function() {
            // we don't call job.start() for each job, so abort is callable here
            self.source.downloadTileBatchAbort(self);
            for (let j of this.jobs) {
                // Abort only running jobs by checking jobId. In theory, all should finish at once,
                // but we cannot enforce the logic executed by each batch job.
                if (j.jobId && j.abort) {
                    j.abort();
                }
            }
        };

        const wrap = (fn, job) => {
            return (...args) => {
                if (!this.jobId) {
                    return;
                }
                this._finishedJobs++;
                fn.call(job, ...args);
                if (this._finishedJobs === this.jobs.length) {
                    window.clearTimeout(this.jobId);
                    this.jobId = null;
                    if (this.callback) {
                        this.callback(this);
                    }
                }
            };
        };

        for (let j of this.jobs) {
            // Handle timeout securely
            j.finish = wrap(j.finish, j);
            j.fail = wrap(j.fail, j);
            j.prepareForBatch();
        }

        this.source.downloadTileBatchStart(this);
    },

    /**
     * Finish is defined as not to throw when accidentally used, but should not be called.
     */
    finish: function(data, request, dataType) {
        $.console.error('Finish call on batch job is not desirable: call finish on individual child jobs!', data, request);
    },

    /**
     * Finish all batched jobs as a failure. This is available mainly for ImageLoader class logics,
     * implementations should fail/finish/abort individual jobs directly.
     * @param {string} errorMessage description upon failure
     * @param {XMLHttpRequest} request reference to the request if used
     */
    fail: function(errorMessage, request) {
        this.data = null;
        this.request = request;
        this.errorMsg = errorMessage;
        this.dataType = null;

        // Fail before setting jobId to null, which is checked for in wrapped fail call.
        for (let i = 0; i < this.jobs.length; i++) {
            if (this.jobs[i].jobId) { // If still running
                this.jobs[i].fail(errorMessage || "Batch failed", request);
            }
        }

        if (this.jobId) {
            window.clearTimeout(this.jobId);
            this.jobId = null;
        }

        if (this.callback) {
            this.callback(this);
        }
    }
};

/**
 * @class ImageLoader
 * @memberof OpenSeadragon
 * @classdesc Handles downloading of a set of images using asynchronous queue pattern.
 * You generally won't have to interact with the ImageLoader directly.
 * @param {Object} options - Options for this ImageLoader.
 * @param {Number} [options.jobLimit] - The number of concurrent image requests. See imageLoaderLimit in {@link OpenSeadragon.Options} for details.
 * @param {Number} [options.timeout] - The max number of milliseconds that an image job may take to complete.
 */
$.ImageLoader = function(options) {

    $.extend(true, this, {
        jobLimit:       $.DEFAULT_SETTINGS.imageLoaderLimit,
        timeout:        $.DEFAULT_SETTINGS.timeout,
        jobQueue:       [],
        failedTiles:    [],
        jobsInProgress: 0
    }, options);

    this._batchBuckets = [];
};

/** @lends OpenSeadragon.ImageLoader.prototype */
$.ImageLoader.prototype = {

    /**
     * Add an unloaded image to the loader queue.
     * @method
     * @param {Object} options - Options for this job.
     * @param {TileSource} options.source - Image loading strategy definition
     * @param {String} [options.src] - URL of image to download.
     * @param {Tile} [options.tile] - Tile that belongs the data to. The tile instance
     *      is not internally used and serves for custom TileSources implementations.
     * @param {String} [options.loadWithAjax] - Whether to load this image with AJAX.
     * @param {String} [options.ajaxHeaders] - Headers to add to the image request if using AJAX.
     * @param {String|Boolean} [options.crossOriginPolicy] - CORS policy to use for downloads
     * @param {String} [options.postData] - POST parameters (usually but not necessarily in k=v&k2=v2... form,
     *      see TileSource::getTilePostData) or null
     * @param {Boolean} [options.ajaxWithCredentials] - Whether to set withCredentials on AJAX
     *      requests.
     * @param {Function} [options.callback] - Called once image has been downloaded.
     * @param {Function} [options.abort] - Called when this image job is aborted.
     * @returns {boolean} true if job was immediatelly started, false if queued
     */
    addJob: function(options) {
        if (!options.source) {
            $.console.error('ImageLoader.prototype.addJob() requires [options.source]...');
            options.source = $.TileSource.prototype;
        }

        const _this = this,
            jobOptions = {
                src: options.src,
                tile: options.tile || {},
                source: options.source,
                loadWithAjax: options.loadWithAjax,
                ajaxHeaders: options.loadWithAjax ? options.ajaxHeaders : null,
                crossOriginPolicy: options.crossOriginPolicy,
                ajaxWithCredentials: options.ajaxWithCredentials,
                postData: options.postData,
                callback: (job) => completeJob(_this, job, options.callback),
                abort: options.abort,
                timeout: this.timeout
            },
            newJob = new $.ImageJob(jobOptions);

        const sourceWantsBatching = options.source && options.source.batchEnabled();
        if (sourceWantsBatching) {
            // Mark job as batched so completeJob knows not to decrement global counters
            newJob.isBatched = true;
            this._stageJobForBatching(newJob, options.source);
            return false;
        }

        if ( !this.jobLimit || this.jobsInProgress < this.jobLimit ) {
            newJob.start();
            this.jobsInProgress++;
            return true;
        }
        this.jobQueue.push( newJob );
        return false;
    },

    /**
     * Internal method to group jobs.
     * @private
     */
    _stageJobForBatching: function(newJob, source) {
        let bucket = null;
        for (let i = 0; i < this._batchBuckets.length; i++) {
            if (this._batchBuckets[i].source.batchCompatible(source)) {
                bucket = this._batchBuckets[i];
                break;
            }
        }

        if (bucket && !bucket.timer) {
            $.console.error(
                'Attempted to add a new job to a batch bucket that has already been flushed. ' +
                'Creating a new batch bucket for this source. ' +
                'Check batch logic and timing if this happens frequently. ' +
                'Bucket source:', source, 'Job ID:', newJob && newJob.jobId
            );
            bucket = null;
        }

        if (!bucket) {
            bucket = {
                source: source,
                jobs: [],
                timer: null,
                waitTimeout: source.batchTimeout(),
                maxJobs: source.batchMaxJobs()
            };
            bucket.timer = setTimeout(() => this._flushBatchBucket(bucket), bucket.waitTimeout);
            this._batchBuckets.push(bucket);
        }

        bucket.jobs.push(newJob);

        if (bucket.maxJobs >= 1 && bucket.jobs.length >= bucket.maxJobs) {
            clearTimeout(bucket.timer);
            this._flushBatchBucket(bucket);
        }
    },

    /**
     * Flushes a specific bucket, creating a BatchJob and submitting it to the main queue logic.
     * @private
     */
    _flushBatchBucket: function(bucket) {
        bucket.timer = null;
        const index = this._batchBuckets.indexOf(bucket);
        if (index > -1) {
            this._batchBuckets.splice(index, 1);
        }

        if (bucket.jobs.length === 0) {
            return;
        }

        const _this = this;
        const batchJob = new $.BatchImageJob({
            source: bucket.source,
            jobs: bucket.jobs,
            timeout: this.timeout,
            callback: (job) => completeBatchJob(_this, job),
            // no abort here
        });

        if ( !this.jobLimit || this.jobsInProgress < this.jobLimit ) {
            batchJob.start();
            this.jobsInProgress++;
        } else {
            this.jobQueue.push(batchJob);
        }
    },

    /**
     * @returns {boolean} true if a job can be submitted
     */
    canAcceptNewJob() {
        return !this.jobLimit || this.jobsInProgress < this.jobLimit;
    },

    /**
     * Clear any unstarted image loading jobs from the queue.
     * @method
     */
    clear: function() {
        for( let i = 0; i < this.jobQueue.length; i++ ) {
            const job = this.jobQueue[i];
            if ( typeof job.abort === "function" ) {
                job.abort();
            }
        }
        this.jobQueue = [];

        if (this._batchBuckets) {
            for (let i = 0; i < this._batchBuckets.length; i++) {
                const bucket = this._batchBuckets[i];
                clearTimeout(bucket.timer);
                bucket.timer = null;
                // Jobs in buckets haven't started, no abort needed typically, just drop refs
            }
            this._batchBuckets = [];
        }
    }
};

/**
 * Cleans up ImageJob once completed. Restarts job after tileRetryDelay seconds if failed
 * but max tileRetryMax times
 * @method
 * @private
 * @param loader - ImageLoader used to start job.
 * @param {OpenSeadragon.ImageJob} job - The ImageJob that has completed.
 * @param callback - Called once cleanup is finished.
 */
function completeJob(loader, job, callback) {
    if (job.errorMsg && job.data === null && job.tries < 1 + loader.tileRetryMax) {
        // Retries are ran separately.
        job.isBatched = false;
        loader.failedTiles.push(job);
    }

    // CRITICAL: Child batch job items are marked as batched - do NOT decrement.
    if (!job.isBatched) {
        loader.jobsInProgress--;
    }

    if (loader.canAcceptNewJob() && loader.jobQueue.length > 0) {
        let nextJob = loader.jobQueue.shift();
        nextJob.start();
        loader.jobsInProgress++;
    }

    if (loader.tileRetryMax > 0 && loader.jobQueue.length === 0) {
        if (loader.canAcceptNewJob() && loader.failedTiles.length > 0) {
            let nextJob = loader.failedTiles.shift();
            setTimeout(function () {
                nextJob.start();
            }, loader.tileRetryDelay);
            loader.jobsInProgress++;
        }
    }

    if (callback) {
        callback(job.data, job.errorMsg, job.request, job.dataType, job.tries);
    }
}

/**
 * Cleans up BatchImageJob once completed. Explicit here so it's easier to debug,
 * In fact batch job does not need to do anything except decrementing counter.
 * @method
 * @private
 * @param loader - ImageLoader used to start job.
 * @param {BatchImageJob} job - The ImageJob that has completed.
 */
function completeBatchJob(loader, job) {
    loader.jobsInProgress--;
    job.jobs.length = 0; // make sure items are detached
}

// Consistent data validity checker
function isInvalidData(dataItem) {
    return dataItem === null || dataItem === undefined || dataItem === false;
}

}(OpenSeadragon));
