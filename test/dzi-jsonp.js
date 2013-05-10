(function() {

    module('DZI JSONp');

    var viewer = null;

    // ----------
    asyncTest('Open', function() {
        $(document).ready(function() {
            viewer = OpenSeadragon({
                id:            'example',
                prefixUrl:     '/build/openseadragon/images/',
                tileSources:   '/test/data/testpattern.js'
            });

            ok(viewer, 'Viewer exists');

            var openHandler = function(eventSender, eventData) {
                viewer.removeHandler('open', openHandler);
                ok(true, 'Open event was sent');
                viewer.drawer.viewer = viewer;

                timeout = setTimeout(function() {
                    viewer.removeHandler('tile-drawn', tileDrawnHandler);
                    ok(false, 'taking too long');
                    start();
                }, 2000);

                viewer.addHandler('tile-drawn', tileDrawnHandler);
            };

            var tileDrawnHandler = function(eventSender, eventData) {
                viewer.removeHandler('tile-drawn', tileDrawnHandler);
                ok(true, 'A tile has been drawn');
                clearTimeout(timeout);
                start();
            };

            viewer.addHandler('open', openHandler);
        });
    });

    // ----------
    asyncTest('Close', function() {
        var closeHandler = function() {
            viewer.removeHandler('close', closeHandler);
            $('#example').empty();
            ok(true, 'Close event was sent');
            start();
        };

        viewer.addHandler('close', closeHandler);
        viewer.close();
    });
  
})();
