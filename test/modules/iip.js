(function() {

    const test = new OpenSeadragon.IIPTileSource();

    // Set options
    test.iipsrv = "http://localhost/fcgi-bin/iipsrv.fcgi";
    test.image = "test.tif";


    QUnit.module('IIP');


    QUnit.test('IIPTileSource metadata URL', function(assert) {

	const url = test.iipsrv + '?FIF=' + test.image + '&obj=IIP,1.0&obj=Max-size&obj=Tile-size&obj=Resolution-number&obj=Resolutions';
	assert.equal( test.getMetadataUrl(), url, "Info URL" );

    });


    QUnit.test('IIPTileSource metadata parsing', function(assert) {

	// Parse metadata
	const metadata = `Max-size:8272 1712\r\nTile-size:256 256\r\nResolution-number:7\r\nResolutions:129 26,258 53,517 107,1034 214,2068 428,4136 856,8272 1712\r\n`;
	test.parseIIP( metadata );

	// Check dimensions
	assert.ok( test.width, "Width exists" );
	assert.equal( test.width, 8272, "Parsing width");
	assert.equal( test.height, 1712, "Parsing height");

	// Check tile size
	assert.ok( test._tileWidth, "Tile width provided" );
	assert.equal( test._tileWidth, 256, "Parsing tile width" );

	// Check resolution levels
	assert.ok( test.levelSizes, "Resolution levels exist" );
	assert.equal( typeof test.levelSizes, "object", "Resolution sizes array" );
	assert.equal( test.levelSizes.length, 7, "Number of resolution sizes" );
	assert.equal( test.maxLevel, test.levelSizes.length-1, "Max levels equals number of resolution sizes" );

    });


    QUnit.test('IIPTileSource tile URLs', function(assert) {

	// Basic tile URLs
	assert.equal( test.getTileUrl(0,0,0), `http://localhost/fcgi-bin/iipsrv.fcgi?FIF=test.tif&JTL=0,0` );
	assert.equal( test.getTileUrl(1,1,0), `http://localhost/fcgi-bin/iipsrv.fcgi?FIF=test.tif&JTL=1,1` );
	assert.equal( test.getTileUrl(4,1,1), `http://localhost/fcgi-bin/iipsrv.fcgi?FIF=test.tif&JTL=4,10` );

	// Test format change
	test.format = "webp";
	assert.equal( test.getTileUrl(0,0,0), `http://localhost/fcgi-bin/iipsrv.fcgi?FIF=test.tif&WTL=0,0` );

	// Test example transforms
	test.transform = { invert: true };
	assert.equal( test.getTileUrl(0,0,0), `http://localhost/fcgi-bin/iipsrv.fcgi?FIF=test.tif&INV&WTL=0,0` );

	test.transform = { contrast: 1.5 };
	assert.equal( test.getTileUrl(0,0,0), `http://localhost/fcgi-bin/iipsrv.fcgi?FIF=test.tif&CNT=1.5&WTL=0,0` );

    });

    QUnit.test('IIPTileSource supports', function(assert) {
    assert.ok(
        OpenSeadragon.IIPTileSource.prototype.supports({
            iipsrv: "http://localhost/fcgi-bin/iipsrv.fcgi",
            image: "test.tif"
        }),
        'should return true for valid IIP data'
    );

    assert.notOk(
        OpenSeadragon.IIPTileSource.prototype.supports({
            type: "dzi"
        }),
        'should return false for non-IIP data'
    );

    assert.notOk(
        OpenSeadragon.IIPTileSource.prototype.supports(null),
        'should return false for null'
    );

    assert.notOk(
        OpenSeadragon.IIPTileSource.prototype.supports({}),
        'should return false for empty object'
    );

    assert.notOk(
        OpenSeadragon.IIPTileSource.prototype.supports({ iipsrv: "http://test" }),
        'should return false without image'
    );

    assert.notOk(
        OpenSeadragon.IIPTileSource.prototype.supports({ image: "test.tif" }),
        'should return false without iipsrv'
    );
});

    QUnit.test('IIPTileSource parseIIP errors', function(assert) {
        // No Max-size
        assert.throws(function() {
            test.parseIIP("Tile-size:256 256\r\nResolution-number:1\r\nResolutions:256 256\r\n");
        }, /No Max-size returned/, 'should throw when no Max-size');

        // No Tile-size
        assert.throws(function() {
            test.parseIIP("Max-size:256 256\r\nResolution-number:1\r\nResolutions:256 256\r\n");
        }, /No Tile-size returned/, 'should throw when no Tile-size');
    });

    QUnit.test('IIPTileSource configure', function(assert) {
        var options = { iipsrv: "http://test", image: "test.tif" };
        var result = OpenSeadragon.IIPTileSource.prototype.configure(options, "http://url", null);
        assert.equal(result, options, 'should return the options object');
    });

    QUnit.test('IIPTileSource getNumTiles', function(assert) {
        // Re-parse metadata to ensure levelSizes is set
        const metadata = `Max-size:8272 1712\r\nTile-size:256 256\r\nResolution-number:7\r\nResolutions:129 26,258 53,517 107,1034 214,2068 428,4136 856,8272 1712\r\n`;
        test.parseIIP(metadata);

        // Level 0: 129x26 image, 256x256 tiles = 1x1 tiles
        var tiles0 = test.getNumTiles(0);
        assert.equal(tiles0.x, 1, 'level 0 x tiles');
        assert.equal(tiles0.y, 1, 'level 0 y tiles');

        // Level 6 (max): 8272x1712 image, 256x256 tiles = 33x7 tiles
        var tiles6 = test.getNumTiles(6);
        assert.equal(tiles6.x, 33, 'level 6 x tiles');
        assert.equal(tiles6.y, 7, 'level 6 y tiles');
    });

    QUnit.test('IIPTileSource getTileUrl with all transforms', function(assert) {
        test.format = "jpg";
        test.transform = {
            stack: "0,1,2",
            contrast: 1.5,
            gamma: 0.8,
            invert: true,
            color: "1,2,3",
            twist: 45,
            convolution: "sharpen",
            quality: 90,
            colormap: "hot",
            minmax: "0,255",
            hillshade: "azimuth=315,elevation=45"
        };

        var url = test.getTileUrl(0, 0, 0);

        assert.ok(url.includes('SDS=0,1,2'), 'includes stack transform');
        assert.ok(url.includes('CNT=1.5'), 'includes contrast transform');
        assert.ok(url.includes('GAM=0.8'), 'includes gamma transform');
        assert.ok(url.includes('INV'), 'includes invert transform');
        assert.ok(url.includes('COL=1,2,3'), 'includes color transform');
        assert.ok(url.includes('CTW=45'), 'includes twist transform');
        assert.ok(url.includes('CNV=sharpen'), 'includes convolution transform');
        assert.ok(url.includes('QLT=90'), 'includes quality transform');
        assert.ok(url.includes('CMP=hot'), 'includes colormap transform');
        assert.ok(url.includes('MINMAX=0,255'), 'includes minmax transform');
        assert.ok(url.includes('SHD=azimuth=315,elevation=45'), 'includes hillshade transform');
        assert.ok(url.includes('JTL=0,0'), 'includes tile coordinates');

        // Reset
        test.transform = null;
    });

    QUnit.test('IIPTileSource getTileUrl with png format', function(assert) {
        test.format = "png";
        test.transform = null;
        var url = test.getTileUrl(0, 0, 0);
        assert.ok(url.includes('PTL=0,0'), 'png format should use PTL');
    });

    QUnit.test('IIPTileSource getTileUrl with avif format', function(assert) {
        test.format = "avif";
        test.transform = null;
        var url = test.getTileUrl(0, 0, 0);
        assert.ok(url.includes('ATL=0,0'), 'avif format should use ATL');
    });

})();
