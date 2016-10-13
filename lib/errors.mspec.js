/* eslint func-names: 0, padded-blocks: 0 */

var _ = require('lodash');
var nock = require('nock');
var assert = require('assert');

var AnxApi = require('./api');

describe('Error Types', function() {

	['ApiError', 'NotAuthenticatedError', 'NotAuthorizedError', 'TargetError'].forEach(function(errorName) {
		var CustomError = AnxApi[errorName];

		function assertAnxError(e) {
			assert(e instanceof Error, 'not instance of Error');
			assert(e instanceof AnxApi.ApiError, 'not instance of ApiError');
			assert(e instanceof CustomError, 'not instance of ' + errorName);
			['id', 'code', 'message', 'description'].forEach(function(prop) {
				assert(e.hasOwnProperty(prop), prop);
			});
			assert(e.stack.indexOf('exFn') > 0, 'the calling function name should be in the stack trace');
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
						assert(typeof e.id === 'undefined', 'error_id');
						assert(typeof e.code === 'undefined', 'error_code');
						assert.equal(null, e.description, 'error_description');
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
				error_description: 'stuff happens'
			};

			function assertErrorInfo(e) {
				assert.equal('xyz', e.id);
				assert.equal('m-n-o-p', e.code);
				assert.equal('something', e.message);
				assert.equal('stuff happens', e.description);
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
					response: response
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
						response: response
					}
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
					description: response.error_description
				};
				try {
					throw new CustomError({}, obj);
				} catch (e) {
					assertErrorInfo(e);
				}
			});

			it('should accept json response as error message', function() {
				var msg = {
					a: 1
				};
				try {
					throw new CustomError({}, msg);
				} catch (e) {
					assert.equal(msg, e.message);
				}
			});
		});

	});

	describe('buildError', function() {

		it('should build ApiError by default', function() {
			assert(AnxApi.buildError() instanceof AnxApi.ApiError);
		});

		it('should detect legacy RateLimitExceededError pre 1.17', function() {
			var err = AnxApi.buildError({}, { statusCode: 405, body: { response: {
				error_id: 'SYSTEM',
				error_code: 'RATE_EXCEEDED'
			}}});
			assert(err instanceof AnxApi.RateLimitExceededError);
		});

		[{
			name: 'ApiError',
			errorType: AnxApi.ApiError,
			statusCode: 500,
			errorId: 'Z'
		},
		{
			name: 'NotAuthorizedError',
			errorType: AnxApi.NotAuthorizedError,
			statusCode: 403,
			errorId: 'UNAUTH'
		},
		{
			name: 'NotAuthenticatedError',
			errorType: AnxApi.NotAuthenticatedError,
			statusCode: 401,
			errorId: 'NOAUTH'
		},
		{
			name: 'RateLimitExceededError',
			errorType: AnxApi.RateLimitExceededError,
			statusCode: 429,
			errorId: 'SYSTEM',
			errorCode: 'RATE_EXCEEDED'
		}
		].forEach(function(errorSpec) {
			it('should build ' + errorSpec.name, function() {
				function check(err) {
					assert(err instanceof errorSpec.errorType);
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

		it('Should handle dns lookup errors', function(done) {
			this.timeout(5000);

			var api = new AnxApi({
				target: 'http://.com'
			});

			api.get('junk').then(function() {
				done(new Error('expected error'));
			}).catch(function(err) {
				done(_.attempt(function() {
					assert(err instanceof AnxApi.NetworkError, 'not instance of NetworkError');
					assert(err instanceof AnxApi.DNSLookupError, 'not instance of DNSLookupError');
				}));
			});
		});

		it('Should handle software timeouts', function(done) {
			nock('http://api.example.com').get('/timeout').delayConnection(2000).reply(200);

			var api = new AnxApi({
				target: 'http://api.example.com',
				timeout: 500
			});

			api.get('timeout').then(function() {
				done(new Error('expected error'));
			}).catch(function(err) {
				done(_.attempt(function() {
					assert(err instanceof AnxApi.NetworkError, 'not instance of NetworkError');
					assert(err instanceof AnxApi.ConnectionAbortedError, 'not instance of ConnectionAbortedError');
				}));
			});
		});

		it('SocketTimeoutError');

		it('ConnectionTimeoutError');

		it('ConnectionResetError');

		it('ConnectionRefusedError');

	});

});
