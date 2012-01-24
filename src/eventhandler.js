
(function($){


    $.EventHandler = function() {
        this.events = {};
    };

    $.EventHandler.prototype = {

        addHandler: function( id, handler ) {
            var events = this.events[ id ];
            if( !events ){
                this.events[ id ] = events = [];
            }
            events[ events.length ] = handler;
        },

        removeHandler: function( id, handler ) {
            //Start Thatcher - unneccessary indirection.  Also, because events were
            //               - not actually being removed, we need to add the code
            //               - to do the removal ourselves. TODO
            var events = this.events[ id ];
            if ( !events ){ 
                return; 
            }
            //End Thatcher
        },

        getHandler: function( id ) {
            var events = this.events[ id ]; 
            if ( !events || !events.length ){ 
                return null; 
            }
            events = events.length === 1 ? 
                [ events[ 0 ] ] : 
                Array.apply( null, events );
            return function( source, args ) {
                var i, 
                    length = events.length;
                for ( i = 0; i < length; i++ ) {
                    events[ i ]( source, args );
                }
            };
        },

        raiseEvent: function( eventName, eventArgs ) {
            var handler = this.getHandler( eventName );

            if ( handler ) {
                if ( !eventArgs ) {
                    eventArgs = new Object();
                }

                handler( this, eventArgs );
            }
        }
    };

}( OpenSeadragon ));
