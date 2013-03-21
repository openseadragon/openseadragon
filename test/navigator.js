QUnit.config.autostart = false;
QUnit.config.testTimeout = 5000;

(function() {
    var viewer = null;

    $(document).ready(function() {
        start();
    });

    var assessNumericValueWithSomeVariance = function (value1, value2, variance, message)
    {
        ok(Math.abs (value1 - value2) <= variance, message + " " + value1 + ":" + value2);
    };

    var assessNavigatorLocation = function (expectedX, expectedY)
    {
        var navigator =  $(".navigator");

        assessNumericValueWithSomeVariance(expectedX,navigator.offset().left,5,status + ' Navigator x position');
        assessNumericValueWithSomeVariance(expectedY,navigator.offset().top,5,status +' Navigator y position');
    };


    var assessNavigatorDisplayRegionAndMainViewerState = function (theViewer, theNavigatorSelector, theDisplayRegionSelector, status)
    {
        var navigator =  $(theNavigatorSelector);
        var displayRegion =  $(theDisplayRegionSelector);
        var mainViewerBounds = theViewer.viewport.getBounds();

        //TODO These calculation need to be tweaked for non-square images
        assessNumericValueWithSomeVariance(mainViewerBounds.width,displayRegion.width() / navigator.width(),.025,status + ' Width synchronization');
        assessNumericValueWithSomeVariance(mainViewerBounds.height,displayRegion.height() / navigator.height(),.025,status +' Height synchronization');
        assessNumericValueWithSomeVariance(mainViewerBounds.x,displayRegion.position().left / navigator.width(),.025,status + ' Left synchronization');
        assessNumericValueWithSomeVariance(mainViewerBounds.y,displayRegion.position().top /navigator.height(),.025,status + ' Top synchronization');
    };

    var filterToDetectThatDisplayRegionHasBeenDrawn = function () {
        var self = $(this);
        OpenSeadragon.console.log( "Checking:" + self.html + "\n");
        return self.width() > 0 &&
            self.height() > 0 &&
           (typeof self.position !== 'undefined');
    };

    var waitUntilFilterSatisfied = function () {
        return function () {
            var found = false;
            var cancel = false;
            return function (selector, filterfunction, handler, recursiveCall, count) {
                if (recursiveCall !== true)
                {
                    found = false;
                    cancel = false;
                    count = 0;
                }
                var $this = $(selector).filter(filterfunction);
                found = found || $this.length > 0;
                if (!found && !cancel && count < 20) {
                    setTimeout(function () {
                        count++;
                        waitUntilFilterSatisfied(selector, filterfunction, handler, true, count);
                    }, 50)
                }
                else {
                    if (!cancel) {
                        cancel = true;
                        handler();
                    }
                    return $this;
                }
                return $this;
            };
        }();
    }();

    var waitForDrawer = function () {
        return function () {
            var drawerDone = false;
            var cancel = false;
            return function (theViewer, handler, recursiveCall, count) {
                if (recursiveCall !== true)
                {
                    drawerDone = false;
                    cancel = false;
                    count = 0;
                }
                drawerDone = drawerDone || !theViewer.drawer.needsUpdate();
                if (!drawerDone && !cancel && count < 20) {
                    count++;
                        setTimeout(function () {
                        waitForDrawer(theViewer, handler, true, count);
                    }, 50)
                }
                else {
                    if (!cancel) {
                        cancel = true;
                        handler();
                    }
                    return;
                }
                return;
            };
        }();
    }();

    module( "navigator", {
      setup: function() {
          QUnit.config.testTimeout = 5000;
          if ($('#exampleNavigator').is(':ui-dialog'))
          {
              $('#exampleNavigator').dialog('destroy');
          }
        $("#example").empty();
        $("#exampleNavigator").empty();
      }, teardown: function() {
            viewer.removeAllHandlers('animationfinish');
      }
    });

    asyncTest('ZoomAndDragOnCustomNavigatorLocation', function () {
        viewer = OpenSeadragon({
            id:'example',
            navigatorId:'exampleNavigator',
            prefixUrl:'/build/openseadragon/images/',
            tileSources:'/test/data/testpattern.dzi',
            showNavigator:true
        });

        var assessNavigatorAfterDrag = function () {
            assessNavigatorDisplayRegionAndMainViewerState(viewer,"#exampleNavigator",".displayregion", "After pan");
            start();
        };

        var assessNavigatorAfterZoom = function () {
            assessNavigatorDisplayRegionAndMainViewerState(viewer,"#exampleNavigator",".displayregion", "After image zoom");
            viewer.viewport.panTo(new OpenSeadragon.Point(0.1, 0.1));
            setTimeout(function() {waitForDrawer(viewer.navigator, assessNavigatorAfterDrag)},1000);
        };

        var captureInitialStateAfterOpenAndThenAct = function () {
            assessNavigatorDisplayRegionAndMainViewerState(viewer,"#exampleNavigator",".displayregion", "After image load");

            var mainViewerElement = $('#example');
            assessNavigatorLocation(mainViewerElement.offset().left,
                                    mainViewerElement.offset().top + mainViewerElement.height() );

            viewer.viewport.zoomTo(2);
            setTimeout(function() {waitForDrawer(viewer.navigator, assessNavigatorAfterZoom)},1000);
        };

        var proceedOnceTheIntialImagesAreLoaded = function () {
            waitUntilFilterSatisfied('#exampleNavigator .displayregion', filterToDetectThatDisplayRegionHasBeenDrawn, captureInitialStateAfterOpenAndThenAct);
        };

        var waitForNavigator = function () {
            waitForDrawer(viewer.navigator, proceedOnceTheIntialImagesAreLoaded);
        };

        var openHandler = function () {
            viewer.removeHandler('open',openHandler );
            waitForDrawer(viewer, waitForNavigator);
        };

        viewer.addHandler('open', openHandler);

    });

    asyncTest('NavigatorOnJQueryDialog', function () {
        $('#exampleNavigator').dialog();

        viewer = OpenSeadragon({
            id:'example',
            navigatorId:'exampleNavigator',
            prefixUrl:'/build/openseadragon/images/',
            tileSources:'/test/data/testpattern.dzi',
            showNavigator:true
        });

        var assessNavigatorAfterDrag = function () {
            assessNavigatorDisplayRegionAndMainViewerState(viewer,"#exampleNavigator",".displayregion", "After pan");
            start();
        };

        var assessNavigatorAfterZoom = function () {
            assessNavigatorDisplayRegionAndMainViewerState(viewer,"#exampleNavigator",".displayregion", "After image zoom");
            viewer.viewport.panTo(new OpenSeadragon.Point(0.1, 0.1));
            setTimeout(function() {waitForDrawer(viewer.navigator, assessNavigatorAfterDrag)},1000);
        };


        var captureInitialStateAfterOpenAndThenAct = function () {
            assessNavigatorDisplayRegionAndMainViewerState(viewer,"#exampleNavigator",".displayregion", "After image load");

            var jqueryDialog = $('#exampleNavigator');
            assessNavigatorLocation(jqueryDialog.offset().left,
                                    jqueryDialog.offset().top);


            viewer.viewport.zoomTo(2);
            setTimeout(function() {waitForDrawer(viewer.navigator, assessNavigatorAfterZoom)},1000);
        };

        var proceedOnceTheIntialImagesAreLoaded = function () {
            waitUntilFilterSatisfied('#exampleNavigator .displayregion', filterToDetectThatDisplayRegionHasBeenDrawn, captureInitialStateAfterOpenAndThenAct);
        };

        var waitForNavigator = function () {
            waitForDrawer(viewer.navigator, proceedOnceTheIntialImagesAreLoaded);
        };

        var openHandler = function () {
            viewer.removeHandler('open',openHandler );
            waitForDrawer(viewer, waitForNavigator);
        };

        viewer.addHandler('open', openHandler);

    });

    asyncTest('DefaultNavigatorLocation', function () {
        viewer = OpenSeadragon({
            id:'example',
            prefixUrl:'/build/openseadragon/images/',
            tileSources:'/test/data/testpattern.dzi',
            showNavigator:true
        });

        var assessNavigatorAfterDrag = function () {
            assessNavigatorDisplayRegionAndMainViewerState(viewer,".navigator",".displayregion", "After pan");
            start();
        };

        var assessNavigatorAfterZoom = function () {
            assessNavigatorDisplayRegionAndMainViewerState(viewer,".navigator",".displayregion", "After image zoom");
            viewer.viewport.panTo(new OpenSeadragon.Point(0.1, 0.1));
            setTimeout(function() {waitForDrawer(viewer.navigator, assessNavigatorAfterDrag)},1000);
        };

        var captureInitialStateAfterOpenAndThenAct = function () {
            assessNavigatorDisplayRegionAndMainViewerState(viewer,".navigator",".displayregion", "After image load");

            var mainViewerElement = $('#example');
            var navigatorElement = $('.navigator');
            assessNavigatorLocation(mainViewerElement.offset().left + mainViewerElement.width() - navigatorElement.width(),
                                    mainViewerElement.offset().top);

            viewer.viewport.zoomTo(2);
            setTimeout(function() {waitForDrawer(viewer.navigator, assessNavigatorAfterZoom)},1000);
        };

        var proceedOnceTheIntialImagesAreLoaded = function () {
            waitUntilFilterSatisfied('.navigator .displayregion', filterToDetectThatDisplayRegionHasBeenDrawn, captureInitialStateAfterOpenAndThenAct);
        };

        var waitForNavigator = function () {
            waitForDrawer(viewer.navigator, proceedOnceTheIntialImagesAreLoaded);
        };

        var openHandler = function () {
            viewer.removeHandler('open',openHandler );
            waitForDrawer(viewer, waitForNavigator);
         };

        viewer.addHandler('open', openHandler);

    });


    //Try with different navigator locations, in a jquery dialog and in a default location
    //Test whether showNavigator works
    //Test whether the initial locations works

    //Other tests that require additional sample images
    //Switch content, make sure things work
    //Try images with different shapes (i.e. including wide and tall)

    //Other tests that require a reasonable event simulation approachj
    //Test autohide
    //Operate on the navigator


})();
