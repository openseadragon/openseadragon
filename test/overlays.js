/* global QUnit, module, Util, $, console, test, asyncTest, start, ok, equal */

( function() {
    var viewer;

    module( "Overlays", {
        setup: function() {
            var example = $( '<div id="example-overlays"></div>' ).appendTo( "#qunit-fixture" );
            var fixedOverlay = $( '<div id="fixed-overlay"></div>' ).appendTo( example );
            fixedOverlay.width( 70 );
            fixedOverlay.height( 60 );

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

            equal( viewer.overlays.length, 1, "Global overlay should be added." );
            equal( viewer.currentOverlays.length, 1, "Global overlay should be open." );

            viewer.addHandler( 'open', openPageHandler );
            viewer.goToPage( 1 );
        }

        function openPageHandler() {
            viewer.removeHandler( 'open', openPageHandler );

            equal( viewer.overlays.length, 1, "Global overlay should stay after page switch." );
            equal( viewer.currentOverlays.length, 1, "Global overlay should re-open after page switch." );

            viewer.addHandler( 'close', closeHandler );
            viewer.close();
        }

        function closeHandler() {
            viewer.removeHandler( 'close', closeHandler );

            equal( viewer.overlays.length, 1, "Global overlay should not be removed on close." );
            equal( viewer.currentOverlays.length, 0, "Global overlay should be closed on close." );

            start();
        }
    } );

    asyncTest( 'Page Overlays via viewer options', function() {

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
            equal( viewer.currentOverlays.length, 1, "Page overlay should be open." );

            viewer.addHandler( 'open', openPageHandler );
            viewer.goToPage( 1 );
        }

        function openPageHandler() {
            viewer.removeHandler( 'open', openPageHandler );

            equal( viewer.overlays.length, 0, "No global overlay should be added after page switch." );
            equal( viewer.currentOverlays.length, 0, "No page overlay should be opened after page switch." );

            viewer.addHandler( 'close', closeHandler );
            viewer.close();
        }

        function closeHandler() {
            viewer.removeHandler( 'close', closeHandler );

            equal( viewer.overlays.length, 0, "No global overlay should be added on close." );
            equal( viewer.currentOverlays.length, 0, "Page overlay should be closed on close." );

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

            equal( viewer.overlays.length, 0, "No global overlay should be added." );
            equal( viewer.currentOverlays.length, 0, "No overlay should be open." );

            var rect = new OpenSeadragon.Rect( 0.1, 0.1, 0.1, 0.1 );
            var overlay = $( "<div/>" ).prop( "id", "overlay" ).get( 0 );
            viewer.addOverlay( overlay, rect );
            equal( viewer.overlays.length, 0, "No manual overlay should be added as global overlay." );
            equal( viewer.currentOverlays.length, 1, "A manual overlay should be open." );

            viewer.addHandler( 'open', openPageHandler );
            viewer.goToPage( 1 );
        }

        function openPageHandler() {
            viewer.removeHandler( 'open', openPageHandler );

            equal( viewer.overlays.length, 0, "No global overlay should be added after page switch." );
            equal( viewer.currentOverlays.length, 0, "Manual overlay should be removed after page switch." );

            viewer.addHandler( 'close', closeHandler );
            viewer.close();
        }

        function closeHandler() {
            viewer.removeHandler( 'close', closeHandler );

            equal( viewer.overlays.length, 0, "No global overlay should be added on close." );
            equal( viewer.currentOverlays.length, 0, "Manual overlay should be removed on close." );

            start();
        }

    } );

    asyncTest( 'Overlays size in pixels', function() {

        viewer = OpenSeadragon( {
            id: 'example-overlays',
            prefixUrl: '/build/openseadragon/images/',
            tileSources: '/test/data/testpattern.dzi',
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
                    id: "fixed-overlay",
                    placement: "TOP_LEFT"
                } ]
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
            tileSources: '/test/data/testpattern.dzi',
            springStiffness: 100, // Faster animation = faster tests
            overlays: [ {
                    x: 0.2,
                    y: 0.1,
                    width: 0.5,
                    height: 0.1,
                    id: "overlay"
                }, {
                    x: 0.5,
                    y: 0.6,
                    id: "fixed-overlay",
                    placement: "TOP_LEFT"
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
                new OpenSeadragon.Point( 0.5, 0.1 ) );
            equal( $( "#overlay" ).width(), expectedSize.x, "Width mismatch " + contextMessage );
            equal( $( "#overlay" ).height(), expectedSize.y, "Height mismatch " + contextMessage );


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

    asyncTest( 'Overlays placement', function() {

        var scalableOverlayLocation = new OpenSeadragon.Rect( 0.2, 0.1, 0.5, 0.1 );
        var fixedOverlayLocation = new OpenSeadragon.Point( 0.5, 0.6 );

        viewer = OpenSeadragon( {
            id: 'example-overlays',
            prefixUrl: '/build/openseadragon/images/',
            tileSources: '/test/data/testpattern.dzi',
            springStiffness: 100, // Faster animation = faster tests
            overlays: [ {
                    x: scalableOverlayLocation.x,
                    y: scalableOverlayLocation.y,
                    width: scalableOverlayLocation.width,
                    height: scalableOverlayLocation.height,
                    id: "overlay",
                    placement: "TOP_LEFT"
                }, {
                    x: fixedOverlayLocation.x,
                    y: fixedOverlayLocation.y,
                    id: "fixed-overlay",
                    placement: "TOP_LEFT"
                } ]
        } );

        // Scalable overlays are always TOP_LEFT
        function checkScalableOverlayPosition( contextMessage ) {
            var viewport = viewer.viewport;

            var expPosition = viewport.viewportToViewerElementCoordinates(
                new OpenSeadragon.Point( 0.2, 0.1 ) ).apply( Math.floor );
            var actPosition = $( "#overlay" ).position();
            equal( actPosition.left, expPosition.x, "X position mismatch " + contextMessage );
            equal( actPosition.top, expPosition.y, "Y position mismatch " + contextMessage );
        }

        function checkFixedOverlayPosition( expectedOffset, contextMessage ) {
            var viewport = viewer.viewport;

            var expPosition = viewport.viewportToViewerElementCoordinates(
                new OpenSeadragon.Point( 0.5, 0.6 ) )
                .apply( Math.floor )
                .plus( expectedOffset );
            var actPosition = $( "#fixed-overlay" ).position();
            equal( actPosition.left, expPosition.x, "Fixed overlay X position mismatch " + contextMessage );
            equal( actPosition.top, expPosition.y, "Fixed overlay Y position mismatch " + contextMessage );
        }

        waitForViewer( function() {

            checkScalableOverlayPosition( "with TOP_LEFT placement." );
            checkFixedOverlayPosition( new OpenSeadragon.Point( 0, 0 ),
                "with TOP_LEFT placement." );

            viewer.updateOverlay( "overlay", scalableOverlayLocation,
                OpenSeadragon.OverlayPlacement.CENTER );
            viewer.updateOverlay( "fixed-overlay", fixedOverlayLocation,
                OpenSeadragon.OverlayPlacement.CENTER );

            setTimeout( function() {
                checkScalableOverlayPosition( "with CENTER placement." );
                checkFixedOverlayPosition( new OpenSeadragon.Point( -35, -30 ),
                    "with CENTER placement." );

                viewer.updateOverlay( "overlay", scalableOverlayLocation,
                    OpenSeadragon.OverlayPlacement.BOTTOM_RIGHT );
                viewer.updateOverlay( "fixed-overlay", fixedOverlayLocation,
                    OpenSeadragon.OverlayPlacement.BOTTOM_RIGHT );
                setTimeout( function() {
                    checkScalableOverlayPosition( "with BOTTOM_RIGHT placement." );
                    checkFixedOverlayPosition( new OpenSeadragon.Point( -70, -60 ),
                        "with BOTTOM_RIGHT placement." );

                    start();
                }, 100 );

            }, 100 );

        } );
    } );

    asyncTest( 'Overlays placement and resizing check', function() {

        var fixedOverlayLocation = new OpenSeadragon.Point( 0.5, 0.6 );

        viewer = OpenSeadragon( {
            id: 'example-overlays',
            prefixUrl: '/build/openseadragon/images/',
            tileSources: '/test/data/testpattern.dzi',
            springStiffness: 100, // Faster animation = faster tests
            overlays: [ {
                    x: fixedOverlayLocation.x,
                    y: fixedOverlayLocation.y,
                    id: "fixed-overlay",
                    placement: "CENTER",
                    checkResize: true
                } ]
        } );

        function checkFixedOverlayPosition( expectedOffset, contextMessage ) {
            var viewport = viewer.viewport;

            var expPosition = viewport.viewportToViewerElementCoordinates(
                new OpenSeadragon.Point( 0.5, 0.6 ) )
                .apply( Math.floor )
                .plus( expectedOffset );
            var actPosition = $( "#fixed-overlay" ).position();
            equal( actPosition.left, expPosition.x, "Fixed overlay X position mismatch " + contextMessage );
            equal( actPosition.top, expPosition.y, "Fixed overlay Y position mismatch " + contextMessage );
        }

        waitForViewer( function() {
            checkFixedOverlayPosition( new OpenSeadragon.Point( -35, -30 ),
                "with overlay of size 70,60." );

            $( "#fixed-overlay" ).width( 50 );
            $( "#fixed-overlay" ).height( 40 );

            // The resizing of the overlays is not detected by the viewer's loop.
            viewer.forceRedraw();

            setTimeout( function() {
                checkFixedOverlayPosition( new OpenSeadragon.Point( -25, -20 ),
                    "with overlay of size 50,40." );

                // Restore original size
                $( "#fixed-overlay" ).width( 70 );
                $( "#fixed-overlay" ).height( 60 );

                start();
            }, 100 );
        } );

    } );

    asyncTest( 'Overlays placement and no resizing check', function() {

        var fixedOverlayLocation = new OpenSeadragon.Point( 0.5, 0.6 );

        viewer = OpenSeadragon( {
            id: 'example-overlays',
            prefixUrl: '/build/openseadragon/images/',
            tileSources: '/test/data/testpattern.dzi',
            springStiffness: 100, // Faster animation = faster tests
            overlays: [ {
                    x: fixedOverlayLocation.x,
                    y: fixedOverlayLocation.y,
                    id: "fixed-overlay",
                    placement: "CENTER",
                    checkResize: false
                } ]
        } );

        function checkFixedOverlayPosition( expectedOffset, contextMessage ) {
            var viewport = viewer.viewport;

            var expPosition = viewport.viewportToViewerElementCoordinates(
                new OpenSeadragon.Point( 0.5, 0.6 ) )
                .apply( Math.floor )
                .plus( expectedOffset );
            var actPosition = $( "#fixed-overlay" ).position();
            equal( actPosition.left, expPosition.x, "Fixed overlay X position mismatch " + contextMessage );
            equal( actPosition.top, expPosition.y, "Fixed overlay Y position mismatch " + contextMessage );
        }

        waitForViewer( function() {
            checkFixedOverlayPosition( new OpenSeadragon.Point( -35, -30 ),
                "with overlay of size 70,60." );

            $( "#fixed-overlay" ).width( 50 );
            $( "#fixed-overlay" ).height( 40 );

            // The resizing of the overlays is not detected by the viewer's loop.
            viewer.forceRedraw();

            setTimeout( function() {
                checkFixedOverlayPosition( new OpenSeadragon.Point( -35, -30 ),
                    "with overlay of size 50,40." );

                // Restore original size
                $( "#fixed-overlay" ).width( 70 );
                $( "#fixed-overlay" ).height( 60 );

                start();
            }, 100 );
        } );

    } );

} )( );
