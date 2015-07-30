var _ = require('lodash');
var util = require('util');
var url = require('url');
var request = require('./request');
var Promise = require('q').Promise;
var packageJson = require('../package.json');
var query = require('qs');

function _hasValue(value) {
	return !(_.isNull(value) || _.isUndefined(value));
}

function _isInteger(value) {
	return parseInt(value, 10) === +value;
}

function Api(config) {
	this._config = _.defaults({}, config, {
		request: request,
		userAgent: 'anx-api/' + packageJson.version,
		target: null,
		token: null
	});
}

function _normalizeOpts(opts) {
	return _.isString(opts) ? {
		uri: opts
	} : _.cloneDeep(opts) || {};
}

Api.ApiError = function() {
	Error.apply(this);
	Error.captureStackTrace(this, this.constructor);

	this.name = 'ApiError';
	this.defaultMessage = '';

	var id, code, message, description;
	switch (arguments.length) {
		case 1: // new ApiError(response)
			var err = arguments[0];
			if (_.isObject(err)) {

				// Traverse through general API JSON Response
				if (err.body && err.body.response) {
					err = err.body.response; // err is raw api response
				} else if (err.response) {
					err = err.response; // err is body
				}

				// Extract values from object - duck type check
				if (err.hasOwnProperty('error_id')) { // Api Response
					id = err.error_id;
					code = err.error_code;
					message = err.error;
					description = err.error_description;
				} else if (err.hasOwnProperty('id')) { // Simple Object
					id = err.id;
					code = err.code;
					message = err.message;
					description = err.description;
				} else {
					message = err;
				}
			} else {
				// Even if not string - let the argument be message like default Error behavior
				message = err;
			}
			break;
		case 2: // new ApiError(id, message)
			id = arguments[0];
			message = arguments[1];
			break;
		case 4:
			id = arguments[0];
			code = arguments[1];
			message = arguments[2];
			description = arguments[3];
			break;
		case 3: // new ApiError(id, code, message)
			id = arguments[0];
			code = arguments[1];
			message = arguments[2];
			break;
	}

	this.id = id;
	this.code = code;
	this.message = (message || this.defaultMessage);
	this.description = (description || '');
};
util.inherits(Api.ApiError, Error);

Api.NotAuthorizedError = function() {
	this.defaultMessage = 'Authorization failed';
    Api.ApiError.apply(this, arguments);
    this.name = 'NotAuthorizedError';
};
util.inherits(Api.NotAuthorizedError, Api.ApiError);

// NotAuthenticated extends NotAuthorized for backwards compatibility
Api.NotAuthenticatedError = function() {
	this.defaultMessage = 'Authentication failed';
    Api.NotAuthorizedError.apply(this, arguments);
    this.name = 'NotAuthenticatedError';
};
util.inherits(Api.NotAuthenticatedError, Api.NotAuthorizedError);

// Build error from root response
// https://wiki.appnexus.com/display/adnexusdocumentation/API+Semantics#APISemantics-Errors
Api.buildError = function(res) {
	var ErrorType = Api.ApiError;
	if (res) {
		var statusCode = res.statusCode;
		var errorId;
		if (res && res.body && res.body.response && res.body.response) {
			errorId = res.body.response.error_id;
		}

		if (statusCode || errorId) {
			// Differentiating Authentication vs Authorization [http://stackoverflow.com/a/6937030/2483105]
			if (statusCode === 401 || errorId === 'NOAUTH') {
				ErrorType = Api.NotAuthenticatedError;
			} else if (statusCode === 403 || errorId === 'UNAUTH') {
				ErrorType = Api.NotAuthorizedError;
			}
		}
	}
	return new ErrorType(res);
};

Api.TargetError = function() {
    Api.ApiError.apply(this, arguments);
    this.name = 'TargetError';
};
util.inherits(Api.TargetError, Api.ApiError);


Api.statusOk = function _statusOk(body) {
	return body && body.response && body.response.status === 'OK';
};

Api.prototype._request = function _request(opts) {
	var _self = this;
	return new Promise(function (resolve, reject) {
		var params;
		var startTime = new Date().getTime();

		if (_.isEmpty(_self._config.target)) {
			return reject(new Api.TargetError('Target not set'));
		}

		// Validate Opts
		_(opts).pick(['startElement', 'numElements']).each(function (value, opt) {
			if (_hasValue(value) && !_isInteger(value)) {
				return reject(new Error('invalid ' + opt + ': ' + value));
			}
		});

		// Configure Options
		opts = _.defaults({}, opts, {
			rejectUnauthorized: false,
			headers: {
				'User-Agent': _self._config.userAgent
			},
			params: {}
		});

		if (!opts.noAuth && !opts.auth && _self._config.token) {
			opts.headers.Authorization = _self._config.token;
		}

		opts.uri = url.resolve(_self._config.target, opts.uri);

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

module.exports = Api;
