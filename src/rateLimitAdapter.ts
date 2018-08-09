import * as _ from 'lodash';
import { RequestQueue } from './request-queue';

const DEFAULT_READ_LIMIT = 100;
const DEFAULT_READ_LIMIT_SECONDS = 60;
const DEFAULT_READ_LIMIT_HEADER = 'x-ratelimit-read';
const DEFAULT_WRITE_LIMIT = 60;
const DEFAULT_WRITE_LIMIT_SECONDS = 60;
const DEFAULT_WRITE_LIMIT_HEADER = 'x-ratelimit-write';

// Rate Limit Options:
// request
// rateLimitRead
// rateLimitReadSeconds
// rateLimitWrite
// rateLimitWriteSeconds
// onRateLimitExceeded
// onRateLimitPause
// onRateLimitResume

export const rateLimitAdapter = (options): (opts: any) => Promise<void> => {
	const readQueue = new RequestQueue({
		request: options.request,
		limit: options.rateLimitRead || DEFAULT_READ_LIMIT,
		limitSeconds: options.rateLimitReadSeconds || DEFAULT_READ_LIMIT_SECONDS,
		limitHeader: DEFAULT_READ_LIMIT_HEADER,
		onRateLimitExceeded: _.partial(options.onRateLimitExceeded || _.noop, 'READ'),
		onRateLimitPause: _.partial(options.onRateLimitPause || _.noop, 'READ'),
		onRateLimitResume: _.partial(options.onRateLimitResume || _.noop, 'READ'),
	});

	const writeQueue = new RequestQueue({
		request: options.request,
		limit: options.rateLimitWrite || DEFAULT_WRITE_LIMIT,
		limitSeconds: options.rateLimitWriteSeconds || DEFAULT_WRITE_LIMIT_SECONDS,
		limitHeader: DEFAULT_WRITE_LIMIT_HEADER,
		onRateLimitExceeded: _.partial(options.onRateLimitExceeded || _.noop, 'WRITE'),
		onRateLimitPause: _.partial(options.onRateLimitPause || _.noop, 'WRITE'),
		onRateLimitResume: _.partial(options.onRateLimitResume || _.noop, 'WRITE'),
	});
	return (opts) => {
		return opts.method === 'GET' ? readQueue.enqueue(opts) : writeQueue.enqueue(opts);
	};
};
