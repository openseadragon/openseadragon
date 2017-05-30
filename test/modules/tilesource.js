/* global module, ok, equal, start, test, testLog, Util */
(function() {

    module('TileSource', {
        setup: function() {
            testLog.reset();
        }
    });


    test("should set sane tile size defaults", function() {
        var source = new OpenSeadragon.TileSource();

        equal(source.getTileWidth(), 0, "getTileWidth() should return 0 if not provided a size");
        equal(source.getTileHeight(), 0, "getTileHeight() should return 0 if not provided a size");
    });

    test("providing tileSize", function(){
        var tileSize = 256,
            source = new OpenSeadragon.TileSource({
                tileSize: tileSize
            });

        equal(source.tileSize, undefined, "tileSize should not be set on the tileSource");
        equal(source.getTileWidth(), tileSize, "getTileWidth() should equal tileSize");
        equal(source.getTileHeight(), tileSize, "getTileHeight() should equal tileSize");
    });


    test("providing tileWidth and tileHeight", function(){
        var tileWidth = 256,
            tileHeight = 512,
            source = new OpenSeadragon.TileSource({
                tileWidth: tileWidth,
                tileHeight: tileHeight
            });

        equal(source._tileWidth, tileWidth, "tileWidth option should set _tileWidth");
        equal(source._tileHeight, tileHeight, "tileHeight option should set _tileHeight");
        equal(source.tileWidth, undefined, "tileWidth should be renamed _tileWidth");
        equal(source.tileHeight, undefined, "tileHeight should be renamed _tileHeight");
        equal(source.getTileWidth(), tileWidth, "getTileWidth() should equal tileWidth");
        equal(source.getTileHeight(), tileHeight, "getTileHeight() should equal tileHeight");
    });

    test('getTileSize() deprecation', function() {
        var source = new OpenSeadragon.TileSource();
        Util.testDeprecation(source, 'getTileSize');
    });

    test('getTileAtPoint', function() {
        var tileSource = new OpenSeadragon.TileSource({
            width: 1500,
            height: 1000,
            tileWidth: 200,
            tileHeight: 150,
            tileOverlap: 1,
        });

        equal(tileSource.maxLevel, 11, "The max level should be 11.");

        function assertTileAtPoint(level, position, expected) {
            var actual = tileSource.getTileAtPoint(level, position);
            ok(actual.equals(expected), "The tile at level " + level +
                ", position " + position.toString() +
                " should be tile " + expected.toString() +
                " got " + actual.toString());
        }

        assertTileAtPoint(11, new OpenSeadragon.Point(0, 0), new OpenSeadragon.Point(0, 0));
        assertTileAtPoint(11, new OpenSeadragon.Point(0.5, 0.5), new OpenSeadragon.Point(3, 5));
        assertTileAtPoint(11, new OpenSeadragon.Point(1, 10 / 15), new OpenSeadragon.Point(7, 6));

        assertTileAtPoint(10, new OpenSeadragon.Point(0, 0), new OpenSeadragon.Point(0, 0));
        assertTileAtPoint(10, new OpenSeadragon.Point(0.5, 0.5), new OpenSeadragon.Point(1, 2));
        assertTileAtPoint(10, new OpenSeadragon.Point(1, 10 / 15), new OpenSeadragon.Point(3, 3));

        assertTileAtPoint(9, new OpenSeadragon.Point(0, 0), new OpenSeadragon.Point(0, 0));
        assertTileAtPoint(9, new OpenSeadragon.Point(0.5, 0.5), new OpenSeadragon.Point(0, 1));
        assertTileAtPoint(9, new OpenSeadragon.Point(1, 10 / 15), new OpenSeadragon.Point(1, 1));

        // For all other levels, there is only one tile.
        for (var level = 8; level >= 0; level--) {
            assertTileAtPoint(level, new OpenSeadragon.Point(0, 0), new OpenSeadragon.Point(0, 0));
            assertTileAtPoint(level, new OpenSeadragon.Point(0.5, 0.5), new OpenSeadragon.Point(0, 0));
            assertTileAtPoint(level, new OpenSeadragon.Point(1, 10 / 15), new OpenSeadragon.Point(0, 0));
        }

        // Test for issue #1113
        tileSource = new OpenSeadragon.TileSource({
            width: 1006,
            height: 1009,
            tileWidth: 1006,
            tileHeight: 1009,
            tileOverlap: 0,
            maxLevel: 0,
        });
        assertTileAtPoint(0, new OpenSeadragon.Point(1, 1009 / 1006), new OpenSeadragon.Point(0, 0));
    });

}());
