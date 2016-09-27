/* eslint func-names: 0, padded-blocks: 0 */

var assert = require('assert');
var PromiseQueue = require('./promise-queue');
var sinon = require('sinon');
var Api = require('./api');

describe('Promise Queue', function() {

	describe('#makeRequest', function() {

		it('should use retry-after header', function(done) {

			var pq = new PromiseQueue({
				request: sinon.stub().rejects(Api.buildError({}, {
					statusCode: 429,
					headers: {
						'retry-after': '35',
						'x-ratelimit-read': '1000',
						'x-ratelimit-system': '1000-Default',
						'x-ratelimit-write': '1000'
					}
				}))
			});

			pq.retry = sinon.stub();

			pq.scheduleProcessQueue = function(timeout) {
				try {
					assert.equal(timeout, 36000, 'Incorrect timeout');
					done();
				} catch (e) {
					done(e);
				}
			};

			pq.makeRequest({});

		});

	});

});
