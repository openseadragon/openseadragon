module.exports = function(grunt) {
    
    var distribution = "openseadragon.js",
        sources = [
            "src/openseadragon.js",
            "src/eventhandler.js",
            "src/mousetracker.js",
            "src/control.js",
            "src/controldock.js",
            "src/viewer.js",
            "src/navigator.js",
            "src/strings.js",
            "src/point.js",
            //"src/profiler.js",
            "src/tilesource.js",
            "src/dzitilesource.js",
            "src/iiiftilesource.js",
            "src/osmtilesource.js",
            "src/tmstilesource.js",
            "src/legacytilesource.js",
            "src/tilesourcecollection.js",
            "src/button.js",
            "src/buttongroup.js",
            "src/rectangle.js",
            "src/referencestrip.js",
            "src/displayrectangle.js",
            "src/spring.js",
            "src/tile.js",
            "src/overlay.js",
            "src/drawer.js",
            "src/viewport.js"
        ];

    // Project configuration.
    grunt.initConfig({
        concat: {
            dist: {
                src:  sources,
                dest: distribution
            }
        },
        lint: {
            beforeconcat: sources,
            afterconcat: [ distribution ]
        },
        jshint: {
            options: {
                browser:    true,
                eqeqeq:     false,
                loopfunc:   false
                /*curly: true,
                eqeqeq: true,
                immed: true,
                latedef: true,
                newcap: true,
                noarg: true,
                sub: true,
                undef: true,
                eqnull: true,*/
            },
            globals: {
                OpenSeadragon: true
            }
        }
    });


    // Default task.
    grunt.registerTask('default', 'lint:beforeconcat concat lint:afterconcat');

};