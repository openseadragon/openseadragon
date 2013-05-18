(function() {
    module("utils");

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
})();
