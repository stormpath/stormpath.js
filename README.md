# Stormpath.js - BETA

A browser-ready javascript library for use with Stormpath features.  Use this library if you are building your own ID Site from scratch.
Additional features may be added in the future.


### Usage

In order to use Stormpath.js, your application must be part of a Service-Provider initiated flow.
The client assumes this is true and searches the browser's URL for the secure token
which is needed to initialize the client.

For more information please read [Using Stormpath's ID Site to Host your User Management UI](http://docs.stormpath.com/guides/using-id-site)

### Installation

You may clone this repo and use the `stormpath.min.js` or `stormpath.js` files from the `dist/` folder
by including them in your application with a script tag:

````html
<script type="text/javascript" src="stormpath.min.js"></script>
````

This library is also available as a bower package:

````bash
bower install stormpath.js
````

You may also install this module via NPM and require it in your [Browerified](http://browserify.org) application:

````bash
npm install stormpath.js
````

In the near future we will provide this library through our CDN.


### Initialization

To initialize a Stormpath Client which will be used for all API communication, simply create a new instance and pass a callback function:

````javascript
$(document).ready(function(){
  var client = new Stormpath.Client(function readyCallback(err,idSiteModel){
    if(err){
      // The secure token is missing or not valid, show err.message to the user
    }else{
      // The client is ready, and you can now use it's methods
      // to build your ID site, per the idSiteModel
    }
  });
})
````

### ID Site model

The site model has all the information that you need to build your ID Site, it tells you:

* `passwordPolicy`, an object, which provides the password strength policies for the account store which new accounts will be created in.
If null, new accounts are not permitted for the target account store or the store is a social provider store.
* `providers`, which provides your social provider configuration as an array of objects, ordered by account store prioritization.
* `logoUrl`, the URL to the logo image

All of these options can be configured in your Stormpath Admin Console.

Example site model:

````javascript
{
  "href": "https://api.stormpath.com/v1/applications/Uu87kmhxwEcnjmhxwFuzwF/idSiteModel",
  "providers": [
    {
      "providerId": "facebook",
      "clientId": "718312098209831"
    },
    {
      "providerId": "google",
      "clientId": "489886489864-bm1m1kd1dbdo1kd1h4phhr6aohhr6933.apps.googleusercontent.com"
    },
  ],
  "passwordPolicy": {
    "minLength": 8,
    "maxLength": 20,
    "requireLowerCase": true,
    "requireUpperCase": true,
    "requireNumeric": true,
    "requireDiacritical": false,
    "requireSymbol": false
  },
  "logoUrl": "http://mycdn.fastinternet.com/images/logo.png"
}
````

### Login a user (username and password)

To login an existing user, collect their username/email and password, then make a call to `login`
and provide a callback:

````javascript
client.login(
  {
    login: usernameOrEmail,
    password: submittedPassword
  },
  function loginCallback(err,result){
    if(err){
      // credentials are invalid, show err.message to the user
    }else{
      // login was successful, send the user to the redirectUrl
      window.location.replace(result.redirectUrl);
    }
  }
);
````

### Login/register a user (Google or Facebook)

Use the Facebook or Google Javascript Library to prompt the user for login, then pass
the token they provide to the `login` method using the `providerData` object:

````javascript
client.login(
  {
    providerData: {
      providerId: 'facebook',
      accessToken: 'token-from-facebook-login'
    }
  },
  function loginCallback(err,result){
    if(err){
      // an error with the provider, show err.message to the user
    }else{
      // login was successful, send the user to the redirectUrl
      window.location.replace(result.redirectUrl);
    }
  }
);
````

### Register a new user (username & password)

If the target account store will allow new accounts, you can collect the necessary information
from the user and supply it to the `register` method:

````javascript
client.register(
  {
    surname: "Smith",
    givenName: "Joe",
    email: 'me@gmail.com',
    password: 'hackerztheplanet'
  },
  function registerCallback(err,result){
    if(result.redirectUrl){
      // You will be given the redirectUrl if the email verification workflow is
      // NOT enabled for this account store, in which case the user can now
      // continue to the redirectUrl
      window.location.replace(result.redirectUrl);
    }else{
      // tell the user to check their email for a verification link
      alert('Please check your email for a verification link.');
    }
  }
)
````

### Verify a new account

If your account store requires email verification for new accounts we will
send the user an email with a verification link.  When they click on this link they will
arrive at your application with a special token in the URL.  You should then call
`verifyEmailToken` to verify the token with Stormpath:

````javascript
client.verifyEmailToken(function(err){
  if(err){
    // token is invalid, expired, or already used.
    // show err.message to user
  }else{
    // token is valid, now prompt the user to login
  }
})
````

### Send a password reset email

Collect the user's username or email, then call `sendPasswordResetEmail`:

````javascript
client.sendPasswordResetEmail(email,function(err){
  if(err){
    // email is invalid, show err.message to user
  }else{
    // tell user to check their email for a link
  }
})
````

### Verify a password reset token

If the user has clicked on the password reset link that we sent them, they will
arrive ay your application with a special token in the URL.
You should then call `verifyPasswordResetToken` to verify the token with Stormpath:

````javascript
client.verifyPasswordToken(function(err,pwTokenVerification){
  if(err){
    // token is invalid, expired, or already used.
    // show err.message to user
  }else{
    // prompt the user for a new password, then
    // call setAccountPassword
  }
})
````

### Set a new password

After verifying the password reset token and receiving a `pwTokenVerification`,
collect a new password from the user and pass it with the verification
to `setAccountPassword`.

**NOTE**: Only one call per session is allowed for this method.  You ***must***
use client-side verification to proactively warn the user that their password will not match
the password policy rules that are defined in the `idSiteModel` (see above).


````javascript

client.setAccountPassword(pwTokenVerification,newPassword,function(err,result){
  if(err){
    // password strength rules were not met
  }else{
    // success, now prompt the user to login
  }
});
````

# Contributing

We regularly maintain our GitHub repostiory, and are quick about reviewing pull requests and accepting changes!

Please see the [Contributing Readme](CONTRIBUTING.md) for detailed information on the development and contribution workflow.