/* global module, asyncTest, $, ok, equal, strictEqual, notEqual, start, test, Util, testLog */

(function() {

    module("utils");

    // ----------
    test("addRemoveClass", function() {
        var div = OpenSeadragon.makeNeutralElement('div');
        strictEqual(div.className, '',
            "makeNeutralElement set no classes");

        OpenSeadragon.addClass(div, 'foo');
        strictEqual(div.className, 'foo',
            "Added first class");
        OpenSeadragon.addClass(div, 'bar');
        strictEqual(div.className, 'foo bar',
            "Added second class");
        OpenSeadragon.addClass(div, 'baz');
        strictEqual(div.className, 'foo bar baz',
            "Added third class");
        OpenSeadragon.addClass(div, 'plugh');
        strictEqual(div.className, 'foo bar baz plugh',
            "Added fourth class");

        OpenSeadragon.addClass(div, 'foo');
        strictEqual(div.className, 'foo bar baz plugh',
            "Re-added first class");
        OpenSeadragon.addClass(div, 'bar');
        strictEqual(div.className, 'foo bar baz plugh',
            "Re-added middle class");
        OpenSeadragon.addClass(div, 'plugh');
        strictEqual(div.className, 'foo bar baz plugh',
            "Re-added last class");

        OpenSeadragon.removeClass(div, 'xyzzy');
        strictEqual(div.className, 'foo bar baz plugh',
            "Removed nonexistent class");
        OpenSeadragon.removeClass(div, 'ba');
        strictEqual(div.className, 'foo bar baz plugh',
            "Removed nonexistent class with existent substring");

        OpenSeadragon.removeClass(div, 'bar');
        strictEqual(div.className, 'foo baz plugh',
            "Removed middle class");
        OpenSeadragon.removeClass(div, 'plugh');
        strictEqual(div.className, 'foo baz',
            "Removed last class");
        OpenSeadragon.removeClass(div, 'foo');
        strictEqual(div.className, 'baz',
            "Removed first class");
        OpenSeadragon.removeClass(div, 'baz');
        strictEqual(div.className, '',
            "Removed only class");
    });

    // ----------
    asyncTest("makeAjaxRequest", function() {
        var timeWatcher = Util.timeWatcher();

        OpenSeadragon.makeAjaxRequest('data/testpattern.dzi',
            function(xhr) {
                equal(xhr.status, 200, 'Success callback called for HTTP 200');
                ok(/deepzoom/.test(xhr.responseText), 'Success function called');
                timeWatcher.done();
            },
            function(xhr) {
                ok(false, 'Error callback should not be called');
                timeWatcher.done();
            }
        );
    });

    asyncTest("makeAjaxRequest for invalid file", function() {
        var timeWatcher = Util.timeWatcher();

        OpenSeadragon.makeAjaxRequest('not-a-real-dzi-file',
            function(xhr) {
                ok(false, 'Success function should not be called for errors');
                timeWatcher.done();
            },
            function(xhr) {
                equal(xhr.status, 404, 'Error callback called for HTTP 404');
                ok(true, 'Error function should be called for errors');
                timeWatcher.done();
            }
        );
    });

    test("getUrlProtocol", function() {

        equal(OpenSeadragon.getUrlProtocol("test"), window.location.protocol,
            "'test' url protocol should be window.location.protocol");

        equal(OpenSeadragon.getUrlProtocol("/test"), window.location.protocol,
            "'/test' url protocol should be window.location.protocol");

        equal(OpenSeadragon.getUrlProtocol("//test"), window.location.protocol,
            "'//test' url protocol should be window.location.protocol");

        equal(OpenSeadragon.getUrlProtocol("http://test"), "http:",
            "'http://test' url protocol should be http:");

        equal(OpenSeadragon.getUrlProtocol("https://test"), "https:",
            "'https://test' url protocol should be https:");

        equal(OpenSeadragon.getUrlProtocol("file://test"), "file:",
            "'file://test' url protocol should be file:");

        equal(OpenSeadragon.getUrlProtocol("FTP://test"), "ftp:",
            "'FTP://test' url protocol should be ftp:");
    });

    // ----------
    asyncTest("requestAnimationFrame", function() {
        var timeWatcher = Util.timeWatcher();

        OpenSeadragon.requestAnimationFrame(function() {
            ok(true, 'frame fired');
            timeWatcher.done();
        });
    });

    // ----------
    asyncTest("cancelAnimationFrame", function() {
        var frameFired = false;

        setTimeout(function() {
            strictEqual(frameFired, false, 'the frame never fired');
            start();
        }, 150);

        var frameId = OpenSeadragon.requestAnimationFrame(function() {
            frameFired = true;
        });

        OpenSeadragon.cancelAnimationFrame(frameId);
    });

})();
