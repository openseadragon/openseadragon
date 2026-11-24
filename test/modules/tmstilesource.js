/* global QUnit, OpenSeadragon */
(function() {
    QUnit.module('TmsTileSource');

    QUnit.test('object constructor pads dimensions and uses 256-pixel tiles', function(assert) {
        const source = new OpenSeadragon.TmsTileSource({
            width: 257,
            height: 513,
            tileSize: 128,
            tileOverlap: 3,
            tilesUrl: '/tms/'
        });

        assert.strictEqual(source.width, 512, 'width rounds up to a multiple of 256');
        assert.strictEqual(source.height, 768, 'height rounds up to a multiple of 256');
        assert.strictEqual(source.maxLevel, 1, 'three tiles on the long side require two levels');
        assert.strictEqual(source.minLevel, 0, 'minimum level defaults to zero');
        assert.strictEqual(source.getTileWidth(1), 256, 'TMS forces 256-pixel tile width');
        assert.strictEqual(source.getTileHeight(1), 256, 'TMS forces 256-pixel tile height');
        assert.strictEqual(source.tileOverlap, 3, 'tile overlap is preserved');
        assert.strictEqual(source.tilesUrl, '/tms/', 'URL prefix is preserved');
    });

    QUnit.test('positional constructor uses the same normalization', function(assert) {
        const source = new OpenSeadragon.TmsTileSource(800, 300, 512, 2, '/positional/');

        assert.strictEqual(source.width, 1024, 'width is padded');
        assert.strictEqual(source.height, 512, 'height is padded');
        assert.strictEqual(source.maxLevel, 1, 'four tiles across produce levels zero and one');
        assert.strictEqual(source.getTileWidth(1), 256, 'provided tile size is overridden');
        assert.strictEqual(source.tileOverlap, 2, 'positional overlap is preserved');
        assert.strictEqual(source.tilesUrl, '/positional/', 'positional URL is preserved');
    });

    QUnit.test('supports exact TMS type and configure returns the input', function(assert) {
        const source = new OpenSeadragon.TmsTileSource({
            width: 512,
            height: 512,
            tilesUrl: '/tms/'
        });
        const config = { type: 'tiledmapservice', width: 512, height: 512 };

        assert.strictEqual(source.supports(config, '/tiles.json'), true, 'TMS type is accepted');
        assert.notOk(source.supports({ type: 'openstreetmaps' }), 'OSM type is rejected');
        assert.notOk(source.supports({ type: 'TiledMapService' }), 'type is case sensitive');
        assert.notOk(source.supports({}), 'missing type is rejected');
        assert.strictEqual(source.configure(config, '/tiles.json', 'a=1'), config,
            'configure returns the same object without translating it');
    });

    QUnit.test('tile URLs reverse Y at the highest level', function(assert) {
        const source = new OpenSeadragon.TmsTileSource({
            width: 257,
            height: 513,
            tilesUrl: '/tms/'
        });
        const tiles = source.getNumTiles(1);

        assert.strictEqual(tiles.x, 2, 'padded 512-pixel width gives two columns');
        assert.strictEqual(tiles.y, 3, 'padded 768-pixel height gives three rows');
        assert.strictEqual(source.getTileUrl(1, 1, 0), '/tms/1/1/2.png',
            'top row maps to bottom-origin row two');
        assert.strictEqual(source.getTileUrl(1, 1, 1), '/tms/1/1/1.png',
            'middle row stays row one');
        assert.strictEqual(source.getTileUrl(1, 0, 2), '/tms/1/0/0.png',
            'bottom row maps to bottom-origin row zero');
    });

    QUnit.test('tile URLs recalculate the Y flip at lower levels', function(assert) {
        const source = new OpenSeadragon.TmsTileSource({
            width: 257,
            height: 513,
            tilesUrl: '/tms/'
        });
        const tiles = source.getNumTiles(0);

        assert.strictEqual(tiles.x, 1, 'half-scale padded width needs one column');
        assert.strictEqual(tiles.y, 2, 'half-scale padded height still needs two rows');
        assert.strictEqual(source.getTileUrl(0, 0, 0), '/tms/0/0/1.png',
            'top row flips using the lower-level row count');
        assert.strictEqual(source.getTileUrl(0, 0, 1), '/tms/0/0/0.png',
            'bottom row flips to zero at the lower level');
    });

    QUnit.test('equals compares tile URL prefixes', function(assert) {
        const first = new OpenSeadragon.TmsTileSource({ width: 512, height: 512, tilesUrl: '/a/' });
        const sameUrl = new OpenSeadragon.TmsTileSource({ width: 1024, height: 512, tilesUrl: '/a/' });
        const otherUrl = new OpenSeadragon.TmsTileSource({ width: 512, height: 512, tilesUrl: '/b/' });

        assert.ok(first.equals(sameUrl), 'sources with the same URL compare equal');
        assert.notOk(first.equals(otherUrl), 'different URLs compare unequal');
        assert.notOk(first.equals(null), 'null is not equal');
    });
}());
