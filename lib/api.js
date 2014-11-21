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

Api.statusOk = function _statusOk(body) {
	return body && body.response && body.response.status === 'OK';
};

Api.prototype._request = function _request(opts) {
	_.defaults(opts, {
		rejectUnauthorized: false,
		headers: {
			'User-Agent': this.config.userAgent
		}
	});

	if (this.token) {
		opts.headers.Authorization = this.token;
	}

	opts.uri = url.resolve(this.config.target, opts.uri);
	return this.config.request(opts);
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
	opts.body = payload;
	return this._request(opts);
};

Api.prototype.postJson = function _postJson(opts, payload) {
	opts = _normalizeOpts(opts);
	opts.json = true;
	return this.post(opts, payload);
};

Api.prototype.login = function _login(username, password) {
	var _self = this;
	_self.token = null;
	return new Promise(function (accept, reject) {
		_self.postJson('/auth', {
			auth: {
				username: username,
				password: password
			}
		}).then(function (res) {
			if (res.statusCode === 200 && Api.statusOk(res.body)) {
				_self.token = res.body.response.token;
				accept(_self.token);
			} else {
				reject(new Error(res.body.response.error));
			}
		}).catch(reject);
	});
};

module.exports = Api;
