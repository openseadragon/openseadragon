/**
 * OpenSeadragon - IIPTileSource
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

    if( options && options.iipsrv && options.image ){
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
      var url = this.getMetadataUrl();
      this.getImageInfo( url );
    }
  };


  $.extend($.IIPTileSource.prototype, $.TileSource.prototype, /** @lends OpenSeadragon.IIPTileSource.prototype */ {

    /**
     * Return URL string for image metadata
     * @function
     * @returns {String} url - The IIP URL needed for image metadata
     */
    getMetadataUrl: function() {
      return this.iipsrv + '?FIF=' + this.image + '&obj=IIP,1.0&obj=Max-size&obj=Tile-size&obj=Resolution-number&obj=Resolutions';
    },


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

      // Full image size
      var tmp = data.split( "Max-size:" );
      if(!tmp[1]){
        throw new Error( "No Max-size returned" );
      }
      var size = tmp[1].split(" ");
      this.width = parseInt( size[0], 10 );
      this.height = parseInt( size[1], 10 );
      this.dimensions = new $.Point( this.width, this.height );

      // Calculate aspect ratio
      this.aspectRatio = this.width / this.height;

      // Tile size
      tmp = data.split( "Tile-size:" );
      if(!tmp[1]){
        throw new Error( "No Tile-size returned" );
      }
      size = tmp[1].split(" ");
      this._tileWidth = parseInt(size[0], 10);
      this._tileHeight = parseInt(size[1], 10);

      // Number of resolution levels
      tmp = data.split( "Resolution-number:" );
      var numRes = parseInt(tmp[1], 10);
      this.minLevel = 0;
      this.maxLevel = numRes - 1;
      this.tileOverlap = 0;

      // Size of each resolution
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
          try {
            OpenSeadragon[ "IIPTileSource" ].prototype.parseIIP.call( _this, xhr.responseText );
            _this.ready = true;
            _this.raiseEvent( 'ready', { tileSource: _this } );
          }
          catch( e ) {
            var msg = "IIPTileSource: Error parsing IIP metadata: " + e.message;
            _this.raiseEvent( 'open-failed', { message: msg, source: url } );
          }
        },
        error: function ( xhr, exc ) {
          var msg = "IIPTileSource: Unable to get IIP metadata from " + url;
          $.console.error( msg );
          _this.raiseEvent( 'open-failed', { message: msg, source: url });
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
        var x = Math.ceil( levelSize.width / this._tileWidth ),
            y = Math.ceil( levelSize.height / this._tileHeight );
        return new $.Point( x, y );
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

      // Get the exact size of this level and calculate the number of tiles across
      var levelSize = this.levelSizes[level];
      var ntlx = Math.ceil( levelSize.width / this._tileWidth );

      // Set the base URL
      var url = this.iipsrv + '?FIF=' + this.image + '&';

      // Apply any image procesing transform
      if( this.transform ){

        if( this.transform.stack ) {
          url += 'SDS=' + this.transform.stack + '&';
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
