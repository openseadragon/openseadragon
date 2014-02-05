/* global QUnit, module, Util, $, console, test, asyncTest, start, ok, equal */

( function() {
    var viewer;

    module( "Overlays", {
        setup: function() {
            var example = $( '<div id="example-overlays"></div>' ).appendTo( "#qunit-fixture" );
            var fixedOverlay = $( '<div id="fixed-overlay"></div>' ).appendTo(example);
            fixedOverlay.width(70);
            fixedOverlay.height(60);

            testLog.reset();
        },
        teardown: function() {
            resetTestVariables();
        }
    } );

    var resetTestVariables = function() {
        if ( viewer ) {
            viewer.close();
        }
    };

    function waitForViewer( handler, count ) {
        if ( typeof count !== "number" ) {
            count = 0;
        }
        var ready = viewer.isOpen() &&
            viewer.drawer !== null &&
            !viewer.drawer.needsUpdate() &&
            Util.equalsWithVariance( viewer.viewport.getBounds( true ).x,
                viewer.viewport.getBounds().x, 0.000 ) &&
            Util.equalsWithVariance( viewer.viewport.getBounds( true ).y,
                viewer.viewport.getBounds().y, 0.000 ) &&
            Util.equalsWithVariance( viewer.viewport.getBounds( true ).width,
                viewer.viewport.getBounds().width, 0.000 );

        if ( ready ) {
            handler();
        } else if ( count < 50 ) {
            count++;
            setTimeout( function() {
                waitForViewer( handler, count );
            }, 100 );
        } else {
            console.log( "waitForViewer:" + viewer.isOpen( ) + ":" + viewer.drawer +
                ":" + viewer.drawer.needsUpdate() );
            handler();
        }
    }

    asyncTest( 'Overlays via viewer options', function() {

        viewer = OpenSeadragon( {
            id: 'example-overlays',
            prefixUrl: '/build/openseadragon/images/',
            tileSources: [ '/test/data/testpattern.dzi', '/test/data/testpattern.dzi' ],
            springStiffness: 100, // Faster animation = faster tests
            overlays: [ {
                    x: 0.1,
                    y: 0.4,
                    width: 0.09,
                    height: 0.09,
                    id: "overlay"
                } ]
        } );
        viewer.addHandler( 'open', openHandler );

        function openHandler() {
            viewer.removeHandler( 'open', openHandler );

            equal( viewer.overlays.length, 1, "Global overlay not added." );
            equal( viewer.currentOverlays.length, 1, "Global overlay not opened." );

            viewer.addHandler( 'open', openPageHandler );
            viewer.goToPage( 1 );
        }

        function openPageHandler() {
            viewer.removeHandler( 'open', openPageHandler );

            equal( viewer.overlays.length, 1, "Global overlay removed after page switch." );
            equal( viewer.currentOverlays.length, 1, "Global overlay not re-opened after page switch." );

            viewer.addHandler( 'close', closeHandler );
            viewer.close();
        }

        function closeHandler() {
            viewer.removeHandler( 'close', closeHandler );

            equal( viewer.overlays.length, 1, "Global overlay removed on close." );
            equal( viewer.currentOverlays.length, 0, "Global overlay not removed on close." );

            start();
        }
    } );

    asyncTest( 'Overlays via addOverlay ', function() {

        viewer = OpenSeadragon( {
            id: 'example-overlays',
            prefixUrl: '/build/openseadragon/images/',
            tileSources: [ {
                    Image: {
                        xmlns: "http://schemas.microsoft.com/deepzoom/2008",
                        Url: "/test/data/testpattern_files/",
                        Format: "jpg",
                        Overlap: "1",
                        TileSize: "254",
                        Size: {
                            Width: 1000,
                            Height: 1000
                        }
                    },
                    overlays: [ {
                            x: 0.1,
                            y: 0.4,
                            width: 0.09,
                            height: 0.09,
                            id: "overlay"
                        } ]
                }, {
                    Image: {
                        xmlns: "http://schemas.microsoft.com/deepzoom/2008",
                        Url: "/test/data/testpattern_files/",
                        Format: "jpg",
                        Overlap: "1",
                        TileSize: "254",
                        Size: {
                            Width: 1000,
                            Height: 1000
                        }
                    }
                } ],
            springStiffness: 100 // Faster animation = faster tests
        } );
        viewer.addHandler( 'open', openHandler );

        function openHandler() {
            viewer.removeHandler( 'open', openHandler );

            equal( viewer.overlays.length, 0, "No global overlay should be added." );
            equal( viewer.currentOverlays.length, 1, "Tile overlay not opened." );

            viewer.addHandler( 'open', openPageHandler );
            viewer.goToPage( 1 );
        }

        function openPageHandler() {
            viewer.removeHandler( 'open', openPageHandler );

            equal( viewer.overlays.length, 0, "Global overlay added after page switch." );
            equal( viewer.currentOverlays.length, 0, "Tile overlay re-opened after page switch." );

            viewer.addHandler( 'close', closeHandler );
            viewer.close();
        }

        function closeHandler() {
            viewer.removeHandler( 'close', closeHandler );

            equal( viewer.overlays.length, 0, "Global overlay added on close." );
            equal( viewer.currentOverlays.length, 0, "Tile overlay not removed on close." );

            start();
        }
    } );

    asyncTest( 'Overlays via addOverlay method', function() {

        viewer = OpenSeadragon( {
            id: 'example-overlays',
            prefixUrl: '/build/openseadragon/images/',
            tileSources: [ '/test/data/testpattern.dzi', '/test/data/testpattern.dzi' ],
            springStiffness: 100 // Faster animation = faster tests
        } );
        viewer.addHandler( 'open', openHandler );

        function openHandler() {
            viewer.removeHandler( 'open', openHandler );

            equal( viewer.overlays.length, 0, "Global overlay added." );
            equal( viewer.currentOverlays.length, 0, "Overlay opened." );

            var rect = new OpenSeadragon.Rect( 0.1, 0.1, 0.1, 0.1 );
            var overlay = $( "<div id=\"overlay\"></div>" ).get( 0 );
            viewer.addOverlay( overlay, rect );
            equal( viewer.overlays.length, 0, "Manual overlay added as global overlay." );
            equal( viewer.currentOverlays.length, 1, "Manual overlay not opened." );

            viewer.addHandler( 'open', openPageHandler );
            viewer.goToPage( 1 );
        }

        function openPageHandler() {
            viewer.removeHandler( 'open', openPageHandler );

            equal( viewer.overlays.length, 0, "Global overlay added after page switch." );
            equal( viewer.currentOverlays.length, 0, "Manual overlay not removed after page switch." );

            viewer.addHandler( 'close', closeHandler );
            viewer.close();
        }

        function closeHandler() {
            viewer.removeHandler( 'close', closeHandler );

            equal( viewer.overlays.length, 0, "Global overlay added on close." );
            equal( viewer.currentOverlays.length, 0, "Overlay not removed on close." );

            start();
        }

    } );

    asyncTest( 'Overlays size in pixels', function() {

        viewer = OpenSeadragon( {
            id: 'example-overlays',
            prefixUrl: '/build/openseadragon/images/',
            tileSources: [ '/test/data/testpattern.dzi', '/test/data/testpattern.dzi' ],
            springStiffness: 100, // Faster animation = faster tests
            overlays: [ {
                    px: 13,
                    py: 120,
                    width: 124,
                    height: 132,
                    id: "overlay"
                }, {
                    px: 400,
                    py: 500,
                    id: "fixed-overlay"
                }]
        } );

        function checkOverlayPosition( contextMessage ) {
            var viewport = viewer.viewport;

            var expPosition = viewport.imageToViewerElementCoordinates(
                new OpenSeadragon.Point( 13, 120 ) ).apply( Math.floor );
            var actPosition = $( "#overlay" ).position();
            equal( actPosition.left, expPosition.x, "X position mismatch " + contextMessage );
            equal( actPosition.top, expPosition.y, "Y position mismatch " + contextMessage );

            var zoom = viewport.viewportToImageZoom( viewport.getZoom( true ) );
            var expectedWidth = Math.ceil( 124 * zoom );
            var expectedHeight = Math.ceil( 132 * zoom );
            equal( $( "#overlay" ).width(), expectedWidth, "Width mismatch " + contextMessage );
            equal( $( "#overlay" ).height( ), expectedHeight, "Height mismatch " + contextMessage );


            expPosition = viewport.imageToViewerElementCoordinates(
                new OpenSeadragon.Point( 400, 500 ) ).apply( Math.floor );
            actPosition = $( "#fixed-overlay" ).position();
            equal( actPosition.left, expPosition.x, "Fixed overlay X position mismatch " + contextMessage );
            equal( actPosition.top, expPosition.y, "Fixed overlay Y position mismatch " + contextMessage );

            equal( $( "#fixed-overlay" ).width(), 70, "Fixed overlay width mismatch " + contextMessage );
            equal( $( "#fixed-overlay" ).height( ), 60, "Fixed overlay height mismatch " + contextMessage );
        }

        waitForViewer( function() {
            checkOverlayPosition( "after opening using image coordinates" );

            viewer.viewport.zoomBy( 1.1 ).panBy( new OpenSeadragon.Point( 0.1, 0.2 ) );
            waitForViewer( function() {
                checkOverlayPosition( "after zoom and pan using image coordinates" );

                viewer.viewport.goHome();
                waitForViewer( function() {
                    checkOverlayPosition( "after goHome using image coordinates" );
                    start();
                } );
            } );

        } );
    } );

    asyncTest( 'Overlays size in points', function() {

        viewer = OpenSeadragon( {
            id: 'example-overlays',
            prefixUrl: '/build/openseadragon/images/',
            tileSources: [ '/test/data/testpattern.dzi', '/test/data/testpattern.dzi' ],
            springStiffness: 100, // Faster animation = faster tests
            overlays: [ {
                    x: 0.2,
                    y: 0.1,
                    width: 0.5,
                    height: 0.1,
                    id: "overlay"
                },{
                    x: 0.5,
                    y: 0.6,
                    id: "fixed-overlay"
                } ]
        } );

        function checkOverlayPosition( contextMessage ) {
            var viewport = viewer.viewport;

            var expPosition = viewport.viewportToViewerElementCoordinates(
                new OpenSeadragon.Point( 0.2, 0.1 ) ).apply( Math.floor );
            var actPosition = $( "#overlay" ).position();
            equal( actPosition.left, expPosition.x, "X position mismatch " + contextMessage );
            equal( actPosition.top, expPosition.y, "Y position mismatch " + contextMessage );

            var expectedSize = viewport.deltaPixelsFromPoints(
                new OpenSeadragon.Point(0.5, 0.1));
            equal( $( "#overlay" ).width(), expectedSize.x, "Width mismatch " + contextMessage );
            equal( $( "#overlay" ).height( ), expectedSize.y, "Height mismatch " + contextMessage );


            expPosition = viewport.viewportToViewerElementCoordinates(
                new OpenSeadragon.Point( 0.5, 0.6 ) ).apply( Math.floor );
            actPosition = $( "#fixed-overlay" ).position();
            equal( actPosition.left, expPosition.x, "Fixed overlay X position mismatch " + contextMessage );
            equal( actPosition.top, expPosition.y, "Fixed overlay Y position mismatch " + contextMessage );

            equal( $( "#fixed-overlay" ).width(), 70, "Fixed overlay width mismatch " + contextMessage );
            equal( $( "#fixed-overlay" ).height( ), 60, "Fixed overlay height mismatch " + contextMessage );
        }

        waitForViewer( function() {
            checkOverlayPosition( "after opening using viewport coordinates" );

            viewer.viewport.zoomBy( 1.1 ).panBy( new OpenSeadragon.Point( 0.1, 0.2 ) );
            waitForViewer( function() {
                checkOverlayPosition( "after zoom and pan using viewport coordinates" );

                viewer.viewport.goHome();
                waitForViewer( function() {
                    checkOverlayPosition( "after goHome using viewport coordinates" );
                    start();
                } );
            } );

        } );
    } );

} )();
