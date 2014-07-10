'use strict';

var stormpathJs = require('../common').stormpath;

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
        assert.instanceOf(result[0],Error);
      });
    });

    describe('with an invalid JWT', function () {
      var result;
      before(function(done){
        new stormpathJs.Client({token:'this is not a valid token'},function(err,res){
          result = [err,res];
          done();
        });
      });
      it('should err',function(){
        assert.instanceOf(result[0],Error);
      });
    });

    describe('with an valid JWT', function () {
      var requestedAppHref, result;
      var token = require('../data/valid-jwt.json');
      var client;
      before(function(done){

        client = new stormpathJs.Client(
          {
            token:token.encoded,
            requestExecutor: {
              execute: function(m,u,cb){
                requestedAppHref = u;
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
      it('should call the callback with the idSiteModel value',function(){
        assert.equal(result[1],'abcd1234');
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
            execute: function(m,u,o,cb){
              if(u.match(/idSiteModel/)){
                // the first call for the site model
                done();
              }else{
                // the calls to login attempts
                calledWith.push(o);
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
        assert.deepEqual(calledWith[0],{body:input});
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
        assert.deepEqual(calledWith[1],{body:{type:'basic',value:data.encoded}});
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
            execute: function(m,u,o,cb){
              if(u.match(/idSiteModel/)){
                // the first call for the site model
                done();
              }else{
                // the calls to register
                calledWith.push([m,u,o]);
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
        assert.deepEqual(calledWith[0][0],'POST');
        expect(calledWith[0][1]).to.have.string('/accounts');
        assert.deepEqual(calledWith[0][2],{body:data});
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
            execute: function(m,u,cb){
              if(u.match(/idSiteModel/)){
                // the first call for the site model
                done();
              }else{
                // the calls to verifyEmailToken
                calledWith.push([m,u]);
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
        assert.deepEqual(calledWith[0][0],'POST');
        expect(calledWith[0][1]).to.have.string('/v1/accounts/emailVerificationTokens/' + token.decoded.sp_token);
        assert.equal(calledWith[0][2],null);
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
            execute: function(m,u,cb){
              if(u.match(/idSiteModel/)){
                // the first call for the site model
                done();
              }else{
                // the calls to verifyPasswordResetToken
                calledWith.push([m,u]);
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
        assert.deepEqual(calledWith[0][0],'GET');
        expect(calledWith[0][1]).to.have.string('passwordResetTokens/' + token.decoded.sp_token);
        assert.equal(calledWith[0][2],null);
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
            execute: function(m,u,o,cb){
              if(u.match(/idSiteModel/)){
                // the first call for the site model
                done();
              }else{
                // the calls to setAccountPassword
                calledWith.push([m,u,o]);
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
        assert.deepEqual(calledWith[0][0],'POST');
        assert.equal(calledWith[0][1],pwTokenVerification.href);
        assert.deepEqual(calledWith[0][2],{body:{password:newPassword}});
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
            execute: function(m,u,o,cb){
              if(u.match(/idSiteModel/)){
                // the first call for the site model
                done();
              }else{
                // the calls to sendPasswordResetEmail
                calledWith.push([m,u,o]);
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

    describe('if called with correct arugments',function(){
      var emailOrUsername = 'reset@met.com';
      before(function(done){
        client.sendPasswordResetEmail(emailOrUsername,function(){
          done();
        });
      });
      it('should post that data to the api',function(){
        assert.deepEqual(calledWith[0][0],'POST');
        assert.equal(calledWith[0][1],token.decoded.app_href + '/passwordResetTokens');
        assert.deepEqual(calledWith[0][2],{body:{email:emailOrUsername}});
      });
    });

  });

});