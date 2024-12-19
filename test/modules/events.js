/* global QUnit, $, TouchUtil, Util, testLog */

(function () {
    var viewer;
    var sleep = time => new Promise(res => setTimeout(res, time));

    QUnit.module( 'Events', {
        beforeEach: function () {
            $( '<div id="eventsexample"></div>' ).appendTo( "#qunit-fixture" );

            testLog.reset();

            // eslint-disable-next-line new-cap
            viewer = OpenSeadragon( {
                id: 'eventsexample',
                prefixUrl: '/build/openseadragon/images/',
                springStiffness: 100 // Faster animation = faster tests
            } );
        },
        afterEach: function () {
            if (viewer){
                viewer.destroy();
            }
            viewer = null;
        }
    } );

    // ----------
    QUnit.test( 'MouseTracker: mouse gestures', function (assert) {
        var done = assert.async();
        var $canvas = $( viewer.element ).find( '.openseadragon-canvas' ).not( '.navigator .openseadragon-canvas' ),
            simEvent = {},
            offset = $canvas.offset(),
            tracker = viewer.innerTracker,
            origEnterHandler,
            origLeaveHandler,
            origPressHandler,
            origReleaseHandler,
            origNonPrimaryPressHandler,
            origNonPrimaryReleaseHandler,
            origMoveHandler,
            origClickHandler,
            origDblClickHandler,
            origDragHandler,
            origDragEndHandler,
            enterCount,
            leaveCount,
            pressCount,
            releaseCount,
            rightPressCount,
            rightReleaseCount,
            middlePressCount,
            middleReleaseCount,
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
            origLeaveHandler = tracker.leaveHandler;
            tracker.leaveHandler = function ( event ) {
                leaveCount++;
                if (origLeaveHandler) {
                    return origLeaveHandler( event );
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
            origNonPrimaryPressHandler = tracker.nonPrimaryPressHandler;
            tracker.nonPrimaryPressHandler = function ( event ) {
                if (event.button === 0) {
                    pressCount++;
                } else if (event.button === 1) {
                    middlePressCount++;
                } else if (event.button === 2) {
                    rightPressCount++;
                }
                if (origNonPrimaryPressHandler) {
                    return origNonPrimaryPressHandler( event );
                } else {
                    return true;
                }
            };
            origNonPrimaryReleaseHandler = tracker.nonPrimaryReleaseHandler;
            tracker.nonPrimaryReleaseHandler = function ( event ) {
                if (event.button === 0) {
                    releaseCount++;
                } else if (event.button === 1) {
                    middleReleaseCount++;
                } else if (event.button === 2) {
                    rightReleaseCount++;
                }
                if (origNonPrimaryReleaseHandler) {
                    return origNonPrimaryReleaseHandler( event );
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
            tracker.leaveHandler = origLeaveHandler;
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
            simEvent.clientY = offset.top + y;
            $canvas.simulate( 'mouseenter', simEvent );
        };

        var simulateLeave = function (x, y) {
            simEvent.clientX = offset.left + x;
            simEvent.clientY = offset.top + y;
            simEvent.relatedTarget = document.body;
            $canvas.simulate( 'mouseleave', simEvent );
        };

        //var simulateLeaveFrame = function (x, y) {
        //    simEvent.clientX = offset.left + x;
        //    simEvent.clientY = offset.top  + y;
        //    simEvent.relatedTarget = document.getElementsByTagName("html")[0];
        //    $canvas.simulate( 'mouseleave', simEvent );
        //};

        var simulateDown = function (x, y) {
            simEvent.button = 0;
            simEvent.clientX = offset.left + x;
            simEvent.clientY = offset.top + y;
            $canvas.simulate( 'mousedown', simEvent );
        };

        var simulateUp = function (x, y) {
            simEvent.button = 0;
            simEvent.clientX = offset.left + x;
            simEvent.clientY = offset.top + y;
            $canvas.simulate( 'mouseup', simEvent );
        };

        var simulateNonPrimaryDown = function (x, y, button) {
            simEvent.button = button;
            simEvent.clientX = offset.left + x;
            simEvent.clientY = offset.top + y;
            $canvas.simulate( 'mousedown', simEvent );
        };

        var simulateNonPrimaryUp = function (x, y, button) {
            simEvent.button = button;
            simEvent.clientX = offset.left + x;
            simEvent.clientY = offset.top + y;
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
                button: 0,
                clientX: offset.left,
                clientY: offset.top
            };
            enterCount = 0;
            leaveCount = 0;
            pressCount = 0;
            releaseCount = 0;
            rightPressCount = 0;
            rightReleaseCount = 0;
            middlePressCount = 0;
            middleReleaseCount = 0;
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
                assert.equal( enterCount, expected.enterCount, expected.description + 'enterHandler event count matches expected (' + expected.enterCount + ')' );
            }
            if ('leaveCount' in expected) {
                assert.equal( leaveCount, expected.leaveCount, expected.description + 'leaveHandler event count matches expected (' + expected.leaveCount + ')' );
            }
            if ('pressCount' in expected) {
                assert.equal( pressCount, expected.pressCount, expected.description + 'pressHandler event count matches expected (' + expected.pressCount + ')' );
            }
            if ('releaseCount' in expected) {
                assert.equal( releaseCount, expected.releaseCount, expected.description + 'releaseHandler event count matches expected (' + expected.releaseCount + ')' );
            }
            if ('rightPressCount' in expected) {
                assert.equal( rightPressCount, expected.rightPressCount, expected.description + 'nonPrimaryPressHandler event count (secondary/right button) matches expected (' + expected.rightPressCount + ')' );
            }
            if ('rightReleaseCount' in expected) {
                assert.equal( rightReleaseCount, expected.rightReleaseCount, expected.description + 'nonPrimaryReleaseHandler event count (secondary/right button) matches expected (' + expected.rightReleaseCount + ')' );
            }
            if ('middlePressCount' in expected) {
                assert.equal( middlePressCount, expected.middlePressCount, expected.description + 'nonPrimaryPressHandler event count (aux/middle button) matches expected (' + expected.middlePressCount + ')' );
            }
            if ('middleReleaseCount' in expected) {
                assert.equal( middleReleaseCount, expected.middleReleaseCount, expected.description + 'nonPrimaryReleaseHandler event count (aux/middle button) matches expected (' + expected.middleReleaseCount + ')' );
            }
            if ('moveCount' in expected) {
                assert.equal( moveCount, expected.moveCount, expected.description + 'moveHandler event count matches expected (' + expected.moveCount + ')' );
            }
            if ('clickCount' in expected) {
                assert.equal( clickCount, expected.clickCount, expected.description + 'clickHandler event count matches expected (' + expected.clickCount + ')' );
            }
            if ('dblClickCount' in expected) {
                assert.equal( dblClickCount, expected.dblClickCount, expected.description + 'dblClickHandler event count matches expected (' + expected.dblClickCount + ')' );
            }
            if ('dragCount' in expected) {
                assert.equal( dragCount, expected.dragCount, expected.description + 'dragHandler event count matches expected (' + expected.dragCount + ')' );
            }
            if ('dragEndCount' in expected) {
                assert.equal( dragEndCount, expected.dragEndCount, expected.description + 'dragEndHandler event count matches expected (' + expected.dragEndCount + ')' );
            }
            if ('insideElementPressed' in expected) {
                assert.equal( insideElementPressed, expected.insideElementPressed, expected.description + 'releaseHandler event.insideElementPressed matches expected (' + expected.insideElementPressed + ')' );
            }
            if ('insideElementReleased' in expected) {
                assert.equal( insideElementReleased, expected.insideElementReleased, expected.description + 'releaseHandler event.insideElementReleased matches expected (' + expected.insideElementReleased + ')' );
            }
            if ('contacts' in expected) {
                assert.equal( pointersList.contacts, expected.contacts, expected.description + 'Remaining pointer contact count matches expected (' + expected.contacts + ')' );
            }
            if ('trackedPointers' in expected) {
                assert.equal( pointersList.getLength(), expected.trackedPointers, expected.description + 'Remaining tracked pointer count matches expected (' + expected.trackedPointers + ')' );
            }
            if ('quickClick' in expected) {
                assert.equal( quickClick, expected.quickClick, expected.description + 'clickHandler event.quick matches expected (' + expected.quickClick + ')' );
            }
            if ('speed' in expected) {
                Util.assessNumericValue(assert, speed, expected.speed, 1.0, expected.description + 'Drag speed');
            }
            if ('direction' in expected) {
                Util.assessNumericValue(assert, direction, expected.direction, 0.2, expected.description + 'Drag direction');
            }
        };

        var onOpen = function ( event ) {

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
                leaveCount:            0,
                pressCount:            0,
                releaseCount:          1,
                rightPressCount:       0,
                rightReleaseCount:     0,
                middlePressCount:      0,
                middleReleaseCount:    0,
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

            // enter-move-leave (fly-over)
            resetForAssessment();
            simulateEnter(0, 0);
            simulateMove(1, 1, 10);
            simulateMove(-1, -1, 10);
            simulateLeave(-1, -1);
            assessGestureExpectations({
                description:           'enter-move-leave (fly-over):  ',
                enterCount:            1,
                leaveCount:            1,
                pressCount:            0,
                releaseCount:          0,
                rightPressCount:       0,
                rightReleaseCount:     0,
                middlePressCount:      0,
                middleReleaseCount:    0,
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

            // enter-press-release-press-release-leave (primary/left double click)
            resetForAssessment();
            simulateEnter(0, 0);
            simulateDown(0, 0);
            simulateUp(0, 0);
            simulateDown(0, 0);
            simulateUp(0, 0);
            simulateLeave(-1, -1);
            assessGestureExpectations({
                description:           'enter-press-release-press-release-leave (primary/left double click):  ',
                enterCount:            1,
                leaveCount:            1,
                pressCount:            2,
                releaseCount:          2,
                rightPressCount:       0,
                rightReleaseCount:     0,
                middlePressCount:      0,
                middleReleaseCount:    0,
                moveCount:             0,
                clickCount:            2,
                dblClickCount:         1,
                dragCount:             0,
                dragEndCount:          0, // drag-end event no longer fired if pointer didn't move (#2064)
                insideElementPressed:  true,
                insideElementReleased: true,
                contacts:              0,
                trackedPointers:       0
                //quickClick:            true
            });

            // enter-press-release-leave (primary/left click)
            resetForAssessment();
            simulateEnter(0, 0);
            simulateDown(0, 0);
            simulateUp(0, 0);
            simulateLeave(-1, -1);
            assessGestureExpectations({
                description:           'enter-press-release-leave (primary/left click):  ',
                enterCount:            1,
                leaveCount:            1,
                pressCount:            1,
                releaseCount:          1,
                rightPressCount:       0,
                rightReleaseCount:     0,
                middlePressCount:      0,
                middleReleaseCount:    0,
                moveCount:             0,
                clickCount:            1,
                dblClickCount:         0,
                dragCount:             0,
                dragEndCount:          0, // drag-end event no longer fired if pointer didn't move (#2064)
                insideElementPressed:  true,
                insideElementReleased: true,
                contacts:              0,
                trackedPointers:       0,
                quickClick:            true
            });

            // enter-nonprimarypress-nonprimaryrelease-leave (secondary/right click)
            resetForAssessment();
            simulateEnter(0, 0);
            simulateNonPrimaryDown(0, 0, 2);
            simulateNonPrimaryUp(0, 0, 2);
            simulateLeave(-1, -1);
            assessGestureExpectations({
                description:           'enter-nonprimarypress-nonprimaryrelease-leave (secondary/right click):  ',
                enterCount:            1,
                leaveCount:            1,
                pressCount:            0,
                releaseCount:          0,
                rightPressCount:       1,
                rightReleaseCount:     1,
                middlePressCount:      0,
                middleReleaseCount:    0,
                moveCount:             0,
                clickCount:            0,
                dblClickCount:         0,
                dragCount:             0,
                dragEndCount:          0,
                //insideElementPressed:  true,
                //insideElementReleased: true,
                contacts:              0,
                trackedPointers:       0,
                //quickClick:            true
            });

            // enter-nonprimarypress-nonprimaryrelease-leave (aux/middle click)
            resetForAssessment();
            simulateEnter(0, 0);
            simulateNonPrimaryDown(0, 0, 1);
            simulateNonPrimaryUp(0, 0, 1);
            simulateLeave(-1, -1);
            assessGestureExpectations({
                description:           'enter-nonprimarypress-nonprimaryrelease-leave (aux/middle click):  ',
                enterCount:            1,
                leaveCount:            1,
                pressCount:            0,
                releaseCount:          0,
                rightPressCount:       0,
                rightReleaseCount:     0,
                middlePressCount:      1,
                middleReleaseCount:    1,
                moveCount:             0,
                clickCount:            0,
                dblClickCount:         0,
                dragCount:             0,
                dragEndCount:          0,
                //insideElementPressed:  true,
                //insideElementReleased: true,
                contacts:              0,
                trackedPointers:       0,
                //quickClick:            true
            });

            // enter-nonprimarypress-move-nonprimaryrelease-move-leave (secondary/right button drag, release in tracked element)
            resetForAssessment();
            simulateEnter(0, 0);
            simulateNonPrimaryDown(0, 0, 2);
            simulateMove(1, 1, 100);
            simulateNonPrimaryUp(10, 10, 2);
            simulateMove(-1, -1, 100);
            simulateLeave(-1, -1);
            assessGestureExpectations({
                description:           'enter-nonprimarypress-move-nonprimaryrelease-move-leave (secondary/right button drag, release in tracked element):  ',
                enterCount:            1,
                leaveCount:            1,
                pressCount:            0,
                releaseCount:          0,
                rightPressCount:       1,
                rightReleaseCount:     1,
                middlePressCount:      0,
                middleReleaseCount:    0,
                moveCount:             200,
                clickCount:            0,
                dblClickCount:         0,
                dragCount:             0,
                dragEndCount:          0,
                //insideElementPressed:  true,
                //insideElementReleased: true,
                contacts:              0,
                trackedPointers:       0,
                //quickClick:            false
            });

            // enter-press-move-release-move-leave (drag, release in tracked element)
            resetForAssessment();
            simulateEnter(0, 0);
            simulateDown(0, 0);
            simulateMove(1, 1, 100);
            simulateUp(10, 10);
            simulateMove(-1, -1, 100);
            simulateLeave(-1, -1);
            assessGestureExpectations({
                description:           'enter-press-move-release-move-leave (drag, release in tracked element):  ',
                enterCount:            1,
                leaveCount:            1,
                pressCount:            1,
                releaseCount:          1,
                rightPressCount:       0,
                rightReleaseCount:     0,
                middlePressCount:      0,
                middleReleaseCount:    0,
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

            // enter-press-move-leave-move-release (drag, release outside tracked element)
            resetForAssessment();
            simulateEnter(0, 0);
            simulateDown(0, 0);
            simulateMove(1, 1, 5);
            simulateMove(-1, -1, 5);
            simulateLeave(-1, -1);
            simulateMove(-1, -1, 5);
            simulateUp(-5, -5);
            assessGestureExpectations({
                description:           'enter-press-move-leave-move-release (drag, release outside tracked element):  ',
                enterCount:            1,
                leaveCount:            1,
                pressCount:            1,
                releaseCount:          1,
                rightPressCount:       0,
                rightReleaseCount:     0,
                middlePressCount:      0,
                middleReleaseCount:    0,
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

            //// enter-press-move-leave-move-release-outside (drag, release outside iframe)
            //resetForAssessment();
            //simulateEnter(0, 0);
            //simulateDown(0, 0);
            //simulateMove(1, 1, 5);
            //simulateMove(-1, -1, 5);
            //simulateLeaveFrame(-1, -1);
            //// you don't actually receive the mouseup if you mouseup outside of the document
            //assessGestureExpectations({
            //    description:           'enter-press-move-leave-move-release-outside (drag, release outside iframe):  ',
            //    enterCount:             1,
            //    leaveCount:              1,
            //    pressCount:            1,
            //    releaseCount:          1,
            //    rightPressCount:       0,
            //    rightReleaseCount:     0,
            //    middlePressCount:      0,
            //    middleReleaseCount:    0,
            //    moveCount:             10,
            //    clickCount:            0,
            //    dblClickCount:         0,
            //    dragCount:             10,
            //    dragEndCount:          1,
            //    insideElementPressed:  true,
            //    insideElementReleased: false,
            //    contacts:              0,
            //    trackedPointers:       0,
            //    quickClick:            false
            //});

            unhookViewerHandlers();

            viewer.close();
            done();
        };

        viewer.addHandler( 'open', onOpen );
        viewer.open( '/test/data/testpattern.dzi' );
    } );

    // ----------
    if ('TouchEvent' in window) {
        QUnit.test( 'MouseTracker: touch events', function (assert) {
            var done = assert.async();
            var tracker = viewer.innerTracker,
                touches;

            var reset = function () {
                touches = [];
                TouchUtil.reset();
            };

            var assessTouchExpectations = function ( expected ) {
                var pointersList = tracker.getActivePointersListByType( 'touch' );
                if ('captureCount' in expected) {
                    assert.equal( pointersList.captureCount, expected.captureCount, expected.description + 'Pointer capture count matches expected (' + expected.captureCount + ')' );
                }
                if ('contacts' in expected) {
                    assert.equal( pointersList.contacts, expected.contacts, expected.description + 'Pointer contact count matches expected (' + expected.contacts + ')' );
                }
                if ('trackedPointers' in expected) {
                    assert.equal( pointersList.getLength(), expected.trackedPointers, expected.description + 'Tracked pointer count matches expected (' + expected.trackedPointers + ')' );
                }
            };

            var onOpen = function ( event ) {
                viewer.removeHandler( 'open', onOpen );

                TouchUtil.initTracker( tracker );

                // start-end-end (multi-touch start event)
                reset();
                touches = TouchUtil.start( [0, 0], [20, 20] );
                assessTouchExpectations({
                    description:        'start-end-end (multi-touch start event) [capture]:  ',
                    captureCount:       2,
                    contacts:           2,
                    trackedPointers:    2
                });
                TouchUtil.end( touches[1] );
                TouchUtil.end( touches[0] );
                assessTouchExpectations({
                    description:        'start-end-end (multi-touch start event) [release]:  ',
                    captureCount:       0,
                    contacts:           0,
                    trackedPointers:    0
                });

                // start-start-end (multi-touch end event)
                reset();
                touches.push( TouchUtil.start([0, 0]) );
                touches.push( TouchUtil.start([20, 20]) );
                assessTouchExpectations({
                    description:        'start-start-end (multi-touch end event) [capture]:  ',
                    captureCount:       2,
                    contacts:           2,
                    trackedPointers:    2
                });
                TouchUtil.end( touches );
                assessTouchExpectations({
                    description:        'start-start-end (multi-touch end event) [release]:  ',
                    captureCount:       0,
                    contacts:           0,
                    trackedPointers:    0
                });

                TouchUtil.resetTracker( tracker );
                viewer.close();
                done();
            };

            viewer.addHandler( 'open', onOpen );
            viewer.open( '/test/data/testpattern.dzi' );
        } );
    }

    // ----------
    QUnit.test('Viewer: preventDefaultAction', function(assert) {
        var done = assert.async();
        var $canvas = $(viewer.element).find('.openseadragon-canvas')
            .not('.navigator .openseadragon-canvas');
        var epsilon = 0.0000001;

        function simulateClickAndDrag() {
            $canvas.simulate('focus');
            // Drag to pan
            Util.simulateViewerClickWithDrag( {
                viewer: viewer,
                widthFactor: 0.25,
                heightFactor: 0.25,
                dragCount: 10,
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
            $canvas.simulate('blur');
        }

        var onOpen = function() {
            viewer.removeHandler('open', onOpen);

            // Hook viewer events to set preventDefaultAction
            var onCanvasClick = function (event) {
                event.preventDefaultAction = true;
            };
            var onCanvasDrag = function (event) {
                event.preventDefaultAction = true;
            };
            viewer.addHandler("canvas-click", onCanvasClick);
            viewer.addHandler("canvas-drag", onCanvasDrag);

            var originalZoom = viewer.viewport.getZoom();
            var originalBounds = viewer.viewport.getBounds();

            simulateClickAndDrag();

            var zoom = viewer.viewport.getZoom();
            var bounds = viewer.viewport.getBounds();
            Util.assessNumericValue(assert, zoom, originalZoom, epsilon,
                "Zoom should be prevented");
            Util.assertRectangleEquals(assert, bounds, originalBounds, epsilon,
                'Pan should be prevented');

            viewer.removeHandler("canvas-click", onCanvasClick);
            viewer.removeHandler("canvas-drag", onCanvasDrag);

            simulateClickAndDrag();

            zoom = viewer.viewport.getZoom();
            bounds = viewer.viewport.getBounds();
            Util.assessNumericValue(assert, zoom, 0.002, epsilon,
                "Zoom should not be prevented");
            Util.assertRectangleEquals(
                assert,
                new OpenSeadragon.Rect(-384.5, -0.25, 500, 0.5),
                bounds,
                epsilon,
                'Pan should not be prevented');

            viewer.close();
            done();
        };

        viewer.addHandler('open', onOpen);
        viewer.open('/test/data/testpattern.dzi');
    });

    // ----------
    QUnit.test('Viewer: preventDefaultAction in dblClickHandler', function(assert) {
        var done = assert.async();
        var epsilon = 0.0000001;
        var $canvas = $( viewer.element ).find( '.openseadragon-canvas' ).not( '.navigator .openseadragon-canvas' ),
            simEvent = {},
            offset = $canvas.offset();

        var simulateEnter = function (x, y) {
            simEvent.clientX = offset.left + x;
            simEvent.clientY = offset.top + y;
            $canvas.simulate( 'mouseenter', simEvent );
        };

        var simulateLeave = function (x, y) {
            simEvent.clientX = offset.left + x;
            simEvent.clientY = offset.top + y;
            simEvent.relatedTarget = document.body;
            $canvas.simulate( 'mouseleave', simEvent );
        };

        var simulateDown = function (x, y) {
            simEvent.button = 0;
            simEvent.clientX = offset.left + x;
            simEvent.clientY = offset.top + y;
            $canvas.simulate( 'mousedown', simEvent );
        };

        var simulateUp = function (x, y) {
            simEvent.button = 0;
            simEvent.clientX = offset.left + x;
            simEvent.clientY = offset.top + y;
            $canvas.simulate( 'mouseup', simEvent );
        };

        function simulateDblTap() {
            simulateEnter(2, 2);
            simulateDown(2, 2);
            simulateUp(2, 2);
            simulateDown(2, 2);
            simulateUp(2, 2);
            simulateLeave(-1, -1);
        }

        var onOpen = function() {
            viewer.removeHandler('open', onOpen);

            var origClickSetting = viewer.gestureSettingsMouse.clickToZoom;
            var origDblClickSetting = viewer.gestureSettingsMouse.dblClickToZoom;

            viewer.gestureSettingsMouse.clickToZoom = false;
            viewer.gestureSettingsMouse.dblClickToZoom = true;

            var originalZoom = viewer.viewport.getZoom();

            var onCanvasDblClick = function (event) {
                event.preventDefaultAction = true;
            };

            viewer.addHandler('canvas-double-click', onCanvasDblClick);

            simulateDblTap();

            var zoom = viewer.viewport.getZoom();
            Util.assessNumericValue(assert, zoom, originalZoom, epsilon,
                "Zoom on double tap should be prevented");

            // Reset event handler to original
            viewer.removeHandler("canvas-double-click", onCanvasDblClick);

            simulateDblTap();
            originalZoom *= viewer.zoomPerClick;

            zoom = viewer.viewport.getZoom();
            Util.assessNumericValue(assert, zoom, originalZoom, epsilon,
                "Zoom on double tap should not be prevented");


            viewer.gestureSettingsMouse.clickToZoom = origClickSetting;
            viewer.gestureSettingsMouse.dblClickToZoom = origDblClickSetting;

            viewer.close();
            done();
        };

        viewer.addHandler('open', onOpen);
        viewer.open('/test/data/testpattern.dzi');
    });

    // ----------
    QUnit.test( 'EventSource/MouseTracker/Viewer: event.originalEvent event.userData canvas-drag canvas-drag-end canvas-release canvas-click', function (assert) {
        var done = assert.async();
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
            releasesExpected = 1;

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

        var onMouseTrackerLeave = function ( event ) {
            checkOriginalEventReceived( event );

            mouseTracker.destroy();
            viewer.removeHandler( 'canvas-drag', onEventSourceDrag );
            viewer.removeHandler( 'canvas-release', onEventSourceRelease );
            viewer.removeHandler( 'canvas-click', onEventSourceClick );

            assert.equal( dragsHandledEventSource, dragCount, "'canvas-drag' event count matches 'mousemove' event count (" + dragCount + ")" );
            assert.equal( dragEndsHandledEventSource, dragEndsExpected, "'canvas-drag-end' event count matches expected (" + dragEndsExpected + ")" );
            assert.equal( releasesHandledEventSource, releasesExpected, "'canvas-release' event count matches expected (" + releasesExpected + ")" );
            assert.equal( clicksHandledEventSource, releasesExpected, "'canvas-click' event count matches expected (" + releasesExpected + ")" );
            assert.equal( originalEventsPassedViewer, eventsHandledViewer, "Original event received count matches expected (" + eventsHandledViewer + ")" );

            assert.equal( eventSourcePassedMouseTracker, eventsHandledMouseTracker, "Event source received count matches expected (" + eventsHandledMouseTracker + ")" );
            assert.equal( originalEventsPassedMouseTracker, eventsHandledMouseTracker, "Original event received count matches expected (" + eventsHandledMouseTracker + ")" );
            assert.deepEqual( event.userData, originalUserData, 'MouseTracker userData was untouched' );

            viewer.close();
            done();
        };

        var onOpen = function ( ) {
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
                leaveHandler: onMouseTrackerLeave
            } );

            var event = {
                clientX: 1,
                clientY: 1
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

        viewer.addHandler( 'open', onOpen );
        viewer.open( '/test/data/testpattern.dzi' );
    } );

    // ----------
    QUnit.test( 'EventSource: addHandler without userData', function (assert) {
        var done = assert.async();
        var openHandler = function ( event ) {
            viewer.removeHandler( 'open', openHandler );
            assert.ok( event, 'Event handler received event data' );
            if ( event ) {
                assert.strictEqual( event.eventSource, viewer, 'eventSource sent, eventSource is viewer' );
                assert.strictEqual( event.userData, null, 'User data defaulted to null' );
            }
            viewer.close();
            done();
        };

        viewer.addHandler( 'open', openHandler );
        viewer.open( '/test/data/testpattern.dzi' );
    } );

    // ----------
    QUnit.test( 'EventSource: addHandler with userData', function (assert) {
        var done = assert.async();
        var userData = { item1: 'Test user data', item2: Math.random() },
            originalUserData = { item1: userData.item1, item2: userData.item2 };

        var openHandler = function ( event ) {
            viewer.removeHandler( 'open', openHandler );
            assert.ok( event, 'Event handler received event data' );
            assert.ok( event && event.userData, 'Event handler received user data' );
            if ( event && event.userData ) {
                assert.deepEqual( event.userData, originalUserData, 'User data was untouched' );
            }
            viewer.close();
            done();
        };

        viewer.addHandler( 'open', openHandler, userData );
        viewer.open( '/test/data/testpattern.dzi' );
    } );

    // ----------
    QUnit.test('EventSource: addOnceHandler', function(assert) {
        var eventSource = new OpenSeadragon.EventSource();
        var userData = 'data';
        var eventData = {
            foo: 1
        };
        var handlerCalledCount = 0;
        eventSource.addOnceHandler('test-event', function(event) {
            handlerCalledCount++;
            assert.strictEqual(event.foo, eventData.foo,
                'Event data should be transmitted to the event.');
            assert.strictEqual(event.userData, userData,
                'User data should be transmitted to the event.');
        }, userData);
        assert.strictEqual(0, handlerCalledCount,
            'Handler should not have been called yet.');
        eventSource.raiseEvent('test-event', eventData);
        assert.strictEqual(1, handlerCalledCount,
            'Handler should have been called once.');
        eventSource.raiseEvent('test-event', eventData);
        assert.strictEqual(1, handlerCalledCount,
            'Handler should still have been called once.');
    });

    // ----------
    QUnit.test('EventSource: addOnceHandler 2 times', function(assert) {
        var eventSource = new OpenSeadragon.EventSource();
        var userData = 'data';
        var eventData = {
            foo: 1
        };
        var handlerCalledCount = 0;
        eventSource.addOnceHandler('test-event', function(event) {
            handlerCalledCount++;
            assert.strictEqual(event.foo, eventData.foo,
                'Event data should be transmitted to the event.');
            assert.strictEqual(event.userData, userData,
                'User data should be transmitted to the event.');
        }, userData, 2);
        assert.strictEqual(0, handlerCalledCount,
            'Handler should not have been called yet.');
        eventSource.raiseEvent('test-event', eventData);
        assert.strictEqual(1, handlerCalledCount,
            'Handler should have been called once.');
        eventSource.raiseEvent('test-event', eventData);
        assert.strictEqual(2, handlerCalledCount,
            'Handler should have been called twice.');
        eventSource.raiseEvent('test-event', eventData);
        assert.strictEqual(2, handlerCalledCount,
            'Handler should still have been called twice.');
    });

    // ----------
    QUnit.test( 'Viewer: event count test with \'tile-drawing\'', function (assert) {
        var done = assert.async();
        if(viewer.drawer.getType() !== 'canvas'){
            assert.expect(0);
            done();
            return;
        }

        assert.ok(viewer.numberOfHandlers('tile-drawing') === 0,
            "'tile-drawing' event is empty by default.");

        var tileDrawing = function ( event ) {
            viewer.removeHandler( 'tile-drawing', tileDrawing );
            assert.ok(viewer.numberOfHandlers('tile-drawing') === 0,
                "'tile-drawing' deleted: count is 0.");

            viewer.close();
            done();
        };

        var tileDrawingDummy = function ( event ) {};

        viewer.addHandler( 'tile-drawing', tileDrawing );
        assert.ok(viewer.numberOfHandlers('tile-drawing') === 1,
            "'tile-drawing' event set to 1.");

        viewer.addHandler( 'tile-drawing', tileDrawingDummy );
        assert.ok(viewer.numberOfHandlers('tile-drawing') === 2,
            "'tile-drawing' event set to 2.");

        viewer.removeHandler( 'tile-drawing', tileDrawingDummy );
        assert.ok(viewer.numberOfHandlers('tile-drawing') === 1,
            "'tile-drawing' deleted once: count is 1.");

        viewer.open( '/test/data/testpattern.dzi' );
    } );

    QUnit.test( 'Viewer: tile-drawing event', function (assert) {
        var done = assert.async();
        if(viewer.drawer.getType() !== 'canvas'){
            assert.expect(0);
            done();
            return;
        }

        var tileDrawing = function ( event ) {
            viewer.removeHandler( 'tile-drawing', tileDrawing );
            assert.ok( event, 'Event handler should be invoked' );
            if ( event ) {
                // Make sure we have the expected elements set
                assert.ok(event.context, "Context should be set");
                assert.ok(event.tile, "Tile should be set");
                assert.ok(event.rendered, "Rendered should be set");
            }
            viewer.close();
            done();
        };

        viewer.addHandler( 'tile-drawing', tileDrawing );
        viewer.open( '/test/data/testpattern.dzi' );
    } );

    // tile-loaded event tests
    QUnit.test( 'Viewer: tile-loaded event without callback.', function (assert) {
        var done = assert.async();
        function tileLoaded ( event ) {
            viewer.removeHandler( 'tile-loaded', tileLoaded);
            var tile = event.tile;
            assert.ok( tile.loading, "The tile should be marked as loading.");
            assert.notOk( tile.loaded, "The tile should not be marked as loaded.");
            //make sure we require tile loaded status once the data is ready
            event.promise.then(function() {
                assert.notOk( tile.loading, "The tile should not be marked as loading.");
                assert.ok( tile.loaded, "The tile should be marked as loaded.");
                done();
            });
        }

        viewer.addHandler( 'tile-loaded', tileLoaded);
        viewer.open( '/test/data/testpattern.dzi' );
    } );

    QUnit.test( 'Viewer: tile-loaded event with 1 callback.', function (assert) {
        var done = assert.async();
        function tileLoaded ( event ) {
            viewer.removeHandler( 'tile-loaded', tileLoaded);
            var tile = event.tile;
            assert.ok( tile.loading, "The tile should be marked as loading.");
            assert.notOk( tile.loaded, "The tile should not be marked as loaded.");
            event.promise.then( _ => {
                assert.notOk( tile.loading, "The tile should not be marked as loading.");
                assert.ok( tile.loaded, "The tile should be marked as loaded.");
                done();
            });
        }

        viewer.addHandler( 'tile-loaded', tileLoaded);
        viewer.open( '/test/data/testpattern.dzi' );
    } );

    QUnit.test( 'Viewer: asynchronous tile processing.', function (assert) {
        var done = assert.async(),
            handledOnce = false;

        const tileLoaded1 = async (event) => {
            assert.ok( handledOnce, "tileLoaded1 with priority 5 should be called second.");
            const tile = event.tile;
            handledOnce = true;
            assert.ok( tile.loading, "The tile should be marked as loading.");
            assert.notOk( tile.loaded, "The tile should not be marked as loaded.");

            event.promise.then(() => {
                assert.notOk( tile.loading, "The tile should not be marked as loading.");
                assert.ok( tile.loaded, "The tile should be marked as loaded.");
                done();
                done = null;
            });
            await sleep(10);
        };
        const tileLoaded2 = async (event) => {
            assert.notOk( handledOnce, "TileLoaded2 with priority 10 should be called first.");
            const tile = event.tile;

            //remove handlers immediatelly, processing is async -> removing in the second function could
            //get after a different tile gets processed
            viewer.removeHandler( 'tile-loaded', tileLoaded1);
            viewer.removeHandler( 'tile-loaded', tileLoaded2);

            handledOnce = true;
            assert.ok( tile.loading, "The tile should be marked as loading.");
            assert.notOk( tile.loaded, "The tile should not be marked as loaded.");

            event.promise.then(() => {
                assert.notOk( tile.loading, "The tile should not be marked as loading.");
                assert.ok( tile.loaded, "The tile should be marked as loaded.");
            });
            await sleep(30);
        };

        //first will get called tileLoaded2 although registered later
        viewer.addHandler( 'tile-loaded', tileLoaded1, null, 5);
        viewer.addHandler( 'tile-loaded', tileLoaded2, null, 10);
        viewer.open( '/test/data/testpattern.dzi' );
    } );

    QUnit.test( 'Viewer: tile-unloaded event.', function(assert) {
        var tiledImage;
        var tiles = [];
        var done = assert.async();

        function tileLoaded( event ) {
            tiledImage = event.tiledImage;
            tiles.push(event.tile);
            if (tiles.length === 1) {
                setTimeout(function() {
                    tiledImage.reset();
                }, 0);
            }
        }

        function tileUnloaded( event ) {
            viewer.removeHandler( 'tile-loaded', tileLoaded);
            viewer.removeHandler( 'tile-unloaded', tileUnloaded );

            assert.equal( tiles.find(t => t === event.tile), event.tile,
                "The unloaded tile should be one of the loaded tiles." );
            assert.equal( tiledImage, event.tiledImage,
                "The tiledImage of the unloaded tile should be the same than the one of the loaded one." );
            done();
        }

        viewer.addHandler( 'tile-loaded', tileLoaded );
        viewer.addHandler( 'tile-unloaded', tileUnloaded );
        viewer.open( '/test/data/testpattern.dzi' );
    } );

} )();
