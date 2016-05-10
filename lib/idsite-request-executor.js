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

/**
 * Handles a response from the REST API, as executed by the`xhr` library.
 *
 * It will cache the new auth token for future use, or supply the service
 * provider redirect URL (if that header exists) to the callback.
 *
 * @method
 * @param {object} err - Provided by the xhr library callback
 * @param {object} response - Provided by the xhr library callback
 * @param {object} body - Provided by the xhr library callback
 * @param {object} callback - the callback from the calling method in the client
 * layer
 */
IdSiteRequestExecutor.prototype.handleResponse = function handleResponse (err,response,body,requestorCallback) {

  var executor = this;
  var newToken = response.headers.authorization || response.rawRequest.getResponseHeader && response.rawRequest.getResponseHeader('Authorization');
  var parsedToken = null;
  var serviceProviderCallbackUrl = response.headers['stormpath-sso-redirect-location'] || response.rawRequest.getResponseHeader && response.rawRequest.getResponseHeader('stormpath-sso-redirect-location');

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

  requestorCallback(null,body);

};

/**
 * Makes a request of the REST API, given the options for the xhr library.
 * The cached auth token is used for authentication with the REST API.
 *
 * @param  {object}   xhrRequestOptions - Options for the call to `xhr(options)`
 * @param  {Function} callback - The callback to call with the result, as decorated
 * by the `handleResponse` method in this class
 *
 */
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