var Api = require('../lib/api');

function requestSpy(opts) {
	console.log('[DEBUG]: ', opts);
	return opts.defaultRequest(opts);
}

var api = new Api({
	target: process.env.TARGET,
	token: 'SESSION_TOKEN',
	request: requestSpy
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

