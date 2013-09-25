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
        var openHandler = function ( eventSender, eventData ) {
            viewer.removeHandler( 'open', openHandler );
            ok( eventData, 'Event handler received event data' );
            if ( eventData ) {
                strictEqual( eventData.userData, null, 'User data defaulted to null' );
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

        var openHandler = function ( eventSender, eventData ) {
            viewer.removeHandler( 'open', openHandler );
            ok( eventData, 'Event handler received event data' );
            ok( eventData && eventData.userData, 'Event handler received user data' );
            if ( eventData && eventData.userData ) {
                deepEqual( eventData.userData, originalUserData, 'User data was untouched' );
            }
            viewer.close();
            start();
        };

        viewer.addHandler( 'open', openHandler, userData );
        viewer.open( '/test/data/testpattern.dzi' );
    } );

    // ----------
    asyncTest( 'MouseTracker, EventSource canvasdrag canvasrelease canvasclick', function () {
        var $canvas = $( viewer.element ).find( '.openseadragon-canvas' ).not( '.navigator .openseadragon-canvas' ),
            mouseTracker = null,
            userData = { item1: 'Test user data', item2: Math.random() },
            originalUserData = { item1: userData.item1, item2: userData.item2 },
            dragCount = 10,
            dragsHandledEventSource = 0,
            releasesHandledEventSource = 0,
            clicksHandledEventSource = 0,
            eventsHandledMouseTracker = 0,
            originalEventsPassedMouseTracker = 0,
            releasesExpected = 1,
            clicksExpected = 1;

        var onOpen = function ( eventSender, eventData ) {
            viewer.removeHandler( 'open', onOpen );

            viewer.addHandler( 'canvasdrag', onEventSourceDrag );
            viewer.addHandler( 'canvasrelease', onEventSourceRelease );
            viewer.addHandler( 'canvasclick', onEventSourceClick );

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

        var onEventSourceDrag = function ( eventSender, eventData ) {
            dragsHandledEventSource++;
        };

        var onEventSourceRelease = function ( eventSender, eventData ) {
            releasesHandledEventSource++;
        };

        var onEventSourceClick = function ( eventSender, eventData ) {
            clicksHandledEventSource++;
        };

        var checkOriginalEventReceived = function ( eventData ) {
            eventsHandledMouseTracker++;
            //TODO Provide a better check for the original event...simulate doesn't currently extend the object 
            //   with arbitrary user data.
            if ( eventData && eventData.originalEvent ) {
                originalEventsPassedMouseTracker++;
            }
        };

        var onMouseTrackerFocus = function ( tracker, eventData ) {
            checkOriginalEventReceived( eventData );
        };

        var onMouseTrackerBlur = function ( tracker, eventData ) {
            checkOriginalEventReceived( eventData );
        };

        var onMouseTrackerEnter = function ( tracker, eventData ) {
            checkOriginalEventReceived( eventData );
        };

        var onMouseTrackerPress = function ( tracker, eventData ) {
            checkOriginalEventReceived( eventData );
        };

        var onMouseTrackerMove = function ( tracker, eventData ) {
            checkOriginalEventReceived( eventData );
        };

        var onMouseTrackerDrag = function ( tracker, eventData ) {
            checkOriginalEventReceived( eventData );
        };

        var onMouseTrackerRelease = function ( tracker, eventData ) {
            checkOriginalEventReceived( eventData );
        };

        var onMouseTrackerClick = function ( tracker, eventData ) {
            checkOriginalEventReceived( eventData );
        };

        var onMouseTrackerExit = function ( tracker, eventData ) {
            checkOriginalEventReceived( eventData );

            mouseTracker.destroy();
            viewer.removeHandler( 'canvasdrag', onEventSourceDrag );
            viewer.removeHandler( 'canvasrelease', onEventSourceRelease );
            viewer.removeHandler( 'canvasclick', onEventSourceClick );

            equal( dragsHandledEventSource, dragCount, "'canvasdrag' event count matches 'mousemove' event count (" + dragCount + ")" );
            equal( releasesHandledEventSource, releasesExpected, "'canvasrelease' event count matches expected (" + releasesExpected + ")" );
            equal( clicksHandledEventSource, releasesExpected, "'canvasclick' event count matches expected (" + releasesExpected + ")" );

            equal( originalEventsPassedMouseTracker, eventsHandledMouseTracker, "Original event received count matches expected (" + eventsHandledMouseTracker + ")" );
            deepEqual( eventData.userData, originalUserData, 'MouseTracker userData was untouched' );

            viewer.close();
            start();
        };

        viewer.addHandler( 'open', onOpen );
        viewer.open( '/test/data/testpattern.dzi' );
    } );

} )();
