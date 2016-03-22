var _ = require('lodash');
// var anxErrors = require('./errors');
var PromiseQueue = require('./promise-queue');

var DEFAULT_READ_LIMIT = 100;
var DEFAULT_READ_LIMIT_SECONDS = 60;
var DEFAULT_READ_LIMIT_HEADER = 'x-ratelimit-read';
var DEFAULT_WRITE_LIMIT = 60;
var DEFAULT_WRITE_LIMIT_SECONDS = 60;
var DEFAULT_WRITE_LIMIT_HEADER = 'x-ratelimit-write';

module.exports = function rateLimitAdapter(options) {
	this.readQueue = new PromiseQueue({
		request: options.request,
		limit: DEFAULT_READ_LIMIT,
		limitSeconds: DEFAULT_READ_LIMIT_SECONDS,
		limitHeader: DEFAULT_READ_LIMIT_HEADER,
		onRateLimitExceeded: _.partial(options.onRateLimitExceeded || _.noop, 'READ'),
		onPause: _.partial(options.onPause || _.noop, 'READ'),
		onResume: _.partial(options.onResume || _.noop, 'READ')
	});

	this.writeQueue = new PromiseQueue({
		request: options.request,
		limit: DEFAULT_WRITE_LIMIT,
		limitSeconds: DEFAULT_WRITE_LIMIT_SECONDS,
		limitHeader: DEFAULT_WRITE_LIMIT_HEADER,
		onRateLimitExceeded: _.partial(options.onRateLimitExceeded || _.noop, 'READ'),
		onPause: _.partial(options.onPause || _.noop, 'READ'),
		onResume: _.partial(options.onResume || _.noop, 'READ')
	});

	return function rateLimitedRequest(opts) {
		return opts.method === 'GET' ? readQueue.push(opts) : writeQueue.push(opts);
	};
};
