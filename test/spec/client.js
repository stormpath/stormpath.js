'use strict';

var stormpathJs = require('../common').stormpath;

describe('Client', function () {


  describe('instantiation', function () {
    describe('without a JWT in the url', function () {
      var result;
      before(function(done){
        new stormpathJs.Client(function(err,res){
          result = [err,res];
          done();
        });
      });
      it('should err because jwt was not found',function(){
        assert.instanceOf(result[0],Error);
      });
    });


  });


});