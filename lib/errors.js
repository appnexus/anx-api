var _ = require('lodash');
var util = require('util');

function ApiError(res) {
	Error.apply(this);

	// Error.captureStackTrace not supported in Firefox
	Error.captureStackTrace && Error.captureStackTrace(this, this.constructor);

	this.name = 'ApiError';
	this.defaultMessage = this.defaultMessage || '';

	var id;
	var code;
	var message;
	var description;
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

	this.res = res;
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

function RateLimitExceededError() {
	this.defaultMessage = 'Rate Limit Exceeded';
	ApiError.apply(this, arguments);
	this.name = 'RateLimitExceededError';
}
util.inherits(NotAuthorizedError, ApiError);

function SystemServiceUnavailableError() {
	this.defaultMessage = 'Service Unavailable';
	ApiError.apply(this, arguments);
	this.name = 'SystemServiceUnavailableError';
}
util.inherits(SystemServiceUnavailableError, ApiError);

function SystemUnknownError() {
	this.defaultMessage = 'Unknown';
	ApiError.apply(this, arguments);
	this.name = 'SystemUnknownError';
}
util.inherits(SystemUnknownError, ApiError);

function ArgumentError(message) {
	this.message = message;
	Error.apply(this);
	this.name = 'ArgumentError';
}
util.inherits(ArgumentError, Error);

function TargetError() {
	ApiError.apply(this, arguments);
	this.name = 'TargetError';
}
util.inherits(TargetError, ApiError);

function DNSLookupError(err) {
	ApiError.apply(this, arguments);
	this.name = 'DNSLookupError';
	this.message = 'DNS Lookup Error: ' + err.hostname;
}
util.inherits(SystemUnknownError, ApiError);

// Build error from root response
// https://wiki.appnexus.com/display/adnexusdocumentation/API+Semantics#APISemantics-Errors
function buildError(res) {
	var ErrorType = ApiError;
	if (res) {
		var statusCode;
		var errorId;
		var errorCode;

		if (res instanceof Error) {
			if (res.code === 'ENOTFOUND') {
				ErrorType = DNSLookupError;
			}
		}

		statusCode = res.statusCode;

		if (res.body && res.body.response) {
			errorId = res.body.response.error_id;
			errorCode = res.body.response.error_code;
		}

		if (statusCode || errorId) {
			// Differentiating Authentication vs Authorization [http://stackoverflow.com/a/6937030/2483105]
			if (statusCode === 401 || errorId === 'NOAUTH') {
				ErrorType = NotAuthenticatedError;
			} else if (statusCode === 403 || errorId === 'UNAUTH') {
				ErrorType = NotAuthorizedError;
			} else if (errorId === 'SYSTEM' && errorCode === 'SERVICE_UNAVAILABLE') {
				ErrorType = SystemServiceUnavailableError;
			} else if (statusCode === 429) {
				ErrorType = RateLimitExceededError;
			} else if (errorId === 'SYSTEM' && errorCode === 'RATE_EXCEEDED') { // Legacy rate limit detection pre 1.17
				ErrorType = RateLimitExceededError;
			} else if (errorId === 'SYSTEM' && errorCode === 'UNKNOWN') {
				ErrorType = SystemUnknownError;
			}
		}
	}
	return new ErrorType(res);
}

module.exports = {
	ArgumentError: ArgumentError,
	ApiError: ApiError,
	DNSLookupError: DNSLookupError,
	NotAuthorizedError: NotAuthorizedError,
	NotAuthenticatedError: NotAuthenticatedError,
	RateLimitExceededError: RateLimitExceededError,
	SystemServiceUnavailableError: SystemServiceUnavailableError,
	SystemUnknownError: SystemUnknownError,
	TargetError: TargetError,
	buildError: buildError
};
