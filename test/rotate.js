/* global module, asyncTest, $, ok, equal, notEqual, start, test, Util, testLog */

(function () {
    var viewer;

    module('Basic', {
        setup: function () {
            var example = $('<div id="rotateTests"></div>').appendTo("#qunit-fixture");

            testLog.reset();

        },
        teardown: function () {
            if (viewer && viewer.close) {
                viewer.close();
            }

            viewer = null;
        }
    });

    asyncTest('RotateControlOff', function () {

        var openHandler = function (event) {
            viewer.removeHandler('open', openHandler);
            ok(true, 'Open event was sent');
            ok(viewer.drawer, 'Drawer exists');
            ok(viewer.drawer.canRotate(), 'drawer.canRotate needs to be true');
            ok(!viewer.showRotationControl, 'showRotationControl should be off');
            ok(!viewer.rotateLeft, "rotateLeft button should be null");
            ok(!viewer.rotateRight, "rotateRight button should be null");
            start();
        };

        viewer = OpenSeadragon({
            id:             'rotateTests',
            prefixUrl:      '/build/openseadragon/images/',
            springStiffness: 100, // Faster animation = faster tests
            showRotationControl: false
        });
        viewer.addHandler('open', openHandler);
        viewer.open('/test/data/testpattern.dzi');
    });

    asyncTest('RotateControlOn', function () {

        var openHandler = function (event) {
            viewer.removeHandler('open', openHandler);
            ok(true, 'Open event was sent');
            ok(viewer.drawer, 'Drawer exists');
            ok(viewer.drawer.canRotate(), 'drawer.canRotate needs to be true');
            ok(viewer.showRotationControl, 'showRotationControl should be true');
            ok(-1 != viewer.buttons.buttons.indexOf(viewer.rotateLeft), "rotateLeft should be found");
            ok(-1 != viewer.buttons.buttons.indexOf(viewer.rotateRight), "rotateRight should be found");

            // Now simulate the left/right button clicks.
            // TODO: re-factor simulateViewerClickWithDrag so it'll accept any element, and use that.
            ok(viewer.viewport.degrees === 0, "Image should start at 0 degrees rotation");
            viewer.rotateLeft.onRelease();
            ok(viewer.viewport.degrees === 270, "Image should be 270 degrees rotation (left)");
            viewer.rotateRight.onRelease();
            ok(viewer.viewport.degrees === 0, "Image should be 270 degrees rotation (right)");

            start();
        };

        viewer = OpenSeadragon({
            id:            'rotateTests',
            prefixUrl:     '/build/openseadragon/images/',
            springStiffness: 100, // Faster animation = faster tests
            showRotationControl: true
        });
        viewer.addHandler('open', openHandler);
        viewer.open('/test/data/testpattern.dzi');
    });

})();
