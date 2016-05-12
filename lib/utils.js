'use strict';

var Buffer = require('buffer/').Buffer;

/**
 * @function
 * From: https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding#Solution_.232_.E2.80.93_rewriting_atob()_and_btoa()_using_TypedArrays_and_UTF-8
 */

function b64EncodeUnicode(str) {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
    return String.fromCharCode('0x' + p1);
  }));
}

module.exports = {
  base64: {
    atob: function atob(str){
      return new Buffer(str,'base64').toString();
    },
    btoa: function btoa(str){
      var v = b64EncodeUnicode(str);
      return v;
    }
  },
  noop: function(){}
};