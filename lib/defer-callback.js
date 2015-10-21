'use strict';

/**
 * Defers the calling of the callback until the next run of
 * the event loop.  Do then when the callee is expecting
 * the callback to be called after the current event loop
 * is done processing (aka Angular's digest scheme)
 *
 * @function
 * @param  {function} cb - The callback to call at a later time
 * @return {array} - args - The array of arguments to apply to the callback
 */
function deferCallback (cb,args) {
  setTimeout(function () {
    cb.apply(null,args);
  },1);
}

module.exports = deferCallback;