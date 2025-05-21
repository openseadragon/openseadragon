/*
 * OpenSeadragon - TileSource
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
 * @class TileSource
 * @classdesc The TileSource contains the most basic implementation required to create a
 * smooth transition between layers in an image pyramid. It has only a single key
 * interface that must be implemented to complete its key functionality:
 * 'getTileUrl'.  It also has several optional interfaces that can be
 * implemented if a new TileSource wishes to support configuration via a simple
 * object or array ('configure') and if the tile source supports or requires
 * configuration via retrieval of a document on the network ala AJAX or JSONP,
 * ('getImageInfo').
 * <br/>
 * By default the image pyramid is split into N layers where the image's longest
 * side in M (in pixels), where N is the smallest integer which satisfies
 *      <strong>2^(N+1) >= M</strong>.
 *
 * @memberof OpenSeadragon
 * @extends OpenSeadragon.EventSource
 * @param {Object} options
 *      You can either specify a URL, or literally define the TileSource (by specifying
 *      width, height, tileSize, tileOverlap, minLevel, and maxLevel). For the former,
 *      the extending class is expected to implement 'supports' and 'configure'.
 *      Note that _in this case, the child class of getImageInfo() is ignored!_
 *      For the latter, the construction is assumed to occur through
 *      the extending classes implementation of 'configure'.
 * @param {String} [options.url]
 *      The URL for the data necessary for this TileSource.
 * @param {String} [options.referenceStripThumbnailUrl]
 *      The URL for a thumbnail image to be used by the reference strip
 * @param {Function} [options.success]
 *      A function to be called upon successful creation.
 * @param {Boolean} [options.ajaxWithCredentials]
 *      If this TileSource needs to make an AJAX call, this specifies whether to set
 *      the XHR's withCredentials (for accessing secure data).
 * @param {Object} [options.ajaxHeaders]
 *      A set of headers to include in AJAX requests.
 * @param {Boolean} [options.splitHashDataForPost]
 *      First occurrence of '#' in the options.url is used to split URL
 *      and the latter part is treated as POST data (applies to getImageInfo(...))
 *      Does not work if getImageInfo() is overridden and used (see the options description)
 * @param {Number} [options.width]
 *      Width of the source image at max resolution in pixels.
 * @param {Number} [options.height]
 *      Height of the source image at max resolution in pixels.
 * @param {Number} [options.tileSize]
 *      The size of the tiles to assumed to make up each pyramid layer in pixels.
 *      Tile size determines the point at which the image pyramid must be
 *      divided into a matrix of smaller images.
 *      Use options.tileWidth and options.tileHeight to support non-square tiles.
 * @param {Number} [options.tileWidth]
 *      The width of the tiles to assumed to make up each pyramid layer in pixels.
 * @param {Number} [options.tileHeight]
 *      The height of the tiles to assumed to make up each pyramid layer in pixels.
 * @param {Number} [options.tileOverlap]
 *      The number of pixels each tile is expected to overlap touching tiles.
 * @param {Number} [options.minLevel]
 *      The minimum level to attempt to load.
 * @param {Number} [options.maxLevel]
 *      The maximum level to attempt to load.
 */
