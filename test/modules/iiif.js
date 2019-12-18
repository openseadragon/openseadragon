(function() {

    var id = "http://example.com/identifier";

    var configure = function(data) {
        return OpenSeadragon.IIIFTileSource.prototype.configure.apply(
            new OpenSeadragon.TileSource(), [ data, 'http://example.com/identifier' ]
        );
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
        infoXml10level0sizeByW,
        infoXml10level1,
        infoJson10level0 = {
            "identifier": id,
            "width": 200,
            "height": 100,
            "profile" : "http://library.stanford.edu/iiif/image-api/compliance.html#level0"
        },
        infoJson10level0sizeByW,
        infoJson10level1,
        infoJson11level0 = {
            "@context": "http://library.stanford.edu/iiif/image-api/1.1/context.json",
            "@id": id,
            "width": 200,
            "height": 100,
            "profile": "http://library.stanford.edu/iiif/image-api/1.1/compliance.html#level0"
        },
        infoJson11level0sizeByW,
        infoJson11level1,
        infoJson2level0 = {
            "@context": "http://iiif.io/api/image/2/context.json",
            "@id": id,
            "width": 200,
            "height": 100,
            "profile": ["http://iiif.io/api/image/2/level0.json"]
        },
        infoJson2level0sizeByW,
        infoJson2level1,
        infoJson3level0 = {
            "@context": "http://iiif.io/api/image/3/context.json",
            "id": id,
            "width": 200,
            "height": 100,
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
            "width": 200,
            "height": 100,
            "profile": "level0"
        },
        infoJson3level0sizeByW,
        infoJson3level1;

    QUnit.test('IIIFTileSource.configure determins correct version', function(assert) {
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

})();
