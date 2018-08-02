import * as _ from 'lodash';

import axios from 'axios';
import axiosAdapter from './axiosAdapter';

jest.mock('axios');
const axiosMock: jest.Mock = axios as any;

describe('Axios Adapter', () => {

	it.skip('should make correct axios request', () => {});

	it('should transform axios response', () => {

		expect.assertions(2);

		axiosMock.mockResolvedValueOnce({
			status: 200,
			headers: { someHeader: 1 },
			data: { response: {} },
		});

		const opts = {
			headers: {
				'X-Proxy-Target': 'http://01-thorondor-hbapi-sor.envnxs.net',
				Authorization: 'hbapi:191561:57a21e5581e67:lax1',
				Accept: 'application/json',
			},
			method: 'GET',
			params: {},
			uri: '/api/access-resource?num_elements=1000',
		};

		return axiosAdapter({})(opts).then((res) => {
			expect(_.omit(res, 'requestTime')).toEqual({
				statusCode: 200,
				headers: { someHeader: 1 },
				body: { response: {} },
			});
			expect(_.isNumber(res.requestTime)).toBe(true);
			return null;
		});

	});

	it('should handle axios error response', () => {

		expect.assertions(4);

		axiosMock.mockResolvedValueOnce({
			status: 401,
			headers: { someHeader: 1 },
			data: { response: {} },
		});

		const opts = {
			headers: {
				'X-Proxy-Target': 'http://01-thorondor-hbapi-sor.envnxs.net',
				Authorization: 'hbapi:191561:57a21e5581e67:lax1',
				Accept: 'application/json',
			},
			method: 'GET',
			params: {},
			uri: '/api/access-resource?num_elements=1000',
		};

		return axiosAdapter({})(opts).then((res) => {
			expect(res.statusCode).toBe(401);
			expect(res.headers).toEqual({ someHeader: 1 });
			expect(res.body).toEqual({ response: {} });
			expect(res.requestTime).toBeDefined();
			return null;
		});

	});

});
