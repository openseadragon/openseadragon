/* global module, asyncTest, $, ok, equal, notEqual, start, test, Util, testLog */

(function () {
    var viewer;

    module('Controls', {
        setup: function () {
            var example = $('<div id="controlsTests"></div>').appendTo("#qunit-fixture");

            testLog.reset();

        },
        teardown: function () {
            if (viewer && viewer.close) {
                viewer.close();
            }

            viewer = null;
        }
    });

    asyncTest('ZoomControlOff', function () {

        var openHandler = function () {
            viewer.removeHandler('open', openHandler);
            ok(!viewer.showZoomControl, 'showZoomControl should be off');
            ok(!viewer.zoomInButton, "zoomIn button should be null");
            ok(!viewer.zoomOutButton, "zoomOut button should be null");

            viewer.close();
            start();
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

    asyncTest('ZoomControlOn', function () {

        var openHandler = function () {
            viewer.removeHandler('open', openHandler);
            ok(viewer.showZoomControl, 'showZoomControl should be on');
            ok(!!viewer.zoomInButton, "zoomIn button should not be null");
            ok(!!viewer.zoomOutButton, "zoomOut button should not be null");
            notEqual(viewer.buttons.buttons.indexOf(viewer.zoomInButton), -1,
                "The zoomIn button should be present");
            notEqual(viewer.buttons.buttons.indexOf(viewer.zoomOutButton), -1,
                "The zoomOut button should be present");

            var oldZoom = viewer.viewport.getZoom();
            viewer.zoomInButton.onClick();
            var newZoom = viewer.viewport.getZoom();
            ok(oldZoom < newZoom, "OSD should have zoomed in.");
            oldZoom = newZoom;
            viewer.zoomOutButton.onClick();
            newZoom = viewer.viewport.getZoom();
            ok(oldZoom > newZoom, "OSD should have zoomed out.");

            viewer.close();
            start();
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

    asyncTest('HomeControlOff', function () {

        var openHandler = function () {
            viewer.removeHandler('open', openHandler);
            ok(!viewer.showHomeControl, 'showHomeControl should be off');
            ok(!viewer.homeButton, "Home button should be null");

            viewer.close();
            start();
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

    asyncTest('HomeControlOn', function () {

        var openHandler = function () {
            viewer.removeHandler('open', openHandler);
            ok(viewer.showHomeControl, 'showHomeControl should be on');
            ok(!!viewer.homeButton, "Home button should not be null");
            notEqual(viewer.buttons.buttons.indexOf(viewer.homeButton), -1,
                "The home button should be present");

            viewer.viewport.zoomBy(1.1);
            var bounds = viewer.viewport.getBounds();
            var homeBounds = viewer.viewport.getHomeBounds();
            ok(bounds.x !== homeBounds.x ||
                bounds.y !== homeBounds.y ||
                bounds.width !== homeBounds.width ||
                bounds.height !== homeBounds.height,
                "OSD should not be at home.");
            viewer.homeButton.onRelease();
            bounds = viewer.viewport.getBounds();
            ok(bounds.x === homeBounds.x &&
                bounds.y === homeBounds.y &&
                bounds.width === homeBounds.width &&
                bounds.height === homeBounds.height, "OSD should have get home.");

            viewer.close();
            start();
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

    asyncTest('FullPageControlOff', function () {

        var openHandler = function () {
            viewer.removeHandler('open', openHandler);
            ok(!viewer.showFullPageControl, 'showFullPageControl should be off');
            ok(!viewer.fullPageButton, "FullPage button should be null");

            viewer.close();
            start();
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

    asyncTest('FullPageControlOn', function () {

        var openHandler = function () {
            viewer.removeHandler('open', openHandler);
            ok(viewer.showHomeControl, 'showFullPageControl should be on');
            ok(!!viewer.fullPageButton, "FullPage button should not be null");
            notEqual(viewer.buttons.buttons.indexOf(viewer.fullPageButton), -1,
                "The full page button should be present");

            ok(!viewer.isFullPage(), "OSD should not be in full page.");
            viewer.fullPageButton.onRelease();
            ok(viewer.isFullPage(), "OSD should be in full page.");
            viewer.fullPageButton.onRelease();
            ok(!viewer.isFullPage(), "OSD should not be in full page.");

            viewer.close();
            start();
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

    asyncTest('RotateControlOff', function () {

        var openHandler = function (event) {
            viewer.removeHandler('open', openHandler);
            ok(true, 'Open event was sent');
            ok(viewer.drawer, 'Drawer exists');
            ok(viewer.drawer.canRotate(), 'drawer.canRotate needs to be true');
            ok(!viewer.showRotationControl, 'showRotationControl should be off');
            ok(!viewer.rotateLeftButton, "rotateLeft button should be null");
            ok(!viewer.rotateRightButton, "rotateRight button should be null");

            viewer.close();
            start();
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

    asyncTest('RotateControlOn', function () {

        var openHandler = function (event) {
            viewer.removeHandler('open', openHandler);
            ok(true, 'Open event was sent');
            ok(viewer.drawer, 'Drawer exists');
            ok(viewer.drawer.canRotate(), 'drawer.canRotate needs to be true');
            ok(viewer.showRotationControl, 'showRotationControl should be true');
            notEqual(viewer.buttons.buttons.indexOf(viewer.rotateLeftButton), -1,
                "rotateLeft should be found");
            notEqual(viewer.buttons.buttons.indexOf(viewer.rotateRightButton), -1,
                "rotateRight should be found");

            // Now simulate the left/right button clicks.
            // TODO: re-factor simulateViewerClickWithDrag so it'll accept any element, and use that.
            equal(viewer.viewport.degrees, 0, "Image should start at 0 degrees rotation");
            viewer.rotateLeftButton.onRelease();
            equal(viewer.viewport.degrees, 270, "Image should be 270 degrees rotation (left)");
            viewer.rotateRightButton.onRelease();
            equal(viewer.viewport.degrees, 0, "Image should be 270 degrees rotation (right)");

            viewer.close();
            start();
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

    asyncTest('SequenceControlOff', function () {

        var openHandler = function () {
            viewer.removeHandler('open', openHandler);
            ok(!viewer.showSequenceControl, 'showSequenceControl should be off');
            ok(!viewer.previousButton, "Previous button should be null");
            ok(!viewer.nextButton, "Next button should be null");

            viewer.close();
            start();
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

    asyncTest('SequenceControlOnPrevNextWrapOff', function () {

        var openHandler = function () {
            viewer.removeHandler('open', openHandler);
            ok(viewer.showSequenceControl, 'showSequenceControl should be on');
            ok(!!viewer.previousButton, "Previous button should not be null");
            ok(!!viewer.nextButton, "Next button should not be null");
            notEqual(viewer.paging.buttons.indexOf(viewer.previousButton), -1,
                "The previous button should be present");
            notEqual(viewer.paging.buttons.indexOf(viewer.nextButton), -1,
                "The next button should be present");

            equal(viewer.currentPage(), 0, "OSD should open on first page.");
            ok(viewer.previousButton.element.disabled,
                "Previous should be disabled on first page.");
            ok(!viewer.nextButton.element.disabled,
                "Next should be enabled on first page.");

            viewer.nextButton.onRelease();
            equal(viewer.currentPage(), 1, "OSD should be on second page.");
            ok(!viewer.previousButton.element.disabled,
                "Previous should be enabled on second page.");
            ok(!viewer.nextButton.element.disabled,
                "Next should be enabled on second page.");

            viewer.nextButton.onRelease();
            equal(viewer.currentPage(), 2, "OSD should be on third page.");
            ok(!viewer.previousButton.element.disabled,
                "Previous should be enabled on third page.");
            ok(viewer.nextButton.element.disabled,
                "Next should be disabled on third page.");

            viewer.previousButton.onRelease();
            equal(viewer.currentPage(), 1, "OSD should be on second page.");
            ok(!viewer.previousButton.element.disabled,
                "Previous should be enabled on second page.");
            ok(!viewer.nextButton.element.disabled,
                "Next should be enabled on second page.");

            viewer.close();
            start();
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
            navPrevNextWrap: false
        });
        viewer.addHandler('open', openHandler);
    });

    asyncTest('SequenceControlOnPrevNextWrapOn', function () {

        var openHandler = function () {
            viewer.removeHandler('open', openHandler);
            ok(viewer.showSequenceControl, 'showSequenceControl should be on');
            ok(!!viewer.previousButton, "Previous button should not be null");
            ok(!!viewer.nextButton, "Next button should not be null");
            notEqual(viewer.paging.buttons.indexOf(viewer.previousButton), -1,
                "The previous button should be present");
            notEqual(viewer.paging.buttons.indexOf(viewer.nextButton), -1,
                "The next button should be present");

            equal(viewer.currentPage(), 0, "OSD should open on first page.");
            ok(!viewer.previousButton.element.disabled,
                "Previous should be enabled on first page.");
            ok(!viewer.nextButton.element.disabled,
                "Next should be enabled on first page.");

            viewer.previousButton.onRelease();
            equal(viewer.currentPage(), 2, "OSD should be on third page.");
            ok(!viewer.previousButton.element.disabled,
                "Previous should be enabled on third page.");
            ok(!viewer.nextButton.element.disabled,
                "Next should be enabled on third page.");

            viewer.nextButton.onRelease();
            equal(viewer.currentPage(), 0, "OSD should be on first page.");
            ok(!viewer.previousButton.element.disabled,
                "Previous should be enabled on first page.");
            ok(!viewer.nextButton.element.disabled,
                "Next should be enabled on first page.");

            viewer.close();
            start();
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
            navPrevNextWrap: true
        });
        viewer.addHandler('open', openHandler);
    });

})();
