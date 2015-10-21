'use strict';

var xhr = require('xhr');

var strings = require('./strings.json');

/**
 * Request executor for ID Site, it must be initialized with the JWT that was
 * recieved via the jwt parameter that is in the URL when you arrive on ID
 * Site from the 302 redirect from the /sso endpoint
 *
 * @constructor
 * @param {string} authToken - a JWT from the sso request
 */
function IdSiteRequestExecutor (authToken) {
  this.authToken = authToken;
}

IdSiteRequestExecutor.prototype.defaultDirectHandler = function defaultDirectHandler (url) {
  var client = this;
  return window.location = client.baseurl + 'sso/?jwtResponse=' + url.split('jwtResponse=')[1];
};

IdSiteRequestExecutor.prototype.handleResponse = function handleResponse (err,response,body,requestorCallback) {

  var executor = this;
  var newToken = response.headers.authorization;
  var parsedToken = null;
  var serviceProviderCallbackUrl = response.headers['stormpath-sso-redirect-location'];

  if (newToken) {
    parsedToken = newToken.split('Bearer');

    if (parsedToken.length!==2) {
      return requestorCallback(new Error(strings.errors.INVALID_AUTH_TOKEN_HEADER));
    }

    executor.authToken = parsedToken[1].trim();
  } else {
    executor.authToken = null;
  }

  /*
    Note: The XHR library does not coerce HTTP error codes to err.
    Only low-level errors (e.g CORS errors) are passed as err
   */

  if (err) {
    return requestorCallback(err);
  }

  if (response.statusCode>399) {
    if (serviceProviderCallbackUrl) {
      body.serviceProviderCallbackUrl = serviceProviderCallbackUrl;
    }
    return requestorCallback(body);
  }

  if (serviceProviderCallbackUrl) {
    return requestorCallback(null, { serviceProviderCallbackUrl: serviceProviderCallbackUrl });
  }

  if (!newToken) {
    return requestorCallback(new Error(strings.errors.NO_AUTH_TOKEN_HEADER));
  }

  requestorCallback(null,body);

};

IdSiteRequestExecutor.prototype.execute = function (xhrRequestOptions,callback) {

  var executor = this;

  if (typeof xhrRequestOptions !== 'object') {
    throw new Error('Must provide xhrRequestOptions as first parameter');
  }

  if (typeof callback !== 'function') {
    throw new Error('Must provide callback as second parameter');
  }

  if (!xhrRequestOptions.headers) {
    xhrRequestOptions.headers = {};
  }

  if (!executor.authToken) {
    return callback(new Error(strings.errors.NO_AUTH_TOKEN));
  }

  xhrRequestOptions.headers.Authorization = 'Bearer ' + executor.authToken;

  return xhr(xhrRequestOptions, function xhrCallback (err,response,body) {
    executor.handleResponse(err,response,body,callback);
  });

};

module.exports = IdSiteRequestExecutor;