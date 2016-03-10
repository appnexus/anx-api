var _ = require('lodash');

var url = require('url');
var axiosAdapter = require('../lib/axiosAdapter');
var Promise = require('q').Promise;
var packageJson = require('../package.json');
var query = require('qs');
var anxErrors = require('./errors');

function _hasValue(value) {
	return !(_.isNull(value) || _.isUndefined(value));
}

function _isInteger(value) {
	return parseInt(value, 10) === +value;
}

function _normalizeOpts(opts) {
	return _.isString(opts) ? {
		uri: opts
	} : _.cloneDeep(opts) || {};
}

function _statusOk(body) {
	return !!body && !!body.response && body.response.status === 'OK';
}

function Api(config) {
	this._config = _.defaults({}, config, {
		request: axiosAdapter,
		userAgent: 'anx-api/' + packageJson.version,
		headers: {},
		target: null,
		token: null
	});
}

// Bind error types on the Api namespace
anxErrors.extend(Api);

Api.prototype._request = function _request(opts) {
	var _self = this;

	if (_self._config.beforeRequest) {
		opts = _.assign({}, _self._config.beforeRequest(opts));
	}
	return new Promise(function (resolve, reject) {
		var params;
		var startTime = new Date().getTime();

		if (_.isEmpty(_self._config.target)) {
			return reject(new Api.TargetError('Target not set'));
		}

		// Validate Opts
		_.forEach(_.pick(opts, ['startElement', 'numElements']), function (value, opt) {
			if (_hasValue(value) && !_isInteger(value)) {
				return reject(new Error('invalid ' + opt + ': ' + value));
			}
		});

		// Configure Options
		opts = _.defaults({}, opts, {
			rejectUnauthorized: false,
			headers: _.assign({}, _self._config.headers),
			params: {}
		});

		if (_self._config.userAgent) {
			opts.headers['User-Agent'] = _self._config.userAgent;
		}

		if (!opts.noAuth && !opts.auth && _self._config.token) {
			opts.headers.Authorization = _self._config.token;
		}

		opts.uri = url.resolve(_self._config.target, _.trimStart(opts.uri, '/'));

		// Configure Parameters
		if (_hasValue(opts.startElement)) {
			opts.params.start_element = +opts.startElement;
		}
		if (_hasValue(opts.numElements)) {
			opts.params.num_elements = +opts.numElements;
			opts.params.start_element = opts.params.start_element || 0; // startElement is required if numElements is set
		}

		params = decodeURIComponent(query.stringify(opts.params));

		if (params !== '') {
			opts.uri += (opts.uri.indexOf('?') === -1) ? '?' : '&';
			opts.uri += params;
		}

		return _self._config.request(opts).then(function (res) {
			res.requestTime = new Date().getTime() - startTime;
			if(res.statusCode >= 400) {
				return reject(Api.buildError(res));
			}

			// Temporary fix
			var errorId;
			var errorCode;
			if (res && res.body && res.body.response && res.body.response) {
				errorId = res.body.response.error_id;
				errorCode = res.body.response.error_code;
			}
			if (errorId === 'SYSTEM' && errorCode === 'SERVICE_UNAVAILABLE') {
				return reject(Api.buildError(res));
			}
			if (errorId === 'SYSTEM' && errorCode === 'UNKNOWN') {
				return reject(Api.buildError(res));
			}

			if (_self._config.afterRequest) {
				res = _.assign({}, res, _self._config.afterRequest(res));
			}
			return resolve(res);
		}).catch(reject);
	});
};

Api.prototype.request = function _request(opts) {
	opts = _normalizeOpts(opts);
	return this._request(opts);
};

Api.prototype.requestJson = function _request(opts) {
	opts = _normalizeOpts(opts);
	opts.json = true;
	return this._request(opts);
};

Api.prototype.get = function _get(opts) {
	opts = _normalizeOpts(opts);
	opts.method = 'GET';
	return this._request(opts);
};

Api.prototype.getJson = function _getJson(opts) {
	opts = _normalizeOpts(opts);
	opts.json = true;
	return this.get(opts);
};

Api.prototype.getAllJson = function _getAll(opts) {
	var _self = this;
	opts = _normalizeOpts(opts);

	return new Promise(function (resolve, reject) {
		var objs = [];
		var totalTime = 0;

		function _getJson(startElement) {
			opts.startElement = startElement;

			return _self.getJson(opts).then(function (res) {
				var response = res.body.response;
				var output_term = response.dbg_info.output_term;

				totalTime += response.dbg_info.time || 0;
				objs = objs.concat(response[output_term]);

				if (startElement >= response.count) {
					// Modify response
					response.start_element = 0;
					response.num_elements = objs.length;
					response.dbg_info.time = totalTime;
					response[output_term] = objs;
					return resolve(res);
				} else {
					return _getJson(startElement + response.num_elements);
				}
			}).catch(reject);
		}

		return _getJson(0);
	});
};

Api.prototype.post = function _post(opts, payload) {
	opts = _normalizeOpts(opts);
	opts.method = 'POST';
	if (payload) {
		opts.body = payload;
	}
	return this._request(opts);
};

Api.prototype.postJson = function _postJson(opts, payload) {
	opts = _normalizeOpts(opts);
	opts.json = true;
	return this.post(opts, payload);
};

Api.prototype.put = function _put(opts, payload) {
	opts = _normalizeOpts(opts);
	opts.method = 'PUT';
	if (payload) {
		opts.body = payload;
	}
	return this._request(opts);
};

Api.prototype.putJson = function _putJson(opts, payload) {
	opts = _normalizeOpts(opts);
	opts.json = true;
	return this.put(opts, payload);
};

Api.prototype.delete = function _delete(opts) {
	opts = _normalizeOpts(opts);
	opts.method = 'DELETE';
	return this._request(opts);
};

Api.prototype.deleteJson = function _deleteJson(opts) {
	opts = _normalizeOpts(opts);
	opts.json = true;
	return this.delete(opts);
};

Api.prototype.login = function _login(username, password) {
	var _self = this;
	return _self.postJson('/auth', {
		auth: {
			username: username,
			password: password
		}
	}).then(function (res) {
		if (res.statusCode === 200 && Api.statusOk(res.body)) {
			_self._config.token = res.body.response.token;
			return _self._config.token;
		} else {
			throw Api.buildError(res); // should this return a promise with a reject error?
		}
	});
};

Api.prototype.switchUser = function _switchUser(userId) {
	var _self = this;
	return _self.postJson('/auth', {
		auth: {
			switch_to_user: userId
		}
	});
};

Api.statusOk = _statusOk;

module.exports = Api;
