'use strict';

describe('lib', function () {

  var stormpath;

  it('should be require-able',function(){
    stormpath = require('../../');
  });

  it('should be an object', function () {
    expect(typeof stormpath).to.equal('object');
  });

  it('should export Client constructor', function () {
    expect(typeof stormpath.Client).to.equal('function');
  });

});
