/* eslint func-names: 0, no-console: 0 */

var AnxApi = require('anx-api');

var anxApi = new AnxApi({
	target: process.env.ANX_TARGET,
	rateLimit: true
});

anxApi.login(process.env.ANX_USERNAME, process.env.ANX_PASSWORD).then(function(/* token */) {
	return anxApi.get('creative').then(function(res) {
		var response = res.body.response;

		console.log(response);

		/*
		response = {
			status: 'OK',
			count: 1097,
			start_element: 0,
			num_elements: 100,
			creative: [...]
		}
		*/
	});
}).catch(function(err) {
	console.log(err);
});