$.TileSource = function( width, height, tileSize, tileOverlap, minLevel, maxLevel ) {
    var _this = this;

    var args = arguments,
        options,
        i;

    if( $.isPlainObject( width ) ){
        options = width;
    }else{
        options = {
            width: args[0],
            height: args[1],
            tileSize: args[2],
            tileOverlap: args[3],
            minLevel: args[4],
            maxLevel: args[5]
        };
    }

    //Tile sources supply some events, namely 'ready' when they must be configured
    //by asynchronously fetching their configuration data.
    $.EventSource.call( this );

    //we allow options to override anything we don't treat as
    //required via idiomatic options or which is functionally
    //set depending on the state of the readiness of this tile
    //source
    $.extend( true, this, options );

    if (!this.success) {
        //Any functions that are passed as arguments are bound to the ready callback
        for ( i = 0; i < arguments.length; i++ ) {
            if ( $.isFunction( arguments[ i ] ) ) {
                this.success = arguments[ i ];
                //only one callback per constructor
                break;
            }
        }
    }

    if (this.success) {
        this.addHandler( 'ready', function ( event ) {
            _this.success( event );
        } );
    }

    /**
     * Retrieve context2D of this tile source
     * @memberOf OpenSeadragon.TileSource
     * @function getContext2D
     */

    /**
     * Ratio of width to height
     * @member {Number} aspectRatio
     * @memberof OpenSeadragon.TileSource#
     */
    /**
     * Vector storing x and y dimensions ( width and height respectively ).
     * @member {OpenSeadragon.Point} dimensions
     * @memberof OpenSeadragon.TileSource#
     */
    /**
     * The overlap in pixels each tile shares with its adjacent neighbors.
     * @member {Number} tileOverlap
     * @memberof OpenSeadragon.TileSource#
     */
    /**
     * The minimum pyramid level this tile source supports or should attempt to load.
     * @member {Number} minLevel
     * @memberof OpenSeadragon.TileSource#
     */
    /**
     * The maximum pyramid level this tile source supports or should attempt to load.
     * @member {Number} maxLevel
     * @memberof OpenSeadragon.TileSource#
     */
    /**
     *
     * @member {Boolean} ready
     * @memberof OpenSeadragon.TileSource#
     */

    // TODO potentially buggy behavior: what if .url is used by child class before it calls super constructor?
    //  this can happen if old JS class definition is used
    if( 'string' === $.type( arguments[ 0 ] ) ){
        this.url = arguments[0];
    }

    if (this.url) {
        //in case the getImageInfo method is overridden and/or implies an
        //async mechanism set some safe defaults first
        this.aspectRatio = 1;
        this.dimensions  = new $.Point( 10, 10 );
        this._tileWidth  = 0;
        this._tileHeight = 0;
        this.tileOverlap = 0;
        this.minLevel    = 0;
        this.maxLevel    = 0;
        this.ready       = false;
        //configuration via url implies the extending class
        //implements and 'configure'
        this.getImageInfo( this.url );

    } else {

        //explicit configuration via positional args in constructor
        //or the more idiomatic 'options' object
        this.ready       = true;
        this.aspectRatio = (options.width && options.height) ?
            (options.width / options.height) : 1;
        this.dimensions  = new $.Point( options.width, options.height );

        if ( this.tileSize ){
            this._tileWidth = this._tileHeight = this.tileSize;
            delete this.tileSize;
        } else {
            if( this.tileWidth ){
                // We were passed tileWidth in options, but we want to rename it
                // with a leading underscore to make clear that it is not safe to directly modify it
                this._tileWidth = this.tileWidth;
                delete this.tileWidth;
            } else {
                this._tileWidth = 0;
            }

            if( this.tileHeight ){
                // See note above about renaming this.tileWidth
                this._tileHeight = this.tileHeight;
                delete this.tileHeight;
            } else {
                this._tileHeight = 0;
            }
        }

        this.tileOverlap = options.tileOverlap ? options.tileOverlap : 0;
        this.minLevel    = options.minLevel ? options.minLevel : 0;
        this.maxLevel    = ( undefined !== options.maxLevel && null !== options.maxLevel ) ?
            options.maxLevel : (
                ( options.width && options.height ) ? Math.ceil(
                    Math.log( Math.max( options.width, options.height ) ) /
                    Math.log( 2 )
                ) : 0
            );
        if( this.success && $.isFunction( this.success ) ){
            this.success( this );
        }
    }


};

