(function() {
    QUnit.module('Iris');

    const mockFetchMetadata = function(url, context) {
        const metadata = {
            extent: {
                width: 1983,
                height: 1381,
                layers: [
                    { x_tiles: 8, y_tiles: 6, scale: 1 },
                    { x_tiles: 31, y_tiles: 22, scale: 4.0005 },
                    { x_tiles: 124, y_tiles: 87, scale: 16.0035 },
                    { x_tiles: 496, y_tiles: 346, scale: 64.0141 }
                ]
            }
        };
        context.parseMetadata(metadata);
        context.ready = true;
        context.raiseEvent('ready', { tileSource: context });
    };

    QUnit.test('IrisTileSource getMetadataUrl', function(assert) {
        const test = new OpenSeadragon.IrisTileSource({
            serverUrl: "http://localhost",
            slideId: "12345",
            fetchMetadata: mockFetchMetadata
        });

        assert.ok(test.ready, "IrisTileSource should be ready after mock metadata");
        assert.equal(test.width, 1983, "Width should be correctly parsed from mock metadata");

        const expectedUrl = "http://localhost/slides/12345/metadata";
        assert.equal(test.getMetadataUrl(), expectedUrl, "Metadata URL should match expected format");
    });

    QUnit.test('IrisTileSource metadata parsing', function(assert) {
        const test = new OpenSeadragon.IrisTileSource({
            serverUrl: "http://localhost",
            slideId: "12345",
            fetchMetadata: () => {}
        });

        const metadata = {
            extent: {
                width: 1983,
                height: 1381,
                layers: [
                    { x_tiles: 8, y_tiles: 6, scale: 1 },
                    { x_tiles: 31, y_tiles: 22, scale: 4.0005 },
                    { x_tiles: 124, y_tiles: 87, scale: 16.0035 },
                    { x_tiles: 496, y_tiles: 346, scale: 64.0141 }
                ]
            }
        };

        test.parseMetadata(metadata);

        // Check dimensions
        assert.ok(test.width, "Width exists");
        assert.equal(test.width, 1983, "Parsing width correctly");
        assert.equal(test.height, 1381, "Parsing height correctly");

        // Check level sizes and scales
        assert.ok(test.levelSizes, "Level sizes exist");
        assert.equal(typeof test.levelSizes, "object", "Level sizes is an array");
        assert.equal(test.levelSizes.length, 4, "Number of levels is correct");
        assert.equal(test.maxLevel, 3, "Max level is correctly set");

        assert.ok(test.levelScales, "Level scales exist");
        assert.equal(test.levelScales.length, 4, "Number of scales matches number of levels");
        assert.deepEqual(test.levelScales, [1, 4.0005, 16.0035, 64.0141], "Parsing scales correctly");
    });

    QUnit.test('IrisTileSource getTileUrl', function(assert) {
        const test = new OpenSeadragon.IrisTileSource({
            serverUrl: "http://localhost",
            slideId: "12345",
            fetchMetadata: mockFetchMetadata
        });

        // Test tile URL generation
        assert.equal(
            test.getTileUrl(0, 0, 0),
            "http://localhost/slides/12345/layers/0/tiles/0",
            "Tile URL for level 0, x=0, y=0 should match expected format"
        );
        assert.equal(
            test.getTileUrl(1, 1, 0),
            "http://localhost/slides/12345/layers/1/tiles/1",
            "Tile URL for level 1, x=1, y=0 should match expected format"
        );
        assert.equal(
            test.getTileUrl(2, 1, 1),
            "http://localhost/slides/12345/layers/2/tiles/125",
            "Tile URL for level 2, x=1, y=1 should match expected format"
        );
        assert.equal(
            test.getTileUrl(3, 2, 2),
            "http://localhost/slides/12345/layers/3/tiles/994",
            "Tile URL for level 3, x=2, y=2 should match expected format"
        );
        assert.equal(
            test.getTileUrl(3, 3, 2),
            "http://localhost/slides/12345/layers/3/tiles/995",
            "Tile URL for level 3, x=3, y=2 should match expected format"
        );
    });
})();