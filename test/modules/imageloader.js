/* global QUnit, $, testLog */

(function() {
    let viewer;
    const baseOptions = {
            id:            'example',
            prefixUrl:     '/build/openseadragon/images/',
            springStiffness: 100 // Faster animation = faster tests
        };

    QUnit.module('ImageLoader', {
        beforeEach: function () {
            $('<div id="example"></div>').appendTo("#qunit-fixture");

            testLog.reset();
        },
        afterEach: function () {
            if (viewer){
                viewer.destroy();
            }

            viewer = null;
        }
    });

    // ----------

    QUnit.test('Default timeout', function(assert) {
        const expected = OpenSeadragon.DEFAULT_SETTINGS.timeout;
        const options = OpenSeadragon.extend(true, baseOptions, {
                imageLoaderLimit: 1
            });
        const viewer = OpenSeadragon(options);
        const imageLoader = viewer.imageLoader;

        let message = 'ImageLoader timeout should be set to the default value of ' + expected + ' when none is specified';
        let actual = imageLoader.timeout;
        assert.equal(actual, expected, message);

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
        assert.equal(actual, expected, message);
    });

    // ----------

    QUnit.test('Configure timeout', function(assert) {
        const expected = 123456;
        const options = OpenSeadragon.extend(true, baseOptions, {
                imageLoaderLimit: 1,
                timeout: expected
            });
            viewer = OpenSeadragon(options),
            imageLoader = viewer.imageLoader;

        let message = 'ImageLoader timeout should be configurable';
        let actual = imageLoader.timeout;
        assert.equal(actual, expected, message);

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
        assert.equal(actual, expected, message);
    });

})();
