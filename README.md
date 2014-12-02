# AppNexus Api Wrapper

## Installation

	npm install anx-api

## Usage

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

## Methods

### #get

Issues a GET request

	api.get('service url')
	api.get({ uri: 'service url' })

#### Parameters

* service uri - (string|object)

#### Result

Returns a promise that fulfills with the response from the api

### #getJson

Usage and parameters are the same as #get. Response body is parsed as json.

### #post

Issues a POST request with a payload

	api.post('service url', 'payload')
	api.post({ uri: 'service url' }, { /* payload obj */ })
	api.post({ uri: 'service url' , body: { /* payload obj */ } })

#### Parameters

* service uri - (string|object)
* payload - (string|object)

#### Result

Returns a promise that fulfills with the response from the api

### #postJson

Posts a json encoded object payload to the service url. Usage and parameters are
the same as #post. Response body is parsed as json.

### #put

Issues a PUT request with a payload

	api.put('service url', 'payload')
	api.put({ uri: 'service url' }, { /* payload obj */ })
	api.put({ uri: 'service url' , body: { /* payload obj */ } })

#### Parameters

* service uri - (string|object)
* payload - (string|object)

#### Result

Returns a promise that fulfills with the response from the api

### #putJson

Puts a json encoded object payload to the service url. Usage and parameters are
the same as #put. Response body is parsed as json.

## Tests

### Running unit tests

Install mocha globally:

	npm install mocha -g

Run this projects unit tests suite from project root:

	mocha

### Mocking

Comming soon

## Todo

* Add method help
* Add mocking examples to readme
* Add Service Wrapper
