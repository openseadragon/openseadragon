
(function($){


    $.EventHandlerList = function() {
        this._list = {};
    };

    $.EventHandlerList.prototype = {

        addHandler: function(id, handler) {
            var events = this._list[ id ];
            if( !events ){
                this._list[ id ] = events = [];
            }
            events[events.length] = handler;
        },

        removeHandler: function(id, handler) {
            //Start Thatcher - unneccessary indirection.  Also, because events were
            //               - not actually being removed, we need to add the code
            //               - to do the removal ourselves. TODO
            var evt = this._list[ id ];
            if (!evt) return;
            //End Thatcher
        },
        getHandler: function(id) {
            var evt = this._list[ id ]; 
            if (!evt || !evt.length) return null;
            evt = evt.length === 1 ? 
                [evt[0]] : 
                Array.apply( null, evt );
            return function(source, args) {
                for (var i = 0, l = evt.length; i < l; i++) {
                    evt[i](source, args);
                }
            };
        }
    };

}( OpenSeadragon ));
