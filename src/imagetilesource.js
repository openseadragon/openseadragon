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
     * @classdesc The ImageTileSource allows simple image to be loaded
     * into an OpenSeadragon Viewer.
     *
     * @memberof OpenSeadragon
     * @extends OpenSeadragon.TileSource
     * @param {Object} options Options object.
     * @property {String} options.url URL of the image
     * @property {Boolean} options.buildPyramid If set to true (default), a
     * pyramid will be built internally to provide a better downsampling.
     * @property {String|Boolean} options.crossOriginPolicy Valid values are
     * 'Anonymous', 'use-credentials', and false. If false, image requests will
     * not use CORS preventing internal pyramid building for images from other
     * domains.
     * @property {String|Boolean} options.ajaxWithCredentials Whether to set the
     * withCredentials XHR flag for AJAX requests (when loading tile sources)
     * @property {Boolean} options.useCanvas Set to false to prevent any use of
     * the canvas API.
     */
    $.ImageTileSource = function (options) {

        $.extend(options, {
            buildPyramid: true,
            useCanvas: true
        });
        this.options = options;
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
         * @param {String} dataUrl - the url the image was retreived from, if any.
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
            var image = new Image();
            var _this = this;

            if (this.options.crossOriginPolicy) {
                image.crossOrigin = this.options.crossOriginPolicy;
            }
            if (this.options.ajaxWithCredentials) {
                image.useCredentials = this.options.ajaxWithCredentials;
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

                var pyramidMinWidth = _this.buildPyramid ? 1 : _this.width;
                var pyramidMinHeight = _this.buildPyramid ? 1 : _this.height;

                _this.levels = _this._buildLevels(
                        image, pyramidMinWidth, pyramidMinHeight);
                _this.maxLevel = _this.levels.length - 1;

                _this.ready = true;
                /**
                 * Raised when a TileSource is opened and initialized.
                 *
                 * @event ready
                 * @memberof OpenSeadragon.TileSource
                 * @type {object}
                 * @property {OpenSeadragon.TileSource} eventSource - A reference
                 * to the TileSource which raised the event.
                 * @property {Object} tileSource
                 * @property {?Object} userData - Arbitrary subscriber-defined object.
                 */
                _this.raiseEvent('ready', {tileSource: _this});
            });

            $.addEvent(image, 'error', function () {
                /***
                 * Raised when an error occurs loading a TileSource.
                 *
                 * @event open-failed
                 * @memberof OpenSeadragon.TileSource
                 * @type {object}
                 * @property {OpenSeadragon.TileSource} eventSource - A reference
                 * to the TileSource which raised the event.
                 * @property {String} message
                 * @property {String} source
                 * @property {?Object} userData - Arbitrary subscriber-defined object.
                 */
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
         * @function
         * @param {Number} level
         * @param {OpenSeadragon.Point} point
         */
        getTileAtPoint: function (level, point) {
            return new $.Point(0, 0);
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
        /**
         * @private Build the differents levels of the pyramid if possible
         * (canvas API enabled and no canvas tainting issue)
         */
        _buildLevels: function (image, minWidth, minHeight) {
            var levels = [{
                    url: image.src,
                    width: image.naturalWidth,
                    height: image.naturalHeight
                }];

            if (!$.supportsCanvas || !this.useCanvas) {
                return levels;
            }

            var currentWidth = image.naturalWidth;
            var currentHeight = image.naturalHeight;

            var bigCanvas = document.createElement("canvas");
            var bigContext = bigCanvas.getContext("2d");

            bigCanvas.width = currentWidth;
            bigCanvas.height = currentHeight;
            bigContext.drawImage(image, 0, 0, currentWidth, currentHeight);
            levels[0].context2D = bigContext;

            if ($.isCanvasTainted(bigContext.canvas)) {
                // If the canvas is tainted, we can't compute the pyramid.
                return levels;
            }

            while (currentWidth >= minWidth * 2 && currentHeight >= minHeight * 2) {
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
