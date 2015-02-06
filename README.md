<img src="https://raw.githubusercontent.com/adnexus/anx-api/master/img/anx-api.png" alt="AppNexus Api Wrapper" width="300px">

[![npm version](https://badge.fury.io/js/anx-api.svg)](http://badge.fury.io/js/anx-api)
[![Build Status](https://travis-ci.org/adnexus/anx-api.svg?branch=master)](https://travis-ci.org/adnexus/anx-api)
[![Build Dependencies](https://david-dm.org/adnexus/anx-api.png)](https://david-dm.org/adnexus/anx-api)

## Installation

	npm install anx-api

## Usage Example

	var Api = require('anx-api');

	# Create a new instance with api target
	var api = new Api({
		target: 'https://api.appnexus.com'
		token: 'SESSION_TOKEN' // (optional) see also api.login(...)
	});

	api.getJson(<serviceName>).then(function (res) {
		...
	}).catch(function (err) {
		...
	})

## Pull Request Rules

* Limit PRs to one feature or bug fix.
* Create a separate PR for code cleanup, refactoring, removing extraneous whitespace, etc.
* Run unit tests before submitting (See Running unit tests).
* Write unit tests for new features.
* Update README.md with new feature usage if applicable.

## Constructor

	var api = new Api(config);

#### Parameters

* config
	* target - (string) base api url
	* token - (string) optional session token
	* request - (object) optional request object
	* userAgent - (string) optional user agent

## Instance Methods

### #login

Authenticates with the API and returns a token to be used with future requests.

	api.login('username', 'password').then(function (token) {

		// The api object is now logged in. Optionally store the token.
		...

	})

### #get

Issues a GET request

	api.get('service url')
	api.get(opts) // see Request Options

#### Parameters

* service uri - (string|object)

#### Result

Returns a promise that fulfills with the response from the api.

### #getJson

Usage and parameters are the same as #get. Response body is parsed as json.

### #getAllJson

** Experimental Feature **

Usage and parameters are the same as #getJson accept it pages through api calls.
Response body is parsed as json.

### #post

Issues a POST request with a payload

	api.post('service url', 'payload')
	api.post(opts, { /* payload obj */ })
	api.post(opts) // see Request Options

#### Parameters

* service uri - (string|object)
* payload - (string|object)

#### Result

Returns a promise that fulfills with the response from the api.

### #postJson

Posts a json encoded object payload to the service url. Usage and parameters are
the same as #post. Response body is parsed as json.

### #put

Issues a PUT request with a payload

	api.put('service url', 'payload')
	api.put(opts, { /* payload obj */ })
	api.put(opts) // see Request Options

#### Parameters

* service uri - (string|object)
* payload - (string|object)

#### Result

Returns a promise that fulfills with the response from the api.

### #putJson

Puts a json encoded object payload to the service url. Usage and parameters are
the same as #put. Response body is parsed as json.

### #delete

Issues a DELETE request

	api.delete('service url')
	api.delete(opts) // see Request Options

#### Parameters

* service uri - (string|object)

#### Result

Returns a promise that fulfills with the response from the api.

### #deleteJson

Usage and parameters are the same as #delete. Response body is parsed as json.


### #switchUser

	api.switchUser(userId).then(...)

## Request Options

The get, post, put, and delete methods can be called with an opts object. The
opts object has the following request options.

* uri - (string) service uri
* startElement - (string) optional start index
* numElements - (integer) optional number of records to return
* params - (object) optional query string parameters

### Example

	// Fetch the third page of 25 creatives
	api.get({
		uri: 'creative',
		startElement: 50,
		numElements: 25
	})

## Custom Requests and Debugging

The following are two different methods of modifying and or spying on requests
made to the api.

### Wrap the interal request function

	api._config.request = _.wrap(api._config.request, function (request, opts) {
		console.log('DEBUG: ', opts);
		return request.call(api, opts);
	});

### Pass in a custom request object

	var request = require('request');

	function customRequest(opts) {
		return new Promise(function (resolve, reject) {

			// Customize the request

			request(opts, function (err, res) {
				if (err) {

					// Add additional error handling

					reject(err);
				} else {

					// Customize the response

					resolve(res);
				}
			});
		});
	}

	var api = new Api({
		target: process.env.ANX_TARGET,
		token: 'SESSION_TOKEN',
		request: customRequest
	});

## Tests

### Running unit tests

Install mocha globally:

	npm install mocha -g

Run the unit test suite from the project root:

	mocha

### Mocking

Coming soon

## Todo

* Handle api call limits
* Add mocking examples to readme
* Add Service Wrapper
