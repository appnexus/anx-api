/* eslint func-names: 0, padded-blocks: 0 */

var _ = require('lodash');
var sinon = require('sinon');
var axios = require('axios');

var AnxApi = require('./api');

describe('Rate Limit Adapter', function() {

	var onRateLimitExceededStub;
	var onRateLimitPauseStub;
	var onRateLimitResumeStub;

	beforeAll(function() {
		onRateLimitExceededStub = sinon.stub();
		onRateLimitPauseStub = sinon.stub();
		onRateLimitResumeStub = sinon.stub();
	});

	beforeEach(function() {
		onRateLimitExceededStub.reset();
		onRateLimitPauseStub.reset();
		onRateLimitResumeStub.reset();
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
			expect(onRateLimitExceededStub.calledOnce, 'onRateLimitExceededStub called once').toBe(true);
			expect(onRateLimitPauseStub.calledOnce, 'onRateLimitPauseStub called once').toBe(true);
			expect(onRateLimitResumeStub.calledOnce, 'onRateLimitResumeStub called once').toBe(true);
			return null;
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

		// expect.assertions(3);

		return api.get('/limit').then(function() {
			return api.get('/limit').then(function() {
				expect(onRateLimitExceededStub.calledOnce, 'onRateLimitExceededStub called once').toBe(false);
				expect(onRateLimitPauseStub.calledOnce, 'onRateLimitPauseStub called once').toBe(false);
				expect(onRateLimitResumeStub.calledOnce, 'onRateLimitResumeStub called once').toBe(false);
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
				expect(onRateLimitExceededStub.calledOnce, 'onRateLimitExceededStub called once').toBe(false);
				expect(onRateLimitPauseStub.calledOnce, 'onRateLimitPauseStub called once').toBe(true);
				expect(onRateLimitResumeStub.calledOnce, 'onRateLimitResumeStub called once').toBe(true);
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
			expect(onRateLimitExceededStub.calledOnce, 'onRateLimitExceededStub called once').toBe(false);
			expect(onRateLimitPauseStub.calledTwice, 'onRateLimitPauseStub called once twice').toBe(true);
			expect(onRateLimitResumeStub.calledTwice, 'onRateLimitResumeStub called twice').toBe(true);
		});

	});

});
