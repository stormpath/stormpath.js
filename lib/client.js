'use strict';

var deferCallback = require('./defer-callback');
var IdSiteRequestExecutor = require('./idsite-request-executor');
var strings = require('./strings');
var utils = require('./utils');


var base64 = utils.base64;
/**
 * Creates a Stormpath.js Client
 *
 * A client is meant to encapsulate the communication
 * with Stormpath's REST API.
 *
 * @constructor
 * @param {object} options configuration options
 * @param {function} readyCallback called when the client has
 * initialized with its needed data from the REST API.
 */
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

  var idSiteParentResource = self.appHref;

  if (self.jwtPayload.onk) {
    self.setCachedOrganizationNameKey(self.jwtPayload.onk);
  }

  if (self.jwtPayload.asnk) {
    idSiteParentResource = self.jwtPayload.ash;
  }

  self.requestExecutor = opts.requestExecutor || new IdSiteRequestExecutor(self.jwt);
  self.requestExecutor.execute(
    {
      method: 'GET',
      url: idSiteParentResource + '?expand=idSiteModel',
      json: true
    },
    function (err,application) {
      if (err) {
        if (err.status === 401) {
          return cb(new Error(strings.errors.INITIAL_JWT_REJECTED));
        }
        return cb(err);
      }

      /*
        Assert that the response got a new auth token header.  If it did not,
        there is likely a proxy or firewall that is stripping it from the
        response.
       */

      if (!self.requestExecutor.authToken) {
        return cb(new Error(strings.errors.NO_AUTH_TOKEN_HEADER));
      }

      self.replaceJWTInUrl(self.requestExecutor.authToken);

      cb(null,application.idSiteModel);
    }
  );
}

/**
 * When storing an organization name key for future us, store it in this named
 * cookie.
 * @type {String}
 */
Client.prototype.organizationNameKeyCookieKey = 'sp.onk';

/**
 * How long we should store the organization name key cookie for. Default:
 * forever.
 * @type {String}
 */
Client.prototype.organizationNameKeyCookieExpiration = 'expires=Fri, 31 Dec 9999 23:59:59 GMT';

/**
 * Pull the cached organization name key from the organization name key cookie
 * @return {string} The cached organization name.
 */
Client.prototype.getCachedOrganizationNameKey = function () {
  return decodeURIComponent(
    document.cookie.replace(
      new RegExp('(?:(?:^|.*;)\\s*' + encodeURIComponent(this.organizationNameKeyCookieKey)
        .replace(/[\-\.\+\*]/g, '\\$&') + '\\s*\\=\\s*([^;]*).*$)|^.*$'),
      '$1'
    )
  ) || null;
};

/**
 * Store the organization name key in the organization name key cookie
 * @param {string} organization name key
 */
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
  return decodeURIComponent( (window.location.href.match(/jwt=([^&]+)/) || [])[1] || '' );
};

/**
 * Attempts to replace the JWT in the url with the new JWT passed in the function.
 * @param {string} newJwt
 */
Client.prototype.replaceJWTInUrl = function (newJwt) {
  window.location.hash = '/?jwt=' + newJwt;
};

/**
 * Make a login attempt against the REST API, given the credentials and
 * application context.
 *
 * @param  {object} credentials - Example: <pre>{ username: '', password: ''}</pre>
 * @param  {Function} callback
 */
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

/**
 * Make an account creation attempt against the REST API, given the input data
 * and application context.  Social login should use this method.
 *
 * @param  {object}  data - Example:
 * <pre>
 * {
 *   username: '',
 *   password: '',
 *   givenName: '',
 *   surname: ''
 * }
 * </pre>
 * Social Example:
 * <pre>
 * {
 *   providerData: {
 *     providerId: 'google',
 *     accessToken: ''
 *    }
 *  }
 * </pre>
 * @param  {Function} callback - Called back with an error or ID Site Success
 * Result
 */
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

/**
 * Verify the email verification token that was embedded in the JWT that is in
 * the URL.
 *
 * @param  {Function} callback - If no error is given, the token is valid.
 */
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

/**
 * Verify the password reset token that was embedded in the JWT that is in the
 * URL.
 *
 * @param  {Function} callback - If no error is given, the token is valid.
 */
Client.prototype.verifyPasswordResetToken = function verifyPasswordResetToken (callback) {
  var client = this;

  if (typeof callback!=='function') {
    throw new Error('client.verifyPasswordResetToken() takes a function as it\'s only argument');
  }

  client.requestExecutor.execute(
    {
      method: 'GET',
      url: client.appHref + '/passwordResetTokens/' + client.sptoken,
      json: true
    },
    callback
  );
};

/**
 * Given the token resource, set the new password for the user.
 *
 * @param {object} passwordVerificationTokenResource -
 * Example:
 * <pre>
 * {
 *   href: 'https://api.stormpath.com/v1/applications/1h72PFWoGxHKhysKjYIkir/passwordResetTokens/3Wog2qMsHyyjD76AWUnnlO'
 * }
 * </pre>
 * @param  {Function} callback - If no error is given, the password was reset
 * successfully.  If an error, the password strength validation error will be
 * provided.
 */

Client.prototype.setAccountPassword = function setAccountPassword (passwordVerificationTokenResource,newPassword,callback) {

  var client = this;

  if (!passwordVerificationTokenResource || !passwordVerificationTokenResource.href) {
    throw new Error('invalid passwordVerificationTokenResource');
  }
  if (!newPassword) {
    throw new Error('must supply new password as second argument to client.setAccountPassword()');
  }

  client.requestExecutor.execute(
    {
      method: 'POST',
      url: passwordVerificationTokenResource.href,
      json: {
        password: newPassword
      }
    },
    callback || utils.noop
  );
};

/**
 * Given the email, send that account an email with password reset link.
 *
 * @param  {string}   email
 * @param  {Function} callback - The error will indicate if the account could
 * not be found.  Otherwise, the email was sent.
 */
Client.prototype.sendPasswordResetEmail = function sendPasswordResetEmail (emailOrObject,callback) {

  var client = this;
  var body;

  /*
    emailOrObject is a backcompat option, in the future this should be a string-only option
  */

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