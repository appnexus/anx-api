var assert = require('assert');

var anxErrors = require('./errors');
var Api = require('./api');

describe('Error Types', function () {

	['ApiError', 'NotAuthenticatedError', 'NotAuthorizedError', 'TargetError'].forEach(function(errorName) {
		var CustomError = Api[errorName];

		function assertAnxError(e) {
			assert(e instanceof Error, ' Error');
			assert(e instanceof Api.ApiError, 'ApiError');
			assert(e instanceof CustomError, errorName);
			['id', 'code', 'message', 'description'].forEach(function(prop) {
				assert(e.hasOwnProperty(prop), prop);
			});
			assert(e.stack.indexOf('exFn') > 0, 'the calling function name should be in the stack trace');
		}

		describe(errorName, function () {
			it('should add error type to namespace', function() {
				var ns = {};
				anxErrors.extend(ns);
				try {
					(function exFn() {
						throw new ns[errorName]();
					}());
				} catch (e) {
					assertAnxError(e);
				}
			});

			it('should have proper type and properties', function() {
				try {
					(function exFn() {
						throw new CustomError();
					}());
				} catch (e) {
					assertAnxError(e);
				}
			});

			it('should accept just message', function() {
				try {
					throw new CustomError('something');
				} catch (e) {
					assert.equal('something', e.message);
				}
			});

			it('should accept id and message', function() {
				try {
					throw new CustomError('xyz', 'something');
				} catch (e) {
					assert.equal('xyz', e.id);
					assert.equal('something', e.message);
				}
			});

			it('should accept id, code and message', function() {
				try {
					throw new CustomError('xyz', 'm-n-o-p', 'something');
				} catch (e) {
					assert.equal('xyz', e.id);
					assert.equal('m-n-o-p', e.code);
					assert.equal('something', e.message);
				}
			});

			it('should ignore unknown objects as error data', function() {
				function check(obj) {
					try {
						throw new CustomError(obj);
					} catch (e) {
						assert(typeof e.id === 'undefined', 'error_id');
						assert(typeof e.code === 'undefined', 'error_code');
						assert.equal('', e.description, 'error_description');
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
				'error_id': 'xyz',
				'error_code': 'm-n-o-p',
				'error': 'something',
				'error_description': 'stuff happens'
			};

			function assertErrorInfo(e) {
				assert.equal('xyz', e.id);
				assert.equal('m-n-o-p', e.code);
				assert.equal('something', e.message);
				assert.equal('stuff happens', e.description);
			}

			it('should accept id, code, message & description', function() {
				try {
					throw new CustomError('xyz', 'm-n-o-p', 'something', 'stuff happens');
				} catch (e) {
					assertErrorInfo(e);
				}
			});

			it('should accept just object as error data', function() {
				var obj = response;
				try {
					throw new CustomError(obj);
				} catch (e) {
					assertErrorInfo(e);
				}
			});

			it('should accept body as error data', function() {
				var obj = {
					response: response
				};
				try {
					throw new CustomError(obj);
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
					throw new CustomError(obj);
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
					throw new CustomError(obj);
				} catch (e) {
					assertErrorInfo(e);
				}
			});

			it('should accept json response as error message', function() {
				var msg = {
					a: 1
				};
				try {
					throw new CustomError(msg);
				} catch (e) {
					assert.equal(msg, e.message);
				}
			});
		});

	});

	describe('buildError', function() {

		it('should build ApiError by default', function() {
			assert(Api.buildError() instanceof Api.ApiError);
		});

		[{
			name: 'ApiError',
			errorType: Api.ApiError,
			statusCode: 500,
			errorId: 'Z'
		},
		{
			name: 'NotAuthorizedError',
			errorType: Api.NotAuthorizedError,
			statusCode: 403,
			errorId: 'UNAUTH'
		},
		{
			name: 'NotAuthenticatedError',
			errorType: Api.NotAuthenticatedError,
			statusCode: 401,
			errorId: 'NOAUTH'
		},
		].forEach(function(errorSpec) {
			it('should build ' + errorSpec.name, function() {
				function check(err) {
					assert(err instanceof errorSpec.errorType);
				}
				check(Api.buildError({ statusCode: errorSpec.statusCode }));
				check(Api.buildError({ statusCode: errorSpec.statusCode, body: undefined }));
				check(Api.buildError({ statusCode: errorSpec.statusCode, body: {} }));
				check(Api.buildError({ statusCode: errorSpec.statusCode, body: { response: undefined } }));
				check(Api.buildError({ statusCode: errorSpec.statusCode, body: { response: {} } }));
				check(Api.buildError({ statusCode: errorSpec.statusCode, body: { response: { error_id: 'X' } } }));
				check(Api.buildError({ statusCode: errorSpec.statusCode, body: { response: { error_id: errorSpec.errorId } } }));
				check(Api.buildError({ statusCode: 200, body: { response: { error_id: errorSpec.errorId } } }));
				check(Api.buildError({ body: { response: { error_id: errorSpec.errorId } } }));
			});
		});
	});
});

