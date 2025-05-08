(function() {

    var id = "http://example.com/identifier";

    var configure = function(data) {
        return OpenSeadragon.IIIFTileSource.prototype.configure.apply(
            new OpenSeadragon.TileSource(), [ data, 'http://example.com/identifier' ]
        );
    };

    var getSource = function( data ) {
        var options = configure( data );
        return new OpenSeadragon.IIIFTileSource( options );
    };

    var infoXml10level0 = new DOMParser().parseFromString('<?xml version="1.0" encoding="UTF-8"?>' +
            '<info xmlns="http://library.stanford.edu/iiif/image-api/ns/">' +
            '<identifier>http://example.com/identifier</identifier>' +
            '<width>6000</width>' +
            '<height>4000</height>' +
            '<scale_factors>' +
            '<scale_factor>1</scale_factor>' +
            '<scale_factor>2</scale_factor>' +
            '<scale_factor>4</scale_factor>' +
            '</scale_factors>' +
            '<profile>http://library.stanford.edu/iiif/image-api/compliance.html#level0</profile>' +
            '</info>',
            'text/xml'
        ),
        infoXml10level1 = new DOMParser().parseFromString('<?xml version="1.0" encoding="UTF-8"?>' +
            '<info xmlns="http://library.stanford.edu/iiif/image-api/ns/">' +
            '<identifier>http://example.com/identifier</identifier>' +
            '<width>6000</width>' +
            '<height>4000</height>' +
            '<profile>http://library.stanford.edu/iiif/image-api/compliance.html#level1</profile>' +
            '</info>',
            'text/xml'
        ),
        infoJson10level0 = {
            "identifier": id,
            "width": 2000,
            "height": 1000,
            "profile" : "http://library.stanford.edu/iiif/image-api/compliance.html#level0"
        },
        infoJson10level1 = {
            "identifier": id,
            "width": 2000,
            "height": 1000,
            "profile" : "http://library.stanford.edu/iiif/image-api/compliance.html#level1"
        },
        infoJson11level0 = {
            "@context": "http://library.stanford.edu/iiif/image-api/1.1/context.json",
            "@id": id,
            "width": 2000,
            "height": 1000,
            "profile": "http://library.stanford.edu/iiif/image-api/1.1/compliance.html#level0"
        },
        infoJson11level1 = {
            "@context": "http://library.stanford.edu/iiif/image-api/1.1/context.json",
            "@id": id,
            "width": 2000,
            "height": 1000,
            "profile": "http://library.stanford.edu/iiif/image-api/1.1/compliance.html#level1"
        },
        infoJson11level1WithTiles = {
            "@context": "http://library.stanford.edu/iiif/image-api/1.1/context.json",
            "@id": id,
            "width": 2000,
            "height": 1000,
            "tile_width": 512,
            "tile_height": 256,
            "profile": "http://library.stanford.edu/iiif/image-api/1.1/compliance.html#level1"
        },
        infoJson2level0 = {
            "@context": "http://iiif.io/api/image/2/context.json",
            "@id": id,
            "width": 2000,
            "height": 1000,
            "sizes": [
                { width: 2000, height: 1000 },
                { width: 1000, height: 500 }
            ],
            "profile": ["http://iiif.io/api/image/2/level0.json"]
        },
        infoJson2level0sizeByW = {
            "@context": "http://iiif.io/api/image/2/context.json",
            "@id": id,
            "width": 2000,
            "height": 1000,
            "profile": ["http://iiif.io/api/image/2/level0.json", {"supports": "sizeByW"} ]
        },
        infoJson2level1 = {
            "@context": "http://iiif.io/api/image/2/context.json",
            "@id": id,
            "width": 2000,
            "height": 1000,
            "profile": ["http://iiif.io/api/image/2/level1.json"]
        },
        infoJson3level0 = {
            "@context": "http://iiif.io/api/image/3/context.json",
            "id": id,
            "width": 2000,
            "height": 1000,
            "sizes": [
                { width: 2000, height: 1000 },
                { width: 1000, height: 500 }
            ],
            "profile": "level0"
        },
        infoJson3level0WithTiles = {
            "@context": "http://iiif.io/api/image/3/context.json",
            "id": id,
            "width": 2000,
            "height": 1000,
            "tiles": [
                { "width": 256, "scaleFactors": [ 2, 4, 1 ] }
            ],
            "sizes": [
                { width: 2000, height: 1000 },
                { width: 1000, height: 500 },
                { width: 500, height: 250 }
            ],
            "profile": "level0"
        },
        infoJson3level0ContextExtension = {
            "@context": [
                "http://iiif.io/api/image/3/context.json",
                {
                    "example": "http://example.com/vocab"
                }
            ],
            "id": id,
            "width": 2000,
            "height": 1000,
            "profile": "level0"
        },
        infoJson3level0sizeByW = {
            "@context": "http://iiif.io/api/image/3/context.json",
            "id": id,
            "width": 2000,
            "height": 1000,
            "profile": "level0",
            "extraFeatures": "sizeByW"
        },
        infoJson3level0sizeByWh = {
            "@context": "http://iiif.io/api/image/3/context.json",
            "id": id,
            "width": 2000,
            "height": 1000,
            "profile": "level0",
            "extraFeatures": "sizeByWh"
        },
        infoJson3level1 = {
            "@context": "http://iiif.io/api/image/3/context.json",
            "id": id,
            "width": 2000,
            "height": 1000,
            "profile": "level1"
        },
        infoJson3DescendingSizeOrder = {
            "@context": "http://iiif.io/api/image/3/context.json",
            "id": id,
            "width": 2000,
            "height": 1000,
            "tiles": [
                { "width": 512, "scaleFactors": [ 1, 2, 4 ] }
            ],
            "sizes": [
                { width: 2000, height: 1000 },
                { width: 1000, height: 500 },
                { width: 500, height: 250 }
            ],
            "profile": "level1",
        };

    QUnit.module('IIIF');

    QUnit.test('IIIFTileSource.configure determines correct version', function(assert) {
        var options1_0xml = configure(infoXml10level0);
        assert.ok(options1_0xml.version);
        assert.equal(options1_0xml.version, 1, 'Version is 1 for version 1.0 info.xml');

        var options1_0 = configure(infoJson10level0);
        assert.ok(options1_0.version);
        assert.equal(options1_0.version, 1, 'Version is 1 for version 1.0 info.json');

        var options1_1 = configure(infoJson11level0);
        assert.ok(options1_1.version);
        assert.equal(options1_1.version, 1, 'Version is 1 for version 1.1 info.json');

        var options2 = configure(infoJson2level0);
        assert.ok(options2.version);
        assert.equal(options2.version, 2, 'Version is 2 for version 2 info.json');

        var options3 = configure(infoJson3level0);
        assert.ok(options3.version);
        assert.equal(options3.version, 3, 'Version is 3 for version 3 info.json');

        var options3withContextExtension = configure(infoJson3level0ContextExtension);
        assert.ok(options3withContextExtension.version);
        assert.equal(options3withContextExtension.version, 3, 'Version is 3 for version 3 info.json');
    });

    QUnit.test('IIIFTileSource private function canBeTiled works as expected', function(assert) {
        var canBeTiled = function( data ) {
            var source = getSource( data );
            return source.__testonly__.canBeTiled( source );
        };

        assert.notOk(canBeTiled(infoXml10level0));
        assert.ok(canBeTiled(infoXml10level1));
        assert.notOk(canBeTiled(infoJson10level0));
        assert.ok(canBeTiled(infoJson10level1));
        assert.notOk(canBeTiled(infoJson11level0));
        assert.ok(canBeTiled(infoJson11level1));
        assert.notOk(canBeTiled(infoJson2level0));
        assert.ok(canBeTiled(infoJson2level0sizeByW));
        assert.ok(canBeTiled(infoJson2level1));
        assert.notOk(canBeTiled(infoJson3level0));
        assert.notOk(canBeTiled(infoJson3level0sizeByW));
        assert.ok(canBeTiled(infoJson3level0sizeByWh));
        assert.ok(canBeTiled(infoJson3level1));
    });

    QUnit.test('IIIFTileSource private function constructLevels creates correct URLs for legacy pyramid', function( assert ) {
        var constructLevels = function( data ) {
            var source = getSource( data );
            return source.__testonly__.constructLevels( source );
        };
        var levelsVersion2 = constructLevels(infoJson2level0);
        assert.ok(Array.isArray(levelsVersion2));
        assert.equal(levelsVersion2.length, 2, 'Constructed levels contain 2 entries');
        assert.equal(levelsVersion2[0].url, 'http://example.com/identifier/full/1000,/0/default.jpg');
        assert.equal(levelsVersion2[1].url, 'http://example.com/identifier/full/2000,/0/default.jpg');
        // FIXME see below
        // assert.equal(levelsVersion2[1].url, 'http://example.com/identifier/full/full/0/default.jpg');

        var levelsVersion3 = constructLevels(infoJson3level0);
        assert.ok(Array.isArray(levelsVersion3));
        assert.equal(levelsVersion3.length, 2, 'Constructed levels contain 2 entries');
        assert.equal(levelsVersion3[0].url, 'http://example.com/identifier/full/1000,500/0/default.jpg');
        assert.equal(levelsVersion3[1].url, 'http://example.com/identifier/full/2000,1000/0/default.jpg');
        /*
         * FIXME: following https://iiif.io/api/image/3.0/#47-canonical-uri-syntax and
         * https://iiif.io/api/image/2.1/#canonical-uri-syntax, I'd expect 'max' to be required to
         * be served by a level 0 compliant service instead of 'w,h', 'full' instead of 'w,' respectively.
         */
        //assert.equal(levelsVersion3[1].url, 'http://example.com/identifier/full/max/0/default.jpg');
    });

    QUnit.test('IIIFTileSource.getTileUrl returns the correct URLs', function( assert ) {
        var source11Level1 = getSource(infoJson11level1);
        assert.equal(source11Level1.getTileUrl(0, 0, 0), "http://example.com/identifier/full/8,/0/native.jpg");
        assert.equal(source11Level1.getTileUrl(7, 0, 0), "http://example.com/identifier/0,0,1024,1000/512,500/0/native.jpg");
        assert.equal(source11Level1.getTileUrl(7, 1, 0), "http://example.com/identifier/1024,0,976,1000/488,500/0/native.jpg");
        assert.equal(source11Level1.getTileUrl(8, 0, 0), "http://example.com/identifier/0,0,512,512/512,512/0/native.jpg");

        var source2Level1 = getSource(infoJson2level1);
        assert.equal(source2Level1.getTileUrl(0, 0, 0), "http://example.com/identifier/full/8,/0/default.jpg");
        assert.equal(source2Level1.getTileUrl(7, 0, 0), "http://example.com/identifier/0,0,1024,1000/512,500/0/default.jpg");
        assert.equal(source2Level1.getTileUrl(7, 1, 0), "http://example.com/identifier/1024,0,976,1000/488,500/0/default.jpg");
        assert.equal(source2Level1.getTileUrl(8, 0, 0), "http://example.com/identifier/0,0,512,512/512,512/0/default.jpg");
        assert.equal(source2Level1.getTileUrl(8, 3, 0), "http://example.com/identifier/1536,0,464,512/464,512/0/default.jpg");
        assert.equal(source2Level1.getTileUrl(8, 0, 1), "http://example.com/identifier/0,512,512,488/512,488/0/default.jpg");
        assert.equal(source2Level1.getTileUrl(8, 3, 1), "http://example.com/identifier/1536,512,464,488/464,488/0/default.jpg");

        var source2Level0 = getSource(infoJson2level0);
        assert.equal(source2Level0.getTileUrl(0, 0, 0), "http://example.com/identifier/full/1000,/0/default.jpg");
        assert.equal(source2Level0.getTileUrl(1, 0, 0), "http://example.com/identifier/full/2000,/0/default.jpg");

        var source3Level0WithTiles = getSource(infoJson3level0WithTiles);
        assert.equal(source3Level0WithTiles.getTileUrl(0, 0, 0), "http://example.com/identifier/0,0,1024,1000/256,250/0/default.jpg");
        assert.equal(source3Level0WithTiles.getTileUrl(1, 1, 0), "http://example.com/identifier/512,0,512,512/256,256/0/default.jpg");
        assert.equal(source3Level0WithTiles.getTileUrl(2, 0, 0), "http://example.com/identifier/0,0,256,256/256,256/0/default.jpg");

        var source3Level1 = getSource(infoJson3level1);
        assert.equal(source3Level1.getTileUrl(0, 0, 0), "http://example.com/identifier/full/8,4/0/default.jpg");
        assert.equal(source3Level1.getTileUrl(7, 0, 0), "http://example.com/identifier/0,0,1024,1000/512,500/0/default.jpg");
        assert.equal(source3Level1.getTileUrl(7, 1, 0), "http://example.com/identifier/1024,0,976,1000/488,500/0/default.jpg");
        assert.equal(source3Level1.getTileUrl(8, 0, 0), "http://example.com/identifier/0,0,512,512/512,512/0/default.jpg");
        assert.equal(source3Level1.getTileUrl(8, 3, 0), "http://example.com/identifier/1536,0,464,512/464,512/0/default.jpg");
        assert.equal(source3Level1.getTileUrl(8, 0, 1), "http://example.com/identifier/0,512,512,488/512,488/0/default.jpg");
        assert.equal(source3Level1.getTileUrl(8, 3, 1), "http://example.com/identifier/1536,512,464,488/464,488/0/default.jpg");

        var source3DescendingSizeOrder = getSource(infoJson3DescendingSizeOrder);
        assert.equal(source3DescendingSizeOrder.getTileUrl(0, 0, 0), "http://example.com/identifier/full/500,250/0/default.jpg");
        assert.equal(source3DescendingSizeOrder.getTileUrl(1, 1, 0), "http://example.com/identifier/1024,0,976,1000/488,500/0/default.jpg");
        assert.equal(source3DescendingSizeOrder.getTileUrl(2, 0, 0), "http://example.com/identifier/0,0,512,512/512,512/0/default.jpg");
    });

})();
