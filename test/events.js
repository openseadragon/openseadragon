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
    asyncTest( 'MouseTracker: mouse gestures', function () {
        var $canvas = $( viewer.element ).find( '.openseadragon-canvas' ).not( '.navigator .openseadragon-canvas' ),
            simEvent = {},
            offset = $canvas.offset(),
            tracker = viewer.innerTracker,
            intervalId,
            origEnterHandler,
            origExitHandler,
            origPressHandler,
            origReleaseHandler,
            origMoveHandler,
            origClickHandler,
            origDblClickHandler,
            origDragHandler,
            origDragEndHandler,
            enterCount,
            exitCount,
            pressCount,
            releaseCount,
            moveCount,
            clickCount,
            dblClickCount,
            dragCount,
            dragEndCount,
            insideElementPressed,
            insideElementReleased,
            quickClick,
            speed,
            direction;

        var hookViewerHandlers = function () {
            origEnterHandler = tracker.enterHandler;
            tracker.enterHandler = function ( event ) {
                enterCount++;
                if (origEnterHandler) {
                    return origEnterHandler( event );
                } else {
                    return true;
                }
            };
            origExitHandler = tracker.exitHandler;
            tracker.exitHandler = function ( event ) {
                exitCount++;
                if (origExitHandler) {
                    return origExitHandler( event );
                } else {
                    return true;
                }
            };
            origPressHandler = tracker.pressHandler;
            tracker.pressHandler = function ( event ) {
                pressCount++;
                if (origPressHandler) {
                    return origPressHandler( event );
                } else {
                    return true;
                }
            };
            origReleaseHandler = tracker.releaseHandler;
            tracker.releaseHandler = function ( event ) {
                releaseCount++;
                insideElementPressed = event.insideElementPressed;
                insideElementReleased = event.insideElementReleased;
                if (origReleaseHandler) {
                    return origReleaseHandler( event );
                } else {
                    return true;
                }
            };
            origMoveHandler = tracker.moveHandler;
            tracker.moveHandler = function ( event ) {
                moveCount++;
                if (origMoveHandler) {
                    return origMoveHandler( event );
                } else {
                    return true;
                }
            };
            origClickHandler = tracker.clickHandler;
            tracker.clickHandler = function ( event ) {
                clickCount++;
                quickClick = event.quick;
                if (origClickHandler) {
                    return origClickHandler( event );
                } else {
                    return true;
                }
            };
            origDblClickHandler = tracker.dblClickHandler;
            tracker.dblClickHandler = function ( event ) {
                dblClickCount++;
                if (origDblClickHandler) {
                    return origDblClickHandler( event );
                } else {
                    return true;
                }
            };
            origDragHandler = tracker.dragHandler;
            tracker.dragHandler = function ( event ) {
                dragCount++;
                if (origDragHandler) {
                    return origDragHandler( event );
                } else {
                    return true;
                }
            };
            origDragEndHandler = tracker.dragEndHandler;
            tracker.dragEndHandler = function ( event ) {
                dragEndCount++;
                speed = event.speed;
                direction = event.direction;
                if (origDragEndHandler) {
                    return origDragEndHandler( event );
                } else {
                    return true;
                }
            };
        };

        var unhookViewerHandlers = function () {
            tracker.enterHandler = origEnterHandler;
            tracker.exitHandler = origExitHandler;
            tracker.pressHandler = origPressHandler;
            tracker.releaseHandler = origReleaseHandler;
            tracker.moveHandler = origMoveHandler;
            tracker.clickHandler = origClickHandler;
            tracker.dblClickHandler = origDblClickHandler;
            tracker.dragHandler = origDragHandler;
            tracker.dragEndHandler = origDragEndHandler;
        };

        var simulateEnter = function (x, y) {
            simEvent.clientX = offset.left + x;
            simEvent.clientY = offset.top  + y;
            $canvas.simulate( OpenSeadragon.MouseTracker.haveMouseEnter ? 'mouseenter' : 'mouseover', simEvent );
        };

        var simulateLeave = function (x, y) {
            simEvent.clientX = offset.left + x;
            simEvent.clientY = offset.top  + y;
            $canvas.simulate( OpenSeadragon.MouseTracker.haveMouseEnter ? 'mouseleave' : 'mouseout', simEvent );
        };

        var simulateDown = function (x, y) {
            simEvent.clientX = offset.left + x;
            simEvent.clientY = offset.top  + y;
            $canvas.simulate( 'mousedown', simEvent );
        };

        var simulateUp = function (x, y) {
            simEvent.clientX = offset.left + x;
            simEvent.clientY = offset.top  + y;
            $canvas.simulate( 'mouseup', simEvent );
        };

        var simulateMove = function (dX, dY, count) {
            var i;
            for ( i = 0; i < count; i++ ) {
                simEvent.clientX += dX;
                simEvent.clientY += dY;
                $canvas.simulate( 'mousemove', simEvent );
            }
        };

        var resetForAssessment = function () {
            simEvent = {
                clientX: offset.left,
                clientY: offset.top
            };
            enterCount = 0;
            exitCount = 0;
            pressCount = 0;
            releaseCount = 0;
            moveCount = 0;
            clickCount = 0;
            dblClickCount = 0;
            dragCount = 0;
            dragEndCount = 0;
            insideElementPressed = false;
            insideElementReleased = false;
            quickClick = false;
            speed = 0;
            direction = 2 * Math.PI;
        };

        var assessGestureExpectations = function (expected) {
            var pointersList = tracker.getActivePointersListByType('mouse');
            if ('enterCount' in expected) {
                equal( enterCount, expected.enterCount, expected.description + 'enterHandler event count matches expected (' + expected.enterCount + ')' );
            }
            if ('exitCount' in expected) {
                equal( exitCount, expected.exitCount, expected.description + 'exitHandler event count matches expected (' + expected.exitCount + ')' );
            }
            if ('pressCount' in expected) {
                equal( pressCount, expected.pressCount, expected.description + 'pressHandler event count matches expected (' + expected.pressCount + ')' );
            }
            if ('releaseCount' in expected) {
                equal( releaseCount, expected.releaseCount, expected.description + 'releaseHandler event count matches expected (' + expected.releaseCount + ')' );
            }
            if ('moveCount' in expected) {
                equal( moveCount, expected.moveCount, expected.description + 'moveHandler event count matches expected (' + expected.moveCount + ')' );
            }
            if ('clickCount' in expected) {
                equal( clickCount, expected.clickCount, expected.description + 'clickHandler event count matches expected (' + expected.clickCount + ')' );
            }
            if ('dblClickCount' in expected) {
                equal( dblClickCount, expected.dblClickCount, expected.description + 'dblClickHandler event count matches expected (' + expected.dblClickCount + ')' );
            }
            if ('dragCount' in expected) {
                equal( dragCount, expected.dragCount, expected.description + 'dragHandler event count matches expected (' + expected.dragCount + ')' );
            }
            if ('dragEndCount' in expected) {
                equal( dragEndCount, expected.dragEndCount, expected.description + 'dragEndHandler event count matches expected (' + expected.dragEndCount + ')' );
            }
            if ('insideElementPressed' in expected) {
                equal( insideElementPressed, expected.insideElementPressed, expected.description + 'releaseHandler event.insideElementPressed matches expected (' + expected.insideElementPressed + ')' );
            }
            if ('insideElementReleased' in expected) {
                equal( insideElementReleased, expected.insideElementReleased, expected.description + 'releaseHandler event.insideElementReleased matches expected (' + expected.insideElementReleased + ')' );
            }
            if ('contacts' in expected) {
                equal( pointersList.contacts, expected.contacts, expected.description + 'Remaining pointer contact count matches expected (' + expected.contacts + ')' );
            }
            if ('trackedPointers' in expected) {
                equal( pointersList.getLength(), expected.trackedPointers, expected.description + 'Remaining tracked pointer count matches expected (' + expected.trackedPointers + ')' );
            }
            if ('quickClick' in expected) {
                equal( quickClick, expected.quickClick, expected.description + 'clickHandler event.quick matches expected (' + expected.quickClick + ')' );
            }
            if ('speed' in expected) {
                Util.assessNumericValue(expected.speed, speed, 1.0, expected.description + 'Drag speed ');
            }
            if ('direction' in expected) {
                Util.assessNumericValue(expected.direction, direction, 0.2, expected.description + 'Drag direction ');
            }
        };

        var onOpen = function ( event ) {
            var timeStart,
                timeElapsed;

            viewer.removeHandler( 'open', onOpen );

            hookViewerHandlers();

            // enter-move-release (release in tracked element, press in unknown element)
            //   (Note we also test to see if the pointer is still being tracked by not simulating a leave event until after assessment)
            resetForAssessment();
            simulateEnter(0, 0);
            simulateMove(1, 1, 10);
            simulateMove(-1, -1, 10);
            simulateUp(0, 0);
            assessGestureExpectations({
                description:           'enter-move-release (release in tracked element, press in unknown element):  ',
                enterCount:            1,
                exitCount:             0,
                pressCount:            0,
                releaseCount:          1,
                moveCount:             20,
                clickCount:            0,
                dblClickCount:         0,
                dragCount:             0,
                dragEndCount:          0,
                insideElementPressed:  false,
                insideElementReleased: true,
                contacts:              0,
                trackedPointers:       1
                //quickClick:            false
            });
            simulateLeave(-1, -1); // flush tracked pointer

            // enter-move-exit (fly-over)
            resetForAssessment();
            simulateEnter(0, 0);
            simulateMove(1, 1, 10);
            simulateMove(-1, -1, 10);
            simulateLeave(-1, -1);
            assessGestureExpectations({
                description:           'enter-move-exit (fly-over):  ',
                enterCount:            1,
                exitCount:             1,
                pressCount:            0,
                releaseCount:          0,
                moveCount:             20,
                clickCount:            0,
                dblClickCount:         0,
                dragCount:             0,
                dragEndCount:          0,
                //insideElementPressed:  false,
                //insideElementReleased: false,
                contacts:              0,
                trackedPointers:       0
                //quickClick:            false
            });

            // move-exit (fly-over, no enter event)
            resetForAssessment();
            simulateMove(1, 1, 10);
            simulateMove(-1, -1, 10);
            simulateLeave(-1, -1);
            assessGestureExpectations({
                description:           'move-exit (fly-over, no enter event):  ',
                enterCount:            0,
                exitCount:             1,
                pressCount:            0,
                releaseCount:          0,
                moveCount:             20,
                clickCount:            0,
                dblClickCount:         0,
                dragCount:             0,
                dragEndCount:          0,
                //insideElementPressed:  false,
                //insideElementReleased: false,
                contacts:              0,
                trackedPointers:       0
                //quickClick:            false
            });

            // enter-press-release-press-release-exit (double click)
            resetForAssessment();
            simulateEnter(0, 0);
            simulateDown(0, 0);
            simulateUp(0, 0);
            simulateDown(0, 0);
            simulateUp(0, 0);
            simulateLeave(-1, -1);
            assessGestureExpectations({
                description:           'enter-press-release-press-release-exit (double click):  ',
                enterCount:            1,
                exitCount:             1,
                pressCount:            2,
                releaseCount:          2,
                moveCount:             0,
                clickCount:            2,
                dblClickCount:         1,
                dragCount:             0,
                dragEndCount:          0,
                insideElementPressed:  true,
                insideElementReleased: true,
                contacts:              0,
                trackedPointers:       0
                //quickClick:            true
            });

            // enter-press-release-exit (click)
            resetForAssessment();
            simulateEnter(0, 0);
            simulateDown(0, 0);
            simulateUp(0, 0);
            simulateLeave(-1, -1);
            assessGestureExpectations({
                description:           'enter-press-release-exit (click):  ',
                enterCount:            1,
                exitCount:             1,
                pressCount:            1,
                releaseCount:          1,
                moveCount:             0,
                clickCount:            1,
                dblClickCount:         0,
                dragCount:             0,
                dragEndCount:          0,
                insideElementPressed:  true,
                insideElementReleased: true,
                contacts:              0,
                trackedPointers:       0,
                quickClick:            true
            });

            // enter-press-move-release-move-exit (drag, release in tracked element)
            resetForAssessment();
            simulateEnter(0, 0);
            simulateDown(0, 0);
            simulateMove(1, 1, 100);
            simulateUp(10, 10);
            simulateMove(-1, -1, 100);
            simulateLeave(-1, -1);
            assessGestureExpectations({
                description:           'enter-press-move-release-move-exit (drag, release in tracked element):  ',
                enterCount:            1,
                exitCount:             1,
                pressCount:            1,
                releaseCount:          1,
                moveCount:             200,
                clickCount:            1,
                dblClickCount:         0,
                dragCount:             100,
                dragEndCount:          1,
                insideElementPressed:  true,
                insideElementReleased: true,
                contacts:              0,
                trackedPointers:       0,
                quickClick:            false
            });

            // enter-press-move-exit-move-release (drag, release outside tracked element)
            resetForAssessment();
            simulateEnter(0, 0);
            simulateDown(0, 0);
            simulateMove(1, 1, 5);
            simulateMove(-1, -1, 5);
            simulateLeave(-1, -1);
            simulateMove(-1, -1, 5);
            simulateUp(-5, -5);
            assessGestureExpectations({
                description:           'enter-press-move-exit-move-release (drag, release outside tracked element):  ',
                enterCount:            1,
                exitCount:             1,
                pressCount:            1,
                releaseCount:          1,
                moveCount:             15,
                clickCount:            0,
                dblClickCount:         0,
                dragCount:             15,
                dragEndCount:          1,
                insideElementPressed:  true,
                insideElementReleased: false,
                contacts:              0,
                trackedPointers:       0,
                quickClick:            false
            });

            unhookViewerHandlers();

            viewer.close();
            start();
        };

        viewer.addHandler( 'open', onOpen );
        viewer.open( '/test/data/testpattern.dzi' );
    } );

    // ----------
    asyncTest( 'Viewer: preventDefaultAction', function () {
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
    asyncTest( 'EventSource/MouseTracker/Viewer: event.originalEvent event.userData canvas-drag canvas-drag-end canvas-release canvas-click', function () {
        var $canvas = $( viewer.element ).find( '.openseadragon-canvas' ).not( '.navigator .openseadragon-canvas' ),
            mouseTracker = null,
            userData = { item1: 'Test user data', item2: Math.random() },
            originalUserData = { item1: userData.item1, item2: userData.item2 },
            dragCount = 10,
            dragsHandledEventSource = 0,
            dragEndsHandledEventSource = 0,
            releasesHandledEventSource = 0,
            clicksHandledEventSource = 0,
            eventsHandledMouseTracker = 0,
            eventSourcePassedMouseTracker = 0,
            originalEventsPassedMouseTracker = 0,
            eventsHandledViewer = 0,
            originalEventsPassedViewer = 0,
            dragEndsExpected = 1,
            releasesExpected = 1,
            clicksExpected = 1;

        var onOpen = function ( event ) {
            viewer.removeHandler( 'open', onOpen );

            viewer.addHandler( 'canvas-drag', onEventSourceDrag );
            viewer.addHandler( 'canvas-drag-end', onEventSourceDragEnd );
            viewer.addHandler( 'canvas-release', onEventSourceRelease );
            viewer.addHandler( 'canvas-click', onEventSourceClick );

            mouseTracker = new OpenSeadragon.MouseTracker( {
                element: $canvas[0],
                userData: userData,
                clickTimeThreshold: OpenSeadragon.DEFAULT_SETTINGS.clickTimeThreshold,
                clickDistThreshold: OpenSeadragon.DEFAULT_SETTINGS.clickDistThreshold,
                dblClickTimeThreshold: OpenSeadragon.DEFAULT_SETTINGS.dblClickTimeThreshold,
                dblClickDistThreshold: OpenSeadragon.DEFAULT_SETTINGS.dblClickDistThreshold,
                focusHandler: onMouseTrackerFocus,
                blurHandler: onMouseTrackerBlur,
                enterHandler: onMouseTrackerEnter,
                pressHandler: onMouseTrackerPress,
                moveHandler: onMouseTrackerMove,
                dragHandler: onMouseTrackerDrag,
                dragEndHandler: onMouseTrackerDragEnd,
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

        var onEventSourceDragEnd = function ( event ) {
            checkOriginalEventReceivedViewer( event );
            dragEndsHandledEventSource++;
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

        var onMouseTrackerDragEnd = function ( event ) {
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
            equal( dragEndsHandledEventSource, dragEndsExpected, "'canvas-drag-end' event count matches expected (" + dragEndsExpected + ")" );
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
    asyncTest( 'EventSource: addHandler without userData', function () {
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
    asyncTest( 'EventSource: addHandler with userData', function () {
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
    asyncTest( 'Viewer: tile-drawing event', function () {
        var tileDrawing = function ( event ) {
            viewer.removeHandler( 'tile-drawing', tileDrawing );
            ok( event, 'Event handler should be invoked' );
            if ( event ) {
                // Make sure we have the expected elements set
                ok(event.context, "Context should be set");
                ok(event.tile, "Tile should be set");
                ok(event.rendered, "Rendered should be set");
            }
            viewer.close();
            start();
        };

        viewer.addHandler( 'tile-drawing', tileDrawing );
        viewer.open( '/test/data/testpattern.dzi' );
    } );

} )();
