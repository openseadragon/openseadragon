/* global QUnit, testLog */

(function() {

    QUnit.module("strings", {
        beforeEach: function () {
            testLog.reset();
        }
    });

    QUnit.test("getSubString", function(assert) {
        assert.equal(OpenSeadragon.getString("Errors.Dzi"),
            "Hmm, this doesn't appear to be a valid Deep Zoom Image.",
            "Read sub-string");
    });

    QUnit.test("getStringWithPlaceholders", function(assert) {
        assert.equal(OpenSeadragon.getString("Errors.OpenFailed", "foo", "bar"),
              "Unable to open foo: bar",
              "String placeholder replacement");
    });

    QUnit.test("getInvalidString", function(assert) {
        assert.equal(OpenSeadragon.getString("Greeting"), "", "Handled unset string key");
        assert.ok(testLog.error.contains('["Untranslated source string:","Greeting"]'),
                                  'Invalid string keys are logged');

        assert.equal(OpenSeadragon.getString("Errors"), "", "Handled requesting parent key");
        assert.ok(testLog.error.contains('["Untranslated source string:","Errors"]'),
                                  'Invalid string parent keys are logged');
    });

    QUnit.test("setString", function(assert) {
        OpenSeadragon.setString("Greeting", "Hello world");
        assert.equal(OpenSeadragon.getString("Greeting"), "Hello world",
            "Set a string");
    });

    QUnit.test("setSubString", function(assert) {
       OpenSeadragon.setString("CustomGreeting.Hello", "Hello world");
       assert.equal(OpenSeadragon.getString("CustomGreeting.Hello"), "Hello world",
           "Set a sub-string");
    });

})();
