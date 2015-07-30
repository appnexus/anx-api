var _ = require('lodash');
var util = require('util');

function ApiError() {
	Error.apply(this);
	Error.captureStackTrace(this, this.constructor);

	this.name = 'ApiError';
	this.defaultMessage = '';

	var id, code, message, description;
	switch (arguments.length) {
		case 1: // new ApiError(response)
			var err = arguments[0];
			if (_.isObject(err)) {

				// Traverse through general API JSON Response
				if (err.body && err.body.response) {
					err = err.body.response; // err is raw api response
				} else if (err.response) {
					err = err.response; // err is body
				}

				// Extract values from object - duck type check
				if (err.hasOwnProperty('error_id')) { // Api Response
					id = err.error_id;
					code = err.error_code;
					message = err.error;
					description = err.error_description;
				} else if (err.hasOwnProperty('id')) { // Simple Object
					id = err.id;
					code = err.code;
					message = err.message;
					description = err.description;
				} else {
					message = err;
				}
			} else {
				// Even if not string - let the argument be message like default Error behavior
				message = err;
			}
			break;
		case 2: // new ApiError(id, message)
			id = arguments[0];
			message = arguments[1];
			break;
		case 4:
			id = arguments[0];
			code = arguments[1];
			message = arguments[2];
			description = arguments[3];
			break;
		case 3: // new ApiError(id, code, message)
			id = arguments[0];
			code = arguments[1];
			message = arguments[2];
			break;
	}

	this.id = id;
	this.code = code;
	this.message = (message || this.defaultMessage);
	this.description = (description || '');
}
util.inherits(ApiError, Error);

function NotAuthorizedError() {
	this.defaultMessage = 'Authorization failed';
	ApiError.apply(this, arguments);
	this.name = 'NotAuthorizedError';
}
util.inherits(NotAuthorizedError, ApiError);

// NotAuthenticated extends NotAuthorized for backwards compatibility
function NotAuthenticatedError() {
	this.defaultMessage = 'Authentication failed';
	NotAuthorizedError.apply(this, arguments);
	this.name = 'NotAuthenticatedError';
}
util.inherits(NotAuthenticatedError, NotAuthorizedError);

function TargetError() {
	ApiError.apply(this, arguments);
	this.name = 'TargetError';
}
util.inherits(TargetError, ApiError);

// Build error from root response
// https://wiki.appnexus.com/display/adnexusdocumentation/API+Semantics#APISemantics-Errors
function buildError(res) {
	var ErrorType = ApiError;
	if (res) {
		var statusCode = res.statusCode;
		var errorId;
		if (res && res.body && res.body.response && res.body.response) {
			errorId = res.body.response.error_id;
		}

		if (statusCode || errorId) {
			// Differentiating Authentication vs Authorization [http://stackoverflow.com/a/6937030/2483105]
			if (statusCode === 401 || errorId === 'NOAUTH') {
				ErrorType = NotAuthenticatedError;
			} else if (statusCode === 403 || errorId === 'UNAUTH') {
				ErrorType = NotAuthorizedError;
			}
		}
	}
	return new ErrorType(res);
}

function statusOk(body) {
	return body && body.response && body.response.status === 'OK';
}

function extend(ns) {
	ns = ns || {};
	ns.statusOk = statusOk;
	ns.ApiError = ApiError;
	ns.NotAuthorizedError = NotAuthorizedError;
	ns.NotAuthenticatedError = NotAuthenticatedError;
	ns.TargetError = TargetError;
	ns.buildError = buildError;
	return ns;
}

module.exports = {
	statusOk: statusOk,
	ApiError: ApiError,
	NotAuthorizedError: NotAuthorizedError,
	NotAuthenticatedError: NotAuthenticatedError,
	TargetError: TargetError,
	buildError: buildError,
	extend: extend
};
