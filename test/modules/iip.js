(function() {

    var test = new OpenSeadragon.IIPTileSource();

    // Set options
    test.iipsrv = "http://localhost/fcgi-bin/iipsrv.fcgi";
    test.image = "test.tif";


    QUnit.module('IIP');


    QUnit.test('IIPTileSource metadata URL', function(assert) {

	var url = test.iipsrv + '?FIF=' + test.image + '&obj=IIP,1.0&obj=Max-size&obj=Tile-size&obj=Resolution-number&obj=Resolutions';
	assert.equal( test.getMetadataUrl(), url, "Info URL" );

    });


    QUnit.test('IIPTileSource metadata parsing', function(assert) {

	// Parse metadata
	var metadata = `Max-size:8272 1712\r\nTile-size:256 256\r\nResolution-number:7\r\nResolutions:129 26,258 53,517 107,1034 214,2068 428,4136 856,8272 1712\r\n`;
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

})();
