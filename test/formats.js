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
    asyncTest('IIIF 1.0 JSON', function() {
        testOpen('iiif1_0.json');
    });

    // ----------
    asyncTest('IIIF 1.0 XML', function() {
        testOpen('iiif1_0.xml');
    });

    // ----------
    asyncTest('IIIF 1.1 JSON', function() {
        testOpen('iiif1_1.json');
    });

})();
