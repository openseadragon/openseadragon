QUnit.config.autostart = false;

(function () {
    var viewer,
        displayRegion,
        navigator,
        navigatorAspectRatio,
        leftScalingFactor,
        maxHeightFactor,
        contentStartFromLeft,
        contentStartFromTop,
        displayRegionWidth,
        displayRegionHeight;

    module("navigator", {
        setup:function () {
            resetDom();
            resetTestVariables();
        }
    });

    $(document).ready(function () {
        start();
    });

    var resetTestVariables = function () {
        if (viewer != null) {
            viewer.close();
        }
        displayRegion = null;
        navigator = null;
        navigatorAspectRatio = null;
        leftScalingFactor = null;
        maxHeightFactor = null;
        contentStartFromLeft = null;
        contentStartFromTop = null;
        displayRegionWidth = null;
        displayRegionHeight = null;
    };

    var resetDom = function () {
        if ($('#exampleNavigator').is(':ui-dialog')) {
            $('#exampleNavigator').dialog('destroy');
        }
        $("#exampleNavigator").remove();
        $(".navigator").remove();
        $("#example").empty();
        $("#tallexample").empty();
        $("#wideexample").empty();
        $("#example").parent().append('<div id="exampleNavigator"></div>');
    };

    var equalsWithVariance = function (value1, value2, variance) {
        return Math.abs(value1 - value2) <= variance;
    };


    var assessNumericValue = function (value1, value2, variance, message) {
        ok(equalsWithVariance(value1, value2, variance), message + " Expected:" + value1 + " Found: " + value2 + " Variance: " + variance);
    };

    var assessNavigatorLocation = function (expectedX, expectedY) {
        var navigator = $(".navigator");

        assessNumericValue(expectedX, navigator.offset().left, 4, ' Navigator x position');
        assessNumericValue(expectedY, navigator.offset().top, 4, ' Navigator y position');
    };

    var navigatorRegionBoundsInPoints = function () {
        var regionBoundsInPoints,
            expectedDisplayRegionWidth,
            expectedDisplayRegionHeight,
            expectedDisplayRegionXLocation,
            expectedDisplayRegionYLocation;
        if (navigator === null) {
            maxHeightFactor = 1;
            navigator = $(".navigator");
            navigatorAspectRatio = navigator.height() / navigator.width();
            leftScalingFactor = navigatorAspectRatio * viewer.source.aspectRatio;
            if (viewer.source.aspectRatio < 1) {
                if (viewer.source.aspectRatio < navigatorAspectRatio) {
                    maxHeightFactor = viewer.source.aspectRatio * navigatorAspectRatio;
                }
                else {
                    maxHeightFactor = viewer.source.aspectRatio;
                }
                contentStartFromLeft = ((1 / maxHeightFactor) - 1) / 2 * maxHeightFactor * navigator.width();
                contentStartFromTop = 0;
            }
            else {
                if (viewer.source.aspectRatio < navigatorAspectRatio) {
                    contentStartFromTop = (navigatorAspectRatio - (1 / viewer.source.aspectRatio)) / 2 / navigatorAspectRatio * navigator.height();
                }
                else {
                    contentStartFromTop = (navigatorAspectRatio - (1 / viewer.source.aspectRatio)) / 2 / navigatorAspectRatio * navigator.height();
                    leftScalingFactor = 1;
                }
            }
            displayRegionWidth = navigator.width() - 2 * contentStartFromLeft;
            displayRegionHeight = navigator.height() - 2 * contentStartFromTop;
        }

        expectedDisplayRegionWidth = navigator.width() / viewer.viewport.getZoom() * maxHeightFactor;
        expectedDisplayRegionHeight = navigator.height() / viewer.viewport.getZoom() * maxHeightFactor;
        expectedDisplayRegionXLocation = viewer.viewport.getBounds().x * maxHeightFactor * navigator.width() + contentStartFromLeft;
        expectedDisplayRegionYLocation = viewer.viewport.getBounds().y * leftScalingFactor * navigator.width() + contentStartFromTop;
        regionBoundsInPoints = new OpenSeadragon.Rect(expectedDisplayRegionXLocation, expectedDisplayRegionYLocation, expectedDisplayRegionWidth, expectedDisplayRegionHeight);

        return regionBoundsInPoints;

    };

    var assessDisplayRegion = function (status) {

        var expectedBounds = navigatorRegionBoundsInPoints();
        assessNumericValue(expectedBounds.width, displayRegion.width() + viewer.navigator.totalBorderWidths.x, 2, status + ' Width synchronization');
        assessNumericValue(expectedBounds.height, displayRegion.height() + viewer.navigator.totalBorderWidths.y, 2, status + ' Height synchronization');
        assessNumericValue(expectedBounds.x, displayRegion.position().left, 2, status + ' Left synchronization');
        assessNumericValue(expectedBounds.y, displayRegion.position().top, 2, status + ' Top synchronization');
    };

    var waitForViewer = function () {
        return function (handler, count, lastDisplayRegionLeft, lastDisplayWidth) {
            var viewerAndNavigatorDisplayReady = false,
                currentDisplayRegionLeft,
                currentDisplayWidth;
            if (displayRegion === null) {
                displayRegion = $(".displayregion");
            }
            if (typeof count !== "number") {
                count = 0;
                lastDisplayRegionLeft = null;
                lastDisplayWidth = null;
            }
            try {
                currentDisplayRegionLeft = displayRegion.position().left;
                currentDisplayWidth = displayRegion.width();
                viewerAndNavigatorDisplayReady = viewer.drawer !== null &&
                    !viewer.drawer.needsUpdate() &&
                    currentDisplayWidth > 0 &&
                    equalsWithVariance(lastDisplayRegionLeft, currentDisplayRegionLeft, .0001) &&
                    equalsWithVariance(lastDisplayWidth, currentDisplayWidth, .0001) &&
                    equalsWithVariance(viewer.viewport.getBounds(true).x, viewer.viewport.getBounds().x, .0001) &&
                    equalsWithVariance(viewer.viewport.getBounds(true).y, viewer.viewport.getBounds().y, .0001) &&
                    equalsWithVariance(viewer.viewport.getBounds(true).width, viewer.viewport.getBounds().width, .0001);
            }
            catch (err) {
                //Ignore.  Subsequent code will try again shortly
            }
            if (( !viewerAndNavigatorDisplayReady) && count < 50) {
                count++;
                setTimeout(function () {
                    waitForViewer(handler, count, currentDisplayRegionLeft, currentDisplayWidth);
                }, 100)
            }
            else {
                if (count === 40) {
                    console.log("waitForViewer:" +
                        viewer.drawer + ":" + viewer.drawer.needsUpdate() + ":" +
                        viewerAndNavigatorDisplayReady + ":" +
                        lastDisplayRegionLeft + ":" + currentDisplayRegionLeft + ":" +
                        lastDisplayWidth + ":" + currentDisplayWidth + ":" +
                        viewer.viewport.getBounds(true).x + ":" + viewer.viewport.getBounds().x + ":" +
                        viewer.viewport.getBounds(true).y + ":" + viewer.viewport.getBounds().y + ":" +
                        viewer.viewport.getBounds(true).width + ":" + viewer.viewport.getBounds().width + ":" +
                        count);
                }
                handler();
            }
        };
    }();

    var simulateNavigatorClick = function (viewer, locationX, locationY) {
        var $canvas = $(viewer.element).find('.openseadragon-canvas'),
            offset = $canvas.offset(),
            event = {
                clientX:offset.left + locationX,
                clientY:offset.top + locationY
            };
        $canvas
            .simulate('mouseover', event)
            .simulate('mousedown', event)
            .simulate('mouseup', event);
    };

    var simulateNavigatorDrag = function (viewer, distanceX, distanceY) {
        var $canvas = $(viewer.element).find('.displayregion'),
            event = {
                dx:Math.floor(distanceX),
                dy:Math.floor(distanceY)
            };
        $canvas
            .simulate('drag', event);
    };

    var assessViewerInCorner = function (theContentCorner) {
        return function () {
            var expectedXCoordinate, expecteYCoordinate;
            if (theContentCorner === "TOPLEFT") {
                expectedXCoordinate = 0;
                expecteYCoordinate = 0;
            }
            else if (theContentCorner === "TOPRIGHT") {
                expectedXCoordinate = 1 - viewer.viewport.getBounds().width;
                expecteYCoordinate = 0;
            }
            else if (theContentCorner === "BOTTOMRIGHT") {
                expectedXCoordinate = 1 - viewer.viewport.getBounds().width;
                expecteYCoordinate = 1 / viewer.source.aspectRatio - viewer.viewport.getBounds().height;
            }
            else if (theContentCorner === "BOTTOMLEFT") {
                expectedXCoordinate = 0;
                expecteYCoordinate = 1 / viewer.source.aspectRatio - viewer.viewport.getBounds().height;
            }
            if (viewer.viewport.getBounds().width < 1) {
                assessNumericValue(expectedXCoordinate, viewer.viewport.getBounds().x, .04, ' Viewer at ' + theContentCorner + ', x coord');
            }
            if (viewer.viewport.getBounds().height < 1 / viewer.source.aspectRatio) {
                assessNumericValue(expecteYCoordinate, viewer.viewport.getBounds().y, .04, ' Viewer at ' + theContentCorner + ', y coord');
            }
        }
    };

    var assessViewerInCenter = function () {
        var yPositionVariance = .04;
        if (viewer.source.aspectRatio < 1) {
            yPositionVariance = yPositionVariance / viewer.source.aspectRatio;
        }
        assessNumericValue(1 / viewer.source.aspectRatio / 2, viewer.viewport.getCenter().y, yPositionVariance, ' Viewer at center, y coord');
        assessNumericValue(.5, viewer.viewport.getCenter().x, .4, ' Viewer at center, x coord');
    };

    var clickOnNavigator = function (theContentCorner) {
        return function () {
            var xPos,
                yPos;
            if (theContentCorner === "TOPLEFT") {
                xPos = contentStartFromLeft;
                yPos = contentStartFromTop;
            }
            else if (theContentCorner === "TOPRIGHT") {
                xPos = contentStartFromLeft + displayRegionWidth;
                yPos = contentStartFromTop;
            }
            else if (theContentCorner === "BOTTOMRIGHT") {
                xPos = contentStartFromLeft + displayRegionWidth;
                yPos = contentStartFromTop + displayRegionHeight;
            }
            else if (theContentCorner === "BOTTOMLEFT") {
                xPos = contentStartFromLeft;
                yPos = contentStartFromTop + displayRegionHeight;
            }
            simulateNavigatorClick(viewer.navigator, xPos, yPos);
        }
    };

    var dragNavigatorBackToCenter = function () {
        var start = viewer.viewport.getBounds().getTopLeft(),
            target = new OpenSeadragon.Point(0.5 - viewer.viewport.getBounds().width / 2,
                     1 / viewer.source.aspectRatio / 2 - viewer.viewport.getBounds().height / 2),
            delta = target.minus(start);
        if (viewer.source.aspectRatio < 1) {
                delta.y = delta.y * viewer.source.aspectRatio;
        }
        simulateNavigatorDrag(viewer.navigator, delta.x * displayRegionWidth, delta.y * displayRegionHeight);
    };

    var assessNavigatorViewerPlacement = function (seadragonProperties, testProperties) {
        var navigatorOperationScenarios = [
            {interactionOperation:clickOnNavigator("TOPRIGHT"),
              assessmentOperation:assessViewerInCorner("TOPRIGHT"),
                assessmentMessage:"After click on navigator on top right"  },
            {interactionOperation:dragNavigatorBackToCenter,
              assessmentOperation:assessViewerInCenter,
                assessmentMessage:"After drag on navigator from top right"  },
            {interactionOperation:clickOnNavigator("BOTTOMLEFT"),
              assessmentOperation:assessViewerInCorner("BOTTOMLEFT"),
                assessmentMessage:"After click on navigator on bottom left"  },
            {interactionOperation:dragNavigatorBackToCenter,
              assessmentOperation:assessViewerInCenter,
                assessmentMessage:"After drag on navigator from bottom left"  },
            {interactionOperation:clickOnNavigator("BOTTOMRIGHT"),
              assessmentOperation:assessViewerInCorner("BOTTOMRIGHT"),
                assessmentMessage:"After click on navigator on bottom right"  },
            {interactionOperation:dragNavigatorBackToCenter,
              assessmentOperation:assessViewerInCenter,
                assessmentMessage:"After drag on navigator from bottom right"  },
            {interactionOperation:clickOnNavigator("TOPLEFT"),
              assessmentOperation:assessViewerInCorner("TOPLEFT"),
                assessmentMessage:"After click on navigator on top left"  },
            {interactionOperation:dragNavigatorBackToCenter,
              assessmentOperation:assessViewerInCenter,
                assessmentMessage:"After drag on navigator from top left"  }
        ],
            autoHideWaitTime = 7500;

        seadragonProperties.visibilityRatio = 1;
        viewer = OpenSeadragon(seadragonProperties);

        var assessNavigatorOperationAndTakeNextStep = function (step) {
            return function () {
                var nextStep = step + 1;
                assessDisplayRegion(navigatorOperationScenarios[step].assessmentMessage);
                navigatorOperationScenarios[step].assessmentOperation();
                if (step === navigatorOperationScenarios.length - 1) {
                    start();
                }
                else {
                    navigatorOperationScenarios[nextStep].interactionOperation();
                    waitForViewer(assessNavigatorOperationAndTakeNextStep(nextStep));
                }
            };
        };

        var assessAfterDragOnViewer = function () {
            assessDisplayRegion("After pan");
            navigatorOperationScenarios[0].interactionOperation();
            waitForViewer(assessNavigatorOperationAndTakeNextStep(0));
        };

        var assessAfterZoomOnViewer = function () {
            var target = new OpenSeadragon.Point(0.4, 0.4);
            assessDisplayRegion("After image zoom");
            viewer.viewport.panTo(target);
            waitForViewer(assessAfterDragOnViewer);
        };

        var captureInitialStateThenAct = function () {
            assessDisplayRegion("After image load");

            testProperties.determineExpectationsAndAssessNavigatorLocation(seadragonProperties, testProperties);

            viewer.viewport.zoomTo(viewer.viewport.getZoom() * 2);
            waitForViewer(assessAfterZoomOnViewer);
        };

        var assessAutohideTriggered = function () {
            ok($(testProperties.navigatorLocator).parent().css("opacity") == 0, "Expecting navigator to be autohide when in the default location");
            waitForViewer(captureInitialStateThenAct);
        };

        var assessAutohideDisabled = function () {
            ok($(testProperties.navigatorLocator).parent().css("opacity") > 0, "Expecting navigator to be always visible when in a custom location");
            waitForViewer(captureInitialStateThenAct);
        };

        var openHandler = function () {
            viewer.removeHandler('open', openHandler);
            if (!testProperties.testAutohide) {
                waitForViewer(captureInitialStateThenAct);
            }
            else {
                ok($(testProperties.navigatorLocator).parent().css("opacity") > 0, "Expecting navigator to be visible initially");
                var event = {
                     clientX:1,
                     clientY:1
                 };
                 var body = $("body").simulate('mouseover', event);
                if (testProperties.expectedAutoHide) {
                    setTimeout(assessAutohideTriggered,autoHideWaitTime);
                }
                else {
                    setTimeout(assessAutohideDisabled,autoHideWaitTime);
                }
            }
        };
        viewer.addHandler('open', openHandler);
    };

    asyncTest('DefaultNavigatorLocationWithWideImageTallViewer', function () {
        assessNavigatorViewerPlacement({
                id:'tallexample',
                prefixUrl:'/build/openseadragon/images/',
                tileSources:'/test/data/wide.dzi',
                showNavigator:true
            },
            {
                displayRegionLocator:'.navigator .displayregion',
                navigatorLocator:'.navigator',
                testAutohide: false,
                expectedAutoHide: false,
                determineExpectationsAndAssessNavigatorLocation:function (seadragonProperties, testProperties) {
                    var mainViewerElement = $("#" + seadragonProperties.id),
                        navigatorElement = $(testProperties.navigatorLocator);
                    assessNavigatorLocation(mainViewerElement.offset().left + mainViewerElement.width() - navigatorElement.width(),
                        mainViewerElement.offset().top);
                }
            });
    });

    asyncTest('CustomNavigatorLocationWithWideImageWideViewer', function () {
        assessNavigatorViewerPlacement({
                id:'wideexample',
                navigatorId:'exampleNavigator',
                prefixUrl:'/build/openseadragon/images/',
                tileSources:'/test/data/wide.dzi',
                showNavigator:true
            },
            {
                displayRegionLocator:'#exampleNavigator .displayregion',
                navigatorLocator:'#exampleNavigator',
                testAutohide: false,
                expectedAutoHide: true,
                determineExpectationsAndAssessNavigatorLocation:function (seadragonProperties, testProperties) {
                    var mainViewerElement = $("#" + seadragonProperties.id),
                        navigatorViewerElement = $("#" + seadragonProperties.navigatorId);
                    assessNavigatorLocation(mainViewerElement.offset().left,
                        mainViewerElement.offset().top - navigatorViewerElement.parent().height());
                }
            });
    });

    asyncTest('CustomDialogNavigatorLocationWithTallImageTallViewer', function () {
        $('#exampleNavigator').dialog();
        assessNavigatorViewerPlacement({
                id:'tallexample',
                navigatorId:'exampleNavigator',
                prefixUrl:'/build/openseadragon/images/',
                tileSources:'/test/data/tall.dzi',
                showNavigator:true
            },
            {
                displayRegionLocator:'#exampleNavigator .displayregion',
                navigatorLocator:'#exampleNavigator',
                testAutohide: true,
                expectedAutoHide: false,
                determineExpectationsAndAssessNavigatorLocation:function (seadragonProperties, testProperties) {
                    var jqueryDialog = $(testProperties.navigatorLocator);
                    assessNavigatorLocation(jqueryDialog.offset().left,
                        jqueryDialog.offset().top);
                }
            });
    });

    asyncTest('DefaultNavigatorLocationWithTallImageWideViewer', function () {
        assessNavigatorViewerPlacement({
                id:'wideexample',
                prefixUrl:'/build/openseadragon/images/',
                tileSources:'/test/data/tall.dzi',
                showNavigator:true
            },
            {
                displayRegionLocator:'.navigator .displayregion',
                navigatorLocator:'.navigator',
                testAutohide: true,
                expectedAutoHide: true,
                determineExpectationsAndAssessNavigatorLocation:function (seadragonProperties, testProperties) {
                    var mainViewerElement = $("#" + seadragonProperties.id),
                        navigatorElement = $(testProperties.navigatorLocator);
                    assessNavigatorLocation(mainViewerElement.offset().left + mainViewerElement.width() - navigatorElement.width(),
                        mainViewerElement.offset().top);
                }
            });
    });

})();
