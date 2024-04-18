/* global QUnit, $, testLog */

(function() {
    var viewer1;
    var viewer2;

    QUnit.module('ViewerRetrieval', {
        beforeEach: function () {
            $('<div id="example1"></div><div id="example2"></div>')
                .appendTo("#qunit-fixture");

            testLog.reset();

            viewer1 = OpenSeadragon({
                id: 'example1',
                prefixUrl: 'build/openseadragon/images/',
                springStiffness: 100 // Faster animation = faster tests
            });

            viewer2 = OpenSeadragon({
                id: 'example2',
                prefixUrl: 'build/openseadragon/images/',
                springStiffness: 100
            });
        },

        afterEach: function () {
            if (viewer1){
                viewer1.destroy();
            }
            if (viewer2){
                viewer2.destroy();
            }
            viewer1 = viewer2 = null;
        }
    });

    QUnit.test('Get Viewers by Id', function(assert) {
        var retrievedViewer1 = OpenSeadragon.getViewer('example1');
        assert.ok(retrievedViewer1, 'Attached viewer retrieved');
        assert.equal(retrievedViewer1, viewer1, 'Viewers are same instance');

        var retrievedViewer2 = OpenSeadragon.getViewer('example2');
        assert.ok(retrievedViewer2, 'Attached viewer retrieved');
        assert.equal(retrievedViewer2, viewer2, 'Viewers are same instance');

        // Internal state
        assert.equal(OpenSeadragon._viewers.size, 2, 'Correct amount of viewers');
    });

    QUnit.test('Get Viewers by Element', function(assert) {
        var retrievedViewer1 = OpenSeadragon.getViewer(
            document.getElementById('example1'));
        assert.ok(retrievedViewer1, 'Attached viewer retrieved');
        assert.equal(retrievedViewer1, viewer1, 'Viewers are same instance');

        var retrievedViewer2 = OpenSeadragon.getViewer(
            document.getElementById('example2'));
        assert.ok(retrievedViewer2, 'Attached viewer retrieved');
        assert.equal(retrievedViewer2, viewer2, 'Viewers are same instance');

        // Internal state
        assert.equal(OpenSeadragon._viewers.size, 2, 'Correct amount of viewers');
    });

    QUnit.test('Undefined on Get Non-Existent Viewer by Id', function(assert) {
        var notFoundViewer = OpenSeadragon.getViewer('no-viewer');
        assert.equal(notFoundViewer, undefined, "Not found viewer is undefined");
    });

    QUnit.test('Undefined on Get Non-Existent Viewer by Element', function(assert) {
        var element = document.createElement('div');
        element.id = 'no-viewer';
        document.body.appendChild(element);

        var notFoundViewer = OpenSeadragon.getViewer(element);
        assert.equal(notFoundViewer, undefined, "Not found viewer is undefined");
    });

    QUnit.test('Cleanup Viewers Registration', function(assert) {
        viewer1.destroy();
        viewer2.destroy();
        viewer1 = viewer2 = null;

        var retrievedViewer1 = OpenSeadragon.getViewer('example1');
        var retrievedViewer2 = OpenSeadragon.getViewer('example2');
        assert.equal(retrievedViewer1, undefined, 'Viewer was destroyed');
        assert.equal(retrievedViewer2, undefined, 'Viewer was destroyed');

        // Internal state
        assert.equal(OpenSeadragon._viewers.size, 0, 'No viewers are registered');
    });
})();
