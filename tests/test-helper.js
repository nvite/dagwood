process.env.NODE_ENV = 'test';

var express = require('express');
var connect = require('connect');
var supertest = require('supertest');
var should = require('should');

var expressApp = express();
var connectApp = connect();

module.exports = {
  expressApp: expressApp,
  connectApp: connectApp,
  supertest: supertest
};
