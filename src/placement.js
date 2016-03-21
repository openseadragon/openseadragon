/*
 * OpenSeadragon - Placement
 *
 * Copyright (C) 2010-2016 OpenSeadragon contributors
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
     * @memberOf OpenSeadragon
     * @static
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
    $.Placement = {
        CENTER: {
            isLeft: false,
            isHorizontallyCentered: true,
            isRight: false,
            isTop: false,
            isVerticallyCentered: true,
            isBottom: false
        },
        TOP_LEFT: {
            isLeft: true,
            isHorizontallyCentered: false,
            isRight: false,
            isTop: true,
            isVerticallyCentered: false,
            isBottom: false
        },
        TOP: {
            isLeft: false,
            isHorizontallyCentered: true,
            isRight: false,
            isTop: true,
            isVerticallyCentered: false,
            isBottom: false
        },
        TOP_RIGHT: {
            isLeft: false,
            isHorizontallyCentered: false,
            isRight: true,
            isTop: true,
            isVerticallyCentered: false,
            isBottom: false
        },
        RIGHT: {
            isLeft: false,
            isHorizontallyCentered: false,
            isRight: true,
            isTop: false,
            isVerticallyCentered: true,
            isBottom: false
        },
        BOTTOM_RIGHT: {
            isLeft: false,
            isHorizontallyCentered: false,
            isRight: true,
            isTop: false,
            isVerticallyCentered: false,
            isBottom: true
        },
        BOTTOM: {
            isLeft: false,
            isHorizontallyCentered: true,
            isRight: false,
            isTop: false,
            isVerticallyCentered: false,
            isBottom: true
        },
        BOTTOM_LEFT: {
            isLeft: true,
            isHorizontallyCentered: false,
            isRight: false,
            isTop: false,
            isVerticallyCentered: false,
            isBottom: true
        },
        LEFT: {
            isLeft: true,
            isHorizontallyCentered: false,
            isRight: false,
            isTop: false,
            isVerticallyCentered: true,
            isBottom: false
        }
    };

}(OpenSeadragon));
