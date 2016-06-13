## 0.7.0

* Registration attempts now post to the Organization, if an Organization is
specified when the user is redirected to ID Site.  Previously they were posted
to the Application's endpoint.

 **Known Bug**: In this version, the end user cannot recover from the duplicate
 account error.  This is an issue with the Stormpath REST API and a fix will be
 released soon.

* This version also properly surfaces 403 errors from the Stormpath REST API.

## 0.6.2

* Fixed a problem in the client constructor that would cause an exception in
`getJwtFromUrl()`.  The error occurred because we were expecting all application
URLs to be on api.stormpath.com.  This was preventing Enterprise and Private
Deployment tenants from using the 0.6.x series.

## 0.6.1

* Reverted the changes from 0.5.2, that used `getResponseHeader()` instead of
`getAllResponseHeaders()`.  This caused "Refused to get unsafe header" errors to
be logged.  These errors did not break application behavior, but did introduce
a source of confusion.  This revert means that Firefox < 22 will not be
compatible with this library.

* This library now uses the [Buffer module](https://github.com/feross/buffer)
for Base64-URL decoding, and should be more robust with JWTs that contain
Unicode characters and string-encoded JSON values.

* Fixed a bug with the password reset flow that was introduced by 0.6.0.  When
arriving on the #/reset?jwt=<jwt> URL, you would be directed to #/ and not shown
the reset password form.

## 0.6.0

The Id Site Request Executor will now pull the initial JWT from the URL and
store it in a cookie.  Subsequent JWTs, obtained during API interaction, will be
stored in the cookie.  This allows the end-user to reload the page without
breaking the authenticated session.

If using this library with Angular, you should use Angular >= 1.2.29, as
previous versions may have a digest error when stormpath.js removes the JWT from
the window location.

## 0.5.2

The request executor now uses `xmlHttpRequest.getResponseHeader()` as a fallback
for `xmlHttpRequest.getAllResponseHeaders()`.  This adds support for Firefox < 21,
and any other browser that does not give cross-origin headers when
`xmlHttpRequest.getAllResponseHeaders()` is used.

## 0.5.1

Re-release of 0.5.0, with `dist/` files update in this release.

## 0.5.0

Support Organization features by requesting the ID Site Model from the provided
account store.


## 0.4.0

**Released on October 23rd, 2015**

* Refactoring the internal request executor to supply contextual error messages
* Fixing https://github.com/stormpath/idsite-src/issues/2 by not sending cookies
  on requests to the API

**Breaking Changes**

* `client._getToken()` has been renamed to `client.getJwtFromUrl()`
* The value `response.redirectUrl` has been renamed to `response.serviceProviderCallbackUrl`.  This affects the callbacks for `client.login()` and `client.register()`


## 0.3.1

Fixing the base64 encoding strategy, unicode characters are now supported.


## 0.3.0

Adding support for Organizations


## 0.2.0

Support for Single-Sign-On (SSO)


## 0.1.0

First release!  This release includes all the methods that you need to
build your own ID Site