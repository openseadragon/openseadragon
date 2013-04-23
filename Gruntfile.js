module.exports = function(grunt) {

    // ----------
    grunt.loadNpmTasks("grunt-contrib-compress");
    grunt.loadNpmTasks("grunt-contrib-concat");
    grunt.loadNpmTasks("grunt-contrib-jshint");
    grunt.loadNpmTasks("grunt-contrib-uglify");
    grunt.loadNpmTasks("grunt-contrib-qunit");
    grunt.loadNpmTasks("grunt-contrib-connect");
    grunt.loadNpmTasks("grunt-contrib-watch");
    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks("grunt-git-describe");

    // ----------
    var packageJson = grunt.file.readJSON("package.json"),
        distribution = "build/openseadragon/openseadragon.js",
        minified = "build/openseadragon/openseadragon.min.js",
        packageDirName = "openseadragon-bin-" + packageJson.version,
        packageDir = "build/" + packageDirName + "/",
        releaseRoot = "../site-build/built-openseadragon/",
        sources = [
            "src/openseadragon.js",
            "src/fullscreen.js",
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

    // ----------
    // Project configuration.
    grunt.initConfig({
        pkg: packageJson,
        clean: {
            build: ["build"],
            "package": [packageDir],
            release: {
                src: [releaseRoot],
                options: {
                    force: true
                }
            }
        },
        concat: {
            options: {
                banner: "//! <%= pkg.name %> <%= pkg.version %>\n"
                    + "//! Built on <%= grunt.template.today('yyyy-mm-dd') %>\n"
                    + "//! Git commit: <%= gitInfo %>\n"
                    + "//! http://openseadragon.github.io\n\n",
                process: true
            },
            dist: {
                src:  [ "<banner>" ].concat(sources),
                dest: distribution
            }
        },
        uglify: {
            options: {
                preserveComments: "some"
            },
            openseadragon: {
                src: [ distribution ],
                dest: minified
            }
        },
        compress: {
            zip: {
                options: {
                    archive: "build/" + packageDirName + ".zip",
                    level: 9
                },
                files: [
                   { expand: true, cwd: "build/", src: [ packageDirName + "/**" ] }
                ]
            },
            tar: {
                options: {
                    archive: "build/" + packageDirName + ".tar.gz",
                    level: 9
                },
                files: [
                   { expand: true, cwd: "build/", src: [ packageDirName + "/**" ] }
                ]
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
            files: [ "Gruntfile.js", "src/*.js", "images/*" ],
            tasks: "build"
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
        },
        "git-describe": {
            build: {
                options: {
                    prop: "gitInfo"
                }
            }
        }
    });

    // ----------
    // Copy:build task.
    // Copies the image files into the appropriate location in the build folder.
    grunt.registerTask("copy:build", function() {
        grunt.file.recurse("images", function(abspath, rootdir, subdir, filename) {
            grunt.file.copy(abspath, "build/openseadragon/images/" + (subdir || "") + filename);            
        });

        grunt.file.copy("changelog.txt", "build/changelog.txt");
    });

    // ----------
    // Copy:package task.
    // Creates a directory tree to be compressed into a package.
    grunt.registerTask("copy:package", function() {
        grunt.file.recurse("build/openseadragon", function(abspath, rootdir, subdir, filename) {
            var dest = packageDir
                + (subdir ? subdir + "/" : '/')
                + filename;
            grunt.file.copy(abspath, dest);
        });
    });

    // ----------
    // Copy:release task.
    // Copies the contents of the build folder into the release folder.
    grunt.registerTask("copy:release", function() {
        grunt.file.recurse("build", function(abspath, rootdir, subdir, filename) {
            var dest = releaseRoot
                + (subdir ? subdir + "/" : '/')
                + filename;

            grunt.file.copy(abspath, dest);
        });
    });

    // ----------
    // Build task.
    // Cleans out the build folder and builds the code and images into it, checking lint.
    grunt.registerTask("build", [
        "clean:build", "jshint:beforeconcat", "git-describe", "concat", "jshint:afterconcat", "uglify", "copy:build"
    ]);

    // ----------
    // Test task.
    // Builds and runs unit tests.
    grunt.registerTask("test", ["build", "connect", "qunit"]);

    // ----------
    // Package task.
    // Builds and creates the .zip and .tar.gz files.
    grunt.registerTask("package", ["build", "copy:package", "compress", "clean:package"]);

    // ----------
    // Publish task.
    // Cleans the built files out of the release folder and copies newly built ones over.
    grunt.registerTask("publish", ["package", "clean:release", "copy:release"]);

    // ----------
    // Default task.
    // Does a normal build.
    grunt.registerTask("default", ["build"]);
};
