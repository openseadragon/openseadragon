/* global QUnit, testLog */

(function () {
    QUnit.module('ImageTileSource');

    QUnit.test('supports', function(assert) {
        assert.ok(
            OpenSeadragon.ImageTileSource.prototype.supports({ type: 'image' }),
            'should return true for type image'
        );
        assert.notOk(
            OpenSeadragon.ImageTileSource.prototype.supports({ type: 'dzi' }),
            'should return false for non-image type'
        );
        assert.notOk(
            OpenSeadragon.ImageTileSource.prototype.supports({}),
            'should return false for empty object'
        );
    });

    QUnit.test('configure', function(assert) {
        var options = { url: 'test.jpg', buildPyramid: false };
        var result = OpenSeadragon.ImageTileSource.prototype.configure(options, 'http://test', null);
        assert.equal(result, options, 'should return the options object');
    });

    QUnit.test('equals', function(assert) {
        var source1 = new OpenSeadragon.ImageTileSource({ url: 'test.jpg' });
        var source2 = new OpenSeadragon.ImageTileSource({ url: 'test.jpg' });
        var source3 = new OpenSeadragon.ImageTileSource({ url: 'other.jpg' });

        assert.ok(source1.equals(source2), 'same url should be equal');
        assert.notOk(source1.equals(source3), 'different url should not be equal');
    });

    QUnit.test('getTilePostData', function(assert) {
        var source = new OpenSeadragon.ImageTileSource({ url: 'test.jpg' });
        var postData = source.getTilePostData(2, 3, 4);
        assert.equal(postData.level, 2, 'level should be set');
        assert.equal(postData.x, 3, 'x should be set');
        assert.equal(postData.y, 4, 'y should be set');
    });

    QUnit.test('getContext2D deprecated', function(assert) {
        testLog.reset();
        var source = new OpenSeadragon.ImageTileSource({ url: 'test.jpg' });

        // Stub _createContext2D to prevent canvas.drawImage error
        source._createContext2D = function() {
            return null;
        };

        source.getContext2D(0, 0, 0);

        assert.ok(
            testLog.error.contains('deprecated'),
            'should log deprecation warning'
        );
    });

    QUnit.test('downloadTileAbort', function(assert) {
        var source = new OpenSeadragon.ImageTileSource({ url: 'test.jpg' });
        source.downloadTileAbort({});
        assert.ok(true, 'downloadTileAbort should not throw');
    });

    QUnit.test('getTileUrl for non-max level', function(assert) {
        var source = new OpenSeadragon.ImageTileSource({
            url: '/test/data/A.png',
            buildPyramid: false
        });

        source.maxLevel = 1; // Set a fake max level

        var url = source.getTileUrl(0, 0, 0);
        // Non-max levels get query params appended even with buildPyramid: false
        assert.ok(
            url.indexOf('/test/data/A.png') === 0,
            'non-max level URL starts with original url'
        );
        assert.ok(
            url.indexOf('?l=0') !== -1,
            'non-max level URL includes level parameter'
        );
    });

    QUnit.test('getTileUrl for max level returns original url', function(assert) {
        var source = new OpenSeadragon.ImageTileSource({
            url: '/test/data/A.png',
            buildPyramid: false
        });

        source.maxLevel = 0;

        var url = source.getTileUrl(source.maxLevel, 0, 0);
        assert.equal(url, '/test/data/A.png', 'max level should return original url');
    });

})();
