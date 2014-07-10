'use strict';

var stormpathJs = require('../common').stormpath;

describe('Request Executor', function () {
  var validToken = require('../data/valid-jwt.json');
  var firstToken, secondToken;
  describe('instantiation', function () {
    before(function(done){
      var client = new stormpathJs.Client(
        { token: validToken.encoded },
        function(){
          secondToken = client.requestExecutor.authToken;
          done();
        }
      );
      firstToken = ( client.requestExecutor.authToken + '' );
    });
    it('should retain the initial token',function(){
      assert.equal(firstToken,validToken.encoded);
    });
    it('should retain the new token after the idSite request',function(){
      assert.equal(secondToken,'id-site-result-token');
    });
  });


  describe('after a bad login attempt', function () {
    var client;
    before(function(done){
      client = new stormpathJs.Client(
        { token: validToken.encoded },
        function(){
          client.login({login:'bad',password:'bad'},function(){
            done();
          });
        }
      );

    });
    it('should retain the new token',function(){
      assert.equal(client.requestExecutor.authToken,'bad-login-result-token');
    });
  });

  describe('after a successful login attempt', function () {
    var client;
    before(function(done){
      client = new stormpathJs.Client(
        { token: validToken.encoded },
        function(){
          client.login({login:'good',password:'good'},done);
        }
      );

    });
    it('should not have a new token',function(){
      assert.equal(client.requestExecutor.authToken,'');
    });
  });


});