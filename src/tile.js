/*
 * OpenSeadragon - Tile
 *
 * Copyright (C) 2009 CodePlex Foundation
 * Copyright (C) 2010-2024 OpenSeadragon contributors
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
 * @class Tile
 * @memberof OpenSeadragon
 * @param {Number} level The zoom level this tile belongs to.
 * @param {Number} x The vector component 'x'.
 * @param {Number} y The vector component 'y'.
 * @param {OpenSeadragon.Rect} bounds Where this tile fits, in normalized
 *      coordinates.
 * @param {Boolean} exists Is this tile a part of a sparse image? ( Also has
 *      this tile failed to load? )
 * @param {String|Function} url The URL of this tile's image or a function that returns a url.
 * @param {CanvasRenderingContext2D} [context2D=undefined] The context2D of this tile if it
 *  *      is provided directly by the tile source. Deprecated: use Tile::addCache(...) instead.
 * @param {Boolean} loadWithAjax Whether this tile image should be loaded with an AJAX request .
 * @param {Object} ajaxHeaders The headers to send with this tile's AJAX request (if applicable).
 * @param {OpenSeadragon.Rect} sourceBounds The portion of the tile to use as the source of the
 *      drawing operation, in pixels. Note that this only works when drawing with canvas; when drawing
 *      with HTML the entire tile is always used.
 * @param {String} postData HTTP POST data (usually but not necessarily in k=v&k2=v2... form,
 *      see TileSource::getTilePostData) or null
 * @param {String} cacheKey key to act as a tile cache, must be unique for tiles with unique image data
 */
