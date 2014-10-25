/*jshint expr:true */

/**
 * A middleware that wraps a response handler around `res.send` at runtime,
 * to provide bi-directional processing.
 *
 * Middlewares declared in this fashion will follow the standard last-in-first-out
 * execution order seen in most middleware environments; meaning, an implemenation
 * looking like this:
 *
 * ```
 * var Middleware = require('dagwood').middleware;
 * app.use(new Middleware('a'));
 * app.use(new Middleware('b'));
 * ```
 *
 * would run as `a, b` on request, and `b, a` on response.
 *
 * @param  {String}     namespace       The unique name of this middleware, to
 *                                      mark 'wrapped' status with
 * @param  {Function}   requestHandler  A Connect-compatible middleware for
 *                                      processing the request
 * @param  {Function}   responseHandler A Connect-compatible middleware for
 *                                      processing the response
 * @constructor
 * @example
 * var Middleware = require('dagwood').Middleware;
 * var connect = require('connect');
 * var app = connect();
 *
 * app.use(new Middleware(
 *   'example',
 *   function processRequest (req, res, next) {
 *     console.log('processing request...');
 *     next();
 *   },
 *   function processResponse (req, res, next) {
 *     console.log('processing response...');
 *     next();
 *   }));
 *
 * app.use('/', function (req, res, next) {
 *   res.end('Hello World!');
 * });
 */
function BidirectionalMiddleware (namespace, requestHandler, responseHandler) {
  'use strict';

  // Cache a self-reference
  var instance = this;

  // Augment the passed-in namespace to do no harm
  namespace = '_dagwood-' + namespace;

  // Ensure we have at least a conformant request handler to work with;
  // the response handler is optional.
  requestHandler || (requestHandler = function (req, res, next) {next();});

  /**
   * A request processing middleware that wraps res.send with a `responseHandler`
   * @param  {Request}    req  An ExpressJS Request object
   * @param  {Response}   res  An ExpressJS Response object
   * @param  {Function}   next The next middleware in the stack
   * @return {Void}            Calls `next`
   */
  this.processRequest = function (req, res, next) {
    /**
     * Wraps `func` with a call to `processResponse`
     * @param  {String} func The dot-delimited path by which to reference the
     *                       function to wrap
     * @return {Function}    A wrapped function that calls `original` with
     *                       the original args after running the `processResponse middleware`
     */
    function wrap(func) {
      // Ensure that this function is idempotent.
      if ((func[namespace] || {}).isWrapped === true) {
        return func;
      }

      function wrappedFunc () {
        /*jshint validthis:true */

        // close over our arguments at initialization time
        var args = arguments;

        // initialize the namespace on our wrapped function to be saved to
        // and read in later.
        this[namespace] || (this[namespace] = {});

        // make sure we only call processResponse once, even after manipulating res.send
        if (this[namespace].processResponseHasBeenCalled) {
          return func.apply(res, args);
        }
        this[namespace].processResponseHasBeenCalled = true;

        // call processResponse and pass in the original res.send as the `next()` middleware
        instance.processResponse(req, res, function () {
          func.apply(res, args);
        });
      }
      wrappedFunc[namespace] || (wrappedFunc[namespace] = {});
      wrappedFunc[namespace].isWrapped = true;
      return wrappedFunc;
    }

    // Only mangle res.send if we provided a responseHandler to execute
    if (typeof responseHandler === 'function') {
        res.end = wrap(res.end);
    }

    // Finally, let's run our request middleware now that we've injected
    // our response handler
    return requestHandler(req, res, next);
  };

  this.processResponse = responseHandler;

  // The setup middleware is our entry point, so let's return it.
  return this.processRequest;
}

module.exports = {
  middleware: BidirectionalMiddleware
};
