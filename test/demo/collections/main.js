(function() {

    var App = {
        init: function() {
            var self = this;

            this.viewer = OpenSeadragon( {
                // debugMode: true,
                id: "contentDiv",
                prefixUrl: "../../../build/openseadragon/images/",
                tileSources: "../../data/tall.dzi"
            } );

            this.viewer.addHandler( "open", function() {
                self.addLayer();
            });
        },

        // ----------
        addLayer: function() {
            var self = this;

            var options = {
                tileSource: '../../data/wide.dzi',
                opacity: 1,
                x: 0.5,
                y: 0.5
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
