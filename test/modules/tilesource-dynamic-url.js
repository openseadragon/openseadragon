/* global QUnit, testLog, Util */

//Testing of TileSource with getTileUrl that returns a function

(function() {
    var ASSERT = null;
    var DYNAMIC_URL = "";
    var viewer = null;
    var OriginalAjax = OpenSeadragon.makeAjaxRequest;
    var OriginalTile = OpenSeadragon.Tile;

    /**
     * Set up shared variables for test
     */
    var configure = function(assert, url) {
        ASSERT = assert;
        DYNAMIC_URL = url;
    };

    QUnit.module('TileSourceDynamicUrl', {
        beforeEach: function () {
            testLog.reset();
            $("#qunit-fixture").html("<div id='example'></div>");

            // Add test tile source to OSD
            OpenSeadragon.DynamicUrlTestTileSource = function( options ) {
                OpenSeadragon.TileSource.apply( this, [ options ] );
            };

            OpenSeadragon.extend( OpenSeadragon.DynamicUrlTestTileSource.prototype, OpenSeadragon.TileSource.prototype, {
                supports: function( data, url ){
                    return url.indexOf('dynamic') !== -1;
                },

                configure: function( _data, url, postData ){
                    //some default data to trigger painting
                    return {
                        postData: postData,
                        tilesUrl: url,
                        fileFormat: "jpg",
                        sizeData: {Width: 55, Height: 55},
                        width: 55,
                        height: 55,
                        tileSize: 55,
                        tileOverlap: 55,
                        minLevel: 1,
                        maxLevel: 1,
                        displayRects: []
                    };
                },

                // getTileUrl return a function that must be called by Tile.getUrl
                getTileUrl: function( _level, _x, _y ) {
                    // Assert that custom tile source is called correctly
                    ASSERT.ok(true, 'DynamicUrlTileSource.getTileUrl called');
                    return () => DYNAMIC_URL;
                },

                tileExists: function ( _level, _x, _y ) {
                    return true;
                }
            });

            var hasCompletedImageInfoRequest = false;
            OpenSeadragon.makeAjaxRequest = function( url, onSuccess, onError ) {
                // Note that our preferred API is that you pass in a single object; the named
                // arguments are for legacy support.
                if( $.isPlainObject( url ) ){
                    onSuccess = url.success;
                    onError = url.error;
                    withCredentials = url.withCredentials;
                    headers = url.headers;
                    responseType = url.responseType || null;
                    postData = url.postData || null;
                    options = url; //save original stuff
                    url = url.url;
                }

                //first AJAX firing is the image info getter, second is the first tile request: can exit
                if (hasCompletedImageInfoRequest) {
                    // Assert dynamic url from tileSource is called
                    ASSERT.equal(url, DYNAMIC_URL, 'Called dynamic url correctly');
                    viewer.close();
                    return null;
                }

                hasCompletedImageInfoRequest = true;

                var request = Promise.resolve(url);
                //some required properties to pass through processResponse(...)
                request.responseText = "some text";
                request.status = 200;

                onSuccess(request);
                return request;
            };

            // Override Tile to ensure getUrl is called successfully.
            var Tile = function(...params) {
                OriginalTile.apply(this, params);
            };

            OpenSeadragon.extend( Tile.prototype, OpenSeadragon.Tile.prototype, {
                getUrl: function() {
                    ASSERT.ok(true, 'Tile.getUrl called');
                    return OriginalTile.prototype.getUrl.apply(this);
                }
            });
            OpenSeadragon.Tile = Tile;
        },

        afterEach: function () {
            ASSERT = null;

            if (viewer && viewer.close) {
                viewer.close();
            }
            viewer = null;

            OpenSeadragon.makeAjaxRequest = OriginalAjax;
            OpenSeadragon.Tile = OriginalTile;
        }
    });


    /**
     * Create viewer for test
     */
    var testUrlCall = function(tileSourceUrl) {
        var timeWatcher = Util.timeWatcher(ASSERT, 7000);

        viewer = OpenSeadragon({
            id:            'example',
            prefixUrl:     '/build/openseadragon/images/',
            tileSources:   tileSourceUrl,
            loadTilesWithAjax: true,
        });

        var failHandler = function (event) {
            testPostData(event.postData, "event: 'open-failed'");
            viewer.removeHandler('open-failed', failHandler);
            viewer.close();
        };
        viewer.addHandler('open-failed', failHandler);

        var readyHandler = function (event) {
            //relies on Tilesource contructor extending itself with options object
            testPostData(event.postData, "event: 'ready'");
            viewer.removeHandler('ready', readyHandler);
        };
        viewer.addHandler('ready', readyHandler);


        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            ASSERT.ok(true, 'Open event was sent');
            viewer.addHandler('close', closeHandler);
            viewer.world.draw();
        };

        var closeHandler = function(event) {
            viewer.removeHandler('close', closeHandler);
            $('#example').empty();
            ASSERT.ok(true, 'Close event was sent');
            timeWatcher.done();
        };
        viewer.addHandler('open', openHandler);
    };

    // ----------
    QUnit.test('TileSource.getTileUrl supports returning a function', function(assert) {
        /**
         * Expect 5 assertions to be called:
         * 1. Open event was sent
         * 2. DynamicUrlTileSource.getTileUrl called
         * 3. Tile.getUrl called
         * 4. Called dynamic url correctly
         * 5. Close event was sent
         */
        assert.expect(5);
        configure(assert, 'dynamicUrl');
        testUrlCall('dynamicUrl');
    });
})();
