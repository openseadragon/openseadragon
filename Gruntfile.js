module.exports = function(grunt) {

    grunt.loadNpmTasks("grunt-contrib-compress");
    grunt.loadNpmTasks("grunt-contrib-concat");
    grunt.loadNpmTasks("grunt-contrib-jshint");
    grunt.loadNpmTasks("grunt-contrib-uglify");
    grunt.loadNpmTasks("grunt-contrib-qunit");
    grunt.loadNpmTasks("grunt-contrib-connect");
    grunt.loadNpmTasks("grunt-contrib-watch");

    var distribution = "build/openseadragon.js",
        minified = "build/openseadragon.min.js",
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
        pkg: grunt.file.readJSON("package.json"),
        concat: {
            options: {
                banner: "/**\n * @version  <%= pkg.name %> <%= pkg.version %>\n */\n\n"
            },
            dist: {
                src:  [ "<banner>" ].concat(sources),
                dest: distribution
            }
        },
        uglify: {
            openseadragon: {
                src: [ distribution ],
                dest: minified
            }
        },
        compress: {
            zip: {
                files: {
                   "openseadragon.zip": "build/**"
                }
            },
            tar: {
                files: {
                   "openseadragon.tar": "build/**"
                }
            }
        },
        qunit: {
            all: {
                options: {
                    urls: [ "http://localhost:8000/test/test.html" ]
                }
            }
        },
        connect: {
            server: {
                options: {
                    port: 8000,
                    base: "."
                }
            }
        },
        watch: {
            files: [ "grunt.js", "src/*.js" ],
            tasks: "default"
        },
        jshint: {
            options: {
                browser: true,
                eqeqeq: false,
                loopfunc: false,
                globals: {
                    OpenSeadragon: true
                }
            },
            beforeconcat: sources,
            afterconcat: [ distribution ]
        }
    });

    // Copy task.
    grunt.registerTask("copy", function() {
        grunt.file.recurse("images", function(abspath, rootdir, subdir, filename) {
            grunt.file.copy(abspath, "build/images/" + (subdir || "") + filename);            
        });
    });

    // Default task.
    grunt.registerTask("default", ["jshint:beforeconcat", "concat", "jshint:afterconcat", "uglify", "copy"]);

    // Test task.
    grunt.registerTask("test", ["default", "connect", "qunit"]);

    // Package task.
    grunt.registerTask("package", ["default", "compress"]);

};
