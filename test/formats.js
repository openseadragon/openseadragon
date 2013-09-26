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

            var openHandler = function(eventSender, eventData) {
                viewer.removeHandler('open', openHandler);
                ok(true, 'Open event was sent');
                viewer.addHandler('tiledrawn', tileDrawnHandler);
            };

            var tileDrawnHandler = function(eventSender, eventData) {
                viewer.removeHandler('tiledrawn', tileDrawnHandler);
                ok(true, 'A tile has been drawn');
                viewer.addHandler('close', closeHandler);
                viewer.close();
            };

            var closeHandler = function() {
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

})();
