var AnxApi = require('anx-api');
var request = require('request');

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

var anxApi = new AnxApi({
	target: process.env.ANX_TARGET,
	token: 'SESSION_TOKEN',
	request: customRequest
});

return anxApi.get({
	uri: 'user',
	startElement: 10
}).then(function (res) {
	console.log('DONE');
});
