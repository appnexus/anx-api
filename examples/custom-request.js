var Api = require('anx-api');
var request = require('request');
var Promise = require('q').Promise;

function customRequest(opts) {
	return new Promise(function (resolve, reject) {

		// Customize the request

		request(opts, function (err, res) {
			if (err) {

				// Add additional error handling

				reject(err);
			} else {

				// Customize the response

				resolve(res);
			}
		});
	});
}

var api = new Api({
	target: process.env.ANX_TARGET,
	token: 'SESSION_TOKEN',
	request: customRequest
});

return api.get({
	uri: 'user',
	startElement: 10
}).then(function (res) {
	console.log('DONE');
});
