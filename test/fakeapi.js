'use strict';

// the url where the karma tests are running
var originUrl = 'http://localhost:8090';

function fakeApiHandler(req,res) {

  res.setHeader('Access-Control-Allow-Origin',originUrl);
  res.setHeader('Access-Control-Allow-Headers','Accept, Authorization, Content-Type');
  if(req.method==='OPTIONS'){
    res.statusCode = 204;
    res.end();
  }
  else if (req.url === '/v1/applications/1234?expand=idSiteModel'){
    res.setHeader('Access-Control-Expose-Headers','Authorization');
    res.setHeader('Content-Type','application/json');
    res.setHeader('Authorization','Bearer 1234');
    res.end(JSON.stringify(require('./data/idSiteResponse.json')));
  }else if (req.method==='POST'){
    (function(req){
      var body;
      req.on('data', function (data) {
        body += data;
      });
      req.on('end', function () {
        if(req.url === '/v1/applications/1234/loginAttempts'){
          if(body.match(/Z29vZDpnb29k/)){ // credentials good:good
            res.statusCode = 204;
            res.setHeader('Access-Control-Expose-Headers','Stormpath-SSO-Redirect-Location');
            res.setHeader('Stormpath-SSO-Redirect-Location','the-place-to-go');
            res.end();
          }else{
            res.statusCode = 400;
            res.setHeader('Access-Control-Expose-Headers','Authorization');
            res.setHeader('Authorization','Bearer 1234');
            res.setHeader('Content-Type','application/json');
            res.end(JSON.stringify(require('./data/badLoginResponse.json')));
          }
        }else if(req.url === '/v1/applications/1234/accounts'){
          if(body.match(/verification-enabled/)){
            res.statusCode = 202;
          }else{
            res.setHeader('Access-Control-Expose-Headers','Stormpath-SSO-Redirect-Location');
            res.setHeader('Stormpath-SSO-Redirect-Location','the-place-to-go');
            res.statusCode = 204;
          }
          res.end();
        }else{
          res.statusCode = 404;
          res.end('not found');
        }

      });
    })(req);
  }else{
    res.statusCode = 404;
    res.end('not found');
  }

}

module.exports = [fakeApiHandler];