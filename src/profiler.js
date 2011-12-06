
(function( $ ){

$.Profiler = function() {

    this._midUpdate = false;
    this._numUpdates = 0;

    this._lastBeginTime = null;
    this._lastEndTime = null;

    this._minUpdateTime = Infinity;
    this._avgUpdateTime = 0;
    this._maxUpdateTime = 0;

    this._minIdleTime = Infinity;
    this._avgIdleTime = 0;
    this._maxIdleTime = 0;
};

$.Profiler.prototype = {

    getAvgUpdateTime: function() {
        return this._avgUpdateTime;
    },

    getMinUpdateTime: function() {
        return this._minUpdateTime;
    },

    getMaxUpdateTime: function() {
        return this._maxUpdateTime;
    },


    getAvgIdleTime: function() {
        return this._avgIdleTime;
    },

    getMinIdleTime: function() {
        return this._minIdleTime;
    },

    getMaxIdleTime: function() {
        return this._maxIdleTime;
    },


    isMidUpdate: function() {
        return this._midUpdate;
    },

    getNumUpdates: function() {
        return this._numUpdates;
    },


    beginUpdate: function() {
        if (this._midUpdate) {
            this.endUpdate();
        }

        this._midUpdate = true;
        this._lastBeginTime = new Date().getTime();

        if (this._numUpdates < 1) {
            return;     // this is the first update
        }

        var time = this._lastBeginTime - this._lastEndTime;

        this._avgIdleTime = (this._avgIdleTime * (this._numUpdates - 1) + time) / this._numUpdates;

        if (time < this._minIdleTime) {
            this._minIdleTime = time;
        }
        if (time > this._maxIdleTime) {
            this._maxIdleTime = time;
        }
    },

    endUpdate: function() {
        if (!this._midUpdate) {
            return;
        }

        this._lastEndTime = new Date().getTime();
        this._midUpdate = false;

        var time = this._lastEndTime - this._lastBeginTime;

        this._numUpdates++;
        this._avgUpdateTime = (this._avgUpdateTime * (this._numUpdates - 1) + time) / this._numUpdates;

        if (time < this._minUpdateTime) {
            this._minUpdateTime = time;
        }
        if (time > this._maxUpdateTime) {
            this._maxUpdateTime = time;
        }
    },

    clearProfile: function() {
        this._midUpdate = false;
        this._numUpdates = 0;

        this._lastBeginTime = null;
        this._lastEndTime = null;

        this._minUpdateTime = Infinity;
        this._avgUpdateTime = 0;
        this._maxUpdateTime = 0;

        this._minIdleTime = Infinity;
        this._avgIdleTime = 0;
        this._maxIdleTime = 0;
    }
};

}( OpenSeadragon ));
