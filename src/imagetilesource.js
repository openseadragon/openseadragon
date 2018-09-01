/*
 * OpenSeadragon - ImageTileSource
 *
 * Copyright (C) 2009 CodePlex Foundation
 * Copyright (C) 2010-2013 OpenSeadragon contributors
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
    $.ImageTileSource = function (options) {

        options = $.extend({
            buildPyramid: true,
            crossOriginPolicy: false,
            ajaxWithCredentials: false,
            useCanvas: true
        }, options);
        $.TileSource.apply(this, [options]);

    };

    $.extend($.ImageTileSource.prototype, $.TileSource.prototype, /** @lends OpenSeadragon.ImageTileSource.prototype */{
        /**
         * Determine if the data and/or url imply the image service is supported by
         * this tile source.
         * @function
         * @param {Object|Array} data
         * @param {String} optional - url
         */
        supports: function (data, url) {
            return data.type && data.type === "image";
        },
        /**
         *
         * @function
         * @param {Object} options - the options
         * @param {String} dataUrl - the url the image was retrieved from, if any.
         * @return {Object} options - A dictionary of keyword arguments sufficient
         *      to configure this tile sources constructor.
         */
        configure: function (options, dataUrl) {
            return options;
        },
        /**
         * Responsible for retrieving, and caching the
         * image metadata pertinent to this TileSources implementation.
         * @function
         * @param {String} url
         * @throws {Error}
         */
        getImageInfo: function (url) {
            var image = this._image = new Image();
            var _this = this;

            if (this.crossOriginPolicy) {
                image.crossOrigin = this.crossOriginPolicy;
            }
            if (this.ajaxWithCredentials) {
                image.useCredentials = this.ajaxWithCredentials;
            }

            $.addEvent(image, 'load', function () {
                /* IE8 fix since it has no naturalWidth and naturalHeight */
                _this.width = Object.prototype.hasOwnProperty.call(image, 'naturalWidth') ? image.naturalWidth : image.width;
                _this.height = Object.prototype.hasOwnProperty.call(image, 'naturalHeight') ? image.naturalHeight : image.height;
                _this.aspectRatio = _this.width / _this.height;
                _this.dimensions = new $.Point(_this.width, _this.height);
                _this._tileWidth = _this.width;
                _this._tileHeight = _this.height;
                _this.tileOverlap = 0;
                _this.minLevel = 0;
                _this.levels = _this._buildLevels();
                _this.maxLevel = _this.levels.length - 1;

                _this.ready = true;

                // Note: this event is documented elsewhere, in TileSource
                _this.raiseEvent('ready', {tileSource: _this});
            });

            $.addEvent(image, 'error', function () {
                // Note: this event is documented elsewhere, in TileSource
                _this.raiseEvent('open-failed', {
                    message: "Error loading image at " + url,
                    source: url
                });
            });

            image.src = url;
        },
        /**
         * @function
         * @param {Number} level
         */
        getLevelScale: function (level) {
            var levelScale = NaN;
            if (level >= this.minLevel && level <= this.maxLevel) {
                levelScale =
                        this.levels[level].width /
                        this.levels[this.maxLevel].width;
            }
            return levelScale;
        },
        /**
         * @function
         * @param {Number} level
         */
        getNumTiles: function (level) {
            var scale = this.getLevelScale(level);
            if (scale) {
                return new $.Point(1, 1);
            } else {
                return new $.Point(0, 0);
            }
        },
        /**
         * Retrieves a tile url
         * @function
         * @param {Number} level Level of the tile
         * @param {Number} x x coordinate of the tile
         * @param {Number} y y coordinate of the tile
         */
        getTileUrl: function (level, x, y) {
            var url = null;
            if (level >= this.minLevel && level <= this.maxLevel) {
                url = this.levels[level].url;
            }
            return url;
        },
        /**
         * Retrieves a tile context 2D
         * @function
         * @param {Number} level Level of the tile
         * @param {Number} x x coordinate of the tile
         * @param {Number} y y coordinate of the tile
         */
        getContext2D: function (level, x, y) {
            var context = null;
            if (level >= this.minLevel && level <= this.maxLevel) {
                context = this.levels[level].context2D;
            }
            return context;
        },

        // private
        //
        // Builds the different levels of the pyramid if possible
        // (i.e. if canvas API enabled and no canvas tainting issue).
        _buildLevels: function () {
            var levels = [{
                    url: this._image.src,
                    /* IE8 fix since it has no naturalWidth and naturalHeight */
                    width: Object.prototype.hasOwnProperty.call(this._image, 'naturalWidth') ? this._image.naturalWidth : this._image.width,
                    height:  Object.prototype.hasOwnProperty.call(this._image, 'naturalHeight') ? this._image.naturalHeight : this._image.height
                }];

            if (!this.buildPyramid || !$.supportsCanvas || !this.useCanvas) {
                // We don't need the image anymore. Allows it to be GC.
                delete this._image;
                return levels;
            }

            /* IE8 fix since it has no naturalWidth and naturalHeight */
            var currentWidth = Object.prototype.hasOwnProperty.call(this._image, 'naturalWidth') ? this._image.naturalWidth : this._image.width;
            var currentHeight = Object.prototype.hasOwnProperty.call(this._image, 'naturalHeight') ? this._image.naturalHeight : this._image.height;


            var bigCanvas = document.createElement("canvas");
            var bigContext = bigCanvas.getContext("2d");

            bigCanvas.width = currentWidth;
            bigCanvas.height = currentHeight;
            bigContext.drawImage(this._image, 0, 0, currentWidth, currentHeight);
            // We cache the context of the highest level because the browser
            // is a lot faster at downsampling something it already has
            // downsampled before.
            levels[0].context2D = bigContext;
            // We don't need the image anymore. Allows it to be GC.
            delete this._image;

            if ($.isCanvasTainted(bigCanvas)) {
                // If the canvas is tainted, we can't compute the pyramid.
                return levels;
            }

            // We build smaller levels until either width or height becomes
            // 1 pixel wide.
            while (currentWidth >= 2 && currentHeight >= 2) {
                currentWidth = Math.floor(currentWidth / 2);
                currentHeight = Math.floor(currentHeight / 2);
                var smallCanvas = document.createElement("canvas");
                var smallContext = smallCanvas.getContext("2d");
                smallCanvas.width = currentWidth;
                smallCanvas.height = currentHeight;
                smallContext.drawImage(bigCanvas, 0, 0, currentWidth, currentHeight);

                levels.splice(0, 0, {
                    context2D: smallContext,
                    width: currentWidth,
                    height: currentHeight
                });

                bigCanvas = smallCanvas;
                bigContext = smallContext;
            }
            return levels;
        }
    });

}(OpenSeadragon));
