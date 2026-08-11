/* eslint-disable no-redeclare */
/* global module */

module.exports = function(grunt) {
    /* eslint-disable no-undef */

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
    grunt.loadNpmTasks('grunt-shell');

    // ----------
    const packageJson = grunt.file.readJSON("package.json"),
        distribution = "build/openseadragon/openseadragon.js",
        minified = "build/openseadragon/openseadragon.min.js",
        packageDirName = "openseadragon-bin-" + packageJson.version,
        packageDir = "build/" + packageDirName + "/",
        releaseRoot = "../site-build/built-openseadragon/",
        sources = [
            "src/openseadragon.js",
            "src/matrix3.js",
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
            "src/iiptilesource.js",
            "src/iristilesource.js",
            "src/osmtilesource.js",
            "src/tmstilesource.js",
            "src/zoomifytilesource.js",
            "src/legacytilesource.js",
            "src/imagetilesource.js",
            "src/tilesourcecollection.js",
            "src/priorityqueue.js",
            "src/datatypeconverter.js",
            "src/button.js",
            "src/buttongroup.js",
            "src/rectangle.js",
            "src/referencestrip.js",
            "src/displayrectangle.js",
            "src/spring.js",
            "src/imageloader.js",
            "src/tile.js",
            "src/overlay.js",
            "src/drawerbase.js",
            "src/htmldrawer.js",
            "src/canvasdrawer.js",
            "src/webgldrawer.js",
            "src/viewport.js",
            "src/tiledimage.js",
            "src/tilecache.js",
            "src/world.js",
        ];

    const banner = "//! <%= pkg.name %> <%= pkg.version %>\n" +
                 "//! Built on <%= grunt.template.today('yyyy-mm-dd') %>\n" +
                 "//! Git commit: <%= gitInfo %>\n" +
                 "//! http://openseadragon.github.io\n" +
                 "//! License: http://openseadragon.github.io/license/\n\n";

    // ----------
    grunt.event.once('git-describe', function (rev) {
        grunt.config.set('gitInfo', rev);
    });

    let moduleFilter =  '';
    if (grunt.option('module')) {
        moduleFilter = '?module=' + grunt.option('module')
    }

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
            coverage: ["instrumented", ".nyc_output", "coverage"],
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
                    urls: [ "http://localhost:8000/test/test.html" + moduleFilter ],
                    timeout: 10000,
                    puppeteer: {
                        headless: 'new'
                    }
                },
            },
            // NOTE: qunit:coverage is kept for manual debugging in a browser.
            // The actual coverage task uses shell:coverage_run (custom
            // Puppeteer script) because grunt-contrib-qunit does not expose
            // window.__coverage__ after tests complete.
            coverage: {
                options: {
                    urls: [ "http://localhost:8000/test/coverage.html" + moduleFilter ],
                    timeout: 10000,
                    puppeteer: {
                        headless: 'new'
                    }
                }
            },
            all: {
                options: {
                    timeout: 10000
                }
            }
        },
        connect: {
            server: {
                options: {
                    port: 8000,
                    base: {
                        path: ".",
                        options: {
                            stylesheet: 'style.css'
                        }
                    }
                }
            }
        },
        watch: {
            files: [ "Gruntfile.js", "src/*.js", "images/*" ],
            tasks: "watchTask"
        },
        eslint: {
            options: {
                overrideConfigFile: '.eslintrc.json'
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
        shell: {
            dts_check: {
                command: "npx tsc --noEmit -p tsconfig.dts.json"
            },
            dts_smoke: {
                command: "npx tsd"
            },
            // Step 1: Instrument source files with nyc
            instrument: {
                command: "npx nyc instrument src instrumented/src"
            },
            // Step 2: Run tests with instrumented sources via custom
            // Puppeteer script that captures window.__coverage__
            coverage_run: {
                command: 'node test/coverage-runner.js',
                options: {
                    env: (function() {
                        var env = Object.assign({}, process.env);
                        if (grunt.option('module')) {
                            env.QUNIT_MODULE = grunt.option('module');
                        }
                        return env;
                    })()
                }
            },
            // Step 3: Generate coverage reports from .nyc_output/
            nyc_report: {
                command: "npx nyc report"
            }
        },
    });

    // ----------
    // Copy:build task.
    grunt.registerTask("copy:build", function() {
        grunt.file.recurse("images", function(abspath, rootdir, subdir, filename) {
            grunt.file.copy(abspath, "build/openseadragon/images/" + (subdir || "") + filename);
        });
    });

    // ----------
    // Copy:package task.
    grunt.registerTask("copy:package", function() {
        grunt.file.recurse("build/openseadragon", function(abspath, rootdir, subdir, filename) {
            const dest = packageDir +
                (subdir ? subdir + "/" : '/') +
                filename;
            grunt.file.copy(abspath, dest);
        });
        grunt.file.copy("changelog.txt", packageDir + "changelog.txt");
        grunt.file.copy("LICENSE.txt", packageDir + "LICENSE.txt");
    });

    // ----------
    // Copy:release task.
    grunt.registerTask("copy:release", function() {
        grunt.file.recurse("build", function(abspath, rootdir, subdir, filename) {
            if (subdir === 'releases') {
                return;
            }

            const dest = releaseRoot +
                (subdir ? subdir + "/" : '/') +
                filename;

            grunt.file.copy(abspath, dest);
        });
    });

    // ----------
    // Bower task.
    grunt.registerTask("bower", function() {
        const path = "../site-build/bower.json";
        const data = grunt.file.readJSON(path);
        data.version = packageJson.version;
        grunt.file.write(path, JSON.stringify(data, null, 2) + "\n");
    });

    // ----------
    // Watch task.
    grunt.registerTask("watchTask", function() {
        if (grunt.option('min')) {
            grunt.task.run("minbuild");
        } else {
            grunt.task.run("build");
        }
    });

    // ----------
    // Build task.
    grunt.registerTask("build", [
        "clean:build", "git-describe", "eslint", "concat", "uglify",
        "replace:cleanPaths", "copy:build"
    ]);

    // ----------
    // Minimal build task.
    grunt.registerTask("minbuild", [
        "git-describe", "concat", "copy:build"
    ]);

    // ----------
    // Test task.
    grunt.registerTask("test", ["build", "connect", "qunit:normal", "dts"]);

    // ----------
    // Coverage task.
    // Generates code coverage report using nyc.
    //
    // Flow:
    //   1. clean:coverage      — remove old instrumented/, .nyc_output/, coverage/
    //   2. shell:instrument    — nyc instrument src -> instrumented/src
    //   3. build               — lint + build (ensures code quality)
    //   4. connect             — start local web server
    //   5. shell:coverage_run  — run Puppeteer, execute tests, capture __coverage__
    //   6. shell:nyc_report    — generate HTML/text/lcov reports from .nyc_output/
    //
    // Usage:
    //   grunt coverage              — run all tests with coverage
    //   grunt coverage --module=X   — run specific module with coverage
    grunt.registerTask("coverage", [
        "clean:coverage",
        "shell:instrument",
        "build",
        "connect",
        "shell:coverage_run",
        "shell:nyc_report"
    ]);

    // ----------
    // Package task.
    grunt.registerTask("package", ["build", "copy:package", "compress", "clean:package"]);

    // ----------
    // Publish task.
    grunt.registerTask("publish", ["package", "clean:release", "copy:release", "bower"]);

    // ----------
    // Dev task.
    grunt.registerTask("dev", ["build", "connect", "watch"]);

    // ----------
    // Default task.
    grunt.registerTask("default", ["build"]);

    // ----------
    // DTS tasks
    grunt.registerTask("dts:check", ["shell:dts_check"]);
    grunt.registerTask("dts:smoke", ["shell:dts_smoke"]);
    grunt.registerTask("dts", ["dts:check", "dts:smoke"]);
};