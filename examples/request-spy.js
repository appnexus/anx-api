var _ = require('lodash');
var AnxApi = require('anx-api');

var anxApi = new AnxApi({
	target: process.env.ANX_TARGET,
	token: 'SESSION_TOKEN'
});

anxApi._config.request = _.wrap(anxApi._config.request, function (request, opts) {
	console.log('[DEBUG]:', opts);
	return request.call(anxApi, opts);
});

return anxApi.get({
	uri: 'user',
	startElement: 10
}).then(function (res) {
	console.log('DONE');
});

// Outputs:
//
// [DEBUG]: { uri: 'http://www.example.net/user?start_element=10',
//   startElement: 10,
//   method: 'GET',
//   headers:
//    { 'User-Agent': 'anx-api/3.0.0',
//      Authorization: 'hbapi:8090:54aae62e63875:lax1' },
//   params: { start_element: 10 } }
