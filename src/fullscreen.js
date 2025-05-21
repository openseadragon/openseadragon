/*
 * OpenSeadragon - full-screen support functions
 *
 * Copyright (C) 2009 CodePlex Foundation
 * Copyright (C) 2010-2025 OpenSeadragon contributors
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 * - Redistributions of source code must retain the above copyright notice,
 *   this list of conditions and the following disclaimer.
 *
 * - Redistributions in binary form must reproduce the above copyright
 *   notice, this list of conditions and the following disclaimer in the
 *   documentation and/or other materials provided with the distribution.
 *
 * - Neither the name of CodePlex Foundation nor the names of its
 *   contributors may be used to endorse or promote products derived from
 *   this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

(function( $ ) {
    /**
     * Determine native full screen support we can get from the browser.
     * @member fullScreenApi
     * @memberof OpenSeadragon
     * @type {object}
     * @property {Boolean} supportsFullScreen Return true if full screen API is supported.
     * @property {Function} isFullScreen Return true if currently in full screen mode.
     * @property {Function} getFullScreenElement Return the element currently in full screen mode.
     * @property {Function} requestFullScreen Make a request to go in full screen mode.
     * @property {Function} exitFullScreen Make a request to exit full screen mode.
     * @property {Function} cancelFullScreen Deprecated, use exitFullScreen instead.
     * @property {String} fullScreenEventName Event fired when the full screen mode change.
     * @property {String} fullScreenErrorEventName Event fired when a request to go
     * in full screen mode failed.
     */
    var fullScreenApi = {
        supportsFullScreen: false,
        isFullScreen: function() { return false; },
        getFullScreenElement: function() { return null; },
        requestFullScreen: function() {},
        exitFullScreen: function() {},
        cancelFullScreen: function() {},
        fullScreenEventName: '',
        fullScreenErrorEventName: ''
    };

    // check for native support
    if ( document.exitFullscreen ) {
        // W3C standard
        fullScreenApi.supportsFullScreen = true;
        fullScreenApi.getFullScreenElement = function() {
            return document.fullscreenElement;
        };
        fullScreenApi.requestFullScreen = function( element ) {
            return element.requestFullscreen().catch(function (msg) {
                $.console.error('Fullscreen request failed: ', msg);
            });
        };
        fullScreenApi.exitFullScreen = function() {
            document.exitFullscreen().catch(function (msg) {
                $.console.error('Error while exiting fullscreen: ', msg);
            });
        };
        fullScreenApi.fullScreenEventName = "fullscreenchange";
        fullScreenApi.fullScreenErrorEventName = "fullscreenerror";
    } else if ( document.msExitFullscreen ) {
        // IE 11
        fullScreenApi.supportsFullScreen = true;
        fullScreenApi.getFullScreenElement = function() {
            return document.msFullscreenElement;
        };
        fullScreenApi.requestFullScreen = function( element ) {
            return element.msRequestFullscreen();
        };
        fullScreenApi.exitFullScreen = function() {
            document.msExitFullscreen();
        };
        fullScreenApi.fullScreenEventName = "MSFullscreenChange";
        fullScreenApi.fullScreenErrorEventName = "MSFullscreenError";
    } else if ( document.webkitExitFullscreen ) {
        // Recent webkit
        fullScreenApi.supportsFullScreen = true;
        fullScreenApi.getFullScreenElement = function() {
            return document.webkitFullscreenElement;
        };
        fullScreenApi.requestFullScreen = function( element ) {
            return element.webkitRequestFullscreen();
        };
        fullScreenApi.exitFullScreen = function() {
            document.webkitExitFullscreen();
        };
        fullScreenApi.fullScreenEventName = "webkitfullscreenchange";
        fullScreenApi.fullScreenErrorEventName = "webkitfullscreenerror";
    } else if ( document.webkitCancelFullScreen ) {
        // Old webkit
        fullScreenApi.supportsFullScreen = true;
        fullScreenApi.getFullScreenElement = function() {
            return document.webkitCurrentFullScreenElement;
        };
        fullScreenApi.requestFullScreen = function( element ) {
            return element.webkitRequestFullScreen();
        };
        fullScreenApi.exitFullScreen = function() {
            document.webkitCancelFullScreen();
        };
        fullScreenApi.fullScreenEventName = "webkitfullscreenchange";
        fullScreenApi.fullScreenErrorEventName = "webkitfullscreenerror";
    } else if ( document.mozCancelFullScreen ) {
        // Firefox
        fullScreenApi.supportsFullScreen = true;
        fullScreenApi.getFullScreenElement = function() {
            return document.mozFullScreenElement;
        };
        fullScreenApi.requestFullScreen = function( element ) {
            return element.mozRequestFullScreen();
        };
        fullScreenApi.exitFullScreen = function() {
            document.mozCancelFullScreen();
        };
        fullScreenApi.fullScreenEventName = "mozfullscreenchange";
        fullScreenApi.fullScreenErrorEventName = "mozfullscreenerror";
    }
    fullScreenApi.isFullScreen = function() {
        return fullScreenApi.getFullScreenElement() !== null;
    };
    fullScreenApi.cancelFullScreen = function() {
        $.console.error("cancelFullScreen is deprecated. Use exitFullScreen instead.");
        fullScreenApi.exitFullScreen();
    };

    // export api
    $.extend( $, fullScreenApi );

})( OpenSeadragon );
