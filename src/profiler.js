/*
 * OpenSeadragon - Profiler
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
 * @class Profiler
 * @classdesc A utility class useful for developers to establish baseline performance
 * metrics of rendering routines.
 *
 * @memberof OpenSeadragon
 * @property {Boolean} midUpdate
 * @property {Number} numUpdates
 * @property {Number} lastBeginTime
 * @property {Number} lastEndTime
 * @property {Number} minUpdateTime
 * @property {Number} avgUpdateTime
 * @property {Number} maxUpdateTime
 * @property {Number} minIdleTime
 * @property {Number} avgIdleTime
 * @property {Number} maxIdleTime
 */
$.Profiler = function() {

    this.midUpdate = false;
    this.numUpdates = 0;

    this.lastBeginTime = null;
    this.lastEndTime = null;

    this.minUpdateTime = Infinity;
    this.avgUpdateTime = 0;
    this.maxUpdateTime = 0;

    this.minIdleTime = Infinity;
    this.avgIdleTime = 0;
    this.maxIdleTime = 0;
};

/** @lends OpenSeadragon.Profiler.prototype */
$.Profiler.prototype = {

    /**
     * @function
     */
    beginUpdate: function() {
        if (this.midUpdate) {
            this.endUpdate();
        }

        this.midUpdate = true;
        this.lastBeginTime = $.now();

        if (this.numUpdates < 1) {
            return;     // this is the first update
        }

        var time = this.lastBeginTime - this.lastEndTime;

        this.avgIdleTime = (this.avgIdleTime * (this.numUpdates - 1) + time) / this.numUpdates;

        if (time < this.minIdleTime) {
            this.minIdleTime = time;
        }
        if (time > this.maxIdleTime) {
            this.maxIdleTime = time;
        }
    },

    /**
     * @function
     */
    endUpdate: function() {
        if (!this.midUpdate) {
            return;
        }

        this.lastEndTime = $.now();
        this.midUpdate = false;

        var time = this.lastEndTime - this.lastBeginTime;

        this.numUpdates++;
        this.avgUpdateTime = (this.avgUpdateTime * (this.numUpdates - 1) + time) / this.numUpdates;

        if (time < this.minUpdateTime) {
            this.minUpdateTime = time;
        }
        if (time > this.maxUpdateTime) {
            this.maxUpdateTime = time;
        }
    },

    /**
     * @function
     */
    clearProfile: function() {
        this.midUpdate = false;
        this.numUpdates = 0;

        this.lastBeginTime = null;
        this.lastEndTime = null;

        this.minUpdateTime = Infinity;
        this.avgUpdateTime = 0;
        this.maxUpdateTime = 0;

        this.minIdleTime = Infinity;
        this.avgIdleTime = 0;
        this.maxIdleTime = 0;
    }
};

}( OpenSeadragon ));