/** @lends OpenSeadragon.TileSource.prototype */
$.TileSource.prototype = {

    getTileSize: function( level ) {
        $.console.error(
            "[TileSource.getTileSize] is deprecated. " +
            "Use TileSource.getTileWidth() and TileSource.getTileHeight() instead"
        );
        return this._tileWidth;
    },

    /**
     * Return the tileWidth for a given level.
     * Subclasses should override this if tileWidth can be different at different levels
     *   such as in IIIFTileSource.  Code should use this function rather than reading
     *   from ._tileWidth directly.
     * @function
     * @param {Number} level
     */
    getTileWidth: function( level ) {
        if (!this._tileWidth) {
            return this.getTileSize(level);
        }
        return this._tileWidth;
    },

    /**
     * Return the tileHeight for a given level.
     * Subclasses should override this if tileHeight can be different at different levels
     *   such as in IIIFTileSource.  Code should use this function rather than reading
     *   from ._tileHeight directly.
     * @function
     * @param {Number} level
     */
    getTileHeight: function( level ) {
        if (!this._tileHeight) {
            return this.getTileSize(level);
        }
        return this._tileHeight;
    },

    /**
     * Set the maxLevel to the given level, and perform the memoization of
     * getLevelScale with the new maxLevel. This function can be useful if the
     * memoization is required before the first call of getLevelScale, or both
     * memoized getLevelScale and maxLevel should be changed accordingly.
     * @function
     * @param {Number} level
     */
    setMaxLevel: function( level ) {
        this.maxLevel = level;
        this._memoizeLevelScale();
    },

    /**
     * @function
     * @param {Number} level
     */
    getLevelScale: function( level ) {
        // if getLevelScale is not memoized, we generate the memoized version
        // at the first call and return the result
        this._memoizeLevelScale();
        return this.getLevelScale( level );
    },

    // private
    _memoizeLevelScale: function() {
        // see https://github.com/openseadragon/openseadragon/issues/22
        // we use the tilesources implementation of getLevelScale to generate
        // a memoized re-implementation
        var levelScaleCache = {},
            i;
        for( i = 0; i <= this.maxLevel; i++ ){
            levelScaleCache[ i ] = 1 / Math.pow(2, this.maxLevel - i);
        }
        this.getLevelScale = function( _level ){
            return levelScaleCache[ _level ];
        };
    },

    /**
     * @function
     * @param {Number} level
     */
    getNumTiles: function( level ) {
        var scale = this.getLevelScale( level ),
            x = Math.ceil( scale * this.dimensions.x / this.getTileWidth(level) ),
            y = Math.ceil( scale * this.dimensions.y / this.getTileHeight(level) );

        return new $.Point( x, y );
    },

    /**
     * @function
     * @param {Number} level
     */
    getPixelRatio: function( level ) {
        var imageSizeScaled = this.dimensions.times( this.getLevelScale( level ) ),
            rx = 1.0 / imageSizeScaled.x * $.pixelDensityRatio,
            ry = 1.0 / imageSizeScaled.y * $.pixelDensityRatio;

        return new $.Point(rx, ry);
    },


    /**
     * @function
     * @returns {Number} The highest level in this tile source that can be contained in a single tile.
     */
    getClosestLevel: function() {
        var i,
            tiles;

        for (i = this.minLevel + 1; i <= this.maxLevel; i++){
            tiles = this.getNumTiles(i);
            if (tiles.x > 1 || tiles.y > 1) {
                break;
            }
        }

        return i - 1;
    },

    /**
     * @function
     * @param {Number} level
     * @param {OpenSeadragon.Point} point
     */
    getTileAtPoint: function(level, point) {
        var validPoint = point.x >= 0 && point.x <= 1 &&
            point.y >= 0 && point.y <= 1 / this.aspectRatio;
        $.console.assert(validPoint, "[TileSource.getTileAtPoint] must be called with a valid point.");


        var widthScaled = this.dimensions.x * this.getLevelScale(level);
        var pixelX = point.x * widthScaled;
        var pixelY = point.y * widthScaled;

        var x = Math.floor(pixelX / this.getTileWidth(level));
        var y = Math.floor(pixelY / this.getTileHeight(level));

        // When point.x == 1 or point.y == 1 / this.aspectRatio we want to
        // return the last tile of the row/column
        if (point.x >= 1) {
            x = this.getNumTiles(level).x - 1;
        }
        var EPSILON = 1e-15;
        if (point.y >= 1 / this.aspectRatio - EPSILON) {
            y = this.getNumTiles(level).y - 1;
        }

        return new $.Point(x, y);
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

        if (isSource) {
            return new $.Rect(0, 0, sx, sy);
        }

        return new $.Rect( px * scale, py * scale, sx * scale, sy * scale );
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
     * @throws {Error}
     */
    getImageInfo: function( url ) {
        var _this = this,
            callbackName,
            callback,
            readySource,
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

        callback = function( data ){
            if( typeof (data) === "string" ) {
                data = $.parseXml( data );
            }
            var $TileSource = $.TileSource.determineType( _this, data, url );
            if ( !$TileSource ) {
                /**
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
                _this.raiseEvent( 'open-failed', { message: "Unable to load TileSource", source: url } );
                return;
            }

            options = $TileSource.prototype.configure.apply( _this, [ data, url, postData ]);
            if (options.ajaxWithCredentials === undefined) {
                options.ajaxWithCredentials = _this.ajaxWithCredentials;
            }

            readySource = new $TileSource( options );
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
            _this.raiseEvent( 'ready', { tileSource: readySource } );
        };

        if( url.match(/\.js$/) ){
            //TODO: Its not very flexible to require tile sources to end jsonp
            //      request for info  with a url that ends with '.js' but for
            //      now it's the only way I see to distinguish uniformly.
            callbackName = url.split('/').pop().replace('.js', '');
            $.jsonp({
                url: url,
                async: false,
                callbackName: callbackName,
                callback: callback
            });
        } else {
            // request info via xhr asynchronously.
            $.makeAjaxRequest( {
                url: url,
                postData: postData,
                withCredentials: this.ajaxWithCredentials,
                headers: this.ajaxHeaders,
                success: function( xhr ) {
                    var data = processResponse( xhr );
                    callback( data );
                },
                error: function ( xhr, exc ) {
                    var msg;

                    /*
                        IE < 10 will block XHR requests to different origins. Any property access on the request
                        object will raise an exception which we'll attempt to handle by formatting the original
                        exception rather than the second one raised when we try to access xhr.status
                     */
                    try {
                        msg = "HTTP " + xhr.status + " attempting to load TileSource: " + url;
                    } catch ( e ) {
                        var formattedExc;
                        if ( typeof ( exc ) === "undefined" || !exc.toString ) {
                            formattedExc = "Unknown error";
                        } else {
                            formattedExc = exc.toString();
                        }

                        msg = formattedExc + " attempting to load TileSource: " + url;
                    }

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
        }

    },

    /**
     * Responsible for determining if the particular TileSource supports the
     * data format ( and allowed to apply logic against the url the data was
     * loaded from, if any ). Overriding implementations are expected to do
     * something smart with data and / or url to determine support.  Also
     * understand that iteration order of TileSources is not guaranteed so
     * please make sure your data or url is expressive enough to ensure a simple
     * and sufficient mechanism for clear determination.
     * @function
     * @param {String|Object|Array|Document} data
     * @param {String} url - the url the data was loaded
     *      from if any.
     * @returns {Boolean}
     */
    supports: function( data, url ) {
        return false;
    },

    /**
     * Check whether two tileSources are equal. This is used for example
     * when replacing tile-sources, which turns on the zombie cache before
     * old item removal.
     * @param {OpenSeadragon.TileSource} otherSource
     * @returns {Boolean}
     */
    equals: function (otherSource) {
        return false;
    },

    /**
     * Responsible for parsing and configuring the
     * image metadata pertinent to this TileSources implementation.
     * This method is not implemented by this class other than to throw an Error
     * announcing you have to implement it.  Because of the variety of tile
     * server technologies, and various specifications for building image
     * pyramids, this method is here to allow easy integration.
     * @function
     * @param {String|Object|Array|Document} data
     * @param {String} url - the url the data was loaded
     *      from if any.
     * @param {String} postData - HTTP POST data in k=v&k2=v2... form or null value obtained from
     *      the protocol URL after '#' sign if flag splitHashDataForPost set to 'true'
     * @returns {Object} options - A dictionary of keyword arguments sufficient
     *      to configure the tile source constructor (include all values you want to
     *      instantiate the TileSource subclass with - what _options_ object should contain).
     * @throws {Error}
     */
    configure: function( data, url, postData ) {
        throw new Error( "Method not implemented." );
    },

    /**
     * Shall this source need to free some objects
     * upon unloading, it must be done here. For example, canvas
     * size must be set to 0 for safari to free.
     * @param {OpenSeadragon.Viewer} viewer
     */
    destroy: function ( viewer ) {
        //no-op
    },

    /**
     * Responsible for retrieving the url which will return an image for the
     * region specified by the given x, y, and level components.
     * This method is not implemented by this class other than to throw an Error
     * announcing you have to implement it.  Because of the variety of tile
     * server technologies, and various specifications for building image
     * pyramids, this method is here to allow easy integration.
     * @function
     * @param {Number} level
     * @param {Number} x
     * @param {Number} y
     * @returns {String|Function} url - A string for the url or a function that returns a url string.
     * @throws {Error}
     */
    getTileUrl: function( level, x, y ) {
        throw new Error( "Method not implemented." );
    },

    /**
     * Must use AJAX in order to work, i.e. loadTilesWithAjax = true is set.
     * If a value is returned, ajax issues POST request to the tile url.
     * If null is returned, ajax issues GET request.
     * The return value must comply to the header 'content type'.
     *
     * Examples (USED HEADER --> getTilePostData CODE):
     * 'Content-type': 'application/x-www-form-urlencoded' -->
     *   return "key1=value=1&key2=value2";
     *
     * 'Content-type': 'application/x-www-form-urlencoded' -->
     *   return JSON.stringify({key: "value", number: 5});
     *
     * 'Content-type': 'multipart/form-data' -->
     *   let result = new FormData();
     *   result.append("data", myData);
     *   return result;
     *
     * IMPORTANT: in case you move all the logic on image fetching
     * to post data, you must re-define 'getTileHashKey(...)' to
     * stay unique for different tile images.
     *
     * @param {Number} level
     * @param {Number} x
     * @param {Number} y
     * @returns {*|null} post data to send with tile configuration request
     */
    getTilePostData: function( level, x, y ) {
        return null;
    },

    /**
     * Responsible for retrieving the headers which will be attached to the image request for the
     * region specified by the given x, y, and level components.
     * This option is only relevant if {@link OpenSeadragon.Options}.loadTilesWithAjax is set to true.
     * The headers returned here will override headers specified at the Viewer or TiledImage level.
     * Specifying a falsy value for a header will clear its existing value set at the Viewer or
     * TiledImage level (if any).
     *
     * Note that the headers of existing tiles don't automatically change when this function
     * returns updated headers. To do that, you need to call {@link OpenSeadragon.Viewer#setAjaxHeaders}
     * and propagate the changes.
     *
     * @function
     * @param {Number} level
     * @param {Number} x
     * @param {Number} y
     * @returns {Object}
     */
    getTileAjaxHeaders: function( level, x, y ) {
        return {};
    },

    /**
     * The tile cache object is uniquely determined by this key and used to lookup
     * the image data in cache: keys should be different if images are different.
     *
     * You can return falsey tile cache key, in which case the tile will
     * be created without invoking ImageJob --- but with data=null. Then,
     * you are responsible for manually creating the cache data. This is useful
     * particularly if you want to use empty TiledImage with client-side derived data
     * only. The default tile-cache key is then called "" - an empty string.
     *
     * Note: default behaviour does not take into account post data.
     * @param {Number} level tile level it was fetched with
     * @param {Number} x x-coordinate in the pyramid level
     * @param {Number} y y-coordinate in the pyramid level
     * @param {String} url the tile was fetched with
     * @param {Object} ajaxHeaders the tile was fetched with
     * @param {*} postData data the tile was fetched with (type depends on getTilePostData(..) return type)
     * @return {?String} can return the cache key or null, in that case an empty cache is initialized
     *   without downloading any data for internal use: user has to define the cache contents manually, via
     *   the cache interface of this class.
     */
    getTileHashKey: function(level, x, y, url, ajaxHeaders, postData) {
        function withHeaders(hash) {
            return ajaxHeaders ? hash + "+" + JSON.stringify(ajaxHeaders) : hash;
        }

        if (typeof url !== "string") {
            return withHeaders(level + "/" + x + "_" + y);
        }
        return withHeaders(url);
    },

    /**
     * @function
     * @param {Number} level
     * @param {Number} x
     * @param {Number} y
     */
    tileExists: function( level, x, y ) {
        var numTiles = this.getNumTiles( level );
        return level >= this.minLevel &&
               level <= this.maxLevel &&
               x >= 0 &&
               y >= 0 &&
               x < numTiles.x &&
               y < numTiles.y;
    },

    /**
     * Decide whether tiles have transparency: this is crucial for correct images blending.
     * Overriden on a tile level by setting tile.hasTransparency = true;
     * @param context2D unused, deprecated argument
     * @param url tile.getUrl() value for given tile
     * @param ajaxHeaders tile.ajaxHeaders value for given tile
     * @param post tile.post value for given tile
     * @returns {boolean} true if the image has transparency
     */
    hasTransparency: function(context2D, url, ajaxHeaders, post) {
        return url.match('.png');
    },

    /**
     * Download tile data.
     * Note that if you override this function, you should override also downloadTileAbort().
     * @param {ImageJob} context job context that you have to call finish(...) on.
     * @param {String} [context.src] - URL of image to download.
     * @param {String} [context.loadWithAjax] - Whether to load this image with AJAX.
     * @param {String} [context.ajaxHeaders] - Headers to add to the image request if using AJAX.
     * @param {Boolean} [context.ajaxWithCredentials] - Whether to set withCredentials on AJAX requests.
     * @param {String} [context.crossOriginPolicy] - CORS policy to use for downloads
     * @param {?String|?Object} [context.postData] - HTTP POST data (usually but not necessarily
     *   in k=v&k2=v2... form, see TileSource::getTilePostData) or null
     * @param {*} [context.userData] - Empty object to attach your own data and helper variables to.
     * @param {Function} [context.finish] - Should be called unless abort() was executed upon successful
     *   data retrieval.
     *   Usage: context.finish(data, request, dataType=undefined). Pass the downloaded data object
     *   add also reference to an ajax request if used. Optionally, specify what data type the data is.
     * @param {Function} [context.fail] - Should be called unless abort() was executed upon unsuccessful request.
     *   Usage: context.fail(errMessage, request). Provide error message in case of failure,
     *   add also reference to an ajax request if used.
     * @param {Function} [context.abort] - Called automatically when the job times out.
     *   Usage: if you decide to abort the request (no fail/finish will be called), call context.abort().
     * @param {Function} [context.callback] Private parameter. Called automatically once image has been downloaded
     *   (triggered by finish).
     * @param {Number} [context.timeout] Private parameter. The max number of milliseconds that
     *   this image job may take to complete.
     * @param {string} [context.errorMsg] Private parameter. The final error message, default null (set by finish).
     */
    downloadTileStart: function (context) {
        const dataStore = context.userData,
            image = new Image();

        dataStore.image = image;
        dataStore.request = null;

        const finalize = function(error) {
            if (error || !image) {
                context.fail(error || "[downloadTileStart] Image load failed: undefined Image instance.",
                    dataStore.request);
                return;
            }
            image.onload = image.onerror = image.onabort = null;
            context.finish(image, dataStore.request, "image");
        };
        image.onload = function () {
            finalize();
        };
        image.onabort = image.onerror = function() {
            finalize("[downloadTileStart] Image load aborted.");
        };

        // Load the tile with an AJAX request if the loadWithAjax option is
        // set. Otherwise load the image by setting the source property of the image object.
        if (context.loadWithAjax) {
            dataStore.request = $.makeAjaxRequest({
                url: context.src,
                withCredentials: context.ajaxWithCredentials,
                headers: context.ajaxHeaders,
                responseType: "arraybuffer",
                postData: context.postData,
                success: function(request) {
                    var blb;
                    // Make the raw data into a blob.
                    // BlobBuilder fallback adapted from
                    // http://stackoverflow.com/questions/15293694/blob-constructor-browser-compatibility
                    try {
                        blb = new window.Blob([request.response]);
                    } catch (e) {
                        const BlobBuilder = (
                            window.BlobBuilder ||
                            window.WebKitBlobBuilder ||
                            window.MozBlobBuilder ||
                            window.MSBlobBuilder
                        );
                        if (e.name === 'TypeError' && BlobBuilder) {
                            const bb = new BlobBuilder();
                            bb.append(request.response);
                            blb = bb.getBlob();
                        }
                    }
                    // If the blob is empty for some reason consider the image load a failure.
                    if (blb.size === 0) {
                        finalize("[downloadTileStart] Empty image response.");
                    } else {
                        // Create a URL for the blob data and make it the source of the image object.
                        // This will still trigger Image.onload to indicate a successful tile load.
                        image.src = (window.URL || window.webkitURL).createObjectURL(blb);
                    }
                },
                error: function(request) {
                    finalize("[downloadTileStart] Image load aborted - XHR error");
                }
            });
        } else {
            if (context.crossOriginPolicy !== false) {
                image.crossOrigin = context.crossOriginPolicy;
            }
            image.src = context.src;
        }
    },

    /**
     * Provide means of aborting the execution.
     * Note that if you override this function, you should override also downloadTileStart().
     * Note that calling job.abort() would create an infinite loop!
     *
     * @param {ImageJob} context job, the same object as with downloadTileStart(..)
     * @param {*} [context.userData] - Empty object to attach (and mainly read) your own data.
     */
    downloadTileAbort: function (context) {
        if (context.userData.request) {
            context.userData.request.abort();
        }
        var image = context.userData.image;
        if (context.userData.image) {
            image.onload = image.onerror = image.onabort = null;
        }
    },

    /**
     * Create cache object from the result of the download process. The
     * cacheObject parameter should be used to attach the data to, there are no
     * conventions on how it should be stored - all the logic is implemented within *TileCache() functions.
     *
     * Note that
     *  - data is cached automatically as cacheObject.data
     *  - if you override any of *TileCache() functions, you should override all of them.
     *  - these functions might be called over shared cache object managed by other TileSources simultaneously.
     * @param {OpenSeadragon.CacheRecord} cacheObject context cache object
     * @param {*} data image data, the data sent to ImageJob.prototype.finish(), by default an Image object
     * @param {OpenSeadragon.Tile} tile instance the cache was created with
     * @deprecated
     */
    createTileCache: function(cacheObject, data, tile) {
        $.console.error("[TileSource.createTileCache] has been deprecated. Use cache API of a tile instead.");
        //no-op, we create the cache automatically
    },

    /**
     * Cache object destructor, unset all properties you created to allow GC collection.
     * Note that if you override any of *TileCache() functions, you should override all of them.
     * Note that these functions might be called over shared cache object managed by other TileSources simultaneously.
     * Original cache data is cacheObject.data, but do not delete it manually! It is taken care for,
     * you might break things.
     * @param {OpenSeadragon.CacheRecord} cacheObject context cache object
     * @deprecated
     */
    destroyTileCache: function (cacheObject) {
        $.console.error("[TileSource.destroyTileCache] has been deprecated. Use cache API of a tile instead.");
        //no-op, handled internally
    },

    /**
     * Raw data getter, should return anything that is compatible with the system, or undefined
     * if the system can handle it.
     * @param {OpenSeadragon.CacheRecord} cacheObject context cache object
     * @returns {OpenSeadragon.Promise<?>} cache data
     * @deprecated
     */
    getTileCacheData: function(cacheObject) {
        $.console.error("[TileSource.getTileCacheData] has been deprecated. Use cache API of a tile instead.");
        return cacheObject.getDataAs(undefined, false);
    },

    /**
     * Compatibility image element getter
     *  - plugins might need image representation of the data
     *  - div HTML rendering relies on image element presence
     * Note that if you override any of *TileCache() functions, you should override all of them.
     * Note that these functions might be called over shared cache object managed by other TileSources simultaneously.
     *  @param {OpenSeadragon.CacheRecord} cacheObject context cache object
     *  @returns {Image} cache data as an Image
     *  @deprecated
     */
    getTileCacheDataAsImage: function(cacheObject) {
        $.console.error("[TileSource.getTileCacheDataAsImage] has been deprecated. Use cache API of a tile instead.");
        return cacheObject.getImage();
    },

    /**
     * Compatibility context 2D getter
     *  - most heavily used rendering method is a canvas-based approach,
     *    convert the data to a canvas and return it's 2D context
     * Note that if you override any of *TileCache() functions, you should override all of them.
     * @param {OpenSeadragon.CacheRecord} cacheObject context cache object
     * @returns {CanvasRenderingContext2D} context of the canvas representation of the cache data
     * @deprecated
     */
    getTileCacheDataAsContext2D: function(cacheObject) {
        $.console.error("[TileSource.getTileCacheDataAsContext2D] has been deprecated. Use cache API of a tile instead.");
        return cacheObject.getRenderedContext();
    }
};


$.extend( true, $.TileSource.prototype, $.EventSource.prototype );


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


/**
 * Determines the TileSource Implementation by introspection of OpenSeadragon
 * namespace, calling each TileSource implementation of 'isType'
 * @private
 * @inner
 * @function
 * @param {Object|Array|Document} data - the tile source configuration object
 * @param {String} url - the url where the tile source configuration object was
 *      loaded from, if any.
 */
$.TileSource.determineType = function( tileSource, data, url ){
    var property;
    for( property in OpenSeadragon ){
        if( property.match(/.+TileSource$/) &&
            $.isFunction( OpenSeadragon[ property ] ) &&
            $.isFunction( OpenSeadragon[ property ].prototype.supports ) &&
            OpenSeadragon[ property ].prototype.supports.call( tileSource, data, url )
        ){
            return OpenSeadragon[ property ];
        }
    }

    $.console.error( "No TileSource was able to open %s %s", url, data );

    return null;
};


}( OpenSeadragon ));
