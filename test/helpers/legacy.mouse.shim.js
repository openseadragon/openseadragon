(function($) {

    /**
     * Plugin to force OpenSeadragon to use the legacy mouse pointer event model
     */

    $.MouseTracker.subscribeEvents = [ "click", "dblclick", "keypress", "focus", "blur", $.MouseTracker.wheelEventName ];

    if( $.MouseTracker.wheelEventName === "DOMMouseScroll" ) {
        // Older Firefox
        $.MouseTracker.subscribeEvents.push( "MozMousePixelScroll" );
    }

    $.MouseTracker.havePointerEvents = false;
    $.MouseTracker.subscribeEvents.push( "mouseenter", "mouseleave", "mouseover", "mouseout", "mousedown", "mouseup", "mousemove" );
    $.MouseTracker.mousePointerId = "legacy-mouse";
    // Legacy mouse events capture support (IE/Firefox only?)
    $.MouseTracker.havePointerCapture = (function () {
        var divElement = document.createElement( 'div' );
        return $.isFunction( divElement.setCapture ) && $.isFunction( divElement.releaseCapture );
    }());
    if ( $.MouseTracker.havePointerCapture ) {
        $.MouseTracker.subscribeEvents.push( "losecapture" );
    }
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

}(OpenSeadragon));
