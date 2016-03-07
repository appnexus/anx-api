var _ = require('lodash');
var axios = require('axios');

module.exports = function requestAdaptor(opts) {
	var url = opts.uri;

	var axiosOpts = {
		method: opts.method.toLowerCase(),
		headers: opts.headers,
		params: opts.params,
	};

	if (opts.json === true) {
		axiosOpts.headers = _.assign({}, axiosOpts.headers, {
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		});
	}

	if (!_.isUndefined(opts.body)) {
		axiosOpts.data = opts.body;
	}

	return axios(url, axiosOpts, opts.body).then(function (res) {
		return {
			statusCode: res.status,
			headers: res.headers,
			body: res.data
		};
	}).catch(function (res) {
		return {
			statusCode: res.status,
			headers: res.headers,
			body: res.data
		};
	});
}
