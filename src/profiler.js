
(function( $ ){

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

$.Profiler.prototype = {

    beginUpdate: function() {
        if (this.midUpdate) {
            this.endUpdate();
        }

        this.midUpdate = true;
        this.lastBeginTime = new Date().getTime();

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

    endUpdate: function() {
        if (!this.midUpdate) {
            return;
        }

        this.lastEndTime = new Date().getTime();
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
