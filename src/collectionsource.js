/*
 * OpenSeadragon - CollectionSource
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
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
 * TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

(function($) {

/**
 * You shouldn't have to create an instance directly; instead use
 * {@link OpenSeadragon.Viewer#openCollection} or pass it through the
 * {@link OpenSeadragon.Options#collectionSources} option.
 *
 * @class CollectionSource
 * @memberof OpenSeadragon
 * @classdesc Turns a Deep Zoom Collection (DZC) XML file into an array of regular
 * {@link OpenSeadragon.TileSource|TileSources}.
 * @param {Object}   options
 * @param {String}   options.url                         URL of the `.dzc` (or `.xml`) file.
 * @param {Function} [options.success]                   Success callback.
 * @param {Function} [options.error]                     Error callback.
 * @param {Boolean}  [options.ajaxWithCredentials=false] Send cookies with request.
 * @param {Object}   [options.ajaxHeaders={}]            Extra headers.
 */
$.CollectionSource = function(options) {

    this.url                 = options.url;
    this.success             = options.success;
    this.error               = options.error;
    this.ajaxWithCredentials = options.ajaxWithCredentials;
    this.ajaxHeaders         = options.ajaxHeaders;
    this.items               = [];

    // DZC-level attributes
    this.maxLevel  = null;
    this.tileSize  = null;
    this.format    = null;

    $.extend(true, this, {
        tilesMatrix:         Object.create(null), // level → x → y → Blob
        pendingTileDownloads: Object.create(null), // key   → true
        tileRequestQueues:   Object.create(null)  // key   → Array<request>
    });

    var config = this.configure(options, options.url, options.postData);
    $.extend(this, config);

    this._load();
};

/* ====================================================================== */
/*  Prototype                                                             */
/* ====================================================================== */

