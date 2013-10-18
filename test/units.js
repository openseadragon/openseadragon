/* global module, asyncTest, $, ok, equal, notEqual, start, test, Util, testLog */

(function() {
    var viewer;

    module('Units', {
        setup: function () {
            var example = $('<div id="unitsexample"></div>').appendTo("#qunit-fixture");

            testLog.reset();

            viewer = OpenSeadragon({
                id:            'unitsexample',
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


    function pointEqual(a, b, message) {
        ok(a.x === b.x && a.y === b.y, message);
    }

    // ----------
    asyncTest('Coordinates conversions', function() {

        viewer.addHandler("open", function () {
            var viewport = viewer.viewport;

            var point0_0 = new OpenSeadragon.Point(0, 0);
            var point = viewport.viewerElementToViewportCoordinates(point0_0);
            pointEqual(point, point0_0, 'When opening, viewer coordinate 0,0 is also point 0,0');
            var pixel = viewport.viewerElementToImageCoordinates(point0_0);
            pointEqual(pixel, point0_0, 'When opening, viewer coordinate 0,0 is also pixel 0,0');

            var viewerWidth = $(viewer.element).width();
            var imageWidth = viewer.source.dimensions.x;
            var point1_0 = new OpenSeadragon.Point(1, 0);
            var viewerTopRight = new OpenSeadragon.Point(viewerWidth, 0);
            var imageTopRight = new OpenSeadragon.Point(imageWidth, 0);

            var point = viewport.viewerElementToViewportCoordinates(viewerTopRight);
            pointEqual(point, point1_0, 'Viewer top right has viewport coordinates 1,0.');
            var pixel = viewport.viewerElementToImageCoordinates(viewerTopRight);
            pointEqual(pixel, imageTopRight, 'Viewer top right has viewport coordinates imageWidth,0.');

            var point = new OpenSeadragon.Point(15, 12);
            var result = viewport.viewerElementToImageCoordinates(
                viewport.imageToViewerElementCoordinates(point));
            pointEqual(result, point, 'viewerElement and image');

            var result = viewport.windowToImageCoordinates(
                viewport.imageToWindowCoordinates(point));
            pointEqual(result, point, 'window and image');

            var result = viewport.viewerElementToViewportCoordinates(
                viewport.viewportToViewerElementCoordinates(point));
            pointEqual(result, point, 'viewerElement and viewport');

            var result = viewport.windowToViewportCoordinates(
                viewport.viewportToWindowCoordinates(point));
            pointEqual(result, point, 'window and viewport');

            start();
        });
        viewer.open('/test/data/testpattern.dzi');
    });

    // ----------
    asyncTest('ZoomRatio', function() {
        viewer.addHandler("open", function () {

            var viewport = viewer.viewport;

            var imageWidth = 1000;

            function getCurrentImageWidth() {
                return viewport.viewportToViewerElementCoordinates(
                    new OpenSeadragon.Point(1, 0)).minus(
                        viewport.viewportToViewerElementCoordinates(
                            new OpenSeadragon.Point(0, 0))).x;
            }

            function checkZoom() {
                var currentImageWidth = getCurrentImageWidth();
                var expectedImageZoom = currentImageWidth / imageWidth;
                var expectedViewportZoom = viewport.getZoom(true);
                var actualImageZoom = viewport.viewportToImageZoom(
                    expectedViewportZoom);
                equal(actualImageZoom, expectedImageZoom);
                
                var actualViewportZoom = viewport.imageToViewportZoom(actualImageZoom);
                equal(actualViewportZoom, expectedViewportZoom);
            }

            checkZoom();

            var zoomHandler = function() {
                viewer.removeHandler('animationfinish', zoomHandler);
                checkZoom();
                start();
            };

            viewer.addHandler('animationfinish', zoomHandler);
            viewport.zoomTo(2);
            start();
        });

        viewer.open('/test/data/testpattern.dzi');
    });


})();
