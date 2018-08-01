/* eslint func-names: 0, padded-blocks: 0 */
var nock = require('nock');

var AnxApi = require('./api');

describe('Error Types', function() {

	['ApiError', 'NotAuthenticatedError', 'NotAuthorizedError', 'TargetError'].forEach(function(errorName) {
		var CustomError = AnxApi[errorName];

		function assertAnxError(e) {
			expect(e).toBeInstanceOf(Error);
			expect(e).toBeInstanceOf(AnxApi.ApiError);
			expect(e).toBeInstanceOf(CustomError);
			['id', 'code', 'message', 'description'].forEach(function(prop) {
				expect(e.hasOwnProperty(prop)).toBe(true);
			});
			expect(e.stack.indexOf('exFn') > 0).toBe(true);
		}

		describe(errorName, function() {

			it('should have proper type and properties', function() {
				try {
					(function exFn() {
						throw new CustomError();
					}());
				} catch (e) {
					assertAnxError(e);
				}
			});

			it('should ignore unknown objects as error data', function() {
				function check(obj) {
					try {
						throw new CustomError({}, obj);
					} catch (e) {
						expect(typeof e.id === 'undefined').toBe(true);
						expect(typeof e.code === 'undefined').toBe(true);
						expect(e.description).toBeNull();
					}
				}

				check();
				check(undefined);
				check({ a: 1 });
				check({ id: undefined });
				check({ error_id: undefined });
				check({ body: undefined });
				check({ body: {} });
				check({ body: { response: undefined } });
				check({ body: { response: {} } });
				check({ body: { response: { id: undefined } } });
				check({ body: { response: { error_id: undefined } } });
			});

			var response = {
				error_id: 'xyz',
				error_code: 'm-n-o-p',
				error: 'something',
				error_description: 'stuff happens',
			};

			function assertErrorInfo(e) {
				expect('xyz').toBe(e.id);
				expect('m-n-o-p').toBe(e.code);
				expect('something').toBe(e.message);
				expect('stuff happens').toBe(e.description);
			}

			it('should accept just object as error data', function() {
				var obj = response;
				try {
					throw new CustomError({}, obj);
				} catch (e) {
					assertErrorInfo(e);
				}
			});

			it('should accept body as error data', function() {
				var obj = {
					response: response,
				};
				try {
					throw new CustomError({}, obj);
				} catch (e) {
					assertErrorInfo(e);
				}
			});

			it('should accept raw api json as error data', function() {
				var obj = {
					body: {
						response: response,
					},
				};
				try {
					throw new CustomError({}, obj);
				} catch (e) {
					assertErrorInfo(e);
				}
			});


			it('should accept simple object as error data', function() {
				var obj = {
					id: response.error_id,
					code: response.error_code,
					message: response.error,
					description: response.error_description,
				};
				try {
					throw new CustomError({}, obj);
				} catch (e) {
					assertErrorInfo(e);
				}
			});

			it('should accept json response as error message', function() {
				var msg = {
					a: 1,
				};
				try {
					throw new CustomError({}, msg);
				} catch (e) {
					expect(msg).toBe(e.message);
				}
			});
		});

	});

	describe('buildError', function() {

		it('should build ApiError by default', function() {
			expect(AnxApi.buildError()).toBeInstanceOf(AnxApi.ApiError);
		});

		it('should detect legacy RateLimitExceededError pre 1.17', function() {
			var err = AnxApi.buildError({}, { statusCode: 405, body: { response: {
				error_id: 'SYSTEM',
				error_code: 'RATE_EXCEEDED',
			}}});
			expect(err).toBeInstanceOf(AnxApi.RateLimitExceededError);
		});

		[{
			name: 'ApiError',
			errorType: AnxApi.ApiError,
			statusCode: 500,
			errorId: 'Z',
		},
		{
			name: 'NotAuthorizedError',
			errorType: AnxApi.NotAuthorizedError,
			statusCode: 403,
			errorId: 'UNAUTH',
		},
		{
			name: 'NotAuthenticatedError',
			errorType: AnxApi.NotAuthenticatedError,
			statusCode: 401,
			errorId: 'NOAUTH',
		},
		{
			name: 'RateLimitExceededError',
			errorType: AnxApi.RateLimitExceededError,
			statusCode: 429,
			errorId: 'SYSTEM',
			errorCode: 'RATE_EXCEEDED',
		},
		].forEach(function(errorSpec) {
			it('should build ' + errorSpec.name, function() {
				function check(err) {
					expect(err).toBeInstanceOf(errorSpec.errorType);
				}
				check(AnxApi.buildError({}, { statusCode: errorSpec.statusCode }));
				check(AnxApi.buildError({}, { statusCode: errorSpec.statusCode, body: undefined }));
				check(AnxApi.buildError({}, { statusCode: errorSpec.statusCode, body: {} }));
				check(AnxApi.buildError({}, { statusCode: errorSpec.statusCode, body: { response: undefined } }));
				check(AnxApi.buildError({}, { statusCode: errorSpec.statusCode, body: { response: {} } }));
				check(AnxApi.buildError({}, { statusCode: errorSpec.statusCode, body: { response: { error_id: 'X' } } }));
				check(AnxApi.buildError({}, { statusCode: errorSpec.statusCode, body: { response: { error_id: errorSpec.errorId } } }));
				check(AnxApi.buildError({}, { statusCode: 200, body: { response: { error_id: errorSpec.errorId, error_code: errorSpec.errorCode } } }));
				check(AnxApi.buildError({}, { body: { response: { error_id: errorSpec.errorId, error_code: errorSpec.errorCode } } }));
			});
		});
	});

	describe('Network Errors', function() {

		it('Should handle dns lookup errors', function() {
			var api = new AnxApi({
				target: 'http://.com',
				rateLimiting: false,
			});

			return api.get('junk').then(function() {
				return new Error('expected error');
			}).catch(function(err) {
				expect(err).toBeInstanceOf(AnxApi.NetworkError);
				expect(err).toBeInstanceOf(AnxApi.DNSLookupError);
			});
		});

		it('Should handle software timeouts', function() {
			nock('http://api.example.com').get('/timeout').delayConnection(2000).reply(200);

			var api = new AnxApi({
				target: 'http://api.example.com',
				timeout: 500,
				rateLimiting: false,
			});

			return api.get('timeout').then(function() {
				return new Error('expected error');
			}).catch(function(err) {
				expect(err).toBeInstanceOf(AnxApi.NetworkError);
				expect(err).toBeInstanceOf(AnxApi.ConnectionAbortedError);
			});
		});

		it.skip('SocketTimeoutError', () => {});

		it.skip('ConnectionTimeoutError', () => {});

		it.skip('ConnectionResetError', () => {});

		it.skip('ConnectionRefusedError', () => {});

	});

});
