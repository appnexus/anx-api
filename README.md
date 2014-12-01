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
