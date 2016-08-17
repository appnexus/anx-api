<img src="https://raw.githubusercontent.com/appnexus/anx-api/master/img/anx-api.png" alt="AppNexus Api Wrapper" width="300px">

[![npm version](https://badge.fury.io/js/anx-api.svg)](http://badge.fury.io/js/anx-api)
[![Build Status](https://travis-ci.org/appnexus/anx-api.svg?branch=master)](https://travis-ci.org/appnexus/anx-api)
[![Build Dependencies](https://david-dm.org/appnexus/anx-api.png)](https://david-dm.org/appnexus/anx-api)

## Installation

```bash
npm install anx-api --save
```

## Usage Example

```javascript
var AnxApi = require('anx-api');

// Create a new instance with api target
var anxApi = new AnxApi({
    target: 'https://api.appnexus.com'
    token: 'SESSION_TOKEN', // (optional) see also anxApi.login(...)
    rateLimiting: true
});

anxApi.get(<serviceName>).then(function (res) {
    ...
}).catch(function (err) {
    ...
})
```

## Links

* [Upgrading from 2.x to 3.x](docs/upgrading-2.x-to-3.x.md)
* [Changelog](CHANGELOG.md)
* [Contributing](CONTRIBUTING.md)

## Constructor

```javascript
var anxApi = new AnxApi(config);
```

#### Parameters

config[object]:
* `target` - (string) required base api url
* `token` - (string) optional session token
* `request` - (object) optional request object
* `timeout` - (integer) optional request timeout in milliseconds (default: 60000)
* `userAgent` - (string) optional user agent
* `rateLimiting` - (boolean) optional rate limiting
* `concurrencyLimit` - (integer) optional max concurrent requests
* `beforeRequest` - (function) optional before request opts filter (see [beforeRequest](#beforerequest))
* `afterRequest` - (function) optional after request response filter (see [afterRequest](#afterrequest))

## Instance Methods

### #get

Issues a GET request

```javascript
anxApi.get('service url')
anxApi.get('service url', opts)
anxApi.get(opts)
```

#### Parameters

* service uri - (string)
* opts - (object) see [Request Options](#request-options)

### #getById (Experimental)

Issues a GET request by id. Supports one id or an array of ids.

```javascript
anxApi.get(1, 'service url')
anxApi.get(2, 'service url', opts)
anxApi.get(3, opts)
anxApi.get([1,2,3], 'service url')
anxApi.get([1,2,3], 'service url', opts)
anxApi.get([1,2,3], opts)
```

#### Parameters

* id - (number OR array(number))
* service uri - (string)
* opts - (object) see [Request Options](#request-options)

### #getAll

Usage and parameters are the same as #get accept it pages through api calls.
Response body is parsed as json.

### #post

Issues a POST request with a payload

```javascript
anxApi.post('service url', <payload>)
anxApi.post('service url', <payload>, opts)
anxApi.post(opts)
```

#### Parameters

* service uri - (string)
* payload - (string|object)
* opts - (object) see [Request Options](#request-options)

### #put

Issues a PUT request with a payload

```javascript
anxApi.put('service url', <payload>)
anxApi.put('service url', <payload>, opts)
anxApi.put(opts)
```

#### Parameters

* service uri - (string)
* payload - (string|object)
* opts - (object) see [Request Options](#request-options)


### #delete

Issues a DELETE request

```javascript
anxApi.delete('service url')
anxApi.delete('service url', opts)
anxApi.delete(opts)
```

#### Parameters

* service uri - (string)
* opts - (object) see [Request Options](#request-options)


### #login

Authenticates with the API and returns a token. The token will be reused for future requests.

```javascript
anxApi.login('username', 'password').then(function (token) {

    // The api object is now logged in. Optionally store the token.
    ...

})
```

### #switchUser

```javascript
anxApi.switchUser(userId).then(...)
```

## Request Options

The get, post, put, and delete methods can be called with an opts object. The
opts object has the following request options.

* `uri` - (string) service uri
* `body` - (object) required payload for `.post` and `.put`
* `headers` - (object) optional request header overrides
* `startElement` - (string) optional start index
* `numElements` - (integer) optional number of records to return
* `params` - (object) optional query string parameters
* `mimeType` - (string) optional mimetype
* `timeout` - (integer) optional request timeout in milliseconds (defaults to config timeout)

### Examples

```javascript
// Fetch the third page of 25 creatives
anxApi.get({
    uri: 'creative',
    startElement: 50,
    numElements: 25
})

anxApi.get('creative', {
    params: {
        start_element: 50,
        num_elements: 25
    }
})

anxApi.get('creative?start_element=50&num_elements=25')
```

# Transforming Request Options and Responses

## beforeRequest

Request options can be modified prior to request execution by supplying a
`beforeRequest` transform function in the constructor. The function should
either return a new options object or `null` which will be ignored.

```javascript
var anxApi = new AnxApi({
    ...,
    beforeRequest: function (opts) {
        var modifiedOpts = _.assign({}, opts, {
            // make changes to options
        })
        return modifiedOpts;
    }
});
```

## afterRequest

Request responses can be modified prior to being delivered by supplying a
`afterRequest` transform function in the constructor. The function should return
either a new response object or `null` which will be ignored.

```javascript
var anxApi = new AnxApi({
    ...,
    afterRequest: function (res) {
        var modifiedRes = _.assign({}, res, {
            // make changes to response
        })
        return modifiedRes;
    }
});
```

# Error Handling

```javascript
anxApi.get('creative').then(function (res) {
    ...
}).catch(function (err) {
    if (err instanceof NotAuthenticatedError) {
        console.log('Your not logged in!');
    }
})
```

## Error Types

* `Error` - generic error type
* `ApiError` - base api error type
    * `DNSLookupError` - target host could not be looked up
    * `NotAuthenticatedError` - token is invalid or expired
    * `NotAuthorizedError` - Unauthorized to make request
    * `RateLimitExceededError`
    * `SystemServiceUnavailableError`
    * `SystemUnknownError`
    * `TargetError` - target was not supplied

# Custom Request and Debugging

The following are two different methods of modifying and or spying on requests
made to the api.

### Wrap the internal request function

```javascript
anxApi._config.request = _.wrap(anxApi._config.request, function (request, opts) {
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

var anxApi = new AnxApi({
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

## License

See [LICENSE](LICENSE) file
