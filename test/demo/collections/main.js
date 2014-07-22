(function() {

    var App = {
        init: function() {
            var self = this;

            this.viewer = OpenSeadragon( {
                debugMode: true,
                zoomPerScroll: 1.02,
                id: "contentDiv",
                prefixUrl: "../../../build/openseadragon/images/"
            } );

            this.viewer.addHandler( "open", function() {
                self.addLayer();
            });

            this.viewer.open("../../data/tall.dzi", {
                x: 1.5,
                y: 0,
                scale: 1
            });
        },

        // ----------
        addLayer: function() {
            var self = this;

            var options = {
                tileSource: '../../data/wide.dzi',
                opacity: 1,
                x: 0,
                y: 1.5,
                scale: 4
            };

            var addLayerHandler = function( event ) {
                if ( event.options === options ) {
                    self.viewer.removeHandler( "add-layer", addLayerHandler );
                }
            };
            this.viewer.addHandler( "add-layer", addLayerHandler );
            this.viewer.addLayer( options );
        }
    };

    $(document).ready(function() {
        App.init();
    });

})();
