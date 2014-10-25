var helper = require('../test-helper');
var connectApp = helper.connectApp;
var expressApp = helper.expressApp;
var request = helper.supertest;

var bdmw = require('../../index').middleware;

describe("BidirectionalMiddleware", function (done) {
  var OUT;
  beforeEach (function (done) {
    OUT = [];
    done();
  });

  function initializeApp (app) {
    app.use(new bdmw(
      'a',
      function processRequest (req, res, next) {
        OUT.push('a.setup');
        next();
      },
      function processResponse (req, res, next) {
        OUT.push('a.teardown');
        next();
      }
    ));
    app.use(new bdmw(
      'b',
      function processRequest (req, res, next) {
        OUT.push('b.setup');
        next();
      },
      function processResponse (req, res, next) {
        OUT.push('b.teardown');
        next();
      }
    ));
  }

  function runTestSuite (request) {
    it("Returns a response", function (done) {
      request.get('/')
        .expect(200)
        .expect(/hello world/i)
        .end(done);
    });
    it("Executes all handlers in the correct order", function (done) {
      request.get('/')
        .end(function (err, res) {
          if (err) {
            return done(err);
          }
          OUT.should.eql([
            'a.setup',
            'b.setup',
            'b.teardown',
            'a.teardown'
          ]);
          done();
        });
    });
  }

  describe("Connect", function () {
    before(function (done) {
      initializeApp(connectApp);
      connectApp.use('/', function (req, res, next) {
        return res.end('Hello World!');
      });
      done();
    });

    runTestSuite(request(connectApp));
  });

  describe("Express", function () {
    before(function (done) {
      initializeApp(expressApp);
      expressApp.get('/', function (req, res, next) {
        return res.send('Hello World!');
      });
      done();
    });

    runTestSuite(request(expressApp));
  });
});
