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
        displayRegionHeight,
        topNavigatorClickAdjustment;

    module("navigator", {
        setup:function () {
            Util.resetDom();
            resetTestVariables();
            $(document).scrollTop(0);
            $(document).scrollLeft(0);
        },
        teardown:function () {
            Util.resetDom();
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
        topNavigatorClickAdjustment = 0;
    };

    var assessNavigatorLocation = function (expectedX, expectedY) {
        var navigator = $(".navigator");

        Util.assessNumericValue(expectedX, navigator.offset().left, 4, ' Navigator x position');
        Util.assessNumericValue(expectedY, navigator.offset().top, 4, ' Navigator y position');
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
                    Util.equalsWithVariance(lastDisplayRegionLeft, currentDisplayRegionLeft, .0001) &&
                    Util.equalsWithVariance(lastDisplayWidth, currentDisplayWidth, .0001) &&
                    Util.equalsWithVariance(viewer.viewport.getBounds(true).x, viewer.viewport.getBounds().x, .0001) &&
                    Util.equalsWithVariance(viewer.viewport.getBounds(true).y, viewer.viewport.getBounds().y, .0001) &&
                    Util.equalsWithVariance(viewer.viewport.getBounds(true).width, viewer.viewport.getBounds().width, .0001);
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
        //Assumes that the page has not been scrolled from the top or left
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
                Util.assessNumericValue(expectedXCoordinate, viewer.viewport.getBounds().x, .04, ' Viewer at ' + theContentCorner + ', x coord');
            }
            if (viewer.viewport.getBounds().height < 1 / viewer.source.aspectRatio) {
                Util.assessNumericValue(expecteYCoordinate, viewer.viewport.getBounds().y, .04, ' Viewer at ' + theContentCorner + ', y coord');
            }
        }
    };

    var assessViewerInCenter = function () {
        var yPositionVariance = .04;
        if (viewer.source.aspectRatio < 1) {
            yPositionVariance = yPositionVariance / viewer.source.aspectRatio;
        }
        Util.assessNumericValue(1 / viewer.source.aspectRatio / 2, viewer.viewport.getCenter().y, yPositionVariance, ' Viewer at center, y coord');
        Util.assessNumericValue(.5, viewer.viewport.getCenter().x, .4, ' Viewer at center, x coord');
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
            autoFadeWaitTime = 100;

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

        var captureInitialStateThenAct = function () {
            assessDisplayRegion("After image load");

            testProperties.determineExpectationsAndAssessNavigatorLocation(seadragonProperties, testProperties);

            viewer.viewport.zoomTo(viewer.viewport.getZoom() * 2);
            waitForViewer(assessAfterZoomOnViewer);
        };

        var assessAutoFadeTriggered = function () {
            ok($(testProperties.navigatorLocator).parent().css("opacity") < 1, "Expecting navigator to be autofade when in the default location");
            waitForViewer(captureInitialStateThenAct);
        };

        var assessAutoFadeDisabled = function () {
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
                mainViewerElement.simulate('blur', event);
                if (testProperties.expectedAutoFade) {
                    setTimeout(assessAutoFadeTriggered,autoFadeWaitTime);
                }
                else {
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
                }
            });
    });

    asyncTest('CustomNavigatorLocationWithWideImageWideViewer', function () {
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

    asyncTest('CustomDialogNavigatorLocationWithTallImageTallViewer', function () {
        $('#exampleNavigator').dialog();
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
                }
            });
    });

    asyncTest('DefaultNavigatorLocationWithTallImageWideViewer', function () {
        assessNavigatorViewerPlacement({
                id:'wideexample',
                prefixUrl:'/build/openseadragon/images/',
                tileSources:'/test/data/tall.dzi',
                showNavigator:true,
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

        var openHandler1 = function(eventSender, eventData) {
            viewer.removeHandler('open', openHandler1);
            ok(viewer.navigator, 'navigator exists');
            viewer.navigator.addHandler('open', navOpenHandler1);
        };

        var navOpenHandler1 = function(eventSender, eventData) {
            viewer.navigator.removeHandler('open', navOpenHandler1);
            equal(viewer.navigator.source, viewer.source, 'viewer and navigator have the same source');
            ok(viewer.navigator._updateRequestId, 'navigator timer is on');
            viewer.addHandler('close', closeHandler1);
            viewer.addHandler('open', openHandler2);
            viewer.open('/test/data/tall.dzi');
        };

        var closeHandler1 = function() {
            viewer.removeHandler('close', closeHandler1);
            ok(true, 'calling open closes the old one');
            equal(viewer.navigator.source, null, 'navigator source has been cleared');
        };

        var openHandler2 = function(eventSender, eventData) {
            viewer.removeHandler('open', openHandler2);
            viewer.navigator.addHandler('open', navOpenHandler2);
        };

        var navOpenHandler2 = function(eventSender, eventData) {
            viewer.navigator.removeHandler('open', navOpenHandler2);
            equal(viewer.navigator.source, viewer.source, 'viewer and navigator have the same source');
            viewer.addHandler('close', closeHandler2);
            viewer.close();
        };

        var closeHandler2 = function() {
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
