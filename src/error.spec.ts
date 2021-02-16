import nock from 'nock';

import { AnxApi } from './api';
import * as errors from './errors';

describe('Error Types', () => {
	['ApiError', 'NotAuthenticatedError', 'NotAuthorizedError', 'TargetError'].forEach((errorName) => {
		function assertAnxError(e) {
			expect(e).toBeInstanceOf(Error);
			expect(e).toBeInstanceOf(errors.ApiError);
			['id', 'code', 'message', 'description'].forEach((prop) => {
				expect(e.hasOwnProperty(prop)).toBe(true);
			});
			expect(e.stack.indexOf('exFn') > 0).toBe(true);
		}

		describe(errorName, () => {
			it('should have proper type and properties', () => {
				try {
					(function exFn() {
						throw new errors[errorName]();
					})();
				} catch (e) {
					assertAnxError(e);
				}
			});

			it('should ignore unknown objects as error data', () => {
				function check(obj) {
					try {
						throw new errors[errorName]({}, obj);
					} catch (e) {
						expect(typeof e.id === 'undefined').toBe(true);
						expect(typeof e.code === 'undefined').toBe(true);
						expect(e.description).toBeNull();
					}
				}

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

			const response = {
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

			it('should accept just object as error data', () => {
				const obj = response;
				try {
					throw new errors[errorName](null, obj, {});
				} catch (e) {
					assertErrorInfo(e);
				}
			});

			it('should accept body as error data', () => {
				const obj = {
					response,
				};
				try {
					throw new errors[errorName](null, obj, {});
				} catch (e) {
					assertErrorInfo(e);
				}
			});

			it('should accept raw api json as error data', () => {
				const obj = {
					body: {
						response,
					},
				};
				try {
					throw new errors[errorName](null, obj, {});
				} catch (e) {
					assertErrorInfo(e);
				}
			});

			it('should accept simple object as error data', () => {
				const obj = {
					id: response.error_id,
					code: response.error_code,
					message: response.error,
					description: response.error_description,
				};
				try {
					throw new errors[errorName](null, obj, {});
				} catch (e) {
					assertErrorInfo(e);
				}
			});
		});
	});

	describe('buildRequestError', () => {
		it('should build ApiError by default', () => {
			expect(errors.buildRequestError(new Error('my generic error'), null)).toBeInstanceOf(Error);
		});
	});

	describe('buildError', () => {
		it('should detect legacy RateLimitExceededError pre 1.17', () => {
			const err = errors.buildError(
				null,
				{},
				{
					statusCode: 405,
					body: {
						response: {
							error_id: 'SYSTEM',
							error_code: 'RATE_EXCEEDED',
						},
					},
				},
			);
			expect(err).toBeInstanceOf(errors.RateLimitExceededError);
		});

		[
			{
				name: 'ApiError',
				errorType: errors.ApiError,
				statusCode: 500,
				errorId: 'Z',
				errorMessage: 'Unknown Api Error',
				isApiError: true,
			},
			{
				name: 'NotAuthorizedError',
				errorType: errors.NotAuthorizedError,
				statusCode: 403,
				errorId: 'UNAUTH',
				errorMessage: 'Authorization failed',
				isApiError: true,
			},
			{
				name: 'NotAuthenticatedError',
				errorType: errors.NotAuthenticatedError,
				statusCode: 401,
				errorId: 'NOAUTH',
				errorMessage: 'Authentication failed',
				isApiError: true,
			},
			{
				name: 'RateLimitExceededError',
				errorType: errors.RateLimitExceededError,
				statusCode: 429,
				errorId: 'SYSTEM',
				errorCode: 'RATE_EXCEEDED',
				errorMessage: 'Rate Limit Exceeded',
				isApiError: true,
			},
		].forEach((errorSpec) => {
			it('should build ' + errorSpec.name, () => {
				function check(err) {
					expect(err.name).toEqual(errorSpec.name);
					expect(err.message).toEqual(errorSpec.errorMessage);
					expect(err.isApiError).toEqual(errorSpec.isApiError);
				}
				check(errors.buildError(null, {}, { statusCode: errorSpec.statusCode }));
				check(errors.buildError(null, {}, { statusCode: errorSpec.statusCode, body: undefined }));
				check(errors.buildError(null, {}, { statusCode: errorSpec.statusCode, body: {} }));
				check(errors.buildError(null, {}, { statusCode: errorSpec.statusCode, body: { response: undefined } }));
				check(errors.buildError(null, {}, { statusCode: errorSpec.statusCode, body: { response: {} } }));
				check(
					errors.buildError(
						null,
						{},
						{
							statusCode: errorSpec.statusCode,
							body: { response: { error_id: 'X' } },
						},
					),
				);
				check(
					errors.buildError(
						null,
						{},
						{
							statusCode: errorSpec.statusCode,
							body: { response: { error_id: errorSpec.errorId } },
						},
					),
				);
				check(
					errors.buildError(
						null,
						{},
						{
							statusCode: 200,
							body: {
								response: {
									error_id: errorSpec.errorId,
									error_code: errorSpec.errorCode,
								},
							},
						},
					),
				);
				check(
					errors.buildError(
						null,
						{},
						{
							body: {
								response: {
									error_id: errorSpec.errorId,
									error_code: errorSpec.errorCode,
								},
							},
						},
					),
				);
			});
		});
	});

	describe('Network Errors', () => {
		it('Should handle dns lookup errors', () => {
			const api = new AnxApi({
				target: 'http://.com',
				rateLimiting: false,
			});

			return api
				.get('junk')
				.then(() => {
					return new Error('expected error');
				})
				.catch((err) => {
					expect(err).toBeInstanceOf(errors.NetworkError);
					expect(err).toBeInstanceOf(errors.DNSLookupError);
				});
		});

		it('Should handle software timeouts', () => {
			nock('http://api.example.com').get('/timeout').delayConnection(2000).reply(200);

			const api = new AnxApi({
				target: 'http://api.example.com',
				timeout: 500,
				rateLimiting: false,
			});

			return api
				.get('timeout')
				.then(() => {
					return new Error('expected error');
				})
				.catch((err) => {
					expect(err).toBeInstanceOf(errors.NetworkError);
					expect(err).toBeInstanceOf(errors.ConnectionAbortedError);
				});
		});

		it.skip('SocketTimeoutError', () => {});

		it.skip('ConnectionTimeoutError', () => {});

		it.skip('ConnectionResetError', () => {});

		it.skip('ConnectionRefusedError', () => {});
	});
});
