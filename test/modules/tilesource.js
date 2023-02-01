/* global QUnit, testLog, Util */
(function() {

    QUnit.module('TileSource', {
        beforeEach: function() {
            testLog.reset();
        }
    });


    QUnit.test("should set sane tile size defaults", function(assert) {
        var source = new OpenSeadragon.TileSource();

        assert.equal(source.getTileWidth(), 0, "getTileWidth() should return 0 if not provided a size");
        assert.equal(source.getTileHeight(), 0, "getTileHeight() should return 0 if not provided a size");
    });

    QUnit.test("providing tileSize", function(assert){
        var tileSize = 256,
            source = new OpenSeadragon.TileSource({
                tileSize: tileSize
            });

        assert.equal(source.tileSize, undefined, "tileSize should not be set on the tileSource");
        assert.equal(source.getTileWidth(), tileSize, "getTileWidth() should equal tileSize");
        assert.equal(source.getTileHeight(), tileSize, "getTileHeight() should equal tileSize");
    });


    QUnit.test("providing tileWidth and tileHeight", function(assert){
        var tileWidth = 256,
            tileHeight = 512,
            source = new OpenSeadragon.TileSource({
                tileWidth: tileWidth,
                tileHeight: tileHeight
            });

        assert.equal(source._tileWidth, tileWidth, "tileWidth option should set _tileWidth");
        assert.equal(source._tileHeight, tileHeight, "tileHeight option should set _tileHeight");
        assert.equal(source.tileWidth, undefined, "tileWidth should be renamed _tileWidth");
        assert.equal(source.tileHeight, undefined, "tileHeight should be renamed _tileHeight");
        assert.equal(source.getTileWidth(), tileWidth, "getTileWidth() should equal tileWidth");
        assert.equal(source.getTileHeight(), tileHeight, "getTileHeight() should equal tileHeight");
    });

    QUnit.test('getTileSize() deprecation', function(assert) {
        var source = new OpenSeadragon.TileSource();
        Util.testDeprecation(assert, source, 'getTileSize');
    });

    QUnit.test('getTileAtPoint', function(assert) {
        var tileSource = new OpenSeadragon.TileSource({
            width: 1500,
            height: 1000,
            tileWidth: 200,
            tileHeight: 150,
            tileOverlap: 1,
        });

        assert.equal(tileSource.maxLevel, 11, "The max level should be 11.");

        function assertTileAtPoint(level, position, expected) {
            var actual = tileSource.getTileAtPoint(level, position);
            assert.ok(actual.equals(expected), "The tile at level " + level +
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

        // Test for issue #1276
        tileSource = new OpenSeadragon.TileSource({
            width: 4036,
            height: 1239,
            tileWidth: 4036,
            tileHeight: 1239,
            tileOverlap: 0,
            maxLevel: 0,
        });
        assertTileAtPoint(0, new OpenSeadragon.Point(1, 1239 / 4036), new OpenSeadragon.Point(0, 0));

        // Test for issue #1362
        tileSource = new OpenSeadragon.TileSource({
            width: 2000,
            height: 3033,
            tileWidth: 2000,
            tileHeight: 3033,
            tileOverlap: 0,
            maxLevel: 0,
        });
        assertTileAtPoint(0, new OpenSeadragon.Point(1, 3033 / 2000), new OpenSeadragon.Point(0, 0));
    });

    QUnit.test('changing maxLevel', function(assert) {
        var tileSource = new OpenSeadragon.TileSource({
            width: 4096,
            height: 4096,
        });

        assert.equal(tileSource.maxLevel, 12, 'The initial max level should be 12.');

        function assertLevelScale(level, expected) {
            var actual = tileSource.getLevelScale(level);
            assert.ok(Math.abs(actual - expected) < Number.EPSILON, "The scale at level " + level +
                " should be " + expected.toString() +
                " got " + actual.toString());
        }

        assertLevelScale(12, 1);
        assertLevelScale(10, 1 / 4);
        assertLevelScale(8, 1 / 16);
        assertLevelScale(6, 1 / 64);

        tileSource.setMaxLevel(9);

        assertLevelScale(9, 1);
        assertLevelScale(7, 1 / 4);
        assertLevelScale(5, 1 / 16);
        assertLevelScale(3, 1 / 64);
    });

}());
