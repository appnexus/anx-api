import * as _ from 'lodash';

import { IResponse } from './types';

// Api Errors

export class ApiError extends Error {
	public name = 'ApiError';
	public isAnxApi = true;
	public isApiError = true;
	public id;
	public statusCode: number;
	public code;
	public description;
	public response;
	public req;
	public res;

	constructor(req: any, res: IResponse, customMessage?: string) {
		super();

		// Error.captureStackTrace not supported in Firefox
		// tslint:disable-next-line
		Error.captureStackTrace && Error.captureStackTrace(this, this.constructor);

		let response;
		let id;
		let code;
		let message;
		let description;

		if (_.isObject(res)) {
			this.statusCode = res.statusCode;

			// Traverse through general API JSON Response
			if (res.body && res.body.response) {
				response = res.body.response; // res is raw api response
			} else if ((res as any).response) {
				response = (res as any).response; // res is body
			} else {
				response = res;
			}

			// Extract values from object - duck type check
			if (response.hasOwnProperty('error_id')) {
				// Api Response
				id = response.error_id;
				code = response.error_code;
				message = response.error;
				description = response.error_description;
			} else if (response.hasOwnProperty('id')) {
				// Simple Object
				id = response.id;
				code = response.code;
				message = response.message;
				description = response.description;
			}
		}

		this.id = id;
		this.code = code;
		this.message = message || customMessage;
		this.description = description || null;
		this.req = req;
		this.res = res;
	}
}

export class NotAuthorizedError extends ApiError {
	public name = 'NotAuthorizedError';
	constructor(req, res) {
		super(req, res, 'Authorization failed');
	}
}

// NotAuthenticated extends NotAuthorized for backwards compatibility
export class NotAuthenticatedError extends ApiError {
	public name = 'NotAuthenticatedError';
	constructor(req, res) {
		super(req, res, 'Authentication failed');
	}
}

export class RateLimitExceededError extends ApiError {
	public name = 'RateLimitExceededError';
	public retryAfter;
	constructor(req, res) {
		super(req, res, 'Rate Limit Exceeded');
		this.retryAfter = res.headers && res.headers['retry-after'] && parseInt(res.headers['retry-after'], 10);
	}
}

export class SystemServiceUnavailableError extends ApiError {
	public name = 'SystemServiceUnavailableError';
	constructor(req, res) {
		super(req, res, 'Service Unavailable');
	}
}

export class SystemUnknownError extends ApiError {
	public name = 'SystemUnknownError';
	constructor(req, res) {
		super(req, res, 'Unknown');
	}
}

export class TargetError extends ApiError {}

// Network Errors

export class NetworkError extends Error {
	public name = 'NetworkError';
	public isAnxApi = true;
	public isNetworkError = true;
	public code;
	public err;
	public req;
	constructor(err, req) {
		super();
		this.err = err;
		this.req = req;
	}
}

export class DNSLookupError extends NetworkError {
	public name = 'DNSLookupError';
	constructor(err, req) {
		super(err, req);
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

// Argument Errors

export class ArgumentError extends Error {
	public name = 'ArgumentError';
	public isAnxApi = true;
	public isArgumentError = true;
	public req;
	constructor(req, message) {
		super();
		this.message = message;
		this.req = req;
	}
}

export function buildRequestError(err: Error, req) {
	let error: Error = err;

	if ((err as any).code) {
		const networkError: any = err;
		if (networkError.code === 'ENOTFOUND') {
			error = new DNSLookupError(err, req);
		} else if (networkError.code === 'ECONNABORTED') {
			error = new ConnectionAbortedError(err, req);
		} else if (networkError.code === 'ECONNREFUSED') {
			error = new ConnectionRefusedError(err, req);
		} else if (networkError.code === 'ECONNRESET') {
			error = new ConnectionResetError(err, req);
		} else if (networkError.code === 'ETIMEDOUT') {
			error = new ConnectionTimeoutError(err, req);
		} else if (networkError.code === 'ESOCKETTIMEDOUT') {
			error = new SocketTimeoutError(err, req);
		}
	}

	return error;
}

// Build error from root response
// https://wiki.appnexus.com/display/adnexusdocumentation/API+Semantics#APISemantics-Errors
export const buildError = (err: Error, req, res): ApiError | NetworkError => {
	let error: ApiError | NetworkError;

	let statusCode;
	let errorId;
	let errorCode;

	if (res) {
		statusCode = res.statusCode;

		if (res.body && res.body.response) {
			errorId = res.body.response.error_id;
			errorCode = res.body.response.error_code;
		}
	}

	if (statusCode || errorId) {
		// Differentiating Authentication vs Authorization [http://stackoverflow.com/a/6937030/2483105]
		if (statusCode === 401 || errorId === 'NOAUTH') {
			error = new NotAuthenticatedError(req, res);
		} else if (statusCode === 403 || errorId === 'UNAUTH') {
			error = new NotAuthorizedError(req, res);
		} else if (errorId === 'SYSTEM' && errorCode === 'SERVICE_UNAVAILABLE') {
			error = new SystemServiceUnavailableError(req, res);
		} else if (statusCode === 405 || statusCode === 429) {
			// Legacy code 405
			error = new RateLimitExceededError(req, res);
		} else if (errorId === 'SYSTEM' && errorCode === 'RATE_EXCEEDED') {
			// Legacy rate limit detection pre 1.17
			error = new RateLimitExceededError(req, res);
		} else if (errorId === 'SYSTEM' && errorCode === 'UNKNOWN') {
			error = new SystemUnknownError(req, res);
		}
	}

	if (error) {
		return error;
	}

	return new ApiError(req, res, 'Unknown Api Error');
};
