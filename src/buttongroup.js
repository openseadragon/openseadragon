
(function( $ ){

$.ButtonGroup = function(properties) {

    this._buttons = properties.buttons;
    this._group = properties.group;
    this.config = properties.config;

    this.initialize();
};

$.ButtonGroup.prototype = {
    initialize: function() {

        this._group = $.Utils.makeNeutralElement("span");
        var buttons = this._buttons.concat([]);   // copy
        var tracker = new $.MouseTracker(this._group, this.config.clickTimeThreshold, this.config.clickDistThreshold);
        this._group.style.display = "inline-block";

        for (var i = 0; i < buttons.length; i++) {
            this._group.appendChild(buttons[i].get_element());
        }

        tracker.enterHandler = $.delegate(this, this._enterHandler);
        tracker.exitHandler = $.delegate(this, this._exitHandler);
        tracker.releaseHandler = $.delegate(this, this._releaseHandler);

        tracker.setTracking(true);
    },

    get_buttons: function() {
        return this._buttons;
    },
    set_buttons: function(value) {
        this._buttons = value;
    },
    get_element: function() {
        return this._group;
    },
    get_config: function() {
        return this.config;
    },
    set_config: function(value) {
        this.config = value;
    },
    _enterHandler: function(tracker, position, buttonDownElmt, buttonDownAny) {
        for (var i = 0; i < this._buttons.length; i++) {
            this._buttons[i].notifyGroupEnter();
        }
    },
    _exitHandler: function(tracker, position, buttonDownElmt, buttonDownAny) {
        if (!buttonDownElmt) {
            for (var i = 0; i < this._buttons.length; i++) {
                this._buttons[i].notifyGroupExit();
            }
        }
    },
    _releaseHandler: function(tracker, position, insideElmtPress, insideElmtRelease) {

        if (!insideElmtRelease) {
            for (var i = 0; i < this._buttons.length; i++) {
                this._buttons[i].notifyGroupExit();
            }
        }
    },
    emulateEnter: function() {
        this._enterHandler();
    },

    emulateExit: function() {
        this._exitHandler();
    }
};

}( OpenSeadragon ));
