
(function( $ ){

$.TileSource = function(width, height, tileSize, tileOverlap, minLevel, maxLevel) {
    this.aspectRatio = width / height;
    this.dimensions = new $.Point(width, height);
    this.minLevel = minLevel ? minLevel : 0;
    this.maxLevel = maxLevel ? maxLevel :
            Math.ceil(Math.log(Math.max(width, height)) / Math.log(2));
    this.tileSize = tileSize ? tileSize : 0;
    this.tileOverlap = tileOverlap ? tileOverlap : 0;
};

$.TileSource.prototype = {
    getLevelScale: function(level) {
        return 1 / (1 << (this.maxLevel - level));
    },

    getNumTiles: function(level) {
        var scale = this.getLevelScale(level);
        var x = Math.ceil(scale * this.dimensions.x / this.tileSize);
        var y = Math.ceil(scale * this.dimensions.y / this.tileSize);

        return new $.Point(x, y);
    },

    getPixelRatio: function(level) {
        var imageSizeScaled = this.dimensions.times(this.getLevelScale(level));
        var rx = 1.0 / imageSizeScaled.x;
        var ry = 1.0 / imageSizeScaled.y;

        return new $.Point(rx, ry);
    },

    getTileAtPoint: function(level, point) {
        var pixel = point.times(this.dimensions.x).times(this.getLevelScale(level));

        var tx = Math.floor(pixel.x / this.tileSize);
        var ty = Math.floor(pixel.y / this.tileSize);

        return new $.Point(tx, ty);
    },

    getTileBounds: function(level, x, y) {
        var dimensionsScaled = this.dimensions.times(this.getLevelScale(level));

        var px = (x === 0) ? 0 : this.tileSize * x - this.tileOverlap;
        var py = (y === 0) ? 0 : this.tileSize * y - this.tileOverlap;

        var sx = this.tileSize + (x === 0 ? 1 : 2) * this.tileOverlap;
        var sy = this.tileSize + (y === 0 ? 1 : 2) * this.tileOverlap;

        sx = Math.min(sx, dimensionsScaled.x - px);
        sy = Math.min(sy, dimensionsScaled.y - py);

        var scale = 1.0 / dimensionsScaled.x;
        return new $.Rect(px * scale, py * scale, sx * scale, sy * scale);
    },

    getTileUrl: function(level, x, y) {
        throw new Error("Method not implemented.");
    },

    tileExists: function(level, x, y) {
        var numTiles = this.getNumTiles(level);
        return level >= this.minLevel && level <= this.maxLevel &&
                x >= 0 && y >= 0 && x < numTiles.x && y < numTiles.y;
    }
};

}( OpenSeadragon ));
