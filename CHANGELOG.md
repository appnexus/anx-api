# Change Log

## Latest

* Added error type RateLimitExceededError
* Removed gulp
* Added eslint
* Methods now allow the format .method(url[string], opts[object]);
* Added error types SystemServiceUnavailableError and SystemServiceUnavailableError
* Removed `request` and added `axios` adapter to make anx-api isomorphic

## v2.2.0

* Upgraded `qs` and `lodash`
* Allows null or undefined urls
* Allows unsetting 'User-Agent' with config.userAgent = null
* Added `beforeRequest` config function to filter request objects
* Added ability to set default headers in the config.
* Added change log
