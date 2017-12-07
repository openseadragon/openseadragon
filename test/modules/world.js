/* global QUnit, $, testLog */

(function() {
    var viewer;

    QUnit.module('World', {
        beforeEach: function () {
            $('<div id="example"></div>').appendTo("#qunit-fixture");

            testLog.reset();

            viewer = OpenSeadragon({
                id:            'example',
                prefixUrl:     '/build/openseadragon/images/',
                springStiffness: 100 // Faster animation = faster tests
            });
        },
        afterEach: function () {
            if (viewer && viewer.close) {
                viewer.close();
            }

            viewer = null;
        }
    });

    // ----------
    var checkBounds = function(assert, expected, message) {
        var bounds = viewer.world.getHomeBounds();
        assert.ok(bounds.equals(expected), message + ' ' + bounds.toString());
    };

    // ----------
    QUnit.test('adding a tiled image', function(assert) {
    var done = assert.async();
        assert.ok(viewer.world, 'World exists');

        viewer.world.addHandler('add-item', function(event) {
            assert.ok(event, 'add-item handler received event data');
            assert.equal(event.eventSource, viewer.world, 'sender of add-item event was world');
            assert.ok(event.item, 'add-item event includes item');
            assert.equal(viewer.world.getItemCount(), 1, 'there is now 1 item');
            assert.equal(event.item, viewer.world.getItemAt(0), 'item is accessible via getItemAt');
            assert.equal(viewer.world.getIndexOfItem(event.item), 0, 'item index is 0');
            done();
        });

        assert.equal(viewer.world.getItemCount(), 0, 'no items to start with');

        viewer.open('/test/data/testpattern.dzi');
    });

    // ----------
    QUnit.test('metrics', function(assert) {
        var done = assert.async();
        viewer.addHandler('open', function(event) {
            checkBounds(assert, new OpenSeadragon.Rect(0, 0, 4, 4), 'bounds after open');

            var expectedContentFactor = viewer.world.getItemAt(1).getContentSize().x / 2;
            assert.equal(viewer.world.getContentFactor(), expectedContentFactor, 'content factor has changed');

            viewer.world.addHandler('metrics-change', function metricsChangeHandler(event) {
                viewer.world.removeHandler('metrics-change', metricsChangeHandler);
                assert.ok(event, 'metrics-change handler received event data');
                assert.equal(event.eventSource, viewer.world, 'sender of metrics-change event was world');
                checkBounds(assert, new OpenSeadragon.Rect(0, 0, 7, 12), 'bounds after position');
                viewer.world.getItemAt(0).setWidth(20);
                checkBounds(assert, new OpenSeadragon.Rect(0, 0, 20, 20), 'bounds after size');

                done();
            });

            viewer.world.getItemAt(1).setPosition(new OpenSeadragon.Point(5, 10));
        });

        checkBounds(assert, new OpenSeadragon.Rect(0, 0, 1, 1), 'default bounds');
        assert.equal(viewer.world.getContentFactor(), 1, 'default content factor');

        viewer.open([
            {
                tileSource: '/test/data/testpattern.dzi',
                width: 4
            }, {
                tileSource: '/test/data/testpattern.dzi',
                width: 2
            }
        ]);
    });

    // ----------
    QUnit.test('remove/reorder tiled images', function(assert) {
        var done = assert.async();
        var handlerCount = 0;

        viewer.addHandler('open', function(event) {
            assert.equal(viewer.world.getItemCount(), 3, 'there are now 3 items');
            var item0 = viewer.world.getItemAt(0);
            var item1 = viewer.world.getItemAt(1);

            viewer.world.addHandler('item-index-change', function(event) {
                handlerCount++;
                assert.ok(event, 'item-index-change handler received event data');
                assert.equal(event.eventSource, viewer.world, 'sender of item-index-change event was world');
                assert.equal(event.item, item0, 'item-index-change event includes correct item');
                assert.equal(event.newIndex, 1, 'item-index-change event includes correct newIndex');
                assert.equal(event.previousIndex, 0, 'item-index-change event includes correct previousIndex');
                assert.equal(viewer.world.getItemAt(0), item1, 'item1 is now at index 0');
                assert.equal(viewer.world.getItemAt(1), item0, 'item0 is now at index 1');
            });

            viewer.world.setItemIndex(item0, 1);

            viewer.world.addHandler('remove-item', function removeHandler(event) {
                viewer.world.removeHandler('remove-item', removeHandler);
                handlerCount++;
                assert.ok(event, 'remove-item handler received event data');
                assert.equal(event.eventSource, viewer.world, 'sender of remove-item event was world');
                assert.equal(event.item, item1, 'remove-item event includes correct item');
                assert.equal(viewer.world.getItemCount(), 2, 'after removal, only two items remain');
                assert.equal(viewer.world.getItemAt(0), item0, 'item0 is now at index 0');
            });

            viewer.world.removeItem(item1);

            var removeCount = 0;
            viewer.world.addHandler('remove-item', function() {
                removeCount++;
                if (removeCount === 2) {
                    handlerCount++;
                    assert.equal(viewer.world.getItemCount(), 0, 'after removeAll, no items remain');
                }
            });

            viewer.world.removeAll();

            assert.equal(handlerCount, 3, 'correct number of handlers called');
            done();
        });

        assert.equal(viewer.world.getItemCount(), 0, 'no items to start with');

        viewer.open([
            '/test/data/testpattern.dzi',
            '/test/data/testpattern.dzi',
            '/test/data/testpattern.dzi'
        ]);
    });

    // ----------
    QUnit.test('draw', function(assert) {
        var done = assert.async();
        var handlerCount = 0;

        viewer.addHandler('open', function(event) {
            assert.equal(viewer.world.needsDraw(), true, 'needs draw after open');

            viewer.addHandler('update-level', function updateHandler() {
                viewer.removeHandler('update-level', updateHandler);
                handlerCount++;
            });

            viewer.world.draw();

            assert.equal(handlerCount, 1, 'correct number of handlers called');
            done();
        });

        assert.equal(viewer.world.needsDraw(), false, 'needs no draw at first');

        viewer.open('/test/data/testpattern.dzi');
    });

    // ----------
    QUnit.test('resetItems', function(assert) {
        var done = assert.async();
        viewer.addHandler('tile-drawn', function updateHandler() {
            viewer.removeHandler('tile-drawn', updateHandler);
            assert.ok(viewer.tileCache.numTilesLoaded() > 0, 'we have tiles after tile-drawn');
            viewer.world.resetItems();
            assert.equal(viewer.tileCache.numTilesLoaded(), 0, 'no tiles after reset');
            done();
        });

        assert.equal(viewer.tileCache.numTilesLoaded(), 0, 'no tiles at start');

        viewer.open('/test/data/testpattern.dzi');
    });

    // ----------
    QUnit.test('arrange', function(assert) {
        var done = assert.async();
        viewer.addHandler('open', function(event) {
            checkBounds(assert, new OpenSeadragon.Rect(0, 0, 1, 1), 'all stacked');

            viewer.world.arrange({
                layout: 'horizontal',
                rows: 1,
                tileSize: 1,
                tileMargin: 0.5
            });

            checkBounds(assert, new OpenSeadragon.Rect(0, 0, 4, 1), 'one horizontal row');

            viewer.world.arrange({
                layout: 'horizontal',
                rows: 2,
                tileSize: 1,
                tileMargin: 0.5
            });

            checkBounds(assert, new OpenSeadragon.Rect(0, 0, 2.5, 2.5), 'grid');

            viewer.world.arrange({
                layout: 'vertical',
                rows: 1,
                tileSize: 1,
                tileMargin: 0.5
            });

            checkBounds(assert, new OpenSeadragon.Rect(0, 0, 1, 4), 'one vertical column');

            viewer.world.arrange({
                layout: 'horizontal',
                rows: false,
                columns: 3,
                tileSize: 1,
                tileMargin: 0.5
            });

            checkBounds(assert, new OpenSeadragon.Rect(0, 0, 4, 1), 'three horizontal columns (one horizontal row)');

            viewer.world.arrange({
                layout: 'vertical',
                rows: false,
                columns: 3,
                tileSize: 1,
                tileMargin: 0.5
            });

            checkBounds(assert, new OpenSeadragon.Rect(0, 0, 1, 4), 'three vertical rows (one vertical column)');

            done();
        });

        viewer.open([
            '/test/data/testpattern.dzi',
            '/test/data/testpattern.dzi',
            '/test/data/testpattern.dzi'
        ]);
    });

})();
