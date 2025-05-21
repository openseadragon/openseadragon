/*
 * OpenSeadragon - EventSource
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

(function($){

/**
 * Event handler method signature used by all OpenSeadragon events.
 *
 * @typedef {function(OpenSeadragon.Event): void} OpenSeadragon.EventHandler
 * @memberof OpenSeadragon
 * @param {OpenSeadragon.Event} event - The event object containing event-specific properties.
 * @returns {void} This handler does not return a value.
 */

/**
 * Event handler method signature used by all OpenSeadragon events.
 *
 * @typedef {function(OpenSeadragon.Event): Promise<void>} OpenSeadragon.AsyncEventHandler
 * @memberof OpenSeadragon
 * @param {OpenSeadragon.Event} event - The event object containing event-specific properties.
 * @returns {Promise<void>} This handler does not return a value.
 */


/**
 * @class EventSource
 * @classdesc For use by classes which want to support custom, non-browser events.
 *
 * @memberof OpenSeadragon
 */
$.EventSource = function() {
    this.events = {};
    this._rejectedEventList = {};
};

/** @lends OpenSeadragon.EventSource.prototype */
$.EventSource.prototype = {

    /**
     * Add an event handler to be triggered only once (or a given number of times)
     * for a given event. It is not removable with removeHandler().
     * @function
     * @param {String} eventName - Name of event to register.
     * @param {OpenSeadragon.EventHandler|OpenSeadragon.AsyncEventHandler} handler - Function to call when event
     * is triggered.
     * @param {Object} [userData=null] - Arbitrary object to be passed unchanged
     * to the handler.
     * @param {Number} [times=1] - The number of times to handle the event
     * before removing it.
     * @param {Number} [priority=0] - Handler priority. By default, all priorities are 0. Higher number = priority.
     * @returns {Boolean} - True if the handler was added, false if it was rejected
     */
    addOnceHandler: function(eventName, handler, userData, times, priority) {
        const self = this;
        times = times || 1;
        let count = 0;
        const onceHandler = function(event) {
            count++;
            if (count === times) {
                self.removeHandler(eventName, onceHandler);
            }
            return handler(event);
        };
        return this.addHandler(eventName, onceHandler, userData, priority);
    },

    /**
     * Add an event handler for a given event.
     * @function
     * @param {String} eventName - Name of event to register.
     * @param {OpenSeadragon.EventHandler|OpenSeadragon.AsyncEventHandler} handler - Function to call when event is triggered.
     * @param {Object} [userData=null] - Arbitrary object to be passed unchanged to the handler.
     * @param {Number} [priority=0] - Handler priority. By default, all priorities are 0. Higher number = priority.
     * @returns {Boolean} - True if the handler was added, false if it was rejected
     */
    addHandler: function ( eventName, handler, userData, priority ) {

        if(Object.prototype.hasOwnProperty.call(this._rejectedEventList, eventName)){
            $.console.error(`Error adding handler for ${eventName}. ${this._rejectedEventList[eventName]}`);
            return false;
        }

        let events = this.events[ eventName ];
        if ( !events ) {
            this.events[ eventName ] = events = [];
        }
        if ( handler && $.isFunction( handler ) ) {
            let index = events.length,
                event = { handler: handler, userData: userData || null, priority: priority || 0 };
            events[ index ] = event;
            while ( index > 0 && events[ index - 1 ].priority < events[ index ].priority ) {
                events[ index ] = events[ index - 1 ];
                events[ index - 1 ] = event;
                index--;
            }
        }
        return true;
    },

    /**
     * Remove a specific event handler for a given event.
     * @function
     * @param {String} eventName - Name of event for which the handler is to be removed.
     * @param {OpenSeadragon.EventHandler|OpenSeadragon.AsyncEventHandler} handler - Function to be removed.
     */
    removeHandler: function ( eventName, handler ) {
        const events = this.events[ eventName ],
            handlers = [];
        if ( !events ) {
            return;
        }
        if ( $.isArray( events ) ) {
            for ( let i = 0; i < events.length; i++ ) {
                if ( events[i].handler !== handler ) {
                    handlers.push( events[ i ] );
                }
            }
            this.events[ eventName ] = handlers;
        }
    },

    /**
     * Get the amount of handlers registered for a given event.
     * @param {String} eventName - Name of event to inspect.
     * @returns {number} amount of events
     */
    numberOfHandlers: function (eventName) {
        const events = this.events[ eventName ];
        if ( !events ) {
            return 0;
        }
        return events.length;
    },

    /**
     * Remove all event handlers for a given event type. If no type is given all
     * event handlers for every event type are removed.
     * @function
     * @param {String} eventName - Name of event for which all handlers are to be removed.
     */
    removeAllHandlers: function( eventName ) {
        if ( eventName ){
            this.events[ eventName ] = [];
        } else{
            for ( let eventType in this.events ) {
                this.events[ eventType ] = [];
            }
        }
    },

    /**
     * Get a function which iterates the list of all handlers registered for a given event, calling the handler for each.
     * @function
     * @param {String} eventName - Name of event to get handlers for.
     */
    getHandler: function ( eventName) {
        let events = this.events[ eventName ];
        if ( !events || !events.length ) {
            return null;
        }
        events = events.length === 1 ?
            [ events[ 0 ] ] :
            Array.apply( null, events );
        return function ( source, args ) {
            let length = events.length;
            for ( let i = 0; i < length; i++ ) {
                if ( events[ i ] ) {
                    args.eventSource = source;
                    args.userData = events[ i ].userData;
                    events[ i ].handler( args );
                }
            }
        };
    },

    /**
     * Get a function which iterates the list of all handlers registered for a given event,
     * calling the handler for each and awaiting async ones.
     * @function
     * @param {String} eventName - Name of event to get handlers for.
     * @param {any} bindTarget - Bound target to return with the promise on finish
     */
    getAwaitingHandler: function ( eventName, bindTarget ) {
        let events = this.events[ eventName ];
        if ( !events || !events.length ) {
            return null;
        }
        events = events.length === 1 ?
            [ events[ 0 ] ] :
            Array.apply( null, events );

        return function ( source, args ) {
            // We return a promise that gets resolved after all the events finish.
            // Returning loop result is not correct, loop promises chain dynamically
            // and outer code could process finishing logics in the middle of event loop.
            return new $.Promise(resolve => {
                const length = events.length;
                function loop(index) {
                    if ( index >= length || !events[ index ] ) {
                        resolve(bindTarget);
                        return null;
                    }
                    args.eventSource = source;
                    args.userData = events[ index ].userData;
                    let result = events[ index ].handler( args );
                    result = (!result || $.type(result) !== "promise") ? $.Promise.resolve() : result;
                    return result.then(() => loop(index + 1));
                }
                loop(0);
            });
        };
    },

    /**
     * Trigger an event, optionally passing additional information. Does not await async handlers, i.e.
     * OpenSeadragon.AsyncEventHandler.
     * @function
     * @param {String} eventName - Name of event to register.
     * @param {Object} eventArgs - Event-specific data.
     * @returns {Boolean} True if the event was fired, false if it was rejected because of rejectEventHandler(eventName)
     */
    raiseEvent: function( eventName, eventArgs ) {
        //uncomment if you want to get a log of all events
        //$.console.log( "Event fired:", eventName );

        if(Object.prototype.hasOwnProperty.call(this._rejectedEventList, eventName)){
            $.console.error(`Error adding handler for ${eventName}. ${this._rejectedEventList[eventName]}`);
            return false;
        }

        const handler = this.getHandler( eventName );
        if ( handler ) {
            handler( this, eventArgs || {} );
        }
        return true;
    },

    /**
     * Trigger an event, optionally passing additional information.
     * This events awaits every asynchronous or promise-returning function, i.e.
     * OpenSeadragon.AsyncEventHandler.
     * @param {String} eventName - Name of event to register.
     * @param {Object} eventArgs - Event-specific data.
     * @param {?} [bindTarget = null] - Promise-resolved value on the event finish
     * @return {OpenSeadragon.Promise|undefined} - Promise resolved upon the event completion.
     */
    raiseEventAwaiting: function ( eventName, eventArgs, bindTarget = null ) {
        //uncomment if you want to get a log of all events
        //$.console.log( "Awaiting event fired:", eventName );

        const awaitingHandler = this.getAwaitingHandler(eventName, bindTarget);
        if (awaitingHandler) {
            return awaitingHandler(this, eventArgs || {});
        }
        return $.Promise.resolve(bindTarget);
    },

    /**
     * Set an event name as being disabled, and provide an optional error message
     * to be printed to the console
     * @param {String} eventName - Name of the event
     * @param {String} [errorMessage] - Optional string to print to the console
     * @private
     */
    rejectEventHandler(eventName, errorMessage = ''){
        this._rejectedEventList[eventName] = errorMessage;
    },

    /**
     * Explicitly allow an event handler to be added for this event type, undoing
     * the effects of rejectEventHandler
     * @param {String} eventName - Name of the event
     * @private
     */
    allowEventHandler(eventName){
        delete this._rejectedEventList[eventName];
    }
};

}( OpenSeadragon ));
