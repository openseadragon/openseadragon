/* global QUnit, $, testLog */

(function () {
    let viewer;

    QUnit.module( 'Cooperative Gestures', {
        beforeEach: function () {
            $( '<div id="coopexample"></div>' ).appendTo( '#qunit-fixture' );

            testLog.reset();

            // eslint-disable-next-line new-cap
            viewer = OpenSeadragon( {
                id: 'coopexample',
                prefixUrl: '/build/openseadragon/images/',
                springStiffness: 100, // Faster animation = faster tests
                cooperativeGestures: true
            } );
        },
        afterEach: function () {
            if ( viewer ) {
                viewer.destroy();
            }
            viewer = null;
        }
    } );

    // Dispatches a native wheel event over the viewer canvas.
    const simulateWheel = function ( viewer, options ) {
        options = options || {};
        // Resets the scroll throttle so back-to-back synthetic wheels in one test aren't dropped
        viewer._lastScrollTime = 0;
        const offset = $( viewer.canvas ).offset();
        const event = new WheelEvent( 'wheel', {
            bubbles: true,
            cancelable: true,
            clientX: offset.left + 10,
            clientY: offset.top + 10,
            deltaY: 'deltaY' in options ? options.deltaY : -120,
            ctrlKey: !!options.ctrlKey,
            metaKey: !!options.metaKey
        } );
        viewer.canvas.dispatchEvent( event );
    };

    // ----------
    // Touch is checked via config state rather than a simulated drag (TouchUtil cannot reproduce this)
    QUnit.test( 'cooperativeGestures wires touch-action, tracker, and the getter', function ( assert ) {
        assert.equal( viewer.cooperativeGestures, true, 'option is set on the instance' );
        assert.equal( viewer._isCooperative, true, '_isCooperative is true outside fullscreen' );
        assert.equal( viewer.canvas.style.touchAction, 'pan-x pan-y', 'canvas touch-action allows page pan' );
        assert.equal( viewer.container.style.touchAction, 'pan-x pan-y', 'container touch-action allows page pan' );
        assert.equal( viewer.innerTracker.cooperativeGestureHandling, true, 'inner tracker is cooperative' );
    } );

    // ----------
    QUnit.test( 'a non-cooperative viewer keeps touch-action none', function ( assert ) {
        $( '<div id="coopexample2"></div>' ).appendTo( '#qunit-fixture' );
        // eslint-disable-next-line new-cap
        const plain = OpenSeadragon( {
            id: 'coopexample2',
            prefixUrl: '/build/openseadragon/images/',
            springStiffness: 100
        } );

        assert.equal( plain.cooperativeGestures, false, 'option defaults to false' );
        assert.equal( plain._isCooperative, false, '_isCooperative is false' );
        assert.equal( plain.canvas.style.touchAction, 'none', 'canvas captures all touches' );
        assert.equal( plain.innerTracker.cooperativeGestureHandling, false, 'inner tracker is not cooperative' );

        plain.destroy();
    } );

    // ----------
    QUnit.test( 'modifier-less wheel does not zoom and raises canvas-cooperative-gesture', function ( assert ) {
        const done = assert.async();

        viewer.addOnceHandler( 'open', function () {
            let raised = null;
            viewer.addHandler( 'canvas-cooperative-gesture', function ( e ) {
                raised = e;
            } );

            const zoomBefore = viewer.viewport.getZoom();
            simulateWheel( viewer, { ctrlKey: false } );

            assert.ok( raised, 'the event was raised' );
            assert.equal( raised.gesture, 'scroll', 'gesture is "scroll"' );
            assert.equal( raised.message, OpenSeadragon.getString( 'GestureHints.Scroll', /Mac/i.test( navigator.platform || navigator.userAgent || '' ) ? '⌘' : 'Ctrl' ), 'message is the default scroll hint' );
            assert.equal( raised.preventDefaultAction, false, 'preventDefaultAction defaults to false' );
            assert.equal( viewer.viewport.getZoom(), zoomBefore, 'the viewport did not zoom' );

            done();
        } );
        viewer.open( '/test/data/testpattern.dzi' );
    } );

    // ----------
    QUnit.test( 'ctrl+wheel zooms and does not raise the event', function ( assert ) {
        const done = assert.async();

        viewer.addOnceHandler( 'open', function () {
            let raised = false;
            viewer.addHandler( 'canvas-cooperative-gesture', function () {
                raised = true;
            } );

            const zoomBefore = viewer.viewport.getZoom();
            simulateWheel( viewer, { ctrlKey: true } );

            assert.notOk( raised, 'the event was not raised' );
            assert.notEqual( viewer.viewport.getZoom(), zoomBefore, 'the viewport zoomed' );

            done();
        } );
        viewer.open( '/test/data/testpattern.dzi' );
    } );

    // ----------
    QUnit.test( 'a subscriber can replace the hint message or suppress the overlay', function ( assert ) {
        const done = assert.async();

        viewer.addOnceHandler( 'open', function () {
            // First: suppress the built-in overlay entirely.
            const suppress = function ( e ) {
                e.preventDefaultAction = true;
            };
            viewer.addHandler( 'canvas-cooperative-gesture', suppress );
            simulateWheel( viewer, { ctrlKey: false } );
            assert.notOk( viewer.cooperativeOverlay, 'no overlay is created when preventDefaultAction is set' );
            viewer.removeHandler( 'canvas-cooperative-gesture', suppress );

            // Then: replace the message and let the overlay show it.
            viewer.addHandler( 'canvas-cooperative-gesture', function ( e ) {
                e.message = 'Custom hint';
            } );
            simulateWheel( viewer, { ctrlKey: false } );
            assert.ok( viewer.cooperativeOverlay, 'an overlay is created' );
            assert.equal( viewer.cooperativeOverlay.firstChild.textContent, 'Custom hint', 'the overlay shows the custom message' );
            assert.equal( viewer.cooperativeOverlay.style.opacity, '1', 'the overlay is visible' );

            done();
        } );
        viewer.open( '/test/data/testpattern.dzi' );
    } );

    // ----------
    QUnit.test( 'composition: scrollToZoom:false raises no cooperative event', function ( assert ) {
        const done = assert.async();

        viewer.addOnceHandler( 'open', function () {
            viewer.gestureSettingsMouse.scrollToZoom = false;

            let raised = false;
            viewer.addHandler( 'canvas-cooperative-gesture', function () {
                raised = true;
            } );

            const zoomBefore = viewer.viewport.getZoom();
            simulateWheel( viewer, { ctrlKey: false } );

            assert.notOk( raised, 'no event when the underlying gesture is already disabled' );
            assert.equal( viewer.viewport.getZoom(), zoomBefore, 'the viewport did not zoom' );

            done();
        } );
        viewer.open( '/test/data/testpattern.dzi' );
    } );

    // ----------
    QUnit.test( 'setCooperativeGestures toggles state at runtime', function ( assert ) {
        viewer.setCooperativeGestures( false );
        assert.equal( viewer._isCooperative, false, 'disabled: _isCooperative false' );
        assert.equal( viewer.canvas.style.touchAction, 'none', 'disabled: canvas captures all touches' );
        assert.equal( viewer.innerTracker.cooperativeGestureHandling, false, 'disabled: inner tracker not cooperative' );

        viewer.setCooperativeGestures( true );
        assert.equal( viewer._isCooperative, true, 're-enabled: _isCooperative true' );
        assert.equal( viewer.canvas.style.touchAction, 'pan-x pan-y', 're-enabled: canvas allows page pan' );
        assert.equal( viewer.innerTracker.cooperativeGestureHandling, true, 're-enabled: inner tracker cooperative' );
    } );

    // ----------
    QUnit.test( 'cooperative mode is suspended in full-page', function ( assert ) {
        viewer.setFullPage( true );
        assert.equal( viewer.isFullPage(), true, 'viewer is in full-page' );
        assert.equal( viewer._isCooperative, false, 'cooperative is suspended in full-page' );
        assert.equal( viewer.canvas.style.touchAction, 'none', 'full-page: canvas captures all touches' );
        assert.equal( viewer.innerTracker.cooperativeGestureHandling, false, 'full-page: inner tracker not cooperative' );

        viewer.setFullPage( false );
        assert.equal( viewer._isCooperative, true, 'cooperative restored on exit' );
        assert.equal( viewer.canvas.style.touchAction, 'pan-x pan-y', 'exit: canvas allows page pan again' );
        assert.equal( viewer.innerTracker.cooperativeGestureHandling, true, 'exit: inner tracker cooperative again' );
    } );

})();
