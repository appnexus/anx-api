import * as _ from 'lodash';
import * as query from 'qs';
import * as urlJoin from 'url-join';
import axiosAdapter from './axiosAdapter';
import concurrencyAdapter from './concurrencyAdapter';
import * as errors from './errors';
import rateLimitAdapter from './rateLimitAdapter';

const packageJson = require('../package.json');

const DEFAULT_CHUNK_SIZE = 100;

function _hasValue(value) {
	return !(_.isNull(value) || _.isUndefined(value));
}

function _isInteger(value) {
	return parseInt(value, 10) === +value;
}

function _normalizeOpts(opts, extendOpts) {
	const newOpts = _.isString(opts) ? {
		uri: opts,
	} : opts || {};
	return _.assign({}, newOpts, extendOpts);
}

export function statusOk(body) {
	return !!body && !!body.response && body.response.status === 'OK';
}

function __request(opts) {
	const _self = this;
	return new Promise(function requestPromise(resolve, reject) {
		let params;
		const startTime = new Date().getTime();

		if (_.isEmpty(_self._config.target)) {
			return reject(new errors.TargetError(opts, 'Target not set'));
		}

		// Validate Opts
		_.forEach(_.pick(opts, ['startElement', 'numElements']), function validate(value, opt) {
			if (_hasValue(value) && !_isInteger(value)) {
				return reject(new errors.ArgumentError(opts, 'Invalid ' + opt));
			}
			return null;
		});

		// Configure Options
		let reqOpts: any = _.assign({}, {
			rejectUnauthorized: false,
			headers: _.assign({}, _self._config.headers),
		});

		reqOpts.timeout = opts.timeout || _self._config.timeout;
		reqOpts.method = (opts.method || 'GET').toUpperCase();
		reqOpts.params = _.assign({}, opts.params);
		reqOpts.body = opts.body;
		reqOpts.encodeParams = _.get(opts, 'encodeParams', false);

		if (_self._config.userAgent) {
			reqOpts.headers['User-Agent'] = _self._config.userAgent;
		}

		if (!opts.noAuth && !opts.auth && _self._config.token) {
			reqOpts.headers.Authorization = _self._config.token;
		}

		if (opts.mimeType) {
			reqOpts.headers.Accept = opts.mimeType;
			if (opts.method === 'POST' || opts.method === 'PUT') {
				reqOpts.headers['Content-Type'] = opts.mimeType;
			}
		} else {
			// Default Accept to application/json
			reqOpts.headers.Accept = _.get(opts, 'headers.Accept', 'application/json');

			// Default Content-Type to application/json for POSTs and PUTs
			if (reqOpts.method === 'POST' || reqOpts.method === 'PUT') {
				reqOpts.headers['Content-Type'] = _.get(opts, 'headers.Content-Type', 'application/json');
			}
		}

		reqOpts.headers = _.assign({}, reqOpts.headers, opts.headers);

		reqOpts.uri = urlJoin(_self._config.target, _.trimStart(opts.uri, '/'));

		// Configure Parameters
		if (_hasValue(opts.startElement)) {
			reqOpts.params.start_element = +opts.startElement;
		}
		if (_hasValue(opts.numElements)) {
			reqOpts.params.num_elements = +opts.numElements;
			reqOpts.params.start_element = +opts.startElement || reqOpts.params.start_element || 0; // startElement is required if numElements is set
		}

		params = query.stringify(reqOpts.params, {encode: reqOpts.encodeParams});

		if (params !== '') {
			reqOpts.uri += (opts.uri.indexOf('?') === -1) ? '?' : '&';
			reqOpts.uri += params;
		}

		if (_self._config.beforeRequest) {
			const beforeRequestOpts = _self._config.beforeRequest(reqOpts);
			if (beforeRequestOpts) {
				reqOpts = _.assign({}, reqOpts, beforeRequestOpts);
			}
		}

		return _self._config.request(reqOpts).then(function success(res) {
			const totalTime = new Date().getTime() - startTime;

			let newRes = _.assign({
				requestTime: res.requestTime || totalTime,
				totalTime: new Date().getTime() - startTime,
			}, res);

			if (_self._config.afterRequest) {
				const afterRequestRes = _self._config.afterRequest(newRes);
				if (afterRequestRes) {
					newRes = _.assign({}, newRes, afterRequestRes);
				}
			}

			if (newRes.statusCode >= 400) {
				return reject(errors.buildError(reqOpts, newRes));
			}

			// Temporary fix
			let errorId;
			let errorCode;
			if (newRes.body && newRes.body.response && newRes.body.response) {
				errorId = newRes.body.response.error_id;
				errorCode = newRes.body.response.error_code;
			}
			if (errorId === 'SYSTEM' && errorCode === 'SERVICE_UNAVAILABLE') {
				return reject(errors.buildError(reqOpts, newRes));
			}
			if (errorId === 'SYSTEM' && errorCode === 'UNKNOWN') {
				return reject(errors.buildError(reqOpts, newRes));
			}

			newRes.req = reqOpts;

			return resolve(newRes);
		}).catch(function failure(err) {
			let newErr;
			if (_self._config.afterRequest) {
				newErr = _self._config.afterRequest(err);
			}
			return reject(errors.buildError(reqOpts, newErr || err));
		});
	});
}

