/*
 * OpenSeadragon - ImageLoader
 *
 * Copyright (C) 2009 CodePlex Foundation
 * Copyright (C) 2010-2013 OpenSeadragon contributors
 
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

(function( $ ){

/**
 * @private
 * @class ImageJob
 * @classdesc Handles loading a single image for use in a single {@link OpenSeadragon.Tile}.
 *
 * @memberof OpenSeadragon
 * @param {String} source - URL of image to download.
 * @param {Function} callback - Called once image has finished downloading.
 */
function ImageJob ( options ) {
    
    $.extend( true, this, {
        timeout:        $.DEFAULT_SETTINGS.timeout,
        jobId:          null,
    }, options );
    
    /**
     * Image object which will contain downloaded image.
     * @member {Image} image
     * @memberof OpenSeadragon.ImageJob#
     */
    this.image = null;
}

ImageJob.prototype = {

    /**
     * Initiates downloading of associated image.
     * @method
     */
    start: function(){
        var _this = this;

        this.image = new Image();

        if ( _this.crossOriginPolicy !== false ) {
            this.image.crossOrigin = this.crossOriginPolicy;
        }

        this.image.onload = function(){
            _this.finish( true );
        };
        this.image.onabort = this.image.onerror = function(){
            _this.finish( false );
        };

        this.jobId = window.setTimeout( function(){
            _this.finish( false );
        }, this.timeout);

        this.image.src = this.src;
    },

    finish: function( successful ) {
        this.image.onload = this.image.onerror = this.image.onabort = null;
        if (!successful) {
            this.image = null;
        }

        if ( this.jobId ) {
            window.clearTimeout( this.jobId );
        }

        this.callback( this );
    }

};

/**
 * @class
 * @classdesc Handles downloading of a set of images using asynchronous queue pattern.
 */
$.ImageLoader = function() {
    
    $.extend( true, this, {
        jobLimit:       $.DEFAULT_SETTINGS.imageLoaderLimit,
        jobQueue:       [],
        jobsInProgress: 0
    });

};

$.ImageLoader.prototype = {
    
    /**
     * Add an unloaded image to the loader queue.
     * @method
     * @param {String} src - URL of image to download.
     * @param {Function} callback - Called once image has been downloaded.
     */
    addJob: function( options ) {
        var _this = this,
            complete = function( job ) {
                completeJob( _this, job, options.callback );
            },
            jobOptions = {
                src: options.src,
                callback: complete
            },
            newJob = new ImageJob( jobOptions );

        if ( !this.jobLimit || this.jobsInProgress < this.jobLimit ) {
            newJob.start();
            this.jobsInProgress++;
        }
        else {
           this.jobQueue.push( newJob );
        }

    }
};

/**
 * Cleans up ImageJob once completed.
 * @method
 * @private
 * @param loader - ImageLoader used to start job.
 * @param job - The ImageJob that has completed.
 * @param callback - Called once cleanup is finished.
 */
function completeJob( loader, job, callback ) {
    var nextJob;

    loader.jobsInProgress--;

    if ( (!loader.jobLimit || loader.jobsInProgress < loader.jobLimit) && loader.jobQueue.length > 0) {
        nextJob = loader.jobQueue.shift();
        nextJob.start();
    }

    callback( job.image );
}

}( OpenSeadragon ));

