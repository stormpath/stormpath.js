'use strict';

var utils = require('./utils');

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