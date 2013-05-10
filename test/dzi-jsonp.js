(function() {

    // TODO: How to know if a tile has been drawn? The tile-drawn event used below
    // is defunct.

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
                viewer.addHandler('tile-drawn', tileDrawnHandler);
            };

            var tileDrawnHandler = function(eventSender, eventData) {
                viewer.removeHandler('tile-drawn', tileDrawnHandler);
                ok(true, 'A tile has been drawn');
                start();
            };

            viewer.addHandler('open', openHandler);
        });
    });

    // ----------
    // asyncTest('Close', function() {
    //     var closeHandler = function() {
    //         viewer.removeHandler('close', closeHandler);
    //         $('#example').empty();
    //         ok(true, 'Close event was sent');
    //         start();
    //     };

    //     viewer.addHandler('close', closeHandler);
    //     viewer.close();
    // });
  
})();
