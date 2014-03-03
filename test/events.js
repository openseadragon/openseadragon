/* global module, asyncTest, $, ok, equal, notEqual, start, test, Util, testLog */

(function () {
    var viewer;

    module( 'Events', {
        setup: function () {
            var example = $( '<div id="eventsexample"></div>' ).appendTo( "#qunit-fixture" );

            testLog.reset();

            viewer = OpenSeadragon( {
                id: 'eventsexample',
                prefixUrl: '/build/openseadragon/images/',
                springStiffness: 100 // Faster animation = faster tests
            } );
        },
        teardown: function () {
            if ( viewer && viewer.close ) {
                viewer.close();
            }

            viewer = null;
        }
    } );

    // ----------
    asyncTest( 'addHandler without userData', function () {
        var openHandler = function ( event ) {
            viewer.removeHandler( 'open', openHandler );
            ok( event, 'Event handler received event data' );
            if ( event ) {
                strictEqual( event.eventSource, viewer, 'eventSource sent, eventSource is viewer' );
                strictEqual( event.userData, null, 'User data defaulted to null' );
            }
            viewer.close();
            start();
        };

        viewer.addHandler( 'open', openHandler );
        viewer.open( '/test/data/testpattern.dzi' );
    } );

    // ----------
    asyncTest( 'addHandler with userData', function () {
        var userData = { item1: 'Test user data', item2: Math.random() },
            originalUserData = { item1: userData.item1, item2: userData.item2 };

        var openHandler = function ( event ) {
            viewer.removeHandler( 'open', openHandler );
            ok( event, 'Event handler received event data' );
            ok( event && event.userData, 'Event handler received user data' );
            if ( event && event.userData ) {
                deepEqual( event.userData, originalUserData, 'User data was untouched' );
            }
            viewer.close();
            start();
        };

        viewer.addHandler( 'open', openHandler, userData );
        viewer.open( '/test/data/testpattern.dzi' );
    } );

    // ----------
    asyncTest( 'MouseTracker, EventSource canvas-drag canvas-release canvas-click', function () {
        var $canvas = $( viewer.element ).find( '.openseadragon-canvas' ).not( '.navigator .openseadragon-canvas' ),
            mouseTracker = null,
            userData = { item1: 'Test user data', item2: Math.random() },
            originalUserData = { item1: userData.item1, item2: userData.item2 },
            dragCount = 10,
            dragsHandledEventSource = 0,
            releasesHandledEventSource = 0,
            clicksHandledEventSource = 0,
            eventsHandledMouseTracker = 0,
            eventSourcePassedMouseTracker = 0,
            originalEventsPassedMouseTracker = 0,
            eventsHandledViewer = 0,
            originalEventsPassedViewer = 0,
            releasesExpected = 1,
            clicksExpected = 1;

        var onOpen = function ( event ) {
            viewer.removeHandler( 'open', onOpen );

            viewer.addHandler( 'canvas-drag', onEventSourceDrag );
            viewer.addHandler( 'canvas-release', onEventSourceRelease );
            viewer.addHandler( 'canvas-click', onEventSourceClick );

            mouseTracker = new OpenSeadragon.MouseTracker( {
                element: $canvas[0],
                userData: userData,
                clickTimeThreshold: OpenSeadragon.DEFAULT_SETTINGS.clickTimeThreshold,
                clickDistThreshold: OpenSeadragon.DEFAULT_SETTINGS.clickDistThreshold,
                focusHandler: onMouseTrackerFocus,
                blurHandler: onMouseTrackerBlur,
                enterHandler: onMouseTrackerEnter,
                pressHandler: onMouseTrackerPress,
                moveHandler: onMouseTrackerMove,
                dragHandler: onMouseTrackerDrag,
                releaseHandler: onMouseTrackerRelease,
                clickHandler: onMouseTrackerClick,
                exitHandler: onMouseTrackerExit
            } ).setTracking( true );

            var event = {
                clientX:1,
                clientY:1
            };

            $canvas.simulate( 'focus', event );
            Util.simulateViewerClickWithDrag( {
                viewer: viewer,
                widthFactor: 0.25,
                heightFactor: 0.25,
                dragCount: dragCount,
                dragDx: 1,
                dragDy: 1
            } );
            $canvas.simulate( 'blur', event );
        };

        var checkOriginalEventReceivedViewer = function ( event ) {
            eventsHandledViewer++;
            //TODO Provide a better check for the original event...simulate doesn't currently extend the object 
            //   with arbitrary user data.
            if ( event && event.originalEvent ) {
                originalEventsPassedViewer++;
            }
        };

        var onEventSourceDrag = function ( event ) {
            checkOriginalEventReceivedViewer( event );
            dragsHandledEventSource++;
        };

        var onEventSourceRelease = function ( event ) {
            checkOriginalEventReceivedViewer( event );
            releasesHandledEventSource++;
        };

        var onEventSourceClick = function ( event ) {
            checkOriginalEventReceivedViewer( event );
            clicksHandledEventSource++;
        };

        var checkOriginalEventReceived = function ( event ) {
            eventsHandledMouseTracker++;
            if ( event && event.eventSource === mouseTracker ) {
                eventSourcePassedMouseTracker++;
            }
            //TODO Provide a better check for the original event...simulate doesn't currently extend the object 
            //   with arbitrary user data.
            if ( event && event.originalEvent ) {
                originalEventsPassedMouseTracker++;
            }
        };

        var onMouseTrackerFocus = function ( event ) {
            checkOriginalEventReceived( event );
        };

        var onMouseTrackerBlur = function ( event ) {
            checkOriginalEventReceived( event );
        };

        var onMouseTrackerEnter = function ( event ) {
            checkOriginalEventReceived( event );
        };

        var onMouseTrackerPress = function ( event ) {
            checkOriginalEventReceived( event );
        };

        var onMouseTrackerMove = function ( event ) {
            checkOriginalEventReceived( event );
        };

        var onMouseTrackerDrag = function ( event ) {
            checkOriginalEventReceived( event );
        };

        var onMouseTrackerRelease = function ( event ) {
            checkOriginalEventReceived( event );
        };

        var onMouseTrackerClick = function ( event ) {
            checkOriginalEventReceived( event );
        };

        var onMouseTrackerExit = function ( event ) {
            checkOriginalEventReceived( event );

            mouseTracker.destroy();
            viewer.removeHandler( 'canvas-drag', onEventSourceDrag );
            viewer.removeHandler( 'canvas-release', onEventSourceRelease );
            viewer.removeHandler( 'canvas-click', onEventSourceClick );

            equal( dragsHandledEventSource, dragCount, "'canvas-drag' event count matches 'mousemove' event count (" + dragCount + ")" );
            equal( releasesHandledEventSource, releasesExpected, "'canvas-release' event count matches expected (" + releasesExpected + ")" );
            equal( clicksHandledEventSource, releasesExpected, "'canvas-click' event count matches expected (" + releasesExpected + ")" );
            equal( originalEventsPassedViewer, eventsHandledViewer, "Original event received count matches expected (" + eventsHandledViewer + ")" );

            equal( eventSourcePassedMouseTracker, eventsHandledMouseTracker, "Event source received count matches expected (" + eventsHandledMouseTracker + ")" );
            equal( originalEventsPassedMouseTracker, eventsHandledMouseTracker, "Original event received count matches expected (" + eventsHandledMouseTracker + ")" );
            deepEqual( event.userData, originalUserData, 'MouseTracker userData was untouched' );

            viewer.close();
            start();
        };

        viewer.addHandler( 'open', onOpen );
        viewer.open( '/test/data/testpattern.dzi' );
    } );

    // ----------
    asyncTest( 'MouseTracker preventDefaultAction', function () {
        var $canvas = $( viewer.element ).find( '.openseadragon-canvas' ).not( '.navigator .openseadragon-canvas' ),
            tracker = viewer.innerTracker,
            origClickHandler,
            origDragHandler,
            dragCount = 10,
            originalZoom = 0,
            originalBounds = null;

        var onOpen = function ( event ) {
            viewer.removeHandler( 'open', onOpen );

            // Hook viewer events to set preventDefaultAction
            origClickHandler = tracker.clickHandler;
            tracker.clickHandler = function ( event ) {
                event.preventDefaultAction = true;
                return origClickHandler( event );
            };
            origDragHandler = tracker.dragHandler;
            tracker.dragHandler = function ( event ) {
                event.preventDefaultAction = true;
                return origDragHandler( event );
            };

            originalZoom = viewer.viewport.getZoom();
            originalBounds = viewer.viewport.getBounds();

            var event = {
                clientX:1,
                clientY:1
            };

            $canvas.simulate( 'focus', event );
            // Drag to pan
            Util.simulateViewerClickWithDrag( {
                viewer: viewer,
                widthFactor: 0.25,
                heightFactor: 0.25,
                dragCount: dragCount,
                dragDx: 1,
                dragDy: 1
            } );
            // Click to zoom
            Util.simulateViewerClickWithDrag( {
                viewer: viewer,
                widthFactor: 0.25,
                heightFactor: 0.25,
                dragCount: 0,
                dragDx: 0,
                dragDy: 0
            } );
            $canvas.simulate( 'blur', event );

            var zoom = viewer.viewport.getZoom(),
                bounds = viewer.viewport.getBounds();

            equal( zoom, originalZoom, "Zoom prevented" );
            ok( bounds.x == originalBounds.x && bounds.y == originalBounds.y, 'Pan prevented' );

            viewer.close();
            start();
        };

        viewer.addHandler( 'open', onOpen );
        viewer.open( '/test/data/testpattern.dzi' );
    } );

    // ----------
    asyncTest( 'tile-drawing event', function () {
        var tileDrawing = function ( event ) {
            viewer.removeHandler( 'tile-drawing', tileDrawing );
            ok( event, 'Event handler received event data' );
            if ( event ) {
                // Make sure we have the expected elements set
                ok(event.context, "Context is not set");
                ok(event.tile, "Tile is not set");
                ok(event.rendered, "Rendered is not set");
            }
            viewer.close();
            start();
        };

        viewer.addHandler( 'tile-drawing', tileDrawing );
        viewer.open( '/test/data/testpattern.dzi' );
    } );

} )();
