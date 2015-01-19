(function($, undefined) {

    /**
     * Plugin to force OpenSeadragon to use the legacy mouse pointer event model
     */

    $.MouseTracker.subscribeEvents = [ "click", "dblclick", "keypress", "focus", "blur", $.MouseTracker.wheelEventName ];

    if( $.MouseTracker.wheelEventName == "DOMMouseScroll" ) {
        // Older Firefox
        $.MouseTracker.subscribeEvents.push( "MozMousePixelScroll" );
    }

    $.MouseTracker.havePointerEvents = false;
    if ( $.Browser.vendor === $.BROWSERS.IE && $.Browser.version < 9 ) {
        $.MouseTracker.subscribeEvents.push( "mouseenter", "mouseleave" );
        $.MouseTracker.haveMouseEnter = true;
    } else {
        $.MouseTracker.subscribeEvents.push( "mouseover", "mouseout" );
        $.MouseTracker.haveMouseEnter = false;
    }
    $.MouseTracker.subscribeEvents.push( "mousedown", "mouseup", "mousemove" );
    if ( 'ontouchstart' in window ) {
        // iOS, Android, and other W3c Touch Event implementations
        //    (see http://www.w3.org/TR/touch-events/)
        //    (see https://developer.apple.com/library/ios/documentation/AppleApplications/Reference/SafariWebContent/HandlingEvents/HandlingEvents.html)
        //    (see https://developer.apple.com/library/safari/documentation/AppleApplications/Reference/SafariWebContent/HandlingEvents/HandlingEvents.html)
        $.MouseTracker.subscribeEvents.push( "touchstart", "touchend", "touchmove", "touchcancel" );
    }
    if ( 'ongesturestart' in window ) {
        // iOS (see https://developer.apple.com/library/ios/documentation/AppleApplications/Reference/SafariWebContent/HandlingEvents/HandlingEvents.html)
        //   Subscribe to these to prevent default gesture handling
        $.MouseTracker.subscribeEvents.push( "gesturestart", "gesturechange" );
    }
    $.MouseTracker.mousePointerId = "legacy-mouse";
    $.MouseTracker.maxTouchPoints = 10;


}(OpenSeadragon));
