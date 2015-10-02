module.exports = {
  base64: {
    atob: function atob(str){
      return decodeURIComponent(window.atob(str));
    },
    btoa: function btoa(str){
      return window.btoa(encodeURIComponent(str));
    }
  },
  noop: function(){}
};