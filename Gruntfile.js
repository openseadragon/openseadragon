/* eslint-disable no-redeclare */
/* global module */

module.exports = function(grunt) {
    /* eslint-disable no-undef */
    var dateFormat = require('dateformat');

    // ----------
    grunt.loadNpmTasks("grunt-contrib-compress");
    grunt.loadNpmTasks("grunt-contrib-concat");
    grunt.loadNpmTasks("grunt-contrib-uglify");
    grunt.loadNpmTasks("grunt-contrib-qunit");
    grunt.loadNpmTasks("grunt-contrib-connect");
    grunt.loadNpmTasks("grunt-contrib-watch");
    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks("grunt-eslint");
    grunt.loadNpmTasks("grunt-git-describe");
    grunt.loadNpmTasks('grunt-text-replace');
    grunt.loadNpmTasks('grunt-istanbul');
    grunt.loadNpmTasks('grunt-saucelabs');

    // ----------
    var packageJson = grunt.file.readJSON("package.json"),
        distribution = "build/openseadragon/openseadragon.js",
        minified = "build/openseadragon/openseadragon.min.js",
        packageDirName = "openseadragon-bin-" + packageJson.version,
        packageDir = "build/" + packageDirName + "/",
        releaseRoot = "../site-build/built-openseadragon/",
        coverageDir = 'coverage/' + dateFormat(new Date(), 'yyyymmdd-HHMMss'),
        sources = [
            "src/openseadragon.js",
            "src/fullscreen.js",
            "src/eventsource.js",
            "src/mousetracker.js",
            "src/control.js",
            "src/controldock.js",
            "src/placement.js",
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
            "src/zoomifytilesource.js",
            "src/legacytilesource.js",
            "src/imagetilesource.js",
            "src/tilesourcecollection.js",
            "src/button.js",
            "src/buttongroup.js",
            "src/rectangle.js",
            "src/referencestrip.js",
            "src/displayrectangle.js",
            "src/spring.js",
            "src/imageloader.js",
            "src/tile.js",
            "src/overlay.js",
            "src/drawer.js",
            "src/viewport.js",
            "src/tiledimage.js",
            "src/tilecache.js",
            "src/world.js"
        ];

    var banner = "//! <%= pkg.name %> <%= pkg.version %>\n" +
                 "//! Built on <%= grunt.template.today('yyyy-mm-dd') %>\n" +
                 "//! Git commit: <%= gitInfo %>\n" +
                 "//! http://openseadragon.github.io\n" +
                 "//! License: http://openseadragon.github.io/license/\n\n";

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
            coverage: ["instrumented"],
            release: {
                src: [releaseRoot],
                options: {
                    force: true
                }
            }
        },
        concat: {
            options: {
                banner: banner,
                process: true,
                sourceMap: true
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
                preserveComments: false,
                banner: banner,
                compress: {
                    sequences: false,
                    /* eslint-disable camelcase */
                    join_vars: false
                },
                sourceMap: true,
                sourceMapName: 'build/openseadragon/openseadragon.min.js.map',
                sourceMapIn: 'build/openseadragon/openseadragon.js.map'
            },
            openseadragon: {
                src: distribution,
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
            normal: {
                options: {
                    urls: [ "http://localhost:8000/test/test.html" ],
                    timeout: 10000
                }
            },
            coverage: {
                options: {
                    urls: [ "http://localhost:8000/test/coverage.html" ],
                    coverage: {
                        src: ['src/*.js'],
                        htmlReport: coverageDir + '/html/',
                        instrumentedFiles: 'instrumented/src/',
                        baseUrl: '.',
                        disposeCollector: true
                    },
                    timeout: 10000
                }
            },
            all: {
                options: {
                    timeout: 10000
                }
            }
        },
        'saucelabs-qunit': {
            all: {
                options: {
                    urls: ['http://localhost:8000/test/test.html'],
                    detailedError: true,
                    testname: "OpenSeadragon",
                    concurrency: 2,
                    tunnelled: true,
                    browsers: [
                        {browserName: 'firefox', platform: 'WIN10'},
                        {browserName: 'firefox', platform: 'XP'},
                        {browserName: 'firefox', platform: 'OS X 10.15'},
                        {browserName: 'chrome', platform: 'OS X 10.15'},
                        {browserName: 'chrome', platform: 'WIN10'},
                        {browserName: 'chrome', platform: 'WIN7'},
                        {browserName: 'edge', platform: 'WIN10'},
                        {browserName: 'edge', platform: 'WIN8.1'},
                        {browserName: 'edge', platform: 'WIN8'},
                        {browserName: 'edge', platform: 'WIN7'},
                        {browserName: 'internet explorer', platform: 'WIN8.1', version: '11'},
                        {browserName: 'internet explorer', platform: 'WIN10', version: '11'},

                        {browserName: 'ipad', platform: 'OS X 10.15', version: '6'},
                        {browserName: 'iphone', platform: 'OS X 10.15', version: '6'},
                        {browserName: 'opera'},
                        {browserName: 'safari', platform: 'OS X 10.15'},
                        {browserName: 'android', platform: 'Linux', version: '11.0', 'device-type': 'tablet', 'device-orientation': 'portrait'},
                    ],
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
            tasks: "watchTask"
        },
        eslint: {
            options: {
                configFile: '.eslintrc.json'
            },
            target: sources
        },
        "git-describe": {
            options: {
                failOnError: false
            },
            build: {}
        },
        gitInfo: "unknown",
        instrument: {
          files: sources,
          options: {
              lazy: false,
              basePath: 'instrumented/'
          }
        },
        reloadTasks: {
            rootPath: "instrumented/src/"
        },
        storeCoverage: {
            options: {
                dir: coverageDir,
                'include-all-sources': true
              }
         },
        makeReport: {
          src: "coverage/**/*.json",
          options: {
              type: [ "lcov", "html" ],
              dir: coverageDir,
              print: "detail"
          }
      }
    });

    grunt.event.on("qunit.coverage", function(coverage) {
        var reportPath = coverageDir + "/coverage.json";

        // Create the coverage file
        grunt.file.write(reportPath, JSON.stringify(coverage));
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
    // Bower task.
    // Generates the Bower file for site-build.
    grunt.registerTask("bower", function() {
        var path = "../site-build/bower.json";
        var data = grunt.file.readJSON(path);
        data.version = packageJson.version;
        grunt.file.write(path, JSON.stringify(data, null, 2) + "\n");
    });

    // ----------
    // Watch task.
    // Called from the watch feature; does a full build or a minbuild, depending on
    // whether you used --min on the command line.
    grunt.registerTask("watchTask", function() {
        if (grunt.option('min')) {
            grunt.task.run("minbuild");
        } else {
            grunt.task.run("build");
        }
    });

    // ----------
    // Build task.
    // Cleans out the build folder and builds the code and images into it, checking lint.
    grunt.registerTask("build", [
        "clean:build", "git-describe", "eslint", "concat", "uglify",
        "replace:cleanPaths", "copy:build"
    ]);

    // ----------
    // Minimal build task.
    // For use during development as desired. Creates only the unminified version.
    grunt.registerTask("minbuild", [
        "git-describe", "concat", "copy:build"
    ]);

    // ----------
    // Test task.
    // Builds and runs unit tests.
    grunt.registerTask("test", ["build", "connect", "qunit:normal"]);

    // ----------
    // Coverage task.
    // Outputs unit test code coverage report.
    grunt.registerTask("coverage", ["clean:coverage", "instrument", "connect", "qunit:coverage", "makeReport"]);

    // Run the test suite on different real browsers using Sauce Labs: https://saucelabs.com/opensauce
    grunt.registerTask('test-saucelabs', ['test', 'saucelabs-qunit']);

    // ----------
    // Package task.
    // Builds and creates the .zip and .tar.gz files.
    grunt.registerTask("package", ["build", "copy:package", "compress", "clean:package"]);

    // ----------
    // Publish task.
    // Cleans the built files out of the release folder and copies newly built ones over.
    grunt.registerTask("publish", ["package", "clean:release", "copy:release", "bower"]);

    // ----------
    // Dev task.
    // Builds, fires up a server and watches for changes.
    grunt.registerTask("dev", ["build", "connect", "watch"]);

    // ----------
    // Default task.
    // Does a normal build.
    grunt.registerTask("default", ["build"]);
};
