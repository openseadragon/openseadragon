/* global $, QUnit, Util */

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
                .simulate( 'mouseenter', event )
                .simulate( 'mousedown', event );
            for ( var i = 0; i < args.dragCount; i++ ) {
                event.clientX += args.dragDx;
                event.clientY += args.dragDy;
                $canvas
                    .simulate( "mousemove", event );
            }
            $canvas
                .simulate( 'mouseup', event )
                .simulate( 'mouseleave', event );
        },

        // ----------
        initializeTestDOM: function () {
            $( "#qunit-fixture" )
                .append( '<div><div id="example"></div><div id="exampleNavigator"></div></div>' )
                .append( '<div id="wideexample"></div>' )
                .append( '<div id="tallexample"></div>' );
        },

        // ----------
        equalsWithVariance: function (actual, expected, variance) {
            return Math.abs(actual - expected) <= variance;
        },

        // ----------
        assessNumericValue: function (assert, actual, expected, variance, message) {
            assert.ok(
                Util.equalsWithVariance(actual, expected, variance),
                message + " Actual: " + actual + " Expected: " + expected + " Variance: " + variance
            );
        },

        // ----------
        assertPointsEquals: function (assert, actualPoint, expectedPoint, precision, message) {
            Util.assessNumericValue(assert, actualPoint.x, expectedPoint.x, precision, message + " x: ");
            Util.assessNumericValue(assert, actualPoint.y, expectedPoint.y, precision, message + " y: ");
        },

        // ----------
        assertRectangleEquals: function (assert, actualRect, expectedRect, precision, message) {
            Util.assessNumericValue(assert, actualRect.x, expectedRect.x, precision, message + " x: ");
            Util.assessNumericValue(assert, actualRect.y, expectedRect.y, precision, message + " y: ");
            Util.assessNumericValue(assert, actualRect.width, expectedRect.width, precision, message + " width: ");
            Util.assessNumericValue(assert, actualRect.height, expectedRect.height, precision, message + " height: ");
            Util.assessNumericValue(assert, actualRect.degrees, expectedRect.degrees, precision, message + " degrees: ");
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
        },
    };

    // Log the name of the currently running test when it starts. Uses console.log rather than
    // $.console.log so that the message is printed even after the $.console is diverted (see below).
    QUnit.testStart((details) => {
        console.log(`Starting test ${details.module}.${details.name}`);
    });

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

    // OSD has circular references, if a console log tries to serialize
    // certain object, remove these references from a clone (do not delete prop
    // on the original object).
    // NOTE: this does not work if someone replaces the original class with
    // a mock object! Try to mock functions only, or ensure mock objects
    // do not hold circular references.
    const circularOSDReferences = {
        'Tile': 'tiledImage',
        'CacheRecord': ['_tRef', '_tiles'],
        'World': 'viewer',
        'DrawerBase': ['viewer', 'viewport'],
        'CanvasDrawer': ['viewer', 'viewport'],
        'WebGLDrawer': ['viewer', 'viewport'],
        'TiledImage': ['viewer', '_drawer'],
    };
    for ( var i in testLog ) {
        if ( testLog.hasOwnProperty( i ) && testLog[i].push ) {
            // Circular reference removal
            const osdCircularStructureReplacer = function (key, value) {
                for (let ClassType in circularOSDReferences) {
                    if (value instanceof OpenSeadragon[ClassType]) {
                        const instance = {};
                        Object.assign(instance, value);

                        let circProps = circularOSDReferences[ClassType];
                        if (!Array.isArray(circProps)) circProps = [circProps];
                        for (let prop of circProps) {
                            instance[prop] = '__circular_reference__';
                        }
                        return instance;
                    }
                }
                return value;
            };

            testConsole[i] = ( function ( arr ) {
                return function () {
                    var args = Array.prototype.slice.call( arguments, 0 ); // Coerce to true Array
                    arr.push( JSON.stringify( args, osdCircularStructureReplacer ) ); // Store as JSON to avoid tedious array-equality tests
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

    OpenSeadragon.getBuiltInDrawersForTest = function() {
        const drawers = [];
        for (let property in OpenSeadragon) {
            const drawer = OpenSeadragon[ property ],
                proto = drawer.prototype;
            if( proto &&
                proto instanceof OpenSeadragon.DrawerBase &&
                $.isFunction( proto.getType )){
                drawers.push(proto.getType.call( drawer ));
            }
        }
        return drawers;
    };

    OpenSeadragon.Viewer.prototype.waitForFinishedJobsForTest = function () {
        let finish;
        let int = setInterval(() => {
            if (this.imageLoader.jobsInProgress < 1) {
                finish();
            }
        }, 50);
        return new OpenSeadragon.Promise((resolve) => finish = resolve);
    };
} )();

