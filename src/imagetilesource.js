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
     */
    $.ImageTileSource = function (options) {

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
         * @param {Image} image - the actual image
         * @param {String} dataUrl - the url the image was retreived from, if any.
         * @return {Object} options - A dictionary of keyword arguments sufficient
         *      to configure this tile sources constructor.
         */
        configure: function (image, dataUrl) {
            return image;
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

            image.addEventListener('load', function () {
                _this.width = image.naturalWidth;
                _this.height = image.naturalHeight;
                _this.aspectRatio = _this.width / _this.height;
                _this.dimensions = new $.Point(_this.width, _this.height);
                _this._tileWidth = _this.width;
                _this._tileHeight = _this.height;
                _this.tileOverlap = 0;
                _this.minLevel = 0;
                _this.maxLevel = 0;

                _this.ready = true;
                /**
                 * Raised when a TileSource is opened and initialized.
                 *
                 * @event ready
                 * @memberof OpenSeadragon.TileSource
                 * @type {object}
                 * @property {OpenSeadragon.TileSource} eventSource - A reference to the TileSource which raised the event.
                 * @property {Object} tileSource
                 * @property {?Object} userData - Arbitrary subscriber-defined object.
                 */
                _this.raiseEvent('ready', {tileSource: _this});
            });

            image.addEventListener('error', function () {
                /***
                 * Raised when an error occurs loading a TileSource.
                 *
                 * @event open-failed
                 * @memberof OpenSeadragon.TileSource
                 * @type {object}
                 * @property {OpenSeadragon.TileSource} eventSource - A reference to the TileSource which raised the event.
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
            return level === 0 ? 1 : NaN;
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
         * This method is not implemented by this class other than to throw an Error
         * announcing you have to implement it.  Because of the variety of tile
         * server technologies, and various specifications for building image
         * pyramids, this method is here to allow easy integration.
         * @function
         * @param {Number} level
         * @param {Number} x
         * @param {Number} y
         * @throws {Error}
         */
        getTileUrl: function (level, x, y) {
            return this.url;
        }
    });

}(OpenSeadragon));
