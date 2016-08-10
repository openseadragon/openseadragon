/* global TouchUtil, $ */

(function () {

    var touches,
        identifier,
        target;
      
    // ----------
    window.TouchUtil = {
        reset: function () {
            touches = [];
            identifier = 0;
        },

        initTracker: function ( tracker ) {
            // for testing in other touch-enabled browsers
            if ( !('ontouchstart' in window) ) {
                tracker.setTracking( false );
                OpenSeadragon.MouseTracker.subscribeEvents.push( 'touchstart', 'touchend' );
                tracker.setTracking( true );
            }

            target = tracker.element;
        },

        resetTracker: function ( tracker ) {
            // for testing in other touch-enabled browsers
            if ( !('ontouchstart' in window) ) {
                tracker.setTracking( false );
                ['touchstart', 'touchend'].forEach(function ( type ) { 
                    var index = OpenSeadragon.MouseTracker.subscribeEvents.indexOf( type );
                    if ( index > -1 ) {
                      OpenSeadragon.MouseTracker.subscribeEvents.splice( index, 1 );
                    }
                });
                tracker.setTracking( true );
            }

            target = null;
        },

        start: function () {
            var touch,
                event,
                newTouches = [];

            for ( var i = 0; i < arguments.length; i++ ) {
                touch = createTouch(
                    target.offsetLeft + arguments[ i ][ 0 ],
                    target.offsetTop  + arguments[ i ][ 1 ]
                );

                touches.push( touch );
                newTouches.push( touch );
            }

            event = createTouchEvent( 'touchstart', newTouches );
            target.dispatchEvent( event );
            return newTouches.length === 1 ? newTouches[ 0 ] : newTouches;
        },

        end: function ( changedTouches ) {
            if ( !$.isArray( changedTouches ) ) {
                changedTouches = [ changedTouches ];
            }

            var event;
            touches = touches.filter(function ( touch ) {
                return changedTouches.indexOf( touch ) === -1;
            });

            event = createTouchEvent( 'touchend', changedTouches );
            target.dispatchEvent( event );
        }

    };

    // ----------
    function createTouch( x, y ) {
        try {
            // new spec
            return new Touch({
                identifier: identifier++,
                target: target,
                pageX: target.offsetLeft + x,
                pageY: target.offsetTop + y
            } );
        } catch (e) {
            // legacy
            return document.createTouch( window, target, identifier++, x, y, x, y );
        }
    }

    function createTouchList( touches ) {
        // legacy
        return document.createTouchList.apply( document, touches );
    }

    function createTouchEvent( type, changedTouches ) {
        try {
            // new spec
            return new TouchEvent( type, {
                view: window,
                bubbles: true,
                cancelable: true,
                touches: touches,
                targetTouches: touches,
                changedTouches: changedTouches
            } );
        } catch (e) {
            // legacy
            var touchEvent = document.createEvent( 'TouchEvent' );
            var touch1 = changedTouches[ 0 ];
            touchEvent.initTouchEvent(
                createTouchList( touches ),         // touches
                createTouchList( touches ),         // targetTouches
                createTouchList( changedTouches ),  // changedTouches
                type,                               // type
                window,                             // view
                touch1.screenX,                     // screenX
                touch1.screenY,                     // screenY
                touch1.clientX,                     // clientX
                touch1.clientY,                     // clientY
                false,                              // ctrlKey
                false,                              // altKey
                false,                              // shiftKey
                false                               // metaKey
            );
            return touchEvent;
        }
    }

})();
