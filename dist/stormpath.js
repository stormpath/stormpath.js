/*
 Stormpath.js v0.2.2
 (c) 2014 Stormpath, Inc. http://stormpath.com
 License: Apache 2.0
*/
!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Stormpath=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
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
  self.requestExecutor = opts.requestExecutor || new RequestExecutor(self.jwt);
  self.requestExecutor.execute(
    'GET',self.appHref + '?expand=idSiteModel',
    function(err,application){
      cb(err, err? null:application.idSiteModel);
    }
  );
}

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
    self.authToken = newToken;
    if(!err && !self.authToken){
      self.terminated = true;
    }
    if(err){
      return cb(err);
    }
    var redirectUrl = request.responseHeaders['Stormpath-SSO-Redirect-Location'];
    if(redirectUrl){
      body.redirectUrl = redirectUrl;
    }
    cb(err,body);
  });
  return req;
};

module.exports = RequestExecutor;
},{"./utils":4}],4:[function(_dereq_,module,exports){
module.exports = {
  base64: _dereq_('base64'),
  noop: function(){}
};
},{"base64":5}],5:[function(_dereq_,module,exports){
;(function () {

  var object = typeof exports != 'undefined' ? exports : this; // #8: web workers
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

  function InvalidCharacterError(message) {
    this.message = message;
  }
  InvalidCharacterError.prototype = new Error;
  InvalidCharacterError.prototype.name = 'InvalidCharacterError';

  // encoder
  // [https://gist.github.com/999166] by [https://github.com/nignag]
  object.btoa || (
  object.btoa = function (input) {
    var str = String(input);
    for (
      // initialize result and counter
      var block, charCode, idx = 0, map = chars, output = '';
      // if the next str index does not exist:
      //   change the mapping table to "="
      //   check if d has no fractional digits
      str.charAt(idx | 0) || (map = '=', idx % 1);
      // "8 - idx % 1 * 8" generates the sequence 2, 4, 6, 8
      output += map.charAt(63 & block >> 8 - idx % 1 * 8)
    ) {
      charCode = str.charCodeAt(idx += 3/4);
      if (charCode > 0xFF) {
        throw new InvalidCharacterError("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
      }
      block = block << 8 | charCode;
    }
    return output;
  });

  // decoder
  // [https://gist.github.com/1020396] by [https://github.com/atk]
  object.atob || (
  object.atob = function (input) {
    var str = String(input).replace(/=+$/, '');
    if (str.length % 4 == 1) {
      throw new InvalidCharacterError("'atob' failed: The string to be decoded is not correctly encoded.");
    }
    for (
      // initialize result and counters
      var bc = 0, bs, buffer, idx = 0, output = '';
      // get next character
      buffer = str.charAt(idx++);
      // character found in table? initialize bit storage and add its ascii value;
      ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
        // and if not first of each 4 characters,
        // convert the first 8 bits to one ascii character
        bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
    ) {
      // try to find character in table (0-63, not found => -1)
      buffer = chars.indexOf(buffer);
    }
    return output;
  });

}());

},{}]},{},[2])
(2)
});