(function($) {

    /**
     * @class ZoomifyTileSource
     * @classdesc A tilesource implementation for the zoomify format.
     *
     * A description of the format can be found here:
     * https://ecommons.cornell.edu/bitstream/handle/1813/5410/Introducing_Zoomify_Image.pdf
     *
     * There are two ways of creating a zoomify tilesource for openseadragon
     *
     * 1) Supplying all necessary information in the tilesource object. A minimal example object for this method looks like this:
     *
     * {
     *      type: "zoomifytileservice",
     *      width: 1000,
     *      height: 1000,
     *      tilesUrl: "/test/data/zoomify/"
     * }
     *
     * The tileSize is set to 256 (the usual Zoomify default) when it is not defined. The tileUrl must the path to the image _directory_.
     *
     * 2) Loading image metadata from xml file: (CURRENTLY NOT SUPPORTED)
     *
     * When creating zoomify formatted images one "xml" like file with name ImageProperties.xml
     * will be created as well. Here is an example of such a file:
     *
     * <IMAGE_PROPERTIES WIDTH="1000" HEIGHT="1000" NUMTILES="21" NUMIMAGES="1" VERSION="1.8" TILESIZE="256" />
     *
     * To use this xml file as metadata source you must supply the path to the ImageProperties.xml file and leave out all other parameters:
     * As stated above, this method of loading a zoomify tilesource is currently not supported
     *
     * {
     *      type: "zoomifytileservice",
     *      tilesUrl: "/test/data/zoomify/ImageProperties.xml"
     * }

    *
    * @memberof OpenSeadragon
     * @extends OpenSeadragon.TileSource
     * @param {Number} width - the pixel width of the image.
     * @param {Number} height
     * @param {Number} tileSize
     * @param {String} tilesUrl
     */
    $.ZoomifyTileSource = function(options) {
        if(typeof options.tileSize === 'undefined'){
            options.tileSize = 256;
        }

        if(typeof options.fileFormat === 'undefined'){
            options.fileFormat = 'jpg';
            this.fileFormat = options.fileFormat;
        }

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

        $.TileSource.apply(this, [options]);
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
            var size = {};

            //Sum up all tiles below the level we want the number of tiles
            for (var z = 0; z < level; z++) {
                size = this.gridSize[z];
                num += size.x * size.y;
            }
            //Add the tiles of the level
            size = this.gridSize[level];
            num += size.x * y + x;
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
            return (data.type && "zoomifytileservice" === data.type);
        },

        /**
         *
         * @function
         * @param {Object} data - the raw configuration
         * @param {String} url - the url the data was retrieved from if any.
         * @param {String} postData - HTTP POST data in k=v&k2=v2... form or null
         * @returns {Object} options - A dictionary of keyword arguments sufficient
         *      to configure this tile sources constructor.
         */
        configure: function(data, url, postData) {
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
            return this.tilesUrl + 'TileGroup' + result + '/' + level + '-' + x + '-' + y + '.' + this.fileFormat;

        },

        /**
         * Equality comparator
         */
        equals: function (otherSource) {
            return this.tilesUrl === otherSource.tilesUrl;
        }
    });

}(OpenSeadragon));

