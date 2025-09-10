/**
 * OpenSeadragon - IrisTileSource
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
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. *
 *
 */

(function($) {

  /**
   * @class IrisTileSource
   * @classdesc A tilesource implementation for use with Iris images.
   *
   * @memberof OpenSeadragon
   * @extends OpenSeadragon.TileSource
   *
   * @param {String} type       - iris
   * @param {String} serverUrl  - Iris host server path (ex: "http://localhost:3000")
   * @param {String} slideId    - Image id (ex: "12345" for 12345.iris)
   * @param {Object} metadata   - Optional metadata object to use instead of fetching
   *
   * Example: tileSources: {
   *            type:         "iris",
   *            serverUrl:    "http://localhost:3000",
   *            slideId:      "12345"
   *          }
   */

  $.IrisTileSource = function(options) {

    $.TileSource.apply(this, [options]);
    if (!options.serverUrl || !options.slideId) {
      throw new Error("IrisTileSource requires serverUrl and slideId");
    }
    this.serverUrl = options.serverUrl;
    this.slideId = options.slideId;
    this.ready = false;

    if (options.metadata) {
      this.parseMetadata(options.metadata);
      this.ready = true;
      this.raiseEvent('ready', { tileSource: this });
    } else {
      const url = this.getMetadataUrl();
      this.getImageInfo(url);
    }
  };

  $.extend($.IrisTileSource.prototype, $.TileSource.prototype, {
    /**
     * Return URL string for image metadata
     * @function
     * @returns {String} url - The Iris metadata URL
     */
    getMetadataUrl: function() {
      return this.serverUrl + '/slides/' + this.slideId + '/metadata';
    },

    /**
     * Determine if the data implies the image service is supported by this tile source.
     * @function
     * @param {Object} data - The raw metadata object to check
     * @returns {Boolean} - True if supported, false otherwise
     */
    supports: function(data) {
      return (data && data.type === "iris" && data.serverUrl && data.slideId);
    },

    /**
     * Parse Iris protocol metadata response
     * @function
     * @param {Object} data - Raw metadata from Iris server
     */
    parseMetadata: function(data) {
      this._tileWidth = 256;
      this._tileHeight = 256;

      this.tileSize = this._tileWidth;
      this.tileOverlap = 0;

      const layers = data.extent.layers;

      const maxLayer = layers.length - 1;
      const maxScale = layers[maxLayer].scale;

      this.width = Math.ceil(data.extent.width * maxScale);
      this.height = Math.ceil(data.extent.height * maxScale);

      this.dimensions = new $.Point(this.width, this.height);
      this.aspectRatio = this.width / this.height;
      this.levelSizes = layers.map(level => ({
        width: Math.ceil(level.x_tiles * this._tileWidth),
        height: Math.ceil(level.y_tiles * this._tileHeight),
        xTiles: Math.ceil(level.x_tiles),
        yTiles: Math.ceil(level.y_tiles)
      }));

      this.levelScales = layers.map(level => level.scale / maxScale);

      this.minLevel = 0;
      this.maxLevel = Math.ceil(this.levelSizes.length - 1);
    },

    /**
     * Retrieve image metadata from an Iris-compatible server
     * @function
     * @param {String} url - The metadata URL
     */
    getImageInfo: function(url) {
      const _this = this;

      $.makeAjaxRequest({
        url: url,
        type: "GET",
        async: true,
        success: function(xhr) {
          try {
            const data = JSON.parse(xhr.responseText);
            _this.parseMetadata(data);
            _this.ready = true;
            _this.raiseEvent('ready', { tileSource: _this });
          }
          catch (e) {
            const msg = "IrisTileSource: Error parsing metadata: " + e.message;
            $.console.error(msg);
            _this.raiseEvent('open-failed', { message: msg, source: url });
          }
        },
        error: function(xhr, exc) {
          const msg = "IrisTileSource: Unable to get metadata from " + url;
          $.console.error(msg);
          _this.raiseEvent('open-failed', { message: msg, source: url });
        }
      });
    },

    /**
     * Get the number of tiles at a given level
     * @function
     * @param {Number} level - The image depth level
     * @returns {OpenSeadragon.Point} - Number of tiles in x and y directions
     */
    getNumTiles: function(level) {
      if (level < this.minLevel || level > this.maxLevel || !this.levelSizes[level]) {
        return new $.Point(0, 0);
      }
      return new $.Point(
        Math.ceil(this.levelSizes[level].xTiles),
        Math.ceil(this.levelSizes[level].yTiles)
      );
    },

    /**
     * Determine the URL which will return an image for the region specified by the given x, y, and level components.
     * @function
     * @param {Number} level - The zoom level
     * @param {Number} x - The x tile index
     * @param {Number} y - The y tile index
     * @returns {String} - The tile URL
     */
    getTileUrl: function(level, x, y) {
      const pos = y * this.levelSizes[level].xTiles + x;
      return `${this.serverUrl}/slides/${this.slideId}/layers/${level}/tiles/${pos}`;
    },

    /**
     * Get the scale for a given level
     * @function
     * @param {Number} level - The image depth level
     * @returns {Number} - The scale for the level
     */
    getLevelScale: function(level) {
      return this.levelScales[level];
    },

    /**
     * Retrieve and immediately return the options object
     * @function
     * @param {Object} options - Options object
     * @returns {Object} - The options object
     */
    configure: function (options) {
      return options;
    }
  });

  $.extend(true, $.IrisTileSource.prototype, $.EventSource.prototype);

}(OpenSeadragon));
