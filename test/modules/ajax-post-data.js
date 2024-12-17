/* global QUnit, testLog, Util */

//Testing of POST data propagation through the system

(function() {
    var POST_CAN_BE_MISSING = false;
    var POST_DATA = "";
    var URL_USED = "";
    var ASSERT = null;
    var testPostData = function(data, context) {
        ASSERT.ok((POST_CAN_BE_MISSING && (data === undefined || data === null))
            || data === POST_DATA,
            `${context} ${POST_CAN_BE_MISSING ? "has no POST data" : "receives expected POST data"}`);
    };
    var testUrl = function (url, context) {
        ASSERT.ok((!POST_CAN_BE_MISSING && URL_USED.startsWith(url) && (url.indexOf(POST_DATA) === -1 || POST_DATA === ""))
            || url === URL_USED,
            `${context} ${POST_CAN_BE_MISSING ? "URL was not modified" : "URL was stripped of POST data"}`);
    };

    //each test must call these
    var configure = function(postDataNotAccepted, postDataUsed, urlUsed, assert) {
        POST_CAN_BE_MISSING = postDataNotAccepted;
        POST_DATA = postDataUsed;
        URL_USED = urlUsed;
        ASSERT = assert;
    };

    var viewer = null;
    var DONE = false;
    var OriginalLoader = OpenSeadragon.ImageLoader;
    var OriginalAjax = OpenSeadragon.makeAjaxRequest;

    QUnit.module('AjaxPostData', {
        beforeEach: function () {
            testLog.reset();
            $("#qunit-fixture").html("<div id='example'></div>");

            //Substitute OSD parts so that it reports what it is doing
            OpenSeadragon.PostTestTileSource = function( options ) {
                //double test, actually received from configure(...)
                testPostData(options.postData, "TileSource::constructor");
                OpenSeadragon.TileSource.apply( this, [ options ] );
            };

            OpenSeadragon.extend( OpenSeadragon.PostTestTileSource.prototype, OpenSeadragon.TileSource.prototype, {
                supports: function( data, url ){
                    return url.indexOf('.post') !== -1;
                },

                configure: function( data, url, postData ){
                    testUrl(url, "TileSource::configure");
                    testPostData(postData, "TileSource::configure");
                    //some default data to trigger painting
                    return {
                        postData: postData, //!important, pass to options object in the constructor
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

                getTileUrl: function( level, x, y ) {
                    return URL_USED;
                },

                getTileAjaxHeaders: function( level, x, y ) {
                    return {'Content-type': 'application/x-www-form-urlencoded'};
                },

                getTilePostData: function(level, x, y) {
                    return this.postData;
                },

                tileExists: function ( level, x, y ) {
                    return true;
                },
            });

            var Loader = function(options) {
                OriginalLoader.apply(this, [options]);
            };

            OpenSeadragon.extend( Loader.prototype, OpenSeadragon.ImageLoader.prototype, {
                addJob: function(options) {
                    testUrl(options.src, "ImageJob::addJob");
                    testPostData(options.postData, "ImageJob::addJob");

                    if (viewer.loadTilesWithAjax) {
                        OriginalLoader.prototype.addJob.apply(this, [options]);
                    } else {
                        //no ajax means we would wait for invalid image link to load, close - passed
                        setTimeout(() => {
                            viewer.close();
                        });
                    }
                }
            });
            OpenSeadragon.ImageLoader = Loader;

            var ajaxCounter = 0;
            OpenSeadragon.makeAjaxRequest = function( url, onSuccess, onError ) {
                var withCredentials;
                var headers;
                var responseType;
                var postData;
                var options;

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

                    //since we test that postData value equals to "" but here is correctly parsed to null
                    //to avoid POST request
                    if (options.postData === "") {
                        ASSERT.ok(postData == null, "Empty post data is parsed as null");
                    } else {
                        testPostData(postData, "AJAX");
                    }
                } else {
                    testPostData(postData, "AJAX");
                }

                testUrl(url, "AJAX");

                //first AJAX firing is the image info getter, second is the first tile request: can exit
                ajaxCounter++;
                if (ajaxCounter > 1) {
                    setTimeout(() => {
                        viewer.close();
                    });
                    return null;
                }

                var request = Promise.resolve(url);
                //some required properties to pass through processResponse(...)
                request.responseText = "some text";
                request.status = 200;

                onSuccess(request);
                return request;
            };
        },

        afterEach: function () {
            ASSERT = null;

            if (viewer && viewer.close) {
                DONE ? viewer.destroy () : viewer.close();
            }
            viewer = null;

            OpenSeadragon.ImageLoader = OriginalLoader;
            OpenSeadragon.makeAjaxRequest = OriginalAjax;
        }
    });


    // ----------
    var testOpenUrl = function(withPost, withAjax) {
        testOpen(URL_USED, withPost, withAjax);
    };

    var testOpen = function(tileSource, withPost, withAjax) {
        var timeWatcher = Util.timeWatcher(ASSERT, 7000);

        viewer = OpenSeadragon({
            id:            'example',
            prefixUrl:     '/build/openseadragon/images/',
            tileSources:   tileSource,
            loadTilesWithAjax: withAjax,
            splitHashDataForPost: withPost,
        });

        var failHandler = function (event) {
            ASSERT.ok(false, 'Open-failed shoud not be called. We have custom function of fetching the data that succeeds.');
        };
        viewer.addHandler('open-failed', failHandler);

        var openHandlerCalled = false;
        var openHandler = function(event) {
            viewer.removeHandler('open', openHandler);
            openHandlerCalled = true;
        };

        var readyHandler = function (event) {
            testPostData(event.item.source.getTilePostData(0, 0, 0), "event: 'add-item'");
            viewer.world.removeHandler('add-item', readyHandler);
            viewer.addHandler('close', closeHandler);
        };

        var closeHandler = function(event) {
            ASSERT.ok(openHandlerCalled, 'Open event was sent.');

            viewer.removeHandler('close', closeHandler);
            $('#example').empty();
            ASSERT.ok(true, 'Close event was sent');
            timeWatcher.done();
        };

        //make sure we call add-item before the system default 0 priority, it fires download on tiles and removes
        // which calls internally viewer.close
        viewer.world.addHandler('add-item', readyHandler, null, Infinity);
        viewer.addHandler('open', openHandler);
    };

    // ----------
    QUnit.test('Without Post Data, Without Ajax', function(assert) {
        configure(true, "", 'someURL.post#somePostData=1&key=2', assert);
        testOpenUrl(false, false);
    });

    QUnit.test('Without Post Data: Ajax GET', function(assert) {
        configure(true, "", 'someURL.post#somePostData=1&key=2', assert);
        testOpenUrl(false, true);
    });

    QUnit.test('With Post Data: Ajax POST', function(assert) {
        configure(false, "testingPostDataSimple", 'someURL.post#testingPostDataSimple', assert);
        testOpenUrl(true, true, assert);
    });

    QUnit.test('With Post Data But No Ajax', function(assert) {
        configure(false, "somePostData=1&key=2", 'someURL.post#somePostData=1&key=2', assert);
        testOpenUrl(true, false, assert);
    });

    QUnit.test('With Post Data BUT no post data', function(assert) {
        configure(false, null, 'someURL.post', assert);
        testOpenUrl(true, true, assert);
    });

    QUnit.test('With Post Data Empty post data', function(assert) {
        configure(false, "", 'someURL.post#', assert);
        testOpenUrl(true, true, assert);
    });

    QUnit.test('CustomTileSource No Ajax', function(assert) {
        configure(true, "", 'someURL.post', assert);
        testOpen({
            height: 512 * 256,
            width: 512 * 256,
            tileSize: 256,
            minLevel: 8,
            getTileUrl: function (level, x, y) {
                return "someURL.post";
            }
        }, false, true);
    });

    QUnit.test('CustomTileSource With Ajax', function(assert) {
        configure(false, "d1=a1&d2=a2###", 'someURL.post', assert);
        testOpen({
            height: 512 * 256,
            width: 512 * 256,
            tileSize: 256,
            minLevel: 8,
            getTileUrl: function (level, x, y) {
                return "someURL.post";
            },
            getTilePostData (level, x, y) {
                return "d1=a1&d2=a2###";
            },
        }, true, true);
        DONE = true; // mark the module as completed so the viewer can be destroyed
    });

})();
