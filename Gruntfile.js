'use strict';

module.exports = function (grunt) {
  // Load grunt tasks automatically
  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    bump: {
      options:{
        files: ['package.json','bower.json'],
        updateConfigs: ['pkg'],
        commit: true,
        commitMessage: 'Release v%VERSION%',
        commitFiles: ['package.json','bower.json','dist/stormpath.js','dist/stormpath.min.js'],
        createTag: true,
        tagName: '%VERSION%',
        tagMessage: 'Version %VERSION%',
        push: true,
        pushTo: 'origin master'
      }
    },
    concat: {
      options: {
        banner: '/*\n' +
          ' Stormpath.js v<%= pkg.version %>\n' +
          ' (c) 2014 Stormpath, Inc. http://stormpath.com\n'+
          ' License: Apache 2.0\n' +
          '*/\n'
      },
      min: {
        src: ['.tmp/stormpath.js'],
        dest: 'dist/stormpath.js',
      },
      js: {
        src: ['.tmp/stormpath.min.js'],
        dest: 'dist/stormpath.min.js',
      }
    },
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
        dest: '.tmp/stormpath.js',
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
          '.tmp/stormpath.min.js': ['.tmp/stormpath.js']
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

  grunt.registerTask('version', ['concat:min','concat:js']);

  grunt.registerTask('release', function (target){
    grunt.task.run(['bump-only:'+(target||'patch'),'build','version','bump-commit']);
  });

  grunt.registerTask('dev', ['karma:liveunit','connect:fakeapi','watch']);

};