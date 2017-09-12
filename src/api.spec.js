/* eslint func-names: 0, padded-blocks: 0 */

var _ = require('lodash');
var assert = require('assert');

var AnxApi = require('./api');

describe('AnxApi', function() {

	describe('Request', function() {

		describe('config', function() {
			var opts;
			var res;

			describe('with valid config', function() {

				beforeEach(function() {
					opts = null;
					res = null;

					var api = new AnxApi({
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
						},
					});

					return api.get('/user').then(function(reqRes) {
						res = reqRes;
						return null;
					});
				});

				it('should use target', function() {
					assert(_.includes(opts.uri, 'http://example.com/'));
				});

				it('should use token', function() {
					expect(opts.headers.Authorization).toBe('MySessionToken');
				});

				it('should use User-Agent', function() {
					expect(opts.headers['User-Agent']).toBe('MyAgent');
				});

				it('should use beforeRequest function', function() {
					expect(opts.body).toBe('test');
				});

				it('should use afterRequest function', function() {
					expect(res.afterRequest).toBe('value');
				});

				it('should default request timeout', function() {
					expect(opts.timeout).toBe(60000);
				});

				it('should attach original request options to the response', function() {
					expect(res.req).toEqual(opts);
				});

			});

			describe('with invalid config', function() {

				it('should throw on missing target', function(done) {
					var api = new AnxApi({
						rateLimiting: false,
					});

					api.get('/user').catch(function(err) {
						assert(err instanceof AnxApi.TargetError);
						done();
					});
				});

			});

		});

		describe('Options', function() {
			var opts;

			describe('with encodeParams defaulted to false', function() {

				beforeEach(function(done) {
					opts = null;
					var api = new AnxApi({
						target: 'http://example.com',
						rateLimiting: false,
						request: function(o) {
							opts = o;
							done();
						},
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
								3,
							],
							myObjArray: [{
								a: 'apple',
							}, {
								b: 'bee',
							}],
						},
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

			});

			describe('with encodeParams true', function() {

				beforeEach(function(done) {
					opts = null;
					var api = new AnxApi({
						target: 'http://example.com',
						rateLimiting: false,
						request: function(o) {
							opts = o;
							done();
						},
					});
					api.get({
						uri: 'user',
						timeout: 5000,
						startElement: 100,
						numElements: 25,
						encodeParams: true,
						params: {
							myEncodedString: '%ssp',
						},
					});
				});

				it('uri should encode params', function() {
					assert(_.includes(opts.uri, 'myEncodedString=%25ssp'));
				});

			});

			describe('validation', function() {
				var api;
				var reqOpts;

				beforeEach(function() {
					api = new AnxApi({
						target: 'http://example.com',
						rateLimiting: false,
						request: function(o) {
							reqOpts = o;
							return {
								then: function(callback) {
									callback({});
								},
							};
						},
					});
				});

				function expectValidationError(errOpts, expected, done) {
					api.request(errOpts).then(function() {
						return done(new Error('Expected error: ' + expected));
					}).catch(function(err) {
						assert(err instanceof AnxApi.ArgumentError);
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
						{ value: undefined },
					],
					startElement: [
						{ value: null },
						{ value: undefined },
						{ value: 0 },
						{ value: 1.1, message: 'Invalid startElement' },
						{ value: '', message: 'Invalid startElement' },
						{ value: 5, uriContains: 'start_element=5' },
						{ value: '10', uriContains: 'start_element=10' },
						{ value: 'ZZZ', message: 'Invalid startElement' },
					],
					numElements: [
						{ value: null },
						{ value: undefined },
						{ value: 0 },
						{ value: 1.1, message: 'Invalid numElements' },
						{ value: '', message: 'Invalid numElements' },
						{ value: 5, uriContains: 'num_elements=5' },
						{ value: '10', uriContains: 'num_elements=10' },
						{ value: 'ZZZ', message: 'Invalid numElements' },
					],
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
								it(param + ' should accept ' + test.value, function() {
									return api.request(newOpts).then(function() {
										if (test.uriContains) {
											assert(_.includes(reqOpts.uri, test.uriContains), 'Url (' + reqOpts.uri + ') did not contain: ' + test.uriContains);
										}
										return null;
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
						api = new AnxApi({
							target: 'http://example.com',
							userAgent: 'MyAgent',
							rateLimiting: false,
							request: function() {
								return {
									then: function(callback) {
										callback({
											statusCode: 401,
										});
									},
								};
							},
						});
					});

					it('should reject with NotAuthenticatedError', function(done) {
						api.get('user').then(function() {
							return done(new Error('Did not catch 401'));
						}).catch(function(err) {
							if (!(err instanceof AnxApi.NotAuthenticatedError)) {
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
				api = new AnxApi({
					target: 'http://example.com',
					rateLimiting: false,
					request: function(opts) {
						return Promise.resolve(opts);
					},
				});
			});

			describe('json default', function() {

				it('should set up GET request for json', function() {
					return api.request({}).then(function(opts) {
						assert.equal(opts.headers.Accept, 'application/json', 'bad or missing Accept');
						assert(!opts.headers['Content-Type'], 'Content-Type should not be set');
						return null;
					});
				});

				it('should set up POST request for json', function() {
					return api.request({ method: 'POST' }).then(function(opts) {
						assert.equal(opts.headers.Accept, 'application/json', 'bad or missing Accept');
						assert.equal(opts.headers['Content-Type'], 'application/json', 'bad or missing Content-Type');
						return null;
					});
				});

				it('should set up PUT request for json', function() {
					return api.request({ method: 'PUT' }).then(function(opts) {
						assert.equal(opts.headers.Accept, 'application/json', 'bad or missing Accept');
						assert.equal(opts.headers['Content-Type'], 'application/json', 'bad or missing Content-Type');
						return null;
					});
				});

				describe('header overrides', function() {
					it('should allow overrideing Accept', function() {
						return api.request({ method: 'DELETE' }).then(function(opts) {
							assert.equal(opts.headers.Accept, 'application/json', 'bad or missing Accept');
							assert(!opts.headers['Content-Type'], 'Content-Type should not be set');
							return null;
						});
					});

					it('should allow overriding Content-Type', function() {
						return api.request({ method: 'GET', headers: { 'Content-Type': 'application/json' } }).then(function(opts) {
							assert.equal(opts.headers.Accept, 'application/json', 'bad or missing Accept');
							assert(opts.headers['Content-Type'], 'Content-Type should be set');
							return null;
						});
					});
				});

			});

			it('should allow overriding json accept type', function() {
				return api.request({ method: 'POST', headers: { Accept: 'text/csv', 'Content-Type': 'text/csv' }}).then(function(opts) {
					assert.equal(opts.headers.Accept, 'text/csv', 'bad or missing Accept');
					assert.equal(opts.headers['Content-Type'], 'text/csv', 'bad or missing Content-Type');
					return null;
				});
			});

			it('should allow setting Accept and Content-Type with mimeType option', function() {
				return api.request({ method: 'POST', mimeType: 'text/csv' }).then(function(opts) {
					assert.equal(opts.headers.Accept, 'text/csv', 'bad or missing Accept');
					assert.equal(opts.headers['Content-Type'], 'text/csv', 'bad or missing Content-Type');
					return null;
				});
			});

		});

	});

	describe('#get', function() {

		describe('opts', function() {
			var opts;

			beforeEach(function(done) {
				opts = null;
				var api = new AnxApi({
					target: 'http://example.com',
					rateLimiting: false,
					request: function(o) {
						opts = o;
						done();
					},
				});
				api.get('user').catch((error) => error);
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
			requestStub = jest.fn();
			api = new AnxApi({
				target: 'http://example.com',
				request: requestStub,
				rateLimiting: false,
				chunkSize: 2,
			});
		});

		it('should get single id', function() {
			requestStub.mockReturnValueOnce(Promise.resolve({ body: { response: { count: 1, user: { id: 3 }, dbg_info: { output_term: 'user' } } } }));
			return api.getById(3, 'test').then(function(res) {
				expect(requestStub.mock.calls[0][0].params).toEqual({ id: 3 });
				expect(res.body).toEqual({
					response: {
						count: 1,
						dbg_info: {
							output_term: 'user',
						},
						user: {
							id: 3,
						},
					},
				});
				return null;
			});
		});

		it('should get multi ids', function() {
			requestStub.mockReturnValueOnce(Promise.resolve({ body: { response: { users: [{ id: 1 }, { id: 2 }], dbg_info: { output_term: 'users' } } } }));
			requestStub.mockReturnValueOnce(Promise.resolve({ body: { response: { user: { id: 3 }, dbg_info: { output_term: 'user' } } } }));
			return api.getById([1, 2, 3], 'test').then(function(res) {
				expect(requestStub.mock.calls[0][0].params).toEqual({ id: '1,2' });
				expect(requestStub.mock.calls[1][0].params).toEqual({ id: '3' });
				expect(res.body).toEqual({
					response: {
						count: 3,
						dbg_info: {
							output_term: 'users',
						},
						users: [{
							id: 1,
						}, {
							id: 2,
						}, {
							id: 3,
						}],
					},
				});
				return null;
			});
		});

		it('should reject invalid ids', function(done) {
			api.getById([], 'test').then(function() {
				return done(new Error('ArgumentError not detected'));
			}).catch(function(err) {
				assert(err instanceof AnxApi.ArgumentError);
				done();
			});
		});

	});

	describe('#getBy', function() {
		var api;
		var requestStub;

		beforeEach(function() {
			requestStub = jest.fn();
			api = new AnxApi({
				target: 'http://example.com',
				request: requestStub,
				rateLimiting: false,
				chunkSize: 2,
			});
		});

		it('should get single param', function() {
			requestStub.mockReturnValueOnce(Promise.resolve({ body: { response: { count: 1, user: { name: 3 }, dbg_info: { output_term: 'user' } } } }));
			return api.getBy('name', 3, 'test').then(function(res) {
				expect(requestStub.mock.calls[0][0].params).toEqual({ name: 3 });
				expect(res.body).toEqual({
					response: {
						count: 1,
						dbg_info: {
							output_term: 'user',
						},
						user: {
							name: 3,
						},
					},
				});
				return null;
			});
		});

		it('should get multi ids', function() {
			requestStub.mockReturnValueOnce(Promise.resolve({ body: { response: { users: [{ id: 1 }, { id: 2 }], dbg_info: { output_term: 'users' } } } }));
			requestStub.mockReturnValueOnce(Promise.resolve({ body: { response: { user: { id: 3 }, dbg_info: { output_term: 'user' } } } }));
			return api.getBy('name', [1, 2, 3], 'test').then(function(res) {
				expect(requestStub.mock.calls[0][0].params).toEqual({ name: '1,2' });
				expect(requestStub.mock.calls[1][0].params).toEqual({ name: '3' });
				expect(res.body).toEqual({
					response: {
						count: 3,
						dbg_info: {
							output_term: 'users',
						},
						users: [{
							id: 1,
						}, {
							id: 2,
						}, {
							id: 3,
						}],
					},
				});
				return null;
			});
		});

		it('should reject invalid ids', function(done) {
			api.getBy('id', [], 'test').then(function() {
				return done(new Error('ArgumentError not detected'));
			}).catch(function(err) {
				assert(err instanceof AnxApi.ArgumentError);
				done();
			});
		});

	});

	describe('#getAll', function() {
		var api;
		var requestStub;

		beforeEach(function() {
			requestStub = jest.fn();
			api = new AnxApi({
				target: 'http://example.com',
				request: requestStub,
				rateLimiting: false,
			});
		});

		it('should ', function() {
			requestStub.mockReturnValueOnce(Promise.resolve({ body: { response: { status: 'OK', count: 3, num_elements: 2, users: [{ id: 1 }, { id: 2 }], dbg_info: { output_term: 'users' } } } }));
			requestStub.mockReturnValueOnce(Promise.resolve({ body: { response: { status: 'OK', count: 3, num_elements: 2, user: { id: 3 }, dbg_info: { output_term: 'user' } } } }));
			return api.getAll('user').then(function(res) {
				expect(requestStub.mock.calls[0][0].uri).toEqual('http://example.com/user?start_element=0&num_elements=100');
				expect(requestStub.mock.calls[1][0].uri).toEqual('http://example.com/user?start_element=2&num_elements=2');
				expect(res.body).toEqual({
					response: {
						count: 3,
						dbg_info: {
							output_term: 'users',
							time: 0,
						},
						num_elements: 3,
						start_element: 0,
						users: [{
							id: 1,
						}, {
							id: 2,
						}, {
							id: 3,
						}],
					},
				});
				return null;
			});
		});

	});

	describe('#post', function() {

		describe('opts', function() {
			var opts;

			beforeEach(function(done) {
				var api = new AnxApi({
					target: 'http://example.com',
					rateLimiting: false,
					request: function(o) {
						opts = o;
						done();
					},
				});
				api.post('user', { name: 'MyName' }).catch((error) => error);
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

	describe('#put', function() {

		describe('opts', function() {
			var opts;

			beforeEach(function(done) {
				var api = new AnxApi({
					target: 'http://example.com',
					rateLimiting: false,
					request: function(o) {
						opts = o;
						done();
					},
				});
				api.put('user', { name: 'MyName' }).catch((error) => error);
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

	describe('#delete', function() {

		describe('opts', function() {
			var opts;

			beforeEach(function(done) {
				var api = new AnxApi({
					target: 'http://example.com',
					rateLimiting: false,
					request: function(o) {
						opts = o;
						done();
					},
				});
				api.delete('user?id=1').catch((error) => error);
			});

			it('method should be DELETE', function() {
				assert.equal(opts.method, 'DELETE');
			});

			it('should use string path', function() {
				assert(_.includes(opts.uri, 'http://example.com/user'));
			});

		});

	});

	describe('#statusOk', function() {

		it('should return true when status is OK', function() {
			assert.equal(AnxApi.statusOk({ response: { status: 'OK' } }), true);
		});

		it('should return false when status is not OK', function() {
			assert.equal(AnxApi.statusOk({ response: { status: '' } }), false);
		});

		it('should return false with no status field', function() {
			assert.equal(AnxApi.statusOk({ response: {} }), false);
		});

		it('should return false with no response field', function() {
			assert.equal(AnxApi.statusOk({}), false);
		});

	});

	describe('#login', function() {

		function buildApi(responseData) {
			var api = new AnxApi({
				// target: 'http://example.com',
				target: 'https://sand.api.appnexus.com',
				userAgent: 'MyAgent',
				rateLimiting: false,
				request: function() {
					return new Promise(function(resolve) {
						resolve(responseData);
					});
				},
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
						error_code: null,
					},
				},
			});
			return api.login('test_user', 'bad_password').then(function() {
				throw new Error('Did not catch Login Error');
			}).catch(function(err) {
				// API treats bad apssword as Authentication instead of Authorization Error.
				// assert(err instanceof AnxApi.NotAuthenticatedError, 'Api.NotAuthenticatedError');
				assert(err instanceof AnxApi.NotAuthorizedError, 'Api.NotAuthorizedError');

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
						token: 'hbapi:10340:55ba41134f752:lax1',
					},
				},
			});
			return api.login('test_user', 'test_password').then(function(token) {
				assert.equal('hbapi:10340:55ba41134f752:lax1', token);
				return null;
			});
		});
	});

	describe('#switchUser', function() {
		var api;
		var requestStub;

		beforeEach(function() {
			requestStub = jest.fn();
			api = new AnxApi({
				target: 'http://example.com',
				request: requestStub,
				rateLimiting: false,
			});
		});

		it('should post to /auth', function() {
			requestStub.mockReturnValueOnce(Promise.resolve({}));
			return api.switchUser(1234).then(function() {
				expect(requestStub.mock.calls[0][0].method).toBe('POST');
				expect(requestStub.mock.calls[0][0].uri).toBe('http://example.com/auth');
				expect(requestStub.mock.calls[0][0].body).toEqual({ auth: { switch_to_user: 1234 }});
				return null;
			});
		});

	});

});
