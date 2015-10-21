'use strict';

var deferCallback = require('./defer-callback');
var IdSiteRequestExecutor = require('./idsite-request-executor');
var strings = require('./strings');
var utils = require('./utils');

var base64 = utils.base64;

function Client (options,readyCallback) {
  var opts = typeof options === 'object' ? options : {};
  var cb = typeof options === 'function' ? options : ( readyCallback || utils.noop);
  var self = this;
  var jwtSegments = null;

  self.jwt = opts.token || self.getJwtFromUrl();

  if (!self.jwt) {
    return deferCallback(cb,[new Error(strings.errors.JWT_NOT_FOUND)]);
  }

  jwtSegments = self.jwt.split('.');

  if (jwtSegments.length < 2 || jwtSegments.length > 3) {
    return deferCallback(cb,[new Error(strings.errors.NOT_A_JWT)]);
  }

  try {
    self.jwtPayload = JSON.parse(base64.atob(jwtSegments[1]));
  } catch (e) {
    return deferCallback(cb,[new Error(strings.errors.MALFORMED_JWT_CLAIMS)]);
  }

  self.appHref = self.jwtPayload.app_href;
  self.sptoken = self.jwtPayload.sp_token || null;
  self.baseurl = self.appHref.match('^.+//([^\/]+)\/')[0];

  if (self.jwtPayload.onk) {
    self.setCachedOrganizationNameKey(self.jwtPayload.onk);
  }

  var idSiteModelHref = self.appHref;
  self.requestExecutor = opts.requestExecutor || new IdSiteRequestExecutor(self.jwt);
  self.requestExecutor.execute(
    {
      method: 'GET',
      url: idSiteModelHref + '?expand=idSiteModel',
      json: true
    },
    function (err,application) {
      cb(err, err? null:application.idSiteModel);
    }
  );
}

Client.prototype.organizationNameKeyCookieKey = 'sp.onk';

Client.prototype.organizationNameKeyCookieExpiration = 'expires=Fri, 31 Dec 9999 23:59:59 GMT';

Client.prototype.getCachedOrganizationNameKey = function () {
  return decodeURIComponent(
    document.cookie.replace(
      new RegExp('(?:(?:^|.*;)\\s*' + encodeURIComponent(this.organizationNameKeyCookieKey)
        .replace(/[\-\.\+\*]/g, '\\$&') + '\\s*\\=\\s*([^;]*).*$)|^.*$'),
      '$1'
    )
  ) || null;
};

Client.prototype.setCachedOrganizationNameKey = function (nameKey) {
  document.cookie = encodeURIComponent(this.organizationNameKeyCookieKey) +
    '=' + encodeURIComponent(nameKey) + '; ' + this.organizationNameKeyCookieExpiration;
};

/**
 * Attempts to fetch the JWT from the ?jwt=X location in the window URL.
 * Returns an empty string if not found
 * @return {string} JWT
 */
Client.prototype.getJwtFromUrl = function () {
  return decodeURIComponent( (window.location.href.match(/jwt=(.+)/) || [])[1] || '' );
};

Client.prototype.login = function login (credentials,callback) {
  var self = this;
  var data;
  var creds = typeof credentials === 'object' ? credentials : null;
  if (!creds) {
    throw new Error('must provide an object');
  } else if (creds.providerData) {
    data = creds;
  } else if (creds.login) {
    data = {
      type: 'basic',
      value: utils.base64.btoa(creds.login + ':' + creds.password)
    };
  } else {
    throw new Error('unsupported credentials object');
  }

  if (creds.accountStore) {
    data.accountStore = creds.accountStore;
  }
  self.requestExecutor.execute(
    {
      method: 'POST',
      url: self.appHref+'/loginAttempts',
      json: data
    },
    callback || utils.noop
  );

};

Client.prototype.register = function register (data,callback) {
  if (typeof data!=='object') {
    throw new Error('client.register() must be called with a data object');
  }
  var client = this;
  client.requestExecutor.execute(
    {
      method: 'POST',
      url: client.appHref+'/accounts',
      json: data
    },
    callback || utils.noop
  );
};

Client.prototype.verifyEmailToken = function verifyEmailToken (callback) {
  var client = this;

  if (typeof callback!=='function') {
    throw new Error('client.verifyEmailToken() takes a function as it\'s only argument');
  }

  client.requestExecutor.execute(
    {
      method: 'POST',
      url: client.baseurl + '/v1/accounts/emailVerificationTokens/' + client.sptoken
    },
    callback
  );
};

Client.prototype.verifyPasswordResetToken = function verifyPasswordResetToken (callback) {
  var client = this;

  if (typeof callback!=='function') {
    throw new Error('client.verifyPasswordResetToken() takes a function as it\'s only argument');
  }

  client.requestExecutor.execute(
    {
      method: 'POST',
      url: client.appHref + '/passwordResetTokens/' + client.sptoken
    },
    callback
  );
};

Client.prototype.setAccountPassword = function setAccountPassword (pwTokenVerification,newPassword,callback) {

  var client = this;

  if (!pwTokenVerification || !pwTokenVerification.href) {
    throw new Error('invalid pwTokenVerification');
  }
  if (!newPassword) {
    throw new Error('must supply new password as second argument to client.setAccountPassword()');
  }

  client.requestExecutor.execute(
    {
      method: 'POST',
      url: pwTokenVerification.href,
      json: {
        password: newPassword
      }
    },
    callback || utils.noop
  );
};

Client.prototype.sendPasswordResetEmail = function sendPasswordResetEmail (emailOrObject,callback) {

  var client = this;
  var body;

  if (typeof emailOrObject==='string') {
    body = { email: emailOrObject };
  } else if (typeof emailOrObject === 'object') {
    body = emailOrObject;
  } else {
    throw new Error('sendPasswordResetEmail must be called with an email/username as the first argument, or an options object');
  }

  client.requestExecutor.execute(
    {
      method: 'POST',
      url: client.appHref + '/passwordResetTokens',
      json: body
    },
    callback || utils.noop
  );
};

module.exports = Client;