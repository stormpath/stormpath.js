var utils = require('./utils');

function Request(method,url,options,callback){
  var self = this;
  self.cb = callback;
  self.options = options;
  self.xhr = new XMLHttpRequest();
  self.xhr.onreadystatechange = self.onLoad.bind(self);
  self.xhr.open(method,url);
  if(options.withCredentials){
    self.xhr.withCredentials = options.withCredentials;
  }
  self.xhr.send(options.body);
  self.opened = false;
  self.done = false;
  return self;
}
Request.prototype.onLoad = function onLoad() {
  var self = this;
  var XHR = XMLHttpRequest;
  var s = self.xhr.readyState;
  if(s === XHR.OPENED && !self.opened) {
    self.xhr.setRequestHeader('Authorization', 'Bearer '+self.options.authToken);
    self.opened = true;
  }
  if(s === XHR.DONE && !self.done) {
    try{
      self.cb(null,
        ((((self.xhr.getResponseHeader('Authorization') || '')
          .match(/Bearer (.*)$/i)) || [])[1]) || '',
        JSON.parse(self.xhr.responseText)
      );
      self.done = true;
    }catch(e){
      self.cb(e);
    }
  }
};

function RequestExecutor(authToken){
  this.authToken = authToken;
}

RequestExecutor.prototype.execute = function(method,url,options,callback) {
  var self = this;
  var opts = typeof options === 'object' ? options : {
    body: null,
    authToken: self.authToken
  };

  var cb = typeof options === 'function' ? options : ( callback || utils.noop);
  var req = new Request(method,url,opts,function onDone(err,newToken,response){
    self.authToken = newToken;
    cb(err,response);
  });
  return req;
};

module.exports = RequestExecutor;