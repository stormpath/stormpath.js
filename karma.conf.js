// Karma configuration
// http://karma-runner.github.io/0.10/config/configuration-file.html

module.exports = function(config) {
  config.set({
    // base path, that will be used to resolve files and exclude
    basePath: '',

    // testing framework to use (jasmine/mocha/qunit/...)
    frameworks: ['mocha','browserify','chai'],

    // list of files / patterns to load in the browser
    files: [
      // 'lib/**/*.js',
      // 'test/mock/**/*.js',
      'test/it/**/*.js',
      'test/spec/**/*.js'
    ],

    // list of files / patterns to exclude
    exclude: [],

    // web server port
    port: 8090,

    // level of logging
    // possible values: LOG_DISABLE || LOG_ERROR || LOG_WARN || LOG_INFO || LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,


    // Start these browsers, currently available:
    // - Chrome
    // - ChromeCanary
    // - Firefox
    // - Opera
    // - Safari (only Mac)
    // - PhantomJS
    // - IE (only Windows)
    browsers: [
      // 'Chrome'
      // 'sl_firefox_20'
      'sl_firefox_latest',
      // 'sl_safari_8'
      // 'Safari'
    ],

    browserify: {
      watch: true,
      debug: true
    },

    preprocessors: {
      'test/it/*.js': ['browserify'],
      'test/spec/*.js': ['browserify']
    },

    reporters: ['progress','coverage','saucelabs'],


    // Continuous Integration mode
    // if true, it capture browsers, run tests and exit
    singleRun: false,

    customLaunchers: {
      sl_firefox_20: {
        base: 'SauceLabs',
        browserName: 'firefox',
        version: '20'
      },
      sl_firefox_latest: {
        base: 'SauceLabs',
        browserName: 'firefox'
      },
      sl_chrome_latest: {
        base: 'SauceLabs',
        browserName: 'chrome'
      },
      sl_ie_11: {
        base: 'SauceLabs',
        browserName: 'internet explorer',
        platform: 'Windows 8.1',
        version: '11'
      },
      sl_ie_10: {
        base: 'SauceLabs',
        browserName: 'internet explorer',
        platform: 'Windows 7',
        version: '10'
      },
      sl_ios_safari: {
        base: 'SauceLabs',
        browserName: 'iphone',
        platform: 'OS X 10.9',
        version: '7.1'
      },
      sl_safari_9: {
        base: 'SauceLabs',
        browserName: 'safari',
        platform: 'OS X 10.11',
        version: '9.0'
      },
      sl_safari_8: {
        base: 'SauceLabs',
        browserName: 'safari',
        platform: 'OS X 10.10',
        version: '8.0'
      }
    },

    sauceLabs: {
      testName: 'Stormpath.js Tests',
      startConnect: false,
      connectOptions: {
        username: 'xxx',
        accessKey: 'xxx',
        tunnelIdentifier: 'xxx'
      }
    }


  });
};
