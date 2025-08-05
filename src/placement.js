/*
 * OpenSeadragon - Placement
 *
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

(function($) {

    /**
     * An enumeration of positions to anchor an element.
     * @member Placement
     * @memberOf OpenSeadragon
     * @static
     * @readonly
     * @property {OpenSeadragon.Placement} CENTER
     * @property {OpenSeadragon.Placement} TOP_LEFT
     * @property {OpenSeadragon.Placement} TOP
     * @property {OpenSeadragon.Placement} TOP_RIGHT
     * @property {OpenSeadragon.Placement} RIGHT
     * @property {OpenSeadragon.Placement} BOTTOM_RIGHT
     * @property {OpenSeadragon.Placement} BOTTOM
     * @property {OpenSeadragon.Placement} BOTTOM_LEFT
     * @property {OpenSeadragon.Placement} LEFT
     */
    $.Placement = $.freezeObject({
        CENTER:       0,
        TOP_LEFT:     1,
        TOP:          2,
        TOP_RIGHT:    3,
        RIGHT:        4,
        BOTTOM_RIGHT: 5,
        BOTTOM:       6,
        BOTTOM_LEFT:  7,
        LEFT:         8,
        properties: {
            0: {
                isLeft: false,
                isHorizontallyCentered: true,
                isRight: false,
                isTop: false,
                isVerticallyCentered: true,
                isBottom: false
            },
            1: {
                isLeft: true,
                isHorizontallyCentered: false,
                isRight: false,
                isTop: true,
                isVerticallyCentered: false,
                isBottom: false
            },
            2: {
                isLeft: false,
                isHorizontallyCentered: true,
                isRight: false,
                isTop: true,
                isVerticallyCentered: false,
                isBottom: false
            },
            3: {
                isLeft: false,
                isHorizontallyCentered: false,
                isRight: true,
                isTop: true,
                isVerticallyCentered: false,
                isBottom: false
            },
            4: {
                isLeft: false,
                isHorizontallyCentered: false,
                isRight: true,
                isTop: false,
                isVerticallyCentered: true,
                isBottom: false
            },
            5: {
                isLeft: false,
                isHorizontallyCentered: false,
                isRight: true,
                isTop: false,
                isVerticallyCentered: false,
                isBottom: true
            },
            6: {
                isLeft: false,
                isHorizontallyCentered: true,
                isRight: false,
                isTop: false,
                isVerticallyCentered: false,
                isBottom: true
            },
            7: {
                isLeft: true,
                isHorizontallyCentered: false,
                isRight: false,
                isTop: false,
                isVerticallyCentered: false,
                isBottom: true
            },
            8: {
                isLeft: true,
                isHorizontallyCentered: false,
                isRight: false,
                isTop: false,
                isVerticallyCentered: true,
                isBottom: false
            }
        }
    });

}(OpenSeadragon));
