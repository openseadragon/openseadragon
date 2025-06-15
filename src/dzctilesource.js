/*
 * OpenSeadragon - DzcTileSource
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

(function( $ ){

/**
 * @class DzcTileSource
 * @memberof OpenSeadragon
 * @extends OpenSeadragon.TileSource
 *
 * @param {Object} options - Options for the DzcTileSource.
 * @param {Number} options.width - The width of the image in pixels.
 * @param {Number} options.height - The height of the image in pixels.
 * @param {Number} [options.tileSize=256] - The size of the tiles in pixels.
 * @param {Number} [options.tileOverlap=0] - The number of pixels that tiles overlap.
 * @param {String} [options.tilesUrl] - The URL to the tiles.
 * @param {String} [options.fileFormat='jpg'] - The file format of the tiles.
 * @param {Array} [options.displayRects] - An array of display rectangles for the image.
 * @param {Number} [options.minLevel] - The minimum zoom level.
 * @param {Number} [options.maxLevel] - The maximum zoom level.
 * @param {Object} [options.dzc] - Linked DZC object.
 * @param {String} [options.urlDzi] - The URL to the DZI file.
 * @param {Number} [options.mortonNumber] - A number used for Morton encoding, if applicable.
 */

    $.DzcTileSource = function (options) {

        this.dzc          = options.dzc || {};

        this.width        = Number(options.width) || 0;
        this.height       = Number(options.height) || 0;
        this.tileSize     = Number(options.tileSize);
        this.tileOverlap  = Number(options.tileOverlap || this.dzc.tileOverlap) || 0;
        this.fileFormat   = options.fileFormat || this.dzc.format || 'jpg';

        this.urlDzi          = options.url || '';
        this.tilesUrl     = options.tilesUrl || this.urlDzi;

        this.mortonNumber = options.mortonNumber;

        this._dziLoaded   = false;
        this._loadStarted = false;
        this._pendingTileRequests = [];
        this.displayRects = options.displayRects || [];

        this._levelRects = {};
        for (var i = 0; i < this.displayRects.length; i++) {
            var r = this.displayRects[i];
            for (var l = r.minLevel; l <= r.maxLevel; l++) {
                (this._levelRects[l] = this._levelRects[l] || []).push(r);
            }
        }

        $.TileSource.apply(this, [{
            width: this.width,
            height: this.height,
            tileSize: this.tileSize,
            tileOverlap: this.tileOverlap,
            minLevel: options.minLevel,
            maxLevel: options.maxLevel,
            tilesUrl: this.tilesUrl,
            fileFormat: this.fileFormat
        }]);

        if (!this.minLevel) {
            this.minLevel = this.getClosestLevel() - this.dzc.maxLevel;
        }
    };

    // ==============================================================
    //  Prototype
    // ==============================================================
    $.extend($.DzcTileSource.prototype, $.TileSource.prototype, {

        /**
         * Determine if the data and/or url imply the image service is supported by
         * this tile source.
         * @function
         * @param {Object|Array} data
         * @param {String} optional - url
         */
        supports: function (data) {
            return $.isPlainObject(data) &&
                typeof data.dzc === 'object';
        },


        /**
         * Responsible for retrieving, and caching the
         * image metadata pertinent to this TileSources implementation.
         * There are three scenarios of opening a tile source: providing a parseable string, plain object, or an URL.
         * This method is only called by OSD if the TileSource configuration is a non-parseable string (~url).
         *
         * The string can contain a hash `#` symbol, followed by
         * key=value arguments. If this is the case, this method sends this
         * data as a POST body.
         *
         * @function
         * @param {String} url
         * @param {Function} callback - A function to call when the image info is retrieved.
         * @throws {Error}
         */
        getImageInfoCallback: function( url, callback ) {
            var _this = this,
                _callback,
                options,
                urlParts,
                filename,
                lastDot;


            if( url ) {
                urlParts = url.split( '/' );
                filename = urlParts[ urlParts.length - 1 ];
                lastDot  = filename.lastIndexOf( '.' );
                if ( lastDot > -1 ) {
                    urlParts[ urlParts.length - 1 ] = filename.slice( 0, lastDot );
                }
            }

            var postData = null;
            if (this.splitHashDataForPost) {
                var hashIdx = url.indexOf("#");
                if (hashIdx !== -1) {
                    postData = url.substring(hashIdx + 1);
                    url = url.substr(0, hashIdx);
                }
            }

            _callback = function( data ){
                if( typeof (data) === "string" ) {
                    data = $.parseXml( data );
                }
                var $TileSource = $.TileSource.determineType( _this, data, url );
                options = $TileSource.prototype.configure.apply( _this, [ data, url, postData ]);

                /*$.extend(true, _this, options);*/
                _this.fileFormat = options.fileFormat;
                _this.tileOverlap = options.tileOverlap;
                callback( );
            };

            // request info via xhr asynchronously.
            $.makeAjaxRequest( {
                url: url,
                postData: postData,
                withCredentials: this.ajaxWithCredentials,
                headers: this.ajaxHeaders,
                success: function( xhr ) {
                    var data = processResponse( xhr );
                    _callback( data );
                },
                error: function ( xhr, exc ) {
                    var msg;
                    $.console.error(msg);
                    /***
                     * Raised when an error occurs loading a TileSource.
                     *
                     * @event open-failed
                     * @memberof OpenSeadragon.TileSource
                     * @type {object}
                     * @property {OpenSeadragon.TileSource} eventSource - A reference to the TileSource which raised the event.
                     * @property {String} message
                     * @property {String} source
                     * @property {String} postData - HTTP POST data (usually but not necessarily in k=v&k2=v2... form,
                     *      see TileSource::getTilePostData) or null
                     * @property {?Object} userData - Arbitrary subscriber-defined object.
                     */
                    _this.raiseEvent( 'open-failed', {
                        message: msg,
                        source: url,
                        postData: postData
                    });
                }
            });

        },

        configure: function (data, url, postData ) {
            var options = $.extend(true, {}, data),
                dziUrl  = options.url || url || '';

            if (!options.tilesUrl && dziUrl) {
                options.tilesUrl = dziUrl.replace(
                    /([^/]+?)(\.(dzi|xml|js)?(\?[^/]*)?)?\/?$/,
                    '$1_files/'
                );
                options.queryParams = (/\.(dzi|xml|js)\?/.test(dziUrl)) ?
                    dziUrl.match(/\?.*/)[0] : '';
            }
            if (!options.tilesUrl && options.url) {
                options.tilesUrl = options.url;
            }
            return options;
        },

        getTileUrl: function (level, x, y) {
            return this.urlDzi + '/' + level + '/' + x + '-' + y;
        },

        getTilePostData: function (level, x, y) {
            return { level: level, dx: x, dy: y };
        },

        /**
         * @function
         * @param {Number} level
         * @param {Number} x
         * @param {Number} y
         * @param {Boolean} [isSource=false] Whether to return the source bounds of the tile.
         * @returns {OpenSeadragon.Rect} Either where this tile fits (in normalized coordinates) or the
         * portion of the tile to use as the source of the drawing operation (in pixels), depending on
         * the isSource parameter.
         */
       getTileBounds: function( level, x, y, isSource ) {
            var dimensionsScaled = this.dimensions.times( this.getLevelScale( level ) ),
                tileWidth = this.getTileWidth(level),
                tileHeight = this.getTileHeight(level),
                px = ( x === 0 ) ? 0 : tileWidth * x - this.tileOverlap,
                py = ( y === 0 ) ? 0 : tileHeight * y - this.tileOverlap,
                sx = tileWidth + ( x === 0 ? 1 : 2 ) * this.tileOverlap,
                sy = tileHeight + ( y === 0 ? 1 : 2 ) * this.tileOverlap,
                scale = 1.0 / dimensionsScaled.x;

            sx = Math.min( sx, dimensionsScaled.x - px );
            sy = Math.min( sy, dimensionsScaled.y - py );

            var dzcLevel = this.dzc.maxLevel - (this.getClosestLevel() - level);
            var offX = 0,
                offY = 0;
            // If we are using the DZC tiles, we need to offset in the tile
            if (dzcLevel <= this.dzc.maxLevel) {
                var dzcScale  = 1 << (this.dzc.maxLevel - dzcLevel);
                var full   = mortonToXY(this.mortonNumber);
                offX   = (full.x % dzcScale) * this.dzc.tileSize / dzcScale;
                offY   = (full.y % dzcScale) * this.dzc.tileSize / dzcScale;
            }
            if (isSource) {
                return new $.Rect(offX, offY, sx, sy);
            }

            return new $.Rect( px * scale, py * scale, sx * scale, sy * scale );
        },

        /* ----------------------------------------------------------
         *  downloadTileStart
         * -------------------------------------------------------- */
        downloadTileStart: function (context) {
            var self         = this,
                pd           = context.postData || {},
                level        = pd.level,
                closestLevel = this.getClosestLevel();
            // ---- Level inside DZC pyramid -------
            if (level <= closestLevel) {
                // Fetch tile from DZC object
                let dzcLevel = this.dzc.maxLevel - (closestLevel - level);
                let { x, y } = mortonToXY(this.mortonNumber);
                var scale  = 1 << (this.dzc.maxLevel - dzcLevel);
                var tileX  = Math.floor(x / scale);
                var tileY  = Math.floor(y / scale);
                this.dzc.getTile( dzcLevel, tileX, tileY, context );
                return;
            }

            if (this._dziLoaded) {
                this._downloadActualTile(context);
                return;
            }

            let callback = function () {
                self._dziLoaded = true;
                while (self._pendingTileRequests.length) {
                    self._downloadActualTile(self._pendingTileRequests.shift());
                }
            };

            this._pendingTileRequests.push(context);
            if (!this._loadStarted) {
                this._loadStarted = true;
                this.getImageInfoCallback(this.urlDzi, callback);   // async; 'ready' will flush queue
            }
        },

        _downloadActualTile: function (context) {
            var pd   = context.postData || {},
                lvl  = pd.level,
                dx   = pd.dx,
                dy   = pd.dy;
            context.src = this.tilesUrl + '/' + lvl + '/' +
                dx + '_' + dy + '.' + this.fileFormat + (this.queryParams || '');

            if (context.loadWithAjax) {
                $.makeAjaxRequest({
                    url: context.src,
                    withCredentials: context.ajaxWithCredentials,
                    headers: context.ajaxHeaders,
                    responseType: 'arraybuffer',
                    postData: context.postData,
                    success: function (request) {
                        var blob;
                        try {
                            blob = new window.Blob([request.response]);
                        } catch (e) {
                            var BlobBuilder = window.BlobBuilder ||
                                window.WebKitBlobBuilder ||
                                window.MozBlobBuilder ||
                                window.MSBlobBuilder;
                            if (e.name === 'TypeError' && BlobBuilder) {
                                var bb = new BlobBuilder();
                                bb.append(request.response);
                                blob = bb.getBlob();
                            }
                        }
                        if (blob.size === 0) {
                            context.fail('[downloadTileStart] Empty image response.', request);
                        } else {
                            context.finish(blob, request, 'rasterBlob');
                        }
                    },
                    error: function (request) {
                        context.fail('[downloadTileStart] Image load aborted – XHR error', request);
                    }
                });
            } else {
                context.finish(context.src, null, 'imageUrl');
            }
        },

        downloadTileAbort: function (context) {
            if (context.userData.request) {
                context.userData.request.abort();
            }
            var img = context.userData.image;
            if (img) {
                img.onload = img.onerror = img.onabort = null;
            }
        },


        /**
         * Equality comparator
         */
        equals: function(otherSource) {
            return this.tilesUrl === otherSource.tilesUrl;
        },


        /**
         * @function
         * @param {Number} level
         * @param {Number} x
         * @param {Number} y
         */
        tileExists: function (level, x, y) {
            var rects = this._levelRects[ level ],
                rect,
                scale,
                xMin,
                yMin,
                xMax,
                yMax,
                i;

            if ((this.minLevel && level < this.minLevel) || (this.maxLevel && level > this.maxLevel)) {
                return false;
            }

            if ( !rects || !rects.length ) {
                return true;
            }

            for ( i = rects.length - 1; i >= 0; i-- ) {
                rect = rects[ i ];

                if ( level < rect.minLevel || level > rect.maxLevel ) {
                    continue;
                }

                scale = this.getLevelScale( level );
                xMin = rect.x * scale;
                yMin = rect.y * scale;
                xMax = xMin + rect.width * scale;
                yMax = yMin + rect.height * scale;

                xMin = Math.floor( xMin / this._tileWidth );
                yMin = Math.floor( yMin / this._tileWidth ); // DZI tiles are square, so we just use _tileWidth
                xMax = Math.ceil( xMax / this._tileWidth );
                yMax = Math.ceil( yMax / this._tileWidth );

                if ( xMin <= x && x < xMax && yMin <= y && y < yMax ) {
                    return true;
                }
            }

            return false;
        },

    });


    /**
     * Decides whether to try to process the response as xml, json, or hand back
     * the text
     * @private
     * @inner
     * @function
     * @param {XMLHttpRequest} xhr - the completed network request
     */
    function processResponse( xhr ){
        var responseText = xhr.responseText,
            status       = xhr.status,
            statusText,
            data;

        if ( !xhr ) {
            throw new Error( $.getString( "Errors.Security" ) );
        } else if ( xhr.status !== 200 && xhr.status !== 0 ) {
            status     = xhr.status;
            statusText = ( status === 404 ) ?
                "Not Found" :
                xhr.statusText;
            throw new Error( $.getString( "Errors.Status", status, statusText ) );
        }

        if( responseText.match(/^\s*<.*/) ){
            try{
                data = ( xhr.responseXML && xhr.responseXML.documentElement ) ?
                    xhr.responseXML :
                    $.parseXml( responseText );
            } catch (e){
                data = xhr.responseText;
            }
        }else if( responseText.match(/\s*[{[].*/) ){
            try{
                data = $.parseJSON(responseText);
            } catch(e){
                data =  responseText;
            }
        }else{
            data = responseText;
        }
        return data;
    }


/* ------------- Morton decoding ------------- */
function mortonToXY(morton) {
    var x = 0;
    var y = 0;
    var bit = 0;
    while (morton) {
        var pair = morton & 3;
        x |= (pair & 1) << bit;
        y |= (pair >> 1) << bit;
        morton >>= 2;
        bit += 1;
    }
    return {x: x, y: y};
}

/*function getThumbnail(morton, level, maxLevel, scale) {
    if (level > maxLevel) {
        throw new Error('level exceeds maxLevel');
    }

    var thumbW  = Math.ceil( this.width * scale );
    var thumbH  = Math.ceil( this.height * scale );
    var full   = mortonToXY(morton);
    var scale  = 1 << (maxLevel - level);
    var tileX  = Math.floor(full.x / scale);
    var tileY  = Math.floor(full.y / scale);
    var offX   = (full.x % scale) * (thumbW / scale);
    var offY   = (full.y % scale) * (thumbH / scale);
    var offset = new OpenSeadragon.Point(offX, offY);

    return {level: level, x: tileX, y: tileY, offset: offset};
}*/

}(OpenSeadragon));
