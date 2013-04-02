QUnit.config.autostart = false;

(function () {
    var viewer = null;
    var displayRegion = null;
    var navigator = null;
    var navigatorAspectRatio = null;
    var leftScalingFactor = null;
    var maxHeightFactor = null;
    var spaceFromLeftEdgeOfViewerToContentStart = null;
    var spaceFromTopEdgeOfViewerToContentStart = null;
    var widthOfViewerContentOnNavigator = null;
    var heightOfViewerContentOnNavigator = null;

    module("navigator", {
        setup:function () {
            resetDom();
            resetTestVariables();
        }
    });

    $(document).ready(function () {
        start();
    });

    var resetTestVariables = function()
    {
         if (viewer != null) {
             viewer.close();
         }
         displayRegion = null;
         navigator = null;
         navigatorAspectRatio = null;
         leftScalingFactor = null;
         maxHeightFactor = null;
         spaceFromLeftEdgeOfViewerToContentStart = null;
         spaceFromTopEdgeOfViewerToContentStart = null;
         widthOfViewerContentOnNavigator = null;
         heightOfViewerContentOnNavigator = null;
    };

    var resetDom = function()
    {
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

    var equalsWithSomeVariance = function (value1, value2, variance) {
        return Math.abs(value1 - value2) <= variance;
    };


    var assessNumericValueWithSomeVariance = function (value1, value2, variance, message) {
        ok(equalsWithSomeVariance(value1, value2, variance), message + " Expected:" + value1 + " Found: " + value2 + " Variance: " + variance);
    };

    var assessNavigatorLocation = function (expectedX, expectedY) {
        var navigator = $(".navigator");

        assessNumericValueWithSomeVariance(expectedX, navigator.offset().left, 4, ' Navigator x position');
        assessNumericValueWithSomeVariance(expectedY, navigator.offset().top, 4, ' Navigator y position');
    };

    var navigatorRegionBoundsInPoints = function ()
    {
        var regionBoundsInPoints;
        if (navigator === null)
        {
            maxHeightFactor = 1;
            navigator = $(".navigator");
            navigatorAspectRatio = navigator.height() /navigator.width();
            leftScalingFactor = navigatorAspectRatio * viewer.source.aspectRatio;
            if (viewer.source.aspectRatio < 1)
            {
                if (viewer.source.aspectRatio < navigatorAspectRatio)
                {
                    maxHeightFactor =  viewer.source.aspectRatio * navigatorAspectRatio;
                }
                else
                {
                    maxHeightFactor =  viewer.source.aspectRatio;
                }
                spaceFromLeftEdgeOfViewerToContentStart = ((1/maxHeightFactor)-1) / 2 * maxHeightFactor * navigator.width();
                spaceFromTopEdgeOfViewerToContentStart = 0;
            }
            else
            {
                if (viewer.source.aspectRatio < navigatorAspectRatio)
                {
                    spaceFromTopEdgeOfViewerToContentStart =  (navigatorAspectRatio - (1/viewer.source.aspectRatio)) / 2 /navigatorAspectRatio * navigator.height();
                }
                else
                {
                    spaceFromTopEdgeOfViewerToContentStart =  (navigatorAspectRatio - (1/viewer.source.aspectRatio)) / 2 /navigatorAspectRatio * navigator.height();
                    leftScalingFactor = 1;
                }
            }
            widthOfViewerContentOnNavigator = navigator.width() - 2 * spaceFromLeftEdgeOfViewerToContentStart;
            heightOfViewerContentOnNavigator = navigator.height() - 2 * spaceFromTopEdgeOfViewerToContentStart;
        }

        var expectedDisplayRegionWidth = navigator.width() / viewer.viewport.getZoom() * maxHeightFactor;
        var expectedDisplayRegionHeight = navigator.height() / viewer.viewport.getZoom() * maxHeightFactor;
        var expectedDisplayRegionXLocation = viewer.viewport.getBounds().x * maxHeightFactor * navigator.width()   + spaceFromLeftEdgeOfViewerToContentStart;
        var expectedDisplayRegionYLocation = viewer.viewport.getBounds().y *  leftScalingFactor * navigator.width()  + spaceFromTopEdgeOfViewerToContentStart ;
        regionBoundsInPoints = new OpenSeadragon.Rect(expectedDisplayRegionXLocation,expectedDisplayRegionYLocation,expectedDisplayRegionWidth,expectedDisplayRegionHeight);


        return regionBoundsInPoints;

    };

    var assessNavigatorDisplayRegionAndMainViewerState = function (status) {

        var expectedBounds = navigatorRegionBoundsInPoints();
        assessNumericValueWithSomeVariance(expectedBounds.width, displayRegion.width() + viewer.navigator.totalBorderWidths.x, 2, status + ' Width synchronization');
        assessNumericValueWithSomeVariance(expectedBounds.height, displayRegion.height() + viewer.navigator.totalBorderWidths.y, 2, status + ' Height synchronization');
        assessNumericValueWithSomeVariance(expectedBounds.x, displayRegion.position().left, 2, status + ' Left synchronization');
        assessNumericValueWithSomeVariance(expectedBounds.y, displayRegion.position().top, 2, status + ' Top synchronization');
    };

    var waitForViewer = function () {
        return function (handler, count, lastDisplayRegionLeft, lastDisplayWidth) {
//            return function () {
                var currentDisplayRegionLeft;
                var currentDisplayWidth;
                if (displayRegion === null)
                {
                    displayRegion = $(".displayregion");
                }
                var viewerAndNavigatorDisplayReady = false;
                if (typeof count !== "number") {
                    count = 0;
                    lastDisplayRegionLeft = null;
                    lastDisplayWidth = null;
                }
                    try
                    {
                        currentDisplayRegionLeft =  displayRegion.position().left;
                        currentDisplayWidth =  displayRegion.width();
                        viewerAndNavigatorDisplayReady = viewer.drawer !== null &&
                            !viewer.drawer.needsUpdate() &&
                            currentDisplayWidth > 0 &&
                            equalsWithSomeVariance(lastDisplayRegionLeft, currentDisplayRegionLeft,.0001) &&
                                           equalsWithSomeVariance(lastDisplayWidth,currentDisplayWidth,.0001) &&
                                           equalsWithSomeVariance(viewer.viewport.getBounds(true).x,viewer.viewport.getBounds().x,.0001) &&
                                           equalsWithSomeVariance(viewer.viewport.getBounds(true).y,viewer.viewport.getBounds().y,.0001) &&
                                           equalsWithSomeVariance(viewer.viewport.getBounds(true).width,viewer.viewport.getBounds().width,.0001);
                    }
                    catch(err)
                    {
                        //Ignore.  Subsequent code will try again shortly
                    }
                if (( !viewerAndNavigatorDisplayReady) && count < 50) {
                    count++;
                    setTimeout(function () {waitForViewer(handler, count, currentDisplayRegionLeft, currentDisplayWidth);}, 100)
                }
                else {
                    if (count === 40)
                    {
                    console.log( "waitForViewer:" +
                                  viewer.drawer + ":" + viewer.drawer.needsUpdate()  + ":" +
                                  viewerAndNavigatorDisplayReady + ":" +
                                  lastDisplayRegionLeft + ":" + currentDisplayRegionLeft + ":" +
                                  lastDisplayWidth + ":" + currentDisplayWidth + ":"  +
                                  viewer.viewport.getBounds(true).x + ":" + viewer.viewport.getBounds().x + ":" +
                                  viewer.viewport.getBounds(true).y + ":" + viewer.viewport.getBounds().y + ":" +
                                  viewer.viewport.getBounds(true).width + ":" + viewer.viewport.getBounds().width + ":"  +
                                  count );
                    }
                    handler();
                }
            };
//        }();
    }();

    var simulateNavigatorClick = function(viewer, locationX, locationY) {
        var $canvas = $(viewer.element).find('.openseadragon-canvas');
        var offset = $canvas.offset();
        var event = {
            clientX: offset.left +  locationX,
            clientY: offset.top +  locationY
        };

        $canvas
            .simulate('mouseover', event)
            .simulate('mousedown', event)
            .simulate('mouseup', event);
    };

    var simulateNavigatorDrag = function(viewer, distanceX, distanceY) {
        var $canvas = $(viewer.element).find('.displayregion');
        var event = {
            dx: Math.floor(distanceX),
            dy: Math.floor(distanceY)
        };

        $canvas
            .simulate('drag', event);
    };

    var assessViewerInCorner = function(theContentCorner)
    {
       return function()
       {
       var expectedXCoordinate, expecteYCoordinate;
       if (theContentCorner === "TOPLEFT")
       {
           expectedXCoordinate = 0;
           expecteYCoordinate = 0;
       }
       else if (theContentCorner === "TOPRIGHT")
       {
           expectedXCoordinate = 1-viewer.viewport.getBounds().width;
           expecteYCoordinate = 0;
       }
       else if (theContentCorner === "BOTTOMRIGHT")
       {
           expectedXCoordinate = 1-viewer.viewport.getBounds().width;
           expecteYCoordinate = 1/viewer.source.aspectRatio - viewer.viewport.getBounds().height;
       }
       else if (theContentCorner === "BOTTOMLEFT")
       {
           expectedXCoordinate = 0;
           expecteYCoordinate = 1/viewer.source.aspectRatio - viewer.viewport.getBounds().height;
       }
        if (viewer.viewport.getBounds().width < 1)
        {
            assessNumericValueWithSomeVariance(expectedXCoordinate, viewer.viewport.getBounds().x,.04, ' Viewer at ' + theContentCorner + ', x coord');
        }
        if (viewer.viewport.getBounds().height < 1/viewer.source.aspectRatio)
        {
            assessNumericValueWithSomeVariance(expecteYCoordinate, viewer.viewport.getBounds().y,.04, ' Viewer at ' + theContentCorner + ', y coord');
        }
       }
    };

    var assessViewerInCenter = function()
    {
        var yPositionVariance = .04;
        if (viewer.source.aspectRatio < 1)
        {
            yPositionVariance = yPositionVariance / viewer.source.aspectRatio;
        }
        assessNumericValueWithSomeVariance(1/viewer.source.aspectRatio/2, viewer.viewport.getCenter().y,yPositionVariance, ' Viewer at center, y coord');
        assessNumericValueWithSomeVariance(.5, viewer.viewport.getCenter().x,.4, ' Viewer at center, x coord');
    };


    var clickOnNavigator = function(theContentCorner)
    {
       return function()
       {
           var xPos, yPos;
           if (theContentCorner === "TOPLEFT")
           {
               xPos = spaceFromLeftEdgeOfViewerToContentStart;
               yPos = spaceFromTopEdgeOfViewerToContentStart;
           }
           else if (theContentCorner === "TOPRIGHT")
           {
               xPos = spaceFromLeftEdgeOfViewerToContentStart + widthOfViewerContentOnNavigator;
               yPos = spaceFromTopEdgeOfViewerToContentStart;
           }
           else if (theContentCorner === "BOTTOMRIGHT")
           {
               xPos = spaceFromLeftEdgeOfViewerToContentStart + widthOfViewerContentOnNavigator;
               yPos = spaceFromTopEdgeOfViewerToContentStart + heightOfViewerContentOnNavigator;
           }
           else if (theContentCorner === "BOTTOMLEFT")
           {
               xPos = spaceFromLeftEdgeOfViewerToContentStart;
               yPos = spaceFromTopEdgeOfViewerToContentStart + heightOfViewerContentOnNavigator;
           }
            simulateNavigatorClick(viewer.navigator, xPos, yPos);
       }
    };

    var dragNavigatorBackToCenter = function()
    {
        var start = viewer.viewport.getBounds().getTopLeft();
        var target = new OpenSeadragon.Point(0.5 - viewer.viewport.getBounds().width/2,
                                             1/viewer.source.aspectRatio/2 - viewer.viewport.getBounds().height/2);
        var delta = target.minus(start);
        if (viewer.source.aspectRatio < 1)
        {
            {
                delta.y = delta.y *  viewer.source.aspectRatio;
            }
        }
        simulateNavigatorDrag(viewer.navigator, delta.x * widthOfViewerContentOnNavigator, delta.y * heightOfViewerContentOnNavigator);
    };

    var assessNavigatorViewerPlacement = function (seadragonProperties, testProperties) {
        seadragonProperties.visibilityRatio = 1;
        viewer = OpenSeadragon(seadragonProperties);

        var navigatorInteractionOperations = [ clickOnNavigator("TOPRIGHT"),dragNavigatorBackToCenter,
                                               clickOnNavigator("BOTTOMLEFT"),dragNavigatorBackToCenter,
                                               clickOnNavigator("BOTTOMRIGHT"),dragNavigatorBackToCenter,
                                               clickOnNavigator("TOPLEFT"),dragNavigatorBackToCenter ];
        var navigatorAssessmentOperations = [assessViewerInCorner("TOPRIGHT"),assessViewerInCenter,
                                             assessViewerInCorner("BOTTOMLEFT"),assessViewerInCenter,
                                             assessViewerInCorner("BOTTOMRIGHT"),assessViewerInCenter,
                                             assessViewerInCorner("TOPLEFT"),assessViewerInCenter];

        var navigatorAssessmentMessages = ["After click on navigator on top right","After drag on navigator from top right",
                                           "After click on navigator on bottom left","After drag on navigator from bottom left",
                                           "After click on navigator on bottom right","After drag on navigator from bottom right",
                                           "After click on navigator on top right","After drag on navigator from top right"];

        var assessNavigatorOperationAndTakeNextStep = function(step)
        {
            return function()
            {
                var nextStep = step+1;
                assessNavigatorDisplayRegionAndMainViewerState(navigatorAssessmentMessages[step]);
                navigatorAssessmentOperations[step]();
                if (step === navigatorInteractionOperations.length-1)
                {
                    start();
                }
                else
                {
                    navigatorInteractionOperations[nextStep]();
                    waitForViewer(assessNavigatorOperationAndTakeNextStep(nextStep));
                }
            };
        };

        var assessAfterDragOnViewer = function () {
            assessNavigatorDisplayRegionAndMainViewerState("After pan");
            navigatorInteractionOperations[0]();
            waitForViewer(assessNavigatorOperationAndTakeNextStep(0));
        };

        var assessAfterZoomOnViewer = function () {
            var target = new OpenSeadragon.Point(0.4, 0.4);
            assessNavigatorDisplayRegionAndMainViewerState("After image zoom");
            viewer.viewport.panTo(target);
            waitForViewer(assessAfterDragOnViewer);
        };

        var captureInitialStateAfterOpenAndThenAct = function () {
            assessNavigatorDisplayRegionAndMainViewerState("After image load");

            testProperties.determineExpectationsAndAssessNavigatorLocation(seadragonProperties, testProperties);

            viewer.viewport.zoomTo(viewer.viewport.getZoom() * 2);
            waitForViewer(assessAfterZoomOnViewer);
        };

        var openHandler = function () {
            viewer.removeHandler('open', openHandler);
            waitForViewer(captureInitialStateAfterOpenAndThenAct);
        };

        viewer.addHandler('open', openHandler);

    };

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
        $('#exampleNavigator').dialog();
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

    asyncTest('DefaultNavigatorLocationWithTallImageTallViewer', function () {
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

    //Other tests that require a reasonable event simulation approach
    //Test autohide
    //Operate on the navigator


})();
