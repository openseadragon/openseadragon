/* eslint-disable new-cap */
/* global QUnit, Util, $ */

(function () {
    const debug = false;
    let viewer;
    let displayRegion;
    let navigatorElement;
    let navigatorScaleFactor;
    let contentStartFromLeft;
    let contentStartFromTop;
    let displayRegionWidth;
    let displayRegionHeight;
    let topNavigatorClickAdjustment;

    const resetTestVariables = function () {
        if (viewer) {
            viewer.close();
        }
        displayRegion = null;
        navigatorElement = null;
        navigatorScaleFactor = null;
        contentStartFromLeft = null;
        contentStartFromTop = null;
        displayRegionWidth = null;
        displayRegionHeight = null;
        topNavigatorClickAdjustment = 0;
    };

    QUnit.module("navigator", {
        beforeEach: function () {
            Util.initializeTestDOM();
            resetTestVariables();
            $(document).scrollTop(0);
            $(document).scrollLeft(0);
        },
        afterEach: function () {
            // jQuery UI creates its controls outside the normal DOM hierarchy which QUnit cleans up:
            if ($('#exampleNavigator').is(':ui-dialog')) {
                $('#exampleNavigator').dialog('destroy');
            }

            resetTestVariables();

            if (viewer){
                viewer.destroy();
            }

            viewer = null;
        }
    });

    const assessNavigatorLocation = function (assert, expectedX, expectedY) {
        navigatorElement = navigatorElement || $(".navigator");
        Util.assessNumericValue(assert, navigatorElement.offset().left, expectedX, 10, ' Navigator x Position');
        Util.assessNumericValue(assert, navigatorElement.offset().top, expectedY, 10, ' Navigator y Position');
    };

    const assessNavigatorSize = function (assert, expectedWidth, expectedHeight, msg) {
        msg = msg || "";
        navigatorElement = navigatorElement || $(".navigator");
        Util.assessNumericValue(assert, navigatorElement.width(), expectedWidth, 2, ' Navigator Width ' + msg);
        Util.assessNumericValue(assert, navigatorElement.height(), expectedHeight, 2, ' Navigator Height ' + msg);
    };

    const assessNavigatorAspectRatio = function (assert, expectedAspectRatio, variance, msg) {
        msg = msg || "";
        navigatorElement = navigatorElement || $(".navigator");
        Util.assessNumericValue(
            assert,
            navigatorElement.width() / navigatorElement.height(),
            expectedAspectRatio,
            variance,
            ' Navigator Aspect Ratio ' + msg
        );
    };

    const assessNavigatorArea = function (assert, expectedArea, msg) {
        msg = msg || "";
        navigatorElement = navigatorElement || $(".navigator");
        Util.assessNumericValue(
            assert,
            navigatorElement.width() * navigatorElement.height(),
            expectedArea,
            Math.max(navigatorElement.width(), navigatorElement.height()),
            ' Navigator Area ' + msg
        );
    };


    const navigatorRegionBoundsInPoints = function () {
        let expectedDisplayRegionWidth;
        let expectedDisplayRegionHeight;
        let expectedDisplayRegionXLocation;
        let expectedDisplayRegionYLocation;

        if (navigatorElement === null) {
            navigatorElement = $(".navigator");
            navigatorScaleFactor = Math.min(
                navigatorElement.width() / viewer.viewport._contentSize.x,
                navigatorElement.height() / viewer.viewport._contentSize.y
            );
            displayRegionWidth = viewer.viewport._contentSize.x * navigatorScaleFactor;
            displayRegionHeight = viewer.viewport._contentSize.y * navigatorScaleFactor;
            contentStartFromLeft = (navigatorElement.width() - displayRegionWidth) / 2;
            contentStartFromTop = (navigatorElement.height() - displayRegionHeight) / 2;
        }
        expectedDisplayRegionWidth = viewer.viewport.getBounds().width * displayRegionWidth;
        expectedDisplayRegionHeight = viewer.viewport.getBounds().height * displayRegionHeight * viewer.source.aspectRatio;
        expectedDisplayRegionXLocation = viewer.viewport.getBounds().x * displayRegionWidth + contentStartFromLeft;
        expectedDisplayRegionYLocation = viewer.viewport.getBounds().y * displayRegionHeight * viewer.source.aspectRatio + contentStartFromTop;
        const regionBoundsInPoints = new OpenSeadragon.Rect(
            expectedDisplayRegionXLocation,
            expectedDisplayRegionYLocation,
            expectedDisplayRegionWidth,
            expectedDisplayRegionHeight
        );

        if (debug) {
            console.log('Image width: ' + viewer.viewport._contentSize.x + '\n' +
                        'Image height: ' + viewer.viewport._contentSize.y + '\n' +
                        'navigatorElement.width(): ' + navigatorElement.width() + '\n' +
                        'navigatorElement.height(): ' + navigatorElement.height() + '\n' +
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

    const assessDisplayRegion = function (assert, status) {
        if (debug) {
            console.log(status);
        }
        const expectedBounds = navigatorRegionBoundsInPoints();
        Util.assessNumericValue(
            assert,
            displayRegion.width() + viewer.navigator.totalBorderWidths.x,
            expectedBounds.width,
            2,
            status + ' Width synchronization'
        );
        Util.assessNumericValue(
            assert,
            displayRegion.height() + viewer.navigator.totalBorderWidths.y,
            expectedBounds.height,
            2,
            status + ' Height synchronization'
        );
        Util.assessNumericValue(assert, displayRegion.position().left, expectedBounds.x, 2, status + ' Left synchronization');
        Util.assessNumericValue(assert, displayRegion.position().top, expectedBounds.y, 2, status + ' Top synchronization');
    };


    const waitForViewer = function () {
        return function (assert, handler, count, lastDisplayRegionLeft, lastDisplayWidth) {
            let viewerAndNavigatorDisplayReady = false,
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
                    !viewer.world.needsDraw() &&
                    currentDisplayWidth > 0 &&
                    Util.equalsWithVariance(lastDisplayRegionLeft, currentDisplayRegionLeft, 0.0001) &&
                    Util.equalsWithVariance(lastDisplayWidth, currentDisplayWidth, 0.0001) &&
                    Util.equalsWithVariance(viewer.viewport.getBounds(true).x, viewer.viewport.getBounds().x, 0.0001) &&
                    Util.equalsWithVariance(viewer.viewport.getBounds(true).y, viewer.viewport.getBounds().y, 0.0001) &&
                    Util.equalsWithVariance(viewer.viewport.getBounds(true).width, viewer.viewport.getBounds().width, 0.0001);
            }
            catch (err) {
                if(debug) {
                    console.log(err);
                }
                //Ignore.  Subsequent code will try again shortly
            }
            if (( !viewerAndNavigatorDisplayReady) && count < 50) {
                count++;
                setTimeout(function () {
                    waitForViewer(assert, handler, count, currentDisplayRegionLeft, currentDisplayWidth);
                }, 100);
            }
            else {
                if (debug) {
                    console.log("waitForViewer :" +
                        viewer.drawer + ":" + viewer.world.needsDraw() + ":" +
                        viewerAndNavigatorDisplayReady + ":" +
                        lastDisplayRegionLeft + ":" + currentDisplayRegionLeft + ":" +
                        lastDisplayWidth + ":" + currentDisplayWidth + ":" +
                        viewer.viewport.getBounds(true).x + ":" + viewer.viewport.getBounds().x + ":" +
                        viewer.viewport.getBounds(true).y + ":" + viewer.viewport.getBounds().y + ":" +
                        viewer.viewport.getBounds(true).width + ":" + viewer.viewport.getBounds().width + ":" +
                        count);
                }
                if (handler) {
                    handler(assert);
                }
            }
        };
    }();

    const simulateNavigatorClick = function (viewer, locationX, locationY) {
        //Assumes that the page has not been scrolled from the top or left
        const $canvas = $(viewer.element).find('.openseadragon-canvas'),
            offset = $canvas.offset(),
            event = {
                clientX: offset.left + locationX,
                clientY: offset.top + locationY
            };
        $canvas
            .simulate('mouseenter', event)
            .simulate('mousedown', event)
            .simulate('mouseup', event);
    };

    const simulateNavigatorDrag = function (viewer, distanceX, distanceY) {
        const $canvas = $(viewer.element).find('.openseadragon-canvas'),
            offset = $canvas.offset(),
            event = {};

        event.clientX = offset.left + 1;
        event.clientY = offset.top + 1;
        $canvas.simulate( 'mouseenter', event );

        event.button = 0;
        $canvas.simulate( 'mousedown', event );

        event.clientX += distanceX;
        event.clientY += distanceY;
        $canvas.simulate( 'mousemove', event );

        event.button = 0;
        $canvas.simulate( 'mouseup', event );

        event.clientX = offset.left - 1;
        event.clientY = offset.top - 1;
        event.relatedTarget = document.body;
        $canvas.simulate( 'mouseleave', event );
    };

    const dragNavigatorBackToCenter = function () {
        const delta = viewer.viewport.getHomeBounds().getCenter().minus(viewer.viewport.getCenter()).times(displayRegionWidth);
        simulateNavigatorDrag(viewer.navigator, delta.x, delta.y);
    };

    const resizeElement = function ($element, width, height) {
        $element.width(width);
        $element.height(height);
    };


    const assessViewerInCenter = function (assert) {
        let yPositionVariance = 0.04;
        if (viewer.source.aspectRatio < 1) {
            yPositionVariance /= viewer.source.aspectRatio;
        }
        Util.assessNumericValue(
            assert,
            viewer.viewport.getCenter().y,
            1 / viewer.source.aspectRatio / 2,
            yPositionVariance,
            ' Viewer at center, y coord'
        );
        Util.assessNumericValue(assert, viewer.viewport.getCenter().x, 0.5, 0.4, ' Viewer at center, x coord');
    };


    const assessViewerInCorner = function (theContentCorner, assert) {
        return function () {
            let expectedXCoordinate, expectedYCoordinate;
            if (theContentCorner === "TOPLEFT") {
                expectedXCoordinate = 0;
                expectedYCoordinate = 0;
            }
            else if (theContentCorner === "TOPRIGHT") {
                expectedXCoordinate = 1 - viewer.viewport.getBounds().width;
                expectedYCoordinate = 0;
            }
            else if (theContentCorner === "BOTTOMRIGHT") {
                expectedXCoordinate = 1 - viewer.viewport.getBounds().width;
                expectedYCoordinate = 1 / viewer.source.aspectRatio - viewer.viewport.getBounds().height;
            }
            else if (theContentCorner === "BOTTOMLEFT") {
                expectedXCoordinate = 0;
                expectedYCoordinate = 1 / viewer.source.aspectRatio - viewer.viewport.getBounds().height;
            }
            if (viewer.viewport.getBounds().width < 1) {
                Util.assessNumericValue(
                    assert,
                    viewer.viewport.getBounds().x,
                    expectedXCoordinate,
                    0.04,
                    ' Viewer at ' + theContentCorner + ', x coord'
                );
            }
            if (viewer.viewport.getBounds().height < 1 / viewer.source.aspectRatio) {
                Util.assessNumericValue(
                    assert,
                    viewer.viewport.getBounds().y,
                    expectedYCoordinate,
                    0.04,
                    ' Viewer at ' + theContentCorner + ', y coord'
                );
            }
        };
    };

    const assessNavigatorViewerPlacement = function (assert, seadragonProperties, testProperties) {
        const done = assert.async();

        seadragonProperties.visibilityRatio = 1;
        viewer = OpenSeadragon(seadragonProperties);

        const clickOnNavigator = function (theContentCorner) {
            return function () {
                let xPos;
                let yPos;
                if (theContentCorner === "TOPLEFT") {
                    xPos = contentStartFromLeft;
                    yPos = contentStartFromTop + topNavigatorClickAdjustment;
                }
                else if (theContentCorner === "TOPRIGHT") {
                    xPos = contentStartFromLeft + displayRegionWidth;
                    yPos = contentStartFromTop + topNavigatorClickAdjustment;
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

        const navigatorOperationScenarios = [
                {interactionOperation: clickOnNavigator("TOPRIGHT"),
                  assessmentOperation: assessViewerInCorner("TOPRIGHT", assert),
                    assessmentMessage: "After click on navigator on top right"},
                {interactionOperation: dragNavigatorBackToCenter,
                  assessmentOperation: assessViewerInCenter,
                    assessmentMessage: "After drag on navigator from top right"},
                {interactionOperation: clickOnNavigator("BOTTOMLEFT"),
                  assessmentOperation: assessViewerInCorner("BOTTOMLEFT", assert),
                    assessmentMessage: "After click on navigator on bottom left"},
                {interactionOperation: dragNavigatorBackToCenter,
                  assessmentOperation: assessViewerInCenter,
                    assessmentMessage: "After drag on navigator from bottom left"},
                {interactionOperation: clickOnNavigator("BOTTOMRIGHT"),
                  assessmentOperation: assessViewerInCorner("BOTTOMRIGHT", assert),
                    assessmentMessage: "After click on navigator on bottom right"},
                {interactionOperation: dragNavigatorBackToCenter,
                  assessmentOperation: assessViewerInCenter,
                    assessmentMessage: "After drag on navigator from bottom right"},
                {interactionOperation: clickOnNavigator("TOPLEFT"),
                  assessmentOperation: assessViewerInCorner("TOPLEFT", assert),
                    assessmentMessage: "After click on navigator on top left"},
                {interactionOperation: dragNavigatorBackToCenter,
                  assessmentOperation: assessViewerInCenter,
                    assessmentMessage: "After drag on navigator from top left"}
            ];
        const viewerResizeScenarios = [
                {resizeFactorX: 0.5, resizeFactorY: 1.0, assessmentMessage: "After Viewer Resize (50%, 100%)"},
                {resizeFactorX: 1.0, resizeFactorY: 0.5, assessmentMessage: "After Viewer Resize (100%, 50%)"},
                {resizeFactorX: 1.0, resizeFactorY: 1.0, assessmentMessage: "After Viewer Resize (100%, 100%)"}
            ];
        const navigatorResizeScenarios = [
                {resizeFactorX: 0.75, resizeFactorY: 1.0, assessmentMessage: "After Navigator Resize (75%, 100%)"},
                {resizeFactorX: 1.0, resizeFactorY: 0.75, assessmentMessage: "After Navigator Resize (100%, 75%)"},
                {resizeFactorX: 1.0, resizeFactorY: 1.0, assessmentMessage: "After Navigator Resize (100%, 100%)"}
            ];
        const autoFadeWaitTime = 100;
        let navigatorElement = null;
        let viewerElement = null;
        let viewerOriginalSize = null;
        let navigatorOriginalSize = null;

        if ($.isNumeric(testProperties.topNavigatorClickAdjustment))
        {
            topNavigatorClickAdjustment = testProperties.topNavigatorClickAdjustment;
        }

        const assessNavigatorOperationAndTakeNextStep = function (step) {
            return function () {
                const nextStep = step + 1;
                assessDisplayRegion(assert, navigatorOperationScenarios[step].assessmentMessage);
                navigatorOperationScenarios[step].assessmentOperation(assert);
                if (step === navigatorOperationScenarios.length - 1) {
                    done();
                }
                else {
                    navigatorOperationScenarios[nextStep].interactionOperation();
                    waitForViewer(assert, assessNavigatorOperationAndTakeNextStep(nextStep));
                }
            };
        };

        const assessAfterSnapback = function () {
            assessDisplayRegion(assert, "After snapback");
            navigatorOperationScenarios[0].interactionOperation();
            waitForViewer(assert, assessNavigatorOperationAndTakeNextStep(0));
        };

        const assessAfterDragOnViewer = function () {
            assessDisplayRegion(assert, "After pan");
            viewer.viewport.applyConstraints();
            waitForViewer(assert, assessAfterSnapback);
        };

        const assessAfterZoomOnViewer = function () {
            const target = new OpenSeadragon.Point(0.4, 0.4);
            assessDisplayRegion(assert, "After image zoom");
            viewer.viewport.panTo(target);
            waitForViewer(assert, assessAfterDragOnViewer);
        };

        const assessAfterResizeNavigator = function () {
            viewer.viewport.zoomTo(viewer.viewport.getZoom() * 2);
            waitForViewer(assert, assessAfterZoomOnViewer);
        };

        const assessNavigatorResizeAndTakeNextStep = function (step) {
            return function () {
                const nextStep = step + 1;
                assessNavigatorSize(assert, navigatorOriginalSize.x * navigatorResizeScenarios[step].resizeFactorX, navigatorOriginalSize.y * navigatorResizeScenarios[step].resizeFactorY, navigatorResizeScenarios[step].assessmentMessage);
                assessDisplayRegion(assert, navigatorResizeScenarios[step].assessmentMessage);
                if (step === viewerResizeScenarios.length - 1) {
                    assessAfterResizeNavigator();
                }
                else {
                    resizeElement(navigatorElement, navigatorOriginalSize.x * navigatorResizeScenarios[nextStep].resizeFactorX, navigatorOriginalSize.y * navigatorResizeScenarios[nextStep].resizeFactorY);
                    waitForViewer(assert, assessNavigatorResizeAndTakeNextStep(nextStep));
                }
            };
        };

        const assessViewerResizeAndTakeNextStep = function (step) {
            return function () {
                const nextStep = step + 1;
                if (seadragonProperties.navigatorId) {
                    // Navigator hosted in outside element...size shouldn't change
                    assessNavigatorSize(
                        assert,
                        navigatorOriginalSize.x,
                        navigatorOriginalSize.y,
                        viewerResizeScenarios[step].assessmentMessage
                    );
                }
                else {
                    // Navigator hosted in viewer
                    if (seadragonProperties.navigatorPosition && seadragonProperties.navigatorPosition === 'ABSOLUTE') {
                        // Navigator positioned 'ABSOLUTE'...size shouldn't change

                        assessNavigatorSize(
                            assert,
                            navigatorOriginalSize.x,
                            navigatorOriginalSize.y,
                            viewerResizeScenarios[step].assessmentMessage
                        );
                    }
                    else {
                        // Navigator positioned 'TOP_LEFT', 'TOP_RIGHT', 'BOTTOM_LEFT', or 'BOTTOM_RIGHT'
                        if (seadragonProperties.navigatorMaintainSizeRatio) {
                            // Navigator should maintain aspect ratio and size proportioned to viewer size
                            assessNavigatorAspectRatio(
                                assert,
                                viewerElement.width() / viewerElement.height(),
                                0.0001,
                                viewerResizeScenarios[step].assessmentMessage
                            );
                            assessNavigatorSize(
                                assert,
                                viewerElement.width() * seadragonProperties.navigatorSizeRatio,
                                viewerElement.height() * seadragonProperties.navigatorSizeRatio,
                                viewerResizeScenarios[step].assessmentMessage
                            );
                        }
                        else {
                            // Navigator should maintain aspect ratio and area
                            // Variances are loosened up here, since 1 pixel rounding difference in resizing to maintain area
                            //   can cause a relatively large difference in area and aspect ratio.
                            assessNavigatorAspectRatio(
                                assert,
                                viewerElement.width() / viewerElement.height(),
                                0.1,
                                viewerResizeScenarios[step].assessmentMessage
                            );
                            assessNavigatorArea(
                                assert,
                                navigatorOriginalSize.x * navigatorOriginalSize.y,
                                viewerResizeScenarios[step].assessmentMessage
                            );
                        }
                    }
                }

                if (step === viewerResizeScenarios.length - 1) {
                    if (seadragonProperties.navigatorId) {
                        // Navigator hosted in outside element...run navigator resize tests
                        resizeElement(navigatorElement, navigatorOriginalSize.x * navigatorResizeScenarios[0].resizeFactorX, navigatorOriginalSize.y * navigatorResizeScenarios[0].resizeFactorY);
                        waitForViewer(assert, assessNavigatorResizeAndTakeNextStep(0));
                    }
                    else {
                        // Navigator hosted in viewer...skip navigator resize tests
                        assessAfterResizeNavigator();
                    }
                }
                else {
                    resizeElement(viewerElement, viewerOriginalSize.x * viewerResizeScenarios[nextStep].resizeFactorX, viewerOriginalSize.y * viewerResizeScenarios[nextStep].resizeFactorY);
                    waitForViewer(assert, assessViewerResizeAndTakeNextStep(nextStep));
                }
            };
        };

        const captureInitialStateThenAct = function () {
            assessDisplayRegion(assert, "After image load");
            testProperties.determineExpectationsAndAssessNavigatorLocation(assert, seadragonProperties, testProperties);
            viewerOriginalSize = new OpenSeadragon.Point(viewerElement.width(), viewerElement.height());
            navigatorOriginalSize = new OpenSeadragon.Point(navigatorElement.width(), navigatorElement.height());

            resizeElement(viewerElement, viewerOriginalSize.x * viewerResizeScenarios[0].resizeFactorX, viewerOriginalSize.y * viewerResizeScenarios[0].resizeFactorY);

            waitForViewer(assert, assessViewerResizeAndTakeNextStep(0));
        };

        const assessAutoFadeTriggered = function () {
            assert.ok(navigatorElement.parent().css("opacity") < 1, "Expecting navigator to be autofade when in the default location");
            waitForViewer(assert, captureInitialStateThenAct());
        };

        const assessAutoFadeDisabled = function () {
            assert.ok(navigatorElement.parent().css("opacity") > 0, "Expecting navigator to be always visible when in a custom location");
            waitForViewer(assert, captureInitialStateThenAct());
        };

        const openHandler = function () {
            viewer.removeHandler('open', openHandler);
            navigatorElement = navigatorElement || $(testProperties.navigatorLocator);
            viewerElement = $("#" + seadragonProperties.id);
            displayRegion = displayRegion || $(testProperties.displayRegionLocator);

            //TODO This should be testProperties.testAutoFade, but test hangs. Fix this!
            if (!testProperties.testAutohide) {
                waitForViewer(assert, captureInitialStateThenAct());
            }
            else {
                assert.ok(navigatorElement.parent().css("opacity") > 0, "Expecting navigator to be visible initially");
                const event = {
                     clientX: 1,
                     clientY: 1
                 };

                viewerElement.simulate('blur', event);

                if (testProperties.expectedAutoFade) {
                    setTimeout(assessAutoFadeTriggered, autoFadeWaitTime);
                } else {
                    setTimeout(assessAutoFadeDisabled, autoFadeWaitTime);
                }
            }
        };
        viewer.addHandler('open', openHandler);
    };

    QUnit.test('DefaultNavigatorLocationWithWideImageTallViewer', function (assert) {
        assessNavigatorViewerPlacement(assert, {
                id: 'tallexample',
                prefixUrl: '/build/openseadragon/images/',
                tileSources: '/test/data/wide.dzi',
                showNavigator: true,
                navigatorSizeRatio: 0.2,
                navigatorMaintainSizeRatio:  false,
                animationTime: 0
            },
            {
                displayRegionLocator: '.navigator .displayregion',
                navigatorLocator: '.navigator',
                testAutoFade: false,
                determineExpectationsAndAssessNavigatorLocation: function (assert, seadragonProperties, testProperties) {
                    const mainViewerElement = $("#" + seadragonProperties.id);
                    navigatorElement = navigatorElement || $(testProperties.navigatorLocator);
                    assessNavigatorLocation(
                        assert,
                        mainViewerElement.offset().left + mainViewerElement.width() - navigatorElement.width(),
                        mainViewerElement.offset().top
                    );
                    assessNavigatorSize(
                        assert,
                        mainViewerElement.width() * seadragonProperties.navigatorSizeRatio,
                        mainViewerElement.height() * seadragonProperties.navigatorSizeRatio
                    );
                    assessNavigatorAspectRatio(assert, mainViewerElement.width() / mainViewerElement.height(), 0.0001);
                }
            });
    });

    QUnit.test('DefaultNavigatorLocationWithTallImageWideViewer', function (assert) {
        assessNavigatorViewerPlacement(assert, {
                id: 'wideexample',
                prefixUrl: '/build/openseadragon/images/',
                tileSources: '/test/data/tall.dzi',
                showNavigator: true,
                navigatorSizeRatio: 0.2,
                navigatorMaintainSizeRatio:  false,
                animationTime: 0,
                controlsFadeDelay: 0,
                controlsFadeLength: 1
            },
            {
                displayRegionLocator: '.navigator .displayregion',
                navigatorLocator: '.navigator',
                testAutoFade: true,
                expectedAutoFade: true,
                determineExpectationsAndAssessNavigatorLocation: function (assert, seadragonProperties, testProperties) {
                    const mainViewerElement = $("#" + seadragonProperties.id);
                    navigatorElement = navigatorElement || $(testProperties.navigatorLocator);
                    assessNavigatorLocation(assert, mainViewerElement.offset().left + mainViewerElement.width() - navigatorElement.width(),
                        mainViewerElement.offset().top);
                    assessNavigatorSize(assert, mainViewerElement.width() * seadragonProperties.navigatorSizeRatio, mainViewerElement.height() * seadragonProperties.navigatorSizeRatio);
                    assessNavigatorAspectRatio(assert, mainViewerElement.width() / mainViewerElement.height(), 0.0001);
                }
            });
    });

    QUnit.test('TopLeftNavigatorLocation', function (assert) {
        assessNavigatorViewerPlacement(assert, {
                id: 'example',
                prefixUrl: '/build/openseadragon/images/',
                tileSources: '/test/data/testpattern.dzi',
                showNavigationControl:  false,
                showNavigator: true,
                navigatorSizeRatio: 0.2,
                navigatorMaintainSizeRatio:  false,
                navigatorPosition:  'TOP_LEFT',
                animationTime: 0,
                controlsFadeDelay: 0,
                controlsFadeLength: 1
            },
            {
                displayRegionLocator: '.navigator .displayregion',
                navigatorLocator: '.navigator',
                testAutoFade: true,
                expectedAutoFade: true,
                determineExpectationsAndAssessNavigatorLocation: function (assert, seadragonProperties, testProperties) {
                    const mainViewerElement = $("#" + seadragonProperties.id);
                    assessNavigatorLocation(assert, mainViewerElement.offset().left,
                        mainViewerElement.offset().top);
                    assessNavigatorSize(assert, mainViewerElement.width() * seadragonProperties.navigatorSizeRatio, mainViewerElement.height() * seadragonProperties.navigatorSizeRatio);
                    assessNavigatorAspectRatio(assert, mainViewerElement.width() / mainViewerElement.height(), 0.0001);
                }
            });
    });

    QUnit.test('TopRightNavigatorLocation', function (assert) {
        assessNavigatorViewerPlacement(assert, {
                id: 'example',
                prefixUrl: '/build/openseadragon/images/',
                tileSources: '/test/data/testpattern.dzi',
                showNavigationControl:  false,
                showNavigator: true,
                navigatorSizeRatio: 0.2,
                navigatorMaintainSizeRatio:  true,
                navigatorPosition: 'TOP_RIGHT',
                animationTime: 0,
                controlsFadeDelay: 0,
                controlsFadeLength: 1
            },
            {
                displayRegionLocator: '.navigator .displayregion',
                navigatorLocator: '.navigator',
                testAutoFade: true,
                expectedAutoFade: true,
                determineExpectationsAndAssessNavigatorLocation: function (assert, seadragonProperties, testProperties) {
                    const mainViewerElement = $("#" + seadragonProperties.id);
                    navigatorElement = navigatorElement || $(testProperties.navigatorLocator);
                    assessNavigatorLocation(assert, mainViewerElement.offset().left + mainViewerElement.width() - navigatorElement.width(),
                        mainViewerElement.offset().top);
                    assessNavigatorSize(assert, mainViewerElement.width() * seadragonProperties.navigatorSizeRatio, mainViewerElement.height() * seadragonProperties.navigatorSizeRatio);
                    assessNavigatorAspectRatio(assert, mainViewerElement.width() / mainViewerElement.height(), 0.0001);
                }
            });
    });

    QUnit.test('BottomLeftNavigatorLocation', function (assert) {
        assessNavigatorViewerPlacement(assert, {
                id: 'example',
                prefixUrl: '/build/openseadragon/images/',
                tileSources: '/test/data/testpattern.dzi',
                showNavigationControl:  false,
                showNavigator: true,
                navigatorSizeRatio: 0.2,
                navigatorMaintainSizeRatio:  false,
                navigatorPosition: 'BOTTOM_LEFT',
                animationTime: 0,
                controlsFadeDelay: 0,
                controlsFadeLength: 1
            },
            {
                displayRegionLocator: '.navigator .displayregion',
                navigatorLocator: '.navigator',
                testAutoFade: true,
                expectedAutoFade: true,
                determineExpectationsAndAssessNavigatorLocation: function (assert, seadragonProperties, testProperties) {
                    const mainViewerElement = $("#" + seadragonProperties.id);
                    navigatorElement = navigatorElement || $(testProperties.navigatorLocator);
                    assessNavigatorLocation(assert, mainViewerElement.offset().left,
                        mainViewerElement.offset().top + mainViewerElement.height() - navigatorElement.height());
                    assessNavigatorSize(assert, mainViewerElement.width() * seadragonProperties.navigatorSizeRatio, mainViewerElement.height() * seadragonProperties.navigatorSizeRatio);
                    assessNavigatorAspectRatio(assert, mainViewerElement.width() / mainViewerElement.height(), 0.0001);
                }
            });
    });

    QUnit.test('BottomRightNavigatorLocation', function (assert) {
        assessNavigatorViewerPlacement(assert, {
                id: 'example',
                prefixUrl: '/build/openseadragon/images/',
                tileSources: '/test/data/testpattern.dzi',
                showNavigationControl:  false,
                showNavigator: true,
                navigatorSizeRatio: 0.2,
                navigatorMaintainSizeRatio:  false,
                navigatorPosition:  'BOTTOM_RIGHT',
                animationTime: 0,
                controlsFadeDelay: 0,
                controlsFadeLength: 1
            },
            {
                displayRegionLocator: '.navigator .displayregion',
                navigatorLocator: '.navigator',
                testAutoFade: true,
                expectedAutoFade: true,
                determineExpectationsAndAssessNavigatorLocation: function (assert, seadragonProperties, testProperties) {
                    const mainViewerElement = $("#" + seadragonProperties.id);
                    navigatorElement = navigatorElement || $(testProperties.navigatorLocator);
                    assessNavigatorLocation(assert, mainViewerElement.offset().left + mainViewerElement.width() - navigatorElement.width(),
                        mainViewerElement.offset().top + mainViewerElement.height() - navigatorElement.height());
                    assessNavigatorSize(assert, mainViewerElement.width() * seadragonProperties.navigatorSizeRatio, mainViewerElement.height() * seadragonProperties.navigatorSizeRatio);
                    assessNavigatorAspectRatio(assert, mainViewerElement.width() / mainViewerElement.height(), 0.0001);
                }
            });
    });

    // QUnit.test('AbsoluteNavigatorLocation', function (assert) {
    //     assessNavigatorViewerPlacement(assert, {
    //             id: 'example',
    //             prefixUrl: '/build/openseadragon/images/',
    //             tileSources: '/test/data/testpattern.dzi',
    //             showNavigationControl:  false,
    //             showNavigator: true,
    //             navigatorPosition:  'ABSOLUTE',
    //             navigatorTop:  10,
    //             navigatorLeft:  10,
    //             navigatorHeight:  150,// height of 175 makes tests pass
    //             navigatorWidth:  175,
    //             animationTime: 0,
    //             controlsFadeDelay: 0,
    //             controlsFadeLength: 1
    //         },
    //         {
    //             displayRegionLocator: '.navigator .displayregion',
    //             navigatorLocator: '.navigator',
    //             testAutoFade: true,
    //             expectedAutoFade: true,
    //             determineExpectationsAndAssessNavigatorLocation: function (assert, seadragonProperties, testProperties) {
    //                 const mainViewerElement = $("#" + seadragonProperties.id);
    //                 assessNavigatorLocation(assert, mainViewerElement.offset().left + seadragonProperties.navigatorLeft,
    //                     mainViewerElement.offset().top + seadragonProperties.navigatorTop);
    //                 assessNavigatorSize(assert, seadragonProperties.navigatorWidth, seadragonProperties.navigatorHeight);
    //             }
    //         });
    // });

    // QUnit.test('CustomNavigatorElementWithWideImageWideViewer', function (assert) {
    //     assessNavigatorViewerPlacement(assert, {
    //             id: 'wideexample',
    //             navigatorId: 'exampleNavigator',
    //             prefixUrl: '/build/openseadragon/images/',
    //             tileSources: '/test/data/wide.dzi',
    //             showNavigator: true,
    //             animationTime: 0
    //         },
    //         {
    //             displayRegionLocator: '#exampleNavigator .displayregion',
    //             navigatorLocator: '#exampleNavigator',
    //             testAutoFade: false,
    //             determineExpectationsAndAssessNavigatorLocation: function (assert, seadragonProperties, testProperties) {
    //                 const mainViewerElement = $("#" + seadragonProperties.id);
    //                 const navigatorViewerElement = $("#" + seadragonProperties.navigatorId);
    //                 assessNavigatorLocation(assert, mainViewerElement.offset().left,
    //                     mainViewerElement.offset().top - navigatorViewerElement.parent().height());
    //             }
    //         });
    // });

    // QUnit.test('CustomDialogNavigatorElementWithTallImageTallViewer', function (assert) {
    //     $('#exampleNavigator').dialog({ width: 150,
    //                                     height: 100,
    //                                     open: function (event, ui) {
    //                                         $('#exampleNavigator').width(150);
    //                                         $('#exampleNavigator').height(100);
    //                                     }
    //                                     //TODO Use this in testing resizable navigator
    //                                     //resize: function (event, ui) {
    //                                     //    //ui.size.width
    //                                     //    //ui.size.height
    //                                     //    //$('#exampleNavigator').dialog("option", "width", 200);
    //                                     //    //$('#exampleNavigator').dialog("option", "width", 200);
    //                                     //}
    //                                   });
    //     assessNavigatorViewerPlacement(assert, {
    //             id: 'tallexample',
    //             navigatorId: 'exampleNavigator',
    //             prefixUrl: '/build/openseadragon/images/',
    //             tileSources: '/test/data/tall.dzi',
    //             showNavigator: true,
    //             animationTime: 0,
    //             controlsFadeDelay: 0,
    //             controlsFadeLength: 1
    //         },
    //         {
    //             displayRegionLocator: '#exampleNavigator .displayregion',
    //             navigatorLocator: '#exampleNavigator',
    //             testAutoFade: true,
    //             expectedAutoFade: false,
    //             //On Firefox at some screen size/resolution/magnification combinations, there is an issue with the
    //             //simulated click.  This property is a work around for that problem
    //             topNavigatorClickAdjustment: 15,
    //             determineExpectationsAndAssessNavigatorLocation: function (assert, seadragonProperties, testProperties) {
    //                 const jqueryDialog = $(testProperties.navigatorLocator);
    //                 assessNavigatorLocation(assert, jqueryDialog.offset().left,
    //                     jqueryDialog.offset().top);
    //                 assessNavigatorSize(assert, jqueryDialog.width(), jqueryDialog.height());
    //             }
    //         });
    // });

    QUnit.test('Viewer closing one image and opening another', function(assert) {
        const timeWatcher = Util.timeWatcher(assert);

        viewer = OpenSeadragon({
            id:            'example',
            prefixUrl:     '/build/openseadragon/images/',
            tileSources:   '/test/data/testpattern.dzi',
            springStiffness: 100, // Faster animation = faster tests
            showNavigator:  true
        });

        const closeHandler1 = function(event) {
            viewer.removeHandler('close', closeHandler1);
            assert.ok(true, 'calling open closes the old one');
            assert.equal(viewer.navigator.source, null, 'navigator source has been cleared');
        };

        const closeHandler2 = function(event) {
            viewer.removeHandler('close', closeHandler2);
            setTimeout(function() {
                assert.ok(!viewer.navigator._updateRequestId, 'navigator timer is off');
                timeWatcher.done();
            }, 100);
        };

        const navOpenHandler2 = function(event) {
            viewer.navigator.world.removeHandler('add-item', navOpenHandler2);
            assert.equal(viewer.navigator.source, viewer.source, 'viewer and navigator have the same source');
            viewer.addHandler('close', closeHandler2);
            viewer.close();
        };

        const openHandler2 = function(event) {
            viewer.removeHandler('open', openHandler2);
            viewer.navigator.world.addHandler('add-item', navOpenHandler2);
        };

        const navOpenHandler1 = function(event) {
            viewer.navigator.world.removeHandler('add-item', navOpenHandler1);
            assert.equal(viewer.navigator.source, viewer.source, 'viewer and navigator have the same source');
            assert.ok(viewer.navigator._updateRequestId, 'navigator timer is on');
            viewer.addHandler('close', closeHandler1);
            viewer.addHandler('open', openHandler2);
            viewer.open('/test/data/tall.dzi');
        };

        const openHandler1 = function(event) {
            viewer.removeHandler('open', openHandler1);
            assert.ok(viewer.navigator, 'navigator exists');
            viewer.navigator.world.addHandler('add-item', navOpenHandler1);
        };

        viewer.addHandler('open', openHandler1);
    });

    QUnit.test('Item positions including collection mode', function(assert) {
        const done = assert.async();

        viewer = OpenSeadragon({
            id:            'example',
            prefixUrl:     '/build/openseadragon/images/',
            tileSources:   ['/test/data/testpattern.dzi', '/test/data/testpattern.dzi'],
            springStiffness: 100, // Faster animation = faster tests
            showNavigator:  true,
            collectionMode: true
        });

        const navOpenHandler = function(event) {
            if (viewer.navigator.world.getItemCount() === 2) {
                viewer.navigator.world.removeHandler('add-item', navOpenHandler);

                setTimeout(function() {
                    // Test initial formation
                    for (let i = 0; i < 2; i++) {
                        assert.propEqual(viewer.navigator.world.getItemAt(i).getBounds(),
                            viewer.world.getItemAt(i).getBounds(), 'bounds are the same');
                    }

                    // Try moving one
                    viewer.world.getItemAt(0).setPosition(new OpenSeadragon.Point(-200, -200));
                    assert.propEqual(viewer.navigator.world.getItemAt(0).getBounds(),
                        viewer.world.getItemAt(0).getBounds(), 'bounds are the same after move');

                    done();
                }, 1);
            }
        };

        const openHandler = function() {
            viewer.removeHandler('open', openHandler);
            viewer.navigator.world.addHandler('add-item', navOpenHandler);
            // The navigator may already have added the items.
            navOpenHandler();
        };

        viewer.addHandler('open', openHandler);
    });

    QUnit.test('Item opacity is synchronized', function(assert) {
        const done = assert.async();
        viewer = OpenSeadragon({
            id:            'example',
            prefixUrl:     '/build/openseadragon/images/',
            tileSources:   ['/test/data/testpattern.dzi', '/test/data/testpattern.dzi'],
            springStiffness: 100, // Faster animation = faster tests
            showNavigator:  true
        });

        const navOpenHandler = function(event) {
            if (viewer.navigator.world.getItemCount() === 2) {
                viewer.navigator.world.removeHandler('add-item', navOpenHandler);

                setTimeout(function() {
                    // Test initial formation
                    for (let i = 0; i < 2; i++) {
                        assert.equal(viewer.navigator.world.getItemAt(i).getOpacity(),
                            viewer.world.getItemAt(i).getOpacity(), 'opacity is the same');
                    }

                    // Try changing the opacity of one
                    viewer.world.getItemAt(1).setOpacity(0.5);
                    assert.equal(viewer.navigator.world.getItemAt(1).getOpacity(),
                        viewer.world.getItemAt(1).getOpacity(), 'opacity is the same after change');

                    done();
                }, 1);
            }
        };

        const openHandler = function() {
            viewer.removeHandler('open', openHandler);
            viewer.navigator.world.addHandler('add-item', navOpenHandler);
            // The navigator may already have added the items.
            navOpenHandler();
        };

        viewer.addHandler('open', openHandler);
    });

    QUnit.test('Item composite operation is synchronized', function(assert) {
        const done = assert.async();
        viewer = OpenSeadragon({
            id:            'example',
            prefixUrl:     '/build/openseadragon/images/',
            tileSources:   ['/test/data/testpattern.dzi', '/test/data/testpattern.dzi'],
            springStiffness: 100, // Faster animation = faster tests
            showNavigator:  true
        });

        const navOpenHandler = function(event) {
            if (viewer.navigator.world.getItemCount() === 2) {
                viewer.navigator.world.removeHandler('add-item', navOpenHandler);

                setTimeout(function() {
                    // Test initial formation
                    for (let i = 0; i < 2; i++) {
                        assert.equal(viewer.navigator.world.getItemAt(i).getCompositeOperation(),
                            viewer.world.getItemAt(i).getCompositeOperation(), 'composite operation is the same');
                    }

                    // Try changing the composite operation of one
                    viewer.world.getItemAt(1).setCompositeOperation('multiply');
                    assert.equal(viewer.navigator.world.getItemAt(1).getCompositeOperation(),
                        viewer.world.getItemAt(1).getCompositeOperation(), 'composite operation is the same after change');

                    done();
                }, 1);
            }
        };

        const openHandler = function() {
            viewer.removeHandler('open', openHandler);
            viewer.navigator.world.addHandler('add-item', navOpenHandler);
            // The navigator may already have added the items.
            navOpenHandler();
        };

        viewer.addHandler('open', openHandler);
    });

    QUnit.test('Viewer options transmitted to navigator', function(assert) {
        const done = assert.async();
        viewer = OpenSeadragon({
            id:            'example',
            prefixUrl:     '/build/openseadragon/images/',
            tileSources:   ['/test/data/testpattern.dzi', '/test/data/testpattern.dzi'],
            springStiffness: 100, // Faster animation = faster tests
            showNavigator:  true,
            collectionMode: true,
            crossOriginPolicy: 'Anonymous'
        });
        viewer.addHandler('open', function openHandler() {
            viewer.removeHandler('open', openHandler);

            assert.equal(viewer.navigator.prefixUrl, viewer.prefixUrl,
                "Prefix URL should be transmitted to the navigator.");
            assert.equal(viewer.navigator.crossOriginPolicy, viewer.crossOriginPolicy,
                "Cross origin policy should be transmitted to the navigator.");
            done();
        });

    });

    QUnit.test('Viewer rotation applied to navigator by default', function(assert) {
        const done = assert.async();
        viewer = OpenSeadragon({
            id:            'example',
            prefixUrl:     '/build/openseadragon/images/',
            tileSources:   '/test/data/tall.dzi',
            springStiffness: 100, // Faster animation = faster tests
            showNavigator:  true,
            degrees:        45
        });
        viewer.addHandler('open', function openHandler() {
            viewer.removeHandler('open', openHandler);

            assert.equal(viewer.navigator.viewport.getRotation(), 45,
                "Rotation set in constructor should be applied to navigator by default.");

            viewer.viewport.setRotation(90);
            assert.equal(viewer.navigator.viewport.getRotation(), 90,
                "Rotation set by setRotation should be applied to navigator by default.");

            done();
        });
    });

    QUnit.test('Viewer rotation not applied to navigator when navigatorRotate=false', function(assert) {
        const done = assert.async();
        viewer = OpenSeadragon({
            id:            'example',
            prefixUrl:     '/build/openseadragon/images/',
            tileSources:   '/test/data/tall.dzi',
            springStiffness: 100, // Faster animation = faster tests
            showNavigator:  true,
            degrees:        45,
            navigatorRotate: false
        });
        viewer.addHandler('open', function openHandler() {
            viewer.removeHandler('open', openHandler);

            assert.equal(viewer.navigator.viewport.getRotation(), 0,
                "Rotation set in constructor should not be applied to navigator when navigatorRotate is false.");

            viewer.viewport.setRotation(90);
            assert.equal(viewer.navigator.viewport.getRotation(), 0,
                "Rotation set by setRotation should not be applied to navigator when navigatorRotate is false.");

            done();
        });
    });

    QUnit.test('Explicit height/width', function(assert) {
        const done = assert.async();
        viewer = OpenSeadragon({
            id:            'example',
            prefixUrl:     '/build/openseadragon/images/',
            tileSources:   '/test/data/tall.dzi',
            springStiffness: 100, // Faster animation = faster tests
            showNavigator:  true,
            navigatorWidth: 200,
            navigatorHeight: 300
        });
        viewer.addOnceHandler('open', function() {
            const $navigator = $('.navigator');

            // With the current configuration, the default values would be 100 x 100 if we hadn't set navigatorWidth and navigatorHeight.
            assert.equal($navigator.width(), 200, "Navigator starts with the correct width.");
            assert.equal($navigator.height(), 300, "Navigator starts with the correct height.");

            viewer.navigator.setWidth(400);
            viewer.navigator.setHeight(500);
            assert.equal($navigator.width(), 400, "Navigator changes to the correct width.");
            assert.equal($navigator.height(), 500, "Navigator changes to the correct height.");

            done();
        });
    });

})();
