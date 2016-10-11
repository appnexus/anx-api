var _ = require('lodash');
var errors = require('./errors');

var DEFAULT_LIMIT = 60;
var DEFAULT_LIMIT_SECONDS = 60;
var DEFAULT_LIMIT_BUFFER = 4;
var DEFAULT_RATE_LIMIT_TIMEOUT = 5000;
var RETRY_AFTER_HEADER = 'retry-after';
var RETRY_AFTER_BUFFER_TIME = 1;

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

PromiseQueue.prototype._makeRequest = function _makeRequest(reqInfo) {
	var _self = this;
	return _self.options.request(reqInfo.opts).then(function success(res) {
		_self.processRequestHeaders(res);
		reqInfo.resolve(res);
	}, function failure(err) {
		if (err instanceof errors.RateLimitExceededError) {
			_self.retry(reqInfo);
			if (!_self.timeoutId) {
				_self.options.onRateLimitExceeded();
				var retryAfter = parseInt(err.res.headers[RETRY_AFTER_HEADER], 10);
				retryAfter = retryAfter ? (retryAfter + RETRY_AFTER_BUFFER_TIME) * 1000 : DEFAULT_RATE_LIMIT_TIMEOUT;
				_self._scheduleProcessQueue(retryAfter);
			}
		} else {
			reqInfo.reject(err);
		}
	});
};

PromiseQueue.prototype._processQueue = function __processQueue() {
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
				_self._makeRequest(_self.dequeue());
			} else {
				// Let Timeout Expire
				_self._scheduleProcessQueue();
			}
		}
	}
};

PromiseQueue.prototype._scheduleProcessQueue = function __scheduleProcessQueue(timeout) {
	var _self = this;
	var timeNow = Date.now();
	var elapsed = timeNow - _self.startTime;
	var timeoutDelay = timeout || (_self.options.limitSeconds * 1000) - elapsed;

	if (timeoutDelay > 100) {
		_self.options.onPause(timeoutDelay);

		_self.timeoutId = setTimeout(function runProcessQueue() {
			_self.options.onResume();
			_self.timeoutId = null;
			_self._processQueue();
		}, timeoutDelay);
	} else {
		_self._processQueue();
	}
};

PromiseQueue.prototype.dequeue = function _dequeue() {
	var _self = this;
	_self.queue.unshift(info);
	_self.processQueue();
};

PromiseQueue.prototype.enqueue = function _enqueue(opts) {
	var _self = this;
	return new Promise(function queuedPromise(resolve, reject) {
		var reqInfo = { opts: opts, resolve: resolve, reject: reject };
		_self.queue.push(reqInfo);
		_self._processQueue();
	});
};

PromiseQueue.prototype.processRequestHeaders = function _processRequestHeaders(res) {
	var _self = this;
	if (res.headers[_self.options.limitHeader]) {
		var newLimit = parseInt(res.headers[_self.options.limitHeader], 10);
		if (newLimit > 0 && newLimit !== _self.options.limit) {
			_self.options.limit = newLimit;
			if (_self.timeoutId) {
				clearTimeout(_self.timeoutId);
				_self._scheduleProcessQueue();
			}
		}
	}
};

module.exports = PromiseQueue;
