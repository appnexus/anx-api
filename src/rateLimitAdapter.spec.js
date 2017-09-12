/* eslint func-names: 0, padded-blocks: 0 */
var axios = require('axios');

var AnxApi = require('./api');

describe('Rate Limit Adapter', function() {

	var onRateLimitExceededStub;
	var onRateLimitPauseStub;
	var onRateLimitResumeStub;

	beforeAll(function() {
		onRateLimitExceededStub = jest.fn();
		onRateLimitPauseStub = jest.fn();
		onRateLimitResumeStub = jest.fn();
	});

	beforeEach(function() {
		onRateLimitExceededStub.mockReset();
		onRateLimitPauseStub.mockReset();
		onRateLimitResumeStub.mockReset();
	});

	it('should handle RateLimitExceededError', function() {

		axios.resolvesOnce({
			status: 405,
			headers: {
				'retry-after': '1',
				'x-ratelimit-read': '1000',
				'x-ratelimit-system': '1000-Default',
				'x-ratelimit-write': '1000',
			},
			body: {},
		}).resolvesOnce({
			status: 200,
			headers: {},
			body: {},
		});

		var api = new AnxApi({
			target: 'http://api.example.com',
			rateLimiting: true,
			onRateLimitExceeded: onRateLimitExceededStub,
			onRateLimitPause: onRateLimitPauseStub,
			onRateLimitResume: onRateLimitResumeStub,
		});

		expect.assertions(3);

		return api.get('/limit').then(function() {
			expect(onRateLimitExceededStub).toHaveBeenCalledTimes(1);
			expect(onRateLimitPauseStub).toHaveBeenCalledTimes(1);
			expect(onRateLimitResumeStub).toHaveBeenCalledTimes(1);
			return null;
		});

	});

	it('should handle non-standard RateLimitExceededError', function() {

		axios.resolvesOnce({
			status: 405,
			headers: {
				'x-ratelimit-read': '1000',
				'x-ratelimit-system': '1000-Default',
				'x-ratelimit-write': '1000',
			},
			body: {},
		});

		var api = new AnxApi({
			target: 'http://api.example.com',
			rateLimiting: true,
			onRateLimitExceeded: onRateLimitExceededStub,
			onRateLimitPause: onRateLimitPauseStub,
			onRateLimitResume: onRateLimitResumeStub,
		});

		expect.assertions(3);

		return api.get('/limit-bad').catch(function() {
			expect(onRateLimitExceededStub).toHaveBeenCalledTimes(1);
			expect(onRateLimitPauseStub).not.toHaveBeenCalled();
			expect(onRateLimitResumeStub).not.toHaveBeenCalled();
		});

	});

	it('should adapt up limits', function() {

		axios.resolvesOnce({
			status: 200,
			headers: {
				'x-ratelimit-read': '6',
				'x-ratelimit-system': '1000-Default',
				'x-ratelimit-write': '1000',
			},
			body: {},
		}).resolvesOnce({
			status: 200,
			headers: {},
			body: {},
		});

		var api = new AnxApi({
			target: 'http://api.example.com',
			rateLimiting: true,
			rateLimitReadSeconds: 1,
			onRateLimitExceeded: onRateLimitExceededStub,
			onRateLimitPause: onRateLimitPauseStub,
			onRateLimitResume: onRateLimitResumeStub,
		});

		expect.assertions(3);

		return api.get('/limit').then(function() {
			return api.get('/limit').then(function() {
				expect(onRateLimitExceededStub).not.toHaveBeenCalled();
				expect(onRateLimitPauseStub).not.toHaveBeenCalled();
				expect(onRateLimitResumeStub).not.toHaveBeenCalled();
				return null;
			});
		});

	});

	it('should adapt down limits', function() {

		axios.resolvesOnce({
			status: 200,
			headers: {
				'x-ratelimit-read': '1',
				'x-ratelimit-system': '1000-Default',
				'x-ratelimit-write': '1000',
			},
			body: {},
		}).resolvesOnce({
			status: 200,
			headers: {},
			body: {},
		});

		var api = new AnxApi({
			target: 'http://api.example.com',
			rateLimiting: true,
			rateLimitReadSeconds: 2,
			onRateLimitExceeded: onRateLimitExceededStub,
			onRateLimitPause: onRateLimitPauseStub,
			onRateLimitResume: onRateLimitResumeStub,
		});

		expect.assertions(3);

		return api.get('/limit').then(function() {
			return api.get('/limit').then(function() {
				expect(onRateLimitExceededStub).not.toHaveBeenCalled();
				expect(onRateLimitPauseStub).toHaveBeenCalledTimes(1);
				expect(onRateLimitResumeStub).toHaveBeenCalledTimes(1);
				return null;
			});
		});

	});

	it('should limit multiple requests', function() {

		axios.resolvesOnce({
			status: 200,
			headers: {},
			body: {},
		}).resolvesOnce({
			status: 200,
			headers: {},
			body: {},
		}).resolvesOnce({
			status: 200,
			headers: {},
			body: {},
		});

		var api = new AnxApi({
			target: 'http://api.example.com',
			rateLimiting: true,
			rateLimitRead: 1,
			rateLimitReadSeconds: 1,
			onRateLimitExceeded: onRateLimitExceededStub,
			onRateLimitPause: onRateLimitPauseStub,
			onRateLimitResume: onRateLimitResumeStub,
		});

		expect.assertions(3);

		return Promise.all([
			api.get('/limit'),
			api.get('/limit'),
			api.get('/limit'),
		]).then(function() {
			expect(onRateLimitExceededStub).not.toHaveBeenCalled();
			expect(onRateLimitPauseStub).toHaveBeenCalledTimes(2);
			expect(onRateLimitResumeStub).toHaveBeenCalledTimes(2);
			return;
		});

	});

});
