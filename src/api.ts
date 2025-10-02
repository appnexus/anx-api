import * as _ from 'lodash';
import * as query from 'qs';
import urlJoin from 'url-join';

import { axiosAdapter } from './axiosAdapter';
import { concurrencyAdapter } from './concurrencyAdapter';
import * as errors from './errors';
import { rateLimitAdapter } from './rateLimitAdapter';
import { IResponse } from './types';

export type Method = 'get' | 'GET' | 'delete' | 'DELETE' | 'head' | 'HEAD' | 'options' | 'OPTIONS' | 'post' | 'POST' | 'put' | 'PUT' | 'patch' | 'PATCH';

const packageJson = require('../package.json');

const DEFAULT_CHUNK_SIZE = 100;

export interface IConfig {
	concurrencyLimit?: number;
	environment?: string;
	rateLimiting: boolean;
	request?: (opts: IGenericOptions) => Promise<IResponse>;
	beforeRequest?: (opts: any) => any;
	afterRequest?: (opts: any) => any;
	target: string;
	timeout?: number;
	token?: string;
	userAgent?: string;
}

export interface IGenericOptions {
	auth?: any;
	encodeParams?: boolean;
	headers?: {};
	mimeType?: string;
	noAuth?: any;
	numElements?: number;
	params?: {};
	startElement?: number;
	timeout?: number;
	uri: string;
}

export interface IOptionsWithPayload extends IGenericOptions {
	body?: any;
}

export interface IRequestOptions extends IOptionsWithPayload {
	method: Method;
}

export interface IRequestOptionsInternal {
	auth?: boolean;
	body: object;
	encodeParams: boolean;
	headers: Record<string, string>;
	method: Method;
	mimeType?: string;
	noAuth?: boolean;
	numElements?: number;
	params: Record<string, string>;
	rejectUnauthorized: boolean;
	startElement?: number;
	timeout: number;
	uri: string;
}

function _hasValue(value: any): boolean {
	return !(_.isNull(value) || _.isUndefined(value));
}

function _isInteger(value: any): boolean {
	return parseInt(value, 10) === +value;
}

function _normalizeOpts(opts: IGenericOptions | string, extendOpts: IGenericOptions): IRequestOptions {
	const newOpts = _.isString(opts)
		? {
				uri: opts,
		  }
		: opts || {};
	return _.assign({ method: null }, newOpts, extendOpts);
}

export function statusOk(body) {
	return !!body && !!body.response && body.response.status === 'OK';
}

function __request(opts: IRequestOptionsInternal): Promise<IResponse> {
	const _self = this;
	return new Promise((resolve, reject) => {
		const startTime = new Date().getTime();

		if (_.isEmpty(_self._config.target)) {
			return reject(new errors.TargetError('Target not set', null));
		}

		// Validate Opts
		_.forEach(_.pick(opts, ['startElement', 'numElements']), (value, opt) => {
			if (_hasValue(value) && !_isInteger(value)) {
				return reject(new errors.ArgumentError(opts, 'Invalid ' + opt));
			}
			return null;
		});

		// Configure Options
		let reqOpts: IRequestOptionsInternal = {
			method: opts.method || 'GET',
			uri: urlJoin(_self._config.target, _.trimStart(opts.uri, '/')),
			timeout: opts.timeout || _self._config.timeout,
			rejectUnauthorized: false,
			headers: { ..._self._config.headers },
			params: { ...opts.params },
			body: opts.body,
			encodeParams: _.get(opts, 'encodeParams', false),
		};

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

		// Configure Parameters
		if (_hasValue(opts.startElement)) {
			reqOpts.params.start_element = (+opts.startElement).toString();
		}
		if (_hasValue(opts.numElements)) {
			reqOpts.params.num_elements = (+opts.numElements).toString();
			reqOpts.params.start_element = (+opts.startElement || reqOpts.params.start_element || 0).toString(); // startElement is required if numElements is set
		}

		const params = query.stringify(reqOpts.params, { encode: reqOpts.encodeParams });

		if (params !== '') {
			reqOpts.uri += !opts.uri.includes('?') ? '?' : '&';
			reqOpts.uri += params;
		}

		if (_self._config.beforeRequest) {
			const beforeRequestOpts = _self._config.beforeRequest(reqOpts);
			if (beforeRequestOpts) {
				reqOpts = _.assign({}, reqOpts, beforeRequestOpts);
			}
		}

		return _self._config
			.request(reqOpts)
			.then((res) => {
				const totalTime = new Date().getTime() - startTime;

				let newRes: IResponse = _.assign(
					{
						requestTime: res.requestTime ?? totalTime,
						totalTime: new Date().getTime() - startTime,
					},
					res,
				);

				if (_self._config.afterRequest) {
					const afterRequestRes = _self._config.afterRequest(newRes);
					if (afterRequestRes) {
						newRes = _.assign({}, newRes, afterRequestRes);
					}
				}

				if (newRes.statusCode >= 400) {
					return reject(errors.buildError(null, reqOpts, newRes));
				}

				// Temporary fix
				let errorId;
				let errorCode;
				if (newRes.body?.response) {
					errorId = newRes.body.response.error_id;
					errorCode = newRes.body.response.error_code;
				}
				if (errorId === 'SYSTEM' && errorCode === 'SERVICE_UNAVAILABLE') {
					return reject(errors.buildError(null, reqOpts, newRes));
				}
				if (errorId === 'SYSTEM' && errorCode === 'UNKNOWN') {
					return reject(errors.buildError(null, reqOpts, newRes));
				}

				newRes.req = reqOpts;

				return resolve(newRes);
			})
			.catch((err) => {
				let newErr = err;
				if (_self._config.afterRequest) {
					newErr = _self._config.afterRequest(err);
				}
				return reject(errors.buildRequestError(newErr, reqOpts));
			});
	});
}

