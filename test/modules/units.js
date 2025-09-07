/* eslint-disable camelcase */
/* global QUnit, $, Util, testLog */

(function () {
    let viewer;
    const precision = 0.00000001;

    QUnit.module('Units', {
        beforeEach: function () {
            $('<div id="unitsexample"></div>').appendTo("#qunit-fixture");

            testLog.reset();

            // eslint-disable-next-line new-cap
            viewer = OpenSeadragon({
                id: 'unitsexample',
                prefixUrl: '/build/openseadragon/images/',
                springStiffness: 100 // Faster animation = faster tests
            });
        },
        afterEach: function () {
            if (viewer){
                viewer.destroy();
            }

            viewer = null;
        }
    });


    function pointEqual(assert, a, b, message) {
        Util.assessNumericValue(assert, a.x, b.x, precision, message);
        Util.assessNumericValue(assert, a.y, b.y, precision, message);
    }

    // Check that f^-1 ( f(x) ) = x
    function checkPoint(assert, context) {
        const viewport = viewer.viewport;

        const point = new OpenSeadragon.Point(15, 12);
        let result = viewport.viewerElementToImageCoordinates(
                viewport.imageToViewerElementCoordinates(point));
        pointEqual(assert, result, point, 'viewerElement and image ' + context);

        result = viewport.windowToImageCoordinates(
                viewport.imageToWindowCoordinates(point));
        pointEqual(assert, result, point, 'window and image ' + context);

        result = viewport.viewerElementToViewportCoordinates(
                viewport.viewportToViewerElementCoordinates(point));
        pointEqual(assert, result, point, 'viewerElement and viewport ' + context);

        result = viewport.windowToViewportCoordinates(
                viewport.viewportToWindowCoordinates(point));
        pointEqual(assert, result, point, 'window and viewport ' + context);

        for (let i = 0; i < viewer.world.getItemCount(); i++) {
            const tiledImage = viewer.world.getItemAt(i);
            result = tiledImage.viewportToImageCoordinates(
                    tiledImage.imageToViewportCoordinates(point));
            pointEqual(assert, result, point, 'viewport and tiled image ' + i + context);

            result = tiledImage.viewerElementToImageCoordinates(
                    tiledImage.imageToViewerElementCoordinates(point));
            pointEqual(assert, result, point, 'viewerElement and tiled image ' + i + context);

            result = tiledImage.windowToImageCoordinates(
                    tiledImage.imageToWindowCoordinates(point));
            pointEqual(assert, result, point, 'window and tiled image ' + i + context);
        }
    }

    // ----------
    QUnit.test('Single image coordinates conversions', function (assert) {
        const done = assert.async();
        viewer.addHandler("open", function () {
            const viewport = viewer.viewport;
            const tiledImage = viewer.world.getItemAt(0);

            const point0_0 = new OpenSeadragon.Point(0, 0);
            let point = viewport.viewerElementToViewportCoordinates(point0_0);
            pointEqual(assert, point, point0_0, 'When opening, viewer coordinate 0,0 is also point 0,0');
            let viewportPixel = viewport.viewerElementToImageCoordinates(point0_0);
            pointEqual(assert, viewportPixel, point0_0, 'When opening, viewer coordinate 0,0 is also viewport pixel 0,0');
            let imagePixel = tiledImage.viewerElementToImageCoordinates(point0_0);
            pointEqual(assert, imagePixel, point0_0, 'When opening, viewer coordinate 0,0 is also image pixel 0,0');

            const viewerWidth = $(viewer.element).width();
            const imageWidth = viewer.source.dimensions.x;
            const point1_0 = new OpenSeadragon.Point(1, 0);
            const viewerTopRight = new OpenSeadragon.Point(viewerWidth, 0);
            const imageTopRight = new OpenSeadragon.Point(imageWidth, 0);

            point = viewport.viewerElementToViewportCoordinates(viewerTopRight);
            pointEqual(assert, point, point1_0, 'Viewer top right has viewport coordinates 1,0.');
            viewportPixel = viewport.viewerElementToImageCoordinates(viewerTopRight);
            pointEqual(assert, viewportPixel, imageTopRight, 'Viewer top right has viewport pixel coordinates imageWidth,0.');
            imagePixel = tiledImage.viewerElementToImageCoordinates(viewerTopRight);
            pointEqual(assert, imagePixel, imageTopRight, 'Viewer top right has image pixel coordinates imageWidth,0.');

            checkPoint(assert, ' after opening');
            viewer.addHandler('animation-finish', function animationHandler() {
                viewer.removeHandler('animation-finish', animationHandler);
                checkPoint(assert, ' after zoom and pan');
                done();
            });
            viewer.viewport.zoomTo(0.8).panTo(new OpenSeadragon.Point(0.1, 0.2));
        });
        viewer.open('/test/data/testpattern.dzi');
    });


    // ---------
    QUnit.test('Multiple images coordinates conversion', function (assert) {
        const done = assert.async();
        viewer.addHandler("open", function () {
            const viewport = viewer.viewport;
            const tiledImage1 = viewer.world.getItemAt(0);
            const tiledImage2 = viewer.world.getItemAt(1);
            const imageWidth = viewer.source.dimensions.x;
            const imageHeight = viewer.source.dimensions.y;

            const point0_0 = new OpenSeadragon.Point(0, 0);
            let point = viewport.viewerElementToViewportCoordinates(point0_0);
            pointEqual(assert, point, point0_0, 'When opening, viewer coordinate 0,0 is also point 0,0');
            let image1Pixel = tiledImage1.viewerElementToImageCoordinates(point0_0);
            pointEqual(assert, image1Pixel, point0_0, 'When opening, viewer coordinate 0,0 is also image 1 pixel 0,0');
            let image2Pixel = tiledImage2.viewerElementToImageCoordinates(point0_0);
            pointEqual(assert, image2Pixel,
                    new OpenSeadragon.Point(-2 * imageWidth, -2 * imageHeight),
                    'When opening, viewer coordinates 0,0 is also image 2 pixel -2*imageWidth, -2*imageHeight');

            const viewerWidth = $(viewer.element).width();
            const viewerHeight = $(viewer.element).height();
            const viewerBottomRight = new OpenSeadragon.Point(viewerWidth, viewerHeight);

            point = viewport.viewerElementToViewportCoordinates(viewerBottomRight);
            pointEqual(assert, point, new OpenSeadragon.Point(1.5, 1.5),
                    'Viewer bottom right has viewport coordinates 1.5,1.5.');
            image1Pixel = tiledImage1.viewerElementToImageCoordinates(viewerBottomRight);
            pointEqual(assert, image1Pixel,
                    new OpenSeadragon.Point(imageWidth * 1.5, imageHeight * 1.5),
                    'Viewer bottom right has image 1 pixel coordinates imageWidth * 1.5, imageHeight * 1.5');
            image2Pixel = tiledImage2.viewerElementToImageCoordinates(viewerBottomRight);
            pointEqual(assert, image2Pixel,
                    new OpenSeadragon.Point(imageWidth, imageHeight),
                    'Viewer bottom right has image 2 pixel coordinates imageWidth,imageHeight.');


            checkPoint(assert, ' after opening');
            viewer.addHandler('animation-finish', function animationHandler() {
                viewer.removeHandler('animation-finish', animationHandler);
                checkPoint(assert, ' after zoom and pan');
                done();
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
    QUnit.test('Multiple images coordinates conversion with viewport rotation', function (assert) {
        const done = assert.async();
        viewer.addHandler("open", function () {
            const viewport = viewer.viewport;
            const tiledImage1 = viewer.world.getItemAt(0);
            const tiledImage2 = viewer.world.getItemAt(1);
            const imageWidth = viewer.source.dimensions.x;
            const imageHeight = viewer.source.dimensions.y;

            const viewerWidth = $(viewer.element).width();
            const viewerHeight = $(viewer.element).height();
            const viewerMiddleTop = new OpenSeadragon.Point(viewerWidth / 2, 0);
            const viewerMiddleBottom = new OpenSeadragon.Point(viewerWidth / 2, viewerHeight);

            const point0_0 = new OpenSeadragon.Point(0, 0);
            let point = viewport.viewerElementToViewportCoordinates(viewerMiddleTop);
            pointEqual(assert, point, point0_0, 'When opening, viewer middle top is also viewport 0,0');
            let image1Pixel = tiledImage1.viewerElementToImageCoordinates(viewerMiddleTop);
            pointEqual(assert, image1Pixel, point0_0, 'When opening, viewer middle top is also image 1 pixel 0,0');
            let image2Pixel = tiledImage2.viewerElementToImageCoordinates(viewerMiddleTop);
            pointEqual(assert, image2Pixel,
                    new OpenSeadragon.Point(-2 * imageWidth, -2 * imageHeight),
                    'When opening, viewer middle top is also image 2 pixel -2*imageWidth, -2*imageHeight');

            point = viewport.viewerElementToViewportCoordinates(viewerMiddleBottom);
            pointEqual(assert, point, new OpenSeadragon.Point(1.5, 1.5),
                    'Viewer middle bottom has viewport coordinates 1.5,1.5.');
            image1Pixel = tiledImage1.viewerElementToImageCoordinates(viewerMiddleBottom);
            pointEqual(assert, image1Pixel,
                    new OpenSeadragon.Point(imageWidth * 1.5, imageHeight * 1.5),
                    'Viewer middle bottom has image 1 pixel coordinates imageWidth * 1.5, imageHeight * 1.5');
            image2Pixel = tiledImage2.viewerElementToImageCoordinates(viewerMiddleBottom);
            pointEqual(assert, image2Pixel,
                    new OpenSeadragon.Point(imageWidth, imageHeight),
                    'Viewer middle bottom has image 2 pixel coordinates imageWidth,imageHeight.');


            checkPoint(assert, ' after opening');
            viewer.addHandler('animation-finish', function animationHandler() {
                viewer.removeHandler('animation-finish', animationHandler);
                checkPoint(assert, ' after zoom and pan');

                //Restore rotation
                viewer.viewport.setRotation(0, true);
                done();
            });
            viewer.viewport.zoomTo(0.8).panTo(new OpenSeadragon.Point(0.1, 0.2));
        });

        viewer.viewport.setRotation(45, true);
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
    QUnit.test('ZoomRatio 1 image', function (assert) {
        const done = assert.async();
        viewer.addHandler("open", function () {

            const viewport = viewer.viewport;

            const imageWidth = viewer.source.dimensions.x;

            function getCurrentImageWidth() {
                return viewport.viewportToViewerElementCoordinates(
                        new OpenSeadragon.Point(1, 0)).minus(
                        viewport.viewportToViewerElementCoordinates(
                                new OpenSeadragon.Point(0, 0))).x;
            }

            function checkZoom() {
                const currentImageWidth = getCurrentImageWidth();
                const expectedImageZoom = currentImageWidth / imageWidth;
                const expectedViewportZoom = viewport.getZoom(true);
                const actualImageZoom = viewport.viewportToImageZoom(
                        expectedViewportZoom);
                Util.assessNumericValue(assert, actualImageZoom, expectedImageZoom, precision);

                const actualViewportZoom = viewport.imageToViewportZoom(actualImageZoom);
                Util.assessNumericValue(assert, actualViewportZoom, expectedViewportZoom, precision);
            }

            checkZoom();

            const zoomHandler = function () {
                viewer.removeHandler('animation-finish', zoomHandler);
                checkZoom();
                done();
            };

            viewer.addHandler('animation-finish', zoomHandler);
            viewport.zoomTo(2);
        });

        viewer.open('/test/data/testpattern.dzi');
    });

    // ----------
    QUnit.test('ZoomRatio 2 images', function (assert) {
        const done = assert.async();
        viewer.addHandler("open", function () {

            const viewport = viewer.viewport;

            const imageWidth = viewer.source.dimensions.x;
            const image1 = viewer.world.getItemAt(0);
            const image2 = viewer.world.getItemAt(1);

            function getCurrentImageWidth(image) {
                const bounds = image.getBounds();
                return viewport.viewportToViewerElementCoordinates(
                        bounds.getTopRight()).minus(
                        viewport.viewportToViewerElementCoordinates(
                                bounds.getTopLeft())).x;
            }

            function checkZoom(image) {
                const currentImageWidth = getCurrentImageWidth(image);
                const expectedImageZoom = currentImageWidth / imageWidth;
                const expectedViewportZoom = viewport.getZoom(true);
                const actualImageZoom = image.viewportToImageZoom(
                        expectedViewportZoom);
                Util.assessNumericValue(assert, actualImageZoom, expectedImageZoom,
                        precision);

                const actualViewportImage1Zoom = image.imageToViewportZoom(actualImageZoom);
                Util.assessNumericValue(
                        assert, actualViewportImage1Zoom, expectedViewportZoom, precision);
            }

            checkZoom(image1);
            checkZoom(image2);

            const zoomHandler = function () {
                viewer.removeHandler('animation-finish', zoomHandler);
                checkZoom(image1);
                checkZoom(image2);
                done();
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
