import _ from 'lodash';

function ConcurrencyQueue(options) {
	this.options = _.assign({}, options);
	this.queue = [];
	this.running = [];
}

ConcurrencyQueue.prototype.push = function _push(opts) {
	let _self = this;
	if (_self.running.length < _self.options.limit) {
		let requestPromise = _self.options.request(opts).then(function success(res) {
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
		let reqInfo = { opts, resolve, reject };
		_self.queue.push(reqInfo);
	});
};

ConcurrencyQueue.prototype.finished = function _finished(requestPromise) {
	let _self = this;
	_.remove(_self.running, requestPromise);
	if (_self.queue.length > 0) {
		_self.makeRequest(_self.queue.shift());
	}
};

ConcurrencyQueue.prototype.makeRequest = function _makeRequest(reqInfo) {
	let _self = this;
	let requestPromise = _self.options.request(reqInfo.opts).then(function success(res) {
		_self.finished(requestPromise);
		reqInfo.resolve(res);
		return null;
	}, function failure(err) {
		_self.finished(requestPromise);
		reqInfo.reject(err);
	});
	_self.running.push(requestPromise);
};

module.exports = function concurrencyAdapter(options) {
	let concurrencyQueue = new ConcurrencyQueue(options);
	return function concurrencyLimitedRequest(opts) {
		return concurrencyQueue.push(opts);
	};
};
