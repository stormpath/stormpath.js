(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Stormpath = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

      if (!opts.token) {
        document.cookie = 'idSiteJwt=' + self.requestExecutor.authToken
      }

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
  var jwtMatch = window.location.href.match(/jwt=([^&]+)/)
  var jwtCookie = utils.getCookie('idSiteJwt')
  if(jwtMatch) {
    window.location.hash = window.location.hash.replace(/jwt=([^&]+)/, '')
    return decodeURIComponent(jwtMatch[1])
  } else if (jwtCookie) {
    document.cookie = 'idSiteJwt=' + ''
    return jwtCookie
  } else {
    return ''
  }
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
},{"./defer-callback":2,"./idsite-request-executor":3,"./strings":5,"./utils":6}],2:[function(require,module,exports){
'use strict';

/**
 * Defers the calling of the callback until the next run of
 * the event loop.  Do then when the callee is expecting
 * the callback to be called after the current event loop
 * is done processing (aka Angular's digest scheme)
 *
 * @function
 * @param  {function} cb - The callback to call at a later time
 * @return {array} - args - The array of arguments to apply to the callback
 */
function deferCallback (cb,args) {
  setTimeout(function () {
    cb.apply(null,args);
  },0);
}

module.exports = deferCallback;
},{}],3:[function(require,module,exports){
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
},{"./strings.json":5,"xhr":13}],4:[function(require,module,exports){
module.exports = {
  Client: require('./client')
};
},{"./client":1}],5:[function(require,module,exports){
module.exports={
  "errors": {
    "JWT_NOT_FOUND": "Login session not initialized.",
    "NOT_A_JWT": "JWT does not appear to be a property formatted JWT.",
    "MALFORMED_JWT_CLAIMS": "The JWT claims section is malfomed and could not be decoded as JSON.",
    "NO_AUTH_TOKEN_HEADER": "HTTP response does not contain Authorization header.",
    "INVALID_AUTH_TOKEN_HEADER": "HTTP response has an invalid Authorization header.",
    "INITIAL_JWT_REJECTED": "Your login session is expired."
  }
}
},{}],6:[function(require,module,exports){
'use strict';

/**
 * @function
 * From: https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding#Solution_.232_.E2.80.93_rewriting_atob()_and_btoa()_using_TypedArrays_and_UTF-8
 */

function b64EncodeUnicode(str) {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
    return String.fromCharCode('0x' + p1);
  }));
}

function getCookie(name) {
  var cookie = document.cookie.match(new RegExp(name + '=([^;]+)'));
  if (cookie) {
    return cookie[1];
  }
}

