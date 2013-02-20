module.exports = function(grunt) {

    grunt.loadNpmTasks("grunt-contrib-compress");

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
        pkg: "<json:package.json>",
        meta: {
            banner: "/**\n * @version  <%= pkg.name %> <%= pkg.version %>\n */"
        },
        concat: {
            dist: {
                src:  [ "<banner>" ].concat(sources),
                dest: distribution
            }
        },
        min: {
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
            all: [ "http://localhost:8000/test/test.html" ]
        },
        server: {
            port: 8000,
            base: "../openseadragon.github.com"//"."
        },
        watch: {
            files: [ "grunt.js", "src/*.js" ],
            tasks: "default"
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

    // Copy task.
    grunt.registerTask("copy", function() {
        grunt.file.recurse("images", function(abspath, rootdir, subdir, filename) {
            grunt.file.copy(abspath, "build/images/" + (subdir || "") + filename);            
        });
    });

    // Default task.
    grunt.registerTask("default", "lint:beforeconcat concat lint:afterconcat min copy");

    // Test task.
    grunt.registerTask("test", "default server qunit");

    // Package task.
    grunt.registerTask("package", "default compress");

};