$.Tile = function(level, x, y, bounds, exists, url, context2D, loadWithAjax, ajaxHeaders, sourceBounds, postData, cacheKey) {
    /**
     * The zoom level this tile belongs to.
     * @member {Number} level
     * @memberof OpenSeadragon.Tile#
     */
    this.level   = level;
    /**
     * The vector component 'x'.
     * @member {Number} x
     * @memberof OpenSeadragon.Tile#
     */
    this.x       = x;
    /**
     * The vector component 'y'.
     * @member {Number} y
     * @memberof OpenSeadragon.Tile#
     */
    this.y       = y;
    /**
     * Where this tile fits, in normalized coordinates
     * @member {OpenSeadragon.Rect} bounds
     * @memberof OpenSeadragon.Tile#
     */
    this.bounds  = bounds;
    /**
     * Where this tile fits, in normalized coordinates, after positioning
     * @member {OpenSeadragon.Rect} positionedBounds
     * @memberof OpenSeadragon.Tile#
     */
    this.positionedBounds  = new OpenSeadragon.Rect(bounds.x, bounds.y, bounds.width, bounds.height);
    /**
     * The portion of the tile to use as the source of the drawing operation, in pixels. Note that
     * this only works when drawing with canvas; when drawing with HTML the entire tile is always used.
     * @member {OpenSeadragon.Rect} sourceBounds
     * @memberof OpenSeadragon.Tile#
     */
    this.sourceBounds = sourceBounds;
    /**
     * Is this tile a part of a sparse image? Also has this tile failed to load?
     * @member {Boolean} exists
     * @memberof OpenSeadragon.Tile#
     */
    this.exists  = exists;
    /**
     * Private property to hold string url or url retriever function.
     * Consumers should access via Tile.getUrl()
     * @member {String|Function} url
     * @memberof OpenSeadragon.Tile#
     * @private
     */
    this._url     = url;
    /**
     * Post parameters for this tile. For example, it can be an URL-encoded string
     * in k1=v1&k2=v2... format, or a JSON, or a FormData instance... or null if no POST request used
     * @member {String} postData HTTP POST data (usually but not necessarily in k=v&k2=v2... form,
     *      see TileSource::getTilePostData) or null
     * @memberof OpenSeadragon.Tile#
     */
    this.postData  = postData;
    /**
     * The context2D of this tile if it is provided directly by the tile source.
     * @member {CanvasRenderingContext2D} context2D
     * @memberOf OpenSeadragon.Tile#
     */
    if (context2D) {
        this.context2D = context2D;
    }
    /**
     * Whether to load this tile's image with an AJAX request.
     * @member {Boolean} loadWithAjax
     * @memberof OpenSeadragon.Tile#
     */
    this.loadWithAjax = loadWithAjax;
    /**
     * The headers to be used in requesting this tile's image.
     * Only used if loadWithAjax is set to true.
     * @member {Object} ajaxHeaders
     * @memberof OpenSeadragon.Tile#
     */
    this.ajaxHeaders = ajaxHeaders;

    if (cacheKey === undefined) {
        $.console.warn("Tile constructor needs 'cacheKey' variable: creation tile cache" +
            " in Tile class is deprecated. TileSource.prototype.getTileHashKey will be used.");
        cacheKey = $.TileSource.prototype.getTileHashKey(level, x, y, url, ajaxHeaders, postData);
    }

    this._cKey = cacheKey || "";
    this._ocKey = cacheKey || "";

    /**
     * Is this tile loaded?
     * @member {Boolean} loaded
     * @memberof OpenSeadragon.Tile#
     */
    this.loaded  = false;
    /**
     * Is this tile loading?
     * @member {Boolean} loading
     * @memberof OpenSeadragon.Tile#
     */
    this.loading = false;
    /**
     * This tile's position on screen, in pixels.
     * @member {OpenSeadragon.Point} position
     * @memberof OpenSeadragon.Tile#
     */
    this.position   = null;
    /**
     * This tile's size on screen, in pixels.
     * @member {OpenSeadragon.Point} size
     * @memberof OpenSeadragon.Tile#
     */
    this.size       = null;
    /**
     * Whether to flip the tile when rendering.
     * @member {Boolean} flipped
     * @memberof OpenSeadragon.Tile#
     */
    this.flipped    = false;
    /**
     * The start time of this tile's blending.
     * @member {Number} blendStart
     * @memberof OpenSeadragon.Tile#
     */
    this.blendStart = null;
    /**
     * The current opacity this tile should be.
     * @member {Number} opacity
     * @memberof OpenSeadragon.Tile#
     */
    this.opacity    = null;
    /**
     * The squared distance of this tile to the viewport center.
     * Use for comparing tiles.
     * @member {Number} squaredDistance
     * @memberof OpenSeadragon.Tile#
     * @private
     */
    this.squaredDistance   = null;
    /**
     * The visibility score of this tile.
     * @member {Number} visibility
     * @memberof OpenSeadragon.Tile#
     */
    this.visibility = null;

    /**
     * The transparency indicator of this tile.
     * @member {Boolean} hasTransparency true if tile contains transparency for correct rendering
     * @memberof OpenSeadragon.Tile#
     */
    this.hasTransparency = false;

    /**
     * Whether this tile is currently being drawn.
     * @member {Boolean} beingDrawn
     * @memberof OpenSeadragon.Tile#
     */
    this.beingDrawn     = false;

    /**
     * Timestamp the tile was last touched.
     * @member {Number} lastTouchTime
     * @memberof OpenSeadragon.Tile#
     */
    this.lastTouchTime  = 0;

    /**
     * Whether this tile is in the right-most column for its level.
     * @member {Boolean} isRightMost
     * @memberof OpenSeadragon.Tile#
     */
    this.isRightMost = false;

    /**
     * Whether this tile is in the bottom-most row for its level.
     * @member {Boolean} isBottomMost
     * @memberof OpenSeadragon.Tile#
     */
    this.isBottomMost = false;

    /**
     * Owner of this tile. Do not change this property manually.
     * @member {OpenSeadragon.TiledImage}
     * @memberof OpenSeadragon.Tile#
     */
    this.tiledImage = null;
    /**
     * Array of cached tile data associated with the tile.
     * @member {Object}
     * @private
     */
    this._caches = {};
    /**
     * Processing flag, exempt the tile from removal when there are ongoing updates
     * @member {Boolean|Number}
     * @private
     */
    this.processing = false;
    /**
     * Processing promise, resolves when the tile exits processing, or
     * resolves immediatelly if not in the processing state.
     * @member {OpenSeadragon.Promise}
     * @private
     */
    this.processingPromise = $.Promise.resolve();
};

