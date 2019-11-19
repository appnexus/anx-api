import * as _ from 'lodash';
import { IRequestOptionsInternal } from './api';
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

	public push(opts: IRequestOptionsInternal): Promise<any> {
		return new Promise((resolve, reject) => {
			const reqInfo: IRequestQueueItem = { opts, resolve, reject };
			this.queue.push(reqInfo);
			if (this.running.length < this.options.limit) {
				this.makeRequest(this.queue.shift());
			}
		});
	}

	private finished(requestPromise: IRequestQueueItem): void {
		_.remove(this.running, requestPromise);
		if (this.queue.length > 0) {
			this.makeRequest(this.queue.shift());
		}
	}

	private makeRequest(reqInfo: IRequestQueueItem): void {
		this.options
			.request(reqInfo.opts)
			.then((res) => {
				this.finished(reqInfo);
				reqInfo.resolve(res);
				return null;
			})
			.catch((err) => {
				this.finished(reqInfo);
				reqInfo.reject(err);
			});
		this.running.push(reqInfo);
	}
}

export const concurrencyAdapter = (options: IConcurrencyQueueOptions) => {
	const concurrencyQueue = new ConcurrencyQueue(options);
	return (opts: IRequestOptionsInternal): Promise<any> => {
		return concurrencyQueue.push(opts);
	};
};
