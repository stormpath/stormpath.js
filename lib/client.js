var RequestExecutor = require('./request-executor');
var utils = require('./utils');
var base64 = utils.base64;

function Client(options,readyCallback){
  var opts = typeof options === 'object' ? options : {};
  var cb = typeof options === 'function' ? options : ( readyCallback || utils.noop);
  var self = this;
  self.baseurl = "https://api.stormpath.com";
  self.jwt = opts.jwt || (window.location.href.match(/jwt=(.+)/) || [])[1];
  if(!self.jwt){
    return cb(new Error('jwt not found as url query parameter'));
  }
  try{
    self.jwtPayload = JSON.parse(base64.atob(self.jwt.split('.')[1]));
    self.appHref = self.jwtPayload.app_href;
    self.sptoken = self.jwtPayload.sp_token || null;
  }catch(e){
    return cb(e);
  }
  self.requestExecutor = opts.requestExecutor || new RequestExecutor(self.jwt);
  self.requestExecutor.execute(
    'GET',self.appHref + '?expand=idSiteModel',
    function(err,application){
      cb(err, err? null:application.idSiteModel);
    }
  );
}

Client.prototype.login = function login(credentials,callback) {
  var self = this;
  var data;
  if(!credentials){
    return callback(new Error('must provide an object'));
  }else if(credentials.providerData){
    data = credentials;
  }else if(credentials.login){
    data = {
      type: 'basic',
      value: utils.base64.btoa(credentials.login + ':' + credentials.password)
    };
  }else{
    return callback(new Error('unsupported credentials object'));
  }

  self.requestExecutor.execute(
    'POST',self.appHref+'/loginAttempts',
    {
      body: data
    },
    callback
  );

};

Client.prototype.register = function register(data,callback) {
  var self = this;
  self.requestExecutor.execute(
    'POST',self.appHref+'/accounts',
    {
      body: data
    },
    callback
  );
};

Client.prototype.verifyEmailToken = function verifyEmailToken(callback) {
  var self = this;
  self.requestExecutor.execute(
    'POST',
    self.baseurl + '/v1/accounts/emailVerificationTokens/' + self.sptoken,
    callback
  );
};

Client.prototype.verifyPasswordResetToken = function verifyEmailToken(callback) {
  var self = this;
  self.requestExecutor.execute(
    'GET',
    self.appHref + '/passwordResetTokens/' + self.sptoken,
    callback
  );
};

Client.prototype.setNewPassword = function setNewPassword(pwTokenVerification,password,callback) {
  if(!pwTokenVerification || !pwTokenVerification.href){
    return callback(new Error('invalid pwTokenVerification'));
  }
  var self = this;
  self.requestExecutor.execute('POST',pwTokenVerification.href,
    {
      body: {
        password: password
      }
    },
    callback
  );
};

Client.prototype.sendPasswordResetEmail = function sendPasswordResetEmail(emailOrUsername,callback) {
  var self = this;
  self.requestExecutor.execute(
    'POST',
    self.appHref + '/passwordResetTokens',
    {
      body: { email: emailOrUsername }
    },
    callback
  );
};

module.exports = Client;