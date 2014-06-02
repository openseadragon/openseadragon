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
    grunt.loadNpmTasks('grunt-text-replace');

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
            "src/eventsource.js",
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
            "src/iiif1_1tilesource.js",
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
            "src/imageLoader.js",
            "src/tile.js",
            "src/overlay.js",
            "src/drawer.js",
            "src/viewport.js"
        ];

    // ----------
    grunt.event.once('git-describe', function (rev) {
        grunt.config.set('gitInfo', rev);
    });

    // ----------
    // Project configuration.
    grunt.initConfig({
        pkg: packageJson,
        osdVersion: {
            versionStr: packageJson.version,
            major:      parseInt(packageJson.version.split('.')[0], 10),
            minor:      parseInt(packageJson.version.split('.')[1], 10),
            revision:   parseInt(packageJson.version.split('.')[2], 10)
        },
        clean: {
            build: ["build"],
            package: [packageDir],
            release: {
                src: [releaseRoot],
                options: {
                    force: true
                }
            }
        },
        concat: {
            options: {
                banner: "//! <%= pkg.name %> <%= pkg.version %>\n" +
                    "//! Built on <%= grunt.template.today('yyyy-mm-dd') %>\n" +
                    "//! Git commit: <%= gitInfo %>\n" +
                    "//! http://openseadragon.github.io\n" +
                    "//! License: http://openseadragon.github.io/license/\n\n",
                process: true
            },
            dist: {
                src:  [ "<banner>" ].concat(sources),
                dest: distribution
            }
        },
        replace: {
            cleanPaths: {
                src: ['build/openseadragon/*.map'],
                overwrite: true,
                replacements: [
                    {
                        from: /build\/openseadragon\//g,
                        to: ''
                    }
                ]
            }
        },
        uglify: {
            options: {
                preserveComments: "some",
                sourceMap: true,
                sourceMapName: 'build/openseadragon/openseadragon.min.js.map'
            },
            openseadragon: {
                src: [ distribution ],
                dest: minified
            }
        },
        compress: {
            zip: {
                options: {
                    archive: "build/releases/" + packageDirName + ".zip",
                    level: 9
                },
                files: [
                   { expand: true, cwd: "build/", src: [ packageDirName + "/**" ] }
                ]
            },
            tar: {
                options: {
                    archive: "build/releases/" + packageDirName + ".tar.gz",
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
                    timeout: 10000,
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
                jshintrc: '.jshintrc'
            },
            beforeconcat: sources,
            afterconcat: [ distribution ]
        },
        "git-describe": {
            build: {}
        }
    });

    // ----------
    // Copy:build task.
    // Copies the image files into the appropriate location in the build folder.
    grunt.registerTask("copy:build", function() {
        grunt.file.recurse("images", function(abspath, rootdir, subdir, filename) {
            grunt.file.copy(abspath, "build/openseadragon/images/" + (subdir || "") + filename);
        });
    });

    // ----------
    // Copy:package task.
    // Creates a directory tree to be compressed into a package.
    grunt.registerTask("copy:package", function() {
        grunt.file.recurse("build/openseadragon", function(abspath, rootdir, subdir, filename) {
            var dest = packageDir +
                (subdir ? subdir + "/" : '/') +
                filename;
            grunt.file.copy(abspath, dest);
        });
        grunt.file.copy("changelog.txt", packageDir + "changelog.txt");
        grunt.file.copy("LICENSE.txt", packageDir + "LICENSE.txt");
    });

    // ----------
    // Copy:release task.
    // Copies the contents of the build folder into the release folder.
    grunt.registerTask("copy:release", function() {
        grunt.file.recurse("build", function(abspath, rootdir, subdir, filename) {
            if (subdir === 'releases') {
                return;
            }

            var dest = releaseRoot +
                (subdir ? subdir + "/" : '/') +
                filename;

            grunt.file.copy(abspath, dest);
        });
    });

    // ----------
    grunt.registerTask("bower", function() {
        var path = "../site-build/bower.json";
        var data = grunt.file.readJSON(path);
        data.version = packageJson.version;
        grunt.file.write(path, JSON.stringify(data, null, 2) + "\n");
    });

    // ----------
    // Build task.
    // Cleans out the build folder and builds the code and images into it, checking lint.
    grunt.registerTask("build", [
        "clean:build", "jshint:beforeconcat", "git-describe", "concat", "jshint:afterconcat",
        "uglify", "replace:cleanPaths", "copy:build"
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
    grunt.registerTask("publish", ["package", "clean:release", "copy:release", "bower"]);

    // ----------
    // Default task.
    // Does a normal build.
    grunt.registerTask("default", ["build"]);
};
