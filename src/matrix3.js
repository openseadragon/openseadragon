/*
 * OpenSeadragon - Mat3
 *
 * Copyright (C) 2010-2024 OpenSeadragon contributors
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
 *
 */


/*
 * Portions of this source file are taken from WegGL Fundamentals:
 *
 * Copyright 2012, Gregg Tavares.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Gregg Tavares. nor the names of his
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 */




(function( $ ){

// Modified from https://webglfundamentals.org/webgl/lessons/webgl-2d-matrices.html

/**
 *
 *
 * @class Mat3
 * @classdesc A left-to-right matrix representation, useful for affine transforms for
 * positioning tiles for drawing
 *
 * @memberof OpenSeadragon
 *
 * @param {Array} [values] - Initial values for the matrix
 *
 **/
class Mat3{
    constructor(values){
        if(!values) {
            values = [
                0, 0, 0,
                0, 0, 0,
                0, 0, 0
            ];
        }
        this.values = values;
    }

    /**
     * @function makeIdentity
     * @memberof OpenSeadragon.Mat3
     * @static
     * @returns {OpenSeadragon.Mat3} an identity matrix
     */
    static makeIdentity(){
        return new Mat3([
            1, 0, 0,
            0, 1, 0,
            0, 0, 1
        ]);
    }

    /**
     * @function makeTranslation
     * @memberof OpenSeadragon.Mat3
     * @static
     * @param {Number} tx The x value of the translation
     * @param {Number} ty The y value of the translation
     * @returns {OpenSeadragon.Mat3} A translation matrix
     */
    static makeTranslation(tx, ty) {
        return new Mat3([
            1, 0, 0,
            0, 1, 0,
            tx, ty, 1,
        ]);
    }

    /**
     * @function makeRotation
     * @memberof OpenSeadragon.Mat3
     * @static
     * @param {Number} angleInRadians The desired rotation angle, in radians
     * @returns {OpenSeadragon.Mat3} A rotation matrix
     */
    static makeRotation(angleInRadians) {
        var c = Math.cos(angleInRadians);
        var s = Math.sin(angleInRadians);
        return new Mat3([
            c, -s, 0,
            s, c, 0,
            0, 0, 1,
        ]);
    }

    /**
     * @function makeScaling
     * @memberof OpenSeadragon.Mat3
     * @static
     * @param {Number} sx The x value of the scaling
     * @param {Number} sy The y value of the scaling
     * @returns {OpenSeadragon.Mat3} A scaling matrix
     */
    static makeScaling(sx, sy) {
        return new Mat3([
            sx, 0, 0,
            0, sy, 0,
            0, 0, 1,
        ]);
    }

    /**
     * @alias multiply
     * @memberof! OpenSeadragon.Mat3
     * @param {OpenSeadragon.Mat3} other the matrix to multiply with
     * @returns {OpenSeadragon.Mat3} The result of matrix multiplication
     */
    multiply(other) {
        let a = this.values;
        let b = other.values;

        var a00 = a[0 * 3 + 0];
        var a01 = a[0 * 3 + 1];
        var a02 = a[0 * 3 + 2];
        var a10 = a[1 * 3 + 0];
        var a11 = a[1 * 3 + 1];
        var a12 = a[1 * 3 + 2];
        var a20 = a[2 * 3 + 0];
        var a21 = a[2 * 3 + 1];
        var a22 = a[2 * 3 + 2];
        var b00 = b[0 * 3 + 0];
        var b01 = b[0 * 3 + 1];
        var b02 = b[0 * 3 + 2];
        var b10 = b[1 * 3 + 0];
        var b11 = b[1 * 3 + 1];
        var b12 = b[1 * 3 + 2];
        var b20 = b[2 * 3 + 0];
        var b21 = b[2 * 3 + 1];
        var b22 = b[2 * 3 + 2];
        return new Mat3([
            b00 * a00 + b01 * a10 + b02 * a20,
            b00 * a01 + b01 * a11 + b02 * a21,
            b00 * a02 + b01 * a12 + b02 * a22,
            b10 * a00 + b11 * a10 + b12 * a20,
            b10 * a01 + b11 * a11 + b12 * a21,
            b10 * a02 + b11 * a12 + b12 * a22,
            b20 * a00 + b21 * a10 + b22 * a20,
            b20 * a01 + b21 * a11 + b22 * a21,
            b20 * a02 + b21 * a12 + b22 * a22,
        ]);
    }
}


$.Mat3 = Mat3;

}( OpenSeadragon ));
