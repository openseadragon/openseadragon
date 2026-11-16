/* global QUnit */

(function() {
    'use strict';

    const OSD = OpenSeadragon;

    function makeTile(key = 'tile:4/2_3') {
        return new OSD.Tile(
            4, 2, 3,
            new OSD.Rect(0.25, 0.5, 0.125, 0.25),
            true, 'tile.png', undefined, false, undefined, undefined, null, key
        );
    }

    QUnit.module('Tile', {});

    QUnit.test('constructor preserves source geometry and initializes drawing state', function(assert) {
        const bounds = new OSD.Rect(0.25, 0.5, 0.125, 0.25);
        const sourceBounds = new OSD.Rect(8, 16, 32, 64);
        const headers = { 'X-Tile': 'yes' };
        const tile = new OSD.Tile(
            4, 2, 3, bounds, false, 'image.png', undefined, true,
            headers, sourceBounds, 'a=1', 'image:4/2_3'
        );

        assert.strictEqual(tile.level, 4, 'level is preserved');
        assert.strictEqual(tile.x, 2, 'column is preserved');
        assert.strictEqual(tile.y, 3, 'row is preserved');
        assert.strictEqual(tile.bounds, bounds, 'source bounds retain their identity');
        assert.notStrictEqual(tile.positionedBounds, bounds, 'positioned bounds are a separate rectangle');
        assert.propEqual(tile.positionedBounds, bounds, 'positioned bounds start with the same geometry');
        bounds.x = 0.75;
        assert.strictEqual(tile.positionedBounds.x, 0.25, 'positioned bounds do not move with source bounds');
        assert.strictEqual(tile.sourceBounds, sourceBounds, 'pixel source bounds are retained');
        assert.strictEqual(tile.exists, false, 'sparse tile existence is preserved');
        assert.strictEqual(tile.loadWithAjax, true, 'AJAX setting is preserved');
        assert.strictEqual(tile.ajaxHeaders, headers, 'AJAX headers are retained');
        assert.strictEqual(tile.postData, 'a=1', 'POST data is retained');
        assert.strictEqual(tile.getUrl(), 'image.png', 'string URL is returned');
        assert.strictEqual(tile.cacheKey, 'image:4/2_3', 'explicit cache key is preserved');
        assert.strictEqual(tile.originalCacheKey, 'image:4/2_3', 'original key initially matches main key');
        assert.strictEqual(tile.loaded, false, 'tile starts unloaded');
        assert.strictEqual(tile.loading, false, 'tile starts idle');
        assert.strictEqual(tile.position, null, 'screen position has not been calculated');
        assert.strictEqual(tile.size, null, 'screen size has not been calculated');
        assert.strictEqual(tile.opacity, null, 'blend opacity is uninitialized');
        assert.strictEqual(tile.beingDrawn, false, 'tile is not being drawn');
        assert.strictEqual(tile.hasTransparency, false, 'transparency is initially unknown');
        assert.strictEqual(tile.getCacheSize(), 0, 'tile starts without caches');
    });

    QUnit.test('URL functions are evaluated on each getUrl call', function(assert) {
        let suffix = 'first';
        let calls = 0;
        const tile = new OSD.Tile(
            1, 0, 0, new OSD.Rect(0, 0, 1, 1), true,
            function() {
                calls++;
                return 'level-' + this.level + '-' + suffix + '.png';
            },
            undefined, false, undefined, undefined, null, 'dynamic'
        );

        assert.strictEqual(calls, 0, 'constructor does not evaluate the URL function');
        assert.strictEqual(tile.getUrl(), 'level-1-first.png', 'first request uses current URL data');
        suffix = 'second';
        assert.strictEqual(tile.getUrl(), 'level-1-second.png', 'later request sees updated URL data');
        assert.strictEqual(calls, 2, 'URL function is evaluated on every request');
    });

    QUnit.test('deprecated missing-key fallback uses the tile-source hash', function(assert) {
        const tile = new OSD.Tile(
            2, 1, 0, new OSD.Rect(0, 0, 0.5, 0.5), true,
            'tile.jpg', undefined, true, { 'X-Test': 'value' },
            undefined, 'a=1', undefined
        );

        assert.strictEqual(tile.cacheKey, 'tile.jpg+{"X-Test":"value"}',
            'URL and headers form the fallback key');
        assert.strictEqual(tile.originalCacheKey, tile.cacheKey,
            'the fallback remains the original key');
    });

    QUnit.test('identity and distinct main keys follow the original data key', function(assert) {
        const first = makeTile('shared');
        const second = makeTile('shared');
        const distinct = makeTile('different');

        assert.strictEqual(first.toString(), '4/2_3', 'string identity uses level and coordinates');
        assert.ok(first.equals(second), 'equal original cache keys identify equal tile data');
        assert.notOk(first.equals(distinct), 'different original data keys are not equal');
        assert.strictEqual(first.buildDistinctMainCacheKey(), 'mod://shared',
            'an unmodified main key receives a distinct modification key');

        first._updateMainCacheKey('processed');
        assert.strictEqual(first.cacheKey, 'processed', 'main key may change');
        assert.strictEqual(first.originalCacheKey, 'shared', 'original data key is stable');
        assert.strictEqual(first.buildDistinctMainCacheKey(), 'processed',
            'an already distinct main key is reused');
        assert.ok(first.equals(second), 'equality is independent of the current main key');
    });

    QUnit.test('cache key changes and renames retain both cache identities', function(assert) {
        const tile = makeTile('original');
        const originalRecord = new OSD.CacheRecord();
        const modifiedRecord = new OSD.CacheRecord();

        tile._caches.original = originalRecord;
        tile._caches.modified = modifiedRecord;

        assert.strictEqual(tile.getCacheSize(), 2, 'both cache records are counted');
        assert.strictEqual(tile.getCache(), originalRecord, 'default lookup uses main key');
        assert.strictEqual(originalRecord._tRef, tile, 'lookup updates the cache tile reference');
        assert.strictEqual(tile.getCache('modified'), modifiedRecord, 'explicit key selects its record');

        tile.cacheKey = 'modified';
        assert.strictEqual(tile.cacheKey, 'modified', 'setting an existing key selects its cache');
        assert.strictEqual(tile.originalCacheKey, 'original', 'main selection does not change original data');

        tile.reflectCacheRenamed('missing', 'ignored');
        assert.strictEqual(tile.getCacheSize(), 2, 'renaming an absent cache changes nothing');

        tile.reflectCacheRenamed('original', 'source-renamed');
        assert.strictEqual(tile.originalCacheKey, 'source-renamed', 'original key follows cache rename');
        assert.strictEqual(tile.cacheKey, 'modified', 'renaming original leaves modified main selected');
        assert.strictEqual(tile.getCache('source-renamed'), originalRecord, 'original record is retained');
        assert.strictEqual(tile.getCache('original'), undefined, 'old cache lookup is removed');

        tile.reflectCacheRenamed('modified', 'main-renamed');
        assert.strictEqual(tile.cacheKey, 'main-renamed', 'main key follows its cache rename');
        assert.strictEqual(tile.getCache('main-renamed'), modifiedRecord, 'modified record is retained');
        assert.strictEqual(tile.getCacheSize(), 2, 'renaming does not add a record');

        tile.cacheKey = 'source-renamed';
        assert.strictEqual(tile.cacheKey, tile.originalCacheKey, 'main can return to original data');
        assert.strictEqual(tile.buildDistinctMainCacheKey(), 'mod://source-renamed',
            'distinct key reflects the renamed original');
        assert.throws(function() {
            tile.originalCacheKey = 'invalid';
        }, 'original cache key cannot be assigned directly');
        assert.strictEqual(tile.originalCacheKey, 'source-renamed', 'failed assignment leaves original unchanged');
    });

    QUnit.test('edge smoothing compensates positive and negative subpixel positions', function(assert) {
        const tile = makeTile();
        const density = OSD.pixelDensityRatio;
        const canvasSize = new OSD.Point(100, 80);
        const sketchSize = new OSD.Point(108, 86);

        tile.position = new OSD.Point(0.25 / density, 0.5 / density);
        let translation = tile.getTranslationForEdgeSmoothing(2, canvasSize, sketchSize);
        assert.ok(Math.abs(translation.x - 3.5) < 1e-9,
            'positive half-pixel x offset is subtracted from four-pixel padding');
        assert.ok(Math.abs(translation.y - 3) < 1e-9,
            'whole-pixel y offset leaves three-pixel padding');

        tile.position = new OSD.Point(-0.25 / density, -0.125 / density);
        translation = tile.getTranslationForEdgeSmoothing(2, canvasSize, sketchSize);
        assert.ok(Math.abs(translation.x - 4.5) < 1e-9,
            'negative half-pixel x offset is compensated');
        assert.ok(Math.abs(translation.y - 3.25) < 1e-9,
            'negative quarter-pixel y offset is compensated');

        tile.position = new OSD.Point(0, 0);
        translation = tile.getTranslationForEdgeSmoothing(
            1, canvasSize, new OSD.Point(100, 80)
        );
        assert.strictEqual(translation.x, 1, 'x padding never falls below one pixel');
        assert.strictEqual(translation.y, 1, 'y padding never falls below one pixel');
    });

    QUnit.test('unload does not interrupt a tile that has not loaded', function(assert) {
        const tile = makeTile();
        tile.loading = true;

        tile.unload(true);
        assert.strictEqual(tile.loaded, false, 'tile is still unloaded');
        assert.strictEqual(tile.loading, true, 'in-progress loading state is unchanged');
        assert.strictEqual(tile.cacheKey, 'tile:4/2_3', 'key stays intact');
    });

    QUnit.test('internal unload clears state and restores the original key', function(assert) {
        const tile = makeTile('source');
        tile.loaded = true;
        tile.loading = true;
        tile._updateMainCacheKey('modified');

        tile._unload();

        assert.strictEqual(tile.loaded, false, 'loaded flag is cleared');
        assert.strictEqual(tile.loading, false, 'loading flag is cleared');
        assert.strictEqual(tile.tiledImage, null, 'owner is detached');
        assert.strictEqual(tile.cacheKey, 'source', 'main key returns to original data');
        assert.strictEqual(tile.originalCacheKey, 'source', 'original data identity is unchanged');
        assert.strictEqual(tile.getCacheSize(), 0, 'no cache entries remain');
    });
})();
