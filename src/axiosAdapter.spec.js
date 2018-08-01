/* eslint func-names: 0, padded-blocks: 0 */
var _ = require('lodash');

var axiosAdapter = require('./axiosAdapter');
var axios = require('axios');

describe('Axios Adapter', function() {

	it('should make correct axios request');

	it('should transform axios response', function() {

		expect.assertions(2);

		axios.resolvesOnce({
			status: 200,
			headers: { someHeader: 1 },
			data: { response: {} },
		});

		var opts = {
			headers: {
				'X-Proxy-Target': 'http://01-thorondor-hbapi-sor.envnxs.net',
				Authorization: 'hbapi:191561:57a21e5581e67:lax1',
				Accept: 'application/json',
			},
			method: 'GET',
			params: {},
			uri: '/api/access-resource?num_elements=1000',
		};


		return axiosAdapter({})(opts).then(function(res) {
			expect(_.omit(res, 'requestTime')).toEqual({
				statusCode: 200,
				headers: { someHeader: 1 },
				body: { response: {} },
			});
			expect(_.isNumber(res.requestTime)).toBe(true);
			return null;
		});

	});

	it('should handle axios error response', function() {

		expect.assertions(4);

		axios.resolvesOnce({
			status: 401,
			headers: { someHeader: 1 },
			data: { response: {} },
		});

		var opts = {
			headers: {
				'X-Proxy-Target': 'http://01-thorondor-hbapi-sor.envnxs.net',
				Authorization: 'hbapi:191561:57a21e5581e67:lax1',
				Accept: 'application/json',
			},
			method: 'GET',
			params: {},
			uri: '/api/access-resource?num_elements=1000',
		};

		return axiosAdapter({})(opts).then(function(res) {
			expect(res.statusCode).toBe(401);
			expect(res.headers).toEqual({ someHeader: 1 });
			expect(res.body).toEqual({ response: {} });
			expect(res.requestTime).toBeDefined();
			return null;
		});

	});

});
