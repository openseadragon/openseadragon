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
            ok(viewer.drawer.canRotate(), 'drawer.canRotate is true');
            ok(!viewer.showRotationControl, 'showRotationControl is on - default should be off');
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
            ok(viewer.drawer.canRotate(), 'drawer.canRotate is true');
            ok(viewer.showRotationControl, 'showRotationControl is on');
            ok(-1 != viewer.buttons.buttons.indexOf(viewer.rotateLeft), "rotateLeft not found");
            ok(-1 != viewer.buttons.buttons.indexOf(viewer.rotateRight), "rotateRight not found");
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
