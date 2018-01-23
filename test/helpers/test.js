/* global $, Util */

(function () {

    // ----------
    window.Util = {
        // ----------
        simulateViewerClickWithDrag: function ( args ) {
            // args = { viewer, widthFactor, heightFactor, dragCount, dragDx, dragDy }

            if ( args.hasOwnProperty( 'dragCount' ) ) {
                args.dragDx = args.dragDx || 1;
                args.dragDy = args.dragDy || 1;
            }
            else {
                args.dragCount = 0;
            }

            if ( args.widthFactor === undefined ) {
                args.widthFactor = 0.5;
            }

            //TODO Redefine to be the middle by default
            if ( args.heightFactor === undefined ) {
                args.heightFactor = 0.5;
            }

            args.widthFactor = Math.min( 1, Math.max( 0, args.widthFactor ) );
            //TODO Fix this.  The max height should be 1/AR
            args.heightFactor = Math.min( 1, Math.max( 0, args.heightFactor ) );

            var $canvas = $( args.viewer.element ).find( '.openseadragon-canvas' ).not( '.navigator .openseadragon-canvas' );
            var offset = $canvas.offset();
            var event = {
                clientX: offset.left + Math.floor( $canvas.width() * args.widthFactor ),
                clientY: offset.top + Math.floor( $canvas.height() * args.heightFactor )
            };

            $canvas
                .simulate( OpenSeadragon.MouseTracker.haveMouseEnter ? 'mouseenter' : 'mouseover', event )
                .simulate( 'mousedown', event );
            for ( var i = 0; i < args.dragCount; i++ ) {
                event.clientX += args.dragDx;
                event.clientY += args.dragDy;
                $canvas
                    .simulate( "mousemove", event );
            }
            $canvas
                .simulate( 'mouseup', event )
                .simulate( OpenSeadragon.MouseTracker.haveMouseEnter ? 'mouseleave' : 'mouseout', event );
        },

        // ----------
        initializeTestDOM: function () {
            $( "#qunit-fixture" )
                .append( '<div><div id="example"></div><div id="exampleNavigator"></div></div>' )
                .append( '<div id="wideexample"></div>' )
                .append( '<div id="tallexample"></div>' );
        },

        // ----------
        equalsWithVariance: function ( value1, value2, variance ) {
            return Math.abs( value1 - value2 ) <= variance;
        },

        // ----------
        assessNumericValue: function ( assert, value1, value2, variance, message ) {
            assert.ok( Util.equalsWithVariance( value1, value2, variance ), message + " Expected:" + value1 + " Found: " + value2 + " Variance: " + variance );
        },

        // ----------
        assertPointsEquals: function (assert, pointA, pointB, precision, message) {
            Util.assessNumericValue(assert, pointA.x, pointB.x, precision, message + " x: ");
            Util.assessNumericValue(assert, pointA.y, pointB.y, precision, message + " y: ");
        },

        // ----------
        assertRectangleEquals: function (assert, rectA, rectB, precision, message) {
            Util.assessNumericValue(assert, rectA.x, rectB.x, precision, message + " x: ");
            Util.assessNumericValue(assert, rectA.y, rectB.y, precision, message + " y: ");
            Util.assessNumericValue(assert, rectA.width, rectB.width, precision,
                message + " width: ");
            Util.assessNumericValue(assert, rectA.height, rectB.height, precision,
                message + " height: ");
            Util.assessNumericValue(assert, rectA.degrees, rectB.degrees, precision,
                message + " degrees: ");
        },

        // ----------
        timeWatcher: function ( assert, time ) {
            var done = assert.async();
            time = time || 2000;
            var finished = false;

            setTimeout( function () {
                if ( !finished ) {
                    finished = true;
                    assert.ok( false, 'finishes in ' + time + 'ms' );
                    done();
                }
            }, time );

            return {
                done: function () {
                    if ( !finished ) {
                        finished = true;
                        done();
                    }
                }
            };
        },

        // ----------
        spyOnce: function(obj, functionName, callback) {
            var original = obj[functionName];
            obj[functionName] = function() {
                obj[functionName] = original;
                var result = callback.apply(this, arguments);
                if (result === undefined) {
                    result = original.apply(this, arguments);
                }
                return result;
            };
        },

        // ----------
        testDeprecation: function(assert, obj0, member0, obj1, member1) {
            var called = false;
            var errored = false;

            if (obj1 && member1) {
                this.spyOnce(obj1, member1, function() {
                    called = true;
                    return false;
                });
            } else {
                called = true;
            }

            this.spyOnce(OpenSeadragon.console, 'error', function(message) {
                if (/deprecated/.test(message)) {
                    errored = true;
                }
            });

            obj0[member0]();
            assert.equal(called, true, 'called through for ' + member0);
            assert.equal(errored, true, 'errored for ' + member0);
        }
    };

    /*
    Test console log capture

    1. Only the OpenSeadragon.console logger is touched
    2. All log messages are stored in window.testLog in arrays keyed on the logger name (e.g. log,
    warning, error, etc.) as JSON-serialized strings to simplify comparisons
    3. The captured log arrays have a custom contains() method for ease of testing
    4. testLog.reset() will clear all of the message arrays, intended for use in test setup routines
    */
    var testConsole = window.testConsole = {},
        testLog = window.testLog = {
            log: [],
            debug: [],
            info: [],
            warn: [],
            error: [],
            reset: function () {
                for ( var i in testLog ) {
                    if ( testLog.hasOwnProperty( i ) && 'length' in testLog[i] && 'push' in testLog[i] ) {
                        testLog[i].length = 0;
                    }
                }
            }
        };

    for ( var i in testLog ) {
        if ( testLog.hasOwnProperty( i ) && testLog[i].push ) {
            testConsole[i] = ( function ( arr ) {
                return function () {
                    var args = Array.prototype.slice.call( arguments, 0 ); // Coerce to true Array
                    arr.push( JSON.stringify( args ) ); // Store as JSON to avoid tedious array-equality tests
                };
            } )( testLog[i] );

            testLog[i].contains = function ( needle ) {
                for ( var i = 0; i < this.length; i++ ) {
                    if ( this[i] == needle ) {
                        return true;
                    }
                }
                return false;
            };
        }
    }

    testConsole.assert = function(condition, message) {
        if (condition) {
            testConsole.error(message);
        }
    };

    OpenSeadragon.console = testConsole;
} )();

