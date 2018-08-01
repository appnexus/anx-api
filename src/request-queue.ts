import _ from 'lodash';
import errors from './errors';

let DEFAULT_LIMIT = 60;
let DEFAULT_LIMIT_SECONDS = 60;
let DEFAULT_LIMIT_SECONDS_BUFFER = 1;
let DEFAULT_LIMIT_COUNT_BUFFER = 4;
let ONE_SECOND = 1000;
let DEFAULT_RATE_LIMIT_TIMEOUT = DEFAULT_LIMIT_SECONDS * ONE_SECOND;
let RETRY_AFTER_BUFFER_TIME = ONE_SECOND;

function RequestQueue(options) {
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

RequestQueue.prototype.enqueue = function _enqueue(opts) {
	let _self = this;
	return new Promise(function queuedPromise(resolve, reject) {
		_self.queue.push({
			opts,
			resolve,
			reject,
		});
		_self._processQueue();
	});
};

RequestQueue.prototype.dequeue = function _dequeue() {
	let _self = this;
	return _self.queue.shift();
};

RequestQueue.prototype.paused = function paused() {
	let _self = this;
	return !!_self.timeoutId;
};

RequestQueue.prototype._processQueue = function _processQueue(retryAfter) {
	let _self = this;
	if (_self.queue.length > 0) { // if items left to process
		if (_self.limitCount < Math.max(_self.options.limit - DEFAULT_LIMIT_COUNT_BUFFER, 1)) { // if not over limit
			_self.limitCount++;
			_self._execute(_self.dequeue());
			_self._processQueue();
		} else if (!_self.paused()) { // schedule
			_self.options.onRateLimitPause();
			_self._schedule(retryAfter);
		}
	}
};

RequestQueue.prototype._schedule = function _schedule(retryAfter) {
	let _self = this;
	if (!this.timeoutId) {
		let delay = Math.max(retryAfter || (this.expires - Date.now()), 0);
		_self.timeoutId = setTimeout(function scheduleRun() {
			_self._resetTimeout();
			_self.limitCount = 0;
			_self.options.onRateLimitResume();
			_self._processQueue();
		}, delay);
	}
};

RequestQueue.prototype._resetTimeout = function _resetTimeout() {
	let _self = this;
	if (this.timeoutId) {
		clearTimeout(_self.timeoutId);
		_self.timeoutId = null;
	}
	_self.expires = Date.now() + ((_self.options.limitSeconds + DEFAULT_LIMIT_SECONDS_BUFFER) * ONE_SECOND);
};

RequestQueue.prototype._execute = function _execute(reqInfo) {
	let _self = this;
	return _self.options.request(reqInfo.opts).then(function success(res) {
		_self._checkHeaders(res);
		return reqInfo.resolve(res);
	}).catch(function failure(err) {
		if (err instanceof errors.RateLimitExceededError) {
			_self.options.onRateLimitExceeded(err);
			if (_.isNil(err.retryAfter)) {
				// Abort retry due to missing retryAfter
				return reqInfo.reject(err);
			}
			let retryAfter = err.retryAfter ? (err.retryAfter * ONE_SECOND) + RETRY_AFTER_BUFFER_TIME : DEFAULT_RATE_LIMIT_TIMEOUT;
			_self.limitCount = Infinity;
			_self.queue.push(reqInfo);
			_self._processQueue(retryAfter);
		} else {
			return reqInfo.reject(err);
		}
	});
};

RequestQueue.prototype._checkHeaders = function _checkHeaders(res) {
	let _self = this;
	if (res.headers[_self.options.limitHeader]) {
		let limit = parseInt(res.headers[_self.options.limitHeader], 10) || DEFAULT_LIMIT;
		if (limit !== _self.options.limit) {
			_self.options.limit = limit;
			_self._resetTimeout();
			_self._processQueue();
		}
	}
};

module.exports = RequestQueue;
