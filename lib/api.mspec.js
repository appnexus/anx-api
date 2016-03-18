/* eslint func-names: 0, padded-blocks: 0 */

var _ = require('lodash');
var assert = require('assert');
var Promise = require('es6-promise').Promise;

var Api = require('./api');

describe('Api', function() {

	describe('request', function() {

		describe('config', function() {

			beforeEach(function(done) {
				opts = null;

				var api = new Api({
					target: 'http://example.com',
					token: 'MySessionToken',
					userAgent: 'MyAgent',
					request: function(o) {
						opts = o;
						done();
					},
					beforeRequest: function(reqOpts) {
						reqOpts.body = 'test';
						return reqOpts;
					}
				});
				api.get('');
			});

			it('should use target', function() {
				assert(_.includes(opts.uri, 'http://example.com/'));
			});

			it('should use token', function() {
				assert.equal(opts.headers.Authorization, 'MySessionToken');
			});

			it('should use User-Agent', function() {
				assert.equal(opts.headers['User-Agent'], 'MyAgent');
			});

			it('should use beforeRequest function', function() {
				assert.equal(opts.body, 'test');
			});

			it('should validate config');

		});

		describe('opts', function() {
			var opts;

			beforeEach(function(done) {
				opts = null;
				var api = new Api({
					target: 'http://example.com',
					request: function(o) {
						opts = o;
						done();
					}
				});
				api.get({
					uri: 'user',
					startElement: 100,
					numElements: 25,
					params: {
						myParam: 'value',
						myStdArray: [
							1,
							2,
							3
						],
						myObjArray: [{
							a: 'apple'
						}, {
							b: 'bee'
						}]
					}
				});
			});

			it('uri should contain start_element', function() {
				assert(_.includes(opts.uri, 'start_element=100'));
			});

			it('uri should contain num_elements', function() {
				assert(_.includes(opts.uri, 'num_elements=25'));
			});

			it('uri should contain params', function() {
				assert(_.includes(opts.uri, 'myParam=value'));
			});

			it('uri should convert standard nested array params', function() {
				assert(_.includes(opts.uri, 'myStdArray[0]=1&myStdArray[1]=2&myStdArray[2]=3'));
			});

			it('uri should convert nested object array params', function() {
				assert(_.includes(opts.uri, 'myObjArray[0][a]=apple&myObjArray[1][b]=bee'));
			});

			describe('validation', function() {
				var api;
				var reqOpts;

				beforeEach(function() {
					api = new Api({
						target: 'http://example.com',
						request: function(o) {
							reqOpts = o;
							return {
								then: function(callback) {
									callback({});
								}
							};
						}
					});
				});

				function expectValidationError(errOpts, expected, done) {
					api.request(errOpts).then(function() {
						done(new Error('Expected error: ' + expected));
					}).catch(function(err) {
						if (err.message !== expected) {
							return done(new Error('Unexpected error message: ' + err.message + ' Expected: ' + expected));
						}
						return done();
					});
				}

				_.each({
					uri: [
						{ value: 'creative' },
						{ value: null },
						{ value: undefined }
					],
					startElement: [
						{ value: null },
						{ value: undefined },
						{ value: 0 },
						{ value: 1.1, message: 'invalid startElement: 1.1' },
						{ value: '', message: 'invalid startElement: ' },
						{ value: 5, uriContains: 'start_element=5' },
						{ value: '10', uriContains: 'start_element=10' },
						{ value: 'ZZZ', message: 'invalid startElement: ZZZ' }
					],
					numElements: [
						{ value: null },
						{ value: undefined },
						{ value: 0 },
						{ value: 1.1, message: 'invalid numElements: 1.1' },
						{ value: '', message: 'invalid numElements: ' },
						{ value: 5, uriContains: 'num_elements=5' },
						{ value: '10', uriContains: 'num_elements=10' },
						{ value: 'ZZZ', message: 'invalid numElements: ZZZ' }
					]
				}, function(tests, param) {
					describe(param, function() {
						tests.forEach(function(test) {
							var newOpts = {};
							if (param !== 'uri') {
								newOpts.uri = '/user';
							}
							newOpts[param] = test.value;
							if (test.message) {
								it(param + ' should not accept ' + test.value, function(done) {
									expectValidationError(newOpts, test.message, done);
								});
							} else {
								it(param + ' should accept ' + test.value, function(done) {
									api.request(newOpts).then(function() {
										if (test.uriContains) {
											assert(_.includes(reqOpts.uri, test.uriContains), 'Url (' + reqOpts.uri + ') did not contain: ' + test.uriContains);
										}
										done();
									}).catch(function(err) {
										done(err);
									});
								});
							}
						});
					});
				});

			});

			describe('Errors', function() {

				describe('NotAuthenticatedError', function() {
					var api;

					beforeEach(function() {
						api = new Api({
							target: 'http://example.com',
							userAgent: 'MyAgent',
							request: function() {
								return {
									then: function(callback) {
										callback({
											statusCode: 401
										});
									}
								};
							}
						});
					});

					it('should reject with NotAuthenticatedError', function(done) {
						api.getJson('user').then(function() {
							return done(new Error('Did not catch 401'));
						}).catch(function(err) {
							if (!(err instanceof Api.NotAuthenticatedError)) {
								return done(new Error('Did not catch NotAuthenticatedError'));
							}
							done();
						});
					});

				});

			});

		});

	});

	describe('#request', function() {
		it('should be tested');
	});

	describe('#requestJson', function() {
		it('should be tested');
	});

	describe('#get', function() {
		var opts;

		beforeEach(function(done) {
			opts = null;
			var api = new Api({
				target: 'http://example.com',
				request: function(o) {
					opts = o;
					done();
				}
			});
			api.get('user');
		});

		it('method should be GET', function() {
			assert.equal(opts.method, 'GET');
		});

		it('should use string path', function() {
			assert(_.includes(opts.uri, 'http://example.com/user'));
		});

	});

	describe('#getJson', function() {
		var opts;

		beforeEach(function() {
			opts = null;
			var api = new Api({
				target: 'http://example.com',
				userAgent: 'MyAgent'
			});
			api.get = function(o) { opts = o; };
			api.getJson('user');
		});

		it('should call get', function() {
			assert(!!opts);
		});

		it('should set json to true', function() {
			assert.equal(opts.json, true);
		});

	});

	describe('#post', function() {
		var opts;

		beforeEach(function(done) {
			var api = new Api({
				target: 'http://example.com',
				request: function(o) {
					opts = o;
					done();
				}
			});
			api.post('user', { name: 'MyName' });
		});

		it('method should be POST', function() {
			assert.equal(opts.method, 'POST');
		});

		it('should use string path', function() {
			assert(_.includes(opts.uri, 'http://example.com/user'));
		});

		it('should place the payload into the post body', function() {
			assert.deepEqual(opts.body, { name: 'MyName' });
		});

	});

	describe('#postJson', function() {
		var opts;
		var payload;

		beforeEach(function() {
			opts = null;
			payload = null;
			var api = new Api({
				target: 'http://example.com'
			});
			api.post = function(o, p) { opts = o; payload = p; };
			api.postJson('user', { name: 'MyName' });
		});

		it('should call post', function() {
			assert(!!opts && !!payload);
		});

		it('should set json to true', function() {
			assert.equal(opts.json, true);
		});

	});

	describe('#put', function() {
		var opts;

		beforeEach(function(done) {
			var api = new Api({
				target: 'http://example.com',
				request: function(o) {
					opts = o;
					done();
				}
			});
			api.put('user', { name: 'MyName' });
		});

		it('method should be PUT', function() {
			assert.equal(opts.method, 'PUT');
		});

		it('should use string path', function() {
			assert(_.includes(opts.uri, 'http://example.com/user'));
		});

		it('should place the payload into the put body', function() {
			assert.deepEqual(opts.body, { name: 'MyName' });
		});

	});

	describe('#putJson', function() {
		var opts;
		var payload;

		beforeEach(function() {
			opts = null;
			payload = null;
			var api = new Api({
				target: 'http://example.com'
			});
			api.put = function(o, p) { opts = o; payload = p; };
			api.putJson('user', { name: 'MyName' });
		});

		it('should call put', function() {
			assert(!!opts && !!payload);
		});

		it('should set json to true', function() {
			assert.equal(opts.json, true);
		});

	});

	describe('#delete', function() {
		var opts;

		beforeEach(function(done) {
			var api = new Api({
				target: 'http://example.com',
				request: function(o) {
					opts = o;
					done();
				}
			});
			api.delete('user?id=1');
		});

		it('method should be DELETE', function() {
			assert.equal(opts.method, 'DELETE');
		});

		it('should use string path', function() {
			assert(_.includes(opts.uri, 'http://example.com/user'));
		});

	});

	describe('#deleteJson', function() {
		var opts;

		beforeEach(function() {
			opts = null;
			var api = new Api({
				target: 'http://example.com'
			});
			api.delete = function(o) { opts = o; };
			api.deleteJson('user?id=1');
		});

		it('should call delete', function() {
			assert(!!opts);
		});

		it('should set json to true', function() {
			assert.equal(opts.json, true);
		});

	});

	describe('#statusOk', function() {
		it('should return true when status is OK', function() {
			assert.equal(Api.statusOk({ response: { status: 'OK' } }), true);
		});

		it('should return false when status is not OK', function() {
			assert.equal(Api.statusOk({ response: { status: '' } }), false);
		});

		it('should return false with no status field', function() {
			assert.equal(Api.statusOk({ response: {} }), false);
		});

		it('should return false with no response field', function() {
			assert.equal(Api.statusOk({}), false);
		});
	});

	describe('#login', function() {
		function buildApi(responseData) {
			var api = new Api({
				// target: 'http://example.com',
				target: 'https://sand.api.appnexus.com',
				userAgent: 'MyAgent',
				request: function() {
					return new Promise(function(resolve) {
						resolve(responseData);
					});
				}
			});
			return api;
		}

		it('should reject with NotAuthenticatedError if status is not ok', function() {
			var api = buildApi({
				statusCode: 200, // 200 instead of 401 because thats what the service responds with
				body: {
					response: {
						error_id: 'UNAUTH',
						error: 'No match found for user/pass',
						error_description: null,
						service: null,
						method: null,
						error_code: null
					}
				}
			});
			return api.login('test_user', 'bad_password')
			.then(function() {
				throw new Error('Did not catch Login Error');
			})
			.catch(function(err) {
				// API treats bad apssword as Authentication instead of Authorization Error.
				// assert(err instanceof Api.NotAuthenticatedError, 'Api.NotAuthenticatedError');
				assert(err instanceof Api.NotAuthorizedError, 'Api.NotAuthorizedError');

				assert.equal('UNAUTH', err.id);
				assert.equal('No match found for user/pass', err.message);
			});
		});

		it('should login give api auth token', function() {
			var api = buildApi({
				statusCode: 200,
				body: {
					response: {
						status: 'OK',
						token: 'hbapi:10340:55ba41134f752:lax1'
					}
				}
			});
			return api.login('test_user', 'test_password')
			.then(function(token) {
				assert.equal('hbapi:10340:55ba41134f752:lax1', token);
			});
		});
	});

	describe('#switchUser', function() {
		it('should be tested');
	});

});