/** @lends OpenSeadragon.Tile.prototype */
$.Tile.prototype = {

    /**
     * Provides a string representation of this tiles level and (x,y)
     * components.
     * @function
     * @returns {String}
     */
    toString: function() {
        return this.level + "/" + this.x + "_" + this.y;
    },

    /**
     * The unique main cache key for this tile. Created automatically
     *  from the given tiledImage.source.getTileHashKey(...) implementation.
     * @member {String} cacheKey
     * @memberof OpenSeadragon.Tile#
     */
    get cacheKey() {
        return this._cKey;
    },
    set cacheKey(value) {
        if (value === this.cacheKey) {
            return;
        }
        const cache = this.getCache(value);
        if (!cache) {
            // It's better to first set cache, then change the key to existing one. Warn if otherwise.
            $.console.warn("[Tile.cacheKey] should not be set manually. Use addCache() with setAsMain=true.");
        }
        this._updateMainCacheKey(value);
    },

    /**
     * By default equal to tile.cacheKey, marks a cache associated with this tile
     * that holds the cache original data (it was loaded with). In case you
     * change the tile data, the tile original data should be left with the cache
     * 'originalCacheKey' and the new, modified data should be stored in cache 'cacheKey'.
     * This key is used in cache resolution: in case new tile data is requested, if
     * this cache key exists in the cache it is loaded.
     * @member {String} originalCacheKey
     * @memberof OpenSeadragon.Tile#
     */
    set originalCacheKey(value) {
        throw "Original Cache Key cannot be managed manually!";
    },
    get originalCacheKey() {
        return this._ocKey;
    },

    /**
     * The Image object for this tile.
     * @member {Object} image
     * @memberof OpenSeadragon.Tile#
     * @deprecated
     * @returns {Image}
     */
    get image() {
        $.console.error("[Tile.image] property has been deprecated. Use [Tile.getData] instead.");
        return this.getImage();
    },

    /**
     * The URL of this tile's image.
     * @member {String} url
     * @memberof OpenSeadragon.Tile#
     * @deprecated
     * @returns {String}
     */
    get url() {
        $.console.error("[Tile.url] property has been deprecated. Use [Tile.getUrl] instead.");
        return this.getUrl();
    },

    /**
     * The HTML div element for this tile
     * @member {Element} element
     * @memberof OpenSeadragon.Tile#
     * @deprecated
     */
    get element() {
        $.console.error("Tile::element property is deprecated. Use cache API instead. Moreover, this property might be unstable.");
        const cache = this.getCache();
        if (!cache || !cache.loaded) {
            return null;
        }
        if (cache.type !== OpenSeadragon.HTMLDrawer.canvasCacheType || cache.type !== OpenSeadragon.HTMLDrawer.imageCacheType) {
            $.console.error("Access to HtmlDrawer property via Tile instance: HTMLDrawer must be used!");
            return null;
        }
        return cache.data.element;
    },

    /**
     * The HTML img element for this tile.
     * @member {Element} imgElement
     * @memberof OpenSeadragon.Tile#
     * @deprecated
     */
    get imgElement() {
        $.console.error("Tile::imgElement property is deprecated. Use cache API instead. Moreover, this property might be unstable.");
        const cache = this.getCache();
        if (!cache || !cache.loaded) {
            return null;
        }
        if (cache.type !== OpenSeadragon.HTMLDrawer.canvasCacheType || cache.type !== OpenSeadragon.HTMLDrawer.imageCacheType) {
            $.console.error("Access to HtmlDrawer property via Tile instance: HTMLDrawer must be used!");
            return null;
        }
        return cache.data.imgElement;
    },

    /**
     * The alias of this.element.style.
     * @member {String} style
     * @memberof OpenSeadragon.Tile#
     * @deprecated
     */
    get style() {
        $.console.error("Tile::style property is deprecated. Use cache API instead. Moreover, this property might be unstable.");
        const cache = this.getCache();
        if (!cache || !cache.loaded) {
            return null;
        }
        if (cache.type !== OpenSeadragon.HTMLDrawer.canvasCacheType || cache.type !== OpenSeadragon.HTMLDrawer.imageCacheType) {
            $.console.error("Access to HtmlDrawer property via Tile instance: HTMLDrawer must be used!");
            return null;
        }
        return cache.data.style;
    },

    /**
     * Get the Image object for this tile.
     * @returns {?Image}
     */
    getImage: function() {
        $.console.error("[Tile.getImage] property has been deprecated. Use 'tile-invalidated' routine event instead.");
        //this method used to ensure the underlying data model conformed to given type - convert instead of getData()
        const cache = this.getCache(this.cacheKey);
        if (!cache) {
            return undefined;
        }
        cache.transformTo("image");
        return cache.data;
    },

    /**
     * Get the url string for this tile.
     * @returns {String}
     */
    getUrl: function() {
        if (typeof this._url === 'function') {
            return this._url();
        }

        return this._url;
    },

    /**
     * Get the CanvasRenderingContext2D instance for tile image data drawn
     * onto Canvas if enabled and available
     * @returns {CanvasRenderingContext2D|undefined}
     */
    getCanvasContext: function() {
        $.console.error("[Tile.getCanvasContext] property has been deprecated. Use 'tile-invalidated' routine event instead.");
        //this method used to ensure the underlying data model conformed to given type - convert instead of getData()
        const cache = this.getCache(this.cacheKey);
        if (!cache) {
            return undefined;
        }
        cache.transformTo("context2d");
        return cache.data;
    },

    /**
     * The context2D of this tile if it is provided directly by the tile source.
     * @deprecated
     * @type {CanvasRenderingContext2D}
     */
    get context2D() {
        $.console.error("[Tile.context2D] property has been deprecated. Use 'tile-invalidated' routine event instead.");
        return this.getCanvasContext();
    },

    /**
     * The context2D of this tile if it is provided directly by the tile source.
     * @deprecated
     */
    set context2D(value) {
        $.console.error("[Tile.context2D] property has been deprecated. Use 'tile-invalidated' routine event instead.");
        const cache = this._caches[this.cacheKey];
        if (cache) {
            this.removeCache(this.cacheKey);
        }
        this.addCache(this.cacheKey, value, 'context2d', true, false);
    },

    /**
     * The default cache for this tile.
     * @deprecated
     * @type OpenSeadragon.CacheRecord
     */
    get cacheImageRecord() {
        $.console.error("[Tile.cacheImageRecord] property has been deprecated. Use Tile::getCache.");
        return this.getCache(this.cacheKey);
    },

    /**
     * The default cache for this tile.
     * @deprecated
     */
    set cacheImageRecord(value) {
        $.console.error("[Tile.cacheImageRecord] property has been deprecated. Use Tile::addCache.");
        const cache = this._caches[this.cacheKey];

        if (cache) {
            this.removeCache(this.cacheKey);
        }

        if (value) {
            if (value.loaded) {
                this.addCache(this.cacheKey, value.data, value.type, true, false);
            } else {
                value.await().then(x => this.addCache(this.cacheKey, x, value.type, true, false));
            }
        }
    },

    /**
     * Cache key for main cache that is 'cache-equal', but different from original cache key
     * @return {string}
     * @private
     */
    buildDistinctMainCacheKey: function () {
        return this.cacheKey === this.originalCacheKey ? "mod://" + this.originalCacheKey : this.cacheKey;
    },

    /**
     * Read tile cache data object (CacheRecord)
     * @param {string} [key=this.cacheKey] cache key to read that belongs to this tile
     * @return {OpenSeadragon.CacheRecord}
     */
    getCache: function(key = this._cKey) {
        const cache = this._caches[key];
        if (cache) {
            cache.withTileReference(this);
        }
        return cache;
    },

    /**
     * Create tile cache for given data object.
     *
     * Using `setAsMain` updates also main tile cache key - the main cache key used to draw this tile.
     * In that case, the cache should be ready to be rendered immediatelly (converted to one of the supported formats
     * of the currently employed drawer).
     *
     * NOTE: if the existing cache already exists,
     * data parameter is ignored and inherited from the existing cache object.
     * WARNING: if you override main tile cache key to point to a different cache, the invalidation routine
     * will no longer work. If you need to modify tile main data, prefer to use invalidation routine instead.
     *
     * @param {string} key cache key, if unique, new cache object is created, else existing cache attached
     * @param {*} data this data will be IGNORED if cache already exists; therefore if
     *   `typeof data === 'function'` holds (both async and normal functions), the data is called to obtain
     *   the data item: this is an optimization to load data only when necessary.
     * @param {string} [type=undefined] data type, will be guessed if not provided (not recommended),
     *   if data is a callback the type is a mandatory field, not setting it results in undefined behaviour
     * @param {boolean} [setAsMain=false] if true, the key will be set as the tile.cacheKey,
     *   no effect if key === this.cacheKey
     * @param [_safely=true] private
     * @returns {OpenSeadragon.CacheRecord|null} - The cache record the tile was attached to.
     */
    addCache: function(key, data, type = undefined, setAsMain = false, _safely = true) {
        const tiledImage = this.tiledImage;
        if (!tiledImage) {
            return null; //async can access outside its lifetime
        }

        if (!type) {
            if (!this.__typeWarningReported) {
                $.console.warn(this, "[Tile.addCache] called without type specification. " +
                    "Automated deduction is potentially unsafe: prefer specification of data type explicitly.");
                this.__typeWarningReported = true;
            }
            if (typeof data === 'function') {
                $.console.error("[TileCache.cacheTile] options.data as a callback requires type argument! Current is " + type);
            }
            type = $.convertor.guessType(data);
        }

        const overwritesMainCache = key === this.cacheKey;
        if (_safely && (overwritesMainCache || setAsMain)) {
            // Need to get the supported type for rendering out of the active drawer.
            const supportedTypes = tiledImage.viewer.drawer.getSupportedDataFormats();
            const conversion = $.convertor.getConversionPath(type, supportedTypes);
            $.console.assert(conversion, "[Tile.addCache] data was set for the default tile cache we are unable" +
                `to render. Make sure OpenSeadragon.convertor was taught to convert ${type} to (one of): ${conversion.toString()}`);
        }

        const cachedItem = tiledImage._tileCache.cacheTile({
            data: data,
            dataType: type,
            tile: this,
            cacheKey: key,
            cutoff: tiledImage.source.getClosestLevel(),
        });
        const havingRecord = this._caches[key];
        if (havingRecord !== cachedItem) {
            this._caches[key] = cachedItem;
            if (havingRecord) {
                havingRecord.removeTile(this);
                tiledImage._tileCache.safeUnloadCache(havingRecord);
            }
        }

        // Update cache key if differs and main requested
        if (!overwritesMainCache && setAsMain) {
            this._updateMainCacheKey(key);
        }
        return cachedItem;
    },


    /**
     * Add cache object to the tile
     *
     * @param {string} key cache key, if unique, new cache object is created, else existing cache attached
     * @param {OpenSeadragon.CacheRecord} cache the cache object to attach to this tile
     * @param {boolean} [setAsMain=false] if true, the key will be set as the tile.cacheKey,
     *   no effect if key === this.cacheKey
     * @param [_safely=true] private
     * @returns {OpenSeadragon.CacheRecord|null} - Returns cache parameter reference if attached.
     */
    setCache(key, cache, setAsMain = false, _safely = true) {
        const tiledImage = this.tiledImage;
        if (!tiledImage) {
            return null; //async can access outside its lifetime
        }

        const overwritesMainCache = key === this.cacheKey;
        if (_safely) {
            $.console.assert(cache instanceof $.CacheRecord, "[Tile.setCache] cache must be a CacheRecord object!");
            if (overwritesMainCache || setAsMain) {
                // Need to get the supported type for rendering out of the active drawer.
                const supportedTypes = tiledImage.viewer.drawer.getSupportedDataFormats();
                const conversion = $.convertor.getConversionPath(cache.type, supportedTypes);
                $.console.assert(conversion, "[Tile.setCache] data was set for the default tile cache we are unable" +
                    `to render. Make sure OpenSeadragon.convertor was taught to convert ${cache.type} to (one of): ${conversion.toString()}`);
            }
        }

        const havingRecord = this._caches[key];
        if (havingRecord !== cache) {
            this._caches[key] = cache;
            cache.addTile(this);  // keep reference bidirectional
            if (havingRecord) {
                havingRecord.removeTile(this);
                tiledImage._tileCache.safeUnloadCache(havingRecord);
            }
        }

        // Update cache key if differs and main requested
        if (!overwritesMainCache && setAsMain) {
            this._updateMainCacheKey(key);
        }
        return cache;
    },

    /**
     * Sets the main cache key for this tile and
     * performs necessary updates
     * @param value
     * @private
     */
    _updateMainCacheKey: function(value) {
        let ref = this._caches[this._cKey];
        if (ref) {
            // make sure we free drawer internal cache if people change cache key externally
            ref.destroyInternalCache();
        }
        this._cKey = value;
    },

    /**
     * Get the number of caches available to this tile
     * @returns {number} number of caches
     */
    getCacheSize: function() {
        return Object.values(this._caches).length;
    },

    /**
     * Free tile cache. Removes by default the cache record if no other tile uses it.
     * @param {string} key cache key, required
     * @param {boolean} [freeIfUnused=true] set to false if zombie should be created
     * @return {OpenSeadragon.CacheRecord|undefined} reference to the cache record if it was removed,
     *   undefined if removal was refused to perform (e.g. does not exist, it is an original data target etc.)
     */
    removeCache: function(key, freeIfUnused = true) {
        const deleteTarget = this._caches[key];
        if (!deleteTarget) {
            // try to erase anyway in case the cache got stuck in memory
            this.tiledImage._tileCache.unloadCacheForTile(this, key, freeIfUnused, true);
            return undefined;
        }

        const currentMainKey = this.cacheKey,
            originalDataKey = this.originalCacheKey,
            sameBuiltinKeys = currentMainKey === originalDataKey;

        if (!sameBuiltinKeys && originalDataKey === key) {
            $.console.warn("[Tile.removeCache] original data must not be manually deleted: other parts of the code might rely on it!",
                "If you want the tile not to preserve the original data, toggle of data perseverance in tile.setData().");
            return undefined;
        }

        if (currentMainKey === key) {
            if (!sameBuiltinKeys && this._caches[originalDataKey]) {
                // if we have original data let's revert back
                this._updateMainCacheKey(originalDataKey);
            } else {
                $.console.warn("[Tile.removeCache] trying to remove the only cache that can be used to draw the tile!",
                    "If you want to remove the main cache, first set different cache as main with tile.addCache()");
                return undefined;
            }
        }
        if (this.tiledImage._tileCache.unloadCacheForTile(this, key, freeIfUnused, false)) {
            //if we managed to free tile from record, we are sure we decreased cache count
            delete this._caches[key];
        }
        return deleteTarget;
    },

    /**
     * Get the ratio between current and original size.
     * @function
     * @deprecated
     * @returns {number}
     */
    getScaleForEdgeSmoothing: function() {
        // getCanvasContext is deprecated and so should be this method.
        $.console.warn("[Tile.getScaleForEdgeSmoothing] is deprecated, the following error is the consequence:");
        const context = this.getCanvasContext();
        if (!context) {
            $.console.warn(
                '[Tile.drawCanvas] attempting to get tile scale %s when tile\'s not cached',
                this.toString());
            return 1;
        }
        return context.canvas.width / (this.size.x * $.pixelDensityRatio);
    },

    /**
     * Get a translation vector that when applied to the tile position produces integer coordinates.
     * Needed to avoid swimming and twitching.
     * @function
     * @param {Number} [scale=1] - Scale to be applied to position.
     * @returns {OpenSeadragon.Point}
     */
    getTranslationForEdgeSmoothing: function(scale, canvasSize, sketchCanvasSize) {
        // The translation vector must have positive values, otherwise the image goes a bit off
        // the sketch canvas to the top and left and we must use negative coordinates to repaint it
        // to the main canvas. In that case, some browsers throw:
        // INDEX_SIZE_ERR: DOM Exception 1: Index or size was negative, or greater than the allowed value.
        const x = Math.max(1, Math.ceil((sketchCanvasSize.x - canvasSize.x) / 2));
        const y = Math.max(1, Math.ceil((sketchCanvasSize.y - canvasSize.y) / 2));
        return new $.Point(x, y).minus(
            this.position
                .times($.pixelDensityRatio)
                .times(scale || 1)
                .apply(function(x) {
                    return x % 1;
                })
        );
    },

    /**
     * Reflect that a cache object was renamed. Called internally from TileCache.
     * Do NOT call manually.
     * @function
     * @private
     */
    reflectCacheRenamed: function (oldKey, newKey) {
        let cache = this._caches[oldKey];
        if (!cache) {
            return;  // nothing to fix
        }
        // Do update via private refs, old key no longer exists in cache
        if (oldKey === this._ocKey) {
            this._ocKey = newKey;
        }
        if (oldKey === this._cKey) {
            this._cKey = newKey;
        }
        // Working key is never updated, it will be invalidated (but do not dereference cache, just fix the pointers)
        this._caches[newKey] = cache;
        delete this._caches[oldKey];
    },

    /**
     * Check if two tiles are data-equal
     * @param {OpenSeadragon.Tile} tile
     */
    equals(tile) {
         return this._ocKey === tile._ocKey;
    },

    /**
     * Removes tile from the system: it will still be present in the
     * OSD memory, but marked as loaded=false, and its data will be erased.
     * @param {boolean} [erase=false]
     */
    unload: function(erase = false) {
        if (!this.loaded) {
            return;
        }
        this.tiledImage._tileCache.unloadTile(this, erase);
    },

    /**
     * this method shall be called only by cache system when the tile is already empty of data
     * @private
     */
    _unload: function () {
        this.tiledImage = null;
        this._caches    = {};
        this._cacheSize = 0;
        this.loaded     = false;
        this.loading    = false;
        this._cKey      = this._ocKey;
    }
};

}( OpenSeadragon ));
