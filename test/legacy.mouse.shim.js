(function($, undefined) {

    /**
     * Plugin to force OpenSeadragon to use the legacy mouse pointer event model
     */

    $.MouseTracker.subscribeEvents = [ "click", "dblclick", "keypress", "focus", "blur", $.MouseTracker.wheelEventName ];

    if( $.MouseTracker.wheelEventName == "DOMMouseScroll" ) {
        // Older Firefox
        $.MouseTracker.subscribeEvents.push( "MozMousePixelScroll" );
    }

    $.MouseTracker.subscribeEvents.push( "mouseover", "mouseout", "mousedown", "mouseup", "mousemove" );
    $.MouseTracker.haveMouseEnter = false;
    if ( 'ontouchstart' in window ) {
        // iOS, Android, and other W3c Touch Event implementations (see http://www.w3.org/TR/2011/WD-touch-events-20110505)
        $.MouseTracker.subscribeEvents.push( "touchstart", "touchend", "touchmove", "touchcancel" );
        if ( 'ontouchenter' in window ) {
            $.MouseTracker.subscribeEvents.push( "touchenter", "touchleave" );
            $.MouseTracker.haveTouchEnter = true;
        } else {
            $.MouseTracker.haveTouchEnter = false;
        }
    } else {
        $.MouseTracker.haveTouchEnter = false;
    }
    if ( 'ongesturestart' in window ) {
        // iOS (see https://developer.apple.com/library/safari/documentation/UserExperience/Reference/GestureEventClassReference/GestureEvent/GestureEvent.html)
        //   Subscribe to these to prevent default gesture handling
        $.MouseTracker.subscribeEvents.push( "gesturestart", "gesturechange" );
    }
    $.MouseTracker.mousePointerId = "legacy-mouse";
    $.MouseTracker.maxTouchPoints = 10;

}(OpenSeadragon));