module.exports = {
  base64: {
    atob: function atob(str){
      return decodeURIComponent(window.atob(str));
    },
    btoa: function btoa(str){
      var v = b64EncodeUnicode(str);
      return v;
    }
  },
  noop: function(){}, 
  getCookie: getCookie
};
},{}],7:[function(require,module,exports){
var isFunction = require('is-function')

module.exports = forEach

var toString = Object.prototype.toString
var hasOwnProperty = Object.prototype.hasOwnProperty

function forEach(list, iterator, context) {
    if (!isFunction(iterator)) {
        throw new TypeError('iterator must be a function')
    }

    if (arguments.length < 3) {
        context = this
    }
    
    if (toString.call(list) === '[object Array]')
        forEachArray(list, iterator, context)
    else if (typeof list === 'string')
        forEachString(list, iterator, context)
    else
        forEachObject(list, iterator, context)
}

function forEachArray(array, iterator, context) {
    for (var i = 0, len = array.length; i < len; i++) {
        if (hasOwnProperty.call(array, i)) {
            iterator.call(context, array[i], i, array)
        }
    }
}

function forEachString(string, iterator, context) {
    for (var i = 0, len = string.length; i < len; i++) {
        // no such thing as a sparse string.
        iterator.call(context, string.charAt(i), i, string)
    }
}

function forEachObject(object, iterator, context) {
    for (var k in object) {
        if (hasOwnProperty.call(object, k)) {
            iterator.call(context, object[k], k, object)
        }
    }
}

},{"is-function":9}],8:[function(require,module,exports){
(function (global){
if (typeof window !== "undefined") {
    module.exports = window;
} else if (typeof global !== "undefined") {
    module.exports = global;
} else if (typeof self !== "undefined"){
    module.exports = self;
} else {
    module.exports = {};
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],9:[function(require,module,exports){
module.exports = isFunction

var toString = Object.prototype.toString

function isFunction (fn) {
  var string = toString.call(fn)
  return string === '[object Function]' ||
    (typeof fn === 'function' && string !== '[object RegExp]') ||
    (typeof window !== 'undefined' &&
     // IE8 and below
     (fn === window.setTimeout ||
      fn === window.alert ||
      fn === window.confirm ||
      fn === window.prompt))
};

},{}],10:[function(require,module,exports){
module.exports = once

once.proto = once(function () {
  Object.defineProperty(Function.prototype, 'once', {
    value: function () {
      return once(this)
    },
    configurable: true
  })
})

function once (fn) {
  var called = false
  return function () {
    if (called) return
    called = true
    return fn.apply(this, arguments)
  }
}

},{}],11:[function(require,module,exports){
var trim = require('trim')
  , forEach = require('for-each')
  , isArray = function(arg) {
      return Object.prototype.toString.call(arg) === '[object Array]';
    }

module.exports = function (headers) {
  if (!headers)
    return {}

  var result = {}

  forEach(
      trim(headers).split('\n')
    , function (row) {
        var index = row.indexOf(':')
          , key = trim(row.slice(0, index)).toLowerCase()
          , value = trim(row.slice(index + 1))

        if (typeof(result[key]) === 'undefined') {
          result[key] = value
        } else if (isArray(result[key])) {
          result[key].push(value)
        } else {
          result[key] = [ result[key], value ]
        }
      }
  )

  return result
}
},{"for-each":7,"trim":12}],12:[function(require,module,exports){

exports = module.exports = trim;

function trim(str){
  return str.replace(/^\s*|\s*$/g, '');
}

exports.left = function(str){
  return str.replace(/^\s*/, '');
};

exports.right = function(str){
  return str.replace(/\s*$/, '');
};

},{}],13:[function(require,module,exports){
"use strict";
var window = require("global/window")
var once = require("once")
var isFunction = require("is-function")
var parseHeaders = require("parse-headers")
var xtend = require("xtend")

module.exports = createXHR
createXHR.XMLHttpRequest = window.XMLHttpRequest || noop
createXHR.XDomainRequest = "withCredentials" in (new createXHR.XMLHttpRequest()) ? createXHR.XMLHttpRequest : window.XDomainRequest

forEachArray(["get", "put", "post", "patch", "head", "delete"], function(method) {
    createXHR[method === "delete" ? "del" : method] = function(uri, options, callback) {
        options = initParams(uri, options, callback)
        options.method = method.toUpperCase()
        return _createXHR(options)
    }
})

function forEachArray(array, iterator) {
    for (var i = 0; i < array.length; i++) {
        iterator(array[i])
    }
}

function isEmpty(obj){
    for(var i in obj){
        if(obj.hasOwnProperty(i)) return false
    }
    return true
}

function initParams(uri, options, callback) {
    var params = uri

    if (isFunction(options)) {
        callback = options
        if (typeof uri === "string") {
            params = {uri:uri}
        }
    } else {
        params = xtend(options, {uri: uri})
    }

    params.callback = callback
    return params
}

function createXHR(uri, options, callback) {
    options = initParams(uri, options, callback)
    return _createXHR(options)
}

function _createXHR(options) {
    var callback = options.callback
    if(typeof callback === "undefined"){
        throw new Error("callback argument missing")
    }
    callback = once(callback)

    function readystatechange() {
        if (xhr.readyState === 4) {
            loadFunc()
        }
    }

    function getBody() {
        // Chrome with requestType=blob throws errors arround when even testing access to responseText
        var body = undefined

        if (xhr.response) {
            body = xhr.response
        } else if (xhr.responseType === "text" || !xhr.responseType) {
            body = xhr.responseText || xhr.responseXML
        }

        if (isJson) {
            try {
                body = JSON.parse(body)
            } catch (e) {}
        }

        return body
    }

    var failureResponse = {
                body: undefined,
                headers: {},
                statusCode: 0,
                method: method,
                url: uri,
                rawRequest: xhr
            }

    function errorFunc(evt) {
        clearTimeout(timeoutTimer)
        if(!(evt instanceof Error)){
            evt = new Error("" + (evt || "Unknown XMLHttpRequest Error") )
        }
        evt.statusCode = 0
        callback(evt, failureResponse)
    }

    // will load the data & process the response in a special response object
    function loadFunc() {
        if (aborted) return
        var status
        clearTimeout(timeoutTimer)
        if(options.useXDR && xhr.status===undefined) {
            //IE8 CORS GET successful response doesn't have a status field, but body is fine
            status = 200
        } else {
            status = (xhr.status === 1223 ? 204 : xhr.status)
        }
        var response = failureResponse
        var err = null

        if (status !== 0){
            response = {
                body: getBody(),
                statusCode: status,
                method: method,
                headers: {},
                url: uri,
                rawRequest: xhr
            }
            if(xhr.getAllResponseHeaders){ //remember xhr can in fact be XDR for CORS in IE
                response.headers = parseHeaders(xhr.getAllResponseHeaders())
            }
        } else {
            err = new Error("Internal XMLHttpRequest Error")
        }
        callback(err, response, response.body)

    }

    var xhr = options.xhr || null

    if (!xhr) {
        if (options.cors || options.useXDR) {
            xhr = new createXHR.XDomainRequest()
        }else{
            xhr = new createXHR.XMLHttpRequest()
        }
    }

    var key
    var aborted
    var uri = xhr.url = options.uri || options.url
    var method = xhr.method = options.method || "GET"
    var body = options.body || options.data || null
    var headers = xhr.headers = options.headers || {}
    var sync = !!options.sync
    var isJson = false
    var timeoutTimer

    if ("json" in options) {
        isJson = true
        headers["accept"] || headers["Accept"] || (headers["Accept"] = "application/json") //Don't override existing accept header declared by user
        if (method !== "GET" && method !== "HEAD") {
            headers["content-type"] || headers["Content-Type"] || (headers["Content-Type"] = "application/json") //Don't override existing accept header declared by user
            body = JSON.stringify(options.json)
        }
    }

    xhr.onreadystatechange = readystatechange
    xhr.onload = loadFunc
    xhr.onerror = errorFunc
    // IE9 must have onprogress be set to a unique function.
    xhr.onprogress = function () {
        // IE must die
    }
    xhr.ontimeout = errorFunc
    xhr.open(method, uri, !sync, options.username, options.password)
    //has to be after open
    if(!sync) {
        xhr.withCredentials = !!options.withCredentials
    }
    // Cannot set timeout with sync request
    // not setting timeout on the xhr object, because of old webkits etc. not handling that correctly
    // both npm's request and jquery 1.x use this kind of timeout, so this is being consistent
    if (!sync && options.timeout > 0 ) {
        timeoutTimer = setTimeout(function(){
            aborted=true//IE9 may still call readystatechange
            xhr.abort("timeout")
            var e = new Error("XMLHttpRequest timeout")
            e.code = "ETIMEDOUT"
            errorFunc(e)
        }, options.timeout )
    }

    if (xhr.setRequestHeader) {
        for(key in headers){
            if(headers.hasOwnProperty(key)){
                xhr.setRequestHeader(key, headers[key])
            }
        }
    } else if (options.headers && !isEmpty(options.headers)) {
        throw new Error("Headers cannot be set on an XDomainRequest object")
    }

    if ("responseType" in options) {
        xhr.responseType = options.responseType
    }

    if ("beforeSend" in options &&
        typeof options.beforeSend === "function"
    ) {
        options.beforeSend(xhr)
    }

    xhr.send(body)

    return xhr


}

function noop() {}

},{"global/window":8,"is-function":9,"once":10,"parse-headers":11,"xtend":14}],14:[function(require,module,exports){
module.exports = extend

var hasOwnProperty = Object.prototype.hasOwnProperty;

function extend() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (hasOwnProperty.call(source, key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}]},{},[4])(4)
});