import axios, { AxiosRequestConfig } from 'axios';

import httpAdapter from 'axios/lib/adapters/http';
import * as _ from 'lodash';
import { IRequestOptionsInternal } from './api';
import { IResponse } from './types';

export const axiosAdapter =
	(config) =>
	(opts: IRequestOptionsInternal): Promise<IResponse> => {
		const url = opts.uri;
		const axiosConfig: AxiosRequestConfig = {
			url,
			timeout: opts.timeout,
			method: opts.method,
			headers: opts.headers,
		};

		if (config.forceHttpAdaptor) {
			axiosConfig.adapter = httpAdapter;
		}

		if (!_.isUndefined(opts.body)) {
			axiosConfig.data = opts.body;
		}

		const startTime = new Date().getTime();

		return axios(axiosConfig)
			.then((res) => {
				return {
					uri: opts.uri,
					statusCode: res.status,
					headers: res.headers,
					body: res.data,
					requestTime: new Date().getTime() - startTime,
				};
			})
			.catch((err): IResponse => {
				if (!err.response) {
					throw err;
				}
				return {
					uri: opts.uri,
					statusCode: err.response.status,
					headers: err.response.headers,
					body: err.response.data,
					requestTime: new Date().getTime() - startTime,
				};
			});
	};
