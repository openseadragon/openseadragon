QUnit.config.autostart = false;

(function () {
    var viewer = null;

    $(document).ready(function () {
        start();
    });

    var assessNumericValueWithSomeVariance = function (value1, value2, variance, message) {
        var varianceAsPortionOfTargetValue = Math.max(.03, Math.abs(value1 * variance));
        ok(Math.abs(value1 - value2) <= varianceAsPortionOfTargetValue, message + " Expected:" + value1 + " Found: " + value2 + " Variance: " + varianceAsPortionOfTargetValue);
    };

    var assessNavigatorLocation = function (expectedX, expectedY) {
        var navigator = $(".navigator");

        assessNumericValueWithSomeVariance(expectedX, navigator.offset().left, .1, ' Navigator x position');
        assessNumericValueWithSomeVariance(expectedY, navigator.offset().top, .1, ' Navigator y position');
    };


    var assessNavigatorDisplayRegionAndMainViewerState = function (theViewer, theDisplayRegionSelector, status) {

        var displayRegion = $(theDisplayRegionSelector);
        var mainViewerBounds = theViewer.viewport.getBounds();

        var displayTopLeftLocationInPixels = new OpenSeadragon.Point(displayRegion.position().left, displayRegion.position().top);
        var displayRegionDimensionsInPixels = new OpenSeadragon.Point((displayRegion.width()),(displayRegion.height()))
                                                               .plus(theViewer.navigator.totalBorderWidths);
        var displayBottomRightLocationInPixels = displayTopLeftLocationInPixels.plus(displayRegionDimensionsInPixels);

        var displayLocationInPoints = theViewer.navigator.viewport.pointFromPixel(displayTopLeftLocationInPixels);
        var displayRegionDimensionsInPoints = theViewer.navigator.viewport.pointFromPixel(displayBottomRightLocationInPixels).minus(displayLocationInPoints);

        assessNumericValueWithSomeVariance(mainViewerBounds.width, displayRegionDimensionsInPoints.x, .05, status + ' Width synchronization');
        assessNumericValueWithSomeVariance(mainViewerBounds.height, displayRegionDimensionsInPoints.y, .05, status + ' Height synchronization');
        assessNumericValueWithSomeVariance(mainViewerBounds.x, displayLocationInPoints.x, .05, status + ' Left synchronization');
        assessNumericValueWithSomeVariance(mainViewerBounds.y, displayLocationInPoints.y, .05, status + ' Top synchronization');
    };

    var filterToDetectThatDisplayRegionHasBeenDrawn = function () {
        var self = $(this);
        return self.width() > 0 &&
            self.height() > 0 &&
            (typeof self.position() !== 'undefined');
    };

    var waitUntilFilterSatisfied = function () {
        return function () {
            return function (selector, filterfunction, handler, recursiveCall, count) {
                var found;
                if (recursiveCall !== true) {
                    count = 0;
                }
                var $this = $(selector).filter(filterfunction);
                found = found || $this.length > 0;
                if (!found && count < 20) {
                    setTimeout(function () {
                        count++;
                        waitUntilFilterSatisfied(selector, filterfunction, handler, true, count);
                    }, 50)
                }
                else {
                    handler();
                }
            };
        }();
    }();

    var waitForViewer = function () {
        return function () {
            return function (theViewer, handler, targetPropery, viewportFunctionToInspectTargetProperty, recursiveCall, count) {
                var propertyAchieved = false;
                if (recursiveCall !== true) {
                    count = 0;
                }
                if (typeof viewportFunctionToInspectTargetProperty === "function") {
                    try
                    {
                        propertyAchieved = targetPropery === viewportFunctionToInspectTargetProperty.call(theViewer.viewport, true);
                    }
                    catch(err)
                    {
                        //Ignore.  Subsequent code will try again shortly
                    }
                }
                if ((theViewer.drawer === null || theViewer.drawer.needsUpdate() || !propertyAchieved) && count < 40) {
                    count++;
                    setTimeout(function () {
                        waitForViewer(theViewer, handler, targetPropery, viewportFunctionToInspectTargetProperty, true, count);
                    }, 50)
                }
                else {
                    handler();
                }
            };
        }();
    }();

    var assessNavigatorViewerPlacement = function (seadragonProperties, testProperties) {
        viewer = OpenSeadragon(seadragonProperties);

        var assessNavigatorAfterDrag = function () {
            assessNavigatorDisplayRegionAndMainViewerState(viewer, testProperties.displayRegionLocator, "After pan");
            start();
        };

        var assessNavigatorAfterZoom = function () {
            var target = new OpenSeadragon.Point(0.4, 0.4);
            assessNavigatorDisplayRegionAndMainViewerState(viewer, testProperties.displayRegionLocator, "After image zoom");
            viewer.viewport.panTo(target);
            waitForViewer(viewer, assessNavigatorAfterDrag, target, viewer.viewport.getCenter);
        };

        var captureInitialStateAfterOpenAndThenAct = function () {
            assessNavigatorDisplayRegionAndMainViewerState(viewer, testProperties.displayRegionLocator, "After image load");

            testProperties.determineExpectationsAndAssessNavigatorLocation(seadragonProperties, testProperties);

            viewer.viewport.zoomTo(viewer.viewport.getZoom() * 2);
            waitForViewer(viewer, assessNavigatorAfterZoom, 2, viewer.viewport.getZoom);
        };

        var proceedOnceTheIntialImagesAreLoaded = function () {
            waitUntilFilterSatisfied(testProperties.displayRegionLocator, filterToDetectThatDisplayRegionHasBeenDrawn, captureInitialStateAfterOpenAndThenAct);
        };

        var waitForNavigator = function () {
            waitForViewer(viewer.navigator, proceedOnceTheIntialImagesAreLoaded);
        };

        var openHandler = function () {
            viewer.removeHandler('open', openHandler);
            waitForViewer(viewer, waitForNavigator);
        };

        viewer.addHandler('open', openHandler);

    };

    module("navigator", {
        setup:function () {
            //TODO This is alonger than is ideal so the tests will pass cleanly under Safari
            QUnit.config.testTimeout = 20000;
            if (viewer != null) {
                viewer.close();
            }
            if ($('#exampleNavigator').is(':ui-dialog')) {
                $('#exampleNavigator').dialog('destroy');
            }
            $("#exampleNavigator").remove();
            $(".navigator").remove();
            $("#example").empty();
            $("#tallexample").empty();
            $("#wideexample").empty();
            $("#example").parent().append('<div id="exampleNavigator"></div>');

        }
    });

    asyncTest('ZoomAndDragOnCustomNavigatorLocation', function () {
        assessNavigatorViewerPlacement({
                id:'example',
                navigatorId:'exampleNavigator',
                prefixUrl:'/build/openseadragon/images/',
                tileSources:'/test/data/testpattern.dzi',
                showNavigator:true
            },
            {
                displayRegionLocator:'#exampleNavigator .displayregion',
                navigatorLocator:'#exampleNavigator',
                determineExpectationsAndAssessNavigatorLocation:function (seadragonProperties, testProperties) {
                    var mainViewerElement = $("#" + seadragonProperties.id);
                    assessNavigatorLocation(mainViewerElement.offset().left,
                        mainViewerElement.offset().top + mainViewerElement.height());
                }
            });
    });

    asyncTest('DefaultNavigatorLocation', function () {
        assessNavigatorViewerPlacement({
                id:'example',
                prefixUrl:'/build/openseadragon/images/',
                tileSources:'/test/data/testpattern.dzi',
                showNavigator:true
            },
            {
                displayRegionLocator:'.navigator .displayregion',
                navigatorLocator:'.navigator',
                determineExpectationsAndAssessNavigatorLocation:function (seadragonProperties, testProperties) {
                    var mainViewerElement = $("#" + seadragonProperties.id);
                    var navigatorElement = $(testProperties.navigatorLocator);
                    assessNavigatorLocation(mainViewerElement.offset().left + mainViewerElement.width() - navigatorElement.width(),
                        mainViewerElement.offset().top);
                }
            });
    });

    asyncTest('NavigatorOnJQueryDialog', function () {
        assessNavigatorViewerPlacement({
                id:'example',
                navigatorId:'exampleNavigator',
                prefixUrl:'/build/openseadragon/images/',
                tileSources:'/test/data/testpattern.dzi',
                showNavigator:true
            },
            {
                displayRegionLocator:'#exampleNavigator .displayregion',
                navigatorLocator:'#exampleNavigator',
                determineExpectationsAndAssessNavigatorLocation:function (seadragonProperties, testProperties) {
                    var jqueryDialog = $(testProperties.navigatorLocator);
                    assessNavigatorLocation(jqueryDialog.offset().left,
                        jqueryDialog.offset().top);
                }
            });
    });

    asyncTest('DefaultNavigatorLocationWithWideImageSquareViewer', function () {
        assessNavigatorViewerPlacement({
                id:'example',
                prefixUrl:'/build/openseadragon/images/',
                tileSources:'/test/data/wide.dzi',
                showNavigator:true
            },
            {
                displayRegionLocator:'.navigator .displayregion',
                navigatorLocator:'.navigator',
                determineExpectationsAndAssessNavigatorLocation:function (seadragonProperties, testProperties) {
                    var mainViewerElement = $("#" + seadragonProperties.id);
                    var navigatorElement = $(testProperties.navigatorLocator);
                    assessNavigatorLocation(mainViewerElement.offset().left + mainViewerElement.width() - navigatorElement.width(),
                        mainViewerElement.offset().top);
                }
            });
    });

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
                determineExpectationsAndAssessNavigatorLocation:function (seadragonProperties, testProperties) {
                    var mainViewerElement = $("#" + seadragonProperties.id);
                    var navigatorElement = $(testProperties.navigatorLocator);
                    assessNavigatorLocation(mainViewerElement.offset().left + mainViewerElement.width() - navigatorElement.width(),
                        mainViewerElement.offset().top);
                }
            });
    });

    asyncTest('DefaultNavigatorLocationWithWideImageWideViewer', function () {
        assessNavigatorViewerPlacement({
                id:'wideexample',
                prefixUrl:'/build/openseadragon/images/',
                tileSources:'/test/data/wide.dzi',
                showNavigator:true
            },
            {
                displayRegionLocator:'.navigator .displayregion',
                navigatorLocator:'.navigator',
                determineExpectationsAndAssessNavigatorLocation:function (seadragonProperties, testProperties) {
                    var mainViewerElement = $("#" + seadragonProperties.id);
                    var navigatorElement = $(testProperties.navigatorLocator);
                    assessNavigatorLocation(mainViewerElement.offset().left + mainViewerElement.width() - navigatorElement.width(),
                        mainViewerElement.offset().top);
                }
            });
    });

    asyncTest('DefaultNavigatorLocationWithTallImageSquareViewer', function () {
        assessNavigatorViewerPlacement({
                id:'example',
                prefixUrl:'/build/openseadragon/images/',
                tileSources:'/test/data/tall.dzi',
                showNavigator:true
            },
            {
                displayRegionLocator:'.navigator .displayregion',
                navigatorLocator:'.navigator',
                determineExpectationsAndAssessNavigatorLocation:function (seadragonProperties, testProperties) {
                    var mainViewerElement = $("#" + seadragonProperties.id);
                    var navigatorElement = $(testProperties.navigatorLocator);
                    assessNavigatorLocation(mainViewerElement.offset().left + mainViewerElement.width() - navigatorElement.width(),
                        mainViewerElement.offset().top);
                }
            });
    });

    asyncTest('DefaultNavigatorLocationWithTallImageSquareViewer', function () {
        assessNavigatorViewerPlacement({
                id:'example',
                prefixUrl:'/build/openseadragon/images/',
                tileSources:'/test/data/tall.dzi',
                showNavigator:true
            },
            {
                displayRegionLocator:'.navigator .displayregion',
                navigatorLocator:'.navigator',
                determineExpectationsAndAssessNavigatorLocation:function (seadragonProperties, testProperties) {
                    var mainViewerElement = $("#" + seadragonProperties.id);
                    var navigatorElement = $(testProperties.navigatorLocator);
                    assessNavigatorLocation(mainViewerElement.offset().left + mainViewerElement.width() - navigatorElement.width(),
                        mainViewerElement.offset().top);
                }
            });
    });

    asyncTest('DefaultNavigatorLocationWithTallImageSquareViewer', function () {
        assessNavigatorViewerPlacement({
                id:'tallexample',
                prefixUrl:'/build/openseadragon/images/',
                tileSources:'/test/data/tall.dzi',
                showNavigator:true
            },
            {
                displayRegionLocator:'.navigator .displayregion',
                navigatorLocator:'.navigator',
                determineExpectationsAndAssessNavigatorLocation:function (seadragonProperties, testProperties) {
                    var mainViewerElement = $("#" + seadragonProperties.id);
                    var navigatorElement = $(testProperties.navigatorLocator);
                    assessNavigatorLocation(mainViewerElement.offset().left + mainViewerElement.width() - navigatorElement.width(),
                        mainViewerElement.offset().top);
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
                determineExpectationsAndAssessNavigatorLocation:function (seadragonProperties, testProperties) {
                    var mainViewerElement = $("#" + seadragonProperties.id);
                    var navigatorElement = $(testProperties.navigatorLocator);
                    assessNavigatorLocation(mainViewerElement.offset().left + mainViewerElement.width() - navigatorElement.width(),
                        mainViewerElement.offset().top);
                }
            });
    });


    //Try with different navigator locations, in a jquery dialog and in a default location
    //Test whether showNavigator works
    //Test whether the initial locations works

    //Other tests that require additional sample images
    //Switch content, make sure things work

    //Other tests that require a reasonable event simulation approachj
    //Test autohide
    //Operate on the navigator


})();
