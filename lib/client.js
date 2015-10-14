'use strict';

var RequestExecutor = require('./request-executor');
var utils = require('./utils');
var strings = require('./strings');
var base64 = utils.base64;

function Client(options,readyCallback){
  var opts = typeof options === 'object' ? options : {};
  var cb = typeof options === 'function' ? options : ( readyCallback || utils.noop);
  var self = this;
  var jwtSegments = null;

  self.jwt = opts.token || self.getJwtFromUrl();

  if(!self.jwt){
    return self._deferCallback(cb,[new Error(strings.errors.JWT_NOT_FOUND)]);
  }

  jwtSegments = self.jwt.split('.');

  if(jwtSegments.length < 2 || jwtSegments.length > 3){
    return self._deferCallback(cb,[new Error(strings.errors.NOT_A_JWT)]);
  }

  try{
    self.jwtPayload = JSON.parse(base64.atob(jwtSegments[1]));
  }catch(e){
    return self._deferCallback(cb,[new Error(strings.errors.MALFORMED_JWT_CLAIMS)]);
  }

  self.appHref = self.jwtPayload.app_href;
  self.sptoken = self.jwtPayload.sp_token || null;
  self.baseurl = self.appHref.match('^.+//([^\/]+)\/')[0];

  if(self.jwtPayload.onk){
    self.setCachedOrganizationNameKey(self.jwtPayload.onk);
  }

  var idSiteModelHref = self.appHref;
  self.requestExecutor = opts.requestExecutor || new RequestExecutor(self.jwt);
  self.requestExecutor.execute(
    'GET',idSiteModelHref + '?expand=idSiteModel',
    function(err,application){
      cb(err, err? null:application.idSiteModel);
    }
  );
}
/**
 * Defers the calling of the callback until a later point
 * in time, useful for when you have callbacks in synchronous
 * code.
 *
 * @function
 * @param  {function} cb - The callback to call at a later time
 * @return {array} - args - The array of arguments to apply to the callback
 */
Client.prototype._deferCallback = function _deferCallback(cb,args) {
  setTimeout(function() {
    cb.apply(null,args);
  },1);
}

Client.prototype.organizationNameKeyCookieKey = 'sp.onk';

Client.prototype.organizationNameKeyCookieExpiration = 'expires=Fri, 31 Dec 9999 23:59:59 GMT';

Client.prototype.getCachedOrganizationNameKey = function() {
  return decodeURIComponent(
    document.cookie.replace(
      new RegExp('(?:(?:^|.*;)\\s*' + encodeURIComponent(this.organizationNameKeyCookieKey)
        .replace(/[\-\.\+\*]/g, '\\$&') + '\\s*\\=\\s*([^;]*).*$)|^.*$'),
      '$1'
    )
  ) || null;
};

Client.prototype.setCachedOrganizationNameKey = function(nameKey) {
  document.cookie = encodeURIComponent(this.organizationNameKeyCookieKey) +
    '=' + encodeURIComponent(nameKey) + '; ' + this.organizationNameKeyCookieExpiration;
};

/**
 * Attempts to fetch the JWT from the ?jwt=X location in the window URL.
 * Returns an empty string if not found
 * @return {string} JWT
 */
Client.prototype.getJwtFromUrl = function() {
  return decodeURIComponent( (window.location.href.match(/jwt=(.+)/) || [])[1] || '' );
};

Client.prototype.login = function login(credentials,callback) {
  var self = this;
  var data;
  var creds = typeof credentials === 'object' ? credentials : null;
  if(!creds){
    throw new Error('must provide an object');
  }else if(creds.providerData){
    data = creds;
  }else if(creds.login){
    data = {
      type: 'basic',
      value: utils.base64.btoa(creds.login + ':' + creds.password)
    };
  }else{
    throw new Error('unsupported credentials object');
  }

  if(creds.accountStore){
    data.accountStore = creds.accountStore;
  }

  self.requestExecutor.execute(
    'POST',self.appHref+'/loginAttempts',
    {
      body: data,
      withCredentials: true
    },
    callback || utils.noop
  );

};

Client.prototype.register = function register(data,callback) {
  if(typeof data!=='object'){
    throw new Error('client.register() must be called with a data object');
  }
  var self = this;
  self.requestExecutor.execute(
    'POST',self.appHref+'/accounts',
    {
      body: data,
      withCredentials: true
    },
    callback || utils.noop
  );
};

Client.prototype.verifyEmailToken = function verifyEmailToken(callback) {
  if(typeof callback!=='function'){
    throw new Error('client.verifyEmailToken() takes a function as it\'s only argument');
  }
  var self = this;
  self.requestExecutor.execute(
    'POST',
    self.baseurl + '/v1/accounts/emailVerificationTokens/' + self.sptoken,
    callback
  );
};

Client.prototype.verifyPasswordResetToken = function verifyPasswordResetToken(callback) {
  if(typeof callback!=='function'){
    throw new Error('client.verifyPasswordResetToken() takes a function as it\'s only argument');
  }
  var self = this;
  self.requestExecutor.execute(
    'GET',
    self.appHref + '/passwordResetTokens/' + self.sptoken,
    callback
  );
};

Client.prototype.setAccountPassword = function setAccountPassword(pwTokenVerification,newPassword,callback) {
  if(!pwTokenVerification || !pwTokenVerification.href){
    throw new Error('invalid pwTokenVerification');
  }
  if(!newPassword){
    throw new Error('must supply new password as second argument to client.setAccountPassword()');
  }
  var self = this;
  self.requestExecutor.execute('POST',pwTokenVerification.href,
    {
      body: {
        password: newPassword
      }
    },
    callback || utils.noop
  );
};

Client.prototype.sendPasswordResetEmail = function sendPasswordResetEmail(emailOrObject,callback) {
  var body;
  if(typeof emailOrObject==='string'){
    body = { email: emailOrObject };
  }else if(typeof emailOrObject === 'object'){
    body = emailOrObject;
  }else{
    throw new Error('sendPasswordResetEmail must be called with an email/username as the first argument, or an options object');
  }
  var self = this;
  self.requestExecutor.execute(
    'POST',
    self.appHref + '/passwordResetTokens',
    {
      body: body
    },
    callback || utils.noop
  );
};

module.exports = Client;