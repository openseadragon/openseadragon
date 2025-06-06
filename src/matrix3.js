/* eslint-disable one-var-declaration-per-line */

/*
 * OpenSeadragon - Mat3
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
        const c = Math.cos(angleInRadians);
        const s = Math.sin(angleInRadians);
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

        const a00 = a[0 * 3 + 0], a01 = a[0 * 3 + 1], a02 = a[0 * 3 + 2];
        const a10 = a[1 * 3 + 0], a11 = a[1 * 3 + 1], a12 = a[1 * 3 + 2];
        const a20 = a[2 * 3 + 0], a21 = a[2 * 3 + 1], a22 = a[2 * 3 + 2];
        const b00 = b[0 * 3 + 0], b01 = b[0 * 3 + 1], b02 = b[0 * 3 + 2];
        const b10 = b[1 * 3 + 0], b11 = b[1 * 3 + 1], b12 = b[1 * 3 + 2];
        const b20 = b[2 * 3 + 0], b21 = b[2 * 3 + 1], b22 = b[2 * 3 + 2];

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

    /**
     * Sets the values of the matrix.
     * @param a00 top left
     * @param a01 top middle
     * @param a02 top right
     * @param a10 middle left
     * @param a11 middle middle
     * @param a12 middle right
     * @param a20 bottom left
     * @param a21 bottom middle
     * @param a22 bottom right
     */
    setValues(a00, a01, a02,
              a10, a11, a12,
              a20, a21, a22) {
        this.values[0] = a00;
        this.values[1] = a01;
        this.values[2] = a02;
        this.values[3] = a10;
        this.values[4] = a11;
        this.values[5] = a12;
        this.values[6] = a20;
        this.values[7] = a21;
        this.values[8] = a22;
    }

    /**
     * Scaling & translation only changes certain values, no need to compute full matrix multiplication.
     * @memberof OpenSeadragon.Mat3
     * @returns {OpenSeadragon.Mat3} The result of matrix multiplication
     */
    scaleAndTranslate(sx, sy, tx, ty) {
        const a = this.values;
        const a00 = a[0];
        const a01 = a[1];
        const a02 = a[2];
        const a10 = a[3];
        const a11 = a[4];
        const a12 = a[5];
        return new Mat3([
            sx * a00,
            sx * a01,
            sx * a02,
            sy * a10,
            sy * a11,
            sy * a12,
            tx * a00 + ty * a10,
            tx * a01 + ty * a11,
            tx * a02 + ty * a12,
        ]);
    }

    /**
     * Scaling & translation only changes certain values, no need to compute full matrix multiplication.
     * Optimization: in case the original matrix can be thrown away, optimize instead by computing in-place.
     * @memberof OpenSeadragon.Mat3
     */
    scaleAndTranslateSelf(sx, sy, tx, ty) {
        const a = this.values;

        const m00 = a[0], m01 = a[1], m02 = a[2];
        const m10 = a[3], m11 = a[4], m12 = a[5];

        a[0] = sx * m00;
        a[1] = sx * m01;
        a[2] = sx * m02;

        a[3] = sy * m10;
        a[4] = sy * m11;
        a[5] = sy * m12;

        a[6] = tx * m00 + ty * m10 + a[6];
        a[7] = tx * m01 + ty * m11 + a[7];
        a[8] = tx * m02 + ty * m12 + a[8];
    }

    /**
     * Move and translate another matrix by self. 'this' matrix must be scale & translate matrix.
     * Optimization: in case the original matrix can be thrown away, optimize instead by computing in-place.
     * Used for optimization: we have
     * A) THIS matrix, carrying scale and translation,
     * B) OTHER general matrix to scale and translate.
     * Since THIS matrix is unique per tile, we can optimize the operation by:
     *  - move & scale OTHER by THIS, and
     *  - store the result to THIS, since we don't need to keep the scaling and translation, but
     *    we need to keep the original OTHER matrix (for each tile within tiled image).
     * @param {OpenSeadragon.Mat3} other the matrix to scale and translate by this matrix and accept values from
     * @memberof OpenSeadragon.Mat3
     */
    scaleAndTranslateOtherSetSelf(other) {
        const a = other.values;
        const out = this.values;

        // Read scale and translation values from 'this'
        const sx = out[0]; // scale X (this[0])
        const sy = out[4]; // scale Y (this[4])
        const tx = out[6]; // translate X
        const ty = out[7]; // translate Y

        // Compute result = this * other, store into this.values (in-place)
        out[0] = sx * a[0];
        out[1] = sx * a[1];
        out[2] = sx * a[2];

        out[3] = sy * a[3];
        out[4] = sy * a[4];
        out[5] = sy * a[5];

        out[6] = tx * a[0] + ty * a[3] + a[6];
        out[7] = tx * a[1] + ty * a[4] + a[7];
        out[8] = tx * a[2] + ty * a[5] + a[8];
    }
}


$.Mat3 = Mat3;

}( OpenSeadragon ));
