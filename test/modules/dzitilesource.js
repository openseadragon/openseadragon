/* global QUnit, testLog */

(function() {

    QUnit.module('DziTileSource', {
        beforeEach: function() {
            testLog.reset();
        }
    });

    function testImplicitTilesUrl(assert, dziUrl, expected, msg) {
        var source = new OpenSeadragon.DziTileSource();
        var options = source.configure({
            Image: {Size: {Width:0, Height: 0}}
        }, dziUrl);
        assert.equal(options.tilesUrl, expected, msg);
    }

    QUnit.test('test implicit tilesUrl guessed from dzi url', function(assert) {
        testImplicitTilesUrl(
            assert,
            '/path/my.dzi', '/path/my_files/',
            'dzi extension should be stripped');
        testImplicitTilesUrl(
            assert,
            '/path/my', '/path/my_files/',
            'no extension should still produce _files path');
        testImplicitTilesUrl(
            assert,
            '/my/', '/my_files/',
            'no extension with trailing slash should preserve slash');
        testImplicitTilesUrl(
            assert,
            'my.xml', 'my_files/',
            'relative link should stay the same');
        testImplicitTilesUrl(
            assert,
            '/p/foo.dzi?a=1&b=2', '/p/foo_files/',
            'querystring in dzi url should be ignored after slashes');
        testImplicitTilesUrl(
            assert,
                '/iiipsrv?DeepZoom=/path/my.dzi', '/iiipsrv?DeepZoom=/path/my_files/',
                'querystring in dzi url should not be ignored before slashes');
        testImplicitTilesUrl(
            assert,
                '/fcg-bin/iipsrv.fcgi?Deepzoom=123test.tif.dzi', '/fcg-bin/iipsrv.fcgi?Deepzoom=123test.tif_files/',
                'filename in querystring does not have to contain slash');
    });

}());
