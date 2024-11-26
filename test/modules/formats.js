/* global QUnit, Util */

(function() {

    // This module tests whether our various file formats can be opened.
    // TODO: Add more file formats (with corresponding test data).

    var viewer = null;

    QUnit.module('Formats', {
        beforeEach: function () {
            var example = document.createElement("div");
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
    var testOpenUrl = function(relativeUrl, assert) {
        testOpen('/test/data/' + relativeUrl, assert);
    };

    var testOpen = function(tileSource, assert) {
        const done = assert.async();

        viewer = OpenSeadragon({
            id:            'example',
            prefixUrl:     '/build/openseadragon/images/',
            tileSources:   tileSource
        });

        assert.ok(viewer, 'Viewer exists');

        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            assert.ok(true, 'Open event was sent');
            viewer.addHandler('tiled-image-drawn', tileDrawnHandler);
        };

        var tileDrawnHandler = function(event) {
            viewer.removeHandler('tiled-image-drawn', tileDrawnHandler);
            assert.ok(true, 'A tiled image has been drawn');
            viewer.addHandler('close', closeHandler);
            viewer.close();
        };

        var closeHandler = function(event) {
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

})();
