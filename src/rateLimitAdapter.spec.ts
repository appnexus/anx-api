/* eslint func-names: 0, padded-blocks: 0 */
let axios = require('axios');

let AnxApi = require('./api');

describe('Rate Limit Adapter', () => {

	let onRateLimitExceededStub;
	let onRateLimitPauseStub;
	let onRateLimitResumeStub;

	beforeAll(() => {
		onRateLimitExceededStub = jest.fn();
		onRateLimitPauseStub = jest.fn();
		onRateLimitResumeStub = jest.fn();
	});

	beforeEach(() => {
		onRateLimitExceededStub.mockReset();
		onRateLimitPauseStub.mockReset();
		onRateLimitResumeStub.mockReset();
	});

	it('should handle RateLimitExceededError', () => {

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

		let api = new AnxApi({
			target: 'http://api.example.com',
			rateLimiting: true,
			onRateLimitExceeded: onRateLimitExceededStub,
			onRateLimitPause: onRateLimitPauseStub,
			onRateLimitResume: onRateLimitResumeStub,
		});

		expect.assertions(3);

		return api.get('/limit').then(() => {
			expect(onRateLimitExceededStub).toHaveBeenCalledTimes(1);
			expect(onRateLimitPauseStub).toHaveBeenCalledTimes(1);
			expect(onRateLimitResumeStub).toHaveBeenCalledTimes(1);
			return null;
		});

	});

	it('should handle non-standard RateLimitExceededError', () => {

		axios.resolvesOnce({
			status: 405,
			headers: {
				'x-ratelimit-read': '1000',
				'x-ratelimit-system': '1000-Default',
				'x-ratelimit-write': '1000',
			},
			body: {},
		});

		let api = new AnxApi({
			target: 'http://api.example.com',
			rateLimiting: true,
			onRateLimitExceeded: onRateLimitExceededStub,
			onRateLimitPause: onRateLimitPauseStub,
			onRateLimitResume: onRateLimitResumeStub,
		});

		expect.assertions(3);

		return api.get('/limit-bad').catch(() => {
			expect(onRateLimitExceededStub).toHaveBeenCalledTimes(1);
			expect(onRateLimitPauseStub).not.toHaveBeenCalled();
			expect(onRateLimitResumeStub).not.toHaveBeenCalled();
		});

	});

	it('should adapt up limits', () => {

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

		let api = new AnxApi({
			target: 'http://api.example.com',
			rateLimiting: true,
			rateLimitReadSeconds: 1,
			onRateLimitExceeded: onRateLimitExceededStub,
			onRateLimitPause: onRateLimitPauseStub,
			onRateLimitResume: onRateLimitResumeStub,
		});

		expect.assertions(3);

		return api.get('/limit').then(() => {
			return api.get('/limit').then(() => {
				expect(onRateLimitExceededStub).not.toHaveBeenCalled();
				expect(onRateLimitPauseStub).not.toHaveBeenCalled();
				expect(onRateLimitResumeStub).not.toHaveBeenCalled();
				return null;
			});
		});

	});

	it('should adapt down limits', () => {

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

		let api = new AnxApi({
			target: 'http://api.example.com',
			rateLimiting: true,
			rateLimitReadSeconds: 2,
			onRateLimitExceeded: onRateLimitExceededStub,
			onRateLimitPause: onRateLimitPauseStub,
			onRateLimitResume: onRateLimitResumeStub,
		});

		expect.assertions(3);

		return api.get('/limit').then(() => {
			return api.get('/limit').then(() => {
				expect(onRateLimitExceededStub).not.toHaveBeenCalled();
				expect(onRateLimitPauseStub).toHaveBeenCalledTimes(1);
				expect(onRateLimitResumeStub).toHaveBeenCalledTimes(1);
				return null;
			});
		});

	});

	it('should limit multiple requests', () => {

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

		let api = new AnxApi({
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
		]).then(() => {
			expect(onRateLimitExceededStub).not.toHaveBeenCalled();
			expect(onRateLimitPauseStub).toHaveBeenCalledTimes(2);
			expect(onRateLimitResumeStub).toHaveBeenCalledTimes(2);
			return;
		});

	});

});
