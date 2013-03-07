(function() {

    asyncTest('OpenSeadragon', function() {
        $(document).ready(function() {
            var viewer = OpenSeadragon({
                id:            'example',
                prefixUrl:     '/build/openseadragon/images/',
                tileSources:   '/test/data/testpattern.dzi', 
                showNavigator:  true
            });

            ok(viewer, 'Viewer exists');
            viewer.addHandler('open', function(eventSender, eventData) {
                ok(true, 'Open event was sent');
                ok(eventSender === viewer, 'Sender of open event was viewer');
                ok(eventData, 'Handler also received event data');
                start();
            });
        });
    });  
  
})();
