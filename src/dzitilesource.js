/*
 * OpenSeadragon - DziTileSource
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

/**
 * @class DziTileSource
 * @memberof OpenSeadragon
 * @extends OpenSeadragon.TileSource
 * @param {Number|Object} width - the pixel width of the image or the idiomatic
 *      options object which is used instead of positional arguments.
 * @param {Number} height
 * @param {Number} tileSize
 * @param {Number} tileOverlap
 * @param {String} tilesUrl
 * @param {String} fileFormat
 * @param {OpenSeadragon.DisplayRect[]} displayRects
 * @property {String} tilesUrl
 * @property {String} fileFormat
 * @property {OpenSeadragon.DisplayRect[]} displayRects
 */
$.DziTileSource = function( width, height, tileSize, tileOverlap, tilesUrl, fileFormat, displayRects, minLevel, maxLevel ) {
    let level;
    let options;

    if( $.isPlainObject( width ) ){
        options = width;
    }else{
        options = {
            width: arguments[ 0 ],
            height: arguments[ 1 ],
            tileSize: arguments[ 2 ],
            tileOverlap: arguments[ 3 ],
            tilesUrl: arguments[ 4 ],
            fileFormat: arguments[ 5 ],
            displayRects: arguments[ 6 ],
            minLevel: arguments[ 7 ],
            maxLevel: arguments[ 8 ]
        };
    }

    this._levelRects  = {};
    this.tilesUrl     = options.tilesUrl;
    this.fileFormat   = options.fileFormat;
    this.displayRects = options.displayRects;

    if ( this.displayRects ) {
        for ( let i = this.displayRects.length - 1; i >= 0; i-- ) {
            const rect = this.displayRects[ i ];
            for ( level = rect.minLevel; level <= rect.maxLevel; level++ ) {
                if ( !this._levelRects[ level ] ) {
                    this._levelRects[ level ] = [];
                }
                this._levelRects[ level ].push( rect );
            }
        }
    }

    $.TileSource.apply( this, [ options ] );

};

$.extend( $.DziTileSource.prototype, $.TileSource.prototype, /** @lends OpenSeadragon.DziTileSource.prototype */{


    /**
     * Determine if the data and/or url imply the image service is supported by
     * this tile source.
     * @function
     * @param {Object|Array} data
     * @param {String} [url]
     */
    supports: function( data, url ){
        let ns;
        if ( data.Image ) {
            ns = data.Image.xmlns;
        } else if ( data.documentElement) {
            if ("Image" === data.documentElement.localName || "Image" === data.documentElement.tagName) {
                ns = data.documentElement.namespaceURI;
            }
        }

        ns = (ns || '').toLowerCase();

        return (ns.indexOf('schemas.microsoft.com/deepzoom/2008') !== -1 ||
            ns.indexOf('schemas.microsoft.com/deepzoom/2009') !== -1);
    },

    /**
     *
     * @function
     * @param {Object|XMLDocument} data - the raw configuration
     * @param {String} url - the url the data was retrieved from if any.
     * @param {String} postData - HTTP POST data in k=v&k2=v2... form or null
     * @returns {Object} options - A dictionary of keyword arguments sufficient
     *      to configure this tile sources constructor.
     */
    configure: function( data, url, postData ){

        let options;

        if( !$.isPlainObject(data) ){

            options = configureFromXML( this, data );

        }else{

            options = configureFromObject( this, data );
        }

        if (url && !options.tilesUrl) {
            options.tilesUrl = url.replace(
                    /([^/]+?)(\.(dzi|xml|js)?(\?[^/]*)?)?\/?$/, '$1_files/');

            if (url.search(/\.(dzi|xml|js)\?/) !== -1) {
                options.queryParams = url.match(/\?.*/);
            }else{
                options.queryParams = '';
            }
        }

        return options;
    },


    /**
     * @function
     * @param {Number} level
     * @param {Number} x
     * @param {Number} y
     */
    getTileUrl: function( level, x, y ) {
        return [ this.tilesUrl, level, '/', x, '_', y, '.', this.fileFormat, this.queryParams ].join( '' );
    },


    /**
     * Equality comparator
     */
    equals: function(otherSource) {
        return otherSource && this.tilesUrl === otherSource.tilesUrl;
    },


    /**
     * @function
     * @param {Number} level
     * @param {Number} x
     * @param {Number} y
     */
    tileExists: function( level, x, y ) {
        const rects = this._levelRects[ level ];
        let scale;
        let xMin;
        let yMin;
        let xMax;
        let yMax;

        if ((this.minLevel && level < this.minLevel) || (this.maxLevel && level > this.maxLevel)) {
            return false;
        }

        if ( !rects || !rects.length ) {
            return true;
        }

        for (let i = rects.length - 1; i >= 0; i-- ) {
            const rect = rects[ i ];

            if ( level < rect.minLevel || level > rect.maxLevel ) {
                continue;
            }

            scale = this.getLevelScale( level );
            xMin = rect.x * scale;
            yMin = rect.y * scale;
            xMax = xMin + rect.width * scale;
            yMax = yMin + rect.height * scale;

            xMin = Math.floor( xMin / this._tileWidth );
            yMin = Math.floor( yMin / this._tileWidth ); // DZI tiles are square, so we just use _tileWidth
            xMax = Math.ceil( xMax / this._tileWidth );
            yMax = Math.ceil( yMax / this._tileWidth );

            if ( xMin <= x && x < xMax && yMin <= y && y < yMax ) {
                return true;
            }
        }

        return false;
    }
});


