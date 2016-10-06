var _ = require('lodash');
var util = require('util');

function ApiError(req, res) {
	Error.apply(this);

	// Error.captureStackTrace not supported in Firefox
	Error.captureStackTrace && Error.captureStackTrace(this, this.constructor);

	this.name = 'ApiError';
	this.defaultMessage = this.defaultMessage || '';

	var id;
	var code;
	var message;
	var description;
	var response;

	if (_.isObject(res)) {
		// Traverse through general API JSON Response
		if (res.body && res.body.response) {
			response = res.body.response; // res is raw api response
		} else if (res.response) {
			response = res.response; // res is body
		} else {
			response = res;
		}

		// Extract values from object - duck type check
		if (response.hasOwnProperty('error_id')) { // Api Response
			id = response.error_id;
			code = response.error_code;
			message = response.error;
			description = response.error_description;
		} else if (response.hasOwnProperty('id')) { // Simple Object
			id = response.id;
			code = response.code;
			message = response.message;
			description = response.description;
		} else {
			message = res;
		}
	} else {
		message = res;
	}

	this.id = id;
	this.code = code;
	this.message = (message || this.defaultMessage);
	delete this.defaultMessage;
	this.description = (description || null);
	this.req = req;
	this.res = res;
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

function NetworkError(opts, err) {
	Error.apply(this);
	this.message = err.message;
	this.req = opts;
	this.name = 'NetworkError';
}
util.inherits(NetworkError, Error);

function ArgumentError(opts, message) {
	Error.apply(this);
	this.message = message;
	this.req = opts;
	this.name = 'ArgumentError';
}
util.inherits(ArgumentError, Error);

function TargetError() {
	ApiError.apply(this, arguments);
	this.name = 'TargetError';
}
util.inherits(TargetError, ApiError);

function DNSLookupError(req, err) {
	ApiError.apply(this, arguments);
	this.name = 'DNSLookupError';
	this.message = 'DNS Lookup Error: ' + err.hostname;
}
util.inherits(DNSLookupError, NetworkError);

function ConnectionAbortedError() {
	ApiError.apply(this, arguments);
	this.name = 'ConnectionAbortedError';
	this.message = 'Connection Aborted Error';
}
util.inherits(ConnectionAbortedError, NetworkError);

function SocketTimeoutError() {
	ApiError.apply(this, arguments);
	this.name = 'SocketTimeoutError';
	this.message = 'Timeout Error';
}
util.inherits(SocketTimeoutError, NetworkError);

function ConnectionTimeoutError() {
	ApiError.apply(this, arguments);
	this.name = 'ConnectionTimeoutError';
	this.message = 'Connection Timeout Error';
}
util.inherits(ConnectionTimeoutError, NetworkError);

function ConnectionResetError() {
	ApiError.apply(this, arguments);
	this.name = 'ConnectionResetError';
	this.message = 'Connection Reset Error';
}
util.inherits(ConnectionResetError, NetworkError);

function ConnectionRefusedError() {
	ApiError.apply(this, arguments);
	this.name = 'ConnectionRefusedError';
	this.message = 'Connection Refused Error';
}
util.inherits(ConnectionRefusedError, NetworkError);

// Build error from root response
// https://wiki.appnexus.com/display/adnexusdocumentation/API+Semantics#APISemantics-Errors
function buildError(req, res) {
	var ErrorType = ApiError;

	if (res) {
		var statusCode;
		var errorId;
		var errorCode;

		if (res instanceof Error) {
			if (res.code === 'ENOTFOUND') {
				ErrorType = DNSLookupError;
			}

			if (res.code === 'ECONNABORTED') {
				ErrorType = ConnectionAbortedError;
			}

			if (res.code === 'ECONNREFUSED') {
				ErrorType = ConnectionRefusedError;
			}

			if (res.code === 'ECONNRESET') {
				ErrorType = ConnectionResetError;
			}

			if (res.code === 'ETIMEDOUT') {
				ErrorType = ConnectionTimeoutError;
			}

			if (res.code === 'ESOCKETTIMEDOUT') {
				ErrorType = SocketTimeoutError;
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

	return new ErrorType(req, res);
}

module.exports = {
	NetworkError: NetworkError,
	ArgumentError: ArgumentError,
	ApiError: ApiError,
	DNSLookupError: DNSLookupError,
	NotAuthorizedError: NotAuthorizedError,
	NotAuthenticatedError: NotAuthenticatedError,
	RateLimitExceededError: RateLimitExceededError,
	SystemServiceUnavailableError: SystemServiceUnavailableError,
	SystemUnknownError: SystemUnknownError,
	TargetError: TargetError,
	ConnectionAbortedError: ConnectionAbortedError,
	SocketTimeoutError: SocketTimeoutError,
	ConnectionTimeoutError: ConnectionTimeoutError,
	ConnectionResetError: ConnectionResetError,
	ConnectionRefusedError: ConnectionRefusedError,
	buildError: buildError
};
