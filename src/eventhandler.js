(function($){

/**
 * For use by classes which want to support custom, non-browser events.
 * TODO: Consider  mapping 'addHandler', 'removeHandler' and 'raiseEvent' to 'bind', 
 *       'unbind', and 'trigger' respectively.  Finally add a method 'one' which
 *       automatically unbinds a listener after the first triggered event that 
 *       matches.
 * @class
 */
$.EventHandler = function() {
    this.events = {};
};

$.EventHandler.prototype = {

    /**
     * Add an event handler for a given event.
     * @function
     * @param {String} eventName - Name of event to register.
     * @param {Function} handler - Function to call when event is triggered.
     */
    addHandler: function( eventName, handler ) {
        var events = this.events[ eventName ];
        if( !events ){
            this.events[ eventName ] = events = [];
        }
        if( handler && $.isFunction( handler ) ){
            events[ events.length ] = handler;
        }
    },

    /**
     * Remove a specific event handler for a given event.
     * @function
     * @param {String} eventName - Name of event for which the handler is to be removed.
     * @param {Function} handler - Function to be removed.
     */
    removeHandler: function( eventName, handler ) {
        var events = this.events[ eventName ],
            handlers = [],
            i;
        if ( !events ){ 
            return; 
        }
        if( $.isArray( events ) ){
            for( i = 0; i < events.length; i++ ){
                if( events[ i ] !== handler ){
                    handlers.push( handler );
                }
            } 
            this.events[ eventName ] = handlers;
        }
    },


    /**
     * Remove all event handler for a given event type.
     * @function
     * @param {String} eventName - Name of event for which all handlers are to be removed.
     */
    removeAllHandlers: function( eventName ){
        this.events[ eventName ] = [];
    }, 



    /**
     * Trigger an event, optionally passing additional information. 
     * @function
     * @param {String} eventName - Name of event to trigger.
     */
    raiseEvent: function( eventName ) {
        //uncomment if you want to get a log og all events
        //$.console.log( eventName );
        var handler = getHandler( this, eventName ),
            eventArg,
            allArgs,
            i;

        if ( handler ) {
            if( arguments.length > 1 ){
                eventArg = arguments[ 1 ];
            } else {
                eventArg = {};
            }
            allArgs = [ eventArg ];
            if( arguments.length > 2 ){
                for( i = 0; i < arguments.length; i++ ){
                    allArgs[ i ] = arguments[ i + 2 ];
                }
            }

            return handler( this, allArgs );
        }
    }
};


/**
 * Retrive the list of all handlers registered for a given event.
 * @private
 * @inner
 * @param {String} eventName - Name of event to get handlers for.
 */
function getHandler( handler, eventName ) {
    var events = handler.events[ eventName ]; 
    if ( !events || !events.length ){ 
        return null; 
    }

    return function( source, allArgs ) {
        var i, 
            length = events.length,
            stopPropagation,
            preventDefault,
            returnValue,
            eventArg = arguments;
        //Dress up the primary 'event' argument to provide the usual
        //stopPropagation and preventDefault functions.
        if( allArgs && allArgs.length ){
            allArgs[0].stopProgagation = function(){
                stopPropagation = true;
            };
            allArgs[0].preventDefault = function(){
                preventDefault = true;
            };
        } else {
            allArgs = [];
        }
        for ( i = 0; i < length; i++ ) {
            if( $.isFunction( events[ i ] ) ) {
                returnValue = events[ i ].apply( source, allArgs );
                //stopping propagation isnt dom related, only implying that the chaing
                //of registered event handlers for this event will be inturrupted.
                if( stopPropagation === true || length === i + 1 ){
                    if( preventDefault || false === returnValue ){
                        //the implementing class that invoked raiseEvent may choose
                        //to use the return value of false to prevent the default 
                        //behavior that would normally occur after the event was invoked
                        return false;
                    }
                }
            }
        }
    };
}


}( OpenSeadragon ));
