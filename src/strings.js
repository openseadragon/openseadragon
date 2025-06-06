/*
 * OpenSeadragon - getString/setString
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

(function( $ ){

//TODO: I guess this is where the i18n needs to be reimplemented.  I'll look
//      into existing patterns for i18n in javascript but i think that mimicking
//      pythons gettext might be a reasonable approach.
var I18N = {
    Errors: {
        Dzc:            "Sorry, we don't support Deep Zoom Collections!",
        Dzi:            "Hmm, this doesn't appear to be a valid Deep Zoom Image.",
        Xml:            "Hmm, this doesn't appear to be a valid Deep Zoom Image.",
        ImageFormat:    "Sorry, we don't support {0}-based Deep Zoom Images.",
        Security:       "It looks like a security restriction stopped us from " +
                        "loading this Deep Zoom Image.",
        Status:         "This space unintentionally left blank ({0} {1}).",
        OpenFailed:     "Unable to open {0}: {1}"
    },

    Tooltips: {
        FullPage:       "Toggle full page",
        Home:           "Go home",
        ZoomIn:         "Zoom in",
        ZoomOut:        "Zoom out",
        NextPage:       "Next page",
        PreviousPage:   "Previous page",
        RotateLeft:     "Rotate left",
        RotateRight:    "Rotate right",
        Flip:           "Flip Horizontally"
    }
};

$.extend( $, /** @lends OpenSeadragon */{

    /**
     * @function
     * @param {String} property
     */
    getString: function( prop ) {

        var props   = prop.split('.'),
            string  = null,
            args    = arguments,
            container = I18N,
            i;

        for (i = 0; i < props.length - 1; i++) {
            // in case not a subproperty
            container = container[ props[ i ] ] || {};
        }
        string = container[ props[ i ] ];

        if ( typeof ( string ) !== "string" ) {
            $.console.error( "Untranslated source string:", prop );
            string = ""; // FIXME: this breaks gettext()-style convention, which would return source
        }

        return string.replace(/\{\d+\}/g, function(capture) {
            var i = parseInt( capture.match( /\d+/ ), 10 ) + 1;
            return i < args.length ?
                args[ i ] :
                "";
        });
    },

    /**
     * @function
     * @param {String} property
     * @param {*} value
     */
    setString: function( prop, value ) {

        var props     = prop.split('.'),
            container = I18N,
            i;

        for ( i = 0; i < props.length - 1; i++ ) {
            if ( !container[ props[ i ] ] ) {
                container[ props[ i ] ] = {};
            }
            container = container[ props[ i ] ];
        }

        container[ props[ i ] ] = value;
    }

});

}( OpenSeadragon ));
