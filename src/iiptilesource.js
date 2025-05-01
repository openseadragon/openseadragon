/**
 * OpenSeadragon - IIPTileSource
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
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. *
 *
 */


(function($) {

  /**
   * @class IIPTileSource
   * @classdesc A tilesource implementation for the Internet Imaging Protocol (IIP).
   *
   * @memberof OpenSeadragon
   * @extends OpenSeadragon.TileSource
   * @see https://iipimage.sourceforge.io
   *
   * @param {String} iipsrv               - IIPImage host server path (ex: "https://host/fcgi-bin/iipsrv.fcgi" or "/fcgi-bin/iipsrv.fcgi")
   * @param {String} image                - Image path and name on server (ex: "image.tif")
   * @param {String} format    (optional) - Tile output format (default: "jpg")
   * @param {Object} transform (optional) - Object containing image processing transforms
   *                                        (supported transform: "stack","quality","contrast","color","invert",
   *                                                              "colormap," "gamma","minmax","twist","hillshade".
   *                                        See https://iipimage.sourceforge.io/documentation/protocol for how to use)
   *
   * Example: tileSources: {
   *            iipsrv:    "/fcgi-bin/iipsrv.fcgi",
   *            image:     "test.tif",
   *            transform: {
   *              gamma: 1.5,
   *              invert: true
   *            }
   *          }
   */

  $.IIPTileSource = function(options) {

    $.EventSource.call( this );

    if( options && options.image ){
      $.extend( this, options );
      this.aspectRatio = 1;
      this.dimensions  = new $.Point( 10, 10 );
      this._tileWidth  = 0;
      this._tileHeight = 0;
      this.tileOverlap = 0;
      this.minLevel    = 0;
      this.maxLevel    = 0;
      this.ready       = false;

      // Query server for image metadata
      var url = this.iipsrv + '?FIF=' + this.image + '&obj=IIP,1.0&obj=Max-size&obj=Tile-size&obj=Resolution-number&obj=Resolutions';
      this.getImageInfo( url );
    }
  };


  $.extend($.IIPTileSource.prototype, $.TileSource.prototype, /** @lends OpenSeadragon.IIPTileSource.prototype */ {

    /**
     * Determine if the data and/or url imply the image service is supported by
     * this tile source.
     * @function
     * @param {Object|Array} data
     * @param {String} optional - url
     */
    supports: function(data, url) {
      // Configuration must supply the IIP server endpoint and the image name
      return ( data && ("iipsrv" in data) && ("image" in data) );
    },


    /**
     * Parse IIP protocol response
     * @function
     * @param {Object|Array} data - raw metadata from an IIP server
     */
    parseIIP: function( data ) {

      var tmp = data.split( "Max-size:" );
      if(!tmp[1]){
        this.raiseEvent( 'open-failed', { message: "No Max-size returned" } );
      }
      var size = tmp[1].split(" ");
      this.width = parseInt( size[0], 10 );
      this.height = parseInt( size[1], 10 );
      this.dimensions = new $.Point( this.width, this.height );

      tmp = data.split( "Tile-size:" );
      if(!tmp[1]){
        this.raiseEvent( 'open-failed', { message: "No Tile-size returned" } );
      }
      size = tmp[1].split(" ");
      this._tileWidth = parseInt(size[0], 10);
      this.tileSize = this._tileWidth;
      this._tileHeight = parseInt(size[1], 10);

      tmp = data.split( "Resolution-number:" );
      var numRes = parseInt(tmp[1], 10);
      this.minLevel = 0;
      this.maxLevel = numRes - 1;
      this.tileOverlap = 0;

      tmp = data.split( "Resolutions:" );
      size = tmp[1].split(",");
      var len = size.length;
      this.levelSizes = new Array(len);
      for( var n = 0; n < len; n++ ) {
        var res = size[n].split(" ");
        var w = parseInt(res[0], 10);
        var h = parseInt(res[1], 10);
        this.levelSizes[n] = {width: w, height: h};
      }
    },


    /**
     * Retrieve image metadata from an IIP-compatible server
     *
     * @function
     * @param {String} url
     * @throws {Error}
     */
    getImageInfo: function( url ) {

      var _this = this;

      $.makeAjaxRequest( {
        url: url,
        type: "GET",
        async: false,
        withCredentials: this.ajaxWithCredentials,
        headers: this.ajaxHeaders,
        success: function( xhr ) {
          OpenSeadragon[ "IIPTileSource" ].prototype.parseIIP.call( _this, xhr.responseText );
          _this.ready = true;
          _this.raiseEvent( 'ready', { tileSource: _this } );
        },
        error: function ( xhr, exc ) {
          var msg = "IIPTileSource: Unable to get IIP metadata from " + url;
          $.console.error(msg);
          _this.raiseEvent( 'open-failed', {
            message: msg,
            source: url
          });
        }
      });
    },


    /**
     * Parse and configure the image metadata
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
    configure: function( options, url, postData ) {
      return options;
    },


    /**
     * @function
     * @param {Number} level
     */
    getNumTiles: function( level ) {
        var levelSize = this.levelSizes[level];
        var x = Math.ceil( levelSize.width / this.getTileWidth(level) ),
            y = Math.ceil( levelSize.height / this.getTileHeight(level) );
        return new $.Point( x, y );
    },


    /**
     * @function
     * @param {Number} level
     * @param {OpenSeadragon.Point} point
     */
    getTileAtPoint: function( level, point ) {

        var validPoint = point.x >= 0 && point.x <= 1 &&
                         point.y >= 0 && point.y <= 1 / this.aspectRatio;
        $.console.assert(validPoint, "[TileSource.getTileAtPoint] must be called with a valid point.");

        var widthScaled = this.levelSizes[level].width;
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
     * Determine the url which will return an image for the region specified by the given x, y, and level components.
     * Takes into account image processing parameters that have been set in constructor
     * @function
     * @param {Number} level
     * @param {Number} x
     * @param {Number} y
     */
    getTileUrl: function(level, x, y) {

      // Get the width of the tiles and calculate the number of tiles across
      var tileWidth = this.getTileWidth(level);
      var levelSize = this.levelSizes[level];
      var remx = levelSize.width % tileWidth;
      var ntlx = Math.floor(levelSize.width / tileWidth) + (remx === 0 ? 0 : 1);

      // Set the base URL
      var url = this.iipsrv + '?FIF=' + this.image + '&';

      // Apply any image procesing transform
      if( this.transform ){

        if( this.transform.stack ) {
          url += 'SDS=' + this.transform.stack;
        }
        if( this.transform.contrast ) {
          url += 'CNT=' + this.transform.contrast + '&';
        }
        if( this.transform.gamma ) {
          url += 'GAM=' + this.transform.gamma + '&';
        }
        if( this.transform.invert && this.transform.invert === true ) {
          url += 'INV&';
        }
        if( this.transform.color ) {
          url += 'COL=' + this.transform.color + '&';
        }
        if( this.transform.twist ) {
          url += 'CTW=' + this.transform.twist + '&';
        }
        if( this.transform.convolution ) {
          url += 'CNV=' + this.transform.convolution + '&';
        }
        if( this.transform.quality ) {
          url += 'QLT=' + this.transform.quality + '&';
        }
        if( this.transform.colormap ) {
          url += 'CMP=' + this.transform.colormap + '&';
        }
        if( this.transform.minmax ) {
          url += 'MINMAX=' + this.transform.minmax + '&';
        }
        if( this.transform.hillshade ) {
          url += 'SHD=' + this.transform.hillshade + '&';
        }
      }

      // Our output command depends on the requested image format
      var format = "JTL";
      if (this.format === "png") {
          format = "PTL";
      } else if (this.format === "webp" ) {
          format = "WTL";
      } else if (this.format === "avif" ) {
          format = "ATL";
      }

      // Calculate the tile index for this resolution
      var tile = (y * ntlx) + x;

      return url + format + '=' + level + ',' + tile;
    }

  });

  $.extend( true, $.IIPTileSource.prototype, $.EventSource.prototype );

}(OpenSeadragon));
