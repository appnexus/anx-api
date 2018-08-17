import * as _ from 'lodash';
import { IRequestOptions } from './api';
import { RateLimitExceededError } from './errors';

const DEFAULT_LIMIT = 60;
const DEFAULT_LIMIT_SECONDS = 60;
const DEFAULT_LIMIT_SECONDS_BUFFER = 1;
const DEFAULT_LIMIT_COUNT_BUFFER = 4;
const ONE_SECOND = 1000;
const DEFAULT_RATE_LIMIT_TIMEOUT = DEFAULT_LIMIT_SECONDS * ONE_SECOND;
const RETRY_AFTER_BUFFER_TIME = ONE_SECOND;

export interface IRequestQueueOptions {
	request: any;
	limit: number;
	limitSeconds: number;
	limitHeader: string;
	onRateLimitExceeded: (err: RateLimitExceededError) => any;
	onRateLimitPause: () => any;
	onRateLimitResume: () => any;
}

export interface IRequestQueueItem {
	opts: IRequestOptions;
	resolve: (value?: void | PromiseLike<void>) => void;
	reject: (reason?: any) => void;
}

export class RequestQueue {
	private options: IRequestQueueOptions;
	private queue: IRequestQueueItem[];
	private limitCount: number;
	private expires: number;
	private timeoutId: any;

	constructor(options: IRequestQueueOptions) {
		this.options = _.assign({
			request: null,
			limit: DEFAULT_LIMIT,
			limitSeconds: DEFAULT_LIMIT_SECONDS,
			onRateLimitExceeded: _.noop,
			onRateLimitPause: _.noop,
			onRateLimitResume: _.noop,
		}, options);
		this.queue = [];
		this.limitCount = 0;
		this._resetTimeout();
	}

	public enqueue(opts: IRequestOptions): Promise<void> {
		return new Promise((resolve, reject) => {
			this.queue.push({
				opts,
				resolve,
				reject,
			});
			this._processQueue();
		});
	}

	public dequeue(): IRequestQueueItem {
		return this.queue.shift();
	}

	public paused(): boolean {
		return !!this.timeoutId;
	}

	private _processQueue(retryAfter?: number): void {
		if (this.queue.length > 0) { // if items left to process
			if (this.limitCount < Math.max(this.options.limit - DEFAULT_LIMIT_COUNT_BUFFER, 1)) { // if not over limit
				this.limitCount++;
				this._execute(this.dequeue());
				this._processQueue();
			} else if (!this.paused()) { // schedule
				this.options.onRateLimitPause();
				this._schedule(retryAfter);
			}
		}
	}

	private _schedule(retryAfter?: number): void {
		if (!this.timeoutId) {
			const delay = Math.max(retryAfter || (this.expires - Date.now()), 0);
			this.timeoutId = setTimeout(() => {
				this._resetTimeout();
				this.limitCount = 0;
				this.options.onRateLimitResume();
				this._processQueue();
			}, delay);
		}
	}

	private _resetTimeout(): void {
		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
			this.timeoutId = null;
		}
		this.expires = Date.now() + ((this.options.limitSeconds + DEFAULT_LIMIT_SECONDS_BUFFER) * ONE_SECOND);
	}

	private _execute(reqInfo: IRequestQueueItem): () => any {
		return this.options.request(reqInfo.opts).then((res) => {
			this._checkHeaders(res);
			return reqInfo.resolve(res);
		}).catch((err) => {
			if (err instanceof RateLimitExceededError) {
				this.options.onRateLimitExceeded(err);
				if (_.isNil(err.retryAfter)) {
					// Abort retry due to missing retryAfter
					return reqInfo.reject(err);
				}
				const retryAfter = err.retryAfter ? (err.retryAfter * ONE_SECOND) + RETRY_AFTER_BUFFER_TIME : DEFAULT_RATE_LIMIT_TIMEOUT;
				this.limitCount = Infinity;
				this.queue.push(reqInfo);
				this._processQueue(retryAfter);
			} else {
				return reqInfo.reject(err);
			}
		});
	}

	private _checkHeaders(res: any): void {
		if (res.headers[this.options.limitHeader]) {
			const limit = parseInt(res.headers[this.options.limitHeader], 10) || DEFAULT_LIMIT;
			if (limit !== this.options.limit) {
				this.options.limit = limit;
				this._resetTimeout();
				this._processQueue();
			}
		}
	}
}
