
(function($){


    $.EventHandler = function() {
        this.events = {};
    };

    $.EventHandler.prototype = {

        addHandler: function(id, handler) {
            var events = this.events[ id ];
            if( !events ){
                this.events[ id ] = events = [];
            }
            events[events.length] = handler;
        },

        removeHandler: function(id, handler) {
            //Start Thatcher - unneccessary indirection.  Also, because events were
            //               - not actually being removed, we need to add the code
            //               - to do the removal ourselves. TODO
            var evt = this.events[ id ];
            if (!evt) return;
            //End Thatcher
        },

        getHandler: function(id) {
            var evt = this.events[ id ]; 
            if (!evt || !evt.length) return null;
            evt = evt.length === 1 ? 
                [evt[0]] : 
                Array.apply( null, evt );
            return function(source, args) {
                for (var i = 0, l = evt.length; i < l; i++) {
                    evt[i](source, args);
                }
            };
        },

        raiseEvent: function(eventName, eventArgs) {
            var handler = this.getHandler( eventName );

            if (handler) {
                if (!eventArgs) {
                    eventArgs = new Object();
                }

                handler(this, eventArgs);
            }
        }
    };

}( OpenSeadragon ));
