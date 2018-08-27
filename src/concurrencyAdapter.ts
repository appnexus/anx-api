import * as _ from 'lodash';
import { IRequestOptions } from './api';
import { IRequestQueueItem } from './request-queue';

export interface IConcurrencyQueueOptions {
	limit: number;
	request: (opts: any) => any;
}
export class ConcurrencyQueue {
	private options: IConcurrencyQueueOptions;
	private queue: IRequestQueueItem[];
	private running: IRequestQueueItem[];

	constructor(options: IConcurrencyQueueOptions) {
		this.options = _.assign({}, options);
		this.queue = [];
		this.running = [];
	}

	public push(opts: IRequestOptions): Promise<any> {
		if (this.running.length < this.options.limit) {
			const requestPromise = this.options.request(opts).then((res) => {
				this.finished(requestPromise);
				return res;
			}, (err) => {
				this.finished(requestPromise);
				throw err;
			});
			this.running.push(requestPromise);
			return requestPromise;
		}
		return new Promise((resolve, reject) => {
			const reqInfo: IRequestQueueItem = { opts, resolve, reject };
			this.queue.push(reqInfo);
		});
	}

	public finished(requestPromise: IRequestQueueItem): void {
		_.remove(this.running, requestPromise);
		if (this.queue.length > 0) {
			this.makeRequest(this.queue.shift());
		}
	}

	public makeRequest(reqInfo: IRequestQueueItem): void {
		const requestPromise = this.options.request(reqInfo.opts).then((res) => {
			this.finished(requestPromise);
			reqInfo.resolve(res);
			return null;
		}).catch((err) => {
			this.finished(requestPromise);
			reqInfo.reject(err);
		});
		this.running.push(requestPromise);
	}

}

export const concurrencyAdapter = (options: IConcurrencyQueueOptions) => (opts: IRequestOptions): Promise<any> => {
	const concurrencyQueue = new ConcurrencyQueue(options);
	return concurrencyQueue.push(opts);
};
