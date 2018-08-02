# Change Log

## Latest

## v7.0.0

* [major] Converted project to typescript

## v6.1.0

* [minor] Updated dependencies and converted from nsp to npm audit

## v6.0.0

[major] Adds in the package `url-join` to properly concat URL's when building the request. This breaking change requires partial url segments to be used when making requests instead of specifying fully-qualified paths. See: https://github.com/appnexus/anx-api/issues/70

## v5.0.4

* [patch] reverts changes made in v5.0.3 due to breaking change

## v5.0.3

* [patch] Adds in the package `url-join` to properly concat URL's when building the request

## v5.0.2

* [patch] Removes experimental `getBy` and `getById` methods.

## v5.0.1

* [minor] Adds `.npmignore` file to fix npm published version.

## v5.0.0

* [major] Removed use of `es6-promise` library; native promises are used now.
* [minor] Adds `lodash-babel-plugin` to optimize size for browser use case.

## v4.4.1

* Fixed rate limiting to abort if retry-after header is missing

## v4.4.0

* [minor] Added optional `environment` config option

## v4.3.0

* [minor] Added `encodeParams` option for params

## v4.2.0

* [minor] Added original request options to the response `res.req`
* Converted from Mocha to Jest
* Added eslint-config-appnexus
* Fixed missing content in request queue
* Added coveralls.io
* Upgraded nock

## v4.1.0

* Fixed rate limiting
* Updated Axios@0.15.0
* 'DNSLookupError' now inherits from 'NetworkError'
* [minor] Added `NetworkError`, with `ConnectionAbortedError`, `SocketTimeoutError`, `ConnectionTimeoutError`, `ConnectionRefusedError` sub classes.
* Fixed undefined err object

## v4.0.1

* Fixed bug in error response

## v4.0.0

* [minor] Added experimental `getBy` method
* [minor] Added request options in the response object `res.req`
* [minor] Added request options in the error object `err.req`
* [minor] Added request response in the error object `err.res`
* [major] Revamped internal error building, error api slightly changed
* Updated dependencies
* [minor] Added totalTime to response object
* [major] Removed deprecated methods `requestJson`, `getJson`, `getAllJson`, `postJson`, `putJson`, and `deleteJson`

## v3.3.1

* Fixed bug in `getAll` where it did not fail on first api error
* Fixed formatting for DNS Lookup Errors
* Fixed bug in axiosAdapter error handling
* Added pre-push lint and dependency checks

## v3.3.0

* [minor] Added default timeout to 60 seconds
* [minor] Added experimental `getById` method
* Added ability to flag methods as experimental
* Refactored `request` to eliminate unneeded function
* Refactored `getAll` and added unit tests for it

## v3.2.1

* Updated dependencies
* [minor] Added config unit test
* Fixed error handling for newer axios version

## v3.2.0

* [minor] Rate limiting on by default
* [minor] Added support for retry-after header [API v1.17]
* Added rate limit detection with status code 429 [API v1.17]

## v3.1.2

* Deprecated `getAllJson` in favor of `getAll`
* 'getAllJson' no longer designated as experimental.
* Fixed paging in `getAllJson`

## v3.1.1

* Temporary fix for FireFox not supporting `Error.captureStackTrace`
* Fixed various bugs with error handling.
* Added `DNSLookupError`

## v3.1.0

* [minor] Added `concurrencyLimit` option to the constructor
* Updated `qs`

## v3.0.0

* Added `rateLimiting` option to the constructor
* Added `mimeType` option to requests
* Setting `opts.headers.Accept` and `opts.headers['Contenty-Type']` overrides json defaults
* Fixed bug where `get` and `delete` set `Contenty-Type`
* Replaced `q` with `es6-promise`
* Added error type `RateLimitExceededError`
* Added `afterRequest` config function to transform response objects
* Replaced `gulp` with npm scripts
* Replaced `jshint` for `eslint`
* Methods now allow the format .method(url[string], opts[object]);
* Added error types `SystemServiceUnavailableError` and `SystemServiceUnavailableError`
* `getJson`, `postJson`, `putJson`, and `deleteJson` are deprecated
* Replaced `request` with `axios` adapter to make `anx-api` isomorphic

## v2.2.0

* Updated `qs` and `lodash`
* Allows null or undefined urls
* Allows unsetting 'User-Agent' with config.userAgent = null
* Added `beforeRequest` config function to transform request options
* Added ability to set default headers in the config.
* Added change log

## v2.x

* Methods return promises and callbacks are removed.
