/* global module, asyncTest, $, ok, equal, notEqual, start, test, Util, testLog */

(function () {
    var viewer;
    var precision = 0.00000001;

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
        Util.assessNumericValue(a.x, b.x, precision, message);
        Util.assessNumericValue(a.y, b.y, precision, message);
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

    // ----------
    asyncTest('Single image coordinates conversions with viewport margins', function () {

        viewer.addOnceHandler("open", function () {
            var viewport = viewer.viewport;
            var tiledImage = viewer.world.getItemAt(0);

            var point0_0 = new OpenSeadragon.Point(0, 0);
            var point = viewport.viewerElementToViewportCoordinates(point0_0);
            pointEqual(new OpenSeadragon.Point(-0.25, -0.125), point,
                'When opening, viewer coordinate 0,0 is point -0.25,-0.125');
            var viewportPixel = viewport.viewerElementToImageCoordinates(point0_0);
            pointEqual(new OpenSeadragon.Point(-250, -125), viewportPixel,
                'When opening, viewport coordinate 0,0 is viewer pixel -250,-125');
            var imagePixel = tiledImage.viewerElementToImageCoordinates(point0_0);
            pointEqual(new OpenSeadragon.Point(-250, -125), imagePixel,
                'When opening, viewer coordinate 0,0 is image pixel -250,-125');

            var viewerWidth = $(viewer.element).width();
            var viewerTopRight = new OpenSeadragon.Point(viewerWidth, 0);

            point = viewport.viewerElementToViewportCoordinates(viewerTopRight);
            pointEqual(new OpenSeadragon.Point(1, -0.125), point,
                'Viewer top right has viewport coordinates -0.125,0.');
            imagePixel = viewport.viewerElementToImageCoordinates(viewerTopRight);
            pointEqual(new OpenSeadragon.Point(-250, -125), viewportPixel,
                'Viewer top right has image pixel coordinates -250,-125.');

            checkPoint(' after opening');
            viewer.addOnceHandler('animation-finish', function() {
                checkPoint(' after zoom and pan');
                start();
            });
            viewer.viewport.zoomTo(0.8).panTo(new OpenSeadragon.Point(0.1, 0.2));
        });
        viewer.viewport.setMargins({
            left: 100
        });
        viewer.open('/test/data/testpattern.dzi');
    });

    // ----------
    asyncTest('Single image coordinates conversions with viewport margins and rotation', function () {

        viewer.addOnceHandler("open", function () {
            var viewport = viewer.viewport;
            var tiledImage = viewer.world.getItemAt(0);

            var point0_0 = new OpenSeadragon.Point(0, 0);
            var point = viewport.viewerElementToViewportCoordinates(point0_0);
            pointEqual(new OpenSeadragon.Point(-0.875, 0.625), point,
                'When opening, viewer coordinate 0,0 is point -0.875,0.625');
            var viewportPixel = viewport.viewerElementToImageCoordinates(point0_0);
            pointEqual(new OpenSeadragon.Point(-875, 625), viewportPixel,
                'When opening, viewport coordinate 0,0 is viewer pixel -875,625');
            var imagePixel = tiledImage.viewerElementToImageCoordinates(point0_0);
            pointEqual(new OpenSeadragon.Point(-875, 625), imagePixel,
                'When opening, viewer coordinate 0,0 is image pixel -875,625');

            var viewerWidth = $(viewer.element).width();
            var viewerTopRight = new OpenSeadragon.Point(viewerWidth, 0);

            point = viewport.viewerElementToViewportCoordinates(viewerTopRight);
            pointEqual(new OpenSeadragon.Point(0.375, -0.625), point,
                'Viewer top right has viewport coordinates 0.375,-0.625.');
            imagePixel = viewport.viewerElementToImageCoordinates(viewerTopRight);
            pointEqual(new OpenSeadragon.Point(-875, 625), viewportPixel,
                'Viewer top right has image pixel coordinates -875,625.');

            checkPoint(' after opening');
            viewer.addOnceHandler('animation-finish', function() {
                checkPoint(' after zoom and pan');
                start();
            });
            viewer.viewport.zoomTo(0.8).panTo(new OpenSeadragon.Point(0.1, 0.2));
        });
        viewer.viewport.setMargins({
            left: 100
        });
        viewer.viewport.setRotation(45);
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


    // ---------
    asyncTest('Multiple images coordinates conversion with viewport rotation', function () {

        viewer.addHandler("open", function () {
            var viewport = viewer.viewport;
            var tiledImage1 = viewer.world.getItemAt(0);
            var tiledImage2 = viewer.world.getItemAt(1);
            var imageWidth = viewer.source.dimensions.x;
            var imageHeight = viewer.source.dimensions.y;

            var viewerWidth = $(viewer.element).width();
            var viewerHeight = $(viewer.element).height();
            var viewerMiddleTop = new OpenSeadragon.Point(viewerWidth / 2, 0);
            var viewerMiddleBottom = new OpenSeadragon.Point(viewerWidth / 2, viewerHeight);

            var point0_0 = new OpenSeadragon.Point(0, 0);
            var point = viewport.viewerElementToViewportCoordinates(viewerMiddleTop);
            pointEqual(point, point0_0, 'When opening, viewer middle top is also viewport 0,0');
            var image1Pixel = tiledImage1.viewerElementToImageCoordinates(viewerMiddleTop);
            pointEqual(image1Pixel, point0_0, 'When opening, viewer middle top is also image 1 pixel 0,0');
            var image2Pixel = tiledImage2.viewerElementToImageCoordinates(viewerMiddleTop);
            pointEqual(image2Pixel,
                    new OpenSeadragon.Point(-2 * imageWidth, -2 * imageHeight),
                    'When opening, viewer middle top is also image 2 pixel -2*imageWidth, -2*imageHeight');

            point = viewport.viewerElementToViewportCoordinates(viewerMiddleBottom);
            pointEqual(point, new OpenSeadragon.Point(1.5, 1.5),
                    'Viewer middle bottom has viewport coordinates 1.5,1.5.');
            image1Pixel = tiledImage1.viewerElementToImageCoordinates(viewerMiddleBottom);
            pointEqual(image1Pixel,
                    new OpenSeadragon.Point(imageWidth * 1.5, imageHeight * 1.5),
                    'Viewer middle bottom has image 1 pixel coordinates imageWidth * 1.5, imageHeight * 1.5');
            image2Pixel = tiledImage2.viewerElementToImageCoordinates(viewerMiddleBottom);
            pointEqual(image2Pixel,
                    new OpenSeadragon.Point(imageWidth, imageHeight),
                    'Viewer middle bottom has image 2 pixel coordinates imageWidth,imageHeight.');


            checkPoint(' after opening');
            viewer.addHandler('animation-finish', function animationHandler() {
                viewer.removeHandler('animation-finish', animationHandler);
                checkPoint(' after zoom and pan');

                //Restore rotation
                viewer.viewport.setRotation(0);
                start();
            });
            viewer.viewport.zoomTo(0.8).panTo(new OpenSeadragon.Point(0.1, 0.2));
        });

        viewer.viewport.setRotation(45);
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
                Util.assessNumericValue(actualImageZoom, expectedImageZoom, precision);

                var actualViewportZoom = viewport.imageToViewportZoom(actualImageZoom);
                Util.assessNumericValue(actualViewportZoom, expectedViewportZoom, precision);
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
                        precision);

                var actualViewportImage1Zoom = image.imageToViewportZoom(actualImageZoom);
                Util.assessNumericValue(
                        actualViewportImage1Zoom, expectedViewportZoom, precision);
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
