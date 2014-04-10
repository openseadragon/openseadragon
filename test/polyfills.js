/* global module, asyncTest, $, ok, equal, notEqual, start, test, Util, testLog */

( function() {

    module( 'Polyfills', {
        setup: function() {
            testLog.reset();
        }
    } );

    // ----------
    test( 'pageScroll', function() {
        // Setup
        var origWidth = $( "body" ).width(),
            origHeight = $( "body" ).height();
        $( "body" ).width( origWidth + 10000 );
        $( "body" ).height( origHeight + 10000 );
        $( document ).scrollLeft( 0 );
        $( document ).scrollTop( 0 );
        // End setup

        // Test get
        var originalGetPageScroll = OpenSeadragon.getPageScroll;

        var scroll = OpenSeadragon.getPageScroll();
        equal( scroll.x, 0, "Scroll should be 0 at beginning." );
        equal( scroll.y, 0, "Scroll should be 0 at beginning." );

        // If window.pageXOffset is not supported, the getPageScroll method should
        // not have been redefined
        if ( typeof ( window.pageXOffset ) != "number" ) {
            equal( originalGetPageScroll, OpenSeadragon.getPageScroll,
                "OpenSeadragon.getPageScroll must not be redefined when on 0,0" +
                " and window API is not supported." );
        } else {
            notEqual( originalGetPageScroll, OpenSeadragon.getPageScroll,
                "OpenSeadragon.getPageScroll must be redefined when window API " +
                "is supported." );
        }

        $( document ).scrollLeft( 200 );
        $( document ).scrollTop( 100 );
        scroll = originalGetPageScroll();
        equal( scroll.x, 200, "First call to getScroll." );
        equal( scroll.y, 100, "First call to getScroll." );

        $( document ).scrollLeft( 500 );
        $( document ).scrollTop( 600 );
        scroll = OpenSeadragon.getPageScroll();
        equal( scroll.x, 500, "Second call to getScroll." );
        equal( scroll.y, 600, "Second call to getScroll." );



        // Test set, must be imperatively be done after tests for get to not
        // break them.
        var originalSetPageScroll = OpenSeadragon.setPageScroll;

        $( document ).scrollLeft( 0 );
        $( document ).scrollTop( 0 );
        var scroll = new OpenSeadragon.Point( 0, 0 );
        OpenSeadragon.setPageScroll( scroll );
        equal( $( document ).scrollLeft(), 0, "First call to 0,0 while already on 0,0." );
        equal( $( document ).scrollTop(), 0, "First call to 0,0 while already on 0,0." );

        // If window.pageXOffset is not supported, the getPageScroll method should
        // not have been redefined
        if ( typeof ( window.scrollTo ) === "undefined" ) {
            equal( originalSetPageScroll, OpenSeadragon.setPageScroll,
                "OpenSeadragon.setPageScroll must not be redefined when not moving." );
        } else {
            notEqual( originalSetPageScroll, OpenSeadragon.setPageScroll,
                "OpenSeadragon.setPageScroll must be redefined when window API is supported." );
        }


        OpenSeadragon.setPageScroll = originalSetPageScroll;
        $( document ).scrollLeft( 100 );
        $( document ).scrollTop( 200 );
        var scroll = new OpenSeadragon.Point( 100, 200 );
        OpenSeadragon.setPageScroll( scroll );
        equal( $( document ).scrollLeft(), 100, "First call to 100,200 while already on 100,200." );
        equal( $( document ).scrollTop(), 200, "First call to 100,200 while already on 100,200." );

        // If window.pageXOffset is not supported, the getPageScroll method should
        // not have been redefined
        if ( typeof ( window.scrollTo ) === "undefined" ) {
            equal( originalSetPageScroll, OpenSeadragon.setPageScroll,
                "OpenSeadragon.setPageScroll must not be redefined when not moving." );
        } else {
            notEqual( originalSetPageScroll, OpenSeadragon.setPageScroll,
                "OpenSeadragon.setPageScroll must be redefined when window API is supported." );
        }


        OpenSeadragon.setPageScroll = originalSetPageScroll;
        $( document ).scrollLeft( 20000 );
        $( document ).scrollTop( 20000 );
        var actualScrollLeft = $( document ).scrollLeft();
        var actualScrollTop = $( document ).scrollTop();
        $( document ).scrollLeft( 0 );
        $( document ).scrollTop( 0 );
        var scroll = new OpenSeadragon.Point( 20000, 20000 );
        OpenSeadragon.setPageScroll( scroll );
        equal( $( document ).scrollLeft(), actualScrollLeft, "First call to position above limits." );
        equal( $( document ).scrollTop(), actualScrollTop, "First call to position above limits." );
        notEqual( originalSetPageScroll, OpenSeadragon.setPageScroll,
            "Even if outside scroll limits, OpenSeadragon.setPageScroll can be " +
            "reassigned on first call." );


        var currentSetPageScroll = OpenSeadragon.setPageScroll;
        var scroll = new OpenSeadragon.Point( 200, 200 );
        OpenSeadragon.setPageScroll( scroll );
        equal( $( document ).scrollLeft(), 200, "Second call." );
        equal( $( document ).scrollTop(), 200, "Second call." );
        equal( currentSetPageScroll, OpenSeadragon.setPageScroll,
            "OpenSeadragon.setPageScroll must not be reassigned after first call." );


        // Teardown
        $( "body" ).width( origWidth );
        $( "body" ).height( origHeight );
        $( document ).scrollLeft( 0 );
        $( document ).scrollTop( 0 );
    } );

} )();
