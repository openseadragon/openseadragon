/* global QUnit, Util */

(function() {

    // This module tests whether our various file formats can be opened.
    // TODO: Add more file formats (with corresponding test data).

    let viewer = null;

    QUnit.module('Formats', {
        beforeEach: function () {
            const example = document.createElement("div");
            example.id = "example";
            document.getElementById("qunit-fixture").appendChild(example);
        },
        afterEach: function () {
            if (viewer){
                viewer.destroy();
            }

            viewer = null;
        }
    });


    // ----------
    const testOpenUrl = function(relativeUrl, assert) {
        testOpen('/test/data/' + relativeUrl, assert);
    };

    const testOpen = function(tileSource, assert) {
        const done = assert.async();

        viewer = OpenSeadragon({
            id:            'example',
            prefixUrl:     '/build/openseadragon/images/',
            tileSources:   tileSource
        });

        assert.ok(viewer, 'Viewer exists');

        const openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            assert.ok(true, 'Open event was sent');
            viewer.addHandler('tiled-image-drawn', tileDrawnHandler);
        };

        const tileDrawnHandler = function(event) {
            viewer.removeHandler('tiled-image-drawn', tileDrawnHandler);
            assert.ok(true, 'A tiled image has been drawn');
            viewer.addHandler('close', closeHandler);
            viewer.close();
        };

        const closeHandler = function(event) {
            viewer.removeHandler('close', closeHandler);
            $('#example').empty();
            assert.ok(true, 'Close event was sent');
            done();
        };
        viewer.addHandler('open', openHandler);
    };

    // ----------
    QUnit.test('DZI', function(assert) {
        testOpenUrl('testpattern.dzi', assert);
    });

    // ----------
    QUnit.test('DZI JSONp', function(assert) {
        testOpenUrl('testpattern.js', assert);
    });

    // ----------
    QUnit.test('DZI XML', function(assert) {
        testOpenUrl('testpattern.xml', assert);
    });

    // ----------
    QUnit.test('DZI XML with query parameter', function(assert) {
        testOpenUrl('testpattern.xml?param=value', assert);
    });

     // ----------
    QUnit.test('IIIF 1.0 JSON', function(assert) {
        testOpenUrl('iiif_1_0_files/info.json', assert);
    });

    // ----------
    QUnit.test('IIIF 1.0 XML', function(assert) {
        testOpenUrl('iiif_1_0_files/info.xml', assert);
    });

    // ----------
    QUnit.test('IIIF 1.1 JSON', function(assert) {
        testOpenUrl('iiif_1_1_tiled/info.json', assert);
    });

    // ----------
    QUnit.test('IIIF No Tiles, Less than 256', function(assert) {
        testOpenUrl('iiif_1_1_no_tiles_255/info.json', assert);
    });

    // ----------
    QUnit.test('IIIF No Tiles, Bet. 256 and 512', function(assert) {
        testOpenUrl('iiif_1_1_no_tiles_384/info.json', assert);
    });

    // ----------
    QUnit.test('IIIF No Tiles, Bet. 512 and 1024', function(assert) {
        testOpenUrl('iiif_1_1_no_tiles_768/info.json', assert);
    });

    // ----------
    QUnit.test('IIIF No Tiles, Larger than 1024', function(assert) {
        testOpenUrl('iiif_1_1_no_tiles_1048/info.json', assert);
    });

    // ----------
    QUnit.test('IIIF 2.0 JSON', function(assert) {
        testOpenUrl('iiif_2_0_tiled/info.json', assert);
    });

    // ----------
    QUnit.test('IIIF 2.0 JSON scaleFactors [1]', function(assert) {
        testOpenUrl('iiif_2_0_tiled_sf1/info.json', assert);
    });

    // ----------
    QUnit.test('IIIF 2.0 JSON, sizes array only', function(assert) {
        testOpenUrl('iiif_2_0_sizes/info.json', assert);
    });

    // ----------
    QUnit.test('IIIF 2.0 JSON String', function(assert) {
        testOpen(
            '{' +
            '  "@context": "http://iiif.io/api/image/2/context.json",' +
            '  "@id": "http://localhost:8000/test/data/iiif_2_0_tiled",' +
            '  "protocol": "http://iiif.io/api/image",' +
            '  "height": 1024,' +
            '  "width": 775,' +
            '  "tiles" : [{"width":256, "scaleFactors":[1,2,4,8]}],' +
            '  "profile": ["http://iiif.io/api/image/2/level1.json",' +
            '    {' +
            '      "qualities": [' +
            '        "native",' +
            '        "bitonal",' +
            '        "grey",' +
            '        "color"' +
            '      ],' +
            '      "formats": [' +
            '        "jpg",' +
            '        "png",' +
            '        "gif"' +
            '      ]' +
            '    }' +
            '  ]' +
            '}', assert);
    });

    QUnit.test('IIIF 3.0 JSON', function(assert) {
        testOpenUrl('iiif_3_0_tiled/info.json', assert);
    });

    // ----------
    QUnit.test('IIIF 3.0 JSON scaleFactors [1]', function(assert) {
        testOpenUrl('iiif_3_0_tiled_sf1/info.json', assert);
    });

    // ----------
    QUnit.test('IIIF 3.0 JSON, sizes array only', function(assert) {
        testOpenUrl('iiif_3_0_sizes/info.json', assert);
    });

    // ----------
    QUnit.test('ImageTileSource', function(assert) {
        testOpen({
            type: "image",
            url: "/test/data/A.png"
        }, assert);
    });
    // ----------
    QUnit.test('Zoomify', function(assert) {
        testOpen({
            type: "zoomifytileservice",
            tileSize: 256,
            width: 1000,
            height: 1000,
            tilesUrl: "/test/data/zoomify/"
           }, assert);
    });


    // ----------
    QUnit.test('Legacy Image Pyramid', function(assert) {
        // Although it is using image paths that happen to be in IIIF format, this is not a IIIFTileSource.
        // The url values are opaque, just image locations.
        // When emulating a legacy pyramid, IIIFTileSource calls functions from LegacyTileSource, so this
        // adds a test for the legacy functionality too.
        testOpen({
            type: 'legacy-image-pyramid',
            levels: [{
                url: '/test/data/iiif_2_0_sizes/full/400,/0/default.jpg',
                height: 291,
                width:  400
            }, {
                url: '/test/data/iiif_2_0_sizes/full/800,/0/default.jpg',
                height: 582,
                width:  800
            }, {
                url: '/test/data/iiif_2_0_sizes/full/1600,/0/default.jpg',
                height: 1164,
                width:  1600
            }, {
                url: '/test/data/iiif_2_0_sizes/full/3200,/0/default.jpg',
                height: 2328,
                width:  3200
            }, {
                url: '/test/data/iiif_2_0_sizes/full/6976,/0/default.jpg',
                height: 5074,
                width:  6976
            }]
        }, assert);
    });

    // ---------- LegacyTileSource specific tests ----------

QUnit.module('LegacyTileSource', {
    beforeEach: function () {
        const example = document.createElement("div");
        example.id = "example";
        document.getElementById("qunit-fixture").appendChild(example);
    },
    afterEach: function () {
        if (viewer) {
            viewer.destroy();
        }
        viewer = null;
    }
});

    QUnit.test('supports with legacy-image-pyramid type', function(assert) {
        assert.ok(
            OpenSeadragon.LegacyTileSource.prototype.supports({ type: 'legacy-image-pyramid' }),
            'should return true for legacy-image-pyramid type'
        );
    });

    QUnit.test('supports with XML document', function(assert) {
        var parser = new DOMParser();
        var xml = '<image type="legacy-image-pyramid"></image>';
        var doc = parser.parseFromString(xml, "text/xml");

        assert.ok(
            OpenSeadragon.LegacyTileSource.prototype.supports(doc),
            'should return true for XML with legacy-image-pyramid type'
        );
    });

    QUnit.test('supports with invalid data', function(assert) {
        assert.notOk(
            OpenSeadragon.LegacyTileSource.prototype.supports({ type: 'dzi' }),
            'should return false for wrong type'
        );
        assert.notOk(
            OpenSeadragon.LegacyTileSource.prototype.supports(null),
            'should return false for null'
        );
        assert.notOk(
            OpenSeadragon.LegacyTileSource.prototype.supports({}),
            'should return false for empty object'
        );
    });

    QUnit.test('constructor with empty levels', function(assert) {
        var source = new OpenSeadragon.LegacyTileSource([]);
        assert.equal(source.width, 0, 'width should be 0');
        assert.equal(source.height, 0, 'height should be 0');
        assert.equal(source.levels.length, 0, 'levels should be empty');
    });

    QUnit.test('constructor filters invalid levels', function(assert) {
        var source = new OpenSeadragon.LegacyTileSource([
            { url: 'valid.jpg', width: 100, height: 100 },
            { url: 'invalid.jpg', width: 50 },  // missing height
            { url: 'invalid2.jpg', height: 50 },  // missing width
            { width: 50, height: 50 },  // missing url
            { url: 'valid2.jpg', width: 200, height: 200 }
        ]);

        assert.equal(source.levels.length, 2, 'should filter to 2 valid levels');
        assert.equal(source.levels[0].width, 100, 'first level width');
        assert.equal(source.levels[1].width, 200, 'second level width');
    });

    QUnit.test('getLevelScale', function(assert) {
        var source = new OpenSeadragon.LegacyTileSource([
            { url: 'small.jpg', width: 100, height: 100 },
            { url: 'large.jpg', width: 200, height: 200 }
        ]);

        assert.equal(source.getLevelScale(0), 0.5, 'level 0 scale');
        assert.equal(source.getLevelScale(1), 1, 'level 1 scale (max)');
        assert.ok(isNaN(source.getLevelScale(-1)), 'invalid low level should return NaN');
        assert.ok(isNaN(source.getLevelScale(99)), 'invalid high level should return NaN');
    });

    QUnit.test('getNumTiles', function(assert) {
        var source = new OpenSeadragon.LegacyTileSource([
            { url: 'small.jpg', width: 100, height: 100 },
            { url: 'large.jpg', width: 200, height: 200 }
        ]);

        var tiles0 = source.getNumTiles(0);
        assert.equal(tiles0.x, 1, 'level 0 x tiles');
        assert.equal(tiles0.y, 1, 'level 0 y tiles');

        var tiles1 = source.getNumTiles(1);
        assert.equal(tiles1.x, 1, 'level 1 x tiles');
        assert.equal(tiles1.y, 1, 'level 1 y tiles');

        var invalidTiles = source.getNumTiles(99);
        assert.equal(invalidTiles.x, 0, 'invalid level x should be 0');
        assert.equal(invalidTiles.y, 0, 'invalid level y should be 0');
    });

    QUnit.test('getTileUrl', function(assert) {
        var source = new OpenSeadragon.LegacyTileSource([
            { url: 'small.jpg', width: 100, height: 100 },
            { url: 'large.jpg', width: 200, height: 200 }
        ]);

        assert.equal(source.getTileUrl(0, 0, 0), 'small.jpg', 'level 0 url');
        assert.equal(source.getTileUrl(1, 0, 0), 'large.jpg', 'level 1 url');
        assert.equal(source.getTileUrl(-1, 0, 0), null, 'invalid level should return null');
        assert.equal(source.getTileUrl(99, 0, 0), null, 'invalid high level should return null');
    });

    QUnit.test('equals', function(assert) {
        var source1 = new OpenSeadragon.LegacyTileSource([
            { url: 'a.jpg', width: 100, height: 100 },
            { url: 'b.jpg', width: 200, height: 200 }
        ]);
        var source2 = new OpenSeadragon.LegacyTileSource([
            { url: 'a.jpg', width: 100, height: 100 },
            { url: 'b.jpg', width: 200, height: 200 }
        ]);
        var source3 = new OpenSeadragon.LegacyTileSource([
            { url: 'c.jpg', width: 100, height: 100 },
            { url: 'd.jpg', width: 200, height: 200 }
        ]);

        assert.ok(source1.equals(source2), 'same urls should be equal');
        assert.notOk(source1.equals(source3), 'different urls should not be equal');
        assert.notOk(source1.equals(null), 'null should not be equal');
        assert.notOk(source1.equals({}), 'empty object should not be equal');
    });

    QUnit.test('configure from object', function(assert) {
        var source = new OpenSeadragon.LegacyTileSource([
            { url: 'test.jpg', width: 100, height: 100 }
        ]);

        var config = { type: 'legacy-image-pyramid', levels: [
            { url: 'a.jpg', width: 50, height: 50 },
            { url: 'b.jpg', width: 100, height: 100 }
        ]};

        var result = source.configure(config);
        assert.equal(result, config.levels, 'should return levels array');
    });

    QUnit.test('configure from XML - valid', function(assert) {
        var source = new OpenSeadragon.LegacyTileSource([
            { url: 'test.jpg', width: 100, height: 100 }
        ]);

        var parser = new DOMParser();
        var xml = '<image type="legacy-image-pyramid">' +
            '<level url="small.jpg" width="100" height="100"/>' +
            '<level url="large.jpg" width="200" height="200"/>' +
            '</image>';
        var doc = parser.parseFromString(xml, "text/xml");

        var result = source.configure(doc);
        assert.ok(Array.isArray(result), 'should return an array');
        assert.equal(result.length, 2, 'should have 2 levels');
        assert.equal(result[0].url, 'small.jpg', 'first level url');
        assert.equal(result[1].url, 'large.jpg', 'second level url');
    });

    QUnit.test('configure from XML - collection', function(assert) {
        var source = new OpenSeadragon.LegacyTileSource([
            { url: 'test.jpg', width: 100, height: 100 }
        ]);

        var parser = new DOMParser();
        var xml = '<collection type="legacy-image-pyramid"></collection>';
        var doc = parser.parseFromString(xml, "text/xml");

        assert.throws(function() {
            source.configure(doc);
        }, /Collections not yet supported/, 'should throw collection error');
    });

    QUnit.test('configure from XML - error element', function(assert) {
        var source = new OpenSeadragon.LegacyTileSource([
            { url: 'test.jpg', width: 100, height: 100 }
        ]);

        var parser = new DOMParser();
        var xml = '<error type="legacy-image-pyramid">Something went wrong</error>';
        var doc = parser.parseFromString(xml, "text/xml");

        assert.throws(function() {
            source.configure(doc);
        }, /Error:/, 'should throw error element error');
    });

    QUnit.test('configure from XML - unknown element', function(assert) {
        var source = new OpenSeadragon.LegacyTileSource([
            { url: 'test.jpg', width: 100, height: 100 }
        ]);

        var parser = new DOMParser();
        var xml = '<unknown type="legacy-image-pyramid"></unknown>';
        var doc = parser.parseFromString(xml, "text/xml");

        assert.throws(function() {
            source.configure(doc);
        }, /Unknown element/, 'should throw unknown element error');
    });

    QUnit.test('configure from invalid XML', function(assert) {
        var source = new OpenSeadragon.LegacyTileSource([
            { url: 'test.jpg', width: 100, height: 100 }
        ]);

        assert.throws(function() {
            source.configure(null);
        }, /Xml/, 'should throw XML error for null');

        assert.throws(function() {
            source.configure({});
        }, /Xml/, 'should throw XML error for plain object without documentElement');
    });

})();
