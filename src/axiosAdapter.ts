import axios, { AxiosRequestConfig } from 'axios';
import httpAdapter from 'axios/lib/adapters/http';
import * as _ from 'lodash';

export interface IResponse {
	statusCode: any;
	headers: any;
	body: any;
	requestTime: any;
}

export const requestAdaptor = (config) => (opts): Promise<IResponse> => {
	const url = opts.uri;
	const axiosConfig: AxiosRequestConfig = {
		url,
		timeout: opts.timeout,
		method: opts.method.toLowerCase(),
		headers: opts.headers,
	};

	if (config.forceHttpAdaptor) {
		axiosConfig.adapter = httpAdapter;
	}

	if (!_.isUndefined(opts.body)) {
		axiosConfig.data = opts.body;
	}

	const startTime = new Date().getTime();

	return axios(axiosConfig).then((res) => {
		return {
			statusCode: res.status,
			headers: res.headers,
			body: res.data,
			requestTime: new Date().getTime() - startTime,
		};
	}).catch((err) => {
		if (!err.response) {
			throw err;
		}
		return {
			statusCode: err.response.status,
			headers: err.response.headers,
			body: err.response.data,
			requestTime: new Date().getTime() - startTime,
		};
	});
};
