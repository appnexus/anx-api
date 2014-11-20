var request = require('request');
var Promise = require('q').Promise;

function Request(opts) {
	return new Promise(function (resolve, reject) {
		request(opts, function (err, res) {
			if (err) {
				reject(err);
			} else {
				resolve(res);
			}
		});
	});
}

module.exports = Request;
