import * as _ from 'lodash';
import { IRequestOptionsInternal } from './api';
import { RequestQueue } from './request-queue';
import { IResponse } from './types';

const DEFAULT_READ_LIMIT = 100;
const DEFAULT_READ_LIMIT_SECONDS = 60;
const DEFAULT_READ_LIMIT_HEADER = 'x-ratelimit-read';
const DEFAULT_WRITE_LIMIT = 60;
const DEFAULT_WRITE_LIMIT_SECONDS = 60;
const DEFAULT_WRITE_LIMIT_HEADER = 'x-ratelimit-write';

export interface IRateLimitAdapterOptions {
	request: (opts: IRequestOptionsInternal) => Promise<IResponse>;
	rateLimitRead?: number;
	rateLimitReadSeconds?: number;
	rateLimitWrite?: number;
	rateLimitWriteSeconds?: number;
	onRateLimitExceeded?: (err: any) => any;
	onRateLimitPause?: () => any;
	onRateLimitResume?: () => any;
}

export const rateLimitAdapter = (options: IRateLimitAdapterOptions): ((opts: IRequestOptionsInternal) => Promise<void>) => {
	const readQueue: RequestQueue = new RequestQueue({
		request: options.request,
		limit: options.rateLimitRead || DEFAULT_READ_LIMIT,
		limitSeconds: options.rateLimitReadSeconds || DEFAULT_READ_LIMIT_SECONDS,
		limitHeader: DEFAULT_READ_LIMIT_HEADER,
		onRateLimitExceeded: _.partial(options.onRateLimitExceeded || _.noop, 'READ'),
		onRateLimitPause: _.partial(options.onRateLimitPause || _.noop, 'READ'),
		onRateLimitResume: _.partial(options.onRateLimitResume || _.noop, 'READ'),
	});

	const writeQueue: RequestQueue = new RequestQueue({
		request: options.request,
		limit: options.rateLimitWrite || DEFAULT_WRITE_LIMIT,
		limitSeconds: options.rateLimitWriteSeconds || DEFAULT_WRITE_LIMIT_SECONDS,
		limitHeader: DEFAULT_WRITE_LIMIT_HEADER,
		onRateLimitExceeded: _.partial(options.onRateLimitExceeded || _.noop, 'WRITE'),
		onRateLimitPause: _.partial(options.onRateLimitPause || _.noop, 'WRITE'),
		onRateLimitResume: _.partial(options.onRateLimitResume || _.noop, 'WRITE'),
	});
	return (opts: IRequestOptionsInternal): Promise<void> => {
		return opts.method === 'GET' ? readQueue.enqueue(opts) : writeQueue.enqueue(opts);
	};
};
