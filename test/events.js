/* global module, asyncTest, $, ok, equal, notEqual, start, test, Util, testLog */

(function () {
    var viewer;

    module( 'Events', {
        setup: function () {
            var example = $( '<div id="example"></div>' ).appendTo( "#qunit-fixture" );

            testLog.reset();

            viewer = OpenSeadragon( {
                id: 'example',
                prefixUrl: '/build/openseadragon/images/',
                springStiffness: 100 // Faster animation = faster tests
            } );
        },
        teardown: function () {
            if ( viewer && viewer.close ) {
                viewer.close();
            }

            viewer = null;
        }
    } );

    // ----------
    asyncTest( 'addHandler without userData', function () {
        var openHandler = function ( eventSender, eventData ) {
            viewer.removeHandler( 'open', openHandler );
            ok( eventData, 'Event handler received event data' );
            if ( eventData ) {
                strictEqual( eventData.userData, null, 'User data defaulted to null' );
            }
            viewer.close();
            start();
        };

        viewer.addHandler( 'open', openHandler );
        viewer.open( '/test/data/testpattern.dzi' );
    } );

    // ----------
    asyncTest( 'addHandler with userData', function () {
        var userData = { item1: 'Test user data', item2: Math.random() };
        var originalUserData = { item1: userData.item1, item2: userData.item2 };

        var openHandler = function ( eventSender, eventData ) {
            viewer.removeHandler( 'open', openHandler );
            ok( eventData, 'Event handler received event data' );
            ok( eventData && eventData.userData, 'Event handler received user data' );
            if ( eventData && eventData.userData ) {
                deepEqual( eventData.userData, originalUserData, 'User data was untouched' );
            }
            viewer.close();
            start();
        };

        viewer.addHandler( 'open', openHandler, userData );
        viewer.open( '/test/data/testpattern.dzi' );
    } );

} )();
