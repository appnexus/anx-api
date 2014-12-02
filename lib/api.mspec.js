var _ = require('lodash');
var assert = require('assert');

var Api = require('./api');

describe('Api', function () {

	describe('request', function () {
		var opts;

		beforeEach(function (done) {
			opts = null;
			var api = new Api({
				target: 'http://example.com',
				userAgent: 'MyAgent',
				request: function (o) {
					opts = o;
					done();
				}
			});
			api.get('');
		});

		it('should use target', function () {
			assert(_.contains(opts.uri, 'http://example.com/'));
		});

		it('should use User-Agent', function () {
			assert.equal(opts.headers['User-Agent'], 'MyAgent');
		});

	});

	describe('#get', function () {
		var opts;

		beforeEach(function (done) {
			opts = null;
			var api = new Api({
				target: 'http://example.com',
				userAgent: 'MyAgent',
				request: function (o) {
					opts = o;
					done();
				}
			});
			api.get('user');
		});

		it('method should be GET', function () {
			assert.equal(opts.method, 'GET');
		});

		it('should use string path', function () {
			assert(_.contains(opts.uri, 'http://example.com/user'));
		});

	});

	describe('#getJson', function () {
		var opts;

		beforeEach(function () {
			opts = null;
			var api = new Api({
				target: 'http://example.com',
				userAgent: 'MyAgent',
			});
			api.get = function (o) { opts = o; };
			api.getJson('user');
		});

		it('should call get', function () {
			assert(!!opts);
		});

		it('should set json to true', function () {
			assert.equal(opts.json, true);
		});

	});

	describe('#post', function () {
		var opts;

		beforeEach(function (done) {
			var api = new Api({
				target: 'http://example.com',
				userAgent: 'MyAgent',
				request: function (o) {
					opts = o;
					done();
				}
			});
			api.post('user', { name: 'MyName' });
		});

		it('method should be POST', function () {
			assert.equal(opts.method, 'POST');
		});

		it('should use string path', function () {
			assert(_.contains(opts.uri, 'http://example.com/user'));
		});

		it('should place the payload into the post body', function () {
			assert.deepEqual(opts.body, { name: 'MyName' });
		});

	});

	describe('#postJson', function () {
		var opts;
		var payload;

		beforeEach(function () {
			opts = null;
			payload = null;
			var api = new Api({
				target: 'http://example.com',
				userAgent: 'MyAgent',
			});
			api.post = function (o, p) { opts = o; payload = p; };
			api.postJson('user', { name: 'MyName' });
		});

		it('should call post', function () {
			assert(!!opts && !!payload);
		});

		it('should set json to true', function () {
			assert.equal(opts.json, true);
		});

	});

	describe('#put', function () {
		var opts;

		beforeEach(function (done) {
			var api = new Api({
				target: 'http://example.com',
				userAgent: 'MyAgent',
				request: function (o) {
					opts = o;
					done();
				}
			});
			api.put('user', { name: 'MyName' });
		});

		it('method should be PUT', function () {
			assert.equal(opts.method, 'PUT');
		});

		it('should use string path', function () {
			assert(_.contains(opts.uri, 'http://example.com/user'));
		});

		it('should place the payload into the put body', function () {
			assert.deepEqual(opts.body, { name: 'MyName' });
		});

	});

	describe('#putJson', function () {
		var opts;
		var payload;

		beforeEach(function () {
			opts = null;
			payload = null;
			var api = new Api({
				target: 'http://example.com',
				userAgent: 'MyAgent',
			});
			api.put = function (o, p) { opts = o; payload = p; };
			api.putJson('user', { name: 'MyName' });
		});

		it('should call put', function () {
			assert(!!opts && !!payload);
		});

		it('should set json to true', function () {
			assert.equal(opts.json, true);
		});

	});

	describe('#statusOk', function () {
		it('should be tested');
	});

	describe('#login', function () {
		it('should be tested');
	});

});
