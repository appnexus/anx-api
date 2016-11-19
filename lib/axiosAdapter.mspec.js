/* eslint func-names: 0, padded-blocks: 0 */
var _ = require('lodash');
var sinon = require('sinon');
var assert = require('assert');
var proxyquire = require('proxyquire');
var chai = require('chai');

var expect = chai.expect;
var axiosStub = sinon.stub();

var axiosAdapter = proxyquire('../lib/axiosAdapter', { axios: axiosStub });

describe('Axios Adapter', function() {

	beforeEach(function() {
		axiosStub.reset();
	});

	it('should make correct axios request');

	it('should transform axios response', function(done) {

		axiosStub.resolves({
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

		axiosAdapter(opts).then(function(res) {
			assert.deepEqual(_.omit(res, 'requestTime'), {
				statusCode: 200,
				headers: { someHeader: 1 },
				body: { response: {} },
			});
			assert(_.isNumber(res.requestTime), 'has requestTime as number');
			done();
		}).catch(done);

	});

	it('should handle axios error response', function(done) {

		axiosStub.rejects({ response: {
			status: 401,
			headers: { someHeader: 1 },
			data: { response: {} },
		}});

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

		axiosAdapter(opts).then(function(res) {
			expect(res.statusCode).to.equal(401);
			expect(res.headers).to.deep.equal({ someHeader: 1 });
			expect(res.body).to.deep.equal({ response: {} });
			expect(res).to.have.property('requestTime');
			done();
		}).catch(done);

	});

});
