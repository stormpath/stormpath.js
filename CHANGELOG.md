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