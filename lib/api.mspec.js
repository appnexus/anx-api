var _ = require('lodash');
var assert = require('assert');

var Api = require('./api');

describe('Api', function () {

	describe('request', function () {
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

});
