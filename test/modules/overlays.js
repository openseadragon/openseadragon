/* global QUnit, module, Util, $, console, test, asyncTest, start, ok, equal, testLog */

(function() {
    var viewer;
    // jQuery.position can give results quite different than what set in style.left
    var epsilon = 1;

    module("Overlays", {
        setup: function() {
            var example = $('<div id="example-overlays"></div>').appendTo("#qunit-fixture");
            var fixedOverlay = $('<div id="fixed-overlay"></div>').appendTo(example);
            fixedOverlay.width(70);
            fixedOverlay.height(60);

            testLog.reset();
        },
        teardown: function() {
            resetTestVariables();
        }
    });

    var resetTestVariables = function() {
        if (viewer) {
            viewer.close();
        }
    };

    function waitForViewer(handler, count) {
        if (typeof count !== "number") {
            count = 0;
        }
        var ready = viewer.isOpen() &&
            viewer.drawer !== null &&
            !viewer.world.needsDraw() &&
            Util.equalsWithVariance(viewer.viewport.getBounds(true).x,
                viewer.viewport.getBounds().x, 0.000) &&
            Util.equalsWithVariance(viewer.viewport.getBounds(true).y,
                viewer.viewport.getBounds().y, 0.000) &&
            Util.equalsWithVariance(viewer.viewport.getBounds(true).width,
                viewer.viewport.getBounds().width, 0.000);

        if (ready) {
            handler();
        } else if (count < 50) {
            count++;
            setTimeout(function() {
                waitForViewer(handler, count);
            }, 100);
        } else {
            console.log("waitForViewer:" + viewer.isOpen( ) + ":" + viewer.drawer +
                ":" + viewer.world.needsDraw());
            handler();
        }
    }

    asyncTest('Overlays via viewer options', function() {

        viewer = OpenSeadragon({
            id: 'example-overlays',
            prefixUrl: '/build/openseadragon/images/',
            tileSources: ['/test/data/testpattern.dzi', '/test/data/testpattern.dzi'],
            springStiffness: 100, // Faster animation = faster tests
            overlays: [{
                    x: 0.1,
                    y: 0.4,
                    width: 0.09,
                    height: 0.09,
                    id: "overlay"
                }]
        });
        viewer.addHandler('open', openHandler);

        function openHandler() {
            viewer.removeHandler('open', openHandler);

            equal(viewer.overlays.length, 1, "Global overlay should be added.");
            equal(viewer.currentOverlays.length, 1, "Global overlay should be open.");

            viewer.addHandler('open', openPageHandler);
            viewer.goToPage(1);
        }

        function openPageHandler() {
            viewer.removeHandler('open', openPageHandler);

            equal(viewer.overlays.length, 1, "Global overlay should stay after page switch.");
            equal(viewer.currentOverlays.length, 1, "Global overlay should re-open after page switch.");

            viewer.addHandler('close', closeHandler);
            viewer.close();
        }

        function closeHandler() {
            viewer.removeHandler('close', closeHandler);

            equal(viewer.overlays.length, 1, "Global overlay should not be removed on close.");
            equal(viewer.currentOverlays.length, 0, "Global overlay should be closed on close.");

            start();
        }
    });

    asyncTest('Page Overlays via viewer options', function() {

        viewer = OpenSeadragon({
            id: 'example-overlays',
            prefixUrl: '/build/openseadragon/images/',
            tileSources: [{
                    Image: {
                        xmlns: "http://schemas.microsoft.com/deepzoom/2008",
                        Url: "/test/data/testpattern_files/",
                        Format: "jpg",
                        Overlap: "1",
                        TileSize: "254",
                        Size: {
                            Width: 1000,
                            Height: 1000
                        }
                    },
                    overlays: [{
                            x: 0.1,
                            y: 0.4,
                            width: 0.09,
                            height: 0.09,
                            id: "overlay"
                        }]
                }, {
                    Image: {
                        xmlns: "http://schemas.microsoft.com/deepzoom/2008",
                        Url: "/test/data/testpattern_files/",
                        Format: "jpg",
                        Overlap: "1",
                        TileSize: "254",
                        Size: {
                            Width: 1000,
                            Height: 1000
                        }
                    }
                }],
            springStiffness: 100 // Faster animation = faster tests
        });
        viewer.addHandler('open', openHandler);

        function openHandler() {
            viewer.removeHandler('open', openHandler);

            equal(viewer.overlays.length, 0, "No global overlay should be added.");
            equal(viewer.currentOverlays.length, 1, "Page overlay should be open.");

            viewer.addHandler('open', openPageHandler);
            viewer.goToPage(1);
        }

        function openPageHandler() {
            viewer.removeHandler('open', openPageHandler);

            equal(viewer.overlays.length, 0, "No global overlay should be added after page switch.");
            equal(viewer.currentOverlays.length, 0, "No page overlay should be opened after page switch.");

            viewer.addHandler('close', closeHandler);
            viewer.close();
        }

        function closeHandler() {
            viewer.removeHandler('close', closeHandler);

            equal(viewer.overlays.length, 0, "No global overlay should be added on close.");
            equal(viewer.currentOverlays.length, 0, "Page overlay should be closed on close.");

            start();
        }
    });

    asyncTest('Overlays via addOverlay method', function() {

        viewer = OpenSeadragon({
            id: 'example-overlays',
            prefixUrl: '/build/openseadragon/images/',
            tileSources: ['/test/data/testpattern.dzi', '/test/data/testpattern.dzi'],
            springStiffness: 100 // Faster animation = faster tests
        });
        viewer.addHandler('open', openHandler);

        function openHandler() {
            viewer.removeHandler('open', openHandler);

            equal(viewer.overlays.length, 0, "No global overlay should be added.");
            equal(viewer.currentOverlays.length, 0, "No overlay should be open.");

            var rect = new OpenSeadragon.Rect(0.1, 0.1, 0.1, 0.1);
            var overlay = $("<div/>").prop("id", "overlay").get(0);
            viewer.addOverlay(overlay, rect);
            equal(viewer.overlays.length, 0, "No manual overlay should be added as global overlay.");
            equal(viewer.currentOverlays.length, 1, "A manual overlay should be open.");

            viewer.addHandler('open', openPageHandler);
            viewer.goToPage(1);
        }

        function openPageHandler() {
            viewer.removeHandler('open', openPageHandler);

            equal(viewer.overlays.length, 0, "No global overlay should be added after page switch.");
            equal(viewer.currentOverlays.length, 0, "Manual overlay should be removed after page switch.");

            viewer.addHandler('close', closeHandler);
            viewer.close();
        }

        function closeHandler() {
            viewer.removeHandler('close', closeHandler);

            equal(viewer.overlays.length, 0, "No global overlay should be added on close.");
            equal(viewer.currentOverlays.length, 0, "Manual overlay should be removed on close.");

            start();
        }

    });

    asyncTest('Overlays size in pixels', function() {

        viewer = OpenSeadragon({
            id: 'example-overlays',
            prefixUrl: '/build/openseadragon/images/',
            tileSources: '/test/data/testpattern.dzi',
            springStiffness: 100, // Faster animation = faster tests
            overlays: [{
                    px: 13,
                    py: 120,
                    width: 124,
                    height: 132,
                    id: "overlay"
                }, {
                    px: 400,
                    py: 500,
                    id: "fixed-overlay",
                    placement: "TOP_LEFT"
                }]
        });

        function checkOverlayPosition(contextMessage) {
            var viewport = viewer.viewport;

            var expPosition = viewport.imageToViewerElementCoordinates(
                new OpenSeadragon.Point(13, 120));
            var actPosition = $("#overlay").position();
            Util.assessNumericValue(actPosition.left, expPosition.x, epsilon,
                "X position mismatch " + contextMessage);
            Util.assessNumericValue(actPosition.top, expPosition.y, epsilon,
                "Y position mismatch " + contextMessage);

            var zoom = viewport.viewportToImageZoom(viewport.getZoom(true));
            var expectedWidth = 124 * zoom;
            var expectedHeight = 132 * zoom;
            Util.assessNumericValue($("#overlay").width(), expectedWidth, epsilon,
                "Width mismatch " + contextMessage);
            Util.assessNumericValue($("#overlay").height(), expectedHeight, epsilon,
                "Height mismatch " + contextMessage);


            expPosition = viewport.imageToViewerElementCoordinates(
                new OpenSeadragon.Point(400, 500));
            actPosition = $("#fixed-overlay").position();
            Util.assessNumericValue(actPosition.left, expPosition.x, epsilon,
                "Fixed overlay X position mismatch " + contextMessage);
            Util.assessNumericValue(actPosition.top, expPosition.y, epsilon,
                "Fixed overlay Y position mismatch " + contextMessage);

            Util.assessNumericValue($("#fixed-overlay").width(), 70, epsilon,
                "Fixed overlay width mismatch " + contextMessage);
            Util.assessNumericValue($("#fixed-overlay").height(), 60, epsilon,
                "Fixed overlay height mismatch " + contextMessage);
        }

        waitForViewer(function() {
            checkOverlayPosition("after opening using image coordinates");

            viewer.viewport.zoomBy(1.1).panBy(new OpenSeadragon.Point(0.1, 0.2));
            waitForViewer(function() {
                checkOverlayPosition("after zoom and pan using image coordinates");

                viewer.viewport.goHome();
                waitForViewer(function() {
                    checkOverlayPosition("after goHome using image coordinates");
                    start();
                });
            });

        });
    });

    asyncTest('Overlays size in points', function() {

        viewer = OpenSeadragon({
            id: 'example-overlays',
            prefixUrl: '/build/openseadragon/images/',
            tileSources: '/test/data/testpattern.dzi',
            springStiffness: 100, // Faster animation = faster tests
            overlays: [{
                    x: 0.2,
                    y: 0.1,
                    width: 0.5,
                    height: 0.1,
                    id: "overlay"
                }, {
                    x: 0.5,
                    y: 0.6,
                    id: "fixed-overlay",
                    placement: "TOP_LEFT"
                }]
        });

        function checkOverlayPosition(contextMessage) {
            var viewport = viewer.viewport;

            var expPosition = viewport.viewportToViewerElementCoordinates(
                new OpenSeadragon.Point(0.2, 0.1));
            var actPosition = $("#overlay").position();
            Util.assessNumericValue(actPosition.left, expPosition.x, epsilon,
                "X position mismatch " + contextMessage);
            Util.assessNumericValue(actPosition.top, expPosition.y, epsilon,
                "Y position mismatch " + contextMessage);

            var expectedSize = viewport.deltaPixelsFromPoints(
                new OpenSeadragon.Point(0.5, 0.1));
            Util.assessNumericValue($("#overlay").width(), expectedSize.x, epsilon,
                "Width mismatch " + contextMessage);
            Util.assessNumericValue($("#overlay").height(), expectedSize.y, epsilon,
                "Height mismatch " + contextMessage);


            expPosition = viewport.viewportToViewerElementCoordinates(
                new OpenSeadragon.Point(0.5, 0.6));
            actPosition = $("#fixed-overlay").position();
            Util.assessNumericValue(actPosition.left, expPosition.x, epsilon,
                "Fixed overlay X position mismatch " + contextMessage);
            Util.assessNumericValue(actPosition.top, expPosition.y, epsilon,
                "Fixed overlay Y position mismatch " + contextMessage);

            Util.assessNumericValue($("#fixed-overlay").width(), 70, epsilon,
                "Fixed overlay width mismatch " + contextMessage);
            Util.assessNumericValue($("#fixed-overlay").height(), 60, epsilon,
                "Fixed overlay height mismatch " + contextMessage);
        }

        waitForViewer(function() {
            checkOverlayPosition("after opening using viewport coordinates");

            viewer.viewport.zoomBy(1.1).panBy(new OpenSeadragon.Point(0.1, 0.2));
            waitForViewer(function() {
                checkOverlayPosition("after zoom and pan using viewport coordinates");

                viewer.viewport.goHome();
                waitForViewer(function() {
                    checkOverlayPosition("after goHome using viewport coordinates");
                    start();
                });
            });

        });
    });

    asyncTest('Overlays placement', function() {

        var scalableOverlayLocation = new OpenSeadragon.Rect(0.2, 0.1, 0.5, 0.1);
        var fixedOverlayLocation = new OpenSeadragon.Point(0.5, 0.6);

        viewer = OpenSeadragon({
            id: 'example-overlays',
            prefixUrl: '/build/openseadragon/images/',
            tileSources: '/test/data/testpattern.dzi',
            springStiffness: 100, // Faster animation = faster tests
            overlays: [{
                    x: scalableOverlayLocation.x,
                    y: scalableOverlayLocation.y,
                    width: scalableOverlayLocation.width,
                    height: scalableOverlayLocation.height,
                    id: "overlay",
                    placement: "TOP_LEFT"
                }, {
                    x: fixedOverlayLocation.x,
                    y: fixedOverlayLocation.y,
                    id: "fixed-overlay",
                    placement: "TOP_LEFT"
                }]
        });

        // Scalable overlays are always TOP_LEFT
        function checkScalableOverlayPosition(contextMessage) {
            var viewport = viewer.viewport;

            var expPosition = viewport.viewportToViewerElementCoordinates(
                new OpenSeadragon.Point(0.2, 0.1));
            var actPosition = $("#overlay").position();
            Util.assessNumericValue(actPosition.left, expPosition.x, epsilon,
                "X position mismatch " + contextMessage);
            Util.assessNumericValue(actPosition.top, expPosition.y, epsilon,
                "Y position mismatch " + contextMessage);
        }

        function checkFixedOverlayPosition(expectedOffset, contextMessage) {
            var viewport = viewer.viewport;

            var expPosition = viewport.viewportToViewerElementCoordinates(
                new OpenSeadragon.Point(0.5, 0.6))
                .plus(expectedOffset);
            var actPosition = $("#fixed-overlay").position();
            Util.assessNumericValue(actPosition.left, expPosition.x, epsilon,
                "Fixed overlay X position mismatch " + contextMessage);
            Util.assessNumericValue(actPosition.top, expPosition.y, epsilon,
                "Fixed overlay Y position mismatch " + contextMessage);
        }

        waitForViewer(function() {

            checkScalableOverlayPosition("with TOP_LEFT placement.");
            checkFixedOverlayPosition(new OpenSeadragon.Point(0, 0),
                "with TOP_LEFT placement.");

            // Check that legacy OpenSeadragon.OverlayPlacement is still working
            viewer.updateOverlay("overlay", scalableOverlayLocation,
                OpenSeadragon.OverlayPlacement.CENTER);
            viewer.updateOverlay("fixed-overlay", fixedOverlayLocation,
                OpenSeadragon.OverlayPlacement.CENTER);

            setTimeout(function() {
                checkScalableOverlayPosition("with CENTER placement.");
                checkFixedOverlayPosition(new OpenSeadragon.Point(-35, -30),
                    "with CENTER placement.");

                // Check that new OpenSeadragon.Placement is working
                viewer.updateOverlay("overlay", scalableOverlayLocation,
                    OpenSeadragon.Placement.BOTTOM_RIGHT);
                viewer.updateOverlay("fixed-overlay", fixedOverlayLocation,
                    OpenSeadragon.Placement.BOTTOM_RIGHT);
                setTimeout(function() {
                    checkScalableOverlayPosition("with BOTTOM_RIGHT placement.");
                    checkFixedOverlayPosition(new OpenSeadragon.Point(-70, -60),
                        "with BOTTOM_RIGHT placement.");

                    start();
                }, 100);

            }, 100);

        });
    });

    asyncTest('Overlays placement and resizing check', function() {

        var fixedOverlayLocation = new OpenSeadragon.Point(0.5, 0.6);

        viewer = OpenSeadragon({
            id: 'example-overlays',
            prefixUrl: '/build/openseadragon/images/',
            tileSources: '/test/data/testpattern.dzi',
            springStiffness: 100, // Faster animation = faster tests
            overlays: [{
                    x: fixedOverlayLocation.x,
                    y: fixedOverlayLocation.y,
                    id: "fixed-overlay",
                    placement: "CENTER",
                    checkResize: true
                }]
        });

        function checkFixedOverlayPosition(expectedOffset, contextMessage) {
            var viewport = viewer.viewport;

            var expPosition = viewport.viewportToViewerElementCoordinates(
                new OpenSeadragon.Point(0.5, 0.6))
                .plus(expectedOffset);
            var actPosition = $("#fixed-overlay").position();
            Util.assessNumericValue(actPosition.left, expPosition.x, epsilon,
                "Fixed overlay X position mismatch " + contextMessage);
            Util.assessNumericValue(actPosition.top, expPosition.y, epsilon,
                "Fixed overlay Y position mismatch " + contextMessage);
        }

        waitForViewer(function() {
            checkFixedOverlayPosition(new OpenSeadragon.Point(-35, -30),
                "with overlay of size 70,60.");

            $("#fixed-overlay").width(50);
            $("#fixed-overlay").height(40);

            // The resizing of the overlays is not detected by the viewer's loop.
            viewer.forceRedraw();

            setTimeout(function() {
                checkFixedOverlayPosition(new OpenSeadragon.Point(-25, -20),
                    "with overlay of size 50,40.");

                // Restore original size
                $("#fixed-overlay").width(70);
                $("#fixed-overlay").height(60);

                start();
            }, 100);
        });

    });

    asyncTest('Overlays placement and no resizing check', function() {

        var fixedOverlayLocation = new OpenSeadragon.Point(0.5, 0.6);

        viewer = OpenSeadragon({
            id: 'example-overlays',
            prefixUrl: '/build/openseadragon/images/',
            tileSources: '/test/data/testpattern.dzi',
            springStiffness: 100, // Faster animation = faster tests
            overlays: [{
                    x: fixedOverlayLocation.x,
                    y: fixedOverlayLocation.y,
                    id: "fixed-overlay",
                    placement: "CENTER",
                    checkResize: false
                }]
        });

        function checkFixedOverlayPosition(expectedOffset, contextMessage) {
            var viewport = viewer.viewport;

            var expPosition = viewport.viewportToViewerElementCoordinates(
                new OpenSeadragon.Point(0.5, 0.6))
                .plus(expectedOffset);
            var actPosition = $("#fixed-overlay").position();
            Util.assessNumericValue(actPosition.left, expPosition.x, epsilon,
                "Fixed overlay X position mismatch " + contextMessage);
            Util.assessNumericValue(actPosition.top, expPosition.y, epsilon,
                "Fixed overlay Y position mismatch " + contextMessage);
        }

        waitForViewer(function() {
            checkFixedOverlayPosition(new OpenSeadragon.Point(-35, -30),
                "with overlay of size 70,60.");

            $("#fixed-overlay").width(50);
            $("#fixed-overlay").height(40);

            // The resizing of the overlays is not detected by the viewer's loop.
            viewer.forceRedraw();

            setTimeout(function() {
                checkFixedOverlayPosition(new OpenSeadragon.Point(-35, -30),
                    "with overlay of size 50,40.");

                // Restore original size
                $("#fixed-overlay").width(70);
                $("#fixed-overlay").height(60);

                start();
            }, 100);
        });

    });

    // ----------
    asyncTest('overlays appear immediately', function() {
        equal($('#immediate-overlay0').length, 0, 'overlay 0 does not exist');
        equal($('#immediate-overlay1').length, 0, 'overlay 1 does not exist');

        viewer = OpenSeadragon({
            id: 'example-overlays',
            prefixUrl: '/build/openseadragon/images/',
            tileSources: '/test/data/testpattern.dzi',
            springStiffness: 100, // Faster animation = faster tests
            overlays: [{
                    x: 0,
                    y: 0,
                    id: "immediate-overlay0"
                }]
        });

        viewer.addHandler('open', function() {
            equal($('#immediate-overlay0').length, 1, 'overlay 0 exists');

            viewer.addOverlay({
                x: 0,
                y: 0,
                id: "immediate-overlay1"
            });

            equal($('#immediate-overlay1').length, 1, 'overlay 1 exists');
            start();
        });
    });

    // ----------
    asyncTest('Overlay scaled horizontally only', function() {
        viewer = OpenSeadragon({
            id: 'example-overlays',
            prefixUrl: '/build/openseadragon/images/',
            tileSources: '/test/data/testpattern.dzi',
            springStiffness: 100 // Faster animation = faster tests
        });

        viewer.addHandler('open', function() {
            viewer.addOverlay({
                id: "horizontally-scaled-overlay",
                x: 0,
                y: 0,
                width: 1
            });

            var width = $("#horizontally-scaled-overlay").width();
            var height = 100;
            var zoom = 1.1;
            $("#horizontally-scaled-overlay").get(0).style.height = height + "px";

            viewer.viewport.zoomBy(zoom);

            waitForViewer(function() {
                var newWidth = $("#horizontally-scaled-overlay").width();
                var newHeight = $("#horizontally-scaled-overlay").height();
                equal(newWidth, width * zoom, "Width should be scaled.");
                equal(newHeight, height, "Height should not be scaled.");

                start();
            });
        });
    });

    // ----------
    asyncTest('Overlay scaled vertically only', function() {
        viewer = OpenSeadragon({
            id: 'example-overlays',
            prefixUrl: '/build/openseadragon/images/',
            tileSources: '/test/data/testpattern.dzi',
            springStiffness: 100 // Faster animation = faster tests
        });

        viewer.addHandler('open', function() {
            viewer.addOverlay({
                id: "vertically-scaled-overlay",
                x: 0,
                y: 0,
                height: 1
            });

            var width = 100;
            var height = $("#vertically-scaled-overlay").height();
            var zoom = 1.1;
            $("#vertically-scaled-overlay").get(0).style.width = width + "px";

            viewer.viewport.zoomBy(zoom);

            waitForViewer(function() {
                var newWidth = $("#vertically-scaled-overlay").width();
                var newHeight = $("#vertically-scaled-overlay").height();
                equal(newWidth, width, "Width should not be scaled.");
                equal(newHeight, height * zoom, "Height should be scaled.");

                start();
            });
        });
    });

    // ----------
    asyncTest('Overlay.getBounds', function() {
        viewer = OpenSeadragon({
            id: 'example-overlays',
            prefixUrl: '/build/openseadragon/images/',
            tileSources: '/test/data/testpattern.dzi',
            springStiffness: 100 // Faster animation = faster tests
        });

        viewer.addHandler('open', function() {
            viewer.addOverlay({
                id: "fully-scaled-overlay",
                x: 1,
                y: 1,
                width: 1,
                height: 1,
                placement: OpenSeadragon.Placement.BOTTOM_RIGHT
            });
            viewer.addOverlay({
                id: "horizontally-scaled-overlay",
                x: 0.5,
                y: 0.5,
                width: 1,
                placement: OpenSeadragon.Placement.CENTER
            });
            viewer.addOverlay({
                id: "vertically-scaled-overlay",
                x: 0,
                y: 0.5,
                height: 1,
                placement: OpenSeadragon.Placement.LEFT
            });
            viewer.addOverlay({
                id: "not-scaled-overlay",
                x: 1,
                y: 0,
                placement: OpenSeadragon.Placement.TOP_RIGHT
            });

            var notScaledWidth = 100;
            var notScaledHeight = 100;
            $("#horizontally-scaled-overlay").get(0).style.height = notScaledHeight + "px";
            $("#vertically-scaled-overlay").get(0).style.width = notScaledWidth + "px";
            $("#not-scaled-overlay").get(0).style.width = notScaledWidth + "px";
            $("#not-scaled-overlay").get(0).style.height = notScaledHeight + "px";

            var notScaledSize = viewer.viewport.deltaPointsFromPixelsNoRotate(
                new OpenSeadragon.Point(notScaledWidth, notScaledHeight));

            // Force refresh to takes new dimensions into account.
            viewer._drawOverlays();

            var actualBounds = viewer.getOverlayById("fully-scaled-overlay")
                .getBounds(viewer.viewport);
            var expectedBounds = new OpenSeadragon.Rect(0, 0, 1, 1);
            ok(expectedBounds.equals(actualBounds),
                "The fully scaled overlay should have bounds " +
                expectedBounds + " but found " + actualBounds);


            actualBounds = viewer.getOverlayById("horizontally-scaled-overlay")
                .getBounds(viewer.viewport);
            expectedBounds = new OpenSeadragon.Rect(
                0, 0.5 - notScaledSize.y / 2, 1, notScaledSize.y);
            ok(expectedBounds.equals(actualBounds),
                "The horizontally scaled overlay should have bounds " +
                expectedBounds + " but found " + actualBounds);

            actualBounds = viewer.getOverlayById("vertically-scaled-overlay")
                .getBounds(viewer.viewport);
            expectedBounds = new OpenSeadragon.Rect(
                0, 0, notScaledSize.x, 1);
            ok(expectedBounds.equals(actualBounds),
                "The vertically scaled overlay should have bounds " +
                expectedBounds + " but found " + actualBounds);

            actualBounds = viewer.getOverlayById("not-scaled-overlay")
                .getBounds(viewer.viewport);
            expectedBounds = new OpenSeadragon.Rect(
                1 - notScaledSize.x, 0, notScaledSize.x, notScaledSize.y);
            ok(expectedBounds.equals(actualBounds),
                "The not scaled overlay should have bounds " +
                expectedBounds + " but found " + actualBounds);

            start();
        });
    });

    // ----------
    asyncTest('Fully scaled overlay rotation mode NO_ROTATION', function() {
        viewer = OpenSeadragon({
            id: 'example-overlays',
            prefixUrl: '/build/openseadragon/images/',
            tileSources: '/test/data/testpattern.dzi',
            springStiffness: 100, // Faster animation = faster tests
            degrees: 45,
            overlays: [{
                    id: "fully-scaled-overlay",
                    x: 1,
                    y: 1,
                    width: 1,
                    height: 1,
                    placement: OpenSeadragon.Placement.BOTTOM_RIGHT,
                    rotationMode: OpenSeadragon.OverlayRotationMode.NO_ROTATION
                }]
        });

        viewer.addOnceHandler('open', function() {
            var viewport = viewer.viewport;

            var $overlay = $("#fully-scaled-overlay");
            var expectedSize = viewport.deltaPixelsFromPointsNoRotate(
                new OpenSeadragon.Point(1, 1));
            var expectedPosition = viewport.viewportToViewerElementCoordinates(
                new OpenSeadragon.Point(1, 1))
                .minus(expectedSize);
            var actualPosition = $overlay.position();
            Util.assessNumericValue(actualPosition.left, expectedPosition.x, epsilon,
                "Scaled overlay position.x should adjust to rotation.");
            Util.assessNumericValue(actualPosition.top, expectedPosition.y, epsilon,
                "Scaled overlay position.y should adjust to rotation.");

            var actualWidth = $overlay.width();
            var actualHeight = $overlay.height();
            Util.assessNumericValue(actualWidth, expectedSize.x, epsilon,
                "Scaled overlay width should not adjust to rotation.");
            Util.assessNumericValue(actualHeight, expectedSize.y, epsilon,
                "Scaled overlay height should not adjust to rotation.");

            var actualBounds = viewer.getOverlayById("fully-scaled-overlay")
                .getBounds(viewport);
            var expectedBounds = new OpenSeadragon.Rect(0, 0, 1, 1)
                .rotate(-45, new OpenSeadragon.Point(1, 1));
            ok(expectedBounds.equals(actualBounds),
                "The fully scaled overlay should have bounds " +
                expectedBounds + " but found " + actualBounds);

            start();
        });
    });

    // ----------
    asyncTest('Horizontally scaled overlay rotation mode NO_ROTATION', function() {
        viewer = OpenSeadragon({
            id: 'example-overlays',
            prefixUrl: '/build/openseadragon/images/',
            tileSources: '/test/data/testpattern.dzi',
            springStiffness: 100, // Faster animation = faster tests
            degrees: 45,
            overlays: [{
                    id: "horizontally-scaled-overlay",
                    x: 0.5,
                    y: 0.5,
                    width: 1,
                    placement: OpenSeadragon.Placement.CENTER,
                    rotationMode: OpenSeadragon.OverlayRotationMode.NO_ROTATION
                }]
        });

        viewer.addOnceHandler('open', function() {
            var $overlay = $("#horizontally-scaled-overlay");
            var notScaledWidth = 100;
            var notScaledHeight = 100;
            $overlay.get(0).style.height = notScaledHeight + "px";

            var viewport = viewer.viewport;
            var notScaledSize = viewport.deltaPointsFromPixelsNoRotate(
                new OpenSeadragon.Point(notScaledWidth, notScaledHeight));

            // Force refresh to takes new dimensions into account.
            viewer._drawOverlays();

            var expectedWidth = viewport.deltaPixelsFromPointsNoRotate(
                new OpenSeadragon.Point(1, 1)).x;
            var expectedPosition = viewport.viewportToViewerElementCoordinates(
                new OpenSeadragon.Point(0.5, 0.5))
                .minus(new OpenSeadragon.Point(expectedWidth / 2, notScaledHeight / 2));
            var actualPosition = $overlay.position();
            Util.assessNumericValue(actualPosition.left, expectedPosition.x, epsilon,
                "Horizontally scaled overlay position.x should adjust to rotation.");
            Util.assessNumericValue(actualPosition.top, expectedPosition.y, epsilon,
                "Horizontally scaled overlay position.y should adjust to rotation.");

            var actualWidth = $overlay.width();
            var actualHeight = $overlay.height();
            Util.assessNumericValue(actualWidth, expectedWidth, epsilon,
                "Horizontally scaled overlay width should not adjust to rotation.");
            Util.assessNumericValue(actualHeight, notScaledHeight, epsilon,
                "Horizontally scaled overlay height should not adjust to rotation.");

            var actualBounds = viewer.getOverlayById("horizontally-scaled-overlay")
                .getBounds(viewport);
            var expectedBounds = new OpenSeadragon.Rect(
                0, 0.5 - notScaledSize.y / 2, 1, notScaledSize.y)
                .rotate(-45, new OpenSeadragon.Point(0.5, 0.5));
            ok(expectedBounds.equals(actualBounds),
                "The horizontally scaled overlay should have bounds " +
                expectedBounds + " but found " + actualBounds);

            start();
        });
    });

    // ----------
    asyncTest('Vertically scaled overlay rotation mode NO_ROTATION', function() {
        viewer = OpenSeadragon({
            id: 'example-overlays',
            prefixUrl: '/build/openseadragon/images/',
            tileSources: '/test/data/testpattern.dzi',
            springStiffness: 100, // Faster animation = faster tests
            degrees: 45,
            overlays: [{
                    id: "vertically-scaled-overlay",
                    x: 0,
                    y: 0.5,
                    height: 1,
                    placement: OpenSeadragon.Placement.LEFT,
                    rotationMode: OpenSeadragon.OverlayRotationMode.NO_ROTATION
                }]
        });

        viewer.addOnceHandler('open', function() {
            var $overlay = $("#vertically-scaled-overlay");
            var notScaledWidth = 100;
            var notScaledHeight = 100;
            $overlay.get(0).style.width = notScaledWidth + "px";

            var viewport = viewer.viewport;
            var notScaledSize = viewport.deltaPointsFromPixelsNoRotate(
                new OpenSeadragon.Point(notScaledWidth, notScaledHeight));

            // Force refresh to takes new dimensions into account.
            viewer._drawOverlays();

            var expectedHeight = viewport.deltaPixelsFromPointsNoRotate(
                new OpenSeadragon.Point(1, 1)).y;
            var expectedPosition = viewport.viewportToViewerElementCoordinates(
                new OpenSeadragon.Point(0, 0.5))
                .minus(new OpenSeadragon.Point(0, expectedHeight / 2));
            var actualPosition = $overlay.position();
            Util.assessNumericValue(actualPosition.left, expectedPosition.x, epsilon,
                "Vertically scaled overlay position.x should adjust to rotation.");
            Util.assessNumericValue(actualPosition.top, expectedPosition.y, epsilon,
                "Vertically scaled overlay position.y should adjust to rotation.");

            var actualWidth = $overlay.width();
            var actualHeight = $overlay.height();
            Util.assessNumericValue(actualWidth, notScaledWidth, epsilon,
                "Vertically scaled overlay width should not adjust to rotation.");
            Util.assessNumericValue(actualHeight, expectedHeight, epsilon,
                "Vertically scaled overlay height should not adjust to rotation.");

            var actualBounds = viewer.getOverlayById("vertically-scaled-overlay")
                .getBounds(viewport);
            var expectedBounds = new OpenSeadragon.Rect(
                0, 0, notScaledSize.x, 1)
                .rotate(-45, new OpenSeadragon.Point(0, 0.5));
            ok(expectedBounds.equals(actualBounds),
                "The vertically scaled overlay should have bounds " +
                expectedBounds + " but found " + actualBounds);

            start();
        });
    });

    // ----------
    asyncTest('Not scaled overlay rotation mode NO_ROTATION', function() {
        viewer = OpenSeadragon({
            id: 'example-overlays',
            prefixUrl: '/build/openseadragon/images/',
            tileSources: '/test/data/testpattern.dzi',
            springStiffness: 100, // Faster animation = faster tests
            degrees: 45,
            overlays: [{
                    id: "not-scaled-overlay",
                    x: 1,
                    y: 0,
                    placement: OpenSeadragon.Placement.TOP_RIGHT,
                    rotationMode: OpenSeadragon.OverlayRotationMode.NO_ROTATION
                }]
        });

        viewer.addOnceHandler('open', function() {
            var $overlay = $("#not-scaled-overlay");
            var notScaledWidth = 100;
            var notScaledHeight = 100;
            $overlay.get(0).style.width = notScaledWidth + "px";
            $overlay.get(0).style.height = notScaledHeight + "px";

            var viewport = viewer.viewport;
            var notScaledSize = viewport.deltaPointsFromPixelsNoRotate(
                new OpenSeadragon.Point(notScaledWidth, notScaledHeight));

            // Force refresh to takes new dimensions into account.
            viewer._drawOverlays();

            var expectedPosition = viewport.viewportToViewerElementCoordinates(
                new OpenSeadragon.Point(1, 0))
                .minus(new OpenSeadragon.Point(notScaledWidth, 0));
            var actualPosition = $overlay.position();
            Util.assessNumericValue(actualPosition.left, expectedPosition.x, epsilon,
                "Not scaled overlay position.x should adjust to rotation.");
            Util.assessNumericValue(actualPosition.top, expectedPosition.y, epsilon,
                "Not scaled overlay position.y should adjust to rotation.");

            var actualWidth = $overlay.width();
            var actualHeight = $overlay.height();
            Util.assessNumericValue(actualWidth, notScaledWidth, epsilon,
                "Not scaled overlay width should not adjust to rotation.");
            Util.assessNumericValue(actualHeight, notScaledHeight, epsilon,
                "Not scaled overlay height should not adjust to rotation.");

            var actualBounds = viewer.getOverlayById("not-scaled-overlay")
                .getBounds(viewport);
            var expectedBounds = new OpenSeadragon.Rect(
                1 - notScaledSize.x, 0, notScaledSize.x, notScaledSize.y)
                .rotate(-45, new OpenSeadragon.Point(1, 0));
            ok(expectedBounds.equals(actualBounds),
                "Not scaled overlay should have bounds " +
                expectedBounds + " but found " + actualBounds);

            start();
        });
    });

    // ----------
    asyncTest('Fully scaled overlay rotation mode BOUNDING_BOX', function() {
        viewer = OpenSeadragon({
            id: 'example-overlays',
            prefixUrl: '/build/openseadragon/images/',
            tileSources: '/test/data/testpattern.dzi',
            springStiffness: 100, // Faster animation = faster tests
            degrees: 45,
            overlays: [{
                    id: "fully-scaled-overlay",
                    x: 1,
                    y: 1,
                    width: 1,
                    height: 1,
                    placement: OpenSeadragon.Placement.BOTTOM_RIGHT,
                    rotationMode: OpenSeadragon.OverlayRotationMode.BOUNDING_BOX
                }]
        });

        viewer.addOnceHandler('open', function() {
            var viewport = viewer.viewport;

            var $overlay = $("#fully-scaled-overlay");
            var expectedRect = viewport.viewportToViewerElementRectangle(
                new OpenSeadragon.Rect(0, 0, 1, 1)).getBoundingBox();
            var actualPosition = $overlay.position();
            Util.assessNumericValue(actualPosition.left, expectedRect.x, epsilon,
                "Scaled overlay position.x should adjust to rotation.");
            Util.assessNumericValue(actualPosition.top, expectedRect.y, epsilon,
                "Scaled overlay position.y should adjust to rotation.");

            var actualWidth = $overlay.width();
            var actualHeight = $overlay.height();
            Util.assessNumericValue(actualWidth, expectedRect.width, epsilon,
                "Scaled overlay width should not adjust to rotation.");
            Util.assessNumericValue(actualHeight, expectedRect.height, epsilon,
                "Scaled overlay height should not adjust to rotation.");

            var actualBounds = viewer.getOverlayById("fully-scaled-overlay")
                .getBounds(viewport);
            var expectedBounds = new OpenSeadragon.Rect(
                    0.5, -0.5, Math.sqrt(2), Math.sqrt(2), 45);
            var boundsEpsilon = 0.000001;
            Util.assessNumericValue(actualBounds.x, expectedBounds.x, boundsEpsilon,
                "The fully scaled overlay should have adjusted bounds.x");
            Util.assessNumericValue(actualBounds.y, expectedBounds.y, boundsEpsilon,
                "The fully scaled overlay should have adjusted bounds.y");
            Util.assessNumericValue(actualBounds.width, expectedBounds.width, boundsEpsilon,
                "The fully scaled overlay should have adjusted bounds.width");
            Util.assessNumericValue(actualBounds.height, expectedBounds.height, boundsEpsilon,
                "The fully scaled overlay should have adjusted bounds.height");
            Util.assessNumericValue(actualBounds.degrees, expectedBounds.degrees, boundsEpsilon,
                "The fully scaled overlay should have adjusted bounds.degrees");

            start();
        });
    });

    // ----------
    asyncTest('Fully scaled overlay rotation mode EXACT', function() {
        viewer = OpenSeadragon({
            id: 'example-overlays',
            prefixUrl: '/build/openseadragon/images/',
            tileSources: '/test/data/testpattern.dzi',
            springStiffness: 100, // Faster animation = faster tests
            degrees: 45,
            overlays: [{
                    id: "fully-scaled-overlay",
                    x: 1,
                    y: 1,
                    width: 1,
                    height: 1,
                    placement: OpenSeadragon.Placement.BOTTOM_RIGHT,
                    rotationMode: OpenSeadragon.OverlayRotationMode.EXACT
                }]
        });

        viewer.addOnceHandler('open', function() {
            var viewport = viewer.viewport;

            var $overlay = $("#fully-scaled-overlay");
            var expectedSize = viewport.deltaPixelsFromPointsNoRotate(
                new OpenSeadragon.Point(1, 1));
            var expectedPosition = viewport.pixelFromPoint(
                new OpenSeadragon.Point(1, 1))
                .minus(expectedSize);
            // We can't rely on jQuery.position with transforms.
            var actualStyle = $overlay.get(0).style;
            var left = Number(actualStyle.left.replace("px", ""));
            var top = Number(actualStyle.top.replace("px", ""));
            Util.assessNumericValue(left, expectedPosition.x, epsilon,
                "Scaled overlay position.x should adjust to rotation.");
            Util.assessNumericValue(top, expectedPosition.y, epsilon,
                "Scaled overlay position.y should adjust to rotation.");

            var actualWidth = $overlay.width();
            var actualHeight = $overlay.height();
            Util.assessNumericValue(actualWidth, expectedSize.x, epsilon,
                "Scaled overlay width should not adjust to rotation.");
            Util.assessNumericValue(actualHeight, expectedSize.y, epsilon,
                "Scaled overlay height should not adjust to rotation.");

            var transformOriginProp = OpenSeadragon.getCssPropertyWithVendorPrefix(
                'transformOrigin');
            var transformProp = OpenSeadragon.getCssPropertyWithVendorPrefix(
                'transform');
            var transformOrigin = actualStyle[transformOriginProp];
            // Some browsers replace "right bottom" by "100% 100%"
            ok(transformOrigin.match(/(100% 100%)|(right bottom)/),
                "Transform origin should be right bottom. Got: " + transformOrigin);
            equal(actualStyle[transformProp], "rotate(45deg)",
                "Transform should be rotate(45deg).");

            var actualBounds = viewer.getOverlayById("fully-scaled-overlay")
                .getBounds(viewport);
            var expectedBounds = new OpenSeadragon.Rect(0, 0, 1, 1);
            ok(expectedBounds.equals(actualBounds),
                "The fully scaled overlay should have bounds " +
                expectedBounds + " but found " + actualBounds);

            start();
        });
    });
})();
