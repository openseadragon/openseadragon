
(function() {

    const tileSource = new OpenSeadragon.IIPTileSource();

    // Configure mock IIP server and image
    tileSource.iipsrv = "http://localhost/fcgi-bin/iipsrv.fcgi";
    tileSource.image = "test.tif";

    QUnit.module('IIP');

    QUnit.test('IIPTileSource metadata URL', function(assert) {
        const expectedUrl =
            tileSource.iipsrv +
            '?FIF=' + tileSource.image +
            '&obj=IIP,1.0&obj=Max-size';

        assert.equal(
            tileSource.getMetadataUrl(),
            expectedUrl,
            "should return the correct metadata URL"
        );
    });

})();
