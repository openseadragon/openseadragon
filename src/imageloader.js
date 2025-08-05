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

    $.extend(true, this, {
        timeout: $.DEFAULT_SETTINGS.timeout,
        jobId: null,
        tries: 0
    }, options);

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
     * Error message holder
     * @member {string} error message
     * @memberof OpenSeadragon.ImageJob#
     * @private
     */
    this.errorMsg = null;
};

$.ImageJob.prototype = {
    /**
     * Starts the image job.
     * @method
     * @memberof OpenSeadragon.ImageJob#
     */
    start: function() {
        this.tries++;

        var self = this;
        var selfAbort = this.abort;

        this.jobId = window.setTimeout(function () {
            self.fail("Image load exceeded timeout (" + self.timeout + " ms)", null);
        }, this.timeout);

        this.abort = function() {
            self.source.downloadTileAbort(self);
            if (typeof selfAbort === "function") {
                selfAbort();
            }
        };

        this.source.downloadTileStart(this);
    },

    /**
     * Finish this job.
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
        if (data === null || data === undefined || data === false) {
            this.fail(dataType || "[downloadTileStart->finish()] Retrieved data is invalid!", request);
            return;
        }

        this.data = data;
        this.request = request;
        this.errorMsg = null;
        this.dataType = dataType;

        if (this.jobId) {
            window.clearTimeout(this.jobId);
        }

        this.callback(this);
    },

    /**
     * Finish this job as a failure.
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

};

/** @lends OpenSeadragon.ImageLoader.prototype */
$.ImageLoader.prototype = {

    /**
     * Add an unloaded image to the loader queue.
     * @method
     * @param {Object} options - Options for this job.
     * @param {String} [options.src] - URL of image to download.
     * @param {Tile} [options.tile] - Tile that belongs the data to. The tile instance
     *      is not internally used and serves for custom TileSources implementations.
     * @param {TileSource} [options.source] - Image loading strategy
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
            $.console.error('ImageLoader.prototype.addJob() requires [options.source]. ' +
                'TileSource since new API defines how images are fetched. Creating a dummy TileSource.');
            var implementation = $.TileSource.prototype;
            options.source = {
                downloadTileStart: implementation.downloadTileStart,
                downloadTileAbort: implementation.downloadTileAbort
            };
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

        if ( !this.jobLimit || this.jobsInProgress < this.jobLimit ) {
            newJob.start();
            this.jobsInProgress++;
            return true;
        }
        this.jobQueue.push( newJob );
        return false;
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
        for( var i = 0; i < this.jobQueue.length; i++ ) {
            var job = this.jobQueue[i];
            if ( typeof job.abort === "function" ) {
                job.abort();
            }
        }

        this.jobQueue = [];
    }
};

/**
 * Cleans up ImageJob once completed. Restarts job after tileRetryDelay seconds if failed
 * but max tileRetryMax times
 * @method
 * @private
 * @param loader - ImageLoader used to start job.
 * @param job - The ImageJob that has completed.
 * @param callback - Called once cleanup is finished.
 */
function completeJob(loader, job, callback) {
    if (job.errorMsg && job.data === null && job.tries < 1 + loader.tileRetryMax) {
        loader.failedTiles.push(job);
    }
    let nextJob;

    loader.jobsInProgress--;

    if (loader.canAcceptNewJob() && loader.jobQueue.length > 0) {
        nextJob = loader.jobQueue.shift();
        nextJob.start();
        loader.jobsInProgress++;
    }

    if (loader.tileRetryMax > 0 && loader.jobQueue.length === 0) {
        if (loader.canAcceptNewJob() && loader.failedTiles.length > 0) {
            nextJob = loader.failedTiles.shift();
            setTimeout(function () {
                nextJob.start();
            }, loader.tileRetryDelay);
            loader.jobsInProgress++;
        }
    }

    callback(job.data, job.errorMsg, job.request, job.dataType);
}

}(OpenSeadragon));
