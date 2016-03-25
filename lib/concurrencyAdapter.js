var _ = require('lodash');

function ConcurrencyQueue(options) {
	this.options = _.assign({}, options);
	this.queue = [];
	this.running = [];
}

ConcurrencyQueue.prototype.push = function _push(opts) {
	var _self = this;
	if (_self.running.length < _self.options.limit) {
		var requestPromise = _self.options.request(opts).then(function success(res) {
			_self.finished(requestPromise);
			return res;
		}, function failure(err) {
			_self.finished(requestPromise);
			throw err;
		});
		_self.running.push(requestPromise);
		return requestPromise;
	} else {
		return new Promise(function queuedPromise(resolve, reject) {
			var reqInfo = { opts: opts, resolve: resolve, reject: reject };
			_self.queue.push(reqInfo);
		});
	}
};

ConcurrencyQueue.prototype.finished = function _finished(requestPromise) {
	var _self = this;
	_.remove(_self.running, requestPromise);
	if (_self.queue.length > 0) {
		_self.makeRequest(_self.queue.shift());
	}
};

ConcurrencyQueue.prototype.makeRequest = function _makeRequest(reqInfo) {
	var _self = this;
	var requestPromise = _self.options.request(reqInfo.opts).then(function success(res) {
		_self.finished(requestPromise);
		reqInfo.resolve(res);
	}, function failure(err) {
		_self.finished(requestPromise);
		reqInfo.reject(err);
	});
	_self.running.push(requestPromise);
};

module.exports = function concurrencyAdapter(options) {
	var concurrencyQueue = new ConcurrencyQueue(options);
	return function concurrencyLimitedRequest(opts) {
		return concurrencyQueue.push(opts);
	};
};
