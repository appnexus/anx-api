/* eslint func-names: 0, no-console: 0 */

var AnxApi = require('anx-api');

var anxApi = new AnxApi({
	target: process.env.ANX_TARGET,
	token: 'SESSION_TOKEN'
});

function getAllCurrencies() {
	return new Promise(function(resolve, reject) {
		var currencies = [];

		function _page(startElement) {
			return anxApi.get({
				uri: 'currency',
				startElement: startElement,
				numElements: 5
			}).then(function(res) {
				var response = res.body.response;
				currencies = currencies.concat(response.currencies);

				if (startElement >= response.count) {
					return resolve(currencies);
				} else {
					return _page(startElement + response.num_elements);
				}
			}).catch(reject);
		}

		_page(0);
	});
}

return getAllCurrencies().then(function(currencies) {
	console.log(currencies);
}).catch(function(err) {
	console.log(err);
});
