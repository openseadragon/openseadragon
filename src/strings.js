
(function( $ ){
    
$.Strings = {
    Errors: {
        Failure: "Sorry, but Seadragon Ajax can't run on your browser!\n" +
                    "Please try using IE 7 or Firefox 3.\n",
        Dzc: "Sorry, we don't support Deep Zoom Collections!",
        Dzi: "Hmm, this doesn't appear to be a valid Deep Zoom Image.",
        Xml: "Hmm, this doesn't appear to be a valid Deep Zoom Image.",
        Empty: "You asked us to open nothing, so we did just that.",
        ImageFormat: "Sorry, we don't support {0}-based Deep Zoom Images.",
        Security: "It looks like a security restriction stopped us from " +
                    "loading this Deep Zoom Image.",
        Status: "This space unintentionally left blank ({0} {1}).",
        Unknown: "Whoops, something inexplicably went wrong. Sorry!"
    },

    Messages: {
        Loading: "Loading..."
    },

    Tooltips: {
        FullPage: "Toggle full page",
        Home: "Go home",
        ZoomIn: "Zoom in",
        ZoomOut: "Zoom out"
    },
    getString: function(prop) {
        var props = prop.split('.');
        var string = $.Strings;

        for (var i = 0; i < props.length; i++) {
            string = string[props[i]] || {};    // in case not a subproperty
        }

        if (typeof (string) != "string") {
            string = "";
        }

        var args = arguments;
        return string.replace(/\{\d+\}/g, function(capture) {
            var i = parseInt(capture.match(/\d+/)) + 1;
            return i < args.length ? args[i] : "";
        });
    },

    setString: function(prop, value) {
        var props = prop.split('.');
        var container = $.Strings;

        for (var i = 0; i < props.length - 1; i++) {
            if (!container[props[i]]) {
                container[props[i]] = {};
            }
            container = container[props[i]];
        }

        container[props[i]] = value;
    }

};

}( OpenSeadragon ));
