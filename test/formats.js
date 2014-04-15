(function() {

    // This module tests whether our various file formats can be opened.
    // TODO: Add more file formats (with corresponding test data).

    module('Formats', {
        setup: function () {
            var example = document.createElement("div");
            example.id = "example";
            document.getElementById("qunit-fixture").appendChild(example);
        }
    });

    var viewer = null;

    // ----------
    var testOpen = function(name) {
        $(document).ready(function() {
            var timeWatcher = Util.timeWatcher(7000);

            viewer = OpenSeadragon({
                id:            'example',
                prefixUrl:     '/build/openseadragon/images/',
                tileSources:   '/test/data/' + name
            });

            ok(viewer, 'Viewer exists');

            var openHandler = function(event) {
                viewer.removeHandler('open', openHandler);
                ok(true, 'Open event was sent');
                viewer.addHandler('tile-drawn', tileDrawnHandler);
            };

            var tileDrawnHandler = function(event) {
                viewer.removeHandler('tile-drawn', tileDrawnHandler);
                ok(true, 'A tile has been drawn');
                viewer.addHandler('close', closeHandler);
                viewer.close();
            };

            var closeHandler = function(event) {
                viewer.removeHandler('close', closeHandler);
                $('#example').empty();
                ok(true, 'Close event was sent');
                timeWatcher.done();
            };

            viewer.addHandler('open', openHandler);
        });
    };

    // ----------
    asyncTest('DZI', function() {
        testOpen('testpattern.dzi');
    });

    // ----------
    asyncTest('DZI JSONp', function() {
        testOpen('testpattern.js');
    });

    // ----------
    asyncTest('DZI XML', function() {
        testOpen('testpattern.xml');
    });

    // ----------
    asyncTest('DZI XML with query parameter', function() {
        testOpen('testpattern.xml?param=value');
    });

     // ----------
    asyncTest('IIIF 1.0 JSON', function() {
        testOpen('iiif1_0.json');
    });

    // ----------
    asyncTest('IIIF 1.0 XML', function() {
        testOpen('iiif1_0.xml');
    });

    // ----------
    asyncTest('IIIF 1.1 JSON', function() {
        testOpen('iiif_1_1_tiled.json');
    });

    // ----------
    asyncTest('IIIF No Tiles, Less than 256', function() {
        testOpen('iiif_1_1_no_tiles_255.json');
    });

    // ----------
    asyncTest('IIIF No Tiles, Bet. 256 and 512', function() {
        testOpen('iiif_1_1_no_tiles_384.json');
    });

    // ----------
    asyncTest('IIIF No Tiles, Bet. 512 and 1024', function() {
        testOpen('iiif_1_1_no_tiles_768.json');
    });

    // ----------
    asyncTest('IIIF No Tiles, Larger than 1024', function() {
        testOpen('iiif_1_1_no_tiles_1048.json');
    });

})();
