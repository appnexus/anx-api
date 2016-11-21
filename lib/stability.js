/* eslint no-console: 0 */

var _ = require('lodash');

var warnings = {
	experimental: {},
	deprecated: {},
};

function experimentalMethod(methodName, className) {
	if (!warnings.experimental[methodName + className]) {
		warnings.experimental[methodName + className] = _.once(function warnOnce() {
			var log = (console.warn || console.log || _.noop).bind(console);
			log('Method ' + className + '.' + methodName + ' is experimental, use with caution.');
		});
	}
	warnings.experimental[methodName + className]();
}

function deprecatedMethod(methodName, className, useName) {
	if (!warnings.deprecated[methodName + className + useName]) {
		warnings.deprecated[methodName + className + useName] = _.once(function warnOnce() {
			var log = (console.warn || console.log || _.noop).bind(console);
			log('Method ' + className + '.' + methodName + ' is deprecated, use `' + className + '.' + useName + '` instead');
		});
	}
	warnings.deprecated[methodName + className + useName]();
}

module.exports = {
	deprecated: { method: deprecatedMethod },
	experimental: { method: experimentalMethod },
};
