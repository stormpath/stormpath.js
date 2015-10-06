/*
 Stormpath.js v0.3.1
 (c) 2014 Stormpath, Inc. http://stormpath.com
 License: Apache 2.0
*/
!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Stormpath=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
'use strict';

var RequestExecutor = _dereq_('./request-executor');
var utils = _dereq_('./utils');
var base64 = utils.base64;

function Client(options,readyCallback){
  var opts = typeof options === 'object' ? options : {};
  var cb = typeof options === 'function' ? options : ( readyCallback || utils.noop);
  var self = this;

  self.jwt = opts.token || self._getToken();
  if(!self.jwt){
    setTimeout(function(){cb(new Error('jwt not found as url query parameter'));},1);
    return;
  }
  try{
    self.jwtPayload = JSON.parse(base64.atob(self.jwt.split('.')[1]));
    self.appHref = self.jwtPayload.app_href;
    self.sptoken = self.jwtPayload.sp_token || null;
    self.baseurl = self.appHref.match('^.+//([^\/]+)\/')[0];
  }catch(e){
    setTimeout(function(){cb(e);},1);
    return;
  }

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

Client.prototype._getToken = function() {
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
},{"./request-executor":3,"./utils":4}],2:[function(_dereq_,module,exports){
module.exports = {
  Client: _dereq_('./client')
};
},{"./client":1}],3:[function(_dereq_,module,exports){
'use strict';

var utils = _dereq_('./utils');

function Request(method,url,options,callback){
  var self = this;
  self.cb = callback;
  self.options = options;
  self.xhr = new XMLHttpRequest();
  self.xhr.onreadystatechange = self.onLoad.bind(self);
  self.xhr.onerror = self.onerror.bind(self);
  self.xhr.open(method,url);
  if(options.withCredentials){
    self.xhr.withCredentials = options.withCredentials;
  }
  self.xhr.setRequestHeader('Authorization', 'Bearer '+self.options.authToken);
  self.xhr.setRequestHeader('Content-Type','application/json');
  self.xhr.send(JSON.stringify(options.body));

  self.done = false;
  return self;
}
Request.prototype.onLoad = function onLoad() {
  var self = this;
  var XHR = XMLHttpRequest;
  var s = self.xhr.readyState;
  if(s === XHR.DONE && !self.done) {
    try{
      var headers = self.responseHeaders = self.getHeadersObject();
      var body = (typeof self.xhr.responseText === 'string' && self.xhr.responseText !== '') ? JSON.parse(self.xhr.responseText) : {};
      var status = self.xhr.status;
      var newToken = ( (headers['Authorization'] || '').match(/Bearer (.*)$/i) || [])[1] || '';
      self.cb(status < 400 ? null : body,
        newToken,
        self,
        status < 400 ? body : null
      );
      self.done = true;
    }catch(e){
      self.cb(e);
    }
  }
};
Request.prototype.onerror = function onerror() {
  var self = this;
  self.done = true;
  self.cb(new Error('Unknown XHR Error'));
};
Request.prototype.getHeadersObject = function getHeadersObject() {
  var self = this;
  var all = self.xhr.getAllResponseHeaders().trim().split('\n');
  return all.reduce(function(acc,str){
    var x = str.split(': ');
    acc[x[0]] = x[1].trim();
    return acc;
  },{});
};

function RequestExecutor(authToken){
  this.authToken = authToken;
  this.terminated = false;
}

RequestExecutor.prototype.execute = function(method,url,options,callback) {
  var self = this;
  if(self.terminated){
    return callback(new Error('Request executor terminated, you must initiate a new flow from the service provider'));
  }
  var opts = typeof options === 'object' ? options : {
    body: null
  };
  opts.authToken = self.authToken;

  var cb = typeof options === 'function' ? options : ( callback || utils.noop);
  var req = new Request(method,url,opts,function onDone(err,newToken,request,body){
    var redirectUrl = request && request.responseHeaders && request.responseHeaders['Stormpath-SSO-Redirect-Location'];
    self.authToken = newToken;
    if(!err && !self.authToken){
      self.terminated = true;
    }
    if(err){
      if(redirectUrl){
        err.redirectUrl = redirectUrl;
      }
      return cb(err);
    }
    if(redirectUrl){
      body.redirectUrl = redirectUrl;
    }
    cb(err,body);
  });
  return req;
};

module.exports = RequestExecutor;
},{"./utils":4}],4:[function(_dereq_,module,exports){
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
  noop: function(){}
};
},{}]},{},[2])
(2)
});