/** @lends OpenSeadragon.CollectionSource.prototype */
$.CollectionSource.prototype = {
    /**
     * @function
     * @param {Number} level
     * @param {Number} x
     * @param {Number} y
     * @returns {String|Function} url - A string for the url or a function that returns a url string.
     */
    getTileUrl: function(level, x, y) {
        return [
            this.tilesUrl,
            level, '/', x, '_', y, '.', this.fileFormat,
            this.queryParams
        ].join('');
    },


    /**
     * @function
     * @param {Number} level
     * @param {Number} x
     * @param {Number} y
     * @param {OpenSeadragon.TileSource~TileContext} context
     */
    getTile: function(level, x, y, context) {
        var key = tileKey(level, x, y);
        if (this.tilesMatrix[level] &&
            this.tilesMatrix[level][x] &&
            this.tilesMatrix[level][x][y]) {

            var blob = this.tilesMatrix[level][x][y];
            context.finish(blob, null, 'rasterBlob');
            return;
        }

        // If we are already downloading this tile, add to the queue
        if (!this.tileRequestQueues[key]) {
            this.tileRequestQueues[key] = [];
        }
        this.tileRequestQueues[key].push(context);

        if (this.pendingTileDownloads[key]) {
            return;
        }
        this.pendingTileDownloads[key] = true;

        var url = this.getTileUrl(level, x, y);
        downloadTile(
            url,
            this.ajaxHeaders,
            this.ajaxWithCredentials,
            function(err, blob) {
                delete this.pendingTileDownloads[key];

                if (err) {
                    console.error(
                        'Failed to download tile',
                        level, x, y, 'from', url,
                        'Error:', err
                    );
                    var badQueue = this.tileRequestQueues[key];
                    delete this.tileRequestQueues[key];
                    if (badQueue) {
                        badQueue.forEach(function(rq) {
                            rq.fail(err, null);
                        });
                    }
                    return;
                }

                if (!this.tilesMatrix[level]) {
                    this.tilesMatrix[level] = Object.create(null);
                }
                if (!this.tilesMatrix[level][x]) {
                    this.tilesMatrix[level][x] = Object.create(null);
                }
                this.tilesMatrix[level][x][y] = blob;

                var goodQueue = this.tileRequestQueues[key];
                goodQueue.forEach(function(rq) {
                    rq.finish(blob, null, 'rasterBlob');
                });
                delete this.tileRequestQueues[key];
            }.bind(this)
        );
    },


    /**
     * Configure instance, creating the “*_files/” path etc.
     * Exposed publicly to mimic TiledImage pattern.
     */
    configure: function(data, url, postData) {
        var options = $.extend(true, {}, data),
            dzcUrl  = options.url || url || '';

        if (!options.tilesUrl && dzcUrl) {
            options.tilesUrl = dzcUrl.replace(
                /([^/]+?)(\.(dzc|xml|js)?(\?[^/]*)?)?\/?$/,
                '$1_files/'
            );
            options.queryParams = (/\.(dzc|xml|js)\?/.test(dzcUrl)) ?
                dzcUrl.match(/\?.*/)[0] : '';
        }
        if (!options.tilesUrl && options.url) {
            options.tilesUrl = options.url;
        }
        return options;
    },

    /* ========================= PRIVATE ========================== */

    _load: function() {
        var self = this;
        $.makeAjaxRequest({
            url: self.url,
            withCredentials: self.ajaxWithCredentials,
            headers: self.ajaxHeaders,
            success: function(xhr) {
                var xml = xhr.responseXML || $.parseXml(xhr.responseText);
                self._parse(xml);
            },
            error: function() {
                if (self.error) {
                    self.error({
                        message: 'Failed to load DZC file',
                        source: self.url
                    });
                }
            }
        });
    },

    _parse: function(xml) {
        var self = this;
        var collection = xml.documentElement || xml;

        self.maxLevel  = parseInt(collection.getAttribute('MaxLevel'), 10) || 0;
        self.tileSize  = parseInt(collection.getAttribute('TileSize'), 10) || 256;
        self.format    = collection.getAttribute('Format') || 'jpg';
        self.fileFormat = self.format;

        var itemsNode = collection.getElementsByTagName('Items')[0];
        if (!itemsNode) {
            if (self.error) {
                self.error({
                    message: 'No <Items> found in DZC file',
                    source: self.url
                });
            }
            return;
        }

        var itemNodes = itemsNode.getElementsByTagName('I');
        var tileSources = [];
        var baseUrl = self.url.replace(/[^/\\]+$/, '');
        for (var i = 0; i < itemNodes.length; i++) {
            var item         = itemNodes[i];
            var source       = item.getAttribute('Source');
            var mortonNumber = item.getAttribute('N');

            var sizeNode = item.getElementsByTagName('Size')[0];
            var width  = sizeNode ? parseInt(sizeNode.getAttribute('Width'), 10) : 0;
            var height = sizeNode ? parseInt(sizeNode.getAttribute('Height'), 10) : 0;
            tileSources.push({
                url: baseUrl + source,
                width: width,
                height: height,
                tileSize: self.tileSize,
                dzc: self,
                mortonNumber: mortonNumber,
            });
        }
        var firstDziUrl = tileSources.length ? tileSources[0].url : null;

        function finish(overlap) {
            for (var k = 0; k < tileSources.length; k++) {
                tileSources[k].tileOverlap = overlap;
            }
            self.items = tileSources;
            if (self.success) {
                self.success(tileSources);
            }
        }

        if (firstDziUrl) {
            $.makeAjaxRequest({
                url: firstDziUrl,
                withCredentials: self.ajaxWithCredentials,
                headers: self.ajaxHeaders,
                success: function(xhr2) {
                    var dziXml  = xhr2.responseXML || $.parseXml(xhr2.responseText);
                    var image   = dziXml.documentElement || dziXml;
                    var overlap = parseInt(image.getAttribute('Overlap'), 10);
                    overlap     = isNaN(overlap) ? 0 : overlap;
                    finish(overlap);
                },
                error: function() {
                    finish(0);
                }
            });
        } else {
            finish(0);
        }
    }
};

/* ==================================================================== */
/*  Factory helper                                                      */
/* ==================================================================== */
$.createCollectionSource = function(options) {
    return new $.CollectionSource(options);
};

/* ==================================================================== */
/*  Utility helpers (module-level, unchanged bodies)                    */
/* ==================================================================== */

function tileKey(level, x, y) {
    return level + '_' + x + '_' + y;
}

/* ------------- Networking / download helpers ------------- */
function downloadTile(url, headers, withCreds, cb) {
    /* function body left untouched */
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.withCredentials = !!withCreds;

    if (headers) {
        Object.keys(headers).forEach(function(h) {
            xhr.setRequestHeader(h, headers[h]);
        });
    }

    xhr.onload = function() {
        if (xhr.status < 200 || xhr.status >= 300) {
            cb('HTTP ' + xhr.status, null);
            return;
        }
        if (!xhr.response) {
            cb('empty buffer', null);
            return;
        }

        var blob;
        try {
            blob = new Blob([xhr.response]);
        } catch (e) {
            var BB = window.BlobBuilder ||
                window.WebKitBlobBuilder ||
                window.MozBlobBuilder ||
                window.MSBlobBuilder;
            if (!BB) {
                cb('blob unsupported', null);
                return;
            }
            var bb = new BB();
            bb.append(xhr.response);
            blob = bb.getBlob();
        }

        if (!blob || !blob.size) {
            cb('empty blob', null);
            return;
        }
        cb(null, blob);
    };

    xhr.onerror = function() {
        cb('network error', null);
    };

    xhr.send();
}

}(OpenSeadragon));
