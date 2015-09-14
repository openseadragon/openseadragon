/* global module, ok, equal, start, test, testLog, Util */
(function() {
    
    module('TileSource', {
        setup: function() {
            testLog.reset();
        }
    });
    
    
    test("should set sane tile size defaults", function() {
        var source = new OpenSeadragon.TileSource();
        
        equal(source.getTileWidth(), 0, "getTileWidth() should return 0 if not provided a size");
        equal(source.getTileHeight(), 0, "getTileHeight() should return 0 if not provided a size");
    });
    
    test("providing tileSize", function(){
        var tileSize = 256,
            source = new OpenSeadragon.TileSource({
                tileSize: tileSize
            });
        
        equal(source.tileSize, undefined, "tileSize should not be set on the tileSource");
        equal(source.getTileWidth(), tileSize, "getTileWidth() should equal tileSize");
        equal(source.getTileHeight(), tileSize, "getTileHeight() should equal tileSize");
    });
    
    
    test("providing tileWidth and tileHeight", function(){
        var tileWidth = 256,
            tileHeight = 512,
            source = new OpenSeadragon.TileSource({
                tileWidth: tileWidth,
                tileHeight: tileHeight
            });
        
        equal(source._tileWidth, tileWidth, "tileWidth option should set _tileWidth");
        equal(source._tileHeight, tileHeight, "tileHeight option should set _tileHeight");
        equal(source.tileWidth, undefined, "tileWidth should be renamed _tileWidth");
        equal(source.tileHeight, undefined, "tileHeight should be renamed _tileHeight");
        equal(source.getTileWidth(), tileWidth, "getTileWidth() should equal tileWidth");
        equal(source.getTileHeight(), tileHeight, "getTileHeight() should equal tileHeight");
    });
    
    test('getTileSize() deprecation', function() {
        var source = new OpenSeadragon.TileSource();
        Util.testDeprecation(source, 'getTileSize');
    });

}());
