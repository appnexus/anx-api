/* eslint func-names: 0, padded-blocks: 0 */

var _ = require('lodash');
var sinon = require('sinon');
var assert = require('assert');
var Promise = require('es6-promise').Promise;

var Api = require('./api');

describe('Api', function() {

	describe('request', function() {

		describe('config', function() {
			var opts;
			var res;

			describe('with valid config', function() {

				beforeEach(function(done) {
					opts = null;
					res = null;

					var api = new Api({
						target: 'http://example.com',
						token: 'MySessionToken',
						userAgent: 'MyAgent',
						rateLimiting: false,
						request: function(o) {
							opts = o;
							return Promise.resolve({ testKey: 'testValue' });
						},
						beforeRequest: function(reqOpts) {
							return _.assign({}, reqOpts, { body: 'test' });
						},
						afterRequest: function(reqRes) {
							return _.assign({}, reqRes, { afterRequest: 'value' });
						}
					});

					api.get('/user').then(function(reqRes) {
						res = reqRes;
						done();
					});
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

				it('should use afterRequest function', function() {
					assert.deepEqual(res.afterRequest, 'value');
				});

				it('should default request timeout', function() {
					assert.equal(opts.timeout, 60000);
				});

			});

			describe('with invalid config', function() {

				it('should throw on missing target', function(done) {
					var api = new Api({});

					api.get('/user').catch(function(err) {
						assert(err instanceof Api.TargetError);
						done();
					});
				});

			});

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
					timeout: 5000,
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

			it('should default request timeout', function() {
				assert.equal(opts.timeout, 5000);
			});

			describe('validation', function() {
				var api;
				var reqOpts;

				beforeEach(function() {
					api = new Api({
						target: 'http://example.com',
						rateLimiting: false,
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
						assert(err instanceof Api.ArgumentError);
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
						{ value: 1.1, message: 'Invalid startElement' },
						{ value: '', message: 'Invalid startElement' },
						{ value: 5, uriContains: 'start_element=5' },
						{ value: '10', uriContains: 'start_element=10' },
						{ value: 'ZZZ', message: 'Invalid startElement' }
					],
					numElements: [
						{ value: null },
						{ value: undefined },
						{ value: 0 },
						{ value: 1.1, message: 'Invalid numElements' },
						{ value: '', message: 'Invalid numElements' },
						{ value: 5, uriContains: 'num_elements=5' },
						{ value: '10', uriContains: 'num_elements=10' },
						{ value: 'ZZZ', message: 'Invalid numElements' }
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
							rateLimiting: false,
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
						api.get('user').then(function() {
							return done(new Error('Did not catch 401'));
						}).catch(function(err) {
							if (!(err instanceof Api.NotAuthenticatedError)) {
								return done(new Error('Did not catch NotAuthenticatedError'));
							}
							return done();
						});
					});

				});

			});

		});

	});

	describe('#request', function() {

		describe('opts.headers', function() {
			var api;

			beforeEach(function() {
				api = new Api({
					target: 'http://example.com',
					request: function(opts) {
						return Promise.resolve(opts);
					}
				});
			});

			describe('json default', function() {

				it('should set up GET request for json', function(done) {
					api.request({}).then(function(opts) {
						assert.equal(opts.headers.Accept, 'application/json', 'bad or missing Accept');
						assert(!opts.headers['Content-Type'], 'Content-Type should not be set');
						done();
					}).catch(done);
				});

				it('should set up POST request for json', function(done) {
					api.request({ method: 'POST' }).then(function(opts) {
						assert.equal(opts.headers.Accept, 'application/json', 'bad or missing Accept');
						assert.equal(opts.headers['Content-Type'], 'application/json', 'bad or missing Content-Type');
						done();
					}).catch(done);
				});

				it('should set up PUT request for json', function(done) {
					api.request({ method: 'PUT' }).then(function(opts) {
						assert.equal(opts.headers.Accept, 'application/json', 'bad or missing Accept');
						assert.equal(opts.headers['Content-Type'], 'application/json', 'bad or missing Content-Type');
						done();
					}).catch(done);
				});

				describe('header overrides', function() {
					it('should allow overrideing Accept', function(done) {
						api.request({ method: 'DELETE' }).then(function(opts) {
							assert.equal(opts.headers.Accept, 'application/json', 'bad or missing Accept');
							assert(!opts.headers['Content-Type'], 'Content-Type should not be set');
							done();
						}).catch(done);
					});
				});

			});

			it('should allow overriding json accept type', function(done) {
				api.request({ method: 'POST', headers: { Accept: 'text/csv', 'Content-Type': 'text/csv' }}).then(function(opts) {
					assert.equal(opts.headers.Accept, 'text/csv', 'bad or missing Accept');
					assert.equal(opts.headers['Content-Type'], 'text/csv', 'bad or missing Content-Type');
					done();
				}).catch(done);
			});

			it('should allow setting Accept and Content-Type with mimeType option', function(done) {

				api.request({ method: 'POST', mimeType: 'text/csv' }).then(function(opts) {
					assert.equal(opts.headers.Accept, 'text/csv', 'bad or missing Accept');
					assert.equal(opts.headers['Content-Type'], 'text/csv', 'bad or missing Content-Type');
					done();
				}).catch(done);

			});

		});

	});

	describe('#requestJson', function() {
		var opts;

		beforeEach(function() {
			opts = null;
			var api = new Api({
				target: 'http://example.com',
				userAgent: 'MyAgent'
			});
			api.request = function(o) { opts = o; };
			api.requestJson('user');
		});

		it('should call get', function() {
			assert(!!opts);
		});

	});

	describe('#get', function() {

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
				api.get('user');
			});

			it('method should be GET', function() {
				assert.equal(opts.method, 'GET');
			});

			it('should use string path', function() {
				assert(_.includes(opts.uri, 'http://example.com/user'));
			});

		});

	});

	describe('#getById', function() {
		var api;
		var requestStub;

		beforeEach(function() {
			requestStub = sinon.stub();
			api = new Api({
				target: 'http://example.com',
				request: requestStub,
				rateLimiting: false,
				chunkSize: 2
			});
		});

		it('should get single id', function(done) {
			requestStub.resolves({ body: { response: { count: 1, user: { id: 3 }, dbg_info: { output_term: 'user' } } } });
			api.getById(3, 'test').then(function(res) {
				assert.deepEqual(requestStub.firstCall.args[0].params, { id: 3 });
				assert.deepEqual(res.body, {
					response: {
						count: 1,
						dbg_info: {
							output_term: 'user'
						},
						user: {
							id: 3
						}
					}
				});
				done();
			}).catch(done);
		});

		it('should get multi ids', function(done) {
			requestStub.onCall(0).resolves({ body: { response: { users: [{ id: 1 }, { id: 2 }], dbg_info: { output_term: 'users' } } } });
			requestStub.onCall(1).resolves({ body: { response: { user: { id: 3 }, dbg_info: { output_term: 'user' } } } });
			api.getById([1, 2, 3], 'test').then(function(res) {
				assert.deepEqual(requestStub.firstCall.args[0].params, { id: '1,2' });
				assert.deepEqual(requestStub.secondCall.args[0].params, { id: '3' });
				assert.deepEqual(res.body, {
					response: {
						count: 3,
						dbg_info: {
							output_term: 'users'
						},
						users: [{
							id: 1
						}, {
							id: 2
						}, {
							id: 3
						}]
					}
				});
				done();
			}).catch(done);
		});

		it('should reject invalid ids', function(done) {
			api.getById([], 'test').then(function() {
				done(new Error('ArgumentError not detected'));
			}).catch(function(err) {
				assert(err instanceof Api.ArgumentError);
				done();
			});
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

	});

	describe('#getAll', function() {
		var api;
		var requestStub;

		beforeEach(function() {
			requestStub = sinon.stub();
			api = new Api({
				target: 'http://example.com',
				request: requestStub,
				rateLimiting: false
			});
		});

		it('should ', function(done) {
			requestStub.onCall(0).resolves({ body: { response: { count: 3, num_elements: 2, users: [{ id: 1 }, { id: 2 }], dbg_info: { output_term: 'users' } } } });
			requestStub.onCall(1).resolves({ body: { response: { count: 3, num_elements: 2, user: { id: 3 }, dbg_info: { output_term: 'user' } } } });
			api.getAll('user').then(function(res) {
				assert.equal(requestStub.firstCall.args[0].uri, 'http://example.com/user?start_element=0&num_elements=100');
				assert.equal(requestStub.secondCall.args[0].uri, 'http://example.com/user?start_element=2&num_elements=2');
				assert.deepEqual(res.body, {
					response: {
						count: 3,
						dbg_info: {
							output_term: 'users',
							time: 0
						},
						num_elements: 3,
						start_element: 0,
						users: [{
							id: 1
						}, {
							id: 2
						}, {
							id: 3
						}]
					}
				});
				done();
			}).catch(done);
		});

	});

	describe('#getAllJson', function() {
		var opts;

		beforeEach(function() {
			opts = null;
			var api = new Api({
				target: 'http://example.com',
				userAgent: 'MyAgent'
			});
			api.getAll = function(o) { opts = o; };
			api.getAllJson('user');
		});

		it('should call getAll', function() {
			assert(!!opts);
		});

	});

	describe('#post', function() {

		describe('opts', function() {
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

	});

	describe('#put', function() {

		describe('opts', function() {
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

	});

	describe('#delete', function() {

		describe('opts', function() {
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
				rateLimiting: false,
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
		var api;
		var requestStub;

		beforeEach(function() {
			requestStub = sinon.stub();
			api = new Api({
				target: 'http://example.com',
				request: requestStub,
				rateLimiting: false
			});
		});

		it('should post to /auth', function(done) {
			requestStub.resolves({});
			api.switchUser(1234).then(function() {
				assert.equal(requestStub.firstCall.args[0].method, 'POST');
				assert.equal(requestStub.firstCall.args[0].uri, 'http://example.com/auth');
				assert.deepEqual(requestStub.firstCall.args[0].body, { auth: { switch_to_user: 1234 }});
				done();
			}).catch(done);
		});

	});

});
