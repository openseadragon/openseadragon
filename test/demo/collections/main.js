/* globals $, App */

(function() {

    window.App = {
        init: function() {
            var self = this;

            var config = {
                debugMode: true,
                zoomPerScroll: 1.02,
                // showNavigator: true,
                id: "contentDiv",
                prefixUrl: "../../../build/openseadragon/images/"
            };

            // config.viewportMargins = {
            //     top: 250,
            //     left: 250,
            //     right: 250,
            //     bottom: 250
            // };

            this.viewer = OpenSeadragon(config);

            this.basicTest();
        },

        // ----------
        basicTest: function() {
            this.viewer.open("../../data/testpattern.dzi");
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
        },

        // ----------
        cjTest: function() {
            var imageKey = "e-pluribus-unum";
            var imageXML = '<?xml version="1.0" encoding="UTF-8"?><Image TileSize="254" Overlap="1" Format="png" xmlns="http://schemas.microsoft.com/deepzoom/2008"><Size Width="88560" Height="88560"/></Image>';
            var $xml = $($.parseXML(imageXML));
            var $image = $xml.find('Image');
            var $size = $xml.find('Size');

            var dzi = {
                Image: {
                    xmlns: $image.attr('xmlns'),
                    Url: "http://chrisjordan.com/dzi/" + imageKey + '_files/',
                    Format: $image.attr('Format'),
                    Overlap: $image.attr('Overlap'),
                    TileSize: $image.attr('TileSize'),
                    Size: {
                        Height: $size.attr('Height'),
                        Width: $size.attr('Width')
                    }
                }
            };

            this.viewer.open(dzi, {
                width: 100
            });
        },

        // ----------
        stanfordTest: function() {
            var info = {"@context":"http://library.stanford.edu/iiif/image-api/1.1/context.json","@id":"http://ids.lib.harvard.edu/ids/iiif/48530377","width":6251,"height":109517,"scale_factors":[1,2,4,8,16,32],"tile_width":256,"tile_height":256,"formats":["jpg"],"qualities":["native"],"profile":"http://library.stanford.edu/iiif/image-api/1.1/compliance.html#level1"};

            this.viewer.open(info);
        }
    };

    $(document).ready(function() {
        App.init();
    });

})();
