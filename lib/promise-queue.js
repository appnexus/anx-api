var _ = require('lodash');
var errors = require('./errors');

var DEFAULT_LIMIT = 60;
var DEFAULT_LIMIT_SECONDS = 60;
var DEFAULT_LIMIT_BUFFER = 0;
var DEFAULT_RATE_LIMIT_TIMEOUT = 5000;

function PromiseQueue(options) {
	this.options = _.assign({
		request: null,
		limit: DEFAULT_LIMIT,
		limitSeconds: DEFAULT_LIMIT_SECONDS,
		limitHeader: '',
		onRateLimitExceeded: _.noop,
		onPause: _.noop,
		onResume: _.noop
	}, options);
	this.queue = [];
	this.startTime = Date.now();
	this.requestCount = 0;
	this.timeoutId = null;
}

PromiseQueue.prototype.makeRequest = function _makeRequest(reqInfo) {
	var _self = this;
	return _self.options.request(reqInfo.opts).then(function success(res) {
		_self.processRequestHeaders(res);
		reqInfo.resolve(res);
	}, function failure(err) {
		if (err instanceof errors.RateLimitExceededError) {
			_self.retry(reqInfo);
			if (!_self.timeoutId) {
				_self.options.onRateLimitExceeded();
				_self.scheduleProcessQueue(DEFAULT_RATE_LIMIT_TIMEOUT);
			}
		} else {
			reqInfo.reject(err);
		}
	});
};

PromiseQueue.prototype.processQueue = function _processQueue() {
	var _self = this;
	if (!_self.timeoutId) {
		var timeNow = Date.now();

		// Expire Interval
		if (timeNow - _self.startTime > _self.options.limitSeconds * 1000) {
			_self.startTime = timeNow;
			_self.requestCount = 0;
		}

		// Execute Request
		if (_self.queue.length > 0) {
			if (_self.requestCount < _self.options.limit - DEFAULT_LIMIT_BUFFER) {
				_self.requestCount = _self.requestCount + 1;
				_self.makeRequest(_self.queue.shift());
				_.defer(_self.processQueue.bind(_self));
			} else {
				// Let Timeout Expire
				_self.scheduleProcessQueue();
			}
		}
	}
};

PromiseQueue.prototype.scheduleProcessQueue = function _schedule(timeout) {
	var _self = this;
	var timeNow = Date.now();
	var elapsed = timeNow - _self.startTime;
	var timeoutDelay = timeout || (_self.options.limitSeconds * 1000) - elapsed;

	if (timeoutDelay > 0) {
		_self.options.onPause(timeoutDelay);

		_self.timeoutId = setTimeout(function runProcessQueue() {
			_self.options.onResume();
			_self.timeoutId = null;
			_self.processQueue();
		}, timeoutDelay);
	} else {
		_self.processQueue();
	}
};

PromiseQueue.prototype.retry = function _promiseQueuePush(info) {
	var _self = this;
	_self.queue.unshift(info);
	_self.processQueue();
};

PromiseQueue.prototype.push = function _push(opts) {
	var _self = this;
	return new Promise(function queuedPromise(resolve, reject) {
		var reqInfo = { opts: opts, resolve: resolve, reject: reject };
		_self.queue.push(reqInfo);
		_self.processQueue();
	});
};

PromiseQueue.prototype.processRequestHeaders = function _processRequestHeaders(res) {
	var _self = this;
	if (res.headers[_self.options.limitHeader]) {
		var newLimit = parseInt(res.headers[_self.options.limitHeader], 10);
		if (newLimit > 0 && newLimit !== _self.options.limit) {
			_self.options.limit = newLimit;
			if (_self.timeoutId) { // There is a pending process reads
				clearTimeout(_self.timeoutId);
				_self.scheduleProcessQueue();
			}
		}
	}
};

module.exports = PromiseQueue;
