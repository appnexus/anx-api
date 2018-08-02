import * as _ from 'lodash';
import { IRequestOptions } from './api';

function ConcurrencyQueue(options) {
	this.options = _.assign({}, options);
	this.queue = [];
	this.running = [];
}

ConcurrencyQueue.prototype.push = function _push(opts) {
	const _self = this;
	if (_self.running.length < _self.options.limit) {
		const requestPromise = _self.options.request(opts).then(function success(res) {
			_self.finished(requestPromise);
			return res;
		}, function failure(err) {
			_self.finished(requestPromise);
			throw err;
		});
		_self.running.push(requestPromise);
		return requestPromise;
	}
	return new Promise(function queuedPromise(resolve, reject) {
		const reqInfo = { opts, resolve, reject };
		_self.queue.push(reqInfo);
	});
};

ConcurrencyQueue.prototype.finished = function _finished(requestPromise) {
	const _self = this;
	_.remove(_self.running, requestPromise);
	if (_self.queue.length > 0) {
		_self.makeRequest(_self.queue.shift());
	}
};

ConcurrencyQueue.prototype.makeRequest = function _makeRequest(reqInfo) {
	const _self = this;
	const requestPromise = _self.options.request(reqInfo.opts).then(function success(res) {
		_self.finished(requestPromise);
		reqInfo.resolve(res);
		return null;
	}, function failure(err) {
		_self.finished(requestPromise);
		reqInfo.reject(err);
	});
	_self.running.push(requestPromise);
};

export default function concurrencyAdapter(options) {
	const concurrencyQueue = new ConcurrencyQueue(options);
	return function concurrencyLimitedRequest(opts) {
		return concurrencyQueue.push(opts);
	};
}
