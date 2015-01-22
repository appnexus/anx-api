var _ = require('lodash');
var url = require('url');
var request = require('./request');
var Promise = require('q').Promise;
var packageJson = require('../package.json');

function Api(config) {
	this.config = _.defaults(config || {}, {
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

Api.prototype.statusOk = function _statusOk(body) {
	return body && body.response && body.response.status === 'OK';
};

Api.prototype._request = function _request(opts) {
	var _self = this;
	return new Promise(function (resolve, reject) {
		var params;
		var startTime;

		if (_.isEmpty(_self.config.target)) {
			return reject(new Error('Target not set'));
		}

		// Configure Options
		_.defaults(opts, {
			rejectUnauthorized: false,
			headers: {
				'User-Agent': _self.config.userAgent
			},
			params: {}
		});

		if (_self.config.token) {
			opts.headers.Authorization = _self.config.token;
		}

		opts.uri = url.resolve(_self.config.target, opts.uri);

		// Configure Parameters
		if (_.isNumber(parseInt(opts.startElement, 10))) { opts.params.start_element = opts.startElement; }
		if (_.isNumber(parseInt(opts.numElements, 10))) { opts.params.num_elements = opts.numElements; }
		params = _.keys(opts.params).map(function (key) { return key + '=' + opts.params[key]; }).join('&');
		if (params !== '') {
			opts.uri += (opts.uri.indexOf('?') === -1) ? '?' : '&';
			opts.uri += params;
		}

		startTime = new Date();
		_self.config.request(opts).then(function (res) {
			res.requestTime = new Date() - startTime;
			resolve(res);
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

Api.prototype.put = function _post(opts, payload) {
	opts = _normalizeOpts(opts);
	opts.method = 'PUT';
	if (payload) {
		opts.body = payload;
	}
	return this._request(opts);
};

Api.prototype.putJson = function _postJson(opts, payload) {
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
	_self.config.token = null;
	return new Promise(function (accept, reject) {
		_self.postJson('/auth', {
			auth: {
				username: username,
				password: password
			}
		}).then(function (res) {
			if (res.statusCode === 200 && Api.statusOk(res.body)) {
				_self.config.token = res.body.response.token;
				accept(_self.config.token);
			} else {
				reject(new Error(res.body.response.error));
			}
		}).catch(reject);
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
