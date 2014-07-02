var RequestExecutor = require('./request-executor');
var utils = require('./utils');
var base64 = utils.base64;

function Client(options,readyCallback){
  var opts = typeof options === 'object' ? options : {};
  var cb = typeof options === 'function' ? options : ( readyCallback || utils.noop);
  var self = this;

  self.jwt = opts.jwt || (window.location.href.match(/jwt=(.+)/) || [])[1];
  if(!self.jwt){
    return cb(new Error('jwt not found as url query parameter'));
  }
  try{
    self.jwtPayload = JSON.parse(base64.atob(self.jwt.split('.')[1]));
    self.appHref = self.jwtPayload.app_href;
    self.sptoken = self.jwtPayload.sp_token || null;
  }catch(e){
    return cb(e);
  }
  self.requestExecutor = opts.requestExecutor || new RequestExecutor(self.jwt);
  self.requestExecutor.execute(
    'GET',self.appHref + '?expand=idSiteModel',
    function(err,application){
      cb(err, err? null:application.idSiteModel);
    }
  );
}

Client.prototype.login = function login(credentials,callback) {
  var self = this;
  if(!credentials){
    callback(new Error('must provide an object'));
  }else if(credentials.providerData){
    // todo
  }else if(credentials.login){
    var data = {
      type: 'basic',
      value: utils.base64.btoa(credentials.login + ':' + credentials.password)
    };
    self.requestExecutor.execute(
      'POST',self.appHref+'/loginAttempts',
      {
        body: data
      },
      callback
    );
  }else{
    callback(new Error('unsupported credentials object'));
  }

};

module.exports = Client;