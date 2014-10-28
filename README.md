Dagwood
=======

Create bi-directional middleware for more delicious routes.

[![Build status on Travis-CI](https://travis-ci.org/nvite/dagwood.svg)](https://travis-ci.org/nvite/dagwood) [![Deps status on David](https://david-dm.org/nvite/dagwood.png)](https://david-dm.org/nvite/dagwood)

## The problem

Connect middleware is great--it feels a lot like coding against Rack or WSGI
and makes building node apps fun! But there's a major difference between Ruby
or Python and Node--*that whole async thing*.

Consider an example:

```ruby
class MyRackMiddleware
  def initialize(app)
    @app = app
  end

  def call(env)
    do_stuff_before_a_slow_downstream_handler
    @app.call(env)
    do_stuff_after
  end
```

Even though our downstream call may not return instantly, all is good, our 3 steps run in order.

In node, however:

```javascript
function MyConnectMiddleware (req, res, next) {
  doStuffBeforeASlowDownstreamHandler();
  next();
  doStuffAfter();
}
```

We have no guarantee of the order in which things ran, and `next` affords us no
promise to help keep things in sync. It's pretty likely, in fact, that `doStuffAfter`
will run before we get anywhere into the meat of our route.

What's worse, `res.send`/`res.end` stop the middleware stack in its tracks and write
back to the browser, so you've got to do horrible things to even the most trivially
complex controllers to get any code reuse where postprocessing is concerned.

## Let Dagwood do those horrible things for you

Dagwood *sandwiches* your routes by decorating `res.[s]end` to call a response handler
prior to closing out. This can be stacked to arbitrary depths and follows LIFO on the response
side.

Here's an example:

```javascript
var BidirectionalMiddleware = require('dagwood').middleware;

var myMiddleware = new BidirectionalMiddleware('myMiddleware',
  function processRequest  (req, res, next) { console.log('Hi!'); },
  function processResponse (req, res, next) { console.log('Bye!');});

var app = require('express')();
app.use(myMiddleware);
app.get('/', function (req, res, next) {
    console.log('Nice to see you!');
    res.send(200);
});
```

If you run this server and hit `/`, you'll see the following in your console:

```
Hi!
Nice to see you!
Bye!
```

## Usage

`app.use(new middleware(name, requestHandler, responseHandler))`

| Param | Required? | Description |
|:------|:----------|:------------|
|`name` | **yes**   | A unique name for this middleware. This is required to enable idempotence in function wrapping and calling to keep things sane. Internally, the `name` will be expanded into a namespace on `res.[s]end` that will hold some state. |
|`requestHandler` | **yes** | A middleware function with the signature `(req, res, next)`. This will run at the insertion point and behaves like traditional connect middleware. Behind the scenes it will set up the response handler if provided. |
|`responseHandler`| no | A middleware function with the signature `(req, res, next)`. This will run right before res.send is called, after your route code has executed. The first `requestHandler` applied is the last `responseHandler` to run. |

## Scary words of warning and certain doom

This is alpha software so take it with all of the appropriate grains of salt. But also there are
some specific things to keep in mind:

1. **If your route throws an error, the `responseHandler` won't run.**

    Don't do really important transactional stuff here. If your use case can deal
    with the server/state being thrown away, this may suit it.

2. **You can't manipulate the response by reference after calling `res.send`.**

    At least not yet. Right now the original arguments to res.send are cached
    at call-time, so the response text you pass to res.send is what gets written no matter
    how you change the response's internal state. Headers, on the other hand, are a
    different story.