/**
 * @private
 * @inner
 * @function
 */
function configureFromXML( tileSource, xmlDoc ){

    if ( !xmlDoc || !xmlDoc.documentElement ) {
        throw new Error( $.getString( "Errors.Xml" ) );
    }

    const root           = xmlDoc.documentElement;
    const rootName       = root.localName || root.tagName;
    const ns             = xmlDoc.documentElement.namespaceURI;
    let configuration  = null;
    const displayRects   = [];
    let dispRectNodes;
    let dispRectNode;
    let rectNode;
    let sizeNode;
    let i;

    if ( rootName === "Image" ) {

        try {
            sizeNode = root.getElementsByTagName("Size" )[ 0 ];
            if (sizeNode === undefined) {
                sizeNode = root.getElementsByTagNameNS(ns, "Size" )[ 0 ];
            }

            configuration = {
                Image: {
                    xmlns:       "http://schemas.microsoft.com/deepzoom/2008",
                    Url:         root.getAttribute( "Url" ),
                    Format:      root.getAttribute( "Format" ),
                    DisplayRect: null,
                    Overlap:     parseInt( root.getAttribute( "Overlap" ), 10 ),
                    TileSize:    parseInt( root.getAttribute( "TileSize" ), 10 ),
                    Size: {
                        Height: parseInt( sizeNode.getAttribute( "Height" ), 10 ),
                        Width:  parseInt( sizeNode.getAttribute( "Width" ), 10 )
                    }
                }
            };

            if ( !$.imageFormatSupported( configuration.Image.Format ) ) {
                throw new Error(
                    $.getString( "Errors.ImageFormat", configuration.Image.Format.toUpperCase() )
                );
            }

            dispRectNodes = root.getElementsByTagName("DisplayRect" );
            if (dispRectNodes === undefined) {
                dispRectNodes = root.getElementsByTagNameNS(ns, "DisplayRect" )[ 0 ];
            }

            for ( i = 0; i < dispRectNodes.length; i++ ) {
                dispRectNode = dispRectNodes[ i ];
                rectNode     = dispRectNode.getElementsByTagName("Rect" )[ 0 ];
                if (rectNode === undefined) {
                    rectNode = dispRectNode.getElementsByTagNameNS(ns, "Rect" )[ 0 ];
                }

                displayRects.push({
                    Rect: {
                        X: parseInt( rectNode.getAttribute( "X" ), 10 ),
                        Y: parseInt( rectNode.getAttribute( "Y" ), 10 ),
                        Width: parseInt( rectNode.getAttribute( "Width" ), 10 ),
                        Height: parseInt( rectNode.getAttribute( "Height" ), 10 ),
                        MinLevel: parseInt( dispRectNode.getAttribute( "MinLevel" ), 10 ),
                        MaxLevel: parseInt( dispRectNode.getAttribute( "MaxLevel" ), 10 )
                    }
                });
            }

            if( displayRects.length ){
                configuration.Image.DisplayRect = displayRects;
            }

            return configureFromObject( tileSource, configuration );

        } catch ( e ) {
            throw (e instanceof Error) ?
                e :
                new Error( $.getString("Errors.Dzi") );
        }
    } else if ( rootName === "Collection" ) {
        throw new Error( $.getString( "Errors.Dzc" ) );
    } else if ( rootName === "Error" ) {
        const messageNode = root.getElementsByTagName("Message")[0];
        const message = messageNode.firstChild.nodeValue;
        throw new Error(message);
    }

    throw new Error( $.getString( "Errors.Dzi" ) );
}

/**
 * @private
 * @inner
 * @function
 */
function configureFromObject( tileSource, configuration ){
    const imageData     = configuration.Image;
    const tilesUrl      = imageData.Url;
    const fileFormat    = imageData.Format;
    const sizeData      = imageData.Size;
    const dispRectData  = imageData.DisplayRect || [];
    const width         = parseInt( sizeData.Width, 10 );
    const height        = parseInt( sizeData.Height, 10 );
    const tileSize      = parseInt( imageData.TileSize, 10 );
    const tileOverlap   = parseInt( imageData.Overlap, 10 );
    const displayRects  = [];
    let rectData;

    //TODO: need to figure out out to better handle image format compatibility
    //      which actually includes additional file formats like xml and pdf
    //      and plain text for various tilesource implementations to avoid low
    //      level errors.
    //
    //      For now, just don't perform the check.
    //
    /*if ( !imageFormatSupported( fileFormat ) ) {
        throw new Error(
            $.getString( "Errors.ImageFormat", fileFormat.toUpperCase() )
        );
    }*/

    for (let i = 0; i < dispRectData.length; i++ ) {
        rectData = dispRectData[ i ].Rect;

        displayRects.push( new $.DisplayRect(
            parseInt( rectData.X, 10 ),
            parseInt( rectData.Y, 10 ),
            parseInt( rectData.Width, 10 ),
            parseInt( rectData.Height, 10 ),
            parseInt( rectData.MinLevel, 10 ),
            parseInt( rectData.MaxLevel, 10 )
        ));
    }

    return $.extend(true, {
        width: width, /* width *required */
        height: height, /* height *required */
        tileSize: tileSize, /* tileSize *required */
        tileOverlap: tileOverlap, /* tileOverlap *required */
        minLevel: null, /* minLevel */
        maxLevel: null, /* maxLevel */
        tilesUrl: tilesUrl, /* tilesUrl */
        fileFormat: fileFormat, /* fileFormat */
        displayRects: displayRects /* displayRects */
    }, configuration );

}

}( OpenSeadragon ));
