/* eslint func-names: 0, padded-blocks: 0 */

var _ = require('lodash');

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
					expect(_.includes(opts.uri, 'http://example.com/')).toBe(true);
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
						expect(err).toBeInstanceOf(AnxApi.TargetError);
						done();
					});
				});

			});

		});

		describe('Options', function() {
			var opts;
			var get;

			describe('with encodeParams defaulted to false', function() {

				beforeEach(function() {
					opts = null;
					var api = new AnxApi({
						target: 'http://example.com',
						rateLimiting: false,
						request: function(o) {
							opts = o;
							return Promise.resolve({});
						},
					});
					get = api.get({
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

					return get;
				});

				it('uri should contain start_element', function() {
					expect.assertions(1);
					return get.then(() => {
						expect(_.includes(opts.uri, 'start_element=100')).toBe(true);
						return null;
					});
				});

				it('uri should contain num_elements', function() {
					expect.assertions(1);
					return get.then(() => {
						expect(_.includes(opts.uri, 'num_elements=25')).toBe(true);
						return null;
					});
				});

				it('uri should contain params', function() {
					expect.assertions(1);
					return get.then(() => {
						expect(_.includes(opts.uri, 'myParam=value')).toBe(true);
						return null;
					});
				});

				it('uri should convert standard nested array params', function() {
					expect.assertions(1);
					return get.then(() => {
						expect(_.includes(opts.uri, 'myStdArray[0]=1&myStdArray[1]=2&myStdArray[2]=3')).toBe(true);
						return null;
					});
				});

				it('uri should convert nested object array params', function() {
					expect.assertions(1);
					return get.then(() => {
						expect(_.includes(opts.uri, 'myObjArray[0][a]=apple&myObjArray[1][b]=bee')).toBe(true);
						return null;
					});
				});

				it('should default request timeout', function() {
					expect.assertions(1);
					return get.then(() => {
						expect(opts.timeout).toBe(5000);
						return null;
					});
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
					expect(_.includes(opts.uri, 'myEncodedString=%25ssp')).toBe(true);
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
						expect(err).toBeInstanceOf(AnxApi.ArgumentError);
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
											expect(_.includes(reqOpts.uri, test.uriContains)).toBe(true);
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
					expect.assertions(2);
					return api.request({}).then(function(opts) {
						expect(opts.headers.Accept).toBe('application/json');
						expect(opts.headers['Content-Type']).toBeUndefined();
						return null;
					});
				});

				it('should set up POST request for json', function() {
					expect.assertions(2);
					return api.request({ method: 'POST' }).then(function(opts) {
						expect(opts.headers.Accept).toBe('application/json');
						expect(opts.headers['Content-Type']).toBe('application/json');
						return null;
					});
				});

				it('should set up PUT request for json', function() {
					expect.assertions(2);
					return api.request({ method: 'PUT' }).then(function(opts) {
						expect(opts.headers.Accept).toBe('application/json');
						expect(opts.headers['Content-Type']).toBe('application/json');
						return null;
					});
				});

				describe('header overrides', function() {
					it('should allow overriding Accept', function() {
						expect.assertions(2);
						return api.request({ method: 'DELETE' }).then(function(opts) {
							expect(opts.headers.Accept).toBe('application/json');
							expect(opts.headers['Content-Type']).toBeUndefined();
							return null;
						});
					});

					it('should allow overriding Content-Type', function() {
						expect.assertions(2);
						return api.request({ method: 'GET', headers: { 'Content-Type': 'application/json' } }).then(function(opts) {
							expect(opts.headers.Accept).toBe('application/json');
							expect(opts.headers['Content-Type']).toBeDefined();
							return null;
						});
					});
				});

			});

			it('should allow overriding json accept type', function() {
				expect.assertions(2);
				return api.request({ method: 'POST', headers: { Accept: 'text/csv', 'Content-Type': 'text/csv' }}).then(function(opts) {
					expect(opts.headers.Accept).toBe('text/csv', 'bad or missing Accept');
					expect(opts.headers['Content-Type']).toBe('text/csv', 'bad or missing Content-Type');
					return null;
				});
			});

			it('should allow setting Accept and Content-Type with mimeType option', function() {
				expect.assertions(2);
				return api.request({ method: 'POST', mimeType: 'text/csv' }).then(function(opts) {
					expect(opts.headers.Accept).toBe('text/csv', 'bad or missing Accept');
					expect(opts.headers['Content-Type']).toBe('text/csv', 'bad or missing Content-Type');
					return null;
				});
			});

		});

		describe('url formatting', () => {
			it('should not alter the target URL', () => {
				const finalRoute = 'http://example.com/route/sub-route';
				const api = new AnxApi({
					target: 'http://example.com/route',
					rateLimiting: false,
					request: function(opts) {
						return Promise.resolve(opts);
					},
				});
				return api.get('sub-route').then((opts) => {
					return expect(finalRoute).toBe(opts.uri);
				});
			});

			it('should handle trailing slashes in the target URL', () => {
				const finalRoute = 'http://example.com/route/sub-route';
				const api = new AnxApi({
					target: 'http://example.com/route/',
					rateLimiting: false,
					request: function(opts) {
						return Promise.resolve(opts);
					},
				});
				return api.get('sub-route').then((opts) => {
					return expect(finalRoute).toBe(opts.uri);
				});
			});

			it('should trim off leading slashes on sub-routes', () => {
				const finalRoute = 'http://example.com/route/sub-route';
				const api = new AnxApi({
					target: 'http://example.com/route',
					rateLimiting: false,
					request: function(opts) {
						return Promise.resolve(opts);
					},
				});

				return api.get('/sub-route').then((opts) => {
					return expect(finalRoute).toBe(opts.uri);
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
				expect(opts.method).toBe('GET');
			});

			it('should use string path', function() {
				expect(_.includes(opts.uri, 'http://example.com/user')).toBe(true);
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
				expect(opts.method).toBe('POST');
			});

			it('should use string path', function() {
				expect(_.includes(opts.uri, 'http://example.com/user')).toBe(true);
			});

			it('should place the payload into the post body', function() {
				expect(opts.body).toEqual({ name: 'MyName' });
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
				expect(opts.method).toBe('PUT');
			});

			it('should use string path', function() {
				expect(_.includes(opts.uri, 'http://example.com/user')).toBe(true);
			});

			it('should place the payload into the put body', function() {
				expect(opts.body).toEqual({ name: 'MyName' });
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
				expect(opts.method).toBe('DELETE');
			});

			it('should use string path', function() {
				expect(_.includes(opts.uri, 'http://example.com/user')).toBe(true);
			});

		});

	});

	describe('#statusOk', function() {

		it('should return true when status is OK', function() {
			expect(AnxApi.statusOk({ response: { status: 'OK' } })).toBe(true);
		});

		it('should return false when status is not OK', function() {
			expect(AnxApi.statusOk({ response: { status: '' } })).toBe(false);
		});

		it('should return false with no status field', function() {
			expect(AnxApi.statusOk({ response: {} })).toBe(false);
		});

		it('should return false with no response field', function() {
			expect(AnxApi.statusOk({})).toBe(false);
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
				expect(err).toBeInstanceOf(AnxApi.NotAuthorizedError);

				expect('UNAUTH').toBe(err.id);
				expect('No match found for user/pass').toBe(err.message);
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
				expect('hbapi:10340:55ba41134f752:lax1').toBe(token);
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
