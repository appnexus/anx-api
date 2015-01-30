var _ = require('lodash');
var url = require('url');
var request = require('./request');
var Promise = require('q').Promise;
var packageJson = require('../package.json');
var query = require('qs');

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

Api.statusOk = function _statusOk(body) {
	return body && body.response && body.response.status === 'OK';
};

Api.prototype._request = function _request(opts) {
	var _self = this;
	return new Promise(function (resolve, reject) {
		var params;
		var startTime = new Date().getTime();

		if (_.isEmpty(_self._config.target)) {
			return reject(new Error('Target not set'));
		}

		// Validate Opts
		if (opts.startElement && isNaN(opts.startElement)) { reject(new Error('invalid startElement: ' + opts.startElement)); }
		if (opts.numElements && isNaN(opts.numElements)) { reject(new Error('invalid numElements: ' + opts.numElements)); }

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
		if (opts.startElement) { opts.params.start_element = +opts.startElement; }
		if (opts.numElements) { opts.params.num_elements = +opts.numElements; }
		params = decodeURIComponent(query.stringify(opts.params));
		if (params !== '') {
			opts.uri += (opts.uri.indexOf('?') === -1) ? '?' : '&';
			opts.uri += params;
		}

		return _self._config.request(opts).then(function (res) {
			res.requestTime = new Date().getTime() - startTime;
			resolve(res);
		});
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
			throw new Error(res.body.response.error);
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
