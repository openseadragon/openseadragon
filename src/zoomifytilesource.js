(function($) {

  /**
   * @class ZoomifyTileSource
   * @classdesc A tilesource implementation for the zoomify format.
   *
   * @memberof OpenSeadragon
   * @extends OpenSeadragon.TileSource
   * @param {Number} width - the pixel width of the image.
   * @param {Number} height
   * @param {Number} tileSize
   * @param {String} tilesUrl
   */
  $.ZoomifyTileSource = function(options) {

    options.tileSize = 256;

    var currentImageSize = {
      x: options.width,
      y: options.height
    };
    options.imageSizes = [{
      x: options.width,
      y: options.height
    }];
    options.gridSize = [this._getGridSize(options.width, options.height, options.tileSize)];

    while (parseInt(currentImageSize.x, 10) > options.tileSize || parseInt(currentImageSize.y, 10) > options.tileSize) {
      currentImageSize.x = Math.floor(currentImageSize.x / 2);
      currentImageSize.y = Math.floor(currentImageSize.y / 2);
      options.imageSizes.push({
        x: currentImageSize.x,
        y: currentImageSize.y
      });
      options.gridSize.push(this._getGridSize(currentImageSize.x, currentImageSize.y, options.tileSize));
    }
    options.imageSizes.reverse();
    options.gridSize.reverse();
    options.minLevel = 0;
    options.maxLevel = options.gridSize.length - 1;


    OpenSeadragon.TileSource.apply(this, [options]);

  };

  $.extend($.ZoomifyTileSource.prototype, $.TileSource.prototype, /** @lends OpenSeadragon.ZoomifyTileSource.prototype */ {

    //private
    _getGridSize: function(width, height, tileSize) {
      return {
        x: Math.ceil(width / tileSize),
        y: Math.ceil(height / tileSize)
      };
    },

    //private
    _calculateAbsoluteTileNumber: function(level, x, y) {
      var num = 0;
      for (var z = 0; z < level; z++) {
        var size = this.gridSize[z];
        num += size.x * size.y;
      }
      var size = this.gridSize[level];
      num += size.x * y + x
      return num;
    },

    /**
     * Determine if the data and/or url imply the image service is supported by
     * this tile source.
     * @function
     * @param {Object|Array} data
     * @param {String} optional - url
     */
    supports: function(data, url) {
      return (data.type && "zoomifytileservice" == data.type);
    },

    /**
     *
     * @function
     * @param {Object} data - the raw configuration
     * @param {String} url - the url the data was retreived from if any.
     * @return {Object} options - A dictionary of keyword arguments sufficient
     *      to configure this tile sources constructor.
     */
    configure: function(data, url) {
      return data;
    },


    /**
     * @function
     * @param {Number} level
     * @param {Number} x
     * @param {Number} y
     */
    getTileUrl: function(level, x, y) {
      //console.log(level);
      var result = 0;
      var num = this._calculateAbsoluteTileNumber(level, x, y);
      result = Math.floor(num / 256);
      return this.tilesUrl + 'TileGroup' + result + '/' + level + '-' + x + '-' + y + '.jpg';

    }
  });

}(OpenSeadragon));
