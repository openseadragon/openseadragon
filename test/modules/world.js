/* global module, asyncTest, $, ok, equal, notEqual, start, test, Util, testLog */

(function() {
    var viewer;

    module('World', {
        setup: function () {
            var example = $('<div id="example"></div>').appendTo("#qunit-fixture");

            testLog.reset();

            viewer = OpenSeadragon({
                id:            'example',
                prefixUrl:     '/build/openseadragon/images/',
                springStiffness: 100 // Faster animation = faster tests
            });
        },
        teardown: function () {
            if (viewer && viewer.close) {
                viewer.close();
            }

            viewer = null;
        }
    });

    // ----------
    var checkBounds = function(expected, message) {
        var bounds = viewer.world.getHomeBounds();
        ok(bounds.equals(expected), message + ' ' + bounds.toString());
    };

    // ----------
    asyncTest('adding a tiled image', function() {
        ok(viewer.world, 'World exists');

        viewer.world.addHandler('add-item', function(event) {
            ok(event, 'add-item handler received event data');
            equal(event.eventSource, viewer.world, 'sender of add-item event was world');
            ok(event.item, 'add-item event includes item');
            equal(viewer.world.getItemCount(), 1, 'there is now 1 item');
            equal(event.item, viewer.world.getItemAt(0), 'item is accessible via getItemAt');
            equal(viewer.world.getIndexOfItem(event.item), 0, 'item index is 0');
            start();
        });

        equal(viewer.world.getItemCount(), 0, 'no items to start with');

        viewer.open('/test/data/testpattern.dzi');
    });

    // ----------
    asyncTest('metrics', function() {
        viewer.addHandler('open', function(event) {
            checkBounds(new OpenSeadragon.Rect(0, 0, 4, 4), 'bounds after open');

            var expectedContentFactor = viewer.world.getItemAt(1).getContentSize().x / 2;
            equal(viewer.world.getContentFactor(), expectedContentFactor, 'content factor has changed');

            viewer.world.addHandler('metrics-change', function metricsChangeHandler(event) {
                viewer.world.removeHandler('metrics-change', metricsChangeHandler);
                ok(event, 'metrics-change handler received event data');
                equal(event.eventSource, viewer.world, 'sender of metrics-change event was world');
                checkBounds(new OpenSeadragon.Rect(0, 0, 7, 12), 'bounds after position');
                viewer.world.getItemAt(0).setWidth(20);
                checkBounds(new OpenSeadragon.Rect(0, 0, 20, 20), 'bounds after size');

                start();
            });

            viewer.world.getItemAt(1).setPosition(new OpenSeadragon.Point(5, 10));
        });

        checkBounds(new OpenSeadragon.Rect(0, 0, 1, 1), 'default bounds');
        equal(viewer.world.getContentFactor(), 1, 'default content factor');

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
    asyncTest('remove/reorder tiled images', function() {
        var handlerCount = 0;

        viewer.addHandler('open', function(event) {
            equal(viewer.world.getItemCount(), 3, 'there are now 3 items');
            var item0 = viewer.world.getItemAt(0);
            var item1 = viewer.world.getItemAt(1);

            viewer.world.addHandler('item-index-change', function(event) {
                handlerCount++;
                ok(event, 'item-index-change handler received event data');
                equal(event.eventSource, viewer.world, 'sender of item-index-change event was world');
                equal(event.item, item0, 'item-index-change event includes correct item');
                equal(event.newIndex, 1, 'item-index-change event includes correct newIndex');
                equal(event.previousIndex, 0, 'item-index-change event includes correct previousIndex');
                equal(viewer.world.getItemAt(0), item1, 'item1 is now at index 0');
                equal(viewer.world.getItemAt(1), item0, 'item0 is now at index 1');
            });

            viewer.world.setItemIndex(item0, 1);

            viewer.world.addHandler('remove-item', function removeHandler(event) {
                viewer.world.removeHandler('remove-item', removeHandler);
                handlerCount++;
                ok(event, 'remove-item handler received event data');
                equal(event.eventSource, viewer.world, 'sender of remove-item event was world');
                equal(event.item, item1, 'remove-item event includes correct item');
                equal(viewer.world.getItemCount(), 2, 'after removal, only two items remain');
                equal(viewer.world.getItemAt(0), item0, 'item0 is now at index 0');
            });

            viewer.world.removeItem(item1);

            var removeCount = 0;
            viewer.world.addHandler('remove-item', function() {
                removeCount++;
                if (removeCount === 2) {
                    handlerCount++;
                    equal(viewer.world.getItemCount(), 0, 'after removeAll, no items remain');
                }
            });

            viewer.world.removeAll();

            equal(handlerCount, 3, 'correct number of handlers called');
            start();
        });

        equal(viewer.world.getItemCount(), 0, 'no items to start with');

        viewer.open([
            '/test/data/testpattern.dzi',
            '/test/data/testpattern.dzi',
            '/test/data/testpattern.dzi'
        ]);
    });

    // ----------
    asyncTest('update', function() {
        var handlerCount = 0;

        viewer.addHandler('open', function(event) {
            equal(viewer.world.needsUpdate(), true, 'needs update after open');

            viewer.addHandler('update-level', function updateHandler() {
                viewer.removeHandler('update-level', updateHandler);
                handlerCount++;
            });

            viewer.world.update();

            equal(handlerCount, 1, 'correct number of handlers called');
            start();
        });

        equal(viewer.world.needsUpdate(), false, 'needs no update at first');

        viewer.open('/test/data/testpattern.dzi');
    });

    // ----------
    asyncTest('resetItems', function() {
        viewer.addHandler('tile-drawn', function updateHandler() {
            viewer.removeHandler('tile-drawn', updateHandler);
            ok(viewer.tileCache.numTilesLoaded() > 0, 'we have tiles after tile-drawn');
            viewer.world.resetItems();
            equal(viewer.tileCache.numTilesLoaded(), 0, 'no tiles after reset');
            start();
        });

        equal(viewer.tileCache.numTilesLoaded(), 0, 'no tiles at start');

        viewer.open('/test/data/testpattern.dzi');
    });

    // ----------
    asyncTest('arrange', function() {
        viewer.addHandler('open', function(event) {
            checkBounds(new OpenSeadragon.Rect(0, 0, 1, 1), 'all stacked');

            viewer.world.arrange({
                layout: 'horizontal',
                rows: 1,
                tileSize: 1,
                tileMargin: 0.5
            });

            checkBounds(new OpenSeadragon.Rect(0, 0, 4, 1), 'one horizontal row');

            viewer.world.arrange({
                layout: 'horizontal',
                rows: 2,
                tileSize: 1,
                tileMargin: 0.5
            });

            checkBounds(new OpenSeadragon.Rect(0, 0, 2.5, 2.5), 'grid');

            viewer.world.arrange({
                layout: 'vertical',
                rows: 1,
                tileSize: 1,
                tileMargin: 0.5
            });

            checkBounds(new OpenSeadragon.Rect(0, 0, 1, 4), 'one vertical column');

            start();
        });

        viewer.open([
            '/test/data/testpattern.dzi',
            '/test/data/testpattern.dzi',
            '/test/data/testpattern.dzi'
        ]);
    });

})();
