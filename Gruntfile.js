'use strict';

module.exports = function (grunt) {
  // Load grunt tasks automatically
  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
    connect: {
      fakeapi: {
        options: {
          middleware: require('./test/fakeapi'),
          port: 8085
        },
      },
    },
    browserify: {
      dist: {
        src: ['./lib/index.js'],
        dest: 'dist/stormpath.js',
        options: {
          bundleOptions: {
            standalone: 'Stormpath'
          }
        }
      }
    },
    uglify: {
      dist: {
        files: {
          'dist/stormpath.min.js': ['dist/stormpath.js']
        }
      }
    },
    clean: ['./.tmp'],
    instrument: {
      files: 'lib/**/*.js',
      options: {
        lazy: true,
        basePath: '.tmp/instrumented/'
      }
    },
    watch: {
      src:{
        files: ['lib/**/*.js'],
        tasks: ['clean','instrument','karma:liveunit:run','build']
      },
      unitTest:{
        files: ['test/**/*.js'],
        tasks: ['karma:liveunit:run']
      }
    },
    // Test settings
    karma: {
      unit: {
        configFile: 'karma.conf.js',
        singleRun: true
      },
      liveunit: { // starts a karma server in the background
        configFile: 'karma.conf.js',
        background: true
      }
    },
  });

  grunt.registerTask('default', ['browserify']);

  grunt.registerTask('build', ['browserify:dist','uglify:dist']);

  grunt.registerTask('dev', ['karma:liveunit','connect:fakeapi','watch']);

};