class AnxApi {
	public _config;

	constructor(config) {
		this._config = _.defaults({}, config, {
			request: axiosAdapter({
				forceHttpAdaptor: config.environment === 'node',
			}),
			userAgent: 'anx-api/' + packageJson.version,
			timeout: 60 * 1000,
			headers: {},
			target: null,
			token: null,
			rateLimiting: true,
			chunkSize: DEFAULT_CHUNK_SIZE,
		});

		this.request = __request;

		// Install optional rate limiting adapter
		this.request = this._config.rateLimiting ? rateLimitAdapter(_.assign({}, config, {
			request: __request.bind(this),
		})) : __request.bind(this);

		// Install optional concurrency adapter
		this._config.request = this._config.concurrencyLimit ? concurrencyAdapter({
			limit: this._config.concurrencyLimit,
			request: this._config.request,
		}) : this._config.request;
	}

	public _request(method, opts, extendOpts, payload?) {
		const newOpts = _normalizeOpts(opts, extendOpts);
		newOpts.method = method || newOpts.method || 'GET';
		if (payload) {
			newOpts.body = payload;
		}
		return this.request(newOpts);
	}

	public request(opts, extendOpts?) {
		return this._request(null, opts, extendOpts);
	}

	public get(opts, extendOpts?) {
		return this._request('GET', opts, extendOpts);
	}

	public getAll(opts, extendOpts) {
		const _self = this;

		return new Promise(function getAllPromise(resolve, reject) {
			const newOpts = _normalizeOpts(opts, extendOpts);
			let numElements = opts.numElements || 100;
			let firstOutputTerm;
			let elements = [];
			let totalTime = 0;

			function getAll(startElement) {
				newOpts.startElement = startElement;
				newOpts.numElements = numElements;

				return _self.get(newOpts).then(function success(res) {
					if (!statusOk(res.body)) {
						return reject(res);
					}
					const response = res.body.response;
					const count = response.count || 0;
					const outputTerm = response.dbg_info.output_term;
					if (!firstOutputTerm) {
						firstOutputTerm = outputTerm;
					}

					numElements = response.num_elements;

					totalTime += response.dbg_info.time || 0;
					elements = elements.concat(response[outputTerm]);
					if (count <= startElement + numElements) {
						const newResponse = _.assign({}, {
							count: elements.length,
							start_element: 0,
							num_elements: elements.length,
							dbg_info: _.assign({}, response.dbg_info, {
								output_term: firstOutputTerm,
								time: totalTime,
							}),
						});
						newResponse[firstOutputTerm] = elements;
						return resolve({ body: { response: newResponse } });
					}
					return getAll(startElement + numElements);
				}).catch(reject);
			}

			return getAll(0);
		});
	}

	public post(opts, payload, extendOpts?) {
		return this._request('POST', opts, extendOpts, payload);
	}

	public put(opts, payload, extendOpts?) {
		return this._request('PUT', opts, extendOpts, payload);
	}

	public delete(opts, extendOpts?) {
		return this._request('DELETE', opts, extendOpts);
	}

	public login = function _login(username, password) {
		const _self = this;
		const reqOpts = {
			auth: {
				username,
				password,
			},
		};
		return _self.post('/auth', reqOpts).then(function success(res) {
			if (res.statusCode === 200 && statusOk(res.body)) {
				_self._config.token = res.body.response.token;
				return _self._config.token;
			}
			throw errors.buildError(reqOpts, res);
		});
	};

	public switchUser = function _switchUser(userId) {
		const _self = this;
		return _self.post('/auth', {
			auth: {
				switch_to_user: userId,
			},
		});
	};

}

export default AnxApi;
