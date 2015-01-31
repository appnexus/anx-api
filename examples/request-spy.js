var _ = require('lodash');
var Api = require('../lib/api');


var api = new Api({
	target: process.env.TARGET,
	token: 'SESSION_TOKEN'
});

api._config.request = _.wrap(api._config.request, function (request, opts) {
	console.log('DEBUG: ', opts);
	return request.call(api, opts);
});

return api.get({
	uri: 'user',
	startElement: 10
}).then(function (res) {

});

// Outputs:
//
// [DEBUG]:  { uri: 'http://www.example.net/user?start_element=10',
//   startElement: 10,
//   method: 'GET',
//   headers:
//    { 'User-Agent': 'anx-api/1.1.1',
//      Authorization: 'hbapi:8090:54aae62e63875:lax1' },
//   params: { start_element: 10 } }

