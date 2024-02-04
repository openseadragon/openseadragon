/* globals $, App */

(function() {

    window.App = {
        init: function() {
            var self = this;

            var testInitialOpen = true;
            var testOverlays = false;
            var testMargins = false;
            var testNavigator = false;
            var margins;

            var config = {
                // debugMode: true,
                zoomPerScroll: 1.02,
                showNavigator: testNavigator,
                // defaultZoomLevel: 2,
                // homeFillsViewer: true,
                // sequenceMode: true,
                // showReferenceStrip: true,
                // referenceStripScroll: 'vertical',
                navPrevNextWrap: false,
                preserveViewport: false,
                // collectionMode: true,
                // collectionRows: 1,
                // collectionLayout: 'vertical',
                // collectionTileSize: 10,
                // collectionTileMargin: 10,
                // wrapHorizontal: true,
                // wrapVertical: true,
                id: "contentDiv",
                prefixUrl: "../../../build/openseadragon/images/"
            };

            var highsmith = {
                Image: {
                    xmlns: "http://schemas.microsoft.com/deepzoom/2008",
                    Url: "http://openseadragon.github.io/example-images/highsmith/highsmith_files/",
                    Format: "jpg",
                    Overlap: "2",
                    TileSize: "256",
                    Size: {
                        Height: "9221",
                        Width:  "7026"
                    }
                }
            };

            if (testInitialOpen) {
                config.tileSources = [
                    {
                        tileSource: "../../data/testpattern.dzi",
                        x: 4,
                        y: 2,
                        width: 2
                    },
                    {
                        tileSource: "../../data/tall.dzi",
                        x: 1.5,
                        y: 0,
                        width: 1
                    },
                    {
                        tileSource: '../../data/wide.dzi',
                        opacity: 1,
                        x: 0,
                        y: 1.5,
                        height: 1
                    }
                ];

                // config.tileSources = {
                //     tileSource: highsmith,
                //     width: 1
                // };
            }

            if (testOverlays) {
                config.overlays = [
                    {
                        id: "overlay1",
                        x: 2,
                        y: 0,
                        width: 0.25,
                        height: 0.25
                    },
                    {
                        px: 13,
                        py: 120,
                        width: 124,
                        height: 132,
                        id: "overlay"
                    },
                    {
                        px: 400,
                        py: 500,
                        width: 400,
                        height: 400,
                        id: "fixed-overlay",
                        placement: "TOP_LEFT"
                    }
                ];
            }

            if (testMargins) {
                margins = {
                    top: 250,
                    left: 250,
                    right: 250,
                    bottom: 250
                };

                config.viewportMargins = margins;
            }

            this.viewer = OpenSeadragon(config);

            if (testInitialOpen) {
                function openHandler() {
                    self.viewer.removeHandler('open', openHandler);
                }

                this.viewer.addHandler( "open", openHandler);
            }

            if (testMargins) {
                this.viewer.addHandler('animation', function() {
                    var box = new OpenSeadragon.Rect(margins.left, margins.top,
                        $('#contentDiv').width() - (margins.left + margins.right),
                        $('#contentDiv').height() - (margins.top + margins.bottom));
                    // If drawDebuggingRect is implemented, use it to show the box.
                    // This is not implemented by all drawers however.
                    self.viewer.drawer.drawDebuggingRect(box);
                });
            }

            if (!testInitialOpen) {
                this.basicTest();
            }
        },

        // ----------
        shrink: function(index) {
            index = index || 0;
            var image = this.viewer.world.getItemAt(index);
            image.setWidth(image.getBounds().width * 0.3);
        },

        // ----------
        move: function(index) {
            index = index || 0;
            var image = this.viewer.world.getItemAt(index);
            var point = image.getBounds().getTopLeft();
            point.x += image.getBounds().width * 0.3;
            image.setPosition(point);
        },

        // ----------
        add: function() {
            var self = this;

            this.viewer.addTiledImage({
                tileSource: "../../data/testpattern.dzi",
                width: 1,
                success: function() {
                    self.viewer.viewport.goHome();
                }
            });
        },

        // ----------
        toggle: function() {
            var $el = $(this.viewer.element);
            $el.toggleClass('small');
        },

        // ----------
        basicTest: function() {
            var self = this;

            this.viewer.addHandler('open', function() {
            });

            this.viewer.open({
                tileSource: "../../data/testpattern.dzi",
                width: 1
            });
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

            this.viewer.open({
                tileSource: "../../data/tall.dzi",
                x: 1.5,
                y: 0,
                width: 1
            });
        },

        // ----------
        crossTest2: function() {
            this.viewer.open([
                {
                    tileSource: "../../data/tall.dzi",
                    x: 1.5,
                    y: 0,
                    width: 1
                },
                {
                    tileSource: '../../data/wide.dzi',
                    x: 0,
                    y: 1.5,
                    height: 1
                }
            ]);
        },

        // ----------
        crossTest3: function() {
            var self = this;
            var expected = 2;
            var loaded = 0;

            this.viewer.world.addHandler('add-item', function() {
                loaded++;
                if (loaded === expected) {
                    // self.viewer.viewport.goHome();
                }
            });

            this.viewer.addTiledImage({
                tileSource: "../../data/tall.dzi",
                x: 1.5,
                y: 0,
                width: 1
            });

            this.viewer.addTiledImage({
                tileSource: '../../data/wide.dzi',
                opacity: 1,
                x: 0,
                y: 1.5,
                height: 1
            });
        },

        // ----------
        collectionTest: function() {
            var tileSources = [];
            var random;
            for (var i = 0; i < 10; i++) {
                random = Math.random();
                if (random < 0.33) {
                    tileSources.push('../../data/testpattern.dzi');
                } else if (random < 0.66) {
                    tileSources.push('../../data/tall.dzi');
                } else {
                    tileSources.push('../../data/wide.dzi');
                }
            }

            this.viewer.open(tileSources);
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
                        self.viewer.viewport.goHome(true);
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

            this.viewer.open({
                tileSource: "../../data/testpattern.dzi",
                x: startX,
                y: 0,
                width: 1
            });
        },

        // ----------
        bigTest: function() {
            this.viewer.open({
                tileSource: "../../data/testpattern.dzi",
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

            this.viewer.open({
                tileSource: dzi,
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
