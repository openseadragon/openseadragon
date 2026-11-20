/* global QUnit, OpenSeadragon */
(function() {
    QUnit.module('OsmTileSource');

    QUnit.test('default constructor creates the standard OSM pyramid', function(assert) {
        const source = new OpenSeadragon.OsmTileSource({});

        assert.strictEqual(source.width, 67108864, 'default width is 2^18 tiles of 256 pixels');
        assert.strictEqual(source.height, 67108864, 'default height matches width');
        assert.strictEqual(source.getTileWidth(8), 256, 'default tile width is 256');
        assert.strictEqual(source.getTileHeight(8), 256, 'default tile height is 256');
        assert.strictEqual(source.tileOverlap, 0, 'default tiles do not overlap');
        assert.strictEqual(source.minLevel, 8, 'OSM zoom zero is Deep Zoom level eight');
        assert.strictEqual(source.maxLevel, 26, '2^26-pixel image ends at Deep Zoom level 26');
        assert.strictEqual(source.tilesUrl, 'http://tile.openstreetmap.org/',
            'default tile URL uses the standard OSM service');
        const tiles = source.getNumTiles(8);
        assert.strictEqual(tiles.x, 1, 'lowest supported level has one tile column');
        assert.strictEqual(tiles.y, 1, 'lowest supported level has one tile row');
    });

    QUnit.test('object options preserve custom tiles and dimensions', function(assert) {
        const source = new OpenSeadragon.OsmTileSource({
            width: 1024,
            height: 512,
            tileSize: 128,
            tileOverlap: 3,
            minLevel: 4,
            tilesUrl: '/custom/'
        });

        assert.strictEqual(source.width, 1024, 'custom width is preserved');
        assert.strictEqual(source.height, 512, 'custom height is preserved');
        assert.strictEqual(source.getTileWidth(10), 128, 'custom tile width is preserved');
        assert.strictEqual(source.getTileHeight(10), 128, 'custom tile height is preserved');
        assert.strictEqual(source.tileOverlap, 3, 'custom overlap is preserved');
        assert.strictEqual(source.minLevel, 8, 'OSM overrides a custom minimum level');
        assert.strictEqual(source.maxLevel, 10, '1024-pixel image has max Deep Zoom level ten');
        assert.strictEqual(source.tilesUrl, '/custom/', 'custom URL is preserved');
        const low = source.getNumTiles(8);
        const high = source.getNumTiles(10);
        assert.strictEqual(low.x, 2, 'level eight has two 128-pixel columns');
        assert.strictEqual(low.y, 1, 'level eight has one 128-pixel row');
        assert.strictEqual(high.x, 8, 'full resolution has eight columns');
        assert.strictEqual(high.y, 4, 'full resolution has four rows');
    });

    QUnit.test('positional constructor preserves arguments', function(assert) {
        const source = new OpenSeadragon.OsmTileSource(1024, 512, 512, 5, '/positional/');

        assert.strictEqual(source.width, 1024, 'positional width is preserved');
        assert.strictEqual(source.height, 512, 'positional height is preserved');
        assert.strictEqual(source.getTileWidth(10), 512, 'positional tile size is preserved');
        assert.strictEqual(source.tileOverlap, 5, 'positional overlap is preserved');
        assert.strictEqual(source.tilesUrl, '/positional/', 'positional URL is preserved');
        assert.strictEqual(source.minLevel, 8, 'minimum level is eight');
        assert.strictEqual(source.maxLevel, 10, 'maximum level follows supplied dimensions');
    });

    QUnit.test('missing one dimension selects both default dimensions', function(assert) {
        const source = new OpenSeadragon.OsmTileSource({
            width: 1024,
            tilesUrl: '/partial/'
        });

        assert.strictEqual(source.width, 67108864, 'partial width falls back to default');
        assert.strictEqual(source.height, 67108864, 'missing height falls back to default');
        assert.strictEqual(source.maxLevel, 26, 'default image produces full zoom range');
        assert.strictEqual(source.tilesUrl, '/partial/', 'explicit URL survives fallback');
    });

    QUnit.test('supports exact OSM type and configure returns the input', function(assert) {
        const source = new OpenSeadragon.OsmTileSource({ width: 1024, height: 512 });
        const config = { type: 'openstreetmaps', width: 1024, height: 512 };

        assert.strictEqual(source.supports(config, '/map.json'), true, 'OSM type is accepted');
        assert.notOk(source.supports({ type: 'tiledmapservice' }), 'TMS type is rejected');
        assert.notOk(source.supports({ type: 'OpenStreetMaps' }), 'type is case sensitive');
        assert.notOk(source.supports({}), 'missing type is rejected');
        assert.strictEqual(source.configure(config, '/map.json', 'a=1'), config,
            'configure returns the identical input object');
    });

    QUnit.test('tile URLs subtract eight levels without reversing Y', function(assert) {
        const source = new OpenSeadragon.OsmTileSource({
            width: 1024,
            height: 512,
            tileSize: 256,
            tilesUrl: '/osm/'
        });
        const low = source.getNumTiles(9);
        const high = source.getNumTiles(10);

        assert.strictEqual(low.x, 2, 'level nine has two tile columns');
        assert.strictEqual(low.y, 1, 'level nine has one tile row');
        assert.strictEqual(high.x, 4, 'level ten has four tile columns');
        assert.strictEqual(high.y, 2, 'level ten has two tile rows');
        assert.strictEqual(source.getTileUrl(8, 0, 0), '/osm/0/0/0.png',
            'Deep Zoom level eight maps to OSM zoom zero');
        assert.strictEqual(source.getTileUrl(9, 1, 0), '/osm/1/1/0.png',
            'Deep Zoom level nine maps to OSM zoom one');
        assert.strictEqual(source.getTileUrl(10, 3, 0), '/osm/2/3/0.png',
            'highest-level top row retains Y zero');
        assert.strictEqual(source.getTileUrl(10, 3, 1), '/osm/2/3/1.png',
            'highest-level bottom row retains Y one');
    });

    QUnit.test('equals compares tile URL prefixes', function(assert) {
        const first = new OpenSeadragon.OsmTileSource({ width: 1024, height: 512, tilesUrl: '/a/' });
        const sameUrl = new OpenSeadragon.OsmTileSource({ width: 2048, height: 2048, tilesUrl: '/a/' });
        const otherUrl = new OpenSeadragon.OsmTileSource({ width: 1024, height: 512, tilesUrl: '/b/' });

        assert.ok(first.equals(sameUrl), 'identical URLs compare equal despite dimensions');
        assert.notOk(first.equals(otherUrl), 'different URLs compare unequal');
        assert.notOk(first.equals(null), 'null is not equal');
    });
}());
