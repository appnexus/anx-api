var Api = require('anx-api');
var Promise = require('q').Promise;

var api = new Api({
	target: process.env.ANX_TARGET,
	token: 'SESSION_TOKEN'
});

function getAllCurrencies() {
	return new Promise(function (resolve, reject) {
		var currencies = [];

		function _page(startElement) {
			return api.getJson({
				uri: 'currency',
				startElement: startElement,
				numElements: 5
			}).then(function (res) {
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

return getAllCurrencies().then(function (currencies) {
	console.log(currencies);
}).catch(function (err) {
	console.log(err);
});
