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