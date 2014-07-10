'use strict';

var stormpathJs = require('../common').stormpath;

describe('Client', function () {
  var validToken = require('../data/valid-jwt.json');
  var client;
  describe('instantiation', function () {
    var result;
    before(function(done){
      client = new stormpathJs.Client(
        { token: validToken.encoded },
        function(err,idSiteModel){
          result = [err,idSiteModel];
          done();
        }
      );
    });
    it('should call the callback an idSiteModel',function(){
      assert.equal(result[1].href,validToken.decoded.app_href+'/idSiteModel');
    });
  });

  describe('login() with a bad login', function () {
    var result;
    before(function(done){
      client.login({login:'bad',password:'bad'},function(err,value){
        result = [err,value];
        done();
      });
    });
    it('should error with 400',function(){
      assert.equal(result[0].status,400);
    });
  });

  describe('login() with a good login', function () {
    var result;
    before(function(done){
      client.login({login:'good',password:'good'},function(err,value){
        result = [err,value];
        done();
      });
    });
    it('should give a redirect url',function(){
      assert.equal(result[1].redirectUrl,'the-place-to-go');
    });
  });

  describe('register()', function () {
    describe('with email verificaion workflow enabled', function () {
      var result;
      before(function(done){
        client.register({email:'verification-enabled'},function(err,value){
          result = [err,value];
          done();
        });
      });
      it('should not give a redirect url',function(){
        assert.equal(result[1],null);
      });
    });
    describe('with email verificaion workflow disabled', function () {
      var client, result;

      before(function(done){
        // need a new client because the last test will end the session
        client = new stormpathJs.Client({ token: validToken.encoded },function(){
          client.register({email:'verification-disabled'},function(err,value){
            result = [err,value];
            done();
          });
        });

      });
      it('should give a redirect url',function(){
        assert.equal(result[1].redirectUrl,'the-place-to-go');
      });
    });
  });
});