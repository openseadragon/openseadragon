/*
 * OpenSeadragon - Overlay
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

(function( $ ){

    /**
     * An enumeration of positions that an overlay may be assigned relative to
     * the viewport.
     * @member OverlayPlacement
     * @memberof OpenSeadragon
     * @static
     * @type {Object}
     * @property {Number} CENTER
     * @property {Number} TOP_LEFT
     * @property {Number} TOP
     * @property {Number} TOP_RIGHT
     * @property {Number} RIGHT
     * @property {Number} BOTTOM_RIGHT
     * @property {Number} BOTTOM
     * @property {Number} BOTTOM_LEFT
     * @property {Number} LEFT
     */
    $.OverlayPlacement = {
        CENTER:       0,
        TOP_LEFT:     1,
        TOP:          2,
        TOP_RIGHT:    3,
        RIGHT:        4,
        BOTTOM_RIGHT: 5,
        BOTTOM:       6,
        BOTTOM_LEFT:  7,
        LEFT:         8
    };

    /**
     * @class Overlay
     * @classdesc Provides a way to float an HTML element on top of the viewer element.
     *
     * @memberof OpenSeadragon
     * @param {Object} options
     * @param {Element} options.element
     * @param {OpenSeadragon.Point|OpenSeadragon.Rect} options.location - The
     * location of the overlay on the image. If a {@link OpenSeadragon.Point}
     * is specified, the overlay will keep a constant size independently of the
     * zoom. If a {@link OpenSeadragon.Rect} is specified, the overlay size will
     * be adjusted when the zoom changes.
     * @param {OpenSeadragon.OverlayPlacement} [options.placement=OpenSeadragon.OverlayPlacement.TOP_LEFT]
     * Relative position to the viewport.
     * Only used if location is a {@link OpenSeadragon.Point}.
     * @param {OpenSeadragon.Overlay.OnDrawCallback} [options.onDraw]
     * @param {Boolean} [options.checkResize=true] Set to false to avoid to
     * check the size of the overlay everytime it is drawn when using a
     * {@link OpenSeadragon.Point} as options.location. It will improve
     * performances but will cause a misalignment if the overlay size changes.
     */
    $.Overlay = function( element, location, placement ) {

        /**
         * onDraw callback signature used by {@link OpenSeadragon.Overlay}.
         *
         * @callback OnDrawCallback
         * @memberof OpenSeadragon.Overlay
         * @param {OpenSeadragon.Point} position
         * @param {OpenSeadragon.Point} size
         * @param {Element} element
         */

        var options;
        if ( $.isPlainObject( element ) ) {
            options = element;
        } else {
            options = {
                element: element,
                location: location,
                placement: placement
            };
        }
        
        this.element    = options.element;
        this.scales     = options.location instanceof $.Rect;
        this.bounds     = new $.Rect(
            options.location.x,
            options.location.y,
            options.location.width,
            options.location.height
        );
        this.position   = new $.Point(
            options.location.x,
            options.location.y
        );
        this.size       = new $.Point(
            options.location.width,
            options.location.height
        );
        this.style      = options.element.style;
        // rects are always top-left
        this.placement  = options.location instanceof $.Point ?
            options.placement :
            $.OverlayPlacement.TOP_LEFT;
        this.onDraw = options.onDraw;
        this.checkResize = options.checkResize === undefined ?
            true : options.checkResize;
    };

    $.Overlay.prototype = /** @lends OpenSeadragon.Overlay.prototype */{

        /**
         * @function
         * @param {OpenSeadragon.OverlayPlacement} position
         * @param {OpenSeadragon.Point} size
         */
        adjust: function( position, size ) {
            switch ( this.placement ) {
                case $.OverlayPlacement.TOP_LEFT:
                    break;
                case $.OverlayPlacement.TOP:
                    position.x -= size.x / 2;
                    break;
                case $.OverlayPlacement.TOP_RIGHT:
                    position.x -= size.x;
                    break;
                case $.OverlayPlacement.RIGHT:
                    position.x -= size.x;
                    position.y -= size.y / 2;
                    break;
                case $.OverlayPlacement.BOTTOM_RIGHT:
                    position.x -= size.x;
                    position.y -= size.y;
                    break;
                case $.OverlayPlacement.BOTTOM:
                    position.x -= size.x / 2;
                    position.y -= size.y;
                    break;
                case $.OverlayPlacement.BOTTOM_LEFT:
                    position.y -= size.y;
                    break;
                case $.OverlayPlacement.LEFT:
                    position.y -= size.y / 2;
                    break;
                default:
                case $.OverlayPlacement.CENTER:
                    position.x -= size.x / 2;
                    position.y -= size.y / 2;
                    break;
            }
        },

        /**
         * @function
         */
        destroy: function() {
            var element = this.element,
                style   = this.style;

            if ( element.parentNode ) {
                element.parentNode.removeChild( element );
                //this should allow us to preserve overlays when required between
                //pages
                if ( element.prevElementParent ) {
                    style.display = 'none';
                    //element.prevElementParent.insertBefore(
                    //    element,
                    //    element.prevNextSibling
                    //);
                    document.body.appendChild( element );
                }
            }

            // clear the onDraw callback
            this.onDraw = null;

            style.top = "";
            style.left = "";
            style.position = "";

            if ( this.scales ) {
                style.width = "";
                style.height = "";
            }
        },

        /**
         * @function
         * @param {Element} container
         */
        drawHTML: function( container, viewport ) {
            var element = this.element,
                style   = this.style,
                scales  = this.scales,
                degrees  = viewport.degrees,
                position = viewport.pixelFromPoint(
                    this.bounds.getTopLeft(),
                    true
                ),
                size,
                overlayCenter;

            if ( element.parentNode != container ) {
                //save the source parent for later if we need it
                element.prevElementParent  = element.parentNode;
                element.prevNextSibling    = element.nextSibling;
                container.appendChild( element );
                this.size = $.getElementSize( element );
            }

            if ( scales ) {
                size = viewport.deltaPixelsFromPoints(
                    this.bounds.getSize(),
                    true
                );
            } else if ( this.checkResize ) {
                size = $.getElementSize( element );
            } else {
                size = this.size;
            }

            this.position = position;
            this.size     = size;

            this.adjust( position, size );

            position = position.apply( Math.floor );
            size     = size.apply( Math.ceil );

            // rotate the position of the overlay
            // TODO only rotate overlays if in canvas mode
            // TODO replace the size rotation with CSS3 transforms
            // TODO add an option to overlays to not rotate with the image
            // Currently only rotates position and size
            if( degrees !== 0 && this.scales ) {
                overlayCenter = new $.Point( size.x / 2, size.y / 2 );

                var drawerCenter = new $.Point(
                    viewport.viewer.drawer.canvas.width / 2,
                    viewport.viewer.drawer.canvas.height / 2
                );
                position = position.plus( overlayCenter ).rotate(
                    degrees,
                    drawerCenter
                ).minus( overlayCenter );

                size = size.rotate( degrees, new $.Point( 0, 0 ) );
                size = new $.Point( Math.abs( size.x ), Math.abs( size.y ) );
            }

            // call the onDraw callback if it exists to allow one to overwrite
            // the drawing/positioning/sizing of the overlay
            if ( this.onDraw ) {
                this.onDraw( position, size, element );
            } else {
                style.left     = position.x + "px";
                style.top      = position.y + "px";
                style.position = "absolute";
                style.display  = 'block';

                if ( scales ) {
                    style.width  = size.x + "px";
                    style.height = size.y + "px";
                }
            }
        },

        /**
         * @function
         * @param {OpenSeadragon.Point|OpenSeadragon.Rect} location
         * @param {OpenSeadragon.OverlayPlacement} position
         */
        update: function( location, placement ) {
            this.scales     = location instanceof $.Rect;
            this.bounds     = new $.Rect(
                location.x,
                location.y,
                location.width,
                location.height
            );
            // rects are always top-left
            this.placement  = location instanceof $.Point ?
                placement :
                $.OverlayPlacement.TOP_LEFT;
        }

    };

}( OpenSeadragon ));
