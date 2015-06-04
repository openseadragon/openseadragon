/* global module, asyncTest, $, ok, equal, notEqual, start, test, Util, testLog */

(function () {
    var viewer;

    module('Units', {
        setup: function () {
            var example = $('<div id="unitsexample"></div>').appendTo("#qunit-fixture");

            testLog.reset();

            viewer = OpenSeadragon({
                id: 'unitsexample',
                prefixUrl: '/build/openseadragon/images/',
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
        Util.assessNumericValue(a.x, b.x, 0.00000001, message);
        Util.assessNumericValue(a.y, b.y, 0.00000001, message);
    }

    // Check that f^-1 ( f(x) ) = x
    function checkPoint(context) {
        var viewport = viewer.viewport;

        var point = new OpenSeadragon.Point(15, 12);
        var result = viewport.viewerElementToImageCoordinates(
                viewport.imageToViewerElementCoordinates(point));
        pointEqual(result, point, 'viewerElement and image ' + context);

        result = viewport.windowToImageCoordinates(
                viewport.imageToWindowCoordinates(point));
        pointEqual(result, point, 'window and image ' + context);

        result = viewport.viewerElementToViewportCoordinates(
                viewport.viewportToViewerElementCoordinates(point));
        pointEqual(result, point, 'viewerElement and viewport ' + context);

        result = viewport.windowToViewportCoordinates(
                viewport.viewportToWindowCoordinates(point));
        pointEqual(result, point, 'window and viewport ' + context);

        for (var i = 0; i < viewer.world.getItemCount(); i++) {
            var tiledImage = viewer.world.getItemAt(i);
            result = tiledImage.viewportToImageCoordinates(
                    tiledImage.imageToViewportCoordinates(point));
            pointEqual(result, point, 'viewport and tiled image ' + i + context);

            result = tiledImage.viewerElementToImageCoordinates(
                    tiledImage.imageToViewerElementCoordinates(point));
            pointEqual(result, point, 'viewerElement and tiled image ' + i + context);

            result = tiledImage.windowToImageCoordinates(
                    tiledImage.imageToWindowCoordinates(point));
            pointEqual(result, point, 'window and tiled image ' + i + context);
        }
    }

    // ----------
    asyncTest('Single image coordinates conversions', function () {

        viewer.addHandler("open", function () {
            var viewport = viewer.viewport;
            var tiledImage = viewer.world.getItemAt(0);

            var point0_0 = new OpenSeadragon.Point(0, 0);
            var point = viewport.viewerElementToViewportCoordinates(point0_0);
            pointEqual(point, point0_0, 'When opening, viewer coordinate 0,0 is also point 0,0');
            var viewportPixel = viewport.viewerElementToImageCoordinates(point0_0);
            pointEqual(viewportPixel, point0_0, 'When opening, viewer coordinate 0,0 is also viewport pixel 0,0');
            var imagePixel = tiledImage.viewerElementToImageCoordinates(point0_0);
            pointEqual(imagePixel, point0_0, 'When opening, viewer coordinate 0,0 is also image pixel 0,0');

            var viewerWidth = $(viewer.element).width();
            var imageWidth = viewer.source.dimensions.x;
            var point1_0 = new OpenSeadragon.Point(1, 0);
            var viewerTopRight = new OpenSeadragon.Point(viewerWidth, 0);
            var imageTopRight = new OpenSeadragon.Point(imageWidth, 0);

            point = viewport.viewerElementToViewportCoordinates(viewerTopRight);
            pointEqual(point, point1_0, 'Viewer top right has viewport coordinates 1,0.');
            viewportPixel = viewport.viewerElementToImageCoordinates(viewerTopRight);
            pointEqual(viewportPixel, imageTopRight, 'Viewer top right has viewport pixel coordinates imageWidth,0.');
            imagePixel = tiledImage.viewerElementToImageCoordinates(viewerTopRight);
            pointEqual(imagePixel, imageTopRight, 'Viewer top right has image pixel coordinates imageWidth,0.');

            checkPoint(' after opening');
            viewer.addHandler('animation-finish', function animationHandler() {
                viewer.removeHandler('animation-finish', animationHandler);
                checkPoint(' after zoom and pan');
                start();
            });
            viewer.viewport.zoomTo(0.8).panTo(new OpenSeadragon.Point(0.1, 0.2));
        });
        viewer.open('/test/data/testpattern.dzi');
    });


    // ---------
    asyncTest('Multiple images coordinates conversion', function () {

        viewer.addHandler("open", function () {
            var viewport = viewer.viewport;
            var tiledImage1 = viewer.world.getItemAt(0);
            var tiledImage2 = viewer.world.getItemAt(1);
            var imageWidth = viewer.source.dimensions.x;
            var imageHeight = viewer.source.dimensions.y;

            var point0_0 = new OpenSeadragon.Point(0, 0);
            var point = viewport.viewerElementToViewportCoordinates(point0_0);
            pointEqual(point, point0_0, 'When opening, viewer coordinate 0,0 is also point 0,0');
            var image1Pixel = tiledImage1.viewerElementToImageCoordinates(point0_0);
            pointEqual(image1Pixel, point0_0, 'When opening, viewer coordinate 0,0 is also image 1 pixel 0,0');
            var image2Pixel = tiledImage2.viewerElementToImageCoordinates(point0_0);
            pointEqual(image2Pixel,
                    new OpenSeadragon.Point(-2 * imageWidth, -2 * imageHeight),
                    'When opening, viewer coordinates 0,0 is also image 2 pixel -2*imageWidth, -2*imageHeight');

            var viewerWidth = $(viewer.element).width();
            var viewerHeight = $(viewer.element).height();
            var viewerBottomRight = new OpenSeadragon.Point(viewerWidth, viewerHeight);

            point = viewport.viewerElementToViewportCoordinates(viewerBottomRight);
            pointEqual(point, new OpenSeadragon.Point(1.5, 1.5),
                    'Viewer bottom right has viewport coordinates 1.5,1.5.');
            image1Pixel = tiledImage1.viewerElementToImageCoordinates(viewerBottomRight);
            pointEqual(image1Pixel,
                    new OpenSeadragon.Point(imageWidth * 1.5, imageHeight * 1.5),
                    'Viewer bottom right has image 1 pixel coordinates imageWidth * 1.5, imageHeight * 1.5');
            image2Pixel = tiledImage2.viewerElementToImageCoordinates(viewerBottomRight);
            pointEqual(image2Pixel,
                    new OpenSeadragon.Point(imageWidth, imageHeight),
                    'Viewer bottom right has image 2 pixel coordinates imageWidth,imageHeight.');


            checkPoint(' after opening');
            viewer.addHandler('animation-finish', function animationHandler() {
                viewer.removeHandler('animation-finish', animationHandler);
                checkPoint(' after zoom and pan');
                start();
            });
            viewer.viewport.zoomTo(0.8).panTo(new OpenSeadragon.Point(0.1, 0.2));

            start();
        });

        viewer.open([{
                tileSource: "/test/data/testpattern.dzi"
            }, {
                tileSource: "/test/data/testpattern.dzi",
                x: 1,
                y: 1,
                width: 0.5
            }
        ]);
    });


    // ----------
    asyncTest('ZoomRatio 1 image', function () {
        viewer.addHandler("open", function () {

            var viewport = viewer.viewport;

            var imageWidth = viewer.source.dimensions.x;

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

            var zoomHandler = function () {
                viewer.removeHandler('animation-finish', zoomHandler);
                checkZoom();
                start();
            };

            viewer.addHandler('animation-finish', zoomHandler);
            viewport.zoomTo(2);
        });

        viewer.open('/test/data/testpattern.dzi');
    });

    // ----------
    asyncTest('ZoomRatio 2 images', function () {
        viewer.addHandler("open", function () {

            var viewport = viewer.viewport;

            var imageWidth = viewer.source.dimensions.x;
            var image1 = viewer.world.getItemAt(0);
            var image2 = viewer.world.getItemAt(1);

            function getCurrentImageWidth(image) {
                var bounds = image.getBounds();
                return viewport.viewportToViewerElementCoordinates(
                        bounds.getTopRight()).minus(
                        viewport.viewportToViewerElementCoordinates(
                                bounds.getTopLeft())).x;
            }

            function checkZoom(image) {
                var currentImageWidth = getCurrentImageWidth(image);
                var expectedImageZoom = currentImageWidth / imageWidth;
                var expectedViewportZoom = viewport.getZoom(true);
                var actualImageZoom = image.viewportToImageZoom(
                        expectedViewportZoom);
                Util.assessNumericValue(actualImageZoom, expectedImageZoom,
                        0.00000001);

                var actualViewportImage1Zoom = image.imageToViewportZoom(actualImageZoom);
                Util.assessNumericValue(
                        actualViewportImage1Zoom, expectedViewportZoom, 0.00000001);
            }

            checkZoom(image1);
            checkZoom(image2);

            var zoomHandler = function () {
                viewer.removeHandler('animation-finish', zoomHandler);
                checkZoom(image1);
                checkZoom(image2);
                start();
            };

            viewer.addHandler('animation-finish', zoomHandler);
            viewport.zoomTo(2);
        });

        viewer.open([{
                tileSource: "/test/data/testpattern.dzi"
            }, {
                tileSource: "/test/data/testpattern.dzi",
                x: 1,
                y: 1,
                width: 0.5
            }
        ]);
    });

})();
