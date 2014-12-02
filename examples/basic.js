var Api = require('anx-api');

var api = new Api({
	target: process.env.TARGET
});

api.login(process.env.USERNAME, process.env.PASSWORD).then(function (/* token */) {
	return api.getJson('creative').then(function (res) {
		var response = res.body.response;

		console.log(response);

		/*

		response = {
			status: 'OK',
			count: 1097,
			start_element: 0,
			num_elements: 100,
			users: [...]
		}

		*/
	});
}).catch(function (err) {
	console.log(err);
});
