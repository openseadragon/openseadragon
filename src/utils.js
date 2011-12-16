
/**
 *
 * TODO: all of utils should be moved to the object literal namespace 
 * OpenSeadragon for less indirection.  If it's useful, it's useful
 * without the name 'utils'.
 *
 **/

OpenSeadragon.Utils = OpenSeadragon.Utils  || function(){};

(function( $ ){

$.Utils = function() {


    var Browser = {
        UNKNOWN: 0,
        IE: 1,
        FIREFOX: 2,
        SAFARI: 3,
        CHROME: 4,
        OPERA: 5
    };

    $.Browser = Browser;


    var self = this;

    var arrActiveX = ["Msxml2.XMLHTTP", "Msxml3.XMLHTTP", "Microsoft.XMLHTTP"];
    var fileFormats = {
        "bmp": false,
        "jpeg": true,
        "jpg": true,
        "png": true,
        "tif": false,
        "wdp": false
    };

    var browser = Browser.UNKNOWN;
    var browserVersion = 0;
    var badAlphaBrowser = false;    // updated in constructor

    var urlParams = {};


    (function() {


        var app = navigator.appName;
        var ver = navigator.appVersion;
        var ua = navigator.userAgent;

        if (app == "Microsoft Internet Explorer" &&
                !!window.attachEvent && !!window.ActiveXObject) {

            var ieOffset = ua.indexOf("MSIE");
            browser = Browser.IE;
            browserVersion = parseFloat(
                    ua.substring(ieOffset + 5, ua.indexOf(";", ieOffset)));

        } else if (app == "Netscape" && !!window.addEventListener) {

            var ffOffset = ua.indexOf("Firefox");
            var saOffset = ua.indexOf("Safari");
            var chOffset = ua.indexOf("Chrome");

            if (ffOffset >= 0) {
                browser = Browser.FIREFOX;
                browserVersion = parseFloat(ua.substring(ffOffset + 8));
            } else if (saOffset >= 0) {
                var slash = ua.substring(0, saOffset).lastIndexOf("/");
                browser = (chOffset >= 0) ? Browser.CHROME : Browser.SAFARI;
                browserVersion = parseFloat(ua.substring(slash + 1, saOffset));
            }

        } else if (app == "Opera" && !!window.opera && !!window.attachEvent) {

            browser = Browser.OPERA;
            browserVersion = parseFloat(ver);

        }


        var query = window.location.search.substring(1);    // ignore '?'
        var parts = query.split('&');

        for (var i = 0; i < parts.length; i++) {
            var part = parts[i];
            var sep = part.indexOf('=');

            if (sep > 0) {
                urlParams[part.substring(0, sep)] =
                        decodeURIComponent(part.substring(sep + 1));
            }
        }


        badAlphaBrowser = (browser == Browser.IE ||
                (browser == Browser.CHROME && browserVersion < 2));

    })();


    function getOffsetParent(elmt, isFixed) {
        if (isFixed && elmt != document.body) {
            return document.body;
        } else {
            return elmt.offsetParent;
        }
    }


    this.getBrowser = function() {
        return browser;
    };

    this.getBrowserVersion = function() {
        return browserVersion;
    };

    this.getElement = function(elmt) {
        if (typeof (elmt) == "string") {
            elmt = document.getElementById(elmt);
        }
        return elmt;
    };

    this.getElementPosition = function(elmt) {
        var elmt = self.getElement(elmt);
        var result = new $.Point();


        var isFixed = self.getElementStyle(elmt).position == "fixed";
        var offsetParent = getOffsetParent(elmt, isFixed);

        while (offsetParent) {
            result.x += elmt.offsetLeft;
            result.y += elmt.offsetTop;

            if (isFixed) {
                result = result.plus(self.getPageScroll());
            }

            elmt = offsetParent;
            isFixed = self.getElementStyle(elmt).position == "fixed";
            offsetParent = getOffsetParent(elmt, isFixed);
        }

        return result;
    };

    this.getElementSize = function(elmt) {
        var elmt = self.getElement(elmt);
        return new $.Point(elmt.clientWidth, elmt.clientHeight);
    };

    this.getElementStyle = function(elmt) {
        var elmt = self.getElement(elmt);

        if (elmt.currentStyle) {
            return elmt.currentStyle;
        } else if (window.getComputedStyle) {
            return window.getComputedStyle(elmt, "");
        } else {
            $.Debug.fail("Unknown element style, no known technique.");
        }
    };

    this.getEvent = function(event) {
        return event ? event : window.event;
    };

    this.getMousePosition = function(event) {
        var event = self.getEvent(event);
        var result = new $.Point();


        if (typeof (event.pageX) == "number") {
            result.x = event.pageX;
            result.y = event.pageY;
        } else if (typeof (event.clientX) == "number") {
            result.x = event.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
            result.y = event.clientY + document.body.scrollTop + document.documentElement.scrollTop;
        } else {
            $.Debug.fail("Unknown event mouse position, no known technique.");
        }

        return result;
    };

    this.getPageScroll = function() {
        var result = new $.Point();
        var docElmt = document.documentElement || {};
        var body = document.body || {};


        if (typeof (window.pageXOffset) == "number") {
            result.x = window.pageXOffset;
            result.y = window.pageYOffset;
        } else if (body.scrollLeft || body.scrollTop) {
            result.x = body.scrollLeft;
            result.y = body.scrollTop;
        } else if (docElmt.scrollLeft || docElmt.scrollTop) {
            result.x = docElmt.scrollLeft;
            result.y = docElmt.scrollTop;
        }


        return result;
    };

    this.getWindowSize = function() {
        var result = new $.Point();
        var docElmt = document.documentElement || {};
        var body = document.body || {};



        if (typeof (window.innerWidth) == 'number') {
            result.x = window.innerWidth;
            result.y = window.innerHeight;
        } else if (docElmt.clientWidth || docElmt.clientHeight) {
            result.x = docElmt.clientWidth;
            result.y = docElmt.clientHeight;
        } else if (body.clientWidth || body.clientHeight) {
            result.x = body.clientWidth;
            result.y = body.clientHeight;
        } else {
            $.Debug.fail("Unknown window size, no known technique.");
        }

        return result;
    };

    this.imageFormatSupported = function(ext) {
        var ext = ext ? ext : "";
        return !!fileFormats[ext.toLowerCase()];
    };

    this.makeCenteredNode = function(elmt) {
        var elmt = $.Utils.getElement(elmt);
        var div = self.makeNeutralElement("div");
        var html = [];

        html.push('<div style="display:table; height:100%; width:100%;');
        html.push('border:none; margin:0px; padding:0px;'); // neutralizing
        html.push('#position:relative; overflow:hidden; text-align:left;">');
        html.push('<div style="#position:absolute; #top:50%; width:100%; ');
        html.push('border:none; margin:0px; padding:0px;'); // neutralizing
        html.push('display:table-cell; vertical-align:middle;">');
        html.push('<div style="#position:relative; #top:-50%; width:100%; ');
        html.push('border:none; margin:0px; padding:0px;'); // neutralizing
        html.push('text-align:center;"></div></div></div>');

        div.innerHTML = html.join('');
        div = div.firstChild;

        var innerDiv = div;
        var innerDivs = div.getElementsByTagName("div");
        while (innerDivs.length > 0) {
            innerDiv = innerDivs[0];
            innerDivs = innerDiv.getElementsByTagName("div");
        }

        innerDiv.appendChild(elmt);

        return div;
    };

    this.makeNeutralElement = function(tagName) {
        var elmt = document.createElement(tagName);
        var style = elmt.style;

        style.background = "transparent none";
        style.border = "none";
        style.margin = "0px";
        style.padding = "0px";
        style.position = "static";

        return elmt;
    };

    this.makeTransparentImage = function(src) {
        var img = self.makeNeutralElement("img");
        var elmt = null;

        if (browser == Browser.IE && browserVersion < 7) {
            elmt = self.makeNeutralElement("span");
            elmt.style.display = "inline-block";

            img.onload = function() {
                elmt.style.width = elmt.style.width || img.width + "px";
                elmt.style.height = elmt.style.height || img.height + "px";

                img.onload = null;
                img = null;     // to prevent memory leaks in IE
            };

            img.src = src;
            elmt.style.filter =
                    "progid:DXImageTransform.Microsoft.AlphaImageLoader(src='" +
                    src + "', sizingMethod='scale')";
        } else {
            elmt = img;
            elmt.src = src;
        }

        return elmt;
    };

    this.setElementOpacity = function(elmt, opacity, usesAlpha) {
        var elmt = self.getElement(elmt);

        if (usesAlpha && badAlphaBrowser) {
            opacity = Math.round(opacity);
        }

        if (opacity < 1) {
            elmt.style.opacity = opacity;
        } else {
            elmt.style.opacity = "";
        }

        if (opacity == 1) {
            var prevFilter = elmt.style.filter || "";
            elmt.style.filter = prevFilter.replace(/alpha\(.*?\)/g, "");
            return;
        }

        var ieOpacity = Math.round(100 * opacity);
        var ieFilter = " alpha(opacity=" + ieOpacity + ") ";

        try {
            if (elmt.filters && elmt.filters.alpha) {
                elmt.filters.alpha.opacity = ieOpacity;
            } else {
                elmt.style.filter += ieFilter;
            }
        } catch (e) {
            elmt.style.filter += ieFilter;
        }
    };

    this.addEvent = function(elmt, eventName, handler, useCapture) {
        var elmt = self.getElement(elmt);


        if (elmt.addEventListener) {
            elmt.addEventListener(eventName, handler, useCapture);
        } else if (elmt.attachEvent) {
            elmt.attachEvent("on" + eventName, handler);
            if (useCapture && elmt.setCapture) {
                elmt.setCapture();
            }
        } else {
            $.Debug.fail("Unable to attach event handler, no known technique.");
        }
    };

    this.removeEvent = function(elmt, eventName, handler, useCapture) {
        var elmt = self.getElement(elmt);


        if (elmt.removeEventListener) {
            elmt.removeEventListener(eventName, handler, useCapture);
        } else if (elmt.detachEvent) {
            elmt.detachEvent("on" + eventName, handler);
            if (useCapture && elmt.releaseCapture) {
                elmt.releaseCapture();
            }
        } else {
            $.Debug.fail("Unable to detach event handler, no known technique.");
        }
    };

    this.cancelEvent = function(event) {
        var event = self.getEvent(event);


        if (event.preventDefault) {
            event.preventDefault();     // W3C for preventing default
        }

        event.cancel = true;            // legacy for preventing default
        event.returnValue = false;      // IE for preventing default
    };

    this.stopEvent = function(event) {
        var event = self.getEvent(event);


        if (event.stopPropagation) {
            event.stopPropagation();    // W3C for stopping propagation
        }

        event.cancelBubble = true;      // IE for stopping propagation
    };

    this.createCallback = function(object, method) {
        var initialArgs = [];
        for (var i = 2; i < arguments.length; i++) {
            initialArgs.push(arguments[i]);
        }

        return function() {
            var args = initialArgs.concat([]);
            for (var i = 0; i < arguments.length; i++) {
                args.push(arguments[i]);
            }

            return method.apply(object, args);
        };
    };

    this.getUrlParameter = function(key) {
        var value = urlParams[key];
        return value ? value : null;
    };

    this.makeAjaxRequest = function(url, callback) {
        var async = typeof (callback) == "function";
        var req = null;

        if (async) {
            var actual = callback;
            var callback = function() {
                window.setTimeout($.Utils.createCallback(null, actual, req), 1);
            };
        }

        if (window.ActiveXObject) {
            for (var i = 0; i < arrActiveX.length; i++) {
                try {
                    req = new ActiveXObject(arrActiveX[i]);
                    break;
                } catch (e) {
                    continue;
                }
            }
        } else if (window.XMLHttpRequest) {
            req = new XMLHttpRequest();
        }

        if (!req) {
            $.Debug.fail("Browser doesn't support XMLHttpRequest.");
        }


        if (async) {
            req.onreadystatechange = function() {
                if (req.readyState == 4) {
                    req.onreadystatechange = new function() { };
                    callback();
                }
            };
        }

        try {
            req.open("GET", url, async);
            req.send(null);
        } catch (e) {
            $.Debug.log(e.name + " while making AJAX request: " + e.message);

            req.onreadystatechange = null;
            req = null;

            if (async) {
                callback();
            }
        }

        return async ? null : req;
    };

    this.parseXml = function(string) {
        var xmlDoc = null;

        if (window.ActiveXObject) {
            try {
                xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
                xmlDoc.async = false;
                xmlDoc.loadXML(string);
            } catch (e) {
                $.Debug.log(e.name + " while parsing XML (ActiveX): " + e.message);
            }
        } else if (window.DOMParser) {
            try {
                var parser = new DOMParser();
                xmlDoc = parser.parseFromString(string, "text/xml");
            } catch (e) {
                $.Debug.log(e.name + " while parsing XML (DOMParser): " + e.message);
            }
        } else {
            $.Debug.fail("Browser doesn't support XML DOM.");
        }

        return xmlDoc;
    };

};

//Start Thatcher - Remove Singleton pattern in favor of object literals
//  TODO
$.Utils = new $.Utils();
//End Thatcher

}( OpenSeadragon ));