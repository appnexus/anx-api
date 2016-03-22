<img src="https://raw.githubusercontent.com/appnexus/anx-api/master/img/anx-api.png" alt="AppNexus Api Wrapper" width="300px">

[![npm version](https://badge.fury.io/js/anx-api.svg)](http://badge.fury.io/js/anx-api)
[![Build Status](https://travis-ci.org/appnexus/anx-api.svg?branch=master)](https://travis-ci.org/appnexus/anx-api)
[![Build Dependencies](https://david-dm.org/appnexus/anx-api.png)](https://david-dm.org/appnexus/anx-api)

## Installation

```bash
npm install anx-api
```

## Usage Example

```javascript
var Api = require('anx-api');

# Create a new instance with api target
var api = new Api({
	target: 'https://api.appnexus.com'
	token: 'SESSION_TOKEN' // (optional) see also api.login(...)
});

api.get(<serviceName>).then(function (res) {
	...
}).catch(function (err) {
	...
})
```

## Links

* [Upgrading from 2.x to 3.x](blob/master/docs/upgradin-2.x-to-3.x.md)
* [Change Log](blob/master/CHANGELOG.md)
* [Contributing](blob/master/CONTRIBUTING.md)

## Constructor

```javascript
var api = new Api(config);
```

#### Parameters

config[object]:
* .target - (string) base api url
* .token - (string) optional session token
* .request - (object) optional request object
* .userAgent - (string) optional user agent
	.rateLimit - (boolean) optional rate limiting

## Instance Methods

### #login

Authenticates with the API and returns a token to be used with future requests.

```javascript
api.login('username', 'password').then(function (token) {

	// The api object is now logged in. Optionally store the token.
	...

})
```

### #get

Issues a GET request

```javascript
api.get('service url')
api.get(opts) // see Request Options
```

#### Parameters

* service uri - (string|object)

#### Options

* mimeType: (string) optional override for the Accept header. Example: 'text/csv'

#### Result

Returns a promise that fulfills with the response from the api.


### #getAllJson

** Experimental Feature **

Usage and parameters are the same as #get accept it pages through api calls.
Response body is parsed as json.

### #post

Issues a POST request with a payload

```javascript
api.post('service url', 'payload')
api.post(opts, { /* payload obj */ })
api.post(opts) // see Request Options
```

#### Parameters

* service uri - (string|object)
* payload - (string|object)

#### Options

* mimeType: (string) optional override for the Accept and Content-Type headers. Example: 'text/csv'

#### Result

Returns a promise that fulfills with the response from the api.


### #put

Issues a PUT request with a payload

```javascript
api.put('service url', 'payload')
api.put(opts, { /* payload obj */ })
api.put(opts) // see Request Options
```

#### Parameters

* service uri - (string|object)
* payload - (string|object)

#### Options

* mimeType: (string) optional override for the Accept and Content-Type headers. Example: 'text/csv'

#### Result

Returns a promise that fulfills with the response from the api.

### #delete

Issues a DELETE request

```javascript
api.delete('service url')
api.delete(opts) // see Request Options
```

#### Parameters

* service uri - (string|object)

#### Options

* mimeType: (string) optional override for the Accept header. Example: 'text/csv'

#### Result

Returns a promise that fulfills with the response from the api.

### #switchUser

```javascript
api.switchUser(userId).then(...)
```

## Request Options

The get, post, put, and delete methods can be called with an opts object. The
opts object has the following request options.

* uri - (string) service uri
* startElement - (string) optional start index
* numElements - (integer) optional number of records to return
* params - (object) optional query string parameters

### Example

```javascript
// Fetch the third page of 25 creatives
api.get({
	uri: 'creative',
	startElement: 50,
	numElements: 25
})
```

## Custom Requests and Debugging

The following are two different methods of modifying and or spying on requests
made to the api.

### Wrap the interal request function

```javascript
api._config.request = _.wrap(api._config.request, function (request, opts) {
	console.log('DEBUG: ', opts);
	return request.call(api, opts);
});
```

### Pass in a custom request object

```javascript
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
```

## Tests

### Running unit tests

Run the unit test suite from the project root, make sure you've run `npm
install` first:

```bash
npm test
```

### Mocking

Coming soon

## Todos

* Document before and after request events
* Update docs with new method signatures
* Add mocking examples to README.md
* Add Service Wrapper

## License

See LICENSE file
