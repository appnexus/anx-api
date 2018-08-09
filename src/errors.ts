import * as _ from 'lodash';

export class ApiError extends Error {
	public id;
	public code;
	public defaultMessage;
	public description;
	public response;
	public req;
	public res;

	constructor(req?, res?) {
		super();

		// Error.captureStackTrace not supported in Firefox
		// tslint:disable-next-line
		Error.captureStackTrace && Error.captureStackTrace(this, this.constructor);

		this.name = 'ApiError';
		this.defaultMessage = this.defaultMessage || '';

		let response;
		let id;
		let code;
		let message;
		let description;

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
}

export class NotAuthorizedError extends ApiError {
	public defaultMessage = 'Authorization failed';
	public name = 'NotAuthorizedError';
}

// NotAuthenticated extends NotAuthorized for backwards compatibility
export class NotAuthenticatedError extends NotAuthorizedError {
	public defaultMessage = 'Authentication failed';
	public name = 'NotAuthenticatedError';
}

export class RateLimitExceededError extends ApiError {
	public defaultMessage = 'Rate Limit Exceeded';
	public name = 'RateLimitExceededError';
	public retryAfter;
	constructor(opts, res) {
		super(opts, res);
		this.retryAfter = res.headers && res.headers['retry-after'] && parseInt(res.headers['retry-after'], 10);
	}
}

export class SystemServiceUnavailableError extends ApiError {
	public defaultMessage = 'Service Unavailable';
	public name = 'SystemServiceUnavailableError';
}

export class SystemUnknownError extends ApiError {
	public defaultMessage = 'Unknown';
	public name = 'SystemUnknownError';
}

export class NetworkError extends Error {
	public name = 'NetworkError';
	public req;
	public err;
	constructor(req, err) {
		super();
		this.req = req;
		this.err = err;
	}
}

export class ArgumentError extends Error {
	public name = 'ArgumentError';
	public req;
	constructor(req, message) {
		super();
		this.message = message;
		this.req = req;
	}
}

export class TargetError extends ApiError {}

export class DNSLookupError extends NetworkError {
	public name = 'DNSLookupError';
	constructor(req, err) {
		super(req, err);
		this.message = 'DNS Lookup Error: ' + err.hostname;
	}
}

export class ConnectionAbortedError extends NetworkError {
	public name = 'ConnectionAbortedError';
	public message = 'Connection Aborted Error';
}

export class SocketTimeoutError extends NetworkError {
	public name = 'SocketTimeoutError';
	public message = 'Timeout Error';
}

export class ConnectionTimeoutError extends NetworkError {
	public name = 'ConnectionTimeoutError';
	public message = 'Connection Timeout Error';
}

export class ConnectionResetError extends NetworkError {
	public name = 'ConnectionResetError';
	public message = 'Connection Reset Error';
}

export class ConnectionRefusedError extends NetworkError {
	public name = 'ConnectionRefusedError';
	public message = 'Connection Refused Error';
}

// Build error from root response
// https://wiki.appnexus.com/display/adnexusdocumentation/API+Semantics#APISemantics-Errors
export const buildError = (req?, res?): ApiError => {
	let ErrorType: any = ApiError;

	if (res) {
		let statusCode;
		let errorId;
		let errorCode;

		if (res instanceof Error || res.errno) {
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
			} else if (statusCode === 405 || statusCode === 429) { // Legacy code 405
				ErrorType = RateLimitExceededError;
			} else if (errorId === 'SYSTEM' && errorCode === 'RATE_EXCEEDED') { // Legacy rate limit detection pre 1.17
				ErrorType = RateLimitExceededError;
			} else if (errorId === 'SYSTEM' && errorCode === 'UNKNOWN') {
				ErrorType = SystemUnknownError;
			}
		}
	}

	return new ErrorType(req, res);
};
