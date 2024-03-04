/* global QUnit, testLog, Util */

//Testing of TileSource with getTileUrl that returns a function

(function() {
    var ASSERT = null;
    var done = null;
    var DYNAMIC_URL = "";
    var viewer = null;
    var OriginalAjax = OpenSeadragon.makeAjaxRequest;
    var OriginalTileGetUrl = OpenSeadragon.Tile.prototype.getUrl;
    // These variables allow tracking when the first request for data has finished
    var firstUrlPromise = null;
    var isFirstUrlPromiseResolved = false;
    var firstUrlPromiseResolver = null;

    /**
     * Set up shared variables for test
     */
    var configure = function(assert, url, assertAsyncDone) {
        ASSERT = assert;
        DYNAMIC_URL = url;
        done = assertAsyncDone;
        firstUrlPromise = new Promise(resolve => {
            firstUrlPromiseResolver = () => {
                isFirstUrlPromiseResolved = true;
                resolve();
            };
        });
    };

    QUnit.module('TileSourceDynamicUrl', {
        beforeEach: function () {
            testLog.reset();
            $("#qunit-fixture").html("<div id='example'></div>");

            // Add test tile source to OSD
            OpenSeadragon.DynamicUrlTestTileSource = function(options) {
                OpenSeadragon.TileSource.apply(this, [options]);
            };

            OpenSeadragon.extend( OpenSeadragon.DynamicUrlTestTileSource.prototype, OpenSeadragon.TileSource.prototype, {
                supports: function(_data, url){
                    return url.indexOf('dynamic') !== -1;
                },

                configure: function(_data, url, postData){
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
                getTileUrl: function(_level, _x, _y) {
                    // Assert that custom tile source is called correctly
                    ASSERT.ok(true, 'DynamicUrlTileSource.getTileUrl called');
                    return () => DYNAMIC_URL;
                },

                tileExists: function (_level, _x, _y) {
                    return true;
                }
            });

            var hasCompletedImageInfoRequest = false;
            OpenSeadragon.makeAjaxRequest = function(url, onSuccess, onError) {
                // Note that our preferred API is that you pass in a single object; the named
                // arguments are for legacy support.
                if( $.isPlainObject(url)){
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
                    ASSERT.equal(url, DYNAMIC_URL, 'Called dynamic url correctly: ' + DYNAMIC_URL);
                    // If we've only queried for one url, resolve that promise to set up second query
                    // Otherwise close viewer
                    if (isFirstUrlPromiseResolved) {
                        viewer.close();
                        done();
                    } else {
                        firstUrlPromiseResolver();
                    }

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

            // Override Tile::getUrl to ensure getUrl is called successfully.
            OpenSeadragon.Tile.prototype.getUrl = function () {
                // if ASSERT is still truthy, call ASSERT.ok. If the viewer
                // has already been destroyed and ASSERT has set to null, ignore this
                if (ASSERT) {
                    ASSERT.ok(true, 'Tile.getUrl called');
                }
                return OriginalTileGetUrl.apply(this, arguments);
            };
        },

        afterEach: function () {
            ASSERT = null;

            if (viewer){
                viewer.destroy();
            }

            viewer = null;

            OpenSeadragon.makeAjaxRequest = OriginalAjax;
            OpenSeadragon.Tile.prototype.getUrl = OriginalTileGetUrl;
        }
    });


    /**
     * Create viewer for test
     */
    var testUrlCall = function(tileSourceUrl) {
        var timeWatcher = Util.timeWatcher(ASSERT, 7000);

        viewer = OpenSeadragon({
            id: 'example',
            prefixUrl: '/build/openseadragon/images/',
            tileSources: tileSourceUrl,
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


        var openHandler = function(_event) {
            viewer.removeHandler('open', openHandler);
            ASSERT.ok(true, 'Open event was sent');
            viewer.addHandler('close', closeHandler);
            viewer.world.draw();
        };

        var closeHandler = function(_event) {
            viewer.removeHandler('close', closeHandler);
            $('#example').empty();
            ASSERT.ok(true, 'Close event was sent');
            timeWatcher.done();
        };
        viewer.addHandler('open', openHandler);

        return viewer;
    };

    // ----------
    QUnit.test('TileSource.getTileUrl supports returning a function', function(assert) {
        const done = assert.async();
        configure(assert, 'dynamicUrl', done);
        const viewer = testUrlCall('dynamicUrl');
        firstUrlPromise.then(() => {
            // after querying with first dynamic url, update the url and trigger new request
            DYNAMIC_URL = 'dynamicUrl2';
            delete viewer.world.getItemAt(0).tilesMatrix[1][0][0];
        })
    });
})();
