/* global QUnit, OpenSeadragon */

(function() {

    QUnit.module('WebGL2Drawer');

    QUnit.test('WebGL2Drawer.isSupported()', function(assert) {
        // isSupported should return true only if WebGL2 is available
        // (no internal fallback to WebGL - that's handled by drawer chain)
        const supported = OpenSeadragon.WebGL2Drawer.isSupported();
        assert.ok(typeof supported === 'boolean', 'isSupported should return a boolean');

        const webgl2Available = OpenSeadragon.WebGL2Drawer.isWebGL2Supported();
        assert.strictEqual(supported, webgl2Available,
            'isSupported should equal isWebGL2Supported (no internal fallback)');
    });

    QUnit.test('WebGL2Drawer.isWebGL2Supported()', function(assert) {
        const webgl2Supported = OpenSeadragon.WebGL2Drawer.isWebGL2Supported();
        assert.ok(typeof webgl2Supported === 'boolean', 'isWebGL2Supported should return a boolean');
    });

    QUnit.test('WebGL2Drawer.getType()', function(assert) {
        assert.equal(OpenSeadragon.WebGL2Drawer.getType(), 'webgl2', 'getType should return "webgl2"');
    });

    QUnit.test('WebGL2Drawer with WebGL2 support', function(assert) {
        const done = assert.async();

        // Skip this test if WebGL2 is not supported
        if (!OpenSeadragon.WebGL2Drawer.isWebGL2Supported()) {
            assert.ok(true, 'Skipping WebGL2Drawer test - WebGL2 not supported');
            done();
            return;
        }

        const viewer = OpenSeadragon({
            id: 'qunit-fixture',
            prefixUrl: '/build/openseadragon/images/',
            drawer: 'webgl2',
            tileSources: '/test/data/testpattern.dzi'
        });

        viewer.addHandler('open', function() {
            // Check that a drawer was created
            assert.ok(viewer.drawer, 'Drawer should be created');

            // When WebGL2 is supported and requested, it should be used
            const drawerType = viewer.drawer.getType();
            assert.equal(drawerType, 'webgl2', 'Drawer should be webgl2 when WebGL2 is supported');

            viewer.destroy();
            done();
        });

        viewer.addHandler('open-failed', function() {
            assert.ok(false, 'Viewer should not fail to open');
            viewer.destroy();
            done();
        });
    });

    QUnit.test('WebGL2Drawer in drawer fallback chain', function(assert) {
        const done = assert.async();

        // Test that webgl2 works in the fallback chain
        // The viewer should pick the first supported drawer
        const viewer = OpenSeadragon({
            id: 'qunit-fixture',
            prefixUrl: '/build/openseadragon/images/',
            drawer: ['webgl2', 'webgl', 'canvas', 'html'],
            tileSources: '/test/data/testpattern.dzi'
        });

        viewer.addHandler('open', function() {
            assert.ok(viewer.drawer, 'A drawer should be selected from the fallback chain');

            const drawerType = viewer.drawer.getType();
            const webgl2Supported = OpenSeadragon.WebGL2Drawer.isWebGL2Supported();

            if (webgl2Supported) {
                assert.equal(drawerType, 'webgl2',
                    'Should use webgl2 when it is supported and first in chain');
            } else {
                assert.ok(['webgl', 'canvas', 'html'].includes(drawerType),
                    'Should fall back to next drawer when webgl2 not supported, got: ' + drawerType);
            }

            viewer.destroy();
            done();
        });

        viewer.addHandler('open-failed', function() {
            assert.ok(false, 'Viewer should not fail to open with fallback chain');
            viewer.destroy();
            done();
        });
    });

    QUnit.test('WebGL2Drawer debug info', function(assert) {
        // Skip if WebGL2 is not supported
        if (!OpenSeadragon.WebGL2Drawer.isWebGL2Supported()) {
            assert.ok(true, 'Skipping debug info test - WebGL2 not supported');
            return;
        }

        const done = assert.async();

        const viewer = OpenSeadragon({
            id: 'qunit-fixture',
            prefixUrl: '/build/openseadragon/images/',
            drawer: 'webgl2',
            tileSources: '/test/data/testpattern.dzi'
        });

        viewer.addHandler('open', function() {
            if (viewer.drawer.getType() === 'webgl2' && viewer.drawer.getDebugInfo) {
                const debugInfo = viewer.drawer.getDebugInfo();
                assert.ok(debugInfo, 'getDebugInfo should return an object');
                assert.equal(debugInfo.drawerType, 'WebGL2Drawer', 'drawerType should be WebGL2Drawer');
                assert.ok('webgl2Features' in debugInfo, 'Should include webgl2Features');
            } else {
                assert.ok(true, 'Drawer does not support getDebugInfo or is not webgl2');
            }

            viewer.destroy();
            done();
        });
    });

})();