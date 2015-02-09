/* global module, asyncTest, $, ok, equal, notEqual, start, test, Util, testLog */

(function() {

    module("strings", {
        setup: function () {
            testLog.reset();
        }
    });

    test("getSubString", function() {
        equal(OpenSeadragon.getString("Errors.Dzi"),
            "Hmm, this doesn't appear to be a valid Deep Zoom Image.",
            "Read sub-string");
    });

    test("getStringWithPlaceholders", function() {
        equal(OpenSeadragon.getString("Errors.OpenFailed", "foo", "bar"),
              "Unable to open foo: bar",
              "String placeholder replacement");
    });

    test("getInvalidString", function() {
        equal(OpenSeadragon.getString("Greeting"), "", "Handled unset string key");
        ok(testLog.debug.contains('["Untranslated source string:","Greeting"]'),
                                  'Invalid string keys are logged');

        equal(OpenSeadragon.getString("Errors"), "", "Handled requesting parent key");
        ok(testLog.debug.contains('["Untranslated source string:","Errors"]'),
                                  'Invalid string parent keys are logged');
    });

    test("setString", function() {
        OpenSeadragon.setString("Greeting", "Hello world");
        equal(OpenSeadragon.getString("Greeting"), "Hello world",
            "Set a string");
    });

    test("setSubString", function() {
       OpenSeadragon.setString("CustomGreeting.Hello", "Hello world");
       equal(OpenSeadragon.getString("CustomGreeting.Hello"), "Hello world",
           "Set a sub-string");
    });

})();
