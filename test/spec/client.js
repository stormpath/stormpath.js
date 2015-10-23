'use strict';

var stormpathJs = require('../common').stormpath;
var strings = require('../../lib/strings');

describe('Client', function () {


  describe('instantiation', function () {
    describe('without a JWT in the url, and not specified by options', function () {
      var result;
      before(function(done){
        new stormpathJs.Client(function(err,res){
          result = [err,res];
          done();
        });
      });
      it('should err',function(){
        assert.equal(result[0].message,strings.errors.JWT_NOT_FOUND);
      });
    });

    describe('with a invalid JWT', function () {
      var result;
      before(function(done){
        new stormpathJs.Client({token:'this is not a valid token'},function(err,res){
          result = [err,res];
          done();
        });
      });
      it('should err',function(){
        assert.equal(result[0].message,strings.errors.NOT_A_JWT);
      });
    });

    describe('with a valid JWT', function () {
      var requestedAppHref, result;
      var token = require('../data/valid-jwt.json');
      var client;
      before(function(done){

        client = new stormpathJs.Client(
          {
            token:token.encoded,
            requestExecutor: {
              execute: function(xhrRequestOptions,cb){
                requestedAppHref = xhrRequestOptions.url;
                cb(null,{idSiteModel:'abcd1234'});
                done();
              }
            }
          },
          function(err,idSiteModel){
            result = [err,idSiteModel];
          }
        );
      });
      it('should request the app href that was specified by the token',function(){
        expect(requestedAppHref).to.have.string(token.decoded.app_href);
      });

    });

  });

  describe('login()', function () {
    var calledWith = [];
    var token = require('../data/valid-jwt.json');
    var client;
    before(function(done){
      client = new stormpathJs.Client(
        {
          token:token.encoded,
          requestExecutor: {
            execute: function(xhrRequestOptions,cb){
              if(xhrRequestOptions.url.match(/idSiteModel/)){
                // the first call for the site model
                done();
              }else{
                // the calls to login attempts
                calledWith.push(xhrRequestOptions);
                cb();
              }
            }
          }
        }
      );
    });

    describe('if called without credentials',function(){
      it('should throw',function(){
        assert.throws(client.login);
      });
    });

    describe('if called with unsupported credentials',function(){
      it('should throw',function(){
        assert.throws(function(){client.login({'unsupported':true});});
      });
    });

    describe('if called with providerData (social login)',function(){
      var result;
      var input = {
        providerData: {a:1,b:2}
      };
      before(function(done){
        client.login(input,function(err){
          result = [err];
          done();
        });
      });
      it('should post that data to the api',function(){
        assert.deepEqual(calledWith[0].json,input);
      });
    });
    describe('if called with username/password',function(){
      var result;
      var data = require('../data/basic-login.json');
      var input = {
        login: data.login,
        password: data.password
      };
      before(function(done){
        client.login(input,function(err){
          result = [err];
          done();
        });
      });
      it('should post base64 encode the data and post it to the api',function(){
        assert.deepEqual(calledWith[1].json,{type:'basic',value:data.encoded});
      });
    });

    describe('if called with unicode characters', function(){
      var result;
      var data = require('../data/unicode-password.json');
      var input = {
        login: data.login,
        password: data.password
      };
      before(function(done){
        client.login(input,function(err){
          result = [err];
          done();
        });
      });
      it('should post the correct base64 encoded string to the API',function(){
        assert.deepEqual(calledWith[2].json,{type:'basic',value:data.encoded});
      });
    });

    describe('if called with an account store',function(){
      var result;
      var data = require('../data/basic-login.json');
      var input = {
        login: data.login,
        password: data.password,
        accountStore:{
          href: 'abc'
        }
      };
      before(function(done){
        client.login(input,function(err){
          result = [err];
          done();
        });
      });
      it('should pass the account store to the api',function(){
        assert.equal(calledWith[3].json.accountStore.href,input.accountStore.href);
      });
    });
  });

  describe('register()', function () {
    var calledWith = [];
    var token = require('../data/valid-jwt.json');
    var client;
    before(function(done){
      client = new stormpathJs.Client(
        {
          token:token.encoded,
          requestExecutor: {
            execute: function(xhrRequestOptions,cb){
              if(xhrRequestOptions.url.match(/idSiteModel/)){
                // the first call for the site model
                done();
              }else{
                // the calls to register
                calledWith.push([xhrRequestOptions]);
                cb();
              }
            }
          }
        }
      );
    });

    describe('if called without data',function(){
      it('should throw',function(){
        assert.throws(client.register);
      });
    });

    describe('if called with data',function(){
      var data = {'data':1234};
      before(function(done){
        client.register(data,function(){
          done();
        });
      });
      it('should post that data to the api',function(){
        var xhrInvocation = calledWith[0][0];
        assert.deepEqual(xhrInvocation.method,'POST');
        expect(xhrInvocation.url).to.have.string('/accounts');
        assert.deepEqual(xhrInvocation.json,data);
      });
    });

  });

  describe('verifyEmailToken()', function () {
    var calledWith = [];
    var token = require('../data/valid-jwt.json');
    var client;

    before(function(done){
      client = new stormpathJs.Client(
        {
          token:token.encoded,
          requestExecutor: {
            execute: function(xhrRequestOptions,cb){
              if(xhrRequestOptions.url.match(/idSiteModel/)){
                // the first call for the site model
                done();
              }else{
                // the calls to verifyEmailToken
                calledWith.push([xhrRequestOptions]);
                cb();
              }
            }
          }
        }
      );
    });

    describe('if called without a callback',function(){
      it('should throw',function(){
        assert.throws(client.verifyEmailToken);
      });
    });

    describe('if called with callback',function(){
      before(function(done){
        client.verifyEmailToken(function(){
          done();
        });
      });
      it('should post that data to the api',function(){
        var xhrInvocation = calledWith[0][0];
        assert.deepEqual(xhrInvocation.method,'POST');
        expect(xhrInvocation.url).to.have.string('/v1/accounts/emailVerificationTokens/' + token.decoded.sp_token);
        assert.equal(xhrInvocation.json,null);
      });
    });

  });

  describe('verifyPasswordResetToken()', function () {
    var calledWith = [];
    var token = require('../data/valid-jwt.json');
    var client;

    before(function(done){
      client = new stormpathJs.Client(
        {
          token:token.encoded,
          requestExecutor: {
            execute: function(xhrRequestOptions,cb){
              if(xhrRequestOptions.url.match(/idSiteModel/)){
                // the first call for the site model
                done();
              }else{
                // the calls to verifyPasswordResetToken
                calledWith.push([xhrRequestOptions]);
                cb();
              }
            }
          }
        }
      );
    });

    describe('if called without a callback',function(){
      it('should throw',function(){
        assert.throws(client.verifyPasswordResetToken);
      });
    });

    describe('if called with callback',function(){
      before(function(done){
        client.verifyPasswordResetToken(function(){
          done();
        });
      });
      it('should post that data to the api',function(){
        var xhrInvocation = calledWith[0][0];
        assert.deepEqual(xhrInvocation.method,'GET');
        expect(xhrInvocation.url).to.have.string('passwordResetTokens/' + token.decoded.sp_token);
        assert.equal(xhrInvocation.json,true);
      });
    });

  });


  describe('setAccountPassword()', function () {
    var calledWith = [];
    var token = require('../data/valid-jwt.json');
    var client;

    before(function(done){
      client = new stormpathJs.Client(
        {
          token:token.encoded,
          requestExecutor: {
            execute: function(xhrRequestOptions,cb){
              if(xhrRequestOptions.url.match(/idSiteModel/)){
                // the first call for the site model
                done();
              }else{
                // the calls to setAccountPassword
                calledWith.push([xhrRequestOptions]);
                cb();
              }
            }
          }
        }
      );
    });

    describe('if called without a callback',function(){
      it('should throw',function(){
        assert.throws(client.setAccountPassword);
      });
    });

    describe('if called with an invalid pwTokenVerification',function(){
      it('should throw',function(){
        assert.throws(function(){
          client.setAccountPassword({this:'is not valid'});
        });
      });
    });

    describe('if called without a new password',function(){
      it('should throw',function(){
        assert.throws(function(){
          client.setAccountPassword({href:'this is almost valid'});
        });
      });
    });

    describe('if called with correct arugments',function(){
      var pwTokenVerification = {href:'abc'};
      var newPassword = 'newPasswordz';
      before(function(done){
        client.setAccountPassword(pwTokenVerification,newPassword,function(){
          done();
        });
      });
      it('should post that data to the api',function(){
        var xhrInvocation = calledWith[0][0];
        assert.deepEqual(xhrInvocation.method,'POST');
        assert.equal(xhrInvocation.url,pwTokenVerification.href);
        assert.deepEqual(xhrInvocation.json,{password:newPassword});
      });
    });

  });


  describe('sendPasswordResetEmail()', function () {
    var calledWith = [];
    var token = require('../data/valid-jwt.json');
    var client;

    before(function(done){
      client = new stormpathJs.Client(
        {
          token:token.encoded,
          requestExecutor: {
            execute: function(xhrRequestOptions,cb){
              if(xhrRequestOptions.url.match(/idSiteModel/)){
                // the first call for the site model
                done();
              }else{
                // the calls to sendPasswordResetEmail
                calledWith.push([xhrRequestOptions]);
                cb();
              }
            }
          }
        }
      );
    });

    describe('if called without a emailOrUsername',function(){
      it('should throw',function(){
        assert.throws(client.sendPasswordResetEmail);
      });
    });

    describe('if called with an email',function(){
      var emailOrUsername = 'reset@met.com';
      before(function(done){
        client.sendPasswordResetEmail(emailOrUsername,function(){
          done();
        });
      });
      it('should post that email',function(){
        var xhrInvocation = calledWith[0][0];
        assert.deepEqual(xhrInvocation.method,'POST');
        assert.equal(xhrInvocation.url,token.decoded.app_href + '/passwordResetTokens');
        assert.deepEqual(xhrInvocation.json,{ email:emailOrUsername });
      });
    });

    describe('if called with an object',function(){
      var data = {
        email: 'reset@met.com',
        accountStore: {
          href: 'anHref' + Math.random()
        }
      };
      before(function(done){
        client.sendPasswordResetEmail(data,function(){
          done();
        });
      });
      it('should post that object',function(){
        var xhrInvocation = calledWith[1][0];
        assert.deepEqual(xhrInvocation.method,'POST');
        assert.equal(xhrInvocation.url,token.decoded.app_href + '/passwordResetTokens');
        assert.deepEqual(xhrInvocation.json,data);
      });
    });

  });

});