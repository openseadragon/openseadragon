/* global QUnit, module, Util, $, console, test, asyncTest, start, ok, equal */

QUnit.config.autostart = false;

(function () {
    var debug = false,
        viewer,
        displayRegion,
        navigator,
        navigatorScaleFactor,
        contentStartFromLeft,
        contentStartFromTop,
        displayRegionWidth,
        displayRegionHeight,
        topNavigatorClickAdjustment;

    module("navigator", {
        setup: function () {
            Util.initializeTestDOM();
            resetTestVariables();
            $(document).scrollTop(0);
            $(document).scrollLeft(0);
        },
        teardown: function () {
            // jQuery UI creates its controls outside the normal DOM hierarchy which QUnit cleans up:
            if ($('#exampleNavigator').is(':ui-dialog')) {
                $('#exampleNavigator').dialog('destroy');
            }

            resetTestVariables();
        }
    });

    $(document).ready(function () {
        start();
    });

    var resetTestVariables = function () {
        if (viewer) {
            viewer.close();
        }
        displayRegion = null;
        navigator = null;
        navigatorScaleFactor = null;
        contentStartFromLeft = null;
        contentStartFromTop = null;
        displayRegionWidth = null;
        displayRegionHeight = null;
        topNavigatorClickAdjustment = 0;
    };

    var assessNavigatorLocation = function (expectedX, expectedY) {
        var navigator = $(".navigator");

        Util.assessNumericValue(expectedX, navigator.offset().left, 10, ' Navigator x Position');
        Util.assessNumericValue(expectedY, navigator.offset().top, 10, ' Navigator y Position');
    };

    var assessNavigatorSize = function (expectedWidth, expectedHeight, msg) {
        var navigator = $(".navigator");

        Util.assessNumericValue(expectedWidth, navigator.width(), 2, ' Navigator Width ' + (msg ? msg : ''));
        Util.assessNumericValue(expectedHeight, navigator.height(), 2, ' Navigator Height ' + (msg ? msg : ''));
    };

    var assessNavigatorAspectRatio = function (expectedAspectRatio, variance, msg) {
        var navigator = $(".navigator");

        Util.assessNumericValue(expectedAspectRatio, navigator.width() / navigator.height(), variance, ' Navigator Aspect Ratio ' + (msg ? msg : ''));
    };

    var assessNavigatorArea = function (expectedArea, msg) {
        var navigator = $(".navigator");

        Util.assessNumericValue(expectedArea, navigator.width() * navigator.height(), Math.max(navigator.width(), navigator.height()), ' Navigator Area ' + (msg ? msg : ''));
    };

    var navigatorRegionBoundsInPoints = function () {
        var regionBoundsInPoints,
            expectedDisplayRegionWidth,
            expectedDisplayRegionHeight,
            expectedDisplayRegionXLocation,
            expectedDisplayRegionYLocation;

        if (navigator === null) {
            navigator = $(".navigator");
            navigatorScaleFactor = Math.min(navigator.width() / viewer.viewport.contentSize.x, navigator.height() / viewer.viewport.contentSize.y);
            displayRegionWidth = viewer.viewport.contentSize.x * navigatorScaleFactor;
            displayRegionHeight = viewer.viewport.contentSize.y * navigatorScaleFactor;
            contentStartFromLeft = (navigator.width() - displayRegionWidth) / 2;
            contentStartFromTop = (navigator.height() - displayRegionHeight) / 2;
        }
        expectedDisplayRegionWidth = viewer.viewport.getBounds().width * displayRegionWidth;
        expectedDisplayRegionHeight = viewer.viewport.getBounds().height * displayRegionHeight * viewer.source.aspectRatio;
        expectedDisplayRegionXLocation = viewer.viewport.getBounds().x * displayRegionWidth + contentStartFromLeft;
        expectedDisplayRegionYLocation = viewer.viewport.getBounds().y * displayRegionHeight * viewer.source.aspectRatio + contentStartFromTop;
        regionBoundsInPoints = new OpenSeadragon.Rect(expectedDisplayRegionXLocation, expectedDisplayRegionYLocation, expectedDisplayRegionWidth, expectedDisplayRegionHeight);

        if (debug) {
            console.log('Image width: ' + viewer.viewport.contentSize.x + '\n' +
                        'Image height: ' + viewer.viewport.contentSize.y + '\n' +
                        'navigator.width(): ' + navigator.width() + '\n' +
                        'navigator.height(): ' + navigator.height() + '\n' +
                        'navigatorScaleFactor: ' + navigatorScaleFactor + '\n' +
                        'contentStartFromLeft: ' + contentStartFromLeft + '\n' +
                        'contentStartFromTop: ' + contentStartFromTop + '\n' +
                        'displayRegionWidth: ' + displayRegionWidth + '\n' +
                        'displayRegionHeight: ' + displayRegionHeight + '\n' +
                        'expectedDisplayRegionXLocation: ' + expectedDisplayRegionXLocation + '\n' +
                        'expectedDisplayRegionYLocation: ' + expectedDisplayRegionYLocation + '\n' +
                        'expectedDisplayRegionWidth: ' + expectedDisplayRegionWidth + '\n' +
                        'expectedDisplayRegionHeight: ' + expectedDisplayRegionHeight + '\n'
            );
        }

        return regionBoundsInPoints;

    };

    var assessDisplayRegion = function (status) {

        if (debug) {
            console.log(status);
        }
        var expectedBounds = navigatorRegionBoundsInPoints();
        Util.assessNumericValue(expectedBounds.width, displayRegion.width() + viewer.navigator.totalBorderWidths.x, 2, status + ' Width synchronization');
        Util.assessNumericValue(expectedBounds.height, displayRegion.height() + viewer.navigator.totalBorderWidths.y, 2, status + ' Height synchronization');
        Util.assessNumericValue(expectedBounds.x, displayRegion.position().left, 2, status + ' Left synchronization');
        Util.assessNumericValue(expectedBounds.y, displayRegion.position().top, 2, status + ' Top synchronization');
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
                    Util.equalsWithVariance(lastDisplayRegionLeft, currentDisplayRegionLeft, 0.0001) &&
                    Util.equalsWithVariance(lastDisplayWidth, currentDisplayWidth, 0.0001) &&
                    Util.equalsWithVariance(viewer.viewport.getBounds(true).x, viewer.viewport.getBounds().x, 0.0001) &&
                    Util.equalsWithVariance(viewer.viewport.getBounds(true).y, viewer.viewport.getBounds().y, 0.0001) &&
                    Util.equalsWithVariance(viewer.viewport.getBounds(true).width, viewer.viewport.getBounds().width, 0.0001);
            }
            catch (err) {
                //Ignore.  Subsequent code will try again shortly
            }
            if (( !viewerAndNavigatorDisplayReady) && count < 50) {
                count++;
                setTimeout(function () {
                    waitForViewer(handler, count, currentDisplayRegionLeft, currentDisplayWidth);
                }, 100);
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
        //Assumes that the page has not been scrolled from the top or left
        var $canvas = $(viewer.element).find('.openseadragon-canvas'),
            offset = $canvas.offset(),
            event = {
                clientX:offset.left + locationX,
                clientY:offset.top + locationY
            };
        $canvas
            .simulate(OpenSeadragon.MouseTracker.haveMouseEnter ? 'mouseenter' : 'mouseover', event)
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
                Util.assessNumericValue(expectedXCoordinate, viewer.viewport.getBounds().x, 0.04, ' Viewer at ' + theContentCorner + ', x coord');
            }
            if (viewer.viewport.getBounds().height < 1 / viewer.source.aspectRatio) {
                Util.assessNumericValue(expecteYCoordinate, viewer.viewport.getBounds().y, 0.04, ' Viewer at ' + theContentCorner + ', y coord');
            }
        };
    };

    var assessViewerInCenter = function () {
        var yPositionVariance = 0.04;
        if (viewer.source.aspectRatio < 1) {
            yPositionVariance = yPositionVariance / viewer.source.aspectRatio;
        }
        Util.assessNumericValue(1 / viewer.source.aspectRatio / 2, viewer.viewport.getCenter().y, yPositionVariance, ' Viewer at center, y coord');
        Util.assessNumericValue(0.5, viewer.viewport.getCenter().x, 0.4, ' Viewer at center, x coord');
    };

    var clickOnNavigator = function (theContentCorner) {
        return function () {
            var xPos,
                yPos;
            if (theContentCorner === "TOPLEFT") {
                xPos = contentStartFromLeft;
                yPos = contentStartFromTop + topNavigatorClickAdjustment;
            }
            else if (theContentCorner === "TOPRIGHT") {
                xPos = contentStartFromLeft + displayRegionWidth;
                yPos = contentStartFromTop+ topNavigatorClickAdjustment;
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
        };
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

    var resizeElement = function ($element, width, height) {
        $element.width(width);
        $element.height(height);
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
            viewerResizeScenarios = [
                {resizeFactorX:0.5, resizeFactorY:1.0, assessmentMessage:"After Viewer Resize (50%, 100%)"},
                {resizeFactorX:1.0, resizeFactorY:0.5, assessmentMessage:"After Viewer Resize (100%, 50%)"},
                {resizeFactorX:1.0, resizeFactorY:1.0, assessmentMessage:"After Viewer Resize (100%, 100%)"}
            ],
            navigatorResizeScenarios = [
                {resizeFactorX:0.75, resizeFactorY:1.0, assessmentMessage:"After Navigator Resize (75%, 100%)"},
                {resizeFactorX:1.0, resizeFactorY:0.75, assessmentMessage:"After Navigator Resize (100%, 75%)"},
                {resizeFactorX:1.0, resizeFactorY:1.0, assessmentMessage:"After Navigator Resize (100%, 100%)"}
            ],
            autoFadeWaitTime = 100,
            navigatorElement = null,
            viewerElement = null,
            viewerOriginalSize = null,
            navigatorOriginalSize = null;

        seadragonProperties.visibilityRatio = 1;
        viewer = OpenSeadragon(seadragonProperties);

        if ($.isNumeric(testProperties.topNavigatorClickAdjustment))
        {
            topNavigatorClickAdjustment = testProperties.topNavigatorClickAdjustment;
        }

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

        var assessAfterSnapback = function () {
            assessDisplayRegion("After snapback");
            navigatorOperationScenarios[0].interactionOperation();
            waitForViewer(assessNavigatorOperationAndTakeNextStep(0));
        };

        var assessAfterDragOnViewer = function () {
            assessDisplayRegion("After pan");
            viewer.viewport.applyConstraints();
            waitForViewer(assessAfterSnapback);
        };

        var assessAfterZoomOnViewer = function () {
            var target = new OpenSeadragon.Point(0.4, 0.4);
            assessDisplayRegion("After image zoom");
            viewer.viewport.panTo(target);
            waitForViewer(assessAfterDragOnViewer);
        };

        var assessAfterResizeNavigator = function () {
            viewer.viewport.zoomTo(viewer.viewport.getZoom() * 2);
            waitForViewer(assessAfterZoomOnViewer);
        };

        var assessNavigatorResizeAndTakeNextStep = function (step) {
            return function () {
                var nextStep = step + 1;
                assessNavigatorSize(navigatorOriginalSize.x * navigatorResizeScenarios[step].resizeFactorX, navigatorOriginalSize.y * navigatorResizeScenarios[step].resizeFactorY, navigatorResizeScenarios[step].assessmentMessage);
                assessDisplayRegion(navigatorResizeScenarios[step].assessmentMessage);
                if (step === viewerResizeScenarios.length - 1) {
                    assessAfterResizeNavigator();
                }
                else {
                    resizeElement(navigatorElement, navigatorOriginalSize.x * navigatorResizeScenarios[nextStep].resizeFactorX, navigatorOriginalSize.y * navigatorResizeScenarios[nextStep].resizeFactorY);
                    waitForViewer(assessNavigatorResizeAndTakeNextStep(nextStep));
                }
            };
        };

        var assessViewerResizeAndTakeNextStep = function (step) {
            return function () {
                var nextStep = step + 1;
                if (seadragonProperties.navigatorId) {
                    // Navigator hosted in outside element...size shouldn't change
                    assessNavigatorSize(navigatorOriginalSize.x, navigatorOriginalSize.y, viewerResizeScenarios[step].assessmentMessage);
                }
                else {
                    // Navigator hosted in viewer
                    if (seadragonProperties.navigatorPosition && seadragonProperties.navigatorPosition == 'ABSOLUTE') {
                        // Navigator positioned 'ABSOLUTE'...size shouldn't change
                        assessNavigatorSize(navigatorOriginalSize.x, navigatorOriginalSize.y, viewerResizeScenarios[step].assessmentMessage);
                    }
                    else {
                        // Navigator positioned 'TOP_LEFT', 'TOP_RIGHT', 'BOTTOM_LEFT', or 'BOTTOM_RIGHT'
                        if (seadragonProperties.navigatorMaintainSizeRatio) {
                            // Navigator should maintain aspect ratio and size proportioned to viewer size
                            assessNavigatorAspectRatio(viewerElement.width() / viewerElement.height(), 0.0001, viewerResizeScenarios[step].assessmentMessage);
                            assessNavigatorSize(viewerElement.width() * seadragonProperties.navigatorSizeRatio, viewerElement.height() * seadragonProperties.navigatorSizeRatio, viewerResizeScenarios[step].assessmentMessage);
                        }
                        else {
                            // Navigator should maintain aspect ratio and area
                            // Variances are loosened up here, since 1 pixel rounding difference in resizing to maintain area
                            //   can cause a relatively large difference in area and aspect ratio.
                            assessNavigatorAspectRatio(viewerElement.width() / viewerElement.height(), 0.1, viewerResizeScenarios[step].assessmentMessage);
                            assessNavigatorArea(navigatorOriginalSize.x * navigatorOriginalSize.y, viewerResizeScenarios[step].assessmentMessage);
                        }
                    }
                }

                if (step === viewerResizeScenarios.length - 1) {
                    if (seadragonProperties.navigatorId) {
                        // Navigator hosted in outside element...run navigator resize tests
                        resizeElement(navigatorElement, navigatorOriginalSize.x * navigatorResizeScenarios[0].resizeFactorX, navigatorOriginalSize.y * navigatorResizeScenarios[0].resizeFactorY);
                        waitForViewer(assessNavigatorResizeAndTakeNextStep(0));
                    }
                    else {
                        // Navigator hosted in viewer...skip navigator resize tests
                        assessAfterResizeNavigator();
                    }
                }
                else {
                    resizeElement(viewerElement, viewerOriginalSize.x * viewerResizeScenarios[nextStep].resizeFactorX, viewerOriginalSize.y * viewerResizeScenarios[nextStep].resizeFactorY);
                    waitForViewer(assessViewerResizeAndTakeNextStep(nextStep));
                }
            };
        };

        var captureInitialStateThenAct = function () {
            assessDisplayRegion("After image load");

            testProperties.determineExpectationsAndAssessNavigatorLocation(seadragonProperties, testProperties);

            viewerOriginalSize = new OpenSeadragon.Point(viewerElement.width(), viewerElement.height());
            navigatorOriginalSize = new OpenSeadragon.Point(navigatorElement.width(), navigatorElement.height());

            resizeElement(viewerElement, viewerOriginalSize.x * viewerResizeScenarios[0].resizeFactorX, viewerOriginalSize.y * viewerResizeScenarios[0].resizeFactorY);
            waitForViewer(assessViewerResizeAndTakeNextStep(0));
        };

        var assessAutoFadeTriggered = function () {
            ok(navigatorElement.parent().css("opacity") < 1, "Expecting navigator to be autofade when in the default location");
            waitForViewer(captureInitialStateThenAct);
        };

        var assessAutoFadeDisabled = function () {
            ok(navigatorElement.parent().css("opacity") > 0, "Expecting navigator to be always visible when in a custom location");
            waitForViewer(captureInitialStateThenAct);
        };

        var openHandler = function () {
            viewer.removeHandler('open', openHandler);
            navigatorElement = $(testProperties.navigatorLocator);
            viewerElement = $("#" + seadragonProperties.id);
            //TODO This should be testProperties.testAutoFade, but test hangs. Fix this!
            if (!testProperties.testAutohide) {
                waitForViewer(captureInitialStateThenAct);
            }
            else {
                ok(navigatorElement.parent().css("opacity") > 0, "Expecting navigator to be visible initially");
                var event = {
                     clientX:1,
                     clientY:1
                 };

                viewerElement.simulate('blur', event);

                if (testProperties.expectedAutoFade) {
                    setTimeout(assessAutoFadeTriggered,autoFadeWaitTime);
                } else {
                    setTimeout(assessAutoFadeDisabled,autoFadeWaitTime);
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
                showNavigator:true,
                navigatorSizeRatio:0.2,
                navigatorMaintainSizeRatio: false,
                animationTime:0
            },
            {
                displayRegionLocator:'.navigator .displayregion',
                navigatorLocator:'.navigator',
                testAutoFade: false,
                determineExpectationsAndAssessNavigatorLocation:function (seadragonProperties, testProperties) {
                    var mainViewerElement = $("#" + seadragonProperties.id),
                        navigatorElement = $(testProperties.navigatorLocator);
                    assessNavigatorLocation(mainViewerElement.offset().left + mainViewerElement.width() - navigatorElement.width(),
                        mainViewerElement.offset().top);
                    assessNavigatorSize(mainViewerElement.width() * seadragonProperties.navigatorSizeRatio, mainViewerElement.height() * seadragonProperties.navigatorSizeRatio);
                    assessNavigatorAspectRatio(mainViewerElement.width() / mainViewerElement.height(), 0.0001);
                }
            });
    });

    asyncTest('DefaultNavigatorLocationWithTallImageWideViewer', function () {
        assessNavigatorViewerPlacement({
                id:'wideexample',
                prefixUrl:'/build/openseadragon/images/',
                tileSources:'/test/data/tall.dzi',
                showNavigator:true,
                navigatorSizeRatio:0.2,
                navigatorMaintainSizeRatio: false,
                animationTime:0,
                controlsFadeDelay:0,
                controlsFadeLength:1
            },
            {
                displayRegionLocator:'.navigator .displayregion',
                navigatorLocator:'.navigator',
                testAutoFade: true,
                expectedAutoFade: true,
                determineExpectationsAndAssessNavigatorLocation:function (seadragonProperties, testProperties) {
                    var mainViewerElement = $("#" + seadragonProperties.id),
                        navigatorElement = $(testProperties.navigatorLocator);
                    assessNavigatorLocation(mainViewerElement.offset().left + mainViewerElement.width() - navigatorElement.width(),
                        mainViewerElement.offset().top);
                    assessNavigatorSize(mainViewerElement.width() * seadragonProperties.navigatorSizeRatio, mainViewerElement.height() * seadragonProperties.navigatorSizeRatio);
                    assessNavigatorAspectRatio(mainViewerElement.width() / mainViewerElement.height(), 0.0001);
                }
            });
    });

    asyncTest('TopLeftNavigatorLocation', function () {
        assessNavigatorViewerPlacement({
                id:'example',
                prefixUrl:'/build/openseadragon/images/',
                tileSources:'/test/data/testpattern.dzi',
                showNavigationControl: false,
                showNavigator:true,
                navigatorSizeRatio:0.2,
                navigatorMaintainSizeRatio: false,
                navigatorPosition: 'TOP_LEFT',
                animationTime:0,
                controlsFadeDelay:0,
                controlsFadeLength:1
            },
            {
                displayRegionLocator:'.navigator .displayregion',
                navigatorLocator:'.navigator',
                testAutoFade: true,
                expectedAutoFade: true,
                determineExpectationsAndAssessNavigatorLocation:function (seadragonProperties, testProperties) {
                    var mainViewerElement = $("#" + seadragonProperties.id),
                        navigatorElement = $(testProperties.navigatorLocator);
                    assessNavigatorLocation(mainViewerElement.offset().left,
                        mainViewerElement.offset().top);
                    assessNavigatorSize(mainViewerElement.width() * seadragonProperties.navigatorSizeRatio, mainViewerElement.height() * seadragonProperties.navigatorSizeRatio);
                    assessNavigatorAspectRatio(mainViewerElement.width() / mainViewerElement.height(), 0.0001);
                }
            });
    });

    asyncTest('TopRightNavigatorLocation', function () {
        assessNavigatorViewerPlacement({
                id:'example',
                prefixUrl:'/build/openseadragon/images/',
                tileSources:'/test/data/testpattern.dzi',
                showNavigationControl: false,
                showNavigator:true,
                navigatorSizeRatio:0.2,
                navigatorMaintainSizeRatio: true,
                navigatorPosition: 'TOP_RIGHT',
                animationTime:0,
                controlsFadeDelay:0,
                controlsFadeLength:1
            },
            {
                displayRegionLocator:'.navigator .displayregion',
                navigatorLocator:'.navigator',
                testAutoFade: true,
                expectedAutoFade: true,
                determineExpectationsAndAssessNavigatorLocation:function (seadragonProperties, testProperties) {
                    var mainViewerElement = $("#" + seadragonProperties.id),
                        navigatorElement = $(testProperties.navigatorLocator);
                    assessNavigatorLocation(mainViewerElement.offset().left + mainViewerElement.width() - navigatorElement.width(),
                        mainViewerElement.offset().top);
                    assessNavigatorSize(mainViewerElement.width() * seadragonProperties.navigatorSizeRatio, mainViewerElement.height() * seadragonProperties.navigatorSizeRatio);
                    assessNavigatorAspectRatio(mainViewerElement.width() / mainViewerElement.height(), 0.0001);
                }
            });
    });

    asyncTest('BottomLeftNavigatorLocation', function () {
        assessNavigatorViewerPlacement({
                id:'example',
                prefixUrl:'/build/openseadragon/images/',
                tileSources:'/test/data/testpattern.dzi',
                showNavigationControl: false,
                showNavigator:true,
                navigatorSizeRatio:0.2,
                navigatorMaintainSizeRatio: false,
                navigatorPosition: 'BOTTOM_LEFT',
                animationTime:0,
                controlsFadeDelay:0,
                controlsFadeLength:1
            },
            {
                displayRegionLocator:'.navigator .displayregion',
                navigatorLocator:'.navigator',
                testAutoFade: true,
                expectedAutoFade: true,
                determineExpectationsAndAssessNavigatorLocation:function (seadragonProperties, testProperties) {
                    var mainViewerElement = $("#" + seadragonProperties.id),
                        navigatorElement = $(testProperties.navigatorLocator);
                    assessNavigatorLocation(mainViewerElement.offset().left,
                        mainViewerElement.offset().top + mainViewerElement.height() - navigatorElement.height());
                    assessNavigatorSize(mainViewerElement.width() * seadragonProperties.navigatorSizeRatio, mainViewerElement.height() * seadragonProperties.navigatorSizeRatio);
                    assessNavigatorAspectRatio(mainViewerElement.width() / mainViewerElement.height(), 0.0001);
                }
            });
    });

    asyncTest('BottomRightNavigatorLocation', function () {
        assessNavigatorViewerPlacement({
                id:'example',
                prefixUrl:'/build/openseadragon/images/',
                tileSources:'/test/data/testpattern.dzi',
                showNavigationControl: false,
                showNavigator:true,
                navigatorSizeRatio:0.2,
                navigatorMaintainSizeRatio: false,
                navigatorPosition: 'BOTTOM_RIGHT',
                animationTime:0,
                controlsFadeDelay:0,
                controlsFadeLength:1
            },
            {
                displayRegionLocator:'.navigator .displayregion',
                navigatorLocator:'.navigator',
                testAutoFade: true,
                expectedAutoFade: true,
                determineExpectationsAndAssessNavigatorLocation:function (seadragonProperties, testProperties) {
                    var mainViewerElement = $("#" + seadragonProperties.id),
                        navigatorElement = $(testProperties.navigatorLocator);
                    assessNavigatorLocation(mainViewerElement.offset().left + mainViewerElement.width() - navigatorElement.width(),
                        mainViewerElement.offset().top + mainViewerElement.height() - navigatorElement.height());
                    assessNavigatorSize(mainViewerElement.width() * seadragonProperties.navigatorSizeRatio, mainViewerElement.height() * seadragonProperties.navigatorSizeRatio);
                    assessNavigatorAspectRatio(mainViewerElement.width() / mainViewerElement.height(), 0.0001);
                }
            });
    });

    asyncTest('AbsoluteNavigatorLocation', function () {
        assessNavigatorViewerPlacement({
                id:'example',
                prefixUrl:'/build/openseadragon/images/',
                tileSources:'/test/data/testpattern.dzi',
                showNavigationControl: false,
                showNavigator:true,
                navigatorPosition: 'ABSOLUTE',
                navigatorTop: 10,
                navigatorLeft: 10,
                navigatorHeight: 150,
                navigatorWidth: 175,
                animationTime:0,
                controlsFadeDelay:0,
                controlsFadeLength:1
            },
            {
                displayRegionLocator:'.navigator .displayregion',
                navigatorLocator:'.navigator',
                testAutoFade: true,
                expectedAutoFade: true,
                determineExpectationsAndAssessNavigatorLocation:function (seadragonProperties, testProperties) {
                    var mainViewerElement = $("#" + seadragonProperties.id),
                        navigatorElement = $(testProperties.navigatorLocator);
                    assessNavigatorLocation(mainViewerElement.offset().left + seadragonProperties.navigatorLeft,
                        mainViewerElement.offset().top + seadragonProperties.navigatorTop);
                    assessNavigatorSize(seadragonProperties.navigatorWidth, seadragonProperties.navigatorHeight);
                }
            });
    });

    asyncTest('CustomNavigatorElementWithWideImageWideViewer', function () {
        assessNavigatorViewerPlacement({
                id:'wideexample',
                navigatorId:'exampleNavigator',
                prefixUrl:'/build/openseadragon/images/',
                tileSources:'/test/data/wide.dzi',
                showNavigator:true,
                animationTime:0
            },
            {
                displayRegionLocator:'#exampleNavigator .displayregion',
                navigatorLocator:'#exampleNavigator',
                testAutoFade: false,
                determineExpectationsAndAssessNavigatorLocation:function (seadragonProperties, testProperties) {
                    var mainViewerElement = $("#" + seadragonProperties.id),
                        navigatorViewerElement = $("#" + seadragonProperties.navigatorId);
                    assessNavigatorLocation(mainViewerElement.offset().left,
                        mainViewerElement.offset().top - navigatorViewerElement.parent().height());
                }
            });
    });

    asyncTest('CustomDialogNavigatorElementWithTallImageTallViewer', function () {
        $('#exampleNavigator').dialog({ width: 150,
                                        height:100,
                                        open: function (event, ui) {
                                            $('#exampleNavigator').width(150);
                                            $('#exampleNavigator').height(100);
                                        }
                                        //TODO Use this in testing resizable navigator
                                        //resize: function (event, ui) {
                                        //    //ui.size.width
                                        //    //ui.size.height
                                        //    //$('#exampleNavigator').dialog("option", "width", 200);
                                        //    //$('#exampleNavigator').dialog("option", "width", 200);
                                        //}
                                      });
        assessNavigatorViewerPlacement({
                id:'tallexample',
                navigatorId:'exampleNavigator',
                prefixUrl:'/build/openseadragon/images/',
                tileSources:'/test/data/tall.dzi',
                showNavigator:true,
                animationTime:0,
                controlsFadeDelay:0,
                controlsFadeLength:1
            },
            {
                displayRegionLocator:'#exampleNavigator .displayregion',
                navigatorLocator:'#exampleNavigator',
                testAutoFade: true,
                expectedAutoFade: false,
                //On Firefox at some screen size/resolution/magnification combinations, there is an issue with the
                //simulated click.  This property is a work around for that problem
                topNavigatorClickAdjustment: 15,
                determineExpectationsAndAssessNavigatorLocation:function (seadragonProperties, testProperties) {
                    var jqueryDialog = $(testProperties.navigatorLocator);
                    assessNavigatorLocation(jqueryDialog.offset().left,
                        jqueryDialog.offset().top);
                    assessNavigatorSize(jqueryDialog.width(), jqueryDialog.height());
                }
            });
    });

    asyncTest('Viewer closing one image and opening another', function() {
        var timeWatcher = Util.timeWatcher();

        viewer = OpenSeadragon({
            id:            'example',
            prefixUrl:     '/build/openseadragon/images/',
            tileSources:   '/test/data/testpattern.dzi',
            springStiffness: 100, // Faster animation = faster tests
            showNavigator:  true
        });

        var openHandler1 = function(event) {
            viewer.removeHandler('open', openHandler1);
            ok(viewer.navigator, 'navigator exists');
            viewer.navigator.addHandler('open', navOpenHandler1);
        };

        var navOpenHandler1 = function(event) {
            viewer.navigator.removeHandler('open', navOpenHandler1);
            equal(viewer.navigator.source, viewer.source, 'viewer and navigator have the same source');
            ok(viewer.navigator._updateRequestId, 'navigator timer is on');
            viewer.addHandler('close', closeHandler1);
            viewer.addHandler('open', openHandler2);
            viewer.open('/test/data/tall.dzi');
        };

        var closeHandler1 = function(event) {
            viewer.removeHandler('close', closeHandler1);
            ok(true, 'calling open closes the old one');
            equal(viewer.navigator.source, null, 'navigator source has been cleared');
        };

        var openHandler2 = function(event) {
            viewer.removeHandler('open', openHandler2);
            viewer.navigator.addHandler('open', navOpenHandler2);
        };

        var navOpenHandler2 = function(event) {
            viewer.navigator.removeHandler('open', navOpenHandler2);
            equal(viewer.navigator.source, viewer.source, 'viewer and navigator have the same source');
            viewer.addHandler('close', closeHandler2);
            viewer.close();
        };

        var closeHandler2 = function(event) {
            viewer.removeHandler('close', closeHandler2);
            ok(!viewer.navigator._updateRequestId, 'navigator timer is off');
            setTimeout(function() {
                ok(!viewer.navigator._updateRequestId, 'navigator timer is still off');
                timeWatcher.done();
            }, 100);
        };

        viewer.addHandler('open', openHandler1);
    });
})();
