import * as _ from 'lodash';
import { IConfig } from './api';

export class ConcurrencyQueue{
	private options: any;
	private queue: any[];
	private running: any[];

	constructor(options: IConfig) {
		this.options = _.assign({}, options);
		this.queue = [];
		this.running = [];
	}

	public push(opts) {
		if (this.running.length < this.options.limit) {
			const requestPromise = this.options.request(opts).then(function success(res) {
				this.finished(requestPromise);
				return res;
			}, function failure(err) {
				this.finished(requestPromise);
				throw err;
			});
			this.running.push(requestPromise);
			return requestPromise;
		}
		return new Promise((resolve, reject) => {
			const reqInfo = { opts, resolve, reject };
			this.queue.push(reqInfo);
		});
	}

	public finished(requestPromise) {
		_.remove(this.running, requestPromise);
		if (this.queue.length > 0) {
			this.makeRequest(this.queue.shift());
		}
	}

	public makeRequest(reqInfo) {
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

export const concurrencyAdapter = (options) => (opts): ConcurrencyQueue => {
	const concurrencyQueue = new ConcurrencyQueue(options);
	return concurrencyQueue.push(opts);
};
