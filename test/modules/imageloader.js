/* global module, asyncTest, $, ok, equal, notEqual, start, test, Util, testLog */

(function() {
    var viewer,
        baseOptions = {
            id:            'example',
            prefixUrl:     '/build/openseadragon/images/',
            springStiffness: 100 // Faster animation = faster tests
        };

    module('ImageLoader', {
        setup: function () {
            var example = $('<div id="example"></div>').appendTo("#qunit-fixture");

            testLog.reset();
        },
        teardown: function () {
            if (viewer && viewer.close) {
                viewer.close();
            }

            viewer = null;
        }
    });

    // ----------

    test('Default timeout', function() {
        var actual,
            expected = OpenSeadragon.DEFAULT_SETTINGS.timeout,
            message,
            options = OpenSeadragon.extend(true, baseOptions, {
                imageLoaderLimit: 1
            }), 
            viewer = OpenSeadragon(options),
            imageLoader = viewer.imageLoader;

        message = 'ImageLoader timeout should be set to the default value of ' + expected + ' when none is specified';
        actual = imageLoader.timeout;
        equal(actual, expected, message); 

        // Manually seize the ImageLoader
        imageLoader.jobsInProgress = imageLoader.jobLimit;
        imageLoader.addJob({
            src: 'test',
            loadWithAjax: false,
            crossOriginPolicy: 'test',
            ajaxWithCredentials: false,
            abort: function() {}
        });

        message = 'ImageJob should inherit the ImageLoader timeout value';
        actual = imageLoader.jobQueue.shift().timeout;
        equal(actual, expected, message); 
    });

    // ----------
            
    test('Configure timeout', function() {
        var actual,
            expected = 123456,
            message,
            options = OpenSeadragon.extend(true, baseOptions, {
                imageLoaderLimit: 1,
                timeout: expected
            }),
            viewer = OpenSeadragon(options),
            imageLoader = viewer.imageLoader;

        message = 'ImageLoader timeout should be configurable';
        actual = imageLoader.timeout;
        equal(actual, expected, message); 

        imageLoader.jobsInProgress = imageLoader.jobLimit;
        imageLoader.addJob({
            src: 'test',
            loadWithAjax: false,
            crossOriginPolicy: 'test',
            ajaxWithCredentials: false,
            abort: function() {}
        });

        message = 'ImageJob should inherit the ImageLoader timeout value';
        actual = imageLoader.jobQueue.shift().timeout;
        equal(actual, expected, message); 
    });

})();
