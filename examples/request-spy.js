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
