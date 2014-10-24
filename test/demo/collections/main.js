/* globals $, App */

(function() {

    window.App = {
        init: function() {
            var self = this;

            this.viewer = OpenSeadragon( {
                debugMode: true,
                zoomPerScroll: 1.02,
                showNavigator: true,
                id: "contentDiv",
                prefixUrl: "../../../build/openseadragon/images/"
            } );

            this.crossTest();
        },

        // ----------
        crossTest: function() {
            var self = this;

            this.viewer.addHandler( "open", function() {
                var options = {
                    tileSource: '../../data/wide.dzi',
                    opacity: 1,
                    x: 0,
                    y: 1.5,
                    height: 1
                };

                var addItemHandler = function( event ) {
                    if ( event.options === options ) {
                        self.viewer.world.removeHandler( "add-item", addItemHandler );
                        self.viewer.viewport.goHome();
                    }
                };
                self.viewer.world.addHandler( "add-item", addItemHandler );
                self.viewer.addTiledImage( options );
            });

            this.viewer.open("../../data/tall.dzi", {
                x: 1.5,
                y: 0,
                width: 1
            });
        },

        // ----------
        gridTest: function() {
            var self = this;
            var startX = -3;
            var expected = 0;
            var loaded = 0;

            this.viewer.addHandler( "open", function() {
                self.viewer.world.addHandler('add-item', function() {
                    loaded++;
                    if (loaded === expected) {
                        self.viewer.viewport.goHome();
                    }
                });

                var x, y;
                for (y = 0; y < 6; y++) {
                    for (x = 0; x < 6; x++) {
                        if (!x && !y) {
                            continue;
                        }

                        var options = {
                            tileSource: '../../data/testpattern.dzi',
                            x: startX + x,
                            y: y,
                            width: 1
                        };

                        expected++;
                        self.viewer.addTiledImage( options );
                    }
                }
            });

            this.viewer.open("../../data/testpattern.dzi", {
                x: startX,
                y: 0,
                width: 1
            });
        },

        // ----------
        bigTest: function() {
            this.viewer.open("../../data/testpattern.dzi", {
                x: -2,
                y: -2,
                width: 6
            });
        }
    };

    $(document).ready(function() {
        App.init();
    });

})();
