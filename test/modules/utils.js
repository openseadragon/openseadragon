/* global QUnit, Util */

(function() {

    QUnit.module("utils");

    // ----------
    QUnit.test("addRemoveClass", function(assert) {
        var div = OpenSeadragon.makeNeutralElement('div');
        assert.strictEqual(div.className, '',
            "makeNeutralElement set no classes");

        OpenSeadragon.addClass(div, 'foo');
        assert.strictEqual(div.className, 'foo',
            "Added first class");
        OpenSeadragon.addClass(div, 'bar');
        assert.strictEqual(div.className, 'foo bar',
            "Added second class");
        OpenSeadragon.addClass(div, 'baz');
        assert.strictEqual(div.className, 'foo bar baz',
            "Added third class");
        OpenSeadragon.addClass(div, 'plugh');
        assert.strictEqual(div.className, 'foo bar baz plugh',
            "Added fourth class");

        OpenSeadragon.addClass(div, 'foo');
        assert.strictEqual(div.className, 'foo bar baz plugh',
            "Re-added first class");
        OpenSeadragon.addClass(div, 'bar');
        assert.strictEqual(div.className, 'foo bar baz plugh',
            "Re-added middle class");
        OpenSeadragon.addClass(div, 'plugh');
        assert.strictEqual(div.className, 'foo bar baz plugh',
            "Re-added last class");

        OpenSeadragon.removeClass(div, 'xyzzy');
        assert.strictEqual(div.className, 'foo bar baz plugh',
            "Removed nonexistent class");
        OpenSeadragon.removeClass(div, 'ba');
        assert.strictEqual(div.className, 'foo bar baz plugh',
            "Removed nonexistent class with existent substring");

        OpenSeadragon.removeClass(div, 'bar');
        assert.strictEqual(div.className, 'foo baz plugh',
            "Removed middle class");
        OpenSeadragon.removeClass(div, 'plugh');
        assert.strictEqual(div.className, 'foo baz',
            "Removed last class");
        OpenSeadragon.removeClass(div, 'foo');
        assert.strictEqual(div.className, 'baz',
            "Removed first class");
        OpenSeadragon.removeClass(div, 'baz');
        assert.strictEqual(div.className, '',
            "Removed only class");
    });

    // ----------
    QUnit.test("makeAjaxRequest", function(assert) {
        var timeWatcher = Util.timeWatcher(assert);

        OpenSeadragon.makeAjaxRequest('data/testpattern.dzi',
            function(xhr) {
                assert.equal(xhr.status, 200, 'Success callback called for HTTP 200');
                assert.ok(/deepzoom/.test(xhr.responseText), 'Success function called');
                timeWatcher.done();
            },
            function(xhr) {
                assert.ok(false, 'Error callback should not be called');
                timeWatcher.done();
            }
        );
    });

    QUnit.test("makeAjaxRequest for invalid file", function(assert) {
        var timeWatcher = Util.timeWatcher(assert);

        OpenSeadragon.makeAjaxRequest('not-a-real-dzi-file',
            function(xhr) {
                assert.ok(false, 'Success function should not be called for errors');
                timeWatcher.done();
            },
            function(xhr) {
                assert.equal(xhr.status, 404, 'Error callback called for HTTP 404');
                assert.ok(true, 'Error function should be called for errors');
                timeWatcher.done();
            }
        );
    });

    QUnit.test("getUrlProtocol", function(assert) {

        assert.equal(OpenSeadragon.getUrlProtocol("test"), window.location.protocol,
            "'test' url protocol should be window.location.protocol");

        assert.equal(OpenSeadragon.getUrlProtocol("/test"), window.location.protocol,
            "'/test' url protocol should be window.location.protocol");

        assert.equal(OpenSeadragon.getUrlProtocol("//test"), window.location.protocol,
            "'//test' url protocol should be window.location.protocol");

        assert.equal(OpenSeadragon.getUrlProtocol("http://test"), "http:",
            "'http://test' url protocol should be http:");

        assert.equal(OpenSeadragon.getUrlProtocol("https://test"), "https:",
            "'https://test' url protocol should be https:");

        assert.equal(OpenSeadragon.getUrlProtocol("file://test"), "file:",
            "'file://test' url protocol should be file:");

        assert.equal(OpenSeadragon.getUrlProtocol("FTP://test"), "ftp:",
            "'FTP://test' url protocol should be ftp:");
    });

    // ----------
    QUnit.test("requestAnimationFrame", function(assert) {
        var timeWatcher = Util.timeWatcher(assert);

        OpenSeadragon.requestAnimationFrame(function() {
            assert.ok(true, 'frame fired');
            timeWatcher.done();
        });
    });

    // ----------
    QUnit.test("cancelAnimationFrame", function(assert) {
        var done = assert.async();
        var frameFired = false;

        setTimeout(function() {
            assert.strictEqual(frameFired, false, 'the frame never fired');
            done();
        }, 150);

        var frameId = OpenSeadragon.requestAnimationFrame(function() {
            frameFired = true;
        });

        OpenSeadragon.cancelAnimationFrame(frameId);
    });

})();
