(function() {

    module("strings");
    test("getSubString", function() {
        equal(OpenSeadragon.getString("Errors.Dzi"),
            "Hmm, this doesn't appear to be a valid Deep Zoom Image.",
            "Read sub-string");
    });

    test("getInvalidString", function() {
        equal(OpenSeadragon.getString("Greeting"), "",
            "Handled unset string key");
        equal(OpenSeadragon.getString("Errors"), "",
            "Handled requesting parent key");
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
