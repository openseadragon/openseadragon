/* global module, asyncTest, $, ok, equal, notEqual, start, test, Util, testLog */

( function() {
    var viewer;

    module( 'Layers', {
        setup: function() {
            $( '<div id="layersexample"></div>' ).appendTo( "#qunit-fixture" );

            testLog.reset();

            viewer = OpenSeadragon( {
                id: 'layersexample',
                prefixUrl: '/build/openseadragon/images/',
                springStiffness: 100 // Faster animation = faster tests
            });
        },
        teardown: function() {
            if ( viewer && viewer.close ) {
                viewer.close();
            }

            viewer = null;
            $( "#layersexample" ).remove();
        }
    } );

    // ----------
    asyncTest( 'Layers operations', function() {
        expect( 23 );
        viewer.addHandler( "open", function( ) {
            equal( 1, viewer.getLayersCount( ),
                "One layer should be present after opening." );
            var options = {
                tileSource: {
                    type: 'legacy-image-pyramid',
                    levels: [ {
                            url: "data/A.png",
                            width: 1000,
                            height: 1000
                        } ]
                }
            };
            viewer.addLayer( options );
            viewer.addHandler( "add-layer", function addFirstLayerHandler( event ) {
                viewer.removeHandler( "add-layer", addFirstLayerHandler );
                var layer1 = event.drawer;
                equal( viewer.getLayersCount( ), 2,
                    "2 layers should be present after adding a layer." );
                equal( options, event.options,
                    "The options should be transmitted via the event." );
                equal( viewer.getLevelOfLayer( layer1 ), 1,
                    "The first added layer should have a level of 1" );
                equal( viewer.getLayerAtLevel( 1 ), layer1,
                    "The layer at level 1 should be the first added layer." );

                viewer.addLayer( options );
                viewer.addHandler( "add-layer", function addSecondLayerHandler( event ) {
                    viewer.removeHandler( "add-layer", addSecondLayerHandler );
                    var layer2 = event.drawer;
                    equal( viewer.getLayersCount( ), 3,
                        "3 layers should be present after adding a second layer." );
                    equal( viewer.getLevelOfLayer( layer2 ), 2,
                        "If not specified, a layer should be added with the highest level." );
                    equal( viewer.getLayerAtLevel( 2 ), layer2,
                        "The layer at level 2 should be the second added layer." );

                    viewer.addHandler( "layer-level-changed",
                        function layerLevelChangedHandler( event ) {
                            viewer.removeHandler( "layer-level-changed",
                                layerLevelChangedHandler );
                            equal( event.drawer, layer2,
                                "The layer which changed level should be layer2" );
                            equal( event.previousLevel, 2, "Previous level should be 2." );
                            equal( event.newLevel, 1, "New level should be 1." );
                        });
                    viewer.setLayerLevel( layer2, 1 );
                    equal( viewer.getLevelOfLayer( layer2 ), 1,
                        "Layer2 level should be 1 after setLayerLevel." );
                    equal( viewer.getLevelOfLayer( layer1 ), 2,
                        "Layer1 level should be 2 after setLayerLevel." );
                    equal( viewer.getLayerAtLevel( 1 ), layer2,
                        "The layer at level 1 should be layer2." );
                    equal( viewer.getLayerAtLevel( 2 ), layer1,
                        "The layer at level 2 should be layer1." );

                    options.level = 2;
                    options.tileSource.levels[0].url = "data/CCyan.png";
                    options.opacity = 0.5;
                    viewer.addLayer( options );
                    viewer.addHandler( "add-layer", function addThirdLayerHandler( event ) {
                        viewer.removeHandler( "add-layer", addThirdLayerHandler );
                        var layer3 = event.drawer;
                        equal( viewer.getLayersCount( ), 4,
                            "4 layers should be present after adding a third layer." );
                        equal( viewer.getLevelOfLayer( layer3 ), 2,
                            "Layer 3 should be added with level 2." );
                        equal( viewer.getLevelOfLayer( layer2 ), 1,
                            "Layer 2 should stay at level 1." );

                        viewer.addHandler( "remove-layer", function removeLayerHandler( event ) {
                            viewer.removeHandler( "remove-layer", removeLayerHandler );

                            equal( layer2, event.drawer, "Removed layer should be layer2." );

                            equal( viewer.getLevelOfLayer( layer1 ), 2,
                                "Layer 1 should be at level 2." );
                            equal( viewer.getLevelOfLayer( layer2 ), -1,
                                "Layer 2 should be at level -1." );
                            equal( viewer.getLevelOfLayer( layer3 ), 1,
                                "Layer 3 should be at level 1." );

                        });
                        viewer.removeLayer( layer2 );

                        options.tileSource.levels[0].width = 500;
                        viewer.addHandler( "add-layer-failed", function addLayerFailed( event ) {
                            viewer.removeHandler( "add-layer-failed", addLayerFailed );

                            equal( viewer.getLayersCount(), 3 );

                            start();
                        });
                        viewer.addLayer( options );
                    });
                });
            });
        });
        viewer.open( '/test/data/testpattern.dzi' );
    });

    asyncTest( 'Sequences as layers', function() {

        var options = {
            tileSource: [{
                    type: 'legacy-image-pyramid',
                    levels: [{
                            url: "data/A.png",
                            width: 1000,
                            height: 1000
                        }]
                }, {
                    type: 'legacy-image-pyramid',
                    levels: [{
                            url: "data/BBlue.png",
                            width: 1000,
                            height: 1000
                        }]
                }]
        };

        viewer.addHandler( "open", function openHandler() {
            viewer.removeHandler( "open", openHandler );

            viewer.addHandler( "add-layer-failed",
                function addLayerFailedHandler( event ) {
                    viewer.removeHandler( "add-layer-failed", addLayerFailedHandler );
                    equal( event.message, "Sequences can not be added as layers." );
                    equal( event.options, options, "Layer failed event should give the options." );
                    start();
                } );
            viewer.addLayer( options );

        });
        viewer.open( '/test/data/testpattern.dzi' );
    });


    asyncTest( 'Reassign base layer', function() {

        var options = {
            tileSource: {
                type: 'legacy-image-pyramid',
                levels: [{
                        url: "data/A.png",
                        width: 1000,
                        height: 1000
                    }]
            },
            level: 0
        };
        viewer.addHandler( "open", function openHandler( ) {
            viewer.removeHandler( "open", openHandler );
            var testPatternDrawer = viewer.drawer;
            equal( viewer.drawer, testPatternDrawer, "Viewer.drawer should be set to testPatternDrawer." );
            viewer.addHandler( "add-layer", function addLayerHandler( event ) {
                viewer.removeHandler( "add-layer", addLayerHandler );
                var aDrawer = event.drawer;
                equal( viewer.drawer, aDrawer, "Viewer.drawer should be set to aDrawer." );
                viewer.setLayerLevel( aDrawer, 1 );
                equal( viewer.drawer, testPatternDrawer, "Viewer.drawer should be set back to testPatternDrawer." );

                viewer.removeLayer( viewer.drawer );
                equal( viewer.drawer, aDrawer, "Viewer.drawer must be reassigned when removing base layer." );

                viewer.removeLayer( viewer.drawer );
                ok( !viewer.isOpen(), "Viewer should be closed when removing last layer." );

                start();
            });
            viewer.addLayer( options );
        });
        viewer.open( '/test/data/testpattern.dzi' );
    });

    asyncTest( 'Layers and sequences', function() {
        expect( 1 );

// TODO: Remove workaround when issue #321 is fixed.
// https://github.com/openseadragon/openseadragon/issues/321
//    viewer.open( [{
//            type: 'legacy-image-pyramid',
//                levels: [ {
//                url: "data/A.png",
//                    width: 1000,
//                    height: 1000
//                }]
//            },
//            {
//            type: 'legacy-image-pyramid',
//                levels: [ {
//                url: "data/BBlue.png",
//                    width: 1000,
//                    height: 1000
//                }]}] );

        viewer.close();
        viewer = OpenSeadragon({
            id: 'layersexample',
            prefixUrl: '/build/openseadragon/images/',
            springStiffness: 100, // Faster animation = faster tests
            tileSources: [{
                    type: 'legacy-image-pyramid',
                    levels: [{
                            url: "data/A.png",
                            width: 1000,
                            height: 1000
                        }]
                },
                {
                    type: 'legacy-image-pyramid',
                    levels: [{
                            url: "data/BBlue.png",
                            width: 1000,
                            height: 1000
                        }]
                }]
        });
// End workaround

        var options = {
            tileSource: {
                type: 'legacy-image-pyramid',
                levels: [{
                        url: "data/CCyan.png",
                        width: 1000,
                        height: 1000
                    }]
            }
        };

        viewer.addHandler( "open", function openHandler() {
            viewer.addHandler( "add-layer", function addLayerHandler( event ) {
                viewer.removeHandler( "add-layer", addLayerHandler );

                var layer = event.drawer;
                try {
                    viewer.setLayerLevel( layer, 0 );
                } catch (e) {
                    ok( true );
                }
                start();
            } );
            viewer.addLayer( options );
        });

    });
})();
