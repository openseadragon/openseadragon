/* global QUnit, $, testLog */

(function () {
    var viewer;

    QUnit.module('Controls', {
        beforeEach: function () {
            $('<div id="controlsTests"></div>')
                .css({
                    width: 1000,
                    height: 1000
                })
                .appendTo("#qunit-fixture");

            testLog.reset();

        },
        afterEach: function () {
            if (viewer){
                viewer.destroy();
            }

            viewer = null;
        }
    });

    QUnit.test('ZoomControlOff', function (assert) {
        var done = assert.async();
        var openHandler = function () {
            viewer.removeHandler('open', openHandler);
            assert.ok(!viewer.showZoomControl, 'showZoomControl should be off');
            assert.ok(!viewer.zoomInButton, "zoomIn button should be null");
            assert.ok(!viewer.zoomOutButton, "zoomOut button should be null");

            viewer.close();
            done();
        };

        viewer = OpenSeadragon({
            id:             'controlsTests',
            prefixUrl:      '/build/openseadragon/images/',
            springStiffness: 100, // Faster animation = faster tests
            showZoomControl: false
        });
        viewer.addHandler('open', openHandler);
        viewer.open('/test/data/testpattern.dzi');
    });

    QUnit.test('ZoomControlOn', function (assert) {
        var done = assert.async();
        var openHandler = function () {
            viewer.removeHandler('open', openHandler);
            assert.ok(viewer.showZoomControl, 'showZoomControl should be on');
            assert.ok(!!viewer.zoomInButton, "zoomIn button should not be null");
            assert.ok(!!viewer.zoomOutButton, "zoomOut button should not be null");
            assert.notEqual(viewer.buttonGroup.buttons.indexOf(viewer.zoomInButton), -1,
                "The zoomIn button should be present");
            assert.notEqual(viewer.buttonGroup.buttons.indexOf(viewer.zoomOutButton), -1,
                "The zoomOut button should be present");

            var oldZoom = viewer.viewport.getZoom();
            viewer.zoomInButton.onClick();
            var newZoom = viewer.viewport.getZoom();
            assert.ok(oldZoom < newZoom, "OSD should have zoomed in.");
            oldZoom = newZoom;
            viewer.zoomOutButton.onClick();
            newZoom = viewer.viewport.getZoom();
            assert.ok(oldZoom > newZoom, "OSD should have zoomed out.");

            viewer.close();
            done();
        };

        viewer = OpenSeadragon({
            id:             'controlsTests',
            prefixUrl:      '/build/openseadragon/images/',
            springStiffness: 100, // Faster animation = faster tests
            showZoomControl: true
        });
        viewer.addHandler('open', openHandler);
        viewer.open('/test/data/testpattern.dzi');
    });

    QUnit.test('HomeControlOff', function (assert) {
        var done = assert.async();
        var openHandler = function () {
            viewer.removeHandler('open', openHandler);
            assert.ok(!viewer.showHomeControl, 'showHomeControl should be off');
            assert.ok(!viewer.homeButton, "Home button should be null");

            viewer.close();
            done();
        };

        viewer = OpenSeadragon({
            id:             'controlsTests',
            prefixUrl:      '/build/openseadragon/images/',
            springStiffness: 100, // Faster animation = faster tests
            showHomeControl: false
        });
        viewer.addHandler('open', openHandler);
        viewer.open('/test/data/testpattern.dzi');
    });

    QUnit.test('HomeControlOn', function (assert) {
        var done = assert.async();
        var openHandler = function () {
            viewer.removeHandler('open', openHandler);
            assert.ok(viewer.showHomeControl, 'showHomeControl should be on');
            assert.ok(!!viewer.homeButton, "Home button should not be null");
            assert.notEqual(viewer.buttonGroup.buttons.indexOf(viewer.homeButton), -1,
                "The home button should be present");

            viewer.viewport.zoomBy(1.1);
            var bounds = viewer.viewport.getBounds();
            var homeBounds = viewer.viewport.getHomeBounds();
            assert.ok(bounds.x !== homeBounds.x ||
                bounds.y !== homeBounds.y ||
                bounds.width !== homeBounds.width ||
                bounds.height !== homeBounds.height,
                "OSD should not be at home.");
            viewer.homeButton.onRelease();
            bounds = viewer.viewport.getBounds();
            assert.ok(bounds.x === homeBounds.x &&
                bounds.y === homeBounds.y &&
                bounds.width === homeBounds.width &&
                bounds.height === homeBounds.height, "OSD should have get home.");

            viewer.close();
            done();
        };

        viewer = OpenSeadragon({
            id:             'controlsTests',
            prefixUrl:      '/build/openseadragon/images/',
            springStiffness: 100, // Faster animation = faster tests
            showHomeControl: true
        });
        viewer.addHandler('open', openHandler);
        viewer.open('/test/data/testpattern.dzi');
    });

    QUnit.test('FullPageControlOff', function (assert) {
        var done = assert.async();
        var openHandler = function () {
            viewer.removeHandler('open', openHandler);
            assert.ok(!viewer.showFullPageControl, 'showFullPageControl should be off');
            assert.ok(!viewer.fullPageButton, "FullPage button should be null");

            viewer.close();
            done();
        };

        viewer = OpenSeadragon({
            id:             'controlsTests',
            prefixUrl:      '/build/openseadragon/images/',
            springStiffness: 100, // Faster animation = faster tests
            showFullPageControl: false
        });
        viewer.addHandler('open', openHandler);
        viewer.open('/test/data/testpattern.dzi');
    });

    QUnit.test('FullPageControlOn', function (assert) {
        var done = assert.async();
        var openHandler = function () {
            viewer.removeHandler('open', openHandler);
            assert.ok(viewer.showHomeControl, 'showFullPageControl should be on');
            assert.ok(!!viewer.fullPageButton, "FullPage button should not be null");
            assert.notEqual(viewer.buttonGroup.buttons.indexOf(viewer.fullPageButton), -1,
                "The full page button should be present");

            assert.ok(!viewer.isFullPage(), "OSD should not be in full page.");
            viewer.fullPageButton.onRelease();
            assert.ok(viewer.isFullPage(), "OSD should be in full page.");
            viewer.fullPageButton.onRelease();
            assert.ok(!viewer.isFullPage(), "OSD should not be in full page.");

            viewer.close();
            done();
        };

        viewer = OpenSeadragon({
            id:             'controlsTests',
            prefixUrl:      '/build/openseadragon/images/',
            springStiffness: 100, // Faster animation = faster tests
            showHomeControl: true
        });
        viewer.addHandler('open', openHandler);
        viewer.open('/test/data/testpattern.dzi');
    });

    QUnit.test('RotateControlOff', function (assert) {
        var done = assert.async();
        var openHandler = function (event) {
            viewer.removeHandler('open', openHandler);
            assert.ok(true, 'Open event was sent');
            assert.ok(viewer.drawer, 'Drawer exists');
            assert.ok(viewer.drawer.canRotate(), 'drawer.canRotate needs to be true');
            assert.ok(!viewer.showRotationControl, 'showRotationControl should be off');
            assert.ok(!viewer.rotateLeftButton, "rotateLeft button should be null");
            assert.ok(!viewer.rotateRightButton, "rotateRight button should be null");

            viewer.close();
            done();
        };

        viewer = OpenSeadragon({
            id:             'controlsTests',
            prefixUrl:      '/build/openseadragon/images/',
            springStiffness: 100, // Faster animation = faster tests
            showRotationControl: false
        });
        viewer.addHandler('open', openHandler);
        viewer.open('/test/data/testpattern.dzi');
    });

    QUnit.test('RotateControlOn', function (assert) {
        var done = assert.async();
        var openHandler = function (event) {
            viewer.removeHandler('open', openHandler);
            assert.ok(true, 'Open event was sent');
            assert.ok(viewer.drawer, 'Drawer exists');
            assert.ok(viewer.drawer.canRotate(), 'drawer.canRotate needs to be true');
            assert.ok(viewer.showRotationControl, 'showRotationControl should be true');
            assert.notEqual(viewer.buttonGroup.buttons.indexOf(viewer.rotateLeftButton), -1,
                "rotateLeft should be found");
            assert.notEqual(viewer.buttonGroup.buttons.indexOf(viewer.rotateRightButton), -1,
                "rotateRight should be found");

            // Now simulate the left/right button clicks.
            // TODO: re-factor simulateViewerClickWithDrag so it'll accept any element, and use that.
            assert.equal(viewer.viewport.getRotation(), 0, "Image should start at 0 degrees rotation");
            viewer.rotateLeftButton.onRelease();
            assert.equal(viewer.viewport.getRotation(), -90, "Image should be -90 degrees rotation (left)");
            viewer.rotateRightButton.onRelease();
            assert.equal(viewer.viewport.getRotation(), 0, "Image should be 0 degrees rotation (right)");

            viewer.close();
            done();
        };

        viewer = OpenSeadragon({
            id:            'controlsTests',
            prefixUrl:     '/build/openseadragon/images/',
            springStiffness: 100, // Faster animation = faster tests
            showRotationControl: true
        });
        viewer.addHandler('open', openHandler);
        viewer.open('/test/data/testpattern.dzi');
    });

    QUnit.test('SequenceControlOff', function (assert) {
        var done = assert.async();
        var openHandler = function () {
            viewer.removeHandler('open', openHandler);
            assert.ok(!viewer.showSequenceControl, 'showSequenceControl should be off');
            assert.ok(!viewer.previousButton, "Previous button should be null");
            assert.ok(!viewer.nextButton, "Next button should be null");

            viewer.close();
            done();
        };

        viewer = OpenSeadragon({
            id:             'controlsTests',
            prefixUrl:      '/build/openseadragon/images/',
            tileSources: [
                '/test/data/testpattern.dzi',
                '/test/data/testpattern.dzi',
                '/test/data/testpattern.dzi'
            ],
            springStiffness: 100, // Faster animation = faster tests
            showSequenceControl: false
        });
        viewer.addHandler('open', openHandler);
    });

    QUnit.test('SequenceControlOnPrevNextWrapOff', function (assert) {
        var done = assert.async();
        var openHandler = function () {
            viewer.removeHandler('open', openHandler);
            assert.ok(viewer.showSequenceControl, 'showSequenceControl should be on');
            assert.ok(!!viewer.previousButton, "Previous button should not be null");
            assert.ok(!!viewer.nextButton, "Next button should not be null");
            assert.notEqual(viewer.paging.buttons.indexOf(viewer.previousButton), -1,
                "The previous button should be present");
            assert.notEqual(viewer.paging.buttons.indexOf(viewer.nextButton), -1,
                "The next button should be present");

            assert.equal(viewer.currentPage(), 0, "OSD should open on first page.");
            assert.ok(viewer.previousButton.element.disabled,
                "Previous should be disabled on first page.");
            assert.ok(!viewer.nextButton.element.disabled,
                "Next should be enabled on first page.");

            viewer.nextButton.onRelease();
            assert.equal(viewer.currentPage(), 1, "OSD should be on second page.");
            assert.ok(!viewer.previousButton.element.disabled,
                "Previous should be enabled on second page.");
            assert.ok(!viewer.nextButton.element.disabled,
                "Next should be enabled on second page.");

            viewer.nextButton.onRelease();
            assert.equal(viewer.currentPage(), 2, "OSD should be on third page.");
            assert.ok(!viewer.previousButton.element.disabled,
                "Previous should be enabled on third page.");
            assert.ok(viewer.nextButton.element.disabled,
                "Next should be disabled on third page.");

            viewer.previousButton.onRelease();
            assert.equal(viewer.currentPage(), 1, "OSD should be on second page.");
            assert.ok(!viewer.previousButton.element.disabled,
                "Previous should be enabled on second page.");
            assert.ok(!viewer.nextButton.element.disabled,
                "Next should be enabled on second page.");

            viewer.close();
            done();
        };

        viewer = OpenSeadragon({
            id:             'controlsTests',
            prefixUrl:      '/build/openseadragon/images/',
            tileSources: [
                '/test/data/testpattern.dzi',
                '/test/data/testpattern.dzi',
                '/test/data/testpattern.dzi'
            ],
            springStiffness: 100, // Faster animation = faster tests
            showSequenceControl: true,
            sequenceMode: true,
            navPrevNextWrap: false
        });
        viewer.addHandler('open', openHandler);
    });

    QUnit.test('SequenceControlOnPrevNextWrapOn', function (assert) {
        var done = assert.async();
        var openHandler = function () {
            viewer.removeHandler('open', openHandler);
            assert.ok(viewer.showSequenceControl, 'showSequenceControl should be on');
            assert.ok(!!viewer.previousButton, "Previous button should not be null");
            assert.ok(!!viewer.nextButton, "Next button should not be null");
            assert.notEqual(viewer.paging.buttons.indexOf(viewer.previousButton), -1,
                "The previous button should be present");
            assert.notEqual(viewer.paging.buttons.indexOf(viewer.nextButton), -1,
                "The next button should be present");

            assert.equal(viewer.currentPage(), 0, "OSD should open on first page.");
            assert.ok(!viewer.previousButton.element.disabled,
                "Previous should be enabled on first page.");
            assert.ok(!viewer.nextButton.element.disabled,
                "Next should be enabled on first page.");

            viewer.previousButton.onRelease();
            assert.equal(viewer.currentPage(), 2, "OSD should be on third page.");
            assert.ok(!viewer.previousButton.element.disabled,
                "Previous should be enabled on third page.");
            assert.ok(!viewer.nextButton.element.disabled,
                "Next should be enabled on third page.");

            viewer.nextButton.onRelease();
            assert.equal(viewer.currentPage(), 0, "OSD should be on first page.");
            assert.ok(!viewer.previousButton.element.disabled,
                "Previous should be enabled on first page.");
            assert.ok(!viewer.nextButton.element.disabled,
                "Next should be enabled on first page.");

            viewer.close();
            done();
        };

        viewer = OpenSeadragon({
            id:             'controlsTests',
            prefixUrl:      '/build/openseadragon/images/',
            tileSources: [
                '/test/data/testpattern.dzi',
                '/test/data/testpattern.dzi',
                '/test/data/testpattern.dzi'
            ],
            springStiffness: 100, // Faster animation = faster tests
            showSequenceControl: true,
            sequenceMode: true,
            navPrevNextWrap: true
        });
        viewer.addHandler('open', openHandler);
    });

})();