export class AnxApi {
	public _config: IConfig;

	constructor(config: IConfig) {
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
		this.request = this._config.rateLimiting
			? rateLimitAdapter(
					_.assign({}, config, {
						request: __request.bind(this),
					}),
			  )
			: __request.bind(this);

		// Install optional concurrency adapter
		this._config.request = this._config.concurrencyLimit
			? concurrencyAdapter({
					limit: this._config.concurrencyLimit,
					request: this._config.request,
			  })
			: this._config.request;
	}

	public _request(method: Method, opts: IGenericOptions | string, extendOpts: IGenericOptions, payload?): Promise<IResponse> {
		const newOpts = _normalizeOpts(opts, extendOpts);
		newOpts.method = method || newOpts.method || 'GET';
		if (payload) {
			newOpts.body = payload;
		}
		return this.request(newOpts);
	}

	public request(opts: IRequestOptions, extendOpts?: IGenericOptions): Promise<IResponse> {
		return this._request(null, opts, extendOpts);
	}

	public get(opts: IGenericOptions | string, extendOpts?: IGenericOptions): Promise<IResponse> {
		return this._request('GET', opts, extendOpts);
	}

	public getAll(opts: IGenericOptions, extendOpts?: IGenericOptions): Promise<any> {
		return new Promise((resolve, reject) => {
			const newOpts = _normalizeOpts(opts, extendOpts);
			let numElements = opts.numElements || 100;
			let firstOutputTerm;
			let elements = [];
			let totalTime = 0;

			const getAll = (startElement) => {
				newOpts.startElement = startElement;
				newOpts.numElements = numElements;

				return this.get(newOpts)
					.then((res) => {
						if (!statusOk(res.body)) {
							return reject(res);
						}
						const response = res.body.response;
						const count = response.count ?? 0;
						const outputTerm = response.dbg_info.output_term;
						firstOutputTerm ??= outputTerm;

						numElements = response.num_elements;

						totalTime += response.dbg_info.time ?? 0;
						elements = elements.concat(response[firstOutputTerm]);
						if (count <= startElement + numElements) {
							const newResponse = _.assign(
								{},
								{
									count: elements.length,
									start_element: 0,
									num_elements: elements.length,
									dbg_info: _.assign({}, response.dbg_info, {
										output_term: firstOutputTerm,
										time: totalTime,
									}),
								},
							);
							newResponse[firstOutputTerm] = elements;
							return resolve({ body: { response: newResponse } });
						}
						return getAll(startElement + numElements);
					})
					.catch(reject);
			};

			return getAll(0);
		});
	}

	public post(opts: IOptionsWithPayload | string, payload?, extendOpts?: IGenericOptions): Promise<IResponse> {
		return this._request('POST', opts, extendOpts, payload);
	}

	public postAll(opts: IOptionsWithPayload, payload?, extendOpts?: IGenericOptions): Promise<any> {
		return new Promise((resolve, reject) => {
			let numElements = opts.numElements || 100;
			let firstOutputTerm = /creative-search/.test(opts.uri) ? 'creatives' : '';
			let elements = [];
			let totalTime = 0;

			const postAll = (startElement) => {
				opts.startElement = startElement;
				opts.numElements = numElements;

				return this.post(opts, payload, extendOpts)
					.then((res) => {
						if (!statusOk(res.body)) {
							return reject(res);
						}
						const response = res.body.response;
						const count = response.count ?? 0;
						const outputTerm = response.dbg_info.output_term;
						if (!firstOutputTerm) {
							firstOutputTerm = outputTerm;
						}

						numElements = response.num_elements;

						totalTime += response.dbg_info.time ?? 0;
						elements = elements.concat(response[firstOutputTerm]);
						if (count <= startElement + numElements) {
							const newResponse = _.assign(
								{},
								{
									count: elements.length,
									start_element: 0,
									num_elements: elements.length,
									dbg_info: _.assign({}, response.dbg_info, {
										output_term: firstOutputTerm,
										time: totalTime,
									}),
								},
							);
							newResponse[firstOutputTerm] = elements;
							return resolve({ body: { response: newResponse } });
						}
						return postAll(startElement + numElements);
					})
					.catch(reject);
			};

			return postAll(0);
		});
	}

	public put(opts: IOptionsWithPayload | string, payload?, extendOpts?: IGenericOptions): Promise<IResponse> {
		return this._request('PUT', opts, extendOpts, payload);
	}

	public delete(opts: IGenericOptions | string, extendOpts?: IGenericOptions): Promise<IResponse> {
		return this._request('DELETE', opts, extendOpts);
	}

	public login(username: string, password: string): Promise<string> {
		const reqOpts = {
			auth: {
				username,
				password,
			},
		};
		return this.post('/auth', reqOpts).then((res) => {
			if (res.statusCode === 200 && statusOk(res.body)) {
				this._config.token = res.body.response.token;
				return this._config.token;
			}
			throw errors.buildError(null, reqOpts, res);
		});
	}

	public switchUser(userId: number): Promise<IResponse> {
		return this.post('/auth', {
			auth: {
				switch_to_user: userId,
			},
		});
	}
}
