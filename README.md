# Stormpath.js

A browser-ready javascript library for Stormpath.  Use this library if you are building your own ID Site from scratch.
Additional features may be added in the future.

### Installation

You may load this library from our CDN, by including this URL on your page:

````html
<script type="text/javascript" src="http://cdn.stormpath.com/stormpath.min.js"></script>
````

You may also use bower:

````bash
bower install stormpath-js
````

You can also clone this repo, and copy the `stormpath.min.js` or `stormpath.js` to your project environment.


### Initialization

To initialize a stormpath Client which will be used for all API communication, simply create a new instance and pass a callback function:

````javascript
$(document).ready(function(){
  var client = new Stormpath.Client(function readyCallback(err,idSiteModel){
    // see below
  });
})
````

In order to use Stormpath.js, your application must be part of a Service-Provider initiated flow.
The client assumes this is true, and searches the browser's URL for the appropriate secure token
which is needed to initialize the client (currently implemented as a JWT)

### On ready callback

After the client has finished initializing, it will call your `readyCallback`.

````javascript

function readyCallback(err,idSiteModel){
  if(err){
    // The JWT is not valid, show err.userMessage to the user
  }else{
    // The client is ready, and you can now use it's methods
    // to build your ID site, per the idSiteModel
  }

}
````

### ID Site model

The site model has all the information that you need to build your ID Site, it tells you:

* The password strength policies, `passwordPolicy`.
If the passwordPolicy is null, it means that new accounts are not permitted for the target account store.
* The social providers that are configured, `providers`.  This in array, and the ordering is controlled by account store prioritization.
* The URL to the logo image

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
      // credentials are invalid, show err.userMessage to the user
    }
    else{
      // login was successful, send the user to the redirectUri
      document.location = result.redirectUri;
    }
  }
);
````

### Login a user (Google or Facebook)

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
      // credentials are invalid, show err.userMessage to the user
    }
    else{
      // login was successful, send the user to the redirectUri
      document.location = result.redirectUri;
    }
  }
);
````

### Register a new user

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
    if(result.verified){
      // email verification workflow is NOT enabled for this account store,
      // send the user to result.redirectUri
    }else if(result.created){
      // tell the user to check their email for a verification link
    }
  }
)
````

### Verify a new account

If your account store requires email verification for new accounts we will
send the user an email with a link.  When they click on this link they will
arrive at your application with a token in the URL.  The `client` will
automatically fetch this token from the URL.  You should then call
`verifyEmailToken`, which will verify the integrity of this token:

````javascript
client.verifyEmailToken(function(err,account){
  if(err){
    // token is invalid, expired, or already used.
    // show err.userMessage to user
  }else{
    // token is valid, now prompt the user to login
  }
})
````

### Send a password reset email

Collect the user's username/email, then call `sendPasswordResetEmail`:

````javascript
client.sendPasswordResetEmail(email,function(err,result){
  if(err){
    // email is invalid, show err.userMessage to user
  }else{
    // tell user to check their email for a link
  }
})
````

### Verify a password reset token

If the user has clicked on the password reset link that we sent them,
the `client` will automatically fetch the password reset token from the URL.
You should then call `verifyPasswordResetToken` to verify the token with Stormpath's API:

````javascript
client.verifyPasswordToken(function(err,pwTokenVerification){
  if(err){
    // token is invalid, expired, or already used.
    // show err.userMessage to user
  }else{
    // prompt the user for a new password, then
    // call setNewPassword
  }
})
````

### Set a new password

After verifying the password reset token and receiving a `pwTokenVerification`,
collect a new password and pass it with the verification to `setNewPassword`.

**NOTE**: You may only make one setPassword request per session.  You must
use client-side validation to parse the `passwordPolicy` and proactively
warn the user that their password is not correct, before you invoke this
method


````javascript

client.setNewPassword(pwTokenVerification,newPassword,function(err,result){
  if(err){
    // password strength rules were not met
  }else{
    // success, now prompt the user to login
  }
});
````