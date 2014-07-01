var RequestExecutor = require('./request-executor');
var utils = require('./utils');
var base64 = utils.base64;

function Client(options,readyCallback){
  var opts = typeof options === 'object' ? options : {};
  var cb = typeof options === 'function' ? options : ( readyCallback || utils.noop);
  var self = this;
  self.requestExecutor = opts.requestExecutor || new RequestExecutor();
  self.jwt = (window.location.href.match(/jwt=(.+)/) || [])[1];
  if(!self.jwt){
    return cb(new Error('jwt not found as url query parameter'));
  }
  try{
    self.jwtPayload = JSON.parse(base64.decode(self.jwt.split('.')[1]));
    self.appHref = self.jwtPayload.app_href;
    self.sptoken = self.jwtPayload.sp_token || null;
  }catch(e){
    return cb(e);
  }

}

module.exports = Client;