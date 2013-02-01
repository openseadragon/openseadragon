/*global module:false*/
module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        lint: {
            files: ['grunt.js', 'src/*.js']
        },
        concat: {
            openseadragon: {
                src: [
                    'src/openseadragon.js',
                    'src/eventhandler.js',
                    'src/mousetracker.js',
                    'src/control.js',
                    'src/controldock.js',
                    'src/viewer.js',
                    'src/navigator.js',
                    'src/strings.js',
                    'src/point.js',
                    'src/tilesource.js',
                    'src/dzitilesource.js',
                    'src/legacytilesource.js',
                    'src/tilesourcecollection.js',
                    'src/button.js',
                    'src/buttongroup.js',
                    'src/rectangle.js',
                    'src/referencestrip.js',
                    'src/displayrectangle.js',
                    'src/spring.js',
                    'src/tile.js',
                    'src/overlay.js',
                    'src/drawer.js',
                    'src/viewport.js'
                ],
                dest: 'build/openseadragon.js'
            }
        },
        min: {
            openseadragon: {
                src: ['build/openseadragon.js'],
                dest: 'build/openseadragon.min.js'
            }
        },
        watch: {
            files: ['grunt.js', 'src/*.js'],
            tasks: 'concat'
        },
        jshint: {
            options: {
                onecase: false,
                immed: false,
                debug: false,
                evil: false,
                strict: false,
                multistr: false,
                wsh: false,
                couch: false,
                laxbreak: true,
                rhino: false,
                globalstrict: false,
                supernew: false,
                laxcomma: false,
                asi: false,
                es5: false,
                scripturl: false,
                withstmt: false,
                bitwise: true,
                eqeqeq: false,
                shadow: false,
                expr: false,
                noarg: true,
                newcap: true,
                forin: false,
                regexdash: false,
                node: false,
                dojo: false,
                eqnull: false,
                browser: true,
                mootools: false,
                iterator: false,
                undef: true,
                latedef: true,
                nonstandard: false,
                trailing: false,
                jquery: true,
                loopfunc: false,
                boss: false,
                nonew: true,
                funcscope: false,
                regexp: false,
                lastsemic: false,
                smarttabs: false,
                devel: false,
                esnext: false,
                sub: false,
                curly: false,
                prototypejs: false,
                proto: false,
                plusplus: false,
                noempty: false
            },
            globals: {
            }
        }
    });

    // Default task.
    grunt.registerTask('default', 'concat min');

};
