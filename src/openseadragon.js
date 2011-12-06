/**
 * (c) 2011 Christopher Thatcher
 * (c) 2010 OpenSeadragon
 * (c) 2010 CodePlex Foundation
 *
 * OpenSeadragon @VERSION@
 * ----------------------------------------------------------------------------
 * 
 *  License: New BSD License (BSD)
 *  Copyright (c) 2010, OpenSeadragon
 *  All rights reserved.
 * 
 *  Redistribution and use in source and binary forms, with or without 
 *  modification, are permitted provided that the following conditions are met:
 *  
 *  * Redistributions of source code must retain the above copyright notice, this 
 *    list of conditions and the following disclaimer.
 *  
 *  * Redistributions in binary form must reproduce the above copyright notice, 
 *    this list of conditions and the following disclaimer in the documentation 
 *    and/or other materials provided with the distribution.
 * 
 *  * Neither the name of OpenSeadragon nor the names of its contributors may be 
 *    used to endorse or promote products derived from this software without 
 *    specific prior written permission.
 * 
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" 
 *  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE 
 *  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE 
 *  ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE 
 *  LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR 
 *  CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF 
 *  SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS 
 *  INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN 
 *  CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) 
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE 
 *  POSSIBILITY OF SUCH DAMAGE.
 * 
 * ----------------------------------------------------------------------------
 *
 **/

OpenSeadragon = window.OpenSeadragon || function(){};

(function( $ ){
    
    $.SIGNAL = "----seadragon----";

    $.delegate = function(object, method) {
        return function() {
            if (arguments === undefined)
                arguments = [];
            return method.apply(object, arguments);
        };
    };

    $.format = function(){

        var args        = arguments,
            useLocale   = false,
            result      = '',
            format      = args[0],
            open,
            close,
            brace,
            colonIndex,
            argNumber,
            argFormat,
            arg,
            i;

        for ( i = 0; ; ) {
            open = format.indexOf('{', i);
            close = format.indexOf('}', i);
            if ((open < 0) && (close < 0)) {
                result += format.slice(i);
                break;
            }
            if ((close > 0) && ((close < open) || (open < 0))) {
                if (format.charAt(close + 1) !== '}') {
                    throw Error('SeadragonError: Formatted String Brace Mismatch. \n' + format );
                }
                result += format.slice(i, close + 1);
                i = close + 2;
                continue;
            }

            result += format.slice(i, open);
            i = open + 1;

            if (format.charAt(i) === '{') {
                result += '{';
                i++;
                continue;
            }

            if (close < 0) {
                throw Error('SeadragonError: Formatted String Brace Mismatch. \n' + format );
            }


            brace = format.substring(i, close);
            colonIndex = brace.indexOf(':');
            argNumber = parseInt((colonIndex < 0) ? brace : brace.substring(0, colonIndex), 10) + 1;

            if( isNaN( argNumber ) ){
                throw Error('SeadragonError: Invalid Format String\n' + format );
            }
            argFormat = (colonIndex < 0) ? '' : brace.substring(colonIndex + 1);

            arg = args[argNumber];
            if (typeof (arg) === "undefined" || arg === null) {
                arg = '';
            }

            if (arg.toFormattedString) {
                result += arg.toFormattedString(argFormat);
            }
            else if (useLocale && arg.localeFormat) {
                result += arg.localeFormat(argFormat);
            }
            else if ( arg.format ) {
                result += arg.format(argFormat);
            }
            else
                result += arg.toString();

            i = close + 1;
        }

        return result;
    };

}( OpenSeadragon ));
