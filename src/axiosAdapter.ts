import axios, { AxiosRequestConfig } from 'axios';
import httpAdapter from 'axios/lib/adapters/http';
import * as _ from 'lodash';

export default function requestAdaptor(config) {
	return (opts) => {
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

		return axios(axiosConfig).then(function requestSuccess(res) {
			return {
				statusCode: res.status,
				headers: res.headers,
				body: res.data,
				requestTime: new Date().getTime() - startTime,
			};
		}).catch(function requestError(res) {
			if (!res.response) {
				throw res;
			}
			return {
				statusCode: res.response.status,
				headers: res.response.headers,
				body: res.response.data,
				requestTime: new Date().getTime() - startTime,
			};
		});
	};
}
