/**
 * Determines the appropriate level of native full screen support we can get 
 * from the browser.
 * Thanks to John Dyer for the implementation and research
 * http://johndyer.name/native-fullscreen-javascript-api-plus-jquery-plugin/
 * Also includes older IE support based on
 * http://stackoverflow.com/questions/1125084/how-to-make-in-javascript-full-screen-windows-stretching-all-over-the-screen/7525760
 * @name $.supportsFullScreen
 */
(function( $ ) {
    var fullScreenApi = {
            supportsFullScreen: false,
            isFullScreen: function() { return false; },
            requestFullScreen: function() {},
            cancelFullScreen: function() {},
            fullScreenEventName: '',
            prefix: ''
        },
        browserPrefixes = 'webkit moz o ms khtml'.split(' ');
 
    // check for native support
    if (typeof document.cancelFullScreen != 'undefined') {
        fullScreenApi.supportsFullScreen = true;
    } else {
        // check for fullscreen support by vendor prefix
        for (var i = 0, il = browserPrefixes.length; i < il; i++ ) {
            fullScreenApi.prefix = browserPrefixes[i];
 
            if (typeof document[fullScreenApi.prefix + 'CancelFullScreen' ] != 'undefined' ) {
                fullScreenApi.supportsFullScreen = true;
 
                break;
            }
        }
    }
 
    // update methods to do something useful
    if (fullScreenApi.supportsFullScreen) {
        fullScreenApi.fullScreenEventName = fullScreenApi.prefix + 'fullscreenchange';
 
        fullScreenApi.isFullScreen = function() {
            switch (this.prefix) {
                case '':
                    return document.fullScreen;
                case 'webkit':
                    return document.webkitIsFullScreen;
                default:
                    return document[this.prefix + 'FullScreen'];
            }
        };
        fullScreenApi.requestFullScreen = function( element ) {
            return (this.prefix === '') ? 
                element.requestFullScreen() : 
                element[this.prefix + 'RequestFullScreen']();

        };
        fullScreenApi.cancelFullScreen = function( element ) {
            return (this.prefix === '') ? 
                document.cancelFullScreen() : 
                document[this.prefix + 'CancelFullScreen']();
        };
    } else if ( typeof window.ActiveXObject !== "undefined" ){
        // Older IE.
        fullScreenApi.requestFullScreen = function(){
            var wscript = new ActiveXObject("WScript.Shell");
            if ( wscript !== null ) {
                wscript.SendKeys("{F11}");
            }
            return false;
        };
        fullScreenApi.cancelFullScreen = fullScreenApi.requestFullScreen;
    }

 
    // export api
    $.extend( $, fullScreenApi );

})( OpenSeadragon );