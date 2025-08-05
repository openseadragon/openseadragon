/*
 * OpenSeadragon - ImageTileSource
 *
 * Copyright (C) 2009 CodePlex Foundation
 * Copyright (C) 2010-2025 OpenSeadragon contributors
 *
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
(function ($) {
/**
 * @class ImageTileSource
 * @classdesc The ImageTileSource allows a simple image to be loaded
 * into an OpenSeadragon Viewer.
 * There are 2 ways to open an ImageTileSource:
 * 1. viewer.open({type: 'image', url: fooUrl});
 * 2. viewer.open(new OpenSeadragon.ImageTileSource({url: fooUrl}));
 *
 * With the first syntax, the crossOriginPolicy, ajaxWithCredentials and
 * useCanvas options are inherited from the viewer if they are not
 * specified directly in the options object.
 *
 * @memberof OpenSeadragon
 * @extends OpenSeadragon.TileSource
 * @param {Object} options Options object.
 * @param {String} options.url URL of the image
 * @param {Boolean} [options.buildPyramid=true] If set to true (default), a
 * pyramid will be built internally to provide a better downsampling.
 * @param {String|Boolean} [options.crossOriginPolicy=false] Valid values are
 * 'Anonymous', 'use-credentials', and false. If false, image requests will
 * not use CORS preventing internal pyramid building for images from other
 * domains.
 * @param {String|Boolean} [options.ajaxWithCredentials=false] Whether to set
 * the withCredentials XHR flag for AJAX requests (when loading tile sources).
 * @param {Boolean} [options.useCanvas=true] Set to false to prevent any use
 * of the canvas API.
 */
$.ImageTileSource = class extends $.TileSource {

    constructor(props) {
        super($.extend({
            buildPyramid: true,
            crossOriginPolicy: false,
            ajaxWithCredentials: false,
        }, props));
    }

    /**
     * Determine if the data and/or url imply the image service is supported by
     * this tile source.
     * @function
     * @param {Object|Array} data
     * @param {String} url - optional
     */
    supports(data, url) {
        return data.type && data.type === "image";
    }
    /**
     *
     * @function
     * @param {Object} options - the options
     * @param {String} dataUrl - the url the image was retrieved from, if any.
     * @param {String} postData - HTTP POST data in k=v&k2=v2... form or null
     * @returns {Object} options - A dictionary of keyword arguments sufficient
     *      to configure this tile sources constructor.
     */
    configure(options, dataUrl, postData) {
        return options;
    }
    /**
     * Responsible for retrieving, and caching the
     * image metadata pertinent to this TileSources implementation.
     * @function
     * @param {String} url
     * @throws {Error}
     */
    getImageInfo(url) {
        const image = new Image(),
            _this = this;

        if (this.crossOriginPolicy) {
            image.crossOrigin = this.crossOriginPolicy;
        }
        if (this.ajaxWithCredentials) {
            image.useCredentials = this.ajaxWithCredentials;
        }

        $.addEvent(image, 'load', function () {
            _this.width = image.naturalWidth;
            _this.height = image.naturalHeight;
            _this.aspectRatio = _this.width / _this.height;
            _this.dimensions = new $.Point(_this.width, _this.height);
            _this._tileWidth = _this.width;
            _this._tileHeight = _this.height;
            _this.tileOverlap = 0;
            _this.minLevel = 0;
            _this.image = image;
            _this.levels = _this._buildLevels(image);
            _this.maxLevel = _this.levels.length - 1;

            _this.ready = true;

            // Note: this event is documented elsewhere, in TileSource
            _this.raiseEvent('ready', {tileSource: _this});
        });

        $.addEvent(image, 'error', function () {
            _this.image = null;
            // Note: this event is documented elsewhere, in TileSource
            _this.raiseEvent('open-failed', {
                message: "Error loading image at " + url,
                source: url
            });
        });

        image.src = url;
    }
    /**
     * @function
     * @param {Number} level
     */
    getLevelScale(level) {
        let levelScale = NaN;
        if (level >= this.minLevel && level <= this.maxLevel) {
            levelScale =
                this.levels[level].width /
                this.levels[this.maxLevel].width;
        }
        return levelScale;
    }
    /**
     * @function
     * @param {Number} level
     */
    getNumTiles(level) {
        if (this.getLevelScale(level)) {
            return new $.Point(1, 1);
        }
        return new $.Point(0, 0);
    }
    /**
     * Retrieves a tile url
     * @function
     * @param {Number} level Level of the tile
     * @param {Number} x x coordinate of the tile
     * @param {Number} y y coordinate of the tile
     */
    getTileUrl(level, x, y) {
        if (level === this.maxLevel) {
            return this.url; //for original image, preserve url
        }
        //make up url by positional args
        return `${this.url}?l=${level}&x=${x}&y=${y}`;
    }

    /**
     * Equality comparator
     */
    equals(otherSource) {
        return this.url === otherSource.url;
    }

    getTilePostData(level, x, y) {
        return {level: level, x: x, y: y};
    }

    /**
     * Retrieves a tile context 2D
     * @deprecated
     */
    getContext2D(level, x, y) {
        $.console.error('Using [TiledImage.getContext2D] (for plain images only) is deprecated. ' +
            'Use overridden downloadTileStart (https://openseadragon.github.io/examples/advanced-data-model/) instead.');
        return this._createContext2D();
    }

    downloadTileStart(job) {
        const tileData = job.postData;
        if (tileData.level === this.maxLevel) {
            job.finish(this.image, null, "image");
            return;
        }

        if (tileData.level >= this.minLevel && tileData.level <= this.maxLevel) {
            const levelData = this.levels[tileData.level];
            const context = this._createContext2D(this.image, levelData.width, levelData.height);
            job.finish(context, null, "context2d");
            return;
        }
        job.fail(`Invalid level ${tileData.level} for plain image source. Did you forget to set buildPyramid=true?`);
    }

    downloadTileAbort(job) {
        //no-op
    }

    // private
    //
    // Builds the different levels of the pyramid if possible
    // (i.e. if canvas API enabled and no canvas tainting issue).
    _buildLevels(image) {
        const levels = [{
            url: image.src,
            width: image.naturalWidth,
            height:  image.naturalHeight
        }];

        if (!this.buildPyramid || !$.supportsCanvas || !this.useCanvas) {
            return levels;
        }

        let currentWidth = image.naturalWidth,
            currentHeight = image.naturalHeight;
        // We build smaller levels until either width or height becomes
        // 2 pixel wide.
        while (currentWidth >= 2 && currentHeight >= 2) {
            currentWidth = Math.floor(currentWidth / 2);
            currentHeight = Math.floor(currentHeight / 2);

            levels.push({
                width: currentWidth,
                height: currentHeight,
            });
        }
        return levels.reverse();
    }


    _createContext2D(data, w, h) {
        const canvas = document.createElement("canvas"),
            context = canvas.getContext("2d");


        canvas.width = w;
        canvas.height = h;
        context.drawImage(data, 0, 0, w, h);
        return context;
    }
};

}(OpenSeadragon));
