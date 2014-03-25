/*
 * OpenSeadragon - full-screen support functions
 *
 * Copyright (C) 2009 CodePlex Foundation
 * Copyright (C) 2010-2013 OpenSeadragon contributors
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

/*
 * Implementation and research by John Dyer in:
 * http://johndyer.name/native-fullscreen-javascript-api-plus-jquery-plugin/
 * John Dyer has released this fullscreen code under the MIT license; see
 * <https://github.com/openseadragon/openseadragon/issues/81>.
 *
 * Copyright (C) 2011 John Dyer
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT
 * OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR
 * THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */


(function( $ ) {
    /**
     * Determined native full screen support we can get from the browser.
     * @member fullScreenApi
     * @memberof OpenSeadragon
     * @type {object}
     * @property {Boolean} supportsFullScreen Return true if full screen API is supported.
     * @property {Function} isFullScreen Return true if currently in full screen mode.
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
            requestFullScreen: function() {},
            exitFullScreen: function() {},
            cancelFullScreen: function() {},
            fullScreenEventName: '',
            fullScreenErrorEventName: ''
        };

    // check for native support
    if ( document.exitFullscreen ) {
        fullScreenApi.supportsFullScreen = true;
        fullScreenApi.isFullScreen = function() {
            return document.fullscreenElement !== null;
        };
        fullScreenApi.requestFullScreen = function( element ) {
            return element.requestFullscreen();
        };
        fullScreenApi.exitFullScreen = function() {
            document.exitFullscreen();
        };
        fullScreenApi.fullScreenEventName = "fullscreenchange";
        fullScreenApi.fullScreenErrorEventName = "fullscreenerror";
    } else if ( document.msExitFullscreen ) {
        fullScreenApi.supportsFullScreen = true;
        fullScreenApi.isFullScreen = function() {
            return document.msFullscreenElement !== null;
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
        fullScreenApi.supportsFullScreen = true;
        fullScreenApi.isFullScreen = function() {
            return document.webkitIsFullScreen;
        };
        fullScreenApi.requestFullScreen = function( element ) {
            return element.webkitRequestFullscreen( Element.ALLOW_KEYBOARD_INPUT );
        };
        fullScreenApi.exitFullScreen = function() {
            document.webkitExitFullscreen();
        };
        fullScreenApi.fullScreenEventName = "webkitfullscreenchange";
        fullScreenApi.fullScreenErrorEventName = "webkitfullscreenerror";
    } else if ( document.mozCancelFullScreen ) {
        fullScreenApi.supportsFullScreen = true;
        fullScreenApi.isFullScreen = function() {
            return document.mozFullScreen;
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
    fullScreenApi.cancelFullScreen = function() {
        $.console.error("cancelFullScreen is deprecated. Use exitFullScreen instead.");
        fullScreenApi.exitFullScreen();
    };

    // export api
    $.extend( $, fullScreenApi );

})( OpenSeadragon );
