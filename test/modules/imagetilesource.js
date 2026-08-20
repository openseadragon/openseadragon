/* global QUnit, $, testLog */

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
        var source = new OpenSeadragon.ImageTileSource({ url: 'test.jpg' });
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
        var done = assert.async();
        var source = new OpenSeadragon.ImageTileSource({
            url: 'http://example.com/test.jpg',
            buildPyramid: false
        });

        source.addHandler('ready', function() {
            var url = source.getTileUrl(0, 0, 0);
            assert.ok(url.includes('l=0'), 'url should include level');
            assert.ok(url.includes('x=0'), 'url should include x');
            assert.ok(url.includes('y=0'), 'url should include y');
            done();
        });

        source.getImageInfo('/test/data/testpattern.dzi');
    });

    QUnit.test('getTileUrl for max level returns original url', function(assert) {
        var done = assert.async();
        var source = new OpenSeadragon.ImageTileSource({
            url: 'http://example.com/test.jpg',
            buildPyramid: false
        });

        source.addHandler('ready', function() {
            var url = source.getTileUrl(source.maxLevel, 0, 0);
            assert.equal(url, 'http://example.com/test.jpg', 'max level should return original url');
            done();
        });

        source.getImageInfo('/test/data/testpattern.dzi');
    });

})();